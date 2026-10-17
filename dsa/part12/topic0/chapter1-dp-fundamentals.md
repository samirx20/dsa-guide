# Part 12, Topic 0: DP Fundamentals
## Chapter 1: The Dynamic Programming Mindset

Dynamic Programming (DP) is the most feared topic in technical interviews. It seems like magic, but it is just a systematic way to optimize brute-force recursion.

---

## 1. Identifying a DP Problem

You should NOT try to use DP unless the problem exhibits TWO specific mathematical properties:

1. **Overlapping Subproblems:** The problem can be broken down into smaller chunks, and those chunks are evaluated *multiple times*. 
   *(e.g., In `Fib(5) = Fib(4) + Fib(3)`, calculating `Fib(4)` requires calculating `Fib(3)`. We just calculated `Fib(3)` twice!)*
2. **Optimal Substructure:** The optimal solution to the large problem can be constructed directly from the optimal solutions of its subproblems.
   *(e.g., The shortest path from A to C through B is simply the shortest path from A to B + the shortest path from B to C).*

### DP vs Greedy vs Backtracking - When to Use What

| Approach | Overlapping Subproblems? | Optimal Substructure? | Looks Back? | Time |
|---|---|---|---|---|
| **DP** | Yes (exploit it) | Yes (must have) | No, reuses cached results | Usually polynomial |
| **Greedy** | No | Yes (must have) | No, makes local best choice | O(N) or O(N log N) |
| **Backtracking** | Sometimes | Sometimes | Yes, tries all options | Exponential |

*Triggers in problem statements:* "Find the maximum/minimum...", "Find the total number of ways...", "Is it possible to...".

### The Recursion Tree Problem

Here is what happens when you compute Fibonacci without DP:

```
                        fib(5)
                       /      \
                  fib(4)        fib(3)        ← fib(3) computed TWICE!
                 /      \       /     \
             fib(3)   fib(2)  fib(2)  fib(1)
            /     \   /    \
        fib(2)  fib(1) fib(1) fib(0)
       /    \
   fib(1)  fib(0)
```

**What's happening:**
- `fib(5)` calls `fib(4)` and `fib(3)` — that's 2 calls
- `fib(4)` calls `fib(3)` and `fib(2)` — now `fib(3)` is being computed again
- The same subproblems appear over and over
- For Fibonacci, time is O(2^N) — exponential!
- DP eliminates the duplicates by caching results

---

## 2. Top-Down (Memoization)

This is the easiest way to write DP. You write a standard recursive function, but you add a "cache" (a Hash Map or an Array) to remember the answers to subproblems so you never calculate them twice.

### The Workflow:
1. Define the base cases.
2. Check the cache. If the answer is there, return it!
3. Calculate the answer using recursion.
4. Save the answer to the cache before returning it.

```cpp
// Fibonacci Top-Down
int fib(int n, vector<int>& memo) {
    if (n == 0) return 0;
    if (n == 1) return 1;
    
    // Check cache
    if (memo[n] != -1) return memo[n];
    
    // Calculate and Save
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
    return memo[n];
}
// Time: O(N), Space: O(N)
```

**What's happening:**
```cpp
int fib(int n, vector<int>& memo) {
//  ^^^     ^   ^^^^^^^^^^^^^^
//  |       |   └── Cache array: initialized to -1 (meaning "not computed yet")
//  |       └── Input: which Fibonacci number
//  └── Return type: the Fibonacci value
    
    if (memo[n] != -1) return memo[n];
    //  ^^^^^^^^^^^^^^   ^^^^^^^^^^
    //  |                └── If we already computed it, return cached value
    //  └── Check if this subproblem was solved before
    
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
    //  ^^^^       ^^^              ^^^
    //  |          |                └── Compute right child (stored, not recomputed)
    //  |          └── Compute left child (stored, not recomputed)
    //  └── Cache the result before returning
    return memo[n];
}
```

### Dry-Run: Top-Down Fib(5)

```
Call: fib(5, memo)
  memo[5] = -1, so compute
  Call: fib(4, memo)
    memo[4] = -1, so compute
    Call: fib(3, memo)
      memo[3] = -1, so compute
      Call: fib(2, memo)
        memo[2] = -1, so compute
        Call: fib(1, memo) → returns 1
        Call: fib(0, memo) → returns 0
        memo[2] = 1 + 0 = 1
      Call: fib(1, memo) → returns 1
      memo[3] = 1 + 1 = 2
    Call: fib(2, memo)
      memo[2] = 1 (CACHED!) → returns 1 immediately
    memo[4] = 2 + 1 = 3
  Call: fib(3, memo)
    memo[3] = 2 (CACHED!) → returns 2 immediately
  memo[5] = 3 + 2 = 5
```

**What's happening:**
- First call computes `fib(2)` and `fib(3)` from scratch
- Second call to `fib(2)` and `fib(3)` hit the cache — instant return!
- We saved 2 entire recursion subtrees from being recomputed

---

## 3. Bottom-Up (Tabulation)

Instead of starting at N and recursing down to 0, you start at 0 and iteratively build an array up to N. 
This avoids the recursive Call Stack entirely, making it slightly faster in practice and preventing Stack Overflow errors.

### The Workflow:
1. Define an array (the DP table).
2. Initialize the base cases in the array (e.g., `dp[0] = 0`, `dp[1] = 1`).
3. Write a `for` loop that calculates `dp[i]` based on previously calculated values (`dp[i-1]`, `dp[i-2]`).

```cpp
// Fibonacci Bottom-Up
int fib(int n) {
    if (n == 0) return 0;
    vector<int> dp(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    return dp[n];
}
// Time: O(N), Space: O(N)
```

**What's happening:**
```cpp
vector<int> dp(n + 1);  // Create array of size n+1
dp[0] = 0;              // Base case: F(0) = 0
dp[1] = 1;              // Base case: F(1) = 1

for (int i = 2; i <= n; i++) {
//       ^                ^
//       |                └── Stop at n (we want dp[n])
//       └── Start at 2 (base cases already filled)
    
    dp[i] = dp[i - 1] + dp[i - 2];
    //  ^^      ^^^^        ^^^^
    //  |       |           └── Two steps back
    //  |       └── One step back
    //  └── Fill current cell
}
```

### Dry-Run: Bottom-Up Table Fill for Fib(5)

```
Step 0:  dp = [0, 1, _, _, _, _]    ← Base cases
Step 1:  dp = [0, 1, 1, _, _, _]    ← dp[2] = dp[1] + dp[0] = 1 + 0 = 1
Step 2:  dp = [0, 1, 1, 2, _, _]    ← dp[3] = dp[2] + dp[1] = 1 + 1 = 2
Step 3:  dp = [0, 1, 1, 2, 3, _]    ← dp[4] = dp[3] + dp[2] = 2 + 1 = 3
Step 4:  dp = [0, 1, 1, 2, 3, 5]    ← dp[5] = dp[4] + dp[3] = 3 + 2 = 5
```

**What's happening:**
- Each step builds on the previous results
- No recursion, no stack overflow risk
- Each cell is computed exactly once
- The answer is always at `dp[n]`

---

## 4. Space Optimization (State Reduction)

If you look closely at the Bottom-Up Fibonacci code, to calculate `dp[i]`, we ONLY need `dp[i-1]` and `dp[i-2]`. 
We don't care about `dp[i-3]` or `dp[0]`. 
Why are we storing them in an O(N) array? We can optimize the space to O(1) by just maintaining two variables!

```cpp
// Fibonacci Space-Optimized
int fib(int n) {
    if (n == 0) return 0;
    int prev2 = 0;
    int prev1 = 1;
    
    for (int i = 2; i <= n; i++) {
        int current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    
    return prev1;
}
// Time: O(N), Space: O(1)!
```

**What's happening:**
```cpp
int prev2 = 0;  // dp[i-2]
int prev1 = 1;  // dp[i-1]

for (int i = 2; i <= n; i++) {
    int current = prev1 + prev2;  // dp[i] = dp[i-1] + dp[i-2]
    prev2 = prev1;                // Slide window: old dp[i-1] becomes dp[i-2]
    prev1 = current;              // Slide window: new dp[i] becomes dp[i-1]
}
// After loop: prev1 holds dp[n]
```

### Dry-Run: Space-Optimized for Fib(5)

```
Initial:   prev2 = 0, prev1 = 1
i = 2:     current = 1 + 0 = 1    → prev2 = 1, prev1 = 1
i = 3:     current = 1 + 1 = 2    → prev2 = 1, prev1 = 2
i = 4:     current = 2 + 1 = 3    → prev2 = 2, prev1 = 3
i = 5:     current = 3 + 2 = 5    → prev2 = 3, prev1 = 5
Return:    prev1 = 5
```

**What's happening:**
- Only two variables are maintained at any time
- The "sliding window" moves forward by one step each iteration
- Same answer, but O(1) space instead of O(N)

---

## 5. The 4-Step Framework for Any DP Problem

If you follow these 4 steps explicitly, you can solve any 1D or 2D DP problem. Do not start writing code until you have answered these four questions on the whiteboard.

### Step 1: State Definition
What does `dp[i]` (or `dp[i][j]`) actually mean in plain English? 
*(e.g., "dp[i] is the maximum profit I can make on day i").*

### Step 2: Base Cases
What are the obvious answers for the smallest inputs?
*(e.g., "dp[0] = 0, because on day 0 I have 0 profit").*

### Step 3: Transition Relation
How do I calculate `dp[i]` if I already know the answers for the days before it? This is the math equation.
*(e.g., "dp[i] = max(dp[i-1], dp[i-2] + current_profit)").*

### Step 4: Final Answer
Where is the answer located when the loop finishes?
*(e.g., "It will be stored in dp[N]").*

### Example: Climbing Stairs (Apply the 4-Step Framework)

```
Step 1: dp[i] = number of distinct ways to reach step i
Step 2: dp[0] = 1 (1 way to be at the ground)
        dp[1] = 1 (1 way to reach step 1)
Step 3: dp[i] = dp[i-1] + dp[i-2]
        (you either came from 1 step below or 2 steps below)
Step 4: The answer is dp[n]
```

### Dry-Run: Climbing Stairs for n=5

```
Step 0:  dp = [1, 1, _, _, _, _]    ← Base cases
Step 1:  dp = [1, 1, 2, _, _, _]    ← dp[2] = dp[1] + dp[0] = 2
Step 2:  dp = [1, 1, 2, 3, _, _]    ← dp[3] = dp[2] + dp[1] = 3
Step 3:  dp = [1, 1, 2, 3, 5, _]    ← dp[4] = dp[3] + dp[2] = 5
Step 4:  dp = [1, 1, 2, 3, 5, 8]    ← dp[5] = dp[4] + dp[3] = 8

Answer: 8 distinct ways to climb 5 stairs
```

---

## 6. Common Mistakes and How to Avoid Them

### Mistake 1: Not defining dp[0] correctly
```cpp
// WRONG: dp[0] = 0 for climbing stairs
// dp[0] should be 1 (1 way to be at the start)

// RIGHT:
dp[0] = 1;  // Base case: 1 way to be at the ground
```

### Mistake 2: Off-by-one errors in loops
```cpp
// WRONG: Starting loop at i = 0 when base cases are dp[0] and dp[1]
for (int i = 0; i <= n; i++) { ... }

// RIGHT: Start at i = 2 since dp[0] and dp[1] are already set
for (int i = 2; i <= n; i++) { ... }
```

### Mistake 3: Using the wrong data type for "infinity"
```cpp
// WRONG: Using INT_MAX which can overflow
int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, INT_MAX);
    // Adding 1 to INT_MAX causes overflow!
}

// RIGHT: Use amount + 1 as "infinity" (since max coins can't exceed amount)
vector<int> dp(amount + 1, amount + 1);
```

### Mistake 4: Forgetting to check bounds before accessing dp[i-1]
```cpp
// WRONG: Accessing dp[i-coin] without checking if i-coin >= 0
dp[i] = min(dp[i], 1 + dp[i - coin]);  // Could access negative index!

// RIGHT: Always check bounds
if (i - coin >= 0) {
    dp[i] = min(dp[i], 1 + dp[i - coin]);
}
```

---

## 7. Top-Down vs Bottom-Up - Which to Use?

| Aspect | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|---|---|---|
| **Ease of writing** | Easier (natural recursion) | Harder (must figure out iteration order) |
| **Stack overflow risk** | Yes, for deep recursion | No |
| **Speed** | Slightly slower (function call overhead) | Slightly faster |
| **Space optimization** | Harder | Easier (can drop rows/columns) |
| **Best for interviews** | Start here to get the recurrence | Convert to this for optimization |

### Strategy for Interviews:
1. Write top-down first (it's easier and less error-prone)
2. Verify it works with your dry-run
3. Convert to bottom-up if asked for optimization
4. Space-optimize if asked for further optimization

---

## 8. Recognizing DP Patterns

### Pattern 1: Fibonacci-like
- **Keywords:** "Ways to reach step N", "climbing stairs"
- **Structure:** `dp[i] = dp[i-1] + dp[i-2]`
- **Examples:** Climbing Stairs, House Robber, Decode Ways

### Pattern 2: Unbounded Knapsack
- **Keywords:** "Given coins, find minimum/number of ways to make amount"
- **Structure:** `dp[i] = min/max(dp[i], dp[i-coin] + 1)`
- **Examples:** Coin Change, Coin Change II, Perfect Squares

### Pattern 3: 0/1 Knapsack
- **Keywords:** "Can we pick items to reach a target sum?"
- **Structure:** `dp[i] = dp[i] || dp[i-weight]`
- **Examples:** Partition Equal Subset Sum, Target Sum

### Pattern 4: Longest Subsequence
- **Keywords:** "Longest increasing/common subsequence"
- **Structure:** `dp[i] = max(dp[i], dp[j] + 1)` where j < i
- **Examples:** LIS, LCS, Edit Distance

---

## Quick Reference

| Concept | Formula/Pattern | Time | Space |
|---|---|---|---|
| **Top-Down** | Recursive + cache | O(N) | O(N) |
| **Bottom-Up** | Fill table iteratively | O(N) | O(N) |
| **Space-Optimized** | Keep only needed states | O(N) | O(1) to O(K) |
| **Fibonacci** | `dp[i] = dp[i-1] + dp[i-2]` | O(N) | O(1) |
| **Climbing Stairs** | `dp[i] = dp[i-1] + dp[i-2]` | O(N) | O(1) |
| **Coin Change** | `dp[i] = min(dp[i], 1+dp[i-coin])` | O(N*coins) | O(N) |
| **LIS** | `dp[i] = max(dp[i], 1+dp[j])` | O(N^2) | O(N) |
| **State Definition** | What does dp[i] mean? | — | — |
| **Base Case** | Smallest input answer | — | — |
| **Transition** | How to compute dp[i] from previous | — | — |
| **Final Answer** | Where is the result stored? | — | — |

---

## Practice & Self-Check

Use the 4-Step Framework (state, base cases, transition, final answer) out loud for each problem, and fill the DP table by hand before reading the answers.

### Predict the Output / Trace by Hand

**Q1. Counting calls.** Count every invocation of the function (including the first call and calls that return immediately from a base case or the cache).
(a) The plain recursive `fib(n)` (no memo) for $n = 6$.
(b) The Top-Down `fib(6, memo)` from Section 2, with `memo` initialized to `-1`.

**Q2. Space-optimized trace.** Run the space-optimized `fib` from Section 4 with $n = 7$. Give `current`, `prev2`, `prev1` after every iteration and the return value.

**Q3. Climbing stairs with a 3-step.** You may now climb 1, 2, **or 3** steps at a time. Apply the 4-Step Framework: write the state, the base cases, and the transition, then fill `dp[0..5]`. How many ways are there to climb 5 stairs?

**Q4. Mistake 1 in numbers.** In the original Climbing Stairs (1 or 2 steps), someone sets `dp[0] = 0` (keeping `dp[1] = 1`). What does their table give for `dp[5]`, compared with the correct 8?

**Q5. Mistake 3 in numbers.** For Coin Change (minimum coins) with `coins = [2]`, `amount = 3`, and the transition `dp[i] = min(dp[i], 1 + dp[i - coin])` (bounds checked):
(a) Fill `dp[0..3]` when "infinity" is `amount + 1 = 4`. What should the function return?
(b) What goes wrong at `i = 3` if "infinity" is `INT_MAX` instead?

### Coding Exercises

**E1 (Easy). Min Cost Climbing Stairs.** `cost[i]` is paid when you step on stair `i`. You may start at stair 0 or 1, climb 1 or 2 at a time, and want to reach the top (index `n`, just past the last stair). Use $O(1)$ space.

```cpp
int minCostClimbingStairs(const vector<int>& cost);
// [10, 15, 20]                           -> 15
// [1, 100, 1, 1, 1, 100, 1, 1, 100, 1]   -> 6
```

**E2 (Easy–Medium). Climbing Stairs with Any Step Set.** Count ordered ways to climb exactly `n` stairs when each move uses a size from `steps`.

```cpp
long long countWays(int n, const vector<int>& steps);
// n = 5, steps = {1, 2, 3} -> 13
// n = 4, steps = {1, 3}    -> 3    (1+1+1+1, 1+3, 3+1)
```

**E3 (Medium). Decode Ways.** A message of digits is decoded with `'1' -> A, ..., '26' -> Z`. Count the decodings. A `'0'` can only be part of `"10"` or `"20"`.

```cpp
int numDecodings(const string& s);
// "226"   -> 3   (2 2 6, 22 6, 2 26)
// "06"    -> 0
// "11106" -> 2   (1 1 10 6, 11 10 6)
```

#### Dry-Run: Answers

**Q1.** (a) **25** calls. (b) **11** calls.
For (a), let $C(n)$ be the number of calls: $C(0) = C(1) = 1$ and $C(n) = 1 + C(n-1) + C(n-2)$.

| n | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| $C(n)$ | 1 | 1 | 3 | 5 | 9 | 15 | 25 |

For (b), each of `fib(6)`, `fib(5)`, `fib(4)`, `fib(3)`, `fib(2)` is computed once and makes 2 calls: the left child goes one level deeper, and the right child is a cache hit or a base case. That is $1 + 2 \times 5 = 11$ calls in total, and in general $2n - 1$. (For $n = 5$ it is 9, matching the count quoted in the hashing chapter.)

**Q2.** Returns **13**.

| i | current | prev2 | prev1 |
|---|---------|-------|-------|
| init | - | 0 | 1 |
| 2 | 1 + 0 = 1 | 1 | 1 |
| 3 | 1 + 1 = 2 | 1 | 2 |
| 4 | 2 + 1 = 3 | 2 | 3 |
| 5 | 3 + 2 = 5 | 3 | 5 |
| 6 | 5 + 3 = 8 | 5 | 8 |
| 7 | 8 + 5 = 13 | 8 | 13 |

**Q3.** **13** ways.
- State: `dp[i]` = number of distinct ways to reach step `i`.
- Base cases: `dp[0] = 1`, `dp[1] = 1`, `dp[2] = 2` (1+1 or 2).
- Transition: `dp[i] = dp[i-1] + dp[i-2] + dp[i-3]` for $i \ge 3$.
- Answer: `dp[n]`.

| i | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| dp[i] | 1 | 1 | 2 | 2+1+1 = 4 | 4+2+1 = 7 | 7+4+2 = 13 |

**Q4.** `dp[5] = 5` instead of 8. With `dp[0] = 0`: `dp[2] = 1 + 0 = 1`, `dp[3] = 1 + 1 = 2`, `dp[4] = 2 + 1 = 3`, `dp[5] = 3 + 2 = 5`. The table is now the Fibonacci numbers shifted by one, because the "jump 2 from the ground" path to step 2 was lost.

**Q5.** (a) `dp = [0, 4, 1, 4]`, so the function returns **-1** (since `dp[3] = 4 > amount`, the amount is unreachable).

| i | candidates | dp[i] |
|---|------------|-------|
| 0 | base case | 0 |
| 1 | 1 - 2 < 0, skip | 4 (stays "infinity") |
| 2 | 1 + dp[0] = 1 | 1 |
| 3 | 1 + dp[1] = 5 | min(4, 5) = 4 |

(b) `dp[1]` stays `INT_MAX`, so at `i = 3` the code evaluates `1 + INT_MAX`, which is **signed integer overflow** (undefined behaviour). On typical hardware it wraps to `INT_MIN`, so `dp[3]` becomes a huge negative number and the function returns garbage instead of -1.

**E1 — reference solution.** State: `dp[i]` = min cost to stand on position `i` (not yet paying `cost[i]`). Base: `dp[0] = dp[1] = 0`. Transition: `dp[i] = min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2])`. Answer: `dp[n]`.

```cpp
int minCostClimbingStairs(const vector<int>& cost) {
    int n = cost.size();
    int prev2 = 0, prev1 = 0;          // dp[i-2], dp[i-1]
    for (int i = 2; i <= n; i++) {
        int cur = min(prev1 + cost[i - 1], prev2 + cost[i - 2]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}
// [10, 15, 20]: dp2 = min(0+15, 0+10) = 10, dp3 = min(10+20, 0+15) = 15
```
Time $O(n)$, space $O(1)$.

**E2 — reference solution.** Same state as Climbing Stairs; the transition sums over every allowed step size, with the Mistake 4 bounds check.

```cpp
long long countWays(int n, const vector<int>& steps) {
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;                                   // one way to stand on the ground
    for (int i = 1; i <= n; i++)
        for (int s : steps)
            if (i - s >= 0) dp[i] += dp[i - s];
    return dp[n];
}
// steps {1,3}: dp = [1, 1, 1, 2, 3] -> 3
```
Time $O(n \cdot |steps|)$, space $O(n)$. With `steps = {1, 2}` this reproduces Climbing Stairs (8 for $n = 5$).

**E3 — reference solution.** State: `dp[i]` = number of decodings of the first `i` characters. Base: `dp[0] = 1` (empty prefix). Transition: take the last digit alone if it is not `'0'`, plus the last two digits if they form 10–26.

```cpp
int numDecodings(const string& s) {
    int n = s.size();
    vector<int> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++) {
        if (s[i - 1] != '0') dp[i] += dp[i - 1];                  // one digit
        if (i >= 2) {
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (s[i - 2] != '0' && two <= 26) dp[i] += dp[i - 2];   // two digits
        }
    }
    return dp[n];
}
// "11106": dp = [1, 1, 2, 3, 2, 2]  ("0" only pairs as "10"; "06" is rejected)
```
Time $O(n)$, space $O(n)$ (reducible to $O(1)$ with two variables, exactly as in Section 4).

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Dynamic Programming Mindset**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 dp fundamentals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

