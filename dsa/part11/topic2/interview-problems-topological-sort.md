# Part 11, Topic 2: Topological Sort & Cycle Detection
## Interview Problems Walkthrough

These two problems are essentially the exact same question, just asking for a slightly different return type. Master the Kahn's Algorithm template, and you master them both.

---

## Problem Classification Table

| # | Problem | Difficulty | Algorithm | Return Type | Key Variation |
|---|---------|-----------|-----------|-------------|---------------|
| 1 | Course Schedule | Medium | Kahn's BFS | `bool` | Cycle detection only |
| 2 | Course Schedule II | Medium | Kahn's BFS | `vector<int>` | Topological order |

**Both problems map to:** Directed Graph Cycle Detection via Topological Sort.

**Visual analogy:**
```
Course Schedule I:    "Can I finish all courses?"
                      └── Yes/No (cycle exists or not)

Course Schedule II:   "What order should I take them?"
                      └── [C0, C1, C2, C3] (topological order)
```

---

## Prerequisite Graph Visualization

Before diving into the code, let's understand how course prerequisites form a Directed Acyclic Graph (DAG):

```
Prerequisites: [1,0], [2,0], [3,1], [3,2]

    Course 0 (no prerequisites)
        |
        +---> Course 1
        |         |
        +---> Course 2 |
                |      |
                v      v
              Course 3 (requires both 1 AND 2)

Adjacency List:          In-Degree Array:
  0: [1, 2]               0: 0  (no prereqs - start here!)
  1: [3]                  1: 1  (needs 0)
  2: [3]                  2: 1  (needs 0)
  3: []                   3: 2  (needs 1 AND 2)
```

---

### 1. Course Schedule (Medium)

**Trigger:** Given `numCourses` and a list of `prerequisites` pairs `[course, prereq]`, return `true` if you can finish all courses.

**Intuition:** The problem is asking: *"Does this directed graph contain a cycle?"*

Use Kahn's Algorithm. Build the Adjacency List and the `inDegree` array. Push all nodes with `inDegree == 0` to a queue. Process the queue, decrementing neighbor in-degrees. Count how many nodes you processed.
`return count == numCourses;`

#### The Code

```cpp
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        // 1. Build adjacency list and in-degree array
        vector<vector<int>> adj(numCourses);
        vector<int> inDegree(numCourses, 0);
        
        for (auto& pre : prerequisites) {
            adj[pre[1]].push_back(pre[0]); // prereq -> course
            inDegree[pre[0]]++;
        }
        
        // 2. Push all nodes with in-degree 0 to queue
        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) {
                q.push(i);
            }
        }
        
        // 3. Process queue, count visited nodes
        int count = 0;
        while (!q.empty()) {
            int curr = q.front();
            q.pop();
            count++;
            
            for (int neighbor : adj[curr]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0) {
                    q.push(neighbor);
                }
            }
        }
        
        // 4. If we visited all courses, no cycle exists
        return count == numCourses;
    }
};
// Time Complexity: O(V + E)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// adj[pre[1]].push_back(pre[0])
//    ^         ^          ^
//    |         |          └── The course that requires the prereq
//    |         └── Push into the prerequisite's neighbor list
//    └── Adjacency list: prereq -> courses that need it
//
// inDegree[pre[0]]++
// ^          ^      ^
// |          |      └── Increment: this course now has one more prereq
// |          └── The course being taken (the dependent)
// └── In-degree array tracks how many prereqs each course needs
```

#### Dry-Run Table

**Input:** `numCourses = 4`, `prerequisites = [[1,0], [2,0], [3,1], [3,2]]`

```
Initial State:
  Adjacency List:     0:[1,2]  1:[3]  2:[3]  3:[]
  In-Degree Array:    [0, 1, 1, 2]
  Queue:              [0]           (only node with in-degree 0)
  Count:              0

Step 1: Pop node 0
  Queue:              []
  Neighbors:          1, 2
  In-Degree Array:    [0, 0, 0, 2]    (decremented 1 and 2)
  Queue after:        [1, 2]          (both now have in-degree 0)
  Count:              1

Step 2: Pop node 1
  Queue:              [2]
  Neighbors:          3
  In-Degree Array:    [0, 0, 0, 1]    (decremented 3)
  Queue after:        [2]             (3 still has in-degree 1)
  Count:              2

Step 3: Pop node 2
  Queue:              []
  Neighbors:          3
  In-Degree Array:    [0, 0, 0, 0]    (decremented 3, now 0!)
  Queue after:        [3]             (3 now has in-degree 0)
  Count:              3

Step 4: Pop node 3
  Queue:              []
  Neighbors:          none
  In-Degree Array:    [0, 0, 0, 0]
  Queue after:        []
  Count:              4

Result: count (4) == numCourses (4) -> return TRUE
```

---

### 2. Course Schedule II (Medium)

**Trigger:** Given `numCourses` and `prerequisites`, return **the ordering** of courses you should take to finish all courses. Return an empty array if impossible.

**Intuition:** Exactly the same as Course Schedule I, but instead of just maintaining a `count`, maintain a `vector<int> result`. `result.push_back(curr)` when you pop from the queue. If `result.size() == numCourses`, return `result`. Otherwise, return `{}`.

#### The Code

```cpp
class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        // 1. Build adjacency list and in-degree array
        vector<vector<int>> adj(numCourses);
        vector<int> inDegree(numCourses, 0);
        
        for (auto& pre : prerequisites) {
            adj[pre[1]].push_back(pre[0]);
            inDegree[pre[0]]++;
        }
        
        // 2. Push all nodes with in-degree 0 to queue
        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) {
                q.push(i);
            }
        }
        
        // 3. Process queue, build result order
        vector<int> result;
        while (!q.empty()) {
            int curr = q.front();
            q.pop();
            result.push_back(curr);  // Record the order
            
            for (int neighbor : adj[curr]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0) {
                    q.push(neighbor);
                }
            }
        }
        
        // 4. If result contains all courses, return it; otherwise cycle exists
        if (result.size() == numCourses) {
            return result;
        }
        return {};  // Cycle detected, impossible to finish
    }
};
// Time Complexity: O(V + E)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// result.push_back(curr)
// ^         ^         ^
// |         |         └── The course we just "finished" (processed)
// |         └── Add to end of result vector
// └── Result vector stores topological order
//
// The ONLY difference from Course Schedule I:
//   Course Schedule I:  count++              (just count)
//   Course Schedule II: result.push_back()   (record order)
```

#### Dry-Run Table

**Input:** `numCourses = 4`, `prerequisites = [[1,0], [2,0], [3,1], [3,2]]`

```
Initial State:
  In-Degree Array:    [0, 1, 1, 2]
  Queue:              [0]
  Result:             []

Step 1: Pop 0          Result: [0]        Queue: [1, 2]
  Decrement neighbors: inDegree = [0, 0, 0, 2]
  Add 1, 2 to queue

Step 2: Pop 1          Result: [0, 1]     Queue: [2]
  Decrement neighbors: inDegree = [0, 0, 0, 1]
  3 still has in-degree 1, not added

Step 3: Pop 2          Result: [0, 1, 2]  Queue: [3]
  Decrement neighbors: inDegree = [0, 0, 0, 0]
  3 now has in-degree 0, add to queue

Step 4: Pop 3          Result: [0, 1, 2, 3]  Queue: []
  No neighbors

Result: [0, 1, 2, 3]  (valid topological order!)
```

**Alternative valid order:** `[0, 2, 1, 3]` (if queue processed 2 before 1)

---

### DFS Alternative Solution

Both problems can also be solved with DFS-based topological sort using cycle detection:

```cpp
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);
        for (auto& pre : prerequisites) {
            adj[pre[1]].push_back(pre[0]);
        }
        
        // 0 = unvisited, 1 = in progress, 2 = completed
        vector<int> state(numCourses, 0);
        
        for (int i = 0; i < numCourses; i++) {
            if (state[i] == 0) {
                if (hasCycle(adj, state, i)) {
                    return false;
                }
            }
        }
        return true;
    }
    
private:
    bool hasCycle(vector<vector<int>>& adj, vector<int>& state, int node) {
        state[node] = 1;  // Mark as "in progress" (on current DFS path)
        
        for (int neighbor : adj[node]) {
            if (state[neighbor] == 1) {
                return true;   // Cycle! We reached a node on current path
            }
            if (state[neighbor] == 0) {
                if (hasCycle(adj, state, neighbor)) {
                    return true;
                }
            }
            // state[neighbor] == 2: already fully explored, skip
        }
        
        state[node] = 2;  // Mark as "completed"
        return false;
    }
};
// Time Complexity: O(V + E)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// state[node] = 1
// ^      ^      ^
// |      |      └── "In progress" - currently on our DFS stack
// |      └── The node we're currently visiting
// └── State array tracks DFS progress
//
// if (state[neighbor] == 1) return true;
//    ^              ^      ^
//    |              |      └── Found a back edge = cycle!
//    |              └── The neighbor we're trying to visit
//    └── If neighbor is "in progress", it's on current path = cycle
//
// state[node] = 2
// ^      ^      ^
// |      |      └── "Completed" - all descendants fully explored
// |      └── The node we just finished processing
// └── Mark as done so we never revisit
```

#### DFS vs BFS Comparison

| Aspect | Kahn's BFS | DFS Cycle Detection |
|--------|-----------|---------------------|
| Time | O(V + E) | O(V + E) |
| Space | O(V + E) | O(V + E) |
| Returns order? | Yes (natural topological order) | Requires extra stack |
| Cycle detection | Count nodes | 3-color marking |
| Interview preference | More common | Also acceptable |

---

### DFS Solution for Course Schedule II

```cpp
class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);
        for (auto& pre : prerequisites) {
            adj[pre[1]].push_back(pre[0]);
        }
        
        vector<int> state(numCourses, 0);
        vector<int> result;
        
        for (int i = 0; i < numCourses; i++) {
            if (state[i] == 0) {
                if (dfs(adj, state, result, i)) {
                    return {};  // Cycle detected
                }
            }
        }
        
        reverse(result.begin(), result.end());
        return result;
    }
    
private:
    bool dfs(vector<vector<int>>& adj, vector<int>& state, 
             vector<int>& result, int node) {
        state[node] = 1;
        
        for (int neighbor : adj[node]) {
            if (state[neighbor] == 1) return true;   // Cycle
            if (state[neighbor] == 0) {
                if (dfs(adj, state, result, neighbor)) return true;
            }
        }
        
        state[node] = 2;
        result.push_back(node);  // Add AFTER all children processed
        return false;
    }
};
// Time Complexity: O(V + E)
// Space Complexity: O(V + E)
```

**What's happening:**
```
// result.push_back(node)   AFTER state[node] = 2
//   ^          ^            ^         ^
//   |          |            |         └── Node marked complete
//   |          |            └── Add AFTER children (post-order)
//   |          └── The node we just finished
//   └── Result gets nodes in REVERSE topological order
//
// reverse(result.begin(), result.end());
// ^^^^^^^
// Because DFS adds leaf nodes first, we reverse to get
// the correct topological order (sources first)
```

---

## Edge Cases to Watch

```
Edge Case 1: Single course, no prerequisites
  numCourses = 1, prerequisites = []
  Expected: true / [0]

Edge Case 2: Self-loop (course requires itself)
  numCourses = 2, prerequisites = [[0,0]]
  Expected: false / []

Edge Case 3: Completely disconnected graph
  numCourses = 4, prerequisites = [[1,0], [3,2]]
  Graph: 0->1   2->3   (two separate components)
  Expected: true / [0,1,2,3] or [2,3,0,1] etc.

Edge Case 4: All courses in a cycle
  numCourses = 3, prerequisites = [[0,1],[1,2],[2,0]]
  Expected: false / []
```

---

## Quick Reference

| Item | Course Schedule I | Course Schedule II |
|------|------------------|-------------------|
| **LeetCode** | #207 | #210 |
| **Difficulty** | Medium | Medium |
| **Input** | `numCourses`, `prerequisites` | Same |
| **Output** | `bool` | `vector<int>` |
| **Algorithm** | Kahn's BFS or DFS | Same |
| **Time** | O(V + E) | O(V + E) |
| **Space** | O(V + E) | O(V + E) |
| **Key check** | `count == numCourses` | `result.size() == numCourses` |
| **Cycle indicator** | Count < numCourses | Empty result |

**Template Quick Copy:**
```cpp
// Kahn's BFS Template (works for both problems)
vector<int> topoSort(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> inDeg(n, 0);
    for (auto& e : edges) { adj[e[1]].push_back(e[0]); inDeg[e[0]]++; }
    queue<int> q;
    for (int i = 0; i < n; i++) if (inDeg[i] == 0) q.push(i);
    vector<int> res;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        res.push_back(c);
        for (int nb : adj[c]) if (--inDeg[nb] == 0) q.push(nb);
    }
    return res.size() == n ? res : vector<int>{};
}
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run the Kahn's `canFinish` with `numCourses = 5` and `prerequisites = [[1,0],[2,1],[3,2],[1,3],[4,0]]`. What is the initial in-degree array, what is the final `count`, and what is returned?

**Q2.** Run the Kahn's `findOrder` on Edge Case 3 (`numCourses = 4`, `prerequisites = [[1,0],[3,2]]`). The edge-case list says "`[0,1,2,3]` or `[2,3,0,1]` etc." — which exact array does *this* code return?

**Q3.** Run the **DFS** `findOrder` on the same input as Q2. What is `result` just before `reverse`, and what is returned?

**Q4.** Edge Case 2 (`numCourses = 2`, `prerequisites = [[0,0]]`). For the Kahn's `canFinish`, what is `count` at the end? For the DFS `canFinish`, what is the `state` array at the moment `hasCycle` returns `true`?

**Q5.** Run the DFS `canFinish` on the diamond from this file (`[[1,0],[2,0],[3,1],[3,2]]`). How many times is `hasCycle` called in total? When node 2 looks at neighbor 3, what is `state[3]`? What would go wrong if the code treated state `2` the same as state `1`?

### Coding Exercises

**E1 (Easy).** Return how many courses can actually be completed (courses stuck behind a cycle can't be).

```cpp
int countFinishable(int numCourses, vector<vector<int>>& prerequisites);
// numCourses = 5, prerequisites = [[1,0],[2,1],[3,2],[1,3],[4,0]]  ->  2
// numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]        ->  4
```

**E2 (Easy–Medium).** Course Schedule II, but among all valid orders return the **lexicographically smallest** one (or `{}` if a cycle exists).

```cpp
vector<int> findOrderSmallest(int numCourses, vector<vector<int>>& prerequisites);
// numCourses = 4, prerequisites = [[1,0],[3,2]]  ->  [0,1,2,3]
// numCourses = 3, prerequisites = [[0,2]]        ->  [1,2,0]
```

**E3 (Medium).** Find Eventual Safe States: `graph[i]` lists the nodes `i` points to. A node is *safe* if every path starting from it ends at a node with no outgoing edges (i.e., it can never reach a cycle). Return all safe nodes in increasing order.

```cpp
vector<int> eventualSafeNodes(vector<vector<int>>& graph);
// [[1,2],[2,3],[5],[0],[5],[],[]]  ->  [2,4,5,6]
// [[1,2,3,4],[1,2],[3,4],[0,4],[]] ->  [4]
```

#### Dry-Run: Answers

**Q1.** Edges: `0→1, 1→2, 2→3, 3→1, 0→4`. In-degree: **`[0, 2, 1, 1, 1]`**. Final `count = 2`, returns **`false`**.

| Pop | Decrements | Queue after | count |
|-----|------------|-------------|-------|
| (init) | — | [0] | 0 |
| 0 | 1 → 1, 4 → 0 | [4] | 1 |
| 4 | none | [] | 2 |

Node 1 still needs node 3, which needs 2, which needs 1, so the cycle `1 → 2 → 3 → 1` is never unlocked.

**Q2.** Returns **`[0, 2, 1, 3]`**. Both 0 and 2 start with in-degree 0, so the initial queue is `[0, 2]`.

| Pop | Pushes | Queue after | result |
|-----|--------|-------------|--------|
| 0 | 1 | [2, 1] | [0] |
| 2 | 3 | [1, 3] | [0, 2] |
| 1 | — | [3] | [0, 2, 1] |
| 3 | — | [] | [0, 2, 1, 3] |

It's one of the "etc." orders. The FIFO queue interleaves the two components.

**Q3.** Before reverse: **`[1, 0, 3, 2]`**. Returned: **`[2, 3, 0, 1]`**. `dfs(0)` visits 1, which finishes first (push 1), then 0 finishes (push 0). Outer `i = 1` is done; `i = 2` visits 3 (push 3), then 2 (push 2).

**Q4.** Kahn's: in-degree is `[1, 0]`, so the queue starts as `[1]`. Node 1 is processed, giving **`count = 1`**, and $1 \neq 2$ returns `false`. DFS: `hasCycle(0)` sets `state = [1, 0]`, then sees neighbor 0 with `state[0] == 1` and returns `true` with **`state = [1, 0]`**.

**Q5.** **4** calls: `hasCycle(0)`, `hasCycle(1)`, `hasCycle(3)`, `hasCycle(2)`. The outer loop then finds 1, 2, 3 already non-zero.

| Call | state after entering | Notes |
|------|----------------------|-------|
| hasCycle(0) | [1,0,0,0] | neighbors 1, 2 |
| hasCycle(1) | [1,1,0,0] | neighbor 3 |
| hasCycle(3) | [1,1,0,1] | no neighbors, becomes 2 |
| (1 finishes) | [1,2,0,2] | |
| hasCycle(2) | [1,2,1,2] | neighbor 3 has **state 2**, skip |

When 2 looks at 3, `state[3] = 2`. If state 2 were treated like state 1 ("on the current path"), the second route into 3 would be reported as a cycle and `canFinish` would wrongly return `false` on a perfectly valid DAG. Reaching a node again through a different branch is not a cycle; only a back edge to a node *on the current path* is.

**E1 — reference solution**

```cpp
int countFinishable(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> inDegree(numCourses, 0);
    for (auto& pre : prerequisites) {
        adj[pre[1]].push_back(pre[0]);
        inDegree[pre[0]]++;
    }
    queue<int> q;
    for (int i = 0; i < numCourses; i++)
        if (inDegree[i] == 0) q.push(i);
    int count = 0;
    while (!q.empty()) {
        int curr = q.front(); q.pop();
        count++;
        for (int nb : adj[curr])
            if (--inDegree[nb] == 0) q.push(nb);
    }
    return count;   // canFinish just compares this to numCourses
}
```

Kahn's `count` already *is* the number of courses not blocked by a cycle (or by anything downstream of one). Time $O(V + E)$.

**E2 — reference solution**

```cpp
vector<int> findOrderSmallest(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> inDegree(numCourses, 0);
    for (auto& pre : prerequisites) {
        adj[pre[1]].push_back(pre[0]);
        inDegree[pre[0]]++;
    }
    priority_queue<int, vector<int>, greater<int>> pq;   // min-heap instead of FIFO
    for (int i = 0; i < numCourses; i++)
        if (inDegree[i] == 0) pq.push(i);
    vector<int> result;
    while (!pq.empty()) {
        int curr = pq.top(); pq.pop();
        result.push_back(curr);
        for (int nb : adj[curr])
            if (--inDegree[nb] == 0) pq.push(nb);
    }
    if (result.size() == numCourses) return result;
    return {};
}
```

At every step, greedily taking the smallest *available* course gives the lexicographically smallest order. In the second example, 1 and 2 are available, so 1 is taken first, then 2, which unlocks 0. Time $O((V + E)\log V)$.

**E3 — reference solution**

```cpp
// state: 0 = unvisited, 1 = in progress OR known unsafe, 2 = known safe
bool isUnsafe(vector<vector<int>>& graph, vector<int>& state, int node) {
    if (state[node] != 0) return state[node] == 1;
    state[node] = 1;
    for (int nb : graph[node])
        if (isUnsafe(graph, state, nb)) return true;   // leave state = 1 (unsafe)
    state[node] = 2;
    return false;
}

vector<int> eventualSafeNodes(vector<vector<int>>& graph) {
    int n = graph.size();
    vector<int> state(n, 0), result;
    for (int i = 0; i < n; i++)
        if (!isUnsafe(graph, state, i)) result.push_back(i);
    return result;
}
```

This reuses the 3-state DFS from `hasCycle`. A node is unsafe iff the DFS from it hits an "in progress" node (a cycle). On early return the state stays `1`, which caches "unsafe" for later queries. Each node and edge is processed once: $O(V + E)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems topological sort** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.

