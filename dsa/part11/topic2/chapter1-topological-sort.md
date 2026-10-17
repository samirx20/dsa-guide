# Part 11, Topic 2: Topological Sort & Cycle Detection
## Chapter 1: Directed Acyclic Graphs (DAGs)

The standard BFS and DFS algorithms work on both directed and undirected graphs. However, some specific problems require arranging nodes in a strictly linear sequence based on their dependencies. This is called a **Topological Sort**.

### 1. The Trigger and The Constraint

**Trigger:** "Task B must be done after Task A", "Course 2 has a prerequisite of Course 1", "Compile File X before File Y".

**The Constraint (DAG):** You can ONLY perform a Topological Sort on a **Directed Acyclic Graph**.
- **Directed:** The edges have arrows (A $\to$ B).
- **Acyclic:** There are NO cycles. If A $\to$ B $\to$ C $\to$ A, it is impossible to sort them linearly because they infinitely depend on each other.

If a problem asks for a topological order, or asks *if* it is possible to complete all tasks, you are essentially just checking if the graph is a valid DAG (no cycles!).

### 2. Real-World Analogies

**Build Systems (Make/Bazel):** File A depends on files B and C. File B depends on D. You must compile D first, then B and C, then A. Topological sort gives you the correct compilation order. If there's a circular dependency (A depends on B, B depends on A), the build system errors out.

**University Course Registration:** Course 301 requires 201, which requires 101. You can't take 301 before 201. Topological sort gives you the order to register. A cycle would mean "Course A requires Course B which requires Course A" — impossible.

**Getting Dressed:** Shirt before jacket, pants before belt, socks before shoes. The dependency graph is a DAG. Topological sort gives a valid dressing order. A cycle like "hat before glasses, glasses before hat" means the constraints are contradictory.

**Spreadsheet Formulas:** Cell C1 = A1 + B1. Cell A1 = D1 * 2. You must compute D1 first, then A1, then C1. Excel evaluates cells in topological order. Circular references are cycles — Excel warns you.

**Task Scheduling in Manufacturing:** Part B is assembled from parts C and D. Part A is assembled from B and E. Assembly order must follow dependencies — this is topological sort on the BOM (Bill of Materials) graph.

**Key Insight:** Whenever you see "must happen before," "depends on," "prerequisite," or "blocked by," think topological sort. The answer exists if and only if the dependency graph is a DAG.

### 3. DAG Visualization

```
Course Prerequisites Example:
  0 -> 1 -> 3
  |    |
  v    v
  2 -> 3 -> 4

Adjacency List:          In-Degree Array:
0: [1, 2]                in[0] = 0 (no prereqs)
1: [3]                   in[1] = 1 (needs 0)
2: [3]                   in[2] = 1 (needs 0)
3: [4]                   in[3] = 2 (needs 1 AND 2)
4: []                    in[4] = 1 (needs 3)

Adjacency Matrix:
     0  1  2  3  4
  0 [ 0  1  1  0  0 ]  row 0: edges to 1, 2
  1 [ 0  0  0  1  0 ]  row 1: edge to 3
  2 [ 0  0  0  1  0 ]  row 2: edge to 3
  3 [ 0  0  0  0  1 ]  row 3: edge to 4
  4 [ 0  0  0  0  0 ]  row 4: no outgoing edges

Matrix[i][j] = 1 means edge from i to j.
Row sum = out-degree. Column sum = in-degree.
Sparse graphs waste space with matrices — use adjacency lists instead.
```

#### DAG vs Cyclic Graph

```
DAG (valid):                Cyclic (invalid):
0 -> 1 -> 2                 0 -> 1 -> 2
                              ^         |
No cycles, valid sort:       +----<----+
[0, 1, 2] or [0, 2, 1]

Cycle detected! Cannot topologically sort.
```

### 3. Kahn's Algorithm (BFS Approach)

Kahn's Algorithm is the most intuitive way to perform a Topological Sort. It relies on the concept of **In-Degree**.
*   **In-Degree:** The number of edges pointing *into* a node (how many prerequisites it has).

**The Strategy:**
1.  Calculate the In-Degree of every node.
2.  Find all nodes with an In-Degree of `0` (they have no prerequisites) and push them into a Queue.
3.  While the Queue is not empty:
    *   Pop a node. Add it to your `sorted_order` list.
    *   For every neighbor of that node, decrement the neighbor's In-Degree by 1 (we just completed one of their prerequisites!).
    *   If a neighbor's In-Degree hits `0`, push it into the Queue.
4.  If the size of your `sorted_order` list equals the total number of nodes, you successfully sorted the graph! If it is less, the graph contains a cycle.

#### Kahn's Algorithm Dry-Run

```
Graph: 0 -> 1 -> 3
       |    |
       v    v
       2 -> 3 -> 4

In-Degree: [0, 1, 1, 2, 1]

Step | Queue  | sortedOrder | inDegree[]  | Action
-----|--------|-------------|-------------|--------------------------------
1    | [0]    | []          | [0,1,1,2,1] | Start: node 0 has in-degree 0
2    | []     | [0]         | [0,0,0,2,1] | Pop 0, decrement neighbors 1,2
3    | [1,2]  | [0]         | [0,0,0,2,1] | Both 1 and 2 now have in-degree 0
4    | [2]    | [0,1]       | [0,0,0,1,1] | Pop 1, decrement neighbor 3
5    | []     | [0,1,2]     | [0,0,0,0,1] | Pop 2, decrement neighbor 3
6    | [3]    | [0,1,2]     | [0,0,0,0,1] | Node 3 now has in-degree 0
7    | []     | [0,1,2,3]   | [0,0,0,0,0] | Pop 3, decrement neighbor 4
8    | [4]    | [0,1,2,3]   | [0,0,0,0,0] | Node 4 now has in-degree 0
9    | []     | [0,1,2,3,4] | [0,0,0,0,0] | Pop 4, no neighbors. Done!

Result: [0, 1, 2, 3, 4]
Size (5) == numNodes (5) -> Valid DAG!
```

**The Code Template:**
```cpp
#include <vector>
#include <queue>

using namespace std;

vector<int> topologicalSort(int numNodes, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adjList(numNodes);
    vector<int> inDegree(numNodes, 0);
    
    // 1. Build Adjacency List and In-Degree array
    for (auto& pre : prerequisites) {
        int course = pre[0];
        int prereq = pre[1];
        
        adjList[prereq].push_back(course); // prereq -> course
        inDegree[course]++;
    }
    
    // 2. Push all nodes with 0 prerequisites into the queue
    queue<int> q;
    for (int i = 0; i < numNodes; i++) {
        if (inDegree[i] == 0) q.push(i);
    }
    
    // 3. Process the queue
    vector<int> sortedOrder;
    while (!q.empty()) {
        int curr = q.front();
        q.pop();
        
        sortedOrder.push_back(curr);
        
        for (int neighbor : adjList[curr]) {
            inDegree[neighbor]--; // Completed a prerequisite
            if (inDegree[neighbor] == 0) {
                q.push(neighbor); // Ready to be taken!
            }
        }
    }
    
    // 4. Cycle Check
    if (sortedOrder.size() == numNodes) {
        return sortedOrder; // Valid DAG
    }
    return {}; // Cycle detected!
}
// Time Complexity: O(V + E)
// Space Complexity: O(V + E)
```

**What's happening:**
- Line 10-13: Build adjacency list from edge list. Each `[course, prereq]` means prereq -> course.
- Line 14: Increment in-degree for each course (counts how many prereqs it has).
- Line 18-21: Find all nodes with in-degree 0 (no prerequisites needed).
- Line 27: Pop a node that's ready to process.
- Line 29: Add to sorted order.
- Line 31-34: For each neighbor, decrement their in-degree (one prereq done). If 0, they're ready.
- Line 38-41: If sorted all nodes, valid DAG. Otherwise, cycle exists.

#### Kahn's Cycle Detection

```
Cyclic Graph: 0 -> 1 -> 2 -> 0

In-Degree: [1, 1, 1]

Step | Queue | sortedOrder | inDegree[] | Action
-----|-------|-------------|------------|------------------
1    | []    | []          | [1,1,1]    | No node with in-degree 0!
2    | Done  | []          | [1,1,1]    | Queue empty immediately

Result: [] (size 0 < numNodes 3) -> CYCLE DETECTED!
```

---

### 4. DFS-Based Topological Sort

You can also use DFS to achieve the same result. The logic is: "I can only add myself to the sorted list AFTER I have explored all my children."

**The Strategy:**
1. Maintain a `visited` set to avoid infinite loops.
2. Maintain a `path` set to detect cycles during the current DFS plunge.
3. Run DFS. If you hit a node already in `path`, a cycle exists!
4. After the `for` loop (exploring all neighbors) finishes, push the current node to a Stack or a Vector.
5. Once all nodes are processed, the Stack contains the topological order (or you just `reverse` the Vector).

*(Kahn's Algorithm is generally preferred in interviews because calculating In-Degrees feels more intuitive than managing separate `visited` and `path` states in recursion).*

#### DFS Dry-Run: Post-Order Stack

```
Graph: 0 -> 1 -> 3
       |    |
       v    v
       2 -> 3 -> 4

DFS from 0:
Step | Node | visited[]  | path[]    | Action
-----|------|------------|-----------|----------------------------------
1    | 0    | [T,F,F,F,F]| [T,F,F,F,F] | Visit 0, push to path
2    | 1    | [T,T,F,F,F]| [T,T,F,F,F] | Visit 1, push to path
3    | 3    | [T,T,F,T,F]| [T,T,F,T,F] | Visit 3, push to path
4    | 4    | [T,T,F,TT] | [T,T,F,T,T] | Visit 4, push to path
5    | -    | [T,T,F,TT] | [T,T,F,T,F] | 4 has no neighbors, pop from path
      |      |            |             | Push 4 to stack: [4]
6    | -    | [T,T,F,TT] | [T,T,F,F,F] | 3 done, pop from path
      |      |            |             | Push 3 to stack: [3,4]
7    | 2    | [T,T,T,TT] | [T,T,T,F,F] | Visit 2, push to path
8    | 3    | [T,T,T,TT] | -           | 3 already visited, skip
9    | -    | [T,T,T,TT] | [T,T,T,F,F] | 2 done, pop from path
      |      |            |             | Push 2 to stack: [2,3,4]
10   | -    | [T,T,T,TT] | [T,F,F,F,F] | 1 done, pop from path
      |      |            |             | Push 1 to stack: [1,2,3,4]
11   | -    | [T,T,T,TT] | [F,F,F,F,F] | 0 done, pop from path
      |      |            |             | Push 0 to stack: [0,1,2,3,4]

Stack (top to bottom): [0, 1, 2, 3, 4]
Reversed: [0, 1, 2, 3, 4] -> Topological Order!
```

#### Code: DFS-Based Topological Sort
```cpp
vector<int> topoSortDFS(int numNodes, vector<vector<int>>& adjList) {
    vector<bool> visited(numNodes, false);
    vector<bool> inPath(numNodes, false);
    vector<int> order;
    bool hasCycle = false;
    
    function<void(int)> dfs = [&](int node) {
        if (inPath[node]) { hasCycle = true; return; } // Cycle detected
        if (visited[node]) return;
        
        visited[node] = true;
        inPath[node] = true;
        
        for (int neighbor : adjList[node]) {
            dfs(neighbor);
        }
        
        inPath[node] = false;   // Backtrack: remove from current path
        order.push_back(node);  // Post-order: add AFTER all children
    };
    
    for (int i = 0; i < numNodes; i++) {
        if (!visited[i]) dfs(i);
    }
    
    if (hasCycle) return {};
    reverse(order.begin(), order.end());
    return order;
}
```

**What's happening:**
- Line 5: `inPath` tracks nodes on the current DFS stack (cycle detection).
- Line 9: If we revisit a node in the current path, cycle exists.
- Line 10: If already fully processed, skip (avoid re-processing).
- Line 12-13: Mark as visited AND in current path.
- Line 15-17: Recurse into all neighbors.
- Line 19-20: Post-order — push to order AFTER all children done.
- Line 23-25: Run DFS from every unvisited node (handles disconnected components).
- Line 27: Reverse post-order gives topological sort.

#### DFS Cycle Detection Visualization

```
Cyclic Graph: 0 -> 1 -> 2 -> 0

Step | Node | visited | inPath | Action
-----|------|---------|--------|------------------------------
1    | 0    | [T]     | [T]    | Visit 0, in path
2    | 1    | [T,T]   | [T,T]  | Visit 1, in path
3    | 2    | [T,T,T] | [T,T,T]| Visit 2, in path
4    | 0    | -       | -      | 0 is inPath -> CYCLE!
```

#### Code: DFS with Cycle Path Reporting
```cpp
vector<int> topoSortWithCyclePath(int numNodes, vector<vector<int>>& adjList) {
    vector<int> state(numNodes, 0); // 0=unvisited, 1=in-progress, 2=done
    vector<int> parent(numNodes, -1);
    vector<int> order;
    int cycleStart = -1;
    
    function<bool(int)> dfs = [&](int node) {
        state[node] = 1; // mark in-progress
        
        for (int neighbor : adjList[node]) {
            if (state[neighbor] == 1) {
                cycleStart = neighbor;
                parent[neighbor] = node;
                return true; // cycle found
            }
            if (state[neighbor] == 0) {
                parent[neighbor] = node;
                if (dfs(neighbor)) return true;
            }
        }
        
        state[node] = 2; // mark done
        order.push_back(node);
        return false;
    };
    
    for (int i = 0; i < numNodes; i++) {
        if (state[i] == 0 && dfs(i)) {
            // Reconstruct cycle path
            vector<int> cycle;
            int curr = cycleStart;
            do {
                cycle.push_back(curr);
                curr = parent[curr];
            } while (curr != cycleStart);
            cycle.push_back(cycleStart);
            reverse(cycle.begin(), cycle.end());
            cout << "Cycle found: ";
            for (int x : cycle) cout << x << " ";
            cout << endl;
            return {};
        }
    }
    
    reverse(order.begin(), order.end());
    return order;
}
```

**What's happening:**
- Line 3: Three-state coloring: 0=unvisited, 1=in-progress (on stack), 2=done.
- Line 12: If neighbor is in-progress, we found a back edge → cycle.
- Line 17: If neighbor is done, skip — no cycle through this path.
- Line 22: Post-order push after all children processed.
- Line 31-38: Reconstruct cycle by walking parent pointers from cycleStart back to itself.
- Use case: When the problem asks you to report which specific courses form the cycle.

---

### 5. Kahn's vs DFS Comparison

| Feature | Kahn's (BFS) | DFS |
|---------|--------------|-----|
| Data Structure | Queue | Recursion / Stack |
| Cycle Detection | Incomplete sort | inPath check |
| Code Complexity | Simpler | More state tracking |
| Time Complexity | O(V + E) | O(V + E) |
| Space Complexity | O(V + E) | O(V) (recursion stack) |
| Preferred In | Interviews (easier to explain) | When DFS is already in use |
| Order Stability | Deterministic (queue order) | Depends on DFS traversal order |

---

### 6. Course Schedule Problem (Classic Application)

**Problem:** There are `numCourses` courses. `prerequisites[i] = [a, b]` means course `a` requires course `b`. Return true if you can finish all courses.

**Connection to Topological Sort:** This is literally asking "does a valid topological order exist?" which is equivalent to "is the graph a DAG?"

#### Code: Course Schedule I (Can finish?)
```cpp
bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> inDegree(numCourses, 0);
    
    for (auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
        inDegree[p[0]]++;
    }
    
    queue<int> q;
    for (int i = 0; i < numCourses; i++)
        if (inDegree[i] == 0) q.push(i);
    
    int count = 0;
    while (!q.empty()) {
        int curr = q.front(); q.pop();
        count++;
        for (int next : adj[curr]) {
            if (--inDegree[next] == 0) q.push(next);
        }
    }
    return count == numCourses;
}
```

**What's happening:**
- Line 5-7: Build graph and in-degree from prerequisites.
- Line 10-12: Enqueue all courses with no prerequisites.
- Line 16-20: Process queue, counting completed courses.
- Line 22: If count equals total courses, all can be finished (no cycle).

#### Code: Course Schedule II (Return order)
```cpp
vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> inDegree(numCourses, 0);
    
    for (auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
        inDegree[p[0]]++;
    }
    
    queue<int> q;
    for (int i = 0; i < numCourses; i++)
        if (inDegree[i] == 0) q.push(i);
    
    vector<int> order;
    while (!q.empty()) {
        int curr = q.front(); q.pop();
        order.push_back(curr);
        for (int next : adj[curr])
            if (--inDegree[next] == 0) q.push(next);
    }
    
    if (order.size() == numCourses) return order;
    return {}; // Cycle exists
}
```

**What's happening:**
- Identical to Kahn's Algorithm template.
- Line 17: Push each processed course to `order` (the result).
- Line 22: If order size != numCourses, cycle prevents all courses from being finished.

---

### 7. Alien Dictionary (Advanced Application)

**Problem:** Given a sorted dictionary of an alien language, find the character order.

**Connection:** If word A comes before word B, the first differing character in A must come before the character in B in the alien alphabet. This gives us directed edges. Topological sort gives the character order.

#### Code
```cpp
string alienOrder(vector<string>& words) {
    unordered_map<char, unordered_set<char>> adj;
    unordered_map<char, int> inDegree;
    
    // Initialize all characters
    for (auto& w : words)
        for (char c : w) {
            adj[c] = {};
            inDegree[c] = 0;
        }
    
    // Build graph from adjacent words
    for (int i = 0; i < words.size() - 1; i++) {
        string& w1 = words[i], &w2 = words[i+1];
        if (w1.size() > w2.size() && w1.substr(0, w2.size()) == w2)
            return ""; // Invalid: prefix rule violation
        for (int j = 0; j < min(w1.size(), w2.size()); j++) {
            if (w1[j] != w2[j]) {
                if (!adj[w1[j]].count(w2[j])) {
                    adj[w1[j]].insert(w2[j]);
                    inDegree[w2[j]]++;
                }
                break; // Only first differing char matters
            }
        }
    }
    
    // Kahn's Algorithm
    queue<char> q;
    for (auto& [c, deg] : inDegree)
        if (deg == 0) q.push(c);
    
    string order;
    while (!q.empty()) {
        char c = q.front(); q.pop();
        order += c;
        for (char next : adj[c])
            if (--inDegree[next] == 0) q.push(next);
    }
    
    return order.size() == inDegree.size() ? order : "";
}
```

**What's happening:**
- Line 6-10: Initialize all characters as nodes.
- Line 13-24: Compare adjacent words, find first differing character, add edge.
- Line 15-16: If longer word equals prefix of shorter word, invalid ordering.
- Line 28-32: Kahn's Algorithm to get topological order of characters.
- Line 34: If order includes all characters, valid. Otherwise, cycle in alphabet.

---

### 8. Edge Cases

| Edge Case | What Happens | How to Handle |
|-----------|--------------|---------------|
| Single node, no edges | in-degree = 0, immediate queue entry | Return [0], valid DAG |
| Single node with self-loop | in-degree = 1, never reaches 0 | Cycle detected, return [] |
| Two nodes, no edges | Both in-degree 0, either order valid | Return [0,1] or [1,0] |
| Disconnected components | Kahn's needs all in-degree-0 nodes enqueued | Initialize queue with ALL in-degree-0 nodes, not just connected ones |
| All nodes in a cycle | No node has in-degree 0 | Queue starts empty, return [] immediately |
| Diamond dependency (A→B, A→C, B→D, C→D) | D has in-degree 2 | D appears in order only after BOTH B and C processed |
| Chain (A→B→C→D) | Linear dependency | Only one valid order: [A, B, C, D] |
| Parallel chains | Multiple valid orders exist | Any interleaving preserving internal order is valid |
| Empty graph (0 nodes) | No processing needed | Return [] |
| Single edge (A→B) | A must come before B | Return [A, B] |

**Common Pitfalls:**
- Forgetting to check for cycles (sortedOrder.size() < numNodes)
- Building the graph backwards (course→prereq instead of prereq→course)
- Not enqueuing ALL in-degree-0 nodes at start (only processing connected component)
- Modifying in-degree array while iterating (process queue level-by-level to avoid this)

---

### Quick Reference

| Concept | Details | Complexity |
|---------|---------|------------|
| Topological Sort | Linear ordering of DAG nodes where all edges go left-to-right | O(V + E) |
| In-Degree | Number of edges pointing INTO a node | Used in Kahn's |
| Kahn's Algorithm | BFS-based: enqueue in-degree 0 nodes, process level by level | O(V + E) time, O(V + E) space |
| DFS Topo Sort | Post-order: push node AFTER all children explored, reverse | O(V + E) time, O(V) space |
| Cycle Detection (Kahn's) | If sortedOrder.size() < numNodes, cycle exists | Built-in to Kahn's |
| Cycle Detection (DFS) | inPath array tracks current recursion stack | O(V) additional space |
| Course Schedule | Topological sort application — check if all courses finishable | Same as topo sort |
| Alien Dictionary | Character ordering from sorted word list via topo sort | O(C + N×L) |
| DAG Requirement | Topological sort ONLY works on directed acyclic graphs | N/A |
| Multiple Valid Orders | A DAG can have multiple valid topological sorts | Depends on traversal |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Directed Acyclic Graphs (DAGs)**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 topological sort** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

