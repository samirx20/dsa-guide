# Part 7, Topic 2: Physics-First Rule Engines
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

### Starter Code Skeleton

Requirement 2 puts every check inside one `validate` method. That works for three checks, but it gets hard to follow once you add ramp rates and advisory flags. The skeleton keeps the exact public API (`validate(command) -> dict` and `decision_log`) and moves each physical check into a small **rule function**. The rules are evaluated in a fixed order, following the Chapter 2 decision hierarchy. A rejection stops the chain. A modification is passed on to the next rule.

$$\text{command} \xrightarrow{\text{type}} \xrightarrow{\text{min}} \xrightarrow{\text{max (clamp)}} \xrightarrow{\text{ramp } |\Delta T|/\Delta t \le r_{\max}} \text{decision} + \text{flags}$$

```text
thermal-guardrail/
├── pyproject.toml
├── limits.py           # THERMAL_LIMITS (Requirement 1, unchanged) + EquipmentLimits alias
├── rules.py            # RuleResult + one function per physical rule + advisory_flags
├── guardrail.py        # ThermalGuardrail: rule chain, fail-closed, audit log, export
├── interceptor.py      # Chapter 1 sandwich: @guarded(guardrail) around the controller call
├── run_batch.py        # Requirement 3 + 4, plus extra edge cases
└── tests/
    └── test_guardrail.py
```

```toml
# pyproject.toml -- standard library only at runtime
[project]
name = "thermal-guardrail"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8.0"]
```

```python
# limits.py
EquipmentLimits = dict[str, float]

THERMAL_LIMITS: dict[str, EquipmentLimits] = {
    # ... paste the Requirement 1 dictionary here, unchanged ...
}
```

```python
# rules.py
import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Literal

from limits import EquipmentLimits

Command = dict[str, Any]
Verdict = Literal["pass", "reject", "modify"]


@dataclass(frozen=True)
class RuleResult:
    verdict: Verdict
    reason: str = ""
    command: Command | None = None  # only for "modify"


PASS = RuleResult("pass")
Rule = Callable[[Command, EquipmentLimits], RuleResult]


def rule_numeric_target(cmd: Command, limits: EquipmentLimits) -> RuleResult:
    t = cmd["target_temperature"]
    if isinstance(t, bool) or not isinstance(t, (int, float)) or not math.isfinite(t):
        return RuleResult("reject", f"target_temperature must be a finite number, got {t!r}")
    return PASS


def rule_min_temp(cmd: Command, limits: EquipmentLimits) -> RuleResult:
    # TODO(milestone 2): reject with f"Temperature {t}C below minimum {limits['min_temp_c']}C"
    raise NotImplementedError


def rule_max_temp_clamp(cmd: Command, limits: EquipmentLimits) -> RuleResult:
    # TODO(milestone 2): "modify" to max_temp_c with f"Temperature {t}C exceeds max {max}C, clamped"
    raise NotImplementedError


def rule_ramp_rate(cmd: Command, limits: EquipmentLimits) -> RuleResult:
    """Only applies when 'current_temperature' is present. duration_min defaults to 1.0."""
    # TODO(milestone 3): reject duration_min <= 0; if |target - current| / dt > max_ramp_rate_c_per_min,
    #                    modify target to current + copysign(max_rate * dt, target - current)
    raise NotImplementedError


# Physics first: type -> floor -> ceiling -> rate. A rejection stops the chain.
RULES: list[Rule] = [rule_numeric_target, rule_min_temp, rule_max_temp_clamp, rule_ramp_rate]


def advisory_flags(target: float, limits: EquipmentLimits) -> list[str]:
    """requires_<name>_above_c / requires_<name>_below_c  ->  '<name>_required' when crossed."""
    # TODO(milestone 4): key.removeprefix("requires_").rsplit("_", 2) -> (name, direction, unit)
    raise NotImplementedError
```

```python
# guardrail.py
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from limits import EquipmentLimits
from rules import RULES, Command, Rule, advisory_flags

Decision = Literal["accepted", "overridden", "rejected"]


class ThermalGuardrail:
    def __init__(self, limits: dict[str, EquipmentLimits], rules: list[Rule] | None = None) -> None:
        self.limits = limits
        self.rules: list[Rule] = RULES if rules is None else rules
        self.decision_log: list[dict[str, Any]] = []

    def validate(self, command: Command) -> dict[str, Any]:
        equipment = command.get("equipment_type")
        if equipment not in self.limits:
            return self._log_decision("rejected", equipment, command, "Unknown equipment type")
        if command.get("target_temperature") is None:
            return self._log_decision("rejected", equipment, command, "Missing target_temperature")
        limits: EquipmentLimits = self.limits[equipment]
        working: Command = dict(command)
        reasons: list[str] = []
        # TODO(milestone 2): for rule in self.rules -> reject (log with rule=rule.__name__) / modify (update working)
        # TODO(milestone 5): wrap the loop in try/except Exception -> "rejected" (fail CLOSED)
        # TODO(milestone 4): flags = advisory_flags(working["target_temperature"], limits)
        # TODO(milestone 2): "overridden" with "; ".join(reasons) and modified_command=working, else "accepted"
        raise NotImplementedError

    def _log_decision(
        self,
        decision: Decision,
        equipment: str | None,
        command: Command,
        reason: str,
        modified_command: Command | None = None,
        rule: str | None = None,
        flags: list[str] | None = None,
    ) -> dict[str, Any]:
        entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "equipment": equipment,
            "original_command": command,
            "reason": reason,
        }
        if modified_command:
            entry["modified_command"] = modified_command
        if rule:
            entry["rule"] = rule
        if flags:
            entry["flags"] = flags
        self.decision_log.append(entry)
        return entry

    def summary(self) -> dict[str, int]:
        return dict(Counter(e["decision"] for e in self.decision_log))

    def export_jsonl(self, path: Path) -> int:
        # TODO(milestone 5): one json.dumps(entry) per line; return the count
        raise NotImplementedError
```

```python
# interceptor.py
import functools
from collections.abc import Callable
from typing import Any

from guardrail import ThermalGuardrail
from rules import Command

Executor = Callable[[Command], dict[str, Any]]


def guarded(guardrail: ThermalGuardrail) -> Callable[[Executor], Executor]:
    def decorator(execute: Executor) -> Executor:
        @functools.wraps(execute)
        def wrapper(command: Command) -> dict[str, Any]:
            decision = guardrail.validate(command)                                      # 1. pre-check
            if decision["decision"] == "rejected":
                return {"status": "blocked", "reason": decision["reason"]}
            safe_cmd: Command = decision.get("modified_command", command)
            result = execute(safe_cmd)                                                   # 2. execute SAFE cmd
            if result.get("applied_temperature") != safe_cmd["target_temperature"]:     # 3. post-check
                return {"status": "fault", "reason": "controller applied a different setpoint"}
            return {**result, "status": "ok", "decision": decision["decision"]}
        return wrapper
    return decorator


def fake_controller(command: Command) -> dict[str, Any]:
    """Stand-in for the real PLC call."""
    return {"equipment": command["equipment_type"], "applied_temperature": command["target_temperature"]}
```

`run_batch.py` holds the ten Requirement 3 commands followed by three extra edge cases. It prints each decision (with `flags=` when present), then the summary, writes `decision_log.jsonl`, and finishes with two calls through `guarded(guardrail)(fake_controller)`:

```python
# run_batch.py (extra commands appended after the Requirement 3 list)
EXTRA: list[dict[str, Any]] = [
    {"equipment_type": "industrial_oven", "target_temperature": 450.0, "current_temperature": 300.0, "duration_min": 5},
    {"equipment_type": "server_rack", "target_temperature": "hot"},
    {"equipment_type": "cryogenic_chamber", "target_temperature": -190.0},
]
```

### Step-by-Step Milestones

1. **Config and scaffolding.** Create `limits.py` and the empty rule stubs, and make sure the unknown-equipment and missing-target branches already work.
   *Done when:* `python -c "from guardrail import ThermalGuardrail as G; from limits import THERMAL_LIMITS as L; print(G(L).validate({'equipment_type': 'x'})['reason'])"` prints `Unknown equipment type`.
2. **Range rules and the chain.** Implement `rule_min_temp` and `rule_max_temp_clamp`, plus the reject and modify loop in `validate`.
   *Done when:* `python run_batch.py` prints decisions for the first 10 commands that match Requirement 3: 4 accepted, 3 overridden, 3 rejected.
3. **Ramp-rate rule.** Implement `rule_ramp_rate`, which enforces $\frac{|T_{\text{target}} - T_{\text{current}}|}{\Delta t} \le r_{\max}$ and otherwise limits the step to $T_{\text{current}} \pm r_{\max}\,\Delta t$.
   *Done when:* the oven command with `current_temperature=300, duration_min=5` is `OVERRIDDEN` to `350.0C`, because $10\ \text{C/min} \times 5\ \text{min} = 50$ C.
4. **Advisory flags.** Implement `advisory_flags` and attach the flags to accepted and overridden entries.
   *Done when:* the oven at 550 C shows `flags=['cooldown_required']`, and the cryo chamber at -190 C shows `flags=['monitoring_required']`.
5. **Fail closed and audit export.** Add the `try/except` around the rule loop and implement `export_jsonl`.
   *Done when:* `python run_batch.py` ends with `Wrote 13 entries to decision_log.jsonl`, and every line of that file parses with `json.loads`.
6. **Interceptor.** Wire `guarded` around `fake_controller`.
   *Done when:* the demo prints an `applied_temperature` of `45.0` for the 80 C rack request, and `status: blocked` for the 50 C oven request.
7. **Tests.** Add `tests/test_guardrail.py`.
   *Done when:* `pytest -q` reports `22 passed`.

### Sample Expected Output

The sample input is the 10 Requirement 3 commands plus the 3 `EXTRA` commands, in that order:

```text
$ python run_batch.py
[ACCEPTED] industrial_oven: Within limits
[OVERRIDDEN] industrial_oven: Temperature 700.0C exceeds max 550.0C, clamped  flags=['cooldown_required']
[ACCEPTED] server_rack: Within limits  flags=['cooling_required']
[OVERRIDDEN] server_rack: Temperature 80.0C exceeds max 45.0C, clamped  flags=['cooling_required']
[ACCEPTED] cryogenic_chamber: Within limits
[OVERRIDDEN] cryogenic_chamber: Temperature -100.0C exceeds max -150.0C, clamped
[REJECTED] industrial_oven: Temperature 50.0C below minimum 100.0C
[REJECTED] unknown_device: Unknown equipment type
[REJECTED] server_rack: Missing target_temperature
[ACCEPTED] industrial_oven: Within limits  flags=['cooldown_required']
[OVERRIDDEN] industrial_oven: Ramp 30.0C/min exceeds 10.0C/min, limited to 350.0C this step
[REJECTED] server_rack: target_temperature must be a finite number, got 'hot'
[ACCEPTED] cryogenic_chamber: Within limits  flags=['monitoring_required']

Total decisions: 13  {'accepted': 5, 'overridden': 4, 'rejected': 4}
Wrote 13 entries to decision_log.jsonl

Interceptor demo:
{'equipment': 'server_rack', 'applied_temperature': 45.0, 'status': 'ok', 'decision': 'overridden'}
{'status': 'blocked', 'reason': 'Temperature 50.0C below minimum 100.0C'}
```

Line 2 of `decision_log.jsonl` (the timestamp will differ):

```json
{"timestamp": "2026-03-01T08:00:00.372198+00:00", "decision": "overridden", "equipment": "industrial_oven", "original_command": {"equipment_type": "industrial_oven", "target_temperature": 700.0}, "reason": "Temperature 700.0C exceeds max 550.0C, clamped", "modified_command": {"equipment_type": "industrial_oven", "target_temperature": 550.0}, "flags": ["cooldown_required"]}
```

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| nominal | oven 300 C | `accepted` |
| inclusive bounds | oven 100 C and 550 C | `accepted` both |
| just below min | oven 99.9 C | `rejected` |
| above max | oven 700 C, cryo -100 C | `overridden`, clamped to max, original kept |
| unknown equipment | `unknown_device` | `rejected` |
| missing target | no `target_temperature` key | `rejected` |
| wrong types | `"hot"`, `True`, `NaN` | `rejected` by `rule_numeric_target` |
| ramp heating | oven 300 C to 450 C over 5 min | `overridden` to 350 C |
| ramp cooling | cryo -150 C to -160 C over 1 min | `overridden` to -151 C |
| clamp then ramp | oven 520 C to 700 C over 2 min | 540 C, two reasons joined by `;` |
| bad duration | `duration_min = 0` | `rejected`, `rule == "rule_ramp_rate"` |
| advisory flags | oven 450, rack 40, cryo -190 | `cooldown_required`, `cooling_required`, `monitoring_required` |
| engine bug | a rule raises `KeyError` | `rejected` with `Internal guardrail error` (fail closed) |
| audit export | 3 decisions | `summary()` counts match; every JSONL line has the 5 required keys |
| interceptor | rejected, then overridden command | controller never called for the first; called with 45 C for the second |

```python
# tests/test_guardrail.py -- run with: pytest -q
import json
import sys
from pathlib import Path
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from guardrail import ThermalGuardrail  # noqa: E402
from interceptor import fake_controller, guarded  # noqa: E402
from limits import THERMAL_LIMITS  # noqa: E402
from rules import RULES, RuleResult  # noqa: E402


@pytest.fixture
def g() -> ThermalGuardrail:
    return ThermalGuardrail(THERMAL_LIMITS)


def cmd(equipment: str, target: Any, **extra: Any) -> dict[str, Any]:
    return {"equipment_type": equipment, "target_temperature": target, **extra}


@pytest.mark.parametrize(
    ("command", "decision"),
    [
        (cmd("industrial_oven", 300.0), "accepted"),
        (cmd("industrial_oven", 550.0), "accepted"),      # max is inclusive
        (cmd("industrial_oven", 100.0), "accepted"),      # min is inclusive
        (cmd("industrial_oven", 99.9), "rejected"),
        (cmd("industrial_oven", 700.0), "overridden"),
        (cmd("cryogenic_chamber", -100.0), "overridden"),
        (cmd("unknown_device", 25.0), "rejected"),
        ({"equipment_type": "server_rack"}, "rejected"),
        (cmd("server_rack", "hot"), "rejected"),
        (cmd("server_rack", True), "rejected"),
        (cmd("server_rack", float("nan")), "rejected"),
    ],
)
def test_decisions(g: ThermalGuardrail, command: dict[str, Any], decision: str) -> None:
    assert g.validate(command)["decision"] == decision


def test_clamp_returns_modified_command_and_keeps_original(g: ThermalGuardrail) -> None:
    entry = g.validate(cmd("server_rack", 80.0))
    assert entry["modified_command"]["target_temperature"] == 45.0
    assert entry["original_command"]["target_temperature"] == 80.0


def test_ramp_rate_limits_the_step(g: ThermalGuardrail) -> None:
    entry = g.validate(cmd("industrial_oven", 450.0, current_temperature=300.0, duration_min=5))
    assert entry["decision"] == "overridden"
    assert entry["modified_command"]["target_temperature"] == 350.0   # 300 + 10 C/min * 5 min


def test_ramp_rate_cooling_direction(g: ThermalGuardrail) -> None:
    entry = g.validate(cmd("cryogenic_chamber", -160.0, current_temperature=-150.0))
    assert entry["modified_command"]["target_temperature"] == -151.0


def test_clamp_then_ramp_both_reported(g: ThermalGuardrail) -> None:
    entry = g.validate(cmd("industrial_oven", 700.0, current_temperature=520.0, duration_min=2))
    assert entry["modified_command"]["target_temperature"] == 540.0
    assert entry["reason"].count(";") == 1


def test_non_positive_duration_rejected(g: ThermalGuardrail) -> None:
    entry = g.validate(cmd("industrial_oven", 300.0, current_temperature=290.0, duration_min=0))
    assert entry["decision"] == "rejected" and entry["rule"] == "rule_ramp_rate"


@pytest.mark.parametrize(
    ("command", "flag"),
    [
        (cmd("industrial_oven", 450.0), "cooldown_required"),
        (cmd("server_rack", 40.0), "cooling_required"),
        (cmd("cryogenic_chamber", -190.0), "monitoring_required"),
    ],
)
def test_advisory_flags(g: ThermalGuardrail, command: dict[str, Any], flag: str) -> None:
    assert g.validate(command)["flags"] == [flag]


def test_engine_bug_fails_closed() -> None:
    def broken_rule(c: dict[str, Any], lim: dict[str, float]) -> RuleResult:
        raise KeyError("oops")

    g = ThermalGuardrail(THERMAL_LIMITS, rules=[broken_rule, *RULES])
    entry = g.validate(cmd("industrial_oven", 300.0))
    assert entry["decision"] == "rejected"
    assert entry["reason"].startswith("Internal guardrail error")


def test_every_entry_is_auditable(g: ThermalGuardrail, tmp_path: Path) -> None:
    for c in [cmd("industrial_oven", 300.0), cmd("industrial_oven", 700.0), cmd("nope", 1.0)]:
        g.validate(c)
    assert g.summary() == {"accepted": 1, "overridden": 1, "rejected": 1}
    out = tmp_path / "log.jsonl"
    assert g.export_jsonl(out) == 3
    for line in out.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        assert {"timestamp", "decision", "equipment", "original_command", "reason"} <= entry.keys()


def test_interceptor_executes_only_the_safe_command(g: ThermalGuardrail) -> None:
    calls: list[dict[str, Any]] = []

    def spy(c: dict[str, Any]) -> dict[str, Any]:
        calls.append(c)
        return fake_controller(c)

    apply = guarded(g)(spy)
    assert apply(cmd("industrial_oven", 50.0))["status"] == "blocked"
    assert calls == []
    assert apply(cmd("server_rack", 80.0))["applied_temperature"] == 45.0
    assert calls[0]["target_temperature"] == 45.0
```

### Practice & Self-Check

**Q1 (predict the output).** What are `decision`, the final `target_temperature`, `reason`, and `flags` for `{"equipment_type": "industrial_oven", "target_temperature": 700.0, "current_temperature": 520.0, "duration_min": 2}`?

**Q2 (predict the output).** What happens to `{"equipment_type": "server_rack", "target_temperature": True}`? What would happen if `rule_numeric_target` were removed from `RULES`?

**Q3 (predict the output).** If `run_batch.py` processed only the 10 Requirement 3 commands, what would `guardrail.summary()` return?

**Exercise 1 (Easy).** Add a fourth equipment type, `"annealing_kiln"` (min 200 C, max 1100 C, ramp 5 C/min, `requires_ventilation_above_c: 900`), **without** touching `rules.py` or `guardrail.py`. Write a test that proves `ventilation_required` is flagged at 950 C.

**Exercise 2 (Medium).** Implement Chapter 1's rate-limiting pattern as a *stateful* rule: no equipment may receive more than 3 setpoint changes in any 60 s window. Inject the clock (`now: Callable[[], float] = time.monotonic`) so the test can advance time deterministically, and decide whether the rule should run first or last in `RULES`.

#### Dry-Run: Answers

**A1.** The decision is `overridden` and the final target is `540.0`. The clamp runs first, so $700 \to 550$. The ramp rule then sees $|550 - 520| / 2 = 15$ C/min $> 10$, so it limits the step to $520 + 10 \times 2 = 540$. The `reason` is `Temperature 700.0C exceeds max 550.0C, clamped; Ramp 15.0C/min exceeds 10.0C/min, limited to 540.0C this step`. `flags` is `['cooldown_required']`, because the final $540 > 400$. Flags are computed on the **modified** target, not the original 700.

**A2.** It is `rejected` with `target_temperature must be a finite number, got True`, and `rule == "rule_numeric_target"`. In Python, `bool` is a subclass of `int`, so a bare `isinstance(t, (int, float))` check would let it through. That is why the explicit `isinstance(t, bool)` test comes first. Without the rule, `True < 10.0` evaluates as `1 < 10.0`, so it is still rejected, but with the misleading reason `Temperature TrueC below minimum 10.0C`. For the cryogenic chamber, `True` (1) would pass the minimum check, be clamped to $-150$, and **reach the controller as an `overridden` setpoint**. Type checks must come before physics checks.

**A3.** `{'accepted': 4, 'overridden': 3, 'rejected': 3}`. Accepted: oven 300, rack 40, cryo -170, oven 550 (the max is inclusive). Overridden: oven 700, rack 80, cryo -100. Rejected: oven 50, `unknown_device`, and the rack with no target. The dictionary keys appear in first-seen order, because `Counter` preserves insertion order.

**Exercise 1 sketch.** Add the dictionary entry to `THERMAL_LIMITS` and nothing else. `advisory_flags` parses `requires_ventilation_above_c` into `("ventilation", "above", "c")` generically. The test is `assert g.validate(cmd("annealing_kiln", 950.0))["flags"] == ["ventilation_required"]`. If you had to touch the rule code, the configuration was not data-driven enough.

**Exercise 2 sketch.**

```python
class RateLimitRule:
    __name__ = "rule_rate_limit"

    def __init__(self, max_changes: int = 3, window_s: float = 60.0, now: Callable[[], float] = time.monotonic) -> None:
        self.max_changes, self.window_s, self.now = max_changes, window_s, now
        self.history: dict[str, deque[float]] = defaultdict(deque)

    def __call__(self, cmd: Command, limits: EquipmentLimits) -> RuleResult:
        t, q = self.now(), self.history[cmd["equipment_type"]]
        while q and t - q[0] >= self.window_s:
            q.popleft()
        if len(q) >= self.max_changes:
            return RuleResult("reject", f"more than {self.max_changes} changes in {self.window_s:.0f}s")
        q.append(t)
        return PASS
```

Put it **last**. If it ran first, rejected commands (for example "below minimum") would still use up a slot in the window. Only commands that would otherwise be executed should count. In the test, use `clock = [0.0]` and `now=lambda: clock[0]`. Four calls at $t = 0$ give the fourth one `rejected`. After setting `clock[0] = 60.0`, the next call is accepted.

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

