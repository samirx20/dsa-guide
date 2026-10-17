# Part 4, Topic 2: Autonomous Motion Planning & ROS2 Simulation
## Chapter 1: Occupancy Grids, C-Space Inflation, A* Search & RRT Path Planning

---

### Prerequisites & Learning Objectives

Before starting this chapter, you should be comfortable with:
- 2D coordinate frames $(x, y, \theta)$ and Euclidean distance $d = \sqrt{\Delta x^2 + \Delta y^2}$ (Part 2, Topic 1).
- Basic C++ containers (`std::vector`, `std::priority_queue`, `std::array`) and structs (Part 4, Topic 1).

By the end of this chapter, you will be able to:
1. Convert continuous physical coordinates $(x, y)$ in meters into discrete **2D Occupancy Grid** indices $(r, c)$, and update cell probabilities using **Log-Odds Bayesian Sensor Fusion**.
2. Explain **Configuration Space ($\mathcal{C}$-Space)** and **Obstacle Inflation (Minkowski Sum)**, deriving why inflating walls by the robot's radius $R_{\text{robot}}$ turns a physical circular robot into a mathematical $1\text{-cell}$ point!
3. Compare **Breadth-First Search (BFS)**, **Dijkstra's Algorithm ($f(n)=g(n)$)**, and **$A^*$ Search ($f(n)=g(n)+h(n)$)**, and prove why an **Admissible Heuristic ($h(n) \le h^*(n)$)** guarantees the shortest collision-free path.
4. Implement a complete, zero-bug **$A^*$ Path Planner** in C++ with 8-connected Octile distance and parent-pointer path reconstruction.
5. Explain why grid-based search explodes exponentially in high dimensions (like a 6-DOF robot arm), and implement **RRT (Rapidly-Exploring Random Trees)** in Python to plan continuous trajectories through obstacle fields.

---

### 1. How a Robot Sees the World: 2D Occupancy Grids (From Zero)

When you look around a room, your brain perceives chairs, walls, and doorways. A robot's 2D LiDAR sensor, however, only sees distances—a ring of laser beams bouncing off surfaces at angles $\theta_i$ and ranges $z_i$ (in meters).

How do we turn thousands of raw laser range measurements into a map that a path planner can search?

We divide the physical floor into a uniform checkerboard of tiny squares called a **2D Occupancy Grid**. Each square cell has a physical width called the **Resolution** $\Delta_{\text{res}}$ (typically $\Delta_{\text{res}} = 0.05\text{ m} = 5\text{ cm}$ per cell).

#### World Coordinates $(x, y)$ $\leftrightarrow$ Grid Cell Indices $(\text{row}, \text{col})$

Suppose our map covers a $10\text{ m} \times 10\text{ m}$ warehouse floor at resolution $\Delta_{\text{res}} = 0.05\text{ m/cell}$, with the map origin $(x_0, y_0)$ at the bottom-left corner:

$$\text{col} = \left\lfloor \frac{x - x_0}{\Delta_{\text{res}}} \right\rfloor, \qquad \text{row} = \left\lfloor \frac{y - y_0}{\Delta_{\text{res}}} \right\rfloor$$

And to convert a grid cell $(\text{row}, \text{col})$ back to the continuous physical center $(x, y)$ of that square in meters:

$$x = x_0 + \left(\text{col} + 0.5\right) \cdot \Delta_{\text{res}}, \qquad y = y_0 + \left(\text{row} + 0.5\right) \cdot \Delta_{\text{res}}$$

In ROS2 (`nav_msgs/msg/OccupancyGrid`), each cell stores a single `int8_t` value:
- **`0` (Free Space):** The robot can safely drive through this cell.
- **`100` (Occupied Obstacle):** A wall, table leg, or person blocks this cell.
- **`-1` (Unknown / Unexplored):** No laser beam has ever reached this cell yet.

#### Why Real Robots Use Log-Odds probabilities ($L(m_i)$)

Real sensors are noisy: a spec of dust might reflect a single laser beam in mid-air, or a black glass door might fail to reflect once. If a single bad reading permanently marked a cell as `100` (Occupied), your robot would get trapped by imaginary ghost walls!

Instead, each cell $m_i$ tracks a continuous belief probability $p(m_i) \in (0, 1)$ stored in **Log-Odds form** $L(m_i)$:

$$L(m_i) = \ln\left(\frac{p(m_i)}{1 - p(m_i)}\right) \quad \Longleftrightarrow \quad p(m_i) = \frac{1}{1 + e^{-L(m_i)}}$$

Why Log-Odds? Because multiplying Bayesian probabilities turns into **simple addition and subtraction**:
- Every time a laser beam passes *through* cell $m_i$ without hitting anything, we subtract $l_{\text{free}} = -0.4$ (clamped at $L_{\min} = -5.0$).
- At the endpoint cell where the laser beam *reflects*, we add $l_{\text{occ}} = +0.85$ (clamped at $L_{\max} = +5.0$).

---

### 2. Configuration Space ($\mathcal{C}$-Space) & Obstacle Inflation

Suppose we now have an Occupancy Grid where `0` is free and `100` is a wall. Can we just run a graph search that moves our robot from cell to cell through `0`s?

**Wait!** A grid cell is only $5\text{ cm} \times 5\text{ cm}$, whereas our physical warehouse robot is a circular cylinder of radius $R_{\text{robot}} = 0.30\text{ m}$ ($30\text{ cm}$, or $6\text{ cells}$ wide!).
If the planner plans a path where the **center** of the robot passes $5\text{ cm}$ ($1\text{ cell}$) away from a wall, the **outer edge** of the robot's chassis will smash $25\text{ cm}$ into the wall!

Checking every point on the robot's circular perimeter for collisions at every single step of a search algorithm would be painfully slow. How do we make collision checking instant ($O(1)$)?

We transform the problem from the **Physical Workspace ($\mathcal{W}$)** into the **Configuration Space ($\mathcal{C}$-Space)**!

#### Shrinking the Robot to a Point by Inflating Obstacles

Here is the geometric trick (formally called the **Minkowski Sum** $\mathcal{C}_{\text{obs}} = \mathcal{W}_{\text{obs}} \oplus \mathcal{R}$):
- Imagine shrinking our circular robot of radius $R_{\text{robot}}$ down to a **single dimensionless mathematical point** (its center $(x, y)$).
- To compensate, we **fatten (inflate) every obstacle on the map outward in all directions by the exact radius $R_{\text{robot}}$**!
- In grid units, the **Inflation Radius in Cells** is:

$$r_{\text{inflate}} = \left\lceil \frac{R_{\text{robot}}}{\Delta_{\text{res}}} \right\rceil$$

For example, if $R_{\text{robot}} = 0.30\text{ m}$ and $\Delta_{\text{res}} = 0.15\text{ m/cell}$, then $r_{\text{inflate}} = \lceil 0.30 / 0.15 \rceil = 2\text{ cells}$. Any free cell within Euclidean distance $\le 2\text{ cells}$ of a wall cell (`#`) is marked as an **Inflated Collision Cell (`+`)**:

```
================================================================================
   PHYSICAL WORKSPACE (Circular Robot)  --->  CONFIGURATION SPACE (Point Robot)
================================================================================

   Workspace (Robot radius = 2 cells):        C-Space (Obstacles inflated by +2):
   . . . . . . . . . . . . .                  . . . . . + + + . . . . .
   . . /---\ . . . # . . . .                  . . . . + + # + + . . . .
   . . | R | . . . # . . . .     =======>     . . . . + + # + + . . . .
   . . \---/ . . . # . . . .                  . . R . + + # + + . . . .
   . . . . . . . . . . . . .                  . . . . . + + + . . . . .

   Legend:
     # = Raw LiDAR Wall Cell (Occupied = 100)
     + = Inflated Safety Margin (Distance <= R_robot from '#'; Forbidden!)
     R = In C-Space, the robot is a 1-CELL POINT! If 'R' never steps on '#'
         or '+', the physical circular robot NEVER touches the physical wall!
================================================================================
```

Now, checking if our robot collides at $(r, c)$ takes a **single array lookup**: `is_occupied_or_inflated(r, c)`!

---

### 3. Graph Search: BFS vs. Dijkstra vs. $A^*$ Search

Once our obstacles are inflated, our 2D grid is a **Graph** $G = (V, E)$:
- Every free cell $n = (r, c)$ is a **Node (Vertex)**.
- Every valid step to an adjacent neighbor is an **Edge** with a positive movement cost:
  - **4-Connected Grid (Up, Down, Left, Right):** Step cost is $1.0$.
  - **8-Connected Grid (Includes 4 Diagonals):** Cardinal step cost is $D_1 = 1.0$; diagonal step cost is $D_2 = \sqrt{1^2 + 1^2} = \sqrt{2} \approx 1.4142$.

Let's compare the three classic search algorithms that find a path from `Start` ($S$) to `Goal` ($G$):

| Algorithm | Priority Queue Score $f(n)$ | How It Explores Space | Optimal Shortest Path? | Typical Nodes Expanded |
| :--- | :--- | :--- | :---: | :--- |
| **Breadth-First Search (BFS)** | FIFO Queue (Unweighted step count) | Expands in uniform concentric ripples; ignores diagonal $\sqrt{2}$ vs $1.0$ cost. | Only on unweighted 4-way grids | **Huge** (Blind in all directions) |
| **Dijkstra's Algorithm** | $f(n) = g(n)$ | Expands nodes in strict order of **cost-so-far $g(n)$** from Start. | **Yes (Always)** | **Large** (Searches backward & sideways equally) |
| **$A^*$ (A-Star) Search** | **$f(n) = g(n) + h(n)$** | Combines exact cost-so-far $g(n)$ with estimated cost-to-go $h(n)$ toward Goal. | **Yes (if $h(n)$ is admissible)** | **Minimal** (Focused beam toward Goal!) |

#### The $A^*$ Evaluation Function: $f(n) = g(n) + h(n)$

For every grid cell $n = (r, c)$, $A^*$ maintains two numbers:
1. **$g(n)$ (Exact Cost-So-Far):** The exact cumulative distance traveled along the best known path from `Start` to cell $n$.
2. **$h(n)$ (Heuristic Cost-To-Go):** A fast mathematical lower-bound estimate of the remaining distance from cell $n$ to `Goal` ($r_g, c_g$).
3. **$f(n) = g(n) + h(n)$ (Total Estimated Path Cost):** The priority score used by the **Open Set Min-Heap** (`std::priority_queue`). $A^*$ always pops the node with the **lowest $f(n)$** next!

#### Choosing an Admissible Heuristic $h(n)$

A heuristic $h(n)$ is called **Admissible** if it **never overestimates** the true shortest remaining cost $h^*(n)$ to the goal:

$$0 \le h(n) \le h^*(n) \quad \forall n$$

Why does admissibility matter? Because if $h(n)$ never overestimates the remaining distance, $f(n) = g(n) + h(n)$ is a guaranteed lower bound on any complete path through $n$. Therefore, the moment $A^*$ pops the `Goal` node from the Min-Heap, **it is mathematically impossible for any unexpanded node to lead to a shorter path!**

Match your heuristic to your robot's allowed grid movements:
1. **Manhattan Distance (For 4-Connected Grids: Up/Down/Left/Right only):**
   $$h_{\text{Manhattan}}(n) = |\Delta r| + |\Delta c|$$
2. **Octile Distance (For 8-Connected Grids: Cardinal cost $1$, Diagonal cost $\sqrt{2}$):**
   $$h_{\text{Octile}}(n) = \max(|\Delta r|, |\Delta c|) + (\sqrt{2} - 1)\cdot \min(|\Delta r|, |\Delta c|)$$
3. **Euclidean Distance (For Any-Angle / 8-Connected Grids):**
   $$h_{\text{Euclidean}}(n) = \sqrt{\Delta r^2 + \Delta c^2}$$

---

### 4. Step-by-Step Dry Run & Complete C++ $A^*$ Implementation

Let's trace $A^*$ by hand on a concrete $5 \times 5$ C-Space grid (4-connected, step cost $= 1$, Manhattan heuristic $h(n) = |r - r_g| + |c - c_g|$) from **Start $S=(0,0)$** to **Goal $G=(0,4)$**, with a vertical wall blocking $(0,2), (1,2), (2,2)$:

```
================================================================================
   5x5 C-SPACE GRID FOR A* DRY RUN (Start = (0,0), Goal = (0,4))
================================================================================
       Col 0   Col 1   Col 2   Col 3   Col 4
Row 0 [ S 0 ] [  1  ] [ #W# ] [  7  ] [ G 8 ]
Row 1 [  .  ] [  2  ] [ #W# ] [  6  ] [  .  ]
Row 2 [  .  ] [  3  ] [ #W# ] [  5  ] [  .  ]
Row 3 [  .  ] [  *  ] [  4  ] [  *  ] [  .  ]
Row 4 [  .  ] [  .  ] [  .  ] [  .  ] [  .  ]

  Optimal Path Found (* = path turns around wall at Row 3):
  (0,0) -> (0,1) -> (1,1) -> (2,1) -> (3,1) -> (3,2) -> (3,3) -> (2,3) -> (1,3) -> (0,3) -> (0,4)
================================================================================
```

#### Dry-Run Trace Table: $A^*$ Priority Queue Execution

| Step | Popped Node $n=(r,c)$ | $g(n)$ | $h(n)$ | $f(n)=g+h$ | Valid Neighbors Pushed / Updated $(r,c): g+h=f$ | Parent Recorded |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | **`(0, 0)`** *(Start)* | `0` | `4` | **`4`** | `(0,1): 1+3=4`, `(1,0): 1+5=6` | `parent[(0,1)] = (0,0)` |
| **2** | **`(0, 1)`** | `1` | `3` | **`4`** | `(0,2)` is Wall `#`! Push `(1,1): 2+4=6` | `parent[(1,1)] = (0,1)` |
| **3** | **`(1, 1)`** | `2` | `4` | **`6`** | `(1,2)` is Wall `#`! Push `(2,1): 3+5=8` | `parent[(2,1)] = (1,1)` |
| **4** | **`(1, 0)`** | `1` | `5` | **`6`** | `(2,0): 2+6=8` (`(1,1)` already has $g=2 \le 2$) | `parent[(2,0)] = (1,0)` |
| **5** | **`(2, 1)`** | `3` | `5` | **`8`** | `(2,2)` is Wall `#`! Push `(3,1): 4+6=10` | `parent[(3,1)] = (2,1)` |
| **6** | **`(3, 1)`** | `4` | `6` | **`10`** | **Wall cleared!** Push `(3,2): 5+5=10`, `(4,1): 5+7=12` | `parent[(3,2)] = (3,1)` |
| **7** | **`(3, 2)`** | `5` | `5` | **`10`** | Push `(3,3): 6+4=10`, `(4,2): 6+6=12` | `parent[(3,3)] = (3,2)` |
| **8** | **`(3, 3)`** | `6` | `4` | **`10`** | Push `(2,3): 7+3=10`, `(3,4): 7+3=10` | `parent[(2,3)] = (3,3)` |
| **9** | **`(2, 3)`** | `7` | `3` | **`10`** | Push `(1,3): 8+2=10` | `parent[(1,3)] = (2,3)` |
| **10** | **`(1, 3)`** | `8` | `2` | **`10`** | Push `(0,3): 9+1=10` | `parent[(0,3)] = (1,3)` |
| **11** | **`(0, 3)`** | `9` | `1` | **`10`** | Push **`(0,4): 10+0=10`** *(Goal reached!)* | `parent[(0,4)] = (0,3)` |

Now let's write the complete, self-contained C++ implementation of C-Space Obstacle Inflation + 8-Connected $A^*$ Search:

```cpp
#include <iostream>
#include <vector>
#include <queue>
#include <cmath>
#include <limits>
#include <algorithm>

struct GridCell {
    int r{0};
    int c{0};
    bool operator==(const GridCell& o) const noexcept { return r == o.r && c == o.c; }
};

struct AStarNode {
    GridCell cell;
    double f_score{0.0};
    // std::priority_queue is a Max-Heap by default; invert `>` to make it a Min-Heap!
    bool operator>(const AStarNode& other) const noexcept {
        return f_score > other.f_score;
    }
};

// 1. Inflate obstacles in Configuration Space by robot radius (in cells)
std::vector<int> inflate_obstacles(const std::vector<int>& raw_grid,
                                   int rows, int cols, int radius_cells) {
    std::vector<int> inflated = raw_grid;
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            if (raw_grid[r * cols + c] == 100) { // Raw LiDAR obstacle
                for (int dr = -radius_cells; dr <= radius_cells; ++dr) {
                    for (int dc = -radius_cells; dc <= radius_cells; ++dc) {
                        if (dr * dr + dc * dc <= radius_cells * radius_cells) {
                            int nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                inflated[nr * cols + nc] = 100;
                            }
                        }
                    }
                }
            }
        }
    }
    return inflated;
}

// 2. Admissible 8-Connected Octile Heuristic
inline double octile_heuristic(GridCell a, GridCell b) noexcept {
    double dr = std::abs(a.r - b.r);
    double dc = std::abs(a.c - b.c);
    constexpr double SQRT2_MINUS_1 = 0.41421356237;
    return std::max(dr, dc) + SQRT2_MINUS_1 * std::min(dr, dc);
}

// 3. 8-Connected A* Search with Parent Reconstruction
std::vector<GridCell> plan_astar(const std::vector<int>& cspace_grid,
                                 int rows, int cols,
                                 GridCell start, GridCell goal) {
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> g_score(rows * cols, INF);
    std::vector<int> parent(rows * cols, -1);
    std::vector<uint8_t> closed(rows * cols, 0);

    std::priority_queue<AStarNode, std::vector<AStarNode>, std::greater<AStarNode>> open_set;

    int start_idx = start.r * cols + start.c;
    int goal_idx  = goal.r * cols + goal.c;
    g_score[start_idx] = 0.0;
    open_set.push(AStarNode{start, octile_heuristic(start, goal)});

    // 8-connected neighbor offsets (4 cardinal + 4 diagonal)
    const int dr[8] = {-1, 1,  0, 0, -1, -1,  1, 1};
    const int dc[8] = { 0, 0, -1, 1, -1,  1, -1, 1};
    const double step_cost[8] = {1.0, 1.0, 1.0, 1.0, 1.41421356, 1.41421356, 1.41421356, 1.41421356};

    while (!open_set.empty()) {
        GridCell curr = open_set.top().cell;
        open_set.pop();
        int curr_idx = curr.r * cols + curr.c;

        if (curr == goal) {
            // Reconstruct optimal path backward from goal to start using parent[]
            std::vector<GridCell> path;
            for (int at = goal_idx; at != -1; at = parent[at]) {
                path.push_back(GridCell{at / cols, at % cols});
            }
            std::reverse(path.begin(), path.end());
            return path;
        }

        if (closed[curr_idx]) continue; // Skip lazy-deleted duplicate entries
        closed[curr_idx] = 1;

        for (int i = 0; i < 8; ++i) {
            int nr = curr.r + dr[i];
            int nc = curr.c + dc[i];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

            int n_idx = nr * cols + nc;
            if (cspace_grid[n_idx] > 0 || closed[n_idx]) continue; // Blocked or visited

            double tentative_g = g_score[curr_idx] + step_cost[i];
            if (tentative_g < g_score[n_idx]) {
                g_score[n_idx] = tentative_g;
                parent[n_idx]  = curr_idx;
                double f = tentative_g + octile_heuristic(GridCell{nr, nc}, goal);
                open_set.push(AStarNode{GridCell{nr, nc}, f});
            }
        }
    }
    return {}; // Empty vector = No collision-free path exists!
}

int main() {
    const int rows = 5, cols = 5;
    std::vector<int> grid(rows * cols, 0);
    grid[0 * cols + 2] = 100;
    grid[1 * cols + 2] = 100;
    grid[2 * cols + 2] = 100; // Vertical wall at Col 2, Rows 0..2

    auto path = plan_astar(grid, rows, cols, GridCell{0, 0}, GridCell{0, 4});
    std::cout << "A* Path Found (" << path.size() << " waypoints):\n";
    for (const auto& cell : path) {
        std::cout << "(" << cell.r << "," << cell.c << ") ";
    }
    std::cout << "\n";
    return 0;
}
```

#### What's happening:

```cpp
                        if (dr * dr + dc * dc <= radius_cells * radius_cells) {
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                      Checks if cell (r + dr, c + dc) lies inside a circle of
//                      radius `radius_cells` WITHOUT calling slow `std::sqrt()`!
```

```cpp
        if (closed[curr_idx]) continue; // Skip lazy-deleted duplicate entries
        closed[curr_idx] = 1;
//      ^^^^^^^^^^^^^^^^^^^^^
//      Standard `std::priority_queue` does not have a `decrease_key()` method.
//      Instead, when we find a shorter path to a neighbor, we simply push a
//      new `AStarNode` with the smaller `f_score`. It will pop first, mark
//      `closed[curr_idx] = 1`, and any older higher-cost entries for that
//      same cell will be ignored in O(1) time when they eventually pop!
```

---

### 5. Beyond Grids: RRT (Rapidly-Exploring Random Trees) for High-DOF Robots

$A^*$ is unbeatable on 2D occupancy grids. So why don't we use $A^*$ to plan the motion of a **6-DOF industrial robot arm** (like a Universal Robots UR5) or a **7-DOF humanoid arm**?

Let's do the math on the **Curse of Dimensionality**:
- Suppose we discretize each joint angle $\theta_i \in [-180^\circ, +180^\circ]$ into $360$ bins ($1^\circ$ resolution).
- For a 2D mobile robot $(x, y)$: $360^2 = 129,600\text{ cells}$ (trivial for $A^*$).
- For a **6-DOF robot arm** $(\theta_1, \theta_2, \theta_3, \theta_4, \theta_5, \theta_6)$:
  $$\text{Total Grid Cells} = 360^6 = \mathbf{2,176,782,336,000,000} \quad (\text{Over } 2.1\text{ Quadrillion cells!})$$
  Just storing a single byte per cell would require **$2,176\text{ Terabytes}$ of RAM**!

#### How RRT Solves High-Dimensional Planning via Random Sampling

Instead of discretizing the entire universe into a grid, **Sampling-Based Motion Planners** like **RRT (Rapidly-Exploring Random Trees)** grow a tree of collision-free configurations directly inside continuous $\mathcal{C}$-Space!

Every iteration of RRT executes four simple geometric steps:
1. **`Sample()`**: Pick a random point $q_{\text{rand}}$ in $\mathcal{C}$-Space (with a small probability $p_{\text{goal}} \approx 0.10$ of picking $q_{\text{goal}}$ directly—called **Goal Biasing**—to pull the tree toward the target!).
2. **`Nearest()`**: Find the existing tree node $q_{\text{near}} \in \mathcal{T}$ that is closest to $q_{\text{rand}}$:
   $$q_{\text{near}} = \arg\min_{q \in \mathcal{T}} \| q - q_{\text{rand}} \|_2$$
3. **`Steer()`**: Take a bounded step of length $\delta_{\text{step}}$ from $q_{\text{near}}$ toward $q_{\text{rand}}$ to create candidate node $q_{\text{new}}$:
   $$q_{\text{new}} = q_{\text{near}} + \delta_{\text{step}} \frac{q_{\text{rand}} - q_{\text{near}}}{\| q_{\text{rand}} - q_{\text{near}} \|_2}$$
4. **`CollisionFree()`**: If the straight line segment $\overline{q_{\text{near}} q_{\text{new}}}$ does not intersect any obstacle, add $q_{\text{new}}$ to the tree with `parent(q_new) = q_near`!

```
================================================================================
   SINGLE ITERATION OF RRT (Rapidly-Exploring Random Tree)
================================================================================

           (q_start) o---o
                          \          [OBSTACLE]
                           o (q_near) ########      o (q_rand: random sample)
                            \         ########     .
                             \ d_step ########   .
                              * (q_new) < - - - .   (Steer step toward q_rand)

   1. Sample random point `q_rand` (or `q_goal` 10% of the time).
   2. Find closest existing tree vertex `q_near`.
   3. Steer from `q_near` toward `q_rand` by step size `d_step` -> `q_new`.
   4. If edge (q_near -> q_new) is collision-free, add `q_new` to Tree!
================================================================================
```

Here is a clean, runnable Python implementation of RRT with Goal Biasing:

```python
import math
import random
from dataclasses import dataclass

@dataclass
class Node:
    x: float
    y: float
    parent_idx: int = -1

def is_edge_collision_free(p1: Node, p2: Node, obstacles: list[tuple[float, float, float]]) -> bool:
    """Checks 10 interpolated points along edge (p1 -> p2) against circular obstacles (ox, oy, r)."""
    for i in range(11):
        alpha = i / 10.0
        px = p1.x + alpha * (p2.x - p1.x)
        py = p1.y + alpha * (p2.y - p1.y)
        for (ox, oy, radius) in obstacles:
            if math.hypot(px - ox, py - oy) <= radius:
                return False
    return True

def plan_rrt(
    start: tuple[float, float],
    goal: tuple[float, float],
    obstacles: list[tuple[float, float, float]],
    step_size: float = 0.8,
    goal_bias: float = 0.15,
    max_iters: int = 1000,
) -> list[tuple[float, float]]:
    random.seed(42)
    tree: list[Node] = [Node(start[0], start[1], parent_idx=-1)]

    for _ in range(max_iters):
        # 1. Sample q_rand (with 15% Goal Biasing)
        if random.random() < goal_bias:
            rx, ry = goal
        else:
            rx, ry = random.uniform(0.0, 10.0), random.uniform(0.0, 10.0)

        # 2. Nearest node in tree
        nearest_idx = min(range(len(tree)), key=lambda i: math.hypot(tree[i].x - rx, tree[i].y - ry))
        q_near = tree[nearest_idx]

        # 3. Steer from q_near toward q_rand by at most step_size
        dist = math.hypot(rx - q_near.x, ry - q_near.y)
        if dist == 0.0:
            continue
        step = min(step_size, dist)
        q_new = Node(
            x=q_near.x + step * (rx - q_near.x) / dist,
            y=q_near.y + step * (ry - q_near.y) / dist,
            parent_idx=nearest_idx,
        )

        # 4. Collision check & add to tree
        if is_edge_collision_free(q_near, q_new, obstacles):
            tree.append(q_new)
            if math.hypot(q_new.x - goal[0], q_new.y - goal[1]) <= step_size:
                # Reconstruct path backward from goal to start
                path = [(goal[0], goal[1])]
                curr = len(tree) - 1
                while curr != -1:
                    path.append((tree[curr].x, tree[curr].y))
                    curr = tree[curr].parent_idx
                return list(reversed(path))
    return []

if __name__ == "__main__":
    obs = [(5.0, 5.0, 2.0), (3.0, 7.0, 1.2)] # Circular obstacles: (x, y, inflated_radius)
    waypoints = plan_rrt(start=(1.0, 1.0), goal=(9.0, 9.0), obstacles=obs)
    print(f"RRT found collision-free path with {len(waypoints)} waypoints:")
    print(" -> ".join(f"({x:.1f}, {y:.1f})" for x, y in waypoints))
```

---

### 6. Common Mistakes & How to Fix Them

1. **Mistake: Planning in Un-Inflated Workspace Instead of $\mathcal{C}$-Space**
   - *Symptom:* $A^*$ returns a path that grazes right against wall pixels, and the physical robot clips every doorway corner.
   - *Fix:* Always inflate every occupied cell outward by at least $r_{\text{inflate}} = \lceil R_{\text{robot}} / \Delta_{\text{res}} \rceil$ cells (plus a soft cost decay halo so the robot prefers staying centered in hallways).

2. **Mistake: Using Manhattan Heuristic on an 8-Connected Grid**
   - *Symptom:* $A^*$ runs fast, but occasionally returns a **sub-optimal (longer than necessary) diagonal path**!
   - *Why it happens:* A diagonal step moves $1$ row and $1$ column for a true cost of $\sqrt{2} \approx 1.414$, but Manhattan distance estimates that move as $1 + 1 = 2.0 > 1.414$. Because $h(n) > h^*(n)$, Manhattan distance **violates admissibility** on 8-connected grids!
   - *Fix:* Always use **Octile Distance** or **Euclidean Distance** when diagonal moves are allowed.

3. **Mistake: Checking Only the Endpoint $q_{\text{new}}$ for Collisions in RRT**
   - *Symptom:* RRT connects two nodes on opposite sides of a thin wall straight *through* the wall!
   - *Fix:* Always interpolate and collision-check points along the entire line segment $\overline{q_{\text{near}} q_{\text{new}}}$ at spacing $\le \Delta_{\text{res}} / 2$.

---

### 7. Quick Reference Summary

| Planner / Concept | Space Type | Complete? | Optimal Shortest Path? | Best Robotics Application |
| :--- | :--- | :---: | :---: | :--- |
| **$\mathcal{C}$-Space Inflation** | 2D / 3D Grid | N/A | N/A | Turns circular robot of radius $R$ into a $1\text{-cell}$ point. |
| **Dijkstra ($f = g$)** | Discrete Graph | Yes | **Yes** | Multi-goal distance fields when goal location is not single-point. |
| **$A^*$ ($f = g + h$)** | 2D / 3D Grid | Yes | **Yes** ($h \le h^*$) | Warehouse AMRs, autonomous cars on costmaps, 2D navigation. |
| **RRT** | Continuous $\mathbb{R}^d$ | Probabilistically | No (Jagged; needs smoothing or $\text{RRT}^*$) | 6-DOF / 7-DOF robot arms, high-dimensional kinematic chains. |
| **$\text{RRT}^*$ (RRT-Star)** | Continuous $\mathbb{R}^d$ | Probabilistically | **Asymptotically Optimal** | Rewires local neighborhood within radius $r$ to shorten paths over time. |

---

## Interactive Visualization & shadcn/ui Specification

### Component Name: `MotionPlanningArena`

Create a rich interactive path-planning workbench using **React, Tailwind CSS, HTML5 Canvas/SVG, and `shadcn/ui`** where learners can paint walls, inflate obstacles by adjusting the robot's physical radius $R_{\text{robot}}$, compare BFS / Dijkstra / $A^*$ node expansions cell-by-cell, and watch RRT / $\text{RRT}^*$ grow random trees in continuous space.

#### 1. Layout & `shadcn/ui` Primitives
- **Outer Container**: `<Card className="w-full max-w-6xl mx-auto border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">`
- **Mode Switcher**: `<Tabs defaultValue="grid_astar">` with two `<TabsTrigger>` tabs:
  1. `grid_astar` — **"1. C-Space Inflation & Grid Search (BFS vs. Dijkstra vs. A*)"**
  2. `continuous_rrt` — **"2. Continuous Sampling Planner (RRT vs. RRT*)"**

#### 2. Tab 1: C-Space Inflation & $A^*$ Workbench (`grid_astar`)
- **Top Control Toolbar**:
  - `<Select>` for Algorithm: `"A* Search (f = g + h)"`, `"Dijkstra (f = g)"`, `"Breadth-First Search (BFS)"`, `"Greedy Best-First (f = h)"`.
  - `<Select>` for Heuristic: `"Octile (8-Way Admissible)"`, `"Euclidean"`, `"Manhattan (4-Way)"`, `"Weighted A* (w = 2.5)"`.
  - `<Slider>` for **Robot Physical Radius $R_{\text{robot}}$** ($0.05\text{ m}$ to $0.45\text{ m}$): Dynamically grows/shrinks translucent amber **C-Space Inflation Halos** around every painted dark-slate wall cell in real time!
  - `<Switch>` for `"8-Connected Diagonal Moves"` and `<Button>` controls for `"Step 1 Node"`, `"Play Animation"`, `"Clear Walls"`.
- **Interactive Grid Canvas & Telemetry**:
  - Clicking/dragging paints raw LiDAR walls (`100`). Hovering over any explored cell displays a `<Tooltip>` with its exact **`g(n)`**, **`h(n)`**, **`f(n)`**, and parent arrow vector.
  - Once `Goal` is popped, animates the physical circular robot of radius $R_{\text{robot}}$ driving along the reconstructed path so the user visually verifies that its outer perimeter lightly kisses the raw wall without ever colliding when planning outside the amber $\mathcal{C}$-Space boundary!
  - Summary `<Table>` comparing **Nodes Expanded**, **Path Length (meters)**, and **Optimality Status (`<Badge>`)**.

#### 3. Tab 2: Continuous RRT & $\text{RRT}^*$ Tree Explorer (`continuous_rrt`)
- **Top Control Toolbar**:
  - `<Switch>` toggling `"Standard RRT"` vs `"RRT* (Local Neighborhood Rewiring)"`.
  - `<Slider>` for **Step Size $\delta_{\text{step}}$** ($0.2\text{ m}$ to $2.0\text{ m}$) and **Goal Bias Probability $p_{\text{goal}}$** ($0\%$ to $50\%$).
  - `<Button>` for `"Sample 1 Iteration (Show q_rand -> q_near -> q_new)"`, `"Run 500 Iterations"`, `"Shortcut-Smooth Final Path"`.
- **Continuous 2D/Joint-Space Canvas**:
  - Renders each random sample $q_{\text{rand}}$ as a pulsing cyan crosshair, highlights the nearest tree vertex $q_{\text{near}}$, draws the candidate steering edge of length $\delta_{\text{step}}$, flashes red if it intersects an obstacle or green when added to the tree, and highlights the final path in gold with live `<Badge>` metrics for **Tree Vertices**, **Goal Reached Iteration**, and **Total Path Cost**.
