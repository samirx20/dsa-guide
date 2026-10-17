# Part 0, Topic 1: Python Systems Basics
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
- If no file argument is provided, print usage information and exit with code 1.
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

