# Part 10, Topic 2: Binary Search Trees (BST)
## Chapter 1: BST Properties & Operations

A Binary Search Tree is a regular Binary Tree with one massive constraint that makes it incredibly powerful for searching data.

### 1. The BST Property
For EVERY node in the tree:
1. ALL nodes in its **left** subtree must have a value strictly **less** than the node's value.
2. ALL nodes in its **right** subtree must have a value strictly **greater** than the node's value.
*(Note: standard BSTs do not allow duplicate values, though some variations do).*

Because of this property, if you want to find a number, you don't have to search the whole tree. If the target is smaller than the current node, you completely ignore the right half of the tree. This gives BSTs a Search, Insert, and Delete time complexity of **$O(\log N)$ average**.

```cpp
// BST Property Visualization:
//        8
//       / \
//      3   10
//     / \    \
//    1   6    14
//       / \   /
//      4   7 13
//
// For node 8:
//   Left subtree: {1, 3, 4, 6, 7} - all < 8 ✓
//   Right subtree: {10, 13, 14} - all > 8 ✓
//
// For node 3:
//   Left subtree: {1} - all < 3 ✓
//   Right subtree: {4, 6, 7} - all > 3 ✓
```

**What's happening:**
```cpp
// The BST property is a RECURSIVE constraint:
// It must hold for EVERY node, not just the root.
//
// This is why we can use binary search:
// - If target < current → go left (right subtree has only larger values)
// - If target > current → go right (left subtree has only smaller values)
// - If target == current → found!
```

### 2. Searching a BST

Searching is essentially a Binary Search, but using tree pointers instead of array indices.

```cpp
TreeNode* searchBST(TreeNode* root, int val) {
    if (root == nullptr) return nullptr;
    
    if (val == root->val) {
        return root;
    } else if (val < root->val) {
        return searchBST(root->left, val);
    } else {
        return searchBST(root->right, val);
    }
}
// Iterative is even simpler:
// while (root != nullptr && root->val != val) {
//     root = val < root->val ? root->left : root->right;
// }
// return root;
```

**What's happening:**
```cpp
// BST:
//        8
//       / \
//      3   10
//     / \    \
//    1   6    14
//
// Search for 6:
//   8: 6 < 8 → go left
//   3: 6 > 3 → go right
//   6: 6 == 6 → found!
//
// Search for 5:
//   8: 5 < 8 → go left
//   3: 5 > 3 → go right
//   6: 5 < 6 → go left
//   null → not found
//
// Each step eliminates half the remaining nodes!
```

**Dry Run Table (Search):**

| Step | Node | Target | Action | Result |
|------|------|--------|--------|--------|
| 1 | 8 | 6 | 6 < 8, go left | Continue |
| 2 | 3 | 6 | 6 > 3, go right | Continue |
| 3 | 6 | 6 | 6 == 6 | Found! |

### 3. Inserting into a BST

To insert a node, you search for it until you hit a `nullptr` (an empty spot). That's where the new node belongs!

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
//        8
//       / \
//      3   10
//     / \    \
//    1   6    14
//
// Insert 7:
//   8: 7 < 8 → go left
//   3: 7 > 3 → go right
//   6: 7 > 6 → go right
//   null → create node(7)
//
// After insert:
//        8
//       / \
//      3   10
//     / \    \
//    1   6    14
//         \
//          7
```

**Dry Run Table (Insert):**

| Step | Node | Value | Action | Result |
|------|------|-------|--------|--------|
| 1 | 8 | 7 | 7 < 8, go left | Continue |
| 2 | 3 | 7 | 7 > 3, go right | Continue |
| 3 | 6 | 7 | 7 > 6, go right (null) | Create node(7) |

### 4. Deleting from a BST (The Tricky Part)

Deleting is the hardest operation because you must maintain the BST property.
There are three scenarios when you find the node to delete:

1. **Leaf Node:** Easy. Just return `nullptr`.
2. **Node with 1 Child:** Easy. Return the child to bypass the deleted node.
3. **Node with 2 Children:** Hard. You cannot just delete the node, because what happens to its two children? 
   *Solution:* Find the **Inorder Successor** (the smallest node in the right subtree). Copy its value to the current node, and then recursively delete the successor from the right subtree!

```cpp
TreeNode* findMin(TreeNode* node) {
    while (node->left != nullptr) node = node->left;
    return node;
}

TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return nullptr;
    
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        // We found the node to delete!
        
        // Scenario 1 & 2: 0 or 1 child
        if (root->left == nullptr) return root->right;
        if (root->right == nullptr) return root->left;
        
        // Scenario 3: 2 children
        // Find the min node in the right subtree
        TreeNode* successor = findMin(root->right);
        // Copy its value
        root->val = successor->val;
        // Delete the original successor node
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
//      3   7
//     / \ / \
//    2  4 6  8
//
// Delete 3 (has 2 children):
// 1. Find inorder successor: 4 (smallest in right subtree)
// 2. Copy 4 to node 3's position
// 3. Delete original node 4
//
// After delete:
//        5
//       / \
//      4   7
//     /   / \
//    2   6   8
//
// Delete 5 (has 2 children):
// 1. Find inorder successor: 6 (smallest in right subtree)
// 2. Copy 6 to node 5's position
// 3. Delete original node 6
//
// After delete:
//        6
//       / \
//      4   7
//     /     \
//    2       8
```

**Dry Run Table (Delete):**

| Case | Children | Action | Result |
|------|----------|--------|--------|
| Leaf | 0 | Return nullptr | Node removed |
| One child | 1 | Return child | Child replaces node |
| Two children | 2 | Find successor, copy, delete | Successor replaces node |

### 5. The Golden Secret: Inorder Traversal

If you ever get stuck on a BST problem, remember this one fact:
**An Inorder Traversal (Left -> Node -> Right) of a valid BST will ALWAYS yield a strictly increasing, sorted array.**

Many "Hard" BST problems become "Easy" array problems if you just do an Inorder traversal, push the values into a `vector`, and run a simple array algorithm on it. (Though doing it without the vector is better for Space Complexity).

```cpp
// BST:
//        8
//       / \
//      3   10
//     / \    \
//    1   6    14
//       / \   /
//      4   7 13
//
// Inorder traversal: 1, 3, 4, 6, 7, 8, 10, 13, 14
//
// This is SORTED! This is the "Golden Secret" of BSTs.
```

**What's happening:**
```cpp
// Why does inorder give sorted order?
// Because for any node:
// - All left subtree values are smaller (visit first)
// - Node value (visit middle)
// - All right subtree values are larger (visit last)
//
// This is exactly the definition of sorted order!
```

### 6. The Danger: Unbalanced Trees

If you insert `[1, 2, 3, 4, 5]` into a fresh BST, every node goes to the right child. Your tree is no longer a tree; it's just a Linked List! The $O(\log N)$ search time degrades to $O(N)$ worst case.

```cpp
// Insert 1, 2, 3, 4, 5 in order:
//
// After 1:     1
//
// After 2:     1
//               \
//                2
//
// After 3:     1
//               \
//                2
//                 \
//                  3
//
// After 4:     1
//               \
//                2
//                 \
//                  3
//                   \
//                    4
//
// After 5:     1
//               \
//                2
//                 \
//                  3
//                   \
//                    4
//                     \
//                      5
//
// This is a skewed tree! Height = N, not log N.
// Search for 5 takes O(N) steps.
```

**What's happening:**
```cpp
// The worst case happens when data is already sorted.
// The best case happens when data is randomly ordered.
//
// Solution: Self-balancing BSTs
// - AVL Trees: Strictly balanced (height difference ≤ 1)
// - Red-Black Trees: Approximately balanced (used in C++ std::map/set)
//
// These automatically rotate during insert/delete
// to maintain O(log N) height.
```

### 7. Balanced BSTs: AVL and Red-Black Trees

**Balanced BSTs** (like AVL trees or Red-Black trees) automatically rotate themselves during insertion to ensure the height always stays $O(\log N)$ (at most about $1.44\log_2 N$ for AVL and $2\log_2(N+1)$ for Red-Black). You will rarely be asked to code an AVL rotation on a whiteboard, but you must know that `std::map` and `std::set` in C++ use Red-Black trees to guarantee $O(\log N)$ worst-case performance.

```cpp
// AVL Tree rotations:
//
// Left-Left Case (Right Rotate):
//      30           20
//     /            /  \
//    20     →    10    30
//   /
//  10
//
// Right-Right Case (Left Rotate):
//    10              20
//      \            /  \
//       20    →   10    30
//        \
//         30
//
// Left-Right Case (Left-Right Rotate):
//      30         30           25
//     /          /            /  \
//    20    →   25     →    20    30
//      \        /
//       25    20
//
// Right-Left Case (Right-Left Rotate):
//    10            10           15
//      \            \         /  \
//       20     →    15   →  10    20
//      /              \
//     15               20
```

### 8. BST vs Hash Map

| Feature | BST | Hash Map |
|---------|-----|----------|
| Search | O(log N) | O(1) average |
| Insert | O(log N) | O(1) average |
| Delete | O(log N) | O(1) average |
| Sorted order | Yes | No |
| Range queries | Yes | No |
| Find min/max | O(log N) | O(N) |
| Find predecessor | O(log N) | O(N) |
| Memory | O(N) | O(N) |

**When to Use BST:**
```
✓ Need sorted order
✓ Need range queries (find all elements in [a, b])
✓ Need to find min/max frequently
✓ Need to find predecessor/successor
✓ Need ordered iteration
```

**When to Use Hash Map:**
```
✓ Need O(1) lookup by value
✓ Don't need sorted order
✓ Don't need range queries
✓ Need fast insert/delete
```

### 9. Common BST Problems Pattern

```cpp
// Pattern 1: Validate BST
// Pass min/max bounds down
bool validate(TreeNode* node, long min, long max) {
    if (!node) return true;
    if (node->val <= min || node->val >= max) return false;
    return validate(node->left, min, node->val) && 
           validate(node->right, node->val, max);
}

// Pattern 2: Kth smallest (inorder traversal)
int kthSmallest(TreeNode* root, int& k) {
    if (!root) return -1;
    int left = kthSmallest(root->left, k);
    if (left != -1) return left;
    if (--k == 0) return root->val;
    return kthSmallest(root->right, k);
}

// Pattern 3: LCA in BST
TreeNode* lcaBST(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (p->val < root->val && q->val < root->val)
        return lcaBST(root->left, p, q);
    if (p->val > root->val && q->val > root->val)
        return lcaBST(root->right, p, q);
    return root;
}
```

### Quick Reference Table

| Operation | Average | Worst | Best Data |
|-----------|---------|-------|-----------|
| Search | O(log N) | O(N) | Balanced BST |
| Insert | O(log N) | O(N) | Balanced BST |
| Delete | O(log N) | O(N) | Balanced BST |
| Find min/max | O(log N) | O(N) | Balanced BST |
| Inorder traversal | O(N) | O(N) | Any BST |
| Validate BST | O(N) | O(N) | - |

**Key Takeaways:**
1. BST property: left < node < right (for all nodes)
2. Search/Insert/Delete: O(log N) average, O(N) worst
3. Inorder traversal = sorted array (Golden Secret!)
4. Skewed trees degrade to O(N) - use balanced BSTs
5. C++ std::map/set use Red-Black trees for O(log N) guarantee
6. When stuck, try inorder traversal first

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: BST Properties & Operations**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 bst fundamentals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

