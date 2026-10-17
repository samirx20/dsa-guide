# Part 10, Topic 1: Binary Trees & Traversals
## Chapter 2: Breadth-First Search (BFS)

While DFS plunges all the way to the bottom of a tree branch, **Breadth-First Search (BFS)** explores the tree level by level. It looks at the root, then all children at level 1, then all grandchildren at level 2, etc.

*Interview Trigger:* Use BFS when asked for the "shortest path" in an unweighted graph, or when asked to print/return nodes grouped by their "Level".

### 1. The Core Tool: The Queue

Because we process nodes in the exact order we discover them, BFS relies on a **FIFO Queue** (`std::queue`).

**The Basic Pattern:**
1. Push the `root` into the queue.
2. `while(!queue.empty())`:
3. Pop the front node.
4. Process it.
5. Push its `left` and `right` children into the queue.

```cpp
#include <queue>

void basicBFS(TreeNode* root) {
    if (root == nullptr) return;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        
        cout << curr->val << " "; // Process Node
        
        // Push children (they will be processed AFTER the current level finishes)
        if (curr->left != nullptr) q.push(curr->left);
        if (curr->right != nullptr) q.push(curr->right);
    }
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
// BFS Level by Level:
// Level 0: [1]
// Level 1: [2, 3]
// Level 2: [4, 5, 6]
//
// Queue progression:
// Start: [1]
// Pop 1: push 2,3 → queue: [2,3]
// Pop 2: push 4,5 → queue: [3,4,5]
// Pop 3: push 6 → queue: [4,5,6]
// Pop 4: no children → queue: [5,6]
// Pop 5: no children → queue: [6]
// Pop 6: no children → queue: []
// Output: 1 2 3 4 5 6
```

### 2. Level-Order Traversal (The Interview Template)

The `basicBFS` above works, but it doesn't "know" when one level ends and another begins. It just prints a continuous stream of numbers.

Many interview questions ask you to return a `vector<vector<int>>`, where each inner vector represents one discrete level of the tree.

**The Level-Tracking Trick:**
Inside the `while` loop, you capture the `q.size()` BEFORE you start popping nodes. That size tells you exactly how many nodes belong to the current level!

```cpp
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        // 1. Snapshot the size of the queue. 
        // This is exactly how many nodes are on the CURRENT level.
        int levelSize = q.size();
        
        vector<int> currentLevelVals;
        
        // 2. Loop exactly 'levelSize' times
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            currentLevelVals.push_back(curr->val);
            
            // Push the NEXT level's children into the queue
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        
        // 3. Add the fully processed level to the final result
        result.push_back(currentLevelVals);
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
// Level-Order Traversal:
//
// Iteration 1: levelSize = 1
//   Pop 1, push 2,3
//   currentLevelVals = [1]
//   result = [[1]]
//   Queue: [2,3]
//
// Iteration 2: levelSize = 2
//   Pop 2, push 4,5
//   Pop 3, push 6
//   currentLevelVals = [2,3]
//   result = [[1],[2,3]]
//   Queue: [4,5,6]
//
// Iteration 3: levelSize = 3
//   Pop 4, no children
//   Pop 5, no children
//   Pop 6, no children
//   currentLevelVals = [4,5,6]
//   result = [[1],[2,3],[4,5,6]]
//   Queue: []
//
// Done! Each inner vector is one level.
```

**Dry Run Table:**

| Iter | levelSize | Nodes Processed | Children Added | Result So Far |
|------|-----------|-----------------|----------------|---------------|
| 1 | 1 | [1] | 2,3 | [[1]] |
| 2 | 2 | [2,3] | 4,5,6 | [[1],[2,3]] |
| 3 | 3 | [4,5,6] | none | [[1],[2,3],[4,5,6]] |

### 3. Variations of Level-Order BFS

Once you memorize that exact template, you can solve dozens of LeetCode Mediums with a tiny tweak.

**Variation 1: Binary Tree Right Side View**
*Problem:* Imagine standing on the right side of the tree. What nodes do you see?
*Solution:* It's just the *last node* of every level!
Change `currentLevelVals.push_back()` to:
`if (i == levelSize - 1) result.push_back(curr->val);`

```cpp
vector<int> rightSideView(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        int levelSize = q.size();
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            // Only take the last node of each level
            if (i == levelSize - 1) {
                result.push_back(curr->val);
            }
            
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Tree:        1
//            /   \
//           2     3
//            \     \
//             5     4
//
// Level 0: [1] → last = 1
// Level 1: [2,3] → last = 3
// Level 2: [5,4] → last = 4
//
// Right Side View: [1, 3, 4]
```

**Variation 2: Maximum Depth of Binary Tree (Iterative)**
*Problem:* How deep is the tree?
*Solution:* Instead of a `vector<vector<int>>`, just maintain an `int depth = 0`. At the end of the outer `while` loop (after processing the `for` loop for that level), do `depth++`.

```cpp
int maxDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    
    queue<TreeNode*> q;
    q.push(root);
    int depth = 0;
    
    while (!q.empty()) {
        int levelSize = q.size();
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        
        depth++;  // After processing entire level
    }
    
    return depth;
}
```

**Variation 3: Average of Levels in Binary Tree**
*Problem:* Return an array of the average value of the nodes on each level.
*Solution:* Maintain a `double levelSum = 0` inside the `while` loop. Add `curr->val` inside the `for` loop. At the end, push `levelSum / levelSize` to the result.

```cpp
vector<double> averageOfLevels(TreeNode* root) {
    vector<double> result;
    if (root == nullptr) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        int levelSize = q.size();
        double levelSum = 0;
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            levelSum += curr->val;
            
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        
        result.push_back(levelSum / levelSize);
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Tree:        3
//            /   \
//           9     20
//                /  \
//               15   7
//
// Level 0: sum=3, count=1, avg=3.0
// Level 1: sum=9+20=29, count=2, avg=14.5
// Level 2: sum=15+7=22, count=2, avg=11.0
//
// Result: [3.0, 14.5, 11.0]
```

**Variation 4: Binary Tree Zigzag Level Order**
*Problem:* Return level order traversal but alternating left-to-right and right-to-left.
*Solution:* Use a boolean flag `leftToRight`. After processing each level, reverse the order if needed.

```cpp
vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    bool leftToRight = true;
    
    while (!q.empty()) {
        int levelSize = q.size();
        vector<int> currentLevel(levelSize);
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            // Insert at correct position based on direction
            int index = leftToRight ? i : levelSize - 1 - i;
            currentLevel[index] = curr->val;
            
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        
        result.push_back(currentLevel);
        leftToRight = !leftToRight;  // Flip direction
    }
    
    return result;
}
```

**What's happening:**
```cpp
// Tree:        3
//            /   \
//           9     20
//                /  \
//               15   7
//
// Level 0 (L→R): [3]
// Level 1 (R→L): [20, 9]
// Level 2 (L→R): [15, 7]
//
// Result: [[3],[20,9],[15,7]]
```

**Variation 5: Binary Tree Level Order Traversal II (Bottom-Up)**
*Problem:* Return bottom-up level order traversal.
*Solution:* Same as normal level order, but reverse the result at the end.

```cpp
vector<vector<int>> levelOrderBottom(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        int levelSize = q.size();
        vector<int> currentLevel;
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            
            currentLevel.push_back(curr->val);
            
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        
        result.push_back(currentLevel);
    }
    
    reverse(result.begin(), result.end());
    return result;
}
```

### 4. BFS vs DFS Comparison

| Feature | BFS | DFS |
|---------|-----|-----|
| Data Structure | Queue | Stack (or Recursion) |
| Order | Level by level | Branch by branch |
| Space | O(W) - max width | O(H) - height |
| Shortest Path | Yes (unweighted) | No |
| Use Case | Level grouping, shortest path | Path finding, backtracking |

**When to Use Which:**
```
Use BFS when:
- You need the shortest path in an unweighted graph
- You need to process nodes level by level
- You need to find the minimum number of moves (like in puzzles)
- The tree is very deep but narrow

Use DFS when:
- You need to explore all paths
- You need to check if a path exists
- You need to backtrack (like in mazes)
- The tree is very wide but shallow
```

### 5. BFS on Graphs (Adjacency List)

BFS works the same way on graphs, but instead of `left` and `right` children, you iterate through the adjacency list.

```cpp
void bfs(vector<vector<int>>& adj, int start) {
    vector<bool> visited(adj.size(), false);
    queue<int> q;
    
    q.push(start);
    visited[start] = true;
    
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        
        cout << node << " ";  // Process node
        
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}
```

**What's happening:**
```cpp
// Graph:
// 0 -- 1
// |    |
// 2 -- 3
//
// Adjacency list:
// adj[0] = [1, 2]
// adj[1] = [0, 3]
// adj[2] = [0, 3]
// adj[3] = [1, 2]
//
// BFS from 0:
// Queue: [0] → visited: [T,F,F,F]
// Pop 0: output 0, push 1,2 → visited: [T,T,T,F]
// Pop 1: output 1, push 3 → visited: [T,T,T,T]
// Pop 2: output 2 (3 already visited)
// Pop 3: output 3 (all neighbors visited)
// Output: 0 1 2 3
```

### 6. Shortest Path in Unweighted Graph

BFS naturally finds the shortest path because it explores nodes in order of distance from the source.

```cpp
vector<int> shortestPath(vector<vector<int>>& adj, int start, int end) {
    int n = adj.size();
    vector<int> parent(n, -1);
    vector<bool> visited(n, false);
    queue<int> q;
    
    q.push(start);
    visited[start] = true;
    
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        
        if (node == end) break;  // Found target
        
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                parent[neighbor] = node;
                q.push(neighbor);
            }
        }
    }
    
    // Reconstruct path
    vector<int> path;
    for (int v = end; v != -1; v = parent[v]) {
        path.push_back(v);
    }
    reverse(path.begin(), path.end());
    return path;
}
```

**What's happening:**
```cpp
// The parent array lets us trace back from
// destination to source to reconstruct the path.
//
// Graph: 0-1-2-3
//
// BFS from 0:
// parent[0] = -1 (source)
// parent[1] = 0
// parent[2] = 1
// parent[3] = 2
//
// Path from 0 to 3:
// 3 → parent[3]=2 → parent[2]=1 → parent[1]=0 → parent[0]=-1
// Reverse: [0, 1, 2, 3]
```

### Summary

- DFS uses a Stack (or Recursion). BFS uses a Queue.
- To group nodes by level in BFS, take a snapshot of `q.size()` at the beginning of the `while` loop, and process exactly that many nodes using an inner `for` loop.
- **Time Complexity:** $O(N)$ (visit every node once).
- **Space Complexity:** $O(W)$ where $W$ is the maximum width of the tree. In the worst case (a perfectly balanced tree), the bottom level contains $N/2$ nodes, so Space is $O(N)$.

### Quick Reference Table

| Template | Time | Space | Use Case |
|----------|------|-------|----------|
| Basic BFS | O(N) | O(W) | Simple level traversal |
| Level-Order | O(N) | O(W) | Group by level |
| Right Side View | O(N) | O(W) | Last node per level |
| Zigzag | O(N) | O(W) | Alternate directions |
| Bottom-Up | O(N) | O(W) | Reverse level order |

**Key Takeaways:**
1. BFS uses Queue (FIFO), DFS uses Stack (LIFO)
2. Level-order needs `levelSize` snapshot before inner loop
3. BFS is naturally shortest path for unweighted graphs
4. Space depends on max width (worst case: N/2 at bottom level)
5. Most level-order variations just change what you collect per level

---

## Practice & Self-Check

Questions Q1–Q3 use this tree (call it **Tree B**):

```text
          1
        /   \
       2     3
      /     / \
     4     5   6
      \
       7
```

### Predict the Output / Trace by Hand

**Q1.** Run the chapter's `levelOrder` on Tree B. Fill in the dry-run table (Iter, `levelSize`, Nodes Processed, Children Added, Result So Far). Also: what is the largest the queue ever gets during `basicBFS`?

**Q2.** On Tree B, what do `rightSideView`, `zigzagLevelOrder`, and `averageOfLevels` return?

**Q3.** A classic bug: someone deletes the `levelSize` snapshot and writes the inner loop as

```cpp
for (int i = 0; i < q.size(); i++) {   // q.size() re-evaluated every iteration!
    TreeNode* curr = q.front();
    q.pop();
    currentLevelVals.push_back(curr->val);
    if (curr->left != nullptr) q.push(curr->left);
    if (curr->right != nullptr) q.push(curr->right);
}
```

What does this broken `levelOrder` return on Tree B?

**Q4.** Graph BFS. Using the chapter's `bfs` and `shortestPath` on this adjacency list:

```cpp
// adj[0] = [1, 3]
// adj[1] = [0, 2]
// adj[2] = [1, 4]
// adj[3] = [0, 4]
// adj[4] = [2, 3]
```

(a) What does `bfs(adj, 0)` print? (b) What is the `parent` array when node 4 is first discovered, and what does `shortestPath(adj, 0, 4)` return?

**Q5.** For a *perfect* binary tree with $N = 15$ nodes (4 full levels), what is the maximum queue size during `levelOrder`, and how does it relate to $N$?

### Coding Exercises

**E1 (Easy).** Minimum depth: the number of nodes on the shortest path from the root to a **leaf**. Use BFS and stop at the first leaf you pop.

```cpp
int minDepth(TreeNode* root);
// Tree B                               -> 3   (leaf 5 at level 3; node 4 is NOT a leaf)
// [3, 9, 20, null, null, 15, 7]        -> 2   (leaf 9)
```

**E2 (Easy–Medium).** Return the largest value in each level.

```cpp
vector<int> largestValues(TreeNode* root);
// [3, 9, 20, null, null, 15, 7] -> [3, 20, 15]
// Tree B                        -> [1, 3, 6, 7]
```

**E3 (Medium).** Shortest path in a grid. `grid[r][c] == 0` is open, `1` is a wall. Moving up/down/left/right costs 1. Return the minimum number of moves from `(0,0)` to `(rows-1, cols-1)`, or `-1` if unreachable (or if either corner is a wall).

```cpp
int shortestGridPath(vector<vector<int>>& grid);
// [[0,0,0],
//  [1,1,0],
//  [0,0,0]]   -> 4   ((0,0)->(0,1)->(0,2)->(1,2)->(2,2))
// [[0,1],
//  [1,0]]     -> -1
```

#### Dry-Run: Answers

**Q1.** Result `[[1],[2,3],[4,5,6],[7]]`.

| Iter | levelSize | Nodes Processed | Children Added | Result So Far |
|------|-----------|-----------------|----------------|---------------|
| 1 | 1 | [1] | 2,3 | [[1]] |
| 2 | 2 | [2,3] | 4,5,6 | [[1],[2,3]] |
| 3 | 3 | [4,5,6] | 7 | [[1],[2,3],[4,5,6]] |
| 4 | 1 | [7] | none | [[1],[2,3],[4,5,6],[7]] |

Queue in `basicBFS`: `[1] → [2,3] → [3,4] → [4,5,6] → [5,6,7] → [6,7] → [7] → []`. Maximum size is **3**.

**Q2.**
- `rightSideView` → **`[1, 3, 6, 7]`** (last node of each level; 7 is visible even though it hangs off the left side, because nothing else is on level 3).
- `zigzagLevelOrder` → **`[[1],[3,2],[4,5,6],[7]]`** (levels 1 and 3 are written right-to-left; level 3 has one node so it looks unchanged).
- `averageOfLevels` → **`[1.0, 2.5, 5.0, 7.0]`** ($\frac{2+3}{2}=2.5$, $\frac{4+5+6}{3}=5$).

**Q3.** **`[[1,2],[3,4,5],[6],[7]]`** — levels get mixed because the loop bound grows as children are pushed.

| Outer pass | Queue at start | Pops (and queue size checked after each) | Level recorded |
|------------|----------------|-------------------------------------------|----------------|
| 1 | [1] | pop 1 → [2,3] (i=1 < 2), pop 2 → [3,4] (i=2 < 2 fails) | [1,2] |
| 2 | [3,4] | pop 3 → [4,5,6], pop 4 → [5,6,7], pop 5 → [6,7] (i=3 < 2 fails) | [3,4,5] |
| 3 | [6,7] | pop 6 → [7] (i=1 < 1 fails) | [6] |
| 4 | [7] | pop 7 → [] | [7] |

**Q4.** (a) **`0 1 3 2 4`**.

| Pop | Newly visited & pushed | Queue after |
|-----|------------------------|-------------|
| 0 | 1, 3 | [1,3] |
| 1 | 2 | [3,2] |
| 3 | 4 | [2,4] |
| 2 | none (1, 4 visited) | [4] |
| 4 | none | [] |

(b) `parent = [-1, 0, 1, 0, 3]` (node 4 is discovered from 3, which is popped before 2). `shortestPath` walks `4 → 3 → 0`, reverses, and returns **`[0, 3, 4]`** — 2 edges, the shortest.

**Q5.** **8**, which is $\frac{N+1}{2}$. While level 2 (4 nodes) is being processed, after popping $k$ of them the queue holds $(4-k) + 2k = 4 + k$ nodes; at $k = 4$ it is the whole bottom level, 8 nodes. That is why BFS space is $O(W) = O(N)$ for a balanced tree.

**E1 — reference solution**

```cpp
int minDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    queue<TreeNode*> q;
    q.push(root);
    int depth = 0;
    while (!q.empty()) {
        int levelSize = q.size();
        depth++;
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            if (curr->left == nullptr && curr->right == nullptr) return depth; // first leaf
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
    }
    return depth;
}
```

BFS reaches levels in order, so the first leaf found is the shallowest. Time $O(N)$ worst case, but it can stop early; space $O(W)$.

**E2 — reference solution**

```cpp
vector<int> largestValues(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) return result;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int levelSize = q.size();
        int best = INT_MIN;
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            best = max(best, curr->val);
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        result.push_back(best);
    }
    return result;
}
```

Same template as `averageOfLevels`, with `max` instead of a sum. Time $O(N)$, space $O(W)$.

**E3 — reference solution**

```cpp
int shortestGridPath(vector<vector<int>>& grid) {
    int R = grid.size(), C = grid[0].size();
    if (grid[0][0] == 1 || grid[R - 1][C - 1] == 1) return -1;

    vector<vector<int>> dist(R, vector<int>(C, -1));
    queue<pair<int, int>> q;
    q.push({0, 0});
    dist[0][0] = 0;
    int dr[4] = {-1, 1, 0, 0}, dc[4] = {0, 0, -1, 1};

    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        if (r == R - 1 && c == C - 1) return dist[r][c];
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            if (grid[nr][nc] == 1 || dist[nr][nc] != -1) continue;
            dist[nr][nc] = dist[r][c] + 1;   // mark visited when pushed
            q.push({nr, nc});
        }
    }
    return -1;
}
```

Each cell is a graph node with up to 4 neighbors; BFS gives shortest distances in an unweighted graph. Time and space $O(R \cdot C)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Breadth-First Search (BFS)**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 bfs level order** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

