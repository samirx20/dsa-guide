# Part 12, Topic 2: 2D Dynamic Programming
## Chapter 1: 2D DP Concepts

While 1D DP uses a single array `dp[i]` to represent the state at step `i`, **2D Dynamic Programming** uses a grid `dp[i][j]` because the state depends on TWO variables simultaneously.

---

## 1. When to use 2D DP

You almost always need a 2D DP table in two specific scenarios:

1. **Grid Traversal:** The problem literally takes place on a 2D grid or maze. 
   *(e.g., "Find the number of unique paths from the top-left to the bottom-right of an M x N grid").*
2. **Comparing Two Strings (Sequence Alignment):** The problem asks you to compare, match, or transform String A into String B. 
   *(e.g., "Find the Longest Common Subsequence between word1 and word2").*

### 1D DP vs 2D DP - When to Use What

| Scenario | Use 1D | Use 2D |
|---|---|---|
| **State depends on one variable** | Yes | No |
| **State depends on two variables** | No | Yes |
| **Grid/maze problem** | No | Yes |
| **Comparing two strings** | No | Yes |
| **Time complexity** | O(N) | O(M * N) |
| **Space complexity** | O(N) | O(M * N), optimized to O(N) |

---

## 2. Grid Traversal DP

In a Grid Traversal problem, `dp[r][c]` represents the answer for the specific cell at row `r` and column `c`.

### Example: Unique Paths

You can only move Down or Right. How many unique paths exist to reach the bottom-right?

**Step 1 — State:**
`dp[r][c]` is the total number of unique paths to reach cell `(r, c)`.

**Step 2 — Base Case:**
To reach any cell in the very top row, you can only go Right. There is only 1 path. 
To reach any cell in the very left column, you can only go Down. There is only 1 path. 
So, `dp[0][c] = 1` and `dp[r][0] = 1`.

**Step 3 — Transition:**
To reach cell `(r, c)`, you must have come from the cell *above* it `(r-1, c)` OR the cell to its *left* `(r, c-1)`. Therefore, the total paths to `(r, c)` is the sum of the paths to those two cells!
`dp[r][c] = dp[r-1][c] + dp[r][c-1]`

**Step 4 — Final Answer:**
`dp[m-1][n-1]`

### Grid Fill Visualization for 3x3 grid:

```
Step 1: Initialize base cases (all 1s)

    1   1   1
    1   ?   ?
    1   ?   ?

Step 2: Fill dp[1][1]
    dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2

    1   1   1
    1   2   ?
    1   ?   ?

Step 3: Fill dp[1][2]
    dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3

    1   1   1
    1   2   3
    1   ?   ?

Step 4: Fill dp[2][1]
    dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3

    1   1   1
    1   2   3
    1   3   ?

Step 5: Fill dp[2][2]
    dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6

    1   1   1
    1   2   3
    1   3   6

Answer: 6 unique paths in a 3x3 grid
```

### Code (3 variations):

```cpp
// Variation 1: Full 2D DP Table
int uniquePaths(int m, int n) {
    vector<vector<int>> dp(m, vector<int>(n, 1));
    
    for (int r = 1; r < m; r++) {
        for (int c = 1; c < n; c++) {
            dp[r][c] = dp[r-1][c] + dp[r][c-1];
        }
    }
    return dp[m-1][n-1];
}
// Time: O(M * N), Space: O(M * N)
```

**What's happening:**
```cpp
vector<vector<int>> dp(m, vector<int>(n, 1));
//  ^^^^^^^^^^^^^^^^  ^   ^^^^^^^^^^^^^^^^^^^^
//  |                 |   └── Each row has n elements, all initialized to 1
//  |                 └── Number of rows
//  └── 2D vector (m rows, each with n columns)

for (int r = 1; r < m; r++) {        // Skip row 0 (already filled with 1s)
    for (int c = 1; c < n; c++) {    // Skip col 0 (already filled with 1s)
        dp[r][c] = dp[r-1][c] + dp[r][c-1];
        //  ^^       ^^^^^^^^      ^^^^^^^^
        //  |        |             └── Cell to the left
        //  |        └── Cell above
        //  └── Current cell = sum of above and left
    }
}
```

```cpp
// Variation 2: Space Optimized (1D Array)
int uniquePaths(int m, int n) {
    vector<int> row(n, 1);
    
    for (int r = 1; r < m; r++) {
        for (int c = 1; c < n; c++) {
            row[c] = row[c] + row[c - 1];
        }
    }
    return row[n - 1];
}
// Time: O(M * N), Space: O(N)
```

**What's happening:**
```cpp
vector<int> row(n, 1);
//  ^^^^       ^
//  |          └── All initialized to 1 (base case: first row)
//  └── Single 1D array representing one row at a time

for (int r = 1; r < m; r++) {
    for (int c = 1; c < n; c++) {
        row[c] = row[c] + row[c - 1];
        //  ^^     ^^       ^^^^^^
        //  |      |        └── row[c-1] = cell to the left (already updated this row)
        //  |      └── row[c] = cell above (from previous row, NOT yet overwritten)
        //  └── Update in place: the old value is "above", the new value is "left"
    }
}
```

### Dry-Run: Space-Optimized for 3x3 grid

```
Initial:     row = [1, 1, 1]     ← Base case (first row)

r = 1:       row = [1, 2, 3]     ← Second row
             c=1: row[1] = 1 + 1 = 2
             c=2: row[2] = 2 + 1 = 3

r = 2:       row = [1, 3, 6]     ← Third row
             c=1: row[1] = 2 + 1 = 3
             c=2: row[2] = 3 + 3 = 6

Answer: row[2] = 6
```

---

## 3. String Comparison DP

In String Comparison problems, `dp[i][j]` usually represents the answer when considering the first `i` characters of String A and the first `j` characters of String B.

### The Golden Template for Strings

You always create a DP table of size `(A.length + 1) x (B.length + 1)`.
The extra `+ 1` row and column represent the **empty string ""**. This acts as your base case!

If `A = "abc"` and `B = "ace"`, the DP table looks like this:

|   | "" (0) | a (1) | c (2) | e (3) |
|---|---|---|---|---|
| **"" (0)** | 0 | 0 | 0 | 0 |
| **a (1)** | 0 | ? | ? | ? |
| **b (2)** | 0 | ? | ? | ? |
| **c (3)** | 0 | ? | ? | ? |

**What's happening:**
```
The extra row and column (index 0) represent the empty string.
dp[0][j] = 0: LCS of "" and "ace" is 0
dp[i][0] = 0: LCS of "abc" and "" is 0
Now we fill the rest using the transition logic.
```

### Transition Logic

When comparing `A[i-1]` and `B[j-1]` (we use `-1` because the strings are 0-indexed but our DP table is 1-indexed due to the empty string row/col):

- **If the characters MATCH:** You usually take the answer from the diagonal `dp[i-1][j-1]` and add 1. (The diagonal represents the answer for the strings *before* these matching characters were added).
- **If the characters DO NOT MATCH:** You usually take the maximum or minimum of the cell above `dp[i-1][j]` or the cell to the left `dp[i][j-1]`.

### Visual: LCS Fill for "abc" vs "ace"

```
        ""    a    c    e
    ┌────┬────┬────┬────┐
""  │  0 │  0 │  0 │  0 │
    ├────┼────┼────┼────┤
a   │  0 │  1 │  1 │  1 │  a==a → diagonal+1 = 1
    ├────┼────┼────┼────┤
b   │  0 │  1 │  1 │  1 │  b!=c, b!=e → max(above, left)
    ├────┼────┼────┼────┤
c   │  0 │  1 │  2 │  2 │  c==c → diagonal+1 = 2
    └────┴────┴────┴────┘

Answer: dp[3][3] = 2 (LCS is "ac")
```

**What's happening:**
- When `a==a` (i=1, j=1): Take diagonal `dp[0][0]=0`, add 1 → `dp[1][1]=1`
- When `b!=c` (i=2, j=2): Take max of `dp[1][2]=1` and `dp[2][1]=1` → `dp[2][2]=1`
- When `c==c` (i=3, j=2): Take diagonal `dp[2][1]=1`, add 1 → `dp[3][2]=2`

### Dry-Run Table for LCS("abcde", "ace"):

| i | j | text1[i-1] | text2[j-1] | Match? | dp[i][j] |
|---|---|---|---|---|---|
| 0 | 0 | — | — | — | 0 |
| 0 | 1 | — | a | — | 0 |
| 0 | 2 | — | c | — | 0 |
| 0 | 3 | — | e | — | 0 |
| 1 | 0 | a | — | — | 0 |
| 1 | 1 | a | a | Yes | dp[0][0]+1 = 1 |
| 1 | 2 | a | c | No | max(dp[0][2], dp[1][1]) = 1 |
| 1 | 3 | a | e | No | max(dp[0][3], dp[1][2]) = 1 |
| 2 | 0 | b | — | — | 0 |
| 2 | 1 | b | a | No | max(dp[1][1], dp[2][0]) = 1 |
| 2 | 2 | b | c | No | max(dp[1][2], dp[2][1]) = 1 |
| 2 | 3 | b | e | No | max(dp[1][3], dp[2][2]) = 1 |
| 3 | 0 | c | — | — | 0 |
| 3 | 1 | c | a | No | max(dp[2][1], dp[3][0]) = 1 |
| 3 | 2 | c | c | Yes | dp[2][1]+1 = 2 |
| 3 | 3 | c | e | No | max(dp[2][3], dp[3][2]) = 2 |
| 4 | 0 | d | — | — | 0 |
| 4 | 1 | d | a | No | max(dp[3][1], dp[4][0]) = 1 |
| 4 | 2 | d | c | No | max(dp[3][2], dp[4][1]) = 2 |
| 4 | 3 | d | e | No | max(dp[3][3], dp[4][2]) = 2 |
| 5 | 0 | e | — | — | 0 |
| 5 | 1 | e | a | No | max(dp[4][1], dp[5][0]) = 1 |
| 5 | 2 | e | c | No | max(dp[4][2], dp[5][1]) = 2 |
| 5 | 3 | e | e | Yes | dp[4][2]+1 = 3 |

Answer: dp[5][3] = 3 (LCS is "ace")

---

## 4. Space Optimization in 2D DP

Look at the transition for Unique Paths:
`dp[r][c] = dp[r-1][c] + dp[r][c-1]`

To calculate the current row `r`, we ONLY need the values from the *previous row* `r-1` and the *current row* we are building. We do not need row `r-2`, `r-3`, etc.

Therefore, an M x N matrix taking O(M x N) space can almost always be optimized down to a single 1D array of size N taking **O(N) space**!

### When Can You Space-Optimize?

| Pattern | Can Optimize? | From | To |
|---|---|---|---|
| Grid DP (row depends on row above) | Yes | O(M*N) | O(N) |
| String DP (row depends on row above) | Yes | O(M*N) | O(N) |
| String DP (need full table for backtracking) | No | O(M*N) | O(M*N) |

### The Optimization Pattern

```cpp
// Before optimization (2D):
vector<vector<int>> dp(m+1, vector<int>(n+1, 0));
for (int i = 1; i <= m; i++)
    for (int j = 1; j <= n; j++)
        dp[i][j] = f(dp[i-1][j], dp[i][j-1]);

// After optimization (1D):
vector<int> dp(n+1, 0);
for (int i = 1; i <= m; i++)
    for (int j = 1; j <= n; j++)
        dp[j] = f(dp[j], dp[j-1]);
// dp[j] = cell above (from previous row, not yet overwritten)
// dp[j-1] = cell to the left (already updated in this row)
```

**What's happening:**
```
Before: dp[r][c] uses dp[r-1][c] (above) and dp[r][c-1] (left)
After:  dp[c]   uses dp[c]   (above, not yet updated) and dp[c-1] (left, already updated)

The key insight: when we iterate left-to-right, dp[j] still holds the value from the previous row!
```

---

## 5. The 5-Step Framework for 2D DP

Before writing code, answer these questions:

1. **What are the two dimensions?** (e.g., row/column of grid, characters of two strings)
2. **What does dp[i][j] represent?** State definition
3. **What are the base cases?** Usually the first row and first column
4. **What is the transition?** How does dp[i][j] depend on previous cells?
5. **Where is the final answer?** Usually dp[m-1][n-1] or dp[m][n]

---

## Quick Reference

| Concept | Formula | Time | Space |
|---|---|---|---|
| **2D Grid DP** | `dp[r][c] = dp[r-1][c] + dp[r][c-1]` | O(M*N) | O(M*N) → O(N) |
| **LCS** | Match: `dp[i-1][j-1]+1`, No match: `max(dp[i-1][j], dp[i][j-1])` | O(M*N) | O(M*N) → O(N) |
| **Edit Distance** | Match: `dp[i-1][j-1]`, No: `1+min(replace, delete, insert)` | O(M*N) | O(M*N) → O(N) |
| **Grid Base Cases** | First row = 1, first column = 1 | — | — |
| **String Base Cases** | dp[0][j] = 0, dp[i][0] = 0 | — | — |
| **Space Optimization** | Use 1D array, iterate left-to-right | — | O(N) |
| **Fill Order** | Top-left to bottom-right (row by row) | — | — |
| **+1 for empty string** | Table size is (len+1) x (len+1) | — | — |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: 2D DP Concepts**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 2d dp concepts** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

