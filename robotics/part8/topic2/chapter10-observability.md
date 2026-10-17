# Part 8, Topic 2: System Integration
## Chapter 2: Observability

**Prerequisite Knowledge:** Basic understanding of functions, logging, and performance timing.

### The 'Dashboard Warning Lights' Analogy
Imagine driving a car with no dashboard. If the engine overheats or you run out of gas, you won't know until the car suddenly stops working on the highway. Observability is your car's dashboard. It gives you warning lights, speedometer readings, and fuel gauges so you can see exactly what is happening inside the engine before a breakdown occurs.

An agentic pipeline that silently fails is worse than no pipeline at all. When an LLM generates a bad tool call, a retriever returns irrelevant context, or a validator rejects a reading, you need structured logs to diagnose exactly what happened and why.

```
+-----------------------------------------------------------------------+
|                      FACTORY DASHBOARD PANEL                          |
+-----------------------------------------------------------------------+
|  ENGINE TEMP:  87C    |  OIL PRESSURE: 142 PSI |  VIBRATION: 4.2mm/s  |
|  [=====----] 68%      |  [=======---] 71%     |  [==------] 21%      |
|  FUEL LEVEL:  42%     |  ERROR CODE: NONE      |  STATUS: OK          |
|  [====------]         |                         |                      |
+-----------------------------------------------------------------------+
|  RECENT ALERTS:                                                       |
|  [08:00] HIGH_TEMP  Engine temp exceeded 85C threshold                |
+-----------------------------------------------------------------------+
```

### 1. Structured Logging with JSON

Standard `print()` statements are useless at scale. Structured JSON logs let you filter, aggregate, and alert on specific fields.

#### Why Not Just Use Print?

| Approach             | Can Filter by Field? | Searchable in Log Agg? |
|----------------------|----------------------|------------------------|
| `print("done")`     | No - raw text only   | No - grep only         |
| `print(dict)`       | Partial - parse str  | No - unstructured      |
| JSON log entry       | Yes - every field    | Yes - native query     |

#### Basic: Structured Logger

```python
import json
import time
from datetime import datetime, timezone
from typing import Any
from functools import wraps

class StructuredLogger:
    def __init__(self):
        self.logs: list[dict[str, Any]] = []

    def log(self, event: str, **kwargs):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            **kwargs
        }
        self.logs.append(entry)
        print(json.dumps(entry, default=str))
        return entry

    def get_logs(self, event_filter: str = "") -> list[dict]:
        if event_filter:
            return [l for l in self.logs if l["event"] == event_filter]
        return self.logs

logger = StructuredLogger()
```

**What's happening:**
```
Line  8:  self.logs = []          -> Internal list holds every log entry in memory
Line 11:  entry = {               -> Build a dict for this event
Line 12:    "timestamp": ...      -> UTC ISO-8601 timestamp for chronological sorting
Line 13:    "event": event        -> Event name acts as the primary key for filtering
Line 14:    **kwargs              -> Any extra keyword args become additional fields
Line 17:  self.logs.append(entry) -> Store entry in the in-memory log buffer
Line 18:  print(json.dumps(...))  -> Serialize to JSON string for stdout output
Line 23:  if event_filter:        -> When a filter is provided, narrow results
```

#### Edge Case: Log With Nested Data

```python
logger.log("tool_call",
    tool_name="get_machine_status",
    args={"serial": "PUMP-042"},
    result={"temp_c": 87.3, "pressure_psi": 142.1},
    duration_ms=52.3
)
```

**What's happening:**
```
Line 2:  tool_name=...    -> Adds a string field to the log entry
Line 3:  args={...}       -> Nested dict becomes a nested JSON object
Line 4:  result={...}     -> json.dumps handles arbitrary nesting depth
Line 5:  duration_ms=52.3 -> Float field preserved; all fields are queryable
```

#### Common Mistake: Logging Secrets

```python
# WRONG - logs the raw API key into your log stream
logger.log("auth", api_key="sk-1234567890abcdef")

# RIGHT - redact sensitive values before logging
def redact(value: str, show_last: int = 4) -> str:
    if len(value) <= show_last:
        return "****"
    return "*" * (len(value) - show_last) + value[-show_last:]

logger.log("auth", api_key=redact("sk-1234567890abcdef"))
# Output: {"event": "auth", "api_key": "***************cdef"}
```

**What's happening:**
```
Line 2:  api_key=...   -> DANGER: raw secret in log output
Line 6:  len(value) <= show_last -> Guard against short strings
Line 8:  "*" * (...) + value[...] -> Replace most chars with asterisks; keep last 4
```

#### Production: Log With File Rotation

```python
from logging.handlers import RotatingFileHandler
import logging

def setup_production_logger(name: str, max_bytes: int = 5_000_000) -> logging.Logger:
    log = logging.getLogger(name)
    log.setLevel(logging.DEBUG)
    handler = RotatingFileHandler(f"{name}.log", maxBytes=max_bytes, backupCount=3)
    handler.setFormatter(logging.Formatter(
        '{"time":"%(asctime)s","level":"%(levelname)s","event":"%(message)s"}'
    ))
    log.addHandler(handler)
    return log

prod_log = setup_production_logger("factory_pipeline")
prod_log.info(json.dumps({"event": "pipeline_start", "run_id": "R-001"}))
```

**What's happening:**
```
Line  8:  setLevel(DEBUG)         -> Capture all levels; filter at handler
Line  9:  RotatingFileHandler()   -> Auto-rotates when file hits max_bytes
Line 10:  maxBytes=5_000_000      -> Rotate at ~5MB to prevent disk fill
Line 11:  backupCount=3           -> Keep 3 rotated files; delete oldest
Line 16:  logger.info(json.dumps()) -> Emit structured JSON through the handler
```

### 2. Timing Decorator for Tool Execution

Every tool call must be timed. Slow tools indicate bottleneck functions or network issues that degrade the entire pipeline.

#### Basic: Simple Timing Decorator

```python
def timed(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.log("tool_executed", function=func.__name__, elapsed_ms=elapsed_ms)
        return result
    return wrapper

@timed
def get_machine_status(serial: str) -> dict:
    time.sleep(0.05)
    return {"temp_c": 87.3, "pressure_psi": 142.1, "vibration_mm_s": 4.2}

@timed
def get_recent_alerts(serial: str, hours: int) -> list:
    time.sleep(0.03)
    return [{"alert": "high_temp", "ts": "2025-01-15T08:00:00"}]
```

**What's happening:**
```
Line  3:  @wraps(func)                    -> Preserves original function metadata
Line  5:  start = time.perf_counter()     -> High-resolution stopwatch start
Line  7:  result = func(*args, **kwargs)  -> Execute the actual function
Line  8:  round(... * 1000, 2)            -> Convert seconds to milliseconds, 2 decimals
Line  9:  logger.log(...)                 -> Emit structured log with timing
Line 10:  return result                   -> Pass through original return value
Line 13:  @timed                          -> Wraps get_machine_status with timing
Line 15:  time.sleep(0.05)                -> Simulates 50ms network latency
```

#### Edge Case: Timing a Function That Raises

```python
def timed_safe(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.log("tool_executed", function=func.__name__,
                       elapsed_ms=elapsed_ms, status="success")
            return result
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.log("tool_executed", function=func.__name__,
                       elapsed_ms=elapsed_ms, status="error", error=str(e))
            raise
    return wrapper
```

**What's happening:**
```
Line  6:  try:                              -> Wrap function call in exception handler
Line  7:    result = func(...)              -> Attempt normal execution
Line  8-9:  elapsed_ms = ...                -> Calculate timing on success path
Line 10-11: logger.log(... success)         -> Log with status="success"
Line 13:  except Exception as e:            -> Catch any exception
Line 14:  elapsed_ms = ...                  -> Calculate timing on failure path too
Line 15-16: logger.log(... error)           -> Log with status="error" + message
Line 17:  raise                             -> Re-raise so caller still sees exception
```

#### Production: Timing With Percentile Tracking

```python
import statistics

class TimingTracker:
    def __init__(self):
        self.timings: dict[str, list[float]] = {}

    def record(self, function: str, elapsed_ms: float):
        if function not in self.timings:
            self.timings[function] = []
        self.timings[function].append(elapsed_ms)

    def stats(self, function: str) -> dict:
        times = self.timings.get(function, [])
        if not times:
            return {"function": function, "count": 0}
        return {
            "function": function,
            "count": len(times),
            "avg_ms": round(statistics.mean(times), 2),
            "p50_ms": round(statistics.median(times), 2),
            "p95_ms": round(sorted(times)[int(len(times) * 0.95)], 2) if len(times) >= 2 else round(times[0], 2),
            "max_ms": round(max(times), 2)
        }
```

**What's happening:**
```
Line  6:  self.timings = {}            -> Dict maps function name -> list of elapsed times
Line  9:  if function not in ...       -> Lazily initialize list for new function
Line 10:  self.timings[func].append()  -> Accumulate raw timing data points
Line 14:  times = self.timings.get()   -> Retrieve all timings for this function
Line 17:  statistics.mean(times)       -> Calculate arithmetic average
Line 18:  statistics.median(times)     -> p50: median value (50th percentile)
Line 19:  sorted(times)[int(...)]      -> p95: 95th percentile of observed times
Line 20:  max(times)                   -> Worst-case observed latency
```

### 3. Token Usage and Cost Estimation

LLM calls are billed by token count. Track input/output tokens and estimate cost to avoid budget surprises.

#### Basic: Token Tracker

```python
class TokenTracker:
    COST_PER_1K_INPUT = 0.003
    COST_PER_1K_OUTPUT = 0.015

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.calls: list[dict] = []

    def record(self, input_tokens: int, output_tokens: int, model: str):
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        cost = (input_tokens * self.COST_PER_1K_INPUT
                + output_tokens * self.COST_PER_1K_OUTPUT) / 1000
        self.calls.append({
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": round(cost, 6)
        })
        logger.log("llm_call", model=model, input_tokens=input_tokens,
                    output_tokens=output_tokens, cost_usd=round(cost, 6))

    def summary(self) -> dict:
        total_cost = sum(c["estimated_cost_usd"] for c in self.calls)
        return {
            "total_calls": len(self.calls),
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cost_usd": round(total_cost, 4)
        }
```

**What's happening:**
```
Line  3-4: COST_PER_1K_INPUT/OUTPUT  -> Per-model pricing constants ($/1K tokens)
Line 11:  += input/output tokens     -> Running totals across entire pipeline
Line 14:  cost = (...) / 1000        -> Convert from per-1K to per-token pricing
Line 15-20: self.calls.append(...)   -> Store full call details for audit
Line 22:  logger.log(...)            -> Also emit to structured log stream
Line 25:  sum(c["estimated_cost_usd"]) -> Sum all individual call costs
```

#### Edge Case: Multiple Models With Budget Alerts

```python
class MultiModelTracker:
    PRICING = {
        "gpt-4o":      {"input": 0.0025, "output": 0.010},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "claude-3.5":  {"input": 0.003,  "output": 0.015},
    }

    def __init__(self, budget_usd: float = 10.0):
        self.budget_usd = budget_usd
        self.total_cost = 0.0
        self.calls: list[dict] = []

    def record(self, input_tokens: int, output_tokens: int, model: str):
        pricing = self.PRICING.get(model, {"input": 0.003, "output": 0.015})
        cost = (input_tokens * pricing["input"]
                + output_tokens * pricing["output"]) / 1000
        self.total_cost += cost
        self.calls.append({"model": model, "cost_usd": round(cost, 6)})

    def check_budget(self) -> dict:
        pct_used = (self.total_cost / self.budget_usd) * 100
        return {
            "budget_usd": self.budget_usd,
            "spent_usd": round(self.total_cost, 4),
            "remaining_usd": round(self.budget_usd - self.total_cost, 4),
            "pct_used": round(pct_used, 2),
            "alert": pct_used > 80
        }
```

**What's happening:**
```
Line  3-7:  PRICING dict           -> Per-model pricing lookup table
Line  9:    budget_usd=10.0        -> Set spending cap at $10.00
Line 15:    self.PRICING.get(...)  -> Look up model-specific rates
Line 16:    {"input": 0.003, ...}  -> Fallback to default if model unknown
Line 18:    self.total_cost += ... -> Running cumulative spend
Line 22:    pct_used = ...         -> Percentage of budget consumed
Line 27:    alert = pct_used > 80  -> Flag when >80% budget used
```

#### Common Mistake: Forgetting to Track Every LLM Call

```python
# WRONG - only tracking the final summary, missing intermediate tokens
def run_pipeline_bad(query):
    result = llm.generate(query)         # Tokens used here not tracked!
    summary = llm.summarize(result)      # Only this call tracked
    return summary

# RIGHT - track every LLM call in the chain
def run_pipeline_good(query, tracker):
    result = llm.generate(query)
    tracker.record(result.input_tokens, result.output_tokens, "gpt-4o-mini")
    summary = llm.summarize(result)
    tracker.record(summary.input_tokens, summary.output_tokens, "gpt-4o")
    return summary
```

**What's happening:**
```
Bad path:  llm.generate() uses tokens but they are never recorded
           Only llm.summarize() is tracked; cost reports are inaccurate
Good path: tracker.record() captures generate() and summarize() cost
           Every LLM call contributes to total; budget tracking is reliable
```

### 4. Execution Trace Context Manager

A context manager that captures the full trace of a pipeline run — every stage, its timing, and any errors.

#### Basic: Pipeline Trace

```python
from contextlib import contextmanager

@contextmanager
def pipeline_trace(query: str, run_id: str):
    start = time.perf_counter()
    logger.log("pipeline_start", run_id=run_id, query=query)
    errors = []

    try:
        yield errors
    except Exception as e:
        errors.append(str(e))
        logger.log("pipeline_error", run_id=run_id, error=str(e))
    finally:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        logger.log("pipeline_end", run_id=run_id,
                    elapsed_ms=elapsed, error_count=len(errors))
```

**What's happening:**
```
Line  5:  start = time.perf_counter()     -> Start the pipeline clock
Line  6:  logger.log("pipeline_start",...) -> Emit start event with run_id + query
Line  7:  errors = []                      -> Mutable list passed into the block
Line 10:  yield errors                     -> Pause here; code in 'with' block runs
Line 11:  except Exception as e:           -> Catch any unhandled exception
Line 12:  errors.append(str(e))            -> Store error message in shared list
Line 13:  logger.log("pipeline_error",...) -> Log the error with run_id
Line 15:  finally:                          -> Always runs: success or failure
Line 16:  elapsed = ...                    -> Calculate total pipeline duration
Line 17:  logger.log("pipeline_end",...)   -> Log completion with timing + error count
```

#### Usage Example: Full Pipeline Trace

```python
run_id = "RUN-2025-06-21-001"

with pipeline_trace("What is the status of pump PUMP-042?", run_id) as errors:
    tool_choice = llm.route_query("What is the status of pump PUMP-042?")
    logger.log("stage_complete", stage="routing", run_id=run_id)

    if tool_choice == "get_machine_status":
        result = get_machine_status("PUMP-042")
        logger.log("stage_complete", stage="tool_execution", run_id=run_id)

    validated, val_errors = validator_with_logging([{"result": result}])
    if val_errors:
        errors.extend(val_errors)
    logger.log("stage_complete", stage="validation", run_id=run_id)

    answer = llm.generate_answer(result)
    logger.log("stage_complete", stage="answer_generation", run_id=run_id)
```

**What's happening:**
```
Line  4:  with pipeline_trace(...) as errors -> Opens trace context
Line  5:  tool_choice = llm.route_query(...) -> LLM decides which tool to call
Line  6:  logger.log("stage_complete",...)   -> Log routing stage completion
Line  8:  result = get_machine_status(...)   -> Execute the actual tool
Line 12:  validated, val_errors = ...        -> Validate sensor readings
Line 13:  errors.extend(val_errors)          -> Append validation errors to trace
Line 16:  answer = llm.generate_answer(...)  -> LLM produces natural language answer
Line 18:  (exits 'with' block)               -> pipeline_end fires automatically
```

#### Edge Case: Nested Traces

```python
with pipeline_trace("Check all pumps", "RUN-001") as outer_errors:
    for pump_id in ["PUMP-041", "PUMP-042", "PUMP-043"]:
        with pipeline_trace(f"Status {pump_id}", f"RUN-001-{pump_id}") as inner_errors:
            result = get_machine_status(pump_id)
            if result.get("temp_c", 0) > 95.0:
                inner_errors.append(f"{pump_id} overheating")
```

**What's happening:**
```
Line 1:  outer_errors = ...        -> Outer trace captures top-level pipeline
Line 2:  for pump_id in [...]      -> Iterate over 3 pumps
Line 3:  inner_errors = ...        -> Each pump gets its own nested trace
Line 4:  result = get_machine_status -> Fetch sensor data for this pump
Line 5:  if result.get("temp_c")   -> Check if temperature exceeds threshold
Line 6:  inner_errors.append(...)  -> Record error in inner trace only
Result:  3 nested pipeline_end logs -> Each with independent timing + error count
```

### 5. Error Tracking with Self-Correction Log

When validation fails, the pipeline retries. Log every retry attempt so you can see how many correction loops were needed.

#### Basic: Validator With Logging

```python
def validator_with_logging(results: list[dict], max_retries: int = 3) -> tuple[list, list[str]]:
    all_errors = []

    for attempt in range(max_retries):
        validated = []
        errors = []

        for item in results:
            data = item.get("result", {})
            if isinstance(data, dict):
                if data.get("temp_c", 0) > 95.0:
                    errors.append(f"temp_c {data['temp_c']} exceeds 95.0C")
                if data.get("pressure_psi", 0) > 200.0:
                    errors.append(f"pressure_psi {data['pressure_psi']} exceeds 200.0PSI")
            validated.append(item)

        logger.log("validation_attempt", attempt=attempt, errors=errors)
        all_errors.extend(errors)

        if not errors:
            return validated, all_errors

    return results, all_errors
```

**What's happening:**
```
Line  4:  for attempt in range(max_retries)  -> Loop up to 3 attempts
Line  7:  validated = []                      -> Fresh list for this attempt
Line  8:  errors = []                         -> Fresh error list for this attempt
Line 10:  data = item.get("result", {})       -> Extract result dict from item
Line 11:  if isinstance(data, dict)           -> Only validate dict results
Line 12:  if data.get("temp_c", 0) > 95.0    -> Check temperature threshold
Line 14:  if data.get("pressure_psi", 0)...  -> Check pressure threshold
Line 17:  validated.append(item)              -> Keep item even if it has errors
Line 19:  logger.log("validation_attempt"...) -> Log this attempt's results
Line 21:  if not errors:                      -> Success: no errors found
Line 22:    return validated, all_errors      -> Exit early with clean results
Line 25:  return results, all_errors          -> Max retries exhausted; return as-is
```

#### Error Scenario: What Happens Without Validation Logging

```python
# WITHOUT logging, you see:
#   ERROR: pipeline failed
# That's it. No way to know which check failed, how many retries, or which sensors.

# WITH logging, you see:
# {"event": "validation_attempt", "attempt": 0,
#  "errors": ["temp_c 98.2 exceeds 95.0C", "pressure_psi 210.3 exceeds 200.0PSI"]}
# {"event": "validation_attempt", "attempt": 1,
#  "errors": ["temp_c 98.2 exceeds 95.0C", "pressure_psi 210.3 exceeds 200.0PSI"]}
# {"event": "validation_attempt", "attempt": 2,
#  "errors": ["temp_c 98.2 exceeds 95.0C", "pressure_psi 210.3 exceeds 200.0PSI"]}
# => The same 2 errors on all 3 attempts: validator_with_logging re-checks the SAME
#    results, so a retry can only pass if something corrects the data in between
#    (the logs make that visible; see SelfCorrectingValidator below).
```

#### Production: Self-Correction With LLM Feedback

```python
class SelfCorrectingValidator:
    def __init__(self, llm, max_retries: int = 3):
        self.llm = llm
        self.max_retries = max_retries
        self.correction_log: list[dict] = []

    def validate_and_correct(self, data: dict, context: str) -> tuple[dict, list[dict]]:
        current_data = data.copy()
        history = []

        for attempt in range(self.max_retries):
            errors = self._check_rules(current_data)
            logger.log("self_correction_attempt", attempt=attempt, errors=errors)

            if not errors:
                return current_data, history

            correction_prompt = (
                f"Data: {json.dumps(current_data)}\n"
                f"Errors: {json.dumps(errors)}\n"
                f"Context: {context}\n"
                f"Return corrected JSON with only invalid fields fixed."
            )
            corrected = self.llm.generate(correction_prompt)
            current_data = json.loads(corrected)

            history.append({"attempt": attempt, "errors_found": errors,
                            "correction_applied": True})
            logger.log("self_correction_applied", attempt=attempt)

        return current_data, history

    def _check_rules(self, data: dict) -> list[str]:
        errors = []
        if data.get("temp_c", 0) > 95.0:
            errors.append(f"temp_c {data['temp_c']} exceeds 95.0C")
        if data.get("pressure_psi", 0) > 200.0:
            errors.append(f"pressure_psi {data['pressure_psi']} exceeds 200.0PSI")
        if data.get("vibration_mm_s", 0) > 10.0:
            errors.append(f"vibration {data['vibration_mm_s']} exceeds 10.0mm/s")
        return errors
```

**What's happening:**
```
Line  7:  self.correction_log = []          -> Full audit trail of all corrections
Line 10:  current_data = data.copy()        -> Work on a copy; don't mutate original
Line 13:  errors = self._check_rules(...)   -> Run validation rules
Line 17:  return current_data, history      -> Clean data; no corrections needed
Line 19:  correction_prompt = (...)         -> Build prompt describing the errors
Line 24:  corrected = self.llm.generate(...) -> Ask LLM to fix the data
Line 25:  current_data = json.loads(...)    -> Parse LLM's corrected JSON
Line 27-28: history.append(...)             -> Record what was corrected
Line 30:  return current_data, history      -> Return corrected data + full history
```

### Common Mistakes and How to Fix Them

| Mistake                        | What Goes Wrong                    | Fix                                  |
|--------------------------------|------------------------------------|--------------------------------------|
| `print()` instead of JSON logs | Can't filter/search in log tools   | Use `StructuredLogger`               |
| Not timing tool calls          | Blind to slow functions            | Apply `@timed` decorator everywhere |
| Logging API keys/secrets       | Secrets appear in log aggregation  | Redact before logging                |
| Only tracking final LLM call   | Undercount total token spend       | Track every LLM call in chain        |
| No pipeline trace              | Can't identify which stage failed  | Wrap pipeline in `pipeline_trace()`  |
| Ignoring retry counts          | Silent self-correction loops       | Log each validation attempt          |
| Hardcoding model pricing       | Wrong cost when models change      | Use pricing lookup dict              |
| No budget alerts               | Runaway LLM costs                  | Check budget after every call        |

#### Example: The Silent Failure Problem

```python
# WITHOUT observability: pipeline fails silently
def run_diagnostics_bad(pump_id):
    data = get_machine_status(pump_id)   # What if this returns None?
    return analyze(data)                  # Crashes with cryptic error

# WITH observability: every failure is visible
def run_diagnostics_good(pump_id):
    with pipeline_trace(f"diagnostics {pump_id}", f"TRACE-{pump_id}") as errors:
        data = get_machine_status(pump_id)
        if data is None:
            errors.append(f"get_machine_status returned None for {pump_id}")
            return None
        result = analyze(data)
    return result
```

**What's happening:**
```
Bad path:  If get_machine_status returns None, no error recorded
           analyze(None) crashes; no trace of what happened
Good path: pipeline_trace wraps entire operation
           Explicit None check catches the failure case
           errors.append(...) records the error in the trace
           pipeline_end fires with error_count=1
```

### Quick Reference Table

| Component                | Key Method / Pattern         | What It Gives You                         |
|--------------------------|------------------------------|-------------------------------------------|
| `StructuredLogger`       | `.log(event, **kwargs)`      | Filterable, searchable JSON log entries   |
| `@timed`                 | decorator on any function    | Execution time in ms for every call       |
| `TimingTracker`          | `.stats(function_name)`      | avg, p50, p95, max latency per function   |
| `TokenTracker`           | `.record(in, out, model)`    | Per-call cost + cumulative spend          |
| `MultiModelTracker`      | `.check_budget()`            | Budget remaining + alert at 80%           |
| `pipeline_trace()`       | `with trace as errors`       | Full pipeline timing + error capture      |
| `validator_with_logging` | returns `(data, errors)`     | Retry count + per-attempt error details   |
| `SelfCorrectingValidator`| `.validate_and_correct()`    | LLM-assisted fix with full audit trail    |

| Logging Pattern              | When To Use                              |
|------------------------------|------------------------------------------|
| `StructuredLogger.log()`     | Every event: tool calls, pipeline stages |
| `@timed`                     | Every tool/function call                 |
| `TokenTracker.record()`      | Every LLM API call                       |
| `pipeline_trace()`           | Every pipeline run                       |
| `validation_attempt` log     | Every validation/retry loop              |

### Summary

Observability turns a black-box agentic system into a diagnosable one. Structured JSON logs, execution timing, token tracking, and error traces give you the data needed to debug failures, optimize costs, and prove correctness to stakeholders. Every pipeline stage should emit logs — if you can't measure it, you can't fix it.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Observability**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter10 observability**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

