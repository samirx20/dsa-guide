# Agentic AI Systems — Complete Conceptual Overview

> Interview-ready reference covering every concept, what it means, why it matters, and how it's implemented in practice.

---

## Part 0 — Python Foundations

### What is Type Hinting?

Type hinting is the practice of explicitly declaring what type of data a variable holds, what a function expects as input, and what it returns. Python is dynamically typed — it figures out types at runtime — which means bugs from wrong data types only surface when the code actually runs. Type hints fix this by making intentions explicit. Tools like VS Code and mypy read these hints and flag errors before you ever run the code.

**Why it matters for agentic systems:** When data flows between an LLM, a database, a validation layer, and a control system, a single wrong type (e.g., a string where a float is expected) can silently corrupt your pipeline. Type hints are the first line of defense.

**How it's implemented:** You annotate function parameters with `: type` and return values with `-> type`. For collections, you specify what the list or dict contains (e.g., `list[str]` means a list where every item is a string). Modern Python (3.9+) lets you use built-in types directly instead of importing from `typing`.

---

### What are APIs and JSON?

APIs (Application Programming Interfaces) are standardized rules that let two programs talk to each other over a network. Think of it as a restaurant: you (the client) don't go into the kitchen — you tell the waiter (the API) what you want, the waiter takes it to the kitchen (the server), and brings back your food (the response). JSON (JavaScript Object Notation) is the universal language they use to exchange data — it looks almost exactly like a Python dictionary.

**Why it matters for agentic systems:** Every AI agent communicates with the outside world through APIs — fetching sensor data, calling an LLM, querying a database. JSON is the format that flows through all of these connections.

**How it's implemented:** Python has a built-in `json` library. `json.loads()` converts a JSON string into a Python dictionary (deserialization). `json.dumps()` converts a dictionary back into a JSON string (serialization). When you make an HTTP request, the response body comes back as a JSON string that you parse into a dictionary to work with.

---

### What are Classes and Objects?

A class is a blueprint. An object is the actual thing built from that blueprint. If the blueprint says "a house has doors, windows, and a roof," then every house built from it will have those parts. In Python, classes group data and behavior together. The constructor (`__init__`) runs automatically when you create an object, setting up its initial state.

**Why it matters over dictionaries:** Dictionaries don't enforce structure. You can misspell a key and Python won't complain until your code crashes later. Classes guarantee that every object has exactly the fields it's supposed to have, and Python throws an error immediately if something is missing. This is the foundation for Pydantic, which we'll see later.

**How it's implemented:** You define a class with `class ClassName:` and an `__init__` method that takes `self` plus any parameters. Each parameter gets stored as `self.field_name`. Objects are created by calling the class like a function: `obj = ClassName(param1, param2)`. You access fields with dot notation: `obj.field_name`.

---

### What are Virtual Environments?

A virtual environment is an isolated Python workspace for a single project. Without one, installing a library for Project A might break Project B because they need different versions of the same library. A virtual environment gives each project its own folder with its own set of installed packages.

**Why it matters:** In production agentic systems, you'll use dozens of libraries (FastAPI, Pydantic, OpenAI, httpx, etc.). If different projects need different versions, global installation causes chaos.

**How it's implemented:** The built-in way is `python -m venv .venv`, which creates a `.venv` folder. You activate it (on Windows: `.venv\Scripts\Activate.ps1`), then install packages normally — they go into the virtual environment, not the global Python. The modern, faster alternative is `uv`, which handles environment creation and package installation in one step. Projects should use `pyproject.toml` (not `requirements.txt`) to declare dependencies in a structured way.

---

### What is Advanced Type Hinting?

Advanced type hinting goes beyond basic `int` and `str` annotations. It includes five key patterns:

- **Generics (TypeVar/Generic):** Write a class or function that works with any type while still enforcing type safety. You declare a placeholder type (like `T`), and when you use it, you specify what `T` actually is (e.g., `Stack[int]` means a stack that only holds integers).

- **Union and Optional:** A Union says a value can be one of several types (e.g., `str | float` means it could be either). Optional is shorthand for "this value might be None."

- **Callable:** Describes function-like objects — lambdas, regular functions, or classes with `__call__`. This is critical for agentic patterns where you pass functions as arguments to other functions.

- **TypedDict:** Gives a plain dictionary a structure that type checkers understand. When an LLM returns raw JSON as a dictionary, TypedDict defines what keys and types that dictionary should have.

- **Protocol:** Defines what methods an object must have without requiring inheritance. Any class that has the right methods automatically satisfies the Protocol — this is called structural typing.

**Why it matters:** These patterns let you write flexible yet safe code. Your agent pipeline passes data through many stages, and advanced type hints catch mismatches at development time rather than production time.

---

### What is Error Handling?

Error handling is the practice of catching problems in your code and recovering gracefully instead of crashing. In an agentic pipeline, many things can go wrong: the LLM hallucinates a function name, a sensor API times out, a validation rule rejects an output. Without proper error handling, any one of these crashes the entire system.

**Key patterns:**

- **Custom Exception Hierarchies:** Instead of catching generic `Exception`, you define a hierarchy that matches your domain. A base `AgentError` with specific children like `LLMTimeoutError`, `SensorReadingError`, and `ToolExecutionError`. This lets callers handle specific failure modes.

- **try/except/else/finally:** The `try` block contains the risky code. `except` catches specific errors. `else` runs only if `try` succeeded. `finally` always runs (for cleanup).

- **Context Managers:** Guarantee cleanup code runs even if an exception occurs. The `with` statement sets up a resource before the block and tears it down after — even if the block crashes.

- **Result Pattern:** Wraps success and failure in a single return value instead of using exceptions. You return either `Ok(value)` or `Err(error)`, and the caller must handle both cases explicitly — no exceptions silently swallowed.

- **Structured Logging:** Never use `print()` in production. Use the `logging` module with structured context (timestamps, component names, error details) so you can filter and aggregate logs.

**How it's implemented:** You create exception classes inheriting from a base class. Use `raise` to throw exceptions and `try/except` to catch them. Context managers use the `@contextmanager` decorator and `yield` to hand control to the code block.

---

## Part 1 — Async Python and FastAPI

### What is the Event Loop?

The event loop is a scheduler that lets Python handle thousands of I/O operations (network calls, file reads, database queries) concurrently on a single thread. Imagine a restaurant with one waiter: instead of standing at the kitchen waiting for one table's food, the waiter takes orders from many tables, hands them all to the kitchen, and serves each table as its food arrives. The waiter never stands idle.

**Why it matters for agentic systems:** Your agent makes dozens of concurrent API calls — LLM providers, vector databases, tool endpoints, user-facing APIs. If each call blocked while waiting for a response, your system would be a sequential bottleneck. The event loop lets everything run simultaneously.

**How it's implemented:** You define async functions with `async def`. Inside them, `await` pauses the function and lets the event loop run other tasks until the I/O completes. `asyncio.run()` starts the event loop and runs your coroutine. Never call blocking functions (like `time.sleep` or `requests.get`) inside async code — they freeze the entire loop. Use `asyncio.sleep` and `httpx` instead.

---

### What is Concurrent Execution?

Concurrent execution means running multiple tasks at the same time without waiting for each one to finish before starting the next. In async Python, this is about launching multiple I/O operations and collecting their results together.

**Key tools:**

- **asyncio.gather():** Takes multiple coroutines and runs them all simultaneously. Returns results in the same order you passed them in. If three API calls each take 1 second, gather runs all three in ~1 second total instead of 3 seconds.

- **asyncio.create_task():** Schedules a coroutine to run in the background. You can do other work while it runs, then await it later. Useful for fire-and-forget operations like logging.

- **asyncio.TaskGroup (Python 3.11+):** The modern alternative to gather. Uses a context manager and automatically cancels all tasks if any one of them fails — safer error handling.

- **return_exceptions=True:** When passed to gather, exceptions are returned as values instead of crashing. This lets one failing sensor API not take down the others.

**How it's implemented:** Pass coroutines to `asyncio.gather()` or create them as tasks with `asyncio.create_task()`. Always ensure you await background tasks before your function returns to avoid dangling tasks.

---

### What is Async HTTP?

Async HTTP means making network requests without blocking the event loop. The traditional `requests` library is blocking — it stops the entire thread until the response arrives. `httpx.AsyncClient` is the async-native replacement that fits into the event loop.

**Why it matters:** Your agent talks to multiple external services simultaneously. Blocking HTTP turns concurrent code into sequential code.

**Key practices:**

- **Session reuse:** Create one `AsyncClient` and reuse it for all requests. This reuses TCP connections (connection pooling), which is much faster than creating a new connection for each request.

- **Timeouts:** Set specific timeouts for connect, read, write, and pool operations. Without timeouts, a hung server freezes your entire agent.

- **Exponential backoff retries:** When a request fails, wait 1 second, then 2, then 4 before retrying. This avoids hammering a struggling server. Only retry on server errors (500+), not client errors (400s).

**How it's implemented:** Use `async with httpx.AsyncClient(timeout=10.0) as client:` to create a reusable client. Call `await client.get(url)` or `await client.post(url, json=data)`. Wrap requests in retry loops with `asyncio.sleep(2 ** attempt)` for backoff.

---

### What is FastAPI?

FastAPI is a modern Python web framework for building APIs. It sits between the outside world and your Python functions. When a client sends an HTTP request, FastAPI validates the input, runs your function, and returns the response. It provides automatic request validation, auto-generated interactive documentation (Swagger UI at `/docs`), and native async support.

**Key concepts:**

- **Path parameters:** Variables in the URL (e.g., `/sensors/{sensor_id}`) that FastAPI extracts and validates against type hints.

- **Query parameters:** Parameters not in the URL path become query parameters (e.g., `/readings?sensor_id=T-01&limit=5`).

- **Request bodies:** For POST/PUT requests, you define a Pydantic model. FastAPI validates the incoming JSON against that model automatically.

- **Response models:** `response_model` controls what gets returned to the client. Internal fields are automatically stripped out — even if your function returns them.

- **Status codes:** Use `status_code` in decorators and `HTTPException` for error responses.

**How it's implemented:** Create an app with `app = FastAPI()`. Define endpoints with `@app.get("/path")` or `@app.post("/path")`. Run with `uvicorn.run(app, port=8000)`.

---

### What is Dependency Injection?

Dependency injection is a pattern where your endpoint function declares what it needs (like a database connection or config), and the framework provides it automatically. Instead of creating a database connection inside each endpoint, you write a provider function and inject it via `Depends()`.

**Why it matters:** It decouples your endpoint logic from external resources. Testing becomes trivial — you just swap the real dependency for a mock. It also ensures resources are cleaned up properly after each request.

**Key patterns:**

- **Yield dependencies:** A provider function that `yield`s a resource. Everything before `yield` is setup (open connection); everything after is teardown (close connection). FastAPI runs the teardown even if the endpoint crashes.

- **Dependency overrides:** For testing, you replace real dependencies with mocks using `app.dependency_overrides[real_func] = mock_func`. No monkey-patching needed.

- **Chained dependencies:** A dependency can itself depend on other dependencies. FastAPI resolves the entire chain automatically. This creates clean layered architecture (e.g., tenant isolation: get tenant from header → get database for that tenant).

**How it's implemented:** Write a function that returns the resource (or yields it for cleanup). Add `resource: ResourceType = Depends(provider_function)` as a parameter to your endpoint. FastAPI calls the provider and passes the result to your function.

---

## Part 2 — Pydantic Guardrails and Rule Engines

### What are Pydantic BaseModels?

Pydantic BaseModels are typed data schemas that validate and transform incoming data. You define a class with fields and their types, and Pydantic checks every piece of data against that schema the moment it arrives. If the data doesn't match, Pydantic throws a clear error instead of letting bad data crash your pipeline later.

**Why it matters for agentic systems:** LLMs produce JSON that looks plausible but may have wrong types, missing fields, or impossible values. Pydantic gives you a hard boundary between raw LLM output and clean application logic.

**Key operations:**

- **model_validate():** Takes a Python dictionary and validates it against the schema, coercing types (e.g., string "72.5" becomes float 72.5).

- **model_validate_json():** Takes a raw JSON string directly, skipping the `json.loads()` step.

- **Nested models:** A field can be another Pydantic model. Validation happens recursively — if a nested field is wrong, Pydantic points to the exact path.

- **model_dump():** Converts a validated model back into a plain dictionary. `model_dump_json()` returns a JSON string.

**How it's implemented:** Inherit from `pydantic.BaseModel`. Declare fields with types. Instantiate with keyword arguments. Pydantic validates automatically on creation.

---

### What are Field Constraints?

Field constraints are rules that narrow down what values a field accepts. Type checking alone isn't enough — a temperature of 9999.0 is a valid float, but it's physically impossible for most sensors. Field constraints encode domain knowledge directly into your model.

**Types of constraints:**

- **Numeric bounds:** `ge` (greater than or equal), `le` (less than or equal), `gt` (strictly greater), `lt` (strictly less). These enforce physical limits like temperature ranges.

- **String patterns:** `min_length`, `max_length`, and `pattern` (regex). The pattern parameter lets you enforce formats like sensor IDs that must match `^[A-Z]+-\d+$`.

- **Literal types:** When a field should only accept specific values (e.g., `action: Literal["start", "stop", "restart"]`), Literal creates a closed set of allowed values — stricter than a string constraint.

- **default_factory:** For mutable default values (lists, dicts), use `default_factory` to create a fresh instance for each object. Without it, all objects share the same list — a common Python bug.

**How it's implemented:** Use `Field(ge=-50, le=200)` or `Field(pattern=r"^[A-Z]+-\d+$")` as the field default value. Pydantic checks these automatically.

---

### What are Custom Validators?

Custom validators are Python functions that run automatically on field assignment to perform checks that can't be expressed with simple constraints. Field constraints check individual values; custom validators check logical or physical plausibility.

**Types:**

- **@field_validator (single field):** Runs on one field. Use `mode='before'` to preprocess before Pydantic's type coercion (e.g., strip "psi" from a string before converting to float). Use `mode='after'` for post-coercion checks (e.g., temperature below absolute zero). Use `mode='wrap'` to add context to errors.

- **@model_validator (cross-field):** Runs after all fields are validated. Checks relationships between fields (e.g., high temperature requires pressurized system). If temperature > 100 and pressure < 20, the combination is physically dangerous even though each field is individually valid.

**Why it matters:** LLMs can produce data that passes individual field checks but violates physical laws. Custom validators catch these impossible combinations.

**How it's implemented:** Add a `@field_validator("field_name")` or `@model_validator(mode="after")` method to your Pydantic model. The function receives the value (field_validator) or `self` (model_validator) and raises `ValueError` if the check fails.

---

### What are Middleware Interceptors?

Middleware interceptors are a sandwich pattern that wraps AI-generated actions between pre-execution validation and post-execution sanity checks. The AI never talks to the real world directly — every action passes through the interceptor.

**The three layers:**

1. **Pre-check:** Validates the command structure and content before any side effects occur. Checks that required fields exist, values are in range, and the action is authorized.

2. **Execute:** The actual action happens — the real function runs.

3. **Post-check:** Verifies the result was safe after execution. For example, if you requested temperature 200 but the actual result was 150, the drift exceeds tolerance and the result is rejected.

**Trust boundary:** Everything inside the interceptor is validated. Everything outside is AI-generated and untrusted. This defines where trust ends and prevents unvalidated AI output from reaching the real world.

**How it's implemented:** Create a wrapper function or decorator that calls pre-check, then the real function, then post-check. Stack multiple interceptors for layered defense (logging interceptor, safety interceptor, etc.).

---

### What are Deterministic Fallbacks?

Deterministic fallbacks are hard-coded safety rules that override AI recommendations when they're dangerous. AI is probabilistic (it guesses); physical systems are deterministic (they follow laws). When an LLM suggests a motor speed that would melt the bearings, you don't need a second opinion — you need a rule that blocks it.

**The decision hierarchy (fixed, non-negotiable):**

1. **Physics rules first:** Immutable physical limits (temperature max, pressure range). AI cannot override these.
2. **Safety rules second:** Equipment-specific warnings (vibration threshold, humidity limits). Catches what physics misses.
3. **AI recommendation last:** The AI only gets through if all hard rules pass.

**Key patterns:**

- **Fallback chain:** Tries the AI recommendation first, then applies hard rules, then falls back to a safe default if everything else fails.

- **Audit logging:** Every decision — accepted, overridden, or rejected — is logged with a timestamp, the source, and the reason. This is non-negotiable in safety-critical systems.

- **Equipment-specific limits:** Thermal limits are configured per equipment type (oven: 100-500C, server rack: 10-45C, cryogenic chamber: -196 to -150C). Unknown equipment is rejected.

**How it's implemented:** Create a RuleEngine class with lists of physics rules and safety rules. Evaluate commands through the hierarchy: physics rules fire first, then safety, then AI. Log every decision to an audit trail.

---

## Part 3 — Tool Calling and Execution

### What is the Chat Completions API?

The Chat Completions API is the foundation of every LLM application. You send a list of messages with roles (system, user, assistant) and the AI generates the next message in the conversation.

**Message roles:**

- **system:** Sets the AI's behavior and context. Not visible to the user.
- **user:** The human's input. What the AI responds to.
- **assistant:** The AI's previous responses. Provides conversation continuity.

**Key parameters:**

- **temperature:** Controls randomness. 0.0 = deterministic (best for tool calling). 1.0 = creative/random.
- **max_tokens:** Limits response length.

**Multi-turn conversations:** To maintain context, include all previous messages in the list. The model sees the full transcript and can reference earlier information.

**Response parsing:** The response object contains `choices`, each with a `message` that has `role` and `content`. Check `finish_reason` ("stop" = natural end, "length" = hit max_tokens). Check `usage` for token counts (prompt vs completion).

---

### What are Context Windows?

Every LLM has a finite context window — a maximum number of tokens it can process in a single request. A token is roughly 4 characters. If you send too much text, the AI literally cannot read the beginning of the conversation. Longer contexts also cost more and slow down responses.

**Management strategies:**

- **Token counting:** Use `tiktoken` to count tokens before sending. Know your model's limit (e.g., 128k for GPT-4o).

- **Sliding window:** Keep only the most recent N messages. Always preserve the system prompt. Drop older conversation.

- **Summarization:** Replace old messages with a summary to preserve key information in fewer tokens. Split into old (to summarize) and recent (to keep).

- **Cost awareness:** Longer contexts mean higher latency and higher bills. Estimate cost before sending by counting input tokens and multiplying by the per-token price.

---

### What is the Tool Message Role?

Tool calling is how LLMs interact with the real world. The model never executes tools directly — it generates a structured request asking your code to run a function, and you send the result back.

**The flow:**

1. **User message:** Human asks a question.
2. **Assistant response with tool_calls:** The model decides it needs data and generates structured `tool_call` objects (function name + JSON arguments). Content is `None` — no text answer yet.
3. **Your code executes:** You parse the arguments, run the actual Python function, and format the result.
4. **Tool result message:** You send the result back as a `tool` role message with a matching `tool_call_id`.
5. **Assistant final response:** The model sees the tool results and generates a natural language answer.

**Defining tools:** Tools are described as JSON schemas — the "menu" of available functions you provide to the LLM. The model reads this menu and decides which functions to call.

**Multiple tool calls:** The model can request multiple tools in one response. You execute all of them and return all results before the model generates its final answer.

---

### What is JSON Schema Generation?

JSON schema generation is the process of automatically converting Python function signatures into the JSON schema format that LLMs expect for tool definitions. Instead of manually writing schemas (which is error-prone and duplicates your type hints), you introspect your functions and generate schemas programmatically.

**How it's implemented:** Use Python's `inspect.signature()` to get parameter names, types, and defaults. Use `get_type_hints()` to get annotations. Map Python types (str, int, float, bool) to JSON Schema types (string, integer, number, boolean). Handle special types: `Literal` becomes an enum, `list` becomes an array. Build the OpenAI-compatible tool definition structure with name, description, parameters, and required fields.

**Batch generation:** A utility can convert an entire list of functions into tool schemas in one call, so you can register whole function libraries with the LLM.

---

### What is Dynamic Execution?

Dynamic execution is the bridge between LLM output (text strings) and real Python code. The LLM outputs a function name as a string and arguments as JSON. Your code must map that string to a real Python function and execute it safely — without running arbitrary code.

**Key patterns:**

- **Registry pattern:** A dictionary mapping function name strings to actual Python callables. The LLM outputs "read_sensor", you look it up in the registry and call it.

- **Safe argument parsing:** LLM arguments come as a JSON string. Parse with `json.loads()`, then pass to the function with `**args` (dictionary unpacking into keyword arguments). Handle every failure path: unknown function, invalid JSON, wrong argument types.

- **Timeout guards:** Functions may hang. Wrap execution with a timeout so a bad tool call doesn't freeze the AI forever.

- **Allowlist sandboxing:** Never execute arbitrary code from the LLM. Maintain an explicit allowlist of functions the LLM is allowed to call. Even if the LLM generates a dangerous function name, the allowlist prevents execution.

**How it's implemented:** Create a FunctionRegistry class with `register()` and `get()` methods. An `execute()` method parses JSON, looks up the function, calls it, and returns a structured result with status and any errors.

---

## Part 4 — RAG and Context

### What are Embeddings?

Embeddings are numerical representations of text that capture semantic meaning. An embedding model reads a sentence and produces a list of hundreds of numbers (a vector). Texts with similar meanings produce similar lists of numbers, even if they share no common words.

**Why it matters:** Instead of searching for exact keyword matches, you can find text that is conceptually similar. "How do I reset the PLC fault code?" and "PLC error recovery procedure" have very different words but similar meanings — embeddings capture this.

**Key details:**

- The `text-embedding-3-small` model produces 1536-dimensional vectors.
- You can reduce dimensions (256-512) for faster search and less storage, trading some accuracy.
- **Batch embedding:** Send many texts in one API call (up to 2048) instead of one at a time.
- **Caching:** Hash text with SHA-256 to avoid re-embedding identical texts.

**How it's implemented:** Call the OpenAI embeddings API with a text string. It returns a list of floats. Similar texts produce vectors that point in nearly the same direction in the vector space.

---

### What is Cosine Similarity?

Cosine similarity measures how close two vectors point in the same direction, regardless of their magnitude. It's the standard metric for comparing embedding vectors because it focuses on the angle between vectors — which captures semantic similarity — rather than raw distance.

**Why cosine over Euclidean distance:** Two vectors can be far apart geometrically but point in the same direction. For example, "the pump is hot" and "the pump is overheating, the temperature is critically high, immediate shutdown required" — the second is longer and produces a larger vector, so Euclidean distance penalizes it. Cosine similarity correctly identifies them as identical in meaning because they point in the same direction.

**How it works:** The formula is `dot(a,b) / (norm(a) * norm(b))`. The result ranges from -1 (opposite) to 1 (identical), with 0 meaning unrelated. For text, values above 0.7 indicate strong similarity; below 0.3 indicates dissimilarity.

**Top-K ranking:** In practice, you compute cosine similarity between a query vector and all document vectors, then return the top-K most similar results. This is the core retrieval loop of every RAG system.

---

### What are Chunking Strategies?

Chunking is splitting large documents into smaller pieces so each piece gets its own embedding and can be independently retrieved. If you embed an entire 50-page manual, you get one vector that averages out all topics — useless for finding specific procedures. Chunking creates focused segments.

**Why it's necessary:** Embedding models have a maximum input length (~8191 tokens for text-embedding-3-small). Beyond that, text is silently truncated. Even within the limit, one vector per document can't distinguish between different sections.

**Strategies:**

- **Fixed-size:** Split every N characters with optional overlap. Simple but splits mid-sentence, breaking context.

- **Sentence-based:** Split on sentence delimiters, group sentences until you reach the target size. Preserves complete thoughts but produces variable chunk sizes.

- **Recursive character splitting:** Tries multiple delimiters in priority order (paragraphs → sentences → words → characters). Respects document structure. This is the best general-purpose starting point.

- **Overlap:** Include 10-20% overlap between chunks to preserve context at boundaries. Without overlap, the last sentence of chunk N and first sentence of chunk N+1 are separated across different embeddings.

- **Metadata attachment:** Each chunk carries metadata: source file, position, section type, machine ID. This enables filtering and attribution.

---

### What are Vector Databases?

A vector database stores embedding vectors alongside their source text and metadata, and provides fast similarity search. Think of it as a magical filing cabinet where documents are sorted by meaning, not alphabetically.

**Options:**

- **In-memory store:** A list of dictionaries with numpy-based similarity search. Perfect for learning and prototyping. Fine for tens of thousands of chunks.

- **pgvector (PostgreSQL extension):** Adds vector storage to PostgreSQL. You get SQL queries, ACID transactions, and metadata filtering alongside vector search. Uses an `ivfflat` index for accelerated cosine similarity.

- **Pinecone:** Fully managed vector database. Handles indexing, scaling, and replication. Tradeoff is vendor lock-in and per-query pricing.

**The critical insight:** The vector store is interchangeable. Build your retrieval logic around a simple interface (`insert()` + `search()`) so you can swap stores without rewriting your pipeline.

---

### What is Metadata Filtering?

Metadata filtering narrows the search space to relevant documents before or after vector similarity scoring. A maintenance technician asking about "seal replacement" only wants results for a specific machine, not every machine in the plant.

**Two approaches:**

- **Pre-filtering:** Reduce the dataset before computing similarity. Faster and more predictable. Every result is guaranteed to match the filter.

- **Post-filtering:** Compute similarity across all documents, then remove results that don't match the filter. Preserves global ranking but wastes compute on irrelevant documents.

- **Hybrid search:** Combines vector similarity with keyword matching. A score multiplier boosts documents that contain important terms even if their vector similarity is slightly lower.

- **Multi-field AND logic:** Combine multiple filters (e.g., `machine_id=P101 AND section_type=maintenance`) to narrow results precisely.

**How it's implemented:** Store metadata as flat key-value pairs alongside each vector. Filter before or after the cosine similarity calculation. In pgvector, use SQL WHERE clauses. In Pinecone, use filter dictionaries.

---

## Part 5 — Multi-Agent Orchestration

### What is the State Dictionary Pattern?

The state dictionary is a single Python dictionary passed from function to function as a shared clipboard. Each function reads what happened previously, adds its own work, and passes it to the next step. This gives multi-step agents a single source of truth.

**Why it matters:** Without shared state, each function operates in isolation. One function gathers user input, another analyzes it, a third generates a response — they need to share information.

**Key patterns:**

- **TypedDict:** Define the shape of your state dictionary explicitly. Every key is declared with its type. This catches typos at development time and documents expected fields.

- **Phase-based transitions:** Each function checks the current phase (idle → gathering → analyzing → responding), does its work, and sets the next phase. This creates a deterministic state machine.

- **Guard functions:** Each function only runs if the state is in the correct phase. This prevents out-of-order execution.

- **Deep copy for forking:** State dicts are mutable. When branching into parallel flows, use `copy.deepcopy()` to create independent copies. Without it, changes in one branch appear in both.

---

### What is Session Management?

Session management stores agent state externally so it persists across HTTP requests. Stateless APIs forget everything between requests — once the response is sent, the server forgets. Session storage is the notepad that lets the server recall what you were talking about.

**Key components:**

- **Serialization:** Convert agent state to JSON strings for storage. JSON handles strings, numbers, lists, and dicts natively.

- **Redis-like interface:** An in-memory key-value store with TTL (time-to-live) expiration. Sessions automatically expire after a set time (e.g., 1 hour), preventing memory leaks from abandoned sessions.

- **Session lifecycle:** Create → Update → Retrieve → Cleanup. A `SessionManager` class handles the full lifecycle. Call `cleanup()` periodically to remove expired sessions.

- **Multi-turn conversation history:** Store the full message history in session state. Use a context window limit (5-10 recent turns) to avoid wasting tokens.

---

### What are Self-Correction Loops?

Self-correction loops catch LLM output errors and feed them back to the LLM for automatic fixing. Instead of crashing when the AI produces malformed output, you catch the error, explain what went wrong, and ask the AI to try again.

**The loop:**

1. Call the LLM to produce output.
2. Validate the output against a Pydantic model.
3. If validation fails, extract the error messages.
4. Append the errors to the original prompt with instructions to fix.
5. Call the LLM again with the updated prompt.
6. Repeat until valid or retry limit reached.

**Key considerations:**

- **Error classification:** Some errors are retriable (wrong type, missing field — the AI can fix these). Some are non-retriable (invalid enum value, fundamental misunderstanding — retrying wastes API calls).

- **Retry limits:** Set a maximum number of retries to prevent infinite loops. Typically 3 attempts.

- **Correction logging:** Log every attempt — the prompt sent, raw output received, and errors found. This reveals common failure patterns and helps improve your prompts.

**How it's implemented:** Write a loop that calls the LLM, validates with Pydantic, catches `ValidationError`, formats the errors, appends them to the prompt, and retries. Track attempt count and log each iteration.

---

## Part 6 — Capstone Production System

### What is the 5-Stage Pipeline Architecture?

The production agentic system has five sequential stages, each receiving structured input and producing structured output. Think of it as a car factory assembly line — each station does one thing, and if something goes wrong, you know exactly which station failed.

**The five stages:**

1. **Planner (LLM):** Receives the user query. Decides which tools to call and in what order. Returns a list of tool call requests. This is where the AI reasons about what information it needs.

2. **Retriever (RAG):** Searches chunked documents filtered by metadata. Returns relevant passages that provide domain context for the query. This gives the AI knowledge it doesn't have in its training data.

3. **Executor (Tool Calling):** Maps each tool call to an actual Python function and runs it. Returns raw results. This is where the AI interacts with real systems.

4. **Validator (Physics Rules):** Checks every result against deterministic rules. No LLM involved — pure Python logic. This is the trust boundary that prevents bad data from reaching the user.

5. **Synthesizer (LLM):** Takes validated results plus context and generates a human-readable diagnostic report. This is where raw data becomes actionable information.

**PipelineState:** A Pydantic model that flows through all stages as the single source of truth. It carries the query, context, tool calls, results, validated results, errors, and final answer. If any stage fails, the pipeline logs the error, optionally retries, or returns a degraded answer.

---

### What is Observability?

Observability is the ability to understand what's happening inside your system by looking at its outputs. An agentic pipeline that silently fails is worse than no pipeline at all. When an LLM generates a bad tool call, a retriever returns irrelevant context, or a validator rejects a reading, you need structured data to diagnose exactly what happened.

**Key components:**

- **Structured JSON logging:** Every event is logged as a JSON object with timestamp, event type, and relevant fields. This lets you filter, aggregate, and alert on specific events.

- **Execution timing:** A `@timed` decorator wraps every function call, records how long it took, and logs it. Slow tools indicate bottleneck functions.

- **Token tracking:** LLM calls are billed by token count. Track input/output tokens and estimate cost to avoid budget surprises.

- **Pipeline trace context manager:** Captures the full trace of a pipeline run — every stage, its timing, and any errors. Gives you a complete picture of what happened.

- **Error tracking with self-correction logs:** When validation fails and the pipeline retries, log every retry attempt. This reveals how many correction loops were needed and which errors are most common.

**How it's implemented:** Create a `StructuredLogger` class that appends JSON entries to a list. Wrap functions with `@timed` to measure execution. Build a `TokenTracker` that accumulates token counts and costs. Use a `@contextmanager` for pipeline traces.

---

## Key Architectural Patterns

### The Safety Layer Pattern

Every layer in this curriculum adds a safety boundary between LLM output and real-world execution:

1. **Type hints** catch wrong data types at development time
2. **Pydantic validation** catches structural errors at the boundary
3. **Physics rule engines** catch physically impossible values
4. **Tool-call allowlists** prevent unauthorized function execution
5. **Pipeline validators** catch violations at every stage

The AI is never trusted directly. Every output passes through at least one validation layer before reaching the real world.

### The Assembly Line Pattern

Data flows through a linear pipeline where each stage is independent, testable, and replaceable. The PipelineState model carries data between stages as the single source of truth. If any stage fails, the error is captured and the pipeline can degrade gracefully rather than crashing.

### The Trust Boundary Pattern

The middleware interceptor pattern defines where trust ends. Everything outside the boundary is AI-generated and untrusted. Everything inside is validated by deterministic rules. The AI cannot directly break the system because every action passes through the trust boundary.

### The Self-Healing Pattern

Self-correction loops turn fragile LLM output into reliable structured data. Instead of crashing on bad output, the system catches errors, feeds them back to the LLM with instructions, and retries until the output is valid. Combined with retry limits and error classification, this prevents infinite loops while maximizing success rates.
