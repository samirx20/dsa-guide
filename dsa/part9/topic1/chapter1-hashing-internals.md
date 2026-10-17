# Part 9, Topic 1: Hash Maps & Sets
## Chapter 1: Hashing Internals & Collisions

While you should treat `std::unordered_map` as a black box that gives you $O(1)$ lookups, interviewers at top companies will frequently ask you *how* it achieves that speed under the hood. You must be able to explain the mechanics of Hashing.

---

### 1. The Core Concept

An array gives you $O(1)$ lookups *if you know the index*. (`arr[5]` goes directly to memory address + 5). 

But what if you want to look up a string, like `"Alice"`? A Hash Map acts as a translator. It converts the string `"Alice"` into an integer index (like `5`), so it can store her data in a standard, fast, underlying array.

**Analogy:** Think of a Hash Map like a library's card catalog. You don't walk through every shelf to find a book. You look up the book's name in the catalog (the hash function), which tells you exactly which shelf (bucket) to go to.

```
Without Hash Map:          With Hash Map:
┌─────────────────┐        ┌──────────────────────────────┐
│  "Alice" → 25   │        │  Hash Function               │
│  "Bob"   → 42   │───────▶│  "Alice" → index 3           │
│  "Carol" → 17   │        │  "Bob"   → index 7           │
└─────────────────┘        └──────────────────────────────┘
                                 │
                                 ▼
                           ┌──────────────────────────────┐
                           │  Underlying Array (Buckets)  │
                           │  [0] [1] [2] [3:Alice] [4]   │
                           │  [5] [6] [7:Bob]    [8]      │
                           └──────────────────────────────┘
```

---

### 2. The Hash Function

The translator is called a **Hash Function**. It takes an input (the Key) of any size and deterministically scrambles it into a fixed-size integer.

```
Hash("Alice") = 8392183
```

Because we don't want to allocate an array of size 8,392,183 just to store Alice, we use the modulo operator (`%`) to compress that massive number into the size of our actual underlying array (the "buckets").

If our array has 10 buckets:
```
8392183 % 10 = 3
```
Alice's data is stored in bucket index `3`.

When we want to find Alice later, we run "Alice" through the same hash function, get `3`, and look in bucket `3`. That takes $O(1)$ time!

**What's happening:**
```cpp
// The hash function pipeline:
string key = "Alice";

// Step 1: Convert string to a large integer
size_t hashValue = hash<string>{}(key);
// hashValue = 8392183 (some large number)

// Step 2: Compress to fit our array size
int bucketIndex = hashValue % numBuckets;
// bucketIndex = 8392183 % 10 = 3

// Step 3: Use as index into underlying array
data[bucketIndex] = ...;  // Store Alice's data at index 3
```

**How C++ implements it internally:**
```cpp
// C++ std::unordered_map uses std::hash<T> by default
#include <unordered_map>
#include <functional>

// You can see the hash value of any object:
string key = "Alice";
size_t h = hash<string>{}(key);
cout << "Hash of 'Alice': " << h << endl;
// Output: Hash of 'Alice': 2236302541650314391 (varies by system)

// For integers, the hash is often the identity function:
int num = 42;
size_t h2 = hash<int>{}(num);
cout << "Hash of 42: " << h2 << endl;
// Output: Hash of 42: 42
```

---

### 3. Visualizing the Hash Table

Here is a complete hash table with 7 buckets (using modulo 7):

```
Hash Table (size=7):
┌─────────┬─────────────────────────────────┐
│ Bucket  │ Contents                         │
├─────────┼─────────────────────────────────┤
│   0     │ "cat" → {species: "feline"}     │
│   1     │ "dog" → {species: "canine"}     │
│   2     │ (empty)                          │
│   3     │ "eel" → {species: "fish"}        │
│   4     │ "fox" → {species: "mammal"}      │
│   5     │ (empty)                          │
│   6     │ "gnu" → {species: "mammal"}      │
└─────────┴─────────────────────────────────┘

How we got these indices:
  hash("cat") % 7 = 0
  hash("dog") % 7 = 1
  hash("eel") % 7 = 3
  hash("fox") % 7 = 4
  hash("gnu") % 7 = 6
```

---

### 4. Hash Collisions

What happens if we hash the string `"Bob"`, and the math works out such that:
```
Hash("Bob") % 10 = 3
```

Now both Alice and Bob are supposed to live in bucket index `3`. This is called a **Collision**. Because the universe of possible keys (infinite strings) is larger than the number of buckets (10), collisions are guaranteed to happen eventually.

**Why collisions are mathematically guaranteed:**
```
Pigeonhole Principle:
- Possible keys: 2^64 different strings (effectively infinite)
- Number of buckets: typically 16, 32, 64, etc.
- If we have more possible keys than buckets,
  multiple keys MUST map to the same bucket
```

There are two primary ways to resolve collisions:

#### Resolution 1: Separate Chaining (The C++ Standard)

Instead of storing the data directly in the bucket, each bucket stores a **Linked List**.
When Bob hashes to bucket `3`, the Hash Map goes to bucket `3`, follows the linked list, and attaches Bob to the end of Alice.

```
Separate Chaining Diagram:
┌──────────────────────────────────────────────────┐
│  Bucket 0: "cat" → {species: "feline"}          │
│  Bucket 1: "dog" → {species: "canine"}          │
│  Bucket 2: (empty)                               │
│  Bucket 3: "Alice" ──▶ "Bob" ──▶ "Zack"        │
│            (linked list of colliding keys)        │
│  Bucket 4: "fox" → {species: "mammal"}          │
│  Bucket 5: (empty)                               │
│  Bucket 6: "gnu" → {species: "mammal"}          │
└──────────────────────────────────────────────────┘
```

*   **Lookup:** To find Bob later, it goes to bucket `3`, and traverses the linked list (`Alice -> Bob`) until it finds him.
*   **Worst-Case:** If *every* key collides into bucket `3`, the Hash Map degrades into a single long linked list. Lookups drop from $O(1)$ to **$O(N)$**.

```cpp
// This is what Separate Chaining looks like conceptually:
struct Bucket {
    // Each bucket holds a linked list of key-value pairs
    list<pair<string, int>> chain;
};

// When we insert "Bob" into bucket 3:
// bucket[3].chain.push_back({"Bob", 42});
//
// When we look up "Bob":
// 1. Compute: hash("Bob") % 10 = 3
// 2. Go to bucket 3
// 3. Traverse the chain: check "Alice"... not Bob. Check "Bob"... found!
```

#### Resolution 2: Open Addressing (Linear Probing)

If bucket `3` is full (Alice is there), Bob simply looks at bucket `4`. If `4` is full, he goes to `5`. He keeps walking down the array until he finds an empty slot.

```
Linear Probing Diagram:
┌──────────────────────────────────────────────────┐
│  Bucket 0: "cat"                                 │
│  Bucket 1: "dog"                                 │
│  Bucket 2: (empty)                               │
│  Bucket 3: "Alice"                               │
│  Bucket 4: "Bob"    ← probed from 3 → 4          │
│  Bucket 5: "Zack"   ← probed from 3 → 4 → 5     │
│  Bucket 6: "gnu"                                 │
│  Bucket 7: (empty)                               │
│  Bucket 8: (empty)                               │
│  Bucket 9: (empty)                               │
└──────────────────────────────────────────────────┘
```

*   **Lookup:** To find Bob, it goes to bucket `3`. It sees Alice. It walks to bucket `4`, sees Bob. Found!
*   **Cluster Problem:** If many keys hash to nearby indices, "clusters" of occupied slots form, which degrades performance as probing has to skip over long runs.

```cpp
// Linear probing lookup conceptually:
int index = hash(key) % tableSize;
while (table[index].isOccupied) {
    if (table[index].key == key) {
        return table[index].value;  // Found!
    }
    index = (index + 1) % tableSize;  // Probe next slot
}
// If we reach an empty slot, the key doesn't exist
```

**Comparison of Collision Resolution Strategies:**

| Strategy | C++ Default | Insert | Lookup | Delete | Cache Friendly |
|----------|-------------|--------|--------|--------|----------------|
| Separate Chaining | Yes (`unordered_map`) | O(1) avg | O(1) avg | O(1) avg | No (linked list) |
| Linear Probing | No | O(1) avg | O(1) avg | Complex | Yes (array) |
| Quadratic Probing | No | O(1) avg | O(1) avg | Complex | Yes (array) |
| Double Hashing | No | O(1) avg | O(1) avg | Complex | No |

---

### 5. Load Factor & Resizing

If an array has 10 buckets and we insert 20 items, chaining means every bucket has a linked list of length 2, slowing down our "instant" lookups.

The **Load Factor** is the ratio of Items to Buckets (e.g., 20/10 = 2.0). 

```
Load Factor Formula:
                    number of elements
Load Factor (α) = ─────────────────────────
                   number of buckets

Example:
  10 elements, 20 buckets  →  α = 0.5  (Good: lots of room)
  15 elements, 20 buckets  →  α = 0.75 (At threshold!)
  20 elements, 20 buckets  →  α = 1.0  (Full: must resize)
  30 elements, 20 buckets  →  α = 1.5  (Chains of ~1.5 avg)
```

When the Load Factor exceeds a certain threshold (usually 0.75 or 1.0), the Hash Map will:
1. Create a brand new underlying array that is **twice** as big (20 buckets).
2. Re-hash every single existing key and move them into the new array.

This resizing operation takes $O(N)$ time. This is why Hash Map inserts are technically **$O(1)$ Amortized**. Most inserts are instant, but occasionally one insert triggers a massive $O(N)$ resize.

```
Resize Diagram (threshold = 0.75):

Before resize (10 buckets, 8 elements, α = 0.8):
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ A  │ B  │ C  │ D  │    │ E  │ F  │ G  │ H  │    │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
  0    1    2    3    4    5    6    7    8    9

After resize (20 buckets, rehash everything):
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│    │    │ C  │    │    │ E  │ F  │    │ H  │    │ A  │ B  │    │ D  │    │    │    │ G  │    │    │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19

Note: Indices changed because hash % 20 ≠ hash % 10
```

```cpp
// Demonstrating amortized O(1):
// The following is O(N) total, not O(N²):
unordered_map<int, int> map;
for (int i = 0; i < 100000; i++) {
    map[i] = i;  // O(1) amortized per insert
    // Most calls: just put in a bucket → O(1)
    // ~log(N) calls: trigger resize → O(N) but amortized to O(1)
}

// What happens internally during a resize:
// 1. Allocate new array of size 20 (if old was 10)
// 2. For each element in old array:
//    a. Compute new_index = hash(key) % 20
//    b. Move element to new array
// 3. Free old array
```

---

### 6. Custom Hash Functions

By default, C++ uses `std::hash<T>` for common types. But for custom structs, you need to write your own hash function.

```cpp
struct Point {
    int x, y;
    
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};

// Custom hash function
struct PointHash {
    size_t operator()(const Point& p) const {
        // Combine hashes of x and y
        size_t h1 = hash<int>{}(p.x);
        size_t h2 = hash<int>{}(p.y);
        return h1 ^ (h2 * 0x9e3779b97f4a7c15 + 0x9e3779b9 + (h1 << 6) + (h1 >> 2));
        // The magic constant 0x9e3779b9 is derived from the golden ratio
        // It helps distribute bits evenly to avoid collisions
    }
};

// Usage:
unordered_map<Point, string, PointHash> pointNames;
pointNames[{3, 4}] = "Origin";
pointNames[{1, 2}] = "Start";
```

**What's happening:**
```cpp
// The hash combination trick:
size_t h1 = hash<int>{}(p.x);  // Hash of x coordinate
size_t h2 = hash<int>{}(p.y);  // Hash of y coordinate
return h1 ^ (h2 * 0x9e3779b97f4a7c15 + 0x9e3779b9 + (h1 << 6) + (h1 >> 2));
//   ^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//   |   ^
//   |   └── Bit manipulation to mix h2 into h1
//   └── XOR to combine both hashes
//
// Without this mixing, Point(1,2) and Point(2,1) would have poor distribution
```

---

### 7. Dry Run: Step-by-Step Insert and Lookup

Let's trace exactly what happens when we insert and then look up keys:

```
Starting state: empty hash table with 4 buckets

INSERT "cat" (hash = 5, index = 5 % 4 = 1):
┌────┬─────────┬────┬────┐
│  0 │         │  2 │  3 │
└────┴─────────┴────┴────┘
         ▲
     Bucket 1: "cat" → {species: "feline"}

INSERT "dog" (hash = 9, index = 9 % 4 = 1) → COLLISION!
Bucket 1 already has "cat". Chain them:
┌────┬──────────────────┬────┬────┐
│  0 │ "cat" → "dog"    │  2 │  3 │
└────┴──────────────────┴────┴────┘
     ▲
     Bucket 1: linked list ["cat", "dog"]

INSERT "fox" (hash = 7, index = 7 % 4 = 3):
┌────┬──────────────────┬────┬─────────┐
│  0 │ "cat" → "dog"    │  2 │ "fox"   │
└────┴──────────────────┴────┴─────────┘

LOOKUP "dog":
Step 1: hash("dog") % 4 = 9 % 4 = 1
Step 2: Go to bucket 1
Step 3: Check first node: "cat" ≠ "dog" → follow chain
Step 4: Check next node: "dog" = "dog" → FOUND!
Result: {species: "canine"}
```

---

### 8. Common Hash Map Pitfalls

```cpp
// PITFALL 1: Iterator Invalidation
unordered_map<int, int> map = {{1, 10}, {2, 20}, {3, 30}};

// WRONG: Erasing while iterating with index
for (int i = 0; i < map.size(); i++) {
    // size() changes as we erase! Undefined behavior!
}

// CORRECT: Use iterator-based erase
for (auto it = map.begin(); it != map.end(); ) {
    if (it->second == 20) {
        it = map.erase(it);  // erase returns next valid iterator
    } else {
        ++it;
    }
}

// PITFALL 2: Accessing non-existent keys with []
// This INSERTS a default-constructed value!
map[999];  // Now map has key 999 with value 0!
// Use .count() or .find() instead if you're checking existence

// PITFALL 3: Using operator[] in a loop (double lookup)
// BAD: Two lookups per iteration
for (auto& [key, val] : map) {
    if (map[key] > 10) { ... }  // map[key] does another lookup!
}
// BETTER: Use the iterator directly
for (auto& [key, val] : map) {
    if (val > 10) { ... }
}
```

---

### 9. Hash Set vs Hash Map

Remember the difference:
- `unordered_map`: Stores Key-Value pairs. Use it when you need to count things (Value = frequency) or map things (Value = index).
- `unordered_set`: Stores ONLY Keys. Use it when you only need to answer a True/False question: *"Have I seen this element before?"* 

Using an `unordered_map<int, bool>` to track existence is considered poor practice in C++; use an `unordered_set<int>` instead.

```cpp
// Hash Set operations (all O(1) average):
unordered_set<int> seen;
seen.insert(42);           // Add element
seen.count(42);            // 1 if exists, 0 if not
seen.find(42) != seen.end(); // Same as count, but iterator-based
seen.erase(42);            // Remove element

// Hash Map operations (all O(1) average):
unordered_map<string, int> ages;
ages["Alice"] = 25;        // Insert/update
ages.count("Alice");       // 1 if exists, 0 if not
ages.find("Alice") != ages.end(); // Iterator-based check
ages.erase("Alice");       // Remove element
ages["Alice"];             // Returns 25 (or inserts 0 if missing!)
```

---

### 10. Summary to Recite in an Interview

> *"An unordered_map provides $O(1)$ average time complexity. It hashes the key to find an index in an underlying array. If two keys hash to the same index, a collision occurs, which C++ typically resolves via Separate Chaining (linked lists). In the absolute worst-case scenario where every key collides, the time complexity degrades to $O(N)$."*

---

### Quick Reference Table

| Concept | Detail |
|---------|--------|
| **Hash Function** | Converts any key → fixed-size integer |
| **Bucket Index** | `hash(key) % numBuckets` |
| **Collision** | Two keys mapping to same bucket index |
| **Separate Chaining** | Each bucket holds a linked list (C++ default) |
| **Open Addressing** | Probe next slots on collision (not C++ default) |
| **Load Factor** | `elements / buckets` (threshold ~0.75) |
| **Resize** | Double buckets, rehash all elements → $O(N)$ |
| **Insert (amortized)** | $O(1)$ average |
| **Lookup (amortized)** | $O(1)$ average |
| **Delete (amortized)** | $O(1)$ average |
| **Worst case** | $O(N)$ if all keys collide |
| **Space** | $O(N)$ for elements + bucket overhead |
| **C++ container** | `std::unordered_map` / `std::unordered_set` |

---

## Practice & Self-Check

For every question, assume the "hash" of an integer key is the key itself (as `hash<int>` is on most systems, Section 2), so the bucket index is simply `key % numBuckets`.

### Predict the Output / Trace by Hand

**Q1. Separate chaining.** A chained table with **5** buckets inserts `12, 7, 22, 3, 17` (in that order, new nodes appended to the end of the chain, as in Section 7).
(a) Draw every bucket's chain.
(b) How many key comparisons does `LOOKUP 17` make? How many does `LOOKUP 2` (absent) make before giving up?

**Q2. Linear probing with wrap-around.** A linear-probing table of size **7** inserts `10, 3, 17, 24, 5`.
(a) Which slot does each key end up in?
(b) Using the lookup loop from Section 4, how many slots are examined when looking up the absent key `31`?

**Q3. Rehashing the Section 7 table.** The Section 7 dry run put `"cat"` (hash 5), `"dog"` (hash 9), and `"fox"` (hash 7) in a 4-bucket table, where cat and dog collided in bucket 1. If the table is resized to **8** buckets, which bucket does each key land in? Is there still a collision?

**Q4. When does it resize?** A chained map starts with 4 buckets, doubles when **after an insert** the load factor $\alpha = \frac{\text{elements}}{\text{buckets}}$ is **strictly greater** than $0.75$, and inserts 13 distinct keys. After which inserts does a resize happen, how many buckets are there at the end, and how many elements are moved in total across all resizes?

**Q5. Pitfall 2.** What does this print?

```cpp
unordered_map<string, int> m;
m["a"] = 1;
if (m["b"] == 0) cout << "zero ";
cout << m.size() << endl;
```

### Coding Exercises

**E1 (Easy). A tiny chained hash set.** Implement separate chaining for `int` keys with a fixed number of buckets. Negative keys must work.

```cpp
class ChainedHashSet {
public:
    explicit ChainedHashSet(int numBuckets);
    void add(int key);          // no duplicates
    bool contains(int key) const;
    void remove(int key);
};
// ChainedHashSet s(5); add 12, 7, 22, 3, 17
// contains(17) -> true, contains(2) -> false
// remove(7); contains(7) -> false; add(-3); contains(-3) -> true
```

**E2 (Easy–Medium). A linear-probing map.** Fixed capacity, `int -> int`, no deletion. `get` returns `-1` if the key is missing.

```cpp
class LinearProbingMap {
public:
    explicit LinearProbingMap(int capacity);
    void put(int key, int val);   // insert or update
    int get(int key) const;
};
// capacity 7; put(10,100), put(3,101), put(17,102), put(24,103), put(5,104)
// get(5) -> 104 (stored in slot 0 after wrapping), get(31) -> -1
```

**E3 (Medium). A self-resizing hash map.** Chained `int -> int` map that starts with 4 buckets and doubles + rehashes when, after inserting a **new** key, $\alpha > 0.75$.

```cpp
class ResizingHashMap {
public:
    void put(int key, int value);   // insert or update
    int get(int key) const;         // -1 if missing
    int bucketCount() const;
};
// put keys 1..13 (value = key * 10): bucketCount() goes 4,4,4,8,8,8,16,...,16,32
// get(7) -> 70, get(99) -> -1
```

#### Dry-Run: Answers

**Q1.** All of 12, 7, 22, 17 map to bucket 2 ($12 \bmod 5 = 7 \bmod 5 = 22 \bmod 5 = 17 \bmod 5 = 2$); 3 maps to bucket 3.

| Bucket | Chain |
|--------|-------|
| 0 | (empty) |
| 1 | (empty) |
| 2 | 12 → 7 → 22 → 17 |
| 3 | 3 |
| 4 | (empty) |

`LOOKUP 17`: 4 comparisons (12, 7, 22, 17 ✓). `LOOKUP 2`: $2 \bmod 5 = 2$, so it walks the whole chain — 4 comparisons, then reports "not found". This is the $O(N)$ worst case in miniature: 4 of 5 keys in one chain.

**Q2.** (a) Every key except 5 has home slot $k \bmod 7 = 3$:

| Key | Home | Slots probed | Final slot |
|-----|------|--------------|-----------|
| 10 | 3 | 3 | 3 |
| 3 | 3 | 3, 4 | 4 |
| 17 | 3 | 3, 4, 5 | 5 |
| 24 | 3 | 3, 4, 5, 6 | 6 |
| 5 | 5 | 5, 6, 0 (wraps) | 0 |

Final table: `[5, _, _, 10, 3, 17, 24]`.
(b) $31 \bmod 7 = 3$; it examines slots 3, 4, 5, 6, 0 (all occupied, none equal 31), then slot 1, which is empty → **6 slots examined**. Key 5 was never hashed to 3, yet it extends the cluster: this is the Cluster Problem.

**Q3.** cat → $5 \bmod 8 = 5$, dog → $9 \bmod 8 = 1$, fox → $7 \bmod 8 = 7$. **No collision**: cat and dog differed by exactly 4, so they shared a bucket modulo 4 but separate modulo 8. This is why indices change after a resize (`hash % 8 ≠ hash % 4`) and every key must be rehashed.

**Q4.** Resizes after inserts **#4, #7, and #13**; final size **32 buckets**; **24** elements moved.

| Insert # | Buckets before | $\alpha$ after insert | Resize? | Elements moved |
|----------|---------------|-----------------------|---------|----------------|
| 3 | 4 | 3/4 = 0.75 | no (not > 0.75) | - |
| 4 | 4 | 4/4 = 1.0 | yes → 8 | 4 |
| 6 | 8 | 6/8 = 0.75 | no | - |
| 7 | 8 | 7/8 = 0.875 | yes → 16 | 7 |
| 12 | 16 | 12/16 = 0.75 | no | - |
| 13 | 16 | 13/16 = 0.8125 | yes → 32 | 13 |

Total moves $4 + 7 + 13 = 24 < 2 \times 13$, which is the amortized $O(1)$ argument from Section 5.

**Q5.** Prints `zero 2`. `m["b"]` does not just read: it **inserts** `"b"` with a value-initialized `0`, the comparison is true, and the map now has 2 keys. Using `m.count("b")` or `m.find("b")` would leave the size at 1.

**E1 — reference solution.**

```cpp
class ChainedHashSet {
    vector<list<int>> buckets;
    int index(int key) const {
        int b = buckets.size();
        return ((key % b) + b) % b;          // safe for negative keys
    }
public:
    explicit ChainedHashSet(int numBuckets) : buckets(numBuckets) {}
    void add(int key) {
        list<int>& chain = buckets[index(key)];
        for (int k : chain) if (k == key) return;   // no duplicates
        chain.push_back(key);
    }
    bool contains(int key) const {
        for (int k : buckets[index(key)]) if (k == key) return true;
        return false;
    }
    void remove(int key) { buckets[index(key)].remove(key); }
};
```
Each operation costs $O(1 + \text{chain length})$, i.e. $O(1 + \alpha)$ average. In C++, `-3 % 5 == -3`, so the `((key % b) + b) % b` fix is needed to get bucket 2.

**E2 — reference solution.**

```cpp
class LinearProbingMap {
    vector<int> keys, vals;
    vector<bool> used;
    int cap;
public:
    explicit LinearProbingMap(int capacity)
        : keys(capacity), vals(capacity), used(capacity, false), cap(capacity) {}
    void put(int key, int val) {
        int i = ((key % cap) + cap) % cap;
        for (int step = 0; step < cap; step++) {
            if (!used[i] || keys[i] == key) {      // empty slot or update
                used[i] = true; keys[i] = key; vals[i] = val;
                return;
            }
            i = (i + 1) % cap;                     // probe next slot
        }
        throw runtime_error("table full");
    }
    int get(int key) const {
        int i = ((key % cap) + cap) % cap;
        for (int step = 0; step < cap && used[i]; step++) {
            if (keys[i] == key) return vals[i];
            i = (i + 1) % cap;
        }
        return -1;                                 // hit an empty slot
    }
};
```
$O(1)$ average when $\alpha$ is low; $O(\text{cap})$ worst case. The `step < cap` bound prevents an infinite loop on a full table. (Deletion is omitted on purpose: removing a key would break probe chains unless you use "tombstone" markers, which is why the comparison table lists delete as "Complex".)

**E3 — reference solution.**

```cpp
class ResizingHashMap {
    vector<list<pair<int, int>>> buckets;
    int count = 0;
    int index(int key, int b) const { return ((key % b) + b) % b; }
    void rehash() {
        vector<list<pair<int, int>>> bigger(buckets.size() * 2);
        for (auto& chain : buckets)
            for (auto& kv : chain)
                bigger[index(kv.first, bigger.size())].push_back(kv);  // NEW index
        buckets.swap(bigger);
    }
public:
    ResizingHashMap() : buckets(4) {}
    void put(int key, int value) {
        auto& chain = buckets[index(key, buckets.size())];
        for (auto& kv : chain)
            if (kv.first == key) { kv.second = value; return; }  // update, no growth
        chain.push_back({key, value});
        count++;
        if ((double)count / buckets.size() > 0.75) rehash();
    }
    int get(int key) const {
        for (auto& kv : buckets[index(key, buckets.size())])
            if (kv.first == key) return kv.second;
        return -1;
    }
    int bucketCount() const { return buckets.size(); }
};
```
`put` is $O(1)$ amortized: a rehash costs $O(N)$ but doubling means it happens only $O(\log N)$ times, with total work under $2N$ (see Q4). Updates to existing keys never trigger a resize.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Hashing Internals & Collisions**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 hashing internals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

