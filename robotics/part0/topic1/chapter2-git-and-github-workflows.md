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

### 2. What Is a Branch, Really? (Just a 41-Byte Pointer!)

In older version control systems, creating a branch meant copying the entire 500 MB project directory into a new folder.

In Git, a **branch** does **not** copy any files! A branch is literally just a **tiny 41-byte text file** (40 hex characters plus a newline) inside `.git/refs/heads/` that stores the **SHA-1 hash of a single commit** — like a movable sticky note attached to a commit node!

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
#          '-c' ("create"): creates a new 41-byte file '.git/refs/heads/feat/ekf-slam'
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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Which zone is each change in?** A repo has three tracked, committed files: `pid.cpp`, `lidar.cpp`, `ekf.cpp`. You run:

```bash
echo "kp = 1.2" >> pid.cpp
echo "range_max = 12" >> lidar.cpp
echo "q = 0.01" >> ekf.cpp
git add pid.cpp lidar.cpp
echo "ki = 0.05" >> pid.cpp
git status --short
```

1. Predict the three lines printed by `git status --short` (first column = Staging Index, second column = Working Directory).
2. You now run `git commit -m "Tune gains"`. Which of the four edits are inside the commit, and what does `git status --short` print afterwards?

**Q2. Where do the sticky notes point?** Start from the chapter's diagram: `a1b2c3 <- d4e5f6`, with `main` and `HEAD` on `d4e5f6`. Then (assume you edit a tracked file before each commit):

```bash
git switch -c feat/ekf-slam
git commit -am "Add EKF predict"     # creates commit 98f01a
git commit -am "Add EKF update"      # creates commit 3c7d22
git switch main
git commit -am "Fix battery monitor" # creates commit 5e6b90
git log --oneline
```

Where do `main`, `feat/ekf-slam` and `HEAD` point at the end, and what does the final `git log --oneline` print (newest first)?

**Q3. Merge vs. rebase bookkeeping.** Use the chapter's diverged history: `C1 <- C2` on `main`, and `C1 <- C3 <- C4` on `feat/ekf-slam`.
1. After `git switch main && git merge feat/ekf-slam`: how many commits are reachable from `main`, how many parents does the new commit have, and do `C3`/`C4` keep their hashes?
2. If instead you had run `git switch feat/ekf-slam && git rebase main`: how many commits are reachable from `feat/ekf-slam`, which hashes are brand new, and where does `main` point?

**Q4. Read the conflict markers.** You are on `feat/outdoor` and run `git merge main`. Git writes:

```cpp
<<<<<<< HEAD
const double MAX_ACCEL = 1.5; // outdoor gravel
=======
const double MAX_ACCEL = 0.8; // indoor tile
>>>>>>> main
```

1. Which value came from `feat/outdoor` and which from `main`?
2. You choose `1.0` as the compromise. List the exact remaining steps until the merge is finished.

**Q5. Does `.gitignore` catch it?** Using the chapter's `.gitignore` exactly as written, which of these paths are ignored?

```bash
build/CMakeCache.txt
src/lidar/build/voxel.o
scans/run1.mcap
config/.env
src/env.py
notes.bag.txt
src/log/parser.cpp
src/logger/log.cpp
```

### Coding Exercises

**E1 (Easy). Fresh feature branch.** Automate the "safe habit" from Mistake 2. Write a bash function `new_feature <name>` that switches to `main`, pulls `origin main`, and creates and switches to `feat/<name>`. Each step must run only if the previous one succeeded. With no argument it prints `usage: new_feature <name>` to stderr and returns `1`.

```bash
new_feature voxel-filter   # ends on branch feat/voxel-filter, created from an up-to-date main
new_feature                # stderr: usage: new_feature <name>   ($? = 1)
```

**E2 (Easy–Medium). Catch the 2 GB bag before you commit.** Write `staged_too_big <limit_kb>`. For each **staged** file (`git diff --cached --name-only`) that exists on disk and is larger than `limit_kb` kilobytes (1 KB = 1024 bytes), print `<path> <size_in_whole_KB>KB`. Return `1` if any file was too big, otherwise `0`, so it can be used as a pre-commit check.

```bash
# lidar.mcap (3,000,000 bytes) and notes.txt (100 bytes) are staged
staged_too_big 1024    # prints: lidar.mcap 2929KB     ($? = 1)
staged_too_big 5000    # prints nothing               ($? = 0)
```

**E3 (Medium). Branch drift report.** Write `branch_report [base]` (default base `main`). For every local branch other than the base, print `<branch>: ahead <A>, behind <B>`, where `A` is the number of commits on the branch that are not on the base and `B` is the number of commits on the base that are not on the branch. Hint: `git rev-list --left-right --count base...branch` prints `B A`.

```bash
# feat/a has 2 commits main doesn't; main has 1 commit feat/a doesn't
branch_report
# feat/a: ahead 2, behind 1
# feat/b: ahead 0, behind 0
```

#### Dry-Run: Answers

**Q1.**
1. Output:

```bash
MM pid.cpp
M  lidar.cpp
 M ekf.cpp
```

| File | Index column | Work-tree column | Why |
|------|--------------|------------------|-----|
| `pid.cpp` | `M` | `M` | The `kp` line was staged, then the `ki` line was added *after* `git add`, so the file is modified in both zones |
| `lidar.cpp` | `M` | (blank) | Staged, and not touched since |
| `ekf.cpp` | (blank) | `M` | Edited but never staged |

2. The commit contains exactly what was in the Staging Index: the `kp = 1.2` line and the `range_max = 12` line. The `ki = 0.05` edit and the `ekf.cpp` edit stay in the Working Directory, so `git status --short` prints:

```bash
 M ekf.cpp
 M pid.cpp
```

`git add` snapshots the file *at that moment*. It is not a standing "always include this file" flag.

**Q2.** At the end: `feat/ekf-slam` points at `3c7d22`, `main` points at `5e6b90`, and `HEAD` is attached to `main`. Output:

```bash
5e6b90 Fix battery monitor
d4e5f6 Add PID
a1b2c3 Init
```

| Step | `main` | `feat/ekf-slam` | `HEAD` on |
|------|--------|-----------------|-----------|
| start | `d4e5f6` | (none) | `main` |
| `switch -c feat/ekf-slam` | `d4e5f6` | `d4e5f6` | `feat/ekf-slam` |
| commit `98f01a` | `d4e5f6` | `98f01a` | `feat/ekf-slam` |
| commit `3c7d22` | `d4e5f6` | `3c7d22` | `feat/ekf-slam` |
| `switch main` | `d4e5f6` | `3c7d22` | `main` |
| commit `5e6b90` (parent `d4e5f6`) | `5e6b90` | `3c7d22` | `main` |

Plain `git log` only walks parent pointers back from `HEAD`, so `98f01a` and `3c7d22` are not shown. You would need `--all` to see them.

**Q3.**
1. Merge: `main` reaches **5** commits ($C1, C2, C3, C4, M$). `M` has **2** parents ($C2$ and $C4$). Merging never rewrites existing commits, so `C3` and `C4` keep their hashes.
2. Rebase: `feat/ekf-slam` reaches **4** commits ($C1, C2, C3', C4'$). `C3'` and `C4'` are brand-new hashes, because each has a different parent (and therefore different content to hash) from the original. `main` still points at `C2`, since rebasing the feature branch only moves the feature branch's pointer. The old `C3`/`C4` are no longer on any branch.

**Q4.**
1. The section between `<<<<<<< HEAD` and `=======` is your **current** branch, `feat/outdoor`: `1.5`. The section between `=======` and `>>>>>>> main` is the **incoming** branch, `main`: `0.8`.
2. Steps:

```bash
# 1. Edit the file so it contains ONLY this line (all 3 marker lines deleted):
#    const double MAX_ACCEL = 1.0; // compromise for gravel and tile
# 2. Mark the conflict as resolved by staging the file:
git add config/robot_limits.hpp
# 3. Finish the merge commit:
git commit -m "Merge main into feat/outdoor; set MAX_ACCEL to 1.0"
```

**Q5.** Ignored: `build/CMakeCache.txt`, `src/lidar/build/voxel.o`, `scans/run1.mcap`, `config/.env`, `src/log/parser.cpp`. Not ignored: `src/env.py`, `notes.bag.txt`, `src/logger/log.cpp`.

| Path | Ignored? | Matching rule |
|------|----------|---------------|
| `build/CMakeCache.txt` | yes | `build/` |
| `src/lidar/build/voxel.o` | yes | `build/` (with no leading `/`, it matches at any depth); `*.o` also matches |
| `scans/run1.mcap` | yes | `*.mcap` |
| `config/.env` | yes | `.env` matches that name in any folder |
| `src/env.py` | no | `.env` must match the whole name, and `env.py` is a different name |
| `notes.bag.txt` | no | `*.bag` needs the name to **end** in `.bag` |
| `src/log/parser.cpp` | **yes (surprise!)** | `log/` matches *any* folder named `log`, not just the colcon `log/` at the root |
| `src/logger/log.cpp` | no | `logger` is not `log`, and `log/` only matches directories |

The fix for the surprise is to anchor root-only patterns with a leading slash: `/log/`, `/build/`, `/install/`. You can check any path with `git check-ignore -v <path>`.

**E1 — reference solution**

```bash
new_feature() {
    local name="$1"
    if [ -z "$name" ]; then
        echo "usage: new_feature <name>" >&2
        return 1
    fi
    # '&&' chain: if the pull fails (e.g. offline), no branch is created from a stale main
    git switch main && git pull origin main && git switch -c "feat/$name"
}
```

The function's exit code is the exit code of the last command in the chain that ran, so callers can tell whether it worked.

**E2 — reference solution**

```bash
staged_too_big() {
    local limit_kb="$1"
    local limit_bytes=$((limit_kb * 1024))
    local bad=0
    local f size
    while IFS= read -r f; do
        [ -f "$f" ] || continue              # staged deletions have no file on disk
        size=$(wc -c < "$f")                 # size in bytes
        if [ "$size" -gt "$limit_bytes" ]; then
            echo "$f $((size / 1024))KB"     # integer division gives whole KB
            bad=1
        fi
    done < <(git diff --cached --name-only)
    return "$bad"
}
```

Check: $3{,}000{,}000 / 1024 = 2929.69$, so integer division prints `2929KB`, and that is larger than $1024 \times 1024 = 1{,}048{,}576$ bytes. Reading line by line with `IFS= read -r` keeps paths that contain spaces intact.

**E3 — reference solution**

```bash
branch_report() {
    local base="${1:-main}"
    local br behind ahead
    for br in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
        [ "$br" = "$base" ] && continue
        # left side of 'base...br' = commits only on base, right side = only on br
        read -r behind ahead < <(git rev-list --left-right --count "$base...$br")
        echo "$br: ahead $ahead, behind $behind"
    done
}
```

Why it works: `base...branch` (three dots) is the symmetric difference, meaning the commits reachable from exactly one of the two refs. `--left-right --count` splits that set into two counts. A branch that is "behind" by more than 0 is a candidate for `git rebase main` before you open its PR. Cost: one graph walk per branch.

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
