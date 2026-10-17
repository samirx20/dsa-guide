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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Introspection loop.** Run the chapter's section 1 loop (`has_default` / `default`) on this function. What are the four printed lines?

```python
def move_joint(joint: str, angle_deg: float, speed: float = 0.5, dry_run: bool = False) -> dict:
    """Move one robot joint to an absolute angle."""
    return {}
```

**Q2. Generated parameters.** What is `function_to_tool(move_joint)["function"]["parameters"]`, written as JSON? What is the `description`, character for character?

**Q3. Where the simple generator breaks.** Using the chapter's `function_to_tool`, what are the `properties` and `required` for each function?

```python
def set_mode(pump_id: str, mode: Literal["start", "stop"] = "stop") -> bool:
    return True

def ping(host, retries: int = 3):        # host has no annotation, and there is no docstring
    return True
```

**Q4. `advanced_type_to_schema` as written.** Predict each result. Compare (a) with the chapter's printed output for `Optional[float]`.

```python
advanced_type_to_schema(Optional[float])           # (a)
advanced_type_to_schema(list[Literal["a", "b"]])   # (b)
advanced_type_to_schema(list)                      # (c)  bare list, no [..]
advanced_type_to_schema(Literal[1, 2, 3])          # (d)
```

### Coding Exercises

**E1 (Easy).** Write `schema_for(annotation) -> dict` using `typing.get_origin` / `get_args`. It must handle:
- primitives (`str`, `int`, `float`, `bool`, bare `list`, bare `dict`);
- `Literal[...]` (use `"integer"` when every value is an int, otherwise `"string"`);
- `Optional[X]` and `X | None` (unwrap to `X`);
- other unions (`{"anyOf": [...]}`);
- `list[X]` (recursive `items`);
- `dict[K, V]` (`{"type": "object"}`).

Examples:
- `schema_for(Optional[float])` → `{'type': 'number'}`
- `schema_for(Literal[1, 2, 3])` → `{'type': 'integer', 'enum': [1, 2, 3]}`
- `schema_for(int | str)` → `{'anyOf': [{'type': 'integer'}, {'type': 'string'}]}`

**E2 (Easy–Medium).** Write `function_to_tool_v2(func)` built on `schema_for`. It should skip `self`/`cls`, `*args` and `**kwargs`, and use only the **first line** of the cleaned docstring (`inspect.getdoc`) as the description.

```python
def set_mode(pump_id: str, mode: Literal["start", "stop"] = "stop", *args,
             rpm: Optional[int] = None, **kwargs) -> bool:
    """Set the pump operating mode.

    Longer notes for humans that the LLM does not need.
    """
```

→ description `"Set the pump operating mode."`, properties `pump_id` (string), `mode` (string enum, default `"stop"`), `rpm` (integer, default `null`), required `["pump_id"]`

**E3 (Medium).** Use Pydantic as the single source of truth. Write `tool_from_model(name, description, model_cls)`, which builds the tool from `model_cls.model_json_schema()` with the auto-generated `"title"` keys removed. Also write `call_with_model(func, model_cls, arguments_json) -> dict`, which validates the LLM's argument string and returns `{"result": ...}` or `{"error": ["<loc>: <msg>", ...]}`. Test with:

```python
class SetAlarmArgs(BaseModel):
    sensor_id: str = Field(pattern=r"^[A-Z]-\d{2}$", description="Sensor id, e.g. T-01")
    threshold: float = Field(ge=-50, le=200)
    direction: Literal["above", "below"]
```

- `threshold` in the schema → `{"maximum": 200, "minimum": -50, "type": "number"}`
- `call_with_model(set_alarm, SetAlarmArgs, '{"sensor_id": "T-01", "threshold": "85", "direction": "above"}')` → `{'result': True}`
- `'{"sensor_id": "T-1", "threshold": 900, "direction": "up"}'` → three errors (`sensor_id`, `threshold`, `direction`)

#### Dry-Run: Answers

**Q1.**

```
  joint: type=<class 'str'>, default=required
  angle_deg: type=<class 'float'>, default=required
  speed: type=<class 'float'>, default=0.5
  dry_run: type=<class 'bool'>, default=False
```

`dry_run` has a default (`False`), so it prints `False`, not `required`. The check is `is not inspect.Parameter.empty`, not truthiness, so a falsy default still counts as a default.

**Q2.**

```json
{"type": "object",
 "properties": {"joint": {"type": "string"},
                "angle_deg": {"type": "number"},
                "speed": {"type": "number", "default": 0.5},
                "dry_run": {"type": "boolean", "default": false}},
 "required": ["joint", "angle_deg"]}
```

`description` is `"Move one robot joint to an absolute angle."`, **with** the trailing period, because `func.__doc__` is used verbatim. (The chapter's printed JSON drops the period, but the code keeps it.) Python `False` becomes JSON `false`.

**Q3.**
- `set_mode`: `properties = {"pump_id": {"type": "string"}, "mode": {"type": "array", "default": "stop"}}`, `required = ["pump_id"]`. `Literal[...]` has an `__origin__`, and the first branch maps *anything* with `__origin__` to `"array"`. The LLM is told `mode` is an array whose default is a string, which is self-contradictory.
- `ping`: `properties = {"host": {"type": "string"}, "retries": {"type": "integer", "default": 3}}`, `required = ["host"]`, `description = "Execute ping"`. A missing annotation falls back to `hints.get(name, str)`, and a missing docstring falls back to `f"Execute {func.__name__}"`.

**Q4.**

| Call | Result | Why |
|---|---|---|
| (a) | `{'type': 'string'}` | `Optional[float]` is `Union[float, None]`. Its origin is `Union`, which is neither `Literal` nor `list`, and the union itself is not in the primitive tuple, so it hits the fallback. The chapter's printed `{'type': 'number'}` is **not** what this code produces. E1 fixes it. |
| (b) | `{'type': 'array', 'items': {'type': 'string', 'enum': ['a', 'b']}}` | the list branch recurses into the Literal branch |
| (c) | `{'type': 'string'}` | bare `list` has no `__origin__` and is not in `(str, int, float, bool)` |
| (d) | `{'type': 'string', 'enum': [1, 2, 3]}` | the type is hard-coded `"string"` even though the enum values are ints, which is an inconsistent schema |

**E1 — reference solution**

```python
import types
from typing import Any, Literal, Union, get_args, get_origin

PRIMITIVES = {str: "string", int: "integer", float: "number", bool: "boolean",
              list: "array", dict: "object"}

def schema_for(annotation: Any) -> dict:
    origin, args = get_origin(annotation), get_args(annotation)
    if origin is Literal:
        values = list(args)
        if all(isinstance(v, bool) for v in values):
            json_type = "boolean"
        elif all(isinstance(v, int) and not isinstance(v, bool) for v in values):
            json_type = "integer"
        else:
            json_type = "string"
        return {"type": json_type, "enum": values}
    if origin in (Union, types.UnionType):            # Optional[X], X | None, X | Y
        non_null = [a for a in args if a is not type(None)]
        if len(non_null) == 1:
            return schema_for(non_null[0])
        return {"anyOf": [schema_for(a) for a in non_null]}
    if origin is list:
        return {"type": "array", "items": schema_for(args[0]) if args else {}}
    if origin is dict:
        return {"type": "object"}
    if annotation in PRIMITIVES:
        return {"type": PRIMITIVES[annotation]}
    return {"type": "string"}
```

`get_origin(Optional[float])` is `typing.Union`, and `get_origin(float | None)` is `types.UnionType`, so both are checked. The `bool` test comes before the `int` test because `bool` is a subclass of `int`. Cost is linear in the size of the type expression.

**E2 — reference solution**

```python
import inspect
from typing import get_type_hints

def function_to_tool_v2(func) -> dict:
    sig = inspect.signature(func)
    hints = get_type_hints(func)
    properties: dict[str, dict] = {}
    required: list[str] = []
    for name, param in sig.parameters.items():
        if name in ("self", "cls") or param.kind in (param.VAR_POSITIONAL, param.VAR_KEYWORD):
            continue                                     # *args / **kwargs cannot be described
        prop = schema_for(hints.get(name, str))
        if param.default is inspect.Parameter.empty:
            required.append(name)
        else:
            prop["default"] = param.default
        properties[name] = prop
    doc = inspect.getdoc(func) or f"Execute {func.__name__}"   # getdoc strips indentation
    return {"type": "function",
            "function": {"name": func.__name__,
                         "description": doc.splitlines()[0],
                         "parameters": {"type": "object", "properties": properties,
                                        "required": required}}}
```

`rpm` is keyword-only but still a normal named parameter, so it is kept (`Optional[int]` gives `"integer"`, default `None`, which is JSON `null`). $O(p)$ in the number of parameters.

**E3 — reference solution**

```python
from pydantic import BaseModel, ValidationError

def tool_from_model(name: str, description: str, model_cls: type[BaseModel]) -> dict:
    schema = model_cls.model_json_schema()
    schema.pop("title", None)                          # "SetAlarmArgs" is noise for the LLM
    for prop in schema.get("properties", {}).values():
        prop.pop("title", None)
    return {"type": "function",
            "function": {"name": name, "description": description, "parameters": schema}}

def call_with_model(func, model_cls: type[BaseModel], arguments_json: str) -> dict:
    try:
        args = model_cls.model_validate_json(arguments_json)
    except ValidationError as e:
        return {"error": [f"{'.'.join(map(str, err['loc']))}: {err['msg']}" for err in e.errors()]}
    return {"result": func(**args.model_dump())}
```

Pydantic emits `ge`/`le` as `minimum`/`maximum`, `pattern` as `pattern`, and `Literal` as `enum`, so the schema the LLM sees and the validation that runs are generated from **one** class and cannot drift apart. The `"85"` string is coerced to `85.0`. The bad call returns `"sensor_id: String should match pattern ..."`, `"threshold: Input should be less than or equal to 200"` and `"direction: Input should be 'above' or 'below'"`. Those messages can be sent straight back to the model as the tool result.

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

