# Part 10, Topic 1: Binary Trees & Traversals
## Interview Problems Walkthrough

Tree problems test your ability to confidently pass state down a recursive tree, and bubble answers back up.

---

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|------------|---------|-------------|
| Invert Binary Tree | Easy | Postorder | Swap children recursively |
| Maximum Depth | Easy | DFS/BFS | 1 + max(left, right) |
| Same Tree | Easy | DFS | Compare both trees simultaneously |
| Symmetric Tree | Easy | DFS | Mirror comparison |
| Path Sum | Easy | DFS | Subtract target as you go |
| Level Order | Medium | BFS | Queue with level tracking |
| Count Good Nodes | Medium | DFS | Pass max-so-far down |
| Max Path Sum | Hard | Postorder | Global max vs return value |
| Serialize/Deserialize | Hard | Preorder | Use marker for null nodes |

---

### Solution Approach Comparison

| Problem | Recursive | Iterative | Time | Space |
|---------|-----------|-----------|------|-------|
| Invert Binary Tree | Yes | Stack | O(N) | O(H) |
| Maximum Depth | Yes | BFS | O(N) | O(H) or O(W) |
| Same Tree | Yes | Two stacks | O(N) | O(H) |
| Symmetric Tree | Yes | Two queues | O(N) | O(H) |
| Path Sum | Yes | BFS | O(N) | O(H) |
| Level Order | No | BFS queue | O(N) | O(W) |
| Count Good Nodes | Yes | Stack | O(N) | O(H) |
| Max Path Sum | Yes | N/A | O(N) | O(H) |
| Serialize/Deserialize | Yes | Queue | O(N) | O(N) |

---

### 1. Invert Binary Tree (Easy)
**Trigger:** Swap every left and right child.
**Intuition:** Postorder traversal. Recurse down to the bottom. On the way back up, simply `swap(root->left, root->right)`. Return the `root`.

```cpp
TreeNode* invertTree(TreeNode* root) {
    if (root == nullptr) return nullptr;
    
    // Recurse down
    TreeNode* leftChild = invertTree(root->left);
    TreeNode* rightChild = invertTree(root->right);
    
    // Swap
    root->left = rightChild;
    root->right = leftChild;
    
    return root;
}
```

**What's happening:**
```cpp
// Original tree:
//        4
//       / \
//      2   7
//     / \ / \
//    1  3 6  9
//
// After invert:
//        4
//       / \
//      7   2
//     / \ / \
//    9  6 3  1
//
// We swap at every node:
// At 4: swap(2,7) → 4's left=7, right=2
// At 7: swap(6,9) → 7's left=9, right=6
// At 2: swap(1,3) → 2's left=3, right=1
```

**Dry Run Table:**

| Step | Node | Action | Tree State After |
|------|------|--------|------------------|
| 1 | 1 | No children, return | unchanged |
| 2 | 3 | No children, return | unchanged |
| 3 | 2 | Swap children | 2's left=3, right=1 |
| 4 | 6 | No children, return | unchanged |
| 5 | 9 | No children, return | unchanged |
| 6 | 7 | Swap children | 7's left=9, right=6 |
| 7 | 4 | Swap children | 4's left=7, right=2 |

---

### 2. Maximum Depth of Binary Tree (Easy)
**Trigger:** Find the height/depth.
**Intuition:** The depth of a tree is `1` (the root itself) plus the maximum depth of its two subtrees.

```cpp
int maxDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    return 1 + max(maxDepth(root->left), maxDepth(root->right));
}
```

**What's happening:**
```cpp
// Tree:
//        3
//       / \
//      9  20
//        /  \
//       15   7
//
// maxDepth(3)
//   = 1 + max(maxDepth(9), maxDepth(20))
//   = 1 + max(1, maxDepth(20))
//
// maxDepth(9)
//   = 1 + max(0, 0) = 1
//
// maxDepth(20)
//   = 1 + max(maxDepth(15), maxDepth(7))
//   = 1 + max(1, 1) = 2
//
// maxDepth(3) = 1 + max(1, 2) = 3
```

**Dry Run Table:**

| Call | Node | Left Depth | Right Depth | Return |
|------|------|------------|-------------|--------|
| 1 | 3 | ? | ? | ? |
| 2 | 9 | 0 | 0 | 1 |
| 3 | 20 | ? | ? | ? |
| 4 | 15 | 0 | 0 | 1 |
| 5 | 7 | 0 | 0 | 1 |
| 6 | 20 | 1 | 1 | 2 |
| 7 | 3 | 1 | 2 | 3 |

---

### 3. Same Tree (Easy)
**Trigger:** Check if two trees are identical.
**Intuition:** Recursive DFS on both trees simultaneously.
- If both are null, return `true`.
- If one is null and the other isn't, return `false`.
- If their values don't match, return `false`.
- Return `isSameTree(left1, left2) && isSameTree(right1, right2)`.

```cpp
bool isSameTree(TreeNode* p, TreeNode* q) {
    if (p == nullptr && q == nullptr) return true;
    if (p == nullptr || q == nullptr) return false;
    if (p->val != q->val) return false;
    
    return isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
}
```

**What's happening:**
```cpp
// Tree 1:      Tree 2:
//    1            1
//   / \          / \
//  2   3        2   3
//
// Compare 1==1 ✓
//   Compare 2==2 ✓
//     Compare null==null ✓
//     Compare null==null ✓
//   Compare 3==3 ✓
//     Compare null==null ✓
//     Compare null==null ✓
// All match → return true
```

---

### 4. Symmetric Tree (Easy)
**Trigger:** Is the tree a mirror of itself?
**Intuition:** Write a helper function `isMirror(Node* t1, Node* t2)`. It's exactly like *Same Tree*, but you compare the *outside* edges together and the *inside* edges together:
`return isMirror(t1->left, t2->right) && isMirror(t1->right, t2->left);`

```cpp
bool isSymmetric(TreeNode* root) {
    if (root == nullptr) return true;
    return isMirror(root->left, root->right);
}

bool isMirror(TreeNode* t1, TreeNode* t2) {
    if (t1 == nullptr && t2 == nullptr) return true;
    if (t1 == nullptr || t2 == nullptr) return false;
    if (t1->val != t2->val) return false;
    
    return isMirror(t1->left, t2->right) && isMirror(t1->right, t2->left);
}
```

**What's happening:**
```cpp
// Symmetric tree:
//        1
//       / \
//      2   2
//     / \ / \
//    3  4 4  3
//
// isMirror(2, 2)
//   isMirror(3, 3) ✓ (left of left vs right of right)
//   isMirror(4, 4) ✓ (right of left vs left of right)
//
// Mirror comparison:
//   t1->left (3) vs t2->right (3) ✓
//   t1->right (4) vs t2->left (4) ✓
```

---

### 5. Path Sum (Easy)
**Trigger:** Is there a root-to-leaf path that adds up to a `targetSum`?
**Intuition:** Subtract the current node's value from the `targetSum` as you move down. If you hit a LEAF node (`left == null && right == null`), check if `targetSum == 0`.
Return `hasPathSum(left, targetSum - root->val) || hasPathSum(right, targetSum - root->val)`.

```cpp
bool hasPathSum(TreeNode* root, int targetSum) {
    if (root == nullptr) return false;
    
    // Check if this is a leaf node
    if (root->left == nullptr && root->right == nullptr) {
        return targetSum - root->val == 0;
    }
    
    // Recurse with reduced target
    int remaining = targetSum - root->val;
    return hasPathSum(root->left, remaining) || 
           hasPathSum(root->right, remaining);
}
```

**What's happening:**
```cpp
// Tree:
//        5
//       / \
//      4   8
//     /   / \
//    11  13  4
//   / \      \
//  7   2      1
//
// Target sum: 22
//
// Path: 5 → 4 → 11 → 2 = 22 ✓
//
// hasPathSum(5, 22)
//   hasPathSum(4, 17)
//     hasPathSum(11, 13)
//       hasPathSum(7, 2) → false (leaf, 2-7=-5≠0)
//       hasPathSum(2, 2) → true (leaf, 2-2=0) ✓
//     → true (|| short-circuits: 4's null right child is never checked)
//   → true
//   hasPathSum(8, 17) is NEVER called (|| short-circuits)
//     (it would explore 13 → 9-13≠0, and 4 → 1 → 5-1≠0)
```

---

### 6. Binary Tree Level Order Traversal (Medium)
**Trigger:** Return an array of arrays representing the levels.
**Intuition:** This is the standard BFS Queue Template.
*(See Chapter 2 for the golden code template).*

---

### 7. Count Good Nodes in Binary Tree (Medium)
**Trigger:** A node is "good" if in the path from root to node, there are no nodes with a greater value.
**Intuition:** You must pass STATE DOWN the tree. Write a recursive helper function `dfs(root, maxSoFar)`. 
If `root->val >= maxSoFar`, the node is good (count = 1). Update `maxSoFar = max(maxSoFar, root->val)`.
Return `count + dfs(left, maxSoFar) + dfs(right, maxSoFar)`.

```cpp
class Solution {
private:
    int count = 0;
    
    void dfs(TreeNode* node, int maxSoFar) {
        if (node == nullptr) return;
        
        if (node->val >= maxSoFar) {
            count++;
            maxSoFar = node->val;
        }
        
        dfs(node->left, maxSoFar);
        dfs(node->right, maxSoFar);
    }
    
public:
    int goodNodes(TreeNode* root) {
        dfs(root, INT_MIN);
        return count;
    }
};
```

**What's happening:**
```cpp
// Tree:
//        3
//       / \
//      1   4
//     /   / \
//    3   1   5
//
// Good nodes (no greater value on path from root):
// 3: path=[3], max=3 → good ✓
// 1: path=[3,1], max=3 → not good (1<3)
// 3: path=[3,1,3], max=3 → good ✓ (3>=3, ties count)
// 4: path=[3,4], max=4 → good ✓
// 1: path=[3,4,1], max=4 → not good (1<4)
// 5: path=[3,4,5], max=5 → good ✓
//
// Count = 4 (root 3, bottom-left 3, 4, 5)
```

**Dry Run Table:**

| Node | Path from Root | maxSoFar | Good? | Count |
|------|----------------|----------|-------|-------|
| 3 | [3] | -∞ | Yes | 1 |
| 1 | [3,1] | 3 | No | 1 |
| 3 | [3,1,3] | 3 | Yes | 2 |
| 4 | [3,4] | 3 | Yes | 3 |
| 1 | [3,4,1] | 4 | No | 3 |
| 5 | [3,4,5] | 4 | Yes | 4 |

---

### 8. Binary Tree Maximum Path Sum (Hard)
**Trigger:** Find the maximum path sum between ANY two nodes (doesn't need to pass through the root).
**Intuition:** This is a tricky Postorder traversal.
For any given node, a path could go *through* it (Left + Node + Right). This might be the global maximum!
However, a node can only return ONE straight path back up to its parent (Node + max(Left, Right)).
You must calculate the global max using the "split" path, but return the "straight" path.
*(Note: If a child returns a negative sum, ignore it and treat it as 0!)*

```cpp
int globalMax = INT_MIN;

int dfs(TreeNode* node) {
    if (node == nullptr) return 0;
    
    // Get max straight paths from children. Ignore negative paths (max with 0)
    int leftMax = max(dfs(node->left), 0);
    int rightMax = max(dfs(node->right), 0);
    
    // Check if the path curving THROUGH this node is the new global best
    globalMax = max(globalMax, node->val + leftMax + rightMax);
    
    // Return the best straight path to the parent
    return node->val + max(leftMax, rightMax);
}
```

**What's happening:**
```cpp
// Tree:
//       -10
//       /  \
//      9    20
//          /  \
//         15   7
//
// DFS from -10:
//   dfs(9) = max(0,0) + 9 = 9
//     globalMax = max(-∞, 9+0+0) = 9
//   dfs(20):
//     dfs(15) = 15
//       globalMax = max(9, 15+0+0) = 15
//     dfs(7) = 7
//       globalMax = max(15, 7+0+0) = 15
//     At 20: left=15, right=7
//       globalMax = max(15, 20+15+7) = 42
//     return 20 + max(15,7) = 35
//   At -10: left=9, right=35
//     globalMax = max(42, -10+9+35) = 42
//     return -10 + max(9,35) = 25
//
// Maximum path sum = 42 (15 → 20 → 7)
```

---

### 9. Serialize and Deserialize Binary Tree (Hard)
**Trigger:** Convert a tree to a string and back.
**Intuition:** 
- **Serialize:** Preorder DFS. If node is null, append `"N,"`. Else, append `to_string(val) + ","`.
- **Deserialize:** Split the string by commas into a queue. Write a recursive function. Pop the front of the queue. If it's `"N"`, return `nullptr`. Else, create a new node, and recursively set `node->left = helper(queue)` and `node->right = helper(queue)`. Return the node.

```cpp
class Codec {
public:
    // Serialize: Tree → String
    string serialize(TreeNode* root) {
        if (root == nullptr) return "N,";
        
        return to_string(root->val) + "," + 
               serialize(root->left) + 
               serialize(root->right);
    }
    
    // Deserialize: String → Tree
    TreeNode* deserialize(string data) {
        queue<string> tokens;
        stringstream ss(data);
        string token;
        
        while (getline(ss, token, ',')) {
            tokens.push(token);
        }
        
        return buildTree(tokens);
    }
    
private:
    TreeNode* buildTree(queue<string>& tokens) {
        string val = tokens.front();
        tokens.pop();
        
        if (val == "N") return nullptr;
        
        TreeNode* node = new TreeNode(stoi(val));
        node->left = buildTree(tokens);
        node->right = buildTree(tokens);
        
        return node;
    }
};
```

**What's happening:**
```cpp
// Tree:
//        1
//       / \
//      2   3
//         / \
//        4   5
//
// Serialize (Preorder):
// 1 → 2 → N → N → 3 → 4 → N → N → 5 → N → N
// Result: "1,2,N,N,3,4,N,N,5,N,N,"
//
// Deserialize:
// Process "1": create node(1)
//   Process "2": create node(2)
//     Process "N": return null (2's left)
//     Process "N": return null (2's right)
//   Process "3": create node(3)
//     Process "4": create node(4)
//       Process "N": return null (4's left)
//       Process "N": return null (4's right)
//     Process "5": create node(5)
//       Process "N": return null (5's left)
//       Process "N": return null (5's right)
//
// Tree reconstructed perfectly!
```

**Dry Run Table (Serialize):**

| Step | Node | Output | Remaining |
|------|------|--------|-----------|
| 1 | 1 | "1," | "2,N,N,3,4,N,N,5,N,N" |
| 2 | 2 | "1,2," | "N,N,3,4,N,N,5,N,N" |
| 3 | null | "1,2,N," | "N,3,4,N,N,5,N,N" |
| 4 | null | "1,2,N,N," | "3,4,N,N,5,N,N" |
| 5 | 3 | "1,2,N,N,3," | "4,N,N,5,N,N" |
| 6 | 4 | "1,2,N,N,3,4," | "N,N,5,N,N" |
| 7 | null | "1,2,N,N,3,4,N," | "N,5,N,N" |
| 8 | null | "1,2,N,N,3,4,N,N," | "5,N,N" |
| 9 | 5 | "1,2,N,N,3,4,N,N,5," | "N,N" |
| 10 | null | "1,2,N,N,3,4,N,N,5,N," | "N" |
| 11 | null | "1,2,N,N,3,4,N,N,5,N,N," | "" |

---

### Key Patterns Summary

| Pattern | When to Use | Key Insight |
|---------|-------------|-------------|
| Recursive DFS | Most tree problems | Think: what does this node return? |
| Pass state down | Path problems | Add parameter (maxSoFar, remainingSum) |
| Global variable | Problems needing all paths | Update global, return local |
| BFS Queue | Level-by-level problems | Snapshot queue size |
| Serialize | Save/load tree | Preorder + null markers |

### Quick Reference Table

| Problem | Time | Space | Key Technique |
|---------|------|-------|---------------|
| Invert Tree | O(N) | O(H) | Swap children |
| Max Depth | O(N) | O(H) | 1 + max(left, right) |
| Same Tree | O(N) | O(H) | Compare simultaneously |
| Symmetric | O(N) | O(H) | Mirror comparison |
| Path Sum | O(N) | O(H) | Subtract as you go |
| Level Order | O(N) | O(W) | BFS with level size |
| Good Nodes | O(N) | O(H) | Pass max down |
| Max Path Sum | O(N) | O(H) | Global vs local max |
| Serialize | O(N) | O(N) | Preorder + markers |

**When to Use Each Pattern:**
```
✓ Recursive DFS: Most tree problems
✓ Pass state down: Path sum, max depth with constraint
✓ Global variable: Maximum path sum, all paths
✓ BFS: Level order, shortest path
✓ Preorder: Serialize, copy tree
✓ Inorder: BST validation, sorted order
✓ Postorder: Delete tree, calculate sizes
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems binary trees** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

