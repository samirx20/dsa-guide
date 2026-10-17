# Part 8, Topic 2: Metadata & Advanced Retrieval
## Chapter 2: Metadata Filtering

**Prerequisite Knowledge:** Basic understanding of Python dictionaries and lists.

Raw vector similarity (finding text with similar meaning) is not enough for most real-world queries. 

### The "Library" Analogy
Imagine you go to a giant library and ask the librarian for "instructions on replacing a seal." 
* **Vector Search:** The librarian brings you 100 books that talk about seals (pump seals, animal seals, envelope seals). 
* **Metadata Filtering:** You tell the librarian, "I only want books from the *Maintenance* section, specifically for the *P101 Pump*." Now the librarian only searches within that specific subset of books.

A maintenance technician asking about "seal replacement" only wants results for a specific machine, not every machine in the plant. Metadata filtering narrows the search space before or after vector similarity scoring.

```
   Without Metadata Filtering:

   Query: "seal replacement"
   ┌─────────────────────────────────────────────┐
   │  Results from ALL machines:                  │
   │  ✓ P101 Pump seal replacement     (relevant)│
   │  ✓ P102 Pump seal replacement     (relevant)│
   │  ✗ C201 Compressor seal change    (wrong)   │
   │  ✗ T301 Turbine seal inspection   (wrong)   │
   │  ✗ P103 Pump seal, animal type    (wrong)   │
   └─────────────────────────────────────────────┘

   With Metadata Filtering (machine_id = "P101"):

   Query: "seal replacement" WHERE machine_id = "P101"
   ┌─────────────────────────────────────────────┐
   │  Results from P101 only:                     │
   │  ✓ P101 Pump seal replacement     (relevant)│
   │  ✓ P101 Pump seal inspection      (relevant)│
   └─────────────────────────────────────────────┘
```

### 1. Storing Metadata Alongside Vectors

Every chunk needs metadata that describes its source context. For industrial documents, common metadata fields include machine identifiers, document type, section category, and version:

```python
chunks = [
    {
        "text": "Replace the mechanical seal every 5000 hours",
        "vector": [0.9, 0.1, 0.0],
        "metadata": {
            "machine_id": "P101",
            "asset_type": "pump",
            "section_type": "maintenance",
            "source_file": "pump_manual.pdf",
            "page": 12
        }
    },
    {
        "text": "Vibration threshold is 5 mm/s peak",
        "vector": [0.8, 0.2, 0.0],
        "metadata": {
            "machine_id": "P101",
            "asset_type": "pump",
            "section_type": "specifications",
            "source_file": "pump_manual.pdf",
            "page": 8
        }
    },
    {
        "text": "Compressor oil change interval is 10000 hours",
        "vector": [0.1, 0.8, 0.1],
        "metadata": {
            "machine_id": "C201",
            "asset_type": "compressor",
            "section_type": "maintenance",
            "source_file": "compressor_manual.pdf",
            "page": 15
        }
    }
]
```

**What's happening:**
```python
# Each chunk has three parts:
# 1. "text"     → The actual content (what gets embedded)
# 2. "vector"   → The embedding (3D example, real would be 1536D)
# 3. "metadata" → Filterable attributes (flat key-value pairs)
#
# Metadata fields for industrial documents:
# machine_id  → Which piece of equipment (P101, C201, T301)
# asset_type  → Category (pump, compressor, turbine, valve)
# section_type → What kind of content (maintenance, specs, safety)
# source_file → Which document this came from
# page        → Page number in the original document
#
# Keep metadata FLAT (no nested objects)
# Dates as ISO strings: "2024-01-15"
# Categories as simple strings: "maintenance"
# IDs as strings: "P101" (not integers)
```

Metadata fields should be flat key-value pairs. Nested structures make filtering logic complex and slow. Store dates as ISO strings, categories as enums, and IDs as strings.

### Good Metadata Schema vs Bad

```python
# BAD: Nested metadata — hard to filter, slow to query
metadata = {
    "machine": {
        "id": "P101",
        "type": "pump",
        "location": {"building": "A", "floor": 2}
    },
    "document": {
        "pages": [8, 9, 10, 11, 12],
        "revision": "3.1"
    }
}

# GOOD: Flat metadata — easy to filter, fast to query
metadata = {
    "machine_id": "P101",
    "asset_type": "pump",
    "building": "A",
    "floor": 2,
    "source_file": "pump_manual.pdf",
    "page_start": 8,
    "page_end": 12,
    "revision": "3.1"
}
```

### 2. Pre-Filtering: Filter Before Vector Search

Pre-filtering reduces the dataset before computing similarity. This is faster and ensures results only come from the filtered subset:

```python
import numpy as np

def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def pre_filter_search(chunks, query_vector, filters, top_k=3):
    filtered = []
    for chunk in chunks:
        match = True
        for key, value in filters.items():
            if chunk["metadata"].get(key) != value:
                match = False
                break
        if match:
            filtered.append(chunk)

    for chunk in filtered:
        chunk["score"] = cosine_sim(query_vector, chunk["vector"])

    filtered.sort(key=lambda x: x["score"], reverse=True)
    return filtered[:top_k]

results = pre_filter_search(
    chunks,
    query_vector=[0.85, 0.15, 0.0],
    filters={"machine_id": "P101"}
)
for r in results:
    print(f"{r['score']:.4f} | {r['text']} | {r['metadata']['section_type']}")
```

**What's happening:**
```python
# filters = {"machine_id": "P101"}
#
# Step 1: Pre-filter
#   chunk[0]: machine_id = "P101" → match ✓
#   chunk[1]: machine_id = "P101" → match ✓
#   chunk[2]: machine_id = "C201" → no match ✗
#
# Step 2: Score only filtered chunks
#   chunk[0]: cosine_sim([0.85,0.15,0.0], [0.9,0.1,0.0]) ≈ 0.99
#   chunk[1]: cosine_sim([0.85,0.15,0.0], [0.8,0.2,0.0]) ≈ 0.99
#
# Step 3: Sort by score, return top_k
#   Both P101 chunks returned, C201 chunk excluded
#
# Benefits:
# - Faster: only compute similarity for relevant chunks
# - Guaranteed: every result matches the filter
# - Safe: no accidental leaks from wrong machines
```

Pre-filtering guarantees that every result matches the filter. The downside is that if the filter narrows to very few documents, you might miss relevant results from outside the filter — but that is usually the correct behavior.

### 3. Post-Filtering: Score First, Filter After

Post-filtering computes similarity across all documents, then removes results that do not match the filter:

```python
def post_filter_search(chunks, query_vector, filters, top_k=3):
    for chunk in chunks:
        chunk["score"] = cosine_sim(query_vector, chunk["vector"])

    scored = sorted(chunks, key=lambda x: x["score"], reverse=True)

    results = []
    for chunk in scored:
        match = True
        for key, value in filters.items():
            if chunk["metadata"].get(key) != value:
                match = False
                break
        if match:
            results.append(chunk)
        if len(results) >= top_k:
            break
    return results

results = post_filter_search(
    chunks,
    query_vector=[0.85, 0.15, 0.0],
    filters={"section_type": "maintenance"}
)
for r in results:
    print(f"{r['score']:.4f} | {r['text']} | {r['metadata']['machine_id']}")
```

**What's happening:**
```python
# filters = {"section_type": "maintenance"}
#
# Step 1: Score ALL chunks (no filtering yet)
#   chunk[0]: "Replace seal every 5000 hours" → score ≈ 0.99
#   chunk[1]: "Vibration threshold is 5 mm/s" → score ≈ 0.99
#   chunk[2]: "Oil change interval 10000 hrs" → score ≈ 0.29
#
# Step 2: Sort by score (highest first)
#   [chunk0, chunk1, chunk2]
#
# Step 3: Filter AFTER scoring
#   chunk0: section_type = "maintenance" → keep ✓
#   chunk1: section_type = "specifications" → skip ✗
#   chunk2: section_type = "maintenance" → keep ✓
#
# Result: chunk0 and chunk2 returned
#
# When post-filtering is useful:
# - You want globally most similar docs that also match filter
# - The filter is loose (matches many chunks)
#
# When it's wasteful:
# - Filter matches only 5% of chunks
# - You scored 10,000 chunks but only 500 match the filter
# - You wasted compute on 9,500 chunks
```

Post-filtering is useful when you want to see the globally most similar documents that also match your filter. The risk is that if you score thousands of documents but only a few match the filter, you wasted compute. In practice, pre-filtering is preferred for most use cases.

### Pre-Filter vs Post-Filter Comparison

| Aspect | Pre-Filter | Post-Filter |
|--------|-----------|-------------|
| Speed | Faster (smaller dataset) | Slower (scans all) |
| Guarantees | Every result matches filter | May miss relevant filtered results |
| Best for | Narrow filters (specific machine) | Broad filters (any maintenance) |
| Risk | Might miss high-scoring excluded docs | Wasted compute on filtered-out docs |
| Use when | You know what subset you want | You want best overall with filter |

### 4. Hybrid Search Patterns

Hybrid search combines vector similarity with other signals like keyword matching or recency. A practical pattern is to use metadata to create a score multiplier:

```python
def hybrid_search(chunks, query_vector, filters, top_k=3, keyword_bonus=0.15):
    query_words = set(query_vector) if isinstance(query_vector, list) else set()
    results = []

    for chunk in chunks:
        text_lower = chunk["text"].lower()
        match = True
        for key, value in filters.items():
            if chunk["metadata"].get(key) != value:
                match = False
                break
        if not match:
            continue

        v_score = cosine_sim(query_vector, chunk["vector"])
        keyword_score = 0
        for word in ["pump", "seal", "maintenance", "replace", "vibration"]:
            if word in text_lower:
                keyword_score += keyword_bonus

        combined = v_score + min(keyword_score, 0.3)
        results.append({"chunk": chunk, "score": combined})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

results = hybrid_search(
    chunks,
    query_vector=[0.85, 0.15, 0.0],
    filters={"machine_id": "P101"}
)
for r in results:
    print(f"{r['score']:.4f} | {r['chunk']['text']}")
```

**What's happening:**
```python
# Hybrid search combines two signals:
# 1. Vector similarity (semantic understanding)
# 2. Keyword match (exact term presence)
#
# For chunk "Replace the mechanical seal every 5000 hours":
#   v_score = 0.99 (vector similarity to query)
#   keyword matches: "seal" ✓, "replace" ✓
#   keyword_score = 0.15 * 2 = 0.30 (capped at 0.3)
#   combined = 0.99 + 0.30 = 1.29
#
# For chunk "Pump P-101 maintenance schedule":
#   v_score = 0.95 (slightly lower vector similarity)
#   keyword matches: "pump" ✓, "maintenance" ✓
#   keyword_score = 0.15 * 2 = 0.30
#   combined = 0.95 + 0.30 = 1.25
#
# Without hybrid: first chunk wins
# With hybrid: keyword bonus boosts documents containing exact terms
#
# Why hybrid helps:
# - Vector similarity can miss exact keyword matches
# - "seal" might not be strongly encoded in the embedding
# - Keyword match provides an explicit signal boost
# - Combined score is more robust than either alone
```

Hybrid search balances semantic understanding (vector) with explicit signal (keywords). The keyword bonus boosts documents that contain important terms even if their vector similarity is slightly lower.

### Production: Weighted Hybrid Search

```python
def weighted_hybrid_search(chunks, query_vector, filters, top_k=3,
                           vector_weight=0.7, keyword_weight=0.3):
    """Production hybrid search with configurable weights."""
    important_keywords = {
        "maintenance": 0.1,
        "procedure": 0.1,
        "specification": 0.1,
        "safety": 0.15,  # Safety terms get higher weight
        "warning": 0.15,
        "critical": 0.15,
    }
    
    results = []
    for chunk in chunks:
        # Apply metadata filters
        match = all(
            chunk["metadata"].get(key) == value
            for key, value in filters.items()
        )
        if not match:
            continue
        
        # Vector similarity score
        v_score = cosine_sim(query_vector, chunk["vector"])
        
        # Keyword score (weighted by importance)
        text_lower = chunk["text"].lower()
        k_score = sum(
            weight for keyword, weight in important_keywords.items()
            if keyword in text_lower
        )
        k_score = min(k_score, 0.5)  # Cap keyword contribution
        
        # Weighted combination
        combined = (vector_weight * v_score) + (keyword_weight * k_score)
        results.append({"chunk": chunk, "score": combined})
    
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
```

### 5. Filtering by Multiple Fields

Combine multiple filters with AND logic to narrow results precisely:

```python
def multi_filter_search(chunks, query_vector, filters, top_k=3):
    filtered = []
    for chunk in chunks:
        match = all(
            chunk["metadata"].get(key) == value
            for key, value in filters.items()
        )
        if match:
            chunk["score"] = cosine_sim(query_vector, chunk["vector"])
            filtered.append(chunk)

    filtered.sort(key=lambda x: x["score"], reverse=True)
    return filtered[:top_k]

results = multi_filter_search(
    chunks,
    query_vector=[0.85, 0.15, 0.0],
    filters={"machine_id": "P101", "section_type": "maintenance"}
)
for r in results:
    print(f"{r['score']:.4f} | {r['text']}")
```

**What's happening:**
```python
# filters = {"machine_id": "P101", "section_type": "maintenance"}
#
# all() checks ALL filter conditions:
#   chunk[0]: machine_id="P101" AND section_type="maintenance" → True ✓
#   chunk[1]: machine_id="P101" AND section_type="specs"       → False ✗
#   chunk[2]: machine_id="C201" AND section_type="maintenance" → False ✗
#
# This is AND logic: ALL conditions must match
# For OR logic, run separate searches and merge results
```

For OR logic, run separate searches per filter value and merge results. For range filters on numeric metadata (e.g., `page > 10`), apply the comparison in the filter function. Keep filter logic simple — complex queries belong in your application layer, not in the vector search function.

### 6. Filter Performance Tips

```python
# TIP 1: Filter on the most selective field first
# If machine_id has 50 values but section_type has 5,
# filter by machine_id first (reduces more candidates)

# TIP 2: Use indexed fields in pgvector
CREATE INDEX idx_machine_id ON document_chunks(machine_id);
CREATE INDEX idx_section_type ON document_chunks(section_type);
-- Now WHERE machine_id = 'P101' uses the index, not sequential scan

# TIP 3: Cache frequent filter results
from functools import lru_cache

@lru_cache(maxsize=128)
def get_p101_chunks():
    return [c for c in all_chunks if c["metadata"]["machine_id"] == "P101"]

# TIP 4: Combine filters in the vector database, not Python
# BAD: Fetch all vectors, filter in Python
# GOOD: Use pgvector WHERE clause or Pinecone filter parameter
```

### Quick Reference

| Pattern | Function | Use Case |
|---------|----------|----------|
| Pre-filter | Filter first, then score | Narrow subsets (specific machine) |
| Post-filter | Score first, then filter | Broad subsets (any maintenance) |
| Hybrid | Score + keyword bonus | Better precision for exact terms |
| AND filter | `all(conditions)` | Multiple required fields |
| OR filter | `any(conditions)` | Any of several values |
| Exclude | Skip if condition matches | Remove unwanted categories |

### Summary

Metadata filtering narrows the search space to relevant documents before or after similarity scoring. Pre-filtering is faster and more predictable; post-filtering preserves global ranking but wastes compute. Hybrid search combines vector similarity with keyword signals for better precision. Always design your metadata schema around the filters you will actually use.

---

## Practice & Self-Check

All questions use the chapter's three `chunks` (P101 maintenance p.12 `[0.9, 0.1, 0.0]`, P101 specifications p.8 `[0.8, 0.2, 0.0]`, C201 maintenance p.15 `[0.1, 0.8, 0.1]`) and the query `[0.85, 0.15, 0.0]`.

### Predict the Output / Trace by Hand

**Q1. Pre-filter on a different field.** Which chunks does `pre_filter_search(chunks, [0.85, 0.15, 0.0], filters={"section_type": "maintenance"})` return, in what order, and with what scores (4 decimals)?

**Q2. The type trap.** What does this return, and why?

```python
multi_filter_search(chunks, [0.85, 0.15, 0.0],
                    filters={"machine_id": "P101", "page": "12"})
```

**Q3. Hybrid scores.** Compute the `combined` score for each result of the chapter's `hybrid_search(chunks, [0.85, 0.15, 0.0], filters={"machine_id": "P101"})`. Which keywords from `["pump", "seal", "maintenance", "replace", "vibration"]` fire for each chunk?

**Q4. Weighted hybrid with the cap.** In `weighted_hybrid_search`, a chunk has text `"Safety warning: critical maintenance procedure"` and vector similarity `v_score = 0.8`. What are the raw `k_score`, the capped `k_score`, and the `combined` score with the default weights? Bonus: what is `k_score` for the text `"Vibration threshold is 5 mm/s peak (see specifications)"`?

**Q5. Hidden side effect.** Starting from fresh `chunks` (no `"score"` keys), you run only `pre_filter_search(chunks, [0.85, 0.15, 0.0], {"machine_id": "P101"})`. What is `chunks[2].get("score")` afterwards? What is `chunks[0].get("score")` (rounded)?

### Coding Exercises

**E1 (Easy).** The chapter says "For OR logic, run separate searches and merge results." Do it in one pass: write `or_filter_search(chunks, query_vector, field, values, top_k=3)` that keeps chunks whose `metadata[field]` is in `values`, scores them, and returns dicts `{"text", "score" (4 dp), field}` sorted by score.

- `or_filter_search(chunks, [0.85, 0.15, 0.0], "page", [8, 15])` → P101 specifications (0.9975, page 8), then C201 (0.2924, page 15)

**E2 (Easy–Medium).** Write `matches(meta: dict, filters: dict) -> bool` supporting Pinecone-style operators `$eq, $ne, $in, $nin, $gt, $gte, $lt, $lte`. A bare value means `$eq`. All conditions are ANDed, and a range operator on a missing field is `False`.

- `{"asset_type": "pump", "page": {"$gte": 10}}` → matches only page 12
- `{"page": {"$gt": 8, "$lte": 15}}` → matches pages 12 and 15

**E3 (Medium).** Score-adding hybrid search mixes incompatible scales. Write **Reciprocal Rank Fusion**: `rrf(vector_ranking, keyword_ranking, k=60, top_k=3)` where each ranking is a list of doc ids (best first). Each doc's score is $\sum_{\text{lists}} \frac{1}{k + \text{rank}}$ with rank starting at 1. Return `(doc_id, score rounded to 5 dp)` sorted by score descending, ties broken by id.

- `rrf(["A", "B", "C", "D"], ["C", "A", "E"])` → `[("A", 0.03252), ("C", 0.03227), ("B", 0.01613)]`
- `rrf(["A", "B"], ["B", "C"], k=1)` → `[("B", 0.83333), ("A", 0.5), ("C", 0.33333)]`

#### Dry-Run: Answers

**Q1.** The filter keeps chunk 0 (P101) and chunk 2 (C201) and drops chunk 1, which is `specifications`. With $\|q\| = \sqrt{0.745} \approx 0.8631$:

| chunk | dot | $\|q\|\,\|c\|$ | score |
|-------|-----|----------------|-------|
| 0 `[0.9, 0.1, 0]` | $0.765 + 0.015 = 0.780$ | $0.8631 \times 0.9055 \approx 0.7816$ | **0.9980** |
| 2 `[0.1, 0.8, 0.1]` | $0.085 + 0.120 = 0.205$ | $0.8631 \times 0.8124 \approx 0.7012$ | **0.2924** |

Order: **P101 maintenance (0.9980), then C201 maintenance (0.2924)**. The filter cannot rescue relevance: C201 is returned even though it scores low, because nothing else matches.

**Q2.** It returns **`[]`**. The stored `page` is the **integer** `12`, and `12 == "12"` is `False` in Python, so `all(...)` fails for every chunk. With `"page": 12` the result is the seal chunk. This is why the chapter insists on a consistent metadata schema: the types must match, not just the values.

**Q3.** Both P101 chunks pass the filter.

| chunk | v_score | keywords hit | keyword_score | combined |
|-------|---------|--------------|---------------|----------|
| "Replace the mechanical seal every 5000 hours" | 0.9980 | `seal`, `replace` | $0.15 \times 2 = 0.30$ (cap 0.3) | **1.2980** |
| "Vibration threshold is 5 mm/s peak" | 0.9975 | `vibration` | 0.15 | **1.1475** |

The seal chunk ranks first. The vector scores differ by only 0.0005, so the keyword bonus decides the order.

**Q4.** Lowercased, the text contains `safety` (0.15), `warning` (0.15), `critical` (0.15), `maintenance` (0.10) and `procedure` (0.10). The raw `k_score` is **0.65**, which is **capped to 0.5**. The combined score is $0.7 \times 0.8 + 0.3 \times 0.5 = 0.56 + 0.15 = \mathbf{0.71}$.

Bonus: `"specification" in "...specifications)"` is a **substring** match, so `k_score = 0.1`. `in` on strings does not respect word boundaries.

**Q5.** `chunks[2].get("score")` is **`None`**. The C201 chunk was filtered out, so `chunk["score"] = ...` never ran on it. `chunks[0].get("score")` is **≈ 0.998**. `pre_filter_search` writes `"score"` **into the shared chunk dicts**, mutating the caller's data, so a later search can see stale scores. Returning `{**chunk, "score": s}` copies avoids this.

**E1 — reference solution**

```python
def or_filter_search(chunks, query_vector, field, values, top_k=3):
    allowed = set(values)
    out = []
    for c in chunks:
        if c["metadata"].get(field) in allowed:          # OR across values
            out.append({"text": c["text"],
                        "score": round(cosine_sim(query_vector, c["vector"]), 4),
                        field: c["metadata"][field]})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out[:top_k]

print(or_filter_search(chunks, [0.85, 0.15, 0.0], "page", [8, 15]))
# [{'text': 'Vibration threshold is 5 mm/s peak', 'score': 0.9975, 'page': 8},
#  {'text': 'Compressor oil change interval is 10000 hours', 'score': 0.2924, 'page': 15}]
```

A single pass is $O(n \cdot d)$, and the result is sorted in $O(m \log m)$. A `set` makes each membership test $O(1)$. The function returns new dicts, so the input is not mutated.

**E2 — reference solution**

```python
def matches(meta: dict, filters: dict) -> bool:
    for field, cond in filters.items():
        val = meta.get(field)
        if not isinstance(cond, dict):
            cond = {"$eq": cond}                         # bare value = equality
        for op, arg in cond.items():
            if op == "$eq":
                ok = val == arg
            elif op == "$ne":
                ok = val != arg
            elif op == "$in":
                ok = val in arg
            elif op == "$nin":
                ok = val not in arg
            elif op in ("$gt", "$gte", "$lt", "$lte"):
                if val is None:
                    return False
                ok = {"$gt": val > arg, "$gte": val >= arg,
                      "$lt": val < arg, "$lte": val <= arg}[op]
            else:
                raise ValueError(f"unknown operator {op}")
            if not ok:
                return False                             # AND: fail fast
    return True

metas = [c["metadata"] for c in chunks]
print([m["page"] for m in metas if matches(m, {"asset_type": "pump", "page": {"$gte": 10}})])  # [12]
print([m["page"] for m in metas if matches(m, {"page": {"$gt": 8, "$lte": 15}})])            # [12, 15]
```

The cost is $O(\text{number of conditions})$ per chunk. The `None` guard prevents `TypeError` from comparisons like `None >= 10`.

**E3 — reference solution**

```python
def rrf(vector_ranking, keyword_ranking, k=60, top_k=3):
    scores = {}
    for ranking in (vector_ranking, keyword_ranking):
        for rank, doc in enumerate(ranking, start=1):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    ordered = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    return [(doc, round(s, 5)) for doc, s in ordered][:top_k]

print(rrf(["A", "B", "C", "D"], ["C", "A", "E"]))
# [('A', 0.03252), ('C', 0.03227), ('B', 0.01613)]
```

Trace with $k = 60$:

- A scores $\frac{1}{61} + \frac{1}{62} = 0.016393 + 0.016129 = 0.032522$.
- C scores $\frac{1}{63} + \frac{1}{61} = 0.015873 + 0.016393 = 0.032266$.
- B scores $\frac{1}{62} = 0.016129$.

RRF uses only ranks, so a cosine of 0.99 and a keyword count of 3 never have to share a scale. It runs in $O(n \log n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Metadata Filtering**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter5 metadata filtering**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

