# Part 6, Topic 2: Backtracking
## Chapter 2: Pruning

The biggest danger of Backtracking is the Time Complexity.

Because Backtracking explores every possible combination, its time complexity is usually Exponential $O(2^N)$ or Factorial $O(N!)$. For an input size of $N=20$, $O(N!)$ would take longer than the age of the universe to compute.

We optimize backtracking using **Pruning**.

---

### 1. What is Pruning?

Pruning means actively looking ahead and deciding **not** to explore a branch of the state-space tree because you mathematically *know* it cannot lead to a valid solution.

You are "cutting" a branch off the tree, saving massive amounts of computation.

```
╔══════════════════════════════════════════════════════════════════╗
║               WITHOUT PRUNING vs WITH PRUNING                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WITHOUT PRUNING (explore everything):                          ║
║                                                                  ║
║                      []                                          ║
║                   /  |  \                                        ║
║                 /    |    \                                      ║
║              [1]    [2]    [3]                                   ║
║             / | \    |      |                                    ║
║           /   |   \  |      |                                    ║
║        [1,2] [1,3] [2,3]                                        ║
║         ...  ...   ...                                          ║
║                                                                  ║
║  Total nodes visited: 2^N (all of them)                         ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WITH PRUNING (cut dead branches):                               ║
║                                                                  ║
║                      []                                          ║
║                   /  |  \                                        ║
║                 /    |    \                                      ║
║              [1]    [2]    [3]                                   ║
║             / |      |                                           ║
║           /   |      |                                           ║
║        [1,2]  ✂     ✂  ← Pruned! (can't lead to valid solution)║
║                                                                  ║
║  Total nodes visited: Much fewer!                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

#### Types of Pruning

| Pruning Type | What It Does | One-Line Example |
|---|---|---|
| **Feasibility Pruning** | Stop if current state can never become valid | `if (sum > target) break;` |
| **Optimality Pruning** | Stop if current path can't beat best known solution | `if (cost >= best) return;` |
| **Symmetry Breaking** | Avoid exploring equivalent branches | Only pick elements in ascending order |
| **Duplicate Pruning** | Skip identical choices at the same depth | `if (i > index && nums[i] == nums[i-1]) continue;` |

---

#### Decision Tree: Combination Sum `[2,3,6,7]` target = `7`

```
                        [] (sum=0)
                     /    |    \
                   /      |      \
                [2]      [3]      [7]
              sum=2     sum=3     sum=7 ← ✓ FOUND
               / \       | \
             /   |       |   \
         [2,2] [2,3]  [3,3] [3,6]
         sum=4 sum=5  sum=6 sum=9
           |     |      |     ✂
         [2,2,2]  ✂   [3,3,3]
         sum=6  sum=8  sum=9
           |           ✂
      [2,2,2,2]      ✂
      sum=8>7 ✂

  Solutions: [2,2,3] ✓   [7] ✓
  Nodes with pruning: ~15    Without: ~25
```

---

### 2. Example: Combination Sum

Imagine the problem: *"Given an array of positive integers `[2, 3, 6, 7]`, find all combinations that sum up to exactly `7`."*

Suppose your current combination is `[2, 3]`. The current sum is `5`.
Your `for` loop is about to try adding the next number, `6`.

**Without Pruning:**
1. **Choose:** Add `6`. Current combo is `[2, 3, 6]`. Sum is `11`.
2. **Explore:** Call the recursive function.
3. Inside the recursive function, the Base Case checks: `if (sum == 7)`. It isn't. It checks `if (sum > 7)`. It is! Return and stop.
4. **Unchoose:** Remove `6`.

**With Pruning:**
If the input array is sorted `[2, 3, 6, 7]`, we can be much smarter.

```cpp
for (int i = index; i < nums.size(); i++) {
    // PRUNING STEP:
    // If the current sum + the next number exceeds the target,
    // we KNOW it's invalid.
    // Furthermore, because the array is sorted, every number AFTER i
    // will also be too big! We can BREAK the loop entirely!
    if (currentSum + nums[i] > target) {
        break; // Cuts off the entire rest of the branch!
    }

    // Choose
    current.push_back(nums[i]);
    currentSum += nums[i];

    // Explore
    backtrack(...);

    // Unchoose
    current.pop_back();
    currentSum -= nums[i];
}
```

**What's happening:**
```
Without pruning: tries [2,3,6], [2,3,7] → each fails after recursion
With pruning: break skips 6 AND 7 instantly (sorted → all remaining are bigger)
```

---

#### Dry-Run Table: Combination Sum `[2,3,6,7]` target = `7`

| Step | i | nums[i] | current[] | currentSum | Action |
|------|---|---------|-----------|------------|--------|
| 1 | 0 | 2 | [2] | 2 | Recurse |
| 2 | 0 | 2 | [2,2] | 4 | Recurse |
| 3 | 0 | 2 | [2,2,2] | 6 | Recurse |
| 4 | 0 | 2 | [2,2,2,2] | 8 | **Prune** (8>7, break) |
| 5 | 1 | 3 | [2,2,2] | 6 | **Prune** (6+3>7, break) |
| 6 | 1 | 3 | [2,2] | 4 | Choose 3 → [2,2,3] sum=7 ✓ |
| 7 | 2 | 6 | [2,2] | 4 | **Prune** (4+6>7, break) |
| 8 | 1 | 3 | [2] | 2 | Choose 3 → [2,3] sum=5 |
| 9 | 1 | 3 | [2,3,3] | 8 | **Prune** (8>7, break) |
| 10 | 2 | 6 | [2,3] | 5 | **Prune** (5+6>7, break) |
| 11 | 2 | 6 | [2] | 2 | **Prune** (2+6>7, break) |
| 12 | 2 | 6 | [] | 0 | Choose 6 → [6] sum=6 |
| 13 | 3 | 7 | [6] | 6 | **Prune** (6+7>7, break) |
| 14 | 3 | 7 | [] | 0 | Choose 7 → [7] sum=7 ✓ |

**Solutions found: [2,2,3] and [7]**

---

#### Code: With Sum Pruning (Sorted + Break)

```cpp
class Solution {
public:
    void backtrack(vector<int>& nums, int target, int index,
                   vector<int>& current, int currentSum,
                   vector<vector<int>>& result) {

        if (currentSum == target) {
            result.push_back(current);
            return;
        }

        for (int i = index; i < nums.size(); i++) {
            // PRUNING: if sorted, once sum + nums[i] > target,
            // all remaining elements are also too big → break
            if (currentSum + nums[i] > target) {
                break;
            }

            current.push_back(nums[i]);
            backtrack(nums, target, i, current, currentSum + nums[i], result);
            current.pop_back();
        }
    }

    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end()); // SORT FIRST!
        vector<vector<int>> result;
        vector<int> current;
        backtrack(candidates, target, 0, current, 0, result);
        return result;
    }
};
```

**What's happening:**
```
Key differences from the naive version:
1. SORT the array first → enables break optimization
2. Check currentSum + nums[i] BEFORE choosing
3. Use break (not continue) because the array is sorted

Without pruning: tries [2,3,6], [2,3,7], [2,6], [2,7], etc.
With pruning: skips directly past all invalid elements.
```

---

#### Pruning Impact Comparison

| Input | Target | Nodes Without Pruning | Nodes With Pruning | Reduction |
|-------|--------|----------------------|-------------------|-----------|
| [2,3,6,7] | 7 | ~25 | 15 | 40% |
| [2,3,5] | 8 | ~20 | 10 | 50% |
| [2,3,7] | 18 | ~40 | 15 | 63% |
| [1,2,3] | 6 | ~15 | 8 | 47% |
| [2,4,6,8] | 10 | ~30 | 12 | 60% |

**As the target grows relative to the smallest element, pruning becomes MORE effective.**

---

### 3. Cycle/Duplicate Pruning

Another extremely common pruning technique is avoiding duplicate solutions.

If the input array contains duplicates `[1, 2, 2, 3]`, you might end up generating the subset `[1, 2]` twice (once using the first `2`, and once using the second `2`).

To prune duplicates, you sort the array first, and then add this check inside your `for` loop:

```cpp
for (int i = index; i < nums.size(); i++) {
    // PRUNING STEP:
    // If this number is the same as the previous number we just tried
    // AT THIS SPECIFIC DEPTH, skip it to avoid generating duplicate branches.
    if (i > index && nums[i] == nums[i - 1]) {
        continue;
    }

    current.push_back(nums[i]);
    // ...
}
```

**What's happening:**
```
nums = [1, 2, 2, 3] (sorted)
WITHOUT: [1,2] from nums[1] AND nums[2] → DUPLICATE
WITH:    skip nums[2] when nums[2]==nums[1] at same depth → no duplicate
```

**The Key Insight:** `i > index` means "we're not the first element picked at this recursion depth." If we are the first, it's OK to pick even if it's a duplicate. If we're NOT the first at this depth and it's the same as what we just picked, skip it.

---

#### Complete Combination Sum II (with Duplicates)

This problem (LeetCode 40) combines BOTH pruning types: sum pruning + duplicate pruning.

```cpp
void backtrack(vector<int>& nums, int target, int index,
               vector<int>& current, int currentSum,
               vector<vector<int>>& result) {

    if (currentSum == target) {
        result.push_back(current);
        return;
    }

    for (int i = index; i < nums.size(); i++) {
        if (currentSum + nums[i] > target) break;      // Sum pruning
        if (i > index && nums[i] == nums[i - 1]) continue; // Duplicate pruning

        current.push_back(nums[i]);
        backtrack(nums, target, i + 1, current, currentSum + nums[i], result);
        current.pop_back();
    }
}
```

**What's happening:**
```
Two pruning types combined:
1. break (sum pruning): if currentSum + nums[i] > target, skip all remaining
2. continue (duplicate pruning): if nums[i] == nums[i-1] at same depth, skip
Sort once → both checks become simple comparisons.
```

---

#### Dry-Run: Duplicate Pruning `[1,1,2,5,6,7,10]` target = `8`

| Step | i | nums[i] | current[] | currentSum | Action |
|------|---|---------|-----------|------------|--------|
| 1 | 0 | 1 | [1] | 1 | Recurse |
| 2 | 0 | 1 | [1,1] | 2 | Recurse |
| 3 | 1 | 1 | [1,1] | 2 | **Skip** (i>index, nums[1]==nums[0]) |
| 4 | 2 | 2 | [1,1] | 2 | Choose 2 → [1,1,2] sum=4 |
| 5 | 3 | 5 | [1,1,2] | 4 | Choose 5 → [1,1,2,5] sum=9 |
| 6 | 3 | 5 | [1,1,2,5] | 9 | **Prune** (9>8, break) |
| 7 | 4 | 6 | [1,1,2] | 4 | **Prune** (4+6>8, break) |

---

#### Another Pruning Example: Subsets II (LeetCode 90)

```cpp
void backtrack(vector<int>& nums, int index,
               vector<int>& current,
               vector<vector<int>>& result) {

    result.push_back(current); // Record ALL subsets

    for (int i = index; i < nums.size(); i++) {
        if (i > index && nums[i] == nums[i - 1]) continue; // Duplicate pruning

        current.push_back(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.pop_back();
    }
}
```

**What's happening:**
```
nums = [1, 2, 2]
Without: [1,2] from nums[1] AND nums[2] → DUPLICATE
With:    [1,2] from nums[1] only, skip nums[2] at same depth
Result: [], [1], [1,2], [1,2,2], [2], [2,2]
```

---

### 4. Early Termination Pruning

Sometimes you can detect a dead end without even entering the loop:

```cpp
void backtrack(vector<int>& nums, int target, int index,
               vector<int>& current, int sum,
               vector<vector<int>>& result) {

    if (sum == target) {
        result.push_back(current);
        return;
    }

    // EARLY TERMINATION: If sum already exceeds target, stop immediately
    if (sum > target) {
        return;
    }

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        backtrack(nums, target, i, current, sum + nums[i], result);
        current.pop_back();
    }
}
```

**What's happening:**
```
Without early termination: enter recursion, then check sum > target, then return
With early termination: check sum > target BEFORE recursion → saves function call overhead
```

---

### 5. Remaining Elements Pruning

Another powerful pruning: check if the remaining elements can possibly reach the target.

```cpp
void backtrack(vector<int>& nums, int target, int index,
               vector<int>& current, int sum,
               vector<vector<int>>& result) {

    if (sum == target) {
        result.push_back(current);
        return;
    }

    if (sum > target) return;

    // PRUNE: Even if we take ALL remaining elements, can't reach target
    int remainingSum = 0;
    for (int i = index; i < nums.size(); i++) {
        remainingSum += nums[i];
    }
    if (sum + remainingSum < target) return;

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        backtrack(nums, target, i, current, sum + nums[i], result);
        current.pop_back();
    }
}
```

**What's happening:**
```
Case 1: sum > target → return (too big)
Case 2: sum + all remaining < target → return (can't possibly reach target)
This catches cases where you have too FEW elements left to reach the target.
```

---

### 6. Pruning Summary Table

| Pruning Type | Condition | Action | When to Use |
|---|---|---|---|
| **Value too large** | `sum + nums[i] > target` | `break` (sorted) or `return` | Sum-based problems |
| **Duplicate skip** | `i > index && nums[i] == nums[i-1]` | `continue` | Duplicate elements |
| **Early termination** | `sum > target` | `return` immediately | Any bounded sum |
| **Remaining check** | `sum + remaining < target` | `return` | When elements are positive |
| **Visited check** | `visited[i] == true` | `continue` | Permutations, grids |
| **Bounds check** | `r < 0 || r >= n` | `return` | Grid-based problems |

---

### Advanced Pruning Techniques

#### Bounds Pruning

Compute the maximum possible sum from remaining elements. If it's still less than target, prune.

```cpp
int maxPossible = sum;
for (int i = index; i < nums.size(); i++) maxPossible += nums[i];
if (maxPossible < target) return; // Can't reach target
```

#### Ordering Pruning

Sort input to enable `break` instead of `continue`.

```cpp
// With sorting: break skips ALL remaining elements
sort(nums.begin(), nums.end());
if (currentSum + nums[i] > target) break;

// Without sorting: can only skip THIS element
if (currentSum + nums[i] > target) continue;
```

---

### Comparison Table: With Pruning vs Without

| Problem | Without Pruning | With Pruning | Pruning Type |
|---------|----------------|--------------|--------------|
| **Combination Sum** | O(2^N * target) | O(2^(N/2)) avg | Sum + early termination |
| **Combination Sum II** | O(2^N * target) | O(2^(N/2)) avg | Sum + duplicate |
| **Subsets II** | O(2^N) | O(2^N) worst, better avg | Duplicate |
| **Permutations** | O(N!) | O(N!) worst, better avg | Visited check |

---

### Quick Reference: Pruning

| Concept | Description |
|---------|-------------|
| **Pruning** | Skip branches that can't lead to valid solution |
| **Sort first** | Enables `break` instead of just `continue` |
| **Break vs Continue** | `break` = all remaining invalid (sorted); `continue` = skip this one |
| **Early termination** | Return before recursing if state is already invalid |
| **Duplicate pruning** | Sort + `i > index && nums[i] == nums[i-1]` |
| **Remaining sum** | Can remaining elements reach the target? |
| **Bounds pruning** | Compute min/max possible from remaining elements |
| **Impact** | Can reduce $O(2^N)$ to $O(2^{N/2})$ or better |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Pruning**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 pruning** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

