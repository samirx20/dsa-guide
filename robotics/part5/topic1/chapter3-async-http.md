# Part 5, Topic 1: Asynchronous Python
## Chapter 3: Async HTTP

**Prerequisite Knowledge:** Understanding of the event loop, `async`/`await` keywords, and basic HTTP requests (like GET and POST).

---

### The "Drive-Thru vs. Mobile App" Analogy
Using blocking HTTP requests is like ordering at a traditional drive-thru. You pull up, order, and wait at the window. The person behind you cannot order or get their food until you drive away. This is very slow. 

Async HTTP is like ordering via a mobile app. Everyone sends their orders to the restaurant at the exact same time. The kitchen cooks everything simultaneously, and you simply grab your bag the moment it's ready. Nobody blocks anyone else.

Your agentic system talks to LLM providers, vector databases, and tool APIs over HTTP. The `requests` library is blocking — one call at a time, one thread per call. `httpx` gives you an async-native HTTP client that fits into the event loop you already learned.

```
┌────────── BLOCKING (requests) ──────────────────┐
│                                                   │
│  Request 1 ──── wait ──── Response 1             │
│                   Request 2 ──── wait ──── R2     │
│                                   Request 3 ──R3  │
│  Total: sum of all response times                 │
└───────────────────────────────────────────────────┘

┌────────── NON-BLOCKING (httpx async) ───────────┐
│                                                   │
│  Request 1 ──── wait ──── Response 1             │
│  Request 2 ──── wait ──── Response 2             │
│  Request 3 ──── wait ──── Response 3             │
│  Total: max of all response times                │
└───────────────────────────────────────────────────┘
```

---

### 1. Why `requests` Is Blocking

`requests.get()` blocks the calling thread until the response arrives. Inside an async function, this freezes the entire event loop, defeating the purpose of `async/await`.

```python
import requests

def fetch_sync(url: str) -> dict:
    # Step 1: This stops the entire program while waiting for the internet
    response = requests.get(url)  
    return response.json()

async def main():
    # WARNING: This blocks the event loop — never do this inside an async function!
    data = fetch_sync("https://api.example.com/data")
```

**What's happening:**
```python
import requests
response = requests.get(url)
#                  ^^^
#                  This is a SYNCHRONOUS call
#                  The thread is BLOCKED until the response arrives
#                  No other coroutine can run during this time
#
# Timeline:
# |--requests.get() [BLOCKS ENTIRE THREAD]--|--next coroutine--|
# Even if other coroutines are ready to run, they can't!
```

### 2. `httpx.AsyncClient` — The Non-Blocking Alternative

```python
import httpx

async def fetch_sensor(url: str) -> dict:
    # Step 1: Create an asynchronous client using 'async with'
    async with httpx.AsyncClient() as client:
        # Step 2: Await the internet request. 
        # This lets other tasks run while we wait for the response!
        response = await client.get(url)
        
        # Step 3: Raise an error if the request failed (like a 404 Not Found)
        response.raise_for_status()
        
        return response.json()
```

**What's happening:**
```python
async with httpx.AsyncClient() as client:
#     ^^^^^^^^^^^^^^^^^^^^^^^
#     Creates an async context manager
#     Sets up a connection pool for reusing TCP connections
#     Automatically closes connections when the block exits

    response = await client.get(url)
    #          ^^^^^
    #          Yields control to event loop while waiting for response
    #          Other coroutines can run during this wait

    response.raise_for_status()
    #                   ^^^^^^^^^^^^^^^^^^^^^^^^
    #                   Raises httpx.HTTPStatusError for 4xx/5xx responses
    #                   Catches: 404, 500, 502, 503, etc.
```

The `async with` block creates a connection pool that reuses TCP connections across multiple requests, which is significantly faster than creating a new connection for each request.

```python
# httpx.AsyncClient vs requests
# ┌──────────────────┬────────────────────┬────────────────────┐
# │ Feature          │ requests           │ httpx.AsyncClient  │
# ├──────────────────┼────────────────────┼────────────────────┤
# │ Blocking?        │ Yes                │ No (async)         │
# │ Connection pool  │ Via Session        │ Automatic          │
# │ HTTP/2 support   │ No                 │ Yes                │
# │ Timeouts         │ Basic              │ Granular           │
# │ Retry support    │ Via adapter        │ Connect only       │
# │ Type hints       │ Partial            │ Full               │
# └──────────────────┴────────────────────┴────────────────────┘
```

### 3. Session Reuse for Performance

Creating a new `AsyncClient` for every request wastes time on TCP handshakes. Create one client and reuse it.

```python
import httpx

async def main():
    # Step 1: Open ONE client connection
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 2: Reuse the same client for all requests.
        # This is much faster because we don't have to reconnect to the server every time.
        r1 = await client.get("https://api.example.com/sensor/temp-01")
        r2 = await client.get("https://api.example.com/sensor/temp-02")
        r3 = await client.get("https://api.example.com/sensor/temp-03")
```

**What's happening:**
```python
async with httpx.AsyncClient(timeout=10.0) as client:
#                                 ^^^^^^
#                                 Default timeout for all requests
#                                 Can be overridden per-request

    r1 = await client.get(url1)  # Uses existing TCP connection
    r2 = await client.get(url2)  # Reuses same connection (fast!)
    r3 = await client.get(url3)  # Reuses same connection (fast!)

# Without connection reuse:
# Request 1: TCP handshake (100ms) + SSL handshake (200ms) + request (500ms) = 800ms
# Request 2: TCP handshake (100ms) + SSL handshake (200ms) + request (500ms) = 800ms
# Request 3: TCP handshake (100ms) + SSL handshake (200ms) + request (500ms) = 800ms
# Total: 2400ms

# With connection reuse:
# Request 1: TCP handshake (100ms) + SSL handshake (200ms) + request (500ms) = 800ms
# Request 2: request (500ms) = 500ms  (connection already open!)
# Request 3: request (500ms) = 500ms  (connection already open!)
# Total: 1800ms (25% faster)
```

```python
# WRONG: Creating a new client per request (slow!)
async def fetch_bad(url: str) -> dict:
    async with httpx.AsyncClient() as client:  # New connection each time
        return (await client.get(url)).json()

# RIGHT: Reuse a single client
async def fetch_good(client: httpx.AsyncClient, url: str) -> dict:
    return (await client.get(url)).json()

async def main():
    async with httpx.AsyncClient() as client:
        # All three requests reuse the same connection
        r1 = await fetch_good(client, url1)
        r2 = await fetch_good(client, url2)
        r3 = await fetch_good(client, url3)
```

### 4. Timeouts and Retries

Network calls fail. Timeouts prevent your system from hanging indefinitely. Retries handle transient failures.

```python
import httpx
import asyncio

async def fetch_with_retry(
    client: httpx.AsyncClient, url: str, max_retries: int = 3
) -> dict:
    # Step 1: Loop to try the request multiple times
    for attempt in range(max_retries):
        try:
            # Step 2: Try to get the data
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
            
        # Step 3: Handle the case where the server takes too long
        except httpx.TimeoutException:
            # If we've run out of retries, actually crash
            if attempt == max_retries - 1:
                raise
            # Otherwise, wait a little bit before trying again
            await asyncio.sleep(2 ** attempt)
            
        # Step 4: Handle server errors (500s) but NOT user errors (400s)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code >= 500 and attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                raise
```

**What's happening:**
```python
for attempt in range(max_retries):  # 0, 1, 2
#          ^^^^^^
#          attempt starts at 0

    await asyncio.sleep(2 ** attempt)
    #                  ^^^^^^^^^^^^
    #                  Exponential backoff:
    #                  attempt=0: sleep 1s  (2**0 = 1)
    #                  attempt=1: sleep 2s  (2**1 = 2)
    #                  attempt=2: last try with max_retries=3 -> re-raises, no sleep
    #                  This avoids hammering a struggling server

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code >= 500:
        #                    ^^^^^^^^^^^^^^
        #                    Only retry on SERVER errors (500, 502, 503, 504)
        #                    Don't retry on CLIENT errors (400, 401, 403, 404)
        #                    Client errors won't succeed on retry
```

The `2 ** attempt` pattern is called exponential backoff — wait 1 second, then 2 (then 4, 8, ... if you allow more attempts). This avoids hammering a struggling server.

### 5. Timeout Configuration

```python
# Step 1: Set specific timeouts for different parts of the request
async with httpx.AsyncClient(
    timeout=httpx.Timeout(
        connect=5.0,   # Max time to establish connection
        read=30.0,     # Max time to read response body
        write=5.0,     # Max time to send request body
        pool=5.0,      # Max time to wait for a connection from the pool
    )
) as client:
    # Step 2: Make the request using our strictly-timed client
    response = await client.get("https://api.example.com/data")
```

**What's happening:**
```python
httpx.Timeout(
    connect=5.0,   # TCP handshake timeout
                   # Too low: can't connect to slow servers
                   # Too high: hangs if server is unreachable

    read=30.0,     # Time to receive the full response body
                   # Important for large responses (LLM completions)
                   # LLM APIs can take 30-60s for long responses

    write=5.0,     # Time to send the request body
                   # Usually fast unless uploading large files

    pool=5.0,      # Time to wait for a free connection from the pool
                   # If all connections are busy, you wait here
                   # Too low: fails under load
)
```

```python
# Per-request timeout override
async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Default: 10 seconds for everything
        
        # Override for this specific request (LLM calls are slow)
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=120.0,  # 2 minutes for LLM response
            json={"model": "gpt-4", "messages": [...]}
        )
```

### 6. Common HTTP Patterns

```python
import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:

        # GET request with query parameters
        response = await client.get(
            "https://api.example.com/sensors",
            params={"type": "temperature", "limit": 10}
        )
        # URL becomes: https://api.example.com/sensors?type=temperature&limit=10

        # POST request with JSON body
        response = await client.post(
            "https://api.example.com/sensors",
            json={"sensor_id": "temp-01", "value": 23.5}
        )

        # POST with custom headers
        response = await client.post(
            "https://api.example.com/agent/execute",
            headers={"Authorization": "Bearer token123"},
            json={"task": "analyze", "data": readings}
        )

        # PUT request (update)
        response = await client.put(
            "https://api.example.com/sensors/temp-01",
            json={"value": 24.0}
        )

        # DELETE request
        response = await client.delete(
            "https://api.example.com/sensors/temp-01"
        )
```

**What's happening:**
```python
# params= adds query parameters to the URL
# json= sends JSON body with Content-Type: application/json
# headers= adds custom headers to the request
#
# httpx automatically:
# - Sets Content-Type: application/json when using json=
# - Does NOT follow redirects unless follow_redirects=True (then up to 20)
# - Handles chunked transfer encoding
# - Decodes gzip/deflate responses
```

### 7. Factory Floor Example: Complete Sensor API Client

```python
import httpx
import asyncio
from typing import Any

class SensorAPIClient:
    """Async client for the factory sensor API."""

    def __init__(self, base_url: str, api_key: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.timeout = timeout

    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        """Internal method with retry logic."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("headers", self.headers)
        kwargs.setdefault("timeout", self.timeout)

        async with httpx.AsyncClient() as client:
            for attempt in range(3):
                try:
                    response = await client.request(method, url, **kwargs)
                    response.raise_for_status()
                    return response.json()
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code >= 500 and attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                    else:
                        raise

    async def get_sensor(self, sensor_id: str) -> dict:
        return await self._request("GET", f"/sensors/{sensor_id}")

    async def list_sensors(self, sensor_type: str | None = None) -> list[dict]:
        params = {}
        if sensor_type:
            params["type"] = sensor_type
        return await self._request("GET", "/sensors", params=params)

    async def create_reading(self, sensor_id: str, value: float) -> dict:
        return await self._request(
            "POST", "/readings",
            json={"sensor_id": sensor_id, "value": value}
        )

async def main():
    client = SensorAPIClient(
        base_url="https://factory-api.example.com",
        api_key="sk-factory-key-123",
        timeout=15.0,
    )

    sensors = await client.list_sensors(sensor_type="temperature")
    print(f"Found {len(sensors)} temperature sensors")

    for sensor in sensors:
        reading = await client.create_reading(sensor["id"], 23.5)
        print(f"Created reading for {sensor['id']}: {reading}")
```

**What's happening:**
```python
class SensorAPIClient:
    def __init__(self, base_url, api_key, timeout=10.0):
        #                 ^^^^^^^^  ^^^^^^^  ^^^^^^
        #                 Stored for all requests
        self.base_url = base_url.rstrip("/")  # Remove trailing slash
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.timeout = timeout

    async def _request(self, method, path, **kwargs):
        url = f"{self.base_url}{path}"
        #              ^^^^^^^^^  ^^^^
        #              Combine base URL with path
        #              e.g., "https://factory-api.example.com" + "/sensors/temp-01"

        async with httpx.AsyncClient() as client:
            # New client per _request call (simplified)
            # Production: use a shared client (see Chapter 1)
            for attempt in range(3):  # Retry up to 3 times
                try:
                    response = await client.request(method, url, **kwargs)
                    #                       ^^^^^^
                    #                       Generic method: GET, POST, PUT, DELETE
                    response.raise_for_status()
                    return response.json()
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code >= 500 and attempt < 2:
                        await asyncio.sleep(2 ** attempt)  # Backoff
                    else:
                        raise  # Don't retry client errors
```

### 8. Common Mistakes

```python
# MISTAKE 1: Forgetting to close the client
async def fetch_bad():
    client = httpx.AsyncClient()
    response = await client.get("https://api.example.com/data")
    return response.json()
    # Client is NEVER closed! Leaks connections.

# FIX: Use async with
async def fetch_good():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()
    # Client is automatically closed when the block exits

# MISTAKE 2: Not checking status codes
async def fetch_bad():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()  # Might fail if status is 404 or 500!

# FIX: Use raise_for_status()
async def fetch_good():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        response.raise_for_status()  # Raises exception for 4xx/5xx
        return response.json()

# MISTAKE 3: Creating new client per request (no connection reuse)
async def fetch_many_bad(urls: list[str]) -> list[dict]:
    results = []
    for url in urls:
        async with httpx.AsyncClient() as client:  # New connection each time!
            response = await client.get(url)
            results.append(response.json())
    return results

# FIX: Reuse client
async def fetch_many_good(urls: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

---

### Summary

Replace `requests` with `httpx.AsyncClient` in async code. Reuse a single client per session for connection pooling. Always set timeouts and implement exponential backoff retries for production reliability.

---

### Quick Reference

| Syntax | Meaning | Example |
|--------|---------|---------|
| `httpx.AsyncClient()` | Create async HTTP client | `async with httpx.AsyncClient() as c:` |
| `client.get()` | Async GET request | `await client.get(url)` |
| `client.post()` | Async POST request | `await client.post(url, json=data)` |
| `client.put()` | Async PUT request | `await client.put(url, json=data)` |
| `client.delete()` | Async DELETE request | `await client.delete(url)` |
| `response.json()` | Parse JSON body | `data = response.json()` |
| `response.raise_for_status()` | Raise on 4xx/5xx | `response.raise_for_status()` |
| `params={}` | URL query parameters | `client.get(url, params={"key": "val"})` |
| `json={}` | JSON request body | `client.post(url, json={"key": "val"})` |
| `headers={}` | Custom headers | `client.get(url, headers={"Auth": "..."})` |
| `httpx.Timeout()` | Timeout configuration | `Timeout(connect=5, read=30)` |
| `2 ** attempt` | Exponential backoff | Wait 1s, 2s, 4s between retries |
| `requests.get()` | Blocking (avoid in async) | `requests.get(url)` — freezes event loop |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Async HTTP**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 async http**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

