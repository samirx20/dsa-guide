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
#   doc1: [0.1, 0.9, 0.0] → score ≈ 0.24 (different direction)
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
#   Filter: only P101 chunks can be returned
#   With no vector index this is an exact scan of P101 rows. With the ivfflat index,
#   pgvector applies the filter AFTER the approximate index scan, so you may get < 3 rows
#   (pgvector 0.8+ can fix this with iterative index scans)
#
# ORDER BY embedding <=> %s::vector
#   Sort by cosine distance (lowest distance first = most similar)
#
# LIMIT 3
#   Return only top 3 results
```

The `<=>` operator computes cosine distance (lower is more similar). The `1 - distance` conversion gives you similarity scores. Filtering by `machine_id` means only relevant documents come back. With an approximate index such as `ivfflat`, though, pgvector applies the filter after the index scan, so a selective filter can return fewer rows than `LIMIT`.

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
#     — the dims match, so no error is raised, but the two models' vector
#       spaces are different and similarity scores between them are meaningless
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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Search the in-memory store.** Using the chapter's `InMemoryVectorStore` with the same three inserts (P101 seal `[0.9, 0.1, 0.0]`, C201 compressor `[0.1, 0.9, 0.0]`, P101 alignment `[0.85, 0.15, 0.0]`), what does this print? Give scores to 4 decimals.

```python
results = store.search([0.1, 0.9, 0.0], top_k=2)
for r in results:
    print(f"{r['score']:.4f} | {r['text']}")
```

**Q2. pgvector distance → similarity.** Four rows have these cosine distances (`embedding <=> query`) for some query:

| id | machine_id | distance |
|----|-----------|----------|
| 1 | P101 | 0.30 |
| 2 | C201 | 0.05 |
| 3 | P101 | 0.10 |
| 4 | P101 | 0.45 |

What rows, in what order, and with what `similarity` values does the chapter's query (`WHERE machine_id = 'P101' ... ORDER BY embedding <=> ... LIMIT 2`) return?

**Q3. Pinecone filter.** Which of these vectors match the filter below?

```python
filter = {
    "machine_id": {"$in": ["P101", "P102"]},
    "page": {"$gte": 10, "$lte": 20},
}
# v1: {"machine_id": "P101", "page": 12}
# v2: {"machine_id": "P102", "page": 25}
# v3: {"machine_id": "C201", "page": 15}
# v4: {"machine_id": "P102", "page": 10}
# v5: {"machine_id": "P101", "page": 20}
# v6: {"machine_id": "P103", "page": 11}
```

**Q4. What does `str()` really produce?** Predict the three printed lines:

```python
import numpy as np
emb = np.array([0.5, 0.25])
print(str(emb))
print(repr(emb))
print(str(emb.tolist()))
```

Which one can pgvector parse as a `vector` literal, and why does the first one fail?

**Q5. Validation in the Section 6 store.** For each call on a fresh validated `InMemoryVectorStore` (Section 6 version), state whether it raises (and the message) or succeeds. If it succeeds, what is stored in `texts`?

```python
store.insert("   ", [1, 2])
store.insert("ok", [[1, 2], [3, 4]])
store.insert("ok", [1, float("nan")])
store.insert(" Pump ", [1, 0])
```

### Coding Exercises

**E1 (Easy).** Pinecone's `upsert` replaces a record whose id already exists. Add that behaviour to the in-memory store: write `UpsertStore(InMemoryVectorStore)` with an `ids` list and a method `upsert(doc_id, text, vector, meta=None)` that overwrites in place if `doc_id` is known, otherwise appends. Keep all four parallel lists aligned.

- `upsert("c1","old",[1,0])`, `upsert("c2","b",[0,1])`, `upsert("c1","new",[1,0])` → `texts == ["new", "b"]`, `ids == ["c1", "c2"]`

**E2 (Easy–Medium).** The chapter's comparison table says in-memory filtering is "Manual". Write `search_with_filter(store, query_vector, top_k=5, filters=None)` that pre-filters by exact metadata match (AND across keys), then ranks only the survivors by cosine similarity (scores rounded to 4 decimals). Return `[]` if nothing matches.

- On the chapter's store: `search_with_filter(store, [0.1, 0.9, 0.0], top_k=2, filters={"machine_id": "P101"})` → alignment (0.2815), then seal (0.2195)
- `filters={"machine_id": "X"}` → `[]`

**E3 (Medium).** The in-memory store loses everything on restart. Write `save(store, path)` and `load(path) -> InMemoryVectorStore` that round-trip texts, vectors and metadata through a JSON file. Searching the loaded store must return the same texts in the same order as the original.

#### Dry-Run: Answers

**Q1.** Here $\|q\| = \sqrt{0.01 + 0.81} = \sqrt{0.82} \approx 0.9055$.

| doc | dot | $\|d\|$ | score |
|-----|-----|---------|-------|
| seal `[0.9, 0.1, 0]` | $0.09 + 0.09 = 0.18$ | 0.9055 | $0.18 / 0.82 = 0.2195$ |
| compressor `[0.1, 0.9, 0]` | $0.01 + 0.81 = 0.82$ | 0.9055 | $0.82 / 0.82 \approx 1.0000$ |
| alignment `[0.85, 0.15, 0]` | $0.085 + 0.135 = 0.22$ | 0.8631 | $0.22 / 0.7816 \approx 0.2815$ |

Output:

```
1.0000 | Compressor vibration threshold is 5 mm/s
0.2815 | Pump alignment tolerance is 0.05 mm
```

The `+ 1e-8` in the denominator makes the top score a hair under 1, but it still rounds to `1.0000`.

**Q2.** The `WHERE` clause removes row 2 first, even though it has the smallest distance. The remaining rows sort ascending by distance: 3 (0.10), 1 (0.30), 4 (0.45). `LIMIT 2` keeps **row 3 with similarity $1 - 0.10 = 0.90$**, then **row 1 with similarity $1 - 0.30 = 0.70$**.

**Q3.** **v1, v4, v5.**

- v2 fails because page 25 > 20.
- v3 fails because C201 is not in the list.
- v6 fails because P103 is not in the list.

Pinecone ANDs the top-level keys together, and `$gte`/`$lte` are inclusive, so pages 10 and 20 both pass.

**Q4.**

```
[0.5  0.25]
array([0.5 , 0.25])
[0.5, 0.25]
```

`str()` on a NumPy array prints **space-separated values with no commas**, while `repr()` is the form with `array(...)`. pgvector's text format is `[x, y, ...]` with commas, so only the third line (`str(emb.tolist())`) parses. The first line fails because of the missing commas. Registering the adapter with `register_vector(conn)` avoids string conversion altogether.

**Q5.**

| call | result |
|------|--------|
| `insert("   ", [1, 2])` | `ValueError: Text cannot be empty` (`"   ".strip()` is `""`) |
| `insert("ok", [[1, 2], [3, 4]])` | `ValueError: Vector must be 1D, got 2D` |
| `insert("ok", [1, nan])` | `ValueError: Vector contains NaN values` |
| `insert(" Pump ", [1, 0])` | succeeds; `texts == ["Pump"]` (text is stripped before storing) |

Only the last call stores anything, because each check raises before the `append` lines run.

**E1 — reference solution**

```python
import numpy as np

class UpsertStore(InMemoryVectorStore):
    def __init__(self):
        super().__init__()
        self.ids = []

    def upsert(self, doc_id, text, vector, meta=None):
        vec = np.array(vector, dtype=np.float32)
        if doc_id in self.ids:                       # update in place
            i = self.ids.index(doc_id)
            self.texts[i], self.vectors[i], self.metadata[i] = text, vec, meta or {}
        else:                                        # insert new
            self.ids.append(doc_id)
            self.texts.append(text)
            self.vectors.append(vec)
            self.metadata.append(meta or {})

u = UpsertStore()
u.upsert("c1", "old", [1, 0]); u.upsert("c2", "b", [0, 1]); u.upsert("c1", "new", [1, 0])
print(u.texts, u.ids)   # ['new', 'b'] ['c1', 'c2']
```

`ids.index` is $O(n)$. A `dict` mapping id to position would make lookups $O(1)$.

**E2 — reference solution**

```python
def search_with_filter(store, query_vector, top_k=5, filters=None):
    filters = filters or {}
    keep = [i for i, m in enumerate(store.metadata)
            if all(m.get(k) == v for k, v in filters.items())]
    if not keep:
        return []
    q = np.asarray(query_vector, dtype=np.float32)
    M = np.vstack([store.vectors[i] for i in keep])
    sims = M @ q / (np.linalg.norm(M, axis=1) * np.linalg.norm(q) + 1e-8)
    order = np.argsort(-sims, kind="stable")[:top_k]
    return [{"text": store.texts[keep[j]],
             "score": round(float(sims[j]), 4),
             "metadata": store.metadata[keep[j]]} for j in order]

for r in search_with_filter(store, [0.1, 0.9, 0.0], top_k=2, filters={"machine_id": "P101"}):
    print(r["score"], r["text"])
# 0.2815 Pump alignment tolerance is 0.05 mm
# 0.2195 Pump seal replacement requires 50 Nm torque
```

`keep[j]` maps a row of the filtered matrix back to the store's index. Only the $m$ survivors are scored: $O(n + md)$.

**E3 — reference solution**

```python
import json

def save(store, path):
    with open(path, "w") as fh:
        json.dump({"texts": store.texts,
                   "vectors": [v.tolist() for v in store.vectors],   # ndarray -> list
                   "metadata": store.metadata}, fh)

def load(path):
    with open(path) as fh:
        data = json.load(fh)
    new_store = InMemoryVectorStore()
    for text, vec, meta in zip(data["texts"], data["vectors"], data["metadata"]):
        new_store.insert(text, vec, meta)
    return new_store

save(store, "store.json")
restored = load("store.json")
same = [r["text"] for r in restored.search([0.88, 0.12, 0.0], 2)] == \
       [r["text"] for r in store.search([0.88, 0.12, 0.0], 2)]
print(same, len(restored.texts))   # True 3
```

`ndarray` is not JSON-serializable, so each vector goes through `.tolist()`. Inserting in the saved order keeps the three lists aligned. Both directions are $O(nd)$.

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

