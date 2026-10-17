# Part 5, Topic 1: String Manipulation & Patterns
## Chapter 3: The KMP Algorithm (Overview)

**Trigger:** "Find if String A (the pattern) is a substring of String B (the text) in O(N) time."

In C++, you usually just call `StringB.find(StringA)`. But what if the interviewer forbids built-in functions?

---

### 1. The Naive Approach

You place the pattern at the beginning of the text. You check if it matches. If it fails, you shift the pattern to the right by exactly one character and try again.

```
Text:    A A A B A B
Pattern: A A B

Step 1:  [A A B] A B      Match at pos 0? A=A ✓, A=A ✓, B≠A ✗ → shift
         A A A B A B

Step 2:   A [A A B] B     Match at pos 1? A=A ✓, A=A ✓, B≠A ✗ → shift
         A A A B A B

Step 3:    A A [A B A]    Match at pos 2? A=A ✓, A≠B ✗ → shift
         A A A B A B

Step 4:     A A A [B A B] Match at pos 3? A≠B ✗ → shift
         A A A B A B

Step 5:      A A A B [A B] Match at pos 4? A=A ✓, B=B ✓ → FOUND at pos 4!
         A A A B A B
```

If the pattern is `"AAAAAB"` and the text is `"AAAAAAAAAB"`, you will constantly match 5 characters, fail on the 6th, and then shift over by just 1. This results in O(N × M) time (where N is text length, M is pattern length).

**What's happening:**
```
The naive approach wastes work. After failing at position i,
it shifts by 1 and re-checks characters it already verified.

Naive approach worst case:
Text:    "AAAAAAAAB"
Pattern: "AAAAAB"

Every position matches 5 chars then fails on the 6th.
We do 5 comparisons × (N-M+1) positions = O(N × M) work.
```

**Dry-run comparison:**
```
Approach     Comparisons for "AAAAAAAAB" vs "AAAAAB"
──────────   ──────────────────────────────────────
Naive        5 × 5 = 25 comparisons
KMP          ~10 comparisons (linear!)
```

---

### 2. The Knuth-Morris-Pratt (KMP) Algorithm

KMP is a famous algorithm that searches in O(N + M) time.
The core idea is: **When a mismatch occurs, we already know some of the characters in the text because we just matched them.** We shouldn't throw that information away by shifting the pattern by just 1!

#### The LPS Array (Longest Prefix Suffix)

Before searching, KMP pre-processes the Pattern string to build an LPS array.
The LPS array tells us: *For the substring ending at index `i`, what is the length of the longest proper prefix that is also a suffix?*

If that sounds like gibberish, look at this pattern: `"A B C D A B C"`
If we match the first 6 characters `"A B C D A B"` but fail on the 7th, look at what we successfully matched.
The prefix `"A B"` is identical to the suffix `"A B"`.
Therefore, we don't need to shift the pattern all the way back to the beginning. We can shift it so the prefix `"A B"` aligns with where the suffix `"A B"` just was, saving massive amounts of time!

---

### 3. Building the LPS Array (Step by Step)

The LPS (Longest Proper Prefix which is also Suffix) array is the heart of KMP. For each position `i` in the pattern, `lps[i]` stores the length of the longest proper prefix of `pattern[0..i]` that is also a suffix of `pattern[0..i]`.

```cpp
void computeLPS(string pattern, vector<int>& lps) {
    int length = 0;  // Length of the previous longest prefix suffix
    int i = 1;       // lps[0] is always 0, start from index 1

    lps[0] = 0;

    while (i < pattern.length()) {
        if (pattern[i] == pattern[length]) {
            length++;
            lps[i] = length;
            i++;
        } else {
            if (length != 0) {
                // Don't reset i! Just move length back.
                length = lps[length - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
}
```

**What's happening:**
```cpp
// We use two pointers: 'i' (current position) and 'length' (match length).
//
// If pattern[i] == pattern[length]:
//   → We found a match, extend the current prefix-suffix.
//   → lps[i] = length + 1
//   → Move both i and length forward.
//
// If they don't match:
//   → We can't extend. Try a shorter prefix-suffix.
//   → Set length = lps[length - 1] (fall back to previous match).
//   → DON'T increment i (we haven't processed this character yet).
//   → If length is 0, set lps[i] = 0 and move on.
```

#### Dry-Run: Building LPS for `"A A B A A C"`

```
Pattern:  A  A  B  A  A  C
Index:    0  1  2  3  4  5

Step   i   length  pattern[i]  pattern[len]  Match?  Action         lps[]
────   ──  ──────  ──────────  ────────────  ──────  ─────────────  ────────────────
Init   1   0       —           —             —       lps[0]=0       [0,_,_,_,_,_]
1      1   0       'A'         'A'           ✓       lps[1]=1, i++  [0,1,_,_,_,_]
2      2   1       'B'         'A'           ✗       length=lps[0]=0
2b     2   0       'B'         'A'           ✗       lps[2]=0, i++  [0,1,0,_,_,_]
3      3   0       'A'         'A'           ✓       lps[3]=1, i++  [0,1,0,1,_,_]
4      4   1       'A'         'A'           ✓       lps[4]=2, i++  [0,1,0,1,2,_]
5      5   2       'C'         'B'           ✗       length=lps[1]=1
5b     5   1       'C'         'A'           ✗       length=lps[0]=0
5c     5   0       'C'         'A'           ✗       lps[5]=0, i++  [0,1,0,1,2,0]

Final LPS: [0, 1, 0, 1, 2, 0]
```

**Reading the LPS table:**
```
Index 0: LPS=0  → "A"         has no proper prefix-suffix
Index 1: LPS=1  → "AA"        prefix "A" = suffix "A"
Index 2: LPS=0  → "AAB"       no proper prefix-suffix
Index 3: LPS=1  → "AABA"      prefix "A" = suffix "A"
Index 4: LPS=2  → "AABAA"     prefix "AA" = suffix "AA"
Index 5: LPS=0  → "AABAAC"    no proper prefix-suffix
```

#### Dry-Run: Building LPS for `"A B A B C"`

```
Pattern:  A  B  A  B  C
Index:    0  1  2  3  4

Step   i   length  pattern[i]  pattern[len]  Match?  Action         lps[]
────   ──  ──────  ──────────  ────────────  ──────  ─────────────  ───────────
Init   1   0       —           —             —       lps[0]=0       [0,_,_,_,_]
1      1   0       'B'         'A'           ✗       lps[1]=0, i++  [0,0,_,_,_]
2      2   0       'A'         'A'           ✓       lps[2]=1, i++  [0,0,1,_,_]
3      3   1       'B'         'B'           ✓       lps[3]=2, i++  [0,0,1,2,_]
4      4   2       'C'         'A'           ✗       length=lps[1]=0
4b     4   0       'C'         'A'           ✗       lps[4]=0, i++  [0,0,1,2,0]

Final LPS: [0, 0, 1, 2, 0]
```

---

### 4. The KMP Search Algorithm

Once we have the LPS array, searching is a single pass through the text:

```cpp
void kmpSearch(string text, string pattern) {
    int n = text.length();
    int m = pattern.length();

    vector<int> lps(m, 0);
    computeLPS(pattern, lps);

    int i = 0;  // index for text
    int j = 0;  // index for pattern

    while (i < n) {
        if (text[i] == pattern[j]) {
            i++;
            j++;

            if (j == m) {
                cout << "Pattern found at index " << i - j << endl;
                j = lps[j - 1];  // Continue searching for more matches
            }
        } else {
            if (j != 0) {
                j = lps[j - 1];  // Use LPS to skip comparisons
            } else {
                i++;
            }
        }
    }
}
```

**What's happening:**
```cpp
// Two pointers: i (text), j (pattern)
//
// Match: both advance (i++, j++)
//   If j reaches pattern length → full match found!
//   Reset j using LPS to find overlapping matches.
//
// Mismatch:
//   If j > 0: use LPS to skip — j = lps[j-1]
//     (DON'T move i! We recheck text[i] against the new pattern position)
//   If j == 0: no match yet, advance i
//
// Key insight: i NEVER goes backward! This is what makes KMP O(N).
```

#### Dry-Run: KMP Search for Pattern `"A A B"` in Text `"A A A B A B"`

```
LPS for "AAB": [0, 1, 0]

Step  i  j  text[i]  pattern[j]  Match?  Action              Result
────  ─  ─  ───────  ──────────  ──────  ──────────────────  ──────────
1     0  0  'A'      'A'         ✓       i++ j++             —
2     1  1  'A'      'A'         ✓       i++ j++             —
3     2  2  'A'      'B'         ✗       j=lps[1]=1          —
4     2  1  'A'      'A'         ✓       i++ j++             —
5     3  2  'B'      'B'         ✓       i++ j++             —
6     4  3  —        j==m=3      —       FOUND at 4-3=1!     ✓
                                          j=lps[2]=0          —
7     4  0  'A'      'A'         ✓       i++ j++             —
8     5  1  'B'      'A'         ✗       j=lps[0]=0          —
9     5  0  'B'      'A'         ✗       i++                 —
10    6  —  i==n      done        —       STOP                —

Pattern found at index 1!
```

---

### 5. Why KMP is O(N)

```
Naive approach:
  Text:    A A A A A B
  Pattern: A A B
  
  Position 0: match A,A, fail B → shift 1
  Position 1: match A,A, fail B → shift 1
  Position 2: match A,A, fail B → shift 1
  Position 3: match A,A, fail B → shift 1
  Position 4: match A,B ✓ → FOUND
  
  Total comparisons: 3×4 + 2 = 14

KMP approach:
  Text:    A A A A A B
  Pattern: A A B  (LPS: [0,1,0])
  
  Position 0-2: match A,A, fail B → j=lps[1]=1 (skip 1 comparison!)
  Position 2:   match A,B ✓ → j=2, match B,B ✓ → FOUND!
  
  Total comparisons: ~6

Key: i NEVER goes backward. Each character of text is compared at most a few times.
```

---

### 6. Will I be asked to code KMP?

**It is highly unlikely.**
Writing the KMP LPS generation logic perfectly on a whiteboard is notoriously difficult and error-prone.

Most top-tier interviewers (FAANG) explicitly avoid asking problems that require memorizing complex, specific algorithms like KMP or Tarjan's algorithm. They prefer problems that test your general problem-solving logic (like Hash Maps, Two Pointers, or BFS).

**However, you should know it exists.** If you are asked to implement string matching, you should:
1. Explain the Naive O(N × M) approach and code it.
2. Tell the interviewer: *"We can optimize this to O(N+M) using the KMP algorithm by precomputing an LPS array to avoid redundant comparisons, but the implementation is quite complex."*
3. 99% of the time, the interviewer will say, "That's exactly right, the naive approach is fine for now, let's move on."

---

### 7. Summary

- The naive pattern matcher wastes time re-checking characters it already matched.
- KMP builds an LPS (Longest Prefix Suffix) array to remember what we've already matched.
- When a mismatch occurs, the LPS array tells us how far we can safely skip ahead.
- The search phase runs in O(N) because the text pointer `i` never moves backward.
- The LPS construction runs in O(M) using a two-pointer technique.
- Total: O(N + M) time, O(M) space for the LPS array.

---

### Quick Reference Table

| Concept | Formula / Index | Example |
|---|---|---|
| LPS definition | longest proper prefix = suffix for `pat[0..i]` | `"AABAA"` → LPS[4]=2 |
| LPS base case | `lps[0] = 0` | Always |
| Mismatch skip | `j = lps[j-1]` | Avoid re-checking matched chars |
| Match advance | `i++, j++` | Both move forward |
| Full match found | `j == m` | Pattern at index `i - j` |
| After match | `j = lps[j-1]` | Find overlapping matches |
| Naive time | O(N × M) | Worst case: all mismatches at end |
| KMP time | O(N + M) | LPS build O(M) + search O(N) |
| KMP space | O(M) | LPS array of size M |

### 8. Common KMP Interview Problems

While you rarely need to implement KMP from scratch, understanding the LPS array concept helps with related problems.

**Problem 1: Find all occurrences of pattern in text**
```cpp
vector<int> findAllOccurrences(string text, string pattern) {
    vector<int> result;
    int n = text.length(), m = pattern.length();
    vector<int> lps(m, 0);
    computeLPS(pattern, lps);
    
    int i = 0, j = 0;
    while (i < n) {
        if (text[i] == pattern[j]) {
            i++; j++;
            if (j == m) {
                result.push_back(i - j);
                j = lps[j - 1];  // Continue searching
            }
        } else {
            if (j != 0) j = lps[j - 1];
            else i++;
        }
    }
    return result;
}
// Example: findAllOccurrences("AABAABAABA", "AABA") → [0, 3, 6]
```

**Problem 2: Minimum rotations to make strings equal**
```cpp
// Check if one string is a rotation of another
bool isRotation(string s1, string s2) {
    if (s1.length() != s2.length()) return false;
    // Concatenate s1 with itself: if s2 is a rotation, it's a substring
    string combined = s1 + s1;
    // Use KMP (or string::find) to check if s2 is substring of combined
    return kmpSearchReturnBool(combined, s2);
}
// "abcde" + "abcde" = "abcdeabcde"
// "cdeab" is a substring → YES, it's a rotation
```

**Problem 3: Longest prefix which is also suffix**
```cpp
// Given a string, find the longest proper prefix that is also a suffix
int longestPrefixSuffix(string s) {
    int n = s.length();
    vector<int> lps(n, 0);
    computeLPS(s, lps);
    return lps[n - 1];  // LPS of the entire string
}
// "abcab" → LPS[4] = 2 ("ab" is both prefix and suffix)
// "aaaa" → LPS[3] = 3 ("aaa" is both prefix and suffix)
```

**What's happening:**
```
Why does concatenation solve rotation problems?

If s2 is a rotation of s1, then s2 is guaranteed to be a
substring of s1 + s1.

Example: s1 = "hello", s2 = "llohe"
  s1 + s1 = "hellohello"
  "llohe" appears at index 2 → s2 is a rotation of s1

This trick converts a rotation problem into a substring search,
which KMP solves in O(N + M) time.
```

### 9. KMP vs Other String Algorithms

| Algorithm | Time | Space | Use Case |
|-----------|------|-------|----------|
| Naive | O(N × M) | O(1) | Simple, short strings |
| KMP | O(N + M) | O(M) | Pattern matching with preprocessing |
| Rabin-Karp | O(N + M) avg | O(1) | Multiple pattern search |
| Z-Algorithm | O(N + M) | O(N + M) | Pattern matching + prefix problems |
| Boyer-Moore | O(N/M) best | O(K) | Alphabet-heavy, long patterns |

**When to use which:**
- **KMP:** Best general-purpose pattern matching. Always O(N+M).
- **Rabin-Karp:** Good when searching for multiple patterns simultaneously (hash-based).
- **Boyer-Moore:** Best in practice for single-pattern search on large alphabets (skips characters).
- **Z-Algorithm:** Similar to KMP but easier to implement for some problems.

**What's happening:**
```
Why isn't KMP always used?
  - For small strings, naive O(N×M) is fine (no preprocessing overhead)
  - For single-character searches, Boyer-Moore can skip more characters
  - For multiple patterns, Rabin-Karp's hash approach is more flexible

KMP shines when:
  - Pattern has repetitive structure (LPS array saves comparisons)
  - You need guaranteed O(N+M) worst case
  - Finding all overlapping occurrences
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Build an LPS array with a double fall-back.** Run `computeLPS` on `"ABACABAB"`. Give the final `lps` array, and show exactly what happens at `i = 7` (where `length` falls back before matching again).

**Q2. Overlapping matches.** Run `findAllOccurrences("ABABABAB", "ABAB")`. What is the LPS array for `"ABAB"`, what does the function return, and what is `j` reset to after each match?

**Q3. Naive vs KMP, counted.** Text `"AAAAAAB"`, pattern `"AAAB"`. Count the character comparisons made by the naive approach (stop each alignment at the first mismatch). Then count the `text[i] == pattern[j]` comparisons made by `kmpSearch`. Where is the match?

**Q4. Longest prefix-suffix.** What does `longestPrefixSuffix("abcabcab")` return? Write the full LPS array and name the prefix/suffix.

**Q5. Why fall back to `lps[length - 1]`?** Someone "simplifies" the mismatch branch of `computeLPS` to `length = 0;` (instead of `length = lps[length - 1];`). For the pattern `"AAACAAAA"`, which `lps` entry becomes wrong, and what are the correct and the buggy values?

### Coding Exercises

**E1 (Easy).** *Naive search.* Return the first index where `pattern` occurs in `text`, or `-1`. An empty pattern matches at index 0. No `find`.

```cpp
int naiveFind(const string& text, const string& pattern);
```

- `text = "hello", pattern = "ll"` → `2`
- `text = "aaaaa", pattern = "bba"` → `-1`

**E2 (Easy–Medium).** *String rotation with KMP.* The chapter's `isRotation` calls an undefined `kmpSearchReturnBool`. Write it using `computeLPS`, then use it to decide whether `s2` is a rotation of `s1`.

```cpp
bool kmpSearchReturnBool(const string& text, const string& pattern);
bool isRotation(const string& s1, const string& s2);
```

- `s1 = "waterbottle", s2 = "erbottlewat"` → `true`
- `s1 = "abcd", s2 = "acbd"` → `false`

**E3 (Medium).** *Repeated Substring Pattern.* Return `true` if `s` can be built by repeating one of its proper substrings two or more times. Use the LPS array: let `p = n - lps[n-1]`; the answer is `true` exactly when `lps[n-1] > 0` and `n % p == 0`.

```cpp
bool repeatedSubstringPattern(const string& s);
```

- `"abab"` → `true`;  `"aba"` → `false`
- `"abcabcabcabc"` → `true`

#### Dry-Run: Answers

**Q1.** Final `lps = [0, 0, 1, 0, 1, 2, 3, 2]`.

| i | length | pattern[i] | pattern[length] | Action | lps[i] |
|---|--------|------------|-----------------|--------|--------|
| 1 | 0 | B | A | mismatch, length 0 → set 0, i++ | 0 |
| 2 | 0 | A | A | match → length 1 | 1 |
| 3 | 1 | C | B | mismatch → `length = lps[0] = 0` | — |
| 3 | 0 | C | A | mismatch, length 0 → set 0, i++ | 0 |
| 4 | 0 | A | A | match → length 1 | 1 |
| 5 | 1 | B | B | match → length 2 | 2 |
| 6 | 2 | A | A | match → length 3 | 3 |
| 7 | 3 | B | C | mismatch → `length = lps[2] = 1` | — |
| 7 | 1 | B | B | match → length 2 | 2 |

At `i = 7` the candidate `"ABA"` + `B` fails (`'C'` expected), but the shorter border `"A"` of `"ABA"` can still be extended to `"AB"`, so `lps[7] = 2`. Note that `i` did not move during the fall-back.

**Q2.** LPS of `"ABAB"` = `[0, 0, 1, 2]`. Returns **`[0, 2, 4]`**.

| Match found when | i after | Reported index `i - j` | j reset to `lps[3]` |
|------------------|---------|------------------------|---------------------|
| text[0..3] | 4 | 0 | 2 |
| text[2..5] | 6 | 2 | 2 |
| text[4..7] | 8 | 4 | 2 |

Resetting `j` to 2 (not 0) keeps the already-matched `"AB"` at the end of each match as the start of the next one — that is how overlapping matches are found. Total: 8 comparisons, one per text character, with no mismatches.

**Q3.** Naive: **16** comparisons. KMP: **10** comparisons. Match at **index 3**.
- Naive: alignments 0, 1, 2 each compare `A,A,A` then fail on `B` vs `A` (4 each = 12); alignment 3 matches `"AAAB"` (4) → 16.
- KMP, LPS of `"AAAB"` = `[0, 1, 2, 0]`:

| Comparisons | Event |
|-------------|-------|
| 1–3 | text[0..2] match pattern[0..2], `j = 3` |
| 4 | text[3] `A` vs `B` mismatch → `j = lps[2] = 2` |
| 5 | text[3] vs pattern[2] match → `j = 3`, `i = 4` |
| 6 | text[4] `A` vs `B` mismatch → `j = 2` |
| 7 | text[4] match → `j = 3`, `i = 5` |
| 8 | text[5] `A` vs `B` mismatch → `j = 2` |
| 9 | text[5] match → `j = 3`, `i = 6` |
| 10 | text[6] `B` vs `B` match → `j = 4 = m` → found at `7 - 4 = 3` |

Each mismatch keeps the last two `A`s instead of re-reading them, and `i` never moves backward.

**Q4.** Returns **5**. `lps = [0, 0, 0, 1, 2, 3, 4, 5]`; the prefix `"abcab"` equals the suffix `"abcab"` (they overlap in the middle `"ab"`, which is allowed — only the *whole* string is excluded as "not proper").

**Q5.** `lps[7]` becomes **1** instead of the correct **3**. Correct array: `[0, 1, 2, 0, 1, 2, 3, 3]`; buggy: `[0, 1, 2, 0, 1, 2, 3, 1]`.
At `i = 7`, `length = 3` and `pattern[7] = 'A'` ≠ `pattern[3] = 'C'`. The correct code falls back to `length = lps[2] = 2` and matches `pattern[2] = 'A'`, giving 3 (`"AAA"` is both a prefix and a suffix of `"AAACAAAA"`). The buggy code jumps straight to `length = 0`, skipping the still-valid borders of length 2 and 1, and ends with only 1.

**E1 — reference solution**

```cpp
int naiveFind(const string& text, const string& pattern) {
    int n = text.size(), m = pattern.size();
    for (int start = 0; start + m <= n; start++) {
        int k = 0;
        while (k < m && text[start + k] == pattern[k]) k++;
        if (k == m) return start;
    }
    return m == 0 ? 0 : -1;
}
```

Time $O(N \cdot M)$ worst case, space $O(1)$. `start + m <= n` avoids reading past the end (and avoids the unsigned underflow of `n - m` with `size_t`). For an empty pattern the loop returns 0 immediately at `start = 0`.

**E2 — reference solution**

```cpp
void computeLPS(const string& pattern, vector<int>& lps);   // chapter's version

bool kmpSearchReturnBool(const string& text, const string& pattern) {
    int n = text.size(), m = pattern.size();
    if (m == 0) return true;
    vector<int> lps(m, 0);
    computeLPS(pattern, lps);
    int i = 0, j = 0;
    while (i < n) {
        if (text[i] == pattern[j]) {
            i++; j++;
            if (j == m) return true;      // first match is enough
        } else if (j != 0) {
            j = lps[j - 1];
        } else {
            i++;
        }
    }
    return false;
}

bool isRotation(const string& s1, const string& s2) {
    if (s1.size() != s2.size()) return false;
    return kmpSearchReturnBool(s1 + s1, s2);
}
```

Time $O(N)$ for strings of length $N$ (text is $2N$, pattern $N$), space $O(N)$. `"erbottlewat"` appears in `"waterbottlewaterbottle"` at index 3. `"acbd"` does not appear in `"abcdabcd"`.

**E3 — reference solution**

```cpp
bool repeatedSubstringPattern(const string& s) {
    int n = s.size();
    if (n < 2) return false;
    vector<int> lps(n, 0);
    computeLPS(s, lps);
    int border = lps[n - 1];
    int period = n - border;
    return border > 0 && n % period == 0;
}
```

Time $O(N)$, space $O(N)$. `n - lps[n-1]` is the shortest period of the string; the string is a whole number of copies of it exactly when that period divides `n`. Examples: `"abab"` → `lps = [0,0,1,2]`, period 2 divides 4 → true. `"aba"` → border 1, period 2, `3 % 2 = 1` → false. `"abcabcabcabc"` → border 9, period 3, `12 % 3 = 0` → true.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: The KMP Algorithm (Overview)**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 kmp overview** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

