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

Step 2:   A [A A B] B     Match at pos 1? A=A ✓, A=A ✓, B=B ✓ → FOUND at pos 1! (keep going for more)
         A A A B A B

Step 3:    A A [A B A]    Match at pos 2? A=A ✓, A≠B ✗ → shift
         A A A B A B

Step 4:     A A A [B A B] Match at pos 3? A≠B ✗ → shift
         A A A B A B

Step 5:      A A A B [A B] Pos 4? Only 2 chars left, pattern (3) can't fit → STOP. Only match: pos 1
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
Naive        6 × 4 = 24 comparisons
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
  Position 3: match A,A,B ✓ → FOUND
  
  Total comparisons: 3×3 + 3 = 12

KMP approach:
  Text:    A A A A A B
  Pattern: A A B  (LPS: [0,1,0])
  
  Position 0-2: match A,A, fail B → j=lps[1]=1 (skip 1 comparison!)
  i=2..4:       each extra 'A': match A, fail B → j=lps[1]=1 (i never moves back)
  i=4..5:       match A, match B,B ✓ → FOUND at 3!
  
  Total comparisons: 9

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

