# Part 3, Topic 1: All Major Sorts
## Chapter 1: The $O(N^2)$ Sorts

While you will almost always use `std::sort()` in a real interview, interviewers sometimes ask you to explain or implement the foundational sorting algorithms to test your understanding of algorithmic logic.

The three easiest sorts to understand all run in **$O(N^2)$ time**. Because of their poor performance on large datasets, they are rarely used in production, with one notable exception (Insertion Sort on tiny arrays).

---

### 1. Bubble Sort

**The Intuition:**
Imagine bubbles rising to the surface of water. In Bubble Sort, the largest elements "bubble up" to the end of the array.
You iterate through the array, comparing adjacent elements. If the left element is larger than the right element, you swap them. After one full pass, the absolute largest element is guaranteed to be at the very end. You repeat this process for the remaining unsorted elements.

**The Code:**
```cpp
void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    bool swapped;
    
    for (int i = 0; i < n - 1; i++) {
        swapped = false;
        // Notice the limit: n - i - 1. 
        // The last 'i' elements are already sorted!
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        // Optimization: If we did a full pass without swapping anything,
        // the array is completely sorted. We can stop early.
        if (!swapped) break;
    }
}
```

**What's happening:**
```
void bubbleSort(vector<int>& arr) {
//          ^         ^    ^
//          |         |    └── Pass by reference (modifies original)
//          |         └── Vector of integers
//          └── Function name: bubbleSort
    
    for (int i = 0; i < n - 1; i++) {
//      ^     ^   ^
//      |     |   └── Stop before last element (nothing to compare after it)
//      |     └── Counter: which pass we're on
//      └── Loop through passes

        for (int j = 0; j < n - i - 1; j++) {
//                       ^^^^^^^^^^^^^
//                       After pass i, last i elements are sorted
//                       So we don't check them again
            
            if (arr[j] > arr[j + 1]) {
//                 ^        ^  ^
//                 |        |  └── Adjacent element to the right
//                 |        └── Current element
//                 └── Compare: is current > right?
                
                swap(arr[j], arr[j + 1]);
//              ^^^^
//              Swaps adjacent elements (built-in C++ function)
            }
        }
        
        if (!swapped) break;
//           ^^^^^^^^
//           If no swaps happened in this pass,
//           array is already sorted -> exit early
    }
}
```

**Dry-Run Table:**
```
Array: [5, 3, 8, 1, 2]

Pass 1 (i=0):
┌─────────┬───────────────────────────────────┬─────────────────────┐
│ j       │ Comparison                        │ Array State         │
├─────────┼───────────────────────────────────┼─────────────────────┤
│ j=0     │ 5 > 3? YES → swap                 │ [3, 5, 8, 1, 2]    │
│ j=1     │ 5 > 8? NO                         │ [3, 5, 8, 1, 2]    │
│ j=2     │ 8 > 1? YES → swap                 │ [3, 5, 1, 8, 2]    │
│ j=3     │ 8 > 2? YES → swap                 │ [3, 5, 1, 2, 8]    │
└─────────┴───────────────────────────────────┴─────────────────────┘
Result: 8 is in its final position

Pass 2 (i=1):
┌─────────┬───────────────────────────────────┬─────────────────────┐
│ j       │ Comparison                        │ Array State         │
├─────────┼───────────────────────────────────┼─────────────────────┤
│ j=0     │ 3 > 5? NO                         │ [3, 5, 1, 2, 8]    │
│ j=1     │ 5 > 1? YES → swap                 │ [3, 1, 5, 2, 8]    │
│ j=2     │ 5 > 2? YES → swap                 │ [3, 1, 2, 5, 8]    │
└─────────┴───────────────────────────────────┴─────────────────────┘
Result: 5 is in its final position

Pass 3 (i=2):
┌─────────┬───────────────────────────────────┬─────────────────────┐
│ j       │ Comparison                        │ Array State         │
├─────────┼───────────────────────────────────┼─────────────────────┤
│ j=0     │ 3 > 1? YES → swap                 │ [1, 3, 2, 5, 8]    │
│ j=1     │ 3 > 2? YES → swap                 │ [1, 2, 3, 5, 8]    │
└─────────┴───────────────────────────────────┴─────────────────────┘

Pass 4 (i=3):
┌─────────┬───────────────────────────────────┬─────────────────────┐
│ j       │ Comparison                        │ Array State         │
├─────────┼───────────────────────────────────┼─────────────────────┤
│ j=0     │ 1 > 2? NO                         │ [1, 2, 3, 5, 8]    │
└─────────┴───────────────────────────────────┴─────────────────────┘
No swaps! swapped = false → EARLY EXIT

Final: [1, 2, 3, 5, 8]
```

**ASCII Diagram - Swapping Process:**
```
Original:  [5, 3, 8, 1, 2]

Step 1: Compare arr[0] and arr[1]
         ┌───┐
         │ 5 │   ┌───┐
         └───┘   │ 3 │   ┌───┐   ┌───┐   ┌───┐
                 └───┘   │ 8 │   │ 1 │   │ 2 │
                         └───┘   └───┘   └───┘
         5 > 3? YES → SWAP
         Result: [3, 5, 8, 1, 2]

Step 2: Compare arr[1] and arr[2]
     ┌───┐
     │ 3 │   ┌───┐
     └───┘   │ 5 │   ┌───┐
             └───┘   │ 8 │   ┌───┐   ┌───┐
                     └───┘   │ 1 │   │ 2 │
                             └───┘   └───┘
         5 > 8? NO → NO SWAP
         Result: [3, 5, 8, 1, 2]

Step 3: Compare arr[2] and arr[3]
     ┌───┐   ┌───┐
     │ 3 │   │ 5 │
     └───┘   └───┘   ┌───┐
                     │ 8 │   ┌───┐
                     └───┘   │ 1 │   ┌───┐
                             └───┘   │ 2 │
                                     └───┘
         8 > 1? YES → SWAP
         Result: [3, 5, 1, 8, 2]

Step 4: Compare arr[3] and arr[4]
     ┌───┐   ┌───┐   ┌───┐
     │ 3 │   │ 5 │   │ 1 │
     └───┘   └───┘   └───┘   ┌───┐
                             │ 8 │   ┌───┐
                             └───┘   │ 2 │
                                     └───┘
         8 > 2? YES → SWAP
         Result: [3, 5, 1, 2, 8]  ← 8 is now in final position!
```

**Edge Case - Already Sorted Array:**
```cpp
void bubbleSortOptimized(vector<int>& arr) {
    int n = arr.size();
    bool swapped;
    
    for (int i = 0; i < n - 1; i++) {
        swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        // This optimization makes best case O(N)!
        if (!swapped) break;
    }
}
```

**What's happening:**
```
// If array is already sorted:
// Pass 1: Compare all adjacent pairs, no swaps happen
// swapped remains false
// → Break out of outer loop immediately
// Total comparisons: N-1 (just one pass)
// Time complexity: O(N) best case!
```

*   **Time Complexity:** $O(N^2)$ average and worst case. $O(N)$ best case (if already sorted, thanks to the `swapped` optimization).
*   **Space Complexity:** $O(1)$ in-place.

---

### 2. Selection Sort

**The Intuition:**
Instead of constantly swapping adjacent elements, Selection Sort works by scanning the unsorted portion of the array to find the *absolute minimum* value. Once it finds the minimum, it swaps it with the first unsorted element.

**The Code:**
```cpp
void selectionSort(vector<int>& arr) {
    int n = arr.size();
    
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        
        // Scan the rest of the array to find the smallest element
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx]) {
                min_idx = j;
            }
        }
        
        // Swap the found minimum element with the first unsorted element
        if (min_idx != i) {
            swap(arr[i], arr[min_idx]);
        }
    }
}
```

**What's happening:**
```
void selectionSort(vector<int>& arr) {
//          ^         ^    ^
//          |         |    └── Pass by reference (modifies original)
//          |         └── Vector of integers
//          └── Function name

    for (int i = 0; i < n - 1; i++) {
//      ^     ^   ^
//      |     |   └── Stop at second-to-last (last element sorted by default)
//      |     └── i = start of unsorted section
//      └── Loop through each position

        int min_idx = i;
//          ^^^^^^^   ^
//          |         └── Assume current position is minimum
//          └── Track index of minimum value found

        for (int j = i + 1; j < n; j++) {
//                       ^  ^
//                       |  └── Go to end of array
//                       └── Start from i+1 (skip already sorted)
            
            if (arr[j] < arr[min_idx]) {
//                 ^       ^^^^^^^^
//                 |       └── Current minimum index
//                 └── Compare current element with minimum
                
                min_idx = j;
//              ^^^^^^^   ^
//              |         └── New minimum found at index j
//              └── Update minimum index
            }
        }
        
        if (min_idx != i) {
//           ^^^^^^^   ^
//           |         └── If minimum is already at position i...
//           └── ...no swap needed
            swap(arr[i], arr[min_idx]);
//          ^^^^    ^     ^^^^^^^^
//          |       |     └── Swap with minimum found
//          |       └── Current position (first unsorted)
//          └── Built-in swap function
        }
    }
}
```

**Dry-Run Table:**
```
Array: [64, 25, 12, 22, 11]

Pass 1 (i=0):
┌─────────┬────────────────────────────────────┬─────────────────────┐
│ j       │ Finding minimum in [64,25,12,22,11] │ Array State         │
├─────────┼────────────────────────────────────┼─────────────────────┤
│ j=1     │ min_idx=0, 25<64? YES → min_idx=1  │ [64, 25, 12, 22, 11]│
│ j=2     │ min_idx=1, 12<25? YES → min_idx=2  │ [64, 25, 12, 22, 11]│
│ j=3     │ min_idx=2, 22<12? NO               │ [64, 25, 12, 22, 11]│
│ j=4     │ min_idx=2, 11<12? YES → min_idx=4  │ [64, 25, 12, 22, 11]│
└─────────┴────────────────────────────────────┴─────────────────────┘
Swap arr[0] and arr[4]: [11, 25, 12, 22, 64]
11 is now in final position

Pass 2 (i=1):
┌─────────┬─────────────────────────────────┬─────────────────────┐
│ j       │ Finding minimum in [25,12,22,64] │ Array State         │
├─────────┼─────────────────────────────────┼─────────────────────┤
│ j=2     │ min_idx=1, 12<25? YES           │ [11, 25, 12, 22, 64]│
│ j=3     │ min_idx=2, 22<12? NO            │ [11, 25, 12, 22, 64]│
│ j=4     │ min_idx=2, 64<12? NO            │ [11, 25, 12, 22, 64]│
└─────────┴─────────────────────────────────┴─────────────────────┘
Swap arr[1] and arr[2]: [11, 12, 25, 22, 64]
12 is now in final position

... (continues for remaining passes)
```

**ASCII Diagram - Finding Minimum:**
```
Array: [64, 25, 12, 22, 11]
        ↑
        i=0 (start of unsorted)

Pass 1:
Step 1: Start at i=0, assume min_idx=0 (value 64)
        ┌───┐
        │64 │ ← min_idx
        └───┘
        │25 │
        │12 │
        │22 │
        │11 │

Step 2: Scan rest of array
        ┌───┐   ┌───┐
        │64 │   │25 │ ← 25 < 64? YES → new min_idx
        └───┘   └───┘
        │12 │
        │22 │
        │11 │

Step 3: Continue scanning
        ┌───┐   ┌───┐   ┌───┐
        │64 │   │25 │   │12 │ ← 12 < 25? YES → new min_idx
        └───┘   └───┘   └───┘
        │22 │
        │11 │

Step 4: Continue scanning
        ┌───┐   ┌───┐   ┌───┐
        │64 │   │25 │   │12 │ ← min_idx
        └───┘   └───┘   └───┘
        │22 │
        │11 │ ← 11 < 12? YES → new min_idx

Step 5: Final minimum is 11 at index 4
        ┌───┐                           ┌───┐
        │64 │ ← swap with arr[4]        │11 │
        └───┘                           └───┘

Result: [11, 25, 12, 22, 64]
```

**Edge Case - Duplicate Elements:**
```cpp
void selectionSortStable(vector<int>& arr) {
    int n = arr.size();
    
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        
        for (int j = i + 1; j < n; j++) {
            // Strict less than picks the FIRST of equal minimums (not enough for stability)
            // Elements equal to min don't update min_idx
            if (arr[j] < arr[min_idx]) {
                min_idx = j;
            }
        }
        
        if (min_idx != i) {
            swap(arr[i], arr[min_idx]);
        }
    }
}
```

**What's happening:**
```
// With duplicates: [3a, 2, 3b, 1]
// When i=0, min_idx will point to 1 (not 3b)
// Because we use strict < (not <=)
// Then swapping arr[0]=3a with arr[3]=1 gives [1, 2, 3b, 3a]: 3a and 3b flip order
// But Selection Sort is STILL unstable because
// the swap at the end can move elements far apart
```

*   **Time Complexity:** $O(N^2)$ in all cases (best, average, worst). It always has to scan the remaining elements.
*   **Space Complexity:** $O(1)$ in-place.
*   **Advantage over Bubble:** It minimizes the total number of swaps (max $N$ swaps), which is useful if writing to memory is extremely expensive.
*   **Disadvantage:** Always $O(N^2)$ even if already sorted (no early exit like Bubble/Insertion).

---

### 3. Insertion Sort

**The Intuition:**
Think about how you sort playing cards in your hand. You pick up one card at a time and insert it into its correct position among the cards you are already holding. 
Insertion Sort maintains a sorted "left" side and an unsorted "right" side. It takes the first unsorted element and shifts elements in the sorted side to the right until it finds the correct spot to insert the new element.

**The Code:**
```cpp
void insertionSort(vector<int>& arr) {
    int n = arr.size();
    
    // Assume the element at index 0 is already sorted.
    for (int i = 1; i < n; i++) {
        int key = arr[i]; // The card we are currently sorting
        int j = i - 1;
        
        // Shift elements of the sorted segment that are greater than 'key'
        // to one position ahead of their current position
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        
        // Insert the key into its correct location
        arr[j + 1] = key;
    }
}
```

**What's happening:**
```
void insertionSort(vector<int>& arr) {
//          ^         ^    ^
//          |         |    └── Pass by reference (modifies original)
//          |         └── Vector of integers
//          └── Function name

    for (int i = 1; i < n; i++) {
//      ^     ^
//      |     └── Start at 1 (index 0 is "already sorted")
//      └── Loop through unsorted elements

        int key = arr[i];
//          ^^^   ^^^^^
//          |     └── Value we're currently inserting
//          └── "The card in our hand"

        int j = i - 1;
//          ^     ^
//          |     └── Start checking from element before i
//          └── Pointer to sorted section

        while (j >= 0 && arr[j] > key) {
//           ^          ^     ^   ^
//           |          |     |   └── Compare with our key
//           |          |     └── Current element in sorted section
//           |          └── Must stay within array bounds
//           └── Keep going left while elements are bigger
            arr[j + 1] = arr[j];
//          ^^^^^^^^    ^^^^^
//          |           └── Shift element right
//          └── Make space for key
            j--;
//          ──
//          Move left in sorted section
        }
        
        arr[j + 1] = key;
//      ^^^^^^^^    ^^^
//      |           └── The value we're inserting
//      |           (j+1 because j stopped one step too far left)
//      └── Insert key at correct position
    }
}
```

**Dry-Run Table:**
```
Array: [5, 2, 4, 6, 1, 3]

Initial: [5, 2, 4, 6, 1, 3]
          ↑
          sorted section (just 5)

i=1, key=2:
┌─────────┬────────────────────────────────────────┬──────────────────┐
│ j       │ Action                                 │ Array State      │
├─────────┼────────────────────────────────────────┼──────────────────┤
│ j=0     │ 5 > 2? YES → shift right               │ [5, 5, 4, 6, 1, 3]│
│ j=-1    │ Stop (j < 0)                           │                  │
│ Insert  │ key=2 at j+1=0                         │ [2, 5, 4, 6, 1, 3]│
└─────────┴────────────────────────────────────────┴──────────────────┘

i=2, key=4:
┌─────────┬────────────────────────────────────────┬──────────────────┐
│ j       │ Action                                 │ Array State      │
├─────────┼────────────────────────────────────────┼──────────────────┤
│ j=1     │ 5 > 4? YES → shift right               │ [2, 5, 5, 6, 1, 3]│
│ j=0     │ 2 > 4? NO → stop                       │                  │
│ Insert  │ key=4 at j+1=1                         │ [2, 4, 5, 6, 1, 3]│
└─────────┴────────────────────────────────────────┴──────────────────┘

i=3, key=6:
┌─────────┬────────────────────────────────────────┬──────────────────┐
│ j       │ Action                                 │ Array State      │
├─────────┼────────────────────────────────────────┼──────────────────┤
│ j=2     │ 5 > 6? NO → stop                       │                  │
│ Insert  │ key=6 at j+1=3 (no shift needed)       │ [2, 4, 5, 6, 1, 3]│
└─────────┴────────────────────────────────────────┴──────────────────┘

i=4, key=1:
┌─────────┬────────────────────────────────────────┬──────────────────┐
│ j       │ Action                                 │ Array State      │
├─────────┼────────────────────────────────────────┼──────────────────┤
│ j=3     │ 6 > 1? YES → shift right               │ [2, 4, 5, 6, 6, 3]│
│ j=2     │ 5 > 1? YES → shift right               │ [2, 4, 5, 5, 6, 3]│
│ j=1     │ 4 > 1? YES → shift right               │ [2, 4, 4, 5, 6, 3]│
│ j=0     │ 2 > 1? YES → shift right               │ [2, 2, 4, 5, 6, 3]│
│ j=-1    │ Stop (j < 0)                           │                  │
│ Insert  │ key=1 at j+1=0                         │ [1, 2, 4, 5, 6, 3]│
└─────────┴────────────────────────────────────────┴──────────────────┘

i=5, key=3:
┌─────────┬────────────────────────────────────────┬──────────────────┐
│ j       │ Action                                 │ Array State      │
├─────────┼────────────────────────────────────────┼──────────────────┤
│ j=4     │ 6 > 3? YES → shift right               │ [1, 2, 4, 5, 6, 6]│
│ j=3     │ 5 > 3? YES → shift right               │ [1, 2, 4, 5, 5, 6]│
│ j=2     │ 4 > 3? YES → shift right               │ [1, 2, 4, 4, 5, 6]│
│ j=1     │ 2 > 3? NO → stop                       │                  │
│ Insert  │ key=3 at j+1=2                         │ [1, 2, 3, 4, 5, 6]│
└─────────┴────────────────────────────────────────┴──────────────────┘
```

**ASCII Diagram - Card Insertion Analogy:**
```
Imagine you're holding cards and picking up new ones:

Hand: [5]  (sorted)

Pick up 2:
  Hand: [5] → need to insert 2
  Shift 5 right → make space
  Hand: [2, 5]

Pick up 4:
  Hand: [2, 5] → need to insert 4
  5 > 4? YES, shift 5 right
  2 > 4? NO, stop
  Hand: [2, 4, 5]

Pick up 6:
  Hand: [2, 4, 5] → need to insert 6
  5 > 6? NO, stop immediately
  Hand: [2, 4, 5, 6]

Pick up 1:
  Hand: [2, 4, 5, 6] → need to insert 1
  6 > 1? YES, shift 6
  5 > 1? YES, shift 5
  4 > 1? YES, shift 4
  2 > 1? YES, shift 2
  Hand: [1, 2, 4, 5, 6]

Pick up 3:
  Hand: [1, 2, 4, 5, 6] → need to insert 3
  6 > 3? YES, shift 6
  5 > 3? YES, shift 5
  4 > 3? YES, shift 4
  2 > 3? NO, stop
  Hand: [1, 2, 3, 4, 5, 6]
```

**Edge Case - Nearly Sorted Array:**
```cpp
void insertionSortAdaptive(vector<int>& arr) {
    int n = arr.size();
    int comparisons = 0;
    int shifts = 0;
    
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        
        // Key insight: while loop condition checks TWO things
        // 1. j >= 0 (bounds check)
        // 2. arr[j] > key (value check)
        // For nearly sorted arrays, condition 2 fails quickly
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
            shifts++;
            comparisons++; // arr[j] > key was true
        }
        if (j >= 0) comparisons++; // the arr[j] > key check that stopped the loop
        
        arr[j + 1] = key;
    }
    
    cout << "Comparisons: " << comparisons << endl;
    cout << "Shifts: " << shifts << endl;
}
```

**What's happening:**
```
// Nearly sorted array: [1, 2, 3, 5, 4, 6, 7, 8]
//                       sorted section

// When we reach key=5 (i=3):
// j=2, arr[2]=3 > 5? NO → stop immediately
// Only 1 comparison, 0 shifts

// When we reach key=4 (i=4):
// j=3, arr[3]=5 > 4? YES → shift
// j=2, arr[2]=3 > 4? NO → stop
// 2 comparisons, 1 shift

// For nearly sorted data:
// - Comparisons approach O(N) instead of O(N^2)
// - Shifts are minimal
// - This is why Insertion Sort is used for small chunks!
```

*   **Time Complexity:** $O(N^2)$ worst and average. **$O(N)$ best case** (if the array is already sorted, the `while` loop never runs).
*   **Space Complexity:** $O(1)$ in-place.
*   **The Secret Superpower:** Insertion Sort is incredibly fast on *tiny* arrays (e.g., $N < 16$). Standard libraries (like C++ `std::sort` or Python's `Timsort`) actually use Quick/Merge sort for the large chunks, but switch to Insertion Sort when the chunks get very small to avoid recursive overhead!

---

## Comparison Table: All $O(N^2)$ Sorts

| Property | Bubble Sort | Selection Sort | Insertion Sort |
|----------|-------------|----------------|----------------|
| **Time (Best)** | $O(N)$ | $O(N^2)$ | $O(N)$ |
| **Time (Average)** | $O(N^2)$ | $O(N^2)$ | $O(N^2)$ |
| **Time (Worst)** | $O(N^2)$ | $O(N^2)$ | $O(N^2)$ |
| **Space** | $O(1)$ | $O(1)$ | $O(1)$ |
| **Stable?** | Yes | No | Yes |
| **Adaptive?** | Yes (with optimization) | No | Yes |
| **# of Swaps** | $O(N^2)$ | $O(N)$ | $O(N^2)$ |
| **Use Case** | Educational | Minimize writes | Small/nearly sorted |

**When to Use Each:**
- **Bubble Sort:** Never in production. Only for teaching.
- **Selection Sort:** When writes are extremely expensive (flash memory), or you need minimum swaps.
- **Insertion Sort:** Small arrays ($N < 16$), nearly sorted data, or as a subroutine in hybrid sorts.

---

## Quick Reference Table

| Algorithm | Best | Average | Worst | Space | Stable | Adaptive | In-Place |
|-----------|------|---------|-------|-------|--------|----------|----------|
| Bubble Sort | $O(N)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | Yes | Yes | Yes |
| Selection Sort | $O(N^2)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | No | No | Yes |
| Insertion Sort | $O(N)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | Yes | Yes | Yes |

**Key Formulas:**
- Bubble Sort comparisons: $\frac{N(N-1)}{2}$ worst case, $N-1$ best case
- Selection Sort comparisons: $\frac{N(N-1)}{2}$ always
- Insertion Sort comparisons: $\frac{N(N-1)}{4}$ average, $N-1$ best case
- Selection Sort swaps: at most $N-1$ always
- Bubble Sort swaps: up to $\frac{N(N-1)}{2}$ worst case
- Insertion Sort shifts: up to $\frac{N(N-1)}{2}$ worst case

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Bubble Sort passes.** Run the chapter's `bubbleSort` on `[6, 2, 9, 1, 5]`. What is the array after Pass 2 (`i = 1`)? How many passes run in total before the loop ends, and how many swaps happen overall?

**Q2. Selection Sort swaps.** Run the chapter's `selectionSort` on `[29, 10, 14, 37, 13]`. Write the array after every pass. How many actual calls to `swap` happen (remember the `if (min_idx != i)` guard)? How many comparisons `arr[j] < arr[min_idx]` are made?

**Q3. Insertion Sort shifts.** Run the chapter's `insertionSort` on `[3, 7, 4, 9, 5, 2]`. For each `i`, how many shifts (`arr[j + 1] = arr[j]`) happen? What is the total, and what property of the array does that total equal?

**Q4. Stability check.** Two equal keys are tagged `3a` and `3b` (same value 3). Run `selectionSort` on `[3a, 3b, 1]`. What is the final order of `3a` and `3b`? What does this prove about Selection Sort?

**Q5. Read the counters carefully.** What exactly does the chapter's `insertionSortAdaptive` print for the nearly sorted array `[1, 2, 3, 5, 4, 6, 7, 8]`? Look closely at *where* the two `comparisons++` lines sit. Then consider a common mistake: deleting both of them and putting a single unconditional `comparisons++;` right after the `while` loop. What would that version print, and why is it wrong?

### Coding Exercises

**E1 (Easy).** Modify Bubble Sort so it also reports how many swaps it performed.

```cpp
int bubbleSortCountSwaps(vector<int>& arr); // sorts arr ascending, returns #swaps
```

- `[5, 3, 8, 1, 2]` → arr becomes `[1, 2, 3, 5, 8]`, returns `7`
- `[1, 2, 3]` → returns `0`

**E2 (Easy–Medium).** *Binary Insertion Sort.* Keep Insertion Sort's shifting, but find the insert position with binary search over the sorted prefix `arr[0..i-1]`. Equal keys must stay in their original order (stable).

```cpp
void binaryInsertionSort(vector<int>& arr);
```

- `[5, 2, 4, 6, 1, 3]` → `[1, 2, 3, 4, 5, 6]`
- `[2, 1, 2, 1]` → `[1, 1, 2, 2]`

**E3 (Medium).** *Partial Selection Sort.* Return the `k` smallest values in ascending order by running only the first `k` passes of Selection Sort (do not sort the whole array). Assume `0 <= k <= arr.size()`.

```cpp
vector<int> kSmallestSorted(vector<int> arr, int k);
```

- `arr = [64, 25, 12, 22, 11], k = 2` → `[11, 12]`
- `arr = [7, 7, 3], k = 3` → `[3, 7, 7]`

#### Dry-Run: Answers

**Q1.** After Pass 2 the array is `[2, 1, 5, 6, 9]`. 4 passes run (`i = 0..3`; the early exit fires at the end of Pass 4, which happens to be the last pass anyway). Total swaps = 3 + 2 + 1 + 0 = **6**.

| Pass | Comparisons (j) | Swaps | Array after pass |
|------|-----------------|-------|------------------|
| 1 (i=0) | 6>2 Y, 6>9 N, 9>1 Y, 9>5 Y | 3 | `[2, 6, 1, 5, 9]` |
| 2 (i=1) | 2>6 N, 6>1 Y, 6>5 Y | 2 | `[2, 1, 5, 6, 9]` |
| 3 (i=2) | 2>1 Y, 2>5 N | 1 | `[1, 2, 5, 6, 9]` |
| 4 (i=3) | 1>2 N | 0 | `[1, 2, 5, 6, 9]` → `swapped = false`, break |

**Q2.** 3 swaps and $4 + 3 + 2 + 1 = 10$ comparisons (Selection Sort always makes $\frac{N(N-1)}{2}$ comparisons).

| Pass | Scan range | Minimum found | Swap? | Array after pass |
|------|-----------|---------------|-------|------------------|
| i=0 | `[29,10,14,37,13]` | 10 at idx 1 | yes | `[10, 29, 14, 37, 13]` |
| i=1 | `[29,14,37,13]` | 13 at idx 4 | yes | `[10, 13, 14, 37, 29]` |
| i=2 | `[14,37,29]` | 14 at idx 2 | no (`min_idx == i`) | `[10, 13, 14, 37, 29]` |
| i=3 | `[37,29]` | 29 at idx 4 | yes | `[10, 13, 14, 29, 37]` |

**Q3.** Shifts per `i`: 0, 1, 0, 2, 5 → total **8**. The total number of shifts always equals the number of **inversions** (pairs $i < j$ with $a_i > a_j$). Here they are (3,2), (7,4), (7,5), (7,2), (4,2), (9,5), (9,2), (5,2) = 8.

| i | key | Elements shifted | Array after insert |
|---|-----|------------------|--------------------|
| 1 | 7 | none | `[3, 7, 4, 9, 5, 2]` |
| 2 | 4 | 7 | `[3, 4, 7, 9, 5, 2]` |
| 3 | 9 | none | `[3, 4, 7, 9, 5, 2]` |
| 4 | 5 | 9, 7 | `[3, 4, 5, 7, 9, 2]` |
| 5 | 2 | 9, 7, 5, 4, 3 | `[2, 3, 4, 5, 7, 9]` |

**Q4.** Final order: `[1, 3b, 3a]` — the equal keys got **reversed**, so Selection Sort is **unstable**.
- `i = 0`: minimum is `1` at index 2 → `swap(arr[0], arr[2])` → `[1, 3b, 3a]`. The long-distance swap jumped `3a` over `3b`.
- `i = 1`: `min_idx = 1` (`3b`); `3a < 3b`? No (strict `<`) → no swap.
Using strict `<` does not save stability; the swap itself is the culprit (exactly what the chapter's "Duplicate Elements" note warns).

**Q5.** It prints:

```bash
Comparisons: 8
Shifts: 1
```

Every `i` does 1 `arr[j] > key` check (the one that stops the loop, counted by `if (j >= 0) comparisons++`), except `key = 4`, which does 2: `5 > 4` yes (counted inside the loop) and `3 > 4` no (counted after it). That is $7 + 1 = 8$. Shifts is 1 (only `5` moves). The `j >= 0` guard matters when a key slides all the way to index 0: the loop then stops on the bounds check, and no value comparison happened.

The mistaken version with one unconditional `comparisons++` after the loop prints `Comparisons: 7`: it counts outer-loop iterations ($N - 1 = 7$), not the real number of `arr[j] > key` checks.

**E1 — reference solution**

```cpp
int bubbleSortCountSwaps(vector<int>& arr) {
    int n = arr.size(), swaps = 0;
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swaps++;
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return swaps;
}
```

Time $O(N^2)$, space $O(1)$. Each adjacent swap fixes exactly one inversion, so the returned value is the inversion count (7 for the chapter's `[5, 3, 8, 1, 2]`: 3 + 2 + 2 swaps in its dry-run table).

**E2 — reference solution**

```cpp
void binaryInsertionSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        // upper_bound: first position whose value is > key,
        // so key lands AFTER any equal keys -> stable.
        int pos = upper_bound(arr.begin(), arr.begin() + i, key) - arr.begin();
        for (int j = i - 1; j >= pos; j--) arr[j + 1] = arr[j];
        arr[pos] = key;
    }
}
```

Comparisons drop to $O(N \log N)$ total, but shifts are still $O(N^2)$ worst case, so time stays $O(N^2)$; space $O(1)$. Using `lower_bound` would break stability.

**E3 — reference solution**

```cpp
vector<int> kSmallestSorted(vector<int> arr, int k) {
    int n = arr.size();
    for (int i = 0; i < k && i < n; i++) {   // only k passes
        int min_idx = i;
        for (int j = i + 1; j < n; j++)
            if (arr[j] < arr[min_idx]) min_idx = j;
        if (min_idx != i) swap(arr[i], arr[min_idx]);
    }
    return vector<int>(arr.begin(), arr.begin() + k);
}
```

Time $O(N \cdot k)$, space $O(N)$ for the copy. After pass `i`, the prefix `arr[0..i]` holds the `i + 1` smallest values in final sorted order — the Selection Sort invariant — so stopping after `k` passes is enough.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The $O(N^2)$ Sorts**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 O n2 sorts** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

