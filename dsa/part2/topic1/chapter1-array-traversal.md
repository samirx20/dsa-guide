# Part 2, Topic 1: Array Basics & Kadane's Algorithm
## Chapter 1: 1D and 2D Array Traversal

Arrays are the most fundamental data structure. You will manipulate arrays in almost every interview. Mastery begins with knowing how to efficiently traverse them.

### 1. 1D Array Traversal

A 1D array is a single line of elements. Traversing it is straightforward, but there are a few patterns you should have memorized.

**Standard Forward Traversal:**
```cpp
vector<int> nums = {1, 2, 3, 4, 5};
for (int i = 0; i < nums.size(); i++) {
    // Access nums[i]
    cout << nums[i] << " ";
}
```

**What's happening:**
- `i` starts at index 0 (first element)
- Loop continues while `i < nums.size()` (bounds check)
- Each iteration: print `nums[i]` then increment `i`
- Time complexity: O(N), Space complexity: O(1)

**ASCII Diagram of Forward Traversal:**
```
Index:    0     1     2     3     4
Array:  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
          ↑
          i=0 (start)

Iteration 1: i=0 → print 1
Iteration 2: i=1 → print 2
Iteration 3: i=2 → print 3
Iteration 4: i=3 → print 4
Iteration 5: i=4 → print 5
```

**Backward Traversal:**
Often used when you need to process elements from the end to the beginning (e.g., finding the next greater element).
```cpp
for (int i = nums.size() - 1; i >= 0; i--) {
    // Access nums[i]
    cout << nums[i] << " ";
}
```

**What's happening:**
- `i` starts at `nums.size() - 1` (last index)
- Loop continues while `i >= 0` (back to start)
- Each iteration: print `nums[i]` then decrement `i`
- Useful for: removing elements from end, building reversed strings

**ASCII Diagram of Backward Traversal:**
```
Index:    0     1     2     3     4
Array:  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
                                  ↑
                                  i=4 (start)

Iteration 1: i=4 → print 5
Iteration 2: i=3 → print 4
Iteration 3: i=2 → print 3
Iteration 4: i=1 → print 2
Iteration 5: i=0 → print 1
```

**Dry-Run Table:**
| Iteration | i Value | nums[i] | Output |
|-----------|---------|---------|--------|
| 1         | 0       | 1       | 1      |
| 2         | 1       | 2       | 1 2    |
| 3         | 2       | 3       | 1 2 3  |
| 4         | 3       | 4       | 1 2 3 4|
| 5         | 4       | 5       | 1 2 3 4 5|

### 2. 2D Array Traversal (Matrices)

A 2D array is a matrix (a grid with rows and columns). In C++, it is represented as a `vector<vector<int>>`.
*   `matrix.size()` gives the number of **Rows** ($R$).
*   `matrix[0].size()` gives the number of **Columns** ($C$).

#### Row-Major Traversal (Standard)
This is the most CPU-cache-friendly way to traverse a matrix. You read left-to-right across the first row, then move down to the next row.

```cpp
vector<vector<int>> matrix = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};

int ROWS = matrix.size();
int COLS = matrix[0].size();

for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
        cout << matrix[r][c] << " ";
    }
}
// Prints: 1 2 3 4 5 6 7 8 9
```

**What's happening:**
- Outer loop iterates over rows (0, 1, 2)
- Inner loop iterates over columns (0, 1, 2) for each row
- Access pattern: `[0][0] [0][1] [0][2] [1][0] [1][1] [1][2] [2][0] [2][1] [2][2]`
- Memory layout: row-major order matches C++ vector storage

**ASCII Diagram of Row-Major Traversal:**
```
Matrix:
┌─────┬─────┬─────┐
│  1  │  2  │  3  │  Row 0
├─────┼─────┼─────┤
│  4  │  5  │  6  │  Row 1
├─────┼─────┼─────┤
│  7  │  8  │  9  │  Row 2
└─────┴─────┴─────┘

Traversal Order:
(0,0) → (0,1) → (0,2) → (1,0) → (1,1) → (1,2) → (2,0) → (2,1) → (2,2)
   1   →   2   →   3   →   4   →   5   →   6   →   7   →   8   →   9
```

**Dry-Run Table:**
| Iteration | r | c | matrix[r][c] | Output So Far |
|-----------|---|---|--------------|---------------|
| 1         | 0 | 0 | 1            | 1             |
| 2         | 0 | 1 | 2            | 1 2           |
| 3         | 0 | 2 | 3            | 1 2 3         |
| 4         | 1 | 0 | 4            | 1 2 3 4       |
| 5         | 1 | 1 | 5            | 1 2 3 4 5     |
| 6         | 1 | 2 | 6            | 1 2 3 4 5 6   |
| 7         | 2 | 0 | 7            | 1 2 3 4 5 6 7 |
| 8         | 2 | 1 | 8            | 1 2 3 4 5 6 7 8|
| 9         | 2 | 2 | 9            | 1 2 3 4 5 6 7 8 9|

#### Column-Major Traversal
You read top-to-bottom down the first column, then move right to the next column. Notice how the loops are swapped!

```cpp
for (int c = 0; c < COLS; c++) {
    for (int r = 0; r < ROWS; r++) {
        cout << matrix[r][c] << " ";
    }
}
// Prints: 1 4 7 2 5 8 3 6 9
```

**What's happening:**
- Outer loop iterates over columns (0, 1, 2)
- Inner loop iterates over rows (0, 1, 2) for each column
- Access pattern: `[0][0] [1][0] [2][0] [0][1] [1][1] [2][1] [0][2] [1][2] [2][2]`
- Less cache-friendly but needed for certain algorithms

**ASCII Diagram of Column-Major Traversal:**
```
Matrix:
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘

Traversal Order:
(0,0) → (1,0) → (2,0) → (0,1) → (1,1) → (2,1) → (0,2) → (1,2) → (2,2)
   1   →   4   →   7   →   2   →   5   →   8   →   3   →   6   →   9
```

**Comparison Table: Row-Major vs Column-Major**
| Aspect | Row-Major | Column-Major |
|--------|-----------|--------------|
| Outer Loop | Rows (r) | Columns (c) |
| Inner Loop | Columns (c) | Rows (r) |
| Cache Friendliness | High | Low |
| Use Case | Most algorithms | Column operations |
| Time Complexity | O(R×C) | O(R×C) |

### 3. Diagonal Traversal

Traversing diagonally is a common trick for specific interview questions (like validating a Sudoku board or traversing a matrix in a zig-zag).

**The Main Diagonal (Top-Left to Bottom-Right):**
The key property of the main diagonal is that the row index equals the column index ($r == c$).
```cpp
// Assuming a square matrix (ROWS == COLS)
for (int i = 0; i < ROWS; i++) {
    cout << matrix[i][i] << " ";
}
// Prints: 1 5 9
```

**What's happening:**
- Single loop variable `i` serves as both row and column index
- Access pattern: `[0][0] [1][1] [2][2]`
- Only works for square matrices (ROWS == COLS)

**ASCII Diagram of Main Diagonal:**
```
Matrix:
┌─────┬─────┬─────┐
│ [1] │  2  │  3  │  [1] is at (0,0)
├─────┼─────┼─────┤
│  4  │ [5] │  6  │  [5] is at (1,1)
├─────┼─────┼─────┤
│  7  │  8  │ [9] │  [9] is at (2,2)
└─────┴─────┴─────┘

Diagonal: (0,0) → (1,1) → (2,2)
Values: 1 → 5 → 9
```

**The Anti-Diagonal (Top-Right to Bottom-Left):**
The key property is that the sum of the row index and column index equals $N - 1$, where $N$ is the size of the square matrix. Therefore, $c = (N - 1) - r$.
```cpp
int N = matrix.size();
for (int r = 0; r < N; r++) {
    int c = N - 1 - r;
    cout << matrix[r][c] << " ";
}
// Prints: 3 5 7
```

**What's happening:**
- For each row `r`, calculate column `c = N - 1 - r`
- Access pattern: `[0][2] [1][1] [2][0]`
- The anti-diagonal sum is constant: r + c = N - 1

**ASCII Diagram of Anti-Diagonal:**
```
Matrix:
┌─────┬─────┬─────┐
│  1  │  2  │ [3] │  [3] is at (0,2)
├─────┼─────┼─────┤
│  4  │ [5] │  6  │  [5] is at (1,1)
├─────┼─────┼─────┤
│ [7] │  8  │  9  │  [7] is at (2,0)
└─────┴─────┴─────┘

Anti-Diagonal: (0,2) → (1,1) → (2,0)
Values: 3 → 5 → 7
```

**Dry-Run Table for Anti-Diagonal:**
| Iteration | r | c = N-1-r | matrix[r][c] |
|-----------|---|-----------|--------------|
| 1         | 0 | 2         | 3            |
| 2         | 1 | 1         | 5            |
| 3         | 2 | 0         | 7            |

### 4. Common Error Scenarios

**Error 1: Off-by-One in Bounds Checking**
```cpp
// WRONG: Accessing out of bounds
for (int i = 0; i <= nums.size(); i++) {  // Should be < not <=
    cout << nums[i];  // When i == size(), this crashes
}

// CORRECT:
for (int i = 0; i < nums.size(); i++) {
    cout << nums[i];
}
```

**What's happening:** The `<=` allows `i` to reach `nums.size()`, which is one past the last valid index.

**Error 2: Empty Matrix Check**
```cpp
// WRONG: No empty matrix check
int COLS = matrix[0].size();  // Crashes if matrix is empty

// CORRECT:
if (matrix.empty() || matrix[0].empty()) {
    return 0;
}
int COLS = matrix[0].size();
```

**What's happening:** Accessing `matrix[0]` when matrix is empty causes undefined behavior.

**Error 3: Column-Major Cache Misses**
```cpp
// SLOW: Column-major traversal (poor cache locality)
for (int c = 0; c < COLS; c++) {
    for (int r = 0; r < ROWS; r++) {
        process(matrix[r][c]);  // Jumps in memory each iteration
    }
}

// FASTER: If possible, restructure algorithm to use row-major
for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
        process(matrix[r][c]);  // Sequential memory access
    }
}
```

**What's happening:** Row-major traversal accesses memory sequentially, which is cache-friendly. Column-major jumps across rows.

### 5. Multiple Code Variations

**Variation 1: Range-Based For Loop (C++11)**
```cpp
// Simple iteration
for (int num : nums) {
    cout << num << " ";
}

// With reference (can modify)
for (int& num : nums) {
    num *= 2;
}

// With const reference (read-only, efficient)
for (const int& num : nums) {
    cout << num << " ";
}
```

**What's happening:** Range-based loops are cleaner but don't provide index access.

**Variation 2: Iterator-Based Traversal**
```cpp
for (auto it = nums.begin(); it != nums.end(); ++it) {
    cout << *it << " ";
}
```

**What's happening:** Useful when you need iterator operations like `next()`, `prev()`, or `erase()`.

**Variation 3: While Loop Traversal**
```cpp
int i = 0;
while (i < nums.size()) {
    cout << nums[i] << " ";
    i++;
}
```

**What's happening:** Useful when increment logic is complex (e.g., skipping elements).

**Variation 4: Recursive Traversal**
```cpp
void traverse(const vector<int>& nums, int index) {
    if (index >= nums.size()) return;
    cout << nums[index] << " ";
    traverse(nums, index + 1);
}

// Usage: traverse(nums, 0);
```

**What's happening:** Useful for divide-and-conquer algorithms.

### Summary

**Quick Reference Table:**
| Pattern | Use Case | Time | Space |
|---------|----------|------|-------|
| Forward Traversal | Default iteration | O(N) | O(1) |
| Backward Traversal | Remove from end, reverse | O(N) | O(1) |
| Row-Major | Matrix traversal (cache-friendly) | O(R×C) | O(1) |
| Column-Major | Column operations | O(R×C) | O(1) |
| Main Diagonal | Square matrix diagonal | O(N) | O(1) |
| Anti-Diagonal | Reverse diagonal | O(N) | O(1) |

**Key Takeaways:**
- Always double-check array bounds to avoid `Index Out of Bounds` errors.
- Memorize how to extract `ROWS` and `COLS` from a 2D vector.
- Understand the difference between looping `r` then `c` (Row-Major) vs `c` then `r` (Column-Major).
- Row-major is cache-friendly; prefer it when possible.
- Check for empty matrices before accessing `[0]`.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Using the chapter's backward traversal loop, what is printed for `nums = {3, 1, 4, 1, 5}`?
```cpp
for (int i = nums.size() - 1; i >= 0; i--) {
    cout << nums[i] << " ";
}
```

**Q2.** The chapter's column-major loop is run on a *non-square* matrix. What does it print?
```cpp
vector<vector<int>> matrix = {
    {1, 2, 3},
    {4, 5, 6}
};
int ROWS = matrix.size();     // ?
int COLS = matrix[0].size();  // ?
for (int c = 0; c < COLS; c++) {
    for (int r = 0; r < ROWS; r++) {
        cout << matrix[r][c] << " ";
    }
}
```

**Q3.** Run the chapter's anti-diagonal loop (`c = N - 1 - r`) on this $4 \times 4$ matrix. Fill in the dry-run table and give the printed output.
```cpp
vector<vector<int>> matrix = {
    { 1,  2,  3,  4},
    { 5,  6,  7,  8},
    { 9, 10, 11, 12},
    {13, 14, 15, 16}
};
```
| Iteration | r | c = N-1-r | matrix[r][c] |
|-----------|---|-----------|--------------|
| 1         | 0 | ?         | ?            |
| 2         | 1 | ?         | ?            |
| 3         | 2 | ?         | ?            |
| 4         | 3 | ?         | ?            |

**Q4.** Variation 1 shows range-based loops by value and by reference. Starting from `nums = {1, 2, 3}` each time, what does each snippet print?
```cpp
// Snippet A
for (int num : nums) { num *= 2; }
for (int num : nums) cout << num << " ";

// Snippet B
for (int& num : nums) { num *= 2; }
for (int num : nums) cout << num << " ";
```

**Q5.** With `nums = {10, 20, 30}`, Error 1's buggy loop `for (int i = 0; i <= nums.size(); i++)` runs how many times, and on which value of `i` does it read out of bounds?

### Coding Exercises

**E1 (Easy).** Diagonal sum. Return the sum of the main diagonal plus the anti-diagonal of a square matrix, counting the centre cell only once when $N$ is odd.
```cpp
int diagonalSum(const vector<vector<int>>& mat);
```
- `{{1,2,3},{4,5,6},{7,8,9}}` → `25`
- A $4 \times 4$ matrix of all `1`s → `8`

**E2 (Easy–Medium).** Transpose. Given an $R \times C$ matrix, return its $C \times R$ transpose (`result[c][r] = matrix[r][c]`). Handle the empty matrix.
```cpp
vector<vector<int>> transpose(const vector<vector<int>>& matrix);
```
- `{{1,2,3},{4,5,6}}` → `{{1,4},{2,5},{3,6}}`
- `{}` → `{}`

**E3 (Medium).** Spiral order. Return all elements in clockwise spiral order, starting at `(0,0)`. Must work for non-square and single-row/column matrices.
```cpp
vector<int> spiralOrder(const vector<vector<int>>& matrix);
```
- `{{1,2,3},{4,5,6},{7,8,9}}` → `1 2 3 6 9 8 7 4 5`
- `{{1,2,3,4},{5,6,7,8},{9,10,11,12}}` → `1 2 3 4 8 12 11 10 9 5 6 7`

#### Dry-Run: Answers

**Q1.** Output: `5 1 4 1 3`

| Iteration | i | nums[i] | Output so far |
|-----------|---|---------|---------------|
| 1 | 4 | 5 | 5 |
| 2 | 3 | 1 | 5 1 |
| 3 | 2 | 4 | 5 1 4 |
| 4 | 1 | 1 | 5 1 4 1 |
| 5 | 0 | 3 | 5 1 4 1 3 |

**Q2.** `ROWS = 2`, `COLS = 3`. Output: `1 4 2 5 3 6`. The outer loop fixes a column, the inner loop walks down both rows: column 0 gives `1 4`, column 1 gives `2 5`, column 2 gives `3 6`.

**Q3.** $N = 4$, so $c = 3 - r$. Output: `4 7 10 13`

| Iteration | r | c = N-1-r | matrix[r][c] |
|-----------|---|-----------|--------------|
| 1         | 0 | 3         | 4            |
| 2         | 1 | 2         | 7            |
| 3         | 2 | 1         | 10           |
| 4         | 3 | 0         | 13           |

Every visited cell satisfies $r + c = N - 1 = 3$.

**Q4.** Snippet A prints `1 2 3`, because `num` is a *copy* and doubling it never touches the vector. Snippet B prints `2 4 6`, because `int&` binds to each element, so `num *= 2` writes into `nums`.

**Q5.** The condition `i <= 3` is true for `i = 0, 1, 2, 3`, so the body runs **4 times**. Iterations `i = 0, 1, 2` read `10, 20, 30`; iteration `i = 3` reads `nums[3]`, one past the last valid index, which is undefined behaviour (garbage, a crash, or apparently "nothing").

**E1 — reference solution**
```cpp
int diagonalSum(const vector<vector<int>>& mat) {
    int n = mat.size();
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += mat[i][i];                 // main diagonal: r == c
        if (i != n - 1 - i) {             // skip the shared centre cell
            sum += mat[i][n - 1 - i];     // anti-diagonal: c = N-1-r
        }
    }
    return sum;
}
```
Trace on the $3 \times 3$ example: main diagonal $1 + 5 + 9 = 15$, anti-diagonal without the centre $3 + 7 = 10$, total $25$. Time $O(N)$, space $O(1)$.

**E2 — reference solution**
```cpp
vector<vector<int>> transpose(const vector<vector<int>>& matrix) {
    if (matrix.empty() || matrix[0].empty()) return {};
    int ROWS = matrix.size();
    int COLS = matrix[0].size();
    vector<vector<int>> result(COLS, vector<int>(ROWS));
    for (int r = 0; r < ROWS; r++) {          // row-major read (cache-friendly)
        for (int c = 0; c < COLS; c++) {
            result[c][r] = matrix[r][c];
        }
    }
    return result;
}
```
The result has its dimensions swapped (`COLS` rows of length `ROWS`). Time $O(R \times C)$, space $O(R \times C)$ for the output.

**E3 — reference solution**
```cpp
vector<int> spiralOrder(const vector<vector<int>>& matrix) {
    vector<int> out;
    if (matrix.empty() || matrix[0].empty()) return out;
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
        right--;
        if (top <= bottom) {                       // a row is still left
            for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {                       // a column is still left
            for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
            left++;
        }
    }
    return out;
}
```
Four shrinking boundaries; the two `if` guards stop a single remaining row or column from being emitted twice. Each cell is pushed exactly once: time $O(R \times C)$, extra space $O(1)$ beyond the output.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: 1D and 2D Array Traversal**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 array traversal** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

