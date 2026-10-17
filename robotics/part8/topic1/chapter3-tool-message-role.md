# Part 3, Topic 1: LLM APIs & Message History
## Chapter 3: The Tool Message Role

**Prerequisite Knowledge:** The Chat Completions API and JSON structure.

### The 'Manager and the Worker' Analogy
Imagine the AI as a brilliant project manager sitting at a desk with no computer and no phone. The manager can read reports and write instructions, but they cannot physically "do" anything. If you ask the manager for the current weather, they can't look outside. Instead, the manager writes a sticky note that says: *"Please run the check_weather tool."* 

Your Python code is the worker. You take the sticky note, go look at the thermometer, write "72 degrees" on a new sticky note, and hand it back to the manager. Now the manager can finally say to the user, "It is 72 degrees outside." The AI never runs code; it simply pauses its conversation to ask *you* to run the code.

Tool calling is how LLMs interact with the real world. The model generates a structured `tool_call` in its response, your code executes the function, and you send the result back as a `tool` role message. Understanding this loop is essential for building agentic systems.

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANAGER-WORKER ANALOGY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User (Factory Owner)     AI (Manager)      Your Code (Worker) │
│   ┌─────────────┐          ┌─────────────┐    ┌─────────────┐   │
│   │ "What's the │──ask──>  │ Can't do it │    │             │   │
│   │  temperature│          │ writes note │    │  Runs tool  │   │
│   │  of T-01?"  │          │ "run tool"  │──> │  reads data │   │
│   └─────────────┘          └──────┬──────┘    └──────┬──────┘   │
│                                   │                   │          │
│                                   │<──result──────────┘          │
│                                   │  "72.5°C"                    │
│                                   ▼                              │
│                           ┌─────────────┐                       │
│                           │ "T-01 reads │                       │
│                           │  72.5°C"    │──reply──> User         │
│                           └─────────────┘                       │
│                                                                 │
│   The AI NEVER executes code directly!                          │
│   It only REQUESTS tools via structured tool_calls              │
└─────────────────────────────────────────────────────────────────┘
```

### 1. The Tool Call Flow

The flow is: user message -> assistant (with tool_call) -> tool (result) -> assistant (final response). The model never executes tools directly — it only requests them.

```python
messages = [
    {"role": "system", "content": "You are a monitoring assistant with access to sensor tools."},
    {"role": "user", "content": "What is the current temperature of sensor T-01?"},
]

print("Step 1: User asks question")
print(f"Messages: {len(messages)}")
print()

print("Step 2: Model responds with tool_call (not a direct answer)")
# This is what the AI returns when it wants you to run a tool
assistant_response = {
    "role": "assistant",
    "content": None, # Notice there is no text answer yet!
    "tool_calls": [
        {
            "id": "call_abc123", # A unique tracking ID
            "type": "function",
            "function": {
                "name": "read_sensor",
                "arguments": '{"sensor_id": "T-01", "metric": "temperature"}'
            }
        }
    ]
}

tool_request = assistant_response['tool_calls'][0]['function']
print(f"Tool call: {tool_request['name']}")
print(f"Arguments: {tool_request['arguments']}")
print()

print("Step 3: Your code executes the tool and returns the result")
# You format the result into a new message with the role "tool"
tool_result = {
    "role": "tool",
    "tool_call_id": "call_abc123", # Must match the ID the AI gave you!
    "content": '{"sensor_id": "T-01", "temperature": 72.5, "unit": "Celsius"}'
}
print(f"Result: {tool_result['content']}")
print()

print("Step 4: Model sees the result and generates a natural language response")
```

Output:
```
Step 1: User asks question
Messages: 2

Step 2: Model responds with tool_call (not a direct answer)
Tool call: read_sensor
Arguments: {"sensor_id": "T-01", "metric": "temperature"}

Step 3: Your code executes the tool and returns the result
Result: {"sensor_id": "T-01", "temperature": 72.5, "unit": "Celsius"}

Step 4: Model sees the result and generates a natural language response
```

**What's happening:**
```python
assistant_response = {
    "role": "assistant",
    "content": None,
    #          ^^^^
    #          IMPORTANT: content is None when tool_calls is present
    #          The AI is NOT answering the question yet
    #          It's REQUESTING your code to run a tool first
    
    "tool_calls": [
        {
            "id": "call_abc123",
            #    ^^^^^^^^^^^^^
            #    Unique ID to track this specific tool call
            #            Required to match results back to requests
            
            "type": "function",
            #       ^^^^^^^^
            #       Always "function" for now (OpenAI spec)
            
            "function": {
                "name": "read_sensor",
                #        ^^^^^^^^^^^
                #        The function your code should call
                
                "arguments": '{"sensor_id": "T-01", "metric": "temperature"}'
                #            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                #            JSON STRING (not a dict!)
                #            Must be parsed with json.loads()
            }
        }
    ]
}

tool_result = {
    "role": "tool",
    #     ^^^^
    #     Special role for tool execution results
    
    "tool_call_id": "call_abc123",
    #              ^^^^^^^^^^^^^
    #              MUST match the id from tool_calls
    #              This is how the AI knows which result goes with which request
    
    "content": '{"sensor_id": "T-01", "temperature": 72.5}'
    #           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #           JSON STRING of the result
    #           Your code converts the function's return value to JSON
}
```

### Tool Call Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOOL CALL FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Step 1: User Message                                          │
│   ┌─────────────────────────────────────────┐                   │
│   │ {"role": "user", "content": "What is    │                   │
│   │  the temperature of T-01?"}             │                   │
│   └─────────────────────────────────────────┘                   │
│                      ↓                                          │
│   Step 2: Assistant Response (with tool_call)                   │
│   ┌─────────────────────────────────────────┐                   │
│   │ {"role": "assistant",                   │                   │
│   │  "content": null,                       │                   │
│   │  "tool_calls": [{                       │                   │
│   │    "id": "call_abc123",                 │                   │
│   │    "function": {                        │                   │
│   │      "name": "read_sensor",             │                   │
│   │      "arguments": "{...}"               │                   │
│   │    }                                    │                   │
│   │  }]}                                    │                   │
│   └─────────────────────────────────────────┘                   │
│                      ↓                                          │
│   Step 3: Your Code Executes Tool                               │
│   ┌─────────────────────────────────────────┐                   │
│   │ result = read_sensor("T-01", "temp")    │                   │
│   │ # Returns: {"temperature": 72.5}        │                   │
│   └─────────────────────────────────────────┘                   │
│                      ↓                                          │
│   Step 4: Tool Result Message                                   │
│   ┌─────────────────────────────────────────┐                   │
│   │ {"role": "tool",                        │                   │
│   │  "tool_call_id": "call_abc123",         │                   │
│   │  "content": "{\"temperature\": 72.5}"}  │                   │
│   └─────────────────────────────────────────┘                   │
│                      ↓                                          │
│   Step 5: Assistant Final Response                              │
│   ┌─────────────────────────────────────────┐                   │
│   │ {"role": "assistant",                   │                   │
│   │  "content": "T-01 reads 72.5°C"}        │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Defining Tools for the API

Tools are defined as JSON schemas that describe the function's parameters. This is the "menu" of tools you provide to the LLM.

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "read_sensor",
            "description": "Read the current value from a sensor",
            "parameters": {
                "type": "object",
                "properties": {
                    "sensor_id": {
                        "type": "string",
                        "description": "The sensor identifier, e.g. T-01"
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["temperature", "humidity", "pressure"],
                        "description": "Which metric to read"
                    }
                },
                "required": ["sensor_id", "metric"]
            }
        }
    }
]

print(f"Defined {len(tools)} tool(s)")
print(f"Tool name: {tools[0]['function']['name']}")
```

Output:
```
Defined 1 tool(s)
Tool name: read_sensor
```

**What's happening:**
```python
tools = [
    {
        "type": "function",
        #       ^^^^^^^^
        #       Tool type (always "function" for OpenAI)
        
        "function": {
            "name": "read_sensor",
            #        ^^^^^^^^^^^
            #        Function name (must match your Python function!)
            
            "description": "Read the current value from a sensor",
            #              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            #              AI uses this to decide WHEN to call the tool
            #              Make it clear and specific!
            
            "parameters": {
                "type": "object",
                #       ^^^^^^
                #       Parameters are always an object (dict)
                
                "properties": {
                    "sensor_id": {
                        "type": "string",
                        #     ^^^^^^
                        #     JSON Schema type (not Python type!)
                        
                        "description": "The sensor identifier, e.g. T-01"
                        #              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                        #              AI uses this to understand what to pass
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["temperature", "humidity", "pressure"],
                        #       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                        #       Restricts to specific values (like choices)
                        #       AI will only generate these exact strings
                    }
                },
                "required": ["sensor_id", "metric"]
                #           ^^^^^^^^^^^^^^^^^^^^^^^
                #           Which parameters are MANDATORY
                #           AI must provide these
            }
        }
    }
]
```

### Tool Definition Comparison

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Function name (must match Python) | `"read_sensor"` |
| `description` | When to use this tool | `"Read current sensor value"` |
| `parameters.type` | Always `"object"` | `"object"` |
| `parameters.properties` | Input parameters | `{"sensor_id": {...}}` |
| `parameters.required` | Mandatory parameters | `["sensor_id"]` |
| `enum` | Restrict to specific values | `["temp", "humidity"]` |

### Common Mistake: Mismatched Function Names

```python
# WRONG - Tool name doesn't match Python function
tools = [
    {
        "type": "function",
        "function": {
            "name": "readTemperature",  # camelCase
            ...
        }
    }
]

def read_temperature(sensor_id: str) -> dict:  # snake_case
    return {"temp": 72.5}

# AI will call "readTemperature" but your code has "read_temperature"
# This will cause a KeyError or AttributeError!

# RIGHT - Names must match exactly
tools = [
    {
        "type": "function",
        "function": {
            "name": "read_temperature",  # snake_case matches Python
            ...
        }
    }
]

def read_temperature(sensor_id: str) -> dict:  # Same name!
    return {"temp": 72.5}
```

### 3. Making a Tool-Enabled API Call

Pass the `tools` parameter to the API. The model may or may not choose to call a tool.

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a monitoring assistant."},
        {"role": "user", "content": "Read the temperature from sensor T-01"},
    ],
    tools=tools,           # Give the AI the menu of tools
    tool_choice="auto",    # Let the AI decide if it needs a tool or not
    temperature=0.0,
)

message = response.choices[0].message
print(f"Content: {message.content}")
print(f"Tool calls: {message.tool_calls}")
```

Output:
```
Content: None
Tool calls: [ChatCompletionMessageToolCall(id='call_...', function=Function(arguments='{"sensor_id":"T-01","metric":"temperature"}', name='read_sensor'), type='function')]
```

**What's happening:**
```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    tools=tools,
    #    ^^^^^
    #    List of tool definitions (the "menu")
    #    AI can only call tools in this list
    
    tool_choice="auto",
    #          ^^^^^^
    #          "auto"  = AI decides whether to use a tool
    #          "none"  = AI cannot use any tools
    #          "required" = AI MUST use a tool
    #          {"type": "function", "function": {"name": "read_sensor"}}
    #                    = Force specific tool
    
    temperature=0.0,
)

message = response.choices[0].message

# If AI decides to use a tool:
message.content      # None (not answering yet)
message.tool_calls   # List of tool call objects

# If AI decides NOT to use a tool:
message.content      # "The temperature is..." (direct answer)
message.tool_calls   # None
```

### Tool Choice Options

| `tool_choice` | Behavior | Use Case |
|----------------|----------|----------|
| `"auto"` | AI decides | General purpose |
| `"none"` | No tools allowed | Force direct answer |
| `"required"` | Must use a tool | Force tool usage |
| Specific tool | Force one tool | Deterministic routing |

### 4. Sending Tool Results Back

Execute the function locally and send the result as a `tool` role message with the matching `tool_call_id`.

```python
import json

# This is our real Python function
def read_sensor(sensor_id: str, metric: str) -> dict:
    mock_data = {
        "T-01": {"temperature": 72.5, "humidity": 55.0, "pressure": 14.7},
        "T-02": {"temperature": 68.3, "humidity": 62.0, "pressure": 14.5},
    }
    return {"sensor_id": sensor_id, metric: mock_data.get(sensor_id, {}).get(metric, 0)}

# 1. Extract the tool call from the AI's response
tool_call = message.tool_calls[0]

# 2. Parse the arguments from JSON to a Python dictionary
args = json.loads(tool_call.function.arguments)

# 3. Run our Python function
result = read_sensor(**args)

# 4. Build the new message list to send back to the AI
messages_for_next_call = [
    {"role": "system", "content": "You are a monitoring assistant."},
    {"role": "user", "content": "Read the temperature from sensor T-01"},
    message, # You MUST append the AI's tool call message
    {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(result) # Send the result as a string
    }
]

# 5. Ask the AI to finish the thought now that it has the data
final_response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages_for_next_call,
    tools=tools,
    temperature=0.0,
)

print(f"Final answer: {final_response.choices[0].message.content}")
```

Output:
```
Final answer: The temperature from sensor T-01 is 72.5°C.
```

**What's happening:**
```python
tool_call = message.tool_calls[0]
#           ^^^^^^^^^^^^^^^^^^^
#           First tool call (AI can request multiple!)

args = json.loads(tool_call.function.arguments)
#     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#     Parse JSON string → Python dict
#     {"sensor_id": "T-01", "metric": "temperature"}

result = read_sensor(**args)
#              ^^^^^^^^^^
#              Unpack dict as keyword arguments
#              read_sensor(sensor_id="T-01", metric="temperature")

messages_for_next_call = [
    # ... original messages ...
    
    message,
    #   ^^^^^
    #   CRITICAL: You MUST include the assistant's tool_call message
    #   Without this, the AI won't know what tool it requested!
    
    {
        "role": "tool",
        "tool_call_id": tool_call.id,
        #              ^^^^^^^^^^^^^
        #              Links this result to the specific tool call
        
        "content": json.dumps(result)
        #          ^^^^^^^^^^^^^^^^^
        #          Convert dict → JSON string
        #          API expects string, not dict
    }
]

# Now send the FULL conversation back to the AI
# The AI sees: user asked → I requested tool → tool returned data → I answer
```

### Common Mistake: Forgetting the Assistant Message

```python
# WRONG - Not including the assistant's tool_call message
messages_for_next_call = [
    {"role": "system", "content": "You are a monitoring assistant."},
    {"role": "user", "content": "Read temperature from T-01"},
    # Missing: message (assistant's tool_call)!
    {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "content": '{"temperature": 72.5}'
    }
]

# The AI will be confused - it sees a tool result but doesn't know
# which tool it requested or what arguments it used!

# RIGHT - Always include the assistant's tool_call message
messages_for_next_call = [
    {"role": "system", "content": "You are a monitoring assistant."},
    {"role": "user", "content": "Read temperature from T-01"},
    message,  # Include the assistant's tool_call!
    {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "content": '{"temperature": 72.5}'
    }
]
```

### 5. Complete Message List Structure

Here is the full conversation with tool calls visible at each step.

```python
full_conversation = [
    {"role": "system", "content": "You are a monitoring assistant."},
    {"role": "user", "content": "Read temperature from T-01 and humidity from T-02"},
    {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "call_001",
                "type": "function",
                "function": {"name": "read_sensor", "arguments": '{"sensor_id":"T-01","metric":"temperature"}'}
            },
            {
                "id": "call_002",
                "type": "function",
                "function": {"name": "read_sensor", "arguments": '{"sensor_id":"T-02","metric":"humidity"}'}
            }
        ]
    },
    {"role": "tool", "tool_call_id": "call_001", "content": '{"sensor_id":"T-01","temperature":72.5}'},
    {"role": "tool", "tool_call_id": "call_002", "content": '{"sensor_id":"T-02","humidity":62.0}'},
    {
        "role": "assistant",
        "content": "T-01 temperature is 72.5°C and T-02 humidity is 62.0%."
    }
]

for i, msg in enumerate(full_conversation):
    role = msg["role"]
    if role == "tool":
        print(f"  [{i}] {role} (call {msg['tool_call_id']}): {msg['content']}")
    elif msg.get("tool_calls"):
        calls = [tc["function"]["name"] for tc in msg["tool_calls"]]
        print(f"  [{i}] {role}: tool_calls={calls}")
    else:
        content = (msg.get("content") or "")[:60]
        print(f"  [{i}] {role}: {content}")
```

Output:
```
  [0] system: You are a monitoring assistant.
  [1] user: Read temperature from T-01 and humidity from T-02
  [2] assistant: tool_calls=['read_sensor', 'read_sensor']
  [3] tool (call call_001): {"sensor_id":"T-01","temperature":72.5}
  [4] tool (call call_002): {"sensor_id":"T-02","humidity":62.0}
  [5] assistant: T-01 temperature is 72.5°C and T-02 humidity is 62.0%.
```

**What's happening:**
```python
# Message [0]: System prompt (sets AI behavior)
# Message [1]: User request (asks for two sensor readings)
# Message [2]: Assistant responds with TWO tool_calls
#              content is None (not answering yet)
#              tool_calls has 2 requests (parallel execution!)
# Message [3]: Tool result for call_001 (T-01 temperature)
# Message [4]: Tool result for call_002 (T-02 humidity)
# Message [5]: Assistant final response (synthesizes both results)

# KEY INSIGHT: The AI can request MULTIPLE tools in one response!
# Your code must:
# 1. Execute ALL requested tools
# 2. Return ALL results
# 3. Then the AI generates one final response
```

### Error Scenarios and Fixes

```python
# ERROR 1: Wrong tool_call_id in result
tool_result = {
    "role": "tool",
    "tool_call_id": "wrong_id",  # Doesn't match any tool_call!
    "content": '{"temperature": 72.5}'
}
# Raises: openai.BadRequestError

# FIX: Always use the exact tool_call_id from the request
tool_result = {
    "role": "tool",
    "tool_call_id": tool_call.id,  # Match the ID exactly
    "content": json.dumps(result),
}


# ERROR 2: Forgetting to parse JSON arguments
args = tool_call.function.arguments  # This is a STRING!
result = read_sensor(args)  # Passing string instead of dict!

# FIX: Parse JSON first
import json
args = json.loads(tool_call.function.arguments)  # Now it's a dict
result = read_sensor(**args)


# ERROR 3: Not converting result to JSON string
result = {"temperature": 72.5}  # Python dict
tool_result = {
    "role": "tool",
    "tool_call_id": "call_abc123",
    "content": result  # Wrong! Should be string
}

# FIX: Convert to JSON string
tool_result = {
    "role": "tool",
    "tool_call_id": "call_abc123",
    "content": json.dumps(result)  # Now it's a string
}


# ERROR 4: Tool function raises exception
def read_sensor(sensor_id: str, metric: str) -> dict:
    raise ValueError("Sensor not found")  # Exception!

# The exception will crash your code!

# FIX: Wrap in try/except
try:
    result = read_sensor(**args)
except Exception as e:
    result = {"error": str(e)}  # Return error as result
```

### Production Example: Complete Tool Executor

```python
import json
from typing import Callable

class ToolExecutor:
    def __init__(self):
        self._tools: dict[str, Callable] = {}
    
    def register(self, name: str, func: Callable) -> "ToolExecutor":
        self._tools[name] = func
        return self
    
    def execute(self, tool_call) -> dict:
        """Execute a tool call and return the result message."""
        function_name = tool_call.function.name
        tool_call_id = tool_call.id
        
        # Check if tool exists
        if function_name not in self._tools:
            return {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps({"error": f"Unknown tool: {function_name}"})
            }
        
        # Parse arguments
        try:
            args = json.loads(tool_call.function.arguments)
        except json.JSONDecodeError as e:
            return {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps({"error": f"Invalid JSON: {e}"})
            }
        
        # Execute function
        try:
            result = self._tools[function_name](**args)
            return {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps(result)
            }
        except Exception as e:
            return {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps({"error": str(e)})
            }
    
    def execute_all(self, tool_calls) -> list[dict]:
        """Execute multiple tool calls."""
        return [self.execute(tc) for tc in tool_calls]

# Usage
executor = ToolExecutor()
executor.register("read_sensor", read_sensor)
executor.register("set_alarm", set_alarm)

# Execute all tool calls from AI response
tool_results = executor.execute_all(message.tool_calls)
```

### Summary

Tool calling follows a strict message sequence: user -> assistant (with tool_calls) -> tool (results) -> assistant (final). Define tools as JSON schemas. The model generates structured `tool_call` objects, not arbitrary text. Your code executes the function and returns results as `tool` role messages with matching `tool_call_id`. The model then synthesizes the results into a natural language answer.

### Quick Reference

| Concept | Syntax/Value | Description |
|---------|--------------|-------------|
| Tool definition | `{"type": "function", "function": {...}}` | Define available tools |
| `tool_choice` | `"auto"`, `"none"`, `"required"` | Control tool usage |
| `tool_calls` | `message.tool_calls` | AI's tool requests |
| `tool_call_id` | `tool_call.id` | Unique request ID |
| Tool result | `{"role": "tool", "tool_call_id": ..., "content": ...}` | Execution result |
| Arguments | `json.loads(tool_call.function.arguments)` | Parse JSON to dict |
| Result format | `json.dumps(result)` | Convert dict to JSON string |
| Multiple tools | AI can request several in one response | Execute all, return all |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: The Tool Message Role**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 tool message role**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

