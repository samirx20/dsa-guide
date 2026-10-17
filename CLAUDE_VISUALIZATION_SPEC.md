# Interactive Web Platform & Visualization Blueprint (Handoff Spec for Claude)

This repository contains two complete, self-contained engineering curricula written from first principles (basics to advanced):
1. **`robotics/` (`robotics/ROBOTICS.js`)** — **Phases 0 to 8:** Linux/Git & Modern Python $\to$ Spatial Math & Coordinate Transforms $\to$ Discrete Calculus & Robot Kinematics $\to$ Closed-Loop PID Control & Kalman Filtering $\to$ Real-Time C++ Systems, $A^*$/RRT Motion Planning & ROS2/MuJoCo $\to$ Asyncio & FastAPI Telemetry $\to$ SQL, Docker, Redis & WebSockets $\to$ Pydantic Guardrails & Physics Rule Engines $\to$ Physical AI & Multi-Agent Fleet OS.
2. **`dsa/` (`dsa/DSA.js`)** — **Phases 0 to 14:** C++ Memory, Pointers & Structs/RAII $\to$ C++ STL & Big-O $\to$ Arrays, Prefix Sums, Two Pointers & Sliding Window $\to$ Sorting $\to$ Binary Search $\to$ Strings & KMP $\to$ Recursion & Backtracking $\to$ Linked Lists $\to$ Stacks, Monotonic Stacks & Queues $\to$ Hashing $\to$ Trees, BSTs, Heaps & Tries $\to$ Graphs, Topo Sort, Dijkstra & Union-Find $\to$ 1D/2D Dynamic Programming $\to$ Greedy $\to$ Bit Manipulation & Matrix Math.

---

## 1. Strict UI & Component Rules (`shadcn/ui` Primitives Only)

> **CRITICAL REQUIREMENT:** Do **NOT** use raw browser-default HTML controls anywhere in the UI or inside any interactive visualization widget. Every interactive element must use **`shadcn/ui` primitives** (`@radix-ui/*` + Tailwind CSS + `lucide-react` icons).

### Required Component Replacements
| Forbidden Browser Default | Required `shadcn/ui` Primitive | Usage in Visualizers & App Shell |
| :--- | :--- | :--- |
| `<input type="range">` | `<Slider />` (`@radix-ui/react-slider`) | Tuning joint angles $(\theta_1, \theta_2)$, PID gains $(K_p, K_i, K_d)$, noise covariances $(Q, R)$, array animation speed, and timestep $\Delta t$. |
| `<input type="checkbox">` | `<Checkbox />` or `<Switch />` | Marking lessons complete, toggling C-Space obstacle inflation, enabling/disabling gravity load or anti-windup clamping. |
| `<select>` / `<option>` | `<Select />`, `<SelectTrigger />`, `<SelectContent />`, `<SelectItem />` | Switching pathfinding heuristics (Manhattan / Octile / Euclidean), sorting algorithms, or coordinate frames. |
| Raw button groups | `<Tabs />` or `<ToggleGroup />` | Switching between **Robotics Track**, **DSA Track**, sibling `.md` chapters, or **Elbow-Up / Elbow-Down** IK solutions. |
| `<details>` / `<summary>` | `<Accordion />` or `<Collapsible />` | Expanding/collapsing Curriculum Phases and Topics in the sidebar and code walkthrough drawers. |
| Browser scrollbars | `<ScrollArea />` (`@radix-ui/react-scroll-area`) | Curriculum sidebar navigation, code blocks, and dry-run execution trace logs. |
| Raw HTML `<table>` | `<Table />`, `<TableHeader />`, `<TableRow />`, `<TableCell />` | Live dry-run variable state tables, complexity matrices, and Kalman/PID telemetry readouts. |
| `title="..."` native tooltips | `<Tooltip />`, `<TooltipTrigger />`, `<TooltipContent />` | Explaining matrix entries, pointer addresses, and graph node $(g, h, f)$ scores on hover. |
| Div containers | `<Card />`, `<CardHeader />`, `<CardTitle />`, `<CardDescription />`, `<CardContent />` | Wrapping every Interactive Visualization Lab, telemetry readout panel, and chapter reader container. |
| Status spans | `<Badge variant="..." />` | Difficulty tags (`Easy`, `Medium`, `Hard`), `Interactive Lab` indicators, and pointer tags (`HEAD`, `TAIL`, `L`, `M`, `R`). |

---

## 2. Robotics Curriculum (`robotics/`) — Interactive Visualization Specs by Phase

Each chapter in `robotics/part0` through `robotics/part4` also contains an inline `## Interactive Visualization & shadcn/ui Specification` block at the bottom of the markdown file. Below is the complete index of visualizers to embed:

### Phase 0: Linux, Git & Strictly-Typed Python (`robotics/part0`)
1. **POSIX Stream & Pipe Simulator (`part0/topic1/chapter1`):**
   - **Visual:** Interactive node diagram showing a process (`sensor_daemon`) with 3 output ports (`fd 0 stdin`, `fd 1 stdout` in emerald, `fd 2 stderr` in rose) piping into `grep` and file redirects.
   - **`shadcn/ui` Controls:** `<ToggleGroup>` to select redirect mode (`>`, `>>`, `2>&1`, `| grep ERROR`), `<Button>` to emit simulated normal/error log lines, `<ScrollArea>` terminal output preview.
2. **Git DAG & Pointer Visualizer (`part0/topic1/chapter2`):**
   - **Visual:** Directed Acyclic Graph of commit nodes (`c1 ← c2 ← c3`) with animated `main`, `feature/ik-solver`, and `HEAD` `<Badge>` pointers.
   - **`shadcn/ui` Controls:** `<Button>` actions for `git commit`, `git checkout -b`, `git merge`, and `git rebase`, showing live commit-tree rewiring.
3. **Pydantic / Type-Checker Boundary Inspector (`part0/topic2`):**
   - **Visual:** Split payload inspector showing raw untrusted JSON entering a typed Python function and highlighting type coercions vs. rejected fields.

### Phase 1: Spatial Mathematics & Coordinate Frames (`robotics/part1`)
1. **Unit Circle, Radians & Four-Quadrant `atan2(y, x)` Explorer (`part1/topic1/chapter1`):**
   - **Visual:** Interactive SVG/Canvas unit circle where dragging a point $(x, y)$ highlights the $\cos\theta$ (horizontal), $\sin\theta$ (vertical), arc length $s = r\theta$, and compares broken `atan(y/x)` (which flips $180^\circ$ wrong in Quadrants II & III) against `atan2(y, x)` + `wrap_to_pi`.
   - **`shadcn/ui` Controls:** `<Slider>` for angle $\theta \in [-2\pi, 2\pi]$, `<Switch>` to toggle `atan` vs. `atan2`, `<Card>` displaying live KaTeX values.
2. **2D/3D Vector Dot & Cross Product Sandbox (`part1/topic1/chapter2`):**
   - **Visual:** Draggable Robot Heading vector $\hat{\mathbf{h}}$ and Target vector $\mathbf{d}$. Draws the orthogonal projection shadow ($\mathbf{a}\cdot\mathbf{b}$), camera FOV cone, and the signed steering arc ($\hat{\mathbf{h}}\times\mathbf{d}$).
   - **`shadcn/ui` Controls:** `<Slider>` for FOV angle, `<Badge>` indicating `AHEAD` / `BEHIND` and `STEER LEFT (+ω)` / `STEER RIGHT (-ω)`.
3. **Linear Matrix Space Transformer (`part1/topic2/chapter1`):**
   - **Visual:** 3Blue1Brown-style morphing 2D coordinate grid showing where unit basis vectors $\hat{\mathbf{i}} = [1, 0]^T$ (red) and $\hat{\mathbf{j}} = [0, 1]^T$ (emerald) land under matrix $\mathbf{A} = \begin{bmatrix} a & b \\ c & d \end{bmatrix}$, plus the shaded unit-square area equal to $\det(\mathbf{A})$.
   - **`shadcn/ui` Controls:** `<Tabs>` for presets (`Rotation`, `Shear`, `Singular det=0`, `Reflection`), four `<Slider>` controls for $a, b, c, d$, `<Button>` to animate $\mathbf{A}$ and $\mathbf{A}^{-1}$.
4. **$SO(2)/SO(3)$ Rotation, Gimbal Lock & Quaternion Visualizer (`part1/topic2/chapter2`):**
   - **Visual:** 3D gimbal ring model (Three.js / Canvas3D) showing Roll ($\phi$), Pitch ($\theta$), and Yaw ($\psi$) rings locking into the same plane when Pitch $= 90^\circ$, alongside smooth SLERP quaternion interpolation.
   - **`shadcn/ui` Controls:** `<Slider>` for Roll, Pitch, Yaw, `<Button>` for `"Snap Pitch to 90° (Trigger Gimbal Lock)"`, `<Switch>` for Euler vs. Quaternion mode.
5. **$SE(2)$ Homogeneous Transform & Multi-Frame Tree (`part1/topic2/chapter3` & `project`):**
   - **Visual:** World frame $\{W\}$, Robot Base $\{B\}$, and LiDAR Sensor $\{S\}$ with FOV cone and draggable obstacle $P$.
   - **`shadcn/ui` Controls:** `<Slider>` for robot $(t_x, t_y, \theta)$ and sensor mount $(s_x, s_y, \alpha)$, `<Table>` displaying live coordinates $^W\mathbf{p}, \,^B\mathbf{p}, \,^S\mathbf{p}$ and $3\times 3$ matrices $^W_B\mathbf{T}, \,^B_S\mathbf{T}, \,^W_S\mathbf{T}, \,^B_W\mathbf{T}$.

### Phase 2: Discrete Calculus, Physics & Robot Kinematics (`robotics/part2`)
1. **Discrete Calculus ($\Delta t$), Derivative Noise & Euler vs. RK2 Integrator (`part2/topic1/chapter1`):**
   - **Visual:** Dual plot comparing raw finite-difference velocity $\frac{x_k - x_{k-1}}{\Delta t}$ (spiky under sensor noise) vs. Low-Pass Filtered velocity, and Forward Euler (spiraling outward on a harmonic oscillator) vs. Midpoint/RK2 integration.
   - **`shadcn/ui` Controls:** `<Slider>` for timestep $\Delta t$, sensor noise $\sigma$, and EMA filter $\alpha$; `<Select>` for integrator method (`Forward Euler`, `Semi-Implicit Euler`, `Midpoint RK2`).
2. **2-DOF Robot Arm Forward & Inverse Kinematics + Jacobian Singularity Lab (`part2/topic2/chapter1`):**
   - **Visual:** Interactive 2-link arm with inner ($|L_1-L_2|$) and outer ($L_1+L_2$) workspace circles, draggable target $(x, y)$, and live manipulability velocity ellipse at the gripper.
   - **`shadcn/ui` Controls:** `<ToggleGroup>` for `Elbow-Down` vs. `Elbow-Up`, `<Slider>` for link lengths $L_1, L_2$, `<Badge>` warning when $|\det(\mathbf{J})| = |L_1 L_2 \sin\theta_2| \to 0$.
3. **Differential Drive ICC & Wheel Encoder Odometry Simulator (`part2/topic2/chapter2`):**
   - **Visual:** Top-down mobile robot showing left/right wheel velocity vectors $(v_L, v_R)$, the Instantaneous Center of Curvature (ICC) pivot point, and accumulating dead-reckoning drift over a figure-8 path.
   - **`shadcn/ui` Controls:** `<Slider>` for $\omega_L, \omega_R$, wheelbase $L$, wheel radius $r$, and encoder slip noise.

### Phase 3: Closed-Loop Control & Probabilistic State Estimation (`robotics/part3`)
1. **60fps PID Controller, Anti-Windup & Derivative-Kick Oscilloscope (`part3/topic1/chapter1`):**
   - **Visual:** Real-time 60fps scrolling telemetry chart of Setpoint $r(t)$, Actual Position $y(t)$, and stacked bar gauges for $P$, $I$, and $D$ actuator effort against a simulated vertical drone/elevator with gravity.
   - **`shadcn/ui` Controls:** `<Slider>` for $K_p, K_i, K_d$, `<Switch>` for `Gravity Load`, `Integrator Anti-Windup`, and `Derivative-on-Measurement`, `<Button>` for `Step Setpoint` and `Impulse Disturbance`.
2. **Cascaded Control & State-Space LQR Explorer (`part3/topic1/chapter2`):**
   - **Visual:** Interactive block diagram and step-response comparator contrasting Single-Loop PID vs. Cascaded (Position $\to$ Velocity $\to$ Torque) and LQR state penalties ($Q$ vs. $R$).
3. **Gaussian Sensor Noise & 2D Covariance Ellipse Lab (`part3/topic2/chapter1`):**
   - **Visual:** Interactive 1D bell curves ($\mathcal{N}(\mu, \sigma^2)$) and 2D scatter cloud with $1\sigma, 2\sigma, 3\sigma$ eigen-axes ellipses.
4. **Interactive Kalman Filter & Sensor Fusion Lab (`part3/topic2/chapter2`):**
   - **Visual:** Side-by-side 1D Gaussian multiplication curve ($\mathcal{N}_{\text{pred}} \times \mathcal{N}_{\text{meas}} = \mathcal{N}_{\text{post}}$) AND 2D robot trajectory fusing drifting odometry with noisy GPS fixes.
   - **`shadcn/ui` Controls:** `<Slider>` for Process Noise $Q$ and Sensor Noise $R$, `<Button>` to step `Predict()` (uncertainty grows) and `Update(z)` (uncertainty shrinks), `<Table>` showing live $K_k = \frac{P}{P+R}$ and RMSE reduction.

### Phase 4: Real-Time C++, Motion Planning & ROS2 Simulation (`robotics/part4`)
1. **Stack vs. Heap Jitter & Cache-Line Struct Inspector (`part4/topic1/chapter1`):**
   - **Visual:** 64-byte CPU cache-line memory grid comparing scattered heap nodes (`new`) with a packed `alignas(32) ImuFrame` struct and `std::unique_ptr` ownership transfer.
2. **Real-Time C++ Ring Buffer (`push_overwrite`) & 100Hz Thread Timing Lab (`part4/topic1/chapter2`):**
   - **Visual:** Circular 8-slot array showing `head` (400Hz IMU producer) and `tail` (100Hz PID consumer), modulo wrap-around, and `sleep_for` drift vs. `sleep_until` steady clock.
   - **`shadcn/ui` Controls:** `<Button>` for `push_overwrite()`, `pop()`, and `Burst +5 Frames`, `<Badge>` indicators for `HEAD`, `TAIL`, and `Overwritten Count`.
3. **Occupancy Grid Motion Planner ($A^*$ vs. Dijkstra + $\mathcal{C}$-Space + RRT) (`part4/topic2/chapter1`):**
   - **Visual:** Interactive occupancy grid for painting obstacles, toggling $\mathcal{C}$-Space dilation by robot radius $R$, and stepping through $A^*$ vs. Dijkstra vs. RRT tree expansion.
   - **`shadcn/ui` Controls:** `<Select>` for algorithm (`A* Octile`, `A* Manhattan`, `Dijkstra`, `RRT`), `<Switch>` for `C-Space Inflation`, `<Slider>` for playback speed.
4. **ROS2 Computation Graph & TF2 Inspector (`part4/topic2/chapter2`):**
   - **Visual:** Interactive node/topic graph (`/lidar_node` $\to$ `/scan` $\to$ `/nav2_planner` $\to$ `/cmd_vel` $\to$ `/motor_driver`) with QoS latency/drop simulation.

### Phases 5–8: Async Python, Telemetry Cloud, Pydantic Guardrails & Physical AI (`robotics/part5`–`part8`)
1. **Asyncio Event Loop & TaskGroup Timeline Visualizer (`part5/topic1`):** Interactive single-thread coroutine scheduler contrasting blocking `requests.get` with concurrent `asyncio.gather` / `httpx.AsyncClient`.
2. **FastAPI Request Lifecycle & Dependency Injection Graph (`part5/topic2`):** Animated HTTP request flowing through Pydantic validation $\to$ `Depends(get_db)` yield setup $\to$ endpoint $\to$ teardown.
3. **SQL JOIN, Index B-Tree & Redis Cache-Aside Simulator (`part6`):** Visualizes cache hit/miss latencies, WebSockets full-duplex frames, and Docker container networking.
4. **Physics-First Rule Engine & Guardrail Interceptor (`part7`):** Interactive command tester where an LLM proposes motor/thermal commands and the 3-layer guardrail (`Physics Rules` $\to$ `Safety Rules` $\to$ `Execution`) accepts, clamps, or blocks unsafe commands with an audit log `<Table>`.
5. **5-Stage Autonomous Fleet Pipeline Trace (`part8`):** Interactive end-to-end trace inspector (`Planner` $\to$ `RAG Retriever` $\to$ `Tool Executor` $\to$ `Physics Validator` $\to$ `Synthesizer`) with token budget and cosine-similarity chunk visualizer.

---

## 3. C++ DSA Curriculum (`dsa/`) — Interactive Visualization Specs by Phase

Every phase in `dsa/DSA.js` (`part0` through `part14`) should render an interactive step-by-step algorithm visualizer powered by `shadcn/ui` playback controls (`<Button>` Play / Pause / Step Forward / Step Back, `<Slider>` playback speed, `<Tabs>` code variations, and a live `<Table>` dry-run state inspector):

- **Phase 0 (`dsa/part0` — C++ Memory, Pointers & RAII):** Interactive RAM byte-address grid (`0x1000`–`0x1040`) showing stack frames, pointer arrows (`int* p = &x`), reference aliases (`int& r = x`), and `SimpleVector` capacity doubling.
- **Phase 1 (`dsa/part1` — C++ STL & Big-O):** Interactive `std::vector` `size()` vs. `capacity()` reallocation stepper, `unordered_map` hash bucket inspector, and interactive Big-O growth curve comparator ($O(1)$ to $O(2^n)$).
- **Phase 2 (`dsa/part2` — Arrays, Prefix Sums, Two Pointers & Sliding Window):**
  - *Kadane's Algorithm:* Array bar chart highlighting `current_sum` vs. `max_sum` at each index `i`.
  - *Prefix Sum:* Simultaneous 1D/2D `prefix[]` array builder showing $O(1)$ range sum query `prefix[R] - prefix[L-1]`.
  - *Two Pointers & Sliding Window:* Animated `L` and `R` `<Badge>` pointers squeezing inward (`3Sum`, `Container With Most Water`) or expanding/shrinking a window (`Minimum Window Substring`) with a live frequency map `<Table>`.
- **Phase 3 (`dsa/part3` — Sorting Algorithms):** Side-by-side animated bar visualizer with swap/comparison counters for Bubble, Insertion, Selection, Merge Sort (with recursion tree split/merge), Quick Sort (with pivot partitioning), and Counting/Radix buckets.
- **Phase 4 (`dsa/part4` — Binary Search):** Step-by-step `L`, `M`, `R` pointer eliminator for Classic Binary Search, `lower_bound` / `upper_bound`, Rotated Sorted Array, and **Binary Search on Answer Space** (showing the monotonic `[False, False, True, True]` feasibility predicate).
- **Phase 5 (`dsa/part5` — Strings & KMP):** LPS (Longest Prefix Suffix) table builder and KMP two-pointer string matcher that never decrements text pointer `i`.
- **Phase 6 (`dsa/part6` — Recursion & Backtracking):** Live Call Stack frame tower + interactive decision tree with pruned branches highlighted in rose (`Subsets`, `Permutations`, `N-Queens`).
- **Phase 7 (`dsa/part7` — Linked Lists):** Node-and-pointer box visualizer animating `prev`, `curr`, `next` pointer reversal, Dummy Head insertion, and Floyd's Tortoise & Hare (`slow` / `fast`) cycle detection.
- **Phase 8 (`dsa/part8` — Stacks, Monotonic Stacks & Queues):** Vertical stack tower animating **Monotonic Decreasing Stack** (`Next Greater Element` / `Daily Temperatures`) and Sliding Window Maximum (`std::deque`).
- **Phase 9 (`dsa/part9` — Hashing Internals):** Hash function $\to$ bucket index modulo $\to$ collision chaining / open addressing stepper.
- **Phase 10 (`dsa/part10` — Trees, BSTs, Heaps & Tries):** SVG Tree visualizer animating Preorder/Inorder/Postorder DFS, Level-Order BFS queue, Binary Heap array-to-tree mapping (`2i+1`, `2i+2`), and Prefix Trie character nodes.
- **Phase 11 (`dsa/part11` — Graphs, Topo Sort, Dijkstra & Union-Find):** Interactive node-edge graph animating DFS/BFS, Kahn's Indegree Topological Sort, Dijkstra's Priority Queue edge relaxation, and Disjoint Set Union (`find` path compression + `union` by rank).
- **Phase 12 (`dsa/part12` — Dynamic Programming):** Interactive 1D/2D DP table filler highlighting state transition dependencies (`dp[i][j] = dp[i-1][j] + dp[i][j-1]`) and Top-Down memoization recursion tree cache hits.
- **Phase 13 (`dsa/part13` — Greedy):** Interval timeline visualizer (`Merge Intervals`, `Non-Overlapping Intervals`) sorted by end/start times.
- **Phase 14 (`dsa/part14` — Bit Manipulation & Matrix Math):** 32-bit binary toggle switches (`<ToggleGroup>`) for `&`, `|`, `^`, `~`, `<<`, `>>`, `n & (n - 1)` lowest-set-bit trick, and 2D matrix transpose + reverse rotation.
