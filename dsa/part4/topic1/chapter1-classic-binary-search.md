# Part 4, Topic 1: Binary Search Patterns
## Chapter 1: The Classic Template

Binary Search is an $O(\log N)$ algorithm used to find the position of a target value within a **sorted** array. 

If you are asked to find an element in $O(\log N)$ time, or if the array is already sorted and you need to find a specific target, your brain should immediately jump to Binary Search.

---

### 1. The Intuition
Imagine looking for the word "Python" in a physical dictionary. You don't read every word from page 1 to 1000 ($O(N)$). You open the book to the exact middle. If you see words starting with "M", you know "Python" must be in the right half of the book. You tear the book in half, throw away the left side, and repeat the process on the remaining right half. 

Because you are cutting the search space in half every single step, it takes at most $\log_2(N)$ steps to find the target.

```
Search Space Reduction Visualization:

Step 0: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  (10 elements)
                   ^ mid = 5
         L-----------M-----------R

Step 1: [6, 7, 8, 9, 10]  (5 elements)
               ^ mid = 8
         L------M------R

Step 2: [9, 10]  (2 elements)
            ^ mid = 9
         L--M--R

Step 3: [10]  (1 element)
            ^ mid = 10
         LMR → Found!
```

---

### 2. The Golden Template
Binary Search is notorious for "off-by-one" errors (infinite loops, out-of-bounds exceptions). Memorize this exact template to avoid them.

```cpp
int binarySearch(vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size() - 1; // Right points to the LAST index
    
    // Condition: left <= right. 
    // If it was just 'left < right', you would miss checking the very last element 
    // when left and right point to the exact same index!
    while (left <= right) {
        
        // Calculate the middle index. 
        // WARNING: Do not use (left + right) / 2. 
        // If left and right are massive numbers, adding them will cause an Integer Overflow!
        int mid = left + (right - left) / 2; 
        
        if (nums[mid] == target) {
            return mid; // Target found!
        } 
        else if (nums[mid] < target) {
            // The mid element is too small. The target MUST be to the right.
            // We already checked 'mid', so the new search space starts at mid + 1.
            left = mid + 1;
        } 
        else {
            // The mid element is too big. The target MUST be to the left.
            // We already checked 'mid', so the new search space ends at mid - 1.
            right = mid - 1;
        }
    }
    
    // If the loop finishes and we haven't returned, the target doesn't exist.
    return -1; 
}
```

**What's happening:**
```cpp
int binarySearch(vector<int>& nums, int target) {
    int left = 0;                           // Start of search window
    int right = nums.size() - 1;            // End of search window (last valid index)
    
    while (left <= right) {                  // Search until window is empty
        int mid = left + (right - left) / 2; // Safe midpoint calculation
        
        if (nums[mid] == target) {
            return mid;                      // Found it → return index
        } 
        else if (nums[mid] < target) {
            left = mid + 1;                  // Target is to the RIGHT → shrink left
        } 
        else {
            right = mid - 1;                 // Target is to the LEFT → shrink right
        }
    }
    return -1;                               // Never found → return -1
}
```

---

### 3. Dry-Run Walkthrough

Let's trace through `binarySearch` with `nums = [1, 3, 5, 7, 9, 11, 13]` and `target = 9`.

**Iteration Table:**

| Iteration | left | right | mid | nums[mid] | Action |
|-----------|------|-------|-----|-----------|--------|
| 1 | 0 | 6 | 3 | 7 | 7 < 9 → `left = 4` |
| 2 | 4 | 6 | 5 | 11 | 11 > 9 → `right = 4` |
| 3 | 4 | 4 | 4 | 9 | 9 == 9 → **return 4** |

**Step-by-step Array Diagram:**

```
Iteration 1: left=0, right=6, mid=3
[1, 3, 5, 7, 9, 11, 13]
 L        M        R
nums[3]=7 < 9, target is to the RIGHT
→ left = mid + 1 = 4

Iteration 2: left=4, right=6, mid=5
[1, 3, 5, 7, 9, 11, 13]
             L     M  R
nums[5]=11 > 9, target is to the LEFT
→ right = mid - 1 = 4

Iteration 3: left=4, right=4, mid=4
[1, 3, 5, 7, 9, 11, 13]
                 LMR
nums[4]=9 == 9, FOUND! → return 4
```

---

### 4. Edge Case: Target Not Found

What happens when the target doesn't exist? Let's trace `nums = [1, 3, 5, 7, 9]` with `target = 6`.

| Iteration | left | right | mid | nums[mid] | Action |
|-----------|------|-------|-----|-----------|--------|
| 1 | 0 | 4 | 2 | 5 | 5 < 6 → `left = 3` |
| 2 | 3 | 4 | 3 | 7 | 7 > 6 → `right = 2` |
| — | — | — | — | — | **left (3) > right (2) → loop ends** |

```
Iteration 1: [1, 3, 5, 7, 9]
              L     M     R
              nums[2]=5 < 6, go right
→ left = 3

Iteration 2: [1, 3, 5, 7, 9]
                    L  M  R
                    nums[3]=7 > 6, go left
→ right = 2

NOW: left=3, right=2 → left > right → LOOP ENDS
Return -1 (not found)
```

**Why `left <= right` matters:** If we used `left < right`, the loop would exit when `left == right`, missing the case where the target is at that exact position.

---

### 5. Overflow Protection: Why `mid = left + (right - left) / 2`

```cpp
// DANGEROUS - can overflow!
int mid = (left + right) / 2;
// If left = 1,000,000,000 and right = 2,000,000,000
// left + right = 3,000,000,000 → overflows int (max ~2.1 billion)
// Result: undefined behavior!

// SAFE - no overflow possible
int mid = left + (right - left) / 2;
// left + (right - left) / 2
// = 1,000,000,000 + (1,000,000,000 / 2)
// = 1,000,000,000 + 500,000,000
// = 1,500,000,000 → fits in int
```

**What's happening:**
```cpp
int mid = left + (right - left) / 2;
//         ^^^^    ^^^^^^^^^^^^^^^
//         |            |
//         |            └── (right - left) / 2 = distance from left to midpoint
//         └── Start from left, add half the distance
// Same result as (left + right) / 2 but never overflows
```

---

### 6. Recursive Version

Some people find the recursive version easier to reason about (though iterative is preferred in interviews for O(1) space).

```cpp
int binarySearchRecursive(vector<int>& nums, int left, int right, int target) {
    // Base case: search space is empty
    if (left > right) return -1;
    
    int mid = left + (right - left) / 2;
    
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) return binarySearchRecursive(nums, mid + 1, right, target);
    else return binarySearchRecursive(nums, left, mid - 1, target);
}

// Usage:
// binarySearchRecursive(nums, 0, nums.size() - 1, target);
```

**What's happening:**
```cpp
// Recursive version does the SAME thing as iterative
// but uses the call stack instead of a while loop.
//
// Iterative:   while (left <= right) { ... }
// Recursive:   if (left > right) return -1;  // ← this is the loop termination
//
// Trade-off:
// Iterative: O(1) space (just variables)
// Recursive: O(log N) space (call stack)
```

---

### 7. C++ Built-in Bounds (For Interviews)

If an interviewer asks you to implement Binary Search, write the template above. However, if Binary Search is just a *small part* of a much larger problem, C++ provides built-in $O(\log N)$ functions you should use to save time.

- `std::lower_bound`: Finds the **first** position where a value could be inserted without violating the sorted order. (In simple terms: It finds the first element $\ge$ target).
- `std::upper_bound`: Finds the **last** position where a value could be inserted. (It finds the first element $>$ target).

```cpp
#include <algorithm>
#include <vector>

vector<int> nums = {10, 20, 20, 20, 30, 40};

// Find the FIRST 20
auto it1 = lower_bound(nums.begin(), nums.end(), 20);
cout << "First 20 is at index: " << distance(nums.begin(), it1); // Prints 1

// Find the FIRST element strictly GREATER than 20
auto it2 = upper_bound(nums.begin(), nums.end(), 20);
cout << "First element > 20 is at index: " << distance(nums.begin(), it2); // Prints 4
```

**What's happening:**
```cpp
// lower_bound and upper_bound return ITERATORS (pointers), not indices.
// Use distance(begin, it) to convert iterator to index.
//
// nums = {10, 20, 20, 20, 30, 40}
//          0   1   2   3   4   5
//
// lower_bound(20) → points to index 1 (first 20)
// upper_bound(20) → points to index 4 (first element AFTER all 20s)
//
// So the RANGE of 20s is [lower_bound, upper_bound) = indices [1, 4)
```

**Visual Diagram:**
```
nums =  [10, 20, 20, 20, 30, 40]
index:   0   1   2   3   4   5

lower_bound(20) ───────►│
                        v
                    [10, 20, 20, 20, 30, 40]
                         ↑
                        index 1 (first element >= 20)

upper_bound(20) ──────────────────►│
                                   v
                    [10, 20, 20, 20, 30, 40]
                                   ↑
                                  index 4 (first element > 20)

Range of 20s: indices 1, 2, 3 → [lower_bound, upper_bound)
Count = upper_bound - lower_bound = 4 - 1 = 3 copies of 20
```

---

### 8. When to Use `left <= right` vs `left < right`

| Condition | When to Use | What It Does |
|-----------|-------------|--------------|
| `left <= right` | **Classic search** — finding a specific target | Checks every element including when L == R |
| `left < right` | **Boundary finding** — finding first/last occurrence | Stops when L == R, leaving answer at `left` |

**Why `left < right` for boundary problems:**
```cpp
// Finding the first occurrence of target
while (left < right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] >= target) {
        right = mid;      // Don't exclude mid — it might BE the answer
    } else {
        left = mid + 1;
    }
}
// When loop ends, left == right == the first occurrence
return left;
```

**The key insight:** With `left < right`, when `left == right`, we've narrowed it to exactly one candidate. No need to check further.

---

### 9. Common Binary Search Mistakes

**Mistake 1: Forgetting overflow**
```cpp
// WRONG
int mid = (left + right) / 2;

// RIGHT
int mid = left + (right - left) / 2;
```

**Mistake 2: Off-by-one in pointer updates**
```cpp
// WRONG — infinite loop when left == mid
left = mid;

// RIGHT — always make progress
left = mid + 1;
```

**Mistake 3: Using `left < right` when you need `left <= right`**
```cpp
// If target is at the ONLY remaining position (left == right),
// left < right skips it entirely!
```

**Mistake 4: Not handling empty array**
```cpp
// Always check before accessing nums[left] or nums[right]
if (nums.empty()) return -1;
```

---

### 10. Comparison Table: Which Binary Search Variant?

| Problem Type | Template | Loop Condition | Pointer Update |
|--------------|----------|----------------|----------------|
| Find exact target | Classic | `left <= right` | `mid + 1` / `mid - 1` |
| Find first occurrence | Boundary | `left < right` | `mid` / `mid + 1` |
| Find last occurrence | Boundary | `left < right` | `mid + 1` / `mid` |
| Search on answer | Answer space | `left < right` | depends on feasibility |
| Rotated array | Modified classic | `left <= right` | varies |

---

### 11. Quick Reference

| Concept | Detail |
|---------|--------|
| **Trigger** | Sorted array + search requirement |
| **Time** | $O(\log N)$ |
| **Space** | $O(1)$ iterative, $O(\log N)$ recursive |
| **Loop condition** | `left <= right` for search, `left < right` for boundary |
| **Mid calculation** | `left + (right - left) / 2` (overflow-safe) |
| **Pointer update** | Always exclude `mid` with `mid + 1` or `mid - 1` (classic) |
| **Not found** | Loop exits with `left > right`, return `-1` |
| **Built-in C++** | `lower_bound`, `upper_bound` in `<algorithm>` |
| **Key invariant** | Answer is always in `[left, right]` at each iteration |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Classic Template**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 classic binary search** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

