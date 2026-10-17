# Part 8, Topic 2: State Machines & Memory
## Chapter 3: Self-Correction Loops

**Prerequisite Knowledge:** Basic understanding of Try/Except blocks, Pydantic, and JSON.

### The 'Strict Teacher' Analogy

Imagine handing in a math test. A normal computer program might just give you an F if one answer is in the wrong format. A self-correction loop is like a strict but helpful teacher who hands the test back and says, "Question 3 needs to be a fraction, not a decimal. Try again." The AI fixes its mistake and hands it back until the format is perfect.

Because LLMs guess words, they sometimes format data incorrectly. Instead of crashing our program when the AI makes a typo, we catch the error, explain what went wrong, and ask the AI to try again.

```
  The Strict Teacher Analogy
  ==========================

  Student (LLM)          Teacher (Your Code)
  ============          ===================
  Submits test      ->  Checks every answer
  "Q3: 0.75"        <-  "Q3 needs a fraction, not decimal"
  "Q3: 3/4"         ->  Correct! Moves to Q5
  "Q5: incomplete"  <-  "Q5 is missing required work"
  "Q5: full answer" ->  Perfect. Grade: 100%
```

LLMs sometimes produce output that does not match your expected format. Instead of crashing or ignoring bad output, a self-correction loop catches validation errors, sends them back to the LLM with instructions to fix, and retries until the output is valid or a retry limit is reached.

### 1. The Problem with Unstructured LLM Output

When you ask an LLM to extract structured data, it might return malformed JSON, miss required fields, or produce values of the wrong type. Without validation, these errors propagate silently through your pipeline:

```python
import json

raw_output = '{"machine_id": "P101", "severity": "high", "action": "inspect bearings"}'

try:
    parsed = json.loads(raw_output)
    print(parsed)
except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}")

# This JSON is valid, but missing the "action" field!
bad_output = '{"machine_id": "P101", "severity": 1}'
parsed = json.loads(bad_output)

# We have to manually check for everything if we don't use Pydantic
if "action" not in parsed:
    print("Missing required field: action")
```

**What's happening:**
```
  raw_output
  =========
  "{"machine_id":"P101",...}"   <- Valid JSON string from LLM
         |
         v
  json.loads()                  <- Converts string to Python dict
         |
         v
  parsed = {"machine_id": "P101", "severity": "high", ...}
           |
           +-- We can read it, but nothing enforces the schema
           +-- Missing fields slip through silently
           +-- Wrong types (string vs int) go unnoticed
```

**More error scenarios the LLM can produce:**

```python
# Scenario 1: Malformed JSON (unclosed bracket)
malformed = '{"machine_id": "P101", "severity": "high"'
try:
    json.loads(malformed)
except json.JSONDecodeError as e:
    print(f"Malformed JSON: {e}")

# Scenario 2: Correct JSON, wrong types
wrong_types = '{"machine_id": 101, "severity": true, "action": ["inspect"]}'
parsed = json.loads(wrong_types)  # No error! But machine_id should be str
print(type(parsed["machine_id"]))  # <class 'int'> -- silent bug

# Scenario 3: Extra fields that break downstream code
extra_fields = '{"machine_id": "P101", "notes": "test", "extra": true}'
parsed = json.loads(extra_fields)
# If your code expects exactly 3 keys, this breaks things
```

**What's happening:**
```
  Error Type          Example               Why It Matters
  ==========          =======               ==============
  Malformed JSON      '{...}' (no closing)  Crash at parse time
  Wrong types         machine_id: 101       Silent type mismatch
  Missing fields      no "action" key       KeyError at access time
  Extra fields        "notes": "test"       Unpredictable downstream
  Invalid enum        "severity": "mega"    Business logic breaks
```

Pydantic models provide runtime validation that catches these issues. The key insight is that validation errors contain enough information to tell the LLM exactly what went wrong.

### 2. Pydantic Validation of LLM Output

Define a Pydantic model for the expected output shape, then validate every LLM response against it:

```python
from pydantic import BaseModel, ValidationError, Field
from enum import Enum

# Define exactly what words are allowed for severity
class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

# Define our strict data shape
class DiagnosticResult(BaseModel):
    machine_id: str = Field(min_length=1)
    severity: Severity
    action: str = Field(min_length=10)
    estimated_downtime_hours: float = Field(ge=0)

try:
    result = DiagnosticResult(
        machine_id="P101",
        severity="high",
        action="inspect bearings",
        estimated_downtime_hours=4.0
    )
    print(result.model_dump())
except ValidationError as e:
    for error in e.errors():
        field_name = '.'.join(str(x) for x in error['loc'])
        error_message = error['msg']
        print(f"Field '{field_name}': {error_message}")
```

**What's happening:**
```
  DiagnosticResult model
  ======================
  Field                         Constraint
  =======                       ==========
  machine_id: str               min_length=1   (non-empty string)
  severity: Severity            enum only       (low/medium/high/critical)
  action: str                   min_length=10  (at least 10 chars)
  estimated_downtime_hours: float  ge=0         (zero or positive)

  LLM Output -> model_validate_json() -> ValidationError or Result
                      |                        |
                      v                        v
              Catches wrong types         Returns clean dict
              Catches missing fields      Ready for your pipeline
              Catches invalid enums       Guaranteed valid data
```

**Model Variations for Different Use Cases:**

```python
from pydantic import BaseModel, Field
from typing import Optional, List

# Variation 1: Nested models for complex factory data
class SensorReading(BaseModel):
    sensor_id: str = Field(min_length=1)
    value: float
    unit: str = Field(pattern=r"^(psi|°C|rpm|bars)$")
    timestamp: str = Field(min_length=1)

class FactoryReport(BaseModel):
    machine_id: str
    readings: List[SensorReading]  # At least one reading required
    overall_status: str = Field(pattern=r"^(ok|warning|critical)$")

# Variation 2: Optional fields with defaults
class MaintenanceTask(BaseModel):
    machine_id: str
    task: str
    priority: int = Field(ge=1, le=5, default=3)  # Default priority 3
    technician: Optional[str] = None  # Can be None if not assigned
    estimated_hours: float = Field(gt=0)  # Must be positive

# Variation 3: Strict string constraints
class PumpDiagnostic(BaseModel):
    pump_id: str = Field(pattern=r"^P\d{3}$")     # P101, P203, etc.
    status: str = Field(min_length=3, max_length=20)
    failure_mode: str = Field(min_length=5)
    recommended_action: str = Field(min_length=10, max_length=200)
```

Pydantic catches wrong types, missing fields, invalid enum values, and constraint violations. Each error includes the field path and a human-readable message — exactly what you need to send back to the LLM.

**Comparison of Validation Approaches:**

| Approach | Error Detection | Error Messages | Self-Correction Ready | Boilerplate |
|----------|----------------|----------------|----------------------|-------------|
| Manual `if/else` checks | Custom only | Must write each | No | High |
| `json.loads()` | Parse errors only | Cryptic | No | Low |
| Pydantic BaseModel | All field errors | Detailed per-field | Yes | Low |
| Pydantic + Enum | Type + value errors | Exact invalid values | Yes | Medium |
| Pydantic + constraints | Type + range errors | With limits shown | Yes | Medium |

### 3. The Self-Correction Loop

The loop calls the LLM, validates the output, and if invalid, constructs an error message that includes the original prompt and the specific validation errors:

```
  Self-Correction Flow
  ====================

  +----------+
  |  START   |
  +----+-----+
       |
       v
  +----+-----+     +-----------+
  | attempt  |---->| call LLM  |
  | < max ?  |     +-----+-----+
  +----+-----+           |
       | No              v
       |          +------+------+
       |          |  Validate   |
       |          |  with       |
       |          |  Pydantic   |
       |          +------+------+
       |                 |
       |          +------+------+        +-----------+
       |          |   Valid?    |---Yes--->|  RETURN   |
       |          +------+------+        |  result   |
       |                 | No            +-----------+
       |                 v
       |          +------+------+
       |          | Append error|
       |          | to prompt   |
       |          +------+------+
       |                 |
       +<----------------+
       |
       v
  +----+-----+
  |  FAIL    |
  |  return  |
  |  None    |
  +----------+
```

```python
from pydantic import BaseModel, ValidationError

class MaintenancePlan(BaseModel):
    machine_id: str
    task: str
    priority: int
    estimated_hours: float

# Dummy function representing an LLM call returning bad data
def call_llm(prompt):
    return '{"machine_id": "P101", "task": "Replace seals", "priority": "high", "estimated_hours": "4"}'

def self_correcting_extract(prompt, model_class, max_retries=3):
    errors = []
    
    # We will try a maximum of 'max_retries' times
    for attempt in range(max_retries):
        raw_output = call_llm(prompt)

        try:
            # Try to validate the JSON string into our Pydantic model
            result = model_class.model_validate_json(raw_output)
            
            # If it succeeds, return the result immediately
            return {"result": result, "attempts": attempt + 1, "errors": []}
            
        except ValidationError as e:
            # 1. Format the errors nicely
            error_messages = [f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}" for err in e.errors()]
            errors.extend(error_messages)
            
            # 2. Append the errors to the prompt for the next try
            prompt = prompt + "\n\nYour previous output had errors:\n"
            for msg in error_messages:
                prompt += f"- {msg}\n"
            prompt += "\nPlease fix these errors and output valid JSON only."

    # If we run out of tries, return failure
    return {"result": None, "attempts": max_retries, "errors": errors}

output = self_correcting_extract(
    "Extract maintenance plan from: Replace seals on pump P101, high priority, 4 hours",
    MaintenancePlan
)
print(f"Attempts: {output['attempts']}")
print(f"Errors: {output['errors']}")
```

**What's happening:**
```
  Attempt 1: LLM returns {"priority": "high"}  (string, not int)
             |
             v
  ValidationError: priority: Input should be a valid integer
             |
             v
  Prompt becomes: "Extract maintenance plan from: ...\n
                    Your previous output had errors:\n
                    - priority: Input should be a valid integer\n
                    Please fix these errors and output valid JSON only."
             |
             v
  Attempt 2: LLM returns {"priority": 2}  (fixed!)
             |
             v
  Validation passes -> return result
```

The first attempt fails because `priority` is "high" (a string, not an int). `estimated_hours` is "4" (a string), but Pydantic's default lax mode coerces numeric strings to float, so it passes. The error message is appended to the prompt, giving the LLM explicit feedback to fix. (The dummy `call_llm` ignores the prompt and returns the same JSON every time, so running this code as-is prints `Attempts: 3` with the same `priority` error three times; a real LLM is what makes attempt 2 succeed.)

### 4. Logging Correction Attempts

Track every correction attempt for debugging and prompt engineering:

```python
import json
from datetime import datetime

correction_log = []

def log_correction(session_id, attempt, prompt_sent, raw_output, errors):
    # Save a record of exactly what happened
    correction_log.append({
        "session_id": session_id,
        "timestamp": datetime.now().isoformat(),
        "attempt": attempt,
        "prompt_length": len(prompt_sent),
        "raw_output": raw_output,
        "errors": errors
    })

def self_correcting_extract_logged(prompt, model_class, session_id, max_retries=3):
    errors = []
    for attempt in range(1, max_retries + 1):
        raw_output = call_llm(prompt)
        try:
            result = model_class.model_validate_json(raw_output)
            # Log success
            log_correction(session_id, attempt, prompt, raw_output, [])
            return {"result": result, "attempts": attempt, "errors": []}
        except ValidationError as e:
            error_messages = [f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}" for err in e.errors()]
            errors.extend(error_messages)
            # Log the failure
            log_correction(session_id, attempt, prompt, raw_output, error_messages)
            
            # Update prompt for next try
            prompt += "\n\nFix these errors:\n" + "\n".join(f"- {m}" for m in error_messages)

    return {"result": None, "attempts": max_retries, "errors": errors}

output = self_correcting_extract_logged("Fix this: wrong data", MaintenancePlan, "sess_001")
for entry in correction_log:
    print(f"Attempt {entry['attempt']}: {len(entry['errors'])} errors")
```

**What's happening:**
```
  correction_log after 3 attempts (with a real LLM; the dummy call_llm
  above returns the same JSON every time, so it logs 3 identical
  priority errors and never succeeds):
  =================================

  Attempt 1: 1 error
    - priority: Input should be a valid integer
    (estimated_hours "4" is coerced to 4.0 in lax mode - no error)

  Attempt 2: 1 error
    - estimated_hours: Input should be a valid number, unable to parse string as a number

  Attempt 3: 0 errors (SUCCESS!)
```

Correction logs reveal common failure patterns. If the same field fails across many sessions, your prompt needs better instructions for that field. If errors decrease after the first attempt, your correction prompt is effective.

**When to investigate your prompt:**
```
  Symptom                         Likely Fix
  =======                         ==========
  Same field fails every time     Add explicit format instruction
  High retry count (>2)           Initial prompt is too vague
  Type mismatches common          Specify JSON schema in prompt
```

### 5. Handling Non-Retriable Errors

Some errors should not be retried — invalid input, authentication failures, or model refusals. Distinguish these from validation errors that can be fixed:

```python
from pydantic import BaseModel, ValidationError

class AgentOutput(BaseModel):
    response: str
    confidence: float

def classify_error(error):
    # Get a list of all error types Pydantic gave us
    error_types = [err["type"] for err in error.errors()]
    
    # Define which ones the AI might be able to fix
    retriable = {"missing", "string_type", "int_parsing", "float_parsing"}
    # Define which ones mean the input data is fundamentally flawed
    non_retriable = {"value_error", "enum"}
    
    # If any error is non-retriable, return False
    if any(t in non_retriable for t in error_types):
        return False
    return True

def smart_self_correction(prompt, model_class, max_retries=3):
    for attempt in range(max_retries):
        raw_output = call_llm(prompt)
        try:
            return model_class.model_validate_json(raw_output)
        except ValidationError as e:
            # Check if we should even bother retrying
            if not classify_error(e) or attempt == max_retries - 1:
                raise ValueError(f"Non-retriable or exhausted: {e}")
                
            prompt += f"\n\nFix errors: {[err['msg'] for err in e.errors()]}"
    return None
```

**Error Taxonomy Table:**

| Error Type | Retriable? | Reason | Example |
|-----------|-----------|--------|---------|
| `missing` | Yes | LLM forgot a field, can be reminded | Missing `action` key |
| `string_type` | Yes | LLM put non-string where a string is expected | `"machine_id": 101` |
| `int_parsing` | Yes | LLM put string that cannot parse as int | `"priority": "high"` |
| `float_parsing` | Yes | LLM put string that cannot parse as float | `"hours": "four"` |
| `list_type` | Yes | LLM put string instead of array | `"readings": "P101"` |
| `value_error` | No | Custom validator raised `ValueError` | Business rule failed |
| `enum` | No | Value not in allowed set | `"status": "broken"` |
| `assertion_error` | No | Custom constraint failed | Hours > 1000 (unrealistic) |
| `url_parsing` | No | LLM hallucinated invalid URL | `"url": "not-a-url"` |

Non-retriable errors raise immediately instead of wasting API calls. The classification function checks the error type — some issues like invalid enum values indicate a fundamental misunderstanding in the prompt, not a formatting mistake.

### Common Mistakes and How to Fix Them

**Mistake 1: Forgetting to reset the prompt between retries**

```python
# WRONG: Prompt grows without bound
def bad_self_correction(prompt, model_class, max_retries=3):
    for _ in range(max_retries):
        raw_output = call_llm(prompt)
        try:
            return model_class.model_validate_json(raw_output)
        except ValidationError as e:
            prompt += f"\nFix: {e.errors()}"  # Prompt gets LONGER each time
    return None

# RIGHT: Track errors separately, append cleanly
def good_self_correction(prompt, model_class, max_retries=3):
    for attempt in range(max_retries):
        raw_output = call_llm(prompt)
        try:
            return model_class.model_validate_json(raw_output)
        except ValidationError as e:
            # Clean error message, not raw Pydantic dump
            clean_errors = "\n".join(
                f"- {err['loc']}: {err['msg']}" for err in e.errors()
            )
            prompt += f"\n\nAttempt {attempt + 1} errors:\n{clean_errors}"
    return None
```

**Mistake 2: Not setting a retry limit**

```python
# WRONG: Infinite loop if LLM keeps failing
while True:
    result = call_llm(prompt)
    if valid(result):
        break
    # What if the LLM NEVER returns valid JSON?

# RIGHT: Always set a maximum
MAX_RETRIES = 5
for attempt in range(MAX_RETRIES):
    result = call_llm(prompt)
    if valid(result):
        break
else:
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts")
```

**Mistake 3: Returning raw Pydantic error messages to the LLM**

```python
# WRONG: Pydantic errors are too technical for the LLM
error = "priority: Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='high', input_type=str]"

# RIGHT: Simplify for the LLM
clean_message = "The 'priority' field must be a number (1-5), not a word like 'high'. Use 5 for high priority."
```

### Quick Reference

| Concept | Code | Notes |
|---------|------|-------|
| Define model | `class MyModel(BaseModel):` | Fields become validation rules |
| Validate input | `MyModel.model_validate_json(raw)` | Returns model or raises ValidationError |
| Catch errors | `except ValidationError as e:` | `e.errors()` gives list of dicts |
| Error location | `err['loc']` | Tuple like `('priority',)` |
| Error message | `err['msg']` | Human-readable description |
| Error type | `err['type']` | Machine-readable category |
| String constraint | `Field(min_length=5)` | Minimum characters |
| Number constraint | `Field(ge=0, le=100)` | Greater/equal, less/equal |
| Pattern match | `Field(pattern=r"^[A-Z]\d{3}$")` | Regex for format |
| Enum field | `field: MyEnum` | Only allowed values |
| Retry loop | `for attempt in range(max_retries):` | Always set a limit |
| Append error | `prompt += f"\nFix: {errors}"` | Send back to LLM |
| Log attempt | `correction_log.append({...})` | Track for debugging |

### Summary

Self-correction loops catch LLM output errors using Pydantic validation and feed the errors back to the LLM for automatic fixing. Log every attempt to identify prompt engineering improvements. Set retry limits to prevent infinite loops, and classify errors to avoid retrying non-recoverable failures. This pattern turns fragile LLM output into reliable structured data.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Self-Correction Loops**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter8 self correction loops**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

