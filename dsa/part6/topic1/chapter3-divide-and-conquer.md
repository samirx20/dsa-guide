# Part 6, Topic 1: Recursion Fundamentals
## Chapter 3: Divide and Conquer

"Divide and Conquer" is an algorithmic paradigm based on multi-branched recursion. A divide-and-conquer algorithm works by recursively breaking down a problem into two or more sub-problems of the same type, until these become simple enough to be solved directly. The solutions to the sub-problems are then combined to give a solution to the original problem.

We have already seen this paradigm in action during **Merge Sort** and **Quick Sort** (Part 3).

---

### 1. The Three Steps of Divide and Conquer

Every Divide and Conquer algorithm follows this pattern:
1.  **Divide:** Break the given problem into sub-problems of same type.
2.  **Conquer:** Recursively solve these sub-problems.
3.  **Combine:** Appropriately merge the answers.

```
╔══════════════════════════════════════════════════════════════════╗
║                   DIVIDE AND CONQUER FLOW                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║                    ┌───────────────┐                             ║
║                    │   PROBLEM     │                             ║
║                    │   (size N)    │                             ║
║                    └───────┬───────┘                             ║
║                            │                                     ║
║                       ┌────▼────┐                                ║
║                       │ DIVIDE  │ Split into sub-problems       ║
║                       └────┬────┘                                ║
║                            │                                     ║
║               ┌────────────┼────────────┐                       ║
║               ▼            ▼            ▼                       ║
║        ┌──────────┐  ┌──────────┐  ┌──────────┐                ║
║        │ SUB 1    │  │ SUB 2    │  │ SUB 3    │                ║
║        │ (size N/2)│  │ (size N/2)│  │ (size N/2)│               ║
║        └────┬─────┘  └────┬─────┘  └────┬─────┘                ║
║             │              │              │                       ║
║        ┌────▼────┐   ┌────▼────┐   ┌────▼────┐                 ║
║        │CONQUER  │   │CONQUER  │   │CONQUER  │                 ║
║        │(recurse)│   │(recurse)│   │(recurse)│                 ║
║        └────┬────┘   └────┬────┘   └────┬────┘                 ║
║             │              │              │                       ║
║             └──────────────┼──────────────┘                     ║
║                            │                                     ║
║                       ┌────▼────┐                                ║
║                       │COMBINE  │ Merge sub-results             ║
║                       └────┬────┘                                ║
║                            │                                     ║
║                    ┌───────▼───────┐                             ║
║                    │   SOLUTION    │                             ║
║                    └───────────────┘                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### 2. A Simple Example: Finding the Maximum Element

Let's say you want to find the maximum element in an array using Divide and Conquer.

```cpp
int findMaxDC(vector<int>& arr, int left, int right) {
    // 1. Base Case: If the segment is just 1 element, it IS the maximum.
    if (left == right) {
        return arr[left];
    }

    // 2. Divide: Split the array in half
    int mid = left + (right - left) / 2;

    // 3. Conquer: Recursively find the max of the left half and right half
    int maxLeft = findMaxDC(arr, left, mid);
    int maxRight = findMaxDC(arr, mid + 1, right);

    // 4. Combine: The true max is the bigger of the two halves
    return max(maxLeft, maxRight);
}
```

**What's happening:**
```cpp
int findMaxDC(vector<int>& arr, int left, int right) {
//                      ^^^^   ^^^^  ^^^^^
//                      |      |     └── Right boundary index
//                      |      └── Left boundary index
//                      └── Array to search
//
// Split the problem in half each time:
// findMax([1,2,3,4,5,6,7,8])
//   ├── findMax([1,2,3,4])
//   │    ├── findMax([1,2])
//   │    │    ├── findMax([1]) → returns 1
//   │    │    └── findMax([2]) → returns 2
//   │    │    └── max(1,2) = 2
//   │    └── findMax([3,4])
//   │         ├── findMax([3]) → returns 3
//   │         └── findMax([4]) → returns 4
//   │         └── max(3,4) = 4
//   │    └── max(2,4) = 4
//   └── findMax([5,6,7,8])
//        ├── findMax([5,6]) → returns 6
//        └── findMax([7,8]) → returns 8
//        └── max(6,8) = 8
//   └── max(4,8) = 8
```

**Recursion Tree for findMaxDC([1,2,3,4,5,6,7,8]):**
```
                    findMaxDC(0, 7)
                   /                \
          findMaxDC(0, 3)        findMaxDC(4, 7)
          /          \            /          \
   findMaxDC(0,1)  findMaxDC(2,3)  findMaxDC(4,5)  findMaxDC(6,7)
    /      \        /      \        /      \        /      \
(0,0)   (1,1)   (2,2)   (3,3)   (4,4)   (5,5)   (6,6)   (7,7)
  1       2       3       4       5       6       7       8
  └───┬───┘       └───┬───┘       └───┬───┘       └───┬───┘
     max=2            max=4            max=6            max=8
       └──────┬───────┘               └──────┬───────┘
              max=4                          max=8
                    └──────────┬──────────┘
                            max=8
```

**Dry-Run Table:**

| Step | Function Call | left | right | mid | maxLeft | maxRight | Result |
|------|---------------|------|-------|-----|---------|----------|--------|
| 1 | `findMaxDC(0,7)` | 0 | 7 | 3 | ? | ? | ? |
| 2 | `findMaxDC(0,3)` | 0 | 3 | 1 | ? | ? | ? |
| 3 | `findMaxDC(0,1)` | 0 | 1 | 0 | ? | ? | ? |
| 4 | `findMaxDC(0,0)` | 0 | 0 | - | - | - | 1 |
| 5 | `findMaxDC(1,1)` | 1 | 1 | - | - | - | 2 |
| 6 | `findMaxDC(0,1)` returns | - | - | - | 1 | 2 | 2 |
| 7 | `findMaxDC(2,3)` | 2 | 3 | 2 | ? | ? | ? |
| 8 | `findMaxDC(2,2)` | 2 | 2 | - | - | - | 3 |
| 9 | `findMaxDC(3,3)` | 3 | 3 | - | - | - | 4 |
| 10 | `findMaxDC(2,3)` returns | - | - | - | 3 | 4 | 4 |
| 11 | `findMaxDC(0,3)` returns | - | - | - | 2 | 4 | 4 |
| 12 | `findMaxDC(4,7)` | ... | ... | ... | ... | ... | 8 |
| 13 | `findMaxDC(0,7)` returns | - | - | - | 4 | 8 | **8** |

**Time Complexity:**
```
Level 0:  1 call  of size N
Level 1:  2 calls of size N/2
Level 2:  4 calls of size N/4
...
Level K:  2^K calls of size N/2^K

Base case: N/2^K = 1  →  K = log₂(N)
Total work per level: N (each element compared once)
Total levels: log₂(N)

Time: O(N log N)
```

**Space Complexity:**
- Recursion tree depth: $O(\log N)$
- No extra arrays allocated (just variables)
- Space: $O(\log N)$ for the call stack

---

### 3. Classic Divide and Conquer: Merge Sort

Merge Sort is the textbook example. We already covered it in Part 3, but let's see it through the D&C lens:

```cpp
void merge(vector<int>& arr, int left, int mid, int right) {
    vector<int> temp;
    int i = left, j = mid + 1;

    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp.push_back(arr[i++]);
        } else {
            temp.push_back(arr[j++]);
        }
    }
    while (i <= mid) temp.push_back(arr[i++]);
    while (j <= right) temp.push_back(arr[j++]);

    for (int k = 0; k < temp.size(); k++) {
        arr[left + k] = temp[k];
    }
}

void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;  // Base case: 0 or 1 element

    int mid = left + (right - left) / 2;

    // Divide & Conquer
    mergeSort(arr, left, mid);       // Sort left half
    mergeSort(arr, mid + 1, right);  // Sort right half

    // Combine
    merge(arr, left, mid, right);    // Merge sorted halves
}
```

**What's happening:**
```
mergeSort([38, 27, 43, 3, 9, 82, 10])

DIVIDE PHASE:
[38,27,43,3,9,82,10]
        /          \
[38,27,43,3]    [9,82,10]
    /    \        /    \
[38,27] [43,3] [9,82]  [10]
  / \    / \    / \
[38][27][43][3] [9][82]

CONQUER PHASE (merge back):
[27,38] [3,43] [9,82] [10]
    \      /      \      /
  [3,27,38,43]   [9,10,82]
        \          /
 [3,9,10,27,38,43,82]
```

---

### 4. Recognizing Divide and Conquer

How do you know when to use this approach?
- The problem can be broken down into smaller, independent chunks.
- The chunks look exactly like the original problem.
- Combining the answers of the chunks requires simple logic (addition, max, merging arrays).

*Interview Trigger:* "Sort this linked list", "Find the closest pair of points", "Multiply these two massive matrices".

**Decision Tree for Algorithm Selection:**
```
Is the problem breakable into sub-problems?
│
├── NO → Use brute force or other techniques
│
├── YES
│   ├── Do sub-problems overlap?
│   │   ├── YES → Dynamic Programming (Phase 12)
│   │   │         Example: Fibonacci, Climbing Stairs
│   │   │
│   │   └── NO → Divide and Conquer ✓
│   │             Example: Merge Sort, Binary Search, Max Element
│   │
│   └── Can you build solution incrementally?
│       └── YES → Backtracking (Topic 2)
│                 Example: Permutations, N-Queens
```

---

### 5. Overlapping vs. Independent Subproblems

It is critical to distinguish between **Divide and Conquer** and **Dynamic Programming** (which we will cover in Phase 12).

- **Divide and Conquer** is used when the subproblems are completely **independent**. For example, in Merge Sort, sorting the left half of the array has absolutely nothing to do with sorting the right half. You never sort the same subarray twice.
- **Dynamic Programming** is used when the subproblems **overlap**. For example, in the Fibonacci sequence `Fib(5) = Fib(4) + Fib(3)`, calculating `Fib(4)` requires calculating `Fib(3)` again. D&C would calculate `Fib(3)` twice, wasting massive amounts of time. DP remembers the answer.

**Visual Comparison: Independent vs Overlapping**

```
INDEPENDENT (Merge Sort) — D&C works great:
                sort(0,7)
               /         \
          sort(0,3)    sort(4,7)
         /       \      /       \
    sort(0,1) sort(2,3) sort(4,5) sort(6,7)

Every call is UNIQUE. No subproblem solved twice.
Total calls: O(N)

OVERLAPPING (Fibonacci) — D&C is terrible:
                   fib(5)
                  /      \
             fib(4)      fib(3)     ← fib(3) appears TWICE!
            /     \      /    \
         fib(3) fib(2) fib(2) fib(1)
         /   \
      fib(2) fib(1)

fib(2) solved 3 times! fib(3) solved 2 times!
Total calls: O(2^N) — EXPONENTIAL WASTE
DP fixes this by caching: O(N) time, O(N) space
```

---

### 6. The Master Theorem (For Quick Complexity Analysis)

For D&C recurrences of the form $T(N) = a \cdot T(N/b) + O(N^d)$:

| Condition | Complexity |
|-----------|------------|
| $d < \log_b a$ | $O(N^{\log_b a})$ |
| $d = \log_b a$ | $O(N^d \cdot \log N)$ |
| $d > \log_b a$ | $O(N^d)$ |

**Common Examples:**

| Algorithm | Recurrence | a | b | d | Result |
|-----------|------------|---|---|---|--------|
| Binary Search | $T(N) = T(N/2) + O(1)$ | 1 | 2 | 0 | $O(\log N)$ |
| Merge Sort | $T(N) = 2T(N/2) + O(N)$ | 2 | 2 | 1 | $O(N \log N)$ |
| Strassen's | $T(N) = 7T(N/2) + O(N^2)$ | 7 | 2 | 2 | $O(N^{2.81})$ |
| Karatsuba | $T(N) = 3T(N/2) + O(N)$ | 3 | 2 | 1 | $O(N^{1.58})$ |

---

### Quick Reference: Divide and Conquer

| Concept | Description |
|---------|-------------|
| **Divide** | Split problem into sub-problems |
| **Conquer** | Solve sub-problems recursively |
| **Combine** | Merge sub-results into final answer |
| **Base Case** | Sub-problem too small to divide further |
| **Independent** | Sub-problems don't share work → D&C |
| **Overlapping** | Sub-problems repeat → use DP instead |
| **Recursion Tree** | Visual tool for counting calls |
| **Master Theorem** | Quick complexity for D&C recurrences |

| Algorithm | Divide Step | Combine Step | Time | Space |
|-----------|-------------|--------------|------|-------|
| Binary Search | Split in half | None | $O(\log N)$ | $O(\log N)$ |
| Merge Sort | Split in half | Merge sorted | $O(N \log N)$ | $O(N)$ |
| Quick Sort | Split by pivot | None | $O(N \log N)$ avg | $O(\log N)$ |
| Closest Pair | Split by line | Check boundary | $O(N \log N)$ | $O(N)$ |
| Strassen's | Split matrix | 7 multiplications | $O(N^{2.81})$ | $O(N^2)$ |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Divide and Conquer**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 divide and conquer** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

