# Part 2, Topic 2: Manipulator & Mobile Robot Kinematics
## Chapter 2: Differential Drive Kinematics, Holonomic Constraints & Wheel Odometry

---

### 1. How a Two-Wheeled Robot Steers Without a Steering Wheel

Look underneath an autonomous warehouse robot (like an Amazon Proteus AMR), a robotic vacuum, or a laboratory TurtleBot. You will not find a rack-and-pinion steering mechanism like an automobile's. Instead, the robot uses **Differential Drive**: two independently motorized drive wheels mounted on a common axle—one on the left, one on the right—supported by one or two passive, free-spinning caster wheels for balance.

By varying the relative speeds of the left and right wheels, the robot can drive straight, curve gently, or spin $360^\circ$ in place inside its own footprint.

```
Top-Down Anatomy of a Differential-Drive Mobile Robot
=====================================================

                     +-------------------------+
                     |      [Caster Wheel]     |  (Passive balance roller)
                     |            O            |
        ^ v_L        |                         |        ^ v_R
        |            |           ^ +X_body     |        |
     +--+--+         |           |             |     +--+--+
     |     |         |   +Y_body <--* (x, y)   |     |     |  Wheel Radius = r
     |  L  |=========|===========+=============|=====|  R  |
     |Wheel|         |        Axle Midpoint    |     |Wheel|
     +-----+         +-------------------------+     +-----+
        |<--------------------- L --------------------->|
                 Track Width / Wheelbase (meters)
```

#### 1.1 The Two Geometric Parameters: Wheel Radius ($r$) and Track Width ($L$)

Every differential-drive kinematic equation depends on just two physical measurements:
1. **Wheel Radius $r$ (in meters):** The radius of each drive wheel from axle center to the floor contact point.
2. **Track Width / Wheelbase $L$ (in meters):** The center-to-center distance between the left and right wheel contact patches.

#### 1.2 Converting Motor Angular Speed ($\omega_L, \omega_R$) to Ground Speed ($v_L, v_R$)

Motor controllers work in rotational units: **radians per second ($\text{rad/s}$)** or **RPM (Revolutions Per Minute)**. When a wheel of radius $r$ completes one full revolution ($2\pi\text{ radians}$) without slipping on the floor, its outer tread unrolls a straight-line distance equal to its circumference $C = 2\pi r$.

Therefore, multiplying the wheel's angular velocity $\omega_{\text{wheel}}$ (in $\text{rad/s}$) by the wheel radius $r$ (in $\text{m}$) gives the instantaneous linear speed of that wheel along the ground (in $\text{m/s}$):

$$v_L = r \cdot \omega_L, \qquad v_R = r \cdot \omega_R$$

> **Unit Sanity Check:** Why does $\text{meters} \times (\text{radians}/\text{second}) = \text{meters}/\text{second}$? Because a radian is a dimensionless ratio ($\text{arc length} / \text{radius} = \text{m}/\text{m}$)! If your datasheet gives motor speed in $\text{RPM}$, convert to $\text{rad/s}$ first:
> $$\omega_{\text{rad/s}} = \text{RPM} \times \frac{2\pi}{60}$$

---

### 2. Forward Velocity Kinematics & The Instantaneous Center of Curvature (ICC)

Suppose the left wheel rolls forward at ground speed $v_L$ and the right wheel rolls forward at ground speed $v_R$. How fast does the center of the robot move forward ($v$, in $\text{m/s}$), and how fast does the robot's heading angle $\theta$ rotate ($\omega = \dot{\theta}$, in $\text{rad/s}$)?

#### 2.1 First-Principles Derivation via the Instantaneous Center of Curvature (ICC)

Because both wheels are bolted to a rigid chassis and cannot skid sideways, at any instant where $v_L \ne v_R$, both wheels must trace concentric circular arcs around a single shared pivot point in the plane called the **Instantaneous Center of Curvature (ICC)**:

```
Geometry of a Differential-Drive Turn Around the ICC
====================================================

                                     ^ v_R = omega * (R + L/2)
                                     |
                        ^ v = omega*R|
               ^ v_L    |            |
               |        |            |
   ICC *-------+--------+------------+
       |<----->|       (x,y)       Right Wheel
       | R-L/2 |<--L/2->|<--- L/2 -->|
       |<------ R ----->|
       |<--------- R + L/2 --------->|
```

Let $R$ be the signed radial distance from the **ICC** to the midpoint of the robot's axle, and let $\omega$ (in $\text{rad/s}$, positive counter-clockwise) be the angular rate at which the robot orbits the ICC:

* The **left wheel** is at radius $R - \frac{L}{2}$ from the ICC, so its linear speed is:
  $$v_L = \omega \left(R - \frac{L}{2}\right)$$
* The **right wheel** is at radius $R + \frac{L}{2}$ from the ICC, so its linear speed is:
  $$v_R = \omega \left(R + \frac{L}{2}\right)$$

Now watch how cleanly $v$, $\omega$, and $R$ fall out of these two equations:

1. **Forward Linear Velocity $v$ (Add the two equations):**
   $$v_R + v_L = \omega\left(R + \frac{L}{2}\right) + \omega\left(R - \frac{L}{2}\right) = 2 \omega R = 2v$$
   $$\boxed{v = \frac{v_R + v_L}{2} = \frac{r}{2}(\omega_R + \omega_L)}$$
   *Plain English:* The forward speed of the robot's center is simply the **average** of the two wheel speeds!

2. **Angular Turning Velocity $\omega$ (Subtract the two equations):**
   $$v_R - v_L = \omega\left(R + \frac{L}{2}\right) - \omega\left(R - \frac{L}{2}\right) = \omega L$$
   $$\boxed{\omega = \frac{v_R - v_L}{L} = \frac{r}{L}(\omega_R - \omega_L)}$$
   *Plain English:* The turning rate is the **difference** between the right and left wheel speeds, divided by the track width $L$. When the right wheel is faster ($v_R > v_L$), the robot turns counter-clockwise ($\omega > 0$).

3. **Signed Turn Radius $R$ (Divide $v$ by $\omega$):**
   $$\boxed{R = \frac{v}{\omega} = \frac{L}{2}\left(\frac{v_R + v_L}{v_R - v_L}\right)}$$

#### 2.2 The Four Classic Motion Regimes

| Motion Regime | Wheel Speeds $(v_L, v_R)$ | Forward Speed $v$ | Turn Rate $\omega$ | Turn Radius $R$ | Where is the ICC? |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **1. Straight Line** | $v_L = v_R = +1.0\text{ m/s}$ | $+1.0\text{ m/s}$ | $0.0\text{ rad/s}$ | $\infty$ | At infinity (no curvature). |
| **2. Spin in Place** | $v_L = -1.0,\; v_R = +1.0\text{ m/s}$ | $0.0\text{ m/s}$ | $+\frac{2.0}{L}\text{ rad/s}$ | $0.0\text{ m}$ | Exact center of the axle $(x, y)$! |
| **3. Left-Wheel Pivot** | $v_L = 0.0,\; v_R = +1.0\text{ m/s}$ | $+0.5\text{ m/s}$ | $+\frac{1.0}{L}\text{ rad/s}$ | $+\frac{L}{2}$ | Directly under the stationary left tire. |
| **4. Gentle Arc** | $v_L = +0.5,\; v_R = +1.5\text{ m/s}$ | $+1.0\text{ m/s}$ | $+\frac{1.0}{L}\text{ rad/s}$ | $+L$ | Outside the left wheel at distance $L$. |

---

### 3. Inverse Velocity Kinematics: From `cmd_vel` $(v, \omega)$ to Motor Speeds

In modern robotics frameworks like ROS 2, high-level path planners do not care about your robot's specific wheel radius $r$ or track width $L$. Instead, the planner publishes a standardized velocity command (`cmd_vel`) containing a desired forward speed $v$ ($\text{m/s}$) and angular turn rate $\omega$ ($\text{rad/s}$).

Your low-level motor driver node must solve the **Inverse Velocity Kinematics** problem: given desired $(v, \omega)$, what speeds $(\omega_L, \omega_R)$ should we command to the left and right motors?

#### 3.1 Deriving the Inverse Equations

We have two linear equations in two unknowns ($v_L$ and $v_R$):
$$\frac{v_R + v_L}{2} = v \implies v_R + v_L = 2v$$
$$\frac{v_R - v_L}{L} = \omega \implies v_R - v_L = \omega L$$

Adding and subtracting these two equations immediately isolates $v_R$ and $v_L$:

$$v_L = v - \frac{\omega L}{2}, \qquad v_R = v + \frac{\omega L}{2}$$

Dividing by the wheel radius $r$ converts ground speeds into motor angular velocities ($\text{rad/s}$):

$$\boxed{\omega_L = \frac{v - \frac{\omega L}{2}}{r}, \qquad \omega_R = \frac{v + \frac{\omega L}{2}}{r}}$$

#### 3.2 The Curvature-Preserving Motor Saturation Trick

What happens when a path planner asks for $v = 1.0\text{ m/s}$ and $\omega = 2.0\text{ rad/s}$ on a robot with $L = 0.5\text{ m}$, requiring $v_R = 1.0 + 0.5 = 1.5\text{ m/s}$ and $v_L = 1.0 - 0.5 = 0.5\text{ m/s}$, if your physical motors have a hardware top speed of $v_{\max} = 1.0\text{ m/s}$?

* **The Naive Clamping Bug:** If you simply clamp `v_R = min(v_R, 1.0)` so $(v_L, v_R)$ becomes $(0.5, 1.0)\text{ m/s}$, look at what happens to the turn radius $R = \frac{L}{2}\frac{v_R+v_L}{v_R-v_L}$:
  * **Desired Radius:** $R_{\text{des}} = 0.25 \times \frac{1.5 + 0.5}{1.5 - 0.5} = \mathbf{0.50\text{ m}}$.
  * **Clamped Radius:** $R_{\text{clamp}} = 0.25 \times \frac{1.0 + 0.5}{1.0 - 0.5} = \mathbf{0.75\text{ m}}$!
  By clamping only the saturated right wheel, you **widened the turn radius by $50\%$**, causing the robot to understeer off its planned path and crash into the corridor wall!

* **The Curvature-Preserving Fix:** Whenever $\max(|\omega_L|, |\omega_R|) > \omega_{\max}$, divide **both** wheel speeds by the same saturation ratio $s = \frac{\max(|\omega_L|, |\omega_R|)}{\omega_{\max}}$. Scaling $(0.5, 1.5)$ by $\frac{1}{1.5}$ gives $(0.333, 1.000)\text{ m/s}$, which preserves the exact geometric turn radius $R = 0.50\text{ m}$ while respecting hardware limits!

---

### 4. Non-Holonomic Constraints: Why Differential-Drive Robots Cannot Crab Sideways

In a 2D warehouse floor, a mobile robot's pose has **3 Degrees of Freedom**: $\mathbf{q} = [x, y, \theta]^T$. Yet a differential-drive robot has only **2 actuators** ($v$ and $\omega$).

Because standard rubber wheels can roll forward/backward along the robot's local $+X_{\text{body}}$ axis, but **cannot slide sideways** along the axle ($+Y_{\text{body}}$), the robot's world velocity $[\dot{x}, \dot{y}]^T$ is subject to the **Non-Holonomic No-Lateral-Slip Constraint**:

$$v_y^{\text{body}} = -\dot{x}\sin\theta + \dot{y}\cos\theta = 0$$

```
Non-Holonomic (Differential Drive) vs. Holonomic (Mecanum / Omni-Wheel)
=======================================================================

  Differential Drive (Non-Holonomic)          Mecanum / Omni Drive (Holonomic)
     ^ v_x (Allowed)                             ^ v_x (Allowed)
     |                                           |
  +--+--+                                    [\\]---[//]  45-deg angled rollers
  |     | ---> v_y = 0 (FORBIDDEN!)   <---   |    *    | ---> v_y (ALLOWED!)
  +-----+      Must turn first to            [//]---[\\]
               move laterally!               Controls (v_x, v_y, omega) independently!
```

* **Holonomic Robot (e.g., Mecanum or Omni-Wheel base):** Can control all 3 planar velocities $(v_x, v_y, \omega)$ simultaneously. Its controllable velocity dimension ($3$) equals its pose dimension ($3$).
* **Non-Holonomic Robot (e.g., Differential Drive, Car):** Has $3$ pose dimensions $(x, y, \theta)$ so it can eventually park at *any* $(x, y, \theta)$ in the warehouse (via multi-point turns), but at any single instant it only has $2$ controllable velocity directions $(v, \omega)$. Its continuous-time kinematic model is:

$$\begin{bmatrix} \dot{x} \\ \dot{y} \\ \dot{\theta} \end{bmatrix} = \begin{bmatrix} \cos\theta & 0 \\ \sin\theta & 0 \\ 0 & 1 \end{bmatrix} \begin{bmatrix} v \\ \omega \end{bmatrix}$$

#### 4.1 How a 4-Wheel Mecanum Base Breaks the Non-Holonomic Constraint

Why can a **Mecanum-wheel** robot slide straight sideways ($v_y \ne 0$) while a differential-drive robot cannot? Because each Mecanum wheel has passive rubber rollers mounted at a $45^\circ$ angle around its rim. When all four wheels spin forward, the $45^\circ$ lateral forces cancel out and the robot drives straight ahead ($+X_{\text{body}}$). When the front-left and rear-right wheels spin backward while the front-right and rear-left spin forward, the forward forces cancel out and the $45^\circ$ rollers push the chassis **purely sideways** ($+Y_{\text{body}}$):

$$\begin{bmatrix} \omega_{\text{FL}} \\ \omega_{\text{FR}} \\ \omega_{\text{RL}} \\ \omega_{\text{RR}} \end{bmatrix} = \frac{1}{r} \begin{bmatrix} 1 & -1 & -(l_x + l_y) \\ 1 & +1 & +(l_x + l_y) \\ 1 & +1 & -(l_x + l_y) \\ 1 & -1 & +(l_x + l_y) \end{bmatrix} \begin{bmatrix} v_x \\ v_y \\ \omega \end{bmatrix}$$

where $l_x, l_y$ are the half-length and half-width of the chassis. Why doesn't every warehouse robot use Mecanum wheels? Because angled rollers have high vibration, lower payload capacity, and much higher wheel slip (worse odometry!) than solid differential-drive tires.

---

### 5. Wheel Encoder Odometry: From Quadrature Ticks to Pose $(x, y, \theta)$

How does a mobile robot estimate its global pose $(x_k, y_k, \theta_k)$ as it drives around? The fastest, most universal method is **Wheel Odometry** (a form of **Dead Reckoning**)—integrating incremental wheel rotations measured by optical or magnetic **Quadrature Encoders** attached to each motor shaft.

#### 5.1 How Quadrature Encoders Detect Speed and Direction (Channels A & B)

A single-channel pulse sensor can tell you how *fast* a wheel is spinning, but it cannot tell you whether the wheel is rolling **forward** or **backward**! To solve this, robotics motors use **Quadrature Encoders** with two sensors—**Channel A** and **Channel B**—offset physically by $90^\circ$ of a slot period:

```
Quadrature Encoder Waveforms (90-Degree Phase Shift Detects Direction!)
=======================================================================

  FORWARD Rotation (Channel A leads Channel B by 90 deg):
  Channel A:  ____|^^^^|____|^^^^|____
  Channel B:  ______|^^^^|____|^^^^|__   --> When A rises (^), B is LOW  => +1 tick!

  REVERSE Rotation (Channel B leads Channel A by 90 deg):
  Channel A:  ______|^^^^|____|^^^^|__
  Channel B:  ____|^^^^|____|^^^^|____   --> When A rises (^), B is HIGH => -1 tick!
```

By counting every rising and falling edge of both Channel A and Channel B (**$4\times$ quadrature decoding**), a disk with $1024$ physical slots connected through a $4:1$ gearbox produces $N_{\text{ticks}} = 1024 \times 4 \times 4 = 16,384\text{ ticks}$ per wheel revolution!

> **The 16-Bit Encoder Wrap-Around Trap:** Microcontroller hardware timers often store encoder counts in a signed 16-bit integer (`int16_t`, range $-32768$ to $+32767$). When the wheel rolls past $+32767$, the register wraps around to $-32768$! If you compute `int32_t delta = curr - prev`, wrapping from $+32767$ to $-32768$ yields a bogus jump of $-65535\text{ ticks}$!
> **The Fix:** Cast the subtraction itself to `int16_t`:
> ```cpp
> int16_t delta_ticks = static_cast<int16_t>(curr_count - prev_count);
> // Modular two's-complement arithmetic: int16_t(-32768 - 32767) == +1 tick!
> ```

#### 5.2 Step 1: Converting Encoder Tick Deltas into Meters Rolled

Suppose each wheel encoder produces $N_{\text{ticks}}$ integer counts per full wheel revolution (for example, $N_{\text{ticks}} = 4096\text{ ticks/rev}$ after gearbox reduction). Over one control loop step $\Delta t$, the left and right encoders report integer tick changes $\Delta\text{ticks}_L$ and $\Delta\text{ticks}_R$.

The linear arc distances $\Delta s_L$ and $\Delta s_R$ (in meters) rolled by the left and right wheels during that step are:

$$\Delta s_L = 2\pi r \left(\frac{\Delta\text{ticks}_L}{N_{\text{ticks}}}\right), \qquad \Delta s_R = 2\pi r \left(\frac{\Delta\text{ticks}_R}{N_{\text{ticks}}}\right)$$

From $\Delta s_L$ and $\Delta s_R$, the robot center's incremental forward travel $\Delta s$ and heading change $\Delta\theta$ (in radians) are:

$$\Delta s = \frac{\Delta s_R + \Delta s_L}{2}, \qquad \Delta\theta = \frac{\Delta s_R - \Delta s_L}{L}$$

#### 5.3 Step 2: Euler vs. Midpoint vs. Exact Circular Arc Integration

Once we have $\Delta s$ and $\Delta\theta$ for tick $k$, how do we update $(x_k, y_k, \theta_k)$?

1. **First-Order Euler Odometry (Inaccurate on turns):**
   Assumes the robot drove the entire distance $\Delta s$ along its *old* heading $\theta_{k-1}$, and then rotated by $\Delta\theta$ at the very end:
   $$x_k = x_{k-1} + \Delta s \cos(\theta_{k-1}), \qquad y_k = y_{k-1} + \Delta s \sin(\theta_{k-1}), \qquad \theta_k = \theta_{k-1} + \Delta\theta$$

2. **Second-Order Midpoint (Runge-Kutta) Odometry (Industry Standard):**
   Projects $\Delta s$ along the **average (midpoint) heading** $\theta_{\text{mid}} = \theta_{k-1} + \frac{\Delta\theta}{2}$ during the step:
   $$\boxed{\begin{aligned}
   x_k &= x_{k-1} + \Delta s \cos\!\left(\theta_{k-1} + \frac{\Delta\theta}{2}\right) \\
   y_k &= y_{k-1} + \Delta s \sin\!\left(\theta_{k-1} + \frac{\Delta\theta}{2}\right) \\
   \theta_k &= \text{wrapToPi}\!\left(\theta_{k-1} + \Delta\theta\right)
   \end{aligned}}$$

3. **Exact Circular Arc (ICC) Integration:**
   If the wheel speeds were constant during the tick and $\Delta\theta \ne 0$, the robot traveled along an exact circle of radius $R = \frac{\Delta s}{\Delta\theta}$. Integrating around the ICC gives:
   $$x_k = x_{k-1} + \frac{\Delta s}{\Delta\theta}\big(\sin(\theta_{k-1} + \Delta\theta) - \sin\theta_{k-1}\big)$$
   $$y_k = y_{k-1} - \frac{\Delta s}{\Delta\theta}\big(\cos(\theta_{k-1} + \Delta\theta) - \cos\theta_{k-1}\big)$$
   Applying the trig sum-to-product identity $\sin A - \sin B = 2\sin\!\left(\frac{A-B}{2}\right)\cos\!\left(\frac{A+B}{2}\right)$ turns the exact chord into:
   $$x_k = x_{k-1} + \Delta s \,\underbrace{\frac{\sin(\Delta\theta / 2)}{\Delta\theta / 2}}_{\approx 1 \text{ for small }\Delta\theta} \cos\!\left(\theta_{k-1} + \frac{\Delta\theta}{2}\right)$$
   Since at $100\text{ Hz}$ the angle change per tick is tiny ($\Delta\theta \approx 0.01\text{ rad} \implies \frac{\sin(\Delta\theta/2)}{\Delta\theta/2} = 0.999996$), **Midpoint Odometry is nearly indistinguishable from Exact Circular Arc integration**, while avoiding any $0 / 0$ division when driving straight ($\Delta\theta = 0$)!

```
Why Midpoint Heading (theta + dtheta/2) Beats Euler Odometry on Curves
======================================================================

          True Circular Arc                  Euler Approximation (Uses old theta)
              * (x_k, y_k)                       .  * True end
            .   ^                              .    |  <-- Systematic sideways error!
          .    /                             .      * Euler end (x_{k-1} + ds*cos(theta_{k-1}))
         .    / Chord angle =               .     /
        .    /  theta_{k-1} + dtheta/2     .    /
       *----+                             *----+
   (x_{k-1}, y_{k-1})                 (x_{k-1}, y_{k-1})
```

#### 5.4 Why Dead-Reckoning Odometry Always Drifts Unboundedly

Even with Midpoint integration, wheel odometry **always drifts over long distances** for two fundamental reasons:
1. **Non-Systematic Errors:** Hitting a floor bump, driving over a wet patch, or accelerating too fast causes brief tire slip where the encoder spins without moving the chassis.
2. **Heading Error Projection ($\theta \to x, y$):** Look at the equations for $x_k$ and $y_k$—they multiply every future $\Delta s$ by $\cos\theta_k$ and $\sin\theta_k$. If a tiny wheel slip at $t = 1\text{ s}$ leaves a permanent $2^\circ$ ($0.035\text{ rad}$) error in $\theta_k$, then **even if the encoders are $100\%$ perfect for the next $100\text{ meters}$ of straight driving**, that $2^\circ$ heading error causes the position estimate $(x_k, y_k)$ to drift sideways by $100 \times \sin(2^\circ) = \mathbf{3.49\text{ meters}}$! This is why real robots fuse wheel odometry with an IMU and LiDAR/camera SLAM (Part 4).

#### 5.5 Calibrating Systematic Odometry Errors ($r_L, r_R$, and $L_{\text{eff}}$)

Before blaming floor slip, every robotics engineer calibrates three **systematic hardware parameters** in software:
1. **Average Wheel Radius Scale ($E_d = \frac{r_{\text{actual}}}{r_{\text{nominal}}}$):** Command the robot to drive straight along a $10\text{ m}$ tape measure on the floor. If odometry reports $9.85\text{ m}$, multiply your nominal wheel radius $r$ by $\frac{10.0}{9.85} = 1.0152$.
2. **Wheel Diameter Mismatch ($E_b = \frac{r_R}{r_L}$):** Even two tires from the same factory batch differ in radius by $0.1\% - 0.5\%$ due to rubber molding or uneven weight distribution. If your robot curves slightly left when commanded $\Delta\text{ticks}_L = \Delta\text{ticks}_R$, assign separate software radii $r_L$ and $r_R$ until straight-line commands track a laser line.
3. **Effective Track Width ($L_{\text{eff}}$):** Because rubber tires have a wide contact patch that scrubs slightly during turns, the effective kinematic wheelbase $L_{\text{eff}}$ is rarely equal to the ruler measurement between tire centers. Command the robot to spin $10$ full turns ($3600^\circ$) in place against a wall laser reference, and adjust $L_{\text{eff}}$ via $L_{\text{eff}} = L_{\text{nominal}} \times \frac{\Delta\theta_{\text{odom}}}{3600^\circ}$.

---

### 6. Complete Code Implementations & Multi-Tick Dry Run

#### 6.1 Concrete 4-Tick Odometry Dry Run ($r = 0.1\text{ m}, L = 0.5\text{ m}, N_{\text{ticks}} = 1000$)

Here, one tick equals $\frac{2\pi(0.1)}{1000} = 0.00062832\text{ m}$. For clarity in the table below, we feed rounded wheel arc increments $\Delta s_L, \Delta s_R$ Directly:

| Tick $k$ | Motion Phase | $\Delta s_L$ ($\text{m}$) | $\Delta s_R$ ($\text{m}$) | $\Delta s = \frac{\Delta s_R+\Delta s_L}{2}$ | $\Delta\theta = \frac{\Delta s_R-\Delta s_L}{0.5}$ ($\text{rad}$) | Midpoint $\theta_{\text{mid}}$ ($\text{rad}$) | Updated Pose $(x_k, y_k, \theta_k)$ |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| $0$ | Initial Origin | — | — | — | — | — | **$(0.000\text{ m},\; 0.000\text{ m},\; 0.000\text{ rad})$** |
| $1$ | Drive Straight | $+0.50$ | $+0.50$ | $+0.500\text{ m}$ | $0.000\text{ rad}$ | $0.000\text{ rad}$ | **$(0.500\text{ m},\; 0.000\text{ m},\; 0.000\text{ rad})$** |
| $2$ | Left $90^\circ$ Curve | $+0.3927$ | $+1.1781$ | $+0.7854\text{ m}$ | $+1.5708\text{ rad}$ ($+90^\circ$) | $+0.7854\text{ rad}$ ($+45^\circ$) | **$(1.055\text{ m},\; 0.555\text{ m},\; +1.571\text{ rad})$** |
| $3$ | Drive Straight $+Y$ | $+0.50$ | $+0.50$ | $+0.500\text{ m}$ | $0.000\text{ rad}$ | $+1.5708\text{ rad}$ ($+90^\circ$) | **$(1.055\text{ m},\; 1.055\text{ m},\; +1.571\text{ rad})$** |
| $4$ | Spin in Place $-90^\circ$ | $+0.3927$ | $-0.3927$ | $0.000\text{ m}$ | $-1.5708\text{ rad}$ ($-90^\circ$) | $+0.7854\text{ rad}$ | **$(1.055\text{ m},\; 1.055\text{ m},\; 0.000\text{ rad})$** |

#### 6.2 Complete C++17 Implementation: Differential-Drive Controller & Odometry

```cpp
#include <iostream>
#include <iomanip>
#include <cmath>
#include <algorithm>

struct Pose2D { double x = 0.0, y = 0.0, theta = 0.0; };
struct WheelSpeeds { double omega_l = 0.0, omega_r = 0.0; };

class DiffDriveRobot {
public:
    DiffDriveRobot(double wheel_radius, double track_width, int ticks_per_rev, double max_wheel_rad_s)
        : r_(wheel_radius), L_(track_width), ticks_per_rev_(ticks_per_rev), max_omega_(max_wheel_rad_s) {}

    // 1. Inverse Velocity Kinematics with Curvature-Preserving Saturation
    WheelSpeeds cmdVelToWheelSpeeds(double v_des, double omega_des) const {
        double omega_l = (v_des - 0.5 * omega_des * L_) / r_;
        double omega_r = (v_des + 0.5 * omega_des * L_) / r_;
        //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // Convert desired body (v, omega) into left and right wheel angular speeds (rad/s).

        double peak = std::max(std::abs(omega_l), std::abs(omega_r));
        if (peak > max_omega_) {
            double scale = max_omega_ / peak;
            omega_l *= scale;
            omega_r *= scale;
            //         ^^^^^
            // Scale BOTH wheels equally so the geometric turn radius R = v/omega stays exact!
        }
        return {omega_l, omega_r};
    }

    // 2. Quadrature Encoder Odometry Update (Midpoint Arc Integration)
    void updateOdometry(int delta_ticks_l, int delta_ticks_r) {
        const double meters_per_tick = (2.0 * 3.14159265358979323846 * r_) / ticks_per_rev_;
        double ds_l = delta_ticks_l * meters_per_tick;
        double ds_r = delta_ticks_r * meters_per_tick;

        double ds     = 0.5 * (ds_r + ds_l);
        double dtheta = (ds_r - ds_l) / L_;
        //              ^^^^^^^^^^^^^^^^^^
        // Heading change (rad) is difference in wheel travel divided by track width L.

        double theta_mid = pose_.theta + 0.5 * dtheta;
        pose_.x += ds * std::cos(theta_mid);
        pose_.y += ds * std::sin(theta_mid);
        //              ^^^^^^^^^^^^^^^^^^^
        // Project distance ds along the midpoint heading during the arc.

        pose_.theta = std::atan2(std::sin(pose_.theta + dtheta), std::cos(pose_.theta + dtheta));
        //            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // Wrap heading angle cleanly into (-pi, +pi].
    }

    const Pose2D& pose() const { return pose_; }

private:
    double r_, L_;
    int ticks_per_rev_;
    double max_omega_;
    Pose2D pose_;
};

int main() {
    DiffDriveRobot amr(0.10, 0.50, 4096, 15.0);
    auto cmd = amr.cmdVelToWheelSpeeds(1.2, 2.0); // Requests v_R = 1.7 m/s (17 rad/s > 15 limit)
    std::cout << std::fixed << std::setprecision(3);
    std::cout << "Saturated Wheel Cmd : omega_L = " << cmd.omega_l
              << " rad/s, omega_R = " << cmd.omega_r << " rad/s\n";

    amr.updateOdometry(2048, 2048); // Both wheels roll exactly half a revolution (+0.314 m)
    std::cout << "Pose after 0.5 rev  : x = " << amr.pose().x
              << " m, y = " << amr.pose().y << " m, theta = " << amr.pose().theta << " rad\n";
    return 0;
}
```

**What's happening:**
1. **`omega_l = (v_des - 0.5 * omega_des * L_) / r_`**: Computes the exact motor angular speed needed on each side to achieve forward velocity `v_des` and yaw rate `omega_des`.
2. **`if (peak > max_omega_)`**: When `v_des = 1.2 m/s` and `omega_des = 2.0 rad/s` demand `17.0 rad/s` on the right motor (exceeding the `15.0 rad/s` limit), both motors are scaled by `15.0 / 17.0` so the robot tracks the exact planned curve at a safe speed.
3. **`theta_mid = pose_.theta + 0.5 * dtheta`**: Uses second-order midpoint integration before wrapping `pose_.theta` into $(-\pi, \pi]$ via `std::atan2(sin, cos)`.

#### 6.3 Complete Python Implementation: Simulating Heading Drift in Dead Reckoning

```python
import math

def compare_odometry_drift(steps: int = 100):
    r, L = 0.1, 0.5
    ds_l, ds_r = 0.10, 0.10  # Robot drives straight: 0.10 m per step for 10 meters total

    # True robot vs. Odometry estimate that suffered a tiny 2-degree wheel slip on step 0
    x_true, y_true, th_true = 0.0, 0.0, 0.0
    x_odom, y_odom, th_odom = 0.0, 0.0, math.radians(2.0)
    #                                   ^^^^^^^^^^^^^^^^^
    # A single 2-degree (0.0349 rad) slip on tick 0 corrupts ALL future (x, y) projections!

    for _ in range(steps):
        ds = 0.5 * (ds_r + ds_l)
        dth = (ds_r - ds_l) / L

        x_true += ds * math.cos(th_true + 0.5 * dth)
        y_true += ds * math.sin(th_true + 0.5 * dth)
        th_true += dth

        x_odom += ds * math.cos(th_odom + 0.5 * dth)
        y_odom += ds * math.sin(th_odom + 0.5 * dth)
        th_odom += dth

    pos_err = math.hypot(x_odom - x_true, y_odom - y_true)
    print(f"True Pose after 10m : ({x_true:.3f}, {y_true:.3f}) m")
    print(f"Odom Pose after 10m : ({x_odom:.3f}, {y_odom:.3f}) m -> Drift = {pos_err*100:.1f} cm!")

if __name__ == "__main__":
    compare_odometry_drift()
```

**What's happening:**
1. **`th_odom = math.radians(2.0)`**: Even though `ds_l` and `ds_r` are $100\%$ noise-free for the entire $10\text{ m}$ drive, that initial $2^\circ$ heading offset projects $\sin(2^\circ)$ into $y$ on every single tick, resulting in **$34.9\text{ cm}$ of lateral position error** after $10\text{ meters}$.

---

### 7. Common Mistakes & Debugging Checklist

| Symptom in Your Mobile Robot | Root Cause | Concrete Fix |
| :--- | :--- | :--- |
| **Robot spins the opposite way when commanded $\omega > 0$** | Swapped $v_R - v_L$ into $v_L - v_R$, or right motor wiring is inverted. | Verify right wheel forward is positive and $\omega = (v_R - v_L) / L$. |
| **Robot turns $10\%$ too wide/narrow in odometry** | Measured $L$ to the outer tire walls instead of the tire contact centers, or tires compressed under load. | Run a **10-turn in-place calibration test** and scale effective $L_{\text{eff}}$ until odometry matches $3600^\circ$. |
| **Robot veers off curved paths at high speeds** | Clamping `omega_r` and `omega_l` independently when a motor saturates. | Scale *both* wheels by `max_omega / max(|omega_l|, |omega_r|)`. |
| **Huge position jump once every few minutes** | 16-bit signed encoder counter wrapped around from `+32767` to `-32768`. | Compute tick difference using signed 16-bit integer modular arithmetic (`int16_t(curr - prev)`). |

---

### 8. Quick Reference Summary

| Concept | Mathematical Formula | Physical / Code Meaning |
| :--- | :--- | :--- |
| **Wheel Ground Speed** | $v_L = r \omega_L, \quad v_R = r \omega_R$ | $r$ in $\text{m}$, $\omega_{L,R}$ in $\text{rad/s}$, $v_{L,R}$ in $\text{m/s}$. |
| **Forward Velocity ($v$)** | $v = \frac{v_R + v_L}{2} = \frac{r}{2}(\omega_R + \omega_L)$ | Linear speed of the axle midpoint along $+X_{\text{body}}$. |
| **Angular Velocity ($\omega$)** | $\omega = \frac{v_R - v_L}{L} = \frac{r}{L}(\omega_R - \omega_L)$ | Yaw rate (CCW positive); $L$ is track width. |
| **ICC Turn Radius ($R$)** | $R = \frac{v}{\omega} = \frac{L}{2}\left(\frac{v_R + v_L}{v_R - v_L}\right)$ | Signed distance from axle center to Instantaneous Center of Curvature. |
| **Inverse Kinematics** | $\omega_L = \frac{v - \omega L / 2}{r}, \quad \omega_R = \frac{v + \omega L / 2}{r}$ | Converts `cmd_vel` $(v, \omega)$ into motor speed commands. |
| **Non-Holonomic Constraint** | $-\dot{x}\sin\theta + \dot{y}\cos\theta = 0$ | Wheels cannot slide sideways ($v_y^{\text{body}} = 0$). |
| **Midpoint Arc Odometry** | $x_k = x_{k-1} + \Delta s \cos(\theta_{k-1} + \frac{\Delta\theta}{2}), \; y_k = y_{k-1} + \Delta s \sin(\theta_{k-1} + \frac{\Delta\theta}{2})$ | Second-order Runge-Kutta integration for encoder ticks. |

---

### Practice & Self-Check

**Predict the Output / Trace by Hand**

Unless stated otherwise, use a small robot with $r = 0.05\text{ m}$ and $L = 0.4\text{ m}$.

**Q1. Forward velocity kinematics (Section 2.1).** The motors report $\omega_L = 10\text{ rad/s}$ and $\omega_R = 14\text{ rad/s}$. Compute $v_L$, $v_R$, $v$, $\omega$ and the signed turn radius $R$. Which way does the robot turn, and where is the ICC? Separately: what is $120\text{ RPM}$ in rad/s?

**Q2. What does the chapter's `main()` print?** Trace `DiffDriveRobot amr(0.10, 0.50, 4096, 15.0)` through `cmdVelToWheelSpeeds(1.2, 2.0)` and then `updateOdometry(2048, 2048)`. Give both printed lines (3 decimals, as set by `std::setprecision(3)`).

**Q3. Saturation: scale vs. clamp (Section 3.2).** On the small robot with $\omega_{\max} = 15\text{ rad/s}$, a planner sends `cmd_vel` $v = 0.8\text{ m/s}$, $\omega = 2.0\text{ rad/s}$.

1. What raw wheel speeds $(\omega_L, \omega_R)$ does inverse kinematics produce?
2. What does `cmdVelToWheelSpeeds` return after curvature-preserving scaling, and what $(v, \omega, R)$ does the robot actually execute?
3. What $(v, \omega, R)$ would the naive "clamp only the right wheel" bug execute instead?

**Q4. Encoder odometry, two ticks (Sections 5.2–5.3).** Small robot, $N_{\text{ticks}} = 1000$, starting at $(0, 0, 0)$. Run the chapter's midpoint `updateOdometry` for

* tick 1: $\Delta\text{ticks}_L = 1000$, $\Delta\text{ticks}_R = 1000$
* tick 2: $\Delta\text{ticks}_L = 500$, $\Delta\text{ticks}_R = 1500$

Give $\Delta s_L$, $\Delta s_R$, $\Delta s$, $\Delta\theta$, $\theta_{\text{mid}}$ and the pose after each tick. For tick 2, what would plain Euler odometry and exact circular-arc integration give?

**Q5. The 16-bit wrap-around trap (Section 5.1).** An `int16_t` encoder register reads `prev = 32760` on one tick and `curr = -32766` on the next (the wheel kept rolling forward). What delta does `int32_t delta = curr - prev` give? What does `static_cast<int16_t>(curr - prev)` give? How far did the wheel actually roll on the small robot with $N_{\text{ticks}} = 1000$?

**Coding Exercises**

**E1 (Easy). RPM to body twist (Python).** Convert two wheel speeds in RPM into $(v, \omega, R)$. Return `math.inf` for $R$ when driving straight.

```python
def rpm_to_body_twist(rpm_l: float, rpm_r: float, r: float, L: float) -> tuple[float, float, float]: ...
# rpm_to_body_twist(60, 60, 0.1, 0.5)   -> (0.6283, 0.0, inf)     # straight line
# rpm_to_body_twist(-30, 30, 0.1, 0.5)  -> (0.0, 1.2566, 0.0)     # spin in place
```

**E2 (Easy–Medium). Exact circular-arc odometry (Python).** Implement the Exact Circular Arc (ICC) update from Section 5.3, falling back to a straight-line update when $|\Delta\theta| < 10^{-9}$ to avoid the $0/0$ division. Wrap $\theta$ into $(-\pi, \pi]$.

```python
def exact_arc_update(x: float, y: float, theta: float, ds: float, dtheta: float) -> tuple[float, float, float]: ...
# exact_arc_update(0.0, 0.0, 0.0, math.pi / 2, math.pi / 2) -> (1.0, 1.0, 1.5708)   # quarter circle, R = 1
# exact_arc_update(0.5, 0.0, 0.0, 0.7854, 1.5708)          -> (1.0, 0.5, 1.5708)   # tick 2 of the 6.1 dry run
# exact_arc_update(1.0, 2.0, 0.0, 0.3, 0.0)                -> (1.3, 2.0, 0.0)
```

**E3 (Medium). Wrap-safe encoder odometry class (C++).** Write a class that receives **raw** `int16_t` register readings for both wheels each tick. The first reading only seeds the previous counts (no motion). After that, compute wrap-safe deltas and apply the midpoint update.

```cpp
class RawEncoderOdometry {
public:
    RawEncoderOdometry(double r, double L, int ticksPerRev);
    void onReading(int16_t countL, int16_t countR);
    double x() const; double y() const; double theta() const;
};
// r = 0.05, L = 0.4, ticksPerRev = 1000. Readings (L, R):
//   (32000, 32000)    -> seed only, pose (0, 0, 0)
//   (-32536, -32536)  -> both wheels +1000 ticks across the wrap, pose (0.3142, 0, 0)
//   (-32036, -31036)  -> +500 / +1500 ticks, pose (0.6044, 0.1202, 0.7854)
```

#### Dry-Run: Answers

**Q1 — $v = 0.6\text{ m/s}$, $\omega = +0.5\text{ rad/s}$ (counter-clockwise, a left turn), $R = 1.2\text{ m}$; $120\text{ RPM} = 4\pi \approx 12.566\text{ rad/s}$.**

| Quantity | Formula | Value |
|---|---|---|
| $v_L$ | $r\omega_L = 0.05 \times 10$ | 0.5 m/s |
| $v_R$ | $r\omega_R = 0.05 \times 14$ | 0.7 m/s |
| $v$ | $(0.7 + 0.5)/2$ | 0.6 m/s |
| $\omega$ | $(0.7 - 0.5)/0.4$ | 0.5 rad/s |
| $R$ | $v/\omega = 0.6/0.5$ | 1.2 m |

$v_R > v_L$, so $\omega > 0$: the ICC lies 1.2 m to the robot's **left** (along $+Y_{\text{body}}$), beyond the left wheel at $R - L/2 = 1.0\text{ m}$. RPM: $120 \times \frac{2\pi}{60} = 4\pi$.

**Q2 — prints**

```
Saturated Wheel Cmd : omega_L = 6.176 rad/s, omega_R = 15.000 rad/s
Pose after 0.5 rev  : x = 0.314 m, y = 0.000 m, theta = 0.000 rad
```

Raw speeds: $\omega_L = (1.2 - 0.5 \cdot 2.0 \cdot 0.5)/0.1 = 7.0$, $\omega_R = (1.2 + 0.5)/0.1 = 17.0$. Peak $17 > 15$ → scale $= 15/17 = 0.88235$ → $(6.176, 15.000)$. Odometry: meters per tick $= 2\pi(0.1)/4096$, so 2048 ticks $= \pi(0.1) = 0.31416\text{ m}$ on each wheel; $\Delta\theta = 0$, so the robot moves straight along $+X$.

**Q3 — raw $(8, 24)$; scaled $(5, 15)$ executing $R = 0.40\text{ m}$; clamped $(8, 15)$ executing $R \approx 0.657\text{ m}$.**

1. $\omega_L = (0.8 - 2.0 \cdot 0.4/2)/0.05 = 0.4/0.05 = 8$, $\omega_R = (0.8 + 0.4)/0.05 = 24\text{ rad/s}$. Desired $R = 0.8/2.0 = 0.4\text{ m}$.
2. Scale $= 15/24 = 0.625$ → $(5, 15)\text{ rad/s}$, i.e. $v_L = 0.25$, $v_R = 0.75\text{ m/s}$: $v = 0.5\text{ m/s}$, $\omega = 0.5/0.4 = 1.25\text{ rad/s}$, $R = 0.5/1.25 = 0.40\text{ m}$ — same curve, just slower.
3. Clamp → $(8, 15)\text{ rad/s}$, i.e. $v_L = 0.40$, $v_R = 0.75\text{ m/s}$: $v = 0.575\text{ m/s}$, $\omega = 0.35/0.4 = 0.875\text{ rad/s}$, $R = 0.575/0.875 \approx 0.657\text{ m}$ — about 64% wider than planned.

**Q4 — after tick 1: $(0.3142, 0, 0)$; after tick 2: $(0.6044, 0.1202, 0.7854)$.** Meters per tick $= 2\pi(0.05)/1000 = 0.00031416\text{ m}$.

| Tick | $\Delta s_L$ | $\Delta s_R$ | $\Delta s$ | $\Delta\theta = (\Delta s_R - \Delta s_L)/0.4$ | $\theta_{\text{mid}}$ | Pose after |
|---|---|---|---|---|---|---|
| 1 | 0.31416 | 0.31416 | 0.31416 | 0 | 0 | (0.3142, 0.0000, 0.0000) |
| 2 | 0.15708 | 0.47124 | 0.31416 | 0.7854 (45°) | 0.3927 (22.5°) | (0.6044, 0.1202, 0.7854) |

Tick 2 midpoint: $x = 0.31416 + 0.31416\cos 22.5^\circ = 0.31416 + 0.29025$; $y = 0.31416 \sin 22.5^\circ = 0.12022$.

* **Euler** (old heading 0): $(0.31416 + 0.31416,\ 0) = (0.6283, 0.0000)$ — all of the turn's sideways motion is lost.
* **Exact arc**: $R = \Delta s/\Delta\theta = 0.4\text{ m}$; $x = 0.31416 + 0.4\sin 45^\circ = 0.5970$, $y = 0.4(1 - \cos 45^\circ) = 0.1172$.

With a coarse 45° step, midpoint is off by about 7 mm in $x$ and 3 mm in $y$; Euler is off by 3 cm and 12 cm.

**Q5 — `int32_t` gives −65526 (bogus); `int16_t` cast gives +10; the wheel rolled $10 \times 0.00031416 = 0.0031416\text{ m}$ (about 3.1 mm).** $-32766 - 32760 = -65526$. Modulo $2^{16} = 65536$: $-65526 + 65536 = +10$, which is inside the `int16_t` range. Check: counting forward from 32760, seven ticks reach 32767, the eighth wraps to −32768, and two more reach −32766: $7 + 1 + 2 = 10$.

**E1 — reference solution.**

```python
import math

def rpm_to_body_twist(rpm_l, rpm_r, r, L):
    w_l = rpm_l * 2.0 * math.pi / 60.0          # RPM -> rad/s
    w_r = rpm_r * 2.0 * math.pi / 60.0
    v = 0.5 * r * (w_r + w_l)
    omega = r * (w_r - w_l) / L
    R = math.inf if abs(omega) < 1e-12 else v / omega
    return v, omega, R
```

$O(1)$. Spin in place: $\pm 30\text{ RPM} = \pm\pi\text{ rad/s}$ → $v_{L,R} = \mp 0.31416\text{ m/s}$, $v = 0$, $\omega = 0.62832/0.5 = 1.2566\text{ rad/s}$, $R = 0$ (ICC at the axle centre, as in regime 2 of the table).

**E2 — reference solution.**

```python
import math

def exact_arc_update(x, y, theta, ds, dtheta):
    if abs(dtheta) < 1e-9:                       # straight: R -> infinity
        x += ds * math.cos(theta)
        y += ds * math.sin(theta)
    else:
        R = ds / dtheta                          # signed radius around the ICC
        x += R * (math.sin(theta + dtheta) - math.sin(theta))
        y -= R * (math.cos(theta + dtheta) - math.cos(theta))
    theta = math.atan2(math.sin(theta + dtheta), math.cos(theta + dtheta))
    return x, y, theta
```

$O(1)$. Quarter circle: $R = 1$, $x = \sin 90^\circ - \sin 0 = 1$, $y = -(\cos 90^\circ - \cos 0) = 1$. The second example shows the chapter's 6.1 tick 2 exactly: $R = 0.5$, ending at $(1.0, 0.5)$, while midpoint odometry reported $(1.055, 0.555)$ — the midpoint error is visible only because a 90° step is very coarse.

**E3 — reference solution.**

```cpp
#include <cstdint>
#include <cmath>

class RawEncoderOdometry {
public:
    RawEncoderOdometry(double r, double L, int ticksPerRev)
        : L_(L), metersPerTick_(2.0 * 3.14159265358979323846 * r / ticksPerRev) {}

    void onReading(int16_t countL, int16_t countR) {
        if (!seeded_) {                                   // first reading: no x_{k-1} yet
            prevL_ = countL; prevR_ = countR; seeded_ = true;
            return;
        }
        int16_t dL = static_cast<int16_t>(countL - prevL_); // wrap-safe two's-complement delta
        int16_t dR = static_cast<int16_t>(countR - prevR_);
        prevL_ = countL; prevR_ = countR;

        double dsL = dL * metersPerTick_, dsR = dR * metersPerTick_;
        double ds = 0.5 * (dsR + dsL);
        double dtheta = (dsR - dsL) / L_;
        double thetaMid = theta_ + 0.5 * dtheta;          // midpoint (2nd-order) update
        x_ += ds * std::cos(thetaMid);
        y_ += ds * std::sin(thetaMid);
        theta_ = std::atan2(std::sin(theta_ + dtheta), std::cos(theta_ + dtheta));
    }

    double x() const { return x_; }
    double y() const { return y_; }
    double theta() const { return theta_; }

private:
    double L_, metersPerTick_;
    bool seeded_ = false;
    int16_t prevL_ = 0, prevR_ = 0;
    double x_ = 0.0, y_ = 0.0, theta_ = 0.0;
};
```

$O(1)$ per reading. Trace: `int16_t(-32536 - 32000) = int16_t(-64536) = 1000` on both wheels (straight 0.3142 m); then $-32036 - (-32536) = 500$ and $-31036 - (-32536) = 1500$, which is exactly Q4's tick 2, ending at $(0.6044, 0.1202, 0.7854)$. The seed step mirrors the `initialized_` guard from the derivatives chapter: without it the first delta would be measured against 0 and teleport the robot.

---

### 9. Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Frontend Implementation Guide):** Build an interactive **Differential-Drive ICC, `cmd_vel` Saturation & Odometry Drift Arena** using React, Tailwind CSS, HTML5 Canvas/SVG, and `shadcn/ui` primitives. Do not use native HTML `<input>`, `<select>`, or `<button>` controls.

#### 9.1 Layout & Component Hierarchy (`shadcn/ui`)

1. **Top-Level Container:** `<Card className="w-full max-w-6xl mx-auto border-border/60 bg-card/95 shadow-lg">` with `<CardHeader>`, `<CardTitle>`, and live `<Badge>` pills showing `Motion Regime` (`Straight`, `In-Place Spin`, `Left Pivot`, `Arc`) and `Motor Saturation Status`.
2. **Mode Switcher (`<Tabs>`):**
   * `<Tabs defaultValue="icc-visualizer">`:
     * `<TabsTrigger value="icc-visualizer">1. Wheel Speeds & ICC Turn Radius</TabsTrigger>`
     * `<TabsTrigger value="cmd-vel-saturation">2. cmd_vel Inverse Kinematics & Saturation</TabsTrigger>`
     * `<TabsTrigger value="odometry-drift">3. Encoder Odometry & Slip Drift Simulator</TabsTrigger>`
3. **Control Dock (Left Column, 4 cols on desktop):**
   * **Tab 1 Controls:** Left Wheel Speed $\omega_L$ (`<Slider>`, `-15` to `+15 rad/s`), Right Wheel Speed $\omega_R$ (`<Slider>`, `-15` to `+15 rad/s`), Track Width $L$ (`<Slider>`, `0.3 m` to `1.0 m`), and Preset Buttons (`<Button variant="outline" size="sm">`) for `Spin in Place`, `Pivot Left Wheel`, `Figure-8`, and `Straight`.
   * **Tab 2 Controls:** Desired $v$ (`<Slider>`), Desired $\omega$ (`<Slider>`), Hardware Limit $\omega_{\max}$ (`<Slider>`), and a `<Switch>` toggling `Curvature-Preserving Scaling` vs. `Naive Independent Clamping` (visually showing the robot understeering into a virtual wall when Naive Clamping is active!).
   * **Tab 3 Controls:** Integration Scheme (`<Select>`: `Euler` vs. `Midpoint Arc`), Inject Wheel Slip `<Button variant="destructive">` (`+2 deg Slip`), and `Reset Arena` (`<Button variant="ghost">`).
4. **Interactive Arena Canvas & Telemetry (Right Column, 8 cols on desktop):**
   * **Top-Down 2D Floor Grid Canvas:**
     * Renders the differential-drive chassis, rotating wheel tread animations proportional to $\omega_L, \omega_R$, the glowing **ICC pivot point** connected by dashed radius lines $R - L/2$, $R$, and $R + L/2$, and tangent velocity vectors.
     * In Tab 3, renders two trails simultaneously: the **True Robot Path** (solid emerald green) and the **Dead-Reckoned Encoder Odometry Path** (dashed amber), diverging visibly whenever the user injects a slip event.
   * **Live Telemetry (`<Table>`):** Displays $v_L, v_R, v, \omega, R, \Delta\text{ticks}_L, \Delta\text{ticks}_R$, and Pose $(x, y, \theta)$ with `<Tooltip>` formula breakdowns.
