# Part 1, Topic 1: C++ STL Essentials
## Chapter 4: `unordered_map` & `map`

A Map (also known as a Dictionary or Hash Table) is arguably the most important data structure in technical interviews. It maps a **Key** to a **Value**.

Whenever an interview problem asks you to count frequencies, check if something exists in $O(1)$ time, or link an ID to an object, you should immediately think of a Map.

---

### 1. What is a Map?

A map is a collection of key-value pairs. Each key is unique and maps to exactly one value. Think of it like a dictionary: you look up a word (key) and get its definition (value).

```
unordered_map<string, int> ages = {{"Alice", 30}, {"Bob", 25}, {"Charlie", 35}};

Hash Table (unordered_map) — keys are in random order:

 Bucket 0: empty
 Bucket 1: empty
 Bucket 2: → ["Charlie" → 35]
 Bucket 3: → ["Alice" → 30]
 Bucket 4: → ["Bob" → 25]
 Bucket 5: empty
 ...

 Access ages["Alice"]: hash("Alice") → bucket 3 → 30  (O(1) average)
```

### 2. `unordered_map` vs `map`

There are two types of maps in C++. **Always default to `unordered_map`.**

- **`std::unordered_map` (Hash Table):**
  - **Lookups/Inserts:** $O(1)$ on average.
  - **Ordering:** The keys are completely random.
  - **Use Case:** 95% of interview problems.

- **`std::map` (Red-Black Tree):**
  - **Lookups/Inserts:** $O(\log N)$.
  - **Ordering:** The keys are **always sorted** automatically.
  - **Use Case:** Only use this if the problem explicitly requires you to iterate over the keys in sorted order.

| Feature | `unordered_map` | `map` |
|---------|----------------|-------|
| Implementation | Hash Table | Red-Black Tree |
| Lookup | $O(1)$ average | $O(\log N)$ |
| Insert | $O(1)$ average | $O(\log N)$ |
| Erase | $O(1)$ average | $O(\log N)$ |
| Key Order | Random | Sorted |
| Memory | Bucket array + 1 node per key (often less in practice) | 3 pointers + color per node (often more) |
| Worst Case | $O(N)$ (hash collisions) | $O(\log N)$ always |

### 3. Core Operations

```cpp
#include <unordered_map>
#include <string>
#include <iostream>

using namespace std;

int main() {
    unordered_map<string, int> ages;

    // Insertion & Updating: O(1)
    ages["Alice"] = 30;
    ages["Bob"] = 25;

    // If the key doesn't exist, using [] creates it with a default value (0 for ints)
    // Then it increments it. This is perfect for frequency counting!
    ages["Charlie"]++; // Charlie is now 1

    // Checking if a key exists: O(1)
    // .count() returns 1 if the key exists, 0 if it doesn't.
    if (ages.count("Alice")) {
        cout << "Alice is in the map!";
    }

    // Accessing a value: O(1)
    cout << ages["Bob"]; // 25

    // Removing a key: O(1)
    ages.erase("Bob");
}
```

**What's happening:**
```cpp
ages["Alice"] = 30;
// Step 1: Look up key "Alice" in the hash table
// Step 2: Key doesn't exist → create entry with key="Alice", value=0
// Step 3: Assign 30 to value
// Result: ages = {{"Alice", 30}}

ages["Charlie"]++;
// Step 1: Look up "Charlie" — not found
// Step 2: Create entry with key="Charlie", value=0 (default for int)
// Step 3: Increment: 0++ = 1
// Result: ages = {{"Alice", 30}, {"Charlie", 1}}
// This is the frequency counting pattern!

ages.erase("Bob");
// Step 1: Look up "Bob" — found
// Step 2: Remove the key-value pair
// Returns: number of elements removed (0 or 1)
```

### 4. The "Gotcha" with the `[]` Operator

While `ages["David"]` is convenient, it comes with a massive trap.

If you use the `[]` operator just to *check* the value of a key that does not exist, **C++ will silently insert that key into the map** with a default value. This increases your space complexity and pollutes your map.

```cpp
unordered_map<string, int> scores;

// WRONG WAY TO CHECK:
// "David" wasn't in the map. But this line just added "David" with a score of 0!
if (scores["David"] == 100) { ... }

// RIGHT WAY TO CHECK:
if (scores.count("David") && scores["David"] == 100) { ... }

// ALSO CORRECT — use .find():
auto it = scores.find("David");
if (it != scores.end() && it->second == 100) { ... }
```

**What's happening:**
```
scores (empty before this line):

if (scores["David"] == 100) { ... }
   ^^^^^^^^^^^^^^^
   This does TWO things:
   1. Inserts "David" → 0 into the map (if not already present)
   2. Returns a reference to the value (0)

   After this line: scores = {{"David", 0}}
   The map now has a "David" entry even though we only wanted to CHECK!

 Fix: Use .count() or .find() — they do NOT modify the map.
```

### 5. The .insert() Method

`insert()` is safer than `[]` because it doesn't overwrite existing values:

```cpp
unordered_map<string, int> ages;

// insert with make_pair — only inserts if key doesn't exist
ages.insert(make_pair("Alice", 30)); // inserted
ages.insert(make_pair("Alice", 40)); // NOT inserted (Alice already exists)

cout << ages["Alice"]; // Still 30

// Using structured bindings with insert (C++17)
auto [iter, inserted] = ages.insert({"Bob", 25});
// inserted = true if it was a new key
// inserted = false if the key already existed
if (inserted) {
    cout << "New entry added!\n";
}
```

**What's happening:**
```cpp
ages.insert(make_pair("Alice", 30));
// Step 1: Check if "Alice" exists
// Step 2: If not, insert {"Alice", 30}
// Step 3: If yes, do nothing
// Returns: pair<iterator, bool> — iterator to element, and whether inserted

ages.insert(make_pair("Alice", 40));
// "Alice" already exists with value 30
// The 40 is IGNORED
// This is different from ages["Alice"] = 40 which would OVERWRITE
```

### 6. Iterating over a Map

The easiest way to loop through a map is using C++17 Structured Bindings.

```cpp
unordered_map<char, int> freq = {{'a', 2}, {'b', 1}, {'c', 3}};

// Using structured bindings (C++17)
for (const auto& [character, count] : freq) {
    cout << character << " appears " << count << " times.\n";
}

// Traditional iteration (works in older C++)
for (auto it = freq.begin(); it != freq.end(); ++it) {
    cout << it->first << " appears " << it->second << " times.\n";
}

// Iterating a map (sorted order)
map<string, int> sortedAges = {{"Charlie", 35}, {"Alice", 30}};
for (const auto& [name, age] : sortedAges) {
    cout << name << ": " << age << "\n"; // Prints in alphabetical key order
}
```

### 7. Frequency Counting Pattern

The most common interview use of maps:

```cpp
// Count character frequencies
string s = "hello";
unordered_map<char, int> freq;
for (char c : s) {
    freq[c]++; // h:1, e:1, l:2, o:1
}

// Count element frequencies in an array
vector<int> nums = {1, 2, 2, 3, 3, 3};
unordered_map<int, int> count;
for (int num : nums) {
    count[num]++; // 1:1, 2:2, 3:3
}

// Find the most frequent element
int maxCount = 0, mostFrequent = -1;
for (const auto& [num, cnt] : count) {
    if (cnt > maxCount) {
        maxCount = cnt;
        mostFrequent = num;
    }
}
// mostFrequent = 3, maxCount = 3
```

### 8. Two-Sum Pattern (Map as Lookup)

```cpp
// Classic Two-Sum: find two numbers that add up to target
vector<int> nums = {2, 7, 11, 15};
int target = 9;

unordered_map<int, int> seen; // value → index
for (int i = 0; i < nums.size(); i++) {
    int complement = target - nums[i];
    if (seen.count(complement)) {
        cout << "Found: " << seen[complement] << " and " << i;
        // Found: 0 and 1 (values 2 and 7)
    }
    seen[nums[i]] = i;
}
```

**What's happening:**
```
nums = {2, 7, 11, 15}, target = 9

 i=0: nums[0]=2, complement=7
      seen = {} → 7 not in seen
      seen[2] = 0  → seen = {2:0}

 i=1: nums[1]=7, complement=2
      seen = {2:0} → 2 IS in seen! → return {seen[2], i} = {0, 1}
      Done! We found indices 0 and 1 where nums[0]+nums[1] = 2+7 = 9
```

### 9. Common Mistakes

```cpp
// MISTAKE 1: Using [] for read-only access (inserts default value!)
unordered_map<string,int> m;
if (m["key"] == 0) { ... } // BAD: inserts "key" → 0
if (m.count("key")) { ... } // GOOD: no side effects

// MISTAKE 2: Modifying a map while iterating
for (auto& [k, v] : m) {
    if (v == 0) m.erase(k); // UNDEFINED BEHAVIOR! Iterator invalidated
}
// FIX: Collect keys to erase first, then erase after the loop
vector<string> toErase;
for (const auto& [k, v] : m) {
    if (v == 0) toErase.push_back(k);
}
for (const auto& k : toErase) m.erase(k);

// MISTAKE 3: Forgetting map::count returns 0 or 1
unordered_map<string,int> m = {{"a", 1}};
cout << m.count("a"); // 1 (true)
cout << m.count("z"); // 0 (false)
// It does NOT return the count of duplicates (maps have unique keys)

// MISTAKE 4: Using [] when the value type is non-default-constructible
// Some types don't have a default constructor — [] will fail to compile
// FIX: Use .find() or .count() instead
```

### Summary of Big O (`unordered_map`)

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| `insert()` | $O(1)$ average | $O(N)$ worst case (rare) |
| `[]` (access or insert) | $O(1)$ average | Side effect: inserts default if missing! |
| `count()` | $O(1)$ average | Returns 0 or 1 |
| `find()` | $O(1)$ average | Returns iterator |
| `erase()` | $O(1)$ average | By key or iterator |
| `size()` | $O(1)$ | Stored member |
| Iteration | $O(N)$ | Visits all elements |
| `clear()` | $O(N)$ | Destroys all elements |

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `unordered_map<K,V> m;` | Create empty map |
| `m[key] = val` | Insert or update key-value pair |
| `m[key]` | Access value (inserts default if missing!) |
| `m.at(key)` | Access value (throws if missing) |
| `m.insert({k, v})` | Insert only if key doesn't exist |
| `m.count(key)` | 1 if key exists, 0 otherwise |
| `m.find(key)` | Returns iterator (`.end()` if not found) |
| `m.erase(key)` | Remove key-value pair |
| `m.size()` | Number of key-value pairs |
| `m.empty()` | `true` if map is empty |
| `m.clear()` | Remove all entries |
| `for (const auto& [k,v] : m)` | Iterate all pairs (C++17) |
| `m.lower_bound(k)` | (map only) First element ≥ k |
| `m.upper_bound(k)` | (map only) First element > k |

---

## Practice & Self-Check

For each question, keep a running picture of the map's contents as `{key: value, ...}` and update it after every line — especially lines that only *look* like reads.

### Predict the Output / Trace by Hand

**Q1. The `[]` gotcha, `insert`, and `erase`.** What is printed?

```cpp
unordered_map<string, int> scores = {{"Ann", 90}};

if (scores["Bo"] == 100) { /* never true */ }
scores.insert({"Ann", 50});
scores["Cy"]++;
size_t removed = scores.erase("Zed");

cout << scores.size() << " " << scores["Ann"] << " "
     << scores.count("Bo") << " " << scores["Cy"] << " " << removed << "\n";
```

**Q2. Re-trace Two-Sum.** Run the Section 8 loop on `nums = {3, 2, 4}`, `target = 6`. Fill in `complement`, whether it was found, and `seen` after each step. Then answer: on `nums = {3, 3}`, `target = 6`, what is printed, and why does it matter that `seen[nums[i]] = i` comes **after** the check?

**Q3. Most frequent, with a tie.** Run the "Find the most frequent element" loop from Section 7 on `nums = {4, 4, 1, 1, 9}`, but with `count` declared as a `map<int, int>` instead of an `unordered_map`. What are `mostFrequent` and `maxCount`? What would change with `unordered_map`?

**Q4. Ordered-map bounds.** With

```cpp
map<int, string> m = {{10, "a"}, {20, "b"}, {30, "c"}};
```

what are `m.lower_bound(20)->first`, `m.upper_bound(20)->first`, `m.lower_bound(25)->first`, `m.lower_bound(5)->first`, and is `m.upper_bound(30) == m.end()`?

**Q5. Reading `insert`'s return value.** What is printed?

```cpp
unordered_map<string, int> ages;
auto r1 = ages.insert({"Bob", 25});
auto r2 = ages.insert({"Bob", 99});
cout << r1.second << " " << r2.second << " " << r2.first->second << "\n";
```

### Coding Exercises

**E1 (Easy). Anagram check.** Write `bool isAnagram(const string& a, const string& b)` using one `unordered_map<char, int>`: count up for `a`, count down for `b`.
- `("listen", "silent")` returns `true`
- `("rat", "car")` returns `false`

**E2 (Easy–Medium). First unique character.** Write `int firstUniqueChar(const string& s)` that returns the index of the first character that appears exactly once, or `-1`.
- `"leetcode"` returns `0`
- `"loveleetcode"` returns `2`
- `"aabb"` returns `-1`

**E3 (Medium). Group anagrams.** Write `vector<vector<string>> groupAnagrams(const vector<string>& words)`. Words that are anagrams of each other go in the same group. Use a `map<string, vector<string>>` keyed by the word's sorted letters, so groups come out in sorted-key order and words keep their input order inside each group.
- `{"eat", "tea", "tan", "ate", "nat", "bat"}` returns `{{"bat"}, {"eat", "tea", "ate"}, {"tan", "nat"}}`

#### Dry-Run: Answers

**Q1.** Prints `3 90 1 1 0`.

| Line | Map after | Note |
|------|-----------|------|
| start | `{Ann: 90}` | |
| `scores["Bo"] == 100` | `{Ann: 90, Bo: 0}` | `[]` silently inserted `Bo` |
| `insert({"Ann", 50})` | unchanged | key exists, so `insert` does nothing |
| `scores["Cy"]++` | `{Ann: 90, Bo: 0, Cy: 1}` | created as 0, then incremented |
| `erase("Zed")` | unchanged | returns 0 (nothing removed) |

`count("Bo")` is 1 because of the accidental insert in line 2.

**Q2.** Prints `Found: 1 and 2` for `{3, 2, 4}`.

| `i` | `nums[i]` | `complement` | In `seen`? | `seen` after |
|-----|-----------|--------------|------------|--------------|
| 0 | 3 | 3 | no | `{3:0}` |
| 1 | 2 | 4 | no | `{3:0, 2:1}` |
| 2 | 4 | 2 | **yes** (index 1) | `{3:0, 2:1, 4:2}` |

At `i = 0`, the complement of 3 is 3 itself, but `seen` is still empty, so we never pair an element with itself. For `{3, 3}`: `i = 0` finds nothing and stores `seen[3] = 0`; `i = 1` finds complement 3 at index 0 and prints `Found: 0 and 1`. If we inserted **before** checking, `i = 0` would find its own index and wrongly print `Found: 0 and 0`.

**Q3.** `mostFrequent = 1`, `maxCount = 2`. A `map` iterates keys in sorted order: `1` (count 2), `4` (count 2), `9` (count 1). Key `1` sets `maxCount = 2` first; key `4` ties but `cnt > maxCount` is strict, so it does not replace it. With `unordered_map` the iteration order is unspecified, so the answer could be `1` **or** `4` (`maxCount` is 2 either way).

**Q4.** `20`, `30`, `30`, `10`, and `true`.

| Call | Meaning | Result |
|------|---------|--------|
| `lower_bound(20)` | first key $\ge 20$ | `20` |
| `upper_bound(20)` | first key $> 20$ | `30` |
| `lower_bound(25)` | first key $\ge 25$ | `30` |
| `lower_bound(5)` | first key $\ge 5$ | `10` |
| `upper_bound(30)` | first key $> 30$ | none, so `end()` |

**Q5.** Prints `1 0 25`. `insert` returns `pair<iterator, bool>`. The first call adds `Bob` (`true`). The second finds `Bob` already present, so it inserts nothing (`false`), and its iterator points at the existing entry, whose value is still `25`.

**E1 — reference solution**

```cpp
#include <string>
#include <unordered_map>
using namespace std;

bool isAnagram(const string& a, const string& b) {
    if (a.size() != b.size()) return false;
    unordered_map<char, int> count;
    for (char c : a) count[c]++;
    for (char c : b) {
        if (--count[c] < 0) return false;  // b uses c more often than a
    }
    return true;
}
```

$O(N)$ time, $O(K)$ space for $K$ distinct characters. Because the lengths are equal and no count ever went negative, every count ends at exactly 0. For `("rat", "car")`, `c` drops to $-1$, so we return `false`.

**E2 — reference solution**

```cpp
#include <string>
#include <unordered_map>
using namespace std;

int firstUniqueChar(const string& s) {
    unordered_map<char, int> freq;
    for (char c : s) freq[c]++;              // pass 1: count
    for (int i = 0; i < (int)s.size(); i++) {
        if (freq[s[i]] == 1) return i;        // pass 2: first with count 1
    }
    return -1;
}
```

$O(N)$ time. The second pass walks the **string**, not the map, because the map has no order. Using `[]` in pass 2 is fine here since every `s[i]` is already a key. For `"loveleetcode"`, `l` and `o` appear twice, and `v` (index 2) appears once.

**E3 — reference solution**

```cpp
#include <algorithm>
#include <map>
#include <string>
#include <vector>
using namespace std;

vector<vector<string>> groupAnagrams(const vector<string>& words) {
    map<string, vector<string>> groups;
    for (const string& w : words) {
        string key = w;
        sort(key.begin(), key.end());      // "tea" -> "aet"
        groups[key].push_back(w);          // [] creating a missing key is exactly what we want here
    }
    vector<vector<string>> result;
    for (const auto& [key, group] : groups) {
        result.push_back(group);
    }
    return result;
}
```

$O(N \cdot L \log L)$ for sorting the keys plus $O(N \log N)$ for the `map` operations, with $N$ words of length up to $L$. Keys: `eat`/`tea`/`ate` give `"aet"`, `tan`/`nat` give `"ant"`, `bat` gives `"abt"`. Sorted key order is `"abt" < "aet" < "ant"`, which gives the expected output.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 4: `unordered_map` & `map`**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter4 maps** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

