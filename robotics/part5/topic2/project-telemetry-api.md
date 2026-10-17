# Part 5, Topic 2: FastAPI Development
## Project 1: Telemetry API

Build a high-performance async API that exposes machine telemetry data. The API supports creating and querying sensor readings, uses dependency-injected mock storage, and provides full OpenAPI documentation.

### Goal
Prove you can build a production-quality FastAPI application with Pydantic models, dependency injection, async endpoints, and proper error handling.

### Requirements

#### 1. Project Setup
- Create a directory `telemetry-api` with `pyproject.toml`.
- Use `uv` or `poetry` to manage dependencies.
- Install `fastapi`, `uvicorn`, `httpx`, and `pytest` + `httpx` test client.
- All functions must have complete type annotations.

#### 2. Pydantic Models
Create a `schemas.py` with request/response models:

```python
from pydantic import BaseModel, Field
from datetime import datetime

class SensorCreate(BaseModel):
    sensor_id: str = Field(..., min_length=1, max_length=50)
    name: str
    location: str
    unit: str

class ReadingCreate(BaseModel):
    sensor_id: str
    value: float = Field(..., ge=-1000, le=1000)
    timestamp: datetime | None = None

class ReadingResponse(BaseModel):
    id: int
    sensor_id: str
    value: float
    timestamp: datetime

class SensorResponse(BaseModel):
    sensor_id: str
    name: str
    location: str
    unit: str
    reading_count: int
```

#### 3. In-Memory Storage with Dependency Injection
Create a `database.py` with a mock in-memory store injected via `Depends()`:

```python
class TelemetryStore:
    def __init__(self) -> None:
        self.sensors: dict[str, dict] = {}
        self.readings: list[dict] = []
        self._next_id: int = 1

    def add_sensor(self, sensor: dict) -> dict:
        self.sensors[sensor["sensor_id"]] = sensor
        return sensor

    def add_reading(self, reading: dict) -> dict:
        reading["id"] = self._next_id
        self._next_id += 1
        self.readings.append(reading)
        return reading

    def get_readings(self, sensor_id: str | None = None) -> list[dict]:
        if sensor_id:
            return [r for r in self.readings if r["sensor_id"] == sensor_id]
        return self.readings
```

#### 4. API Endpoints
Write endpoints in `main.py`:

- `POST /sensors` — create a sensor, return 201 with `SensorResponse`
- `GET /sensors` — list all sensors
- `GET /sensors/{sensor_id}` — get sensor details with reading count
- `POST /readings` — record a reading, auto-set timestamp if missing
- `GET /readings` — list readings, filter by optional `sensor_id` query param
- `GET /health` — return `{"status": "ok"}`

#### 5. Error Handling
- Return 404 with `{"detail": "Sensor not found"}` for unknown sensor IDs
- Return 422 with validation errors for malformed requests
- Use `logging` for all server-side output
- Use `app.exception_handler` for a global error response format

#### 6. Async Endpoints
All database operations must be async-compatible (wrap synchronous calls with `asyncio.to_thread` if needed). The API must handle 100+ concurrent requests without blocking.

### Evaluation Checklist
- [ ] FastAPI app runs with `uvicorn` and serves on a port
- [ ] All 6 endpoints respond correctly
- [ ] Pydantic models enforce validation (reject bad input)
- [ ] `POST /sensors` returns 201, `POST /readings` returns 201
- [ ] `GET /sensors/{id}` returns 404 for unknown sensors
- [ ] `GET /readings?sensor_id=X` filters correctly
- [ ] Dependency-injected `TelemetryStore` is used for all data
- [ ] `app.dependency_overrides` is used in tests to inject mock data
- [ ] Auto-generated `/docs` shows all endpoints with schemas
- [ ] `logging` is used, not `print`
- [ ] Tests use `TestClient` and cover all endpoints

### Starter Code Skeleton

`schemas.py` is exactly the file given in Requirement 2. `database.py` extends the Requirement 3 store with a lock, two lookup helpers, and the `get_store` provider that every endpoint receives through `Depends()`. In the tests, that provider is the single seam where `app.dependency_overrides` swaps in a fresh store.

```text
telemetry-api/
├── pyproject.toml
├── schemas.py        # Requirement 2, unchanged
├── database.py       # TelemetryStore + get_store() dependency
├── errors.py         # register_error_handlers(app): one global error format
├── main.py           # FastAPI app + the 6 endpoints
└── tests/
    └── test_api.py   # TestClient + dependency_overrides
```

```toml
# pyproject.toml
[project]
name = "telemetry-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["fastapi>=0.110", "uvicorn[standard]>=0.29"]

[dependency-groups]
dev = ["pytest>=8.0", "httpx>=0.27"]
```

```python
# database.py
import threading
from typing import Any


class TelemetryStore:
    def __init__(self) -> None:
        self.sensors: dict[str, dict[str, Any]] = {}
        self.readings: list[dict[str, Any]] = []
        self._next_id: int = 1
        self._lock = threading.Lock()  # calls arrive from asyncio.to_thread worker threads

    def add_sensor(self, sensor: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self.sensors[sensor["sensor_id"]] = sensor
            return sensor

    def get_sensor(self, sensor_id: str) -> dict[str, Any] | None:
        return self.sensors.get(sensor_id)

    def reading_count(self, sensor_id: str) -> int:
        return sum(1 for r in self.readings if r["sensor_id"] == sensor_id)

    def add_reading(self, reading: dict[str, Any]) -> dict[str, Any]:
        with self._lock:  # read-modify-write of _next_id must be atomic
            reading["id"] = self._next_id
            self._next_id += 1
            self.readings.append(reading)
            return reading

    def get_readings(self, sensor_id: str | None = None) -> list[dict[str, Any]]:
        if sensor_id:
            return [r for r in self.readings if r["sensor_id"] == sensor_id]
        return self.readings


_store = TelemetryStore()  # ONE process-wide instance


def get_store() -> TelemetryStore:
    """The dependency every endpoint declares. Tests replace it via app.dependency_overrides."""
    return _store
```

```python
# errors.py
import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("telemetry.errors")


def error_body(request: Request, code: int, detail: object) -> dict[str, object]:
    """Every error response has the same shape: detail + status + path."""
    return {"detail": detail, "status": code, "path": request.url.path}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # TODO(milestone 4): logger.warning(...) then JSONResponse(error_body(...), status_code=exc.status_code)
        raise NotImplementedError

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # TODO(milestone 4): 422 with detail=jsonable_encoder(exc.errors())
        raise NotImplementedError

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception) -> JSONResponse:
        # TODO(milestone 4): logger.exception(...) and a generic 500 that leaks no internals
        raise NotImplementedError
```

```python
# main.py
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, status

from database import TelemetryStore, get_store
from errors import register_error_handlers
from schemas import ReadingCreate, ReadingResponse, SensorCreate, SensorResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("telemetry.api")

app = FastAPI(title="Telemetry API", version="0.1.0")
register_error_handlers(app)


def to_sensor_response(store: TelemetryStore, sensor: dict[str, Any]) -> SensorResponse:
    return SensorResponse(**sensor, reading_count=store.reading_count(sensor["sensor_id"]))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sensors", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
async def create_sensor(body: SensorCreate, store: TelemetryStore = Depends(get_store)) -> SensorResponse:
    # TODO(milestone 2): 409 if it already exists; else await asyncio.to_thread(store.add_sensor, body.model_dump())
    raise NotImplementedError


@app.get("/sensors", response_model=list[SensorResponse])
async def list_sensors(store: TelemetryStore = Depends(get_store)) -> list[SensorResponse]:
    # TODO(milestone 2)
    raise NotImplementedError


@app.get("/sensors/{sensor_id}", response_model=SensorResponse)
async def get_sensor(sensor_id: str, store: TelemetryStore = Depends(get_store)) -> SensorResponse:
    # TODO(milestone 2): raise HTTPException(status_code=404, detail="Sensor not found")
    raise NotImplementedError


@app.post("/readings", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
async def create_reading(body: ReadingCreate, store: TelemetryStore = Depends(get_store)) -> ReadingResponse:
    # TODO(milestone 3): 404 for unknown sensor; timestamp = body.timestamp or datetime.now(timezone.utc)
    raise NotImplementedError


@app.get("/readings", response_model=list[ReadingResponse])
async def list_readings(
    sensor_id: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    store: TelemetryStore = Depends(get_store),
) -> list[ReadingResponse]:
    # TODO(milestone 3): rows = await asyncio.to_thread(store.get_readings, sensor_id); return newest `limit`
    raise NotImplementedError
```

### Step-by-Step Milestones

1. **Skeleton boots.** Create the project, install the dependencies, and add `schemas.py`, `database.py`, and the `/health` route.
   *Done when:* `uvicorn main:app --reload` is running and `curl http://127.0.0.1:8000/health` returns `{"status":"ok"}`.
2. **Sensor endpoints.** Implement `POST /sensors`, `GET /sensors`, and `GET /sensors/{sensor_id}` on the injected store.
   *Done when:* `curl -X POST localhost:8000/sensors -H "Content-Type: application/json" -d '{"sensor_id":"temp-01","name":"Spindle temp","location":"Cell A","unit":"C"}' -i` shows `HTTP/1.1 201 Created`, and a second identical call returns `409`.
3. **Reading endpoints.** Implement `POST /readings`, with an automatic UTC timestamp, and `GET /readings` with the `sensor_id` filter and the `limit` query parameter.
   *Done when:* after posting one reading, `curl "localhost:8000/sensors/temp-01"` shows `"reading_count":1`.
4. **Global error format.** Implement the three handlers in `errors.py`.
   *Done when:* `curl localhost:8000/sensors/nope` returns `{"detail":"Sensor not found","status":404,"path":"/sensors/nope"}`, and the server log shows a `WARNING telemetry.errors` line instead of a `print`.
5. **Async and concurrency safety.** Route the store mutations through `asyncio.to_thread` and keep the `threading.Lock` in `add_reading`.
   *Done when:* the `test_100_concurrent_readings_get_unique_ids` test passes, with ids exactly $\{1, \dots, 100\}$ and no duplicates.
6. **Tests and docs.** Write `tests/test_api.py` using `app.dependency_overrides[get_store]`.
   *Done when:* `pytest -q` reports `11 passed`, and `http://127.0.0.1:8000/docs` lists all six endpoints with their request and response schemas.

### Sample Expected Output

The sample input is the session below, run against a fresh server. JSON bodies are shown on one line, as `curl` prints them.

```text
$ curl -s -X POST localhost:8000/sensors -H "Content-Type: application/json" \
    -d '{"sensor_id":"temp-01","name":"Spindle temp","location":"Cell A","unit":"C"}'
{"sensor_id":"temp-01","name":"Spindle temp","location":"Cell A","unit":"C","reading_count":0}        # 201

$ curl -s -X POST localhost:8000/readings -H "Content-Type: application/json" \
    -d '{"sensor_id":"temp-01","value":71.5,"timestamp":"2026-03-01T08:00:00Z"}'
{"id":1,"sensor_id":"temp-01","value":71.5,"timestamp":"2026-03-01T08:00:00Z"}                        # 201

$ curl -s -X POST localhost:8000/readings -H "Content-Type: application/json" \
    -d '{"sensor_id":"temp-01","value":1500}'
{"detail":[{"type":"less_than_equal","loc":["body","value"],"msg":"Input should be less than or equal to 1000","input":1500,"ctx":{"le":1000.0}}],"status":422,"path":"/readings"}

$ curl -s -X POST localhost:8000/readings -H "Content-Type: application/json" -d '{"sensor_id":"temp-01"}'
{"detail":[{"type":"missing","loc":["body","value"],"msg":"Field required","input":{"sensor_id":"temp-01"}}],"status":422,"path":"/readings"}

$ curl -s localhost:8000/sensors/temp-99
{"detail":"Sensor not found","status":404,"path":"/sensors/temp-99"}

$ curl -s localhost:8000/sensors/temp-01
{"sensor_id":"temp-01","name":"Spindle temp","location":"Cell A","unit":"C","reading_count":1}

$ curl -s "localhost:8000/readings?sensor_id=temp-01"
[{"id":1,"sensor_id":"temp-01","value":71.5,"timestamp":"2026-03-01T08:00:00Z"}]
```

Matching server log (uvicorn access lines omitted):

```text
2026-03-01 08:00:00,717 INFO telemetry.api: created sensor temp-01
2026-03-01 08:00:00,765 INFO telemetry.api: reading #1 for temp-01 = 71.50
2026-03-01 08:00:00,814 WARNING telemetry.errors: POST /readings -> 422 (1 errors)
2026-03-01 08:00:00,820 WARNING telemetry.errors: POST /readings -> 422 (1 errors)
2026-03-01 08:00:00,827 WARNING telemetry.errors: GET /sensors/temp-99 -> 404 Sensor not found
```

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| health | `GET /health` | `200`, `{"status": "ok"}` |
| create sensor | valid `SensorCreate` | `201`, body echoes the fields plus `reading_count: 0` |
| duplicate sensor | the same `POST /sensors` twice | second call returns `409` |
| unknown sensor | `GET /sensors/nope` | `404`, global format `{"detail", "status", "path"}` |
| auto timestamp | reading without `timestamp` | `201`, `id == 1`, `timestamp` filled in, `reading_count` becomes 1 |
| out of range (both sides) | `value = -1000.1` and `1000.1` | `422`, `loc == ["body", "value"]` |
| reading for unknown sensor | `sensor_id = "ghost"` | `404` |
| filter | 3 readings across 2 sensors, `?sensor_id=temp-01` | only `temp-01` values `[1.0, 3.0]` |
| override isolation | store seeded with `"seeded"` via override | `GET /sensors` returns only `seeded` |
| concurrency | 100 parallel `POST /readings` | 100 unique ids $1..100$ |

```python
# tests/test_api.py -- run with: pytest -q
import asyncio
import sys
from collections.abc import Iterator
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import TelemetryStore, get_store  # noqa: E402
from main import app  # noqa: E402

TEMP = {"sensor_id": "temp-01", "name": "Spindle temp", "location": "Cell A", "unit": "C"}


@pytest.fixture
def store() -> Iterator[TelemetryStore]:
    fresh = TelemetryStore()
    app.dependency_overrides[get_store] = lambda: fresh
    yield fresh
    app.dependency_overrides.clear()


@pytest.fixture
def client(store: TelemetryStore) -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_create_sensor_returns_201_with_zero_readings(client: TestClient) -> None:
    r = client.post("/sensors", json=TEMP)
    assert r.status_code == 201
    assert r.json() == {**TEMP, "reading_count": 0}


def test_duplicate_sensor_is_409(client: TestClient) -> None:
    client.post("/sensors", json=TEMP)
    assert client.post("/sensors", json=TEMP).status_code == 409


def test_unknown_sensor_is_404_in_global_format(client: TestClient) -> None:
    r = client.get("/sensors/nope")
    assert r.status_code == 404
    assert r.json() == {"detail": "Sensor not found", "status": 404, "path": "/sensors/nope"}


def test_reading_gets_timestamp_and_increments_count(client: TestClient) -> None:
    client.post("/sensors", json=TEMP)
    r = client.post("/readings", json={"sensor_id": "temp-01", "value": 71.5})
    assert r.status_code == 201
    body = r.json()
    assert body["id"] == 1 and body["timestamp"]
    assert client.get("/sensors/temp-01").json()["reading_count"] == 1


@pytest.mark.parametrize("value", [-1000.1, 1000.1])
def test_out_of_range_value_is_422(client: TestClient, value: float) -> None:
    client.post("/sensors", json=TEMP)
    r = client.post("/readings", json={"sensor_id": "temp-01", "value": value})
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"] == ["body", "value"]


def test_reading_for_unknown_sensor_is_404(client: TestClient) -> None:
    r = client.post("/readings", json={"sensor_id": "ghost", "value": 1.0})
    assert r.status_code == 404


def test_filter_readings_by_sensor(client: TestClient, store: TelemetryStore) -> None:
    store.add_sensor({**TEMP})
    store.add_sensor({**TEMP, "sensor_id": "pres-01", "unit": "kPa"})
    for sid, v in [("temp-01", 1.0), ("pres-01", 2.0), ("temp-01", 3.0)]:
        client.post("/readings", json={"sensor_id": sid, "value": v})
    values = [r["value"] for r in client.get("/readings", params={"sensor_id": "temp-01"}).json()]
    assert values == [1.0, 3.0]


def test_dependency_override_is_isolated(client: TestClient, store: TelemetryStore) -> None:
    store.add_sensor({**TEMP, "sensor_id": "seeded"})
    assert [s["sensor_id"] for s in client.get("/sensors").json()] == ["seeded"]


def test_100_concurrent_readings_get_unique_ids(store: TelemetryStore) -> None:
    store.add_sensor({**TEMP})

    async def burst() -> list[int]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            responses = await asyncio.gather(
                *(ac.post("/readings", json={"sensor_id": "temp-01", "value": float(i)}) for i in range(100))
            )
        return [r.json()["id"] for r in responses]

    ids = asyncio.run(burst())
    assert sorted(ids) == list(range(1, 101))
```

### Practice & Self-Check

**Q1 (predict the output).** With `temp-01` registered, what status and body does `POST /readings` return for `{"sensor_id": "temp-01", "value": "1000"}`? Note that the value is a string.

**Q2 (predict the output).** A teammate rewrites the provider as `def get_store() -> TelemetryStore: return TelemetryStore()`. You `POST /sensors` for `temp-01` (and get `201`), then immediately call `GET /sensors/temp-01`. What comes back, and why?

**Q3 (predict the output).** What does `GET /readings?limit=0` return?

**Exercise 1 (Easy).** Add `GET /sensors/{sensor_id}/stats`, returning `count`, `min`, `max`, `mean` $\bar{x} = \frac{1}{n}\sum x_i$, and the population standard deviation $\sigma = \sqrt{\frac{1}{n}\sum (x_i - \bar{x})^2}$. Return `404` for unknown sensors, and `count: 0` with `null` statistics when there are no readings.

**Exercise 2 (Medium).** Protect both `POST` endpoints with a `verify_api_key` dependency that reads an `X-API-Key` header (Chapter 2, "Header and Query Dependencies") and returns `403` on a mismatch. Make the expected key itself a dependency (`get_settings`) so the tests can override it without touching the environment.

#### Dry-Run: Answers

**A1.** `201` with `{"id": 1, "sensor_id": "temp-01", "value": 1000.0, "timestamp": "..."}`. Pydantic's lax mode converts the JSON string `"1000"` to `float`, and `le=1000` is inclusive, so the value passes. The `timestamp` is the server's current UTC time, because none was sent.

**A2.** `404 {"detail": "Sensor not found", ...}`. FastAPI calls `get_store()` once **per request**, so the `POST` wrote into a store that was thrown away as soon as the response was sent, and the `GET` received a brand-new, empty store. State that must outlive a request belongs in a module-level instance (as here), in `lifespan` startup, or in a real database. The provider should only hand that state out.

**A3.** `422` with `{"detail": [{"type": "greater_than_equal", "loc": ["query", "limit"], "msg": "Input should be greater than or equal to 1", "input": "0", "ctx": {"ge": 1}}], "status": 422, "path": "/readings"}`. `Query(100, ge=1, le=1000)` validates query parameters exactly as `Field` validates body fields. The `input` is the string `"0"` because every query parameter arrives as text.

**Exercise 1 sketch.**

```python
import statistics

@app.get("/sensors/{sensor_id}/stats")
async def sensor_stats(sensor_id: str, store: TelemetryStore = Depends(get_store)) -> dict[str, float | int | None]:
    if store.get_sensor(sensor_id) is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    values = [r["value"] for r in store.get_readings(sensor_id)]
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None, "std": None}
    return {"count": len(values), "min": min(values), "max": max(values),
            "mean": statistics.fmean(values), "std": statistics.pstdev(values)}
```

**Exercise 2 sketch.** Define `def get_settings() -> dict[str, str]: return {"api_key": os.environ.get("TELEMETRY_API_KEY", "dev-key")}` and `def verify_api_key(x_api_key: str = Header(...), settings: dict[str, str] = Depends(get_settings)) -> None`, which raises `HTTPException(403, "Invalid API key")` on a mismatch. Add `dependencies=[Depends(verify_api_key)]` to the two `@app.post(...)` decorators. In the tests, set `app.dependency_overrides[get_settings] = lambda: {"api_key": "test"}` and send `headers={"X-API-Key": "test"}`. A missing header yields `422` (because `Header(...)` is required), not `403`. Add a test that pins this behavior down.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Telemetry API**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project telemetry api**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

