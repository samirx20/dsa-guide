# Part 8, Topic 1: LLM APIs & Message History
## Chapter 1: The Chat Completions API

**Prerequisite Knowledge:** Basic understanding of Python lists, dictionaries, and API requests.

### The 'Walkie-Talkie' Analogy
Imagine communicating with someone over a walkie-talkie. You press the button and say, "Base, this is unit one, what's our objective?" The person at the base hears your role (unit one) and your message. They press their button and reply, "Unit one, this is base, your objective is to gather supplies." 

The Chat Completions API works exactly like a walkie-talkie conversation. You don't just send a random string of text; you send an organized list of messages. Each message is tagged with who said it (the "role") and what they said (the "content"). The AI reads the entire transcript of the walkie-talkie conversation, figures out what should be said next, and sends back the next message.

The Chat Completions API is the foundation of every LLM application. Understanding its message format, roles, and parameters is essential before you can build agents that reason, call tools, or maintain conversations.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WALKIE-TALKIE ANALOGY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   USER (Factory Floor)        AI (Control Room)                 │
│   ┌─────────────┐            ┌─────────────┐                   │
│   │ Role: user  │───msg───>  │ Reads all   │                   │
│   │ Content: ?  │            │ messages    │                   │
│   └─────────────┘            │ Chooses next│                   │
│                              │ response    │                   │
│   ┌─────────────┐            └──────┬──────┘                   │
│   │ Role: system│<──reply──         │                          │
│   │ Sets rules  │                   ▼                          │
│   └─────────────┘            ┌─────────────┐                   │
│                              │ Role: assist│                   │
│                              │ Content: ...│                   │
│                              └─────────────┘                   │
│                                                                 │
│   Messages List = Complete Transcript                          │
│   [system, user, assistant, user, assistant, ...]              │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Message Roles

Every message has a role. The three core roles are `system`, `user`, and `assistant`.

- `system`: Sets the AI's behavior and context. Not visible to the user.
- `user`: The human's input. What the AI responds to.
- `assistant`: The AI's previous responses. Provides conversation continuity.

```python
# A simple conversation history stored as a list of dictionaries
messages = [
    {"role": "system", "content": "You are a sensor monitoring assistant. Respond concisely."},
    {"role": "user", "content": "What is the normal operating temperature for a server rack?"},
]

for msg in messages:
    print(f"[{msg['role']}] {msg['content']}")
```

Output:
```
[system] You are a sensor monitoring assistant. Respond concisely.
[user] What is the normal operating temperature for a server rack?
```

**What's happening:**
```python
messages = [
    {"role": "system", "content": "You are a sensor monitoring assistant. Respond concisely."},
    #       ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #       |             └── The actual text content of the message
    #       └── Who is speaking (system, user, or assistant)
    
    {"role": "user", "content": "What is the normal operating temperature for a server rack?"},
    #       ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #       |         └── The user's question
    #       └── The human is speaking
]
# messages is a LIST of DICTIONARIES
# Each dictionary has exactly two keys: "role" and "content"
# The AI reads ALL messages in order to understand context
```

### Message Role Comparison Table

| Role | Who Sends | Purpose | Visible to User | Example |
|------|-----------|---------|-----------------|---------|
| `system` | Developer | Set AI behavior, rules, context | No | "You are a sensor assistant" |
| `user` | Human | Ask questions, give commands | Yes | "What is the temperature?" |
| `assistant` | AI | Previous responses, conversation history | Yes | "The temperature is 72.5°C" |

### Common Mistake: Wrong Role Usage

```python
# WRONG - Putting system instructions in user message
messages = [
    {"role": "user", "content": "You are a sensor assistant. Answer concisely."},
    {"role": "user", "content": "What is the temperature?"},
]

# RIGHT - System role for instructions, user role for questions
messages = [
    {"role": "system", "content": "You are a sensor assistant. Answer concisely."},
    {"role": "user", "content": "What is the temperature?"},
]
```

**What's happening:**
```python
# WRONG: The AI treats system instructions as user input
# It might follow them, but it's not reliable
# The user could override them by saying "ignore previous instructions"

# RIGHT: System role is special - it's processed first and has higher priority
# The AI treats it as background context, not user conversation
```

### 2. Calling the API

Using the `openai` library, send a messages list and receive a completion.

```python
from openai import OpenAI

client = OpenAI()

# Ask the AI to generate the next message in the conversation
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant. Be concise."},
        {"role": "user", "content": "What is 2 + 2?"},
    ],
    temperature=0.0, # 0.0 means give the most predictable, logical answer
    max_tokens=50,   # limit the response to a short length
)

# Dig into the response object to find the text the AI generated
ai_reply = response.choices[0].message.content
print(ai_reply)
```

Output:
```
4
```

**What's happening:**
```python
response = client.chat.completions.create(
    model="gpt-4o",
    #       ^^^^^^
    #       The AI model to use (GPT-4o is the latest)
    
    messages=[
        {"role": "system", "content": "You are a helpful assistant. Be concise."},
        #               System sets behavior first
        
        {"role": "user", "content": "What is 2 + 2?"},
        #               User asks the question
    ],
    
    temperature=0.0,
    #           ^^^
    #           0.0 = deterministic (same input → same output)
    #           1.0 = creative (varied outputs)
    
    max_tokens=50,
    #          ^^
    #          Maximum tokens in the response (stops early if hit)
)

# The response object structure:
# response.choices[0]           → First option (usually only one)
# response.choices[0].message   → The assistant's message
# response.choices[0].message.content → The actual text
```

### API Response Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     API RESPONSE STRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   response                                                       │
│   ├── id: "chatcmpl-abc123"                                     │
│   ├── model: "gpt-4o"                                           │
│   ├── choices[]                                                  │
│   │   └── [0]                                                    │
│   │       ├── message                                            │
│   │       │   ├── role: "assistant"                              │
│   │       │   └── content: "4"                                   │
│   │       └── finish_reason: "stop"                              │
│   └── usage                                                      │
│       ├── prompt_tokens: 25                                      │
│       ├── completion_tokens: 7                                   │
│       └── total_tokens: 32                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Understanding Parameters

`temperature` controls randomness (0.0 = deterministic, 1.0 = creative). `max_tokens` limits the response length.

```python
# Ask for a creative answer
response_creative = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Describe a sensor in one sentence."},
    ],
    temperature=1.0, # High temperature = creative/random
    max_tokens=50,
)

# Ask for a predictable, robotic answer
response_precise = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Describe a sensor in one sentence."},
    ],
    temperature=0.0, # Low temperature = strict/predictable
    max_tokens=50,
)

print("Creative:", response_creative.choices[0].message.content)
print("Precise:", response_precise.choices[0].message.content)
```

**What's happening:**
```python
# temperature = 1.0 (Creative)
# The AI takes risks with word choice
# May use metaphors, unusual comparisons
# Different calls produce different outputs

# temperature = 0.0 (Precise)
# The AI picks the most statistically likely next token
# Consistent, repeatable outputs
# Best for tool-calling and factual responses

# For agentic applications:
# - Use 0.0 for tool-calling (deterministic)
# - Use 0.7 for general chat (balanced)
# - Use 1.0 for creative writing (varied)
```

### Temperature Comparison

| Temperature | Behavior | Use Case | Consistency |
|-------------|----------|----------|-------------|
| 0.0 | Deterministic, predictable | Tool-calling, factual Q&A | Same input → same output |
| 0.3 | Mostly predictable, slight variation | Data analysis, summaries | Very consistent |
| 0.7 | Balanced creativity | General chat, code generation | Moderate variation |
| 1.0 | Maximum creativity | Creative writing, brainstorming | Highly varied |

### Edge Case: Temperature with Same Prompt

```python
# Same prompt, different temperatures
prompt = "Complete this sentence: The factory sensor detected..."

# Low temperature (0.0) - always similar
for i in range(3):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=20,
    )
    print(f"  0.0: {response.choices[0].message.content}")

# High temperature (1.0) - varied outputs
for i in range(3):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=1.0,
        max_tokens=20,
    )
    print(f"  1.0: {response.choices[0].message.content}")
```

For agentic applications, use `temperature=0.0` for deterministic tool-calling behavior.

### 4. Multi-Turn Conversations

To maintain context, include previous assistant messages in the messages list.

```python
# The list holds the memory of everything said so far
messages = [
    {"role": "system", "content": "You are a temperature monitoring assistant."},
    {"role": "user", "content": "What is the current reading from sensor T-01?"},
    {"role": "assistant", "content": "Sensor T-01 reads 72.5°C, which is within normal range."},
    {"role": "user", "content": "What about T-02?"},
]

# Send the whole history to the AI
response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0.0,
    max_tokens=100,
)

print(response.choices[0].message.content)
```

**What's happening:**
```python
messages = [
    {"role": "system", "content": "You are a temperature monitoring assistant."},
    #     System message sets the AI's role
    
    {"role": "user", "content": "What is the current reading from sensor T-01?"},
    #     User asks first question
    
    {"role": "assistant", "content": "Sensor T-01 reads 72.5°C..."},
    #     Assistant's previous response (stored for context)
    
    {"role": "user", "content": "What about T-02?"},
    #     User asks follow-up (references T-01 context)
]

# The AI sees ALL messages:
# 1. Knows it's a temperature monitoring assistant
# 2. Remembers it gave T-01 reading as 72.5°C
# 3. Understands "What about T-02?" means "read T-02 like you did T-01"

# Without the assistant message, the AI wouldn't know:
# - What T-01 reading was
# - What "What about T-02?" refers to
```

### Common Mistake: Missing Assistant Messages

```python
# WRONG - Only sending user messages
messages = [
    {"role": "system", "content": "You are a temperature monitoring assistant."},
    {"role": "user", "content": "What is T-01?"},
    # AI responds: "T-01 reads 72.5°C"
    # But we didn't store the response!
    {"role": "user", "content": "What about T-02?"},
    # AI has no context about T-01!
]

# RIGHT - Include assistant responses
messages = [
    {"role": "system", "content": "You are a temperature monitoring assistant."},
    {"role": "user", "content": "What is T-01?"},
    {"role": "assistant", "content": "T-01 reads 72.5°C"},  # Store the response!
    {"role": "user", "content": "What about T-02?"},
]
```

### Conversation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TURN CONVERSATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Turn 1:                                                       │
│   User: "What is T-01?"                                         │
│        ↓                                                        │
│   AI: "T-01 reads 72.5°C" (stored as assistant message)        │
│                                                                 │
│   Turn 2:                                                       │
│   User: "What about T-02?"                                      │
│        ↓                                                        │
│   AI sees: [system, user, assistant, user]                      │
│   AI knows: "User asked about T-01, I said 72.5°C"             │
│   AI responds: "T-02 reads 68.3°C, lower than T-01"            │
│                                                                 │
│   Without storing assistant messages, AI loses context!         │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Parsing the Response

The API returns a structured object. Extract the content and metadata.

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "List 3 sensor types used in industrial monitoring."},
    ],
    temperature=0.0,
    max_tokens=150,
)

# The API can return multiple options, we usually just want the first one [0]
choice = response.choices[0]
message = choice.message

print(f"Role: {message.role}")
print(f"Content: {message.content}")

# Why did the AI stop typing?
print(f"Finish reason: {choice.finish_reason}")

# How much did this cost us?
print(f"Tokens used: {response.usage.total_tokens}")
print(f"Prompt tokens: {response.usage.prompt_tokens}")
print(f"Completion tokens: {response.usage.completion_tokens}")
```

Output:
```
Role: assistant
Content: 1. Thermocouple 2. Pressure transducer 3. Flow meter
Finish reason: stop
Tokens used: 32
Prompt tokens: 25
Completion tokens: 7
```

**What's happening:**
```python
choice = response.choices[0]
#        ^^^^^^^^^^^^^^^^^^
#        The API can return multiple options (we requested 1)
#        choices[0] is the first (and usually only) option

message = choice.message
#         ^^^^^^^^^^^^^
#        The actual message object

message.role      # "assistant" (who said it)
message.content   # "1. Thermocouple..." (what they said)

choice.finish_reason
#         ^^^^^^^^^^^^^
#         Why the AI stopped:
#         "stop"   = naturally finished (said everything it needed)
#         "length" = hit max_tokens limit (response was cut off)
#         "tool"   = wants to call a tool (agentic use case)

response.usage
#         ^^^^^
#         Token counts for billing:
#         prompt_tokens     = input tokens (your messages)
#         completion_tokens = output tokens (AI's response)
#         total_tokens      = sum of both
```

### Finish Reason Comparison

| `finish_reason` | Meaning | What to Do |
|-----------------|---------|------------|
| `"stop"` | AI finished naturally | Process the response |
| `"length"` | Hit `max_tokens` limit | Increase `max_tokens` or truncate |
| `"tool"` | AI wants to call a tool | Execute the tool and send result |
| `"content_filter"` | Response blocked by safety filter | Review your prompt |

### Error Scenarios and Fixes

```python
# ERROR 1: Invalid API key
from openai import OpenAI
client = OpenAI(api_key="invalid-key")
response = client.chat.completions.create(...)
# Raises: openai.AuthenticationError

# FIX: Check your API key
client = OpenAI()  # Uses OPENAI_API_KEY env variable


# ERROR 2: Model not found
response = client.chat.completions.create(
    model="gpt-nonexistent",  # Wrong model name
    messages=[{"role": "user", "content": "Hi"}],
)
# Raises: openai.NotFoundError

# FIX: Use correct model name
response = client.chat.completions.create(
    model="gpt-4o",  # Correct name
    messages=[{"role": "user", "content": "Hi"}],
)


# ERROR 3: Empty messages list
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[],  # Empty!
)
# Raises: openai.BadRequestError

# FIX: Always include at least one message
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)


# ERROR 4: Missing role or content
messages = [
    {"role": "user"},  # Missing content!
    {"content": "Hi"},  # Missing role!
]

# FIX: Always include both keys
messages = [
    {"role": "user", "content": "Hi"},
]
```

### Production Example: Complete Chat Function

```python
from openai import OpenAI
import json

def chat(messages: list[dict], model: str = "gpt-4o") -> dict:
    """Send messages to the AI and return structured response."""
    client = OpenAI()
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.0,
            max_tokens=500,
        )
        
        choice = response.choices[0]
        
        return {
            "success": True,
            "content": choice.message.content,
            "finish_reason": choice.finish_reason,
            "usage": {
                "prompt": response.usage.prompt_tokens,
                "completion": response.usage.completion_tokens,
                "total": response.usage.total_tokens,
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }

# Usage
messages = [
    {"role": "system", "content": "You are a sensor monitoring assistant."},
    {"role": "user", "content": "What is the temperature of T-01?"},
]

result = chat(messages)
if result["success"]:
    print(f"Response: {result['content']}")
    print(f"Tokens used: {result['usage']['total']}")
else:
    print(f"Error: {result['error']}")
```

**What's happening:**
```python
def chat(messages: list[dict], model: str = "gpt-4o") -> dict:
    #                  ^^^^^^^^                ^^^^^^^
    #                  |                       └── Default model
    #                  └── Type hint: list of dictionaries
    
    client = OpenAI()
    #       ^^^^^^^^
    #       Creates client using OPENAI_API_KEY env variable
    
    try:
        response = client.chat.completions.create(...)
        # Wrap in try/except to handle API errors gracefully
        
        return {
            "success": True,           # Flag for caller
            "content": ...,            # The AI's response text
            "finish_reason": ...,      # Why it stopped
            "usage": {...},            # Token counts for billing
        }
        
    except Exception as e:
        return {
            "success": False,          # Flag for caller
            "error": str(e),           # Error message
        }
```

### Summary

The Chat Completions API uses a messages list with `system`, `user`, and `assistant` roles. Control output with `temperature` and `max_tokens`. Include previous messages for multi-turn context. Parse `response.choices[0].message.content` for the text and `response.usage` for token counts. This API is the building block for every LLM-powered application.

### Quick Reference

| Concept | Syntax/Value | Description |
|---------|--------------|-------------|
| System role | `{"role": "system", "content": "..."}` | Set AI behavior |
| User role | `{"role": "user", "content": "..."}` | Human input |
| Assistant role | `{"role": "assistant", "content": "..."}` | AI previous response |
| Temperature | `0.0` to `1.0` | Controls randomness |
| Max tokens | Integer (e.g., `500`) | Limits response length |
| Finish reason | `"stop"`, `"length"`, `"tool"` | Why AI stopped |
| Prompt tokens | `response.usage.prompt_tokens` | Input token count |
| Completion tokens | `response.usage.completion_tokens` | Output token count |
| Content | `response.choices[0].message.content` | AI's response text |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: The Chat Completions API**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 chat completions api**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

