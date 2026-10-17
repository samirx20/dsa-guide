# Part 7, Topic 1: Data Validation with Pydantic
## Chapter 2: Field Constraints

**Prerequisite Knowledge:** Basic understanding of Pydantic `BaseModel`s.

---

### The 'Bouncer at the Door' Analogy

Imagine field constraints are the bouncers at an exclusive nightclub. Just having a ticket (being an integer) isn't enough. The bouncer checks your ID to see if you are over 21 (a `gt` or "greater than" rule) and checks the club's capacity to ensure it isn't full (a `lt` or "less than" rule). If you don't meet every single physical requirement, you don't get through the door.

```
                    NIGHTCLUB ENTRANCE
    ┌──────────────────────────────────────────┐
    │  You: "I'm a float!"                    │
    │  Bouncer (Field Constraint):             │
    │    ✓ Type = float?            PASS       │
    │    ✓ ge=-50?                  PASS       │
    │    ✓ le=200?                  PASS       │
    │    → Welcome inside!                     │
    │                                          │
    │  You: "I'm also a float!"               │
    │  Bouncer (Field Constraint):             │
    │    ✓ Type = float?            PASS       │
    │    ✓ ge=-50?                  PASS       │
    │    ✗ le=200?                  FAIL       │
    │    → REJECTED: value 9999 > 200          │
    └──────────────────────────────────────────┘
```

Type checking alone is not enough. A temperature of 9999.0 is a valid float, but it is physically impossible for most sensors. Field constraints let you encode domain knowledge directly into your model — minimums, maximums, patterns, and enumerated choices — so invalid data is rejected at the boundary.

---

### 1. Numeric Constraints with Field()

Pydantic's `Field()` function accepts constraints like `ge` (greater than or equal), `le` (less than or equal), `gt`, and `lt`.

```python
from pydantic import BaseModel, Field

class TemperatureSensor(BaseModel):
    sensor_id: str
    # The value must be >= -50 and <= 200
    temperature: float = Field(ge=-50.0, le=200.0)
    unit: str = Field(default="Celsius")

# This works fine
sensor = TemperatureSensor(sensor_id="T-001", temperature=72.5)
print(sensor.temperature)

try:
    # This will fail because 500 is > 200
    bad = TemperatureSensor(sensor_id="T-002", temperature=500.0)
except Exception as e:
    print(f"Rejected: {e}")
```

**What's happening:**
```python
temperature: float = Field(ge=-50.0, le=200.0)
#             ^         ^      ^
#             |         |      └── le=200.0: less than or equal to 200
#             |         └── ge=-50.0: greater than or equal to -50
#             └── float: must be a number
```

Output:
```
72.5
Rejected: 1 validation error for TemperatureSensor
temperature
  Input should be less than or equal to 200 [type=less_than_equal, input_value=500.0, input_type=float]
```

### Constraint Operators Reference

| Operator | Meaning | Example |
|----------|---------|---------|
| `ge` | Greater than or equal | `ge=0` means value >= 0 |
| `le` | Less than or equal | `le=100` means value <= 100 |
| `gt` | Greater than (strict) | `gt=0` means value > 0 |
| `lt` | Less than (strict) | `lt=100` means value < 100 |
| `multiple_of` | Must be a multiple | `multiple_of=5` means 0, 5, 10, 15... |

### Strict vs Inclusive Bounds

```python
from pydantic import BaseModel, Field, ValidationError

class SensorRange(BaseModel):
    # gt = strict greater than (0 is NOT allowed)
    positive_only: float = Field(gt=0.0)
    # ge = inclusive (0 IS allowed)
    non_negative: float = Field(ge=0.0)
    # lt = strict less than (100 is NOT allowed)
    below_limit: float = Field(lt=100.0)
    # le = inclusive (100 IS allowed)
    at_most: float = Field(le=100.0)

# Boundary testing
test_cases = [
    (0.0, "positive_only", False),
    (0.001, "positive_only", True),
    (99.9, "below_limit", True),
    (100.0, "at_most", True),
    (100.0, "below_limit", False),
]

for value, field_name, should_pass in test_cases:
    try:
        data = {
            "positive_only": 0.01, "non_negative": 0.0,
            "below_limit": 50.0, "at_most": 100.0,
            field_name: value
        }
        SensorRange(**data)
        status = "PASS" if should_pass else "UNEXPECTED PASS"
    except ValidationError:
        status = "PASS" if not should_pass else "UNEXPECTED FAIL"
    print(f"  {field_name}={value}: {status}")
```

Output:
```
  positive_only=0.0: PASS
  positive_only=0.001: PASS
  below_limit=99.9: PASS
  at_most=100.0: PASS
  below_limit=100.0: PASS
```

**What's happening:**
```python
positive_only: float = Field(gt=0.0)
#             ^         ^     ^
#             |         |     └── Must be strictly > 0
#             |         └── gt = "greater than" (exclusive)
#             └── float type

non_negative: float = Field(ge=0.0)
#               ^          ^     ^
#               |          |     └── Must be >= 0 (0 is allowed)
#               |          └── ge = "greater than or equal" (inclusive)
#               └── float type
```

---

### 2. String Constraints

Use `min_length`, `max_length`, and `pattern` for strings. The `pattern` parameter accepts a regular expression.

```python
from pydantic import BaseModel, Field

class SensorConfig(BaseModel):
    # Regex pattern: Must start with 2 uppercase letters, a dash, and 3 numbers
    sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]{2}-\d{3}$")
    name: str = Field(min_length=1, max_length=50)
    firmware_version: str = Field(pattern=r"^\d+\.\d+\.\d+$")

config = SensorConfig(
    sensor_id="TC-001",
    name="Main Thermocouple",
    firmware_version="2.1.0"
)
print(f"Configured: {config.sensor_id} v{config.firmware_version}")

try:
    bad = SensorConfig(sensor_id="bad_id", name="X", firmware_version="v2")
except Exception as e:
    print(f"Rejected: {e}")
```

**What's happening:**
```python
sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]{2}-\d{3}$")
#         ^        ^        ^         ^
#         |        |        |         └── Regex: 2 uppercase + dash + 3 digits
#         |        |        └── Max 20 characters
#         |        └── Min 1 character
#         └── Must be a string

firmware_version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
#                   ^        ^      ^
#                   |        |      └── Regex: digits.digits.digits (e.g. "2.1.0")
#                   └── Must be a string
```

Output:
```
Configured: TC-001 v2.1.0
Rejected: 2 validation errors for SensorConfig
sensor_id
  String should match pattern '^[A-Z]{2}-\d{3}$' [type=string_pattern_mismatch, input_value='bad_id', input_type=str]
firmware_version
  String should match pattern '^\d+\.\d+\.\d+$' [type=string_pattern_mismatch, input_value='v2', input_type=str]
```

### Common Regex Patterns for Industrial Data

| Pattern | Regex | Example Match |
|---------|-------|---------------|
| Sensor ID | `^[A-Z]{2}-\d{3}$` | TC-042, PR-001 |
| IP Address | `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$` | 192.168.1.1 |
| Timestamp | `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` | 2024-01-15T14:30:00 |
| Version | `^\d+\.\d+\.\d+$` | 2.1.0 |

### Common String Constraint Mistakes

```python
from pydantic import BaseModel, Field

class CommonMistakes(BaseModel):
    # MISTAKE 1: Forgetting to anchor regex with ^ and $
    # BAD:  r"\d{3}"    — matches "abc123def" (partial match)
    # GOOD: r"^\d{3}$"  — only matches exactly "123"
    code: str = Field(pattern=r"^\d{3}$")

    # MISTAKE 2: No min_length allows empty strings
    name: str = Field(min_length=1)

# This works
ok = CommonMistakes(code="123", name="Pressure")
print(f"Code: {ok.code}")

try:
    bad = CommonMistakes(code="abc123", name="P")
except Exception as e:
    print(f"Rejected: {e}")
```

Output:
```
Code: 123
Rejected: 1 validation error for CommonMistakes
code
  String should match pattern '^\d{3}$' [type=string_pattern_mismatch, input_value='abc123', input_type=str]
```

---

### 3. Literal Types for Enums

When a field should only accept specific values, use `Literal`. This is stricter than a string constraint because it creates a closed set of allowed values.

```python
from typing import Literal
from pydantic import BaseModel

class PumpCommand(BaseModel):
    pump_id: str
    # The user must provide EXACTLY one of these four strings
    action: Literal["start", "stop", "restart", "emergency_stop"]
    speed_rpm: int | None = None

cmd = PumpCommand(pump_id="P-01", action="start")
print(cmd.action)

try:
    bad = PumpCommand(pump_id="P-01", action="maybe")
except Exception as e:
    print(f"Rejected: {e}")
```

Output:
```
start
Rejected: 1 validation error for PumpCommand
action
  Input should be 'start', 'stop', 'restart' or 'emergency_stop' [type=literal_error, input_value='maybe', input_type=str]
```

### Literal vs Pattern — When to Use Each

```python
from typing import Literal
from pydantic import BaseModel, Field

class Comparison(BaseModel):
    # Literal: exact values, closed set — safer for LLMs
    status: Literal["active", "inactive", "error"]
    # Pattern: format-based, open set — flexible but riskier
    sensor_id: str = Field(pattern=r"^[A-Z]{2}-\d{3}$")

ok = Comparison(status="active", sensor_id="TC-001")
print(f"Status: {ok.status}, ID: {ok.sensor_id}")
```

| Use Case | Use Literal | Use Pattern |
|----------|------------|-------------|
| Known finite set | Yes | No |
| Format-based validation | No | Yes |
| LLM-generated values | Safer (closed set) | Riskier (open set) |
| Database enum column | Yes | No |
| IP addresses, emails | No | Yes |

**What's happening:**
```python
status: Literal["active", "inactive", "error"]
#        ^                                  ^
#        |                                  └── No other values allowed
#        └── Only these three strings (closed set)
```

---

### 4. default_factory for Mutable Defaults

Never use a mutable default like `[]` or `{}` in a field. Use `default_factory` to create a fresh instance each time.

```python
from pydantic import BaseModel, Field

class ControlPanel(BaseModel):
    panel_id: str
    # We use default_factory so every ControlPanel gets its OWN empty list
    active_alarms: list[str] = Field(default_factory=list)
    settings: dict[str, float] = Field(default_factory=dict)

panel1 = ControlPanel(panel_id="CP-1")
panel2 = ControlPanel(panel_id="CP-2")

# Modify panel1's list
panel1.active_alarms.append("HIGH_TEMP")

# panel2's list remains empty
print(panel1.active_alarms)
print(panel2.active_alarms)
```

**What's happening:**
```python
active_alarms: list[str] = Field(default_factory=list)
#              ^^^^                ^^^^^^^^^^^^^
#              |                   └── Each instance gets a NEW empty list
#              |                       Not shared between instances
#              └── List of strings

# Without default_factory:
# active_alarms: list[str] = []  ← Pydantic copies this per instance, but the
#                                   same idiom is a shared-list BUG in plain Python
```

Output:
```
['HIGH_TEMP']
[]
```

Each instance gets its own list. In plain Python (function defaults, class attributes) a `[]` default is shared between all callers — a common bug. Pydantic deep-copies a literal `[]` default per instance, so it would not share here, but `default_factory` makes the intent explicit and is the portable habit.

---

### 5. Combining Constraints for Sensor Readings

Here is a realistic example combining multiple constraint types for an industrial sensor schema:

```python
from typing import Literal
from pydantic import BaseModel, Field

class IndustrialSensor(BaseModel):
    sensor_id: str = Field(min_length=3, max_length=20, pattern=r"^[A-Z]+-\d+$")
    temperature: float = Field(ge=-40.0, le=150.0, description="Celsius")
    pressure: float = Field(gt=0.0, le=500.0, description="PSI, must be positive")
    humidity: float = Field(ge=0.0, le=100.0, description="Percentage")
    status: Literal["nominal", "warning", "critical"] = "nominal"
    tags: list[str] = Field(default_factory=list)

reading = IndustrialSensor(
    sensor_id="TC-42",
    temperature=23.5,
    pressure=14.7,
    humidity=55.0,
    tags=["indoor", "calibrated"]
)
print(f"Reading: {reading.temperature}C @ {reading.pressure}PSI")
```

**What's happening:**
```python
class IndustrialSensor(BaseModel):
    sensor_id: str = Field(min_length=3, max_length=20, pattern=r"^[A-Z]+-\d+$")
    #           ^        ^        ^         ^      ^
    #           |        |        |         |      └── Regex: letters + dash + digits
    #           |        |        |         └── Max 20 chars
    #           |        |        └── Min 3 chars
    #           |        └── Multiple constraints combined
    #           └── string type

    status: Literal["nominal", "warning", "critical"] = "nominal"
    #        ^                                           ^
    #        |                                           └── Default value
    #        └── Only these three values allowed
```

Output:
```
Reading: 23.5C @ 14.7PSI
```

Every field enforces its own domain rule. An LLM generating a reading with `pressure: -5` or `temperature: 9999` will be rejected instantly.

### What Happens When Each Constraint Fails

```python
from typing import Literal
from pydantic import BaseModel, Field, ValidationError

class Sensor(BaseModel):
    sensor_id: str = Field(min_length=3, pattern=r"^[A-Z]+-\d+$")
    temperature: float = Field(ge=-40.0, le=150.0)
    pressure: float = Field(gt=0.0, le=500.0)
    humidity: float = Field(ge=0.0, le=100.0)
    status: Literal["nominal", "warning", "critical"] = "nominal"

failures = [
    ("sensor_id too short", {"sensor_id": "AB", "temperature": 20, "pressure": 14, "humidity": 50}),
    ("sensor_id bad pattern", {"sensor_id": "abc-123", "temperature": 20, "pressure": 14, "humidity": 50}),
    ("temperature too low", {"sensor_id": "TC-001", "temperature": -50, "pressure": 14, "humidity": 50}),
    ("temperature too high", {"sensor_id": "TC-001", "temperature": 200, "pressure": 14, "humidity": 50}),
    ("pressure negative", {"sensor_id": "TC-001", "temperature": 20, "pressure": -1, "humidity": 50}),
    ("humidity over 100", {"sensor_id": "TC-001", "temperature": 20, "pressure": 14, "humidity": 101}),
    ("bad status", {"sensor_id": "TC-001", "temperature": 20, "pressure": 14, "humidity": 50, "status": "broken"}),
]

for label, data in failures:
    try:
        Sensor(**data)
        print(f"  PASS: {label}")
    except ValidationError as e:
        field = e.errors()[0]["loc"][0]
        print(f"  FAIL: {label} -> {field}")
```

Output:
```
  FAIL: sensor_id too short -> sensor_id
  FAIL: sensor_id bad pattern -> sensor_id
  FAIL: temperature too low -> temperature
  FAIL: temperature too high -> temperature
  FAIL: pressure negative -> pressure
  FAIL: humidity over 100 -> humidity
  FAIL: bad status -> status
```

---

### Quick Reference

| Constraint | Type | Example | Meaning |
|-----------|------|---------|---------|
| `ge=0` | Numeric | `Field(ge=0)` | Value >= 0 |
| `le=100` | Numeric | `Field(le=100)` | Value <= 100 |
| `gt=0` | Numeric | `Field(gt=0)` | Value > 0 |
| `lt=100` | Numeric | `Field(lt=100)` | Value < 100 |
| `multiple_of=5` | Numeric | `Field(multiple_of=5)` | Value must be 0, 5, 10, ... |
| `min_length=1` | String | `Field(min_length=1)` | At least 1 character |
| `max_length=50` | String | `Field(max_length=50)` | At most 50 characters |
| `pattern=r"..."` | String | `Field(pattern=r"^\d+$")` | Must match regex |
| `Literal["a","b"]` | Enum | `status: Literal["a"]` | Only allowed values |
| `default_factory=list` | Mutable | `Field(default_factory=list)` | Fresh instance each time |
| `description="..."` | Metadata | `Field(description="...")` | Docstring for LLM |

---

### Summary

Field constraints encode physical and business rules directly into your data model. Use `ge`/`le`/`gt`/`lt` for numeric bounds, `pattern` for string formats, `Literal` for enumerated values, and `default_factory` for mutable defaults. Combining these with nested models gives you a complete validation layer that catches bad data before it enters your system. Always test boundary values and anchor regex patterns with `^` and `$` to avoid partial matches.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Field Constraints**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 field constraints**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

