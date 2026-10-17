# Part 11, Topic 1: Graph Fundamentals & BFS/DFS
## Interview Problems Walkthrough

These problems test your ability to map abstract scenarios into Graph theory and execute the correct traversal.

### Problem Classification Table

| Problem | Type | Key Technique | Time | Space |
|---------|------|---------------|------|-------|
| Number of Islands | Grid BFS/DFS | Connected Components | O(M×N) | O(M×N) |
| Max Area of Island | Grid DFS with return | Recursive area counting | O(M×N) | O(M×N) |
| Clone Graph | Graph traversal | Hash map for clones | O(V+E) | O(V) |
| Rotting Oranges | Multi-source BFS | Level-by-level infection | O(M×N) | O(M×N) |
| Pacific Atlantic | Reverse DFS from borders | Intersection of reachable sets | O(M×N) | O(M×N) |
| Is Graph Bipartite | Graph coloring BFS/DFS | Two-color alternation | O(V+E) | O(V) |
| Word Ladder | Shortest path BFS | Word transformation graph | O(L×26×N) | O(N) |

---

### Solution Approach Comparison

| Problem | Brute Force | Optimal | Why Optimal |
|---------|-------------|---------|-------------|
| Number of Islands | DFS each cell, recount O(M²N²) | Single pass DFS/BFS with visited | Each cell visited exactly once |
| Max Area of Island | Run DFS per island, track max | Single DFS returning area sum | Recursion naturally sums area |
| Clone Graph | BFS + map | DFS + map (recursive) | Simpler code, same complexity |
| Rotting Oranges | Simulate minute-by-minute | Multi-source BFS from all rotten | Natural level-order = minutes |
| Pacific Atlantic | DFS from every cell O(M²N²) | Reverse DFS from ocean borders | Reduces to O(M×N) |
| Is Graph Bipartite | Try all partitions 2^V | BFS coloring | Greedy two-color is optimal |
| Word Ladder | DFS all paths | BFS shortest path | BFS guarantees shortest |

---

### 1. Number of Islands (Medium)
**Trigger:** Given a 2D grid of '1's (land) and '0's (water), count the number of islands.
**Intuition:** This is the quintessential "Connected Components" problem. 
Iterate over every cell in the grid using two nested `for` loops. If you see a `'1'`, you have found an island! Increment your `islandCount`. 
But you must immediately trigger a DFS or BFS to "sink" (change to `'0'`) the entire island connected to that `'1'`. If you don't sink it, your `for` loop will count every single square of the island as a new island.
*(See Chapter 1 for the `gridDFS` code template).*

#### Step-by-Step Walkthrough

```
Grid:
  1 1 0 0 0
  1 1 0 0 0
  0 0 1 0 0
  0 0 0 1 1

Scan (0,0) = '1' -> islandCount=1, DFS to sink:
Step | Cell | Grid After          | visited (sunk cells)
-----|------|---------------------|----------------------
1    | (0,0)| 0 1 0 0 0 / ...     | {(0,0)}
2    | (0,1)| 0 0 0 0 0 / ...     | {(0,0),(0,1)}
3    | (1,0)| 0 0 0 0 0 / 0 1 ... | {(0,0),(0,1),(1,0)}
4    | (1,1)| 0 0 0 0 0 / 0 0 ... | {(0,0),(0,1),(1,0),(1,1)}
All neighbors water/visited -> DFS returns.

Scan continues... (0,2)=0, (0,3)=0, ...
Scan (2,2) = '1' -> islandCount=2, DFS sinks {(2,2)}
Scan (3,3) = '1' -> islandCount=3, DFS sinks {(3,3),(3,4)}

Total: 3 islands
```

#### Code: Basic (DFS)
```cpp
void dfs(vector<vector<char>>& grid, int r, int c) {
    if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] == '0')
        return;
    grid[r][c] = '0'; // Sink the land
    dfs(grid, r+1, c);
    dfs(grid, r-1, c);
    dfs(grid, r, c+1);
    dfs(grid, r, c-1);
}

int numIslands(vector<vector<char>>& grid) {
    int count = 0;
    for (int r = 0; r < grid.size(); r++) {
        for (int c = 0; c < grid[0].size(); c++) {
            if (grid[r][c] == '1') {
                count++;
                dfs(grid, r, c);
            }
        }
    }
    return count;
}
```

**What's happening:**
- Line 1-3: Base case — out of bounds or water, return.
- Line 4: Mutate grid in-place (`'1'` -> `'0'`) as visited marker.
- Line 5-8: Explore all 4 neighbors recursively.
- Line 13-20: Main loop — each time we hit `'1'`, it's a new island. Sink it entirely before continuing.

#### Code: BFS Variation
```cpp
int numIslands(vector<vector<char>>& grid) {
    int count = 0;
    int rows = grid.size(), cols = grid[0].size();
    int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
    
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] != '1') continue;
            count++;
            queue<pair<int,int>> q;
            q.push({r, c});
            grid[r][c] = '0';
            while (!q.empty()) {
                auto [cr, cc] = q.front(); q.pop();
                for (int i = 0; i < 4; i++) {
                    int nr = cr+dr[i], nc = cc+dc[i];
                    if (nr>=0 && nr<rows && nc>=0 && nc<cols && grid[nr][nc]=='1') {
                        grid[nr][nc] = '0';
                        q.push({nr, nc});
                    }
                }
            }
        }
    }
    return count;
}
```

**What's happening:**
- Line 6-13: Same scan loop, but uses BFS queue instead of recursion.
- Line 15-22: BFS levels — each pop explores 4 neighbors, marking and enqueueing land cells.

---

### 2. Max Area of Island (Medium)
**Trigger:** Find the maximum area of an island.
**Intuition:** Exactly the same as Number of Islands, but your `dfs` function needs to return an `int`. 
`return 1 + dfs(up) + dfs(down) + dfs(left) + dfs(right);`
Maintain a `globalMax` variable in your main loop.

#### Dry-Run Table

```
Grid:
  1 1 0
  1 0 1
  0 1 1

DFS at (0,0): returns 2 (cells (0,0),(0,1) -> (1,0) is water)
DFS at (1,2): returns 4 (cells (1,2),(2,1),(2,2) -> (0,2) is water)

globalMax = max(2, 4) = 4
```

#### Code
```cpp
int dfs(vector<vector<int>>& grid, int r, int c) {
    if (r<0 || r>=grid.size() || c<0 || c>=grid[0].size() || grid[r][c]==0)
        return 0;
    grid[r][c] = 0;
    return 1 + dfs(grid,r+1,c) + dfs(grid,r-1,c) + dfs(grid,r,c+1) + dfs(grid,r,c-1);
}

int maxAreaOfIsland(vector<vector<int>>& grid) {
    int maxArea = 0;
    for (int r = 0; r < grid.size(); r++)
        for (int c = 0; c < grid[0].size(); c++)
            if (grid[r][c] == 1)
                maxArea = max(maxArea, dfs(grid, r, c));
    return maxArea;
}
```

**What's happening:**
- Line 5: Returns 0 for water/bounds, 1 + sum of recursive calls for land.
- Line 10-12: Same scan pattern as Number of Islands but track max instead of count.

---

### 3. Clone Graph (Medium)
**Trigger:** Return a deep copy of a connected undirected graph.
**Intuition:** You need to traverse the graph and create new nodes. But how do you link them without creating an infinite loop? 
Use an `unordered_map<Node*, Node*> copies` that maps the *Original Node Pointer* to the *Cloned Node Pointer*.
Run a DFS. If the node is already in the map, return the cloned pointer. If not, create a new node, put it in the map, and recursively clone its neighbors, pushing them into the new node's `neighbors` vector.

```cpp
unordered_map<Node*, Node*> copies;

Node* cloneGraph(Node* node) {
    if (node == nullptr) return nullptr;
    if (copies.count(node)) return copies[node];
    
    // Create the clone and immediately store it in the map
    Node* clone = new Node(node->val);
    copies[node] = clone;
    
    // Recursively clone all neighbors
    for (Node* neighbor : node->neighbors) {
        clone->neighbors.push_back(cloneGraph(neighbor));
    }
    
    return clone;
}
```

**What's happening:**
- Line 4: Null check — empty graph returns null.
- Line 5: If already cloned, return the existing clone (prevents infinite recursion).
- Line 8: Create new node with same value.
- Line 9: Store in map IMMEDIATELY (before recursion) — this is the key insight.
- Line 12-14: Recursively clone each neighbor and add to clone's neighbor list.

#### Dry-Run: Cloning a Simple Graph

```
Original: 1 -- 2
          |    |
          4 -- 3

Step | Node | copies map               | Action
-----|------|--------------------------|---------------------------
1    | 1    | {}                       | Create clone(1), store
2    | 2    | {1->clone1}              | Create clone(2), store
3    | 3    | {1->clone1, 2->clone2}   | Create clone(3), store
4    | 4    | {1->clone1, 2->2, 3->3}  | Create clone(4), store
5    | 1    | {1->cl1, 2->cl2, ...}    | Already cloned, return cl1
6    | 3    | {1->cl1, 2->cl2, ...}    | Already cloned, return cl3
7    | 2    | {1->cl1, 2->cl2, ...}    | Already cloned, return cl2
8    | 4    | {1->cl1, 2->cl2, ...}    | Already cloned, return cl4

Clone(1).neighbors = [clone2, clone4]
Clone(2).neighbors = [clone1, clone3]
Clone(3).neighbors = [clone2, clone4]
Clone(4).neighbors = [clone1, clone3]
```

---

### 4. Rotting Oranges (Medium)
**Trigger:** Every minute, any fresh orange adjacent to a rotten orange becomes rotten. Return minimum minutes until no cell has a fresh orange.
**Intuition:** **Multi-Source BFS.**
Standard BFS starts from one node. Here, multiple oranges could be rotten at minute 0!
1. Scan the grid. Push ALL initially rotten oranges `(row, col)` into a Queue. Count the total number of `fresh` oranges.
2. Run standard BFS. Each step of the `while` loop represents 1 minute.
3. When you pop a rotten orange, check its 4 neighbors. If they are fresh, make them rotten, decrement your `fresh` count, and push them to the Queue.
4. If the Queue empties but `fresh > 0`, return `-1` (some are unreachable). Otherwise, return the `minutes` passed.

#### Dry-Run Table

```
Grid:
  2  1  1
  1  1  0
  0  1  1

Initial: queue = [(0,0)], fresh = 6, minutes = 0

Minute 0: Pop (0,0), rot neighbors
Step | Queue (front->back)  | fresh | Action
-----|----------------------|-------|---------------------------
Init | [(0,0)]              | 6     | Start BFS
0.1  | []                   | 5     | Pop (0,0), rot (0,1)
0.2  | [(0,1)]              | 5     | Push (0,1)
1.1  | []                   | 4     | Pop (0,1), rot (1,1)
1.2  | [(1,1)]              | 4     | Push (1,1)
2.1  | []                   | 3     | Pop (1,1), rot (0,2)
2.2  | [(0,2)]              | 3     | (1,0) is 1, rot it too
2.3  | [(0,2),(1,0)]         | 2     | Push both
3.1  | [(1,0)]              | 1     | Pop (0,2), rot (1,2)? No, (1,2) is 0
3.2  | []                   | 0     | Pop (1,0), no fresh neighbors
Queue empty, fresh=0 -> return minutes = 3
```

#### Code
```cpp
int orangesRotting(vector<vector<int>>& grid) {
    queue<pair<int,int>> q;
    int fresh = 0, rows = grid.size(), cols = grid[0].size();
    int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
    
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            if (grid[r][c] == 2) q.push({r,c});
            else if (grid[r][c] == 1) fresh++;
    
    int minutes = 0;
    while (!q.empty() && fresh > 0) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            auto [r,c] = q.front(); q.pop();
            for (int d = 0; d < 4; d++) {
                int nr=r+dr[d], nc=c+dc[d];
                if (nr>=0 && nr<rows && nc>=0 && nc<cols && grid[nr][nc]==1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    q.push({nr,nc});
                }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}
```

**What's happening:**
- Line 6-9: Scan grid, enqueue all rotten oranges, count fresh ones.
- Line 12: Process level-by-level — each level = 1 minute.
- Line 13: `size = q.size()` processes exactly one minute's worth of rotten oranges.
- Line 18-22: If a fresh neighbor is found, rot it, decrement count, enqueue.
- Line 25: Return -1 if any fresh oranges remain unreachable.

---

### 5. Pacific Atlantic Water Flow (Medium)
**Trigger:** Given an island matrix with heights, find coordinates where water can flow to BOTH the Pacific (Top/Left) and Atlantic (Bottom/Right) oceans. Water flows to equal or lower heights.
**Intuition:** The brute force is to start a DFS from every cell and see if it hits both oceans ($O(N^2 \times M^2)$). TLE.
*The Reverse Trick:* Start from the oceans and flow UPHILL!
Create two boolean matrices: `pacificVisited` and `atlanticVisited`.
Run a DFS from all top/left cells (marking `pacificVisited`), flowing to neighbors that are $\ge$ the current cell.
Run a DFS from all bottom/right cells (marking `atlanticVisited`).
Finally, iterate through the matrix. If a cell is `true` in BOTH boolean matrices, add it to the result. $O(N \times M)$ time.

#### Dry-Run: Reverse DFS Concept

```
Heights:
  1  2  2  3  5
  3  2  3  4  4
  2  4  5  3  1
  6  7  1  4  5
  5  1  1  2  4

Pacific (top/left border): cells reachable flowing uphill
Atlantic (bottom/right border): cells reachable flowing uphill

Cells in BOTH -> result = [(0,4),(1,3),(1,4),(2,2),(3,0),(3,1),(4,0)]
```

#### Code
```cpp
vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
    int rows = heights.size(), cols = heights[0].size();
    vector<vector<bool>> pac(rows, vector<bool>(cols, false));
    vector<vector<bool>> atl(rows, vector<bool>(cols, false));
    int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
    
    function<void(int,int,vector<vector<bool>>&,int)> dfs = [&](int r, int c, auto& visited, int prev) {
        if (r<0||r>=rows||c<0||c>=cols||visited[r][c]||heights[r][c]<prev) return;
        visited[r][c] = true;
        for (int d = 0; d < 4; d++)
            dfs(r+dr[d], c+dc[d], visited, heights[r][c]);
    };
    
    for (int i = 0; i < rows; i++) {
        dfs(i, 0, pac, 0);      // Pacific: left column
        dfs(i, cols-1, atl, 0); // Atlantic: right column
    }
    for (int j = 0; j < cols; j++) {
        dfs(0, j, pac, 0);      // Pacific: top row
        dfs(rows-1, j, atl, 0); // Atlantic: bottom row
    }
    
    vector<vector<int>> result;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            if (pac[r][c] && atl[r][c])
                result.push_back({r, c});
    return result;
}
```

**What's happening:**
- Line 7-10: Lambda DFS — flows to neighbors with height >= current (uphill flow).
- Line 13-17: Start DFS from Pacific borders (top row + left column).
- Line 18-21: Start DFS from Atlantic borders (bottom row + right column).
- Line 24-27: Intersection of both reachable sets = cells flowing to both oceans.

---

### 6. Is Graph Bipartite? (Medium)
**Trigger:** Can the nodes be split into two independent sets such that every edge connects a node in set A to a node in set B?
**Intuition:** **Graph Coloring.** 
Imagine painting nodes Red and Blue. If a node is Red, all its neighbors MUST be Blue.
Maintain an array `colors(numNodes, 0)`. `0` = uncolored, `1` = Red, `-1` = Blue.
Iterate through all nodes (because the graph might have disconnected components). If a node is `0`, run BFS/DFS.
Color it `1`. Look at all neighbors. If a neighbor has the SAME color as the current node, return `false`! If it's uncolored, color it the OPPOSITE color (`-current_color`) and push to queue.

#### Dry-Run: Bipartite Check

```
Graph: 0 -- 1
       |    |
       3 -- 2

Colors: [0,0,0,0] (uncolored)

Step | Node | Color | neighbors | Action
-----|------|-------|-----------|---------------------------
1    | 0    | 1(R)  | [1,3]     | Color 0=Red
2    | 1    | -1(B) | [0,2]     | 0 already Red (opposite) OK
3    | 3    | -1(B) | [0,2]     | 0 already Red (opposite) OK
4    | 2    | 1(R)  | [1,3]     | Both Blue (opposite) OK

All nodes colored, no conflicts -> Bipartite!
```

#### Code
```cpp
bool isBipartite(vector<vector<int>>& graph) {
    int n = graph.size();
    vector<int> colors(n, 0);
    
    for (int i = 0; i < n; i++) {
        if (colors[i] != 0) continue;
        queue<int> q;
        q.push(i);
        colors[i] = 1;
        while (!q.empty()) {
            int curr = q.front(); q.pop();
            for (int neighbor : graph[curr]) {
                if (colors[neighbor] == 0) {
                    colors[neighbor] = -colors[curr];
                    q.push(neighbor);
                } else if (colors[neighbor] == colors[curr]) {
                    return false;
                }
            }
        }
    }
    return true;
}
```

**What's happening:**
- Line 7: Skip already-colored nodes (handles disconnected components).
- Line 11: Start BFS with color 1 (Red).
- Line 15-16: Uncolored neighbor gets opposite color.
- Line 17-18: Same-color neighbor means odd cycle -> not bipartite.

---

### 7. Word Ladder (Hard)
**Trigger:** Given a `beginWord`, `endWord`, and a `wordList`, find the shortest transformation sequence (changing 1 letter at a time).
**Intuition:** This is finding the **Shortest Path in an Unweighted Graph**, which screams **BFS**.
1. Put all `wordList` words into an `unordered_set` for $O(1)$ lookups.
2. Push `beginWord` to a Queue.
3. For each popped word, generate all possible transformations (loop through each character, change it from 'a' to 'z'). 
4. If a transformed word is in the set, it is a valid neighbor! Remove it from the set (to mark as visited) and push to the queue.
5. If the transformed word equals `endWord`, return the number of steps.

#### Dry-Run Table

```
beginWord = "hit", endWord = "cog"
wordList = ["hot","dot","dog","lot","log","cog"]

Step | Queue       | Level | Transformations tried        | Found
-----|-------------|-------|------------------------------|------
1    | [hit]       | 1     | h->*: ait,bit,...,zit        | hot
2    | [hot]       | 2     | h->*: aot,...,zot            | dot,lot
3    | [dot,lot]   | 3     | d->*: dog; l->*: log         | dog,log
4    | [dog,log]   | 4     | d->*: cog; l->*: cog         | cog!

Return level 4: hit -> hot -> dot -> dog -> cog (or hot->lot->log->cog)
```

#### Code
```cpp
int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
    unordered_set<string> wordSet(wordList.begin(), wordList.end());
    if (!wordSet.count(endWord)) return 0;
    
    queue<pair<string,int>> q;
    q.push({beginWord, 1});
    
    while (!q.empty()) {
        auto [word, level] = q.front(); q.pop();
        
        for (int i = 0; i < word.size(); i++) {
            string temp = word;
            for (char c = 'a'; c <= 'z'; c++) {
                temp[i] = c;
                if (temp == endWord) return level + 1;
                if (wordSet.count(temp)) {
                    q.push({temp, level + 1});
                    wordSet.erase(temp);
                }
            }
        }
    }
    return 0;
}
```

**What's happening:**
- Line 3: Convert wordList to set for O(1) lookup.
- Line 4: If endWord not in list, impossible.
- Line 11-17: For each position in word, try all 26 letters.
- Line 15: Check if transformation equals endWord (early return).
- Line 16-18: If transformation is in wordSet, enqueue and erase (mark visited).
- Time: O(L × 26 × N) where L = word length, N = wordList size.

---

### Quick Reference

| Problem | Key Trick | Code Pattern | Common Pitfall |
|---------|-----------|--------------|----------------|
| Number of Islands | Sink visited cells | Grid DFS + scan loop | Forgetting to sink = overcount |
| Max Area of Island | Return 1 + recurse | DFS with return value | Not handling water base case |
| Clone Graph | Map original->clone | DFS + hash map | Cloning before storing in map |
| Rotting Oranges | Multi-source BFS | Queue all rotten first | Processing one source at a time |
| Pacific Atlantic | Reverse flow uphill | DFS from ocean borders | Brute force from every cell |
| Is Graph Bipartite | Two-color BFS | Color array, check conflicts | Only checking one component |
| Word Ladder | BFS shortest path | Generate 26 variants per char | Forgetting to erase from set |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run this file's `numIslands` and `maxAreaOfIsland` on the same grid (characters for the first, ints for the second). What does each return?

```
1 0 1 1
1 0 0 1
0 1 0 0
0 1 1 0
```

**Q2.** Run `orangesRotting` on the grid below. What does it return, and which cell(s) rot in each minute? Then change the bottom-left `0` at `(2,0)` to `1`. What is the new answer?

```
2 1 1
0 1 1
0 0 1
```

**Q3.** Run `isBipartite` on the 5-cycle `0-1-2-3-4-0`, given as `graph = [[1,4],[0,2],[1,3],[2,4],[3,0]]`. What does it return, and at which popped node / neighbor pair is the conflict detected?

**Q4.** Run `ladderLength("hit", "cog", wordList)` with `wordList = ["hot","dot","lot","log","cog"]` (note: `"dog"` is missing). What does it return? What does it return if `"cog"` is removed from the list instead?

**Q5.** Run the recursive `cloneGraph` on the path graph `1 -- 2 -- 3` (`1:[2]`, `2:[1,3]`, `3:[2]`), starting from node 1. How many times is `cloneGraph` called in total, and how many times is `new Node` executed?

### Coding Exercises

**E1 (Easy).** Flood Fill: starting from pixel `(sr, sc)`, recolor every 4-connected pixel that has the same original color as the start pixel.

```cpp
vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int color);
// image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2
//   -> [[2,2,2],[2,2,0],[2,0,1]]
// image = [[0,0],[0,0]], sr = 0, sc = 0, color = 0  -> unchanged
```

**E2 (Easy–Medium).** 01 Matrix: for every cell, return the distance (in 4-directional steps) to the nearest `0`. Use the multi-source BFS idea from Rotting Oranges.

```cpp
vector<vector<int>> updateMatrix(vector<vector<int>>& mat);
// [[0,0,0],[0,1,0],[1,1,1]]  ->  [[0,0,0],[0,1,0],[1,2,1]]
```

**E3 (Medium).** Number of Enclaves: count land cells (`1`) from which you can **not** walk off the grid boundary. Use the "start from the border" trick from Pacific Atlantic.

```cpp
int numEnclaves(vector<vector<int>>& grid);
// [[0,0,0,0],[1,0,1,0],[0,1,1,0],[0,0,0,0]]  ->  3
// [[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,0,0,0]]  ->  0
```

#### Dry-Run: Answers

**Q1.** `numIslands` returns **3**; `maxAreaOfIsland` returns **3**.

| Scan hits | Island cells sunk | Area |
|-----------|-------------------|------|
| (0,0) | (0,0), (1,0) | 2 |
| (0,2) | (0,2), (0,3), (1,3) | 3 |
| (2,1) | (2,1), (3,1), (3,2) | 3 |

Two islands tie for the maximum area of 3.

**Q2.** Returns **4**. Initially `fresh = 5`.

| Minute | Popped | Newly rotten | fresh after |
|--------|--------|--------------|-------------|
| 1 | (0,0) | (0,1) | 4 |
| 2 | (0,1) | (1,1), (0,2) | 2 |
| 3 | (1,1), (0,2) | (1,2) | 1 |
| 4 | (1,2) | (2,2) | 0 |

With `(2,0) = 1`: that orange's neighbors `(1,0)` and `(2,1)` are both empty, so it can never rot. `fresh` ends at 1 and the function returns **-1**.

**Q3.** Returns **false** (an odd cycle is never bipartite).

| Pop | Neighbors | Action |
|-----|-----------|--------|
| 0 (color 1) | 1, 4 | color both -1 |
| 1 (-1) | 0, 2 | 0 is 1, OK; color 2 = 1 |
| 4 (-1) | 3, 0 | color 3 = 1; 0 is 1, OK |
| 2 (1) | 1, 3 | 1 is -1, OK; **3 is 1 = same as 2 → return false** |

The conflict is found when popping node **2** and examining neighbor **3**.

**Q4.** Returns **5** (`hit → hot → lot → log → cog`). The code counts *words* in the sequence, not edges: `hit` starts at level 1, `hot` 2, `dot`/`lot` 3, `log` 4, and generating `cog` from `log` returns `4 + 1 = 5`. `dot` is a dead end because `dog` is missing. If `"cog"` is removed, the guard `if (!wordSet.count(endWord)) return 0;` returns **0** immediately.

**Q5.** **5** calls, **3** `new Node` executions.

| Call | Already in `copies`? | Effect |
|------|----------------------|--------|
| cloneGraph(1) | no | new clone1, recurse on [2] |
| cloneGraph(2) | no | new clone2, recurse on [1, 3] |
| cloneGraph(1) | yes | return clone1 |
| cloneGraph(3) | no | new clone3, recurse on [2] |
| cloneGraph(2) | yes | return clone2 |

In general: $1 + 2E$ calls for a connected graph ($1 + 4 = 5$ here) and exactly $V$ allocations.

**E1 — reference solution**

```cpp
void fill(vector<vector<int>>& img, int r, int c, int orig, int color) {
    if (r < 0 || r >= img.size() || c < 0 || c >= img[0].size() || img[r][c] != orig)
        return;
    img[r][c] = color;                 // recoloring doubles as "visited"
    fill(img, r + 1, c, orig, color);
    fill(img, r - 1, c, orig, color);
    fill(img, r, c + 1, orig, color);
    fill(img, r, c - 1, orig, color);
}

vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int color) {
    int orig = image[sr][sc];
    if (orig == color) return image;   // otherwise infinite recursion
    fill(image, sr, sc, orig, color);
    return image;
}
```

Same grid-DFS as Number of Islands. The `orig == color` guard is essential, since the "visited" mark would otherwise be indistinguishable from unvisited. Time $O(M \times N)$.

**E2 — reference solution**

```cpp
vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
    int R = mat.size(), C = mat[0].size();
    vector<vector<int>> dist(R, vector<int>(C, -1));
    queue<pair<int,int>> q;
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            if (mat[r][c] == 0) { dist[r][c] = 0; q.push({r, c}); }  // all sources
    int dr[] = {-1, 1, 0, 0}, dc[] = {0, 0, -1, 1};
    while (!q.empty()) {
        int r = q.front().first, c = q.front().second;
        q.pop();
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nr >= R || nc < 0 || nc >= C || dist[nr][nc] != -1) continue;
            dist[nr][nc] = dist[r][c] + 1;
            q.push({nr, nc});
        }
    }
    return dist;
}
```

Seeding the queue with every `0` makes BFS layers equal "distance to nearest zero". Each cell is pushed once: $O(M \times N)$.

**E3 — reference solution**

```cpp
void sink(vector<vector<int>>& g, int r, int c) {
    if (r < 0 || r >= g.size() || c < 0 || c >= g[0].size() || g[r][c] == 0) return;
    g[r][c] = 0;
    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
}

int numEnclaves(vector<vector<int>>& grid) {
    int R = grid.size(), C = grid[0].size();
    for (int r = 0; r < R; r++) { sink(grid, r, 0); sink(grid, r, C - 1); }
    for (int c = 0; c < C; c++) { sink(grid, 0, c); sink(grid, R - 1, c); }
    int count = 0;
    for (auto& row : grid)
        for (int x : row) count += x;   // whatever land survives is enclosed
    return count;
}
```

Instead of asking "can this cell escape?" from every cell, sink everything reachable from the border, which is exactly the reverse trick of Pacific Atlantic. Time $O(M \times N)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems graphs** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

