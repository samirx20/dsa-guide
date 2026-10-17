# Part 11, Topic 3: Shortest Path Algorithms
## Interview Problems Walkthrough

These problems require identifying the correct algorithm and adapting the standard templates.

---

## Problem Classification Table

| # | Problem | Difficulty | Key Constraint | Algorithm |
|---|---------|-----------|----------------|-----------|
| 1 | Network Delay Time | Medium | Single source, positive weights | Dijkstra |
| 2 | Path With Minimum Effort | Medium | Max absolute diff on path | Dijkstra (modified) |
| 3 | Cheapest Flights Within K Stops | Medium | Max K stops constraint | Bellman-Ford (modified) |
| 4 | Swim in Rising Water | Hard | Water level = max elevation | Dijkstra (modified) |

## Pattern Recognition

| Pattern | When to Recognize | Algorithm |
|---------|-------------------|-----------|
| "Shortest path" + positive weights | Standard shortest path | Dijkstra |
| "Minimum cost" + grid | Grid shortest path | Dijkstra (2D) |
| "Maximum of minimums" / "Minimum of maximums" | Bottleneck path | Dijkstra (modified) |
| "At most K edges/stops" | Limited hops | Bellman-Ford (K iterations) |

---

## Problem 1: Network Delay Time (LeetCode 743)

**Trigger:** Given edges `[u, v, w]`, how long for ALL nodes to receive a signal from node `k`?
**Intuition:** Single source, positive weights → **Dijkstra**. Answer = max(dist[]) because the last node to receive the signal determines total time.

### Step-by-Step Walkthrough

**Example:** `times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2`

```
Graph:  Node 1 ←(1)— Node 2 —(1)→ Node 3 —(1)→ Node 4
                     (source)

Step 1: Init  dist[] = [INF, INF, 0, INF]  heap = [(0,2)]
Step 2: Pop (0,2) → dist[1]=1, dist[3]=1   heap = [(1,1),(1,3)]
Step 3: Pop (1,1) → no neighbors             heap = [(1,3)]
Step 4: Pop (1,3) → dist[4]=2               heap = [(2,4)]
Step 5: Pop (2,4) → no neighbors             heap = []

Final: dist[] = [INF, 1, 0, 1, 2] → max = 2
```

### Dry-Run Table

| Step | Pop | dist[] | Key Update |
|------|-----|--------|------------|
| Init | — | [INF, INF, 0, INF] | src=0 |
| 1 | (0,2) | [INF, 1, 0, 1, INF] | Reach 1 and 3 |
| 2 | (1,1) | [INF, 1, 0, 1, INF] | No outgoing edges |
| 3 | (1,3) | [INF, 1, 0, 1, 2] | Reach destination |
| 4 | (2,4) | [INF, 1, 0, 1, 2] | Done |

### Code

```cpp
int networkDelayTime(vector<vector<int>>& times, int n, int k) {
    vector<vector<pair<int,int>>> adj(n + 1);
    for (auto& t : times) adj[t[0]].push_back({t[1], t[2]});
    
    vector<int> dist(n + 1, 1e9);
    dist[k] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, k});
    
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;  // Skip stale entries
        for (auto& [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    
    int ans = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == 1e9) return -1;
        ans = max(ans, dist[i]);
    }
    return ans;
}
// Time: O(E log V)  Space: O(V + E)
```

**What's happening:**
```
// if (d > dist[u]) continue;  ← lazy deletion
//   Stale entries in heap are skipped.
//   Only the FIRST pop for each node matters.
//
// return max(dist[])
//   Signal reaches all nodes when the SLOWEST node gets it.
//   Answer = bottleneck (maximum shortest path).
```

---

## Problem 2: Path With Minimum Effort (LeetCode 1631)

**Trigger:** 2D grid of heights. "Effort" = max absolute difference between consecutive cells. Minimize effort from top-left to bottom-right.
**Intuition:** Modified Dijkstra. Cost = max(current_effort, abs(height_diff)).

### Step-by-Step Walkthrough

**Example:** `heights = [[1,2,2],[3,8,2],[5,3,5]]`

```
Grid:    1  2  2
         3  8  2
         5  3  5

Step 1: effort[0][0]=0  heap=[(0,0,0)]
Step 2: Pop (0,0,0) → effort[0][1]=max(0,|1-2|)=1, effort[1][0]=max(0,|1-3|)=2
Step 3: Pop (1,0,1) → effort[0][2]=max(1,|2-2|)=1, effort[1][1]=max(1,|2-8|)=7
Step 4: Pop (1,0,2) → effort[1][2]=max(1,|2-2|)=1
Step 5: Pop (1,1,2) → effort[2][2]=max(1,|2-5|)=3
Step 6: Pop (2,2) at destination → RETURN 3
```

### Dry-Run Table

| Step | Pop Cell | Effort | Updated Cells |
|------|----------|--------|---------------|
| 1 | (0,0) | 0 | (0,1)=1, (1,0)=2 |
| 2 | (0,1) | 1 | (0,2)=1, (1,1)=7 |
| 3 | (0,2) | 1 | (1,2)=1 |
| 4 | (1,2) | 1 | (2,2)=3 |
| 5 | (2,2) | 3 | DESTINATION → return 3 |

### Code

```cpp
int minimumEffortPath(vector<vector<int>>& heights) {
    int rows = heights.size(), cols = heights[0].size();
    vector<vector<int>> effort(rows, vector<int>(cols, 1e9));
    effort[0][0] = 0;
    
    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> pq;
    pq.push({0, 0, 0});
    int dirs[4][2] = {{-1,0},{1,0},{0,-1},{0,1}};
    
    while (!pq.empty()) {
        auto [eff, r, c] = pq.top(); pq.pop();
        if (r == rows-1 && c == cols-1) return eff;
        if (eff > effort[r][c]) continue;
        
        for (auto& [dr, dc] : dirs) {
            int nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            int newEff = max(eff, abs(heights[r][c] - heights[nr][nc]));
            if (newEff < effort[nr][nc]) {
                effort[nr][nc] = newEff;
                pq.push({newEff, nr, nc});
            }
        }
    }
    return -1;
}
// Time: O(RC log RC)  Space: O(RC)
```

**What's happening:**
```
// int newEff = max(eff, abs(heights[r][c] - heights[nr][nc]));
//     ^          ^              ^                    ^
//     |          |              |                    └── Neighbor height
//     |          |              └── Current cell height
//     |          └── Path effort so far (bottleneck)
//     └── New bottleneck = max(old bottleneck, this step)
//
// KEY: We take MAX, not SUM. The effort of a path is its worst step.
// Dijkstra still works because "distance" is monotonic (only increases).
```

---

## Problem 3: Cheapest Flights Within K Stops (LeetCode 787)

**Trigger:** Cheapest price from `src` to `dst` with **up to K stops**.
**Intuition:** Dijkstra fails here — it ignores the stops constraint. Use **modified Bellman-Ford** with exactly K+1 iterations. K stops = K+1 edges.

### Step-by-Step Walkthrough

**Example:** `n=4, flights=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src=0, dst=3, k=1`

```
prices[] = [0, INF, INF, INF]

Iteration 1 (0 stops, 1 edge):
  tempPrices = [0, INF, INF, INF]
  0→1(100): 0+100=100 < INF → temp[1]=100
  1→2(100): INF → skip
  1→3(600): INF → skip
  2→3(200): INF → skip
  prices = [0, 100, INF, INF]

Iteration 2 (1 stop, 2 edges):
  tempPrices = [0, 100, INF, INF]
  0→1(100): 100 < 100? no
  1→2(100): 100+100=200 < INF → temp[2]=200
  1→3(600): 100+600=700 < INF → temp[3]=700
  2→3(200): INF → skip
  prices = [0, 100, 200, 700]

Result: prices[3] = 700 (path: 0→1→3, 1 stop)
```

### Dry-Run Table

| Iter | Edge | prices[u] | prices[u]+w | temp[v] | Update? |
|------|------|-----------|-------------|---------|---------|
| 1 | 0→1(100) | 0 | 100 | INF→100 | YES |
| 1 | 1→2(100) | INF | — | — | skip |
| 1 | 1→3(600) | INF | — | — | skip |
| 1 | 2→3(200) | INF | — | — | skip |
| 2 | 0→1(100) | 0 | 100 | 100 | no |
| 2 | 1→2(100) | 100 | 200 | INF→200 | YES |
| 2 | 1→3(600) | 100 | 700 | INF→700 | YES |
| 2 | 2→3(200) | INF | — | — | skip |

### Code

```cpp
int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
    vector<int> prices(n, 1e9);
    prices[src] = 0;
    
    for (int i = 0; i <= k; i++) {
        vector<int> tempPrices = prices;  // CRITICAL: copy before inner loop
        for (auto& f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (prices[u] != 1e9 && prices[u] + w < tempPrices[v]) {
                tempPrices[v] = prices[u] + w;
            }
        }
        prices = tempPrices;
    }
    return prices[dst] == 1e9 ? -1 : prices[dst];
}
// Time: O(K * E)  Space: O(V)
```

**What's happening:**
```
// vector<int> tempPrices = prices;  ← THE critical line!
//
// Without temp: 0→1 updates prices[1]=100 immediately,
// then 1→3 uses prices[1]=100 → effectively 2 edges in 1 iter!
//
// With temp: 0→1 updates tempPrices[1]=100 (prices[1] still INF).
// 1→3 checks prices[1]=INF → skip. Only 1 edge per iteration.
// After all edges: prices = tempPrices (commit).
//
// This enforces exactly K+1 edges maximum.
```

---

## Problem 4: Swim in Rising Water (LeetCode 778)

**Trigger:** N×N elevation grid, water rises uniformly. Swim between cells if both ≤ water level. Minimum time to reach bottom-right?
**Intuition:** Same as Min Effort. Dijkstra where `newTime = max(currentTime, grid[nr][nc])`.

### Step-by-Step Walkthrough

**Example:** `grid = [[0,2],[1,3]]`

```
Grid:  0  2
       1  3

Step 1: time[0][0]=0  heap=[(0,0,0)]
Step 2: Pop (0,0,0) → time[0][1]=max(0,2)=2, time[1][0]=max(0,1)=1
Step 3: Pop (1,1,0) → time[1][1]=max(1,3)=3
Step 4: Pop (2,0,1) → time[1][1]=3 (no change, 3<3? no)
Step 5: Pop (3,1,1) → DESTINATION → RETURN 3
```

### Dry-Run Table

| Step | Pop Cell | Time | Updated |
|------|----------|------|---------|
| 1 | (0,0) | 0 | (0,1)=2, (1,0)=1 |
| 2 | (1,0) | 1 | (1,1)=3 |
| 3 | (0,1) | 2 | (1,1) no change |
| 4 | (1,1) | 3 | DESTINATION → return 3 |

### Code

```cpp
int swimInWater(vector<vector<int>>& grid) {
    int n = grid.size();
    vector<vector<int>> time(n, vector<int>(n, 1e9));
    time[0][0] = grid[0][0];
    
    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> pq;
    pq.push({grid[0][0], 0, 0});
    int dirs[4][2] = {{-1,0},{1,0},{0,-1},{0,1}};
    
    while (!pq.empty()) {
        auto [t, r, c] = pq.top(); pq.pop();
        if (r == n-1 && c == n-1) return t;
        if (t > time[r][c]) continue;
        
        for (auto& [dr, dc] : dirs) {
            int nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            int newTime = max(t, grid[nr][nc]);
            if (newTime < time[nr][nc]) {
                time[nr][nc] = newTime;
                pq.push({newTime, nr, nc});
            }
        }
    }
    return -1;
}
// Time: O(N² log N²)  Space: O(N²)
```

**What's happening:**
```
// int newTime = max(t, grid[nr][nc]);
//   Must wait for water to reach neighbor's elevation.
//   Time = max(current time, neighbor elevation).
//   Same pattern as Min Effort: bottleneck = max().
```

---

## Quick Reference

| Problem | Algorithm | Time | Space | Key Trick |
|---------|-----------|------|-------|-----------|
| Network Delay Time | Dijkstra | O(E log V) | O(V+E) | Answer = max(dist[]) |
| Min Effort Path | Dijkstra (modified) | O(RC log RC) | O(RC) | cost = max(effort, diff) |
| Cheapest Flights (K stops) | Bellman-Ford (K iters) | O(K×E) | O(V) | Use tempPrices copy |
| Swim in Rising Water | Dijkstra (modified) | O(N² log N²) | O(N²) | time = max(t, elevation) |

**Common Mistakes:**
| Mistake | Problem | Fix |
|---------|---------|-----|
| Using Dijkstra with K constraint | Cheapest Flights | Use Bellman-Ford with K iterations |
| Forgetting tempPrices copy | Cheapest Flights | Always copy before inner loop |
| Using + instead of max() | Min Effort, Swim | cost = max(current, edge) |
| Returning min instead of max | Network Delay | Answer = max(dist[]) for "all nodes" |

---

## Solution Approach Comparison

| Problem | Brute Force | Optimal | Why Optimal |
|---------|-------------|---------|-------------|
| Network Delay | DFS all paths O(V!) | Dijkstra O(E log V) | Greedy ordering guarantees shortest |
| Min Effort | Try all paths O(4^(RC)) | Dijkstra with max() O(RC log RC) | Bottleneck is monotonic |
| Cheapest Flights | DFS with stops O(E^K) | Bellman-Ford K iters O(K×E) | Limits to K+1 edges exactly |
| Swim in Rising Water | Try all paths O(4^(N²)) | Dijkstra with max() O(N² log N²) | Same bottleneck pattern |

---

## When NOT to Use These Algorithms

| Scenario | Wrong Choice | Right Choice |
|----------|-------------|--------------|
| Unweighted graph | Dijkstra | BFS (simpler, O(V+E)) |
| All-pairs shortest path | Run Dijkstra N times on large graph | Floyd-Warshall if V ≤ 400 |
| Negative weights | Dijkstra | Bellman-Ford |
| K-stops constraint | Dijkstra (ignores K) | Bellman-Ford with K iterations |
| Dense graph, single source | Bellman-Ford O(VE) | Dijkstra O(E log V) with adjacency list |
| Need path reconstruction | Any algorithm | Add parent[] array to chosen algorithm |

---

## Quick Copy Template

```cpp
// Dijkstra (positive weights, single source)
int dijkstra(vector<vector<pair<int,int>>>& adj, int src, int dst) {
    int n = adj.size();
    vector<int> dist(n, 1e9); dist[src] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        if (u == dst) return d;
        for (auto& [v, w] : adj[u])
            if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
    }
    return -1;
}

// Bellman-Ford with K stops
int bellmanFordK(int n, vector<vector<int>>& edges, int src, int dst, int k) {
    vector<int> dist(n, 1e9); dist[src] = 0;
    for (int i = 0; i <= k; i++) {
        vector<int> tmp = dist;
        for (auto& e : edges)
            if (dist[e[0]] != 1e9 && dist[e[0]]+e[2] < tmp[e[1]])
                tmp[e[1]] = dist[e[0]] + e[2];
        dist = tmp;
    }
    return dist[dst] == 1e9 ? -1 : dist[dst];
}
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems shortest path** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

