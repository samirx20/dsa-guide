# Part 1, Topic 2: Time & Space Complexity
## Chapter 1: Big O Notation

During a technical interview, solving the problem is only half the battle. The moment you put down your marker (or finish typing), the interviewer will ask: **"What is the time and space complexity of your solution?"**

If you cannot answer this confidently, or if you guess wrong, you will likely fail the interview. You must learn to read code and translate it into mathematical notation.

---

### 1. What is Big O?

Big O notation is a mathematical way to describe how the runtime (Time Complexity) or memory usage (Space Complexity) of an algorithm grows as the input size (usually denoted as $N$) grows.

It answers the question: *If the input array goes from 10 elements to 10 million elements, how much slower will this code run?*

```
Growth Rate Visualization (operations vs input size N):

 Operations │
     100M ─ │                                          · · · · · · · · · · · · N!
      10M ─ │                                    · · · ·
       1M ─ │                              · · ·
      100K ─ │                        · · ·          · · · · · · · 2^N
       10K ─ │                  · · ·
        1K ─ │            · · · · · · · · · · · · · · · · · · · N²
        100 ─ │      · · · · · · · · · · · · · · N log N
         10 ─ │· · · · · · · · · · · · · · · · · · · · · N
          1 ─ │· · · · · · · · · · · · · · · · · · · · · · · · log N
            0─┼───┬───┬───┬───┬───┬───┬───┬───┬───┬───
              1   2   4   8  16  32  64 128 256 512  N

 N=10:  logN≈3, N=10, N²=100, 2^N=1024, N!=3.6M
 N=100: logN≈7, N=100, N²=10000, 2^N=10^30, N!=huge
```

### 2. The Two Rules of Big O

When analyzing code for an interview, we simplify the math using two strict rules:

#### Rule 1: Only the Worst-Case Scenario Matters
If you write a function to search for the number `5` in an array, and the array happens to be `[5, 1, 2, 3]`, your function finds it instantly on the first try.
However, Big O doesn't care if you get lucky. Big O asks: "What if the number `5` isn't in the array at all?" Your code would have to check every single element before returning `false`. Therefore, the time complexity is tied to the total number of elements, $N$.

#### Rule 2: Drop the Constants and Non-Dominant Terms
Big O is about the *trend* as $N$ approaches infinity, not exact exact millisecond calculations.

- If your code has three separate `for` loops that each run $N$ times, the exact time is $O(3N)$. We **drop the constant** and just call it $O(N)$.
- If your code has a nested loop that runs $N \times N$ times, followed by a single loop that runs $N$ times, the exact time is $O(N^2 + N)$. Because $N^2$ grows infinitely faster than $N$, the $N$ becomes irrelevant. We **drop the non-dominant term** and just call it $O(N^2)$.

**What's happening (Rule 1):**
```
Array: [5, 1, 2, 3]
Search for 5:

  Best Case:  find 5 at index 0 → 1 comparison
  Worst Case: search for 99 (not in array) → 4 comparisons (all N elements)

  Big O uses WORST CASE: O(N)
  Why? Because you must write code that works for ALL inputs,
  including the worst case. If your code relies on "getting lucky,"
  it will fail when the interviewer gives you the worst case.
```

**What's happening (Rule 2):**
```
Example 1: Three consecutive loops
  for(i=0; i<N; i++) { ... }  → N operations
  for(i=0; i<N; i++) { ... }  → N operations
  for(i=0; i<N; i++) { ... }  → N operations
  Total = N + N + N = 3N
  Drop constant 3 → O(N) ✓

Example 2: Nested + sequential
  for(i=0; i<N; i++)
    for(j=0; j<N; j++) { ... }  → N × N = N²
  for(i=0; i<N; i++) { ... }    → N
  Total = N² + N
  Drop non-dominant N → O(N²) ✓

Why drop constants?
  N=1,000,000:
    3N = 3,000,000
    N  = 1,000,000
    Both are "about a million" operations
    The constant factor (3x) doesn't change the growth RATE
```

### 3. The Big O Hierarchy

You must memorize this hierarchy, ordered from best (fastest) to worst (slowest):

| Big O | Name | Time for N=1M | Example |
|-------|------|---------------|---------|
| $O(1)$ | Constant | 1 | Array index lookup |
| $O(\log N)$ | Logarithmic | 20 | Binary search |
| $O(N)$ | Linear | 1,000,000 | Single for loop |
| $O(N \log N)$ | Linearithmic | 20,000,000 | std::sort() |
| $O(N^2)$ | Quadratic | 1,000,000,000,000 | Nested loops |
| $O(2^N)$ | Exponential | 💥 | Brute-force recursion |
| $O(N!)$ | Factorial | 💥💥 | All permutations |

**What's happening:**
```
1. $O(1)$ — Constant Time:
   The holy grail. The operation takes the exact same amount of time
   regardless of how massive $N$ is.

   Example: Array index lookup
     int arr[1000000];
     int val = arr[5];  // O(1) — instant, doesn't matter if array has 1M elements

   Example: Hash map lookup
     unordered_map<string,int> map;
     map["key"] = 42;         // O(1) average
     int x = map["key"];      // O(1) average — direct hash→bucket access

2. $O(\log N)$ — Logarithmic Time:
   Excellent performance. The algorithm halves the remaining dataset every step.

   Example: Binary search
     Sorted array of 1,000,000 elements
     Step 1: 1,000,000 → 500,000
     Step 2: 500,000 → 250,000
     ...
     Step 20: 1 → done!
     Only 20 comparisons for 1 MILLION elements!

3. $O(N)$ — Linear Time:
   Good performance. The time scales 1:1 with the input.
   If $N$ doubles, the time doubles.

   Example: Single for loop
     for (int i = 0; i < N; i++) { ... }  // O(N)

4. $O(N \log N)$ — Linearithmic Time:
   Decent performance. This is the absolute physical limit for
   comparison-based sorting algorithms.

   Example: std::sort()
     sort(nums.begin(), nums.end());  // O(N log N)
     N=1M → about 20M operations — fast enough for most interviews

5. $O(N^2)$ — Quadratic Time:
   Poor performance. Acceptable for small inputs, but if $N$ is 100,000,
   your code will time out on LeetCode.

   Example: Nested for loops
     for (int i = 0; i < N; i++)
       for (int j = 0; j < N; j++) { ... }  // O(N²)
     N=1000 → 1,000,000 operations (fine)
     N=100,000 → 10,000,000,000 operations (timeout!)

6. $O(2^N)$ — Exponential Time & $O(N!)$ — Factorial Time:
   Terrible performance. The algorithm will crash the computer if $N > 20$.

   Example: Brute-force subsets
     For N=20: 2^20 = 1,048,576 (barely OK)
     For N=30: 2^30 = 1,073,741,824 (timeout)
     For N=40: 2^40 = ~1 trillion (never finishes)
```

### 4. Code Analysis Examples

```cpp
// Example 1: O(1) — No loops
int getFirst(vector<int>& arr) {
    return arr[0];
}

// Example 2: O(N) — Single loop
int findMax(vector<int>& arr) {
    int maxVal = arr[0];
    for (int i = 1; i < arr.size(); i++) {
        if (arr[i] > maxVal) maxVal = arr[i];
    }
    return maxVal;
}

// Example 3: O(N²) — Nested loops
void printAllPairs(vector<int>& arr) {
    for (int i = 0; i < arr.size(); i++) {
        for (int j = 0; j < arr.size(); j++) {
            cout << arr[i] << ", " << arr[j];
        }
    }
}

// Example 4: O(log N) — Halving loop
bool binarySearch(vector<int>& sorted, int target) {
    int lo = 0, hi = sorted.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (sorted[mid] == target) return true;
        else if (sorted[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}

// Example 5: O(N log N) — Sort + loop
void process(vector<int>& arr) {
    sort(arr.begin(), arr.end());    // O(N log N)
    for (int x : arr) cout << x;     // O(N)
    // Total: O(N log N) + O(N) = O(N log N)
}
```

**Dry-run table (binary search for 35 in {10,20,30,40,50}):**

| Step | `lo` | `hi` | `mid` | `nums[mid]` | Action |
|------|------|------|-------|-------------|--------|
| 1 | 0 | 4 | 2 | 30 | 35>30 → lo=3 |
| 2 | 3 | 4 | 3 | 40 | 35<40 → hi=2 |
| 3 | 3 | 2 | — | — | lo>hi → not found |

Only 2 comparisons for 5 elements. For 1M elements: ~20 comparisons.

### 5. Common Interview Pitfalls

```
Pitfall 1: Saying O(2N) instead of O(N)
  → Wrong! Drop the constant. Correct: O(N)

Pitfall 2: Saying O(N + M) when N == M
  → Technically correct, but interviewer expects O(N) if N and M are the same size

Pitfall 3: Confusing best, average, and worst case
  → Big O = WORST CASE. Always.
  → If asked for best case, analyze the best-case input (Big Omega (Ω) is a lower bound, not a synonym for "best case")
  → If asked for average, analyze the expected input (Big Theta (Θ) is a tight bound, not a synonym for "average case")

Pitfall 4: Forgetting about recursion
  → A recursive function with depth N uses O(N) SPACE (call stack)
  → Even if no arrays are allocated!

Pitfall 5: Not explaining WHY
  → Don't just say "O(N log N)"
  → Say "O(N log N) because we sort the array, which takes N log N,
     then iterate through it once, which takes N. The N log N dominates."
```

### 6. Practice: Analyze These

```
// What is the time complexity of each?

// 1.
for (int i = 0; i < N; i++)
    for (int j = i; j < N; j++)
        // O(1) work

// 2.
while (N > 1)
    N = N / 2;

// 3.
for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++)
        for (int k = 0; k < N; k++)
            // O(1) work

// 4.
void func(int n) {
    if (n <= 0) return;
    func(n - 1);
    func(n - 1);
}

Answers:
  1. O(N²) — inner loop runs N, N-1, N-2, ..., 1 times → N²/2 → O(N²)
  2. O(log N) — N is halved each iteration
  3. O(N³) — triple nested loop
  4. O(2^N) — each call makes 2 more calls, like binary tree
```

### Summary of Big O Hierarchy

You must memorize this hierarchy, ordered from best (fastest) to worst (slowest):

1.  **$O(1)$ — Constant Time:** The holy grail. The operation takes the exact same amount of time regardless of how massive $N$ is. *(e.g., Array index lookup `arr[5]`, Hash Map lookup).*
2.  **$O(\log N)$ — Logarithmic Time:** Excellent performance. The algorithm halves the remaining dataset every step. *(e.g., Binary Search).*
3.  **$O(N)$ — Linear Time:** Good performance. The time scales 1:1 with the input. If $N$ doubles, the time doubles. *(e.g., A single `for` loop).*
4.  **$O(N \log N)$ — Linearithmic Time:** Decent performance. This is the absolute physical limit for comparison-based sorting algorithms. *(e.g., `std::sort()`, Merge Sort).*
5.  **$O(N^2)$ — Quadratic Time:** Poor performance. Acceptable for small inputs, but if $N$ is 100,000, your code will time out on LeetCode. *(e.g., Nested `for` loops).*
6.  **$O(2^N)$ — Exponential Time & $O(N!)$ — Factorial Time:** Terrible performance. The algorithm will crash the computer if $N > 20$. *(e.g., Brute-force recursion, calculating all permutations).*

### Quick Reference

| Complexity | Name | Growth | Typical Code Pattern | N=100 | N=10000 |
|-----------|------|--------|---------------------|-------|---------|
| $O(1)$ | Constant | Flat | Direct access, hash lookup | 1 | 1 |
| $O(\log N)$ | Logarithmic | Very slow | Binary search, halving | 7 | 14 |
| $O(N)$ | Linear | Proportional | Single loop | 100 | 10,000 |
| $O(N \log N)$ | Linearithmic | Gentle curve | Sort, divide & conquer | 664 | 133,000 |
| $O(N^2)$ | Quadratic | Steep curve | Nested loops | 10,000 | 100,000,000 |
| $O(2^N)$ | Exponential | Vertical wall | Brute-force subsets | 1.27×10³⁰ | 💥 |
| $O(N!)$ | Factorial | Worse than exp | All permutations | 9.3×10¹⁵⁷ | 💥💥 |

### 7. Space Complexity

Space Complexity measures how much **extra memory** an algorithm uses relative to the input size $N$. The interviewer will almost always ask about both Time and Space.

**Rule:** Only count **extra** space the algorithm allocates. The input itself is not counted.

```cpp
// Example 1: O(1) Space — no extra memory
int findMax(vector<int>& arr) {
    int maxVal = arr[0];           // 1 variable
    for (int i = 1; i < arr.size(); i++)
        if (arr[i] > maxVal) maxVal = arr[i];
    return maxVal;
}
// Only uses maxVal and i — constant space regardless of N

// Example 2: O(N) Space — allocates new array
vector<int> copyAndDouble(vector<int>& arr) {
    vector<int> result(arr.size());   // NEW array of size N
    for (int i = 0; i < arr.size(); i++)
        result[i] = arr[i] * 2;
    return result;
}
// Allocates N extra elements → O(N) space

// Example 3: O(N) Space — recursion call stack
void printReverse(vector<int>& arr, int index) {
    if (index < 0) return;
    printReverse(arr, index - 1);  // N recursive calls = N stack frames
    cout << arr[index];
}
// Each recursive call adds a frame to the call stack → O(N) space

// Example 4: O(log N) Space — balanced recursion
void mergeSort(vector<int>& arr, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(arr, lo, mid);     // log N depth (halving)
    mergeSort(arr, mid + 1, hi);
    // merge step uses O(N) temp space
}
// Recursion depth = O(log N), but merge uses O(N) temp → O(N) total
// If counting only call stack: O(log N)
```

**What's happening (Space Complexity):**
```
Space complexity depends on WHAT you allocate:

1. Local variables (int i, int max) → O(1) — always constant
2. New array of size N → O(N) — scales with input
3. Recursion call stack → O(depth)
   - Binary recursion (2 calls, halving): depth = O(log N)
   - Linear recursion (1 call, N-1): depth = O(N)
   - Double recursion (2 calls, N-1): depth = O(N), calls = O(2^N)

4. Hash map with N entries → O(N)
5. 2D array N×N → O(N²)

Common pitfall: "My algorithm only uses one loop, so O(1) space!"
  → Wrong if you allocate a new array inside that loop!
  → Space depends on ALLOCATION, not loops.
```

**Space Complexity Cheat Sheet:**

| Pattern | Space | Why |
|---------|-------|-----|
| Single loop, local vars | $O(1)$ | No extra allocation |
| New array/vector of size N | $O(N)$ | Explicit allocation |
| Hash map with N entries | $O(N)$ | Stores N key-value pairs |
| Recursion depth N | $O(N)$ | N stack frames |
| Recursion depth log N | $O(\log N)$ | Halving (binary search style) |
| 2D grid N×N | $O(N^2)$ | N rows × N columns |
| Sort in-place (Quick Sort) | $O(\log N)$ | Recursion stack only |
| Sort with temp array (Merge) | $O(N)$ | Auxiliary array of size N |

**Key takeaway:** Time Complexity = how long it takes. Space Complexity = how much memory it needs. Always analyze both when asked about an algorithm's performance.

For most interview problems, optimizing Time is the primary goal. However, if two solutions have the same Time Complexity, the one with better Space Complexity wins.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Big O Notation**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 big o notation** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

