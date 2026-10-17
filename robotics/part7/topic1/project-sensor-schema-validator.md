# Part 2, Topic 1: Data Validation with Pydantic
## Project 1: Sensor Schema Validator

LLMs produce JSON that looks plausible but may contain physically impossible or dangerous values. This project builds a complete validation layer that rejects anomalous sensor readings before they can influence any downstream system.

### Goal

You will demonstrate that you can define Pydantic models with field constraints, write custom validators for physics plausibility, reject bad LLM outputs with structured error messages, and test your system against realistic edge cases.

### Requirements

#### 1. Define the SensorReading BaseModel

Create a `SensorReading` model with these fields:

- `sensor_id`: string, 1–20 characters, pattern `^[A-Z]+-\d+$`
- `temperature`: float, range -40.0 to 150.0 (Celsius)
- `pressure`: float, strictly greater than 0, max 500.0 (PSI)
- `humidity`: float, 0.0 to 100.0 (percentage)
- `timestamp`: string (ISO 8601 format, validated with pattern)

```python
from pydantic import BaseModel, Field

class SensorReading(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]+-\d+$")
    temperature: float = Field(ge=-40.0, le=150.0)
    pressure: float = Field(gt=0.0, le=500.0)
    humidity: float = Field(ge=0.0, le=100.0)
    timestamp: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
```

#### 2. Add Custom Validators

Add a `@field_validator` for temperature that rejects values below absolute zero context (below -273.15 even though range allows -40). Add a `@model_validator` that enforces: if temperature exceeds 100.0, pressure must also be above 20.0 (high heat implies pressurized system).

```python
from pydantic import field_validator, model_validator

class SensorReading(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]+-\d+$")
    temperature: float = Field(ge=-40.0, le=150.0)
    pressure: float = Field(gt=0.0, le=500.0)
    humidity: float = Field(ge=0.0, le=100.0)
    timestamp: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if v < -273.15:
            raise ValueError(f"Temperature {v}C is below absolute zero")
        return v

    @model_validator(mode="after")
    def validate_thermal_pressure(self):
        if self.temperature > 100.0 and self.pressure <= 20.0:
            raise ValueError(
                f"Temperature {self.temperature}C with pressure {self.pressure}PSI "
                f"is inconsistent — high temp requires pressurized system"
            )
        return self
```

#### 3. Build a Validation Function

Create a `validate_sensor_input(raw_json: str)` function that parses JSON, validates against the model, and returns either the validated model or a structured error dict.

```python
import json
from pydantic import ValidationError

def validate_sensor_input(raw_json: str):
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        return {"status": "error", "type": "parse_error", "detail": str(e)}

    try:
        reading = SensorReading.model_validate(data)
        return {"status": "ok", "data": reading.model_dump()}
    except ValidationError as e:
        errors = []
        for err in e.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in err["loc"]),
                "type": err["type"],
                "message": err["msg"]
            })
        return {"status": "error", "type": "validation_error", "errors": errors}
```

#### 4. Test with 10+ Sample Inputs

Write test cases covering valid readings, out-of-range values, missing fields, wrong types, invalid patterns, and cross-field violations.

```python
test_cases = [
    '{"sensor_id": "TC-01", "temperature": 23.5, "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-02", "temperature": 200.0, "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-03", "temperature": 25.0, "pressure": -5.0, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-04", "temperature": 25.0, "pressure": 14.7, "humidity": 150.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "bad-id", "temperature": 25.0, "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"temperature": 25.0, "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-05", "temperature": "hot", "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-06", "temperature": 120.0, "pressure": 10.0, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-07", "temperature": 120.0, "pressure": 50.0, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}',
    '{"sensor_id": "TC-08", "temperature": 25.0, "pressure": 14.7, "humidity": 55.0, "timestamp": "not-a-date"}',
    '{"sensor_id": "TC-09", "temperature": 500.0, "pressure": 600.0, "humidity": 200.0, "timestamp": "2025-01-15T10:30:00Z"}',
    'not json at all',
]

for i, case in enumerate(test_cases):
    result = validate_sensor_input(case)
    status = result["status"]
    if status == "ok":
        print(f"Case {i+1}: OK — {result['data']['temperature']}C")
    else:
        print(f"Case {i+1}: REJECTED — {result['type']}")
```

Expected output:
```
Case 1: OK — 23.5C
Case 2: REJECTED — validation_error
Case 3: REJECTED — validation_error
Case 4: REJECTED — validation_error
Case 5: REJECTED — validation_error
Case 6: REJECTED — validation_error
Case 7: REJECTED — validation_error
Case 8: REJECTED — validation_error
Case 9: OK — 120.0C
Case 10: REJECTED — validation_error
Case 11: REJECTED — validation_error
Case 12: REJECTED — parse_error
```

### Evaluation Checklist

- [ ] SensorReading model defines all five fields with correct types
- [ ] Field constraints enforce numeric ranges and string patterns
- [ ] @field_validator catches physically impossible temperatures
- [ ] @model_validator enforces temperature-pressure consistency
- [ ] validate_sensor_input returns structured error dicts with field-level detail
- [ ] JSON parse errors are caught and returned as parse_error
- [ ] Missing required fields produce clear validation_error responses
- [ ] Wrong types (string where float expected) are caught
- [ ] Valid readings pass through cleanly with model_dump()
- [ ] 10+ test cases cover valid, invalid, and edge-case inputs

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Sensor Schema Validator**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project sensor schema validator**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

