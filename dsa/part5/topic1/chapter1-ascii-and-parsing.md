# Part 5, Topic 1: String Manipulation & Patterns
## Chapter 1: ASCII Arithmetic & Parsing

Strings are fundamentally arrays of characters. In C++ (and most languages), characters are stored as **ASCII** integers behind the scenes.
`'A' = 65`, `'a' = 97`, `'0' = 48`.

Understanding ASCII arithmetic allows you to manipulate strings without relying on slow built-in functions or massive Hash Maps.

---

### 1. The ASCII Table (What You MUST Memorize)

```
Char  Decimal  Binary       Category
────  ───────  ───────────  ──────────
' '   32       00100000     Whitespace
'0'   48       00110000     Digits
'9'   57       00111001     Digits
'A'   65       01000001     Uppercase
'Z'   90       01011010     Uppercase
'a'   97       01100001     Lowercase
'z'   122      01111010     Lowercase
```

**Key observations:**
- Digits `'0'`–`'9'` are sequential: `'5' - '0' = 5`
- Uppercase `'A'`–`'Z'` are sequential at 65–90
- Lowercase `'a'`–`'z'` are sequential at 97–122
- The offset between uppercase and lowercase is exactly 32: `'a' - 'A' = 32`

```
ASCII Layout Diagram:

  0-31:    Control characters (don't use)
  32:      ' ' (space)
  33-47:   ! " # $ % & ' ( ) * + , - . /
  48-57:   0 1 2 3 4 5 6 7 8 9        ← digits
  58-64:   : ; < = > ? @
  65-90:   A B C ... X Y Z             ← uppercase
  91-96:   [ \ ] ^ _ `
  97-122:  a b c ... x y z             ← lowercase
  123-127: { | } ~ DEL

  The ONLY thing that differs between 'A' and 'a' is bit 5 (value 32):
  'A' = 01000001    'a' = 01100001
                  ↑ bit 5 set = lowercase
```

---

### 2. Char Arithmetic (The "Offset" Trick)

When dealing with lowercase English letters, you can map the letters `'a'` through `'z'` to the indices `0` through `25`. You do this by subtracting the character `'a'`.

```cpp
char c = 'd';
int index = c - 'a'; // 'd' (100) - 'a' (97) = 3.
// 'd' maps to index 3!
```

**What's happening:**
```cpp
int index = c - 'a';
//          ^   ^
//          |   └── ASCII value 97 (the baseline)
//          └── ASCII value 100 ('d')
//
// 100 - 97 = 3
// This gives us a 0-based index into a 26-element array
//
// 'a' - 'a' = 0    → index 0
// 'b' - 'a' = 1    → index 1
// 'c' - 'a' = 2    → index 2
// ...
// 'z' - 'a' = 25   → index 25
```

**Dry-run table for `c = 'd'`:**
```
Step  Operation       Value
────  ──────────────  ─────
1     c = 'd'         100 (ASCII)
2     'a' = baseline  97  (ASCII)
3     c - 'a'         100 - 97 = 3
4     index = 3       Maps to position 3 in freq array
```

This trick is the foundation for almost all Anagram and Palindrome algorithms because it allows you to use a fixed-size `vector<int>(26)` instead of an `unordered_map`, drastically reducing overhead.

---

### 3. All Useful Char Arithmetic Tricks

#### Trick 1: Character Digit → Real Integer

```cpp
char digit = '7';
int num = digit - '0'; // 55 - 48 = 7
```

**What's happening:**
```cpp
int num = digit - '0';
//        ^      ^
//        |      └── ASCII 48 (the '0' baseline)
//        └── ASCII 55 ('7')
//
// '0' - '0' = 0
// '1' - '0' = 1
// ...
// '9' - '0' = 9
```

**Dry-run table for `digit = '7'`:**
```
Step  Operation        Value
────  ───────────────  ─────
1     digit = '7'      55  (ASCII)
2     '0' = baseline   48  (ASCII)
3     digit - '0'      55 - 48 = 7
4     num = 7          Real integer 7
```

#### Trick 2: Uppercase → Lowercase (Manual)

```cpp
char upper = 'G';
char lower = upper + ('a' - 'A'); // 71 + 32 = 103 = 'g'
```

**What's happening:**
```cpp
char lower = upper + ('a' - 'A');
//           ^      ^  ^    ^
//           |      |  |    └── 'A' = 65
//           |      |  └── 'a' = 97
//           |      └── 97 - 65 = 32 (the magic offset)
//           └── 'G' = 71
//
// 71 + 32 = 103 = 'g' ✓
```

**Dry-run table for `upper = 'G'`:**
```
Step  Operation          Value
────  ─────────────────  ─────
1     upper = 'G'        71   (ASCII)
2     'a' - 'A'          97 - 65 = 32 (the offset)
3     upper + 32         71 + 32 = 103
4     char(103) = 'g'    Lowercase ✓
```

#### Trick 3: Lowercase → Uppercase (Manual)

```cpp
char lower = 'g';
char upper = lower - ('a' - 'A'); // 103 - 32 = 71 = 'G'
```

#### Trick 4: Check if Character is a Letter

```cpp
bool isLetter = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
```

#### Trick 5: Check if Character is a Digit

```cpp
bool isDigit = (c >= '0' && c <= '9');
```

**Comparison table of approaches:**
```
Task                    Manual ASCII           <cctype> Library
─────────────────────   ─────────────────────  ────────────────────
To lowercase            c + ('a' - 'A')        tolower(c)
To uppercase            c - ('a' - 'A')        toupper(c)
Is letter?              c >= 'A' && c <= 'Z'   isalpha(c)
Is digit?               c >= '0' && c <= '9'   isdigit(c)
Digit to int            c - '0'                c - '0' (same)
Char to index (0-25)    c - 'a'                c - 'a' (same)
```

---

### 4. String Parsing (Tokenization)

Interviewers sometimes give you a string like `"apple,banana,cherry"` and ask you to process each word. In Python or JavaScript, you just call `.split(',')`. C++ does not have a built-in split function.

You must memorize how to parse a string using `std::stringstream`.

#### Method 1: Split by Delimiter (stringstream + getline)

```cpp
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

using namespace std;

vector<string> splitString(string str, char delimiter) {
    vector<string> tokens;
    stringstream ss(str); // Wrap the string in a stream
    string token;

    // getline reads from 'ss' into 'token' until it hits the 'delimiter'
    while (getline(ss, token, delimiter)) {
        tokens.push_back(token);
    }

    return tokens;
}

int main() {
    vector<string> words = splitString("apple,banana,cherry", ',');
    // words is now ["apple", "banana", "cherry"]
}
```

**What's happening:**
```cpp
stringstream ss("apple,banana,cherry");
//              ^^^^^^^^^^^^^^^^^^^^
//              The entire string is loaded into the stream
//              ss acts like a "cursor" that reads from left to right

// getline(ss, token, ',') reads characters until ',' or end-of-string
// Each call advances the cursor past the delimiter

// Iteration 1: token = "apple",  cursor now at "banana,cherry"
// Iteration 2: token = "banana", cursor now at "cherry"
// Iteration 3: token = "cherry", cursor now at end
// Iteration 4: getline returns false → loop ends
```

**Dry-run table:**
```
Iteration  token     tokens[]                    ss remaining
─────────  ────────  ──────────────────────────  ─────────────────
1          "apple"   ["apple"]                    "banana,cherry"
2          "banana"  ["apple", "banana"]          "cherry"
3          "cherry"  ["apple", "banana", "cherry"] (empty)
```

#### Method 2: Split by Whitespace (operator>>)

If the string is separated by **spaces** (e.g., `"The quick brown fox"`), it's even easier. The `>>` operator automatically splits by whitespace:

```cpp
stringstream ss("The quick brown fox");
string word;

while (ss >> word) {
    cout << word << endl;
}
// Output:
// The
// quick
// brown
// fox
```

**What's happening:**
```cpp
ss >> word;
//   ^^^^
//   Reads the next whitespace-delimited token
//   Automatically skips spaces, tabs, newlines
//   Returns false when no more tokens
```

#### Method 3: Manual Character-by-Character Parsing

Sometimes you need more control (e.g., splitting on multiple delimiters, or handling quoted strings):

```cpp
vector<string> manualSplit(string str) {
    vector<string> tokens;
    string current;

    for (char c : str) {
        if (c == ',' || c == ';' || c == '|') {
            // Found a delimiter
            if (!current.empty()) {
                tokens.push_back(current);
                current = "";
            }
        } else {
            current += c;
        }
    }
    // Don't forget the last token
    if (!current.empty()) {
        tokens.push_back(current);
    }

    return tokens;
}
```

**What's happening:**
```cpp
// For input "a,b;c|d":
// c='a': current = "a"
// c=',': push "a", current = ""
// c='b': current = "b"
// c=';': push "b", current = ""
// c='c': current = "c"
// c='|': push "c", current = ""
// c='d': current = "d"
// End:   push "d"
// Result: ["a", "b", "c", "d"]
```

---

### 5. Parsing Integers from Strings (atoi pattern)

Converting a string of digits to an integer is a common interview task. The pattern is the same as the char-to-int trick above, but applied in a loop:

```cpp
int stringToInt(string s) {
    int result = 0;
    bool negative = false;
    int i = 0;

    // Handle sign
    if (s[0] == '-') {
        negative = true;
        i = 1;
    }

    // Process each digit
    while (i < s.length()) {
        int digit = s[i] - '0';  // Convert char to int
        result = result * 10 + digit;
        i++;
    }

    return negative ? -result : result;
}
```

**What's happening:**
```cpp
// For input "473":
// i=0: digit = '4'-'0' = 4, result = 0*10 + 4 = 4
// i=1: digit = '7'-'0' = 7, result = 4*10 + 7 = 47
// i=2: digit = '3'-'0' = 3, result = 47*10 + 3 = 473
```

**Dry-run table for `"473"`:**
```
Step  i   s[i]   digit   result
────  ──  ─────  ──────  ──────
1     0   '4'    4       0*10 + 4 = 4
2     1   '7'    7       4*10 + 7 = 47
3     2   '3'    3       47*10 + 3 = 473
```

---

### 6. Parsing Numbers from Strings (with decimal)

A more advanced pattern — parsing floating point strings:

```cpp
double stringToDouble(string s) {
    double result = 0.0;
    bool negative = false;
    int i = 0;

    if (s[0] == '-') {
        negative = true;
        i = 1;
    }

    // Integer part
    while (i < s.length() && s[i] != '.') {
        result = result * 10 + (s[i] - '0');
        i++;
    }

    // Decimal part
    if (i < s.length() && s[i] == '.') {
        i++; // skip '.'
        double fraction = 0.1;
        while (i < s.length()) {
            result += (s[i] - '0') * fraction;
            fraction *= 0.1;
            i++;
        }
    }

    return negative ? -result : result;
}
```

**Dry-run table for `"-3.14"`:**
```
Step  i   s[i]   Action              result    fraction
────  ──  ─────  ──────────────────  ────────  ────────
1     0   '-'    negative=true, i=1  0.0       -
2     1   '3'    int part: 0*10+3    3.0       0.1
3     2   '.'    decimal, i=3        3.0       0.1
4     3   '1'    3.0 + 1*0.1        3.1       0.01
5     4   '4'    3.1 + 4*0.01       3.14      0.001
Result: -3.14
```

---

### 7. Common String Processing Patterns

#### Pattern: Count Character Frequencies

```cpp
vector<int> countFreq(string s) {
    vector<int> freq(26, 0);
    for (char c : s) {
        freq[c - 'a']++;
    }
    return freq;
}
```

#### Pattern: Build String from Parts

```cpp
string buildResult(vector<string>& parts) {
    string result;
    for (int i = 0; i < parts.size(); i++) {
        result += parts[i];
        if (i < parts.size() - 1) {
            result += ", ";  // Add separator between items
        }
    }
    return result;
}
```

#### Pattern: In-place Character Removal

```cpp
void removeChar(string& s, char target) {
    int writeIndex = 0;
    for (int i = 0; i < s.length(); i++) {
        if (s[i] != target) {
            s[writeIndex++] = s[i];
        }
    }
    s.resize(writeIndex);  // Truncate the string
}
```

**What's happening:**
```cpp
// For "banana" removing 'a':
// readIndex=0: 'b' != 'a', write[0]='b', write=1
// readIndex=1: 'a' == 'a', skip
// readIndex=2: 'n' != 'a', write[1]='n', write=2
// readIndex=3: 'a' == 'a', skip
// readIndex=4: 'n' != 'a', write[2]='n', write=3
// readIndex=5: 'a' == 'a', skip
// s.resize(3) → "bnn"
```

---

### 8. String Manipulation Approaches Comparison

```
Approach              Time        Space     When to Use
────────────────────  ──────────  ────────  ──────────────────────────────
stringstream+getline  O(N)        O(N)      General-purpose splitting
operator>>            O(N)        O(1)*     Splitting by whitespace only
Manual char-by-char   O(N)        O(N)      Custom delimiters, parsing logic
Regex                 O(N*M)      O(N+M)    Complex patterns (avoid in C++)
ASCII arithmetic      O(N)        O(1)      Frequency counting, char transforms
Two pointers          O(N)        O(1)      In-place reversal, palindrome checks
```
*`O(1)` for the split operation itself, but tokens still need storage.*

---

### 9. Summary

- Subtracting `'a'` from any lowercase letter gives you an index from 0 to 25.
- Subtracting `'0'` from any character digit gives you the actual integer.
- The offset between uppercase and lowercase is always 32 (`'a' - 'A'`).
- Memorize the `stringstream` + `getline` pattern to compensate for C++'s lack of a `.split()` method.
- For more control, use manual character-by-character parsing.
- When parsing numbers, handle sign, integer part, and decimal part separately.

---

### Quick Reference Table

| Operation | Code | Example |
|---|---|---|
| Char → index (0-25) | `c - 'a'` | `'d' - 'a' = 3` |
| Char digit → int | `c - '0'` | `'7' - '0' = 7` |
| Upper → lower | `c + ('a' - 'A')` | `'G' + 32 = 'g'` |
| Lower → upper | `c - ('a' - 'A')` | `'g' - 32 = 'G'` |
| Is uppercase? | `c >= 'A' && c <= 'Z'` | — |
| Is lowercase? | `c >= 'a' && c <= 'z'` | — |
| Is digit? | `c >= '0' && c <= '9'` | — |
| Split by delimiter | `stringstream + getline` | See Section 4 |
| Split by whitespace | `stringstream >> word` | See Section 4 |
| String → int | `result = result*10 + (s[i]-'0')` | See Section 5 |
| Frequency array | `freq[c-'a']++` | `vector<int>(26,0)` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Char arithmetic and type promotion.** What does this print? (Hint: what is the type of `'7' + 1`?)

```cpp
char c = 'q';
cout << (c - 'a') << " " << char(c - 32) << " "
     << ('7' - '0') * 2 << " " << ('7' + 1) << endl;
```

**Q2. getline edge cases.** Using the chapter's `splitString`, how many tokens are returned for `splitString("a,,b,", ',')`, and what are they? What does `manualSplit("a,,b,")` return instead?

**Q3. stringToInt, good and bad input.** Trace `stringToInt("-205")` with a table of `i`, `s[i]`, `digit`, `result`. Then: what does `stringToInt("12a")` return, and why?

**Q4. The bit-5 trick.** The chapter notes that `'A'` and `'a'` differ only in bit 5 (value 32). What characters do `char('M' | 32)`, `char('m' & ~32)` and `char('k' ^ 32)` produce?

**Q5. In-place removal.** Trace `removeChar` on `s = "mississippi"` with `target = 's'`. What is the final string and the final `writeIndex`?

### Coding Exercises

**E1 (Easy).** Convert every uppercase letter to lowercase using only ASCII arithmetic (no `tolower`). All other characters stay unchanged.

```cpp
string toLowerManual(string s);
```

- `"Hello, World 42!"` → `"hello, world 42!"`
- `"abc"` → `"abc"`

**E2 (Easy–Medium).** Sum the integers in a comma-separated string. Numbers may be negative; there are no spaces and no empty fields. Combine the `getline` split with the atoi loop (write your own digit loop; do not call `stoi`).

```cpp
long long sumCSV(const string& s);
```

- `"10,-3,25"` → `32`
- `"7"` → `7`

**E3 (Medium).** *Run-length decode.* The input is a sequence of `[count]letter` groups, where `count` is an optional multi-digit number (missing means 1). Expand it.

```cpp
string decodeRLE(const string& s);
```

- `"3a2bc"` → `"aaabbc"`
- `"10z1y"` → `"zzzzzzzzzzy"`

#### Dry-Run: Answers

**Q1.** Output: **`16 Q 14 56`**
- `c - 'a'` = 113 − 97 = 16 (an `int`).
- `char(c - 32)` = `char(81)` = `'Q'`.
- `('7' - '0') * 2` = 7 × 2 = 14.
- `'7' + 1`: arithmetic on a `char` promotes it to `int`, so this is 55 + 1 = **56**, printed as a number, not `'8'`. Write `char('7' + 1)` to get `8`.

**Q2.** `splitString("a,,b,", ',')` returns **3 tokens: `"a"`, `""`, `"b"`**.

| Call | Reads up to | token | Pushed? |
|------|-------------|-------|---------|
| 1 | first `,` | `"a"` | yes |
| 2 | second `,` (immediately) | `""` | yes — empty token between `,,` |
| 3 | third `,` | `"b"` | yes |
| 4 | end of stream, nothing read | — | `getline` fails → loop ends |

The trailing delimiter does **not** produce a final empty token. `manualSplit("a,,b,")` returns `["a", "b"]`, because it only pushes non-empty `current` values.

**Q3.** `stringToInt("-205")` → **-205**.

| Step | i | s[i] | digit | result |
|------|---|------|-------|--------|
| sign | 0 | `'-'` | — | `negative = true`, `i = 1` |
| 1 | 1 | `'2'` | 2 | 0·10 + 2 = 2 |
| 2 | 2 | `'0'` | 0 | 2·10 + 0 = 20 |
| 3 | 3 | `'5'` | 5 | 20·10 + 5 = 205 |
| end | — | — | — | return −205 |

`stringToInt("12a")` returns **169**: `'a' - '0'` = 97 − 48 = 49, so the last step is 12·10 + 49 = 169. The function never checks that each character is a digit (it also crashes on an empty string via `s[0]`) — the hardened `atoi` in the interview-problems file fixes this.

**Q4.** `'m'`, `'M'`, `'K'`.
- `'M'` = 77 = `01001101`; `| 32` sets bit 5 → 109 = `'m'`.
- `'m'` = 109; `& ~32` clears bit 5 → 77 = `'M'`.
- `'k'` = 107; `^ 32` flips bit 5 → 75 = `'K'` (XOR toggles case in both directions).
Only use these on letters: `'5' ^ 32` = 21, a control character.

**Q5.** Final string **`"miiippi"`**, `writeIndex = 7`.

| i | s[i] | kept? | writeIndex after |
|---|------|-------|------------------|
| 0 | m | yes | 1 |
| 1 | i | yes | 2 |
| 2, 3 | s, s | no | 2 |
| 4 | i | yes | 3 |
| 5, 6 | s, s | no | 3 |
| 7 | i | yes | 4 |
| 8 | p | yes | 5 |
| 9 | p | yes | 6 |
| 10 | i | yes | 7 |

`s.resize(7)` keeps `"miiippi"`. One pass, $O(N)$ time, $O(1)$ extra space.

**E1 — reference solution**

```cpp
string toLowerManual(string s) {
    for (char& c : s) {
        if (c >= 'A' && c <= 'Z') c = c + ('a' - 'A');   // +32
    }
    return s;
}
```

Time $O(N)$, space $O(1)$ extra (works on the by-value copy). The range check is what keeps `','`, `' '` and digits untouched.

**E2 — reference solution**

```cpp
long long parseInt(const string& t) {
    long long result = 0;
    size_t i = 0;
    bool negative = false;
    if (!t.empty() && t[0] == '-') { negative = true; i = 1; }
    for (; i < t.size(); i++) result = result * 10 + (t[i] - '0');
    return negative ? -result : result;
}

long long sumCSV(const string& s) {
    stringstream ss(s);
    string token;
    long long total = 0;
    while (getline(ss, token, ',')) total += parseInt(token);
    return total;
}
```

Time $O(N)$, space $O(N)$ for the stream. `long long` leaves headroom when many values are summed.

**E3 — reference solution**

```cpp
string decodeRLE(const string& s) {
    string out;
    int count = 0;
    for (char c : s) {
        if (c >= '0' && c <= '9') {
            count = count * 10 + (c - '0');   // multi-digit count: atoi pattern
        } else {
            out.append(count == 0 ? 1 : count, c);
            count = 0;                        // reset for the next group
        }
    }
    return out;
}
```

Time $O(N + L)$ where $L$ is the output length, space $O(L)$. Trace `"10z1y"`: `'1'` → 1, `'0'` → 10, `'z'` → append 10 z's, reset; `'1'` → 1, `'y'` → append 1 y.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: ASCII Arithmetic & Parsing**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 ascii and parsing** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

