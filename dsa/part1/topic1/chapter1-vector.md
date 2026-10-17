# Part 1, Topic 1: C++ STL Essentials
## Chapter 1: `vector<T>`

In a technical interview, you need an array that can grow and shrink dynamically without you worrying about memory allocation. That is what `std::vector` does. It is your default data structure. If you need a list of things, use a `vector`.

---

### 1. What is a Vector?

A `vector` is a dynamic array stored in **contiguous memory**. It knows its own size, can grow automatically, and gives you $O(1)$ random access — just like a raw C array, but without the danger.

```
Memory layout of vector<int> v = {10, 20, 30, 40, 50}:

 Index:   [0]   [1]   [2]   [3]   [4]
         +-----+-----+-----+-----+-----+
 Value:  |  10 |  20 |  30 |  40 |  50 |
         +-----+-----+-----+-----+-----+
          ^                                     ^
          |                                     |
          start ptr                          end ptr

 size() = 5
 capacity() = 5 (or more, depending on allocator)
```

### 2. The Core Operations

```cpp
#include <vector>
#include <iostream>

using namespace std;

int main() {
    // Initialization (4 ways)
    vector<int> nums;                    // Empty vector
    vector<int> zeros(5, 0);             // [0, 0, 0, 0, 0] — 5 zeros
    vector<int> primes = {2, 3, 5, 7};   // Initializer list
    vector<int> copy(primes);             // Copy of another vector

    // Adding and Removing from the END
    nums.push_back(10); // Adds 10 to the end. Time: O(1) amortized
    nums.push_back(20);
    nums.pop_back();    // Removes the last element (20). Time: O(1)

    // Accessing Elements
    cout << primes[0];       // 2 (No bounds checking, faster)
    cout << primes.front();  // 2 (First element)
    cout << primes.back();   // 7 (Last element)

    // Sizing
    int s = primes.size();      // Returns 4. Time: O(1)
    bool isEmp = primes.empty(); // Returns false. Time: O(1)
}
```

**What's happening:**
```cpp
vector<int> primes = {2, 3, 5, 7};
//                  ^^^^^^^^^^^^^^
//                  Initializer list syntax (C++11+)
//                  Vector is created with 4 elements
//
// primes[0] = 2, primes[1] = 3, primes[2] = 5, primes[3] = 7
// primes.size() returns 4 (number of elements)
// primes.empty() returns false (size > 0)

nums.push_back(10);
//  Before: nums = []        (size=0, capacity=0)
//  After:  nums = [10]      (size=1, capacity=1 or more)

nums.push_back(20);
//  Before: nums = [10]      (size=1)
//  After:  nums = [10, 20]   (size=2)

nums.pop_back();
//  Before: nums = [10, 20]  (size=2)
//  After:  nums = [10]      (size=1)
//  Returns: nothing (void)
```

### 3. Capacity vs Size — The Hidden Trap

Many beginners confuse `size()` and `capacity()`. They are **not** the same thing.

```
vector<int> v;
v.push_back(1);  // size=1, capacity=1
v.push_back(2);  // size=2, capacity=2  (or 4, implementation-dependent)
v.push_back(3);  // size=3, capacity=4  (allocated extra room)
v.push_back(4);  // size=4, capacity=4
v.push_back(5);  // size=5, capacity=8  (doubled!)

 Memory layout after push_back(5):

 capacity=8 slots:
 +----+----+----+----+----+----+----+----+
 |  1 |  2 |  3 |  4 |  5 | ?? | ?? | ?? |
 +----+----+----+----+----+----+----+----+
  |____________________________|
         size = 5 (used)

 The last 3 slots are allocated but unused (wasted space).
```

```cpp
vector<int> v;
v.push_back(1);
v.push_back(2);
v.push_back(3);

cout << "Size: " << v.size() << endl;       // 3
cout << "Capacity: " << v.capacity() << endl; // Probably 4 (doubled from 1)

// Why this matters: If you know you need 1000 elements, reserve first!
v.reserve(1000); // Allocates memory for 1000 elements upfront
// Now push_back is truly O(1) — no reallocation needed
```

**What's happening:**
```cpp
// When you push_back and size == capacity, the vector must:
// 1. Allocate a NEW, larger block of memory (usually 2x)
// 2. Copy ALL existing elements to the new block
// 3. Destroy the old block
// This is O(N) — but it happens rarely enough that amortized cost is O(1)
//
// reserve(1000) pre-allocates, so push_back never triggers reallocation
// until you exceed 1000 elements.
```

### 4. Operations to Avoid (If Possible)

Adding or removing from the *end* of a vector is incredibly fast. However, adding or removing from the *front* or *middle* is terrible for performance.

```cpp
vector<int> nums = {1, 2, 3, 4, 5};

// ERASING
// Erasing the element at index 1 (the number 2).
// Time: O(N). Why? Because 3, 4, and 5 all have to be shifted left in memory!
nums.erase(nums.begin() + 1);

// INSERTING
// Inserting 99 at index 0.
// Time: O(N). Why? Because every existing element must be shifted right!
nums.insert(nums.begin(), 99);
```

**What's happening (Erase):**
```
Before erase: nums = {1, 2, 3, 4, 5}
                     ^-- erase this (index 1)

Step 1: Element 2 is removed
Step 2: Elements 3, 4, 5 shift LEFT by one position

After erase:  nums = {1, 3, 4, 5}
                                      
All 3 elements after the erased one had to move. That's O(N).
```

**What's happening (Insert):**
```
Before insert: nums = {1, 2, 3, 4, 5}
                    ^-- insert 99 at this position (index 0)

Step 1: 5, 4, 3, 2 shift RIGHT by one position to make room
Step 2: 99 is placed at index 0

After insert:  nums = {99, 1, 2, 3, 4, 5}

All 5 elements had to move. That's O(N).
```

*Interview Tip:* If you find yourself repeatedly pushing to the front or erasing from the front of a `vector`, you are using the wrong data structure. You probably need a `queue`, `deque`, or `list`.

### 5. Iterating

There are three primary ways to loop through a vector. Each has its use case.

**Index-based (When you need the index `i`):**
```cpp
for (int i = 0; i < nums.size(); i++) {
    cout << "Index " << i << " has value " << nums[i] << endl;
}
```

**Range-based (When you only need the values):**
```cpp
// By Value (Makes a copy, safe but slower for large objects)
for (int num : nums) {
    cout << num << endl;
}

// By Reference (Does NOT make a copy, faster, allows modification)
for (int& num : nums) {
    num *= 2; // This actually modifies the elements in the vector!
}

// By Const Reference (Fastest read-only method, standard practice)
for (const int& num : nums) {
    cout << num << endl;
}
```

**Iterator-based (When you need iterators for STL functions):**
```cpp
for (auto it = nums.begin(); it != nums.end(); ++it) {
    cout << *it << endl;  // Dereference iterator to get value
}
```

**What's happening:**
```
Iteration comparison:

 nums = {10, 20, 30}

 Index-based:         Range-based (const ref):    Iterator-based:
 i=0 → nums[0]=10    num=10                       *it=10
 i=1 → nums[1]=20    num=20                       *it=20
 i=2 → nums[2]=30    num=30                       *it=30

 Speed ranking (fastest to slowest for read-only):
 1. for (const int& num : nums)  — No copy, no index math
 2. for (int i = ...) nums[i]    — Index math per iteration
 3. for (int num : nums)         — Copies each element (slow for large types)
```

### 6. Removing Elements by Value

There is no direct "remove value" function in a vector. The standard pattern is `erase-remove` idiom:

```cpp
vector<int> nums = {1, 2, 3, 2, 4, 2, 5};

// Remove ALL occurrences of the value 2
// remove() moves non-2 elements to the front, returns iterator to new "end"
// erase() actually shrinks the vector
nums.erase(remove(nums.begin(), nums.end(), 2), nums.end());

// Result: {1, 3, 4, 5}
```

**What's happening:**
```
Step 1 — remove(2) rearranges elements:
 Before: {1, 2, 3, 2, 4, 2, 5}
          ^  ^  ^  ^  ^  ^  ^
          keep skip keep skip keep skip keep

 After:  {1, 3, 4, 5, 2, 2, 5}  ← garbage at the end
          ^
          iterator returned by remove()

Step 2 — erase() chops off the garbage tail:
 After:  {1, 3, 4, 5}
```

### 7. 2D Vectors (Vectors of Vectors)

Extremely common in graph/matrix problems:

```cpp
// Creating a 3x4 grid filled with zeros
int rows = 3, cols = 4;
vector<vector<int>> grid(rows, vector<int>(cols, 0));

// Accessing elements
grid[1][2] = 5; // Set row 1, col 2 to 5

// Building an adjacency list for a graph
vector<vector<int>> adj(5); // 5 nodes (0-4)
adj[0].push_back(1); // Edge from 0 to 1
adj[0].push_back(3); // Edge from 0 to 3
adj[1].push_back(2); // Edge from 1 to 2
```

**What's happening:**
```
grid (3x4):
 Row 0: [0, 0, 0, 0]
 Row 1: [0, 0, 5, 0]    ← grid[1][2] = 5
 Row 2: [0, 0, 0, 0]

adj (5 nodes, adjacency list):
 Node 0: → [1, 3]       (connected to 1 and 3)
 Node 1: → [2]          (connected to 2)
 Node 2: → []           (no outgoing edges)
 Node 3: → []
 Node 4: → []
```

### 8. Common Mistakes and How to Avoid Them

```cpp
// MISTAKE 1: Accessing out of bounds
vector<int> v = {1, 2, 3};
// cout << v[10];  // Undefined behavior! Could crash or return garbage.
// FIX: Use v.at(10) which throws an exception, or check v.size() first.

// MISTAKE 2: Invalidating iterators after insert/erase
vector<int> v = {1, 2, 3, 4, 5};
for (auto it = v.begin(); it != v.end(); ++it) {
    if (*it == 3) {
        v.erase(it); // BUG! 'it' is now invalid — UB!
    }
}
// FIX: erase() returns an iterator to the next element
for (auto it = v.begin(); it != v.end(); ) {
    if (*it == 3) {
        it = v.erase(it);  // Correct: reassign to valid iterator
    } else {
        ++it;
    }
}

// MISTAKE 3: Using [] on empty vector
vector<int> v;
// int x = v[0];  // Undefined behavior!
// FIX: Always check v.empty() or v.size() before accessing.
```

### 9. Vector vs Other Containers — When to Use What

| Need | Use | Why |
|------|-----|-----|
| Dynamic array, random access | `vector` | $O(1)$ access, cache-friendly |
| Insert/remove at front | `deque` or `list` | `vector` is $O(N)$ at front |
| Frequent insert/remove in middle | `list` | $O(1)$ splice, but no random access |
| Sorted unique elements | `set` | Auto-sorted, $O(\log N)$ operations |
| Key-value lookup | `unordered_map` | $O(1)$ average lookup |
| Stack behavior | `stack` | LIFO, $O(1)$ push/pop |
| Queue behavior | `queue` | FIFO, $O(1)$ push/pop |

### Summary of Big O

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Access `[i]` | $O(1)$ | Random access |
| `push_back()` / `pop_back()` | $O(1)$ amortized | Amortized due to occasional reallocation |
| `insert()` / `erase()` in middle | $O(N)$ | Elements must shift |
| `insert()` / `erase()` at front | $O(N)$ | All elements shift |
| `size()` / `empty()` | $O(1)$ | Stored as a member variable |
| `clear()` | $O(N)$ | Must destroy each element |
| `find()` (linear search) | $O(N)$ | Not built-in; use std::find |
| `reserve()` | $O(N)$ | One-time allocation, avoids future reallocs |

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `vector<int> v;` | Create empty vector |
| `vector<int> v(n, val);` | Create vector of `n` copies of `val` |
| `vector<int> v = {1,2,3};` | Initialize with list |
| `v.push_back(x)` | Add `x` to end |
| `v.pop_back()` | Remove last element |
| `v[i]` | Access element at index `i` (no bounds check) |
| `v.at(i)` | Access element at index `i` (throws if out of bounds) |
| `v.front()` | First element |
| `v.back()` | Last element |
| `v.size()` | Number of elements |
| `v.empty()` | `true` if size is 0 |
| `v.clear()` | Remove all elements |
| `v.erase(it)` | Remove element at iterator |
| `v.insert(it, val)` | Insert `val` before iterator |
| `v.reserve(n)` | Pre-allocate memory for `n` elements |
| `v.resize(n)` | Change size (adds zeros or truncates) |
| `v.begin()` / `v.end()` | Iterators for loops |
| `v1 == v2` | Element-wise equality comparison |

---

## Practice & Self-Check

Trace each question on paper by redrawing the vector's boxes after every line. Then check yourself against the answers at the end.

### Predict the Output / Trace by Hand

**Q1. A sequence of edits.** What are the contents, `front()`, `back()` and `size()` at the end? How many existing elements had to shift during the `insert`, and how many during the `erase`?

```cpp
vector<int> v = {4, 8, 15};
v.push_back(16);
v.push_back(23);
v.pop_back();
v.insert(v.begin() + 1, 42);
v.erase(v.begin() + 3);
```

**Q2. Erase-remove on new data.** What does `nums` hold afterwards, and what is `nums.size()`?

```cpp
vector<int> nums = {5, 1, 5, 5, 2, 5};
nums.erase(remove(nums.begin(), nums.end(), 5), nums.end());
```

**Q3. Copy vs. reference in range-for.** What is printed?

```cpp
vector<int> nums = {1, 2, 3};
for (int x : nums)  x *= 10;
for (int& x : nums) x += 1;
for (const int& x : nums) cout << x << " ";
```

**Q4. 2D vectors are vectors of independent rows.** What do the four values print?

```cpp
vector<vector<int>> grid(2, vector<int>(3, 7));
grid[1][0] = 0;
grid[0].push_back(9);

int total = 0;
for (const auto& row : grid)
    for (int x : row) total += x;

cout << grid.size() << " " << grid[0].size() << " "
     << grid[1].size() << " " << total << "\n";
```

**Q5. Counting reallocations.** Assume the pure doubling policy from Section 3 (capacity goes $1 \to 2 \to 4 \to 8 \to \dots$) and **no** `reserve`. You `push_back` 10 elements into an empty vector. After the very first allocation, how many times does the vector grow, how many element copies happen in total, and what is the final `capacity()`?

### Coding Exercises

**E1 (Easy). Transpose a grid.** Write `vector<vector<int>> transpose(const vector<vector<int>>& g)` for a non-empty rectangular grid with $R$ rows and $C$ columns. The result has $C$ rows and $R$ columns, with `result[j][i] == g[i][j]`.
- `{{1, 2, 3}, {4, 5, 6}}` returns `{{1, 4}, {2, 5}, {3, 6}}`
- `{{7}}` returns `{{7}}`

**E2 (Easy–Medium). De-duplicate a sorted vector in place.** Write `int dedupSorted(vector<int>& v)` that removes repeated values from a **sorted** vector in $O(N)$ time and $O(1)$ extra space (no `erase` inside a loop), shrinks it with `resize`, and returns the new size.
- `{1, 1, 2, 3, 3, 3, 4}` becomes `{1, 2, 3, 4}`, returns `4`
- `{}` stays `{}`, returns `0`

**E3 (Medium). Rotate right by k.** Write `vector<int> rotateRight(const vector<int>& v, int k)` that returns a new vector where every element moved `k` positions to the right, wrapping around the end. `k` can be larger than `v.size()`.
- `{1, 2, 3, 4, 5}`, `k = 2` returns `{4, 5, 1, 2, 3}`
- `{1, 2, 3, 4, 5}`, `k = 7` returns `{4, 5, 1, 2, 3}`

#### Dry-Run: Answers

**Q1.** Final `v = {4, 42, 8, 16}`, `front() == 4`, `back() == 16`, `size() == 4`. The `insert` shifted **3** elements; the `erase` shifted **1**.

| Line | `v` after | Elements shifted |
|------|-----------|------------------|
| start | `{4, 8, 15}` | — |
| `push_back(16)` | `{4, 8, 15, 16}` | 0 |
| `push_back(23)` | `{4, 8, 15, 16, 23}` | 0 |
| `pop_back()` | `{4, 8, 15, 16}` | 0 |
| `insert(begin()+1, 42)` | `{4, 42, 8, 15, 16}` | 3 (`8, 15, 16` move right) |
| `erase(begin()+3)` | `{4, 42, 8, 16}` | 1 (`16` moves left) |

`v.begin() + 3` is evaluated **after** the insert, so it points at `15` (index 3 of `{4, 42, 8, 15, 16}`).

**Q2.** `nums == {1, 2}`, `nums.size() == 2`. `remove` walks left to right and copies every kept element (`1`, then `2`) to the front, returning an iterator to index 2. The tail after that iterator holds leftover values whose contents you must not rely on; `erase` chops it off.

**Q3.** Prints `2 3 4`. The first loop multiplies **copies** (`x` is a fresh `int` each iteration), so `nums` is unchanged. The second loop binds `x` to each real element and adds 1: `{2, 3, 4}`.

**Q4.** Prints `2 4 3 44`.

| Row | Contents | Size | Sum |
|-----|----------|------|-----|
| `grid[0]` | `{7, 7, 7, 9}` | 4 | 30 |
| `grid[1]` | `{0, 7, 7}` | 3 | 14 |

`grid.size()` counts rows (2). Each row is its own vector, so `push_back` on row 0 does not change row 1. Total $= 30 + 14 = 44$.

**Q5.** **4** growths, **15** copies, final capacity **16**.

| Push # | size before | capacity before | Grows to | Copies |
|--------|-------------|-----------------|----------|--------|
| 1 | 0 | 0 | 1 (first allocation) | 0 |
| 2 | 1 | 1 | 2 | 1 |
| 3 | 2 | 2 | 4 | 2 |
| 5 | 4 | 4 | 8 | 4 |
| 9 | 8 | 8 | 16 | 8 |

Copies $= 1 + 2 + 4 + 8 = 15 < 2 \times 10$. That bound ($< 2N$ copies for $N$ pushes) is exactly why `push_back` is $O(1)$ amortized. With `reserve(10)` first, there would be 0 copies.

**E1 — reference solution**

```cpp
#include <vector>
using namespace std;

vector<vector<int>> transpose(const vector<vector<int>>& g) {
    int R = g.size();
    int C = g[0].size();
    vector<vector<int>> result(C, vector<int>(R));
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            result[j][i] = g[i][j];
        }
    }
    return result;
}
```

$O(R \times C)$ time and space. Pre-sizing with `vector<vector<int>>(C, vector<int>(R))` avoids any `push_back` reallocations.

**E2 — reference solution**

```cpp
#include <vector>
using namespace std;

int dedupSorted(vector<int>& v) {
    if (v.empty()) return 0;
    int write = 1;                       // v[0] is always kept
    for (int read = 1; read < (int)v.size(); read++) {
        if (v[read] != v[write - 1]) {   // new value: keep it
            v[write] = v[read];
            write++;
        }
    }
    v.resize(write);                     // chop the tail in one O(N) step
    return write;
}
```

$O(N)$ time, $O(1)$ extra space. Calling `erase` on each duplicate would shift the tail every time and cost $O(N^2)$ in the worst case. Trace on `{1, 1, 2, 3, 3, 3, 4}`: kept values are written to indices 1, 2, 3 as `2, 3, 4`, so `write` ends at 4.

**E3 — reference solution**

```cpp
#include <vector>
using namespace std;

vector<int> rotateRight(const vector<int>& v, int k) {
    int n = v.size();
    if (n == 0) return {};
    k %= n;                               // k = 7, n = 5  ->  k = 2
    vector<int> result(n);
    for (int i = 0; i < n; i++) {
        result[(i + k) % n] = v[i];
    }
    return result;
}
```

$O(N)$ time, $O(N)$ extra space. Trace for `k = 2`: `1` goes to index 2, `2` to 3, `3` to 4, `4` to $(3 + 2) \bmod 5 = 0$, `5` to $(4 + 2) \bmod 5 = 1$, giving `{4, 5, 1, 2, 3}`. Inserting at the front `k` times would cost $O(N \times k)$ instead.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: `vector<T>`**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 vector** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

