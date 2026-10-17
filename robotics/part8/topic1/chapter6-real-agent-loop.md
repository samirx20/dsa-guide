# Part 8, Topic 1: Function Routing
## Chapter 3: The Real Agent Loop

**Prerequisite Knowledge:** The Chat Completions API, Tool Calling, Tool Message Role, FunctionRouter, and JSON Schema Generation.

---

### The 'Concierge and the Kitchen' Analogy

Imagine a hotel concierge. A guest says, "I need dinner reservations and a taxi at 8." The concierge doesn't cook the food or drive the taxi. Instead, the concierge:

1. Writes two orders on kitchen slips
2. Hands slip A to the kitchen, slip B to the valet
3. Waits for both to come back with confirmations
4. Tells the guest: "Dinner is booked at La Maison, taxi arrives at 7:55."

But sometimes the kitchen says, "La Maison is full — should I try Chez Marcel?" The concierge must go back to the guest (or decide themselves) and try again. This is the agent loop: the model requests tools, your code runs them, the model sees results and decides what to do next — repeating until the task is done.

```
┌───────────────────────────────────────────────────────────────┐
│                    THE AGENT LOOP                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   User: "Check CPU, memory, and if CPU > 80%, kill top proc" │
│                                                               │
│   ┌─────────┐    ┌──────────┐    ┌──────────────────────┐    │
│   │  User   │───>│  Agent   │───>│  Tool Router         │    │
│   │ Message │    │  (LLM)   │    │  (your Python code)  │    │
│   └─────────┘    └────┬─────┘    └──────────┬───────────┘    │
│                       │                      │                │
│                  tool_calls[]            execute()             │
│                       │                      │                │
│                       │<──── tool results ───┘                │
│                       │                                       │
│                  ┌────▼─────┐                                 │
│                  │ Decide:  │                                 │
│                  │ more     │──── No ───> Return final answer │
│                  │ tools?   │                                 │
│                  └────┬─────┘                                 │
│                       │ Yes                                   │
│                       └──── Loop back to tool_calls ──────>   │
│                                                               │
│   The model CHAINS tool calls across multiple API rounds.     │
│   Your code is the harness that keeps the loop spinning.      │
└───────────────────────────────────────────────────────────────┘
```

Previous chapters taught you the pieces: schemas, message format, FunctionRouter. This chapter assembles them into a real, runnable agent loop that talks to the OpenAI API, detects tool calls, dispatches them, feeds results back, and repeats until the model stops.

---

### 1. The Minimal Agent Loop

The core pattern: call the API, check if the response has `tool_calls`, execute them, append results, repeat.

```python
from openai import OpenAI
import json

client = OpenAI()

def read_cpu() -> dict:
    return {"cpu_percent": 45.2, "cores": 8}

def read_memory() -> dict:
    return {"used_gb": 12.3, "total_gb": 32.0}

tools = [
    {
        "type": "function",
        "function": {
            "name": "read_cpu",
            "description": "Read current CPU usage percentage",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_memory",
            "description": "Read current memory usage in GB",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    }
]

def execute_tool(name: str, arguments: str) -> dict:
    funcs = {"read_cpu": read_cpu, "read_memory": read_memory}
    if name not in funcs:
        return {"error": f"Unknown function: {name}"}
    try:
        args = json.loads(arguments) if arguments else {}
        return funcs[name](**args)
    except Exception as e:
        return {"error": str(e)}

messages = [
    {"role": "system", "content": "You are a server monitoring assistant. Use tools to check system health."},
    {"role": "user", "content": "How's the server doing?"}
]

MAX_ROUNDS = 10
for round_num in range(MAX_ROUNDS):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.0,
    )

    message = response.choices[0].message
    messages.append(message)

    if not message.tool_calls:
        print(f"Final answer: {message.content}")
        break

    for tool_call in message.tool_calls:
        name = tool_call.function.name
        args = tool_call.function.arguments
        result = execute_tool(name, args)
        print(f"  Round {round_num+1}: {name}() -> {result}")
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
        })
else:
    print("Hit max rounds without a final answer")
```

**What's happening:**
```python
for round_num in range(MAX_ROUNDS):
    #  ┌─────────────────────────────────────────────────────┐
    #  │ Each iteration = one API call + one dispatch cycle  │
    #  │ Round 0: User question -> model requests tools      │
    #  │ Round 1: Tool results -> model requests more tools  │
    #  │ Round 2: Tool results -> model gives final answer   │
    #  └─────────────────────────────────────────────────────┘

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,     # Full conversation history grows each round
        tools=tools,           # Same tool menu every round
        tool_choice="auto",    # Model decides: use a tool or answer directly
    )

    message = response.choices[0].message
    messages.append(message)   # CRITICAL: append the assistant's response

    if not message.tool_calls:
        # Model chose to answer directly (no tool_calls)
        # This is the EXIT CONDITION for the loop
        print(f"Final answer: {message.content}")
        break

    for tool_call in message.tool_calls:
        # Model may request MULTIPLE tools in one response
        name = tool_call.function.name           # "read_cpu"
        args = tool_call.function.arguments      # '{}' (JSON string)

        result = execute_tool(name, args)        # Run the real function

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,        # Links result to request
            "content": json.dumps(result)        # Must be JSON string
        })
```

Output:
```
  Round 1: read_cpu() -> {'cpu_percent': 45.2, 'cores': 8}
  Round 1: read_memory() -> {'used_gb': 12.3, 'total_gb': 32.0}
Final answer: Server looks healthy. CPU is at 45.2% across 8 cores, and memory usage is 12.3 GB out of 32.0 GB (38.4% utilized). No immediate concerns.
```

### The Three Exit Conditions

```
    ┌──────────────────────────────────────────────────────┐
    │           WHEN DOES THE LOOP STOP?                    │
    ├──────────────────────────────────────────────────────┤
    │                                                      │
    │  Exit 1: Normal                                     │
    │    message.tool_calls is None/empty                  │
    │    → Model decided to answer directly                │
    │    → break out of loop                               │
    │                                                      │
    │  Exit 2: Safety                                     │
    │    round_num reaches MAX_ROUNDS                      │
    │    → Prevents infinite loops                         │
    │    → for-else catches this                           │
    │                                                      │
    │  Exit 3: Error                                      │
    │    API call throws exception                         │
    │    → try/except catches it (Section 4 loop)          │
    │    → continue to the next round (not break)          │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

---

### 2. Multiple Tool Calls Per Round

The model can request several tools in one response. Your harness must execute all of them and append all results before the next API call.

```python
# Simulate what the model returns with multiple tool_calls
simulated_response = {
    "tool_calls": [
        {"id": "call_001", "function": {"name": "read_cpu", "arguments": "{}"}},
        {"id": "call_002", "function": {"name": "read_memory", "arguments": "{}"}},
        {"id": "call_003", "function": {"name": "list_processes", "arguments": "{}"}},
    ]
}

# WRONG: Only executing the first tool call
for tool_call in [simulated_response["tool_calls"][0]]:  # Only call_001!
    result = execute_tool(tool_call["function"]["name"], tool_call["function"]["arguments"])

# RIGHT: Execute ALL tool calls
for tool_call in simulated_response["tool_calls"]:
    result = execute_tool(tool_call["function"]["name"], tool_call["function"]["arguments"])
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call["id"],
        "content": json.dumps(result)
    })
```

**What's happening:**
```python
for tool_call in simulated_response["tool_calls"]:
    #  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #  └── Iterates over ALL tool calls, not just [0]
    #
    #  Round might look like:
    #    call_001 -> read_cpu() -> {"cpu_percent": 45.2}
    #    call_002 -> read_memory() -> {"used_gb": 12.3}
    #    call_003 -> list_processes() -> [{"pid": 1234, ...}]
    #
    #  Each result is a SEPARATE tool message in the conversation.
    #  The model needs all of them to form its final answer.

    messages.append({
        "role": "tool",
        "tool_call_id": tool_call["id"],
        #              ^^^^^^^^^^^^^
        #              Each tool message must reference its specific call ID
        #              This is how the model knows which result goes where

        "content": json.dumps(result)
    })

# After the loop, messages looks like:
# [..., assistant(tool_calls=[3 items]), tool(call_001), tool(call_002), tool(call_003)]
#                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                                                        All three must be present
#                                                        before the next API call
```

### Parallel vs Sequential Execution

When the model requests multiple independent tools, you can execute them in parallel:

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

def execute_tool_parallel(tool_calls: list) -> list[dict]:
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for tc in tool_calls:
            future = executor.submit(
                execute_tool, tc["function"]["name"], tc["function"]["arguments"]
            )
            futures[future] = tc

        for future in futures:
            tc = futures[future]
            try:
                result = future.result(timeout=5)
            except Exception as e:
                result = {"error": str(e)}
            results.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps(result)
            })
    return results

# Usage inside the loop
tool_messages = execute_tool_parallel([tc.model_dump() for tc in message.tool_calls])
messages.extend(tool_messages)
```

**What's happening:**
```python
with ThreadPoolExecutor(max_workers=4) as executor:
    #  ┌───────────────────────────────────────────────────┐
    #  │ If model requests 3 tools:                        │
    #  │   Sequential: Tool1 (2s) + Tool2 (2s) + Tool3    │
    #  │                = 6 seconds total                  │
    #  │   Parallel:   Tool1 (2s) + Tool2 + Tool3         │
    #  │                = ~2 seconds total                 │
    #  │                                                   │
    #  │ Only works for INDEPENDENT tools (no dependencies)│
    #  │ If Tool2 needs Tool1's result, you must go        │
    #  │ sequential and let the model decide the order.    │
    #  └───────────────────────────────────────────────────┘

    futures = {}
    for tc in tool_calls:
        future = executor.submit(execute_tool, ...)
        #       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        #       └── Submits work to thread pool, returns immediately
        futures[future] = tc

    for future in futures:
        result = future.result(timeout=5)
        #                        ^^^^^^
        #                        └── Blocks until this specific tool finishes
        #                            Timeout prevents hanging forever
```

---

### 3. Streaming With Tools

When streaming, tool calls arrive in chunks. You must accumulate them before executing.

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto",
    stream=True,
)

collected_content = ""
collected_tool_calls = {}

for chunk in stream:
    delta = chunk.choices[0].delta
    finish = chunk.choices[0].finish_reason

    # Accumulate text content
    if delta.content:
        collected_content += delta.content
        print(delta.content, end="", flush=True)

    # Accumulate tool calls (they arrive in pieces!)
    if delta.tool_calls:
        for tc in delta.tool_calls:
            index = tc.index
            if index not in collected_tool_calls:
                collected_tool_calls[index] = {
                    "id": "",
                    "name": "",
                    "arguments": ""
                }

            if tc.id:
                collected_tool_calls[index]["id"] = tc.id
            if tc.function:
                if tc.function.name:
                    collected_tool_calls[index]["name"] = tc.function.name
                if tc.function.arguments:
                    collected_tool_calls[index]["arguments"] += tc.function.arguments

    if finish == "stop":
        break
    if finish == "tool_calls":
        break

if collected_tool_calls:
    print(f"\nModel requested {len(collected_tool_calls)} tool(s)")
    for idx, tc in collected_tool_calls.items():
        print(f"  {tc['name']}({tc['arguments']})")
```

**What's happening:**
```python
# Tool calls arrive in FRAGMENTS during streaming:
#
# Chunk 1: delta.tool_calls[0].index = 0, tc.id = "call_abc"
# Chunk 2: delta.tool_calls[0].function.name = "read_cpu"
# Chunk 3: delta.tool_calls[0].function.arguments = '{"co'
# Chunk 4: delta.tool_calls[0].function.arguments = 'res": 2}'
#
# You must REASSEMBLE the full tool call from these pieces.

collected_tool_calls = {}
#  ^^^^^^^^^^^^^^^^^^
#  └── Keyed by index (0, 1, 2...) because the model
#      can stream MULTIPLE tool calls simultaneously

    if tc.function.arguments:
        collected_tool_calls[index]["arguments"] += tc.function.arguments
        #                                          ^^^^^^^^^^^^^^^^^^^^^^^
        #                                          APPEND, don't overwrite!
        #                                          Each chunk is a fragment

# finish_reason tells you WHY the stream ended:
#   "stop"      = model finished answering (no tool calls)
#   "tool_calls" = model wants to call tools (execute them!)
```

### Streaming Comparison

| Aspect | Non-Streaming | Streaming |
|--------|--------------|-----------|
| Response | Full `message` object at once | Chunks arrive incrementally |
| Tool calls | `message.tool_calls` is complete | Must accumulate from `delta.tool_calls` |
| Content | `message.content` is complete | Print `delta.content` as it arrives |
| Finish detection | `if not message.tool_calls` | `if finish_reason == "tool_calls"` |
| Use case | Simple agents, batch jobs | UX-heavy apps, long responses |

---

### 4. Error Recovery in the Loop

Real agents hit errors. The loop must handle them without crashing.

```python
def agent_loop(messages, tools, execute_func, max_rounds=10):
    for round_num in range(max_rounds):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=tools,
                temperature=0.0,
            )
        except Exception as e:
            # API error (rate limit, network, etc.)
            messages.append({
                "role": "user",
                "content": f"[System] API error: {e}. Please provide your best answer without tools."
            })
            continue

        message = response.choices[0].message
        messages.append(message)

        if not message.tool_calls:
            return message.content

        for tool_call in message.tool_calls:
            name = tool_call.function.name
            args = tool_call.function.arguments

            try:
                result = execute_func(name, args)
            except Exception as e:
                result = {"error": f"Tool execution failed: {e}"}

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })

    return "Agent reached max rounds without a final answer."

answer = agent_loop(messages, tools, execute_tool)
print(answer)
```

**What's happening:**
```python
try:
    response = client.chat.completions.create(...)
except Exception as e:
    messages.append({
        "role": "user",
        #     ^^^^
        #     Inject a SYSTEM message as a user message
        #     This tells the model about the error
    })
    continue
    #     ^^^^^^^
    #     Skip to next round — model will see the error
    #     and hopefully answer without needing the failed tool

for tool_call in message.tool_calls:
    try:
        result = execute_func(name, args)
    except Exception as e:
        result = {"error": f"Tool execution failed: {e}"}
        #  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        #  └── Don't crash the loop!
        #      Send the error back to the model as a tool result.
        #      The model will see "Tool execution failed: ..."
        #      and either retry with different args or answer without the tool.
```

### Error Recovery Comparison

| Error Type | Where | Recovery |
|-----------|-------|----------|
| API rate limit | `client.chat.completions.create()` | Catch, retry with backoff, or inject error message |
| Network timeout | `client.chat.completions.create()` | Catch, retry once, then inject error |
| Unknown function name | `execute_tool()` | Return `{"error": "Unknown function"}` as tool result |
| Bad JSON arguments | `json.loads()` | Return `{"error": "Invalid JSON"}` as tool result |
| Function raises exception | Inside the tool | Catch, return error dict as tool result |
| Model keeps calling same failing tool | Loop detection | Count calls per tool, force `tool_choice="none"` after N failures |

---

### 5. Full Production Agent

Combine everything: FunctionRouter, tool schemas, error handling, parallel execution, and loop safety.

```python
import json
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor

client = OpenAI()

class Agent:
    def __init__(self, system_prompt: str, tools: list[dict], max_rounds: int = 10):
        self.system_prompt = system_prompt
        self.tools = tools
        self.max_rounds = max_rounds
        self._functions = {}
        self._log = []

    def register(self, name: str, func, description: str = ""):
        self._functions[name] = {"func": func, "description": description}
        return self

    def _execute(self, name: str, arguments: str) -> dict:
        if name not in self._functions:
            return {"error": f"Unknown function: {name}"}
        try:
            args = json.loads(arguments) if arguments else {}
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {e}"}
        try:
            result = self._functions[name]["func"](**args)
            self._log.append({"function": name, "status": "ok"})
            return result
        except Exception as e:
            self._log.append({"function": name, "status": "error", "error": str(e)})
            return {"error": str(e)}

    def _parallel_execute(self, tool_calls) -> list[dict]:
        results = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {}
            for tc in tool_calls:
                future = executor.submit(
                    self._execute, tc.function.name, tc.function.arguments
                )
                futures[future] = tc
            for future in futures:
                tc = futures[future]
                try:
                    result = future.result(timeout=5)
                except Exception as e:
                    result = {"error": str(e)}
                results.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result)
                })
        return results

    def run(self, user_message: str) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]

        for round_num in range(self.max_rounds):
            try:
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=self.tools,
                    temperature=0.0,
                )
            except Exception as e:
                messages.append({
                    "role": "user",
                    "content": f"[System] API error: {e}"
                })
                continue

            message = response.choices[0].message
            messages.append(message)

            if not message.tool_calls:
                return message.content

            tool_results = self._parallel_execute(message.tool_calls)
            messages.extend(tool_results)

        return "Reached maximum processing rounds."

# --- Usage ---

def read_cpu() -> dict:
    return {"cpu_percent": 45.2}

def read_memory() -> dict:
    return {"used_gb": 12.3, "total_gb": 32.0}

def read_disk(path: str = "/") -> dict:
    return {"path": path, "used_gb": 120.5, "free_gb": 380.0}

tools = [
    {"type": "function", "function": {"name": "read_cpu", "description": "Read CPU usage", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "read_memory", "description": "Read memory usage", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "read_disk", "description": "Read disk usage for a path", "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "Mount path"}}, "required": ["path"]}}},
]

agent = Agent(
    system_prompt="You are a server monitoring assistant. Use tools to check system health.",
    tools=tools,
)

agent.register("read_cpu", read_cpu, "Read CPU usage")
agent.register("read_memory", read_memory, "Read memory usage")
agent.register("read_disk", read_disk, "Read disk usage")

answer = agent.run("Full system health check")
print(answer)
```

**What's happening:**
```python
class Agent:
    def __init__(self, system_prompt, tools, max_rounds=10):
        self.system_prompt = system_prompt
        self.tools = tools
        self.max_rounds = max_rounds
        #  ^^^^^^^^^^^
        #  └── Safety limit: prevents infinite loops
        #      Real agents can get stuck calling tools in circles

    def run(self, user_message: str) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]
        #  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        #  └── Fresh conversation each call
        #      Messages accumulate INSIDE the loop

        for round_num in range(self.max_rounds):
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=self.tools,
            )

            message = response.choices[0].message
            messages.append(message)

            if not message.tool_calls:
                return message.content
                #     ^^^^^^^^^^^^^^
                #     └── EXIT: model gave a direct answer

            tool_results = self._parallel_execute(message.tool_calls)
            messages.extend(tool_results)
            #          ^^^^^^^^^^^^^^^
            #          └── Append ALL tool results before next API call

        return "Reached maximum processing rounds."
        #     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        #     └── EXIT: safety limit reached
```

Output:
```
Server health summary:
- CPU: 45.2% utilization
- Memory: 12.3 GB used / 32.0 GB total (38.4%)
- Disk (/): 120.5 GB used, 380.0 GB free

All systems nominal. No immediate action needed.
```

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT CLASS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  __init__(system_prompt, tools, max_rounds)                        │
│    ├── system_prompt: str          Instructions for the LLM         │
│    ├── tools: list[dict]           JSON schemas (the "menu")        │
│    └── max_rounds: int             Safety limit (default 10)        │
│                                                                     │
│  register(name, func, description)                                  │
│    └── Adds function to internal registry                          │
│                                                                     │
│  run(user_message) -> str                                           │
│    ├── Creates fresh message list                                   │
│    ├── LOOP (up to max_rounds):                                     │
│    │   ├── API call with messages + tools                           │
│    │   ├── If no tool_calls -> RETURN final answer                  │
│    │   ├── Execute all tool calls (parallel)                        │
│    │   ├── Append tool results to messages                          │
│    │   └── Continue loop                                            │
│    └── RETURN fallback if max rounds hit                            │
│                                                                     │
│  _execute(name, arguments) -> dict                                  │
│    └── Registry lookup -> parse JSON -> call func -> return result  │
│                                                                     │
│  _parallel_execute(tool_calls) -> list[dict]                        │
│    └── ThreadPoolExecutor -> execute all tools concurrently         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6. Common Pitfalls

#### Pitfall 1: Forgetting the assistant message

```python
# WRONG: Only appending tool results, not the assistant's tool_call message
messages.append({
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": json.dumps(result)
})

# RIGHT: Append BOTH the assistant message AND the tool result
messages.append(message)  # The assistant's response with tool_calls
messages.append({
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": json.dumps(result)
})
```

#### Pitfall 2: Not clearing tool_calls between rounds

```python
# WRONG: Checking tool_calls on the wrong message
if not messages[-1].tool_calls:
    break
# messages[-1] might be a tool result, not the assistant's response!

# RIGHT: Check tool_calls on the current response
message = response.choices[0].message
if not message.tool_calls:
    break
```

#### Pitfall 3: Sending tool results without tool_call_id

```python
# WRONG: Missing tool_call_id
{"role": "tool", "content": "45.2%"}
# API will reject this — tool_call_id is required!

# RIGHT: Include the matching ID
{"role": "tool", "tool_call_id": "call_abc123", "content": "45.2%"}
```

#### Pitfall 4: Passing list instead of JSON string

```python
# WRONG: Passing a dict/list directly
{"role": "tool", "tool_call_id": "call_abc", "content": {"temp": 72.5}}
# API expects a STRING, not a dict!

# RIGHT: Serialize to JSON string
{"role": "tool", "tool_call_id": "call_abc", "content": json.dumps({"temp": 72.5})}
```

---

### Quick Reference

| Component | Purpose | Example |
|-----------|---------|---------|
| `for round_num in range(max_rounds)` | Loop with safety limit | Prevents infinite tool calling |
| `response.choices[0].message` | Get model's response | Contains `content` and `tool_calls` |
| `message.tool_calls` | List of tool requests | `None` when model answers directly |
| `tool_call.function.name` | Function to call | `"read_cpu"` |
| `tool_call.function.arguments` | JSON string of args | `'{"path": "/"}'` |
| `tool_call.id` | Unique request ID | `"call_abc123"` — must match in result |
| `{"role": "tool", "tool_call_id": ..., "content": ...}` | Tool result message | `json.dumps(result)` as content |
| `ThreadPoolExecutor` | Parallel tool execution | Execute independent tools concurrently |
| `finish_reason == "tool_calls"` | Streaming detection | Model wants to call tools |
| `if not message.tool_calls: break` | Loop exit condition | Model gave final answer |
| `messages.append(message)` | History tracking | MUST include assistant msg before tool results |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: The Real Agent Loop**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter6 real agent loop**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

