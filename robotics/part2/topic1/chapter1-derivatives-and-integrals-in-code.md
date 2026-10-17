# Part 2, Topic 1: Discrete Calculus & Physics in Code
## Chapter 1: Derivatives, Integrals & Physics Loops in C++ and Python

---

### 1. Why Calculus on a Robot is Just Addition and Subtraction

In a university mathematics course, calculus is taught as a collection of symbolic rules on smooth, continuous functions. You are given a formula like $x(t) = 3t^2 + 2t$, and you apply algebraic shortcuts to find its derivative $v(t) = \frac{dx}{dt} = 6t + 2$ or its integral.

**A robot never gets a formula for its future path.**

A robot's onboard computer only sees the world through sensors—wheel encoders, IMUs, LiDARs, and cameras—that report numbers at fixed time intervals called **ticks** or **control steps**. If your robot's control loop runs at $f = 100\text{ Hz}$ ($100$ times per second), the computer wakes up every $\Delta t = 0.01\text{ seconds}$, reads the current sensor value $x_k$, compares it with the value from the previous wake-up $x_{k-1}$, updates its internal physics or controller state, commands the motors, and goes back to sleep.

Inside that `while` loop, the mysterious symbols of calculus collapse into elementary arithmetic:

* **Differentiation ($\frac{dx}{dt}$)** becomes **subtraction divided by $\Delta t$**: *"How much did the sensor reading change since the last tick, divided by how much time elapsed?"*
* **Integration ($\int v\,dt$)** becomes **multiplication added to a running total**: *"Take the current speed, multiply by the tick duration $\Delta t$, and add that tiny slice of distance to our accumulated position."*

```
Continuous Reality vs. What the Robot's 100 Hz Loop Actually Sees
=================================================================

Position x(t)
  ^
  |                                      *  x_k (Current tick k)
  |                                   .  |
  |                                .     |  Delta x = x_k - x_{k-1}
  |                             *--------+
  |                       .     | x_{k-1} (Previous tick k-1)
  |                 *           |
  |           *     |           |
  |     *     |     |           |
  +-----+-----+-----+-----------+--------+------> Time (t)
  t=0  0.01  0.02  0.03        0.04     0.05 (seconds)
        |<--->|                 |<------>|
      Delta t = 0.01s          Delta t = 0.01s
```

Once you understand how $\Delta t$, $x_k$, and $x_{k-1}$ interact inside a loop—and why naive subtraction blows up sensor noise while naive addition injects fake energy into physics simulations—you hold the foundation for PID controllers, state estimators (Kalman filters), odometry, and physics engines.

---

### 2. Time Discretization ($\Delta t$): Ticks, Hertz, and State History

#### 2.1 Frequency ($f$) and Time Step ($\Delta t$)

Every digital control loop or physics engine operates on a discrete heartbeat. The relationship between the **loop frequency** $f$ (measured in **Hertz**, $\text{Hz}$, meaning cycles per second) and the **time step** $\Delta t$ (measured in seconds) is reciprocal:

$$\Delta t = \frac{1}{f} \qquad \Longleftrightarrow \qquad f = \frac{1}{\Delta t}$$

| Subsystem in a Typical Robot | Typical Frequency $f$ | Time Step $\Delta t$ | Why This Speed? |
| :--- | :--- | :--- | :--- |
| **Motor Current / Torque Loop** | $1000\text{ Hz} - 20000\text{ Hz}$ | $0.00005\text{ s} - 0.001\text{ s}$ | Electrical coils respond in sub-milliseconds. |
| **IMU & Joint PID Control Loop** | $100\text{ Hz} - 500\text{ Hz}$ | $0.002\text{ s} - 0.010\text{ s}$ | Mechanical inertia responds on a $2-10\text{ ms}$ scale. |
| **Wheel Odometry & Local Planner** | $20\text{ Hz} - 50\text{ Hz}$ | $0.020\text{ s} - 0.050\text{ s}$ | Sufficient for path tracking at $1-3\text{ m/s}$. |
| **LiDAR / Camera SLAM** | $10\text{ Hz} - 30\text{ Hz}$ | $0.033\text{ s} - 0.100\text{ s}$ | Heavy point-cloud or image processing takes tens of ms. |

#### 2.2 The Golden Rule of State History: $x_k$ vs. $x_{k-1}$

In discrete math notation, a subscript $k$ means *"at tick number $k$"*:
* $t_k = k \cdot \Delta t$ is the timestamp of the current tick.
* $x_k$ is the value of variable $x$ right now (at tick $k$).
* $x_{k-1}$ is the value of variable $x$ one tick ago (at tick $k-1$).
* $x_{k-2}$ is the value two ticks ago (at tick $k-2$).

In C++ or Python, we do not keep an infinite array of every historical tick unless we are logging data to disk. Instead, we keep just two variables—`x_curr` ($x_k$) and `x_prev` ($x_{k-1}$)—and **shift** `x_curr` into `x_prev` at the very bottom of the loop:

```
Tick k-1 Finishes                  Tick k Begins
+-------------------+              +-------------------+
| x_curr = 1.42 m   |  =========>  | x_prev = 1.42 m   | (Saved from last tick!)
+-------------------+   Shift at   +-------------------+
                       end of loop | x_curr = read()   | (Fresh reading: 1.45 m)
                                   +-------------------+
```

---

### 3. Numerical Differentiation: Computing Rate of Change from Snapshots

#### 3.1 The Backward Difference Formula

Suppose a linear encoder on a warehouse gantry robot measures only position $x$ in meters, but your safety controller needs to know the gantry's velocity $v$ in $\text{m/s}$ and acceleration $a$ in $\text{m/s}^2$.

In continuous calculus, velocity is the limit of change in position over change in time as $\Delta t \to 0$:

$$v(t) = \frac{dx}{dt} = \lim_{\Delta t \to 0} \frac{x(t) - x(t - \Delta t)}{\Delta t}$$

On a robot computer, $\Delta t$ cannot shrink to zero; the smallest time interval we have between real-time measurements is one loop tick $\Delta t$. Dropping the $\lim_{\Delta t \to 0}$ gives the **First-Order Backward Finite Difference** formula:

$$v_k = \frac{x_k - x_{k-1}}{\Delta t}$$

Similarly, acceleration is the rate of change of velocity:

$$a_k = \frac{v_k - v_{k-1}}{\Delta t} = \frac{x_k - 2x_{k-1} + x_{k-2}}{\Delta t^2}$$

Why is this called the **backward** difference? Because at the current moment $t_k$, the future measurement $x_{k+1}$ has not happened yet! A real-time robot can only look *backward* in time at $x_k$ and $x_{k-1}$. (Only when analyzing recorded log files offline can you use the **central difference** $v_k = \frac{x_{k+1} - x_{k-1}}{2\Delta t}$.)

#### 3.2 The Derivative Noise Trap: Why Dividing by $\Delta t$ Explodes Sensor Jitter

Look closely at the denominator of $v_k = \frac{x_k - x_{k-1}}{\Delta t}$.

If your loop runs at $100\text{ Hz}$, then $\Delta t = 0.01\text{ s}$. Dividing by $0.01$ is mathematically identical to **multiplying by $100$**:

$$v_k = \frac{\Delta x}{0.01} = 100 \cdot \Delta x$$

And if you compute acceleration by dividing by $\Delta t^2 = (0.01)^2 = 0.0001$, you are **multiplying any position error by $10,000$**!

Every physical sensor has tiny random measurement noise $\epsilon_k$. Even a high-grade laser rangefinder might jitter by $\pm 5\text{ mm}$ ($\pm 0.005\text{ m}$) from tick to tick. Let's trace what happens in a concrete dry run when a robot moves at a perfectly steady true velocity of $v_{\text{true}} = 1.00\text{ m/s}$ ($+0.01\text{ m}$ per tick at $\Delta t = 0.01\text{ s}$), while its position sensor adds an alternating $\pm 0.005\text{ m}$ jitter:

| Tick $k$ | Time $t_k$ ($\text{s}$) | True Pos $x_{\text{true}}$ ($\text{m}$) | Sensor Noise $\epsilon_k$ ($\text{m}$) | Measured $x_k$ ($\text{m}$) | Raw $\Delta x = x_k - x_{k-1}$ ($\text{m}$) | Raw Velocity $v_k = \frac{\Delta x}{0.01}$ ($\text{m/s}$) | Raw Accel $a_k = \frac{\Delta v}{0.01}$ ($\text{m/s}^2$) | Filtered Vel $v_{\text{filt},k}$ ($\alpha = 0.2$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| $0$ | $0.00$ | $0.000$ | $+0.005$ | $0.005$ | — | $1.00$ (init) | $0.0$ | $1.000\text{ m/s}$ |
| $1$ | $0.01$ | $0.010$ | $-0.005$ | $0.005$ | $0.000$ | **$0.00\text{ m/s}$** | **$-100.0\text{ m/s}^2$** | $0.800\text{ m/s}$ |
| $2$ | $0.02$ | $0.020$ | $+0.005$ | $0.025$ | $+0.020$ | **$2.00\text{ m/s}$** | **$+200.0\text{ m/s}^2$** | $1.040\text{ m/s}$ |
| $3$ | $0.03$ | $0.030$ | $-0.005$ | $0.025$ | $0.000$ | **$0.00\text{ m/s}$** | **$-200.0\text{ m/s}^2$** | $0.832\text{ m/s}$ |
| $4$ | $0.04$ | $0.040$ | $+0.005$ | $0.045$ | $+0.020$ | **$2.00\text{ m/s}$** | **$+200.0\text{ m/s}^2$** | $1.066\text{ m/s}$ |

Look at those numbers:
1. A tiny $5\text{ mm}$ position error caused the raw computed velocity to thrash wildly between **$0.00\text{ m/s}$** and **$2.00\text{ m/s}$** every single centisecond!
2. Worse still, the raw second derivative (acceleration) claims the robot is experiencing **$\pm 200\text{ m/s}^2$ ($20\text{ Gs}$!)** of violent whiplash.
3. If you feed that raw derivative into a motor controller, the motor will buzz, overheat, and violently shake the robot apart.

```
Why Raw Derivatives Destroy Motor Controllers
=============================================

True Position x(t)          Measured Position x_k        Raw Derivative v_k = dx/dt
(Smooth 1.0 m/s ramp)       (Tiny +-5mm noise)           (Massive 0.0 to 2.0 m/s spikes!)
      ^                           ^                            ^
      |        /                  |        *                   |   *     *     *  (2.0 m/s)
      |      /                    |       / \  *               |   |     |     |
      |    /                      |    * /   \/                |---|-*---|-*---|- (1.0 m/s)
      |  /                        |   / \                      |   | |   | |   |
      +----------> t              +-------------- > t          +---+-*---+-*---+--> t (0.0 m/s)
```

#### 3.3 Taming Derivative Noise with an Exponential Moving Average (Low-Pass Filter)

To use a numerical derivative in real robotics code, we almost always pass the raw derivative through a **First-Order Low-Pass Filter**, also known in software as an **Exponential Moving Average (EMA)**:

$$v_{\text{filt}, k} = \alpha \cdot v_{\text{raw}, k} + (1 - \alpha) \cdot v_{\text{filt}, k-1}$$

where the smoothing factor $\alpha \in (0, 1]$ blends the noisy new reading $v_{\text{raw}, k}$ with our trusted previous estimate $v_{\text{filt}, k-1}$:
* If $\alpha = 1.0$: No filtering at all ($v_{\text{filt}, k} = v_{\text{raw}, k}$). Fast response, maximum noise.
* If $\alpha = 0.1$: $10\%$ weight on the new reading, $90\%$ weight on history. Very smooth, but introduces a slight time lag.

Instead of guessing $\alpha$ by trial and error, robotics engineers compute $\alpha$ from a desired **filter time constant** $\tau$ (in seconds) or **cutoff frequency** $f_c = \frac{1}{2\pi\tau}$ (in $\text{Hz}$):

$$\alpha = \frac{\Delta t}{\tau + \Delta t} = \frac{\Delta t}{\frac{1}{2\pi f_c} + \Delta t}$$

Writing $\alpha$ in terms of $\tau$ and $\Delta t$ has a huge software engineering advantage: if you later change your control loop from $100\text{ Hz}$ to $250\text{ Hz}$, the filter automatically adjusts $\alpha$ so its physical smoothing behavior stays identical!

```cpp
#include <cmath>

class FilteredDerivative {
public:
    FilteredDerivative(double cutoff_hz)
        : tau_(1.0 / (2.0 * 3.14159265358979323846 * cutoff_hz)),
          initialized_(false),
          x_prev_(0.0),
          v_filt_(0.0) {}

    double update(double x_curr, double dt) {
        if (dt <= 1e-9) return v_filt_;
        //  ^^^^^^^^^^
        // Guard against division by zero if two calls happen at the same timestamp!

        if (!initialized_) {
            x_prev_ = x_curr;
            v_filt_ = 0.0;
            initialized_ = true;
            return v_filt_;
            //     ^^^^^^^
            // On the very first tick (k=0), there is no x_{k-1} yet!
            // Without this guard, x_curr - 0.0 would cause a massive startup spike.
        }

        double v_raw = (x_curr - x_prev_) / dt;
        //             ^^^^^^^^^^^^^^^^^^^^^^^
        // Backward difference: change in position divided by elapsed tick time.

        double alpha = dt / (tau_ + dt);
        //             ^^^^^^^^^^^^^^^^
        // Compute time-step-invariant EMA weight from physical time constant tau_.

        v_filt_ = alpha * v_raw + (1.0 - alpha) * v_filt_;
        //        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // Exponential Moving Average blends fresh derivative with historical estimate.

        x_prev_ = x_curr;
        //        ^^^^^^
        // CRITICAL: Shift current state into previous state for tick k+1!

        return v_filt_;
    }

private:
    double tau_;
    bool initialized_;
    double x_prev_;
    double v_filt_;
};
```

**What's happening:**
1. **`if (dt <= 1e-9)`**: Protects your robot from producing `inf` or `NaN` if a timer glitch calls `update()` twice with zero elapsed time.
2. **`if (!initialized_)`**: Solves the **"First-Tick Startup Spike"** bug. If a robot starts at $x_0 = 5.0\text{ m}$ and `x_prev_` was initialized to $0.0\text{ m}$, the first tick would compute $v_0 = \frac{5.0 - 0.0}{0.01} = 500\text{ m/s}$! Seeding `x_prev_ = x_curr` on tick $0$ prevents this.
3. **`v_raw = (x_curr - x_prev_) / dt`**: Computes the raw finite difference slope.
4. **`alpha = dt / (tau_ + dt)`**: Automatically adapts the low-pass filter weight to whatever `dt` actually elapsed on this tick.
5. **`x_prev_ = x_curr`**: Shifts state history forward so the next tick computes $x_{k+1} - x_k$.

---

### 4. Numerical Integration: Accumulating Rate of Change Over Time

#### 4.1 Why Integration is Naturally Noise-Smoothing

Now consider the opposite problem: your robot has a wheel speed sensor or an IMU gyroscope that measures velocity $v(t)$ (or angular velocity $\omega(t)$), and you want to track total position $x(t)$ (or heading angle $\theta(t)$).

In continuous calculus, position is the definite integral (the signed area under the curve) of velocity over time:

$$x(t_k) = x(t_{k-1}) + \int_{t_{k-1}}^{t_k} v(t)\,dt$$

Notice that integration **multiplies** by $\Delta t$ instead of dividing by $\Delta t$:

$$\Delta x_k \approx v_k \cdot \Delta t$$

Because $\Delta t = 0.01\text{ s}$ is small, random zero-mean sensor noise $\pm \epsilon_k$ gets **multiplied by $0.01$** on each step and cancels itself out over time ($\text{positive jitter} + \text{negative jitter} \approx 0$). However, integration has its own nemesis: **constant bias drift** and **truncation error on curves**.

```
Approximating the Area Under v(t) Over One Time Step Delta t
============================================================

1) Forward Euler                     2) Trapezoidal Rule
   (Uses left-edge height v_k)          (Uses average height (v_k + v_{k+1})/2)

Velocity v(t)                        Velocity v(t)
  ^                                    ^
  |              * v_{k+1}             |              * v_{k+1}
  |           .  |                     |           . /|
  |        .  gap| (Missed area!)      |        .  /  |
  |     *--------+                     |     *    /   |
  |     |////////|                     |     |///+////|
  | v_k |////////|                     | v_k |////////|
  +-----+--------+----> t              +-----+--------+----> t
       t_k     t_{k+1}                      t_k     t_{k+1}
   Area = v_k * dt                      Area = 0.5 * (v_k + v_{k+1}) * dt
```

#### 4.2 Comparing the Four Essential Integrators in Robotics

Depending on whether you are integrating live sensor data or simulating a physics engine, you will encounter four integration schemes:

1. **Forward (Explicit) Euler Integration:**
   Uses the slope at the *beginning* of the time step to project forward:
   $$v_{k+1} = v_k + a_k \cdot \Delta t$$
   $$x_{k+1} = x_k + v_k \cdot \Delta t \quad \text{(Note: uses OLD } v_k\text{!)}$$
   * **Pros:** Simplest possible formula.
   * **Cons:** First-order accuracy $\mathcal{O}(\Delta t)$. Worse, in oscillatory physics (like a robot arm joint with gravity or a spring suspension), Forward Euler always steps slightly tangent *outside* the true circular phase orbit. Every tick adds phantom energy until your simulation explodes!

2. **Semi-Implicit (Symplectic) Euler Integration:**
   Updates velocity first using current acceleration $a_k$, and then immediately uses the **new** velocity $v_{k+1}$ to update position:
   $$v_{k+1} = v_k + a_k \cdot \Delta t$$
   $$x_{k+1} = x_k + v_{k+1} \cdot \Delta t \quad \text{(Uses NEW } v_{k+1}\text{!)}$$
   * **Pros:** Literally the same CPU cost as Forward Euler (one line reordered!), yet it is **symplectic**—meaning it conserves bounded energy in springs, pendulums, and orbital mechanics without exploding. Almost all real-time game and robotics physics engines (MuJoCo, Bullet, Box2D) use Semi-Implicit Euler as their baseline.

3. **Trapezoidal Integration (For Sensor Streams):**
   When integrating a stream of measured velocities $v_{k-1}$ and $v_k$, averaging the previous and current readings forms a trapezoid instead of a flat rectangle:
   $$x_k = x_{k-1} + \frac{1}{2}(v_{k-1} + v_k) \cdot \Delta t$$
   * **Pros:** Second-order accuracy $\mathcal{O}(\Delta t^2)$ with zero extra sensor delay. For constant acceleration, Trapezoidal integration is **100% mathematically exact**!

4. **Fourth-Order Runge-Kutta (RK4) Integration (For High-Precision Simulation):**
   When simulating a differential equation $\dot{\mathbf{s}} = f(\mathbf{s}, u)$ where $\mathbf{s} = [x, v]^T$, RK4 probes the slope four times per step—at the start ($k_1$), twice at the midpoint ($k_2, k_3$), and at the end ($k_4$)—and takes a weighted average:
   $$k_1 = f(\mathbf{s}_k, u_k)$$
   $$k_2 = f\!\left(\mathbf{s}_k + \tfrac{\Delta t}{2} k_1, u_k\right), \qquad k_3 = f\!\left(\mathbf{s}_k + \tfrac{\Delta t}{2} k_2, u_k\right)$$
   $$k_4 = f(\mathbf{s}_k + \Delta t\, k_3, u_k)$$
   $$\mathbf{s}_{k+1} = \mathbf{s}_k + \frac{\Delta t}{6}\left(k_1 + 2k_2 + 2k_3 + k_4\right)$$
   * **Pros:** Fourth-order accuracy $\mathcal{O}(\Delta t^4)$—halving $\Delta t$ reduces single-step error by $16\times$.

#### 4.3 Dry Run: Exact Calculus vs. Euler vs. Semi-Implicit vs. Trapezoidal

Let's test these integrators on a robot accelerating from rest ($x_0 = 0\text{ m}, v_0 = 0\text{ m/s}$) at a constant acceleration of $a = 2.0\text{ m/s}^2$ with a coarse time step of $\Delta t = 0.5\text{ s}$. From continuous physics, the exact position is $x_{\text{exact}}(t) = \frac{1}{2}at^2 = t^2$:

| Tick $k$ | Time $t_k$ ($\text{s}$) | True Vel $v_k = 2t_k$ ($\text{m/s}$) | Exact Pos $x = \frac{1}{2}at^2$ ($\text{m}$) | Forward Euler $x_k = x_{k-1} + v_{k-1}\Delta t$ | Semi-Implicit Euler $x_k = x_{k-1} + v_k\Delta t$ | Trapezoidal Rule $x_k = x_{k-1} + \frac{v_{k-1}+v_k}{2}\Delta t$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| $0$ | $0.0$ | $0.0$ | **$0.00\text{ m}$** | $0.00\text{ m}$ | $0.00\text{ m}$ | **$0.00\text{ m}$** |
| $1$ | $0.5$ | $1.0$ | **$0.25\text{ m}$** | $0.00 + (0.0)(0.5) = 0.00\text{ m}$ | $0.00 + (1.0)(0.5) = 0.50\text{ m}$ | $0.00 + \frac{0+1}{2}(0.5) = \mathbf{0.25\text{ m}}$ |
| $2$ | $1.0$ | $2.0$ | **$1.00\text{ m}$** | $0.00 + (1.0)(0.5) = 0.50\text{ m}$ | $0.50 + (2.0)(0.5) = 1.50\text{ m}$ | $0.25 + \frac{1+2}{2}(0.5) = \mathbf{1.00\text{ m}}$ |
| $3$ | $1.5$ | $3.0$ | **$2.25\text{ m}$** | $0.50 + (2.0)(0.5) = 1.50\text{ m}$ | $1.50 + (3.0)(0.5) = 3.00\text{ m}$ | $1.00 + \frac{2+3}{2}(0.5) = \mathbf{2.25\text{ m}}$ |
| $4$ | $2.0$ | $4.0$ | **$4.00\text{ m}$** | $1.50 + (3.0)(0.5) = 3.00\text{ m}$ | $3.00 + (4.0)(0.5) = 5.00\text{ m}$ | $2.25 + \frac{3+4}{2}(0.5) = \mathbf{4.00\text{ m}}$ |

Notice how Forward Euler systematically **undershoots** ($3.00\text{ m}$ vs $4.00\text{ m}$) because it uses the stale velocity from the start of each step, while Semi-Implicit Euler **overshoots** ($5.00\text{ m}$) on a pure open-loop ramp, and the **Trapezoidal Rule hits $4.00\text{ m}$ with zero error** because the average of $v_{k-1}$ and $v_k$ equals the exact midpoint velocity!

---

### 5. Newtonian Dynamics in Code: Building a 100 Hz Physics Plant Simulator

Before you ever run a controller on expensive hardware, you should test it against a **plant simulator**—a piece of code that uses Newton's Second Law to simulate how the physical robot responds to motor forces or torques.

#### 5.1 Linear and Rotational Equations of Motion

Every mechanical degree of freedom obeys Newton's Second Law—either in linear form or rotational form:

1. **Linear Motion (e.g., Drone Altitude, Elevator Carriage, Linear Actuator):**
   $$\sum F = m a \quad \Longrightarrow \quad F_{\text{thrust}} - b \cdot v - m g = m a$$
   Solving for linear acceleration $a = \ddot{z}$:
   $$a = \frac{F_{\text{thrust}} - b \cdot v - m g}{m}$$
   where:
   * $m$ is the mass ($\text{kg}$),
   * $F_{\text{thrust}}$ is the upward actuator force ($\text{N}$),
   * $b \cdot v$ is viscous damping / air drag opposing motion ($b$ in $\text{N}\cdot\text{s/m}$),
   * $m g$ is the downward force of gravity ($g = 9.81\text{ m/s}^2$).

2. **Rotational Motion (e.g., Single-Link Robot Arm Joint / Pendulum):**
   $$\sum \tau = I \alpha \quad \Longrightarrow \quad \tau_{\text{motor}} - b_{\text{rot}} \cdot \omega - m g L_{\text{com}} \sin\theta = I \alpha$$
   Solving for angular acceleration $\alpha = \ddot{\theta}$:
   $$\alpha = \frac{\tau_{\text{motor}} - b_{\text{rot}} \cdot \omega - m g L_{\text{com}} \sin\theta}{I}$$
   where:
   * $I$ is the rotational moment of inertia ($\text{kg}\cdot\text{m}^2$),
   * $\tau_{\text{motor}}$ is the torque applied by the joint motor ($\text{N}\cdot\text{m}$),
   * $b_{\text{rot}} \cdot \omega$ is joint friction opposing angular velocity $\omega$ ($\text{N}\cdot\text{m}\cdot\text{s/rad}$),
   * $m g L_{\text{com}} \sin\theta$ is the gravitational restoring torque pulling the arm toward $\theta = 0$ (hanging straight down).

```
Free-Body Diagrams for Linear vs. Rotational Robot Plants
=========================================================

   Linear Plant (1D Drone / Lift)         Rotational Plant (1-DOF Robot Arm)
         ^ F_thrust                              O  <-- Joint Pivot (Torque tau_motor,
         |                                        \     damping -b_rot * omega)
     +-------+                                     \
     | Mass  |  ^ z (height)                        \ L_com
     |   m   |  |                                    * <-- Center of Mass (m)
     +-------+                                       |     theta = angle from vertical
      |     |                                        v
      v     v                                    F_grav = m * g
    m*g    b*v (drag)                            Gravity Torque = m*g*L_com*sin(theta)
```

Every single tick of a physics simulator follows the exact same 3-step recipe:
1. **Forces $\to$ Acceleration:** Add up all forces (or torques) acting on the current state and divide by mass $m$ (or inertia $I$) to get acceleration $a_k$.
2. **Acceleration $\to$ Velocity:** Integrate acceleration over $\Delta t$ to update velocity $v_{k+1}$.
3. **Velocity $\to$ Position:** Integrate velocity over $\Delta t$ to update position $x_{k+1}$.

#### 5.2 Complete C++ Implementation: 100 Hz Physics Loop & Sensor Simulator

```cpp
#include <iostream>
#include <iomanip>
#include <cmath>

struct Drone1DState {
    double z = 0.0;      // Altitude (m)
    double v = 0.0;      // Vertical velocity (m/s)
    double a = 0.0;      // Vertical acceleration (m/s^2)
};

class Drone1DPlant {
public:
    Drone1DPlant(double mass_kg, double drag_coeff)
        : m_(mass_kg), b_(drag_coeff), g_(9.81) {}

    // Advance the physical world by one discrete time step dt
    void stepSemiImplicitEuler(double thrust_newtons, double dt) {
        double f_gravity = m_ * g_;
        double f_drag    = b_ * state_.v;
        //                 ^^^^^^^^^^^^^
        // Viscous air resistance opposes current velocity v.

        double f_net = thrust_newtons - f_gravity - f_drag;
        state_.a = f_net / m_;
        //         ^^^^^^^^^^
        // Step 1 (Newton's 2nd Law): a_k = F_net / m

        state_.v += state_.a * dt;
        //          ^^^^^^^^^^^^^
        // Step 2 (Integrate a -> v): Update velocity FIRST for Semi-Implicit Euler.

        state_.z += state_.v * dt;
        //          ^^^^^^^^^^^^^
        // Step 3 (Integrate v -> z): Use the NEW velocity state_.v to update altitude.

        if (state_.z < 0.0) {
            state_.z = 0.0;
            if (state_.v < 0.0) state_.v = 0.0;
            //                  ^^^^^^^^^^^^^^^
            // Ground contact constraint: prevent falling through the floor (z < 0).
        }
    }

    const Drone1DState& state() const { return state_; }

private:
    double m_;
    double b_;
    double g_;
    Drone1DState state_;
};

int main() {
    Drone1DPlant drone(1.5, 0.3); // 1.5 kg drone, 0.3 N*s/m air drag
    const double dt = 0.01;       // 100 Hz physics loop (10 ms per tick)
    const double thrust = 20.0;   // Constant 20 N upward thrust (hover is 1.5*9.81 = 14.715 N)

    std::cout << std::fixed << std::setprecision(4);
    std::cout << "Tick | Time(s) | Accel(m/s^2) | Vel(m/s) | Altitude(m)\n";
    std::cout << "-----+---------+--------------+----------+------------\n";

    for (int k = 0; k <= 100; ++k) {
        if (k % 20 == 0) { // Print every 0.20 seconds
            std::cout << std::setw(4) << k << " | "
                      << std::setw(7) << k * dt << " | "
                      << std::setw(12) << drone.state().a << " | "
                      << std::setw(8) << drone.state().v << " | "
                      << std::setw(10) << drone.state().z << "\n";
        }
        drone.stepSemiImplicitEuler(thrust, dt);
    }
    return 0;
}
```

**What's happening:**
1. **`f_net = thrust_newtons - f_gravity - f_drag`**: Sums all forces acting on the drone at tick $k$. Since hover thrust for a $1.5\text{ kg}$ drone is $1.5 \times 9.81 = 14.715\text{ N}$, applying $20.0\text{ N}$ creates a net upward force of $+5.285\text{ N}$ at liftoff.
2. **`state_.v += state_.a * dt` followed by `state_.z += state_.v * dt`**: Executes Semi-Implicit Euler integration. Notice that as `state_.v` increases, `f_drag = b_ * state_.v` automatically grows, gradually reducing `state_.a` until the drone reaches terminal velocity where $F_{\text{thrust}} - mg = b v$.
3. **Ground Constraint (`if (state_.z < 0.0)`)**: Real robots sit on a floor before takeoff. Clamping $z \ge 0$ and zeroing downward velocity prevents the drone from sinking into negative altitude when thrust is less than weight.

#### 5.3 Complete Python Implementation: Comparing Forward Euler vs. Semi-Implicit Euler on a Robot Joint

To see why **Semi-Implicit Euler** is mandatory for oscillatory mechanics, let's simulate an undamped robot pendulum arm ($b_{\text{rot}} = 0, \tau_{\text{motor}} = 0$) released horizontally at $\theta_0 = \frac{\pi}{2}\text{ rad}$ ($90^\circ$). By conservation of energy, the arm should never swing higher than $\pm 90^\circ$ ($\pm 1.5708\text{ rad}$):

```python
import math

def simulate_pendulum(use_semi_implicit: bool, dt: float = 0.02, steps: int = 250):
    mass, length, g = 1.0, 1.0, 9.81
    inertia = mass * (length ** 2)  # Point mass moment of inertia I = m * L^2
    
    theta = math.pi / 2.0  # Start horizontal at +90 deg (1.5708 rad)
    omega = 0.0            # Start from rest (0 rad/s)

    for k in range(steps):
        torque_gravity = -mass * g * length * math.sin(theta)
        #                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        # Restoring torque pulling the robot link toward straight down (theta = 0).

        alpha = torque_gravity / inertia
        #       ^^^^^^^^^^^^^^^^^^^^^^^^
        # Rotational Newton's 2nd Law: alpha = tau / I.

        if use_semi_implicit:
            omega = omega + alpha * dt
            theta = theta + omega * dt
            #               ^^^^^^^^^^
            # Semi-Implicit Euler uses the NEW omega -> bounded total energy!
        else:
            theta_next = theta + omega * dt
            #                    ^^^^^^^^^^
            # Forward Euler uses the OLD omega -> injects artificial energy every tick!
            omega = omega + alpha * dt
            theta = theta_next

    total_energy = 0.5 * inertia * (omega ** 2) + mass * g * length * (1.0 - math.cos(theta))
    return math.degrees(theta), total_energy

if __name__ == "__main__":
    Initial_E = 1.0 * 9.81 * 1.0 * (1.0 - math.cos(math.pi / 2.0))
    _, e_forward = simulate_pendulum(use_semi_implicit=False)
    _, e_symplectic = simulate_pendulum(use_semi_implicit=True)

    print(f"True Initial Mechanical Energy : {Initial_E:.3f} Joules")
    print(f"Forward Euler Energy after 5s  : {e_forward:.3f} Joules (EXPLODING!)")
    print(f"Semi-Implicit Energy after 5s  : {e_symplectic:.3f} Joules (CONSERVED!)")
```

**What's happening:**
1. **`torque_gravity = -mass * g * length * math.sin(theta)`**: Computes the non-linear gravitational torque on the joint.
2. **In the `False` (Forward Euler) branch**: After just $5\text{ seconds}$ ($250$ ticks at $\Delta t = 0.02\text{ s}$), the total mechanical energy balloons from **$9.81\text{ J}$ to over $26.4\text{ J}$**—the simulated arm starts spinning over the top like a propeller from phantom numerical energy!
3. **In the `True` (Semi-Implicit Euler) branch**: Swapping the update order of `omega` and `theta` keeps the mechanical energy locked near **$9.81\text{ J}$** indefinitely.

---

### 6. Common Mistakes & Debugging Checklist

| Symptom in Your Robot / Simulator | Root Cause | Concrete Fix |
| :--- | :--- | :--- |
| **Velocity is always $0.0$** | You wrote `x_prev = x_curr` *before* computing `(x_curr - x_prev) / dt`. | Always compute derivatives first, then assign `x_prev = x_curr` at the bottom of the loop. |
| **Huge velocity spike on the very first tick ($k=0$)** | `x_prev` was initialized to `0.0`, but the sensor started at `x_curr = 3.5 m`. | Add an `if (!initialized)` flag that sets `x_prev = x_curr` and returns `0.0` on tick $0$. |
| **Motor chatters violently when derivative term is enabled** | Differentiating raw sensor ticks amplifies high-frequency jitter by $1/\Delta t$. | Pass `v_raw` through a first-order low-pass filter (`alpha = dt / (tau + dt)`) before using it. |
| **Physics simulation explodes to `NaN` after a few seconds** | Using Forward Euler (`x += v*dt` before `v += a*dt`) or a time step $\Delta t$ that is too large for the joint stiffness. | Switch to Semi-Implicit Euler (`v += a*dt` first, then `x += v*dt`) or RK4, and keep $\Delta t \le 0.01\text{ s}$. |
| **Integrated position drifts $10\%$ off when CPU load is high** | Hardcoding `const double dt = 0.01;` while the OS thread actually slept for $11\text{ ms}$. | Measure actual elapsed time using `std::chrono::steady_clock` (C++) or `time.monotonic()` (Python). |

---

### 7. Quick Reference Summary

| Calculus Operation | Continuous Formula | Discrete Code Formula (Tick $k$) | Noise / Stability Behavior |
| :--- | :--- | :--- | :--- |
| **Time Step** | $dt \to 0$ | $\Delta t = t_k - t_{k-1} = \frac{1}{f}$ | Measure with monotonic clock; guard $\Delta t > 0$. |
| **1st Derivative (Velocity)** | $v = \frac{dx}{dt}$ | $v_k = \frac{x_k - x_{k-1}}{\Delta t}$ | Amplifies sensor noise by $\frac{1}{\Delta t}$; requires EMA filter. |
| **Low-Pass Filter (EMA)** | $\tau \dot{v}_f + v_f = v$ | $v_{f,k} = \alpha v_k + (1-\alpha)v_{f,k-1}, \; \alpha = \frac{\Delta t}{\tau + \Delta t}$ | Attenuates jitter above cutoff $f_c = \frac{1}{2\pi\tau}$. |
| **2nd Derivative (Accel)** | $a = \frac{d^2x}{dt^2}$ | $a_k = \frac{v_k - v_{k-1}}{\Delta t}$ | Amplifies position noise by $\frac{1}{\Delta t^2}$. |
| **Forward Euler Integral** | $x = \int v\,dt$ | $x_{k+1} = x_k + v_k \Delta t, \; v_{k+1} = v_k + a_k \Delta t$ | Unstable on springs/pendulums (adds fake energy). |
| **Semi-Implicit Euler** | $x = \int v\,dt$ | $v_{k+1} = v_k + a_k \Delta t, \; x_{k+1} = x_k + v_{k+1} \Delta t$ | Conserves bounded energy; standard for physics loops. |
| **Trapezoidal Integral** | $x = \int v\,dt$ | $x_k = x_{k-1} + \frac{1}{2}(v_{k-1} + v_k)\Delta t$ | Exact for constant acceleration sensor streams. |

---

### Practice & Self-Check

**Predict the Output / Trace by Hand**

**Q1. Backward differences at 50 Hz.** A gantry encoder runs at $f = 50\text{ Hz}$. It reports $x_0 = 0.100$, $x_1 = 0.112$, $x_2 = 0.118$, $x_3 = 0.134$ (meters). What is $\Delta t$? Using Section 3.1's formulas, compute the raw velocity $v_k$ for $k = 1, 2, 3$ and the raw acceleration $a_k$ for $k = 2, 3$. By what factor does this loop amplify a position error when computing acceleration?

**Q2. Tracing `FilteredDerivative`.** Assume the filter's time constant is $\tau = 0.04\text{ s}$ and every call uses `dt = 0.01`. What is $\alpha$? The positions passed to `update()` are `2.00, 2.01, 2.03, 2.03`. What does each of the four calls return? Then: what would the **first** call return if the `if (!initialized_)` guard were deleted (so `x_prev_` starts at `0.0`)?

**Q3. Integrator race with new numbers.** Repeat the Section 4.3 dry run for a robot starting from rest with $a = 4.0\text{ m/s}^2$ and $\Delta t = 0.25\text{ s}$, for ticks $k = 1, 2, 3$. Fill in exact position, Forward Euler, Semi-Implicit Euler and Trapezoidal columns.

**Q4. Inside `Drone1DPlant`.** For the chapter's `main()` (mass $1.5\text{ kg}$, $b = 0.3$, thrust $20\text{ N}$, `dt = 0.01`):

1. What numbers are printed on the `k = 0` row (acceleration, velocity, altitude)?
2. What are `a`, `v`, `z` after the **first** and **second** calls to `stepSemiImplicitEuler`?
3. What terminal velocity does the drone approach?

**Q5. Spot the bug.** This Python loop reproduces the first row of the Common Mistakes table. What does it print, and which line is wrong?

```python
dt = 0.01
x_prev = 0.0
for x_curr in [1.00, 1.02, 1.05]:
    x_prev = x_curr
    v = (x_curr - x_prev) / dt
    print(round(v, 3))
```

**Coding Exercises**

**E1 (Easy). Offline central difference.** For a recorded log (offline analysis, so the future sample *is* available), return the central-difference velocity $v_k = \frac{x_{k+1} - x_{k-1}}{2\Delta t}$ for every interior sample $k = 1, \ldots, n-2$.

```python
def central_difference(xs: list[float], dt: float) -> list[float]: ...
# central_difference([0.0, 0.01, 0.04, 0.09, 0.16], 0.1) -> [0.2, 0.4, 0.6]   (x = t^2, so v = 2t)
# central_difference([5.0, 5.0], 0.01)                   -> []
```

**E2 (Easy–Medium). Trapezoidal integration with real timestamps.** The last row of Common Mistakes warns that the real $\Delta t$ jitters. Integrate a velocity stream using each sample's **measured** timestamp, so every slice uses its own $\Delta t_k = t_k - t_{k-1}$. Return the position at every timestamp.

```python
def integrate_trapezoid(ts: list[float], vs: list[float], x0: float = 0.0) -> list[float]: ...
# ts = [0.0, 0.1, 0.3, 0.4], vs = [0.0, 1.0, 3.0, 4.0]  (v = 10 t, exact x = 5 t^2)
#   -> [0.0, 0.05, 0.45, 0.8]
```

**E3 (Medium). One RK4 step in C++.** Implement Section 4.2's RK4 for an undamped spring–mass, $\dot{x} = v$, $\dot{v} = -\omega_0^2 x$, with state $\mathbf{s} = [x, v]^T$.

```cpp
struct State { double x; double v; };
State rk4Step(State s, double omega0, double dt);
// rk4Step({1.0, 0.0}, 1.0, 0.1) -> x ≈ 0.99500417, v ≈ -0.09983333
// (exact: cos(0.1) = 0.99500417, -sin(0.1) = -0.09983342)
```

#### Dry-Run: Answers

**Q1 — $\Delta t = 0.02\text{ s}$; $v = [0.6, 0.3, 0.8]\text{ m/s}$; $a_2 = -15$, $a_3 = +25\text{ m/s}^2$; amplification $1/\Delta t^2 = 2500$.**

| k | $x_k$ (m) | $\Delta x$ (m) | $v_k = \Delta x / 0.02$ (m/s) | $a_k = \Delta v / 0.02$ (m/s²) |
|---|---|---|---|---|
| 0 | 0.100 | — | — | — |
| 1 | 0.112 | 0.012 | 0.6 | — |
| 2 | 0.118 | 0.006 | 0.3 | (0.3 − 0.6)/0.02 = −15 |
| 3 | 0.134 | 0.016 | 0.8 | (0.8 − 0.3)/0.02 = +25 |

Millimetre-level differences in $\Delta x$ already produce double-digit accelerations, because $1/\Delta t^2 = 1/0.0004 = 2500$.

**Q2 — $\alpha = 0.2$; returns `0.0, 0.2, 0.56, 0.448`; without the guard the first call returns `40.0`.** $\alpha = \frac{0.01}{0.04 + 0.01} = 0.2$.

| Call | x_curr | x_prev_ | v_raw | v_filt = 0.2 v_raw + 0.8 v_filt(prev) | returned |
|---|---|---|---|---|---|
| 1 | 2.00 | (seeded to 2.00) | — | initialisation branch | 0.0 |
| 2 | 2.01 | 2.00 | 1.0 | 0.2(1.0) + 0.8(0.0) | 0.2 |
| 3 | 2.03 | 2.01 | 2.0 | 0.2(2.0) + 0.8(0.2) = 0.4 + 0.16 | 0.56 |
| 4 | 2.03 | 2.03 | 0.0 | 0.2(0.0) + 0.8(0.56) | 0.448 |

Without the guard: $v_{\text{raw}} = (2.00 - 0.0)/0.01 = 200$, and $v_{\text{filt}} = 0.2 \times 200 + 0.8 \times 0 = 40.0\text{ m/s}$ — the "First-Tick Startup Spike", only softened (not removed) by the filter.

**Q3 — exact $x = 2t^2$ gives $0.125, 0.5, 1.125$; Trapezoidal matches exactly.** True $v_k = 4t_k = 1, 2, 3\text{ m/s}$.

| k | $t_k$ | $v_k$ | Exact | Forward Euler | Semi-Implicit Euler | Trapezoidal |
|---|---|---|---|---|---|---|
| 0 | 0.00 | 0 | 0.000 | 0.00 | 0.00 | 0.000 |
| 1 | 0.25 | 1 | 0.125 | 0 + 0(0.25) = 0.00 | 0 + 1(0.25) = 0.25 | 0 + 0.5(0.25) = 0.125 |
| 2 | 0.50 | 2 | 0.500 | 0 + 1(0.25) = 0.25 | 0.25 + 2(0.25) = 0.75 | 0.125 + 1.5(0.25) = 0.500 |
| 3 | 0.75 | 3 | 1.125 | 0.25 + 2(0.25) = 0.75 | 0.75 + 3(0.25) = 1.50 | 0.5 + 2.5(0.25) = 1.125 |

Same pattern as the chapter: Forward Euler undershoots by $0.375\text{ m}$, Semi-Implicit overshoots by $0.375\text{ m}$, Trapezoidal is exact for constant acceleration.

**Q4 — (1) `0.0000 | 0.0000 | 0.0000`; (2) see table; (3) $v_t \approx 17.62\text{ m/s}$.**

1. The loop prints **before** it calls `stepSemiImplicitEuler`, so row `k = 0` shows the default-constructed state: `a = 0`, `v = 0`, `z = 0` (with time `0.0000`).
2. Net force at rest is $20 - 1.5 \times 9.81 - 0 = 5.285\text{ N}$.

| Call | f_drag = 0.3 v | a = f_net / 1.5 | v += a·dt | z += v·dt |
|---|---|---|---|---|
| 1 | 0 | 5.285 / 1.5 = 3.52333 | 0.0352333 | 0.000352333 |
| 2 | 0.3 × 0.0352333 = 0.01057 | 5.27443 / 1.5 = 3.51629 | 0.0703962 | 0.0010563 |

Note that `z` uses the **new** `v` on each call (semi-implicit). Drag has already shaved a little off `a` on the second call.

3. Terminal velocity is where $a = 0$: $20 - 14.715 = 0.3\,v$ → $v_t = 5.285 / 0.3 \approx 17.62\text{ m/s}$.

**Q5 — prints `0.0` three times; the bug is `x_prev = x_curr` placed before the derivative.** After that assignment `x_curr - x_prev` is always `0`. Fix: compute `v = (x_curr - x_prev) / dt` first, then shift `x_prev = x_curr` at the bottom of the loop (and seed `x_prev` from the first sample, as in Q2). With the fix (and seeding), the outputs are `0.0`, then $0.02/0.01 = 2.0$, then $0.03/0.01 = 3.0$.

**E1 — reference solution.**

```python
def central_difference(xs: list[float], dt: float) -> list[float]:
    """Offline only: needs x_{k+1}, which a live control loop never has."""
    return [(xs[k + 1] - xs[k - 1]) / (2.0 * dt) for k in range(1, len(xs) - 1)]
```

$O(n)$. For $x = t^2$ the central difference is exact: $\frac{(t+h)^2 - (t-h)^2}{2h} = 2t$, so the outputs are exactly $0.2, 0.4, 0.6$ (up to floating-point rounding). It is second-order accurate, $\mathcal{O}(\Delta t^2)$, versus first-order for the backward difference.

**E2 — reference solution.**

```python
def integrate_trapezoid(ts: list[float], vs: list[float], x0: float = 0.0) -> list[float]:
    xs = [x0]
    for k in range(1, len(ts)):
        dt_k = ts[k] - ts[k - 1]          # measured, not assumed
        if dt_k <= 0.0:                   # duplicate/out-of-order timestamp: skip slice
            xs.append(xs[-1])
            continue
        xs.append(xs[-1] + 0.5 * (vs[k - 1] + vs[k]) * dt_k)
    return xs
```

$O(n)$. Trace: $0 + \frac{0+1}{2}(0.1) = 0.05$; $0.05 + \frac{1+3}{2}(0.2) = 0.45$; $0.45 + \frac{3+4}{2}(0.1) = 0.80$. These equal $5t^2$ exactly because $v$ is linear in $t$ (constant acceleration), even though the steps are uneven.

**E3 — reference solution.**

```cpp
struct State { double x; double v; };

State deriv(const State& s, double omega0) {
    return { s.v, -omega0 * omega0 * s.x };       // [x_dot, v_dot]
}

State rk4Step(State s, double omega0, double dt) {
    State k1 = deriv(s, omega0);
    State k2 = deriv({s.x + 0.5 * dt * k1.x, s.v + 0.5 * dt * k1.v}, omega0);
    State k3 = deriv({s.x + 0.5 * dt * k2.x, s.v + 0.5 * dt * k2.v}, omega0);
    State k4 = deriv({s.x + dt * k3.x,       s.v + dt * k3.v},       omega0);
    return { s.x + dt / 6.0 * (k1.x + 2.0 * k2.x + 2.0 * k3.x + k4.x),
             s.v + dt / 6.0 * (k1.v + 2.0 * k2.v + 2.0 * k3.v + k4.v) };
}
```

Four slope evaluations per step. Hand check for $\omega_0 = 1$, $s = (1, 0)$, $\Delta t = 0.1$: $k_1 = (0, -1)$, $k_2 = (-0.05, -1)$, $k_3 = (-0.05, -0.9975)$, $k_4 = (-0.09975, -0.995)$, giving $x = 1 + \frac{0.1}{6}(-0.29975) = 0.99500417$ and $v = \frac{0.1}{6}(-5.99) = -0.09983333$. The error versus $\cos(0.1)$ is about $1.4 \times 10^{-9}$ in $x$ — compare Forward Euler, which would give $x = 1.0$, $v = -0.1$.

---

### 8. Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Frontend Implementation Guide):** Build an interactive **Discrete Calculus & Physics Loop Workbench** using React, Tailwind CSS, HTML5 Canvas / SVG, and `shadcn/ui` primitives. Do **not** use raw `<input type="range">`, `<select>`, or `<button>` HTML tags; strictly use the `shadcn/ui` components specified below.

#### 8.1 Layout & Component Hierarchy (`shadcn/ui`)

1. **Top-Level Container:** A `<Card className="w-full max-w-6xl mx-auto border-border/60 bg-card/95 shadow-lg">` with `<CardHeader>`, `<CardTitle>`, and `<CardDescription>`.
2. **Mode Switcher (`<Tabs>`):**
   * `<Tabs defaultValue="differentiation">`:
     * `<TabsTrigger value="differentiation">1. Derivative Noise & EMA Filter</TabsTrigger>`
     * `<TabsTrigger value="integration">2. Integrator Arena (Euler vs. Symplectic vs. RK4)</TabsTrigger>`
     * `<TabsTrigger value="drone-plant">3. Live 100 Hz Drone Physics Loop</TabsTrigger>`
3. **Control Dock (Left Column, 4 cols on desktop):**
   * **Loop Frequency $f$ (`<Slider>`):** Range `10 Hz` to `200 Hz` (displays computed $\Delta t = 1/f$ in a `<Badge variant="secondary">`).
   * **Sensor Jitter Amplitude $\epsilon$ (`<Slider>`):** Range `0.0 mm` to `20.0 mm` (active in Tab 1).
   * **EMA Cutoff Frequency $f_c$ (`<Slider>`):** Range `0.5 Hz` to `50 Hz`, displaying computed $\alpha = \frac{\Delta t}{\tau + \Delta t}$ inside a `<Tooltip>`.
   * **Enable Low-Pass Filter (`<Switch>`):** Toggles the filtered derivative trace alongside the raw derivative trace.
   * **Integrator Selector (`<Select>`):** Allows picking `Forward Euler`, `Semi-Implicit Euler`, `Trapezoidal`, or `RK4` in Tab 2, or comparing all simultaneously.
   * **Playback Controls (`<Button>`):** `Play / Pause` (`variant="default"`), `Single Tick Step (k -> k+1)` (`variant="outline"`), and `Reset State` (`variant="ghost"`).
4. **Interactive Canvas & Telemetry (Right Column, 8 cols on desktop):**
   * **Tab 1 Visual:** Synchronized dual time-series canvas:
     * *Top Plot:* True ramp position $x(t)$ vs. discrete noisy samples $x_k$ with secant slope triangles drawn between $(t_{k-1}, x_{k-1})$ and $(t_k, x_k)$.
     * *Bottom Plot:* Raw derivative $v_k$ (spiky coral red) vs. EMA-filtered velocity $v_{\text{filt},k}$ (smooth emerald green) vs. true velocity (dashed slate).
   * **Tab 2 Visual:** Side-by-side animated robot pendulum links + total mechanical energy bar chart (`Joules`) showing Forward Euler's energy bar climbing past the red danger threshold while Semi-Implicit Euler and RK4 stay bounded.
   * **Live Dry-Run Inspector (`<Table>`):** Displays the last 5 ticks ($k-4$ through $k$) with columns `<TableHead>Tick k</TableHead>`, `<TableHead>t_k (s)</TableHead>`, `<TableHead>x_k (m)</TableHead>`, `<TableHead>Raw v_k (m/s)</TableHead>`, and `<TableHead>Filtered v_k (m/s)</TableHead>`, highlighting the current tick row when the user clicks `Single Tick Step`.
