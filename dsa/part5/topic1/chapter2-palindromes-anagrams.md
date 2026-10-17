# Part 5, Topic 1: String Manipulation & Patterns
## Chapter 2: Palindromes & Anagrams

Two of the most common string patterns in interviews are checking for symmetry (Palindromes) and checking for identical composition (Anagrams).

---

### 1. Palindromes

A palindrome reads the same forwards and backwards (`"racecar"`).

#### 1a. Basic Palindrome Check (Two Pointers)

We already covered how to *check* if a string is a palindrome using **Opposite-End Two Pointers** (moving `left` and `right` inward).

```cpp
bool isPalindrome(string s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}
```

**What's happening:**
```cpp
// For "racecar":
// left=0, right=6: 'r' == 'r' ✓  → left=1, right=5
// left=1, right=5: 'a' == 'a' ✓  → left=2, right=4
// left=2, right=4: 'c' == 'c' ✓  → left=3, right=3
// left=3, right=3: left == right → loop ends → return true
```

**Dry-run table for `"racecar"`:**
```
Step  left  right  s[left]  s[right]  Match?  Action
────  ────  ─────  ───────  ────────  ──────  ──────────────
1     0     6      'r'      'r'       ✓       left++ right--
2     1     5      'a'      'a'       ✓       left++ right--
3     2     4      'c'      'c'       ✓       left++ right--
4     3     3      loop ends (left == right)
Result: true
```

**Dry-run table for `"hello"`:**
```
Step  left  right  s[left]  s[right]  Match?  Action
────  ────  ─────  ───────  ────────  ──────  ──────────────
1     0     4      'h'      'o'       ✗       return false
Result: false
```

#### 1b. Expand Around Center

What if the problem asks you to *count* or *find the longest* palindrome *inside* a larger string?
You cannot just check every possible substring; that takes O(N^3) time!

**The "Expand Around Center" Technique:**
Every palindrome has a center.
- In `"racecar"`, the center is `'e'`.
- In `"abba"`, the center is the invisible space between the two `'b'`s.

Instead of squeezing inward, we pick a center and **expand outward** (`left--` and `right++`) as long as the characters match. We do this for every possible center in the string.

```cpp
int expandAroundCenter(string s, int left, int right) {
    // Expand as long as we stay in bounds AND the characters match
    while (left >= 0 && right < s.length() && s[left] == s[right]) {
        left--;
        right++;
    }
    // The length of the palindrome we just found
    return right - left - 1;
}
```

**What's happening:**
```cpp
// expandAroundCenter(s, left, right) returns the LENGTH of the palindrome
// found by expanding outward from (left, right).
//
// After the while loop:
//   - left has gone one step too far left
//   - right has gone one step too far right
//   - So length = right - left - 1
//
// Example: s = "abacaba", expanding from center index 3 ('a'):
//   left=3, right=3: 'a'=='a' ✓ → left=2, right=4
//   left=2, right=4: 'b'=='b' ✓ → left=1, right=5
//   left=1, right=5: 'a'=='a' ✓ → left=0, right=6
//   left=0, right=6: 'c'=='a' ✗ → stop
//   length = 6 - 0 - 1 = 5
```

**Dry-run table for expanding center at index 3 in `"abacaba"`:**
```
Step  left  right  s[left]  s[right]  Match?  Length so far
────  ────  ─────  ───────  ────────  ──────  ─────────────
1     3     3      'a'      'a'       ✓       1
2     2     4      'b'      'b'       ✓       3
3     1     5      'a'      'a'       ✓       5
4     0     6      'c'      'a'       ✗       stop
Result: length = 6 - 0 - 1 = 5 → palindrome "bacab"
```

In the main function, you call this twice for every index `i`:
```cpp
string longestPalindrome(string s) {
    int start = 0, maxLen = 0;

    for (int i = 0; i < s.length(); i++) {
        int len1 = expandAroundCenter(s, i, i);       // Odd length
        int len2 = expandAroundCenter(s, i, i + 1);   // Even length
        int len = max(len1, len2);

        if (len > maxLen) {
            start = i - (len - 1) / 2;
            maxLen = len;
        }
    }

    return s.substr(start, maxLen);
}
```

**Why both odd and even?**
```
Odd length palindrome:    "racecar"
                           ^ center is 'e' (1 character)

Even length palindrome:   "abba"
                           ^^ center is between 'b' and 'b' (no character)

For index i:
  expand(i, i)   → handles odd-length (center on s[i])
  expand(i, i+1) → handles even-length (center between s[i] and s[i+1])
```

This reduces finding all palindromes from O(N^3) to O(N^2).

---

### 2. Anagrams

Two strings are anagrams if they contain the exact same characters in the exact same frequencies (e.g., `"listen"` and `"silent"`).

#### 2a. Naive Solution: Sort and Compare

```cpp
bool isAnagramSort(string s, string t) {
    if (s.length() != t.length()) return false;
    sort(s.begin(), s.end());
    sort(t.begin(), t.end());
    return s == t;
}
```

**What's happening:**
```cpp
// "listen" → sort → "eilnst"
// "silent" → sort → "eilnst"
// "eilnst" == "eilnst" → true ✓
//
// Time: O(N log N) due to sorting
// Space: O(N) or O(log N) depending on sort implementation
```

This works, but it takes O(N log N) time.

#### 2b. Optimal Solution: Frequency Array

Because the English alphabet only has 26 lowercase letters, we can use an integer array of size 26 to count the frequencies.
We increment the count for characters in the first string, and decrement the count for characters in the second string. If the strings are anagrams, the array will be perfectly restored to all `0`s.

```cpp
bool isAnagram(string s, string t) {
    if (s.length() != t.length()) return false;

    // A vector of size 26, initialized to 0
    vector<int> counts(26, 0);

    for (int i = 0; i < s.length(); i++) {
        counts[s[i] - 'a']++; // Increment for string s
        counts[t[i] - 'a']--; // Decrement for string t
    }

    // Check if any bucket is non-zero
    for (int count : counts) {
        if (count != 0) return false;
    }

    return true;
}
```

**What's happening:**
```cpp
// For s="eat", t="tea":
//
// i=0: s[0]='e' → counts[4]++ (e is index 4)
//      t[0]='t' → counts[19]-- (t is index 19)
//
// i=1: s[1]='a' → counts[0]++ (a is index 0)
//      t[1]='e' → counts[4]-- (e is index 4)
//
// i=2: s[2]='t' → counts[19]++ (t is index 19)
//      t[2]='a' → counts[0]-- (a is index 0)
//
// Final counts: all zeros → true (they are anagrams)
```

**Dry-run table for `s="eat"`, `t="tea"`:**
```
Index 0(a)  1(b)  2(c)  3(d)  4(e)  ...  19(t)  ...  25(z)
Start:     0     0     0     0     0         0         0

i=0:  e→counts[4]++     counts = [0,0,0,0,+1,...,0,...,0]
      t→counts[19]--    counts = [0,0,0,0,+1,...,-1,...,0]

i=1:  a→counts[0]++     counts = [+1,0,0,0,+1,...,-1,...,0]
      e→counts[4]--     counts = [+1,0,0,0,0,...,-1,...,0]

i=2:  t→counts[19]++    counts = [+1,0,0,0,0,...,0,...,0]
      a→counts[0]--     counts = [0,0,0,0,0,...,0,...,0]

Final: ALL ZEROS → anagram ✓
```

**Dry-run table for `s="cat"`, `t="dog"` (NOT anagrams):**
```
Index 0(a)  1(b)  2(c)  3(d)  ...  6(g)  ...  14(o)  ...  19(t)
Start:     0     0     0     0         0          0         0

i=0:  c→counts[2]++     counts = [0,0,+1,0,...,0,...,0,...,0]
      d→counts[3]--     counts = [0,0,+1,-1,...,0,...,0,...,0]

i=1:  a→counts[0]++     counts = [+1,0,+1,-1,...,0,...,0,...,0]
      o→counts[14]--    counts = [+1,0,+1,-1,...,0,...,-1,...,0]

i=2:  t→counts[19]++    counts = [+1,0,+1,-1,...,0,...,-1,...,+1]
      g→counts[6]--     counts = [+1,0,+1,-1,...,-1,...,-1,...,+1]

Final: NON-ZERO values exist → not anagram ✗
```

This takes O(N) time and O(1) space (the vector is always size 26, regardless of how long the strings are).

#### 2c. Two-Pass Frequency Count (Alternative)

```cpp
bool isAnagramTwoPass(string s, string t) {
    if (s.length() != t.length()) return false;

    vector<int> freq(26, 0);

    // Pass 1: count frequencies from s
    for (char c : s) {
        freq[c - 'a']++;
    }

    // Pass 2: decrement frequencies from t
    for (char c : t) {
        freq[c - 'a']--;
        if (freq[c - 'a'] < 0) return false;  // Early exit
    }

    return true;
}
```

**What's happening:**
```cpp
// This is a slight optimization over the single-pass version.
// If t has a character that s doesn't, freq goes negative → early return.
// No need to check all 26 buckets at the end.
```

---

### 3. Frequency Array vs Hash Map Comparison

```
Approach          Time     Space    When to Use
────────────────  ───────  ───────  ──────────────────────────────
vector<int>(26)   O(N)     O(1)     English lowercase letters only
unordered_map     O(N)     O(K)     Any character set (Unicode, etc.)
sort + compare    O(NlogN) O(N)     Quick to write, not optimal
```

```
When to use what:

Is the input only lowercase English?
  YES → Use vector<int>(26)      ← O(1) space, fastest
  NO  → Use unordered_map        ← handles any characters
  Need quick code? → sort approach ← O(N log N), 3 lines
```

---

### 4. Summary

- To find palindromes inside a string, iterate through the string and **Expand Around the Center**.
- To detect anagrams, never sort! Use a fixed-size `vector<int>(26)` as a frequency map to achieve O(N) time.
- The Expand Around Center technique handles both odd-length and even-length palindromes by expanding from `(i, i)` and `(i, i+1)` respectively.
- The frequency array trick works because `'a'-'z'` map to indices 0-25 via `c - 'a'`.

---

### Quick Reference Table

| Problem | Technique | Time | Space | Key Idea |
|---|---|---|---|---|
| Is palindrome? | Two pointers | O(N) | O(1) | Move inward from ends |
| Longest palindrome substring | Expand around center | O(N^2) | O(1) | Expand from each center |
| Is anagram? | Frequency array | O(N) | O(1) | `freq[c-'a']++` / `--` |
| Group anagrams | Sort as key + HashMap | O(NKlogK) | O(NK) | Sorted string = unique key |
| Count palindrome substrings | Expand around center | O(N^2) | O(1) | Count expansions at each center |
| Anagram in substring (sliding window) | Frequency array + window | O(N) | O(1) | Slide window, maintain counts |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Palindromes & Anagrams**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 palindromes anagrams** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

