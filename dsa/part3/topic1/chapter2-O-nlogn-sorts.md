# Part 3, Topic 1: All Major Sorts
## Chapter 2: The $O(N \log N)$ Sorts

To sort millions of records efficiently, we must move past $O(N^2)$ algorithms. The two most important efficient sorting algorithms use a **Divide and Conquer** strategy to achieve $O(N \log N)$ time.

---

### 1. Merge Sort

**The Intuition:**
Merge Sort takes an array and aggressively splits it in half until it is left with arrays of size 1 (which are inherently sorted). Then, it takes those tiny sorted arrays and "merges" them together, ensuring the merged result remains sorted. It recursively builds up to the final, fully sorted array.

**The Code (You must be able to write this from scratch):**
```cpp
// Helper function to merge two sorted halves
void merge(vector<int>& arr, int left, int mid, int right) {
    // We must allocate a temporary array to hold the merged result
    vector<int> temp; 
    
    int i = left;     // Pointer for the left half
    int j = mid + 1;  // Pointer for the right half
    
    // 1. Compare elements from both halves and copy the smaller one
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp.push_back(arr[i]);
            i++;
        } else {
            temp.push_back(arr[j]);
            j++;
        }
    }
    
    // 2. Copy any remaining elements from the left half
    while (i <= mid) {
        temp.push_back(arr[i]);
        i++;
    }
    
    // 3. Copy any remaining elements from the right half
    while (j <= right) {
        temp.push_back(arr[j]);
        j++;
    }
    
    // 4. Copy the sorted temp array back into the original array
    for (int k = left; k <= right; k++) {
        arr[k] = temp[k - left];
    }
}

// The recursive sorting function
void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return; // Base case: Array of size 1
    
    int mid = left + (right - left) / 2; // Prevents integer overflow
    
    // Recursively sort the left and right halves
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    
    // Merge the sorted halves together
    merge(arr, left, mid, right);
}
```

**What's happening - merge() function:**
```
void merge(vector<int>& arr, int left, int mid, int right) {
//          ^         ^    ^     ^    ^         ^
//          |         |    |     |    |         └── End index of right half
//          |         |    |     |    └── Midpoint (end of left half)
//          |         |    |     └── Start index of left half
//          |         |    └── Pass by reference (modifies original)
//          |         └── Vector of integers
//          └── Function name

    vector<int> temp;
//          ^^^^   ^^^^
//          |      └── Temporary storage for merged result
//          └── Dynamic array (will grow as needed)

    int i = left;     // Pointer for left half
    int j = mid + 1;  // Pointer for right half
    
    // Compare and merge:
    while (i <= mid && j <= right) {
//         ^          ^
//         |          └── Both halves still have elements
//         |          (if either runs out, stop comparing)
//         └── Left half hasn't been exhausted
        
        if (arr[i] <= arr[j]) {
//              ^     ^
//              |     └── Current element in right half
//              └── Current element in left half
//              <= ensures stability (equal elements keep left position)
            temp.push_back(arr[i]);
//          ^^^^  ^^^^^^^^^  ^^^^
//          |     |          └── The smaller element
//          |     └── Add to end of temp
//          └── Temporary array
            i++;
//          ──
//          Move left pointer forward
        } else {
            temp.push_back(arr[j]);
//          Right element is smaller, add it
            j++;
        }
    }
    
    // One half is exhausted, copy remaining from the other:
    while (i <= mid) {
//         ^^^^^^^
//         Left half still has elements
        temp.push_back(arr[i]);
        i++;
    }
    
    while (j <= right) {
//         ^^^^^^^^^^
//         Right half still has elements
        temp.push_back(arr[j]);
        j++;
    }
    
    // Copy sorted result back to original array:
    for (int k = left; k <= right; k++) {
//      ^     ^
//      |     └── End of range
//      └── k-left adjusts for temp starting at 0
        arr[k] = temp[k - left];
//      ^^^    ^^^^
//      |      └── Source: temp array (adjusted index)
//      └── Destination: original array
    }
}
```

**What's happening - mergeSort() function:**
```
void mergeSort(vector<int>& arr, int left, int right) {
//          ^         ^    ^     ^    ^        ^
//          |         |    |     |    |        └── Right boundary index
//          |         |    |     |    └── Left boundary index
//          |         |    |     └── Pass by reference
//          |         |    └── Vector of integers
//          |         └── Function name
//          └── void return (modifies array in-place)

    if (left >= right) return;
//      ^          ^
//      |          └── If left >= right, segment has 0 or 1 elements
//      |          Base case: already sorted!
//      └── Compare indices
    
    int mid = left + (right - left) / 2;
//          ^     ^         ^
//          |     |         └── Half the range
//          |     └── Start of range
//          └── Left + offset (avoids overflow vs (left+right)/2)
    
    mergeSort(arr, left, mid);      // Sort left half
//  ^^^^^^^^    ^     ^     ^
//  |           |     |     └── End at mid
//  |           |     └── Start at left
//  |           └── Recursive call
//  └── Sort elements [left..mid]
    
    mergeSort(arr, mid + 1, right); // Sort right half
//  Sort elements [mid+1..right]
    
    merge(arr, left, mid, right);   // Merge sorted halves
//  ^^^^^    ^     ^    ^     ^
//  |        |     |    |     └── Right boundary
//  |        |     |    └── Midpoint
//  |        |     └── Left boundary
//  |        └── Array to merge
//  └── Merge the two sorted halves
}
```

**Tree Visualization - Recursive Splitting:**
```
Original: [38, 27, 43, 3, 9, 82, 10]

                    mergeSort(0, 6)
                    ┌─────────────────────────────────┐
                    │ [38, 27, 43, 3, 9, 82, 10]     │
                    │  left=0        right=6          │
                    │  mid=3                          │
                    └─────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        mergeSort(0, 3)              mergeSort(4, 6)
        ┌─────────────────┐          ┌─────────────────┐
        │ [38, 27, 43, 3] │          │ [9, 82, 10]     │
        │  left=0  right=3│          │  left=4  right=6 │
        │  mid=1          │          │  mid=5          │
        └─────────────────┘          └─────────────────┘
              │                            │
      ┌───────┴───────┐            ┌───────┴───────┐
      ▼               ▼            ▼               ▼
  mergeSort(0,1)  mergeSort(2,3) mergeSort(4,5) mergeSort(6,6)
  ┌─────────┐     ┌─────────┐   ┌─────────┐     ┌─────────┐
  │ [38,27] │     │ [43, 3] │   │ [9, 82] │     │ [10]    │
  │  m=0    │     │  m=2    │   │  m=4    │     │  base   │
  └─────────┘     └─────────┘   └─────────┘     └─────────┘
       │               │             │
   ┌───┴───┐       ┌───┴───┐     ┌───┴───┐
   ▼       ▼       ▼       ▼     ▼       ▼
[38]    [27]     [43]    [3]   [9]     [82]
 base    base     base   base  base     base

MERGE PHASE (bottom-up):
Step 1: merge [38] and [27] → [27, 38]
        merge [43] and [3]  → [3, 43]
        merge [9] and [82]  → [9, 82]
        [10] stays as is

Step 2: merge [27, 38] and [3, 43] → [3, 27, 38, 43]
        merge [9, 82] and [10]     → [9, 10, 82]

Step 3: merge [3, 27, 38, 43] and [9, 10, 82]
        → [3, 9, 10, 27, 38, 43, 82]
```

**Dry-Run Table for Merge Step:**
```
Merging left=[3, 27] and right=[9, 10]

┌─────────┬─────────┬─────────┬─────────────────────┬─────────────────┐
│ Step    │ i (left)│ j (right)│ Comparison         │ temp            │
├─────────┼─────────┼─────────┼─────────────────────┼─────────────────┤
│ 1       │ 0       │ 0       │ 3 < 9? YES → take 3 │ [3]            │
│ 2       │ 1       │ 0       │ 27 < 9? NO → take 9 │ [3, 9]         │
│ 3       │ 1       │ 1       │ 27 < 10? NO → take 10│ [3, 9, 10]    │
│ 4       │ 1       │ 2       │ Right exhausted     │                 │
│ Copy    │ 1       │ -       │ Copy remaining 27   │ [3, 9, 10, 27] │
└─────────┴─────────┴─────────┴─────────────────────┴─────────────────┘
```

**Edge Case - Empty Array and Single Element:**
```cpp
void mergeSortSafe(vector<int>& arr, int left, int right) {
    // Handle empty array or single element
    if (left >= right) return;  // Covers both cases
    
    int mid = left + (right - left) / 2;
    mergeSortSafe(arr, left, mid);
    mergeSortSafe(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

// Usage:
// vector<int> empty;
// mergeSortSafe(empty, 0, empty.size() - 1);  // left=0, right=-1 → returns immediately
// 
// vector<int> single = {5};
// mergeSortSafe(single, 0, 0);  // left=0, right=0 → returns immediately
```

**What's happening:**
```
// Base case handles:
// 1. Empty array: left=0, right=-1 → 0 >= -1 is TRUE → return
// 2. Single element: left=k, right=k → k >= k is TRUE → return
// 3. Invalid range: left > right → returns immediately
```

*   **Time Complexity:** $O(N \log N)$ in all cases. (The tree depth is $\log N$, and merging each level takes $N$ operations).
*   **Space Complexity:** **$O(N)$ Auxiliary Space.** This is Merge Sort's biggest weakness. It requires creating temporary arrays to hold the merged data.
*   **Stability:** Stable (uses `<=` in merge comparison).

---

### 2. Quick Sort

**The Intuition:**
Quick Sort also divides and conquers, but it does the heavy lifting *before* the recursive calls. 
1. Choose a "Pivot" element (e.g., the last element in the array).
2. **Partition** the array: Move everything smaller than the pivot to its left, and everything larger to its right. The pivot is now in its absolute final, correct sorted position.
3. Recursively call Quick Sort on the left segment and the right segment.

**The Code:**
```cpp
// Helper function to partition the array around a pivot
int partition(vector<int>& arr, int left, int right) {
    int pivot = arr[right]; // Choosing the last element as the pivot
    int i = left - 1; // Index of the smaller element
    
    for (int j = left; j < right; j++) {
        // If current element is smaller than the pivot
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    // Swap the pivot into its final correct position
    swap(arr[i + 1], arr[right]);
    
    // Return the index where the pivot landed
    return i + 1; 
}

// The recursive sorting function
void quickSort(vector<int>& arr, int left, int right) {
    if (left >= right) return; // Base case
    
    // Partition the array and get the pivot index
    int pivotIndex = partition(arr, left, right);
    
    // Recursively sort the elements BEFORE and AFTER the partition.
    // Notice we do NOT include the pivotIndex, because it is already sorted!
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
}
```

**What's happening - partition() function:**
```
int partition(vector<int>& arr, int left, int right) {
//  ^     ^         ^    ^     ^    ^        ^
//  |     |         |    |     |    |        └── Right boundary (pivot location)
//  |     |         |    |     |    └── Left boundary
//  |     |         |    |     └── Pass by reference
//  |     |         |    └── Vector of integers
//  |     |         └── Function name
//  |     └── Returns index (pivot's final position)
//  └── int return type

    int pivot = arr[right];
//          ^       ^^^^^
//          |       └── Last element is our pivot
//          |       (one of many pivot strategies)
//          └── Store pivot value
    
    int i = left - 1;
//          ^     ^
//          |     └── Start one before left boundary
//          |       i tracks where "smaller than pivot" zone ends
//          └── Index of smaller element boundary
    
    for (int j = left; j < right; j++) {
//      ^     ^
//      |     └── Stop before pivot (j < right)
//      |       Don't compare pivot with itself
//      └── Scan through array
        
        if (arr[j] < pivot) {
//              ^     ^
//              |     └── Compare with pivot
//              |       Strict less than (not <= for stability)
//              └── Current element
            
            i++;
//          ──
//          Expand "smaller than pivot" zone
            swap(arr[i], arr[j]);
//          ^^^^    ^     ^
//          |       |     └── Current element (which is < pivot)
//          |       └── Boundary of smaller zone
//          |           After swap, arr[i] is definitely < pivot
//          └── Swap them
        }
        // If arr[j] >= pivot, do nothing (it's already in correct zone)
    }
    
    swap(arr[i + 1], arr[right]);
//  ^^^^     ^          ^
//  |        |          └── Pivot (at far right)
//  |        └── First element > pivot (boundary + 1)
//  |           Pivot goes to its FINAL sorted position
//  └── Swap pivot into place
    
    return i + 1;
//         ^^^
//         Pivot's final index
//         Everything to the left is < pivot
//         Everything to the right is >= pivot
}
```

**Partition Diagram - Step by Step:**
```
Array: [10, 80, 30, 90, 40, 50, 70]
Pivot: 70 (last element)

Initial:
   [10, 80, 30, 90, 40, 50, |70|]
    ↑
    i = left - 1 = -1

Step 1: j=0, arr[0]=10
   10 < 70? YES
   i becomes 0
   swap(arr[0], arr[0]) → no change
   [10, 80, 30, 90, 40, 50, |70|]
    ↑
    i=0

Step 2: j=1, arr[1]=80
   80 < 70? NO
   [10, 80, 30, 90, 40, 50, |70|]
       ↑
       i stays at 0

Step 3: j=2, arr[2]=30
   30 < 70? YES
   i becomes 1
   swap(arr[1], arr[2])
   [10, 30, 80, 90, 40, 50, |70|]
       ↑
       i=1

Step 4: j=3, arr[3]=90
   90 < 70? NO
   [10, 30, 80, 90, 40, 50, |70|]
           ↑
           i stays at 1

Step 5: j=4, arr[4]=40
   40 < 70? YES
   i becomes 2
   swap(arr[2], arr[4])
   [10, 30, 40, 90, 80, 50, |70|]
           ↑
           i=2

Step 6: j=5, arr[5]=50
   50 < 70? YES
   i becomes 3
   swap(arr[3], arr[5])
   [10, 30, 40, 50, 80, 90, |70|]
               ↑
               i=3

Final: swap(arr[i+1], arr[right]) → swap(arr[4], arr[6])
   [10, 30, 40, 50, 70, 90, 80]
                   ↑
                   pivotIndex = 4

Result:
   [10, 30, 40, 50, |70|, 90, 80]
    ← all < 70 →    ↑   ← all >= 70 →
                 pivot
```

**Dry-Run Table for Full Quick Sort:**
```
Array: [10, 80, 30, 90, 40, 50, 70]

Call: quickSort(arr, 0, 6)
  pivotIndex = partition(0, 6) = 4
  Array after partition: [10, 30, 40, 50, 70, 90, 80]
  
  Call: quickSort(arr, 0, 3)  // Left of pivot
    pivotIndex = partition(0, 3) = ?
    ... (recursive calls continue)
  
  Call: quickSort(arr, 5, 6)  // Right of pivot
    pivotIndex = partition(5, 6) = ?
    ... (recursive calls continue)
```

**ASCII Diagram - Partition Process:**
```
Array: [10, 80, 30, 90, 40, 50, 70]
Pivot: 70

Phase 1: Scan and swap elements < pivot to the left
┌────┬────┬────┬────┬────┬────┬────┐
│ 10 │ 80 │ 30 │ 90 │ 40 │ 50 │ 70 │
│    │    │    │    │    │    │PIV │
└────┴────┴────┴────┴────┴────┴────┘

After partitioning:
┌────┬────┬────┬────┬────┬────┬────┐
│ 10 │ 30 │ 40 │ 50 │ 70 │ 90 │ 80 │
│ <  │ <  │ <  │ <  │PIV │ >= │ >= │
└────┴────┴────┴────┴────┴────┴────┘
              ↑
         pivotIndex = 4
         pivot is in FINAL position!

Recursive calls:
- Left:  [10, 30, 40, 50]  (indices 0-3)
- Right: [90, 80]           (indices 5-6)
```

**Edge Case - Already Sorted Array (Worst Case):**
```cpp
// WORST CASE: Array is already sorted
// [1, 2, 3, 4, 5] with pivot = last element

// Every partition puts pivot at the end
// Each partition reduces array by only 1 element
// Depth becomes N instead of log N
// Time complexity: O(N^2)

// SOLUTION: Random pivot selection
int randomPartition(vector<int>& arr, int left, int right) {
    // Generate random index between left and right
    int random = left + rand() % (right - left + 1);
    
    // Swap random element with last element
    swap(arr[random], arr[right]);
    
    // Now use standard partition
    return partition(arr, left, right);
}

void quickSortRandom(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    
    int pivotIndex = randomPartition(arr, left, right);
    quickSortRandom(arr, left, pivotIndex - 1);
    quickSortRandom(arr, pivotIndex + 1, right);
}
```

**What's happening:**
```
// Random pivot selection:
// 1. Pick random index between left and right
// 2. Swap it with arr[right]
// 3. Use standard partition (pivot is now at right)
// 
// This makes worst case O(N^2) EXTREMELY unlikely
// Expected time is O(N log N) regardless of input
```

**Alternative - Median of Three Pivot:**
```cpp
int medianOfThree(vector<int>& arr, int left, int right) {
    int mid = left + (right - left) / 2;
    
    // Sort arr[left], arr[mid], arr[right]
    if (arr[left] > arr[mid]) swap(arr[left], arr[mid]);
    if (arr[left] > arr[right]) swap(arr[left], arr[right]);
    if (arr[mid] > arr[right]) swap(arr[mid], arr[right]);
    
    // Put median at right, use as pivot
    swap(arr[mid], arr[right]);
    return partition(arr, left, right);
}
```

**What's happening:**
```
// Median of Three:
// 1. Look at first, middle, last elements
// 2. Sort just those 3
// 3. Use median as pivot
// 
// Benefits:
// - Avoids worst case for sorted/reverse-sorted arrays
// - Only 3 comparisons to pick pivot
// - Still O(N log N) expected
```

*   **Time Complexity:** 
    *   **Average & Best Case:** $O(N \log N)$.
    *   **Worst Case:** $O(N^2)$. This happens if the array is already sorted and you always pick the last element as the pivot (the partition tree becomes a straight line of depth $N$). This is mitigated in reality by picking a random pivot.
*   **Space Complexity:** $O(\log N)$ Auxiliary Space (for the recursive call stack). **It sorts in-place!**
*   **Stability:** Not stable (partitioning swaps elements across wide gaps).

---

### Summary Comparison

- **Merge Sort:** Guaranteed $O(N \log N)$ time, but uses $O(N)$ extra memory.
- **Quick Sort:** Usually faster in practice due to cache locality, and sorts in-place ($O(1)$ memory allocation), but has a theoretical $O(N^2)$ worst-case.

### Comparison Table: $O(N \log N)$ Sorts

| Property | Merge Sort | Quick Sort |
|----------|------------|------------|
| **Time (Best)** | $O(N \log N)$ | $O(N \log N)$ |
| **Time (Average)** | $O(N \log N)$ | $O(N \log N)$ |
| **Time (Worst)** | $O(N \log N)$ | $O(N^2)$ |
| **Space** | $O(N)$ | $O(\log N)$ |
| **Stable?** | Yes | No |
| **In-Place?** | No | Yes |
| **Cache Performance** | Poor | Excellent |
| **Use Case** | Guaranteed performance | General purpose |

**When to Use Each:**
- **Merge Sort:** When you need guaranteed $O(N \log N)$, stability matters, or you're sorting linked lists.
- **Quick Sort:** Default choice for arrays, fastest in practice, used by `std::sort`.

---

## Quick Reference Table

| Algorithm | Best | Average | Worst | Space | Stable | In-Place | Pivot Strategy |
|-----------|------|---------|-------|-------|--------|----------|----------------|
| Merge Sort | $O(N \log N)$ | $O(N \log N)$ | $O(N \log N)$ | $O(N)$ | Yes | No | N/A (split) |
| Quick Sort | $O(N \log N)$ | $O(N \log N)$ | $O(N^2)$ | $O(\log N)$ | No | Yes | Last/Random/Median |

**Key Formulas:**
- Merge Sort recursion depth: $\log_2 N$
- Merge Sort total comparisons: $N \log_2 N$ (upper bound: $N \lceil \log_2 N \rceil$)
- Quick Sort recursion depth: $\log N$ average, $N$ worst case
- Quick Sort partition comparisons: $N-1$ per partition

**Common Interview Questions:**
1. Why is Quick Sort faster in practice despite $O(N^2)$ worst case? → Cache locality, in-place, fewer allocations
2. When would you choose Merge Sort over Quick Sort? → Stability needed, linked lists, guaranteed performance required
3. How to avoid Quick Sort's worst case? → Random pivot or median-of-three

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: The $O(N \log N)$ Sorts**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 O nlogn sorts** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

