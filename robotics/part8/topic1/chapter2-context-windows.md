# Part 8, Topic 1: LLM APIs & Message History
## Chapter 2: Context Windows

**Prerequisite Knowledge:** Basic understanding of strings and the Chat Completions API.

### The 'Goldfish Memory' Analogy
Imagine trying to hold a conversation with someone who has the memory of a goldfish. They can only remember the last 500 words spoken in the room. If you tell them your name at the beginning of a long story, by the time you reach the end of the story, they will have forgotten your name because it fell out of their "memory window."

An LLM is exactly like this. It does not have a permanent brain. Its "memory" is simply the list of messages you send it in your API request. This memory size is called the "Context Window," and it has a hard mathematical limit. If you send too much text, the AI literally cannot read the beginning of the conversation.

Every LLM has a finite context window — a maximum number of tokens it can process in a single request. Exceeding it truncates your conversation, and long contexts cost more and slow down responses. Managing the context window is a core skill for building reliable agentic systems.

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOLDFISH MEMORY ANALOGY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Context Window = Goldfish's Short-Term Memory                 │
│                                                                 │
│   [system prompt] [msg1] [msg2] [msg3] ... [msgN]              │
│   ◄──────────────── Context Window (128K tokens) ─────────────► │
│                                                                 │
│   When you ADD a new message:                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  [system] [msg1] [msg2] ... [msgN-1] [msgN] [NEW MSG]  │   │
│   │  ◄──────── Exceeds window! Oldest messages DROPPED ────►│   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   The AI can only "see" what fits in the window!                │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Token Counting

Tokens are not words. A token is roughly 4 characters in English, but complex words and code can tokenize differently. Use `tiktoken` to count accurately.

```python
import tiktoken

# Load the exact dictionary the gpt-4o model uses
encoding = tiktoken.encoding_for_model("gpt-4o")

text = "The industrial oven reached a temperature of 450°C during the bake cycle."

# Convert the text into a list of token IDs (numbers)
tokens = encoding.encode(text)

print(f"Text: {text}")
print(f"Token count: {len(tokens)}")
print(f"Tokens: {tokens}")
```

Output:
```
Text: The industrial oven reached a temperature of 450°C during the bake cycle.
Token count: 15
Tokens: [976, 14144, 24722, 15237, 261, 12088, 328, 220, 14869, 26557, 3354, 290, 52853, 15839, 13]
```

**What's happening:**
```python
import tiktoken
#         ^^^^^^^^
#         OpenAI's tokenizer library
#         Encodes text into tokens (numbers the AI processes)

encoding = tiktoken.encoding_for_model("gpt-4o")
#                              ^^^^^^^^^ ^^^^^^
#                              |         └── Model name
#                              └── Get the tokenizer for this model
# Different models use different tokenizers!

tokens = encoding.encode(text)
#        ^^^^^^^^^^^^^^^^^^
#        Convert string → list of integers
#        Each integer is a token ID

len(tokens)  # 15 tokens for 73 characters
# Token efficiency: ~4 characters per token (English)
```

### Token vs Character Comparison

| Input | Characters | Tokens | Ratio |
|-------|------------|--------|-------|
| "Hello" | 5 | 1 | 5:1 |
| "temperature" | 11 | 1 | 11:1 |
| "sensor_id" | 9 | 2 | 4.5:1 |
| "450°C" | 5 | 2 | 2.5:1 |
| Python code | varies | varies | ~3-5:1 |

### Common Mistake: Counting Words Instead of Tokens

```python
# WRONG - Counting words
text = "The industrial oven reached a temperature of 450°C"
word_count = len(text.split())
print(f"Words: {word_count}")  # 8 words

# RIGHT - Counting tokens
token_count = len(encoding.encode(text))
print(f"Tokens: {token_count}")  # 10 tokens

# Why it matters:
# - API billing is based on TOKENS, not words
# - Context window limits are in TOKENS
# - 8 words ≠ 8 tokens (usually more tokens)
```

### 2. What Happens When You Exceed the Context

When your messages exceed the model's context window, the API returns an error (OpenAI Chat Completions: HTTP 400 `context_length_exceeded`). Some other APIs, or SDK/framework options, truncate older messages instead.

```python
import tiktoken

encoding = tiktoken.encoding_for_model("gpt-4o")
model_limit = 128000 # Example limit

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
]

# Track how much space we are using
total_tokens = len(encoding.encode(messages[0]["content"]))

# Simulate a very long conversation
for i in range(50):
    long_message = f"Message {i}: " + "padding " * 200
    msg_tokens = len(encoding.encode(long_message))
    total_tokens += msg_tokens

    # Stop before we crash the API
    if total_tokens > model_limit * 0.9:
        print(f"Warning at message {i}: {total_tokens} tokens ({total_tokens/model_limit*100:.1f}% of limit)")
        break

    messages.append({"role": "user", "content": long_message})

print(f"Final message count: {len(messages)}")
print(f"Estimated tokens: {total_tokens}")
```

Output:
```
Final message count: 51
Estimated tokens: 10256
```

**What's happening:**
```python
model_limit = 128000
#              ^^^^^^
#              GPT-4o's context window: 128,000 tokens
#              GPT-4-turbo: 128,000 tokens
#              GPT-3.5-turbo: 16,385 tokens

# We build messages until we hit 90% of the limit
if total_tokens > model_limit * 0.9:
    #     ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #     90% safety margin
    #     Never use 100% - leave room for the AI's response!

# What happens if you exceed the limit:
# Option 1: Some APIs/SDK options truncate oldest messages (silently!)
# Option 2: API returns an error (OpenAI Chat Completions does this)
# Either way, you lose context or crash
```

### Context Window Sizes by Model

| Model | Context Window | ~Words | ~Pages of Text |
|-------|----------------|--------|----------------|
| GPT-3.5-turbo | 16,385 tokens | ~12,000 words | ~25 pages |
| GPT-4-turbo | 128,000 tokens | ~96,000 words | ~200 pages |
| GPT-4o | 128,000 tokens | ~96,000 words | ~200 pages |
| GPT-4o-mini | 128,000 tokens | ~96,000 words | ~200 pages |

### Error Scenario: Context Too Long

```python
# Scenario: You have a 200-page document and ask the AI to summarize it
# The document alone exceeds the context window!

document = "This is page 1 of the document... " * 20000  # Very long text (~180,000 tokens > 128k)

messages = [
    {"role": "system", "content": "Summarize this document."},
    {"role": "user", "content": document},
]

# This will FAIL (or TRUNCATE, on APIs that truncate)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
)
# Possible errors:
# - openai.BadRequestError (400, context_length_exceeded): maximum context length is 128000 tokens
# - Silent truncation of oldest messages (other APIs / SDK options)
# - Incomplete summary (AI only sees part of document)

# FIX: Use chunking or summarization strategies
```

### 3. Sliding Window Strategy

Keep only the most recent N messages. Older context is dropped.

```python
def sliding_window(messages: list[dict], max_messages: int = 10) -> list[dict]:
    # 1. Always keep the system instructions safe
    system_msgs = [m for m in messages if m["role"] == "system"]
    
    # 2. Grab everything else
    other_msgs = [m for m in messages if m["role"] != "system"]
    
    # 3. Slice the list to keep only the newest messages
    recent_msgs = other_msgs[-max_messages:]
    
    # 4. Glue them back together
    return system_msgs + recent_msgs

# Create fake history
messages = [
    {"role": "system", "content": "You are a sensor assistant."},
]
for i in range(20):
    role = "user" if i % 2 == 0 else "assistant"
    messages.append({"role": role, "content": f"Message {i}"})

print(f"Before: {len(messages)} messages")

# Apply our sliding window
trimmed = sliding_window(messages, max_messages=6)

print(f"After: {len(trimmed)} messages")
for msg in trimmed:
    print(f"  [{msg['role']}] {msg['content']}")
```

Output:
```
Before: 21 messages
After: 7 messages
  [system] You are a sensor assistant.
  [user] Message 14
  [assistant] Message 15
  [user] Message 16
  [assistant] Message 17
  [user] Message 18
  [assistant] Message 19
```

**What's happening:**
```python
def sliding_window(messages: list[dict], max_messages: int = 10) -> list[dict]:
    #                         ^^^^^^^^                  ^^^
    #                         |                         └── Default: keep 10 messages
    #                         └── Input: full conversation history
    
    system_msgs = [m for m in messages if m["role"] == "system"]
    #     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #     List comprehension: filter messages where role is "system"
    #     System prompts are ALWAYS kept (they set AI behavior)
    
    other_msgs = [m for m in messages if m["role"] != "system"]
    #     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #     Everything that's NOT a system message
    
    recent_msgs = other_msgs[-max_messages:]
    #              ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #              Python negative slicing: last N elements
    #              [-10:] = last 10 messages
    
    return system_msgs + recent_msgs
    #       ^^^^^^^^^^^   ^^^^^^^^^^^
    #       |             └── Recent conversation
    #       └── System prompt always first
```

### Sliding Window Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW STRATEGY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   BEFORE (21 messages):                                        │
│   [system] [u1] [a1] [u2] [a2] ... [u10] [a10]               │
│                                                                 │
│   Apply sliding_window(max_messages=6):                        │
│                                                                 │
│   1. Extract system: [system]                                   │
│   2. Extract others: [u1] [a1] [u2] ... [u10] [a10]           │
│   3. Take last 6: [u8] [a8] [u9] [a9] [u10] [a10]             │
│   4. Combine: [system] + [u8] [a8] ... [u10] [a10]            │
│                                                                 │
│   AFTER (7 messages):                                          │
│   [system] [u8] [a8] [u9] [a9] [u10] [a10]                   │
│                                                                 │
│   ✗ Dropped: u1-a7 (old context lost!)                        │
│   ✓ Kept: System prompt + most recent exchange                 │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Case: What If System Prompt Is Too Long?

```python
# PROBLEM: System prompt itself exceeds context window!
system_prompt = "You are a sensor assistant. " * 10000  # Very long

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": "What is T-01?"},
]

# Even with just 2 messages, we might exceed the limit!

# FIX 1: Shorten the system prompt
system_prompt = "You are a sensor assistant."  # Concise

# FIX 2: Use a model with larger context window
# FIX 3: Summarize the system prompt into key rules
```

### Common Mistake: Dropping Important Context

```python
# PROBLEM: Sliding window drops critical early messages

messages = [
    {"role": "system", "content": "You are a sensor assistant. Never expose API keys."},
    {"role": "user", "content": "My API key is sk-1234567890"},
    {"role": "assistant", "content": "I will not store or repeat your API key."},
    # ... 50 more messages ...
    {"role": "user", "content": "What was my API key?"},
]

# Sliding window might drop the API key message!
# The AI might then repeat the key (security risk!)

# FIX: Use summarization instead of sliding window
# Or: Keep specific "anchor" messages (security rules, etc.)
```

### 4. Summarization Strategy

Replace old messages with a summary to preserve key information in fewer tokens.

```python
def summarize_old_messages(messages: list[dict], keep_recent: int = 4) -> list[dict]:
    system_msgs = [m for m in messages if m["role"] == "system"]
    other_msgs = [m for m in messages if m["role"] != "system"]

    if len(other_msgs) <= keep_recent:
        return messages

    # Split into old (to be summarized) and new (to be kept)
    old_messages = other_msgs[:-keep_recent]
    recent_messages = other_msgs[-keep_recent:]

    # Build a simple text summary of the old stuff
    summary_content = "Previous conversation summary: "
    for msg in old_messages:
        if msg["role"] == "user":
            summary_content += f"User asked about {msg['content'][:50]}. "
        elif msg["role"] == "assistant":
            summary_content += f"Assistant responded with info. "

    # Package the summary as a new system/user message
    summary_msg = {"role": "user", "content": summary_content}
    
    return system_msgs + [summary_msg] + recent_messages

messages = [
    {"role": "system", "content": "You are a sensor assistant."},
    {"role": "user", "content": "What is the temperature of sensor T-01?"},
    {"role": "assistant", "content": "Sensor T-01 reads 72.5°C."},
    {"role": "user", "content": "How does that compare to T-02?"},
    {"role": "assistant", "content": "T-02 reads 68.3°C, slightly lower."},
    {"role": "user", "content": "What about humidity levels?"},
    {"role": "assistant", "content": "Humidity at T-01 is 55%, T-02 is 62%."},
]

summarized = summarize_old_messages(messages, keep_recent=2)

print(f"Before: {len(messages)} messages")
print(f"After: {len(summarized)} messages")
for msg in summarized:
    print(f"  [{msg['role']}] {msg['content'][:80]}")
```

Output:
```
Before: 7 messages
After: 4 messages
  [system] You are a sensor assistant.
  [user] Previous conversation summary: User asked about What is the temperature of senso
  [user] What about humidity levels?
  [assistant] Humidity at T-01 is 55%, T-02 is 62%.
```

**What's happening:**
```python
def summarize_old_messages(messages: list[dict], keep_recent: int = 4) -> list[dict]:
    #                                ^^^              ^^^^^^^^^^^
    #                                |                └── Keep last 4 non-system messages
    #                                └── Full conversation history
    
    old_messages = other_msgs[:-keep_recent]
    #              ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #              Everything EXCEPT the last 4 messages
    #              These will be compressed into a summary
    
    recent_messages = other_msgs[-keep_recent:]
    #                 ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                 The last 4 messages (kept verbatim)
    
    summary_content = "Previous conversation summary: "
    #                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                 Build a text summary (simple version)
    #                 Production: use AI to generate summary
    
    summary_msg = {"role": "user", "content": summary_content}
    #             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #             Package summary as a regular message
    #             The AI reads it like any other message
```

### Summarization vs Sliding Window

| Strategy | Keeps Context? | Token Savings | Complexity | Best For |
|----------|----------------|---------------|------------|----------|
| Sliding Window | Only recent messages | High | Low | Simple conversations |
| Summarization | Key info from old messages | Medium | Medium | Long conversations |
| Hybrid | Both recent + summary | Medium | High | Production systems |

### Production Example: Smart Context Manager

```python
class ContextManager:
    def __init__(self, max_tokens: int = 100000, keep_recent: int = 6):
        self.max_tokens = max_tokens
        self.keep_recent = keep_recent
        self.encoding = tiktoken.encoding_for_model("gpt-4o")
    
    def count_tokens(self, messages: list[dict]) -> int:
        total = 0
        for msg in messages:
            total += len(self.encoding.encode(msg.get("content", "")))
        return total
    
    def manage(self, messages: list[dict]) -> list[dict]:
        system_msgs = [m for m in messages if m["role"] == "system"]
        other_msgs = [m for m in messages if m["role"] != "system"]
        
        # Check if we need to compress
        current_tokens = self.count_tokens(messages)
        
        if current_tokens <= self.max_tokens:
            return messages  # No compression needed
        
        # Strategy 1: Sliding window
        trimmed = other_msgs[-self.keep_recent:]
        
        # Strategy 2: Add summary of dropped messages
        dropped = other_msgs[:-self.keep_recent]
        if dropped:
            summary = self._create_summary(dropped)
            return system_msgs + [summary] + trimmed
        
        return system_msgs + trimmed
    
    def _create_summary(self, messages: list[dict]) -> dict:
        # Simple summary - production would use AI
        topics = []
        for msg in messages:
            if msg["role"] == "user":
                topics.append(msg["content"][:30])
        
        return {
            "role": "user",
            "content": f"Previous discussion covered: {', '.join(topics[:5])}"
        }

# Usage
manager = ContextManager(max_tokens=50000, keep_recent=8)
managed_messages = manager.manage(long_conversation)
```

### 5. Cost Awareness

Longer contexts cost more. Estimate cost before sending.

```python
import tiktoken

encoding = tiktoken.encoding_for_model("gpt-4o")
input_cost_per_1k = 0.0025
output_cost_per_1k = 0.01

messages = [
    {"role": "system", "content": "You are a monitoring assistant."},
    {"role": "user", "content": "Analyze this sensor data: " + "temperature=72.5, humidity=55, pressure=14.7; " * 100},
]

input_tokens = sum(len(encoding.encode(m["content"])) for m in messages)
estimated_output = 200

input_cost = (input_tokens / 1000) * input_cost_per_1k
output_cost = (estimated_output / 1000) * output_cost_per_1k
total_cost = input_cost + output_cost

print(f"Input tokens: {input_tokens}")
print(f"Estimated cost: ${total_cost:.4f}")
print(f"Input: ${input_cost:.4f}, Output: ${output_cost:.4f}")
```

Output:
```
Input tokens: 1612
Estimated cost: $0.0060
Input: $0.0040, Output: $0.0020
```

**What's happening:**
```python
input_cost_per_1k = 0.0025
#                   ^^^^^^
#                   GPT-4o input cost: $2.50 per 1M tokens
#                   = $0.0025 per 1K tokens

output_cost_per_1k = 0.01
#                    ^^^^
#                    GPT-4o output cost: $10.00 per 1M tokens
#                    = $0.01 per 1K tokens

# Cost formula:
# cost = (tokens / 1000) * cost_per_1k

# Real-world example:
# A 100K token conversation costs:
# Input:  100,000 / 1000 * 0.0025 = $0.25
# Output: 1,000 / 1000 * 0.01    = $0.01
# Total:  ~$0.26 per API call!

# That's why context management matters!
```

### Cost Comparison Table

| Context Size | Input Tokens | Input Cost | Output Cost | Total Cost |
|--------------|--------------|------------|-------------|------------|
| Short chat | 500 | $0.0013 | $0.01 | $0.011 |
| Medium chat | 5,000 | $0.013 | $0.01 | $0.023 |
| Long chat | 50,000 | $0.125 | $0.01 | $0.135 |
| Very long | 100,000 | $0.25 | $0.01 | $0.26 |

### Production Example: Cost-Aware API Call

```python
def cost_aware_chat(messages: list[dict], max_cost: float = 0.10) -> dict:
    """Send messages only if estimated cost is within budget."""
    encoding = tiktoken.encoding_for_model("gpt-4o")
    
    # Count tokens
    input_tokens = sum(len(encoding.encode(m.get("content", ""))) for m in messages)
    estimated_output = 500  # Assume 500 token response
    
    # Calculate cost
    input_cost = (input_tokens / 1000) * 0.0025
    output_cost = (estimated_output / 1000) * 0.01
    total_cost = input_cost + output_cost
    
    # Check budget
    if total_cost > max_cost:
        return {
            "success": False,
            "error": f"Cost ${total_cost:.4f} exceeds budget ${max_cost:.2f}",
            "input_tokens": input_tokens,
        }
    
    # Proceed with API call
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.0,
    )
    
    return {
        "success": True,
        "content": response.choices[0].message.content,
        "actual_cost": total_cost,
    }
```

### Summary

Context windows are finite and expensive. Count tokens with `tiktoken` before sending. Use sliding windows to drop old messages or summarization to compress them. Always preserve the system prompt. Be aware of token costs — longer contexts mean higher latency and higher bills.

### Quick Reference

| Concept | Syntax/Value | Description |
|---------|--------------|-------------|
| Token count | `len(encoding.encode(text))` | Count tokens in text |
| Context window | 128,000 (GPT-4o) | Max tokens per request |
| Sliding window | `messages[-N:]` | Keep last N messages |
| System prompt | Always preserve | Don't drop system messages |
| Cost formula | `(tokens/1000) * rate` | Calculate API cost |
| Safety margin | 90% of limit | Leave room for response |
| Input cost | $0.0025/1K tokens | GPT-4o input rate |
| Output cost | $0.01/1K tokens | GPT-4o output rate |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Context Windows**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 context windows**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

