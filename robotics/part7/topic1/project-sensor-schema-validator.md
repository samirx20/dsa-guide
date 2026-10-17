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

### Starter Code Skeleton

The requirements above already give you the model and the core function. This skeleton turns them into a small, typed package. The result shapes become `TypedDict`s, so `mypy` can check every branch, and a CLI runs the validator over a file of raw LLM outputs (one JSON document per line) and prints a per-field rejection histogram.

```text
sensor-schema-validator/
├── pyproject.toml
├── models.py            # SensorReading (Requirements 1 + 2)
├── validate.py          # result TypedDicts + validate_sensor_input (Requirement 3)
├── cli.py               # python cli.py cases.jsonl [--json]
├── cases.jsonl          # the 12 strings from Requirement 4, one per line
└── tests/
    └── test_validator.py
```

```toml
# pyproject.toml
[project]
name = "sensor-schema-validator"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["pydantic>=2.6"]

[project.optional-dependencies]
dev = ["pytest>=8.0", "mypy>=1.10"]

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]
```

```python
# models.py -- Requirement 2's class, with the return type of the model validator spelled out
from typing import Self

from pydantic import BaseModel, Field, field_validator, model_validator


class SensorReading(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]+-\d+$")
    temperature: float = Field(ge=-40.0, le=150.0)
    pressure: float = Field(gt=0.0, le=500.0)
    humidity: float = Field(ge=0.0, le=100.0)
    timestamp: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        # TODO(milestone 2): reject v < -273.15 (see Practice Q1 for a surprise)
        return v

    @model_validator(mode="after")
    def validate_thermal_pressure(self) -> Self:
        # TODO(milestone 2): temperature > 100.0 requires pressure > 20.0
        return self
```

```python
# validate.py
import json
from typing import Any, Literal, TypedDict

from pydantic import ValidationError

from models import SensorReading


class FieldError(TypedDict):
    field: str
    type: str
    message: str


class OkResult(TypedDict):
    status: Literal["ok"]
    data: dict[str, Any]


class ParseErrorResult(TypedDict):
    status: Literal["error"]
    type: Literal["parse_error"]
    detail: str


class ValidationErrorResult(TypedDict):
    status: Literal["error"]
    type: Literal["validation_error"]
    errors: list[FieldError]


ValidationResult = OkResult | ParseErrorResult | ValidationErrorResult


def to_field_errors(exc: ValidationError) -> list[FieldError]:
    """One FieldError per Pydantic error. A model-level error has an empty loc; label it '(model)'."""
    # TODO(milestone 3): ".".join(str(p) for p in err["loc"]) or "(model)"
    raise NotImplementedError


def validate_sensor_input(raw_json: str) -> ValidationResult:
    """Never raises: every input becomes exactly one of the three result shapes."""
    # TODO(milestone 3): json.loads -> parse_error; model_validate -> ok / validation_error
    raise NotImplementedError
```

```python
# cli.py
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from validate import ValidationResult, validate_sensor_input


def describe(index: int, result: ValidationResult) -> list[str]:
    """'Case  N: OK ...' or 'Case  N: REJECTED <type>' plus one indented line per FieldError."""
    # TODO(milestone 4)
    raise NotImplementedError


def summarize(results: list[ValidationResult]) -> str:
    """Totals, acceptance rate, counts by error kind and by field (most frequent first)."""
    # TODO(milestone 5): use collections.Counter for both histograms
    raise NotImplementedError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate one raw LLM output per line.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--json", action="store_true", help="emit one JSON result per line")
    args = parser.parse_args(argv)
    lines: list[str] = [ln for ln in args.path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    results: list[ValidationResult] = [validate_sensor_input(ln) for ln in lines]
    for i, result in enumerate(results, start=1):
        print(json.dumps(result, ensure_ascii=False) if args.json else "\n".join(describe(i, result)))
    if not args.json:
        print(summarize(results))
    return 0 if all(r["status"] == "ok" for r in results) else 2  # 2 = "some input rejected"


if __name__ == "__main__":
    sys.exit(main())
```

### Step-by-Step Milestones

1. **Bare model.** Create `models.py` with the five `Field` constraints only (no custom validators yet).
   *Done when:* `python -c "from models import SensorReading as S; print(S(sensor_id='TC-1', temperature=20, pressure=14.7, humidity=50, timestamp='2025-01-15T10:30:00Z'))"` prints the model, and changing `sensor_id` to `'tc-1'` raises `string_pattern_mismatch`.
2. **Custom validators.** Add the `@field_validator` and the `@model_validator(mode="after")`.
   *Done when:* constructing the model with `temperature=120, pressure=10` raises an error whose `type` is `value_error`, and `temperature=120, pressure=50` succeeds.
3. **Structured results.** Implement `to_field_errors` and `validate_sensor_input`.
   *Done when:* `python -c "from validate import validate_sensor_input as v; print(v('not json'))"` prints `{'status': 'error', 'type': 'parse_error', 'detail': 'Expecting value: line 1 column 1 (char 0)'}`.
4. **Requirement 4 parity.** Put the 12 strings from Requirement 4 into `cases.jsonl` and implement `describe`.
   *Done when:* `python cli.py cases.jsonl` shows `OK` for cases 1 and 9 only, and `parse_error` for case 12. This matches the expected output in Requirement 4.
5. **Histogram summary.** Implement `summarize` and the exit code.
   *Done when:* the last three lines match *Sample Expected Output*, and `echo $?` prints `2`.
6. **Tests and typing.** Add `tests/test_validator.py`.
   *Done when:* `pytest -q` reports `18 passed`. Then run `mypy .` and fix anything it reports. Narrowing a `TypedDict` union on `r["status"] == "error"` is the usual fix.

### Sample Expected Output

The sample input is `cases.jsonl`, which holds the 12 strings from Requirement 4 in the same order.

```text
$ python cli.py cases.jsonl
Case  1: OK       TC-01 23.5C 14.7PSI 55.0%
Case  2: REJECTED validation_error (1)
           - temperature [less_than_equal]: Input should be less than or equal to 150
Case  3: REJECTED validation_error (1)
           - pressure [greater_than]: Input should be greater than 0
Case  4: REJECTED validation_error (1)
           - humidity [less_than_equal]: Input should be less than or equal to 100
Case  5: REJECTED validation_error (1)
           - sensor_id [string_pattern_mismatch]: String should match pattern '^[A-Z]+-\d+$'
Case  6: REJECTED validation_error (1)
           - sensor_id [missing]: Field required
Case  7: REJECTED validation_error (1)
           - temperature [float_parsing]: Input should be a valid number, unable to parse string as a number
Case  8: REJECTED validation_error (1)
           - (model) [value_error]: Value error, Temperature 120.0C with pressure 10.0PSI is inconsistent — high temp requires pressurized system
Case  9: OK       TC-07 120.0C 50.0PSI 55.0%
Case 10: REJECTED validation_error (1)
           - timestamp [string_pattern_mismatch]: String should match pattern '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$'
Case 11: REJECTED validation_error (3)
           - temperature [less_than_equal]: Input should be less than or equal to 150
           - pressure [less_than_equal]: Input should be less than or equal to 500
           - humidity [less_than_equal]: Input should be less than or equal to 100
Case 12: REJECTED parse_error: Expecting value: line 1 column 1 (char 0)
Summary: 12 inputs, 2 accepted, 10 rejected (16.7% acceptance)
  by kind : parse_error=1, validation_error=9
  by field: temperature=3, pressure=2, humidity=2, sensor_id=2, (model)=1, timestamp=1
```

The same run with `--json` (cases 1, 8 and 12 shown). This is the format a downstream agent would consume:

```json
{"status": "ok", "data": {"sensor_id": "TC-01", "temperature": 23.5, "pressure": 14.7, "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z"}}
{"status": "error", "type": "validation_error", "errors": [{"field": "(model)", "type": "value_error", "message": "Value error, Temperature 120.0C with pressure 10.0PSI is inconsistent — high temp requires pressurized system"}]}
{"status": "error", "type": "parse_error", "detail": "Expecting value: line 1 column 1 (char 0)"}
```

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| valid round trip | `BASE` reading | `{"status": "ok", "data": BASE}` |
| temperature above range | `150.01` | error on `temperature` |
| temperature below range | `-40.01` | error on `temperature` |
| inclusive temperature bounds | `-40.0` and `150.0` (pressure 50) | `ok` |
| pressure exactly zero | `0.0` | error on `pressure` (`gt` is strict) |
| humidity above range | `100.5` | error on `humidity` |
| bad id pattern | `"tc-01"` | error on `sensor_id` |
| missing field | no `sensor_id` key | error on `sensor_id`, type `missing` |
| bad timestamp | `"2025-01-15 10:30:00"` | error on `timestamp` |
| wrong type | `temperature = "hot"` | error on `temperature`, type `float_parsing` |
| numeric string | `temperature = "23.5"` | `ok` (lax coercion) |
| cross-field violation | `120.0` C with `10.0` PSI | one error on `(model)`, type `value_error` |
| cross-field boundary | `100.0` C with `5.0` PSI | `ok` (rule is `> 100.0`) |
| many errors at once | 500 C / 600 PSI / 200 % | three errors, in field order |
| not JSON | `"not json at all"` | `parse_error` |
| CLI exit code | file with one bad line, then one with only good lines | `2`, then `0` |

```python
# tests/test_validator.py -- run with: pytest -q
import json
import sys
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cli import main  # noqa: E402
from models import SensorReading  # noqa: E402
from validate import validate_sensor_input  # noqa: E402

BASE: dict[str, Any] = {
    "sensor_id": "TC-01", "temperature": 23.5, "pressure": 14.7,
    "humidity": 55.0, "timestamp": "2025-01-15T10:30:00Z",
}


def payload(**overrides: Any) -> str:
    """BASE with overrides; pass `...` (Ellipsis) as a value to DROP that key."""
    data = {**BASE, **overrides}
    return json.dumps({k: v for k, v in data.items() if v is not ...})


def error_fields(result: dict[str, Any]) -> list[str]:
    assert result["status"] == "error" and result["type"] == "validation_error"
    return [e["field"] for e in result["errors"]]


def test_valid_reading_round_trips() -> None:
    result = validate_sensor_input(payload())
    assert result == {"status": "ok", "data": BASE}


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"temperature": 150.01}, "temperature"),
        ({"temperature": -40.01}, "temperature"),
        ({"pressure": 0.0}, "pressure"),          # gt is strict
        ({"humidity": 100.5}, "humidity"),
        ({"sensor_id": "tc-01"}, "sensor_id"),    # lowercase breaks the pattern
        ({"sensor_id": ...}, "sensor_id"),        # missing
        ({"timestamp": "2025-01-15 10:30:00"}, "timestamp"),
        ({"temperature": "hot"}, "temperature"),
    ],
)
def test_single_field_rejections(overrides: dict[str, Any], field: str) -> None:
    assert error_fields(validate_sensor_input(payload(**overrides))) == [field]


@pytest.mark.parametrize("temp", [-40.0, 150.0])
def test_temperature_bounds_inclusive(temp: float) -> None:
    assert validate_sensor_input(payload(temperature=temp, pressure=50.0))["status"] == "ok"


def test_cross_field_rule_reports_model_level_error() -> None:
    result = validate_sensor_input(payload(temperature=120.0, pressure=10.0))
    assert error_fields(result) == ["(model)"]
    assert result["errors"][0]["type"] == "value_error"


def test_cross_field_boundary_is_strict_on_temperature() -> None:
    assert validate_sensor_input(payload(temperature=100.0, pressure=5.0))["status"] == "ok"


def test_all_field_errors_are_collected() -> None:
    result = validate_sensor_input(payload(temperature=500.0, pressure=600.0, humidity=200.0))
    assert error_fields(result) == ["temperature", "pressure", "humidity"]


def test_parse_error() -> None:
    result = validate_sensor_input("not json at all")
    assert result["status"] == "error" and result["type"] == "parse_error"


def test_numeric_string_is_coerced() -> None:
    result = validate_sensor_input(payload(temperature="23.5"))
    assert result["status"] == "ok" and result["data"]["temperature"] == 23.5


def test_model_raises_directly_when_used_without_wrapper() -> None:
    with pytest.raises(ValidationError):
        SensorReading.model_validate({**BASE, "humidity": -1})


def test_cli_exit_code_is_2_when_anything_rejected(tmp_path: Path) -> None:
    f = tmp_path / "cases.jsonl"
    f.write_text(payload() + "\n" + "not json\n", encoding="utf-8")
    assert main([str(f)]) == 2
    f.write_text(payload() + "\n", encoding="utf-8")
    assert main([str(f)]) == 0
```

### Practice & Self-Check

**Q1 (predict the output).** What does `validate_sensor_input` return for a reading with `"temperature": -300`? Does the "below absolute zero" message from `validate_temperature` ever appear?

**Q2 (predict the output).** Classify each pair as `ok` or rejected, and give the field label for each rejection: (a) $T = 100.0$ C, $P = 5.0$ PSI; (b) $T = 120.0$ C, $P = 20.0$ PSI.

**Q3 (predict the output).** A reading has $T = 500$ C **and** $P = 10$ PSI, so it breaks both the temperature range and the thermal-pressure rule. How many errors does the result contain, and which ones?

**Exercise 1 (Easy).** LLMs often send units inside the value, such as `"pressure": "14.7 PSI"`. Add a `@field_validator("pressure", mode="before")` that strips a trailing `PSI` (case-insensitive) from strings before the float conversion. Add one test case where it is accepted and one where `"14.7 bar"` is still rejected.

**Exercise 2 (Medium).** Replace the hard-coded cross-field rule with a data-driven rule table: `RULES: list[tuple[str, Callable[[SensorReading], bool]]]`, where each entry holds a name and a predicate that must hold. Evaluate every rule in one `@model_validator(mode="after")` and raise a single `ValueError` that lists **all** violated rule names. Add a second rule, "humidity above 95% requires temperature below 60 C", and a test that triggers both rules at once.

#### Dry-Run: Answers

**A1.** `{"status": "error", "type": "validation_error", "errors": [{"field": "temperature", "type": "greater_than_equal", "message": "Input should be greater than or equal to -40"}]}`. The `Field(ge=-40.0)` constraint is checked first, and an *after* field validator only runs on values that passed the constraints. Every value below $-273.15$ is also below $-40$, so the absolute-zero branch can never fire. It is dead code under these bounds. It only becomes live if you widen `ge` or change the validator to `mode="before"`.

**A2.** (a) `ok`: the rule fires only when $T > 100.0$, and $100.0$ is not strictly greater. (b) Rejected with field `(model)` and type `value_error`: $T > 100$ holds and $P \le 20.0$ also holds (equality counts), so the rule is violated.

**A3.** Exactly **one** error, on `temperature` (`less_than_equal`). The model validator with `mode="after"` runs only after **all** field-level validation has succeeded. Because `temperature` failed, the model is never fully built, and the cross-field rule is never evaluated. Fix the temperature to $140$ and resubmit, and only then does the `(model)` error appear. That is why the LLM retry loop should always feed back the latest error list, not a stale one.

**Exercise 1 sketch.**

```python
@field_validator("pressure", mode="before")
@classmethod
def strip_psi(cls, v: object) -> object:
    if isinstance(v, str) and v.strip().upper().endswith("PSI"):
        return v.strip()[:-3].strip()
    return v
```

`"14.7 PSI"` becomes `"14.7"`, which lax mode then converts to `14.7`. `"14.7 bar"` is passed through unchanged and fails with `float_parsing`. That is the behavior you want: never guess a unit conversion silently.

**Exercise 2 sketch.**

```python
RULES: list[tuple[str, Callable[["SensorReading"], bool]]] = [
    ("thermal_pressure", lambda r: not (r.temperature > 100.0 and r.pressure <= 20.0)),
    ("humid_cool", lambda r: not (r.humidity > 95.0 and r.temperature >= 60.0)),
]

@model_validator(mode="after")
def check_rules(self) -> Self:
    broken = [name for name, ok in RULES if not ok(self)]
    if broken:
        raise ValueError(f"violated rules: {', '.join(broken)}")
    return self
```

A reading with $T = 120$, $P = 10$, $H = 97$ yields one `(model)` error whose message is `Value error, violated rules: thermal_pressure, humid_cool`.

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

