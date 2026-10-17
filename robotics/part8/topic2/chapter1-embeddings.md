# Part 8, Topic 1: Vector Search & Embeddings
## Chapter 1: Embeddings

**Prerequisite Knowledge:** Basic understanding of API calls and lists in Python.

### The 'Flavor Profile' Analogy
Imagine trying to describe the taste of an apple to someone who has never eaten one. You might say it's 80% sweet, 10% sour, 50% crunchy, and 0% spicy. Now, what about a pear? It's maybe 75% sweet, 5% sour, 30% crunchy, and 0% spicy. If you wrote those percentages down in a list for both fruits, the numbers would look very similar, because the fruits taste similar! 

Embeddings work exactly like this, but for text instead of taste. An AI reads a sentence and creates a "flavor profile" made of hundreds of numbers (a vector). Texts with similar meanings will have similar lists of numbers. This allows the computer to mathematically calculate how related two sentences are, without caring if they use the exact same words.

Embeddings convert text into dense floating-point arrays that capture semantic meaning. Instead of matching exact words, embeddings let you find text that is conceptually similar. This is the foundation of every vector search system in modern AI.

### What an Embedding Looks Like

```
Text Input: "The pump is overheating"
                    |
                    v
        +---------------------+
        |  Embedding Model    |
        |  text-embedding-3   |
        +---------------------+
                    |
                    v
    [-0.0023, 0.0187, -0.0214, 0.0045, -0.0132, ..., 0.0089]
     <------------------ 1536 numbers ------------------>
                    |
                    v
         Vector in 1536-dimensional space
```

Each number represents a "feature" the model learned. You cannot interpret any single dimension (dimension 47 = "industrial equipment" is not how it works). What matters is the overall pattern: similar texts produce similar patterns of numbers.

---

### 1. What Are Embeddings?

An embedding is a list of floats (a vector) where each number represents some learned feature of the text. The OpenAI model `text-embedding-3-small` produces 1536-dimensional vectors. Two pieces of text about the same topic will have vectors that are close together in this 1536-dimensional space, even if they share no common words.

```python
import openai

client = openai.OpenAI()

# Call the API to get the embedding
response = client.embeddings.create(
    input="How do I reset the PLC fault code?",
    model="text-embedding-3-small"
)

# Extract the list of numbers from the response
embedding = response.data[0].embedding

print(type(embedding))  # <class 'list'>
print(len(embedding))   # 1536
print(embedding[:5])    # [-0.0023, 0.0187, -0.0214, 0.0045, -0.0132]
```

**What's happening:**
```python
response = client.embeddings.create(
    input="How do I reset the PLC fault code?",
#   ^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#   |      |
#   |      └── The text to convert into numbers
#   └── Parameter name: what text to embed
    model="text-embedding-3-small"
#   ^^^^^  ^^^^^^^^^^^^^^^^^^^^^
#   |      |
#   |      └── Which AI model to use (determines vector size)
#   └── Parameter name: which model

embedding = response.data[0].embedding
#          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#          |
#          ├── response.data → list of embedding results
#          ├── [0] → first (and only, since we sent one text) result
#          └── .embedding → the actual list of 1536 floats
```

The raw list of floats is not human-readable. You cannot tell what a dimension "means" on its own. What matters is the relationship between vectors — two similar texts produce vectors that point in nearly the same direction.

### Embedding Comparison Table

| Text | Expected Similarity to "pump overheating" |
|------|-------------------------------------------|
| "The pump temperature is too high" | High (~0.85) |
| "Pump seal replacement procedure" | Medium (~0.60) |
| "Compressor vibration analysis" | Low (~0.35) |
| "The weather is sunny today" | Very low (~0.15) |
| "How to reset the PLC fault code" | Low (~0.25) |

---

### 2. Why Dimensionality Matters

Each dimension is a learned feature. More dimensions generally capture more nuance but cost more storage and compute. The `text-embedding-3-small` model defaults to 1536 dimensions, but you can request fewer using the `dimensions` parameter:

```python
# Request a smaller embedding (fewer numbers) to save space
short_response = client.embeddings.create(
    input="Motor vibration threshold exceeded",
    model="text-embedding-3-small",
    dimensions=256
)

short_embedding = short_response.data[0].embedding
print(len(short_embedding))  # 256
```

**What's happening:**
```python
short_response = client.embeddings.create(
    input="Motor vibration threshold exceeded",
#   ^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#   |      └── Text to embed
#   └── Same parameter as before
    model="text-embedding-3-small",
    dimensions=256
#   ^^^^^^^^^  ^^^
#   |          |
#   |          └── Request only 256 numbers instead of 1536
#   └── New parameter: controls output size
```

### Dimension Tradeoffs

```
Dimension Count    Storage/Vector    Search Speed    Accuracy
     128           ~0.5 KB          Fastest         Lowest
     256           ~1.0 KB          Fast            Good for most cases
     512           ~2.0 KB          Medium          Better accuracy
    1024           ~4.0 KB          Slower          Near-full accuracy
    1536           ~6.0 KB          Slowest         Full accuracy (default)
```

Reducing dimensions trades some accuracy for speed and storage savings. For most industrial use cases, 256 to 512 dimensions is sufficient for retrieving relevant documents. Always test retrieval quality after reducing dimensions before deploying to production.

### Common Mistake: Wrong Dimension Count

```python
# WRONG: Creating with 256 dimensions, then searching with 1536
short = client.embeddings.create(
    input="test",
    model="text-embedding-3-small",
    dimensions=256
)

# Later, comparing with a full-size vector
full = client.embeddings.create(input="other test", model="text-embedding-3-small")
# full has 1536 dimensions, short has 256

# This will CRASH: matrices must have compatible dimensions
# np.dot(short_vec, full_vec) → ValueError: shapes (256,) and (1536,) not aligned
```

**Fix:** Always ensure all vectors in a comparison use the same dimensions. Pick one dimension count and stick with it for your entire pipeline.

---

### 3. Batch Embedding

Calling the API once per text is slow and expensive. The embedding API accepts a list of inputs so you can embed many texts in a single call:

```python
# Create a list of texts
texts = [
    "Pump A1 requires quarterly seal replacement",
    "Compressor B3 vibration sensor reading is nominal",
    "The heat exchanger fouling rate exceeds acceptable limits",
    "Schedule turbine inspection for Q3 maintenance window"
]

# Send the whole list to the API at once
response = client.embeddings.create(
    input=texts,
    model="text-embedding-3-small"
)

# Extract the embedding list for each text in the response
embeddings = []
for item in response.data:
    embeddings.append(item.embedding)
    
print(f"Embedded {len(embeddings)} texts, each has {len(embeddings[0])} dimensions")
```

**What's happening:**
```python
response = client.embeddings.create(
    input=texts,
#   ^^^^^  ^^^^^
#   |      └── List of 4 strings → 4 embeddings returned
#   └── Can accept string OR list of strings
    model="text-embedding-3-small"
)

for item in response.data:
#     ^^^^  ^^^^^^^^^^^^^^^^^^
#     |      |
#     |      └── response.data contains one result per input text
#     └── Each item has .embedding (the vector)
```

### Batch Size Limits

```
API Limit:        2048 inputs per call
Recommended:      200-500 inputs per batch
Reason:           Rate limits + memory + error recovery
```

The API supports up to 2048 inputs per call. For larger collections, batch your texts into chunks of 200-500 to stay well under the limit and handle rate limits gracefully.

### Production Batch Pattern with Error Handling

```python
import time

def batch_embed(texts, model="text-embedding-3-small", batch_size=200):
    all_embeddings = []
    failed_batches = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        try:
            response = client.embeddings.create(
                input=batch,
                model=model
            )
            # response.data is ordered same as input batch
            for item in response.data:
                all_embeddings.append(item.embedding)
                
        except Exception as e:
            print(f"Batch {i} failed: {e}")
            failed_batches.append((i, batch))
            # Append None placeholders so indices stay aligned
            all_embeddings.extend([None] * len(batch))
        
        # Respect rate limits: small pause between batches
        time.sleep(0.5)
    
    return all_embeddings, failed_batches

texts = ["Pump maintenance step 1"] * 600  # 600 items = 3 batches
embeddings, failures = batch_embed(texts)
print(f"Embedded: {len(embeddings)}, Failed batches: {len(failures)}")
```

---

### 4. Caching Embeddings

Embedding the same text twice is wasteful. Build a simple cache using a dictionary keyed by text content:

```python
import hashlib

# A simple dictionary to store our embeddings
embedding_cache = {}

def get_embedding(text, model="text-embedding-3-small"):
    # 1. Create a unique fingerprint (hash) for the text
    encoded_text = text.encode()
    cache_key = hashlib.sha256(encoded_key).hexdigest()
    
    # 2. Check if we already have this text in our cache
    if cache_key in embedding_cache:
        return embedding_cache[cache_key]
        
    # 3. If not, call the API
    response = client.embeddings.create(input=[text], model=model)
    embedding = response.data[0].embedding
    
    # 4. Save the result in the cache for next time
    embedding_cache[cache_key] = embedding
    return embedding

text = "Replace conveyor belt rollers every 5000 hours"
vec1 = get_embedding(text)
vec2 = get_embedding(text)  # cache hit, no API call

print(vec1 == vec2)  # True
```

**What's happening:**
```python
encoded_text = text.encode()
#              ^^^^  ^^^^^^^^
#              |     |
#              |     └── Convert string to bytes (required for hashing)
#              └── The raw text

cache_key = hashlib.sha256(encoded_text).hexdigest()
#         ^^^^^^  ^^^^  ^^^^^^^^^^^^^^  ^^^^^^^^^^^
#         |       |     |               |
#         |       |     |               └── Convert hash to readable hex string
#         |       |     └── The bytes to hash
#         |       └── SHA-256 algorithm (produces unique fingerprint)
#         └── Hash library

if cache_key in embedding_cache:
#   ^^^^^^^^  ^ ^^^^^^^^^^^^^^^^^^
#   |         | |
#   |         | └── Our in-memory dictionary
#   |         └── Check if key exists
#   └── Unique fingerprint for this text
```

### Why Hash Instead of Raw Text as Key?

```python
# Raw text as key has problems:
cache["Pump maintenance"] = embedding
cache["Pump maintenance "] = embedding  # trailing space = different key!
cache["pump maintenance"] = embedding   # different case = different key!

# Hash is normalized:
text1 = "Pump maintenance"
text2 = " pump maintenance "
hash1 = hashlib.sha256(text1.encode()).hexdigest()
hash2 = hashlib.sha256(text2.encode()).hexdigest()
# hash1 != hash2  (still not normalized - see below for better approach)
```

For production, normalize text before hashing (strip whitespace, lowercase consistently):

```python
def normalize_and_hash(text):
    normalized = text.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()
```

### Persistent Cache with JSON File

```python
import json
import os

CACHE_FILE = "embedding_cache.json"

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)

def get_embedding_persistent(text, model="text-embedding-3-small"):
    cache = load_cache()
    cache_key = hashlib.sha256(text.strip().lower().encode()).hexdigest()
    
    if cache_key in cache:
        return cache[cache_key]
    
    response = client.embeddings.create(input=[text], model=model)
    embedding = response.data[0].embedding
    
    cache[cache_key] = embedding
    save_cache(cache)  # Write to disk after each new embedding
    return embedding
```

For production systems, persist the cache to a file or database so it survives restarts. The hash-based key ensures that identical texts always hit the cache regardless of whitespace or encoding differences.

---

### 5. Inspecting Vectors

You can perform basic sanity checks on embeddings to verify they are working correctly. Similar texts should produce similar vectors, and different texts should produce different vectors:

```python
import numpy as np

def cosine_sim(a, b):
    # Convert lists to numpy arrays
    a = np.array(a)
    b = np.array(b)
    
    # Calculate similarity math
    dot_product = np.dot(a, b)
    magnitude_product = np.linalg.norm(a) * np.linalg.norm(b)
    return dot_product / magnitude_product

# Get embeddings for different phrases
v1 = get_embedding("The pump is overheating")
v2 = get_embedding("The pump temperature is too high")
v3 = get_embedding("The weather is sunny today")

# Compare them
print(cosine_sim(v1, v2))  # ~0.85 (high similarity, because meanings match)
print(cosine_sim(v1, v3))  # ~0.20 (low similarity, because meanings differ)
```

**What's happening:**
```python
dot_product = np.dot(a, b)
#            ^^^^  ^  ^
#            |     |  └── Second vector
#            |     └── First vector
#            └── NumPy dot product: sums element-wise multiplication
#                (a[0]*b[0] + a[1]*b[1] + ... + a[1535]*b[1535])

magnitude_product = np.linalg.norm(a) * np.linalg.norm(b)
#                  ^^^^  ^^^^^^^^^^   ^   ^^^^^^^^^^
#                  |     |            |   |
#                  |     |            |   └── Length of second vector
#                  |     |            └── Multiplication
#                  |     └── L2 norm: sqrt(a[0]^2 + a[1]^2 + ...)
#                  └── NumPy linear algebra module

return dot_product / magnitude_product
#     ^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^
#     |              |
#     |              └── Product of both lengths
#     └── How much vectors align
#         Result: -1.0 (opposite) to 1.0 (identical)
```

### Reading Similarity Scores

```
Score Range     Meaning                    Example
0.80 - 1.00     Nearly identical topics    "pump overheating" vs "pump temperature high"
0.60 - 0.79     Related topics             "pump maintenance" vs "pump seal replacement"
0.40 - 0.59     Somewhat related           "pump vibration" vs "compressor vibration"
0.20 - 0.39     Loosely related            "pump failure" vs "electrical fault"
0.00 - 0.19     Unrelated topics           "pump maintenance" vs "vacation policy"
-1.00 - 0.00    Opposite meanings          (rare in practice)
```

If you see unexpected results — unrelated texts scoring above 0.7, or closely related texts scoring below 0.5 — something is wrong with your input or model selection. These checks are essential debugging tools.

### Common Mistake: Mixing Up Lists and Arrays

```python
# WRONG: Comparing raw lists
list1 = [0.1, 0.2, 0.3]
list2 = [0.1, 0.2, 0.3]
# print(list1 == list2)  # True, but this checks equality, not similarity!
# print(list1 * list2)   # TypeError: can't multiply sequences

# RIGHT: Convert to numpy arrays first
import numpy as np
arr1 = np.array(list1)
arr2 = np.array(list2)
similarity = np.dot(arr1, arr2) / (np.linalg.norm(arr1) * np.linalg.norm(arr2))
```

### Quick Diagnostic Function

```python
def embedding_diagnostics(text1, text2):
    """Quick check if two texts produce sensible embeddings."""
    v1 = get_embedding(text1)
    v2 = get_embedding(text2)
    
    sim = cosine_sim(v1, v2)
    mag1 = np.linalg.norm(np.array(v1))
    mag2 = np.linalg.norm(np.array(v2))
    
    print(f"Text 1: {text1[:50]}...")
    print(f"Text 2: {text2[:50]}...")
    print(f"Similarity:  {sim:.4f}")
    print(f"Vector magnitude 1: {mag1:.4f}")
    print(f"Vector magnitude 2: {mag2:.4f}")
    print(f"Dimensions: {len(v1)} vs {len(v2)}")
    print()
    
    if len(v1) != len(v2):
        print("ERROR: Dimension mismatch!")
    elif sim > 0.7:
        print("GOOD: Texts are semantically similar (as expected)")
    elif sim < 0.3:
        print("GOOD: Texts are semantically different (as expected)")
    else:
        print("WARNING: Similarity is moderate - verify this is expected")

embedding_diagnostics(
    "The pump is overheating",
    "The pump temperature is too high"
)
```

---

### Summary

| Concept | Key Point |
|---------|-----------|
| What is an embedding? | A list of floats capturing text meaning |
| Default model | `text-embedding-3-small` produces 1536 dimensions |
| Dimensions | Reduce to 256-512 to save storage; test accuracy first |
| Batch embedding | Send 200-500 texts per API call |
| Caching | Hash text content, store vectors, skip repeat API calls |
| Sanity check | Similar texts should score >0.70, different texts <0.30 |

Embeddings turn text into numerical vectors that capture meaning, enabling semantic search beyond keyword matching. Use batch embedding for efficiency, cache results to avoid redundant API calls, and always validate that your embeddings produce sensible similarity scores before building downstream systems. The quality of your embeddings directly determines the quality of your retrieval pipeline.

---

### Quick Reference

| Operation | Code | Notes |
|-----------|------|-------|
| Single embedding | `client.embeddings.create(input="text", model="text-embedding-3-small")` | Returns one vector |
| Batch embedding | `client.embeddings.create(input=["a","b","c"], model="text-embedding-3-small")` | Up to 2048 inputs |
| Reduce dimensions | Add `dimensions=256` parameter | Trade accuracy for speed |
| Cosine similarity | `np.dot(a,b) / (np.linalg.norm(a) * np.linalg.norm(b))` | Range: -1 to 1 |
| Hash for cache | `hashlib.sha256(text.encode()).hexdigest()` | Unique fingerprint per text |
| Check vector length | `len(embedding)` | Should be 1536 (default) or your chosen dimension |
| Inspect first few values | `embedding[:5]` | Sanity check: should be floats between -1 and 1 |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Embeddings**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 embeddings**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

