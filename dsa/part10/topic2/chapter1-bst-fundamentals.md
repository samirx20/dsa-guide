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

**Balanced BSTs** (like AVL trees or Red-Black trees) automatically rotate themselves during insertion to ensure the height never exceeds $\log N$. You will rarely be asked to code an AVL rotation on a whiteboard, but you must know that `std::map` and `std::set` in C++ use Red-Black trees to guarantee $O(\log N)$ worst-case performance.

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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Build by insertion.** Starting from an empty tree, call the chapter's `insertIntoBST` with `50, 30, 70, 20, 40, 60, 80, 35, 45` in that order. Draw the result (call it **Tree S**). How many existing nodes does the insertion of `45` compare against before it finds its `nullptr` spot, and what is the height of Tree S (in nodes)?

**Q2. Search miss.** Run `searchBST(root, 42)` on Tree S. List every node visited and say what is returned.

**Q3. Delete with two children, twice.** On Tree S, call `deleteNode(root, 30)`, then on the resulting tree call `deleteNode(root, 50)`. For each call, name the inorder successor that is copied up, and draw the final tree.

**Q4. Validate.** Run the chapter's `validate(root, LONG_MIN, LONG_MAX)` on the tree below. Every parent/child pair looks correct locally. Is it a valid BST? If not, which node fails and what `(min, max)` bounds is it checked against?

```text
      10
     /  \
    5    15
        /  \
       6    20
```

**Q5. Order statistics and LCA.** On Tree S: (a) what does the chapter's `kthSmallest(root, k)` return for `k = 4`, and in which node does `--k` hit 0? (b) What does `lcaBST` return for the pairs `(35, 45)`, `(20, 45)`, and `(45, 60)`?

### Coding Exercises

**E1 (Easy).** Sum all values in `[low, high]`. Use the BST property to skip whole subtrees that cannot contain answers.

```cpp
int rangeSumBST(TreeNode* root, int low, int high);
// Tree S, [35, 60]                 -> 230  (35 + 40 + 45 + 50 + 60)
// Chapter tree (8,3,10,...), [4,10] -> 35   (4 + 6 + 7 + 8 + 10)
```

**E2 (Easy–Medium).** The chapter showed that inserting sorted data gives a skewed tree. Build a **height-balanced** BST from a sorted array instead (use `mid = lo + (hi - lo) / 2`).

```cpp
TreeNode* sortedArrayToBST(vector<int>& nums);
// [1, 2, 3, 4, 5]       -> preorder [3, 1, 2, 4, 5], height 3 (not 5!)
// [-10, -3, 0, 5, 9]    -> preorder [0, -10, -3, 5, 9]
```

**E3 (Medium).** Find the inorder successor of node `p` (the smallest value greater than `p->val`) in $O(H)$ time and $O(1)$ extra space, with no parent pointers and without building the inorder array.

```cpp
TreeNode* inorderSuccessor(TreeNode* root, TreeNode* p);
// Tree S, p = 45 -> 50
// Tree S, p = 30 -> 35
// Tree S, p = 80 -> nullptr
```

#### Dry-Run: Answers

**Q1.** Tree S:

```text
          50
        /    \
      30      70
     /  \    /  \
    20  40  60  80
        / \
       35  45
```

Inserting `45` compares against **3** nodes: 50 (45 < 50, go left), 30 (45 > 30, go right), 40 (45 > 40, go right → `nullptr`, create). Height is **4** nodes (`50 → 30 → 40 → 35`). Inorder is `20 30 35 40 45 50 60 70 80`.

**Q2.** Visits **50 → 30 → 40 → 45**, then returns **`nullptr`**.

| Step | Node | Compare | Move |
|------|------|---------|------|
| 1 | 50 | 42 < 50 | left |
| 2 | 30 | 42 > 30 | right |
| 3 | 40 | 42 > 40 | right |
| 4 | 45 | 42 < 45 | left → `nullptr`, not found |

**Q3.**
- `deleteNode(root, 30)`: 30 has two children. Successor = `findMin(40-subtree)` = **35**. Copy 35 into the node, then delete the original 35 from the right subtree (it is a leaf → returns `nullptr`).
- `deleteNode(root, 50)`: 50 has two children. Successor = `findMin(70-subtree)` = **60**. Copy 60 into the root, then delete leaf 60 from the right subtree.

```text
After deleting 30:          After deleting 50:
          50                        60
        /    \                    /    \
      35      70                35      70
     /  \    /  \              /  \       \
    20  40  60  80            20  40       80
          \                         \
          45                        45
```

**Q4.** **Not valid.** Node `6` fails.

| Node | Bounds checked | Result |
|------|----------------|--------|
| 10 | (LONG_MIN, LONG_MAX) | ok |
| 5 | (LONG_MIN, 10) | ok |
| 15 | (10, LONG_MAX) | ok |
| 6 | **(10, 15)** | 6 ≤ 10 → **false** |

6 is a correct left child of 15, but it sits in 10's right subtree, so it must be greater than 10. Bounds passed down catch this; a parent/child-only check does not. (The parameters are `long` so that a node holding `INT_MIN` or `INT_MAX` is not wrongly rejected by the initial bounds.)

**Q5.** (a) Returns **40**. The inorder visit order is 20, 30, 35, 40, …; `--k` takes `k` from 4 → 3 (at 20) → 2 (at 30) → 1 (at 35) → **0 at node 40**, which is returned and passed straight up via `if (left != -1) return left;`.

(b)
- `(35, 45)` → **40** (at 50 both go left, at 30 both go right, at 40 they split).
- `(20, 45)` → **30** (at 50 both left; at 30, 20 < 30 < 45 → split).
- `(45, 60)` → **50** (split immediately at the root).

**E1 — reference solution**

```cpp
int rangeSumBST(TreeNode* root, int low, int high) {
    if (root == nullptr) return 0;
    if (root->val < low)  return rangeSumBST(root->right, low, high); // whole left side too small
    if (root->val > high) return rangeSumBST(root->left, low, high);  // whole right side too big
    return root->val
         + rangeSumBST(root->left, low, high)
         + rangeSumBST(root->right, low, high);
}
```

Prunes subtrees exactly like `searchBST`. Time $O(H + K)$ where $K$ is the number of nodes in range (worst case $O(N)$), space $O(H)$.

**E2 — reference solution**

```cpp
TreeNode* build(vector<int>& nums, int lo, int hi) {
    if (lo > hi) return nullptr;
    int mid = lo + (hi - lo) / 2;
    TreeNode* node = new TreeNode(nums[mid]);   // middle value becomes the root
    node->left  = build(nums, lo, mid - 1);
    node->right = build(nums, mid + 1, hi);
    return node;
}

TreeNode* sortedArrayToBST(vector<int>& nums) {
    return build(nums, 0, (int)nums.size() - 1);
}
```

Each root splits the remaining values in half, so the height is $\lceil \log_2(N+1) \rceil$; the inorder is still the sorted input. Time $O(N)$, space $O(\log N)$ recursion.

**E3 — reference solution**

```cpp
TreeNode* inorderSuccessor(TreeNode* root, TreeNode* p) {
    TreeNode* succ = nullptr;
    while (root != nullptr) {
        if (p->val < root->val) {
            succ = root;          // root is a candidate; try to find a smaller one
            root = root->left;
        } else {
            root = root->right;   // root <= p, the successor must be to the right
        }
    }
    return succ;
}
```

Trace for `p = 30`: at 50 → `succ = 50`, go left; at 30 → not smaller, go right; at 40 → `succ = 40`, go left; at 35 → `succ = 35`, go left → `nullptr`. Returns 35. Time $O(H)$, space $O(1)$.

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

