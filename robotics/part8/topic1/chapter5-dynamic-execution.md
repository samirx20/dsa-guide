# Part 3, Topic 2: Function Routing
## Chapter 2: Dynamic Execution

**Prerequisite Knowledge:** The Chat Completions API, Tool Calling, and basic Python error handling.

---

### The 'Switchboard Operator' Analogy

Imagine the AI is a boss giving commands over a telephone, and your code is the old-school switchboard operator connecting the wires. The AI says, "Run the 'read_sensor' function with arguments X and Y." The AI doesn't actually press any buttons; it just yells into the phone.

```
    ┌─────────────────────────────────────────────────────┐
    │              SWITCHBOARD OPERATOR                    │
    │                                                     │
    │  AI: "Call read_sensor with sensor_id=T-01"         │
    │                                                     │
    │  Operator (your code):                              │
    │    1. Hear the name "read_sensor"                   │
    │    2. Look up which wire goes to read_sensor        │
    │    3. Plug it in                                    │
    │    4. Pass the arguments through                    │
    │    5. Return the result to the AI                   │
    │                                                     │
    │  AI: "Call delete_all_data"                         │
    │                                                     │
    │  Operator: "Sorry, that line is disconnected."      │
    │            (function not in allowlist)               │
    └─────────────────────────────────────────────────────┘
```

Your code (the switchboard operator) has to hear the name "read_sensor", look up which wire goes to the real `read_sensor` python function, plug it in, and pass the arguments through. If the AI asks for a function that doesn't exist, the operator safely replies, "Sorry, that line is disconnected," instead of blowing up the switchboard. Dynamic execution is how we safely connect AI text strings to real Python code.

An LLM outputs a function name as a string and arguments as JSON. You must map that string to a real Python function and execute it safely. Dynamic execution is the bridge between LLM output and real-world side effects.

---

### 1. The Registry Pattern

A registry maps function names to callables. The LLM outputs a name, you look it up, and call it.

```python
class FunctionRegistry:
    def __init__(self):
        # A dictionary holding our function names and the functions themselves
        self._functions = {}

    def register(self, name: str, func):
        self._functions[name] = func
        return self

    def get(self, name: str):
        # Returns the function if it exists, otherwise None
        return self._functions.get(name)

    def list_functions(self) -> list[str]:
        return list(self._functions.keys())

registry = FunctionRegistry()

def read_cpu() -> dict:
    return {"cpu_percent": 45.2}

def read_memory() -> dict:
    return {"memory_gb": 8.5, "total_gb": 16.0}

# Add our functions to the registry
registry.register("read_cpu", read_cpu)
registry.register("read_memory", read_memory)

print(f"Available: {registry.list_functions()}")

# Look up the function by its string name
func = registry.get("read_cpu")
print(f"Found: {func}")

# Execute the function we found
print(f"Result: {func()}")
```

**What's happening:**
```python
self._functions = {}
#  ^^^^^^^^^^^^^
#  └── Private dictionary: maps string names → Python callables
#      "read_cpu" → <function read_cpu>
#      "read_memory" → <function read_memory>

registry.register("read_cpu", read_cpu)
#                  ^^^^^^^^   ^^^^^^^^
#                  |          └── The actual Python function object
#                  └── The string name the LLM will generate

func = registry.get("read_cpu")
#      ^^^^^^^^^^^^^^^^^^^^^^^
#      └── Returns the function object (or None if not found)

func()  # Call it like any normal function
```

Output:
```
Available: ['read_cpu', 'read_memory']
Found: <function read_cpu at 0x...>
Result: {'cpu_percent': 45.2}
```

---

### 2. Safe Argument Parsing

LLM arguments come as a JSON string. Parse them and pass to the function as keyword arguments.

```python
import json

def execute_from_llm(registry: FunctionRegistry, name: str, args_json: str) -> dict:
    # 1. Ensure the function exists
    func = registry.get(name)
    if func is None:
        return {"error": f"Unknown function: {name}"}

    # 2. Try to parse the JSON arguments safely
    try:
        args = json.loads(args_json)
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON arguments: {e}"}

    # 3. Try to run the function with the parsed arguments
    try:
        # **args unpacks the dictionary into named arguments
        result = func(**args)
        return {"status": "ok", "result": result}
    except TypeError as e:
        return {"error": f"Argument mismatch: {e}"}
    except Exception as e:
        return {"error": f"Execution failed: {e}"}

def read_sensor(sensor_id: str, metric: str = "temperature") -> dict:
    return {"sensor_id": sensor_id, metric: 72.5}

registry = FunctionRegistry()
registry.register("read_sensor", read_sensor)

print(execute_from_llm(registry, "read_sensor", '{"sensor_id": "T-01"}'))
print(execute_from_llm(registry, "read_sensor", '{"sensor_id": "T-01", "metric": "humidity"}'))
print(execute_from_llm(registry, "unknown_func", '{}'))
print(execute_from_llm(registry, "read_sensor", 'not json'))
```

**What's happening:**
```python
args = json.loads(args_json)
#     ^^^^^^^^^^^^^^^^^^^^^^
#     └── Parse JSON string into Python dict
#         '{"sensor_id": "T-01"}' → {"sensor_id": "T-01"}

result = func(**args)
#        ^^^^
#        └── Unpacks dict into keyword arguments
#            func(**{"sensor_id": "T-01"})
#            is the same as:
#            func(sensor_id="T-01")
```

Output:
```
{'status': 'ok', 'result': {'sensor_id': 'T-01', 'metric': 72.5}}
{'status': 'ok', 'result': {'sensor_id': 'T-01', 'metric': 72.5}}
{'error': 'Unknown function: unknown_func'}
{'error': 'Invalid JSON arguments: Expecting value: line 1 column 1 (char 0)'}
```

Every failure path returns a structured error. The system never crashes.

### Error Handling Comparison

| Input | Error Type | Handling |
|-------|-----------|---------|
| Wrong function name | `func is None` | Return error dict |
| Bad JSON | `JSONDecodeError` | Return error dict |
| Wrong argument names | `TypeError` | Return error dict |
| Function raises exception | `Exception` | Return error dict |
| Valid input | None | Return result dict |

---

### 3. Timeout Guards

Functions may hang. Wrap execution with a timeout so a bad tool call doesn't freeze the AI forever.

```python
import signal
from functools import wraps

def timeout(seconds: int):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Define what happens when the alarm rings
            def handler(signum, frame):
                raise TimeoutError(f"Function timed out after {seconds}s")

            # Set the alarm
            old_handler = signal.signal(signal.SIGALRM, handler)
            signal.alarm(seconds)

            try:
                # Try running the function
                return func(*args, **kwargs)
            finally:
                # Turn off the alarm when finished
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old_handler)

        return wrapper
    return decorator

@timeout(2)
def slow_function():
    import time
    time.sleep(5)
    return "done"

try:
    result = slow_function()
    print(f"Result: {result}")
except TimeoutError as e:
    print(f"Timeout: {e}")
```

**What's happening:**
```python
@timeout(2)
def slow_function():
#  ^^^^^^^^^
#  └── Sets a 2-second alarm
#      If the function takes longer than 2s, TimeoutError is raised

# Execution flow:
#   1. Set SIGALRM to fire in 2 seconds
#   2. Run the function
#   3. If function finishes in time → cancel alarm, return result
#   4. If alarm fires first → handler raises TimeoutError
#   5. finally block always cleans up the alarm
```

Output:
```
Timeout: Function timed out after 2s
```

On systems without `SIGALRM` (Windows), use `threading.Timer` or `concurrent.futures.ThreadPoolExecutor` with a timeout instead.

### Cross-Platform Timeout (Windows Compatible)

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

def timeout_platform(seconds: int):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(func, *args, **kwargs)
                try:
                    return future.result(timeout=seconds)
                except FuturesTimeout:
                    raise TimeoutError(f"Function timed out after {seconds}s")
        return wrapper
    return decorator

@timeout_platform(2)
def slow_function():
    import time
    time.sleep(5)
    return "done"

try:
    result = slow_function()
except TimeoutError as e:
    print(f"Timeout: {e}")
```

Output:
```
Timeout: Function timed out after 2s
```

---

### 4. The FunctionRouter Class

Combine registry, execution, and error handling into a single router.

```python
import json
from typing import Callable

class FunctionRouter:
    def __init__(self):
        self._registry: dict[str, Callable] = {}
        self._log: list[dict] = []

    def register(self, name: str, func: Callable, description: str = "") -> "FunctionRouter":
        self._registry[name] = {"func": func, "description": description}
        return self

    def execute(self, name: str, arguments: str) -> dict:
        entry = {"function": name, "arguments": arguments}

        # Validate function
        if name not in self._registry:
            entry["status"] = "error"
            entry["error"] = f"Unknown function: {name}"
            self._log.append(entry)
            return entry

        # Parse JSON
        try:
            args = json.loads(arguments)
        except json.JSONDecodeError as e:
            entry["status"] = "error"
            entry["error"] = f"Invalid JSON: {e}"
            self._log.append(entry)
            return entry

        # Execute Function
        try:
            result = self._registry[name]["func"](**args)
            entry["status"] = "ok"
            entry["result"] = result
        except Exception as e:
            entry["status"] = "error"
            entry["error"] = str(e)

        self._log.append(entry)
        return entry

    def get_log(self) -> list[dict]:
        return list(self._log)

router = FunctionRouter()
router.register("read_cpu", lambda: {"cpu_percent": 45.2}, "Read CPU usage")
router.register("read_memory", lambda: {"used_gb": 8.5}, "Read memory usage")
router.register("list_processes", lambda: ["python", "nginx"], "List processes")

print(router.execute("read_cpu", "{}"))
print(router.execute("read_memory", "{}"))
print(router.execute("unknown", "{}"))
print(router.execute("read_cpu", "bad json"))
print(f"\nLog: {len(router.get_log())} entries")
```

**What's happening:**
```python
class FunctionRouter:
    def __init__(self):
        self._registry: dict[str, Callable] = {}
        #  ^^^^^^^^^^^^^
        #  └── Maps names to {"func": callable, "description": str}

        self._log: list[dict] = []
        #  ^^^^^^
        #  └── Records every execution attempt (for auditing)

    def execute(self, name: str, arguments: str) -> dict:
        entry = {"function": name, "arguments": arguments}
        #  ^^^^^
        #  └── Every result includes what was called and with what
        #      This makes debugging trivial

        # Three possible outcomes:
        # 1. Function not found → {"status": "error", "error": "Unknown function: ..."}
        # 2. Bad JSON → {"status": "error", "error": "Invalid JSON: ..."}
        # 3. Success → {"status": "ok", "result": ...}
        # 4. Runtime error → {"status": "error", "error": "..."}
```

Output:
```
{'function': 'read_cpu', 'arguments': '{}', 'status': 'ok', 'result': {'cpu_percent': 45.2}}
{'function': 'read_memory', 'arguments': '{}', 'status': 'ok', 'result': {'used_gb': 8.5}}
{'function': 'unknown', 'arguments': '{}', 'status': 'error', 'error': 'Unknown function: unknown'}
{'function': 'read_cpu', 'arguments': 'bad json', 'status': 'error', 'error': 'Invalid JSON: ...'}

Log: 4 entries
```

### Router Architecture

```
    ┌─────────────────────────────────────────────────────┐
    │                FUNCTION ROUTER                       │
    │                                                     │
    │  LLM Output:                                        │
    │    name: "read_cpu"                                 │
    │    arguments: '{"core": 0}'                         │
    │                                                     │
    │  ┌──────────────┐   ┌──────────────┐               │
    │  │ REGISTRY     │   │ AUDIT LOG    │               │
    │  │              │   │              │               │
    │  │ read_cpu ────┼───┼→ Entry 1    │               │
    │  │ read_memory  │   │              │               │
    │  │ list_procs   │   │              │               │
    │  └──────┬───────┘   └──────────────┘               │
    │         │                                           │
    │    lookup by name                                   │
    │         │                                           │
    │    ┌────▼────┐                                      │
    │    │ func(** │  Parse JSON → kwargs → call function │
    │    │  args)  │                                      │
    │    └────┬────┘                                      │
    │         │                                           │
    │    ┌────▼────────────────────────┐                  │
    │    │ Result or Error (always)    │                  │
    │    └─────────────────────────────┘                  │
    └─────────────────────────────────────────────────────┘
```

---

### 5. Sandboxing Considerations

Never execute arbitrary code from the LLM. Only call pre-registered functions with validated arguments.

```python
class SafeRouter(FunctionRouter):
    def __init__(self, allowed_functions: set[str]):
        super().__init__()
        self._allowed = allowed_functions

    def execute(self, name: str, arguments: str) -> dict:
        # Check against an explicit allowlist
        if name not in self._allowed:
            return {"status": "rejected", "error": f"Function '{name}' is not in the allowed set"}
        return super().execute(name, arguments)

safe = SafeRouter({"read_cpu", "read_memory"})
safe.register("read_cpu", lambda: {"cpu": 45})
safe.register("read_memory", lambda: {"mem": 8})
safe.register("delete_all", lambda: "deleted") # Registered, but NOT allowed!

print(safe.execute("read_cpu", "{}"))
print(safe.execute("delete_all", "{}"))
```

**What's happening:**
```python
class SafeRouter(FunctionRouter):
    def __init__(self, allowed_functions: set[str]):
        super().__init__()
        self._allowed = allowed_functions
        #  ^^^^^^^^^^
        #  └── EXPLICIT allowlist — only these functions can be called
        #      Even if a function is registered, it must be in the allowlist

    def execute(self, name: str, arguments: str) -> dict:
        if name not in self._allowed:
            return {"status": "rejected", ...}
            #  ^^^^^^^^^
            #  └── Double protection: registry check + allowlist check
        return super().execute(name, arguments)
```

Output:
```
{'function': 'read_cpu', 'arguments': '{}', 'status': 'ok', 'result': {'cpu': 45}}
{'status': 'rejected', 'error': "Function 'delete_all' is not in the allowed set"}
```

The allowlist prevents the LLM from calling dangerous functions even if it generates their names.

---

### Quick Reference

| Component | Purpose | Example |
|-----------|---------|---------|
| `FunctionRegistry` | Maps names to callables | `registry.register("read_cpu", read_cpu)` |
| `FunctionRegistry.get()` | Looks up function by name | `registry.get("read_cpu")` |
| `json.loads(args_json)` | Parses LLM JSON arguments | `'{"id": "T-01"}'` → `{"id": "T-01"}` |
| `func(**args)` | Calls function with kwargs | `func(sensor_id="T-01")` |
| `timeout(seconds)` | Prevents hanging functions | `@timeout(5)` decorator |
| `FunctionRouter` | Registry + execution + logging | `router.execute("read_cpu", "{}")` |
| `SafeRouter` | Adds allowlist protection | `SafeRouter({"read_cpu", "read_memory"})` |
| `router.get_log()` | Returns all execution records | `list[dict]` of past calls |

---

### Summary

Dynamic execution maps LLM string outputs to Python functions via a registry pattern. Parse JSON arguments safely, handle every error path, and log all executions. Use timeout guards for untrusted functions. Maintain an allowlist to prevent the LLM from calling unauthorized functions. This gives you controlled, auditable execution of LLM-generated commands. The key principle: never trust the LLM's output — validate, sandbox, and log everything.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. `execute_from_llm` paths.** With the chapter's `registry` (only `read_sensor(sensor_id, metric="temperature")`, which returns `{"sensor_id": sensor_id, metric: 72.5}`), what does each call return?

```python
execute_from_llm(registry, "read_sensor", '{"sensor_id": "T-01"}')         # (a)
execute_from_llm(registry, "read_sensor", '{"id": "T-01"}')                # (b)
execute_from_llm(registry, "read_sensor", '["T-01"]')                      # (c)
execute_from_llm(registry, "read_sensor", "{'sensor_id': 'T-01'}")         # (d)
```

Compare (a) with the first line of the chapter's printed output.

**Q2. Lambdas take no arguments.** Using the chapter's `router`, what does `router.execute("list_processes", '{"limit": 5}')` return?

**Q3. Allowlist vs. registry.** Predict each result and the final log:

```python
safe = SafeRouter({"read_cpu", "read_memory", "read_disk"})
safe.register("read_cpu", lambda: {"cpu": 45})
safe.register("read_memory", lambda: {"mem": 8})
safe.register("delete_all", lambda: "deleted")

print(safe.execute("delete_all", "{}"))   # (a)
print(safe.execute("read_disk", "{}"))    # (b)
print(safe.execute("read_cpu", "{}"))     # (c)
print(len(safe.get_log()), [e["function"] for e in safe.get_log()])   # (d)
```

**Q4. How long does the "timeout" take?** With the chapter's `timeout_platform(2)` wrapping `slow_function` (which sleeps 5 s), the `except` branch does print `Timeout: Function timed out after 2s`. Roughly how many seconds after the call does that line appear: 2 or 5? Why?

### Coding Exercises

**E1 (Easy).** Write a `ToolRegistry` with a `tool` decorator method. It should register a function under its own `__name__`, return the function **unchanged** so it can still be called directly, and raise `ValueError("Duplicate tool name: <name>")` on a second registration with the same name. Also provide `get(name)` and `names()` (sorted).

```python
tools = ToolRegistry()

@tools.tool
def read_sensor(sensor_id: str, metric: str = "temperature") -> dict: ...

@tools.tool
def read_cpu() -> dict: ...
```

→ `tools.names() == ['read_cpu', 'read_sensor']`, and `read_sensor("T-01")` still works

**E2 (Easy–Medium).** Write `safe_execute(registry, name, args_json) -> dict`. It checks the arguments **before** calling, using `inspect.signature(func).bind(**args)`, so that argument errors are distinguished from bugs inside the tool. Non-object JSON (a list, `null`, a number) must be rejected with `arguments must be a JSON object, got <type>`.

- `'{"metric": "humidity"}'` → `{'status': 'error', 'error': "Bad arguments: missing a required argument: 'sensor_id'"}`
- `'{"sensor_id": "T-01", "unit": "C"}'` → `{'status': 'error', 'error': "Bad arguments: got an unexpected keyword argument 'unit'"}`
- `'["T-01"]'` → `{'status': 'error', 'error': 'Bad arguments: arguments must be a JSON object, got list'}`

**E3 (Medium).** Write `run_with_timeout(func, kwargs, seconds) -> dict` that really **returns** after about `seconds`. Use a long-lived module-level `ThreadPoolExecutor` instead of a `with` block. Return `{"status": "ok", "result": ...}`, `{"status": "timeout", "error": "<name> exceeded <s>s"}` or `{"status": "error", "error": "<Exc>: <msg>"}`.

- `run_with_timeout(slow, {"n": 3}, 1.0)` (where `slow` sleeps `n` seconds) → `{'status': 'timeout', 'error': 'slow exceeded 1.0s'}`, returned after about 1.0 s
- `run_with_timeout(lambda: 1/0, {}, 1.0)` → `{'status': 'error', 'error': 'ZeroDivisionError: division by zero'}`

#### Dry-Run: Answers

**Q1.**

| Call | Path | Returned |
|---|---|---|
| (a) | found, JSON ok, call ok | `{'status': 'ok', 'result': {'sensor_id': 'T-01', 'temperature': 72.5}}` |
| (b) | `func(id="T-01")` raises `TypeError` | `{'error': "Argument mismatch: read_sensor() got an unexpected keyword argument 'id'"}` |
| (c) | valid JSON, but it is a **list**, and `func(**[...])` raises `TypeError` | `{'error': 'Argument mismatch: ... argument after ** must be a mapping, not list'}` |
| (d) | single quotes are not JSON | `{'error': 'Invalid JSON arguments: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)'}` |

(a) The result key is the *value* of `metric`, which defaults to `"temperature"`, not the literal string `'metric'`. The chapter's printed `{'sensor_id': 'T-01', 'metric': 72.5}` does not match what the code does. Similarly, the humidity call returns `{'sensor_id': 'T-01', 'humidity': 72.5}`.
(c) The exact prefix of the `TypeError` (for example `__main__.read_sensor()`) depends on the Python version. Note that (b) and (c) are both reported as "Argument mismatch", which is why E2 checks the argument shape explicitly.

**Q2.** `{'function': 'list_processes', 'arguments': '{"limit": 5}', 'status': 'error', 'error': "<lambda>() got an unexpected keyword argument 'limit'"}`. The JSON parses fine, but the zero-argument lambda rejects `limit=5`. The `except Exception` branch records `str(e)`. The function name in the message is `<lambda>`, which is unhelpful in logs: prefer named `def` functions for tools.

**Q3.**
(a) `{'status': 'rejected', 'error': "Function 'delete_all' is not in the allowed set"}`. Registered, but not allowed.
(b) `{'function': 'read_disk', 'arguments': '{}', 'status': 'error', 'error': 'Unknown function: read_disk'}`. Allowed, but never registered, so it falls through to the parent's unknown-function branch.
(c) `{'function': 'read_cpu', 'arguments': '{}', 'status': 'ok', 'result': {'cpu': 45}}`
(d) `2 ['read_disk', 'read_cpu']`. The allowlist rejection returns **before** `super().execute`, so it is never written to the audit log. Blocked attempts are often the most important ones to audit. A fix is to append a log entry in `SafeRouter.execute` before returning.

**Q4.** About **5 s**. `future.result(timeout=2)` raises after 2 s, and the code converts it into `TimeoutError`. But that exception then propagates out of the `with ThreadPoolExecutor(...)` block, whose `__exit__` calls `executor.shutdown(wait=True)`. That waits for the worker thread, which is still sleeping, to finish its full 5 s. Python threads cannot be killed, so the function keeps running. The `with` block just made the caller wait for it too. (Verified: with a 1 s limit around a 3 s sleep, the exception surfaces after about 3.0 s.)

**E1 — reference solution**

```python
from typing import Callable

class ToolRegistry:
    def __init__(self):
        self._functions: dict[str, Callable] = {}

    def tool(self, func: Callable) -> Callable:
        if func.__name__ in self._functions:
            raise ValueError(f"Duplicate tool name: {func.__name__}")
        self._functions[func.__name__] = func
        return func                      # unchanged: still directly callable and testable

    def get(self, name: str) -> Callable | None:
        return self._functions.get(name)

    def names(self) -> list[str]:
        return sorted(self._functions)
```

Registration is $O(1)$. Using `__name__` as the key means the tool name the LLM sees always matches the Python function name, which avoids the camelCase/snake_case mismatch from the previous chapter.

**E2 — reference solution**

```python
import inspect
import json
from typing import Any, Callable

def check_arguments(func: Callable, args: Any) -> str | None:
    if not isinstance(args, dict):
        return f"arguments must be a JSON object, got {type(args).__name__}"
    try:
        inspect.signature(func).bind(**args)     # same binding rules as a real call, without running it
    except TypeError as e:
        return str(e)
    return None

def safe_execute(registry, name: str, args_json: str) -> dict:
    func = registry.get(name)
    if func is None:
        return {"status": "error", "error": f"Unknown function: {name}"}
    try:
        args = json.loads(args_json)
    except json.JSONDecodeError as e:
        return {"status": "error", "error": f"Invalid JSON: {e}"}
    problem = check_arguments(func, args)
    if problem:
        return {"status": "error", "error": f"Bad arguments: {problem}"}
    try:
        return {"status": "ok", "result": func(**args)}
    except Exception as e:                       # now this really means "the tool itself failed"
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}
```

`Signature.bind` raises `TypeError` with messages such as `missing a required argument: 'sensor_id'`, without executing anything. A `TypeError` raised *inside* the tool can therefore no longer be mistaken for a caller error. $O(p)$ in the number of parameters.

**E3 — reference solution**

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from typing import Callable

_POOL = ThreadPoolExecutor(max_workers=4)        # long-lived: no shutdown(wait=True) per call

def run_with_timeout(func: Callable, kwargs: dict, seconds: float) -> dict:
    future = _POOL.submit(func, **kwargs)
    try:
        return {"status": "ok", "result": future.result(timeout=seconds)}
    except FuturesTimeout:
        future.cancel()                          # only helps if it has not started yet
        return {"status": "timeout", "error": f"{func.__name__} exceeded {seconds}s"}
    except Exception as e:                       # exceptions raised inside func re-raise here
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}
```

This returns at about `seconds` because nothing blocks on the worker. The worker thread still runs to completion in the background, and it occupies one of the pool's 4 slots until it finishes. Truly *stopping* runaway work needs a separate **process** (`ProcessPoolExecutor` or `multiprocessing` with `terminate()`), or cooperative cancellation inside the tool.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Dynamic Execution**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter5 dynamic execution**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

