# Part 11, Topic 3: Shortest Path Algorithms
## Chapter 2: Bellman-Ford & Floyd-Warshall

While Dijkstra is the most common shortest-path algorithm in interviews, you must know when it fails and what to use instead.

---

## Comparison Table: All Shortest Path Algorithms

| Feature | BFS | Dijkstra | Bellman-Ford | Floyd-Warshall |
|---------|-----|----------|-------------|----------------|
| **Trigger** | Unweighted graph | Positive weights | Negative weights | All pairs |
| **Source** | Single | Single | Single | All pairs |
| **Time** | O(V+E) | O(E log V) | O(V×E) | O(V³) |
| **Space** | O(V+E) | O(V+E) | O(V) | O(V²) |
| **Negative weights?** | N/A | NO | YES | YES |
| **Negative cycles?** | N/A | NO | Detects them | Detects them |
| **Data structure** | Queue | Min-Heap | None (array) | Matrix |
| **Best for** | Unweighted | Road networks | Currency exchange | Dense/small graphs |

---

## Real-World Analogies

**Bellman-Ford — Currency Exchange:** Each edge is an exchange rate. A negative cycle means infinite money: \$1 USD → EUR → JPY → USD = \$1.05. Repeat forever. Bellman-Ford detects these "arbitrage opportunities."

**Floyd-Warshall — Flight Network:** You want cheapest flights between EVERY pair of cities. For each pair (i,j), ask: "Is it cheaper to connect through city k?" Try all k, and you have the complete cheapest-route map.

---

## 1. Bellman-Ford (Handling Negative Weights)

**Trigger:** Find the shortest path from a single source, but the graph contains **Negative Edge Weights**. Or, the problem asks you to find if a **Negative Weight Cycle** exists.

**The Intuition:**
If there is a cycle where the total weight is negative (e.g., $A \to B = 5$, $B \to C = -10$, $C \to A = 2$. Total = $-3$), you can loop through that cycle infinitely, lowering your total distance forever. The shortest path becomes $-\infty$. Dijkstra will get stuck in an infinite loop here.

Bellman-Ford does not use a Priority Queue. Instead, it forcefully "relaxes" (updates) every single edge in the graph, over and over again.

**The Strategy:**
1. Initialize a `distances` array with `INFINITY`, and `distances[startNode] = 0`.
2. Loop $V - 1$ times (where $V$ is the number of vertices).
3. Inside the loop, iterate over EVERY edge `(u, v, weight)`.
4. If `distances[u] + weight < distances[v]`, update `distances[v]`.
*(Why $V-1$ times? Because the longest possible path without a cycle in a graph with $V$ nodes has exactly $V-1$ edges.)*

**Detecting Negative Cycles:**
After the $V-1$ loops, run ONE MORE loop over all edges. If any edge still relaxes, the graph contains a Negative Weight Cycle.

---

### Bellman-Ford Iteration Diagram

**Graph:** 4 nodes, edges: A→B(1), A→C(4), B→C(-2), B→D(6), C→D(3)

```
Initial:
  Distances: A=0  B=INF  C=INF  D=INF
  Edges: [(A,B,1), (A,C,4), (B,C,-2), (B,D,6), (C,D,3)]

Iteration 1 (relax ALL edges):
  Edge A→B(1):  0+1=1 < INF   → B=1
  Edge A→C(4):  0+4=4 < INF   → C=4
  Edge B→C(-2): 1+(-2)=-1 < 4 → C=-1   ← improved!
  Edge B→D(6):  1+6=7 < INF   → D=7
  Edge C→D(3):  -1+3=2 < 7    → D=2     ← improved!
  
  After Iteration 1: A=0  B=1  C=-1  D=2

Iteration 2 (relax ALL edges again):
  Edge A→B(1):  0+1=1 < 1? NO
  Edge A→C(4):  0+4=4 < -1? NO
  Edge B→C(-2): 1+(-2)=-1 < -1? NO
  Edge B→D(6):  1+6=7 < 2? NO
  Edge C→D(3):  -1+3=2 < 2? NO
  
  After Iteration 2: A=0  B=1  C=-1  D=2  (no changes → done!)
```

### Bellman-Ford Dry-Run Table

| Iteration | Edge Relaxed | dist[A] | dist[B] | dist[C] | dist[D] | Changed? |
|-----------|-------------|---------|---------|---------|---------|----------|
| 0 (init) | — | 0 | INF | INF | INF | — |
| 1 | A→B(1) | 0 | 1 | INF | INF | B |
| 1 | A→C(4) | 0 | 1 | 4 | INF | C |
| 1 | B→C(-2) | 0 | 1 | -1 | INF | C |
| 1 | B→D(6) | 0 | 1 | -1 | 7 | D |
| 1 | C→D(3) | 0 | 1 | -1 | 2 | D |
| 2 | all edges | 0 | 1 | -1 | 2 | no |

### Negative Cycle Detection

```
Graph: A→B(1), B→C(-3), C→A(1)
Cycle weight: 1 + (-3) + 1 = -1 (NEGATIVE!)

Iteration 1: A=-1, B=1, C=-2
Iteration 2: A=-2, B=0, C=-3
V-th check:  A→B still relaxes → NEGATIVE CYCLE DETECTED!

   A ——(1)——→ B
   ↑            |
   | (1)        | (-3)
   ↓            ↓
   ←———— C
```

---

### The Code (Basic)

```cpp
vector<int> bellmanFord(int numNodes, vector<vector<int>>& edges, int startNode) {
    vector<int> dist(numNodes, 1e9);
    dist[startNode] = 0;
    
    for (int i = 0; i < numNodes - 1; i++) {
        for (auto& edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            if (dist[u] != 1e9 && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }
    
    // Check for negative cycles
    for (auto& edge : edges) {
        int u = edge[0], v = edge[1], w = edge[2];
        if (dist[u] != 1e9 && dist[u] + w < dist[v]) {
            return {};  // negative cycle
        }
    }
    return dist;
}
// Time: O(V * E)  Space: O(V)
```

**What's happening:**
```
// if (dist[u] != 1e9 && dist[u] + w < dist[v])
//    ^         ^           ^     ^      ^     ^
//    |         |           |     |      |     └── Current best to v
//    |         |           |     |      └── Edge weight
//    |         |           |     └── Distance to u
//    |         └── Guard: skip if u unreachable (avoid overflow)
//
// Why 1e9 instead of INT_MAX?
//   INT_MAX + 5 = overflow (negative number!)
//   1e9 + 5 = 1000000005 (safe, still big)
```

---

### Bellman-Ford with Path Reconstruction

```cpp
vector<int> bellmanFordWithPath(int numNodes, vector<vector<int>>& edges, int startNode) {
    vector<int> dist(numNodes, 1e9);
    vector<int> parent(numNodes, -1);
    dist[startNode] = 0;
    
    for (int i = 0; i < numNodes - 1; i++) {
        for (auto& edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            if (dist[u] != 1e9 && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                parent[v] = u;
            }
        }
    }
    return dist;
}

vector<int> getPath(int target, vector<int>& parent) {
    vector<int> path;
    for (int v = target; v != -1; v = parent[v]) path.push_back(v);
    reverse(path.begin(), path.end());
    return path;
}
```

---

## 2. Floyd-Warshall (All-Pairs Shortest Path)

**Trigger:** The problem asks for the shortest path between **EVERY pair** of nodes. Or the graph is very small ($V \le 400$).

**The Intuition:**
An elegant DP algorithm using an Adjacency Matrix. It asks: *"Is the path from $i$ to $j$ shorter if I go through intermediate node $k$?"*

---

### Floyd-Warshall Step-by-Step Matrix Evolution

**Graph:** 4 nodes: 0→1(3), 0→2(8), 1→2(2), 2→3(1), 3→0(4)

```
Initial:
       0    1    2    3
  0 [  0    3    8   INF]
  1 [INF    0    2   INF]
  2 [INF  INF    0    1]
  3 [  4  INF  INF    0]

k=0 (via node 0):
  3→0→1: 4+3=7 < INF → [3][1]=7
  3→0→2: 4+8=12 < INF → [3][2]=12

k=1 (via nodes 0,1):
  0→1→2: 3+2=5 < 8 → [0][2]=5
  3→1→2: 7+2=9 < 12 → [3][2]=9

k=2 (via nodes 0,1,2):
  0→2→3: 5+1=6 < INF → [0][3]=6
  1→2→3: 2+1=3 < INF → [1][3]=3

k=3 (via nodes 0,1,2,3):
  1→3→0: 3+4=7 < INF → [1][0]=7
  2→3→0: 1+4=5 < INF → [2][0]=5
  2→3→1: 1+7=8 < INF → [2][1]=8

Final:
       0    1    2    3
  0 [  0    3    5    6]
  1 [  7    0    2    3]
  2 [  5    8    0    1]
  3 [  4    7    9    0]
```

### Matrix Evolution Summary

| k | Cells Updated | Path Discovered |
|---|---------------|-----------------|
| 0 | [3][1]=7, [3][2]=12 | 3→0→1, 3→0→2 |
| 1 | [0][2]=5, [3][2]=9 | 0→1→2, 3→1→2 |
| 2 | [0][3]=6, [1][3]=3 | 0→2→3, 1→2→3 |
| 3 | [1][0]=7, [2][0]=5, [2][1]=8 | 1→3→0, 2→3→0, 2→3→1 |

---

### The Code (Basic)

```cpp
void floydWarshall(int numNodes, vector<vector<int>>& matrix) {
    for (int k = 0; k < numNodes; k++) {
        for (int i = 0; i < numNodes; i++) {
            for (int j = 0; j < numNodes; j++) {
                if (matrix[i][k] != 1e9 && matrix[k][j] != 1e9) {
                    matrix[i][j] = min(matrix[i][j], matrix[i][k] + matrix[k][j]);
                }
            }
        }
    }
}
// Time: O(V^3)  Space: O(V^2)
```

**What's happening:**
```
// k = outer loop: intermediate node
// i = middle: source
// j = inner: destination
//
// matrix[i][j] = min(direct, via k)
// If path i→k→j is shorter than current i→j, update.
// After k=n-1, all nodes allowed as intermediates.
```

---

### Floyd-Warshall Negative Cycle Detection

After the algorithm completes, check the diagonal. If any `matrix[i][i] < 0`, a negative cycle exists. The cost of a cycle starting and ending at node i is negative, meaning you can loop forever.

---

### Floyd-Warshall with Path Reconstruction

```cpp
void floydWarshallWithPath(int numNodes, vector<vector<int>>& matrix) {
    vector<vector<int>> next(numNodes, vector<int>(numNodes, -1));
    for (int i = 0; i < numNodes; i++)
        for (int j = 0; j < numNodes; j++)
            if (matrix[i][j] != 1e9 && i != j) next[i][j] = j;
    
    for (int k = 0; k < numNodes; k++)
        for (int i = 0; i < numNodes; i++)
            for (int j = 0; j < numNodes; j++)
                if (matrix[i][k] != 1e9 && matrix[k][j] != 1e9)
                    if (matrix[i][k] + matrix[k][j] < matrix[i][j]) {
                        matrix[i][j] = matrix[i][k] + matrix[k][j];
                        next[i][j] = next[i][k];
                    }
}

vector<int> getPath(int i, int j, vector<vector<int>>& next) {
    if (next[i][j] == -1) return {};
    vector<int> path = {i};
    while (i != j) { i = next[i][j]; path.push_back(i); }
    return path;
}
```

---

## When to Use Which

| Scenario | Best Algorithm | Why |
|----------|---------------|-----|
| Single source, positive weights | Dijkstra | O(E log V) faster than O(VE) |
| Single source, negative weights | Bellman-Ford | Only option for negatives |
| All pairs, small graph (V≤400) | Floyd-Warshall | Simple O(V³) |
| All pairs, large sparse graph | N × Dijkstra | O(N × E log V) |
| "At most K edges" constraint | Bellman-Ford (K iters) | Limits propagation depth |
| Currency arbitrage detection | Bellman-Ford | Negative cycle = arbitrage |

---

## Quick Reference

| Item | Bellman-Ford | Floyd-Warshall |
|------|-------------|----------------|
| **Trigger** | Negative weights, single source | All pairs shortest path |
| **Time** | O(V × E) | O(V³) |
| **Space** | O(V) | O(V²) |
| **Negative weights?** | YES | YES |
| **Negative cycle?** | Detects (V-th iteration) | Detects (diagonal < 0) |
| **Best V range** | V ≤ 10,000 | V ≤ 400 |

**Bellman-Ford Quick Copy:**
```cpp
vector<int> bellmanFord(int n, vector<vector<int>>& edges, int src) {
    vector<int> dist(n, 1e9); dist[src] = 0;
    for (int i = 0; i < n-1; i++)
        for (auto& e : edges)
            if (dist[e[0]] != 1e9 && dist[e[0]]+e[2] < dist[e[1]])
                dist[e[1]] = dist[e[0]] + e[2];
    for (auto& e : edges)
        if (dist[e[0]] != 1e9 && dist[e[0]]+e[2] < dist[e[1]])
            return {};
    return dist;
}
```

**Floyd-Warshall Quick Copy:**
```cpp
void floydWarshall(vector<vector<int>>& dist) {
    int n = dist.size();
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] != 1e9 && dist[k][j] != 1e9)
                    dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j]);
}
```

**Decision Tree:**
```
Need shortest path?
├── Unweighted graph? → BFS
├── Single source?
│   ├── All positive weights? → Dijkstra
│   └── Has negative weights? → Bellman-Ford
└── All pairs?
    ├── V ≤ 400? → Floyd-Warshall
    └── V > 400? → Run Dijkstra from each node
```

---

## Why V-1 Iterations in Bellman-Ford?

In a graph with V nodes, the longest possible simple path (no repeated nodes) has exactly V-1 edges. Each iteration of Bellman-Ford guarantees that the shortest path using at most i+1 edges has been found.

```
Iteration 0: shortest paths using at most 1 edge
Iteration 1: shortest paths using at most 2 edges
...
Iteration V-2: shortest paths using at most V-1 edges

After V-1 iterations: all shortest paths found (if no negative cycle)
```

If after V-1 iterations you can STILL relax an edge, there must be a cycle, and since distances are still decreasing, it must be a negative cycle.

---

## Edge Cases

| Case | Bellman-Ford | Floyd-Warshall |
|------|-------------|----------------|
| Disconnected nodes | dist stays INF | matrix[i][j] stays INF |
| Self-loops | Ignored (dist[u]+w < dist[u] is false for positive self-loops) | matrix[i][i] = 0 stays 0 |
| Multiple edges between same pair | All considered, min wins | Final value is shortest |
| Single node graph | Trivially correct | Trivially correct |
| Very large weights | Use 1e9 (not INT_MAX) to avoid overflow | Same overflow concern |
| Negative self-loop | Detected as negative cycle | matrix[i][i] < 0 |

---

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Using INT_MAX with addition | INT_MAX + weight overflows | Use 1e9 as infinity |
| Bellman-Ford with V iterations instead of V-1 | Extra iteration unnecessary, wastes time | Loop V-1 times |
| Floyd-Warshall missing the k check | Forgetting that k is the OUTER loop | k must be outermost |
| Using Dijkstra with negative weights | Dijkstra assumes greedy is optimal | Use Bellman-Ford instead |
| Forgetting negative cycle check | Bellman-Ford returns partial result | Always run V-th iteration check |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Take the chapter's Bellman-Ford graph (A=0, B=1, C=2, D=3) but feed the edges to `bellmanFord` in **reverse order**:

```cpp
vector<vector<int>> edges = {{2,3,3}, {1,3,6}, {1,2,-2}, {0,2,4}, {0,1,1}};
// bellmanFord(4, edges, 0)
```

Give `dist` after each of the $V - 1 = 3$ iterations. How does this compare with the chapter's trace, which converged after iteration 1?

**Q2.** In the chapter's negative-cycle graph, change `C → A` from weight 1 to weight **2**: edges `A→B(1), B→C(-3), C→A(2)` (A=0, B=1, C=2), start A. What is the cycle's total weight, what does `bellmanFord` return, and does the final check fire?

**Q3.** Take the chapter's Floyd-Warshall graph (`0→1(3), 0→2(8), 1→2(2), 2→3(1), 3→0(4)`) and **add one edge `3→1` with weight 1**. Which cells change at each `k`, and what is the final matrix?

**Q4.** On the chapter's **original** Floyd-Warshall graph, after `floydWarshallWithPath` finishes, what does `getPath(1, 0, next)` return? What does `getPath(3, 2, next)` return, and what does it cost?

### Coding Exercises

**E1 (Easy).** Return `true` if a directed graph contains a negative-weight cycle **anywhere**, even in a part not reachable from node 0.

```cpp
bool hasNegativeCycle(int n, vector<vector<int>>& edges);
// n = 3, edges = [[0,1,1],[1,2,-3],[2,0,1]]  ->  true   (cycle weight -1)
// n = 3, edges = [[0,1,1],[1,2,-3],[2,0,2]]  ->  false  (cycle weight 0)
```

**E2 (Easy–Medium).** Undirected weighted graph. For each city count the other cities reachable with shortest distance `<= threshold`. Return the city with the **smallest** count; on a tie return the city with the **largest** index.

```cpp
int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold);
// n = 4, edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], threshold = 4  ->  3
// n = 5, edges = [[0,1,2],[0,4,8],[1,2,3],[1,4,2],[2,3,1],[3,4,1]], threshold = 2  ->  0
```

**E3 (Medium).** Single-source Bellman-Ford that never gives up. Return `dist`, with `LLONG_MAX` for unreachable nodes and `LLONG_MIN` (meaning $-\infty$) for every node whose distance can be lowered forever because a negative cycle is on some path to it.

```cpp
vector<long long> shortestWithNegInf(int n, vector<vector<int>>& edges, int src);
// n = 5, edges = [[0,1,1],[1,2,-1],[2,1,-1],[2,3,2],[0,4,5]], src = 0
//   -> [0, -inf, -inf, -inf, 5]
```

#### Dry-Run: Answers

**Q1.**

| After iteration | dist[A] | dist[B] | dist[C] | dist[D] | What relaxed |
|-----------------|---------|---------|---------|---------|--------------|
| init | 0 | INF | INF | INF | — |
| 1 | 0 | 1 | 4 | INF | C→D, B→D, B→C skipped (sources still INF); A→C = 4, A→B = 1 |
| 2 | 0 | 1 | -1 | 7 | C→D = 4+3 = 7; B→D: 7 < 7? no; B→C = -1 |
| 3 | 0 | 1 | -1 | 2 | C→D = -1+3 = 2 |

The final answer is the same, `[0, 1, -1, 2]`, but it takes all $V - 1 = 3$ iterations instead of 1. In the worst edge order, information travels only one edge per iteration, which is why $V - 1$ iterations are required.

**Q2.** Cycle weight $1 + (-3) + 2 = 0$, which is **not negative**. Iteration 1: `B = 1`, `C = -2`, then `C→A: -2 + 2 = 0 < 0?` no. Iteration 2 changes nothing. The final check finds no relaxable edge, so it returns **`[0, 1, -2]`**. A zero-weight cycle never strictly improves a distance.

**Q3.**

| k | Cells updated |
|---|---------------|
| 0 | [3][2]: INF → 12 (3→0→2). [3][1] is already 1, so it is *not* set to 7 |
| 1 | [0][2]: 8 → 5; [3][2]: 12 → 3 (3→1→2 = 1 + 2) |
| 2 | [0][3] → 6; [1][3] → 3 |
| 3 | [1][0] → 7; [2][0] → 5; [2][1] → 2 (2→3→1 = 1 + 1) |

```
       0  1  2  3
  0 [  0  3  5  6 ]
  1 [  7  0  2  3 ]
  2 [  5  2  0  1 ]
  3 [  4  1  3  0 ]
```

Rows 0 and 1 are unchanged from the chapter. Row 2's `[2][1]` drops from 8 to 2, and row 3 becomes `[4, 1, 3, 0]`.

**Q4.** `getPath(1, 0)` = **`[1, 2, 3, 0]`** (cost $2 + 1 + 4 = 7$, matching `matrix[1][0]`). The relevant `next` entries: `next[1][0] = 2` (set at k=3 from `next[1][3]`, which was set at k=2 to `next[1][2] = 2`), `next[2][0] = 3`, `next[3][0] = 0`.

`getPath(3, 2)` = **`[3, 0, 1, 2]`** with cost $4 + 3 + 2 = 9$: `next[3][2] = 0`, `next[0][2] = 1`, `next[1][2] = 2`.

**E1 — reference solution**

```cpp
bool hasNegativeCycle(int n, vector<vector<int>>& edges) {
    // dist = 0 everywhere = a virtual source with 0-weight edges to every node,
    // so cycles in every component are reachable.
    vector<long long> dist(n, 0);
    for (int i = 0; i < n - 1; i++)
        for (auto& e : edges)
            if (dist[e[0]] + e[2] < dist[e[1]])
                dist[e[1]] = dist[e[0]] + e[2];
    for (auto& e : edges)
        if (dist[e[0]] + e[2] < dist[e[1]]) return true;   // the V-th check
    return false;
}
```

Starting from a single source would miss negative cycles that source can't reach. Initializing every distance to 0 avoids that, and no `1e9` guard is needed. Time $O(V \cdot E)$.

**E2 — reference solution**

```cpp
int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
    const int INF = 1e9;
    vector<vector<int>> d(n, vector<int>(n, INF));
    for (int i = 0; i < n; i++) d[i][i] = 0;
    for (auto& e : edges) {                         // undirected: fill both cells
        d[e[0]][e[1]] = min(d[e[0]][e[1]], e[2]);
        d[e[1]][e[0]] = min(d[e[1]][e[0]], e[2]);
    }
    for (int k = 0; k < n; k++)                     // k outermost!
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] != INF && d[k][j] != INF)
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j]);

    int best = -1, bestCount = INT_MAX;
    for (int i = 0; i < n; i++) {
        int cnt = 0;
        for (int j = 0; j < n; j++)
            if (i != j && d[i][j] <= distanceThreshold) cnt++;
        if (cnt <= bestCount) { bestCount = cnt; best = i; }   // <= keeps the larger index
    }
    return best;
}
```

Example 1 counts are `[2, 3, 3, 2]`, so cities 0 and 3 tie and 3 wins. Time $O(V^3)$, space $O(V^2)$.

**E3 — reference solution**

```cpp
vector<long long> shortestWithNegInf(int n, vector<vector<int>>& edges, int src) {
    const long long INF = LLONG_MAX, NEG_INF = LLONG_MIN;
    vector<long long> dist(n, INF);
    dist[src] = 0;
    for (int i = 0; i < n - 1; i++)                 // normal Bellman-Ford
        for (auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != INF && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
        }
    for (int i = 0; i < n; i++)                     // spread -inf for n more rounds
        for (auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] == INF) continue;
            if (dist[u] == NEG_INF || dist[u] + w < dist[v]) dist[v] = NEG_INF;
        }
    return dist;
}
```

Any edge that still relaxes after $V - 1$ rounds touches a negative cycle. Anything reachable from such a node is also unbounded, and $V$ more rounds are enough to push $-\infty$ along any simple path. Node 4 is reached only from 0, so it keeps 5. Time $O(V \cdot E)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Bellman-Ford & Floyd-Warshall**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 bellman floyd** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

