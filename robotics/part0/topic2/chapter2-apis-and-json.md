# Part 0, Topic 0: The Bridge: Python Foundations
## Chapter 2: Understanding APIs & JSON

**Prerequisite Knowledge:** Basic Python dictionaries and lists.

---

### The "Waiter" Analogy (Expanded)

Think of a restaurant. You (the client) look at the menu and tell the waiter (the API) what you want. The waiter takes your order to the kitchen (the server/application), and then brings your food (the response) back to you. You don't need to know how the kitchen cooked the food, you just need to know how to ask the waiter for it.

In software, an API is a set of rules that allows one piece of software to talk to another over the internet.

```
┌──────────────────────────────────────────────────────────────┐
│                    API REQUEST FLOW                           │
│                                                              │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐     │
│  │          │  HTTP   │          │  Query  │          │     │
│  │  YOUR    │ ──────▶ │   API    │ ──────▶ │  SERVER  │     │
│  │  AGENT   │ Request │  (Waiter)│  to DB  │ (Kitchen)│     │
│  │          │ ◀────── │          │ ◀────── │          │     │
│  └──────────┘  JSON   └──────────┘  Result └──────────┘     │
│      You         │         │           │         You         │
│                  │         │           │                     │
│            Send data   Translates   Gets data    Returns     │
│            as JSON     your request  from DB     formatted   │
│                                            response as JSON  │
└──────────────────────────────────────────────────────────────┘
```

Agentic systems rarely work in isolation. They need to talk to other programs — fetching weather data, sending commands to a database, or querying an LLM like OpenAI. They do this using APIs (Application Programming Interfaces).

---

### 1. What is an API?

An API defines **how** you can talk to a service. It specifies:
- **What questions you can ask** (endpoints)
- **How to format your questions** (request format)
- **What answers you'll get back** (response format)

```python
# Example: talking to a factory sensor API
# You send: "Give me the temperature from sensor S-001"
# The API returns: {"sensor_id": "S-001", "temperature": 22.5, "unit": "celsius"}

# You don't need to know:
# - What database stores the readings
# - What language the server is written in
# - How the sensor physically measures temperature
#
# You only need to know:
# - The endpoint URL
# - The format to send your request
# - The format of the response
```

---

### 2. JSON: The Universal Language

When programs talk to each other over the internet, they need a common language to format the data. JSON (JavaScript Object Notation) is the standard format. It looks almost exactly like a Python dictionary.

Here is what raw JSON looks like:
```json
{
    "user": "Alice",
    "id": 101,
    "active": true,
    "roles": ["admin", "editor"]
}
```

**JSON vs Python — side by side:**

| JSON | Python Equivalent |
|------|-------------------|
| `"hello"` | `"hello"` (string) |
| `42` | `42` (int) |
| `3.14` | `3.14` (float) |
| `true` / `false` | `True` / `False` |
| `null` | `None` |
| `{"key": "value"}` | `{"key": "value"}` (dict) |
| `[1, 2, 3]` | `[1, 2, 3]` (list) |

```
┌──────────────────────────────────────────────────────────────┐
│              JSON vs PYTHON COMPARISON                        │
│                                                              │
│     JSON                              Python                 │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │ {                   │      │ {                   │       │
│  │   "name": "Alice",  │  ≈   │   "name": "Alice",  │       │
│  │   "age": 30,        │      │   "age": 30,        │       │
│  │   "active": true,   │      │   "active": True,   │       │
│  │   "score": null     │      │   "score": None     │       │
│  │ }                   │      │ }                   │       │
│  └─────────────────────┘      └─────────────────────┘       │
│                                                              │
│  Key differences:                                            │
│  • JSON uses true/false/null (lowercase)                     │
│  • Python uses True/False/None (capitalized)                 │
│  • JSON keys MUST be strings (in quotes)                     │
│  • JSON is TEXT — Python dict is in-memory                   │
└──────────────────────────────────────────────────────────────┘
```

**Important differences:**
```python
# JSON keys are ALWAYS strings (in double quotes)
# Python dict keys can be integers, tuples, etc.

# Valid JSON:
# {"123": "value"}      — key is a string
# {"key": "value"}      — key is a string

# Valid Python but NOT valid JSON:
# {123: "value"}        — key is an integer
# {(1,2): "value"}      — key is a tuple

# JSON uses double quotes for strings
# Python allows single or double quotes
```

---

### 3. Parsing JSON in Python

Python has a built-in library called `json` to convert JSON strings into Python dictionaries, and vice-versa.

```python
import json

# A string containing JSON data (notice the single quotes around the whole string)
json_string = '{"user": "Alice", "id": 101, "active": true}'

# 1. Convert JSON string to a Python dictionary (deserialization/parsing)
# Think of 'loads' as "load string"
data_dict = json.loads(json_string)

print(type(data_dict)) # Outputs: <class 'dict'>
print(data_dict["user"]) # Outputs: Alice

# 2. Convert a Python dictionary back to a JSON string (serialization)
# Think of 'dumps' as "dump string"
new_dict = {"status": "success", "items_processed": 5}
new_json_string = json.dumps(new_dict)

print(type(new_json_string)) # Outputs: <class 'str'>
print(new_json_string)       # Outputs: {"status": "success", "items_processed": 5}
```

**What's happening:**
```python
import json
#     ^^^^
#     Built-in Python library for JSON operations
#     No need to install — comes with Python

json_string = '{"user": "Alice", "id": 101, "active": true}'
#            ^                                               ^
#            |                                               └── Closing brace
#            └── This is a STRING that LOOKS like a dict
#                 Notice: single quotes on outside, double quotes inside
#                 Notice: true (lowercase) — JSON format, not Python

data_dict = json.loads(json_string)
#          ^^^^
#          "loads" = "load string" — converts JSON string → Python dict
#
# After this line:
#   data_dict is a real Python dictionary
#   data_dict["user"] → "Alice" (string)
#   data_dict["id"]   → 101 (integer — JSON number became Python int)
#   data_dict["active"] → True (JSON true became Python True)

new_json_string = json.dumps(new_dict)
#                ^^^^
#                "dumps" = "dump string" — converts Python dict → JSON string
#
# After this line:
#   new_json_string is a string: '{"status": "success", "items_processed": 5}'
#   Notice: Python True/False/None become JSON true/false/null
```

**The four json functions you need to know:**

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `json.loads()` | JSON string | Python object | Parse API responses |
| `json.dumps()` | Python object | JSON string | Send data to APIs |
| `json.load()` | File object | Python object | Read JSON from file |
| `json.dump()` | Python object | File object | Write JSON to file |

```python
import json

# LOADS / DUMPS — work with strings (most common)
json_str = '{"sensor": "S001", "temp": 22.5}'
data = json.loads(json_str)        # str → dict

output = json.dumps(data)          # dict → str

# LOAD / DUMP — work with files
# Reading from a file
with open("config.json", "r") as f:
    config = json.load(f)          # file → dict

# Writing to a file
with open("output.json", "w") as f:
    json.dump(data, f, indent=2)   # dict → file (indented for readability)
```

---

### 4. Handling JSON Errors

JSON parsing can fail. Common reasons: malformed JSON, wrong data types, encoding issues.

```python
import json

# ERROR 1: Malformed JSON (missing quotes, trailing comma, etc.)
bad_json = '{"name": "Alice", age: 30}'  # age is missing quotes!
try:
    data = json.loads(bad_json)
except json.JSONDecodeError as e:
    print(f"Invalid JSON: {e}")
    # Invalid JSON: Expecting property name enclosed in double quotes: ...

# ERROR 2: Wrong type assumption
json_str = '{"temperature": "not_a_number"}'
data = json.loads(json_str)

# You expect a number but got a string
try:
    temp = float(data["temperature"])  # This will raise ValueError
except ValueError:
    print("Temperature is not a number!")

# ERROR 3: Missing key
json_str = '{"name": "Alice"}'
data = json.loads(json_str)

# Trying to access a key that doesn't exist
try:
    age = data["age"]  # KeyError!
except KeyError:
    print("Key 'age' not found in JSON")
    # Safer: use .get() with a default
    age = data.get("age", 0)  # Returns 0 if key doesn't exist
```

**What's happening:**
```python
json.loads(bad_json)
#         ^^^^^^^
#         json.loads raises JSONDecodeError if the string isn't valid JSON
#         Always wrap json.loads() in try/except when dealing with external data

data.get("age", 0)
#     ^^^
#     .get() is SAFER than [] for dictionary access
#     Returns 0 if "age" key doesn't exist (instead of raising KeyError)
#     vs: data["age"] would crash if key is missing
```

**Best practice for external data:**
```python
import json

def safe_parse_sensor_data(raw: str) -> dict:
    """Safely parse JSON from an external sensor API."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Sensor returned invalid JSON: {e}")
    
    # Validate expected fields exist
    required_fields = ["sensor_id", "temperature", "timestamp"]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    return data
```

---

### 5. Complex JSON Structures

Real-world APIs return nested JSON. Let's handle factory sensor data with multiple levels.

```python
import json

# Complex nested JSON from a factory monitoring system
factory_json = '''
{
    "factory_id": "PLANT-001",
    "timestamp": "2025-01-15T10:30:00Z",
    "sensors": [
        {
            "id": "TEMP-001",
            "type": "temperature",
            "readings": [22.5, 23.1, 22.8],
            "status": "active"
        },
        {
            "id": "PRES-001",
            "type": "pressure",
            "readings": [101.3, 101.2, 101.4],
            "status": "active"
        }
    ],
    "alerts": {
        "count": 0,
        "critical": []
    }
}
'''

data = json.loads(factory_json)

# Access nested data
factory_id = data["factory_id"]                              # "PLANT-001"
first_sensor = data["sensors"][0]                            # First sensor dict
first_reading = data["sensors"][0]["readings"][0]            # 22.5
alert_count = data["alerts"]["count"]                        # 0

print(f"Factory: {factory_id}")
print(f"First sensor: {first_sensor['id']}")
print(f"First reading: {first_reading}")
print(f"Alerts: {alert_count}")
```

**What's happening:**
```python
data["sensors"][0]
#    ^^^^^^^^^^  ^
#    |           └── Index 0 — first item in the list
#    └── Key "sensors" — value is a list of sensor dicts
#
# data["sensors"] → [{"id": "TEMP-001", ...}, {"id": "PRES-001", ...}]
# data["sensors"][0] → {"id": "TEMP-001", "type": "temperature", ...}

data["sensors"][0]["readings"][0]
#    ^^^^^^^^^^  ^  ^^^^^^^^  ^
#    |           |  |         └── Index 0 — first reading
#    |           |  └── Key "readings" — value is a list of floats
#    |           └── Key "id" — first sensor
#    └── Key "sensors"
#
# This is "chained indexing" — navigating deep into nested structures
# Each [] or ["key"] goes one level deeper

data["alerts"]["count"]
#    ^^^^^^^^  ^^^^^^
#    |         └── Key "count" — value is an integer (0)
#    └── Key "alerts" — value is a dict
#
# Two levels of nesting: alerts → count
```

**Iterating over nested JSON:**
```python
# Loop through all sensors and print their readings
for sensor in data["sensors"]:
    sensor_id = sensor["id"]
    sensor_type = sensor["type"]
    avg_reading = sum(sensor["readings"]) / len(sensor["readings"])
    print(f"Sensor {sensor_id} ({sensor_type}): avg = {avg_reading:.1f}")

# Output:
# Sensor TEMP-001 (temperature): avg = 22.8
# Sensor PRES-001 (pressure): avg = 101.3
```

**What's happening:**
```python
for sensor in data["sensors"]:
#          ^^^^^^^^^^^^^^^^^
#          Iterates over each item in the sensors list
#          First iteration: sensor = {"id": "TEMP-001", ...}
#          Second iteration: sensor = {"id": "PRES-001", ...}
    
    sensor_id = sensor["id"]
    # Extract the "id" field from the current sensor dict
    
    avg_reading = sum(sensor["readings"]) / len(sensor["readings"])
    #              ^^^                          ^^^
    #              sum() adds all readings      len() counts them
    #              [22.5, 23.1, 22.8] → 68.4   3 items
    #              68.4 / 3 = 22.8
```

---

### 6. Building JSON to Send to APIs

When you call an API, you need to send JSON. Build a Python dict and convert it.

```python
import json

# Build a sensor reading to send to the factory API
sensor_reading = {
    "sensor_id": "TEMP-001",
    "temperature": 22.5,
    "humidity": 45.0,
    "timestamp": "2025-01-15T10:30:00Z",
    "is_calibrated": True
}

# Convert to JSON string for sending
json_payload = json.dumps(sensor_reading)
print(json_payload)
# {"sensor_id": "TEMP-001", "temperature": 22.5, "humidity": 45.0, ...}

# Pretty-print for debugging (indented)
json_pretty = json.dumps(sensor_reading, indent=2)
print(json_pretty)
# {
#   "sensor_id": "TEMP-001",
#   "temperature": 22.5,
#   "humidity": 45.0,
#   ...
# }

# Convert back (simulating receiving a response)
response = json.loads(json_payload)
print(response["temperature"])  # 22.5
```

**What's happening:**
```python
json.dumps(sensor_reading, indent=2)
#         ^^^^^^^^^^^^^^^^  ^^^^^^
#         |                 └── indent=2 means: 2 spaces per nesting level
#         |                     Makes the output human-readable
#         └── Converts Python dict → JSON string
#
# Without indent: {"sensor_id": "TEMP-001", "temperature": 22.5}
# With indent=2:
# {
#   "sensor_id": "TEMP-001",
#   "temperature": 22.5
# }
```

---

### 7. Common Mistakes

```python
import json

# MISTAKE 1: Forgetting that JSON keys must be strings
data = {123: "value"}           # Valid Python dict
json.dumps(data)                # TypeError: keys must be strings!

# FIX: Use string keys
data = {"123": "value"}         # Valid JSON

# MISTAKE 2: Confusing loads/dumps with load/dump
json_str = '{"key": "value"}'

# WRONG: load() expects a file object, not a string
# json.load(json_str)  # TypeError!

# RIGHT: loads() works with strings
data = json.loads(json_str)

# MISTAKE 3: Not handling None values
data = {"sensor": None}
json_str = json.dumps(data)
print(json_str)  # {"sensor": null} — None becomes null in JSON

# When parsing back:
parsed = json.loads(json_str)
print(parsed["sensor"])  # None — this is correct
print(parsed["sensor"] + 1)  # TypeError: unsupported operand type(s) for +

# FIX: Always check for None before using
if parsed["sensor"] is not None:
    print(parsed["sensor"] + 1)

# MISTAKE 4: Forgetting JSON uses double quotes
bad_json = "{'key': 'value'}"   # WRONG: single quotes
# json.loads(bad_json)  # JSONDecodeError!

good_json = '{"key": "value"}'  # RIGHT: double quotes
json.loads(good_json)            # Works!

# MISTAKE 5: Modifying dict during iteration
data = json.loads('{"a": 1, "b": 2, "c": 3}')
for key in data:
    if data[key] == 2:
        del data[key]  # RuntimeError: dictionary changed size during iteration!

# FIX: Create a list of keys first
for key in list(data.keys()):
    if data[key] == 2:
        del data[key]
```

---

### 8. JSON in Real Factory Code

```python
import json
from typing import Optional

def parse_sensor_response(raw_response: str) -> dict:
    """
    Parse a JSON response from a factory sensor API.
    Returns a cleaned dictionary with validated fields.
    """
    # Step 1: Parse the JSON
    try:
        data = json.loads(raw_response)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from sensor: {e}")
    
    # Step 2: Extract and validate fields
    sensor_id = data.get("sensor_id", "UNKNOWN")
    temperature = data.get("temperature")
    
    if temperature is None:
        raise ValueError(f"Sensor {sensor_id}: missing temperature reading")
    
    if not isinstance(temperature, (int, float)):
        raise ValueError(f"Sensor {sensor_id}: temperature must be numeric, got {type(temperature)}")
    
    # Step 3: Build a clean, validated result
    return {
        "sensor_id": sensor_id,
        "temperature": float(temperature),
        "valid": True
    }

# Test it
response = '{"sensor_id": "TEMP-001", "temperature": 22.5}'
result = parse_sensor_response(response)
print(result)  # {'sensor_id': 'TEMP-001', 'temperature': 22.5, 'valid': True}
```

---

### Summary

APIs are how your agents will interact with the outside world. JSON is the text-based format they use to send data back and forth. Understanding how to convert JSON text into usable Python dictionaries is a critical first step before we learn how to make actual network requests.

**Key takeaways:**
- `json.loads()` converts JSON string → Python dict
- `json.dumps()` converts Python dict → JSON string
- JSON uses `true/false/null`; Python uses `True/False/None`
- Always use `.get()` for safe dictionary access
- Wrap `json.loads()` in try/except for external data
- JSON keys must always be strings (in double quotes)

---

### Quick Reference Table

| Operation | Code | Result |
|-----------|------|--------|
| Parse JSON string | `json.loads(str)` | Python dict/list |
| Create JSON string | `json.dumps(dict)` | JSON string |
| Pretty-print JSON | `json.dumps(dict, indent=2)` | Formatted JSON |
| Safe key access | `dict.get("key", default)` | Value or default |
| Read JSON file | `json.load(file_obj)` | Python dict |
| Write JSON file | `json.dump(dict, file_obj)` | Writes to file |
| Check if valid | `try: json.loads(s) except JSONDecodeError` | Boolean check |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. The round trip is not always perfect.** Predict all three printed lines:

```python
import json

d = {"ok": True, "err": None, "ids": (1, 2), 7: 1.0}
s = json.dumps(d)
print(s)
d2 = json.loads(s)
print(d2)
print(d2 == d)
```

**Q2. Chained indexing.** Using the chapter's `factory_json` from Section 5 (after `data = json.loads(factory_json)`), predict each value:

```python
print(data["sensors"][1]["readings"][-1])
print(len(data["alerts"]["critical"]))
print(data["sensors"][1]["id"][:4])
print(type(data["alerts"]["count"]).__name__)
```

**Q3. Re-run the averaging loop.** Suppose the API now returns four temperature readings: `"readings": [22.5, 23.1, 22.8, 24.0]` for `TEMP-001` (`PRES-001` is unchanged). Using the chapter's loop (`print(f"Sensor {sensor_id} ({sensor_type}): avg = {avg_reading:.1f}")`), fill in the trace and give both printed lines.

| Sensor | `sum(readings)` | `len(readings)` | `avg_reading` | Printed with `:.1f` |
|--------|-----------------|-----------------|---------------|---------------------|
| `TEMP-001` | ? | ? | ? | ? |
| `PRES-001` | ? | ? | ? | ? |

**Q4. Which guard fires?** Feed each raw string to the chapter's `parse_sensor_response` (Section 8). For each one, say whether it returns a dict (and which one) or raises `ValueError` (and from which check):

```python
'{"sensor_id": "T2", "temperature": "22.5"}'
'{"temperature": 0}'
"{'sensor_id': 'T3'}"
'{"sensor_id": "T4", "temperature": null}'
'{"sensor_id": "T5", "temperature": true}'
```

### Coding Exercises

**E1 (Easy). Count live sensors.** Write `count_active(raw: str) -> int` that parses a factory-style JSON string and returns how many entries in `"sensors"` have `"status": "active"`. A missing `"sensors"` key counts as zero sensors.

```python
raw = '{"sensors": [{"id": "TEMP-001", "status": "active"}, {"id": "PRES-001", "status": "offline"}, {"id": "HUM-001", "status": "active"}]}'
count_active(raw)   # 2
count_active('{}')  # 0
```

**E2 (Easy–Medium). Per-sensor averages.** Write `sensor_averages(raw: str) -> dict[str, float]` that maps each sensor `"id"` to the average of its `"readings"`, rounded to 1 decimal. Skip sensors whose readings list is empty or missing (do not divide by zero).

```python
raw = '{"sensors": [{"id": "TEMP-001", "readings": [22.5, 23.1, 22.8]}, {"id": "PRES-001", "readings": []}, {"id": "HUM-001", "readings": [40.0, 45.0]}]}'
sensor_averages(raw)   # {'TEMP-001': 22.8, 'HUM-001': 42.5}
```

**E3 (Medium). Layered robot config.** Write `merge_config(defaults_json: str, override_json: str) -> str`. Parse both strings, then merge them *deeply*: if a key holds a dict in both, merge those dicts recursively. Otherwise the override value wins. Return the result with `json.dumps(..., sort_keys=True)`. If either input is invalid JSON, raise `ValueError` with a message that starts with `Invalid config JSON:`.

```python
defaults = '{"robot": "amr-7", "limits": {"max_vel": 2.0, "max_accel": 1.0}, "debug": false}'
override = '{"limits": {"max_vel": 1.5}, "debug": true}'
merge_config(defaults, override)
# '{"debug": true, "limits": {"max_accel": 1.0, "max_vel": 1.5}, "robot": "amr-7"}'
merge_config('{"a": {"b": 1}}', '{"a": 5}')
# '{"a": 5}'
```

#### Dry-Run: Answers

**Q1.** Output:

```python
{"ok": true, "err": null, "ids": [1, 2], "7": 1.0}
{'ok': True, 'err': None, 'ids': [1, 2], '7': 1.0}
False
```

| Python value | JSON text | Back in Python |
|--------------|-----------|----------------|
| `True` | `true` | `True` |
| `None` | `null` | `None` |
| tuple `(1, 2)` | array `[1, 2]` | **list** `[1, 2]` |
| int key `7` | string key `"7"` | **str** key `'7'` |

`d2 != d` because the tuple came back as a list and the key `7` came back as `'7'`. Note that `json.dumps` silently converts `int`, `float`, `bool` and `None` keys to strings. It only raises `TypeError` for keys like tuples (`{(1, 2): "v"}`). Never assume a dict with non-string keys survives a JSON round trip unchanged.

**Q2.** Output:

```python
101.4
0
PRES
int
```

- `data["sensors"][1]` is the pressure sensor, and `[-1]` is its last reading, `101.4`.
- `data["alerts"]["critical"]` is the empty list `[]`, so its length is `0`.
- `"PRES-001"[:4]` is `"PRES"`.
- The JSON number `0` (no decimal point) parses as a Python `int`.

**Q3.**

| Sensor | `sum(readings)` | `len(readings)` | `avg_reading` | Printed with `:.1f` |
|--------|-----------------|-----------------|---------------|---------------------|
| `TEMP-001` | $22.5+23.1+22.8+24.0 = 92.4$ | 4 | $92.4/4 = 23.1$ | `23.1` |
| `PRES-001` | $101.3+101.2+101.4 = 303.9$ | 3 | $303.9/3 = 101.3$ | `101.3` |

```python
Sensor TEMP-001 (temperature): avg = 23.1
Sensor PRES-001 (pressure): avg = 101.3
```

**Q4.**

| Input | Result | Which check |
|-------|--------|-------------|
| `"temperature": "22.5"` | `ValueError: Sensor T2: temperature must be numeric, got <class 'str'>` | `isinstance` check: a quoted number is a *string* |
| `{"temperature": 0}` | `{'sensor_id': 'UNKNOWN', 'temperature': 0.0, 'valid': True}` | passes: `0 is None` is `False`, so `0` is accepted, and `.get` supplies `"UNKNOWN"` |
| `"{'sensor_id': 'T3'}"` | `ValueError: Invalid JSON from sensor: Expecting property name enclosed in double quotes: ...` | `json.loads` fails on single quotes (Mistake 4) |
| `"temperature": null` | `ValueError: Sensor T4: missing temperature reading` | `null` becomes `None` |
| `"temperature": true` | `{'sensor_id': 'T5', 'temperature': 1.0, 'valid': True}` | **passes!** In Python `bool` is a subclass of `int`, so `isinstance(True, (int, float))` is `True` and `float(True)` is `1.0` |

The last row is a real validation hole: add `if isinstance(temperature, bool): raise ValueError(...)` *before* the numeric check (or use Pydantic, which comes later in the course).

**E1 — reference solution**

```python
import json

def count_active(raw: str) -> int:
    data = json.loads(raw)
    return sum(1 for s in data.get("sensors", []) if s.get("status") == "active")
```

`.get("sensors", [])` gives the missing-key case for free, and `.get("status")` returns `None` instead of crashing on a sensor without a status. Cost: $O(n)$ in the number of sensors.

**E2 — reference solution**

```python
import json

def sensor_averages(raw: str) -> dict[str, float]:
    data = json.loads(raw)
    result: dict[str, float] = {}
    for sensor in data.get("sensors", []):
        readings = sensor.get("readings", [])
        if not readings:            # empty or missing: skip, never divide by zero
            continue
        result[sensor["id"]] = round(sum(readings) / len(readings), 1)
    return result
```

Check: $(22.5 + 23.1 + 22.8)/3 = 68.4/3 = 22.8$ and $(40 + 45)/2 = 42.5$. Cost: $O(\text{total readings})$.

**E3 — reference solution**

```python
import json

def deep_merge(base: dict, override: dict) -> dict:
    merged = dict(base)                     # shallow copy: never mutate the caller's dict
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)   # both sides are dicts: recurse
        else:
            merged[key] = value                            # otherwise the override wins
    return merged

def merge_config(defaults_json: str, override_json: str) -> str:
    try:
        defaults = json.loads(defaults_json)
        override = json.loads(override_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid config JSON: {e}")
    return json.dumps(deep_merge(defaults, override), sort_keys=True)
```

Why it works: recursion only happens when *both* sides hold a dict, so `limits.max_accel` survives while `limits.max_vel` is replaced. In the second example the override value `5` is not a dict, so it replaces the whole `{"b": 1}` subtree. `sort_keys=True` makes the output deterministic. Cost: $O(\text{total keys})$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Understanding APIs & JSON**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 apis and json**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

