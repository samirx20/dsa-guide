# Part 10, Topic 4: Trie (Prefix Tree)
## Interview Problems Walkthrough

Tries are rarely asked in isolation. They are almost always combined with Backtracking (DFS) to solve complex grid-search problems.

---

### Problem Classification Table

| Problem | Difficulty | Technique | Key Insight |
|---------|-----------|-----------|-------------|
| Implement Trie | Medium | Trie basics | Standard template with insert/search/startsWith |
| Add & Search Words | Medium | Trie + DFS | '.' triggers exploring all children |
| Word Search II | Hard | Trie + Backtracking | Single DFS with Trie pruning |
| Replace Words | Medium | Trie (prefix) | Find shortest prefix for each word |
| Map Sum Pairs | Medium | Trie + DFS | Sum values of words with given prefix |
| Longest Word in Dictionary | Medium | Trie + DFS | Build words using smaller words |
| Search Suggestions | Medium | Trie + DFS | DFS from prefix node to collect suggestions |
| Maximum XOR | Hard | Trie (binary) | Build trie of binary representations |

---

### 1. Implement Trie (Prefix Tree) (Medium)
**Trigger:** Implement the `Trie` class with `insert`, `search`, and `startsWith` methods.
**Intuition:** This is purely a test of knowing the standard template. Use an array of 26 pointers and the ASCII index trick (`c - 'a'`).
*(See Chapter 1 for the exact code template).*

**Step-by-Step Walkthrough:**
```
Operations:
  insert("apple")
  search("apple")    → true
  search("app")      → false (isEnd is false at 'p' node)
  startsWith("app")  → true (path exists)
  insert("app")
  search("app")      → true (isEnd now true at 'p' node)
```

---

### 2. Design Add and Search Words Data Structure (Medium)
**Trigger:** Design a data structure that supports adding new words and finding if a string matches any previously added string. The search string can contain dots `'.'` where the dot can be matched with ANY letter.
**Intuition:** 
`addWord()` is a standard Trie insert. 
`search()` is tricky because of the `'.'`. If you encounter a dot, you don't know which path to take. You must take **ALL** available paths! This requires writing a recursive DFS helper function inside the `search` method.

```cpp
class WordDictionary {
private:
    struct TrieNode {
        TrieNode* children[26];
        bool isEnd;
        TrieNode() : isEnd(false) {
            for (int i = 0; i < 26; i++) children[i] = nullptr;
        }
    };
    
    TrieNode* root;
    
    bool dfs(string& word, int index, TrieNode* curr) {
        for (int i = index; i < word.length(); i++) {
            char c = word[i];
            
            if (c == '.') {
                // A dot means we must explore EVERY non-null child recursively
                for (int j = 0; j < 26; j++) {
                    if (curr->children[j] != nullptr) {
                        // If ANY of the paths return true, the word matches!
                        if (dfs(word, i + 1, curr->children[j])) {
                            return true;
                        }
                    }
                }
                return false; // None of the paths matched
            } else {
                // Standard Trie traversal
                if (curr->children[c - 'a'] == nullptr) return false;
                curr = curr->children[c - 'a'];
            }
        }
        return curr->isEnd;
    }
    
public:
    WordDictionary() {
        root = new TrieNode();
    }
    
    void addWord(string word) {
        TrieNode* curr = root;
        for (char c : word) {
            if (curr->children[c - 'a'] == nullptr) {
                curr->children[c - 'a'] = new TrieNode();
            }
            curr = curr->children[c - 'a'];
        }
        curr->isEnd = true;
    }
    
    bool search(string word) {
        return dfs(word, 0, root);
    }
};
```

**What's happening:**
```cpp
// Words in trie: "bad", "dad", "mad", "pad", "bat"
//
// search("bad"):
//   b → a → d → isEnd=true → true ✓
//
// search("b.d"):
//   b → exists
//   '.' → try all 26 children:
//     a: exists → dfs("d", a_node)
//       d: exists → isEnd=true → return true!
//   return true ✓
//
// search(".ad"):
//   '.' → try all 26 children:
//     b: exists → dfs("ad", b_node)
//       a: exists → dfs("d", a_node)
//         d: exists → isEnd=true → return true!
//   return true ✓
//
// search("b.."):
//   b → exists
//   '.' → try all 26 children:
//     a: exists → dfs(".", a_node)
//       '.' → try all 26 children:
//         d: exists → isEnd=true → return true!
//   return true ✓
//
// search("xyz"):
//   x: root->children['x'-'a'] == nullptr → return false ✗
```

**Dry Run Table (search("b.d")):**

| Step | char | Action | Result |
|------|------|--------|--------|
| 1 | 'b' | Check children[1] | Found, continue |
| 2 | '.' | Try all 26 children | Branch into all paths |
| 3 | (j=0) 'a' | Check children[0] | Found, recurse with "d" |
| 4 | 'd' | Check children[3] | Found, isEnd=true |
| 5 | - | Return true | Match found! |

---

### 3. Word Search II (Hard)
**Trigger:** Given an $m \times n$ `board` of characters and a list of `words`, return all words on the board.
**Intuition:** 
*The Brute Force:* For every word in the list, run a DFS on the board (like Word Search I). If you have 10,000 words, this takes forever.
*The Optimal Solution:* Build a **Trie** out of all the words in the list! 
Now, you only do ONE massive DFS traversal of the board. As you move from cell to cell, you traverse down the Trie simultaneously. 

```cpp
class Solution {
private:
    struct TrieNode {
        TrieNode* children[26];
        string word;  // Store the complete word at end nodes
        TrieNode() {
            for (int i = 0; i < 26; i++) children[i] = nullptr;
            word = "";
        }
    };
    
    TrieNode* root;
    vector<string> result;
    
    void buildTrie(vector<string>& words) {
        root = new TrieNode();
        for (string& word : words) {
            TrieNode* curr = root;
            for (char c : word) {
                int idx = c - 'a';
                if (curr->children[idx] == nullptr) {
                    curr->children[idx] = new TrieNode();
                }
                curr = curr->children[idx];
            }
            curr->word = word;  // Store word at end node
        }
    }
    
    void dfs(vector<vector<char>>& board, int r, int c, TrieNode* node) {
        char ch = board[r][c];
        
        // Pruning: if no child for this character, stop
        if (ch == '#' || node->children[ch - 'a'] == nullptr) return;
        
        node = node->children[ch - 'a'];
        
        // Found a complete word!
        if (!node->word.empty()) {
            result.push_back(node->word);
            node->word = "";  // Avoid duplicates
        }
        
        // Mark cell as visited
        board[r][c] = '#';
        
        // Explore all 4 directions
        if (r > 0) dfs(board, r - 1, c, node);
        if (r < board.size() - 1) dfs(board, r + 1, c, node);
        if (c > 0) dfs(board, r, c - 1, node);
        if (c < board[0].size() - 1) dfs(board, r, c + 1, node);
        
        // Unmark cell (backtrack)
        board[r][c] = ch;
    }
    
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        buildTrie(words);
        
        for (int r = 0; r < board.size(); r++) {
            for (int c = 0; c < board[0].size(); c++) {
                dfs(board, r, c, root);
            }
        }
        
        return result;
    }
};
```

**What's happening:**
```cpp
// Board:      Words: ["oath", "pea", "eat", "rain"]
// ┌─────────┐
// │ o a t h │
// │ p e a t │
// │ r a i n │
// └─────────┘
//
// Build Trie from words:
//   root → o → a → t → h* (word: "oath")
//   root → p → e → a* (word: "pea")
//   root → e → a → t* (word: "eat")
//   root → r → a → i → n* (word: "rain")
//
// DFS from each cell:
//
// Start at (0,0) 'o':
//   Follow Trie: o → a → t → h → found "oath"!
//   Mark path, continue DFS
//
// Start at (1,0) 'p':
//   Follow Trie: p → e → a → found "pea"!
//
// Start at (1,1) 'e':
//   Follow Trie: e → a → t → found "eat"!
//
// Start at (2,0) 'r':
//   Follow Trie: r → a → i → n → found "rain"!
//
// Result: ["oath", "pea", "eat", "rain"]
```

**The Pruning Magic:**
```
Without Trie:
  For each word (say 10,000 words):
    DFS entire board for each word
  Total: O(10,000 × M × N × L)

With Trie:
  DFS entire board ONCE
  At each cell, follow Trie path
  If Trie path breaks → prune immediately!
  Total: O(M × N × 26^L) but with heavy pruning

The Trie prunes entire branches:
  If board has 'x' but Trie has no word starting with 'x'
  → skip immediately, don't explore 4 directions!
```

**Step-by-Step Walkthrough for "oath":**
```
Board:      Trie path for "oath":
┌─────────┐   root → o → a → t → h
│ o a t h │
│ p e a t │   Start at (0,0) 'o':
│ r a i n │     'o' exists in Trie → continue
└─────────┘     Move to (0,1) 'a':
                  'a' exists in Trie → continue
                Move to (0,2) 't':
                  't' exists in Trie → continue
                Move to (0,3) 'h':
                  'h' exists in Trie → isEnd=true
                  Found "oath"! Add to result
```

---

### 4. Replace Words (Medium)
**Trigger:** Given a dictionary of roots and a sentence, replace each word in the sentence with its shortest root from the dictionary.
**Intuition:** Build a Trie from the roots. For each word in the sentence, search the Trie for the shortest prefix that is a root.

```cpp
string replaceWords(vector<string>& dictionary, string sentence) {
    // Build Trie from roots
    TrieNode* root = new TrieNode();
    for (string& word : dictionary) {
        TrieNode* curr = root;
        for (char c : word) {
            if (curr->children[c - 'a'] == nullptr) {
                curr->children[c - 'a'] = new TrieNode();
            }
            curr = curr->children[c - 'a'];
        }
        curr->isEnd = true;
    }
    
    // Process each word in sentence
    istringstream iss(sentence);
    string word;
    string result;
    
    while (iss >> word) {
        TrieNode* curr = root;
        string prefix;
        bool found = false;
        
        for (char c : word) {
            if (curr->children[c - 'a'] == nullptr || curr->isEnd) {
                break;
            }
            prefix += c;
            curr = curr->children[c - 'a'];
        }
        
        if (curr->isEnd) {
            result += prefix;
        } else {
            result += word;
        }
        result += " ";
    }
    
    result.pop_back();  // Remove trailing space
    return result;
}
```

**What's happening:**
```cpp
// Dictionary: ["cat", "bat", "rat"]
// Sentence: "the cattle was rattled by the battery"
//
// "cattle": 
//   c → a → t (isEnd=true! root "cat" found)
//   Replace with "cat"
//
// "was":
//   w → a → s (no root matches)
//   Keep "was"
//
// "rattled":
//   r → a → t (isEnd=true! root "rat" found)
//   Replace with "rat"
//
// "by":
//   b → y (no root matches)
//   Keep "by"
//
// "the":
//   t → h → e (no root matches)
//   Keep "the"
//
// "battery":
//   b → a → t (isEnd=true! root "bat" found)
//   Replace with "bat"
//
// Result: "the cat was rat by the bat"
```

---

### 5. Map Sum Pairs (Medium)
**Trigger:** Implement a map where `insert(key, val)` adds a key-value pair, and `sum(prefix)` returns the sum of all values whose keys start with the given prefix.

```cpp
class MapSum {
private:
    struct TrieNode {
        TrieNode* children[26];
        int value;  // Store value at word end
        TrieNode() : value(0) {
            for (int i = 0; i < 26; i++) children[i] = nullptr;
        }
    };
    
    TrieNode* root;
    
    int dfs(TrieNode* node) {
        if (node == nullptr) return 0;
        
        int sum = node->value;
        for (int i = 0; i < 26; i++) {
            sum += dfs(node->children[i]);
        }
        return sum;
    }
    
public:
    MapSum() {
        root = new TrieNode();
    }
    
    void insert(string key, int val) {
        TrieNode* curr = root;
        for (char c : key) {
            if (curr->children[c - 'a'] == nullptr) {
                curr->children[c - 'a'] = new TrieNode();
            }
            curr = curr->children[c - 'a'];
        }
        curr->value = val;
    }
    
    int sum(string prefix) {
        TrieNode* curr = root;
        
        // Navigate to the prefix node
        for (char c : prefix) {
            if (curr->children[c - 'a'] == nullptr) return 0;
            curr = curr->children[c - 'a'];
        }
        
        // DFS to sum all values in subtree
        return dfs(curr);
    }
};
```

**What's happening:**
```cpp
// insert("apple", 3)
// insert("app", 5)
// insert("ap", 2)
// insert("ban", 4)
//
// Trie structure:
//   root → a → p (value=2)
//              → p (value=5)
//                → l → e (value=3)
//   root → b → a → n (value=4)
//
// sum("ap"):
//   Navigate to 'p' node (after "ap")
//   DFS subtree:
//     'p' node: value=2
//     'p' node: value=5
//     'l' node: value=0
//     'e' node: value=3
//   Total: 2 + 5 + 3 = 10
//
// sum("apple"):
//   Navigate to 'e' node (after "apple")
//   DFS subtree:
//     'e' node: value=3
//   Total: 3
//
// sum("b"):
//   Navigate to 'b' node
//   DFS subtree:
//     'a' node: value=0
//     'n' node: value=4
//   Total: 4
```

---

### 6. Longest Word in Dictionary (Medium)
**Trigger:** Find the longest word in the dictionary that can be built one character at a time by other words in the dictionary.
**Intuition:** Build a Trie. Only traverse paths where every prefix is a complete word (isEnd=true). Track the longest such word.

```cpp
string longestWord(vector<string>& words) {
    TrieNode* root = new TrieNode();
    
    // Build Trie
    for (string& word : words) {
        TrieNode* curr = root;
        for (char c : word) {
            if (curr->children[c - 'a'] == nullptr) {
                curr->children[c - 'a'] = new TrieNode();
            }
            curr = curr->children[c - 'a'];
        }
        curr->isEnd = true;
    }
    
    // DFS to find longest word where every prefix is a word
    string result = "";
    
    function<void(TrieNode*, string&)> dfs = [&](TrieNode* node, string& path) {
        for (int i = 0; i < 26; i++) {
            if (node->children[i] != nullptr && node->children[i]->isEnd) {
                path += (char)('a' + i);
                
                if (path.length() > result.length()) {
                    result = path;
                }
                
                dfs(node->children[i], path);
                path.pop_back();
            }
        }
    };
    
    string path = "";
    dfs(root, path);
    return result;
}
```

**What's happening:**
```cpp
// words = ["w","wo","wor","worl","world"]
//
// Trie:
//   root → w* → o* → r* → l* → d*
//   (* = isEnd = true)
//
// DFS:
//   path = ""
//     'w' isEnd=true → path = "w", result = "w"
//       'o' isEnd=true → path = "wo", result = "wo"
//         'r' isEnd=true → path = "wor", result = "wor"
//           'l' isEnd=true → path = "worl", result = "worl"
//             'd' isEnd=true → path = "world", result = "world"
//
// Result: "world"
//
// If words = ["a", "banana", "app", "appl", "apply", "application"]:
// "apply" / "application" would need a → ap → app → appl → ...
// But "ap" is not a word → every path below "a" breaks immediately
// Longest valid: "a"
// (Add "ap" to the list and the answer becomes "apply": a → ap → app → appl → apply)
```

---

### Quick Reference Table

| Problem | Difficulty | Technique | Time | Space |
|---------|-----------|-----------|------|-------|
| Implement Trie | Medium | Basic Trie | O(L) per op | O(N × L) |
| Add & Search Words | Medium | Trie + DFS (dots) | O(26^L) worst | O(N × L) |
| Word Search II | Hard | Trie + Backtracking | O(M × N × 4^L) | O(N × L) |
| Replace Words | Medium | Trie prefix search | O(S + R) | O(R × L) |
| Map Sum Pairs | Medium | Trie + DFS | O(L + K) | O(N × L) |
| Longest Word | Medium | Trie + DFS | O(N × L) | O(N × L) |
| Search Suggestions | Medium | Trie + DFS | O(L + K) | O(N × L) |
| Maximum XOR | Hard | Trie (binary) | O(N × 32) | O(N × 32) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems tries** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

