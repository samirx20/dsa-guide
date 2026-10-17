# Part 10, Topic 2: Binary Search Trees (BST)
## Interview Problems Walkthrough

Because the BST property is so strict, these problems test your ability to narrow down the search space recursively.

---

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|------------|---------|-------------|
| Validate BST | Medium | DFS with bounds | Pass min/max constraints |
| Kth Smallest | Medium | Inorder traversal | BST inorder = sorted |
| Lowest Common Ancestor | Medium | BST property | Split point is LCA |
| Insert into BST | Medium | Search + insert | Find nullptr, add node |
| Delete from BST | Medium | 3 cases | 0/1 child or successor |
| Search in BST | Easy | Binary search | Go left/right based on value |
| BST to Greater Sum Tree | Medium | Reverse inorder | Right → Node → Left |
| Construct BST from Preorder | Medium | Bounds | Use preorder + min/max |

---

### Solution Approach Comparison

| Problem | Brute Force | Optimal | Time | Space |
|---------|-------------|---------|------|-------|
| Validate BST | Inorder to array | DFS with bounds | O(N) | O(H) |
| Kth Smallest | Sort array | Iterative inorder | O(N) | O(H) |
| LCA | Two paths | BST property | O(H) | O(1) |
| Insert | Search | Recursive/iterative | O(H) | O(H) |
| Delete | Find + rearrange | 3-case handling | O(H) | O(H) |

---

### 1. Validate Binary Search Tree (Medium)
**Trigger:** Given a tree, return `true` if it's a valid BST.
**Intuition:** A common mistake is just checking `if (left->val < root->val && right->val > root->val)`. That is NOT enough! Every node in the *entire* left subtree must be less than the root.
You must pass bounds (`min` and `max`) down the recursive tree.
For the root, the bounds are $(-\infty, +\infty)$.
When you go left, the `max` becomes the root's value. When you go right, the `min` becomes the root's value.

```cpp
bool isValid(TreeNode* root, long long minVal, long long maxVal) {
    if (root == nullptr) return true;
    
    if (root->val <= minVal || root->val >= maxVal) return false;
    
    // Left subtree must be strictly less than root->val
    // Right subtree must be strictly greater than root->val
    return isValid(root->left, minVal, root->val) && 
           isValid(root->right, root->val, maxVal);
}

bool isValidBST(TreeNode* root) {
    // Use LONG_MIN/MAX to handle test cases where nodes have INT_MIN/MAX values
    return isValid(root, LONG_MIN, LONG_MAX); 
}
```

**What's happening:**
```cpp
// Example 1: Valid BST
//        5
//       / \
//      1   7
//         / \
//        6   8
//
// validate(5, -∞, +∞) ✓
//   validate(1, -∞, 5) ✓
//   validate(7, 5, +∞) ✓
//     validate(6, 5, 7) ✓
//     validate(8, 7, +∞) ✓
//
// Example 2: Invalid BST
//        5
//       / \
//      1   7
//         / \
//        4   8
//
// validate(5, -∞, +∞) ✓
//   validate(1, -∞, 5) ✓
//   validate(7, 5, +∞) ✓
//     validate(4, 5, 7) ✗ (4 < 5, violates lower bound!)
//
// The node 4 is in the RIGHT subtree of 5,
// but 4 < 5, which violates BST property.
```

**Dry Run Table:**

| Node | Bounds | Valid? | Reason |
|------|--------|--------|--------|
| 5 | (-∞, +∞) | Yes | In range |
| 1 | (-∞, 5) | Yes | 1 < 5 |
| 7 | (5, +∞) | Yes | 7 > 5 |
| 4 | (5, +∞) | No | 4 < 5 |

---

### 2. Kth Smallest Element in a BST (Medium)
**Trigger:** Find the $K$th smallest element.
**Intuition:** The Golden Secret! An Inorder traversal of a BST is sorted. 
Iterative Inorder using a stack is perfect here. Traverse the tree. Every time you pop a node and "process" it, increment a counter. When the count equals $K$, you have found the target! Return it immediately to save time.

```cpp
int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* curr = root;
    int count = 0;
    
    while (curr != nullptr || !st.empty()) {
        while (curr != nullptr) {
            st.push(curr);
            curr = curr->left;
        }
        
        curr = st.top();
        st.pop();
        
        count++;
        if (count == k) return curr->val;
        
        curr = curr->right;
    }
    return -1;
}
```

**What's happening:**
```cpp
// BST:
//        3
//       / \
//      1   4
//       \
//        2
//
// Inorder traversal: 1, 2, 3, 4
//
// For k=2:
// Stack: []
// curr=3: push 3, go left
// Stack: [3]
// curr=1: push 1, go left (null)
// Stack: [3, 1]
// Pop 1: count=1, not k=2, go right (2)
// Stack: [3]
// curr=2: push 2, go left (null)
// Stack: [3, 2]
// Pop 2: count=2, is k=2! Return 2
```

**Dry Run Table:**

| Step | curr | Stack | Count | Action | Result |
|------|------|-------|-------|--------|--------|
| 1 | 3 | [] | 0 | Push 3, go left | - |
| 2 | 1 | [3] | 0 | Push 1, go left (null) | - |
| 3 | null | [3,1] | 0 | Pop 1, process | count=1 |
| 4 | 2 | [3] | 1 | Push 2, go left (null) | - |
| 5 | null | [3,2] | 1 | Pop 2, process | count=2, return 2 |

---

### 3. Lowest Common Ancestor of a BST (Medium)
**Trigger:** Find the lowest node that is an ancestor of both node `p` and node `q`.
**Intuition:** You don't need a complex recursive back-tracking algorithm. Use the BST property!
If both `p` and `q` are smaller than the current node, the LCA *must* be in the left subtree.
If both `p` and `q` are larger, the LCA *must* be in the right subtree.
The VERY FIRST node you hit where `p` and `q` split (one is smaller, one is larger), or where the node equals `p` or `q`, IS the Lowest Common Ancestor.

```cpp
TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    TreeNode* curr = root;
    
    while (curr != nullptr) {
        if (p->val < curr->val && q->val < curr->val) {
            curr = curr->left; // Both are smaller, go left
        } else if (p->val > curr->val && q->val > curr->val) {
            curr = curr->right; // Both are bigger, go right
        } else {
            // A split occurs, or we hit p/q exactly! We found the LCA.
            return curr;
        }
    }
    return nullptr;
}
// Time: O(H) where H is height, Space: O(1)
```

**What's happening:**
```cpp
// BST:
//        6
//       / \
//      2   8
//     / \ / \
//    0  4 7  9
//      / \
//     3   5
//
// LCA of 2 and 8:
//   curr=6: 2<6 and 8>6 → split! Return 6
//
// LCA of 2 and 4:
//   curr=6: 2<6 and 4<6 → go left
//   curr=2: 2==2 → return 2
//
// LCA of 3 and 5:
//   curr=6: 3<6 and 5<6 → go left
//   curr=2: 3>2 and 5>2 → go right
//   curr=4: 3<4 and 5>4 → split! Return 4
```

**Dry Run Table:**

| p | q | Step 1 (root=6) | Step 2 | Step 3 | LCA |
|---|---|-----------------|--------|--------|-----|
| 2 | 8 | split | - | - | 6 |
| 2 | 4 | go left | 2==2 | - | 2 |
| 3 | 5 | go left | go right | split at 4 | 4 |

---

### 4. Insert into a Binary Search Tree (Medium)
**Trigger:** Add a node while maintaining the BST property.
**Intuition:** Traverse the tree exactly like you are searching for the value. When you hit a `nullptr`, create the new node and return it to the parent.
*(See Chapter 1 for the exact code template).*

```cpp
TreeNode* insertIntoBST(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    
    if (val < root->val) {
        root->left = insertIntoBST(root->left, val);
    } else {
        root->right = insertIntoBST(root->right, val);
    }
    
    return root;
}
```

**What's happening:**
```cpp
// BST:
//        4
//       / \
//      2   7
//     / \
//    1   3
//
// Insert 5:
// 5 > 4 → go right
// 5 < 7 → go left
// 5 > 3 → go right
// nullptr → create node(5)
//
// Result:
//        4
//       / \
//      2   7
//     / \ /
//    1  3 5
```

**Dry Run Table:**

| Step | Current Node | Compare | Action |
|------|--------------|---------|--------|
| 1 | 4 | 5 > 4 | Go right |
| 2 | 7 | 5 < 7 | Go left |
| 3 | 3 | 5 > 3 | Go right (null) |
| 4 | null | - | Create node(5) |

---

### 5. Delete Node in a BST (Medium)
**Trigger:** Delete a node and re-arrange children.
**Intuition:** The hardest BST problem. Find the node. If it has 0 or 1 child, bypass it. If it has 2 children, find the minimum node in the right subtree (the successor), copy its value, and recursively delete the successor.
*(See Chapter 1 for the exact code template).*

```cpp
TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return nullptr;
    
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        // Found the node to delete
        
        // Case 1: Leaf node (0 children)
        if (root->left == nullptr && root->right == nullptr) {
            delete root;
            return nullptr;
        }
        
        // Case 2: One child
        if (root->left == nullptr) {
            TreeNode* temp = root->right;
            delete root;
            return temp;
        }
        if (root->right == nullptr) {
            TreeNode* temp = root->left;
            delete root;
            return temp;
        }
        
        // Case 3: Two children
        // Find inorder successor (smallest in right subtree)
        TreeNode* successor = root->right;
        while (successor->left != nullptr) {
            successor = successor->left;
        }
        
        // Copy successor's value
        root->val = successor->val;
        
        // Delete the successor
        root->right = deleteNode(root->right, successor->val);
    }
    
    return root;
}
```

**What's happening:**
```cpp
// BST:
//        5
//       / \
//      3   6
//     / \   \
//    2   4   7
//
// Delete 3 (two children):
// 1. Find inorder successor: 4 (smallest in right subtree)
// 2. Copy 4 to node 3's position
// 3. Delete original node 4
//
// After delete:
//        5
//       / \
//      4   6
//     /     \
//    2       7
//
// Delete 5 (two children):
// 1. Find inorder successor: 6 (smallest in right subtree)
// 2. Copy 6 to node 5's position
// 3. Delete original node 6
//
// After delete:
//        6
//       / \
//      4   7
//     /
//    2
```

**Dry Run Table:**

| Case | Children | Action | Result |
|------|----------|--------|--------|
| Leaf | 0 | Return null | Node removed |
| One child | 1 | Return child | Child replaces node |
| Two children | 2 | Find successor, copy, delete | Successor replaces node |

---

### 6. BST to Greater Sum Tree (Medium)
**Trigger:** Replace each node's value with the sum of all values greater than or equal to it.
**Intuition:** Reverse inorder traversal (Right → Node → Left). Keep a running sum. Visit right first (larger values), update sum, then process node.

```cpp
class Solution {
private:
    int sum = 0;
    
    void reverseInorder(TreeNode* node) {
        if (node == nullptr) return;
        
        reverseInorder(node->right);  // Visit larger values first
        
        sum += node->val;
        node->val = sum;
        
        reverseInorder(node->left);   // Then visit smaller values
    }
    
public:
    TreeNode* bstToGst(TreeNode* root) {
        reverseInorder(root);
        return root;
    }
};
```

**What's happening:**
```cpp
// BST:
//        4
//       / \
//      1   6
//     / \ / \
//    0  2 5  7
//       \
//        3
//
// Reverse inorder: 7, 6, 5, 4, 3, 2, 1, 0
//
// sum=0: visit 7, sum=7, node=7
// sum=7: visit 6, sum=13, node=13
// sum=13: visit 5, sum=18, node=18
// sum=18: visit 4, sum=22, node=22
// sum=22: visit 3, sum=25, node=25
// sum=25: visit 2, sum=27, node=27
// sum=27: visit 1, sum=28, node=28
// sum=28: visit 0, sum=28, node=28
//
// Result:
//        28
//       /  \
//     28   13
//    / \   / \
//   28 27 18  7
//      \
//       25
```

---

### 7. Construct BST from Preorder Traversal (Medium)
**Trigger:** Reconstruct BST from preorder array.
**Intuition:** Use bounds. First element is root. Elements smaller than root go left, larger go right. Use an index pointer to track position in preorder array.

```cpp
class Solution {
private:
    int index = 0;
    
    TreeNode* build(vector<int>& preorder, int min, int max) {
        if (index >= preorder.size()) return nullptr;
        
        int val = preorder[index];
        if (val < min || val > max) return nullptr;
        
        TreeNode* node = new TreeNode(val);
        index++;
        
        node->left = build(preorder, min, val);
        node->right = build(preorder, val, max);
        
        return node;
    }
    
public:
    TreeNode* bstFromPreorder(vector<int>& preorder) {
        return build(preorder, INT_MIN, INT_MAX);
    }
};
```

**What's happening:**
```cpp
// Preorder: [8,5,1,7,10,12]
//
// build(8, -∞, +∞)
//   Create node(8), index=1
//   build(5, -∞, 8) → 5<8 ✓
//     Create node(5), index=2
//     build(1, -∞, 5) → 1<5 ✓
//       Create node(1), index=3
//       build(7, -∞, 1) → 7>1 ✗, return null
//       build(7, 1, 5) → 7>5 ✗, return null
//     build(7, 5, 8) → 5<7<8 ✓
//       Create node(7), index=4
//       build(10, 5, 7) → 10>7 ✗, return null
//       build(10, 7, 8) → 10>8 ✗, return null
//   build(10, 8, +∞) → 10>8 ✓
//     Create node(10), index=5
//     build(12, 8, 10) → 12>10 ✓
//       Create node(12), index=6
//       build(∞, 10, 12) → done
//       build(∞, 12, ∞) → done
//     build(∞, 10, ∞) → done
//
// Result:
//        8
//       / \
//      5   10
//     / \    \
//    1   7    12
```

---

### Key Patterns Summary

| Pattern | When to Use | Key Insight |
|---------|-------------|-------------|
| DFS with bounds | Validate BST | Pass min/max constraints |
| Iterative inorder | Kth smallest | BST inorder = sorted |
| BST property | LCA | Split point is answer |
| Search + insert | Insert | Find nullptr, add node |
| 3-case delete | Delete | Leaf, one child, successor |
| Reverse inorder | Greater sum | Visit larger first |
| Bounds + index | Construct from preorder | Use min/max to decide |

### Quick Reference Table

| Problem | Time | Space | Key Technique |
|---------|------|-------|---------------|
| Validate BST | O(N) | O(H) | Pass min/max bounds |
| Kth Smallest | O(N) | O(H) | Iterative inorder |
| LCA | O(H) | O(1) | BST split property |
| Insert | O(H) | O(H) | Recursive search |
| Delete | O(H) | O(H) | 3-case handling |
| Greater Sum | O(N) | O(H) | Reverse inorder |
| Construct from Preorder | O(N) | O(H) | Bounds + index |

**When to Use BST:**
```
✓ Need sorted order
✓ Need fast lookup/insert/delete
✓ Need to find min/max quickly
✓ Need to find predecessor/successor
✓ Need range queries
```

**When NOT to Use BST:**
```
✗ Data arrives in sorted order (becomes linked list)
✗ Need guaranteed O(log N) (use AVL/Red-Black)
✗ Need to search by value only (use Hash Map)
✗ Need to find Kth element often (use Heap)
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Construct from Preorder.** Run Problem 7's `bstFromPreorder` on `[10, 5, 1, 7, 40, 50]`. Draw the resulting tree (call it **Tree P**). Which value is being examined when the first `build` call returns `nullptr` because of the bounds, and what are those bounds?

**Q2. Greater Sum Tree.** Run Problem 6's `bstToGst` on Tree P. Give the new value of every node, in the order the nodes are visited.

**Q3. Kth Smallest.** Run Problem 2's iterative `kthSmallest(root, 3)` on Tree P. What is returned, and what does the stack contain (bottom → top) at the moment it returns?

**Q4. Validate edge cases.** (a) What does Problem 1's `isValidBST` return for a root `5` whose left child is also `5`? Which comparison decides it? (b) Suppose someone "simplifies" the code to `isValid(root, INT_MIN, INT_MAX)` with `int` parameters. What does it return for a single-node tree whose value is `2147483647`, and why is that wrong?

**Q5. LCA.** Using Problem 3's tree (`6, 2, 8, 0, 4, 7, 9, 3, 5`), what does `lowestCommonAncestor` return for `(0, 5)`, `(7, 9)`, and `(3, 4)`? For each, list the nodes `curr` visits.

### Coding Exercises

**E1 (Easy).** Return the minimum difference between the values of any two nodes in a BST. Hint: in sorted order, the closest pair is always adjacent.

```cpp
int minDiffInBST(TreeNode* root);
// Tree P (inorder 1,5,7,10,40,50)  -> 2   (7 - 5)
// [4, 2, 6, 1, 3]                  -> 1
```

**E2 (Easy–Medium).** Trim a BST so that every remaining value lies in `[low, high]`, keeping the relative structure of the survivors. Return the new root.

```cpp
TreeNode* trimBST(TreeNode* root, int low, int high);
// Tree P, [5, 40]  -> preorder [10, 5, 7, 40]
// [1, 0, 2], [1, 2] -> preorder [1, 2]   (1 with right child 2)
```

**E3 (Medium).** Two Sum in a BST: return `true` if two *different* nodes sum to `k`. Use the Golden Secret plus the two-pointer technique.

```cpp
bool findTarget(TreeNode* root, int k);
// Tree P, k = 17 -> true   (7 + 10)
// Tree P, k = 46 -> false
```

#### Dry-Run: Answers

**Q1.** Tree P:

```text
        10
       /  \
      5    40
     / \     \
    1   7     50
```

The first bounds rejection happens inside node 1's left call: `build` looks at **`7` with bounds `(INT_MIN, 1)`** — 7 > 1, so it returns `nullptr` without advancing `index`.

| Call (value examined, min, max) | Outcome | index after |
|---------------------------------|---------|-------------|
| (10, INT_MIN, INT_MAX) | create 10 | 1 |
| (5, INT_MIN, 10) | create 5 | 2 |
| (1, INT_MIN, 5) | create 1 | 3 |
| (7, INT_MIN, 1) | 7 > 1 → null | 3 |
| (7, 1, 5) | 7 > 5 → null | 3 |
| (7, 5, 10) | create 7 (right of 5) | 4 |
| (40, 5, 7), (40, 7, 10) | null, null | 4 |
| (40, 10, INT_MAX) | create 40 (right of 10) | 5 |
| (50, 10, 40) | 50 > 40 → null (40 has no left) | 5 |
| (50, 40, INT_MAX) | create 50 | 6 |

**Q2.** Reverse inorder visits `50, 40, 10, 7, 5, 1`.

| Visit | sum before | sum after = new value |
|-------|------------|-----------------------|
| 50 | 0 | 50 |
| 40 | 50 | 90 |
| 10 | 90 | 100 |
| 7 | 100 | 107 |
| 5 | 107 | 112 |
| 1 | 112 | 113 |

```text
        100
       /   \
     112    90
     /  \     \
   113  107    50
```

**Q3.** Returns **7**; stack at return is **`[10]`**.

| Step | Action | Stack | count |
|------|--------|-------|-------|
| 1 | Push 10, 5, 1 going left | [10,5,1] | 0 |
| 2 | Pop 1, curr = null | [10,5] | 1 |
| 3 | Pop 5, curr = 7 | [10] | 2 |
| 4 | Push 7 | [10,7] | 2 |
| 5 | Pop 7 → count == 3, return 7 | [10] | 3 |

**Q4.** (a) **`false`**. The left 5 is checked with bounds `(LONG_MIN, 5)`; `root->val >= maxVal` is `5 >= 5`, so it fails. Strict inequalities mean duplicates are rejected, matching "strictly less / strictly greater". (b) It returns **`false`**: `2147483647 >= INT_MAX` is true, so a perfectly valid one-node tree is rejected. That is exactly why the chapter widens the bounds to `long long` with `LONG_MIN` / `LONG_MAX`.

**Q5.**
- `(0, 5)` → **2**. Visits 6 (both < 6, go left), 2 (0 < 2 < 5, split).
- `(7, 9)` → **8**. Visits 6 (both > 6, go right), 8 (7 < 8 < 9, split).
- `(3, 4)` → **4**. Visits 6 (left), 2 (both > 2, right), 4 (3 < 4 but 4 is not > 4, so neither "both" branch fires; return 4). A node can be its own ancestor.

**E1 — reference solution**

```cpp
class Solution {
    int prev = -1;              // value of previously visited node (-1 = none yet)
    int best = INT_MAX;
    void inorder(TreeNode* node) {
        if (node == nullptr) return;
        inorder(node->left);
        if (prev != -1) best = min(best, node->val - prev);
        prev = node->val;
        inorder(node->right);
    }
public:
    int minDiffInBST(TreeNode* root) {
        inorder(root);
        return best;
    }
};
```

Inorder is sorted, so only adjacent pairs need checking (this sentinel assumes non-negative values, as in the LeetCode version). Time $O(N)$, space $O(H)$.

**E2 — reference solution**

```cpp
TreeNode* trimBST(TreeNode* root, int low, int high) {
    if (root == nullptr) return nullptr;
    if (root->val < low)  return trimBST(root->right, low, high); // root and its left side too small
    if (root->val > high) return trimBST(root->left, low, high);  // root and its right side too big
    root->left  = trimBST(root->left, low, high);
    root->right = trimBST(root->right, low, high);
    return root;
}
```

Same "return the replacement to the parent" style as `deleteNode`. On Tree P with `[5, 40]`: 10 stays; 5 stays and its left 1 is trimmed; 40 stays and its right 50 is trimmed. Time $O(N)$, space $O(H)$.

**E3 — reference solution**

```cpp
void inorder(TreeNode* node, vector<int>& vals) {
    if (node == nullptr) return;
    inorder(node->left, vals);
    vals.push_back(node->val);
    inorder(node->right, vals);
}

bool findTarget(TreeNode* root, int k) {
    vector<int> vals;
    inorder(root, vals);                        // sorted
    int lo = 0, hi = (int)vals.size() - 1;
    while (lo < hi) {                           // lo < hi => two different nodes
        int s = vals[lo] + vals[hi];
        if (s == k) return true;
        if (s < k) lo++; else hi--;
    }
    return false;
}
```

For `k = 17` on `[1,5,7,10,40,50]`: 51 → hi--, 41 → hi--, 11 → lo++, 15 → lo++, 17 → true. Time $O(N)$, space $O(N)$ (two stack-based iterators would bring it to $O(H)$).

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems bst** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

