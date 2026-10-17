# Part 5, Topic 1: Asynchronous Python
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

