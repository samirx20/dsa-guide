# Part 5, Topic 1: Asynchronous Python
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
- [ ] Does sequential fetching take roughly 3x longer than concurrent? (The exact ratio is $\sum d_i / \max d_i$, so it depends on the per-endpoint delays: about 2.5x with the mock's default delays.)
- [ ] Does concurrent fetching handle a failing endpoint gracefully without crashing?
- [ ] Is every function type-hinted?
- [ ] Does the output clearly show the timing difference between sequential and concurrent?

### Starter Code Skeleton

The public `jsonplaceholder` API is fine for a demo, but its latency changes from run to run, and you cannot force it to time out. The skeleton therefore adds an **offline mode**: an `httpx.MockTransport` with fixed per-endpoint delays. You can then reproduce the timings, and the tests never touch the network. Your fetch code does not change at all. Only the transport passed to `httpx.AsyncClient` changes.

```text
async-data-fetcher/
├── pyproject.toml
├── sensors.py          # SensorSpec + the SENSORS / FAULTY_SENSORS tables
├── mock_transport.py   # deterministic offline stand-in for jsonplaceholder
├── fetcher.py          # fetch_sensor, fetch_sequential, fetch_concurrent
├── report.py           # RunSummary + table formatting
├── main.py             # argparse flags, timing, asyncio.run()
└── tests/
    └── test_fetcher.py
```

```toml
# pyproject.toml
[project]
name = "async-data-fetcher"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27"]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23"]

[tool.pytest.ini_options]
asyncio_mode = "strict"
```

```python
# sensors.py
from dataclasses import dataclass

BASE_URL = "https://jsonplaceholder.typicode.com"


@dataclass(frozen=True)
class SensorSpec:
    sensor_id: str
    kind: str
    path: str


SENSORS: list[SensorSpec] = [
    SensorSpec("SENS-TEMP-01", "temperature", "/posts/1"),
    SensorSpec("SENS-PRES-02", "pressure", "/todos/1"),
    SensorSpec("SENS-VIB-03", "vibration", "/users/1"),
]

FAULTY_SENSORS: list[SensorSpec] = [
    SensorSpec("SENS-HUM-04", "humidity", "/posts/999999"),  # 404 on the real API too
    SensorSpec("SENS-TRQ-05", "torque", "/slow"),            # offline mock: answers too late
]
```

```python
# mock_transport.py -- complete; you do not need to change it
import asyncio

import httpx

DELAYS: dict[str, float] = {
    "/posts/1": 0.30, "/todos/1": 0.25, "/users/1": 0.35, "/posts/999999": 0.10, "/slow": 5.0,
}


def build_mock_transport(delays: dict[str, float] | None = None) -> httpx.MockTransport:
    table: dict[str, float] = DELAYS if delays is None else delays

    async def handler(request: httpx.Request) -> httpx.Response:
        delay: float = table.get(request.url.path, 0.0)
        # MockTransport ignores client timeouts, so honor the read timeout ourselves.
        read_timeout: float | None = request.extensions.get("timeout", {}).get("read")
        if read_timeout is not None and delay > read_timeout:
            await asyncio.sleep(read_timeout)
            raise httpx.ReadTimeout("mock read timeout", request=request)
        await asyncio.sleep(delay)  # asyncio.sleep, never time.sleep (see Practice Q3)
        if request.url.path == "/posts/999999" or request.url.path not in table:
            return httpx.Response(404, json={}, request=request)
        return httpx.Response(200, json={"id": 1, "path": request.url.path}, request=request)

    return httpx.MockTransport(handler)
```

```python
# fetcher.py
import asyncio
import time
from typing import Any, Literal, TypedDict

import httpx

from sensors import SensorSpec

FetchStatus = Literal["ok", "timeout", "http_error", "error"]


class SensorResult(TypedDict):
    sensor_id: str
    status: FetchStatus
    data: dict[str, Any] | None
    error: str | None
    elapsed_ms: float


async def fetch_sensor(client: httpx.AsyncClient, sensor_id: str, url: str) -> SensorResult:
    """Fetch one sensor. Expected failures become a result; they are never raised."""
    start: float = time.perf_counter()

    def done(status: FetchStatus, data: dict[str, Any] | None = None, error: str | None = None) -> SensorResult:
        elapsed: float = round((time.perf_counter() - start) * 1000, 1)
        return {"sensor_id": sensor_id, "status": status, "data": data, "error": error, "elapsed_ms": elapsed}

    # TODO(milestone 2): await client.get(url); response.raise_for_status(); return done("ok", data=...)
    # TODO(milestone 4): except httpx.TimeoutException -> done("timeout", error=f"no response within {client.timeout.read}s")
    # TODO(milestone 4): except httpx.HTTPStatusError as exc -> done("http_error", error=f"HTTP {exc.response.status_code}")
    raise NotImplementedError


def to_result(spec: SensorSpec, outcome: SensorResult | BaseException) -> SensorResult:
    """Turn an exception that escaped fetch_sensor into a result row with status 'error'."""
    # TODO(milestone 4)
    raise NotImplementedError


async def fetch_sequential(client: httpx.AsyncClient, sensors: list[SensorSpec]) -> list[SensorResult]:
    """Await each sensor in turn (one `await` per loop iteration)."""
    # TODO(milestone 2)
    raise NotImplementedError


async def fetch_concurrent(client: httpx.AsyncClient, sensors: list[SensorSpec]) -> list[SensorResult]:
    """asyncio.gather(..., return_exceptions=True), then map every outcome through to_result."""
    # TODO(milestone 3)
    raise NotImplementedError
```

```python
# report.py
from dataclasses import dataclass

from fetcher import SensorResult


@dataclass
class RunSummary:
    approach: str
    total_s: float
    results: list[SensorResult]

    @property
    def succeeded(self) -> int:
        return sum(1 for r in self.results if r["status"] == "ok")

    @property
    def failed(self) -> int:
        return len(self.results) - self.succeeded


def format_result(r: SensorResult) -> str:
    detail: str = "ok" if r["status"] == "ok" else f"{r['status']} ({r['error']})"
    return f"  {r['sensor_id']:<13} {detail:<34} {r['elapsed_ms']:>7.1f} ms"


def format_table(runs: list[RunSummary]) -> str:
    """Approach | Total (s) | Succeeded | Failed, plus a 'Speedup: N.NNx' line."""
    # TODO(milestone 5)
    raise NotImplementedError
```

```python
# main.py
import argparse
import asyncio
import time
from collections.abc import Awaitable, Callable

import httpx

from fetcher import SensorResult, fetch_concurrent, fetch_sequential
from mock_transport import build_mock_transport
from report import RunSummary, format_result, format_table
from sensors import BASE_URL, FAULTY_SENSORS, SENSORS, SensorSpec

Strategy = Callable[[httpx.AsyncClient, list[SensorSpec]], Awaitable[list[SensorResult]]]


def make_client(offline: bool, timeout: float) -> httpx.AsyncClient:
    transport: httpx.AsyncBaseTransport | None = build_mock_transport() if offline else None
    return httpx.AsyncClient(base_url=BASE_URL, timeout=timeout, transport=transport)


async def timed(name: str, strategy: Strategy, client: httpx.AsyncClient, sensors: list[SensorSpec]) -> RunSummary:
    start: float = time.perf_counter()
    results: list[SensorResult] = await strategy(client, sensors)
    summary = RunSummary(name, time.perf_counter() - start, results)
    print(f"[{name}] finished in {summary.total_s:.2f}s")
    for r in results:
        print(format_result(r))
    return summary


async def main(offline: bool, inject_failure: bool, timeout: float) -> list[RunSummary]:
    sensors: list[SensorSpec] = SENSORS + (FAULTY_SENSORS if inject_failure else [])
    async with make_client(offline, timeout) as client:  # ONE client, reused by both runs
        seq: RunSummary = await timed("sequential", fetch_sequential, client, sensors)
        conc: RunSummary = await timed("concurrent", fetch_concurrent, client, sensors)
    print()
    print(format_table([seq, conc]))
    return [seq, conc]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compare sequential vs concurrent sensor fetching.")
    parser.add_argument("--offline", action="store_true", help="use the deterministic mock transport")
    parser.add_argument("--inject-failure", action="store_true", help="add a 404 sensor and a timing-out sensor")
    parser.add_argument("--timeout", type=float, default=1.0)
    args = parser.parse_args()
    asyncio.run(main(args.offline, args.inject_failure, args.timeout))
```

### Step-by-Step Milestones

1. **Project and client setup.** Create the venv, install `httpx` and the dev extras, and paste in `sensors.py` and `mock_transport.py`.
   *Done when:* `python -c "import asyncio, httpx; from mock_transport import build_mock_transport as b; c = httpx.AsyncClient(transport=b()); print(asyncio.run(c.get('https://x/posts/1')).json())"` prints `{'id': 1, 'path': '/posts/1'}`.
2. **One sensor, then sequential.** Implement the happy path of `fetch_sensor` and the `for` loop in `fetch_sequential`.
   *Done when:* `python main.py --offline` prints a `[sequential] finished in 0.9xs` block with three `ok` rows. The concurrent call can raise `NotImplementedError` for now.
3. **Concurrent fetch.** Implement `fetch_concurrent` with `asyncio.gather(*coros, return_exceptions=True)`.
   *Done when:* the `[concurrent]` block reports about `0.35`–`0.40s`. That is roughly the **slowest** single delay, not the sum.
4. **Per-source error handling.** Add the two `except` branches to `fetch_sensor` and implement `to_result`.
   *Done when:* `python main.py --offline --inject-failure` shows `http_error (HTTP 404)` for `SENS-HUM-04`, `timeout (...)` for `SENS-TRQ-05`, and still `ok` for the other three, with no traceback.
5. **Comparison table.** Implement `format_table` with the speedup line $S = T_{\text{seq}} / T_{\text{conc}}$.
   *Done when:* the output ends with the table and a `Speedup:` line, as in *Sample Expected Output*.
6. **Live run.** Drop `--offline` and run against the real API.
   *Done when:* `python main.py --inject-failure` shows the three real sensors `ok` and `SENS-HUM-04` as `HTTP 404`. On the real API, `/slow` also returns `HTTP 404` instead of timing out, which is why the mock exists.
7. **Tests.** Add `tests/test_fetcher.py`.
   *Done when:* `pytest -q` reports `7 passed` with no network access.

### Sample Expected Output

The sample input is the default `DELAYS` table: $d = (0.30, 0.25, 0.35)$ s for the three healthy sensors. Sequential time is close to $\sum_i d_i = 0.90$ s, and concurrent time is close to $\max_i d_i = 0.35$ s. Your milliseconds will differ slightly. The *shape* of the numbers should match.

```text
$ python main.py --offline
[sequential] finished in 0.97s
  SENS-TEMP-01  ok                                   332.0 ms
  SENS-PRES-02  ok                                   263.4 ms
  SENS-VIB-03   ok                                   369.6 ms
[concurrent] finished in 0.38s
  SENS-TEMP-01  ok                                   328.3 ms
  SENS-PRES-02  ok                                   277.2 ms
  SENS-VIB-03   ok                                   382.5 ms

Approach    | Total (s) | Succeeded | Failed
------------+-----------+-----------+-------
sequential  |      0.97 |         3 |      0
concurrent  |      0.38 |         3 |      0
Speedup: 2.52x
```

With faults injected (`--timeout 1.0` is the default):

```text
$ python main.py --offline --inject-failure
[sequential] finished in 2.21s
  SENS-TEMP-01  ok                                   379.0 ms
  SENS-PRES-02  ok                                   296.1 ms
  SENS-VIB-03   ok                                   367.8 ms
  SENS-HUM-04   http_error (HTTP 404)                132.4 ms
  SENS-TRQ-05   timeout (no response within 1.0s)   1030.2 ms
[concurrent] finished in 1.03s
  SENS-TEMP-01  ok                                   315.9 ms
  SENS-PRES-02  ok                                   273.1 ms
  SENS-VIB-03   ok                                   371.3 ms
  SENS-HUM-04   http_error (HTTP 404)                118.5 ms
  SENS-TRQ-05   timeout (no response within 1.0s)   1025.7 ms

Approach    | Total (s) | Succeeded | Failed
------------+-----------+-----------+-------
sequential  |      2.21 |         3 |      2
concurrent  |      1.03 |         3 |      2
Speedup: 2.15x
```

The timeout now dominates both runs: the concurrent total is bounded below by the timeout, $T_{\text{conc}} \ge \min(\max_i d_i,\ t_{\text{timeout}}) = 1.0$ s. Choosing timeouts carefully matters as much as running requests concurrently.

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| single sensor ok | `/posts/1`, delay 0.2 s, timeout 1.0 s | `status == "ok"`, `data` is the JSON body, `error is None` |
| 404 sensor | `/posts/999999` | `status == "http_error"`, `error == "HTTP 404"` |
| timeout | `/slow` (5 s) with `timeout=0.1` | `status == "timeout"` |
| order preserved | delays 0.30 / 0.05 / 0.15 | results in **input** order, not completion order |
| concurrency pays off | three 0.2 s sensors | sequential $\ge 0.55$ s, concurrent $< 0.35$ s |
| partial failure | 3 healthy + 2 faulty sensors | 3 `ok`, 1 `http_error`, 1 `timeout`, nothing raised |
| unexpected exception | transport raises `httpx.ConnectError` | `gather(return_exceptions=True)` captures it, row has `status == "error"` |

```python
# tests/test_fetcher.py -- run with: pytest -q   (pytest-asyncio, no network needed)
import sys
import time
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fetcher import fetch_concurrent, fetch_sensor, fetch_sequential  # noqa: E402
from mock_transport import build_mock_transport  # noqa: E402
from sensors import BASE_URL, FAULTY_SENSORS, SENSORS, SensorSpec  # noqa: E402

FAST = {"/posts/1": 0.2, "/todos/1": 0.2, "/users/1": 0.2, "/posts/999999": 0.05, "/slow": 5.0}


def client(timeout: float = 1.0, delays: dict[str, float] | None = None) -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BASE_URL, timeout=timeout, transport=build_mock_transport(delays or FAST))


@pytest.mark.asyncio
async def test_fetch_sensor_ok() -> None:
    async with client() as c:
        result = await fetch_sensor(c, "SENS-TEMP-01", "/posts/1")
    assert result["status"] == "ok"
    assert result["data"] == {"id": 1, "path": "/posts/1"}
    assert result["error"] is None


@pytest.mark.asyncio
async def test_fetch_sensor_404_is_http_error() -> None:
    async with client() as c:
        result = await fetch_sensor(c, "SENS-HUM-04", "/posts/999999")
    assert result["status"] == "http_error"
    assert result["error"] == "HTTP 404"


@pytest.mark.asyncio
async def test_fetch_sensor_timeout() -> None:
    async with client(timeout=0.1) as c:
        result = await fetch_sensor(c, "SENS-TRQ-05", "/slow")
    assert result["status"] == "timeout"


@pytest.mark.asyncio
async def test_concurrent_preserves_input_order() -> None:
    delays = {"/posts/1": 0.3, "/todos/1": 0.05, "/users/1": 0.15}
    async with client(delays=delays) as c:
        results = await fetch_concurrent(c, SENSORS)
    assert [r["sensor_id"] for r in results] == [s.sensor_id for s in SENSORS]


@pytest.mark.asyncio
async def test_concurrent_is_faster_than_sequential() -> None:
    async with client() as c:
        t0 = time.perf_counter()
        await fetch_sequential(c, SENSORS)
        t_seq = time.perf_counter() - t0
        t0 = time.perf_counter()
        await fetch_concurrent(c, SENSORS)
        t_conc = time.perf_counter() - t0
    assert t_seq >= 0.6 - 0.05      # 3 x 0.2 s
    assert t_conc < 0.2 + 0.15      # about one delay, plus scheduling slack


@pytest.mark.asyncio
async def test_one_failure_does_not_sink_the_others() -> None:
    async with client(timeout=0.5) as c:
        results = await fetch_concurrent(c, SENSORS + FAULTY_SENSORS)
    statuses = {r["sensor_id"]: r["status"] for r in results}
    assert statuses == {
        "SENS-TEMP-01": "ok", "SENS-PRES-02": "ok", "SENS-VIB-03": "ok",
        "SENS-HUM-04": "http_error", "SENS-TRQ-05": "timeout",
    }


@pytest.mark.asyncio
async def test_unexpected_exception_is_captured_by_gather() -> None:
    def explode(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("factory network down", request=request)

    bad = httpx.AsyncClient(base_url=BASE_URL, transport=httpx.MockTransport(explode))
    async with bad as c:
        results = await fetch_concurrent(c, [SensorSpec("SENS-X", "x", "/posts/1")])
    assert results[0]["status"] == "error"
    assert "ConnectError" in (results[0]["error"] or "")
```

### Practice & Self-Check

**Q1 (predict the output).** With the default delays $d = (0.30, 0.25, 0.35)$ s and no faults, what are the *ideal* sequential time, concurrent time, and speedup? Why is the measured speedup (`2.52x`) not `3.00x`?

**Q2 (predict the output).** You delete `return_exceptions=True` from `fetch_concurrent`, and the transport raises `httpx.ConnectError` for `SENS-PRES-02` only. What does `python main.py` print for the concurrent run?

**Q3 (predict the output).** A teammate "simplifies" the mock handler by replacing `await asyncio.sleep(delay)` with `time.sleep(delay)`. What does the `[concurrent] finished in ...` line now report for the default delays?

**Exercise 1 (Easy).** Add retries to `fetch_sensor` using the exponential backoff pattern from Chapter 3. Retry `TimeoutException` and status codes $\ge 500$ up to `max_retries=3` times, sleeping $2^{k}$ s before retry $k$. Never retry a 4xx.

**Exercise 2 (Medium).** Add `--max-in-flight N`, which caps concurrency with an `asyncio.Semaphore`, and write a `fetch_taskgroup` variant using `asyncio.TaskGroup`. Predict the concurrent time for the default delays with `N = 2`.

#### Dry-Run: Answers

**A1.** Ideal sequential time is $\sum_i d_i = 0.90$ s. Ideal concurrent time is $\max_i d_i = 0.35$ s. The ideal speedup is $0.90 / 0.35 \approx 2.57$, not 3, because the three delays are unequal. The speedup equals $n$ only when every request takes the same time. The measured `2.52x` is a little lower again because of per-request overhead (building the request, JSON decoding, and event-loop scheduling), which adds a few milliseconds to each call.

**A2.** The sequential run still works, because its `try/except Exception` catches the error. In the concurrent run, `gather` re-raises the first exception at the `await`, so `fetch_concurrent` never returns. `main()` crashes with a `ConnectError` traceback, and the comparison table never prints. The other two fetches keep running in the background, but their results are lost. This is exactly the failure that `return_exceptions=True` prevents.

**A3.** About `0.90s`, the same as sequential. `time.sleep` blocks the whole thread, so the event loop cannot switch to the other coroutines while one handler sleeps. The three "concurrent" requests run back to back. Concurrency in asyncio only happens at `await` points that actually yield.

**Exercise 1 sketch.**

```python
async def fetch_with_retry(client: httpx.AsyncClient, sensor_id: str, url: str, max_retries: int = 3) -> SensorResult:
    for attempt in range(max_retries):
        result = await fetch_sensor(client, sensor_id, url)
        retryable = result["status"] == "timeout" or (
            result["status"] == "http_error" and (result["error"] or "").startswith("HTTP 5")
        )
        if not retryable or attempt == max_retries - 1:
            return result
        await asyncio.sleep(2 ** attempt)
    raise AssertionError("unreachable")
```

**Exercise 2 sketch and prediction.** Wrap each fetch with `async with sem:`, where `sem = asyncio.Semaphore(n)`. For `TaskGroup`, `fetch_sensor` already converts expected errors into results, so a single `ConnectError` would still cancel every sibling. Wrap the call in `try/except Exception` inside the task to keep per-source isolation. With $N = 2$: TEMP (0.30) and PRES (0.25) start at $t = 0$. PRES finishes at $0.25$ and frees a slot, so VIB (0.35) starts and finishes at $0.25 + 0.35 = 0.60$ s. The total is therefore about $0.60$ s, between the unlimited $0.35$ s and the sequential $0.90$ s.

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

