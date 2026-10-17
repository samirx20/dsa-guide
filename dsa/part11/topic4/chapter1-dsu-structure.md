# Part 11, Topic 4: Union-Find (Disjoint Set Union)
## Chapter 1: The DSU Structure & Optimizations

Union-Find (also known as Disjoint Set Union or DSU) is an incredibly elegant data structure that solves one specific problem perfectly: **Keeping track of connected components in an undirected graph.**

**Trigger:** The problem asks you to group elements, find the number of connected components, or check if adding an edge creates a cycle in an *undirected* graph.

---

### 1. The Core Concept

Imagine 5 isolated cities: `[0, 1, 2, 3, 4]`.
Every city is its own "boss" (parent).
If we build a road between `0` and `1`, they become a connected component. We arbitrarily choose `0` to be the "boss" of the group. Now `parent[1] = 0`.
If we connect `1` and `2`, we don't make `1` the boss of `2`. We look up `1`'s ultimate boss (`0`), and make `0` the boss of `2`. `parent[2] = 0`.

A DSU supports two operations in amortized $O(1)$ time:
1. **Find:** Who is the ultimate boss of node $X$?
2. **Union:** Connect node $X$ and node $Y$ by making one boss submit to the other.

#### Initial State: 5 Isolated Cities

```
Index:    0     1     2     3     4
         ┌─┐   ┌─┐   ┌─┐   ┌─┐   ┌─┐
Parent:  │0│   │1│   │2│   │3│   │4│   ← Each node is its own parent
         └─┘   └─┘   └─┘   └─┘   └─┘
          ↓     ↓     ↓     ↓     ↓
         [0]   [1]   [2]   [3]   [4]   ← 5 separate trees (each height 0)

Rank:    [0]   [0]   [0]   [0]   [0]   ← All ranks are 0
```

---

### 2. The Implementation

To achieve $O(1)$ performance, DSU requires two optimizations:
- **Path Compression:** When finding the boss of node $X$, if the path to the boss is very long (`X -> Y -> Z -> Boss`), we instantly rewire `X` (and `Y` and `Z`) to point *directly* to the `Boss`. Future lookups will be instant!
- **Union by Rank:** When merging two groups, always make the "smaller" group submit to the "larger" group. This keeps the overall tree height extremely flat.

#### Basic DSU (No Optimizations)

```cpp
#include <vector>
using namespace std;

class DSUBasic {
private:
    vector<int> parent;

public:
    DSUBasic(int size) {
        parent.resize(size);
        for (int i = 0; i < size; i++) {
            parent[i] = i;
        }
    }

    int find(int i) {
        while (parent[i] != i) {
            i = parent[i];
        }
        return i;
    }

    void unite(int i, int j) {
        int rootI = find(i);
        int rootJ = find(j);
        parent[rootI] = rootJ;
    }
};
```

**What's happening:**
```cpp
parent[i] = i;  // Each node points to itself (its own root)
// 0 → 0, 1 → 1, 2 → 2, 3 → 3, 4 → 4
//
// find(2) walks up until parent[i] == i:
//   parent[2] = 2? YES → return 2
//
// unite(0, 1):
//   rootI = find(0) = 0
//   rootJ = find(1) = 1
//   parent[0] = 1    ← 0 now points to 1
//   Tree: 1 ← 0
//
// unite(2, 3):
//   rootI = find(2) = 2
//   rootJ = find(3) = 3
//   parent[2] = 3    ← 2 now points to 3
//   Tree: 3 ← 2
//
// unite(1, 3):
//   rootI = find(1) = 1
//   rootJ = find(3) = 3
//   parent[1] = 3    ← Chain: 0 → 1 → 3 ← 2
//
// Now find(0) must walk: 0 → 1 → 3 (slow!)
```

**Problem:** Without optimization, the tree can become a long chain. Finding the root of node 0 requires O(N) steps.

#### DSU with Path Compression Only

```cpp
#include <vector>
using namespace std;

class DSUPathCompression {
private:
    vector<int> parent;

public:
    DSUPathCompression(int size) {
        parent.resize(size);
        for (int i = 0; i < size; i++) {
            parent[i] = i;
        }
    }

    int find(int i) {
        if (parent[i] == i) {
            return i;
        }
        parent[i] = find(parent[i]);
        return parent[i];
    }

    void unite(int i, int j) {
        int rootI = find(i);
        int rootJ = find(j);
        parent[rootI] = rootJ;
    }
};
```

**What's happening:**
```cpp
// Path Compression: parent[i] = find(parent[i])
//
// Before find(0) — chain: 0 → 1 → 3 → 5 (root)
//   0
//   ↓
//   1
//   ↓
//   3
//   ↓
//   5
//
// After find(0) — all nodes point directly to root:
//   0 → 5
//   1 → 5
//   3 → 5
//   5
//
// The key line: parent[i] = find(parent[i]);
// Recursively finds root, then rewires current node
```

#### DSU with Union by Size

```cpp
#include <vector>
using namespace std;

class DSUUnionBySize {
private:
    vector<int> parent;
    vector<int> size;

public:
    DSUUnionBySize(int n) {
        parent.resize(n);
        size.resize(n, 1);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
    }

    int find(int i) {
        if (parent[i] == i) {
            return i;
        }
        parent[i] = find(parent[i]);
        return parent[i];
    }

    bool unite(int i, int j) {
        int rootI = find(i);
        int rootJ = find(j);

        if (rootI == rootJ) return false;

        if (size[rootI] < size[rootJ]) {
            parent[rootI] = rootJ;
            size[rootJ] += size[rootI];
        } else {
            parent[rootJ] = rootI;
            size[rootI] += size[rootJ];
        }

        return true;
    }

    int getSize(int i) {
        return size[find(i)];
    }
};
```

**What's happening:**
```cpp
// Union by Size: attach smaller tree under larger tree
//
// unite(0, 1): size[root0]=1, size[root1]=1
//   Same size → attach 1 under 0
//   size[0] = 1 + 1 = 2
//   Tree: 0 ← 1
//
// unite(2, 3): size[root2]=1, size[root3]=1
//   Same size → attach 3 under 2
//   size[2] = 1 + 1 = 2
//   Tree: 2 ← 3
//
// unite(0, 2): size[root0]=2, size[root2]=2
//   Same size → attach root2 under root0
//   size[0] = 2 + 2 = 4
//   Tree:
//     0
//    / \
//   1   2
//       |
//       3
//
// getSize(3) → find(3) → 0 → size[0] = 4 ✓
```

#### DSU with Union by Rank (Production Quality)

```cpp
#include <vector>
using namespace std;

class UnionFind {
private:
    vector<int> parent;
    vector<int> rank;

public:
    UnionFind(int size) {
        parent.resize(size);
        rank.resize(size, 0);

        for (int i = 0; i < size; i++) {
            parent[i] = i;
        }
    }

    int find(int i) {
        if (parent[i] == i) {
            return i;
        }
        parent[i] = find(parent[i]);
        return parent[i];
    }

    bool unite(int i, int j) {
        int rootI = find(i);
        int rootJ = find(j);

        if (rootI == rootJ) return false;

        if (rank[rootI] < rank[rootJ]) {
            parent[rootI] = rootJ;
        } else if (rank[rootI] > rank[rootJ]) {
            parent[rootJ] = rootI;
        } else {
            parent[rootJ] = rootI;
            rank[rootI]++;
        }

        return true;
    }
};
```

**What's happening:**
```cpp
// Rank tracks the HEIGHT of each tree
// When two trees have equal rank, attaching one under the other
// increases the rank by 1
//
// rank[rootI] < rank[rootJ]:
//   Tree I is shorter → attach I under J (no rank change)
//
// rank[rootI] > rank[rootJ]:
//   Tree J is shorter → attach J under I (no rank change)
//
// rank[rootI] == rank[rootJ]:
//   Same height → attach one under other, rank++
```

---

### 3. Path Compression: Step-by-Step Visualization

```
Step 1: Initial chain (no compression)
═══════════════════════════════════════
   0 → 1 → 2 → 3 → 4 (root)
   
   parent = [1, 2, 3, 4, 4]
   rank   = [0, 0, 0, 0, 0]

Step 2: find(0) — recursive call unwinds
═══════════════════════════════════════
   find(0) calls find(1)
     find(1) calls find(2)
       find(2) calls find(3)
         find(3) calls find(4)
           find(4): parent[4] == 4 → return 4
         
         parent[3] = 4, return 4
       parent[2] = 4, return 4
     parent[1] = 4, return 4
   parent[0] = 4, return 4

Step 3: After path compression
═══════════════════════════════
   0 → 4 (root)
   1 → 4 (root)
   2 → 4 (root)
   3 → 4 (root)
   4
   
   parent = [4, 4, 4, 4, 4]
   rank   = [0, 0, 0, 0, 0]
   
   Now find(0) is O(1)! All nodes point directly to root.
```

---

### 4. Union by Rank: Step-by-Step Visualization

```
Step 1: unite(0, 1) — rank equal (0 == 0)
═══════════════════════════════════════════
   Before:
   [0]   [1]
   
   After (1 becomes child of 0):
     0
     |
     [1]
   
   parent = [0, 0, 2, 3, 4]
   rank   = [1, 0, 0, 0, 0]  ← rank[0] increased

Step 2: unite(2, 3) — rank equal (0 == 0)
═══════════════════════════════════════════
   Before:
   [2]   [3]
   
   After (3 becomes child of 2):
     2
     |
     [3]
   
   parent = [0, 0, 2, 2, 4]
   rank   = [1, 0, 1, 0, 0]  ← rank[2] increased

Step 3: unite(0, 2) — rank equal (1 == 1)
═══════════════════════════════════════════
   Before:
     0       2
     |       |
     [1]     [3]
   
   After (2 becomes child of 0):
       0
      / \
    [1]  2
         |
        [3]
   
   parent = [0, 0, 0, 2, 4]
   rank   = [2, 0, 1, 0, 0]  ← rank[0] increased

Step 4: unite(4, 0) — rank unequal (0 < 2)
═══════════════════════════════════════════
   Before:
       0       [4]
      / \
    [1]  2
         |
        [3]
   
   After (4 becomes child of 0, rank stays 2):
       0
      /|\
    [1] 2  4
        |
       [3]
   
   parent = [0, 0, 0, 2, 0]
   rank   = [2, 0, 1, 0, 0]  ← rank unchanged (4 was shorter)
```

---

### 5. Dry-Run Table: Complete Trace

| Operation | Action | parent[] | rank[] | Tree Structure |
|-----------|--------|----------|--------|----------------|
| Init | DSU(5) | [0,1,2,3,4] | [0,0,0,0,0] | [0][1][2][3][4] |
| unite(0,1) | 1→0 | [0,0,2,3,4] | [1,0,0,0,0] | 0←1, [2][3][4] |
| unite(2,3) | 3→2 | [0,0,2,2,4] | [1,0,1,0,0] | 0←1, 2←3, [4] |
| unite(0,2) | 2→0 | [0,0,0,2,4] | [2,0,1,0,0] | 0←{1,2←3}, [4] |
| unite(4,0) | 4→0 | [0,0,0,2,0] | [2,0,1,0,0] | 0←{1,2←3,4} |
| find(3) | path compress | [0,0,0,0,0] | [2,0,1,0,0] | 3→0 (was 3→2→0) |

---

### 6. Cycle Detection in Undirected Graphs

In Chapter 1, we used DFS to detect cycles. DSU can do it faster and easier for *undirected* graphs.

If you iterate through a list of edges, and for edge `(u, v)` you call `unite(u, v)`. 
If `unite()` returns `false`, it means `u` and `v` already share the same boss! They are already connected by some other path. Because you are adding an edge between two already-connected nodes, **you have just created a cycle.**

#### Cycle Detection Walkthrough

```
Graph:  0 — 1 — 2 — 0  (cycle exists)
        Edge list: [(0,1), (1,2), (2,0)]

Step 1: unite(0, 1)
═════════════════════
   parent = [0, 0, 2]
   Result: true (merged successfully)
   Structure: 0 ← 1, [2]

Step 2: unite(1, 2)
═════════════════════
   find(1) = 0, find(2) = 2
   parent[2] = 0
   parent = [0, 0, 0]
   Result: true (merged successfully)
   Structure: 0 ← {1, 2}

Step 3: unite(2, 0)
═════════════════════
   find(2) = 0, find(0) = 0
   rootI == rootJ → Already connected!
   Result: false → CYCLE DETECTED!
```

#### Cycle Detection Code

```cpp
bool hasCycle(vector<vector<int>>& edges, int n) {
    UnionFind uf(n);
    
    for (auto& edge : edges) {
        if (!uf.unite(edge[0], edge[1])) {
            return true;  // Cycle detected
        }
    }
    return false;
}
```

**What's happening:**
```cpp
// For each edge (u, v):
//   unite(u, v) tries to merge two components
//   If they're already in the same component (same root),
//   adding this edge creates a cycle
//
// Example: edges = [(0,1), (1,2), (2,0)]
//   unite(0,1) → true  (different components)
//   unite(1,2) → true  (different components)
//   unite(2,0) → false (same component!) → cycle
```

---

### 7. Comparison: Which DSU Version to Use?

| Version | Path Compression | Union Strategy | Time Complexity | Use When |
|---------|------------------|----------------|-----------------|----------|
| Basic | None | Arbitrary | O(N) worst | Never (too slow) |
| Path Compression Only | Yes | Arbitrary | O(log N) amortized | Simple problems |
| Union by Rank Only | No | By Rank | O(log N) worst | Memory-constrained |
| Union by Size | No | By Size | O(log N) worst | Need component size |
| **Full DSU** | **Yes** | **By Rank** | **O(α(N)) ≈ O(1)** | **Production code** |

---

### Quick Reference Table

| Operation | Basic DSU | Optimized DSU |
|-----------|-----------|---------------|
| **find(x)** | O(N) worst | O(α(N)) amortized |
| **unite(x,y)** | O(N) worst | O(α(N)) amortized |
| **Space** | O(N) | O(N) |
| **Path Compression** | No | Yes |
| **Union by Rank/Size** | No | Yes |

**α(N) = Inverse Ackermann Function:** Grows so slowly that for all practical N < 10^800, α(N) ≤ 4. Effectively O(1).

---

### Summary
- Use DSU to quickly group elements and find connected components.
- **Find:** Uses recursion to achieve *Path Compression*.
- **Union:** Uses a `rank` array to attach small trees under tall trees (*Union by Rank*).
- **Time Complexity:** The Inverse Ackermann function $\alpha(N)$, which grows so slowly it is practically $O(1)$.
- **Space Complexity:** $O(N)$ for the `parent` and `rank` arrays.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The DSU Structure & Optimizations**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 dsu structure** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

