# Part 2, Topic 1: Data Validation with Pydantic
## Chapter 1: BaseModels

**Prerequisite Knowledge:** Basic Python dictionaries and understanding of type hints.

---

## 1. The 'Shape Sorter' Analogy

Imagine a toddler's shape-sorting toy. The toy has specific holes: one for a square peg, one for a round peg, and one for a star peg. If a child tries to smash a star peg into the round hole, it just won't fit, and the toy rejects it immediately.

When an AI gives you data, it's like a toddler handing you a peg. You don't know what shape it is. Pydantic `BaseModel`s are the shape-sorter toy. You define exactly what the data should look like ("I need an integer, a string, and a float"). When the AI gives you data, Pydantic checks it. If it doesn't fit, Pydantic rejects it immediately instead of letting bad data crash your program.

When an LLM generates JSON, there is no guarantee the structure matches what your code expects. A missing field, a wrong type, or an unexpected value can crash your pipeline silently. Pydantic BaseModels give you a typed boundary between raw LLM output and your application logic, catching structural errors the moment they arrive.

```
                    LLM RAW OUTPUT
                    ================

            "Please set temp to hot"
            {"action": "set_temp",
             "value": "hot"}

                          |
                          v
    +-------------------------------------------+
    |           PYDANTIC VALIDATOR              |
    |                                           |
    |   Expected:  { action: str, value: float }|
    |   Got:       { action: str, value: str  } |
    |                                           |
    |   STATUS: *** REJECTED ***                |
    +-------------------------------------------+
                          |
                          v
                    APPLICATION
                    ============

        Error caught safely, no crash.
```

---

## 2. Defining a BaseModel

A BaseModel is a Python class that declares fields with types. When you instantiate it, Pydantic validates and coerces the input automatically.

### Basic Example

```python
from pydantic import BaseModel

# We define the strict "shape" of our data here
class SensorReading(BaseModel):
    sensor_id: str
    temperature: float
    humidity: float
    timestamp: str

# Create an instance of our model
reading = SensorReading(
    sensor_id="T-001",
    temperature=72.5,
    humidity=45.0,
    timestamp="2025-01-15T10:30:00Z"
)

print(reading.sensor_id)
print(reading.temperature)
print(type(reading.temperature))
```

Output:
```
T-001
72.5
<class 'float'>
```

**What's happening:**
- `class SensorReading(BaseModel):` — We define a schema class that inherits from `BaseModel`. This is our "blueprint" for what valid sensor data looks like.
- `sensor_id: str` — We declare that `sensor_id` must be a string. Pydantic will check this at creation time.
- `temperature: float` — We declare that `temperature` must be a float. If a string `"72.5"` is passed, Pydantic coerces it.
- `reading = SensorReading(...)` — We create an instance. Pydantic validates every field during this call.
- `type(reading.temperature)` — Returns `float` because Pydantic enforced the type.

Notice that Pydantic coerces `72.5` (a float) even if you pass `"72.5"` (a string). This is one of its core strengths — it normalizes messy input into clean typed objects.

### Type Coercion: String to Float

```python
from pydantic import BaseModel

class SensorReading(BaseModel):
    sensor_id: str
    temperature: float

# Passing string for a float field — Pydantic coerces it
reading = SensorReading(sensor_id="T-002", temperature="72.5")
print(reading.temperature)
print(type(reading.temperature))
```

Output:
```
72.5
<class 'float'>
```

**What's happening:**
- `"72.5"` is a string, but the field expects `float`.
- Pydantic automatically converts the string to a float.
- This coercion is convenient but can hide bugs — always be aware of it.

### Edge Case: Failed Coercion

```python
from pydantic import BaseModel, ValidationError

class SensorReading(BaseModel):
    sensor_id: str
    temperature: float

# "not_a_number" cannot be converted to float
try:
    reading = SensorReading(sensor_id="T-003", temperature="not_a_number")
except ValidationError as e:
    print(e)
```

Output:
```
1 validation error for SensorReading
temperature
  Input should be a valid number, unable to parse string as a number
  [type=number_parsing, input_value='not_a_number', input_type=str]
```

**What's happening:**
- `"not_a_number"` is a string that cannot be parsed as a float.
- Pydantic raises `ValidationError` with a clear message showing which field failed and why.
- This is the shape-sorter rejecting the star peg from the round hole.

---

## 3. Parsing from Dicts and JSON

LLMs return strings. You parse the string into a dict, then feed the dict to your model. Pydantic also has a class method `model_validate` that does this directly.

### Basic: From Dict to Model

```python
from pydantic import BaseModel

class PressureReading(BaseModel):
    sensor_id: str
    pressure: float
    unit: str

raw_dict = {"sensor_id": "P-042", "pressure": 14.7, "unit": "psi"}

# Pass the dictionary to Pydantic to ensure it is valid
reading = PressureReading.model_validate(raw_dict)

print(reading.sensor_id)
print(reading.pressure)
```

Output:
```
P-042
14.7
```

**What's happening:**
- `raw_dict` is a plain Python dictionary — the kind you get from `json.loads()`.
- `PressureReading.model_validate(raw_dict)` tells Pydantic: "Check this dict against my schema, coerce types if needed, and return a validated object."
- The returned `reading` is a `PressureReading` instance with full type safety.

### Basic: From JSON String Directly

The alternative `model_validate_json` accepts a raw JSON string directly, skipping the `json.loads` step:

```python
reading = PressureReading.model_validate_json('{"sensor_id": "P-042", "pressure": 14.7, "unit": "psi"}')
print(reading)
```

Output:
```
sensor_id='P-042' pressure=14.7 unit='psi'
```

**What's happening:**
- `model_validate_json()` parses the JSON string AND validates in one step.
- This is faster than calling `json.loads()` + `model_validate()` because it avoids creating an intermediate dict.

### Comparison: model_validate vs model_validate_json

| Feature | `model_validate(dict)` | `model_validate_json(str)` |
|---|---|---|
| Input type | Python dict | JSON string |
| Requires `json.loads` first? | Yes (if starting from JSON) | No |
| Speed | Slightly slower (two steps) | Slightly faster (one step) |
| Use when | You already have a dict | You have a raw JSON string |
| Common source | `json.loads(llm_output)` | Direct from LLM response |

### Common Mistake: Forgetting to Parse

```python
from pydantic import BaseModel, ValidationError

class PressureReading(BaseModel):
    sensor_id: str
    pressure: float
    unit: str

# LLM gives you a raw JSON string
llm_response = '{"sensor_id": "P-042", "pressure": 14.7, "unit": "psi"}'

# WRONG: Passing the raw string instead of a dict
try:
    reading = PressureReading.model_validate(llm_response)
except ValidationError as e:
    print(f"Error: {e}")
```

Output:
```
Error: 1 validation error for PressureReading
  Input should be a valid dictionary or instance of PressureReading
  [type=model_type, input_value='{"sensor_id": "P-042", ...', input_type=str]
```

**What's happening:**
- `model_validate()` expects a dict, not a JSON string.
- Passing a string causes a validation error.
- Fix: Either use `model_validate_json()` or parse with `json.loads()` first.

---

## 4. Nested Models

Real LLM outputs often contain nested structures. Pydantic handles these naturally by composing models.

### Basic Nested Model

```python
from pydantic import BaseModel

# We define the inner piece first
class Location(BaseModel):
    latitude: float
    longitude: float

# Then we use it inside the outer piece
class DroneTelemetry(BaseModel):
    drone_id: str
    battery_pct: float
    location: Location  # We declare the type as our Location model!
    heading: float

data = {
    "drone_id": "DRN-7",
    "battery_pct": 82.5,
    "location": {"latitude": 37.7749, "longitude": -122.4194},
    "heading": 180.0
}

telemetry = DroneTelemetry.model_validate(data)
print(telemetry.location.latitude)
print(telemetry.drone_id)
```

Output:
```
37.7749
DRN-7
```

**What's happening:**
- `Location` is a small model with just two floats.
- `DroneTelemetry` references `Location` as a field type.
- When `model_validate()` receives the dict, Pydantic validates `location` recursively — it checks that the nested dict has valid `latitude` and `longitude` values.
- The returned `telemetry.location` is a full `Location` instance, not a plain dict.

Nested validation happens recursively — if the inner `location` dict is missing `latitude`, Pydantic raises a clear error pointing to the exact path.

### Nested Model Data Flow

```
    RAW DICT FROM LLM
    ==================
    {
      "drone_id": "DRN-7",
      "battery_pct": 82.5,
      "location": {             <-- this is validated as Location
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "heading": 180.0
    }
              |
              v
    +------------------------------------+
    |  DroneTelemetry.model_validate()   |
    |                                    |
    |  1. drone_id -> str     ✓         |
    |  2. battery_pct -> float ✓        |
    |  3. location -> Location           |
    |     a. latitude -> float  ✓        |
    |     b. longitude -> float ✓        |
    |  4. heading -> float    ✓         |
    +------------------------------------+
              |
              v
    VALIDATED OBJECT
    ================
    DroneTelemetry(
      drone_id="DRN-7",
      battery_pct=82.5,
      location=Location(lat=37.77, lon=-122.41),
      heading=180.0
    )
```

### Error at Exact Path

```python
from pydantic import BaseModel, ValidationError

class Location(BaseModel):
    latitude: float
    longitude: float

class DroneTelemetry(BaseModel):
    drone_id: str
    battery_pct: float
    location: Location
    heading: float

bad_data = {
    "drone_id": "DRN-8",
    "battery_pct": 90.0,
    "location": {"latitude": "not_a_number", "longitude": -122.0},
    "heading": 90.0
}

try:
    telemetry = DroneTelemetry.model_validate(bad_data)
except ValidationError as e:
    print(e)
```

Output:
```
1 validation error for DroneTelemetry
location.latitude
  Input should be a valid number, unable to parse string as a number
  [type=number_parsing, input_value='not_a_number', input_type=str]
```

**What's happening:**
- The error path is `location.latitude`, not just `latitude`.
- Pydantic tells you exactly which nested field failed.
- This is critical for debugging LLM outputs with deep nesting.

---

## 5. Serialization: model_dump vs dict

Pydantic v2 replaced `dict()` with `model_dump()`. The old method still works but is deprecated.

### Basic Serialization

```python
from pydantic import BaseModel

class Alert(BaseModel):
    severity: str
    message: str
    code: int

alert = Alert(severity="high", message="Temperature exceeded", code=501)

# model_dump converts our safe object back into a normal dictionary
new_dict = alert.model_dump()

print(new_dict)
print(type(new_dict))
```

Output:
```
{'severity': 'high', 'message': 'Temperature exceeded', 'code': 501}
<class 'dict'>
```

**What's happening:**
- `model_dump()` returns a plain Python dict.
- The dict is safe to pass to APIs, logging, or any function expecting a dict.
- `type(new_dict)` confirms it's a `dict`, not a BaseModel.

For JSON output, use `model_dump_json`:

```python
# Turns the object directly into a nicely formatted JSON string
json_str = alert.model_dump_json(indent=2)
print(json_str)
```

Output:
```
{
  "severity": "high",
  "message": "Temperature exceeded",
  "code": 501
}
```

**What's happening:**
- `model_dump_json()` returns a JSON string, not a dict.
- `indent=2` makes the output human-readable.
- This is useful when sending data back to an LLM or API.

### Comparison: model_dump vs model_dump_json

| Feature | `model_dump()` | `model_dump_json()` |
|---|---|---|
| Returns | Python dict | JSON string |
| Nested models | Dicts recursively | JSON string recursively |
| Requires import | No extra import needed | No extra import needed |
| Use when | Need a dict for Python code | Need a string for APIs/logging |
| Speed | Slightly faster | Slightly slower (JSON serialization) |

Key difference: `dict()` in Pydantic v1 returned nested models as dicts too. In v2, `model_dump()` is the explicit replacement and always returns plain dicts recursively.

### Selective Serialization

```python
from pydantic import BaseModel

class SensorReading(BaseModel):
    sensor_id: str
    temperature: float
    humidity: float
    internal_voltage: float

reading = SensorReading(
    sensor_id="T-001",
    temperature=72.5,
    humidity=45.0,
    internal_voltage=3.3
)

# Only export certain fields
public_data = reading.model_dump(include={"sensor_id", "temperature", "humidity"})
print(public_data)
```

Output:
```
{'sensor_id': 'T-001', 'temperature': 72.5, 'humidity': 45.0}
```

**What's happening:**
- `include` lets you pick which fields to export.
- `internal_voltage` is excluded — useful for hiding internal state from external APIs.
- You can also use `exclude={"internal_voltage"}` to blacklist instead of whitelist.

---

## 6. Why This Matters for LLM Pipelines

Consider an LLM that generates tool call arguments as JSON. Without validation, you might get:

```python
import json

llm_output = '{"action": "set_temp", "value": "hot"}'
args = json.loads(llm_output)

def set_temperature(temp: float):
    # This will crash because you can't multiply the word "hot"!
    return temp * 9 / 5 + 32

# set_temperature(args["value"]) # UNCOMMENT TO SEE CRASH
```

This crashes because `"hot"` is not a float. With Pydantic:

```python
from pydantic import BaseModel, ValidationError

class SetTempArgs(BaseModel):
    action: str
    value: float

try:
    args = SetTempArgs.model_validate_json(llm_output)
    print(f"Valid: setting temperature to {args.value}")
except ValidationError as e:
    # The error is caught safely here
    print(f"Rejected: {e}")
```

Output:
```
Rejected: 1 validation error for SetTempArgs
value
  Input should be a valid number, unable to parse string as a number [type=number_parsing, input_value='hot', input_type=str]
```

**What's happening:**
- `SetTempArgs` defines that `value` must be a float.
- When the LLM returns `"hot"` (a string), `model_validate_json` raises `ValidationError`.
- The `try/except` catches it safely — your pipeline continues without crashing.
- The invalid LLM output is caught before it can reach your control system.

### Pipeline Flow

```
    LLM GENERATES
    ==============
    {"action": "set_temp", "value": "hot"}
              |
              v
    PYDANTIC VALIDATOR
    ==================
    SetTempArgs.model_validate_json(...)
              |
              +--- VALID ---> args.value = 72.0 (coerced float)
              |                set_temperature(args.value) --> works
              |
              +--- INVALID -> ValidationError
                               "Rejected: ..."
                               pipeline continues safely
```

---

## 7. Quick Reference

| Operation | Method | Input | Output |
|---|---|---|---|
| Create from kwargs | `Model(a=1, b=2)` | Keyword args | Model instance |
| Validate a dict | `Model.model_validate(dict)` | Dict | Model instance |
| Validate JSON | `Model.model_validate_json(str)` | JSON string | Model instance |
| Serialize to dict | `model.model_dump()` | Model instance | Dict |
| Serialize to JSON | `model.model_dump_json()` | Model instance | JSON string |
| Selective export | `model.model_dump(include={...})` | Model instance | Dict (subset) |

### Common Imports

```python
from pydantic import BaseModel          # Core class
from pydantic import ValidationError    # Error type for try/except
```

### Pydantic v1 vs v2

| Feature | Pydantic v1 | Pydantic v2 |
|---|---|---|
| Validate dict | `.from_dict(dict)` | `.model_validate(dict)` |
| Validate JSON | `.parse_raw(str)` | `.model_validate_json(str)` |
| Serialize to dict | `.dict()` | `.model_dump()` |
| Serialize to JSON | `.json()` | `.model_dump_json()` |
| Error type | `ValidationError` | `ValidationError` (same) |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Coercion direction.** Using the chapter's two-field `SensorReading` (`sensor_id: str`, `temperature: float`), predict what each line does: print a value, or raise `ValidationError`?

```python
r1 = SensorReading(sensor_id="T-010", temperature=72)
print(r1.temperature, type(r1.temperature).__name__)   # (a)

r2 = SensorReading(sensor_id="T-011", temperature="  98.6 ")
print(r2.temperature)                                   # (b)

r3 = SensorReading(sensor_id=42, temperature=1.0)       # (c)
```

**Q2. Two errors, two paths.** Using the chapter's `Location` / `DroneTelemetry` models, how many errors does this raise, and what is the dotted path of each? Does `battery_pct="75"` cause one of them?

```python
DroneTelemetry.model_validate({
    "drone_id": "DRN-9",
    "battery_pct": "75",
    "location": {"latitude": 37.7},
    "heading": "north",
})
```

**Q3. Serialization.** Using the chapter's `Alert` model, what do the two `print` calls show? Note that `code` is passed as a string.

```python
alert = Alert(severity="high", message="Temperature exceeded", code="501")
print(alert.model_dump(exclude={"code"}))
print(alert.model_dump_json())
```

**Q4. Integer fields and fractions.** With the same `Alert` model, which of these succeeds, and what is `.code` when it does?

```python
Alert(severity="low", message="ok", code=501.0)   # (a)
Alert(severity="low", message="ok", code=501.5)   # (b)
```

**Q5. JSON with a quoted number.** Does this validate? If yes, what is printed?

```python
print(PressureReading.model_validate_json(
    '{"sensor_id": "P-042", "pressure": "14.7", "unit": "psi"}'
))
```

### Coding Exercises

**E1 (Easy).** Define a `BatteryStatus` model with `robot_id: str`, `voltage: float`, `charging: bool`, and write `parse_battery(raw: str) -> BatteryStatus | None` that validates a raw LLM JSON string and returns `None` (never raises) when validation fails.

- `parse_battery('{"robot_id": "R-1", "voltage": "24.3", "charging": true}')` → `robot_id='R-1' voltage=24.3 charging=True`
- `parse_battery('{"robot_id": "R-1", "voltage": "low", "charging": true}')` → `None`

**E2 (Easy–Medium).** Write `validate_batch(items: list[dict]) -> tuple[list[SensorReading], list[str]]` using the two-field `SensorReading`. Return the valid readings and, for every individual error, a string `"item {i}: {dotted.path}: {msg}"`. One bad item can produce more than one error string.

- Input `[{"sensor_id": "T-1", "temperature": "21.5"}, {"sensor_id": "T-2"}, {"sensor_id": "T-3", "temperature": "hot"}]`
- Valid temperatures: `[21.5]`
- Errors: `["item 1: temperature: Field required", "item 2: temperature: Input should be a valid number, unable to parse string as a number"]`

**E3 (Medium).** Define `Waypoint(latitude: float, longitude: float)` and `Mission(mission_id: str, waypoints: list[Waypoint])`. Write `first_error_path(data: dict) -> str | None` that returns the dotted path of the first validation error (list indices included), or `None` if the data is valid.

- Waypoints `[{"latitude": 37.7, "longitude": -122.4}, {"latitude": "north", "longitude": -122.5}]` → `"waypoints.1.latitude"`
- `{"mission_id": "M-2", "waypoints": []}` → `None` (an empty list is still a valid list)

#### Dry-Run: Answers

**Q1.**
(a) prints `72.0 float`. The int `72` is coerced to the float `72.0`.
(b) prints `98.6`. The string is stripped of surrounding whitespace and parsed as a number.
(c) raises `ValidationError`: `sensor_id` / `Input should be a valid string [type=string_type, input_value=42, input_type=int]`. Pydantic v2 turns numeric strings into numbers, but it does **not** turn numbers into strings. Coercion only goes one way.

**Q2.** **2 errors**, collected in one pass.

| Path | Message | Why |
|---|---|---|
| `location.longitude` | `Field required` (`type=missing`) | the nested dict has no `longitude` key |
| `heading` | `Input should be a valid number, unable to parse string as a number` | `"north"` is not numeric |

`battery_pct="75"` is fine: it is coerced to `75.0`. Pydantic does not stop at the first failure. It reports every failing field, each with its full path.

**Q3.**

```python
{'severity': 'high', 'message': 'Temperature exceeded'}
{"severity":"high","message":"Temperature exceeded","code":501}
```

`exclude` drops `code` from the dict. In the JSON string, `code` is the **integer** `501` (no quotes) because `"501"` was coerced to `int` at construction. Without `indent`, `model_dump_json()` gives compact output with no spaces after `:` or `,`.

**Q4.**
(a) succeeds, `.code == 501` (an `int`). A float with no fractional part is accepted for an `int` field.
(b) raises `ValidationError`: `code` / `Input should be a valid integer, got a number with a fractional part [type=int_from_float, ...]`. Pydantic will not silently truncate `501.5` to `501`.

**Q5.** It validates and prints `sensor_id='P-042' pressure=14.7 unit='psi'`. In lax mode a JSON string containing a number is accepted for a `float` field, just like `"72.5"` in the chapter's coercion example.

**E1 — reference solution**

```python
from pydantic import BaseModel, ValidationError

class BatteryStatus(BaseModel):
    robot_id: str
    voltage: float
    charging: bool

def parse_battery(raw: str) -> BatteryStatus | None:
    try:
        return BatteryStatus.model_validate_json(raw)   # parse + validate in one step
    except ValidationError:
        return None
```

$O(n)$ in the length of the JSON string. Catching only `ValidationError` (not bare `Exception`) means real bugs elsewhere still surface. Malformed JSON also raises `ValidationError` (`type=json_invalid`), so it returns `None` as well.

**E2 — reference solution**

```python
from pydantic import BaseModel, ValidationError

class SensorReading(BaseModel):
    sensor_id: str
    temperature: float

def validate_batch(items: list[dict]) -> tuple[list[SensorReading], list[str]]:
    good: list[SensorReading] = []
    bad: list[str] = []
    for i, item in enumerate(items):
        try:
            good.append(SensorReading.model_validate(item))
        except ValidationError as e:
            for err in e.errors():                       # one entry per failing field
                path = ".".join(str(p) for p in err["loc"])
                bad.append(f"item {i}: {path}: {err['msg']}")
    return good, bad
```

$O(n)$ over the batch. `e.errors()` returns a list of dicts with `loc` (a tuple path), `msg`, `type` and `input`, which is easier to log than `str(e)`.

**E3 — reference solution**

```python
from pydantic import BaseModel, ValidationError

class Waypoint(BaseModel):
    latitude: float
    longitude: float

class Mission(BaseModel):
    mission_id: str
    waypoints: list[Waypoint]

def first_error_path(data: dict) -> str | None:
    try:
        Mission.model_validate(data)
        return None
    except ValidationError as e:
        # loc for a list item is ('waypoints', 1, 'latitude'); the index is an int
        return ".".join(str(p) for p in e.errors()[0]["loc"])
```

Validation recurses into every list element, and the list index becomes part of `loc`. `str(p)` handles the integer index.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: BaseModels**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 basemodels**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

