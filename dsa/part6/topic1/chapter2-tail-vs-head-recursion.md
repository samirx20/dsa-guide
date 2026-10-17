# Part 6, Topic 1: Recursion Fundamentals
## Chapter 2: Head vs. Tail Recursion

Where you place the recursive call inside your function drastically changes how the algorithm behaves. Understanding this difference is crucial for Tree traversals (Preorder vs. Postorder).

---

### 1. Head Recursion (Doing work AFTER the call)

In Head Recursion, the recursive call happens *first*. The function calls itself, waits for the result, and then performs its logic on the way back up (as the stack unwinds).

```cpp
void printAscending(int n) {
    if (n == 0) return; // Base Case

    // 1. Recursive Call happens FIRST
    printAscending(n - 1);

    // 2. Work happens AFTER (during the unwind)
    cout << n << " ";
}
// Calling printAscending(3) prints: 1 2 3
```

**What's happening:**
```cpp
void printAscending(int n) {
    if (n == 0) return;
//  ^^^^^^^^^^^^^^^^^^
//  Base case: stop at 0

    printAscending(n - 1);
//  ^^^^^^^^^^^^^^^^^^^^^
//  Recursive call happens FIRST (before any work)

    cout << n << " ";
//  ^^^^^^^^^^^^^
//  Work happens AFTER the call returns
//  This means the deepest call (n=1) prints first
//  Then n=2 prints, then n=3
}
```

**Call Stack Visualization:**
```
╔══════════════════════════════════════════════════════════════════╗
║               HEAD RECURSION: printAscending(3)                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Phase 1: Building the stack (going deeper)                     ║
║  ┌──────────────────────────────────────────┐                   ║
║  │ printAscending(3): waiting for printA(2) │                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printAscending(2): waiting for printA(1) │                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printAscending(1): waiting for printA(0) │                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printAscending(0): base case! returns    │                   ║
║  └──────────────────────────────────────────┘                   ║
║                                                                  ║
║  Phase 2: Unwinding (WORK HAPPENS ON THE WAY UP)                ║
║                                                                  ║
║  printAscending(1) resumes: cout << 1 << " "  → prints "1"     ║
║  printAscending(2) resumes: cout << 2 << " "  → prints "2"     ║
║  printAscending(3) resumes: cout << 3 << " "  → prints "3"     ║
║                                                                  ║
║  Output: 1 2 3                                                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Why it prints `1 2 3`:**
- `printAscending(3)` pauses to call `(2)`.
- `printAscending(2)` pauses to call `(1)`.
- `printAscending(1)` pauses to call `(0)`.
- `printAscending(0)` hits the base case and returns.
- Now, `printAscending(1)` resumes and prints `1`.
- `printAscending(2)` resumes and prints `2`.
- `printAscending(3)` resumes and prints `3`.

**Dry-Run Table:**

| Step | Call | n | Action | Output So Far | Stack Size |
|------|------|---|--------|---------------|------------|
| 1 | `printA(3)` | 3 | Push stack, call `printA(2)` | "" | 1 |
| 2 | `printA(2)` | 2 | Push stack, call `printA(1)` | "" | 2 |
| 3 | `printA(1)` | 1 | Push stack, call `printA(0)` | "" | 3 |
| 4 | `printA(0)` | 0 | Base case, return | "" | 4 |
| 5 | `printA(1)` resumes | 1 | Print `1`, return | "1" | 3→2 |
| 6 | `printA(2)` resumes | 2 | Print `2`, return | "1 2" | 2→1 |
| 7 | `printA(3)` resumes | 3 | Print `3`, return | "1 2 3" | 1→0 |

---

### 2. Tail Recursion (Doing work BEFORE the call)

In Tail Recursion, the function performs its logic *first*, and the very last thing it does is call itself.

```cpp
void printDescending(int n) {
    if (n == 0) return; // Base Case

    // 1. Work happens FIRST
    cout << n << " ";

    // 2. Recursive call is the LAST operation
    printDescending(n - 1);
}
// Calling printDescending(3) prints: 3 2 1
```

**What's happening:**
```cpp
void printDescending(int n) {
    if (n == 0) return;

    cout << n << " ";
//  ^^^^^^^^^^^^^
//  Work happens FIRST (before the call)

    printDescending(n - 1);
//  ^^^^^^^^^^^^^^^^^^^^^^^^
//  Recursive call is the LAST action
//  This means n=3 prints immediately
//  Then n=2 prints, then n=1
}
```

**Call Stack Visualization:**
```
╔══════════════════════════════════════════════════════════════════╗
║             TAIL RECURSION: printDescending(3)                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Phase 1: Building the stack (WORK HAPPENS ON THE WAY DOWN)     ║
║                                                                  ║
║  printDescending(3) resumes: cout << 3 << " "  → prints "3"     ║
║  printDescending(2) resumes: cout << 2 << " "  → prints "2"     ║
║  printDescending(1) resumes: cout << 1 << " "  → prints "1"     ║
║                                                                  ║
║  Output: 3 2 1                                                  ║
║                                                                  ║
║  Phase 2: Unwinding (nothing left to do, just return)           ║
║  ┌──────────────────────────────────────────┐                   ║
║  │ printDescending(3): waiting for printD(2)│                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printDescending(2): waiting for printD(1)│                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printDescending(1): waiting for printD(0)│                   ║
║  ├──────────────────────────────────────────┤                   ║
║  │ printDescending(0): base case! returns   │                   ║
║  └──────────────────────────────────────────┘                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Dry-Run Table:**

| Step | Call | n | Action | Output So Far | Stack Size |
|------|------|---|--------|---------------|------------|
| 1 | `printD(3)` | 3 | Print `3`, call `printD(2)` | "3" | 1 |
| 2 | `printD(2)` | 2 | Print `2`, call `printD(1)` | "3 2" | 2 |
| 3 | `printD(1)` | 1 | Print `1`, call `printD(0)` | "3 2 1" | 3 |
| 4 | `printD(0)` | 0 | Base case, return | "3 2 1" | 4 |
| 5-7 | unwind | — | Return (no work left) | "3 2 1" | → 0 |

---

### 3. Why Tail Recursion is Special (Optimization)

Some modern compilers (like GCC or Clang for C++) can perform **Tail Call Optimization (TCO)**.

If the recursive call is the absolute last instruction in the function (like in `printDescending`), the compiler realizes that the current function doesn't need to "wait" for the result because it has no more work to do!

Instead of adding a new frame to the Call Stack, the compiler reuses the current frame. This magically reduces the Space Complexity from $O(N)$ to $O(1)$ and prevents StackOverflow errors.

**With vs Without TCO:**

```
╔══════════════════════════════════════════════════════════════╗
║              WITHOUT Tail Call Optimization                   ║
╠══════════════════════════════════════════════════════════════╣
║  Stack frame 3: printD(1) → waiting for printD(0)           ║
║  Stack frame 2: printD(2) → waiting for printD(1)           ║
║  Stack frame 1: printD(3) → waiting for printD(2)           ║
║                                                              ║
║  Space: O(N) — N frames on stack                             ║
╠══════════════════════════════════════════════════════════════╣
║              WITH Tail Call Optimization                      ║
╠══════════════════════════════════════════════════════════════╣
║  Stack frame 1: printD(1) → done, replaced printD(2)        ║
║                                                              ║
║  Space: O(1) — only ONE frame ever exists                    ║
╚══════════════════════════════════════════════════════════════╝
```

*(Note: While good to know for trivia, in interviews, you should generally state the worst-case Space Complexity as $O(N)$ assuming the compiler doesn't optimize it).*

---

### 4. Head vs Tail Recursion: Comparison Table

| Property | Head Recursion | Tail Recursion |
|----------|---------------|----------------|
| **Recursive call position** | First action | Last action |
| **Work done** | On unwind (after call) | Before call (on the way down) |
| **Output order** | Reversed (1, 2, 3) | Same as call order (3, 2, 1) |
| **Compiler optimization** | NOT optimizable | TCO possible → $O(1)$ space |
| **Space complexity** | $O(N)$ always | $O(1)$ if TCO, else $O(N)$ |
| **StackOverflow risk** | High for large N | Low if TCO enabled |
| **Tree traversal analogy** | Postorder (children first) | Preorder (node first) |
| **Can be converted to loop?** | Yes (reversal needed) | Yes (direct translation) |

**Interview Tip:** When asked about recursion space, say: "The space is $O(N)$ worst case. With tail call optimization, it could be $O(1)$, but I wouldn't rely on that in production."

---

### 5. Tree Traversal Parallels

If you understand Head vs. Tail recursion, Tree traversals become trivial:

**Preorder (Tail Recursion Pattern):**
```cpp
// Work (print), then recurse — like printDescending
void preorder(TreeNode* root) {
    if (root == nullptr) return;

    cout << root->val << " ";  // WORK FIRST
    preorder(root->left);      // Recurse left
    preorder(root->right);     // Recurse right
}
```

**Postorder (Head Recursion Pattern):**
```cpp
// Recurse first, then work — like printAscending
void postorder(TreeNode* root) {
    if (root == nullptr) return;

    postorder(root->left);     // Recurse left first
    postorder(root->right);    // Recurse right first
    cout << root->val << " ";  // WORK LAST
}
```

**Inorder (Mixed Pattern):**
```cpp
// Recurse left, work, recurse right
void inorder(TreeNode* root) {
    if (root == nullptr) return;

    inorder(root->left);       // Recurse left
    cout << root->val << " ";  // WORK IN MIDDLE
    inorder(root->right);      // Recurse right
}
```

**Visual Comparison:**

```
Tree:       1
           / \
          2   3
         / \
        4   5

Preorder (Tail):   1, 2, 4, 5, 3  — Node first (work first)
Inorder (Mixed):   4, 2, 5, 1, 3  — Node in middle
Postorder (Head):  4, 5, 2, 3, 1  — Node last (work last)
```

---

### 6. Converting Head Recursion to Iteration

Head recursion can always be converted to iteration by reversing the work order:

```cpp
// Head recursion version
void printAscending(int n) {
    if (n == 0) return;
    printAscending(n - 1);  // Call first
    cout << n << " ";        // Work after
}

// Iterative equivalent
void printAscendingIterative(int n) {
    for (int i = 1; i <= n; i++) {  // Reverse the order
        cout << i << " ";
    }
}
```

**Why it works:** Head recursion does work on the way up. The way up is the reverse of the way down. So we just loop in the forward direction.

---

### Quick Reference: Head vs Tail Recursion

| Concept | Head Recursion | Tail Recursion |
|---------|---------------|----------------|
| Call position | First | Last |
| Work timing | After call | Before call |
| Output order | Reversed | Same as input |
| TCO optimizable | No | Yes |
| Space | $O(N)$ | $O(1)$ if TCO |
| Tree traversal | Postorder | Preorder |
| Converts to loop | Reverse loop | Direct loop |
| Risk | StackOverflow | Safe (with TCO) |

---

## Practice & Self-Check

The single most useful habit from this chapter: before predicting output, ask *"does the work happen before the call (on the way down) or after it (on the way up)?"*

### Predict the Output / Trace by Hand

**Q1. Work on both sides.** This function mixes the chapter's `printDescending` and `printAscending` into one body. What does `mystery(3)` print? Is it tail recursive?

```cpp
void mystery(int n) {
    if (n == 0) return;
    cout << n << " ";   // work BEFORE the call
    mystery(n - 1);
    cout << n << " ";   // work AFTER the call
}
```

**Q2. Stack snapshot.** Call `printAscending(4)` from the chapter. (a) What is the maximum stack size reached? (b) At the exact moment the character `3` is printed, which frames are on the call stack?

**Q3. Which are tail recursive?** For each function, say whether the recursive call is the *last action* (TCO-eligible) or not, and why.

```cpp
// (a)
int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }
// (b)
int factAcc(int n, int acc) { if (n <= 1) return acc; return factAcc(n - 1, acc * n); }
// (c)
int countDown(int n) { if (n == 0) return 0; return 1 + countDown(n - 1); }
// (d)
void printDescending(int n) { if (n == 0) return; cout << n << " "; printDescending(n - 1); }
```

**Q4. Traversals on a new tree.** Using the chapter's `preorder`, `inorder`, and `postorder` functions, write the output for this tree:

```
        5
       / \
      3   8
     /   / \
    1   7   9
```

### Coding Exercises

**E1 (Easy). Tail-recursive factorial.** Write factorial so that the recursive call is the very last operation (carry the partial product in an accumulator, like `sumHelper` in Chapter 1).

```cpp
long long factTail(int n, long long acc = 1);
// factTail(5) -> 120
// factTail(0) -> 1
```

**E2 (Easy–Medium). Print an array backwards with head recursion.** Called with `i = 0`, print the elements from last to first. You may not index from the end — the reversal must come from doing the work *after* the call.

```cpp
void printReverse(const vector<int>& a, int i);
// a = {10, 20, 30}, printReverse(a, 0) prints: 30 20 10
// a = {},           printReverse(a, 0) prints nothing
```

**E3 (Medium). Decimal to binary string.** Return the binary representation of a non-negative integer. Repeated `n % 2` produces bits from least to most significant — use head recursion so the most significant bit naturally ends up first.

```cpp
string toBinary(int n);
// toBinary(6)  -> "110"
// toBinary(13) -> "1101"
// toBinary(0)  -> "0"
```

#### Dry-Run: Answers

**Q1.** Prints **`3 2 1 1 2 3`**. It is **not** tail recursive — there is a `cout` after the recursive call, so each frame must wait.

| Event | Output so far |
|-------|---------------|
| `mystery(3)` prints before call | `3` |
| `mystery(2)` prints before call | `3 2` |
| `mystery(1)` prints before call | `3 2 1` |
| `mystery(0)` base case returns | `3 2 1` |
| `mystery(1)` resumes, prints after | `3 2 1 1` |
| `mystery(2)` resumes, prints after | `3 2 1 1 2` |
| `mystery(3)` resumes, prints after | `3 2 1 1 2 3` |

**Q2.** (a) **5** frames: `printA(4)`, `printA(3)`, `printA(2)`, `printA(1)`, `printA(0)`. (b) When `3` is printed, `printA(0)`, `printA(1)` and `printA(2)` have already returned (having printed `1 2`), so the stack holds **`printA(4)` (waiting) and `printA(3)` (printing)** — size 2.

**Q3.**

| Function | Tail recursive? | Reason |
|----------|-----------------|--------|
| (a) `fact` | No | Must multiply `n *` the result after the call returns |
| (b) `factAcc` | Yes | The call's result is returned directly; nothing left to do |
| (c) `countDown` | No | Must add `1 +` after the call returns |
| (d) `printDescending` | Yes | `cout` happens before; the call is the last statement |

**Q4.**

| Traversal | Output |
|-----------|--------|
| Preorder (node first) | `5 3 1 8 7 9` |
| Inorder (node in middle) | `1 3 5 7 8 9` |
| Postorder (node last) | `1 3 7 9 8 5` |

Inorder of this tree is sorted because it is a Binary Search Tree — a preview of the Trees phase.

**E1 — reference solution**

```cpp
long long factTail(int n, long long acc = 1) {
    if (n <= 1) return acc;              // Base case: nothing left to multiply
    return factTail(n - 1, acc * n);     // Tail call: work already done in acc
}
```

Time $O(n)$; space $O(1)$ with TCO, $O(n)$ without. Trace for 5: `(5,1) → (4,5) → (3,20) → (2,60) → (1,120)` → returns 120.

**E2 — reference solution**

```cpp
void printReverse(const vector<int>& a, int i) {
    if (i == (int)a.size()) return;   // Base case: past the end
    printReverse(a, i + 1);           // Recurse FIRST (head recursion)
    cout << a[i] << " ";              // Work on the way back up
}
```

Time $O(n)$, space $O(n)$. The deepest frame (`i = 2`) prints first, so the output is `30 20 10`.

**E3 — reference solution**

```cpp
string toBinary(int n) {
    if (n < 2) return string(1, char('0' + n));      // Base case: "0" or "1"
    return toBinary(n / 2) + char('0' + n % 2);       // Higher bits first, then this bit
}
```

Time $O(\log n)$ calls (string concatenation adds an $O(\log n)$ factor in total, i.e. $O(\log^2 n)$ character copies), space $O(\log n)$ stack. Trace for 13: `toBinary(13) = toBinary(6) + '1' = (toBinary(3) + '0') + '1' = ((toBinary(1) + '1') + '0') + '1' = "1101"`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Head vs. Tail Recursion**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 tail vs head recursion** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

