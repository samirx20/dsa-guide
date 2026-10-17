# Part 4, Topic 2: Metadata & Advanced Retrieval
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

def chunk_manual(text, chunk_size=400, overlap=100):
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

### Starter Code Skeleton

Two decisions shape the skeleton.

1. **Section-aware chunking.** Each manual is first split on blank lines into sections. The section header decides `section_type`. Only then does the overlapping window from Requirement 1 run, and only inside a section, so no chunk ever mixes "Oil Change" text with "Safety" text. The window uses `chunk_size=400` and the 200-character overlap from the requirement prose, so every chunk stays under the 500-character limit.
2. **A pluggable embedder.** `HashingEmbedder` is a deterministic, offline stand-in (feature hashing, Chapter 1's `hashlib` cache). The tests and the sample output never need an API key. `OpenAIEmbedder` uses `text-embedding-3-small` behind the same `Embedder` protocol, so you change one flag, not the pipeline.

```text
industrial-rag/
├── pyproject.toml
├── manuals.py         # MANUALS: 3 sample manuals (>= 500 chars each)
├── chunking.py        # classify_section, chunk_manual, chunk_documents
├── embeddings.py      # Embedder protocol, HashingEmbedder, OpenAIEmbedder
├── store.py           # VectorStore (Requirement 2) + dimension check
├── pipeline.py        # build_index, retrieve, Requirement 4 demo
└── tests/
    └── test_rag.py
```

```toml
# pyproject.toml
[project]
name = "industrial-rag"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["numpy>=1.26"]

[project.optional-dependencies]
openai = ["openai>=1.30"]
dev = ["pytest>=8.0"]
```

```python
# manuals.py -- sections are separated by a blank line and start with a header line
MANUALS: list[dict[str, str]] = [
    {
        "machine_id": "P101",
        "source_file": "pump_manual.txt",
        "content": (
            "Section 1: Installation\n"
            "Mount the pump base plate on a level concrete pad and grout it fully. Align the motor and pump "
            "shafts with a dial indicator; total indicated runout must stay below 0.05 mm before the coupling "
            "guard is fitted.\n\n"
            "Section 2: Mechanical Seal Replacement\n"
            "Lock out the motor and drain the casing before any seal work. Remove the coupling spacer, then "
            "unbolt the seal gland and slide the old mechanical seal off the shaft sleeve. Inspect the sleeve "
            "for scoring; replace it if grooves are deeper than 0.1 mm. Lubricate the new seal faces with clean "
            "water only, never grease. Press the rotating face on by hand, torque gland nuts evenly to 25 Nm in "
            "a cross pattern, and run the pump for ten minutes while checking the seal for drips.\n\n"
            "Section 3: Lubrication\n"
            "Grease the pump bearings every 2000 operating hours with lithium complex grease, 15 g per bearing. "
            "Over-greasing raises bearing temperature; stop when fresh grease appears at the relief port."
        ),
    },
    {
        "machine_id": "C201",
        "source_file": "compressor_manual.txt",
        "content": (
            "Section 1: Operating Parameters\n"
            "Normal vibration range for the compressor C201 is 2.0 to 4.5 mm/s RMS measured at the drive end "
            "bearing. A vibration threshold of 7.1 mm/s triggers an alarm and 11.0 mm/s trips the unit. "
            "Discharge temperature must stay below 105 C.\n\n"
            "Section 2: Oil Change\n"
            "Change the compressor oil every 4000 operating hours or every 12 months, whichever comes first. "
            "Drain the oil while it is warm, replace the oil filter, and refill with 18 litres of ISO VG 46 "
            "synthetic compressor oil. Check the oil level sight glass after a five minute run.\n\n"
            "Section 3: Safety\n"
            "Always vent the receiver tank to zero pressure before opening any fitting. Never bypass the "
            "pressure relief valve, and wear hearing protection near the running compressor."
        ),
    },
    {
        "machine_id": "P101",
        "source_file": "pump_troubleshooting.txt",
        "content": (
            "Symptom: High vibration\n"
            "Cause: Misaligned coupling or a worn bearing. Check shaft alignment with a dial indicator and "
            "compare vibration readings against the 4.5 mm/s limit for pump P101. Replace bearings that show "
            "a rising high frequency vibration trend.\n\n"
            "Symptom: Seal leakage\n"
            "Cause: Dry running damaged the mechanical seal faces, or gland nuts were torqued unevenly. Confirm "
            "suction pressure, then replace the mechanical seal following the seal replacement procedure.\n\n"
            "Symptom: Low flow\n"
            "Cause: Clogged suction strainer or impeller wear. Clean the strainer and measure impeller clearance; "
            "clearance above 0.5 mm requires a new wear ring."
        ),
    },
]
```

```python
# chunking.py
from typing import TypedDict

SECTION_KEYWORDS: dict[str, str] = {  # first match wins, so the most specific keyword goes first
    "symptom": "troubleshooting",
    "install": "installation",
    "seal": "maintenance",
    "lubric": "maintenance",
    "oil": "maintenance",
    "operating": "specifications",
    "safety": "safety",
}


class Chunk(TypedDict):
    text: str
    metadata: dict[str, str | int]


def classify_section(header: str) -> str:
    """Lower-case the header, return the first matching SECTION_KEYWORDS value, else 'general'."""
    # TODO(milestone 1)
    raise NotImplementedError


def chunk_manual(text: str, chunk_size: int = 400, overlap: int = 200) -> list[str]:
    """Sliding window that never cuts a word in half. Raise ValueError if overlap >= chunk_size."""
    # TODO(milestone 1): end = last space before start + chunk_size; next start = end - overlap,
    #                    moved forward to the next word boundary
    raise NotImplementedError


def chunk_documents(manuals: list[dict[str, str]], chunk_size: int = 400, overlap: int = 200) -> list[Chunk]:
    """Split each manual on '\\n\\n'; metadata = machine_id, source_file, section_type, section, chunk_index."""
    # TODO(milestone 1)
    raise NotImplementedError
```

```python
# embeddings.py
import hashlib
import re
from typing import Protocol

import numpy as np

STOPWORDS = frozenset("a an and the of to for is are be do i how what when should with on in or at it by".split())


class Embedder(Protocol):
    dim: int

    def embed(self, text: str) -> np.ndarray: ...


def tokenize(text: str) -> list[str]:
    tokens = [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS]
    return [t[:-1] if len(t) > 3 and t.endswith("s") else t for t in tokens]  # crude plural folding


class HashingEmbedder:
    """Feature hashing: each distinct token adds +1/-1 to one of `dim` buckets. Unit-normalised output."""

    def __init__(self, dim: int = 256) -> None:
        self.dim = dim
        self._cache: dict[str, np.ndarray] = {}

    def _bucket(self, token: str) -> tuple[int, float]:
        digest = hashlib.sha256(token.encode("utf-8")).digest()  # NOT hash(): see Practice Q2
        return int.from_bytes(digest[:4], "little") % self.dim, (1.0 if digest[4] % 2 == 0 else -1.0)

    def embed(self, text: str) -> np.ndarray:
        # TODO(milestone 2): cache by sha256(text.strip()); for token in set(tokenize(text)): vec[i] += sign;
        #                    divide by the L2 norm (leave the zero vector alone)
        raise NotImplementedError


class OpenAIEmbedder:
    """Real embeddings. Needs the `openai` extra and OPENAI_API_KEY in the environment."""

    def __init__(self, model: str = "text-embedding-3-small") -> None:
        from openai import OpenAI

        self.client, self.model, self.dim = OpenAI(), model, 1536

    def embed(self, text: str) -> np.ndarray:
        response = self.client.embeddings.create(model=self.model, input=text)
        return np.array(response.data[0].embedding)
```

```python
# store.py -- Requirement 2's class, typed, plus a dimension guard in add()
from typing import Any

import numpy as np


class VectorStore:
    def __init__(self, dim: int) -> None:
        self.dim = dim
        self.items: list[dict[str, Any]] = []

    def __len__(self) -> int:
        return len(self.items)

    def add(self, text: str, vector: np.ndarray, metadata: dict[str, Any]) -> None:
        vec = np.asarray(vector, dtype=float)
        if vec.shape != (self.dim,):
            raise ValueError(f"expected vector of shape ({self.dim},), got {vec.shape}")
        self.items.append({"text": text, "vector": vec, "metadata": metadata})

    def search(self, query_vector: np.ndarray, top_k: int = 5, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        # TODO(milestone 3): pre-filter on exact metadata match, cosine-score, sort descending, slice top_k
        raise NotImplementedError
```

```python
# pipeline.py
import argparse
from typing import Any

from chunking import chunk_documents
from embeddings import Embedder, HashingEmbedder
from manuals import MANUALS
from store import VectorStore


def build_index(embedder: Embedder, manuals: list[dict[str, str]] = MANUALS,
                chunk_size: int = 400, overlap: int = 200) -> VectorStore:
    store = VectorStore(dim=embedder.dim)
    for chunk in chunk_documents(manuals, chunk_size, overlap):
        store.add(chunk["text"], embedder.embed(chunk["text"]), chunk["metadata"])
    return store


def retrieve(query: str, store: VectorStore, embedder: Embedder, machine_id: str | None = None,
             top_k: int = 3, min_score: float = 0.0) -> list[dict[str, Any]]:
    """Requirement 3, plus `min_score` (Chapter 2's confidence threshold)."""
    # TODO(milestone 4): filters = {"machine_id": ...}; search; map to text/score/source/machine_id/section_type;
    #                    drop results with score < min_score
    raise NotImplementedError


DEMO: list[tuple[str, str, str | None]] = [
    ("seal replacement (P101 only)", "How do I replace the mechanical seal?", "P101"),
    ("vibration analysis (all machines)", "What is the vibration threshold?", None),
    ("oil change (C201 only)", "When should I change the oil?", "C201"),
]


def main(use_openai: bool) -> None:
    embedder: Embedder
    if use_openai:
        from embeddings import OpenAIEmbedder
        embedder = OpenAIEmbedder()
    else:
        embedder = HashingEmbedder()
    store = build_index(embedder)
    print(f"Indexed {len(store)} chunks from {len(MANUALS)} manuals (dim={embedder.dim})")
    for title, query, machine in DEMO:
        print(f"\n=== Query: {title} ===")
        for r in retrieve(query, store, embedder, machine_id=machine, min_score=0.1):
            preview = r["text"][:60].replace("\n", " | ")
            print(f"  [{r['score']:.4f}] {r['source']} ({r['machine_id']}/{r['section_type']}): {preview}...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--openai", action="store_true", help="use text-embedding-3-small instead of the offline embedder")
    main(parser.parse_args().openai)
```

### Step-by-Step Milestones

1. **Chunking with metadata.** Implement `classify_section`, `chunk_manual`, and `chunk_documents`.
   *Done when:* `python -c "from chunking import chunk_documents; from manuals import MANUALS; c = chunk_documents(MANUALS); print(len(c), max(len(x['text']) for x in c))"` prints `10 398`. That is ten chunks, the longest at 398 characters, which is under the 500 limit. The 513-character seal section is the only one split into two overlapping windows.
2. **Offline embedder.** Implement `HashingEmbedder.embed`.
   *Done when:* `python -c "import numpy as np; from embeddings import HashingEmbedder as H; v = H().embed('replace seal'); print(v.shape, round(float(np.linalg.norm(v)), 6))"` prints `(256,) 1.0`.
3. **Filtered cosine search.** Implement `VectorStore.search` using $\cos\theta = \frac{\mathbf{q}\cdot\mathbf{d}}{\lVert\mathbf{q}\rVert\,\lVert\mathbf{d}\rVert + \varepsilon}$, applying the filter **before** scoring.
   *Done when:* searching with `filters={"machine_id": "C201"}` returns only C201 chunks, in descending score order.
4. **Retrieval with attribution.** Implement `retrieve`, including `min_score`.
   *Done when:* `python pipeline.py` prints the three demo blocks shown below, each result tagged with its `source`, `machine_id`, and `section_type`.
5. **Tests.** Add `tests/test_rag.py`.
   *Done when:* `pytest -q` reports `14 passed` with no network access.
6. **Real embeddings (optional).** Run `pip install -e ".[openai]"` and set `OPENAI_API_KEY`.
   *Done when:* `python pipeline.py --openai` runs and reports `dim=1536`. The seal procedure chunk should now rank at or near the top, because real embeddings capture meaning, not just shared words.

### Sample Expected Output

The sample input is the three `MANUALS` above, indexed with `HashingEmbedder(dim=256)`, then the three `DEMO` queries with `min_score=0.1`.

```text
$ python pipeline.py
Indexed 10 chunks from 3 manuals (dim=256)

=== Query: seal replacement (P101 only) ===
  [0.3693] pump_troubleshooting.txt (P101/troubleshooting): Symptom: Seal leakage | Cause: Dry running damaged the mechani...
  [0.2673] pump_manual.txt (P101/maintenance): Section 2: Mechanical Seal Replacement | Lock out the motor an...
  [0.1898] pump_manual.txt (P101/maintenance): shaft sleeve. Inspect the sleeve for scoring; replace it if ...

=== Query: vibration analysis (all machines) ===
  [0.2294] compressor_manual.txt (C201/specifications): Section 1: Operating Parameters | Normal vibration range for t...
  [0.1270] pump_troubleshooting.txt (P101/troubleshooting): Symptom: High vibration | Cause: Misaligned coupling or a worn...

=== Query: oil change (C201 only) ===
  [0.2425] compressor_manual.txt (C201/maintenance): Section 2: Oil Change | Change the compressor oil every 4000 o...
  [0.1147] compressor_manual.txt (C201/specifications): Section 1: Operating Parameters | Normal vibration range for t...
```

Points to notice:

- The unfiltered vibration query returns chunks from **two** machines. The filtered queries never leave their `machine_id`.
- Only two results appear for the vibration and oil queries, even though `top_k=3`. Every other chunk scored below `min_score=0.1`.
- The third seal hit is the *second window* of the same section. Its text begins mid-procedure ("shaft sleeve...") because of the 200-character overlap.
- With lexical feature hashing, the troubleshooting chunk outranks the actual procedure because it shares more distinct query words (`replace`, `mechanical`, `seal`). This is the main limitation that semantic embeddings solve.

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| manual length | `MANUALS` | at least 3 manuals, each $\ge 500$ chars |
| chunk size and metadata | all chunks | every chunk $\le 500$ chars with `machine_id`, `section_type`, `source_file` |
| overlap trace | `"one two three four five six"`, size 10, overlap 4 | `["one two", "two three", "four five", "five six"]` |
| invalid overlap | `overlap == chunk_size` | `ValueError` |
| section classification | `"Symptom: Seal leakage"`, `"Section 2: Oil Change"`, `"Appendix"` | `troubleshooting`, `maintenance`, `general` |
| deterministic embedder | same text, two instances | identical unit-length vectors |
| dimension guard | 3-d vector into a 4-d store | `ValueError` |
| sorted results | `"vibration threshold"` | scores in descending order |
| filter correctness | `machine_id="P101"` | every result has `machine_id == "P101"` |
| unknown machine | `machine_id="X999"` | `[]` |
| relevance | oil query on C201 | top hit is the `Oil Change` chunk |
| confidence threshold | seal query on C201, `min_score=0.1` | `[]` (no relevant chunk, so nothing is returned) |

```python
# tests/test_rag.py -- run with: pytest -q   (offline: uses HashingEmbedder)
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from chunking import chunk_documents, chunk_manual, classify_section  # noqa: E402
from embeddings import HashingEmbedder  # noqa: E402
from manuals import MANUALS  # noqa: E402
from pipeline import build_index, retrieve  # noqa: E402
from store import VectorStore  # noqa: E402


@pytest.fixture(scope="module")
def embedder() -> HashingEmbedder:
    return HashingEmbedder()


@pytest.fixture(scope="module")
def store(embedder: HashingEmbedder) -> VectorStore:
    return build_index(embedder)


def test_manuals_are_long_enough() -> None:
    assert len(MANUALS) >= 3
    assert all(len(m["content"]) >= 500 for m in MANUALS)


def test_chunks_respect_size_and_metadata() -> None:
    chunks = chunk_documents(MANUALS)
    assert all(len(c["text"]) <= 500 for c in chunks)
    for c in chunks:
        assert {"machine_id", "section_type", "source_file"} <= c["metadata"].keys()


def test_overlap_repeats_text_between_windows() -> None:
    pieces = chunk_manual("one two three four five six", chunk_size=10, overlap=4)
    assert pieces == ["one two", "two three", "four five", "five six"]


def test_overlap_must_be_smaller_than_chunk() -> None:
    with pytest.raises(ValueError):
        chunk_manual("abc", chunk_size=10, overlap=10)


@pytest.mark.parametrize(
    ("header", "expected"),
    [("Symptom: Seal leakage", "troubleshooting"), ("Section 2: Oil Change", "maintenance"), ("Appendix", "general")],
)
def test_classify_section(header: str, expected: str) -> None:
    assert classify_section(header) == expected


def test_embedder_is_deterministic_and_unit_length(embedder: HashingEmbedder) -> None:
    a, b = embedder.embed("replace the seal"), HashingEmbedder().embed("replace the seal")
    assert np.allclose(a, b)
    assert np.isclose(np.linalg.norm(a), 1.0)


def test_store_rejects_wrong_dimension() -> None:
    with pytest.raises(ValueError):
        VectorStore(dim=4).add("x", np.ones(3), {})


def test_results_sorted_descending(store: VectorStore, embedder: HashingEmbedder) -> None:
    scores = [r["score"] for r in retrieve("vibration threshold", store, embedder, top_k=5)]
    assert scores == sorted(scores, reverse=True)


def test_filter_returns_only_matching_machine(store: VectorStore, embedder: HashingEmbedder) -> None:
    results = retrieve("mechanical seal", store, embedder, machine_id="P101", top_k=10)
    assert results and {r["machine_id"] for r in results} == {"P101"}


def test_unknown_machine_returns_empty(store: VectorStore, embedder: HashingEmbedder) -> None:
    assert retrieve("seal", store, embedder, machine_id="X999") == []


def test_oil_query_hits_oil_section_first(store: VectorStore, embedder: HashingEmbedder) -> None:
    top = retrieve("When should I change the oil?", store, embedder, machine_id="C201")[0]
    assert top["source"] == "compressor_manual.txt" and "Oil Change" in top["text"]


def test_min_score_drops_irrelevant_chunks(store: VectorStore, embedder: HashingEmbedder) -> None:
    results = retrieve("How do I replace the mechanical seal?", store, embedder, machine_id="C201", min_score=0.1)
    assert results == []
```

### Practice & Self-Check

**Q1 (predict the output).** What does `retrieve("How do I replace the mechanical seal?", store, embedder, machine_id="C201")` return with the default `min_score=0.0`? What changes with `min_score=0.1`?

**Q2 (predict the output).** A teammate replaces `hashlib.sha256(token...)` in `_bucket` with Python's built-in `hash(token) % self.dim`. The tests pass. They pickle the `VectorStore` to disk, restart Python, load it, and query it with a fresh `HashingEmbedder`. What happens to the scores?

**Q3 (predict the output).** Trace `chunk_manual("one two three four five six", chunk_size=10, overlap=4)` by hand. What list does it return?

**Exercise 1 (Easy).** Add Chapter 4's operator syntax to `VectorStore.search` filters: `{"machine_id": {"$in": ["P101", "C201"]}}` and `{"chunk_index": {"$gte": 1}}`. A plain value must still mean equality.

**Exercise 2 (Medium).** Implement Chapter 5's weighted hybrid search to fix the ranking problem from the sample output. Define
$$\text{score} = \alpha \cdot \cos(\mathbf{q}, \mathbf{d}) + (1 - \alpha) \cdot \frac{|T_q \cap T_d|}{|T_q|},$$
where $T$ is the token set from `tokenize`. Add a `section_boost` dictionary (for example `{"maintenance": 0.1}`) applied when the query contains "how do i" or "replace". Show that the P101 seal query now ranks `Section 2: Mechanical Seal Replacement` first.

#### Dry-Run: Answers

**A1.** With `min_score=0.0` it still returns **three** C201 chunks: `Oil Change` scores `0.099` (it shares only the word "replace"), and the other two score `0.0`. The filter limits *where* the search looks. It never guarantees that anything relevant exists there, so `top_k` dutifully fills its slots with irrelevant chunks. With `min_score=0.1`, the result is `[]`, which is the honest answer for a compressor that has no mechanical seal. An agent should treat an empty retrieval as "I don't know", not invent a procedure.

**A2.** The scores become essentially random. Since Python 3.3, `hash()` for `str` is salted with a random per-process seed (`PYTHONHASHSEED`). The same token lands in a *different* bucket after the restart, so the stored document vectors and the new query vectors live in different coordinate systems. The tests still passed because the indexing and the querying happened in the same process. Any persisted index needs a **stable** hash (`hashlib`), or it needs the exact same embedding model and version, which is the same lesson for real embeddings.

**A3.** `["one two", "two three", "four five", "five six"]`. Window 1 covers `[0, 10)`. Its last space is at index 7, so it holds `"one two"`. The next start is $7 - 4 = 3$, moved forward to the word start at 4. Window 2 covers `[4, 14)` and cuts at the space at 13, giving `"two three"`. Start $13 - 4 = 9$ is mid-word, so it moves forward to 14. Window 3 covers `[14, 24)` and cuts at 23, giving `"four five"`. Start $23 - 4 = 19$ is already a word start. Window 4 reaches the end of the text and returns `"five six"`. The overlap repeats one word per boundary here, so each boundary's context appears in two chunks.

**Exercise 1 sketch.**

```python
def matches(meta: dict[str, Any], filters: dict[str, Any]) -> bool:
    for key, cond in filters.items():
        value = meta.get(key)
        if isinstance(cond, dict):
            if "$in" in cond and value not in cond["$in"]:
                return False
            if "$gte" in cond and (value is None or value < cond["$gte"]):
                return False
        elif value != cond:
            return False
    return True
```

Replace the `all(...)` comprehension in `search` with `matches(i["metadata"], filters)`.

**Exercise 2 sketch.** Score every candidate as `alpha * cos + (1 - alpha) * overlap + boost`, with $\alpha = 0.7$. For the seal query, $T_q = \{\text{replace}, \text{mechanical}, \text{seal}\}$. Both the procedure chunk and the "Seal leakage" chunk contain all three words, so their keyword term ties at $1.0$. The maintenance boost of $0.1$ then lifts the procedure chunk above the troubleshooting chunk, whose `section_type` is `troubleshooting`. Assert that `results[0]["section_type"] == "maintenance"` and that `"Mechanical Seal Replacement"` appears in its text.

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

