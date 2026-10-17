# Part 1, Topic 2: FastAPI Development
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

