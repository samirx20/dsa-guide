# Part 5, Topic 1: String Manipulation & Patterns
## Interview Problems Walkthrough

String problems often combine basic ASCII manipulation with previous patterns (like Sliding Window or Two Pointers).

---

### Problem Classification Table

| # | Problem | Difficulty | Core Pattern | Time | Space |
|---|---------|-----------|-------------|------|-------|
| 1 | Reverse String | Easy | Two Pointers (opposite ends) | O(N) | O(1) |
| 2 | Valid Anagram | Easy | Frequency Array (ASCII) | O(N) | O(1) |
| 3 | Valid Parentheses | Easy | Stack | O(N) | O(N) |
| 4 | Group Anagrams | Medium | Hash Map + Sort Key | O(NKlogK) | O(NK) |
| 5 | Longest Palindromic Substring | Medium | Expand Around Center | O(N^2) | O(1) |
| 6 | String to Integer (atoi) | Medium | Sequential Parsing + ASCII | O(N) | O(1) |

**Solution Approach Comparison:**
```
Problem                Approach A              Approach B              Winner
─────────────────────  ──────────────────────  ──────────────────────  ──────
Reverse String         Two pointers O(1)       Reverse + copy O(N)    Two pointers
Valid Anagram          Freq array O(N)         Sort O(NlogN)          Freq array
Valid Parentheses      Stack O(N)              Counting (wrong)       Stack
Group Anagrams         Sort as key O(NKlogK)   Freq as key O(NK)      Sort as key*
Longest Palindrome     Expand center O(N^2)    DP O(N^2)              Expand center
atoi                   Sequential parse        sscanf (library)       Sequential
```
*Sort as key is simpler; freq as key avoids sort but needs a hashable freq signature.*

---

### 1. Reverse String (Easy)
**Trigger:** Reverse a string in-place with O(1) extra memory.
**Intuition:** Opposite-end two pointers. Swap `s[left]` and `s[right]`, then squeeze inward.

**Step-by-Step Walkthrough for `"hello"`:**
```
Initial:  h  e  l  l  o
          L              R

Step 1:   swap h↔o → o  e  l  l  h
               L     R
               → L++, R--

Step 2:   swap e↔l → o  l  l  e  h
                  L  R
                  → L++, R--

Step 3:   L=2, R=2 → L >= R → STOP

Result: "olleh"
```

**Code:**
```cpp
void reverseString(vector<char>& s) {
    int left = 0, right = s.size() - 1;
    while (left < right) {
        swap(s[left], s[right]);
        left++;
        right--;
    }
}
```

**What's happening:**
```cpp
// Each iteration swaps one pair of characters from the outside in.
// After N/2 iterations, all characters are reversed.
// No extra array needed — O(1) space.
//
// "hello" → "olleh"
//   Swap h↔o: "oellh"
//   Swap e↔l: "olleh"
//   L meets R → done
```

**Comparison of approaches:**
```
Approach              Time     Space    Modifies Original?
────────────────────  ───────  ───────  ──────────────────
Two pointers          O(N)     O(1)     Yes (in-place)
Create new string     O(N)     O(N)     No (returns copy)
Stack-based           O(N)     O(N)     Depends
std::reverse          O(N)     O(1)     Yes (built-in)
```

---

### 2. Valid Anagram (Easy)
**Trigger:** Are two strings anagrams?
**Intuition:** Don't sort. Use the O(1) space `vector<int>(26)` frequency array trick.
*(See Chapter 2 for the exact code template).*

**Step-by-Step Walkthrough for `s="anagram"`, `t="nagaram"`:**
```
Initial freq: all zeros

i=0: s[0]='a' → freq[0]++    t[0]='n' → freq[13]--
i=1: s[1]='n' → freq[13]++   t[1]='a' → freq[0]--
i=2: s[2]='a' → freq[0]++    t[2]='g' → freq[6]--
i=3: s[3]='g' → freq[6]++    t[3]='a' → freq[0]--
i=4: s[4]='r' → freq[17]++   t[4]='m' → freq[12]--
i=5: s[5]='a' → freq[0]++    t[5]='a' → freq[0]--
i=6: s[6]='m' → freq[12]++   t[6]='r' → freq[17]--

All freq values return to 0 → anagram ✓
```

---

### 3. Valid Parentheses (Easy)
**Trigger:** Determine if a string of brackets `(){}[]` is validly closed.
**Intuition:** Use a **Stack**.
When you see an opening bracket, push the *corresponding closing bracket* onto the stack.
When you see a closing bracket, check if the stack is empty. If it is, return false. Pop the top of the stack and check if it matches the current character. If it doesn't, return false.
If the stack is empty at the very end, the string is valid.

**Step-by-Step Walkthrough for `"{[]}"`:**
```
Char: {  [  ]  }
Stack:  (bottom → top)

Step 1: '{' → push '}'     Stack: [ }]
Step 2: '[' → push ']'     Stack: [ }, ] ]
Step 3: ']' → pop, match?  ']' == ']' ✓   Stack: [ }]
Step 4: '}' → pop, match?  '}' == '}' ✓   Stack: []

Stack empty → valid ✓
```

**Step-by-Step Walkthrough for `"(]"` (invalid):**
```
Char: (  ]
Stack: (bottom → top)

Step 1: '(' → push ')'     Stack: [ )]
Step 2: ']' → pop, match?  ')' ≠ ']' ✗ → return false
```

**Code:**
```cpp
bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(') st.push(')');
        else if (c == '{') st.push('}');
        else if (c == '[') st.push(']');
        else {
            if (st.empty() || st.top() != c) return false;
            st.pop();
        }
    }
    return st.empty();
}
// Time: O(N), Space: O(N)
```

**What's happening:**
```cpp
// Why push the CLOSING bracket instead of the opening one?
// Because when we encounter a closing bracket,
// we just need to check: is the top of the stack what we expect?
//
// If we pushed opening brackets, we'd need to map:
//   ')' → '('
//   '}' → '{'
//   ']' → '['
// Pushing the expected closer is simpler — direct comparison.
```

**Approach comparison:**
```
Approach              Time     Space    Correct?
────────────────────  ───────  ───────  ────────
Stack (push closer)   O(N)     O(N)     ✓ Correct
Counting only (±1)    O(N)     O(1)     ✗ Wrong for "{[]}"
Regex replace loop    O(N^2)   O(N)     ✓ But slow
```

---

### 4. Group Anagrams (Medium)
**Trigger:** Given an array of strings, group the anagrams together.
**Intuition:** We need a Hash Map where the **Value** is a `vector<string>` (the group of anagrams). But what is the **Key**?
All anagrams (e.g., "bat", "tab") share the exact same sorted string ("abt").
Therefore, if we sort the string, we can use the sorted version as the Hash Map Key!

**Step-by-Step Walkthrough for `["eat","tea","tan","ate","nat","bat"]`:**
```
Input: ["eat", "tea", "tan", "ate", "nat", "bat"]

Processing:
  "eat" → sorted: "aet" → groups["aet"] = ["eat"]
  "tea" → sorted: "aet" → groups["aet"] = ["eat", "tea"]
  "tan" → sorted: "ant" → groups["ant"] = ["tan"]
  "ate" → sorted: "aet" → groups["aet"] = ["eat", "tea", "ate"]
  "nat" → sorted: "ant" → groups["ant"] = ["tan", "nat"]
  "bat" → sorted: "abt" → groups["abt"] = ["bat"]

Result: [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

**Code:**
```cpp
vector<vector<string>> groupAnagrams(vector<string>& strs) {
    unordered_map<string, vector<string>> groups;

    for (string s : strs) {
        string key = s;
        sort(key.begin(), key.end()); // "eat" becomes "aet"
        groups[key].push_back(s);     // Add "eat" to the "aet" group
    }

    vector<vector<string>> result;
    for (auto& [key, list] : groups) {
        result.push_back(list);
    }
    return result;
}
// Time: O(N * K log K) where N is number of strings, K is max length of a string.
// Space: O(N * K)
```

**What's happening:**
```cpp
// For each string:
//   1. Sort it to create a key ("eat" → "aet")
//   2. Use the key to find/create a group in the HashMap
//   3. Add the original (unsorted) string to that group
//
// All anagrams produce the same sorted key, so they end up in the same group.
```

**Alternative: Freq signature as key (avoids sorting):**
```cpp
vector<vector<string>> groupAnagrams(vector<string>& strs) {
    unordered_map<string, vector<string>> groups;

    for (string s : strs) {
        vector<int> freq(26, 0);
        for (char c : s) freq[c - 'a']++;

        // Build a key from the frequency array: "1#0#0#...#2#..."
        string key;
        for (int i = 0; i < 26; i++) {
            key += to_string(freq[i]) + "#";
        }

        groups[key].push_back(s);
    }

    vector<vector<string>> result;
    for (auto& [key, list] : groups) {
        result.push_back(list);
    }
    return result;
}
// Time: O(N * K) — no sorting needed!
// But the key string is longer, so HashMap operations are slightly slower in practice.
```

---

### 5. Longest Palindromic Substring (Medium)
**Trigger:** Find the longest palindrome inside a string.
**Intuition:** Do not check every substring! Use the **Expand Around Center** technique. Iterate through the string, treating each character (and the space between characters) as the center, and expand outward. Keep track of the maximum length found.
*(See Chapter 2 for the core expansion logic).*

**Step-by-Step Walkthrough for `"babad"`:**
```
For each index i:

i=0 ('b'):
  expand(0,0): 'b'==b' ✓ → (-1,1) OOB → len=1
  expand(0,1): 'b'≠'a' → len=0
  max so far: 1, start=0

i=1 ('a'):
  expand(1,1): 'a'=='a' ✓ → (0,2) 'b'≠'b'? No, 'b'=='b' ✓ → (-1,3) OOB → len=3
  expand(1,2): 'a'≠'b' → len=0
  max so far: 3, start=0 ("bab")

i=2 ('b'):
  expand(2,2): 'b'=='b' ✓ → (1,3) 'a'=='a' ✓ → (0,4) 'b'=='d'? ✗ → len=3
  expand(2,3): 'b'≠'a' → len=0
  max so far: 3 (tie, keep first)

i=3 ('a'):
  expand(3,3): 'a'=='a' ✓ → (2,4) 'b'≠'d' → len=1
  expand(3,4): 'a'≠'d' → len=0
  max so far: 3

i=4 ('d'):
  expand(4,4): 'd'=='d' ✓ → len=1
  expand(4,5): OOB → len=0
  max so far: 3

Result: "babad" → "bab" (or "aba", both valid)
```

**Full code:**
```cpp
string longestPalindrome(string s) {
    if (s.empty()) return "";

    int start = 0, maxLen = 1;

    for (int i = 0; i < s.length(); i++) {
        int len1 = expandAroundCenter(s, i, i);       // Odd
        int len2 = expandAroundCenter(s, i, i + 1);   // Even
        int len = max(len1, len2);

        if (len > maxLen) {
            start = i - (len - 1) / 2;
            maxLen = len;
        }
    }

    return s.substr(start, maxLen);
}

int expandAroundCenter(string s, int left, int right) {
    while (left >= 0 && right < s.length() && s[left] == s[right]) {
        left--;
        right++;
    }
    return right - left - 1;
}
```

---

### 6. String to Integer (atoi) (Medium)
**Trigger:** Implement the `atoi` function (parse a string into a 32-bit signed integer).
**Intuition:** This problem isn't about algorithms; it's about handling annoying edge cases carefully.
1. Skip leading whitespace.
2. Check for an optional `+` or `-` sign.
3. Iterate through digits (`while isdigit(c)`). Use the ASCII trick: `digit = c - '0'`.
4. **The Trap (Overflow):** Before adding the new digit (`result = result * 10 + digit`), you MUST check if it will overflow the 32-bit integer limit (`INT_MAX` or `INT_MIN`).

**Step-by-Step Walkthrough for `"  -42"`:**
```
Input: "  -42"

Step 1: Skip whitespace
  i=0: ' ' → skip
  i=1: ' ' → skip
  i=2: '-' → not whitespace, stop

Step 2: Check sign
  s[2] = '-' → sign = -1, i=3

Step 3: Process digits
  i=3: s[3]='4' → digit=4, result = 0*10 + 4 = 4
  i=4: s[4]='2' → digit=2, result = 4*10 + 2 = 42

Step 4: Return result * sign = 42 * (-1) = -42
```

**Step-by-Step Walkthrough for `"91283472332"` (overflow):**
```
Input: "91283472332"

i=0: digit=9, result = 9
i=1: digit=1, result = 91
i=2: digit=2, result = 912
...
i=9: digit=3, result = 9128347233
  Check: result * sign = 9128347233 > INT_MAX (2147483647) → return INT_MAX
```

**Code:**
```cpp
int myAtoi(string s) {
    int i = 0, n = s.length(), sign = 1;
    long result = 0; // Use long to catch overflow easily

    // 1. Skip spaces
    while (i < n && s[i] == ' ') i++;

    // 2. Sign
    if (i < n && (s[i] == '+' || s[i] == '-')) {
        sign = (s[i] == '-') ? -1 : 1;
        i++;
    }

    // 3. Process digits
    while (i < n && isdigit(s[i])) {
        result = result * 10 + (s[i] - '0');

        // 4. Handle overflow boundary
        if (result * sign >= INT_MAX) return INT_MAX;
        if (result * sign <= INT_MIN) return INT_MIN;

        i++;
    }

    return result * sign;
}
```

**What's happening:**
```cpp
// The key ASCII trick: s[i] - '0' converts char digit to int
// '4' - '0' = 52 - 48 = 4
//
// Why use long for result?
// If result exceeds INT_MAX during computation, int would overflow
// (undefined behavior in C++). long catches it gracefully.
//
// Overflow check BEFORE assignment:
//   If result * sign would exceed INT_MAX → clamp to INT_MAX
//   If result * sign would go below INT_MIN → clamp to INT_MIN
```

---

### 7. Common String Problem Patterns Summary

```
Pattern                   Problems                    Key Trick
────────────────────────  ──────────────────────────  ──────────────────────
Two Pointers (opposite)   Reverse String, Palindrome  Swap from ends inward
Frequency Array           Anagram problems            freq[c-'a']++
Stack matching            Parentheses, HTML tags      Push expected closer
Expand Around Center      Palindrome substrings       expand(i,i) + expand(i,i+1)
Sequential Parsing        atoi, parsing expressions   Process char by char
HashMap + Sort Key        Group Anagrams              sorted string = unique key
Sliding Window            Substring problems          Fixed/dynamic window size
```

---

### Quick Reference Table

| Problem | Pattern | Time | Space | Key Line |
|---|---|---|---|---|
| Reverse String | Two pointers | O(N) | O(1) | `swap(s[left++], s[right--])` |
| Valid Anagram | Freq array | O(N) | O(1) | `freq[c-'a']++/--` |
| Valid Parentheses | Stack | O(N) | O(N) | `st.push(expected_closer)` |
| Group Anagrams | HashMap + sort | O(NKlogK) | O(NK) | `sort(key.begin(), key.end())` |
| Longest Palindrome | Expand center | O(N^2) | O(1) | `expand(i,i)` + `expand(i,i+1)` |
| String to Integer | Sequential parse | O(N) | O(1) | `result = result*10 + (c-'0')` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Stack trace for brackets.** Run `isValid` on three inputs: `"([)]"`, `"(([]){})"` and `"]"`. For each, say what it returns and at which character it decides. For `"(([]){})"`, what is the maximum stack size reached?

**Q2. atoi edge cases.** What does the chapter's `myAtoi` return for each input, and at which index does it stop reading?
- (a) `"   +0042abc7"`
- (b) `"-91283472332"`
- (c) `"  +-12"`
- (d) `"words 987"`

**Q3. Why the `#` in the frequency key?** In the frequency-signature version of `groupAnagrams`, what key is produced for `"bab"`? Which strings in `["abc", "bca", "aab", "aba", "cab", "bb"]` end up in the same group? Finally, find two strings that are *not* anagrams but would get the same key if the `"#"` separator were removed.

**Q4. Longest palindrome, even center.** Run `longestPalindrome("forgeeksskeegfor")`. Which call (`i`, odd or even) finds the answer, what are `left` and `right` when its loop stops, and what `start` / `maxLen` result?

**Q5. Reverse, mid-way.** Run `reverseString` on `"abcdefg"`. What does the array look like after 2 iterations? How many swaps happen in total, and what is the general formula?

### Coding Exercises

**E1 (Easy).** *Reverse Words.* Return the words in reverse order, separated by single spaces, with no leading/trailing spaces. Use `stringstream >>` to split.

```cpp
string reverseWords(const string& s);
```

- `"the sky is blue"` → `"blue is sky the"`
- `"  hello   world  "` → `"world hello"`

**E2 (Easy–Medium).** *Valid Palindrome II.* Return `true` if `s` can become a palindrome after deleting **at most one** character. Use opposite-end two pointers; on the first mismatch, try skipping either side once.

```cpp
bool validPalindrome(const string& s);
```

- `"abca"` → `true` (delete `'c'` or `'b'`)
- `"abc"` → `false`

**E3 (Medium).** *Minimum Remove to Make Valid Parentheses.* The string contains lowercase letters, `'('` and `')'`. Remove the minimum number of parentheses so the result is valid, keeping everything else in order. Use a stack of **indices** of unmatched `'('`.

```cpp
string minRemoveToMakeValid(string s);
```

- `"lee(t(c)o)de)"` → `"lee(t(c)o)de"`
- `"a)b(c)d"` → `"ab(c)d"`;  `"))(("` → `""`

#### Dry-Run: Answers

**Q1.**
- `"([)]"` → **false** at index 2: stack (bottom→top) is `[ ')', ']' ]`, the char is `')'`, but `top = ']'`.
- `"(([]){})"` → **true**; max stack size **3**.

| Char | Action | Stack (bottom → top) |
|------|--------|----------------------|
| `(` | push `)` | `)` |
| `(` | push `)` | `) )` |
| `[` | push `]` | `) ) ]` ← size 3 |
| `]` | pop, matches | `) )` |
| `)` | pop, matches | `)` |
| `{` | push `}` | `) }` |
| `}` | pop, matches | `)` |
| `)` | pop, matches | empty → true |

- `"]"` → **false** at index 0: a closer arrives while the stack is empty.

Note that `"([)]"` has balanced counts of every bracket type, which is exactly why the "counting only" approach is wrong.

**Q2.**
- (a) **42**. Skips 3 spaces, reads `'+'` at index 3, digits `0,0,4,2` at indices 4–7 (result 0 → 0 → 4 → 42), stops at `'a'` (index 8). The trailing `7` is never reached.
- (b) **-2147483648** (`INT_MIN`). Results grow 9, 91, …, 912834723 (9 digits, still above `INT_MIN` after the sign); the 10th digit (index 10) makes `result = 9128347233`, so `result * sign <= INT_MIN` → return immediately. (This assumes `long` is 64-bit, as on Linux/macOS. On Windows `long` is 32-bit and `9128347233` would itself overflow, so `long long` is the portable choice.)
- (c) **0**. `'+'` is consumed as the sign at index 2; index 3 is `'-'`, which is not a digit, so the digit loop never runs.
- (d) **0**. After skipping zero spaces, `s[0] = 'w'` is neither a sign nor a digit; nothing is read.

**Q3.** `"bab"` has `a = 1`, `b = 2`, so its key is `"1#2#"` followed by `"0#"` 24 times. Groups: `{abc, bca, cab}`, `{aab, aba}`, `{bb}`.
Without the separator, a string with `a = 1, b = 11` (e.g. `"a"` + 11 `b`s) and one with `a = 11, b = 1` (11 `a`s + `"b"`) both produce `"111"` followed by 24 `"0"`s — the same key for non-anagrams. With `"#"`, they become `"1#11#..."` vs `"11#1#..."`.

**Q4.** Answer **`"geeksskeeg"`** (length 10), found by the **even** call at `i = 7`: `expandAroundCenter(s, 7, 8)`.

| Indices compared | Chars | Match? |
|------------------|-------|--------|
| 7, 8 | s, s | yes |
| 6, 9 | k, k | yes |
| 5, 10 | e, e | yes |
| 4, 11 | e, e | yes |
| 3, 12 | g, g | yes |
| 2, 13 | r, f | no → stop |

The loop stops with `left = 2`, `right = 13`, so length = 13 − 2 − 1 = 10; `start = 7 - (10 - 1) / 2 = 7 - 4 = 3` and `maxLen = 10` → `s.substr(3, 10)`.

**Q5.** After 2 iterations: `g f c d e b a`. Total swaps: **3** (`a↔g`, `b↔f`, `c↔e`); the loop stops when `left = right = 3` (the middle `'d'` stays). In general $\lfloor N / 2 \rfloor$ swaps.

**E1 — reference solution**

```cpp
string reverseWords(const string& s) {
    stringstream ss(s);
    vector<string> words;
    string w;
    while (ss >> w) words.push_back(w);   // >> skips any run of whitespace

    string result;
    for (int i = (int)words.size() - 1; i >= 0; i--) {
        result += words[i];
        if (i > 0) result += ' ';
    }
    return result;
}
```

Time $O(N)$, space $O(N)$. `>>` handles the extra spaces for free; no manual trimming needed.

**E2 — reference solution**

```cpp
bool isPalRange(const string& s, int left, int right) {
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}

bool validPalindrome(const string& s) {
    int left = 0, right = (int)s.size() - 1;
    while (left < right) {
        if (s[left] != s[right]) {
            // spend the one deletion: drop s[left] or drop s[right]
            return isPalRange(s, left + 1, right) || isPalRange(s, left, right - 1);
        }
        left++;
        right--;
    }
    return true;
}
```

Time $O(N)$ (at most two extra linear scans), space $O(1)$. For `"abca"`: mismatch `b` vs `c` at (1, 2); dropping either leaves a 1-character range → true.

**E3 — reference solution**

```cpp
string minRemoveToMakeValid(string s) {
    stack<int> open;                         // indices of unmatched '('
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] == '(') {
            open.push(i);
        } else if (s[i] == ')') {
            if (!open.empty()) open.pop();   // matched
            else s[i] = '*';                 // unmatched ')': mark for removal
        }
    }
    while (!open.empty()) {                  // leftover '(' are unmatched
        s[open.top()] = '*';
        open.pop();
    }
    string result;
    for (char c : s) if (c != '*') result += c;
    return result;
}
```

Time $O(N)$, space $O(N)$. Each removed character is provably unmatchable, so the number removed is minimal. `"a)b(c)d"`: the `')'` at index 1 has no partner → removed; `'('` at 3 and `')'` at 5 match → `"ab(c)d"`. The `'*'` marker is safe because the input contains only letters and parentheses.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems strings** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

