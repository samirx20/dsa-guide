# Part 7, Topic 2: Physics-First Rule Engines
## Chapter 1: Middleware Interceptors

**Prerequisite Knowledge:** Python functions, basic Type Hinting (Part 0), and an understanding of what an AI "command" looks like (usually a dictionary).

---

## 1. Why Middleware Interceptors?

An LLM can generate a command that looks correct but is physically dangerous (e.g., setting an oven to 50,000 degrees, spinning a motor backward, or opening a pressure valve while the system is running). You cannot trust the AI to know the physics of your factory floor.

The **middleware interceptor pattern** sandwiches the AI between validation layers, creating a "trust boundary" so the AI cannot directly break the system.

```
┌─────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARY                          │
│                                                             │
│  ┌──────────┐    ┌────────────┐    ┌──────────┐            │
│  │  LLM     │───▶│ PRE-CHECK  │───▶│ EXECUTE  │            │
│  │ (Untrust)│    │ (Validate) │    │ (Action) │            │
│  └──────────┘    └────────────┘    └──────────┘            │
│       │               │                 │                   │
│       │          REJECT if bad          │                   │
│       │                                 ▼                   │
│       │                          ┌──────────┐              │
│       │                          │POST-CHECK│              │
│       │                          │(Verify)  │              │
│       │                          └──────────┘              │
│       │                                │                    │
│       │                           REJECT if drift          │
│       ▼                                ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │              REAL WORLD (Motors, Valves)      │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### The Three-Step Pattern

1. **Pre-check:** Checks the AI's request *before* we execute it.
2. **Execute:** The actual action happens.
3. **Post-check:** Verifies the result was safe *after* execution.

This creates a firewall between the AI's imagination and the physical world.

---

## 2. The Sandwich Pattern (Simple Wrapper)

Before we look at advanced Python features, let's look at the concept using a standard function. We create a "wrapper" function that acts as a bouncer for our real action.

```python
# 1. The actual dangerous action we want to protect
def real_execute_command(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

# 2. The "Bouncer" (Interceptor)
def safe_execute_wrapper(command: dict) -> dict:
    # --- PRE-CHECK ---
    print(f"Checking if command is safe...")
    if "action" not in command:
        return {"status": "rejected", "reason": "Missing 'action'"}
    
    # --- EXECUTE ---
    # We only run the real function if the pre-check passes
    print(f"Command is safe. Executing...")
    result = real_execute_command(command)

    # --- POST-CHECK ---
    print(f"Checking if result was successful...")
    if result.get("status") == "error":
        return {"status": "rejected", "reason": "Execution failed inside."}

    return result

# 3. Running it
good_command = {"action": "set_temperature", "value": 180}
print(safe_execute_wrapper(good_command))
```

**What's happening:**
- **Line 2-3:** `real_execute_command` is the dangerous action we want to protect. It assumes the command is valid.
- **Line 6:** `safe_execute_wrapper` receives the raw AI command.
- **Line 7-10:** Pre-check validates the command structure. If `action` is missing, we reject immediately—no side effects occur.
- **Line 12-15:** Only if pre-check passes do we call the real function.
- **Line 17-20:** Post-check verifies the result. If execution returned an error, we intercept and reject.
- **Line 25-26:** We call the wrapper, not the real function directly.

**Output:**
```
Checking if command is safe...
Command is safe. Executing...
Checking if result was successful...
{'status': 'ok', 'executed': 'set_temperature'}
```

### Common Mistake: Forgetting the Post-Check

```python
# BAD: Only pre-checking, no post-check
def incomplete_wrapper(command: dict) -> dict:
    if "action" not in command:
        return {"status": "rejected", "reason": "Missing 'action'"}
    # BUG: No post-check! If the action fails silently, we pass it through
    return real_execute_command(command)
```

**What's happening:**
- The pre-check catches missing fields, but if `real_execute_command` returns `{"status": "error", "reason": "motor seized"}`, we pass that error through as if it succeeded. Always verify the result.

### Edge Case: The Command Passes Pre-Check but Breaks During Execution

```python
def execute_with_try(command: dict) -> dict:
    # --- PRE-CHECK ---
    if "action" not in command:
        return {"status": "rejected", "reason": "Missing 'action'"}
    
    # --- EXECUTE (with error handling) ---
    try:
        result = real_execute_command(command)
    except Exception as e:
        return {"status": "error", "reason": f"Execution crashed: {e}"}
    
    # --- POST-CHECK ---
    if result.get("status") == "error":
        return {"status": "rejected", "reason": "Execution failed."}
    
    return result
```

**What's happening:**
- **Line 7-10:** Wrapping execution in `try/except` catches crashes that the post-check alone would miss.
- **Line 9-10:** The `except` block converts a Python exception into a clean rejection dict instead of letting the error propagate up to the AI.

---

## 3. The Sandwich Pattern (Using Decorators)

Python provides a cleaner way to do this called a **Decorator**. A decorator allows us to "wrap" our interceptor around a function automatically using the `@` symbol. It does the exact same thing as our wrapper above, but looks cleaner.

```python
from typing import Callable

# This is a factory that creates our wrapper
def action_interceptor(func_to_wrap: Callable) -> Callable:
    # This is the actual wrapper logic (just like 'safe_execute_wrapper' above)
    def wrapper(command: dict) -> dict:
        if "action" not in command:
            return {"status": "rejected", "reason": "Missing 'action'"}
            
        result = func_to_wrap(command) # Run the wrapped function
        
        if result.get("status") == "error":
            return {"status": "rejected", "reason": "Execution failed."}
            
        return result
    return wrapper

# By adding @action_interceptor, Python automatically passes this function
# into the wrapper above!
@action_interceptor
def execute_command(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"], "target": command.get("target")}

good_command = {"action": "set_temperature", "target": "oven-1", "value": 180}
print(execute_command(good_command))
```

**What's happening:**
- **Line 4:** `action_interceptor` is a decorator factory. It takes a function and returns a new function.
- **Line 6:** `wrapper` is the new function that replaces the original. It receives the same arguments.
- **Line 7-8:** Pre-check: reject if no `action` key.
- **Line 10:** `func_to_wrap(command)` calls the original function only if pre-check passes.
- **Line 12-13:** Post-check: reject if execution returned an error.
- **Line 20-21:** The `@action_interceptor` syntax tells Python: "Pass `execute_command` into `action_interceptor`, and replace the original with the returned `wrapper`."

**Output:**
```
{'status': 'ok', 'executed': 'set_temperature', 'target': 'oven-1'}
```

The AI never talks to the real world directly. Every action passes through the interceptor.

### Decorator vs Wrapper: Comparison

| Aspect | Simple Wrapper | Decorator |
|--------|---------------|-----------|
| Syntax | `safe_execute_wrapper(command)` | `@decorator` then `func(command)` |
| Readability | Explicit call | Implicit wrapping |
| Reusability | Copy-paste needed | Apply to any function |
| Nesting | Manual chaining | Stack multiple `@` |
| Best for | Quick prototyping | Production systems |

### Common Mistake: Forgetting to Return the Wrapper

```python
# BAD: Missing return statement
def broken_interceptor(func_to_wrap: Callable) -> Callable:
    def wrapper(command: dict) -> dict:
        if "action" not in command:
            return {"status": "rejected", "reason": "Missing 'action'"}
        result = func_to_wrap(command)
        return result
    # BUG: Forgot to return wrapper! Now execute_command becomes None
    # This causes: 'NoneType' object is not callable
```

**What's happening:**
- Without `return wrapper`, the decorator returns `None`. When Python evaluates `@broken_interceptor`, it replaces `execute_command` with `None`. Calling `execute_command(...)` then crashes with `TypeError: 'NoneType' object is not callable`.

---

## 4. Pre-Execution Checks

Pre-checks validate the command structure and content before any side effects occur. Think of this as the factory gatekeeper—no malformed package enters the assembly line.

```python
from pydantic import BaseModel, Field, ValidationError

class MotorCommand(BaseModel):
    action: str
    motor_id: str = Field(min_length=1)
    speed_rpm: float = Field(ge=0, le=3600)

def pre_validate(command: dict) -> tuple[bool, str]:
    try:
        MotorCommand.model_validate(command)
        return True, "Valid"
    except ValidationError as e:
        return False, str(e)

commands = [
    {"action": "start", "motor_id": "M-01", "speed_rpm": 1200},
    {"action": "start", "motor_id": "M-01", "speed_rpm": 9999},
    {"action": "start", "motor_id": "", "speed_rpm": 500},
]

for cmd in commands:
    ok, msg = pre_validate(cmd)
    print(f"Command {cmd['action']}({cmd.get('speed_rpm', '?')}): {'PASS' if ok else 'FAIL'}")
```

**What's happening:**
- **Line 3-6:** `MotorCommand` is a Pydantic model that enforces constraints: `motor_id` must be non-empty, `speed_rpm` must be between 0 and 3600.
- **Line 8-13:** `pre_validate` tries to parse the raw dict into the model. If validation fails, it returns `False` with the error message.
- **Line 15-19:** We test three commands: one valid, one with excessive speed, one with empty ID.
- **Line 21-23:** Each command is validated and the result printed.

**Output:**
```
Command start(1200): PASS
Command start(9999): FAIL
Command start(500): FAIL
```

### Pre-Check Data Flow

```
Raw AI Command ──▶ Pre-Validate ──▶ Pydantic Model ──▶ Pass/Fail
                      │
                      ├─ Missing fields? ──▶ REJECT
                      ├─ Type mismatch? ──▶ REJECT
                      ├─ Value out of range? ──▶ REJECT
                      └─ Valid? ──▶ Continue to Execute
```

### Edge Case: Command with Extra Fields

```python
# Pydantic by default ignores extra fields (extra="ignore")
loose_command = {"action": "start", "motor_id": "M-01", "speed_rpm": 1200, "extra": "ignored"}
ok, msg = pre_validate(loose_command)
print(f"Extra fields command: {'PASS' if ok else 'FAIL'}")  # PASS

# To REJECT extra fields, use model_config:
from pydantic import ConfigDict

class StrictMotorCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    motor_id: str = Field(min_length=1)
    speed_rpm: float = Field(ge=0, le=3600)
```

**What's happening:**
- **Line 1-4:** By default, Pydantic ignores unknown fields. This is usually fine, but in safety-critical systems, extra fields might indicate a compromised command.
- **Line 9-10:** Setting `extra="forbid"` makes the model reject any field not defined in the schema.

### Common Mistake: Not Handling Validation Errors Gracefully

```python
# BAD: Letting ValidationError propagate
def pre_validate_crash(command: dict) -> bool:
    MotorCommand.model_validate(command)  # Throws ValidationError if invalid!
    return True

# GOOD: Catching and returning a clean result
def pre_validate_safe(command: dict) -> tuple[bool, str]:
    try:
        MotorCommand.model_validate(command)
        return True, "Valid"
    except ValidationError as e:
        return False, str(e)
```

**What's happening:**
- **Line 3:** If the command is invalid, `ValidationError` is raised. If this bubbles up uncaught, the AI might see a Python stack trace instead of a clean rejection.
- **Line 8-12:** The safe version catches the error and returns a structured result.

---

## 5. Post-Execution Sanity Checks

After the AI command executes, verify the result is consistent with what was requested. This catches cases where the system "accepted" the command but the physical outcome drifted.

```python
def post_sanity_check(command: dict, result: dict) -> dict:
    if result.get("status") != "ok":
        return result

    if command["action"] == "set_temperature":
        target_temp = command.get("value", 0)
        actual_temp = result.get("actual_temperature", target_temp)
        if abs(target_temp - actual_temp) > 5:
            return {
                "status": "rejected",
                "reason": f"Temperature drift: requested {target_temp}, got {actual_temp}"
            }

    return result

command = {"action": "set_temperature", "value": 200}
result = {"status": "ok", "actual_temperature": 195}
checked = post_sanity_check(command, result)
print(checked)

result_bad = {"status": "ok", "actual_temperature": 150}
checked_bad = post_sanity_check(command, result_bad)
print(checked_bad)
```

**What's happening:**
- **Line 2-3:** Only check successful results. If the command already failed, pass it through.
- **Line 6-7:** Extract target and actual values from the command and result.
- **Line 8-12:** If the temperature drift exceeds 5 degrees, reject. This catches sensor failures, calibration issues, or sluggish heating elements.
- **Line 16-23:** Result with 195° (5° drift) passes. Result with 150° (50° drift) fails.

**Output:**
```
{'status': 'ok', 'actual_temperature': 195}
{'status': 'rejected', 'reason': 'Temperature drift: requested 200, got 150'}
```

### Post-Check Data Flow

```
Command + Result ──▶ Post-Sanity-Check ──▶ Pass/Reject
                         │
                         ├─ Drift too large? ──▶ REJECT
                         ├─ Missing expected field? ──▶ REJECT
                         ├─ Status already error? ──▶ Pass through
                         └─ Consistent? ──▶ Return result
```

### Edge Case: Missing Result Fields

```python
def post_sanity_check_robust(command: dict, result: dict) -> dict:
    if result.get("status") != "ok":
        return result

    if command["action"] == "set_temperature":
        target_temp = command.get("value", 0)
        actual_temp = result.get("actual_temperature")
        
        # If the system didn't report actual_temperature, we can't verify
        if actual_temp is None:
            return {
                "status": "warning",
                "reason": "Cannot verify temperature: no actual_temperature in result"
            }
        
        if abs(target_temp - actual_temp) > 5:
            return {
                "status": "rejected",
                "reason": f"Temperature drift: requested {target_temp}, got {actual_temp}"
            }

    return result
```

**What's happening:**
- **Line 9-14:** If `actual_temperature` is missing from the result, we return a warning instead of silently passing. This catches cases where the sensor reporting fails.

---

## 6. Composing Multiple Interceptors

Stack multiple interceptors for layered defense. Each layer checks one concern. Think of this as the factory's multi-stage inspection line—each station checks a different aspect of the product.

```python
from typing import Any, Callable

def log_interceptor(func: Callable) -> Callable:
    def wrapper(command: dict) -> dict:
        print(f"[LOG] {command.get('action', '?')} at {command.get('timestamp', '?')}")
        return func(command)
    return wrapper

def safety_interceptor(func: Callable) -> Callable:
    def wrapper(command: dict) -> dict:
        if command.get("action") == "emergency_stop":
            return func(command)
        if command.get("value", 0) > 500:
            return {"status": "rejected", "reason": "Value exceeds safety limit"}
        return func(command)
    return wrapper

@safety_interceptor
@log_interceptor
def execute(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

cmd1 = {"action": "set_power", "value": 100, "timestamp": "2025-01-15T10:00:00Z"}
print(execute(cmd1))

cmd2 = {"action": "set_power", "value": 999, "timestamp": "2025-01-15T10:00:00Z"}
print(execute(cmd2))

cmd3 = {"action": "emergency_stop", "timestamp": "2025-01-15T10:00:00Z"}
print(execute(cmd3))
```

**What's happening:**
- **Line 3-7:** `log_interceptor` logs the action before execution. It always passes the command through.
- **Line 9-16:** `safety_interceptor` checks if the value exceeds 500. Emergency stops bypass this check.
- **Line 18-19:** `@log_interceptor` is applied first (inner), `@safety_interceptor` second (outer). Python applies decorators bottom-up, so at call time the outer `safety_interceptor` runs first.
- **Line 23-24:** `cmd1` (value=100): passes both checks.
- **Line 26-27:** `cmd2` (value=999): safety interceptor rejects it.
- **Line 29-30:** `cmd3` (emergency_stop): bypasses value limit.

**Output:**
```
[LOG] set_power at 2025-01-15T10:00:00Z
{'status': 'ok', 'executed': 'set_power'}
{'status': 'rejected', 'reason': 'Value exceeds safety limit'}
[LOG] emergency_stop at 2025-01-15T10:00:00Z
{'status': 'ok', 'executed': 'emergency_stop'}
```

Emergency stops bypass the value limit. Normal commands are checked. Every command is logged.

### Decorator Execution Order

```
@safety_interceptor    ← Applied SECOND (outermost)
@log_interceptor       ← Applied FIRST (innermost)
def execute(command):
    ...

Call execute(cmd)
  ──▶ safety_interceptor.wrapper(cmd)   ← Runs first
       ──▶ log_interceptor.wrapper(cmd) ← Runs second
            ──▶ execute(cmd)            ← Runs last
```

### Common Mistake: Wrong Decorator Order

```python
# If you reverse the order:
@log_interceptor
@safety_interceptor
def execute(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

# Now log runs FIRST, then safety check runs.
# This means rejected commands still get logged (which might be fine),
# but the log doesn't show the rejection reason.
```

**What's happening:**
- With reversed order, `log_interceptor` runs before `safety_interceptor`. The log captures the command but not whether it was rejected. For debugging, you typically want logging outermost so it captures everything including rejections.

### Edge Case: Interceptor with State

```python
class AuditTrail:
    def __init__(self):
        self.history = []
    
    def intercept(self, func: Callable) -> Callable:
        def wrapper(command: dict) -> dict:
            self.history.append({
                "action": command.get("action"),
                "timestamp": command.get("timestamp"),
                "status": "pending"
            })
            result = func(command)
            self.history[-1]["status"] = result.get("status", "unknown")
            return result
        return wrapper

audit = AuditTrail()
@audit.intercept
def execute(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

execute({"action": "start", "timestamp": "2025-01-15T10:00:00Z"})
execute({"action": "stop", "timestamp": "2025-01-15T10:01:00Z"})
print(audit.history)
```

**What's happening:**
- **Line 5-11:** The interceptor is now an instance method. It stores command history in `self.history`.
- **Line 12-13:** After execution, the history entry is updated with the actual status.
- **Line 22-23:** Each call appends to the audit trail.

**Output:**
```
[{'action': 'start', 'timestamp': '2025-01-15T10:00:00Z', 'status': 'ok'}, {'action': 'stop', 'timestamp': '2025-01-15T10:01:00Z', 'status': 'ok'}]
```

---

## 7. The Trust Boundary

The interceptor pattern defines where trust ends. Everything inside the interceptor boundary is validated. Everything outside is AI-generated and untrusted.

```python
class TrustBoundary:
    def __init__(self):
        self.pre_checks = []
        self.post_checks = []

    def add_pre_check(self, check_func):
        self.pre_checks.append(check_func)
        return self

    def add_post_check(self, check_func):
        self.post_checks.append(check_func)
        return self

    def execute(self, command: dict) -> dict:
        for check in self.pre_checks:
            result = check(command)
            if result is not None:
                return result

        result = {"status": "ok", "executed": command.get("action")}

        for check in self.post_checks:
            result = check(command, result)
            if result.get("status") == "rejected":
                return result

        return result

boundary = TrustBoundary()
boundary.add_pre_check(lambda cmd: {"status": "rejected", "reason": "Missing action"} if "action" not in cmd else None)
boundary.add_post_check(lambda cmd, res: res if res.get("status") != "ok" else {"status": "rejected", "reason": "Post-check failed"} if cmd.get("value", 0) > 100 else res)

print(boundary.execute({"action": "set_temp", "value": 50}))
print(boundary.execute({"action": "set_temp", "value": 200}))
print(boundary.execute({"value": 50}))
```

**What's happening:**
- **Line 1-4:** `TrustBoundary` holds lists of pre-checks and post-checks.
- **Line 6-8:** `add_pre_check` appends a function. Returns `self` for chaining.
- **Line 10-12:** `add_post_check` same pattern.
- **Line 14-18:** Execute runs all pre-checks. If any returns non-None, that's a rejection.
- **Line 20:** Only if all pre-checks pass do we simulate execution.
- **Line 22-25:** Post-checks run in order. If any rejects, we stop and return the rejection.

**Output:**
```
{'status': 'ok', 'executed': 'set_temp'}
{'status': 'rejected', 'reason': 'Post-check failed'}
{'status': 'rejected', 'reason': 'Missing action'}
```

### Trust Boundary Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TrustBoundary                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Pre-Checks (chain of responsibility)                    │   │
│  │  ├─ check_1: structure validation                       │   │
│  │  ├─ check_2: permission check                           │   │
│  │  └─ check_3: rate limiting                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                    All pass? ──▶ Execute                       │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Post-Checks (chain of responsibility)                    │   │
│  │  ├─ check_1: result consistency                         │   │
│  │  └─ check_2: audit logging                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│              Any reject? ──▶ Return rejection                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Common Mistake: Pre-Check Returns Wrong Type

```python
# BAD: Pre-check returns True/False instead of None/rejection dict
def bad_pre_check(command: dict):
    if "action" not in command:
        return True  # Should be a rejection dict!
    return False     # Should be None for pass!

# GOOD: Pre-check returns None for pass, dict for rejection
def good_pre_check(command: dict):
    if "action" not in command:
        return {"status": "rejected", "reason": "Missing action"}
    return None  # None means "passed, continue"
```

**What's happening:**
- The `TrustBoundary.execute` checks `if result is not None` to decide if a pre-check rejected. If you return `True` for rejection, execution does stop, but `execute` returns the bare `True` instead of a rejection dict, so any caller doing `result.get("status")` crashes with `AttributeError`. If you return `False` for pass, it's treated as a rejection (which breaks everything).

---

## 8. Error Scenarios and Recovery

What happens when things go wrong? Let's look at common failure modes and how to handle them.

### Scenario 1: AI Sends Malformed JSON

```python
def safe_parse(command_str: str) -> dict:
    import json
    try:
        return json.loads(command_str)
    except json.JSONDecodeError as e:
        return {"status": "rejected", "reason": f"Invalid JSON: {e}"}

bad_input = '{"action": "start", "motor_id": "M-01"'  # Missing closing brace
print(safe_parse(bad_input))
```

**What's happening:**
- **Line 3-6:** `json.loads` throws `JSONDecodeError` for malformed input. We catch it and return a clean rejection.

**Output:**
```
{'status': 'rejected', 'reason': "Invalid JSON: Expecting ',' delimiter: line 1 column 39 (char 38)"}
```

### Scenario 2: Interceptor Chain Raises Exception

```python
def robust_execute(command: dict) -> dict:
    try:
        # Simulate a chain of interceptors
        result = pre_validate(command)
        if not result[0]:
            return {"status": "rejected", "reason": result[1]}
        
        # Simulate execution
        exec_result = {"status": "ok", "executed": command.get("action")}
        
        # Post-check
        checked = post_sanity_check(command, exec_result)
        return checked
    except Exception as e:
        # Catch-all: never let raw Python errors reach the AI
        return {"status": "error", "reason": f"Internal error: {type(e).__name__}"}

print(robust_execute({"action": "start", "motor_id": "M-01", "speed_rpm": 1200}))
print(robust_execute({"no_action": True}))
```

**What's happening:**
- **Line 2-16:** The entire interceptor chain is wrapped in `try/except`. If any interceptor crashes, we return a clean error instead of a Python traceback.

**Output:**
```
{'status': 'ok', 'executed': 'start'}
{'status': 'rejected', 'reason': "3 validation errors for MotorCommand\naction\n  Field required [type=missing, ...]"}
```

### Scenario 3: Timeout During Execution

```python
import time

def timeout_interceptor(func: Callable, timeout_seconds: float = 5.0) -> Callable:
    def wrapper(command: dict) -> dict:
        start = time.time()
        result = func(command)
        elapsed = time.time() - start
        if elapsed > timeout_seconds:
            return {
                "status": "rejected",
                "reason": f"Execution took {elapsed:.1f}s, exceeded {timeout_seconds}s limit"
            }
        return result
    return wrapper

@timeout_interceptor
def slow_execute(command: dict) -> dict:
    time.sleep(0.1)  # Simulate slow operation
    return {"status": "ok", "executed": command["action"]}

print(slow_execute({"action": "calibrate"}))
```

**What's happening:**
- **Line 4-13:** The wrapper times the execution. If it exceeds the limit, we reject.

**Output:**
```
{'status': 'ok', 'executed': 'calibrate'}
```

---

## 9. Comparison: Middleware Interceptor vs Other Patterns

| Pattern | Description | When to Use | Drawback |
|---------|-------------|-------------|----------|
| **Middleware Interceptor** | Pre/post validation around function calls | AI command validation, safety checks | Adds complexity to call chain |
| **Decorator** | Function wrapping with `@` syntax | Reusable validation, logging | Hard to debug when stacked |
| **Guard Clause** | Early return checks at function start | Simple single-function validation | Doesn't compose well |
| **Try/Except** | Exception handling around execution | Runtime error recovery | Hides bugs if overused |
| **Pydantic Model** | Schema validation on data | Data structure enforcement | Only validates structure, not behavior |

---

## 10. Production Patterns

### Pattern 1: Rate Limiting Interceptor

```python
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_calls: int = 10, window_seconds: float = 60.0):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.calls = defaultdict(list)
    
    def check(self, command: dict) -> dict | None:
        action = command.get("action", "unknown")
        now = time.time()
        
        # Remove old entries outside the window
        self.calls[action] = [t for t in self.calls[action] if now - t < self.window_seconds]
        
        if len(self.calls[action]) >= self.max_calls:
            return {
                "status": "rejected",
                "reason": f"Rate limit exceeded: {action} called {len(self.calls[action])} times in {self.window_seconds}s"
            }
        
        self.calls[action].append(now)
        return None  # Pass

limiter = RateLimiter(max_calls=3, window_seconds=1.0)
for i in range(5):
    result = limiter.check({"action": "pulse"})
    print(f"Call {i+1}: {'PASS' if result is None else 'REJECTED'}")
```

**What's happening:**
- **Line 8-15:** Tracks call timestamps per action. Removes entries older than the window.
- **Line 17-21:** If count exceeds the limit, returns a rejection.
- **Line 24:** Otherwise returns `None` (pass).

**Output:**
```
Call 1: PASS
Call 2: PASS
Call 3: PASS
Call 4: REJECTED
Call 5: REJECTED
```

### Pattern 2: Audit Logger

```python
import json
from datetime import datetime

def audit_interceptor(func: Callable, log_file: str = "audit.log") -> Callable:
    def wrapper(command: dict) -> dict:
        timestamp = datetime.now().isoformat()
        entry = {
            "timestamp": timestamp,
            "command": command,
            "status": "attempted"
        }
        
        result = func(command)
        entry["result"] = result
        entry["status"] = result.get("status", "unknown")
        
        with open(log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
        
        return result
    return wrapper
```

**What's happening:**
- **Line 6-11:** Creates an audit entry before execution.
- **Line 13-15:** Records the result after execution.
- **Line 17-18:** Appends the entry to a log file. This creates an immutable record of every command and its outcome.

---

## 11. Quick Reference

### Core Concepts

| Concept | Description | Key Point |
|---------|-------------|-----------|
| **Pre-check** | Validates command before execution | Must return `None` (pass) or rejection dict |
| **Execute** | Runs the actual action | Only called if pre-check passes |
| **Post-check** | Verifies result after execution | Catches drift, sensor failures |
| **Decorator** | `@` syntax for function wrapping | Apply bottom-up, read top-down |
| **Trust Boundary** | Separates AI from real world | No unvalidated command reaches execution |

### Decorator Syntax

```python
# Basic decorator
@my_decorator
def func(): ...

# With arguments
@decorator_with_args(arg1, arg2)
def func(): ...

# Stacked (applied bottom-up)
@outer
@inner
def func(): ...
```

### Pre-Check Contract

```python
def my_pre_check(command: dict) -> dict | None:
    if something_wrong:
        return {"status": "rejected", "reason": "..."}  # REJECT
    return None  # PASS
```

### Post-Check Contract

```python
def my_post_check(command: dict, result: dict) -> dict:
    if result.get("status") == "ok":
        if something_wrong:
            return {"status": "rejected", "reason": "..."}
    return result  # PASS (or pass through existing rejection)
```

### Error Handling Pattern

```python
def safe_execute(command: dict) -> dict:
    try:
        # Pre-check
        if "action" not in command:
            return {"status": "rejected", "reason": "Missing action"}
        
        # Execute
        result = real_execute(command)
        
        # Post-check
        if result.get("status") == "error":
            return {"status": "rejected", "reason": "Execution failed"}
        
        return result
    except Exception as e:
        return {"status": "error", "reason": f"Internal: {type(e).__name__}"}
```

### Checklist: Is Your Interceptor Complete?

- [ ] Pre-check validates structure and values
- [ ] Pre-check returns `None` for pass, dict for reject
- [ ] Post-check verifies result consistency
- [ ] Post-check handles missing result fields
- [ ] Exception handling prevents raw errors from reaching AI
- [ ] Decorator returns the wrapper (not `None`)
- [ ] Multiple interceptors are ordered correctly
- [ ] Audit trail captures all attempts

---

### Summary

The middleware interceptor pattern wraps AI-generated actions between pre-execution validation and post-execution sanity checks. Stack multiple interceptors for layered defense. The trust boundary ensures no unvalidated AI output ever reaches the real world. This architecture lets you contain the blast radius of incorrect LLM decisions.

**Key Takeaway:** Never let the AI talk directly to the real world. Every command passes through validation, execution, and verification—a three-stage firewall that catches what the AI gets wrong.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Swapped decorator order.** Using the chapter's `log_interceptor` and `safety_interceptor` in the *reversed* order from "Common Mistake: Wrong Decorator Order", write out everything printed:

```python
@log_interceptor
@safety_interceptor
def execute(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

print(execute({"action": "set_power", "value": 999, "timestamp": "2025-01-15T10:00:00Z"}))
print(execute({"action": "set_power", "value": 500}))
```

**Q2. TrustBoundary edge cases.** Using the chapter's `boundary` (one pre-check for a missing action, one post-check rejecting `value > 100`), what does each call return? Then: what does the last line print, using the chapter's `bad_pre_check`?

```python
print(boundary.execute({"action": "set_temp", "value": 100}))   # (a)
print(boundary.execute({"action": "set_temp"}))                 # (b)
print(boundary.execute({"value": 500}))                         # (c)

b2 = TrustBoundary().add_pre_check(bad_pre_check)
print(b2.execute({"action": "set_temp", "value": 50}))          # (d)
```

**Q3. Post-check table.** With `command = {"action": "set_temperature", "value": 200}`, fill in the return value of the chapter's (non-robust) `post_sanity_check` for each `result`:

| `result` | Returned |
|---|---|
| `{"status": "ok", "actual_temperature": 205}` | ? |
| `{"status": "ok", "actual_temperature": 194}` | ? |
| `{"status": "error", "reason": "heater offline"}` | ? |
| `{"status": "ok"}` | ? |

Which row would `post_sanity_check_robust` handle differently?

**Q4. Rate limiter trace.** With `limiter = RateLimiter(max_calls=2, window_seconds=1.0)`, the calls below happen back-to-back, then the program sleeps 1.1 s and makes one more call. What is printed for each, PASS or REJECTED?

```
check({"action": "pulse"})   # 1
check({"action": "pulse"})   # 2
check({"action": "stop"})    # 3
check({"action": "pulse"})   # 4
# time.sleep(1.1)
check({"action": "pulse"})   # 5
```

**Q5. Audit plus safety.** What is `[(h["action"], h["status"]) for h in audit.history]` after these two calls?

```python
audit = AuditTrail()

@audit.intercept
@safety_interceptor
def execute(command: dict) -> dict:
    return {"status": "ok", "executed": command["action"]}

execute({"action": "set_power", "value": 999})
execute({"action": "emergency_stop", "value": 9999})
```

### Coding Exercises

**E1 (Easy).** Write a *parameterized* decorator `range_interceptor(field: str, lo: float, hi: float)`. It rejects a command if `field` is missing (`"Missing '<field>'"`) or outside $[lo, hi]$ (`"<field>=<value> outside [lo, hi]"`), and otherwise calls the wrapped function. Keep the wrapped function's `__name__`.

- `start_motor({"action": "start", "speed_rpm": 4000})` with `@range_interceptor("speed_rpm", 0, 3600)` → `{'status': 'rejected', 'reason': 'speed_rpm=4000 outside [0, 3600]'}`
- `start_motor({"action": "start"})` → `{'status': 'rejected', 'reason': "Missing 'speed_rpm'"}`

**E2 (Easy–Medium).** Write `retry_interceptor(max_attempts: int)`. It calls the wrapped function up to `max_attempts` times and stops at the first result whose `status` is not `"error"`. A raised exception counts as `{"status": "error", "reason": "Internal: <ExceptionName>"}`. Return the final result with an extra key `"attempts"`.

- A function that returns `error`, then raises `ZeroDivisionError`, then returns `{"status": "ok", "executed": "home"}`, with `max_attempts=3` → `{'status': 'ok', 'executed': 'home', 'attempts': 3}`
- A function that always raises `TimeoutError`, with `max_attempts=2` → `{'status': 'error', 'reason': 'Internal: TimeoutError', 'attempts': 2}`

**E3 (Medium).** Write `MotorRateLimiter(max_calls, window_s)` whose `check(command, now: float) -> dict | None` limits calls **per (action, motor_id) pair** within a sliding window. Taking `now` as an argument makes it testable without sleeping. Use a `deque` so old timestamps are popped from the front.

- With `max_calls=2, window_s=1.0`, the calls `(t, motor)` = `(0.0, M-01), (0.2, M-01), (0.3, M-02), (0.5, M-01), (1.0, M-01), (1.1, M-01)` → `PASS, PASS, PASS, REJECTED, PASS, REJECTED`

#### Dry-Run: Answers

**Q1.**

```
[LOG] set_power at 2025-01-15T10:00:00Z
{'status': 'rejected', 'reason': 'Value exceeds safety limit'}
[LOG] set_power at ?
{'status': 'ok', 'executed': 'set_power'}
```

`log_interceptor` is now outermost, so it prints **before** the safety check runs, even for the rejected command. In the chapter's original order the `999` command produced no `[LOG]` line. The second call has no `timestamp`, so `.get` falls back to `'?'`. Also, `500 > 500` is False, so it passes.

**Q2.**

| Call | Pre-check | Post-check | Returned |
|---|---|---|---|
| (a) | has action, returns `None` | `100 > 100` is False | `{'status': 'ok', 'executed': 'set_temp'}` |
| (b) | passes | `cmd.get("value", 0)` = 0 | `{'status': 'ok', 'executed': 'set_temp'}` |
| (c) | no action, returns a dict | not reached | `{'status': 'rejected', 'reason': 'Missing action'}` |
| (d) | returns `False` | not reached | prints `False` |

(d) is the "wrong return type" bug: `False is not None` is True, so the boundary treats `False` as a rejection and returns it. A perfectly valid command is blocked, and the caller receives a bare `False` instead of a dict.

**Q3.**

| `result` | Returned | Why |
|---|---|---|
| actual 205 | `{'status': 'ok', 'actual_temperature': 205}` | $\lvert 200 - 205 \rvert = 5$, and $5 > 5$ is False |
| actual 194 | `{'status': 'rejected', 'reason': 'Temperature drift: requested 200, got 194'}` | $6 > 5$ |
| status error | `{'status': 'error', 'reason': 'heater offline'}` | non-ok results pass through untouched |
| `{"status": "ok"}` | `{'status': 'ok'}` | `actual` defaults to the target, so drift is 0 and it silently passes |

The last row is what `post_sanity_check_robust` handles differently. It returns `{'status': 'warning', 'reason': 'Cannot verify temperature: no actual_temperature in result'}` instead of passing silently.

**Q4.** `PASS, PASS, PASS, REJECTED, PASS`.

| # | action | timestamps for that action before the call | Result |
|---|---|---|---|
| 1 | pulse | `[]` | PASS |
| 2 | pulse | `[t1]` | PASS |
| 3 | stop | `[]` (separate key) | PASS |
| 4 | pulse | `[t1, t2]`, length 2 $\ge$ 2 | REJECTED (not appended) |
| 5 | pulse | t1 and t2 are now > 1.0 s old and filtered out, so `[]` | PASS |

**Q5.** `[('set_power', 'rejected'), ('emergency_stop', 'ok')]`. The audit wrapper is outermost, so it records *every* attempt, including the one the safety interceptor rejected (`999 > 500`). The emergency stop bypasses the value limit even at `9999`.

**E1 — reference solution**

```python
import functools
from typing import Callable

def range_interceptor(field: str, lo: float, hi: float) -> Callable:
    def decorator(func: Callable) -> Callable:          # the real decorator
        @functools.wraps(func)                          # keep __name__, __doc__
        def wrapper(command: dict) -> dict:
            value = command.get(field)
            if value is None:
                return {"status": "rejected", "reason": f"Missing '{field}'"}
            if not (lo <= value <= hi):
                return {"status": "rejected", "reason": f"{field}={value} outside [{lo}, {hi}]"}
            return func(command)
        return wrapper
    return decorator
```

There are three levels of functions because `@range_interceptor("speed_rpm", 0, 3600)` is first *called* with the arguments, and that call returns the actual decorator. $O(1)$ per command.

**E2 — reference solution**

```python
import functools
from typing import Callable

def retry_interceptor(max_attempts: int) -> Callable:
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(command: dict) -> dict:
            result: dict = {"status": "error", "reason": "never ran"}
            attempt = 0
            for attempt in range(1, max_attempts + 1):
                try:
                    result = func(command)
                except Exception as e:                   # an exception counts as a failed attempt
                    result = {"status": "error", "reason": f"Internal: {type(e).__name__}"}
                if result.get("status") != "error":
                    break
            return {**result, "attempts": attempt}
        return wrapper
    return decorator
```

At most `max_attempts` calls. `{**result, ...}` builds a new dict, so the wrapped function's return value is not mutated. A `"rejected"` result is *not* retried, because a safety rejection will not change on a retry.

**E3 — reference solution**

```python
from collections import defaultdict, deque

class MotorRateLimiter:
    def __init__(self, max_calls: int, window_s: float):
        self.max_calls = max_calls
        self.window_s = window_s
        self.calls: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def check(self, command: dict, now: float) -> dict | None:
        key = (command.get("action", "unknown"), command.get("motor_id", "?"))
        q = self.calls[key]
        while q and now - q[0] >= self.window_s:   # drop expired timestamps from the front
            q.popleft()
        if len(q) >= self.max_calls:
            return {"status": "rejected", "reason": f"Rate limit: {key[0]} on {key[1]}"}
        q.append(now)
        return None
```

Trace for `M-01`: $t=0$ gives `[0]`; $0.2$ gives `[0, 0.2]`; $0.5$ is rejected (length 2); at $1.0$, $1.0 - 0 \ge 1$ pops `0`, leaving `[0.2]`, then appends to give `[0.2, 1.0]` (PASS); at $1.1$, $1.1 - 0.2 = 0.9 < 1$, so it is rejected. `M-02` has its own queue. Amortized $O(1)$ per call, because each timestamp is pushed and popped at most once. The chapter's list comprehension is $O(n)$ per call.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Middleware Interceptors**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 middleware interceptors**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

