# Part 12, Topic 1: 1D Dynamic Programming
## Interview Problems Walkthrough

These problems require a 1-dimensional array `dp[i]` to track the state.

---

## Problem Classification Table

| # | Problem | Pattern | Key Insight | Difficulty |
|---|---|---|---|---|
| 1 | Climbing Stairs | Fibonacci-like | dp[i] = dp[i-1] + dp[i-2] | Easy |
| 2 | House Robber | Linear DP | Skip or take adjacent | Medium |
| 3 | House Robber II | Circular DP | Split into two linear problems | Medium |
| 4 | Coin Change | Unbounded Knapsack | Min coins for each amount | Medium |
| 5 | Word Break | String DP | Check all prefix matches | Medium |
| 6 | LIS | Subsequence DP | Look back at all previous | Medium |
| 7 | Partition Equal Subset Sum | 0/1 Knapsack | Subset sum to target | Medium |

---

## Solution Approach Comparison

| Approach | Time | Space | When to Use |
|---|---|---|---|
| Brute Force Recursion | O(2^N) | O(N) stack | Never in interviews |
| Top-Down Memoization | O(N) | O(N) | Start here (easiest) |
| Bottom-Up Tabulation | O(N) | O(N) | Standard solution |
| Space-Optimized | O(N) | O(1) | When asked for optimization |

---

### 1. Climbing Stairs (Easy)

**Trigger:** Find the distinct ways to reach the top, taking 1 or 2 steps.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i]` is the total number of unique ways to reach step `i`.

**Step 2 — Base Cases:**
`dp[0] = 1` (1 way to be at the ground — don't move)
`dp[1] = 1` (1 way to reach step 1 — take 1 step)

**Step 3 — Transition:**
`dp[i] = dp[i-1] + dp[i-2]`
(You either arrived from the step right below, or two steps below).

**Step 4 — Final Answer:**
`dp[n]`

**Dry-Run Table for n=5:**

| i | dp[i-2] | dp[i-1] | dp[i] = dp[i-1] + dp[i-2] | Explanation |
|---|---|---|---|---|
| 0 | — | — | 1 | Base case |
| 1 | — | — | 1 | Base case |
| 2 | 1 | 1 | 2 | From step 0 or step 1 |
| 3 | 1 | 2 | 3 | From step 1 or step 2 |
| 4 | 2 | 3 | 5 | From step 2 or step 3 |
| 5 | 3 | 5 | 8 | From step 3 or step 4 |

**Code (3 variations):**

```cpp
// Variation 1: Top-Down Memoization
int climbStairs(int n, vector<int>& memo) {
    if (n <= 1) return 1;
    if (memo[n] != -1) return memo[n];
    memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
    return memo[n];
}
```

**What's happening:**
```cpp
int climbStairs(int n, vector<int>& memo) {
    if (n <= 1) return 1;           // Base case: 0 or 1 step → 1 way
    if (memo[n] != -1) return memo[n];  // Cache hit → return immediately
    memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
    //  ^^^^       ^^^^^^^^^^^^^^^^^          ^^^^^^^^^^^^^^^^^
    //  |          |                          └── Ways from 2 steps back
    //  |          └── Ways from 1 step back
    //  └── Cache before returning
    return memo[n];
}
```

```cpp
// Variation 2: Bottom-Up Tabulation
int climbStairs(int n) {
    if (n <= 1) return 1;
    vector<int> dp(n + 1);
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}
```

```cpp
// Variation 3: Space-Optimized (Best for interviews)
int climbStairs(int n) {
    if (n <= 1) return 1;
    int prev2 = 1, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}
// Time: O(N), Space: O(1)
```

---

### 2. House Robber (Medium)

**Trigger:** Maximize stolen money. You cannot rob adjacent houses.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i]` is the maximum money you can rob up to house `i`.

**Step 2 — Base Cases:**
`dp[0] = nums[0]` (only one house)
`dp[1] = max(nums[0], nums[1])` (choose the richer house)

**Step 3 — Transition:**
At house `i`, you have a choice. 
1. Rob it: You get `nums[i]` PLUS whatever you robbed up to house `i-2`.
2. Skip it: You get whatever you robbed up to house `i-1`.
`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`

**Step 4 — Final Answer:**
`dp[n-1]`

**Dry-Run Table for nums = [2, 7, 9, 3, 1]:**

| i | nums[i] | dp[i-2] | dp[i-1] | Skip: dp[i-1] | Take: dp[i-2]+nums[i] | dp[i] = max |
|---|---|---|---|---|---|---|
| 0 | 2 | — | — | — | — | 2 |
| 1 | 7 | — | 2 | 2 | 7 | 7 |
| 2 | 9 | 2 | 7 | 7 | 2+9=11 | 11 |
| 3 | 3 | 7 | 11 | 11 | 7+3=10 | 11 |
| 4 | 1 | 11 | 11 | 11 | 11+1=12 | 12 |

**Optimization:** $O(1)$ space using `rob1` and `rob2` variables.

```cpp
int rob(vector<int>& nums) {
    int rob1 = 0, rob2 = 0;
    
    // [rob1, rob2, n, n+1, ...]
    for (int n : nums) {
        int temp = max(n + rob1, rob2);
        rob1 = rob2;
        rob2 = temp;
    }
    return rob2;
}
```

**What's happening:**
```cpp
int rob(vector<int>& nums) {
    int rob1 = 0, rob2 = 0;
    // rob1 = dp[i-2] (money if we skip current house)
    // rob2 = dp[i-1] (money up to previous house)
    
    for (int n : nums) {
        int temp = max(n + rob1, rob2);
        //  ^^^^     ^^^^ ^^^^    ^^^^
        //  |        |    |       └── Option 2: Skip current house
        //  |        |    └── Option 1: Take current + skip previous
        //  |        └── Current house value
        //  └── Temporary variable to avoid overwriting
        
        rob1 = rob2;    // Slide window forward
        rob2 = temp;    // Update to include current decision
    }
    return rob2;  // rob2 holds the final answer
}
```

---

### 3. House Robber II (Medium)

**Trigger:** The houses are arranged in a **circle**. (The first and last houses are adjacent).

**Step-by-Step Walkthrough:**

**Intuition:** 
Because house 0 and house N-1 are adjacent, you cannot rob both. 
The solution is brilliant: Run the standard House Robber function twice!
1. Run it on houses `0` to `N-2` (Skipping the last house).
2. Run it on houses `1` to `N-1` (Skipping the first house).
Return the maximum of the two results!

**Visual:**
```
Circle:   [0] -- [1] -- [2] -- [3] -- [4]
           |___________________________|
           
Linear 1: [0] -- [1] -- [2] -- [3]       (skip last)
Linear 2:      [1] -- [2] -- [3] -- [4]   (skip first)
```

**Dry-Run for nums = [2, 3, 2]:**
```
Linear 1 (skip last):  [2, 3] → rob house 1 → max = 3
Linear 2 (skip first): [3, 2] → rob house 0 → max = 3
Answer: max(3, 3) = 3
```

```cpp
int rob(vector<int>& nums) {
    if (nums.size() == 1) return nums[0];
    return max(robRange(nums, 0, nums.size() - 2),
               robRange(nums, 1, nums.size() - 1));
}

int robRange(vector<int>& nums, int start, int end) {
    int rob1 = 0, rob2 = 0;
    for (int i = start; i <= end; i++) {
        int temp = max(nums[i] + rob1, rob2);
        rob1 = rob2;
        rob2 = temp;
    }
    return rob2;
}
```

---

### 4. Coin Change (Medium)

**Trigger:** Given an array of coin denominations, return the *fewest* number of coins needed to make up a specific `amount`.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i]` is the minimum number of coins needed to make amount `i`.

**Step 2 — Base Cases:**
`dp[0] = 0` (0 coins needed to make amount 0)
All other states initialized to `amount + 1` representing Infinity.

**Step 3 — Transition:**
For every amount `i`, try every `coin` in the array. 
`dp[i] = min(dp[i], 1 + dp[i - coin])` (Assuming `i - coin >= 0`).

**Step 4 — Final Answer:**
`dp[amount]` if it's not still Infinity, otherwise `-1`.

**Dry-Run Table for coins = [1, 2, 5], amount = 5:**

| i | coin=1 | coin=2 | coin=5 | dp[i] |
|---|---|---|---|---|
| 0 | — | — | — | 0 |
| 1 | 1+dp[0]=1 | — | — | 1 |
| 2 | 1+dp[1]=2 | 1+dp[0]=1 | — | 1 |
| 3 | 1+dp[2]=2 | 1+dp[1]=2 | — | 2 |
| 4 | 1+dp[3]=3 | 1+dp[2]=2 | — | 2 |
| 5 | 1+dp[4]=3 | 1+dp[3]=3 | 1+dp[0]=1 | 1 |

**What's happening:**
- For amount 5, we check: can we use coin 1? dp[4]+1=3. Coin 2? dp[3]+1=3. Coin 5? dp[0]+1=1.
- The minimum is 1 (using one 5-coin).

```cpp
int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1); // Fill with "Infinity"
    dp[0] = 0;
    
    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (i - coin >= 0) {
                dp[i] = min(dp[i], 1 + dp[i - coin]);
            }
        }
    }
    
    return dp[amount] != amount + 1 ? dp[amount] : -1;
}
```

**What's happening:**
```cpp
vector<int> dp(amount + 1, amount + 1);
//  ^^^^^^     ^^^          ^^^^^^^^^^
//  |          |            └── "Infinity" value (can't have more than amount coins)
//  |            └── Size: amount + 1 (indices 0 to amount)
//  └── DP array

dp[0] = 0;  // 0 coins needed for amount 0

for (int i = 1; i <= amount; i++) {     // For each amount 1 to target
    for (int coin : coins) {             // Try every coin
        if (i - coin >= 0) {             // If coin doesn't overshoot
            dp[i] = min(dp[i], 1 + dp[i - coin]);
            //  ^^      ^^     ^   ^^^^^^
            //  |       |      |   └── Previous optimal + 1 coin
            //  |       |      └── +1 for using this coin
            //  |       └── Current best (starts at infinity)
            //  └── Update if we found a better way
        }
    }
}
```

---

### 5. Word Break (Medium)

**Trigger:** Given a string and a dictionary, return true if the string can be segmented into dictionary words.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i]` is a boolean representing whether the substring from index `0` to `i` can be segmented.

**Step 2 — Base Case:**
`dp[0] = true` (empty string can always be segmented — with zero words).

**Step 3 — Transition:**
For index `i`, check all words in the dictionary. If a word matches the string ending at `i`, AND `dp[i - word.length()]` is true, then `dp[i] = true`.

**Step 4 — Final Answer:**
`dp[s.length()]`

**Dry-Run for s = "leetcode", wordDict = ["leet", "code"]:**

| i | Substring checked | word="leet" (len=4) | word="code" (len=4) | dp[i] |
|---|---|---|---|---|
| 0 | "" | — | — | true |
| 1 | "l" | dp[-3]=false | — | false |
| 2 | "le" | dp[-2]=false | — | false |
| 3 | "lee" | dp[-1]=false | — | false |
| 4 | "leet" | dp[0]=true ✓ | — | true |
| 5 | "leetc" | dp[1]=false | — | false |
| 6 | "leetco" | dp[2]=false | — | false |
| 7 | "leetcod" | dp[3]=false | — | false |
| 8 | "leetcode" | — | dp[4]=true ✓ | true |

```cpp
bool wordBreak(string s, vector<string>& wordDict) {
    vector<bool> dp(s.length() + 1, false);
    dp[0] = true;
    
    for (int i = 1; i <= s.length(); i++) {
        for (const string& word : wordDict) {
            if (i >= word.length() && 
                s.substr(i - word.length(), word.length()) == word &&
                dp[i - word.length()]) {
                dp[i] = true;
                break;  // Found a valid segmentation, no need to check more
            }
        }
    }
    
    return dp[s.length()];
}
```

---

### 6. Longest Increasing Subsequence (Medium)

**Trigger:** Find the length of the longest strictly increasing subsequence in an array.

**Step-by-Step Walkthrough:**

**Step 1 — State Definition:**
`dp[i]` is the length of the longest increasing subsequence that strictly *ends* at index `i`.

**Step 2 — Base Case:**
`dp[i] = 1` for all `i` (every element is a subsequence of length 1 on its own).

**Step 3 — Transition:**
To calculate `dp[i]`, look back at every previous element `j` from `0` to `i-1`. 
If `nums[i] > nums[j]`, we can extend `j`'s subsequence!
`dp[i] = max(dp[i], 1 + dp[j])`.

**Step 4 — Final Answer:**
The maximum value anywhere in the `dp` array.

**Dry-Run Table for nums = [10, 9, 2, 5, 3, 7, 101, 18]:**

| i | nums[i] | j=0 | j=1 | j=2 | j=3 | j=4 | j=5 | dp[i] |
|---|---|---|---|---|---|---|---|---|
| 0 | 10 | — | — | — | — | — | — | 1 |
| 1 | 9 | 10>9? No | — | — | — | — | — | 1 |
| 2 | 2 | 10>2? No | 9>2? No | — | — | — | — | 1 |
| 3 | 5 | 10>5? No | 9>5? No | 2<5? Yes → 2 | — | — | — | 2 |
| 4 | 3 | 10>3? No | 9>3? No | 2<3? Yes → 2 | 5>3? No | — | — | 2 |
| 5 | 7 | 10>7? No | 9>7? No | 2<7? Yes → 2 | 5<7? Yes → 3 | 3<7? Yes → 3 | — | 3 |
| 6 | 101 | 10<101 → 2 | 9<101 → 2 | 2<101 → 2 | 5<101 → 3 | 3<101 → 3 | 7<101 → 4 | 4 |
| 7 | 18 | 10<18 → 2 | 9<18 → 2 | 2<18 → 2 | 5<18 → 3 | 3<18 → 3 | 7<18 → 4 | 4 |

Answer: max(dp) = 4 (subsequence: 2, 5, 7, 101 or 2, 3, 7, 101)

```cpp
int lengthOfLIS(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, 1);  // Every element is LIS of length 1
    int maxLength = 1;
    
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[i] > nums[j]) {
                dp[i] = max(dp[i], 1 + dp[j]);
            }
        }
        maxLength = max(maxLength, dp[i]);
    }
    
    return maxLength;
}
// Time: O(N^2), Space: O(N)
```

*(Note: This is an O(N^2) DP solution. There is an obscure O(N log N) solution using Binary Search, but the DP solution is the standard expected answer).*

---

### 7. Partition Equal Subset Sum (Medium)

**Trigger:** Can an array be partitioned into two subsets with equal sums?

**Step-by-Step Walkthrough:**

**Intuition:** 0/1 Knapsack Pattern.
1. Calculate the total sum of the array. If it's odd, return `false`.
2. The `target` sum is `totalSum / 2`. The problem is now: *"Can we pick a subset of numbers that sum exactly to `target`?"*

**Step 1 — State Definition:**
`dp[i]` is a boolean: can we form sum `i` using the numbers we've seen so far?

**Step 2 — Base Case:**
`dp[0] = true` (we can always form sum 0 by picking nothing).

**Step 3 — Transition:**
For each number, iterate backwards through the dp array. If `dp[i - num]` was true, then `dp[i]` becomes true.

**Step 4 — Final Answer:**
`dp[target]`

**Dry-Run for nums = [1, 5, 11, 5], target = 11:**

| num | dp[0] | dp[1] | dp[5] | dp[6] | dp[10] | dp[11] |
|---|---|---|---|---|---|---|
| Init | true | false | false | false | false | false |
| num=1 | true | true | false | false | false | false |
| num=5 | true | true | true | true | false | false |
| num=11 | true | true | true | true | false | true ✓ |
| num=5 | true | true | true | true | true | true |

```cpp
bool canPartition(vector<int>& nums) {
    int totalSum = 0;
    for (int num : nums) totalSum += num;
    
    if (totalSum % 2 != 0) return false;
    
    int target = totalSum / 2;
    vector<bool> dp(target + 1, false);
    dp[0] = true;
    
    for (int num : nums) {
        // Iterate BACKWARDS to avoid using the same number twice
        for (int i = target; i >= num; i--) {
            dp[i] = dp[i] || dp[i - num];
        }
    }
    
    return dp[target];
}
// Time: O(N * target), Space: O(target)
```

**What's happening:**
```cpp
for (int num : nums) {
    for (int i = target; i >= num; i--) {
    //           ^^^^^^        ^^^^
    //           |             └── Start from target, go down to num
    //           |                 (backwards to avoid double-counting)
    //           └── Don't go beyond target
        
        dp[i] = dp[i] || dp[i - num];
        //  ^^     ^^      ^^^^^^
        //  |      |       └── Can we form (i - num) without current number?
        //  |      └── Already possible?
        //  └── Update: either already possible OR achievable by adding num
    }
}
```

---

## Quick Reference

| Problem | State | Transition | Time | Space |
|---|---|---|---|---|
| Climbing Stairs | dp[i] = ways to reach i | dp[i] = dp[i-1] + dp[i-2] | O(N) | O(1) |
| House Robber | dp[i] = max money up to i | dp[i] = max(dp[i-1], dp[i-2]+nums[i]) | O(N) | O(1) |
| House Robber II | Two linear problems | Run House Robber twice | O(N) | O(1) |
| Coin Change | dp[i] = min coins for amount i | dp[i] = min(dp[i], 1+dp[i-coin]) | O(N*coins) | O(N) |
| Word Break | dp[i] = can segment s[0..i] | dp[i] = dp[i-len] && match | O(N^2*words) | O(N) |
| LIS | dp[i] = LIS ending at i | dp[i] = max(dp[i], 1+dp[j]) | O(N^2) | O(N) |
| Partition Equal Subset | dp[i] = can form sum i | dp[i] = dp[i] \|\| dp[i-num] | O(N*target) | O(target) |

### Key Patterns to Remember

| Pattern | Keywords | Template |
|---|---|---|
| Fibonacci-like | "ways to reach", "climb stairs" | `dp[i] = dp[i-1] + dp[i-2]` |
| Unbounded Knapsack | "coins", "minimum number of ways" | `dp[i] = min(dp[i], 1+dp[i-coin])` |
| 0/1 Knapsack | "subset sum", "partition" | `dp[i] = dp[i] \|\| dp[i-weight]` |
| Subsequence | "longest increasing/common" | `dp[i] = max(dp[i], 1+dp[j])` for j < i |

---

## Practice & Self-Check

Each question re-runs one of the seven solutions on a new input. Fill the `dp` row (or the rolling variables) by hand first.

### Predict the Output / Trace by Hand

**Q1. House Robber with rolling variables.** Run the $O(1)$-space `rob` from Problem 2 on `[2, 1, 1, 2]`. Give `(rob1, rob2)` after each house and the result. Which houses are robbed?

**Q2. Same street, but circular.** The Problem 2 dry run on `[2, 7, 9, 3, 1]` gave 12. Run Problem 3's circular `rob` on the same array. What do the two `robRange` calls return, and what is the final answer? Why is 12 no longer allowed?

**Q3. Coin Change vs greedy.** Fill the Coin Change table for `coins = [1, 3, 4]`, `amount = 6`. What does `coinChange` return? What would a greedy "always take the largest coin that fits" strategy return?

**Q4. Word Break that fails.** Run Problem 5's `wordBreak` on `s = "catsandog"`, `wordDict = ["cats", "dog", "sand", "and", "cat"]`. List every index `i` with `dp[i] = true`, and the final answer.

**Q5. Why iterate backwards?** Run Problem 7's `canPartition` on `[1, 2, 5]`.
(a) With the correct **backwards** inner loop, what is `dp` after each number, and what is returned?
(b) If the inner loop ran **forwards** (`for (int i = num; i <= target; i++)`), what would be returned, and why is that wrong?

### Coding Exercises

**E1 (Easy). Perfect Squares.** Return the fewest perfect squares (1, 4, 9, ...) that sum to `n`. Apply the Coin Change template.

```cpp
int numSquares(int n);
// 12 -> 3   (4 + 4 + 4)
// 13 -> 2   (4 + 9)
```

**E2 (Easy–Medium). Delete and Earn.** Picking value `x` earns `x` points for **every** copy of `x`, but deletes all copies of `x - 1` and `x + 1`. Return the maximum points. (Hint: reduce it to House Robber over values.)

```cpp
int deleteAndEarn(const vector<int>& nums);
// [3, 4, 2]          -> 6   (take 4 and 2)
// [2, 2, 3, 3, 3, 4] -> 9   (take all three 3s)
```

**E3 (Medium). Count Word Break Segmentations.** Instead of `true`/`false`, return the **number** of ways `s` can be split into dictionary words (words may be reused).

```cpp
long long countSegmentations(const string& s, const vector<string>& dict);
// "catsanddog", ["cat","cats","and","sand","dog"] -> 2
// "pineapplepenapple", ["apple","pen","applepen","pine","pineapple"] -> 3
```

#### Dry-Run: Answers

**Q1.** Returns **4** by robbing houses 0 and 3 (2 + 2).

| House value | temp = max(n + rob1, rob2) | rob1 | rob2 |
|-------------|----------------------------|------|------|
| init | - | 0 | 0 |
| 2 | max(2 + 0, 0) = 2 | 0 | 2 |
| 1 | max(1 + 0, 2) = 2 | 2 | 2 |
| 1 | max(1 + 2, 2) = 3 | 2 | 3 |
| 2 | max(2 + 2, 3) = 4 | 3 | 4 |

A "rob every other house" guess gives only 3; DP finds that skipping **two** houses in a row is better.

**Q2.** `robRange(0, 3)` on `[2, 7, 9, 3]` returns **11**; `robRange(1, 4)` on `[7, 9, 3, 1]` returns **10**. Answer **11**.

| Range | Values | (rob1, rob2) after each house | Result |
|-------|--------|-------------------------------|--------|
| skip last | 2, 7, 9, 3 | (0,2) → (2,7) → (7,11) → (11,11) | 11 |
| skip first | 7, 9, 3, 1 | (0,7) → (7,9) → (9,10) → (10,10) | 10 |

The linear answer 12 robs houses 0, 2, 4 (2 + 9 + 1), but in a circle house 4 is adjacent to house 0.

**Q3.** `coinChange` returns **2** (3 + 3). Greedy takes 4, then 1, then 1 → **3** coins, which is not optimal.

| i | coin=1 | coin=3 | coin=4 | dp[i] |
|---|--------|--------|--------|-------|
| 0 | — | — | — | 0 |
| 1 | 1+dp[0]=1 | — | — | 1 |
| 2 | 1+dp[1]=2 | — | — | 2 |
| 3 | 1+dp[2]=3 | 1+dp[0]=1 | — | 1 |
| 4 | 1+dp[3]=2 | 1+dp[1]=2 | 1+dp[0]=1 | 1 |
| 5 | 1+dp[4]=2 | 1+dp[2]=3 | 1+dp[1]=2 | 2 |
| 6 | 1+dp[5]=3 | 1+dp[3]=2 | 1+dp[2]=3 | 2 |

**Q4.** `dp[i]` is true only for **i = 0, 3, 4, 7**; the answer is **false**.
- `dp[3]`: `"cat"` = s[0..3) and `dp[0]` is true.
- `dp[4]`: `"cats"` = s[0..4) and `dp[0]` is true.
- `dp[7]`: `"sand"` = s[3..7) with `dp[3]` true (and also `"and"` = s[4..7) with `dp[4]` true).
- `dp[9]`: the only matching word is `"dog"` = s[6..9), but `dp[6]` is false. No dictionary word matches a substring ending at index 8 either, so `dp[8]` is false too.

**Q5.** Total = 8, so target = 4.
(a) Backwards: returns **false** (no subset of {1, 2, 5} sums to 4).

| After num | True indices of dp[0..4] |
|-----------|--------------------------|
| init | {0} |
| 1 | {0, 1} |
| 2 | {0, 1, 2, 3} |
| 5 | {0, 1, 2, 3} (loop `i = 4; i >= 5` never runs) |

(b) Forwards: returns **true** (wrong). With `num = 1`, `dp[1] = dp[0]`, then `dp[2] = dp[1]` (just set in this same pass), `dp[3] = dp[2]`, `dp[4] = dp[3]` → all true. The single `1` was reused four times, turning 0/1 knapsack into unbounded knapsack. Going backwards guarantees `dp[i - num]` still holds the value from **before** this number was considered.

**E1 — reference solution.** Coin Change where the "coins" are $1^2, 2^2, \dots$ up to $i$.

```cpp
int numSquares(int n) {
    vector<int> dp(n + 1, n + 1);          // n + 1 acts as infinity
    dp[0] = 0;
    for (int i = 1; i <= n; i++)
        for (int s = 1; s * s <= i; s++)
            dp[i] = min(dp[i], 1 + dp[i - s * s]);
    return dp[n];
}
// 12: dp[12] = 1 + dp[8] = 1 + (1 + dp[4]) = 1 + 1 + 1 = 3
```
Time $O(n\sqrt{n})$, space $O(n)$. An answer always exists because $1 = 1^2$.

**E2 — reference solution.** Bucket the points by value; taking value `v` forbids `v - 1` and `v + 1`, which is exactly "no two adjacent houses".

```cpp
int deleteAndEarn(const vector<int>& nums) {
    int maxVal = *max_element(nums.begin(), nums.end());
    vector<int> points(maxVal + 1, 0);
    for (int x : nums) points[x] += x;     // house v holds all copies of v
    int rob1 = 0, rob2 = 0;
    for (int v = 0; v <= maxVal; v++) {
        int temp = max(points[v] + rob1, rob2);
        rob1 = rob2;
        rob2 = temp;
    }
    return rob2;
}
// [2,2,3,3,3,4]: points = [0,0,4,9,4] -> House Robber -> max(4+4, 9) = 9
```
Time $O(n + \text{maxVal})$, space $O(\text{maxVal})$.

**E3 — reference solution.** Same state as Word Break, but `dp[i]` is a **count**, and every matching word adds its ways instead of `break`-ing on the first match.

```cpp
long long countSegmentations(const string& s, const vector<string>& dict) {
    int n = s.size();
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;                                          // one way to split ""
    for (int i = 1; i <= n; i++)
        for (const string& w : dict) {
            int L = w.size();
            if (i >= L && dp[i - L] > 0 && s.compare(i - L, L, w) == 0)
                dp[i] += dp[i - L];
        }
    return dp[n];
}
// "catsanddog": dp[3]=1 (cat), dp[4]=1 (cats), dp[7]=1+1 (cat|sand, cats|and), dp[10]=dp[7]=2
```
Time $O(n \cdot |dict| \cdot L_{max})$, space $O(n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems 1d dp** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

