# Part 0, Topic 1: Developer Environment, Linux & Git
## Chapter 1: The Command Line, Linux Processes & Robot Shells

Real robots do not have monitors, mice, or desktop icons bolted to their chassis. Whether you are programming a quadruped walking robot, an autonomous drone running an NVIDIA Jetson, or a warehouse AMR running ROS 2 on Ubuntu Linux, your primary interface to the robot's brain is the **Linux Command Line Interface (CLI)**.

If the terminal currently feels like a black box of cryptic incantations, this chapter will change that forever. We will strip away the mystery and build from absolute zero: how the shell talks to the Linux kernel, how hardware sensors show up as ordinary files inside `/dev`, how data flows through UNIX pipes, and how to inspect and control live robot processes over `ssh`.

---

### 1. What Are the Terminal, the Shell, and the Kernel?

Beginners often use the words *Terminal*, *Shell*, and *Linux* interchangeably, but they are three distinct layers working together:

1. **The Kernel (Linux):** The core of the operating system that talks directly to the hardware (CPU cores, RAM pages, LiDAR USB serial ports, motor CAN buses). Humans cannot type directly into the kernel.
2. **The Shell (`bash` or `zsh`):** A command-line interpreter program that reads your typed text commands (like `ls -la`), translates them into system calls for the Linux kernel, and prints the results back out.
3. **The Terminal Emulator:** Simply the graphical window on your screen that displays the text going into and coming out of the Shell.

```
How Your Keystrokes Reach the Robot Hardware:

  +--------------------+       Text        +--------------------+     System Calls     +--------------------+
  |  Terminal Window   |  -------------->  |   Shell (bash/zsh) |  ----------------->  |    Linux Kernel    |
  | (Displays characters|  <--------------  | (Parses commands,  |  <-----------------  | (Controls CPU, RAM,|
  |  on your screen)   |    Text Output    |  expands $PATH)    |    Exit Codes & I/O  |  /dev/ttyUSB0)     |
  +--------------------+                   +--------------------+                      +--------------------+
```

Every time you run a command in the Shell, that command finishes with a hidden integer called an **Exit Code (`$?`)**:
- **`0` means Success!** (Zero errors occurred.)
- **Any non-zero number (`1` to `255`) means Failure!** (For example, `1` for general error, `2` for syntax error, `127` for command not found, `139` for a C++ `Segmentation fault`).

That is why chaining commands with **`&&`** (e.g., `mkdir build && cd build && cmake ..`) is so safe: `cmd1 && cmd2` only runs `cmd2` if `cmd1` returned exit code `0`!

---

### 2. The Linux File Tree & Why "Everything Is a File"

Unlike Windows (which splits storage across drive letters like `C:\` and `D:\`), Linux organizes the entire system into a **single inverted tree** starting at the **Root directory (`/`)**.

Even more remarkably, Linux follows a design philosophy where **"Everything is a file"**:
- Regular code and configs are files in `/home` or `/etc`.
- Live kernel telemetry (CPU temperature, free RAM, running processes) is exposed as virtual files inside **`/proc`** and **`/sys`**.
- When you plug a USB LiDAR, IMU, or Arduino motor controller into your robot, Linux creates a special **device file** inside **`/dev`** (like `/dev/ttyUSB0` or `/dev/video0`). Reading bytes from `/dev/ttyUSB0` literally reads live laser measurements from the hardware sensor!

```
The Linux Filesystem Hierarchy on a Robot Computer:

                                   /  (Root of the entire filesystem)
          +------------+-----------+-----------+------------+------------+
          |            |           |           |            |            |
        /home        /dev        /etc        /opt         /proc        /var
          |            |           |           |            |            |
       /robot     ttyUSB0 (LiDAR)  |         /ros      cpuinfo, mem   /log (Crash &
          |       video0  (Camera) |        /humble    (Live kernel    boot logs)
     ros2_ws/     input/js0        |                    telemetry!)
                  (Gamepad)     netplan/
                                (Wi-Fi config)
```

#### Essential Navigation & File Commands

```bash
# 1. Where am I right now? (Print Working Directory)
pwd
# Output: /home/robot

# 2. List all files, including hidden '.' files, with permissions & sizes
ls -la

# 3. Change directory (Absolute path vs. Relative shortcuts)
cd /dev                 # Absolute path: starts with '/', jumps from anywhere
cd ~/ros2_ws            # '~' is shorthand for your home directory (/home/robot)
cd ..                   # '..' moves UP one parent folder ('.' means current folder)
cd -                    # '-' teleports back to whichever folder you were just in!

# 4. Create nested directories in one shot (-p creates missing parents)
mkdir -p ~/ros2_ws/src/lidar_driver/config

# 5. Copy, Move/Rename, and Remove
cp params.yaml backup_params.yaml           # Copy a single file
cp -r ~/ros2_ws/src ~/ros2_ws/src_backup    # Copy an entire directory recursively (-r)
mv backup_params.yaml config/               # Move (or rename) a file or directory
rm old_log.txt                              # Delete a file (Permanent! No Recycle Bin!)
```

**What's happening:**
```bash
ls -la
#  ^^^
#  '-l' asks for the LONG listing format (permissions, owner, size in bytes, timestamp).
#  '-a' shows ALL files, including hidden configuration files that start with a dot
#       (like '.bashrc', '.ssh', or '.gitignore').

mkdir -p ~/ros2_ws/src/lidar_driver/config
#     ^^ ^
#     |  '~' expands automatically to '/home/<your_username>'.
#     '-p' means "parents": create ros2_ws, src, lidar_driver, and config
#          in one shot without failing if any parent folder already exists!

cp -r ~/ros2_ws/src ~/ros2_ws/src_backup
#  ^^
#  '-r' (recursive) is required whenever copying or deleting a directory,
#  because Linux must walk inside the folder and copy all its children.
```

---

### 3. Standard Streams (`0`, `1`, `2`), Redirection (`>`), and Pipes (`|`)

Every Linux process is born with **three standard communication channels** (called **File Descriptors**) plugged into it:

1. **`stdin` (File Descriptor `0`):** Standard Input — text flowing *into* the program (default: your keyboard).
2. **`stdout` (File Descriptor `1`):** Standard Output — normal messages printed *by* the program (default: your terminal screen).
3. **`stderr` (File Descriptor `2`):** Standard Error — urgent warnings and errors printed *by* the program (default: also your terminal screen, kept separate from `stdout` so error logs don't corrupt data pipelines!).

```
The Three Standard Streams of Every Linux Process:

                         +--------------------------+
                         |                          | ---- stdout (1) ----> Normal Data Output
   stdin (0) ----------> |   Linux Process          |
  (Keyboard / Pipe)      |   (e.g., ./lidar_node)   |
                         |                          | ---- stderr (2) ----> Error & Warning Logs
                         +--------------------------+
```

You can re-wire these three streams like plumbing pipes using **Redirection (`>`, `>>`, `2>&1`)** and **Pipes (`|`)**:

```
How a UNIX Pipe (|) Connects Two Processes Together:

  +------------------------+                     +------------------------+
  | tail -f robot_nav.log  | --- stdout (1) ---> | stdin (0)  grep ERROR  | ---> Terminal Screen
  +------------------------+    (In-RAM Pipe)    +------------------------+
```

```bash
# 1. Redirect stdout (1) to overwrite a file ('>') or append to a file ('>>')
./calibrate_imu > calibration.log
./calibrate_imu >> calibration_history.log

# 2. Capture BOTH normal output (stdout=1) AND errors (stderr=2) into one file
./run_slam_node > slam_full.log 2>&1

# 3. Pipe ('|') connects stdout of Command A directly into stdin of Command B!
#    Live-stream a growing robot log file and filter ONLY lines containing "ERROR":
tail -f /var/log/robot_nav.log | grep --line-buffered "ERROR"
```

**What's happening:**
```bash
./run_slam_node > slam_full.log 2>&1
#               ^^^^^^^^^^^^^^^ ^^^^
#               |               Redirects descriptor 2 (stderr) into wherever
#               |               descriptor 1 (stdout) is currently pointing!
#               Redirects stdout (1) into the file 'slam_full.log' (overwriting it).

tail -f /var/log/robot_nav.log | grep --line-buffered "ERROR"
#    ^^                        ^ ^^^^
#    |                         | Filters incoming lines, printing only matches.
#    |                         Pipe: feeds tail's stdout directly into grep's stdin!
#    '-f' ("follow"): keeps the file open and outputs new lines in real time as the
#                     robot writes them! (Press Ctrl+C to stop following.)
```

---

### 4. Controlling Robot Processes (`ps`, `top`, `kill`, Signals & Background Jobs)

When your robot's autonomy stack is running, dozens of programs (camera drivers, LiDAR SLAM, path planners, motor controllers) run simultaneously as independent Linux **Processes**. Each process is assigned a unique integer badge called a **PID** (*Process ID*).

```
Signal Handling on a Robot Process (SIGTERM vs. SIGKILL):

  kill 4821     ---> Sends SIGTERM (15): "Please shut down!"
                     [motor_node catches signal -> sets wheel velocity = 0.0 -> exits safely]

  kill -9 4821  ---> Sends SIGKILL (9):  Kernel immediately destroys PID 4821!
                     [motor_node gets ZERO chance to stop motors or flush logs!]
```

```bash
# 1. Search all running processes on the machine for "motor_node"
ps aux | grep motor_node
# Output: robot   4821  12.4  0.8  /home/robot/ros2_ws/install/lib/motor_node

# 2. Politely ask PID 4821 to shut down cleanly (SIGTERM = Signal 15)
kill 4821

# 3. If PID 4821 is completely frozen and ignores SIGTERM, force-kill it via the kernel!
kill -9 4821

# 4. Run a long command in the background by appending '&' at the end
./lidar_driver > lidar.log 2>&1 &
```

**What's happening:**
```bash
kill 4821
#    ^^^^
#    Despite the violent name, 'kill' simply sends a signal to a PID!
#    By default, 'kill <PID>' sends SIGTERM (Signal 15) — a polite stop request, similar in
#    spirit to pressing Ctrl+C (which sends SIGINT = Signal 2). The C++ program catches it, runs its RAII destructors,
#    commands the wheel motors to 0.0 m/s, and exits cleanly.

kill -9 4821
#    ^^
#    '-9' sends SIGKILL (Signal 9).
#    The Linux kernel immediately vaporizes the process without letting it run
#    any cleanup code. Use '-9' ONLY when 'kill <PID>' fails to stop a hung process!
```

---

### 5. Permissions (`chmod`), Environment Variables (`export`), and `ssh`

#### 1. File Permissions (`chmod +x` and `/dev/ttyUSB0`)
If you write a startup script `launch_robot.sh` and try to run `./launch_robot.sh`, Linux will refuse with `Permission denied` unless the file's **Execute (`x`) bit** is turned on:

```
Decoding 'ls -la' Permission Bits:  -rwxr-xr--

  -       rwx               r-x               r--
  ^       ^^^               ^^^               ^^^
  File    Owner (User)      Group             Others
  Type    Read/Write/Exec   Read/-/Exec       Read/-/-
```

```bash
# Grant Execute (+x) permission so the script or binary can be run:
chmod +x launch_robot.sh
./launch_robot.sh

# Why do we write './launch_robot.sh' with './' in front?
# Because for security, the current directory '.' is NOT in $PATH!
# './' explicitly tells the shell: "Run launch_robot.sh inside THIS current folder."
```

#### 2. Environment Variables (`export`, `$PATH`, and `.bashrc`)
How does the shell know where to find programs like `python3`, `git`, or `ros2` when you type their names? It searches the colon-separated list of folders stored inside the **`$PATH`** environment variable from left to right!

```
How the Shell Resolves a Command Using $PATH:

  You type:  ros2 topic list
               |
               v
  Shell checks $PATH = "/opt/ros/humble/bin:/usr/local/bin:/usr/bin"
               |
               +---> 1. Is 'ros2' in /opt/ros/humble/bin/ros2?  YES! Execute it!
```

```bash
# Print the current search path
echo $PATH

# Set an environment variable for the current terminal session (and child processes)
export ROS_DOMAIN_ID=42

# Load ROS 2 environment variables into your current shell session
source /opt/ros/humble/setup.bash
```

*(Tip: Commands placed inside `~/.bashrc` run automatically every time you open a new terminal window!)*

#### 3. Connecting to a Headless Robot via `ssh`
To open a terminal session inside your robot's onboard computer over Wi-Fi or Ethernet, use **`ssh`** (*Secure Shell*):

```bash
# Check if the robot is reachable on the network before SSHing (sends 3 packets)
ping -c 3 192.168.1.50

# Log into user 'ubuntu' on the robot at IP address 192.168.1.50
ssh ubuntu@192.168.1.50

# Copy a calibration file from your laptop directly onto the robot over SSH (scp)
scp camera_calib.yaml ubuntu@192.168.1.50:~/ros2_ws/config/
```

---

### 6. Dry-Run Trace: Debugging a Misbehaving Robot Sensor Over `ssh`

Let's trace a realistic 8-step robotics debugging session from your laptop into an onboard Jetson computer:

| Step | Command Typed | Current Machine & Directory | Stream / Kernel Action | Outcome / Observation |
|------|---------------|-----------------------------|------------------------|-----------------------|
| **1** | `ping -c 1 10.0.0.42` | Laptop (`~`) | Sends ICMP echo packet to robot IP | `0% packet loss` (Robot is online on Wi-Fi) |
| **2** | `ssh robot@10.0.0.42` | Robot (`/home/robot`) | Opens encrypted remote shell on robot | Prompt changes to `robot@jetson:~$` |
| **3** | `ls -l /dev/ttyUSB*` | Robot (`/home/robot`) | Checks device files for plugged-in LiDAR | `/dev/ttyUSB0` exists! Hardware is detected |
| **4** | `ps aux \| grep lidar` | Robot (`/home/robot`) | Pipes process list into `grep` filter | Sees old stuck process `PID 3104` holding port |
| **5** | `kill 3104` | Robot (`/home/robot`) | Sends `SIGTERM` (15) to `PID 3104` | Old `lidar_node` shuts down cleanly & frees port |
| **6** | `cd ~/ros2_ws && source install/setup.bash` | Robot (`~/ros2_ws`) | Enters workspace & loads env vars | `$PATH` updated with robot package binaries |
| **7** | `./start_lidar.sh > lidar.log 2>&1 &` | Robot (`~/ros2_ws`) | Redirects `stdout`+`stderr` to file; `&` runs in background | Node starts in background as `PID 3590` |
| **8** | `tail -f lidar.log \| grep "Scan OK"` | Robot (`~/ros2_ws`) | Follows live log & filters health messages | `[INFO] Scan OK: 720 points @ 10Hz` |

---

### 7. Common Mistakes & How to Fix Them

#### Mistake 1: Running `rm -rf` with a Stray Space or Wrong Path
In Linux, `rm` permanently unlinks files with **no confirmation and no Undo**. A typo like `rm -rf build /` (notice the space before `/`) tells Linux to delete `build` and then try to delete the entire root filesystem!

```bash
# DANGEROUS: Space before '*' deletes everything in the current directory!
# rm -rf build/ *

# SAFE HABIT: Double-check with 'ls' first, and never put spaces before wildcards!
ls ./build/
rm -rf ./build/
```

#### Mistake 2: Putting Spaces Around `=` in `export` or Shell Variables
In C++ and Python, `x = 5` is fine. In `bash`/`zsh`, `ROS_DOMAIN_ID = 42` fails because the shell thinks `ROS_DOMAIN_ID` is a command name and `=` is its first argument, and `export ROS_DOMAIN_ID = 42` fails because `export` treats `=` and `42` as separate (invalid) variable names (`export: '=': not a valid identifier`)!

```bash
# BAD: Spaces around '=' cause "command not found" or syntax error!
# export ROS_DOMAIN_ID = 42

# FIX: Never put spaces around '=' in shell variable assignments!
export ROS_DOMAIN_ID=42
```

#### Mistake 3: Using `>` When You Meant `>>` (Wiping Out Your `.bashrc` or Logs!)
A single `>` **overwrites** the target file from scratch before the command even runs. If you want to **append** to an existing log or `~/.bashrc` file without erasing its previous contents, always use double `>>`!

```bash
# BAD: Wipes out your entire ~/.bashrc file and replaces it with 1 line!
# echo "source /opt/ros/humble/setup.bash" > ~/.bashrc

# FIX: Use '>>' to APPEND to the end of the file safely!
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
```

#### Mistake 4: `Permission denied` When Opening `/dev/ttyUSB0` on a Robot
When you plug a USB LiDAR or microcontroller into Ubuntu Linux, `/dev/ttyUSB0` is owned by the **`dialout`** group. If your Linux user isn't in `dialout`, your C++ or Python node will crash with `Permission denied: '/dev/ttyUSB0'`.

```bash
# BAD: Running your entire robot stack as 'sudo' root just to read a USB sensor!
# sudo ./lidar_node

# FIX: Add your Linux user permanently to the 'dialout' group (log out & back in once):
sudo usermod -aG dialout $USER
```

---

### 8. Quick Reference

| Command | What It Does | Robotics Example |
|---------|--------------|------------------|
| `pwd` | Print current directory path | Verify where your terminal is located |
| `ls -la` | List all files (including hidden `.` files & permissions) | Inspect `/dev/ttyUSB*` or `.bashrc` |
| `cd <path>` | Change directory (`~` = home, `..` = parent, `-` = previous) | `cd ~/ros2_ws/src` |
| `mkdir -p a/b/c` | Create nested folders cleanly | `mkdir -p logs/2026_run1` |
| `cp -r src dst` | Copy file or directory (`-r` for directories) | Backup config folder before tuning PID |
| `mv old new` | Move or rename a file/directory | `mv raw.bag calibrated.bag` |
| `cat file` | Print entire file to `stdout` | `cat /proc/cpuinfo` |
| `tail -f file` | Stream new lines added to the end of a file in real time | `tail -f /var/log/syslog` |
| `grep "pat" file` | Filter lines matching `"pat"` (`-i` = ignore case, `-r` = recursive) | `ps aux \| grep ros2` |
| `cmd1 \| cmd2` | Pipe `stdout` of `cmd1` into `stdin` of `cmd2` | `dmesg \| grep ttyUSB` |
| `cmd > file 2>&1` | Redirect both `stdout` (1) and `stderr` (2) into `file` | `./node > run.log 2>&1` |
| `ps aux` / `top` | View running processes and their CPU/RAM usage | Find a runaway 100% CPU node |
| `kill <PID>` | Send `SIGTERM` (15) for clean shutdown (`kill -9` for `SIGKILL`) | Stop a hung sensor driver |
| `chmod +x file` | Mark a script or binary as executable | `chmod +x entrypoint.sh` |
| `ssh user@ip` | Open a remote terminal on a robot over the network | `ssh ubuntu@192.168.1.50` |
| `scp src user@ip:dst` | Copy files securely between laptop and robot over SSH | `scp map.pgm ubuntu@10.0.0.42:~/` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Where does the shell end up?** You start in `/home/robot` (so `~` is `/home/robot`). Predict every line printed to the terminal:

```bash
cd /dev
cd ~/ros2_ws
cd ..
cd -
pwd
```

**Q2. Exit codes and `&&` / `||`.** Predict the output of each line (assume `nosuchcmd` does not exist anywhere on `$PATH`):

```bash
nosuchcmd; echo "code=$?"
false && echo "A" || echo "B"
true && echo "C" && false; echo "code=$?"
```

**Q3. `>` versus `>>`.** Predict exactly what `cat` prints:

```bash
echo "run 1" > cal.log
echo "run 2" >> cal.log
echo "run 3" > cal.log
echo "run 4" >> cal.log
cat cal.log
```

**Q4. Where does `stderr` go?** On the robot, `/dev/ttyUSB0` exists but `/dev/ttyUSB7` does not. For each command, say what appears on the **terminal** and what ends up **inside the file**:

```bash
# (a)
ls /dev/ttyUSB0 /dev/ttyUSB7 > scan.txt
# (b)
ls /dev/ttyUSB0 /dev/ttyUSB7 > scan.txt 2>&1
# (c)  note the ORDER of the two redirections
ls /dev/ttyUSB0 /dev/ttyUSB7 2>&1 > scan.txt
```

**Q5. Decode the permission bits.** `ls -la` shows `-rw-r--r--  launch_robot.sh`.
1. Who may read it, who may write it, and can anyone execute it with `./launch_robot.sh`?
2. You run `chmod +x launch_robot.sh` (with the common default `umask` of `022`). What does the permission string become, and what is its octal value?

### Coding Exercises

**E1 (Easy). Sensor presence check.** Write a bash function `check_device` that takes one path. If the path exists, print `OK <path>` to **stdout** and return exit code `0`; otherwise print `MISSING <path>` to **stderr** and return `1`.

```bash
check_device /dev/ttyUSB0   # stdout: OK /dev/ttyUSB0      ($? = 0)
check_device /dev/ttyUSB9   # stderr: MISSING /dev/ttyUSB9  ($? = 1)
```

**E2 (Easy–Medium). Log-level summary.** Write a bash function `log_summary <logfile>` that prints how many lines contain `[ERROR]`, `[WARN]`, and `[INFO]`, in that order.

```bash
# nav.log contains:
# [INFO] Scan OK
# [WARN] Drop
# [INFO] Scan OK
# [ERROR] Timeout
# [INFO] Scan OK
log_summary nav.log
# ERROR: 1
# WARN: 1
# INFO: 3
```

**E3 (Medium). Polite-then-forceful shutdown.** Write `safe_stop <process_name> [timeout_seconds]` (default timeout `5`). It must find the PID (use `pgrep -x`), send `SIGTERM`, poll once per second until the process is gone, and only if it is still alive after the timeout send `SIGKILL`. Print `<name> not running` (exit `0`) if there is no such process, `<name> (<pid>) stopped cleanly` (exit `0`) on a clean stop, and return `2` if `SIGKILL` was needed.

```bash
safe_stop lidar_node      # lidar_node (3104) stopped cleanly
safe_stop ghost_node      # ghost_node not running
```

#### Dry-Run: Answers

**Q1.** Output:

```bash
/home/robot/ros2_ws
/home/robot/ros2_ws
```

| Command | Directory after | Printed |
|---------|-----------------|---------|
| `cd /dev` | `/dev` | nothing |
| `cd ~/ros2_ws` | `/home/robot/ros2_ws` | nothing |
| `cd ..` | `/home/robot` | nothing |
| `cd -` | `/home/robot/ros2_ws` (the previous directory) | `/home/robot/ros2_ws` (`cd -` echoes where it jumped) |
| `pwd` | `/home/robot/ros2_ws` | `/home/robot/ros2_ws` |

**Q2.** Output:

```bash
bash: nosuchcmd: command not found
code=127
B
C
code=1
```

- Line 1: the shell cannot find the command, prints an error on `stderr`, and sets `$?` to `127` ("command not found").
- Line 2: `false` exits `1`, so `&& echo "A"` is skipped; the whole left side failed, so `|| echo "B"` runs.
- Line 3: `true` exits `0`, so `echo "C"` runs (exit `0`), so `false` runs (exit `1`). The `;` then runs `echo` unconditionally, and `$?` is the exit code of the last command, `false`, which is `1`.

**Q3.** Output:

```bash
run 3
run 4
```

| Line | Operator | File contents after |
|------|----------|---------------------|
| `echo "run 1" > cal.log` | overwrite | `run 1` |
| `echo "run 2" >> cal.log` | append | `run 1`, `run 2` |
| `echo "run 3" > cal.log` | overwrite (truncates first!) | `run 3` |
| `echo "run 4" >> cal.log` | append | `run 3`, `run 4` |

**Q4.**

| Case | Terminal shows | `scan.txt` contains |
|------|----------------|---------------------|
| (a) `> scan.txt` | `ls: cannot access '/dev/ttyUSB7': No such file or directory` | `/dev/ttyUSB0` |
| (b) `> scan.txt 2>&1` | nothing | both the `/dev/ttyUSB0` line and the error line |
| (c) `2>&1 > scan.txt` | the error line | `/dev/ttyUSB0` only |

Redirections are processed left to right. In (c), `2>&1` runs first, while stdout still points at the terminal, so stderr is copied to *the terminal*. Only after that is stdout moved to `scan.txt`. In (b), stdout is moved to the file first, so `2>&1` copies the *file* target. This is the "wherever descriptor 1 is currently pointing" rule from Section 3.

**Q5.**
1. `-rw-r--r--`: the owner can read and write; the group and others can only read. Nobody has the `x` bit, so `./launch_robot.sh` fails with `Permission denied`.
2. `chmod +x` adds execute for user, group and others (minus the bits masked by `umask 022`, and `022` masks only write bits). The result is `-rwxr-xr-x`, octal `755`:

| Class | Bits | Value |
|-------|------|-------|
| Owner | `rwx` | $4+2+1 = 7$ |
| Group | `r-x` | $4+0+1 = 5$ |
| Others | `r-x` | $4+0+1 = 5$ |

**E1 — reference solution**

```bash
check_device() {
    local path="$1"
    if [ -e "$path" ]; then
        echo "OK $path"
        return 0
    else
        echo "MISSING $path" >&2     # '>&2' sends this echo to stderr (descriptor 2)
        return 1
    fi
}
```

Why it works: `[ -e path ]` is itself a command whose exit code is `0` if the path exists. `>&2` sends the message to stderr, so `check_device ... > ok.txt` collects only the healthy devices. (Use `-c` instead of `-e` if you also want to require a *character device* such as `/dev/ttyUSB0`.)

**E2 — reference solution**

```bash
log_summary() {
    local log="$1"
    local level
    for level in ERROR WARN INFO; do
        # '\[' escapes the bracket so grep matches the literal text "[ERROR]"
        echo "$level: $(grep -c "\[$level\]" "$log")"
    done
}
```

`grep -c` prints the number of matching lines. It still prints `0` when nothing matches (it just exits with code `1`), so the summary is correct for empty levels. Cost: three passes over the file, $O(3n)$ = $O(n)$ in the number of lines.

**E3 — reference solution**

```bash
safe_stop() {
    local name="$1"
    local timeout="${2:-5}"          # default to 5 seconds if no 2nd argument
    local pid
    pid=$(pgrep -x "$name" | head -n 1)
    if [ -z "$pid" ]; then
        echo "$name not running"
        return 0
    fi

    kill "$pid"                      # SIGTERM (15): let it zero the motors and flush logs
    local waited=0
    while kill -0 "$pid" 2>/dev/null; do     # signal 0 = "are you still alive?" probe
        if [ "$waited" -ge "$timeout" ]; then
            echo "$name ($pid) ignored SIGTERM, sending SIGKILL" >&2
            kill -9 "$pid"           # last resort: kernel destroys it, no cleanup runs
            return 2
        fi
        sleep 1
        waited=$((waited + 1))
    done
    echo "$name ($pid) stopped cleanly"
    return 0
}
```

Why it works: `kill -0` sends no signal but its exit code tells you whether the PID still exists, so the loop waits at most `timeout` seconds. `SIGKILL` is only ever used after `SIGTERM` has had a fair chance, which is the motor-safety rule from Section 4.

---

## Interactive Visualization & shadcn/ui Specification

### Component Blueprint for Claude
Build an interactive **Linux Robot Shell, Stream Plumber & Process Signal Simulator** using **shadcn/ui** components so the learner can visually route `stdin`/`stdout`/`stderr` pipes, explore `/dev` hardware nodes, and test `SIGTERM` vs. `SIGKILL` on a virtual robot.

#### 1. Top-Level Layout (`<Card>` & `<Tabs>`)
- Wrap the module in a `<Card className="p-6 border-border bg-card">` with three `<Tabs>` (`<TabsList>`, `<TabsTrigger>`, `<TabsContent>`):
  - **Tab 1: Interactive `/dev` & Linux Filesystem Explorer**
  - **Tab 2: Standard Streams (`0`, `1`, `2`), Redirection & Pipe (`|`) Plumber**
  - **Tab 3: Robot Process Manager (`ps`, `SIGTERM` vs. `SIGKILL` Motor Safety)**

#### 2. Tab 1: Interactive `/dev` & Linux Filesystem Explorer
- **Controls:**
  - Hardware toggle `<Switch>` controls: `"Plug in USB LiDAR (/dev/ttyUSB0)"`, `"Plug in Depth Camera (/dev/video0)"`, `"Plug in Joystick (/dev/input/js0)"`.
  - Quick CLI `<Button>` triggers: `"pwd"`, `"ls -la /dev"`, `"chmod +x launch.sh"`.
- **Visual Canvas:**
  - Render an interactive tree diagram of `/`, `/home/robot`, `/dev`, `/proc`, `/etc`, and `/var/log`.
  - Toggling `"Plug in USB LiDAR"` animates `/dev/ttyUSB0` appearing inside `/dev` with a `<Badge variant="default">Character Device</Badge>` and a `<Tooltip>` decoding its permission string `crw-rw----`.

#### 3. Tab 2: Standard Streams (`0`, `1`, `2`), Redirection & Pipe Plumber
- **Controls:**
  - A `<Select>` to choose the shell pipeline configuration:
    1. `./lidar_node` (Both `stdout` and `stderr` flow to Terminal Screen)
    2. `./lidar_node > scan.log` (`stdout` $\to$ file, `stderr` $\to$ Terminal Screen)
    3. `./lidar_node > full.log 2>&1` (Both `stdout` and `stderr` $\to$ `full.log`)
    4. `./lidar_node | grep "WARN"` (`stdout` piped into `grep`'s `stdin`)
  - A `<Switch>` to toggle between `>` (Overwrite file) and `>>` (Append to file).
- **Visual Canvas:**
  - Render animated packet pills (`[1: INFO Scan 12m]` in emerald, `[2: WARN Drop]` in amber) flowing out of File Descriptors `1 (stdout)` and `2 (stderr)` through SVG pipes into either the Terminal Card, the `grep` Filter Node, or the Log File Card.

#### 4. Tab 3: Robot Process Manager (`SIGTERM` vs. `SIGKILL` Motor Safety)
- **Controls:**
  - A live Process `<Table>` (`PID`, `USER`, `%CPU`, `STATE`, `COMMAND`) showing `lidar_driver (PID 4102)`, `motor_controller (PID 4821)`, and `slam_node (PID 4910)`.
  - Action `<Button variant="outline">` `"Send SIGTERM (kill 4821)"` and `<Button variant="destructive">` `"Send SIGKILL (kill -9 4821)"`.
- **Visual Canvas:**
  - Clicking `"Send SIGTERM"` animates `motor_controller` running its `~MotorController()` destructor, sending `velocity = 0.0 m/s` to the virtual robot wheels before exiting cleanly.
  - Clicking `"Send SIGKILL (-9)"` immediately vaporizes the process while the robot wheels remain stuck spinning at `2.5 m/s`, displaying a `<Badge variant="destructive">WARNING: Unclean Shutdown — Motors Still Spinning!</Badge>`.
