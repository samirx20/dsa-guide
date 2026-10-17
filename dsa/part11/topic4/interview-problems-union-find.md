# Part 11, Topic 4: Union-Find (Disjoint Set Union)
## Interview Problems Walkthrough

DSU transforms complex graph problems into incredibly simple array manipulations.

---

### Problem Classification Table

| Problem | Difficulty | DSU Pattern | Key Insight |
|---------|------------|-------------|-------------|
| Redundant Connection | Medium | Cycle Detection | First edge connecting same component = cycle |
| Network Connected | Medium | Component Count | Need (components - 1) operations |
| Accounts Merge | Medium | String → ID Mapping | Map emails to integers, DSU on IDs |
| Min Cost Connect | Medium | Kruskal's MST | Sort edges, greedily add if no cycle |

---

### Solution Approach Comparison

| Approach | When to Use | Pros | Cons |
|----------|-------------|------|------|
| DFS/BFS | Finding connected components | Simple to implement | O(V+E) per query |
| **DSU** | **Dynamic connectivity** | **O(α(N)) amortized** | **Extra space for parent array** |
| Prim's | MST with dense graphs | O(V²) or O(E log V) | Requires priority queue |
| **Kruskal's** | **MST with sparse graphs** | **O(E log E)** | **Needs DSU** |

---

### 1. Redundant Connection (Medium)

**Trigger:** A tree is an undirected graph with no cycles. You are given a tree that had exactly one extra edge added to it. Find the edge that created the cycle and remove it.

**Intuition:** This is the absolute textbook use case for DSU.
Initialize a DSU. Iterate through the given list of edges. For every edge `[u, v]`, call `unite(u, v)`.
The very first time `unite` returns `false`, it means adding this edge connected two nodes that were already connected. **This edge created the cycle!** Return `[u, v]` immediately.

#### Step-by-Step Walkthrough

```
Input: edges = [[1,2],[1,3],[2,3]]

Step 1: unite(1, 2)
═════════════════════
   DSU: {1,2} separate components
   find(1)=1, find(2)=2, different roots
   parent[2] = 1
   Result: true (merged)
   Components: {1,2}, {3}

Step 2: unite(1, 3)
═════════════════════
   DSU: {1,2}, {3}
   find(1)=1, find(3)=3, different roots
   parent[3] = 1
   Result: true (merged)
   Components: {1,2,3}

Step 3: unite(2, 3)
═════════════════════
   DSU: {1,2,3}
   find(2)=1, find(3)=1, SAME root!
   Result: false → CYCLE DETECTED
   Return [2, 3]
```

#### Dry-Run Table

| Edge | find(u) | find(v) | Same Root? | Action | parent[] |
|------|---------|---------|------------|--------|----------|
| [1,2] | 1 | 2 | No | Merge 2→1 | [0,1,1,3] |
| [1,3] | 1 | 3 | No | Merge 3→1 | [0,1,1,1] |
| [2,3] | 1 | 1 | **Yes** | **Cycle!** | — |

#### Code

```cpp
vector<int> findRedundantConnection(vector<vector<int>>& edges) {
    int n = edges.size();
    UnionFind uf(n + 1);

    for (auto& edge : edges) {
        if (!uf.unite(edge[0], edge[1])) {
            return edge;
        }
    }
    return {};
}
```

**What's happening:**
```cpp
// UnionFind uf(n + 1):  1-based indexing, so size is n+1
// 
// For each edge [u, v]:
//   unite(u, v) returns false if u and v already share root
//   → This edge creates a cycle → return it immediately
//
// Example: edges = [[1,2],[1,3],[2,3]]
//   unite(1,2) → true   (merged)
//   unite(1,3) → true   (merged)
//   unite(2,3) → false  (cycle!) → return [2,3]
```

---

### 2. Number of Operations to Make Network Connected (Medium)

**Trigger:** You have $N$ computers and a list of cables connecting them. You can unplug a cable and move it anywhere. Return the minimum moves to connect ALL computers.

**Intuition:** 
1. If the total number of cables is less than $N - 1$, it is mathematically impossible to connect all computers. Return `-1`.
2. Initialize a DSU. Iterate through all cables. If `unite` returns `true`, we successfully connected two separate networks. If it returns `false`, that cable is **redundant** (it connects computers that are already connected).
3. We don't even need to track the redundant cables. If we have enough total cables (Step 1), the minimum operations to connect all computers is simply `(Total number of disconnected components) - 1`.
4. How do you find the number of disconnected components? Start with $N$ components. Every time `unite` returns `true`, subtract 1 from the count. The answer is `count - 1`.

#### Step-by-Step Walkthrough

```
Input: n = 4, connections = [[0,1],[0,2],[1,2]]

Step 1: Check cable count
═════════════════════════
   Cables = 3, Need = n-1 = 3
   3 >= 3 → Possible

Step 2: Process cables
═══════════════════════
   unite(0,1) → true  (components: 4→3)
   unite(0,2) → true  (components: 3→2)
   unite(1,2) → false (redundant, components stays 2)

Step 3: Calculate result
════════════════════════
   Components = 2
   Operations needed = 2 - 1 = 1
```

#### Dry-Run Table

| Cable | find(u) | find(v) | Result | Components |
|-------|---------|---------|--------|------------|
| [0,1] | 0 | 1 | true | 4 → 3 |
| [0,2] | 0 | 2 | true | 3 → 2 |
| [1,2] | 0 | 0 | false | 2 (unchanged) |

#### Code

```cpp
int makeConnected(int n, vector<vector<int>>& connections) {
    if (connections.size() < n - 1) return -1;

    UnionFind uf(n);
    int components = n;

    for (auto& conn : connections) {
        if (uf.unite(conn[0], conn[1])) {
            components--;
        }
    }

    return components - 1;
}
```

**What's happening:**
```cpp
// connections.size() < n - 1:  Not enough cables → impossible
//
// components = n:  Start with each computer as its own component
//
// For each cable [u, v]:
//   unite(u, v) returns true → merged two components → decrement
//   unite(u, v) returns false → redundant cable, ignore
//
// Final: need (components - 1) more cables to connect all
//
// Example: n=4, connections=[[0,1],[0,2],[1,2]]
//   After processing: components = 2
//   Answer: 2 - 1 = 1 (need 1 more cable)
```

---

### 3. Accounts Merge (Medium)

**Trigger:** Given a list of accounts where each account contains a name and a list of emails, merge the accounts if they share at least one email.

**Intuition:** DSU on strings (or mapping strings to integers).
1. We need to group Emails, not Names (because "John" could be two different people, but `john@abc.com` is definitively one person).
2. Create an `unordered_map<string, int> emailToIndex` and an `unordered_map<string, string> emailToName`.
3. Give every unique email an integer ID (0, 1, 2...).
4. Initialize a DSU of size = Total Unique Emails.
5. Iterate through the accounts. For every account, `unite` the ID of the first email with the IDs of all subsequent emails in that account.
6. The DSU has now perfectly grouped all connected emails.
7. Iterate through the emails. Use `find(id)` to get the "Boss ID". Create a `unordered_map<int, vector<string>>` where the Key is the Boss ID, and push the emails into the corresponding vector.
8. Sort the vectors alphabetically and attach the Name.

#### Step-by-Step Walkthrough

```
Input: accounts = [
  ["John", "john@mail.com", "john_work@mail.com"],
  ["John", "john@mail.com", "john_personal@mail.com"],
  ["Mary", "mary@mail.com"]
]

Step 1: Assign email IDs
═════════════════════════
   john@mail.com      → 0
   john_work@mail.com → 1
   john_personal@mail.com → 2
   mary@mail.com      → 3

Step 2: Process Account 0
═════════════════════════
   Unite first email (0) with rest:
   unite(0, 1) → true
   Components: {0,1}, {2}, {3}

Step 3: Process Account 1
═════════════════════════
   Unite first email (0) with rest:
   unite(0, 2) → true
   Components: {0,1,2}, {3}

Step 4: Process Account 2
═════════════════════════
   Only one email, nothing to unite
   Components: {0,1,2}, {3}

Step 5: Group by root
═══════════════════════
   email 0: find(0) = 0 → group[0] = ["john@mail.com"]
   email 1: find(1) = 0 → group[0] = ["john@mail.com", "john_work@mail.com"]
   email 2: find(2) = 0 → group[0] = ["john@mail.com", "john_work@mail.com", "john_personal@mail.com"]
   email 3: find(3) = 3 → group[3] = ["mary@mail.com"]

Step 6: Format output
═══════════════════════
   Group 0: ["John", "john@mail.com", "john_personal@mail.com", "john_work@mail.com"] (sorted)
   Group 3: ["Mary", "mary@mail.com"]
```

#### Dry-Run Table

| Account | First Email | unite operations | Components |
|---------|-------------|------------------|------------|
| ["John", e0, e1] | 0 | unite(0,1) → true | {0,1} |
| ["John", e0, e2] | 0 | unite(0,2) → true | {0,1,2} |
| ["Mary", e3] | 3 | (none) | {3} |

#### Code

```cpp
vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
    unordered_map<string, int> emailToIndex;
    unordered_map<string, string> emailToName;
    int emailCount = 0;

    for (auto& account : accounts) {
        string name = account[0];
        for (int i = 1; i < account.size(); i++) {
            string email = account[i];
            emailToName[email] = name;
            if (emailToIndex.find(email) == emailToIndex.end()) {
                emailToIndex[email] = emailCount++;
            }
        }
    }

    UnionFind uf(emailCount);

    for (auto& account : accounts) {
        int firstIndex = emailToIndex[account[1]];
        for (int i = 2; i < account.size(); i++) {
            int currentIndex = emailToIndex[account[i]];
            uf.unite(firstIndex, currentIndex);
        }
    }

    unordered_map<int, vector<string>> groups;
    for (auto& [email, index] : emailToIndex) {
        int root = uf.find(index);
        groups[root].push_back(email);
    }

    vector<vector<string>> result;
    for (auto& [root, emails] : groups) {
        sort(emails.begin(), emails.end());
        vector<string> merged = {emailToName[emails[0]]};
        merged.insert(merged.end(), emails.begin(), emails.end());
        result.push_back(merged);
    }

    return result;
}
```

**What's happening:**
```cpp
// emailToIndex: Maps each unique email to an integer ID
// emailToName:  Maps each email to its account name
//
// Step 1: Assign IDs to all emails (0, 1, 2, ...)
//
// Step 2: For each account, unite all emails with the first email
//   Account ["John", e0, e1, e2]:
//     unite(0, 1), unite(0, 2) → all emails in same component
//
// Step 3: Group emails by their root ID
//   All emails with same root belong to same person
//
// Step 4: Sort each group and prepend the name
```

---

### 4. Min Cost to Connect All Points (Medium)

**Trigger:** Given $N$ points on a 2D plane, find the minimum cost to connect all points. Cost is the Manhattan distance: $|x1 - x2| + |y1 - y2|$.

**Intuition:** This problem asks for a **Minimum Spanning Tree (MST)**. You have two options: Prim's Algorithm or Kruskal's Algorithm.
**Kruskal's Algorithm** is usually easier to write because it uses DSU.

#### Kruskal's MST Algorithm Explained

```
Kruskal's Algorithm (with DSU):
═══════════════════════════════════════
1. Generate all possible edges between points
2. Sort edges by weight (distance) ascending
3. For each edge (in sorted order):
   a. If the two endpoints are in different components:
      - Add edge to MST
      - Union the two components
      - Add weight to total cost
   b. If same component: skip (would create cycle)
4. Stop when MST has N-1 edges
```

#### Step-by-Step Walkthrough

```
Input: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]

Step 1: Generate all edges with Manhattan distances
═══════════════════════════════════════════════════
   (0,1): |0-2| + |0-2| = 4
   (0,2): |0-3| + |0-10| = 13
   (0,3): |0-5| + |0-2| = 7
   (0,4): |0-7| + |0-0| = 7
   (1,2): |2-3| + |2-10| = 9
   (1,3): |2-5| + |2-2| = 3
   (1,4): |2-7| + |2-0| = 7
   (2,3): |3-5| + |10-2| = 10
   (2,4): |3-7| + |10-0| = 14
   (3,4): |5-7| + |2-0| = 4

Step 2: Sort edges by distance
═══════════════════════════════
   (1,3): 3
   (0,1): 4
   (3,4): 4
   (0,3): 7
   (0,4): 7
   (1,4): 7
   (1,2): 9
   (2,3): 10
   (0,2): 13
   (2,4): 14

Step 3: Kruskal's with DSU
════════════════════════════
   Edge (1,3): unite(1,3) → true, cost=3, edges=1
   Edge (0,1): unite(0,1) → true, cost=3+4=7, edges=2
   Edge (3,4): unite(3,4) → true, cost=7+4=11, edges=3
   Edge (0,3): unite(0,3) → false (already connected)
   Edge (0,4): unite(0,4) → false (already connected)
   Edge (1,4): unite(1,4) → false (already connected)
   Edge (1,2): unite(1,2) → true, cost=11+9=20, edges=4
   STOP: edges = 4 = n-1

Step 4: Result
═══════════════
   MST edges: (1,3), (0,1), (3,4), (1,2)
   Total cost: 20
```

#### Dry-Run Table

| Edge | Distance | find(u) | find(v) | Same? | Action | Cost | Edges |
|------|----------|---------|---------|-------|--------|------|-------|
| (1,3) | 3 | 1 | 3 | No | Add | 3 | 1 |
| (0,1) | 4 | 0 | 1 | No | Add | 7 | 2 |
| (3,4) | 4 | 1 | 4 | No | Add | 11 | 3 |
| (0,3) | 7 | 1 | 1 | **Yes** | Skip | 11 | 3 |
| (0,4) | 7 | 1 | 1 | **Yes** | Skip | 11 | 3 |
| (1,4) | 7 | 1 | 1 | **Yes** | Skip | 11 | 3 |
| (1,2) | 9 | 1 | 2 | No | Add | 20 | 4 |

#### Code

```cpp
int minCostConnectPoints(vector<vector<int>>& points) {
    int n = points.size();
    vector<vector<int>> edges;

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int dist = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1]);
            edges.push_back({dist, i, j});
        }
    }

    sort(edges.begin(), edges.end());

    UnionFind uf(n);
    int totalCost = 0;
    int edgesAdded = 0;

    for (auto& edge : edges) {
        int dist = edge[0], u = edge[1], v = edge[2];

        if (uf.unite(u, v)) {
            totalCost += dist;
            edgesAdded++;
            if (edgesAdded == n - 1) break;
        }
    }

    return totalCost;
}
```

**What's happening:**
```cpp
// Step 1: Generate all n*(n-1)/2 edges with Manhattan distances
//   For points [[0,0],[2,2],[3,10],[5,2],[7,0]]:
//   edges = [[4,0,1], [13,0,2], [7,0,3], [7,0,4], ...]
//
// Step 2: Sort edges by distance (ascending)
//   Greedy: always try cheapest edge first
//
// Step 3: Kruskal's algorithm
//   For each edge in sorted order:
//     If endpoints are in different components → add to MST
//     If same component → skip (would create cycle)
//
// Step 4: Stop when MST has n-1 edges (tree property)
//   A tree with n nodes has exactly n-1 edges
```

---

### Quick Reference Table

| Problem | DSU Operations | Key Insight |
|---------|----------------|-------------|
| Redundant Connection | unite() returns false | Cycle = edge connecting same component |
| Network Connected | count components | Answer = components - 1 |
| Accounts Merge | unite emails | Map strings to integers first |
| Min Cost Connect | Kruskal's MST | Sort edges, greedy add |

**Pattern Recognition:**
- **"Find cycle in undirected graph"** → DSU, first false return
- **"Connect all components"** → DSU, count components
- **"Merge items with shared property"** → DSU, map property to ID
- **"Minimum cost to connect"** → Kruskal's MST with DSU

**Time Complexity Summary:**
| Operation | Complexity |
|-----------|------------|
| DSU initialization | O(N) |
| Single find/unite | O(α(N)) ≈ O(1) |
| Full Kruskal's | O(E log E) |
| Accounts Merge | O(E log E) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems union find** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

