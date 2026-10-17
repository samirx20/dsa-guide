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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Trace a capacity-3 ring buffer.** Using the chapter's `push_overwrite` / `pop_oldest` logic on a `RealTimeRingBuffer<int, 3>`, fill in slots, `head_`, `tail_`, `count_` and the return value after each operation: `push(1)`, `push(2)`, `push(3)`, `push(4)`, `push(5)`, `pop()`, `push(6)`, `pop()`, `pop()`. How many items were overwritten?

**Q2. Power-of-two masks.** For $N = 8$, what is `(13 + 1) & (N - 1)`? Why is the bitwise trick invalid for $N = 6$? Compute `(5 + 1) & (6 - 1)` and compare it with `(5 + 1) % 6`.

**Q3. Drift arithmetic.** A $200\text{ Hz}$ loop ($T_s = 5\text{ ms}$) uses `sleep_for(5ms)`. Its body takes $0.8\text{ ms}$ and the scheduler adds $0.2\text{ ms}$ of wake-up latency. What are the actual period and rate, and how far behind schedule is it after 200 ticks? What is the accumulated error with `sleep_until`?

**Q4. Producer outruns a stalled consumer.** In the chapter's `main()` (400 Hz producer, `RealTimeRingBuffer<ImuSample, 8>`), the controller has just drained everything up to `seq=#20`. Then the controller is delayed so that $40\text{ ms}$ pass before its next drain. How many samples are produced, which sequence numbers does the drain return, how many does `overwritten_count()` increase by, and what is `latest.sequence_id`?

**Q5. Which line is the bug?** A teammate "simplifies" `push_overwrite`:

```cpp
void push_overwrite(const T& item) noexcept {
    std::lock_guard<std::mutex> lock(mtx_);
    buffer_[head_] = item;
    head_ = (head_ + 1) % Capacity;
    if (count_ < Capacity) ++count_;   // tail_ is never advanced
}
```

On a capacity-4 buffer, after `push(10)`, …, `push(50)`, what do four successive `pop_oldest()` calls return? Compare with the chapter's dry-run table.

### Coding Exercises

**E1 (Easy). `peek_latest()`.** Write a single-threaded `RingBuffer<T, Capacity>` with the chapter's `push_overwrite` and `pop_oldest`, plus `std::optional<T> peek_latest() const` that returns the newest element **without removing it** (`std::nullopt` if empty).
- Capacity 3, push `1..5`: `peek_latest()` → `5`, `size()` → `3`. Then `pop_oldest()` → `3`.

**E2 (Easy–Medium). O(1) moving average.** A gyro bias estimator wants the mean of the last $N$ samples on every push. Write `template <std::size_t N> class RunningMeanRing` with `push(double)` and `mean()` that keeps a running sum, subtracting the value being overwritten, so each push is $O(1)$ and allocation-free.
- $N = 3$: push `1, 2, 3` → `mean() == 2`. Push `10` → `5`. Push `20` → `11`.

**E3 (Medium). Simulate `sleep_until` with the catch-up guard.** Without threads, model the phase-locked loop deterministically. Write `simulate_sleep_until(exec_ms, period_ms, catch_up_guard)` that returns each tick's wake time and the number of guard resets. Rules per tick: `next_tick += period`; if the guard is on and `now > next_tick + period`, increment `missed` and set `next_tick = now`; `wake = max(now, next_tick)`; then `now = wake + exec`. Start with `now = next_tick = 0`.
- `exec = {1.2, 1.5, 25.0, 2.0, 1.0}`, period 10, guard on → wakes `10 20 30 55 65`, missed `1`
- Same input, guard off → wakes `10 20 30 55 57` (tick 5 fires back-to-back: the "runaway burst")

#### Dry-Run: Answers

**Q1.**

| Op | Returns | Slots `[0] [1] [2]` | `head_` | `tail_` | `count_` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `push(1)` | — | `1 — —` | 1 | 0 | 1 |
| `push(2)` | — | `1 2 —` | 2 | 0 | 2 |
| `push(3)` | — | `1 2 3` | 0 (wrapped) | 0 | 3 (full) |
| `push(4)` | — | `4 2 3` | 1 | **1** | 3 |
| `push(5)` | — | `4 5 3` | 2 | **2** | 3 |
| `pop()` | **3** | `4 5 (3)` | 2 | 0 | 2 |
| `push(6)` | — | `4 5 6` | 0 | 0 | 3 |
| `pop()` | **4** | `(4) 5 6` | 0 | 1 | 2 |
| `pop()` | **5** | `(4) (5) 6` | 0 | 2 | 1 |

The pops return 3, 4, 5, oldest first. Two items (`1` and `2`) were overwritten. One item (`6`) is left.

**Q2.** $14 = 1110_2$ and $7 = 0111_2$, so $14 \mathbin{\&} 7 = 0110_2 = \mathbf{6}$, the same as $14 \bmod 8$. For $N = 6$ the mask is $5 = 101_2$, and $6 \mathbin{\&} 5 = 110_2 \mathbin{\&} 101_2 = 100_2 = \mathbf{4}$, but $6 \bmod 6 = \mathbf{0}$. The identity only holds when $N - 1$ is all ones in binary, which means $N = 2^k$.

**Q3.** Actual period $= 0.8 + 5.0 + 0.2 = \mathbf{6.0\text{ ms}}$, about $\mathbf{166.7\text{ Hz}}$. Each tick loses $1.0\text{ ms}$, so after 200 ticks the loop is **$200\text{ ms}$ behind** (and the gap keeps growing). With `sleep_until`, wake targets stay at $t_0 + k \cdot 5\text{ ms}$, so the accumulated error is **0**. Only the small per-tick wake-up jitter remains, and it does not add up.

**Q4.** $40\text{ ms} / 2.5\text{ ms} = \mathbf{16}$ samples (`seq` 21–36). Only 8 fit, so `21`–`28` are overwritten: `overwritten_count()` rises by **8**. The drain loop returns **`#29` … `#36`** (8 samples, oldest first), and `latest.sequence_id` $= \mathbf{36}$. The controller acts on the freshest state, which is the point of overwrite-oldest.

**Q5.** The bug is the last line: once full, `tail_` stays at slot 0, which now holds the **newest** item.

| After pushes | Slots | `head_` | `tail_` | `count_` |
| :--- | :---: | :---: | :---: | :---: |
| `10..50` (buggy) | `50 20 30 40` | 1 | **0** | 4 |

The pops return **50, 20, 30, 40**: the newest sample comes out first, then the old ones. The chapter's correct version advances `tail_` to 1 and pops 20, 30, 40, 50.

**E1. Reference solution**

```cpp
#include <array>
#include <cstddef>
#include <iostream>
#include <optional>

template <typename T, std::size_t Capacity>
class RingBuffer {
    static_assert(Capacity > 0, "Capacity must be > 0");
public:
    void push_overwrite(const T& item) noexcept {
        buffer_[head_] = item;
        head_ = (head_ + 1) % Capacity;
        if (count_ == Capacity) tail_ = (tail_ + 1) % Capacity;   // drop oldest
        else ++count_;
    }
    std::optional<T> pop_oldest() noexcept {
        if (count_ == 0) return std::nullopt;
        T item = buffer_[tail_];
        tail_ = (tail_ + 1) % Capacity;
        --count_;
        return item;
    }
    std::optional<T> peek_latest() const noexcept {
        if (count_ == 0) return std::nullopt;
        return buffer_[(head_ + Capacity - 1) % Capacity];        // slot just behind head_
    }
    std::size_t size() const noexcept { return count_; }
private:
    std::array<T, Capacity> buffer_{};
    std::size_t head_{0}, tail_{0}, count_{0};
};

int main() {
    RingBuffer<int, 3> rb;
    for (int v : {1, 2, 3, 4, 5}) rb.push_overwrite(v);
    std::cout << *rb.peek_latest() << "\n";   // 5
    std::cout << rb.size() << "\n";           // 3 (peek removed nothing)
    std::cout << *rb.pop_oldest() << "\n";    // 3
}
```

$O(1)$. Adding `Capacity` before subtracting 1 avoids unsigned underflow when `head_ == 0`. In the threaded version, add the same `std::lock_guard` as the other methods.

**E2. Reference solution**

```cpp
#include <array>
#include <cstddef>
#include <iostream>

template <std::size_t N>
class RunningMeanRing {
    static_assert(N > 0, "N must be > 0");
public:
    void push(double x) noexcept {
        if (count_ == N) sum_ -= buf_[head_];   // slot about to be overwritten = oldest
        else ++count_;
        buf_[head_] = x;
        sum_ += x;
        head_ = (head_ + 1) % N;
    }
    double mean() const noexcept { return count_ ? sum_ / static_cast<double>(count_) : 0.0; }
private:
    std::array<double, N> buf_{};
    std::size_t head_{0}, count_{0};
    double sum_{0.0};
};

int main() {
    RunningMeanRing<3> m;
    for (double x : {1.0, 2.0, 3.0}) m.push(x);
    std::cout << m.mean() << "\n";  // 2
    m.push(10.0);
    std::cout << m.mean() << "\n";  // (2 + 3 + 10) / 3 = 5
    m.push(20.0);
    std::cout << m.mean() << "\n";  // (3 + 10 + 20) / 3 = 11
}
```

When full, `head_ == tail_`, so `buf_[head_]` is exactly the oldest value. Subtract it before overwriting. This is $O(1)$ per push. Over millions of pushes, floating-point drift in `sum_` can be cleared by recomputing it occasionally outside the real-time path.

**E3. Reference solution**

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

struct ScheduleResult { std::vector<double> wake_ms; int missed; };

ScheduleResult simulate_sleep_until(const std::vector<double>& exec_ms, double period_ms,
                                    bool catch_up_guard) {
    ScheduleResult res{{}, 0};
    res.wake_ms.reserve(exec_ms.size());        // offline tool: allocation is fine here
    double now = 0.0, next_tick = 0.0;
    for (double exec : exec_ms) {
        next_tick += period_ms;                 // phase-locked target t0 + k*T
        if (catch_up_guard && now > next_tick + period_ms) {
            ++res.missed;                       // more than a full period late
            next_tick = now;                    // re-anchor instead of bursting
        }
        double wake = std::max(now, next_tick); // sleep_until returns at once if late
        res.wake_ms.push_back(wake);
        now = wake + exec;
    }
    return res;
}

int main() {
    for (bool guard : {true, false}) {
        auto r = simulate_sleep_until({1.2, 1.5, 25.0, 2.0, 1.0}, 10.0, guard);
        for (double w : r.wake_ms) std::cout << w << " ";
        std::cout << "| missed=" << r.missed << "\n";
    }
    // 10 20 30 55 65 | missed=1
    // 10 20 30 55 57 | missed=0
}
```

Trace with the guard on: tick 3 runs 30→55. At tick 4, `next_tick = 40` and $55 > 40 + 10$, so the loop re-anchors to 55. Tick 5 then targets 65. With the guard off, tick 4 wakes at 55 (late), tick 5 targets 50 < 57, so it fires immediately at 57: two ticks only $2\text{ ms}$ apart. $O(n)$.

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
