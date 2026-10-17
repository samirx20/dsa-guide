# Part 8, Topic 2: System Integration
## Chapter 1: Architecture Review

**Prerequisite Knowledge:** Basic understanding of functions, Pydantic models, and the concept of an AI agent.

### The 'Assembly Line' Analogy
Imagine a car factory assembly line. Station 1 builds the frame, Station 2 adds the engine, Station 3 attaches the wheels, and Station 4 does a safety inspection. If a car comes out missing a wheel, you know exactly which station failed. An AI pipeline is an assembly line for data. Instead of one giant confusing brain doing everything at once, we break the work into clear, measurable stations.

Every component you built in Parts 1-5 exists to serve a single purpose: moving data safely from a vague human question to a validated, trustworthy answer. This chapter maps that entire pipeline so you can reason about where failures happen and where to add observability.

### 1. The Five-Stage Pipeline

The production agentic system has five sequential stages. Each stage receives structured input and produces structured output, enforced by Pydantic models.

```python
from pydantic import BaseModel
from typing import Any

# This object travels down the assembly line, carrying our data
class PipelineState(BaseModel):
    query: str
    context: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    tool_results: list[dict[str, Any]] = []
    validated_results: list[dict[str, Any]] = []
    final_answer: str = ""
    errors: list[str] = []
    metadata: dict[str, Any] = {}
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────┐
│ PipelineState (the "workpiece" on the assembly line)    │
├─────────────────────────────────────────────────────────┤
│ query: Original user question (raw material)            │
│ context: Retrieved documents (supporting materials)     │
│ tool_calls: Planned actions (work instructions)         │
│ tool_results: Execution outputs (manufactured parts)    │
│ validated_results: Checked parts (quality control)      │
│ final_answer: Assembled product (finished goods)        │
│ errors: Defect log (quality issues)                     │
│ metadata: Production stats (efficiency metrics)         │
└─────────────────────────────────────────────────────────┘
```

#### Stage 1 — Planner (LLM)
Receives the user query. Returns a list of tool calls the LLM wants to execute. This is where `function_calling` or structured output directs the flow.

```python
class ToolCall(BaseModel):
    tool_name: str
    arguments: dict[str, Any]

def planner_stage(query: str, tools: list[dict]) -> list[ToolCall]:
    # In reality, this would ask an LLM to decide what tools to use
    return [
        ToolCall(tool_name="get_machine_status", arguments={"serial": "MCH-0042"}),
        ToolCall(tool_name="get_recent_alerts", arguments={"serial": "MCH-0042", "hours": 24})
    ]
```

**What's happening:**
```
Input: query = "Check machine MCH-0042 status and recent alerts"
       tools = ["get_machine_status", "get_recent_alerts", ...]

Step 1: LLM analyzes query → identifies entities (machine serial)
Step 2: LLM selects appropriate tools from tool list
Step 3: LLM generates arguments for each tool
Step 4: Returns structured ToolCall objects

Output: [ToolCall(tool_name="get_machine_status", arguments={"serial": "MCH-0042"}),
         ToolCall(tool_name="get_recent_alerts", arguments={"serial": "MCH-0042", "hours": 24})]
```

#### Stage 2 — Retriever (RAG)
Searches chunked documents filtered by metadata. Returns relevant passages that provide domain context for the query.

```python
def retriever_stage(query: str, serial_number: str, documents: list[dict]) -> list[str]:
    # Find all documents related to this specific machine
    matches = []
    for doc in documents:
        if serial_number in doc.get("serial_numbers", []):
            matches.append(doc["content"])
            
    # Return top 3
    return matches[:3]
```

**What's happening:**
```
Input: query = "Check machine MCH-0042 status"
       serial_number = "MCH-0042"
       documents = [{"content": "Manual page...", "serial_numbers": ["MCH-0042"]}, ...]

Step 1: Filter documents by serial_number match
Step 2: Extract content from matching documents
Step 3: Limit to top 3 results (resource management)

Output: ["Manual page for MCH-0042 maintenance...", ...]
```

#### Stage 3 — Executor (Tool Calling)
Maps each `ToolCall` to an actual Python function and runs it. Returns raw results.

```python
# A map of tool names to actual Python functions
TOOL_REGISTRY = {
    "get_machine_status": lambda serial: {"temp_c": 87.3, "pressure_psi": 142.1, "vibration_mm_s": 4.2},
    "get_recent_alerts": lambda serial, hours: [{"alert": "high_temp", "ts": "2025-01-15T08:00:00"}]
}

def executor_stage(tool_calls: list[ToolCall]) -> list[dict[str, Any]]:
    results = []
    for call in tool_calls:
        # Find the function to run
        func = TOOL_REGISTRY[call.tool_name]
        
        # Run it with the arguments the LLM provided (** unpackages the dictionary)
        result = func(**call.arguments)
        
        # Save the result
        results.append({"tool": call.tool_name, "result": result})
        
    return results
```

**What's happening:**
```
Input: tool_calls = [ToolCall(tool_name="get_machine_status", arguments={"serial": "MCH-0042"}),
                     ToolCall(tool_name="get_recent_alerts", arguments={"serial": "MCH-0042", "hours": 24})]

Step 1: For each ToolCall, look up function in TOOL_REGISTRY
Step 2: Unpack arguments dictionary (**call.arguments)
Step 3: Execute function with arguments
Step 4: Wrap result with tool name for traceability

Output: [{"tool": "get_machine_status", "result": {"temp_c": 87.3, ...}},
         {"tool": "get_recent_alerts", "result": [{"alert": "high_temp", ...}]}]
```

#### Stage 4 — Validator (Physics Rules)
Checks every result against deterministic rules. No LLM involved — pure Python logic.

```python
THERMAL_LIMIT_C = 95.0
PRESSURE_LIMIT_PSI = 200.0
VIBRATION_LIMIT_MM_S = 7.0

def validator_stage(results: list[dict[str, Any]]) -> tuple[list[dict], list[str]]:
    validated = []
    errors = []
    
    for item in results:
        data = item["result"]
        
        # Check against strict physical limits
        if isinstance(data, dict):
            if data.get("temp_c", 0) > THERMAL_LIMIT_C:
                errors.append(f"Temperature {data['temp_c']}C exceeds {THERMAL_LIMIT_C}C limit")
            if data.get("pressure_psi", 0) > PRESSURE_LIMIT_PSI:
                errors.append(f"Pressure {data['pressure_psi']}PSI exceeds {PRESSURE_LIMIT_PSI}PSI limit")
            if data.get("vibration_mm_s", 0) > VIBRATION_LIMIT_MM_S:
                errors.append(f"Vibration {data['vibration_mm_s']}mm/s exceeds {VIBRATION_LIMIT_MM_S}mm/s limit")
                
        # Keep the valid items
        validated.append(item)
        
    return validated, errors
```

**What's happening:**
```
Input: results = [{"tool": "get_machine_status", "result": {"temp_c": 87.3, ...}}, ...]

Step 1: For each result, extract data dictionary
Step 2: Compare each metric against physical limits
Step 3: If violation found, add to errors list
Step 4: Always keep item in validated list (even with errors)

Output: validated = [same items as input]
        errors = []  (87.3C, 142.1PSI and 4.2mm/s are all within limits)
```

#### Stage 5 — Synthesizer (LLM)
Takes validated results plus context and generates a human-readable diagnostic report.

```python
def synthesizer_stage(query: str, context: list[str], results: list[dict], errors: list[str]) -> str:
    # Build a simple report string
    findings = "\n".join(f"- {r['tool']}: {r['result']}" for r in results)
    
    if errors:
        warnings = "\n".join(f"WARNING: {e}" for e in errors)
    else:
        warnings = "No violations detected."
        
    return f"Query: {query}\n\nFindings:\n{findings}\n\nSafety Check:\n{warnings}"
```

**What's happening:**
```
Input: query = "Check machine MCH-0042 status"
       context = ["Manual page for MCH-0042..."]
       results = [{"tool": "get_machine_status", "result": {...}}]
       errors = ["Temperature 96.5C exceeds 95.0C limit"]

Step 1: Format each result as bullet point
Step 2: Check if errors exist
Step 3: Format errors as warnings or use default message
Step 4: Assemble final report string

Output: "Query: Check machine MCH-0042 status

Findings:
- get_machine_status: {'temp_c': 87.3, ...}

Safety Check:
WARNING: Temperature 96.5C exceeds 95.0C limit"
```

### 2. The Complete Pipeline Orchestrator

Tie all stages together with a single function that manages state and handles failures.

```python
class DiagnosticPipeline:
    def __init__(self, documents: list[dict]):
        self.documents = documents

    def run(self, query: str, serial_number: str) -> PipelineState:
        # 1. Start the assembly line with a new state object
        state = PipelineState(query=query)

        # 2. Pass it through the stages
        state.tool_calls = planner_stage(query, [])
        state.context = retriever_stage(query, serial_number, self.documents)
        state.tool_results = executor_stage(state.tool_calls)
        state.validated_results, errors = validator_stage(state.tool_results)
        state.errors = errors
        state.final_answer = synthesizer_stage(query, state.context, state.validated_results, errors)
        
        # 3. Add some meta info
        state.metadata = {"stages_completed": 5, "total_tool_calls": len(state.tool_calls)}
        
        # 4. Return the finished product
        return state
```

**What's happening:**
```
Pipeline Execution Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. Initialize PipelineState with query                      │
│ 2. Planner: Decide which tools to call                     │
│ 3. Retriever: Find relevant documents                      │
│ 4. Executor: Run the tools                                 │
│ 5. Validator: Check results against rules                  │
│ 6. Synthesizer: Generate human-readable answer             │
│ 7. Attach metadata for monitoring                          │
└─────────────────────────────────────────────────────────────┘
```

**Production version with error handling:**
```python
class ProductionPipeline:
    def __init__(self, documents: list[dict]):
        self.documents = documents
        self.logger = logging.getLogger(__name__)

    def run(self, query: str, serial_number: str) -> PipelineState:
        state = PipelineState(query=query)
        stage_status = self.stage_status = {}  # _safe_stage records each stage here
        
        try:
            # Stage 1: Planner
            state.tool_calls = self._safe_stage("planner",
                lambda: planner_stage(query, []))
            
            # Stage 2: Retriever
            state.context = self._safe_stage("retriever", 
                lambda: retriever_stage(query, serial_number, self.documents))
            
            # Stage 3: Executor
            state.tool_results = self._safe_stage("executor",
                lambda: executor_stage(state.tool_calls))
            
            # Stage 4: Validator
            if state.tool_results:
                validated, errors = self._safe_stage("validator",
                    lambda: validator_stage(state.tool_results))
                state.validated_results = validated
                state.errors.extend(errors)
            
            # Stage 5: Synthesizer
            state.final_answer = self._safe_stage("synthesizer",
                lambda: synthesizer_stage(query, state.context, state.validated_results, state.errors))
                
        except Exception as e:
            state.errors.append(f"Pipeline failed: {str(e)}")
            state.final_answer = f"Error: {str(e)}"
        
        state.metadata = {
            "stages_completed": sum(v == "ok" for v in stage_status.values()),
            "stage_status": stage_status,
            "total_tool_calls": len(state.tool_calls),
            "error_count": len(state.errors)
        }
        
        return state
    
    def _safe_stage(self, stage_name: str, stage_func):
        """Execute stage with error handling and logging."""
        try:
            result = stage_func()
            self.stage_status[stage_name] = "ok"
            self.logger.info(f"Stage {stage_name} completed successfully")
            return result
        except Exception as e:
            self.stage_status[stage_name] = "failed"
            self.logger.error(f"Stage {stage_name} failed: {str(e)}")
            raise
```

### 3. Data Flow Diagram

The pipeline flows data through clear boundaries, with each stage having well-defined inputs and outputs.

```
                        ┌─────────────────────────────────────────────────────────────┐
                        │                    USER QUERY                               │
                        │          "Check machine MCH-0042 status"                    │
                        └─────────────────────┬───────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     STAGE 1: PLANNER                                               │
│  Input:  query (str)                                                                               │
│  Output: list[ToolCall]                                                                            │
│  Process: LLM decides which tools to call based on query                                           │
└─────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     STAGE 2: RETRIEVER                                             │
│  Input:  query (str), serial_number (str), documents (list[dict])                                  │
│  Output: list[str] (context chunks)                                                                │
│  Process: Search documents by serial number, return relevant passages                              │
└─────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     STAGE 3: EXECUTOR                                              │
│  Input:  list[ToolCall]                                                                            │
│  Output: list[dict] (raw tool results)                                                             │
│  Process: Map each ToolCall to Python function, execute, return results                            │
└─────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     STAGE 4: VALIDATOR                                             │
│  Input:  list[dict] (raw results)                                                                  │
│  Output: list[dict] (validated) + list[str] (errors)                                               │
│  Process: Check each result against physical limits, log violations                                │
└─────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     STAGE 5: SYNTHESIZER                                           │
│  Input:  query (str), context (list[str]), results (list[dict]), errors (list[str])                 │
│  Output: str (final human-readable answer)                                                         │
│  Process: Generate diagnostic report using LLM with all gathered data                              │
└─────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     FINAL ANSWER                                                   │
│  Diagnostic report with findings, warnings, and recommended actions                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Detailed Data Flow with Error Paths:**

```
User Query ──┐
             │
             ▼
┌────────────────────┐
│      PLANNER       │──┐
└────────────────────┘  │
                        │
                        ▼
┌────────────────────┐  │ (if planner fails)
│     RETRIEVER      │◄─┘
└────────────────────┘
         │
         ▼
┌────────────────────┐
│     EXECUTOR       │──┐
└────────────────────┘  │
                        │
                        ▼
┌────────────────────┐  │ (if executor fails)
│     VALIDATOR      │◄─┘
└────────────────────┘
         │
         ▼
┌────────────────────┐
│    SYNTHESIZER     │
└────────────────────┘
         │
         ▼
   Final Answer
```

Each arrow is a Pydantic model boundary. If any stage fails, the pipeline logs the error, optionally retries (self-correction), or returns a degraded answer with the errors attached.

### 4. Stage-by-Stage Failure Modes

Understanding what happens when each stage fails helps build resilient systems.

#### Stage 1: Planner Failures
**Failure Mode:** LLM returns invalid tool calls or no tool calls.
**Impact:** Wrong tools executed or no actions taken.
**Recovery:** Validate tool existence, fallback to default tools.

#### Stage 2: Retriever Failures
**Failure Mode:** Returns no context or irrelevant context.
**Impact:** Synthesizer generates generic/hallucinated answers.
**Recovery:** Keyword search fallback, return generic safety context.

#### Stage 3: Executor Failures
**Failure Mode:** Tool execution timeout, network errors, or invalid arguments.
**Impact:** Partial results or pipeline crash.
**Recovery:** Implement timeouts, retries, circuit breaker pattern.

#### Stage 4: Validator Failures
**Failure Mode:** Incorrect thresholds or missing validation rules.
**Impact:** False positives/negatives in safety checks.
**Recovery:** Use machine-specific profiles, adaptive thresholds.

#### Stage 5: Synthesizer Failures
**Failure Mode:** LLM generates incorrect or misleading summary.
**Impact:** User receives false information.
**Recovery:** Structured prompts with forced sections, fact-checking.

### 5. Common Mistakes and How to Fix Them

#### Mistake 1: Treating Pipeline as Monolith
**Problem:** Running all stages in one big function without clear boundaries.
**Solution:** Explicit stage separation with state management.

#### Mistake 2: Ignoring Error Propagation
**Problem:** Swallowing errors and returning partial results without indication.
**Solution:** Explicit error tracking and propagation.

#### Mistake 3: Hardcoding Configuration
**Problem:** Magic numbers and URLs scattered throughout code.
**Solution:** Externalize configuration using Pydantic models.

#### Mistake 4: No Idempotency Guarantees
**Problem:** Running pipeline multiple times produces different results.
**Solution:** Add caching and deterministic fallbacks.

#### Mistake 5: Missing Observability
**Problem:** Pipeline runs but no way to know what happened inside.
**Solution:** Comprehensive logging, metrics, and tracing.

### 6. Quick Reference Table

| Stage | Input | Output | Primary Responsibility | Failure Impact | Recovery Strategy |
|-------|-------|--------|------------------------|----------------|-------------------|
| **Planner** | Query (str) | list[ToolCall] | Decide which tools to call | Wrong tools executed, wasted resources | Validate tool existence, fallback to default tools |
| **Retriever** | Query, serial_number, documents | list[str] | Find relevant context | Hallucinated or generic answers | Keyword search fallback, generic context |
| **Executor** | list[ToolCall] | list[dict] | Run tool functions | Crashes, timeouts, partial results | Timeouts, retries, circuit breaker |
| **Validator** | list[dict] | list[dict] + list[str] | Check physical limits | False positives/negatives | Machine profiles, adaptive thresholds |
| **Synthesizer** | query, context, results, errors | str | Generate human report | Misleading summaries | Structured prompts, forced sections |

**Common Error Patterns:**

| Error Type | Stage | Symptom | Root Cause | Fix |
|------------|-------|---------|------------|-----|
| KeyError | Executor | Crash when calling tool | Tool not in registry | Validate tool existence before execution |
| Empty Results | Retriever | No context for synthesizer | No matching documents | Fallback search, generic context |
| False Positives | Validator | Too many warnings | Thresholds too strict | Use machine-specific profiles |
| Timeout | Executor | Pipeline hangs | Slow external API | Implement per-tool timeouts |
| LLM Hallucination | Synthesizer | Incorrect summary | Missing constraints | Structured prompts with required sections |

### Summary

The five-stage pipeline — Planner, Retriever, Executor, Validator, Synthesizer — provides a clear separation of concerns where each stage is independently testable and replaceable. The `PipelineState` model acts as the single source of truth flowing between stages, making failures easy to trace.

**Key Architectural Benefits:**
1. **Testability**: Each stage can be unit tested in isolation
2. **Observability**: Clear boundaries make monitoring straightforward
3. **Resilience**: Failures are contained and recoverable
4. **Scalability**: Stages can be scaled independently
5. **Maintainability**: Changes to one stage don't affect others

**Next Steps:**
This architecture is critical before adding observability and production safeguards in the next chapter. Understanding the pipeline allows you to:
- Add logging at each stage boundary
- Implement circuit breakers for external dependencies
- Create dashboards showing stage performance
- Set up alerts for common failure patterns
- Build feedback loops for continuous improvement

The factory assembly line analogy holds throughout: each station (stage) has clear inputs, processes data, and passes outputs to the next station. Quality control (validation) happens at multiple points, and the final product (answer) is tested before delivery to the customer (user).

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Run the whole assembly line.** `DiagnosticPipeline(documents).run("Check MCH-0042", "MCH-0042")` with the chapter's stage functions and these documents:

```python
documents = [
    {"content": "D1", "serial_numbers": ["MCH-0042"]},
    {"content": "D2", "serial_numbers": ["MCH-0007"]},
    {"content": "D3", "serial_numbers": ["MCH-0042", "MCH-0007"]},
    {"content": "D4"},                                   # no serial_numbers key
    {"content": "D5", "serial_numbers": ["MCH-0042"]},
    {"content": "D6", "serial_numbers": ["MCH-0042"]},
]
```

What are `state.context`, `state.errors`, `len(state.validated_results)`, `state.metadata`, and the last line of `state.final_answer`?

**Q2. Validator boundaries.** What does `validator_stage(results)` return for these results?

```python
results = [
    {"tool": "get_machine_status",
     "result": {"temp_c": 96.5, "pressure_psi": 205.0, "vibration_mm_s": 7.0}},
    {"tool": "get_recent_alerts", "result": [{"temp_c": 120}]},
]
```

**Q3. A hallucinated tool in production.** The planner returns `[ToolCall(tool_name="get_machine_temp", arguments={"serial": "MCH-0042"})]`, a tool that is not in `TOOL_REGISTRY`. Run `ProductionPipeline.run` with the Q1 documents. What are `state.errors`, `state.final_answer`, `state.context`, and `state.metadata`? Is anything about `metadata` suspicious even on a fully successful run?

**Q4. Missing argument.** What exception and message does this raise?

```python
executor_stage([ToolCall(tool_name="get_recent_alerts", arguments={"serial": "X"})])
```

**Q5. Mutable defaults in Pydantic.** `PipelineState` declares `errors: list[str] = []`. What does this print?

```python
a = PipelineState(query="a")
b = PipelineState(query="b")
a.errors.append("x")
print(b.errors, a.errors)
```

### Coding Exercises

**E1 (Easy).** Fix the Planner failure mode "Validate tool existence". Write `validate_tool_calls(calls, registry) -> (valid, errors)` that keeps known calls in order and produces `"Unknown tool: <name>"` for the rest.

- The chapter's 2 planned calls plus `get_machine_temp` → valid `["get_machine_status", "get_recent_alerts"]`, errors `["Unknown tool: get_machine_temp"]`

**E2 (Easy–Medium).** Write `executor_stage_safe(calls, registry=TOOL_REGISTRY)` that never crashes. Each call yields either `{"tool", "result"}` or `{"tool", "error"}`, with the error formatted as `"Unknown tool: <name>"` or `"<ExceptionType>: <message>"`. Later calls still run after a failure.

- `[status call, get_machine_temp, get_recent_alerts without hours]` → 1 result, then `{"tool": "get_machine_temp", "error": "Unknown tool: get_machine_temp"}`, then `{"tool": "get_recent_alerts", "error": "TypeError: <lambda>() missing 1 required positional argument: 'hours'"}`

**E3 (Medium).** Fix the `stages_completed` reporting. Write `run_with_status(stages, state)` where `stages` is a list of `(name, fn)` and each `fn(state)` mutates the state. Record `"ok"`, `"failed"` or `"skipped"` per stage: once a stage fails, the rest are skipped. Append `"<stage>: <ExceptionType>: <message>"` to `state.errors`, and set `state.metadata = {"stage_status": ..., "stages_completed": <count of ok>}`.

- With the hallucinated-tool planner → `{"retriever": "ok", "planner": "ok", "executor": "failed", "validator": "skipped", "synthesizer": "skipped"}`, `stages_completed == 2`, errors `["executor: KeyError: 'get_machine_temp'"]`

#### Dry-Run: Answers

**Q1.**

- **Retriever.** D1 matches, D2 does not, and D3 matches because its list contains the serial. D4 has no key, so `.get` returns `[]` and it does not match. D5 matches, and D6 matches but is cut by `[:3]`. That gives `context == ["D1", "D3", "D5"]`.
- **Planner and executor.** The planner returns the 2 hard-coded calls, and the executor runs both.
- **Validator.** $87.3 \le 95$, $142.1 \le 200$ and $4.2 \le 7$, so `errors == []`. The alerts result is a list and is skipped by the `isinstance(data, dict)` check. Both items are kept, so `len(validated_results) == 2`.
- **Metadata.** `metadata == {"stages_completed": 5, "total_tool_calls": 2}`.
- **Synthesizer.** The last line of `final_answer` is **`No violations detected.`**

**Q2.**

```python
([<both items unchanged>],
 ["Temperature 96.5C exceeds 95.0C limit",
  "Pressure 205.0PSI exceeds 200.0PSI limit"])
```

The vibration check is `7.0 > 7.0`, which is `False` because the limit is strict, so it reports no error. The second result is a **list**, so its `temp_c: 120` is never checked. A list-shaped tool result bypasses the physics rules entirely. Every item is still returned in `validated`, because the validator only reports violations and never drops data.

**Q3.**

- **Retriever.** It succeeds, so `context == ["D1", "D3", "D5"]`.
- **Planner.** It returns the bad call, so `state.tool_calls` has 1 item.
- **Executor.** `TOOL_REGISTRY["get_machine_temp"]` raises `KeyError('get_machine_temp')`. `_safe_stage` logs and re-raises it, and the outer `except` catches it. `str(KeyError('x'))` includes the quotes, so:
  - `errors == ["Pipeline failed: 'get_machine_temp'"]`
  - `final_answer == "Error: 'get_machine_temp'"`
- **Metadata.** `{"stages_completed": 0, "stage_status": {}, "total_tool_calls": 1, "error_count": 1}`.

The suspicious part: **`stage_status` is never written to**, so `stages_completed` is `0` even on a fully successful run. A successful run with the default planner reports `{"stages_completed": 0, "stage_status": {}, "total_tool_calls": 2, "error_count": 0}`. E3 fixes this.

**Q4.** `TypeError: <lambda>() missing 1 required positional argument: 'hours'`. `func(**call.arguments)` becomes `lambda serial, hours: ...` called with only `serial=`. Like the `KeyError` in Q3, this crashes the whole stage in the unsafe executor.

**Q5.** It prints `[] ['x']`. Unlike a plain Python default argument, Pydantic **copies** mutable field defaults for each instance, so `a` and `b` get separate lists. The `PipelineState` workpiece is safe to create once per run.

**E1 — reference solution**

```python
def validate_tool_calls(calls, registry):
    valid, errors = [], []
    for call in calls:
        if call.tool_name in registry:
            valid.append(call)
        else:
            errors.append(f"Unknown tool: {call.tool_name}")
    return valid, errors

plan = planner_stage("Check MCH-0042", []) + \
       [ToolCall(tool_name="get_machine_temp", arguments={"serial": "MCH-0042"})]
valid, errors = validate_tool_calls(plan, TOOL_REGISTRY)
print([c.tool_name for c in valid], errors)
# ['get_machine_status', 'get_recent_alerts'] ['Unknown tool: get_machine_temp']
```

$O(n)$ dictionary lookups. Run this between Planner and Executor, and feed `errors` back to the planner for self-correction.

**E2 — reference solution**

```python
def executor_stage_safe(calls, registry=TOOL_REGISTRY):
    results = []
    for call in calls:
        func = registry.get(call.tool_name)
        if func is None:
            results.append({"tool": call.tool_name, "error": f"Unknown tool: {call.tool_name}"})
            continue
        try:
            results.append({"tool": call.tool_name, "result": func(**call.arguments)})
        except Exception as ex:
            results.append({"tool": call.tool_name, "error": f"{type(ex).__name__}: {ex}"})
    return results

calls = [ToolCall(tool_name="get_machine_status", arguments={"serial": "MCH-0042"}),
         ToolCall(tool_name="get_machine_temp", arguments={"serial": "MCH-0042"}),
         ToolCall(tool_name="get_recent_alerts", arguments={"serial": "X"})]
for r in executor_stage_safe(calls):
    print(r)
# {'tool': 'get_machine_status', 'result': {'temp_c': 87.3, 'pressure_psi': 142.1, 'vibration_mm_s': 4.2}}
# {'tool': 'get_machine_temp', 'error': 'Unknown tool: get_machine_temp'}
# {'tool': 'get_recent_alerts', 'error': "TypeError: <lambda>() missing 1 required positional argument: 'hours'"}
```

Failures become data, so the synthesizer can report partial results instead of `"Error: ..."`. Note that `validator_stage` reads `item["result"]`, so either filter out the error items first or switch it to `item.get("result")`.

**E3 — reference solution**

```python
def run_with_status(stages, state):
    status, failed = {}, False
    for name, fn in stages:
        if failed:
            status[name] = "skipped"
            continue
        try:
            fn(state)
            status[name] = "ok"
        except Exception as ex:
            status[name] = "failed"
            state.errors.append(f"{name}: {type(ex).__name__}: {ex}")
            failed = True
    state.metadata = {"stage_status": status,
                      "stages_completed": sum(1 for v in status.values() if v == "ok")}
    return state

def make_stages(planner):
    def s_retrieve(s): s.context = retriever_stage(s.query, "MCH-0042", documents)
    def s_plan(s): s.tool_calls = planner(s.query, [])
    def s_execute(s): s.tool_results = executor_stage(s.tool_calls)
    def s_validate(s):
        s.validated_results, errs = validator_stage(s.tool_results)
        s.errors.extend(errs)
    def s_synth(s): s.final_answer = synthesizer_stage(s.query, s.context, s.validated_results, s.errors)
    return [("retriever", s_retrieve), ("planner", s_plan), ("executor", s_execute),
            ("validator", s_validate), ("synthesizer", s_synth)]

bad_planner = lambda q, t: [ToolCall(tool_name="get_machine_temp", arguments={"serial": "MCH-0042"})]
out = run_with_status(make_stages(bad_planner), PipelineState(query="Check MCH-0042"))
print(out.metadata, out.errors)
# {'stage_status': {'retriever': 'ok', 'planner': 'ok', 'executor': 'failed',
#   'validator': 'skipped', 'synthesizer': 'skipped'}, 'stages_completed': 2}
# ["executor: KeyError: 'get_machine_temp'"]
```

With the normal `planner_stage`, all five stages are `"ok"` and `stages_completed == 5`. The status map pinpoints the failing station on the assembly line. The orchestrator itself is $O(\text{stages})$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Architecture Review**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter9 architecture review**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

