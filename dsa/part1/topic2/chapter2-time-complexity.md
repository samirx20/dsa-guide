# Part 1, Topic 2: Time & Space Complexity
## Chapter 2: Time Complexity Analysis

To determine the Time Complexity of your solution, you need to count how many times your code loops relative to the input variables.

Here is a practical guide to analyzing common code patterns.

---

### 1. Single Loops: $O(N)$

If you loop through an array of size $N$ once, the time complexity is $O(N)$.

```cpp
void printAll(vector<int>& arr) {
    // N is arr.size(). The loop runs N times.
    for (int i = 0; i < arr.size(); i++) {
        cout << arr[i]; // O(1) operation
    }
}
// Time Complexity: O(N)
```

**What's happening:**
```
arr = {10, 20, 30, 40, 50}, N = 5

Iteration 1: i=0 → print arr[0] = 10
Iteration 2: i=1 → print arr[1] = 20
Iteration 3: i=2 → print arr[2] = 30
Iteration 4: i=3 → print arr[3] = 40
Iteration 5: i=4 → print arr[4] = 50
i=5 → 5 < 5 is false → exit loop

Total operations: 5 (one per element) → O(N)
If N doubles to 10, operations double to 10 → linear growth
```

**Dry-run table:**

| Iteration | `i` | `arr[i]` | Action |
|-----------|-----|----------|--------|
| 1 | 0 | 10 | print 10 |
| 2 | 1 | 20 | print 20 |
| 3 | 2 | 30 | print 30 |
| 4 | 3 | 40 | print 40 |
| 5 | 4 | 50 | print 50 |

### 2. Consecutive Loops: $O(N)$

What if you have two loops, one after the other?

```cpp
void printTwice(vector<int>& arr) {
    for (int i = 0; i < arr.size(); i++) {
        cout << arr[i];
    }
    for (int i = 0; i < arr.size(); i++) {
        cout << arr[i];
    }
}
```
The exact time is $O(N + N) = O(2N)$.
According to Rule 2 (Drop the Constants), we ignore the `2`.
**Time Complexity:** $O(N)$

**What's happening:**
```
Loop 1: runs N times (print all elements)
Loop 2: runs N times (print all elements again)

Total: N + N = 2N operations
Drop the constant 2: → O(N)

Why? If N goes from 1000 to 2000:
  2N goes from 2000 to 4000 (doubled)
  It's still LINEAR growth, just with a constant factor of 2
  Big O cares about the GROWTH RATE, not the exact count
```

### 3. Nested Loops: $O(N^2)$

If you put a loop *inside* another loop, the inner loop runs to completion for *every single iteration* of the outer loop. You multiply them.

```cpp
void printPairs(vector<int>& arr) {
    // Outer loop runs N times
    for (int i = 0; i < arr.size(); i++) {
        // Inner loop runs N times
        for (int j = 0; j < arr.size(); j++) {
            cout << arr[i] << ", " << arr[j];
        }
    }
}
// N * N = N^2
// Time Complexity: O(N^2)
```

**What's happening:**
```
arr = {1, 2, 3}, N = 3

Outer i=0: Inner j=0,1,2 → print (1,1)(1,2)(1,3) → 3 iterations
Outer i=1: Inner j=0,1,2 → print (2,1)(2,2)(2,3) → 3 iterations
Outer i=2: Inner j=0,1,2 → print (3,1)(3,2)(3,3) → 3 iterations

Total: 3 × 3 = 9 = N²
For N=100: 10,000 pairs
For N=1000: 1,000,000 pairs → still OK
For N=10,000: 100,000,000 pairs → likely timeout!
```

**The Tricky Nested Loop:**
What if the inner loop doesn't start at 0, but starts at `i + 1`?

```cpp
void printUniquePairs(vector<int>& arr) {
    for (int i = 0; i < arr.size(); i++) {
        for (int j = i + 1; j < arr.size(); j++) {
            cout << arr[i] << ", " << arr[j];
        }
    }
}
```
When `i = 0`, the inner loop runs $N-1$ times.
When `i = 1`, it runs $N-2$ times... down to 1 time.
This is an arithmetic progression: $(N-1) + (N-2) + \dots + 1 \approx \frac{N^2}{2}$.
We drop the constant (the divided by 2).
**Time Complexity:** $O(N^2)$

**What's happening (tricky loop):**
```
arr = {1, 2, 3, 4}, N = 4

i=0: j=1,2,3 → print (1,2)(1,3)(1,4) → 3 iterations
i=1: j=2,3   → print (2,3)(2,4)       → 2 iterations
i=2: j=3     → print (3,4)             → 1 iteration
i=3: j=4     → j < N is false          → 0 iterations

Total: 3 + 2 + 1 + 0 = 6 = (N-1)*N/2 = 3*4/2 = 6
Drop the /2 constant: O(N²) ✓

Note: This prints only UNIQUE pairs (no (1,1), (2,2), etc.)
The full nested loop prints ALL pairs including self-pairs
Both are O(N²) — just different constants
```

**Dry-run table (tricky loop):**

| `i` | `j` runs | Iterations | Pairs printed |
|-----|----------|------------|---------------|
| 0 | 1, 2, 3 | 3 | (1,2), (1,3), (1,4) |
| 1 | 2, 3 | 2 | (2,3), (2,4) |
| 2 | 3 | 1 | (3,4) |
| 3 | — | 0 | — |
| **Total** | | **6** | N(N-1)/2 = 6 |

### 4. Multiple Inputs: $O(N + M)$

If a function takes two different arrays, they do not have the same size! You must use different variables to represent them (usually $N$ and $M$).

```cpp
void printBoth(vector<int>& A, vector<int>& B) {
    // Let N = A.size()
    for (int i = 0; i < A.size(); i++) {
        cout << A[i];
    }
    // Let M = B.size()
    for (int i = 0; i < B.size(); i++) {
        cout << B[i];
    }
}
// Time Complexity: O(N + M).  (DO NOT SAY O(N)!)
```

**What's happening:**
```
A = {1, 2, 3}, N = 3
B = {10, 20},  M = 2

Loop 1: prints A[0], A[1], A[2] → 3 operations
Loop 2: prints B[0], B[1]       → 2 operations

Total: 3 + 2 = 5 = N + M

If N=1000, M=500 → 1500 operations
If N=1000, M=1000 → 2000 operations (N + M = 2N → O(N) only if N==M)
If N=1000, M=5 → 1005 operations

Since N and M are INDEPENDENT variables, you CANNOT simplify
O(N + M) to O(N) or O(M) — they are different sizes!
```

### 5. Logarithmic Loops: $O(\log N)$

If a loop doesn't increment by 1 (`i++`), but rather doubles or halves the search space (`i *= 2` or `i /= 2`), it runs in logarithmic time.

```cpp
void logarithmic(int n) {
    int i = 1;
    while (i < n) {
        cout << i;
        i = i * 2; // Notice the multiplication!
    }
}
// If n = 16, i goes: 1, 2, 4, 8, 16. (It only looped 4 times, not 16).
// Time Complexity: O(log N)
```

**What's happening:**
```
n = 16

Iteration 1: i=1   → 1 < 16 ✓ → i becomes 2
Iteration 2: i=2   → 2 < 16 ✓ → i becomes 4
Iteration 3: i=4   → 4 < 16 ✓ → i becomes 8
Iteration 4: i=8   → 8 < 16 ✓ → i becomes 16
Iteration 5: i=16  → 16 < 16 ✗ → exit

Total: 4 iterations (not 16!)
2^4 = 16, so log₂(16) = 4

For n=1,000,000: only ~20 iterations!
For n=1,000,000,000: only ~30 iterations!

This is why binary search is so powerful:
  Linear search on 1M elements = up to 1,000,000 comparisons
  Binary search on 1M elements = up to 20 comparisons
```

**Dry-run table:**

| Iteration | `i` | `i < 16`? | `i` after `*= 2` |
|-----------|-----|-----------|-------------------|
| 1 | 1 | Yes | 2 |
| 2 | 2 | Yes | 4 |
| 3 | 4 | Yes | 8 |
| 4 | 8 | Yes | 16 |
| 5 | 16 | No | — (exit) |

### 6. Accounting for STL Functions

A common mistake is thinking a single `for` loop is always $O(N)$. If you use an STL function inside the loop, you must multiply the loop time by the STL function's time!

```cpp
void badCode(vector<int>& arr) {
    for (int i = 0, n = arr.size(); i < n; i++) { // Loops O(N) times
        // .insert() at the front of a vector takes O(N) time!
        arr.insert(arr.begin(), 99);
    }
}
// Time Complexity: O(N * N) = O(N^2)
```

**What's happening:**
```
arr = {1, 2, 3}, N = 3

Iteration 1: insert at front → shift 3 elements → O(N) work
  arr = {99, 1, 2, 3}  (size is now 4)

Iteration 2: insert at front → shift 4 elements → O(N) work
  arr = {99, 99, 1, 2, 3}  (size is now 5)

Iteration 3: insert at front → shift 5 elements → O(N) work
  arr = {99, 99, 99, 1, 2, 3}  (size is now 6)

Wait — the array is GROWING! Each insert at front shifts ALL existing elements.
Iteration 1: shifts N elements
Iteration 2: shifts N+1 elements
Iteration 3: shifts N+2 elements
...
Total shifts: N + (N+1) + ... + (2N-1) = N(3N-1)/2 → O(N²)

Each insert shifts even more than N elements because the array grows, but the total is still O(N²).
```

### 7. Amortized O(1) — The Hidden Constant

When you `push_back` to a `vector`, it's usually $O(1)$. But occasionally, the vector must resize (double its capacity), which takes $O(N)$ to copy all elements.

```cpp
vector<int> v;
for (int i = 0; i < N; i++) {
    v.push_back(i);  // Amortized O(1)!
}
// Total: O(N) — NOT O(N²)
```

**What's happening:**
```
vector resize pattern:

  Capacity:  1 → 2 → 4 → 8 → 16 → 32 → ...
  Push_back: 1   2   4    8    16    32  ... (cost to copy)

  For N pushes:
    N-1 pushes are O(1) — just append
    ~log(N) pushes trigger resize — O(current_capacity) each

  Total copies: 1 + 2 + 4 + 8 + ... + N ≈ 2N
  Total operations: N pushes + 2N copies = 3N → O(N)
  Per push: 3N / N = 3 → amortized O(1)

  "Amortized" means: averaged over many operations,
  each push_back is O(1) even though occasional ones are O(N)
```

### 8. Recursion Time Complexity

```cpp
// Factorial: O(N) time
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// Fibonacci (naive): O(2^N) time
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

**What's happening:**
```
factorial(5):
  factorial(5) → 5 * factorial(4)
    factorial(4) → 4 * factorial(3)
      factorial(3) → 3 * factorial(2)
        factorial(2) → 2 * factorial(1)
          factorial(1) → 1 (base case)
  Total calls: 5 → O(N)

fib(5):
  fib(5) → fib(4) + fib(3)
    fib(4) → fib(3) + fib(2)
      fib(3) → fib(2) + fib(1)
        fib(2) → fib(1) + fib(0)   ← 2 base cases
      fib(2) → fib(1) + fib(0)
    fib(3) → fib(2) + fib(1)
      fib(2) → fib(1) + fib(0)

  Total calls: 15 (for fib(5))
  For fib(N): ~2^N calls (exponential tree)
  fib(30) ≈ 2.7 million calls
  fib(40) ≈ 331 million calls → VERY SLOW

  This is why naive recursion for fibonacci is O(2^N)
  (Use dynamic programming to fix it → O(N))
```

### 9. Common Time Complexity Patterns

| Code Pattern | Time Complexity | Example |
|-------------|----------------|---------|
| Single loop over N | $O(N)$ | `for(i=0; i<N; i++)` |
| Two consecutive loops | $O(N)$ | Two `for` loops back to back |
| Nested loops (both N) | $O(N^2)$ | `for` inside `for` |
| Nested loops (N and M) | $O(NM)$ | Different size loops |
| Halving/doubling loop | $O(\log N)$ | `while(n>1) n/=2` |
| Sort + loop | $O(N \log N)$ | `sort()` then `for` |
| Triple nested loop | $O(N^3)$ | Three `for` loops |
| All subsets | $O(2^N)$ | `for(mask=0; mask<(1<<N); mask++)` |
| All permutations | $O(N!)$ | `next_permutation` in loop |

### 10. Common Mistakes

```
MISTAKE 1: "It's O(1) because there's no loop"
  WRONG: Recursion without a loop can still be O(N), O(2^N), etc.
  Check if the function calls itself!

MISTAKE 2: "Nested loops are always O(N²)"
  WRONG: If inner loop depends on outer:
    for(i=0; i<N; i++)
      for(j=0; j<i; j++)  // runs i times, not N times
    This is still O(N²) but with a smaller constant (N²/2)
  And if inner loop runs constant times:
    for(i=0; i<N; i++)
      for(j=0; j<5; j++)  // runs 5 times, not N times
    This is O(N), not O(N²)!

MISTAKE 3: Forgetting STL function costs
  vector.insert(begin, val) → O(N) — shifts all elements
  vector.push_back(val)     → O(1) amortized — fast!
  set.insert(val)           → O(log N)
  unordered_set.insert(val) → O(1) average

MISTAKE 4: "O(N) + O(N) = O(N²)"
  WRONG: O(N) + O(N) = O(2N) = O(N)
  Addition of same complexity → O(N)
  Multiplication → O(N²)
```

### Quick Reference

| Pattern | Time | How to Identify |
|---------|------|-----------------|
| No loops, no recursion | $O(1)$ | Just arithmetic, conditionals |
| Single loop over N | $O(N)$ | One `for` or `while` with linear progression |
| Two sequential loops | $O(N)$ | Two loops one after another |
| Nested loops (both N) | $O(N^2)$ | Loop inside loop, both iterate N times |
| Nested loops (N and M) | $O(NM)$ | Different size inputs |
| Halving/doubling loop | $O(\log N)$ | `i *= 2` or `n /= 2` |
| Sort then iterate | $O(N \log N)$ | `sort()` + `for` loop |
| Triple nested | $O(N^3)$ | Three nested loops |
| Recursive (2 calls) | $O(2^N)$ | `f(n) = f(n-1) + f(n-1)` |
| Recursive (N calls) | $O(N!)$ | `T(n) = n * T(n-1)` (n calls of size n-1) |
| Amortized push_back | $O(1)$ per push | Vector resize is O(N) but rare |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Time Complexity Analysis**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 time complexity** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

