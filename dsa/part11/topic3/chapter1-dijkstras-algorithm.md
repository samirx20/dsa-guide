# Part 11, Topic 3: Shortest Path Algorithms
## Chapter 1: Dijkstra's Algorithm

Standard BFS guarantees the shortest path **ONLY if all edges have the exact same weight** (or if the graph is unweighted).

If you are navigating a road network where Highway A takes 10 minutes and Road B takes 50 minutes, standard BFS will incorrectly tell you that Road B is the "shortest" path if it requires fewer total turns.

To find the shortest path in a **Weighted Graph**, you must use Dijkstra's Algorithm.

---

### 1. The Trigger and The Constraint

**Trigger:** Find the shortest path, minimum cost, or least delay from a *single starting node* to all other nodes in a weighted graph.

**The Constraint:** Dijkstra's Algorithm CANNOT handle **Negative Edge Weights**. If your graph has an edge with a weight of `-5`, Dijkstra will fail. You must use Bellman-Ford instead.

### 2. The Intuition

Dijkstra's is essentially BFS, but instead of using a standard FIFO `queue`, it uses a **Min-Heap** (`priority_queue`).

**The Strategy:**
1. Maintain an array `distances` tracking the shortest known distance from the Start Node to every other node. Initialize all distances to `INFINITY`, except the Start Node, which is `0`.
2. Push `{0, StartNode}` into a Min-Heap. The Min-Heap sorts elements by the first value (the distance).
3. While the Min-Heap is not empty:
   - Pop the node with the **smallest current distance**.
   - Iterate through all its neighbors.
   - For each neighbor, calculate the `new_distance = current_distance + edge_weight`.
   - If `new_distance` is strictly LESS than the neighbor's current value in the `distances` array, we found a better path! Update the `distances` array and push `{new_distance, neighbor}` into the Min-Heap.

Because we always process the node with the smallest distance first, the very first time we pop the "Target" node from the heap, we are mathematically guaranteed that it is the absolute shortest path to that target!

---

### 3. Adjacency List Diagram

```
Graph:
    A --4--> B --2--> C
    |         \        |
    1           7      3
    v            \     v
    D --5--> E --1--> F

Adjacency List:
  A: [(B, 4), (D, 1)]
  B: [(C, 2), (E, 7)]
  C: [(F, 3)]
  D: [(E, 5)]
  E: [(F, 1)]
  F: []

Distances Array (initial):
  A    B    C    D    E    F
  0    INF  INF  INF  INF  INF
```

---

### 4. Dijkstra Relaxation Step Diagram

**Finding shortest path from A to all nodes:**

```
Initial State:
  Distances: A=0  B=INF  C=INF  D=INF  E=INF  F=INF
  Min-Heap:  [(0, A)]
  Visited:   {}

Step 1: Pop A (dist=0)
  Neighbors: B (weight=4), D (weight=1)
  Relax B: 0+4=4 < INF → update B=4, push (4,B)
  Relax D: 0+1=1 < INF → update D=1, push (1,D)
  
  Distances: A=0  B=4   C=INF  D=1   E=INF  F=INF
  Min-Heap:  [(1,D), (4,B)]
  Visited:   {A}

Step 2: Pop D (dist=1)
  Neighbors: E (weight=5)
  Relax E: 1+5=6 < INF → update E=6, push (6,E)
  
  Distances: A=0  B=4   C=INF  D=1   E=6   F=INF
  Min-Heap:  [(4,B), (6,E)]
  Visited:   {A, D}

Step 3: Pop B (dist=4)
  Neighbors: C (weight=2), E (weight=7)
  Relax C: 4+2=6 < INF → update C=6, push (6,C)
  Relax E: 4+7=11 < 6? NO → E stays at 6
  
  Distances: A=0  B=4   C=6   D=1   E=6   F=INF
  Min-Heap:  [(6,E), (6,C)]
  Visited:   {A, D, B}

Step 4: Pop E (dist=6)   [tie broken by heap order]
  Neighbors: F (weight=1)
  Relax F: 6+1=7 < INF → update F=7, push (7,F)
  
  Distances: A=0  B=4   C=6   D=1   E=6   F=7
  Min-Heap:  [(6,C), (7,F)]
  Visited:   {A, D, B, E}

Step 5: Pop C (dist=6)
  Neighbors: F (weight=3)
  Relax F: 6+3=9 < 7? NO → F stays at 7
  
  Distances: A=0  B=4   C=6   D=1   E=6   F=7
  Min-Heap:  [(7,F)]
  Visited:   {A, D, B, E, C}

Step 6: Pop F (dist=7)
  Neighbors: none
  
  FINAL:     A=0  B=4   C=6   D=1   E=6   F=7
  Visited:   {A, D, B, E, C, F}
```

**Key insight:** The relaxation step at E was critical. B→E costs 11, but D→E costs 6. Dijkstra correctly keeps E=6 because it processes D before B (smaller distance).

---

### 5. The Golden Template

```cpp
#include <vector>
#include <queue>
#include <limits.h>

using namespace std;

// edges = [[u, v, weight], ...]
int dijkstra(int numNodes, vector<vector<int>>& edges, int startNode, int targetNode) {
    
    // 1. Build Adjacency List: node -> list of {neighbor, weight}
    vector<vector<pair<int, int>>> adj(numNodes);
    for (auto& edge : edges) {
        adj[edge[0]].push_back({edge[1], edge[2]});
    }
    
    // 2. Distances array initialized to Infinity
    vector<int> distances(numNodes, INT_MAX);
    distances[startNode] = 0;
    
    // 3. Min-Heap: {current_distance, node}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> minHeap;
    minHeap.push({0, startNode});
    
    while (!minHeap.empty()) {
        auto [currDist, currNode] = minHeap.top();
        minHeap.pop();
        
        // Optimization: If we pop a distance that is LARGER than the best 
        // distance we already found for this node, it's a stale entry. Ignore it.
        if (currDist > distances[currNode]) continue;
        
        // If we only care about the target, we can return early!
        if (currNode == targetNode) return currDist;
        
        // 4. Check all neighbors
        for (auto& [neighbor, weight] : adj[currNode]) {
            int newDist = currDist + weight;
            
            // 5. If we found a strictly better path, update and push
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                minHeap.push({newDist, neighbor});
            }
        }
    }
    
    return -1; // Unreachable
}
// Time Complexity: O(E log V) (E is edges, V is vertices)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> minHeap;
// ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^
// |            |                   |                                                |
// |            |                   |                                                └── Min-heap (smallest on top)
// |            |                   └── Container type and comparator
// |            └── Element type: {distance, node_index}
// └── C++ priority queue (max-heap by default, greater<> makes it min-heap)
//
// auto [currDist, currNode] = minHeap.top();
//    ^           ^
//    |           └── Structured binding: node index
//    └── Structured binding: distance to this node
//
// if (currDist > distances[currNode]) continue;
//    ^         ^            ^          ^
//    |         |            |          └── Skip this stale entry
//    |         |            └── Best known distance for this node
//    |         └── Comparison: stale entry detected!
//    └── Distance we popped from heap
//
// newDist < distances[neighbor]
//    ^        ^         ^
//    |        |         └── Current best distance to neighbor
//    |        └── Array tracking best distances
//    └── New distance via current path (currDist + weight)
```

---

### 6. Dijkstra: Single-Source to All Nodes Variant

When the problem asks for shortest paths to ALL nodes (not just one target):

```cpp
vector<int> dijkstraAll(int numNodes, vector<vector<int>>& edges, int startNode) {
    vector<vector<pair<int, int>>> adj(numNodes);
    for (auto& edge : edges) {
        adj[edge[0]].push_back({edge[1], edge[2]});
    }
    
    vector<int> distances(numNodes, INT_MAX);
    distances[startNode] = 0;
    
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> minHeap;
    minHeap.push({0, startNode});
    
    while (!minHeap.empty()) {
        auto [currDist, currNode] = minHeap.top();
        minHeap.pop();
        
        if (currDist > distances[currNode]) continue;
        // No early return - we need ALL distances
        
        for (auto& [neighbor, weight] : adj[currNode]) {
            int newDist = currDist + weight;
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                minHeap.push({newDist, neighbor});
            }
        }
    }
    
    return distances;  // Return full distances array
}
// Time Complexity: O(E log V)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// The ONLY difference from the target version:
//   Target version:    if (currNode == targetNode) return currDist;
//   All-nodes version: (remove that line, return distances array)
//
// Why it works: Because we process nodes in order of distance,
// once the heap is empty, every reachable node has been finalized.
```

---

### 7. Dijkstra: Path Reconstruction Variant

When you need the actual shortest path (not just the distance):

```cpp
vector<int> dijkstraWithPath(int numNodes, vector<vector<int>>& edges, 
                             int startNode, int targetNode) {
    vector<vector<pair<int, int>>> adj(numNodes);
    for (auto& edge : edges) {
        adj[edge[0]].push_back({edge[1], edge[2]});
    }
    
    vector<int> distances(numNodes, INT_MAX);
    vector<int> parent(numNodes, -1);  // Track where each node came from
    distances[startNode] = 0;
    
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> minHeap;
    minHeap.push({0, startNode});
    
    while (!minHeap.empty()) {
        auto [currDist, currNode] = minHeap.top();
        minHeap.pop();
        
        if (currDist > distances[currNode]) continue;
        if (currNode == targetNode) break;
        
        for (auto& [neighbor, weight] : adj[currNode]) {
            int newDist = currDist + weight;
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                parent[neighbor] = currNode;  // Record parent
                minHeap.push({newDist, neighbor});
            }
        }
    }
    
    // Reconstruct path by backtracking through parent array
    vector<int> path;
    for (int at = targetNode; at != -1; at = parent[at]) {
        path.push_back(at);
    }
    reverse(path.begin(), path.end());
    
    if (path[0] != startNode) return {};  // Unreachable
    return path;
}
// Time Complexity: O(E log V)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// parent[neighbor] = currNode;
//    ^      ^            ^
//    |      |            └── The node we came from
//    |      └── The node we're reaching
//    └── Parent array: parent[child] = where child came from
//
// Path reconstruction:
//   for (int at = targetNode; at != -1; at = parent[at])
//       path.push_back(at);
//   reverse(path.begin(), path.end());
//
// Example: parent = [-1, A, B, A]  (target=D)
//   at=D → push D, at=parent[D]=A
//   at=A → push A, at=parent[A]=-1 → stop
//   path = [D, A] → reverse → [A, D]
```

---

### 8. Edge Cases

```
Edge Case 1: Start node == Target node
  Expected: distance = 0, path = [startNode]

Edge Case 2: Target is unreachable
  Expected: distance = -1 (or INT_MAX), path = []

Edge Case 3: Multiple paths with same distance
  Both are valid; first one found by heap wins

Edge Case 4: Self-loop edges
  Dijkstra handles naturally (relaxation never improves)
  
Edge Case 5: Very large weights (overflow risk)
  Use long long if weights * V > INT_MAX
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **Algorithm** | Dijkstra's |
| **Trigger** | Shortest path, single source, positive weights |
| **Data Structure** | Min-Heap (priority_queue) |
| **Time** | O(E log V) |
| **Space** | O(V + E) |
| **Handles negative weights?** | NO |
| **Handles negative cycles?** | NO |
| **Early termination?** | Yes (when target popped) |

**Template Quick Copy:**
```cpp
int dijkstra(vector<vector<int>>& edges, int n, int src, int dst) {
    vector<vector<pair<int,int>>> adj(n);
    for (auto& e : edges) adj[e[0]].push_back({e[1], e[2]});
    vector<int> dist(n, INT_MAX); dist[src] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        if (u == dst) return d;
        for (auto& [v, w] : adj[u]) {
            if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
        }
    }
    return -1;
}
```

**When NOT to use Dijkstra:**
- Graph has negative edge weights → Use Bellman-Ford
- Need shortest paths between ALL pairs → Use Floyd-Warshall
- Graph is unweighted → Use BFS (simpler, faster)
- Need path with constraints (K stops) → Use Modified Bellman-Ford

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

Q1 and Q2 use the chapter's A–F graph with **one change: `D → E` now costs 8 instead of 5**. Number the nodes `A=0, B=1, C=2, D=3, E=4, F=5`:

```cpp
vector<vector<int>> edges = {{0,1,4}, {0,3,1}, {1,2,2}, {1,4,7}, {2,5,3}, {3,4,8}, {4,5,1}};
```

**Q1.** Run `dijkstraAll(6, edges, 0)`. In what order are nodes popped (ignoring stale entries), and what is the final `distances` array? When E and F are both in the heap with distance 9, which one is popped first, and why?

**Q2.** Run `dijkstraWithPath(6, edges, 0, 5)`. What is the `parent` array when the loop ends, and what path is returned? Compare with the original chapter graph, where the path to F was `A → D → E → F`.

**Q3.** Run `dijkstraAll` from node 0 on `{{0,1,10}, {0,2,1}, {2,1,2}, {1,3,1}}`. How many times is something popped from the heap in total, how many of those pops are skipped by `if (currDist > distances[currNode]) continue;`, and what is the final `distances` array?

**Q4.** The constraint section says Dijkstra fails on negative weights. Run the target version `dijkstra(3, edges, 0, 1)` with `edges = {{0,1,2}, {0,2,5}, {2,1,-4}}`. What does it return, and what is the true shortest distance?

**Q5.** In `dijkstraWithPath`, suppose `targetNode` is unreachable from `startNode = 0` (say target `3` and nothing ever points to it). What does `path` contain right after the `reverse`, and what does the function return? What does it return when `targetNode == startNode`?

### Coding Exercises

**E1 (Easy).** Count how many nodes (including `src`) can be reached with total cost `<= budget` on a directed graph with non-negative weights.

```cpp
int reachableWithin(int n, vector<vector<int>>& edges, int src, int budget);
// The chapter's original A–F graph (D→E = 5), src = 0:
// budget = 5  ->  3   (A, D, B)
// budget = 6  ->  5   (A, D, B, C, E)
```

**E2 (Easy–Medium).** Path with Maximum Probability: undirected edges, `succProb[i]` is the probability of traversing `edges[i]` successfully. Return the maximum probability of reaching `end` from `start` (`0.0` if unreachable).

```cpp
double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb, int start, int end);
// n = 3, edges = [[0,1],[1,2],[0,2]], succProb = [0.5,0.5,0.2], start = 0, end = 2  ->  0.25
// same, succProb = [0.5,0.5,0.3]                                                    ->  0.3
```

**E3 (Medium).** Number of Ways to Arrive at Destination: undirected roads `[u, v, time]`. Return how many different shortest-time paths go from `0` to `n-1`, modulo $10^9 + 7$.

```cpp
int countPaths(int n, vector<vector<int>>& roads);
// n = 7, roads = [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],[3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]]  ->  4
// n = 2, roads = [[1,0,10]]  ->  1
```

#### Dry-Run: Answers

**Q1.** Pop order **A, D, B, C, E, F**. Final `distances = [0, 4, 6, 1, 9, 9]`.

| Pop | Relaxations | Heap after |
|-----|-------------|------------|
| A (0) | B = 4, D = 1 | (1,D), (4,B) |
| D (1) | E = 1 + 8 = 9 | (4,B), (9,E) |
| B (4) | C = 6; E: 4 + 7 = 11 < 9? no | (6,C), (9,E) |
| C (6) | F = 6 + 3 = 9 | (9,E), (9,F) |
| E (9) | F: 9 + 1 = 10 < 9? no | (9,F) |
| F (9) | — | empty |

Tie at distance 9: `pair` compares the second field when the first is equal, so `(9, 4)` (E) comes out before `(9, 5)` (F).

**Q2.** `parent = [-1, 0, 1, 0, 3, 2]`. Path **`[0, 1, 2, 5]`**, i.e. `A → B → C → F` with cost 9. Backtrack: `5 → parent 2 → parent 1 → parent 0 → -1`, then reverse. Making `D → E` more expensive (8 instead of 5) means `A→D→E→F` now costs 10, so the route through C (cost 9) wins.

**Q3.** **5** pops, **1** stale skip, `distances = [0, 3, 1, 4]`.

| Pop | Fresh or stale | Action |
|-----|----------------|--------|
| (0, 0) | fresh | push (10, 1), (1, 2) |
| (1, 2) | fresh | 1 + 2 = 3 < 10 → push (3, 1) |
| (3, 1) | fresh | push (4, 3) |
| (4, 3) | fresh | no neighbors |
| (10, 1) | **stale** (10 > 3) | `continue` |

The entry `(10, 1)` was never removed when node 1 improved. Lazy deletion leaves it in the heap and the stale check discards it.

**Q4.** Returns **2**, but the true shortest distance is **1** (`0 → 2 → 1 = 5 + (-4)`). Pop 0 sets `dist[1] = 2` and `dist[2] = 5`. The heap's smallest entry is `(2, 1)`, which is the target, so the function returns early. Node 2 is never expanded, so the `-4` edge is never seen. Dijkstra assumes a popped node can't be improved later, and negative edges break that assumption.

**Q5.** Unreachable target: `parent[3] = -1`, so the loop pushes only `3` and `path = [3]` after reversing. Since `path[0] = 3 != 0`, it returns **`{}`**. When `targetNode == startNode`, the first pop hits `break`, `parent[start] = -1`, and the path is **`[startNode]`**, matching Edge Case 1.

**E1 — reference solution**

```cpp
int reachableWithin(int n, vector<vector<int>>& edges, int src, int budget) {
    vector<vector<pair<int,int>>> adj(n);
    for (auto& e : edges) adj[e[0]].push_back({e[1], e[2]});
    vector<int> dist(n, INT_MAX);
    dist[src] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;
    pq.push({0, src});
    int count = 0;
    while (!pq.empty()) {
        int d = pq.top().first, u = pq.top().second;
        pq.pop();
        if (d > dist[u]) continue;     // stale
        if (d > budget) break;         // everything left is even farther
        count++;                       // u is finalized and within budget
        for (auto& [v, w] : adj[u]) {
            if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
        }
    }
    return count;
}
```

Nodes are finalized in increasing distance order, so the first popped distance over budget lets us stop early. Time $O(E \log V)$.

**E2 — reference solution**

```cpp
double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb,
                      int start, int end) {
    vector<vector<pair<int,double>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], succProb[i]});
        adj[edges[i][1]].push_back({edges[i][0], succProb[i]});
    }
    vector<double> best(n, 0.0);
    best[start] = 1.0;
    priority_queue<pair<double,int>> pq;          // MAX-heap: most probable first
    pq.push({1.0, start});
    while (!pq.empty()) {
        double p = pq.top().first;
        int u = pq.top().second;
        pq.pop();
        if (p < best[u]) continue;                // stale
        if (u == end) return p;
        for (auto& [v, q] : adj[u]) {
            double np = p * q;                    // multiply instead of add
            if (np > best[v]) { best[v] = np; pq.push({np, v}); }
        }
    }
    return 0.0;
}
```

Multiplying by probabilities in $[0, 1]$ can only shrink a value, the same way adding non-negative weights can only grow one. So Dijkstra's greedy argument still holds with a max-heap. $0.5 \times 0.5 = 0.25 > 0.2$, but $0.3 > 0.25$. Time $O(E \log V)$.

**E3 — reference solution**

```cpp
int countPaths(int n, vector<vector<int>>& roads) {
    const long long MOD = 1e9 + 7;
    vector<vector<pair<int,long long>>> adj(n);
    for (auto& r : roads) {
        adj[r[0]].push_back({r[1], r[2]});
        adj[r[1]].push_back({r[0], r[2]});
    }
    vector<long long> dist(n, LLONG_MAX), ways(n, 0);
    dist[0] = 0; ways[0] = 1;
    priority_queue<pair<long long,int>, vector<pair<long long,int>>,
                   greater<pair<long long,int>>> pq;
    pq.push({0, 0});
    while (!pq.empty()) {
        long long d = pq.top().first;
        int u = pq.top().second;
        pq.pop();
        if (d > dist[u]) continue;
        for (auto& [v, w] : adj[u]) {
            long long nd = d + w;
            if (nd < dist[v]) {                   // strictly better: reset count
                dist[v] = nd;
                ways[v] = ways[u];
                pq.push({nd, v});
            } else if (nd == dist[v]) {           // another equally short route
                ways[v] = (ways[v] + ways[u]) % MOD;
            }
        }
    }
    return ways[n - 1];
}
```

When `u` is popped (non-stale), `ways[u]` is final, because every shortest path into `u` comes from a node with a smaller distance, which was popped earlier. `long long` handles Edge Case 5's overflow risk. Time $O(E \log V)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Dijkstra's Algorithm**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 dijkstras algorithm** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

