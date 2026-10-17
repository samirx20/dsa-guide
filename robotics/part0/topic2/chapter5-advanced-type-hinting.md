# Part 0, Topic 1: Python Systems Basics
## Chapter 2: Advanced Type Hinting

**Prerequisite Knowledge:** Basic Python variables and functions, introductory understanding of type hints (like `int`, `str`, `list`).

---

### The "Shape Sorter" Analogy (Expanded)

Imagine a toddler's shape sorter toy. You have blocks of different shapes and a box with matching holes. Type hints are like those holes. If you try to push a square block (like a text string) into a round hole (a function expecting a number), it won't fit. Advanced type hinting gives us more complex shapes and holes, making sure our data fits perfectly before we ever turn our program on.

```
┌──────────────────────────────────────────────────────────────┐
│                 BASIC vs ADVANCED TYPE HINTS                  │
│                                                              │
│  Basic (Chapter 1):          Advanced (This Chapter):        │
│  ┌──────────────────┐       ┌──────────────────────────┐    │
│  │  int              │       │  TypeVar("T")            │    │
│  │  str              │       │  Generic[Stack[T]]       │    │
│  │  float            │       │  Union[str, float]       │    │
│  │  bool             │       │  Optional[str]           │    │
│  │  list[str]        │       │  Callable[[str], dict]   │    │
│  │  dict[str, int]   │       │  TypedDict({...})        │    │
│  │                   │       │  Protocol({...})         │    │
│  │  Simple shapes    │       │  Complex shapes          │    │
│  └──────────────────┘       └──────────────────────────┘    │
│                                                              │
│  Basic: "This is a number"                                   │
│  Advanced: "This is a function that takes a string and       │
│             returns a dict, or this is a stack that works     │
│             with any type, or this is a protocol any agent    │
│             must follow"                                      │
└──────────────────────────────────────────────────────────────┘
```

When you are building agentic systems, your code passes data between LLMs, databases, APIs, and rule engines. Without strict types, a malformed response from an LLM can silently crash your pipeline hours later. Advanced type hints catch these errors at development time instead of production.

---

### 1. Generics with `TypeVar` and `Generic`

Generics let you write functions and classes that work with any type while still enforcing type safety. Think of it as writing a "template" that adapts to whatever type you plug in.

```python
from typing import TypeVar, Generic

# Step 1: Create a generic type variable 'T'. 
# This is like saying "I don't know the exact type yet, but I'll call it T for now."
T = TypeVar("T")

# Step 2: Define a class that uses the generic type 'T'
class Stack(Generic[T]):
    def __init__(self) -> None:
        # We store items in a list. The list will only hold items of type 'T'.
        self._items: list[T] = []

    def push(self, item: T) -> None:
        # We can only add items of type 'T' to our stack.
        self._items.append(item)

    def pop(self) -> T:
        # When we remove an item, it will be of type 'T'.
        return self._items.pop()

    def peek(self) -> T:
        # Looking at the top item also gives us an item of type 'T'.
        return self._items[-1]

# Step 3: Use the generic class. 
# Here we tell Python: "Make a stack specifically for integers."
int_stack: Stack[int] = Stack()

# This is fine because 42 is an integer.
int_stack.push(42)

# The type checker flags this immediately because "hello" is not an integer!
int_stack.push("hello")  
```

**What's happening:**
```python
T = TypeVar("T")
# ^^^^^^^^^^^^
# T is a TYPE VARIABLE — a placeholder for a type
# It's like a variable, but for types instead of values
# "T" is the conventional name for a generic type

class Stack(Generic[T]):
#                 ^
#                 Generic[T] says: "This class works with type T"
#                 T gets replaced when you USE the class
    def __init__(self) -> None:
        self._items: list[T] = []
        #             ^^^^^^
        #             list[T] — a list of whatever T is
        #             If T = int → list[int]
        #             If T = str → list[str]

    def push(self, item: T) -> None:
        #                  ^
        #                  item must be of type T
        #                  You can't push a string onto a Stack[int]

# When you write:
int_stack: Stack[int] = Stack()
#               ^^^
#               T becomes int everywhere in the class
#               self._items is now list[int]
#               push() expects an int
#               pop() returns an int
```

```
┌──────────────────────────────────────────────────────────────┐
│              HOW GENERICS WORK                                │
│                                                              │
│  class Stack(Generic[T]):                                    │
│      _items: list[T]                                         │
│      push(item: T)                                           │
│      pop() -> T                                              │
│                                                              │
│  When you write Stack[int]:                                  │
│  ┌──────────────────────────────────────────────┐            │
│  │ T = int                                       │            │
│  │                                               │            │
│  │ _items: list[int]                             │            │
│  │ push(item: int)  ← only accepts int           │            │
│  │ pop() -> int     ← returns int                │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
│  When you write Stack[str]:                                  │
│  ┌──────────────────────────────────────────────┐            │
│  │ T = str                                       │            │
│  │                                               │            │
│  │ _items: list[str]                             │            │
│  │ push(item: str)  ← only accepts str           │            │
│  │ pop() -> str     ← returns str                │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
│  Same class, different types — type safe!                    │
└──────────────────────────────────────────────────────────────┘
```

**Generic functions:**
```python
from typing import TypeVar

T = TypeVar("T")

# A generic function that works with any type
def first_item(items: list[T]) -> T:
    return items[0]

# Python infers T from the argument
result = first_item([1, 2, 3])       # T = int, result is int
result = first_item(["a", "b"])      # T = str, result is str
result = first_item([1.0, 2.0])      # T = float, result is float

# This would be flagged:
result = first_item([1, "hello"])    # T can't be both int and str!
```

**Common mistake — using `Any` instead of generics:**
```python
from typing import Any

# ❌ BAD: Any defeats type checking
def first_item(items: list[Any]) -> Any:
    return items[0]
# result could be anything — no type safety!

# ✅ GOOD: Generic preserves type info
T = TypeVar("T")
def first_item(items: list[T]) -> T:
    return items[0]
# result is guaranteed to be the same type as the list elements
```

---

### 2. `Union` and `Optional`

`Union` declares that a value can be one of several types. `Optional[X]` is shorthand for `Union[X, None]`.

```python
from typing import Union

# Step 1: Tell Python this function accepts EITHER a string OR a float
def parse_sensor_reading(raw: str | float) -> float:
    # Step 2: Check which type we actually received
    match raw:
        case float() as f:
            # If it's already a float, just return it
            return f
        case str() as s:
            # If it's a string, convert it to a float first
            return float(s)

# Step 1: Use `str | None` to say the path might be missing
def fetch_config(path: str | None) -> dict:
    # Step 2: Handle the case where no path was provided
    if path is None:
        return {"debug": False}
    
    # Step 3: Handle the case where a path was provided
    return {"debug": True, "path": path}
```

**What's happening:**
```python
def parse_sensor_reading(raw: str | float) -> float:
#                      ^    ^^^^^^^^^^^  ^^^^^
#                      |    |            └── Returns a float
#                      |    └── Input can be EITHER str OR float
#                      └── Parameter name
#
# When you call parse_sensor_reading("22.5"):
#   raw is a str → match matches case str() → converts to float → returns float
#
# When you call parse_sensor_reading(22.5):
#   raw is a float → match matches case float() → returns float directly

def fetch_config(path: str | None) -> dict:
#              ^    ^^^^^^^^^^^  ^^^^
#              |    |            └── Returns a dict
#              |    └── str | None means: string OR None
#              └── Parameter name
#
# str | None is equivalent to Optional[str] (older syntax)
# Both mean: "this value might be a string, or it might be None"
```

**Union vs Optional — side by side:**
```python
# These are equivalent:
def find_sensor(id: str | None) -> str: ...     # Modern (3.10+)
def find_sensor(id: Optional[str]) -> str: ...  # Old (3.5+)

# Union with more than 2 types:
def parse_value(raw: str | int | float) -> float: ...  # Modern
def parse_value(raw: Union[str, int, float]) -> float: ...  # Old
```

**Comparison table:**

| Syntax | Meaning | Python Version | Import |
|--------|---------|----------------|--------|
| `Optional[str]` | str or None | 3.5+ | `from typing import Optional` |
| `str \| None` | str or None | 3.10+ | None |
| `Union[str, int]` | str or int | 3.5+ | `from typing import Union` |
| `str \| int` | str or int | 3.10+ | None |
| `Union[str, int, float]` | str, int, or float | 3.5+ | `from typing import Union` |
| `str \| int \| float` | str, int, or float | 3.10+ | None |

---

### 3. `Callable` and Async Callables

`Callable` describes any function-like object — lambdas, functions, or classes with `__call__`. This is critical for agentic patterns where you pass functions as arguments.

```python
from typing import Callable, Awaitable

# Step 1: Define what a synchronous function should look like.
# It takes a string and returns a dictionary.
SyncHandler = Callable[[str], dict]

# Step 2: Define what an asynchronous function should look like.
# It takes a string and returns an Awaitable (a promise) of a dictionary.
AsyncHandler = Callable[[str], Awaitable[dict]]

# Step 3: Write a function that accepts another function as an argument
def process_input(handler: SyncHandler, data: str) -> dict:
    # We call the function passed to us
    return handler(data)

# Step 4: Write an async version
async def process_input_async(handler: AsyncHandler, data: str) -> dict:
    # We await the function passed to us
    return await handler(data)
```

**What's happening:**
```python
SyncHandler = Callable[[str], dict]
#            ^^^^^^^^^^     ^^^^
#            |              └── Return type: dict
#            └── Parameter types: [str] (one string parameter)
#
# This defines a TYPE for functions that:
#   - Accept one string parameter
#   - Return a dictionary
#
# Any function matching this signature can be passed as SyncHandler

AsyncHandler = Callable[[str], Awaitable[dict]]
#                         ^^^    ^^^^^^^^^^^^
#                         |      |
#                         |      └── Awaitable[dict] = async function returning dict
#                         └── One string parameter
#
# This defines a TYPE for async functions that:
#   - Accept one string parameter
#   - Return a coroutine that resolves to a dict

def process_input(handler: SyncHandler, data: str) -> dict:
#              ^      ^^^^^^^^^^^^^
#              |      |
#              |      └── 'handler' must be a function matching SyncHandler
#              └── This function takes a function as an argument!
#
# You can pass any function that matches: (str) -> dict
```

**Callable with no parameters:**
```python
# Callable[[], str] — no parameters, returns str
Initializer = Callable[[], str]

def get_default_name() -> str:
    return "default_sensor"

def initialize_sensor(name_fn: Initializer) -> str:
    return name_fn()

initialize_sensor(get_default_name)  # Returns "default_sensor"
```

**Callable with multiple parameters:**
```python
# Callable[[str, float], bool] — takes str and float, returns bool
Validator = Callable[[str, float], bool]

def validate_temperature(sensor_id: str, temp: float) -> bool:
    return -50 <= temp <= 200

def check_reading(validator: Validator, sensor_id: str, temp: float) -> bool:
    return validator(sensor_id, temp)

check_reading(validate_temperature, "S-001", 22.5)  # True
```

---

### 4. `TypedDict` — Structured Dictionaries

When an LLM returns JSON, you often get a raw dictionary. `TypedDict` gives that dictionary a shape that type checkers understand. It's like a dataclass but for dictionaries.

```python
from typing import TypedDict, Literal

# Step 1: Define the exact shape we expect for a tool call
class LLMToolCall(TypedDict):
    name: str
    arguments: dict[str, str | int | float | bool]

# Step 2: Define the shape of our overall state
class AgentState(TypedDict):
    # Literal means the status must be EXACTLY one of these strings
    status: Literal["idle", "gathering", "analyzing", "responding"]
    tool_calls: list[LLMToolCall]
    retries: int
    error: str | None
```

**What's happening:**
```python
class LLMToolCall(TypedDict):
#                ^^^^^^^^^^
#                TypedDict — creates a typed dictionary
#                Not a real class — it's a type hint for dicts
    name: str
#   ^^^^  ^^^
#   |     └── The "name" key must hold a string
#   └── Key name in the dictionary
    
    arguments: dict[str, str | int | float | bool]
#   ^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#   |          └── Nested dict: keys are strings, values are mixed types
#   └── Key name in the dictionary

class AgentState(TypedDict):
    status: Literal["idle", "gather
#                    ^^^^^  ^^^^^^^^
#                    |      |
#                    |      └── Status can only be one of these exact strings
#                    └── Literal type — value must be exactly one of the listed strings
#                        "idle", "gathering", "analyzing", or "responding"
#                        Any other string is a type error!

    tool_calls: list[LLMToolCall]
#   ^^^^^^^^^^  ^^^^^^^^^^^^^^^^
#   |           └── List of LLMToolCall dicts
#   └── Key name

    retries: int
    error: str | None
#         ^^^^^^^^^
#         Could be a string (error message) or None (no error)
```

**TypedDict vs regular dict:**
```python
# ❌ Regular dict — no type checking
state = {
    "status": "idle",
    "tool_calls": [],
    "retries": 0,
    "error": None
}
# "status": "TYPO" would NOT be caught by type checkers!

# ✅ TypedDict — type checking
state: AgentState = {
    "status": "idle",        # Must be one of: "idle", "gathering", "analyzing", "responding"
    "tool_calls": [],        # Must be a list of LLMToolCall dicts
    "retries": 0,            # Must be an int
    "error": None            # Must be str or None
}
# "status": "TYPO" WOULD be caught by type checkers!
```

**TypedDict vs dataclass:**
```python
from dataclasses import dataclass
from typing import TypedDict

# TypedDict — for dictionaries (JSON-compatible)
class SensorDataDict(TypedDict):
    sensor_id: str
    temperature: float

# Dataclass — for objects (Python-native)
@dataclass
class SensorDataClass:
    sensor_id: str
    temperature: float

# TypedDict is better when:
#   - You're parsing JSON from an API
#   - You need the data to remain a dict (for serialization)
#   - You're working with libraries that expect dicts

# Dataclass is better when:
#   - You want methods on the data
#   - You want immutability (frozen=True)
#   - You're building internal data structures
```

---

### 5. `Protocol` — Structural Typing

A `Protocol` defines what methods an object must have, without requiring inheritance. This is perfect for agentic systems where different agents share a common interface.

```python
from typing import Protocol

# Step 1: Define the "rulebook" (Protocol)
# Any class that has a `run` method taking a string and returning a string
# automatically follows this Protocol.
class Agent(Protocol):
    def run(self, query: str) -> str: ...

# Step 2: Create classes that naturally follow the rulebook
class DatabaseAgent:
    def run(self, query: str) -> str:
        return f"Querying database for: {query}"

class MathAgent:
    def run(self, query: str) -> str:
        return f"Computing: {query}"

# Step 3: Write a function that accepts ANY object following the Protocol
def dispatch(agent: Agent, query: str) -> str:
    return agent.run(query)

# Since both classes have the required `run` method, both work perfectly!
dispatch(DatabaseAgent(), "SELECT *")   # Works
dispatch(MathAgent(), "2 + 2")          # Works
```

**What's happening:**
```python
class Agent(Protocol):
#           ^^^^^^^^
#           Protocol says: "This is a STRUCTURAL type"
#           Any class with the right METHODS is automatically an Agent
#           No need to explicitly inherit from Agent!
    def run(self, query: str) -> str: ...
#           ^     ^^^^       ^^^
#           |     |          └── Returns a string
#           |     └── Takes a string parameter
#           └── self (standard for methods)
#   The "..." means: this is just a signature, no implementation needed
#   Protocol defines the SHAPE, not the behavior

class DatabaseAgent:
    # This class does NOT inherit from Agent!
    # But it has a run() method with the right signature:
    #   - Takes self and a string
    #   - Returns a string
    # So it AUTOMATICALLY satisfies the Agent Protocol
    def run(self, query: str) -> str:
        return f"Querying database for: {query}"

def dispatch(agent: Agent, query: str) -> str:
#              ^^^^^
#              Accepts ANY object that satisfies the Agent protocol
#              Doesn't require explicit inheritance!
    return agent.run(query)
#         ^^^^^^^^^^
#         Calls the run() method — guaranteed to exist by the protocol
```

```
┌──────────────────────────────────────────────────────────────┐
│           PROTOCOL vs INHERITANCE                             │
│                                                              │
│  INHERITANCE:                                                │
│  ┌──────────────────────────────────┐                        │
│  │ class Agent:                     │                        │
│  │     def run(self, q): ...        │                        │
│  │                                  │                        │
│  │ class DBAgent(Agent):            │  ← Must explicitly     │
│  │     def run(self, q): ...        │     inherit from Agent │
│  └──────────────────────────────────┘                        │
│                                                              │
│  PROTOCOL:                                                   │
│  ┌──────────────────────────────────┐                        │
│  │ class Agent(Protocol):           │                        │
│  │     def run(self, q): ...        │                        │
│  │                                  │                        │
│  │ class DBAgent:                   │  ← No inheritance!     │
│  │     def run(self, q): ...        │     Just needs the     │
│  └──────────────────────────────────┘     right methods      │
│                                                              │
│  Protocol is more flexible — third-party classes              │
│  automatically satisfy it without modification!              │
└──────────────────────────────────────────────────────────────┘
```

**Protocol with multiple methods:**
```python
from typing import Protocol

class Serializable(Protocol):
    def to_dict(self) -> dict: ...
    def from_dict(cls, data: dict) -> "Serializable": ...

class SensorReading:
    def __init__(self, sensor_id: str, temperature: float):
        self.sensor_id = sensor_id
        self.temperature = temperature

    def to_dict(self) -> dict:
        return {"sensor_id": self.sensor_id, "temperature": self.temperature}

    @classmethod
    def from_dict(cls, data: dict) -> "SensorReading":
        return cls(data["sensor_id"], data["temperature"])

# SensorReading satisfies Serializable without inheriting from it!
def save_item(item: Serializable, filename: str) -> None:
    data = item.to_dict()
    # ... save to file
```

---

### 6. Literal Type — Exact Values

`Literal` restricts a value to specific exact values, not just types.

```python
from typing import Literal

# Only these exact strings are allowed
SensorType = Literal["temperature", "pressure", "humidity", "vibration"]

# Only these exact integers are allowed
Priority = Literal[1, 2, 3, 4, 5]

def create_sensor(sensor_type: SensorType, priority: Priority) -> dict:
    return {"type": sensor_type, "priority": priority}

# ✅ Valid
create_sensor("temperature", 1)
create_sensor("pressure", 3)

# ❌ Invalid — caught by type checkers
create_sensor("temp", 1)           # "temp" is not in the Literal
create_sensor("temperature", 6)    # 6 is not in the Literal
```

**What's happening:**
```python
SensorType = Literal["temperature", "pressure", "humidity", "vibration"]
#            ^^^^^^^                                                         
#            Literal type — value must be EXACTLY one of the listed values
#            Not just "any string" — only these four specific strings

def create_sensor(sensor_type: SensorType, priority: Priority) -> dict:
#              ^      ^^^^^^^^^^^^^^^^
#              |      |
#              |      └── sensor_type must be one of: "temperature", "pressure", etc.
#              └── Function name
#
# This is MORE restrictive than just str:
#   str: "any string is OK"
#   Literal: "only these specific strings are OK"
```

**Literal with TypedDict:**
```python
from typing import TypedDict, Literal

class SensorConfig(TypedDict):
    sensor_id: str
    sensor_type: Literal["temperature", "pressure", "humidity"]
    status: Literal["active", "inactive", "calibrating"]

config: SensorConfig = {
    "sensor_id": "S-001",
    "sensor_type": "temperature",    # ✅ Valid literal
    "status": "active"               # ✅ Valid literal
}

# "sensor_type": "temp"  ❌ Type error — not a valid literal
# "status": "broken"     ❌ Type error — not a valid literal
```

---

### 7. Common Mistakes

```python
from typing import TypeVar, Generic, Callable, TypedDict, Protocol, Literal

# MISTAKE 1: Using Any instead of TypeVar
from typing import Any

def get_first(items: list[Any]) -> Any:
    return items[0]
# No type safety at all!

# FIX:
T = TypeVar("T")
def get_first(items: list[T]) -> T:
    return items[0]

# MISTAKE 2: Forgetting that TypedDict is a dict, not a class
class SensorData(TypedDict):
    id: str
    temp: float

# WRONG: Trying to use it like a class
# sensor = SensorData("S-001", 22.5)  # TypeError!

# RIGHT: Use it as a type hint for a dict
sensor: SensorData = {"id": "S-001", "temp": 22.5}

# MISTAKE 3: Protocol with wrong method signature
class Agent(Protocol):
    def run(self, query: str) -> str: ...

class BadAgent:
    def run(self, query: int) -> str:  # query is int, not str!
        return str(query)

def dispatch(agent: Agent) -> str:
    return agent.run("test")

# dispatch(BadAgent())  # Type error! BadAgent.run expects int, Agent expects str

# MISTAKE 4: Using Union when you mean "one type depends on another"
# ❌ WRONG: Union says "could be either"
def process(value: str | int) -> str | int:
    return value  # Returns whatever was passed — confusing!

# ✅ RIGHT: Use overload or separate functions
from typing import overload

@overload
def process(value: str) -> str: ...
@overload
def process(value: int) -> int: ...
def process(value: str | int) -> str | int:
    return value
# Now type checkers know: str in → str out, int in → int out
```

---

### Summary

Use `TypeVar`/`Generic` for reusable data structures, `Union`/`Optional` for flexible inputs, `Callable` for callback-heavy agentic flows, `TypedDict` for structuring LLM JSON output, and `Protocol` for defining agent interfaces without inheritance.

**Key takeaways:**
- `TypeVar("T")` + `Generic[T]` — write type-safe generic classes
- `str | int` — value can be either type (Python 3.10+)
- `Callable[[str], dict]` — type hint for functions
- `TypedDict` — typed dictionaries for JSON data
- `Protocol` — structural typing (no inheritance needed)
- `Literal["a", "b"]` — restrict to exact values

---

### Quick Reference Table

| Syntax | Meaning | Example |
|--------|---------|---------|
| `T = TypeVar("T")` | Generic type variable | `T = TypeVar("T")` |
| `Generic[T]` | Generic class | `class Stack(Generic[T]):` |
| `list[T]` | Generic list | `items: list[T]` |
| `str \| int` | Union type | `value: str \| int` |
| `Optional[str]` | str or None | `name: Optional[str] = None` |
| `Callable[[str], dict]` | Function type | `handler: Callable[[str], dict]` |
| `Awaitable[dict]` | Async function | `handler: Callable[[], Awaitable[dict]]` |
| `TypedDict` | Typed dictionary | `class Config(TypedDict):` |
| `Protocol` | Structural type | `class Agent(Protocol):` |
| `Literal["a", "b"]` | Exact values | `status: Literal["on", "off"]` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Trace the generic `Stack`.** Using the chapter's `Stack(Generic[T])`, predict every printed line, and fill in the stack contents (bottom to top) after each step:

```python
s: Stack[int] = Stack()
s.push(3)
s.push(7)
print(s.pop())
s.push(5)
print(s.peek())
print(s.pop(), s.pop())
s.push("hello")        # the line a type checker flags
print(s._items)
```

**Q2. A hole in the `match`.** Using the chapter's `parse_sensor_reading(raw: str | float) -> float` (with `case float()` and `case str()`), predict the output:

```python
print(parse_sensor_reading("22.5"))
print(parse_sensor_reading(22.5))
print(parse_sensor_reading(22))
```

**Q3. Callables in, results out.** Using the chapter's `process_input`, `check_reading` and `validate_temperature`, predict each result:

```python
print(process_input(lambda s: {"len": len(s)}, "lidar"))
print(check_reading(validate_temperature, "S-001", -50))
print(check_reading(validate_temperature, "S-001", 200.5))
print(check_reading(lambda sid, t: sid.startswith("S") and t < 100, "X-9", 22.5))
```

**Q4. `TypedDict` at runtime.** Using the `SensorData(TypedDict)` from Mistake 2 (`id: str`, `temp: float`), predict what each line does when you **run** it (output or exception):

```python
x = SensorData(id="S-001", temp=22.5)
print(x, type(x).__name__)
SensorData("S-001", 22.5)
y: SensorData = {"id": "S-2", "temp": "hot"}
print(y["temp"])
```

**Q5. Who satisfies the `Agent` protocol?** With `class Agent(Protocol): def run(self, query: str) -> str: ...`, which of these classes can a type checker accept for `dispatch(agent: Agent, ...)`?

```python
class LidarAgent:
    def run(self, query: str) -> str: return "scan ok"
    def reset(self) -> None: ...

class CountAgent:
    def run(self, query: str) -> int: return len(query)

class PlannerAgent:
    def execute(self, query: str) -> str: return "path"

class VerboseAgent:
    def run(self, query: str, verbose: bool = False) -> str: return "done"
```

### Coding Exercises

**E1 (Easy). A generic fallback.** Write `last_or_default(items: list[T], default: T) -> T` that returns the last element, or `default` when the list is empty. The type checker should infer `float` for a `list[float]`, and `str` for a `list[str]`. Be careful: a last element of `0` is a real value.

```python
last_or_default([0.4, 0.7], 0.0)   # 0.7
last_or_default([], "none")        # 'none'
last_or_default([0], 99)           # 0
```

**E2 (Easy–Medium). A generic sensor ring buffer.** Write `class RingBuffer(Generic[T])` with `__init__(self, capacity: int)` (raise `ValueError` if `capacity <= 0`), `push(self, item: T) -> None` (when full, drop the **oldest** item), `items(self) -> list[T]` (oldest first, as a copy), and `__len__`.

```python
rb: RingBuffer[float] = RingBuffer(3)
for v in [1.0, 2.0, 3.0, 4.0, 5.0]:
    rb.push(v)
rb.items()   # [3.0, 4.0, 5.0]
len(rb)      # 3
```

**E3 (Medium). Execute an agent's tool calls.** Using the chapter's `LLMToolCall` and `AgentState` TypedDicts, and the alias `Tool = Callable[[dict[str, str | int | float | bool]], str]`, write `execute_calls(state: AgentState, tools: dict[str, Tool]) -> list[str]`. Set `status` to `"analyzing"`. Run each call's tool with its `arguments` and collect the result strings in order. For an unknown tool name, add 1 to `retries`, set `error` to `"unknown tool: <name>"`, and skip that call. Finish by setting `status` to `"responding"`.

```python
tools = {
    "get_temp": lambda args: f"{args['sensor_id']}=22.5C",
    "set_speed": lambda args: f"speed set to {args['mps']} m/s",
}
state = {"status": "idle", "retries": 0, "error": None, "tool_calls": [
    {"name": "get_temp", "arguments": {"sensor_id": "TEMP-001"}},
    {"name": "fly", "arguments": {}},
    {"name": "set_speed", "arguments": {"mps": 1.5}},
]}
execute_calls(state, tools)   # ['TEMP-001=22.5C', 'speed set to 1.5 m/s']
state["status"], state["retries"], state["error"]   # ('responding', 1, 'unknown tool: fly')
```

#### Dry-Run: Answers

**Q1.** Output:

```python
7
5
5 3
['hello']
```

| Step | `_items` (bottom to top) | Printed |
|------|--------------------------|---------|
| `push(3)` | `[3]` | |
| `push(7)` | `[3, 7]` | |
| `pop()` | `[3]` | `7` |
| `push(5)` | `[3, 5]` | |
| `peek()` | `[3, 5]` (unchanged) | `5` |
| `pop(), pop()` | `[]` | `5 3` (arguments are evaluated left to right) |
| `push("hello")` | `['hello']` | |

`Stack[int]` is only a promise to the type checker. At runtime `push("hello")` succeeds, and only mypy or your editor would flag it.

**Q2.** Output:

```python
22.5
22.5
None
```

`22` is an `int`, and `case float()` does **not** match an `int` (`isinstance(22, float)` is `False`). No case matches, so the function falls off the end and returns `None`, even though it promises `float`. A type checker *accepts* the call, because the rule "`int` is acceptable where `float` is expected" lets `22` pass as `str | float`. That is why this bug slips through. Fix: add `case int() as i: return float(i)`, or use `case int() | float(): return float(raw)`.

**Q3.** Output:

```python
{'len': 5}
True
False
False
```

- `len("lidar")` is `5`.
- `-50 <= -50 <= 200` is `True` (the bounds are inclusive).
- $200.5 > 200$, so `False`.
- `"X-9".startswith("S")` is `False`, so the `and` short-circuits to `False` without testing the temperature.

**Q4.**

| Line | Result |
|------|--------|
| `x = SensorData(id="S-001", temp=22.5)` and `print(...)` | prints `{'id': 'S-001', 'temp': 22.5} dict`. Calling a TypedDict with keywords just builds a plain `dict` |
| `SensorData("S-001", 22.5)` | `TypeError: dict expected at most 1 argument, got 2` (this is Mistake 2) |
| `y: SensorData = {"id": "S-2", "temp": "hot"}` | runs fine; only a type checker reports that `"hot"` is not a `float` |
| `print(y["temp"])` | prints `hot` |

A TypedDict adds no runtime checks at all. Runtime validation is Pydantic's job, which comes later.

**Q5.** Accepted: `LidarAgent` and `VerboseAgent`. Rejected: `CountAgent` and `PlannerAgent`.

| Class | Satisfies `Agent`? | Reason |
|-------|--------------------|--------|
| `LidarAgent` | yes | It has `run(str) -> str`. Extra methods like `reset` do not matter |
| `CountAgent` | no | `run` returns `int`, but the protocol promises `str` |
| `PlannerAgent` | no | It has no `run` method at all. The name matters, not just the shape |
| `VerboseAgent` | yes | It can still be called as `run(query)`, because the extra parameter has a default |

**E1 — reference solution**

```python
from typing import TypeVar

T = TypeVar("T")

def last_or_default(items: list[T], default: T) -> T:
    if not items:            # test the LIST, never the element
        return default
    return items[-1]
```

Writing `return items[-1] if items else default` is equivalent. Writing `return (items and items[-1]) or default` is **wrong**, because `last_or_default([0], 99)` would return `99`. Cost: $O(1)$.

**E2 — reference solution**

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class RingBuffer(Generic[T]):
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._capacity = capacity
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)
        if len(self._items) > self._capacity:
            self._items.pop(0)          # drop the oldest

    def items(self) -> list[T]:
        return list(self._items)        # a copy, so callers can't corrupt the buffer

    def __len__(self) -> int:
        return len(self._items)
```

Trace for capacity 3: after `1, 2, 3` the buffer is full. Pushing `4` drops `1`, and pushing `5` drops `2`, which leaves `[3.0, 4.0, 5.0]`. `pop(0)` costs $O(n)$. A production version would use `collections.deque(maxlen=capacity)` for $O(1)$ pushes (Phase 4 builds a real C++ ring buffer).

**E3 — reference solution**

```python
from typing import Callable, Literal, TypedDict

class LLMToolCall(TypedDict):
    name: str
    arguments: dict[str, str | int | float | bool]

class AgentState(TypedDict):
    status: Literal["idle", "gathering", "analyzing", "responding"]
    tool_calls: list[LLMToolCall]
    retries: int
    error: str | None

Tool = Callable[[dict[str, str | int | float | bool]], str]

def execute_calls(state: AgentState, tools: dict[str, Tool]) -> list[str]:
    state["status"] = "analyzing"
    results: list[str] = []
    for call in state["tool_calls"]:
        tool = tools.get(call["name"])
        if tool is None:
            state["retries"] += 1
            state["error"] = f"unknown tool: {call['name']}"
            continue
        results.append(tool(call["arguments"]))
    state["status"] = "responding"
    return results
```

Trace: `get_temp` returns `'TEMP-001=22.5C'`. `fly` is not in `tools`, so `retries` becomes 1 and `error` is set. `set_speed` returns `'speed set to 1.5 m/s'`. Because `status` is a `Literal`, a typo like `state["status"] = "respond"` would be caught by the type checker. Cost: $O(\text{number of calls})$ plus the tools' own work.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Advanced Type Hinting**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter5 advanced type hinting**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

