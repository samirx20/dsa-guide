# Part 1, Topic 1: Asynchronous Python
## Chapter 2: Concurrent Execution

**Prerequisite Knowledge:** Understanding of the event loop (Chapter 1), `async` and `await` keywords.

---

### The "Laundry Day" Analogy
Imagine it's laundry day. If you wash your first load of clothes, dry it, and fold it *before* you even start the washer for your second load, you'll be doing laundry all day. This is sequential execution. 

Instead, a smart person starts the washer for load one. While the washer is running, they might fold clothes from yesterday. When the washer finishes, they move load one to the dryer, and immediately start load two in the washer. This is concurrent execution: juggling multiple tasks at the same time so everything gets done much faster.

Calling coroutines sequentially with `await` gives you correctness but not performance. When your agent needs to query three APIs, fetch two documents, and validate one reading, you want all seven tasks running simultaneously. `asyncio.gather()` and `asyncio.create_task()` make this possible.

```
┌──────────── SEQUENTIAL (One at a Time) ────────────┐
│                                                      │
│  |--Task A--|--Task B--|--Task C--|                  │
│  Total: 3 seconds                                   │
└──────────────────────────────────────────────────────┘

┌──────────── CONCURRENT (All at Once) ──────────────┐
│                                                      │
│  |--Task A--|                                       │
│  |--Task B--|                                       │
│  |--Task C--|                                       │
│  Total: 1 second (limited by slowest task)          │
└──────────────────────────────────────────────────────┘
```

---

### 1. `asyncio.gather()` — Run Everything at Once

`gather()` takes multiple coroutines and runs them concurrently. It returns all results in the same order you passed them in.

```python
import asyncio
import httpx
import time

async def fetch_sensor(client: httpx.AsyncClient, sensor_id: str) -> dict:
    # Simulate a network request that takes time
    response = await client.get(f"https://mock-api.example.com/sensor/{sensor_id}")
    return {"sensor_id": sensor_id, "data": response.json()}

async def main():
    async with httpx.AsyncClient() as client:
        start = time.perf_counter()

        # Step 1: Tell the event loop to run all three tasks at the exact same time
        results = await asyncio.gather(
            fetch_sensor(client, "temp-01"),
            fetch_sensor(client, "temp-02"),
            fetch_sensor(client, "temp-03"),
        )

        # Step 2: The results come back as a list, in the exact order we asked for them
        elapsed = time.perf_counter() - start
        print(f"Fetched {len(results)} sensors in {elapsed:.2f}s")

asyncio.run(main())
```

**What's happening:**
```python
results = await asyncio.gather(
    fetch_sensor(client, "temp-01"),   # Coroutine 1
    fetch_sensor(client, "temp-02"),   # Coroutine 2
    fetch_sensor(client, "temp-03"),   # Coroutine 3
)
#          ^^^^^^^^^
#          gather() schedules all three coroutines on the event loop
#          They all start running concurrently
#          await waits for ALL of them to complete
#
# results = [result_1, result_2, result_3]
# Order is PRESERVED regardless of which finishes first
#
# Timeline:
# |--temp-01 (1s)--|
# |--temp-02 (1s)--|
# |--temp-03 (1s)--|
# Total: ~1 second (not 3)
```

If each API call takes 1 second, the total time is ~1 second instead of ~3 seconds.

```python
# gather() returns results in INPUT order, not completion order
results = await asyncio.gather(
    slow_task(),   # Takes 3 seconds
    fast_task(),   # Takes 1 second
)
# results[0] = slow_task's result (even though fast_task finished first)
# results[1] = fast_task's result
```

### 2. `asyncio.create_task()` — Fire and Forget

Sometimes you want to start a task without immediately waiting for it. `create_task()` schedules a coroutine on the event loop and returns a `Task` object you can await later.

```python
async def log_to_observability(data: dict) -> None:
    await asyncio.sleep(0.5)  # Simulate network call to logging service
    print(f"Logged: {data}")

async def main():
    # Step 1: Schedule the logging task to run in the background. 
    # We don't 'await' it here, so our code keeps moving immediately.
    task = asyncio.create_task(log_to_observability({"event": "sensor_read"}))

    # Step 2: Do some other important work while the logging happens in the background
    result = await fetch_primary_data()

    # Step 3: Now we 'await' the background task to make sure it actually finished
    # before we exit the main function.
    await task  
    return result
```

**What's happening:**
```python
task = asyncio.create_task(log_to_observability({"event": "sensor_read"}))
#     ^^^^^^^^^^^^^^^^^^^^
#     Schedules the coroutine on the event loop
#     Returns a Task object immediately (before the coroutine finishes)
#     The coroutine starts running in the background

# Meanwhile, this line runs NEXT:
result = await fetch_primary_data()
# Both log_to_observability AND fetch_primary_data run concurrently!

# This is different from gather():
# gather()    — await all results at once
# create_task — schedule now, await later (or never)
```

```python
# create_task vs gather — when to use which

# Use gather when you need ALL results before continuing
results = await asyncio.gather(
    fetch_sensor("temp-01"),
    fetch_sensor("temp-02"),
)
process(results)  # Needs both results

# Use create_task when you want background work
task = asyncio.create_task(send_to_dashboard(data))
# ... do other work ...
# The dashboard send happens in the background

# Use create_task when you want to start work early
task = asyncio.create_task(fetch_expensive_data())  # Start now
# ... do other work ...
data = await task  # Get result later
```

### 3. Error Handling in `gather()`

By default, if one coroutine raises an exception, `gather()` immediately propagates it to the `await` — but it does **not** cancel the remaining tasks. They keep running in the background and their results are simply lost. Pass `return_exceptions=True` to collect exceptions as return values instead, or use `TaskGroup` (below) if you want siblings cancelled on failure.

```python
async def might_fail(task_id: int) -> str:
    if task_id == 2:
        raise ValueError(f"Task {task_id} failed")
    return f"Task {task_id} succeeded"

async def main():
    # Step 1: Run tasks but tell gather NOT to crash if one fails
    results = await asyncio.gather(
        might_fail(1),
        might_fail(2),  # This one will fail
        might_fail(3),
        return_exceptions=True,
    )

    # Step 2: Loop through the results and handle the errors manually
    for result in results:
        # Check if the result is actually an error object
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"OK: {result}")
```

**What's happening:**
```python
# Without return_exceptions=True (default behavior):
results = await asyncio.gather(might_fail(1), might_fail(2), might_fail(3))
# might_fail(2) raises ValueError
# gather() IMMEDIATELY propagates the exception
# might_fail(3) is NOT cancelled — it keeps running, but its result is discarded
# You get: ValueError: Task 2 failed

# With return_exceptions=True:
results = await asyncio.gather(
    might_fail(1), might_fail(2), might_fail(3),
    return_exceptions=True,
)
# results = ["Task 1 succeeded", ValueError("Task 2 failed"), "Task 3 succeeded"]
# All three tasks run to completion
# Exceptions are returned as values, not raised
# You must check isinstance(result, Exception) yourself
```

```python
# Common pattern: partial failure tolerance
results = await asyncio.gather(
    fetch_from_api_1(),
    fetch_from_api_2(),
    fetch_from_api_3(),
    return_exceptions=True,
)

successful = [r for r in results if not isinstance(r, Exception)]
failed = [r for r in results if isinstance(r, Exception)]

print(f"Got {len(successful)} results, {len(failed)} failures")
```

### 4. `asyncio.TaskGroup` (Python 3.11+)

`TaskGroup` is the modern, safer alternative to `gather()`. It uses a context manager and automatically cancels all tasks if any one of them fails.

```python
async def main():
    # Step 1: Open a TaskGroup block
    async with asyncio.TaskGroup() as tg:
        # Step 2: Create tasks inside the group.
        # They all start running immediately.
        task1 = tg.create_task(fetch_sensor("temp-01"))
        task2 = tg.create_task(fetch_sensor("temp-02"))
        task3 = tg.create_task(fetch_sensor("temp-03"))

    # Step 3: When the 'async with' block ends, Python automatically waits 
    # for all tasks to finish. We can safely read their results now.
    print(task1.result(), task2.result(), task3.result())
```

**What's happening:**
```python
async with asyncio.TaskGroup() as tg:
#      ^^^^^^^^^^^^^^^^^^^^^^^^^
#      Creates a TaskGroup context manager
#      When you enter this block, you can create tasks

    task1 = tg.create_task(fetch_sensor("temp-01"))
    #         ^^^^^^^^^^^^^^^
    #         Creates and schedules a task in the group
    #         Task starts running immediately

# When the block EXITS:
# 1. Python waits for ALL tasks to complete
# 2. If ANY task raises an exception:
#    - All remaining tasks are CANCELLED
#    - An ExceptionGroup is raised with all errors
# 3. If all succeed: block exits normally
```

```python
# TaskGroup error handling
try:
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(might_fail(1))
        task2 = tg.create_task(might_fail(2))  # Fails!
        task3 = tg.create_task(might_fail(3))
except* ValueError as eg:
    for exc in eg.exceptions:
        print(f"Task failed: {exc}")
# task1 and task3 are cancelled because task2 failed
```

### 5. `asyncio.wait()` — Fine-Control Over Concurrency

`wait()` gives you more control than `gather()`. You can specify when to return: when ALL tasks complete, when FIRST task completes, or when FIRST task completes with a specific state.

```python
import asyncio

async def fetch_with_timeout(task_id: int, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"Task {task_id} done"

async def main():
    tasks = [
        asyncio.create_task(fetch_with_timeout(1, 2)),
        asyncio.create_task(fetch_with_timeout(2, 1)),
        asyncio.create_task(fetch_with_timeout(3, 3)),
    ]

    # Wait for ALL tasks (like gather, but returns sets not results)
    done, pending = await asyncio.wait(tasks)
    # done = {Task1, Task2, Task3}  (all completed)
    # pending = set()  (none pending)

    for task in done:
        print(task.result())
```

**What's happening:**
```python
done, pending = await asyncio.wait(tasks, return_when=asyncio.ALL_COMPLETED)
#                                             ^^^^^^^^^^^^^^^^^^^^^^^^^
#                                             Wait for everything
# done = set of completed Task objects
# pending = set of still-running Task objects

# Other options:
# return_when=asyncio.FIRST_COMPLETED — return as soon as ANY task finishes
# return_when=asyncio.FIRST_EXCEPTION — return when first task raises
# return_when=asyncio.ALL_COMPLETED — wait for everything (default)

# To get results from done tasks:
for task in done:
    result = task.result()  # Get the return value
    # Or check for exception:
    # exc = task.exception()
```

### 6. Combining gather() and create_task() — Factory Floor Pattern

```python
import asyncio
import httpx

async def fetch_sensor(client: httpx.AsyncClient, sensor_id: str) -> dict:
    response = await client.get(f"https://factory-api.example.com/sensors/{sensor_id}")
    return response.json()

async def send_alert(alert: dict) -> None:
    await asyncio.sleep(0.2)  # Simulate alert API call
    print(f"ALERT: {alert}")

async def main():
    async with httpx.AsyncClient() as client:
        # Phase 1: Fetch all sensors concurrently
        sensors = await asyncio.gather(
            fetch_sensor(client, "temp-01"),
            fetch_sensor(client, "temp-02"),
            fetch_sensor(client, "temp-03"),
        )

        # Phase 2: Process and send alerts concurrently
        alerts = [
            send_alert({"sensor": s["sensor_id"], "value": s["value"]})
            for s in sensors
            if s["value"] > 100  # Only alert for high readings
        ]

        if alerts:
            await asyncio.gather(*alerts)  # Unpack list with *
```

**What's happening:**
```python
# Phase 1: gather() fetches all sensors in parallel
# Phase 2: List comprehension creates alert coroutines
#          gather(*alerts) unpacks them and runs concurrently
#
# The * operator unpacks the list:
# asyncio.gather(*[send_alert(a1), send_alert(a2)])
# is the same as:
# asyncio.gather(send_alert(a1), send_alert(a2))
```

### 7. Common Mistake: Forgetting to Await

```python
# WRONG: create_task without awaiting the result
async def main():
    task = asyncio.create_task(fetch_sensor("temp-01"))
    # Task runs in background, but we never get the result!
    # If main() exits, the task is cancelled silently

# RIGHT: Always await tasks before exiting
async def main():
    task = asyncio.create_task(fetch_sensor("temp-01"))
    result = await task  # Get the result

# RIGHT: If you truly want fire-and-forget, use a long-lived reference
background_tasks = set()

async def main():
    task = asyncio.create_task(fetch_sensor("temp-01"))
    background_tasks.add(task)  # Prevent garbage collection
    task.add_done_callback(background_tasks.discard)  # Clean up when done
```

**What's happening:**
```python
# If a Task has no references, Python may garbage collect it
# This cancels the task silently — no error, no warning!
#
# To prevent this:
# 1. Always await the task (preferred)
# 2. Keep a reference in a set (for fire-and-forget)
# 3. Use task.add_done_callback() for cleanup
```

### 8. Cancellation

```python
import asyncio

async def long_running_task():
    try:
        while True:
            await asyncio.sleep(1)
            print("Working...")
    except asyncio.CancelledError:
        print("Task was cancelled! Cleaning up...")
        raise  # Re-raise to mark task as cancelled

async def main():
    task = asyncio.create_task(long_running_task())
    
    await asyncio.sleep(5)  # Let it run for 5 seconds
    
    task.cancel()  # Ask the task to stop
    
    try:
        await task  # Wait for it to finish
    except asyncio.CancelledError:
        print("Confirmed: task was cancelled")
```

**What's happening:**
```python
task.cancel()
#       ^^^^^^
#       Sets a flag on the task
#       The next time the task hits an 'await', CancelledError is raised
#       The task should handle this and clean up

# The task's try/except catches CancelledError
# The 'raise' re-raises it so asyncio knows the task was cancelled
# Without the re-raise, the task appears to complete normally
```

---

### Summary

Use `asyncio.gather()` to run multiple coroutines concurrently and get all results at once. Use `create_task()` when you need to schedule work and await it later. Prefer `TaskGroup` (3.11+) for safer error handling that cancels remaining tasks on failure.

---

### Quick Reference

| Syntax | Meaning | Example |
|--------|---------|---------|
| `asyncio.gather()` | Run all concurrently, get ordered results | `await asyncio.gather(c1, c2, c3)` |
| `asyncio.create_task()` | Schedule coroutine, get Task object | `task = asyncio.create_task(coro)` |
| `asyncio.TaskGroup()` | Safer gather with auto-cancel on error | `async with asyncio.TaskGroup() as tg:` |
| `asyncio.wait()` | Fine-control over when to return | `await asyncio.wait(tasks)` |
| `return_exceptions=True` | Collect exceptions as values | `gather(c1, c2, return_exceptions=True)` |
| `task.result()` | Get return value from completed task | `result = task.result()` |
| `task.cancel()` | Request task cancellation | `task.cancel()` |
| `CancelledError` | Raised when task is cancelled | `except asyncio.CancelledError:` |
| `ALL_COMPLETED` | Wait for all tasks (default) | `asyncio.wait(tasks, return_when=ALL_COMPLETED)` |
| `FIRST_COMPLETED` | Return when any task finishes | `asyncio.wait(tasks, return_when=FIRST_COMPLETED)` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

All questions use this helper:

```python
import asyncio, time

async def job(name: str, delay: float) -> str:
    print(f"start {name}")
    await asyncio.sleep(delay)
    print(f"end {name}")
    return name.upper()
```

**Q1. `gather()` print order.** Write every printed line in order, plus the final list and the elapsed time (to 1 decimal).

```python
async def main():
    t0 = time.perf_counter()
    results = await asyncio.gather(job("a", 0.3), job("b", 0.1), job("c", 0.2))
    print(results, f"{time.perf_counter() - t0:.1f}s")
```

**Q2. When does a `create_task` task actually start?** This is the chapter's "start logging in the background" pattern from Section 2. Predict the five lines.

```python
async def main():
    t0 = time.perf_counter()
    task = asyncio.create_task(job("log", 0.5))
    print("after create_task")
    await asyncio.sleep(0.2)          # stands in for fetch_primary_data()
    print("primary done")
    r = await task
    print(r, f"{time.perf_counter() - t0:.1f}s")
```

**Q3. `asyncio.wait()` with `FIRST_COMPLETED`.** Take Section 5's three tasks (`fetch_with_timeout(1, 2)`, `(2, 1)`, `(3, 3)`), but call
`done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)`.
What are `len(done)`, `len(pending)`, the result(s) in `done`, and how many seconds have passed when `wait` returns?

**Q4. Cancellation trace.** Run Section 8's `long_running_task()` unchanged (it sleeps 1 s and then prints `Working...` in a loop), but `main()` sleeps **3.5 s** instead of 5 before calling `task.cancel()`. List every printed line. What does `task.cancelled()` return afterwards?

**Q5. Partial failure.** Using Section 3's `might_fail` (only `task_id == 2` raises), predict both outputs:

```python
async def main():
    results = await asyncio.gather(
        *(might_fail(i) for i in [1, 2, 3, 4]), return_exceptions=True)
    successful = [r for r in results if not isinstance(r, Exception)]
    failed = [r for r in results if isinstance(r, Exception)]
    print(f"Got {len(successful)} results, {len(failed)} failures")

    try:
        await asyncio.gather(might_fail(1), might_fail(2), might_fail(3))
    except ValueError as e:
        print("caught:", e)
```

### Coding Exercises

**E1 (Easy).** Write `async def fetch_all(delays: dict[str, float]) -> dict[str, str]` that fetches every sensor **concurrently** with `asyncio.gather`. Use the simulated fetch `fake_fetch(sensor_id, delay)`, which sleeps `delay` seconds and returns `f"{sensor_id}:ok"`. The result dict must keep the input key order.
- `await fetch_all({"temp-01": 0.3, "temp-02": 0.1, "temp-03": 0.2})` returns `{'temp-01': 'temp-01:ok', 'temp-02': 'temp-02:ok', 'temp-03': 'temp-03:ok'}` in about $0.3$ s (not $0.6$ s).

**E2 (Easy–Medium).** Write `async def first_responder(delays: list[float]) -> int` that starts one task per delay (task $i$ sleeps `delays[i]` and returns `i`). It should return the **index of the first task to finish**, and cancel every other task before returning.
- `await first_responder([0.3, 0.1, 0.2])` returns `1` after about $0.1$ s.
- `await first_responder([0.2])` returns `0`.

**E3 (Medium).** Write `async def gather_within(coros: list, timeout: float) -> list` that runs all coroutines concurrently for at most `timeout` seconds. It should return a list **in input order**: the coroutine's result if it finished successfully in time, otherwise `None` (for both timed-out and failed coroutines). Unfinished tasks must be cancelled.
- `await gather_within([fake_fetch("a", 0.1), fake_fetch("b", 0.5), fake_fetch("c", 0.2)], 0.3)` returns `['a:ok', None, 'c:ok']` in about $0.3$ s.
- If a coroutine raises `RuntimeError` after 0.05 s, its slot is `None` and the call does **not** raise.

#### Dry-Run: Answers

**Q1.** Output:

```
start a
start b
start c
end b
end c
end a
['A', 'B', 'C'] 0.3s
```

`gather` starts all three before any of them finishes. They finish in delay order (b at 0.1, c at 0.2, a at 0.3), but the result list keeps **input** order. Elapsed time is the maximum delay, $\max(0.3, 0.1, 0.2) = 0.3$ s, not the sum ($0.6$ s).

**Q2.** Output:

```
after create_task
start log
primary done
end log
LOG 0.5s
```

| t (s) | What runs |
|------:|-----------|
| 0.0 | `create_task` only *schedules* the task, and `main` keeps going and prints `after create_task` |
| 0.0 | `main` hits `await asyncio.sleep(0.2)` and yields, so the task runs and prints `start log` |
| 0.2 | `main` resumes and prints `primary done`, then waits on `task` |
| 0.5 | the task prints `end log` and returns `"LOG"` |

The two waits overlap, so the total is $\max(0.2, 0.5) = 0.5$ s.

**Q3.** `len(done) == 1`, `len(pending) == 2`, and the done task's result is `"Task 2 done"`. `wait` returns after **1 s**, when the shortest task (`delay=1`) finishes. Tasks 1 and 3 are still running in `pending`, so you should cancel them (or await them later).

**Q4.** Output:

```
Working...
Working...
Working...
Task was cancelled! Cleaning up...
Confirmed: task was cancelled
```

The task prints at $t = 1, 2, 3$ s. At $t = 3.5$ s it is suspended inside `asyncio.sleep(1)` (the one that would end at 4 s). `cancel()` makes that `await` raise `CancelledError`, the `except` block prints the cleanup line and re-raises, and `await task` in `main` gets the `CancelledError`. `task.cancelled()` returns `True` because the task re-raised. If it had swallowed the error, it would return `False`.

**Q5.** Output:

```
Got 3 results, 1 failures
caught: Task 2 failed
```

With `return_exceptions=True`, `results == ['Task 1 succeeded', ValueError('Task 2 failed'), 'Task 3 succeeded', 'Task 4 succeeded']`, which is 3 strings and 1 exception. Without it, the first exception propagates out of `await gather(...)` and the `except ValueError` catches it. The error message is the text passed to `ValueError`, so the second line is `caught: Task 2 failed`.

**E1 — reference solution**

```python
import asyncio

async def fake_fetch(sensor_id: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"{sensor_id}:ok"

async def fetch_all(delays: dict[str, float]) -> dict[str, str]:
    ids = list(delays)                                  # fix the order once
    results = await asyncio.gather(*(fake_fetch(s, delays[s]) for s in ids))
    return dict(zip(ids, results))                      # gather keeps input order
```

Wall time is $\max(\text{delays})$ instead of $\sum \text{delays}$. `zip` is safe because `gather` returns results in the order the coroutines were passed.

**E2 — reference solution**

```python
import asyncio

async def _sleeper(i: int, d: float) -> int:
    await asyncio.sleep(d)
    return i

async def first_responder(delays: list[float]) -> int:
    tasks = [asyncio.create_task(_sleeper(i, d)) for i, d in enumerate(delays)]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
    await asyncio.gather(*pending, return_exceptions=True)  # let cancellations finish
    return min(t.result() for t in done)   # tie-break: lowest index
```

`FIRST_COMPLETED` returns as soon as one task is done, after $\min(\text{delays})$ seconds. Gathering the cancelled tasks with `return_exceptions=True` absorbs their `CancelledError`s, so no task is left running.

**E3 — reference solution**

```python
import asyncio

async def gather_within(coros: list, timeout: float) -> list:
    tasks = [asyncio.create_task(c) for c in coros]
    done, pending = await asyncio.wait(tasks, timeout=timeout)
    for t in pending:
        t.cancel()
    await asyncio.gather(*pending, return_exceptions=True)
    out = []
    for t in tasks:                                   # input order, not set order
        if t in done and t.exception() is None:
            out.append(t.result())
        else:
            out.append(None)                          # timed out or raised
    return out
```

`asyncio.wait(..., timeout=...)` never raises on timeout. It just splits the tasks into `done` and `pending`. Iterating the original `tasks` list puts the results back in input order. A failed task is in `done`, but its `exception()` is not `None`, so it maps to `None` without propagating.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Concurrent Execution**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 concurrent execution**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

