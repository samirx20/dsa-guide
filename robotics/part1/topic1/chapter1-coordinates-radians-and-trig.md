# Part 1, Topic 1: Angles, Trigonometry & Vectors From Zero
## Chapter 1: Coordinates, Radians, the Unit Circle & `atan2`

---

## Why This Matters in Robotics

Imagine you are programming a differential-drive warehouse robot. A camera mounted on the ceiling reports that your robot is standing at position $(x = 2.0\text{ m}, y = 1.0\text{ m})$ and facing an angle of $179^\circ$. A moment later, a pallet needs to be picked up at $(x = -1.0\text{ m}, y = 4.0\text{ m})$, and the target heading is $-179^\circ$.

If your robot's steering controller simply subtracts the current angle from the target angle:

$$\text{error} = \theta_{\text{target}} - \theta_{\text{current}} = -179^\circ - 179^\circ = -358^\circ$$

Instead of nudging $2^\circ$ counterclockwise across the $\pm 180^\circ$ boundary, your robot violently spins almost a full circle ($358^\circ$) clockwise, tangling its cables and knocking over a shelf!

Even worse, if you tried to compute the angle to the pallet using the high-school formula $\theta = \arctan(\Delta y / \Delta x)$, your robot would drive in the exact opposite direction ($180^\circ$ wrong) half the time—and crash with a divide-by-zero error whenever the target is directly to its left or right ($\Delta x = 0$).

In this chapter, we build the bedrock of spatial mathematics from **absolute zero**. You do not need to remember high-school trigonometry; we will derive every single idea visually from first principles, see why robotics engineers use specific coordinate conventions and radians, master the **Unit Circle**, replace broken $\arctan$ with four-quadrant `atan2(y, x)`, and write bulletproof angle-wrapping code in both C++ and Python.

---

## 1. Coordinate Systems & The Right-Hand Rule

### 1.1 What Is a Coordinate System?

A **coordinate system** (or **reference frame**) is simply an agreement on two things:
1. **An Origin $(0, 0)$**: Where we start measuring from (for example, the back-left corner of a room, or the center of the robot's drive axle).
2. **Axes ($X, Y, Z$)**: Which directions we call "positive" and what unit of length we use (almost always **meters** in robotics, per the standard REP-103 convention).

In a 2D plane (like a flat warehouse floor), any point $P$ is described by two numbers $(x, y)$:
- $x$: How many meters to walk along the $X$-axis from the origin.
- $y$: How many meters to walk along the $Y$-axis from that point.

### 1.2 Why Screen Coordinates, Math Coordinates, and Robot Coordinates Differ

If you have written UI code or 2D games, you might be used to $X$ pointing right and $Y$ pointing **down** (starting from the top-left pixel). In standard math class, $X$ points right and $Y$ points **up** on the chalkboard.

In robotics (specifically **ROS REP-103** and aerospace standards), we attach a coordinate frame directly to the robot's body. Which way should $+X$, $+Y$, and $+Z$ point?

We use the **Right-Hand Rule**:
- **$+X$ points Forward** (out the front nose of the robot).
- **$+Y$ points Left** (out the left wheel of the robot).
- **$+Z$ points Up** (out the top roof of the robot).

```
                 +Z (Up, out of the roof)
                  ^
                  |      +X (Forward, robot nose)
                  |     /
                  |    /
                  |   /
                  |  /
                  | /
   +Y (Left) <----+------------------- [Robot Center (0,0,0)]
```

### 1.3 How to Do the Right-Hand Rule With Your Own Hand

Hold up your **right hand** right now:
1. Point your **index finger** straight ahead of you $\rightarrow$ that is **$+X$ (Forward)**.
2. Bend your **middle finger** $90^\circ$ to the left (inward) $\rightarrow$ that is **$+Y$ (Left)**.
3. Point your **thumb** straight up toward the ceiling $\rightarrow$ that is **$+Z$ (Up)**.

Why does this matter for 2D angles?
Look down at the floor from above (looking down the $+Z$ axis). Now curl the fingers of your right hand from $+X$ (Forward) toward $+Y$ (Left), with your thumb pointing up ($+Z$). Your fingers curl **Counter-Clockwise (CCW)**!

> [!IMPORTANT]
> **The Golden Sign Convention of Robotics:**
> When looking down at a 2D floor ($+Z$ pointing up at you):
> - **$\theta = 0$** points straight along the **$+X$ axis**.
> - **Positive rotation ($+\theta$)** is **Counter-Clockwise (CCW)** (turning left, from $+X$ toward $+Y$).
> - **Negative rotation ($-\theta$)** is **Clockwise (CW)** (turning right, from $+X$ toward $-Y$).

```
                       +Y (Left, +90 deg / +pi/2 rad)
                        ^
                        |      /  P = (x, y)
                        |     /
                        |    /  r (distance)
                        |   /
                        |  /   ^
                        | /    | +theta (CCW is POSITIVE)
   (-180 / +180 deg) ---+------------------------> +X (Forward, 0 deg / 0 rad)
                        | \
                        |  \   | -theta (CW is NEGATIVE)
                        |   \  v
                        v
                       -Y (Right, -90 deg / -pi/2 rad)
```

---

## 2. Why Radians Exist (And Why $360^\circ$ Is Arbitrary)

### 2.1 The Problem with Degrees

Why are there $360^\circ$ in a circle? Because ancient Babylonian astronomers used a base-60 number system and noticed there are roughly $365$ days in a year ($360$ has many convenient divisors: $2, 3, 4, 5, 6, 8, 9, 10, 12, 15, \dots$).

There is nothing physically special about the number $360$. If you tell a motor controller: *"The wheel has radius $r = 0.1\text{ m}$ and rotated by $45^\circ$; how far did the robot roll?"*, you cannot just multiply $0.1 \times 45 = 4.5\text{ m}$. You first have to divide by $360^\circ$ and multiply by $2\pi$ to strip out the arbitrary human unit.

### 2.2 Defining the Radian from Pure Geometry

What if we measure an angle using the circle itself?
Imagine taking a piece of string whose length is exactly equal to the circle's radius $r$. Now lay that string along the curved outer edge (the **arc**) of the circle.

The angle subtended by an arc of length $r$ is defined as **$1\text{ radian}$** ($\approx 57.2958^\circ$).

```
                    , - ~ ~ ~ - ,
                , '               ' ,        Arc length s = r
              ,                       ,     /
             ,                         ,   v
            ,             O-------------*   <-- 1 radian (~57.3 deg)
            ,              \     r     /
             ,              \         /
              ,              \   r   /
                ,             \     /
                  ' - , _ _ _ , \ /
```

In general, if you walk an arc length $s$ along a circle of radius $r$, the angle $\theta$ in **radians** is simply the ratio of arc length to radius:

$$\theta = \frac{s}{r} \quad \Longleftrightarrow \quad s = r\theta$$

Look at that second equation: $s = r\theta$.
- No conversion factors!
- If a robot wheel has radius $r = 0.2\text{ m}$ and rotates by $\theta = 1\text{ rad}$, the robot moves forward by $s = 0.2 \times 1 = 0.2\text{ m}$.
- If we take the time derivative of both sides (how fast distance changes per second), linear velocity $v$ and angular velocity $\omega$ (in $\text{rad/s}$) obey:

$$v = r\omega$$

- Furthermore, in calculus and Taylor series (which your computer uses to approximate $\sin$ and $\cos$), the derivative $\frac{d}{d\theta}\sin(\theta) = \cos(\theta)$ is **only true when $\theta$ is in radians**! (In degrees, an ugly factor of $\frac{\pi}{180}$ pops out on every derivative).

### 2.3 Converting Between Degrees and Radians

Since the circumference (total arc length) of a circle of radius $r$ is $C = 2\pi r$, a full circle in radians is:

$$\theta_{\text{full circle}} = \frac{2\pi r}{r} = 2\pi\text{ radians} \approx 6.283185\text{ rad}$$

Therefore, $2\pi\text{ rad} = 360^\circ$, which simplifies to the fundamental bridge:

$$\pi\text{ radians} = 180^\circ$$

From this single equality, you never need to guess whether to multiply or divide by $\pi / 180$:
- **Degrees $\to$ Radians**: Multiply by $\frac{\pi}{180^\circ}$ (the degrees cancel out).
- **Radians $\to$ Degrees**: Multiply by $\frac{180^\circ}{\pi}$ (the radians cancel out).

| Turn Description | Degrees ($^\circ$) | Exact Radians | Decimal Radians ($\text{rad}$) |
| :--- | :--- | :--- | :--- |
| Straight ahead ($+X$) | $0^\circ$ | $0$ | $0.0000$ |
| Eighth turn left | $45^\circ$ | $\pi / 4$ | $0.7854$ |
| Quarter turn left ($+Y$) | $90^\circ$ | $\pi / 2$ | $1.5708$ |
| Quarter turn right ($-Y$) | $-90^\circ$ | $-\pi / 2$ | $-1.5708$ |
| Half turn / U-turn ($-X$) | $180^\circ$ | $\pi$ | $3.1416$ |
| Full circle | $360^\circ$ | $2\pi$ | $6.2832$ |

---

## 3. The Unit Circle: $\cos\theta$ and $\sin\theta$ Without Memorization

### 3.1 Shadows on the Axes

Forget memorizing "SOH-CAH-TOA" as disconnected ratios of triangles. Let's look at a circle of radius $r = 1$ centered at the origin $(0, 0)$—called the **Unit Circle**.

Suppose a tiny beacon starts at $(1, 0)$ and walks counter-clockwise along the unit circle by an angle $\theta$ (which is also an arc length of $\theta$!). Where is the beacon now?

```
                            +Y
                             ^
                        . - ~|~ ~ - .
                    , '      |        ' ,
                  ,          |          * P = (cos(theta), sin(theta))
                 ,           |         /|
                ,            |  r=1   / |
                ,            |       /  |  <-- Vertical height = sin(theta)
                ,            | theta/   |
               --------------+-----/----+---> +X
                ,          (0,0)   <---->
                ,                    ^-- Horizontal shadow = cos(theta)
                 ,                      ,
                  ,                    ,
                    ,                , '
                      ' - , _ _ _ , '
```

We define the coordinates $(x, y)$ of that point on the unit circle as:
- **$\cos(\theta)$ is the $x$-coordinate** (how far forward/backward the point's shadow falls on the horizontal $X$-axis).
- **$\sin(\theta)$ is the $y$-coordinate** (how high up/down the point's shadow falls on the vertical $Y$-axis).

That's it! On a circle of radius $1$:

$$(x, y) = (\cos\theta, \sin\theta)$$

What if the point is at distance $r$ from the origin instead of $1$? We simply scale the unit circle up by $r$ (**Polar-to-Cartesian conversion**):

$$x = r\cos\theta, \qquad y = r\sin\theta$$

For example, if a LiDAR rangefinder Mounted at $(0, 0)$ fires a laser beam at angle $\theta = 30^\circ$ ($\frac{\pi}{6}\text{ rad}$) and measures a wall at distance $r = 4.0\text{ m}$, where is that wall point $(x, y)$ in the robot's frame?
- $x = 4.0 \cos(\pi/6) = 4.0 \times 0.8660 = 3.464\text{ m}$ (in front of the robot)
- $y = 4.0 \sin(\pi/6) = 4.0 \times 0.5000 = 2.000\text{ m}$ (to the left of the robot)

### 3.2 The Pythagorean Identity ($\cos^2\theta + \sin^2\theta = 1$)

Look back at the right-angled triangle inside our Unit Circle above.
- The horizontal base has length $|\cos\theta|$.
- The vertical height has length $|\sin\theta|$.
- The hypotenuse is the radius of the unit circle, which is always $1$.

By the Pythagorean theorem ($a^2 + b^2 = c^2$), for **any** angle $\theta$ in the universe:

$$\cos^2(\theta) + \sin^2(\theta) = 1$$

In general, for a point at distance $r$ where $x = r\cos\theta$ and $y = r\sin\theta$:

$$x^2 + y^2 = (r\cos\theta)^2 + (r\sin\theta)^2 = r^2(\cos^2\theta + \sin^2\theta) = r^2(1) = r^2$$

Taking the square root gives the Euclidean distance from the origin:

$$r = \sqrt{x^2 + y^2}$$

---

## 4. Going Backwards: Why $\arctan(y/x)$ Is Broken & How `atan2(y, x)` Saves Us

### 4.1 The Two Fatal Flaws of $\arctan(y / x)$

We just saw how to go from Polar $(r, \theta)$ to Cartesian $(x, y)$:
$$x = r\cos\theta, \qquad y = r\sin\theta$$

What if we know $(x, y)$—say, a target waypoint is at $(x, y)$ relative to our robot—and we need to find the angle $\theta$ to steer toward it?
If we divide $y$ by $x$, the radius $r$ cancels out:

$$\frac{y}{x} = \frac{r\sin\theta}{r\cos\theta} = \tan(\theta)$$

In math class, you were taught to take the inverse tangent: $\theta = \arctan(y / x)$. **Never use `atan(y / x)` to find a 2D heading in robotics!** It has two fatal flaws:

1. **Division by Zero at $x = 0$**: If the target is directly to your left $(0, 5)$ or right $(0, -5)$, then $x = 0$, and $y / x$ divides by zero!
2. **Sign Ambiguity (Blind to Quadrants II and III)**: Because dividing two numbers destroys their individual signs, `atan(y / x)` cannot tell the difference between Quadrant I and Quadrant III, or between Quadrant II and Quadrant IV!

Look at this concrete disaster:
- **Target A** is at $(x = +2, y = +2)$ (**Quadrant I**: Forward-Left, $+45^\circ$).
  $$\frac{y}{x} = \frac{+2}{+2} = +1.0 \implies \arctan(+1.0) = +45^\circ \quad (\text{Correct!})$$
- **Target B** is at $(x = -2, y = -2)$ (**Quadrant III**: Backward-Right, $-135^\circ$).
  $$\frac{y}{x} = \frac{-2}{-2} = +1.0 \implies \arctan(+1.0) = +45^\circ \quad (\text{180}^\circ\text{ WRONG!})$$

Because $\frac{-2}{-2}$ simplifies to $+1.0$ *before* $\arctan$ ever sees the numbers, $\arctan$ only ever outputs angles between $-90^\circ$ and $+90^\circ$ ($\left(-\frac{\pi}{2}, +\frac{\pi}{2}\right)$).

```
                    Quadrant II                 |                Quadrant I
                  x < 0, y > 0                  |               x > 0, y > 0
             (-2, +2) -> y/x = -1               |          (+2, +2) -> y/x = +1
           atan(-1) says -45 deg (WRONG!)       |        atan(+1) says +45 deg (OK)
         atan2(+2, -2) says +135 deg (OK!)      |      atan2(+2, +2) says +45 deg (OK!)
                                                |
   ---------------------------------------------+---------------------------------------------
                                                |
                    Quadrant III                |                Quadrant IV
                  x < 0, y < 0                  |               x > 0, y < 0
             (-2, -2) -> y/x = +1               |          (+2, -2) -> y/x = -1
           atan(+1) says +45 deg (WRONG!)       |        atan(-1) says -45 deg (OK)
         atan2(-2, -2) says -135 deg (OK!)      |      atan2(-2, +2) says -45 deg (OK!)
```

### 4.2 Enter `atan2(y, x)`: Four-Quadrant Inverse Tangent

To fix this once and for all, the creators of Fortran IV in 1961 introduced `atan2(y, x)`—and every programming language since (C, C++, Python, Rust, MATLAB, GLSL) includes it in its standard math library.

Instead of passing the single ratio `y / x`, you pass `y` and `x` as **two separate arguments**: `atan2(y, x)`.
> [!WARNING]
> **Watch the Argument Order: `y` comes FIRST, `x` comes SECOND!**
> Why `atan2(y, x)` instead of `(x, y)`? Because $\tan\theta = \frac{\sin\theta}{\cos\theta} = \frac{y}{x}$, so `atan2(y, x)` preserves the numerator-first order of `atan(y / x)`. Mixing up `atan2(x, y)` is one of the most common bugs in robotics—it reflects your angles across the $45^\circ$ diagonal!

How `atan2(y, x)` works internally across all 4 quadrants and axes (returning an angle in $[-\pi, +\pi]$):

$$\operatorname{atan2}(y, x) = \begin{cases}
\arctan(y/x) & \text{if } x > 0 \quad (\text{Quadrants I & IV}) \\
\arctan(y/x) + \pi & \text{if } x < 0 \text{ and } y \ge 0 \quad (\text{Quadrant II}) \\
\arctan(y/x) - \pi & \text{if } x < 0 \text{ and } y < 0 \quad (\text{Quadrant III}) \\
+\frac{\pi}{2} & \text{if } x = 0 \text{ and } y > 0 \quad (+Y \text{ axis}) \\
-\frac{\pi}{2} & \text{if } x = 0 \text{ and } y < 0 \quad (-Y \text{ axis}) \\
0 & \text{if } x = 0 \text{ and } y = 0 \quad (\text{Origin convention})
\end{cases}$$

---

## 5. The $\pm\pi$ Discontinuity & Angle Wrapping (`wrap_to_pi`)

### 5.1 Why Subtracting Angles Fails Near $\pm 180^\circ$ ($\pm\pi$)

`atan2(y, x)` returns angles in the interval $(-\pi, +\pi]$ (or $(-180^\circ, +180^\circ]$).
Notice what happens right behind the robot along the negative $X$-axis:
- Slightly to the back-left is $+\pi - 0.02\text{ rad}$ ($+179^\circ$).
- Slightly to the back-right is $-\pi + 0.02\text{ rad}$ ($-179^\circ$).

Physically, those two directions are only **$0.04\text{ rad}$ ($2^\circ$) apart**!
Mathematically, on the real number line, $+3.12\text{ rad}$ and $-3.12\text{ rad}$ look like they are $6.24\text{ rad}$ ($358^\circ$) apart because the interval $(-\pi, +\pi]$ has a "seam" (branch cut) at $\pm\pi$.

```
                     +pi / -pi Seam (Branch Cut)
                              |
              +179 deg        v        -179 deg
             (+3.12 rad)    * | *    (-3.12 rad)
                          . ' | ' .
                        ,     |     ,
                       ,      +----->,  Shortest physical turn: +2 deg (+0.04 rad)
                       ,             ,
                        ,           ,   Naive subtraction (-179 - 179 = -358 deg):
                          ' - _ - '     Spins 358 deg the WRONG way around!
                              ^
                            0 deg
```

### 5.2 Two Bulletproof Ways to Wrap Any Angle to $(-\pi, +\pi]$

Whenever you add or subtract two angles—such as computing heading error $e_\theta = \theta_{\text{target}} - \theta_{\text{current}}$ or integrating gyro measurements $\theta_{k+1} = \theta_k + \omega \Delta t$—you **must** wrap the result back into $(-\pi, +\pi]$.

#### Method 1: The `atan2(sin(theta), cos(theta))` Trick (Cleanest & Branchless)
Think about what $\cos(\theta)$ and $\sin(\theta)$ do: they project any angle $\theta$ (even $\theta = 1000\text{ rad}$ or $\theta = -358^\circ$) onto its unique $(x, y)$ point on the Unit Circle! And what does `atan2(y, x)` do? It takes a point on the circle and returns its principal angle in $[-\pi, +\pi]$!

$$\text{wrap\_to\_pi}(\theta) = \operatorname{atan2}(\sin\theta, \cos\theta)$$

#### Method 2: Modulo Arithmetic (`std::remainder` in C++ / `%` in Python)
If you are running a tight inner loop millions of times per second and want to avoid calling three trigonometric functions (`sin`, `cos`, `atan2`), IEEE 754 floating-point provides `remainder(theta, 2 * pi)`, which directly computes the remainder rounded to the nearest multiple of $2\pi$, landing directly in $[-\pi, +\pi]$! In Python, `((theta + math.pi) % (2.0 * math.pi)) - math.pi` shifts the interval $[-\pi, \pi)$ to $[0, 2\pi)$, applies modulo $2\pi$, and shifts back by $-\pi$.

---

## 6. Annotated Code Implementation (C++ & Python)

### 6.1 C++17 Implementation

```cpp
#include <cmath>
#include <iostream>
#include <iomanip>

namespace robotics {

constexpr double kPi = 3.14159265358979323846;

double deg_to_rad(double deg) {
    return deg * (kPi / 180.0);
    //           ^^^^^^^^^^^^^
    //           Multiply by pi/180 so the "degrees" unit cancels out
}

double rad_to_deg(double rad) {
    return rad * (180.0 / kPi);
    //           ^^^^^^^^^^^^^
    //           Multiply by 180/pi so the "radians" unit cancels out
}

double wrap_to_pi(double angle_rad) {
    return std::atan2(std::sin(angle_rad), std::cos(angle_rad));
    //     ^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
    //     1. Project angle_rad onto the Unit Circle (x = cos, y = sin)
    //     2. Recover the principal angle in [-pi, +pi] via 4-quadrant atan2
}

double shortest_angular_distance(double current_rad, double target_rad) {
    return wrap_to_pi(target_rad - current_rad);
    //                ^^^^^^^^^^^^^^^^^^^^^^^^
    //                Raw difference might be -358 deg; wrap_to_pi turns it into +2 deg!
}

} // namespace robotics

int main() {
    using namespace robotics;

    // Robot at (2.0, 1.0) facing +179 deg; target pallet at (-1.0, 4.0)
    double robot_x = 2.0, robot_y = 1.0;
    double robot_yaw = deg_to_rad(179.0);

    double target_x = -1.0, target_y = 4.0;
    double dx = target_x - robot_x; // -3.0 m (behind robot in world X)
    double dy = target_y - robot_y; // +3.0 m (left of robot in world Y)

    double distance = std::hypot(dx, dy);
    //                ^^^^^^^^^^^^^^^^^^
    //                Computes sqrt(dx*dx + dy*dy) safely without overflow/underflow

    double desired_yaw = std::atan2(dy, dx);
    //                   ^^^^^^^^^^^^^^^^^^
    //                   CRITICAL: dy is FIRST, dx is SECOND! Quadrant II -> +135 deg

    double steering_error = shortest_angular_distance(robot_yaw, desired_yaw);

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Distance to target : " << distance << " m\n";
    std::cout << "Desired heading    : " << rad_to_deg(desired_yaw) << " deg\n";
    std::cout << "Shortest turn      : " << rad_to_deg(steering_error) << " deg\n";
    return 0;
}
```

**What's happening:**
- **`std::hypot(dx, dy)`**: Computes $\sqrt{\Delta x^2 + \Delta y^2}$ cleanly and protects against floating-point overflow if coordinates are huge or very tiny.
- **`std::atan2(dy, dx)`**: Since $\Delta x = -3.0$ and $\Delta y = +3.0$, we are in **Quadrant II** (back-left). `std::atan(dy/dx)` would have computed $\arctan(-1.0) = -45^\circ$ (Quadrant IV, completely wrong!), whereas `std::atan2(+3.0, -3.0)` inspects both signs and outputs $+2.3562\text{ rad}$ ($+135^\circ$).
- **`shortest_angular_distance(robot_yaw, desired_yaw)`**: Subtracts $135^\circ - 179^\circ = -44^\circ$ ($-0.7679\text{ rad}$) and wraps it into $(-\pi, \pi]$, telling the controller to turn $44^\circ$ clockwise.

### 6.2 Python Implementation

```python
import math

def wrap_to_pi(angle_rad: float) -> float:
    return math.atan2(math.sin(angle_rad), math.cos(angle_rad))
    #      ^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
    #      Maps any arbitrary angle onto the unit circle, then extracts (-pi, pi]

def shortest_angular_distance(current_rad: float, target_rad: float) -> float:
    return wrap_to_pi(target_rad - current_rad)
    #                 ^^^^^^^^^^^^^^^^^^^^^^^^
    #                 Always wrap angular differences BEFORE feeding to a PID controller!

# Demonstration of the +/- 180 deg seam crossing:
current_heading = math.radians(179.0)   # +3.1241 rad
target_heading  = math.radians(-179.0)  # -3.1241 rad

naive_error = target_heading - current_heading
#             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#             -3.1241 - 3.1241 = -6.2483 rad (-358.0 deg -> catastrophic spin!)

wrapped_error = shortest_angular_distance(current_heading, target_heading)
#               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#               +0.0349 rad (+2.0 deg -> gentle 2-degree left nudge across the seam!)

print(f"Naive error   : {math.degrees(naive_error):+7.2f} deg ({naive_error:+.4f} rad)")
print(f"Wrapped error : {math.degrees(wrapped_error):+7.2f} deg ({wrapped_error:+.4f} rad)")
```

---

## 7. Step-by-Step Dry Run with Concrete Numbers

Let's trace `shortest_angular_distance(current_rad, target_rad)` across four classic scenarios that every mobile robot encounters:

| Scenario | `current` ($^\circ$ / $\text{rad}$) | `target` ($^\circ$ / $\text{rad}$) | Raw Diff $\Delta\theta = \text{target} - \text{current}$ | $\cos(\Delta\theta)$ | $\sin(\Delta\theta)$ | `atan2(sin, cos)` Output | Physical Robot Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Normal Left Turn** | $10^\circ$ ($+0.1745$) | $50^\circ$ ($+0.8727$) | $+40^\circ$ ($+0.6981\text{ rad}$) | $+0.7660$ | $+0.6428$ | **$+0.6981\text{ rad}$ ($+40^\circ$)** | Turn $40^\circ$ CCW (Left) |
| **2. Crossing $+\pi \to -\pi$** | $+179^\circ$ ($+3.1241$) | $-179^\circ$ ($-3.1241$) | $-358^\circ$ ($-6.2483\text{ rad}$) | $+0.9994$ | $+0.0349$ | **$+0.0349\text{ rad}$ ($+2^\circ$)** | Turn $2^\circ$ CCW (Left) |
| **3. Crossing $-\pi \to +\pi$** | $-175^\circ$ ($-3.0543$) | $+175^\circ$ ($+3.0543$) | $+350^\circ$ ($+6.1087\text{ rad}$) | $+0.9848$ | $-0.1736$ | **$-0.1745\text{ rad}$ ($-10^\circ$)** | Turn $10^\circ$ CW (Right) |
| **4. Multi-Turn Odometry** | $720^\circ$ ($+12.5664$) | $45^\circ$ ($+0.7854$) | $-675^\circ$ ($-11.7810\text{ rad}$) | $+0.7071$ | $+0.7071$ | **$+0.7854\text{ rad}$ ($+45^\circ$)** | Turn $45^\circ$ CCW (Left) |

Look closely at **Scenario 2**:
1. `target_rad - current_rad` produces $\Delta\theta = -6.2483\text{ rad}$ ($-358^\circ$).
2. $\cos(-6.2483) = +0.9994$ (positive $X$, almost $1$).
3. $\sin(-6.2483) = +0.0349$ (slightly positive $Y$, Quadrant I!).
4. `atan2(+0.0349, +0.9994)` immediately recognizes a point in Quadrant I just $2^\circ$ above the $+X$ axis and returns $+0.0349\text{ rad}$ ($+2^\circ$).

---

## 8. Common Mistakes & How to Fix Them

### Mistake 1: Passing `(x, y)` Instead of `(y, x)` to `atan2`
- **Symptom**: Your robot drives toward $(+X, +Y)$ properly when the angle is $45^\circ$, but when the target is straight ahead at $(x=5, y=0)$, `atan2(x, y)` computes `atan2(5, 0) = +90 deg` and the robot turns sideways!
- **Fix**: Always remember **Y-first, X-second**: `std::atan2(dy, dx)` / `math.atan2(dy, dx)`. Think of the slope rise-over-run ($\frac{\Delta y}{\Delta x}$).

### Mistake 2: Averaging Angles by Naive Arithmetic Mean
- **Symptom**: Two sensors report the robot's heading as $+179^\circ$ and $-179^\circ$. You average them as $\frac{179 + (-179)}{2} = 0^\circ$, and your robot thinks it is facing **forward** ($0^\circ$) when it is actually facing **backward** ($180^\circ$)!
- **Fix**: Never average angles with $(\theta_1 + \theta_2)/2$. Either convert each angle $\theta_i$ to a unit vector $(\cos\theta_i, \sin\theta_i)$ and compute `atan2(mean_sin, mean_cos)`, or compute $\text{wrap\_to\_pi}(\theta_1 + 0.5 \cdot \text{wrap\_to\_pi}(\theta_2 - \theta_1))$.

### Mistake 3: Feeding Degrees into `std::sin`, `std::cos`, or Wheel Odometry
- **Symptom**: You write `double x = r * std::cos(90.0);` expecting `0.0`, and get `-0.448 * r` instead.
- **Fix**: Every standard library math function in C++, Python, Rust, and ROS operates strictly in **radians**. Keep all internal state variables in radians (`_rad` suffix helps!) and only convert to degrees when printing logs for humans.

---

## 9. Quick Reference Summary

| Task / Concept | Formula / Code | Notes & Range |
| :--- | :--- | :--- |
| **ROS Body Frame (REP-103)** | $+X$ Forward, $+Y$ Left, $+Z$ Up | Right-Hand Rule; $+\theta$ is Counter-Clockwise (Left) |
| **Arc Length & Wheel Velocity** | $s = r\theta$, $\quad v = r\omega$ | Valid **only** when $\theta$ is in $\text{rad}$ and $\omega$ in $\text{rad/s}$ |
| **Degrees $\leftrightarrow$ Radians** | $\theta_{\text{rad}} = \theta_{\text{deg}} \frac{\pi}{180}, \quad \theta_{\text{deg}} = \theta_{\text{rad}} \frac{180}{\pi}$ | $\pi\text{ rad} = 180^\circ$, $\quad 2\pi\text{ rad} = 360^\circ$ |
| **Polar $\to$ Cartesian** | $x = r\cos\theta, \quad y = r\sin\theta$ | Projects distance $r$ onto $X$ and $Y$ axes |
| **Cartesian $\to$ Polar** | $r = \operatorname{hypot}(x, y), \quad \theta = \operatorname{atan2}(y, x)$ | **Notice `y` first!** Output $\theta \in (-\pi, +\pi]$ |
| **Pythagorean Identity** | $\cos^2\theta + \sin^2\theta = 1$ | Holds for every real angle $\theta$ |
| **Wrap Angle to $(-\pi, +\pi]$** | $\operatorname{atan2}(\sin\theta, \cos\theta)$ | Essential after any angle addition or subtraction |
| **Circular Mean of $\theta_1 \dots \theta_n$** | $\operatorname{atan2}\!\left(\sum \sin\theta_i,\, \sum \cos\theta_i\right)$ | Safely averages angles across the $\pm\pi$ seam |

---

## Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Interactive Artifact Builder):** Build an interactive, split-screen pedagogical visualization for this chapter using **`shadcn/ui` components** (`<Card>`, `<Tabs>`, `<Slider>`, `<Switch>`, `<Select>`, `<Button>`, `<Badge>`, `<Table>`, `<Tooltip>`) and Tailwind CSS—**no raw unstyled HTML `<input>` or `<select>` elements**.

### Component Architecture & Tabs (`<Tabs defaultValue="unit-circle">`)

#### Tab 1: `"unit-circle"` — Interactive Robotics Unit Circle & `atan` vs. `atan2` Comparator
1. **Left Panel (2D Interactive SVG Canvas inside `<Card>`)**:
   - Render a clean dark-mode coordinate grid with **Robotics Frame Option** (toggleable via `<Switch>` between *"Standard Math Grid ($+X$ Right, $+Y$ Up)"* and *"Top-Down Robot View ($+X$ Up/Forward, $+Y$ Left)"*).
   - Draw the Unit Circle, the current target point $P = (r\cos\theta, r\sin\theta)$ (draggable with mouse/touch), the horizontal shadow $\cos\theta$ in **Emerald (`#10b981`)**, the vertical height $\sin\theta$ in **Sky Blue (`#38bdf8`)**, and the angle arc $\theta$ in **Amber (`#f59e0b`)**.
   - **Ghost Failure Vector**: When `<Switch id="show-broken-atan">` is enabled, render a dashed **Red (`#ef4444`)** arrow showing where naive $\arctan(y/x)$ points! In Quadrants II and III ($x < 0$), highlight a pulsing `<Badge variant="destructive">180° Quadrant Error!</Badge>` as the red arrow points in the exact opposite direction of the target.
2. **Right Panel (Controls & Live Readouts inside `<Card>`)**:
   - `<Slider>` for Angle $\theta$ (`min={-360}`, `max={360}`, `step={1}`) and `<Slider>` for Radius $r$ (`min={0.5}`, `max={2.0}`, `step={0.1}`).
   - Preset buttons using `<Button variant="outline" size="sm">`: `Quadrant I (+45°)`, `Quadrant II (+135°)`, `Quadrant III (-135°)`, `Divide-by-Zero (+90°, x=0)`.
   - Live `<Table>` comparing `x`, `y`, `y / x`, broken `atan(y / x)`, and 4-quadrant `atan2(y, x)` in both radians and degrees.

#### Tab 2: `"angle-wrapping"` — The $\pm\pi$ Seam & Steering Controller Simulator
1. **Left Panel (Dual Robot Arena Canvas inside `<Card>`)**:
   - Side-by-side comparison of two robots: **Robot A (Naive Subtraction $\theta_{\text{target}} - \theta_{\text{curr}}$)** vs. **Robot B (`wrap_to_pi` Shortest Distance)**.
   - Draggable Current Heading arrow ($\theta_{\text{curr}}$) and Target Heading arrow ($\theta_{\text{target}}$) with the $\pm\pi$ ($\pm 180^\circ$) branch cut highlighted as a glowing magenta seam.
2. **Right Panel (Controls & Telemetry inside `<Card>`)**:
   - `<Slider>` for $\theta_{\text{curr}}$ (`-180°` to `+180°`), `<Slider>` for $\theta_{\text{target}}$ (`-180°` to `+180°`), and a `<Button variant="default">Load ±179° Seam Trap</Button>` preset that sets $\theta_{\text{curr}} = +179^\circ$ and $\theta_{\text{target}} = -179^\circ$.
   - `<Button>` to animate the turn: Robot A spins $358^\circ$ the wrong way while a cable-twist counter increments in red; Robot B smoothly steps $+2^\circ$ across the seam.
   - Step-by-step live formula inspector with `<Tooltip>` explanations on `sin(Δθ)`, `cos(Δθ)`, and `atan2(sin(Δθ), cos(Δθ))`.
