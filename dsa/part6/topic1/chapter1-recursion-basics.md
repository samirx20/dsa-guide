# Part 6, Topic 1: Recursion Fundamentals
## Chapter 1: Base Case & The Call Stack

Recursion is the foundation for Trees, Graphs, and Dynamic Programming. If you do not deeply understand recursion, you will struggle immensely in the second half of any interview process.

At its core, **Recursion is a function that calls itself**.

---

### 1. The Two Rules of Recursion

Every recursive function MUST have two parts. If either is missing, your code will fail or crash with a `StackOverflowError`.

1.  **The Base Case(s):** The condition where the function *stops* calling itself and returns a definitive answer. This prevents infinite loops.
2.  **The Recursive Step:** The part where the function calls itself with a *modified* input, moving closer to the Base Case.

**Example: Sum of numbers from 1 to N**
```cpp
int sum(int n) {
    // 1. The Base Case
    if (n == 1) {
        return 1;
    }

    // 2. The Recursive Step (moving n closer to 1)
    return n + sum(n - 1);
}
```

**What's happening:**
```cpp
int sum(int n) {
//           ^   ^
//           |   └── Recursive call with smaller input (n - 1)
//           └── Input parameter
//
// Think of it like Russian nesting dolls:
// sum(3) opens to reveal sum(2) inside
// sum(2) opens to reveal sum(1) inside
// sum(1) is the smallest doll (base case) - it returns 1
// Then each doll closes, adding its value:
//   sum(2) = 2 + 1 = 3
//   sum(3) = 3 + 3 = 6
}
```

### 2. Visualizing the Call Stack

During an interview, if you get stuck on a recursive problem, **do not stare at the code. Draw the Recursion Tree on the whiteboard.**

The OS uses a **Call Stack** to keep track of recursive calls. When `sum(n-1)` is called, the current function `sum(n)` pauses execution and waits for the answer.

Let's trace `sum(3)`:

1.  **Call `sum(3)`**: Is `3 == 1`? No. Return `3 + sum(2)`. (Pauses and waits for `sum(2)`).
2.  **Call `sum(2)`**: Is `2 == 1`? No. Return `2 + sum(1)`. (Pauses and waits for `sum(1)`).
3.  **Call `sum(1)`**: Is `1 == 1`? Yes! **Return 1**. (Hits the base case, the stack starts collapsing).

*Now the stack collapses (unwinds) back up:*
4.  `sum(2)` receives `1` from `sum(1)`. It returns `2 + 1 = 3`.
5.  `sum(3)` receives `3` from `sum(2)`. It returns `3 + 3 = 6`.

The final answer is 6.

**Call Stack Diagram:**
```
╔══════════════════════════════════════════════════════════════╗
║                     CALL STACK GROWTH                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Phase 1: Building the stack (going deeper)                 ║
║  ┌─────────────────────────────┐                            ║
║  │ sum(3): waiting for sum(2)  │ ← Pushed last             ║
║  ├─────────────────────────────┤                            ║
║  │ sum(2): waiting for sum(1)  │                           ║
║  ├─────────────────────────────┤                            ║
║  │ sum(1): base case hit!      │ ← First to return        ║
║  └─────────────────────────────┘                            ║
║                                                              ║
║  Phase 2: Unwinding the stack (returning answers)           ║
║  ┌─────────────────────────────┐                            ║
║  │ sum(3): 3 + 3 = 6           │ ← Final result           ║
║  ├─────────────────────────────┤                            ║
║  │ sum(2): 2 + 1 = 3           │                           ║
║  ├─────────────────────────────┤                            ║
║  │ sum(1): returns 1           │ ← Popped first           ║
║  └─────────────────────────────┘                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Dry-Run Table: Stack State at Each Step**

| Step | Function Call | n | Base Case? | Action | Stack Size |
|------|---------------|---|------------|--------|------------|
| 1 | `sum(3)` | 3 | No | Push `sum(3)`, call `sum(2)` | 1 |
| 2 | `sum(2)` | 2 | No | Push `sum(2)`, call `sum(1)` | 2 |
| 3 | `sum(1)` | 1 | Yes! | Return 1 | 3 |
| 4 | `sum(2)` | 2 | - | Receive 1, return 2+1=3 | 2 → 1 |
| 5 | `sum(3)` | 3 | - | Receive 3, return 3+3=6 | 1 → 0 |

### 3. Time and Space Complexity of Recursion

**Time Complexity:**
To find the time complexity, count the total number of nodes in your Recursion Tree. In our `sum(n)` example, the function is called exactly $N$ times. The time complexity is **$O(N)$**.

**Space Complexity (Crucial):**
The space complexity is equal to the **maximum depth of the recursion tree**.
Even though our `sum(n)` function doesn't allocate any arrays or maps, it puts $N$ frames on the Call Stack simultaneously before hitting the base case. Therefore, its Space Complexity is **$O(N)$**.

```
Recursion Tree for sum(5):
              sum(5)
             /      \
        5 + sum(4)
              /      \
         4 + sum(3)
              /      \
         3 + sum(2)
              /      \
         2 + sum(1) = 1
              |
         returns 3
              |
         returns 6
              |
         returns 10
              |
         returns 15

Tree depth = 4 (levels from root to leaf)
            = O(N) space
```

### 4. Common Recursion Patterns

#### Pattern 1: Linear Recursion (Single Branch)
One recursive call per function invocation. The recursion tree is a straight line.

```cpp
// Factorial: n! = n * (n-1)!
int factorial(int n) {
    if (n <= 1) return 1;        // Base case
    return n * factorial(n - 1); // Single recursive call
}
```

**What's happening:**
```
factorial(5)
│
└─ factorial(4)
   └─ factorial(3)
      └─ factorial(2)
         └─ factorial(1)  ← base case
         
Unwind:
5 * 24 = 120
4 * 6 = 24
3 * 2 = 6
2 * 1 = 2
```

| Complexity | Value |
|------------|-------|
| Time | $O(N)$ — one call per level |
| Space | $O(N)$ — N frames on stack |

#### Pattern 2: Binary Recursion (Two Branches)
Two recursive calls per function invocation. The recursion tree is a binary tree.

```cpp
// Fibonacci: F(n) = F(n-1) + F(n-2)
int fib(int n) {
    if (n <= 1) return n;         // Base case
    return fib(n - 1) + fib(n - 2); // Two recursive calls
}
```

**Recursion Tree for fib(4):**
```
                    fib(4)
                   /      \
              fib(3)      fib(2)
             /     \        /    \
         fib(2)  fib(1)  fib(1)  fib(0)
         /    \
     fib(1)  fib(0)

Total nodes: 9
Time: O(2^N) — EXPONENTIAL! (We will optimize with DP)
Space: O(N) — max depth is N
```

| Complexity | Value |
|------------|-------|
| Time | $O(2^N)$ — exponential explosion |
| Space | $O(N)$ — max depth, not total nodes |

**WARNING:** Binary recursion without memoization is almost always too slow for interviews. The key insight: **Time = total nodes, Space = max depth.** These are different!

#### Pattern 3: Tail Recursion (Last Action is the Call)
The recursive call is the LAST thing the function does. Some compilers optimize this to $O(1)$ space.

```cpp
// Sum using tail recursion
int sumHelper(int n, int accumulator) {
    if (n == 1) return accumulator;
    return sumHelper(n - 1, n + accumulator); // Call is LAST action
}

int sum(int n) {
    return sumHelper(n, 1);
}
```

**What's happening:**
```cpp
sumHelper(5, 1)  // accumulator = 1
sumHelper(4, 6)  // accumulator = 6
sumHelper(3, 10) // accumulator = 10
sumHelper(2, 13) // accumulator = 13
sumHelper(1, 15) // returns 15!
// No work left to do when each call returns!
// Compiler can reuse the same stack frame → O(1) space
```

### 5. The Anatomy of a Recursion Problem

Every recursion problem has the same skeleton. Let's break down `power(x, n)`:

```cpp
double power(double x, int n) {
    // 1. Base Cases (plural!)
    if (n == 0) return 1.0;      // x^0 = 1
    if (n == 1) return x;        // x^1 = x
    if (n < 0) return 1.0 / power(x, -n); // Handle negatives

    // 2. Recursive Step
    double half = power(x, n / 2);

    // 3. Combine Results
    if (n % 2 == 0) {
        return half * half;
    } else {
        return half * half * x;
    }
}
```

**What's happening:**
```
power(2, 8)
│
├─ half = power(2, 4)
│  ├─ half = power(2, 2)
│  │  ├─ half = power(2, 1)
│  │  │  └─ returns 2 (base case)
│  │  └─ returns 2 * 2 = 4
│  └─ returns 4 * 4 = 16
└─ returns 16 * 16 = 256

Instead of multiplying 8 times:
  2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 = 256  (O(N) - slow)
We multiply 3 times:
  2 * 2 = 4
  4 * 4 = 16
  16 * 16 = 256  (O(log N) - fast!)
```

| Complexity | Value |
|------------|-------|
| Time | $O(\log N)$ — halving at each step |
| Space | $O(\log N)$ — stack depth is log N |

### 6. Debugging Recursion: The Mental Model

**Interview Tip:** When stuck, draw three things:

1. **The Recursion Tree** — shows all calls
2. **The Call Stack** — shows which calls are waiting
3. **The Dry-Run Table** — tracks variables at each step

```
Common Recursion Mistakes:

❌ Missing base case → infinite recursion → StackOverflow
❌ Input not moving toward base case → infinite recursion
❌ Forgetting to return the recursive result → get 0 or garbage
❌ Using the wrong base case value → off-by-one errors
❌ Confusing time complexity (total nodes) with space complexity (max depth)
```

### 7. Converting Recursion to Iteration

Sometimes you need to eliminate the $O(N)$ space. You can simulate the call stack manually:

```cpp
// Recursive version
int sumRecursive(int n) {
    if (n == 1) return 1;
    return n + sumRecursive(n - 1);
}

// Iterative version (same logic, O(1) space)
int sumIterative(int n) {
    int result = 0;
    for (int i = n; i >= 1; i--) {
        result += i;
    }
    return result;
}
```

**When to convert:**
- Stack space is a bottleneck ($O(N)$ too much)
- The recursion is purely linear (single branch)
- The recursive call is the LAST action (tail recursion)

**When to keep recursion:**
- The problem naturally has tree/branching structure
- The code clarity matters more than micro-optimization
- Backtracking or divide-and-conquer patterns

---

### Quick Reference: Recursion Basics

| Concept | Description |
|---------|-------------|
| **Base Case** | Stops the recursion; prevents infinite loop |
| **Recursive Step** | Calls self with modified input, closer to base case |
| **Call Stack** | OS tracks each active function call |
| **Stack Frame** | Memory for one function call (local vars, return address) |
| **Time Complexity** | Count total nodes in recursion tree |
| **Space Complexity** | Maximum depth of recursion tree |
| **Tail Recursion** | Recursive call is last action; can be $O(1)$ space |
| **Stack Overflow** | Too many recursive calls exceed stack memory |
| **Dry-Run** | Trace variables at each step in a table |
| **Recursion Tree** | Visual diagram of all recursive calls |

| Pattern | Structure | Time | Space |
|---------|-----------|------|-------|
| Linear (1 branch) | `f(n) → f(n-1)` | $O(N)$ | $O(N)$ |
| Binary (2 branches) | `f(n) → f(n-1) + f(n-2)` | $O(2^N)$ | $O(N)$ |
| Divide (2 halves) | `f(n) → f(n/2) + f(n/2)` | $O(N)$ | $O(\log N)$ |
| Tail recursive | `f(n, acc)` with call last | $O(N)$ | $O(1)$ (optimized) |

---

## Practice & Self-Check

Work these on paper first — draw the call stack or recursion tree exactly as Section 6 recommends — then check yourself against the answers at the bottom.

### Predict the Output / Trace by Hand

**Q1. Fill in the dry-run table for `sum(4)`.** Using the chapter's `sum(int n)` (base case `n == 1`), complete the table below. What value is returned, and what is the maximum stack size reached?

| Step | Function Call | n | Base Case? | Action | Stack Size |
|------|---------------|---|------------|--------|------------|
| 1 | `sum(4)` | 4 | No | Push `sum(4)`, call `sum(3)` | 1 |
| 2 | ? | ? | ? | ? | ? |
| 3 | ? | ? | ? | ? | ? |
| 4 | ? | ? | ? | ? | ? |
| 5–7 | unwind | – | – | ? | ? |

**Q2. Count the nodes.** The chapter shows that `fib(4)` makes 9 calls in total. How many total calls does `fib(5)` make, and what is the maximum number of `fib` frames on the call stack at the same time? (Remember: *Time = total nodes, Space = max depth*.)

**Q3. Tail-recursive accumulator.** Using the chapter's `sumHelper(int n, int accumulator)` and wrapper `sum(n)` which calls `sumHelper(n, 1)`, list every call made by `sum(4)` with its `(n, accumulator)` pair. What is returned?

**Q4. Fast power.** Trace the chapter's `power(double x, int n)` for `power(3, 5)`. List each call, the value of `half`, and which branch (even/odd) of the combine step is taken. How many calls to `power` are made in total, and what is returned?

**Q5. Spot the bug.** A student calls the chapter's `sum(int n)` with `n = 0`. What happens, and which line of the "Common Recursion Mistakes" list does this fall under? Give a one-line fix to the base case that makes `sum(0)` return `0`.

### Coding Exercises

**E1 (Easy). Digit sum.** Write a recursive function that returns the sum of the decimal digits of a non-negative integer. Identify the base case and the recursive step explicitly.

```cpp
int digitSum(int n);
// digitSum(1234) -> 10
// digitSum(7)    -> 7
```

**E2 (Easy–Medium). Recursive palindrome check.** Using two indices that move toward each other, decide whether a string is a palindrome. No loops allowed.

```cpp
bool isPalindrome(const string& s, int left, int right);
// isPalindrome("racecar", 0, 6) -> true
// isPalindrome("abca", 0, 3)    -> false
```

**E3 (Medium). Modular fast power.** Extend the chapter's `power(x, n)` (halving trick) to compute $x^n \bmod m$ for $n \ge 0$ without overflow for $m \le 10^9$. It must run in $O(\log n)$ time.

```cpp
long long powMod(long long x, long long n, long long m);
// powMod(2, 10, 1000) -> 24   (1024 mod 1000)
// powMod(3, 5, 7)     -> 5    (243 mod 7)
```

#### Dry-Run: Answers

**Q1.** Returns **10**; maximum stack size is **4**.

| Step | Function Call | n | Base Case? | Action | Stack Size |
|------|---------------|---|------------|--------|------------|
| 1 | `sum(4)` | 4 | No | Push `sum(4)`, call `sum(3)` | 1 |
| 2 | `sum(3)` | 3 | No | Push `sum(3)`, call `sum(2)` | 2 |
| 3 | `sum(2)` | 2 | No | Push `sum(2)`, call `sum(1)` | 3 |
| 4 | `sum(1)` | 1 | Yes | Return 1 | 4 |
| 5 | `sum(2)` | 2 | – | Receive 1, return 2+1=3 | 3 |
| 6 | `sum(3)` | 3 | – | Receive 3, return 3+3=6 | 2 |
| 7 | `sum(4)` | 4 | – | Receive 6, return 4+6=10 | 1 → 0 |

**Q2.** **15 calls**, **5 frames** maximum. Let $C(n)$ be the number of calls made by `fib(n)`: $C(0)=C(1)=1$ and $C(n)=1+C(n-1)+C(n-2)$.

| n | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| $C(n)$ | 1 | 1 | 3 | 5 | 9 | 15 |

The deepest path is `fib(5) → fib(4) → fib(3) → fib(2) → fib(1)`, i.e. 5 frames alive at once — $O(N)$ space even though the time is exponential.

**Q3.** Returns **10**.

| Call | n | accumulator | Next call computes |
|------|---|-------------|--------------------|
| `sumHelper(4, 1)` | 4 | 1 | `sumHelper(3, 4+1)` |
| `sumHelper(3, 5)` | 3 | 5 | `sumHelper(2, 3+5)` |
| `sumHelper(2, 8)` | 2 | 8 | `sumHelper(1, 2+8)` |
| `sumHelper(1, 10)` | 1 | 10 | base case → return 10 |

**Q4.** **3 calls**, returns **243**.

| Call | n | half | n even? | Returns |
|------|---|------|---------|---------|
| `power(3, 5)` | 5 | `power(3, 2)` = 9 | No (odd) | 9 × 9 × 3 = 243 |
| `power(3, 2)` | 2 | `power(3, 1)` = 3 | Yes | 3 × 3 = 9 |
| `power(3, 1)` | 1 | – | – | base case → 3 |

Note `5 / 2 = 2` in integer division, which is why the odd branch multiplies by one extra `x`.

**Q5.** `sum(0)` never reaches `n == 1`: it calls `sum(-1)`, `sum(-2)`, … forever until the stack overflows. This is "Input not moving toward base case" (equivalently, the wrong base case). Fix: replace the base case with `if (n <= 0) return 0;` — then `sum(1) = 1 + sum(0) = 1` still works and `sum(0) = 0`.

**E1 — reference solution**

```cpp
int digitSum(int n) {
    if (n < 10) return n;              // Base case: a single digit
    return (n % 10) + digitSum(n / 10); // Last digit + sum of the rest
}
```

Time $O(d)$, space $O(d)$ where $d$ is the number of digits (about $\log_{10} n$). Trace: `digitSum(1234) = 4 + digitSum(123) = 4 + 3 + digitSum(12) = 4 + 3 + 2 + 1 = 10`.

**E2 — reference solution**

```cpp
bool isPalindrome(const string& s, int left, int right) {
    if (left >= right) return true;               // 0 or 1 chars left
    if (s[left] != s[right]) return false;        // Mismatch: stop early
    return isPalindrome(s, left + 1, right - 1);  // Shrink toward the middle
}
```

Time $O(n)$, space $O(n)$ stack (about $n/2$ frames). For `"abca"`: `'a' == 'a'`, then compare `s[1]='b'` with `s[2]='c'` → mismatch → `false`.

**E3 — reference solution**

```cpp
long long powMod(long long x, long long n, long long m) {
    if (n == 0) return 1 % m;                 // x^0 = 1 (handles m == 1)
    long long half = powMod(x, n / 2, m);     // Recursive step: halve n
    long long result = (half * half) % m;     // Combine
    if (n % 2 == 1) result = (result * (x % m)) % m;  // Odd: one extra x
    return result;
}
```

Time $O(\log n)$, space $O(\log n)$. Each product is below $m^2 \le 10^{18}$, which fits in `long long`. Check: `powMod(3, 5, 7)` → `powMod(3,2,7) = 9 % 7 = 2` → `2 × 2 = 4`, odd so `4 × 3 = 12 % 7 = 5`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Base Case & The Call Stack**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 recursion basics** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

