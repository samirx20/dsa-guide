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

## Practice & Self-Check

Before answering, apply the 5-Step Framework: name the two dimensions, the meaning of `dp[i][j]`, the base row/column, the transition, and where the answer lives. Then fill the table by hand.

### Predict the Output / Trace by Hand

**Q1. Unique Paths on a 3 x 4 grid.** Fill the full `dp` table for `uniquePaths(3, 4)` (3 rows, 4 columns). What is the answer?

**Q2. The rolling row.** Run the space-optimized `uniquePaths` (Variation 2) with `m = 4`, `n = 3`. Write `row` after each value of `r`. Does the answer match Q1? Why should it?

**Q3. LCS table.** Fill the LCS table for `A = "abac"` (rows) and `B = "cab"` (columns), using the Golden Template with the empty-string row and column. What is `dp[4][3]`, and what is one LCS?

**Q4. A broken space optimization.** Someone applies the Section 4 "Optimization Pattern" to LCS and writes the match case as `dp[j] = dp[j-1] + 1` (the non-match case is `max(dp[j], dp[j-1])`). What does this return for `A = "a"`, `B = "aa"`? What is the correct LCS, and which value does the match case really need?

**Q5. Edit Distance base cases and table.** Using the Edit Distance row of the Quick Reference (match: `dp[i-1][j-1]`; otherwise `1 + min(replace, delete, insert)` = `1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])`), with base cases `dp[i][0] = i` and `dp[0][j] = j`, fill the table for `word1 = "ab"`, `word2 = "ba"`. What is the edit distance?

### Coding Exercises

**E1 (Easy). Minimum Path Sum.** Moving only Down or Right, return the minimum sum of values along a path from top-left to bottom-right. Use an $O(N)$ rolling row.

```cpp
int minPathSum(const vector<vector<int>>& grid);
// [[1,3,1],[1,5,1],[4,2,1]] -> 7    (1 -> 3 -> 1 -> 1 -> 1)
// [[1,2,3],[4,5,6]]         -> 12   (1 -> 2 -> 3 -> 6)
```

**E2 (Easy–Medium). Unique Paths with Obstacles.** `grid[r][c] == 1` is a blocked cell. Count Down/Right paths from top-left to bottom-right. Note that the base row and column are no longer "all 1s".

```cpp
int uniquePathsWithObstacles(const vector<vector<int>>& grid);
// [[0,0,0],[0,1,0],[0,0,0]] -> 2
// [[0,1],[0,0]]             -> 1
```

**E3 (Medium). Longest Common Substring.** Unlike LCS, the common part must be **contiguous** in both strings. Return its length.

```cpp
int longestCommonSubstring(const string& a, const string& b);
// "abcdxyz",   "xyzabcd"   -> 4   ("abcd")
// "zxabcdezy", "yzabcdezx" -> 6   ("abcdez")
```

#### Dry-Run: Answers

**Q1.** Answer **10**. Base row and column are 1; every other cell is above + left.

| r \ c | 0 | 1 | 2 | 3 |
|-------|---|---|---|---|
| 0 | 1 | 1 | 1 | 1 |
| 1 | 1 | 2 | 3 | 4 |
| 2 | 1 | 3 | 6 | 10 |

As a check, a path is 2 Downs and 3 Rights in some order: $\binom{5}{2} = 10$.

**Q2.** Yes, it returns **10**, matching Q1.

| After r | row |
|---------|-----|
| initial | [1, 1, 1] |
| 1 | [1, 2, 3] |
| 2 | [1, 3, 6] |
| 3 | [1, 4, 10] |

A 4 x 3 grid is the transpose of a 3 x 4 grid: every path maps to one with Downs and Rights swapped, so the counts are equal ($\binom{5}{3} = \binom{5}{2} = 10$).

**Q3.** `dp[4][3] = 2`; one LCS is `"ab"`.

| | "" | c | a | b |
|---|---|---|---|---|
| **""** | 0 | 0 | 0 | 0 |
| **a** | 0 | 0 | 1 | 1 |
| **b** | 0 | 0 | 1 | 2 |
| **a** | 0 | 0 | 1 | 2 |
| **c** | 0 | 1 | 1 | 2 |

Key cells: `dp[1][2]` (a == a) = diagonal 0 + 1 = 1; `dp[2][3]` (b == b) = `dp[1][2]` + 1 = 2; `dp[4][1]` (c == c) = `dp[3][0]` + 1 = 1. The "c" at the end of A matches the "c" at the start of B, but they cannot be chained with "ab", so the answer stays 2.

**Q4.** It returns **2**; the correct LCS is **1** (`"a"` has only one character).
Trace with `dp = [0, 0, 0]` and the single row `i = 1` (`'a'`): at j = 1, match → `dp[1] = dp[0] + 1 = 1`; at j = 2, match → `dp[2] = dp[1] + 1 = 2`. But `dp[1]` was **already overwritten** with the current row's value, so the one `'a'` of A got matched twice. The match case needs the **diagonal** `dp[i-1][j-1]`, i.e. the *old* `dp[j-1]` before this row overwrote it. The fix is to save it in a `prev` variable before each overwrite. (Unique Paths does not have this problem because it never reads the diagonal.)

**Q5.** Edit distance **2** (for example, replace both characters).

| | "" | b | a |
|---|---|---|---|
| **""** | 0 | 1 | 2 |
| **a** | 1 | 1 + min(0, 1, 1) = 1 | match → dp[0][1] = 1 |
| **b** | 2 | match → dp[1][0] = 1 | 1 + min(1, 1, 1) = 2 |

**E1 — reference solution.** State: `dp[c]` = min sum to reach `(r, c)`. The first row can only come from the left, the first column only from above.

```cpp
int minPathSum(const vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    vector<int> dp(n, 0);
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 0 && c == 0) dp[c] = grid[0][0];
            else if (r == 0)      dp[c] = dp[c - 1] + grid[r][c];             // only from left
            else if (c == 0)      dp[c] = dp[c] + grid[r][c];                 // only from above
            else                  dp[c] = min(dp[c], dp[c - 1]) + grid[r][c]; // above vs left
        }
    }
    return dp[n - 1];
}
// [[1,3,1],[1,5,1],[4,2,1]]: rows [1,4,5] -> [2,7,6] -> [6,8,7] -> 7
```
Time $O(M \cdot N)$, space $O(N)$. Same rolling-row trick as Unique Paths, with `min` + cost instead of `+`.

**E2 — reference solution.** A blocked cell has 0 paths. Starting from `dp[0] = 1` and adding left-to-right handles the first row and column automatically: once a 0 appears, it propagates.

```cpp
int uniquePathsWithObstacles(const vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    vector<long long> dp(n, 0);
    dp[0] = (grid[0][0] == 0) ? 1 : 0;
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 1) dp[c] = 0;        // blocked: no paths through here
            else if (c > 0)      dp[c] += dp[c - 1]; // above (old dp[c]) + left
        }
    }
    return (int)dp[n - 1];
}
// [[0,0,0],[0,1,0],[0,0,0]]: rows [1,1,1] -> [1,0,1] -> [1,1,2] -> 2
```
Time $O(M \cdot N)$, space $O(N)$.

**E3 — reference solution.** State: `dp[i][j]` = length of the longest common substring **ending exactly** at `a[i-1]` and `b[j-1]`. A mismatch resets it to 0 (it does not take a max), and the answer is the largest cell anywhere, not `dp[m][n]`.

```cpp
int longestCommonSubstring(const string& a, const string& b) {
    int m = a.size(), n = b.size(), best = 0;
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;   // extend the diagonal run
                best = max(best, dp[i][j]);
            }                                       // else stays 0: run broken
    return best;
}
```
Time $O(M \cdot N)$, space $O(M \cdot N)$. Compared with LCS, the transition differs only in the mismatch case, and that one change turns "subsequence" into "substring".

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

