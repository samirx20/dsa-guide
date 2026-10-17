# Part 3, Topic 2: Function Routing
## Chapter 1: JSON Schema Generation

**Prerequisite Knowledge:** Basic understanding of Python functions, type hints, and tool calling.

---

### The 'Restaurant Menu' Analogy

Imagine the AI is a customer at a restaurant, and your Python functions are the chefs in the kitchen. The customer doesn't know what the chefs can cook until you hand them a Menu. This menu lists every available dish and exactly how to order it ("Burger: specify cheese type and meat temperature").

```
    ┌─────────────────────────────────────────────────────┐
    │                RESTAURANT MENU                       │
    │                                                     │
    │  DISH: read_sensor                                  │
    │    Required: sensor_id (string)                     │
    │    Optional: metric (string, default: "temperature")│
    │    Returns: dict                                    │
    │                                                     │
    │  DISH: set_alarm                                    │
    │    Required: sensor_id (string)                     │
    │    Required: threshold (number)                     │
    │    Required: direction (string: "above"|"below")    │
    │    Returns: bool                                    │
    │                                                     │
    │  The AI reads this menu and knows exactly            │
    │  how to order (call) each function.                  │
    └─────────────────────────────────────────────────────┘
```

In code, this "Menu" is called a JSON Schema. If you write the JSON Schema manually, you might make a typo and the AI will order something the chefs don't understand. Instead of writing the menu by hand, we write code that looks at the chef's recipes (your Python functions) and automatically prints out a perfect menu for the AI to read.

To let an LLM call your Python functions, you must describe those functions as JSON schemas. Manually writing schemas is error-prone and duplicates your type hints. Automatic schema generation introspects your function signatures and produces OpenAI-compatible tool definitions.

---

### 1. Introspecting Function Signatures

Python's `inspect` module gives you access to function parameters, type hints, and defaults.

```python
import inspect

def read_sensor(sensor_id: str, metric: str = "temperature") -> dict:
    """Read the current value from a sensor."""
    return {"sensor_id": sensor_id, metric: 0.0}

# inspect.signature looks under the hood of our function
sig = inspect.signature(read_sensor)

print(f"Function: {read_sensor.__name__}")
print(f"Docstring: {read_sensor.__doc__}")

# Loop through the arguments our function requires
for name, param in sig.parameters.items():
    # Check if the parameter has a default value
    has_default = param.default is not inspect.Parameter.empty
    default = param.default if has_default else "required"

    print(f"  {name}: type={param.annotation}, default={default}")
```

**What's happening:**
```python
sig = inspect.signature(read_sensor)
#    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#    └── Returns a Signature object containing all metadata
#        about the function's parameters

for name, param in sig.parameters.items():
#   ^^^^   ^^^^^
#   |      └── Parameter object with annotation, default, kind
#   └── Name of the parameter as a string

    has_default = param.default is not inspect.Parameter.empty
    #              ^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #              |                └── Sentinel: "no default was provided"
    #              └── The default value (or the sentinel if none)
```

Output:
```
Function: read_sensor
Docstring: Read the current value from a sensor.
  sensor_id: type=<class 'str'>, default=required
  metric: type=<class 'str'>, default=temperature
```

---

### 2. Converting Types to JSON Schema

Map Python types to JSON Schema types. LLMs expect standard JSON types, not Python classes.

```python
def python_type_to_json_schema(annotation) -> dict:
    # A dictionary mapping Python types to JSON string names
    type_map = {
        str: {"type": "string"},
        int: {"type": "integer"},
        float: {"type": "number"},
        bool: {"type": "boolean"},
        list: {"type": "array"},
        dict: {"type": "object"},
    }
    # Return the mapped type, default to string if unknown
    return type_map.get(annotation, {"type": "string"})

print(python_type_to_json_schema(str))
print(python_type_to_json_schema(int))
print(python_type_to_json_schema(float))
```

**What's happening:**
```python
type_map = {
    str: {"type": "string"},    # Python str → JSON "string"
    int: {"type": "integer"},   # Python int → JSON "integer"
    float: {"type": "number"},  # Python float → JSON "number"
    bool: {"type": "boolean"},  # Python bool → JSON "boolean"
    list: {"type": "array"},    # Python list → JSON "array"
    dict: {"type": "object"},   # Python dict → JSON "object"
}
# Each Python type maps to a JSON Schema type descriptor
# The LLM reads these to know what arguments to generate
```

Output:
```
{'type': 'string'}
{'type': 'integer'}
{'type': 'number'}
```

### Python Type to JSON Schema Mapping

| Python Type | JSON Schema Type | Example Value |
|------------|-----------------|---------------|
| `str` | `"string"` | `"hello"` |
| `int` | `"integer"` | `42` |
| `float` | `"number"` | `3.14` |
| `bool` | `"boolean"` | `true` / `false` |
| `list` | `"array"` | `[1, 2, 3]` |
| `dict` | `"object"` | `{"key": "value"}` |
| `None` | `"null"` | `null` |

---

### 3. Generating a Complete Tool Schema

Build a utility that converts any function into an OpenAI-compatible tool definition.

```python
import inspect
from typing import get_type_hints

def function_to_tool(func) -> dict:
    sig = inspect.signature(func)
    hints = get_type_hints(func)
    properties = {}
    required = []

    # Build the dictionary of properties based on function arguments
    for name, param in sig.parameters.items():
        if name == "self":
            continue

        prop = {}
        annotation = hints.get(name, str)

        # Determine the JSON type
        if hasattr(annotation, "__origin__"):
            prop["type"] = "array"
        elif annotation in (str, int, float, bool):
            prop = python_type_to_json_schema(annotation)
        else:
            prop["type"] = "string"

        # Check for defaults to see if the field is required
        if param.default is not inspect.Parameter.empty:
            prop["default"] = param.default
        else:
            required.append(name)

        properties[name] = prop

    # Return the exact shape OpenAI expects
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

def read_sensor(sensor_id: str, metric: str = "temperature") -> dict:
    """Read the current value from a sensor."""
    return {"sensor_id": sensor_id, metric: 0.0}

def set_alarm(sensor_id: str, threshold: float, direction: str) -> bool:
    """Set an alarm threshold for a sensor."""
    return True

tool1 = function_to_tool(read_sensor)
tool2 = function_to_tool(set_alarm)

import json
print(json.dumps(tool1, indent=2))
print()
print(json.dumps(tool2, indent=2))
```

**What's happening:**
```python
sig = inspect.signature(func)
# Get function parameters: names, types, defaults

hints = get_type_hints(func)
# Get type annotations: {sensor_id: str, metric: str}

for name, param in sig.parameters.items():
    # For each parameter:
    if param.default is not inspect.Parameter.empty:
        prop["default"] = param.default  # Has default → optional
    else:
        required.append(name)            # No default → required

# The final structure matches OpenAI's tool calling format:
return {
    "type": "function",              # Always "function"
    "function": {
        "name": func.__name__,       # Python function name
        "description": func.__doc__, # Docstring → LLM reads this
        "parameters": {
            "type": "object",        # Always "object"
            "properties": {...},     # Parameter definitions
            "required": [...]        # Which params are mandatory
        }
    }
}
```

Output:
```json
{
  "type": "function",
  "function": {
    "name": "read_sensor",
    "description": "Read the current value from a sensor",
    "parameters": {
      "type": "object",
      "properties": {
        "sensor_id": {"type": "string"},
        "metric": {"type": "string", "default": "temperature"}
      },
      "required": ["sensor_id"]
    }
  }
}

{
  "type": "function",
  "function": {
    "name": "set_alarm",
    "description": "Set an alarm threshold for a sensor",
    "parameters": {
      "type": "object",
      "properties": {
        "sensor_id": {"type": "string"},
        "threshold": {"type": "number"},
        "direction": {"type": "string"}
      },
      "required": ["sensor_id", "threshold", "direction"]
    }
  }
}
```

---

### 4. Handling Complex Types

For `Literal`, `Optional`, and nested types, extend the schema generator.

```python
from typing import Literal, Optional

def advanced_type_to_schema(annotation) -> dict:
    # Check if the type is complex (like Literal or list)
    if hasattr(annotation, "__origin__"):
        origin = annotation.__origin__

        if origin is Literal:
            # Literals translate to Enums in JSON Schema
            return {"type": "string", "enum": list(annotation.__args__)}

        if origin is list:
            # Arrays need to define what items they hold
            args = annotation.__args__
            item_schema = advanced_type_to_schema(args[0]) if args else {"type": "string"}
            return {"type": "array", "items": item_schema}

    if annotation in (str, int, float, bool):
        return python_type_to_json_schema(annotation)

    return {"type": "string"}

print(advanced_type_to_schema(Literal["start", "stop", "restart"]))
print(advanced_type_to_schema(list[str]))
print(advanced_type_to_schema(Optional[float]))
```

**What's happening:**
```python
if origin is Literal:
    return {"type": "string", "enum": list(annotation.__args__)}
    #                        ^^^^
    #                        └── "enum" tells the LLM exactly which values are allowed
    #                            LLM will only generate one of these strings

if origin is list:
    args = annotation.__args__
    #      ^^^^^^^^^^^^^^^^^
    #      └── (str,) for list[str], (int,) for list[int]
    item_schema = advanced_type_to_schema(args[0])
    return {"type": "array", "items": item_schema}
    #                          ^^^^^
    #                          └── Defines what type each array element must be
```

Output:
```
{'type': 'string', 'enum': ['start', 'stop', 'restart']}
{'type': 'array', 'items': {'type': 'string'}}
{'type': 'number'}
```

### Type Handling Comparison

| Python Type | JSON Schema Output | LLM Behavior |
|------------|-------------------|--------------|
| `Literal["a","b"]` | `{"type":"string","enum":["a","b"]}` | Picks from exact list |
| `list[str]` | `{"type":"array","items":{"type":"string"}}` | Generates array of strings |
| `Optional[float]` | `{"type":"number"}` | Can omit or provide number |
| `dict` | `{"type":"object"}` | Generates key-value object |
| `str` | `{"type":"string"}` | Free-form text |

---

### 5. Batch Generation for Multiple Functions

Generate schemas for an entire module of functions at once so you don't have to call it one by one.

```python
def batch_generate_tools(functions: list) -> list[dict]:
    # Using list comprehension to convert a list of functions into a list of schemas
    return [function_to_tool(f) for f in functions]

def read_cpu() -> dict:
    """Read current CPU usage percentage."""
    return {"cpu_percent": 45.2}

def read_memory() -> dict:
    """Read current memory usage."""
    return {"memory_gb": 8.5, "total_gb": 16.0}

def list_processes() -> list[str]:
    """List running process names."""
    return ["python", "nginx", "postgres"]

tools = batch_generate_tools([read_cpu, read_memory, list_processes])

print(f"Generated {len(tools)} tool schemas")
for tool in tools:
    print(f"  - {tool['function']['name']}: {tool['function']['description']}")
```

**What's happening:**
```python
tools = batch_generate_tools([read_cpu, read_memory, list_processes])
#       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#       └── Takes a list of functions, returns a list of schemas
#           Each schema describes one function for the LLM
#
# The resulting `tools` list can be sent directly to the
# OpenAI API in the `tools` parameter of chat completions
```

Output:
```
Generated 3 tool schemas
  - read_cpu: Read current CPU usage percentage.
  - read_memory: Read current memory usage.
  - list_processes: List running process names.
```

---

### Quick Reference

| Function/Concept | Purpose | Output |
|------------------|---------|--------|
| `inspect.signature(func)` | Get function parameters | Signature object |
| `get_type_hints(func)` | Get type annotations | Dict of name → type |
| `python_type_to_json_schema(t)` | Map Python type to JSON | `{"type": "string"}` |
| `function_to_tool(func)` | Full OpenAI tool schema | `{"type":"function",...}` |
| `batch_generate_tools(funcs)` | Generate schemas for many functions | `list[dict]` |
| `annotation.__origin__` | Check if type is generic | `list`, `Literal`, etc. |
| `annotation.__args__` | Get generic type arguments | `(str,)`, `("a","b")` |
| `param.default` | Get parameter default | Value or `inspect.Parameter.empty` |

---

### Summary

JSON schema generation introspects Python functions to produce OpenAI-compatible tool definitions. Use `inspect.signature` for parameters, `get_type_hints` for annotations, and map Python types to JSON Schema types. Handle `Literal` for enums, `list` for arrays, and `Optional` for nullable fields. Batch generation lets you register entire function libraries with one call. The docstring becomes the description the LLM uses to decide when to call each function.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: JSON Schema Generation**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter4 json schema generation**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

