# Part 10, Topic 1: Binary Trees & Traversals
## Chapter 1: The `TreeNode` & DFS Traversals

A Tree is a hierarchical data structure. The most common variation is the **Binary Tree**, where every node has at most two children (a `left` and a `right`).

### 1. The `TreeNode` Struct

In C++, a Binary Tree node looks almost identical to a Linked List node, just with an extra pointer.

```cpp
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    
    // Constructors
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
```

**What's happening:**
```cpp
// A TreeNode has:
// - val: the data stored in this node
// - left: pointer to left child (smaller values in BST)
// - right: pointer to right child (larger values in BST)
//
// Think of it as a Linked List node that "forks" into two paths
// instead of just one. Each node can have 0, 1, or 2 children.
```

### 2. Depth-First Search (DFS)

Because a Tree is not a flat array, you cannot simply write a `for` loop to look at every element. 
The most natural way to explore a tree is using **Recursion** to perform a Depth-First Search (DFS). You plunge as deep as you can down one branch before backing up to explore another.

There are three primary ways to traverse a tree using DFS. They all use the exact same code structure; the only difference is **where you place the `cout` (the work) relative to the recursive calls.**

#### A. Preorder Traversal (Node -> Left -> Right)
You process the current node *before* you explore its children.
*Use Case:* Making a copy (clone) of a tree.

```cpp
void preorder(TreeNode* root) {
    if (root == nullptr) return; // Base Case
    
    cout << root->val << " "; // 1. Process Node
    preorder(root->left);     // 2. Recurse Left
    preorder(root->right);    // 3. Recurse Right
}
```

**What's happening:**
```cpp
// Example tree:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
//
// Preorder: 1 → 2 → 4 → 5 → 3 → 6
//
// Step-by-step:
// Visit 1: output 1, then go left
// Visit 2: output 2, then go left
// Visit 4: output 4, no children, backtrack to 2
// Visit 5: output 5, no children, backtrack to 2, backtrack to 1
// Visit 3: output 3, then go left (null), then go right
// Visit 6: output 6, no children, done
```

**Dry Run Table (Preorder):**

| Step | Current Node | Action | Output So Far | Stack (Call Stack) |
|------|--------------|--------|---------------|---------------------|
| 1 | 1 | Process, go left | [1] | [1] |
| 2 | 2 | Process, go left | [1,2] | [1,2] |
| 3 | 4 | Process, no children | [1,2,4] | [1,2,4] |
| 4 | 4 | Return (backtrack) | [1,2,4] | [1,2] |
| 5 | 2 | Go right | [1,2,4] | [1,2] |
| 6 | 5 | Process, no children | [1,2,4,5] | [1,2,5] |
| 7 | 5 | Return | [1,2,4,5] | [1,2] |
| 8 | 2 | Return | [1,2,4,5] | [1] |
| 9 | 1 | Go right | [1,2,4,5] | [1] |
| 10 | 3 | Process, go left (null), go right | [1,2,4,5,3] | [1,3] |
| 11 | 6 | Process, no children | [1,2,4,5,3,6] | [1,3,6] |
| 12 | 6 | Return | [1,2,4,5,3,6] | [1,3] |
| 13 | 3 | Return | [1,2,4,5,3,6] | [1] |
| 14 | 1 | Return | [1,2,4,5,3,6] | [] |

#### B. Inorder Traversal (Left -> Node -> Right)
You explore the left branch entirely, *then* process the current node, *then* explore the right branch.
*Use Case:* In a Binary Search Tree (BST), an Inorder traversal visits the nodes in strictly sorted ascending order!

```cpp
void inorder(TreeNode* root) {
    if (root == nullptr) return;
    
    inorder(root->left);      // 1. Recurse Left
    cout << root->val << " "; // 2. Process Node
    inorder(root->right);     // 3. Recurse Right
}
```

**What's happening:**
```cpp
// Same tree:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
//
// Inorder: 4 → 2 → 5 → 1 → 3 → 6
//
// Step-by-step:
// Go left from 1 → 2 → 4
// Visit 4: no left, output 4, no right, backtrack to 2
// Visit 2: output 2, go right to 5
// Visit 5: no left, output 5, no right, backtrack to 2, backtrack to 1
// Visit 1: output 1, go right to 3
// Visit 3: go left (null), output 3, go right to 6
// Visit 6: no left, output 6, no right, done
//
// For a BST, this gives sorted order!
```

**Dry Run Table (Inorder):**

| Step | Current Node | Action | Output So Far |
|------|--------------|--------|---------------|
| 1 | 1 | Go left | [] |
| 2 | 2 | Go left | [] |
| 3 | 4 | No left, process, no right | [4] |
| 4 | 2 | Process, go right | [4,2] |
| 5 | 5 | No left, process, no right | [4,2,5] |
| 6 | 1 | Process, go right | [4,2,5,1] |
| 7 | 3 | Go left (null), process, go right | [4,2,5,1,3] |
| 8 | 6 | No left, process, no right | [4,2,5,1,3,6] |

#### C. Postorder Traversal (Left -> Right -> Node)
You explore both children entirely, and only process the current node *after* its children have returned.
*Use Case:* Deleting a tree (you must delete the children before you delete the parent).

```cpp
void postorder(TreeNode* root) {
    if (root == nullptr) return;
    
    postorder(root->left);    // 1. Recurse Left
    postorder(root->right);   // 2. Recurse Right
    cout << root->val << " "; // 3. Process Node
}
```

**What's happening:**
```cpp
// Same tree:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
//
// Postorder: 4 → 5 → 2 → 6 → 3 → 1
//
// Step-by-step:
// Go left from 1 → 2 → 4
// Visit 4: no left, no right, output 4, backtrack to 2
// Visit 2: go right to 5
// Visit 5: no left, no right, output 5, backtrack to 2
// Visit 2: output 2, backtrack to 1
// Visit 1: go right to 3
// Visit 3: go left (null), go right to 6
// Visit 6: no left, no right, output 6, backtrack to 3
// Visit 3: output 3, backtrack to 1
// Visit 1: output 1, done
//
// This is perfect for deleting nodes!
// You delete children before parents.
```

**Dry Run Table (Postorder):**

| Step | Current Node | Action | Output So Far |
|------|--------------|--------|---------------|
| 1 | 1 | Go left | [] |
| 2 | 2 | Go left | [] |
| 3 | 4 | No children, process | [4] |
| 4 | 2 | Go right | [4] |
| 5 | 5 | No children, process | [4,5] |
| 6 | 2 | Process | [4,5,2] |
| 7 | 1 | Go right | [4,5,2] |
| 8 | 3 | Go left (null), go right | [4,5,2] |
| 9 | 6 | No children, process | [4,5,2,6] |
| 10 | 3 | Process | [4,5,2,6,3] |
| 11 | 1 | Process | [4,5,2,6,3,1] |

### 3. Iterative DFS (Using a Stack)

Interviewers might ask: *"Can you do an Inorder traversal without recursion?"*
Since recursion uses the OS Call Stack, you can manually simulate the process using your own `std::stack`.

This is tricky to memorize, but here is the standard Iterative Inorder template:

```cpp
#include <stack>

vector<int> inorderTraversal(TreeNode* root) {
    vector<int> result;
    stack<TreeNode*> st;
    TreeNode* curr = root;

    // Loop while there are unvisited nodes OR nodes waiting in the stack
    while (curr != nullptr || !st.empty()) {
        
        // 1. Go as far LEFT as possible, pushing every node to the stack
        while (curr != nullptr) {
            st.push(curr);
            curr = curr->left;
        }
        
        // 2. We hit the bottom left. Pop the top node.
        curr = st.top();
        st.pop();
        
        // 3. PROCESS the node (This is the "Inorder" part)
        result.push_back(curr->val);
        
        // 4. Move to the RIGHT child
        curr = curr->right;
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Same tree:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
//
// Iterative Inorder:
// curr=1: push 1, go left
// curr=2: push 2, go left
// curr=4: push 4, go left (null)
// Stack: [1,2,4]
//
// Pop 4: process 4, go right (null)
// Stack: [1,2]
//
// Pop 2: process 2, go right (5)
// curr=5: push 5, go left (null)
// Stack: [1,5]
//
// Pop 5: process 5, go right (null)
// Stack: [1]
//
// Pop 1: process 1, go right (3)
// curr=3: push 3, go left (null)
// Stack: [3]
//
// Pop 3: process 3, go right (6)
// curr=6: push 6, go left (null)
// Stack: [6]
//
// Pop 6: process 6, go right (null)
// Stack: []
//
// Result: [4,2,5,1,3,6] ✓
```

**Dry Run Table (Iterative Inorder):**

| Step | curr | Stack | Action | Output |
|------|------|-------|--------|--------|
| 1 | 1 | [] | Push 1, go left | [] |
| 2 | 2 | [1] | Push 2, go left | [] |
| 3 | 4 | [1,2] | Push 4, go left (null) | [] |
| 4 | null | [1,2,4] | Pop 4, process | [4] |
| 5 | null | [1,2] | Pop 2, process, go right | [4,2] |
| 6 | 5 | [1] | Push 5, go left (null) | [4,2] |
| 7 | null | [1,5] | Pop 5, process | [4,2,5] |
| 8 | null | [1] | Pop 1, process, go right | [4,2,5,1] |
| 9 | 3 | [] | Push 3, go left (null) | [4,2,5,1] |
| 10 | null | [3] | Pop 3, process, go right | [4,2,5,1,3] |
| 11 | 6 | [] | Push 6, go left (null) | [4,2,5,1,3] |
| 12 | null | [6] | Pop 6, process | [4,2,5,1,3,6] |

### 4. Iterative Preorder and Postorder

**Iterative Preorder (using stack):**
```cpp
vector<int> preorderTraversal(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) return result;
    
    stack<TreeNode*> st;
    st.push(root);
    
    while (!st.empty()) {
        TreeNode* node = st.top();
        st.pop();
        
        result.push_back(node->val);
        
        // Push right first so left is processed first (LIFO)
        if (node->right != nullptr) st.push(node->right);
        if (node->left != nullptr) st.push(node->left);
    }
    
    return result;
}
```

**What's happening:**
```cpp
// We push RIGHT child first because stack is LIFO
// This ensures LEFT child is processed first
//
// Tree:    1
//         / \
//        2   3
//
// Push 1
// Pop 1: output [1], push 3, push 2
// Pop 2: output [1,2], push children (none)
// Pop 3: output [1,2,3]
// Result: [1,2,3] ✓ (preorder)
```

### 5. Morris Traversal (O(1) Space)

Morris Traversal achieves O(1) space by temporarily modifying the tree structure using threaded binary trees.

```cpp
vector<int> morrisInorder(TreeNode* root) {
    vector<int> result;
    TreeNode* curr = root;
    
    while (curr != nullptr) {
        if (curr->left == nullptr) {
            result.push_back(curr->val);
            curr = curr->right;
        } else {
            // Find inorder predecessor
            TreeNode* pred = curr->left;
            while (pred->right != nullptr && pred->right != curr) {
                pred = pred->right;
            }
            
            if (pred->right == nullptr) {
                // Create thread
                pred->right = curr;
                curr = curr->left;
            } else {
                // Thread exists, remove it
                pred->right = nullptr;
                result.push_back(curr->val);
                curr = curr->right;
            }
        }
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Morris Traversal creates temporary threads from
// inorder predecessors back to the current node.
// This allows us to return to the parent without recursion.
//
// The key insight: if a node has no right subtree,
// its inorder predecessor can point back to it.
//
// Time: O(N) - each edge is visited at most twice
// Space: O(1) - no recursion stack, no explicit stack
```

### 6. Summary of Complexity

| Traversal | Time | Space (Recursive) | Space (Iterative) | Space (Morris) |
|-----------|------|-------------------|-------------------|----------------|
| Preorder | O(N) | O(H) | O(H) | O(1) |
| Inorder | O(N) | O(H) | O(H) | O(1) |
| Postorder | O(N) | O(H) | O(H) | O(1) |

Where H = height of tree:
- Best case (balanced): H = log N
- Worst case (skewed): H = N

### 7. When to Use Each Traversal

```
┌─────────────────────────────────────────────────────────────────┐
│  Preorder (Node → Left → Right):                                │
│  - Copying/cloning a tree                                       │
│  - Serializing a tree to a string                               │
│  - Creating a prefix expression                                 │
│                                                                 │
│  Inorder (Left → Node → Right):                                 │
│  - BST gives sorted order                                       │
│  - Validating BST property                                      │
│  - Finding Kth smallest element                                 │
│                                                                 │
│  Postorder (Left → Right → Node):                               │
│  - Deleting a tree (children before parent)                     │
│  - Calculating directory sizes                                  │
│  - Creating a postfix expression                                │
│  - Solving "max path sum" problems                              │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Reference Table

| Traversal | Order | Use Case | Recursive Template |
|-----------|-------|----------|-------------------|
| Preorder | Node→Left→Right | Clone tree | process(); goLeft(); goRight(); |
| Inorder | Left→Node→Right | BST sorted | goLeft(); process(); goRight(); |
| Postorder | Left→Right→Node | Delete tree | goLeft(); goRight(); process(); |

**Key Takeaways:**
1. All DFS traversals visit every node exactly once → O(N) time
2. Space depends on tree height (stack depth)
3. Inorder on BST = sorted array (Golden Secret!)
4. Iterative versions use explicit stack (same space as recursive)
5. Morris traversal achieves O(1) space but modifies tree temporarily

---

## Practice & Self-Check

All questions below use this tree (call it **Tree T**). It is a different tree from the chapter's `1..6` example, so you have to actually trace.

```text
        8
       / \
      3   10
     / \    \
    1   6    14
       / \   /
      4   7 13
```

### Predict the Output / Trace by Hand

**Q1.** Write the output of the chapter's recursive `preorder`, `inorder`, and `postorder` functions on Tree T.

**Q2.** Run the chapter's iterative `inorderTraversal` on Tree T. (a) What is the maximum number of nodes in `st` at any moment? (b) What does the stack contain (bottom → top) immediately after node `6` is popped? (c) What is `curr` right after `6` is processed and step 4 runs?

**Q3.** Run the chapter's iterative `preorderTraversal` on Tree T. (a) What is the stack (bottom → top) right after node `3` is popped and its children are pushed? (b) Now suppose someone swaps the two push lines so `left` is pushed before `right`. What does the function output on Tree T, and what familiar sequence do you get if you reverse that output?

**Q4.** Run `morrisInorder` on Tree T. How many temporary threads (`pred->right = curr`) are created, and which `pred → curr` pairs are they?

**Q5.** Tree T has $N = 9$ nodes and height $H = 4$ (counting nodes on the longest root-to-leaf path). If you instead inserted the values `1, 2, 3, 4, 5, 6, 7, 8, 9` so that every node only has a right child, what would the maximum recursion depth of `inorder` become, and what is the space complexity in Big-O?

### Coding Exercises

**E1 (Easy).** Count the leaves of a binary tree (nodes with no children).

```cpp
int countLeaves(TreeNode* root);
// Tree T                      -> 4   (leaves 1, 4, 7, 13)
// Chapter tree 1,2,3,4,5,6    -> 3   (leaves 4, 5, 6)
```

**E2 (Easy–Medium).** Write an iterative **postorder** traversal using one `std::stack` and no recursion. Hint: look at your answer to Q3(b).

```cpp
vector<int> postorderIterative(TreeNode* root);
// Chapter tree -> [4, 5, 2, 6, 3, 1]
// Tree T       -> [1, 4, 7, 6, 3, 13, 14, 10, 8]
```

**E3 (Medium).** Rebuild a tree from its preorder and inorder sequences (all values distinct).

```cpp
TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder);
// preorder = [1,2,4,5,3,6], inorder = [4,2,5,1,3,6]
//   -> the chapter's tree (its postorder is 4 5 2 6 3 1)
// preorder = [8,3,1,6,4,7,10,14,13], inorder = [1,3,4,6,7,8,10,13,14]
//   -> Tree T
```

#### Dry-Run: Answers

**Q1.**
- Preorder: `8 3 1 6 4 7 10 14 13`
- Inorder: `1 3 4 6 7 8 10 13 14` (sorted, because Tree T happens to be a BST)
- Postorder: `1 4 7 6 3 13 14 10 8`

**Q2.** (a) **3**. (b) **`[8]`**. (c) **`curr = 7`**.

| Step | Action | Stack (bottom → top) | Output |
|------|--------|----------------------|--------|
| 1 | Push 8, 3, 1 going left | [8,3,1] | [] |
| 2 | Pop 1, curr = null | [8,3] | [1] |
| 3 | Pop 3, curr = 6 | [8] | [1,3] |
| 4 | Push 6, 4 going left | [8,6,4] | [1,3] |
| 5 | Pop 4, curr = null | [8,6] | [1,3,4] |
| 6 | Pop 6, curr = 7 | [8] | [1,3,4,6] |
| 7 | Push 7; pop 7, curr = null | [8] | [1,3,4,6,7] |
| 8 | Pop 8, curr = 10; push 10; pop 10, curr = 14 | [] | [...,8,10] |
| 9 | Push 14, 13; pop 13; pop 14 | [] | [...,13,14] |

The stack reaches size 3 twice (`[8,3,1]` and `[8,6,4]`), which equals the number of left-going steps on the longest left chain from a pushed node.

**Q3.** (a) **`[10, 6, 1]`**. Pop 8 pushes 10 then 3 → `[10,3]`; pop 3 pushes 6 then 1 → `[10,6,1]`.

(b) Output **`8 10 14 13 3 6 7 4 1`** (Node → Right → Left). Reversed it is **`1 4 7 6 3 13 14 10 8`**, which is exactly the postorder from Q1.

| Pop | Pushed (left first, then right) | Stack after | Output |
|-----|----------------------------------|-------------|--------|
| 8 | 3, 10 | [3,10] | 8 |
| 10 | 14 | [3,14] | 8 10 |
| 14 | 13 | [3,13] | 8 10 14 |
| 13 | none | [3] | 8 10 14 13 |
| 3 | 1, 6 | [1,6] | ... 3 |
| 6 | 4, 7 | [1,4,7] | ... 3 6 |
| 7, 4, 1 | none | [] | ... 7 4 1 |

**Q4.** **4 threads** — one for every node that has a left child (8, 3, 6, 14). The predecessor is the rightmost node of that left subtree:
- `7 → 8` (left subtree of 8 is 3 → 6 → 7, rightmost is 7)
- `1 → 3`
- `4 → 6`
- `13 → 14`

Each thread is created once (first visit of `curr`) and removed once (second visit, when `pred->right == curr`), so the tree is restored by the end.

**Q5.** A right-skewed tree of 9 nodes has height 9, so the recursion depth reaches **9 frames** (plus the null-child calls that return immediately). Space is $O(H) = O(N)$ in this worst case, versus $O(\log N)$ for a balanced tree.

**E1 — reference solution**

```cpp
int countLeaves(TreeNode* root) {
    if (root == nullptr) return 0;
    if (root->left == nullptr && root->right == nullptr) return 1;
    return countLeaves(root->left) + countLeaves(root->right);
}
```

Postorder-style combination of children's answers. Time $O(N)$, space $O(H)$.

**E2 — reference solution**

```cpp
vector<int> postorderIterative(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) return result;

    stack<TreeNode*> st;
    st.push(root);
    while (!st.empty()) {
        TreeNode* node = st.top();
        st.pop();
        result.push_back(node->val);               // Node -> Right -> Left
        if (node->left != nullptr)  st.push(node->left);
        if (node->right != nullptr) st.push(node->right);
    }
    reverse(result.begin(), result.end());         // Left -> Right -> Node
    return result;
}
```

Reversing a Node → Right → Left traversal gives Left → Right → Node. Time $O(N)$, space $O(N)$ for the output plus $O(H)$-ish stack.

**E3 — reference solution**

```cpp
TreeNode* build(vector<int>& pre, int& p, int lo, int hi,
                unordered_map<int, int>& pos) {
    if (lo > hi) return nullptr;                   // empty inorder range
    TreeNode* node = new TreeNode(pre[p++]);       // next preorder value is the root
    int m = pos[node->val];                        // split point in inorder
    node->left  = build(pre, p, lo, m - 1, pos);   // left part first (preorder order)
    node->right = build(pre, p, m + 1, hi, pos);
    return node;
}

TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
    unordered_map<int, int> pos;
    for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
    int p = 0;
    return build(preorder, p, 0, (int)inorder.size() - 1, pos);
}
```

Preorder tells you the root; inorder tells you which values go left vs right of it. The hash map makes each split $O(1)$, so time is $O(N)$ and space is $O(N)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The `TreeNode` & DFS Traversals**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 dfs traversals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

