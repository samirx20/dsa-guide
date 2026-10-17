# Part 6, Topic 2: Backtracking
## Interview Problems Walkthrough

These are the quintessential Backtracking problems. If you master these 6 problems, you can solve almost any Backtracking question on LeetCode.

---

## Problem Classification Table

| # | Problem | Difficulty | Pattern | Time | Space | Key Insight |
|---|---------|------------|---------|------|-------|-------------|
| 1 | Subsets | Medium | Subset template | O(2^n) | O(n) | Start loop at index, recurse with i+1 |
| 2 | Permutations | Medium | Permutation template | O(n*n!) | O(n) | Use visited array, loop from 0 |
| 3 | Combination Sum | Medium | Combination with reuse | O(2^target) | O(target) | Pass i (not i+1) to reuse numbers |
| 4 | Word Search | Medium | 2D backtracking | O(m*n*4^L) | O(L) | Mark visited by changing char |
| 5 | N-Queens | Hard | Constraint satisfaction | O(n!) | O(n) | Use sets for O(1) diagonal checks |
| 6 | Sudoku Solver | Hard | Constraint satisfaction | O(9^(81)) | O(1) | Try 1-9, check row/col/box |

---

## Solution Approach Comparison

| Problem | Recursive Backtracking | Alternative |
|---------|------------------------|-------------|
| Subsets | DFS with index | Bitmask iteration |
| Permutations | Visited array | Swap-based in-place |
| Combination Sum | DFS with reuse | Iterative with stack |
| Word Search | DFS with pruning | BFS with queue |
| N-Queens | Row-by-row placement | Bitmask sets |
| Sudoku Solver | Trial and error | Constraint propagation |

---

### 1. Subsets (Medium)
**Trigger:** Given an integer array of unique elements, return all possible subsets.
**Intuition:** This is the base subset template. Start the loop at `index`, recurse with `i + 1`. Add `current` to `result` at the very beginning of the recursive call.
*(See Chapter 3 for the code template).*

**Code Implementation:**
```cpp
void backtrack(vector<int>& nums, int index, vector<int>& current, vector<vector<int>>& result) {
    result.push_back(current);  // Add current subset (including empty)
    
    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        backtrack(nums, i + 1, current, result);  // i+1 because each element used once
        current.pop_back();  // Backtrack
    }
}
```

**What's happening:** We start with empty subset, add current to result, then iterate from index, add each element, recurse with i+1, and backtrack. Key: i+1 prevents reuse.

**Dry-Run Table for nums = [1,2]:**

| Step | index | current | Action | result after step |
|------|-------|---------|--------|-------------------|
| 1 | 0 | [] | Add [] to result | [[]] |
| 2 | 0 | [1] | Add [1] to result | [[],[1]] |
| 3 | 1 | [1,2] | Add [1,2] | [[],[1],[1,2]] |
| 4 | 1 | [1] | Pop 2, backtrack | same |
| 5 | 1 | [2] | Add [2] to result | [[],[1],[1,2],[2]] |

**Alternative Approach: Bitmask Iteration**
Each subset corresponds to a bitmask from 0 to 2^n-1. For mask=5 (101), include nums[0] and nums[2].
```cpp
vector<vector<int>> subsets(vector<int>& nums) {
    int n = nums.size();
    vector<vector<int>> result;
    for (int mask = 0; mask < (1 << n); mask++) {
        vector<int> subset;
        for (int i = 0; i < n; i++) {
            if (mask & (1 << i)) subset.push_back(nums[i]);
        }
        result.push_back(subset);
    }
    return result;
}
```

---

### 2. Permutations (Medium)
**Trigger:** Given an array of distinct integers, return all the possible permutations.
**Intuition:** This is the base permutation template. Loop starts at `0`. Use a `vector<bool> visited` to track which numbers are already in the `current` array to avoid reusing them. Base case is when `current.size() == nums.size()`.
*(See Chapter 3 for the code template).*

**Code Implementation:**
```cpp
void backtrack(vector<int>& nums, vector<bool>& visited, vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {
        result.push_back(current);
        return;
    }
    
    for (int i = 0; i < nums.size(); i++) {
        if (!visited[i]) {
            visited[i] = true;
            current.push_back(nums[i]);
            backtrack(nums, visited, current, result);
            current.pop_back();
            visited[i] = false;  // Backtrack
        }
    }
}
```

**What's happening:** Use visited array to track used numbers. Try all unvisited, mark visited, recurse, unmark (backtrack). Base case when current.size() == nums.size().

**Dry-Run Table for nums = [1,2]:**

| Step | visited | current | Action | result after step |
|------|---------|---------|--------|-------------------|
| 1 | [F,F] | [] | Start | [] |
| 2 | [T,F] | [1] | Choose 1 | [] |
| 3 | [T,T] | [1,2] | Complete | [[1,2]] |
| 4 | [F,F] | [] | Backtrack | [[1,2]] |
| 5 | [F,T] | [2] | Choose 2 | [[1,2]] |
| 6 | [T,T] | [2,1] | Complete | [[1,2],[2,1]] |

**Alternative Approach: Swap-based In-place**
Fix one element at position `start` by swapping, then recurse on remaining.
```cpp
void backtrack(vector<int>& nums, int start, vector<vector<int>>& result) {
    if (start == nums.size()) { result.push_back(nums); return; }
    for (int i = start; i < nums.size(); i++) {
        swap(nums[start], nums[i]);
        backtrack(nums, start + 1, result);
        swap(nums[start], nums[i]);  // Backtrack
    }
}
```

---

### 3. Combination Sum (Medium)
**Trigger:** Given an array of distinct integers `candidates` and a `target` integer, return a list of all unique combinations of `candidates` where the chosen numbers sum to `target`. **You may use the same number an unlimited number of times.**
**Intuition:** Because order doesn't matter, we use the `index` variable. However, because we can reuse the same number infinitely, when we recurse, we DO NOT pass `i + 1`. We pass `i`! We only move to `i + 1` in the `for` loop when we are done exploring `i`.

```cpp
void backtrack(vector<int>& cands, int target, int index, vector<int>& curr, int sum, vector<vector<int>>& res) {
    if (sum == target) {
        res.push_back(curr);
        return;
    }
    if (sum > target) return; // Pruning!
    
    for (int i = index; i < cands.size(); i++) {
        curr.push_back(cands[i]);
        // Notice we pass 'i', not 'i + 1', because we can reuse the same number!
        backtrack(cands, target, i, curr, sum + cands[i], res); 
        curr.pop_back();
    }
}
```

**What's happening:** Build combinations by adding candidates. Pass i (not i+1) to allow reuse. Prune when sum > target. Loop ensures no duplicates by moving forward.

**Call Stack Visualization for target=4, candidates=[2,3]:**
```
backtrack(4,0,[],0)
├── add 2: backtrack(4,0,[2],2)
│   ├── add 2: backtrack(4,0,[2,2],4) → found [2,2]
│   └── add 3: backtrack(4,1,[2,3],5) → sum>4, prune
├── add 3: backtrack(4,1,[3],3)
│   └── add 3: backtrack(4,1,[3,3],6) → sum>4, prune
```

**Dry-Run Table for candidates=[2,3], target=4:**

| Step | i | curr | sum | Action | result |
|------|---|------|-----|--------|--------|
| 1 | 0 | [2] | 2 | Recurse | [] |
| 2 | 0 | [2,2] | 4 | Found! | [[2,2]] |
| 3 | 1 | [2,3] | 5 | Prune | [[2,2]] |
| 4 | 1 | [3] | 3 | Recurse | [[2,2]] |
| 5 | 1 | [3,3] | 6 | Prune | [[2,2]] |

**Alternative Approach: Iterative with Stack**
Sort candidates first for early breaking. Use stack to simulate recursion.
```cpp
vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
    vector<vector<int>> result;
    sort(candidates.begin(), candidates.end());
    stack<pair<int, vector<int>>> stk;
    stk.push({0, {}});
    while (!stk.empty()) {
        auto [idx, path] = stk.top(); stk.pop();
        int sum = accumulate(path.begin(), path.end(), 0);
        if (sum == target) { result.push_back(path); continue; }
        for (int i = idx; i < candidates.size(); i++) {
            if (sum + candidates[i] > target) break;
            path.push_back(candidates[i]);
            stk.push({i, path});
            path.pop_back();
        }
    }
    return result;
}
```
**What's happening:** Stack simulates recursion. Each frame stores index and path. Sort candidates first for early break when sum exceeds target.

---

### 4. Word Search (Medium)
**Trigger:** Given an `m x n` grid of characters `board` and a `word`, return `true` if `word` exists in the grid (can move up, down, left, right).
**Intuition:** This combines 2D Matrix traversal with Backtracking. 
Loop through every cell in the grid. If the cell matches the first letter of the word, launch a DFS backtracking function.
- **Choose:** Mark the cell as visited (a common trick is temporarily changing the char to `'#'` so you don't need a massive visited matrix).
- **Explore:** Recurse Up, Down, Left, and Right. If any return `true`, bubble the `true` all the way up.
- **Unchoose:** Change the cell back to its original character.

```cpp
bool dfs(vector<vector<char>>& board, string& word, int r, int c, int index) {
    if (index == word.length()) return true; // Found the whole word!
    
    if (r < 0 || r >= board.size() || c < 0 || c >= board[0].size() || board[r][c] != word[index]) {
        return false; // Out of bounds or mismatch
    }
    
    char temp = board[r][c];
    board[r][c] = '#'; // CHOOSE (Mark visited)
    
    // EXPLORE
    bool found = dfs(board, word, r + 1, c, index + 1) ||
                 dfs(board, word, r - 1, c, index + 1) ||
                 dfs(board, word, r, c + 1, index + 1) ||
                 dfs(board, word, r, c - 1, index + 1);
                 
    board[r][c] = temp; // UNCHOOSE
    
    return found;
}
```

**What's happening:** DFS from each cell. Mark visited by changing to '#', explore 4 directions, restore original (backtrack). Stop when index == word.length().

**Decision Tree Diagram for word="AB", board=[['A','B'],['C','D']] starting at (0,0):**
```
Start at (0,0) char='A' matches word[0]='A'
├── Mark (0,0) as '#'
├── Explore Down: (1,0) char='C' ≠ word[1]='B' → false
├── Explore Up: out of bounds → false
├── Explore Right: (0,1) char='B' matches word[1]='B'
│   ├── Mark (0,1) as '#'
│   ├── index=2 == word.length() → return true
│   └── Restore (0,1) to 'B'
├── Explore Left: out of bounds → false
└── Restore (0,0) to 'A'
```

**Dry-Run Table for word="AB", board=[['A','B'],['C','D']], start=(0,0):**

| Step | (r,c) | char | Action | board state | index |
|------|-------|------|--------|-------------|-------|
| 1 | (0,0) | 'A' | Mark '#' | [['#','B'],['C','D']] | 0 |
| 2 | (1,0) | 'C' | No match | same | 1 |
| 3 | (0,1) | 'B' | Mark '#' | [['#','#'],['C','D']] | 1 |
| 4 | (0,1) | '#' | Found! | same | 2 |
| 5 | (0,1) | 'B' | Restore | [['#','B'],['C','D']] | 1 |
| 6 | (0,0) | 'A' | Restore | [['A','B'],['C','D']] | 0 |

**Alternative Approach: BFS with Queue**
BFS explores level by level using a queue. Store `(r, c, index)` state. More memory but avoids deep recursion. Same choose/unchosen pattern with `board[r][c] = '#'`.

---

### 5. N-Queens (Hard)
**Trigger:** Place `n` queens on an `n x n` chessboard such that no two queens attack each other.
**Intuition:** We place one queen per row. The backtracking function tries placing a queen in column `c` of row `r`. We must check if `c` is valid (no queens in the same column, or on the two diagonals). 
If valid, we **Choose** (place `'Q'`), **Explore** (recurse to row `r + 1`), and **Unchoose** (remove `'Q'`).
*Optimization Trick:* Instead of scanning the board to check diagonals, maintain three `unordered_set`s: one for columns, one for positive diagonals (`r + c`), and one for negative diagonals (`r - c`). If the current `(r, c)` exists in any set, it's an invalid placement.

**Code Implementation with Set Optimization:**
```cpp
void backtrack(int row, int n, vector<string>& board, vector<int>& cols, 
               vector<int>& diag1, vector<int>& diag2, vector<vector<string>>& result) {
    if (row == n) {
        result.push_back(board);
        return;
    }
    
    for (int col = 0; col < n; col++) {
        if (cols[col] || diag1[row + col] || diag2[row - col + n - 1]) {
            continue;  // Invalid placement
        }
        
        // Choose
        board[row][col] = 'Q';
        cols[col] = diag1[row + col] = diag2[row - col + n - 1] = 1;
        
        // Explore
        backtrack(row + 1, n, board, cols, diag1, diag2, result);
        
        // Unchoose
        board[row][col] = '.';
        cols[col] = diag1[row + col] = diag2[row - col + n - 1] = 0;
    }
}
```

**What's happening:** Use three arrays for O(1) constraint checking: cols, diag1 (row+col), diag2 (row-col+n-1). Avoids scanning board each time.

**Dry-Run for N=4, first valid placement:**

| Row | Col | Valid? | Action | board state |
|-----|-----|--------|--------|-------------|
| 0 | 0 | Yes | Place Q | ["Q...","....","....","...."] |
| 1 | 2 | Yes | Place Q | ["Q...","..Q.","....","...."] |
| 2 | 3 | Yes | Place Q | ["Q...","..Q.","...Q","...."] |
| 3 | - | No valid | Backtrack | ["Q...","..Q.","....","...."] |

**Comparison: Naive vs Set-optimized:**

| Aspect | Naive (board scan) | Set-optimized |
|--------|-------------------|---------------|
| Time per check | O(n) | O(1) |
| Space | O(n²) board | O(n) sets |
| Overall | O(n!) slower | O(n!) faster |

**Alternative Approach: Bitmask Sets**
Use bitmasks for columns and diagonals. Each bit represents a column.
```cpp
void backtrack(int row, int n, int cols, int diag1, int diag2, 
               vector<string>& board, vector<vector<string>>& result) {
    if (row == n) { result.push_back(board); return; }
    int available = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    while (available) {
        int col = available & -available;
        available &= available - 1;
        int c = __builtin_ctz(col);
        board[row][c] = 'Q';
        backtrack(row + 1, n, cols | col, (diag1 | col) << 1, (diag2 | col) >> 1, board, result);
        board[row][c] = '.';
    }
}
```

---

### 6. Sudoku Solver (Hard)
**Trigger:** Write a program to solve a Sudoku puzzle.
**Intuition:** Very similar to N-Queens. Iterate through every cell. If a cell is `'.'`, try placing numbers `1` through `9`.
Write an `isValid(board, row, col, char num)` helper function that checks if `num` exists in the current row, column, or $3 \times 3$ sub-box.
If valid, **Choose** the number, **Explore** recursively. If the recursive call returns `true`, the puzzle is solved! If it returns `false`, **Unchoose** (set back to `'.'`) and try the next number.

```cpp
bool solve(vector<vector<char>>& board) {
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') {
                for (char num = '1'; num <= '9'; num++) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num; // CHOOSE
                        if (solve(board)) return true; // EXPLORE
                        board[r][c] = '.'; // UNCHOOSE
                    }
                }
                // If we tried 1-9 and none worked, this branch is a dead end
                return false; 
            }
        }
    }
    return true; // No '.' left, solved!
}
```

**What's happening:** Scan board left-right, top-bottom. For empty cell, try digits 1-9. Check validity in row, col, 3x3 box. If valid, place and recurse. If fails, backtrack and try next digit.

**Dry-Run for one cell (first empty cell at (0,0)):**

| Step | num | isValid? | Action | board[0][0] |
|------|-----|----------|--------|-------------|
| 1 | '1' | Yes | Place | '1' |
| 2 | - | Recurse | Solve rest | '1' |
| 3 | - | Fails | Backtrack | '.' |
| 4 | '2' | Yes | Place | '2' |
| 5 | - | Recurse | Solve rest | '2' |
| 6 | - | Succeeds | Return true | '2' |

**Call Stack Visualization:**
```
solve()
├── Find '.' at (0,0)
├── Try '1': place, recurse
│   ├── solve() fails → backtrack to '.'
├── Try '2': place, recurse
│   ├── solve() succeeds → return true
```

**Alternative Approach: Constraint Propagation**
Use sets for rows, cols, boxes for O(1) validity checks.
```cpp
bool solve(vector<vector<char>>& board, vector<unordered_set<char>>& rows, 
           vector<unordered_set<char>>& cols, vector<unordered_set<char>>& boxes) {
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') {
                for (char num = '1'; num <= '9'; num++) {
                    int boxIdx = (r/3)*3 + c/3;
                    if (rows[r].count(num) || cols[c].count(num) || boxes[boxIdx].count(num)) continue;
                    board[r][c] = num;
                    rows[r].insert(num); cols[c].insert(num); boxes[boxIdx].insert(num);
                    if (solve(board, rows, cols, boxes)) return true;
                    board[r][c] = '.';
                    rows[r].erase(num); cols[c].erase(num); boxes[boxIdx].erase(num);
                }
                return false;
            }
        }
    }
    return true;
}
```

---

## Step-by-Step Walkthrough for a New Problem

**Problem:** Given a set of distinct integers, nums, return all possible subsets (the power set).

**Interview Approach:**

1. **Understand:** Need all subsets including empty set. No duplicates.
2. **Pattern:** Subset problem → backtracking or iterative.
3. **Approach:** Backtracking with index to avoid duplicates.
4. **Code:** Base case: add current to result. Recursive: for each element from index, include and recurse with i+1.
5. **Test:** nums=[1,2] → [[],[1],[2],[1,2]].
6. **Walkthrough:**
   - index=0, current=[] → add []
   - i=0: add 1, recurse → add [1], then [1,2], backtrack
   - i=1: add 2, recurse → add [2], backtrack
7. **Final code and verify.**

This systematic approach ensures clear thinking in interviews.

---

## Comparison Table: Backtracking vs Recursion vs DP

| Aspect | Backtracking | Recursion | DP |
|--------|--------------|-----------|-----|
| Purpose | Explore possibilities with pruning | Divide and conquer | Optimal substructure |
| State | Call stack | Parameters | Table/memoization |
| Pruning | Yes | No | No |
| Time | Exponential | Varies | Polynomial |
| Space | O(depth) stack | O(depth) stack | O(states) table |
| Example | N-Queens | Fibonacci | Knapsack |

**When to use:** Backtracking for constrained exploration, Recursion for subproblems, DP for overlapping subproblems.

---

## Quick Reference Table

| Problem | Template | Key Line | Pruning | Time |
|---------|----------|----------|---------|------|
| Subsets | Subset | `backtrack(nums, i+1, ...)` | None | O(2^n) |
| Permutations | Permutation | `if (!visited[i])` | Visited | O(n*n!) |
| Combination Sum | Combination | `backtrack(cands, target, i, ...)` | sum>target | O(2^target) |
| Word Search | 2D backtracking | `board[r][c] = '#'` | Bounds | O(m*n*4^L) |
| N-Queens | Constraint | `if (cols[col] \|\| ...)` | Sets | O(n!) |
| Sudoku Solver | Constraint | `if (isValid(...))` | Row/col/box | O(9^(81)) |

**Patterns:** Choose-Explore-Unchoose, Index variable, Visited array, Constraint sets.

---

*This comprehensive guide covers the essential backtracking problems with multiple approaches, visualizations, and comparisons. Master these patterns to tackle any backtracking problem confidently.*

---

## Practice & Self-Check

These questions re-run the six solutions above on fresh inputs. For each one, name the template first (subset / permutation / combination-with-reuse / 2D / constraint), then trace.

### Predict the Output / Trace by Hand

**Q1. Combination Sum, `[2, 3]`, target = 6.** Run Problem 3's `backtrack` (reuse allowed, `if (sum > target) return;`). (a) Which combinations are pushed, in order? (b) How many times is `backtrack` called in total (including the root), and how many of those calls end at the `sum > target` prune?

**Q2. Word Search on the classic board.** Use Problem 4's `dfs` (tries Down, Up, Right, Left in that order) on

```
A B C E
S F C S
A D E E
```

(a) Does `"ABCCED"` exist? Give the cells of the path that `dfs` finds starting at (0,0). (b) Does `"ABCB"` exist? Which line of the code stops the path `A → B → C → B` from reusing the `B` at (0,1)?

**Q3. N-Queens bitmask.** In Problem 5's bitmask version with $n = 4$, suppose row 0 places its queen in column 1 (`col = 0b0010`). The call for row 1 receives `cols`, `diag1`, `diag2`. Compute those three masks and `available` in binary. Which column(s) can row 1 use?

**Q4. Spot the error in a dry-run.** Problem 5's "Dry-Run for N=4" table claims that after queens at (0,0) and (1,2), the placement (2,3) is valid. Using the code's own `diag2[row - col + n - 1]` index, check that claim. Which existing queen attacks (2,3)? Is there *any* valid column for row 2?

### Coding Exercises

**E1 (Easy). Count Combination Sum results.** Same rules as Problem 3 (distinct candidates, unlimited reuse), but return only the *number* of combinations. Sort and use `break` instead of the `sum > target` return.

```cpp
int countCombos(vector<int> candidates, int target);
// countCombos([2, 3, 6, 7], 7) -> 2    ([2,2,3], [7])
// countCombos([2, 3, 5], 8)    -> 3    ([2,2,2,2], [2,3,3], [3,5])
```

**E2 (Easy–Medium). Count word paths.** Instead of returning `true` at the first match, count *every* distinct path of cells (4-directional, no cell reused within a path) that spells `word`. Reuse Problem 4's mark-with-`'#'` trick.

```cpp
int countWordPaths(vector<vector<char>> board, const string& word);
// board = [[A,B],[B,A]], word = "AB"  -> 4
// board = [[A,B],[B,A]], word = "ABA" -> 4
// board = [[A,B],[B,A]], word = "AA"  -> 0
```

**E3 (Medium). Restore IP Addresses (LC 93).** Insert three dots into a digit string to form every valid IPv4 address. Each of the 4 parts is 0–255 with no leading zeros (`"0"` is fine, `"01"` is not). The choice at each level is the length of the next part (1, 2 or 3).

```cpp
vector<string> restoreIpAddresses(const string& s);
// "25525511135" -> ["255.255.11.135", "255.255.111.35"]
// "0000"        -> ["0.0.0.0"]
```

#### Dry-Run: Answers

**Q1.** (a) `[2,2,2]`, then `[3,3]`. (b) **9** calls, **2** pruned.

| Call | curr | sum | Outcome |
|------|------|-----|---------|
| 1 | [] | 0 | loop |
| 2 | [2] | 2 | loop |
| 3 | [2,2] | 4 | loop |
| 4 | [2,2,2] | 6 | **found** |
| 5 | [2,2,3] | 7 | prune (7 > 6) |
| 6 | [2,3] | 5 | loop (only i = 1) |
| 7 | [2,3,3] | 8 | prune (8 > 6) |
| 8 | [3] | 3 | loop (only i = 1) |
| 9 | [3,3] | 6 | **found** |

`[3,2]` is never built because the loop starts at `index` — that is what removes order-duplicates.

**Q2.** (a) **Yes**: (0,0) A → (0,1) B → (0,2) C → (1,2) C → (2,2) E → (2,1) D.

| index | at cell | looking for | Down | Up | Right | Left |
|-------|---------|-------------|------|----|-------|------|
| 1 | (0,0) | B | (1,0) S ✗ | OOB ✗ | (0,1) B ✓ | – |
| 2 | (0,1) | C | (1,1) F ✗ | OOB ✗ | (0,2) C ✓ | – |
| 3 | (0,2) | C | (1,2) C ✓ | – | – | – |
| 4 | (1,2) | E | (2,2) E ✓ | – | – | – |
| 5 | (2,2) | D | OOB ✗ | (1,2) `#` ✗ | (2,3) E ✗ | (2,1) D ✓ |
| 6 | – | – | `index == word.length()` → true | | | |

(b) **No.** After `A(0,0) → B(0,1) → C(0,2)`, the only `B` adjacent to (0,2) is (0,1), which now holds `'#'` because of `board[r][c] = '#';  // CHOOSE`. The mismatch test `board[r][c] != word[index]` then returns false. No other start works either (the board has a single `B`).

**Q3.**

| Mask | Computation | Binary (bits 3..0) |
|------|-------------|--------------------|
| `cols` | `0 \| 0b0010` | `0010` |
| `diag1` | `(0 \| 0b0010) << 1` | `0100` |
| `diag2` | `(0 \| 0b0010) >> 1` | `0001` |
| `available` | `1111 & ~(0010 \| 0100 \| 0001)` = `1111 & ~0111` | **`1000`** |

Only **column 3** is available — matching the 4-Queens solution `.Q.. / ...Q / Q... / ..Q.`. Column 1 is blocked vertically, columns 0 and 2 diagonally.

**Q4.** The claim is **wrong**. With $n = 4$: queen (1,2) has `diag2 = 1 - 2 + 3 = 2`, and (2,3) has `diag2 = 2 - 3 + 3 = 2` — the same "\" diagonal, so (1,2) attacks (2,3). Row 2 has **no** valid column:

| (2,col) | Blocked by |
|---------|-----------|
| (2,0) | column of (0,0) |
| (2,1) | `diag1`: (1,2) has `1+2 = 3`, (2,1) has `2+1 = 3` |
| (2,2) | column of (1,2) |
| (2,3) | `diag2` = 2, shared with (1,2) |

So the code backtracks at row 2 (not row 3): it un-places (1,2), tries (1,3), and only then reaches a further row.

**E1 — reference solution**

```cpp
int countFrom(vector<int>& c, int target, int index, int sum) {
    if (sum == target) return 1;                  // One valid combination
    int total = 0;
    for (int i = index; i < (int)c.size(); i++) {
        if (sum + c[i] > target) break;           // Sorted: everything after is too big
        total += countFrom(c, target, i, sum + c[i]);   // i: reuse allowed
    }
    return total;
}

int countCombos(vector<int> candidates, int target) {
    sort(candidates.begin(), candidates.end());
    return countFrom(candidates, target, 0, 0);
}
```

No `current` vector is needed because nothing is recorded — just counted. Same exponential worst case as Problem 3, but the `break` cuts more than the after-the-fact `sum > target` return.

**E2 — reference solution**

```cpp
int dfsCount(vector<vector<char>>& b, const string& w, int r, int c, int idx) {
    if (r < 0 || r >= (int)b.size() || c < 0 || c >= (int)b[0].size()
        || b[r][c] != w[idx]) return 0;           // Out of bounds, used, or mismatch
    if (idx == (int)w.size() - 1) return 1;       // Matched the last character here
    char temp = b[r][c];
    b[r][c] = '#';                                // CHOOSE
    int total = dfsCount(b, w, r + 1, c, idx + 1) + dfsCount(b, w, r - 1, c, idx + 1)
              + dfsCount(b, w, r, c + 1, idx + 1) + dfsCount(b, w, r, c - 1, idx + 1);
    b[r][c] = temp;                               // UNCHOOSE
    return total;                                 // Sum instead of ||: explore all paths
}

int countWordPaths(vector<vector<char>> board, const string& word) {
    if (word.empty()) return 0;
    int total = 0;
    for (int r = 0; r < (int)board.size(); r++)
        for (int c = 0; c < (int)board[0].size(); c++)
            total += dfsCount(board, word, r, c, 0);
    return total;
}
```

$O(m \cdot n \cdot 4^L)$. The key change from Problem 4 is replacing the short-circuit `||` with `+`. For `"AB"` each of the two `A`s has two `B` neighbours → 4. For `"AA"` no `A` is adjacent to another `A` → 0.

**E3 — reference solution**

```cpp
void bt(const string& s, int start, int parts, string current, vector<string>& result) {
    if (parts == 4) {
        if (start == (int)s.size())               // Used every digit exactly
            result.push_back(current.substr(0, current.size() - 1));   // drop last '.'
        return;
    }
    for (int len = 1; len <= 3 && start + len <= (int)s.size(); len++) {
        string seg = s.substr(start, len);
        if (seg.size() > 1 && seg[0] == '0') break;   // Leading zero: longer is also invalid
        if (stoi(seg) > 255) break;                   // Longer would be even bigger
        bt(s, start + len, parts + 1, current + seg + ".", result);
    }
}

vector<string> restoreIpAddresses(const string& s) {
    vector<string> result;
    bt(s, 0, 0, "", result);
    return result;
}
```

At most $3^4 = 81$ leaves, so effectively $O(1)$. `current` is passed by value (strings are tiny), so no explicit unchoose is needed — the copy *is* the undo. For `"0000"`, every part is forced to be `"0"` because `"00"` breaks on the leading-zero check.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems backtracking** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

