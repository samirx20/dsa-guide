# Part 4, Topic 1: Vector Search & Embeddings
## Chapter 3: Chunking Strategies

**Prerequisite Knowledge:** Basic understanding of strings, lists, and loops in Python.

### The 'Encyclopedia' Analogy
Imagine handing someone an entire 30-volume encyclopedia set and asking, "What does it say about black holes?" It would be overwhelming and difficult to process. Instead, you would open a specific volume, go to a specific page, and read a specific paragraph. Chunking is exactly like this. Instead of feeding an AI an entire 50-page manual at once (which exceeds its "reading memory"), you slice the manual into smaller, focused "paragraphs" or "chunks." Each chunk gets its own label (embedding), so the AI can quickly find the exact paragraph that answers the question, rather than trying to digest the whole book at once.

Embedding models have a maximum input length, and even if they did not, embedding an entire manual produces a single vector that cannot be searched for specific sections. Chunking splits documents into smaller pieces so each piece gets its own embedding and can be independently retrieved.

```
   What happens WITHOUT chunking:

   ┌─────────────────────────────────────────────┐
   │          ENTIRE MANUAL (45,000 chars)        │
   │                                              │
   │  "Pump seal replacement...Motor alignment... │
   │   Turbine overhaul...Safety procedures...    │
   │   Vibration analysis...Oil change intervals" │
   │                                              │
   │  → ONE embedding vector                      │
   │  → Averages ALL topics together              │
   │  → Can't search for specific sections        │
   └─────────────────────────────────────────────┘

   What happens WITH chunking:

   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Chunk 0      │ │ Chunk 1      │ │ Chunk 2      │
   │ "Pump seal   │ │ "Motor       │ │ "Turbine     │
   │  replacement"│ │  alignment"  │ │  overhaul"   │
   │              │ │              │ │              │
   │ → Vector A   │ │ → Vector B   │ │ → Vector C   │
   └──────────────┘ └──────────────┘ └──────────────┘
        ↕                 ↕                 ↕
   Each chunk searched independently
```

### 1. Why Chunking Is Necessary

An equipment manual might be 50 pages long. The `text-embedding-3-small` model accepts up to 8191 tokens — roughly 30,000 characters. Beyond that, text is silently truncated, losing critical information. Even within the limit, embedding an entire document produces one vector that averages out all topics, making it useless for searching specific procedures:

```python
manual = open("pump_manual.txt").read()
print(len(manual))  # 45000 characters

token_estimate = len(manual) // 4
print(f"Approx tokens: {token_estimate}")  # ~11250 tokens (over limit)

short_manual = manual[:30000]  # Silently truncated!
```

**What's happening:**
```python
manual = open("pump_manual.txt").read()
# Reads entire file into one string: 45,000 chars ≈ 11,250 tokens
# Embedding model limit is 8,191 tokens → text is silently truncated
# manual[:30000] drops everything after char 30,000
# If the seal replacement procedure is on page 40, it's GONE
#
# Even if it fits, ONE vector for 45,000 chars means:
# "pump seal" + "turbine overhaul" + "safety policy"
# → averaged into a single direction that matches NONE of them well
```

Chunking solves both problems: each chunk stays within token limits, and each chunk represents a focused topic that produces a semantically meaningful vector.

### Token Limits by Model

| Model | Max Tokens | Approx Characters | Recommended Chunk Size |
|-------|-----------|-------------------|----------------------|
| `text-embedding-3-small` | 8,191 | ~32,000 | 800-1,500 chars |
| `text-embedding-3-large` | 8,191 | ~32,000 | 800-1,500 chars |
| `text-embedding-ada-002` | 8,191 | ~32,000 | 800-1,500 chars |
| `voyage-2` | 32,000 | ~128,000 | 1,000-2,000 chars |

### 2. Fixed-Size Chunking

The simplest approach splits text every N characters with optional overlap:

```python
def fixed_size_chunks(text, chunk_size=1000, overlap=200):
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        current_chunk = text[start:end]
        chunks.append(current_chunk)
        start = end - overlap
        
    return chunks

text = "A" * 3000 + "B" * 3000 + "C" * 3000
chunks = fixed_size_chunks(text, chunk_size=2000, overlap=500)

print(f"Created {len(chunks)} chunks")
for i, c in enumerate(chunks):
    print(f"Chunk {i}: starts with '{c[0]}' length {len(c)}")
```

**What's happening:**
```python
text = "A" * 3000 + "B" * 3000 + "C" * 3000
#       0-2999    3000-5999   6000-8999
# chunk_size=2000, overlap=500, step=1500
#
# Chunk 0: text[0:2000]    → "AAA...AABBB..." (mixed A and B)
# Chunk 1: text[1500:3500] → "BBB...BBBCC..." (mixed B and C)
# Chunk 2: text[3000:5000] → "BBB...BBBCC..." (mixed B and C)
# Chunk 3: text[4500:6500] → "BBB...BBBCC..." (mixed B and C)
# Chunk 4: text[6000:8000] → "CCC...CCC"      (pure C)
# Chunk 5: text[7500:9000] → "CCC...CCC"      (pure C, shorter)
#
# Overlap: text[1500:2000] appears in both Chunk 0 and Chunk 1
# This means boundary context is preserved across chunks
```

Fixed-size chunking is fast and predictable. The problem is that it splits mid-sentence, breaking context.

### Common Mistake: Splitting Mid-Word

```python
text = "Before installing the pump, verify alignment with the motor coupling."

# BAD: Fixed-size split at exactly 30 characters
chunk_a = text[:30]  # "Before installing the pump,"
chunk_b = text[30:]  # ", verify alignment with the motor coupling."
# Problem: "pump," ends chunk A, but the sentence continues
# The embedding for chunk A loses context of what comes after

# BETTER: Split at word boundaries
def word_boundary_chunks(text, max_chars=30):
    words = text.split()
    chunks, current, current_len = [], [], 0
    
    for word in words:
        if current_len + len(word) + 1 > max_chars and current:
            chunks.append(" ".join(current))
            current, current_len = [word], len(word)
        else:
            current.append(word)
            current_len += len(word) + 1
    
    if current:
        chunks.append(" ".join(current))
    return chunks

# Result: splits happen at word boundaries, never mid-word
```

### 3. Sentence-Based Chunking

Sentence-based chunking respects sentence boundaries. Split on sentence delimiters, then group sentences until you reach the target size:

```python
import re

def sentence_chunks(text, max_chunk_size=1000):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = []
    current_size = 0

    for sentence in sentences:
        sentence_size = len(sentence)
        
        if current_size + sentence_size > max_chunk_size and current_chunk:
            joined_chunk = " ".join(current_chunk)
            chunks.append(joined_chunk)
            current_chunk = [sentence]
            current_size = sentence_size
        else:
            current_chunk.append(sentence)
            current_size += sentence_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

text = "The pump operates at 1500 RPM. Temperature should stay below 80C. If vibration exceeds 5mm/s, shut down immediately. Check alignment quarterly. Replace seals every 5000 hours. Document all maintenance in the logbook."

result = sentence_chunks(text, max_chunk_size=80)
for i, c in enumerate(result):
    print(f"Chunk {i}: {c}")
```

**What's happening:**
```python
# re.split(r'(?<=[.!?])\s+', text)
# (?<=...) is a lookbehind — split AFTER . ! or ?
# \s+ means one or more whitespace characters
#
# Result: ["The pump operates at 1500 RPM.", "Temperature should stay below 80C.", ...]
# Each sentence is a complete thought
#
# max_chunk_size=80 characters
# Sentence 1: "The pump operates at 1500 RPM." = 31 chars → fits
# Sentence 2: "Temperature should stay below 80C." = 35 chars → 31+35=66 → fits
# Sentence 3: "If vibration exceeds 5mm/s, shut down immediately." = 51 chars → 66+51=117 → OVER
# Save chunk 0: "The pump operates at 1500 RPM. Temperature should stay below 80C."
# Start new chunk with sentence 3
```

This produces cleaner chunks that preserve complete thoughts. The tradeoff is variable chunk sizes.

### Edge Case: Abbreviations Breaking Sentence Detection

```python
import re

text = "Pump P-101 was installed on Jan. 15, 2024. Check alignment quarterly."

# BAD: Simple split on ". " — splits on "Jan." thinking it's sentence end
bad_split = re.split(r'(?<=[.!?])\s+', text)
# ['Pump P-101 was installed on Jan.', '15, 2024.', 'Check alignment quarterly.']
# WRONG: "Jan." was treated as sentence end

# BETTER: Split on sentence-ending punctuation followed by space + uppercase
def robust_sentence_split(text):
    return re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)

result = robust_sentence_split(text)
# ['Pump P-101 was installed on Jan. 15, 2024.', 'Check alignment quarterly.']
# CORRECT: Only splits at actual sentence boundaries
```

### 4. Recursive Character Splitting

Recursive splitting tries multiple delimiters in order of priority (paragraphs, sentences, words, characters), splitting at the highest-priority boundary that keeps chunks under the size limit:

```python
def recursive_split(text, chunk_size=1000, overlap=200, delimiters=None):
    if delimiters is None:
        delimiters = ["\n\n", "\n", ". ", " "]

    if len(text) <= chunk_size:
        return [text]

    for delimiter in delimiters:
        if delimiter in text:
            parts = text.split(delimiter)
            chunks = []
            current = ""

            for part in parts:
                candidate = current + delimiter + part if current else part
                
                if len(candidate) <= chunk_size:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    current = part

            if current:
                chunks.append(current)

            if all(len(c) <= chunk_size * 1.5 for c in chunks):
                return chunks

    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size - overlap)]

manual = """## Installation\n\nStep 1: Mount the pump base plate.\nEnsure all four bolts are torqued to 50 Nm.\n\nStep 2: Connect the motor.\nAlign the coupling within 0.05mm.\n\n## Operation\n\nStart the pump at reduced speed.\nGradually increase to nominal RPM over 30 minutes.\nMonitor vibration and temperature."""

chunks = recursive_split(manual, chunk_size=150)
for i, c in enumerate(chunks):
    print(f"--- Chunk {i} ---\n{c}\n")
```

**What's happening:**
```python
# Recursive splitting strategy — priority order:
# 1. "\n\n" (paragraph breaks) — highest priority, best context
# 2. "\n"  (single newlines)   — good for structured text
# 3. ". "  (sentence ends)     — preserves complete thoughts
# 4. " "   (word boundaries)   — last resort before chars
#
# For each delimiter:
#   Split text → try to combine parts under chunk_size
#   If all resulting chunks fit → use this split
#   If not → try the next delimiter (finer granularity)
#
# chunk_size=150, overlap=200
# The overlap > chunk_size so the fallback character split kicks in
# In production, set overlap < chunk_size (e.g., overlap=50 for chunk_size=150)
```

Recursive splitting produces the most natural chunks because it respects document structure. It tries to keep paragraphs together, falls back to sentences, and only splits words as a last resort.

### Production: Recursive Splitter with Proper Overlap

```python
def production_recursive_split(text, chunk_size=1000, overlap=200):
    if overlap >= chunk_size:
        raise ValueError(f"overlap ({overlap}) must be less than chunk_size ({chunk_size})")
    
    delimiters = ["\n\n", "\n", ". ", "! ", "? ", " "]
    
    if len(text) <= chunk_size:
        return [text]
    
    for delimiter in delimiters:
        if delimiter in text:
            parts = text.split(delimiter)
            chunks = []
            current = ""
            
            for part in parts:
                candidate = current + delimiter + part if current else part
                if len(candidate) <= chunk_size:
                    current = candidate
                else:
                    if current:
                        chunks.append(current.strip())
                    current = part
            
            if current:
                chunks.append(current.strip())
            
            if all(len(c) <= chunk_size for c in chunks):
                if overlap > 0 and len(chunks) > 1:
                    overlapped = [chunks[0]]
                    for i in range(1, len(chunks)):
                        prev_tail = chunks[i-1][-overlap:]
                        overlapped.append(prev_tail + " " + chunks[i])
                    return overlapped
                return chunks
    
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks
```

### 5. Overlap Between Chunks

Overlap ensures context at chunk boundaries is not lost. Without overlap, the last sentence of chunk N and the first sentence of chunk N+1 are separated across different embeddings:

```python
def overlap_demo():
    text = "Step 1: Install the base plate. Step 2: Attach the motor. Step 3: Connect wiring. Step 4: Test the system."
    
    chunk_a = text[:45]
    chunk_b = text[35:80]
    
    print(f"Chunk A ends: ...{chunk_a[-20:]}")
    print(f"Chunk B starts: {chunk_b[:20]}...")
    
    overlap_text = text[35:45]
    print(f"Overlap region: '{overlap_text}'")

overlap_demo()
```

**What's happening:**
```python
# text = "Step 1: Install the base plate. Step 2: Attach the motor. ..."
#        0    5   10   15   20   25   30   35   40   45   50   55
#
# chunk_a = text[:45]
# "Step 1: Install the base plate. Step 2: Attach"
#                                            ^^^^
#                                            Ends mid-sentence
#
# chunk_b = text[35:80]
# "Step 2: Attach the motor. Step 3: Connect wiring. ..."
#  ^^^^^
#  Starts at char 35, overlapping with chunk_a
#
# Overlap region: text[35:45] = "e plate. S"
# This text appears in BOTH chunks
# The embedding for "Step 2: Attach" now has context from both sides
```

A common rule of thumb is 10-20% overlap relative to chunk size. Too much overlap wastes storage and causes duplicate retrieval results; too little loses boundary context.

### Overlap Tradeoff Table

| Overlap % | Storage Cost | Context Quality | Duplicate Risk | Best For |
|-----------|-------------|-----------------|----------------|----------|
| 0% | Lowest | Poor at boundaries | None | Simple keyword search |
| 10% | Low | Good | Low | General RAG |
| 20% | Medium | Very good | Medium | Technical manuals |
| 30% | High | Excellent | High | Legal/medical docs |
| 50%+ | Very high | Overkill | Very high | Avoid (wasted tokens) |

### 6. Attaching Metadata to Chunks

Each chunk should carry metadata that identifies its source, position, and any relevant attributes:

```python
def chunk_with_metadata(text, source_file, chunk_size=1000, overlap=200):
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size
        chunk_text = text[start:end]
        
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "source": source_file,
                "chunk_index": chunk_index,
                "start_char": start,
                "end_char": min(end, len(text)),
                "char_count": len(chunk_text),
            }
        })
        
        start = end - overlap
        chunk_index += 1

    return chunks

manual_text = "Pump maintenance guide content here. " * 50
chunks = chunk_with_metadata(manual_text, "pump_manual.pdf")
print(chunks[0]["metadata"])
```

**What's happening:**
```python
# Each chunk gets a metadata dictionary:
# {
#     "source": "pump_manual.pdf",    ← Which file this came from
#     "chunk_index": 0,               ← Position in the document (0-based)
#     "start_char": 0,                ← Character offset where chunk starts
#     "end_char": 1000,               ← Character offset where chunk ends
#     "char_count": 1000              ← Length of the chunk text
# }
#
# Why metadata matters:
# 1. Source attribution: "According to pump_manual.pdf, page 12..."
# 2. Filtering: "Show me only chunks from P101 pump manual"
# 3. Deduplication: Same text in two files → keep only one
# 4. Debugging: When retrieval fails, trace back to the source
# 5. UI display: Show the user which document the answer came from
```

Metadata enables filtering and attribution. When a user asks "what does the pump manual say about seal replacement," you can filter chunks by source and provide a citation back to the original document.

### 7. Chunking Strategy Comparison

| Strategy | Speed | Context Quality | Predictability | Best For |
|----------|-------|----------------|----------------|----------|
| Fixed-size | Fastest | Low (splits mid-sentence) | High (exact sizes) | Quick prototypes |
| Sentence-based | Medium | High (complete thoughts) | Medium (variable sizes) | General text |
| Recursive | Medium | Highest (respects structure) | Medium | Technical docs |

### Common Mistake: Wrong Chunk Size

```python
# TOO SMALL (100 chars): Loses context
# Chunk: "Replace the seal every"
# Problem: Which seal? Every what? Missing critical context.

# TOO LARGE (5000 chars): Averages out topics  
# Chunk: "Pump maintenance: Seal replacement...Motor alignment...
#          Oil change intervals...Vibration analysis...Safety procedures..."
# Problem: One vector for 5 topics = matches none well

# JUST RIGHT (800-1500 chars): Focused but complete
# Chunk: "Replace the mechanical seal every 5000 hours or at the first
#          sign of leakage. Use the manufacturer-specified seal kit (Part
#          No. MS-201). Torque bolts to 25 Nm in a star pattern."
# Problem: None — this is a complete, focused procedure
```

### Quick Reference

| Strategy | Function | Overlap | Metadata |
|----------|----------|---------|----------|
| Fixed-size | `text[start:start+size]` | `start += size - overlap` | Source, index, offsets |
| Sentence | `re.split(r'(?<=[.!?])\s+')` | Group sentences until limit | Source, index, sentence count |
| Recursive | Try `\n\n` → `\n` → `. ` → ` ` | Prepend tail of previous chunk | Source, section, index |
| Production | Clean + Split + Overlap + Validate | 10-20% of chunk size | Source, section, word count, flags |

### Summary

Chunking strategy directly impacts retrieval quality. Fixed-size is simple but crude; sentence-based preserves meaning; recursive splitting respects document structure. Always include overlap to prevent boundary context loss, and attach metadata for source attribution. The recursive character splitter is the best general-purpose starting point for most industrial documents.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Count the chunks.** `fixed_size_chunks("x" * 2500, chunk_size=1000, overlap=200)`: how many chunks are produced, and what is the length of each?

**Q2. Fill in the true composition.** For the chapter's own example (`"A"*3000 + "B"*3000 + "C"*3000`, `chunk_size=2000`, `overlap=500`), fill in the table by counting characters. Compare your answer with the comments in the "What's happening" block for Section 2.

| chunk | slice | #A | #B | #C | length |
|-------|-------|----|----|----|--------|
| 0 | `[0:2000]` | ? | ? | ? | ? |
| 1 | `[1500:3500]` | ? | ? | ? | ? |
| 2 | `[3000:5000]` | ? | ? | ? | ? |
| 3 | `[4500:6500]` | ? | ? | ? | ? |
| 4 | `[6000:8000]` | ? | ? | ? | ? |
| 5 | `[7500:9000]` | ? | ? | ? | ? |

**Q3. Finish the sentence-chunk trace.** The chapter traces `sentence_chunks(text, max_chunk_size=80)` only up to the first chunk. The six sentence lengths are `[30, 34, 50, 26, 31, 40]`. (`current_size` sums sentence lengths only and ignores the joining spaces.) How many chunks are produced, and which sentences go in each?

**Q4. Overlap = chunk size.** What happens when you call `fixed_size_chunks(text, chunk_size=100, overlap=100)` on any non-empty `text`? Which line of the function causes it, and which function in the chapter defends against it?

**Q5. Abbreviations again.** What does the chapter's `robust_sentence_split` return for this input?

```python
robust_sentence_split("See Fig. 3 for wiring. Mr. Lee approved it. Done.")
```

### Coding Exercises

**E1 (Easy).** Write `count_chunks(length: int, chunk_size: int, overlap: int) -> int` that returns how many chunks `fixed_size_chunks` would produce, without building them. Raise `ValueError` if `overlap >= chunk_size`.

- `count_chunks(9000, 2000, 500)` → `6`
- `count_chunks(2500, 1000, 200)` → `4`
- `count_chunks(0, 10, 2)` → `0`

**E2 (Easy–Medium).** Write `word_window_chunks(text: str, size: int, overlap: int) -> list[str]` that slides a window of `size` **words** with `overlap` shared words between consecutive chunks. Stop as soon as a window reaches the last word, so you never emit a chunk that is entirely overlap. Raise `ValueError` unless `0 <= overlap < size`.

- `word_window_chunks("a b c d e f g", 3, 1)` → `["a b c", "c d e", "e f g"]`
- `word_window_chunks("a b c d e f", 3, 1)` → `["a b c", "c d e", "e f"]`

**E3 (Medium).** Combine sentence chunking with overlap. Write `sentence_chunks_overlap(text: str, max_chars: int, overlap_sentences: int = 1) -> list[str]`. Greedily add sentences (split with the chapter's regex) while the **joined** chunk length (including spaces) stays `<= max_chars`. When the next sentence would overflow, emit the current chunk and start the next one with its last `overlap_sentences` sentences.

- `sentence_chunks_overlap("Open valve. Start pump. Check flow. Log result.", 30)` → `["Open valve. Start pump.", "Start pump. Check flow.", "Check flow. Log result."]`

#### Dry-Run: Answers

**Q1.** The step is $1000 - 200 = 800$, so the starts are `0, 800, 1600, 2400`. The next start, 3200, is not below 2500, so the loop stops. That gives **4 chunks** with lengths **`[1000, 1000, 900, 100]`**. The last chunk `[2400:2500]` is only 100 chars, and all of them also appear in chunk 2. A tiny trailing chunk like this is a common side effect of fixed-size splitting. In general the count is $\lceil L / (\text{size} - \text{overlap}) \rceil$.

**Q2.**

| chunk | slice | #A | #B | #C | length |
|-------|-------|----|----|----|--------|
| 0 | `[0:2000]` | 2000 | 0 | 0 | 2000 |
| 1 | `[1500:3500]` | 1500 | 500 | 0 | 2000 |
| 2 | `[3000:5000]` | 0 | 2000 | 0 | 2000 |
| 3 | `[4500:6500]` | 0 | 1500 | 500 | 2000 |
| 4 | `[6000:8000]` | 0 | 0 | 2000 | 2000 |
| 5 | `[7500:9000]` | 0 | 0 | 1500 | 1500 |

The A block covers indices 0–2999, so chunk 0 is **pure A**, not "mixed A and B". Chunk 1 is the one that mixes A and B, and chunk 2 is pure B. The only mixed chunks are 1 (A/B) and 3 (B/C): exactly the chunks that straddle a boundary.

**Q3.** **3 chunks**:

| sentence | len | `current_size` before | sum | action |
|----------|-----|-----------------------|-----|--------|
| 1 "The pump operates…" | 30 | 0 | 30 | add |
| 2 "Temperature should…" | 34 | 30 | 64 | add |
| 3 "If vibration exceeds…" | 50 | 64 | 114 > 80 | flush chunk 0, start with s3 (size 50) |
| 4 "Check alignment…" | 26 | 50 | 76 | add |
| 5 "Replace seals…" | 31 | 76 | 107 > 80 | flush chunk 1, start with s5 (size 31) |
| 6 "Document all…" | 40 | 31 | 71 | add; flush at end as chunk 2 |

- Chunk 0: sentences 1–2 (65 chars joined)
- Chunk 1: sentences 3–4 (77 chars joined)
- Chunk 2: sentences 5–6 (72 chars joined)

**Q4.** It loops **forever**, appending `text[0:100]` again and again until memory runs out. The culprit is `start = end - overlap`, which works out to `start + 100 - 100 = start`, so `start` never advances. If `overlap > chunk_size`, `start` moves backwards, with the same result. `production_recursive_split` guards against this with `if overlap >= chunk_size: raise ValueError(...)`.

**Q5.** `['See Fig. 3 for wiring.', 'Mr.', 'Lee approved it.', 'Done.']`

The pattern splits after `.`, `!` or `?` when the next character is uppercase. Here is how it handles each candidate:

- `Fig.` is followed by ` 3`, a digit, so there is no split, which is correct.
- `wiring.` is followed by ` Mr`, so it splits, which is correct.
- `Mr.` is followed by ` Lee`, so it splits. That is **wrong**, because the abbreviation is followed by a capitalized name.
- `it.` is followed by ` Done`, so it splits, which is correct.

The uppercase lookahead fixes dates such as "Jan. 15" but not titles. A production splitter needs an abbreviation list.

**E1 — reference solution**

```python
import math

def count_chunks(length: int, chunk_size: int, overlap: int) -> int:
    if overlap >= chunk_size:
        raise ValueError("overlap must be < chunk_size")
    if length <= 0:
        return 0
    step = chunk_size - overlap
    return math.ceil(length / step)   # number of starts 0, step, 2*step, ... < length

print(count_chunks(9000, 2000, 500))  # 6
print(count_chunks(2500, 1000, 200))  # 4
print(count_chunks(0, 10, 2))         # 0
```

$O(1)$. The count is just the number of multiples of `step` below `length`. Note that `count_chunks(1000, 1000, 200)` is `2`, because `fixed_size_chunks` emits a redundant 200-char tail chunk.

**E2 — reference solution**

```python
def word_window_chunks(text: str, size: int, overlap: int) -> list[str]:
    if not 0 <= overlap < size:
        raise ValueError("need 0 <= overlap < size")
    words = text.split()
    out, start = [], 0
    while start < len(words):
        out.append(" ".join(words[start:start + size]))
        if start + size >= len(words):   # this window reached the end
            break
        start += size - overlap
    return out

print(word_window_chunks("a b c d e f g", 3, 1))  # ['a b c', 'c d e', 'e f g']
print(word_window_chunks("a b c d e f", 3, 1))    # ['a b c', 'c d e', 'e f']
```

$O(n)$ in the number of words. The early `break` is what avoids the trailing overlap-only chunk from Q1.

**E3 — reference solution**

```python
import re

def sentence_chunks_overlap(text: str, max_chars: int, overlap_sentences: int = 1) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks, current = [], []
    for s in sentences:
        candidate = " ".join(current + [s])
        if current and len(candidate) > max_chars:
            chunks.append(" ".join(current))
            carry = current[-overlap_sentences:] if overlap_sentences else []
            current = carry + [s]
        else:
            current.append(s)
    if current:
        chunks.append(" ".join(current))
    return chunks

print(sentence_chunks_overlap("Open valve. Start pump. Check flow. Log result.", 30))
# ['Open valve. Start pump.', 'Start pump. Check flow.', 'Check flow. Log result.']
```

Trace: `"Open valve. Start pump."` has 23 chars. Adding `"Check flow."` would make 35 > 30, so the function emits the chunk and carries `"Start pump."` forward. The same thing happens before `"Log result."`. The cost is $O(n \cdot k)$, where $k$ is the number of sentences per chunk. One caveat: a carried sentence plus a long new sentence can exceed `max_chars`, so production code should drop the carry in that case.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Chunking Strategies**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 chunking strategies**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

