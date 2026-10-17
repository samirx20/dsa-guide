# Part 5, Topic 2: FastAPI Development
## Chapter 1: FastAPI Basics

**Prerequisite Knowledge:** Basic understanding of Python functions, classes, and HTTP requests (GET/POST).

---

### The 'Restaurant Waiter' Analogy
Imagine walking into a restaurant. You don't walk into the kitchen and cook your own food; you talk to a waiter. The waiter takes your order, checks to make sure you ordered something actually on the menu, walks it to the kitchen (your code), and then carries the cooked food back to your table. 

FastAPI is that highly efficient waiter for your Python code. It handles the "menu" (the API paths), checks if the customer's order is valid (data validation), runs your Python functions (the kitchen), and hands the result back to the customer over the internet.

```
┌────────── FASTAPI REQUEST LIFECYCLE ──────────────────┐
│                                                        │
│  Client Request                                        │
│       │                                                │
│       ▼                                                │
│  ┌─────────────┐    ┌──────────────┐                  │
│  │ Router      │───▶│ Path Params  │ Extracted from URL│
│  │ Matching    │    │ Query Params │ Extracted from ?  │
│  └──────┬──────┘    │ Request Body │ Extracted from JSON│
│         │           └──────┬───────┘                   │
│         │                  │                           │
│         ▼                  ▼                           │
│  ┌─────────────┐    ┌──────────────┐                  │
│  │ Validation  │───▶│ Your Code    │ Runs your function│
│  │ (Pydantic)  │    │ (endpoint)   │                  │
│  └─────────────┘    └──────┬───────┘                  │
│                            │                          │
│                            ▼                          │
│                     ┌──────────────┐                  │
│                     │ Response     │ JSON serialized  │
│                     │ Serialization│ Back to client   │
│                     └──────────────┘                  │
└────────────────────────────────────────────────────────┘
```

FastAPI is a modern Python web framework built on top of Starlette and Pydantic. It provides automatic request validation, type-safe path and query parameters, auto-generated OpenAPI docs, and native async support. For agentic systems, FastAPI is the standard choice for exposing agent capabilities as HTTP APIs.

---

### 1. Installation and First App

```bash
pip install fastapi uvicorn
```

```python
from fastapi import FastAPI

# Create the main app object (our "waiter")
app = FastAPI(title="Sensor API", version="0.1.0")

# Tell the app what to do when someone visits the home page ("/")
@app.get("/")
def root() -> dict:
    return {"message": "Sensor API is running"}

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**What's happening:**
```python
from fastapi import FastAPI
#              ^^^^^^^
#              Import the main FastAPI class

app = FastAPI(title="Sensor API", version="0.1.0")
#   ^^^^^^^^^
#   Creates the application instance
#   title and version appear in the auto-generated docs

@app.get("/")
#   ^^^  ^^^
#   |    └── URL path to match
#   └── HTTP method to match
#   Also available: @app.post(), @app.put(), @app.delete(), @app.patch()

def root() -> dict:
#   ^^^^      ^^^^
#   |         └── Return type hint (used for response serialization)
#   └── Function name (doesn't affect URL)
    return {"message": "Sensor API is running"}
    #     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #     Python dict automatically converted to JSON response
    #     FastAPI sets Content-Type: application/json

uvicorn.run(app, host="0.0.0.0", port=8000)
#         ^^^  ^^^           ^^^    ^^^^
#         |    |             |      └── Port to listen on
#         |    |             └── Bind to all network interfaces
#         |    └── The FastAPI app instance
#         └── ASGI server that runs your app
```

Run it:
```bash
python main.py
```

Visit `http://localhost:8000/docs` to see the auto-generated Swagger UI. Every endpoint you define appears with interactive forms for testing.

```
┌────────── SWAGGER UI (localhost:8000/docs) ─────────┐
│                                                       │
│  Sensor API v0.1.0                                    │
│                                                       │
│  ┌─ GET / ──────────────────────────────────┐        │
│  │  Description: (none)                     │        │
│  │  [Try it out]                            │        │
│  │  Response: { "message": "Sensor API..." }│        │
│  └──────────────────────────────────────────┘        │
│                                                       │
│  ┌─ GET /sensors/{sensor_id} ───────────────┐        │
│  │  Parameters: sensor_id (string, required)│        │
│  │  [Try it out]                            │        │
│  └──────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────┘
```

---

### 2. Path Parameters

Path parameters are extracted from the URL and validated against the type hint.

```python
# The {} curly braces mean "grab whatever the user types here"
@app.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str) -> dict:
    return {"sensor_id": sensor_id, "status": "active"}

# Here we specify reading_id MUST be an integer
@app.get("/readings/{reading_id}")
def get_reading(reading_id: int) -> dict:
    return {"reading_id": reading_id, "value": 23.5}
```

**What's happening:**
```python
@app.get("/sensors/{sensor_id}")
#                    ^^^^^^^^^^^
#                    Path parameter: extracted from URL
#                    FastAPI uses the type hint to validate

def get_sensor(sensor_id: str) -> dict:
#              ^^^^^^^^^^^  ^^^
#              |            └── Type: string (validated automatically)
#              └── Variable name MUST match {sensor_id} in the path

# GET /sensors/temp-01  →  sensor_id = "temp-01"  ✓
# GET /sensors/123      →  sensor_id = "123"      ✓ (string, accepts anything)

@app.get("/readings/{reading_id}")
def get_reading(reading_id: int) -> dict:
#              ^^^^^^^^^^^^  ^^^
#              |             └── Type: integer (validated automatically)
#              └── Name matches {reading_id}

# GET /readings/42    →  reading_id = 42     ✓ (converted to int)
# GET /readings/abc   →  422 Validation Error ✓ (can't convert "abc" to int)
```

FastAPI automatically converts `reading_id` to an `int`. If someone passes a string, they get a 422 Validation Error with a clear message.

### 3. Query Parameters

Query parameters come after `?` in the URL. They are function parameters not in the path.

```python
from typing import Optional

# Any argument not in the @app.get path becomes a query parameter
@app.get("/readings")
def list_readings(
    sensor_id: Optional[str] = None, # Optional: the user doesn't have to provide it
    limit: int = 10,                 # Default is 10 if not provided
    offset: int = 0,                 # Default is 0 if not provided
) -> dict:
    return {
        "sensor_id": sensor_id,
        "limit": limit,
        "offset": offset,
        "data": [],
    }
```

**What's happening:**
```python
@app.get("/readings")
#          ^^^^^^^^  No {path_param} in URL

def list_readings(
    sensor_id: Optional[str] = None,  # Query param: ?sensor_id=temp-01
    limit: int = 10,                  # Query param: ?limit=5
    offset: int = 0,                  # Query param: ?offset=20
) -> dict:
    # sensor_id: Optional[str] = None  →  type hint + default = None makes it optional
    # limit: int = 10                  →  default = 10, user can override
    # offset: int = 0                  →  default = 0, user can override

# Call it: GET /readings?sensor_id=temp-01&limit=5
# Result: sensor_id="temp-01", limit=5, offset=0 (default)

# Call it: GET /readings
# Result: sensor_id=None, limit=10, offset=0 (all defaults)
```

Call it: `GET /readings?sensor_id=temp-01&limit=5`

```python
# Query parameter validation
@app.get("/search")
def search_sensors(
    q: str,                          # Required (no default = required)
    min_value: float = 0.0,          # Must be a float
    max_value: float = 100.0,        # Must be a float
    active: bool = True,             # Must be a boolean
) -> dict:
    return {"q": q, "min": min_value, "max": max_value, "active": active}

# GET /search?q=temperature               → q="temperature", min=0.0, max=100.0, active=True
# GET /search?q=temp&min_value=20&active=false → q="temp", min=20.0, max=100.0, active=False
# GET /search                             → 422 Error: q is required
```

### 4. Request Body with Pydantic

For POST/PUT requests, define a Pydantic model and use it as the parameter type. FastAPI validates the JSON body against the model.

```python
from pydantic import BaseModel, Field

# Define exactly what shape of data we expect from the user
class SensorReading(BaseModel):
    sensor_id: str
    value: float = Field(..., ge=-100, le=200) # Must be between -100 and 200
    unit: str = "celsius"
    metadata: dict[str, str] | None = None

# We accept a POST request and expect the body to match SensorReading
@app.post("/readings")
def create_reading(reading: SensorReading) -> dict:
    return {
        "status": "created",
        # Convert the Pydantic object back into a dictionary to return it
        "reading": reading.model_dump(),
    }
```

**What's happening:**
```python
class SensorReading(BaseModel):
#                 ^^^^^^^^^^
#                 Pydantic model: validates incoming JSON data

    sensor_id: str                    # Required string field
    value: float = Field(..., ge=-100, le=200)
    #         ^^^^^  ^^^   ^^^       ^^^
    #         |      |     |         └── Less than or equal to 200
    #         |      |     └── Greater than or equal to -100
    #         |      └── ... means required (no default)
    #         └── Type: float (validated automatically)
    unit: str = "celsius"            # Optional with default
    metadata: dict[str, str] | None = None  # Optional dict

@app.post("/readings")
def create_reading(reading: SensorReading) -> dict:
#              ^^^^^^^^^^^^^^^^^^^^^^^^^^
#              FastAPI sees the type hint and:
#              1. Reads the JSON body from the request
#              2. Validates it against SensorReading schema
#              3. Creates a SensorReading instance
#              4. Passes it to your function
#              If validation fails → 422 error with details
```

The auto-generated docs now show a JSON schema for the request body with field descriptions and constraints.

```python
# Request body schema in Swagger UI:
{
  "sensor_id": "string",       // Required
  "value": 0,                  // Required, -100 <= value <= 200
  "unit": "celsius",           // Optional, default "celsius"
  "metadata": {}               // Optional, nullable
}
```

### 5. Response Models

Use `response_model` to control what gets returned. Sensitive fields are automatically excluded.

```python
class ReadingResponse(BaseModel):
    sensor_id: str
    value: float
    unit: str

class ReadingInternal(BaseModel):
    sensor_id: str
    value: float
    unit: str
    internal_note: str

# We specify response_model=ReadingResponse so we don't accidentally leak secrets
@app.post("/readings", response_model=ReadingResponse)
def create_reading(reading: SensorReading) -> ReadingInternal:
    # Our function returns the INTERNAL model, which has secret notes
    return ReadingInternal(
        sensor_id=reading.sensor_id,
        value=reading.value,
        unit=reading.unit,
        internal_note="processed by agent",
    )
```

**What's happening:**
```python
@app.post("/readings", response_model=ReadingResponse)
#                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                      Tell FastAPI what fields to EXPOSE to the client

def create_reading(reading: SensorReading) -> ReadingInternal:
#              Returns ReadingInternal (has internal_note)
    return ReadingInternal(
        sensor_id=reading.sensor_id,
        value=reading.value,
        unit=reading.unit,
        internal_note="processed by agent",  # THIS IS STRIPPED OUT
    )

# What the client sees:
# {
#   "sensor_id": "temp-01",
#   "value": 23.5,
#   "unit": "celsius"
# }
# internal_note is NEVER sent to the client
#
# Even though your function returns ReadingInternal,
# FastAPI serializes it as ReadingResponse (only the declared fields)
```

The `internal_note` field is never exposed to the client, even though the function returns it. FastAPI strips it out before sending.

### 6. Status Codes

```python
from fastapi import HTTPException, status

# Set the default status code for success
@app.delete("/sensors/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensor(sensor_id: str) -> None:
    if sensor_id == "temp-01":
        # Throw an error to return a 403 Forbidden status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete primary sensor",
        )
```

**What's happening:**
```python
@app.delete("/sensors/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
#                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                                         Default response status code
#                                         204 = success with no response body

def delete_sensor(sensor_id: str) -> None:
#                                      ^^^^
#                                      Return type None = no response body (204)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,  # 403 = Forbidden
        detail="Cannot delete primary sensor",  # Human-readable error message
    )
    # HTTPException stops execution and sends error response immediately
    # Client sees: { "detail": "Cannot delete primary sensor" }
```

```python
# Common status codes
from fastapi import status

status.HTTP_200_OK                  # 200 - Success
status.HTTP_201_CREATED            # 201 - Resource created
status.HTTP_204_NO_CONTENT         # 204 - Success, no body
status.HTTP_400_BAD_REQUEST        # 400 - Client error
status.HTTP_401_UNAUTHORIZED       # 401 - Not authenticated
status.HTTP_403_FORBIDDEN          # 403 - Authenticated but not allowed
status.HTTP_404_NOT_FOUND          # 404 - Resource not found
status.HTTP_422_UNPROCESSABLE_ENTITY  # 422 - Validation error
status.HTTP_500_INTERNAL_SERVER_ERROR # 500 - Server error
```

### 7. Error Handling Patterns

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

# Pattern 1: Raise HTTPException with detail
@app.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str) -> dict:
    if sensor_id not in DATABASE:
        raise HTTPException(
            status_code=404,
            detail=f"Sensor {sensor_id} not found",
        )
    return DATABASE[sensor_id]

# Pattern 2: Multiple error conditions
@app.post("/readings")
def create_reading(reading: SensorReading) -> dict:
    if reading.value < -100 or reading.value > 200:
        raise HTTPException(status_code=400, detail="Value out of range")
    if reading.sensor_id in BLACKLISTED_SENSORS:
        raise HTTPException(status_code=403, detail="Sensor blacklisted")
    # ... save to database
    return {"status": "created"}
```

**What's happening:**
```python
raise HTTPException(status_code=404, detail="Sensor not found")
#     ^^^^^^^^^^^^^^^
#     Built-in exception class
#     FastAPI catches it and returns proper JSON error response
#
# Client sees:
# {
#   "detail": "Sensor not found"
# }
# Status code: 404
#
# You can also add headers:
# raise HTTPException(status_code=401, detail="Unauthorized",
#                     headers={"WWW-Authenticate": "Bearer"})
```

### 8. Putting It Together: Full Example

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(title="Sensor API", version="0.1.0")

class SensorReading(BaseModel):
    sensor_id: str
    value: float = Field(..., ge=-100, le=200)
    unit: str = "celsius"

class ReadingResponse(BaseModel):
    sensor_id: str
    value: float
    unit: str

# A fake database for demonstration
DATABASE: dict[str, SensorReading] = {}

@app.get("/sensors")
def list_sensors() -> list[str]:
    return list(DATABASE.keys())

@app.get("/sensors/{sensor_id}", response_model=ReadingResponse)
def get_sensor(sensor_id: str) -> ReadingResponse:
    if sensor_id not in DATABASE:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    reading = DATABASE[sensor_id]
    return ReadingResponse(
        sensor_id=reading.sensor_id,
        value=reading.value,
        unit=reading.unit,
    )

@app.post("/sensors", response_model=ReadingResponse, status_code=201)
def create_sensor(reading: SensorReading) -> ReadingResponse:
    # Save to "database"
    DATABASE[reading.sensor_id] = reading
    
    return ReadingResponse(
        sensor_id=reading.sensor_id,
        value=reading.value,
        unit=reading.unit,
    )
```

**What's happening:**
```python
DATABASE: dict[str, SensorReading] = {}
#        ^^^^^^^^^^^^^^^^^^^^^^^^^^
#        Type hint: dictionary mapping str keys to SensorReading values
#        This is our in-memory "database"
#        In production, use PostgreSQL, Redis, etc.

@app.get("/sensors", response_model=list[str])
def list_sensors() -> list[str]:
    return list(DATABASE.keys())
#           ^^^^^^^^^^^^^^^^^
#           Returns just the sensor IDs
#           Response: ["temp-01", "temp-02", "temp-03"]

@app.get("/sensors/{sensor_id}", response_model=ReadingResponse)
def get_sensor(sensor_id: str) -> ReadingResponse:
    if sensor_id not in DATABASE:
        raise HTTPException(status_code=404, detail="Sensor not found")
    #  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #  If sensor not in database, return 404 immediately
    #  Client sees: { "detail": "Sensor not found" }

    reading = DATABASE[sensor_id]
    return ReadingResponse(
        sensor_id=reading.sensor_id,  # Map internal → response
        value=reading.value,
        unit=reading.unit,
    )

@app.post("/sensors", response_model=ReadingResponse, status_code=201)
def create_sensor(reading: SensorReading) -> ReadingResponse:
    #                                  ^^^^^^^^^^^^^^
    #                                  Pydantic model validates the request body
    #                                  If invalid → 422 error
    DATABASE[reading.sensor_id] = reading  # Save to database
    return ReadingResponse(...)            # Return created resource
```

### 9. Async Endpoints

```python
import httpx

# Synchronous endpoint (blocks the thread for I/O)
@app.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str) -> dict:
    # FastAPI runs plain 'def' endpoints in a threadpool, so this blocks a worker thread
    # (not the event loop) while waiting on the external API!
    response = httpx.get(f"https://api.example.com/sensor/{sensor_id}")
    return response.json()

# Asynchronous endpoint (non-blocking I/O)
@app.get("/sensors/{sensor_id}")
async def get_sensor(sensor_id: str) -> dict:
    # This yields control while waiting for the response
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/sensor/{sensor_id}")
        return response.json()
```

**What's happening:**
```python
@app.get("/sensors/{sensor_id}")
async def get_sensor(sensor_id: str) -> dict:
#  ^^^^^
#  'async' keyword makes this a coroutine endpoint
#  FastAPI runs it on the event loop, allowing concurrent requests

    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/sensor/{sensor_id}")
        #  ^^^^^
        #  Yields control while waiting for external API
        #  Other requests can be served during this wait

# Use async when your endpoint does I/O:
# - Database queries (with async driver)
# - External API calls
# - File reads/writes
# - Any awaitable operation

# Use sync when your endpoint does only CPU work:
# - Data transformation
# - Calculations
# - No I/O operations
```

---

### Summary
FastAPI provides type-safe request/response handling with zero boilerplate. Path and query parameters are validated from type hints. Pydantic models handle request bodies and response filtering. The auto-generated `/docs` endpoint gives you interactive API documentation for free. Use `response_model` to hide internal fields from clients.

---

### Quick Reference

| Syntax | Meaning | Example |
|--------|---------|---------|
| `FastAPI()` | Create app instance | `app = FastAPI(title="My API")` |
| `@app.get()` | GET endpoint | `@app.get("/path")` |
| `@app.post()` | POST endpoint | `@app.post("/path")` |
| `@app.put()` | PUT endpoint | `@app.put("/path")` |
| `@app.delete()` | DELETE endpoint | `@app.delete("/path")` |
| `{param}` | Path parameter | `@app.get("/sensors/{id}")` |
| `Param = default` | Query parameter | `limit: int = 10` |
| `BaseModel` | Request body schema | `class Sensor(BaseModel):` |
| `Field(...)` | Field constraints | `value: float = Field(ge=0)` |
| `response_model` | Response filtering | `@app.get("/", response_model=Resp)` |
| `HTTPException` | Error response | `raise HTTPException(404, "Not found")` |
| `status.HTTP_*` | Status code constants | `status.HTTP_201_CREATED` |
| `model_dump()` | Pydantic to dict | `reading.model_dump()` |
| `/docs` | Swagger UI | Interactive API documentation |
| `uvicorn.run()` | Start server | `uvicorn.run(app, port=8000)` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

For each request, give the **status code** and the **JSON body** (or say "422" and name the field that failed). These answers were checked with `fastapi.testclient.TestClient` against the chapter's own endpoints.

**Q1. Query parameters (Section 3, `list_readings`).**
- (a) `GET /readings?limit=5&offset=20`
- (b) `GET /readings?sensor_id=arm-02`
- (c) `GET /readings?limit=five`

**Q2. Query parameter types (Section 3, `search_sensors`).**
- (a) `GET /search?q=temp&max_value=50&active=0`
- (b) `GET /search?q=temp&active=yes`
- (c) `GET /search?q=temp&active=maybe`
- (d) `GET /search?min_value=5`

**Q3. Stateful trace (Section 8 full example).** Start with an empty `DATABASE` and send these requests in order. Fill in the table.

| # | Request | Status | Body |
|--:|---------|-------:|------|
| 1 | `POST /sensors` `{"sensor_id": "temp-01", "value": 23.5}` | ? | ? |
| 2 | `POST /sensors` `{"sensor_id": "temp-02", "value": 250}` | ? | ? |
| 3 | `GET /sensors` | ? | ? |
| 4 | `GET /sensors/temp-02` | ? | ? |
| 5 | `POST /sensors` `{"sensor_id": "temp-01", "value": "-40", "unit": "fahrenheit"}` | ? | ? |
| 6 | `GET /sensors` | ? | ? |

**Q4. Response model filtering (Section 5).** `POST /readings` (the `response_model=ReadingResponse` version that returns a `ReadingInternal`) receives the body `{"sensor_id": "arm-02", "value": -100, "internal_note": "x"}`. What does the client receive? What if the body is just `{"sensor_id": "arm-02"}`?

**Q5. Status codes (Section 6).** What do `DELETE /sensors/temp-01` and `DELETE /sensors/temp-02` return (status + body)? The chapter's "Common status codes" list has a comment `# 402 - Authenticated but not allowed` next to `status.HTTP_403_FORBIDDEN`. What number does that constant really hold?

### Coding Exercises

**E1 (Easy).** Add `GET /convert/{celsius}` with a `float` path parameter that returns `{"celsius": c, "fahrenheit": round(c * 9 / 5 + 32, 2)}`. Reject anything below absolute zero ($-273.15$ °C) with `400` and `detail="Below absolute zero"`.
- `GET /convert/100` returns `200 {"celsius": 100.0, "fahrenheit": 212.0}`
- `GET /convert/-300` returns `400 {"detail": "Below absolute zero"}`. `GET /convert/hot` returns `422`.

**E2 (Easy–Medium).** Given the Section 8 `DATABASE` preloaded with `temp-03`, `temp-01`, and `arm-02`, add `GET /sensors/page?limit=&offset=` that returns `{"total", "limit", "offset", "items"}`, where `items` is a slice of the **sorted** sensor ids. Validate `1 <= limit <= 100` (default 10) and `offset >= 0` (default 0) so bad values give `422`.
- `GET /sensors/page?limit=2` returns `{"total": 3, "limit": 2, "offset": 0, "items": ["arm-02", "temp-01"]}`
- `GET /sensors/page?limit=2&offset=2` returns `items: ["temp-03"]`. `?limit=0` returns `422`. `?offset=5` returns `items: []`.

**E3 (Medium).** Add `PUT /sensors/{sensor_id}` (body: `SensorReading`, response: `ReadingResponse`) and `DELETE /sensors/{sensor_id}` (204 on success).
- `PUT` returns `404 "Sensor not found"` if the id is unknown, and `400 "sensor_id in body does not match URL"` if the body's `sensor_id` differs from the path. Otherwise it replaces the stored reading and returns it.
- `DELETE` returns `204` with an empty body, or `404` if the id is unknown.
- Example: `PUT /sensors/temp-01 {"sensor_id": "temp-01", "value": 30}` returns `200 {"sensor_id": "temp-01", "value": 30.0, "unit": "celsius"}`. Deleting `arm-02` twice returns `204`, then `404`.

#### Dry-Run: Answers

**Q1.**
- (a) `200 {"sensor_id": null, "limit": 5, "offset": 20, "data": []}`. `sensor_id` falls back to its default `None`, which becomes JSON `null`.
- (b) `200 {"sensor_id": "arm-02", "limit": 10, "offset": 0, "data": []}`
- (c) `422`. The error has `loc: ["query", "limit"]` and type `int_parsing`, because `"five"` cannot become an `int`.

**Q2.**
- (a) `200 {"q": "temp", "min": 0.0, "max": 50.0, "active": false}`. `"50"` is converted to the float `50.0`, and `"0"` is a valid false boolean.
- (b) `200 {"q": "temp", "min": 0.0, "max": 100.0, "active": true}`. FastAPI accepts `true/false`, `1/0`, `yes/no`, and `on/off`.
- (c) `422` on `active` (`bool_parsing`).
- (d) `422`, `"Field required"` at `loc: ["query", "q"]`. `q` has no default, so it is required.

**Q3.**

| # | Status | Body | Why |
|--:|-------:|------|-----|
| 1 | 201 | `{"sensor_id": "temp-01", "value": 23.5, "unit": "celsius"}` | `status_code=201`, and `unit` uses its default |
| 2 | 422 | `less_than_equal` at `["body", "value"]` | $250 > 200$ (`le=200`), so the function never runs and nothing is stored |
| 3 | 200 | `["temp-01"]` | request 2 was rejected before the save |
| 4 | 404 | `{"detail": "Sensor not found"}` | |
| 5 | 201 | `{"sensor_id": "temp-01", "value": -40.0, "unit": "fahrenheit"}` | Pydantic's lax mode converts `"-40"` to `-40.0`, which is inside $[-100, 200]$, and the dict key is overwritten |
| 6 | 200 | `["temp-01"]` | still one key, since the POST replaced it rather than adding a new one |

**Q4.** The first body gives `200 {"sensor_id": "arm-02", "value": -100.0, "unit": "celsius"}`. The incoming `internal_note` is **ignored** by `SensorReading` (extra fields are dropped by default). The `internal_note` that the handler sets is stripped by `response_model`. $-100$ passes because `ge=-100` is inclusive. The second body gives `422`, `"Field required"` at `["body", "value"]`, because `Field(...)` makes `value` required.

**Q5.** `DELETE /sensors/temp-01` returns `403 {"detail": "Cannot delete primary sensor"}`. `DELETE /sensors/temp-02` returns `204` with an **empty** body (the handler returns `None`). `status.HTTP_403_FORBIDDEN == 403`. The `402` in that comment is a typo (402 is "Payment Required").

**E1 — reference solution**

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/convert/{celsius}")
def convert(celsius: float) -> dict:
    if celsius < -273.15:
        raise HTTPException(status_code=400, detail="Below absolute zero")
    return {"celsius": celsius, "fahrenheit": round(celsius * 9 / 5 + 32, 2)}
```

The type hint `float` gives the `422` for `"hot"` for free. The physics check is a business rule, so it is a `400` you raise yourself. Check: $100 \cdot \tfrac{9}{5} + 32 = 212$, $-40 \cdot \tfrac{9}{5} + 32 = -40$, and $36.6 \cdot \tfrac{9}{5} + 32 = 97.88$.

**E2 — reference solution**

```python
from fastapi import Query

# MUST be declared before @app.get("/sensors/{sensor_id}"), otherwise
# "/sensors/page" matches that route with sensor_id="page" and returns 404.
@app.get("/sensors/page")
def list_sensors_page(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    ids = sorted(DATABASE)
    return {"total": len(ids), "limit": limit, "offset": offset,
            "items": ids[offset:offset + limit]}
```

`sorted(["temp-03", "temp-01", "arm-02"])` gives `["arm-02", "temp-01", "temp-03"]`. The slice `[0:2]` is `["arm-02", "temp-01"]`, and `[2:4]` is `["temp-03"]`. Python slicing past the end returns `[]`, so `offset=5` is safe. It costs $O(n \log n)$ per request because of the sort.

**E3 — reference solution**

```python
from fastapi import HTTPException, status

@app.put("/sensors/{sensor_id}", response_model=ReadingResponse)
def update_sensor(sensor_id: str, reading: SensorReading) -> SensorReading:
    if sensor_id not in DATABASE:
        raise HTTPException(status_code=404, detail="Sensor not found")
    if reading.sensor_id != sensor_id:
        raise HTTPException(status_code=400,
                            detail="sensor_id in body does not match URL")
    DATABASE[sensor_id] = reading
    return reading                       # response_model trims it to 3 fields

@app.delete("/sensors/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensor(sensor_id: str) -> None:
    if sensor_id not in DATABASE:
        raise HTTPException(status_code=404, detail="Sensor not found")
    del DATABASE[sensor_id]
```

Order of checks matters. FastAPI validates the body **before** calling your function, so `PUT /sensors/temp-09` with `value: 300` returns `422`, not `404`. Only valid bodies reach the `404`/`400` checks.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: FastAPI Basics**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 fastapi basics**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

