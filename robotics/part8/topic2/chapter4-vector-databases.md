# Part 8, Topic 2: Metadata & Advanced Retrieval
## Chapter 1: Vector Databases

**Prerequisite Knowledge:** Basic Python dictionaries, lists, and an understanding of embeddings.

### The 'Filing Cabinet' Analogy
Imagine a massive filing cabinet where documents aren't sorted alphabetically, but by their *meaning*. If you put a document about "pump maintenance" in the cabinet, it automatically gets placed near other documents about "motor repairs" and "valves," but far away from documents about "vacation policies." A vector database is like this magical filing cabinet. It uses numbers (vectors) to represent the meaning of text, allowing you to instantly find information that is conceptually similar to what you're looking for, even if the exact words don't match.

A vector database stores embedding vectors alongside their source text and metadata, and provides fast similarity search. For learning and prototyping, an in-memory store is sufficient. For production, you need a persistent database with indexing — PostgreSQL with pgvector is a common choice, and Pinecone is a managed option.

```
   Vector Database Architecture:

   ┌─────────────────────────────────────────────────┐
   │                Vector Database                   │
   │                                                  │
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
   │  │ Text     │  │ Vector   │  │ Metadata │      │
   │  │ "Pump    │  │ [0.9,    │  │ {source: │      │
   │  │  seal    │  │  0.1,    │  │  "P101", │      │
   │  │  replace"│  │  0.0]}   │  │  page:12}│      │
   │  └──────────┘  └──────────┘  └──────────┘      │
   │                                                  │
   │  Query: [0.88, 0.12, 0.0]                       │
   │          ↓                                       │
   │  Similarity Search → Ranked Results              │
   └─────────────────────────────────────────────────┘
```

### 1. In-Memory Vector Store

An in-memory store is just a list of dictionaries with numpy-based similarity search. This is enough to build and test a complete RAG pipeline locally:

```python
import numpy as np

class InMemoryVectorStore:
    def __init__(self):
        # We store the vectors, texts, and metadata in parallel lists
        self.vectors = []
        self.texts = []
        self.metadata = []

    def insert(self, text, vector, meta=None):
        # Add the new item to all three lists so they line up
        self.texts.append(text)
        
        # Convert vector to a numpy array for math operations
        vector_array = np.array(vector, dtype=np.float32)
        self.vectors.append(vector_array)
        
        self.metadata.append(meta or {})

    def search(self, query_vector, top_k=5):
        # Return empty list if there is nothing to search
        if not self.vectors:
            return []
            
        # 1. Convert query to numpy array
        query = np.array(query_vector, dtype=np.float32)
        
        # 2. Stack all stored vectors into a single matrix
        matrix = np.vstack(self.vectors)
        
        # 3. Calculate sizes (norms) to prepare for cosine similarity
        norms = np.linalg.norm(matrix, axis=1)
        query_norm = np.linalg.norm(query)
        
        # 4. Calculate similarity: dot product divided by product of norms
        dot_products = np.dot(matrix, query)
        combined_norms = norms * query_norm + 1e-8 # Add 1e-8 to prevent division by zero
        similarities = dot_products / combined_norms
        
        # 5. Sort the results. argsort gives lowest to highest, so reverse it [::-1]
        sorted_indices = np.argsort(similarities)[::-1]
        
        # 6. Keep only the top 'k' results
        top_indices = sorted_indices[:top_k]
        
        # 7. Build the final results list
        results = []
        for idx in top_indices:
            results.append({
                "text": self.texts[idx],
                "score": float(similarities[idx]),
                "metadata": self.metadata[idx]
            })
        return results

# Let's test it!
store = InMemoryVectorStore()
store.insert("Pump seal replacement requires 50 Nm torque", [0.9, 0.1, 0.0], {"machine_id": "P101"})
store.insert("Compressor vibration threshold is 5 mm/s", [0.1, 0.9, 0.0], {"machine_id": "C201"})
store.insert("Pump alignment tolerance is 0.05 mm", [0.85, 0.15, 0.0], {"machine_id": "P101"})

# Search for something similar to the pump vectors
results = store.search([0.88, 0.12, 0.0], top_k=2)
for r in results:
    print(f"{r['score']:.4f} | {r['text']} | {r['metadata']}")
```

**What's happening:**
```python
# store.insert("Pump seal...", [0.9, 0.1, 0.0], {"machine_id": "P101"})
#               ^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^
#               |              |                   └── Metadata dict (filterable)
#               |              └── 3D embedding vector (pump-related = dim 0)
#               └── Source text (stored for retrieval)
#
# Three parallel lists keep everything aligned:
# texts[0]     ↔ vectors[0]     ↔ metadata[0]
# texts[1]     ↔ vectors[1]     ↔ metadata[1]
# texts[2]     ↔ vectors[2]     ↔ metadata[2]
#
# search([0.88, 0.12, 0.0]):
#   query points strongly toward dimension 0 (pump-related)
#   doc0: [0.9, 0.1, 0.0] → score ≈ 0.99 (very close direction)
#   doc1: [0.1, 0.9, 0.0] → score ≈ 0.19 (different direction)
#   doc2: [0.85, 0.15, 0.0] → score ≈ 0.99 (very close direction)
#
# top_k=2 returns doc0 and doc2 (both pump-related)
```

This gives you full control over the search logic. The downside is that it loads everything into memory and must scan every vector on each query — fine for tens of thousands of chunks, but not for millions.

### Performance Limits of In-Memory Stores

| Documents | Search Time (512-dim) | Memory Usage | Verdict |
|-----------|----------------------|--------------|---------|
| 1,000 | <1ms | ~2MB | Fast |
| 10,000 | ~5ms | ~20MB | Fast |
| 100,000 | ~50ms | ~200MB | Acceptable |
| 1,000,000 | ~500ms | ~2GB | Slow (need ANN index) |

### 2. pgvector: PostgreSQL with Vector Search

pgvector adds vector storage and similarity search to PostgreSQL. You get SQL queries, ACID transactions, and metadata filtering alongside vector search:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    source_file VARCHAR(255),
    machine_id VARCHAR(50),
    section_type VARCHAR(50),
    chunk_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**What's happening:**
```sql
-- CREATE EXTENSION vector;
-- Loads the pgvector extension into PostgreSQL
-- Adds vector data type and similarity operators

-- CREATE TABLE document_chunks (
--   id SERIAL PRIMARY KEY,        ← Auto-incrementing ID
--   text TEXT NOT NULL,           ← The original chunk text
--   embedding vector(1536),       ← 1536-dimensional vector (OpenAI ada-002)
--   source_file VARCHAR(255),     ← Which file this came from
--   machine_id VARCHAR(50),       ← Filterable: "P101", "C201"
--   section_type VARCHAR(50),     ← Filterable: "maintenance", "specs"
--   chunk_index INTEGER,          ← Position in the source document
--   created_at TIMESTAMP          ← When it was inserted
-- );

-- CREATE INDEX ... USING ivfflat
-- ivfflat = Inverted File with Flat storage
-- Accelerates approximate nearest neighbor search
-- lists = 100 → split vectors into 100 clusters
-- For <100k rows, skip the index (sequential scan is fast enough)
```

The `ivfflat` index accelerates cosine similarity search. For datasets under 100k rows, a simple sequential scan is fast enough — add the index when you need performance at scale.

### 3. Inserting and Querying pgvector

Use Python with `psycopg2` or `asyncpg` to interact with pgvector:

```python
import psycopg2
import numpy as np

# Connect to the database
conn = psycopg2.connect("postgresql://user:password@localhost:5432/rag_db")
cur = conn.cursor()

# Prepare some sample data
chunks = [
    ("Pump P101 requires quarterly seal replacement", np.random.rand(1536).tolist(), "P101", "maintenance"),
    ("Compressor C201 vibration analysis shows normal", np.random.rand(1536).tolist(), "C201", "diagnostics"),
    ("Pump P101 motor alignment procedure", np.random.rand(1536).tolist(), "P101", "procedure"),
]

# Insert each chunk into the database
for text, embedding, machine_id, section_type in chunks:
    # Convert embedding list to string format for postgres
    embedding_str = str(embedding)
    
    cur.execute(
        "INSERT INTO document_chunks (text, embedding, machine_id, section_type) VALUES (%s, %s, %s, %s)",
        (text, embedding_str, machine_id, section_type)
    )
conn.commit()

# Create a random query vector to search with
query_embedding = np.random.rand(1536).tolist()
query_embedding_str = str(query_embedding)

# Perform the search query
cur.execute("""
    SELECT text, 1 - (embedding <=> %s::vector) AS similarity
    FROM document_chunks
    WHERE machine_id = 'P101'
    ORDER BY embedding <=> %s::vector
    LIMIT 3
""", (query_embedding_str, query_embedding_str))

# Print the results
for row in cur.fetchall():
    similarity_score = row[1]
    text_result = row[0]
    print(f"{similarity_score:.4f} | {text_result}")
```

**What's happening:**
```python
# embedding_str = str(embedding)
# Converts [0.1, 0.2, 0.3] to "[0.1, 0.2, 0.3]" (string for PostgreSQL)
#
# INSERT INTO document_chunks ... VALUES (%s, %s, %s, %s)
#   %s placeholders prevent SQL injection
#   Each %s maps to the tuple values in order
#
# SELECT text, 1 - (embedding <=> %s::vector) AS similarity
#   <=>  = cosine distance operator (lower = more similar)
#   1 - distance = similarity (higher = more similar)
#   %s::vector = cast the string to vector type
#
# WHERE machine_id = 'P101'
#   Pre-filter: only search P101 chunks
#   This is faster than searching ALL chunks then filtering
#
# ORDER BY embedding <=> %s::vector
#   Sort by cosine distance (lowest distance first = most similar)
#
# LIMIT 3
#   Return only top 3 results
```

The `<=>` operator computes cosine distance (lower is more similar). The `1 - distance` conversion gives you similarity scores. Filtering by `machine_id` before the vector search means you only search relevant documents.

### Common Mistake: Converting Embedding to String Incorrectly

```python
import numpy as np

embedding = np.random.rand(1536)

# WRONG: str() on numpy array produces "array([...])"
embedding_str = str(embedding)
# Result: "array([ 0.123,  0.456,  ...])" — PostgreSQL can't parse this!

# RIGHT: Convert to list first, then to string
embedding_list = embedding.tolist()  # [0.123, 0.456, ...]
embedding_str = str(embedding_list)  # "[0.123, 0.456, ...]" — PostgreSQL parses this

# ALTERNATIVE: Use pgvector's Python adapter
from pgvector.psycopg2 import register_vector
register_vector(conn)

# Now you can pass numpy arrays directly
cur.execute(
    "INSERT INTO document_chunks (embedding) VALUES (%s)",
    (embedding,)  # numpy array, not string
)
```

### 4. Pinecone as a Hosted Option

Pinecone is a fully managed vector database. It handles indexing, scaling, and replication. Here is the basic interface:

```python
from pinecone import Pinecone

# Initialize connection
pc = Pinecone(api_key="YOUR_API_KEY")
index = pc.Index("equipment-manuals")

# Prepare vectors to insert
vectors = [
    {"id": "chunk_1", "values": [0.9, 0.1, 0.0], "metadata": {"machine_id": "P101", "text": "Pump seal procedure"}},
    {"id": "chunk_2", "values": [0.1, 0.9, 0.0], "metadata": {"machine_id": "C201", "text": "Compressor vibration"}},
]

# Upsert (insert or update) the vectors
index.upsert(vectors=vectors)

# Perform the search
results = index.query(
    vector=[0.88, 0.12, 0.0],
    top_k=2,
    filter={"machine_id": {"$eq": "P101"}},
    include_metadata=True
)

# Print the matching documents
for match in results["matches"]:
    score = match['score']
    text = match['metadata']['text']
    print(f"{score:.4f} | {text}")
```

**What's happening:**
```python
# pc = Pinecone(api_key="YOUR_API_KEY")
# Connects to Pinecone cloud service
# Your data lives on their servers, not your machine
#
# index = pc.Index("equipment-manuals")
# References a specific "index" (like a table in SQL)
# Each index has a fixed dimension (e.g., 1536 for ada-002)
#
# index.upsert(vectors=vectors)
# "Upsert" = Update + Insert
# If ID exists → update the vector
# If ID doesn't exist → insert new vector
#
# index.query(
#   vector=[0.88, 0.12, 0.0],     ← Query vector
#   top_k=2,                        ← Return 2 best matches
#   filter={"machine_id": {"$eq": "P101"}},  ← Metadata filter
#   include_metadata=True           ← Return metadata with results
# )
# Pinecone handles indexing, scaling, and filtering automatically
```

Pinecone handles the embedding dimensionality and indexing automatically. The tradeoff is vendor lock-in and per-query pricing. For prototyping, the free tier is generous enough for most learning projects.

### Pinecone Filter Syntax Reference

```python
# Exact match
filter={"machine_id": {"$eq": "P101"}}

# Not equal
filter={"machine_id": {"$ne": "C201"}}

# In list
filter={"machine_id": {"$in": ["P101", "P102", "P103"]}}

# Not in list
filter={"machine_id": {"$nin": ["C201", "C202"]}}

# Range (for numeric metadata)
filter={"page": {"$gte": 10, "$lte": 20}}

# Combined (AND logic)
filter={
    "machine_id": {"$eq": "P101"},
    "section_type": {"$eq": "maintenance"}
}
```

### 5. Choosing a Vector Store

For learning and local development, use the in-memory store. For production with existing PostgreSQL infrastructure, use pgvector. For fully managed infrastructure without ops overhead, use Pinecone. All three support the same fundamental operations: insert, search, filter.

The critical insight is that the vector store is interchangeable. Build your chunking, embedding, and retrieval logic around a simple interface so you can swap stores without rewriting your pipeline:

```python
class VectorStore:
    def insert(self, text, vector, metadata): ...
    def search(self, query_vector, top_k, filters=None): ...

store = InMemoryVectorStore()  # or PgvectorStore() or PineconeStore()
```

**What's happening:**
```python
# This is the Adapter Pattern:
# All three stores implement the same interface (insert, search)
# Your application code calls store.search() regardless of backend
# To switch from in-memory to pgvector:
#   1. Change: store = InMemoryVectorStore()
#   2. To:     store = PgvectorStore(connection_string)
#   3. Everything else stays the same
#
# Benefits:
# - Start with in-memory for rapid prototyping
# - Migrate to pgvector when you need persistence
# - Migrate to Pinecone when you need managed scaling
# - No rewrite of your retrieval pipeline
```

This abstraction lets you start simple and scale to production infrastructure when needed.

### Vector Store Comparison

| Feature | In-Memory | pgvector | Pinecone |
|---------|-----------|----------|----------|
| Setup | None | PostgreSQL + extension | API key |
| Persistence | None (lost on restart) | Yes (ACID) | Yes (managed) |
| Scalability | ~100K docs | ~1M docs | ~100M docs |
| Metadata filtering | Manual | SQL WHERE | Built-in |
| Cost | Free | Free (self-hosted) | Paid (free tier) |
| Best for | Prototyping | Production (existing PG) | Production (no ops) |

### 6. Error Handling for Vector Stores

```python
import numpy as np

class InMemoryVectorStore:
    def __init__(self):
        self.vectors = []
        self.texts = []
        self.metadata = []
    
    def insert(self, text, vector, meta=None):
        # Validate inputs
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        vec = np.array(vector, dtype=np.float32)
        if vec.ndim != 1:
            raise ValueError(f"Vector must be 1D, got {vec.ndim}D")
        
        if np.any(np.isnan(vec)):
            raise ValueError("Vector contains NaN values")
        
        self.texts.append(text.strip())
        self.vectors.append(vec)
        self.metadata.append(meta or {})

# Common errors and fixes:
# ValueError: Text cannot be empty
#   → Check that chunks aren't blank before inserting
#
# ValueError: Vector contains NaN values
#   → Check embedding model output; retry failed API calls
#
# Shape mismatch: Vector dimension 768 doesn't match index dimension 1536
#   → Ensure all vectors use the same embedding model
#   → Don't mix ada-002 (1536-dim) with text-embedding-3-small (1536-dim)
#     — actually they match, but older models had different dims
```

### Quick Reference

| Operation | In-Memory | pgvector | Pinecone |
|-----------|-----------|----------|----------|
| Insert | `store.insert(text, vec, meta)` | `INSERT INTO ... VALUES (...)` | `index.upsert(vectors=[...])` |
| Search | `store.search(query, top_k)` | `SELECT ... ORDER BY embedding <=> ...` | `index.query(vector=..., top_k=...)` |
| Filter | Manual Python loop | `WHERE machine_id = 'P101'` | `filter={"machine_id": {"$eq": "P101"}}` |
| Delete | `del store.vectors[i]` | `DELETE FROM ... WHERE id = ...` | `index.delete(ids=[...])` |
| Count | `len(store.vectors)` | `SELECT COUNT(*) FROM ...` | `index.describe_index_stats()` |

### Summary

Vector databases store embeddings and enable fast similarity search. An in-memory store is perfect for learning and prototyping, pgvector adds persistence and SQL integration, and Pinecone provides managed scalability. Start with the in-memory approach, then migrate to pgvector or Pinecone when you need scale or persistence. The storage layer is interchangeable — keep your retrieval logic decoupled.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Vector Databases**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter4 vector databases**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

