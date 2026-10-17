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

