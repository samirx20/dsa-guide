# Part 1, Topic 1: Angles, Trigonometry & Vectors From Zero
## Chapter 2: Vectors, Dot Products (Projection) & Cross Products (Torque & Steering)

---

## Why This Matters in Robotics

In Chapter 1, we used coordinates $(x, y)$ to describe a single location on a warehouse floor. Truly autonomous robots, however, deal with quantities that have both **magnitude (size)** and **direction**:
- *"Drive toward the charging dock at $1.5\text{ m/s}$."* (Velocity vector)
- *"Is that pedestrian in front of my LiDAR or behind me?"* (Dot product test)
- *"How far has the robot drifted sideways off the planned path lane?"* (Vector projection)
- *"Should I steer left or right to align my heading with the waypoint, and how much torque will my robotic arm's shoulder motor experience when lifting a $5\text{ kg}$ payload?"* (Cross product)

If you write raw trigonometry (`sin`, `cos`, `acos`, `atan2` with nested `if/else` quadrant checks) for every geometric question, your codebase quickly turns into an unreadable, slow, bug-ridden mess. **Vectors**, along with their two superpower operations—the **Dot Product** ($\mathbf{a}\cdot\mathbf{b}$) and the **Cross Product** ($\mathbf{a}\times\mathbf{b}$)—let you answer these questions in two or three multiplications without a single trigonometric call!

In this chapter, we start from zero: what a vector actually is, how to add, subtract, and normalize vectors, and how the Dot Product and Cross Product work geometrically and algebraically in both 2D and 3D.

---

## 1. What Is a Vector? (Two Complementary Views)

### 1.1 Physics View vs. Computer Science View

Depending on who you ask, you will hear two definitions of a vector:
1. **The Geometric / Physics View**: A vector is an **arrow in space** that has a **length (magnitude)** and a **direction**. Crucially, a free vector does not care *where* its tail is placed—stepping $3\text{ m}$ forward and $2\text{ m}$ left is the exact same displacement arrow whether you start in the kitchen or the garage.
2. **The Computer Science View**: A vector is an **ordered column of numbers** (coordinates) that tells you how far to walk along each axis from the arrow's tail to its tip:

$$\mathbf{v} = \begin{bmatrix} v_x \\ v_y \end{bmatrix} \quad (\text{in 2D}), \qquad \mathbf{v} = \begin{bmatrix} v_x \\ v_y \\ v_z \end{bmatrix} \quad (\text{in 3D})$$

> [!NOTE]
> **Notation Convention:** In robotics textbooks and papers, **scalars** (single numbers like temperature, mass, or speed $s = 2.5$) are written in lowercase italics ($a, b, \theta$), while **vectors** are written in **bold lowercase** ($\mathbf{v}, \mathbf{p}, \mathbf{f}$) or with an arrow on top ($\vec{v}$). We write vectors vertically as **column vectors** because, as we will see in Topic 2, matrices multiply vectors on the left ($\mathbf{A}\mathbf{v}$). To save vertical space in prose, we sometimes write $\mathbf{v} = [v_x, v_y]^T$, where $^T$ (Transpose) turns a row into a column.

### 1.2 Position Vectors vs. Free (Displacement/Velocity) Vectors

We use vectors for two slightly different roles in robotics:
- **Position Vector ($\mathbf{p}$)**: An arrow whose tail is pinned to the **Origin $(0, 0)$** and whose tip points to a specific location in space, like the robot's current pose $\mathbf{p}_{\text{robot}} = [2, 1]^T$.
- **Displacement / Velocity / Force Vector ($\mathbf{d}, \mathbf{v}, \mathbf{F}$)**: A free arrow representing a step, a velocity, or a push between two points.

---

## 2. Vector Addition, Scaling & The "Target Minus Robot" Rule

### 2.1 Vector Addition (Tip-to-Tail)

Suppose your robot starts at the origin, drives along displacement $\mathbf{a} = [3, 1]^T$, and then drives along a second displacement $\mathbf{b} = [1, 4]^T$. What is the total net displacement $\mathbf{c} = \mathbf{a} + \mathbf{b}$?

Geometrically, you place the **tail of $\mathbf{b}$ at the tip of $\mathbf{a}$**. Algebraically, you simply add the matching components:

$$\mathbf{a} + \mathbf{b} = \begin{bmatrix} a_x \\ a_y \end{bmatrix} + \begin{bmatrix} b_x \\ b_y \end{bmatrix} = \begin{bmatrix} a_x + b_x \\ a_y + b_y \end{bmatrix} = \begin{bmatrix} 3 + 1 \\ 1 + 4 \end{bmatrix} = \begin{bmatrix} 4 \\ 5 \end{bmatrix}$$

```
      +Y
       ^
     5 | . . . . . . . . * Tip of (a + b) = [4, 5]
       |               / ^
     4 |             /   |
       |           /     | b = [1, 4] (Tail of b placed at tip of a)
     3 |         /       |
       |       /  a + b  |
     2 |     /           |
       |   /             * Tip of a = [3, 1]
     1 | /     a = [3, 1]
       *-------------------------> +X
     (0,0)   1     2     3     4
```

### 2.2 Scalar Multiplication (Stretching and Flipping)

Multiplying a vector $\mathbf{v}$ by a single number (a **scalar** $k$) stretches or shrinks the arrow without changing its line of action (unless $k < 0$, which reverses its direction $180^\circ$):

$$k\mathbf{v} = k\begin{bmatrix} v_x \\ v_y \end{bmatrix} = \begin{bmatrix} k v_x \\ k v_y \end{bmatrix}$$

- $2\mathbf{v}$: Same direction, **twice** as long.
- $0.5\mathbf{v}$: Same direction, **half** as long.
- $-\mathbf{v}$: Exact same length, pointing in the **opposite** direction.

### 2.3 Vector Subtraction: "Target Minus Source" ($\mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{robot}}$)

This is the single most used vector equation in navigation and game programming.
Suppose your robot is at position $\mathbf{p}_{\text{robot}} = [2, 1]^T$ and wants to reach a goal at $\mathbf{p}_{\text{target}} = [6, 4]^T$. What displacement vector $\mathbf{d}$ points **from the robot to the target**?

Think tip-to-tail: starting at $\mathbf{p}_{\text{robot}}$ and adding $\mathbf{d}$ must land us at $\mathbf{p}_{\text{target}}$:

$$\mathbf{p}_{\text{robot}} + \mathbf{d} = \mathbf{p}_{\text{target}} \quad \Longleftrightarrow \quad \mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{robot}}$$

```
      +Y
       ^
     4 | . . . . . . . . . . . . * p_target = [6, 4]
       |                       / ^
     3 |      d = p_target     /  |
       |        - p_robot    /   |
     2 |        = [4, 3]   /     | p_target
       |                 /       |
     1 | . . . *-------+         |
       |     /  p_robot = [2, 1] |
       *-------------------------+---> +X
     (0,0)     2       4         6
```

Let's plug in the numbers:

$$\mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{robot}} = \begin{bmatrix} 6 \\ 4 \end{bmatrix} - \begin{bmatrix} 2 \\ 1 \end{bmatrix} = \begin{bmatrix} 6 - 2 \\ 4 - 1 \end{bmatrix} = \begin{bmatrix} 4 \\ 3 \end{bmatrix}$$

> [!TIP]
> **Memory Rule: "Tip Minus Tail" (Target Minus Source)**
> To build a vector pointing **from $A$ to $B$**, always compute $\mathbf{B} - \mathbf{A}$ (*Destination minus Origin*, or *Target minus Robot*). If you accidentally compute $\mathbf{A} - \mathbf{B}$, your robot will flee directly *away* from the target!

---

## 3. Magnitude (Norm) & Unit Vectors (Normalization)

### 3.1 Euclidean Magnitude $\|\mathbf{v}\|$

How long is the displacement vector $\mathbf{d} = [4, 3]^T$ we just computed?
By the Pythagorean theorem, the length—called the **magnitude** or **Euclidean norm** and written with double vertical bars $\|\mathbf{d}\|$—is:

$$\|\mathbf{d}\| = \sqrt{d_x^2 + d_y^2} = \sqrt{4^2 + 3^2} = \sqrt{16 + 9} = \sqrt{25} = 5.0\text{ m}$$

In 3D, you simply include the $z$-component under the square root:

$$\|\mathbf{v}\| = \sqrt{v_x^2 + v_y^2 + v_z^2}$$

### 3.2 Unit Vectors ($\hat{\mathbf{v}}$): Pure Direction

Often we want to separate *how far* something is from *which way* it is pointing. For example, our robot is $5.0\text{ m}$ away from the target along $\mathbf{d} = [4, 3]^T$, and its maximum allowed speed is $v_{\max} = 1.5\text{ m/s}$. How do we create a velocity vector $\mathbf{v}_{\text{cmd}}$ that points toward the target with speed $1.5\text{ m/s}$?

First, we shrink (or stretch) $\mathbf{d}$ so its length is exactly **$1.0$**. A vector of length $1$ is called a **Unit Vector** and is written with a little hat ($\hat{\mathbf{d}}$, read *"d-hat"*).
To turn any non-zero vector into a unit vector—an operation called **normalization**—simply divide the vector by its own length:

$$\hat{\mathbf{d}} = \frac{\mathbf{d}}{\|\mathbf{d}\|} = \begin{bmatrix} d_x / \|\mathbf{d}\| \\ d_y / \|\mathbf{d}\| \end{bmatrix} = \begin{bmatrix} 4 / 5 \\ 3 / 5 \end{bmatrix} = \begin{bmatrix} 0.8 \\ 0.6 \end{bmatrix}$$

Let's verify that $\hat{\mathbf{d}}$ has length $1$:

$$\|\hat{\mathbf{d}}\| = \sqrt{0.8^2 + 0.6^2} = \sqrt{0.64 + 0.36} = \sqrt{1.00} = 1.0$$

Notice also that on the Unit Circle from Chapter 1, any 2D unit vector at angle $\theta$ is simply:

$$\hat{\mathbf{u}}(\theta) = \begin{bmatrix} \cos\theta \\ \sin\theta \end{bmatrix}$$

Now, to command a velocity of $1.5\text{ m/s}$ toward the target, we just multiply the unit direction vector $\hat{\mathbf{d}}$ by our desired speed scalar $1.5$:

$$\mathbf{v}_{\text{cmd}} = v_{\max}\,\hat{\mathbf{d}} = 1.5 \begin{bmatrix} 0.8 \\ 0.6 \end{bmatrix} = \begin{bmatrix} 1.2\text{ m/s} \\ 0.9\text{ m/s} \end{bmatrix}$$

> [!CAUTION]
> **Always Guard Against Zero-Length Normalization!**
> What happens when the robot reaches the target ($\mathbf{p}_{\text{robot}} = \mathbf{p}_{\text{target}}$)? Then $\mathbf{d} = [0, 0]^T$ and $\|\mathbf{d}\| = 0$. Dividing by $\|\mathbf{d}\|$ divides $0 / 0$, producing `NaN` (Not-a-Number) that silently infects your entire control loop! Always check `if (norm > 1e-9)` before dividing.

---

## 4. The Dot Product ($\mathbf{a} \cdot \mathbf{b}$): Alignment, Shadows & Projections

### 4.1 One Operation, Two Equivalent Formulas

The **Dot Product** (also called the **inner product** or **scalar product**) takes two vectors $\mathbf{a}$ and $\mathbf{b}$ and combines them into a **single scalar number**.

Why is it miraculous? Because there is a super-fast **algebraic formula** (just multiply matching coordinates and add) and a deep **geometric formula** (involving $\cos\theta$), and **they always give the exact same number**:

$$\underbrace{\mathbf{a} \cdot \mathbf{b} = a_x b_x + a_y b_y (+ a_z b_z)}_{\text{Algebraic Formula (2 multiplies, 1 add)}} \;=\; \underbrace{\|\mathbf{a}\| \|\mathbf{b}\| \cos\theta}_{\text{Geometric Meaning}}$$

where $\theta$ is the angle between $\mathbf{a}$ and $\mathbf{b}$ ($0 \le \theta \le \pi$).

### 4.2 Geometric Intuition: Shining a Flashlight (Projection)

What does $\|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$ actually mean?
Suppose $\hat{\mathbf{b}}$ is a **unit vector** ($\|\hat{\mathbf{b}}\| = 1$), such as the robot's forward heading vector $\hat{\mathbf{h}} = [\cos\psi, \sin\psi]^T$. Then the dot product simplifies to:

$$\mathbf{a} \cdot \hat{\mathbf{b}} = \|\mathbf{a}\| (1) \cos\theta = \|\mathbf{a}\|\cos\theta$$

Look at the diagram below. Imagine shining a flashlight straight down (perpendicularly) onto the line of $\hat{\mathbf{b}}$. The length of the **shadow** that vector $\mathbf{a}$ casts onto $\hat{\mathbf{b}}$ is literally $\|\mathbf{a}\|\cos\theta = \mathbf{a} \cdot \hat{\mathbf{b}}$!

```
               |  |  |  |  |  <-- Flashlight shining perpendicular to b_hat
               v  v  v  v  v
                     * Tip of a
                    /|
                   / |
             ||a||/  |
                 /   |
                /    |
               /theta|
              *------+--------------> b_hat (unit vector, ||b_hat|| = 1)
              |<---->|
                 ^-- Signed shadow length = ||a|| cos(theta) = a . b_hat
```

### 4.3 The Sign of the Dot Product: Instant Front / Side / Behind Test

Because $\|\mathbf{a}\| > 0$ and $\|\mathbf{b}\| > 0$, the sign of $\mathbf{a} \cdot \mathbf{b}$ is controlled entirely by $\cos\theta$:

1. **$\mathbf{a} \cdot \mathbf{b} > 0$ ($\theta < 90^\circ$, Acute Angle)**: The vectors point in **roughly the same direction**. (If $\hat{\mathbf{h}}$ is the robot's forward heading and $\mathbf{d}$ is the vector to an obstacle, $\hat{\mathbf{h}} \cdot \mathbf{d} > 0$ means the obstacle is **in front of** the robot!)
2. **$\mathbf{a} \cdot \mathbf{b} = 0$ ($\theta = 90^\circ$, Orthogonal / Perpendicular)**: The vectors are at a **$90^\circ$ right angle** to each other. No shadow is cast!
3. **$\mathbf{a} \cdot \mathbf{b} < 0$ ($\theta > 90^\circ$, Obtuse Angle)**: The vectors point in **roughly opposite directions**. ($\hat{\mathbf{h}} \cdot \mathbf{d} < 0$ means the obstacle is **behind** the robot!)

```
                  Obstacle IN BEHIND                  |                  Obstacle IN FRONT
                    h_hat . d < 0                     |                    h_hat . d > 0
                  (90 deg < theta <= 180 deg)         |                  (0 <= theta < 90 deg)
                                                      |
                        \                             |                             /
                         \  d                         |                         d  /
                          \                           |                           /
                           \      theta > 90          |     theta < 90           /
                            *-------------------------+-------------------------*----> h_hat (Robot Nose)
                                                      |
                                                      ^
                                            Obstacle DIRECTLY ABEAM
                                                h_hat . d = 0
                                                (theta = 90 deg)
```

### 4.4 Three Practical Robotics Recipes with the Dot Product

1. **Camera Field-of-View (FOV) Check (Without `acos`!)**:
   Suppose a camera has a total horizontal FOV of $90^\circ$ ($45^\circ$ left to $45^\circ$ right of the camera's forward unit vector $\hat{\mathbf{c}}$). Is a landmark at unit direction $\hat{\mathbf{d}}$ inside the camera's FOV?
   Since $\cos\theta = \hat{\mathbf{c}} \cdot \hat{\mathbf{d}}$, and $\cos(45^\circ) = 0.7071$, the landmark is inside the $90^\circ$ cone if and only if:
   $$\hat{\mathbf{c}} \cdot \hat{\mathbf{d}} \ge \cos(45^\circ) \approx 0.7071$$
   Zero trig calls at runtime—just two multiplications and an addition!

2. **Along-Track & Cross-Track Path Projection**:
   Suppose a warehouse robot is following a straight path segment starting at $\mathbf{p}_{\text{start}}$ in unit direction $\hat{\mathbf{t}}$. If the robot is currently at $\mathbf{p}_{\text{robot}}$, let $\mathbf{e} = \mathbf{p}_{\text{robot}} - \mathbf{p}_{\text{start}}$.
   - How far **along** the path has the robot progressed? That's the scalar projection $s_{\text{along}} = \mathbf{e} \cdot \hat{\mathbf{t}}$.
   - What is the closest point on the path line to the robot? $\mathbf{p}_{\text{proj}} = \mathbf{p}_{\text{start}} + (\mathbf{e} \cdot \hat{\mathbf{t}})\hat{\mathbf{t}}$.

3. **Finding the Unsigned Angle Between Two Vectors**:
   $$\theta = \arccos\!\left(\operatorname{clamp}\!\left(\frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\|\|\mathbf{b}\|},\; -1.0,\; +1.0\right)\right)$$
   *(Note: Always clamp the ratio to $[-1.0, +1.0]$ because tiny floating-point rounding like $1.0000000000000002$ will make `std::acos` return `NaN`!)*

---

## 5. The Cross Product ($\mathbf{a} \times \mathbf{b}$): Torque, Normals & Signed Steering

### 5.1 Why the Dot Product Alone Isn't Enough for Steering

Look closely at $\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$.
Because $\cos(-30^\circ) = \cos(+30^\circ) = +0.8660$, the dot product is **symmetric** ($\mathbf{a}\cdot\mathbf{b} = \mathbf{b}\cdot\mathbf{a}$). It can tell you that the target is $30^\circ$ off your nose, **but it cannot tell you whether the target is $30^\circ$ to your LEFT or $30^\circ$ to your RIGHT!**

To know left vs. right (and to compute 3D rotational torque and surface normal vectors), we need the companion operation that uses $\sin\theta$ instead of $\cos\theta$: the **Cross Product** ($\mathbf{a} \times \mathbf{b}$).

### 5.2 The 3D Cross Product & Right-Hand Rule

In 3D, the cross product $\mathbf{a} \times \mathbf{b}$ produces a **new 3D vector** that is **perpendicular to both $\mathbf{a}$ and $\mathbf{b}$**:

$$\mathbf{a} \times \mathbf{b} = \begin{bmatrix} a_x \\ a_y \\ a_z \end{bmatrix} \times \begin{bmatrix} b_x \\ b_y \\ b_z \end{bmatrix} = \begin{bmatrix} a_y b_z - a_z b_y \\ a_z b_x - a_x b_z \\ a_x b_y - a_y b_x \end{bmatrix}$$

- **Magnitude of $\mathbf{a} \times \mathbf{b}$**:
  $$\|\mathbf{a} \times \mathbf{b}\| = \|\mathbf{a}\|\|\mathbf{b}\|\sin\theta$$
  Geometrically, $\|\mathbf{a} \times \mathbf{b}\|$ equals the **area of the parallelogram** spanned by $\mathbf{a}$ and $\mathbf{b}$! When $\mathbf{a}$ and $\mathbf{b}$ are parallel ($\theta = 0^\circ$ or $180^\circ$), $\sin\theta = 0$, so $\mathbf{a} \times \mathbf{b} = \mathbf{0}$.
- **Direction of $\mathbf{a} \times \mathbf{b}$ (Right-Hand Rule)**:
  Point the fingers of your right hand along the first vector $\mathbf{a}$, then curl them toward the second vector $\mathbf{b}$ along the smaller angle. Your **thumb** points in the direction of $\mathbf{a} \times \mathbf{b}$!
  Notice that if you swap the order ($\mathbf{b} \times \mathbf{a}$), your thumb points in the **opposite** direction (**anti-commutative**: $\mathbf{b} \times \mathbf{a} = -(\mathbf{a} \times \mathbf{b})$).

```
                    a x b  (Thumb points UP along +Z when b is to the LEFT of a)
                      ^
                      |
                      |        * b
                      |       / .
                      |      /    .  Parallelogram Area = ||a|| ||b|| sin(theta)
                      |     /       .
                      |    / theta   .
                      *---/-----------*----> a
```

### 5.3 Mechanical Torque on a Robot Joint ($\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F}$)

Suppose a 1-link robot arm of length $0.5\text{ m}$ extends straight out along $+X$: lever arm $\mathbf{r} = [0.5, 0, 0]^T\text{ m}$. A payload hangs at the tip, pulling straight down along $-Z$ with gravity force $\mathbf{F} = [0, 0, -50]^T\text{ N}$. What torque $\boldsymbol{\tau}$ must the shoulder motor resist?

$$\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F} = \begin{bmatrix} 0.5 \\ 0 \\ 0 \end{bmatrix} \times \begin{bmatrix} 0 \\ 0 \\ -50 \end{bmatrix} = \begin{bmatrix} (0)(-50) - (0)(0) \\ (0)(0) - (0.5)(-50) \\ (0.5)(0) - (0)(0) \end{bmatrix} = \begin{bmatrix} 0 \\ +25.0 \\ 0 \end{bmatrix}\text{ N}\cdot\text{m}$$

The torque vector is $+25\text{ N}\cdot\text{m}$ around the **$+Y$ (Pitch) axis**!

### 5.4 The 2D Cross Product ("Wedge Product") & Signed Steering Angle

What if our vectors $\mathbf{a} = [a_x, a_y, 0]^T$ and $\mathbf{b} = [b_x, b_y, 0]^T$ live flat on the 2D floor ($z = 0$)?
Look back at the 3D cross product formula when $a_z = 0$ and $b_z = 0$: the $x$ and $y$ components become $0$, and only the **$z$-component** survives!

$$\mathbf{a} \times_{\text{2D}} \mathbf{b} = a_x b_y - a_y b_x = \|\mathbf{a}\|\|\mathbf{b}\|\sin\theta$$

Look at what we have now for any two 2D vectors $\mathbf{a}$ (e.g., robot heading) and $\mathbf{b}$ (e.g., vector to target):
- **2D Cross Product**: $\mathbf{a} \times_{\text{2D}} \mathbf{b} = a_x b_y - a_y b_x = \|\mathbf{a}\|\|\mathbf{b}\|\sin\theta$
  - **Positive ($> 0$)** $\implies$ $\mathbf{b}$ is to the **LEFT** (CCW) of $\mathbf{a}$!
  - **Negative ($< 0$)** $\implies$ $\mathbf{b}$ is to the **RIGHT** (CW) of $\mathbf{a}$!
- **2D Dot Product**: $\mathbf{a} \cdot \mathbf{b} = a_x b_x + a_y b_y = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$

If we feed $(\mathbf{a} \times_{\text{2D}} \mathbf{b})$ as $y$ and $(\mathbf{a} \cdot \mathbf{b})$ as $x$ into `atan2(y, x)`, the magnitudes $\|\mathbf{a}\|\|\mathbf{b}\|$ cancel out and we get the **exact signed angle $\theta \in (-\pi, +\pi]$ from vector $\mathbf{a}$ to vector $\mathbf{b}$** in one clean line—with **no angle wrapping required**!

$$\theta_{\text{from }\mathbf{a}\text{ to }\mathbf{b}} = \operatorname{atan2}(\mathbf{a} \times_{\text{2D}} \mathbf{b},\; \mathbf{a} \cdot \mathbf{b}) = \operatorname{atan2}(a_x b_y - a_y b_x,\; a_x b_x + a_y b_y)$$

---

## 6. Annotated Code Implementation (C++ & Python)

### 6.1 C++17 Implementation

```cpp
#include <cmath>
#include <iostream>
#include <iomanip>

struct Vec2 {
    double x{0.0};
    double y{0.0};

    Vec2 operator+(const Vec2& rhs) const { return {x + rhs.x, y + rhs.y}; }
    Vec2 operator-(const Vec2& rhs) const { return {x - rhs.x, y - rhs.y}; }
    Vec2 operator*(double s) const        { return {x * s, y * s}; }

    double norm() const {
        return std::hypot(x, y);
        //     ^^^^^^^^^^^^^^^^
        //     Euclidean length ||v|| = sqrt(x^2 + y^2)
    }

    Vec2 normalized() const {
        double n = norm();
        return (n > 1e-9) ? Vec2{x / n, y / n} : Vec2{0.0, 0.0};
        //     ^^^^^^^^^^
        //     Guard against divide-by-zero when robot is already on the target!
    }
};

double dot(const Vec2& a, const Vec2& b) {
    return a.x * b.x + a.y * b.y;
    //     ^^^^^^^^^^^^^^^^^^^^^
    //     ||a|| ||b|| cos(theta): measures forward alignment / projection shadow
}

double cross2d(const Vec2& a, const Vec2& b) {
    return a.x * b.y - a.y * b.x;
    //     ^^^^^^^^^^^^^^^^^^^^^
    //     ||a|| ||b|| sin(theta): z-component of 3D cross product (+ = Left, - = Right)
}

double signed_angle_between(const Vec2& from, const Vec2& to) {
    return std::atan2(cross2d(from, to), dot(from, to));
    //                ^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^
    //                sin-term FIRST,    cos-term SECOND -> exact angle in (-pi, pi]!
}

int main() {
    Vec2 robot_pos{2.0, 1.0};
    Vec2 robot_heading{-1.0, 0.0}; // Facing -X (180 deg)
    Vec2 target_pos{-1.0, 4.0};

    Vec2 to_target = target_pos - robot_pos; // [-3.0, +3.0]
    double forward_proj = dot(robot_heading, to_target);
    double lateral_proj = cross2d(robot_heading, to_target);
    double steer_rad    = signed_angle_between(robot_heading, to_target);

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Forward distance (dot)   : " << forward_proj << " m (>0 means IN FRONT)\n";
    std::cout << "Lateral offset (cross2d) : " << lateral_proj << " m (<0 means to RIGHT)\n";
    std::cout << "Signed steering angle    : " << steer_rad * (180.0 / 3.141592653589793) << " deg\n";
    return 0;
}
```

**What's happening:**
- **`dot(robot_heading, to_target)`**: Since `robot_heading` is $\hat{\mathbf{h}} = [-1, 0]^T$ and `to_target` is $\mathbf{d} = [-3, 3]^T$, their dot product is $(-1)(-3) + (0)(3) = +3.0\text{ m}$. Even though the target has negative world $X$, it is $+3.0\text{ m}$ **in front of** the robot's nose!
- **`cross2d(robot_heading, to_target)`**: Computes $(-1)(3) - (0)(-3) = -3.0\text{ m}$. Because it is negative, the target is $3.0\text{ m}$ to the **right** of the robot's nose.
- **`signed_angle_between(robot_heading, to_target)`**: Computes `atan2(-3.0, +3.0) = -0.7854 rad` ($-45^\circ$), telling the robot to steer $45^\circ$ right.

### 6.2 Python Implementation (with `numpy`)

```python
import math
import numpy as np

def analyze_target_relative_to_robot(
    robot_pos: np.ndarray,
    robot_heading_rad: float,
    target_pos: np.ndarray
) -> dict:
    # 1. Build unit heading vector h_hat = [cos(psi), sin(psi)]
    h_hat = np.array([math.cos(robot_heading_rad), math.sin(robot_heading_rad)])
    #       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #       Unit vector (length = 1.0) pointing out the front of the robot

    # 2. Vector from robot to target: "Target minus Robot"
    d = target_pos - robot_pos
    #   ^^^^^^^^^^^^^^^^^^^^^^
    #   Tip minus Tail -> displacement arrow from robot to target

    # 3. Dot product = forward shadow; 2D Cross product = left/right shadow
    forward_dist = float(np.dot(h_hat, d))
    #                    ^^^^^^^^^^^^^^^^
    #                    h_x * d_x + h_y * d_y -> >0 in front, <0 behind

    lateral_left_dist = float(h_hat[0] * d[1] - h_hat[1] * d[0])
    #                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                         2D cross product -> >0 to left, <0 to right

    steer_angle_rad = math.atan2(lateral_left_dist, forward_dist)
    return {
        "distance_m": float(np.linalg.norm(d)),
        "forward_m": forward_dist,
        "left_m": lateral_left_dist,
        "steer_deg": math.degrees(steer_angle_rad),
    }

result = analyze_target_relative_to_robot(
    robot_pos=np.array([2.0, 1.0]),
    robot_heading_rad=math.pi, # Facing -X (180 deg)
    target_pos=np.array([-1.0, 4.0]),
)
print(result)
# {'distance_m': 4.2426, 'forward_m': 3.0, 'left_m': -3.0, 'steer_deg': -45.0}
```

---

## 7. Step-by-Step Dry Run: Dot & Cross Product Geometry Table

Suppose our robot is at $\mathbf{p}_{\text{robot}} = [0, 0]^T$ and facing $+X$, or rotated to a general unit heading $\hat{\mathbf{h}} = [h_x, h_y]^T$. Let's trace 4 cases with concrete numbers:

| Case | Robot Heading $\hat{\mathbf{h}}$ | Displacement $\mathbf{d}$ | Dot Product $\hat{\mathbf{h}} \cdot \mathbf{d} = h_x d_x + h_y d_y$ | 2D Cross $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d} = h_x d_y - h_y d_x$ | `atan2(cross, dot)` | Geometric Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Front-Left** | $[1.0, 0.0]^T$ ($0^\circ$) | $[3.0, 3.0]^T$ | $(1)(3)+(0)(3) = \mathbf{+3.0}$ | $(1)(3)-(0)(3) = \mathbf{+3.0}$ | $+45.0^\circ$ | $3\text{ m}$ ahead, $3\text{ m}$ left |
| **2. Pure Right** | $[1.0, 0.0]^T$ ($0^\circ$) | $[0.0, -4.0]^T$ | $(1)(0)+(0)(-4) = \mathbf{0.0}$ | $(1)(-4)-(0)(0) = \mathbf{-4.0}$ | $-90.0^\circ$ | Orthogonal ($90^\circ$ right) |
| **3. Behind-Left** | $[1.0, 0.0]^T$ ($0^\circ$) | $[-2.0, 2.0]^T$ | $(1)(-2)+(0)(2) = \mathbf{-2.0}$ | $(1)(2)-(0)(-2) = \mathbf{+2.0}$ | $+135.0^\circ$ | $2\text{ m}$ behind, $2\text{ m}$ left |
| **4. Rotated Robot** | $[0.6, 0.8]^T$ ($53.1^\circ$) | $[4.0, 3.0]^T$ | $(0.6)(4)+(0.8)(3) = \mathbf{+4.8}$ | $(0.6)(3)-(0.8)(4) = \mathbf{-1.4}$ | $-16.26^\circ$ | $4.8\text{ m}$ ahead, $1.4\text{ m}$ right |

Look at **Case 4** (`Rotated Robot`):
- Even though $\hat{\mathbf{h}} = [0.6, 0.8]^T$ is at an awkward angle ($53.13^\circ$) and the target is at $\mathbf{d} = [4, 3]^T$, we didn't need a single `sin` or `cos` to project the target into the robot's local frame!
- The dot product $\hat{\mathbf{h}} \cdot \mathbf{d} = +4.8\text{ m}$ directly gave the local forward coordinate ($x_{\text{local}} = 4.8\text{ m}$).
- The 2D cross product $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d} = -1.4\text{ m}$ directly gave the local left/right coordinate ($y_{\text{local}} = -1.4\text{ m}$)!
*(Foreshadowing: In Topic 2, we will see that stacking $\hat{\mathbf{h}} \cdot \mathbf{d}$ and $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d}$ into two rows is literally how a $2\times 2$ Rotation Matrix $\mathbf{R}^T$ works!)*

---

## 8. Common Mistakes & How to Fix Them

### Mistake 1: Reversing Subtraction ($\mathbf{p}_{\text{robot}} - \mathbf{p}_{\text{target}}$)
- **Symptom**: Your proportional controller drives the robot backward away from the goal as fast as possible.
- **Fix**: Remember **"Tip minus Tail" (Target minus Source)**: $\mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{robot}}$. Test your formula with $\mathbf{p}_{\text{robot}} = [0, 0]^T$—clearly $\mathbf{d}$ must equal $+\mathbf{p}_{\text{target}}$, not $-\mathbf{p}_{\text{target}}$.

### Mistake 2: Forgetting to Normalize Before Computing a Projection Distance
- **Symptom**: You compute the forward distance to an obstacle as `dot(velocity, d)` where `velocity` has magnitude $3.0\text{ m/s}$, and the reported distance is $3\times$ too large!
- **Fix**: The shadow formula $\text{shadow} = \mathbf{d} \cdot \hat{\mathbf{u}}$ requires $\hat{\mathbf{u}}$ to be a **unit vector** ($\|\hat{\mathbf{u}}\| = 1$). Always normalize the direction vector first!

### Mistake 3: Calling `std::acos(dot(a_hat, b_hat))` Without Clamping
- **Symptom**: When two unit vectors are nearly identical, floating-point inaccuracies occasionally produce `dot(a_hat, b_hat) = 1.0000000000000002`. Because $\arccos(x)$ is only defined on $[-1, 1]$, `std::acos` returns `NaN` and crashes your controller.
- **Fix**: Either clamp with `std::clamp(d, -1.0, 1.0)` before calling `acos`, or better yet, use `std::atan2(cross2d(a, b), dot(a, b))`, which never suffers from domain errors and gives you the sign too!

---

## 9. Quick Reference Summary

| Operation | Algebraic Formula | Geometric Formula / Meaning | Robotics Application |
| :--- | :--- | :--- | :--- |
| **Vector From $A$ to $B$** | $\mathbf{d} = \mathbf{b} - \mathbf{a}$ | Arrow from tail $\mathbf{a}$ to tip $\mathbf{b}$ | Displacement from robot to waypoint |
| **Magnitude (Norm)** | $\|\mathbf{v}\| = \sqrt{v_x^2 + v_y^2 + v_z^2}$ | Length of arrow | Euclidean distance to obstacle |
| **Unit Vector** | $\hat{\mathbf{v}} = \mathbf{v} / \|\mathbf{v}\|$ | Pure direction of length $1$ | Heading vector, raycasting direction |
| **Dot Product ($\mathbf{a}\cdot\mathbf{b}$)** | $a_x b_x + a_y b_y (+ a_z b_z)$ | $\|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$ (Shadow / Alignment) | Front/behind check, FOV cone, path projection |
| **2D Cross Product** | $a_x b_y - a_y b_x$ | $\|\mathbf{a}\|\|\mathbf{b}\|\sin\theta$ (Signed Area / Left-Right) | Steering sign ($+=$ Left, $-=$ Right), cross-track error |
| **3D Cross Product** | $[a_y b_z - a_z b_y,\; a_z b_x - a_x b_z,\; a_x b_y - a_y b_x]^T$ | Vector $\perp$ to $\mathbf{a},\mathbf{b}$ of length $\|\mathbf{a}\|\|\mathbf{b}\|\sin\theta$ | Joint torque $\boldsymbol{\tau} = \mathbf{r}\times\mathbf{F}$, surface normals |
| **Signed 2D Angle** | $\operatorname{atan2}(a_x b_y - a_y b_x,\; a_x b_x + a_y b_y)$ | Angle $\theta \in (-\pi, \pi]$ from $\mathbf{a}$ to $\mathbf{b}$ | Glitch-free heading error without angle-wrapping |

---

## Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Interactive Artifact Builder):** Build an interactive vector laboratory using **`shadcn/ui` components** (`<Card>`, `<Tabs>`, `<Slider>`, `<Switch>`, `<Select>`, `<Button>`, `<Badge>`, `<Table>`, `<Tooltip>`) and Tailwind CSS.

### Component Architecture & Tabs (`<Tabs defaultValue="dot-cross-sandbox">`)

#### Tab 1: `"dot-cross-sandbox"` — Interactive Dot Shadow & 2D Cross Parallelogram Explorer
1. **Left Panel (Interactive 2D SVG Vector Canvas inside `<Card>`)**:
   - Render a mobile robot at draggable position $\mathbf{p}_{\text{robot}}$ with draggable heading unit vector $\hat{\mathbf{h}}$ (**Emerald `#10b981`**) and a draggable target waypoint $\mathbf{p}_{\text{target}}$ connected by displacement vector $\mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{robot}}$ (**Sky Blue `#38bdf8`**).
   - **Live Dot Product Shadow**: Draw the perpendicular projection line from the tip of $\mathbf{d}$ onto the robot's heading axis $\hat{\mathbf{h}}$, highlighting the forward/backward shadow $\hat{\mathbf{h}} \cdot \mathbf{d}$ in **Amber (`#f59e0b`)**.
   - **Live 2D Cross Product Parallelogram & Lateral Bar**: Shade the parallelogram spanned by $\hat{\mathbf{h}}$ and $\mathbf{d}$ in translucent **Violet (`#8b5cf6` when Left / $>0$)** or **Rose (`#f43f5e` when Right / $<0$)**, showing that its signed area equals the lateral offset $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d}$.
   - Optional FOV Cone overlay toggled via `<Switch id="show-fov-cone">` with a `<Slider>` for FOV half-angle $\alpha \in [15^\circ, 90^\circ]$, testing $\hat{\mathbf{h}} \cdot \hat{\mathbf{d}} \ge \cos\alpha$.
2. **Right Panel (Telemetry & Controls inside `<Card>`)**:
   - Instant status badges using `<Badge>`:
     - Front/Behind badge: `IN FRONT (dot > 0)` (green), `ORTHOGONAL (dot = 0)` (amber), or `BEHIND (dot < 0)` (red).
     - Steering badge: `STEER LEFT (cross > 0)` (violet) or `STEER RIGHT (cross < 0)` (rose).
   - Preset scenario buttons (`<Button variant="outline" size="sm">`): `Front-Left (+45°)`, `Directly Abeam (-90°)`, `Behind-Left (+135°)`, `Path Cross-Track Projection`.
   - Live formula breakdown `<Table>` displaying $\mathbf{d}$, $\|\mathbf{d}\|$, $\hat{\mathbf{h}} \cdot \mathbf{d}$, $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d}$, and `atan2(cross, dot)`.

#### Tab 2: `"torque-3d"` — 3D Cross Product & Robotic Arm Torque ($\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F}$)
1. **Left Panel (Isometric 3D Canvas inside `<Card>`)**:
   - Render a 1-DOF robotic arm link vector $\mathbf{r}$ rotating in the $XZ$ or $XY$ plane, a payload force vector $\mathbf{F}$ applied at the end-effector, and the resulting 3D torque vector $\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F}$ emerging perpendicular to both along the joint axis.
2. **Right Panel (Sliders & Readouts inside `<Card>`)**:
   - `<Slider>` controls for Link Length $\|\mathbf{r}\|$, Link Elevation Angle $\theta_r$, Payload Force $\|\mathbf{F}\|$, and Force Angle $\theta_F$.
   - Live readout of $\|\boldsymbol{\tau}\| = \|\mathbf{r}\|\|\mathbf{F}\|\sin\theta$ ($\text{N}\cdot\text{m}$), highlighting maximum torque at $\theta = 90^\circ$ (arm horizontal) and zero torque at $\theta = 0^\circ / 180^\circ$ (arm vertical).
