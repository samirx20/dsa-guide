# Part 0, Topic 1: Developer Environment, Linux & Git
## Chapter 2: Git Internals, Branching & Multi-Repo Robotics Workflows

Imagine you just tuned your robot's PID motor controller and got it driving smoothly at $2.0\text{ m/s}$. Next, you edit five C++ files to add obstacle avoidance — and suddenly the robot spins in circles and crashes into a wall. Worse, you can't remember what your working PID gains were an hour ago, and your teammate is simultaneously editing the exact same files on their laptop!

Before **Git**, engineers resorted to naming folders `robot_code_final`, `robot_code_final_v2`, and `robot_code_WORKING_DO_NOT_TOUCH`.
**Git** is a distributed **time machine and collaboration engine** for your code. Once you understand how Git actually stores snapshots and how branches are simply lightweight 40-character sticky notes pointing at commits, you will never fear a merge conflict or detached `HEAD` again.

---

### 1. How Git Actually Works: The Four Zones

Most beginners memorize Git commands like magic spells without realizing that Git moves your files across **four distinct zones**:

1. **Working Directory (Your Sandbox):** The actual `.cpp`, `.py`, and `.yaml` files sitting in your folder that you edit in VS Code or Vim.
2. **Staging Index (The Loading Dock):** A draft checklist of exact changes you want to bundle into your *next* snapshot. You move changes here using `git add`.
3. **Local Repository (`.git/` — Your Time Machine):** A hidden folder on your laptop storing every committed snapshot (`git commit`) as an immutable cryptographic hash (SHA-1, like `a1b2c3d`). Works 100% offline!
4. **Remote Repository (`origin` — GitHub / GitLab):** The shared cloud copy of the repository where teammates push (`git push`) and pull (`git pull`) commits.

```
The Four Zones of Git (How Code Flows from Your Editor to GitHub):

  1. WORKING DIRECTORY      2. STAGING INDEX        3. LOCAL REPO (.git)       4. REMOTE (GitHub)
  (Modified files on disk)  (Next snapshot draft)   (Committed history DAG)    (Team cloud server)
 +----------------------+  +---------------------+  +-----------------------+  +-------------------+
 | pid_controller.cpp   |  | Staged changes ready|  | [c10a] -> [f49b]      |  | origin/main       |
 | lidar_driver.cpp     |  | to be photographed  |  | (Permanent snapshots) |  |                   |
 +----------------------+  +---------------------+  +-----------------------+  +-------------------+
            |                         |                         |                        ^
            |------ git add --------->|                         |                        |
            |                         |----- git commit -m ---->|                        |
            |                         |                         |------ git push ------->|
            |<----------------------- git pull (fetch + merge) --------------------------|
```

#### Creating & Recording Snapshots (`init`, `status`, `add`, `commit`, `log`)

```bash
# 1. Configure your name and email once on a new machine (stored in ~/.gitconfig)
git config --global user.name "Sam Robotics"
git config --global user.email "sam@robotics.dev"

# 2. Turn the current folder into a new Git repository (creates hidden .git/ folder)
git init

# 3. Check which files are modified, untracked, or staged right now
git status

# 4. Inspect the exact line-by-line '+' and '-' changes before staging
git diff

# 5. Stage specific files (move from Working Directory -> Staging Index)
git add src/pid_controller.cpp config/gains.yaml

# 6. Photograph the Staging Index as a permanent commit in .git/
git commit -m "Tune wheel PID gains for 2.0 m/s cruise"

# 7. View the commit graph compactly in the terminal
git log --oneline --graph --all
```

**What's happening:**
```bash
git add src/pid_controller.cpp config/gains.yaml
#   ^^^
#   Why does Git have a separate Staging Index ('git add') before 'git commit'?
#   Suppose you edited 5 files while debugging: 2 files fix a LiDAR bug, and
#   3 files are messy print statements. 'git add' lets you stage ONLY the 2 clean
#   files into a focused, atomic commit without committing your messy debug prints!

git commit -m "Tune wheel PID gains for 2.0 m/s cruise"
#          ^^
#          Hashes the staged snapshot into a unique 40-character SHA-1 ID
#          (abbreviated to 7 chars like 'f49b81c'), records the author, timestamp,
#          and a pointer to the parent commit!

git log --oneline --graph --all
#       ^^^^^^^^^ ^^^^^^^ ^^^^^
#       |         |       Shows all branches (not just the currently checked-out branch)
#       |         Draws ASCII lines connecting parent and child commits
#       Condenses each commit to 1 line: "<7-char-SHA> <commit message>"
```

---

### 2. What Is a Branch, Really? (Just a 40-Byte Pointer!)

In older version control systems, creating a branch meant copying the entire 500 MB project directory into a new folder.

In Git, a **branch** does **not** copy any files! A branch is literally just a **tiny 40-byte text file** inside `.git/refs/heads/` that stores the **SHA-1 hash of a single commit** — like a movable sticky note attached to a commit node!

And what is **`HEAD`**? **`HEAD`** is simply a special pointer that says: *"Which branch sticky note am I currently standing on?"*

```
How Git Branches & HEAD Actually Work (Directed Acyclic Graph of Commits):

  Commit 1              Commit 2              Commit 3 (New feature commit!)
 +----------+          +----------+          +----------+
 |  a1b2c3  | <------- |  d4e5f6  | <------- |  98f01a  |
 | "Init"   |  parent  | "Add PID"|  parent  | "Add EKF"|
 +----------+          +----------+          +----------+
                            ^                     ^
                            |                     |
                          [main]             [feat/ekf-slam]
                                                  ^
                                                  |
                                                HEAD  (You are here!)
```

Notice the arrow direction in the diagram above: **every commit points backward to its parent commit**!
- When you create a branch (`git switch -c feat/ekf-slam`), Git takes $0.001$ seconds to create a new pointer pointing at your current commit (`d4e5f6`).
- When you make a new commit (`98f01a`), Git creates the new commit pointing back to `d4e5f6` and slides the `feat/ekf-slam` sticky note forward to `98f01a` — leaving `main` completely untouched and safe at `d4e5f6`!

```bash
# 1. Create a new branch 'feat/ekf-slam' AND switch HEAD to it in one command
git switch -c feat/ekf-slam
# (Equivalent older syntax: git checkout -b feat/ekf-slam)

# 2. List all branches (* marks where HEAD is currently pointing)
git branch

# 3. Switch back to 'main' (instantly rewires Working Directory to d4e5f6!)
git switch main
```

**What's happening:**
```bash
git switch -c feat/ekf-slam
#          ^^ ^^^^^^^^^^^^^
#          |  Name of the new branch sticky note.
#          '-c' ("create"): creates a new 40-byte file '.git/refs/heads/feat/ekf-slam'
#                           containing the current commit's SHA-1 hash, and points HEAD to it!

git switch main
#   ^^^^^^^^^^^
#   1. Moves HEAD to point to the 'main' branch pointer (d4e5f6).
#   2. Updates the files in your Working Directory to match snapshot d4e5f6!
```

---

### 3. Combining Work: `git merge` vs. `git rebase`

Suppose you finished building `feat/ekf-slam` (`C3`, `C4`), while your teammate merged a battery monitor fix (`C2`) onto `main`. Your commit graph has diverged into a Y-shape:

```
Before Combining: Diverged History

                  [feat/ekf-slam]
                    v
         C3 <----- C4
        /
  C1 <-+
        \
         C2
          ^
        [main]
```

You have two ways to bring these histories together:

#### Option 1: `git merge` (Preserves Exact Chronological History)
Creates a brand-new **Merge Commit (`M`)** that has **two parents** (`C2` and `C4`), tying the two branches back together without rewriting any existing commit hashes.

```
1. After 'git switch main && git merge feat/ekf-slam':

         C3 <----- C4
        /            \
  C1 <-+              +--- M  <-- [main] (Merge commit has 2 parents: C2 & C4)
        \            /
         C2 <-------+
```

#### Option 2: `git rebase` (Creates a Clean, Linear History)
Replays your feature commits (`C3`, `C4`) one by one directly on top of the tip of `main` (`C2`), creating brand-new commits (`C3'`, `C4'`) so the history reads like a straight line.

```
2. After 'git switch feat/ekf-slam && git rebase main':

  C1 <----- C2 <----- C3' <----- C4'
             ^                    ^
           [main]           [feat/ekf-slam] (Clean straight line!)
```

> **Golden Rule of Rebasing:** Never `git rebase` a shared public branch (like `main`) that teammates have already pulled! Only rebase your own local feature branch before opening a Pull Request.

---

### 4. Resolving Merge Conflicts Step-by-Step (Zero Panic!)

A **Merge Conflict** is not an error or a broken repository. It simply happens when **two branches modified the exact same lines of the exact same file**, so Git pauses and asks a human: *"Did you want version A, version B, or a combination of both?"*

When a conflict happens, Git inserts three visual markers directly into the conflicted file:

```cpp
// Inside config/robot_limits.hpp during a merge conflict:
<<<<<<< HEAD (Current branch: main)
const double MAX_VELOCITY = 2.0; // Tuned for indoor carpet
=======
const double MAX_VELOCITY = 3.5; // Boosted for outdoor asphalt test
>>>>>>> feat/ekf-slam (Incoming branch)
```

**What's happening & How to Resolve It in 3 Steps:**
```cpp
// 1. Everything between '<<<<<<< HEAD' and '=======' is what YOUR current branch has.
// 2. Everything between '=======' and '>>>>>>> feat/ekf-slam' is what the INCOMING branch has.
//
// STEP 1: Edit the file to keep the exact code you want AND DELETE all three marker lines
//         ('<<<<<<<', '=======', '>>>>>>>'):
const double MAX_VELOCITY = 2.5; // Safe compromise for both surfaces

// STEP 2: Tell Git the conflict in this file is resolved by staging it!
// $ git add config/robot_limits.hpp

// STEP 3: Complete the merge commit!
// $ git commit -m "Merge feat/ekf-slam and set MAX_VELOCITY to 2.5"
```

---

### 5. GitHub Pull Requests (PRs), `.gitignore` & Multi-Repo Robotics

In professional robotics teams, nobody pushes directly to `main` (`main` is **branch-protected**). Instead, every change goes through a **GitHub Pull Request (PR)** workflow:

```
The Professional Robotics GitHub Pull Request (PR) Pipeline:

  [Laptop: feat/voxel-filter]
              |
              |  1. git push -u origin feat/voxel-filter
              v
  [GitHub: Open Pull Request] ---> 2. Automated CI Runs (Compiles C++, runs unit tests)
              |
              +------------------> 3. Teammate Code Review (Comments on diff lines)
              |
              v
  [GitHub: Squash & Merge into origin/main] ---> 4. Robot pulls clean, tested main!
```

#### `.gitignore` for C++, Python & ROS 2 Robotics Builds
Compiling robotics code generates **gigabytes** of build artifacts (`build/`, `install/`, `.o` object files, `__pycache__/`, and massive multi-gigabyte sensor recordings `*.bag` / `*.mcap`).

**Never commit compiled binaries or sensor bags into Git!** Doing so bloats the `.git` folder forever so nobody can clone the repo. Always create a **`.gitignore`** file in the root of your repository before your very first commit:

```gitignore
# C++ & CMake / ROS 2 colcon build outputs
build/
install/
log/
*.o
*.so
*.a

# Python bytecode & virtual environments
__pycache__/
*.pyc
.venv/

# Massive robot sensor recordings (store in S3 / NAS, never in Git!)
*.bag
*.db3
*.mcap

# Secrets & local IDE clutter
.env
.vscode/
.DS_Store
```

#### Multi-Repo Robotics Workspaces (`vcstool` / `.repos`)
A real robot workspace (`~/ros2_ws/src/`) often combines 5 to 20 separate Git repositories (`lidar_driver`, `ekf_localization`, `nav2_planner`, `robot_bringup`). Rather than nesting Git repos inside each other manually, robotics teams list all repo URLs and branch/commit versions in a single `robot.repos` YAML file and sync them all at once using `vcs import src < robot.repos`!

---

### 6. Dry-Run Trace: Complete Feature Branch & GitHub PR Workflow

Let's trace an end-to-end 9-step workflow where you add a LiDAR filter to a team robotics repository:

| Step | Command Executed | Working Dir | Staging Index | Local Repo (`HEAD`) | Remote (`origin`) | What Happened |
|------|------------------|-------------|---------------|---------------------|-------------------|---------------|
| **1** | `git clone git@github.com:org/bot.git` | Clean (`c10a`) | Empty | `main -> c10a` | `main -> c10a` | Downloads repo & history to laptop |
| **2** | `git switch -c feat/voxel-filter` | Clean (`c10a`) | Empty | `feat/voxel-filter -> c10a` | `main -> c10a` | Creates new branch pointer at `c10a` |
| **3** | *(Edit `voxel.cpp` and `CMakeLists.txt`)* | **2 Modified** | Empty | `feat/voxel-filter -> c10a` | `main -> c10a` | Files modified on disk only |
| **4** | `git status` & `git diff` | 2 Modified | Empty | `feat/voxel-filter -> c10a` | `main -> c10a` | Inspects exact `+`/`-` line changes |
| **5** | `git add voxel.cpp CMakeLists.txt` | Clean | **2 Staged** | `feat/voxel-filter -> c10a` | `main -> c10a` | Moves changes to Staging Index |
| **6** | `git commit -m "Add 5cm voxel filter"` | Clean | Empty | `feat/voxel-filter -> d82f` | `main -> c10a` | Creates snapshot `d82f` (parent `c10a`) |
| **7** | `git push -u origin feat/voxel-filter` | Clean | Empty | `feat/voxel-filter -> d82f` | `feat/voxel-filter -> d82f` | Uploads branch `d82f` to GitHub |
| **8** | *(Open PR on GitHub & Merge to `main`)* | Clean | Empty | `feat/voxel-filter -> d82f` | `main -> e99b` | Teammate reviews & merges PR on GitHub |
| **9** | `git switch main && git pull` | Clean (`e99b`) | Empty | `main -> e99b` | `main -> e99b` | Syncs local `main` with merged GitHub `main` |

---

### 7. Common Mistakes & How to Fix Them

#### Mistake 1: Accidentally Committing a 2 GB `.bag` File or `build/` Folder
If you accidentally run `git add .` before setting up `.gitignore` and stage a huge `build/` directory or sensor bag, don't delete the file from disk with `rm`! Unstage it from Git's index while keeping the file safely on your hard drive using `git rm --cached`:

```bash
# BAD: 'git add .' staged build/ and a 2GB lidar.mcap file!
# FIX: Remove them from Git tracking (--cached) WITHOUT deleting them from disk:
git rm -r --cached build/ lidar.mcap
echo "build/" >> .gitignore
echo "*.mcap" >> .gitignore
git add .gitignore
git commit -m "Stop tracking build artifacts and mcap bags"
```

#### Mistake 2: Starting New Work on an Outdated Local `main` Branch
If you create a new branch off a 2-week-old local `main` without pulling first, you are guaranteed painful merge conflicts later.

```bash
# SAFE HABIT before starting ANY new feature branch:
git switch main
git pull origin main
git switch -c feat/my-new-feature
```

#### Mistake 3: Panicking Over `git reset --hard` vs. `git restore`
Need to undo uncommitted edits or unstage a file? Use modern, explicit commands (`git restore`) rather than destructive `git reset --hard` (which permanently wipes out all uncommitted work in your Working Directory):

```bash
# Unstage a file (move from Staging Index back to Working Directory, keeping edits):
git restore --staged src/pid_controller.cpp

# Discard uncommitted local edits in a single file back to the last commit:
git restore src/pid_controller.cpp
```

#### Mistake 4: Making Commits in a "Detached `HEAD`" State
If you check out a raw commit hash directly (`git checkout a1b2c3d`) instead of a branch name, `HEAD` points directly to the commit rather than a branch sticky note (**Detached `HEAD`**). Any new commits you make won't belong to any branch and will be orphaned when you switch back to `main`!

```
Detached HEAD vs. Attached Branch:

  Detached HEAD (Danger!):      [a1b2c3d] <--- HEAD (No branch sticky note here!)
  Fixed with 'git switch -c':   [a1b2c3d] <--- [rescue-branch] <--- HEAD (Safe!)
```

```bash
# If you accidentally entered Detached HEAD and made commits you want to keep:
# FIX: Immediately attach a new branch sticky note to your current HEAD!
git switch -c rescue-my-work
```

---

### 8. Quick Reference

| Command | What It Does | Zone Affected |
|---------|--------------|---------------|
| `git init` | Initialize a new Git repo in current folder | Creates `.git/` |
| `git clone <url>` | Download a remote repo and its entire commit history | Remote $\to$ Local |
| `git status` | Show modified, untracked, and staged files | Working Dir & Index |
| `git diff` | Show exact line-by-line unstaged changes (`--staged` for staged) | Working Dir vs. Index |
| `git add <file>` | Stage file changes for the next commit (`-p` for interactive hunks) | Working Dir $\to$ Index |
| `git commit -m "msg"` | Record staged snapshot permanently in commit graph | Index $\to$ Local Repo |
| `git log --oneline --graph` | Visualize commit history and branch pointers as ASCII art | Local Repo |
| `git switch -c <branch>` | Create a new branch pointer and move `HEAD` to it | Local Repo & Working Dir |
| `git switch <branch>` | Switch to an existing branch | Local Repo & Working Dir |
| `git merge <branch>` | Merge `<branch>` into the currently active branch | Local Repo |
| `git rebase <branch>` | Replay current branch's commits linearly on top of `<branch>` | Local Repo |
| `git push -u origin <br>` | Upload local branch commits to GitHub (`origin`) | Local Repo $\to$ Remote |
| `git pull` | Fetch new commits from GitHub and merge into current branch | Remote $\to$ Local |
| `git restore --staged <f>` | Unstage a file while keeping your code edits safe | Index $\to$ Working Dir |
| `git stash` / `git stash pop` | Temporarily shelve uncommitted changes to switch branches cleanly | Working Dir $\leftrightarrow$ Stash |

---

## Interactive Visualization & shadcn/ui Specification

### Component Blueprint for Claude
Build an interactive **Git Four-Zone Pipeline, Live Commit DAG & Merge Conflict Resolver** using **shadcn/ui** components so the learner can visually move files across zones, watch `HEAD` and branch pointers slide across SHA-1 commit nodes, and resolve conflicts interactively.

#### 1. Top-Level Layout (`<Card>` & `<Tabs>`)
- Wrap the visualiser in a `<Card className="p-6 border-border bg-card">` with three `<Tabs>` (`<TabsList>`, `<TabsTrigger>`, `<TabsContent>`):
  - **Tab 1: The Four Zones Pipeline (`Working Dir` $\to$ `Staging Index` $\to$ `.git` $\to$ `origin`)**
  - **Tab 2: Interactive Commit DAG (`HEAD`, `switch -c`, `merge` vs. `rebase`)**
  - **Tab 3: Interactive Merge Conflict Editor (`<<<<<<< HEAD` Resolver)**

#### 2. Tab 1: The Four Zones Pipeline
- **Controls:**
  - Action `<Button>` bar: `"Edit pid.cpp"`, `"Touch huge_scan.bag (2.1 GB)"`, `"git add pid.cpp"`, `"git add ."`, `"git commit -m '...'"`, `"git push"`, `"git restore --staged"`.
  - A `<Switch>` labeled `"Enable .gitignore (*.bag, build/)"`.
- **Visual Canvas:**
  - Four vertical `<Card>` swimlanes representing **1. Working Directory**, **2. Staging Index**, **3. Local Repo (`.git`)**, and **4. Remote (`origin`)**.
  - Clicking `"git add ."` with `.gitignore` **off** animates `huge_scan.bag` entering the Staging Index with a flashing `<Badge variant="destructive">WARNING: 2.1 GB Binary Staged!</Badge>`. Toggling `.gitignore` **on** shields the Staging Index with an automatic filter badge.
  - Include a live Dry-Run `<Table>` below the swimlanes showing the current state of all 4 zones.

#### 3. Tab 2: Interactive Commit DAG (`HEAD`, `merge` vs. `rebase`)
- **Controls:**
  - `<Button>` triggers: `"git commit (on active branch)"`, `"git switch -c feat/ekf"`, `"git switch main"`, `"git merge feat/ekf"`, `"git rebase main"`, and `"Reset Graph"`.
- **Visual Canvas:**
  - Render an SVG Directed Acyclic Graph (DAG) of commit circles labeled with 7-char SHA hashes (`a1b2c3`, `d4e5f6`) and parent arrows pointing left ($\leftarrow$).
  - Render branch pointers (`main`, `feat/ekf`) as floating `<Badge>` pills with animated connectors pointing to their target commit, and render `HEAD` as a highlighted gold `<Badge>` attached to the active branch.
  - Clicking `"git merge"` vs. `"git rebase"` animates the exact structural difference between a 2-parent Merge Commit (`M`) and linear replayed commits (`C3'`, `C4'`).

#### 4. Tab 3: Interactive Merge Conflict Editor
- **Controls:**
  - Resolution `<Button>` choices: `"Accept Current (main: 2.0 m/s)"`, `"Accept Incoming (feat/ekf: 3.5 m/s)"`, `"Custom Compromise (2.5 m/s)"`, followed by `"git add & git commit"`.
- **Visual Canvas:**
  - Display a syntax-highlighted code `<Card>` showing `<<<<<<< HEAD`, `=======`, and `>>>>>>> feat/ekf` markers with `<Tooltip>` explanations on each marker line, updating live as the learner resolves and stages the file.
