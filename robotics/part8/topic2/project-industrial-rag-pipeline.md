# Part 8, Topic 2: Metadata & Advanced Retrieval
## Project 1: Industrial RAG Pipeline

Build a complete retrieval-augmented generation pipeline that filters equipment manuals by machine serial number and retrieves the most relevant maintenance chunks with source attribution.

### Goal

Prove you can chunk documents, embed them with metadata, store them in a vector store, and build a retrieval function that combines metadata filtering with cosine similarity search to return top-k relevant chunks with source information.

### Requirements

#### 1. Document Chunking

Create at least 3 sample equipment manual texts (at least 500 characters each). Chunk each manual using a recursive or sentence-based strategy with 200-character overlap. Attach metadata to every chunk including `machine_id`, `section_type`, and `source_file`:

```python
manuals = [
    {
        "machine_id": "P101",
        "source_file": "pump_manual.txt",
        "content": "Pump P101 Maintenance Manual...\n\nSection 1: Installation\nMount the pump base plate..."
    },
    {
        "machine_id": "C201",
        "source_file": "compressor_manual.txt",
        "content": "Compressor C201 Service Guide...\n\nSection 1: Operating Parameters\nNormal vibration range..."
    },
    {
        "machine_id": "P101",
        "source_file": "pump_troubleshooting.txt",
        "content": "Pump P101 Troubleshooting...\n\nSymptom: High vibration\nCause: Misaligned coupling..."
    }
]

def chunk_manual(text, chunk_size=400, overlap=200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
```

#### 2. Embedding and Storage

Embed all chunks using `text-embedding-3-small` (or a mock embedding function for testing). Store them in an in-memory vector store that supports filtered search. Each stored item must include the text, embedding vector, and metadata dict:

```python
import numpy as np

class VectorStore:
    def __init__(self):
        self.items = []

    def add(self, text, vector, metadata):
        self.items.append({"text": text, "vector": np.array(vector), "metadata": metadata})

    def search(self, query_vector, top_k=5, filters=None):
        query = np.array(query_vector)
        candidates = self.items
        if filters:
            candidates = [i for i in candidates if all(i["metadata"].get(k) == v for k, v in filters.items())]

        scored = []
        for item in candidates:
            score = float(np.dot(query, item["vector"]) / (np.linalg.norm(query) * np.linalg.norm(item["vector"]) + 1e-8))
            scored.append({"text": item["text"], "score": score, "metadata": item["metadata"]})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
```

#### 3. Retrieval Function

Build a `retrieve` function that accepts a query string, an optional `machine_id` filter, and a `top_k` parameter. It must embed the query, apply the filter, run the search, and return results with source attribution:

```python
def retrieve(query, store, machine_id=None, top_k=3):
    query_embedding = get_embedding(query)
    filters = {}
    if machine_id:
        filters["machine_id"] = machine_id

    results = store.search(query_embedding, top_k=top_k, filters=filters)

    return [
        {
            "text": r["text"],
            "score": round(r["score"], 4),
            "source": r["metadata"].get("source_file", "unknown"),
            "machine_id": r["metadata"].get("machine_id", "unknown"),
            "section_type": r["metadata"].get("section_type", "unknown")
        }
        for r in results
    ]
```

#### 4. End-to-End Demo

Call `retrieve` with at least 3 different queries: one with a machine_id filter, one without a filter, and one for a different machine. Print the results with scores and source files:

```python
print("=== Query: seal replacement (P101 only) ===")
for r in retrieve("How do I replace the mechanical seal?", store, machine_id="P101"):
    print(f"  [{r['score']}] {r['source']}: {r['text'][:80]}...")

print("\n=== Query: vibration analysis (all machines) ===")
for r in retrieve("What is the vibration threshold?", store):
    print(f"  [{r['score']}] {r['source']}: {r['text'][:80]}...")

print("\n=== Query: oil change (C201 only) ===")
for r in retrieve("When should I change the oil?", store, machine_id="C201"):
    print(f"  [{r['score']}] {r['source']}: {r['text'][:80]}...")
```

### Evaluation Checklist

- [ ] At least 3 sample manuals created with meaningful content (500+ chars each)
- [ ] Documents chunked with overlap and no chunk exceeds 500 characters
- [ ] Every chunk has `machine_id`, `section_type`, and `source_file` metadata
- [ ] Vector store correctly inserts and retrieves items
- [ ] Similarity search returns results sorted by score descending
- [ ] Metadata filtering works correctly (filtering by `machine_id` returns only matching chunks)
- [ ] `retrieve` function returns results with text, score, source, machine_id, and section_type
- [ ] End-to-end demo shows filtered and unfiltered queries returning different result sets
- [ ] Results with higher scores are semantically more relevant to the query
- [ ] Code runs without errors and produces readable output

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Industrial RAG Pipeline**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project industrial rag pipeline**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

