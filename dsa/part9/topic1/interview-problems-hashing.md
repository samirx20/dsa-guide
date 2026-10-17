# Part 9, Topic 1: Hash Maps & Sets
## Interview Problems Walkthrough

Because Hash Maps are so fast, they are often used as the underlying storage mechanism for more complex algorithms.

---

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|------------|---------|-------------|
| Two Sum | Easy | Complement | Store seen, check complement |
| Ransom Note | Easy | Frequency | Count chars, decrement |
| Group Anagrams | Medium | Grouping | Sorted string as key |
| Top K Frequent | Medium | Frequency + Heap | Count then heapify |
| Longest Consecutive | Medium | Set | Start only from sequence beginning |
| 4Sum | Medium | Two Sum variant | Pair sums in map |
| Valid Sudoku | Medium | Hash Set | Check row/col/box |
| Longest Substring Without Repeat | Medium | Sliding Window + Set | Move left when duplicate |
| Subarray Sum Equals K | Medium | Prefix Sum | Cumulative sum in map |
| Intersection of Two Arrays | Easy | Frequency | Count and match |

---

### Solution Approach Comparison

| Problem | Brute Force | Optimal | Time | Space |
|---------|-------------|---------|------|-------|
| Two Sum | O(N²) | Hash Map | O(N) | O(N) |
| Ransom Note | O(N²) | Frequency Array | O(N) | O(1) |
| Group Anagrams | O(N*K log K) | Map of Groups | O(N*K log K) | O(N*K) |
| Top K Frequent | O(N log N) | Frequency + Heap | O(N log K) | O(N) |
| Longest Consecutive | O(N log N) | Hash Set | O(N) | O(N) |
| 4Sum | O(N⁴) | Pair Sum Map | O(N²) | O(N²) |
| Subarray Sum K | O(N²) | Prefix Sum Map | O(N) | O(N) |

---

### 1. Two Sum (Easy)
**Trigger:** Find two numbers that sum to a target.
**Intuition:** Store numbers as you iterate. Check for the `target - current` complement.
*(See Chapter 2 for the code template).*

**Step-by-Step Walkthrough:**
```cpp
// nums = [2, 7, 11, 15], target = 9
//
// i=0: num=2, complement=7
//   seen = {} → 7 not found
//   seen = {2: 0}
//
// i=1: num=7, complement=2
//   seen = {2: 0} → 2 FOUND at index 0!
//   Return [0, 1]
//
// Time: O(N) - single pass
// Space: O(N) - hash map stores up to N elements
```

---

### 2. Ransom Note (Easy)
**Trigger:** Can you build string A using the characters from string B?
**Intuition:** Frequency count pattern. Build a frequency array (or map) of the letters available in string B (the magazine). Iterate through string A (the ransom note). For every letter, check if the count in the map is $> 0$. If it is, decrement the count. If it is $0$ (or doesn't exist), return `false`.

```cpp
bool canConstruct(string ransomNote, string magazine) {
    int count[26] = {0};
    
    // Count available characters in magazine
    for (char c : magazine) {
        count[c - 'a']++;
    }
    
    // Check if we can build ransom note
    for (char c : ransomNote) {
        if (count[c - 'a'] == 0) {
            return false;  // Not enough of this character
        }
        count[c - 'a']--;
    }
    
    return true;
}
```

**What's happening:**
```cpp
// ransomNote = "aa", magazine = "aab"
//
// Count magazine: a=2, b=1
//
// Check ransomNote:
// 'a': count[0]=2 > 0 → decrement → count[0]=1
// 'a': count[0]=1 > 0 → decrement → count[0]=0
//
// All characters available → return true
//
// ransomNote = "aa", magazine = "ab"
//
// Count magazine: a=1, b=1
//
// Check ransomNote:
// 'a': count[0]=1 > 0 → decrement → count[0]=0
// 'a': count[0]=0 → return false!
//
// Not enough 'a's → return false
```

**Dry Run Table:**

| Step | Char | Magazine Count | Available? | Action |
|------|------|----------------|------------|--------|
| 1 | 'a' | a=2 | Yes | Decrement → a=1 |
| 2 | 'a' | a=1 | Yes | Decrement → a=0 |
| 3 | 'a' | a=0 | No | Return false |

---

### 3. Group Anagrams (Medium)
**Trigger:** Group strings that are anagrams of each other.
**Intuition:** Map of Vectors pattern. Use the sorted version of the string as the Key.
*(Code provided in Part 5: Strings).*

**Step-by-Step Walkthrough:**
```cpp
// Input: ["eat","tea","tan","ate","nat","bat"]
//
// Process each word:
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
//
// Result: [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

---

### 4. Top K Frequent Elements (Medium)
**Trigger:** Return the `k` most frequent elements in an array.
**Intuition:** This is a combination problem. 
1. Use an `unordered_map` to build a frequency count of all elements in $O(N)$ time.
2. The trigger "Top K" means we need a **Min-Heap** (`priority_queue`). 
3. Push pairs of `{frequency, element}` into the Min-Heap.
4. Maintain the size of the heap at exactly `K`. If `heap.size() > K`, pop the top element (which removes the *smallest* frequency).
5. What is left in the heap are the `K` largest frequencies!

```cpp
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> counts;
    for (int num : nums) counts[num]++;
    
    // Min-Heap of pairs: {frequency, number}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> minHeap;
    
    for (auto& [num, freq] : counts) {
        minHeap.push({freq, num});
        if (minHeap.size() > k) {
            minHeap.pop(); // Remove the lowest frequency
        }
    }
    
    vector<int> result;
    while (!minHeap.empty()) {
        result.push_back(minHeap.top().second);
        minHeap.pop();
    }
    return result;
}
// Time: O(N log K), Space: O(N)
```

**What's happening:**
```cpp
// nums = [1,1,1,2,2,3], k = 2
//
// Frequency map: {1:3, 2:2, 3:1}
//
// Process frequencies:
// Push (3,1): heap=[(3,1)]
// Push (2,2): heap=[(2,2),(3,1)]
// Push (1,3): heap=[(1,3),(3,1),(2,2)]
//   Size 3 > k=2, pop (1,3)
//   heap=[(2,2),(3,1)]
//
// Result: [2,1] or [1,2] (2 most frequent)
```

---

### 5. Longest Consecutive Sequence (Medium)
**Trigger:** Find the length of the longest consecutive elements sequence in an unsorted array in $O(N)$ time.
**Intuition:** If you sort it, it's $O(N \log N)$, which fails the $O(N)$ constraint.
Put all numbers into an `unordered_set`. 
Iterate through the set. To find a sequence, you only want to start counting from the **absolute beginning of a sequence**. How do you know a number `x` is the beginning? If `x - 1` does NOT exist in the set!
If it is the beginning, use a `while` loop to check if `x + 1`, `x + 2`, etc., exist in the set, keeping track of the length.

```cpp
int longestConsecutive(vector<int>& nums) {
    unordered_set<int> st(nums.begin(), nums.end());
    int longest = 0;
    
    for (int num : st) {
        // Is this the START of a sequence?
        if (!st.count(num - 1)) {
            int length = 1;
            
            // Keep checking for the next numbers in the sequence
            while (st.count(num + length)) {
                length++;
            }
            
            longest = max(longest, length);
        }
    }
    return longest;
}
// Time: O(N) (The inner while loop only runs for valid sequences, 
//       so every number is visited at most twice). Space: O(N)
```

**What's happening:**
```cpp
// nums = [100, 4, 200, 1, 3, 2]
//
// Set: {1, 2, 3, 4, 100, 200}
//
// Check each number:
// 1: 0 not in set → start sequence
//   length=1, check 2: in set → length=2
//   check 3: in set → length=3
//   check 4: in set → length=4
//   check 5: not in set → done
//   longest = 4
//
// 2: 1 in set → skip (not start of sequence)
// 3: 2 in set → skip
// 4: 3 in set → skip
//
// 100: 99 not in set → start sequence
//   length=1, check 101: not in set → done
//   longest = 4 (unchanged)
//
// 200: 199 not in set → start sequence
//   length=1, check 201: not in set → done
//   longest = 4 (unchanged)
//
// Result: 4 (sequence: 1,2,3,4)
```

**Dry Run Table:**

| Num | num-1 in set? | Start? | Length | Longest |
|-----|---------------|--------|--------|---------|
| 1 | No (0) | Yes | 4 | 4 |
| 2 | Yes (1) | No | - | 4 |
| 3 | Yes (2) | No | - | 4 |
| 4 | Yes (3) | No | - | 4 |
| 100 | No (99) | Yes | 1 | 4 |
| 200 | No (199) | Yes | 1 | 4 |

---

### 6. 4Sum (Medium)
**Trigger:** Find all unique quadruplets that sum to a target.
**Intuition:** You can do this with $O(N^3)$ nested loops and Two Pointers (like 3Sum), but you can also use a Hash Map to do it in $O(N^2)$ average time.
Create a Hash Map where the Key is the sum of a pair `A+B`, and the Value is a list of pairs `(i, j)`.
Iterate through the array again to find `C+D`. Check if `Target - (C+D)` exists in the map. If it does, you have four numbers that sum to the target! (You must add logic to ensure the indices `i, j, k, l` are all unique and handle duplicates).

**Step-by-Step Walkthrough:**
```cpp
// nums = [1, 0, -1, 0, -2, 2], target = 0
//
// All pairs and their sums:
// (0,1): 1+0=1
// (0,2): 1+(-1)=0
// (0,3): 1+0=1
// (0,4): 1+(-2)=-1
// (0,5): 1+2=3
// (1,2): 0+(-1)=-1
// (1,3): 0+0=0
// (1,4): 0+(-2)=-2
// (1,5): 0+2=2
// (2,3): -1+0=-1
// (2,4): -1+(-2)=-3
// (2,5): -1+2=1
// (3,4): 0+(-2)=-2
// (3,5): 0+2=2
// (4,5): -2+2=0
//
// Group by sum:
// sum=1: [(0,1), (0,3), (2,5)]
// sum=0: [(0,2), (1,3), (4,5)]
// sum=-1: [(0,4), (1,2), (2,3)]
// sum=3: [(0,5)]
// sum=2: [(1,5), (3,5)]
// sum=-2: [(1,4), (3,4)]
// sum=-3: [(2,4)]
//
// For each pair (k,l), check if target - sum(k,l) exists:
// (0,2): sum=0, need 0 → found! (0,2) + (1,3) = [1,-1,0,0] ✓
// (4,5): sum=0, need 0 → found! (4,5) + (0,2) = [-2,2,1,-1] ✓
// ...
```

---

### 7. Valid Sudoku (Medium)
**Trigger:** Check if a Sudoku board is valid.
**Intuition:** Use Hash Sets to track seen numbers in each row, column, and 3x3 box.

```cpp
bool isValidSudoku(vector<vector<char>>& board) {
    // Use sets for rows, columns, and boxes
    vector<unordered_set<char>> rows(9), cols(9), boxes(9);
    
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            char val = board[r][c];
            
            if (val == '.') continue;
            
            // Calculate box index (0-8)
            int boxIdx = (r / 3) * 3 + (c / 3);
            
            // Check if already seen
            if (rows[r].count(val) || cols[c].count(val) || boxes[boxIdx].count(val)) {
                return false;
            }
            
            // Mark as seen
            rows[r].insert(val);
            cols[c].insert(val);
            boxes[boxIdx].insert(val);
        }
    }
    
    return true;
}
```

**What's happening:**
```cpp
// For each cell (r, c):
// 1. Check if value already in row r
// 2. Check if value already in column c
// 3. Check if value already in 3x3 box
//
// Box indexing:
// Box 0: rows 0-2, cols 0-2
// Box 1: rows 0-2, cols 3-5
// Box 2: rows 0-2, cols 6-8
// Box 3: rows 3-5, cols 0-2
// ...
// Box 8: rows 6-8, cols 6-8
//
// Formula: boxIdx = (r/3)*3 + (c/3)
```

---

### 8. Longest Substring Without Repeating Characters (Medium)
**Trigger:** Find the length of the longest substring without repeating characters.
**Intuition:** Sliding Window + Hash Map. Track character positions. When duplicate found, move left pointer past the previous occurrence.

```cpp
int lengthOfLongestSubstring(string s) {
    unordered_map<char, int> lastSeen;
    int maxLen = 0;
    int left = 0;
    
    for (int right = 0; right < s.size(); right++) {
        char c = s[right];
        
        // If char was seen and is within window, move left
        if (lastSeen.count(c) && lastSeen[c] >= left) {
            left = lastSeen[c] + 1;
        }
        
        lastSeen[c] = right;
        maxLen = max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

**What's happening:**
```cpp
// s = "abcabcbb"
//
// right=0, c='a': lastSeen={}, left=0
//   lastSeen['a']=0, maxLen=1
//
// right=1, c='b': lastSeen={'a':0}, left=0
//   lastSeen['b']=1, maxLen=2
//
// right=2, c='c': lastSeen={'a':0,'b':1}, left=0
//   lastSeen['c']=2, maxLen=3
//
// right=3, c='a': lastSeen={'a':0,...}, left=0
//   'a' seen at 0 >= left=0 → move left to 1
//   lastSeen['a']=3, maxLen=3
//
// right=4, c='b': lastSeen={'b':1,...}, left=1
//   'b' seen at 1 >= left=1 → move left to 2
//   lastSeen['b']=4, maxLen=3
//
// right=5, c='c': lastSeen={'c':2,...}, left=2
//   'c' seen at 2 >= left=2 → move left to 3
//   lastSeen['c']=5, maxLen=3
//
// right=6, c='b': lastSeen={'b':4,...}, left=3
//   'b' seen at 4 >= left=3 → move left to 5
//   lastSeen['b']=6, maxLen=3
//
// right=7, c='b': lastSeen={'b':6,...}, left=5
//   'b' seen at 6 >= left=5 → move left to 7
//   lastSeen['b']=7, maxLen=3
//
// Result: 3 (substring "abc")
```

---

### Key Patterns Summary

| Pattern | When to Use | Key Insight |
|---------|-------------|-------------|
| Complement | Find pair with sum | Store seen, check target-current |
| Frequency | Count occurrences | Array or map of counts |
| Grouping | Group by property | Use property as key |
| Prefix Sum | Subarray sums | Cumulative sum in map |
| Sliding Window + Set | Substring problems | Move left on duplicate |
| Frequency + Heap | Top K elements | Count then heapify |

### Quick Reference Table

| Problem | Time | Space | Pattern |
|---------|------|-------|---------|
| Two Sum | O(N) | O(N) | Complement |
| Ransom Note | O(N) | O(1) | Frequency |
| Group Anagrams | O(NK log K) | O(NK) | Grouping |
| Top K Frequent | O(N log K) | O(N) | Frequency + Heap |
| Longest Consecutive | O(N) | O(N) | Set + Sequence Start |
| 4Sum | O(N²) | O(N²) | Pair Sum Map |
| Valid Sudoku | O(1) | O(1) | Hash Set per row/col/box |
| Longest Substring | O(N) | O(min(N,M)) | Sliding Window + Map |

**When to Use Hashing:**
```
✓ Need O(1) lookup by value
✓ Counting occurrences
✓ Grouping by property
✓ Finding complements (pairs with sum)
✓ Checking for duplicates
✓ Prefix sum problems
✓ Anagram problems
```

**When NOT to Use Hashing:**
```
✗ Need sorted order (use sorting/BST)
✗ Need range queries (use BST)
✗ Need to find min/max (use Heap)
✗ Memory is very constrained (use array if small key range)
```

---

## Practice & Self-Check

These questions trace the solutions above on new inputs. Write out the map/set state at each step before checking the answers.

### Predict the Output / Trace by Hand

**Q1. Why `lastSeen[c] >= left`?** Run Problem 8's `lengthOfLongestSubstring` on `s = "abba"`. Give `left`, `lastSeen`, and `maxLen` after each `right`. Then: what would it return if the condition were only `lastSeen.count(c)` (without `&& lastSeen[c] >= left`)?

**Q2. Longest Consecutive: counting the work.** Run Problem 5's `longestConsecutive` on `[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]`.
(a) What is returned?
(b) How many numbers in the set pass the "start of sequence" test?
(c) How many `st.count(num + length)` calls does the `while` loop make in total?

**Q3. Ransom Note.** Trace Problem 2's `canConstruct("abc", "aabbd")` with a dry-run table. At which step does it stop, and what does it return?

**Q4. Sudoku box index.** Using `boxIdx = (r / 3) * 3 + (c / 3)` from Problem 7, which box do cells `(4, 7)`, `(8, 3)` and `(2, 5)` belong to?

**Q5. Top K Frequent.** Run Problem 4's `topKFrequent` on `[4, 4, 1, 1, 1, 2, 3, 3, 3, 3]` with `k = 2`. What does the frequency map look like, which pairs remain in the heap, and in what order does `result` come out?

### Coding Exercises

**E1 (Easy). Isomorphic Strings.** Two strings are isomorphic if the characters of `s` can be replaced one-to-one to get `t` (no two characters map to the same character).

```cpp
bool isIsomorphic(const string& s, const string& t);
// "egg",  "add"  -> true
// "foo",  "bar"  -> false   ('o' would map to both 'a' and 'r')
// "badc", "baba" -> false   ('b' and 'd' would both map to 'b')
```

**E2 (Easy–Medium). Find All Anagram Start Indices.** Return every start index `i` such that `s.substr(i, p.size())` is an anagram of `p` (lowercase letters only). Combine Ransom Note's frequency array with a fixed-size sliding window.

```cpp
vector<int> findAnagrams(const string& s, const string& p);
// s = "cbaebabacd", p = "abc" -> [0, 6]
// s = "abab",       p = "ab"  -> [0, 1, 2]
```

**E3 (Medium). Longest Substring with At Most K Distinct Characters.** Like Problem 8, but the window may contain up to `k` distinct characters (repeats allowed).

```cpp
int longestKDistinct(const string& s, int k);
// "eceba",   k = 2 -> 3   ("ece")
// "ccaabbb", k = 2 -> 5   ("aabbb")
```

#### Dry-Run: Answers

**Q1.** Returns **2**. Without the `>= left` guard it returns **3**, which is wrong.

| right | c | Seen in window? | left | lastSeen (after) | maxLen |
|-------|---|-----------------|------|------------------|--------|
| 0 | a | no | 0 | {a:0} | 1 |
| 1 | b | no | 0 | {a:0, b:1} | 2 |
| 2 | b | yes, 1 >= 0 | 2 | {a:0, b:2} | 2 |
| 3 | a | stored at 0, but 0 < left = 2 | 2 | {a:3, b:2} | 2 |

Without the guard, at right = 3 the stale entry `a:0` moves `left` **back** to 1, making the window `"bba"` (length 3) even though it contains two `b`s. The guard ignores positions that already slid out of the window.

**Q2.** (a) **9** (the run 0, 1, ..., 8; the duplicate 0 collapses in the set). (b) **1**: only 0 has no predecessor ($-1$ is absent); every other number $x$ in 1..8 has $x-1$ in the set. (c) **9** calls: 8 succeed (finding 1 through 8) and 1 fails (9 is absent). This is the "every number visited at most twice" argument: each element is counted once by the set iteration and once by a `while` check.

**Q3.** Returns **false** at step 3.

| Step | Char | count before | Available? | Action |
|------|------|--------------|------------|--------|
| init | - | a=2, b=2, d=1 | - | count magazine |
| 1 | 'a' | a=2 | yes | a → 1 |
| 2 | 'b' | b=2 | yes | b → 1 |
| 3 | 'c' | c=0 | no | return false |

**Q4.**
- `(4, 7)`: $(4/3) \cdot 3 + 7/3 = 1 \cdot 3 + 2 =$ **5**
- `(8, 3)`: $(8/3) \cdot 3 + 3/3 = 2 \cdot 3 + 1 =$ **7**
- `(2, 5)`: $(2/3) \cdot 3 + 5/3 = 0 + 1 =$ **1**

(Integer division: $4/3 = 1$, $7/3 = 2$, $8/3 = 2$, $5/3 = 1$, $2/3 = 0$.)

**Q5.** Frequency map `{4:2, 1:3, 2:1, 3:4}`. Whatever order the map is iterated in, every pair with frequency 1 or 2 is eventually popped, because the heap is capped at 2 and always ejects its smallest frequency. The heap ends with `(3, 1)` and `(4, 3)`. The min-heap pops the smaller frequency first, so `result = [1, 3]`.

**E1 — reference solution.** Two maps enforce a one-to-one mapping in both directions.

```cpp
bool isIsomorphic(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    unordered_map<char, char> sToT, tToS;
    for (size_t i = 0; i < s.size(); i++) {
        char a = s[i], b = t[i];
        auto it1 = sToT.find(a);
        auto it2 = tToS.find(b);
        if (it1 != sToT.end() && it1->second != b) return false;  // a already mapped elsewhere
        if (it2 != tToS.end() && it2->second != a) return false;  // b already claimed
        sToT[a] = b;
        tToS[b] = a;
    }
    return true;
}
```
Time $O(n)$, space $O(1)$ (at most 256 keys per map). With only `sToT`, `"badc"`/`"baba"` would wrongly pass.

**E2 — reference solution.** Keep a 26-slot count of the current window; slide by adding the new char and removing the one that falls out.

```cpp
vector<int> findAnagrams(const string& s, const string& p) {
    vector<int> result;
    int n = s.size(), m = p.size();
    if (m > n) return result;
    int need[26] = {0}, have[26] = {0};
    for (char c : p) need[c - 'a']++;
    for (int i = 0; i < n; i++) {
        have[s[i] - 'a']++;                        // char entering the window
        if (i >= m) have[s[i - m] - 'a']--;        // char leaving the window
        if (i >= m - 1 && equal(begin(need), end(need), begin(have)))
            result.push_back(i - m + 1);
    }
    return result;
}
// "cbaebabacd", "abc": window "cba" at 0 matches; "bac" at 6 matches.
```
Time $O(26 \cdot n) = O(n)$, space $O(1)$. An array beats a map here because the key range is 26 letters.

**E3 — reference solution.** Sliding window + frequency map; `freq.size()` is the number of distinct chars, so erase keys whose count hits 0.

```cpp
int longestKDistinct(const string& s, int k) {
    unordered_map<char, int> freq;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        freq[s[right]]++;
        while ((int)freq.size() > k) {             // too many distinct: shrink
            char out = s[left++];
            if (--freq[out] == 0) freq.erase(out);
        }
        best = max(best, right - left + 1);
    }
    return best;
}
// "eceba", k=2: e,ec,ece (3) -> add b: shrink to "eb" -> add a: shrink to "ba" -> best 3
```
Time $O(n)$ (each index enters and leaves the window once), space $O(k)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems hashing** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

