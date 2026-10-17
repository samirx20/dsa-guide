# Part 4, Topic 1: Binary Search Patterns
## Chapter 2: Searching Rotated & 2D Arrays

Interviewers often add twists to the standard Binary Search to test if you truly understand the `left` and `right` bounding logic.

---

### 1. Rotated Sorted Arrays

**The Problem:** You have an array that *was* sorted, but it was rotated around a pivot point an unknown number of times. 
`Original: [1, 2, 3, 4, 5, 6, 7]`
`Rotated:  [4, 5, 6, 7, 1, 2, 3]`
How do you find a target in $O(\log N)$ time?

**The Intuition:**
Even though the whole array isn't sorted, **at least one half of the array is ALWAYS perfectly sorted.** 
If you look at `[4, 5, 6, 7, 1, 2, 3]` and pick the middle (`7`), the left half `[4, 5, 6, 7]` is perfectly sorted. 

1. Find the `mid` element.
2. Check which half (Left or Right) is perfectly sorted.
3. Check if your `target` falls within the boundaries of that perfectly sorted half.
4. If it does, discard the unsorted half. If it doesn't, discard the sorted half!

**Visual Decision Tree:**
```
         Is nums[left] <= nums[mid]?
         /                          \
       YES                          NO
       /                              \
  LEFT half is sorted            RIGHT half is sorted
  /          \                   /            \
Is target in   No              No            Is target in
[left, mid)?                  (target in     [mid, right]?
/          \                  unsorted       /          \
YES         NO                half)         YES         NO
Go LEFT     Go RIGHT                       Go RIGHT    Go LEFT
```

```cpp
int searchRotated(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        
        // 1. Is the LEFT half perfectly sorted?
        if (nums[left] <= nums[mid]) {
            // Does the target fall within this sorted left half?
            if (target >= nums[left] && target < nums[mid]) {
                right = mid - 1; // Yes! Target is here. Discard right half.
            } else {
                left = mid + 1;  // No. Target must be in the unsorted right half.
            }
        } 
        // 2. Otherwise, the RIGHT half MUST be perfectly sorted
        else {
            // Does the target fall within this sorted right half?
            if (target > nums[mid] && target <= nums[right]) {
                left = mid + 1; // Yes! Target is here.
            } else {
                right = mid - 1; // No. Target must be in the unsorted left half.
            }
        }
    }
    return -1;
}
```

**What's happening:**
```cpp
// The key insight: when nums[left] <= nums[mid], the LEFT half is sorted.
// This is because in a rotated sorted array, if the leftmost element
// is <= the middle element, there's no rotation "break" in the left half.
//
// nums[left] <= nums[mid] means left half is sorted:
//   [4, 5, 6, 7, 1, 2, 3]
//    L        M
//    4 <= 7 ✓ → left half [4,5,6,7] is sorted
//
// nums[left] > nums[mid] means right half is sorted:
//   [4, 5, 6, 7, 1, 2, 3]
//    L        M
//    Wait, let's try with mid on the other side...
//   [6, 7, 1, 2, 3, 4, 5]
//    L        M
//    6 > 2 ✗ → left half NOT sorted, so right half IS sorted
```

---

### 2. Dry-Run: Rotated Array Search

Let's trace `searchRotated` with `nums = [4, 5, 6, 7, 0, 1, 2]` and `target = 0`.

| Iteration | left | right | mid | nums[mid] | Left Sorted? | Target in Sorted Half? | Action |
|-----------|------|-------|-----|-----------|-------------|----------------------|--------|
| 1 | 0 | 6 | 3 | 7 | Yes (4≤7) | No (0∉[4,7)) | `left = 4` |
| 2 | 4 | 6 | 5 | 1 | Yes (0≤1) | Yes (0∈[0,1)) | `right = 4` |
| 3 | 4 | 4 | 4 | 0 | — | — | **return 4** |

**Step-by-step Array Diagram:**
```
Iteration 1: left=0, right=6, mid=3
[4, 5, 6, 7, 0, 1, 2]
 L        M        R
nums[left]=4 <= nums[mid]=7 → LEFT half sorted
Is target 0 in [4, 7)? No → go RIGHT
→ left = mid + 1 = 4

Iteration 2: left=4, right=6, mid=5
[4, 5, 6, 7, 0, 1, 2]
             L     M  R
nums[left]=0 <= nums[mid]=1 → LEFT half sorted
Is target 0 in [0, 1)? Yes → go LEFT
Actually: target >= nums[left] (0 >= 0 ✓) AND target < nums[mid] (0 < 1 ✓)
→ right = mid - 1 = 4

Iteration 3: left=4, right=4, mid=4
[4, 5, 6, 7, 0, 1, 2]
             LMR
nums[4]=0 == target=0 → FOUND! return 4
```

---

### 3. Finding Minimum in Rotated Sorted Array

**The Problem:** Array was rotated. Find the smallest element in $O(\log N)$ time.

**The Intuition:** The minimum element is the only element that is *smaller* than its previous element (the "drop-off" point). Compare `nums[mid]` to `nums[right]`:
- If `nums[mid] > nums[right]`: minimum is to the RIGHT (we're in the high section)
- If `nums[mid] <= nums[right]`: minimum is at `mid` or to the LEFT (we're in the low section)

```cpp
int findMin(vector<int>& nums) {
    int left = 0, right = nums.size() - 1;
    
    while (left < right) {  // Note: left < right, NOT left <= right
        int mid = left + (right - left) / 2;
        
        if (nums[mid] > nums[right]) {
            // The minimum MUST be to the right
            left = mid + 1;
        } else {
            // The minimum is mid, or to the left of mid
            // Don't exclude mid — it might BE the minimum!
            right = mid;
        }
    }
    // When left == right, we have found the minimum
    return nums[left]; 
}
```

**What's happening:**
```cpp
// Why compare with nums[right] instead of nums[left]?
// Because nums[left] might be in the rotated part.
// nums[right] is more reliable — it's always in the "lower" section.
//
// Why left < right (not left <= right)?
// When left == right, we've narrowed to exactly ONE element.
// No need to check further — that element IS the minimum.
//
// Why right = mid (not mid - 1)?
// If nums[mid] <= nums[right], mid COULD be the minimum.
// Excluding it with mid-1 might skip the answer.
```

**Dry-Run: Finding Minimum**

`nums = [4, 5, 6, 7, 0, 1, 2]`

| Iteration | left | right | mid | nums[mid] | nums[right] | Action |
|-----------|------|-------|-----|-----------|-------------|--------|
| 1 | 0 | 6 | 3 | 7 | 2 | 7 > 2 → `left = 4` |
| 2 | 4 | 6 | 5 | 1 | 2 | 1 ≤ 2 → `right = 5` |
| 3 | 4 | 5 | 4 | 0 | 1 | 0 ≤ 1 → `right = 4` |
| — | 4 | 4 | — | — | — | **left == right → return nums[4] = 0** |

```
Iteration 1: [4, 5, 6, 7, 0, 1, 2]
              L        M        R
              nums[mid]=7 > nums[right]=2 → min is RIGHT
→ left = 4

Iteration 2: [4, 5, 6, 7, 0, 1, 2]
                          L     M  R
                          nums[mid]=1 <= nums[right]=2 → min is LEFT (or mid)
→ right = 5

Iteration 3: [4, 5, 6, 7, 0, 1, 2]
                          L  M  R
                          nums[mid]=0 <= nums[right]=1 → min is LEFT (or mid)
→ right = 4

NOW: left=4, right=4 → DONE → return nums[4] = 0 ✓
```

---

### 4. Searching a 2D Matrix

**The Problem:** You are given an $M \times N$ matrix where every row is sorted from left to right, and the first integer of each row is greater than the last integer of the previous row. Find a target in $O(\log(M \times N))$ time.

```text
[
  [ 1,  3,  5,  7],
  [10, 11, 16, 20],
  [23, 30, 34, 60]
]
```

**The Intuition:**
Because of the strict sorting rules, if you flatten this matrix into a 1D array, it would be perfectly sorted! `[1, 3, 5, 7, 10, 11...]`. 
We can perform a standard 1D Binary Search. We just need a math formula to translate a 1D `mid` index back into a 2D `(row, col)` coordinate.

- `Row = mid / COLS`
- `Col = mid % COLS`

```cpp
bool searchMatrix(vector<vector<int>>& matrix, int target) {
    if (matrix.empty() || matrix[0].empty()) return false;
    
    int ROWS = matrix.size();
    int COLS = matrix[0].size();
    
    // Treat the matrix as a 1D array
    int left = 0;
    int right = ROWS * COLS - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        // Translate the 1D 'mid' index to 2D coordinates
        int mid_val = matrix[mid / COLS][mid % COLS];
        
        if (mid_val == target) {
            return true;
        } else if (mid_val < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return false;
}
```

**What's happening:**
```cpp
// The matrix is effectively a 1D array:
// Index:  0  1  2  3  4  5  6  7  8  9  10  11
// Value:  1  3  5  7 10 11 16 20 23 30  34  60
//
// To go from 1D index → 2D (row, col):
//   row = mid / COLS  (integer division gives the row)
//   col = mid % COLS  (remainder gives the column)
//
// Example: mid = 7, COLS = 4
//   row = 7 / 4 = 1
//   col = 7 % 4 = 3
//   matrix[1][3] = 20 ✓
```

**Visual Coordinate Mapping:**
```
Matrix with 1D indices:
       Col0  Col1  Col2  Col3
Row0  [  0,    1,    2,    3 ]
Row1  [  4,    5,    6,    7 ]
Row2  [  8,    9,   10,   11 ]

mid = 7 → row = 7/4 = 1, col = 7%4 = 3 → matrix[1][3] = 20
mid = 9 → row = 9/4 = 2, col = 9%4 = 1 → matrix[2][1] = 30
```

**Dry-Run: Search for 16**

| Iteration | left | right | mid | mid/COLS | mid%COLS | matrix[r][c] | Action |
|-----------|------|-------|-----|----------|----------|--------------|--------|
| 1 | 0 | 11 | 5 | 1 | 1 | 11 | 11 < 16 → `left = 6` |
| 2 | 6 | 11 | 8 | 2 | 0 | 23 | 23 > 16 → `right = 7` |
| 3 | 6 | 7 | 6 | 1 | 2 | 16 | **Found! return true** |

---

### 5. Alternative: Row-by-Row Binary Search

If the matrix doesn't satisfy the "first element of next row > last element of previous row" rule, you can't flatten it. Instead, do Binary Search on each row.

```cpp
bool searchMatrixRows(vector<vector<int>>& matrix, int target) {
    for (auto& row : matrix) {
        // Binary search on this row
        int left = 0, right = row.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (row[mid] == target) return true;
            else if (row[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
    }
    return false;
}
// Time: O(M * log N) — less efficient than flattening
```

**What's happening:**
```cpp
// This approach is O(M * log N) where:
//   M = number of rows (we check each row)
//   log N = binary search within each row
//
// The flattened approach is O(log(M*N)) = O(log M + log N)
// So prefer the flattened version when possible.
```

---

### 6. Alternative: Staircase Search (O(M + N))

For matrices where rows are sorted and columns are sorted (but NOT the stricter rule above), use the "staircase" approach starting from top-right or bottom-left.

```cpp
bool searchMatrixStaircase(vector<vector<int>>& matrix, int target) {
    if (matrix.empty()) return false;
    int row = 0;
    int col = matrix[0].size() - 1;  // Start at top-right
    
    while (row < matrix.size() && col >= 0) {
        if (matrix[row][col] == target) return true;
        else if (matrix[row][col] > target) col--;   // Go left
        else row++;  // Go down
    }
    return false;
}
```

**What's happening:**
```cpp
// Starting from top-right corner:
// - If current > target: move LEFT (all elements below are even larger)
// - If current < target: move DOWN (all elements to the left are even smaller)
//
// Each step eliminates one row OR one column.
// Time: O(M + N)
// This is NOT binary search, but worth knowing as an alternative.
```

**Visual Walkthrough:**
```
Search for 16 in:
[ 1,  3,  5,  7]
[10, 11, 16, 20]
[23, 30, 34, 60]

Start: row=0, col=3 → matrix[0][3]=7 < 16 → go DOWN
       row=1, col=3 → matrix[1][3]=20 > 16 → go LEFT
       row=1, col=2 → matrix[1][2]=16 == 16 → FOUND!
```

---

### 7. Comparison: Which 2D Search to Use?

| Matrix Property | Method | Time | Notes |
|----------------|--------|------|-------|
| Rows sorted + first of row > last of prev row | Flattened 1D BS | $O(\log(M \times N))$ | Best option |
| Rows sorted + columns sorted (weaker rule) | Staircase | $O(M + N)$ | Simple and fast |
| No special properties | Row-by-row BS | $O(M \log N)$ | Fallback |

---

### 8. Quick Reference

| Concept | Detail |
|---------|--------|
| **Rotated array key** | At least one half is always sorted |
| **Which half is sorted** | `nums[left] <= nums[mid]` → left half sorted |
| **Find minimum** | Compare `nums[mid]` with `nums[right]`, use `left < right` |
| **2D matrix flattened** | `row = mid / COLS`, `col = mid % COLS` |
| **Flattened time** | $O(\log(M \times N))$ |
| **Staircase alternative** | Start top-right, go left/down, $O(M + N)$ |
| **Edge case** | Empty matrix or empty rows — check before accessing |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Both branches of the rotated search.** Trace `searchRotated` on `[6, 7, 1, 2, 3, 4, 5]` with `target = 3`. For each iteration record `left`, `right`, `mid`, `nums[mid]`, which half is sorted, and the action.

**Q2. `findMin` on two inputs.** Trace `findMin` on `[3, 4, 5, 1, 2]` and on the un-rotated `[1, 2, 3, 4, 5]`. How many loop iterations does each take, and what does each return?

**Q3. A miss in the flattened matrix.** Run `searchMatrix` on the chapter's 3×4 matrix with `target = 13`. For each iteration give `mid`, the `(row, col)` it maps to, and the value. What is returned?

**Q4. Staircase path.** The matrix below has sorted rows and sorted columns, but row 1 starts with `2 < 11`, so it cannot be flattened. List every cell `searchMatrixStaircase` visits for `target = 9` and for `target = 15`, and what each search returns.

```cpp
vector<vector<int>> m = {
    { 1,  4,  7, 11},
    { 2,  5,  8, 12},
    { 3,  6,  9, 16},
    {10, 13, 14, 17}
};
```

**Q5. Why `<=`?** In `searchRotated`, suppose the check were written `if (nums[left] < nums[mid])` (strict). Trace both versions on `nums = [3, 1]`, `target = 1`. What does each return?

### Coding Exercises

**E1 (Easy).** *Rotation count.* A sorted array of **distinct** values was rotated right `k` times. Return `k` (which is the index of the minimum) in $O(\log N)$, reusing `findMin`'s logic.

```cpp
int rotationCount(vector<int>& nums);
```

- `[4, 5, 6, 7, 0, 1, 2]` → `4`
- `[1, 2, 3]` → `0`

**E2 (Easy–Medium).** *Two-pass rotated search.* Find the pivot (index of the minimum) first, then run a plain Golden-Template binary search on whichever sorted piece — `[0, pivot-1]` or `[pivot, n-1]` — can contain the target. Distinct values.

```cpp
int searchRotatedTwoPass(vector<int>& nums, int target);
```

- `nums = [4, 5, 6, 7, 0, 1, 2], target = 0` → `4`
- `nums = [4, 5, 6, 7, 0, 1, 2], target = 3` → `-1`

**E3 (Medium).** *Rotated array with duplicates.* Values may repeat, so `nums[left] == nums[mid] == nums[right]` can make it impossible to tell which half is sorted. Return whether `target` exists. (Worst case is allowed to degrade to $O(N)$.)

```cpp
bool searchRotatedDup(vector<int>& nums, int target);
```

- `nums = [2, 5, 6, 0, 0, 1, 2], target = 0` → `true`;  `target = 3` → `false`
- `nums = [1, 0, 1, 1, 1], target = 0` → `true`

#### Dry-Run: Answers

**Q1.** Returns **4** after 3 iterations.

| Iter | left | right | mid | nums[mid] | Sorted half | Target in it? | Action |
|------|------|-------|-----|-----------|-------------|---------------|--------|
| 1 | 0 | 6 | 3 | 2 | right (6 > 2) | 3 > 2 and 3 <= 5 → yes | `left = 4` |
| 2 | 4 | 6 | 5 | 4 | left (3 <= 4) | 3 >= 3 and 3 < 4 → yes | `right = 4` |
| 3 | 4 | 4 | 4 | 3 | — | — | **return 4** |

**Q2.**
- `[3, 4, 5, 1, 2]`: 2 iterations, returns **1**.

| left | right | mid | nums[mid] | nums[right] | Action |
|------|-------|-----|-----------|-------------|--------|
| 0 | 4 | 2 | 5 | 2 | 5 > 2 → `left = 3` |
| 3 | 4 | 3 | 1 | 2 | 1 <= 2 → `right = 3` |
| 3 | 3 | — | — | — | return `nums[3] = 1` |

- `[1, 2, 3, 4, 5]`: 3 iterations, returns **1**. Every comparison is `nums[mid] <= nums[right]`, so `right` shrinks `4 → 2 → 1 → 0` (mids 2, 1, 0) and `left` never moves. No special case is needed for an un-rotated array.

**Q3.** Returns **false**.

| Iter | left | right | mid | (row, col) | value | Action |
|------|------|-------|-----|------------|-------|--------|
| 1 | 0 | 11 | 5 | (1, 1) | 11 | 11 < 13 → `left = 6` |
| 2 | 6 | 11 | 8 | (2, 0) | 23 | 23 > 13 → `right = 7` |
| 3 | 6 | 7 | 6 | (1, 2) | 16 | 16 > 13 → `right = 5` |
| — | 6 | 5 | — | — | — | `left > right` → false |

**Q4.**
- `target = 9`: (0,3)=11 → left; (0,2)=7 → down; (1,2)=8 → down; (2,2)=9 → **true**. 4 cells.
- `target = 15`: (0,3)=11 → down; (1,3)=12 → down; (2,3)=16 → left; (2,2)=9 → down; (3,2)=14 → down; `row = 4` leaves the matrix → **false**. 5 cells.

Each step discards a whole row (moving down) or a whole column (moving left), so at most $M + N - 1$ cells are visited.

**Q5.** With `<=`: returns **1**. With `<`: returns **-1** (bug).
- Both: `left = 0, right = 1, mid = 0`, `nums[0] = 3 != 1`.
- `<=` version: `3 <= 3` → left half `[3]` is "sorted"; is `1` in `[3, 3)`? no → `left = 1`. Next iteration `mid = 1`, `nums[1] = 1` → return 1.
- `<` version: `3 < 3` is false → assumes the right half `[mid..right] = [3, 1]` is sorted (it is not); is `1 > 3`? no → `right = -1`, loop ends, returns -1.
When `left == mid` (a 1-element left half), that half is trivially sorted; `<=` is what recognises it.

**E1 — reference solution**

```cpp
int rotationCount(vector<int>& nums) {
    int left = 0, right = (int)nums.size() - 1;
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] > nums[right]) left = mid + 1;
        else right = mid;
    }
    return left;   // index of the minimum = number of rotations
}
```

Time $O(\log N)$, space $O(1)$. Same loop as `findMin`, but return the index instead of the value.

**E2 — reference solution**

```cpp
int binarySearchRange(vector<int>& nums, int left, int right, int target) {
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int searchRotatedTwoPass(vector<int>& nums, int target) {
    if (nums.empty()) return -1;
    int n = nums.size();
    int pivot = rotationCount(nums);             // E1
    // [pivot, n-1] holds the smallest values; [0, pivot-1] the largest
    if (target >= nums[pivot] && target <= nums[n - 1])
        return binarySearchRange(nums, pivot, n - 1, target);
    return binarySearchRange(nums, 0, pivot - 1, target);
}
```

Time $O(\log N)$ (two binary searches), space $O(1)$. Example 1: pivot = 4, `0` lies in `[nums[4], nums[6]] = [0, 2]` → search `[4, 6]` → index 4. Example 2: `3` is not in `[0, 2]` → search `[0, 3]` = `[4, 5, 6, 7]` → -1. When the array is not rotated, `pivot = 0` and the second range is empty.

**E3 — reference solution**

```cpp
bool searchRotatedDup(vector<int>& nums, int target) {
    int left = 0, right = (int)nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return true;

        if (nums[left] == nums[mid] && nums[mid] == nums[right]) {
            left++; right--;                     // can't tell which side is sorted
        } else if (nums[left] <= nums[mid]) {    // left half sorted
            if (target >= nums[left] && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {                                 // right half sorted
            if (target > nums[mid] && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return false;
}
```

Average $O(\log N)$, worst $O(N)$ (e.g. `[1, 1, 1, 1, 0, 1, 1]`), space $O(1)$. Trace `[1, 0, 1, 1, 1]`, target 0: `mid = 2`, ends and middle are all 1 → shrink to `left = 1, right = 3`; `mid = 2`, `nums[1] = 0 <= 1` → left half `[0, 1]` sorted, `0 >= 0 && 0 < 1` → `right = 1`; `mid = 1` → found. Dropping `nums[left]` and `nums[right]` is safe because both equal `nums[mid]`, which is already known not to be the target.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Searching Rotated & 2D Arrays**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 advanced binary search** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

