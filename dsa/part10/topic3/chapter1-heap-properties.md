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

