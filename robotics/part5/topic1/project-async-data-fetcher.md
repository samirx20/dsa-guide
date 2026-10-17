# Part 1, Topic 1: Asynchronous Python
## Project 1: Async Data Fetcher from Mock Sensor APIs

Now that you understand event loops, concurrent execution, and async HTTP, it is time to build a script that fetches data from 3 different mock sensor APIs simultaneously and compares the performance against a sequential approach.

### Goal

Prove you can use `httpx.AsyncClient` with `asyncio.gather()` to fetch data concurrently, handle per-source errors, and measure the performance gain over sequential calls.

### Requirements

#### 1. Set Up Mock Sensor Endpoints
- Use `jsonplaceholder.typicode.com` endpoints as mock sensor sources (e.g., `/posts/1`, `/todos/1`, `/users/1`).
- Each endpoint represents a different factory sensor: temperature, pressure, vibration.
- Create a helper function `fetch_sensor(client, sensor_id, url)` that fetches data and returns a dict with `sensor_id`, `status`, and `data`.

#### 2. Sequential Fetching
- Write a function `fetch_sequential(client, sensors)` that fetches each sensor one by one using `await` in a loop.
- Record the total time using `time.perf_counter()`.
- Print the result for each sensor.

#### 3. Concurrent Fetching
- Write a function `fetch_concurrent(client, sensors)` that fetches all sensors at once using `asyncio.gather()`.
- Record the total time.
- Print the result for each sensor.

#### 4. Per-Source Error Handling
- Modify your fetch function to handle `httpx.TimeoutException` and `httpx.HTTPStatusError` per sensor.
- If one sensor fails, the others should still succeed. Use `return_exceptions=True` in `gather()`.
- Print which sensors failed and which succeeded.

#### 5. Performance Comparison
- Run both sequential and concurrent fetches.
- Print a comparison table: approach, total time, sensors succeeded, sensors failed.

### Evaluation Checklist

- [ ] Does the script run without errors?
- [ ] Does sequential fetching take roughly 3x longer than concurrent?
- [ ] Does concurrent fetching handle a failing endpoint gracefully without crashing?
- [ ] Is every function type-hinted?
- [ ] Does the output clearly show the timing difference between sequential and concurrent?

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Async Data Fetcher from Mock Sensor APIs**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project async data fetcher**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

