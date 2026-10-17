# Part 2, Topic 2: Prefix Sum
## Chapter 2: The Hash Map + Prefix Trick

While the standard Prefix Sum array is great for answering specific range queries, interviewers love a much harder variation of this problem:

**"Given an array, find the *number of contiguous subarrays* that sum up to exactly $K$."**

---

## Approach Comparison

| Approach | Time | Space | Handles Negatives? | Handles Zeros? |
|----------|------|-------|-------------------|----------------|
| Brute Force (nested loops) | O(N²) | O(1) | Yes | Yes |
| Prefix Sum Array + Binary Search | O(N log N) | O(N) | Yes | Yes |
| Hash Map + Prefix Sum | O(N) | O(N) | Yes | Yes |
| Sliding Window | O(N) | O(1) | **No** | Yes |

**Key Insight:** Sliding Window ONLY works for positive numbers. Hash Map + Prefix works for ALL cases including negatives.

---

### 1. The Naive Approach
A brute force solution would use two nested loops to check every single possible subarray.
```cpp
int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    for (int i = 0; i < nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < nums.size(); j++) {
            sum += nums[j];
            if (sum == k) count++;
        }
    }
    return count;
}
```

#### What's Happening
```
Example: nums = [1, 1, 1], k = 2

All subarrays:
[1]      sum=1, no
[1,1]    sum=2, YES ✓
[1,1,1]  sum=3, no
   [1]   sum=1, no
   [1,1] sum=2, YES ✓
      [1] sum=1, no

Count = 2
Time: O(N²) - checking every pair
```

#### ASCII Diagram: Brute Force Subarrays
```
nums: [ 1,  1,  1 ]

Starting at i=0:
  j=0: [1]      sum=1
  j=1: [1,1]    sum=2 ✓
  j=2: [1,1,1]  sum=3

Starting at i=1:
  j=1: [1]      sum=1
  j=2: [1,1]    sum=2 ✓

Starting at i=2:
  j=2: [1]      sum=1

Total: 2 subarrays with sum=2
```

This is $O(N^2)$ time. It will fail hard interviews. We need an $O(N)$ solution.

---

### 2. The Intuition (The Mathematical Trick)

Let's remember our core Prefix Sum formula from Chapter 1:
The sum of a subarray ending at index `i` and starting after index `j` is:
`SubarraySum = Prefix[i] - Prefix[j]`

We want to find subarrays where the sum equals exactly $K$. Therefore:
**$K = Prefix[i] - Prefix[j]$**

If we rearrange this mathematical equation using basic algebra, we get:
**$Prefix[j] = Prefix[i] - K$**

**The "Aha!" Moment:**
As we iterate through the array, calculating the running `Prefix[i]` at each step, we don't need to look forward. We just need to look *backward* and ask:
*"Have I ever seen a prefix sum equal to `Prefix[i] - K` earlier in this array?"*

If the answer is yes, then a valid subarray ending at `i` MUST exist!

#### ASCII Diagram: The Equation
```
Subarray sum from (j+1) to i:
  sum(nums[j+1..i]) = prefix[i] - prefix[j]

We want: sum(nums[j+1..i]) = K
Therefore: K = prefix[i] - prefix[j]

Rearrange: prefix[j] = prefix[i] - K

As we iterate (computing prefix[i]):
  → Check if (prefix[i] - K) exists in our hash map
  → If YES: we found valid subarray(s)!
```

#### ASCII Diagram: Visual Proof
```
nums:    [ a,  b,  c,  d,  e ]
index:     0   1   2   3   4

prefix: [ 0,  a, a+b, a+b+c, a+b+c+d, a+b+c+d+e ]
          ↑   ↑    ↑      ↑       ↑        ↑
         P0  P1   P2     P3      P4       P5

Subarray [b, c, d] (index 1 to 3):
  sum = P4 - P1 = (a+b+c+d) - a = b+c+d ✓

If b+c+d = K, then P1 = P4 - K
```

---

### 3. Implementing with a Hash Map

To instantly know if we have seen a specific prefix sum before, we use an `unordered_map`.

- **Key:** The Prefix Sum we have seen.
- **Value:** The number of times we have seen it.

#### Code: Hash Map Solution
```cpp
int subarraySumOptimal(vector<int>& nums, int k) {
    int count = 0;
    int currentPrefixSum = 0;
    
    unordered_map<int, int> prefixCounts;
    prefixCounts[0] = 1;  // CRITICAL: empty prefix
    
    for (int i = 0; i < nums.size(); i++) {
        currentPrefixSum += nums[i];
        
        int target = currentPrefixSum - k;
        if (prefixCounts.count(target)) {
            count += prefixCounts[target];
        }
        
        prefixCounts[currentPrefixSum]++;
    }
    
    return count;
}
// Time: O(N), Space: O(N)
```

#### What's Happening
```
Example: nums = [1, -1, 1, 1, 1], k = 2

The key: prefixCounts[0] = 1 handles subarrays starting at index 0

i=0: prefixSum=1, target=1-2=-1 (not found), map={0:1, 1:1}
i=1: prefixSum=0, target=0-2=-2 (not found), map={0:2, 1:1}
i=2: prefixSum=1, target=1-2=-1 (not found), map={0:2, 1:2}
i=3: prefixSum=2, target=2-2=0 (FOUND freq=2), count+=2, map={0:2, 1:2, 2:1}
i=4: prefixSum=3, target=3-2=1 (FOUND freq=2), count+=2, map={0:2, 1:2, 2:1, 3:1}

Total count = 4
```

#### Why prefixCounts[0] = 1 is Critical
```
nums = [3], k = 3

Without prefixCounts[0] = 1:
  prefixSum = 3, target = 3-3 = 0
  map = {} → not found → count = 0 (WRONG!)

With prefixCounts[0] = 1:
  prefixSum = 3, target = 3-3 = 0
  map = {0:1} → FOUND → count = 1 (CORRECT!)

prefix[0] = 0 represents "sum before any elements"
```

---

### 4. Trace the Execution
`nums = [1, -1, 1, 1, 1]`, `k = 2`
`map = {0: 1}`

#### ASCII Diagram: Step-by-Step
```
Step 1: i=0, val=1
  prefixSum: 0+1=1
  target: 1-2=-1
  map: {0:1} → -1 not found
  map after: {0:1, 1:1}

Step 2: i=1, val=-1
  prefixSum: 1+(-1)=0
  target: 0-2=-2
  map: {0:1, 1:1} → -2 not found
  map after: {0:2, 1:1}

Step 3: i=2, val=1
  prefixSum: 0+1=1
  target: 1-2=-1
  map: {0:2, 1:1} → -1 not found
  map after: {0:2, 1:2}

Step 4: i=3, val=1
  prefixSum: 1+1=2
  target: 2-2=0
  map: {0:2, 1:2} → 0 FOUND (freq=2) → count+=2
  map after: {0:2, 1:2, 2:1}

Step 5: i=4, val=1
  prefixSum: 2+1=3
  target: 3-2=1
  map: {0:2, 1:2, 2:1} → 1 FOUND (freq=2) → count+=2
  map after: {0:2, 1:2, 2:1, 3:1}

Final count: 4
```

#### Dry-Run Table
| i | val | prefixSum | target (prefixSum-k) | map before | found? | count | map after |
|---|-----|-----------|---------------------|------------|--------|-------|-----------|
| 0 | 1 | 1 | -1 | {0:1} | no | 0 | {0:1, 1:1} |
| 1 | -1 | 0 | -2 | {0:1, 1:1} | no | 0 | {0:2, 1:1} |
| 2 | 1 | 1 | -1 | {0:2, 1:1} | no | 0 | {0:2, 1:2} |
| 3 | 1 | 2 | 0 | {0:2, 1:2} | YES (2) | 2 | {0:2, 1:2, 2:1} |
| 4 | 1 | 3 | 1 | {0:2, 1:2, 2:1} | YES (2) | 4 | {0:2, 1:2, 2:1, 3:1} |

#### Subarrays Found
```
i=3: prefixSum=2, target=0 found twice
  → Subarray [1, -1, 1, 1] (index 0-3, sum=2)
  → Subarray [-1, 1, 1] (index 1-3, sum=1)... wait, let's verify

Actually:
  prefixSum at i=3 is 2
  target=0 means prefixSum before was 0
  First 0: prefix[0]=0 (before any elements) → subarray [1,-1,1,1]
  Second 0: prefix[2]=0 (after first two elements) → subarray [1,1]

i=4: prefixSum=3, target=1 found twice
  prefixSum 1 occurred at i=0 and i=2
  → Subarray [-1, 1, 1, 1] (index 1-4)
  → Subarray [1, 1] (index 3-4)

Total: 4 subarrays ✓
```

---

### 5. Edge Cases and Common Mistakes

#### Error Scenario: Forgetting prefixCounts[0] = 1
```cpp
// WRONG: Missing initialization
unordered_map<int, int> prefixCounts;
// prefixCounts[0] = 1;  ← MISSING!

for (int i = 0; i < nums.size(); i++) {
    currentPrefixSum += nums[i];
    int target = currentPrefixSum - k;
    if (prefixCounts.count(target)) {
        count += prefixCounts[target];
    }
    prefixCounts[currentPrefixSum]++;
}
// BUG: Misses subarrays that start at index 0!
```

#### Error Scenario: Using Count Instead of Frequency
```cpp
// WRONG: Using count (0 or 1) instead of frequency
if (prefixCounts.count(target)) {
    count++;  // BUG: Should be count += prefixCounts[target]
}
// If prefixSum 5 appeared 3 times, we miss 2 subarrays!
```

#### Code: Edge Case - All Zeros
```cpp
// nums = [0, 0, 0], k = 0
// Subarrays with sum 0:
// [0] (3 times), [0,0] (2 times), [0,0,0] (1 time)
// Total: 6 subarrays

int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    int prefixSum = 0;
    unordered_map<int, int> prefixCounts;
    prefixCounts[0] = 1;
    
    for (int num : nums) {
        prefixSum += num;
        int target = prefixSum - k;
        if (prefixCounts.count(target)) {
            count += prefixCounts[target];
        }
        prefixCounts[prefixSum]++;
    }
    return count;
}
// Returns 6 for [0,0,0], k=0 ✓
```

#### Code: Edge Case - Single Element
```cpp
// nums = [5], k = 5 → returns 1
// nums = [5], k = 3 → returns 0
// Handled automatically by the algorithm
```

---

### 6. Why Sliding Window Fails Here

#### Code: Sliding Window (Wrong for Negatives)
```cpp
// WRONG: Does not work with negative numbers!
int subarraySumSlidingWindow(vector<int>& nums, int k) {
    int count = 0;
    int left = 0;
    int currentSum = 0;
    
    for (int right = 0; right < nums.size(); right++) {
        currentSum += nums[right];
        
        while (currentSum > k && left <= right) {
            currentSum -= nums[left];
            left++;
        }
        
        if (currentSum == k) count++;
    }
    return count;
}
```

#### Why It Fails
```
nums = [1, -1, 1, 1, 1], k = 2

Sliding Window approach:
  right=0: sum=1, <k
  right=1: sum=0, <k
  right=2: sum=1, <k
  right=3: sum=2, ==k → count=1
  right=4: sum=3, >k → move left
  
But the algorithm misses subarrays because:
  - Negative numbers make the window "shrink" unpredictably
  - sum > k doesn't mean we should shrink (negative coming next!)
  
Hash Map + Prefix handles ALL cases correctly
```

#### Comparison Table: When to Use What
| Scenario | Algorithm | Why |
|----------|-----------|-----|
| All positive numbers, find count | Sliding Window | O(N) time, O(1) space |
| Has negative numbers, find count | Hash Map + Prefix | Only correct option |
| Has negative numbers, find max sum | Kadane's | Not a counting problem |
| All positive, find subarray sum = K | Either works | Hash Map slightly simpler |

---

### Summary
- **Trigger:** "Find the number of continuous subarrays that sum to K" (especially if the array contains negative numbers, which breaks the Sliding Window technique).
- **Logic:** Maintain a running prefix sum and use a Hash Map to store its frequencies. At every step, check if `(currentSum - k)` exists in the map.
- **Complexity:** $O(N)$ Time, $O(N)$ Space.

---

## Quick Reference Table

| Concept | Code/Formula | Notes |
|---------|-------------|-------|
| Running prefix sum | `prefixSum += nums[i]` | Single variable, not array |
| Target lookup | `target = prefixSum - k` | Check hash map |
| Map initialization | `prefixCounts[0] = 1` | Critical for index 0 |
| Count update | `count += prefixCounts[target]` | Add frequency, not 1 |
| Map update | `prefixCounts[prefixSum]++` | After checking target |

---

## Pattern Recognition

```
Hash Map + Prefix Sum Pattern:
When: Count subarrays with specific sum (especially with negatives)

Template:
  int count = 0, prefixSum = 0;
  unordered_map<int, int> seen;
  seen[0] = 1;  // Don't forget!
  
  for (int num : nums) {
      prefixSum += num;
      int target = prefixSum - k;
      if (seen.count(target)) {
          count += seen[target];
      }
      seen[prefixSum]++;
  }
  return count;

Variations:
- Find number of subarrays with sum = K (this problem)
- Find longest subarray with sum = K (use map of prefixSum → first index)
- Find subarray with sum divisible by K (use prefixSum % K)
```

---

## Related Problems

| Problem | Variation | Key Change |
|---------|-----------|------------|
| Subarray Sum Equals K | This problem | Direct application |
| Continuous Subarray Sum | Sum divisible by K | Use `prefixSum % K` |
| Range Sum Query 2D | 2D prefix sum | Build 2D prefix array |
| Maximum Size Subarray Sum ≤ K | Sliding window | Positive numbers only |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Trace `subarraySumOptimal` on `nums = [2, -2, 2, -2]`, `k = 0`. Fill in the dry-run table (same columns as Section 4) and list every subarray that was counted.

| i | val | prefixSum | target | map before | found? | count | map after |
|---|-----|-----------|--------|------------|--------|-------|-----------|
| 0 | 2 | ? | ? | {0:1} | ? | ? | ? |
| 1 | -2 | ? | ? | ? | ? | ? | ? |
| 2 | 2 | ? | ? | ? | ? | ? | ? |
| 3 | -2 | ? | ? | ? | ? | ? | ? |

**Q2.** Someone forgets `prefixCounts[0] = 1`. On `nums = [1, 2, 3]`, `k = 3`, what does the buggy code return, what is the correct answer, and which subarray is missed?

**Q3.** Someone writes `count++` instead of `count += prefixCounts[target]` ("Using Count Instead of Frequency"). What does the buggy version return on the chapter's all-zeros example `[0, 0, 0]`, `k = 0`?

**Q4.** Actually run the chapter's `subarraySumSlidingWindow` on `nums = [1, -1, 1, 1, 1]`, `k = 2`. What number does it return (versus the correct `4`)? Show `left`, `currentSum` and `count` after each `right`.

**Q5.** The Quick Reference says the map update happens *after* checking the target. Suppose you swap the order (increment `prefixCounts[currentPrefixSum]` first, then look up `target`). What does that version return for `nums = [1, 2]`, `k = 0`, and why?

### Coding Exercises

**E1 (Easy).** Zero-sum subarray exists? Return `true` if some non-empty contiguous subarray sums to `0`. Use a hash *set* of prefix sums.
```cpp
bool hasZeroSumSubarray(const vector<int>& nums);
```
- `[4, 2, -3, 1, 6]` → `true` (`[2, -3, 1]`)
- `[1, 2, 3]` → `false`

**E2 (Easy–Medium).** Longest subarray with sum $K$ (the "Variations" note). Return the length of the longest contiguous subarray summing to `k`, or `0` if none. Store each prefix sum's **first** index.
```cpp
int longestSubarraySumK(const vector<int>& nums, int k);
```
- `nums = [1, -1, 5, -2, 3]`, `k = 3` → `4` (`[1, -1, 5, -2]`)
- `nums = [-2, -1, 2, 1]`, `k = 1` → `2` (`[-1, 2]`)

**E3 (Medium).** Subarray sums divisible by $K$. Count the non-empty subarrays whose sum is divisible by `k` ($k \ge 2$). Values may be negative.
```cpp
int subarraysDivByK(const vector<int>& nums, int k);
```
- `nums = [4, 5, 0, -2, -3, 1]`, `k = 5` → `7`
- `nums = [5]`, `k = 9` → `0`

#### Dry-Run: Answers

**Q1.** `count = 4`.

| i | val | prefixSum | target | map before | found? | count | map after |
|---|-----|-----------|--------|------------|--------|-------|-----------|
| 0 | 2 | 2 | 2 | {0:1} | no | 0 | {0:1, 2:1} |
| 1 | -2 | 0 | 0 | {0:1, 2:1} | YES (1) | 1 | {0:2, 2:1} |
| 2 | 2 | 2 | 2 | {0:2, 2:1} | YES (1) | 2 | {0:2, 2:2} |
| 3 | -2 | 0 | 0 | {0:2, 2:2} | YES (2) | 4 | {0:3, 2:2} |

Counted subarrays: `[2, -2]` (0–1), `[-2, 2]` (1–2), `[2, -2]` (2–3), `[2, -2, 2, -2]` (0–3).

**Q2.** Buggy returns `1`; correct is `2`. Trace without the seed: `prefixSum = 1` (target `-2`, no), `prefixSum = 3` (target `0`, **not in map**), `prefixSum = 6` (target `3`, found once). It finds `[3]` but misses `[1, 2]`, the subarray starting at index 0, exactly the bug the chapter warns about.

**Q3.** Returns `3` instead of `6`. Every prefix sum is `0`, so the target `0` is found at each of the 3 steps, but `count++` adds only 1 each time; the real frequencies are 1, 2, 3, summing to $1 + 2 + 3 = 6$.

**Q4.** Returns `2`.

| right | nums[right] | currentSum after add | shrink? | left | currentSum | count |
|-------|-------------|----------------------|---------|------|------------|-------|
| 0 | 1 | 1 | no | 0 | 1 | 0 |
| 1 | -1 | 0 | no | 0 | 0 | 0 |
| 2 | 1 | 1 | no | 0 | 1 | 0 |
| 3 | 1 | 2 | no | 0 | 2 | 1 |
| 4 | 1 | 3 | drop nums[0] | 1 | 2 | 2 |

It finds `[1,-1,1,1]` and `[-1,1,1,1]` but never sees `[1, 1]` at 2–3 or 3–4, because the negative `-1` breaks the "shrinking always lowers the sum" assumption.

**Q5.** Returns `2` (correct is `0`). With the increment first, at each step the map already contains the current `prefixSum`, and since `k = 0` the target *is* `prefixSum`, so each element "matches itself": that corresponds to the empty subarray. Checking first guarantees the matched prefix ends strictly before index `i`, so the subarray is non-empty.

**E1 — reference solution**
```cpp
bool hasZeroSumSubarray(const vector<int>& nums) {
    unordered_set<long long> seen = {0};   // empty prefix
    long long prefixSum = 0;
    for (int x : nums) {
        prefixSum += x;
        if (seen.count(prefixSum)) return true;   // same prefix twice => sum 0 between
        seen.insert(prefixSum);
    }
    return false;
}
```
On `[4, 2, -3, 1, 6]` the prefix sums are `4, 6, 3, 4`; `4` repeats, so `nums[1..3]` sums to 0. This is the $k = 0$ case of the chapter's equation $\text{Prefix}[j] = \text{Prefix}[i] - K$. Time $O(N)$, space $O(N)$.

**E2 — reference solution**
```cpp
int longestSubarraySumK(const vector<int>& nums, int k) {
    unordered_map<int, int> firstIndex;
    firstIndex[0] = -1;                    // empty prefix "ends" at index -1
    int prefixSum = 0, best = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        prefixSum += nums[i];
        auto it = firstIndex.find(prefixSum - k);
        if (it != firstIndex.end()) best = max(best, i - it->second);
        if (!firstIndex.count(prefixSum)) firstIndex[prefixSum] = i;   // keep earliest
    }
    return best;
}
```
Trace for the first example: prefix sums `1, 0, 5, 3, 6`; at `i = 3` the target `0` was first seen at index `-1`, length $3 - (-1) = 4$. Storing only the *first* index maximises the length. Time $O(N)$, space $O(N)$.

**E3 — reference solution**
```cpp
int subarraysDivByK(const vector<int>& nums, int k) {
    unordered_map<int, int> remCount;
    remCount[0] = 1;                                  // empty prefix
    int prefixSum = 0, count = 0;
    for (int x : nums) {
        prefixSum += x;
        int rem = ((prefixSum % k) + k) % k;          // normalise negatives
        count += remCount[rem];                       // same remainder => divisible gap
        remCount[rem]++;
    }
    return count;
}
```
Two prefixes with the same remainder mod $k$ differ by a multiple of $k$. For the example the remainders are `4, 4, 4, 2, 4, 0`; the counts added are `0, 1, 2, 0, 3, 1`, total `7`. In C++ `-7 % 5 == -2`, so the `+ k` fix is required. Time $O(N)$, space $O(\min(N, k))$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: The Hash Map + Prefix Trick**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 subarray sums** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

