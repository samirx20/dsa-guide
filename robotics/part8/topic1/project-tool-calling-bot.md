# Part 3, Topic 2: Function Routing
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

