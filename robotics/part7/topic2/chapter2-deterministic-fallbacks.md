# Part 7, Topic 2: Physics-First Rule Engines
## Chapter 2: Deterministic Fallbacks

**Prerequisite Knowledge:** Basic Python dictionary usage, understanding of functions and basic conditional logic (`if`/`else`).

---

### The "Bowling Bumpers" Analogy

Imagine taking a small child bowling. They might throw the ball too softly, backwards, or straight into the gutter. AI can sometimes act like that child, making unpredictable or bad recommendations. Deterministic fallbacks are like the inflatable bumpers you put in the gutters. Even if the bowler (the AI) makes a terrible throw, the bumpers (hardcoded rules) physically prevent the ball from going in the gutter, gently guiding it safely down the lane.

```
    WITHOUT BUMPERS (AI only)          WITH BUMPERS (Deterministic Fallbacks)
    ┌─────────────────────┐           ┌─────────────────────┐
    │      GUTTER         │           │ ╔═══╗   GUTTER   ╔═══╗│
    │  ← AI ball ───────  │           │ ║   ║ ← AI ball ║   ║│
    │      LOST!          │           │ ║   ╚════════════╝   ║│
    └─────────────────────┘           │ ║   SAFE LANE       ║│
                                      │ ╚═══════════════════╝│
                                      └─────────────────────┘
```

AI recommendations are probabilistic. Physical systems are deterministic. When an LLM suggests a motor speed that would melt the bearings, you do not need a second opinion — you need a hard rule that overrides the AI. Deterministic fallbacks are the safety net that catches every AI mistake.

---

### 1. The Fallback Chain

A fallback chain tries the AI recommendation first, then applies hard rules, then falls back to a safe default if everything else fails.

```python
from typing import Any

class FallbackChain:
    def __init__(self):
        # We store our sequence of rules here
        self.steps = []

    def add_step(self, name: str, func):
        # Add a new rule to our chain
        self.steps.append((name, func))
        return self

    def evaluate(self, context: dict) -> dict:
        # Step 1: Go through each rule in order
        for name, func in self.steps:
            # Step 2: Ask the rule to evaluate the situation
            result = func(context)
            # Step 3: If a rule gives an answer, accept it immediately and stop looking
            if result is not None:
                return {"source": name, "value": result}

        # Step 4: If NO rules gave an answer, use our ultimate safe default
        return {"source": "safe_default", "value": None}

# Create the chain
chain = FallbackChain()

# Add rules from highest priority (AI) to lowest priority (safe defaults)
chain.add_step("ai_recommendation", lambda ctx: ctx.get("ai_suggestion"))
chain.add_step("physics_rule", lambda ctx: min(ctx.get("ai_suggestion", 100), ctx.get("max_safe", 100)))
chain.add_step("safe_default", lambda ctx: 50)

# Test different scenarios
context1 = {"ai_suggestion": 80, "max_safe": 100}
context2 = {"ai_suggestion": 500, "max_safe": 100}
context3 = {}

for ctx in [context1, context2, context3]:
    result = chain.evaluate(ctx)
    print(f"Context {ctx} -> {result}")
```

**What's happening:**
```python
chain.add_step("ai_recommendation", lambda ctx: ctx.get("ai_suggestion"))
#              ^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#              |                    └── Lambda: returns ai_suggestion if present
#              └── Name for audit logging
#
# chain.add_step("physics_rule", lambda ctx: min(ctx.get("ai_suggestion", 100), ctx.get("max_safe", 100)))
#                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                                  └── Clamps AI value to max_safe
#                                      If AI suggests 500 but max is 100 → returns 100
#
# chain.add_step("safe_default", lambda ctx: 50)
#                                 ^^^^^^^^^^^^
#                                 └── Always returns 50 (last resort)
```

Output:
```
Context {'ai_suggestion': 80, 'max_safe': 100} -> {'source': 'ai_recommendation', 'value': 80}
Context {'ai_suggestion': 500, 'max_safe': 100} -> {'source': 'ai_recommendation', 'value': 500}
Context {} -> {'source': 'physics_rule', 'value': 100}
```

Notice the flaw this exposes: because the first non-`None` answer wins and the AI step runs first, the unsafe 500 is accepted unclipped, and with no AI output the physics step (`min(100, 100)`) answers before the safe default is ever reached. For the physics rule to clip the AI recommendation to the safe maximum, it must run before (or wrap) the AI step — which is exactly why the hierarchy in Section 4 puts physics rules first.

### Why the Chain Order Matters

```
    PRIORITY ORDER (highest to lowest):
    ┌──────────────────────────────────────┐
    │  1. AI Recommendation               │  ← Best effort, most creative
    │  2. Physics Rule (clamping)          │  ← Hard limit, clips values
    │  3. Safety Rule (rejection)          │  ← Blocks dangerous combos
    │  4. Safe Default                     │  ← Last resort, guaranteed safe
    └──────────────────────────────────────┘
```

---

### 2. Hard Rules Override AI

When a rule fires, it replaces the AI recommendation entirely. The AI does not get a second chance.

```python
class ThermalLimitRule:
    def __init__(self, max_temp: float):
        self.max_temp = max_temp

    def apply(self, command: dict) -> dict:
        # Step 1: Check if the commanded temperature is dangerously high
        if command.get("temperature", 0) > self.max_temp:
            # Step 2: Override the command and clamp it to the safe limit
            return {
                "status": "overridden",
                "original": command["temperature"],
                "clamped_to": self.max_temp,
                "reason": f"Temperature {command['temperature']}C exceeds limit {self.max_temp}C"
            }

        # Step 3: If it's safe, let the original command pass
        return {"status": "passed", "value": command["temperature"]}

# Set a hard limit of 150 degrees
rule = ThermalLimitRule(max_temp=150.0)

# Simulate some AI commands
commands = [
    {"temperature": 120.0},  # Safe
    {"temperature": 200.0},  # Dangerous!
    {"temperature": 150.0},  # Exactly at the limit
]

for cmd in commands:
    result = rule.apply(cmd)
    print(f"Temp {cmd['temperature']}C: {result['status']}" +
          (f" -> {result.get('clamped_to')}C" if result['status'] == 'overridden' else ""))
```

**What's happening:**
```python
class ThermalLimitRule:
    def __init__(self, max_temp: float):
        self.max_temp = max_temp
        # ^^^^^^^^^^^^^^^^^^^^^^
        # The limit is configured once, not learned from data
        # This is what makes it DETERMINISTIC — it never changes

    def apply(self, command: dict) -> dict:
        if command.get("temperature", 0) > self.max_temp:
            return {"status": "overridden", ...}  # AI is overridden
        return {"status": "passed", "value": ...}  # AI is accepted
        #          ^^^^^^
        #          The status tells the audit log what happened
```

Output:
```
Temp 120.0C: passed
Temp 200.0C: overridden -> 150.0C
Temp 150.0C: passed
```

---

### 3. Audit Logging for Every Decision

Every decision — accepted, overridden, or rejected — must be logged with the reason. This is non-negotiable in safety-critical systems.

```python
from datetime import datetime, timezone

class AuditLogger:
    def __init__(self):
        self.log = []

    def record(self, decision: str, source: str, detail: str):
        # Step 1: Create a permanent record of what happened and why
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "source": source,
            "detail": detail
        }
        # Step 2: Save it to our log
        self.log.append(entry)
        return entry

logger = AuditLogger()

# Log various events as they happen
logger.record("accepted", "ai", "Temperature 80C within limits")
logger.record("overridden", "physics_rule", "Temperature 200C clamped to 150C")
logger.record("rejected", "safety_rule", "Negative pressure detected")

for entry in logger.log:
    print(f"[{entry['decision'].upper()}] via {entry['source']}: {entry['detail']}")
```

**What's happening:**
```python
entry = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    #          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #          |  └── UTC timestamp (never local time!)
    #          └── When the decision was made
    "decision": decision,
    #           ^^^^^^^^^
    #           |  "accepted"    = AI recommendation used as-is
    #           |  "overridden"  = AI value was clamped/modified
    #           |  "rejected"    = AI recommendation blocked entirely
    "source": source,
    #         ^^^^^^
    #         |  Who made the decision: "ai", "physics", "safety", "default"
    "detail": detail
    #         ^^^^^^
    #         |  Human-readable explanation for debugging
}
```

Output:
```
[ACCEPTED] via ai: Temperature 80C within limits
[OVERRIDDEN] via physics_rule: Temperature 200C clamped to 150C
[REJECTED] via safety_rule: Negative pressure detected
```

---

### 4. The Decision Hierarchy

The hierarchy is fixed: physics rules > safety rules > AI recommendation. AI is the lowest priority.

```python
class RuleEngine:
    def __init__(self):
        self.physics_rules = []
        self.safety_rules = []

    def add_physics_rule(self, rule):
        self.physics_rules.append(rule)
        return self

    def add_safety_rule(self, rule):
        self.safety_rules.append(rule)
        return self

    def evaluate(self, command: dict) -> dict:
        # Step 1: ALWAYS check the immutable physics rules first.
        # Physics cannot be negotiated with.
        for rule in self.physics_rules:
            result = rule(command)
            if result.get("status") in ("overridden", "rejected"):
                return {"decision": result["status"], "source": "physics", "detail": result.get("reason", "")}

        # Step 2: Next, check safety rules (e.g., equipment warnings)
        for rule in self.safety_rules:
            result = rule(command)
            if result.get("status") == "rejected":
                return {"decision": "rejected", "source": "safety", "detail": result.get("reason", "")}

        # Step 3: If all hard rules pass, we accept the AI's idea
        return {"decision": "accepted", "source": "ai", "detail": "All rules passed"}

engine = RuleEngine()

# Add a physics rule: Cannot exceed 150 temp
engine.add_physics_rule(lambda cmd: {"status": "overridden", "reason": "Temp capped"} if cmd.get("temperature", 0) > 150 else {"status": "passed"})

# Add a physics rule: Cannot have negative pressure
engine.add_physics_rule(lambda cmd: {"status": "rejected", "reason": "Negative pressure"} if cmd.get("pressure", 1) < 0 else {"status": "passed"})

# Add a safety rule: Humidity shouldn't be above 95%
engine.add_safety_rule(lambda cmd: {"status": "rejected", "reason": "Humidity too high"} if cmd.get("humidity", 0) > 95 else {"status": "passed"})

commands = [
    {"temperature": 80, "pressure": 14.7, "humidity": 55},   # Good
    {"temperature": 200, "pressure": 14.7, "humidity": 55},  # Fails temp physics rule
    {"temperature": 25, "pressure": -1, "humidity": 55},     # Fails pressure physics rule
    {"temperature": 25, "pressure": 14.7, "humidity": 99},   # Fails humidity safety rule
]

for cmd in commands:
    result = engine.evaluate(cmd)
    print(f"T={cmd['temperature']} P={cmd['pressure']} H={cmd['humidity']} -> {result['decision']} ({result['source']})")
```

**What's happening:**
```python
def evaluate(self, command: dict) -> dict:
    # Layer 1: Physics rules (immutable, highest priority)
    for rule in self.physics_rules:
        result = rule(command)
        if result.get("status") in ("overridden", "rejected"):
            return {"decision": result["status"], "source": "physics"}
            #         ^^^^^^^^^^^^^^^^            ^^^^^^^^^^^^^
            #         |                           └── Logged as "physics" source
            #         └── overridden or rejected

    # Layer 2: Safety rules (can reject, but not override)
    for rule in self.safety_rules:
        result = rule(command)
        if result.get("status") == "rejected":
            return {"decision": "rejected", "source": "safety"}

    # Layer 3: AI acceptance (only if all rules pass)
    return {"decision": "accepted", "source": "ai"}
```

Output:
```
T=80 P=14.7 H=55 -> accepted (ai)
T=200 P=14.7 H=55 -> overridden (physics)
T=25 P=-1 H=55 -> rejected (physics)
T=25 P=14.7 H=99 -> rejected (safety)
```

Physics rules always fire first. Safety rules catch what physics misses. AI only gets through if all rules pass.

### Decision Hierarchy Diagram

```
    ┌─────────────────────────────────────────────────┐
    │           DECISION HIERARCHY                     │
    │                                                  │
    │  ┌─────────────────────────────────────────┐    │
    │  │ LAYER 1: Physics Rules (HIGHEST)        │    │
    │  │   • Thermodynamic limits                │    │
    │  │   • Material constraints                │    │
    │  │   • Can OVERRIDE or REJECT              │    │
    │  └─────────────────────┬───────────────────┘    │
    │                        ↓ all pass                │
    │  ┌─────────────────────────────────────────┐    │
    │  │ LAYER 2: Safety Rules                   │    │
    │  │   • Equipment ratings                   │    │
    │  │   • Operational warnings                │    │
    │  │   • Can only REJECT (not override)      │    │
    │  └─────────────────────┬───────────────────┘    │
    │                        ↓ all pass                │
    │  ┌─────────────────────────────────────────┐    │
    │  │ LAYER 3: AI Recommendation (LOWEST)     │    │
    │  │   • Creative suggestions                │    │
    │  │   • Optimization ideas                  │    │
    │  │   • Only used if no rule blocked it     │    │
    │  └─────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────┘
```

---

### 5. Thermal Limits as Hard Constraints

A complete thermal limit system that rejects or modifies AI commands based on equipment-specific limits.

```python
class ThermalGuard:
    def __init__(self, limits: dict):
        self.limits = limits
        self.decisions = []

    def check(self, equipment_type: str, command: dict) -> dict:
        # Step 1: Reject if we don't recognize the equipment (and audit that too)
        if equipment_type not in self.limits:
            decision = {"decision": "rejected", "reason": f"Unknown equipment: {equipment_type}"}
            decision["equipment"] = equipment_type
            self.decisions.append(decision)
            return decision

        equip_limits = self.limits[equipment_type]
        temp = command.get("temperature")

        # Step 2: Enforce Maximum limit
        if temp is not None and temp > equip_limits["max_temp"]:
            decision = {
                "decision": "overridden",
                "original_temp": temp,
                "clamped_to": equip_limits["max_temp"],
                "reason": f"{equipment_type} max temp is {equip_limits['max_temp']}C"
            }

        # Step 3: Enforce Minimum limit
        elif temp is not None and temp < equip_limits["min_temp"]:
            decision = {
                "decision": "rejected",
                "reason": f"{equipment_type} min temp is {equip_limits['min_temp']}C"
            }

        # Step 4: Accept if within limits
        else:
            decision = {"decision": "accepted", "reason": "Within limits"}

        # Step 5: Save an audit log of this decision
        decision["equipment"] = equipment_type
        self.decisions.append(decision)
        return decision

# Configure limits for different machines
guard = ThermalGuard({
    "oven": {"min_temp": 100, "max_temp": 500},
    "freezer": {"min_temp": -40, "max_temp": 0},
    "server_rack": {"min_temp": 10, "max_temp": 45},
})

commands = [
    ("oven", {"temperature": 200}),       # Safe
    ("oven", {"temperature": 600}),       # Too hot
    ("freezer", {"temperature": -10}),    # Safe
    ("server_rack", {"temperature": 50}), # Too hot
    ("unknown", {"temperature": 25}),     # Unknown machine
]

for equip, cmd in commands:
    result = guard.check(equip, cmd)
    print(f"{equip}: {result['decision']} — {result['reason']}")
```

**What's happening:**
```python
guard = ThermalGuard({
    "oven": {"min_temp": 100, "max_temp": 500},
    #        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #        |  Each equipment type has its OWN limits
    #        |  This is configured once, not learned
    #        └── Oven must stay between 100C and 500C

    "freezer": {"min_temp": -40, "max_temp": 0},
    #           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #           └── Freezer must stay between -40C and 0C

    "server_rack": {"min_temp": 10, "max_temp": 45},
    #               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #               └── Server rack must stay between 10C and 45C
})
```

Output:
```
oven: accepted — Within limits
oven: overridden — oven max temp is 500C
freezer: accepted — Within limits
server_rack: overridden — server_rack max temp is 45C
unknown: rejected — Unknown equipment: unknown
```

### Equipment Limit Configuration Pattern

```python
# Real-world factory configuration
FACTORY_LIMITS = {
    "injection_molder": {"min_temp": 180, "max_temp": 300, "max_pressure": 30000},
    "cooling_tower": {"min_temp": 5, "max_temp": 50, "max_vibration": 0.5},
    "compressor": {"min_temp": -20, "max_temp": 80, "min_oil_pressure": 20},
}
# Each equipment type is a self-contained configuration
# Adding new equipment = adding a new key to the dictionary
```

---

### Quick Reference

| Concept | Description | Example |
|---------|-------------|---------|
| Fallback Chain | Ordered sequence of rules | AI → physics → safety → default |
| Hard Override | AI value is clamped to limit | `min(ai_value, max_safe)` |
| Hard Reject | AI value is blocked entirely | `if value > limit: reject` |
| Audit Log | Record every decision | timestamp + source + reason + detail |
| Physics Rules | Immutable, highest priority | Thermodynamic limits, material bounds |
| Safety Rules | Can reject, lower priority | Equipment ratings, operational warnings |
| Equipment Limits | Per-machine configuration | `{"oven": {"min": 100, "max": 500}}` |

---

### Summary

Deterministic fallbacks enforce hard limits that AI cannot override. The decision hierarchy places physics rules above safety rules above AI recommendations. Audit logging records every decision for traceability. Equipment-specific limits are configured once and applied consistently. This ensures that no LLM hallucination can cause physical harm. The pattern is: AI suggests, rules check, safe default catches — in that order, every time.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Trace the FallbackChain exactly as written.** Using the chapter's `chain` (steps: `ai_recommendation`, then `physics_rule`, then `safe_default`), what does `chain.evaluate(ctx)` return for each context? Why does the first one *not* get clamped?

```python
chain.evaluate({"ai_suggestion": 500, "max_safe": 100})   # (a)
chain.evaluate({"max_safe": 30})                          # (b)
chain.evaluate({"ai_suggestion": 0})                      # (c)
```

**Q2. ThermalLimitRule edge cases.** With `rule = ThermalLimitRule(max_temp=150.0)`, what does each call return or raise?

```python
rule.apply({"temperature": 150.01})   # (a)
rule.apply({})                        # (b)
```

**Q3. Hierarchy short-circuit.** Using the chapter's `engine` (temperature cap, negative-pressure physics rules, humidity safety rule), what is `engine.evaluate(cmd)["decision"]` and `["source"]` for each command?

```python
{"temperature": 200, "pressure": -1, "humidity": 99}   # (a)
{"temperature": 150, "humidity": 95}                  # (b)
{"humidity": 96}                                      # (c)
```

**Q4. ThermalGuard trace.** Using the chapter's `guard` (oven $[100, 500]$, freezer $[-40, 0]$, server_rack $[10, 45]$), fill in the `decision` for each call. After running only these five calls on a fresh guard, what is `len(guard.decisions)`?

| Call | Decision |
|---|---|
| `check("freezer", {"temperature": -10})` | ? |
| `check("freezer", {"temperature": -50})` | ? |
| `check("oven", {"temperature": 100})` | ? |
| `check("server_rack", {})` | ? |
| `check("Oven", {"temperature": 200})` | ? |

### Coding Exercises

**E1 (Easy).** Rewrite the fallback logic as a single function `safe_setpoint(ctx: dict, default: float = 50.0) -> dict` that actually enforces the limit. Use the safe default if there is no AI suggestion, clamp to `max_safe` (default 100) if the AI exceeds it, and otherwise accept the AI value. Return `{"source": ..., "value": ...}`.

- `{"ai_suggestion": 500, "max_safe": 100}` → `{'source': 'physics_rule', 'value': 100}`
- `{}` → `{'source': 'safe_default', 'value': 50.0}`
- `{"ai_suggestion": 0, "max_safe": 30}` → `{'source': 'ai_recommendation', 'value': 0}`

**E2 (Easy–Medium).** Write `RateOfChangeRule(max_rate)` with `apply(current: float, target: float, dt: float) -> dict`. If $\lvert \text{target} - \text{current} \rvert \le \text{max\_rate} \cdot dt$, pass the target through. Otherwise override it to `current` $\pm$ `max_rate * dt`, moving in the direction of the target. Reject when $dt \le 0$.

- `RateOfChangeRule(10.0).apply(100.0, 200.0, 2.0)` → `status='overridden'`, `clamped_to=120.0`
- `RateOfChangeRule(10.0).apply(100.0, 40.0, 2.0)` → `status='overridden'`, `clamped_to=80.0`
- `RateOfChangeRule(10.0).apply(100.0, 90.0, 2.0)` → `{'status': 'passed', 'value': 90.0}`

**E3 (Medium).** Write `AuditedRuleEngine`, a `RuleEngine` that:
1. appends every decision, plus the original command, to `self.log`;
2. treats any exception raised by a rule as `{"decision": "rejected", "source": "engine_error", "detail": "<ExcName>: <msg>"}`, so the engine itself never crashes;
3. has `summary() -> dict[str, int]`, which counts decisions.

Register the chapter's three rules and feed it the chapter's four commands plus `{"temperature": "hot"}`. Then `summary()` → `{'accepted': 1, 'overridden': 1, 'rejected': 3}`.

#### Dry-Run: Answers

**Q1.**

| Context | Step 1 `ai_recommendation` | Step 2 `physics_rule` | Returned |
|---|---|---|---|
| (a) | `500` is not `None`, so stop here | (never runs) | `{'source': 'ai_recommendation', 'value': 500}` |
| (b) | `ctx.get("ai_suggestion")` is `None`, so continue | `min(100, 30) = 30` | `{'source': 'physics_rule', 'value': 30}` |
| (c) | `0` is not `None`, so stop here | (never runs) | `{'source': 'ai_recommendation', 'value': 0}` |

The chain accepts the **first non-`None`** answer. Because the AI step is first and returns any value it has, the physics clamp only runs when the AI said nothing. That is why (a) returns the unsafe `500`, exactly as in the chapter's printed output. To make the clamp bind, the AI step must itself return `None` when the value is unsafe, or the clamp must wrap the AI value (see E1). (c) shows why the chain tests `is not None` rather than truthiness: `0` is a legitimate setpoint.

**Q2.**
(a) `{'status': 'overridden', 'original': 150.01, 'clamped_to': 150.0, 'reason': 'Temperature 150.01C exceeds limit 150.0C'}`. Any value strictly above the limit is overridden.
(b) raises `KeyError: 'temperature'`. The guard `command.get("temperature", 0) > 150` is `0 > 150`, which is False. Execution then falls to the pass branch, which reads `command["temperature"]` with square brackets. A missing field should be an explicit rejection, not a crash.

**Q3.**

| Cmd | First rule that fires | `decision` | `source` |
|---|---|---|---|
| (a) | physics rule 1: $200 > 150$ | `overridden` | `physics` |
| (b) | none: $150 > 150$ is False, pressure defaults to 1, $95 > 95$ is False | `accepted` | `ai` |
| (c) | safety rule: $96 > 95$ | `rejected` | `safety` |

In (a) the command violates all three rules, but only the first match is reported. The engine returns as soon as any physics rule fires.

**Q4.**

| Call | Decision | Why |
|---|---|---|
| freezer, -10 | `accepted` | $-40 \le -10 \le 0$ |
| freezer, -50 | `rejected` | $-50 < -40$, so the message is `freezer min temp is -40C` |
| oven, 100 | `accepted` | both checks are strict (`>` max, `<` min), so the boundary 100 passes |
| server_rack, `{}` | `accepted` | `temp is None`, so both branches are skipped and it falls to `else`. A missing reading slips through. |
| `"Oven"` | `rejected` | `Unknown equipment: Oven`. Dictionary lookup is case-sensitive. |

`len(guard.decisions) == 5`. Every path appends to the audit log, including the unknown-equipment rejection, which logs its decision before its early `return`. A common mistake is to write that branch as a bare `return {"decision": "rejected", ...}`: the rejection still reaches the caller, but it never lands in `self.decisions`, so the audit trail would show only 4 entries.

**E1 — reference solution**

```python
def safe_setpoint(ctx: dict, default: float = 50.0) -> dict:
    ai = ctx.get("ai_suggestion")
    max_safe = ctx.get("max_safe", 100)
    if ai is None:                       # no AI output: last resort
        return {"source": "safe_default", "value": default}
    if ai > max_safe:                    # the hard rule wins over the AI
        return {"source": "physics_rule", "value": max_safe}
    return {"source": "ai_recommendation", "value": ai}
```

$O(1)$. The checks are ordered by **authority** (does input exist, is it physically allowed), not by "who answers first", so an AI value can never bypass the clamp.

**E2 — reference solution**

```python
class RateOfChangeRule:
    def __init__(self, max_rate: float):
        self.max_rate = max_rate                     # e.g. degrees C per second

    def apply(self, current: float, target: float, dt: float) -> dict:
        if dt <= 0:
            return {"status": "rejected", "reason": f"dt must be positive, got {dt}"}
        max_step = self.max_rate * dt
        delta = target - current
        if abs(delta) <= max_step:
            return {"status": "passed", "value": target}
        clamped = current + max_step if delta > 0 else current - max_step
        return {"status": "overridden", "original": target, "clamped_to": clamped,
                "reason": f"rate {abs(delta) / dt} C/s exceeds {self.max_rate} C/s"}
```

For $100 \to 200$ over 2 s: the allowed step is $10 \cdot 2 = 20$ and the requested step is $100$, so it is clamped to $100 + 20 = 120$. For $100 \to 40$: $\lvert -60 \rvert > 20$, so it is clamped to $100 - 20 = 80$. For $100 \to 90$: $10 \le 20$, so it passes. $O(1)$.

**E3 — reference solution**

```python
from collections import Counter

class AuditedRuleEngine:
    def __init__(self):
        self.physics_rules = []
        self.safety_rules = []
        self.log: list[dict] = []

    def add_physics_rule(self, rule):
        self.physics_rules.append(rule)
        return self

    def add_safety_rule(self, rule):
        self.safety_rules.append(rule)
        return self

    def _decide(self, command: dict) -> dict:
        for rule in self.physics_rules:
            result = rule(command)
            if result.get("status") in ("overridden", "rejected"):
                return {"decision": result["status"], "source": "physics", "detail": result.get("reason", "")}
        for rule in self.safety_rules:
            result = rule(command)
            if result.get("status") == "rejected":
                return {"decision": "rejected", "source": "safety", "detail": result.get("reason", "")}
        return {"decision": "accepted", "source": "ai", "detail": "All rules passed"}

    def evaluate(self, command: dict) -> dict:
        try:
            decision = self._decide(command)
        except Exception as e:                       # fail closed, never crash
            decision = {"decision": "rejected", "source": "engine_error",
                        "detail": f"{type(e).__name__}: {e}"}
        self.log.append({**decision, "command": command})   # every path is audited
        return decision

    def summary(self) -> dict[str, int]:
        return dict(Counter(entry["decision"] for entry in self.log))
```

The four chapter commands give accepted, overridden, rejected (physics) and rejected (safety). `{"temperature": "hot"}` makes `"hot" > 150` raise `TypeError`, which becomes a third `rejected`. The total is `{'accepted': 1, 'overridden': 1, 'rejected': 3}`. Each evaluation costs $O(R)$ for $R$ rules. Failing *closed* (rejecting) on an internal error is the deterministic-fallback principle applied to the engine itself.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Deterministic Fallbacks**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 deterministic fallbacks**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

