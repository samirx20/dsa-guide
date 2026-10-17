# Part 1, Topic 2: Time & Space Complexity
## Chapter 3: Space Complexity

While Time Complexity measures how long an algorithm takes, **Space Complexity** measures how much memory (RAM) an algorithm uses.

Crucially, in interviews, Space Complexity usually refers to **Auxiliary Space**. This is the *extra* memory your algorithm allocates. You do not count the memory taken up by the input parameters themselves.

---

### 1. Constant Space: $O(1)$

If you only allocate a few simple variables (integers, booleans, pointers), your space complexity is $O(1)$. It doesn't matter if the input array has 10 elements or 10 million elements; you are only using a fixed amount of extra RAM.

```cpp
// Input space doesn't count.
int findMax(vector<int>& arr) {
    int maxVal = arr[0]; // Extra space: 1 integer

    for (int i = 1; i < arr.size(); i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    return maxVal;
}
// Space Complexity: O(1)
```

**What's happening:**
```
arr = {5, 9, 2, 8, 3}

Variables used (auxiliary space only):
  maxVal = 5     (1 integer = 4 bytes)
  i = 1          (1 integer = 4 bytes)

Total auxiliary space: 8 bytes → O(1) constant

The input arr itself takes O(N) space, but we DON'T count input space
The question is: "How much EXTRA memory does the algorithm need?"
Answer: Just 2 integers, regardless of N → O(1)

Memory layout:
  ┌────────────────────────────────────┐
  │ Input (NOT counted):               │
  │   arr = [5, 9, 2, 8, 3]  (O(N))  │
  ├────────────────────────────────────┤
  │ Auxiliary (counted):               │
  │   maxVal = 9            (O(1))    │
  │   i = 4                 (O(1))    │
  └────────────────────────────────────┘
```

### 2. Linear Space: $O(N)$

If you create a new array, string, or hash map whose size scales directly with the input size $N$, your space complexity is $O(N)$.

```cpp
vector<int> copyEvens(vector<int>& arr) {
    vector<int> evens; // We are allocating a NEW array

    for (int num : arr) {
        if (num % 2 == 0) {
            evens.push_back(num); // Worst case: every number is even
        }
    }
    return evens;
}
// Space Complexity: O(N)
```

**What's happening:**
```
arr = {1, 2, 3, 4, 5, 6}

Processing:
  num=1: odd → skip
  num=2: even → evens = [2]
  num=3: odd → skip
  num=4: even → evens = [2, 4]
  num=5: odd → skip
  num=6: even → evens = [2, 4, 6]

Auxiliary space:
  evens vector: stores up to N/2 elements in worst case
  num variable: O(1)

  O(N/2) + O(1) = O(N) (drop constant 1/2)

Memory layout:
  ┌─────────────────────────────────────────┐
  │ Input (NOT counted):                    │
  │   arr = [1, 2, 3, 4, 5, 6]   (O(N))   │
  ├─────────────────────────────────────────┤
  │ Auxiliary (counted):                    │
  │   evens = [2, 4, 6]           (O(N))   │
  │   num = 6                     (O(1))   │
  └─────────────────────────────────────────┘

  Worst case: all N elements are even → evens has N elements
  Space = O(N)
```

### 3. The Hidden Space: Recursive Call Stacks

This is the biggest "gotcha" in interviews.
When you use Recursion (a function calling itself), it doesn't look like you are allocating any new arrays or maps. However, every time a function calls itself, the computer must pause the current function and push a "Frame" onto the OS **Call Stack** to remember where it was.

If a recursive function calls itself $N$ times before returning (hitting the base case), it places $N$ frames in memory.

```cpp
int factorial(int n) {
    if (n <= 1) return 1; // Base case

    // The function pauses here, and calls itself again.
    return n * factorial(n - 1);
}
```
If you call `factorial(5)`, the call stack looks like this before it can return the final answer:
1. `factorial(5)`
2. `factorial(4)`
3. `factorial(3)`
4. `factorial(2)`
5. `factorial(1)`

Because the maximum depth of the tree is $N$, the space required to hold those frames is $O(N)$.
**Space Complexity:** $O(N)$

**What's happening:**
```
Call Stack Visualization:

  factorial(5) called
  ┌──────────────────┐
  │ factorial(5)     │ ← waiting for factorial(4) to return
  │   n = 5          │
  │   return 5 * ?   │
  ├──────────────────┤
  │ factorial(4)     │ ← waiting for factorial(3)
  │   n = 4          │
  │   return 4 * ?   │
  ├──────────────────┤
  │ factorial(3)     │ ← waiting for factorial(2)
  │   n = 3          │
  │   return 3 * ?   │
  ├──────────────────┤
  │ factorial(2)     │ ← waiting for factorial(1)
  │   n = 2          │
  │   return 2 * ?   │
  ├──────────────────┤
  │ factorial(1)     │ ← base case! returns 1
  │   n = 1          │
  │   return 1       │
  └──────────────────┘

  Maximum stack depth = 5 = N → O(N) space

  As each frame returns:
  factorial(1) returns 1
  factorial(2) returns 2 * 1 = 2
  factorial(3) returns 3 * 2 = 6
  factorial(4) returns 4 * 6 = 24
  factorial(5) returns 5 * 24 = 120
```

**Dry-run table:**

| Call | `n` | Action | Stack Depth |
|------|-----|--------|-------------|
| `factorial(5)` | 5 | calls factorial(4) | 1 |
| `factorial(4)` | 4 | calls factorial(3) | 2 |
| `factorial(3)` | 3 | calls factorial(2) | 3 |
| `factorial(2)` | 2 | calls factorial(1) | 4 |
| `factorial(1)` | 1 | returns 1 (base case) | 5 |
| `factorial(2)` | 2 | returns 2×1=2 | 4 |
| `factorial(3)` | 3 | returns 3×2=6 | 3 |
| `factorial(4)` | 4 | returns 4×6=24 | 2 |
| `factorial(5)` | 5 | returns 5×24=120 | 1 |

### 4. Binary Tree Recursion Space

```cpp
int treeSum(TreeNode* root) {
    if (!root) return 0;
    return root->val + treeSum(root->left) + treeSum(root->right);
}
```

**What's happening:**
```
Tree:
        1
       / \
      2   3
     / \
    4   5

Call stack (worst case = height of tree):

  treeSum(1)
    treeSum(2)
      treeSum(4)
      treeSum(5)
    treeSum(3)

Maximum stack depth = height of tree = O(h)
  Balanced tree: h = log(N) → O(log N) space
  Skewed tree (like linked list): h = N → O(N) space

  For a balanced binary tree with N nodes:
    Height h = log₂(N)
    Space = O(log N)

  For a skewed tree (all left children):
    Height h = N
    Space = O(N)

  Always state which case you're analyzing!
```

### 5. 2D Array Space

```cpp
vector<vector<int>> createMatrix(int rows, int cols) {
    vector<vector<int>> matrix(rows, vector<int>(cols, 0));
    return matrix;
}
// Space Complexity: O(rows × cols)
```

**What's happening:**
```
matrix = createMatrix(3, 4):

  Memory layout:
  matrix[0] → [0, 0, 0, 0]  (4 ints)
  matrix[1] → [0, 0, 0, 0]  (4 ints)
  matrix[2] → [0, 0, 0, 0]  (4 ints)

  Total elements: rows × cols = 3 × 4 = 12
  Space: O(rows × cols) = O(N × M)

  If rows = cols = N → O(N²)
  This is common in DP problems (grid traversal)
  For N=1000: 1,000,000 integers = 4MB
  For N=10000: 100,000,000 integers = 400MB (may exceed memory limit!)
```

### 6. Hash Map Space

```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen; // O(N) space

    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}
// Space Complexity: O(N)
```

**What's happening:**
```
nums = {2, 7, 11, 15}, target = 9

Step 1: i=0, num=2, complement=7
  seen.count(7) = 0 → not found
  seen[2] = 0 → seen = {2:0}

Step 2: i=1, num=7, complement=2
  seen.count(2) = 1 → FOUND!
  return {seen[2], 1} = {0, 1}

Map size at most N entries (one per element)
Each entry: key (4 bytes) + value (4 bytes) + overhead (~32 bytes)
Space: O(N)

Memory layout:
  ┌──────────────────────────────────────┐
  │ Input (NOT counted):                 │
  │   nums = [2, 7, 11, 15]    (O(N))   │
  ├──────────────────────────────────────┤
  │ Auxiliary (counted):                 │
  │   seen = {2:0, 7:1}        (O(N))   │
  │   i, complement             (O(1))  │
  └──────────────────────────────────────┘
```

### 7. Space Complexity Summary Table

| Code Pattern | Auxiliary Space | Notes |
|-------------|----------------|-------|
| A few variables (int, bool) | $O(1)$ | Constant — doesn't grow |
| New array of size N | $O(N)$ | Worst case stores all elements |
| Hash map with N entries | $O(N)$ | One entry per input element |
| Recursive (depth N) | $O(N)$ | Each call = one stack frame |
| Recursive (balanced tree) | $O(\log N)$ | Height of balanced tree |
| 2D grid (N×M) | $O(NM)$ | rows × cols cells |
| Sorting in place | $O(\log N)$ | QuickSort stack space |
| Copy of entire input | $O(N)$ | Must mention "auxiliary" |

### 8. Time-Space Tradeoffs

Sometimes you can trade time for space, or vice versa:

```cpp
// Without extra space: O(N²) time, O(1) space
bool hasPairSum(vector<int>& arr, int target) {
    for (int i = 0; i < arr.size(); i++)
        for (int j = i+1; j < arr.size(); j++)
            if (arr[i] + arr[j] == target) return true;
    return false;
}

// With hash map: O(N) time, O(N) space
bool hasPairSum(vector<int>& arr, int target) {
    unordered_set<int> seen;
    for (int num : arr) {
        if (seen.count(target - num)) return true;
        seen.insert(num);
    }
    return false;
}
```

**What's happening:**
```
Time-Space Tradeoff:

  Approach 1 (brute force):
    Time:  O(N²) — nested loops
    Space: O(1)  — no extra data structures
    Good when: N is small (< 1000)

  Approach 2 (hash map):
    Time:  O(N) — single loop + O(1) hash lookup
    Space: O(N) — hash map stores up to N elements
    Good when: N is large, need speed

  Trade: use O(N) extra space to reduce time from O(N²) to O(N)

  Interview decision:
    - If interviewer says "optimize for time" → use hash map
    - If interviewer says "optimize for space" → use brute force
    - If not specified → mention both approaches!
```

### 9. Common Mistakes

```
MISTAKE 1: Counting input space
  "This function uses O(N) space because the input is size N"
  WRONG: Input space doesn't count in auxiliary space
  Say: "Auxiliary space is O(1) because I only use a few variables"

MISTAKE 2: Forgetting recursion space
  "This function has no arrays, so it's O(1) space"
  WRONG: If the function recurses N times, it's O(N) space
  Always check: does the function call itself? How deep?

MISTAKE 3: Saying O(N) when it's O(N²)
  Creating a 2D vector of size N×N → O(N²) space, not O(N)
  vector<vector<int>> grid(N, vector<int>(N)); // O(N²) space!

MISTAKE 4: Confusing total space with auxiliary space
  Total space = input + auxiliary = O(N) + O(1) = O(N)
  Auxiliary space = extra only = O(1)
  In interviews, always specify which one you mean

MISTAKE 5: Forgetting about string copies
  string s = "hello";       // O(1) — just a pointer (mostly)
  string copy = s;           // O(N) — full copy of characters
  Passing string by value:   // O(N) — creates a copy!
  Passing string by reference: // O(1) — just a pointer
  Always pass by const reference: void func(const string& s)
```

### 10. Recursive Space Analysis Pattern

```
When analyzing recursive space, answer these questions:

  1. How deep does the recursion go?
     factorial(N): N levels → O(N)
     Binary tree: height h → O(h)
       Balanced: h = log N → O(log N)
       Skewed: h = N → O(N)

  2. How much memory per stack frame?
     Each frame stores: parameters, local variables, return address
     If frame has O(1) local variables → O(1) per frame
     If frame creates an array → O(size) per frame

  3. Total auxiliary space = depth × per-frame size
     factorial(N): N frames × O(1) per frame = O(N)
     Some DP with memoization: N frames × O(1) per frame = O(N)
```

### Summary Checklist for the Interview
When you finish writing your code on the whiteboard or CoderPad, proactively follow this script:

1. *"Let's analyze the complexity."*
2. *"The Time Complexity is $O(X)$ because there is a loop iterating $N$ times."*
3. *"The Space (Auxiliary) Complexity is $O(Y)$ because I allocated a hash map which stores at most $N$ elements."* (OR *"The Space Complexity is $O(1)$ because I am only storing a few integer pointers and modifying the array in-place."*)

Do not wait for the interviewer to ask. Proving you understand the price tag of your code is the mark of a senior engineer.

### Quick Reference

| Code Pattern | Auxiliary Space | Notes |
|-------------|----------------|-------|
| A few variables | $O(1)$ | int, bool, pointers |
| New vector of size N | $O(N)` | Worst case stores all elements |
| Hash map / set | $O(N)` | One entry per unique element |
| Recursive (depth N) | $O(N)` | N stack frames |
| Recursive (balanced tree) | $O(\log N)` | Height = log N |
| 2D grid N×M | $O(NM)` | rows × cols |
| String copy | $O(N)` | Full character copy |
| Sort in-place | $O(\log N)` | QuickSort recursion depth |
| Sort with extra array | $O(N)` | Merge sort temp array |
| Two pointers | $O(1)` | Just two index variables |
| Sliding window | $O(1)` to $O(N)` | Depends on window storage |
| Memoization (DP) | $O(N)` to $O(N²)` | Depends on table size |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Space Complexity**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 space complexity** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

