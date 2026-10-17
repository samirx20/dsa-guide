# Part 3, Topic 1: LLM APIs & Message History
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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Build the transcript.** What does this print?

```python
messages = [{"role": "system", "content": "You are a temperature monitoring assistant."}]
for q, a in [("What is T-01?", "T-01 reads 72.5°C"), ("What about T-02?", "T-02 reads 68.3°C")]:
    messages.append({"role": "user", "content": q})
    messages.append({"role": "assistant", "content": a})
messages.append({"role": "user", "content": "Which is hotter?"})

print(len(messages), [m["role"][0] for m in messages])
```

**Q2. Reading the usage block.** A call made with `max_tokens=50` returns `usage.prompt_tokens == 118` and `usage.completion_tokens == 50`. What is `usage.total_tokens`? Which `finish_reason` should you expect, and what does it mean for `message.content`?

**Q3. History cost.** Each call resends the *whole* history. Assume (ignoring per-message overhead) the system prompt is 20 tokens, every user message is 10 tokens, and every assistant reply is 30 tokens. For a 3-turn conversation (3 calls), fill in the table and give the totals.

| Call | Messages sent | `prompt_tokens` | `completion_tokens` |
|---|---|---|---|
| 1 | system, user | ? | 30 |
| 2 | ? | ? | 30 |
| 3 | ? | ? | 30 |

**Q4. Forgetting to check `success`.** Using the chapter's production `chat()` function with an invalid API key, what happens on the second line?

```python
result = chat([{"role": "user", "content": "What is the temperature of T-01?"}])
print(result["usage"]["total"])
```

### Coding Exercises

**E1 (Easy).** Write `build_messages(system: str, history: list[tuple[str, str]], new_user: str) -> list[dict]`. `history` holds `(user_text, assistant_text)` pairs. Return a correctly ordered messages list ending with the new user message.

- `build_messages("Be concise.", [("T-01?", "72.5°C")], "T-02?")` → `[{system}, {user: "T-01?"}, {assistant: "72.5°C"}, {user: "T-02?"}]` (4 messages)

**E2 (Easy–Medium).** Write `parse_response(response) -> dict` that turns a completion object into `{"content": str, "finish_reason": str, "truncated": bool, "usage": {"prompt", "completion", "total"}}`. `content` must be `""` (not `None`) when the model returned no text, which happens on tool calls. `truncated` is `True` exactly when `finish_reason == "length"`. Test it offline with `types.SimpleNamespace` fakes.

- Fake with content `"1. Thermocouple 2. Pressure"`, `finish_reason="length"`, usage 118/50 → `truncated=True`, `usage={'prompt': 118, 'completion': 50, 'total': 168}`
- Fake with content `None`, `finish_reason="tool_calls"`, usage 90/12 → `content=''`, `truncated=False`, total `102`

**E3 (Medium).** Write `ChatSession(system: str, complete_fn)`, where `complete_fn(messages) -> response` is injected so it can be faked. `ask(text) -> str` should:
- append the user message, call `complete_fn`, append the assistant reply, and add `usage.total_tokens` to `self.total_tokens`;
- if `complete_fn` raises, **remove** the user message it just appended and re-raise, so a failed call does not leave a dangling unanswered `user` turn.

- With a fake that returns `prompt_tokens = 10 * len(messages)` and `completion_tokens = 5`: `ask("What is T-01?")`, then a failing `ask("boom")`, then `ask("What about T-02?")` → 5 messages with roles `system, user, assistant, user, assistant`, and `total_tokens == 70`

#### Dry-Run: Answers

**Q1.** `6 ['s', 'u', 'a', 'u', 'a', 'u']`

| Step | Appended | `len` |
|---|---|---|
| init | system | 1 |
| loop 1 | user, assistant | 3 |
| loop 2 | user, assistant | 5 |
| after loop | user | 6 |

The list always ends on a `user` message: that is the turn the model is being asked to answer.

**Q2.** `total_tokens = 118 + 50 = 168`. Because `completion_tokens` equals `max_tokens`, the model hit the cap, so expect `finish_reason == "length"`. `message.content` is **cut off mid-answer**. Either raise `max_tokens` or handle the partial text. Never parse it as complete JSON. (For completeness: when the model wants to call a tool, the OpenAI API reports `finish_reason == "tool_calls"`.)

**Q3.**

| Call | Messages sent | `prompt_tokens` | `completion_tokens` |
|---|---|---|---|
| 1 | system, user | $20 + 10 = 30$ | 30 |
| 2 | system, user, assistant, user | $30 + 30 + 10 = 70$ | 30 |
| 3 | system, u, a, u, a, user | $70 + 30 + 10 = 110$ | 30 |

Totals: prompt $= 30 + 70 + 110 = 210$, completion $= 90$, overall $300$. Each call's prompt grows by $40$, so the cumulative prompt cost after $n$ turns is $\sum_{k=1}^{n} (30 + 40(k-1)) = 30n + 20n(n-1)$. That is **quadratic** in the number of turns. For $n=3$: $90 + 120 = 210$. This is why the next chapter manages the context window.

**Q4.** `chat()` catches the `AuthenticationError` and returns `{"success": False, "error": "..."}`, which has **no `"usage"` key**. The second line therefore raises `KeyError: 'usage'`. The chapter's usage code avoids this by checking `if result["success"]:` first.

**E1 — reference solution**

```python
def build_messages(system: str, history: list[tuple[str, str]], new_user: str) -> list[dict]:
    msgs = [{"role": "system", "content": system}]          # system always first
    for user_text, assistant_text in history:
        msgs.append({"role": "user", "content": user_text})
        msgs.append({"role": "assistant", "content": assistant_text})
    msgs.append({"role": "user", "content": new_user})      # the turn to answer
    return msgs
```

$O(h)$ for $h$ history pairs. Result length is $2h + 2$.

**E2 — reference solution**

```python
from types import SimpleNamespace as NS
from typing import Any

def parse_response(response: Any) -> dict:
    choice = response.choices[0]
    usage = response.usage
    return {
        "content": choice.message.content or "",            # None -> "" (tool calls)
        "finish_reason": choice.finish_reason,
        "truncated": choice.finish_reason == "length",
        "usage": {
            "prompt": usage.prompt_tokens,
            "completion": usage.completion_tokens,
            "total": usage.total_tokens,
        },
    }

def fake(content, reason, p, c):
    return NS(choices=[NS(message=NS(role="assistant", content=content), finish_reason=reason)],
              usage=NS(prompt_tokens=p, completion_tokens=c, total_tokens=p + c))

print(parse_response(fake(None, "tool_calls", 90, 12)))
# {'content': '', 'finish_reason': 'tool_calls', 'truncated': False,
#  'usage': {'prompt': 90, 'completion': 12, 'total': 102}}
```

$O(1)$. Faking the response with `SimpleNamespace` mirrors the attribute access (`.choices[0].message.content`), so the parser can be unit-tested with no network calls and no API key.

**E3 — reference solution**

```python
from typing import Any, Callable

class ChatSession:
    def __init__(self, system: str, complete_fn: Callable[[list[dict]], Any]):
        self.messages: list[dict] = [{"role": "system", "content": system}]
        self.complete_fn = complete_fn
        self.total_tokens = 0

    def ask(self, text: str) -> str:
        self.messages.append({"role": "user", "content": text})
        try:
            response = self.complete_fn(list(self.messages))   # pass a copy
        except Exception:
            self.messages.pop()            # roll back the unanswered user turn
            raise
        reply = response.choices[0].message.content or ""
        self.messages.append({"role": "assistant", "content": reply})
        self.total_tokens += response.usage.total_tokens
        return reply
```

Token trace with the fake: call 1 sends 2 messages, costing $20 + 5 = 25$. The `"boom"` call raises, and the user message is popped (back to 3 messages). Call 3 sends 4 messages (system, user, assistant, user), costing $40 + 5 = 45$. Total $25 + 45 = 70$, with 5 messages stored. Without the rollback, the history would contain two consecutive `user` messages, one of them never answered.

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

