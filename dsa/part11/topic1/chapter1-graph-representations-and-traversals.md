# Part 11, Topic 1: Graph Fundamentals & BFS/DFS
## Chapter 1: Graph Representations & Traversals

A Tree is just a specific type of Graph (a graph with no cycles, where every node has exactly one parent). A general Graph can have cycles, multiple disconnected components, and edges with varying "weights" (distances).

### 1. Representing a Graph in Memory

Unlike Trees where a node physically holds `left` and `right` pointers, Graphs are usually passed into functions as a raw list of edges, e.g., `[[0,1], [1,2], [2,0]]` (0 connects to 1, 1 to 2, 2 to 0).

You cannot easily traverse a raw edge list. You MUST convert it into a usable structure first.

#### A. The Adjacency Matrix
A 2D grid of size $V \times V$ (Vertices). If there is an edge from 0 to 1, `matrix[0][1] = 1`.
*   **Pros:** $O(1)$ to check if an edge exists between any two nodes.
*   **Cons:** $O(V^2)$ space. If you have 100,000 users on a social network, you need a $100,000 \times 100,000$ matrix, which will immediately cause a Memory Limit Exceeded error. Only use Matrices for very small, dense graphs.

#### B. The Adjacency List (The Standard)
An array (or hash map) of lists. For every node, you store a list of exactly who they are connected to.
`adjList[0] = [1]`
`adjList[1] = [2]`
`adjList[2] = [0]`

*   **Building an Adjacency List in C++:**
    ```cpp
    // For an undirected graph
    vector<vector<int>> buildGraph(int numNodes, vector<vector<int>>& edges) {
        vector<vector<int>> adjList(numNodes);
        
        for (auto& edge : edges) {
            int u = edge[0];
            int v = edge[1];
            adjList[u].push_back(v); // u connects to v
            adjList[v].push_back(u); // v connects to u (remove this for directed graphs!)
        }
        return adjList;
    }
    ```

    **What's happening:**
    - Line 3: Create an array of `numNodes` empty vectors. Each index is a node.
    - Line 6: Loop through each edge `[u, v]` in the input.
    - Line 9: Add `v` to `u`'s neighbor list (u -> v).
    - Line 10: Add `u` to `v`'s neighbor list (v -> u). For directed graphs, remove this line.

#### Graph Visualization: Adjacency Matrix vs List

Consider edges: `0-1, 1-2, 2-0, 2-3`

```
Adjacency Matrix (V x V):       Adjacency List:
     0  1  2  3                  0: [1, 2]
  0: 0  1  1  0                  1: [0, 2]
  1: 1  0  1  0                  2: [0, 1, 3]
  2: 1  1  0  1                  3: [2]
  3: 0  0  1  0

Matrix: 16 cells (4x4)          List: 8 entries total
Sparse? Yes -> Matrix wastes space
```

#### C. Edge List (Raw Input)
```cpp
vector<vector<int>> edges = {{0,1}, {1,2}, {2,0}, {2,3}};
```
Always convert to Adjacency List before traversal.

---

### 2. The Golden Rule of Graphs: The `visited` Set

Because graphs can have cycles (0 goes to 1, 1 goes to 2, 2 goes back to 0), a naive traversal will get stuck in an infinite loop and cause a Stack Overflow.

**You must ALWAYS track which nodes you have already visited.**
Usually, this is a `vector<bool> visited(numNodes, false)` or an `unordered_set<int>`.

#### Why Visited is Critical: Infinite Loop Example

```
Graph: 0 -- 1 -- 2 -- 3
       |         |
       +---------+
       (edges: 0-1, 1-2, 2-0, 2-3)

Without visited:
DFS(0) -> DFS(1) -> DFS(2) -> DFS(0) -> DFS(1) -> ... INFINITE LOOP

With visited:
DFS(0) -> visited={0}
  DFS(1) -> visited={0,1}
    DFS(2) -> visited={0,1,2}
      DFS(0) -> already visited, skip
      DFS(3) -> visited={0,1,2,3}
```

---

### 3. Depth-First Search (DFS)

DFS plunges down a path as far as it can go before backtracking. It is used for finding connected components, detecting cycles, and topological sorting.

```cpp
void dfs(int node, vector<vector<int>>& adjList, vector<bool>& visited) {
    // 1. Mark current node as visited
    visited[node] = true;
    cout << "Visited: " << node << endl;
    
    // 2. Iterate through all neighbors
    for (int neighbor : adjList[node]) {
        // 3. If neighbor hasn't been visited, recurse!
        if (!visited[neighbor]) {
            dfs(neighbor, adjList, visited);
        }
    }
}
```

**What's happening:**
- Line 3: Mark current node as visited BEFORE exploring neighbors (prevents revisiting).
- Line 4: Print the node (or process it in some way).
- Line 7: Loop through every neighbor of the current node.
- Line 9: Only recurse if neighbor hasn't been visited (the cycle-breaking guard).
- Line 10: Recurse into the neighbor — goes deeper before going wider.

#### DFS Dry-Run: Visiting All Nodes

```
Graph:  0 -- 1
        |    |
        3 -- 2

Adjacency List:
0: [1, 3]
1: [0, 2]
2: [1, 3]
3: [0, 2]

DFS starting from 0:
Step | Node | visited[]            | Action
-----|------|----------------------|--------
1    | 0    | [T,F,F,F]           | Visit 0, check neighbors [1,3]
2    | 1    | [T,T,F,F]           | Visit 1, check neighbors [0,2]
3    | 0    | [T,T,F,F]           | 0 already visited, skip
4    | 2    | [T,T,T,F]           | Visit 2, check neighbors [1,3]
5    | 1    | [T,T,T,F]           | 1 already visited, skip
6    | 3    | [T,T,T,T]           | Visit 3, check neighbors [0,2]
7    | 0    | [T,T,T,T]           | 0 already visited, skip
8    | 2    | [T,T,T,T]           | 2 already visited, skip

Output: 0 -> 1 -> 2 -> 3
```

#### DFS: Optimized with Early Return
```cpp
void dfs(int node, vector<vector<int>>& adjList, vector<bool>& visited) {
    if (visited[node]) return;          // Base case: already visited
    visited[node] = true;
    for (int neighbor : adjList[node]) {
        dfs(neighbor, adjList, visited);
    }
}
```

**What's happening:**
- Line 2: Single check at the start handles both visited nodes and the base case.
- Cleaner than checking `if (!visited[neighbor])` inside the loop.

---

### 4. Breadth-First Search (BFS)

BFS explores the graph level-by-level, expanding outwards like a ripple in a pond. 
**Crucial Property:** In an unweighted graph, BFS is guaranteed to find the *shortest path* between two nodes.

```cpp
#include <queue>

void bfs(int startNode, vector<vector<int>>& adjList, vector<bool>& visited) {
    queue<int> q;
    
    // 1. Mark start as visited AND push to queue
    visited[startNode] = true;
    q.push(startNode);
    
    while (!q.empty()) {
        int curr = q.front();
        q.pop();
        
        cout << "Visited: " << curr << endl;
        
        // 2. Iterate through all neighbors
        for (int neighbor : adjList[curr]) {
            if (!visited[neighbor]) {
                // 3. Mark as visited BEFORE pushing to the queue!
                // (If you wait to mark it when you pop it, you might push the 
                // same node into the queue 5 times from 5 different neighbors, 
                // causing a massive memory leak).
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}
```

**What's happening:**
- Line 7: Initialize queue with start node.
- Line 8: Mark start as visited immediately (not later!).
- Line 11-13: Pop the front, process it.
- Line 18-24: For each unvisited neighbor, mark visited THEN push. This prevents duplicate entries in the queue.
- Line 22-23: Common bug: marking AFTER pop causes O(E) queue bloat (duplicate entries) instead of O(V).

#### BFS Dry-Run: Level-by-Level

```
Graph:  0 -- 1
        |    |
        3 -- 2

BFS starting from 0:
Step | Queue (front->back) | visited[] | Action
-----|---------------------|-----------|--------
1    | [0]                 | [T,F,F,F] | Pop 0, neighbors [1,3]
2    | [1, 3]              | [T,T,F,T] | Push 1,3. Mark visited.
3    | [3]                 | [T,T,F,T] | Pop 1, neighbors [0,2]
4    | [3, 2]              | [T,T,T,T] | 0 visited, push 2.
5    | [2]                 | [T,T,T,T] | Pop 3, neighbors [0,2]
6    | []                  | [T,T,T,T] | Both visited. Pop 2. Done.

Output: 0 -> 1 -> 3 -> 2 (level order)
```

#### BFS: Finding Shortest Path (with distance tracking)
```cpp
int bfsShortestPath(int start, int target, vector<vector<int>>& adjList) {
    vector<bool> visited(adjList.size(), false);
    queue<pair<int, int>> q; // (node, distance)
    
    q.push({start, 0});
    visited[start] = true;
    
    while (!q.empty()) {
        auto [curr, dist] = q.front();
        q.pop();
        
        if (curr == target) return dist;
        
        for (int neighbor : adjList[curr]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push({neighbor, dist + 1});
            }
        }
    }
    return -1; // target not reachable
}
```

**What's happening:**
- Line 3: Queue stores `(node, distance)` pairs.
- Line 12: Return distance immediately when target found — guaranteed shortest in unweighted graph.
- Line 16-18: Each neighbor is one edge further, so `dist + 1`.

#### BFS vs DFS Comparison

| Feature | BFS | DFS |
|---------|-----|-----|
| Data Structure | Queue | Stack / Recursion |
| Exploration | Level-by-level | Path-by-path |
| Shortest Path (unweighted) | Yes (guaranteed) | No |
| Memory | O(V) worst case | O(V) worst case |
| Detect Cycle | Yes | Yes |
| Topological Sort | Yes (Kahn's) | Yes (post-order) |
| Use When | Shortest path, level order | Connected components, cycles |

---

### 5. Traversing an Implicit Graph (A 2D Grid)

Many interview problems don't give you nodes and edges; they give you a 2D matrix (like a maze or a map of islands) and ask you to traverse it.
In this case, you don't need to build an Adjacency List! The grid *is* the graph. The "neighbors" of cell `(r, c)` are just `(r+1, c)`, `(r-1, c)`, `(r, c+1)`, and `(r, c-1)`.

```cpp
void gridDFS(vector<vector<int>>& grid, int r, int c) {
    // Base Case / Out of Bounds check / Visited check
    if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] == 0 /* 0 means visited or water */) {
        return;
    }
    
    // Mark as visited
    grid[r][c] = 0; 
    
    // Explore 4 directions
    gridDFS(grid, r + 1, c); // Down
    gridDFS(grid, r - 1, c); // Up
    gridDFS(grid, r, c + 1); // Right
    gridDFS(grid, r, c - 1); // Left
}
```

**What's happening:**
- Line 3: Four boundary checks (r<0, r>=rows, c<0, c>=cols) PLUS the water/visited check.
- Line 6: Mutate the grid in-place — no separate `visited` array needed.
- Line 9-12: Four recursive calls for each cardinal direction.

#### Grid DFS Dry-Run: Island Sinking

```
Grid:    1  1  0
         1  0  0
         0  0  1

Start DFS at (0,0):
Step | (r,c) | Grid State          | Action
-----|-------|---------------------|------------------
1    | (0,0) | 0  1  0 / 1 0 0 / 0 0 1 | Mark (0,0) visited
2    | (1,0) | 0  1  0 / 0 0 0 / 0 0 1 | Mark (1,0) visited
3    | (2,0) | 0  1  0 / 0 0 0 / 0 0 1 | Water, return
4    | (0,0) | 0  1  0 / 0 0 0 / 0 0 1 | Already visited, return
5    | (1,1) | 0  1  0 / 0 0 0 / 0 0 1 | Water, return
6    | (1,-1)| 0  1  0 / 0 0 0 / 0 0 1 | Out of bounds, return
7    | (-1,0)| 0  1  0 / 0 0 0 / 0 0 1 | Out of bounds, return
8    | (0,1) | 0  0  0 / 0 0 0 / 0 0 1 | Mark (0,1) visited
9    | (1,1) | 0  0  0 / 0 0 0 / 0 0 1 | Water, return
...   ...   | ...                  | Continue until all reachable done

Island found! Next unvisited '1' is at (2,2) -> second island.
```

#### Grid DFS: 8-Directional (Diagonals)
```cpp
int dr8[] = {-1,-1,-1, 0,0, 1,1,1};
int dc8[] = {-1, 0, 1,-1,1,-1,0,1};

void gridDFS8(vector<vector<int>>& grid, int r, int c) {
    if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] == 0)
        return;
    
    grid[r][c] = 0;
    
    for (int i = 0; i < 8; i++) {
        gridDFS8(grid, r + dr8[i], c + dc8[i]);
    }
}
```

**What's happening:**
- Line 1-2: Direction arrays for all 8 neighbors (including diagonals).
- Line 8-9: Loop through all 8 directions instead of 4 hardcoded calls.

---

### Quick Reference

| Concept | Details | Complexity |
|---------|---------|------------|
| Adjacency Matrix | `matrix[u][v] = 1` for edge u->v | Space: O(V²), Edge check: O(1) |
| Adjacency List | `adj[u] = [v1, v2, ...]` | Space: O(V+E), Edge check: O(degree) |
| Edge List | `[[u,v], ...]` raw input | Space: O(E), must convert first |
| visited Array | `vector<bool> v(n, false)` | Prevents infinite loops in cycles |
| DFS | Recursion / Stack | Time: O(V+E), Space: O(V) |
| BFS | Queue | Time: O(V+E), Space: O(V) |
| Grid DFS | 4 or 8 directional recursion | Mutate grid for visited |
| BFS Shortest Path | Track distance in queue | O(V+E), guaranteed shortest (unweighted) |
| Directed vs Undirected | Undirected: add both directions | Directed: add one direction only |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Graph Representations & Traversals**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 graph representations and traversals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

