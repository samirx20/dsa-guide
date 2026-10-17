# Part 0, Topic 1: Python Systems Basics
## Chapter 3: Error Handling

**Prerequisite Knowledge:** Basic Python syntax, understanding of functions, and general awareness of what an error or "crash" is in programming.

---

### The "Safety Net" Analogy (Expanded)

Imagine watching trapeze artists at a circus. Sometimes, despite their best efforts, they slip. If there's no safety net, the show is over in disaster. But with a safety net, the acrobat bounces back safely, the ringmaster announces a quick pause, and the show continues. Error handling is the safety net for your code. It catches mistakes so your program can gracefully recover instead of completely crashing.

```
┌──────────────────────────────────────────────────────────────┐
│           WITHOUT vs WITH ERROR HANDLING                      │
│                                                              │
│  WITHOUT (crash):          WITH (graceful):                  │
│  ┌────────────────┐       ┌────────────────┐                 │
│  │ Sensor reads   │       │ Sensor reads   │                 │
│  │ temp = 999°C   │       │ temp = 999°C   │                 │
│  │        │       │       │        │       │                 │
│  │        ▼       │       │        ▼       │                 │
│  │ Compare to     │       │ try: compare   │                 │
│  │ threshold...   │       │ except: log    │                 │
│  │        │       │       │        │       │                 │
│  │        ▼       │       │        ▼       │                 │
│  │ 💥 CRASH!      │       │ Alert sent,    │                 │
│  │ Everything     │       │ system continues│                │
│  │ stops.         │       │ (safety net)   │                 │
│  └────────────────┘       └────────────────┘                 │
│                                                              │
│  In an agentic pipeline:                                     │
│  • LLM can hallucinate a function name                       │
│  • Sensor API can time out                                   │
│  • Validation rule can reject an output                      │
│  All in a SINGLE request!                                    │
└──────────────────────────────────────────────────────────────┘
```

In an agentic pipeline, an LLM can hallucinate a function name, a sensor API can time out, and a validation rule can reject an output — all in a single request. Industrial-grade error handling means your system degrades gracefully instead of crashing.

---

### 1. Custom Exception Hierarchies

Instead of catching bare `Exception`, define a hierarchy that matches your domain. This lets callers handle specific failure modes.

```python
# Step 1: Create a base error for our whole system
class AgentError(Exception):
    """Base exception for all agent-related failures"""
    pass

# Step 2: Create more specific errors that inherit from the base error
class LLMError(AgentError):
    """Base exception for LLM call failures"""
    pass

# Step 3: Create highly specific errors for exact scenarios
class LLMRateLimitError(LLMError):
    pass

class LLMTimeoutError(LLMError):
    pass

class ValidationError(AgentError):
    """Base exception for data validation failures"""
    pass

class SensorReadingError(ValidationError):
    pass

class ToolExecutionError(AgentError):
    pass
```

**What's happening:**
```python
class AgentError(Exception):
#            ^^^^^^^^^^^
#            Inherits from Python's built-in Exception class
#            This is the ROOT of our error hierarchy
#            Every error in our system inherits from this
    pass
#   ^^^^
#   We're not adding any behavior — just creating a named type
#   This lets us catch ALL agent errors with: except AgentError

class LLMError(AgentError):
#             ^^^^^^^^^^^
#             Inherits from AgentError (not Exception!)
#             This means: LLMError IS an AgentError
#             You can catch it as either LLMError OR AgentError

class LLMRateLimitError(LLMError):
#                     ^^^^^^^^
#                     Inherits from LLMError
#                     Most specific error — for rate limit issues only
    pass

# The hierarchy:
# Exception
# └── AgentError
#     ├── LLMError
#     │   ├── LLMRateLimitError
#     │   └── LLMTimeoutError
#     ├── ValidationError
#     │   └── SensorReadingError
#     └── ToolExecutionError
```

```
┌──────────────────────────────────────────────────────────────┐
│              EXCEPTION HIERARCHY                              │
│                                                              │
│  Exception (Python built-in)                                 │
│  └── AgentError (our base)                                   │
│      ├── LLMError (LLM-related)                              │
│      │   ├── LLMRateLimitError (too many requests)           │
│      │   └── LLMTimeoutError (took too long)                 │
│      ├── ValidationError (data problems)                     │
│      │   └── SensorReadingError (bad sensor data)            │
│      └── ToolExecutionError (tool failed)                    │
│                                                              │
│  When you catch AgentError, you catch ALL of them.           │
│  When you catch LLMRateLimitError, you catch ONLY that one.  │
└──────────────────────────────────────────────────────────────┘
```

**Why hierarchy matters — catching at the right level:**
```python
# Catch specific errors when you need specific handling:
try:
    result = await call_llm(prompt)
except LLMRateLimitError:
    # Wait and retry — only for rate limits
    await asyncio.sleep(60)
    result = await call_llm(prompt)
except LLMTimeoutError:
    # Use a shorter prompt — only for timeouts
    result = await call_llm(short_prompt)
except LLMError:
    # Any other LLM error — log and re-raise
    logger.exception("LLM failed")
    raise

# Catch broad errors for general fallback:
try:
    result = await call_llm(prompt)
except AgentError:
    # ANY agent error — return a safe default
    return "System temporarily unavailable"
```

---

### 2. `try` / `except` / `else` / `finally`

```python
import httpx

async def call_llm(prompt: str) -> str:
    # Step 1: Try doing the risky thing
    try:
        response = await client.post(url, json={"prompt": prompt})
        
    # Step 2: Catch specific errors if the risky thing fails
    except httpx.TimeoutException as exc:
        # We translate the third-party error into our custom error
        raise LLMTimeoutError(f"LLM timed out after 30s: {exc}") from exc
        
    except httpx.HTTPStatusError as exc:
        # We catch bad status codes like 404 or 500
        raise LLMError(f"LLM returned {exc.response.status_code}") from exc
        
    # Step 3: The 'else' block runs ONLY if the 'try' block succeeds
    else:
        return response.json()["content"]
        
    # Step 4: The 'finally' block ALWAYS runs, successful or not
    finally:
        # Use for cleanup: close connections, free resources
        pass
```

**What's happening:**
```python
try:
    response = await client.post(url, json={"prompt": prompt})
#   ^^^^^^^
#   This is the "risky" code — it might fail
#   If it succeeds → goes to `else` block
#   If it fails → goes to `except` block

except httpx.TimeoutException as exc:
#       ^^^^^^^^^^^^^^^^^^^^^^  ^^^^
#       |                       └── exc is the exception object (has details)
#       └── Catch ONLY TimeoutException (not all errors!)
    raise LLMTimeoutError(f"LLM timed out after 30s: {exc}") from exc
#   ^^^^^                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     ^^^^
#   |                       |                                    |
#   |                       |                                    └── "from exc" chains
#   |                       |                                       the original error
#   |                       └── Our custom error message
#   └── Raise a new exception (wrapping the original)
#       This is called "exception chaining" — preserves the original error

else:
    return response.json()["content"]
#   ^^^^
#   Runs ONLY if try succeeded (no exception was raised)
#   This is different from putting code inside the try block!
#   Code in `else` won't accidentally catch exceptions you didn't mean to catch

finally:
    pass
#   ^^^^
#   Runs ALWAYS — success or failure
#   Used for cleanup: closing files, releasing connections, etc.
#   This is like a "finally" in the circus — the net is always there
```

**try/except flow:**
```
┌──────────────────────────────────────────────────────────────┐
│              try/except/else/finally FLOW                     │
│                                                              │
│  ┌──────────────┐                                            │
│  │ try:         │                                            │
│  │ risky code   │                                            │
│  └──────┬───────┘                                            │
│         │                                                    │
│    ┌────┴────┐                                               │
│    │         │                                               │
│  Success   Failure                                           │
│    │         │                                               │
│    ▼         ▼                                               │
│  ┌──────┐  ┌──────────┐                                     │
│  │ else:│  │ except:  │                                     │
│  │ safe │  │ handle   │                                     │
│  │ code │  │ error    │                                     │
│  └──┬───┘  └────┬─────┘                                     │
│     │           │                                            │
│     └─────┬─────┘                                            │
│           ▼                                                  │
│     ┌──────────┐                                             │
│     │ finally: │                                             │
│     │ cleanup  │  ← ALWAYS runs                              │
│     └──────────┘                                             │
└──────────────────────────────────────────────────────────────┘
```

---

### 3. Context Managers for Cleanup

Context managers guarantee cleanup runs even if exceptions occur. The `with` statement is the simplest form.

```python
from contextlib import contextmanager
import time

# Step 1: Define a context manager using the decorator
@contextmanager
def timer(label: str):
    # This happens BEFORE the indented block
    start = time.perf_counter()
    try:
        # 'yield' hands control back to the indented block
        yield
    finally:
        # This happens AFTER the indented block, even if it crashed
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.3f}s")

# Step 2: Use the context manager with the 'with' keyword
with timer("LLM call"):
    # Control jumps to the 'yield' above, runs this, then jumps back
    result = await call_llm("What is the engine temperature?")
```

**What's happening:**
```python
@contextmanager
def timer(label: str):
    start = time.perf_counter()
    # Record the start time BEFORE the code runs
    
    try:
        yield
        # yield PAUSES this function
        # Control jumps to the code inside `with timer("LLM call"):`
        # When that code finishes (or crashes), control comes back HERE
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.3f}s")
        # This runs AFTER the with block, even if it raised an exception!

# The flow:
# 1. with timer("LLM call"): is entered
# 2. timer() runs up to `yield`
# 3. Control goes to the code inside `with`
# 4. Code inside `with` runs (might raise exception)
# 5. Control returns to timer() after `yield`
# 6. `finally` block runs (cleanup)
# 7. timer() returns
```

**Built-in context managers:**
```python
# File handling — automatically closes file
with open("data.json", "r") as f:
    data = f.read()
# File is automatically closed, even if an exception occurs

# Database connection — automatically closes connection
with sqlite3.connect("factory.db") as conn:
    cursor = conn.execute("SELECT * FROM sensors")
# Connection is automatically closed

# Temporary directory — automatically deleted
import tempfile
with tempfile.TemporaryDirectory() as tmpdir:
    # tmpdir is a temporary folder
    pass
# Folder is automatically deleted when the block ends
```

**Custom context manager as a class:**
```python
class DatabaseConnection:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None

    def __enter__(self):
        # Runs when you enter `with` block
        self.conn = sqlite3.connect(self.db_path)
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Runs when you leave `with` block (even if exception!)
        # exc_type, exc_val, exc_tb are the exception details (or None)
        if self.conn:
            self.conn.close()
        return False  # Don't suppress exceptions

# Usage
with DatabaseConnection("factory.db") as conn:
    conn.execute("INSERT INTO sensors VALUES (?, ?)", ("S-001", 22.5))
# Connection is automatically closed, even if the insert fails!
```

---

### 4. The Result Pattern — Errors as Values

Sometimes you do not want exceptions at all. The Result pattern wraps success and failure in a single return value, forcing the caller to handle both paths explicitly.

```python
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
E = TypeVar("E")

# Step 1: Define a "Success" wrapper
@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    value: T

# Step 2: Define a "Failure" wrapper
@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    error: E

# A Result can be EITHER a Success OR a Failure
Result = Ok[T] | Err[E]

def validate_temperature(temp: float) -> Result[float, str]:
    # Check for failure conditions
    if temp < -50 or temp > 200:
        return Err(f"Temperature {temp} out of valid range [-50, 200]")
    # If all good, return success
    return Ok(temp)

# Step 3: Force the caller to handle both possibilities
match validate_temperature(42.5):
    case Ok(value=temp):
        print(f"Valid temperature: {temp}")
    case Err(error=msg):
        print(f"Validation failed: {msg}")
```

**What's happening:**
```python
@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
#           ^^^^^^^^^
#           Generic — works with any type T
    value: T
#   ^^^^^  ^
#   |      └── The success value (could be int, str, dict, anything)
#   └── Field name

@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    error: E
#   ^^^^^  ^
#   |      └── The error value (could be str, Exception, anything)
#   └── Field name

Result = Ok[T] | Err[E]
#        ^^^   ^^^
#        |     └── OR Err with error type E
#        └── OR Ok with value type T
# Result is a UNION type — either Ok or Err

# When you use match/case:
match validate_temperature(42.5):
    case Ok(value=temp):
        # temp = 42.5 (the success value)
        print(f"Valid temperature: {temp}")
    case Err(error=msg):
        # msg = the error string
        print(f"Validation failed: {msg}")
# The match statement FORCES you to handle both cases!
# If you forget one, mypy will warn you
```

**Result vs Exceptions — when to use which:**
```
┌──────────────────────────────────────────────────────────────┐
│           RESULT vs EXCEPTIONS                               │
│                                                              │
│  EXCEPTIONS:                                                 │
│  ✅ Good for: Unexpected errors (network down, file missing) │
│  ✅ Good for: Errors that propagate up the call stack        │
│  ✅ Good for: Errors you want to handle in one place         │
│  ❌ Bad for: Expected failures (validation, parsing)         │
│  ❌ Bad for: Control flow (don't use exceptions for if/else) │
│                                                              │
│  RESULT:                                                     │
│  ✅ Good for: Expected failures (validation, parsing)        │
│  ✅ Good for: Forcing callers to handle errors               │
│  ✅ Good for: Composing error handling (map, and_then)       │
│  ❌ Bad for: Unexpected errors (still use exceptions)        │
│  ❌ Bad for: Deep call stacks (verbose)                      │
└──────────────────────────────────────────────────────────────┘
```

**Result with chaining:**
```python
def validate_temperature(temp: float) -> Result[float, str]:
    if temp < -50 or temp > 200:
        return Err(f"Temperature {temp} out of range")
    return Ok(temp)

def validate_pressure(pressure: float) -> Result[float, str]:
    if pressure < 0 or pressure > 300:
        return Err(f"Pressure {pressure} out of range")
    return Ok(pressure)

def validate_sensor(temp: float, pressure: float) -> Result[dict, str]:
    # Chain validations — if any fails, return the error
    match validate_temperature(temp):
        case Err(error=msg):
            return Err(f"Temperature validation: {msg}")
        case Ok(value=valid_temp):
            pass  # Temperature is valid, continue

    match validate_pressure(pressure):
        case Err(error=msg):
            return Err(f"Pressure validation: {msg}")
        case Ok(value=valid_pressure):
            pass  # Pressure is valid, continue

    return Ok({"temperature": valid_temp, "pressure": valid_pressure})

# Usage
match validate_sensor(22.5, 101.3):
    case Ok(value=data):
        print(f"Sensor data: {data}")
    case Err(error=msg):
        print(f"Validation failed: {msg}")
```

---

### 5. Logging Best Practices

Never use `print()` in production code. Use the `logging` module with structured context.

```python
import logging

# Step 1: Set up a logger for this specific component
logger = logging.getLogger("factory_agent")

async def run_pipeline(query: str) -> str:
    # Step 2: Log what we are about to do, passing extra context
    logger.info("Pipeline started", extra={"query": query})
    try:
        result = await call_llm(query)
        # Step 3: Log success
        logger.info("Pipeline completed", extra={"result_length": len(result)})
        return result
    except LLMError:
        # Step 4: logger.exception automatically includes the traceback (the error details)
        logger.exception("LLM call failed")
        raise
```

**What's happening:**
```python
logger = logging.getLogger("factory_agent")
#       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#       Create a named logger for our component
#       The name helps filter logs by component:
#         "factory_agent" → logs from our agent
#         "factory_api"   → logs from the API

logger.info("Pipeline started", extra={"query": query})
#          ^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^
#          |                    |
#          |                    └── Extra context attached to the log
#          |                        Shows as: query=What is the temp?
#          └── Log level: info (normal operation)
#
# Log levels (most to least severe):
#   CRITICAL → ERROR → WARNING → INFO → DEBUG

logger.exception("LLM call failed")
#              ^^^^^^^^^^^^^^^^^^
#              .exception() = .error() + automatic traceback
#              It logs the ERROR level message PLUS the full error details
#              You don't need to pass the exception object — it's captured automatically
```

**Logging levels:**
```python
logger.debug("Received raw data: %s", raw_data)     # Detailed debugging info
logger.info("Processing sensor %s", sensor_id)       # Normal operation
logger.warning("Sensor %s reading is high", sensor_id) # Something unexpected
logger.error("Failed to connect to API")             # Something broke
logger.critical("System shutdown imminent")           # Critical failure
```

**Common mistake — using print:**
```python
# ❌ WRONG: print() in production
print(f"Processing sensor {sensor_id}")  # No level, no timestamp, no context
print(f"Error: {e}")                     # No traceback, no logger name

# ✅ RIGHT: logging
logger.info("Processing sensor %s", sensor_id)
logger.exception("Error processing sensor: %s", sensor_id)
```

---

### 6. Common Mistakes

```python
# MISTAKE 1: Catching bare Exception (too broad)
try:
    result = call_llm(prompt)
except Exception:
    # This catches EVERYTHING — even KeyboardInterrupt, SystemExit
    # You might swallow critical errors
    pass

# FIX: Catch specific exceptions
try:
    result = call_llm(prompt)
except LLMError:
    # Only catch LLM-related errors
    logger.exception("LLM call failed")
    raise

# MISTAKE 2: Swallowing exceptions silently
try:
    result = call_llm(prompt)
except LLMError:
    pass  # ❌ Exception disappears — you'll never know what went wrong!

# FIX: At minimum, log the exception
try:
    result = call_llm(prompt)
except LLMError:
    logger.exception("LLM call failed")  # ✅ Error is recorded

# MISTAKE 3: Using exceptions for control flow
# ❌ WRONG: Using try/except as if/else
try:
    value = my_dict["key"]
except KeyError:
    value = "default"

# ✅ RIGHT: Use .get() for expected missing keys
value = my_dict.get("key", "default")

# MISTAKE 4: Forgetting to re-raise
try:
    result = call_llm(prompt)
except LLMError:
    logger.error("LLM failed")
    # Forgot to raise! The caller doesn't know it failed!
    return None  # ❌ Caller thinks it succeeded with None

# FIX: Re-raise after logging
try:
    result = call_llm(prompt)
except LLMError:
    logger.exception("LLM failed")
    raise  # ✅ Caller knows it failed
```

---

### 7. Error Handling in Real Factory Code

```python
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("factory_agent")

class AgentError(Exception):
    pass

class SensorError(AgentError):
    pass

class LLMError(AgentError):
    pass

@dataclass
class SensorReading:
    sensor_id: str
    temperature: float
    humidity: float

def parse_sensor_data(raw: dict) -> SensorReading:
    """Parse raw sensor data with validation."""
    try:
        sensor_id = raw["sensor_id"]
        temperature = float(raw["temperature"])
        humidity = float(raw["humidity"])
    except (KeyError, ValueError, TypeError) as e:
        raise SensorError(f"Invalid sensor data: {e}") from e

    if temperature < -50 or temperature > 200:
        raise SensorError(f"Temperature {temperature} out of range")

    return SensorReading(sensor_id, temperature, humidity)

async def process_reading(raw_data: dict) -> Optional[SensorReading]:
    """Process a single sensor reading with full error handling."""
    try:
        reading = parse_sensor_data(raw_data)
        logger.info("Parsed reading: %s", reading)
        return reading
    except SensorError:
        logger.exception("Failed to parse sensor data")
        return None
    except Exception:
        logger.exception("Unexpected error processing reading")
        raise
```

---

### Summary

Define custom exception hierarchies for your domain, use `try/except/else/finally` for structured error handling, context managers for cleanup, the Result pattern when you want errors as values instead of exceptions, and structured logging instead of print statements.

**Key takeaways:**
- Define custom exception hierarchies (AgentError → LLMError → LLMTimeoutError)
- Use `try/except/else/finally` — each block has a purpose
- `else` runs only on success, `finally` always runs
- Context managers guarantee cleanup
- Result pattern forces explicit error handling
- Never use `print()` — use `logging` with levels
- Never catch bare `Exception` — catch specific types
- Always re-raise or log caught exceptions

---

### Quick Reference Table

| Syntax | Purpose | Example |
|--------|---------|---------|
| `class MyError(Exception)` | Custom exception | `class SensorError(Exception):` |
| `try: ... except E:` | Catch specific error | `except LLMError:` |
| `except E as exc:` | Capture exception object | `except ValueError as e:` |
| `else:` | Runs on success | `else: return result` |
| `finally:` | Always runs | `finally: close()` |
| `raise E(msg) from exc` | Chain exceptions | `raise LLMError("fail") from exc` |
| `@contextmanager` | Custom cleanup | `with timer("op"):` |
| `Ok(value)` / `Err(error)` | Result pattern | `match result: case Ok(v):` |
| `logger.info()` | Log info | `logger.info("Done")` |
| `logger.exception()` | Log error + traceback | `logger.exception("Failed")` |
| `raise` | Re-raise current exception | `except E: raise` |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Error Handling**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter6 error handling**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

