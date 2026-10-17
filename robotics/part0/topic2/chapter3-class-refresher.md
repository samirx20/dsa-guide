# Part 0, Topic 2: The Bridge: Python Foundations
## Chapter 3: Class & Object Refresher

**Prerequisite Knowledge:** Basic Python functions and variables.

---

### The "Blueprint and House" Analogy (Expanded)

Think of a Class as a blueprint for a house, and an Object as the actual physical house built from that blueprint. The blueprint defines what the house should have (doors, windows), but you can't live in a blueprint.

```
┌──────────────────────────────────────────────────────────────┐
│                    CLASS vs OBJECT                            │
│                                                              │
│   BLUEPRINT (Class)              HOUSE (Object)              │
│  ┌────────────────────┐      ┌────────────────────┐         │
│  │   SensorReading    │      │  reading_1          │         │
│  │                    │      │  ┌────────────────┐ │         │
│  │ - sensor_id: str   │  ──▶ │  │ id: "S-001"   │ │         │
│  │ - temperature: float│      │  │ temp: 22.5    │ │         │
│  │ - timestamp: str   │      │  └────────────────┘ │         │
│  │                    │      │                     │         │
│  │ + get_status()     │      │  reading_2          │         │
│  │ + is_overheated()  │  ──▶ │  ┌────────────────┐ │         │
│  │                    │      │  │ id: "S-002"    │ │         │
│  │ You can't "use"    │      │  │ temp: 24.0     │ │         │
│  │ the blueprint      │      │  └────────────────┘ │         │
│  └────────────────────┘      └────────────────────┘         │
│                                                              │
│  One blueprint → Many houses                                 │
│  One class → Many objects                                    │
└──────────────────────────────────────────────────────────────┘
```

In standard Python, we often group data using dictionaries. However, dictionaries don't guarantee structure. You might misspell a key, or forget one entirely. When building complex AI systems, we need strict structure. We get that structure using Classes.

---

### 1. What is a Class?

A class defines:
- **What data** the object holds (attributes)
- **What it can do** (methods)

```python
# 1. Defining the Blueprint (The Class)
class SensorReading:
    # The __init__ method is the "constructor". It runs automatically when we build a new object.
    # 'self' refers to the specific object being created.
    def __init__(self, sensor_id: str, temperature: float):
        self.sensor_id = sensor_id
        self.temperature = temperature

# 2. Building the Objects (Instances)
# We use the class name like a function to create new objects.
reading_1 = SensorReading(sensor_id="S-001", temperature=22.5)
reading_2 = SensorReading(sensor_id="S-002", temperature=24.0)

# 3. Accessing Data
# We access the data inside the object using "dot notation"
print(reading_1.sensor_id)   # Outputs: S-001
print(reading_2.temperature) # Outputs: 24.0
```

**What's happening:**
```python
class SensorReading:
#     ^^^^^^^^^^^^^^
#     Class name — PascalCase (capital first letter of each word)
#     This is the BLUEPRINT, not the actual data

    def __init__(self, sensor_id: str, temperature: float):
#              ^^^^
#              Special method — runs automatically when you create a new object
#              Double underscores = "dunder" method (Python magic)
#              Also called the "constructor"
#
#   self — refers to the SPECIFIC object being created
#   sensor_id: str — the sensor_id parameter must be a string
#   temperature: float — the temperature parameter must be a float

        self.sensor_id = sensor_id
#       ^^^^  ^^^^^^^^^  ^^^^^^^^^
#       |     |          └── Value passed in (e.g., "S-001")
#       |     └── Attribute name on the object
#       └── "self" = this specific object
#       This line STORES the sensor_id inside the object
        
        self.temperature = temperature
#       Same pattern — stores temperature inside the object

# When you call:
reading_1 = SensorReading(sensor_id="S-001", temperature=22.5)
# Python does:
#   1. Creates a new empty object
#   2. Calls __init__ with self=the new object, sensor_id="S-001", temperature=22.5
#   3. Stores "S-001" as reading_1.sensor_id
#   4. Stores 22.5 as reading_1.temperature
#   5. Returns the object as reading_1
```

---

### 2. Adding Methods (Behavior)

Classes aren't just data containers — they can also have methods (functions that belong to the class).

```python
class SensorReading:
    def __init__(self, sensor_id: str, temperature: float):
        self.sensor_id = sensor_id
        self.temperature = temperature

    # Method 1: Get a formatted string representation
    def __str__(self) -> str:
        return f"Sensor {self.sensor_id}: {self.temperature}°C"

    # Method 2: Check if the sensor is overheating
    def is_overheated(self, threshold: float = 80.0) -> bool:
        # 'self' gives us access to this object's data
        return self.temperature > threshold

    # Method 3: Calculate temperature difference from another reading
    def difference_from(self, other: "SensorReading") -> float:
        # 'other' is another SensorReading object
        return abs(self.temperature - other.temperature)

# Create objects
reading_1 = SensorReading("S-001", 22.5)
reading_2 = SensorReading("S-002", 85.0)

# Use methods
print(reading_1)                    # Outputs: Sensor S-001: 22.5°C
print(reading_2.is_overheated())    # Outputs: True (85.0 > 80.0)
print(reading_1.is_overheated())    # Outputs: False (22.5 < 80.0)
print(reading_1.difference_from(reading_2))  # Outputs: 62.5
```

**What's happening:**
```python
def __str__(self) -> str:
#  ^^^^
#  Special dunder method — Python calls this when you use print() or str()
#  This lets you control what print(sensor_reading) shows

def is_overheated(self, threshold: float = 80.0) -> bool:
#             ^^^^                              ^^^^
#             |                                 └── Returns True or False
#             └── 'self' is always the first parameter
#                 Python passes it automatically — you don't provide it!
#
# When you call: reading_2.is_overheated()
# Python actually calls: SensorReading.is_overheated(reading_2, threshold=80.0)
# 'self' = reading_2, so self.temperature = 85.0

def difference_from(self, other: "SensorReading") -> float:
#                  ^^^^   ^^^^^
#                  |      |
#                  |      └── Another SensorReading object (type in quotes)
#                  └── This object
#
# "SensorReading" is in quotes because the class isn't fully defined yet
# This is called a "forward reference" — needed when referring to the same class
```

---

### 3. Why Use Classes over Dictionaries?

If we used a dictionary for a sensor reading, it would look like this:
```python
reading = {"sensor_id": "S-001", "temperature": 22.5}
```

The problem? You could accidentally do this:
```python
reading = {"sensor_id": "S-001", "temp": 22.5}  # Misspelled key!
# Python won't complain. Your code will crash later when you try:
print(reading["temperature"])  # KeyError: 'temperature'
```

Classes provide structure. If you try to create a `SensorReading` without a temperature, Python will immediately throw an error, protecting your system.

```
┌──────────────────────────────────────────────────────────────┐
│            DICTIONARY vs CLASS COMPARISON                     │
│                                                              │
│  DICTIONARY                              CLASS                │
│  ┌─────────────────────────┐    ┌─────────────────────────┐  │
│  │ d = {"sensor_id": "S1", │    │ class SensorReading:    │  │
│  │      "temp": 22.5}      │    │   sensor_id: str        │  │
│  │                         │    │   temperature: float    │  │
│  │ d["sensor_id"]  → ✓     │    │                         │  │
│  │ d["sensor_iD"]  → ✗     │    │ r.sensor_id    → ✓      │  │
│  │   (typo, no error)      │    │ r.sensor_iD    → ✗      │  │
│  │                         │    │   (AttributeError)      │  │
│  │ d["temperature"] → ✓    │    │ r.temperature  → ✓      │  │
│  │ d["temp"]        → ✓    │    │ r.temp         → ✗      │  │
│  │   (both work! no help)  │    │   (AttributeError)      │  │
│  │                         │    │                         │  │
│  │ No methods              │    │ def is_overheated():    │  │
│  │ No validation           │    │   validate + compute    │  │
│  │ Easy to mess up         │    │   Hard to mess up       │  │
│  └─────────────────────────┘    └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Real comparison:**

```python
# DICTIONARY APPROACH — no safety
sensor_data = {"sensor_id": "S-001", "temperature": 22.5}

# All of these "work" but are wrong:
sensor_data["temprature"] = 20.0    # Typo — adds new key, doesn't update temperature!
sensor_data["sensor_id"] = None     # Allowed — sensor_id is now None
sensor_data["extra"] = "junk"       # Allowed — extra field added

# CLASS APPROACH — with safety
class SensorReading:
    def __init__(self, sensor_id: str, temperature: float):
        self.sensor_id = sensor_id
        self.temperature = temperature

reading = SensorReading("S-001", 22.5)
reading.temprature  # AttributeError: 'SensorReading' has no attribute 'temprature'
#                    The typo is caught IMMEDIATELY

# But: reading.sensor_id = None is still allowed (basic classes don't enforce types)
# We'll fix this with Pydantic in later chapters!
```

---

### 4. The `@dataclass` Shortcut

Python 3.7+ provides `@dataclass` — a decorator that auto-generates `__init__`, `__repr__`, and `__eq__` for you.

```python
from dataclasses import dataclass

@dataclass
class SensorReading:
    sensor_id: str
    temperature: float

# __init__ is auto-generated! Just pass values:
reading = SensorReading(sensor_id="S-001", temperature=22.5)

# __repr__ is auto-generated — nice print output:
print(reading)
# Outputs: SensorReading(sensor_id='S-001', temperature=22.5)

# __eq__ is auto-generated — compares by value:
reading_1 = SensorReading("S-001", 22.5)
reading_2 = SensorReading("S-001", 22.5)
print(reading_1 == reading_2)  # Outputs: True (same values)
```

**What's happening:**
```python
@dataclass
# ^^^^^^^
# This decorator tells Python: "Auto-generate these methods for me:
#   __init__  — constructor (stores sensor_id and temperature)
#   __repr__  — string representation (for print/debugging)
#   __eq__    — equality comparison (are two objects equal?)
#
# Without @dataclass, you'd have to write all three manually!

class SensorReading:
    sensor_id: str       # Just type hints — no actual code needed!
    temperature: float   # Python generates: self.sensor_id = sensor_id
                         #                   self.temperature = temperature

# Compare to the verbose version:
class SensorReadingManual:
    def __init__(self, sensor_id: str, temperature: float):
        self.sensor_id = sensor_id
        self.temperature = temperature
    
    def __repr__(self) -> str:
        return f"SensorReading(sensor_id={self.sensor_id!r}, temperature={self.temperature!r})"
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, SensorReadingManual):
            return False
        return self.sensor_id == other.sensor_id and self.temperature == other.temperature
```

**Adding methods to a dataclass:**
```python
from dataclasses import dataclass

@dataclass
class SensorReading:
    sensor_id: str
    temperature: float

    # You can still add custom methods
    def is_overheated(self, threshold: float = 80.0) -> bool:
        return self.temperature > threshold

    def __str__(self) -> str:
        status = "OVERHEATED" if self.is_overheated() else "OK"
        return f"[{status}] Sensor {self.sensor_id}: {self.temperature}°C"

# Usage
reading = SensorReading("S-001", 22.5)
print(reading)              # [OK] Sensor S-001: 22.5°C
print(reading.is_overheated())  # False

hot_reading = SensorReading("S-002", 95.0)
print(hot_reading)          # [OVERHEATED] Sensor S-002: 95.0°C
```

---

### 5. Default Values and Optional Fields

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class SensorReading:
    sensor_id: str
    temperature: float
    unit: str = "celsius"                    # Default value
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    #                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                                      For per-instance defaults (like now()),
    #                                      use field(default_factory=...)
    #                                      instead of a direct value

# All of these are valid:
r1 = SensorReading("S-001", 22.5)                                  # Uses defaults
r2 = SensorReading("S-002", 100.0, unit="fahrenheit")              # Override unit
r3 = SensorReading("S-003", 21.0, timestamp="2025-01-15T10:00:00") # Override timestamp

print(r1)
# Outputs: SensorReading(sensor_id='S-001', temperature=22.5, unit='celsius', timestamp='2025-01-15T...')
```

**What's happening:**
```python
unit: str = "celsius"
#    ^   ^  ^^^^^^^^^
#    |   |  └── Default value: if you don't provide unit, it's "celsius"
#    |   └── Type hint: must be a string
#    └── Field name

timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
#                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                field() gives more control over default values
#                default_factory=lambda: ... means:
#                  "Call this function to get the default value"
#                We use this because datetime.now() should be called
#                EACH TIME a new object is created, not once at class definition

# Why not just: timestamp: str = datetime.now().isoformat() ?
# Because that would be evaluated ONCE when the class is defined,
# and ALL objects would share the same timestamp!
```

**Common mistake — mutable defaults:**
```python
# ❌ WRONG: Mutable default (list, dict)
@dataclass
class SensorConfig:
    readings: list = []  # BAD! @dataclass refuses this at class definition:
    # ValueError: mutable default <class 'list'> for field readings is not allowed: use default_factory

r1 = SensorConfig()
r2 = SensorConfig()
r1.readings.append(22.5)
print(r2.readings)  # Never reached (ValueError above). In a plain class, a list class attribute WOULD be shared: [22.5]

# ✅ RIGHT: Use field(default_factory=list)
@dataclass
class SensorConfig:
    readings: list = field(default_factory=list)  # Each instance gets its own list

r1 = SensorConfig()
r2 = SensorConfig()
r1.readings.append(22.5)
print(r2.readings)  # [] — r2 has its own empty list
```

---

### 6. Inheritance — Extending Classes

Classes can inherit from other classes, gaining all their attributes and methods while adding new ones.

```python
from dataclasses import dataclass

@dataclass
class SensorReading:
    sensor_id: str
    temperature: float

    def is_overheated(self, threshold: float = 80.0) -> bool:
        return self.temperature > threshold

@dataclass
class HumiditySensor(SensorReading):
    # Inherits: sensor_id, temperature, is_overheated()
    # Adds: humidity
    humidity: float = 0.0

    def is_humid(self, threshold: float = 70.0) -> bool:
        return self.humidity > threshold

# HumiditySensor has everything SensorReading has, plus humidity
sensor = HumiditySensor(sensor_id="S-001", temperature=22.5, humidity=85.0)

print(sensor.sensor_id)          # S-001 (inherited)
print(sensor.temperature)        # 22.5 (inherited)
print(sensor.humidity)           # 85.0 (new)
print(sensor.is_overheated())    # False (inherited method)
print(sensor.is_humid())         # True (new method)
```

**What's happening:**
```python
@dataclass
class HumiditySensor(SensorReading):
#                   ^^^^^^^^^^^^^^
#                   Inherits from SensorReading
#                   Gets ALL its fields and methods for free
    humidity: float = 0.0
#   ^^^^^^^^
#   New field added on top of inherited fields
    
    def is_humid(self, threshold: float = 70.0) -> bool:
        return self.humidity > threshold
#   New method specific to HumiditySensor

# When you create HumiditySensor("S-001", 22.5, 85.0):
#   sensor_id = "S-001"    (from SensorReading)
#   temperature = 22.5     (from SensorReading)
#   humidity = 85.0        (from HumiditySensor)
#
# Python builds the object like stacking layers:
#   Layer 1: SensorReading fields (sensor_id, temperature)
#   Layer 2: HumiditySensor fields (humidity)
```

---

### 7. Common Mistakes

```python
# MISTAKE 1: Forgetting self
class SensorReading:
    def __init__(sensor_id, temperature):  # ❌ Missing self!
        sensor_id = sensor_id              # Creates a local variable, not an attribute
        temperature = temperature          # Same problem

# FIX:
class SensorReading:
    def __init__(self, sensor_id, temperature):  # ✅ self is first param
        self.sensor_id = sensor_id               # Now it's stored on the object
        self.temperature = temperature

# MISTAKE 2: Forgetting to call the class
class SensorReading:
    def __init__(self, sensor_id):
        self.sensor_id = sensor_id

# WRONG:
# reading = SensorReading  # This assigns the CLASS, not an object!
# reading.sensor_id  # AttributeError: type object has no attribute 'sensor_id'

# RIGHT:
reading = SensorReading("S-001")  # Call the class like a function
reading.sensor_id  # "S-001"

# MISTAKE 3: Creating instance before class is defined
# reading = SensorReading("S-001")  # ❌ NameError: name 'SensorReading' is not defined
class SensorReading:
    def __init__(self, sensor_id):
        self.sensor_id = sensor_id
# reading = SensorReading("S-001")  # ✅ Now it works

# MISTAKE 4: Modifying class attributes instead of instance attributes
class SensorReading:
    default_unit = "celsius"  # Class attribute (shared by all instances)

r1 = SensorReading()
r2 = SensorReading()
r1.default_unit = "fahrenheit"  # Creates INSTANCE attribute on r1 only
print(r1.default_unit)  # "fahrenheit"
print(r2.default_unit)  # "celsius" (still uses class attribute)
```

---

### 8. Classes in Real Factory Code

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SensorConfig:
    """Configuration for a factory sensor."""
    sensor_id: str
    sensor_type: str  # "temperature", "pressure", "humidity"
    min_value: float
    max_value: float
    alert_threshold: Optional[float] = None
    unit: str = "celsius"
    is_active: bool = True

    def validate_reading(self, value: float) -> bool:
        """Check if a reading is within valid bounds."""
        return self.min_value <= value <= self.max_value

    def is_alert(self, value: float) -> bool:
        """Check if a reading triggers an alert."""
        if self.alert_threshold is None:
            return False
        return value >= self.alert_threshold

    def __str__(self) -> str:
        status = "ACTIVE" if self.is_active else "INACTIVE"
        alert_str = f", alert@{self.alert_threshold}" if self.alert_threshold else ""
        return f"[{status}] {self.sensor_id} ({self.sensor_type}): {self.min_value}-{self.max_value}{self.unit}{alert_str}"

# Create sensor configurations
temp_sensor = SensorConfig(
    sensor_id="TEMP-001",
    sensor_type="temperature",
    min_value=-40.0,
    max_value=150.0,
    alert_threshold=80.0,
    unit="celsius"
)

pressure_sensor = SensorConfig(
    sensor_id="PRES-001",
    sensor_type="pressure",
    min_value=0.0,
    max_value=200.0,
    unit="psi"
)

# Use the methods
print(temp_sensor)
# [ACTIVE] TEMP-001 (temperature): -40.0-150.0celsius, alert@80.0

print(temp_sensor.validate_reading(22.5))   # True (in range)
print(temp_sensor.validate_reading(200.0))  # False (out of range)
print(temp_sensor.is_alert(85.0))           # True (above threshold)
print(temp_sensor.is_alert(75.0))           # False (below threshold)
print(pressure_sensor.is_alert(100.0))      # False (no threshold set)
```

---

### Summary

Classes are blueprints for creating structured data objects. We will soon use a library called Pydantic, which takes standard Python classes and gives them superpowers — automatically validating data and throwing helpful errors if an AI agent tries to give us bad data.

**Key takeaways:**
- Classes define structure (attributes) and behavior (methods)
- `__init__` is the constructor — runs when you create an object
- `self` refers to the specific object being used
- `@dataclass` auto-generates `__init__`, `__repr__`, `__eq__`
- Classes catch typos at attribute access time (AttributeError)
- Inheritance lets you extend classes without rewriting code
- Always use `field(default_factory=...)` for mutable defaults

---

### Quick Reference Table

| Syntax | Meaning | Example |
|--------|---------|---------|
| `class Name:` | Define a class | `class Sensor:` |
| `def __init__(self, ...)` | Constructor | `def __init__(self, id):` |
| `self.attr` | Instance attribute | `self.sensor_id = id` |
| `obj.method()` | Call a method | `sensor.is_overheated()` |
| `@dataclass` | Auto-generate methods | `@dataclass class Sensor:` |
| `field(default_factory=fn)` | Mutable default | `readings: list = field(default_factory=list)` |
| `class Child(Parent)` | Inheritance | `class HumidSensor(Sensor):` |
| `def __str__(self)` | Print representation | `return f"Sensor {self.id}"` |
| `def __repr__(self)` | Debug representation | `return f"Sensor(id={self.id})"` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Methods and `self`.** Using the plain (non-dataclass) `SensorReading` from Section 2 (with `__str__`, `is_overheated`, `difference_from`), predict every printed value:

```python
reading_1 = SensorReading("S-003", 79.5)
reading_2 = SensorReading("S-004", 81.0)

print(reading_1)
print(reading_1.is_overheated(), reading_2.is_overheated())
print(reading_1.is_overheated(threshold=79.5))
print(reading_2.difference_from(reading_1))
```

**Q2. Equality vs. identity.** Using the two-field `@dataclass SensorReading` from Section 4 (no custom `__str__`), predict each line:

```python
a = SensorReading("S-001", 22.5)
b = SensorReading("S-001", 22.5)
c = a
print(a == b, a is b)
c.temperature = 30.0
print(a == b, a is c, a.temperature)
print(b)
```

What would `print(a == b)` on the **first** line print if `SensorReading` were the plain class from Section 1 (no `@dataclass`, no `__eq__`)?

**Q3. Class attribute vs. instance attribute.** Extend Mistake 4 by one line. Predict the output:

```python
class SensorReading:
    default_unit = "celsius"

r1 = SensorReading()
r2 = SensorReading()
r1.default_unit = "fahrenheit"
SensorReading.default_unit = "kelvin"    # changed on the CLASS
r3 = SensorReading()
print(r1.default_unit, r2.default_unit, r3.default_unit)
```

**Q4. A freezer sensor.** Using `SensorConfig` from Section 8, predict all four outputs. (Look closely at how `__str__` builds `alert_str`.)

```python
freezer = SensorConfig("FRZ-01", "temperature", -30.0, 10.0, alert_threshold=0.0)
print(freezer)
print(freezer.is_alert(0.0))
print(freezer.validate_reading(10.0))
print(freezer.validate_reading(-30.5))
```

**Q5. What really happens?**
1. You actually run the "WRONG" version from Section 5's mutable-default mistake: a `@dataclass` with `readings: list = []`. On which line does Python stop, and with what error?
2. Using the Section 6 `HumiditySensor`, what do `print(h)`, `h.is_overheated()` and `h.is_humid()` give for `h = HumiditySensor("S-9", 90.0)`?

### Coding Exercises

**E1 (Easy). Battery gauge.** Write a `@dataclass Battery` with `voltage: float`, `min_voltage: float = 22.0`, `max_voltage: float = 25.2` (a 6-cell Li-ion pack), and a method `percent(self) -> float` that maps the voltage linearly onto 0–100 %, **clamps** to that range, and rounds to 1 decimal.

```python
Battery(23.6).percent()   # 50.0
Battery(25.5).percent()   # 100.0  (clamped)
Battery(21.0).percent()   # 0.0    (clamped)
```

**E2 (Easy–Medium). A log that owns its own list.** Write a `@dataclass SensorLog` with `sensor_id: str` and `readings: list[float]` (default: a new empty list per instance), plus `add(self, value: float) -> None` and `average(self) -> float | None` (return `None` when empty). Two logs must never share readings.

```python
a = SensorLog("TEMP-001"); b = SensorLog("TEMP-002")
a.add(22.5); a.add(23.5)
a.average()   # 23.0
b.average()   # None
b.readings    # []
```

**E3 (Medium). Inherit and extend.** Write `@dataclass AlertingLog(SensorLog)` that adds `threshold: float = 80.0` and `alerts: list[float]` (own empty list). Override `add` so that it still stores the reading (reuse the parent with `super()`) and *also* records it in `alerts` when `value >= threshold`. Add `alert_ratio(self) -> float` = alerts / readings (0.0 when there are no readings).

```python
log = AlertingLog("TEMP-001", threshold=80.0)
for v in [75.0, 82.5, 80.0, 60.0]:
    log.add(v)
log.alerts         # [82.5, 80.0]
log.alert_ratio()  # 0.5
log.average()      # 74.375   (inherited, unchanged)
```

#### Dry-Run: Answers

**Q1.** Output:

```python
Sensor S-003: 79.5°C
False True
False
1.5
```

| Call | `self.temperature` | Comparison | Result |
|------|--------------------|------------|--------|
| `reading_1.is_overheated()` | 79.5 | $79.5 > 80.0$ | `False` |
| `reading_2.is_overheated()` | 81.0 | $81.0 > 80.0$ | `True` |
| `reading_1.is_overheated(threshold=79.5)` | 79.5 | $79.5 > 79.5$ (strict `>`) | `False` |
| `reading_2.difference_from(reading_1)` | 81.0 | $\lvert 81.0 - 79.5 \rvert$ | `1.5` |

**Q2.** Output:

```python
True False
False True 30.0
SensorReading(sensor_id='S-001', temperature=22.5)
```

`a == b` uses the auto-generated `__eq__` (compare field values), while `a is b` asks "same object in memory?". `c = a` copies the *reference*, not the object, so `c.temperature = 30.0` changes `a` as well, and now `a != b`. `b` is untouched, and `print(b)` uses the auto-generated `__repr__`.

Without `@dataclass` (and with no hand-written `__eq__`), `==` falls back to identity, so `a == b` would print `False` even though the values match.

**Q3.** Output:

```python
fahrenheit kelvin kelvin
```

| Object | Has its own `default_unit`? | Lookup finds |
|--------|-----------------------------|--------------|
| `r1` | yes (`"fahrenheit"`, created by the assignment) | instance value `fahrenheit` |
| `r2` | no | class value, which is now `kelvin` |
| `r3` | no | class value `kelvin` |

Attribute lookup checks the instance first, then the class. Changing the class attribute changes what every instance *without* its own copy sees, including instances that already existed (`r2`).

**Q4.** Output:

```python
[ACTIVE] FRZ-01 (temperature): -30.0-10.0celsius
True
True
False
```

- The `, alert@0.0` suffix is **missing** because `__str__` tests `if self.alert_threshold`, and `0.0` is falsy. (The correct test is `is not None`, which `is_alert` already uses.)
- `is_alert(0.0)`: the threshold is not `None`, and $0.0 \ge 0.0$, so `True`.
- `validate_reading(10.0)`: $-30.0 \le 10.0 \le 10.0$, so `True` (the bounds are inclusive).
- `validate_reading(-30.5)`: $-30.5 < -30.0$, so `False`.

**Q5.**
1. Python stops while **defining the class**, before any instance is created. `@dataclass` refuses list, dict and set defaults outright: `ValueError: mutable default <class 'list'> for field readings is not allowed: use default_factory`. So with `@dataclass` you never reach the shared-list bug. You *do* get that bug with a plain class that uses a class attribute `readings = []`, or with a function default `def f(readings=[])`. Either way, the fix is still `field(default_factory=list)`.
2. Output:

```python
HumiditySensor(sensor_id='S-9', temperature=90.0, humidity=0.0)
True
False
```

`humidity` takes its default `0.0`. The inherited `is_overheated` gives $90.0 > 80.0$, so `True`. `is_humid` gives $0.0 > 70.0$, so `False`.

**E1 — reference solution**

```python
from dataclasses import dataclass

@dataclass
class Battery:
    voltage: float
    min_voltage: float = 22.0
    max_voltage: float = 25.2

    def percent(self) -> float:
        fraction = (self.voltage - self.min_voltage) / (self.max_voltage - self.min_voltage)
        fraction = max(0.0, min(1.0, fraction))     # clamp to [0, 1]
        return round(fraction * 100, 1)
```

Check: $\dfrac{23.6 - 22.0}{25.2 - 22.0} = \dfrac{1.6}{3.2} = 0.5$, which gives `50.0`. Clamping happens *before* scaling, so a 25.5 V pack reads `100.0`, not `109.4`.

**E2 — reference solution**

```python
from dataclasses import dataclass, field

@dataclass
class SensorLog:
    sensor_id: str
    readings: list[float] = field(default_factory=list)   # fresh list per instance

    def add(self, value: float) -> None:
        self.readings.append(value)

    def average(self) -> float | None:
        if not self.readings:
            return None
        return sum(self.readings) / len(self.readings)
```

`default_factory=list` calls `list()` once *per object*, which is why `b.readings` stays `[]`. Check: $(22.5 + 23.5)/2 = 23.0$.

**E3 — reference solution**

```python
from dataclasses import dataclass, field

@dataclass
class AlertingLog(SensorLog):
    threshold: float = 80.0
    alerts: list[float] = field(default_factory=list)

    def add(self, value: float) -> None:
        super().add(value)                 # parent still stores the reading
        if value >= self.threshold:
            self.alerts.append(value)

    def alert_ratio(self) -> float:
        if not self.readings:
            return 0.0
        return len(self.alerts) / len(self.readings)
```

Trace for `[75.0, 82.5, 80.0, 60.0]` with threshold 80.0: `75.0` is not an alert; `82.5` is; `80.0` is (because of `>=`); `60.0` is not. So `alerts = [82.5, 80.0]` and the ratio is $2/4 = 0.5$. The inherited `average()` gives $(75 + 82.5 + 80 + 60)/4 = 297.5/4 = 74.375$. The new fields need defaults, because a dataclass field without a default cannot follow inherited fields that have one (`readings`).

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Class & Object Refresher**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 class refresher**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

