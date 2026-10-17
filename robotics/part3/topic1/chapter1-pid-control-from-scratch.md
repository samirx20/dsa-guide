# Part 3, Topic 1: Closed-Loop Feedback & Control Theory

## Chapter 1: PID Control From Scratch — P, I, D, Anti-Windup & Tuning

---

### Why This Matters

Imagine you tell a robot arm to hold a coffee mug steady at $\theta = 90^\circ$ (horizontal). If you simply calculate how much motor voltage *should* hold the arm up on paper, apply that voltage, and close your eyes, you are using **open-loop control**. The moment someone pours hot coffee into the mug, or the motor warms up so its electrical resistance changes, or a gust of wind blows, the arm droops and spills the coffee. The controller has no idea anything went wrong because it never looks at the actual joint angle!

Nearly every real-world robotic actuator—from a $\$2$ hobby servo to a $\$200{,}000$ surgical robot arm or a SpaceX Falcon 9 grid fin—relies on **closed-loop feedback control**. And overwhelmingly, the workhorse algorithm inside those controllers is the **PID Controller** (**P**roportional–**I**ntegral–**D**erivative). Over $95\%$ of industrial control loops worldwide run PID under the hood.

In this chapter, we will build PID control from absolute zero. You will not just memorize three letters; you will feel the physical intuition of virtual springs, shock absorbers, and memory accumulators, trace exact numbers through every millisecond of a control loop, and learn the industrial secrets (**Derivative-on-Measurement** and **Integral Anti-Windup**) that separate textbook toys from production robot code.

---

### 1. Open-Loop vs. Closed-Loop Control

Before writing a single equation, let's define the four standard variables used across all of control theory:

1. **Setpoint / Reference ($r(t)$):** Where we *want* the system to be at time $t$ (e.g., target angle $r = 90^\circ$, or target wheel speed $r = 2.5\text{ m/s}$).
2. **Process Variable / Measurement ($y(t)$):** Where the sensor says the system *actually* is right now (e.g., encoder reading $y = 72^\circ$).
3. **Error ($e(t)$):** The gap between where we want to be and where we are:
   $$e(t) = r(t) - y(t)$$
4. **Control Effort / Actuator Command ($u(t)$):** The signal we send to the hardware to fix the error (e.g., motor voltage in Volts, PWM duty cycle in $[-100\%, +100\%]$, or current in Amps).

#### Open-Loop Control ("Fire and Forget")

In an open-loop system, the controller converts the desired setpoint $r(t)$ directly into a motor command $u(t)$ using a fixed formula or lookup table. Information flows only forward:

```
  Setpoint r(t)      +------------+      Control u(t)      +---------------+
  -----------------> | Controller | ---------------------> | Plant (Motor) | ---> Output y(t)
  (Desired: 90 deg)  +------------+      (Send 4.5 Volts)  +---------------+      (Actual: 68 deg?!)
                                                                   ^
                                                                   | Disturbance d(t)
                                                               (Heavy payload / Friction)
```

Notice what is missing: **no arrow goes back from Output $y(t)$ to the Controller**. If a disturbance $d(t)$ (gravity, friction, battery voltage sag) pushes the arm down to $68^\circ$, the controller keeps happily sending $4.5\text{ V}$ forever.

#### Closed-Loop Feedback Control ("Sense, Compare, Correct")

In a closed-loop system, we read a sensor (an optical encoder, potentiometer, or IMU) every $\Delta t$ seconds (say, at $1000\text{ Hz}$, where $\Delta t = 0.001\text{ s}$), subtract the measurement $y(t)$ from the target $r(t)$, and feed the **error** $e(t)$ into our controller:

```
                         Disturbance d(t) (Gravity, Wind, Friction)
                                            |
                                            v
  Setpoint r(t)     Error e(t)   +--------------+   Effort u(t)   +---------------+
  ---->( + )-------------------> |  Controller  | --------------> | Plant (Motor) |----+---> Output y(t)
         ^ -     e(t)=r(t)-y(t)  +--------------+                 +---------------+    |
         |                                                                             |
         |                           +--------------------+                            |
         +-------------------------- | Sensor (Encoder)   | <--------------------------+
              Measured y(t)          +--------------------+
```

Whenever $y(t)$ is too small ($y < r$), the error $e(t) = r - y$ is **positive**, instructing the controller to push forward. Whenever $y(t)$ overshoots the target ($y > r$), the error $e(t) = r - y$ becomes **negative**, instructing the controller to brake or reverse!

---

### 2. Attempt #0: Bang-Bang Control (And Why It Chatters)

What is the simplest closed-loop controller you could invent?
*"If the robot arm is below $90^\circ$, apply $+100\%$ full power upward. If the arm is above $90^\circ$, apply $-100\%$ full power downward."*

Mathematically:
$$u(t) = \begin{cases} +u_{\max} & \text{if } e(t) > 0 \\ -u_{\max} & \text{if } e(t) < 0 \end{cases}$$

This is called **Bang-Bang Control** (or On-Off Control). It works fine for a slow household furnace or oven that turns on and off every 15 minutes with a deadband.

Why is Bang-Bang catastrophic for a robot joint or self-driving steering wheel?
1. **Momentum & Overshoot:** When the arm is at $89.9^\circ$ ($e = +0.1^\circ$), a Bang-Bang controller still blasts the motor with $+100\%$ torque! By the time the arm reaches $90.0^\circ$, it is moving fast and cannot stop instantly. It flies past $90.0^\circ$ to $95^\circ$.
2. **Violent Chattering:** At $90.01^\circ$, the controller instantly slams the motor into $-100\%$ reverse! The arm violently oscillates back and forth across $90^\circ$, shaking the gears apart, burning up the H-bridge MOSFETs, and sounding like a jackhammer.

```
  Angle y(t)
    ^
95° |       /\      /\      /\      /\      <-- Violent high-frequency chattering!
90° |------/--\----/--\----/--\----/--\---------------- Target r(t) = 90°
85° |     /    \  /    \  /    \  /    \
    |    /      \/      \/      \/      \
  0°+---+-----------------------------------> Time (t)
```

**Core Insight:** We shouldn't push with $100\%$ effort when we are only $0.1^\circ$ away from the goal! *Small errors should get gentle corrections; large errors should get strong corrections.*

---

### 3. The 'P' Term: Proportional Control ($P = K_p \cdot e(t)$)

To make our correction gentle near the target and strong far away from the target, we make the control effort directly **proportional** to the error $e(t)$:

$$u_P(t) = K_p \cdot e(t) = K_p \cdot \bigl(r(t) - y(t)\bigr)$$

Here, $K_p$ is the **Proportional Gain**—a tuning knob (a positive constant) chosen by you, the engineer.

#### Physical Intuition: The Virtual Mechanical Spring

Look closely at Hooke's Law for a physical steel spring attached to a target post at position $r$:
$$F_{\text{spring}} = -k \cdot (y - r) = k \cdot (r - y) = k \cdot e$$

**A Proportional Controller is literally a software-simulated spring** connecting your robot's current position $y(t)$ to the invisible target position $r(t)$ with spring stiffness $K_p$!
- If $K_p$ is small (a weak, soggy rubber band), the motor pushes gently.
- If $K_p$ is large (a stiff truck suspension spring), even a tiny $1^\circ$ error commands a massive motor voltage.

Let's see how $u_P = K_p \cdot e$ behaves with concrete numbers. Suppose our target is $r = 100^\circ$ and we pick $K_p = 0.5\text{ V/deg}$:
- At $y = 0^\circ$: Error $e = 100^\circ \implies u_P = 0.5 \times 100 = +50\text{ V}$ (clamped to $+12\text{ V}$ max). Strong push!
- At $y = 80^\circ$: Error $e = 20^\circ \implies u_P = 0.5 \times 20 = +10\text{ V}$. Medium push!
- At $y = 98^\circ$: Error $e = 2^\circ \implies u_P = 0.5 \times 2 = +1.0\text{ V}$. Gentle nudge!
- At $y = 100^\circ$: Error $e = 0^\circ \implies u_P = 0.5 \times 0 = 0.0\text{ V}$. Zero push!

#### Why Pure P-Control Fails in Two Fundamental Ways

If $u_P = K_p \cdot e$ is a virtual spring, think about what happens to a physical mass hanging on a spring with no friction/damping:

**Failure Mode 1: Undamped Oscillation (Ringing)**
Suppose the arm starts at $0^\circ$ and wants to reach $100^\circ$. All the way from $0^\circ$ to $99.9^\circ$, the error $e(t)$ is positive, so the motor is accelerating the arm forward. When the arm finally reaches $100^\circ$, the motor voltage drops to $0\text{ V}$—**but the arm already has huge kinetic energy ($\frac{1}{2}I\omega^2$)!**
Coast-through carries the arm past $100^\circ$ up to $130^\circ$. Now $e = -30^\circ$, so the virtual spring pulls it backward, accelerating it all the way back to $100^\circ$, where it flies past to $75^\circ$! If you crank $K_p$ high enough, the system oscillates forever (or diverges).

**Failure Mode 2: Steady-State Error ("Droop") Under Gravity or Load**
Even worse, what if the robot arm is lifting a payload against gravity, which pulls downward with a constant torque requiring $3.0\text{ V}$ of motor effort just to hold the arm still?

Let's prove mathematically why a pure P-controller **can never reach $100^\circ$** against gravity!
1. Suppose the arm somehow reached the exact target: $y = 100^\circ$.
2. Then the error would be:
   $$e = r - y = 100^\circ - 100^\circ = 0^\circ$$
3. What voltage does a pure P-controller output when $e = 0^\circ$?
   $$u_P = K_p \cdot 0 = 0\text{ Volts!}$$
4. With $0\text{ Volts}$ applied to the motor, gravity ($3.0\text{ V}$ equivalent downward pull) wins immediately, and the arm falls downward!
5. How far does the arm fall before it stops? It falls until the upward spring force $K_p \cdot e_{\text{ss}}$ exactly balances the downward pull of gravity $F_{\text{gravity}}$:
   $$K_p \cdot e_{\text{ss}} = F_{\text{gravity}} \implies \boxed{e_{\text{ss}} = \frac{F_{\text{gravity}}}{K_p} \neq 0}$$

If $F_{\text{gravity}}$ requires $3.0\text{ V}$ and $K_p = 0.5\text{ V/deg}$, the arm settles permanently at:
$$e_{\text{ss}} = \frac{3.0\text{ V}}{0.5\text{ V/deg}} = 6^\circ \implies y_{\text{ss}} = 94^\circ$$
At $94^\circ$, the $6^\circ$ error generates $0.5 \times 6 = 3.0\text{ V}$, which balances gravity. The arm sits stuck at $94^\circ$ forever! Even if you double $K_p$ to $1.0$, the droop only shrinks to $3^\circ$ (and high $K_p$ makes the arm oscillate violently).

```
  Angle y(t)
    ^
120°|        /\
100°|-------/--\------------------- Target r(t) = 100°
 94°|      /    \   /\             <-- Settles at 94°! Permanent Steady-State
    |     /      \_/  \____________    Error (Droop) e_ss = F_grav / Kp = 6°
  0°+----+-------------------------> Time (t)
```

To fix oscillation, we need a **brake** (the D term). To fix steady-state droop, we need **memory** (the I term).

---

### 4. The 'D' Term: Derivative Control ($D = K_d \frac{de}{dt}$)

Why did the pure P-controller overshoot $100^\circ$? Because as the arm raced toward $100^\circ$ at high speed, the P-term only looked at *position error* ($e > 0$) and kept pushing forward until the very last instant! It had no awareness of **how fast the error was closing**.

Enter the **Derivative Term**, which is proportional to the **rate of change (slope/velocity)** of the error:

$$u_D(t) = K_d \cdot \frac{de(t)}{dt} \approx K_d \cdot \frac{e[k] - e[k-1]}{\Delta t}$$

Here, $K_d$ is the **Derivative Gain** (with units of $\text{V} \cdot \text{s/deg}$, or $\text{V per (deg/s)}$).

#### Physical Intuition: The Virtual Shock Absorber (Viscous Damper)

Think about what sign $\frac{de}{dt}$ has when the robot arm is at $y = 85^\circ$ and racing fast toward the target $r = 100^\circ$:
- At the previous step ($t = 0.00\text{ s}$), the arm was at $y = 80^\circ$, so $e[k-1] = 20^\circ$.
- At the current step ($t = 0.01\text{ s}$), the arm is at $y = 85^\circ$, so $e[k] = 15^\circ$.
- The error *shrank* from $20^\circ$ to $15^\circ$ in $\Delta t = 0.01\text{ s}$!
- Therefore, the rate of change of error is **negative**:
  $$\frac{\Delta e}{\Delta t} = \frac{15^\circ - 20^\circ}{0.01\text{ s}} = -500\text{ deg/s}$$

When we combine Proportional + Derivative (**PD Control**):
$$u_{PD}(t) = \underbrace{K_p \cdot e(t)}_{\text{Positive (Pushes toward target)}} + \underbrace{K_d \cdot \frac{de(t)}{dt}}_{\text{Negative! (Applies brakes as we approach)}}$$

Even though the arm hasn't reached $100^\circ$ yet ($e = +15^\circ > 0$), the D-term sees that we are approaching fast ($\frac{de}{dt} = -500\text{ deg/s} < 0$) and **subtracts voltage to brake the motor early** so it lands softly at $100^\circ$ with zero overshoot!

```
  PD Control: Virtual Spring (Kp) + Virtual Viscous Damper (Kd)

                    |\  /\  /\  /|
        +-----------| \/  \/  \/ |-----------+   <-- Spring: F_p = Kp * e
        |           |            |           |
  [ Robot Arm ]                              [ Target Setpoint r(t) ]
        |               +----+               |
        +---------------| ]  |---------------+   <-- Damper: F_d = Kd * (de/dt)
                        +----+                       Resists rapid motion!
```

#### Two Real-World Traps of the D-Term (And How Pros Fix Them)

In a textbook, $u_D = K_d \frac{de}{dt}$ looks spotless. On real hardware, naive implementation of $\frac{e[k] - e[k-1]}{\Delta t}$ causes two famous disasters:

**Trap 1: Derivative Kick (Setpoint Spikes)**
Suppose your robot arm is sitting peacefully at $y = 0^\circ$ ($r = 0^\circ$), and at $t = 1.000\text{ s}$ a user types a new target setpoint $r = 90^\circ$ into the GUI.
Look at what happens to $\frac{\Delta e}{\Delta t}$ in a single $1\text{ ms}$ ($\Delta t = 0.001\text{ s}$) control tick:
$$\frac{\Delta e}{\Delta t} = \frac{e[k] - e[k-1]}{\Delta t} = \frac{90^\circ - 0^\circ}{0.001\text{ s}} = +90{,}000\text{ deg/s!}$$
Multiply $+90{,}000\text{ deg/s}$ by even a tiny gain like $K_d = 0.05$, and the D-term commands a **$+4{,}500\text{ V}$ spike** for one millisecond! This violent jolt on every setpoint change is called **Derivative Kick**.

*The Industrial Fix — Derivative on Measurement:*
Remember that $e(t) = r(t) - y(t)$, so:
$$\frac{de(t)}{dt} = \frac{dr(t)}{dt} - \frac{dy(t)}{dt}$$
When the setpoint $r(t)$ is constant, $\frac{dr}{dt} = 0$, and when $r(t)$ jumps as a step, $\frac{dr}{dt} = \infty$ (which caused the kick!). So industrial controllers simply throw away $\frac{dr}{dt}$ and take the negative derivative of the **sensor measurement $y(t)$** alone:
$$\boxed{u_D(t) = -K_d \cdot \frac{dy(t)}{dt} \approx -K_d \cdot \frac{y[k] - y[k-1]}{\Delta t}}$$
This provides the exact same physical damping against velocity $\frac{dy}{dt}$, while completely eliminating Derivative Kick whenever the target $r(t)$ jumps!

**Trap 2: High-Frequency Sensor Noise Amplification**
Because differentiation divides by a tiny timestep $\Delta t$ (like $0.001\text{ s}$), even a tiny $\pm 0.05^\circ$ ADC or encoder quantization jitter between ticks gets multiplied by $\frac{1}{0.001} = 1000$, producing $\pm 50\text{ deg/s}$ of fake velocity noise!
*The Fix:* Always pass the derivative estimate through a simple **First-Order Low-Pass Filter** (Exponential Moving Average):
$$D_{\text{filtered}}[k] = \alpha \cdot D_{\text{filtered}}[k-1] + (1 - \alpha) \cdot D_{\text{raw}}[k]$$
where $\alpha \in [0.7, 0.95]$ smooths out high-frequency sensor chatter.

---

### 5. The 'I' Term: Integral Control ($I = K_i \int e(t)\,dt$)

We fixed oscillation using the D-term, so our PD controller smoothly brings the robot arm up toward the $100^\circ$ target without overshooting.
**But what about gravity?** Remember from Section 3 that against a constant downward gravitational pull, a P or PD controller settles permanently at $y = 94^\circ$ ($e_{\text{ss}} = +6^\circ$) because at rest $\frac{dy}{dt} = 0$, so the D-term outputs $0\text{ V}$, and the P-term needs that $6^\circ$ droop to generate the $3.0\text{ V}$ holding torque!

How can a controller output $3.0\text{ V}$ to hold the arm against gravity even when the instantaneous error $e(t)$ is **zero** ($y = 100^\circ$)?

Enter the **Integral Term**, which accumulates (sums up) the area under the error curve over all past history:

$$u_I(t) = K_i \int_0^t e(\tau)\,d\tau \approx K_i \sum_{j=0}^{k} e[j] \cdot \Delta t$$

In code, at every control loop tick $\Delta t$, we maintain a running accumulator variable `integral`:
$$\text{integral}[k] = \text{integral}[k-1] + e[k] \cdot \Delta t$$
$$u_I[k] = K_i \cdot \text{integral}[k]$$

#### How the Integral Term Annihilates Steady-State Error

Let's watch what happens when the robot arm gets stuck at $94^\circ$ ($e = +6^\circ$) with $K_i = 2.0\text{ V/(deg}\cdot\text{s)}$:
- After $0.5\text{ s}$ at $94^\circ$: $\text{integral} = 6^\circ \times 0.5\text{ s} = 3\text{ deg}\cdot\text{s} \implies u_I = 2.0 \times 3 = +6.0\text{ V}$ extra upward push!
- Because $e > 0$, `integral` **keeps growing larger and larger every single millisecond** until the arm is forced all the way up to $y = 100.0^\circ$!
- What happens once the arm finally reaches $y = 100.0^\circ$ ($e = 0^\circ$)?
  - The Proportional term drops to $u_P = K_p \cdot 0 = 0\text{ V}$.
  - The Derivative term is $u_D = -K_d \cdot 0 = 0\text{ V}$.
  - **What about the Integral term?** When $e = 0^\circ$, we add $0 \cdot \Delta t = 0$ to `integral`. That means `integral` **does not reset to zero**—it freezes at whatever value it has settled to. In steady state that is $1.5\text{ deg}\cdot\text{s}$, so $u_I = 2.0 \times 1.5 = +3.0\text{ V}$ (any surplus beyond that, such as the $3\text{ deg}\cdot\text{s}$ above, pushes the arm slightly past $100^\circ$, and the negative error there drains it back down)!

**Physical Intuition:** The Integral term is the controller's **persistent memory of past stubborn errors**. It automatically learns the exact baseline offset voltage ($+3.0\text{ V}$) needed to cancel constant external forces like gravity, friction, or headwinds, allowing $e(t)$ to reach $0.000^\circ$!

```
  Error e(t)
    ^
    |    _.-""-._
    |  .'  ||||  '.        Shaded area = Integral(e dt)
    | /   ||||||   \       Accumulates while e > 0, and REMAINS stored in memory
  0 +/---||||||||---\-----------------> Time (t)
                        ^
                        At this point e(t) = 0, so P = 0 and D = 0,
                        but I_term holds the exact 3.0V needed to fight gravity!
```

#### The Famous Danger of the I-Term: Integral Windup (And Anti-Windup)

What happens if you command the robot arm to move to $r = 100^\circ$, **but a human is physically holding the arm down at $y = 0^\circ$ for 10 seconds** (or the motor is simply maxed out at $12\text{ V}$ and moving as fast as it physically can)?

1. While the arm is held at $0^\circ$, the error is $e = 100^\circ$ every second.
2. After $10\text{ seconds}$, the integral accumulator has wound up to a gigantic number:
   $$\text{integral} = 100^\circ \times 10\text{ s} = 1{,}000\text{ deg}\cdot\text{s} \implies u_I = +2{,}000\text{ Volts!}$$
3. Even though the physical motor driver is already saturated at its hardware limit of $+12\text{ V}$, the variable `integral` inside your CPU RAM keeps climbing toward infinity! This is called **Integral Windup**.
4. Now the human lets go of the arm, and the arm reaches $100^\circ$ ($e = 0^\circ$). Does the arm stop at $100^\circ$? **NO!** Because `integral` still holds $+2{,}000\text{ V}$ in memory! The motor continues blasting at $+12\text{ V}$ full throttle right past $100^\circ$, crashing the arm into the mechanical hard stop at $180^\circ$ until enough *negative* error ($e < 0$) is accumulated over many seconds to unwind the giant $+1{,}000\text{ deg}\cdot\text{s}$ debt!

**The Industrial Fix — Integral Anti-Windup:**
Never let the integral term wind up beyond the actuator's physical limits! There are two standard anti-windup techniques used in every production PID controller:
1. **Integral Clamping:** Clamp the integral accumulator directly between $[-I_{\max}, +I_{\max}]$.
2. **Conditional Integration (Saturation Check):** If the total PID output $u(t)$ is already saturated at $+u_{\max}$ (e.g., $+12\text{ V}$) AND the error $e(t)$ is trying to push it even further into saturation ($e > 0$), **pause integration** ($\text{do not add } e \cdot \Delta t$) until the system comes out of saturation!

---

### 6. Putting It All Together: The Complete PID Equation & Dry-Run

Combining all three terms gives the continuous-time and discrete-time **PID Control Law**:

$$u(t) = \underbrace{K_p e(t)}_{\text{Proportional (Present)}} + \underbrace{K_i \int_0^t e(\tau)\,d\tau}_{\text{Integral (Past)}} - \underbrace{K_d \frac{dy(t)}{dt}}_{\text{Derivative (Future Trend)}}$$

```
                                   +------------------------+
                              +--->| P: Kp * e(t)           |---+
                              |    +------------------------+   |
  r(t)      e(t)              |    +------------------------+   |      u(t)
  --->( + )-------------------+--->| I: Ki * Integral(e dt) |---+--->( + )---> To Motor
        ^ -                        +------------------------+   ^
        |                                                       | -
        |                          +------------------------+   |
        +--------------------------| D: Kd * (dy/dt)        |<--+
        |                          +------------------------+
        |                                      ^
        +--------------------------------------+--- Measured y(t) from Sensor
```

#### Step-by-Step Numerical Dry-Run Table

Let's trace a discrete PID controller by hand for **5 control ticks** with timestep $\Delta t = 0.1\text{ s}$.
- **Target Setpoint:** $r = 100.0^\circ$
- **Gains:** $K_p = 1.0$, $K_i = 0.5$, $K_d = 0.2$
- **Derivative Mode:** Derivative-on-Measurement ($u_D = -K_d \frac{y[k] - y[k-1]}{\Delta t}$), with $D[0] = 0$ on the first tick.
- **Actuator Limits:** $u \in [-100.0, +100.0]$

Suppose the arm moves along the measured trajectory $y = [0^\circ, 25^\circ, 65^\circ, 95^\circ, 100^\circ]$:

| Tick $k$ | Time $t$ ($\text{s}$) | Target $r$ | Measured $y[k]$ | Error $e[k] = r - y$ | $u_P = K_p \cdot e$ | $\text{int}[k] = \text{int} + e\Delta t$ | $u_I = K_i \cdot \text{int}$ | $\frac{\Delta y}{\Delta t} = \frac{y[k]-y[k-1]}{0.1}$ | $u_D = -K_d \frac{\Delta y}{\Delta t}$ | Total Output $u = u_P + u_I + u_D$ | What's Happening Physically? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | $0.0$ | $100.0$ | $0.0$ | $+100.0$ | $+100.0$ | $10.0$ | $+5.0$ | $0.0$ (init) | $0.0$ | **$+100.0$** (clamped from $105$) | Huge initial error; P blasts motor forward at max power. |
| **1** | $0.1$ | $100.0$ | $25.0$ | $+75.0$ | $+75.0$ | $17.5$ | $+8.75$ | $+250.0$ | $-50.0$ | **$+33.75$** | Arm is accelerating fast ($+250^\circ/\text{s}$); D-term applies $-50$ braking! |
| **2** | $0.2$ | $100.0$ | $65.0$ | $+35.0$ | $+35.0$ | $21.0$ | $+10.50$ | $+400.0$ | $-80.0$ | **$-34.50$** | Even though $e = +35^\circ$, speed is huge ($400^\circ/\text{s}$), so D-term reverses torque early to prevent overshoot! |
| **3** | $0.3$ | $100.0$ | $95.0$ | $+5.0$ | $+5.0$ | $21.5$ | $+10.75$ | $+300.0$ | $-60.0$ | **$-44.25$** | Nearing target ($95^\circ$); heavy braking slows the arm down for a soft landing. |
| **4** | $0.4$ | $100.0$ | $100.0$ | $0.0$ | $0.0$ | $21.5$ | $+10.75$ | $+50.0$ | $-10.0$ | **$+0.75$** | Target reached ($e=0$)! $u_P=0$, while $u_I=+10.75$ stays in memory to hold against gravity! |

Look closely at **Tick 2** in the table above: the arm is at $65^\circ$ (still $35^\circ$ below the $100^\circ$ target!), yet the total PID output is **$-34.50$ (braking!)** because $u_D = -80.0$ recognized that at $400^\circ/\text{s}$ the arm would badly overshoot $100^\circ$ if it didn't start decelerating immediately. And look at **Tick 4**: at $y = 100^\circ$, $u_P = 0$, yet $u_I = +10.75$ remains stored to fight gravity!

---

### 7. Production Code Implementation (C++ & Python)

Below is a clean, industrial-grade PID controller featuring **Derivative-on-Measurement**, a **Low-Pass Derivative Filter**, **Conditional Anti-Windup**, and **Output Saturation Clamping**.

#### C++ Implementation

```cpp
#include <iostream>
#include <algorithm>
#include <iomanip>

class PIDController {
public:
    PIDController(double kp, double ki, double kd, double out_min, double out_max, double d_filter_alpha = 0.8)
        // ^^^ Initialize PID gains (kp, ki, kd), actuator saturation bounds, and low-pass filter smoothing factor
        : kp_(kp), ki_(ki), kd_(kd), out_min_(out_min), out_max_(out_max), alpha_(d_filter_alpha),
          integral_(0.0), prev_measurement_(0.0), filtered_deriv_(0.0), first_run_(true) {}
        // ^^^ Zero out state memory; set first_run_ = true so the first tick doesn't compute a fake derivative jump

    double update(double setpoint, double measurement, double dt) {
        if (dt <= 0.0) return 0.0;
        // ^^^ Guard against division-by-zero or negative timestamps if a timer glitches

        double error = setpoint - measurement;
        // ^^^ Compute instantaneous error e(t) = r(t) - y(t)

        // 1. Proportional Term: u_P = Kp * e(t)
        double p_term = kp_ * error;
        // ^^^ Virtual spring pulling proportional to current error

        // 2. Derivative Term (on Measurement to prevent Derivative Kick!): u_D = -Kd * (dy/dt)
        double raw_deriv = 0.0;
        if (first_run_) {
            prev_measurement_ = measurement;
            first_run_ = false;
            // ^^^ On the very first tick, initialize prev_measurement_ so dy/dt starts cleanly at 0.0
        } else {
            raw_deriv = -(measurement - prev_measurement_) / dt;
            // ^^^ Negative derivative of measurement (-dy/dt) avoids infinite spikes when setpoint changes
        }
        prev_measurement_ = measurement;
        // ^^^ Save current sensor reading for the next control loop iteration

        filtered_deriv_ = alpha_ * filtered_deriv_ + (1.0 - alpha_) * raw_deriv;
        // ^^^ Low-pass filter (EMA) removes high-frequency sensor quantization noise before multiplying by Kd
        double d_term = kd_ * filtered_deriv_;
        // ^^^ Virtual shock absorber opposing rapid velocity changes

        // 3. Integral Term with Conditional Anti-Windup
        double candidate_integral = integral_ + error * dt;
        // ^^^ Tentatively accumulate error area (e * dt)
        double unclamped_out = p_term + (ki_ * candidate_integral) + d_term;
        // ^^^ Check what the total output WOULD be if we accept this new integral update

        bool saturating_high = (unclamped_out > out_max_) && (error > 0.0);
        bool saturating_low  = (unclamped_out < out_min_) && (error < 0.0);
        // ^^^ Detect if the actuator is already maxed out AND the error is pushing it deeper into saturation

        if (!saturating_high && !saturating_low) {
            integral_ = candidate_integral;
            // ^^^ Anti-Windup: Only commit the integral update if we are NOT worsening actuator saturation!
        }
        double i_term = ki_ * integral_;
        // ^^^ Persistent memory term that cancels steady-state droop against gravity/friction

        // 4. Total Output with Hardware Saturation Clamp
        double output = p_term + i_term + d_term;
        return std::clamp(output, out_min_, out_max_);
        // ^^^ Clamp final command to physical hardware limits (e.g., [-12V, +12V])
    }

    void reset() {
        integral_ = 0.0;
        filtered_deriv_ = 0.0;
        first_run_ = true;
        // ^^^ Clear accumulated memory when disabling the robot or switching control modes
    }

private:
    double kp_, ki_, kd_;
    double out_min_, out_max_;
    double alpha_;
    double integral_;
    double prev_measurement_;
    double filtered_deriv_;
    bool first_run_;
};

int main() {
    PIDController pid(2.5, 1.2, 0.4, -12.0, 12.0, 0.7);
    // ^^^ Create a 12V motor PID controller with Kp=2.5, Ki=1.2, Kd=0.4
    double angle = 0.0, velocity = 0.0, target = 90.0, dt = 0.02;
    double gravity_load = 3.0; // Constant downward gravity torque equivalent to 3.0V

    for (int step = 0; step <= 10; ++step) {
        double voltage = pid.update(target, angle, dt);
        // ^^^ Compute closed-loop control effort every 20ms (50 Hz)
        double accel = (voltage - gravity_load - 0.5 * velocity) * 20.0;
        // ^^^ Simple physics plant: motor voltage fights gravity (3V) and viscous damping
        velocity += accel * dt;
        angle += velocity * dt;
        std::cout << "Step " << std::setw(2) << step << " | Angle: " << std::fixed << std::setprecision(2)
                  << angle << " deg | Cmd: " << voltage << " V\n";
    }
    return 0;
}
```

#### Python Implementation

```python
class PIDController:
    def __init__(self, kp: float, ki: float, kd: float,
                 out_min: float = -12.0, out_max: float = 12.0,
                 d_filter_alpha: float = 0.8):
        # ^^^ Store gains, physical actuator limits, and derivative low-pass filter coefficient
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.out_min = out_min
        self.out_max = out_max
        self.alpha = d_filter_alpha

        self.integral = 0.0
        self.prev_measurement = None
        self.filtered_deriv = 0.0
        # ^^^ Internal state variables for integral memory and derivative history

    def update(self, setpoint: float, measurement: float, dt: float) -> float:
        if dt <= 0.0:
            return 0.0
        # ^^^ Prevent division by zero if elapsed time dt is zero or negative

        error = setpoint - measurement
        # ^^^ Compute instantaneous position error e(t) = r(t) - y(t)

        # 1. Proportional term
        p_term = self.kp * error
        # ^^^ Virtual spring proportional to instantaneous error

        # 2. Derivative term on measurement (-dy/dt) with EMA low-pass filter
        if self.prev_measurement is None:
            raw_deriv = 0.0
            # ^^^ Avoid spike on the first iteration when no prior measurement exists
        else:
            raw_deriv = -(measurement - self.prev_measurement) / dt
            # ^^^ Negative rate of change of sensor reading prevents Derivative Kick
        self.prev_measurement = measurement

        self.filtered_deriv = (self.alpha * self.filtered_deriv
                               + (1.0 - self.alpha) * raw_deriv)
        # ^^^ Smooth out noisy encoder/ADC quantization spikes
        d_term = self.kd * self.filtered_deriv

        # 3. Integral term with conditional anti-windup
        candidate_integral = self.integral + error * dt
        # ^^^ Compute tentative new integral value
        unclamped = p_term + (self.ki * candidate_integral) + d_term

        saturating_high = (unclamped > self.out_max) and (error > 0.0)
        saturating_low = (unclamped < self.out_min) and (error < 0.0)
        # ^^^ Check if actuator is saturated AND error pushes further into saturation

        if not (saturating_high or saturating_low):
            self.integral = candidate_integral
            # ^^^ Freeze integral accumulation during actuator saturation (Anti-Windup)

        i_term = self.ki * self.integral

        # 4. Sum terms and clamp to physical actuator bounds
        output = p_term + i_term + d_term
        return max(self.out_min, min(self.out_max, output))
        # ^^^ Return final saturated command u(t)
```

---

### 8. Step-by-Step Practical PID Tuning Protocol

When you sit down next to a real robot with unknown mass and friction, **never guess all three gains ($K_p, K_i, K_d$) at random**. Follow this four-step field protocol used by robotics engineers everywhere:

1. **Step 1 — Zero Everything Out:** Set $K_p = 0, K_i = 0, K_d = 0$. Verify that your sensor reads in the right direction and that a positive motor command moves the robot *toward* a positive setpoint (if it moves away, your sign is inverted and positive feedback will immediately slam the robot into a wall!).
2. **Step 2 — Tune $K_p$ First (Speed of Response):** Slowly increase $K_p$ while applying small step changes to the setpoint. Stop increasing $K_p$ when the robot reaches the target quickly with a moderate overshoot ($10\%\text{–}25\%$) and $1\text{–}2$ visible oscillations that settle out.
3. **Step 3 — Tune $K_d$ Second (Damp the Overshoot):** With $K_p$ fixed, slowly increase $K_d$. Watch the overshoot shrink as the virtual shock absorber brakes the arm before hitting the target. Stop increasing $K_d$ if you hear or feel high-frequency buzzing/hum in the motor (that means $K_d$ is amplifying sensor noise).
4. **Step 4 — Tune $K_i$ Last (Eliminate Steady-State Droop):** Finally, add a small $K_i$ until any remaining steady-state gap (from gravity or static friction) closes to zero within $0.5\text{–}2.0\text{ seconds}$. Make sure anti-windup is active!

---

### 9. Common Mistakes & Fixes

| Mistake | Symptom on the Robot | Root Cause | The Fix |
| :--- | :--- | :--- | :--- |
| **Inverted Feedback Sign** ($e = y - r$ instead of $r - y$) | Robot immediately accelerates at $100\%$ power *away* from the target into the hard stop. | Positive feedback loop instead of negative feedback loop. | Verify that when $y < r$, the motor pushes $y$ upward toward $r$. |
| **Omitting $\Delta t$ in $I$ and $D$** (`integral += error`, `deriv = error - prev`) | Controller works at $100\text{ Hz}$, then goes wildly unstable when loop rate changes to $500\text{ Hz}$ or CPU load fluctuates. | Gains become secretly coupled to loop frequency ($K_i$ scales by $5\times$, $K_d$ shrinks by $5\times$). | Always multiply integral updates by `dt` and divide derivative differences by `dt`. |
| **No Integral Anti-Windup** | After being blocked or making a long move, the robot overshoots massively and stays pinned past the target for seconds. | `integral` accumulated a massive windup debt while the motor was saturated at $100\%$. | Use Conditional Integration (pause integration when output is saturated in the direction of error) or clamp `integral`. |
| **Derivative on Error ($de/dt$) Without Filtering** | Every time the user changes the target setpoint, the motor violently thumps/jerks ("Derivative Kick") and buzzes at rest. | Step changes in $r(t)$ cause $\frac{\Delta r}{\Delta t} \to \infty$; encoder quantization causes noisy spikes. | Compute derivative on measurement ($-K_d \frac{dy}{dt}$) and apply an EMA low-pass filter ($\alpha \approx 0.8$). |

---

### 10. Quick Reference Summary

| Term | Mathematical Formula | Physical Analogy | Time Horizon | Effect of Increasing Gain | Too High Causes... |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Proportional ($P$)** | $K_p \cdot e(t)$ | **Virtual Spring** pulling toward $r(t)$ | **Present** (Current error) | Faster rise time; reduces (but never eliminates) steady-state droop. | Violent overshoot and sustained oscillation (ringing). |
| **Integral ($I$)** | $K_i \int_0^t e(\tau)\,d\tau$ | **Persistent Memory** cancelling constant load/gravity | **Past** (Accumulated error area) | Eliminates steady-state error ($e_{\text{ss}} \to 0$) completely. | Slow, sluggish low-frequency oscillation and **Integral Windup**. |
| **Derivative ($D$)** | $-K_d \frac{dy(t)}{dt}$ | **Virtual Shock Absorber** braking velocity | **Future** (Rate of approach) | Reduces overshoot and damps oscillations; improves stability. | High-frequency motor buzzing/chatter from amplified sensor noise. |

---

## Interactive Visualization & shadcn/ui Specification

### Widget Purpose
Build an interactive **1-DOF Gravity-Loaded Robot Arm PID Simulator** where learners can drag PID gains ($K_p, K_i, K_d$), drop a coffee mug onto the arm (gravity disturbance), and visually see both the physical arm's motion and the real-time breakdown of $u_P(t)$, $u_I(t)$, and $u_D(t)$ contributions alongside Anti-Windup and Derivative-on-Measurement toggles.

### Visual Layout & Interactive Canvas
- **Left Panel (40% width) — 2D Physics Canvas:**
  - Renders a shoulder-joint robot arm rotating from $0^\circ$ (straight down) to $180^\circ$ (straight up), with a dashed emerald target line at the Setpoint $r(t)$ (draggable directly on the canvas or via slider).
  - Visualizes the **Virtual Spring ($P$)** as a glowing cyan coil stretched between the arm tip and the target angle, and the **Virtual Damper ($D$)** as an amber velocity arrow opposing motion.
  - Displays a live **Torque Gauge Bar** ($[-12\text{ V}, +12\text{ V}]$) stacked by color: Cyan ($u_P$), Violet ($u_I$), and Amber ($u_D$), flashing red when saturated at $\pm 12\text{ V}$.
- **Right Panel (60% width) — Synchronized Real-Time Step-Response Charts:**
  - **Top Chart:** Target Setpoint $r(t)$ (dashed green) vs. Actual Angle $y(t)$ (solid white/blue), with shaded annotations highlighting **Rise Time**, **Peak Overshoot %**, and **Steady-State Error ($e_{\text{ss}}$)**.
  - **Bottom Chart:** Stacked time-series plot of $u_P(t)$, $u_I(t)$, $u_D(t)$, and Clamped Total $u(t)$.

### Required `shadcn/ui` Primitives (No Raw Browser Inputs)
- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`: Wrap the Physics Canvas, Telemetry Charts, and Gain Tuning Console.
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`: Preset scenarios (`"Bang-Bang Chatter"`, `"Pure P (Gravity Droop)"`, `"Underdamped PD"`, `"Tuned PID"`, `"Integral Windup Disaster"`).
- `<Slider>`:
  - `Kp` ($0.0\text{ to }10.0$, step $0.1$)
  - `Ki` ($0.0\text{ to }5.0$, step $0.05$)
  - `Kd` ($0.0\text{ to }3.0$, step $0.05$)
  - `Target Setpoint r(t)` ($0^\circ\text{ to }150^\circ$, step $5^\circ$)
  - `Payload Mass / Gravity Load` ($0.0\text{ kg to }5.0\text{ kg}$, step $0.25\text{ kg}$)
- `<Switch>`:
  - `"Enable Anti-Windup (Conditional Clamping)"` (default ON; toggling OFF during the `"Integral Windup Disaster"` preset visibly demonstrates massive overshoot).
  - `"Derivative on Measurement (-dy/dt)"` vs. `"Derivative on Error (de/dt)"` (shows the giant voltage spike on setpoint step changes).
- `<Button>`: `"Step Setpoint (+45°)"`, `"Hold Arm Down (Simulate Stall)"`, and `"Reset Simulation"`.
- `<Badge>`: Live performance metrics badges (`Overshoot: 4.2%`, `Steady-State Error: 0.0°`, `Status: Saturated / Active`).
- `<Table>`: Expandable 10-row discrete tick inspection table matching Section 6's dry-run columns.
- `<Tooltip>`: Hover explanations on each gain slider linking $K_p, K_i, K_d$ to their physical spring/memory/damper analogies.
