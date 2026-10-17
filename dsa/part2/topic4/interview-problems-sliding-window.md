# Part 2, Topic 4: Sliding Window
## Interview Problems Walkthrough

Sliding window problems are frequently asked because they test your ability to manage running state (Hash Maps) efficiently. 

---

## Problem Classification Table

| # | Problem | Difficulty | Window Type | Key Insight |
|---|---------|------------|-------------|-------------|
| 1 | Longest Substring Without Repeating | Medium | Variable | Skip duplicates, track seen |
| 2 | Longest Repeating Character Replacement | Medium | Variable | (windowLen - maxFreq) ≤ k |
| 3 | Permutation in String | Medium | Fixed | Frequency arrays comparison |
| 4 | Minimum Window Substring | Hard | Variable | matched == required condition |

---

## Solution Approach Comparison

| Problem | Brute Force | Optimal Approach | Why Optimal |
|---------|-------------|------------------|-------------|
| Longest Substring | O(N^2) check all | Variable Window O(N) | One pass, skip invalid |
| Character Replacement | O(N^2) check all | Variable Window O(N) | Maintain maxFreq |
| Permutation in String | O(N*M) | Fixed Window O(N) | Sliding frequency compare |
| Min Window Substring | O(N^2) | Variable Window O(N) | Aggressive shrink when valid |

---

### 1. Longest Substring Without Repeating Characters (Medium)
**Trigger:** "Longest substring", "without repeating".
**Intuition:** Variable sliding window. Expand `right`. If the character at `right` is already in your `unordered_set`, the window is invalid. Shrink `left` (and remove from the set) until the duplicate is gone. 

```cpp
int lengthOfLongestSubstring(string s) {
    unordered_set<char> window;
    int left = 0, maxLen = 0;
    
    for (int right = 0; right < s.length(); right++) {
        // While the window is INVALID (duplicate exists)
        while (window.count(s[right])) {
            window.erase(s[left]);
            left++;
        }
        // Expand the window
        window.insert(s[right]);
        
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Time: O(N), Space: O(min(N, 26)) -> O(1)
```

**What's happening:**
- `right` pointer expands window by one character each iteration
- If new character already exists in window, shrink from left
- Keep shrinking until duplicate is removed
- Update maxLen after window becomes valid
- Set ensures O(1) lookup for duplicates

```
Input: "abcabcbb"

Step 1: right=0, 'a'
Set: {a}, Window: [a], maxLen=1

Step 2: right=1, 'b'
Set: {a,b}, Window: [a,b], maxLen=2

Step 3: right=2, 'c'
Set: {a,b,c}, Window: [a,b,c], maxLen=3

Step 4: right=3, 'a'
'a' in set! Shrink: remove s[0]='a', left=1
Set: {b,c}, Window: [b,c]
Add 'a': Set: {b,c,a}, Window: [b,c,a], maxLen=3

Step 5: right=4, 'b'
'b' in set! Shrink: remove s[1]='b', left=2
Set: {c,a}, Window: [c,a]
Add 'b': Set: {c,a,b}, Window: [c,a,b], maxLen=3

...continues, maxLen stays 3
```

#### Dry-Run Table
| Step | right | char | Set Before | Action | Set After | Window | maxLen |
|------|-------|------|------------|--------|-----------|--------|--------|
| 1 | 0 | a | {} | insert | {a} | [a] | 1 |
| 2 | 1 | b | {a} | insert | {a,b} | [a,b] | 2 |
| 3 | 2 | c | {a,b} | insert | {a,b,c} | [a,b,c] | 3 |
| 4 | 3 | a | {a,b,c} | erase 'a', insert 'a' | {b,c,a} | [b,c,a] | 3 |
| 5 | 4 | b | {b,c,a} | erase 'b', insert 'b' | {c,a,b} | [c,a,b] | 3 |
| 6 | 5 | b | {c,a,b} | erase 'c','a','b', insert 'b' | {b} | [b] | 3 |
| 7 | 6 | b | {b} | erase 'b', insert 'b' | {b} | [b] | 3 |
| 8 | 7 | b | {b} | erase 'b', insert 'b' | {b} | [b] | 3 |

**Answer: 3** (substring "abc")

#### Edge Case: All Same Characters
```cpp
// Input: "aaaa"
// Output: 1
// Each 'a' triggers shrink, window never exceeds length 1
```

#### Common Mistake: Using Map Instead of Set
```cpp
// WRONG: Tracking counts when we only need existence
unordered_map<char, int> counts;
// More memory, unnecessary complexity

// CORRECT: Use set for O(1) membership check
unordered_set<char> window;
```

#### Production Version with Early Exit
```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        if (s.empty()) return 0;
        if (s.size() == 1) return 1;
        
        unordered_set<char> window;
        int left = 0, maxLen = 0;
        
        for (int right = 0; right < s.size(); right++) {
            while (window.count(s[right])) {
                window.erase(s[left]);
                left++;
            }
            window.insert(s[right]);
            maxLen = max(maxLen, right - left + 1);
            
            // Early exit: can't do better than remaining length
            if (maxLen >= s.size() - right) break;
        }
        return maxLen;
    }
};
```

---

### 2. Longest Repeating Character Replacement (Medium)
**Trigger:** Longest substring of identical characters, allowed to replace `k` characters.
**Intuition:** This is a tricky variable window. What makes a window valid? 
The number of characters you need to replace is: `(Window Length) - (Count of the most frequent character in the window)`.
If `(right - left + 1) - maxFreq <= k`, the window is valid. Otherwise, shrink `left`.

```cpp
int characterReplacement(string s, int k) {
    vector<int> counts(26, 0); // Faster than unordered_map for uppercase letters
    int left = 0, maxLen = 0, maxFreq = 0;
    
    for (int right = 0; right < s.length(); right++) {
        counts[s[right] - 'A']++;
        maxFreq = max(maxFreq, counts[s[right] - 'A']);
        
        // Is the window INVALID? (We need to replace more than k chars)
        int currentLen = right - left + 1;
        if (currentLen - maxFreq > k) {
            counts[s[left] - 'A']--;
            left++;
            // Note: We don't strictly need to recalculate maxFreq when shrinking,
            // because we only care about finding a NEW historical maximum length.
        }
        
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

**What's happening:**
- Track frequency of each character in current window
- `maxFreq` is the count of the most frequent character
- Window is valid if: (window length) - (maxFreq) ≤ k
- When invalid, shrink from left (decrement count)
- Key insight: we don't need to recalculate maxFreq when shrinking

```
Input: "AABABBA", k = 1

Step 1: right=0, 'A'
Counts: [1,0,...], maxFreq=1
Window: [A], len=1, replacements=0 ≤ 1 ✓
maxLen=1

Step 2: right=1, 'A'
Counts: [2,0,...], maxFreq=2
Window: [A,A], len=2, replacements=0 ≤ 1 ✓
maxLen=2

Step 3: right=2, 'B'
Counts: [2,1,...], maxFreq=2
Window: [A,A,B], len=3, replacements=1 ≤ 1 ✓
maxLen=3

Step 4: right=3, 'A'
Counts: [3,1,...], maxFreq=3
Window: [A,A,B,A], len=4, replacements=1 ≤ 1 ✓
maxLen=4

Step 5: right=4, 'B'
Counts: [3,2,...], maxFreq=3
Window: [A,A,B,A,B], len=5, replacements=2 > 1 ✗
Shrink: remove s[0]='A', left=1
Counts: [2,2,...], maxFreq=2 (but we keep old maxFreq=3)
Window: [A,B,A,B], len=4, replacements=2 > 1 ✗
Shrink: remove s[1]='A', left=2
Counts: [1,2,...], maxFreq=2
Window: [B,A,B], len=3, replacements=1 ≤ 1 ✓
maxLen stays 4
```

#### Dry-Run Table
| Step | right | char | maxFreq | Window Len | Replacements Needed | Valid? | maxLen |
|------|-------|------|---------|------------|---------------------|--------|--------|
| 1 | 0 | A | 1 | 1 | 0 | Yes | 1 |
| 2 | 1 | A | 2 | 2 | 0 | Yes | 2 |
| 3 | 2 | B | 2 | 3 | 1 | Yes | 3 |
| 4 | 3 | A | 3 | 4 | 1 | Yes | 4 |
| 5 | 4 | B | 3 | 5 | 2 | No | 4 |
| 6 | 4 | B | 3 | 4 | 2 | No | 4 |
| 7 | 4 | B | 2 | 3 | 1 | Yes | 4 |

#### Edge Case: k = 0
```cpp
// Input: "AABABBA", k = 0
// No replacements allowed
// Find longest substring with all same characters
// Answer: 2 ("AA")
```

#### Common Mistake: Recalculating maxFreq on Shrink
```cpp
// WRONG: Recalculating maxFreq every time
if (currentLen - maxFreq > k) {
    counts[s[left] - 'A']--;
    left++;
    maxFreq = *max_element(counts.begin(), counts.end()); // Expensive!
}

// CORRECT: Keep maxFreq as historical max
if (currentLen - maxFreq > k) {
    counts[s[left] - 'A']--;
    left++;
    // Don't update maxFreq - we only care about finding NEW maximums
}
```

#### Production Version
```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        vector<int> counts(26, 0);
        int left = 0, maxLen = 0, maxFreq = 0;
        
        for (int right = 0; right < s.size(); right++) {
            maxFreq = max(maxFreq, ++counts[s[right] - 'A']);
            
            while (right - left + 1 - maxFreq > k) {
                counts[s[left] - 'A']--;
                left++;
            }
            
            maxLen = max(maxLen, right - left + 1);
        }
        return maxLen;
    }
};
```

---

### 3. Permutation in String (Medium)
**Trigger:** Does a substring of $S_2$ contain a permutation of $S_1$?
**Intuition:** A permutation simply means the substring has the exact same character frequencies as $S_1$. 
Because the substring must be the exact same length as $S_1$, this is a **Fixed-Size Window**. Build a frequency array of $S_1$. Then slide a window of size `S1.length()` across $S_2$, maintaining a frequency array of the current window. Compare the two arrays.

```cpp
bool checkInclusion(string s1, string s2) {
    if (s1.length() > s2.length()) return false;
    
    vector<int> s1Count(26, 0);
    vector<int> windowCount(26, 0);
    
    // Setup initial window
    for (int i = 0; i < s1.length(); i++) {
        s1Count[s1[i] - 'a']++;
        windowCount[s2[i] - 'a']++;
    }
    
    if (s1Count == windowCount) return true;
    
    // Slide fixed window
    for (int i = s1.length(); i < s2.length(); i++) {
        windowCount[s2[i] - 'a']++; // Add right element
        windowCount[s2[i - s1.length()] - 'a']--; // Remove left element
        
        if (s1Count == windowCount) return true;
    }
    return false;
}
// Time: O(N) where N is length of s2. (Comparing vectors of size 26 is O(1)).
```

**What's happening:**
- Build frequency array for s1 (target)
- Build frequency array for first window of s2
- Compare arrays: if equal, permutation found
- Slide window: add new char, remove old char
- Compare again after each slide

```
Input: s1 = "ab", s2 = "eidbaooo"

s1Count: [1,1,0,0,...] (a=1, b=1)

Step 1: Window [e,i] → windowCount: [0,0,0,0,1,0,0,0,0,1,...]
         Not equal to s1Count

Step 2: Window [i,d] → add 'd', remove 'e'
         windowCount: [0,0,0,1,0,1,0,0,0,0,...]
         Not equal

Step 3: Window [d,b] → add 'b', remove 'i'
         windowCount: [0,1,0,1,0,0,0,0,0,0,...]
         Not equal

Step 4: Window [b,a] → add 'a', remove 'd'
         windowCount: [1,1,0,0,0,0,0,0,0,0,...]
         EQUAL to s1Count! Return true
```

#### Dry-Run Table
| Step | Window | s2[i] | s2[i-k] | windowCount[a] | windowCount[b] | Match? |
|------|--------|-------|---------|----------------|----------------|--------|
| 1 | [e,i] | i | - | 0 | 0 | No |
| 2 | [i,d] | d | e | 0 | 0 | No |
| 3 | [d,b] | b | i | 0 | 1 | No |
| 4 | [b,a] | a | d | 1 | 1 | Yes |

#### Edge Case: s1 Longer Than s2
```cpp
// Input: s1 = "abc", s2 = "ab"
// Output: false (impossible to fit permutation)
// Handled by initial length check
```

#### Common Mistake: Comparing Characters Instead of Frequencies
```cpp
// WRONG: Checking if characters exist
bool isPermutation = true;
for (int i = 0; i < 26; i++) {
    if (s1Count[i] > 0 && windowCount[i] == 0) {
        isPermutation = false;
        break;
    }
}

// CORRECT: Compare full frequency arrays
if (s1Count == windowCount) return true;
```

#### Production Version with Optimization
```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        if (s1.size() > s2.size()) return false;
        
        vector<int> s1Count(26, 0), windowCount(26, 0);
        
        for (int i = 0; i < s1.size(); i++) {
            s1Count[s1[i] - 'a']++;
            windowCount[s2[i] - 'a']++;
        }
        
        if (s1Count == windowCount) return true;
        
        for (int i = s1.size(); i < s2.size(); i++) {
            windowCount[s2[i] - 'a']++;
            windowCount[s2[i - s1.size()] - 'a']--;
            
            if (s1Count == windowCount) return true;
        }
        
        return false;
    }
};
```

---

### 4. Minimum Window Substring (Hard)
**Trigger:** Find the shortest substring in $S$ that contains all characters of $T$.
**Intuition:** The ultimate test of the Variable Window template. 
Expand `right`. Keep track of how many "required" characters you have matched. When `matched == required`, your window is **VALID**.
Because you want the *minimum* length, you now enter a `while(matched == required)` loop to aggressively shrink `left`. Record the minimum length right before the window becomes invalid again.

```cpp
string minWindow(string s, string t) {
    if (t.empty() || s.empty()) return "";
    
    unordered_map<char, int> targetCounts;
    for (char c : t) targetCounts[c]++;
    
    int required = targetCounts.size(); // Number of UNIQUE chars we need
    int matched = 0;
    
    unordered_map<char, int> windowCounts;
    int left = 0, minLen = INT_MAX, minStart = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s[right];
        windowCounts[c]++;
        
        // If we matched the exact count needed for this char
        if (targetCounts.count(c) && windowCounts[c] == targetCounts[c]) {
            matched++;
        }
        
        // When window is VALID, shrink from left to find the absolute minimum
        while (matched == required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minStart = left;
            }
            
            char deletedChar = s[left];
            windowCounts[deletedChar]--;
            
            // If shrinking broke the valid state, decrement matched
            if (targetCounts.count(deletedChar) && windowCounts[deletedChar] < targetCounts[deletedChar]) {
                matched--;
            }
            left++;
        }
    }
    
    return minLen == INT_MAX ? "" : s.substr(minStart, minLen);
}
// Time: O(N + M), Space: O(1) (Hash map max size 52)
```

**What's happening:**
- Build target frequency map for all chars in t
- `required` = number of unique chars we need to match
- `matched` = number of unique chars we've matched so far
- Expand right: add char to window, increment matched if count matches target
- When matched == required: window is VALID
- Aggressively shrink left while valid, recording minimum window
- When shrinking breaks validity: stop shrinking, continue expanding

```
Input: s = "ADOBECODEBANC", t = "ABC"

targetCounts: {A:1, B:1, C:1}
required: 3

Step 1-5: Expand until we have all required chars
Window: "ADOBEC" (contains A,B,C)
matched = 3 == required = 3 → VALID

Shrink while valid:
  "ADOBEC" → "DOBEC" → "OBEC" → "BEC" → "EC" (loses A, matched=2, STOP)
  Min window so far: "ADOBEC" (length 6)

Continue expanding:
  "CODEBANC" → has all required chars
  Shrink: "CODEBANC" → "ODEBANC" → "DEBANC" → "EBANC" → "BANC" (length 4)
  
Final answer: "BANC"
```

#### Dry-Run Table (Key Steps)
| Step | Window | matched | Action | minLen | minStart |
|------|--------|---------|--------|--------|----------|
| 1-5 | ADOBEC | 3 | shrink | 6 | 0 |
| 6 | DOBEC | 2 | expand | 6 | 0 |
| 7-12 | CODEBANC | 3 | shrink | 4 | 9 |

#### Edge Case: t Has Duplicate Characters
```cpp
// Input: s = "aa", t = "aa"
// targetCounts: {a: 2}
// required: 1 (unique chars)
// Window "aa" has count 2 >= 2, so matched = 1
// Answer: "aa"
```

#### Common Mistake: Using > Instead of >=
```cpp
// WRONG: Checking exact match
if (windowCounts[c] == targetCounts[c]) matched++;

// WRONG: Checking greater than
if (windowCounts[c] > targetCounts[c]) matched++;

// CORRECT: Check when we first reach the required count
if (windowCounts[c] == targetCounts[c]) matched++;
// We only increment matched ONCE when count reaches target
```

#### Production Version
```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        if (t.empty() || s.empty()) return "";
        
        unordered_map<char, int> targetCounts;
        for (char c : t) targetCounts[c]++;
        
        int required = targetCounts.size();
        int matched = 0;
        
        unordered_map<char, int> windowCounts;
        int left = 0, minLen = INT_MAX, minStart = 0;
        
        for (int right = 0; right < s.size(); right++) {
            char c = s[right];
            windowCounts[c]++;
            
            if (targetCounts.count(c) && windowCounts[c] == targetCounts[c]) {
                matched++;
            }
            
            while (matched == required) {
                if (right - left + 1 < minLen) {
                    minLen = right - left + 1;
                    minStart = left;
                }
                
                char leftChar = s[left];
                windowCounts[leftChar]--;
                
                if (targetCounts.count(leftChar) && windowCounts[leftChar] < targetCounts[leftChar]) {
                    matched--;
                }
                left++;
            }
        }
        
        return minLen == INT_MAX ? "" : s.substr(minStart, minLen);
    }
};
```

---

## Quick Reference Table

| Problem | Time | Space | Window Type | Key Condition |
|---------|------|-------|-------------|---------------|
| Longest Substring Without Repeating | O(N) | O(1) | Variable | set.count(char) |
| Longest Repeating Character Replacement | O(N) | O(1) | Variable | len - maxFreq <= k |
| Permutation in String | O(N) | O(1) | Fixed | s1Count == windowCount |
| Minimum Window Substring | O(N) | O(1) | Variable | matched == required |

---

## Common Patterns Summary

| Pattern | Template | Example Problem |
|---------|----------|-----------------|
| Duplicate Detection | set.count() in while | Longest Substring |
| Frequency Match | vector<int>(26) == | Permutation in String |
| Replacement Count | len - maxFreq <= k | Character Replacement |
| Required Match | matched == required | Min Window Substring |

---

## Comparison: Variable Window Strategies

| Strategy | When to Use | Shrinking Logic |
|----------|-------------|-----------------|
| Set-based | No duplicates allowed | Shrink until duplicate removed |
| Frequency Array | Exact character counts | Compare arrays |
| Counter-based | Match specific counts | Track matched == required |
| Max Frequency | Character replacement | (len - maxFreq) threshold |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems sliding window** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

