# Part 3, Topic 1: Closed-Loop Feedback & Control Theory

## Chapter 2: Cascaded PID Loops, Feedforward & State-Space Control (LQR)

---

### Why This Matters

In Chapter 1, we built a single PID loop that took a desired position $r(t)$ and directly output a motor voltage $u(t)$. For a simple hobby project, that works.

Now suppose you are engineering a **6-DOF industrial robot arm**, a **quadrotor drone**, or a **surgical robot**. If you connect a single Position PID loop directly to raw motor voltage, you immediately run into three walls:
1. **Time-Scale Mismatch:** Electrical current in motor windings changes in **microseconds** ($10{,}000\text{ Hz}$), wheel/joint velocity changes in **milliseconds** ($200\text{–}1{,}000\text{ Hz}$), and 3D position changes over **tens of milliseconds** ($50\text{–}100\text{ Hz}$). One PID loop cannot simultaneously manage three physics domains running at $200\times$ different speeds!
2. **Wait-for-Error Delay:** A pure PID controller is **100% reactive**—it outputs zero effort until an error *already exists*! If you already know your robot arm weighs $4\text{ kg}$, why wait for the arm to droop before applying holding torque?
3. **Coupled Multi-Variable Systems:** On a self-balancing two-wheeled robot (like a Segway) or a rocket, one set of motors must control **both** tilt angle $\theta$ and horizontal position $x$ at the exact same time.

In this chapter, you will master the three industrial architectures that solve these exact problems: **Cascaded PID Loops**, **Physics-Based Feedforward Control**, and **State-Space Optimal Control (LQR)**.

---

### 1. Why a Single PID Loop Hits a Wall

To see why a single Position $\to$ Voltage PID loop struggles, look at the chain of physical cause-and-effect inside an electric motor driving a robot joint:

$$\text{Voltage } V \xrightarrow[\tau_e \approx 0.1\text{ ms}]{\text{Inductance } L} \text{Current } I \xrightarrow[K_t \cdot I]{\text{Torque } \tau} \text{Acceleration } \ddot{\theta} \xrightarrow{\int dt} \text{Velocity } \dot{\theta} \xrightarrow{\int dt} \text{Position } \theta$$

Between the voltage $V$ you command and the position $\theta$ you measure, there are **two consecutive integrations** ($\ddot{\theta} \to \dot{\theta} \to \theta$) plus electrical inductance and back-EMF ($V_{\text{bemf}} = K_e \dot{\theta}$).
- Each integration adds $90^\circ$ of phase lag ($180^\circ$ total!). A phase lag of $180^\circ$ means that by the time your position error reacts to a force disturbance, the correction arrives out of phase and pushes the oscillation *harder*.
- Worse yet, a single Position PID has **no direct way to cap the maximum speed or maximum motor current**. If you tell a single Position PID to move from $0^\circ$ to $180^\circ$, the initial error is huge ($180^\circ$), so it commands $100\%$ voltage, accelerating the arm to a dangerous runaway velocity and drawing stall current that melts the motor windings!

How do industrial servo drives (like ODrive, SimpleFOC, Elmo, and Maxon) solve this? **Divide and conquer: Cascaded Control.**

---

### 2. Cascaded PID Control: Nested Loops at Different Frequencies

Instead of one giant leap from Position $\to$ PWM Voltage, **Cascaded Control** breaks the chain into nested loops—like Russian nesting dolls—where **each outer loop's output becomes the inner loop's setpoint ($r$)**:

1. **Outer Loop — Position Controller ($50\text{–}200\text{ Hz}$):**
   - **Reads:** Actual position $\theta$ from the joint encoder.
   - **Computes:** Position error $e_\theta = \theta_{\text{ref}} - \theta$.
   - **Outputs:** Desired **Velocity Setpoint** $\dot{\theta}_{\text{ref}}$ (clamped to safe max speed, e.g., $\pm 90\text{ deg/s}$!).
2. **Middle Loop — Velocity Controller ($500\text{–}2{,}000\text{ Hz}$):**
   - **Reads:** Actual velocity $\dot{\theta}$.
   - **Computes:** Velocity error $e_{\dot{\theta}} = \dot{\theta}_{\text{ref}} - \dot{\theta}$.
   - **Outputs:** Desired **Motor Current / Torque Setpoint** $I_{\text{ref}}$ (clamped to safe max current, e.g., $\pm 15\text{ Amps}$!).
3. **Inner Loop — Current / Torque Controller ($10{,}000\text{–}20{,}000\text{ Hz}$):**
   - **Reads:** Actual phase current $I$ from shunt resistors.
   - **Computes:** Current error $e_I = I_{\text{ref}} - I$.
   - **Outputs:** Hardware **PWM Duty Cycle / Voltage** $V_{\text{pwm}}$.

```
  CASCADED SERVO ARCHITECTURE (Outer -> Middle -> Inner)

  Position     +----------+  Vel Ref   +----------+  Curr Ref  +----------+  PWM   +-------+
  Ref (theta*) | Position |  (omega*)  | Velocity |   (I*)     | Current  |  Volt  | Motor |
  --->( + )--->|  P Loop  |--->( + )-->| PI Loop  |--->( + )-->| PI Loop  |------->| Plant |---+--> Position (theta)
        ^ -    | (100 Hz) |      ^ -   | (1 kHz)  |      ^ -   | (10 kHz) |        +-------+   |
        |      +----------+      |     +----------+      |     +----------+          |   |     |
        |                        |                       |      Current I <----------+   |     |
        |                        +-----------------------+------ Velocity (omega) <------+     |
        +------------------------------------------------------- Position (theta) <------------+
```

#### Why Cascaded Control is a Superpower

1. **Disturbances Get Crushed Before Reaching the Outer Loop:** Suppose the motor hits a sudden voltage dip or back-EMF change. The $10\text{ kHz}$ Current Loop detects and corrects it in **$100\text{ microseconds}$**—long before the arm even changes velocity or position!
2. **Explicit Physical Safety Limits at Every Stage:**
   - Want to limit the robot arm's top speed to $60\text{ deg/s}$ so it never hurts a human coworker? Simply clamp the output of the Outer Position Loop to $[-60, +60]\text{ deg/s}$!
   - Want to guarantee the motor never draws more than $10\text{ Amps}$? Simply clamp the output of the Middle Velocity Loop to $[-10, +10]\text{ A}$!
3. **Simpler Tuning ($P \to PI \to PI$):** Because each loop only spans a single integration step ($I \to \dot{\theta}$ and $\dot{\theta} \to \theta$), the Outer Position Loop usually only needs a **pure P controller** ($K_{p,\text{pos}}$), and the Velocity and Current loops only need **PI controllers** (no noisy D-terms required!).

> **The Golden Rule of Cascaded Tuning:**
> Always tune **from the inside out** (Inner Current loop first $\to$ Middle Velocity loop second $\to$ Outer Position loop last), and ensure each inner loop runs at least **$4\times\text{ to }10\times$ faster** than the loop outside it so the inner loop appears nearly instantaneous to the outer loop.

---

### 3. Feedforward + Feedback Control: Stop Waiting for Errors!

Look at how a pure PID controller thinks:
*"I will output $0\text{ Volts}$ until I see a position error $e(t) \neq 0$."*

Compare that to how *you* drive a car or lift a heavy suitcase:
- When you see a steep hill ahead (or pick up a suitcase you *know* is heavy), you don't wait for your hand to drop toward the floor before tensing your muscles. Your brain uses an **internal physics model** to command $90\%$ of the required muscle force **immediately in advance** (**Feedforward**), and then uses your eyes/proprioception to trim the remaining $10\%$ error (**PID Feedback**)!

Mathematically, we add a **Feedforward Controller** $u_{\text{FF}}$ directly to our **PID Feedback Controller** $u_{\text{PID}}$:

$$\boxed{u_{\text{total}}(t) = u_{\text{FF}}\bigl(r(t), \dot{r}(t), \ddot{r}(t)\bigr) + u_{\text{PID}}\bigl(e(t)\bigr)}$$

Notice what $u_{\text{FF}}$ depends on: it depends on the **desired trajectory** ($r, \dot{r}, \ddot{r}$) and known physics—**NOT on the error $e(t)$**! Because $u_{\text{FF}}$ does not depend on sensor feedback $y(t)$, it can **never cause feedback oscillation or instability**, yet it does $90\%$ of the heavy lifting instantaneously (zero lag!).

```
                        +---------------------------------------+
                        |     Feedforward Model u_FF(r)         |
  Target r(t), r_dot(t) |  (Gravity G(theta) + Kv*r_dot + Ka*r_ddot)
  ---------+----------->|  Predicts 90% of effort IMMEDIATELY!  |-------+
           |            +---------------------------------------+       |
           |                                                            v u_FF
           |      e(t)  +---------------------------------------+     ( + )---> u_total(t) ---> [ Robot ] ---> y(t)
           +---->( + )--|      PID Feedback Loop u_PID(e)       |-----> ^                         |
                   ^ -  |  Fixes the remaining 10% unmodeled    |  u_PID                          |
                   |    |  disturbances & friction errors       |                                 |
                   |    +---------------------------------------+                                 |
                   +------------------------------------------------------------------------------+
```

#### The Two Most Common Feedforward Models in Robotics

1. **Gravity Compensation Feedforward (Robot Arms):**
   A single-link robot arm of mass $m$ and center-of-mass distance $L_c$ at angle $\theta$ (measured from horizontal) experiences a downward gravitational torque:
   $$\tau_{\text{gravity}}(\theta) = m g L_c \cos(\theta)$$
   Instead of forcing the PID Integral term to slowly wind up every time the arm moves to a new angle, we compute $u_{\text{FF}} = K_{\text{grav}} \cos(\theta)$ on every tick and add it directly to the motor command! Now the arm feels **weightless** at every angle, and the PID controller behaves identically whether moving up or down.

2. **Velocity & Acceleration Feedforward (Wheeled Robots & CNC Axes):**
   To spin a motor at desired speed $\dot{r}$ with desired acceleration $\ddot{r}$, physics says we need voltage to overcome static friction ($K_s$), back-EMF ($K_v \dot{r}$), and inertia ($K_a \ddot{r}$):
   $$u_{\text{FF}}(t) = K_s \operatorname{sgn}(\dot{r}) + K_v \dot{r}(t) + K_a \ddot{r}(t)$$

---

### 4. Numerical Dry-Run: Cascaded Position $\to$ Velocity + Feedforward

Let's trace **4 control ticks** of a robot joint (the loop runs at $\Delta t = 0.1\text{ s}$; these 4 ticks are snapshots spread along the move, not consecutive ticks, since at $\le 5\text{ rad/s}$ one tick moves the joint at most $0.5\text{ rad}$) moving toward target $\theta_{\text{ref}} = 10.0\text{ rad}$ under a constant gravity load requiring $+2.0\text{ V}$ of holding effort ($u_{\text{FF}} = +2.0\text{ V}$).
- **Outer Position P-Loop:** $K_{p,\text{pos}} = 2.0\text{ (rad/s)/rad}$, clamped to max speed $\dot{\theta}_{\max} = \pm 5.0\text{ rad/s}$.
- **Inner Velocity P-Loop:** $K_{p,\text{vel}} = 1.5\text{ V/(rad/s)}$.
- **Total Command:** $u = u_{\text{FF}} + K_{p,\text{vel}} \cdot (\dot{\theta}_{\text{ref}} - \dot{\theta})$.

| Tick $k$ | Target $\theta_{\text{ref}}$ | Actual $\theta$ | Pos Error $e_\theta = \theta_{\text{ref}} - \theta$ | Unclamped $K_{p,\text{pos}} e_\theta$ | Clamped Vel Target $\dot{\theta}_{\text{ref}}$ | Actual Vel $\dot{\theta}$ | Vel Error $e_{\dot{\theta}} = \dot{\theta}_{\text{ref}} - \dot{\theta}$ | Vel Loop $u_{\text{vel}} = 1.5 e_{\dot{\theta}}$ | Gravity FF $u_{\text{FF}}$ | Total Motor $u = u_{\text{vel}} + u_{\text{FF}}$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | $10.0$ | $0.0$ | $+10.0$ | $+20.0$ | **$+5.0$** (speed limit!) | $0.0$ | $+5.0$ | $+7.5\text{ V}$ | $+2.0\text{ V}$ | **$+9.50\text{ V}$** |
| **1** | $10.0$ | $3.0$ | $+7.0$ | $+14.0$ | **$+5.0$** (cruising at cap) | $+5.0$ | $0.0$ | $0.0\text{ V}$ | $+2.0\text{ V}$ | **$+2.00\text{ V}$** |
| **2** | $10.0$ | $8.5$ | $+1.5$ | $+3.0$ | **$+3.0$** (decelerating) | $+4.5$ | $-1.5$ | $-2.25\text{ V}$ | $+2.0\text{ V}$ | **$-0.25\text{ V}$** |
| **3** | $10.0$ | $10.0$ | $0.0$ | $0.0$ | **$0.0$** (stopped at goal) | $0.0$ | $0.0$ | $0.0\text{ V}$ | $+2.0\text{ V}$ | **$+2.00\text{ V}$** |

Look at how clean and predictable every single number in that table is:
1. **In Tick 0 & Tick 1**, even though the position error is huge ($10\text{ rad}$ and $7\text{ rad}$), the Outer Position Loop **caps the velocity command at $+5.0\text{ rad/s}$**, so the robot cruises smoothly at its safe speed limit instead of accelerating out of control!
2. **In Tick 3**, the instant the robot reaches $\theta = 10.0\text{ rad}$ with zero error, the Feedforward term $u_{\text{FF}} = +2.00\text{ V}$ holds the arm up against gravity with **zero droop and zero integral windup delay**!

---

### 5. Gentle Introduction to State-Space Control & LQR

Cascaded PID + Feedforward is fantastic when one motor controls one joint.
**But what about an underactuated, coupled system?**
Imagine a **Self-Balancing Two-Wheeled Robot** (or a SpaceX Falcon 9 booster balancing on its rocket nozzle). The wheel motors only have **one control input** $u$ (wheel torque), yet they must simultaneously stabilize **four physical variables** at once:
1. Horizontal cart position $x$
2. Horizontal cart velocity $\dot{x}$
3. Pitch tilt angle $\theta$ (if $\theta$ falls past $30^\circ$, the robot crashes!)
4. Pitch angular velocity $\dot{\theta}$

Instead of juggling multiple fighting PID loops, modern control theory packs all Variables That Describe the System's Current Condition into a single column vector called the **State Vector $\mathbf{x}(t)$**:

$$\mathbf{x}(t) = \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix} \in \mathbb{R}^n$$

#### Step 1: The State-Space Physics Equation ($\dot{\mathbf{x}} = \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{u}$)

Near the upright balance point, the laws of physics ($F = ma$) for any linear (or linearized) system can be written as one compact matrix equation:

$$\boxed{\dot{\mathbf{x}}(t) = \mathbf{A}\mathbf{x}(t) + \mathbf{B}\mathbf{u}(t)}$$

Let's demystify the two matrices in plain English:
- **$\mathbf{A}$ (The System / Physics Matrix):** Describes how the system evolves naturally on its own **if the motors are turned off ($\mathbf{u} = \mathbf{0}$)**. For example, velocity $\dot{x}$ changes position $x$, and gravity pulls a tilted pendulum $\theta$ into faster angular velocity $\dot{\theta}$.
- **$\mathbf{B}$ (The Control / Actuator Matrix):** Describes how firing the motors ($\mathbf{u}$) pushes on the state rates $\dot{\mathbf{x}}$ (e.g., wheel torque accelerates $\ddot{x}$ and pitches $\ddot{\theta}$).

For example, for a simple frictionless mass $m$ on a 1D track ($\ddot{x} = \frac{1}{m} u$) with state $\mathbf{x} = \begin{bmatrix} x \\ \dot{x} \end{bmatrix}$:
$$\begin{bmatrix} \dot{x} \\ \ddot{x} \end{bmatrix} = \underbrace{\begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}}_{\mathbf{A}} \begin{bmatrix} x \\ \dot{x} \end{bmatrix} + \underbrace{\begin{bmatrix} 0 \\ 1/m \end{bmatrix}}_{\mathbf{B}} u$$
Notice that multiplying the top row gives $\dot{x} = 0\cdot x + 1\cdot \dot{x} + 0\cdot u$ (velocity is the derivative of position!), and the bottom row gives $\ddot{x} = \frac{1}{m}u$ ($F = ma$!).

#### Step 2: Full-State Feedback ($\mathbf{u} = -\mathbf{K}\mathbf{x}$)

If our goal is to drive the entire state vector $\mathbf{x}$ to zero (upright $\theta = 0$, stationary $\dot{\theta} = 0$, at the origin $x = 0, \dot{x} = 0$), what control law should we use?
We multiply each state variable by a gain and sum them together:

$$\boxed{\mathbf{u}(t) = -\mathbf{K}\mathbf{x}(t) = -\begin{bmatrix} k_1 & k_2 & k_3 & k_4 \end{bmatrix} \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix} = -\bigl(k_1 x + k_2 \dot{x} + k_3 \theta + k_4 \dot{\theta}\bigr)}$$

Look closely at what $\mathbf{u} = -\mathbf{K}\mathbf{x}$ is!
- For a 1-DOF system with state $\mathbf{x} = \begin{bmatrix} x - r \\ \dot{x} \end{bmatrix}$, $\mathbf{u} = -k_1(x - r) - k_2\dot{x} = k_1(r - x) - k_2\dot{x}$. **That is literally a PD controller ($K_p = k_1, K_d = k_2$)!**
- Full-state feedback $\mathbf{u} = -\mathbf{K}\mathbf{x}$ is simply **multi-variable PD control** generalized to any number of coupled states!

When we plug $\mathbf{u} = -\mathbf{K}\mathbf{x}$ back into the physics equation $\dot{\mathbf{x}} = \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{u}$, we get the closed-loop dynamics:
$$\dot{\mathbf{x}} = \mathbf{A}\mathbf{x} + \mathbf{B}(-\mathbf{K}\mathbf{x}) = (\mathbf{A} - \mathbf{B}\mathbf{K})\mathbf{x}$$
By choosing $\mathbf{K}$ so that all eigenvalues of the closed-loop matrix $(\mathbf{A} - \mathbf{B}\mathbf{K})$ have negative real parts, the entire coupled system is mathematically guaranteed to stabilize to $\mathbf{x} = \mathbf{0}$!

#### Step 3: How Do We Find the Best Gain Matrix $\mathbf{K}$? Enter LQR!

In a 4-state balancing robot, how do you pick the four numbers $\mathbf{K} = [k_1, k_2, k_3, k_4]$? Guessing four coupled gains by hand is painful.
Instead, **LQR (Linear Quadratic Regulator)** lets you specify two intuitive diagonal weight matrices—**$\mathbf{Q}$ (State Error Penalty)** and **$\mathbf{R}$ (Motor Effort Penalty)**—that define a total cost function $J$:

$$\boxed{J = \int_0^\infty \Bigl(\underbrace{\mathbf{x}(t)^T \mathbf{Q}\, \mathbf{x}(t)}_{\text{Penalty for state error}} + \underbrace{\mathbf{u}(t)^T \mathbf{R}\, \mathbf{u}(t)}_{\text{Penalty for motor power}}\Bigr)\,dt}$$

- **$\mathbf{Q}$ Matrix (How much do I care about each state's error?):**
  $$\mathbf{Q} = \begin{bmatrix} q_{\text{pos}} & 0 & 0 & 0 \\ 0 & q_{\text{vel}} & 0 & 0 \\ 0 & 0 & q_{\text{angle}} & 0 \\ 0 & 0 & 0 & q_{\text{ang\_vel}} \end{bmatrix}$$
  If keeping the robot upright ($\theta = 0$) is $100\times$ more urgent than staying at $x = 0$, you simply set $q_{\text{angle}} = 100$ and $q_{\text{pos}} = 1$!
- **$\mathbf{R}$ Matrix (How expensive is motor voltage/current?):**
  If your motor overheats easily or battery life is precious, make $R$ large (gentle control). If you want aggressive, lightning-fast stabilization, make $R$ small.

Once you specify $\mathbf{A}, \mathbf{B}, \mathbf{Q}, \mathbf{R}$, a standard solver (`scipy.linalg.solve_continuous_are` in Python or `Eigen` / `drake` in C++) solves the **Algebraic Riccati Equation** in microseconds and hands you the **mathematically optimal gain matrix $\mathbf{K}$** that minimizes $J$!

```
  FULL-STATE FEEDBACK (LQR) ARCHITECTURE

  Reference x_ref = 0        State Error        Optimal Gain Matrix          Control u(t)   +--------------------+
  ----------------->( + )---------------------> | K = [k1, k2, k3, k4] | -----------------> | Plant:             |
                      ^ -                       +----------------------+                    | x_dot = A*x + B*u  |
                      |                                                                     +--------------------+
                      |       Full State Vector x = [x, x_dot, theta, theta_dot]^T                    |
                      +-------------------------------------------------------------------------------+
```

#### Step 4: Bryson's Rule — How to Pick $\mathbf{Q}$ and $\mathbf{R}$ Without Guessing

Newcomers to LQR often ask: *"How do I pick the numbers inside $\mathbf{Q}$ and $\mathbf{R}$? Should $q_{\text{angle}}$ be $10$ or $10{,}000$?"*
In 1969, control pioneer Arthur Bryson gave a brilliant, systematic recipe called **Bryson's Rule**:

1. Decide the **maximum acceptable error** $e_{i,\max}$ for each state variable $x_i$ before you consider the robot's performance unacceptable:
   - Say max acceptable cart position drift is $x_{\max} = 0.5\text{ m}$.
   - Say max acceptable cart speed is $\dot{x}_{\max} = 1.0\text{ m/s}$.
   - Say max acceptable tilt angle before falling over is $\theta_{\max} = 0.1\text{ rad}$ ($\approx 5.7^\circ$).
   - Say max acceptable pitch rate is $\dot{\theta}_{\max} = 0.5\text{ rad/s}$.
2. Decide the **maximum acceptable actuator effort** $u_{\max}$ (e.g., max motor force $u_{\max} = 10.0\text{ N}$).
3. Set each diagonal entry of $\mathbf{Q}$ and $\mathbf{R}$ to the **reciprocal of its maximum acceptable value squared**:

$$\boxed{Q_{ii} = \frac{1}{\bigl(x_{i,\max}\bigr)^2}, \qquad R_{jj} = \frac{1}{\bigl(u_{j,\max}\bigr)^2}}$$

Why squared? Because in the LQR cost function $J = \int (\mathbf{x}^T \mathbf{Q} \mathbf{x} + \mathbf{u}^T \mathbf{R} \mathbf{u})\,dt$, each state is multiplied by itself ($Q_{ii} x_i^2$). Using Bryson's Rule:
- When tilt angle reaches its limit $\theta = 0.1\text{ rad}$, its cost contribution is $Q_{33} \theta^2 = \frac{1}{0.1^2} (0.1)^2 = 1.0$ (dimensionless!).
- When position reaches its limit $x = 0.5\text{ m}$, its cost contribution is $Q_{11} x^2 = \frac{1}{0.5^2} (0.5)^2 = 1.0$ (dimensionless!).
Bryson's Rule automatically normalizes meters, radians, and Newtons onto an equal $[0, 1]$ footing!

#### Step-by-Step Numerical Dry-Run: 4-State LQR Balancing Robot

Suppose our self-balancing Segway robot has been solved via LQR, yielding the optimal gain matrix:
$$\mathbf{K} = \begin{bmatrix} -2.0 & -3.0 & +40.0 & +8.0 \end{bmatrix}$$
Let's trace what $\mathbf{u} = -\mathbf{K}\mathbf{x} = -\bigl(k_1 x + k_2 \dot{x} + k_3 \theta + k_4 \dot{\theta}\bigr)$ does across **4 physical scenarios**:

| Scenario | Cart Pos $x$ ($\text{m}$) | Cart Vel $\dot{x}$ ($\text{m/s}$) | Pitch $\theta$ ($\text{rad}$) | Pitch Rate $\dot{\theta}$ ($\text{rad/s}$) | Pos Term $-k_1 x$ | Vel Term $-k_2 \dot{x}$ | Pitch Term $-k_3 \theta$ | Rate Term $-k_4 \dot{\theta}$ | Total Force $u = -\mathbf{K}\mathbf{x}$ | Physical Intuition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Leaning Forward** | $0.0$ | $0.0$ | $+0.10$ | $0.0$ | $0.0$ | $0.0$ | $-4.0\text{ N}$ | $0.0$ | **$-4.0\text{ N}$** | Drives wheels toward the lean ($-x$; with these gains $\theta > 0$ means leaning toward $-x$), getting under the fall to catch the tilt! |
| **2. Falling Fast** | $0.0$ | $0.0$ | $+0.10$ | $+0.50$ | $0.0$ | $0.0$ | $-4.0\text{ N}$ | $-4.0\text{ N}$ | **$-8.0\text{ N}$** | Pitch + angular velocity combine for urgent recovery. |
| **3. Upright, Drifted Right** | $+0.50$ | $0.0$ | $0.0$ | $0.0$ | $+1.0\text{ N}$ | $0.0$ | $0.0$ | $0.0$ | **$+1.0\text{ N}$** | Gently nudges wheels to pitch back toward $x=0$. |
| **4. Returning to Origin** | $+0.20$ | $-0.40$ | $-0.02$ | $0.0$ | $+0.4\text{ N}$ | $-1.2\text{ N}$ | $+0.8\text{ N}$ | $0.0$ | **$0.0\text{ N}$** | All 4 coupled states balance in dynamic harmony! |

---

### 6. Code Implementation: Cascaded Servo + LQR Controller (C++ & Python)

#### C++ Implementation: Cascaded Position $\to$ Velocity + Gravity Feedforward & LQR Cart-Pole

```cpp
#include <iostream>
#include <cmath>
#include <algorithm>
#include <iomanip>

class CascadedJointController {
public:
    CascadedJointController(double kp_pos, double max_vel,
                            double kp_vel, double ki_vel, double max_volts,
                            double gravity_ff_gain)
        // ^^^ Configure Outer Position P-loop, Inner Velocity PI-loop, and Gravity Feedforward gain
        : kp_pos_(kp_pos), max_vel_(max_vel),
          kp_vel_(kp_vel), ki_vel_(ki_vel), max_volts_(max_volts),
          k_grav_(gravity_ff_gain), vel_integral_(0.0) {}

    double computeVelocitySetpoint(double target_pos, double actual_pos) const {
        double pos_error = target_pos - actual_pos;
        // ^^^ Outer loop computes position error e_pos = theta_ref - theta
        double vel_cmd = kp_pos_ * pos_error;
        // ^^^ Proportional control converts position error into desired velocity
        return std::clamp(vel_cmd, -max_vel_, max_vel_);
        // ^^^ Clamp desired velocity so the arm never exceeds its safe speed limit!
    }

    double computeMotorVoltage(double target_vel, double actual_vel, double actual_pos, double dt) {
        double vel_error = target_vel - actual_vel;
        // ^^^ Inner loop compares Outer Loop's velocity command against actual joint velocity

        double p_vel = kp_vel_ * vel_error;
        // ^^^ Inner velocity proportional term
        double candidate_int = vel_integral_ + vel_error * dt;
        // ^^^ Tentatively integrate velocity error

        double u_ff = k_grav_ * std::cos(actual_pos);
        // ^^^ Physics Feedforward: immediately supply torque to counter gravity m*g*L*cos(theta)!

        double unclamped_v = u_ff + p_vel + (ki_vel_ * candidate_int);
        if (std::abs(unclamped_v) <= max_volts_) {
            vel_integral_ = candidate_int;
            // ^^^ Conditional anti-windup on the inner velocity loop
        }

        double total_voltage = u_ff + p_vel + (ki_vel_ * vel_integral_);
        return std::clamp(total_voltage, -max_volts_, max_volts_);
        // ^^^ Sum Feedback (PI) + Feedforward (Gravity) and clamp to motor supply rails
    }

private:
    double kp_pos_, max_vel_;
    double kp_vel_, ki_vel_, max_volts_;
    double k_grav_, vel_integral_;
};

int main() {
    CascadedJointController servo(3.0, 2.0, 4.0, 1.5, 12.0, 2.5);
    // ^^^ Max velocity = 2.0 rad/s, Max voltage = 12.0V, Horizontal gravity load = 2.5V
    double pos = 0.0, vel = 0.0, target_pos = 1.0, dt_inner = 0.01; // 100Hz inner, 25Hz outer
    double vel_ref = 0.0;

    for (int tick = 0; tick <= 20; ++tick) {
        if (tick % 4 == 0) {
            vel_ref = servo.computeVelocitySetpoint(target_pos, pos);
            // ^^^ Outer Position Loop runs every 4th tick (25 Hz)
        }
        double volts = servo.computeMotorVoltage(vel_ref, vel, pos, dt_inner);
        // ^^^ Inner Velocity Loop + Gravity Feedforward runs every tick (100 Hz)

        double accel = (volts - 2.5 * std::cos(pos) - 0.8 * vel) * 5.0;
        // ^^^ Simulated arm physics with nonlinear gravity 2.5*cos(pos)
        vel += accel * dt_inner;
        pos += vel * dt_inner;

        if (tick % 4 == 0) {
            std::cout << "t=" << std::fixed << std::setprecision(2) << tick * dt_inner
                      << "s | Pos: " << pos << " rad | VelRef: " << vel_ref
                      << " rad/s | Vel: " << vel << " rad/s | V: " << volts << "V\n";
        }
    }
    return 0;
}
```

#### Python Implementation: Cascaded Servo + State-Space LQR Controller

```python
import math
import numpy as np

class CascadedJointController:
    def __init__(self, kp_pos: float, max_vel: float,
                 kp_vel: float, ki_vel: float, max_volts: float,
                 gravity_ff_gain: float):
        # ^^^ Configure Outer Position P-loop, Inner Velocity PI-loop, and Gravity Feedforward
        self.kp_pos = kp_pos
        self.max_vel = max_vel
        self.kp_vel = kp_vel
        self.ki_vel = ki_vel
        self.max_volts = max_volts
        self.k_grav = gravity_ff_gain
        self.vel_integral = 0.0

    def compute_velocity_setpoint(self, target_pos: float, actual_pos: float) -> float:
        pos_error = target_pos - actual_pos
        # ^^^ Outer loop computes position error e_theta = theta_ref - theta
        vel_cmd = self.kp_pos * pos_error
        # ^^^ Convert position error into desired velocity command
        return max(-self.max_vel, min(self.max_vel, vel_cmd))
        # ^^^ Clamp desired velocity to safe physical speed limit [-max_vel, +max_vel]

    def compute_motor_voltage(self, target_vel: float, actual_vel: float,
                              actual_pos: float, dt: float) -> float:
        vel_error = target_vel - actual_vel
        # ^^^ Inner loop compares outer loop's velocity command against measured velocity
        p_vel = self.kp_vel * vel_error
        candidate_int = self.vel_integral + vel_error * dt
        # ^^^ Tentatively accumulate velocity error area

        u_ff = self.k_grav * math.cos(actual_pos)
        # ^^^ Gravity Feedforward: proactively counter m*g*L*cos(theta) with zero lag!

        unclamped_v = u_ff + p_vel + (self.ki_vel * candidate_int)
        if abs(unclamped_v) <= self.max_volts:
            self.vel_integral = candidate_int
            # ^^^ Anti-windup: freeze inner velocity integrator if actuator is saturated

        total_v = u_ff + p_vel + (self.ki_vel * self.vel_integral)
        return max(-self.max_volts, min(self.max_volts, total_v))
        # ^^^ Return clamped total motor voltage u_total = u_FF + u_PID


def solve_discrete_lqr(A: np.ndarray, B: np.ndarray, Q: np.ndarray, R: np.ndarray, iterations: int = 200) -> np.ndarray:
    # ^^^ Compute optimal LQR gain matrix K using backward Riccati iteration (zero external library dependencies!)
    P = Q.copy()
    # ^^^ Initialize cost-to-go matrix P with state penalty matrix Q
    for _ in range(iterations):
        P = Q + A.T @ P @ A - (A.T @ P @ B) @ np.linalg.inv(R + B.T @ P @ B) @ (B.T @ P @ A)
        # ^^^ Iterate the Discrete-Time Algebraic Riccati Equation (DARE) to convergence
    K = np.linalg.inv(R + B.T @ P @ B) @ (B.T @ P @ A)
    # ^^^ Extract optimal full-state feedback gain matrix K where u = -K @ x
    return K

# Example: 2-State Double Integrator Robot Cart (State x = [position, velocity]^T)
dt = 0.05
mass = 2.0
A_d = np.array([[1.0, dt],
                [0.0, 1.0]])
# ^^^ Discrete physics matrix: x_next = x + v*dt, v_next = v
B_d = np.array([[0.5 * (dt ** 2) / mass],
                [dt / mass]])
# ^^^ Discrete actuator matrix: force u accelerates velocity by (dt/m) and position by 0.5*dt^2/m

Q = np.diag([50.0, 5.0])
# ^^^ Penalize position error (50.0) heavily and velocity error (5.0) moderately
R = np.array([[0.5]])
# ^^^ Penalize actuator force effort (0.5) to prevent aggressive motor saturation

K = solve_discrete_lqr(A_d, B_d, Q, R)
# ^^^ Solve for optimal 1x2 feedback gain row vector K = [k_pos, k_vel]
print(f"Optimal LQR Gain K = {K.round(3)}")

state = np.array([[3.0], [0.0]])  # Start 3.0 meters away from origin at rest
for step in range(8):
    u = -(K @ state)
    # ^^^ Full-state feedback law: u = -K * x combines position and velocity optimally
    state = A_d @ state + B_d @ u
    # ^^^ Advance state forward one timestep dt
    print(f"Step {step}: pos={state[0,0]:.3f} m, vel={state[1,0]:.3f} m/s, force={u[0,0]:.2f} N")
```

---

### 7. Common Mistakes & Fixes

| Mistake | Symptom on the Robot | Root Cause | The Fix |
| :--- | :--- | :--- | :--- |
| **Tuning Outer Loop Before Inner Loop** | Position loop oscillates wildly or inner velocity loop ignores position commands. | Outer loop assumes the inner loop tracks $\dot{\theta}_{\text{ref}}$ accurately; an untuned inner loop acts like a broken actuator. | Always disconnect the outer loop first, tune the inner loop to track step inputs crisply, then close the outer loop. |
| **Running Inner & Outer Loops at the Same Slow Rate** | Cascaded setup performs *worse* than a single PID loop, with sluggish phase lag. | Inner loop needs to converge several times faster than outer loop updates. | Run inner current loop at $10\text{ kHz}$, middle velocity loop at $1\text{ kHz}$, and outer position loop at $100\text{ Hz}$ (or update outer loop every $N$ inner ticks). |
| **Feeding Measured $y(t)$ into Velocity/Accel Feedforward** | Violent motor chattering whenever velocity feedforward $K_v$ or $K_a$ is turned up. | Differentiating noisy encoder measurements $\dot{y}, \ddot{y}$ turns feedforward into a noisy feedback loop! | Always compute $u_{\text{FF}}$ from the **smooth desired reference trajectory** $\dot{r}(t), \ddot{r}(t)$ (except smooth configuration terms like $\cos\theta$). |
| **LQR State Units Mismatch in $\mathbf{Q}$** | LQR ignores angle errors or saturates motors over tiny millimeter errors. | Putting angles in degrees ($100$) vs. radians ($1.74$) changes $x^T \mathbf{Q} x$ by $(180/\pi)^2 \approx 3{,}283\times$! | Always use consistent SI units ($\text{m}, \text{m/s}, \text{rad}, \text{rad/s}$) and normalize $\mathbf{Q}_{ii} = \frac{1}{\text{max\_acceptable\_error}_i^2}$ (Bryson's Rule). |

---

### 8. Quick Reference Summary

| Architecture | Control Law Formula | Best Used When... | Key Advantage |
| :--- | :--- | :--- | :--- |
| **Single PID Loop** | $u = K_p e + K_i \int e\,dt - K_d \dot{y}$ | Simple 1-DOF mechanisms with gentle dynamics (heaters, basic DC speed control). | Easiest to implement; requires only 1 sensor and 3 tuning parameters. |
| **Cascaded PID** | $\dot{\theta}_{\text{ref}} = \text{PID}_{\text{pos}}(e_\theta)$, $u = \text{PID}_{\text{vel}}(e_{\dot{\theta}})$ | Robot arms, CNC axes, drones (Attitude $\to$ Rate $\to$ Motor). | Direct safety clamping on max speed & current; crushes inner disturbances fast. |
| **PID + Feedforward** | $u = u_{\text{FF}}(r, \dot{r}, \ddot{r}) + u_{\text{PID}}(e)$ | High-speed trajectory tracking or heavy gravity loads ($m g L \cos\theta$). | $90\%$ of effort applied with **zero lag**; PID only trims small unmodeled errors. |
| **State-Space LQR** | $\dot{\mathbf{x}} = \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{u}, \quad \mathbf{u} = -\mathbf{K}\mathbf{x}$ | Coupled, underactuated multi-state systems (Segway, inverted pendulum, rockets). | Optimally balances all coupled states and actuator effort via $\mathbf{Q}$ and $\mathbf{R}$ weights. |

---

## Interactive Visualization & shadcn/ui Specification

### Widget Purpose
Build a dual-mode **Cascaded Servo & LQR Cart-Pole Interactive Workbench** where learners can compare:
1. **Mode A (Cascaded + Feedforward Arm):** A single PID loop vs. a Cascaded Position $\to$ Velocity loop with toggleable Gravity Feedforward $m g L \cos\theta$.
2. **Mode B (State-Space LQR Cart-Pole):** A 4-state inverted pendulum on a cart ($\mathbf{x} = [x, \dot{x}, \theta, \dot{\theta}]^T$) where learners adjust the $\mathbf{Q}$ and $\mathbf{R}$ penalty sliders and watch the Riccati solver live-update $\mathbf{K} = [k_1, k_2, k_3, k_4]$ to stabilize the pole after being poked.

### Visual Layout & Interactive Canvas
- **Top Bar:** Mode switcher and live architecture block diagram showing signal flow and loop frequencies ($100\text{ Hz} \to 1\text{ kHz} \to 10\text{ kHz}$).
- **Center Canvas:**
  - In **Cascaded Mode**: Shows the arm moving to target with a live **Speed Limit Envelope** (`[-max_vel, +max_vel]`) and stacked bar showing `u_FF` (emerald) vs. `u_PID` (cyan).
  - In **LQR Cart-Pole Mode**: Interactive 2D cart on a track balancing an upright pole. Clicking the pole applies an external impulse ("Poke Pole"), and vector arrows display each state contribution ($-k_1 x, -k_2 \dot{x}, -k_3 \theta, -k_4 \dot{\theta}$).
- **Bottom Telemetry Strip:** Synchronized multi-trace charts for Position $\theta$, Velocity $\dot{\theta}$ (vs. $\dot{\theta}_{\text{ref}}$), and Control Effort $u(t)$.

### Required `shadcn/ui` Primitives (No Raw Browser Inputs)
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`: Switch between `"Cascaded Servo + Feedforward"` and `"State-Space LQR Cart-Pole"`.
- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`: Frame the interactive canvas, block diagram, and parameter deck.
- `<Slider>`:
  - In Cascaded Mode: `Outer Kp_pos`, `Max Velocity Clamp (rad/s)`, `Inner Kp_vel`, `Inner Ki_vel`, and `Gravity Feedforward Gain (%)` ($0\%$ to $100\%$).
  - In LQR Mode: `Q_pos (x penalty)`, `Q_vel (x_dot penalty)`, `Q_angle (theta penalty)`, `Q_omega (theta_dot penalty)`, and `R (Motor Effort Penalty)`.
- `<Switch>`: `"Enable Velocity Clamp"`, `"Enable Gravity Feedforward u_FF"`, and `"Show Individual State Contributions (-k_i * x_i)"`.
- `<Select>`: Choose trajectory profile (`"Step Jump"`, `"Trapezoidal Velocity Profile"`, `"Sine Wave Tracking"`).
- `<Button>`: `"Poke Pendulum (+15 deg/s)"`, `"Drop 2kg Payload"`, and `"Reset State"`.
- `<Badge>`: Displays computed optimal LQR gains live (`K = [-3.16, -4.82, 38.4, 8.91]`) and closed-loop eigenvalue stability status (`"Stable (All Re(λ) < 0)"`).
- `<Table>`: Live state vector inspection table showing $x_i$, weight $Q_{ii}$, optimal gain $k_i$, and control contribution $-k_i x_i$.
- `<Tooltip>`: Explains Bryson's Rule ($Q_{ii} = 1 / e_{\max}^2$) when hovering over the $\mathbf{Q}$ and $\mathbf{R}$ penalty sliders.
