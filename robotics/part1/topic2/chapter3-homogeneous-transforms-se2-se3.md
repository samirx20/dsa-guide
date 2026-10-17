# Part 1, Topic 2: Matrices, Reference Frames & Coordinate Transformations
## Chapter 3: Homogeneous Transformations $SE(2)$ & $SE(3)$ — Combining Rotation & Translation

---

## Why This Matters in Robotics

In Chapter 2, we mastered **Rotation Matrices** ($\mathbf{R} \in SO(2)$ and $SO(3)$). However, a real robot doesn't just spin in place at the origin $(0, 0)$!
Consider a warehouse robot driving across the floor:
1. The **Robot Base $\{B\}$** is located at position $\mathbf{t}_{WB} = [3.0\text{ m}, 2.0\text{ m}]^T$ in the **World Frame $\{W\}$** and rotated by $\theta_B = 90^\circ$ CCW.
2. Mounted near the front-left corner of the robot's roof is a **2D LiDAR Sensor $\{S\}$** at offset $\mathbf{t}_{BS} = [0.5\text{ m}, 0.2\text{ m}]^T$ relative to the Robot Base, rotated by $\theta_S = 0^\circ$.
3. That LiDAR detects a human worker's leg at $\mathbf{p}_S = [2.0\text{ m}, -1.0\text{ m}]^T$ in the LiDAR's own frame.

Where is that worker's leg in the **World Frame $\{W\}$**?
And what if you have a 6-joint robotic arm mounted on a mobile base with a wrist camera—a chain of **8 coordinate frames**?

If we try to handle **rotation** ($\mathbf{R}$) by matrix multiplication and **translation** ($\mathbf{t}$) by vector addition separately:

$$^W\mathbf{p} = \,^W_B\mathbf{R}\!\left(^B_S\mathbf{R}\,^S\mathbf{p} + \,^B\mathbf{t}_{BS}\right) + \,^W\mathbf{t}_{WB}$$

Chaining 8 frames turns into a deeply nested nightmare of parentheses, distributed matrix products, and sign errors!

What if we could pack **both rotation $\mathbf{R}$ and translation $\mathbf{t}$ into a SINGLE matrix $\mathbf{T}$** so that chaining 8 coordinate frames is literally just multiplying 8 matrices together?

$$^W\mathbf{p} = \,^W_B\mathbf{T}\;^B_S\mathbf{T}\;^S\mathbf{p}$$

In this chapter, we discover the brilliant geometric trick that makes this possible—**Homogeneous Coordinates**—and master the **Special Euclidean Groups $SE(2)$ ($3\times 3$ matrices) and $SE(3)$ ($4\times 4$ matrices)** that power ROS `tf2`, OpenGL/Vulkan, and every modern robotics engine.

---

## 1. Why a $2\times 2$ Matrix Cannot Translate Space (And How Adding a Dimension Fixes It!)

### 1.1 The Origin Trap: $\mathbf{A}\mathbf{0} = \mathbf{0}$

Why can't we find a $2\times 2$ matrix $\mathbf{A} = \begin{bmatrix} a & b \\ c & d \end{bmatrix}$ that shifts (translates) every 2D point $(x, y)$ by $+3\text{ m}$ in $X$ and $+2\text{ m}$ in $Y$?

Plug the origin $\mathbf{0} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$ into **any** $2\times 2$ matrix $\mathbf{A}$:

$$\mathbf{A}\begin{bmatrix} 0 \\ 0 \end{bmatrix} = \begin{bmatrix} a & b \\ c & d \end{bmatrix}\begin{bmatrix} 0 \\ 0 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$

A $2\times 2$ linear matrix **always pins $(0, 0)$ to $(0, 0)$**! It can rotate, stretch, or shear space around the origin, but it can **never move the origin** to $(3, 2)$.

So in 2D Cartesian coordinates, combining a rotation $\mathbf{R}$ and a translation $\mathbf{t}$ requires two separate steps (called an **Affine Transformation**):
1. **Rotate first**: Multiply $^B\mathbf{p}$ by $^W_B\mathbf{R}$ so its axes align with the World frame.
2. **Translate second**: Add the origin offset $^W\mathbf{t}_{WB}$:

$$^W\mathbf{p} = \,^W_B\mathbf{R}\,^B\mathbf{p} + \,^W\mathbf{t}_{WB}$$

### 1.2 The Genius Insight of Homogeneous Coordinates: A 3D Shear Is a 2D Translation!

How do we trick a linear matrix (which must keep the origin fixed) into sliding our 2D plane sideways?
**We lift our 2D plane up into 3D space so it sits as a flat tabletop at height $z = 1$!**

Look at the diagram below:
- The true 3D origin $(0, 0, 0)$ is down on the floor at height $z = 0$ (pinned in place, as linear algebra demands!).
- Every 2D point $(x, y)$ on our robot's map now lives on the elevated plane $z = 1$, written with an extra **`1` appended at the bottom**:

$$\tilde{\mathbf{p}} = \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} \quad (\text{Homogeneous Point})$$

Now, what happens if we apply a **3D Shear** that keeps $(0, 0, 0)$ pinned on the floor, but tilts the vertical $Z$-axis so that at height $z = 1$, the tabletop slides horizontally by $(t_x, t_y)$?

```
      +Z (Homogeneous Height)
       ^
       |        Plane z = 1 (Our 2D World!)
     1 +========*====================*=========> (Slides sideways by +t_x, +t_y!)
       |       / (0, 0, 1)          / (t_x, t_y, 1)
       |      /                    /
       |     /  3D Shear tilts    /
       |    /   the Z-axis!      /
       |   /                    /
     0 *--+--------------------+---------------> +X, +Y
    (0,0,0)  <-- 3D Origin stays pinned at (0,0,0)!
```

Let's check the math! In 3D, a matrix $\mathbf{T}$ has **3 columns**:
- **Column 1**: Where $\hat{\mathbf{i}} = [1, 0, 0]^T$ lands after rotation $\rightarrow \begin{bmatrix} \cos\theta \\ \sin\theta \\ 0 \end{bmatrix}$.
- **Column 2**: Where $\hat{\mathbf{j}} = [0, 1, 0]^T$ lands after rotation $\rightarrow \begin{bmatrix} -\sin\theta \\ \cos\theta \\ 0 \end{bmatrix}$.
- **Column 3**: Where $\hat{\mathbf{k}} = [0, 0, 1]^T$ (the origin of our $z=1$ tabletop!) lands $\rightarrow \begin{bmatrix} t_x \\ t_y \\ 1 \end{bmatrix}$!

Pack those 3 columns into a single $3\times 3$ matrix, and multiply by our homogeneous point $\tilde{\mathbf{p}} = [x, y, 1]^T$:

$$\begin{bmatrix} \cos\theta & -\sin\theta & t_x \\ \sin\theta & \cos\theta & t_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = x\begin{bmatrix} \cos\theta \\ \sin\theta \\ 0 \end{bmatrix} + y\begin{bmatrix} -\sin\theta \\ \cos\theta \\ 0 \end{bmatrix} + 1\begin{bmatrix} t_x \\ t_y \\ 1 \end{bmatrix} = \begin{bmatrix} x\cos\theta - y\sin\theta + t_x \\ x\sin\theta + y\cos\theta + t_y \\ 1 \end{bmatrix}$$

Look at that result:
- Because the bottom coordinate of the point is **`1`**, it multiplies **Column 3** ($[t_x, t_y, 1]^T$) by $1$ and **adds the translation $(t_x, t_y)$ directly to the rotated coordinates**!
- Even better: what if you have a **pure velocity or direction vector** $\mathbf{v} = [v_x, v_y]^T$ (which should rotate with the robot, but should **NOT** be shifted by the robot's position $(t_x, t_y)$)? You simply set its homogeneous coordinate to **`0` instead of `1`**: $\tilde{\mathbf{v}} = [v_x, v_y, 0]^T$, which multiplies Column 3 by $0$ and ignores translation automatically!

| Geometric Quantity | Homogeneous Coordinate ($w$) | Effect of Multiplying by $\mathbf{T}$ |
| :--- | :--- | :--- |
| **Position Point $\mathbf{p}$** | $\tilde{\mathbf{p}} = [x,\; y,\; \mathbf{1}]^T$ | **Rotated AND Translated**: $\mathbf{R}\mathbf{p} + \mathbf{t}$ |
| **Free Vector / Velocity $\mathbf{v}$** | $\tilde{\mathbf{v}} = [v_x,\; v_y,\; \mathbf{0}]^T$ | **Rotated ONLY** (Translation ignored): $\mathbf{R}\mathbf{v}$ |

---

## 2. The Special Euclidean Groups $SE(2)$ and $SE(3)$

### 2.1 2D Rigid Body Transforms: $SE(2)$ ($3\times 3$ Matrix)

The family of all 2D rigid-body transformations (combining a 2D rotation $\mathbf{R} \in SO(2)$ and a 2D translation $\mathbf{t} \in \mathbb{R}^2$) is called **$SE(2)$** (*Special Euclidean group of dimension 2*):

$$^W_B\mathbf{T} = \begin{bmatrix} ^W_B\mathbf{R} & ^W\mathbf{t}_{WB} \\ \mathbf{0}^T & 1 \end{bmatrix} = \begin{bmatrix} \cos\theta & -\sin\theta & t_x \\ \sin\theta & \cos\theta & t_y \\ 0 & 0 & 1 \end{bmatrix} \in SE(2)$$

### 2.2 3D Rigid Body Transforms: $SE(3)$ ($4\times 4$ Matrix)

By the exact same logic, to translate and rotate 3D points $(x, y, z)$, we append a $1$ in the 4th dimension ($\tilde{\mathbf{p}} = [x, y, z, 1]^T$) and pack the $3\times 3$ rotation matrix $\mathbf{R} \in SO(3)$ and $3\times 1$ translation vector $\mathbf{t} = [t_x, t_y, t_z]^T$ into a **$4\times 4$ Homogeneous Transformation Matrix** in **$SE(3)$**:

$$^W_B\mathbf{T} = \begin{bmatrix} ^W_B\mathbf{R}_{3\times 3} & ^W\mathbf{t}_{3\times 1} \\ \mathbf{0}_{1\times 3} & 1 \end{bmatrix} = \begin{bmatrix}
r_{00} & r_{01} & r_{02} & t_x \\
r_{10} & r_{11} & r_{12} & t_y \\
r_{20} & r_{21} & r_{22} & t_z \\
0 & 0 & 0 & 1
\end{bmatrix} \in SE(3)$$

---

## 3. Chaining Transforms & The Subscript Cancellation Rule

### 3.1 How Block Multiplication Chains Two Transforms Automatically

Suppose we know the pose of the Robot Base $\{B\}$ in the World $\{W\}$ ($^W_B\mathbf{T}$), and the pose of the LiDAR Sensor $\{S\}$ on the Robot Base ($^B_S\mathbf{T}$). What happens when we multiply those two matrices together?

$$^W_S\mathbf{T} = \,^W_B\mathbf{T}\;^B_S\mathbf{T} = \begin{bmatrix} \mathbf{R}_{WB} & \mathbf{t}_{WB} \\ \mathbf{0}^T & 1 \end{bmatrix} \begin{bmatrix} \mathbf{R}_{BS} & \mathbf{t}_{BS} \\ \mathbf{0}^T & 1 \end{bmatrix} = \begin{bmatrix} \mathbf{R}_{WB}\mathbf{R}_{BS} & \mathbf{R}_{WB}\mathbf{t}_{BS} + \mathbf{t}_{WB} \\ \mathbf{0}^T & 1 \end{bmatrix}$$

Look at the top-right block $\mathbf{R}_{WB}\mathbf{t}_{BS} + \mathbf{t}_{WB}$:
- The LiDAR's mounting offset $\mathbf{t}_{BS}$ is measured in the **Robot's frame $\{B\}$** ($0.5\text{ m}$ forward along the robot's nose).
- Before we can add it to the robot's World position $\mathbf{t}_{WB}$, we **must rotate $\mathbf{t}_{BS}$ by $\mathbf{R}_{WB}$** into the World frame!
- Standard matrix-matrix multiplication $\mathbf{T}_{WB}\mathbf{T}_{BS}$ performs both $\mathbf{R}_{WB}\mathbf{R}_{BS}$ and $\mathbf{R}_{WB}\mathbf{t}_{BS} + \mathbf{t}_{WB}$ **automatically**!

### 3.2 The Subscript / Superscript Cancellation Rule

To never multiply transforms in the wrong order, write every transform as $^{\text{Target}}_{\text{Source}}\mathbf{T}$ (or `T_target_source` in code) and check that **inner adjacent frame letters match and cancel diagonally**:

$$^W\tilde{\mathbf{p}} = \,^W_{\cancel{B}}\mathbf{T}\;\,^{\cancel{B}}_{\cancel{C}}\mathbf{T}\;\,^{\cancel{C}}_{\cancel{S}}\mathbf{T}\;\,^{\cancel{S}}\tilde{\mathbf{p}}$$

```
     [ World {W} ]  <--- ^W_B T ---  [ Robot Base {B} ]  <--- ^B_S T ---  [ LiDAR Sensor {S} ]
     (Warehouse)                      (x=3, y=2, 90 deg)                   (x=0.5, y=0.2, 0 deg)

     Formula:   ^W_S T   =   ^W_B T   *   ^B_S T
                              (B) -------- (B)   <-- Inner frame letters 'B' touch and cancel!
```

---

## 4. The Inverse of a Homogeneous Transform ($\mathbf{T}^{-1}$)

### 4.1 Why the Inverse Translation Is $-\mathbf{R}^T\mathbf{t}$ (and NOT $-\mathbf{t}$!)

Suppose the Robot Base $\{B\}$ is at World position $\mathbf{t}_{WB} = [3, 2]^T$ and facing $\theta = +90^\circ$ (pointing along World $+Y$).
We know $^W_B\mathbf{T}$ (how $\{B\}$ sits inside $\{W\}$). What is the inverse transform $^B_W\mathbf{T} = \left(^W_B\mathbf{T}\right)^{-1}$ (where the World origin $(0,0)$ sits as seen from the Robot's driver seat)?

**Beginner Trap**: Beginners guess that you just transpose $\mathbf{R}$ and negate $\mathbf{t}$: $\begin{bmatrix} \mathbf{R}^T & -\mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix}$. **WRONG!**
Why is $-\mathbf{t} = [-3, -2]^T$ wrong?
- Stand at $(3, 2)$ facing $+Y$ (North). Where is the World origin $(0, 0)$ from your perspective?
- $(0, 0)$ is $2\text{ m}$ **behind** you ($x_B = -2$) and $3\text{ m}$ to your **left** ($y_B = +3$), which is $[-2, +3]^T$, NOT $[-3, -2]^T$!
- Why? Because $\mathbf{t}_{WB} = [3, 2]^T$ was measured along the **World axes**, whereas $^B_W\mathbf{T}$ needs the offset expressed along the **Robot's rotated axes**!

Let's solve $^W\mathbf{p} = \mathbf{R}\,^B\mathbf{p} + \mathbf{t}$ for $^B\mathbf{p}$ step by step:
1. Subtract $\mathbf{t}$ from both sides: $^W\mathbf{p} - \mathbf{t} = \mathbf{R}\,^B\mathbf{p}$.
2. Multiply both sides on the left by $\mathbf{R}^{-1} = \mathbf{R}^T$:
   $$^B\mathbf{p} = \mathbf{R}^T\left(^W\mathbf{p} - \mathbf{t}\right) = \mathbf{R}^T\,^W\mathbf{p} - \mathbf{R}^T\mathbf{t}$$

Packing that into a homogeneous matrix gives the **Exact Closed-Form Inverse of any $SE(2)$ or $SE(3)$ Transform**:

$$\mathbf{T}^{-1} = \begin{bmatrix} \mathbf{R} & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix}^{-1} = \begin{bmatrix} \mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix}$$

Let's double-check that $\mathbf{T}\mathbf{T}^{-1} = \mathbf{I}$:

$$\begin{bmatrix} \mathbf{R} & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \begin{bmatrix} \mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} = \begin{bmatrix} \mathbf{R}\mathbf{R}^T & -\mathbf{R}\mathbf{R}^T\mathbf{t} + \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} = \begin{bmatrix} \mathbf{I} & -\mathbf{t} + \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} = \begin{bmatrix} \mathbf{I} & \mathbf{0} \\ \mathbf{0}^T & 1 \end{bmatrix}$$

> [!IMPORTANT]
> **Never call a general $4\times 4$ matrix inverter (`np.linalg.inv(T)`) on an $SE(3)$ transform in production!**
> Computing $\mathbf{R}^T$ and $-\mathbf{R}^T\mathbf{t}$ takes only **9 multiplications and 0 divisions**, and is $100\%$ numerically stable.

---

## 5. Annotated Code Implementation (C++ & Python)

### 5.1 C++17 Implementation: Complete `Transform2D` ($SE(2)$) Class

```cpp
#include <cmath>
#include <iostream>
#include <iomanip>

struct Vec2 { double x{0.0}, y{0.0}; };

struct Transform2D {
    // Represents T = [ c  -s  tx ]
    //                [ s   c  ty ]
    //                [ 0   0   1 ]
    double tx{0.0}, ty{0.0};
    double theta{0.0};
    double c{1.0}, s{0.0};

    Transform2D(double x = 0.0, double y = 0.0, double yaw_rad = 0.0)
        : tx(x), ty(y), theta(yaw_rad), c(std::cos(yaw_rad)), s(std::sin(yaw_rad)) {}

    // Transform a 2D Position Point (homogeneous w = 1): R * p + t
    Vec2 transform_point(const Vec2& p) const {
        return {
            c * p.x - s * p.y + tx,
            // ^^^^^^^^^^^^^^   ^^
            // Rotate X         + Translate X (since w = 1)
            s * p.x + c * p.y + ty
        };
    }

    // Transform a 2D Velocity/Direction Vector (homogeneous w = 0): R * v
    Vec2 transform_vector(const Vec2& v) const {
        return {c * v.x - s * v.y, s * v.x + c * v.y};
        //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //      No +tx or +ty because free vectors have homogeneous w = 0!
    }

    // Chain two transforms: T_AC = T_AB * T_BC
    Transform2D operator*(const Transform2D& rhs) const {
        double new_tx = c * rhs.tx - s * rhs.ty + tx;
        double new_ty = s * rhs.tx + c * rhs.ty + ty;
        double new_theta = std::atan2(std::sin(theta + rhs.theta),
                                      std::cos(theta + rhs.theta));
        return Transform2D(new_tx, new_ty, new_theta);
    }

    // Exact SE(2) Inverse: [ R^T  -R^T * t ]
    Transform2D inverse() const {
        double inv_tx = -( c * tx + s * ty);
        double inv_ty = -(-s * tx + c * ty);
        //              ^^^^^^^^^^^^^^^^^^^^
        //              CRITICAL: -R^T * t rotates the negated translation into the child frame!
        return Transform2D(inv_tx, inv_ty, -theta);
    }
};

int main() {
    constexpr double kPi = 3.14159265358979323846;

    Transform2D T_WB(3.0, 2.0, kPi / 2.0); // Robot at (3, 2), facing +90 deg (+Y)
    Transform2D T_BS(0.5, 0.2, 0.0);       // LiDAR at (0.5, 0.2) on Robot, 0 deg
    Vec2 p_S{2.0, -1.0};                   // Obstacle at (2.0, -1.0) in LiDAR frame

    Transform2D T_WS = T_WB * T_BS;        // Subscript B cancels: ^W_S T = ^W_B T * ^B_S T
    Vec2 p_W = T_WS.transform_point(p_S);  // Obstacle in World frame {W}
    Vec2 p_S_back = T_WS.inverse().transform_point(p_W); // Verify inverse!

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "LiDAR origin in World : (" << T_WS.tx << ", " << T_WS.ty << ")\n";
    std::cout << "Obstacle in World {W} : (" << p_W.x << ", " << p_W.y << ")\n";
    std::cout << "Recovered in LiDAR {S}: (" << p_S_back.x << ", " << p_S_back.y << ")\n";
    return 0;
}
```

### 5.2 Python Implementation: $3\times 3$ $SE(2)$ and $4\times 4$ $SE(3)$ Matrices

```python
import math
import numpy as np

def se2_matrix(x: float, y: float, theta_rad: float) -> np.ndarray:
    c, s = math.cos(theta_rad), math.sin(theta_rad)
    return np.array([
        [c, -s, x],
        [s,  c, y],
        [0,  0, 1]
    ], dtype=float)
    #   ^^^^^^  ^
    #   2x2 R   2x1 t, with homogeneous bottom row [0, 0, 1]

def se2_inverse(T: np.ndarray) -> np.ndarray:
    R = T[:2, :2]
    t = T[:2, 2]
    #   ^^^^^^^^
    #   Extract 2x2 rotation R and 2x1 translation t
    T_inv = np.eye(3)
    T_inv[:2, :2] = R.T
    T_inv[:2, 2]  = -(R.T @ t)
    #               ^^^^^^^^^^
    #               Closed-form SE(n) inverse: -R^T @ t (never just -t!)
    return T_inv

T_WB = se2_matrix(3.0, 2.0, math.pi / 2.0) # Robot at (3, 2, 90 deg)
T_BS = se2_matrix(0.5, 0.2, 0.0)           # LiDAR at (0.5, 0.2, 0 deg)
p_S_tilde = np.array([2.0, -1.0, 1.0])     # Homogeneous point (w = 1)

T_WS = T_WB @ T_BS
p_W_tilde = T_WS @ p_S_tilde

print("T_WS:\n", np.round(T_WS, 3))
print("Obstacle in World {W}:", np.round(p_W_tilde[:2], 3))
print("Inverse check in {S} :", np.round((se2_inverse(T_WS) @ p_W_tilde)[:2], 3))

# Full 3D SE(3) (4x4 Matrix) Construction & Block Inverse:
def se3_matrix(R_3x3: np.ndarray, t_3x1: np.ndarray) -> np.ndarray:
    T = np.eye(4, dtype=float)
    T[:3, :3] = R_3x3
    T[:3, 3]  = t_3x1
    #   ^^^^
    #   Top-left 3x3 is SO(3) rotation; Top-right 3x1 is 3D translation [tx, ty, tz]^T
    return T

def se3_inverse(T: np.ndarray) -> np.ndarray:
    R = T[:3, :3]
    t = T[:3, 3]
    T_inv = np.eye(4, dtype=float)
    T_inv[:3, :3] = R.T
    T_inv[:3, 3]  = -(R.T @ t)
    #               ^^^^^^^^^^
    #               Exact 4x4 SE(3) inverse in 9 multiplies and 0 divisions!
    return T_inv
```

**What's happening:**
- **`T[:3, :3] = R_3x3` and `T[:3, 3] = t_3x1`**: Whether in 2D ($3\times 3$ $SE(2)$) or 3D ($4\times 4$ $SE(3)$), the block structure is identical! The top-left $n\times n$ block is the rotation matrix $\mathbf{R}$, the top-right $n\times 1$ column is the translation vector $\mathbf{t}$, and the bottom row is $[0, \dots, 0, 1]$.
- **`se3_inverse(T)`**: Works identically in 2D and 3D: transpose the rotation block ($\mathbf{R}^T$) and set the translation column to $-\mathbf{R}^T\mathbf{t}$.

### 5.3 Computing Relative Pose Between Two Moving Robots ($^A_B\mathbf{T} = \,^W_A\mathbf{T}^{-1}\,^W_B\mathbf{T}$)

Suppose Drone $A$ is at World pose $^W_A\mathbf{T}$ and Drone $B$ is at World pose $^W_B\mathbf{T}$. How does Drone $A$ compute the relative pose of Drone $B$ in Drone $A$'s own onboard camera frame ($^A_B\mathbf{T}$)?

Use the **Subscript Cancellation Rule**:
- We want $A$ on the top-left and $B$ on the bottom-right ($^A_B\mathbf{T}$).
- We have $^W_A\mathbf{T}$ and $^W_B\mathbf{T}$. If we invert $^W_A\mathbf{T}$, its indices flip to $^A_W\mathbf{T}$!
- Now the inner $W$'s match and cancel:

$$^A_B\mathbf{T} = \,^A_{\cancel{W}}\mathbf{T}\;\,^{\cancel{W}}_B\mathbf{T} = \left(^W_A\mathbf{T}\right)^{-1} \,^W_B\mathbf{T} = \begin{bmatrix} \mathbf{R}_{WA}^T \mathbf{R}_{WB} & \mathbf{R}_{WA}^T(\mathbf{t}_{WB} - \mathbf{t}_{WA}) \\ \mathbf{0}^T & 1 \end{bmatrix}$$

Look at that translation term $\mathbf{R}_{WA}^T(\mathbf{t}_{WB} - \mathbf{t}_{WA})$:
1. First, it takes the World displacement vector from Drone $A$ to Drone $B$ ($\mathbf{t}_{WB} - \mathbf{t}_{WA}$, our *"Target minus Source"* rule from Topic 1!).
2. Second, it multiplies by $\mathbf{R}_{WA}^T$ to un-rotate that World displacement vector into Drone $A$'s local axes!

### 5.4 Production C++ with `Eigen::Isometry2d` and `Eigen::Isometry3d`

In C++ `Eigen`, never use a raw `Eigen::Matrix4d` for rigid-body transforms if you want maximum speed and safety; use **`Eigen::Isometry3d`** (or `Eigen::Isometry2d`), which knows that the matrix is an $SE(3)$ rigid transform and automatically uses $\begin{bmatrix}\mathbf{R}^T & -\mathbf{R}^T\mathbf{t}\end{bmatrix}$ when you call `.inverse()`!

```cpp
#include <Eigen/Dense>
#include <Eigen/Geometry>

void eigen_se3_example() {
    // Build ^W_B T: Robot at (3, 2, 0) rotated +90 deg around Z
    Eigen::Isometry3d T_WB = Eigen::Isometry3d::Identity();
    T_WB.translate(Eigen::Vector3d(3.0, 2.0, 0.0));
    T_WB.rotate(Eigen::AngleAxisd(M_PI / 2.0, Eigen::Vector3d::UnitZ()));

    // Transform a 3D point (automatically treats as homogeneous w = 1):
    Eigen::Vector3d p_B(2.0, -1.0, 0.5);
    Eigen::Vector3d p_W = T_WB * p_B;

    // Transform a 3D velocity vector (rotate only, w = 0) via .linear():
    Eigen::Vector3d v_B(1.5, 0.0, 0.0);
    Eigen::Vector3d v_W = T_WB.linear() * v_B;

    // Fast closed-form SE(3) inverse:
    Eigen::Isometry3d T_BW = T_WB.inverse();
}
```

---

## 6. Step-by-Step Dry Run: 3-Frame Warehouse Robot Pipeline

Let's trace our warehouse example by hand and verify every single number in our C++ and Python output:
- **World to Robot Base ($^W_B\mathbf{T}$)**: Robot at $(3.0, 2.0)$, heading $\theta_B = +90^\circ$ ($\cos 90^\circ = 0, \sin 90^\circ = 1$).
- **Robot Base to LiDAR ($^B_S\mathbf{T}$)**: LiDAR mounted at $(0.5, 0.2)$, $\theta_S = 0^\circ$ ($\cos 0^\circ = 1, \sin 0^\circ = 0$).
- **Obstacle in LiDAR Frame ($^S\tilde{\mathbf{p}}$)**: $[2.0, -1.0, 1.0]^T$ ($2\text{ m}$ ahead of LiDAR, $1\text{ m}$ to its right).

| Step | Operation | Matrix / Vector Expression | Numerical Result | Physical Meaning in Warehouse |
| :--- | :--- | :--- | :--- | :--- |
| **1. Build $^W_B\mathbf{T}$** | Pose of $\{B\}$ in $\{W\}$ | $\begin{bmatrix} 0 & -1 & 3.0 \\ 1 & 0 & 2.0 \\ 0 & 0 & 1 \end{bmatrix}$ | $3\times 3$ matrix | Robot is at $(3, 2)$ facing $+Y_W$ (North) |
| **2. Build $^B_S\mathbf{T}$** | Pose of $\{S\}$ in $\{B\}$ | $\begin{bmatrix} 1 & 0 & 0.5 \\ 0 & 1 & 0.2 \\ 0 & 0 & 1 \end{bmatrix}$ | $3\times 3$ matrix | LiDAR is $0.5\text{ m}$ forward, $0.2\text{ m}$ left of robot axle |
| **3. Chain $^W_S\mathbf{T}$** | $^W_B\mathbf{T}\,^B_S\mathbf{T}$ | $\begin{bmatrix} 0 & -1 & 3.0 - 0.2 \\ 1 & 0 & 2.0 + 0.5 \\ 0 & 0 & 1 \end{bmatrix}$ | $\begin{bmatrix} 0 & -1 & \mathbf{2.8} \\ 1 & 0 & \mathbf{2.5} \\ 0 & 0 & 1 \end{bmatrix}$ | LiDAR is at World $(2.8, 2.5)$ facing $+Y_W$ |
| **4. Map Point $^W\tilde{\mathbf{p}}$** | $^W_S\mathbf{T}\,^S\tilde{\mathbf{p}}$ | $\begin{bmatrix} 0 & -1 & 2.8 \\ 1 & 0 & 2.5 \\ 0 & 0 & 1 \end{bmatrix}\begin{bmatrix} 2.0 \\ -1.0 \\ 1.0 \end{bmatrix}$ | $\begin{bmatrix} \mathbf{3.8} \\ \mathbf{4.5} \\ 1.0 \end{bmatrix}$ | Worker's leg is at World **$(3.8\text{ m}, 4.5\text{ m})$**! |
| **5. Invert $^S_W\mathbf{T}$** | $\left(^W_S\mathbf{T}\right)^{-1}$ | $\begin{bmatrix} 0 & 1 & -2.5 \\ -1 & 0 & 2.8 \\ 0 & 0 & 1 \end{bmatrix}$ | $t_{\text{inv}} = [-2.5, 2.8]^T$ | World $(0,0)$ is $2.5\text{ m}$ behind & $2.8\text{ m}$ left of LiDAR |

Look at **Step 4** physically:
- The LiDAR is at World $(2.8, 2.5)$ and facing **North ($+Y_W$)** because the robot is rotated $+90^\circ$.
- The obstacle is $2.0\text{ m}$ **in front of** the LiDAR (which is North, $+Y_W \implies 2.5 + 2.0 = 4.5\text{ m}$) and $1.0\text{ m}$ to the **right** of the LiDAR (which is East, $+X_W \implies 2.8 + 1.0 = 3.8\text{ m}$).
- Result: $(3.8, 4.5)$—matching our matrix multiplication to the millimeter!

### 6.2 Self-Check Exercises (With Step-by-Step Solutions)

1. **Why $-\mathbf{R}^T\mathbf{t}$ Matters When $\theta \neq 0^\circ$**:
   *Question*: A robot $\{B\}$ is at World position $\mathbf{t}_{WB} = [10, 0]^T$ and facing $\theta = 180^\circ$ (pointing back toward the World origin along $-X_W$). Compute $^B_W\mathbf{T} = \left(^W_B\mathbf{T}\right)^{-1}$ and verify where the World origin $(0, 0)$ lies in $\{B\}$.
   *Solution*:
   - At $\theta = 180^\circ$, $\mathbf{R} = \begin{bmatrix} -1 & 0 \\ 0 & -1 \end{bmatrix}$ and $\mathbf{R}^T = \begin{bmatrix} -1 & 0 \\ 0 & -1 \end{bmatrix}$.
   - The inverse translation is $-\mathbf{R}^T\mathbf{t} = -\begin{bmatrix} -1 & 0 \\ 0 & -1 \end{bmatrix}\begin{bmatrix} 10 \\ 0 \end{bmatrix} = \begin{bmatrix} +10 \\ 0 \end{bmatrix}$.
   - Physically, since the robot is at $(10, 0)$ facing back toward $(0, 0)$, the World origin is **$+10\text{ m}$ straight in front of the robot's nose** ($^B\mathbf{p}_{\text{origin}} = [+10, 0]^T$)! Had you naively used $-\mathbf{t} = [-10, 0]^T$, the robot would think the origin was $10\text{ m}$ *behind* it!

2. **Chaining a 4-Frame Mobile Manipulator Pick-and-Place Query**:
   *Question*: You are given $^{\text{world}}_{\text{base}}\mathbf{T}$, $^{\text{base}}_{\text{camera}}\mathbf{T}$, and $^{\text{base}}_{\text{gripper}}\mathbf{T}$, plus a detected apple in the camera frame $^{\text{camera}}\tilde{\mathbf{p}}$. Write the matrix chain that expresses the apple's coordinates directly in the `gripper` frame ($^{\text{gripper}}\tilde{\mathbf{p}}$).
   *Solution*:
   - Notice we have $^{\text{base}}_{\text{gripper}}\mathbf{T}$, which has `base` on top and `gripper` on the bottom. To put `gripper` on the top-left, we invert it: $^{\text{gripper}}_{\text{base}}\mathbf{T} = \left(^{\text{base}}_{\text{gripper}}\mathbf{T}\right)^{-1}$.
   - Now chain with subscript cancellation:
     $$^{\text{gripper}}\tilde{\mathbf{p}} = \,^{\text{gripper}}_{\cancel{\text{base}}}\mathbf{T}\;\,^{\cancel{\text{base}}}_{\cancel{\text{camera}}}\mathbf{T}\;\,^{\cancel{\text{camera}}}\tilde{\mathbf{p}} = \left(^{\text{base}}_{\text{gripper}}\mathbf{T}\right)^{-1} \,^{\text{base}}_{\text{camera}}\mathbf{T}\;\,^{\text{camera}}\tilde{\mathbf{p}}$$
   - Notice that $^{\text{world}}_{\text{base}}\mathbf{T}$ cancelled out completely—the arm doesn't even need to know where the robot is in the warehouse to grab an apple seen by its onboard camera!

---

## 7. Common Mistakes & How to Fix Them

### Mistake 1: Inverting $\mathbf{T}$ by Just Negating $\mathbf{t}$ ($\begin{bmatrix}\mathbf{R}^T & -\mathbf{t}\end{bmatrix}$)
- **Symptom**: Your inverse transform works when $\theta = 0^\circ$, but as soon as the robot rotates, transforming points from World to Robot frame shifts them by several meters in the wrong direction!
- **Fix**: Memorize the block inverse identity: $\mathbf{T}^{-1} = \begin{bmatrix} \mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix}$. You must rotate $-\mathbf{t}$ into the child frame using $\mathbf{R}^T$!

### Mistake 2: Applying a Point Transform ($w = 1$) to a Velocity or Normal Vector ($w = 0$)
- **Symptom**: Your robot is at $(x = 100\text{ m}, y = 50\text{ m})$ moving at $1\text{ m/s}$. You transform the velocity vector using `transform_point`, and the robot's velocity suddenly becomes $101\text{ m/s}$!
- **Fix**: Positions/points use homogeneous coordinate $w = 1$ ($\mathbf{R}\mathbf{p} + \mathbf{t}$). Free vectors (velocities, accelerations, forces, surface normals) use $w = 0$ ($\mathbf{R}\mathbf{v}$ only).

### Mistake 3: Multiplying Transforms in Wrong Subscript Order (`T_BS * T_WB`)
- **Symptom**: Your sensor offset $(0.5, 0.2)$ gets added in the World frame instead of the Robot frame, or the robot's $(3, 2)$ position gets rotated by the sensor's mount angle.
- **Fix**: Always name your variables with explicit `T_target_source` (e.g., `T_world_base`, `T_base_sensor`) and verify that the middle words match: `T_world_sensor = T_world_base @ T_base_sensor`.

---

## 8. Quick Reference Summary

| Operation | Formula ($SE(2)$ / $SE(3)$ Block Form) | Notes |
| :--- | :--- | :--- |
| **Homogeneous Matrix $\mathbf{T}$** | $^A_B\mathbf{T} = \begin{bmatrix} ^A_B\mathbf{R} & ^A\mathbf{t}_{AB} \\ \mathbf{0}^T & 1 \end{bmatrix}$ | $3\times 3$ in 2D ($SE(2)$); $4\times 4$ in 3D ($SE(3)$) |
| **Transform a Point ($w=1$)** | $^A\tilde{\mathbf{p}} = \,^A_B\mathbf{T}\,^B\tilde{\mathbf{p}} = \begin{bmatrix} ^A_B\mathbf{R}\,^B\mathbf{p} + \,^A\mathbf{t}_{AB} \\ 1 \end{bmatrix}$ | Rotates point AND adds origin translation |
| **Transform a Vector ($w=0$)** | $^A\tilde{\mathbf{v}} = \,^A_B\mathbf{T}\,^B\tilde{\mathbf{v}} = \begin{bmatrix} ^A_B\mathbf{R}\,^B\mathbf{v} \\ 0 \end{bmatrix}$ | Rotates free vector ONLY; ignores translation |
| **Chain Two Transforms** | $^A_C\mathbf{T} = \,^A_B\mathbf{T}\;^B_C\mathbf{T} = \begin{bmatrix} \mathbf{R}_{AB}\mathbf{R}_{BC} & \mathbf{R}_{AB}\mathbf{t}_{BC} + \mathbf{t}_{AB} \\ \mathbf{0}^T & 1 \end{bmatrix}$ | Inner letter $B$ cancels out |
| **Exact Inverse ($\mathbf{T}^{-1}$)** | $^B_A\mathbf{T} = \left(^A_B\mathbf{T}\right)^{-1} = \begin{bmatrix} \mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix}$ | **Warning:** Translation is $-\mathbf{R}^T\mathbf{t}$, never $-\mathbf{t}$! |
| **Relative Transform ($A \to B$)** | $^A_B\mathbf{T} = \left(^W_A\mathbf{T}\right)^{-1} \,^W_B\mathbf{T} = \,^A_W\mathbf{T}\;^W_B\mathbf{T}$ | Computes pose of $\{B\}$ seen from $\{A\}$ |

---

## Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Interactive Artifact Builder):** Build an interactive $SE(2)$ Homogeneous Transform & Multi-Frame Chaining Visualizer using **`shadcn/ui` components** (`<Card>`, `<Tabs>`, `<Slider>`, `<Switch>`, `<Select>`, `<Button>`, `<Badge>`, `<Table>`, `<Tooltip>`) and Tailwind CSS.

### Component Architecture & Tabs (`<Tabs defaultValue="se2-chain">`)

#### Tab 1: `"se2-chain"` — 3-Frame Warehouse Robot Chain ($\{W\} \to \{B\} \to \{S\} \to \mathbf{p}$)
1. **Left Panel (Interactive 2D Warehouse Canvas inside `<Card>`)**:
   - Render three color-coded coordinate frames with $X/Y$ axes:
     - **World Frame $\{W\}$** pinned at $(0, 0)$ (Slate/White).
     - **Robot Base Frame $\{B\}$** (draggable chassis with wheels, **Emerald `#10b981`**) at $(t_{x,B}, t_{y,B}, \theta_B)$.
     - **LiDAR Sensor Frame $\{S\}$** mounted on the robot (**Sky Blue `#38bdf8`**) at local offset $(t_{x,S}, t_{y,S}, \theta_S)$.
     - **Obstacle Point $\mathbf{p}$** (**Amber `#f59e0b`**) with a laser ray from $\{S\}$ to $\mathbf{p}$.
   - Include a `<Select>` frame camera switcher: `View in World Frame {W}`, `View in Robot Base {B}`, or `View in LiDAR Sensor {S}`—smoothly animating the entire canvas so the selected frame sits at the center $(0, 0)$!
   - Include a **"Show Naive Inverse Bug ($-\mathbf{t}$ vs $-\mathbf{R}^T\mathbf{t}$)"** `<Switch>` that renders where the World origin would falsely appear if the user forgot to multiply $-\mathbf{t}$ by $\mathbf{R}^T$.
2. **Right Panel (Controls & Live Block-Matrix Inspector inside `<Card>`)**:
   - `<Slider>` controls for Robot Pose $(x_B, y_B, \theta_B)$, Sensor Mount $(x_S, y_S, \theta_S)$, and Obstacle in Sensor Frame $(x_p, y_p)$.
   - Live color-coded $3\times 3$ matrix equations showing $^W_S\mathbf{T} = \,^W_B\mathbf{T} \times \,^B_S\mathbf{T}$ with the $2\times 2$ $\mathbf{R}$ block highlighted in Emerald, the $2\times 1$ $\mathbf{t}$ block in Sky Blue, and the homogeneous row `[0, 0, 1]` in Muted Zinc.

#### Tab 2: `"homogeneous-3d-shear"` — Why $z = 1$ Turns a 3D Shear into a 2D Translation
1. **Left Panel (Interactive 3D Isometric Slice Canvas inside `<Card>`)**:
   - Visualize the 3D space $(X, Y, Z)$ with the origin $(0,0,0)$ pinned at the bottom and the translucent 2D plane hovering at height $z = 1$.
   - As the user drags $<Slider>$ controls for $t_x$ and $t_y$, show the 3D $Z$-axis tilting (shearing) while the $z = 1$ plane slides purely horizontally without distorting shapes on the $z = 1$ tabletop!
   - Toggle `<Switch>` between a **Point ($w = 1$, sits on the $z = 1$ plane and translates)** and a **Free Vector ($w = 0$, sits on the $z = 0$ floor and only rotates)**.
