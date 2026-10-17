# Part 6, Topic 2: Backtracking
## Chapter 2: Pruning

The biggest danger of Backtracking is the Time Complexity.

Because Backtracking explores every possible combination, its time complexity is usually Exponential $O(2^N)$ or Factorial $O(N!)$. For an input size of $N=20$, $O(N!)$ is about $2.4 \times 10^{18}$ operations, which would take decades (~77 years at $10^9$ operations/second) to compute.

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
                  /          |          \          \
               [2]          [3]          [6]         [7]
              sum=2        sum=3        sum=6       sum=7 ← ✓ FOUND
              /   \         /   \          |
         [2,2]   [2,3]  [3,3]  [3,6]    [6,6]
         sum=4   sum=5  sum=6  sum=9 ✂  sum=12 ✂
         /    \      \      \
   [2,2,2]  [2,2,3]  [2,3,3]  [3,3,3]
   sum=6    sum=7 ✓  sum=8 ✂  sum=9 ✂
      |
  [2,2,2,2]
  sum=8>7 ✂

  Solutions: [2,2,3] ✓   [7] ✓
  Nodes (recursive calls) with pruning: 10    Without: 28
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
| 5 | 1 | 3 | [2,2] | 4 | Choose 3 → [2,2,3] sum=7 ✓ |
| 6 | 2 | 6 | [2,2] | 4 | **Prune** (4+6>7, break) |
| 7 | 1 | 3 | [2] | 2 | Choose 3 → [2,3] sum=5 |
| 8 | 1 | 3 | [2,3,3] | 8 | **Prune** (8>7, break) |
| 9 | 2 | 6 | [2] | 2 | **Prune** (2+6>7, break) |
| 10 | 1 | 3 | [] | 0 | Choose 3 → [3] sum=3 |
| 11 | 1 | 3 | [3] | 3 | Choose 3 → [3,3] sum=6 |
| 12 | 1 | 3 | [3,3,3] | 9 | **Prune** (9>7, break) |
| 13 | 2 | 6 | [3] | 3 | **Prune** (3+6>7, break) |
| 14 | 2 | 6 | [] | 0 | Choose 6 → [6] sum=6 |
| 15 | 2 | 6 | [6] | 6 | **Prune** (6+6>7, break) |
| 16 | 3 | 7 | [] | 0 | Choose 7 → [7] sum=7 ✓ |

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
| [2,3,6,7] | 7 | 28 | 10 | 64% |
| [2,3,5] | 8 | 23 | 13 | 43% |
| [2,3,7] | 18 | 93 | 57 | 39% |
| [1,2,3] | 6 | 35 | 23 | 34% |
| [2,4,6,8] | 10 | 38 | 18 | 53% |

(A "node" is one call to `backtrack`, root included. "Without pruning" is the Section 4 version, which only returns once `sum > target`; "with pruning" is the sorted + `break` code above.)

**As the target grows relative to the smallest element, pruning saves MORE calls in absolute terms, though the percentage saved shrinks** (e.g. `[2,3,6,7]`: target 7 saves 18 of 28 calls, target 20 saves 105 of 223).

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
| 2 | 1 | 1 | [1,1] | 2 | Recurse (i == index, first pick at this depth → allowed) |
| 3 | 2 | 2 | [1,1] | 2 | Choose 2 → [1,1,2] sum=4 |
| 4 | 3 | 5 | [1,1,2] | 4 | **Prune** (4+5>8, break) |
| 5 | 3 | 5 | [1,1] | 2 | Choose 5 → [1,1,5] sum=7 |
| 6 | 4 | 6 | [1,1,5] | 7 | **Prune** (7+6>8, break) |
| 7 | 4 | 6 | [1,1] | 2 | Choose 6 → [1,1,6] sum=8 ✓ |
| … | … | … | … | … | ([1,2,5], [1,7] found under [1]) |
| 8 | 1 | 1 | [] | 0 | **Skip** (i>index=0, nums[1]==nums[0]) |

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
Without early termination: sum keeps growing and the loop recurses forever
With early termination: check sum > target at the top of the call, BEFORE the loop → the call returns at once
(The sorted + break version checks BEFORE the recursive call, so it also saves the call itself)
```

---

### 5. Remaining Elements Pruning

Another powerful pruning: check if the remaining elements can possibly reach the target. This is only safe when each element can be used **at most once** (recurse with `i + 1`, as below) and all numbers are positive. If elements may be reused (recursing with `i`, as in Combination Sum), the remaining elements can contribute without limit, so this check would wrongly cut valid branches.

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
        backtrack(nums, target, i + 1, current, sum + nums[i], result); // i + 1: each element used at most once
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
| **Remaining check** | `sum + remaining < target` | `return` | When elements are positive and each is used at most once |
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
| **Combination Sum** | O(N^(T/M)) (T=target, M=min) | O(N^(T/M)) worst, better avg | Sum + early termination |
| **Combination Sum II** | O(2^N) | O(2^N) worst, better avg | Sum + duplicate |
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
| **Impact** | Same worst-case Big-O, but far fewer nodes explored in practice |

---

## Practice & Self-Check

For each question, ask two things: *is this pruning **safe*** (it never cuts a branch that contains a valid answer), and *does it rely on a precondition* (sorted input, positive numbers, no reuse)?

### Predict the Output / Trace by Hand

**Q1. Combination Sum on `[2, 3, 5]`, target = 8.** Run the "With Sum Pruning (Sorted + Break)" code. List every combination pushed into `result`, in order.

**Q2. Combination Sum II.** Run the Section 3 Combination Sum II `backtrack` (sum `break` + duplicate `continue`, recursion on `i + 1`) on `candidates = [10, 1, 2, 7, 6, 1, 5]`, target = 8, after sorting. What is the sorted array, and what combinations are pushed, in order?

**Q3. Forgetting to sort before Subsets II.** The Subsets II `backtrack` relies on equal values being adjacent. What does it record for `nums = [2, 1, 2]` *without* sorting first? Which entries are duplicates (as sets)?

**Q4. `break` on unsorted input.** Someone keeps the `break` from the sorted Combination Sum code but forgets the `sort(...)` call. What does `combinationSum([2, 7, 3], 5)` return? What is the correct answer?

**Q5. A pruning that is not safe here.** A common mistake is to paste Section 5's "Remaining Elements Pruning" into the reuse-allowed Combination Sum, which recurses with `i` instead of `i + 1`:

```cpp
// remainingSum = sum of nums[index..end]
if (sum + remainingSum < target) return;
for (int i = index; i < nums.size(); i++) {
    current.push_back(nums[i]);
    backtrack(nums, target, i, current, sum + nums[i], result); // reuse allowed
    current.pop_back();
}
```

What does this version return for `nums = [2]`, target = 4? Is that correct? Under what condition is the `sum + remainingSum < target` check actually safe?

### Coding Exercises

**E1 (Easy). Combination Sum III.** Find all combinations of exactly `k` distinct numbers from 1–9 that sum to `n`. The numbers 1–9 are already sorted, so use `break` sum-pruning.

```cpp
vector<vector<int>> combinationSum3(int k, int n);
// k = 3, n = 7 -> [[1, 2, 4]]
// k = 3, n = 9 -> [[1, 2, 6], [1, 3, 5], [2, 3, 4]]
```

**E2 (Easy–Medium). Permutations with duplicates.** Return all *unique* permutations. Sort, then use a duplicate-pruning rule adapted for a `used[]` array (permutations loop from 0, so `i > index` no longer applies).

```cpp
vector<vector<int>> permuteUnique(vector<int>& nums);
// [1, 1, 2] -> [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
// [3, 3]    -> [[3, 3]]
```

**E3 (Medium). Optimality pruning: fewest numbers to reach a target.** Each number may be reused. Return the minimum count of numbers whose sum equals `target`, or `-1`. Keep a global `best` and prune with `if (count + 1 >= best) return;` (the "Optimality Pruning" row of the Types table). Sorting descending finds good answers early, which makes the pruning stronger.

```cpp
int minCountSum(vector<int> nums, int target);
// nums = [1, 3, 4], target = 6 -> 2   (3 + 3)
// nums = [2],       target = 3 -> -1
```

#### Dry-Run: Answers

**Q1.** `[2,2,2,2]`, `[2,3,3]`, `[3,5]`.

| Path | Sum | What happens |
|------|-----|--------------|
| 2,2,2,2 | 8 | ✓ record |
| 2,2,2 then +3 | 9 | break |
| 2,2,3 | 7 | next +3 → 10, break |
| 2,2 then +5 | 9 | break |
| 2,3,3 | 8 | ✓ record |
| 2,3 then +5 | 10 | break |
| 2,5 | 7 | +5 → 12, break |
| 3,3 | 6 | +3 → 9, break |
| 3,5 | 8 | ✓ record |
| 5 then +5 | 10 | break |

**Q2.** Sorted: `[1, 1, 2, 5, 6, 7, 10]`. Pushed: **`[1,1,6]`, `[1,2,5]`, `[1,7]`, `[2,6]`**.

| Depth-0 pick | Explored (key steps) | Recorded |
|--------------|----------------------|----------|
| `1` (i=0) | `1,1` → `1,1,2` (4) then +5=9 break; `1,1,5`=7 then +6 break; `1,1,6` = 8 ✓ | `[1,1,6]` |
| | `1,2` → `1,2,5` = 8 ✓ | `[1,2,5]` |
| | `1,5` (6) → +6=12 break; `1,6` (7) → +7 break; `1,7` = 8 ✓ | `[1,7]` |
| `1` (i=1) | **skipped**: `i > index` and `nums[1] == nums[0]` | – |
| `2` (i=2) | `2,5` (7) → +6 break; `2,6` = 8 ✓ | `[2,6]` |
| `5` (i=3) | `5` + 6 = 11 → break | – |
| `6`, `7` | `6`: +7 = 13 break; `7`: next is 10 → 17 break | – |
| `10` | 0 + 10 > 8 → break the root loop | – |

**Q3.** Records 8 entries: `[]`, `[2]`, `[2,1]`, `[2,1,2]`, `[2,2]`, `[1]`, `[1,2]`, `[2]`. The duplicate check never fires (`nums[1]=1 ≠ nums[0]=2`, `nums[2]=2 ≠ nums[1]=1`), so `[2]` appears twice and `[2,1]` / `[1,2]` are the same set. The correct answer has 6 subsets: `[]`, `[1]`, `[1,2]`, `[1,2,2]`, `[2]`, `[2,2]`.

**Q4.** It returns **`[]`** (nothing), but the correct answer is **`[[2, 3]]`**.

| Frame | Tries | Sum | Result |
|-------|-------|-----|--------|
| root | 2 | 2 | recurse |
| `[2]` | 2 | 4 | recurse |
| `[2,2]` | 2 | 6 > 5 | **break** (never tries 3) |
| `[2]` | 7 | 9 > 5 | **break** — `3` is never tried, so `[2,3]` is lost |
| root | 7 | 7 > 5 | **break** — `3` is never tried |

`break` assumes "everything after `i` is at least as big". On unsorted input that is false, so the pruning is **unsafe**. Either sort first or use `continue`.

**Q5.** It returns **`[]`**, which is **wrong** — `[2, 2]` sums to 4. At the root, `sum = 0`, `remainingSum = 2`, and `0 + 2 < 4` returns immediately. The check assumes each remaining element can be taken at most once; with reuse allowed (recursing on `i`), the remaining elements can contribute unboundedly. It is safe only when the recursion passes `i + 1` (each element used at most once, as in Section 5 and Combination Sum II) and all numbers are non-negative.

**E1 — reference solution**

```cpp
void bt(int k, int n, int start, int sum,
        vector<int>& current, vector<vector<int>>& result) {
    if ((int)current.size() == k) {
        if (sum == n) result.push_back(current);
        return;
    }
    for (int x = start; x <= 9; x++) {
        if (sum + x > n) break;            // 1..9 is sorted: all later x are bigger
        current.push_back(x);              // CHOOSE
        bt(k, n, x + 1, sum + x, current, result);   // EXPLORE (distinct: x + 1)
        current.pop_back();                // UNCHOOSE
    }
}

vector<vector<int>> combinationSum3(int k, int n) {
    vector<vector<int>> result;
    vector<int> current;
    bt(k, n, 1, 0, current, result);
    return result;
}
```

At most $\binom{9}{k}$ leaves, so it is effectively constant-time; the `break` cuts most of them.

**E2 — reference solution**

```cpp
void bt(vector<int>& nums, vector<bool>& used,
        vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {
        result.push_back(current);
        return;
    }
    for (int i = 0; i < (int)nums.size(); i++) {
        if (used[i]) continue;
        // Duplicate pruning: among equal values, only use them left-to-right.
        if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        current.push_back(nums[i]);
        bt(nums, used, current, result);
        current.pop_back();
        used[i] = false;
    }
}

vector<vector<int>> permuteUnique(vector<int>& nums) {
    sort(nums.begin(), nums.end());              // Equal values become adjacent
    vector<vector<int>> result;
    vector<int> current;
    vector<bool> used(nums.size(), false);
    bt(nums, used, current, result);
    return result;
}
```

$O(N \cdot N!)$ worst case. The rule "skip `nums[i]` if its equal left neighbour is *unused*" forces equal values to be placed in index order, so each distinct arrangement is built exactly once.

**E3 — reference solution**

```cpp
void bt(vector<int>& nums, int target, int index,
        int sum, int count, int& best) {
    if (sum == target) {                        // Found a valid combination
        best = min(best, count);
        return;
    }
    if (count + 1 >= best) return;              // OPTIMALITY PRUNING: can't beat best
    for (int i = index; i < (int)nums.size(); i++) {
        if (sum + nums[i] > target) continue;   // Descending order: later ones may still fit
        bt(nums, target, i, sum + nums[i], count + 1, best);   // reuse allowed: i
    }
}

int minCountSum(vector<int> nums, int target) {
    sort(nums.rbegin(), nums.rend());           // Big numbers first → good 'best' early
    int best = INT_MAX;
    bt(nums, target, 0, 0, 0, best);
    return best == INT_MAX ? -1 : best;
}
```

Note the use of `continue`, not `break`: in **descending** order, a number that is too big says nothing about the smaller ones after it. For `[4, 3, 1]`, 6: path `4,1,1` sets `best = 3` first; later `3,3` improves it to `2`, and every deeper branch with `count + 1 >= 2` is cut. (For large inputs this problem is better solved with DP — see the Coin Change chapter later.)

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

