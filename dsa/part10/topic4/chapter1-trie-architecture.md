# Part 10, Topic 4: Trie (Prefix Tree)
## Chapter 1: Trie Architecture & Operations

A **Trie** (pronounced "try", short for re**trie**val) is a specialized tree data structure designed specifically to store and search for strings. 

*Trigger:* If a problem asks you to search for words based on a **prefix** (e.g., Autocomplete: "find all words starting with 'app'"), or if you need to search a dictionary of words very quickly, you need a Trie.

### 1. The `TrieNode` Struct

Unlike a Binary Tree where each node has two children (left/right), a TrieNode has **26 children** (one for each lowercase English letter). 
It also has a boolean flag to mark whether a complete word ends at that specific node.

```cpp
struct TrieNode {
    // Array of 26 pointers, initialized to nullptr
    TrieNode* children[26]; 
    
    // True if a word ends here (e.g., if we inserted "app" and "apple", 
    // the node for 'p' and the node for 'e' would both have isEnd = true).
    bool isEnd; 
    
    TrieNode() {
        isEnd = false;
        for (int i = 0; i < 26; i++) {
            children[i] = nullptr;
        }
    }
};
```

**What's happening:**
```cpp
// TrieNode structure:
// - children[0] represents 'a'
// - children[1] represents 'b'
// - ...
// - children[25] represents 'z'
//
// The ASCII trick: 'b' - 'a' = 1
// So children[c - 'a'] gives the correct index
//
// isEnd marks complete words:
// If we insert "app" and "apple":
//   a → p → p (isEnd=true) → l → e (isEnd=true)
//   The 'p' node marks "app" as complete
//   The 'e' node marks "apple" as complete
```

### 2. Implementation: The `Trie` Class

A Trie class manages the `root` node. The root node itself does not contain a character; it just holds pointers to the first letters of all words in the Trie.

#### Insertion: $O(L)$ where $L$ is word length
To insert a word, start at the root. For each character in the word, check if the child pointer for that character exists. If not, create a new `TrieNode`. Then, move down to that child. When the loop finishes, mark the final node's `isEnd` as true.

```cpp
class Trie {
private:
    TrieNode* root;

public:
    Trie() {
        root = new TrieNode();
    }
    
    void insert(string word) {
        TrieNode* curr = root;
        for (char c : word) {
            int index = c - 'a'; // The ASCII trick!
            if (curr->children[index] == nullptr) {
                curr->children[index] = new TrieNode();
            }
            curr = curr->children[index];
        }
        curr->isEnd = true;
    }
```

**What's happening:**
```cpp
// Insert "apple":
//
// root (start)
//   |
//   a (create new node)
//   |
//   p (create new node)
//   |
//   p (create new node)
//   |
//   l (create new node)
//   |
//   e (create new node, isEnd = true)
//
// Insert "app":
//
// root → a → p → p (already exists)
//                |
//                isEnd = true (mark "app" as complete)
//
// Trie now:
// root
//  └── a
//       └── p
//            └── p (isEnd=true) ← "app" ends here
//                 └── l
//                      └── e (isEnd=true) ← "apple" ends here
```

**Dry Run Table (Insert):**

| Step | Character | Index | Action | Trie State |
|------|-----------|-------|--------|------------|
| 1 | 'a' | 0 | Create node | root→a |
| 2 | 'p' | 15 | Create node | root→a→p |
| 3 | 'p' | 15 | Create node | root→a→p→p |
| 4 | 'l' | 11 | Create node | root→a→p→p→l |
| 5 | 'e' | 4 | Create node, isEnd=true | root→a→p→p→l→e(*) |

#### Search (Exact Word): $O(L)$
Traverse the tree character by character. If a pointer is `nullptr`, the word doesn't exist. If you reach the end of the word, check if `curr->isEnd` is true (because "app" might be in the tree as a prefix to "apple", but not as a standalone word!).

```cpp
    bool search(string word) {
        TrieNode* curr = root;
        for (char c : word) {
            int index = c - 'a';
            if (curr->children[index] == nullptr) {
                return false; // Path broken
            }
            curr = curr->children[index];
        }
        return curr->isEnd; // Did a word actually end here?
    }
```

**What's happening:**
```cpp
// Search for "app":
// root → a → p → p
// At node 'p': isEnd = true
// Return true ✓
//
// Search for "appl":
// root → a → p → p → l
// At node 'l': isEnd = false
// Return false (no word "appl" exists)
//
// Search for "ap":
// root → a → p
// At node 'p': isEnd = false
// Return false (no word "ap" exists)
//
// The isEnd flag is CRITICAL!
// Without it, we couldn't distinguish
// between "app" (a word) and "apple" (a longer word)
```

**Dry Run Table (Search):**

| Word | Path | isEnd at End | Result |
|------|------|--------------|--------|
| "apple" | root→a→p→p→l→e | true | true |
| "app" | root→a→p→p | true | true |
| "appl" | root→a→p→p→l | false | false |
| "ap" | root→a→p | false | false |
| "xyz" | root→x (null) | - | false |

#### Search (Prefix): $O(L)$
Exactly the same as `search`, but you don't care if `isEnd` is true. If you successfully traverse the entire prefix without hitting a `nullptr`, the prefix exists!

```cpp
    bool startsWith(string prefix) {
        TrieNode* curr = root;
        for (char c : prefix) {
            int index = c - 'a';
            if (curr->children[index] == nullptr) {
                return false;
            }
            curr = curr->children[index];
        }
        return true; // We successfully traversed the prefix!
    }
};
```

**What's happening:**
```cpp
// Trie contains: "apple", "app"
//
// startsWith("app"):
// root → a → p → p
// Successfully traversed! Return true ✓
// (We don't care about isEnd here)
//
// startsWith("ap"):
// root → a → p
// Successfully traversed! Return true ✓
//
// startsWith("b"):
// root → b (null)
// Path broken! Return false ✗
//
// Key difference from search():
// - search("ap") returns false (no word "ap")
// - startsWith("ap") returns true ("app" starts with "ap")
```

**Dry Run Table (Prefix Search):**

| Prefix | Path | Result | Reason |
|--------|------|--------|--------|
| "app" | root→a→p→p | true | Path exists |
| "ap" | root→a→p | true | Path exists |
| "a" | root→a | true | Path exists |
| "b" | root→b (null) | false | Path broken |
| "apple" | root→a→p→p→l→e | true | Path exists |

### 3. Space Complexity
A Trie trades Space for Time. While a Hash Set also gives $O(L)$ lookups for words, a Hash Set cannot do prefix searches. 
A Trie is incredibly fast, but every single node allocates an array of 26 pointers. If you have many disjoint words with no shared prefixes, a Trie uses massive amounts of memory. However, if the dictionary has many shared prefixes (e.g., "apple", "app", "apricot"), a Trie is very space-efficient because those words all share the same starting nodes!

```cpp
// Space comparison:
//
// Hash Set: ["apple", "app", "apricot"]
//   Stores 3 complete strings: 5+3+7 = 15 characters
//
// Trie: ["apple", "app", "apricot"]
//   Shared prefix "ap": 2 nodes
//   "apple": +3 nodes (p, l, e)
//   "app": +0 nodes (already exists)
//   "apricot": +5 nodes (r, i, c, o, t)
//   Total: 10 nodes
//
// Trie is more space-efficient when prefixes are shared!
```

### 4. Trie vs Hash Map vs Array

| Feature | Trie | Hash Map | Array |
|---------|------|----------|-------|
| Search | O(L) | O(L) avg | O(N*L) |
| Prefix Search | O(L) | O(N*L) | O(N*L) |
| Insert | O(L) | O(L) avg | O(N) |
| Space | O(ALPHABET * N * L) | O(N*L) | O(N*L) |
| Ordered | Yes | No | No |
| Autocomplete | Fast | Slow | Slow |

**When to Use Trie:**
```
✓ Autocomplete systems
✓ Spell checkers
✓ IP routing (longest prefix match)
✓ Word games (Boggle, Scrabble)
✓ Dictionary implementations
✓ Finding all words with common prefix
```

**When NOT to Use Trie:**
```
✗ Simple exact match (use Hash Map)
✗ Small dictionary (sorting is faster)
✗ No prefix relationships between words
✗ Memory-constrained environments
```

### 5. Common Trie Operations Summary

```cpp
// 1. Insert a word: O(L)
void insert(string word) {
    TrieNode* curr = root;
    for (char c : word) {
        int idx = c - 'a';
        if (!curr->children[idx]) {
            curr->children[idx] = new TrieNode();
        }
        curr = curr->children[idx];
    }
    curr->isEnd = true;
}

// 2. Search for exact word: O(L)
bool search(string word) {
    TrieNode* curr = root;
    for (char c : word) {
        int idx = c - 'a';
        if (!curr->children[idx]) return false;
        curr = curr->children[idx];
    }
    return curr->isEnd;
}

// 3. Check if prefix exists: O(L)
bool startsWith(string prefix) {
    TrieNode* curr = root;
    for (char c : prefix) {
        int idx = c - 'a';
        if (!curr->children[idx]) return false;
        curr = curr->children[idx];
    }
    return true;
}

// 4. Find all words with prefix: O(L + total matches)
void findAllWords(TrieNode* node, string prefix, vector<string>& result) {
    if (node->isEnd) {
        result.push_back(prefix);
    }
    
    for (int i = 0; i < 26; i++) {
        if (node->children[i]) {
            findAllWords(node->children[i], prefix + (char)('a' + i), result);
        }
    }
}

// 5. Delete a word: O(L)
bool deleteWord(TrieNode* node, string& word, int depth) {
    if (depth == word.length()) {
        if (!node->isEnd) return false;
        node->isEnd = false;
        return isEmpty(node);
    }
    
    int idx = word[depth] - 'a';
    if (!node->children[idx]) return false;
    
    bool shouldDelete = deleteWord(node->children[idx], word, depth + 1);
    
    if (shouldDelete) {
        delete node->children[idx];
        node->children[idx] = nullptr;
        return !node->isEnd && isEmpty(node);
    }
    
    return false;
}
```

### Quick Reference Table

| Operation | Time | Space | Description |
|-----------|------|-------|-------------|
| Insert | O(L) | O(L) | Add word to trie |
| Search | O(L) | O(1) | Find exact word |
| StartsWith | O(L) | O(1) | Check prefix |
| FindAll | O(L + M) | O(M) | All words with prefix |
| Delete | O(L) | O(L) | Remove word (recursion stack) |
| isEmpty | O(ALPHABET) | O(1) | Check if node has children |

Where L = word length, M = number of matches

**Key Takeaways:**
1. TrieNode has 26 children (one per letter) + isEnd flag
2. All operations are O(L) where L is word length
3. isEnd distinguishes complete words from prefixes
4. Shared prefixes save space
5. Trie is perfect for autocomplete and prefix searches
6. ASCII trick: `c - 'a'` converts char to index 0-25

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Trie Architecture & Operations**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 trie architecture** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

