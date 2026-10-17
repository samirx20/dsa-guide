# Part 0, Topic 2: Python Systems Basics
## Project 1: Strict Python CLI for Parsing Factory Log Files

It is time to apply everything from this topic in a single project. You will build a command-line tool that reads factory sensor logs, validates the data with strict types, and reports anomalies.

### Goal

Prove you can set up a typed Python project from scratch, handle CLI arguments, parse structured log files, validate data with custom types, and report errors gracefully.

### Requirements

#### 1. Project Setup
- Create a new directory named `strict-python-cli`.
- Initialize a virtual environment using `venv` or `uv`.
- Create a `pyproject.toml` with your project name, version, and dependencies (`argparse` is stdlib; add `pydantic` if you want).
- Install your dependencies into the virtual environment.

#### 2. Define a Typed Log Schema
- Create a `models.py` file.
- Define a `TypedDict` or Pydantic `BaseModel` called `SensorLogEntry` with fields: `timestamp` (str), `sensor_id` (str), `temperature` (float), `pressure` (float), `status` (Literal["ok", "warning", "critical"]).
- Add type hints to every function in your project.

#### 3. Build the CLI
- Use `argparse` to accept a file path argument: `python main.py <path_to_log_file>`.
- The tool should read the file (assume JSON-lines format, one JSON object per line).
- Parse each line into your `SensorLogEntry` model.

#### 4. Validate and Report
- For each log entry, validate that temperature is between -50 and 200, and pressure is between 0 and 500.
- If a line is malformed JSON, print a warning with the line number and skip it.
- If a line fails validation, print which field failed and why.
- At the end, print a summary: total entries, valid entries, invalid entries, and any entries with `status == "critical"`.

#### 5. Error Handling
- If the file does not exist, print a clear error message and exit with code 1.
- If no file argument is provided, print usage information and exit with a non-zero code (`argparse` does this for you, using code 2).
- Use `try/except` blocks with your custom exception types or Pydantic `ValidationError`.

### Evaluation Checklist

- [ ] Does the project have a working virtual environment with a `pyproject.toml`?
- [ ] Is every function and variable type-hinted?
- [ ] Does the CLI correctly parse a valid JSON-lines file?
- [ ] Does it catch malformed JSON and report the line number?
- [ ] Does it catch out-of-range sensor values and report the specific field?
- [ ] Does it print a summary with counts of valid, invalid, and critical entries?
- [ ] Does it exit gracefully with proper error messages for missing files or missing arguments?

Once you have built and tested this CLI, you have proven mastery of Python project setup, strict typing, and defensive error handling — the foundation every agentic system requires.

### Starter Code Skeleton

Use this layout. Each module has one job: `models.py` describes *what* a valid record is, `log_parser.py` turns text into records, `report.py` turns records into text, and `main.py` only wires the CLI together. Keeping I/O at the edges makes every inner function trivially testable.

```text
strict-python-cli/
├── .venv/                    # created by `python -m venv .venv` (never committed)
├── pyproject.toml
├── main.py                   # argparse entry point, exit codes
├── models.py                 # SensorLogEntry (Pydantic BaseModel)
├── errors.py                 # CliError hierarchy (Chapter 6 pattern)
├── log_parser.py             # parse_line / parse_file -> ParseResult
├── report.py                 # render_issues / render_summary
├── sample_logs/
│   └── factory.jsonl
└── tests/
    └── test_cli.py
```

```toml
# pyproject.toml
[project]
name = "strict-python-cli"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["pydantic>=2.6"]

[project.optional-dependencies]
dev = ["pytest>=8.0", "mypy>=1.10"]

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]
```

```python
# errors.py -- one root class so main.py can catch "anything we raised on purpose"
from pathlib import Path


class CliError(Exception):
    """Root of every error this tool raises on purpose."""


class LogFileNotFoundError(CliError):
    def __init__(self, path: Path) -> None:
        super().__init__(f"log file not found: {path}")
        self.path: Path = path


class MalformedLineError(CliError):
    def __init__(self, line_no: int, reason: str) -> None:
        super().__init__(f"line {line_no}: malformed JSON ({reason})")
        self.line_no: int = line_no
```

```python
# models.py
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["ok", "warning", "critical"]


class SensorLogEntry(BaseModel):
    """One JSON-lines record. Unknown keys are rejected (extra='forbid')."""

    model_config = ConfigDict(extra="forbid")

    timestamp: str
    sensor_id: str = Field(min_length=1)
    temperature: float  # TODO(milestone 2): Field(ge=-50.0, le=200.0)
    pressure: float     # TODO(milestone 2): Field(ge=0.0, le=500.0)
    status: Status
```

```python
# log_parser.py
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from pydantic import ValidationError

from errors import LogFileNotFoundError, MalformedLineError
from models import SensorLogEntry

IssueKind = Literal["malformed", "invalid"]


@dataclass
class LineIssue:
    line_no: int
    kind: IssueKind
    message: str


@dataclass
class ParseResult:
    entries: list[SensorLogEntry] = field(default_factory=list)
    issues: list[LineIssue] = field(default_factory=list)
    total: int = 0  # non-blank lines seen


def parse_line(line_no: int, raw: str) -> SensorLogEntry:
    """Parse one line. Raises MalformedLineError or pydantic.ValidationError."""
    # TODO(milestone 3): json.loads(raw); wrap json.JSONDecodeError in MalformedLineError
    # TODO(milestone 3): reject non-dict JSON (e.g. "[1, 2]") as malformed
    # TODO(milestone 3): return SensorLogEntry.model_validate(data)
    raise NotImplementedError


def format_validation_error(exc: ValidationError) -> str:
    """Flatten Pydantic's error list into 'field: message; field: message'."""
    # TODO(milestone 4): join err["loc"] and err["msg"] for each item in exc.errors()
    raise NotImplementedError


def parse_file(path: Path) -> ParseResult:
    """Read every non-blank line. Raises only LogFileNotFoundError; bad lines become LineIssues."""
    if not path.is_file():
        raise LogFileNotFoundError(path)
    result = ParseResult()
    with path.open(encoding="utf-8") as fh:
        for line_no, raw in enumerate(fh, start=1):
            if not raw.strip():
                continue
            result.total += 1
            # TODO(milestone 4): try parse_line(...); append to entries or issues
    return result
```

```python
# report.py
from log_parser import ParseResult
from models import SensorLogEntry


def critical_entries(result: ParseResult) -> list[SensorLogEntry]:
    return [e for e in result.entries if e.status == "critical"]


def render_issues(result: ParseResult) -> list[str]:
    """'WARNING line N: ... -- skipped' for malformed, 'INVALID line N: ...' for invalid."""
    # TODO(milestone 5)
    raise NotImplementedError


def render_summary(result: ParseResult) -> str:
    """Multi-line '=== Summary ===' block including each critical entry."""
    # TODO(milestone 5)
    raise NotImplementedError
```

```python
# main.py
import argparse
import sys
from pathlib import Path
from typing import NoReturn

from errors import CliError
from log_parser import ParseResult, parse_file
from report import render_issues, render_summary


class StrictArgumentParser(argparse.ArgumentParser):
    """argparse exits with code 2 on bad usage; the spec demands code 1."""

    def error(self, message: str) -> NoReturn:
        self.print_usage(sys.stderr)
        print(f"error: {message}", file=sys.stderr)
        sys.exit(1)


def build_parser() -> StrictArgumentParser:
    parser = StrictArgumentParser(prog="factory-logs", description="Validate factory sensor JSON-lines logs.")
    parser.add_argument("log_file", type=Path, help="path to a .jsonl log file")
    return parser


def run(argv: list[str] | None = None) -> int:
    """Return the process exit code instead of calling sys.exit, so tests can call it."""
    args: argparse.Namespace = build_parser().parse_args(argv)
    try:
        result: ParseResult = parse_file(args.log_file)
    except CliError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    # TODO(milestone 5): print render_issues(result) lines, then render_summary(result)
    return 0


if __name__ == "__main__":
    sys.exit(run())
```

### Step-by-Step Milestones

1. **Environment and packaging.** Create the folder, the `.venv`, and `pyproject.toml`; install with `pip install -e ".[dev]"`.
   *Done when:* `python -c "import pydantic; print(pydantic.VERSION)"` prints a `2.x` version from inside the venv, and `python -c "import sys; print(sys.prefix)"` ends in `.venv`.
2. **Typed schema with bounds.** Add `Field(ge=..., le=...)` so the model itself enforces $-50 \le T \le 200$ and $0 \le P \le 500$ (both ends inclusive).
   *Done when:* `python -c "from models import SensorLogEntry as S; S(timestamp='t', sensor_id='a', temperature=201, pressure=1, status='ok')"` raises a `ValidationError` mentioning `temperature`.
3. **Single-line parsing.** Implement `parse_line` so every failure becomes one of exactly two exception types.
   *Done when:* `python -c "from log_parser import parse_line; parse_line(4, '{bad')"` ends with `MalformedLineError: line 4: malformed JSON (...)`.
4. **Whole-file parsing.** Fill in the loop in `parse_file` and implement `format_validation_error`. Blank lines are skipped and are not counted.
   *Done when:* parsing `sample_logs/factory.jsonl` in a REPL gives `result.total == 7`, `len(result.entries) == 3`, `len(result.issues) == 4`.
5. **Reporting.** Implement `render_issues`, `render_summary`, and the printing in `run`.
   *Done when:* `python main.py sample_logs/factory.jsonl` prints the output shown in *Sample Expected Output* and `echo $?` (or `$LASTEXITCODE` in PowerShell) prints `0`.
6. **Exit codes.** Verify both failure exits.
   *Done when:* `python main.py` and `python main.py missing.jsonl` each print an error to stderr and exit with `1` (not `2`).
7. **Strict typing and tests.** Add the test file below and run the type checker.
   *Done when:* `mypy .` reports `Success: no issues found` and `pytest -q` shows all tests passing.

### Sample Expected Output

Sample input `sample_logs/factory.jsonl` (line 6 is intentionally blank):

```text
{"timestamp": "2026-03-01T08:00:00Z", "sensor_id": "TMP-01", "temperature": 72.5, "pressure": 101.3, "status": "ok"}
{"timestamp": "2026-03-01T08:00:01Z", "sensor_id": "TMP-02", "temperature": 188.0, "pressure": 420.0, "status": "critical"}
{"timestamp": "2026-03-01T08:00:02Z", "sensor_id": "TMP-03", "temperature": 250.0, "pressure": 99.0, "status": "warning"}
{"timestamp": "2026-03-01T08:00:03Z", "sensor_id": "TMP-04", "temperature": 30.0
{"timestamp": "2026-03-01T08:00:04Z", "sensor_id": "TMP-05", "temperature": 40.0, "pressure": -5.0, "status": "unknown"}

{"timestamp": "2026-03-01T08:00:05Z", "sensor_id": "TMP-06", "temperature": "hot", "pressure": 12.0, "status": "ok"}
{"timestamp": "2026-03-01T08:00:06Z", "sensor_id": "TMP-07", "temperature": 21.0, "pressure": 100.0, "status": "ok"}
```

```text
$ python main.py sample_logs/factory.jsonl
INVALID line 3: temperature: Input should be less than or equal to 200
WARNING line 4: malformed JSON (Expecting ',' delimiter) -- skipped
INVALID line 5: pressure: Input should be greater than or equal to 0; status: Input should be 'ok', 'warning' or 'critical'
INVALID line 7: temperature: Input should be a valid number, unable to parse string as a number
=== Summary ===
Total entries   : 7
Valid entries   : 3
Invalid entries : 4
Critical entries: 1
  - 2026-03-01T08:00:01Z TMP-02 temp=188.0 pressure=420.0
$ echo $?
0

$ python main.py missing.jsonl
error: log file not found: missing.jsonl
$ echo $?
1

$ python main.py
usage: factory-logs [-h] log_file
error: the following arguments are required: log_file
$ echo $?
1
```

Note that line 5 reports **two** problems at once: Pydantic collects every field error before raising, so the user fixes everything in one pass.

### Test Plan

| Test name | Input | Expected |
|---|---|---|
| happy path line | valid JSON object, all fields in range | `SensorLogEntry` returned |
| inclusive lower bound | `temperature = -50.0` | accepted |
| inclusive upper bound | `temperature = 200.0` | accepted |
| just above range | `temperature = 200.1` | `ValidationError`, `loc == ("temperature",)` |
| malformed JSON | `{"sensor_id": ` on line 42 | `MalformedLineError`, `line_no == 42` |
| JSON but not an object | `[1, 2, 3]` | `MalformedLineError` |
| blank lines | file with an empty line | blank line skipped, not counted in `total` |
| missing file | non-existent path | `LogFileNotFoundError`; `run` returns `1` |
| no CLI argument | `run([])` | `SystemExit` with code `1` |
| unknown key | extra `"humidity": 4` field | `ValidationError` (because `extra="forbid"`) |

```python
# tests/test_cli.py -- run with: pytest -q
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from errors import LogFileNotFoundError, MalformedLineError  # noqa: E402
from log_parser import parse_file, parse_line  # noqa: E402
from main import run  # noqa: E402

GOOD = '{"timestamp": "t0", "sensor_id": "S1", "temperature": 20.0, "pressure": 100.0, "status": "ok"}'


def write_log(tmp_path: Path, *lines: str) -> Path:
    path = tmp_path / "log.jsonl"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def test_parse_line_happy_path() -> None:
    entry = parse_line(1, GOOD)
    assert entry.sensor_id == "S1"
    assert entry.temperature == 20.0


@pytest.mark.parametrize("temp", [-50.0, 200.0])
def test_temperature_bounds_are_inclusive(temp: float) -> None:
    raw = GOOD.replace("20.0", str(temp))
    assert parse_line(1, raw).temperature == temp


def test_temperature_above_range_names_the_field() -> None:
    with pytest.raises(ValidationError) as info:
        parse_line(1, GOOD.replace("20.0", "200.1"))
    assert info.value.errors()[0]["loc"] == ("temperature",)


def test_malformed_json_carries_line_number() -> None:
    with pytest.raises(MalformedLineError) as info:
        parse_line(42, '{"sensor_id": ')
    assert info.value.line_no == 42


def test_json_array_is_rejected_as_malformed() -> None:
    with pytest.raises(MalformedLineError):
        parse_line(1, "[1, 2, 3]")


def test_parse_file_counts_and_skips_blank_lines(tmp_path: Path) -> None:
    critical = GOOD.replace('"ok"', '"critical"')
    path = write_log(tmp_path, GOOD, "", "not json", critical)
    result = parse_file(path)
    assert result.total == 3
    assert len(result.entries) == 2
    assert [i.line_no for i in result.issues] == [3]


def test_missing_file_raises(tmp_path: Path) -> None:
    with pytest.raises(LogFileNotFoundError):
        parse_file(tmp_path / "missing.jsonl")


def test_run_missing_file_exits_1(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert run([str(tmp_path / "missing.jsonl")]) == 1
    assert "log file not found" in capsys.readouterr().err


def test_run_without_args_exits_1() -> None:
    with pytest.raises(SystemExit) as info:
        run([])
    assert info.value.code == 1
```

### Practice & Self-Check

**Q1 (predict the output).** You forget to subclass and use a plain `argparse.ArgumentParser` in `build_parser`. What exit code does `python main.py` (no arguments) produce, and which checklist item fails?

**Q2 (predict the output).** What does `parse_line(1, line)` return or raise for this line? Note the integer `200` and the string `"0"`.

```text
{"timestamp": "t", "sensor_id": "S9", "temperature": 200, "pressure": "0", "status": "ok"}
```

**Q3 (predict the output).** A file contains three lines: the `GOOD` line from the tests, an empty line, and `[1, 2]`. What are `total`, `len(entries)`, and the single rendered issue line?

**Exercise 1 (Easy).** Add a `--json` flag that prints the summary as one JSON object (`{"total": 7, "valid": 3, "invalid": 4, "critical": ["TMP-02"]}`) instead of the text block.

**Exercise 2 (Medium).** Add a `--strict` flag that disables Pydantic's lax coercion so `"pressure": "0"` and `"temperature": 200` (an `int`) behave differently. Then add a per-sensor table: for each `sensor_id`, the count and mean temperature $\bar{T} = \frac{1}{n}\sum_{i=1}^{n} T_i$ of its valid entries.

#### Dry-Run: Answers

**A1.** Exit code `2`. The stock `ArgumentParser.error()` calls `self.exit(2, ...)`, so the "exit with code 1 when no file argument is provided" requirement fails. Overriding `error()` in `StrictArgumentParser` is the cleanest fix because it also covers every other usage error (unknown flags, and so on).

**A2.** It returns a valid entry with `temperature=200.0` and `pressure=0.0`. Pydantic's default *lax* mode converts the `int` `200` and the numeric string `"0"` to `float`. Both bounds are inclusive (`le=200.0`, `ge=0.0`), so neither value is out of range. `"hot"` fails on line 7 of the sample only because it cannot be read as a number at all.

**A3.** `total == 2` (the blank line is skipped before counting), `len(entries) == 1`, and the rendered issue is `WARNING line 3: malformed JSON (expected a JSON object) -- skipped`. The line number is `3` because `enumerate(fh, start=1)` still counts the blank line, even though `total` does not.

**Exercise 1 sketch.** Add `parser.add_argument("--json", action="store_true")`, then in `run`:

```python
if args.json:
    print(json.dumps({
        "total": result.total,
        "valid": len(result.entries),
        "invalid": result.total - len(result.entries),
        "critical": [e.sensor_id for e in critical_entries(result)],
    }))
    return 0
```

**Exercise 2 sketch.** Thread a `strict: bool` argument through `parse_file` and `parse_line`, and call `SensorLogEntry.model_validate(data, strict=strict)`. In strict mode the string `"0"` is rejected (`Input should be a valid number`). The `int` `200` is still accepted, because strict mode allows `int` to `float`, which is lossless. For the table, group entries with `collections.defaultdict(list)` keyed by `sensor_id`, then print `len(temps)` and `statistics.fmean(temps)` for each sensor.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Project 1: Strict Python CLI for Parsing Factory Log Files**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **project strict python cli**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

