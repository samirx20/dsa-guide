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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Which handler catches it?** Using the Section 1 hierarchy, predict what `classify` returns for each exception, or whether the exception escapes:

```python
def classify(exc: Exception) -> str:
    try:
        raise exc
    except LLMRateLimitError:
        return "rate-limit handler"
    except LLMError:
        return "LLM handler"
    except AgentError:
        return "agent handler"

classify(LLMTimeoutError("t"))
classify(SensorReadingError("s"))
classify(LLMRateLimitError("r"))
classify(ToolExecutionError("x"))
classify(ValueError("v"))
```

Bonus: what would change if the `except LLMError:` clause were moved **above** `except LLMRateLimitError:`?

**Q2. Order of `try` / `except` / `else` / `finally`.** Predict every printed line, in order:

```python
def read(x: float) -> float:
    try:
        print("try")
        v = 10 / x
    except ZeroDivisionError:
        print("except")
        return -1
    else:
        print("else")
        return v
    finally:
        print("finally")

print(read(4))
print(read(0))
```

**Q3. A context manager when the body crashes.** Predict the output:

```python
from contextlib import contextmanager

@contextmanager
def motor_guard(name: str):
    print(f"enable {name}")
    try:
        yield
    finally:
        print(f"disable {name}")

try:
    with motor_guard("left"):
        print("drive")
        raise LLMTimeoutError("planner timed out")
        print("unreachable")
except AgentError as e:
    print("caught:", e)
```

**Q4. Chained Results.** Using the chapter's `validate_sensor` (Section 4, "Result with chaining") and the same `match` used in its usage example, predict the line printed for each call:

```python
validate_sensor(250.0, 101.3)
validate_sensor(22.5, -1)
validate_sensor(-60, 400)
validate_sensor(22.5, 101.3)
```

**Q5. Trace `parse_sensor_data`.** Using Section 7's `parse_sensor_data`, give the returned value or the exact `SensorError` message for each input. Also give the type of `e.__cause__` in each error case.

```python
{"sensor_id": "S1", "temperature": "22.5", "humidity": 40}
{"sensor_id": "S1", "temperature": "hot", "humidity": 40}
{"sensor_id": "S1", "temperature": 22.5}
{"sensor_id": "S1", "temperature": 22.5, "humidity": None}
{"sensor_id": "S1", "temperature": 250, "humidity": 40}
```

### Coding Exercises

**E1 (Easy). A motor fault that carries data.** Add `MotorError(AgentError)` and `MotorStallError(MotorError)` to the hierarchy. `MotorStallError.__init__(self, motor_id: str, current_amps: float, limit: float)` must store all three as attributes and produce the message `"<motor_id> stalled: <current_amps> A > <limit> A"`. Then write `check_current(motor_id: str, amps: float, limit: float = 10.0) -> None` that raises it when `amps > limit`.

```python
check_current("left", 8.0)    # returns None
check_current("left", 12.5)   # MotorStallError: left stalled: 12.5 A > 10.0 A
# and in the except block: e.current_amps == 12.5, isinstance(e, AgentError) is True
```

**E2 (Easy–Medium). A motor-safety context manager.** Write `@contextmanager motor_enabled(motor_id: str, log: list[str])`. It appends `"enable <id>"` on entry. If the body raises, it appends `"fault <ExceptionClassName>"` and **re-raises**. It *always* appends `"disable <id>"` last.

```python
log = []
with motor_enabled("left", log):
    log.append("drive")
try:
    with motor_enabled("right", log):
        check_current("right", 15.0)
except MotorStallError:
    pass
log
# ['enable left', 'drive', 'disable left',
#  'enable right', 'fault MotorStallError', 'disable right']
```

**E3 (Medium). Retry with exponential backoff.** Write `retry(fn: Callable[[], T], attempts: int, retry_on: tuple[type[Exception], ...], base_delay: float = 0.5, sleep: Callable[[float], None] = time.sleep) -> T`. Call `fn`. If it raises one of `retry_on`, sleep `base_delay * 2**i` (i = 0, 1, 2, ...) and try again, up to `attempts` calls in total. After the last failed attempt, re-raise that exception unchanged, without sleeping. Exceptions **not** in `retry_on` must propagate immediately, with no retry. (Injecting `sleep` makes it testable: pass `delays.append`.)

```python
# flaky() raises LLMTimeoutError on calls 1 and 2, returns "plan ok" on call 3
delays = []
retry(flaky, 5, (LLMTimeoutError,), sleep=delays.append)   # 'plan ok'
delays                                                      # [0.5, 1.0]
# with a fresh flaky and attempts=2: raises LLMTimeoutError('timeout #2'), delays == [0.5]
# retry(raises_value_error, 3, (LLMError,)) raises ValueError at once, delays == []
```

#### Dry-Run: Answers

**Q1.**

| Raised | Handler that runs | Why |
|--------|-------------------|-----|
| `LLMTimeoutError` | `"LLM handler"` | not a `LLMRateLimitError`, but it **is** an `LLMError` |
| `SensorReadingError` | `"agent handler"` | its chain is `ValidationError` then `AgentError`, and only `AgentError` is listed |
| `LLMRateLimitError` | `"rate-limit handler"` | the first matching clause wins |
| `ToolExecutionError` | `"agent handler"` | a direct child of `AgentError` |
| `ValueError` | **escapes** `classify` | it is not part of the `AgentError` tree |

Bonus: `except` clauses are tested top to bottom, and the first `isinstance` match wins. With `except LLMError:` first, `LLMRateLimitError` would be caught there, and the rate-limit handler would become unreachable dead code. Always list the **most specific** exceptions first.

**Q2.** Output:

```python
try
else
finally
2.5
try
except
finally
-1
```

The `return v` in `else` (and the `return -1` in `except`) *schedules* the return value, then `finally` runs, and only then does the function actually return. That is why `finally` is printed before the caller prints the value.

**Q3.** Output:

```python
enable left
drive
disable left
caught: planner timed out
```

The `raise` inside the `with` block jumps back into the generator at `yield`, so its `finally` disables the motor *before* the exception continues outward to `except AgentError` (which matches, because `LLMTimeoutError` is an `AgentError`). `"unreachable"` is never printed. This is exactly the guarantee you want for actuators.

**Q4.** Output, one line per call:

```python
Validation failed: Temperature validation: Temperature 250.0 out of range
Validation failed: Pressure validation: Pressure -1 out of range
Validation failed: Temperature validation: Temperature -60 out of range
Sensor data: {'temperature': 22.5, 'pressure': 101.3}
```

| Call | `validate_temperature` | `validate_pressure` | Result |
|------|------------------------|---------------------|--------|
| `(250.0, 101.3)` | `Err` ($250 > 200$) | never runs | `Err`, temperature prefix |
| `(22.5, -1)` | `Ok(22.5)` | `Err` ($-1 < 0$) | `Err`, pressure prefix |
| `(-60, 400)` | `Err` ($-60 < -50$) | never runs (so the bad pressure is not reported) | `Err`, temperature prefix |
| `(22.5, 101.3)` | `Ok` | `Ok` | `Ok` dict |

Note that the message shows `-60`, not `-60.0`, because the f-string formats the original `int`. The third row shows a property of this chaining style: it short-circuits and reports only the **first** failure.

**Q5.**

| Input | Result | `e.__cause__` |
|-------|--------|---------------|
| temperature `"22.5"`, humidity `40` | returns `SensorReading(sensor_id='S1', temperature=22.5, humidity=40.0)` | (no error) |
| temperature `"hot"` | `SensorError: Invalid sensor data: could not convert string to float: 'hot'` | `ValueError` |
| no `"humidity"` key | `SensorError: Invalid sensor data: 'humidity'` | `KeyError` |
| humidity `None` | `SensorError: Invalid sensor data: float() argument must be a string or a real number, not 'NoneType'` | `TypeError` |
| temperature `250` | `SensorError: Temperature 250.0 out of range` | `None` (raised directly, not `from` another error) |

`float("22.5")` and `float(40)` succeed, so the first input is accepted and converted. The temperature message prints `250.0` because the value was already converted by `float()`. A side note on Mistake 1: `except Exception` does **not** catch `KeyboardInterrupt` or `SystemExit`, because both inherit from `BaseException` directly (`issubclass(KeyboardInterrupt, Exception)` is `False`). The real danger of a bare `except Exception` is that it swallows every *ordinary* bug, such as a `TypeError` caused by a typo.

**E1 — reference solution**

```python
class MotorError(AgentError):
    pass

class MotorStallError(MotorError):
    def __init__(self, motor_id: str, current_amps: float, limit: float) -> None:
        super().__init__(f"{motor_id} stalled: {current_amps} A > {limit} A")  # sets str(e)
        self.motor_id = motor_id
        self.current_amps = current_amps
        self.limit = limit

def check_current(motor_id: str, amps: float, limit: float = 10.0) -> None:
    if amps > limit:
        raise MotorStallError(motor_id, amps, limit)
```

Storing the numbers as attributes lets a handler react (for example, reduce torque by `e.current_amps - e.limit`) without parsing the message string. Because it inherits from `AgentError`, the existing broad `except AgentError` fallbacks still catch it.

**E2 — reference solution**

```python
from contextlib import contextmanager
from typing import Iterator

@contextmanager
def motor_enabled(motor_id: str, log: list[str]) -> Iterator[None]:
    log.append(f"enable {motor_id}")
    try:
        yield
    except Exception as exc:
        log.append(f"fault {type(exc).__name__}")
        raise                       # never swallow: the caller must still see the fault
    finally:
        log.append(f"disable {motor_id}")
```

Trace for the failing block: `enable right` is logged, then `check_current` raises inside `yield`, then `except` logs `fault MotorStallError` and re-raises, then `finally` logs `disable right`, and then the exception reaches the caller's `except MotorStallError`.

**E3 — reference solution**

```python
import time
from typing import Callable, TypeVar

T = TypeVar("T")

def retry(fn: Callable[[], T], attempts: int, retry_on: tuple[type[Exception], ...],
          base_delay: float = 0.5, sleep: Callable[[float], None] = time.sleep) -> T:
    if attempts < 1:
        raise ValueError("attempts must be >= 1")
    for i in range(attempts):
        try:
            return fn()
        except retry_on:                 # only the listed (transient) errors are retried
            if i == attempts - 1:
                raise                    # out of attempts: re-raise the last error unchanged
            sleep(base_delay * 2 ** i)   # 0.5, 1.0, 2.0, ...
    raise AssertionError("unreachable")
```

| Call # | `i` | `flaky()` | Action |
|--------|-----|-----------|--------|
| 1 | 0 | raises `timeout #1` | sleep $0.5 \cdot 2^0 = 0.5$ |
| 2 | 1 | raises `timeout #2` | sleep $0.5 \cdot 2^1 = 1.0$ |
| 3 | 2 | returns `"plan ok"` | return |

With `attempts=2`, call 2 is the last one (`i == 1`), so it re-raises `timeout #2` and `delays == [0.5]`. A `ValueError` is not in `(LLMError,)`, so the `except` does not match and it propagates on the first call. Worst-case total wait is $\sum_{i=0}^{n-2} b \cdot 2^i = b\,(2^{n-1} - 1)$.

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

