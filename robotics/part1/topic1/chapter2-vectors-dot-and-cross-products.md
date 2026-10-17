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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Target minus robot, then normalize.** The robot is at $\mathbf{p}_{\text{robot}} = [1, 2]^T$ and the goal is at $\mathbf{p}_{\text{target}} = [7, 10]^T$. Compute $\mathbf{d}$, $\|\mathbf{d}\|$, $\hat{\mathbf{d}}$, and the velocity command $\mathbf{v}_{\text{cmd}}$ for a speed of $2.0\text{ m/s}$. What would $\mathbf{v}_{\text{cmd}}$ be if you made Mistake 1?

**Q2. Extend the Section 7 table.** Fill in the missing cells (angles in degrees, 2 decimals):

| Case | $\hat{\mathbf{h}}$ | $\mathbf{d}$ | $\hat{\mathbf{h}} \cdot \mathbf{d}$ | $\hat{\mathbf{h}} \times_{\text{2D}} \mathbf{d}$ | `atan2(cross, dot)` | Front/behind, left/right |
|------|--------------------|--------------|------------------------|-----------------------------------|---------------------|--------------------------|
| 5 | $[0, 1]^T$ ($90^\circ$) | $[2, 2]^T$ | ? | ? | ? | ? |
| 6 | $[0.6, 0.8]^T$ | $[1, -2]^T$ | ? | ? | ? | ? |
| 7 | $[0, -1]^T$ ($-90^\circ$) | $[-3, 1]^T$ | ? | ? | ? | ? |

**Q3. Torque on a different joint.** A link sticks out along $+Y$: $\mathbf{r} = [0, 0.4, 0]^T\text{ m}$. A gripper load pulls straight down: $\mathbf{F} = [0, 0, -20]^T\text{ N}$.
1. Compute $\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F}$ component by component. Around which axis does it act?
2. What is $\mathbf{F} \times \mathbf{r}$?
3. What is $\mathbf{r} \times \mathbf{F}$ if instead $\mathbf{r} = [0.3, 0, 0]^T$ and $\mathbf{F} = [-15, 0, 0]^T$ (a pure push along the link)?

**Q4. Camera FOV check.** A camera faces $\hat{\mathbf{c}} = [1, 0]^T$ with a total FOV of $90^\circ$ (accept if $\hat{\mathbf{c}} \cdot \hat{\mathbf{d}} \ge 0.7071$). For landmarks at $\mathbf{d}_1 = [3, 2]^T$, $\mathbf{d}_2 = [1, 2]^T$ and $\mathbf{d}_3 = [4, -3]^T$:
1. Which are inside the FOV?
2. Which answer flips if you forget to normalize $\mathbf{d}$ (Mistake 2) and test $\hat{\mathbf{c}} \cdot \mathbf{d} \ge 0.7071$ instead?

**Q5. Along-track and cross-track.** A path starts at $\mathbf{p}_{\text{start}} = [0, 0]^T$ heading along $\hat{\mathbf{t}} = [0.8, 0.6]^T$. The robot is at $[3, 4]^T$. Compute $s_{\text{along}}$, the closest point $\mathbf{p}_{\text{proj}}$ on the path line, and the signed cross-track error $\hat{\mathbf{t}} \times_{\text{2D}} \mathbf{e}$. Is the robot left or right of the path? Check your two numbers against $\|\mathbf{e}\|$.

### Coding Exercises

**E1 (Easy). Unsigned angle without `acos`.** Write `angle_between_deg(a: tuple[float, float], b: tuple[float, float]) -> float` that returns the unsigned angle in $[0^\circ, 180^\circ]$, using `atan2(|cross2d|, dot)` (Mistake 3's NaN-free fix). Raise `ValueError` if either vector has length $< 10^{-9}$.

```python
angle_between_deg((1, 0), (0, 3))       # 90.0
angle_between_deg((1, 0), (-2, -2))     # 135.0
angle_between_deg((0.6, 0.8), (4, 3))   # ≈ 16.26
angle_between_deg((1, 1), (1, 1))       # 0.0   (acos could return NaN here)
```

**E2 (Easy–Medium). Closest point on a path *segment*.** Section 4.4's projection uses an infinite line. Write `closest_point_on_segment(a, b, p) -> tuple[float, float]` for the finite segment from `a` to `b`. Project with $t = \dfrac{(\mathbf{p}-\mathbf{a})\cdot(\mathbf{b}-\mathbf{a})}{\|\mathbf{b}-\mathbf{a}\|^2}$, clamp $t$ to $[0, 1]$, and return $\mathbf{a} + t(\mathbf{b}-\mathbf{a})$. If `a == b`, return `a`.

```python
closest_point_on_segment((0, 0), (4, 3), (3, 4))    # ≈ (3.84, 2.88)
closest_point_on_segment((0, 0), (4, 3), (-2, 1))   # (0.0, 0.0)   clamped at the start
closest_point_on_segment((0, 0), (4, 3), (8, 3))    # (4.0, 3.0)   clamped at the end
```

**E3 (Medium). Is the robot inside the no-go zone?** Write `inside_convex_polygon(poly: list[tuple[float, float]], p: tuple[float, float]) -> bool` for a convex polygon whose vertices are listed **counter-clockwise**. A point is inside (or on the boundary) if it is never strictly to the **right** of any edge, so use the sign of the 2D cross product of each edge with the vector from that edge's start to `p`.

```python
zone = [(0, 0), (4, 0), (4, 3), (0, 3)]   # CCW rectangle
inside_convex_polygon(zone, (2, 1))       # True
inside_convex_polygon(zone, (5, 1))       # False
inside_convex_polygon(zone, (4, 1.5))     # True  (on an edge)
inside_convex_polygon(zone, (2, -0.1))    # False
```

#### Dry-Run: Answers

**Q1.**

$$\mathbf{d} = \begin{bmatrix} 7-1 \\ 10-2 \end{bmatrix} = \begin{bmatrix} 6 \\ 8 \end{bmatrix}, \quad \|\mathbf{d}\| = \sqrt{36 + 64} = 10, \quad \hat{\mathbf{d}} = \begin{bmatrix} 0.6 \\ 0.8 \end{bmatrix}, \quad \mathbf{v}_{\text{cmd}} = 2.0\,\hat{\mathbf{d}} = \begin{bmatrix} 1.2 \\ 1.6 \end{bmatrix}\text{ m/s}$$

With Mistake 1 ($\mathbf{p}_{\text{robot}} - \mathbf{p}_{\text{target}} = [-6, -8]^T$), the command becomes $[-1.2, -1.6]^T\text{ m/s}$, which is full speed directly **away** from the goal. Sanity check: $\sqrt{1.2^2 + 1.6^2} = \sqrt{1.44 + 2.56} = 2.0$, as intended.

**Q2.**

| Case | dot $h_x d_x + h_y d_y$ | cross $h_x d_y - h_y d_x$ | `atan2(cross, dot)` | Meaning |
|------|-------------------------|---------------------------|---------------------|---------|
| 5 | $(0)(2) + (1)(2) = +2.0$ | $(0)(2) - (1)(2) = -2.0$ | $-45.00^\circ$ | front-right |
| 6 | $(0.6)(1) + (0.8)(-2) = -1.0$ | $(0.6)(-2) - (0.8)(1) = -2.0$ | $-116.57^\circ$ | behind-right |
| 7 | $(0)(-3) + (-1)(1) = -1.0$ | $(0)(1) - (-1)(-3) = -3.0$ | $-108.43^\circ$ | behind-right |

Case 5 makes sense: the robot faces world $+Y$, and the target at world $45^\circ$ is $45^\circ$ to the robot's right. In case 7 the robot faces world $-Y$ and the target is up and to the left in the world, yet it is *behind-right* relative to the robot. Its world bearing is $\operatorname{atan2}(1, -3) = 161.57^\circ$, and $161.57^\circ - (-90^\circ) = 251.57^\circ$, which wraps to $-108.43^\circ$. That matches the table with no explicit wrapping.

**Q3.**
1. Component by component:

$$\mathbf{r} \times \mathbf{F} = \begin{bmatrix} (0.4)(-20) - (0)(0) \\ (0)(0) - (0)(-20) \\ (0)(0) - (0.4)(0) \end{bmatrix} = \begin{bmatrix} -8.0 \\ 0 \\ 0 \end{bmatrix}\text{ N}\cdot\text{m}$$

The torque is $8\text{ N}\cdot\text{m}$ about the **$-X$** axis (the load tries to roll the link around $X$). Check the magnitude: $\|\mathbf{r}\|\|\mathbf{F}\|\sin 90^\circ = 0.4 \times 20 = 8$.
2. $\mathbf{F} \times \mathbf{r} = -(\mathbf{r} \times \mathbf{F}) = [8.0, 0, 0]^T$ (anti-commutative).
3. $\mathbf{r} \parallel \mathbf{F}$ ($\theta = 180^\circ$, $\sin\theta = 0$), so $\boldsymbol{\tau} = [0, 0, 0]^T$. A push straight along a link creates no joint torque; it only loads the bearing.

**Q4.**

| Landmark | $\|\mathbf{d}\|$ | $\hat{\mathbf{c}} \cdot \hat{\mathbf{d}}$ | Inside? | Wrong test $\hat{\mathbf{c}} \cdot \mathbf{d}$ |
|----------|------------------|-------------------------------------------|---------|-------------------------------------------------|
| $[3, 2]^T$ | $\sqrt{13} = 3.606$ | $3/3.606 = 0.832$ | yes ($33.7^\circ$ off-axis) | $3 \ge 0.7071$: yes |
| $[1, 2]^T$ | $\sqrt{5} = 2.236$ | $1/2.236 = 0.447$ | **no** ($63.4^\circ$ off-axis) | $1 \ge 0.7071$: **yes (wrong!)** |
| $[4, -3]^T$ | $5$ | $4/5 = 0.8$ | yes ($-36.9^\circ$) | $4 \ge 0.7071$: yes |

1. Inside: $\mathbf{d}_1$ and $\mathbf{d}_3$.
2. $\mathbf{d}_2$ flips. Without normalization, the "cosine" is scaled by the distance, so any far-enough landmark passes.

**Q5.** $\mathbf{e} = [3, 4]^T - [0, 0]^T = [3, 4]^T$.
- $s_{\text{along}} = \mathbf{e} \cdot \hat{\mathbf{t}} = (3)(0.8) + (4)(0.6) = 2.4 + 2.4 = 4.8\text{ m}$
- $\mathbf{p}_{\text{proj}} = [0, 0]^T + 4.8\,[0.8, 0.6]^T = [3.84, 2.88]^T$
- cross-track $= \hat{\mathbf{t}} \times_{\text{2D}} \mathbf{e} = (0.8)(4) - (0.6)(3) = 3.2 - 1.8 = +1.4\text{ m}$, which is positive, so the robot is to the **left** of the path.

Check: $\sqrt{4.8^2 + 1.4^2} = \sqrt{23.04 + 1.96} = \sqrt{25} = 5 = \|\mathbf{e}\|$. The along-track and cross-track numbers are the robot's coordinates in the path's own frame, which is the same idea as Case 4 in Section 7. (In code, expect tiny float noise such as `4.800000000000001`.)

**E1 — reference solution**

```python
import math

Vec2 = tuple[float, float]

def dot(a: Vec2, b: Vec2) -> float:
    return a[0] * b[0] + a[1] * b[1]

def cross2d(a: Vec2, b: Vec2) -> float:
    return a[0] * b[1] - a[1] * b[0]

def angle_between_deg(a: Vec2, b: Vec2) -> float:
    if math.hypot(*a) < 1e-9 or math.hypot(*b) < 1e-9:
        raise ValueError("angle with a zero-length vector is undefined")
    # |cross| ~ |a||b| sin(theta) >= 0 and dot ~ |a||b| cos(theta), so atan2 lands in [0, pi]
    return math.degrees(math.atan2(abs(cross2d(a, b)), dot(a, b)))
```

Why no normalization is needed: both arguments of `atan2` carry the same factor $\|\mathbf{a}\|\|\mathbf{b}\|$, and it cancels. Check: $(0.6, 0.8)$ and $(4, 3)$ give dot $4.8$ and $|\text{cross}| = 1.4$, and $\operatorname{atan2}(1.4, 4.8) = 16.26^\circ$, which matches Case 4 of Section 7.

**E2 — reference solution**

```python
def closest_point_on_segment(a: Vec2, b: Vec2, p: Vec2) -> Vec2:
    ab = (b[0] - a[0], b[1] - a[1])
    ap = (p[0] - a[0], p[1] - a[1])
    len_sq = dot(ab, ab)                  # ||b - a||^2: no square root needed
    if len_sq < 1e-18:
        return a                          # degenerate segment (a == b)
    t = dot(ap, ab) / len_sq              # 0 at a, 1 at b
    t = max(0.0, min(1.0, t))             # clamp onto the segment
    return (a[0] + t * ab[0], a[1] + t * ab[1])
```

| `p` | $t$ before clamp | after clamp | result |
|-----|------------------|-------------|--------|
| $(3, 4)$ | $(12 + 12)/25 = 0.96$ | $0.96$ | $(3.84, 2.88)$ |
| $(-2, 1)$ | $(-8 + 3)/25 = -0.2$ | $0$ | $(0, 0)$ |
| $(8, 3)$ | $(32 + 9)/25 = 1.64$ | $1$ | $(4, 3)$ |

Dividing by $\|\mathbf{b}-\mathbf{a}\|^2$ is the same as projecting onto the unit vector and then dividing by the length once more, so $t$ is a fraction of the segment. Cost: $O(1)$.

**E3 — reference solution**

```python
def inside_convex_polygon(poly: list[Vec2], p: Vec2) -> bool:
    n = len(poly)
    if n < 3:
        raise ValueError("need at least 3 vertices")
    for i in range(n):
        a = poly[i]
        b = poly[(i + 1) % n]                    # wrap around to close the polygon
        edge = (b[0] - a[0], b[1] - a[1])
        to_p = (p[0] - a[0], p[1] - a[1])
        if cross2d(edge, to_p) < 0:              # p is strictly RIGHT of this edge
            return False
    return True
```

Trace for $(5, 1)$: edge $(0,0) \to (4,0)$ gives $\text{cross}((4,0), (5,1)) = 4 > 0$, so that is fine. Edge $(4,0) \to (4,3)$ gives $\text{cross}((0,3), (1,1)) = 0 - 3 = -3 < 0$, so the point is right of the edge and the answer is `False`. For $(4, 1.5)$, the second edge gives $\text{cross}((0,3), (0,1.5)) = 0$ (on the edge), so it is accepted. The CCW requirement matters: with the vertices listed clockwise, every interior point is to the *right* of every edge, and the function returns `False` even for $(2, 1)$. Cost: $O(n)$.

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
