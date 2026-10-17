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

### Starter Code Skeleton

The requirement snippets work, but three of their shortcuts would hurt in production. The skeleton fixes each one without changing any stage's job:

- **The self-correction loop re-executes the tools.** In Requirement 6, the loop calls `validator_stage(tool_results)` on the *same* data three times, so it can never change the outcome (see Practice Q2). Re-reading the sensors can, because transient spikes are common on real machines.
- **Telemetry is injected.** The tools read from a `TelemetrySource` that FastAPI provides through `Depends(get_telemetry)`, so tests can script "spike, then normal" or "always overheating" with `app.dependency_overrides`.
- **Observability uses Chapter 10's structured events.** Every stage emits a `stage_end` JSON event carrying the `run_id`, and `GET /runs/{run_id}/trace` returns them. `@timed` logs through `logging`, as the evaluation checklist requires, instead of `print`.

The orchestration is a short pipeline with one feedback edge:

$$\text{retrieve} \rightarrow \text{plan} \rightarrow \underbrace{\text{execute} \rightarrow \text{validate}}_{\text{repeat while errors, at most 3 times}} \rightarrow \text{synthesize}$$

```text
factory-agent-os/
├── pyproject.toml
├── schemas.py          # DiagnosticRequest/Response (Requirement 1) + PipelineState (Chapter 9)
├── observability.py    # StructuredLogger, @timed, stage() context manager (Chapter 10)
├── tools.py            # TelemetrySource protocol, FakeTelemetry, make_tools()
├── documents.py        # DOCUMENTS with serial_numbers
├── stages.py           # planner / retriever / executor / validator / synthesizer
├── pipeline.py         # run_pipeline(): orchestration + re-execute loop
├── main.py             # FastAPI: POST /diagnose, GET /runs/{run_id}/trace, GET /health
└── tests/
    └── test_agent_os.py
```

```toml
# pyproject.toml -- no API keys, no external services
[project]
name = "factory-agent-os"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = ["fastapi>=0.110", "uvicorn[standard]>=0.29"]

[dependency-groups]
dev = ["pytest>=8.0", "httpx>=0.27"]
```

```python
# schemas.py
from typing import Any

from pydantic import BaseModel, Field


class DiagnosticRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    serial_number: str = Field(pattern=r"^[A-Z]+-\d+$")


class DiagnosticResponse(BaseModel):
    run_id: str
    answer: str
    tool_calls_made: int
    validation_errors: list[str]
    total_elapsed_ms: float
    retries: int = 0            # added: how many re-reads the loop needed
    sources: list[str] = []     # added: doc_ids used, for attribution


class PipelineState(BaseModel):
    """Chapter 9's 'workpiece': one object carried through every stage."""

    run_id: str
    query: str
    serial_number: str
    context: list[dict[str, Any]] = []
    tool_calls: list[dict[str, Any]] = []
    tool_results: list[dict[str, Any]] = []
    errors: list[str] = []
    retries: int = 0
    final_answer: str = ""
```

```python
# observability.py
import json
import logging
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import wraps
from typing import Any, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")
_log = logging.getLogger("agent.trace")


class StructuredLogger:
    def __init__(self) -> None:
        self.logs: list[dict[str, Any]] = []

    def log(self, event: str, **fields: Any) -> dict[str, Any]:
        entry: dict[str, Any] = {"timestamp": datetime.now(timezone.utc).isoformat(), "event": event, **fields}
        self.logs.append(entry)
        _log.info(json.dumps(entry, default=str))
        return entry

    def for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [e for e in self.logs if e.get("run_id") == run_id]


def timed(func: Callable[P, R]) -> Callable[P, R]:
    """Requirement 4's decorator, but through `logging` instead of print."""
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            logging.getLogger("agent.tools").info("[TRACE] %s: %.2fms", func.__name__, (time.perf_counter() - start) * 1000)
    return wrapper


@contextmanager
def stage(logger: StructuredLogger, run_id: str, name: str) -> Iterator[None]:
    """Emit stage_end with elapsed_ms and ok=True/False, even when the stage raises (then re-raise)."""
    # TODO(milestone 2): perf_counter before yield; logger.log("stage_end", ...) in finally
    raise NotImplementedError
    yield
```

```python
# tools.py
from collections.abc import Callable
from typing import Any, Protocol

from observability import timed


class TelemetrySource(Protocol):
    def known_serials(self) -> set[str]: ...
    def read_status(self, serial: str) -> dict[str, float]: ...
    def read_alerts(self, serial: str, hours: int) -> list[dict[str, Any]]: ...


class FakeTelemetry:
    """Each serial has a script of readings; every read consumes one, the last one repeats forever."""

    def __init__(self, scripts: dict[str, list[dict[str, float]]], alerts: dict[str, list[dict[str, Any]]]) -> None:
        self._scripts = {k: list(v) for k, v in scripts.items()}
        self._alerts = alerts

    def known_serials(self) -> set[str]:
        return set(self._scripts)

    def read_status(self, serial: str) -> dict[str, float]:
        script = self._scripts[serial]
        return script.pop(0) if len(script) > 1 else script[0]

    def read_alerts(self, serial: str, hours: int) -> list[dict[str, Any]]:
        return self._alerts.get(serial, [])


def default_telemetry() -> FakeTelemetry:
    return FakeTelemetry(
        scripts={
            "PUMP-042": [{"temp_c": 87.3, "pressure_psi": 142.1, "vibration_mm_s": 4.2}],
            "COMP-007": [{"temp_c": 97.4, "pressure_psi": 150.0, "vibration_mm_s": 3.1},   # transient spike...
                         {"temp_c": 91.0, "pressure_psi": 149.2, "vibration_mm_s": 3.0}],  # ...then normal
            "HX-900": [{"temp_c": 101.5, "pressure_psi": 188.0, "vibration_mm_s": 7.6}],   # always overheating
        },
        alerts={"PUMP-042": [{"alert": "high_temp", "value": 92.1}]},
    )


ToolFn = Callable[..., Any]


def make_tools(telemetry: TelemetrySource) -> dict[str, ToolFn]:
    @timed
    def get_machine_status(serial: str) -> dict[str, float]:
        return telemetry.read_status(serial)

    @timed
    def get_recent_alerts(serial: str, hours: int) -> list[dict[str, Any]]:
        return telemetry.read_alerts(serial, hours)

    return {"get_machine_status": get_machine_status, "get_recent_alerts": get_recent_alerts}
```

```python
# documents.py
DOCUMENTS: list[dict[str, object]] = [
    {"doc_id": "pump-manual-3.2", "serial_numbers": ["PUMP-042"],
     "content": "If pump temp exceeds 90 C check the cooling water flow and bearing grease. Overheat above 95 C requires shutdown."},
    {"doc_id": "pump-manual-5.1", "serial_numbers": ["PUMP-042"],
     "content": "Pump vibration above 7 mm/s indicates misalignment. Inspect the coupling and recent alerts history."},
    {"doc_id": "comp-guide-2.4", "serial_numbers": ["COMP-007"],
     "content": "Compressor temp spikes during start-up are normal for under 60 seconds. Re-read the temp sensor before acting."},
    {"doc_id": "hx-manual-1.1", "serial_numbers": ["HX-900"],
     "content": "Heat exchanger overheat above 95 C: isolate the hot side, verify fouling, and schedule cleaning."},
]
```

```python
# stages.py -- Requirements 2-6, typed. Only the signatures that change are shown in full.
from typing import Any

from tools import ToolFn

LIMITS: dict[str, float] = {"temp_c": 95.0, "pressure_psi": 200.0, "vibration_mm_s": 7.0}

# planner_stage, simple_embed, cosine_score, validator_stage: copy from Requirements 2, 3 and 5 and add type hints.


def retriever_stage(query: str, serial: str, docs: list[dict[str, Any]], top_k: int = 3) -> list[dict[str, Any]]:
    """Like Requirement 3, but return {"doc_id", "content", "score"} dicts so the report can cite sources."""
    # TODO(milestone 1)
    raise NotImplementedError


def executor_stage(tool_calls: list[dict[str, Any]], serial: str, tools: dict[str, ToolFn]) -> list[dict[str, Any]]:
    """Requirement 4's comprehension, with the registry passed in instead of a global TOOLS."""
    # TODO(milestone 1)
    raise NotImplementedError


def synthesizer_stage(query: str, context: list[dict[str, Any]], results: list[dict[str, Any]],
                      errors: list[str], retries: int) -> str:
    """FINDINGS, then REFERENCES (doc_id, score, content), then SAFETY (escalate if errors persist)."""
    # TODO(milestone 4)
    raise NotImplementedError
```

```python
# pipeline.py
import time
import uuid
from typing import Any

from observability import StructuredLogger, stage
from schemas import DiagnosticResponse, PipelineState
from stages import executor_stage, planner_stage, retriever_stage, synthesizer_stage, validator_stage
from tools import ToolFn


def run_pipeline(query: str, serial: str, documents: list[dict[str, Any]], tools: dict[str, ToolFn],
                 logger: StructuredLogger, max_retries: int = 3) -> DiagnosticResponse:
    state = PipelineState(run_id=uuid.uuid4().hex[:8], query=query, serial_number=serial)
    start = time.perf_counter()
    logger.log("pipeline_start", run_id=state.run_id, query=query, serial=serial)
    # TODO(milestone 2): retriever, planner, executor, validator, each inside `with stage(logger, run_id, name):`
    # TODO(milestone 3): while state.errors and state.retries < max_retries:
    #                        retries += 1; log "self_correction"; RE-EXECUTE the tools, then re-validate
    #                        inside `with stage(..., f"re-execute#{state.retries}")`
    # TODO(milestone 4): synthesizer; log "pipeline_end"; build DiagnosticResponse (sources = doc_ids)
    raise NotImplementedError
```

```python
# main.py -- uvicorn main:app --reload
import logging
from typing import Any

from fastapi import Depends, FastAPI, HTTPException

from documents import DOCUMENTS
from observability import StructuredLogger
from pipeline import run_pipeline
from schemas import DiagnosticRequest, DiagnosticResponse
from tools import TelemetrySource, default_telemetry, make_tools

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
app = FastAPI(title="Factory Diagnostic Agent OS", version="1.0.0")
_telemetry = default_telemetry()
_logger = StructuredLogger()


def get_telemetry() -> TelemetrySource:
    return _telemetry


def get_documents() -> list[dict[str, Any]]:
    return DOCUMENTS


def get_logger() -> StructuredLogger:
    return _logger


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/diagnose", response_model=DiagnosticResponse)
def diagnose(
    req: DiagnosticRequest,
    telemetry: TelemetrySource = Depends(get_telemetry),
    documents: list[dict[str, Any]] = Depends(get_documents),
    logger: StructuredLogger = Depends(get_logger),
) -> DiagnosticResponse:
    # plain `def`: the pipeline is synchronous, so FastAPI runs it in a worker thread
    # TODO(milestone 5): 404 if req.serial_number not in telemetry.known_serials()
    return run_pipeline(req.query, req.serial_number, documents, make_tools(telemetry), logger)


@app.get("/runs/{run_id}/trace")
def get_trace(run_id: str, logger: StructuredLogger = Depends(get_logger)) -> list[dict[str, Any]]:
    # TODO(milestone 5): logger.for_run(run_id); 404 "Run not found" when empty
    raise NotImplementedError
```

### Step-by-Step Milestones

1. **Stages in isolation.** Fill in `stages.py`, typing the Requirement 2–5 code and adapting `retriever_stage` and `executor_stage`.
   *Done when:* `python -c "from stages import retriever_stage; from documents import DOCUMENTS; print([d['doc_id'] for d in retriever_stage('overheat temp', 'HX-900', DOCUMENTS)])"` prints `['hx-manual-1.1']`.
2. **Traced, linear pipeline.** Implement `stage()` and the straight-line part of `run_pipeline`, without the loop yet.
   *Done when:* calling `run_pipeline` for `PUMP-042` logs `pipeline_start`, five `stage_end` events, and `pipeline_end`, all sharing one `run_id`.
3. **Real self-correction.** Add the re-execute loop.
   *Done when:* `COMP-007` returns `"retries": 1` with no validation errors (the spike cleared), and `HX-900` returns `"retries": 3` with two errors.
4. **Synthesizer with attribution.** Implement the REFERENCES and escalation lines.
   *Done when:* the `HX-900` report ends with `Persisted after 3 re-read(s): escalate to a human operator.`
5. **API surface.** Add the unknown-serial `404` and the trace endpoint.
   *Done when:* `curl -s -X POST localhost:8000/diagnose -H "Content-Type: application/json" -d '{"query":"status","serial_number":"NOPE-1"}'` returns `{"detail":"Unknown serial number NOPE-1"}`, and `GET /runs/<run_id>/trace` lists the stage events of a real run.
6. **Tests.** Add `tests/test_agent_os.py`, which uses `app.dependency_overrides` for the telemetry and the logger.
   *Done when:* `pytest -q` reports `12 passed`, and `/docs` shows the three endpoints.

### Sample Expected Output

The sample input is three requests against a freshly started server, using `default_telemetry()`. Run IDs and timings will differ.

```text
$ curl -s -X POST localhost:8000/diagnose -H "Content-Type: application/json" \
    -d '{"query":"Is pump PUMP-042 overheating? Any recent alerts?","serial_number":"PUMP-042"}'
```

```json
{
  "run_id": "f6365815",
  "answer": "DIAGNOSTIC REPORT\nQuery: Is pump PUMP-042 overheating? Any recent alerts?\n\nFINDINGS:\n  [get_machine_status] {'temp_c': 87.3, 'pressure_psi': 142.1, 'vibration_mm_s': 4.2}\n  [get_recent_alerts] [{'alert': 'high_temp', 'value': 92.1}]\n\nREFERENCES:\n  (pump-manual-5.1, score 0.202) Pump vibration above 7 mm/s indicates misalignment. Inspect the coupling and recent alerts history.\n  (pump-manual-3.2, score 0.0806) If pump temp exceeds 90 C check the cooling water flow and bearing grease. Overheat above 95 C requires shutdown.\n\nSAFETY:\n  All readings within safe limits.",
  "tool_calls_made": 2,
  "validation_errors": [],
  "total_elapsed_ms": 1.81,
  "retries": 0,
  "sources": ["pump-manual-5.1", "pump-manual-3.2"]
}
```

The `answer` field of `{"query": "Check compressor temp", "serial_number": "COMP-007"}` (`"retries": 1`, `"validation_errors": []`), printed as text:

```text
DIAGNOSTIC REPORT
Query: Check compressor temp

FINDINGS:
  [get_machine_status] {'temp_c': 91.0, 'pressure_psi': 149.2, 'vibration_mm_s': 3.0}

REFERENCES:
  (comp-guide-2.4, score 0.3974) Compressor temp spikes during start-up are normal for under 60 seconds. Re-read the temp sensor before acting.

SAFETY:
  All readings within safe limits (cleared after 1 re-read(s)).
```

The `answer` field of `{"query": "heat exchanger overheat", "serial_number": "HX-900"}` (`"retries": 3`, `"validation_errors": ["temp_c: 101.5 exceeds 95.0", "vibration_mm_s: 7.6 exceeds 7.0"]`):

```text
DIAGNOSTIC REPORT
Query: heat exchanger overheat

FINDINGS:
  [get_machine_status] {'temp_c': 101.5, 'pressure_psi': 188.0, 'vibration_mm_s': 7.6}

REFERENCES:
  (hx-manual-1.1, score 0.4472) Heat exchanger overheat above 95 C: isolate the hot side, verify fouling, and schedule cleaning.

SAFETY:
  ALERT: temp_c: 101.5 exceeds 95.0
  ALERT: vibration_mm_s: 7.6 exceeds 7.0
  Persisted after 3 re-read(s): escalate to a human operator.
```

Server log for the `COMP-007` run (structured events plus the `@timed` lines):

```text
INFO agent.trace: {"timestamp": "...", "event": "pipeline_start", "run_id": "6d96bf5e", "query": "Check compressor temp", "serial": "COMP-007"}
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "retriever", "ok": true, "elapsed_ms": 0.08}
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "planner", "ok": true, "elapsed_ms": 0.01}
INFO agent.tools: [TRACE] get_machine_status: 0.01ms
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "executor", "ok": true, "elapsed_ms": 3.02}
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "validator", "ok": true, "elapsed_ms": 0.07}
INFO agent.trace: {"timestamp": "...", "event": "self_correction", "run_id": "6d96bf5e", "attempt": 1, "errors": ["temp_c: 97.4 exceeds 95.0"]}
INFO agent.tools: [TRACE] get_machine_status: 0.01ms
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "re-execute#1", "ok": true, "elapsed_ms": 0.27}
INFO agent.trace: {"timestamp": "...", "event": "stage_end", "run_id": "6d96bf5e", "stage": "synthesizer", "ok": true, "elapsed_ms": 0.03}
INFO agent.trace: {"timestamp": "...", "event": "pipeline_end", "run_id": "6d96bf5e", "elapsed_ms": 9.27, "error_count": 0, "retries": 1}
```

Error paths: an unknown serial gives `404 {"detail": "Unknown serial number NOPE-1"}`. The request `{"query": "hi", "serial_number": "pump42"}` gives `422` with two errors, `string_too_short` at `["body", "query"]` and `string_pattern_mismatch` at `["body", "serial_number"]`.

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| planner keywords | `"Is it overheating?"`, `"any recent alerts"`, `"temp and alerts please"`, `"hello"` | status; alerts; both (in that order); status as the default |
| retriever filter | `"overheat temp"` for `HX-900` | only `hx-manual-1.1` |
| validator ignores lists | alerts result `[{"value": 999}]` | no errors |
| happy path | `PUMP-042`, reading in range, temp and alerts query | `200`, all 5 required keys, `tool_calls_made == 2`, `retries == 0` |
| transient spike | script `[HOT, OK]` | `retries == 1`, `validation_errors == []` |
| persistent fault | script `[HOT]` | `retries == 3`, one error, report says escalate |
| unknown serial | `NOPE-1` | `404` |
| invalid request | `query="hi"`, `serial_number="pump42"` | `422` on both fields |
| trace | spike run, then `GET /runs/{id}/trace` | stages `retriever, planner, executor, validator, re-execute#1, synthesizer`; unknown id gives `404` |

```python
# tests/test_agent_os.py -- run with: pytest -q
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from documents import DOCUMENTS  # noqa: E402
from main import app, get_logger, get_telemetry  # noqa: E402
from observability import StructuredLogger  # noqa: E402
from stages import planner_stage, retriever_stage, validator_stage  # noqa: E402
from tools import FakeTelemetry  # noqa: E402

OK = {"temp_c": 80.0, "pressure_psi": 100.0, "vibration_mm_s": 2.0}
HOT = {"temp_c": 99.0, "pressure_psi": 100.0, "vibration_mm_s": 2.0}


@pytest.fixture
def logger() -> StructuredLogger:
    return StructuredLogger()


def client_with(scripts: dict[str, list[dict[str, float]]], logger: StructuredLogger) -> TestClient:
    telemetry = FakeTelemetry(scripts, alerts={"PUMP-042": [{"alert": "high_temp", "value": 92.1}]})
    app.dependency_overrides[get_telemetry] = lambda: telemetry
    app.dependency_overrides[get_logger] = lambda: logger
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("query", "tools"),
    [
        ("Is it overheating?", ["get_machine_status"]),
        ("any recent alerts", ["get_recent_alerts"]),
        ("temp and alerts please", ["get_machine_status", "get_recent_alerts"]),
        ("hello", ["get_machine_status"]),
    ],
)
def test_planner_keywords(query: str, tools: list[str]) -> None:
    assert [c["tool_name"] for c in planner_stage(query)] == tools


def test_retriever_filters_by_serial() -> None:
    hits = retriever_stage("overheat temp", "HX-900", DOCUMENTS)
    assert [h["doc_id"] for h in hits] == ["hx-manual-1.1"]


def test_validator_ignores_non_dict_results() -> None:
    _, errors = validator_stage([{"tool": "get_recent_alerts", "result": [{"value": 999}]}])
    assert errors == []


def test_happy_path_response_shape(logger: StructuredLogger) -> None:
    r = client_with({"PUMP-042": [OK]}, logger).post(
        "/diagnose", json={"query": "temp and recent alerts", "serial_number": "PUMP-042"})
    assert r.status_code == 200
    body = r.json()
    assert {"run_id", "answer", "tool_calls_made", "validation_errors", "total_elapsed_ms"} <= body.keys()
    assert body["tool_calls_made"] == 2 and body["validation_errors"] == [] and body["retries"] == 0
    assert "All readings within safe limits." in body["answer"]


def test_transient_spike_clears_after_one_reread(logger: StructuredLogger) -> None:
    body = client_with({"PUMP-042": [HOT, OK]}, logger).post(
        "/diagnose", json={"query": "temp", "serial_number": "PUMP-042"}).json()
    assert body["retries"] == 1 and body["validation_errors"] == []


def test_persistent_fault_escalates_after_three_retries(logger: StructuredLogger) -> None:
    body = client_with({"PUMP-042": [HOT]}, logger).post(
        "/diagnose", json={"query": "temp", "serial_number": "PUMP-042"}).json()
    assert body["retries"] == 3
    assert body["validation_errors"] == ["temp_c: 99.0 exceeds 95.0"]
    assert "escalate to a human operator" in body["answer"]


def test_unknown_serial_is_404(logger: StructuredLogger) -> None:
    r = client_with({"PUMP-042": [OK]}, logger).post("/diagnose", json={"query": "temp", "serial_number": "NOPE-1"})
    assert r.status_code == 404


def test_bad_request_is_422(logger: StructuredLogger) -> None:
    r = client_with({"PUMP-042": [OK]}, logger).post("/diagnose", json={"query": "hi", "serial_number": "pump42"})
    assert r.status_code == 422
    assert {e["loc"][-1] for e in r.json()["detail"]} == {"query", "serial_number"}


def test_trace_endpoint_returns_every_stage(logger: StructuredLogger) -> None:
    c = client_with({"PUMP-042": [HOT, OK]}, logger)
    run_id = c.post("/diagnose", json={"query": "temp", "serial_number": "PUMP-042"}).json()["run_id"]
    events = c.get(f"/runs/{run_id}/trace").json()
    stages = [e["stage"] for e in events if e["event"] == "stage_end"]
    assert stages == ["retriever", "planner", "executor", "validator", "re-execute#1", "synthesizer"]
    assert events[0]["event"] == "pipeline_start" and events[-1]["event"] == "pipeline_end"
    assert c.get("/runs/doesnotexist/trace").status_code == 404
```

### Practice & Self-Check

**Q1 (predict the output).** In the first sample response, the question is about *overheating*, yet `pump-manual-5.1` (vibration) outranks `pump-manual-3.2` (temperature). Which exact words does each document share with the query under `simple_embed`?

**Q2 (predict the output).** Suppose you keep Requirement 6's original loop, which re-runs `validator_stage(tool_results)` without re-executing the tools. What do the `COMP-007` and `HX-900` responses report for `validation_errors`?

**Q3 (predict the output).** For `{"query": "Show recent alerts", "serial_number": "PUMP-042"}`, what are `tool_calls_made`, `validation_errors`, and the FINDINGS lines? Is the `high_temp` alert with value `92.1` ever checked against `LIMITS`?

**Exercise 1 (Easy).** Add a third tool, `get_maintenance_history(serial, limit=5)`, to `make_tools` and to `FakeTelemetry`, and route the keywords `"maint"` and `"history"` to it in `planner_stage`. Add a planner test and an end-to-end test that asserts `tool_calls_made == 1`.

**Exercise 2 (Medium).** Replace the keyword planner with an "LLM" planner. A `FakeLLM` returns raw JSON strings from a script. Validate the output with a Pydantic `ToolCall` model (`tool_name: Literal["get_machine_status", "get_recent_alerts"]`, `arguments: dict[str, Any]`) and apply Chapter 8's self-correction: retry with the error messages appended to the prompt for retriable errors, give up immediately on non-retriable ones, and fall back to the keyword planner after 3 attempts.

#### Dry-Run: Answers

**A1.** `simple_embed` splits on whitespace only, so punctuation stays attached to words: the query tokens include `overheating?` and `alerts?`, not `overheating` and `alerts`. `pump-manual-5.1` shares `{pump, recent}` with the query. `pump-manual-3.2` shares only `{pump}`, because its words are `temp`, `exceeds` and `Overheat`, and none of them equals a query token after `lower()`. More shared words gives the higher cosine score ($0.202$ vs $0.0806$). The fix is a real tokenizer (strip punctuation, stem `overheating` to `overheat`) or semantic embeddings, as in the Industrial RAG project.

**A2.** `COMP-007` reports `["temp_c: 97.4 exceeds 95.0"]` with 3 wasted iterations, a false alarm that a re-read would have cleared. `HX-900` reports the same two errors as before. The loop is a no-op in both cases: validation is a pure function of `tool_results`, and the same input always gives the same output. A self-correction loop must change *something* between attempts. Here that is fresh sensor data. In Chapter 8 it is a new prompt that includes the error messages.

**A3.** `tool_calls_made` is `1`, because only `get_recent_alerts` is planned. `"temp"` and `"overheat"` do not appear in the query, and the default branch only fires when `tools` is empty. `validation_errors` is `[]`. FINDINGS has a single line: `[get_recent_alerts] [{'alert': 'high_temp', 'value': 92.1}]`. The alert is **never** checked: `validator_stage` only inspects `dict` results, and this result is a `list`. That is harmless here ($92.1 < 95$), but it is a real gap. Exercise idea: validate each alert's `value` against the limit that its `alert` type implies.

**Exercise 1 sketch.** Add `history: dict[str, list[dict[str, Any]]]` to `FakeTelemetry` with a `read_history(serial, limit)` method, register `get_maintenance_history` in `make_tools`, and add `if "maint" in q or "history" in q: tools.append({"tool_name": "get_maintenance_history", "arguments": {"limit": 5}})` to the planner. Because `executor_stage` skips unknown tool names, forgetting the registry entry fails quietly with `tool_calls_made == 0`. Write that test first.

**Exercise 2 sketch.**

```python
class ToolCall(BaseModel):
    tool_name: Literal["get_machine_status", "get_recent_alerts"]
    arguments: dict[str, Any] = {}

PlanAdapter = TypeAdapter(list[ToolCall])

def llm_planner(query: str, llm: Callable[[str], str], max_retries: int = 3) -> list[dict[str, Any]]:
    prompt = f"Plan tool calls as a JSON list for: {query}"
    for _ in range(max_retries):
        raw = llm(prompt)
        try:
            return [c.model_dump() for c in PlanAdapter.validate_json(raw)]
        except ValidationError as e:
            if any(err["type"] in {"literal_error", "enum"} for err in e.errors()):
                break                                   # hallucinated tool name: not retriable
            prompt += f"\n\nFix errors: {[err['msg'] for err in e.errors()]}"
    return planner_stage(query)                         # deterministic fallback
```

Test it with a `FakeLLM` script `['{"oops": 1}', '[{"tool_name": "get_machine_status"}]']`. The first attempt fails with `list_type` (retriable), and the second succeeds. A script whose first reply names `"delete_database"` must fall back to the keyword planner after exactly one call.

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

