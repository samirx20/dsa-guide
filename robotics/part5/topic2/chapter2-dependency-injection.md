# Part 1, Topic 2: FastAPI Development
## Chapter 2: Dependency Injection

**Prerequisite Knowledge:** Basic understanding of FastAPI endpoints and Python functions.

---

### The 'Toolbelt' Analogy
Imagine a mechanic who shows up to work without bringing their own tools. When they need a wrench to fix a car, they don't leave the garage, drive to the hardware store, buy a wrench, and bring it back. Instead, they just hold out their hand, and the garage supervisor (FastAPI) instantly places a wrench in it. 

"Dependency Injection" is exactly this. When your API endpoint (the mechanic) needs something to do its job — like a database connection, user authentication, or a configuration file — you simply list it in the function arguments. FastAPI (the supervisor) automatically builds it, hands it to your function, and cleans it up when the function is done. 

```
┌────────── DEPENDENCY INJECTION FLOW ──────────────────┐
│                                                        │
│  Client Request                                        │
│       │                                                │
│       ▼                                                │
│  ┌─────────────┐                                       │
│  │ Endpoint    │  def get_data(db = Depends(get_db)):  │
│  │             │                                       │
│  │ Needs: db   │◄──── FastAPI calls get_db()           │
│  └──────┬──────┘      and passes result as 'db'       │
│         │                                              │
│         ▼                                              │
│  ┌─────────────┐    ┌──────────────┐                  │
│  │ get_db()    │───▶│ Setup: open  │  Code before yield│
│  │             │    │ connection   │                   │
│  │             │    │    ...       │                   │
│  │             │    │ Teardown:    │  Code after yield │
│  │             │    │ close conn   │                   │
│  └─────────────┘    └──────────────┘                  │
│                                                        │
│  FastAPI manages the entire lifecycle automatically    │
└────────────────────────────────────────────────────────┘
```

Dependency injection (DI) lets you decouple your endpoint logic from external resources like databases, authentication services, and configuration. FastAPI's `Depends()` system makes this clean and testable. Instead of creating connections inside your endpoints, you declare what you need, and FastAPI provides it.

---

### 1. The `Depends()` Function

`Depends()` tells FastAPI to call a function and inject its return value into your endpoint.

```python
from fastapi import FastAPI, Depends

app = FastAPI()

# 1. We create a "provider" function
def get_config() -> dict:
    return {"debug": True, "database_url": "sqlite:///data.db"}

# 2. We inject it into our endpoint
@app.get("/status")
def status(config: dict = Depends(get_config)) -> dict:
    # Now `config` has whatever get_config() returned!
    return {"config": config}

async def main() -> None:
    from asgiref.sync import sync_to_async
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**What's happening:**
```python
def get_config() -> dict:
#   ^^^^^^^^^^
#   Provider function: creates and returns the dependency
#   Called automatically by FastAPI on each request
    return {"debug": True, "database_url": "sqlite:///data.db"}

@app.get("/status")
def status(config: dict = Depends(get_config)) -> dict:
#                 ^^^^  ^^^^^^^^^^^^^^^^^^^^^^
#                 |     └── Depends(get_config) wraps the provider
#                 |         FastAPI calls get_config() and passes result here
#                 └── Type hint: the return type of get_config()
#                     Used for type checking and documentation
    return {"config": config}
#           ^^^^^^^^^^^^^^
#           config is the return value of get_config()
#           Client sees: { "config": { "debug": true, ... } }
```

FastAPI calls `get_config()` on every request and passes the result to `status()`. The endpoint never knows where config comes from.

```python
# Without dependency injection (bad)
@app.get("/status")
def status() -> dict:
    config = {"debug": True, "database_url": "sqlite:///data.db"}  # Hardcoded!
    return {"config": config}

# With dependency injection (good)
@app.get("/status")
def status(config: dict = Depends(get_config)) -> dict:
    return {"config": config}
    # Config comes from get_config()
    # Easy to swap for tests: override get_config with a mock
```

### 2. Database Session Injection

The most common pattern: inject a database session that is created per-request and closed after the response.

```python
from fastapi import FastAPI, Depends
from typing import Generator

app = FastAPI()

# A fake database class
class FakeSession:
    def __init__(self) -> None:
        self.data: list[dict] = []

    def query(self, table: str) -> list[dict]:
        return self.data

    def add(self, table: str, record: dict) -> None:
        self.data.append(record)

    def commit(self) -> None:
        pass

# The provider function that yields the database connection
def get_db() -> Generator[FakeSession, None, None]:
    db = FakeSession()
    try:
        # yield hands the database over to the endpoint
        yield db
    finally:
        # this code runs AFTER the endpoint finishes its work
        db.close() if hasattr(db, "close") else None

@app.get("/readings")
def list_readings(db: FakeSession = Depends(get_db)) -> list[dict]:
    # We use our injected database session
    return db.query("readings")

@app.post("/readings")
def create_reading(data: dict, db: FakeSession = Depends(get_db)) -> dict:
    # The same database session provider works here too
    db.add("readings", data)
    db.commit()
    return {"status": "created"}
```

**What's happening:**
```python
def get_db() -> Generator[FakeSession, None, None]:
#          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#          Returns a Generator (because of 'yield')
#          Type hints: (yield_type, send_type, return_type)

    db = FakeSession()          # SETUP: Create the session
    try:
        yield db                # HANDOFF: Give session to endpoint
                                # Endpoint runs here
    finally:
        db.close()              # TEARDOWN: Always runs, even if endpoint crashes

# FastAPI's lifecycle:
# 1. Request arrives
# 2. FastAPI calls get_db()
# 3. Code before 'yield' runs (setup)
# 4. db is passed to the endpoint
# 5. Endpoint runs
# 6. Code after 'yield' runs (teardown)
# 7. Response is sent to client
```

The `yield` keyword makes this a generator dependency. FastAPI runs the code before `yield` to set up, and the code after `yield` runs in the `finally` block for cleanup.

### 3. Yield Dependencies (Setup/Teardown)

Yield dependencies are perfect for resources that need cleanup: database connections, file handles, network sessions.

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

# This runs once when the whole app starts up and shuts down
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up: connect to database")
    yield
    print("Shutting down: close database connections")

app = FastAPI(lifespan=lifespan)
```

**What's happening:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up: connect to database")  # Runs ONCE at startup
    yield                                      # App runs here
    print("Shutting down: close database connections")  # Runs ONCE at shutdown

app = FastAPI(lifespan=lifespan)
#                          ^^^^^^^^^^
#                          Pass lifespan to FastAPI
#                          Startup/shutdown logic lives here

# This is different from yield dependencies:
# lifespan: runs ONCE for the entire app lifetime
# get_db(): runs ONCE PER REQUEST
```

**Per-request yield dependency:**

```python
from fastapi import FastAPI, Depends
from collections.abc import Generator

app = FastAPI()

def get_database_connection() -> Generator[dict, None, None]:
    # SETUP
    print("Opening database connection")
    connection = {"host": "localhost", "port": 5432, "connected": True}
    
    try:
        # HANDOFF
        yield connection
    finally:
        # TEARDOWN
        connection["connected"] = False
        print("Closing database connection")

@app.get("/health")
def health_check(conn: dict = Depends(get_database_connection)) -> dict:
    return {"connected": conn["connected"]}
```

**What's happening:**
```python
def get_database_connection() -> Generator[dict, None, None]:
    print("Opening database connection")   # Runs BEFORE endpoint
    connection = {"host": "localhost", ...}

    try:
        yield connection                    # Runs endpoint
    finally:
        print("Closing database connection")  # Runs AFTER endpoint (always)

# Timeline per request:
# 1. "Opening database connection"  ← setup
# 2. health_check(conn) runs        ← endpoint
# 3. "Closing database connection"  ← teardown
#
# If endpoint crashes: teardown STILL runs (finally block)
# If endpoint raises exception: teardown STILL runs
# This ensures connections are always cleaned up
```

### 4. Overriding Dependencies for Testing

`app.dependency_overrides` lets you replace any dependency with a mock during tests. No monkey-patching required.

```python
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

app = FastAPI()

def get_settings() -> dict:
    return {"env": "production", "debug": False}

@app.get("/settings")
def read_settings(settings: dict = Depends(get_settings)) -> dict:
    return settings

# Setup a test client
client = TestClient(app)

def test_settings_default() -> None:
    response = client.get("/settings")
    assert response.status_code == 200
    assert response.json()["env"] == "production"

def test_settings_override() -> None:
    # 1. Create a fake version of our settings function
    def mock_settings() -> dict:
        return {"env": "test", "debug": True}

    # 2. Tell FastAPI to use the fake one instead
    app.dependency_overrides[get_settings] = mock_settings
    
    # 3. Run the test
    response = client.get("/settings")
    assert response.json()["env"] == "test"
    
    # 4. Clean up
    app.dependency_overrides.clear()
```

**What's happening:**
```python
app.dependency_overrides[get_settings] = mock_settings
#                                       ^^^^^^^^^^^^^^
#                                       Replace get_settings with mock_settings
#                                       All endpoints using Depends(get_settings)
#                                       now get mock_settings instead

# Why this is powerful:
# - No need to modify endpoint code
# - No need for environment variables
# - No need for config files
# - Just swap the dependency for tests

# The override applies to ALL endpoints that depend on get_settings:
@app.get("/settings")
def read_settings(settings: dict = Depends(get_settings)) -> dict:
    return settings  # Uses mock_settings in tests

@app.get("/config")
def read_config(settings: dict = Depends(get_settings)) -> dict:
    return {"debug": settings["debug"]}  # Also uses mock_settings in tests

# Clean up after tests:
app.dependency_overrides.clear()
# Removes ALL overrides, restoring original behavior
```

```python
# Testing with database override
from fastapi.testclient import TestClient

def get_test_db():
    """Fake database that returns test data."""
    db = FakeSession()
    db.add("readings", {"sensor_id": "test-01", "value": 23.5})
    return db

def test_list_readings():
    # Override the real database with our test database
    app.dependency_overrides[get_db] = get_test_db
    
    client = TestClient(app)
    response = client.get("/readings")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    
    app.dependency_overrides.clear()
```

### 5. Header and Query Dependencies

Dependencies can extract and validate data from headers, query parameters, or cookies.

```python
from fastapi import FastAPI, Depends, Header, HTTPException

app = FastAPI()

# This dependency specifically looks for an HTTP Header
def verify_api_key(x_api_key: str = Header(...)) -> str:
    valid_keys = {"secret-key-123", "agent-key-456"}
    if x_api_key not in valid_keys:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# This endpoint won't even run if verify_api_key throws an error
@app.get("/agent/status")
def agent_status(api_key: str = Depends(verify_api_key)) -> dict:
    return {"status": "active", "key_prefix": api_key[:8]}

def pagination(
    page: int = 1,
    per_page: int = 20,
) -> dict:
    if page < 1:
        page = 1
    if per_page < 1 or per_page > 100:
        per_page = 20
    return {"offset": (page - 1) * per_page, "limit": per_page}

# We can inject pagination math to keep our endpoints clean
@app.get("/readings")
def list_readings(pages: dict = Depends(pagination)) -> dict:
    return {"offset": pages["offset"], "limit": pages["limit"], "data": []}
```

**What's happening:**
```python
def verify_api_key(x_api_key: str = Header(...)) -> str:
#                       ^^^^^^^^^^^^^  ^^^^^^
#                       |              └── Header(...) means REQUIRED header
#                       └── FastAPI extracts this from the request headers
#                           Looks for: x-api-key: secret-key-123
#                           (Header converts hyphens to underscores)

    if x_api_key not in valid_keys:
        raise HTTPException(status_code=403, detail="Invalid API key")
        # If the header is missing or invalid, this runs
        # Endpoint never executes
    return x_api_key
    # If valid, returns the key (can be used by endpoint if needed)

# Request flow:
# 1. Client sends: GET /agent/status  Headers: { "x-api-key": "secret-key-123" }
# 2. FastAPI calls verify_api_key(x_api_key="secret-key-123")
# 3. verify_api_key returns "secret-key-123" (valid)
# 4. agent_status receives api_key="secret-key-123"
# 5. agent_status runs

# If header is missing:
# 1. Client sends: GET /agent/status  Headers: {}
# 2. FastAPI calls verify_api_key(x_api_key=<missing>)
# 3. FastAPI returns 422: "Field required"
# 4. Endpoint never runs
```

```python
# Pagination dependency — cleaner than inline logic
def pagination(
    page: int = 1,        # Query param: ?page=2
    per_page: int = 20,   # Query param: ?per_page=50
) -> dict:
    if page < 1:
        page = 1                    # Enforce minimum
    if per_page < 1 or per_page > 100:
        per_page = 20               # Clamp to valid range
    return {
        "offset": (page - 1) * per_page,  # Calculate offset
        "limit": per_page,                 # Return limit
    }

@app.get("/readings")
def list_readings(pages: dict = Depends(pagination)) -> dict:
    return {"offset": pages["offset"], "limit": pages["limit"], "data": []}
    # GET /readings?page=2&per_page=50
    # pages = {"offset": 50, "limit": 50}

# Why use a dependency instead of inline parameters?
# 1. Reuse: same pagination logic across multiple endpoints
# 2. Validation: clamping logic lives in one place
# 3. Testing: easy to mock pagination for tests
# 4. Cleanliness: endpoint only has one 'pages' parameter
```

### 6. Chained Dependencies

A dependency can itself depend on other dependencies. FastAPI resolves the entire chain automatically.

```python
from fastapi import FastAPI, Depends, Header

app = FastAPI()

def get_tenant_id(x_tenant: str = Header(...)) -> str:
    return x_tenant

# This dependency calls get_tenant_id!
def get_tenant_db(tenant_id: str = Depends(get_tenant_id)) -> dict:
    return {"tenant_id": tenant_id, "tables": ["readings", "alerts"]}

# Our endpoint calls get_tenant_db
@app.get("/tenant/data")
def get_data(db: dict = Depends(get_tenant_db)) -> dict:
    return {"tenant": db["tenant_id"], "tables": db["tables"]}
```

**What's happening:**
```python
# Dependency chain:
# get_data() depends on get_tenant_db()
# get_tenant_db() depends on get_tenant_id()
# get_tenant_id() depends on x_tenant header

# FastAPI resolves automatically:
# 1. Client sends: GET /tenant/data  Headers: { "x-tenant": "factory-1" }
# 2. FastAPI calls get_tenant_id(x_tenant="factory-1")
# 3. Returns "factory-1"
# 4. FastAPI calls get_tenant_db(tenant_id="factory-1")
# 5. Returns {"tenant_id": "factory-1", "tables": [...]}
# 6. FastAPI calls get_data(db={"tenant_id": "factory-1", ...})
# 7. Returns response to client

# The chain is:
# Header ──▶ get_tenant_id() ──▶ get_tenant_db() ──▶ get_data()
```

```python
# Complex chain example: Authentication → Tenant → Database
def get_current_user(x_token: str = Header(...)) -> dict:
    """Validate JWT token and return user."""
    user = decode_token(x_token)  # Your auth logic
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def get_tenant(user: dict = Depends(get_current_user)) -> dict:
    """Get tenant from user."""
    return {"tenant_id": user["tenant_id"]}

def get_db(tenant: dict = Depends(get_tenant)):
    """Get database connection for this tenant."""
    conn = create_connection(tenant["tenant_id"])
    try:
        yield conn
    finally:
        conn.close()

@app.get("/readings")
def list_readings(db = Depends(get_db)):
    """Endpoint only needs db — everything else is resolved automatically."""
    return db.query("readings")

# Chain: Header → get_current_user → get_tenant → get_db → list_readings
# Client only sends one header, FastAPI handles the rest!
```

### 7. Multiple Dependencies

An endpoint can depend on multiple dependencies. They all run concurrently.

```python
from fastapi import FastAPI, Depends

app = FastAPI()

def get_config() -> dict:
    return {"debug": True}

def get_auth() -> dict:
    return {"user": "admin", "role": "admin"}

def get_db():
    conn = {"connected": True}
    try:
        yield conn
    finally:
        conn["connected"] = False

@app.get("/dashboard")
def dashboard(
    config: dict = Depends(get_config),
    auth: dict = Depends(get_auth),
    db: dict = Depends(get_db),
) -> dict:
    return {
        "config": config,
        "user": auth["user"],
        "db_connected": db["connected"],
    }
```

**What's happening:**
```python
@app.get("/dashboard")
def dashboard(
    config: dict = Depends(get_config),   # Dependency 1
    auth: dict = Depends(get_auth),        # Dependency 2
    db: dict = Depends(get_db),            # Dependency 3 (yield)
) -> dict:
    # All three dependencies run in parallel
    # FastAPI resolves them concurrently
    # Endpoint receives all three as parameters

# Timeline:
# 1. Request arrives
# 2. FastAPI calls get_config(), get_auth(), get_db() concurrently
# 3. All three complete
# 4. dashboard(config, auth, db) runs
# 5. After dashboard: get_db()'s teardown runs (yield cleanup)
```

### 8. Common Mistake: Sharing Dependencies

```python
# WRONG: Sharing a yield dependency between endpoints
# This can cause issues because the same generator is used twice

# RIGHT: FastAPI automatically creates a new generator per endpoint call
# Each endpoint gets its own fresh database connection

# If you WANT to share a dependency across multiple endpoints:
# Use a class-based dependency
class DatabaseSession:
    def __init__(self):
        self.connection = create_connection()

    def query(self, table: str):
        return self.connection.execute(f"SELECT * FROM {table}")

    def close(self):
        self.connection.close()

def get_db():
    db = DatabaseSession()
    try:
        yield db
    finally:
        db.close()

# Both endpoints get different db instances:
@app.get("/readings")
def list_readings(db: DatabaseSession = Depends(get_db)):
    return db.query("readings")

@app.get("/alerts")
def list_alerts(db: DatabaseSession = Depends(get_db)):
    return db.query("alerts")
```

**What's happening:**
```python
# FastAPI's dependency caching:
# By default, if two parameters in the SAME endpoint use the same dependency,
# FastAPI calls the dependency only ONCE and shares the result.
#
# Example:
def get_db():
    print("Creating connection")  # Only prints once!
    conn = create_connection()
    try:
        yield conn
    finally:
        conn.close()

@app.get("/both")
def both(
    db1: dict = Depends(get_db),
    db2: dict = Depends(get_db),  # Same dependency, same result
) -> dict:
    return {"same": db1 is db2}  # True! Same object shared
```

### 9. Factory Floor Example: Complete DI Architecture

```python
from fastapi import FastAPI, Depends, Header, HTTPException
from collections.abc import Generator

app = FastAPI(title="Factory Sensor API")

# --- Layer 1: Authentication ---
def verify_api_key(x_api_key: str = Header(...)) -> str:
    """Validate API key from header."""
    valid_keys = {"factory-key-001", "factory-key-002"}
    if x_api_key not in valid_keys:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# --- Layer 2: Tenant Isolation ---
def get_tenant(api_key: str = Depends(verify_api_key)) -> str:
    """Map API key to tenant."""
    tenant_map = {
        "factory-key-001": "factory-north",
        "factory-key-002": "factory-south",
    }
    return tenant_map[api_key]

# --- Layer 3: Database Session ---
def get_db(tenant: str = Depends(get_tenant)) -> Generator[dict, None, None]:
    """Create tenant-isolated database connection."""
    db = {"tenant": tenant, "connected": True}
    try:
        yield db
    finally:
        db["connected"] = False

# --- Layer 4: Endpoint ---
@app.get("/sensors")
def list_sensors(db: dict = Depends(get_db)) -> dict:
    """List sensors for the authenticated tenant."""
    return {
        "tenant": db["tenant"],
        "sensors": ["temp-01", "temp-02", "temp-03"],
    }

@app.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str, db: dict = Depends(get_db)) -> dict:
    """Get a specific sensor."""
    return {
        "tenant": db["tenant"],
        "sensor_id": sensor_id,
        "value": 23.5,
    }
```

**What's happening:**
```python
# The complete dependency chain for every request:
#
#   x-api-key header
#        │
#        ▼
#   verify_api_key() ──▶ "factory-key-001"
#        │
#        ▼
#   get_tenant() ──▶ "factory-north"
#        │
#        ▼
#   get_db() ──▶ {"tenant": "factory-north", "connected": True}
#        │
#        ▼
#   list_sensors(db=...) ──▶ Response
#
# Benefits:
# 1. Authentication logic: one place (verify_api_key)
# 2. Tenant mapping: one place (get_tenant)
# 3. Database connection: one place (get_db)
# 4. Endpoints: only focus on business logic
# 5. Testing: override each layer independently
```

---

### Summary
Use `Depends()` to decouple endpoints from external resources. Yield dependencies provide automatic setup/teardown for database connections and sessions. Override dependencies with `app.dependency_overrides` for clean, mock-free testing. Chain dependencies for layered authentication and tenant isolation patterns.

---

### Quick Reference

| Syntax | Meaning | Example |
|--------|---------|---------|
| `Depends(func)` | Inject dependency | `db: Session = Depends(get_db)` |
| `yield` in dependency | Setup/teardown | `yield db` (setup before, teardown after) |
| `Header(...)` | Extract header value | `key: str = Header(...)` |
| `Query(...)` | Extract query param | `limit: int = Query(10)` |
| `app.dependency_overrides[func] = mock` | Override for testing | `overrides[get_db] = get_test_db` |
| `app.dependency_overrides.clear()` | Reset all overrides | `clear()` |
| Chained dependencies | Auto-resolved chain | `def b(a = Depends(a_func)): ...` |
| `Depends()` caching | Same dep, same result | Two `Depends(get_db)` = one call |
| Generator dependency | Auto cleanup | `def get_db(): ... yield db ... finally:` |
| `lifespan` | App startup/shutdown | `@asynccontextmanager def lifespan(app):` |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Dependency Injection**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 dependency injection**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

