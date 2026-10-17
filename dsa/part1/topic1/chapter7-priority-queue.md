# Part 1, Topic 1: C++ STL Essentials
## Chapter 7: `priority_queue`

A Priority Queue is a data structure that automatically keeps its elements sorted. Unlike a standard queue (FIFO), the element that is popped is **always the "highest priority" element**.

Under the hood, a `priority_queue` is implemented as a **Heap**.
*Interview Trigger:* Whenever a problem asks for the "Top K", "Kth largest", or "Kth smallest" elements, you must immediately use a `priority_queue`.

---

### 1. What is a Heap?

A heap is a **complete binary tree** stored in an array. It has one key property: every parent is larger (max-heap) or smaller (min-heap) than its children.

```
Max-Heap array: {50, 30, 40, 10, 20, 35}

As a tree:

            50
          /    \
        30      40
       /  \    /  \
     10   20  35

Array indices:
  0   1   2   3   4   5
 [50][30][40][10][20][35]

Parent-child formulas (0-indexed):
  Parent of i:      (i - 1) / 2
  Left child of i:  2*i + 1
  Right child of i: 2*i + 2

  Example: node at index 1 (value 30)
    Parent: (1-1)/2 = 0 → value 50 ✓ (30 < 50)
    Left:   2*1+1 = 3   → value 10 ✓ (30 > 10)
    Right:  2*1+2 = 4   → value 20 ✓ (30 > 20)
```

### 2. Max-Heap (The Default)

By default, C++ creates a Max-Heap. This means the **largest** element is always at the top.

```cpp
#include <queue>
#include <iostream>

using namespace std;

int main() {
    priority_queue<int> maxHeap;

    // Insertion: O(log N)
    maxHeap.push(10);
    maxHeap.push(50);
    maxHeap.push(20);
    maxHeap.push(40);

    // Peeking at the largest element: O(1)
    cout << maxHeap.top(); // 50

    // Removing the largest element: O(log N)
    maxHeap.pop();
    cout << maxHeap.top(); // 40
}
```

**What's happening:**
```
maxHeap.push(10):  [10]
maxHeap.push(50):  [50, 10]           → bubble up 50
maxHeap.push(20):  [50, 10, 20]       → 20 is child of 50, OK
maxHeap.push(40):  [50, 40, 20, 10]   → bubble up 40 (swaps with 10)

Tree after all pushes:
        50
       /  \
     40    20
    /
  10

maxHeap.top() → 50 (root, always max)

maxHeap.pop():
  Remove 50, move last element 10 to root, bubble down (swap with 40):
        40
       /  \
     10    20

  top() → 40
```

**Dry-run table:**

| Step | Operation | Heap State (array) | Tree Root | `top()` |
|------|-----------|---------------------|-----------|---------|
| 1 | `push(10)` | `[10]` | 10 | — |
| 2 | `push(50)` | `[50, 10]` | 50 | — |
| 3 | `push(20)` | `[50, 10, 20]` | 50 | — |
| 4 | `push(40)` | `[50, 40, 20, 10]` | 50 | — |
| 5 | `top()` | `[50, 40, 20, 10]` | 50 | `50` |
| 6 | `pop()` | `[40, 10, 20]` | 40 | — |
| 7 | `top()` | `[40, 10, 20]` | 40 | `40` |

### 3. Min-Heap (The Tricky Syntax)

Often, you need the **smallest** element to be at the top (e.g., finding the Kth *largest* element efficiently requires a Min-Heap of size K).

The syntax to create a Min-Heap in C++ is notoriously ugly. You must memorize it.

```cpp
#include <queue>
#include <vector>

using namespace std;

int main() {
    // MEMORIZE THIS SYNTAX:
    priority_queue<int, vector<int>, greater<int>> minHeap;

    minHeap.push(10);
    minHeap.push(50);
    minHeap.push(20);

    // The SMALLEST element is now on top
    cout << minHeap.top(); // 10
}
```

**What's happening:**
```
priority_queue<int, vector<int>, greater<int>>
              ^      ^              ^
              |      |              └── Comparator: put smaller on top
              |      └── Underlying container
              └── Element type

  Default (max-heap): priority_queue<int>
    → Uses less<int> → larger elements bubble up

  Min-heap:           priority_queue<int, vector<int>, greater<int>>
    → Uses greater<int> → smaller elements bubble up

  minHeap.push(10):  [10]
  minHeap.push(50):  [10, 50]
  minHeap.push(20):  [10, 50, 20]

  Tree:
      10
     /  \
   50    20

  minHeap.top() → 10 (smallest, not largest!)
```

### 4. Storing Custom Pairs in a Heap

Often, you don't just want to sort plain integers. You want to sort objects, like `(Distance, NodeID)` in Dijkstra's algorithm.

You can push `pair`s into a `priority_queue`. By default, C++ will sort the pairs based on the **first element** of the pair. If there is a tie, it falls back to sorting by the second element.

```cpp
#include <queue>
#include <utility>
#include <iostream>

using namespace std;

int main() {
    // Min-Heap storing Pairs
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;

    // Pushing {Distance, NodeID}
    pq.push({10, 1});
    pq.push({2, 5});
    pq.push({5, 3});

    // The top element is the one with the smallest Distance
    auto [dist, node] = pq.top();
    // dist = 2, node = 5
}
```

**What's happening:**
```
priority_queue stores pairs, sorted by .first (distance):

  push({10,1}):  [{10, 1}]
  push({2,5}):   [{2, 5}, {10, 1}]    → bubble up {2,5}
  push({5,3}):   [{2, 5}, {10, 1}, {5, 3}]

  Tree:
          {2, 5}
         /      \
    {10, 1}    {5, 3}

  top() → {2, 5}  (smallest distance first)

  pair comparison:
    {2,5} < {5,3} because 2 < 5
    {2,5} < {10,1} because 2 < 10
    If distances equal: {2,3} < {2,5} because 3 < 5
```

### 5. Custom Comparator for Structs

When sorting complex objects, define a comparator struct:

```cpp
struct Task {
    string name;
    int priority;
};

// For max-heap (higher priority first)
struct CompareTask {
    bool operator()(const Task& a, const Task& b) {
        return a.priority < b.priority;  // < for max-heap
    }
};

// For min-heap (lower priority first)
struct CompareTaskMin {
    bool operator()(const Task& a, const Task& b) {
        return a.priority > b.priority;  // > for min-heap
    }
};

int main() {
    priority_queue<Task, vector<Task>, CompareTask> maxPQ;
    maxPQ.push({"Low", 1});
    maxPQ.push({"High", 10});
    maxPQ.push({"Medium", 5});

    cout << maxPQ.top().name; // "High" (priority 10)
}
```

**What's happening:**
```
CompareTask: a.priority < b.priority
  → "should a go BELOW b?"
  → If a.priority is smaller, yes → so larger values float up
  → This creates a MAX-heap

CompareTaskMin: a.priority > b.priority
  → "should a go BELOW b?"
  → If a.priority is larger, yes → so smaller values float up
  → This creates a MIN-heap

Memory layout:
  Task{"Low", 1}    Task{"High", 10}    Task{"Medium", 5}
  ┌─────────────┐   ┌──────────────┐    ┌──────────────┐
  │ name="Low"  │   │ name="High"  │    │ name="Medium"│
  │ priority=1  │   │ priority=10  │    │ priority=5   │
  └─────────────┘   └──────────────┘    └──────────────┘
```

### 6. Lambda Comparator (Modern C++)

```cpp
int main() {
    // Lambda for min-heap of pairs
    auto cmp = [](pair<int,string>& a, pair<int,string>& b) {
        return a.first > b.first;  // > for min-heap
    };
    priority_queue<pair<int,string>, vector<pair<int,string>>, decltype(cmp)> pq(cmp);

    pq.push({3, "A"});
    pq.push({1, "C"});
    pq.push({2, "B"});

    cout << pq.top().first; // 1 (smallest first)
}
```

**What's happening:**
```
decltype(cmp) tells the compiler the type of the lambda
We must pass `cmp` to the constructor because lambdas with captures need runtime initialization

  pq.push({3,"A"}):  [{3,"A"}]
  pq.push({1,"C"}):  [{1,"C"}, {3,"A"}]
  pq.push({2,"B"}):  [{1,"C"}, {3,"A"}, {2,"B"}]

  top() → {1,"C"} (smallest .first)
```

### 7. Priority Queue Method Complexity Table

| Method | Time | Space | Notes |
|--------|------|-------|-------|
| `push(val)` | $O(\log N)$ | $O(1)$ | Insert + bubble up |
| `pop()` | $O(\log N)$ | $O(1)$ | Remove root + heapify |
| `top()` | $O(1)$ | $O(1)$ | Return root (max or min) |
| `size()` | $O(1)$ | $O(1)$ | Stored member |
| `empty()` | $O(1)$ | $O(1)$ | Returns bool |
| `swap(other)` | $O(1)$ | $O(1)$ | Swaps with another heap |

```
Why O(log N) for push/pop?

Push: add element at end, bubble up tree
  Height of complete binary tree = log(N)
  Each bubble-up step = O(1)
  Total = O(log N)

Pop: remove root, move last element to root, bubble down
  Each bubble-down step = O(1)
  At most log(N) levels
  Total = O(log N)
```

### 8. Common Interview Pattern: Top K Elements

```cpp
// Find K largest elements from an array
vector<int> topK(vector<int>& nums, int k) {
    // Min-heap of size K
    priority_queue<int, vector<int>, greater<int>> minHeap;

    for (int num : nums) {
        minHeap.push(num);
        if (minHeap.size() > k) {
            minHeap.pop();  // Remove smallest of the K
        }
    }

    vector<int> result;
    while (!minHeap.empty()) {
        result.push_back(minHeap.top());
        minHeap.pop();
    }
    return result;
}
```

**What's happening:**
```
nums = {3, 1, 5, 12, 2, 11}, k = 3

Processing:
  num=3:  heap=[3]             size=1 ≤ 3, keep
  num=1:  heap=[1,3]           size=2 ≤ 3, keep
  num=5:  heap=[1,3,5]         size=3 ≤ 3, keep
  num=12: heap=[1,3,5,12]      size=4 > 3, pop 1 → heap=[3,5,12]
  num=2:  heap=[2,3,5,12]      size=4 > 3, pop 2 → heap=[3,5,12]
  num=11: heap=[3,5,11,12]     size=4 > 3, pop 3 → heap=[5,11,12]

Final heap: [5, 11, 12] (3 largest elements)

Why min-heap for "K largest"?
  - Keep only K elements in heap at a time
  - Min-heap means smallest is at top → easy to evict
  - Anything smaller than the min of our K elements is irrelevant
```

### 9. Common Interview Pattern: Kth Largest Element

```cpp
int findKthLargest(vector<int>& nums, int k) {
    // Min-heap of size K → top is Kth largest
    priority_queue<int, vector<int>, greater<int>> minHeap;

    for (int num : nums) {
        minHeap.push(num);
        if (minHeap.size() > k) {
            minHeap.pop();
        }
    }
    return minHeap.top();
}
```

**Dry-run table:**

| Step | `num` | Heap State | `size()` | Action | `top()` |
|------|-------|------------|----------|--------|---------|
| 1 | 3 | `[3]` | 1 | keep | 3 |
| 2 | 1 | `[1, 3]` | 2 | keep | 1 |
| 3 | 5 | `[1, 3, 5]` | 3 | keep | 1 |
| 4 | 12 | `[3, 5, 12]` | 3 | pop 1 | 3 |
| 5 | 2 | `[3, 5, 12]` | 3 | pop 2 | 3 |
| 6 | 11 | `[5, 11, 12]` | 3 | pop 3 | 5 |

Result: `top()` = 5 (3rd largest)

### 10. Common Mistakes

```cpp
// MISTAKE 1: Using max-heap when you need min-heap
priority_queue<int> maxHeap;
maxHeap.push(3); maxHeap.push(1); maxHeap.push(5);
cout << maxHeap.top(); // 5 (LARGEST, not smallest!)

// FIX: Use min-heap syntax for Kth largest problems
priority_queue<int, vector<int>, greater<int>> minHeap;

// MISTAKE 2: Forgetting the min-heap syntax template params
// priority_queue<int, greater<int>> pq;  // WRONG! Missing vector<int>

// CORRECT:
priority_queue<int, vector<int>, greater<int>> pq;

// MISTAKE 3: Using pop() without checking empty()
priority_queue<int> pq;
// pq.pop();  // UNDEFINED BEHAVIOR!

// MISTAKE 4: Using pop() return value
// int val = pq.pop();  // WRONG: pop() returns void!
int val = pq.top();    // Get value first
pq.pop();              // Then remove

// MISTAKE 5: Modifying elements inside the heap
// priority_queue doesn't support iterators
// You cannot change a priority after insertion
// You must pop and re-push with new priority
```

### 11. When to Use Which

```
Interview Trigger Words → Use priority_queue:

  "Top K"          → Min-heap of size K (returns K largest)
  "Kth largest"    → Min-heap of size K (top = answer)
  "Kth smallest"   → Max-heap of size K (top = answer)
  "Median"         → Two heaps (max-heap + min-heap)
  "Merge K lists"  → Min-heap of K heads
  "Task scheduler" → Max-heap by priority
  "Dijkstra"       → Min-heap of (distance, node)

  When NOT to use:
  "Sorted order"     → Use sort()
  "All elements"     → Use sort()
  "Deletion by value" → Use set or map
```

### Summary of Big O
- `top()`: **$O(1)$**
- `push()`: **$O(\log N)$** (where N is the current size of the heap)
- `pop()`: **$O(\log N)$**

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `priority_queue<int> pq;` | Create max-heap |
| `priority_queue<int, vector<int>, greater<int>> pq;` | Create min-heap |
| `pq.push(val)` | Insert element |
| `pq.pop()` | Remove top element (void) |
| `pq.top()` | Return reference to top element |
| `pq.size()` | Number of elements |
| `pq.empty()` | `true` if heap is empty |
| `priority_queue<Task, vector<Task>, CompareTask> pq;` | Custom comparator |
| `priority_queue<T, vector<T>, decltype(cmp)> pq(cmp);` | Lambda comparator |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 7: `priority_queue`**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter7 priority queue** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

