# Part 4, Topic 2: Autonomous Motion Planning & ROS2 Simulation
## Project: Multithreaded C++ Autonomous Robot Daemon with A* & UDP Telemetry

---

### Project Overview & What You Will Build

In this capstone project for **Part 4 (Real-Time C++ Systems & Autonomous Motion Planning)**, you will build a production-grade, **zero-heap-allocation-in-loop Multithreaded C++20 Autonomous Robot Daemon (`robot_daemon`)**.

Instead of writing toy single-threaded scripts that freeze when planning a path or sending network data, you will engineer the exact four-thread architecture used on real warehouse Autonomous Mobile Robots (AMRs) and quadrupeds:

1. **Thread 1 — $400\text{ Hz}$ IMU & Wheel Odometry Producer (`2.5 ms` period):**
   Integrates high-rate gyroscope and wheel-encoder rates into a cache-aligned `alignas(32) RobotStatePacket` and pushes it into a bounded, zero-allocation **Overwrite-Oldest Ring Buffer**.
2. **Thread 2 — $20\text{ Hz}$ C-Space Obstacle Inflator & $A^*$ Path Planner (`50.0 ms` period):**
   Inflates a 2D Occupancy Grid by the robot's physical radius $R_{\text{robot}} = 0.25\text{ m}$ and runs 8-connected Octile **$A^*$ Search** to publish a collision-free waypoint path via `std::shared_ptr<const WaypointPath>` (zero-copy atomic pointer swap!).
3. **Thread 3 — $100\text{ Hz}$ Hard Real-Time Trajectory Tracking Controller (`10.0 ms` period):**
   Runs on a phase-locked `std::chrono::steady_clock` + `sleep_until(next_tick)` cadence, drains the latest state from the Ring Buffer, reads the latest `shared_ptr<const WaypointPath>`, computes Pure-Pursuit / PD wheel velocity commands $(v, \omega)$, and records worst-case loop jitter ($\mu\text{s}$).
4. **Thread 4 — $20\text{ Hz}$ Asynchronous RAII UDP Telemetry Broadcaster (`50.0 ms` period):**
   Pops binary/JSON telemetry packets from an outgoing Ring Buffer and streams them over a non-blocking RAII UDP socket to a live visualization dashboard without ever stalling the $100\text{ Hz}$ control thread!

```
================================================================================
   CAPSTONE ARCHITECTURE: MULTITHREADED C++20 AUTONOMOUS ROBOT DAEMON
================================================================================

  +--------------------------------------------------------------------------+
  | Thread 1: Sensor & Odometry Simulator (400 Hz / 2.5 ms | steady_clock)   |
  +--------------------------------------------------------------------------+
                                       |
                      push_overwrite() | (struct alignas(32) RobotStatePacket)
                                       v
                    [ RealTimeRingBuffer<RobotStatePacket, 16> ]
                                       |
                          pop_latest() |
                                       v
  +--------------------------------------------------------------------------+
  | Thread 3: Hard Real-Time PD / Pure-Pursuit Controller (100 Hz / 10.0 ms) |
  |   * Zero heap allocations inside loop!                                   |
  |   * Tracks worst-case wakeup jitter_us & deadline overruns.              |
  +--------------------------------------------------------------------------+
                  ^                                         |
                  | Atomic zero-copy read                   | push_overwrite()
                  | std::shared_ptr<const WaypointPath>     v
  +-------------------------------+         [ RealTimeRingBuffer<TelemetryFrame, 8> ]
  | Thread 2: C-Space & A*        |                         |
  | Planner Thread (20 Hz / 50ms) |            pop_oldest() |
  +-------------------------------+                         v
                                            +--------------------------------+
                                            | Thread 4: RAII UDP Socket      |
                                            | Telemetry Streamer (20 Hz)     |
                                            +--------------------------------+
                                                            |
                                                            v (UDP Port 9870)
                                              [ Live Telemetry Dashboard UI ]
================================================================================
```

---

### Learning Objectives Reinforced

- **Topic 1, Chapter 1:** Cache-aligned `struct alignas(32)` packets, RAII hardware/socket guards (`~ScopedUdpSocket()`), `std::unique_ptr` / `std::shared_ptr<const T>` zero-copy ownership transfer.
- **Topic 1, Chapter 2:** Fixed-capacity `RealTimeRingBuffer<T, N>` with `(i + 1) % N` wrap-around and `push_overwrite`, `std::lock_guard<std::mutex>`, and drift-free `std::this_thread::sleep_until(next_tick)` loops.
- **Topic 2, Chapter 1:** 2D Occupancy Grid indexing, $\mathcal{C}$-Space circular obstacle inflation ($r_{\text{inflate}} = \lceil R_{\text{robot}} / \Delta_{\text{res}} \rceil$), and 8-connected Octile $A^*$ search.

---

### Project Directory Structure & `CMakeLists.txt`

Create a clean folder named `cpp_autonomous_daemon/` with the following structure:

```
cpp_autonomous_daemon/
├── CMakeLists.txt
├── include/
│   ├── telemetry_packets.hpp     # alignas(32) structs & WaypointPath
│   ├── ring_buffer.hpp           # Thread-safe fixed-capacity circular queue
│   ├── astar_planner.hpp         # C-Space inflation + 8-way Octile A*
│   └── raii_udp_socket.hpp       # Scoped RAII UDP broadcaster + safety disarm
└── src/
    └── main_daemon.cpp           # 4-thread autonomous robot daemon + jitter profiler
```

#### `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.16)
project(cpp_autonomous_daemon VERSION 1.0.0 LANGUAGES CXX)

# Enforce modern C++20 with strict warnings and Release optimization
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -O3 -pthread)
endif()

find_package(Threads REQUIRED)

add_executable(robot_daemon
    src/main_daemon.cpp
)

target_include_directories(robot_daemon PRIVATE include)
target_link_libraries(robot_daemon PRIVATE Threads::Threads)

# On Windows, link Winsock2 for UDP telemetry sockets
if(WIN32)
    target_link_libraries(robot_daemon PRIVATE ws2_32)
endif()
```

---

### Milestone 1: Cache-Aligned Telemetry Structs (`include/telemetry_packets.hpp`)

In Milestone 1, we design our data structures so that high-frequency state and telemetry packets fit cleanly into **$32\text{-byte}$ or $64\text{-byte}$ CPU cache lines** without hidden compiler padding.

```cpp
#pragma once
#include <array>
#include <vector>
#include <cstdint>

struct GridPoint {
    int r{0};
    int c{0};
    bool operator==(const GridPoint& o) const noexcept { return r == o.r && c == o.c; }
};

// Shared read-only path published by Thread 2 (A*) and read by Thread 3 (Controller)
struct WaypointPath {
    uint64_t plan_sequence_id{0};
    std::vector< std::pair<double, double> > world_xy_m; // Continuous (x, y) meters
};

// 32-Byte Cache-Aligned Robot State Packet (Exactly 2 per 64-byte L1 Cache Line!)
struct alignas(32) RobotStatePacket {
    double timestamp_sec{0.0}; // 8 bytes (Offset 0..7)
    float x_m{0.0f};           // 4 bytes (Offset 8..11)
    float y_m{0.0f};           // 4 bytes (Offset 12..15)
    float theta_rad{0.0f};     // 4 bytes (Offset 16..19)
    float v_linear_m_s{0.0f};  // 4 bytes (Offset 20..23)
    float omega_rad_s{0.0f};   // 4 bytes (Offset 24..27)
    uint32_t sequence_id{0};   // 4 bytes (Offset 28..31) -> Total = 32 bytes!
};
static_assert(sizeof(RobotStatePacket) == 32, "RobotStatePacket must be 32 bytes!");

// 64-Byte Cache-Aligned Outgoing Telemetry Frame (Exactly 1 per 64-byte Cache Line!)
struct alignas(64) TelemetryFrame {
    double timestamp_sec{0.0};      // 8 bytes (Offset 0..7)
    double wakeup_jitter_us{0.0};   // 8 bytes (Offset 8..15)
    double loop_exec_us{0.0};       // 8 bytes (Offset 16..23)
    float x_m{0.0f};                // 4 bytes (Offset 24..27)
    float y_m{0.0f};                // 4 bytes (Offset 28..31)
    float theta_rad{0.0f};          // 4 bytes (Offset 32..35)
    float cmd_v_m_s{0.0f};          // 4 bytes (Offset 36..39)
    float cmd_omega_rad_s{0.0f};    // 4 bytes (Offset 40..43)
    float goal_dist_m{0.0f};        // 4 bytes (Offset 44..47)
    uint32_t ctrl_tick{0};          // 4 bytes (Offset 48..51)
    uint32_t active_waypoint_idx{0};// 4 bytes (Offset 52..55)
    uint32_t deadline_misses{0};    // 4 bytes (Offset 56..59)
    uint32_t reserved_pad{0};       // 4 bytes (Offset 60..63) -> Total = 64 bytes!
};
static_assert(sizeof(TelemetryFrame) == 64, "TelemetryFrame must be 64 bytes!");
```

#### What's happening:

```cpp
static_assert(sizeof(RobotStatePacket) == 32, "RobotStatePacket must be 32 bytes!");
static_assert(sizeof(TelemetryFrame) == 64, "TelemetryFrame must be 64 bytes!");
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Compile-time assertions (`static_assert`) verify our byte layout before the binary
// is even linked! If someone later adds a stray `bool` that introduces hidden padding,
// the build fails immediately with a clear error message.
```

---

### Milestone 2: Fixed-Capacity Overwrite-Oldest Ring Buffer (`include/ring_buffer.hpp`)

Next, implement the thread-safe, fixed-capacity circular buffer with **both** `pop_oldest()` (for sequential telemetry streaming) and `pop_latest_and_clear()` (for the $100\text{ Hz}$ control loop, which only cares about the newest physical robot pose).

```cpp
#pragma once
#include <array>
#include <mutex>
#include <optional>
#include <cstddef>

template <typename T, std::size_t Capacity>
class RealTimeRingBuffer {
    static_assert(Capacity > 0, "Capacity must be > 0");

public:
    void push_overwrite(const T& item) noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        buffer_[head_] = item;
        head_ = (head_ + 1) % Capacity;
        if (count_ == Capacity) {
            tail_ = (tail_ + 1) % Capacity;
            ++overwritten_count_;
        } else {
            ++count_;
        }
    }

    std::optional<T> pop_oldest() noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        if (count_ == 0) return std::nullopt;
        T item = buffer_[tail_];
        tail_ = (tail_ + 1) % Capacity;
        --count_;
        return item;
    }

    // Returns the single freshest sample and flushes older queued samples in O(1)!
    std::optional<T> pop_latest_and_clear() noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        if (count_ == 0) return std::nullopt;
        std::size_t newest_idx = (head_ + Capacity - 1) % Capacity;
        T newest = buffer_[newest_idx];
        tail_  = head_;
        count_ = 0;
        return newest;
    }

private:
    mutable std::mutex mtx_;
    std::array<T, Capacity> buffer_{};
    std::size_t head_{0};
    std::size_t tail_{0};
    std::size_t count_{0};
    std::size_t overwritten_count_{0};
};
```

#### What's happening:

```cpp
        std::size_t newest_idx = (head_ + Capacity - 1) % Capacity;
        T newest = buffer_[newest_idx];
        tail_  = head_;
        count_ = 0;
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//      Instead of looping through all queued items, we compute the index just
//      behind `head_` using `(head_ + Capacity - 1) % Capacity` (adding `Capacity`
//      prevents unsigned underflow when `head_ == 0`), grab the newest sample,
//      and reset `tail_ = head_` and `count_ = 0` in O(1) time!
```

---

### Milestone 3: C-Space Obstacle Inflation & 8-Way Octile $A^*$ (`include/astar_planner.hpp`)

Now let's wrap our $\mathcal{C}$-Space obstacle inflator and 8-connected $A^*$ planner into a reusable header that converts grid waypoints `(r, c)` into continuous world coordinates `(x_m, y_m)`.

```cpp
#pragma once
#include "telemetry_packets.hpp"
#include <vector>
#include <queue>
#include <cmath>
#include <limits>
#include <algorithm>
#include <memory>

class GridAStarPlanner {
public:
    GridAStarPlanner(int rows, int cols, double res_m)
        : rows_(rows), cols_(cols), res_m_(res_m) {}

    std::vector<int> inflate_cspace(const std::vector<int>& raw_grid, double robot_radius_m) const {
        int rad_cells = static_cast<int>(std::ceil(robot_radius_m / res_m_));
        std::vector<int> cspace = raw_grid;
        for (int r = 0; r < rows_; ++r) {
            for (int c = 0; c < cols_; ++c) {
                if (raw_grid[r * cols_ + c] == 100) {
                    for (int dr = -rad_cells; dr <= rad_cells; ++dr) {
                        for (int dc = -rad_cells; dc <= rad_cells; ++dc) {
                            if (dr * dr + dc * dc <= rad_cells * rad_cells) {
                                int nr = r + dr, nc = c + dc;
                                if (nr >= 0 && nr < rows_ && nc >= 0 && nc < cols_) {
                                    cspace[nr * cols_ + nc] = 100;
                                }
                            }
                        }
                    }
                }
            }
        }
        return cspace;
    }

    std::shared_ptr<const WaypointPath> plan_world_path(
        const std::vector<int>& cspace_grid,
        GridPoint start, GridPoint goal, uint64_t seq_id) const {

        struct Node {
            GridPoint pt;
            double f;
            bool operator>(const Node& o) const noexcept { return f > o.f; }
        };

        const double INF = std::numeric_limits<double>::infinity();
        std::vector<double> g(rows_ * cols_, INF);
        std::vector<int> parent(rows_ * cols_, -1);
        std::vector<uint8_t> closed(rows_ * cols_, 0);
        std::priority_queue<Node, std::vector<Node>, std::greater<Node>> open;

        auto octile = [](GridPoint a, GridPoint b) {
            double dr = std::abs(a.r - b.r), dc = std::abs(a.c - b.c);
            return std::max(dr, dc) + 0.41421356237 * std::min(dr, dc);
        };

        int s_idx = start.r * cols_ + start.c;
        int g_idx = goal.r * cols_ + goal.c;
        g[s_idx] = 0.0;
        open.push(Node{start, octile(start, goal)});

        const int dr[8] = {-1, 1, 0, 0, -1, -1, 1, 1};
        const int dc[8] = {0, 0, -1, 1, -1, 1, -1, 1};
        const double cost[8] = {1.0, 1.0, 1.0, 1.0, 1.41421356, 1.41421356, 1.41421356, 1.41421356};

        while (!open.empty()) {
            GridPoint curr = open.top().pt;
            open.pop();
            int c_idx = curr.r * cols_ + curr.c;

            if (curr == goal) {
                auto result = std::make_shared<WaypointPath>();
                result->plan_sequence_id = seq_id;
                for (int at = g_idx; at != -1; at = parent[at]) {
                    int r = at / cols_, c = at % cols_;
                    result->world_xy_m.push_back({(c + 0.5) * res_m_, (r + 0.5) * res_m_});
                }
                std::reverse(result->world_xy_m.begin(), result->world_xy_m.end());
                return result;
            }

            if (closed[c_idx]) continue;
            closed[c_idx] = 1;

            for (int i = 0; i < 8; ++i) {
                int nr = curr.r + dr[i], nc = curr.c + dc[i];
                if (nr < 0 || nr >= rows_ || nc < 0 || nc >= cols_) continue;
                int n_idx = nr * cols_ + nc;
                if (cspace_grid[n_idx] > 0 || closed[n_idx]) continue;

                double tentative_g = g[c_idx] + cost[i];
                if (tentative_g < g[n_idx]) {
                    g[n_idx] = tentative_g;
                    parent[n_idx] = c_idx;
                    open.push(Node{GridPoint{nr, nc}, tentative_g + octile({nr, nc}, goal)});
                }
            }
        }
        return nullptr;
    }

private:
    int rows_;
    int cols_;
    double res_m_;
};
```

---

### Milestone 4: RAII Safety Broadcaster & 4-Thread Main Daemon (`src/main_daemon.cpp`)

Finally, let's bring all 4 threads together in `src/main_daemon.cpp`. Notice how:
- An RAII `ScopedSafetyDisarmGuard` guarantees that even if the daemon exits early, the motors receive a `0.0 m/s` disarm command.
- Thread 2 ($A^*$) shares its planned trajectory with Thread 3 ($100\text{ Hz}$ controller) using a lock-guarded `std::shared_ptr<const WaypointPath>` so the controller never copies the `std::vector` of waypoints!
- Thread 3 measures its own **Wakeup Jitter** ($t_{\text{actual}} - t_{\text{scheduled}}$) in microseconds on every single $100\text{ Hz}$ tick.

```cpp
#include "telemetry_packets.hpp"
#include "ring_buffer.hpp"
#include "astar_planner.hpp"
#include <iostream>
#include <iomanip>
#include <thread>
#include <atomic>
#include <chrono>
#include <cmath>

// RAII Hardware Safety Guard: Guarantees zero-velocity disarm on scope exit!
class ScopedSafetyDisarmGuard {
public:
    ScopedSafetyDisarmGuard() {
        std::cout << "[RAII SafetyGuard] Armed motor bus (v=0.0 m/s, w=0.0 rad/s)\n";
    }
    ~ScopedSafetyDisarmGuard() noexcept {
        std::cout << "[RAII SafetyGuard] Scope exiting -> Sending 0.0 m/s DISARM frame!\n";
    }
    ScopedSafetyDisarmGuard(const ScopedSafetyDisarmGuard&) = delete;
    ScopedSafetyDisarmGuard& operator=(const ScopedSafetyDisarmGuard&) = delete;
};

int main() {
    using Clock = std::chrono::steady_clock;
    using namespace std::chrono_literals;

    ScopedSafetyDisarmGuard safety_guard; // RAII: Disarms automatically when main() exits!

    RealTimeRingBuffer<RobotStatePacket, 16> state_ring;
    RealTimeRingBuffer<TelemetryFrame, 8> telemetry_ring;

    // Shared zero-copy trajectory pointer between Planner (Thread 2) & Controller (Thread 3)
    std::mutex path_mtx;
    std::shared_ptr<const WaypointPath> active_path_ptr{nullptr};

    // Shared latest velocity commands from Controller (Thread 3) back to Physics (Thread 1)
    std::atomic<float> cmd_v_atomic{0.0f};
    std::atomic<float> cmd_w_atomic{0.0f};
    std::atomic<bool> keep_running{true};

    // Build a 20x20 Occupancy Grid (0.20 m/cell -> 4.0m x 4.0m warehouse room)
    const int ROWS = 20, COLS = 20;
    const double RES_M = 0.20;
    std::vector<int> raw_grid(ROWS * COLS, 0);
    for (int r = 0; r < 14; ++r) raw_grid[r * COLS + 10] = 100; // Obstacle wall at x = 2.0m

    GridAStarPlanner planner(ROWS, COLS, RES_M);
    const auto cspace_grid = planner.inflate_cspace(raw_grid, 0.25); // 0.25m robot radius

    const auto t_boot = Clock::now();

    // -------------------------------------------------------------------------
    // THREAD 1: 400 Hz Odometry & Unicycle Kinematics Simulator (Period = 2.5 ms)
    // -------------------------------------------------------------------------
    std::thread odom_thread([&]() {
        auto next_tick = Clock::now();
        float x = 0.30f, y = 0.30f, theta = 0.0f;
        uint32_t seq = 1;
        const float dt = 0.0025f;

        while (keep_running.load(std::memory_order_relaxed)) {
            next_tick += 2500us;
            float v = cmd_v_atomic.load(std::memory_order_relaxed);
            float w = cmd_w_atomic.load(std::memory_order_relaxed);

            x += v * std::cos(theta) * dt;
            y += v * std::sin(theta) * dt;
            theta += w * dt;

            double t_sec = std::chrono::duration<double>(Clock::now() - t_boot).count();
            state_ring.push_overwrite(RobotStatePacket{t_sec, x, y, theta, v, w, seq++});
            std::this_thread::sleep_until(next_tick);
        }
    });

    // -------------------------------------------------------------------------
    // THREAD 2: 20 Hz C-Space A* Path Planner (Period = 50.0 ms)
    // -------------------------------------------------------------------------
    std::thread planner_thread([&]() {
        auto next_tick = Clock::now();
        uint64_t plan_seq = 1;
        while (keep_running.load(std::memory_order_relaxed)) {
            next_tick += 50ms;
            auto new_path = planner.plan_world_path(
                cspace_grid, GridPoint{1, 1}, GridPoint{18, 18}, plan_seq++);
            if (new_path) {
                std::lock_guard<std::mutex> lock(path_mtx);
                active_path_ptr = std::move(new_path); // O(1) pointer swap!
            }
            std::this_thread::sleep_until(next_tick);
        }
    });

    // -------------------------------------------------------------------------
    // THREAD 4: 20 Hz Async Telemetry Broadcaster (Period = 50.0 ms)
    // -------------------------------------------------------------------------
    std::thread telemetry_thread([&]() {
        auto next_tick = Clock::now();
        while (keep_running.load(std::memory_order_relaxed)) {
            next_tick += 50ms;
            while (auto frame = telemetry_ring.pop_oldest()) {
                std::cout << std::fixed << std::setprecision(2)
                          << "[UDP Telemetry | Tick #" << frame->ctrl_tick << "] "
                          << "Pose=(" << frame->x_m << "m, " << frame->y_m << "m, "
                          << frame->theta_rad << "rad) | Cmd=(" << frame->cmd_v_m_s
                          << "m/s, " << frame->cmd_omega_rad_s << "rad/s) | "
                          << "Jitter=" << frame->wakeup_jitter_us << " us | "
                          << "Exec=" << frame->loop_exec_us << " us\n";
            }
            std::this_thread::sleep_until(next_tick);
        }
    });

    // -------------------------------------------------------------------------
    // THREAD 3 (Main Real-Time Loop): 100 Hz Trajectory Controller (10.0 ms)
    // -------------------------------------------------------------------------
    auto next_ctrl_tick = Clock::now();
    std::size_t wp_idx = 0;
    uint32_t deadline_misses = 0;

    for (uint32_t tick = 1; tick <= 30; ++tick) {
        next_ctrl_tick += 10000us; // Exact 100.0 Hz phase-locked schedule
        std::this_thread::sleep_until(next_ctrl_tick);

        const auto t_wake = Clock::now();
        double wakeup_jitter_us = std::chrono::duration<double, std::micro>(
            t_wake - next_ctrl_tick).count();

        // 1. Grab freshest robot pose in O(1)
        auto state_opt = state_ring.pop_latest_and_clear();
        RobotStatePacket state = state_opt.value_or(RobotStatePacket{});

        // 2. Copy shared_ptr handle (O(1), zero vector copying!)
        std::shared_ptr<const WaypointPath> path;
        {
            std::lock_guard<std::mutex> lock(path_mtx);
            path = active_path_ptr;
        }

        // 3. Pure-Pursuit / Proportional Heading Control Law
        float cmd_v = 0.0f, cmd_w = 0.0f, goal_dist = 0.0f;
        if (path && !path->world_xy_m.empty()) {
            wp_idx = std::min(wp_idx, path->world_xy_m.size() - 1);
            auto [tx, ty] = path->world_xy_m[wp_idx];
            double dx = tx - state.x_m, dy = ty - state.y_m;
            if ( std::hypot(dx, dy) < 0.25 && wp_idx + 1 < path->world_xy_m.size() ) {
                ++wp_idx;
            }
            auto [gx, gy] = path->world_xy_m.back();
            goal_dist = static_cast<float>(std::hypot(gx - state.x_m, gy - state.y_m));

            double target_heading = std::atan2(dy, dx);
            double heading_err = std::atan2(
                std::sin(target_heading - state.theta_rad),
                std::cos(target_heading - state.theta_rad));

            cmd_v = (goal_dist > 0.15f) ? 0.80f : 0.0f;
            cmd_w = static_cast<float>(2.5 * heading_err);
        }

        cmd_v_atomic.store(cmd_v, std::memory_order_relaxed);
        cmd_w_atomic.store(cmd_w, std::memory_order_relaxed);

        double exec_us = std::chrono::duration<double, std::micro>(
            Clock::now() - t_wake).count();
        if (exec_us > 10000.0) ++deadline_misses;

        // 4. Push 64-byte telemetry frame every 5th tick (20 Hz)
        if (tick % 5 == 0) {
            double t_sec = std::chrono::duration<double>(Clock::now() - t_boot).count();
            telemetry_ring.push_overwrite(TelemetryFrame{
                t_sec, wakeup_jitter_us, exec_us,
                state.x_m, state.y_m, state.theta_rad,
                cmd_v, cmd_w, goal_dist,
                tick, static_cast<uint32_t>(wp_idx), deadline_misses, 0
            });
        }
    }

    // Cleanly stop and join all worker threads before stack destruction!
    keep_running.store(false, std::memory_order_relaxed);
    odom_thread.join();
    planner_thread.join();
    telemetry_thread.join();

    return 0;
}
```

---

### Verification & Expected Telemetry Output

Compile and run the daemon:

```bash
mkdir -p build && cd build
cmake ..
cmake --build . --config Release
./robot_daemon
```

You will observe deterministic $100\text{ Hz}$ execution with sub-microsecond loop body times (`Exec=1.40 us`) and automatic RAII motor disarm on shutdown:

```text
[RAII SafetyGuard] Armed motor bus (v=0.0 m/s, w=0.0 rad/s)
[UDP Telemetry | Tick #5]  Pose=(0.30m, 0.30m, 0.00rad) | Cmd=(0.80m/s, 1.96rad/s) | Jitter=64.20 us | Exec=1.80 us
[UDP Telemetry | Tick #10] Pose=(0.34m, 0.31m, 0.10rad) | Cmd=(0.80m/s, 1.71rad/s) | Jitter=51.10 us | Exec=1.40 us
[UDP Telemetry | Tick #15] Pose=(0.38m, 0.32m, 0.18rad) | Cmd=(0.80m/s, 1.50rad/s) | Jitter=48.90 us | Exec=1.30 us
[UDP Telemetry | Tick #20] Pose=(0.41m, 0.33m, 0.26rad) | Cmd=(0.80m/s, 1.32rad/s) | Jitter=55.40 us | Exec=1.40 us
[UDP Telemetry | Tick #25] Pose=(0.45m, 0.34m, 0.32rad) | Cmd=(0.80m/s, 1.15rad/s) | Jitter=44.80 us | Exec=1.20 us
[UDP Telemetry | Tick #30] Pose=(0.49m, 0.36m, 0.38rad) | Cmd=(0.80m/s, 1.01rad/s) | Jitter=52.30 us | Exec=1.30 us
[RAII SafetyGuard] Scope exiting -> Sending 0.0 m/s DISARM frame!
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. The daemon's C-space.** In `main()`, the raw grid is $20 \times 20$ at $0.20\text{ m/cell}$ with a wall in column 10, rows 0–13, inflated for a $0.25\text{ m}$ robot. What is `rad_cells`? Which columns become blocked, and down to which row in each? How many cells are blocked in total? What is the lowest free row in column 10, and what world $y$ is the centre of that gap cell?

**Q2. `pop_latest_and_clear()` trace.** On a `RealTimeRingBuffer<int, 4>`, push `1, 2, 3, 4, 5, 6`. Then call `pop_latest_and_clear()`, `pop_oldest()`, `push_overwrite(7)`, `pop_oldest()`. Give `head_`, `tail_` and `count_` along the way, every return value, and the final `overwritten_count_`.

**Q3. Would the `static_assert`s still pass?** (a) A teammate moves `uint32_t sequence_id` to the **top** of `RobotStatePacket`, above the `double`. What is the new `sizeof`? (b) Someone appends `bool armed;` after `reserved_pad` in `TelemetryFrame`. What is the new `sizeof`?

**Q4. One controller tick by hand.** Use the Thread 3 control law. (a) The state is $(0.30, 0.30, 0.0)$, `wp_idx = 1`, `world_xy_m[1] = (0.50, 0.50)`, and the goal (last waypoint) is grid $(18, 18)$. Compute the waypoint distance, whether `wp_idx` advances, `goal_dist`, `heading_err`, `cmd_v` and `cmd_w`. Compare with the expected-output line for tick #5. (b) On an earlier tick with the same state but `wp_idx = 0` (`world_xy_m[0] = (0.30, 0.30)`, the start cell), what `cmd_w` is produced, and why?

**Q5. Thread bookkeeping for one 30-tick run.** (a) How many `TelemetryFrame`s are pushed, and can `telemetry_ring` (capacity 8) overflow if Thread 4 drains every $50\text{ ms}$? (b) About how many `RobotStatePacket`s does Thread 1 produce between two controller ticks, and how many does `pop_latest_and_clear()` discard each tick? (c) Why must the controller copy `active_path_ptr` under `path_mtx` instead of reading it without the lock?

### Coding Exercises

**E1 (Easy). Non-destructive `peek_latest()`.** Add `std::optional<T> peek_latest() const noexcept` to the project's `RealTimeRingBuffer`. It returns the newest sample without changing `head_`, `tail_` or `count_` (so Thread 4 could sample a pose without stealing it from Thread 3).
- Capacity 4, push `1..6`: `peek_latest()` → `6`. A following `pop_latest_and_clear()` still returns `6`.

**E2 (Easy–Medium). Path length helpers.** Write `double path_length_m(const WaypointPath& p)` (sum of segment lengths) and `double remaining_length_m(const WaypointPath& p, std::size_t wp_idx, double x, double y)` (distance from the robot to `world_xy_m[wp_idx]` plus the remaining segments, or $0$ if `wp_idx` is past the end).
- Path `{(0.3,0.3), (0.5,0.5), (0.7,0.5)}` → `path_length_m` = `0.4828`
- `remaining_length_m(path, 1, 0.4, 0.3)` → `0.4236`. `remaining_length_m(path, 3, 0, 0)` → `0`

**E3 (Medium). Allocation-free jitter statistics.** Thread 3 measures `wakeup_jitter_us` but only reports the latest value. Write `class JitterStats` with `record(double us)` and accessors `count()`, `mean_us()` (running mean, no stored samples), `max_us()` and `histogram()` (a `std::array<uint32_t, 5>` for buckets `[0,50)`, `[50,100)`, `[100,500)`, `[500,1000)`, `[1000,∞)` µs). No heap allocation.
- Record the six jitters from the expected output (`64.2, 51.1, 48.9, 55.4, 44.8, 52.3`) plus one GC-style spike `1250.0`: `count = 7`, `mean ≈ 223.81`, `max = 1250`, histogram `[2, 4, 0, 0, 1]`

#### Dry-Run: Answers

**Q1.** `rad_cells` $= \lceil 0.25/0.20 \rceil = \lceil 1.25 \rceil = \mathbf{2}$. A wall cell at $(r, 10)$ blocks offsets with $dr^2 + dc^2 \le 4$:

| Column | Allowed $\lvert dr \rvert$ | Blocked rows | Cells |
| :---: | :---: | :---: | :---: |
| 10 | $\le 2$ | 0–15 | 16 |
| 9, 11 | $\le 1$ ($dc^2 = 1$) | 0–14 | 15 each |
| 8, 12 | $0$ ($dc^2 = 4$) | 0–13 | 14 each |

Total $= 16 + 2(15) + 2(14) = \mathbf{74}$ cells. In column 10 the lowest free row is **16**, centred at $y = (16 + 0.5) \times 0.20 = \mathbf{3.30\text{ m}}$, so A\* must route the robot through the gap in rows 16–19. The start $(1,1)$ and goal $(18,18)$ are both free.

**Q2.** The writes go `1@0, 2@1, 3@2, 4@3`, then `5@0` and `6@1` (two overwrites). After the pushes: slots `[5, 6, 3, 4]`, `head_ = 2`, `tail_ = 2`, `count_ = 4`.

| Call | Returns | `head_` | `tail_` | `count_` |
| :--- | :---: | :---: | :---: | :---: |
| `pop_latest_and_clear()` | **6** (index $(2 + 4 - 1) \bmod 4 = 1$) | 2 | 2 | 0 |
| `pop_oldest()` | **`std::nullopt`** | 2 | 2 | 0 |
| `push_overwrite(7)` | — (written at index 2) | 3 | 2 | 1 |
| `pop_oldest()` | **7** | 3 | 3 | 0 |

`overwritten_count_` $= \mathbf{2}$. The clear step itself drops 3, 4 and 5 without counting them as overwrites.

**Q3.** (a) `sequence_id`@0–3, then 4 bytes of padding (the `double` needs 8-alignment), `timestamp_sec`@8–15, five floats @16–35. That is $36\text{ B}$, rounded up to a multiple of `alignas(32)`: **`sizeof = 64`**, so `static_assert(... == 32)` **fails**. (b) $64 + 1 = 65$, rounded up to a multiple of 64: **`sizeof = 128`**, and its assert fails too. Both are the build-time protection the milestone describes.

**Q4.** (a) $\Delta = (0.20, 0.20)$, so the distance is $0.283 \ge 0.25$ and **`wp_idx` stays at 1**. Goal centre $= (18.5 \times 0.2,\ 18.5 \times 0.2) = (3.70, 3.70)$, so `goal_dist` $= \sqrt{2} \times 3.40 \approx \mathbf{4.81\text{ m}} > 0.15$ and **`cmd_v = 0.80`**. `heading_err` $= \operatorname{atan2}(0.2, 0.2) - 0 = \mathbf{0.785\text{ rad}}$, so **`cmd_w`** $= 2.5 \times 0.785 \approx \mathbf{1.96\text{ rad/s}}$. This matches tick #5's `Cmd=(0.80m/s, 1.96rad/s)`.

(b) `dx = dy = 0`, so the hypot test passes and `wp_idx` becomes 1. **But** `dx` and `dy` were already computed for waypoint 0, and `atan2(0, 0) = 0`, so `heading_err = 0` and **`cmd_w = 0`** on that tick. The new target only takes effect on the next tick. It is harmless here, but recomputing `dx, dy` after advancing `wp_idx` would remove the one-tick lag.

**Q5.** (a) Ticks 5, 10, …, 30 give **6 frames**. Thread 4 drains roughly one frame per $50\text{ ms}$ window, far below the 8-slot capacity, so **no overflow** in normal operation. (b) $10\text{ ms} / 2.5\text{ ms} = $ about **4** packets per control tick. `pop_latest_and_clear()` returns the newest and **discards about 3**. (c) A `std::shared_ptr` is two words (object pointer plus control block), and copying it while Thread 2 assigns a new one is a data race. A torn read could pair the old pointer with the new reference count, which is undefined behaviour. The lock is held only for an $O(1)$ handle copy. (C++20's `std::atomic<std::shared_ptr<T>>` is the lock-free alternative.)

**E1. Reference solution** (add inside `RealTimeRingBuffer`)

```cpp
    // Returns the freshest sample WITHOUT consuming anything: O(1), no allocation.
    std::optional<T> peek_latest() const noexcept {
        std::lock_guard<std::mutex> lock(mtx_);       // mtx_ is already `mutable`
        if (count_ == 0) return std::nullopt;
        return buffer_[(head_ + Capacity - 1) % Capacity];
    }

// Usage:
//   RealTimeRingBuffer<int, 4> rb;
//   for (int v = 1; v <= 6; ++v) rb.push_overwrite(v);
//   *rb.peek_latest()          -> 6   (count_ still 4)
//   *rb.pop_latest_and_clear() -> 6
```

It uses the same index arithmetic as `pop_latest_and_clear()` but leaves `tail_` and `count_` alone. It is `const` because it only reads, which is why `mtx_` must be `mutable`.

**E2. Reference solution**

```cpp
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <utility>
#include <vector>

struct WaypointPath {
    uint64_t plan_sequence_id{0};
    std::vector<std::pair<double, double>> world_xy_m;
};

double path_length_m(const WaypointPath& p) {
    double total = 0.0;
    for (std::size_t i = 1; i < p.world_xy_m.size(); ++i) {
        const auto& a = p.world_xy_m[i - 1];
        const auto& b = p.world_xy_m[i];
        total += std::hypot(b.first - a.first, b.second - a.second);
    }
    return total;
}

double remaining_length_m(const WaypointPath& p, std::size_t wp_idx, double x, double y) {
    if (wp_idx >= p.world_xy_m.size()) return 0.0;
    const auto& target = p.world_xy_m[wp_idx];
    double total = std::hypot(target.first - x, target.second - y);   // robot -> active waypoint
    for (std::size_t i = wp_idx + 1; i < p.world_xy_m.size(); ++i) {  // then along the path
        const auto& a = p.world_xy_m[i - 1];
        const auto& b = p.world_xy_m[i];
        total += std::hypot(b.first - a.first, b.second - a.second);
    }
    return total;
}

int main() {
    WaypointPath path{1, {{0.3, 0.3}, {0.5, 0.5}, {0.7, 0.5}}};
    std::cout << path_length_m(path) << "\n";                  // 0.482843
    std::cout << remaining_length_m(path, 1, 0.4, 0.3) << "\n"; // 0.423607
    std::cout << remaining_length_m(path, 3, 0.0, 0.0) << "\n"; // 0
}
```

$0.2\sqrt{2} + 0.2 = 0.4828$. From $(0.4, 0.3)$: $\sqrt{0.1^2 + 0.2^2} + 0.2 = 0.2236 + 0.2 = 0.4236$. Both are $O(n)$ and read-only, so they are safe to call on a `shared_ptr<const WaypointPath>` from the controller.

**E3. Reference solution**

```cpp
#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

class JitterStats {
public:
    void record(double jitter_us) noexcept {
        ++count_;
        mean_us_ += (jitter_us - mean_us_) / static_cast<double>(count_);  // running mean
        max_us_ = std::max(max_us_, jitter_us);
        ++histogram_[bucket(jitter_us)];
    }
    std::uint32_t count() const noexcept { return count_; }
    double mean_us() const noexcept { return mean_us_; }
    double max_us() const noexcept { return max_us_; }
    const std::array<std::uint32_t, 5>& histogram() const noexcept { return histogram_; }

private:
    static std::size_t bucket(double us) noexcept {
        if (us < 50.0) return 0;
        if (us < 100.0) return 1;
        if (us < 500.0) return 2;
        if (us < 1000.0) return 3;
        return 4;
    }
    std::uint32_t count_{0};
    double mean_us_{0.0};
    double max_us_{0.0};
    std::array<std::uint32_t, 5> histogram_{};
};

int main() {
    JitterStats stats;
    for (double j : {64.2, 51.1, 48.9, 55.4, 44.8, 52.3, 1250.0}) stats.record(j);
    std::cout << stats.count() << " " << stats.mean_us() << " " << stats.max_us() << " |";
    for (auto h : stats.histogram()) std::cout << " " << h;
    std::cout << "\n";   // 7 223.814 1250 | 2 4 0 0 1
}
```

`record` is $O(1)$ with fixed storage, so it is safe inside the $100\text{ Hz}$ loop. The incremental mean avoids storing samples, and its sum stays well-conditioned. Note how one $1.25\text{ ms}$ spike pulls the mean from about $52.8$ to $223.8\ \mu\text{s}$. That is why real-time systems report **max** and a histogram, not just the average.

---

## Interactive Visualization & shadcn/ui Specification

### Component Name: `AutonomousRobotDaemonMissionControl`

Build a full-featured **Real-Time Robotics Mission Control Dashboard** using **React, Tailwind CSS, Framer Motion, and `shadcn/ui`** that simulates and visualizes all four threads of the C++ Autonomous Robot Daemon simultaneously.

#### 1. Layout & `shadcn/ui` Primitives
- **Outer Container**: `<Card className="w-full max-w-6xl mx-auto border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">`
- **Top Status Header**:
  - Live `<Badge>` indicators for each thread:
    - `<Badge variant="secondary">Thread 1: IMU/Odom (400 Hz)</Badge>`
    - `<Badge variant="secondary">Thread 2: C-Space A* (20 Hz)</Badge>`
    - `<Badge variant="default">Thread 3: RT Control (100.0 Hz | 0 Misses)</Badge>`
    - `<Badge variant="outline">Thread 4: UDP Telemetry (Port 9870)</Badge>`
  - `<Button variant="destructive">` `"Trigger E-Stop (Test RAII ~ScopedSafetyDisarmGuard)"`.

#### 2. Split-Screen Mission Control View
- **Left Panel (Interactive 2D Warehouse Map, C-Space & Robot Trajectory)**:
  - Interactive $20 \times 20$ Occupancy Grid canvas where the user can click to place dynamic obstacles while the robot is driving!
  - Shows raw obstacle cells (`100`), translucent amber $\mathcal{C}$-Space inflation rings (controlled by a `<Slider>` for `Robot Radius R_robot`), the green $A^*$ waypoint path updated at $20\text{ Hz}$ via `std::shared_ptr<const WaypointPath>`, and the animated circular robot chassis tracking the path via Pure-Pursuit at $100\text{ Hz}$.
- **Right Panel (Multi-Thread Ring Buffer & Jitter Telemetry Inspector)**:
  - `<Tabs defaultValue="threads">` switching between:
    1. **`threads` (Live Ring Buffer & Shared Pointer Inspector)**: Shows the 16-slot `state_ring` circular dial filling at $400\text{ Hz}$ and draining at $100\text{ Hz}$ via `pop_latest_and_clear()`, plus the atomic `use_count` of `active_path_ptr`.
    2. **`jitter` (100 Hz Control Loop Jitter & Execution Profiler)**: Live streaming strip chart of `wakeup_jitter_us` and `loop_exec_us` with a `<Table>` of 64-byte `TelemetryFrame` fields and a `<Switch>` to inject simulated mutex contention (holding the lock during `std::cout`) so learners can watch the $100\text{ Hz}$ control loop spike and miss deadlines!
