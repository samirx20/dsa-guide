# Part 8, Topic 1: Function Routing
## Project 1: Tool-Calling Diagnostic Bot

An LLM can only monitor your servers if it can call functions that read real data. This project builds a diagnostic bot that generates JSON schemas from Python functions, simulates LLM tool calls, routes and executes them, and returns structured results in a full conversation loop.

### Goal

You will demonstrate that you can define Python functions for system monitoring, generate OpenAI-compatible tool schemas from them, simulate an LLM returning tool_call objects, route and execute those calls, and return structured results.

### Requirements

#### 1. Define Three Diagnostic Functions

Create `read_cpu()`, `read_memory()`, and `list_processes()` that return mock system data.

```python
def read_cpu() -> dict:
    """Read current CPU usage percentage and load average."""
    return {
        "cpu_percent": 45.2,
        "load_avg_1m": 1.2,
        "load_avg_5m": 0.9,
        "cores": 8,
    }

def read_memory() -> dict:
    """Read current memory usage."""
    return {
        "used_gb": 12.3,
        "total_gb": 32.0,
        "available_gb": 19.7,
        "swap_used_gb": 0.5,
    }

def list_processes() -> list[dict]:
    """List top processes by CPU usage."""
    return [
        {"pid": 1234, "name": "python", "cpu_percent": 12.5, "memory_mb": 256},
        {"pid": 5678, "name": "nginx", "cpu_percent": 2.1, "memory_mb": 48},
        {"pid": 9012, "name": "postgres", "cpu_percent": 8.3, "memory_mb": 512},
    ]
```

#### 2. Generate Tool Schemas

Use the `function_to_tool` utility from the previous chapter to generate schemas.

```python
import inspect
from typing import get_type_hints

def python_type_to_json_schema(annotation) -> dict:
    type_map = {
        str: {"type": "string"},
        int: {"type": "integer"},
        float: {"type": "number"},
        bool: {"type": "boolean"},
    }
    return type_map.get(annotation, {"type": "string"})

def function_to_tool(func) -> dict:
    sig = inspect.signature(func)
    hints = get_type_hints(func)
    properties = {}
    required = []

    for name, param in sig.parameters.items():
        annotation = hints.get(name, str)
        prop = python_type_to_json_schema(annotation)
        if param.default is not inspect.Parameter.empty:
            prop["default"] = param.default
        else:
            required.append(name)
        properties[name] = prop

    return {
        "type": "function",
        "function": {
            "name": func.__name__,
            "description": func.__doc__ or f"Execute {func.__name__}",
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            }
        }
    }

tools = [function_to_tool(f) for f in [read_cpu, read_memory, list_processes]]
print(f"Generated {len(tools)} tool schemas")
for t in tools:
    print(f"  - {t['function']['name']}: {t['function']['description']}")
```

#### 3. Build the FunctionRouter

Create a router that maps function names to callables and executes them safely.

```python
import json

class FunctionRouter:
    def __init__(self):
        self._registry = {}
        self._log = []

    def register(self, name: str, func):
        self._registry[name] = func
        return self

    def execute(self, name: str, arguments: str) -> dict:
        entry = {"function": name, "arguments": arguments}

        if name not in self._registry:
            entry["status"] = "error"
            entry["error"] = f"Unknown function: {name}"
            self._log.append(entry)
            return entry

        try:
            args = json.loads(arguments) if arguments else {}
        except json.JSONDecodeError as e:
            entry["status"] = "error"
            entry["error"] = f"Invalid JSON: {e}"
            self._log.append(entry)
            return entry

        try:
            result = self._registry[name](**args)
            entry["status"] = "ok"
            entry["result"] = result
        except Exception as e:
            entry["status"] = "error"
            entry["error"] = str(e)

        self._log.append(entry)
        return entry

router = FunctionRouter()
router.register("read_cpu", read_cpu)
router.register("read_memory", read_memory)
router.register("list_processes", list_processes)
```

#### 4. Simulate the Full Conversation Loop

Simulate the LLM returning tool calls, execute them, and build the final response.

```python
llm_tool_calls = [
    {
        "id": "call_001",
        "function": {"name": "read_cpu", "arguments": "{}"}
    },
    {
        "id": "call_002",
        "function": {"name": "read_memory", "arguments": "{}"}
    },
    {
        "id": "call_003",
        "function": {"name": "list_processes", "arguments": "{}"}
    },
]

messages = [
    {"role": "system", "content": "You are a server diagnostic assistant."},
    {"role": "user", "content": "Give me a full system health report."},
]

print("=== LLM Response: Tool Calls ===")
for call in llm_tool_calls:
    print(f"  Calling: {call['function']['name']}({call['function']['arguments']})")

print("\n=== Executing Tool Calls ===")
tool_results = []
for call in llm_tool_calls:
    result = router.execute(call["function"]["name"], call["function"]["arguments"])
    tool_results.append({
        "role": "tool",
        "tool_call_id": call["id"],
        "content": json.dumps(result)
    })
    status = result["status"]
    print(f"  {call['function']['name']}: {status}")

print("\n=== Tool Results ===")
for tr in tool_results:
    parsed = json.loads(tr["content"])
    print(f"  [{tr['tool_call_id']}] {parsed.get('function', '?')}: {parsed['status']}")

print("\n=== Final Conversation State ===")
final_messages = messages + [
    {"role": "assistant", "content": None, "tool_calls": llm_tool_calls}
] + tool_results

for msg in final_messages:
    role = msg["role"]
    if role == "tool":
        print(f"  {role}: (result for {msg['tool_call_id']})")
    elif msg.get("tool_calls"):
        names = [tc["function"]["name"] for tc in msg["tool_calls"]]
        print(f"  {role}: tool_calls={names}")
    else:
        content = (msg.get("content") or "")[:60]
        print(f"  {role}: {content}")

print("\n=== Audit Log ===")
for entry in router._log:
    print(f"  {entry['function']}: {entry['status']}")
```

### Evaluation Checklist

- [ ] Three functions defined (read_cpu, read_memory, list_processes) with docstrings
- [ ] Tool schemas generated automatically from function signatures
- [ ] FunctionRouter maps names to callables and executes safely
- [ ] JSON argument parsing handles empty dicts and malformed input
- [ ] Simulated LLM tool_calls are executed in sequence
- [ ] Tool results are formatted with tool_call_id and JSON content
- [ ] Final message list shows the complete conversation structure
- [ ] Audit log tracks every function call with status
- [ ] Error cases handled (unknown function, bad JSON, execution failure)
- [ ] Full loop runs without errors and produces structured output

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Schemas from the project's generator.** Using this project's `function_to_tool`, which has only four mapped types and no `__origin__` handling, what is `["function"]["parameters"]` for each function?

```python
read_cpu                                   # (a)

def read_disk(path: str = "/", warn_pct: float = 90.0, mounts: list[str] = None) -> dict:   # (b)
    """Read disk usage."""
    return {}
```

**Q2. Statuses for a messier LLM response.** Replace `llm_tool_calls` with the calls below and run the "Executing Tool Calls" loop on a fresh `router`. What status is printed for each, what is the error text for the failures, and how many entries does `router._log` hold afterwards?

| id | name | arguments |
|---|---|---|
| call_001 | `read_cpu` | `""` (empty string) |
| call_002 | `kill_process` | `'{"pid": 1234}'` |
| call_003 | `list_processes` | `'{"top": 2}'` |
| call_004 | `read_memory` | `'{}}'` |

**Q3. What does the model actually receive?** In the original simulation, what is `len(final_messages)`? Then: what exact JSON string is the `content` of the `read_memory` tool message? (Hint: look at what `router.execute` returns.)

**Q4. Numbers from the mock data.** Using the project's mock return values, compute: memory used as a percentage of total (rounded to 1 decimal), the summed `cpu_percent` of the three listed processes, their summed `memory_mb`, and the name of the top process by CPU.

### Coding Exercises

**E1 (Easy).** Write `health_summary(cpu, mem, procs, cpu_warn=80.0, mem_warn=90.0) -> dict` that returns `{"cpu_percent", "mem_used_pct" (1 decimal), "top_process" (name, or None if the list is empty), "status"}`. `status` is `"warning"` if CPU $>$ `cpu_warn` or memory % $>$ `mem_warn`, otherwise `"ok"`.

- `health_summary(read_cpu(), read_memory(), list_processes())` → `{'cpu_percent': 45.2, 'mem_used_pct': 38.4, 'top_process': 'python', 'status': 'ok'}`
- `health_summary({"cpu_percent": 45.2}, {"used_gb": 30.0, "total_gb": 32.0}, [])` → `{'cpu_percent': 45.2, 'mem_used_pct': 93.8, 'top_process': None, 'status': 'warning'}`

**E2 (Easy–Medium).** Add a fourth tool `get_process(pid: int) -> dict` (with a docstring) that looks up a process from `list_processes()` by PID. It raises `LookupError(f"No process with pid {pid}")` for unknown PIDs, and `TypeError` if `pid` is not a real `int`, because the LLM may send `"5678"`. Register it, then show its generated schema and the router results.

- Schema parameters → `{"type": "object", "properties": {"pid": {"type": "integer"}}, "required": ["pid"]}`
- `router.execute("get_process", '{"pid": 5678}')` → `status='ok'`, result is the nginx dict
- `'{"pid": 1}'` → `error='No process with pid 1'`, and `'{"pid": "5678"}'` → `error='pid must be an integer, got str'`

**E3 (Medium).** Write `simulate_round(router, tool_calls) -> tuple[list[dict], dict]`. It returns one `tool` message per call, whose `content` is **only** the tool's result (or `{"error": ...}`), not the router's audit envelope, plus a `{"ok": n, "error": m}` count. Raise `ValueError` if two calls share an `id`.

- Calls `read_cpu("{}")`, `get_process('{"pid": 9012}')`, `get_process('{"pid": 1}')` → contents `'{"cpu_percent": 45.2, ...}'`, `'{"pid": 9012, "name": "postgres", ...}'`, `'{"error": "No process with pid 1"}'`; counts `{'ok': 2, 'error': 1}`

#### Dry-Run: Answers

**Q1.**
(a) `{"type": "object", "properties": {}, "required": []}`. No parameters, so there is nothing to describe. The LLM must call it with `"{}"`.
(b) `{"type": "object", "properties": {"path": {"type": "string", "default": "/"}, "warn_pct": {"type": "number", "default": 90.0}, "mounts": {"type": "string", "default": null}}, "required": []}`. Every parameter has a default, so `required` is empty. `list[str]` is not in this project's 4-entry `type_map`, so it silently falls back to `"string"`, and the `None` default becomes JSON `null`. The LLM would be told to send a string for a list.

**Q2.**

| Call | Status | Error |
|---|---|---|
| `read_cpu`, `""` | `ok` | (none). The `if arguments else {}` guard turns `""` into `{}`. |
| `kill_process` | `error` | `Unknown function: kill_process` |
| `list_processes`, `{"top": 2}` | `error` | `list_processes() got an unexpected keyword argument 'top'` |
| `read_memory`, `'{}}'` | `error` | `Invalid JSON: Extra data: line 1 column 3 (char 2)` |

`len(router._log) == 4`. Every path, including both early returns, appends to the log before returning.

**Q3.** `len(final_messages) == 6`: 2 (system, user) + 1 (assistant with 3 tool calls) + 3 tool results. The `read_memory` tool content is the **whole router entry**:

```json
{"function": "read_memory", "arguments": "{}", "status": "ok", "result": {"used_gb": 12.3, "total_gb": 32.0, "available_gb": 19.7, "swap_used_gb": 0.5}}
```

That is why the "Tool Results" printout can read `parsed.get('function')` and `parsed['status']`. The model receives audit metadata it did not ask for, which wastes tokens. E3 sends only the result.

**Q4.**
- Memory: $\frac{12.3}{32.0} \times 100 = 38.4375\% \approx 38.4\%$
- CPU sum: $12.5 + 2.1 + 8.3 = 22.9\%$
- Memory sum: $256 + 48 + 512 = 816$ MB
- Top by CPU: `python` ($12.5$)

**E1 — reference solution**

```python
def health_summary(cpu: dict, mem: dict, procs: list[dict],
                   cpu_warn: float = 80.0, mem_warn: float = 90.0) -> dict:
    mem_pct = round(mem["used_gb"] / mem["total_gb"] * 100, 1)
    top = max(procs, key=lambda p: p["cpu_percent"])["name"] if procs else None
    status = "warning" if cpu["cpu_percent"] > cpu_warn or mem_pct > mem_warn else "ok"
    return {"cpu_percent": cpu["cpu_percent"], "mem_used_pct": mem_pct,
            "top_process": top, "status": status}
```

Second example: $30 / 32 \times 100 = 93.75$, which rounds to $93.8 > 90$, so `"warning"`. The `if procs else None` guard avoids `max()` raising on an empty list. $O(p)$ in the number of processes. Computing the verdict in deterministic code, rather than asking the LLM to do the arithmetic, keeps the status reliable.

**E2 — reference solution**

```python
_PROCESSES = {p["pid"]: p for p in list_processes()}

def get_process(pid: int) -> dict:
    """Get details for one process by PID."""
    if not isinstance(pid, int) or isinstance(pid, bool):   # the LLM may send "5678" or true
        raise TypeError(f"pid must be an integer, got {type(pid).__name__}")
    if pid not in _PROCESSES:
        raise LookupError(f"No process with pid {pid}")
    return _PROCESSES[pid]

router.register("get_process", get_process)
print(function_to_tool(get_process)["function"]["parameters"])
# {'type': 'object', 'properties': {'pid': {'type': 'integer'}}, 'required': ['pid']}
```

The router catches both exceptions and stores `str(e)`, so the LLM gets a readable error instead of a crash. $O(1)$ lookup via the dict index. `bool` is excluded explicitly because `True` is an instance of `int` in Python.

**E3 — reference solution**

```python
import json

def simulate_round(router, tool_calls: list[dict]) -> tuple[list[dict], dict]:
    ids = [c["id"] for c in tool_calls]
    if len(ids) != len(set(ids)):
        raise ValueError(f"Duplicate tool_call ids: {ids}")
    messages, counts = [], {"ok": 0, "error": 0}
    for call in tool_calls:
        entry = router.execute(call["function"]["name"], call["function"]["arguments"])
        counts[entry["status"]] += 1
        payload = entry["result"] if entry["status"] == "ok" else {"error": entry["error"]}
        messages.append({"role": "tool", "tool_call_id": call["id"],
                         "content": json.dumps(payload)})   # only what the model needs
    return messages, counts
```

The router still keeps its full audit log internally, but the conversation now carries only results. Duplicate ids are rejected up front because the API matches results to requests **by id**, so two results with the same id would be ambiguous. $O(k)$ for $k$ calls.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Tool-Calling Diagnostic Bot**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project tool calling bot**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

