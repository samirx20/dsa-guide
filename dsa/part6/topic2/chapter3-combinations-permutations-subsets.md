# Part 6, Topic 2: Backtracking
## Chapter 3: Subsets vs Permutations vs Combinations

In interviews, backtracking problems almost always boil down to generating one of three mathematical constructs: Subsets, Permutations, or Combinations.

You must understand the subtle differences in the `for` loop and the recursive call for each of these.

---

### Quick Comparison Table

| Property | Subsets | Combinations | Permutations |
|----------|---------|--------------|--------------|
| **Order matters?** | No | No | Yes |
| **All lengths?** | Yes (0 to N) | Fixed length K | Fixed length N |
| **Loop starts at** | `index` | `index` | `0` |
| **Recursive call** | `i + 1` | `i + 1` | (no index) |
| **Extra tracking** | None | None | `visited[]` array |
| **Save when** | Every call | `current.size() == K` | `current.size() == N` |
| **Time complexity** | $O(N \cdot 2^N)$ | $O(K \cdot C(N,K))$ | $O(N \cdot N!)$ |

---

### 1. Subsets (Power Set)

**Definition:** A subset is any possible grouping of the elements. Order does NOT matter (`[1, 2]` is the same as `[2, 1]`). You want to return subsets of ALL lengths (from length 0 to length N).
For `[1, 2]`, subsets are `[]`, `[1]`, `[2]`, `[1, 2]`.

**The Trick:**
Because order doesn't matter, we use an `index` variable. When we pick `nums[i]`, the recursive call explores `i + 1` next. We NEVER look backwards, preventing us from generating `[2, 1]` after we already generated `[1, 2]`.
Because we want ALL lengths, we save the `current` state to the result at the *beginning* of every recursive call, not just at the end.

```cpp
void subsetBacktrack(vector<int>& nums, int index, vector<int>& current, vector<vector<int>>& result) {
    result.push_back(current);  // Save EVERY state we reach

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        subsetBacktrack(nums, i + 1, current, result);  // Pass i + 1 to never look backwards
        current.pop_back();
    }
}
```

**What's happening:**
```
Subsets of [1, 2, 3]:

                    [] (save)
                   / | \
                [1] [2] [3] (save each)
               / \    |
          [1,2] [1,3] [2,3] (save each)
           |
       [1,2,3] (save)

Key: The for loop starts at 'index', so from [1] we can only
pick 2 or 3 (not 1 again). This prevents [1,2] and [2,1] both appearing.
```

**Dry-Run Table:**

| Step | index | i | current | action | result so far |
|------|-------|---|---------|--------|---------------|
| 1 | 0 | - | [] | save [] | [[]] |
| 2 | 0 | 0 | [1] | push 1 | [[]] |
| 3 | 1 | - | [1] | save [1] | [[],[1]] |
| 4 | 1 | 1 | [1,2] | push 2 | [[],[1]] |
| 5 | 2 | - | [1,2] | save [1,2] | [[],[1],[1,2]] |
| 6 | 2 | 2 | [1,2,3] | push 3 | [[],[1],[1,2]] |
| 7 | 3 | - | [1,2,3] | save [1,2,3] | [[],[1],[1,2],[1,2,3]] |
| 8 | 3 | - | [1,2] | pop 3 | [[],[1],[1,2],[1,2,3]] |
| 9 | 2 | - | [1] | pop 2 | [[],[1],[1,2],[1,2,3]] |
| 10 | 1 | 2 | [1,3] | push 3 | [[],[1],[1,2],[1,2,3]] |
| 11 | 3 | - | [1,3] | save [1,3] | [[],[1],[1,2],[1,2,3],[1,3]] |
| 12 | 3 | - | [1] | pop 3 | [[],[1],[1,2],[1,2,3],[1,3]] |
| 13 | 1 | - | [] | pop 1 | [[],[1],[1,2],[1,2,3],[1,3]] |
| 14 | 0 | 1 | [2] | push 2 | [[],[1],[1,2],[1,2,3],[1,3]] |
| ... | ... | ... | ... | ... | ... |

#### Tree Diagram for Subsets of [1,2,3]

```
                    []  ─── save
                   /  \
                [1]    [2] ─── save
               /  \      \
           [1,2] [1,3]  [2,3] ── save
             |     |       |
          [1,2,3]  |       |
            save    |       |
```

#### Call Stack Visualization

```
subsetBacktrack(index=0, current=[])
│  save []
├─ i=0: push(1)
│  └─ subsetBacktrack(index=1, current=[1])
│     │  save [1]
│     ├─ i=1: push(2)
│     │  └─ subsetBacktrack(index=2, current=[1,2])
│     │     │  save [1,2]
│     │     └─ i=2: push(3)
│     │        └─ subsetBacktrack(index=3, current=[1,2,3])
│     │           │  save [1,2,3]
│     │           └─ loop ends → return
│     │        ← pop(3)
│     ← pop(2)
│     └─ i=2: push(3)
│        └─ subsetBacktrack(index=3, current=[1,3])
│           │  save [1,3]
│           └─ loop ends → return
│        ← pop(3)
├─ i=1: push(2)
│  └─ subsetBacktrack(index=2, current=[2])
│     │  save [2]
│     └─ i=2: push(3)
│        └─ subsetBacktrack(index=3, current=[2,3])
│           │  save [2,3]
│           └─ loop ends → return
│        ← pop(3)
├─ i=2: push(3)
│  └─ subsetBacktrack(index=3, current=[3])
│     │  save [3]
│     └─ loop ends → return
│  ← pop(3)
```

#### Alternative: Iterative Bit-Mask Approach

```cpp
vector<vector<int>> subsetsBitMask(vector<int>& nums) {
    int n = nums.size(), total = 1 << n;
    vector<vector<int>> result;
    for (int mask = 0; mask < total; mask++) {
        vector<int> current;
        for (int i = 0; i < n; i++) {
            if (mask & (1 << i)) current.push_back(nums[i]);
        }
        result.push_back(current);
    }
    return result;
}
```

**What's happening:**
```
nums = [1,2,3], n=3, total=8

mask (binary) → subset:
000 → []       100 → [3]
001 → [1]      101 → [1,3]
010 → [2]      110 → [2,3]
011 → [1,2]    111 → [1,2,3]

Each bit position i corresponds to nums[i].
Bit = 1 → include nums[i]; Bit = 0 → skip it.
```

---

### 2. Combinations

**Definition:** Very similar to subsets (order does not matter), but you only want groupings of a **specific length** `K`.
For `[1, 2, 3]` and $K=2$, combinations are `[1, 2]`, `[1, 3]`, `[2, 3]`.

**The Trick:**
Exactly the same as Subsets (use `index` and pass `i + 1`), but we only save to the result if the `current` array's size equals `K`.

```cpp
void combinationBacktrack(vector<int>& nums, int k, int index, vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == k) {  // Base Case: Only save if length is K
        result.push_back(current);
        return;
    }

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        combinationBacktrack(nums, k, i + 1, current, result);
        current.pop_back();
    }
}
```

**What's happening:**
```
Combinations of [1, 2, 3] with K=2:

                    []
                   / | \
                [1] [2] [3]
               / \    |
          [1,2] [1,3] [2,3]
           ✓     ✓     ✓

Only save when current.size() == 2.
[1,2] → size 2 → SAVE
[1,3] → size 2 → SAVE
[2,3] → size 2 → SAVE

Compared to Subsets:
  [] → save (size 0)     ← NOT saved for Combinations
  [1] → save (size 1)    ← NOT saved for Combinations
  [1,2] → save (size 2)  ← SAVED ✓
```

**The Difference from Subsets:**
```
Subsets:                    Combinations (K=2):
result.push_back(current)  if (current.size() == k)
  at EVERY recursive call    result.push_back(current)

Saves all lengths:          Only saves length K:
[], [1], [1,2], [1,2,3],   [1,2], [1,3], [2,3]
[1,3], [2], [2,3], [3]
```

#### Tree Diagram for C(3,2) of [1,2,3]

```
                    [] ─── size 0, don't save
                   /  \
                [1]    [2] ─── size 1, don't save
               /  \      \
           [1,2] [1,3]  [2,3] ── size 2 = K ✓
            ✓      ✓      ✓

Branches pruned when size == K:
  [1,2] stops (no [1,2,3] explored)
  [1,3] stops, [2,3] stops
```

#### Dry-Run Table

| Step | index | i | current | size | action | result so far |
|------|-------|---|---------|------|--------|---------------|
| 1 | 0 | - | [] | 0 | size!=2, recurse | [] |
| 2 | 0 | 0 | [1] | 1 | push 1 | [] |
| 3 | 1 | - | [1] | 1 | size!=2, recurse | [] |
| 4 | 1 | 1 | [1,2] | 2 | push 2 | [] |
| 5 | 2 | - | [1,2] | 2 | size==2, SAVE | [[1,2]] |
| 6 | 2 | - | [1] | 1 | pop 2 | [[1,2]] |
| 7 | 1 | 2 | [1,3] | 2 | push 3 | [[1,2]] |
| 8 | 3 | - | [1,3] | 2 | size==2, SAVE | [[1,2],[1,3]] |
| 9 | 3 | - | [1] | 1 | pop 3 | [[1,2],[1,3]] |
| 10 | 1 | - | [] | 0 | pop 1 | [[1,2],[1,3]] |
| 11 | 0 | 1 | [2] | 1 | push 2 | [[1,2],[1,3]] |
| 12 | 2 | - | [2] | 1 | size!=2, recurse | [[1,2],[1,3]] |
| 13 | 2 | 2 | [2,3] | 2 | push 3 | [[1,2],[1,3]] |
| 14 | 3 | - | [2,3] | 2 | size==2, SAVE | [[1,2],[1,3],[2,3]] |
| 15 | 3 | - | [2] | 1 | pop 3 | [[1,2],[1,3],[2,3]] |
| 16 | 2 | - | [] | 0 | pop 2 | [[1,2],[1,3],[2,3]] |
| 17 | 0 | 2 | [3] | 1 | push 3 | [[1,2],[1,3],[2,3]] |
| 18 | 3 | - | [3] | 1 | loop ends | [[1,2],[1,3],[2,3]] |

#### Variation: Combinations with Target Sum

```cpp
void combinationSum(vector<int>& nums, int k, int target, int index,
                    vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == k) {
        if (target == 0) result.push_back(current);
        return;
    }
    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        combinationSum(nums, k, target - nums[i], i + 1, current, result);
        current.pop_back();
    }
}
```

**What's happening:**
```
Same as combinations but track remaining sum.
Only save when size == K AND target == 0.

nums=[2,3,6,7], k=2, target=7

  [] target=7
   ├─ [2] target=5 → [2,3] target=2 (no), [2,6] target=-1 (no), [2,7] target=-2 (no)
   ├─ [3] target=4 → [3,6] target=-2 (no), [3,7] target=-3 (no)
   ├─ [6] target=1 → [6,7] target=-6 (no)
   └─ [7] target=0 → need size 2, no pair sums to 0
```

#### Comparison: Subsets vs Combinations

```
SUBSETS                          COMBINATIONS (K=2)
─────────────────────────────    ─────────────────────────────
for (int i = index; ...) {      if (current.size() == k) {
                                   result.push_back(current);
result.push_back(current);         return;
                                   }
for (int i = index; ...) {
    // ... explore
}

Save: at EVERY call              Save: ONLY when size == K
Output: [],[1],[2],[3],...        Output: only [a,b] where len==K
2^N total results                C(N,K) total results
```

---

### 3. Permutations

**Definition:** All possible re-orderings of the elements. Order MATTERS! (`[1, 2]` is different from `[2, 1]`). You must use all $N$ elements.
For `[1, 2]`, permutations are `[1, 2]` and `[2, 1]`.

**The Trick:**
Because order matters, `[2, 1]` is valid. This means when we pick `2`, we ARE allowed to look backwards and pick `1` next. Therefore, we **do not use an `index` variable** in the `for` loop. The loop always starts at `0`.
However, we cannot pick the same element twice (e.g., `[2, 2]`). We must use a boolean `visited` array (or an `unordered_set`) to track which elements are currently inside our permutation.

```cpp
void permutationBacktrack(vector<int>& nums, vector<bool>& visited, vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {  // Base Case: We have used all N elements
        result.push_back(current);
        return;
    }

    for (int i = 0; i < nums.size(); i++) {  // Notice the loop always starts at 0!
        if (visited[i]) continue;  // Skip elements we are already using

        visited[i] = true;         // Choose
        current.push_back(nums[i]);
        permutationBacktrack(nums, visited, current, result);  // Explore (No index passed!)
        current.pop_back();        // Unchoose
        visited[i] = false;
    }
}
```

**What's happening:**
```
Permutations of [1, 2]:

                    []
                 /      \
              [1]        [2]          ← Both can start (loop at 0)
             /    \      /    \
        [1,2]  [1,?]  [2,1]  [2,?]
          ✓           ✓

From [], we can pick 1 or 2 (loop at i=0)
From [1], we can only pick 2 (visited[0]=true, skip 1)
From [2], we can only pick 1 (visited[1]=true, skip 2)

Key difference from Subsets:
  Subsets: loop starts at 'index' → [1] can only reach [1,2], [1,3]
  Permutations: loop starts at 0 → [2] can reach [2,1] (looks backwards)
```

**Dry-Run Table:**

```
nums = [1, 2], visited = [F, F]

Step 1: i=0, nums[0]=1, not visited
  → visited=[T,F], current=[1]

Step 2: i=0, nums[0]=1, visited → skip
Step 3: i=1, nums[1]=2, not visited
  → visited=[T,T], current=[1,2]
  → size==2, SAVE [1,2]
  → pop 2, visited=[T,F], current=[1]
  → pop 1, visited=[F,F], current=[]

Step 4: i=1, nums[1]=2, not visited
  → visited=[F,T], current=[2]

Step 5: i=0, nums[0]=1, not visited
  → visited=[T,T], current=[2,1]
  → size==2, SAVE [2,1]
  → pop 1, visited=[F,T], current=[2]
  → pop 2, visited=[F,F], current=[]

Result: [[1,2], [2,1]]
```

#### Tree Diagram for Permutations of [1,2,3]

```
                        [] ── visited=[F,F,F]
                     /  |  \
                  [1]  [2]  [3]       ← loop starts at 0
                 / \   / \   / \
             [1,2][1,3][2,1][2,3][3,1][3,2]
               |    |    |    |    |    |
            [1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
              ✓     ✓     ✓     ✓     ✓     ✓

Each branch explores ALL unused elements.
visited[] prevents re-picking within a path.
```

#### Call Stack Visualization

```
permute(visited=[F,F,F], current=[])
│  i=0: push(1), visited=[T,F,F]
│  └─ permute(visited=[T,F,F], current=[1])
│     │  i=0: skip (visited)
│     │  i=1: push(2), visited=[T,T,F]
│     │  └─ permute(visited=[T,T,F], current=[1,2])
│     │     │  i=0: skip, i=1: skip
│     │     │  i=2: push(3), visited=[T,T,T]
│     │     │  └─ permute(visited=[T,T,T], current=[1,2,3])
│     │     │     │  size==3 → SAVE [1,2,3]
│     │     │     ← return
│     │     ← pop(3), visited=[T,T,F]
│     ← pop(2), visited=[T,F,F]
│     │  i=2: push(3), visited=[T,F,T]
│     │  └─ permute(visited=[T,F,T], current=[1,3])
│     │     │  i=0: skip, i=1: push(2)
│     │     │  └─ permute(visited=[T,T,T], current=[1,3,2])
│     │     │     │  SAVE [1,3,2]
│     │     │     ← return
│     │     ← pop(2), visited=[T,F,T]
│     ← pop(3), visited=[F,F,F]
│
│  i=1: push(2), visited=[F,T,F]
│  ... → produces [2,1,3] and [2,3,1]
│
│  i=2: push(3), visited=[F,F,T]
│  ... → produces [3,1,2] and [3,2,1]
```

#### Alternative: Swap-Based Permutation (no visited array)

```cpp
void permuteSwap(vector<int>& nums, int start, vector<vector<int>>& result) {
    if (start == nums.size()) {
        result.push_back(nums);
        return;
    }
    for (int i = start; i < nums.size(); i++) {
        swap(nums[start], nums[i]);        // Choose: put i-th element at start
        permuteSwap(nums, start + 1, result);  // Explore: fix next position
        swap(nums[start], nums[i]);        // Unchoose: restore original order
    }
}
```

**What's happening:**
```
nums = [1,2,3]

permuteSwap(start=0):
  i=0: swap(0,0) → [1,2,3]
    permuteSwap(start=1):
      i=1: swap(1,1) → [1,2,3] → permuteSwap(start=2): SAVE [1,2,3]
      i=2: swap(1,2) → [1,3,2] → permuteSwap(start=2): SAVE [1,3,2]
  i=1: swap(0,1) → [2,1,3]
    permuteSwap(start=1):
      i=1: swap(1,1) → [2,1,3] → permuteSwap(start=2): SAVE [2,1,3]
      i=2: swap(1,2) → [2,3,1] → permuteSwap(start=2): SAVE [2,3,1]
  i=2: swap(0,2) → [3,2,1]
    permuteSwap(start=1):
      i=1: swap(1,1) → [3,2,1] → permuteSwap(start=2): SAVE [3,2,1]
      i=2: swap(1,2) → [3,1,2] → permuteSwap(start=2): SAVE [3,1,2]

Advantage: O(1) extra space (no visited array), in-place
Disadvantage: Modifies nums; must restore via swap-back
```

---

### 4. Subsets vs Combinations: Side by Side

```cpp
// SUBSETS - save at EVERY recursive call
void subsets(vector<int>& nums, int index, vector<int>& current,
             vector<vector<int>>& result) {
    result.push_back(current);  // ← Save unconditionally

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        subsets(nums, i + 1, current, result);
        current.pop_back();
    }
}

// COMBINATIONS - save ONLY when size == K
void combinations(vector<int>& nums, int k, int index, vector<int>& current,
                  vector<vector<int>>& result) {
    if (current.size() == k) {   // ← Conditional save
        result.push_back(current);
        return;                   // ← Early return (no more recursion needed)
    }

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        combinations(nums, k, i + 1, current, result);
        current.pop_back();
    }
}
```

**Key Differences:**
```
Subsets:
  result.push_back(current)     ← Before the loop
  No early return               ← Always try to go deeper

Combinations:
  if (current.size() == k)      ← Check condition first
    result.push_back(current)   ← Only save when size matches
    return                      ← Stop recursion (we have our K elements)
```

---

### 5. Permutations with Duplicate Elements

When input has duplicates, sort first and add the same pruning check:

```cpp
void permuteUnique(vector<int>& nums, vector<bool>& visited,
                    vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {
        result.push_back(current);
        return;
    }

    for (int i = 0; i < nums.size(); i++) {
        if (visited[i]) continue;

        // DUPLICATE PRUNING: Skip if same as previous at same depth
        if (i > 0 && nums[i] == nums[i-1] && !visited[i-1]) {
            continue;
        }

        visited[i] = true;
        current.push_back(nums[i]);
        permuteUnique(nums, visited, current, result);
        current.pop_back();
        visited[i] = false;
    }
}
```

**What's happening:**
```
nums = [1, 1, 2] (sorted)

Without pruning:
  [1,1,2] ← duplicate of choosing first 1 then second 1
  [1,2,1] ← duplicate of choosing second 1 then first 1
  [2,1,1]

With pruning:
  [1,1,2] ← only generated once
  [1,2,1] ← only generated once
  [2,1,1] ← only generated once

The check: if (i > 0 && nums[i] == nums[i-1] && !visited[i-1])
  "If current is same as previous, and previous was NOT just used,
   skip this to avoid duplicate at same recursion depth"
```

---

### 6. Summary Rule of Thumb
- **Does order matter? (Permutations):** Loop starts at `0`. Use a `visited` array.
- **Does order NOT matter? (Subsets/Combinations):** Pass an `index`. Loop starts at `index`. Recursive call passes `i + 1`.
- **Want all lengths? (Subsets):** Save at every recursive call.
- **Want fixed length? (Combinations):** Save only when `current.size() == k`.
- **Have duplicates? (Any):** Sort first, add `i > index && nums[i] == nums[i-1]` or `i > 0 && nums[i] == nums[i-1] && !visited[i-1]` check.

---

### Master Comparison Table

| Feature | Subsets | Combinations | Permutations |
|---------|---------|--------------|--------------|
| **Type** | Power set | Fixed-size subsets | All orderings |
| **Order matters?** | No | No | Yes |
| **Uses index param?** | Yes | Yes | No |
| **Uses visited[]?** | No | No | Yes |
| **Loop start** | `index` | `index` | `0` |
| **Recurse with** | `i + 1` | `i + 1` | (no index) |
| **Save condition** | Every call | `size == K` | `size == N` |
| **Time complexity** | O(N * 2^N) | O(K * C(N,K)) | O(N * N!) |
| **Output count** | 2^N | C(N,K) | N! |

---

### When to Use Which - Decision Guide

```
Start here
    │
    ├─ Does order matter?
    │   ├─ YES → Permutations (loop at 0, use visited[])
    │   └─ NO  → Do you need ALL lengths?
    │             ├─ YES → Subsets (save at every call)
    │             └─ NO  → Combinations (save when size == K)
    │
    ├─ Are there duplicates?
    │   └─ YES → Sort first, add duplicate pruning
    │
    └─ Need sum/target?
        └─ YES → Add target parameter, subtract as you go
```

---

### LeetCode Problem Mapping

| LeetCode Problem | Type | Template | Key Difference |
|------------------|------|----------|----------------|
| 78. Subsets | Subsets | Standard subsets | Base template |
| 46. Permutations | Permutations | Standard permutations | Base template |
| 77. Combinations | Combinations | Standard combinations | Base template |
| 90. Subsets II | Subsets | Subsets + sort + prune | Skip `i > index && nums[i]==nums[i-1]` |
| 47. Permutations II | Permutations | Permutations + sort + prune | Skip `i > 0 && nums[i]==nums[i-1] && !visited[i-1]` |
| 39. Combination Sum | Combinations | + target param | Can reuse same element (`i` not `i+1`) |
| 40. Combination Sum II | Combinations | + target + sort + prune | No reuse + duplicates |
| 131. Palindrome Partitioning | Combinations | + palindrome check | Different branching |
| 17. Letter Combinations | Combinations | Iterative build | Map-based branching |

---

### Common Variations

**Combination Sum (reuse allowed):**
```cpp
void combinationSum(vector<int>& nums, int target, int index,
                    vector<int>& current, vector<vector<int>>& result) {
    if (target < 0) return;  // overshot (needed: reuse would otherwise recurse forever)
    if (target == 0) { result.push_back(current); return; }
    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        combinationSum(nums, target - nums[i], i, current, result); // i, not i+1!
        current.pop_back();
    }
}
```
Key: recurse with `i` (allow reuse) instead of `i+1`.

**Combination Sum II (no reuse, with duplicates):**
```cpp
void combinationSum2(vector<int>& nums, int target, int index,
                     vector<int>& current, vector<vector<int>>& result) {
    if (target == 0) { result.push_back(current); return; }
    for (int i = index; i < nums.size(); i++) {
        if (i > index && nums[i] == nums[i-1]) continue; // skip dupes
        current.push_back(nums[i]);
        combinationSum2(nums, target - nums[i], i + 1, current, result);
        current.pop_back();
    }
}
```
Key: recurse with `i+1` (no reuse) + sort + skip duplicate check.

**Permutations II (duplicates):** See Section 5 above.

---

### Quick Reference Table

| Problem Type | Key Template Difference | Code Signature |
|--------------|------------------------|----------------|
| Subsets | `result.push_back(current)` before loop | `bt(index, current)` |
| Subsets II | Sort + `if (i > index && nums[i]==nums[i-1]) continue` | Same + sort before call |
| Combinations | `if (current.size() == k) { save; return; }` | `bt(k, index, current)` |
| Combination Sum | Target param, recurse with `i` | `bt(target, index, current)` |
| Combination Sum II | Target + sort + dupe prune, recurse `i+1` | `bt(target, index, current)` |
| Permutations | Loop at 0, use `visited[]` | `bt(visited, current)` |
| Permutations II | Sort + `if (i>0 && nums[i]==nums[i-1] && !visited[i-1]) continue` | Same + sort before call |
| Subsets (bit-mask) | Loop mask 0 to 2^N | `subsetsBitMask(nums)` |
| Permutations (swap) | Swap at `start`, recurse `start+1` | `bt(start)` |

**Signature Cheat Sheet:**
```
Subsets:       void bt(int index, vector<int>& current)
Combinations:  void bt(int k, int index, vector<int>& current)
Comb Sum:      void bt(int target, int index, vector<int>& current)
Permutations:  void bt(vector<bool>& visited, vector<int>& current)
Swap Perm:     void bt(int start)
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Subsets vs Permutations vs Combinations**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 combinations permutations subsets** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

