# Part 2, Topic 2: Physics-First Rule Engines
## Project 1: Thermal Guardrail

AI-generated commands must respect physical thermal limits. This project builds a rule engine that validates, rejects, or modifies API commands based on equipment-specific thermal constraints.

### Goal

You will demonstrate that you can define thermal limits for equipment types, build a rule engine that validates AI-generated commands, reject or modify unsafe commands, and log every decision with a reason.

### Requirements

#### 1. Define Thermal Limits for Equipment Types

Create a configuration that maps equipment types to their thermal limits.

```python
THERMAL_LIMITS = {
    "industrial_oven": {
        "min_temp_c": 100.0,
        "max_temp_c": 550.0,
        "max_ramp_rate_c_per_min": 10.0,
        "requires_cooldown_above_c": 400.0,
    },
    "server_rack": {
        "min_temp_c": 10.0,
        "max_temp_c": 45.0,
        "max_ramp_rate_c_per_min": 2.0,
        "requires_cooling_above_c": 35.0,
    },
    "cryogenic_chamber": {
        "min_temp_c": -196.0,
        "max_temp_c": -150.0,
        "max_ramp_rate_c_per_min": 1.0,
        "requires_monitoring_below_c": -180.0,
    },
}
```

#### 2. Build the ThermalGuardrail Class

Create a class that accepts commands as dicts and validates them against the limits.

```python
from datetime import datetime, timezone

class ThermalGuardrail:
    def __init__(self, limits: dict):
        self.limits = limits
        self.decision_log = []

    def validate(self, command: dict) -> dict:
        equipment = command.get("equipment_type")
        if equipment not in self.limits:
            return self._log_decision("rejected", equipment, command, "Unknown equipment type")

        limits = self.limits[equipment]
        temp = command.get("target_temperature")
        if temp is None:
            return self._log_decision("rejected", equipment, command, "Missing target_temperature")

        if temp < limits["min_temp_c"]:
            return self._log_decision("rejected", equipment, command,
                f"Temperature {temp}C below minimum {limits['min_temp_c']}C")
        if temp > limits["max_temp_c"]:
            clamped = limits["max_temp_c"]
            modified = {**command, "target_temperature": clamped}
            return self._log_decision("overridden", equipment, command,
                f"Temperature {temp}C exceeds max {limits['max_temp_c']}C, clamped",
                modified_command=modified)

        return self._log_decision("accepted", equipment, command, "Within limits")

    def _log_decision(self, decision, equipment, command, reason, modified_command=None):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "equipment": equipment,
            "original_command": command,
            "reason": reason,
        }
        if modified_command:
            entry["modified_command"] = modified_command
        self.decision_log.append(entry)
        return entry
```

#### 3. Process a Batch of Commands

Test the guardrail with a mix of valid, unsafe, and edge-case commands.

```python
guardrail = ThermalGuardrail(THERMAL_LIMITS)

commands = [
    {"equipment_type": "industrial_oven", "target_temperature": 300.0},
    {"equipment_type": "industrial_oven", "target_temperature": 700.0},
    {"equipment_type": "server_rack", "target_temperature": 40.0},
    {"equipment_type": "server_rack", "target_temperature": 80.0},
    {"equipment_type": "cryogenic_chamber", "target_temperature": -170.0},
    {"equipment_type": "cryogenic_chamber", "target_temperature": -100.0},
    {"equipment_type": "industrial_oven", "target_temperature": 50.0},
    {"equipment_type": "unknown_device", "target_temperature": 25.0},
    {"equipment_type": "server_rack"},
    {"equipment_type": "industrial_oven", "target_temperature": 550.0},
]

for cmd in commands:
    result = guardrail.validate(cmd)
    decision = result["decision"]
    equip = result["equipment"]
    reason = result["reason"]
    print(f"[{decision.upper()}] {equip}: {reason}")
```

#### 4. Inspect the Decision Log

The decision log provides a full audit trail for debugging and compliance.

```python
print(f"\nTotal decisions: {len(guardrail.decision_log)}")
for entry in guardrail.decision_log:
    print(f"  {entry['decision']:10s} | {entry['equipment']:20s} | {entry['reason']}")
```

### Evaluation Checklist

- [ ] THERMAL_LIMITS defines at least 3 equipment types with min/max temps and ramp rates
- [ ] ThermalGuardrail validates temperature against equipment-specific limits
- [ ] Commands below minimum temperature are rejected
- [ ] Commands above maximum temperature are overridden (clamped) not just rejected
- [ ] Unknown equipment types are rejected
- [ ] Missing target_temperature is rejected
- [ ] Every decision includes timestamp, decision type, equipment, command, and reason
- [ ] Modified commands are returned for overridden decisions
- [ ] 10+ test commands cover valid, unsafe, and edge cases
- [ ] Decision log provides a complete audit trail

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Thermal Guardrail**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project thermal guardrail**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

