# Part 9, Topic 1: Hash Maps & Sets
## Chapter 2: The Two-Sum & Frequency Patterns

Hash Maps are the most versatile tool in your algorithmic toolkit. Whenever you are stuck on an array or string problem, your first thought should be: *"Can a Hash Map reduce this from $O(N^2)$ to $O(N)$?"*

---

### 1. The Complement Pattern (Two-Sum Pattern)

This pattern is used when you are looking for a pair of elements that satisfy a mathematical equation (like `A + B = Target` or `A - B = Target`).

**The Brute Force:** Use two loops to check every pair ($O(N^2)$).
**The Hash Map Solution:** 
Instead of looking forward for a match, you look *backward*. You use the Hash Map to store elements you have already seen. 

For `A + B = Target`, as you iterate through the array (you are currently looking at `B`), you calculate the "Complement": `Target - B`. 
You then ask the Hash Map: *"Have I seen the complement `A` earlier in this array?"*

```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    // Stores {value : index}
    unordered_map<int, int> seen;
    
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        
        if (seen.count(complement)) {
            // We found the pair!
            return {seen[complement], i};
        }
        
        // Store the current number for future iterations to find
        seen[nums[i]] = i;
    }
    return {};
}
```

**What's happening:**
```cpp
// Dry run with nums = [2, 7, 11, 15], target = 9
//
// i=0: nums[0] = 2
//   complement = 9 - 2 = 7
//   seen = {} → 7 not found
//   seen = {2: 0}
//
// i=1: nums[1] = 7
//   complement = 9 - 7 = 2
//   seen = {2: 0} → 2 FOUND at index 0!
//   return {0, 1}
//
// The key insight: We store each element AS WE GO,
// so we only need one pass through the array.
```

**Dry Run Table:**

| Step | i | nums[i] | complement | seen (before) | Found? | seen (after) |
|------|---|---------|------------|---------------|--------|--------------|
| 1 | 0 | 2 | 7 | {} | No | {2:0} |
| 2 | 1 | 7 | 2 | {2:0} | Yes → return {0,1} | - |

**Iterative Variation (find ALL pairs):**
```cpp
vector<pair<int,int>> twoSumAll(vector<int>& nums, int target) {
    unordered_map<int, vector<int>> seen;
    vector<pair<int,int>> result;
    
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        
        if (seen.count(complement)) {
            for (int j : seen[complement]) {
                result.push_back({j, i});
            }
        }
        
        seen[nums[i]].push_back(i);
    }
    return result;
}
```

**What's happening:**
```cpp
// The map stores a VECTOR of indices for each value
// This handles duplicates: [3, 3, 4, 3] target = 6
// seen[3] = [0, 1, 3] → three different pairs of 3+3
```

---

### 2. The Frequency Counting Pattern

This is used when you need to know how many times elements appear, or when you need to group items together based on their composition.

*Triggers:* "Anagrams", "Most Frequent", "Duplicates", "Intersection".

```cpp
// Example: Find the intersection of two arrays (elements present in both)
vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
    // 1. Build a frequency map of the first array
    unordered_map<int, int> counts;
    for (int num : nums1) {
        counts[num]++;
    }
    
    vector<int> result;
    
    // 2. Iterate through the second array and check the map
    for (int num : nums2) {
        if (counts[num] > 0) {
            result.push_back(num);
            counts[num]--; // Decrement so we don't count it twice!
        }
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Dry run with nums1 = [1, 2, 2, 1], nums2 = [2, 2]
//
// Phase 1: Build frequency map
// counts = {1: 2, 2: 2}
//
// Phase 2: Check against second array
// nums2[0] = 2: counts[2] = 2 > 0 → push 2, counts[2] = 1
// nums2[1] = 2: counts[2] = 1 > 0 → push 2, counts[2] = 0
// Result: [2, 2]
//
// Why decrement? Without it, [1,2] ∩ [2,2] would return [2,2]
// when the correct answer is [2] (each element can only be used once)
```

**Dry Run Table:**

| Step | nums2[i] | counts (before) | counts[2] > 0? | result | counts (after) |
|------|----------|-----------------|----------------|--------|----------------|
| 1 | 2 | {1:2, 2:2} | Yes (2 > 0) | [2] | {1:2, 2:1} |
| 2 | 2 | {1:2, 2:1} | Yes (1 > 0) | [2,2] | {1:2, 2:0} |

**Variation: Frequency Sort (sort by frequency)**
```cpp
vector<int> frequencySort(vector<int>& nums) {
    unordered_map<int, int> counts;
    for (int num : nums) counts[num]++;
    
    // Sort nums by frequency (descending), then by value (descending)
    sort(nums.begin(), nums.end(), [&](int a, int b) {
        if (counts[a] != counts[b]) {
            return counts[a] > counts[b];  // Higher frequency first
        }
        return a > b;  // If same frequency, larger value first
    });
    
    return nums;
}
// Example: [1,1,2,2,2,3] → counts={1:2, 2:3, 3:1}
// Sorted: [2,2,2,1,1,3] (2 appears most, then 1, then 3)
```

**Variation: Sort Characters By Frequency**
```cpp
string frequencySort(string s) {
    unordered_map<char, int> counts;
    for (char c : s) counts[c]++;
    
    // Sort characters by frequency
    vector<pair<char, int>> freq(counts.begin(), counts.end());
    sort(freq.begin(), freq.end(), [](auto& a, auto& b) {
        return a.second > b.second;
    });
    
    string result = "";
    for (auto& [ch, count] : freq) {
        result += string(count, ch);  // Append 'count' copies of 'ch'
    }
    return result;
}
// Example: "tree" → counts={t:1, r:1, e:2}
// Sorted pairs: [('e',2), ('t',1), ('r',1)]
// Result: "eetr"
```

---

### 3. The Grouping Pattern (Map of Vectors)

Sometimes the Value in your Hash Map isn't just an integer; it's an entire `vector`. This is used to group similar items together.

We saw this in Part 5 (Strings) with the **Group Anagrams** problem.
If you have `["eat", "tea", "tan", "ate", "nat", "bat"]`:
1. Sort each string to create a unified "Key" (e.g., "eat" -> "aet", "tea" -> "aet").
2. Push the original string into the `vector` stored at that Key.

```cpp
unordered_map<string, vector<string>> groups;

for (string s : words) {
    string key = s;
    sort(key.begin(), key.end());
    groups[key].push_back(s); // Groups them perfectly!
}
```

**What's happening:**
```cpp
// Dry run with words = ["eat", "tea", "tan", "ate", "nat", "bat"]
//
// "eat" → sorted: "aet" → groups["aet"] = ["eat"]
// "tea" → sorted: "aet" → groups["aet"] = ["eat", "tea"]
// "tan" → sorted: "ant" → groups["ant"] = ["tan"]
// "ate" → sorted: "aet" → groups["aet"] = ["eat", "tea", "ate"]
// "nat" → sorted: "ant" → groups["ant"] = ["tan", "nat"]
// "bat" → sorted: "abt" → groups["abt"] = ["bat"]
//
// Final groups:
// "aet" → ["eat", "tea", "ate"]
// "ant" → ["tan", "nat"]
// "abt" → ["bat"]
```

**Dry Run Table:**

| Word | Sorted Key | groups state after insert |
|------|------------|--------------------------|
| "eat" | "aet" | {"aet": ["eat"]} |
| "tea" | "aet" | {"aet": ["eat", "tea"]} |
| "tan" | "ant" | {"aet": ["eat", "tea"], "ant": ["tan"]} |
| "ate" | "aet" | {"aet": ["eat", "tea", "ate"], "ant": ["tan"]} |
| "nat" | "ant" | {"aet": [...], "ant": ["tan", "nat"]} |
| "bat" | "abt" | {..., "abt": ["bat"]} |

**Variation: Group Shifted Strings**
```cpp
// "abc" and "bcd" should be in the same group (shifted by 1)
// "xyz" and "aza" should be in the same group (shifted by 25/1)
vector<vector<string>> groupStrings(vector<string>& strings) {
    unordered_map<string, vector<string>> groups;
    
    for (string s : strings) {
        // Create a key based on the shift pattern
        string key = "";
        int shift = s[0] - 'a';  // How much the first char is shifted from 'a'
        
        for (char c : s) {
            // Shift each character back by the same amount, wrapping around
            key += (char)('a' + (c - 'a' - shift + 26) % 26);
            key += ',';
        }
        
        groups[key].push_back(s);
    }
    
    vector<vector<string>> result;
    for (auto& [key, group] : groups) {
        result.push_back(group);
    }
    return result;
}
// "abc" → key = "a,b,c,"  (base: 'a')
// "bcd" → key = "a,b,c,"  (base: 'b', shifted back by 1)
// Both in same group!
```

---

### 4. The Anagram Key Pattern

A specialized form of the grouping pattern where you need to detect anagrams efficiently.

```cpp
// Check if two strings are anagrams
bool isAnagram(string s, string t) {
    if (s.length() != t.length()) return false;
    
    unordered_map<char, int> counts;
    
    // Count characters in s
    for (char c : s) counts[c]++;
    
    // Subtract characters in t
    for (char c : t) {
        counts[c]--;
        if (counts[c] < 0) return false;  // More of c in t than s
    }
    
    return true;
}
```

**What's happening:**
```cpp
// Dry run with s = "anagram", t = "nagaram"
//
// After counting s: counts = {a:3, n:1, g:1, r:1, m:1}
//
// Processing t:
// 'n': counts = {a:3, n:0, g:1, r:1, m:1} → not negative
// 'a': counts = {a:2, n:0, g:1, r:1, m:1} → not negative
// 'g': counts = {a:2, n:0, g:0, r:1, m:1} → not negative
// 'a': counts = {a:1, n:0, g:0, r:1, m:1} → not negative
// 'r': counts = {a:1, n:0, g:0, r:0, m:1} → not negative
// 'a': counts = {a:0, n:0, g:0, r:0, m:1} → not negative
// 'm': counts = {a:0, n:0, g:0, r:0, m:0} → not negative
//
// All characters balanced → return true
```

**Dry Run Table:**

| Char from t | counts state | counts[c] < 0? |
|-------------|--------------|----------------|
| 'n' | {a:3, n:0, g:1, r:1, m:1} | No |
| 'a' | {a:2, n:0, g:1, r:1, m:1} | No |
| 'g' | {a:2, n:0, g:0, r:1, m:1} | No |
| 'a' | {a:1, n:0, g:0, r:1, m:1} | No |
| 'r' | {a:1, n:0, g:0, r:0, m:1} | No |
| 'a' | {a:0, n:0, g:0, r:0, m:1} | No |
| 'm' | {a:0, n:0, g:0, r:0, m:0} | No → return true |

---

### 5. The Prefix Sum + Hash Map Pattern

This is used to find subarrays that sum to a target value (including subarrays with negative numbers).

```cpp
// Find the number of subarrays with sum equal to k
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixSums;
    prefixSums[0] = 1;  // Base case: sum of 0 appears once
    
    int currentSum = 0;
    int count = 0;
    
    for (int num : nums) {
        currentSum += num;
        
        // If (currentSum - k) exists in our map, we found a subarray
        // that sums to k
        if (prefixSums.count(currentSum - k)) {
            count += prefixSums[currentSum - k];
        }
        
        prefixSums[currentSum]++;
    }
    
    return count;
}
```

**What's happening:**
```cpp
// Dry run with nums = [1, 2, 3, -2, 5], k = 5
//
// The idea: prefixSum[j] - prefixSum[i] = sum of subarray (i+1...j)
// So if prefixSum[j] - k = prefixSum[i], we have a valid subarray
//
// i=0: num=1, currentSum=1
//   Check: 1 - 5 = -4, prefixSums[-4] = 0 → no match
//   prefixSums = {0:1, 1:1}
//
// i=1: num=2, currentSum=3
//   Check: 3 - 5 = -2, prefixSums[-2] = 0 → no match
//   prefixSums = {0:1, 1:1, 3:1}
//
// i=2: num=3, currentSum=6
//   Check: 6 - 5 = 1, prefixSums[1] = 1 → MATCH! count = 1
//   prefixSums = {0:1, 1:1, 3:1, 6:1}
//
// i=3: num=-2, currentSum=4
//   Check: 4 - 5 = -1, prefixSums[-1] = 0 → no match
//   prefixSums = {0:1, 1:1, 3:1, 6:1, 4:1}
//
// i=4: num=5, currentSum=9
//   Check: 9 - 5 = 4, prefixSums[4] = 1 → MATCH! count = 2
//   prefixSums = {0:1, 1:1, 3:1, 6:1, 4:1, 9:1}
//
// Result: 2 subarrays: [2,3] and [1,2,3,-2,5]
```

**Dry Run Table:**

| i | num | currentSum | currentSum - k | prefixSums[currentSum-k] | count | prefixSums (after) |
|---|-----|------------|----------------|--------------------------|-------|---------------------|
| 0 | 1 | 1 | -4 | 0 | 0 | {0:1, 1:1} |
| 1 | 2 | 3 | -2 | 0 | 0 | {0:1, 1:1, 3:1} |
| 2 | 3 | 6 | 1 | 1 | 1 | {0:1, 1:1, 3:1, 6:1} |
| 3 | -2 | 4 | -1 | 0 | 1 | {0:1, 1:1, 3:1, 6:1, 4:1} |
| 4 | 5 | 9 | 4 | 1 | 2 | {0:1, 1:1, 3:1, 6:1, 4:1, 9:1} |

---

### 6. The Caching / Memoization Pattern

Hash Maps can serve as a cache to avoid recomputing expensive functions.

```cpp
// Fibonacci with memoization
unordered_map<int, long long> memo;

long long fib(int n) {
    if (n <= 1) return n;
    
    // Check cache first
    if (memo.count(n)) return memo[n];
    
    // Compute and cache
    memo[n] = fib(n - 1) + fib(n - 2);
    return memo[n];
}
```

**What's happening:**
```cpp
// Without memoization: fib(5) makes 15 recursive calls
// With memoization:    fib(5) makes 9 recursive calls
//
// fib(5) calls fib(4) and fib(3)
//   fib(4) calls fib(3) and fib(2)
//     fib(3) calls fib(2) and fib(1)
//       fib(2) calls fib(1) and fib(0) → memo[2] = 1
//     fib(3) = memo[2] + fib(1) = 1 + 1 = 2 → memo[3] = 2
//   fib(4) = memo[3] + memo[2] = 2 + 1 = 3 → memo[4] = 3
// fib(5) = memo[4] + memo[3] = 3 + 2 = 5
//
// Each subproblem is computed EXACTLY ONCE
```

---

### 7. Hash Set for Duplicate Detection

When you only need to know if something exists (not count or map), use `unordered_set`.

```cpp
// Check if array has duplicates
bool hasDuplicate(vector<int>& nums) {
    unordered_set<int> seen;
    for (int num : nums) {
        if (seen.count(num)) return true;
        seen.insert(num);
    }
    return false;
}
// Time: O(N), Space: O(N)
// Compare to sorting approach: O(N log N) time, O(1) space
```

**What's happening:**
```cpp
// Dry run with nums = [1, 2, 3, 1]
//
// num=1: seen = {} → not found → seen = {1}
// num=2: seen = {1} → not found → seen = {1, 2}
// num=3: seen = {1, 2} → not found → seen = {1, 2, 3}
// num=1: seen = {1, 2, 3} → FOUND! return true
//
// We detect the duplicate as soon as we see it,
// so we don't need to process the entire array.
```

---

### 8. Hash Map vs Array for Frequency Counting

When to use which:

```
┌─────────────────────────────────────────────────────────────┐
│  Use Array if:                                              │
│  - Key range is small and known (e.g., lowercase letters)   │
│  - Need guaranteed O(1) (no hash collisions)                │
│  - Memory is not a concern                                  │
│                                                             │
│  Use Hash Map if:                                           │
│  - Key range is large or unknown (e.g., arbitrary strings)  │
│  - Keys are not integers                                    │
│  - Only need average O(1)                                   │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Array approach (when keys are lowercase letters):
int count[26] = {0};  // O(1) guaranteed
for (char c : word) {
    count[c - 'a']++;
}

// Hash Map approach (when keys are arbitrary strings):
unordered_map<string, int> counts;  // O(1) average
for (string word : words) {
    counts[word]++;
}
```

---

### 9. Common Mistakes and Anti-Patterns

```cpp
// MISTAKE 1: Using [] for existence check
if (map[key] != 0) { ... }  // WRONG if key doesn't exist!
// This INSERTS key with value 0, then checks if it's 0
// Always use .count() or .find() for existence checks

// MISTAKE 2: Erasing while iterating with range-for
for (auto& [key, val] : map) {
    if (shouldErase(key)) {
        map.erase(key);  // UNDEFINED BEHAVIOR!
    }
}
// Fix: Use iterator-based erasure
for (auto it = map.begin(); it != map.end(); ) {
    if (shouldErase(it->first)) {
        it = map.erase(it);
    } else {
        ++it;
    }
}

// MISTAKE 3: Forgetting that unordered_map is unordered
unordered_map<int, int> map = {{3, 30}, {1, 10}, {2, 20}};
for (auto& [key, val] : map) {
    // Order is NOT guaranteed to be 1, 2, 3!
    // It depends on the hash function and bucket arrangement
}

// MISTAKE 4: Using map[] in a hot loop (double lookup)
for (int i = 0; i < n; i++) {
    map[nums[i]]++;  // Two lookups: one to find, one to modify
}
// This is fine for simple increments, but for complex operations:
auto it = map.find(nums[i]);
if (it != map.end()) {
    it->second++;  // Single lookup
}
```

---

### 10. Summary: Which Pattern to Use

```
┌──────────────────────────────────────────────────────────────────┐
│  Problem Trigger                    →  Pattern to Use            │
├──────────────────────────────────────────────────────────────────┤
│  "Find pair that sums to target"   →  Complement Pattern        │
│  "Count occurrences"               →  Frequency Counting        │
│  "Group similar items"             →  Grouping Pattern          │
│  "Detect anagrams"                 →  Anagram Key Pattern       │
│  "Subarray sum equals k"           →  Prefix Sum + Hash Map    │
│  "Check for duplicates"            →  Hash Set                  │
│  "Cache expensive computations"    →  Memoization Pattern       │
│  "Intersection of arrays"          →  Frequency Counting        │
│  "Two Sum variants"                →  Complement Pattern        │
└──────────────────────────────────────────────────────────────────┘
```

---

### Quick Reference Table

| Pattern | Key Type | Value Type | Time | Space |
|---------|----------|------------|------|-------|
| Complement (Two-Sum) | element value | index | O(N) | O(N) |
| Frequency Counting | element | count | O(N) | O(N) |
| Grouping | group key | vector of elements | O(N·L log L) | O(N·L) |
| Anagram Key | sorted string | vector of strings | O(N·L log L) | O(N·L) |
| Prefix Sum | cumulative sum | frequency | O(N) | O(N) |
| Duplicate Detection | element | (none - set) | O(N) | O(N) |
| Memoization | input params | cached result | varies | varies |

**Decision Flowchart:**
```
Need to count something?        → Frequency Counting
Need to find a pair?            → Complement Pattern
Need to group by some property? → Grouping Pattern
Need to check if element exists?→ Hash Set
Need subarray sums?             → Prefix Sum + Hash Map
Need to avoid recomputation?    → Memoization
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: The Two-Sum & Frequency Patterns**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 hashing patterns** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

