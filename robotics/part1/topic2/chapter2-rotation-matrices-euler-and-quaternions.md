# Part 1, Topic 2: Matrices, Reference Frames & Coordinate Transformations
## Chapter 2: Rotation Matrices $SO(2)$ & $SO(3)$, Euler Angles, Gimbal Lock & Quaternions

---

## Why This Matters in Robotics

A modern autonomous robot is not a single point—it is a collection of dozens of **coordinate frames** bolted together and moving through the world:
- The **World / Map Frame $\{W\}$** is bolted to the corner of the warehouse floor.
- The **Robot Base Frame $\{B\}$** (`base_link`) is bolted to the center of the robot's drive axle, rotating as the robot steers.
- The **Camera Frame $\{C\}$** and **3D LiDAR Frame $\{S\}$** are bolted to the robot's mast, tilted downward at $15^\circ$.
- An **IMU (Inertial Measurement Unit)** inside the chassis measures 3D angular orientation as the robot drives up a ramp.

Suppose the LiDAR sensor $\{S\}$ detects an obstacle $4.0\text{ m}$ straight in front of the sensor ($\mathbf{p}_S = [4, 0, 0]^T$). Where is that obstacle in the **World Frame $\{W\}$** so the planner can mark it on the map?

To answer this, we need a mathematical representation of **2D and 3D rotation** that can transform vectors from one frame's orientation to another. In this chapter, we will:
1. Derive the **2D Rotation Matrix $\mathbf{R}(\theta) \in SO(2)$** from scratch using our basis-vector intuition from Chapter 1 (no memorization!).
2. Discover the superpower of **Special Orthogonal Matrices ($SO(2)$ and $SO(3)$)**: why their inverse is simply their transpose ($\mathbf{R}^{-1} = \mathbf{R}^T$).
3. Build **3D Roll, Pitch, and Yaw** rotation matrices, and prove with a physical hands-on experiment at your desk why **3D rotations do NOT commute**.
4. See why **Euler Angles break down at Pitch $= \pm 90^\circ$ (Gimbal Lock)**, and how **Unit Quaternions $\mathbf{q} = [w, x, y, z]^T$** solve 3D orientation cleanly across ROS, aerospace, and game engines.

---

## 1. Deriving the 2D Rotation Matrix $\mathbf{R}(\theta) \in SO(2)$ From Zero

### 1.1 Where Do $\hat{\mathbf{i}}$ and $\hat{\mathbf{j}}$ Land When Rotated by $\theta$?

In Chapter 1, we learned the golden secret of matrices: **Column 1 is where $\hat{\mathbf{i}} = [1, 0]^T$ lands, and Column 2 is where $\hat{\mathbf{j}} = [0, 1]^T$ lands.**

Suppose our Robot Base frame $\{B\}$ is rotated counter-clockwise by an angle $\theta$ relative to the World frame $\{W\}$. Let's look at where the robot's two unit basis vectors ($\hat{\mathbf{i}}_B$ pointing out the robot's nose, and $\hat{\mathbf{j}}_B$ pointing out the robot's left wheel) point in the World frame:

```
                            +Y_W (World Y)
                             ^
         j_B (Robot Left)    |         i_B (Robot Forward)
          [-sin(theta),      |          [cos(theta),
            cos(theta)]      |           sin(theta)]
                    *        |            *
                     \       |           /
                      \      |  theta   /
                       \     |   ^     /  r = 1
                        \    |   |    /
                         \   |       /
                          \  |      /   theta
                           \ |     /     ^
                            \|    /      |
   --------------------------*-----------+----------> +X_W (World X)
                           (0,0)
```

1. **Column 1 (Where $\hat{\mathbf{i}}$ lands)**:
   The robot's forward axis $\hat{\mathbf{i}}_B$ starts at $(1, 0)$ and rotates CCW by $\theta$ along the Unit Circle. From Topic 1, Chapter 1, its coordinates on the Unit Circle are:
   $$\hat{\mathbf{i}}_B = \begin{bmatrix} \cos\theta \\ \sin\theta \end{bmatrix} \quad \longleftarrow \text{Column 1 of }\mathbf{R}(\theta)$$

2. **Column 2 (Where $\hat{\mathbf{j}}$ lands)**:
   The robot's left axis $\hat{\mathbf{j}}_B$ starts at $(0, 1)$ ($+90^\circ$) and rotates CCW by $\theta$ into Quadrant II!
   - Its horizontal shadow ($X$-coordinate) moves **left** into negative $X$ by $\sin\theta$: $x = -\sin\theta$.
   - Its vertical height ($Y$-coordinate) drops slightly from $1$ to $\cos\theta$: $y = +\cos\theta$.
   $$\hat{\mathbf{j}}_B = \begin{bmatrix} -\sin\theta \\ \cos\theta \end{bmatrix} \quad \longleftarrow \text{Column 2 of }\mathbf{R}(\theta)$$

Pack Column 1 and Column 2 side-by-side, and you have derived the famous **2D Rotation Matrix**:

$$^W_B\mathbf{R}(\theta) = \begin{bmatrix} \uparrow & \uparrow \\ \hat{\mathbf{i}}_B & \hat{\mathbf{j}}_B \\ \downarrow & \downarrow \end{bmatrix} = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}$$

> [!TIP]
> **How to Read Frame Subscripts/Superscripts ($^W_B\mathbf{R}$):**
> We write $^W_B\mathbf{R}$ (read *"Rotation from frame $B$ to frame $W$"*). When you multiply $^W_B\mathbf{R}$ by a vector expressed in the Robot Body frame $^B\mathbf{p}$, the adjacent $B$'s cancel out like fractions and give you the vector in the World frame $^W\mathbf{p}$:
> $$^W\mathbf{p} = \,^W_B\mathbf{R}\;^B\mathbf{p}$$

---

## 2. The Special Orthogonal Group $SO(2)$ & $SO(3)$

Not just any $2\times 2$ or $3\times 3$ matrix is a valid rotation matrix. A rigid body rotation must not stretch, shrink, shear, or mirror-flip the robot! Mathematically, the family of all pure 2D rotations is called **$SO(2)$** (*Special Orthogonal group of dimension 2*), and all pure 3D rotations is called **$SO(3)$**.

Every rotation matrix $\mathbf{R}$ obeys two ironclad laws:

### Law 1: Orthogonality ($\mathbf{R}^T\mathbf{R} = \mathbf{I} \implies \mathbf{R}^{-1} = \mathbf{R}^T$)
Look at the columns of $\mathbf{R}(\theta)$:
- Both columns are **unit vectors** of length $1$: $\cos^2\theta + \sin^2\theta = 1$.
- The columns are **mutually perpendicular (orthogonal)**: their dot product is $(\cos\theta)(-\sin\theta) + (\sin\theta)(\cos\theta) = 0$.

When a matrix has orthonormal columns, multiplying $\mathbf{R}^T$ by $\mathbf{R}$ computes the dot product of every column with itself ($=1$ on the diagonal) and with the other columns ($=0$ off the diagonal):

$$\mathbf{R}^T\mathbf{R} = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}\begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix} = \begin{bmatrix} \cos^2\theta+\sin^2\theta & 0 \\ 0 & \sin^2\theta+\cos^2\theta \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} = \mathbf{I}$$

**Why this is a superpower in robotics:**
To invert a general matrix $\mathbf{A}^{-1}$, the CPU has to perform expensive divisions and Gaussian elimination. To invert a rotation matrix (going from World $\{W\}$ back into Robot $\{B\}$), **you just take its transpose (swap the off-diagonal signs)**:

$$^B_W\mathbf{R} = \left(^W_B\mathbf{R}\right)^{-1} = \left(^W_B\mathbf{R}\right)^T = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix} = \mathbf{R}(-\theta)$$

### Law 2: "Special" Means Determinant $= +1$ ($\det\mathbf{R} = +1$)
Let's check the determinant of $\mathbf{R}(\theta)$:

$$\det(\mathbf{R}) = (\cos\theta)(\cos\theta) - (-\sin\theta)(\sin\theta) = \cos^2\theta + \sin^2\theta = +1$$

Why $+1$ and not $-1$? Because a mirror reflection matrix $\begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}$ also has orthonormal columns, so it is *orthogonal*, **but its determinant is $-1$** (it turns a right-handed robot into a left-handed mirror image, which is physically impossible without teleporting through the 4th dimension!). Requiring $\det(\mathbf{R}) = +1$ is what puts the **"Special"** ($S$) in $SO(2)$ and $SO(3)$.

---

## 3. 3D Rotations $SO(3)$: Roll, Pitch, Yaw & Non-Commutativity

### 3.1 The Three Elementary 3D Rotation Matrices

In 3D space ($+X$ Forward, $+Y$ Left, $+Z$ Up), we can rotate around each of the three coordinate axes:
1. **Roll ($\phi$, around $+X$ Forward axis)**: Tilting the robot's left/right sides up and down. Because the $X$-axis is the axle of rotation, $\hat{\mathbf{i}} = [1, 0, 0]^T$ does not move!
2. **Pitch ($\theta$, around $+Y$ Left axis)**: Tilting the robot's nose down/up. Because the $Y$-axis is the axle, $\hat{\mathbf{j}} = [0, 1, 0]^T$ does not move!
3. **Yaw ($\psi$, around $+Z$ Up axis)**: Turning left/right on a flat floor. Because the $Z$-axis is the vertical axle, $\hat{\mathbf{k}} = [0, 0, 1]^T$ does not move, and the top-left $2\times 2$ block is literally our 2D rotation matrix!

$$\mathbf{R}_x(\phi) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \cos\phi & -\sin\phi \\ 0 & \sin\phi & \cos\phi \end{bmatrix}, \quad
\mathbf{R}_y(\theta) = \begin{bmatrix} \cos\theta & 0 & \sin\theta \\ 0 & 1 & 0 \\ -\sin\theta & 0 & \cos\theta \end{bmatrix}, \quad
\mathbf{R}_z(\psi) = \begin{bmatrix} \cos\psi & -\sin\psi & 0 \\ \sin\psi & \cos\psi & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

*(Curious why $\mathbf{R}_y(\theta)$ has $+\sin\theta$ in the top-right instead of $-\sin\theta$? Curl the fingers of your right hand around $+Y$ (thumb pointing Left): $+Z$ curls toward $+X$, and $+X$ curls toward $-Z$, so $\hat{\mathbf{i}}$ lands at $[\cos\theta, 0, -\sin\theta]^T$ and $\hat{\mathbf{k}}$ lands at $[\sin\theta, 0, \cos\theta]^T$!)*

### 3.2 Desk Experiment: Why 3D Rotations Do NOT Commute!

In 2D, rotating by $30^\circ$ then $45^\circ$ is the same as $45^\circ$ then $30^\circ$ ($75^\circ$ either way, because both share the same $Z$ axle).
**In 3D, rotating around different axes depends critically on the ORDER!**

Pick up your **smartphone** (or a book) right now and hold it flat in front of you, screen facing **Up ($+Z$)**, charging port pointing toward you (**$-X$**), top of the phone pointing **Forward ($+X$)**.

- **Sequence A (Pitch $90^\circ$ first, then Yaw $90^\circ$):**
  1. Rotate $90^\circ$ around $+Y$ (Pitch nose down): The screen now faces **Forward ($+X$)**.
  2. Rotate $90^\circ$ around World $+Z$ (Yaw left): The screen now faces **Left ($+Y$)**.
- **Sequence B (Yaw $90^\circ$ first, then Pitch $90^\circ$):**
  1. Start flat again (screen facing **Up $+Z$**). Rotate $90^\circ$ around World $+Z$ (Yaw left): The screen is still facing **Up ($+Z$)**, with the top of the phone pointing Left.
  2. Rotate $90^\circ$ around World $+Y$ (Pitch forward): The screen now faces **Forward ($+X$)** (sideways)!

```
   START (Flat)              SEQUENCE A: Pitch -> Yaw         SEQUENCE B: Yaw -> Pitch
   Screen: UP (+Z)           1. Pitch 90 -> Screen FORWARD    1. Yaw 90   -> Screen UP (+Z)
   Top   : FORWARD (+X)      2. Yaw 90   -> Screen LEFT (+Y)  2. Pitch 90 -> Screen FORWARD (+X)
                                      [DIFFERENT FINAL 3D ORIENTATIONS!]
```

$$\mathbf{R}_z(90^\circ)\,\mathbf{R}_y(90^\circ) \neq \mathbf{R}_y(90^\circ)\,\mathbf{R}_z(90^\circ)$$

---

## 4. Euler Angles, The Gimbal Lock Catastrophe & Unit Quaternions

### 4.1 Euler Angles (ZYX Roll-Pitch-Yaw Convention)

Leonhard Euler proved that any 3D orientation can be written as a sequence of three elemental rotations, such as the standard robotics & aerospace **ZYX (Yaw-Pitch-Roll)** convention:

$$\mathbf{R}(\psi, \theta, \phi) = \mathbf{R}_z(\psi)\,\mathbf{R}_y(\theta)\,\mathbf{R}_x(\phi)$$

Euler angles $(\phi, \theta, \psi)$ are wonderful for human intuition and UI sliders—it is easy to picture *"Roll $5^\circ$, Pitch $10^\circ$, Yaw $90^\circ$"*. Why not use Euler angles everywhere inside our code?

### 4.2 What Is Gimbal Lock? (Algebraically & Physically)

Suppose a drone or underwater ROV pitches its nose straight up or straight down by **$\theta = +90^\circ$ ($\frac{\pi}{2}\text{ rad}$)** so that $\cos(90^\circ) = 0$ and $\sin(90^\circ) = 1$.
Let's plug $\theta = 90^\circ$ into the combined ZYX matrix $\mathbf{R}_z(\psi)\,\mathbf{R}_y(90^\circ)\,\mathbf{R}_x(\phi)$ and multiply it out using the trigonometric angle-difference identities:

$$\mathbf{R}(\psi, 90^\circ, \phi) = \begin{bmatrix}
0 & \sin(\phi - \psi) & \cos(\phi - \psi) \\
0 & \cos(\phi - \psi) & -\sin(\phi - \psi) \\
-1 & 0 & 0
\end{bmatrix}$$

Look closely at that matrix!
- The angles $\phi$ (Roll) and $\psi$ (Yaw) **never appear separately**—they only appear subtracted together as the single angle $(\phi - \psi)$!
- Why? Because pitching by $90^\circ$ tilted the robot's local Roll axis ($X_{\text{body}}$) so that it is now **perfectly aligned with the World Yaw axis ($Z_{\text{world}}$)**!
- Both Roll ($\phi$) and Yaw ($\psi$) now spin the robot around the **exact same vertical axis**! You have lost one of your three degrees of freedom—a singularity called **Gimbal Lock**. Near $\theta = \pm 90^\circ$, attempting to extract Euler angles causes $\phi$ and $\psi$ to jump instantaneously by $180^\circ$, crashing Apollo 11's IMU backup warning and breaking naive drone controllers!

```
   NORMAL FLIGHT (Pitch = 0 deg)               GIMBAL LOCK (Pitch = +90 deg, Nose Straight Down!)
        +Z_world (Yaw axis)                        +Z_world (Yaw axis)
           ^                                          ^   <-- BOTH AXES ARE NOW PARALLEL!
           |                                          |       (+X_body = -Z_world: same line, opposite way)
           *------> +X_body (Roll axis)               *       Changing Roll (phi) or Yaw (psi)
          /                                          /|       rotates around the EXACT SAME axis!
         v +Y (Pitch axis)                          v v +X_body (Roll axis, nose down)
                                              +Y (Pitch axis)
```

### 4.3 Enter Unit Quaternions: $\mathbf{q} = [w, x, y, z]^T$

How do we represent 3D rotations using only **4 numbers** (instead of 9 in a $3\times 3$ matrix) with **zero singularities or gimbal lock anywhere**?
Euler's Rotation Theorem states that any 3D orientation is a single rotation by some angle $\theta$ around some 3D unit axis vector $\hat{\mathbf{u}} = [u_x, u_y, u_z]^T$.

In 1843, William Rowan Hamilton discovered **Quaternions**. A **Unit Quaternion** encodes the axis $\hat{\mathbf{u}}$ and the half-angle $\theta / 2$ into 4 numbers:

$$\mathbf{q} = \begin{bmatrix} w \\ x \\ y \\ z \end{bmatrix} = \begin{bmatrix} \cos(\theta / 2) \\ u_x \sin(\theta / 2) \\ u_y \sin(\theta / 2) \\ u_z \sin(\theta / 2) \end{bmatrix}, \qquad \text{with } w^2 + x^2 + y^2 + z^2 = 1$$

Why use $\theta / 2$ instead of $\theta$? And why is it completely immune to Gimbal Lock?
1. **Always Normalized on the 4D Unit Sphere ($S^3$)**: Because $\cos^2(\theta/2) + (u_x^2+u_y^2+u_z^2)\sin^2(\theta/2) = \cos^2(\theta/2) + \sin^2(\theta/2) = 1$, every 3D orientation is a smooth point on a 4D unit sphere with no coordinate chart singularities.
2. **Trivial Identity & Inverse**:
   - **Identity (No rotation, $\theta = 0$)**: $\mathbf{q}_I = [1, 0, 0, 0]^T$.
   - **Inverse ($\mathbf{q}^{-1}$, rotating by $-\theta$)**: Just negate the vector part (the **conjugate** $\mathbf{q}^*$):
     $$\mathbf{q}^{-1} = \mathbf{q}^* = \begin{bmatrix} w \\ -x \\ -y \\ -z \end{bmatrix}$$
3. **Double Cover ($\mathbf{q}$ and $-\mathbf{q}$ are the SAME 3D rotation)**: Increasing $\theta$ by $360^\circ$ ($2\pi$) increases $\theta / 2$ by $\pi$, which flips the sign of both $\cos(\theta/2)$ and $\sin(\theta/2)$. Thus $\mathbf{q}$ and $-\mathbf{q}$ represent the exact same physical 3D orientation!

---

## 5. Annotated Code Implementation (C++ & Python)

### 5.1 C++17 Implementation: 2D Rotation & 3D Quaternion Operations

```cpp
#include <cmath>
#include <iostream>
#include <iomanip>

struct Vec2 { double x{0.0}, y{0.0}; };

struct Rot2 {
    double c{1.0}; // cos(theta)
    double s{0.0}; // sin(theta)

    explicit Rot2(double theta_rad = 0.0)
        : c(std::cos(theta_rad)), s(std::sin(theta_rad)) {}
        //  ^^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^
        //  Precompute cos and sin once when constructing the rotation!

    // Rotate vector from Body {B} to World {W}: R * p
    Vec2 rotate(const Vec2& p) const {
        return {c * p.x - s * p.y,
                s * p.x + c * p.y};
    }

    // Inverse rotation from World {W} to Body {B}: R^T * p
    Vec2 unrotate(const Vec2& p) const {
        return { c * p.x + s * p.y,
                -s * p.x + c * p.y};
        //      ^^^^^^^^^^^^^^^^^^
        //      R^-1 = R^T simply flips the sign of sin(theta)!
    }
};

struct Quat {
    double w{1.0}, x{0.0}, y{0.0}, z{0.0};

    static Quat from_axis_angle(double ux, double uy, double uz, double theta_rad) {
        double half = 0.5 * theta_rad;
        double sh   = std::sin(half);
        return {std::cos(half), ux * sh, uy * sh, uz * sh};
        //      ^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^
        //      Scalar w        Vector part u_hat * sin(theta/2)
    }

    Quat conjugate() const { return {w, -x, -y, -z}; }

    // Hamilton product q1 * q2 (chains rotation q2 first, then q1)
    Quat operator*(const Quat& r) const {
        return {
            w*r.w - x*r.x - y*r.y - z*r.z,
            w*r.x + x*r.w + y*r.z - z*r.y,
            w*r.y - x*r.z + y*r.w + z*r.x,
            w*r.z + x*r.y - y*r.x + z*r.w
        };
    }
};

int main() {
    constexpr double kPi = 3.14159265358979323846;
    Rot2 R_wb(kPi / 3.0); // +60 deg robot yaw
    Vec2 p_body{4.0, 0.0}; // Obstacle 4m straight ahead of robot nose

    Vec2 p_world = R_wb.rotate(p_body);
    Vec2 p_check = R_wb.unrotate(p_world);

    std::cout << std::fixed << std::setprecision(3);
    std::cout << "World coords : [" << p_world.x << ", " << p_world.y << "]\n";
    std::cout << "Back to body : [" << p_check.x << ", " << p_check.y << "]\n";
    return 0;
}
```

### 5.2 Python Implementation: $SO(2)$, $SO(3)$ & Quaternion Conversion

```python
import math
import numpy as np

def rot2d(theta_rad: float) -> np.ndarray:
    c, s = math.cos(theta_rad), math.sin(theta_rad)
    return np.array([
        [c, -s],
        [s,  c]
    ])
    #   ^    ^
    #   Col1 Col2 -> Col1 is i_B=[cos, sin]^T, Col2 is j_B=[-sin, cos]^T

def rpy_to_quat(roll: float, pitch: float, yaw: float) -> np.ndarray:
    """Convert ZYX Euler angles (rad) to unit quaternion [w, x, y, z]."""
    cr, sr = math.cos(roll * 0.5),  math.sin(roll * 0.5)
    cp, sp = math.cos(pitch * 0.5), math.sin(pitch * 0.5)
    cy, sy = math.cos(yaw * 0.5),   math.sin(yaw * 0.5)

    w = cr * cp * cy + sr * sp * sy
    x = sr * cp * cy - cr * sp * sy
    y = cr * sp * cy + sr * cp * sy
    z = cr * cp * sy - sr * sp * cy
    return np.array([w, x, y, z])

# Note: In C++ Eigen, Eigen::Quaterniond(w, x, y, z) takes w FIRST in the constructor:
#   Eigen::Quaterniond q(Eigen::AngleAxisd(theta, Eigen::Vector3d::UnitZ()));
#   Eigen::Vector3d v_rot = q * v;             // Overloaded '*' performs q * v * q^*!
#   Eigen::Quaterniond q_interp = q0.slerp(t, q1); // Built-in shortest-path SLERP!
#   Eigen::Matrix3d R = q.toRotationMatrix();  // Converts unit quaternion to 3x3 SO(3) matrix!

def quat_to_rot3d(q: np.ndarray) -> np.ndarray:
    """Convert unit quaternion [w, x, y, z] to a 3x3 SO(3) rotation matrix."""
    w, x, y, z = q / np.linalg.norm(q)
    #            ^^^^^^^^^^^^^^^^^^^^^
    #            Always normalize first so numerical drift doesn't scale vectors!
    return np.array([
        [1 - 2*(y*y + z*z),     2*(x*y - w*z),     2*(x*z + w*y)],
        [    2*(x*y + w*z), 1 - 2*(x*x + z*z),     2*(y*z - w*x)],
        [    2*(x*z - w*y),     2*(y*z + w*x), 1 - 2*(x*x + y*y)]
    ])

def quat_rotate_vector(q: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Rotate 3D vector v by unit quaternion q using fast cross-product formula."""
    w = q[0]
    u = q[1:] # Vector part [x, y, z]
    # Fast Rodrigues-like formula equivalent to q * [0, v] * q^*:
    t = 2.0 * np.cross(u, v)
    return v + w * t + np.cross(u, t)
    #      ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #      Avoids building a 3x3 matrix: takes only 2 cross products!

def slerp(q0: np.ndarray, q1: np.ndarray, t: float) -> np.ndarray:
    """Spherical Linear Interpolation (SLERP) between two unit quaternions for t in [0, 1]."""
    dot = float(np.dot(q0, q1))
    if dot < 0.0:
        # Double-cover fix: q1 and -q1 are the SAME 3D rotation!
        # Negate q1 so we always take the shortest great-circle arc (< 180 deg).
        q1 = -q1
        dot = -dot

    if dot > 0.9995:
        # Very close angles: fall back to normalized linear interpolation (NLERP)
        res = q0 + t * (q1 - q0)
        return res / np.linalg.norm(res)

    theta_0 = math.acos(dot)
    sin_theta_0 = math.sin(theta_0)
    s0 = math.sin((1.0 - t) * theta_0) / sin_theta_0
    s1 = math.sin(t * theta_0) / sin_theta_0
    return s0 * q0 + s1 * q1

R = rot2d(math.radians(60.0))
q_yaw90 = rpy_to_quat(0.0, 0.0, math.pi / 2.0)
v_in = np.array([1.0, 0.0, 0.0]) # Pointing along +X
v_out = quat_rotate_vector(q_yaw90, v_in) # Rotated +90 deg around +Z -> [0, 1, 0]!

print("det(R)      :", round(float(np.linalg.det(R)), 6))
print("R.T @ R = I :\n", np.round(R.T @ R, 6))
print("Quat (+90 deg Pitch, Gimbal-Lock safe):", np.round(rpy_to_quat(0.0, math.pi/2, 0.0), 4))
print("Rotated +X by +90 deg Yaw via Quat    :", np.round(v_out, 4))
```

**What's happening:**
- **`quat_rotate_vector(q, v)`**: Mathematically, rotating a 3D vector $\mathbf{v}$ by a unit quaternion $\mathbf{q}$ is the sandwich product $\mathbf{v}' = \mathbf{q} \otimes [0, \mathbf{v}]^T \otimes \mathbf{q}^*$. Expanding that algebraically simplifies to $\mathbf{t} = 2(\mathbf{u} \times \mathbf{v})$ and $\mathbf{v}' = \mathbf{v} + w\mathbf{t} + (\mathbf{u} \times \mathbf{t})$, which is the exact fast formula used inside game engines and ROS `tf2`!
- **`slerp(q0, q1, t)`**: When a robotic arm or camera smoothly interpolates from orientation $\mathbf{q}_0$ to $\mathbf{q}_1$ as $t$ goes from $0 \to 1$, interpolating Euler angles causes wobbling and gimbal lock. **SLERP (Spherical Linear Interpolation)** glides at constant angular speed along the shortest great-circle arc on the 4D unit sphere! Notice the `if dot < 0.0: q1 = -q1` check: because $\mathbf{q}_1$ and $-\mathbf{q}_1$ represent the exact same 3D orientation, if $\mathbf{q}_0 \cdot \mathbf{q}_1 < 0$ they are more than $90^\circ$ apart in 4D ($>180^\circ$ in 3D), so negating $\mathbf{q}_1$ guarantees the robot takes the **shortest** 3D rotation path!

---

## 6. Step-by-Step Dry Run: 2D Rotation & 3D Unit Quaternions

### 6.1 Rotating $^B\mathbf{p} = [4.0, 2.0]^T$ Across Four Robot Headings

| Robot Heading $\theta$ | $\cos\theta$ | $\sin\theta$ | Rotation Matrix $^W_B\mathbf{R}(\theta)$ | Transformed Vector $^W\mathbf{p} = \,^W_B\mathbf{R}\,^B\mathbf{p}$ | Inverse Check $^W_B\mathbf{R}^T\,^W\mathbf{p}$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$0^\circ$ ($0\text{ rad}$)** | $+1.000$ | $0.000$ | $\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$ | $[4.000,\; 2.000]^T$ | $[4.000,\; 2.000]^T$ |
| **$+90^\circ$ ($+\frac{\pi}{2}\text{ rad}$)** | $0.000$ | $+1.000$ | $\begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}$ | $[-2.000,\; 4.000]^T$ | $[4.000,\; 2.000]^T$ |
| **$+60^\circ$ ($+\frac{\pi}{3}\text{ rad}$)** | $+0.500$ | $+0.866$ | $\begin{bmatrix} 0.500 & -0.866 \\ 0.866 & 0.500 \end{bmatrix}$ | $[0.268,\; 4.464]^T$ | $[4.000,\; 2.000]^T$ |
| **$180^\circ$ ($\pi\text{ rad}$)** | $-1.000$ | $0.000$ | $\begin{bmatrix} -1 & 0 \\ 0 & -1 \end{bmatrix}$ | $[-4.000,\; -2.000]^T$ | $[4.000,\; 2.000]^T$ |

### 6.2 Common 3D Rotations as Unit Quaternions $\mathbf{q} = [w, x, y, z]^T$

| Physical 3D Rotation | Axis $\hat{\mathbf{u}} = [u_x, u_y, u_z]^T$ | Angle $\theta$ | Half-Angle $\theta / 2$ | $\cos(\theta/2)$ | $\sin(\theta/2)$ | Unit Quaternion $\mathbf{q} = [w, x, y, z]^T$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity (No Rotation)** | Any axis | $0^\circ$ | $0^\circ$ | $1.0000$ | $0.0000$ | $[1.0000,\; 0,\; 0,\; 0]^T$ |
| **$90^\circ$ Yaw (Left around $+Z$)** | $[0, 0, 1]^T$ | $90^\circ$ | $45^\circ$ | $0.7071$ | $0.7071$ | $[0.7071,\; 0,\; 0,\; 0.7071]^T$ |
| **$90^\circ$ Pitch (around $+Y$)** | $[0, 1, 0]^T$ | $90^\circ$ | $45^\circ$ | $0.7071$ | $0.7071$ | $[0.7071,\; 0,\; 0.7071,\; 0]^T$ |
| **$180^\circ$ Roll (around $+X$)** | $[1, 0, 0]^T$ | $180^\circ$ | $90^\circ$ | $0.0000$ | $1.0000$ | $[0.0000,\; 1.0000,\; 0,\; 0]^T$ |
| **$360^\circ$ Full Turn (Double Cover)** | $[0, 0, 1]^T$ | $360^\circ$ | $180^\circ$ | $-1.0000$ | $0.0000$ | $[-1.0000,\; 0,\; 0,\; 0]^T \equiv \mathbf{q}_I$ |

### 6.3 Self-Check Exercises (With Step-by-Step Solutions)

1. **Verifying $SO(2)$ Validity by Inspection**:
   *Question*: Is the matrix $\mathbf{M} = \begin{bmatrix} 0.8 & 0.6 \\ 0.6 & -0.8 \end{bmatrix}$ a valid 2D rotation matrix in $SO(2)$?
   *Solution*:
   - First check column lengths: $0.8^2 + 0.6^2 = 0.64 + 0.36 = 1.0$ (unit length) and $(0.8)(0.6) + (0.6)(-0.8) = 0$ (orthogonal!).
   - Second check the determinant: $\det(\mathbf{M}) = (0.8)(-0.8) - (0.6)(0.6) = -0.64 - 0.36 = \mathbf{-1.0} \neq +1.0$!
   - Because $\det(\mathbf{M}) = -1$, $\mathbf{M}$ is an improper **reflection** ($O(2)$, not $SO(2)$). A true rotation matrix in $SO(2)$ must have matching diagonal signs ($\cos\theta, \cos\theta$) and opposite off-diagonal signs ($-\sin\theta, +\sin\theta$).

2. **Computing Angular Error Between Two Quaternions ($\mathbf{q}_{\text{err}} = \mathbf{q}_{\text{curr}}^* \otimes \mathbf{q}_{\text{target}}$)**:
   *Question*: How do you compute the 3D orientation error quaternion that rotates from current drone attitude $\mathbf{q}_{\text{curr}}$ to desired attitude $\mathbf{q}_{\text{target}}$?
   *Solution*:
   - Never subtract quaternions ($\mathbf{q}_{\text{target}} - \mathbf{q}_{\text{curr}}$ does not lie on the unit sphere!).
   - Instead, multiply by the inverse (conjugate): $\mathbf{q}_{\text{err}} = \mathbf{q}_{\text{curr}}^{-1} \otimes \mathbf{q}_{\text{target}} = \mathbf{q}_{\text{curr}}^* \otimes \mathbf{q}_{\text{target}}$.
   - If the scalar part $w_{\text{err}} < 0$, negate $\mathbf{q}_{\text{err}} \leftarrow -\mathbf{q}_{\text{err}}$ (double-cover shortest path!), and then $2 \cdot [x_{\text{err}}, y_{\text{err}}, z_{\text{err}}]^T$ directly gives the 3D body-frame angular error vector for your attitude controller!

---

## 7. Common Mistakes & How to Fix Them

### Mistake 1: Confusing $[w, x, y, z]$ vs. $[x, y, z, w]$ Quaternion Ordering!
- **Symptom**: Your robot turns $180^\circ$ upside down when passing a quaternion from Eigen or Python into a ROS `geometry_msgs/Quaternion` message.
- **Fix**: Always check the library's constructor vs. storage order!
  - **Math, Aerospace & Eigen Constructor**: `Eigen::Quaterniond(w, x, y, z)` puts scalar **`w` first**.
  - **ROS Messages & `scipy.spatial.transform.Rotation`**: Store `[x, y, z, w]` with scalar **`w` last**! Always access fields explicitly (`q.w()`, `q.x()`, `q.y()`, `q.z()`) instead of indexing raw arrays blindly.

### Mistake 2: Initializing a Quaternion to All Zeros `[0, 0, 0, 0]`
- **Symptom**: Default-initializing a struct or message leaves `w=0, x=0, y=0, z=0`, which has norm $0$ (not $1$!) and produces `NaN` or zeroes out all rotated vectors.
- **Fix**: The identity quaternion is **`w = 1.0, x = 0.0, y = 0.0, z = 0.0`**, never all zeros!

### Mistake 3: Forgetting to Re-Normalize After Repeated Multiplications
- **Symptom**: Over thousands of IMU integration steps ($\mathbf{q}_{k+1} = \mathbf{q}_k \otimes \Delta\mathbf{q}$), floating-point rounding causes $\|\mathbf{q}\|$ to drift from $1.0$ to $1.002$ or $0.998$, introducing scale/shear distortion.
- **Fix**: Periodically normalize your quaternion: $\mathbf{q} \leftarrow \mathbf{q} / \|\mathbf{q}\|$.

---

## 8. Quick Reference Summary

| Representation | Size | Inverse Operation | Chaining Two Rotations | Pros & Cons |
| :--- | :--- | :--- | :--- | :--- |
| **2D Rotation $\mathbf{R}(\theta) \in SO(2)$** | $2\times 2$ (4 floats) | Transpose $\mathbf{R}^T = \mathbf{R}(-\theta)$ | Matrix multiply $\mathbf{R}_1\mathbf{R}_2$ | Exact, simple, no singularities in 2D |
| **3D Matrix $\mathbf{R} \in SO(3)$** | $3\times 3$ (9 floats) | Transpose $\mathbf{R}^T$ ($\det\mathbf{R}=+1$) | Matrix multiply $\mathbf{R}_1\mathbf{R}_2$ | Fast vector rotation $\mathbf{R}\mathbf{v}$; 9 floats for 3 DOF |
| **Euler Angles $(\phi, \theta, \psi)$** | 3 floats | Negate & reverse order | Must convert to $\mathbf{R}$ or $\mathbf{q}$ | Intuitive for humans; **suffers from Gimbal Lock at $\theta = \pm 90^\circ$** |
| **Unit Quaternion $\mathbf{q}$** | 4 floats ($w,x,y,z$) | Conjugate $[w, -x, -y, -z]^T$ | Hamilton product $\mathbf{q}_1 \otimes \mathbf{q}_2$ | Compact (4 floats), **zero singularities**, smooth SLERP interpolation |

---

## Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Interactive Artifact Builder):** Build a multi-tab interactive rotation and gimbal-lock explorer using **`shadcn/ui` components** (`<Card>`, `<Tabs>`, `<Slider>`, `<Switch>`, `<Select>`, `<Button>`, `<Badge>`, `<Table>`, `<Tooltip>`) and Tailwind CSS.

### Component Architecture & Tabs (`<Tabs defaultValue="so2-explorer">`)

#### Tab 1: `"so2-explorer"` — $SO(2)$ World vs. Robot Frame Dual-View Inspector
1. **Left Panel (Synchronized Split Canvas inside `<Card>`)**:
   - **World Frame $\{W\}$ View**: Shows the fixed warehouse grid, the rotated robot at angle $\theta$ with its local basis arrows $\hat{\mathbf{i}}_B = [\cos\theta, \sin\theta]^T$ and $\hat{\mathbf{j}}_B = [-\sin\theta, \cos\theta]^T$, and a draggable LiDAR obstacle point.
   - **Robot Body Frame $\{B\}$ View**: Shows the exact same obstacle from the robot's ego-centric perspective ($+X_B$ always pointing straight up), demonstrating how $^B\mathbf{p} = \,^W_B\mathbf{R}^T\,^W\mathbf{p}$ un-rotates the world.
2. **Right Panel (Controls & Live Matrix Verification inside `<Card>`)**:
   - `<Slider>` for Robot Heading $\theta \in [-180^\circ, +180^\circ]$ and `<Switch>` to toggle between Forward Rotation ($^W_B\mathbf{R}$) and Transpose Inverse ($^W_B\mathbf{R}^T$).
   - Live verification badges: `<Badge variant="secondary">det(R) = +1.000</Badge>` and `<Badge variant="secondary">RᵀR = I (Orthogonal)</Badge>`.

#### Tab 2: `"gimbal-lock-3d"` — 3D Gimbal Ring Simulator & Quaternion Rescue
1. **Left Panel (3D Interactive Gimbal Rings & Drone Mesh inside `<Card>`)**:
   - Render three nested 3D colored gimbal rings: **Outer Ring = Yaw ($\psi$, Z-axis, Blue)**, **Middle Ring = Pitch ($\theta$, Y-axis, Green)**, **Inner Ring = Roll ($\phi$, X-axis, Red)** around a 3D drone/aircraft wireframe.
   - When Pitch approaches $\pm 90^\circ$, the Outer (Blue) and Inner (Red) gimbal rings visually align in the same plane and pulse Red with `<Badge variant="destructive">GIMBAL LOCK: Yaw & Roll Axes Aligned (1 DOF Lost!)</Badge>`.
2. **Right Panel (Euler vs. Quaternion Controls inside `<Card>`)**:
   - `<Slider>` controls for Roll ($\phi$), Pitch ($\theta$), and Yaw ($\psi$), plus a `<Button variant="destructive">Snap Pitch to +90° (Trigger Gimbal Lock)</Button>` button so the user can wiggle the Roll and Yaw sliders and see both spin the drone around the exact same axis!
   - `<Switch>` to switch the control mode to **Axis-Angle / Unit Quaternion SLERP**, showing the live 4-component unit quaternion $\mathbf{q} = [w, x, y, z]^T$ with a norm bar $\|\mathbf{q}\| = \sqrt{w^2+x^2+y^2+z^2} = 1.000$ rotating smoothly right through Pitch $= 90^\circ$ without any lock.
