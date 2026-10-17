# Part 0, Topic 0: The Bridge: Python Foundations
## Chapter 1: Introduction to Type Hinting

**Prerequisite Knowledge:** Basic understanding of Python functions, variables, and data types (strings, integers, lists).

---

### The "Factory Label" Analogy

Imagine a factory conveyor belt carrying boxes. Some boxes contain motors, some contain sensors, some contain circuit boards. If every box was unlabeled, workers would have to open every box to know what's inside. That's slow and error-prone.

Type hints are the labels on those boxes. They don't change what's inside the box — a motor is still a motor — but now everyone on the factory floor knows exactly what they're dealing with without opening it.

Python is dynamically typed, which means you don't *have* to tell Python what type of data a variable holds. It figures it out when the code runs. However, as projects grow — especially when building agentic systems that require strict data validation — not knowing what data is passing through your system leads to bugs.

Type hinting is a way to explicitly declare what type of data your functions expect to receive and what they will return.

```
┌─────────────────────────────────────────────────────────┐
│              UNLABELED FACTORY (No Type Hints)           │
│                                                         │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐         │
│  │ ???  │    │ ???  │    │ ???  │    │ ???  │         │
│  └──────┘    └──────┘    └──────┘    └──────┘         │
│      │           │           │           │              │
│      ▼           ▼           ▼           ▼              │
│  Worker must   Worker must  Worker must  Worker must   │
│  OPEN box     OPEN box     OPEN box     OPEN box      │
│  to know!     to know!     to know!     to know!      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            LABELED FACTORY (With Type Hints)            │
│                                                         │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐         │
│  │ Motor│    │Sensor│    │ PCB  │    │ Wire │         │
│  └──────┘    └──────┘    └──────┘    └──────┘         │
│      │           │           │           │              │
│      ▼           ▼           ▼           ▼              │
│  Worker sees  Worker sees  Worker sees  Worker sees    │
│  label, no    label, no    label, no    label, no     │
│  opening!     opening!     opening!     opening!      │
└─────────────────────────────────────────────────────────┘
```

---

### 1. The Problem with Dynamic Typing

Let's look at a simple function without type hints:

```python
def process_data(data):
    # What is 'data'? A list? A string? A dictionary?
    # We have to read the whole function or guess.
    return data * 2

print(process_data(5))       # Outputs: 10
print(process_data("hello")) # Outputs: hellohello
```

**What's happening:**
```python
def process_data(data):
#              ^^^^
#              No type hint — Python has no idea what 'data' should be
#              Could be int, str, list, dict, anything!

print(process_data(5))
#                    ^
#                    Passes an integer — Python multiplies 5 * 2 = 10

print(process_data("hello"))
#                    ^^^^^^
#                    Passes a string — Python repeats "hello" * 2 = "hellohello"
#
# Both "work" but the function was probably meant for numbers only!
# This is the silent bug factory creates when labels are missing.
```

If we intended `process_data` to only work with numbers, the fact that it accepts a string without error is a problem. The bug won't show up until someone passes a string and the downstream code expects a number.

**Common mistake — assuming Python enforces type hints:**
```python
def add_numbers(a: int, b: int) -> int:
    return a + b

# This RUNS without error even though "hello" is not an int!
# Python does NOT enforce type hints at runtime.
result = add_numbers("hello", "world")
print(result)  # Outputs: helloworld — no error!

# Type hints are for TOOLS (editors, mypy, linters), not for Python itself.
# The enforcement comes from your development tools, not from the Python interpreter.
```

---

### 2. Adding Basic Type Hints

We can add type hints to make our intentions clear. We use a colon `:` after the parameter name to specify its type, and an arrow `->` after the parentheses to specify the return type.

```python
# The ': int' tells developers (and tools) that 'number' should be an integer.
# The '-> int' says this function will return an integer.
def process_number(number: int) -> int:
    return number * 2

print(process_number(5)) # Outputs: 10
```

**What's happening:**
```python
def process_number(number: int) -> int:
#              ^     ^^^^^^^   ^^^^^
#              |     |         |
#              |     |         └── Return type: this function returns an integer
#              |     └── Parameter type: 'number' must be an integer
#              └── Function name
#
# Now your editor (VS Code, PyCharm) and type checker (mypy) know:
#   - This function expects an int
#   - This function returns an int
#   - Passing a string is a TYPE ERROR
```

If we pass a string, Python won't strictly block it from running, but your code editor (like VS Code) and tools like `mypy` will highlight it as an error.

```python
# process_number("hello")
# Editor Warning: Argument of type "Literal['hello']" cannot be assigned
# to parameter "number" of type "int"
```

**All basic type hints in one place:**

```python
# Numbers
def get_temperature() -> float:          # Floating point number
    return 22.5

def count_sensors() -> int:              # Whole number
    return 42

# Strings
def get_sensor_name() -> str:            # Text
    return "Temperature-Sensor-01"

# Booleans
def is_active() -> bool:                 # True or False
    return True

# Nothing (function does something but doesn't return a value)
def log_reading(reading: float) -> None: # No return value
    print(f"Reading: {reading}")
    # Functions that return None implicitly have no 'return' statement
```

**What's happening:**
```python
def get_temperature() -> float:
#                   ^     ^^^^^
#                   |     └── Returns a float (22.5, 100.0, -3.14)
#                   └── No parameters needed

def log_reading(reading: float) -> None:
#             ^           ^^^^^    ^^^^
#             |           |        └── 'None' means: this function returns nothing
#             |           └── The parameter must be a float
#             └── Parameter name
#
# '-> None' is used for functions that ONLY do side effects (print, write file, etc.)
```

---

### 3. Hinting Collections (Lists and Dictionaries)

Type hints become incredibly useful when dealing with collections of data. This is where factory systems really benefit — sensor readings come in as lists, configurations come in as dicts.

```
┌─────────────────────────────────────────────────────────┐
│              COLLECTION TYPE HINTS                       │
│                                                         │
│  list[str]         list of strings                      │
│  ┌─────┬─────┬─────┬─────┐                              │
│  │"S01"│"S02"│"S03"│"S04"│                              │
│  └─────┴─────┴─────┴─────┘                              │
│                                                         │
│  dict[str, float]   dict with str keys, float values    │
│  ┌─────────┬───────┐                                    │
│  │"S01"    │ 22.5  │                                    │
│  │"S02"    │ 24.0  │                                    │
│  │"S03"    │ 21.8  │                                    │
│  └─────────┴───────┘                                    │
│                                                         │
│  list[dict[str, Any]]  list of dicts                    │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ {"id": "S01" │ {"id": "S02" │ {"id": "S03" │         │
│  │  "temp": 22} │  "temp": 24} │  "temp": 22} │         │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

```python
# We want to process a list of names.
# In modern Python (3.9+), we can use the built-in 'list' and 'dict' types directly.

def greet_users(names: list[str]) -> None:
    # 'names: list[str]' means: "I expect a list, and every item must be a string."
    # '-> None' means this function doesn't return anything.
    for name in names:
        print(f"Hello, {name}!")

users = ["Alice", "Bob", "Charlie"]
greet_users(users)
```

**What's happening:**
```python
def greet_users(names: list[str]) -> None:
#             ^     ^^^^^^^^^^^  ^^^^
#             |     |            |
#             |     |            └── Returns nothing
#             |     └── list[str] means: a list where EVERY item is a string
#             └── Parameter name
#
# Inside the function:
#   name = "Alice"  → str ✓
#   name = "Bob"    → str ✓
#   name = 42       → would be caught by type checker! (int is not str)
```

**More collection examples:**

```python
# List of floats (sensor readings)
def calculate_average(readings: list[float]) -> float:
    return sum(readings) / len(readings)

temps = [22.5, 24.0, 21.8, 23.1]
avg = calculate_average(temps)
print(avg)  # Outputs: 22.85

# Dictionary with specific types (sensor config)
def get_sensor_config(config: dict[str, float]) -> str:
    # config: dict[str, float] means: keys are strings, values are floats
    name = config.get("name", "unknown")
    threshold = config.get("threshold", 0.0)
    return f"Sensor {name} threshold: {threshold}"

sensor = {"name": "TempSensor", "threshold": 30.0}
print(get_sensor_config(sensor))
# Outputs: Sensor TempSensor threshold: 30.0
```

**Common mistake — wrong collection hint:**
```python
# WRONG: This says "a list of exactly 3 strings"
# That's NOT what list[str] means!
def process(data: list[str]) -> None:
    pass

# list[str] means: a list of ANY length, where every item is a str
# It does NOT enforce the length

# If you want to enforce length, you need other tools (like Pydantic)
```

---

### 4. Hinting with `Optional` and `Union`

Sometimes a value can be one of several types, or it might not exist at all. Python gives us `Optional` and `Union` for these cases.

```python
from typing import Optional, Union

# Optional[str] means: str OR None
# Use this when a value might not exist
def find_sensor(sensor_id: str) -> Optional[str]:
    sensors = {"S001": "Temperature", "S002": "Pressure"}
    return sensors.get(sensor_id)  # Returns None if not found

result = find_sensor("S001")  # "Temperature"
result = find_sensor("S999")  # None (sensor not found)

# Union[str, int] means: could be a string OR an integer
def parse_id(raw: Union[str, int]) -> int:
    if isinstance(raw, str):
        return int(raw)
    return raw

parse_id("42")   # 42 (converts string to int)
parse_id(42)     # 42 (already an int)
```

**What's happening:**
```python
def find_sensor(sensor_id: str) -> Optional[str]:
#             ^          ^^^    ^^^^^^^^^^^^^^
#             |          |      |
#             |          |      └── Optional[str] = str | None
#             |          |         Returns either a string or None
#             |          └── Input must be a string
#             └── Parameter name
#
# Python 3.10+ shorthand: str | None (instead of Optional[str])
# Both mean the same thing!
```

**Modern Python 3.10+ syntax (pipe operator):**
```python
# Old way (Python 3.9 and below)
from typing import Optional, Union

def find_sensor(sensor_id: str) -> Optional[str]:
    ...

def parse_id(raw: Union[str, int]) -> int:
    ...

# New way (Python 3.10+) — no imports needed!
def find_sensor(sensor_id: str) -> str | None:
    ...

def parse_id(raw: str | int) -> int:
    ...
```

**Comparison table:**

| Syntax | Meaning | Python Version | Import Needed |
|--------|---------|----------------|---------------|
| `Optional[str]` | str or None | 3.5+ | `from typing import Optional` |
| `str \| None` | str or None | 3.10+ | None |
| `Union[str, int]` | str or int | 3.5+ | `from typing import Union` |
| `str \| int` | str or int | 3.10+ | None |

---

### 5. Type Hinting Functions with Multiple Parameters

When functions have many parameters, type hints become even more important — they serve as documentation for what each argument should be.

```python
# Factory function to create a sensor reading
def create_reading(
    sensor_id: str,
    temperature: float,
    humidity: float,
    timestamp: str,
    is_calibrated: bool = False
) -> dict[str, str | float | bool]:
    return {
        "sensor_id": sensor_id,
        "temperature": temperature,
        "humidity": humidity,
        "timestamp": timestamp,
        "calibrated": is_calibrated
    }

reading = create_reading(
    sensor_id="S-001",
    temperature=22.5,
    humidity=45.0,
    timestamp="2025-01-15T10:30:00"
)
```

**What's happening:**
```python
def create_reading(
    sensor_id: str,           # Must be a string
    temperature: float,       # Must be a float
    humidity: float,          # Must be a float
    timestamp: str,           # Must be a string
    is_calibrated: bool = False  # Must be a bool, defaults to False
) -> dict[str, str | float | bool]:  # Returns a dict with mixed value types
    ...
#
# The return type 'dict[str, str | float | bool]' means:
#   - Keys: all strings
#   - Values: could be str, float, OR bool
#
# This is accurate but complex — later chapters will show TypedDict for cleaner shapes
```

**Error scenario — wrong types:**
```python
# This would be caught by type checkers:
create_reading(
    sensor_id=123,          # Error: expected str, got int
    temperature="hot",      # Error: expected float, got str
    humidity=45.0,
    timestamp="2025-01-15"
)

# Your editor would show red squiggly lines under 123 and "hot"
# mypy would report:
#   error: Argument 1 has type "int"; expected "str"
#   error: Argument 2 has type "str"; expected "float"
```

---

### 6. Returning Multiple Types — When to Use What

```python
# ❌ BAD: Using Any (defeats the purpose of type hints)
from typing import Any

def process_data(data: Any) -> Any:
    return data * 2
# Any tells the type checker: "I don't know, don't check anything"
# This is worse than no type hint at all!

# ✅ GOOD: Be specific
def double_number(n: int) -> int:
    return n * 2

# ✅ GOOD: When you truly don't know, use specific unknowns
def parse_json(raw: str) -> dict[str, str | int | float | bool | None]:
    import json
    return json.loads(raw)
# This says: "I return a dict, keys are strings, values could be various types"
```

---

### 7. Type Hints in Real Factory Code

Here's a more realistic example showing how type hints help in an agentic system:

```python
from typing import Optional

# Configuration for a factory sensor
def configure_sensor(
    sensor_id: str,
    min_value: float,
    max_value: float,
    alert_threshold: Optional[float] = None,
    unit: str = "celsius"
) -> dict[str, str | float | bool]:
    """Configure a factory sensor with validation boundaries."""
    
    config = {
        "id": sensor_id,
        "min": min_value,
        "max": max_value,
        "unit": unit,
        "has_alert": alert_threshold is not None,
    }
    
    if alert_threshold is not None:
        config["alert_at"] = alert_threshold
    
    return config

# Usage
sensor_config = configure_sensor(
    sensor_id="TEMP-001",
    min_value=-40.0,
    max_value=150.0,
    alert_threshold=80.0,
    unit="celsius"
)

print(sensor_config)
# Outputs: {'id': 'TEMP-001', 'min': -40.0, 'max': 150.0, 'unit': 'celsius', 'has_alert': True, 'alert_at': 80.0}
```

**What's happening:**
```python
def configure_sensor(
    sensor_id: str,                      # String identifier
    min_value: float,                    # Lowest valid reading
    max_value: float,                    # Highest valid reading
    alert_threshold: Optional[float] = None,  # Optional: may or may not be provided
    unit: str = "celsius"                # Defaults to "celsius" if not provided
) -> dict[str, str | float | bool]:      # Returns a mixed-type dictionary
    """Configure a factory sensor with validation boundaries."""
    #                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                     Docstring provides additional context beyond types
    #                     Type hints + docstrings = complete documentation
    
    config = {
        "id": sensor_id,       # str
        "min": min_value,      # float
        "max": max_value,      # float
        "unit": unit,          # str
        "has_alert": alert_threshold is not None,  # bool
    }
    # config is built step by step, each value has a clear type
    
    if alert_threshold is not None:
        config["alert_at"] = alert_threshold  # float (only added if provided)
    
    return config
# The return type dict[str, str | float | bool] accurately describes:
#   Keys: always strings
#   Values: str ("TEMP-001", "celsius"), float (-40.0, 150.0, 80.0), or bool (True)
```

---

### 8. Common Mistakes and How to Fix Them

```python
# MISTAKE 1: Hinting the wrong type
def get_temperature() -> int:
    return 22.5  # Bug! 22.5 is a float, not an int

# FIX:
def get_temperature() -> float:
    return 22.5

# MISTAKE 2: Forgetting Optional for values that can be None
def find_sensor(sensor_id: str) -> str:
    sensors = {}
    return sensors.get(sensor_id)  # Returns None, but type says str!

# FIX:
def find_sensor(sensor_id: str) -> str | None:
    sensors = {}
    return sensors.get(sensor_id)

# MISTAKE 3: Using Any when you mean "I don't know yet"
from typing import Any

def process(data: Any) -> Any:
    return data
# This tells type checkers to ignore everything — defeats the purpose!

# FIX: Use specific types, or use TypeVar for generics (covered later)
# At minimum, be more specific than Any

# MISTAKE 4: Hinting return type as int but returning float
def calculate_average(values: list[float]) -> int:
    return sum(values) / len(values)  # Returns float!

# FIX:
def calculate_average(values: list[float]) -> float:
    return sum(values) / len(values)
```

---

### Summary

Type hints don't change how Python runs your code; they act as rigorous documentation. They help your editor catch mistakes before you even run the code, and they are foundational for tools like Pydantic, which we will use later to enforce strict data rules for our AI agents.

**Key takeaways:**
- Use `:` for parameter types, `->` for return types
- `list[str]`, `dict[str, int]` for collections
- `Optional[str]` or `str | None` for values that might not exist
- Type hints are enforced by tools (mypy, editors), not by Python itself
- Always prefer specific types over `Any`

---

### Quick Reference Table

| Syntax | Meaning | Example |
|--------|---------|---------|
| `name: int` | Parameter type hint | `def add(a: int, b: int)` |
| `-> int` | Return type hint | `def add(a: int) -> int` |
| `-> None` | No return value | `def log(msg: str) -> None` |
| `list[str]` | List of strings | `names: list[str]` |
| `dict[str, int]` | Dict with str keys, int values | `config: dict[str, int]` |
| `float \| None` | Float or None | `temp: float \| None = None` |
| `Optional[float]` | Float or None (old syntax) | `temp: Optional[float] = None` |
| `str \| int` | String or int (3.10+) | `raw: str \| int` |
| `Union[str, int]` | String or int (old syntax) | `raw: Union[str, int]` |
| `Any` | Any type (avoid) | `data: Any` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Hints are not enforced at runtime.** Using the chapter's un-hinted `process_data(data)` (returns `data * 2`) and the hinted `add_numbers(a: int, b: int) -> int` (returns `a + b`), predict each printed line. Does any line raise an error when you *run* the file?

```python
print(process_data([1, 2]))
print(add_numbers([1], [2]))
print(process_data("ab") + str(process_data(3)))
```

**Q2. `Optional` and `Union` in action.** Using the chapter's `find_sensor` (dict `{"S001": "Temperature", "S002": "Pressure"}`) and `parse_id`, predict the output:

```python
print(find_sensor("S002"), find_sensor("s001"))
print(parse_id("007") + parse_id(3))
```

**Q3. Trace `configure_sensor`.** Using the chapter's `configure_sensor` from Section 7, predict both printed dictionaries exactly (key order matters):

```python
print(configure_sensor("PRESS-7", 0.0, 10.0, unit="bar"))
print(configure_sensor("PRESS-7", 0.0, 10.0, 0.0))
```

**Q4. Runtime vs. type checker.** Take the buggy version from Mistake 4:

```python
def calculate_average(values: list[float]) -> int:
    return sum(values) / len(values)
```

For each call, say what Python **prints** when you run it, and whether a type checker such as mypy would complain about the **function definition**:

```python
print(calculate_average([1.0, 2.0]))
print(calculate_average([2, 4]))
```

**Q5. Write the label.** Give the most precise modern (3.10+) type hint for each value or function, without using `Any`:
1. `{"S01": [22.5, 23.0], "S02": []}`
2. `["S01", None, "S03"]`
3. A function that takes a sensor ID string and returns either the latest temperature as a float or `None` if the sensor is offline.
4. `{"id": "TEMP-001", "min": -40.0, "has_alert": True}`

### Coding Exercises

**E1 (Easy). Fully hinted unit converter.** Write `to_fahrenheit(readings: list[float]) -> list[float]` that converts every Celsius reading with $F = C \cdot \tfrac{9}{5} + 32$.

```python
to_fahrenheit([0.0, 100.0, -40.0])   # [32.0, 212.0, -40.0]
to_fahrenheit([])                    # []
```

**E2 (Easy–Medium). Hottest sensor, or nothing.** Write `find_hottest(readings: dict[str, float]) -> str | None` that returns the ID with the highest temperature, or `None` for an empty dict. It must work when every temperature is negative.

```python
find_hottest({"S01": 22.5, "S02": 24.0, "S03": 21.8})   # "S02"
find_hottest({"A": -5.0, "B": -2.0})                    # "B"
find_hottest({})                                        # None
```

**E3 (Medium). Summarize readings with dropouts.** A sensor sometimes misses a sample and you get `None`. Write `summarize(readings: list[float | None]) -> dict[str, int | float | None]` returning `{"valid": <count of real readings>, "missing": <count of None>, "avg": <average of real readings rounded to 2 decimals, or None if there are none>}`. A reading of `0.0` is a real reading, not a missing one.

```python
summarize([22.5, None, 24.0, 21.3])   # {'valid': 3, 'missing': 1, 'avg': 22.6}
summarize([None, None])               # {'valid': 0, 'missing': 2, 'avg': None}
summarize([0.0])                      # {'valid': 1, 'missing': 0, 'avg': 0.0}
```

#### Dry-Run: Answers

**Q1.** Output (no line raises an error):

```python
[1, 2, 1, 2]
[1, 2]
abab6
```

- `[1, 2] * 2` repeats the list.
- `add_numbers([1], [2])` evaluates `[1] + [2]`, which concatenates the lists. The `int` hints are ignored at runtime, and only a type checker would flag the call.
- `process_data("ab")` is `"abab"`, `process_data(3)` is `6`, and `"abab" + "6"` gives `"abab6"`.

**Q2.** Output:

```python
Pressure None
10
```

`"s001"` (lowercase `s`) is not a key, so `.get` returns `None`, and that is exactly why the return type is `Optional[str]`. `parse_id("007")` hits the `isinstance(raw, str)` branch, and `int("007")` is `7`. `parse_id(3)` returns `3` unchanged, and $7 + 3 = 10$.

**Q3.** Output:

```python
{'id': 'PRESS-7', 'min': 0.0, 'max': 10.0, 'unit': 'bar', 'has_alert': False}
{'id': 'PRESS-7', 'min': 0.0, 'max': 10.0, 'unit': 'celsius', 'has_alert': True, 'alert_at': 0.0}
```

| Call | `alert_threshold` | `unit` | `alert_threshold is not None` | `"alert_at"` added? |
|------|-------------------|--------|-------------------------------|---------------------|
| 1 | `None` (default) | `"bar"` (keyword) | `False` | no |
| 2 | `0.0` (4th positional) | `"celsius"` (default) | `True` | yes, `0.0` |

The second call is the trap. `0.0` is falsy, so a check written as `if alert_threshold:` would have silently dropped a real threshold. `is not None` is the correct test for an `Optional` value.

**Q4.** Output:

```python
1.5
3.0
```

Both calls run fine, because Python never checks the `-> int` label. A type checker **does** complain about the definition: `/` always produces a `float` (even `4 / 2` is `2.0`), so the declared return type `int` does not match. The fix is `-> float`, as in the chapter. Note that the second call passes `int`s to a `list[float]` parameter, and that is fine: type checkers accept `int` wherever `float` is expected.

**Q5.**
1. `dict[str, list[float]]`. An empty list still satisfies `list[float]`, because `list[...]` never fixes the length.
2. `list[str | None]`. The hint goes on the items, not on the list itself.
3. `def latest_temp(sensor_id: str) -> float | None:` (or `Optional[float]`).
4. `dict[str, str | float | bool]`, the same shape the chapter uses for `configure_sensor`.

**E1 — reference solution**

```python
def to_fahrenheit(readings: list[float]) -> list[float]:
    return [c * 9 / 5 + 32 for c in readings]
```

Check: $-40 \cdot 9/5 + 32 = -72 + 32 = -40$. This is $O(n)$, and an empty input gives an empty list for free.

**E2 — reference solution**

```python
def find_hottest(readings: dict[str, float]) -> str | None:
    if not readings:
        return None
    best_id: str | None = None
    best_temp = 0.0
    for sensor_id, temp in readings.items():
        # The 'best_id is None' check makes the FIRST sensor the starting best,
        # so an all-negative dict still works (starting from 0.0 alone would fail).
        if best_id is None or temp > best_temp:
            best_id = sensor_id
            best_temp = temp
    return best_id
```

One pass, $O(n)$. (The one-liner `max(readings, key=readings.get)` also works once you have handled the empty case.)

**E3 — reference solution**

```python
def summarize(readings: list[float | None]) -> dict[str, int | float | None]:
    valid: list[float] = [r for r in readings if r is not None]   # keeps 0.0!
    avg: float | None = None
    if valid:
        avg = round(sum(valid) / len(valid), 2)
    return {
        "valid": len(valid),
        "missing": len(readings) - len(valid),
        "avg": avg,
    }
```

Check: $(22.5 + 24.0 + 21.3) / 3 = 67.8 / 3 = 22.6$. Filtering with `is not None` instead of `if r` is what keeps `0.0` as a valid reading. Cost: $O(n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Introduction to Type Hinting**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 intro type hinting**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

