# Part 10, Topic 3: Heaps & Priority Queues
## Chapter 1: Heap Properties & Implementation

We already covered *how* to use C++'s `std::priority_queue` in Phase 1. Now, we will look at *how* it works under the hood. You must understand this to solve advanced problems (like finding the median in a data stream).

---

### 1. What is a Heap?

A Heap is a **Complete Binary Tree** that satisfies the Heap Property. It's NOT a BST — the ordering is different!

```
Max-Heap:                 Min-Heap:
     9                        1
    / \                      / \
   8   7                    3   2
  / \ / \                  / \ / \
 5  6 3  4                5  7 8  4

Property:                 Property:
Parent ≥ Children         Parent ≤ Children
Root = MAXIMUM            Root = MINIMUM
```

**Heap vs BST:**
```
BST:                    Heap:
    4                       8
   / \                     / \
  2   6                   5   7
 / \ / \                 / \ / \
1  3 5  7               1  3 4  2

Left < Node < Right     Parent > Both Children
Inorder: sorted!        Level-order: not sorted!
Search: O(log N)        Search: O(N)
```

---

### 2. The Complete Binary Tree Requirement

A **Complete Binary Tree** means every level is completely filled, except possibly the last level, which is filled from left to right. There are no "gaps".

```
Complete:                NOT Complete:
      1                        1
     / \                      / \
    2   3                    2   3
   / \ /                    / \   \
  4  5 6                   4  5   6
                            ↑ gap at 6's left!
Every level filled         Last level not left-aligned
except possibly last,
filled left to right
```

**Why complete?** Because we can store it in an array without gaps!

---

### 3. The Array Representation (The Magic Trick)

Because a Heap is a *complete* tree, we don't actually need to use `TreeNode` pointers! We can store the entire tree inside a flat `vector<int>`.

If a node is at index `i` in the array:
- Its **Left Child** is at index: `2 * i + 1`
- Its **Right Child** is at index: `2 * i + 2`
- Its **Parent** is at index: `(i - 1) / 2`

```
Tree:         9
             / \
            8   7
           / \ / \
          5  6 3  4

Array representation:
Index:  0   1   2   3   4   5   6
Value: [9] [8] [7] [5] [6] [3] [4]

Parent-child relationships:
Node at index 0 (9):
  Left child:  2*0+1 = 1 → value 8
  Right child: 2*0+2 = 2 → value 7

Node at index 1 (8):
  Left child:  2*1+1 = 3 → value 5
  Right child: 2*1+2 = 4 → value 6

Node at index 2 (7):
  Left child:  2*2+1 = 5 → value 3
  Right child: 2*2+2 = 6 → value 4
```

**What's happening:**
```cpp
// The index formulas work because:
// Level 0: 1 node   → indices 0
// Level 1: 2 nodes  → indices 1, 2
// Level 2: 4 nodes  → indices 3, 4, 5, 6
// Level i: 2^i nodes → indices 2^i to 2^(i+1)-1
//
// Left child of i:  2i + 1
// Right child of i: 2i + 2
// Parent of i:      (i - 1) / 2  (integer division)
//
// Example: index 4
//   Left:  2*4+1 = 9
//   Right: 2*4+2 = 10
//   Parent: (4-1)/2 = 1
```

---

### 4. Core Operations

#### Insertion (Heapify-Up): $O(\log N)$

When you push a new element into a Max-Heap:
1. Add it to the very end of the array (the bottom right of the tree).
2. **Sift Up:** Compare it to its parent `(i - 1) / 2`. If it is larger than its parent, swap them! Repeat this until it is smaller than its parent or it becomes the root.

```cpp
// Manual insert into max-heap array
void heapifyUp(vector<int>& heap, int index) {
    while (index > 0) {
        int parent = (index - 1) / 2;
        if (heap[index] > heap[parent]) {
            swap(heap[index], heap[parent]);
            index = parent;
        } else {
            break;  // Heap property restored
        }
    }
}
```

**What's happening:**
```cpp
// Insert 10 into max-heap [9, 8, 7, 5, 6, 3, 4]:
//
// Step 1: Add 10 to end
// [9, 8, 7, 5, 6, 3, 4, 10]
//
//         9
//        / \
//       8   7
//      / \ / \
//     5  6 3  4
//    /
//   10          ← inserted here
//
// Step 2: Sift Up
// Compare 10 with parent (index 7 → parent index (7-1)/2 = 3, value 5)
// 10 > 5 → swap!
// [9, 8, 7, 10, 6, 3, 4, 5]
//
//         9
//        / \
//       8   7
//      / \ / \
//    10  6 3  4
//    /
//   5
//
// Compare 10 with parent (index 3 → parent index (3-1)/2 = 1, value 8)
// 10 > 8 → swap!
// [9, 10, 7, 8, 6, 3, 4, 5]
//
//         9
//        / \
//      10   7
//      / \ / \
//     8  6 3  4
//    /
//   5
//
// Compare 10 with parent (index 1 → parent index (1-1)/2 = 0, value 9)
// 10 > 9 → swap!
// [10, 9, 7, 8, 6, 3, 4, 5]
//
//        10
//        / \
//       9   7
//      / \ / \
//     8  6 3  4
//    /
//   5
//
// 10 is now root → done!
```

**Dry Run Table (Insert 10):**

| Step | Index | Parent Index | heap[index] | heap[parent] | Swap? | Array State |
|------|-------|-------------|-------------|--------------|-------|-------------|
| 1 | 7 | 3 | 10 | 5 | Yes | [9,8,7,10,6,3,4,5] |
| 2 | 3 | 1 | 10 | 8 | Yes | [9,10,7,8,6,3,4,5] |
| 3 | 1 | 0 | 10 | 9 | Yes | [10,9,7,8,6,3,4,5] |
| 4 | 0 | - | 10 | - | Root | Done |

#### Deletion / Extract-Max (Heapify-Down): $O(\log N)$

When you pop the maximum element from a Max-Heap:
1. You cannot just remove index 0, because you'd leave a hole. 
2. Take the very last element in the array and move it to index 0. Remove the last element.
3. **Sift Down:** Compare the new root to its two children. If it is smaller than either child, swap it with the **larger** of the two children. Repeat until it is larger than both children or it hits the bottom.

```cpp
// Manual extract-max from max-heap array
int extractMax(vector<int>& heap) {
    int maxVal = heap[0];
    heap[0] = heap.back();
    heap.pop_back();
    heapifyDown(heap, 0);
    return maxVal;
}

void heapifyDown(vector<int>& heap, int index) {
    int n = heap.size();
    while (true) {
        int largest = index;
        int left = 2 * index + 1;
        int right = 2 * index + 2;
        
        if (left < n && heap[left] > heap[largest]) {
            largest = left;
        }
        if (right < n && heap[right] > heap[largest]) {
            largest = right;
        }
        
        if (largest == index) break;  // Heap property restored
        
        swap(heap[index], heap[largest]);
        index = largest;
    }
}
```

**What's happening:**
```cpp
// Extract max from [10, 9, 7, 8, 6, 3, 4, 5]:
//
// Step 1: Save max (10), move last element (5) to root
// [5, 9, 7, 8, 6, 3, 4]
//
//        5
//        / \
//       9   7
//      / \ / \
//     8  6 3  4
//
// Step 2: Sift Down
// Compare 5 with children (9 and 7)
// Largest child: 9
// 5 < 9 → swap!
// [9, 5, 7, 8, 6, 3, 4]
//
//        9
//        / \
//       5   7
//      / \ / \
//     8  6 3  4
//
// Compare 5 with children (8 and 6)
// Largest child: 8
// 5 < 8 → swap!
// [9, 8, 7, 5, 6, 3, 4]
//
//        9
//        / \
//       8   7
//      / \ / \
//     5  6 3  4
//
// Compare 5 with children (none - it's a leaf)
// No more swaps needed → done!
//
// Return 10
```

**Dry Run Table (Extract Max):**

| Step | Index | Children | Largest Child | Swap? | Array State |
|------|-------|----------|---------------|-------|-------------|
| 1 | 0 | 9, 7 | 9 | Yes | [9,5,7,8,6,3,4] |
| 2 | 1 | 8, 6 | 8 | Yes | [9,8,7,5,6,3,4] |
| 3 | 3 | none | - | No | Done |

#### Heapify (Building a Heap from an Array): $O(N)$

If you are given an unsorted array and want to turn it into a heap, you do NOT call `push()` $N$ times (which would take $O(N \log N)$ time). 
Instead, you start at the lowest non-leaf nodes and perform the "Sift Down" operation. Through mathematical magic, this builds the entire heap in exactly **$O(N)$ time**.
*(In C++, this is built-in as `std::make_heap(nums.begin(), nums.end())`).*

```cpp
// Build max-heap from unsorted array
void buildMaxHeap(vector<int>& heap) {
    int n = heap.size();
    // Start from last non-leaf node and go up
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapifyDown(heap, i);
    }
}
```

**What's happening:**
```cpp
// Array: [4, 1, 3, 2, 16, 9, 10, 14, 8, 7]
// n = 10
// Last non-leaf: n/2 - 1 = 4
//
// Start from index 4 and sift down each:
//
// Index 4 (value 16): children 8, 7
//   16 > 8 and 16 > 7 → no swap needed
//
// Index 3 (value 2): children 14, 8
//   2 < 14 → swap with 14
//   [4, 1, 3, 14, 16, 9, 10, 2, 8, 7]
//
// Index 2 (value 3): children 9, 10
//   3 < 10 → swap with 10
//   [4, 1, 10, 14, 16, 9, 3, 2, 8, 7]
//
// Index 1 (value 1): children 14, 16
//   1 < 16 → swap with 16
//   [4, 16, 10, 14, 1, 9, 3, 2, 8, 7]
//   Continue sift down: 1 vs 8, 7 → swap with 8
//   [4, 16, 10, 14, 8, 9, 3, 2, 1, 7]
//
// Index 0 (value 4): children 16, 10
//   4 < 16 → swap with 16
//   [16, 4, 10, 14, 8, 9, 3, 2, 1, 7]
//   Continue: 4 vs 14, 8 → swap with 14
//   [16, 14, 10, 4, 8, 9, 3, 2, 1, 7]
//   Continue: 4 vs 2, 1 → swap with 2
//   [16, 14, 10, 2, 8, 9, 3, 4, 1, 7]
//
// Final max-heap!
```

---

### 5. The Two-Heap Pattern

This is an advanced architectural pattern used to keep track of the **Median** in a stream of numbers.

If you have a stream of numbers `[1, 5, 2, 8, 3]`, finding the median instantly requires keeping the numbers sorted. Inserting into a sorted array is $O(N)$. 

**The Solution:**
Maintain TWO heaps.
1. A **Max-Heap** to store the smaller half of the numbers.
2. A **Min-Heap** to store the larger half of the numbers.

**The Rule:**
The sizes of the two heaps must never differ by more than 1.
If you insert a number, you put it in the Max-Heap. Then, you pop the top of the Max-Heap and push it to the Min-Heap (to ensure the Min-Heap only holds the largest numbers). Finally, if the Min-Heap is now larger than the Max-Heap, you pop the Min-Heap and push it back to the Max-Heap.

**The Result:**
The middle of the dataset is now split perfectly between the top of the Max-Heap and the top of the Min-Heap! You can find the median in $O(1)$ time by just looking at `.top()`.

```
Stream: [1, 5, 2, 8, 3]

After 1:  MaxHeap=[1]           MinHeap=[]
          Median = 1 (odd count, top of max)

After 5:  MaxHeap=[1]           MinHeap=[5]
          Median = (1+5)/2 = 3 (even count, avg of tops)

After 2:  MaxHeap=[2, 1]        MinHeap=[5]
          Median = 2 (odd count, top of max)

After 8:  MaxHeap=[2, 1]        MinHeap=[5, 8]
          Median = (2+5)/2 = 3.5

After 3:  MaxHeap=[3, 2, 1]     MinHeap=[5, 8]
          Median = 3 (odd count, top of max)
```

---

### 6. C++ Priority Queue

```cpp
#include <queue>

// Default: Max-Heap (largest on top)
priority_queue<int> maxHeap;
maxHeap.push(5);
maxHeap.push(1);
maxHeap.push(10);
maxHeap.top();  // 10

// Min-Heap (smallest on top)
priority_queue<int, vector<int>, greater<int>> minHeap;
minHeap.push(5);
minHeap.push(1);
minHeap.push(10);
minHeap.top();  // 1

// Heap of pairs (sorted by first element)
priority_queue<pair<int, int>> maxHeapPairs;
maxHeapPairs.push({3, 100});
maxHeapPairs.push({1, 200});
maxHeapPairs.top();  // {3, 100} (3 is the key)

// Build heap from array: O(N)
vector<int> nums = {4, 1, 3, 2, 16};
priority_queue<int> heap(nums.begin(), nums.end());
```

---

### 7. Heap Sort

Use heap properties to sort an array in $O(N \log N)$:

```cpp
void heapSort(vector<int>& nums) {
    // Build max-heap: O(N)
    make_heap(nums.begin(), nums.end());
    
    // Extract elements one by one: O(N log N)
    for (int i = nums.size() - 1; i > 0; i--) {
        swap(nums[0], nums[i]);  // Move max to end
        make_heap(nums.begin(), nums.begin() + i);  // Re-heapify
    }
    
    // Result: sorted in ascending order
}
```

---

### Quick Reference Table

| Concept | Detail |
|---------|--------|
| **Heap Property** | Parent ≥ Children (max-heap) or Parent ≤ Children (min-heap) |
| **Complete Tree** | All levels filled, last level left-aligned |
| **Array Index** | Left: `2i+1`, Right: `2i+2`, Parent: `(i-1)/2` |
| **Insert (heapify-up)** | Add to end, swap with parent while larger |
| **Extract (heapify-down)** | Move last to root, swap with larger child |
| **Build Heap** | Start from last non-leaf, sift down each → O(N) |
| **Insert** | O(log N) |
| **Extract-Max/Min** | O(log N) |
| **Peek (top)** | O(1) |
| **Build from array** | O(N) |
| **Heap Sort** | O(N log N) |
| **Space** | O(N) for array storage |
| **C++ container** | `std::priority_queue` |
| **Max-Heap** | `priority_queue<int>` |
| **Min-Heap** | `priority_queue<int, vector<int>, greater<int>>` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Index arithmetic.** A heap is stored in an array of size $n = 12$. (a) What are the left and right child indices of index 5, and do both exist? (b) What is the parent of index 11? (c) At which index does `buildMaxHeap` start its loop, and how many leaves does the tree have?

**Q2. Heapify-up with a tie.** Starting from the chapter's post-insert heap `[10, 9, 7, 8, 6, 3, 4, 5]`, push `9` (append, then call `heapifyUp`). Fill in the dry-run table (Index, Parent Index, `heap[index]`, `heap[parent]`, Swap?) and give the final array.

**Q3. Extract twice.** The chapter extracted 10 from `[10, 9, 7, 8, 6, 3, 4, 5]` and got `[9, 8, 7, 5, 6, 3, 4]`. Call `extractMax` once more on that result. What value is returned, which swaps happen, and what is the final array?

**Q4. Build a heap.** Run `buildMaxHeap` on `[3, 9, 2, 1, 4, 5]`. For each `i` the loop visits, say what `heapifyDown` swaps, and give the final array. How many swaps in total?

**Q5. Two-Heap median.** Apply the chapter's two-heap rule (push to Max-Heap, move Max-Heap's top to Min-Heap, then move back if the Min-Heap is bigger) to the stream `[5, 15, 1, 3]`. Show both heaps and the median after each number.

### Coding Exercises

**E1 (Easy).** Check whether an array is a valid max-heap using only the index formulas.

```cpp
bool isMaxHeap(const vector<int>& a);
// [9, 8, 7, 5, 6, 3, 4]   -> true
// [9, 8, 7, 5, 10]        -> false  (index 4 holds 10, its parent index 1 holds 8)
```

**E2 (Easy–Medium).** The chapter's `heapSort` calls `make_heap` on the shrinking prefix every iteration. Write an in-place heap sort that instead builds the heap once and then repeatedly swaps the root to the end and sifts down **within the shrinking size**. Then state the complexity of the chapter's version.

```cpp
void heapSort(vector<int>& nums);
// [4, 1, 3, 2, 16]            -> [1, 2, 3, 4, 16]
// [3, 9, 2, 1, 4, 5]          -> [1, 2, 3, 4, 5, 9]
```

**E3 (Medium).** Implement a min-heap from scratch on a `vector<int>` (no `priority_queue`, no `<algorithm>` heap functions).

```cpp
class MinHeap {
public:
    void push(int x);
    void pop();          // removes the minimum
    int top() const;     // returns the minimum
    int size() const;
};
// push 5, 1, 10, 3 -> top() == 1
// pop()            -> top() == 3
// pop()            -> top() == 5, size() == 2
```

#### Dry-Run: Answers

**Q1.** (a) Left = $2 \cdot 5 + 1 = 11$ (exists), right = $2 \cdot 5 + 2 = 12$ (does **not** exist, since valid indices are 0–11). (b) Parent of 11 = $(11-1)/2 = 5$. (c) The loop starts at $n/2 - 1 = 5$; indices 6–11 are leaves, so there are **6 leaves** (always $n - \lfloor n/2 \rfloor$).

**Q2.** Final array **`[10, 9, 7, 9, 6, 3, 4, 5, 8]`** — only one swap.

| Step | Index | Parent Index | heap[index] | heap[parent] | Swap? | Array State |
|------|-------|--------------|-------------|--------------|-------|-------------|
| 1 | 8 | 3 | 9 | 8 | Yes | [10,9,7,9,6,3,4,5,8] |
| 2 | 3 | 1 | 9 | 9 | No (`9 > 9` is false) | break |

The strict `>` means equal keys stop sifting, which still satisfies Parent ≥ Children.

**Q3.** Returns **9**; final array **`[8, 6, 7, 5, 4, 3]`**.

| Step | Index | Children (values) | Largest Child | Swap? | Array State |
|------|-------|-------------------|---------------|-------|-------------|
| 0 | — | move last (4) to root | — | — | [4,8,7,5,6,3] |
| 1 | 0 | 8, 7 | 8 (index 1) | Yes | [8,4,7,5,6,3] |
| 2 | 1 | 5, 6 | 6 (index 4) | Yes | [8,6,7,5,4,3] |
| 3 | 4 | none (9 ≥ n = 6) | — | No | Done |

**Q4.** $n = 6$, loop runs `i = 2, 1, 0`. Final array **`[9, 4, 5, 1, 3, 2]`**, **3 swaps**.

| i | Value | Children (values) | Action | Array after |
|---|-------|-------------------|--------|-------------|
| 2 | 2 | index 5 (5) | swap with 5 | [3,9,5,1,4,2] |
| 1 | 9 | 1, 4 | none | [3,9,5,1,4,2] |
| 0 | 3 | 9, 5 | swap with 9 → now at index 1 | [9,3,5,1,4,2] |
| 0 (cont.) | 3 | 1, 4 | swap with 4 → now at index 4, a leaf | [9,4,5,1,3,2] |

**Q5.** Medians: **5, 10, 5, 4**.

| After | Max-Heap (small half) | Min-Heap (large half) | Median |
|-------|-----------------------|-----------------------|--------|
| 5 | [5] | [] | 5 |
| 15 | [5] | [15] | (5 + 15) / 2 = 10 |
| 1 | [5, 1] | [15] | 5 |
| 3 | [3, 1] | [5, 15] | (3 + 5) / 2 = 4 |

Detail for 3: push 3 → Max `[5,3,1]`; move 5 → Min `[5,15]`; Max `[3,1]` has size 2 = Min's size 2, so nothing moves back. Check: sorted `[1,3,5,15]` has median $\frac{3+5}{2} = 4$.

**E1 — reference solution**

```cpp
bool isMaxHeap(const vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        if (a[(i - 1) / 2] < a[i]) return false;   // parent smaller than child
    }
    return true;
}
```

Every non-root index has exactly one parent, so checking each child once covers every edge. Time $O(N)$, space $O(1)$.

**E2 — reference solution**

```cpp
void siftDown(vector<int>& a, int index, int n) {     // only look at a[0..n-1]
    while (true) {
        int largest = index, l = 2 * index + 1, r = 2 * index + 2;
        if (l < n && a[l] > a[largest]) largest = l;
        if (r < n && a[r] > a[largest]) largest = r;
        if (largest == index) break;
        swap(a[index], a[largest]);
        index = largest;
    }
}

void heapSort(vector<int>& nums) {
    int n = nums.size();
    for (int i = n / 2 - 1; i >= 0; i--) siftDown(nums, i, n);  // build: O(N)
    for (int end = n - 1; end > 0; end--) {
        swap(nums[0], nums[end]);       // current max goes to its final slot
        siftDown(nums, 0, end);         // restore heap on the first `end` items
    }
}
```

Time $O(N \log N)$, space $O(1)$. The chapter's loop calls `make_heap` on $i$ elements for $i = N-1, \dots, 1$, and each call is $O(i)$, so it totals $O(N^2)$. It gives the right answer but is slower than heap sort should be. (`std::pop_heap(nums.begin(), nums.begin() + i + 1)` is the $O(\log N)$ library replacement.)

**E3 — reference solution**

```cpp
class MinHeap {
    vector<int> h;
public:
    void push(int x) {
        h.push_back(x);
        int i = h.size() - 1;
        while (i > 0) {                               // heapify-up, comparisons flipped
            int p = (i - 1) / 2;
            if (h[i] < h[p]) { swap(h[i], h[p]); i = p; }
            else break;
        }
    }
    void pop() {
        h[0] = h.back();
        h.pop_back();
        int i = 0, n = h.size();
        while (true) {                                // heapify-down toward the SMALLER child
            int smallest = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && h[l] < h[smallest]) smallest = l;
            if (r < n && h[r] < h[smallest]) smallest = r;
            if (smallest == i) break;
            swap(h[i], h[smallest]);
            i = smallest;
        }
    }
    int top() const { return h[0]; }
    int size() const { return h.size(); }
};
```

Trace: pushes give `[5]`, `[1,5]`, `[1,5,10]`, `[1,3,10,5]`. `pop()` moves 5 to the root → `[5,3,10]` → swap with 3 → `[3,5,10]`. `pop()` moves 10 to the root → `[10,5]` → swap → `[5,10]`. `push`/`pop` are $O(\log N)$, `top` is $O(1)$. (`pop`/`top` assume the heap is non-empty.)

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Heap Properties & Implementation**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 heap properties** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

