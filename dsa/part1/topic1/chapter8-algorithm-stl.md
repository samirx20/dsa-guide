# Part 1, Topic 1: C++ STL Essentials
## Chapter 8: Algorithm STL

You should never write your own sorting, reversing, or searching logic in an interview unless the interviewer explicitly asks you to implement it from scratch. C++ provides highly optimized versions of these algorithms in the `<algorithm>` library.

---

### 1. Sorting

The `std::sort()` function is an optimized $O(N \log N)$ sorting algorithm (Introsort).

```cpp
#include <algorithm>
#include <vector>
#include <iostream>

using namespace std;

int main() {
    vector<int> nums = {5, 2, 9, 1, 5, 6};

    // 1. Sort Ascending (Default)
    sort(nums.begin(), nums.end());
    // [1, 2, 5, 5, 6, 9]

    // 2. Sort Descending
    // We use the greater<int>() comparator
    sort(nums.begin(), nums.end(), greater<int>());
    // [9, 6, 5, 5, 2, 1]
}
```

**What's happening:**
```
sort(nums.begin(), nums.end()):

  Before: [5, 2, 9, 1, 5, 6]
  After:  [1, 2, 5, 5, 6, 9]

  std::sort uses Introsort (hybrid of QuickSort, HeapSort, InsertionSort):
  - Starts with QuickSort (fast on average)
  - Switches to HeapSort if recursion too deep (avoids O(N²) worst case)
  - Uses InsertionSort for small subarrays (< 16 elements)

sort(nums.begin(), nums.end(), greater<int>()):

  Before: [5, 2, 9, 1, 5, 6]
  After:  [9, 6, 5, 5, 2, 1]

  greater<int>() is a built-in comparator:
  - Returns true if a > b
  - This flips the default ordering (less<int>)
```

**Dry-run table (ascending sort):**

| Step | Action | Array State | Notes |
|------|--------|-------------|-------|
| Start | — | `[5, 2, 9, 1, 5, 6]` | Unsorted |
| 1 | Sort | `[1, 2, 5, 5, 6, 9]` | Ascending |

### 2. Custom Comparators (Sorting Complex Data)

What if you have an array of strings and you want to sort them by their **length**, not alphabetically? You must provide a custom "comparator" function. A comparator is just a function that takes two elements and returns `true` if the first element should come *before* the second element.

```cpp
// Method 1: Function comparator
bool compareByLength(const string& a, const string& b) {
    return a.length() < b.length();
}

int main() {
    vector<string> words = {"apple", "kiwi", "banana", "pie"};

    // Pass the function name as the 3rd argument
    sort(words.begin(), words.end(), compareByLength);

    // Result: ["pie", "kiwi", "apple", "banana"]
}
```

**What's happening:**
```
compareByLength("apple", "kiwi"):
  "apple".length() = 5
  "kiwi".length() = 4
  5 < 4? → false → "apple" should NOT come before "kiwi"
  So "kiwi" comes first ✓

  Sorting by length:
  pie (3) < kiwi (4) < apple (5) < banana (6)

  Result: ["pie", "kiwi", "apple", "banana"]
```

```cpp
// Method 2: Lambda comparator (preferred in interviews)
sort(words.begin(), words.end(), [](const string& a, const string& b) {
    return a.length() < b.length();
});

// Method 3: Sort by multiple criteria
vector<pair<int, string>> students = {{90, "Alice"}, {85, "Bob"}, {90, "Charlie"}};

// Sort by score descending, then name ascending on tie
sort(students.begin(), students.end(), [](const auto& a, const auto& b) {
    if (a.first != b.first) return a.first > b.first;
    return a.second < b.second;
});
// Result: {{90,"Alice"}, {90,"Charlie"}, {85,"Bob"}}
```

**Dry-run table (multi-criteria sort):**

| Step | Comparison | Result | Array State |
|------|-----------|--------|-------------|
| Start | — | — | `[(90,"Alice"), (85,"Bob"), (90,"Charlie")]` |
| 1 | (90,"Alice") vs (85,"Bob") | 90 > 85 → Alice before Bob | `[(90,"Alice"), (85,"Bob"), (90,"Charlie")]` |
| 2 | (90,"Alice") vs (90,"Charlie") | 90==90, "Alice"<"Charlie" → Alice before Charlie | `[(90,"Alice"), (85,"Bob"), (90,"Charlie")]` |
| 3 | (85,"Bob") vs (90,"Charlie") | 90 > 85 → Charlie before Bob | `[(90,"Alice"), (90,"Charlie"), (85,"Bob")]` |

### 3. Reversing

```cpp
vector<int> nums = {1, 2, 3, 4, 5};

// Reverses the array in place in O(N) time
reverse(nums.begin(), nums.end());
// [5, 4, 3, 2, 1]

// It also works perfectly on strings!
string s = "hello";
reverse(s.begin(), s.end()); // "olleh"
```

**What's happening:**
```
reverse swaps elements from outside in:

  nums = [1, 2, 3, 4, 5]

  Swap nums[0] ↔ nums[4]:  [5, 2, 3, 4, 1]
  Swap nums[1] ↔ nums[3]:  [5, 4, 3, 2, 1]
  Middle element (index 2) stays: 3

  Time: O(N/2) = O(N)
  Space: O(1) — in-place, no extra memory
```

### 4. Finding Min and Max

```cpp
int a = 10, b = 20;

// Find the max or min of exactly two elements: O(1)
int biggest = max(a, b); // 20

// Find the max or min element in an ENTIRE array: O(N)
vector<int> nums = {5, 9, 2, 8};
int maxVal = *max_element(nums.begin(), nums.end()); // 9
int minVal = *min_element(nums.begin(), nums.end()); // 2
```

**What's happening:**
```
max_element returns an ITERATOR (pointer), not the value itself:
  nums = {5, 9, 2, 8}
  max_element → iterator pointing to 9
  *max_element → dereference to get value 9

  Without dereference (*), you get a memory address!
  cout << max_element(nums.begin(), nums.end());  // prints address like 0x7ffd...
  cout << *max_element(nums.begin(), nums.end()); // prints 9
```

### 5. Binary Search

If you know an array is **already sorted**, you can search it in $O(\log N)$ time instead of $O(N)$ time.

```cpp
vector<int> nums = {10, 20, 30, 40, 50}; // MUST be sorted!

// Returns true if 30 exists, false otherwise
bool exists = binary_search(nums.begin(), nums.end(), 30); // true
bool missing = binary_search(nums.begin(), nums.end(), 35); // false
```

**What's happening:**
```
binary_search on {10, 20, 30, 40, 50} for 30:

  Step 1: low=0, high=4, mid=2 → nums[2]=30 → found! → true

binary_search for 35:

  Step 1: low=0, high=4, mid=2 → nums[2]=30 → 35>30 → go right
  Step 2: low=3, high=4, mid=3 → nums[3]=40 → 35<40 → go left
  Step 3: low=3, high=2 → low>high → not found → false

  Only 2-3 comparisons instead of checking all 5 elements!
  For N=1,000,000: binary search = ~20 comparisons vs linear = 1,000,000
```

*(Note: We will cover the more advanced `lower_bound` and `upper_bound` functions in the dedicated Binary Search section in Phase 4).*

### 6. Partial Sort and Nth Element

```cpp
vector<int> nums = {5, 2, 9, 1, 5, 6, 3, 8};

// partial_sort: Sort only the first K elements
partial_sort(nums.begin(), nums.begin() + 3, nums.end());
// [1, 2, 3, ...] — first 3 are sorted, rest undefined

// nth_element: Put the Kth smallest element in its correct position
nth_element(nums.begin(), nums.begin() + 3, nums.end());
// All elements before index 3 are ≤ nums[3]
// All elements after index 3 are ≥ nums[3]
```

**What's happening:**
```
partial_sort(nums.begin(), nums.begin()+3, nums.end()):
  Only sorts the first 3 elements:
  Before: [5, 2, 9, 1, 5, 6, 3, 8]
  After:  [1, 2, 3, ?, ?, ?, ?, ?]  (? = undefined order)
  Time: O(N log K) instead of O(N log N)

nth_element(nums.begin(), nums.begin()+3, nums.end()):
  Rearranges so that:
  - Elements at indices 0,1,2 are the 3 smallest (any order)
  - Element at index 3 is the 4th smallest (the median-of-medians)
  - Elements at indices 4+ are the largest (any order)
  Time: O(N) average — faster than full sort!
  Use: Finding median, Kth smallest element in O(N)
```

### 7. Accumulate and Iota

```cpp
#include <numeric>

vector<int> nums = {1, 2, 3, 4, 5};

// Sum all elements: O(N)
int total = accumulate(nums.begin(), nums.end(), 0);
// total = 15

// Fill with sequential values
vector<int> filled(5);
iota(filled.begin(), filled.end(), 1);
// filled = {1, 2, 3, 4, 5}

// Product of all elements
long long product = accumulate(nums.begin(), nums.end(), 1LL, multiplies<long long>());
// product = 120
```

**What's happening:**
```
accumulate(begin, end, initial):
  0 + 1 = 1
  1 + 2 = 3
  3 + 3 = 6
  6 + 4 = 10
  10 + 5 = 15

iota(begin, end, start_value):
  filled[0] = 1
  filled[1] = 2
  filled[2] = 3
  filled[3] = 4
  filled[4] = 5
  "iota" = Greek letter ι, math convention for identity sequence
```

### 8. Next Permutation

Generates the next lexicographically greater permutation. If already the largest permutation, it wraps to the smallest.

```cpp
vector<int> nums = {1, 2, 3};

// Generate all permutations in sorted order
do {
    for (int n : nums) cout << n << " ";
    cout << endl;
} while (next_permutation(nums.begin(), nums.end()));

// Output:
// 1 2 3
// 1 3 2
// 2 1 3
// 2 3 1
// 3 1 2
// 3 2 1
```

**What's happening:**
```
next_permutation algorithm:

  {1, 2, 3} → {1, 3, 2}
    Find rightmost increasing pair: (1,2) at indices 0,1
    Find smallest element > 1 to the right: 2
    Swap: {2, 1, 3}
    Reverse suffix from index 1: {2, 1, 3}

  {3, 2, 1} → wraps to {1, 2, 3}
    No increasing pair found → return false

  Time: O(N) per permutation
  Total to generate all N! permutations: O(N * N!)
```

### 9. Algorithm Complexity Table

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| `sort()` | $O(N \log N)$ | $O(\log N)$ | Introsort hybrid |
| `stable_sort()` | $O(N \log N)$ | $O(N)$ | Preserves relative order of equal elements |
| `partial_sort()` | $O(N \log K)$ | $O(1)$ | Sort only first K elements |
| `nth_element()` | $O(N)$ | $O(1)$ | Partition around Kth element |
| `reverse()` | $O(N)$ | $O(1)$ | In-place reversal |
| `rotate()` | $O(N)$ | $O(1)$ | Rotate elements left |
| `binary_search()` | $O(\log N)$ | $O(1)$ | Requires sorted range |
| `lower_bound()` | $O(\log N)$ | $O(1)$ | First element ≥ target |
| `upper_bound()` | $O(\log N)$ | $O(1)$ | First element > target |
| `accumulate()` | $O(N)$ | $O(1)$ | Sum/product of range |
| `iota()` | $O(N)$ | $O(1)$ | Fill with sequential values |
| `next_permutation()` | $O(N)$ | $O(1)$ | Next lexicographic permutation |

### 10. Common Mistakes

```cpp
// MISTAKE 1: Sorting an unsorted container for binary_search
vector<int> nums = {5, 2, 9, 1};
bool found = binary_search(nums.begin(), nums.end(), 9);
// WRONG: nums is not sorted! binary_search requires sorted input

// FIX: Sort first
sort(nums.begin(), nums.end());
bool found = binary_search(nums.begin(), nums.end(), 9); // true

// MISTAKE 2: Using sort with == comparison (unstable)
sort(nums.begin(), nums.end(), [](int a, int b) { return a == b; });
// WRONG: comparator must define strict weak ordering
// a==b doesn't define "less than" — undefined behavior!

// FIX: Use < or >
sort(nums.begin(), nums.end(), [](int a, int b) { return a < b; });

// MISTAKE 3: Forgetting to dereference max_element/min_element
vector<int> nums = {5, 9, 2};
int maxVal = max_element(nums.begin(), nums.end());
// WRONG: maxVal is an iterator (pointer), not the value!

int maxVal = *max_element(nums.begin(), nums.end()); // 9 ✓

// MISTAKE 4: Using sort on a container while iterating
for (auto it = nums.begin(); it != nums.end(); ++it) {
    sort(nums.begin(), nums.end()); // UNDEFINED: invalidates iterators!
}

// MISTAKE 5: Using accumulate on empty range without initial value
vector<int> empty;
int sum = accumulate(empty.begin(), empty.end(), 0); // OK: returns 0
// int sum = accumulate(empty.begin(), empty.end());  // WRONG: no initial value
```

### 11. When to Use Which

```
Interview Decision Tree:

  Need sorted array?
  ├─ Yes, all elements → sort()
  ├─ Yes, only first K  → partial_sort()
  ├─ Yes, only Kth smallest → nth_element()
  └─ No  → don't sort

  Need to search?
  ├─ Sorted array → binary_search() / lower_bound() / upper_bound()
  └─ Unsorted array → linear scan or unordered_set

  Need to reverse?
  ├─ In-place → reverse()
  └─ New container → reverse_copy()

  Need sum/product?
  ├─ Simple sum → accumulate()
  └─ Custom operation → loop
```

### Summary

Always `#include <algorithm>` at the top of your interview file. It gives you free $O(N \log N)$ sorting and $O(N)$ reversing, saving you valuable time on the whiteboard.

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `sort(begin, end)` | Sort ascending (O(N log N)) |
| `sort(begin, end, greater<>())` | Sort descending |
| `sort(begin, end, comparator)` | Sort with custom comparator |
| `stable_sort(begin, end)` | Sort preserving equal-element order |
| `reverse(begin, end)` | Reverse in place (O(N)) |
| `rotate(begin, mid, end)` | Rotate left by mid-begin positions |
| `binary_search(begin, end, val)` | true if val exists in sorted range |
| `lower_bound(begin, end, val)` | Iterator to first element ≥ val |
| `upper_bound(begin, end, val)` | Iterator to first element > val |
| `*max_element(begin, end)` | Maximum value in range |
| `*min_element(begin, end)` | Minimum value in range |
| `accumulate(begin, end, init)` | Sum with initial value |
| `iota(begin, end, start)` | Fill with start, start+1, ... |
| `next_permutation(begin, end)` | Next lexicographic permutation |
| `partial_sort(begin, mid, end)` | Sort first K elements |
| `nth_element(begin, nth, end)` | Kth element in correct position |
| `count(begin, end, val)` | Count occurrences of val |
| `find(begin, end, val)` | Iterator to first occurrence of val |
| `fill(begin, end, val)` | Fill range with val |
| `swap(a, b)` | Swap two values |

---

## Practice & Self-Check

Before each answer, ask two questions: "Does this algorithm need sorted input?" and "Does it return a **value** or an **iterator**?"

### Predict the Output / Trace by Hand

**Q1. Sorting by length with ties.** Using the length comparator from Section 2 on

```cpp
vector<string> words = {"fig", "banana", "kiwi", "apple", "pie"};
```

(a) With `stable_sort`, what is the exact result? (b) With plain `sort`, which part of the result is **not** guaranteed?

**Q2. Multi-criteria sort.** Apply the Method 3 comparator (score descending, then name ascending) to

```cpp
vector<pair<int, string>> students = {{70, "Dan"}, {85, "Eve"}, {70, "Ann"}, {85, "Bob"}};
```

What is the sorted order?

**Q3. Trace `binary_search`.** Using the same `low` / `high` / `mid` steps as Section 5, search for `45` in `{10, 20, 30, 40, 50, 60, 70}`. List every step, the result, and how many elements were compared.

**Q4. `accumulate`'s hidden type.** What does this print?

```cpp
vector<double> v = {1.5, 2.5, 3.0};
cout << accumulate(v.begin(), v.end(), 0) << " "
     << accumulate(v.begin(), v.end(), 0.0) << "\n";

vector<int> filled(4);
iota(filled.begin(), filled.end(), 5);
for (int x : filled) cout << x;
```

**Q5. `next_permutation`.** (a) What is the next permutation of `{1, 3, 2}`? (b) Of `{2, 3, 1}`? (c) For `{3, 2, 1}`, what does the call return and what does the vector become? (d) How many lines does the Section 8 `do ... while` loop print if `nums = {1, 1, 2}`?

### Coding Exercises

**E1 (Easy). Maximum product of three.** Write `long long maxProductOfThree(vector<int> nums)` (at least 3 elements, may be negative). Sort first, then compare the only two candidates.
- `{1, 2, 3, 4}` returns `24`
- `{-10, -10, 1, 3, 2}` returns `300`

**E2 (Easy–Medium). K closest points with `partial_sort`.** Write `vector<pair<int,int>> kClosest(vector<pair<int,int>> pts, int k)` that returns the `k` points closest to the origin, ordered by distance (ties broken by the point itself, `a < b`). Compare squared distances $x^2 + y^2$ (no `sqrt`) and sort only the first `k` positions.
- `pts = {{3,3}, {5,-1}, {-2,4}, {1,1}}`, `k = 2` returns `{{1,1}, {3,3}}`

**E3 (Medium). Median in $O(N)$ average.** Write `double median(vector<int> v)` using `nth_element` instead of a full sort. For an even count, return the average of the two middle values.
- `{5, 2, 9, 1, 7}` returns `5`
- `{4, 1, 3, 2}` returns `2.5`

#### Dry-Run: Answers

**Q1.** (a) `{"fig", "pie", "kiwi", "apple", "banana"}`. Lengths are fig 3, banana 6, kiwi 4, apple 5, pie 3. `stable_sort` keeps equal-length words in their original order, and `"fig"` came before `"pie"`. (b) With `sort`, the positions of `"kiwi"`, `"apple"` and `"banana"` are still forced (indices 2, 3, 4), but whether `"fig"` or `"pie"` comes first is **not** guaranteed — the comparator says they are equal, and `sort` is not stable.

**Q2.** `{{85, "Bob"}, {85, "Eve"}, {70, "Ann"}, {70, "Dan"}}`. Scores split them into the 85 group and the 70 group (85 first because of `>`); inside each group, names go alphabetically.

**Q3.** Returns `false` after comparing **3** elements (40, 60, 50).

```text
index:  0   1   2   3   4   5   6
value: 10  20  30  40  50  60  70
```

| Step | `low` | `high` | `mid` | `nums[mid]` | Decision |
|------|-------|--------|-------|-------------|----------|
| 1 | 0 | 6 | 3 | 40 | $45 > 40$: go right, `low = 4` |
| 2 | 4 | 6 | 5 | 60 | $45 < 60$: go left, `high = 4` |
| 3 | 4 | 4 | 4 | 50 | $45 < 50$: go left, `high = 3` |
| 4 | 4 | 3 | — | — | `low > high`: not found |

At most $\lceil \log_2(7+1) \rceil = 3$ comparisons for 7 elements.

**Q4.** Prints `6 7` and then `5678`.
- The result type of `accumulate` is the type of the **initial value**. With `0` (an `int`), each step is truncated back to `int`: $0 + 1.5 = 1.5 \to 1$, $1 + 2.5 = 3.5 \to 3$, $3 + 3.0 = 6.0 \to 6$. The true sum is 7.
- With `0.0`, everything stays `double`: $1.5 + 2.5 + 3.0 = 7$.
- `iota` fills 4 slots starting at 5: `5, 6, 7, 8`.

**Q5.**
- (a) `{2, 1, 3}`. In `{1, 3, 2}`, the rightmost position `i` with `nums[i] < nums[i+1]` is index 0 (`1 < 3`). Swap `1` with the smallest larger value to its right (`2`), giving `{2, 3, 1}`, then reverse the suffix after index 0, giving `{2, 1, 3}`.
- (b) `{3, 1, 2}`. Pivot is index 0 (`2 < 3`); the smallest value to the right that is greater than 2 is `3`. Swap to get `{3, 2, 1}`, then reverse the suffix to get `{3, 1, 2}`.
- (c) Returns `false`, and the vector wraps around to `{1, 2, 3}`.
- (d) **3** lines: `1 1 2`, `1 2 1`, `2 1 1`. `next_permutation` produces only **distinct** orderings, so the two `1`s are never "swapped" with each other.

**E1 — reference solution**

```cpp
#include <algorithm>
#include <vector>
using namespace std;

long long maxProductOfThree(vector<int> nums) {
    sort(nums.begin(), nums.end());
    int n = nums.size();
    long long threeLargest = 1LL * nums[n - 1] * nums[n - 2] * nums[n - 3];
    long long twoSmallestAndLargest = 1LL * nums[0] * nums[1] * nums[n - 1];
    return max(threeLargest, twoSmallestAndLargest);
}
```

$O(N \log N)$ time. Two very negative numbers multiply to a large positive: for `{-10, -10, 1, 2, 3}` (sorted), $3 \times 2 \times 1 = 6$ but $(-10)(-10)(3) = 300$. `1LL` keeps the product in 64-bit math.

**E2 — reference solution**

```cpp
#include <algorithm>
#include <utility>
#include <vector>
using namespace std;

vector<pair<int,int>> kClosest(vector<pair<int,int>> pts, int k) {
    auto dist2 = [](const pair<int,int>& p) {
        return p.first * p.first + p.second * p.second;
    };
    partial_sort(pts.begin(), pts.begin() + k, pts.end(),
                 [&](const pair<int,int>& a, const pair<int,int>& b) {
                     if (dist2(a) != dist2(b)) return dist2(a) < dist2(b);
                     return a < b;   // deterministic tie-break
                 });
    pts.resize(k);   // keep only the k sorted front elements
    return pts;
}
```

$O(N \log k)$ time. Squared distances: `{3,3}` → 18, `{5,-1}` → 26, `{-2,4}` → 20, `{1,1}` → 2. The two smallest are 2 then 18. Squared distance gives the same order as real distance, since $\sqrt{\ }$ is increasing.

**E3 — reference solution**

```cpp
#include <algorithm>
#include <vector>
using namespace std;

double median(vector<int> v) {
    int n = v.size();
    auto mid = v.begin() + n / 2;
    nth_element(v.begin(), mid, v.end());   // *mid is now the (n/2)-th smallest
    if (n % 2 == 1) return *mid;
    // Even n: the other middle value is the LARGEST element in the left part.
    int lowerMid = *max_element(v.begin(), mid);
    return (lowerMid + *mid) / 2.0;
}
```

$O(N)$ average time. For `{4, 1, 3, 2}`: `n / 2 = 2`, so `nth_element` puts the 3rd smallest (`3`) at index 2 with `{1, 2}` (in some order) to its left. Their max is `2`, and $(2 + 3) / 2.0 = 2.5$. Dividing by `2.0` (not `2`) avoids integer division.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 8: Algorithm STL**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter8 algorithm stl** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

