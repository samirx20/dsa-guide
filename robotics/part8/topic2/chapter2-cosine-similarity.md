# Part 8, Topic 2: Vector Search & Embeddings
## Chapter 2: Cosine Similarity

**Prerequisite Knowledge:** Basic understanding of arrays/lists and the concept of a coordinate system.

### The 'Pointing Arrows' Analogy
Imagine standing in a field pointing at different landmarks. If you point at a mountain and your friend stands next to you and points at the exact same mountain, your arms are pointing in the exact same *direction*. It doesn't matter if your arm is longer or shorter than your friend's arm; what matters is the *angle* between them. If the angle is zero, you are pointing at the same thing. 

Cosine similarity works exactly like this for AI. Instead of comparing how long documents are (the length of the arm), it compares the *direction* they are pointing in a mathematical space. If two documents have a narrow angle between their vectors, they are talking about the same topic, even if one is a short sentence and the other is a 5-page essay.

Cosine similarity measures how close two vectors point in the same direction, regardless of their magnitude. It is the standard metric for comparing embedding vectors because it focuses on the angle between vectors — which captures semantic similarity — rather than raw distance.

```
   Factory Sensor Vectors: Direction vs. Magnitude

   Vector A (short, pointing NW):    Vector B (long, pointing NW):
         *                                 *
        /                                 /
       /                                 /
      /                                 /
     *                                 *
   0,0                               0,0

   Same direction → Cosine Similarity = 1.0
   Different magnitude → Euclidean Distance = large
```

### 1. The Math Behind Cosine Similarity

The formula is straightforward: take the dot product of two vectors and divide by the product of their magnitudes (L2 norms). The result ranges from -1 (opposite directions) to 1 (identical direction), with 0 meaning orthogonal (unrelated):

```python
import numpy as np

def cosine_similarity(a, b):
    # Convert inputs to numpy arrays for math operations
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    
    # Calculate the dot product (how much they align)
    dot_product = np.dot(a, b)
    
    # Calculate the magnitude (length) of each vector
    magnitude_a = np.linalg.norm(a)
    magnitude_b = np.linalg.norm(b)
    
    # Divide dot product by the product of magnitudes
    return dot_product / (magnitude_a * magnitude_b)

v1 = [0.1, 0.2, 0.3, 0.4, 0.5]
v2 = [0.15, 0.25, 0.35, 0.45, 0.55]
v3 = [0.5, 0.4, 0.3, 0.2, 0.1]

print(cosine_similarity(v1, v2))  # ~0.99 (nearly parallel)
print(cosine_similarity(v1, v3))  # ~0.64 (similar but different direction)
```

**What's happening:**
```python
v1 = [0.1, 0.2, 0.3, 0.4, 0.5]
v2 = [0.15, 0.25, 0.35, 0.45, 0.55]
#      ^    ^    ^    ^    ^
#      |    |    |    |    └── Dimension 4: both positive, close in ratio
#      |    |    |    └── Dimension 3: both positive, close in ratio
#      |    |    └── Dimension 2: both positive, close in ratio
#      |    └── Dimension 1: both positive, close in ratio
#      └── Dimension 0: both positive, close in ratio
#
# v2 is v1 + 0.05 in every dimension (1.1x-1.5x per dimension)
# They point in nearly the SAME direction
# Dot product = 0.1*0.15 + 0.2*0.25 + ... = large positive
# Magnitudes: |v1| ≈ 0.74, |v2| ≈ 0.84
# Result: dot / (0.74 * 0.84) ≈ 0.99 → nearly identical direction
```

Dot product measures how much two vectors align. Magnitudes act as normalizers — a short vector pointing the same direction as a long vector will still score close to 1. This is why cosine similarity works for text: it ignores how "long" or intense a document is and focuses on its topic direction.

### Score Ranges and What They Mean

```python
# Score ranges for cosine similarity:
#
#  1.0  → Identical direction (same topic, same emphasis)
#  0.9+ → Very similar (same topic, minor differences)
#  0.7+ → Related (overlapping themes)
#  0.5  → Weakly related (some shared concepts)
#  0.0  → Orthogonal (completely unrelated topics)
# -1.0  → Opposite directions (antonyms, contradictions)
#
# Factory example:
# "pump seal replacement" vs "motor seal inspection"  → 0.92
# "pump seal replacement" vs "turbine overhaul"       → 0.31
# "pump seal replacement" vs "vacation policy"        → 0.05
```

### 2. Why Cosine Over Euclidean Distance

Euclidean distance measures raw geometric distance between points. Two vectors can be far apart in distance but point in nearly the same direction. Consider embeddings of "the pump is hot" and "the pump is overheating, the temperature is critically high, immediate shutdown required" — the second is longer and produces a larger-magnitude vector, so Euclidean distance penalizes it. Cosine similarity does not:

```python
a = np.array([1.0, 2.0, 3.0])
b = np.array([2.0, 4.0, 6.0])

# Calculate straight-line distance
difference = a - b
euclidean_dist = np.linalg.norm(difference)  # 3.74

# Calculate directional similarity
cosine_sim = cosine_similarity(a, b)    # 1.0 (perfectly parallel)

print(f"Euclidean: {euclidean_dist}")
print(f"Cosine: {cosine_sim}")
```

**What's happening:**
```python
a = np.array([1.0, 2.0, 3.0])
b = np.array([2.0, 4.0, 6.0])
#  b is exactly 2 * a
#  They point in the SAME direction, just different length
#
# difference = a - b = [-1.0, -2.0, -3.0]
# euclidean_dist = sqrt(1 + 4 + 9) = sqrt(14) ≈ 3.74
# Euclidean says: "these are far apart!"
#
# dot(a, b) = 1*2 + 2*4 + 3*6 = 28
# |a| = sqrt(14), |b| = sqrt(56) = 2*sqrt(14)
# cosine = 28 / (sqrt(14) * 2*sqrt(14)) = 28 / 28 = 1.0
# Cosine says: "these are identical!"
```

In this example, b is exactly twice a — they point in the same direction. Euclidean distance says they are far apart; cosine similarity correctly identifies them as identical in meaning. For embedding search, always prefer cosine similarity.

### Common Mistake: Using Euclidean on Unnormalized Vectors

```python
import numpy as np

# BAD: Using Euclidean distance for text similarity
short_doc = np.array([0.3, 0.4, 0.5])        # Short maintenance note
long_doc = np.array([3.0, 4.0, 5.0])          # Same topic, much longer manual

euclidean = np.linalg.norm(short_doc - long_doc)  # ≈ 6.36
# Euclidean thinks these are VERY different documents!

# GOOD: Using cosine similarity
cosine = np.dot(short_doc, long_doc) / (
    np.linalg.norm(short_doc) * np.linalg.norm(long_doc)
)
# Cosine ≈ 1.0 → correctly identifies same topic

print(f"Euclidean: {euclidean:.2f}")  # 6.36 (misleading)
print(f"Cosine: {cosine:.4f}")        # 1.0000 (correct)
```

**What's happening:**
```python
short_doc = np.array([0.3, 0.4, 0.5])
long_doc = np.array([3.0, 4.0, 5.0])
# long_doc = 10 * short_doc
# Same direction, 10x magnitude
#
# Euclidean: sqrt((0.3-3)^2 + (0.4-4)^2 + (0.5-5)^2)
#          = sqrt(7.29 + 12.96 + 20.25)
#          = sqrt(40.5) ≈ 6.36
# This is the RAW DISTANCE, not semantic similarity
#
# Cosine: dot / (|a| * |b|)
#        = (0.9 + 1.6 + 2.5) / (0.707 * 7.07)
#        = 5.0 / 5.0 = 1.0
# This captures DIRECTION (topic), not LENGTH (doc size)
```

### 3. Ranking Results with Top-K

In practice you have a query vector and a collection of document vectors. You compute cosine similarity between the query and every document, then return the top-k most similar:

```python
import numpy as np

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

query = [0.9, 0.1, 0.0, 0.0, 0.0]
documents = [
    {"id": "doc1", "text": "Pump seal replacement procedure", "vector": [0.85, 0.12, 0.03, 0.0, 0.0]},
    {"id": "doc2", "text": "Compressor vibration analysis", "vector": [0.1, 0.9, 0.0, 0.0, 0.0]},
    {"id": "doc3", "text": "Pump maintenance schedule", "vector": [0.88, 0.08, 0.02, 0.01, 0.01]},
    {"id": "doc4", "text": "Turbine overhaul checklist", "vector": [0.0, 0.0, 0.0, 0.95, 0.05]},
]

# Calculate scores for all documents
scored = []
for doc in documents:
    score = cosine_similarity(query, doc["vector"])
    
    # Store the result with its score
    scored_doc = {"id": doc["id"], "text": doc["text"], "score": score}
    scored.append(scored_doc)

# Sort the list from highest score to lowest
scored.sort(key=lambda x: x["score"], reverse=True)

# Print only the top 3 results
top_results = scored[:3]
for item in top_results:
    print(f"{item['id']}: {item['score']:.4f} - {item['text']}")
```

**What's happening:**
```python
query = [0.9, 0.1, 0.0, 0.0, 0.0]
#        ^
#        Strong signal on dimension 0
#        Weak signal on dimension 1
#        Zero on dimensions 2-4
#
# doc1: [0.85, 0.12, 0.03, 0.0, 0.0]
#        ^^^^  ^^^
#        Very close to query on dimensions 0-1
#        Score ≈ 0.99 → high match
#
# doc2: [0.1, 0.9, 0.0, 0.0, 0.0]
#        ^   ^^^^
#        Opposite emphasis (dim 1 strong, dim 0 weak)
#        Score ≈ 0.22 → low match
#
# doc3: [0.88, 0.08, 0.02, 0.01, 0.01]
#        ^^^^  ^^^
#        Even closer to query than doc1
#        Score ≈ 0.99 → highest match
#
# doc4: [0.0, 0.0, 0.0, 0.95, 0.05]
#                            ^^^^
#        Completely different direction
#        Score ≈ 0.0 → no match
```

Output shows `doc3` and `doc1` (pump-related) ranked highest for a pump-related query, while `doc4` (turbine) ranks last. This is the core retrieval loop used in every RAG system.

### Production Pattern: Top-K with Confidence Threshold

```python
def top_k_with_threshold(query_vec, documents, top_k=5, min_score=0.7):
    """Return top-k results, but only if they meet a minimum score."""
    scored = []
    for doc in documents:
        score = cosine_similarity(query_vec, doc["vector"])
        if score >= min_score:
            scored.append({"text": doc["text"], "score": score, "metadata": doc.get("metadata", {})})
    
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

# Without threshold: you might return irrelevant results just to fill top_k
# With threshold: you only return results the model is confident about
# If no results meet the threshold, return empty (don't force bad matches)
```

### 4. Batch Similarity with Matrix Operations

For large collections, computing similarity one-by-one is slow. Use matrix multiplication to compare the query against all documents simultaneously:

```python
import numpy as np

query = np.array([0.9, 0.1, 0.0, 0.0, 0.0])

# Put all document vectors into a 2D matrix (a table of numbers)
doc_matrix = np.array([
    [0.85, 0.12, 0.03, 0.0, 0.0],
    [0.1, 0.9, 0.0, 0.0, 0.0],
    [0.88, 0.08, 0.02, 0.01, 0.01],
    [0.0, 0.0, 0.0, 0.95, 0.05],
])

# 1. Calculate magnitudes for all documents at once
norms = np.linalg.norm(doc_matrix, axis=1)

# 2. Calculate magnitude for the query
query_norm = np.linalg.norm(query)

# 3. Compute dot products for all at once and divide by magnitudes
dot_products = np.dot(doc_matrix, query)
similarities = dot_products / (norms * query_norm)

# 4. Find the indices of the top 3 scores
sorted_indices = np.argsort(similarities)[::-1]
top_k_indices = sorted_indices[:3]

for idx in top_k_indices:
    print(f"Doc {idx}: {similarities[idx]:.4f}")
```

**What's happening:**
```python
# doc_matrix shape: (4 documents, 5 dimensions)
# query shape:      (5 dimensions,)
#
# np.dot(doc_matrix, query):
#   Row 0: 0.85*0.9 + 0.12*0.1 + 0.03*0 + 0*0 + 0*0 = 0.777
#   Row 1: 0.1*0.9  + 0.9*0.1  + 0*0    + 0*0 + 0*0 = 0.18
#   Row 2: 0.88*0.9 + 0.08*0.1 + 0.02*0 + 0.01*0 + 0.01*0 = 0.80
#   Row 3: 0*0.9    + 0*0.1    + 0*0    + 0.95*0 + 0.05*0 = 0
# Result: [0.777, 0.18, 0.80, 0.0]
#
# norms = [sqrt(0.85^2+0.12^2+...), ...] for each row
# similarities = dot_products / (norms * query_norm)
# All done in ONE matrix operation — much faster than a loop
#
# np.argsort returns indices sorted lowest to highest
# [::-1] reverses to get highest to lowest
# [:3] takes the first 3 (top 3)
```

This approach scales to thousands of comparisons in milliseconds. For millions of documents, you need approximate nearest neighbor (ANN) indexes, but for most industrial RAG pipelines with tens of thousands of chunks, brute-force batch computation is fast enough.

### Performance Comparison: Loop vs Batch

```python
import numpy as np
import time

# Generate 10,000 random document vectors (512 dimensions each)
np.random.seed(42)
docs = np.random.rand(10000, 512).astype(np.float32)
query = np.random.rand(512).astype(np.float32)

# SLOW: Loop-based similarity
start = time.time()
loop_scores = []
for doc in docs:
    score = float(np.dot(query, doc) / (np.linalg.norm(query) * np.linalg.norm(doc)))
    loop_scores.append(score)
loop_time = time.time() - start

# FAST: Batch matrix similarity
start = time.time()
doc_norms = np.linalg.norm(docs, axis=1)
query_norm = np.linalg.norm(query)
batch_scores = np.dot(docs, query) / (doc_norms * query_norm)
batch_time = time.time() - start

print(f"Loop:  {loop_time*1000:.1f}ms")
print(f"Batch: {batch_time*1000:.1f}ms")
print(f"Speedup: {loop_time/batch_time:.0f}x")

# Typical results:
# Loop:  45.2ms
# Batch: 0.8ms
# Speedup: 56x
```

### 5. Handling Edge Cases

A zero vector produces division by zero. Normalize inputs or guard against it:

```python
def safe_cosine_similarity(a, b):
    a, b = np.array(a, dtype=np.float64), np.array(b, dtype=np.float64)
    
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    # Guard against dividing by zero
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    dot_product = np.dot(a, b)
    return float(dot_product / (norm_a * norm_b))

zero_vec = [0.0, 0.0, 0.0]
normal_vec = [1.0, 0.0, 0.0]
print(safe_cosine_similarity(zero_vec, normal_vec))  # 0.0
```

**What's happening:**
```python
zero_vec = [0.0, 0.0, 0.0]
normal_vec = [1.0, 0.0, 0.0]
# norm_a = sqrt(0 + 0 + 0) = 0
# norm_b = sqrt(1 + 0 + 0) = 1
#
# Without guard: 0 / (0 * 1) = 0/0 → NaN or ZeroDivisionError
# With guard: check norm_a == 0 first → return 0.0
#
# Why zero vectors happen in practice:
# - Empty document chunks (blank lines, whitespace-only)
# - Failed embedding API calls that return zeros
# - Corrupted data during ingestion
```

Also watch for floating point precision. Two vectors that should score 1.0 might return 0.9999999 due to rounding. Use `np.clip` if you need guaranteed bounds:

```python
raw_score = safe_cosine_similarity(v1, v2)
score = np.clip(raw_score, -1.0, 1.0)
```

### Common Mistake: Forgetting to Normalize Before Storage

```python
# WRONG: Storing raw embedding output without checking norms
raw_embedding = embedding_model.encode("Pump maintenance procedure")
# raw_embedding might have norm = 1.0 (already normalized)
# or norm = 45.3 (not normalized, depends on model)

store.insert(text, raw_embedding)  # Inconsistent!

# RIGHT: Always normalize before storage
raw_embedding = embedding_model.encode("Pump maintenance procedure")
normalized = raw_embedding / np.linalg.norm(raw_embedding)
# Now norm is guaranteed to be 1.0
store.insert(text, normalized)
```

### Edge Case: NaN Propagation from NaN Vectors

```python
import numpy as np

def safe_cosine_with_nan_check(a, b):
    a, b = np.array(a, dtype=np.float64), np.array(b, dtype=np.float64)
    
    # Check for NaN in inputs
    if np.any(np.isnan(a)) or np.any(np.isnan(b)):
        return 0.0
    
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))

# NaN vectors can come from:
# - Overflow in embedding model (very long text)
# - Invalid input text (control characters, encoding issues)
# - Model errors (rare but happens)
nan_vec = [float('nan'), 0.0, 0.0]
normal_vec = [1.0, 0.0, 0.0]
print(safe_cosine_with_nan_check(nan_vec, normal_vec))  # 0.0 (safe)
```

### 6. Visualizing the Score Space

```python
import numpy as np

def visualize_scores():
    """Show how cosine similarity behaves across different vector relationships."""
    # Base vector: represents "pump maintenance" topic
    base = np.array([0.8, 0.2, 0.0, 0.0, 0.0])
    
    # Same topic, different magnitude
    same_topic_long = base * 5  # [4.0, 1.0, 0.0, 0.0, 0.0]
    
    # Similar topic (overlap)
    similar_topic = np.array([0.7, 0.3, 0.1, 0.0, 0.0])
    
    # Unrelated topic
    unrelated = np.array([0.0, 0.0, 0.0, 0.9, 0.1])
    
    # Opposite
    opposite = np.array([-0.8, -0.2, 0.0, 0.0, 0.0])
    
    pairs = [
        ("Same topic, different magnitude", same_topic_long),
        ("Similar topic", similar_topic),
        ("Unrelated topic", unrelated),
        ("Opposite topic", opposite),
    ]
    
    for label, vec in pairs:
        score = safe_cosine_similarity(base, vec)
        print(f"{label:40s} → {score:+.4f}")

# Output:
# Same topic, different magnitude     → +1.0000
# Similar topic                        → +0.9788
# Unrelated topic                      → +0.0000
# Opposite topic                       → -1.0000
```

### Quick Reference

| Operation | Formula | Use Case |
|-----------|---------|----------|
| `np.dot(a, b)` | `a[0]*b[0] + a[1]*b[1] + ...` | How much vectors align |
| `np.linalg.norm(a)` | `sqrt(a[0]^2 + a[1]^2 + ...)` | Vector magnitude (length) |
| Cosine similarity | `dot(a,b) / (norm(a)*norm(b))` | Semantic text comparison |
| Cosine distance | `1 - cosine_similarity` | When lower = more similar |
| Top-K ranking | `argsort(scores)[::-1][:k]` | Return k best matches |

### Summary

Cosine similarity measures the angle between vectors, making it ideal for text comparison where direction matters more than magnitude. Use batch matrix operations for performance and always guard against zero-magnitude vectors. The top-k ranking pattern you learned here is the core of every vector search retrieval step.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Score four documents by hand.** Query `q = [0.6, 0.8, 0.0]` (already unit length). Compute the cosine similarity against each document, then give the top-2 ranking.

| doc | vector |
|-----|--------|
| A | `[0.8, 0.6, 0.0]` |
| B | `[0.0, 0.0, 1.0]` |
| C | `[-0.6, -0.8, 0.0]` |
| D | `[3.0, 4.0, 0.0]` |

**Q2. Euclidean vs cosine.** Repeat the chapter's Section 2 example with `a = [1.0, 2.0, 3.0]` and `b = [3.0, 6.0, 9.0]`. What are `np.linalg.norm(a - b)` and `cosine_similarity(a, b)`?

**Q3. Trace `argsort`.** In the batch-similarity code, suppose `similarities = np.array([0.42, 0.91, 0.13, 0.77])`. What are `np.argsort(similarities)`, `np.argsort(similarities)[::-1]`, and `top_k_indices` (first 3)?

**Q4. Threshold filtering.** Take the chapter's Section 3 `query` and four `documents`. (a) Fill in each score to 4 decimals. (b) Which documents does `top_k_with_threshold(query, documents, top_k=5, min_score=0.7)` return, in order? (The returned dicts carry `text`, not `id`; name them by id.) (c) What does it return with `min_score=0.9995`?

**Q5. Zero vector without a guard.** What does this print, and what does `safe_cosine_similarity` return for the same input?

```python
import numpy as np
z = np.array([0.0, 0.0, 0.0])
x = np.array([1.0, 0.0, 0.0])
print(np.dot(z, x) / (np.linalg.norm(z) * np.linalg.norm(x)))
```

### Coding Exercises

**E1 (Easy).** Write `normalize_rows(M) -> np.ndarray` that L2-normalizes every row of a 2-D array. All-zero rows should remain zero (no `nan`).

- `normalize_rows([[3, 4], [0, 0], [0, 5]])` → `[[0.6, 0.8], [0.0, 0.0], [0.0, 1.0]]`

**E2 (Easy–Medium).** Write `top_k(query, matrix, k) -> list[tuple[int, float]]` that returns `(row_index, score)` pairs sorted by descending cosine similarity, scores rounded to 4 decimals. Use one matrix–vector product (no Python loop over rows). Handle `k > len(matrix)` and a zero query (return `[]`).

- `top_k([0.9, 0.1, 0, 0, 0], <chapter's 4 doc vectors>, 2)` → `[(2, 0.9994), (0, 0.999)]`
- `top_k([1, 0], [[1, 0], [0, 1]], 5)` → `[(0, 1.0), (1, 0.0)]`

**E3 (Medium).** Duplicate chunks waste retrieval slots. Write `near_duplicates(matrix, threshold) -> list[tuple[int, int, float]]` that returns every pair `i < j` whose cosine similarity is `>= threshold`, using a single similarity matrix $S = \hat{M}\hat{M}^\top$ (rows normalized).

- `near_duplicates([[1, 0, 0], [2, 0, 0], [0, 1, 0], [0.9, 0.1, 0]], 0.99)` → `[(0, 1, 1.0), (0, 3, 0.9939), (1, 3, 0.9939)]`

#### Dry-Run: Answers

**Q1.** Since $\|q\| = 1$, each score is $\dfrac{q \cdot d}{\|d\|}$.

| doc | $q \cdot d$ | $\|d\|$ | cosine |
|-----|-------------|---------|--------|
| A | $0.48 + 0.48 = 0.96$ | 1 | **0.96** |
| B | $0$ | 1 | **0.0** (orthogonal) |
| C | $-0.36 - 0.64 = -1.0$ | 1 | **-1.0** (opposite) |
| D | $1.8 + 3.2 = 5.0$ | 5 | **1.0** (`D = 5·q`) |

Top-2 is **D (1.0), A (0.96)**. D is five times longer than A but still wins because only direction matters.

**Q2.** $a - b = [-2, -4, -6]$, so the Euclidean distance is $\sqrt{4 + 16 + 36} = \sqrt{56} \approx 7.4833$. Cosine is $\dfrac{3 + 12 + 27}{\sqrt{14}\cdot\sqrt{126}} = \dfrac{42}{42} = 1.0$, because `b = 3·a`. Euclidean calls them far apart, while cosine calls them identical in direction.

**Q3.** `argsort` lists indices from the smallest value to the largest. The values sorted ascending are 0.13 (idx 2), 0.42 (idx 0), 0.77 (idx 3), 0.91 (idx 1).

- `np.argsort(similarities)` → `[2, 0, 3, 1]`
- `[::-1]` → `[1, 3, 0, 2]`
- `top_k_indices` → `[1, 3, 0]`

**Q4.** (a) Here $\|q\| = \sqrt{0.82} \approx 0.9055$.

| doc | dot with query | cosine |
|-----|----------------|--------|
| doc1 | $0.765 + 0.012 = 0.777$ | **0.9990** |
| doc2 | $0.09 + 0.09 = 0.18$ | **0.2195** |
| doc3 | $0.792 + 0.008 = 0.800$ | **0.9994** |
| doc4 | $0$ | **0.0000** |

(b) Only scores `>= 0.7` survive, sorted descending: **`[doc3, doc1]`**. Only 2 results come back even though `top_k=5`, and that is the point of the threshold.

(c) `0.9990` and `0.9994` are both below `0.9995`, so the result is **`[]`**. The chapter's `documents` carry no `"metadata"` key; `top_k_with_threshold` reads it with `doc.get("metadata", {})`, so each result just gets an empty `metadata` dict. Indexing with `doc["metadata"]` instead would raise `KeyError: 'metadata'` on the first passing doc.

**Q5.** `norm(z) = 0`, so the expression is $0 / 0$. NumPy prints **`nan`**, along with a `RuntimeWarning: invalid value encountered`, and does not raise `ZeroDivisionError`. Any later comparison with `nan` is `False`, so the document silently drops out of rankings. `safe_cosine_similarity(z, x)` returns **`0.0`** because of its `norm_a == 0` guard.

**E1 — reference solution**

```python
import numpy as np

def normalize_rows(M) -> np.ndarray:
    M = np.asarray(M, dtype=np.float64)
    norms = np.linalg.norm(M, axis=1, keepdims=True)   # shape (n, 1)
    out = np.zeros_like(M)
    nonzero = norms[:, 0] > 0
    out[nonzero] = M[nonzero] / norms[nonzero]
    return out

print(normalize_rows([[3, 4], [0, 0], [0, 5]]))
# [[0.6 0.8]
#  [0.  0. ]
#  [0.  1. ]]
```

$O(nd)$. Masking the zero rows avoids $0/0$.

**E2 — reference solution**

```python
def top_k(query, matrix, k) -> list[tuple[int, float]]:
    Mn = normalize_rows(matrix)
    q = np.asarray(query, dtype=np.float64)
    qn = np.linalg.norm(q)
    if qn == 0:
        return []
    scores = Mn @ (q / qn)                          # all cosines in one product
    order = np.argsort(-scores, kind="stable")[:k]  # slicing handles k > n
    return [(int(i), round(float(scores[i]), 4)) for i in order]

docs = [[0.85, 0.12, 0.03, 0.0, 0.0], [0.1, 0.9, 0.0, 0.0, 0.0],
        [0.88, 0.08, 0.02, 0.01, 0.01], [0.0, 0.0, 0.0, 0.95, 0.05]]
print(top_k([0.9, 0.1, 0, 0, 0], docs, 2))    # [(2, 0.9994), (0, 0.999)]
print(top_k([1, 0], [[1, 0], [0, 1]], 5))       # [(0, 1.0), (1, 0.0)]
```

$O(nd + n\log n)$. Sorting `-scores` gives descending order without the `[::-1]` step.

**E3 — reference solution**

```python
def near_duplicates(matrix, threshold) -> list[tuple[int, int, float]]:
    Mn = normalize_rows(matrix)
    S = Mn @ Mn.T                                   # S[i, j] = cosine(i, j)
    n = len(Mn)
    return [(i, j, round(float(S[i, j]), 4))
            for i in range(n) for j in range(i + 1, n)
            if S[i, j] >= threshold]

print(near_duplicates([[1, 0, 0], [2, 0, 0], [0, 1, 0], [0.9, 0.1, 0]], 0.99))
# [(0, 1, 1.0), (0, 3, 0.9939), (1, 3, 0.9939)]
```

Building $S$ is $O(n^2 d)$, with $O(n^2)$ memory. Rows 0 and 1 are parallel. Row 3 has cosine $0.9/\sqrt{0.82} \approx 0.9939$ with both of them.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Cosine Similarity**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 cosine similarity**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

