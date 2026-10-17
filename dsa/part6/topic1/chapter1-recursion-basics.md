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

