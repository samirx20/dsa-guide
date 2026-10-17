# Part 2, Topic 1: Data Validation with Pydantic
## Chapter 3: Custom Validators

**Prerequisite Knowledge:** Basic Pydantic `BaseModel`s and Field constraints.

---

### The 'Airport Security' Analogy

Imagine the Pydantic field constraints we learned previously as the metal sizer bin at the airport. It easily checks if your bag is too big or too heavy. But what if your bag fits perfectly, yet it's full of fireworks?

Custom validators are the X-Ray machines. They look *inside* the data to perform complex, logical checks. Maybe the bag is small enough, but you are bringing a dog, and the flight doesn't allow pets. Custom validators let you write arbitrary code to cross-reference rules (e.g. checking if field A contradicts field B) before letting the data pass through.

```
    ┌─────────────────────────────────────────────────────┐
    │              AIRPORT SECURITY CHECK                 │
    │                                                     │
    │  STEP 1: Metal Detector (Field Constraints)         │
    │    ✓ Bag weight < 23kg?       PASS                  │
    │    ✓ Bag dimensions OK?       PASS                  │
    │    → Bag passes through...                           │
    │                                                     │
    │  STEP 2: X-Ray Machine (Custom Validators)          │
    │    ✓ No fireworks?            PASS                  │
    │    ✓ No liquids > 100ml?      PASS                  │
    │    ✗ Contains live animal?    FAIL                  │
    │    → REJECTED: pets not allowed on this flight      │
    │                                                     │
    │  STEP 3: Cross-check (Model Validator)              │
    │    ✓ Ticket matches passport? PASS                  │
    │    ✗ Flight full?             FAIL                  │
    │    → REJECTED: overbooked flight                    │
    └─────────────────────────────────────────────────────┘
```

Some validation rules cannot be expressed with field constraints alone. A sensor reading might be individually valid (temperature is a number in range) but physically impossible (temperature jumped 500 degrees in one second). Custom validators let you write arbitrary checks on individual fields or across multiple fields.

---

### 1. @field_validator for Single-Field Checks

A `@field_validator` runs on a single field. Use `mode='before'` to run before Pydantic's type coercion, or `mode='after'` to run after the value is already a typed Python object.

```python
from pydantic import BaseModel, field_validator

class SensorReading(BaseModel):
    sensor_id: str
    temperature: float

    # This function will automatically run to check the temperature field
    @field_validator("temperature")
    @classmethod
    def check_temperature_plausible(cls, v: float) -> float:
        # We can write any custom python code here to check the data
        if v < -273.15:
            raise ValueError(f"Temperature {v}C is below absolute zero")
        # We MUST return the value if it succeeds
        return v

reading = SensorReading(sensor_id="T-01", temperature=25.0)
print(reading.temperature)

try:
    bad = SensorReading(sensor_id="T-02", temperature=-300.0)
except Exception as e:
    print(f"Rejected: {e}")
```

**What's happening:**
```python
@field_validator("temperature")
@classmethod
def check_temperature_plausible(cls, v: float) -> float:
#    ^^^^^^^^^^^^^^^^^^^^^^^^          ^
#    |                                └── v is the validated temperature value
#    |                                    Already converted to float by this point
#    └── This name is arbitrary — Pydantic calls it automatically
#
# The validator runs AFTER type coercion (mode='after' is default)
# So v is guaranteed to be a float at this point
```

Output:
```
25.0
Rejected: 1 validation error for SensorReading
temperature
  Value error, Temperature -300.0C is below absolute zero
```

The validator catches values that pass the type check but violate physical law.

---

### 2. mode='before' for Pre-Processing

Use `mode='before'` when you need to transform the input before Pydantic processes it. This is useful when LLMs send values in unexpected formats.

```python
from pydantic import BaseModel, field_validator

class PressureReading(BaseModel):
    sensor_id: str
    pressure_psi: float

    # mode="before" means this runs before Pydantic tries to turn it into a float
    @field_validator("pressure_psi", mode="before")
    @classmethod
    def parse_pressure_string(cls, v):
        # If the AI sent us a string instead of a number...
        if isinstance(v, str):
            # ...clean out the letters "psi" and convert it ourselves
            cleaned = v.replace("psi", "").replace("PSI", "").strip()
            return float(cleaned)
        return v

# It handles the string format gracefully
reading = PressureReading(sensor_id="P-01", pressure_psi="14.7 psi")
print(reading.pressure_psi)

# It also handles the standard float format
reading2 = PressureReading(sensor_id="P-02", pressure_psi=14.7)
print(reading2.pressure_psi)
```

**What's happening:**
```python
@field_validator("pressure_psi", mode="before")
@classmethod
def parse_pressure_string(cls, v):
    #            ^^^^^^    ^
    #            |         └── v could be ANYTHING: str, int, float, None
    #            |            Pydantic hasn't coerced it yet
    #            └── We clean the string BEFORE Pydantic tries float()
    #
    # Execution order:
    #   1. Pydantic receives raw input (e.g. "14.7 psi")
    #   2. Our "before" validator runs → returns 14.7
    #   3. Pydantic coerces 14.7 to float → 14.7
    #   4. Pydantic's own float check runs → passes
```

Output:
```
14.7
14.7
```

Both `"14.7 psi"` and `14.7` produce the same result. The pre-validator normalizes the messy string before the float check runs.

### mode='before' vs mode='after' — Execution Flow

```python
from pydantic import BaseModel, field_validator

class ModeDemo(BaseModel):
    value: float

    @field_validator("value", mode="before")
    @classmethod
    def before_check(cls, v):
        print(f"  BEFORE: received {v!r} (type={type(v).__name__})")
        # Transform strings to floats
        if isinstance(v, str):
            return float(v.replace("°C", "").strip())
        return v

    @field_validator("value", mode="after")
    @classmethod
    def after_check(cls, v):
        print(f"  AFTER: received {v!r} (type={type(v).__name__})")
        # v is guaranteed to be a float here
        return v

print("Test 1: string input")
m1 = ModeDemo(value="25.5°C")
print(f"Result: {m1.value}\n")

print("Test 2: float input")
m2 = ModeDemo(value=25.5)
print(f"Result: {m2.value}")
```

Output:
```
Test 1: string input
  BEFORE: received '25.5°C' (type=str)
  AFTER: received 25.5 (type=float)
Result: 25.5

Test 2: float input
  BEFORE: received 25.5 (type=float)
  AFTER: received 25.5 (type=float)
Result: 25.5
```

| Mode | When It Runs | Input Type | Use Case |
|------|-------------|-----------|----------|
| `before` | Before type coercion | Anything | Clean/transform messy input |
| `after` (default) | After type coercion | Typed Python | Domain logic checks |
| `wrap` | Wraps Pydantic's check | Typed Python | Error framing |

---

### 3. @model_validator for Cross-Field Checks

A `@model_validator` runs after all individual fields are validated. Use it when one field's validity depends on another.

```python
from pydantic import BaseModel, model_validator

class ThermalState(BaseModel):
    temperature: float
    pressure: float
    coolant_flow: float

    # mode="after" runs when the whole model is built
    @model_validator(mode="after")
    def check_thermal_consistency(self):
        # We can check multiple fields at once using "self"
        if self.temperature > 100.0 and self.coolant_flow < 1.0:
            raise ValueError(
                f"Temperature {self.temperature}C with flow {self.coolant_flow} "
                f"L/min is unsafe — high temp requires active cooling"
            )

        if self.pressure < 0 and self.temperature > 50:
            raise ValueError("Negative pressure with elevated temperature is impossible")

        # We MUST return self if it succeeds
        return self

state = ThermalState(temperature=95.0, pressure=14.7, coolant_flow=0.5)
print(f"State valid: {state.temperature}C, flow {state.coolant_flow} L/min")

try:
    bad = ThermalState(temperature=150.0, pressure=14.7, coolant_flow=0.1)
except Exception as e:
    print(f"Rejected: {e}")
```

**What's happening:**
```python
@model_validator(mode="after")
def check_thermal_consistency(self):
#                                 ^^^^
#                                 └── self = the fully-built model instance
#                                     All fields are already validated individually
#                                     Now we check COMBINATIONS of fields
#
# This is the key difference from @field_validator:
#   field_validator: checks ONE field at a time
#   model_validator: checks relationships BETWEEN fields
```

Output:
```
State valid: 95.0C, flow 0.5 L/min
Rejected: 1 validation error for ThermalState
  Value error, Temperature 150.0C with flow 0.1 L/min is unsafe — high temp requires active cooling
```

This catches a situation where each field is individually valid but the combination is physically dangerous.

### Cross-Field Validation Patterns

```python
from pydantic import BaseModel, model_validator

class SensorPair(BaseModel):
    temp_a: float
    temp_b: float
    max_delta: float = 50.0

    @model_validator(mode="after")
    def check_temperature_differential(self):
        # Two sensors can't differ too much — catches drift or failure
        delta = abs(self.temp_a - self.temp_b)
        if delta > self.max_delta:
            raise ValueError(
                f"Differential {delta}C exceeds max {self.max_delta}C"
            )
        return self

pair = SensorPair(temp_a=25.0, temp_b=30.0)
print(f"Differential: {abs(pair.temp_a - pair.temp_b)}C")

try:
    bad = SensorPair(temp_a=25.0, temp_b=100.0)
except Exception as e:
    print(f"Rejected: {e}")
```

Output:
```
Differential: 5.0
Rejected: 1 validation error for SensorPair
  Value error, Differential 75.0C exceeds max 50.0C
```

---

### 4. mode='wrap' for Custom Error Framing

`mode='wrap'` gives you the original validation function, letting you add context or transform errors.

```python
from pydantic import BaseModel, field_validator, ValidationError

class CoolantSystem(BaseModel):
    system_id: str
    flow_rate: float

    @field_validator("flow_rate", mode="wrap")
    @classmethod
    def wrap_flow_check(cls, v, handler):
        try:
            # Let Pydantic do its normal check
            return handler(v)
        except ValidationError as e:
            # If Pydantic's check fails, we throw our own custom error
            raise ValueError(
                f"Coolant flow validation failed for system '{cls}' — "
                f"received {v!r}. Original: {e}"
            )

try:
    bad = CoolantSystem(system_id="CS-1", flow_rate="not_a_number")
except Exception as e:
    print(str(e)[:200])
```

**What's happening:**
```python
@field_validator("flow_rate", mode="wrap")
@classmethod
def wrap_flow_check(cls, v, handler):
#                                ^^^^^^^
#                                └── handler = Pydantic's original validator
#                                    Call handler(v) to run normal validation
#                                    Wrap it in try/except to catch errors
#
# Flow:
#   1. Pydantic calls wrap_flow_check with raw value + handler
#   2. We call handler(v) → Pydantic tries to validate
#   3. If it passes → we get the validated value back
#   4. If it fails → we catch ValidationError and add our own context
```

Output:
```
CoolantSystem
  1 validation error for CoolantSystem
flow_rate
  Value error, Coolant flow validation failed for system '<class '__main__.CoolantSystem'>' — received 'not_a_number'. Original: 1 validation error for CoolantSystem
flow_rate
  Input should be a valid number, unable to parse string as a number [type=number_parsing, input...
```

Wrap validators let you add domain-specific context to generic Pydantic errors, which is critical when errors surface in LLM debugging logs.

---

### 5. Complete Sensor Validation Example

Putting it all together — a sensor reading that validates ranges, physical plausibility, and cross-field consistency:

```python
from pydantic import BaseModel, field_validator, model_validator, Field

class SensorReading(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=20)
    temperature: float = Field(ge=-273.15, le=500.0)
    pressure: float = Field(gt=0.0, le=1000.0)
    flow_rate: float = Field(ge=0.0, le=50.0)

    @field_validator("temperature")
    @classmethod
    def warn_extreme_temp(cls, v: float) -> float:
        if abs(v) > 200:
            raise ValueError(f"Temperature {v}C exceeds safe operating range")
        return v

    @model_validator(mode="after")
    def check_thermal_hydraulics(self):
        if self.temperature > 80.0 and self.flow_rate < 0.5:
            raise ValueError(
                "High temperature with low coolant flow is unsafe"
            )
        return self

reading = SensorReading(
    sensor_id="TC-01", temperature=72.5, pressure=14.7, flow_rate=2.0
)
print(f"Valid reading: {reading.temperature}C")

try:
    bad = SensorReading(
        sensor_id="TC-02", temperature=90.0, pressure=14.7, flow_rate=0.1
    )
except Exception as e:
    print(f"Rejected: {e}")
```

**What's happening:**
```python
class SensorReading(BaseModel):
    # Layer 1: Field constraints (built-in)
    sensor_id: str = Field(min_length=1, max_length=20)      # String length
    temperature: float = Field(ge=-273.15, le=500.0)         # Numeric range
    pressure: float = Field(gt=0.0, le=1000.0)               # Numeric range
    flow_rate: float = Field(ge=0.0, le=50.0)                # Numeric range

    # Layer 2: @field_validator (single-field domain logic)
    @field_validator("temperature")
    def warn_extreme_temp(cls, v):
        # Checks physics: temperature can't exceed 200C
        # (stricter than the Field(ge=-273.15, le=500.0) range)
        ...

    # Layer 3: @model_validator (cross-field logic)
    @model_validator(mode="after")
    def check_thermal_hydraulics(self):
        # Checks system: high temp + low flow = danger
        # Can't be expressed with Field() alone
        ...
```

Output:
```
Valid reading: 72.5C
Rejected: 1 validation error for SensorReading
  Value error, High temperature with low coolant flow is unsafe
```

The layered validation catches bad data at multiple levels — range, physical limit, and system consistency.

### Validation Layer Diagram

```
    ┌─────────────────────────────────────────────────┐
    │           SENSOR READING VALIDATION              │
    │                                                  │
    │  LAYER 1: Field Constraints                      │
    │    ┌─────────────────────────────────────┐       │
    │    │ ge, le, gt, lt, min_length, pattern │       │
    │    │ Rejects: out-of-range, bad format   │       │
    │    └─────────────────────────────────────┘       │
    │                    ↓ passes                       │
    │  LAYER 2: @field_validator (before/after)        │
    │    ┌─────────────────────────────────────┐       │
    │    │ Custom single-field logic           │       │
    │    │ Rejects: physically impossible      │       │
    │    └─────────────────────────────────────┘       │
    │                    ↓ passes                       │
    │  LAYER 3: @model_validator                       │
    │    ┌─────────────────────────────────────┐       │
    │    │ Cross-field consistency checks      │       │
    │    │ Rejects: dangerous combinations     │       │
    │    └─────────────────────────────────────┘       │
    │                    ↓ all pass                     │
    │              VALID READING ✓                     │
    └─────────────────────────────────────────────────┘
```

---

### Quick Reference

| Validator | Scope | Mode | Use Case |
|-----------|-------|------|----------|
| `@field_validator("field")` | Single field | `after` (default) | Domain logic after type coercion |
| `@field_validator("field", mode="before")` | Single field | `before` | Clean/transform raw input |
| `@field_validator("field", mode="wrap")` | Single field | `wrap` | Add error context |
| `@model_validator(mode="after")` | All fields | `after` | Cross-field consistency |
| `@model_validator(mode="before")` | Raw dict | `before` | Pre-process entire input |

---

### Summary

`@field_validator` handles single-field checks with `mode='before'` for pre-processing, `mode='after'` for post-type-coercion checks, and `mode='wrap'` for error framing. `@model_validator` performs cross-field consistency checks. Together, they let you encode complex domain rules that simple type constraints cannot express, catching physically impossible combinations before they reach your control systems. Layer validators from simple (Field) to complex (model_validator) for clean, maintainable validation.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Before/after trace.** Using the chapter's `ModeDemo` (with its two `print`ing validators), write out the exact output of each call:

```python
print(ModeDemo(value=7).value)      # (a)
ModeDemo(value="25.5 C")            # (b)  note: plain "C", no degree sign
```

**Q2. The case the cleaner misses.** Using the chapter's `PressureReading` with the `parse_pressure_string` before-validator, predict the result of each:

```python
PressureReading(sensor_id="P-03", pressure_psi="14.7 Psi")   # (a)
PressureReading(sensor_id="P-04", pressure_psi="  30PSI")    # (b)
```

**Q3. Which branch fires?** Using the chapter's `ThermalState`, which of these validate? For the ones that fail, give the error message.

```python
ThermalState(temperature=100.0, pressure=14.7, coolant_flow=0.5)   # (a)
ThermalState(temperature=120,   pressure=-1,   coolant_flow=0.2)   # (b)
ThermalState(temperature=60,    pressure=-2,   coolant_flow=5)     # (c)
```

**Q4. Which layer rejects it?** Using the chapter's complete `SensorReading` (section 5) with `sensor_id="TC-03"` and `pressure=14.7`, fill in the table: which layer (Field constraint, `@field_validator`, `@model_validator`, or none) rejects each input?

| `temperature` | `flow_rate` | Rejected by |
|---|---|---|
| 250 | 0.1 | ? |
| 600 | 0.1 | ? |
| 90 | 0.5 | ? |
| -250 | 0.0 | ? |

**Q5. Differential.** Using `SensorPair`, what is the error for `SensorPair(temp_a=25, temp_b=-30)`? What happens if you add `max_delta="60"`?

### Coding Exercises

**E1 (Easy).** Write `JointCommand(joint: str, angle_rad: float)` where `angle_rad` must lie in $[-\pi, \pi]$. A `mode="before"` validator should also accept strings like `"90deg"`, converting them to radians.

- `JointCommand(joint="elbow", angle_rad="90deg").angle_rad` → `1.5707963267948966`
- `JointCommand(joint="elbow", angle_rad="270deg")` → `ValidationError` (`less than or equal to 3.14159...`)

**E2 (Easy–Medium).** Write `TrajectorySegment(t_start, t_end, distance_m, v_max)`, all floats, with `t_start >= 0`, `distance_m >= 0` and `v_max > 0`. Add a `@model_validator(mode="after")` that requires $t_\text{end} > t_\text{start}$ and $\frac{d}{t_\text{end} - t_\text{start}} \le v_\text{max}$.

- `(t_start=0, t_end=4, distance_m=6, v_max=2)` → valid (average speed 1.5 m/s)
- `(t_start=1, t_end=3, distance_m=5, v_max=2)` → `Value error, average speed 2.5 m/s exceeds v_max 2.0 m/s`

**E3 (Medium).** Write `GeofencePoint(x: float, y: float, fence_radius_m: float = 10.0)` (radius $> 0$). It should:
1. Use a `@model_validator(mode="before")` to also accept the LLM shorthand `{"pos": [x, y]}`, rejecting a `pos` that is not exactly 2 elements.
2. Use a `@model_validator(mode="after")` to reject points with $\sqrt{x^2 + y^2} > r$.

- `GeofencePoint.model_validate({"pos": [3, 4]})` → `x=3.0 y=4.0 fence_radius_m=10.0`
- `{"pos": [9, 12]}` → `Value error, point is 15.0 m from origin, fence is 10.0 m`

#### Dry-Run: Answers

**Q1.**
(a)

```
  BEFORE: received 7 (type=int)
  AFTER: received 7.0 (type=float)
7.0
```

The before-validator sees the raw `int`. Pydantic's float coercion runs between the two validators, so the after-validator sees `7.0`.

(b) The before-validator prints `  BEFORE: received '25.5 C' (type=str)`. Then `"25.5 C".replace("°C", "")` changes nothing, and `float("25.5 C")` raises Python's `ValueError`. Pydantic wraps it as `value` / `Value error, could not convert string to float: '25.5 C'`. The after-validator **never runs**, so no `AFTER:` line is printed.

**Q2.**
(a) `ValidationError`: `pressure_psi` / `Value error, could not convert string to float: '14.7 Psi'`. The cleaner only removes `"psi"` and `"PSI"`, not `"Psi"`. A more robust version would lower-case first: `v.lower().replace("psi", "")`.
(b) Valid, `pressure_psi == 30.0`: `"  30PSI"` → `"  30"` → `.strip()` → `"30"` → `30.0`.

**Q3.**

| Call | Check 1: `T > 100 and flow < 1` | Check 2: `p < 0 and T > 50` | Result |
|---|---|---|---|
| (a) | $100.0 > 100$ is False | $14.7 < 0$ is False | valid |
| (b) | True | (never reached) | `Value error, Temperature 120.0C with flow 0.2 L/min is unsafe — high temp requires active cooling` |
| (c) | $60 > 100$ is False | True | `Value error, Negative pressure with elevated temperature is impossible` |

In (b) both rules are violated, but `raise` exits at the first one, so only one message appears. Also note that `120` prints as `120.0` because the fields were already coerced to `float` before the model validator ran.

**Q4.**

| `temperature` | `flow_rate` | Rejected by | Why |
|---|---|---|---|
| 250 | 0.1 | `@field_validator` | passes `le=500`, but $\lvert 250 \rvert > 200$ |
| 600 | 0.1 | Field constraint | `Input should be less than or equal to 500`. The after-validator never runs on a value that already failed. |
| 90 | 0.5 | none (valid) | $90 > 80$, but $0.5 < 0.5$ is False |
| -250 | 0.0 | `@field_validator` | $-250 \ge -273.15$, but $\lvert -250 \rvert > 200$ |

In the first and last rows, the `@model_validator` (high temperature with low flow) **never runs**. If any field fails, the model-level after-validator is skipped, so there is exactly one error.

**Q5.** $\lvert 25 - (-30) \rvert = 55 > 50$, so the error is `Value error, Differential 55.0C exceeds max 50.0C`. With `max_delta="60"` the string is coerced to `60.0`, $55 \le 60$, and the model is valid: `temp_a=25.0 temp_b=-30.0 max_delta=60.0`.

**E1 — reference solution**

```python
import math
from typing import Any
from pydantic import BaseModel, Field, field_validator

class JointCommand(BaseModel):
    joint: str
    angle_rad: float = Field(ge=-math.pi, le=math.pi)

    @field_validator("angle_rad", mode="before")
    @classmethod
    def accept_degrees(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip().endswith("deg"):
            return math.radians(float(v.strip()[:-3]))
        return v   # numbers (and plain numeric strings) fall through to normal coercion
```

The range check is a `Field` constraint, so it runs *after* the conversion: $270° = 4.712$ rad, which is $> \pi$ and therefore rejected. $O(1)$.

**E2 — reference solution**

```python
from pydantic import BaseModel, Field, model_validator

class TrajectorySegment(BaseModel):
    t_start: float = Field(ge=0.0)
    t_end: float
    distance_m: float = Field(ge=0.0)
    v_max: float = Field(gt=0.0)

    @model_validator(mode="after")
    def check_timing(self):
        if self.t_end <= self.t_start:          # check this first: avoids division by zero
            raise ValueError(f"t_end {self.t_end} must be after t_start {self.t_start}")
        v_avg = self.distance_m / (self.t_end - self.t_start)
        if v_avg > self.v_max:
            raise ValueError(f"average speed {v_avg} m/s exceeds v_max {self.v_max} m/s")
        return self
```

For the failing example: $v_\text{avg} = 5 / (3 - 1) = 2.5 > 2.0$. The ordering of the two checks matters: `t_start=2, t_end=2` would otherwise divide by zero. $O(1)$.

**E3 — reference solution**

```python
import math
from typing import Any
from pydantic import BaseModel, Field, model_validator

class GeofencePoint(BaseModel):
    x: float
    y: float
    fence_radius_m: float = Field(default=10.0, gt=0.0)

    @model_validator(mode="before")
    @classmethod
    def unpack_pos(cls, data: Any) -> Any:
        if isinstance(data, dict) and "pos" in data:
            data = dict(data)                  # don't mutate the caller's dict
            pos = data.pop("pos")
            if not (isinstance(pos, (list, tuple)) and len(pos) == 2):
                raise ValueError("pos must be a 2-element [x, y] list")
            data["x"], data["y"] = pos
        return data

    @model_validator(mode="after")
    def inside_fence(self):
        r = math.hypot(self.x, self.y)
        if r > self.fence_radius_m:
            raise ValueError(f"point is {r:.1f} m from origin, fence is {self.fence_radius_m} m")
        return self
```

`mode="before"` on a model validator receives the **raw input** (usually a dict), so it is a `@classmethod` and must return data, not `self`. `mode="after"` receives the built instance. For `[9, 12]`: $\sqrt{81 + 144} = 15 > 10$. $O(1)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Custom Validators**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 custom validators**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

