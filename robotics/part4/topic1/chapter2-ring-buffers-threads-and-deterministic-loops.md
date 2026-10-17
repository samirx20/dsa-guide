# Part 4, Topic 1: Real-Time C++ Systems for Robotics
## Chapter 2: High-Frequency Ring Buffers, Multithreading & Jitter-Free Control Loops

---

### Prerequisites & Learning Objectives

Before starting this chapter, you should be comfortable with:
- Stack vs. heap memory allocation and why dynamic heap allocation (`new`/`malloc`) causes non-deterministic latency spikes (Part 4, Topic 1, Chapter 1).
- RAII destructors (`~ClassName()`) that automatically clean up resources when exiting a scope `{ ... }`.

By the end of this chapter, you will be able to:
1. Explain why a real robot splits its software across **multiple concurrent threads running at different frequencies** ($400\text{ Hz}$ IMU, $100\text{ Hz}$ PID motor control, $20\text{ Hz}$ LiDAR path planning, and async network telemetry).
2. Build a fixed-capacity, zero-heap-allocation **Ring Buffer (Circular Queue)** using `std::array<T, Capacity>` and modulo wrap-around arithmetic `next = (i + 1) % Capacity`.
3. Explain why robotics sensor buffers use **Overwrite-Oldest (`push_overwrite`)** semantics instead of blocking or dropping new sensor readings.
4. Synchronize producer and consumer threads safely using **`std::mutex`** with RAII **`std::lock_guard`**, and understand how **`std::atomic`** enables lock-free Single-Producer Single-Consumer (SPSC) queues.
5. Eliminate cumulative control-loop clock drift by replacing `std::this_thread::sleep_for(dt)` with **`std::this_thread::sleep_until(next_tick)`** anchored to **`std::chrono::steady_clock`**.

---

### 1. Why Robots Need Multithreading & Fixed-Size Ring Buffers (From Zero)

Imagine you are programming a four-wheeled autonomous delivery robot. Your robot has four jobs to do at the same time:
1. **Read the IMU (Gyroscope + Accelerometer)** at **$400\text{ Hz}$** ($2.5\text{ ms}$ per sample) to track angular velocity and orientation.
2. **Run the Wheel Motor PID / State-Space Controller** at **$100\text{ Hz}$** ($10.0\text{ ms}$ per tick) to keep the robot on its trajectory.
3. **Run the $A^*$ / LiDAR Obstacle Planner** at **$10\text{ Hz}$** ($100.0\text{ ms}$ per scan) to plan around pedestrians.
4. **Send JSON / UDP Telemetry** over Wi-Fi to a human operator's laptop whenever the network socket is ready.

What happens if you put all four of these jobs into a single `while (true)` loop on a single thread?

```
SINGLE-THREADED DISASTER:
+-------+-------+-----------------------------------------------+-------------+
| IMU   | PID   | LiDAR A* Path Planner (Takes 65 ms!)          | Wi-Fi Stall |
| 0.1ms | 0.4ms | (Motor controller & IMU are COMPLETELY FROZEN!)| (40 ms!)   |
+-------+-------+-----------------------------------------------+-------------+
0 ms            0.5 ms                                          65.5 ms       105.5 ms
```

While the $A^*$ path planner is spending $65\text{ ms}$ searching a grid map, or while the Wi-Fi socket stalls for $40\text{ ms}$ waiting for a router acknowledgment, **your $100\text{ Hz}$ motor controller and $400\text{ Hz}$ IMU miss $10$ to $40$ consecutive deadlines!** The robot drives blind and uncontrolled for over a tenth of a second!

#### The Multi-Rate Threaded Architecture

To prevent slow tasks from starving fast tasks, robotics software isolates each rate-domain into its own **Thread**, connected by bounded, pre-allocated **Ring Buffers**:

```
================================================================================
   MULTI-RATE ROBOTICS THREAD ARCHITECTURE WITH BOUNDED RING BUFFERS
================================================================================

  [Thread 1: IMU Driver (400 Hz / 2.5 ms)]
       |
       | Pushes ImuSample every 2.5 ms (Zero Heap Allocation)
       v
  +---------------------------------------------------+
  | Fixed-Capacity RingBuffer<ImuSample, 16> (Stack)  |  <-- Overwrites oldest
  +---------------------------------------------------+      if full; never blocks!
       |
       | Pops latest IMU samples every 10.0 ms
       v
  [Thread 2: Real-Time Motor Control Loop (100 Hz / 10.0 ms)]
       ^                                         |
       | Reads latest target velocity            | Pushes TelemetryPacket
       |                                         v
  [Thread 3: LiDAR Planner (10 Hz)]     [Thread 4: Async UDP Telemetry (20 Hz)]
================================================================================
```

#### Why `std::vector` and `std::queue` Fail in Real-Time Queues

When Thread 1 ($400\text{ Hz}$ IMU producer) streams data to Thread 2 ($100\text{ Hz}$ controller consumer), we need a **First-In, First-Out (FIFO)** queue. Why not use `std::vector` or `std::queue` from the C++ Standard Library?

1. **Why `std::vector::erase(vec.begin())` is too slow ($O(N)$):**
   - If you push new items to the back of a `std::vector` and pop the oldest item from the front (`vec.erase(vec.begin())`), the CPU must **shift every single remaining element in memory one slot to the left**!
2. **Why `std::queue<T>` (backed by `std::deque<T>`) is non-deterministic:**
   - Standard `std::queue` allocates and frees heap chunks dynamically as items are pushed and popped. Calling heap `new`/`delete` at $400\text{ Hz}$ violates the Golden Rule of Real-Time C++ from Chapter 1!

---

### 2. The Ring Buffer (Circular Queue): $O(1)$ Push & Pop on Fixed Memory

How can we push to the back and pop from the front in **$O(1)$ constant time** using a fixed-size, compile-time `std::array<T, Capacity>` without ever shifting elements or touching the heap?

The answer is the **Ring Buffer** (also called a **Circular Buffer**).

Instead of shifting elements in memory when we remove the front item, we keep the array stationary and move two integer indices:
- **`head_` (Write Index)**: The slot where the **next incoming element** will be written.
- **`tail_` (Read Index)**: The slot where the **oldest element** is waiting to be read.
- **`count_`**: How many valid elements are currently stored in the buffer ($0 \le \text{count\_} \le N$).

When `head_` or `tail_` reaches the end of the array (index $N - 1$), advancing it by $1$ wraps cleanly back around to index $0$ using **modulo arithmetic**:

$$\text{head}_{\text{next}} = (\text{head} + 1) \bmod N$$

$$\text{tail}_{\text{next}} = (\text{tail} + 1) \bmod N$$

> [!TIP]
> **Power-of-Two Bitwise Optimization:**
> If you choose a buffer capacity $N$ that is a power of two (e.g., $N = 8, 16, 64, 256, 1024$), the C++ compiler automatically replaces integer division `% N` with a single-cycle bitwise AND instruction:
> $$(\text{index} + 1) \bmod 2^k \equiv (\text{index} + 1) \ \& \ (N - 1)$$

#### Overwrite-Oldest (`push_overwrite`) Semantics for Sensor Streams

What should happen if the $400\text{ Hz}$ IMU thread produces 5 samples while the consumer thread was temporarily busy, and our 4-slot Ring Buffer is already **full** ($\text{count\_} = N$)?

In general-purpose software (like a bank transaction queue), a full queue either **blocks the producer** (freezing the IMU thread!) or **drops the newest item**. 

In real-time robotics, **both of those choices are wrong!**
- Your PID controller wants the **freshest possible state of the physical world right now**, not stale IMU readings from $50\text{ ms}$ ago!
- Therefore, robotics sensor ring buffers use **Overwrite-Oldest (`push_overwrite`)** semantics:
  - When $\text{count\_} == N$ (the buffer is full), `head_` and `tail_` point to the exact same slot (the oldest unread sample).
  - We write the **newest sample** directly at `buffer_[head_]`, advance `head_ = (head_ + 1) % N`, **AND advance `tail_ = (tail_ + 1) % N`**, keeping `count_ = N`!
  - Result: The buffer always holds the **$N$ most recent sensor measurements**, never blocks the producer, and never allocates memory!

```
================================================================================
   RING BUFFER WRAP-AROUND & OVERWRITE-OLDEST (Capacity N = 4)
================================================================================

  1. Initial Empty State (head=0, tail=0, count=0):
     Index:   [  0  ]   [  1  ]   [  2  ]   [  3  ]
              [  .  ]   [  .  ]   [  .  ]   [  .  ]
               ^H,T

  2. After pushing A, B, C, D -> Buffer is FULL (head=0, tail=0, count=4):
     Index:   [  0  ]   [  1  ]   [  2  ]   [  3  ]
              [  A  ]   [  B  ]   [  C  ]   [  D  ]
               ^H,T     (A is oldest at tail=0; D is newest at index 3)

  3. Push E when FULL -> Overwrites oldest 'A' at slot 0!
     Both head AND tail advance to (0 + 1) % 4 = 1, count stays 4!
     Index:   [  0  ]   [  1  ]   [  2  ]   [  3  ]
              [  E  ]   [  B  ]   [  C  ]   [  D  ]
                         ^H,T     (Now B is oldest at tail=1; E is newest!)

  4. Pop oldest -> Reads 'B' from tail=1, advances tail to (1 + 1) % 4 = 2:
     Index:   [  0  ]   [  1  ]   [  2  ]   [  3  ]
              [  E  ]   [ (B) ]   [  C  ]   [  D  ]   (count = 3: C, D, E)
                         ^H        ^T
================================================================================
```

#### Dry-Run Trace Table: Ring Buffer Operations ($N = 4$)

Let's trace every variable step-by-step on a Ring Buffer of capacity $N = 4$:

| Step | Operation | Slot `[0]` | Slot `[1]` | Slot `[2]` | Slot `[3]` | `head_` | `tail_` | `count_` | Oldest $\rightarrow$ Newest Logical Order |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | Init | `—` | `—` | `—` | `—` | `0` | `0` | `0` | `[]` (Empty) |
| **1** | `push(10)` | **`10`** | `—` | `—` | `—` | `1` | `0` | `1` | `[10]` |
| **2** | `push(20)` | `10` | **`20`** | `—` | `—` | `2` | `0` | `2` | `[10, 20]` |
| **3** | `push(30)` | `10` | `20` | **`30`** | `—` | `3` | `0` | `3` | `[10, 20, 30]` |
| **4** | `push(40)` | `10` | `20` | `30` | **`40`** | `0` (wrapped!) | `0` | `4` (Full) | `[10, 20, 30, 40]` |
| **5** | `push(50)` *(Overwrite!)* | **`50`** | `20` | `30` | `40` | `1` | **`1`** | `4` (Full) | `[20, 30, 40, 50]` (`10` overwritten) |
| **6** | `pop()` $\rightarrow$ returns `20` | `50` | *(20)* | `30` | `40` | `1` | **`2`** | `3` | `[30, 40, 50]` |
| **7** | `pop()` $\rightarrow$ returns `30` | `50` | *(20)* | *(30)* | `40` | `1` | **`3`** | `2` | `[40, 50]` |

---

### 3. Thread Synchronization: Data Races, `std::mutex`, `std::lock_guard`, and `std::atomic`

What happens if Thread 1 (the $400\text{ Hz}$ IMU thread) calls `push_overwrite()` at the **exact same nanosecond** that Thread 2 (the $100\text{ Hz}$ PID thread) calls `pop()` on the same Ring Buffer?

Without synchronization, you get a **Data Race (Undefined Behavior)**:
- Thread 1 reads `count_ = 3` into CPU Core 0's register and prepares to compute `count_ + 1 = 4`.
- Simultaneously, Thread 2 reads `count_ = 3` into CPU Core 1's register and computes `count_ - 1 = 2`.
- Both cores write their results back to RAM: `count_` becomes corrupted, or Thread 2 reads a half-written `ImuSample` where `accel_x` is from tick $k$ and `gyro_z` is from tick $k-1$ (a **Torn Read**)!

#### Solution 1: `std::mutex` + RAII `std::lock_guard`

A **Mutex (Mutual Exclusion Lock)** ensures that only **one thread at a time** can execute a critical section of code.
- Just like raw `new`/`delete`, we **never** call `mtx_.lock()` and `mtx_.unlock()` manually!
- Instead, we wrap the mutex in an RAII **`std::lock_guard<std::mutex> lock(mtx_);`**:
  - Its constructor locks `mtx_`.
  - Its destructor automatically unlocks `mtx_` at the closing brace `}`!
- Because a Ring Buffer `push_overwrite()` or `pop()` only copies a tiny struct into a pre-allocated `std::array` and increments two integers, the critical section takes **less than $30\text{ nanoseconds}$**—so lock contention is virtually zero!

#### Solution 2: Lock-Free `std::atomic` for SPSC (Single-Producer, Single-Consumer)

What if you have **strictly one producer thread** and **strictly one consumer thread** (an **SPSC Queue**), and your hard real-time thread cannot risk even a $1\text{ }\mu\text{s}$ mutex wait?

In an SPSC ring buffer:
- **Only the Producer** ever modifies `head_`.
- **Only the Consumer** ever modifies `tail_`.
- By making `head_` and `tail_` **`std::atomic<std::size_t>`** with acquire/release memory ordering (`std::memory_order_release` when publishing a new index, `std::memory_order_acquire` when reading the other thread's index), the two threads can stream data at millions of messages per second **without any mutex lock at all!**

---

### 4. Eliminating Control-Loop Drift: `sleep_for` vs. `sleep_until`

Now let's look at how Thread 2 (our $100\text{ Hz}$ PID control loop) keeps time.

Every $100\text{ Hz}$ tick needs to run once every $T_s = 10.0\text{ ms} = 10,000\text{ }\mu\text{s}$. A beginner almost always writes this loop:

```cpp
// BAD: Cumulative Drift Loop!
while (running) {
    read_sensors_and_compute_pid(); // Suppose this takes 1.2 ms (1200 us)
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
}
```

**Why is `sleep_for(10ms)` broken?**
Because `read_sensors_and_compute_pid()` does not take $0.0\text{ ms}$! Suppose your code takes $t_{\text{exec}} = 1.2\text{ ms}$ to run, and the OS scheduler takes $t_{\text{sched}} = 0.1\text{ ms}$ to wake your thread up. Then your actual loop period is:

$$\Delta t_{\text{actual}} = t_{\text{exec}} + T_{\text{sleep}} + t_{\text{sched}} = 1.2\text{ ms} + 10.0\text{ ms} + 0.1\text{ ms} = 11.3\text{ ms} \quad (88.5\text{ Hz instead of } 100.0\text{ Hz!})$$

After just $100$ ticks ($1\text{ second}$), your control loop is already **$130\text{ ms}$ late**, and the time error grows to infinity:

$$t_k^{\text{sleep\_for}} = t_0 + k \cdot T_s + \sum_{i=1}^{k} \left(t_{\text{exec}, i} + t_{\text{sched}, i}\right) \longrightarrow \text{Unbounded Cumulative Drift!}$$

#### The Fix: Phase-Locked `sleep_until(next_tick)` with `steady_clock`

Instead of sleeping for a fixed *duration* after our work finishes, we compute the **exact absolute wall-clock timestamp** when the next tick *should* happen:

$$\text{next\_tick}_{k} = t_0 + k \cdot T_s$$

And then we call **`std::this_thread::sleep_until(next_tick)`**!
- If tick $k$ takes $1.2\text{ ms}$ of computation, `sleep_until(next_tick)` automatically sleeps for only the remaining $10.0 - 1.2 = 8.8\text{ ms}$!
- Even if the OS wakes tick $k$ up $0.1\text{ ms}$ late (at $10.1\text{ ms}$), we increment `next_tick += 10ms` (so tick $k+1$ targets $20.0\text{ ms}$, **not** $20.1\text{ ms}$!). The error **never accumulates**!

```
================================================================================
   1. DRIFTING LOOP: std::this_thread::sleep_for(10ms)
================================================================================
  Target 100Hz: |         |         |         |         |
                0ms      10ms      20ms      30ms      40ms
  Actual Ticks: [Work]----Sleep 10ms---->[Work]----Sleep 10ms---->[Work]
                0ms  1.3ms              11.3ms 12.7ms            22.7ms
                                         (+1.3ms late!)           (+2.7ms late!)

================================================================================
   2. PHASE-LOCKED LOOP: std::this_thread::sleep_until(next_tick)
================================================================================
  Target 100Hz: |         |         |         |         |
                0ms      10ms      20ms      30ms      40ms
  Actual Ticks: [Work]-8.7ms->[Work]--8.5ms->[Work]-8.8ms->[Work]
                0ms  1.3ms   10.0ms 11.5ms  20.0ms 21.2ms 30.0ms
                             (Exact!)       (Exact!)      (Exact!)
================================================================================
```

> [!CAUTION]
> **Never Use `std::chrono::system_clock` for Control Loops!**
> `std::chrono::system_clock` is the "wall-clock time of day" (e.g., `14:32:05 UTC`). When your robot connects to Wi-Fi, the Linux NTP daemon (`chronyd` / `systemd-timesyncd`) can suddenly jump `system_clock` backward or forward by $500\text{ ms}$ to sync with an internet time server! If `system_clock` jumps backward by $500\text{ ms}$, `sleep_until()` will freeze your robot's motor loop for half a second!
> **Always use `std::chrono::steady_clock`**, which is a strictly monotonic hardware timer (backed by `CLOCK_MONOTONIC` on Linux) that can **never jump backward or be adjusted by NTP**.

---

### 5. Complete Runnable C++ Implementation: Thread-Safe Ring Buffer & 100 Hz Loop

Let's combine everything from Chapters 1 and 2 into a complete, zero-heap-allocation C++ program featuring:
1. A cache-aligned `ImuSample` struct (`alignas(32)`).
2. A thread-safe, fixed-capacity `RingBuffer<T, Capacity>` with `push_overwrite()` and `pop_latest()`.
3. A $400\text{ Hz}$ IMU producer thread and a phase-locked $100\text{ Hz}$ PID consumer thread using `std::chrono::steady_clock` and `sleep_until`.

```cpp
#include <iostream>
#include <array>
#include <mutex>
#include <atomic>
#include <thread>
#include <chrono>
#include <optional>
#include <cstdint>

// 1. Cache-aligned 32-byte telemetry struct (2 per 64-byte cache line)
struct alignas(32) ImuSample {
    double timestamp_sec{0.0}; // 8B
    double gyro_z_rad_s{0.0};  // 8B
    float accel_x_m_s2{0.0f};  // 4B
    float accel_y_m_s2{0.0f};  // 4B
    uint32_t sequence_id{0};   // 4B
    uint32_t reserved{0};      // 4B -> Total = 32 bytes
};

// 2. Fixed-capacity, Zero-Heap-Allocation Thread-Safe Ring Buffer
template <typename T, std::size_t Capacity>
class RealTimeRingBuffer {
    static_assert(Capacity > 0, "RingBuffer Capacity must be > 0");

public:
    // Producer calls this: O(1), never blocks on full buffer, overwrites oldest!
    void push_overwrite(const T& item) noexcept {
        std::lock_guard<std::mutex> lock(mtx_); // RAII lock (auto-unlocks at `}`)
        buffer_[head_] = item;
        head_ = (head_ + 1) % Capacity;

        if (count_ == Capacity) {
            // Buffer was already full! Advance tail_ so it still points to oldest
            tail_ = (tail_ + 1) % Capacity;
            ++overwritten_count_;
        } else {
            ++count_;
        }
    }

    // Consumer calls this to pop the single oldest unread sample: O(1)
    std::optional<T> pop_oldest() noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        if (count_ == 0) {
            return std::nullopt;
        }
        T item = buffer_[tail_];
        tail_ = (tail_ + 1) % Capacity;
        --count_;
        return item;
    }

    std::size_t size() const noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        return count_;
    }

    std::size_t overwritten_count() const noexcept {
        std::lock_guard<std::mutex> lock(mtx_);
        return overwritten_count_;
    }

private:
    mutable std::mutex mtx_;
    std::array<T, Capacity> buffer_{}; // Contiguous pre-allocated memory!
    std::size_t head_{0};              // Next write index
    std::size_t tail_{0};              // Oldest unread index
    std::size_t count_{0};             // Number of active items
    std::size_t overwritten_count_{0}; // Diagnostic counter
};

int main() {
    using Clock = std::chrono::steady_clock;
    using namespace std::chrono_literals;

    RealTimeRingBuffer<ImuSample, 8> imu_queue;
    std::atomic<bool> keep_running{true};
    const auto t_start = Clock::now();

    // Thread 1: High-rate 400 Hz IMU Producer (Period = 2.5 ms = 2500 us)
    std::thread imu_thread([&]() {
        auto next_imu_tick = Clock::now();
        uint32_t seq = 1;

        while (keep_running.load(std::memory_order_relaxed)) {
            next_imu_tick += 2500us; // Exact 400.0 Hz target timestamp

            double t_sec = std::chrono::duration<double>(Clock::now() - t_start).count();
            imu_queue.push_overwrite(ImuSample{t_sec, 0.15, 0.02f, -0.01f, seq++, 0});

            std::this_thread::sleep_until(next_imu_tick);
        }
    });

    // Thread 2: Phase-Locked 100 Hz PID Controller (Period = 10.0 ms = 10000 us)
    auto next_ctrl_tick = Clock::now();
    for (int ctrl_tick = 1; ctrl_tick <= 5; ++ctrl_tick) {
        next_ctrl_tick += 10000us; // Exact 100.0 Hz phase-locked deadline
        std::this_thread::sleep_until(next_ctrl_tick);

        // Drain all IMU samples accumulated during this 10 ms control window
        int drained = 0;
        ImuSample latest{};
        while (auto sample = imu_queue.pop_oldest()) {
            latest = *sample;
            ++drained;
        }

        double wake_ms = std::chrono::duration<double, std::milli>(Clock::now() - t_start).count();
        std::cout << "[100Hz Ctrl Tick #" << ctrl_tick << " @ " << wake_ms << " ms] "
                  << "Drained " << drained << " IMU samples | Latest seq=#"
                  << latest.sequence_id << " (Overwritten=" << imu_queue.overwritten_count() << ")\n";
    }

    keep_running.store(false, std::memory_order_relaxed);
    imu_thread.join(); // Wait cleanly for producer thread to exit before destroying stack
    return 0;
}
```

#### What's happening:

```cpp
        if (count_ == Capacity) {
            tail_ = (tail_ + 1) % Capacity;
            ++overwritten_count_;
        }
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//      When `count_ == Capacity`, the buffer is already full, which means
//      `head_ == tail_`. We just overwrote the oldest element at `buffer_[head_]`
//      and moved `head_` forward by 1. Therefore, we MUST also advance `tail_`
//      forward by 1 so `tail_` points to the NEW oldest element!
```

```cpp
        next_ctrl_tick += 10000us; // Exact 100.0 Hz phase-locked deadline
        std::this_thread::sleep_until(next_ctrl_tick);
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//      By adding 10000us (10 ms) to `next_ctrl_tick` on every iteration,
//      our wake targets are locked to t0 + 10ms, t0 + 20ms, t0 + 30ms, etc.,
//      completely immune to how long the loop body took on the previous tick!
```

---

### 6. Common Mistakes & How to Fix Them

1. **Mistake: Holding a `std::mutex` Lock Across `std::cout`, Disk I/O, or Network Calls**
   - *Symptom:* The $400\text{ Hz}$ IMU thread randomly stalls for $5\text{ ms}$, causing dropped hardware packets.
   - *Why it happens:* If the consumer thread locks `mtx_` and then prints to `std::cout` or writes to a log file *while still holding the lock*, the high-priority IMU thread is blocked waiting for slow terminal/disk I/O!
   - *Fix:* Keep critical sections microscopic! Copy the `ImuSample` struct out of the ring buffer inside the lock, let `std::lock_guard` unlock the mutex, and do all math/logging **outside** the lock.

2. **Mistake: Catching Up with a Runaway Burst if a Thread Was Paused**
   - *Symptom:* If a laptop lid closes or a debugger pauses the process for $2\text{ seconds}$, upon resume the `sleep_until(next_tick)` loop executes $200$ iterations back-to-back at $100\%$ CPU with zero sleep until `next_tick` catches up to `Clock::now()`.
   - *Fix:* Add a safety guard: if `Clock::now() > next_tick + Period`, reset `next_tick = Clock::now()` and increment a `missed_deadline_count` diagnostic counter.

3. **Mistake: Forgetting to `.join()` a `std::thread` Before Exiting Scope**
   - *Symptom:* Program crashes on shutdown with `terminate called without an active exception` (`SIGABRT`).
   - *Why it happens:* If a `std::thread` object's destructor runs while the OS thread is still `joinable()`, C++ immediately calls `std::terminate()` because the background thread might still be referencing stack variables (like `imu_queue`) that are about to be destroyed!
   - *Fix:* Always signal `keep_running = false` and call `thread.join()` before exiting `main()`, or use C++20 `std::jthread` which automatically requests stop and joins in its RAII destructor!

---

### 7. Quick Reference Summary

| Mechanism | Bad / Non-Real-Time Pattern | Real-Time Robotics C++ Pattern | Why It Matters |
| :--- | :--- | :--- | :--- |
| **Inter-Thread Queue** | `std::vector::erase(begin())` or `std::queue` | `std::array<T, N>` Ring Buffer (`(i + 1) % N`) | $O(1)$ push/pop with zero heap allocations and full L1 cache locality. |
| **Full Buffer Policy** | Block producer or drop newest sample | **Overwrite-Oldest (`push_overwrite`)** | Controller always acts on the freshest physical sensor state. |
| **Mutex Locking** | Manual `mtx.lock()` / `mtx.unlock()` | RAII `std::lock_guard<std::mutex> lock(mtx)` | Impossible to forget unlocking on early return or exception. |
| **Clock Source** | `std::chrono::system_clock` | **`std::chrono::steady_clock`** | Monotonic hardware clock; immune to NTP time jumps. |
| **Loop Timing** | `sleep_for(10ms)` | **`next_tick += 10ms; sleep_until(next_tick)`** | Eliminates cumulative execution-time and scheduler drift. |

---

## Interactive Visualization & shadcn/ui Specification

### Component Name: `RingBufferAndLoopCadenceStudio`

Build an interactive dual-module visualization using **React, Tailwind CSS, Framer Motion, and `shadcn/ui`** that lets learners visually step through modulo wrap-around and overwrite-oldest logic in a circular array, and compare `sleep_for` cumulative drift against `sleep_until` phase-locked cadence.

#### 1. Layout & `shadcn/ui` Primitives
- **Outer Container**: `<Card className="w-full max-w-6xl mx-auto border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">`
- **Mode Switcher**: `<Tabs defaultValue="ringbuffer">` with two `<TabsTrigger>` tabs:
  1. `ringbuffer` — **"1. Circular Ring Buffer & Overwrite-Oldest Visualizer"**
  2. `cadence` — **"2. Control Loop Drift: sleep_for() vs. sleep_until()"**

#### 2. Tab 1: Circular Ring Buffer Visualizer (`ringbuffer`)
- **Control Panel**:
  - `<Button variant="default">` `"Push IMU Sample (Producer)"` (auto-increments sequence `#101, #102, ...`).
  - `<Button variant="secondary">` `"Pop Oldest (Consumer)"` and `<Button variant="outline">` `"Drain All (100Hz Tick)"`.
  - `<Switch>` for `"Auto-Stream: 400Hz Producer vs 100Hz Consumer"`.
  - `<Select>` for Capacity $N \in \{4, 8, 16\}$.
- **Dual Ring + Linear Array View**:
  - **Left SVG Circular Dial**: Renders the $N$ slots arranged in a circle like a clock face, with animated orbiting badges for **`HEAD (Write)`** (emerald green) and **`TAIL (Read)`** (sky blue). When `count == N` and another item is pushed, the overwritten slot flashes amber with a `<Badge variant="warning">OVERWROTE OLDEST!</Badge>` toast and both `HEAD` and `TAIL` advance together clockwise.
  - **Right Linear Memory View (`std::array<ImuSample, N>`)**: Shows the actual contiguous linear indices `0 .. N-1` in RAM alongside live formulas: `next_head = (head + 1) % N` and `<Table>` state counters (`head_`, `tail_`, `count_`, `overwritten_count_`).

#### 3. Tab 2: `sleep_for` vs. `sleep_until` Cadence Comparator (`cadence`)
- **Interactive Sliders**:
  - `<Slider>` for **Nominal Period $T_s$** ($5\text{ ms}$ to $20\text{ ms}$, default $10.0\text{ ms}$).
  - `<Slider>` for **PID Computation Time $t_{\text{exec}}$** ($0.5\text{ ms}$ to $4.5\text{ ms}$, default $1.5\text{ ms}$).
  - `<Slider>` for **OS Wakeup Jitter $t_{\text{sched}}$** ($0.0\text{ ms}$ to $0.8\text{ ms}$, default $0.2\text{ ms}$).
  - `<Button variant="destructive">` `"Simulate NTP System Clock Jump (-500ms)"` paired with a `<Switch>` toggling `system_clock` vs `steady_clock`.
- **Synchronized Dual Timeline Strip Chart**:
  - **Top Track (`sleep_for(10ms)`)**: Shows amber execution blocks followed by fixed $10\text{ ms}$ sleep bars, visibly drifting further and further right past the vertical dashed $10\text{ ms}, 20\text{ ms}, 30\text{ ms}$ grid lines. Displays a live `<Badge variant="destructive">` showing **Cumulative Drift after $10\text{ s}$** (e.g., `+1,700 ms late! Actual rate: 85.4 Hz`).
  - **Bottom Track (`sleep_until(next_tick)`)**: Shows dynamic sleep bars (`10ms - t_exec`) that contract automatically when $t_{\text{exec}}$ increases, keeping every single wakeup locked on the $10.0\text{ ms}$ grid lines at `100.00 Hz (0.0 ms Cumulative Drift)`.
