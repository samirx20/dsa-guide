# Part 6, Topic 1: Recursion Fundamentals
## Interview Problems Walkthrough

These problems build the muscle memory required to visualize the Call Stack and formulate Base Cases.

---

## Problem Classification Table

| # | Problem | Difficulty | Pattern | Key Insight | Time |
|---|---------|------------|---------|-------------|------|
| 1 | Fibonacci Number | Easy | Binary recursion | F(n) = F(n-1) + F(n-2) | $O(2^N)$ |
| 2 | Climbing Stairs | Easy | Binary recursion | Same as Fibonacci | $O(2^N)$ naive |
| 3 | Power of Two | Easy | Linear recursion | Divide by 2 until 1 | $O(\log N)$ |
| 4 | Pow(x, n) | Medium | Divide and Conquer | Halve the exponent | $O(\log N)$ |
| 5 | Generate Parentheses | Medium | Multi-branch recursion | Track open/close counts | $O(4^N/\sqrt{N})$ |
| 6 | Reverse a String | Easy | Head recursion | Reverse after recursive call | $O(N)$ |

---

## Solution Approach Comparison

| Approach | Time | Space | Pros | Cons |
|----------|------|-------|------|------|
| Naive recursion | $O(2^N)$ | $O(N)$ | Simple, readable | TLE on large inputs |
| Recursion + memoization | $O(N)$ | $O(N)$ | Correct, efficient | Extra memory |
| Iterative (loop) | $O(N)$ | $O(1)$ | Best space | Harder to think about |
| Divide and Conquer | $O(\log N)$ | $O(\log N)$ | Very fast | Only works for halving problems |

---

### 1. Fibonacci Number (Easy)

**Trigger:** `F(n) = F(n-1) + F(n-2)`.
**Intuition:** The textbook definition of multi-branch recursion. The base cases are `F(0) = 0` and `F(1) = 1`.

```cpp
int fib(int n) {
    if (n == 0) return 0;
    if (n == 1) return 1;
    return fib(n - 1) + fib(n - 2);
}
// Time: O(2^N) - Terrible! (We will optimize this in Dynamic Programming)
// Space: O(N) - The max depth of the recursion tree is N.
```

**What's happening:**
```
fib(5) = fib(4) + fib(3)
        /           \
   fib(3)+fib(2)   fib(2)+fib(1)
   /       \         /       \
fib(2)+fib(1)  (1)  (1)     (1)
  /       \
fib(1)+fib(0)

Problem: fib(3) calculated 2 times
         fib(2) calculated 3 times
         fib(1) calculated 5 times!
Total nodes: 15 (for N=5)
Pattern: roughly 2^N nodes
```

**Dry-Run Table:**

| Call | n | Returns | Stack State |
|------|---|---------|-------------|
| `fib(5)` | 5 | ? | `[fib(5)]` |
| `fib(4)` | 4 | ? | `[fib(5), fib(4)]` |
| `fib(3)` | 3 | ? | `[fib(5), fib(4), fib(3)]` |
| `fib(2)` | 2 | ? | `[fib(5), fib(4), fib(3), fib(2)]` |
| `fib(1)` | 1 | 1 | `[fib(5), fib(4), fib(3), fib(2)]` |
| `fib(0)` | 0 | 0 | `[fib(5), fib(4), fib(3), fib(2)]` |
| `fib(2)` | 2 | 1 | `[fib(5), fib(4), fib(3)]` |
| `fib(1)` | 1 | 1 | `[fib(5), fib(4), fib(3)]` |
| `fib(3)` | 3 | 2 | `[fib(5), fib(4)]` |
| `fib(2)` | 2 | 1 | `[fib(5), fib(4)]` |
| `fib(4)` | 4 | 3 | `[fib(5)]` |
| `fib(3)` | 3 | ? | `[fib(5), fib(3)]` |
| `fib(2)` | 2 | 1 | `[fib(5), fib(3)]` |
| `fib(1)` | 1 | 1 | `[fib(5), fib(3)]` |
| `fib(3)` | 3 | 2 | `[fib(5)]` |
| `fib(5)` | 5 | **5** | `[]` |

**Step-by-Step Walkthrough:**
1. Call `fib(5)`. Not base case. Need `fib(4)` + `fib(3)`.
2. Pause `fib(5)`, call `fib(4)`.
3. Pause `fib(4)`, call `fib(3)`.
4. Pause `fib(3)`, call `fib(2)`.
5. Pause `fib(2)`, call `fib(1)`. Returns 1 (base case).
6. Pause `fib(2)`, call `fib(0)`. Returns 0 (base case).
7. `fib(2)` = 1 + 0 = 1. Return to `fib(3)`.
8. Pause `fib(3)`, call `fib(1)`. Returns 1.
9. `fib(3)` = 1 + 1 = 2. Return to `fib(4)`.
10. Pause `fib(4)`, call `fib(2)` → returns 1.
11. `fib(4)` = 2 + 1 = 3. Return to `fib(5)`.
12. Pause `fib(5)`, call `fib(3)` → returns 2.
13. `fib(5)` = 3 + 2 = 5. Done!

---

### 2. Climbing Stairs (Easy)

**Trigger:** You can climb 1 or 2 steps. How many distinct ways can you climb to the top?
**Intuition:** If you are at step $N$, you could have only arrived there by taking a 1-step from $N-1$, or a 2-step from $N-2$. Therefore, the total ways to reach $N$ is the sum of ways to reach $N-1$ and $N-2$.
**This is literally the Fibonacci sequence disguised as a word problem.**

```cpp
int climbStairs(int n) {
    if (n <= 1) return 1;
    return climbStairs(n - 1) + climbStairs(n - 2);
}
// Time: O(2^N) - Same as Fibonacci
// Space: O(N) - Same as Fibonacci
```

**What's happening:**
```
Step 4 (target):
    Ways to reach step 4 = ways to reach step 3 + ways to reach step 2
    
    Why?
    ├── If you're at step 3, you take 1 step → reach 4
    └── If you're at step 2, you take 2 steps → reach 4
    
    climbStairs(4) = climbStairs(3) + climbStairs(2)
    
Decision tree:
                climbStairs(4)
               /              \
      climbStairs(3)      climbStairs(2)
      /           \           /        \
climbStairs(2) climbStairs(1)  climbStairs(1) climbStairs(0)
  /       \
climbStairs(1) climbStairs(0)

Each path = one distinct way to climb
Total paths = answer
```

*(Note: The naive recursive solution will TLE on LeetCode. You must memoize it or use iterative variables, which is covered in DP. But realizing it's a recursive tree is the first step).*

---

### 3. Power of Two (Easy)

**Trigger:** Given an integer `n`, return `true` if it is a power of two.
**Intuition:** A number is a power of two if it can be repeatedly divided by 2 down to 1.
- Base Case 1: If $n == 1$, return true.
- Base Case 2: If $n \le 0$, or if $n$ is odd ($n \% 2 \neq 0$), return false.
- Recursive Step: Return `isPowerOfTwo(n / 2)`.

```cpp
bool isPowerOfTwo(int n) {
    if (n == 1) return true;
    if (n <= 0 || n % 2 != 0) return false;
    return isPowerOfTwo(n / 2);
}
// Time: O(log N), Space: O(log N) due to call stack.
// (Bonus: Can also be done in O(1) using bit manipulation: return n > 0 && !(n & (n - 1)); )
```

**What's happening:**
```
isPowerOfTwo(16)
├── 16 is even → call isPowerOfTwo(8)
│   ├── 8 is even → call isPowerOfTwo(4)
│   │   ├── 4 is even → call isPowerOfTwo(2)
│   │   │   ├── 2 is even → call isPowerOfTwo(1)
│   │   │   │   └── n == 1 → return TRUE ✓
│   │   │   └── return TRUE
│   │   └── return TRUE
│   └── return TRUE
└── return TRUE

isPowerOfTwo(18)
├── 18 is even → call isPowerOfTwo(9)
│   ├── 9 is odd → return FALSE ✗
└── return FALSE
```

**Dry-Run Table:**

| Step | n | n % 2 | n == 1? | Action |
|------|---|-------|---------|--------|
| 1 | 16 | 0 | No | Call `isPowerOfTwo(8)` |
| 2 | 8 | 0 | No | Call `isPowerOfTwo(4)` |
| 3 | 4 | 0 | No | Call `isPowerOfTwo(2)` |
| 4 | 2 | 0 | No | Call `isPowerOfTwo(1)` |
| 5 | 1 | - | Yes | Return `true` |
| 6 | 2 | - | - | Return `true` |
| 7 | 4 | - | - | Return `true` |
| 8 | 8 | - | - | Return `true` |
| 9 | 16 | - | - | Return `true` |

---

### 4. Pow(x, n) (Medium)

**Trigger:** Implement `pow(x, n)`, which calculates $x$ raised to the power $n$.
**Intuition:** The brute force way is multiplying $x$ by itself $n$ times ($O(N)$ time). If $n$ is 2 billion, this TLEs.
Use **Fast Exponentiation (Divide and Conquer)**.
Instead of $2^{10} = 2 \times 2 \times 2 \dots$, notice that $2^{10} = (2^5)^2$.
If $n$ is even: $x^n = (x^{n/2})^2$.
If $n$ is odd: $x^n = x \times (x^{n/2})^2$.

```cpp
double myPow(double x, int n) {
    // Cast to long long to handle the edge case where n = INT_MIN
    long long N = n;
    if (N < 0) {
        x = 1 / x;
        N = -N;
    }
    return fastPow(x, N);
}

double fastPow(double x, long long n) {
    if (n == 0) return 1.0;

    double half = fastPow(x, n / 2);

    if (n % 2 == 0) {
        return half * half;
    } else {
        return half * half * x;
    }
}
// Time: O(log N), Space: O(log N)
```

**What's happening:**
```
fastPow(2, 10):
│
├─ half = fastPow(2, 5)
│  │
│  ├─ half = fastPow(2, 2)
│  │  │
│  │  ├─ half = fastPow(2, 1)
│  │  │  │
│  │  │  ├─ half = fastPow(2, 0)
│  │  │  │  └─ returns 1 (base case)
│  │  │  │
│  │  │  ├─ n=1 is odd
│  │  │  └─ returns 1 * 1 * 2 = 2
│  │  │
│  │  ├─ n=2 is even
│  │  └─ returns 2 * 2 = 4
│  │
│  ├─ n=5 is odd
│  └─ returns 4 * 4 * 2 = 32
│
├─ n=10 is even
└─ returns 32 * 32 = 1024

Brute force: 10 multiplications
D&C:         6 multiplications (O(log N): ≤ 2 per halving)
```

**Dry-Run Table:**

| Step | n | n/2 | half | n%2 | Result |
|------|---|-----|------|-----|--------|
| `fastPow(2,10)` | 10 | 5 | ? | 0 | ? |
| `fastPow(2,5)` | 5 | 2 | ? | 1 | ? |
| `fastPow(2,2)` | 2 | 1 | ? | 0 | ? |
| `fastPow(2,1)` | 1 | 0 | ? | 1 | ? |
| `fastPow(2,0)` | 0 | - | - | - | 1 |
| returns to `fastPow(2,1)` | - | - | 1 | - | 1*1*2=2 |
| returns to `fastPow(2,2)` | - | - | 2 | - | 2*2=4 |
| returns to `fastPow(2,5)` | - | - | 4 | - | 4*4*2=32 |
| returns to `fastPow(2,10)` | - | - | 32 | - | 32*32=**1024** |

---

### 5. Generate Parentheses (Medium)

**Trigger:** Generate all combinations of well-formed parentheses given `n` pairs.
**Intuition:** This bridges the gap between pure recursion and **Backtracking**.
We build the string character by character recursively.
At any point, we have two choices: Add a `(` or add a `)`.
- We can only add a `(` if we haven't used all $n$ of them.
- We can only add a `)` if the number of currently opened `(` is greater than the number of `)`.

```cpp
void generate(int open, int close, int n, string currentStr, vector<string>& result) {
    // Base Case: We have used all open and close brackets
    if (open == n && close == n) {
        result.push_back(currentStr);
        return;
    }

    // Recursive Step 1: Can we add an open bracket?
    if (open < n) {
        generate(open + 1, close, n, currentStr + '(', result);
    }

    // Recursive Step 2: Can we add a close bracket?
    if (close < open) {
        generate(open, close + 1, n, currentStr + ')', result);
    }
}

vector<string> generateParenthesis(int n) {
    vector<string> result;
    generate(0, 0, n, "", result);
    return result;
}
// Time: O(4^N / sqrt(N)) (nth Catalan number), Space: O(N) for call stack
```

**What's happening:**
```
generate(0, 0, 2, ""):
│
├─ open < 2, add "(" → generate(1, 0, 2, "(")
│  │
│  ├─ open < 2, add "(" → generate(2, 0, 2, "((")
│  │  │
│  │  └─ close < open, add ")" → generate(2, 1, 2, "(()")
│  │     │
│  │     └─ close < open, add ")" → generate(2, 2, 2, "(())")
│  │        └─ Base case! Save "(())"
│  │
│  └─ close < open, add ")" → generate(1, 1, 2, "()")
│     │
│     ├─ open < 2, add "(" → generate(2, 1, 2, "()(")
│     │  │
│     │  └─ close < open, add ")" → generate(2, 2, 2, "()()")
│     │     └─ Base case! Save "()()"
│     │
│     └─ close == open (1==1), can't add ")"
│
└─ close == open (0==0), can't add ")"

Result: ["(())", "()()"]
```

**Decision Tree for n=2:**
```
                    ""
                   / \
                  (   
                 / \
                ((  ()
               /   / \
              (() (()  ()
              /    \
           (())  ()()

Valid paths (end at open==2 && close==2):
  "(( ))" → "(())" ✓
  "( ) ( )" → "()()" ✗ wait...

Let me redo:
                    ""
                   /
                  (          (open=1, close=0)
                 / \
                ((   ()      (open=2,close=0) and (open=1,close=1)
               /      \
              (()     ()(    (open=2,close=1) and (open=2,close=1)
              |        |
           (())      ()()    ✓ Both valid!
```

---

### 6. Reverse a String Recursively (Easy)

**Trigger:** Reverse a string using recursion.
**Intuition:** Head recursion pattern. Process the rest first, then append the current character.

```cpp
string reverseString(string s) {
    // Base case: empty string or single character
    if (s.length() <= 1) return s;

    // Head recursion: process rest first, then add current char at end
    return reverseString(s.substr(1)) + s[0];
}
```

**What's happening:**
```
reverseString("hello")
│
├─ reverseString("ello") + 'h'
│  │
│  ├─ reverseString("llo") + 'e'
│  │  │
│  │  ├─ reverseString("lo") + 'l'
│  │  │  │
│  │  │  ├─ reverseString("o") + 'l'
│  │  │  │  └─ returns "o" (base case)
│  │  │  │
│  │  │  └─ returns "o" + "l" = "ol"
│  │  │
│  │  └─ returns "ol" + "l" = "oll"
│  │
│  └─ returns "oll" + "e" = "olle"
│
└─ returns "olle" + "h" = "olleh"

Output: "olleh"
```

**Dry-Run Table:**

| Step | s | s.length() | Action | Returns |
|------|---|------------|--------|---------|
| 1 | "hello" | 5 | Call `reverseString("ello")` + 'h' | ? |
| 2 | "ello" | 4 | Call `reverseString("llo")` + 'e' | ? |
| 3 | "llo" | 3 | Call `reverseString("lo")` + 'l' | ? |
| 4 | "lo" | 2 | Call `reverseString("o")` + 'l' | ? |
| 5 | "o" | 1 | Base case | "o" |
| 6 | "lo" | - | "o" + "l" | "ol" |
| 7 | "llo" | - | "ol" + "l" | "oll" |
| 8 | "ello" | - | "oll" + "e" | "olle" |
| 9 | "hello" | - | "olle" + "h" | **"olleh"** |

---

### Quick Reference: Recursion Interview Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Linear Recursion** | One recursive call, N reduces by constant | Factorial, Sum 1..N |
| **Binary Recursion** | Two recursive calls, N reduces by 1 | Fibonacci, Climbing Stairs |
| **Divide and Conquer** | Two recursive calls, N halves | Binary Search, Pow(x,n) |
| **Multi-branch** | Multiple choices at each step | Generate Parentheses |
| **Head Recursion** | Work happens after call | Reverse string, Postorder |
| **Tail Recursion** | Work happens before call | Print sequence, Preorder |

| Interview Tip | Action |
|---------------|--------|
| "Write recursive Fibonacci" | Start with naive O(2^N), mention memoization |
| "Optimize recursion" | Suggest memoization or convert to iterative |
| "Time complexity of recursion" | Draw the tree, count nodes |
| "Space complexity of recursion" | Find max depth of tree |
| "Can't find base case" | Ask: "What's the smallest valid input?" |

---

## Practice & Self-Check

Each question below re-runs one of the six solutions above on a new input. Draw the recursion tree or fill the dry-run table yourself before peeking.

### Predict the Output / Trace by Hand

**Q1. Climbing Stairs, n = 5.** Using the naive `climbStairs` from Problem 2 (base case `n <= 1` returns 1), what does `climbStairs(5)` return, and how many total calls does it make (including itself)?

**Q2. Power of Two on 24 and 0.** Trace Problem 3's `isPowerOfTwo` on `n = 24`. List each call's `n`, `n % 2`, and the action. What is returned and how many calls are made? Then: what does `isPowerOfTwo(0)` return and on which line?

**Q3. `myPow` dry-run.** Fill in Problem 4's dry-run table for `fastPow(3, 13)` (columns `n`, `n/2`, `half`, `n%2`, result). Then say what `myPow(2.0, -3)` returns and what the values of `x` and `N` are when it calls `fastPow`.

**Q4. Generate Parentheses, n = 3.** Problem 5's `generate` always tries `(` before `)`. List the strings in `result` *in the exact order they are pushed*. How many are there?

**Q5. The hidden cost of `substr`.** Problem 6's `reverseString` makes $N$ calls for a string of length $N$. Counting the characters copied by `s.substr(1)` and by the `+` concatenation, what is the real time complexity? How many characters does `s.substr(1)` copy in total for `"hello"`?

### Coding Exercises

**E1 (Easy). Power of Three.** Adapt Problem 3's base-case/recursive-step structure.

```cpp
bool isPowerOfThree(int n);
// isPowerOfThree(27) -> true
// isPowerOfThree(45) -> false   (45 -> 15 -> 5, and 5 % 3 != 0)
```

**E2 (Easy–Medium). Stairs with 1, 2 or 3 steps — memoized.** Count the distinct ways to climb `n` stairs taking 1, 2, or 3 steps at a time. Write it recursively, then add a memo table so it runs in $O(n)$ (the "Recursion + memoization" row of the comparison table).

```cpp
long long countWays(int n, vector<long long>& memo);   // memo sized n+1, filled with -1
// n = 3 -> 4   (1+1+1, 1+2, 2+1, 3)
// n = 4 -> 7
```

**E3 (Medium). Binary strings with no consecutive 1s.** Generate every binary string of length `n` that never contains `"11"`. Use the same shape as Generate Parentheses: two choices per position, each guarded by a validity condition. Try `'0'` before `'1'`.

```cpp
vector<string> noConsecutiveOnes(int n);
// n = 2 -> ["00", "01", "10"]
// n = 3 -> ["000", "001", "010", "100", "101"]
```

#### Dry-Run: Answers

**Q1.** Returns **8**, after **15** calls. Values: $c(0)=1, c(1)=1, c(2)=2, c(3)=3, c(4)=5, c(5)=8$. Calls: $C(n) = 1 + C(n-1) + C(n-2)$ with $C(0)=C(1)=1$:

| n | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| ways | 1 | 1 | 2 | 3 | 5 | 8 |
| calls | 1 | 1 | 3 | 5 | 9 | 15 |

Note `climbStairs(n)` equals `fib(n + 1)`, which is why it has the same tree shape as Problem 1's `fib(5)` (also 15 nodes).

**Q2.** `isPowerOfTwo(24)` returns **false** after **4** calls:

| Step | n | n % 2 | n == 1? | Action |
|------|---|-------|---------|--------|
| 1 | 24 | 0 | No | Call `isPowerOfTwo(12)` |
| 2 | 12 | 0 | No | Call `isPowerOfTwo(6)` |
| 3 | 6 | 0 | No | Call `isPowerOfTwo(3)` |
| 4 | 3 | 1 | No | Odd → return `false` |

`isPowerOfTwo(0)` returns **false** from the second line, `if (n <= 0 || n % 2 != 0) return false;` (the `n <= 0` check). Without it, `0 % 2 == 0` and `0 / 2 == 0` would recurse forever.

**Q3.** `fastPow(3, 13)` = **1594323** ($3^{13}$):

| Step | n | n/2 | half | n%2 | Result |
|------|---|-----|------|-----|--------|
| `fastPow(3,13)` | 13 | 6 | 729 | 1 | 729 × 729 × 3 = **1594323** |
| `fastPow(3,6)` | 6 | 3 | 27 | 0 | 27 × 27 = 729 |
| `fastPow(3,3)` | 3 | 1 | 3 | 1 | 3 × 3 × 3 = 27 |
| `fastPow(3,1)` | 1 | 0 | 1 | 1 | 1 × 1 × 3 = 3 |
| `fastPow(3,0)` | 0 | – | – | – | 1 |

`myPow(2.0, -3)`: since `N = -3 < 0`, it sets `x = 1/2 = 0.5` and `N = 3`, then `fastPow(0.5, 3)` → `fastPow(0.5,1) = 0.5` → `0.5 × 0.5 × 0.5` = **0.125**.

**Q4.** **5** strings (the 3rd Catalan number), pushed in this order:

| Order | String | Path of choices |
|-------|--------|-----------------|
| 1 | `((()))` | ( ( ( ) ) ) |
| 2 | `(()())` | ( ( ) ( ) ) |
| 3 | `(())()` | ( ( ) ) ( ) |
| 4 | `()(())` | ( ) ( ( ) ) |
| 5 | `()()()` | ( ) ( ) ( ) |

Because `(` is always tried first, the results come out in lexicographic order (`'(' < ')'` in ASCII).

**Q5.** $O(N^2)$ time. Call $k$ copies a substring of length $N-k$ and concatenates a result of similar length, so the total work is about $(N-1) + (N-2) + \dots + 1 = \frac{N(N-1)}{2}$. For `"hello"`, `substr(1)` copies $4 + 3 + 2 + 1 = $ **10** characters (`"ello"`, `"llo"`, `"lo"`, `"o"`). Passing indices instead of substrings (like E2 in Chapter 1) removes this cost.

**E1 — reference solution**

```cpp
bool isPowerOfThree(int n) {
    if (n == 1) return true;                    // 3^0
    if (n <= 0 || n % 3 != 0) return false;     // Not divisible: stop
    return isPowerOfThree(n / 3);               // Recursive step
}
```

$O(\log_3 n)$ time and stack space. `27 → 9 → 3 → 1` returns true; `45 → 15 → 5`, and `5 % 3 = 2` returns false.

**E2 — reference solution**

```cpp
long long countWays(int n, vector<long long>& memo) {
    if (n < 0) return 0;                 // Overshot the top: not a valid way
    if (n == 0) return 1;                // Exactly at the top: one way
    if (memo[n] != -1) return memo[n];   // Already solved
    return memo[n] = countWays(n - 1, memo)
                   + countWays(n - 2, memo)
                   + countWays(n - 3, memo);
}
// Usage: vector<long long> memo(n + 1, -1); countWays(n, memo);
```

Each `n` is solved once → $O(n)$ time, $O(n)$ space. Values: $w(0)=1$, $w(1)=1$, $w(2)=w(1)+w(0)=2$, $w(3)=w(2)+w(1)+w(0)=4$, $w(4)=w(3)+w(2)+w(1)=4+2+1=7$.

**E3 — reference solution**

```cpp
void build(int n, string& cur, vector<string>& result) {
    if ((int)cur.size() == n) {           // Base case: full length
        result.push_back(cur);
        return;
    }
    cur.push_back('0');                   // '0' is always allowed
    build(n, cur, result);
    cur.pop_back();

    if (cur.empty() || cur.back() != '1') {   // '1' only if previous char isn't '1'
        cur.push_back('1');
        build(n, cur, result);
        cur.pop_back();
    }
}

vector<string> noConsecutiveOnes(int n) {
    vector<string> result;
    string cur;
    build(n, cur, result);
    return result;
}
```

The guard plays the role of `close < open` in Generate Parentheses: invalid branches are never entered. The count follows Fibonacci (2, 3, 5, 8, … for n = 1, 2, 3, 4), so time is $O(F_{n+2} \cdot n)$ and stack space $O(n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems recursion** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

