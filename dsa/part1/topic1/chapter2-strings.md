# Part 1, Topic 1: C++ STL Essentials
## Chapter 2: Strings

In C++, a `std::string` is essentially just a `vector<char>` that comes with a bunch of extra methods specifically designed for text manipulation. Because it acts like a vector, the performance rules are identical: adding to the end is fast, inserting at the beginning is slow.

---

### 1. What is a string?

A `string` is a contiguous sequence of characters. Under the hood, it stores a pointer to a char array, a `size`, and a `capacity` — exactly like `vector<char>`.

```
Memory layout of string s = "hello":

 Index:   [0]   [1]   [2]   [3]   [4]   [5]
         +-----+-----+-----+-----+-----+-----+
 Char:   | 'h' | 'e' | 'l' | 'l' | 'o' | '\0'|
         +-----+-----+-----+-----+-----+-----+
          ^                                     ^
          start ptr                          null terminator

 size() = 5  (not counting '\0')
```

### 2. Basic Operations

```cpp
#include <string>
#include <iostream>

using namespace std;

int main() {
    string s = "hello";

    // Size (length() and size() do the exact same thing)
    int len = s.length(); // O(1)

    // Accessing characters
    char first = s[0]; // 'h'
    char last  = s[s.length() - 1]; // 'o'

    // Appending
    s += " world";         // Modifies s to "hello world" (O(N) where N = appended length)
    s.push_back('!');      // Adds a single char (O(1))

    // Comparison
    string a = "apple";
    string b = "banana";
    if (a < b) {
        cout << "apple comes before banana"; // Lexicographic comparison
    }

    // Clear
    s.clear(); // s is now "" (empty string), size = 0
}
```

**What's happening:**
```cpp
string s = "hello";
// s[0] = 'h', s[1] = 'e', s[2] = 'l', s[3] = 'l', s[4] = 'o'

s += " world";
// Before: s = "hello"        (size=5)
// After:  s = "hello world"  (size=11)
// The += operator appends characters one by one to the end

s.push_back('!');
// Before: s = "hello world"  (size=11)
// After:  s = "hello world!" (size=12)
// push_back adds a single character — O(1)

s.clear();
// Before: s = "hello world!" (size=12)
// After:  s = ""             (size=0)
// The string is now empty, but capacity may remain
```

### 3. Substrings

Extracting a piece of a string is a very common interview task. You use the `substr(startIndex, length)` method.

```cpp
string s = "algorithm";

// Get 4 characters starting from index 0
string prefix = s.substr(0, 4); // "algo" (Time: O(K) where K is the length, 4)

// Get everything from index 4 to the end
string suffix = s.substr(4); // "rithm"

// Get a single character as a string
string single = s.substr(2, 1); // "g"
```

**What's happening:**
```
s = "algorithm"
     01234567

s.substr(0, 4):
 Start at index 0, take 4 characters
 [a, l, g, o] → "algo"

s.substr(4):
 Start at index 4, take everything to the end
 [r, i, t, h, m] → "rithm"

s.substr(2, 1):
 Start at index 2, take 1 character
 [g] → "g"
```

*Warning:* `substr` creates a brand new string in memory. If you are doing this inside a tight loop, it takes $O(K)$ time and $O(K)$ space per call, which can lead to Time Limit Exceeded (TLE) errors on LeetCode.

### 4. Searching inside Strings

To check if a smaller string exists inside a larger string, use `.find()`.

```cpp
string s = "hello world";

// Returns the starting index of the first occurrence
int pos = s.find("world");

if (pos != string::npos) {
    cout << "Found at index: " << pos; // 6
} else {
    cout << "Not found";
}

// Find a single character
int commaPos = s.find('o'); // 4 (first 'o')

// Find starting from a position (useful for finding all occurrences)
int second = s.find('o', 5); // 7 (find 'o' starting from index 5)
```

**What's happening:**
```
s = "hello world"
     01234567890

s.find("world"):
 Start scanning from index 0
 h ≠ w → next
 e ≠ w → next
 l ≠ w → next
 l ≠ w → next
 o ≠ w → next
 (space) ≠ w → next
 w = w → check rest: o=o, r=r, l=l, d=d ✓
 Return index 6

string::npos is a special constant (usually -1 cast to size_t)
 It means "not found"
 Always check: if (pos != string::npos)
```

### 5. String / Number Conversions

You will often need to convert between integers and strings. Memorize these two functions:

```cpp
// 1. String TO Integer (stoi)
string strNum = "42";
int num = stoi(strNum); // 42

// 2. Integer TO String (to_string)
int score = 100;
string strScore = to_string(score); // "100"

// 3. String to Long Long (stoll) — for large numbers
string big = "9999999999999";
long long bigNum = stoll(big);

// 4. String to Double (stod)
string pi = "3.14159";
double piVal = stod(pi);
```

**What's happening:**
```cpp
int num = stoi("42");
//        ^^^^
//        String To Integer
//        Parses "42" → 42

string str = to_string(100);
//           ^^^^^^^^^
//           Number To String
//          Converts 100 → "100"

// Common mistake:
// string s = "42";
// int x = s;  // ERROR! Can't assign string to int directly
// int x = stoi(s);  // CORRECT
```

### 6. String Comparisons

You can compare strings exactly like you compare numbers. C++ compares them lexicographically (alphabetically).

```cpp
string a = "apple";
string b = "banana";

if (a == b) { /* equal */ }
if (a != b) { /* not equal */ }
if (a < b)  { /* true, because 'a' comes before 'b' */ }
if (a > b)  { /* false */ }

// Comparison is character-by-character:
// "apple" vs "apricot"
//  a == a → equal, move to next
//  p == p → equal, move to next
//  p vs r → 'p' < 'r', so "apple" < "apricot"
```

**What's happening:**
```
Lexicographic comparison is like dictionary order:

"apple" vs "banana"
 First different character: 'a' vs 'b'
 'a' (97) < 'b' (98)
 Result: "apple" < "banana" → TRUE

"abc" vs "ab"
 First two characters match
 "abc" is longer
 Result: "abc" > "ab" → TRUE (longer string wins if prefix matches)

"" vs "a"
 Empty string is always less than non-empty
 Result: "" < "a" → TRUE
```

### 7. Building Strings Efficiently

String concatenation with `+` in a loop is $O(N^2)$ because each `+` creates a new string copy. Use a `stringstream` or `+=` instead.

```cpp
// BAD: O(N^2) — creates a new string every iteration
string result = "";
for (int i = 0; i < 1000; i++) {
    result += to_string(i) + ", "; // Each += copies the entire string
}

// GOOD: O(N) — appends to the same buffer
string result;
result.reserve(5000); // Pre-allocate to avoid reallocations
for (int i = 0; i < 1000; i++) {
    result += to_string(i) + ", ";
}

// ALSO GOOD: Using stringstream
#include <sstream>
stringstream ss;
for (int i = 0; i < 1000; i++) {
    ss << to_string(i) << ", ";
}
string result = ss.str();
```

**What's happening:**
```
String concatenation with += (pre-reserved):

 i=0: result = "0, "
 i=1: result = "0, 1, "      ← appends to existing buffer
 i=2: result = "0, 1, 2, "   ← same buffer, no copy
 ...
 This is O(N) total because each append is O(1) amortized

 String concatenation with + (no reserve):

 i=0: temp = "" + "0" + ", " → "0, "         → copy to result
 i=1: temp = "0, " + "1" + ", " → "0, 1, "  → copy to result (again!)
 Each iteration copies the ENTIRE growing string → O(N^2) total
```

### 8. Modifying Individual Characters

You can modify individual characters of a string since it's mutable:

```cpp
string s = "hello";
s[0] = 'H';       // "Hello"
s[1] = 'A';       // "HAello"

// Transform all characters
for (char& c : s) {
    c = toupper(c); // "HAELLO"
}

// Reverse a string
string t = "hello";
reverse(t.begin(), t.end()); // "olleh"
```

### 9. Common Mistakes and How to Avoid Them

```cpp
// MISTAKE 1: Forgetting string::npos
string s = "hello";
int pos = s.find("xyz");
if (pos == -1) { ... }  // WRONG: npos is not always -1!
if (pos != string::npos) { ... }  // CORRECT: always compare to npos

// MISTAKE 2: substr in tight loops
for (int i = 0; i < s.length(); i++) {
    string sub = s.substr(i, 1); // Creates new string each time — O(N) per call!
}
// FIX: Use s[i] instead of s.substr(i, 1) when you just need a char

// MISTAKE 3: Comparing strings with == when you need ordering
// If you need to sort strings, use < operator, not ==
// If you need to check equality, use == (not .compare())
string a = "hello";
string b = "world";
if (a == b) { /* equal */ }        // Simple equality check
if (a < b)  { /* a before b */ }   // Lexicographic ordering

// MISTAKE 4: Empty string access
string s = "";
// char c = s[0];  // Undefined behavior!
// FIX: if (!s.empty()) { char c = s[0]; }
```

### 10. Common Interview String Patterns

```cpp
// Pattern 1: Reverse a string in-place
string s = "hello";
reverse(s.begin(), s.end()); // "olleh"

// Pattern 2: Check if string is a palindrome
string s = "racecar";
string rev = s;
reverse(rev.begin(), rev.end());
bool isPalindrome = (s == rev); // true

// Pattern 3: Convert to lowercase/uppercase
string s = "Hello World";
for (char& c : s) c = tolower(c); // "hello world"
for (char& c : s) c = toupper(c); // "HELLO WORLD"

// Pattern 4: Split string by delimiter
string s = "a,b,c,d";
stringstream ss(s);
string token;
while (getline(ss, token, ',')) {
    cout << token << endl; // "a", "b", "c", "d"
}

// Pattern 5: Count character frequency
string s = "hello";
int freq[26] = {0};
for (char c : s) {
    freq[c - 'a']++; // freq[4]++, freq[7]++, freq[11]++ twice, freq[14]++
}
// freq = [0,0,0,0,1,0,0,1,0,0,0,2,0,0,1,0,0,0,0,0,0,0,0,0,0,0]
```

### Summary of Big O

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Access `[i]` | $O(1)$ | Random access |
| `length()` / `size()` | $O(1)$ | Stored as member variable |
| `+` or `append()` | $O(N)$ | Where N is the appended string's length |
| `+=` (single char) | $O(1)$ amortized | Same as `push_back` |
| `substr()` | $O(K)$ | Where K is the substring length (creates new string) |
| `find()` | $O(N \times M)$ worst | N = haystack length, M = pattern length |
| `insert()` at position | $O(N)$ | Must shift characters |
| `erase()` at position | $O(N)$ | Must shift characters |
| `clear()` | $O(1)$ | Just resets size |
| `reverse()` | $O(N)$ | In-place reversal |
| `==` / `!=` comparison | $O(N)$ worst | Short-circuits on first difference |
| `sort()` (with std::sort) | $O(N \log N)$ | Sorts the characters |

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `string s = "hello";` | Create string from literal |
| `string s(n, 'c');` | Create string of `n` copies of char `'c'` |
| `s[i]` | Access character at index `i` (no bounds check) |
| `s.at(i)` | Access character at index `i` (throws if out of bounds) |
| `s.front()` / `s.back()` | First / last character |
| `s += " world"` | Append string |
| `s.push_back('!')` | Append single character |
| `s.substr(start, len)` | Extract substring |
| `s.find("key")` | Find first occurrence (returns index or `npos`) |
| `s.find('c', pos)` | Find char starting from position `pos` |
| `s.erase(pos, len)` | Remove `len` characters starting at `pos` |
| `s.insert(pos, "x")` | Insert string at position `pos` |
| `s.replace(pos, len, "x")` | Replace `len` chars at `pos` with `"x"` |
| `s.length()` / `s.size()` | Number of characters |
| `s.empty()` | `true` if string is empty |
| `s.clear()` | Empty the string |
| `s == "hello"` | Equality comparison |
| `s < "hello"` | Lexicographic less-than |
| `to_string(42)` | Integer → string (`"42"`) |
| `stoi("42")` | String → integer (`42`) |
| `stoll("99999999999")` | String → long long |
| `stod("3.14")` | String → double |
| `reverse(s.begin(), s.end())` | Reverse in-place |
| `getline(cin, s)` | Read a line from stdin |
| `getline(ss, token, ',')` | Split by delimiter |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Strings**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 strings** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

