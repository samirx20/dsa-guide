# Part 8, Topic 2: State Machines & Memory
## Chapter 2: Session Management

**Prerequisite Knowledge:** Basic understanding of dictionaries, JSON, and what an API request is.

### The 'Waitress Notepad' Analogy

Imagine a busy waitress taking orders. If she doesn't write anything down (stateless), she has to ask you what you want every time she walks by your table. If she writes it on her notepad (session management), she remembers your entire order history, even if she serves ten other tables in between.

When you build AI agents as web services, the server is like that busy waitress. By default, it forgets everything as soon as it sends a reply. "Session Management" is the notepad. We save the conversation history in a database or memory so the AI can recall exactly what you were talking about when you send your next message.

Stateless APIs forget everything between requests. To maintain multi-turn conversations and agent state across requests, you need external session storage. This chapter covers serializing agent state, storing it with a Redis-like interface, and managing session lifecycle with TTL-based expiration.

---

### 1. Why Stateless APIs Need External Memory

An HTTP request contains only what the client sends. Your agent's conversation history, collected facts, and current phase exist only in the response — once the response is sent, the server forgets everything. Session storage gives the server a way to recall state between requests:

```
┌─────────────────────────────────────────────────────────────────┐
│                   SESSION DATA FLOW                             │
│                                                                 │
│  ┌──────────┐   HTTP Request   ┌──────────┐                     │
│  │  Client   │ ──────────────► │  Server   │                     │
│  │ (Browser) │                 │  (Agent)  │                     │
│  └──────────┘ ◄────────────── └──────────┘                     │
│                  HTTP Response                                  │
│                                                                 │
│  Without session storage:                                      │
│  ┌──────────┐   HTTP Request   ┌──────────┐                     │
│  │  Client   │ ──────────────► │  Server   │                     │
│  └──────────┘ ◄────────────── └──────────┘                     │
│                  HTTP Response                                  │
│                  (No memory of previous                         │
│                   conversation!)                                │
│                                                                 │
│  With session storage:                                         │
│  ┌──────────┐   HTTP Request   ┌──────────┐   ┌──────────┐     │
│  │  Client   │ ──────────────► │  Server   │ ◄─► │  Redis   │     │
│  └──────────┘ ◄────────────── └──────────┘   └──────────┘     │
│                  HTTP Response              (Session Store)     │
│                  (Remembers everything!)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Basic Example - In-Memory Session Store:**

```python
import json
import time
import uuid

# This dictionary is our "notepad" to store all active user sessions
sessions = {}

def create_session(initial_state=None):
    # Create a unique ID for this user session
    session_id = str(uuid.uuid4())
    
    # Save their starting data with some timestamps
    sessions[session_id] = {
        "state": initial_state or {},
        "created_at": time.time(),
        "last_accessed": time.time(),
        "ttl": 3600  # Time to live: 1 hour in seconds
    }
    return session_id

def get_session(session_id):
    # 1. Look up the session
    session = sessions.get(session_id)
    if not session:
        return None
        
    # 2. Check if it's too old (expired)
    time_since_last_access = time.time() - session["last_accessed"]
    if time_since_last_access > session["ttl"]:
        # If expired, delete it and return None
        del sessions[session_id]
        return None
        
    # 3. Update the access time to keep it alive
    session["last_accessed"] = time.time()
    return session["state"]

# Usage Example
sid = create_session({"phase": "idle", "messages": []})

# Retrieve the state, modify it, and it stays in memory
state = get_session(sid)
state["messages"].append({"role": "user", "content": "Hello"})
```

**What's happening in the code above:**

```
Line 1-3:       Import libraries for JSON serialization, timestamps, and unique IDs
Line 6:         Create empty dictionary to hold all active sessions
Line 8-18:      create_session() function generates a unique session ID
Line 11:        uuid.uuid4() creates a random 128-bit identifier
Line 15-17:     Initialize session with state, creation time, and expiry
Line 19-31:     get_session() function retrieves a session by ID
Line 21-22:     Check if session exists in the dictionary
Line 25-29:     Calculate time since last access, delete if expired
Line 31:        Update last_accessed timestamp to prevent expiry
Line 34:        Create a session with initial state dict
Line 37-38:     Retrieve session, add a message to it
```

**Edge Case - What Happens Without TTL:**

```python
# BAD: No TTL - sessions accumulate forever
sessions_no_ttl = {}

def create_session_bad(initial_state):
    session_id = str(uuid.uuid4())
    sessions_no_ttl[session_id] = {
        "state": initial_state or {},
        "created_at": time.time()
        # No TTL - session lives forever!
    }
    return session_id

# After 1000 users, you have 1000 sessions in memory
# Memory usage grows unbounded until the server crashes
```

**What's happening in the code above:**

```
Line 4-5:       Empty dictionary with no cleanup mechanism
Line 7-12:      Session created without expiry time
Line 11:        Comment highlights missing TTL field
Line 14:        Each user adds a session but none are ever removed
Line 16-17:     Memory grows until server runs out of RAM
```

**Production Example - Thread-Safe Session Store:**

```python
import json
import time
import uuid
import threading

class ThreadSafeSessionStore:
    def __init__(self, default_ttl=3600):
        self.store = {}
        self.lock = threading.RLock()  # Reentrant lock for nested calls
        self.default_ttl = default_ttl

    def set(self, session_id, state, ttl=None):
        expiry_time = time.time() + (ttl or self.default_ttl)
        
        with self.lock:  # Thread-safe write
            self.store[session_id] = {
                "data": json.dumps(state),
                "expires_at": expiry_time
            }

    def get(self, session_id):
        with self.lock:  # Thread-safe read
            entry = self.store.get(session_id)
            if not entry:
                return None
                
            if time.time() > entry["expires_at"]:
                del self.store[session_id]
                return None
                
            return json.loads(entry["data"])

    def cleanup_expired(self):
        """Remove all expired sessions"""
        now = time.time()
        expired_ids = []
        
        with self.lock:
            for sid, entry in list(self.store.items()):
                if now > entry["expires_at"]:
                    expired_ids.append(sid)
                    del self.store[sid]
        
        return len(expired_ids)

# Usage
store = ThreadSafeSessionStore(default_ttl=1800)
store.set("sess_abc123", {"phase": "idle", "messages": []})
state = store.get("sess_abc123")
print(state)  # {'phase': 'idle', 'messages': []}
```

**What's happening in the code above:**

```
Line 1-5:       Import threading module for concurrent access control
Line 8:         Create class with store dictionary and lock
Line 9:         ReentrantLock allows same thread to acquire lock multiple times
Line 13-19:     set() method serializes state and stores with expiry time
Line 16:        json.dumps() converts Python dict to JSON string
Line 21-30:     get() method retrieves and deserializes session
Line 24-27:     Check expiry, delete if expired
Line 32-40:     cleanup_expired() removes all old sessions at once
Line 35-37:     Use list() to iterate safely while deleting
Line 42-44:     Create store, set session, retrieve and print
```

**Comparison Table: Session Store Approaches**

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| In-Memory Dict | Simple, fast | Single process only, no persistence | Development, testing |
| Thread-Safe Store | Handles concurrency | Still single process | Single-server apps |
| Redis Store | Distributed, fast, TTL built-in | Requires Redis server | Production systems |
| Database Store | Persistent, queryable | Slower than Redis | Long-term storage |

---

### 2. Serializing Agent State to JSON

State dicts must be serialized to store them. JSON is the standard format — it is human-readable, widely supported, and works with Redis, databases, and file systems:

**Basic Serialization:**

```python
import json

state = {
    "phase": "analyzing",
    "user_input": "Pump P101 vibration alert",
    "collected_facts": ["vibration at 7.2 mm/s", "temperature at 85C"],
    "sensor_data": {"vibration": 7.2, "temperature": 85.0},
    "analysis_result": "Check alignment and bearings",
    "messages": [
        {"role": "user", "content": "Pump P101 vibration alert"},
        {"role": "assistant", "content": "Checking sensor data..."}
    ]
}

# Convert the Python dictionary to a JSON string so we can save it
serialized = json.dumps(state, indent=2)
print(serialized[:200])

# Later, convert the JSON string back into a Python dictionary
restored = json.loads(serialized)

print(restored["phase"])  # analyzing
print(type(restored["collected_facts"]))  # <class 'list'>
```

**What's happening in the code above:**

```
Line 1:         Import json module for serialization
Line 3-13:      Define agent state dictionary with sensor data
Line 15:        json.dumps() converts dict to JSON string
Line 16:        Print first 200 characters of serialized output
Line 18:        json.loads() converts JSON string back to dict
Line 20-21:     Access restored data, verify types match
```

**Common Mistake - Non-Serializable Types:**

```python
# BAD: Using non-JSON-serializable types
bad_state = {
    "phase": "idle",
    "sensor_ids": {101, 102, 103},  # SET - not JSON serializable!
    "coordinates": (40.7, -74.0),   # TUPLE - becomes list
    "model": SomeCustomObject(),    # CUSTOM OBJECT - fails!
}

try:
    serialized = json.dumps(bad_state)
except TypeError as e:
    print(f"Error: {e}")
    # Output: Object of type set is not JSON serializable
```

**What's happening in the code above:**

```
Line 3:         State dict with problematic types
Line 5:         Set object {} is not JSON serializable
Line 6:         Tuple () becomes array [] in JSON
Line 7:         Custom object raises TypeError
Line 10-12:     Try to serialize, catch TypeError
Line 13:        Error shows set is the problem
```

**Fix - Converting to JSON-Safe Types:**

```python
import json

def make_json_safe(obj):
    """Convert Python types to JSON-serializable equivalents"""
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_safe(item) for item in obj]
    elif isinstance(obj, set):
        return sorted(list(obj))  # Convert set to sorted list
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    elif hasattr(obj, '__dict__'):
        return make_json_safe(obj.__dict__)  # Convert objects to dicts
    else:
        return str(obj)  # Fallback to string representation

# Now it works
safe_state = make_json_safe(bad_state)
serialized = json.dumps(safe_state, indent=2)
print(serialized)
```

**What's happening in the code above:**

```
Line 4-14:      Recursive function to convert any Python object
Line 6:         Handle dicts recursively
Line 8:         Handle lists and tuples recursively
Line 10:        Convert sets to sorted lists
Line 12:        Pass through JSON-native types
Line 14:        Convert custom objects to their __dict__
Line 16:        Fallback: convert anything to string
Line 19-21:     Use the conversion function, then serialize
```

**Production Example - Schema Validation:**

```python
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

@dataclass
class SensorReading:
    vibration: float
    temperature: float
    timestamp: float

@dataclass 
class AgentState:
    phase: str
    user_input: str
    sensor_readings: List[SensorReading]
    messages: List[Dict[str, str]]
    analysis: Optional[str] = None

def serialize_agent_state(state: AgentState) -> str:
    """Serialize AgentState to JSON with schema validation"""
    state_dict = asdict(state)  # Convert dataclass to dict
    
    # Validate required fields
    required = ["phase", "user_input", "sensor_readings", "messages"]
    for field in required:
        if field not in state_dict:
            raise ValueError(f"Missing required field: {field}")
    
    return json.dumps(state_dict, indent=2)

# Usage
reading = SensorReading(vibration=7.2, temperature=85.0, timestamp=time.time())
state = AgentState(
    phase="analyzing",
    user_input="Pump P101 alert",
    sensor_readings=[reading],
    messages=[{"role": "user", "content": "Pump P101 alert"}]
)

serialized = serialize_agent_state(state)
print(serialized[:300])
```

**What's happening in the code above:**

```
Line 6-9:       Dataclass for sensor readings with type hints
Line 12-17:     Dataclass for complete agent state
Line 19-29:     Serialization function with validation
Line 21:        asdict() converts dataclass to dictionary
Line 24-27:     Check for required fields before serialization
Line 32-39:     Create state object with sensor data
Line 41:        Serialize and print first 300 chars
```

**Error Scenario - Circular References:**

```python
import json

# BAD: Circular reference in state
state = {"phase": "idle"}
state["self"] = state  # References itself!

try:
    serialized = json.dumps(state)
except ValueError as e:
    print(f"Error: {e}")
    # Output: Circular reference detected
```

**What's happening in the code above:**

```
Line 4:         State dictionary
Line 5:         State references itself - circular reference
Line 8-10:      Try to serialize, catch ValueError
Line 11:        JSON encoder detects the circular reference
```

**Fix - Detect and Remove Cycles:**

```python
import json

def serialize_no_cycles(obj, seen=None):
    """Serialize without circular references"""
    if seen is None:
        seen = set()
    
    obj_id = id(obj)
    if obj_id in seen:
        return "<circular reference>"  # Replace with placeholder
    seen.add(obj_id)
    
    if isinstance(obj, dict):
        return {k: serialize_no_cycles(v, seen.copy()) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_no_cycles(item, seen.copy()) for item in obj]
    else:
        return obj

state = {"phase": "idle"}
state["self"] = state  # Circular reference

safe = serialize_no_cycles(state)
serialized = json.dumps(safe)
print(serialized)
# Output: {"phase": "idle", "self": "<circular reference>"}
```

**What's happening in the code above:**

```
Line 4-21:      Function to detect and handle circular references
Line 8:         Track seen object IDs
Line 10-12:     If object already seen, replace with placeholder
Line 14:        Add object ID to seen set
Line 16-19:     Recursively process dicts and lists
Line 24-25:     Create state with circular reference
Line 27-28:     Serialize safely, circular reference becomes string
```

---

### 3. Redis as Session Store

Redis is an in-memory key-value store designed for exactly this use case. It supports TTL-based expiration so sessions are automatically cleaned up:

**Basic Redis Interface:**

```python
import json
import time

class RedisSessionStore:
    def __init__(self, default_ttl=3600):
        self.store = {}
        self.default_ttl = default_ttl

    def set(self, session_id, state, ttl=None):
        # Calculate exactly when this session should die
        expiry_time = time.time() + (ttl or self.default_ttl)
        
        self.store[session_id] = {
            "data": json.dumps(state),
            "expires_at": expiry_time
        }

    def get(self, session_id):
        entry = self.store.get(session_id)
        if not entry:
            return None
            
        # Check if the current time is past the expiry time
        if time.time() > entry["expires_at"]:
            del self.store[session_id]
            return None
            
        return json.loads(entry["data"])

    def delete(self, session_id):
        self.store.pop(session_id, None)

    def list_sessions(self):
        now = time.time()
        active = []
        
        # We use list() to safely iterate while we might delete items
        for sid, entry in list(self.store.items()):
            if now > entry["expires_at"]:
                del self.store[sid]
            else:
                active.append(sid)
        return active

store = RedisSessionStore(default_ttl=1800)
store.set("sess_abc123", {"phase": "idle", "messages": []})
state = store.get("sess_abc123")
print(state)  # {'phase': 'idle', 'messages': []}
```

**What's happening in the code above:**

```
Line 1-2:       Import json and time modules
Line 5-8:       Initialize store with default TTL of 1 hour
Line 10-17:     set() method stores state with expiry time
Line 12:        Calculate expiry time as current time + TTL
Line 19-28:     get() method retrieves and checks expiry
Line 23-25:     If expired, delete and return None
Line 27:        Otherwise, deserialize and return state
Line 30-31:     delete() method removes session
Line 33-40:     list_sessions() returns active session IDs
Line 37-39:     Iterate safely, remove expired entries
Line 42-44:     Create store, set session, retrieve and print
```

**Production Pattern - Real Redis with Connection Pool:**

```python
import redis
import json
import time
from contextlib import contextmanager

class ProductionRedisSessionStore:
    def __init__(self, redis_url="redis://localhost:6379", default_ttl=3600):
        self.redis = redis.from_url(
            redis_url,
            decode_responses=True,  # Auto-decode bytes to strings
            max_connections=20       # Connection pool size
        )
        self.default_ttl = default_ttl
        self.prefix = "agent:session:"

    def _key(self, session_id):
        """Add prefix to avoid key collisions"""
        return f"{self.prefix}{session_id}"

    def set(self, session_id, state, ttl=None):
        key = self._key(session_id)
        ttl = ttl or self.default_ttl
        
        # Use pipeline for atomic operation
        with self.redis.pipeline(transaction=True) as pipe:
            pipe.set(key, json.dumps(state))
            pipe.expire(key, ttl)  # Set expiry atomically
            pipe.execute()

    def get(self, session_id):
        key = self._key(session_id)
        
        # GET + TTL in one round trip
        data, ttl = self.redis.pipeline(transaction=True) \
            .get(key) \
            .ttl(key) \
            .execute()
        
        if data is None:
            return None
        
        # Refresh TTL on access (sliding window)
        self.redis.expire(key, self.default_ttl)
        
        return json.loads(data)

    def delete(self, session_id):
        key = self._key(session_id)
        self.redis.delete(key)

    def get_many(self, session_ids):
        """Batch get multiple sessions efficiently"""
        keys = [self._key(sid) for sid in session_ids]
        pipeline = self.redis.pipeline()
        for key in keys:
            pipeline.get(key)
        
        results = pipeline.execute()
        return [json.loads(data) if data else None for data in results]

# Usage
store = ProductionRedisSessionStore(
    redis_url="redis://my-redis:6379",
    default_ttl=1800
)

# Store session
store.set("sess_abc123", {"phase": "idle", "messages": []}, ttl=3600)

# Retrieve (refreshes TTL)
state = store.get("sess_abc123")

# Batch retrieve (efficient)
states = store.get_many(["sess_abc123", "sess_def456", "sess_ghi789"])
```

**What's happening in the code above:**

```
Line 1-4:       Import redis, json, time, and contextlib
Line 7-15:      Initialize Redis connection with connection pool
Line 11:        decode_responses=True converts bytes to strings
Line 12:        max_connections=20 limits pool size
Line 14:        prefix prevents key collisions with other apps
Line 17-18:     _key() method adds prefix to session ID
Line 20-27:     set() uses pipeline for atomic set+expire
Line 24-27:     Pipeline executes both commands together
Line 29-41:     get() uses pipeline for efficient read
Line 33-36:     Pipeline gets data and TTL in one round trip
Line 40:        Refresh TTL on each access (sliding window)
Line 47-53:     get_many() batch retrieves multiple sessions
Line 49:        Create pipeline with multiple commands
Line 53:        Execute all commands at once
Line 57-61:     Create store with Redis URL
Line 64-65:     Set session with explicit TTL
Line 68:        Get session (refreshes TTL)
Line 71:        Batch get for efficiency
```

**Error Scenario - Redis Connection Failure:**

```python
# BAD: No error handling for Redis failures
class BadRedisStore:
    def get(self, session_id):
        # If Redis is down, this crashes
        return self.redis.get(session_id)

# BETTER: Handle connection errors gracefully
class ResilientRedisStore:
    def __init__(self, redis_url, fallback_store=None):
        self.redis = redis.from_url(redis_url)
        self.fallback = fallback_store or {}
        self.circuit_open = False

    def get(self, session_id):
        try:
            if self.circuit_open:
                # Circuit breaker is open, use fallback
                return self.fallback.get(session_id)
            
            data = self.redis.get(session_id)
            return json.loads(data) if data else None
            
        except redis.ConnectionError as e:
            print(f"Redis connection failed: {e}")
            self.circuit_open = True  # Open circuit breaker
            return self.fallback.get(session_id)
        except Exception as e:
            print(f"Unexpected error: {e}")
            return self.fallback.get(session_id)
```

**What's happening in the code above:**

```
Line 4-7:       Bad example - no error handling
Line 10-30:     Better approach with circuit breaker pattern
Line 13:        Fallback to in-memory store when Redis fails
Line 14:        Circuit breaker flag to prevent repeated failures
Line 17-28:     get() with try/except for various error types
Line 19-21:     Check circuit breaker before calling Redis
Line 24-25:     Store successful result
Line 27-29:     Handle Redis connection error
Line 31-33:     Handle any other unexpected errors
```

**Comparison: Redis vs In-Memory Store**

| Feature | In-Memory Dict | Redis |
|---------|----------------|-------|
| Speed | ~0.01ms | ~0.5ms |
| Persistence | None | Optional (RDB/AOF) |
| Distribution | Single process | Multiple processes |
| TTL Support | Manual | Built-in |
| Memory Efficiency | Low | High (optimized) |
| Setup Complexity | None | Requires server |
| Failover | None | Sentinel/Cluster |

---

### 4. Multi-Turn Conversation History

Store the full message history in the session state so the agent can reference previous turns:

**Basic Conversation History:**

```python
def add_message(state, role, content):
    state["messages"].append({"role": role, "content": content})
    return state

def get_context_window(state, max_turns=5):
    # Use list slicing [-max_turns:] to get only the most recent messages
    return state["messages"][-max_turns:]

state = {"phase": "idle", "messages": [], "collected_facts": []}

state = add_message(state, "user", "Pump P101 has high vibration")
state = add_message(state, "assistant", "I see the vibration is elevated. Checking sensor data...")
state = add_message(state, "user", "The temperature is also high at 85C")
state = add_message(state, "assistant", "Combined vibration and temperature anomaly detected.")

# Get only the last 4 messages to save tokens
context = get_context_window(state, max_turns=4)
for msg in context:
    print(f"[{msg['role']}] {msg['content'][:60]}")
```

**What's happening in the code above:**

```
Line 1-3:       add_message() appends message to history
Line 5-6:       get_context_window() returns last N messages
Line 7:         Slice with [-max_turns:] for recent messages
Line 9-10:      Initial state with empty messages list
Line 13-16:     Add conversation messages
Line 19:        Get last 4 messages for context
Line 20-21:     Print truncated messages
```

**Context Window Strategies:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONTEXT WINDOW STRATEGIES                       │
│                                                                 │
│  Full History:                                                  │
│  [msg1] [msg2] [msg3] [msg4] [msg5] [msg6] [msg7] [msg8]      │
│                                                                 │
│  Sliding Window (last 4):                                       │
│  [msg5] [msg6] [msg7] [msg8]                                   │
│                                                                 │
│  Sliding + Summary:                                             │
│  [summary of msg1-4] [msg5] [msg6] [msg7] [msg8]              │
│                                                                 │
│  Sliding + Key Facts:                                           │
│  [msg1] [key facts extracted] [msg7] [msg8]                    │
└─────────────────────────────────────────────────────────────────┘
```

**Production Example - Sliding Window with Summary:**

```python
import json

class ConversationManager:
    def __init__(self, max_turns=10, summary_threshold=20):
        self.max_turns = max_turns
        self.summary_threshold = summary_threshold

    def add_message(self, state, role, content):
        """Add message and manage context window"""
        state["messages"].append({
            "role": role,
            "content": content,
            "timestamp": time.time()
        })
        
        # If messages exceed threshold, summarize old ones
        if len(state["messages"]) > self.summary_threshold:
            self._summarize_old_messages(state)
        
        return state

    def _summarize_old_messages(self, state):
        """Summarize old messages to save context window space"""
        messages = state["messages"]
        cutoff = len(messages) // 2  # Summarize first half
        
        # Extract key facts from old messages
        old_messages = messages[:cutoff]
        summary = self._create_summary(old_messages)
        
        # Replace old messages with summary
        state["messages"] = [
            {"role": "system", "content": f"Summary: {summary}"},
            *messages[cutoff:]  # Keep recent messages
        ]
        
        # Store full history in separate field
        if "full_history" not in state:
            state["full_history"] = []
        state["full_history"].extend(old_messages)

    def _create_summary(self, messages):
        """Create a summary of messages"""
        facts = []
        for msg in messages:
            if msg["role"] == "user":
                facts.append(f"User said: {msg['content'][:50]}...")
            elif msg["role"] == "assistant":
                facts.append(f"Assistant noted: {msg['content'][:50]}...")
        return "; ".join(facts)

    def get_context(self, state):
        """Get context window for LLM"""
        messages = state["messages"]
        
        # Ensure we don't exceed max_turns
        if len(messages) > self.max_turns:
            return messages[-self.max_turns:]
        
        return messages

# Usage
conv = ConversationManager(max_turns=5, summary_threshold=10)
state = {"phase": "idle", "messages": []}

# Add many messages
for i in range(15):
    state = conv.add_message(state, "user", f"Message {i}")
    state = conv.add_message(state, "assistant", f"Response {i}")

# Get context window
context = conv.get_context(state)
print(f"Context has {len(context)} messages")
```

**What's happening in the code above:**

```
Line 6-8:       Initialize with max turns and summary threshold
Line 10-20:     add_message() with automatic summarization
Line 18-19:     Check if messages exceed threshold
Line 21-36:     _summarize_old_messages() compresses old messages
Line 24:        Calculate cutoff at half of messages
Line 27-28:     Extract key facts from old messages
Line 31-35:     Replace old messages with summary
Line 38-46:     _create_summary() extracts key information
Line 48-54:     get_context() returns messages within max_turns
Line 57-58:     Create manager with limits
Line 61-63:     Add 15 message pairs to trigger summarization
Line 66-67:     Get context window (should be <= max_turns)
```

**Error Scenario - Token Limit Exceeded:**

```python
# BAD: No token limit check
def get_context_bad(state):
    # Could return too many tokens for LLM
    return state["messages"]

# BETTER: Check token count (approximate)
def count_tokens(text):
    """Rough token count (words * 1.3)"""
    return int(len(text.split()) * 1.3)

def get_context_with_token_limit(state, max_tokens=4000):
    """Get context within token limit"""
    messages = state["messages"]
    total_tokens = 0
    selected = []
    
    # Add messages from most recent to oldest
    for msg in reversed(messages):
        msg_tokens = count_tokens(msg["content"])
        
        if total_tokens + msg_tokens > max_tokens:
            break  # Stop adding messages
        
        selected.insert(0, msg)  # Insert at beginning
        total_tokens += msg_tokens
    
    return selected

context = get_context_with_token_limit(state, max_tokens=2000)
print(f"Context has {len(context)} messages, ~{count_tokens(str(context))} tokens")
```

**What's happening in the code above:**

```
Line 4-6:       Bad example - no token limit
Line 9-10:      Rough token count estimation
Line 13-26:     Better approach with token counting
Line 17:        Iterate messages from newest to oldest
Line 19-21:     Check if adding message exceeds limit
Line 24-25:     Insert at beginning to maintain order
Line 28-29:     Get context within 2000 token limit
```

---

### 5. Session Lifecycle Management

Sessions need creation, update, retrieval, and cleanup. A complete session manager handles the full lifecycle:

**Basic Session Manager:**

```python
import uuid
import time

class SessionManager:
    def __init__(self, ttl=3600):
        self.sessions = {}
        self.ttl = ttl

    def create(self, agent_state):
        # Generate a short random ID
        sid = str(uuid.uuid4())[:8]
        self.sessions[sid] = {"state": agent_state, "created": time.time()}
        return sid

    def update(self, session_id, state):
        # Save the new state and reset the timer
        if session_id in self.sessions:
            self.sessions[session_id]["state"] = state
            self.sessions[session_id]["created"] = time.time()

    def get(self, session_id):
        entry = self.sessions.get(session_id)
        if not entry:
            return None
            
        # Delete if expired
        if time.time() - entry["created"] > self.ttl:
            del self.sessions[session_id]
            return None
            
        return entry["state"]

    def cleanup(self):
        now = time.time()
        # Find all IDs that are expired
        expired = [sid for sid, e in self.sessions.items() if now - e["created"] > self.ttl]
        
        # Delete them
        for sid in expired:
            del self.sessions[sid]
        return len(expired)

mgr = SessionManager(ttl=60)
sid = mgr.create({"phase": "idle", "messages": []})

state = mgr.get(sid)
state["messages"].append({"role": "user", "content": "Start diagnostic"})
mgr.update(sid, state)

final = mgr.get(sid)
print(final["messages"])
print(f"Active sessions: {len(mgr.sessions)}")
```

**What's happening in the code above:**

```
Line 1-2:       Import uuid and time modules
Line 5-8:       Initialize with TTL of 1 hour
Line 10-14:     create() generates 8-character session ID
Line 11:        uuid4() creates random ID, [:8] truncates
Line 16-19:     update() saves state and resets expiry
Line 21-30:     get() retrieves session, checks expiry
Line 26-28:     Delete if expired
Line 32-39:     cleanup() removes all expired sessions
Line 37-38:     List comprehension finds expired sessions
Line 41-42:     Delete expired sessions
Line 44-48:     Usage example
```

**Session Lifecycle Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                             │
│                                                                 │
│  ┌─────────┐                                                    │
│  │  None   │                                                    │
│  └────┬────┘                                                    │
│       │ create()                                                │
│       ▼                                                         │
│  ┌─────────┐    get()/update()    ┌─────────┐                   │
│  │ ACTIVE  │ ◄─────────────────► │ ACTIVE  │                   │
│  └────┬────┘                      └────┬────┘                   │
│       │                                │                        │
│       │ update()                       │                        │
│       │ (resets timer)                 │                        │
│       ▼                                │                        │
│  ┌─────────┐                           │                        │
│  │ ACTIVE  │ ◄─────────────────────────┘                        │
│  └────┬────┘                                                    │
│       │                                                         │
│       │ TTL expires OR delete()                                 │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │  None   │ (deleted)                                          │
│  └─────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Production Example - Session Manager with Statistics:**

```python
import uuid
import time
import threading
from collections import defaultdict

class ProductionSessionManager:
    def __init__(self, ttl=3600, max_sessions=10000):
        self.sessions = {}
        self.ttl = ttl
        self.max_sessions = max_sessions
        self.lock = threading.RLock()
        
        # Statistics
        self.stats = {
            "created": 0,
            "accessed": 0,
            "expired": 0,
            "rejected": 0  # When max_sessions reached
        }
        self.access_times = []

    def create(self, agent_state):
        with self.lock:
            # Check if at capacity
            if len(self.sessions) >= self.max_sessions:
                self._cleanup_expired()
                if len(self.sessions) >= self.max_sessions:
                    self.stats["rejected"] += 1
                    raise RuntimeError("Session limit reached")
            
            sid = str(uuid.uuid4())[:8]
            self.sessions[sid] = {
                "state": agent_state,
                "created": time.time(),
                "last_accessed": time.time(),
                "access_count": 0
            }
            self.stats["created"] += 1
            return sid

    def get(self, session_id):
        with self.lock:
            entry = self.sessions.get(session_id)
            if not entry:
                return None
                
            if time.time() - entry["created"] > self.ttl:
                del self.sessions[session_id]
                self.stats["expired"] += 1
                return None
            
            # Update access info
            entry["last_accessed"] = time.time()
            entry["access_count"] += 1
            self.stats["accessed"] += 1
            
            # Track access times for metrics
            self.access_times.append(time.time())
            if len(self.access_times) > 1000:
                self.access_times = self.access_times[-1000:]
            
            return entry["state"]

    def _cleanup_expired(self):
        """Remove expired sessions"""
        now = time.time()
        expired = []
        
        for sid, entry in self.sessions.items():
            if now - entry["created"] > self.ttl:
                expired.append(sid)
        
        for sid in expired:
            del self.sessions[sid]
            self.stats["expired"] += 1
        
        return len(expired)

    def get_stats(self):
        """Return session statistics"""
        with self.lock:
            now = time.time()
            active = len(self.sessions)
            
            # Calculate average access rate
            recent = [t for t in self.access_times if now - t < 60]
            access_rate = len(recent) / 60.0  # accesses per second
            
            return {
                "active_sessions": active,
                "total_created": self.stats["created"],
                "total_accessed": self.stats["accessed"],
                "total_expired": self.stats["expired"],
                "total_rejected": self.stats["rejected"],
                "access_rate_per_second": round(access_rate, 2)
            }

# Usage
mgr = ProductionSessionManager(ttl=300, max_sessions=100)
sid = mgr.create({"phase": "idle", "messages": []})

# Simulate activity
for _ in range(10):
    state = mgr.get(sid)
    if state:
        state["messages"].append({"role": "user", "content": "test"})
        mgr.sessions[sid]["state"] = state

print(mgr.get_stats())
```

**What's happening in the code above:**

```
Line 1-5:       Import modules for concurrency and statistics
Line 8-12:      Initialize with TTL, max sessions, and lock
Line 14-19:     Statistics dictionary to track session metrics
Line 22-37:     create() with capacity check and cleanup
Line 24-27:     Check if at max capacity, cleanup if needed
Line 30-36:     Create session with access tracking
Line 39-55:     get() with access tracking and metrics
Line 44-48:     Check expiry, delete if expired
Line 51-54:     Update access count and timestamp
Line 57-59:     Track recent access times for rate calculation
Line 61-72:     _cleanup_expired() removes old sessions
Line 74-86:     get_stats() returns comprehensive metrics
Line 89-90:     Create manager with limits
Line 93-97:     Simulate activity to populate stats
Line 99:        Print statistics
```

---

### Common Mistakes and How to Fix Them

**Mistake 1: Storing Mutable Objects Directly**

```python
# BAD: Storing reference to mutable object
shared_list = []
session_state = {"items": shared_list}

shared_list.append("item")  # Modifies session state unexpectedly!

# BETTER: Store a copy
session_state = {"items": shared_list.copy()}

# OR: Use immutable types
session_state = {"items": tuple(shared_list)}
```

**Mistake 2: Not Handling Session Conflicts**

```python
# BAD: No conflict detection
def update_session_bad(session_id, new_state):
    sessions[session_id]["state"] = new_state  # Overwrites changes!

# BETTER: Detect conflicts
def update_session(session_id, new_state, expected_version):
    current = sessions.get(session_id)
    if current["version"] != expected_version:
        raise ConflictError("Session modified by another request")
    
    current["state"] = new_state
    current["version"] += 1
```

**Mistake 3: Storing Sensitive Data in Session**

```python
# BAD: Storing password in session
session = {"user_id": 123, "password": "secret123"}

# BETTER: Store only reference
session = {"user_id": 123, "auth_token": "abc123"}  # Token, not password
```

**Mistake 4: Not Validating Session IDs**

```python
# BAD: Using session ID directly without validation
def get_session_bad(session_id):
    return sessions.get(session_id)  # Could be malicious input!

# BETTER: Validate session ID format
import re
def get_session(session_id):
    if not re.match(r'^[a-f0-9]{8}$', session_id):
        return None  # Invalid format
    return sessions.get(session_id)
```

---

### Quick Reference Table

| Operation | Method | Notes |
|-----------|--------|-------|
| Create session | `create(initial_state)` | Returns session ID |
| Get session | `get(session_id)` | Returns state or None |
| Update session | `update(session_id, state)` | Use get-modify-update pattern |
| Delete session | `delete(session_id)` | Immediately removes |
| List active | `list_sessions()` | Returns list of IDs |
| Cleanup expired | `cleanup()` | Call periodically |

| Data Type | JSON Safe? | Fix |
|-----------|------------|-----|
| dict | Yes | - |
| list | Yes | - |
| tuple | Becomes array | Convert to list if needed |
| set | No | Convert to sorted list |
| int/float | Yes | - |
| str | Yes | - |
| bool | Yes | - |
| None | Yes | Becomes null |
| Custom object | No | Use `__dict__` or dataclass |

| Session Field | Purpose | TTL Behavior |
|---------------|---------|--------------|
| state | Agent conversation state | Expires with session |
| created_at | Creation timestamp | Fixed |
| last_accessed | Last access time | Resets on access |
| version | Conflict detection | Fixed |

---

### Summary

Stateless APIs need external session storage to maintain agent context across requests. Serialize state to JSON, store it with a Redis-like interface that supports TTL expiration, and keep conversation history within a limited context window. The session manager pattern ensures clean lifecycle management and prevents memory leaks from abandoned sessions. For production systems, use Redis with connection pooling, implement circuit breakers for resilience, and always validate session IDs to prevent security issues.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Trace the summarizing `ConversationManager`.** For the chapter's usage block (`max_turns=5`, `summary_threshold=10`, 15 user/assistant pairs = 30 `add_message` calls), answer:

(a) After which `add_message` call (1-based) does the first summarization happen, and what is `len(state["messages"])` right after it?
(b) How many summarizations happen in total?
(c) Final `len(state["messages"])`, `len(state["full_history"])`, and the printed `Context has N messages`.

**Q2. Token-budget context.** Using `count_tokens` (`int(words * 1.3)`) and `get_context_with_token_limit(state, max_tokens=10)` on these messages, oldest first, which messages are selected and what is the final `total_tokens`?

```python
messages = [
    {"role": "user", "content": "a b c d e"},
    {"role": "assistant", "content": "x y z"},
    {"role": "user", "content": "p q"},
    {"role": "assistant", "content": "one two three four"},
]
```

**Q3. JSON round trip.** What does this print?

```python
import json
original = {"coords": (40.7, -74.0), 1: "one", "ok": True, "n": None}
restored = json.loads(json.dumps(original))
print(restored)
print(restored == original)
```

**Q4. Which TTL?** `mgr = SessionManager(ttl=60)` (Section 5). Treat `time.time()` as a clock you control. Predict each result:

| t (s) | call | result? |
|-------|------|---------|
| 0 | `sid = mgr.create({"n": 0})` | — |
| 50 | `mgr.get(sid)` | ? |
| 61 | `mgr.get(sid)` | ? |

Now replay with an `update` at $t = 55$: `create` at 0, `get` at 50, `update(sid, {"n": 1})` at 55, `get` at 110, `get` at 116. What do the last two `get` calls return? How does this differ from the Section 1 `get_session`?

**Q5. Production stats.** For the `ProductionSessionManager` usage block (ttl 300, one session, the 10-iteration loop run instantly), what does `get_stats()` return? What are the session's `access_count` and `len(state["messages"])`?

### Coding Exercises

**E1 (Easy).** Write `trim_history(messages, max_turns)` that keeps the first message **if** its role is `"system"`, plus the last `max_turns` non-system messages.

- `[system "S", m0, m1, m2, m3, m4, m5]`, `max_turns=3` → `["S", "m3", "m4", "m5"]`
- `[m0, …, m5]` (no system), `max_turns=2` → `["m4", "m5"]`

**E2 (Easy–Medium).** Write `SlidingSessionStore(ttl, clock=time.time)` with `set(sid, state)`, `get(sid)` and `cleanup() -> int`. It stores JSON strings, `get` **refreshes** the timestamp on every successful read (a sliding window), and expiry happens when `now - last > ttl`. Inject `clock` so tests don't sleep.

- ttl 60. Set `"a"` and `"b"` at $t=0$. `get("a")` at $t=50$ returns `{"n": 1}`. At $t=100$, `get("a")` returns `{"n": 1}` and `cleanup()` returns `1` (only `"b"` expired). At $t=161$, `get("a")` returns `None`.

**E3 (Medium).** Improve `get_context_with_token_limit`: write `budgeted_context(messages, max_tokens) -> (selected, used)` that **always** keeps a leading system message, raises `ValueError` if that alone exceeds the budget, then fills the remaining budget newest-first. The result must stay in chronological order.

- System `"You are a pump expert"` (6 tokens) + the four Q2 messages, `max_tokens=12` → `["You are a pump expert", "one two three four"]`, `used == 11`

#### Dry-Run: Answers

**Q1.** (a) Calls 1–10 grow the list to 10. Call 11 (user `"Message 5"`) makes it 11 > 10, so `_summarize_old_messages` runs with `cutoff = 11 // 2 = 5`. It moves 5 messages to `full_history` and keeps `1 summary + 6 recent = **7**` messages.

(b) After that the list cycles `7 → 8 → 9 → 10 → 11 (summarize) → 7`, so a summarization fires on calls **11, 15, 19, 23 and 27**, for **5** in total.

(c) Calls 28, 29 and 30 bring the list from 7 to **10** messages. `full_history` has $5 \times 5 =$ **25** entries. `get_context` returns the last `max_turns`, so it prints **`Context has 5 messages`**.

| calls | len after |
|-------|-----------|
| 1–10 | 1 → 10 |
| 11 | 7 (summarized) |
| 12–14 | 8, 9, 10 |
| 15 | 7 (summarized) |
| … | … |
| 27 | 7 (summarized) |
| 28–30 | 8, 9, 10 |

A subtle loss: `_create_summary` only includes `user`/`assistant` roles. Each earlier `"system"` summary is therefore **dropped** from the next summary, and only `full_history` still has it.

**Q2.** Token counts are `[6, 3, 2, 5]` because `int(5*1.3)=6`, `int(3*1.3)=3`, `int(2*1.3)=2` and `int(4*1.3)=5`. Walking newest to oldest:

| msg | tokens | total before | total + t | action |
|-----|--------|--------------|-----------|--------|
| "one two three four" | 5 | 0 | 5 | insert |
| "p q" | 2 | 5 | 7 | insert |
| "x y z" | 3 | 7 | 10 (not > 10) | insert |
| "a b c d e" | 6 | 10 | 16 > 10 | break |

The selection is **`["x y z", "p q", "one two three four"]`** in chronological order thanks to `insert(0, …)`, with **`total_tokens = 10`**.

**Q3.**

```
{'coords': [40.7, -74.0], '1': 'one', 'ok': True, 'n': None}
False
```

The round trip makes three changes. The tuple becomes a JSON array, which loads back as a `list`. The **integer key `1` becomes the string `"1"`**, because JSON object keys are always strings. `True` → `true` → `True` and `None` → `null` → `None` survive. Because of the list and the string key, `restored != original`.

**Q4.** First run: at $t=50$, the elapsed time is $50 \le 60$, so `get` returns **`{"n": 0}`**. At $t=61$, the elapsed time is $61 > 60$, so the session is deleted and `get` returns **`None`**. `SessionManager.get` does **not** refresh the timer, so reading at $t=50$ does not keep the session alive.

Replay: `update` at 55 resets `created = 55`. At $t=110$ the elapsed time is $55 \le 60$, so `get` returns **`{"n": 1}`**. At $t=116$ it is $61 > 60$, so `get` returns **`None`**.

Section 1's `get_session` sets `last_accessed = time.time()` on every read, so a session read at $t=50$ there would live until $t=110$. Only `update()` slides the window in `SessionManager`.

**Q5.**

```python
{'active_sessions': 1, 'total_created': 1, 'total_accessed': 10,
 'total_expired': 0, 'total_rejected': 0, 'access_rate_per_second': 0.17}
```

`access_count == 10` and `len(messages) == 10`. All 10 accesses are within the last 60 s, so the rate is $10 / 60 \approx 0.1667$, which rounds to `0.17`. Nothing expires because ttl is 300.

**E1 — reference solution**

```python
def trim_history(messages, max_turns):
    system = [m for m in messages[:1] if m["role"] == "system"]
    rest = messages[len(system):]
    return system + (rest[-max_turns:] if max_turns > 0 else [])

h = [{"role": "system", "content": "S"}] + \
    [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(6)]
print([m["content"] for m in trim_history(h, 3)])       # ['S', 'm3', 'm4', 'm5']
print([m["content"] for m in trim_history(h[1:], 2)])   # ['m4', 'm5']
```

The `max_turns > 0` guard matters because `rest[-0:]` is the **whole** list. The function is $O(\text{max\_turns})$.

**E2 — reference solution**

```python
import json, time

class SlidingSessionStore:
    def __init__(self, ttl, clock=time.time):
        self.ttl, self.clock, self.store = ttl, clock, {}

    def set(self, sid, state):
        self.store[sid] = {"data": json.dumps(state), "last": self.clock()}

    def get(self, sid):
        entry = self.store.get(sid)
        if entry is None:
            return None
        now = self.clock()
        if now - entry["last"] > self.ttl:
            del self.store[sid]
            return None
        entry["last"] = now                      # sliding window refresh
        return json.loads(entry["data"])

    def cleanup(self):
        now = self.clock()
        dead = [s for s, e in self.store.items() if now - e["last"] > self.ttl]
        for s in dead:
            del self.store[s]
        return len(dead)

T = [0.0]
store = SlidingSessionStore(60, clock=lambda: T[0])
store.set("a", {"n": 1}); store.set("b", {"n": 2})
T[0] = 50;  print(store.get("a"))                     # {'n': 1}  ("a" refreshed to 50)
T[0] = 100; print(store.get("a"), store.cleanup())    # {'n': 1} 1  ("b": 100 > 60)
T[0] = 161; print(store.get("a"))                     # None  (161 - 100 = 61 > 60)
```

`get` and `set` are $O(1)$ and `cleanup` is $O(n)$. The dead ids are collected before deleting, so the dict is never modified while it is being iterated.

**E3 — reference solution**

```python
def count_tokens(text):
    return int(len(text.split()) * 1.3)

def budgeted_context(messages, max_tokens, count=count_tokens):
    system = messages[0] if messages and messages[0]["role"] == "system" else None
    rest = messages[1:] if system else messages
    used = count(system["content"]) if system else 0
    if used > max_tokens:
        raise ValueError("system prompt alone exceeds budget")
    picked = []
    for m in reversed(rest):                     # newest first
        t = count(m["content"])
        if used + t > max_tokens:
            break
        picked.append(m)
        used += t
    picked.reverse()                             # back to chronological order
    return ([system] if system else []) + picked, used

msgs = [{"role": "system", "content": "You are a pump expert"},
        {"role": "user", "content": "a b c d e"},
        {"role": "assistant", "content": "x y z"},
        {"role": "user", "content": "p q"},
        {"role": "assistant", "content": "one two three four"}]
ctx, used = budgeted_context(msgs, 12)
print([m["content"] for m in ctx], used)   # ['You are a pump expert', 'one two three four'] 11
```

Trace: the system prompt costs `int(5*1.3) = 6`. Adding "one two three four" (5) brings `used` to 11. Adding "p q" (2) would make 13 > 12, so the loop stops. `append` followed by one `reverse` is $O(n)$, unlike the $O(n^2)$ `insert(0, …)` pattern.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Session Management**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter7 session management**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

