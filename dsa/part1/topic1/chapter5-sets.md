# Part 1, Topic 1: C++ STL Essentials
## Chapter 5: `unordered_set` & `set`

A Set is essentially a Map that only stores Keys; it doesn't store Values. Furthermore, **a Set guarantees uniqueness**. If you try to insert the number `10` five times, the Set will only contain one instance of `10`.

Use a Set when you need to answer the question: *"Have I seen this exact item before?"* in $O(1)$ time, or when you need to remove duplicates from an array.

---

### 1. What is a Set?

A set is a collection of **unique** elements. Think of it as a membership list — an item is either in the set or it isn't. There are no duplicates.

```
unordered_set<int> s = {10, 20, 30, 40};

Hash Table (unordered_set) — elements in random order:

 Bucket 0: empty
 Bucket 1: → [40]
 Bucket 2: → [10]
 Bucket 3: empty
 Bucket 4: → [30]
 Bucket 5: → [20]
 ...

 Check s.count(10): hash(10) → bucket 2 → found!  (O(1) average)
 Check s.count(99): hash(99) → bucket ? → not found  (O(1) average)
```

### 2. `unordered_set` vs `set`

Just like maps, there are two versions. **Always default to `unordered_set`.**

| Feature | `unordered_set` | `set` |
|---------|----------------|-------|
| Implementation | Hash Table | Red-Black Tree |
| Lookup | $O(1)$ average | $O(\log N)$ |
| Insert | $O(1)$ average | $O(\log N)$ |
| Erase | $O(1)$ average | $O(\log N)$ |
| Order | Random | Sorted |
| Memory | Higher | Lower |
| Worst Case | $O(N)$ (collisions) | $O(\log N)$ always |
| Special Feature | Speed | `upper_bound()`, `lower_bound()` |

- **`std::unordered_set` (Hash Table):**
  - **Lookups/Inserts:** $O(1)$ on average.
  - **Ordering:** The elements are completely random.
  - **Use Case:** 95% of interview problems.

- **`std::set` (Red-Black Tree):**
  - **Lookups/Inserts:** $O(\log N)$.
  - **Ordering:** The elements are **always sorted** automatically.
  - **Use Case:** Finding the nearest element greater than a target (`upper_bound`).

### 3. Core Operations

```cpp
#include <unordered_set>
#include <iostream>

using namespace std;

int main() {
    unordered_set<int> visited;

    // Insertion: O(1)
    visited.insert(10);
    visited.insert(20);
    visited.insert(10); // Ignored! 10 is already in the set.

    // Checking existence: O(1)
    if (visited.count(20)) {
        cout << "20 is in the set";
    }

    // Removing an element: O(1)
    visited.erase(20);

    // Size: O(1)
    cout << visited.size(); // 1 (Only the number 10 remains)
}
```

**What's happening:**
```cpp
visited.insert(10);
// Set is empty → insert 10
// visited = {10}

visited.insert(20);
// 20 not in set → insert 20
// visited = {10, 20}

visited.insert(10);
// 10 IS already in set → IGNORED
// visited = {10, 20}  (unchanged)
// This is the key feature: sets enforce uniqueness

visited.count(20);
// Is 20 in the set? → Yes → returns 1 (true)

visited.erase(20);
// Remove 20 from the set
// visited = {10}

visited.size();
// How many unique elements? → 1
```

**Dry-run table:**

| Step | Operation | Set State | Return Value |
|------|-----------|-----------|--------------|
| 1 | `insert(10)` | `{10}` | — |
| 2 | `insert(20)` | `{10, 20}` | — |
| 3 | `insert(10)` | `{10, 20}` | Ignored (duplicate) |
| 4 | `count(20)` | `{10, 20}` | `1` (found) |
| 5 | `erase(20)` | `{10}` | — |
| 6 | `size()` | `{10}` | `1` |

### 4. The .insert() Return Value

Like map, `insert()` returns a pair telling you whether the insertion happened:

```cpp
unordered_set<int> s;

auto [iter, inserted] = s.insert(10);
// inserted = true (new element added)
// iter points to the inserted element

auto [iter2, inserted2] = s.insert(10);
// inserted2 = false (10 already exists)
// iter2 points to the existing 10

// Useful for counting unique elements
vector<int> nums = {1, 2, 2, 3, 3, 3};
unordered_set<int> unique;
int duplicates = 0;
for (int num : nums) {
    auto [it, ok] = unique.insert(num);
    if (!ok) duplicates++;
}
// unique = {1, 2, 3}, duplicates = 3
```

**What's happening:**
```
nums = {1, 2, 2, 3, 3, 3}

Iteration 1: num=1, insert(1) → ok=true  → unique={1}
Iteration 2: num=2, insert(2) → ok=true  → unique={1,2}
Iteration 3: num=2, insert(2) → ok=false → duplicates=1 (2 already seen)
Iteration 4: num=3, insert(3) → ok=true  → unique={1,2,3}
Iteration 5: num=3, insert(3) → ok=false → duplicates=2
Iteration 6: num=3, insert(3) → ok=false → duplicates=3

Final: unique = {1, 2, 3}, duplicates = 3
```

**Dry-run table:**

| Step | `num` | `insert(num).second` | `duplicates` | `unique` |
|------|-------|-----------------------|--------------|----------|
| 1 | 1 | `true` | 0 | `{1}` |
| 2 | 2 | `true` | 0 | `{1, 2}` |
| 3 | 2 | `false` | 1 | `{1, 2}` |
| 4 | 3 | `true` | 1 | `{1, 2, 3}` |
| 5 | 3 | `false` | 2 | `{1, 2, 3}` |
| 6 | 3 | `false` | 3 | `{1, 2, 3}` |

### 5. Iterating

Because elements in an `unordered_set` have no index, you must use a range-based for loop to see what is inside.

```cpp
unordered_set<string> words = {"apple", "banana", "cherry"};

for (const string& w : words) {
    cout << w << endl; // Will print in random order!
}

// With a set (sorted order)
set<string> sorted_words = {"cherry", "apple", "banana"};
for (const string& w : sorted_words) {
    cout << w << endl; // Prints: apple, banana, cherry (alphabetical)
}
```

**What's happening:**
```
unordered_set iteration order is UNPREDICTABLE:
 words = {"apple", "banana", "cherry"}
 Could print: banana, cherry, apple
 Or: apple, banana, cherry
 Or: cherry, apple, banana
 Depends on hash function and bucket layout

set iteration order is ALWAYS sorted:
 sorted_words = {"cherry", "apple", "banana"}
 Prints: apple, banana, cherry  (guaranteed alphabetical)

 If you need sorted output, use set — but accept O(log N) operations.
```

### 6. Removing Duplicates from an Array

The most common interview pattern for sets:

```cpp
// Method 1: Using a set
vector<int> nums = {1, 2, 2, 3, 3, 3, 4};
unordered_set<int> unique(nums.begin(), nums.end());
// unique = {1, 2, 3, 4}

// Convert back to vector
vector<int> result(unique.begin(), unique.end());
// result = {1, 2, 3, 4} (order may vary)

// Method 2: Using a set for dedup while preserving order
vector<int> nums = {3, 1, 2, 1, 3, 4, 2};
unordered_set<int> seen;
vector<int> result;
for (int num : nums) {
    if (seen.insert(num).second) { // insert returns {iterator, bool}
        result.push_back(num);     // Only add if newly inserted
    }
}
// result = {3, 1, 2, 4} (order of first occurrence preserved)
```

**What's happening:**
```
Method 2 dry-run:
 nums = {3, 1, 2, 1, 3, 4, 2}

 num=3: insert(3) succeeds → result = {3}, seen = {3}
 num=1: insert(1) succeeds → result = {3,1}, seen = {3,1}
 num=2: insert(2) succeeds → result = {3,1,2}, seen = {3,1,2}
 num=1: insert(1) fails    → skip (1 already seen)
 num=3: insert(3) fails    → skip (3 already seen)
 num=4: insert(4) succeeds → result = {3,1,2,4}, seen = {3,1,2,4}
 num=2: insert(2) fails    → skip (2 already seen)

 result = {3, 1, 2, 4}  ✓ First-occurrence order preserved
```

### 7. Advanced Tool: Ordered `set` Bounds

While you should usually use `unordered_set` for speed, the sorted `set` has a superpower: finding the closest numbers.

If you need to find the smallest number in your dataset that is strictly *greater* than a target, you can use `.upper_bound()`.

```cpp
#include <set>

int main() {
    set<int> bst = {10, 20, 30, 40};

    // Find the first element > 25
    auto it = bst.upper_bound(25);

    if (it != bst.end()) {
        cout << *it; // Prints 30
    }
}
```

**What's happening:**
```
set = {10, 20, 30, 40}  (sorted Red-Black Tree)

         20
        /  \
      10    30
              \
              40

upper_bound(25):
 Start at root (20)
 25 > 20 → go right
 25 < 30 → go left (no left child)
 Return iterator to 30 (smallest element > 25)

lower_bound(25):
 Same result: 30 (smallest element >= 25)

lower_bound(30):
 Return iterator to 30 (30 >= 30)

upper_bound(30):
 Return iterator to 40 (smallest element > 30)
```

**Dry-run table:**

| Call | Target | Walk | Result |
|------|--------|------|--------|
| `upper_bound(25)` | 25 | 20→30 | 30 |
| `lower_bound(25)` | 25 | 20→30 | 30 |
| `lower_bound(30)` | 30 | 20→30 | 30 |
| `upper_bound(30)` | 30 | 20→30→40 | 40 |
| `upper_bound(5)` | 5 | 20→10 | 10 |

### 8. Set Intersection, Union, Difference

The `<algorithm>` library provides set operations on **sorted ranges** (works with `set` directly, or sorted vectors):

```cpp
#include <algorithm>
#include <vector>
#include <iostream>

using namespace std;

int main() {
    vector<int> a = {1, 2, 3, 4, 5};
    vector<int> b = {3, 4, 5, 6, 7};

    // Intersection (elements in both)
    vector<int> inter;
    set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(inter));
    // inter = {3, 4, 5}

    // Union (all unique elements)
    vector<int> uni;
    set_union(a.begin(), a.end(), b.begin(), b.end(), back_inserter(uni));
    // uni = {1, 2, 3, 4, 5, 6, 7}

    // Difference (elements in a but not in b)
    vector<int> diff;
    set_difference(a.begin(), a.end(), b.begin(), b.end(), back_inserter(diff));
    // diff = {1, 2}
}
```

**What's happening:**
```
a = {1, 2, 3, 4, 5}
b = {3, 4, 5, 6, 7}

set_intersection:
 Walk both sorted arrays simultaneously
 1 < 3 → skip (only in a)
 2 < 3 → skip (only in a)
 3 == 3 → add to result
 4 == 4 → add to result
 5 == 5 → add to result
 Result: {3, 4, 5}

set_union:
 Walk both, always take the smaller
 1 < 3 → add 1
 2 < 3 → add 2
 3 == 3 → add 3
 4 == 4 → add 4
 5 == 5 → add 5
 6 > 5 → add 6
 7 > 5 → add 7
 Result: {1, 2, 3, 4, 5, 6, 7}

set_difference:
 Walk both, take from a when not in b
 1, 2 are not in b → add to result
 3, 4, 5 are in b → skip
 Result: {1, 2}
```

### 9. Finding First Duplicate / Two Sum with Sets

Sets are perfect for the "two-sum" family of problems:

```cpp
// Classic Two Sum: find two numbers that add to target
// Using unordered_set for O(N) solution
vector<int> twoSumSet(vector<int>& nums, int target) {
    unordered_set<int> seen;
    for (int num : nums) {
        int complement = target - num;
        if (seen.count(complement)) {
            return {complement, num};
        }
        seen.insert(num);
    }
    return {};
}

// Dry-run: nums = {2, 7, 11, 15}, target = 9
// num=2: complement=7, seen.count(7)=0 → insert 2 → seen={2}
// num=7: complement=2, seen.count(2)=1 → return {2, 7} ✓
```

### 10. Common Mistakes

```cpp
// MISTAKE 1: Using unordered_set when you need order
unordered_set<int> s = {3, 1, 4, 1, 5};
// Iteration order is RANDOM — you cannot rely on it

// FIX: Use set<int> if you need sorted order
set<int> s = {3, 1, 4, 1, 5};
// s = {1, 3, 4, 5} (sorted, unique)

// MISTAKE 2: Trying to access elements by index
unordered_set<int> s = {10, 20, 30};
// cout << s[0];  // ERROR: sets don't support index access!
// You can only iterate, or use find/count

// MISTAKE 3: Using [] operator on a set (it doesn't have one!)
// Sets only store keys, not key-value pairs
// There's no "default value" concept like in maps

// MISTAKE 4: Modifying elements directly
unordered_set<int> s = {10, 20, 30};
// You cannot change 10 to 15 in place
// You must erase(10) then insert(15)
s.erase(10);
s.insert(15);

// MISTAKE 5: Using set_intersection on unsorted containers
vector<int> a = {5, 3, 1};
vector<int> b = {3, 5, 7};
vector<int> result;
// WRONG: these are not sorted!
set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(result));
// result may be WRONG because inputs are unsorted

// FIX: sort first, or use unordered_set
sort(a.begin(), a.end());
sort(b.begin(), b.end());
set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(result));
// result = {3, 5} ✓
```

### 11. When to Use Which

```
Decision Tree:

  Need unique elements?
  ├─ Yes → Need sorted order?
  │        ├─ Yes → set<int>
  │        └─ No  → unordered_set<int>  (faster)
  └─ No  → Need key-value pairs?
           ├─ Yes → map / unordered_map
           └─ No  → vector

  Need to find nearest element?
  ├─ Yes → set<int> (use upper_bound/lower_bound)
  └─ No  → unordered_set<int>
```

### Summary of Big O (`unordered_set`)

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| `insert()` | $O(1)$ average | $O(N)$ worst case |
| `count()` | $O(1)$ average | Returns 0 or 1 |
| `find()` | $O(1)$ average | Returns iterator |
| `erase()` | $O(1)$ average | By value or iterator |
| `size()` | $O(1)$ | Stored member |
| Iteration | $O(N)$ | Visits all elements |
| `clear()` | $O(N)$ | Destroys all elements |

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `unordered_set<int> s;` | Create empty set |
| `unordered_set<int> s = {1,2,3};` | Initialize with values |
| `s.insert(10)` | Add element (ignores if exists) |
| `s.count(10)` | 1 if exists, 0 otherwise |
| `s.find(10)` | Returns iterator (`.end()` if not found) |
| `s.erase(10)` | Remove element |
| `s.size()` | Number of elements |
| `s.empty()` | `true` if set is empty |
| `s.clear()` | Remove all elements |
| `for (const auto& x : s)` | Iterate all elements |
| `set<int> s;` | Sorted set (O(log N) operations) |
| `s.upper_bound(25)` | (set only) Smallest element > 25 |
| `s.lower_bound(25)` | (set only) Smallest element ≥ 25 |
| `set_union(a.begin(),a.end(),b.begin(),b.end(),out)` | Merge two sorted ranges |
| `set_intersection(...)` | Common elements of two sorted ranges |
| `set_difference(...)` | Elements in first but not second |

---

## Practice & Self-Check

Keep two habits while tracing: (1) an `insert` of an existing value changes nothing and returns `false` in `.second`; (2) a `set` is always sorted, so you can write its contents as a sorted list at every step.

### Predict the Output / Trace by Hand

**Q1. Order-preserving dedup on new data.** Run Method 2 from Section 6 on `nums = {5, 2, 5, 8, 2, 2, 9}`. What is `result`, and how many `insert` calls returned `false`?

**Q2. Building an ordered `set`.** What does this print?

```cpp
set<int> s = {7, 3, 9, 3, 1, 7};
cout << s.size() << " " << *s.begin() << " " << *s.rbegin() << " "
     << *s.lower_bound(4) << " " << *s.upper_bound(7) << " "
     << (s.upper_bound(9) == s.end()) << " " << *s.lower_bound(0) << "\n";
```

**Q3. Set algorithms on sorted vectors.** With `a = {1, 3, 5, 7, 9}` and `b = {3, 4, 5, 10}`, what do `set_intersection(a, b)`, `set_union(a, b)`, `set_difference(a, b)` and `set_difference(b, a)` produce?

**Q4. Re-trace `twoSumSet`.** Run `twoSumSet` from Section 9 on `nums = {4, 6, 1, 5}`, `target = 11`. Show `complement`, `seen.count(complement)`, and `seen` at each step. What is returned?

**Q5. Sorted strings are case-sensitive.** What does this print, and what is `w.size()`?

```cpp
set<string> w = {"pear", "Apple", "fig", "apple"};
for (const string& x : w) cout << x << " ";
```

### Coding Exercises

**E1 (Easy). Contains duplicate.** Write `bool containsDuplicate(const vector<int>& nums)` that stops as soon as a repeat is found, using the return value of `insert`.
- `{1, 2, 3, 1}` returns `true`
- `{1, 2, 3}` returns `false`

**E2 (Easy–Medium). Common values in order.** Write `vector<int> commonInOrder(const vector<int>& a, const vector<int>& b)` that returns each value appearing in **both** vectors exactly once, in the order of its **first appearance in `a`**. Target $O(N + M)$ average time.
- `a = {4, 9, 5, 9}`, `b = {9, 4, 9, 8, 4}` returns `{4, 9}`
- `a = {1, 2}`, `b = {3}` returns `{}`

**E3 (Medium). Closest value in a `set`.** Write `int closestValue(const set<int>& s, int target)` for a non-empty set. Return the element with the smallest $|x - \text{target}|$; on a tie, return the smaller element. Use `lower_bound` so it runs in $O(\log N)$.
- `s = {10, 20, 30, 40}`: target `26` returns `30`, target `25` returns `20` (tie), target `5` returns `10`, target `99` returns `40`

#### Dry-Run: Answers

**Q1.** `result = {5, 2, 8, 9}`; **3** inserts returned `false`.

| `num` | `insert(num).second` | `seen` after | `result` after |
|-------|----------------------|--------------|----------------|
| 5 | `true` | `{5}` | `{5}` |
| 2 | `true` | `{5, 2}` | `{5, 2}` |
| 5 | `false` | unchanged | unchanged |
| 8 | `true` | `{5, 2, 8}` | `{5, 2, 8}` |
| 2 | `false` | unchanged | unchanged |
| 2 | `false` | unchanged | unchanged |
| 9 | `true` | `{5, 2, 8, 9}` | `{5, 2, 8, 9}` |

**Q2.** Prints `4 1 9 7 9 1 1`. The duplicates collapse, giving the sorted set `{1, 3, 7, 9}`.

| Expr | Meaning | Value |
|------|---------|-------|
| `size()` | unique elements | 4 |
| `*begin()` | smallest | 1 |
| `*rbegin()` | largest | 9 |
| `*lower_bound(4)` | first $\ge 4$ | 7 |
| `*upper_bound(7)` | first $> 7$ | 9 |
| `upper_bound(9) == end()` | nothing $> 9$ | `1` (true) |
| `*lower_bound(0)` | first $\ge 0$ | 1 |

**Q3.**

| Operation | Result |
|-----------|--------|
| `set_intersection(a, b)` | `{3, 5}` |
| `set_union(a, b)` | `{1, 3, 4, 5, 7, 9, 10}` |
| `set_difference(a, b)` | `{1, 7, 9}` |
| `set_difference(b, a)` | `{4, 10}` |

Difference is **not** symmetric: $a \setminus b$ keeps what only `a` has, $b \setminus a$ keeps what only `b` has.

**Q4.** Returns `{6, 5}`.

| `num` | `complement` | `seen.count(complement)` | `seen` after |
|-------|--------------|--------------------------|--------------|
| 4 | 7 | 0 | `{4}` |
| 6 | 5 | 0 | `{4, 6}` |
| 1 | 10 | 0 | `{4, 6, 1}` |
| 5 | 6 | **1** | (returns before inserting 5) |

The pair is returned as `{complement, num}`, so the earlier value (6) comes first.

**Q5.** Prints `Apple apple fig pear`; `w.size() == 4`. Strings compare by character codes, and `'A'` (65) is less than every lowercase letter, so `"Apple"` comes first. `"Apple"` and `"apple"` are different strings, so both are kept.

**E1 — reference solution**

```cpp
#include <unordered_set>
#include <vector>
using namespace std;

bool containsDuplicate(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) {
        if (!seen.insert(x).second) return true;  // insert failed: seen before
    }
    return false;
}
```

$O(N)$ average time, $O(N)$ space. One `insert` does both the lookup and the add.

**E2 — reference solution**

```cpp
#include <unordered_set>
#include <vector>
using namespace std;

vector<int> commonInOrder(const vector<int>& a, const vector<int>& b) {
    unordered_set<int> inB(b.begin(), b.end());   // O(M) build
    unordered_set<int> added;
    vector<int> result;
    for (int x : a) {
        if (inB.count(x) && added.insert(x).second) {
            result.push_back(x);
        }
    }
    return result;
}
```

$O(N + M)$ average time. The `added` set prevents the second `9` in `a` from being output twice. Trace: `4` is in `b` and new (add), `9` is in `b` and new (add), `5` is not in `b`, `9` is already added.

**E3 — reference solution**

```cpp
#include <iterator>
#include <set>
using namespace std;

int closestValue(const set<int>& s, int target) {
    auto it = s.lower_bound(target);          // first element >= target
    if (it == s.end()) return *prev(it);      // everything is smaller
    if (it == s.begin()) return *it;          // everything is >= target
    int hi = *it;
    int lo = *prev(it);                       // largest element < target
    return (target - lo <= hi - target) ? lo : hi;  // <= breaks ties toward lo
}
```

$O(\log N)$. The answer is always one of the two neighbors around `target`. For 25: `lo = 20`, `hi = 30`, distances $5$ and $5$ tie, so 20. For 26: distances $6$ and $4$, so 30. For 5: `lower_bound` is `begin()`, so 10. For 99: `lower_bound` is `end()`, so 40.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 5: `unordered_set` & `set`**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter5 sets** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

