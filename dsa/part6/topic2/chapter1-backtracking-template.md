# Part 6, Topic 2: Backtracking
## Chapter 1: The Backtracking Template

Backtracking is an algorithmic technique for solving problems recursively by trying to build a solution incrementally, one piece at a time.

If at any point the algorithm realizes that the current piece cannot possibly lead to a valid solution, it abandons it ("backtracks"), undoes the most recent choice, and tries the next available option.

```
Backtracking in one sentence:
  Try something → If it fails → Undo → Try something else
  If everything works → Save the solution
```

---

### 1. The State-Space Tree

To understand backtracking, you must visualize the **State-Space Tree**.

Imagine you are in a maze. You reach an intersection with 3 paths: Left, Straight, Right.
1. You **Choose** Left.
2. You **Explore** down the Left path. It leads to a dead end.
3. You walk back to the intersection (you **Unchoose** Left).
4. You **Choose** Straight.
5. You **Explore** down the Straight path...

Every intersection is a node in the State-Space Tree. Every path is a recursive call. Backtracking is simply performing a Depth-First Search (DFS) on this imaginary tree of choices.

```
╔══════════════════════════════════════════════════════════════════╗
║                    STATE-SPACE TREE                             ║
║                    (Example: Subsets of {1, 2, 3})              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║                         []                                      ║
║                       / |  \                                    ║
║                     /   |    \                                   ║
║                   /     |      \                                 ║
║                 [1]    [2]     [3]                               ║
║                / \      |       |                                ║
║              /    \     |       |                                ║
║           [1,2] [1,3]  [2,3]                                     ║
║            |                                                     ║
║          [1,2,3]                                                 ║
║                                                                  ║
║  DFS traversal order:  [] → [1] → [1,2] → [1,2,3]              ║
║                        → [1,3] → [2] → [2,3] → [3]             ║
║                                                                  ║
║  Each edge = one choice (push element)                           ║
║  Each return = backtrack (pop element)                           ║
║  Each node = valid state to record                               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### 2. The Golden Template

Almost every single backtracking problem in an interview can be solved using this exact structure. Memorize it.

```cpp
void backtrack(ResultType& result, CurrentState& current, InputData& input, int index) {
    // 1. BASE CASE: Have we reached a valid solution?
    if (isAValidSolution(current)) {
        result.push_back(current); // Save a copy of the current state
        return; // Stop exploring this branch
    }

    // 2. ITERATE OVER CHOICES: What are the possible next steps from here?
    for (int i = index; i < input.size(); i++) {

        // 3. CHOOSE: Make a decision and update the current state
        current.push_back(input[i]);

        // 4. EXPLORE: Recurse deeper into the tree WITH the new choice
        backtrack(result, current, input, i + 1);

        // 5. UNCHOOSE (UNDO): The recursion returned! This means we either
        // hit a dead end, OR we found a solution and saved it.
        // We must undo our choice so the 'for' loop can try the NEXT option.
        current.pop_back();
    }
}
```

**What's happening — Annotated Version:**
```cpp
void backtrack(vector<vector<int>>& result, vector<int>& current,
               vector<int>& nums, int index) {

    // 1. BASE CASE: Valid solution found
    if (/* current is a valid solution */) {
        result.push_back(current);  // Save a COPY (current will change!)
        return;                      // Stop this branch
    }

    // 2. FOR LOOP: Try each possible next choice
    for (int i = index; i < nums.size(); i++) {

        // 3. CHOOSE: Add nums[i] to current solution
        current.push_back(nums[i]);
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//      We modify the shared state

        // 4. EXPLORE: Go deeper with this choice
        backtrack(result, current, nums, i + 1);
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//      Recursion explores all paths starting with nums[i]
//      When it returns, we've explored ALL options below

        // 5. UNCHOOSE: Undo the choice for the next loop iteration
        current.pop_back();
//      ^^^^^^^^^^^^^^^^^^^
//      CRITICAL: Without this, state is corrupted!
    }
}
```

**Production Version with Early Pruning:**
```cpp
void backtrackPruned(ResultType& result, CurrentState& current,
                     InputData& input, int index) {
    // BASE CASE
    if (isAValidSolution(current)) {
        result.push_back(current);
        return;
    }

    for (int i = index; i < input.size(); i++) {
        // PRUNING: Check BEFORE choosing (not after)
        if (!isPromising(current, input[i])) {
            continue;  // Skip this branch entirely!
        }

        current.push_back(input[i]);
        backtrackPruned(result, current, input, i + 1);
        current.pop_back();
    }
}

bool isPromising(vector<int>& current, int next) {
    // Example for Combination Sum: skip if sum would exceed target
    int currentSum = accumulate(current.begin(), current.end(), 0);
    return currentSum + next <= target;
}
```

---

### 3. The Power of "Unchoose" (Undo)

Why do we need the `current.pop_back()` step?

In C++, passing large arrays by value `vector<int> current` into every recursive call is incredibly slow ($O(N)$ time and space per call). It will cause a Time Limit Exceeded (TLE) error.

Instead, we pass `current` by reference `vector<int>& current`. This means there is only ONE array in memory being shared by every single recursive function.

If Function A adds `[1]` to the array, and calls Function B, the array is `[1]`.
If Function B adds `[2]` and returns, the array is now `[1, 2]`.
When control returns to Function A, Function A wants to try the next option, `[3]`. But the array is currently `[1, 2]`. If it just adds `[3]`, the array becomes `[1, 2, 3]`. This is corrupted state!

Function A MUST undo what Function B did. It pops the `[2]` off, making the array `[1]` again, before adding `[3]` to make it `[1, 3]`. This is the essence of backtracking.

```
WITHOUT pop_back (WRONG):
  A adds [1] → [1]
  B adds [2] → [1,2]
  B returns
  A adds [3] → [1,2,3]  ← WRONG! Should be [1,3]

WITH pop_back (CORRECT):
  A adds [1] → [1]
  B adds [2] → [1,2]
  B returns
  A pops [2] → [1]      ← Undo B's choice
  A adds [3] → [1,3]    ← CORRECT!
```

**Visual Walkthrough: Subsets of {1, 2, 3}**
```
Step | Action          | current[]  | result[]
─────┼─────────────────┼────────────┼─────────────────────────
  1   | Enter backtrack | []         | []
  2   | Choose 1        | [1]        | []
  3   | Choose 2        | [1,2]      | []
  4   | Choose 3        | [1,2,3]    | []
  5   | Base case!      | [1,2,3]    | [[1,2,3]]
  6   | Unchoose 3      | [1,2]      | [[1,2,3]]
  7   | Unchoose 2      | [1]        | [[1,2,3]]
  8   | Choose 3        | [1,3]      | [[1,2,3]]
  9   | Base case!      | [1,3]      | [[1,2,3],[1,3]]
 10   | Unchoose 3      | [1]        | [[1,2,3],[1,3]]
 11   | Unchoose 1      | []         | [[1,2,3],[1,3]]
 12   | Choose 2        | [2]        | [[1,2,3],[1,3]]
 13   | Choose 3        | [2,3]      | [[1,2,3],[1,3]]
 14   | Base case!      | [2,3]      | [[1,2,3],[1,3],[2,3]]
 15   | Unchoose 3      | [2]        | [[1,2,3],[1,3],[2,3]]
 16   | Unchoose 2      | []         | [[1,2,3],[1,3],[2,3]]
 17   | Choose 3        | [3]        | [[1,2,3],[1,3],[2,3]]
 18   | Base case!      | [3]        | [[1,2,3],[1,3],[2,3],[3]]
```

---

### 4. Complete Example: Generate All Subsets

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> result;
        vector<int> current;
        backtrack(nums, 0, current, result);
        return result;
    }

    void backtrack(vector<int>& nums, int index, vector<int>& current,
                   vector<vector<int>>& result) {
        // Save EVERY state (including empty set)
        result.push_back(current);

        for (int i = index; i < nums.size(); i++) {
            current.push_back(nums[i]);    // CHOOSE
            backtrack(nums, i + 1, current, result); // EXPLORE
            current.pop_back();            // UNCHOOSE
        }
    }
};
```

**What's happening:**
```
backtrack(nums=[1,2,3], index=0, current=[])
│
├─ result.push_back([])                    // Record: []
│
├─ i=0: push(1) → current=[1]
│  │
│  ├─ result.push_back([1])               // Record: [1]
│  │
│  ├─ i=1: push(2) → current=[1,2]
│  │  │
│  │  ├─ result.push_back([1,2])          // Record: [1,2]
│  │  │
│  │  ├─ i=2: push(3) → current=[1,2,3]
│  │  │  ├─ result.push_back([1,2,3])     // Record: [1,2,3]
│  │  │  └─ pop(3) → current=[1,2]
│  │  │
│  │  └─ pop(2) → current=[1]
│  │
│  ├─ i=2: push(3) → current=[1,3]
│  │  ├─ result.push_back([1,3])          // Record: [1,3]
│  │  └─ pop(3) → current=[1]
│  │
│  └─ pop(1) → current=[]
│
├─ i=1: push(2) → current=[2]
│  │
│  ├─ result.push_back([2])               // Record: [2]
│  │
│  ├─ i=2: push(3) → current=[2,3]
│  │  ├─ result.push_back([2,3])          // Record: [2,3]
│  │  └─ pop(3) → current=[2]
│  │
│  └─ pop(2) → current=[]
│
├─ i=2: push(3) → current=[3]
│  ├─ result.push_back([3])               // Record: [3]
│  └─ pop(3) → current=[]
│
└─ Done! result = [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

**Time Complexity:**
- Total subsets of N elements: $2^N$
- Each subset requires $O(N)$ to copy into result
- Time: $O(N \cdot 2^N)$

**Space Complexity:**
- Recursion depth: $O(N)$
- Result storage: $O(N \cdot 2^N)$

---

### 5. Complete Example: Permutations

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> result;
        vector<int> current;
        vector<bool> used(nums.size(), false);
        backtrack(nums, used, current, result);
        return result;
    }

    void backtrack(vector<int>& nums, vector<bool>& used,
                   vector<int>& current, vector<vector<int>>& result) {
        // BASE CASE: permutation complete
        if (current.size() == nums.size()) {
            result.push_back(current);
            return;
        }

        // KEY DIFFERENCE: start from 0, not index!
        // Permutations use ALL elements at every level
        for (int i = 0; i < nums.size(); i++) {
            if (used[i]) continue;  // Skip already-used elements

            used[i] = true;         // CHOOSE
            current.push_back(nums[i]);

            backtrack(nums, used, current, result);  // EXPLORE

            current.pop_back();     // UNCHOOSE
            used[i] = false;
        }
    }
};
```

**What's happening:**
```
Subsets vs Permutations:
┌──────────────┬───────────────────┬───────────────────┐
│ Aspect       │ Subsets           │ Permutations      │
├──────────────┼───────────────────┼───────────────────┤
│ Loop starts  │ from index        │ from 0            │
│ Order        │ [1,2] same as     │ [1,2] different   │
│              │ [2,1] → one       │ from [2,1] → both │
│              │ subset            │ permutations      │
│ Used array   │ Not needed        │ Needed            │
│ Recursion    │ i + 1             │ 0 (with used[])   │
└──────────────┴───────────────────┴───────────────────┘

Total: 3! = 6 permutations for [1,2,3]
```

---

### 6. Complete Example: N-Queens

```cpp
class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        vector<vector<string>> result;
        vector<string> board(n, string(n, '.'));
        backtrack(board, 0, result);
        return result;
    }

    void backtrack(vector<string>& board, int row,
                   vector<vector<string>>& result) {
        // BASE CASE: all queens placed
        if (row == board.size()) {
            result.push_back(board);
            return;
        }

        for (int col = 0; col < board.size(); col++) {
            if (!isSafe(board, row, col)) continue;  // PRUNING

            board[row][col] = 'Q';      // CHOOSE
            backtrack(board, row + 1, result);  // EXPLORE next row
            board[row][col] = '.';      // UNCHOOSE
        }
    }

    bool isSafe(vector<string>& board, int row, int col) {
        int n = board.size();

        // Check column above
        for (int i = 0; i < row; i++) {
            if (board[i][col] == 'Q') return false;
        }

        // Check diagonal up-left
        for (int i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
            if (board[i][j] == 'Q') return false;
        }

        // Check diagonal up-right
        for (int i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++) {
            if (board[i][j] == 'Q') return false;
        }

        return true;
    }
};
```

**What's happening:**
```
N-Queens on 4x4 board:

Solution for 4-Queens:
  . Q . .
  . . . Q
  Q . . .
  . . Q .

Pruning: isSafe() check BEFORE placing queen
  Without pruning: 4^4 = 256 branches
  With pruning:    ~15 branches explored
```

---

### 7. Pruning Strategies

Pruning is the key to making backtracking efficient. Without it, you explore the ENTIRE state-space tree.

```cpp
// Early termination: stop if sum exceeds target
for (int i = index; i < candidates.size(); i++) {
    if (currentSum + candidates[i] > target) continue;  // PRUNE
}

// Skip duplicates: sort first, then skip same elements at same level
sort(nums.begin(), nums.end());
for (int i = index; i < nums.size(); i++) {
    if (i > index && nums[i] == nums[i-1]) continue;  // PRUNE
}

// Feasibility check: N-Queens
if (!isSafe(board, row, col)) continue;  // PRUNE
```

```
Without pruning (N-Queens n=8): 8^8 = 16,777,216 branches explored
With pruning (isSafe check):    ~15,720 branches explored (0.09%!)
```

---

### 8. Common Backtracking Variants

| Variant | Loop Start | Recursive Call | Use Case |
|---------|------------|----------------|----------|
| **Subsets** | `index` | `i + 1` | All subsets, combinations |
| **Permutations** | `0` | (no index) | All orderings |
| **Combination Sum** | `index` | `i` (reuse) or `i+1` | Sum to target |
| **N-Queens** | row-based | row + 1 | Constraint satisfaction |
| **Sudoku** | all cells | next cell | Fill grid |
| **Word Search** | all dirs | next cell | Path finding |

---

### 9. Backtracking vs Other Approaches

| Problem | Backtracking | DP | Greedy |
|---------|-------------|-----|--------|
| Subsets | O(N × 2^N) | O(N × 2^N) | N/A |
| Permutations | O(N × N!) | O(N × N!) | N/A |
| Knapsack | O(2^N) | O(N × W) | Approximation |
| N-Queens | O(N!) with pruning | N/A | N/A |

Use backtracking when you need ALL solutions with hard constraints. Use DP for ONE optimal solution with overlapping subproblems. Use Greedy when local optimal = global optimal.

---

### 10. Common Mistakes

**Mistake 1: Forgetting to backtrack (pop)** — state gets corrupted! Always undo after recursion returns.

**Mistake 2: Passing by value instead of reference** — O(N) copy per call causes TLE. Use `vector<int>& current`.

**Mistake 3: Wrong base case** — check `current.size() == nums.size()`, not `nums.size() - 1`.

**Mistake 4: Not handling duplicates** — sort first, then skip `if (i > index && nums[i] == nums[i-1]) continue;`.

---

### Quick Reference: Backtracking Template

| Step | Action | Code |
|------|--------|------|
| **Base Case** | Check if current is valid | `if (isValid(current))` |
| **Choose** | Add element to current | `current.push_back(x)` |
| **Explore** | Recurse deeper | `backtrack(...)` |
| **Unchoose** | Remove element | `current.pop_back()` |
| **Iterate** | Try next option | `for (int i = index; ...)` |

| Concept | Description |
|---------|-------------|
| **State-Space Tree** | All possible choices as a tree |
| **DFS on tree** | Backtracking explores depth-first |
| **Choose/Unchoose** | Symmetric operations on shared state |
| **Pruning** | Skip branches that can't lead to solution |
| **Reference passing** | Avoid copying arrays (performance) |
| **Index parameter** | Controls which elements are available |
| **used[] array** | For permutations (track used elements) |
| **Sort + skip** | For handling duplicates |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Backtracking Template**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 backtracking template** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

