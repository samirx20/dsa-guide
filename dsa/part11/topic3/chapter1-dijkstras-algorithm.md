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
  Min-Heap:  [(6,C), (6,E)]
  Visited:   {A, D, B}

Step 4: Pop C (dist=6)   [tie on 6: pair compares node next, C < E]
  Neighbors: F (weight=3)
  Relax F: 6+3=9 < INF → update F=9, push (9,F)
  
  Distances: A=0  B=4   C=6   D=1   E=6   F=9
  Min-Heap:  [(6,E), (9,F)]
  Visited:   {A, D, B, C}

Step 5: Pop E (dist=6)
  Neighbors: F (weight=1)
  Relax F: 6+1=7 < 9 → update F=7, push (7,F)
  
  Distances: A=0  B=4   C=6   D=1   E=6   F=7
  Min-Heap:  [(7,F), (9,F)]
  Visited:   {A, D, B, C, E}

Step 6: Pop F (dist=7)
  Neighbors: none
  (The leftover (9,F) is popped later and skipped as stale: 9 > 7.)
  
  FINAL:     A=0  B=4   C=6   D=1   E=6   F=7
  Visited:   {A, D, B, C, E, F}
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

