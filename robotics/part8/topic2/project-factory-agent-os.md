# Part 8, Topic 2: System Integration
## Project 1: Factory Diagnostic Agent OS

This is the capstone. Build a complete multi-agent diagnostic API that orchestrates RAG retrieval, tool calling, physics validation, and LLM synthesis into a single FastAPI endpoint.

### Goal

Build a FastAPI application that accepts a natural language query about a factory machine and returns a validated diagnostic report, proving you can integrate every component from Parts 1-5.

### Requirements

#### 1. FastAPI Setup

Create a `POST /diagnose` endpoint accepting a query and serial number, returning a structured `DiagnosticResponse`.

```python
from fastapi import FastAPI
from pydantic import BaseModel
import uuid, time

app = FastAPI()

class DiagnosticRequest(BaseModel):
    query: str
    serial_number: str

class DiagnosticResponse(BaseModel):
    run_id: str
    answer: str
    tool_calls_made: int
    validation_errors: list[str]
    total_elapsed_ms: float
```

#### 2. Planner Stage

Map query keywords to tool calls. Return a list of `{"tool_name": ..., "arguments": ...}` dicts.

```python
def planner_stage(query: str) -> list[dict]:
    tools, q = [], query.lower()
    if "temp" in q or "overheat" in q:
        tools.append({"tool_name": "get_machine_status", "arguments": {}})
    if "alert" in q or "recent" in q:
        tools.append({"tool_name": "get_recent_alerts", "arguments": {"hours": 24}})
    return tools or [{"tool_name": "get_machine_status", "arguments": {}}]
```

#### 3. Retriever Stage

Filter chunked equipment manuals by serial number. Rank by cosine similarity on word-frequency vectors.

```python
def simple_embed(text):
    words = text.lower().split()
    return {w: words.count(w) for w in set(words)}

def cosine_score(a, b):
    keys = set(a) & set(b)
    if not keys: return 0.0
    dot = sum(a[k]*b[k] for k in keys)
    return dot / (sum(v**2 for v in a.values())**0.5 * sum(v**2 for v in b.values())**0.5)

def retriever_stage(query, serial, docs):
    qe = simple_embed(query)
    scored = [(cosine_score(qe, simple_embed(d["content"])), d["content"])
              for d in docs if serial in d.get("serial_numbers", [])]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:3]]
```

#### 4. Executor Stage

Register diagnostic tools as Python functions. Use a `@timed` decorator to log execution time.

```python
def timed(func):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"[TRACE] {func.__name__}: {round((time.perf_counter()-start)*1000,2)}ms")
        return result
    return wrapper

@timed
def get_machine_status(serial): return {"temp_c": 87.3, "pressure_psi": 142.1, "vibration_mm_s": 4.2}

@timed
def get_recent_alerts(serial, hours): return [{"alert": "high_temp", "value": 92.1}]

TOOLS = {"get_machine_status": get_machine_status, "get_recent_alerts": get_recent_alerts}

def executor_stage(tool_calls, serial):
    return [{"tool": c["tool_name"], "result": TOOLS[c["tool_name"]](serial, **c.get("arguments", {}))}
            for c in tool_calls if c["tool_name"] in TOOLS]
```

#### 5. Validator Stage

Check all results against physics limits. Return validated results and any violations.

```python
LIMITS = {"temp_c": 95.0, "pressure_psi": 200.0, "vibration_mm_s": 7.0}

def validator_stage(results):
    validated, errors = [], []
    for item in results:
        data = item.get("result", {})
        for key, limit in LIMITS.items():
            if isinstance(data, dict) and data.get(key, 0) > limit:
                errors.append(f"{key}: {data[key]} exceeds {limit}")
        validated.append(item)
    return validated, errors
```

#### 6. Synthesizer and Pipeline Orchestrator

Wire all stages together. Include a self-correction loop that retries validation up to 3 times.

```python
def synthesizer_stage(query, context, results, errors):
    report = f"DIAGNOSTIC REPORT\nQuery: {query}\n\nFINDINGS:\n"
    report += "\n".join(f"  [{r['tool']}] {r['result']}" for r in results)
    report += "\n\nSAFETY:\n"
    report += "\n".join(f"  ALERT: {e}" for e in errors) if errors else "  All readings within safe limits."
    return report

def run_pipeline(query, serial, documents):
    run_id, start = str(uuid.uuid4())[:8], time.perf_counter()
    context = retriever_stage(query, serial, documents)
    tool_results = executor_stage(planner_stage(query), serial)
    validated, errors = validator_stage(tool_results)
    retries = 0
    while errors and retries < 3:
        retries += 1
        validated, errors = validator_stage(tool_results)
    elapsed = round((time.perf_counter()-start)*1000, 2)
    return DiagnosticResponse(run_id=run_id,
        answer=synthesizer_stage(query, context, validated, errors),
        tool_calls_made=len(tool_results), validation_errors=errors, total_elapsed_ms=elapsed)
```

### Evaluation Checklist

- [ ] FastAPI app starts and `POST /diagnose` returns valid JSON
- [ ] Planner selects different tools based on query keywords
- [ ] Retriever filters documents by serial number and ranks by similarity
- [ ] All registered tools execute with timing logs
- [ ] Validator catches readings exceeding physics limits
- [ ] Synthesizer generates a readable report with findings and safety checks
- [ ] Self-correction loop retries validation up to 3 times
- [ ] Response includes `run_id`, `answer`, `tool_calls_made`, `validation_errors`, `total_elapsed_ms`
- [ ] Pipeline runs end-to-end with no external dependencies or API keys

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Factory Diagnostic Agent OS**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project factory agent os**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

