# Part 0, Topic 1: Python Systems Basics
## Chapter 1: Virtual Environments

**Prerequisite Knowledge:** Knowing how to open a terminal/command prompt and run basic commands.

---

### The "Toolbox" Analogy (Expanded)

Every Python project you build for an agentic system will depend on third-party libraries — code written by other people, like FastAPI, Pydantic, or OpenAI.

Imagine you are a contractor working on two houses.
* House A requires a specific brand of plumbing tools (Version 1).
* House B requires a completely different, newer brand of plumbing tools (Version 2).

If you only have one main toolbox (your "global" computer environment), mixing these tools will cause chaos. A **Virtual Environment** is like creating a brand new, empty toolbox specifically for House A, and another one specifically for House B.

```
┌──────────────────────────────────────────────────────────────┐
│              WITHOUT VIRTUAL ENVIRONMENT                     │
│                                                              │
│  Global Python Environment                                   │
│  ┌──────────────────────────────────────────────┐            │
│  │ Project A needs: FastAPI 0.110               │            │
│  │ Project B needs: FastAPI 0.100               │            │
│  │                                              │            │
│  │ Only ONE version can exist!                  │            │
│  │ FastAPI 0.110 installed → Project B BREAKS!  │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
│  Without isolation, installing a new version for one          │
│  project can break every other project on your machine.      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              WITH VIRTUAL ENVIRONMENT                        │
│                                                              │
│  Global Python Environment (untouched)                       │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ .venv/ (House A) │    │ .venv/ (House B) │               │
│  │                  │    │                  │               │
│  │ FastAPI 0.110    │    │ FastAPI 0.100    │               │
│  │ Pydantic 2.0     │    │ Pydantic 1.8     │               │
│  │ httpx 0.27       │    │ httpx 0.25       │               │
│  │                  │    │                  │               │
│  │ Each project gets│    │ its own isolated │               │
│  │ copy of its      │    │ dependencies!    │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                              │
│  Changing one never affects the other.                       │
└──────────────────────────────────────────────────────────────┘
```

---

### 1. Why Isolation Matters

Without isolation, installing a new version of a library for one project can break every other project on your machine. A virtual environment solves this by giving each project its own independent folder to store its tools.

```bash
# Imagine this scenario WITHOUT virtual environments:
# You're working on Project A, which needs FastAPI 0.110
pip install fastapi==0.110

# Later, you start Project B, which needs FastAPI 0.100
pip install fastapi==0.100

# Now Project A is BROKEN because FastAPI was upgraded!
# Project A was written for 0.110, but now has 0.100
```

```
┌──────────────────────────────────────────────────────────────┐
│           VERSION CONFLICT EXAMPLE                           │
│                                                              │
│  Project A: requires fastapi>=0.110                          │
│  Project B: requires fastapi>=0.100                          │
│                                                              │
│  Without venv:                                                │
│  ┌─────────────────────────────────────────┐                 │
│  │ pip install fastapi==0.110  ← Project A │                 │
│  │ pip install fastapi==0.100  ← Project B │                 │
│  │                    ↓                    │                 │
│  │         FastAPI is now 0.100            │                 │
│  │         Project A NEEDS 0.110!          │                 │
│  │         Project A → 💥 CRASH           │                 │
│  └─────────────────────────────────────────┘                 │
│                                                              │
│  With venv:                                                  │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ Project A .venv/ │    │ Project B .venv/ │               │
│  │ FastAPI 0.110 ✓  │    │ FastAPI 0.100 ✓  │               │
│  └──────────────────┘    └──────────────────┘               │
│         No conflict! Each has its own copy.                  │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. `venv` — The Built-in Way

Python ships with `venv`. It is lightweight and has zero dependencies.

```bash
# Create a virtual environment named .venv
python -m venv .venv

# Activate it (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate it (macOS/Linux)
source .venv/bin/activate

# Now pip installs go into .venv, not your global Python
pip install fastapi httpx pydantic

# Freeze exact versions
pip freeze > requirements.txt

# Deactivate when done
deactivate
```

**What's happening:**
```bash
python -m venv .venv
#     ^^  ^^^ ^^^^
#     |   |   |
#     |   |   └── Directory name for the virtual environment
#     |   │       Convention is ".venv" (hidden folder)
#     |   └── The venv module (comes with Python)
#     └── Run as a module
#
# This creates a folder called .venv with:
#   .venv/
#   ├── Scripts/         (Windows) or bin/ (Mac/Linux)
#   │   ├── python.exe   ← Python interpreter
#   │   ├── pip.exe      ← Package installer
#   │   └── activate     ← Activation script
#   └── Lib/
#       └── site-packages/  ← Where packages get installed
```

**What happens when you activate:**
```bash
# Before activation:
which python
# /usr/bin/python  (your system Python)

# After activation (.venv\Scripts\Activate.ps1 on Windows):
which python
# /path/to/project/.venv/Scripts/python.exe  (virtual environment Python)

# All pip installs now go to .venv/Lib/site-packages/
# NOT to the global Python installation
```

**Verification commands:**
```bash
# After activating, verify you're in the right environment:

# Check Python location
which python     # Should show .venv path
where python     # Windows equivalent

# Check installed packages
pip list

# Check if a package is installed
pip show fastapi

# See where packages are installed
pip show fastapi | grep Location
# Should show: .venv/Lib/site-packages (not system Python)
```

---

### 3. `uv` — The Modern Way

`uv` is a drop-in replacement for pip that is 10-100x faster. It handles virtual environment creation and dependency resolution in a single step.

```bash
# Install uv (one-time)
pip install uv

# Create a .venv AND install packages in one command
uv venv
uv pip install fastapi httpx pydantic

# Or add a dependency directly
uv add fastapi httpx pydantic
```

**What's happening:**
```bash
uv venv
# ^^
# uv's built-in venv creation — faster than python -m venv
# Creates .venv/ with Python interpreter and pip

uv pip install fastapi httpx pydantic
#    ^^^
#    uv's pip replacement — resolves and installs packages much faster
#    Same interface as pip, just faster

uv add fastapi httpx pydantic
#  ^^^
#    Adds dependencies to pyproject.toml AND installs them
#    Single command does both!
```

**`uv` vs `pip` speed comparison:**
```bash
# Typical installation times:
# pip install fastapi httpx pydantic
# ~15-30 seconds

# uv pip install fastapi httpx pydantic
# ~1-3 seconds (10-100x faster!)
```

---

### 4. `pyproject.toml` vs `requirements.txt`

Modern Python projects use `pyproject.toml` instead of `requirements.txt`. The `pyproject.toml` file is a declarative manifest that describes your project, its dependencies, and build configuration.

```toml
[project]
name = "factory-agent"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110",
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "ruff"]
```

```bash
# Install everything from pyproject.toml
uv pip install -e ".[dev]"
```

**What's happening:**
```toml
[project]
name = "factory-agent"        # Your project's name
version = "0.1.0"             # Semantic versioning
requires-python = ">=3.11"    # Minimum Python version required
dependencies = [              # Core dependencies (required)
    "fastapi>=0.110",         # FastAPI 0.110 or newer
    "httpx>=0.27",            # httpx 0.27 or newer
    "pydantic>=2.0",          # Pydantic 2.0 or newer
]

[project.optional-dependencies]
dev = ["pytest", "ruff"]      # Dev-only dependencies (testing, linting)
#  ^^^                        # Install with: pip install -e ".[dev]"
```

**Comparison: `requirements.txt` vs `pyproject.toml`:**

| Feature | `requirements.txt` | `pyproject.toml` |
|---------|-------------------|-------------------|
| Format | Simple text list | TOML (structured) |
| Project metadata | No | Yes (name, version, etc.) |
| Optional deps | No | Yes (`[dev]`, `[test]`, etc.) |
| Python version | No | Yes (`requires-python`) |
| PEP 621 standard | No | Yes |
| Tool support | Universal | Modern tools (uv, poetry) |

```
┌──────────────────────────────────────────────────────────────┐
│           requirements.txt vs pyproject.toml                 │
│                                                              │
│  requirements.txt:                                           │
│  ┌─────────────────────────────────┐                         │
│  │ fastapi==0.110.0               │                         │
│  │ httpx==0.27.0                  │                         │
│  │ pydantic==2.6.1                │                         │
│  └─────────────────────────────────┘                         │
│  Just a list. No project info. No optional deps.             │
│                                                              │
│  pyproject.toml:                                             │
│  ┌─────────────────────────────────┐                         │
│  │ [project]                       │                         │
│  │ name = "factory-agent"          │                         │
│  │ version = "0.1.0"               │  ← Project metadata     │
│  │ requires-python = ">=3.11"      │  ← Python version       │
│  │                                 │                         │
│  │ [project.dependencies]          │                         │
│  │ fastapi = ">=0.110"             │  ← Core dependencies    │
│  │                                 │                         │
│  │ [project.optional-dependencies] │                         │
│  │ dev = ["pytest", "ruff"]        │  ← Optional deps        │
│  └─────────────────────────────────┘                         │
│  Structured. Complete. Modern standard.                      │
└──────────────────────────────────────────────────────────────┘
```

---

### 5. Common Mistakes and How to Fix Them

```bash
# MISTAKE 1: Installing packages without activating the venv
pip install fastapi    # Goes to global Python, not .venv!

# FIX: Always activate first
source .venv/bin/activate   # or .venv\Scripts\Activate.ps1
pip install fastapi

# MISTAKE 2: Forgetting to add .venv to .gitignore
# If you commit .venv to git, you'll have problems:
# - Massive repo size
# - Platform-specific binaries won't work cross-platform
# - Merge conflicts in binary files

# FIX: Add to .gitignore
echo ".venv/" >> .gitignore
echo "__pycache__/" >> .gitignore

# MISTAKE 3: Using system Python instead of venv Python
python my_script.py    # Uses system Python, not venv!

# FIX: Use the venv Python explicitly
.venv/bin/python my_script.py      # Mac/Linux
.venv\Scripts\python my_script.py  # Windows

# MISTAKE 4: Not pinning versions
pip install fastapi    # Installs latest version
# Next week: new version breaks your code!

# FIX: Use uv add or requirements.txt with pinned versions
uv add fastapi        # Pins to pyproject.toml
pip freeze > requirements.txt  # Or pin after install
```

---

### 6. The Full Virtual Environment Workflow

Here's the complete workflow for starting a new project:

```bash
# Step 1: Create project directory
mkdir factory-agent
cd factory-agent

# Step 2: Create virtual environment
python -m venv .venv        # Standard way
# OR
uv venv                     # Modern way (faster)

# Step 3: Activate the environment
.venv\Scripts\Activate.ps1  # Windows PowerShell
# OR
source .venv/bin/activate   # Mac/Linux

# Step 4: Install dependencies
pip install fastapi httpx pydantic    # Standard way
# OR
uv add fastapi httpx pydantic        # Modern way (pins to pyproject.toml)

# Step 5: Save dependencies
pip freeze > requirements.txt        # Standard way
# pyproject.toml is auto-updated with uv add

# Step 6: Verify
pip list                             # Should show your packages
python -c "import fastapi; print(fastapi.__version__)"  # Should work

# Step 7: When done working
deactivate                           # Exits the virtual environment
```

**What each step does:**
```
Step 1: mkdir factory-agent
  Creates a project folder

Step 2: python -m venv .venv
  Creates .venv/ with Python, pip, and activate script
  ┌──────────────────────────────────┐
  │ .venv/                           │
  │ ├── Scripts/ or bin/             │
  │ │   ├── python.exe               │
  │ │   ├── pip.exe                  │
  │ │   └── activate                 │
  │ └── Lib/site-packages/           │
  │     └── (empty - no packages yet)│
  └──────────────────────────────────┘

Step 3: activate
  Modifies your shell's PATH to use .venv's Python first
  Your prompt changes: (venv) $ shows you're "inside" the environment

Step 4: pip install fastapi httpx pydantic
  Downloads and installs packages into .venv/Lib/site-packages/
  ┌──────────────────────────────────┐
  │ .venv/Lib/site-packages/         │
  │ ├── fastapi/                     │
  │ ├── httpx/                       │
  │ ├── pydantic/                    │
  │ └── ... (dependencies)           │
  └──────────────────────────────────┘

Step 5: pip freeze > requirements.txt
  Saves exact versions so others can recreate your environment:
  fastapi==0.110.0
  httpx==0.27.0
  pydantic==2.6.1

Step 7: deactivate
  Restores your shell's PATH to use system Python
  Prompt returns to normal
```

---

### 7. Working with an Existing Project

When you clone a project that uses virtual environments:

```bash
# Step 1: Clone the project
git clone https://github.com/user/factory-agent.git
cd factory-agent

# Step 2: Create and activate venv
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# OR
source .venv/bin/activate    # Mac/Linux

# Step 3: Install dependencies
# If requirements.txt exists:
pip install -r requirements.txt

# If pyproject.toml exists:
pip install -e ".[dev]"     # Install with dev dependencies
# OR
uv sync                     # If using uv

# Step 4: Verify everything works
python -c "import fastapi; print('FastAPI OK')"
pytest                      # Run tests to verify setup
```

---

### 8. Project Structure Best Practices

```
factory-agent/
├── .venv/                  # Virtual environment (git-ignored)
├── src/                    # Your source code
│   └── factory_agent/
│       ├── __init__.py
│       ├── main.py
│       └── sensors.py
├── tests/                  # Test files
│   └── test_sensors.py
├── pyproject.toml          # Project config and dependencies
├── requirements.txt        # Pinned dependencies (generated)
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

**What goes in `.gitignore`:**
```gitignore
# Virtual environment
.venv/
venv/
env/

# Python cache
__pycache__/
*.pyc
*.pyo

# IDE
.vscode/
.idea/

# Environment variables
.env
.env.local
```

---

### Summary

Always work inside a virtual environment. Use `uv` for speed if possible, or `venv` for zero-dependency setup. Lock your dependencies with `pip freeze > requirements.txt` or, better yet, use `pyproject.toml` for a clean, modern project layout.

**Key takeaways:**
- Always create a `.venv` for each project
- Activate before installing packages
- Use `pyproject.toml` for modern projects
- Use `uv` for faster installs
- Never commit `.venv/` to git
- Pin dependencies to avoid version conflicts

---

### Quick Reference Table

| Command | Purpose | Example |
|---------|---------|---------|
| `python -m venv .venv` | Create venv | Standard creation |
| `uv venv` | Create venv (fast) | Modern creation |
| `.venv\Scripts\Activate.ps1` | Activate (Windows) | Enters venv |
| `source .venv/bin/activate` | Activate (Mac/Linux) | Enters venv |
| `deactivate` | Exit venv | Returns to system Python |
| `pip install pkg` | Install package | `pip install fastapi` |
| `uv add pkg` | Install + pin | `uv add fastapi` |
| `pip freeze > requirements.txt` | Save versions | Generates requirements file |
| `pip install -r requirements.txt` | Install from file | Recreates environment |
| `pip install -e ".[dev]"` | Editable install | Install project + dev deps |
| `pip list` | Show packages | Lists installed packages |
| `which python` | Check Python path | Verifies correct venv |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Which `python` runs?** On a Linux robot, the project lives in `/home/robot/factory-agent`, and the only system interpreter is `/usr/bin/python`. Before activation, `echo $PATH` prints `/usr/local/bin:/usr/bin:/bin`. Predict each `which python` line:

```bash
cd /home/robot/factory-agent
source .venv/bin/activate
which python            # (a)
cd /tmp
which python            # (b)
deactivate
which python            # (c)
```

What does `echo $PATH` print right after `source .venv/bin/activate`?

**Q2. Does this version satisfy the spec?** The chapter's `pyproject.toml` requires `"fastapi>=0.110"` and `requires-python = ">=3.11"`. For each candidate, answer yes or no:
1. FastAPI `0.100.0`
2. FastAPI `0.99.1`
3. FastAPI `0.115.2`
4. Python `3.10.12`
5. Python `3.12.3`

**Q3. Am I inside the venv?** `sys.prefix` is the root of the *currently running* environment, and `sys.base_prefix` is the root of the base Python it was created from. Predict the output of each command:

```bash
python -c "import sys; print(sys.prefix != sys.base_prefix)"            # system Python, no venv active
.venv/bin/python -c "import sys; print(sys.prefix != sys.base_prefix)"  # venv Python, NOT activated
```

**Q4. Trace Mistake 1.** `httpx` is not installed anywhere yet. Predict what the last line prints:

```bash
python -m venv .venv
pip install httpx                   # venv NOT activated yet
source .venv/bin/activate
python -c "import httpx; print('ok')"
```

**Q5. What does `-e ".[dev]"` install?** In a fresh, activated venv inside the chapter's `factory-agent` folder, list everything that `pip install -e ".[dev]"` installs, and what changes if you run `pip install -e .` instead.

### Coding Exercises

**E1 (Easy). Guard your scripts.** Write `in_virtualenv() -> bool` that returns `True` only when the running interpreter belongs to a virtual environment. Then show how a robot bring-up script would print `Refusing to run outside a venv` to stderr and exit with code `1` when it returns `False`.

```python
in_virtualenv()   # True when run with .venv/bin/python, False with /usr/bin/python
```

**E2 (Easy–Medium). Read a freeze file.** Write `parse_requirements(text: str) -> dict[str, str]` for `pip freeze`-style text. Map lowercase package name to pinned version. Skip blank lines and strip `#` comments (whole-line or trailing). Raise `ValueError("Unpinned requirement: '<line>'")` for any line without `==`.

```python
parse_requirements("# pinned by pip freeze\nFastAPI==0.110.0\n\nhttpx==0.27.0  # http client\npydantic==2.6.1\n")
# {'fastapi': '0.110.0', 'httpx': '0.27.0', 'pydantic': '2.6.1'}
parse_requirements("fastapi>=0.110")
# ValueError: Unpinned requirement: 'fastapi>=0.110'
```

**E3 (Medium). A tiny version checker.** Write `satisfies(version: str, spec: str) -> bool` for purely numeric versions such as `0.115.2`. `spec` is one or more comma-separated clauses using `>=`, `<=`, `==`, `<`, `>`; all clauses must hold. Compare versions **numerically, part by part**, treating missing parts as `0` (so `2.0 == 2.0.0`).

```python
satisfies("0.99.1", ">=0.110")    # False
satisfies("2.6.1", ">=2.0,<3")    # True
satisfies("3.0", ">=2.0,<3")      # False
satisfies("2.0", "==2.0.0")       # True
```

#### Dry-Run: Answers

**Q1.**

| Line | Output | Why |
|------|--------|-----|
| (a) | `/home/robot/factory-agent/.venv/bin/python` | `activate` put `.venv/bin` at the **front** of `$PATH` |
| (b) | `/home/robot/factory-agent/.venv/bin/python` | Activation belongs to the *shell session*, not the folder. `cd` does not undo it |
| (c) | `/usr/bin/python` | `deactivate` restores the old `$PATH` |

Right after activation, `echo $PATH` prints `/home/robot/factory-agent/.venv/bin:/usr/local/bin:/usr/bin:/bin`. The shell searches left to right, so the venv's `python` and `pip` win.

**Q2.**

| Candidate | Satisfies? | Reason |
|-----------|------------|--------|
| FastAPI `0.100.0` | no | $100 < 110$ in the second part |
| FastAPI `0.99.1` | no | $99 < 110$. Versions compare **numerically per part**, not as text (as text, `"0.99"` would wrongly sort after `"0.110"`) |
| FastAPI `0.115.2` | yes | $115 \ge 110$ |
| Python `3.10.12` | no | $10 < 11$ in the minor part; pip refuses to install the project |
| Python `3.12.3` | yes | $12 \ge 11$ |

**Q3.** Output:

```bash
False
True
```

You do not need to *activate* a venv to use it. Running its interpreter by path (Mistake 3's fix) is enough, because `sys.prefix` points to `.venv` while `sys.base_prefix` still points to the base install. Activation only changes `$PATH` for convenience.

**Q4.** It prints a traceback ending in:

```bash
ModuleNotFoundError: No module named 'httpx'
```

| Step | Which `pip`/`python` | Effect |
|------|----------------------|--------|
| `python -m venv .venv` | system | creates an empty `.venv` |
| `pip install httpx` | **system** `pip` (not activated) | `httpx` goes into the global site-packages |
| `source .venv/bin/activate` | | `.venv/bin` moves to the front of `$PATH` |
| `python -c "import httpx"` | **venv** `python` | searches only `.venv`'s site-packages (venvs do not see global packages by default), so the import fails |

**Q5.** `pip install -e ".[dev]"` installs:
- the project `factory-agent` itself in **editable** mode (`-e`: edits under `src/` take effect without reinstalling),
- its core `dependencies`: `fastapi>=0.110`, `httpx>=0.27`, `pydantic>=2.0` (plus their own sub-dependencies),
- the `dev` extra: `pytest` and `ruff`.

`pip install -e .` installs the same thing **without** `pytest` and `ruff`. That is what you want on the robot itself, where no tests or linting run.

**E1 — reference solution**

```python
import sys

def in_virtualenv() -> bool:
    # Inside a venv, sys.prefix is the .venv folder; sys.base_prefix is the base Python.
    return sys.prefix != sys.base_prefix

if __name__ == "__main__":
    if not in_virtualenv():
        print("Refusing to run outside a venv", file=sys.stderr)
        sys.exit(1)
    print("Starting robot bring-up...")
```

This works whether or not the venv was activated (see Q3), which makes it more reliable than checking `$PATH` or the prompt.

**E2 — reference solution**

```python
def parse_requirements(text: str) -> dict[str, str]:
    pins: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()   # drop comments, then whitespace
        if not line:
            continue
        if "==" not in line:
            raise ValueError(f"Unpinned requirement: {line!r}")
        name, version = line.split("==", 1)
        pins[name.strip().lower()] = version.strip()
    return pins
```

Package names are case-insensitive on PyPI (`FastAPI` and `fastapi` are the same package), so we normalise to lowercase. Cost: $O(\text{characters})$.

**E3 — reference solution**

```python
def _vtuple(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))

def _pad(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    n = max(len(a), len(b))
    return a + (0,) * (n - len(a)), b + (0,) * (n - len(b))

def satisfies(version: str, spec: str) -> bool:
    for clause in spec.split(","):
        clause = clause.strip()
        # Two-character operators must be tried before '<' and '>'.
        for op in (">=", "<=", "==", "<", ">"):
            if clause.startswith(op):
                target = clause[len(op):].strip()
                break
        else:
            raise ValueError(f"Unknown operator in {clause!r}")
        v, t = _pad(_vtuple(version), _vtuple(target))
        ok = {">=": v >= t, "<=": v <= t, "==": v == t, "<": v < t, ">": v > t}[op]
        if not ok:
            return False
    return True
```

Why it works: Python compares tuples element by element, so `(0, 99, 1) < (0, 110, 0)` because $99 < 110$. That is exactly the numeric rule from Q2. Padding with zeros makes `(2, 0)` equal to `(2, 0, 0)`. Trace for `"3.0"` against `">=2.0,<3"`: $(3,0) \ge (2,0)$ holds, then $(3,0) < (3,0)$ fails, so the result is `False`. (Real projects should use `packaging.specifiers.SpecifierSet`, which also handles pre-releases like `2.0rc1`.)

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Virtual Environments**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter4 virtual environments**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.

