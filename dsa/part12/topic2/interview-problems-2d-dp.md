# Part 12, Topic 2: 2D Dynamic Programming
## Interview Problems Walkthrough

2D DP problems require meticulous setup of the grid and base cases.

---

## Problem Classification Table

| # | Problem | Pattern | Key Insight | Difficulty |
|---|---|---|---|---|
| 1 | Unique Paths | Grid DP | Sum of above and left cells | Medium |
| 2 | Longest Common Subsequence | String Comparison | Match = diagonal+1, else max(above,left) | Medium |
| 3 | Coin Change II | Unbounded Knapsack | Count combinations, not permutations | Medium |
| 4 | Target Sum | Subset Sum | Convert to subset sum problem | Medium |
| 5 | Edit Distance | String Comparison | min(replace, delete, insert) + 1 | Medium/Hard |
| 6 | Burst Balloons | Interval DP | Think "burst LAST" not first | Hard |
| 7 | Regular Expression Matching | String Comparison | Handle '.' and '*' special cases | Hard |

---

## Solution Approach Comparison

| Approach | Time | Space | When to Use |
|---|---|---|---|
| Brute Force Recursion | O(2^N) | O(N) stack | Never in interviews |
| Top-Down Memoization | O(M*N) | O(M*N) | Start here (easiest) |
| Bottom-Up Tabulation | O(M*N) | O(M*N) | Standard solution |
| Space-Optimized | O(M*N) | O(N) | When asked for optimization |

---

### 1. Unique Paths (Medium)
**Trigger:** Number of ways to reach bottom-right of a grid.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[r][c]` is the total number of unique paths to reach cell `(r, c)`.

**Step 2 — Base Cases:**
First row and first column are all 1 (only one way to reach them: straight line).

**Step 3 — Transition:**
`dp[r][c] = dp[r-1][c] + dp[r][c-1]`
*(See Chapter 1 for the full explanation and space optimization).*

**Step 4 — Grid Fill Visualization for 3x4 grid:**

```
Grid: 3 rows, 4 columns

Step 1: Initialize base cases (all 1s)
    1   1   1   1
    1   ?   ?   ?
    1   ?   ?   ?

Step 2: Fill row 1
    dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2
    dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3
    dp[1][3] = dp[0][3] + dp[1][2] = 1 + 3 = 4

    1   1   1   1
    1   2   3   4
    1   ?   ?   ?

Step 3: Fill row 2
    dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3
    dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6
    dp[2][3] = dp[1][3] + dp[2][2] = 4 + 6 = 10

    1   1   1   1
    1   2   3   4
    1   3   6  10

Answer: dp[2][3] = 10 unique paths
```

**Step 5 — Code (3 variations):**

```cpp
// Variation 1: Top-Down Memoization
int uniquePaths(int r, int c, vector<vector<int>>& memo) {
    if (r == 0 || c == 0) return 1;
    if (memo[r][c] != -1) return memo[r][c];
    memo[r][c] = uniquePaths(r - 1, c, memo) + uniquePaths(r, c - 1, memo);
    return memo[r][c];
}
```

**What's happening:**
```cpp
int uniquePaths(int r, int c, vector<vector<int>>& memo) {
    if (r == 0 || c == 0) return 1;
    // Base case: first row or first column -> only 1 path (straight line)
    
    if (memo[r][c] != -1) return memo[r][c];
    // Cache hit: return previously computed result
    
    memo[r][c] = uniquePaths(r - 1, c, memo) + uniquePaths(r, c - 1, memo);
    //              ^^^^^^^^^^^^^^^^^^^^^^          ^^^^^^^^^^^^^^^^^^^^^^
    //              |                               └── Paths from left cell
    //              └── Paths from cell above
    return memo[r][c];
}
```

```cpp
// Variation 2: Bottom-Up Tabulation
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
// Initialize entire grid with 1s (base case for first row and column)

for (int r = 1; r < m; r++) {        // Skip row 0 (already 1s)
    for (int c = 1; c < n; c++) {    // Skip col 0 (already 1s)
        dp[r][c] = dp[r-1][c] + dp[r][c-1];
        //  ^^       ^^^^^^^^      ^^^^^^^^
        //  |        |             └── Cell to the left
        //  |        └── Cell above
        //  └── Current = sum of above + left
    }
}
```

```cpp
// Variation 3: Space Optimized (Best for interviews)
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
// Single 1D array: represents one row at a time
// Initially all 1s (first row base case)

for (int r = 1; r < m; r++) {
    for (int c = 1; c < n; c++) {
        row[c] = row[c] + row[c - 1];
        //  ^^     ^^       ^^^^^^
        //  |      |        └── Cell to the left (already updated THIS row)
        //  |      └── Cell above (from PREVIOUS row, not yet overwritten)
        //  └── Update in place
    }
}
```

---

### 2. Longest Common Subsequence (Medium)

**Trigger:** Find the longest subsequence common to two strings (e.g., "abcde" and "ace" -> "ace", length 3).

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i][j]` = length of LCS of `text1[0..i-1]` and `text2[0..j-1]`.

**Step 2 — Base Cases:**
`dp[0][j] = 0` and `dp[i][0] = 0` (LCS with empty string is 0).

**Step 3 — Transition:**
- If `text1[i-1] == text2[j-1]`: `dp[i][j] = dp[i-1][j-1] + 1` (match! extend from diagonal)
- Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])` (skip one character from either string)

**Step 4 — Grid Fill Visualization for "abc" vs "ace":**

```
        ""    a    c    e
    ┌────┬────┬────┬────┐
""  │  0 │  0 │  0 │  0 │
    ├────┼────┼────┼────┤
a   │  0 │  1 │  1 │  1 │  a==a -> diagonal+1 = 1
    ├────┼────┼────┼────┤
b   │  0 │  1 │  1 │  1 │  b!=c, b!=e -> max(above, left)
    ├────┼────┼────┼────┤
c   │  0 │  1 │  2 │  2 │  c==c -> diagonal+1 = 2
    └────┴────┴────┴────┘

Answer: dp[3][3] = 2 (LCS is "ac")

Fill arrows:
  a==a: take diagonal (dp[0][0]+1 = 1)
  b!=c: take max(dp[1][2]=1, dp[2][1]=1) = 1
  c==c: take diagonal (dp[2][1]+1 = 2)
```

**Step 5 — Dry-Run Table:**

| i | j | text1[i-1] | text2[j-1] | Match? | Transition | dp[i][j] |
|---|---|---|---|---|---|---|
| 0 | 0-3 | — | — | — | Base case | 0 |
| 1 | 0 | a | — | — | Base case | 0 |
| 1 | 1 | a | a | Yes | dp[0][0]+1 | 1 |
| 1 | 2 | a | c | No | max(dp[0][2], dp[1][1]) | 1 |
| 1 | 3 | a | e | No | max(dp[0][3], dp[1][2]) | 1 |
| 2 | 0 | b | — | — | Base case | 0 |
| 2 | 1 | b | a | No | max(dp[1][1], dp[2][0]) | 1 |
| 2 | 2 | b | c | No | max(dp[1][2], dp[2][1]) | 1 |
| 2 | 3 | b | e | No | max(dp[1][3], dp[2][2]) | 1 |
| 3 | 0 | c | — | — | Base case | 0 |
| 3 | 1 | c | a | No | max(dp[2][1], dp[3][0]) | 1 |
| 3 | 2 | c | c | Yes | dp[2][1]+1 | 2 |
| 3 | 3 | c | e | No | max(dp[2][3], dp[3][2]) | 2 |

**Step 6 — Code:**

```cpp
int longestCommonSubsequence(string text1, string text2) {
    int m = text1.length(), n = text2.length();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1[i - 1] == text2[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}
// Time: O(M * N), Space: O(M * N) (can be optimized to O(N))
```

**What's happening:**
```cpp
vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
// (m+1) x (n+1) grid: extra row/col for empty string base case

for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
        if (text1[i - 1] == text2[j - 1]) {
        //  ^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^
        //  |                 └── j-1 because dp is 1-indexed, string is 0-indexed
        //  └── Current characters from each string
            dp[i][j] = 1 + dp[i - 1][j - 1];
            // Match! Take diagonal (answer before both chars) and add 1
        } else {
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            //  ^^       ^^^^^^^^^^^      ^^^^^^^^^^^
            //  |        |                └── Skip char from text2 (go left)
            //  |        └── Skip char from text1 (go up)
            //  └── Take the better option
        }
    }
}
```

---

### 3. Coin Change II (Medium)

**Trigger:** Find the total *number of combinations* that make up an amount. (Unbounded knapsack).

**Step-by-Step Walkthrough:**

**Step 1 — Intuition:**
This is a 2D DP problem disguised as a 1D problem.
The state is defined by TWO variables: `(current_amount, current_coin_index)`. If you just use `amount`, you will double-count combinations (e.g., `1+2` and `2+1` will be counted as two ways, but they are the same combination).
However, it can be written optimally using a 1D array.

**Step 2 — Key Insight: Loop Order Matters!**

```
For COMBINATIONS (order doesn't matter):
  Loop COINS on OUTSIDE, amount on INSIDE
  This ensures we only count {1,2} and not {2,1} separately

For PERMUTATIONS (order matters):
  Loop AMOUNT on OUTSIDE, coins on INSIDE
  This counts {1,2} and {2,1} as different
```

**Step 3 — Dry-Run Table: coins = [1,2], amount = 3**

| coin | i=1 | i=2 | i=3 | dp after coin |
|---|---|---|---|---|
| Init | dp[0]=1, rest=0 | | | [1, 0, 0, 0] |
| coin=1 | dp[1]+=dp[0]=1 | dp[2]+=dp[1]=1 | dp[3]+=dp[2]=1 | [1, 1, 1, 1] |
| coin=2 | dp[1] unchanged | dp[2]+=dp[0]=2 | dp[3]+=dp[1]=2 | [1, 1, 2, 2] |

Answer: dp[3] = 2 combinations: {1,1,1} and {1,2}

**Step 4 — Code:**

```cpp
int change(int amount, vector<int>& coins) {
    vector<int> dp(amount + 1, 0);
    dp[0] = 1; // 1 way to make amount 0 (use no coins)
    
    // Notice the loop order! We loop COINS on the outside. 
    // This prevents double-counting permutations like (1,2) and (2,1).
    for (int coin : coins) {
        for (int i = coin; i <= amount; i++) {
            dp[i] += dp[i - coin];
        }
    }
    return dp[amount];
}
// Time: O(coins * amount), Space: O(amount)
```

**What's happening:**
```cpp
dp[0] = 1;
// 1 way to make amount 0: use no coins at all

for (int coin : coins) {
// Outer loop: iterate through coins ONE BY ONE
// This means: "consider coin X, then coin Y, then coin Z..."
// Each coin is considered in order, preventing permutations

    for (int i = coin; i <= amount; i++) {
    // Inner loop: try using this coin for each remaining amount
        dp[i] += dp[i - coin];
        //  ^^      ^^^^^^^^^
        //  |       └── Ways to make (i - coin)
        //  |           Adding current coin to each of those ways
        //  └── Accumulate: total combinations
    }
}
```

---

### 4. Target Sum (Medium)

**Trigger:** You are given an integer array `nums` and an integer `target`. You want to build an expression out of `nums` by adding one of the symbols `+` and `-` before each integer. Return the number of different expressions that evaluate to `target`.

**Step-by-Step Walkthrough:**

**Step 1 — Intuition:**
*Top-Down (Memoization):* The state is `(index, currentSum)`. The recursive function branches into two calls: one where you `+ nums[index]` and one where you `- nums[index]`. You cache the result in a map or 2D array.
*Bottom-Up (Tabulation):* Can be converted into a "Subset Sum" problem (like Partition Equal Subset Sum).
Let P be the sum of positive numbers, and N be the sum of negative numbers.
`P - N = target`
`P + N = totalSum`
Adding the equations: `2P = target + totalSum` -> `P = (target + totalSum) / 2`

**Step 2 — Conversion Visualization:**
```
nums = [1, 1, 1, 1, 1], target = 3

P + N = 5 (total sum)
P - N = 3 (target)
2P = 8 -> P = 4

New problem: Find number of subsets that sum to 4
Subsets: {1,1,1,1} -> sum=4
Answer: 1 way (all positive)
```

**Step 3 — Dry-Run Table: nums = [1,1,1,1,1], target = 3, P = 4**

| num | dp[0] | dp[1] | dp[2] | dp[3] | dp[4] | State |
|---|---|---|---|---|---|---|
| Init | 1 | 0 | 0 | 0 | 0 | [1,0,0,0,0] |
| num=1 | 1 | 1 | 0 | 0 | 0 | [1,1,0,0,0] |
| num=1 | 1 | 2 | 1 | 0 | 0 | [1,2,1,0,0] |
| num=1 | 1 | 3 | 3 | 1 | 0 | [1,3,3,1,0] |
| num=1 | 1 | 4 | 6 | 4 | 1 | [1,4,6,4,1] |
| num=1 | 1 | 5 | 10| 10| 5 | [1,5,10,10,5] |

Answer: dp[4] = 5 (five ways to pick subset summing to 4)

**Step 4 — Code (Bottom-Up as Subset Sum):**

```cpp
int findTargetSumWays(vector<int>& nums, int target) {
    int totalSum = 0;
    for (int num : nums) totalSum += num;
    
    if ((totalSum + target) % 2 != 0 || totalSum + target < 0) return 0;
    
    int P = (totalSum + target) / 2;
    
    vector<int> dp(P + 1, 0);
    dp[0] = 1;
    
    for (int num : nums) {
        for (int i = P; i >= num; i--) {
            dp[i] += dp[i - num];
        }
    }
    
    return dp[P];
}
// Time: O(N * P), Space: O(P)
```

**What's happening:**
```cpp
int P = (totalSum + target) / 2;
// Convert Target Sum to Subset Sum:
// If P + N = totalSum and P - N = target, then P = (totalSum + target) / 2
// We need to find subsets that sum to P

vector<int> dp(P + 1, 0);
dp[0] = 1;
// Standard 0/1 knapsack subset sum counting

for (int num : nums) {
    for (int i = P; i >= num; i--) {
    // Backwards iteration! Prevents using same number twice (0/1 knapsack)
        dp[i] += dp[i - num];
    }
}
return dp[P];
// dp[P] = number of subsets that sum to P = number of valid expressions
```

---

### 5. Edit Distance (Medium/Hard)

**Trigger:** Given two strings, return the minimum number of operations (insert, delete, replace) to convert word1 to word2.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i][j]` = minimum operations to convert `word1[0..i-1]` to `word2[0..j-1]`.

**Step 2 — Base Cases:**
`dp[i][0] = i` (delete all i characters)
`dp[0][j] = j` (insert all j characters)

**Step 3 — Transition:**
If characters match: `dp[i][j] = dp[i-1][j-1]` (no operation needed)
Else: `dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])`
         replace         delete         insert

**Step 4 — Grid Fill Visualization for "horse" vs "ros":**

```
        ""    r    o    s
    ┌────┬────┬────┬────┐
""  │  0 │  1 │  2 │  3 │  (insert r, o, s)
    ├────┼────┼────┼────┤
h   │  1 │  1 │  2 │  3 │  h!=r -> min(0,1,1)+1 = 1
    ├────┼────┼────┼────┤
o   │  2 │  2 │  1 │  2 │  h!=o:1, o==o:dp[1][0]+0=2... 
    ├────┼────┼────┼────┤
r   │  3 │  2 │  2 │  2 │  r==r -> dp[1][1]+0=1? No, dp[2][1]=2
    ├────┼────┼────┼────┤
s   │  4 │  3 │  3 │  2 │  s==s -> dp[2][2]+0=2
    ├────┼────┼────┼────┤
e   │  5 │  4 │  4 │  3 │  e!=s -> min(dp[3][3],dp[3][2],dp[4][3])+1
    └────┴────┴────┴────┘

Answer: dp[5][3] = 3
```

**Step 5 — Dry-Run Table:**

| i | j | word1[i-1] | word2[j-1] | Match? | Operations | dp[i][j] |
|---|---|---|---|---|---|---|
| 0 | 0-3 | — | — | — | Base | 0,1,2,3 |
| 1 | 0 | h | — | — | Base | 1 |
| 1 | 1 | h | r | No | min(dp[0][0],dp[0][1],dp[1][0])+1 | 1 |
| 1 | 2 | h | o | No | min(dp[0][1],dp[0][2],dp[1][1])+1 | 2 |
| 2 | 1 | o | r | No | min(dp[1][0],dp[1][1],dp[2][0])+1 | 2 |
| 2 | 2 | o | o | Yes | dp[1][1] = 1 | 1 |
| 3 | 1 | r | r | Yes | dp[2][0] = 2 | 2 |
| 5 | 3 | e | s | No | min(dp[4][2],dp[4][3],dp[5][2])+1 | 3 |

**Step 6 — Code:**

```cpp
int minDistance(string word1, string word2) {
    int m = word1.length(), n = word2.length();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    
    for (int i = 0; i <= m; i++) dp[i][0] = i;  // Delete all
    for (int j = 0; j <= n; j++) dp[0][j] = j;  // Insert all
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i - 1] == word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];  // No operation needed
            } else {
                dp[i][j] = 1 + min({dp[i - 1][j - 1],  // Replace
                                    dp[i - 1][j],        // Delete
                                    dp[i][j - 1]});      // Insert
            }
        }
    }
    return dp[m][n];
}
// Time: O(M * N), Space: O(M * N) (can optimize to O(N))
```

**What's happening:**
```cpp
for (int i = 0; i <= m; i++) dp[i][0] = i;
// Converting word1[0..i-1] to "" requires i deletes
for (int j = 0; j <= n; j++) dp[0][j] = j;
// Converting "" to word2[0..j-1] requires j inserts

if (word1[i - 1] == word2[j - 1]) {
    dp[i][j] = dp[i - 1][j - 1];
    // Characters match! No operation needed, take diagonal
} else {
    dp[i][j] = 1 + min({dp[i - 1][j - 1],  // Replace: change char, then solve rest
                        dp[i - 1][j],        // Delete: remove char from word1
                        dp[i][j - 1]});      // Insert: add char to word1
    // Take the minimum of all 3 operations + 1 for this operation
}
```

---

### 6. Burst Balloons (Hard)

**Trigger:** Given n balloons, bursting balloon i gives `nums[i-1] * nums[i] * nums[i+1]` coins. Maximize coins.

**Step-by-Step Walkthrough:**

**Step 1 — Intuition:**
The ultimate interval DP problem.
If you think about "which balloon to burst FIRST", the array changes size, and adjacent balloons become new neighbors, creating chaos.
**The Trick:** Think about which balloon to burst **LAST**!
If balloon `i` is the last to burst in the interval `[left, right]`, the coins earned are `nums[left-1] * nums[i] * nums[right+1]`. The subproblems to the left `[left, i-1]` and right `[i+1, right]` are now completely independent!

**Step 2 — Interval DP Visualization:**
```
nums = [3, 1, 5, 8] (with padding: [1, 3, 1, 5, 8, 1])

Think: In range [1, 4] (balloons 3, 1, 5, 8), which to burst LAST?

If balloon "1" (index 2) is last:
  Left subproblem: [1, 1] (just the padding 1, 0 balloons)
  Right subproblem: [3, 4] (balloons 5, 8)
  Coins: nums[0] * nums[2] * nums[5] = 1 * 1 * 1 = 1
  Plus: dp[1][1] + dp[3][4] (solutions for sub-intervals)
```

**Step 3 — Code:**

```cpp
int maxCoins(vector<int>& nums) {
    int n = nums.size();
    // Add padding: 1 at both ends
    vector<int> padded(n + 2, 1);
    for (int i = 0; i < n; i++) padded[i + 1] = nums[i];
    
    // dp[i][j] = max coins from bursting balloons in range [i, j]
    vector<vector<int>> dp(n + 2, vector<int>(n + 2, 0));
    
    // Fill by interval length
    for (int len = 1; len <= n; len++) {
        for (int left = 1; left <= n - len + 1; left++) {
            int right = left + len - 1;
            for (int k = left; k <= right; k++) {
                dp[left][right] = max(dp[left][right],
                    padded[left - 1] * padded[k] * padded[right + 1]
                    + dp[left][k - 1] + dp[k + 1][right]);
            }
        }
    }
    
    return dp[1][n];
}
// Time: O(N^3), Space: O(N^2)
```

**What's happening:**
```cpp
vector<int> padded(n + 2, 1);
for (int i = 0; i < n; i++) padded[i + 1] = nums[i];
// Add 1 at both ends to handle edge balloons without special cases
// [1, 3, 1, 5, 8, 1] instead of [3, 1, 5, 8]

for (int len = 1; len <= n; len++) {
    for (int left = 1; left <= n - len + 1; left++) {
        int right = left + len - 1;
        // Iterate by interval length (small to large)
        // This ensures subproblems are solved before the main problem
        
        for (int k = left; k <= right; k++) {
            dp[left][right] = max(dp[left][right],
                padded[left-1] * padded[k] * padded[right+1]
                //     ^^^^^^^^     ^^^^^^     ^^^^^^^^^^
                //     |            |          └── Balloon to RIGHT of interval
                //     |          └── Balloon k is the LAST to burst
                //     └── Balloon to LEFT of interval
                + dp[left][k - 1] + dp[k + 1][right]);
                //   ^^^^^^^^^^^^   ^^^^^^^^^^^^^^
                //   |              └── Right sub-interval (already solved)
                //   └── Left sub-interval (already solved)
        }
    }
}
```

---

### 7. Regular Expression Matching (Hard)

**Trigger:** Implement regex matching with support for `.` and `*`.

**Step-by-Step Walkthrough:**

**Step 1 — Intuition:**
String Comparison DP.
- `.` matches any single character.
- `*` is the nightmare. It means "zero or more of the PRECEDING element".

**Step 2 — Transition Logic:**
```
If p[j-1] == '*':
  Option 1: Use zero of preceding element
    dp[i][j] = dp[i][j-2]  (skip the "x*" in pattern)
  
  Option 2: Use one or more of preceding element
    If p[j-2] matches s[i-1] or p[j-2] == '.':
      dp[i][j] = dp[i-1][j]  (consume one char from s, keep "x*" in pattern)

If p[j-1] != '*' and characters match:
  dp[i][j] = dp[i-1][j-1]

If no match:
  dp[i][j] = false
```

**Step 3 — Grid Fill Visualization for s="aa", p="a*":**

```
        ""    a    *
    ┌────┬────┬────┐
""  │  T │  F │  T │  dp[0][2]: "a*" matches "" (use zero a's)
    ├────┼────┼────┤
a   │  F │  T │  T │  dp[1][2]: "a*" matches "a" (use one a)
    ├────┼────┼────┤
a   │  F │  F │  T │  dp[2][2]: "a*" matches "aa" (use two a's)
    └────┴────┴────┘

Answer: dp[2][2] = true ("a*" matches "aa")
```

**Step 4 — Code:**

```cpp
bool isMatch(string s, string p) {
    int m = s.length(), n = p.length();
    vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
    dp[0][0] = true;  // Empty string matches empty pattern
    
    // Handle patterns like "a*b*c*" matching empty string
    for (int j = 2; j <= n; j++) {
        if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
    }
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (p[j - 1] == '*') {
                // Option 1: Use zero of preceding element
                dp[i][j] = dp[i][j - 2];
                
                // Option 2: Use one or more (if preceding matches current)
                if (p[j - 2] == '.' || p[j - 2] == s[i - 1]) {
                    dp[i][j] = dp[i][j] || dp[i - 1][j];
                }
            } else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    }
    
    return dp[m][n];
}
// Time: O(M * N), Space: O(M * N)
```

**What's happening:**
```cpp
dp[0][0] = true;
// Empty string matches empty pattern

for (int j = 2; j <= n; j++) {
    if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
    // "a*" can match empty string, so dp[0][2] = dp[0][0] = true
    // "a*b*" can also match empty: dp[0][4] = dp[0][2] = true
}

if (p[j - 1] == '*') {
    dp[i][j] = dp[i][j - 2];
    // Option 1: Skip "x*" entirely (use zero x's)
    
    if (p[j - 2] == '.' || p[j - 2] == s[i - 1]) {
        dp[i][j] = dp[i][j] || dp[i - 1][j];
        // Option 2: Match current char, then check if "x*"
        // still matches the rest of s (stays at same pattern position)
    }
} else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
    dp[i][j] = dp[i - 1][j - 1];
    // Simple match: take diagonal
}
```

---

## DP vs Greedy vs Backtracking

| Aspect | Dynamic Programming | Greedy | Backtracking |
|---|---|---|---|
| **Strategy** | Try all choices, store results | Make locally optimal choice | Try all, undo on failure |
| **Optimal?** | Always | Not always | Always |
| **Overlapping subproblems?** | Yes (exploit it) | No | No |
| **Time** | O(states) | O(N log N) typical | O(branches^depth) |
| **Space** | O(states) | O(1) to O(N) | O(depth) |
| **When** | Optimal substructure + overlap | Local = global, exchange arg valid | Need all solutions |
| **Examples** | LIS, Edit Distance, Coin Change | Interval Scheduling, Jump Game | N-Queens, Subsets |

---

## Quick Reference

| Problem | State | Transition | Time | Space |
|---|---|---|---|---|
| Unique Paths | dp[r][c] = paths to (r,c) | dp[r][c] = dp[r-1][c] + dp[r][c-1] | O(M*N) | O(N) |
| LCS | dp[i][j] = LCS of s1[0..i], s2[0..j] | Match: dp[i-1][j-1]+1, else max(up,left) | O(M*N) | O(N) |
| Coin Change II | dp[i] = combinations for amount i | dp[i] += dp[i-coin] (coins outer loop) | O(C*A) | O(A) |
| Target Sum | dp[i] = subsets summing to i | dp[i] += dp[i-num] (backwards) | O(N*P) | O(P) |
| Edit Distance | dp[i][j] = ops to convert s1[0..i] to s2[0..j] | Match: dp[i-1][j-1], else 1+min(rep,del,ins) | O(M*N) | O(N) |
| Burst Balloons | dp[i][j] = max coins in [i,j] | max over k of: left*balloon*right + dp[left][k-1] + dp[k+1][right] | O(N^3) | O(N^2) |
| Regex Matching | dp[i][j] = s[0..i] matches p[0..j] | '.'/'*' handling with zero-or-more logic | O(M*N) | O(M*N) |

### Key Patterns to Remember

| Pattern | Keywords | Template |
|---|---|---|
| Grid DP | "unique paths", "grid" | dp[r][c] = above + left |
| String Comparison | "two strings", "subsequence" | (m+1)x(n+1) grid, match=diagonal+1 |
| Unbounded Knapsack | "combinations", "coins" | Loop coins outside, amount inside |
| 0/1 Knapsack | "subset sum", "partition" | Loop amounts BACKWARDS |
| Interval DP | "burst", "interval" | Loop by interval length, try each as "last" |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems 2d dp** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

