# Part 2, Topic 2: Manipulator & Mobile Robot Kinematics
## Chapter 1: Forward Kinematics, Analytical Inverse Kinematics & The Jacobian

---

### 1. Anatomy of a Robot Manipulator: Links, Joints, and Spaces

Imagine your own right arm reaching for a coffee mug on a desk. Your upper arm and forearm are rigid bones that do not bend or stretch; in robotics, these rigid segments are called **Links** ($L_1, L_2, \dots$). Connecting those rigid links are movable hinges—your shoulder and elbow—called **Joints**.

#### 1.1 Revolute vs. Prismatic Joints & Degrees of Freedom (DOF)

Nearly every industrial robot arm is built from just two fundamental joint types:

* **Revolute Joint ($\text{R}$):** A rotary hinge driven by a motor or servo that changes the angle $\theta_i$ (measured in radians) between two links.
* **Prismatic Joint ($\text{P}$):** A linear slider or telescoping piston that changes the straight-line extension distance $d_i$ (measured in meters) between two links.

We classify robot arms by listing their joint sequence from base to tip. For example, a two-joint rotational arm moving in a flat plane is a **2-DOF Planar $\text{RR}$ (Revolute-Revolute) Manipulator**, while a warehouse gantry crane with three perpendicular linear rails is a **3-DOF $\text{PPP}$ (Cartesian) Manipulator**.

#### 1.2 Joint Space vs. Cartesian Task Space

Every robot manipulator lives in two mathematical worlds at the same time:

1. **Joint Space ($\mathbf{q} = [\theta_1, \theta_2]^T$):** The vector of internal motor angles. Your motors and rotary encoders *only* understand Joint Space—a motor controller can command $\theta_1 = 0.5\text{ rad}$, never *"move to $(x=0.4\text{ m}, y=0.3\text{ m})$."*
2. **Cartesian Task Space ($\mathbf{x} = [x, y]^T$ or $[x, y, \phi]^T$):** The real-world coordinates (and orientation angle $\phi$) of the robot's hand, gripper, or tool tip—formally called the **End-Effector**. Cameras, weld seams, and coffee mugs live in Task Space.

Bridging these two spaces is the subject of **Kinematics** (the geometry of motion without considering mass or forces):

```
The Two Fundamental Bridges of Robot Kinematics
===============================================

   JOINT SPACE (Motors)                               TASK SPACE (World)
+------------------------+    Forward Kinematics    +------------------------+
|                        | -----------------------> |                        |
|   q = [theta_1,        |   Unique, closed-form    |   x = [x_gripper,      |
|        theta_2]^T      |   trigonometry           |        y_gripper]^T    |
|                        |                          |                        |
|  (What motors control) | <----------------------- |  (Where objects live)  |
+------------------------+    Inverse Kinematics    +------------------------+
                             Non-linear: 0, 1, 2,
                             or infinite solutions!
```

* **Forward Kinematics (FK):** *"Given the current joint angles $(\theta_1, \theta_2)$, where is the gripper $(x, y)$?"* Always has a single, unambiguous answer.
* **Inverse Kinematics (IK):** *"Given a desired target $(x, y)$ for the gripper, what joint angles $(\theta_1, \theta_2)$ will put it there?"* Much harder! Depending on where $(x, y)$ is located, there may be **zero** solutions (out of reach), **one** solution (at the boundary), **two** solutions (Elbow-Up vs. Elbow-Down), or **infinitely many** solutions (redundant arms).

---

### 2. Forward Kinematics (FK): From Joint Angles to Gripper Coordinates

#### 2.1 Method 1: Geometric Derivation for a 2-Link Planar Arm

Consider a 2-link planar arm mounted at the world origin $(0, 0)$ with upper-arm length $L_1$ and forearm length $L_2$:

* **Shoulder Angle $\theta_1$:** Measured counter-clockwise from the world $+X$ axis to Link 1.
* **Elbow Angle $\theta_2$:** Measured counter-clockwise **relative to the straight-line extension of Link 1** (so $\theta_2 = 0$ means the elbow is locked straight).

Because Link 1 is already tilted at angle $\theta_1$ relative to the world $+X$ axis, and Link 2 bends by an additional $\theta_2$ relative to Link 1, **Link 2's total absolute angle in the world frame is $\theta_1 + \theta_2$**:

```
2-Link Planar Manipulator Geometry (Forward Kinematics)
=======================================================

   ^ +Y (World)                             * Gripper / End-Effector (x, y)
   |                                       /|
   |                                 L_2  / |
   |                        .            /  | L_2 * sin(theta_1 + theta_2)
   |             theta_2  /   .         /   |
   |                     |  .          /    |
   |                    Elbow --------+-----+
   |                   (x_1, y_1)       L_2 * cos(theta_1 + theta_2)
   |                    / |
   |              L_1  /  |
   |                  /   | y_1 = L_1 * sin(theta_1)
   |                 /    |
   |      theta_1   / )   |
   +---------------+------+---------------------> +X (World)
 (0,0) Shoulder     x_1 = L_1 * cos(theta_1)
```

Walking from the shoulder $(0,0)$ to the elbow $(x_1, y_1)$ and then from the elbow to the gripper $(x, y)$ is simple vector addition:

1. **Elbow Position $(x_1, y_1)$:**
   $$x_1 = L_1 \cos\theta_1, \qquad y_1 = L_1 \sin\theta_1$$
2. **Gripper Position $(x, y)$ and Orientation $\phi$:**
   $$x = L_1 \cos\theta_1 + L_2 \cos(\theta_1 + \theta_2)$$
   $$y = L_1 \sin\theta_1 + L_2 \sin(\theta_1 + \theta_2)$$
   $$\phi = \theta_1 + \theta_2$$

#### 2.2 Method 2: Chaining $SE(2)$ Homogeneous Transformation Matrices

Why did we learn $3\times 3$ Homogeneous Transformation Matrices in Part 1? Because when a robot has 6 or 7 joints in 3D space, drawing right triangles by hand becomes nearly impossible. Instead, we attach a local coordinate frame to each joint and multiply transformation matrices along the chain from base to tip:

$$T_{\text{world}}^{\text{gripper}} = \underbrace{\text{Rot}(\theta_1)\,\text{Trans}(L_1, 0)}_{T_{\text{world}}^{\text{elbow}}} \cdot \underbrace{\text{Rot}(\theta_2)\,\text{Trans}(L_2, 0)}_{T_{\text{elbow}}^{\text{gripper}}}$$

Recalling that rotating by $\theta_i$ and then translating along the link's local $+X$ axis by $L_i$ gives:

$$T_i(\theta_i, L_i) = \begin{bmatrix} \cos\theta_i & -\sin\theta_i & 0 \\ \sin\theta_i & \cos\theta_i & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} 1 & 0 & L_i \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix} = \begin{bmatrix} \cos\theta_i & -\sin\theta_i & L_i\cos\theta_i \\ \sin\theta_i & \cos\theta_i & L_i\sin\theta_i \\ 0 & 0 & 1 \end{bmatrix}$$

Multiplying $T_1(\theta_1, L_1) \cdot T_2(\theta_2, L_2)$ and applying the angle-sum identities $\cos(\theta_1+\theta_2) = \cos\theta_1\cos\theta_2 - \sin\theta_1\sin\theta_2$ and $\sin(\theta_1+\theta_2) = \sin\theta_1\cos\theta_2 + \cos\theta_1\sin\theta_2$ yields:

$$T_{\text{world}}^{\text{gripper}} = \begin{bmatrix} \cos(\theta_1+\theta_2) & -\sin(\theta_1+\theta_2) & L_1\cos\theta_1 + L_2\cos(\theta_1+\theta_2) \\ \sin(\theta_1+\theta_2) & \cos(\theta_1+\theta_2) & L_1\sin\theta_1 + L_2\sin(\theta_1+\theta_2) \\ 0 & 0 & 1 \end{bmatrix}$$

Look at the third column of $T_{\text{world}}^{\text{gripper}}$: it automatically contains the exact $(x, y)$ position of the gripper, while the top-left $2\times 2$ block contains the gripper's orientation $\phi = \theta_1 + \theta_2$! Even better, if you need the intermediate elbow position to draw the robot on screen or check for obstacle collisions, you just inspect the third column of the first matrix $T_1(\theta_1, L_1)$.

#### 2.3 Concrete FK Dry Run ($L_1 = 1.0\text{ m}, L_2 = 1.0\text{ m}$)

| Pose Name | $\theta_1$ ($\text{deg} / \text{rad}$) | $\theta_2$ ($\text{deg} / \text{rad}$) | $\theta_1 + \theta_2$ | Elbow $(x_1, y_1)$ ($\text{m}$) | Gripper $(x, y)$ ($\text{m}$) | Physical Configuration |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Home (Stretched $+X$)** | $0^\circ$ ($0.00$) | $0^\circ$ ($0.00$) | $0^\circ$ | $(1.00, 0.00)$ | **$(2.00, 0.00)$** | Fully extended along $+X$ axis |
| **L-Shape (Elbow $90^\circ$)** | $0^\circ$ ($0.00$) | $+90^\circ$ ($+\frac{\pi}{2}$) | $+90^\circ$ | $(1.00, 0.00)$ | **$(1.00, 1.00)$** | Upper arm right, forearm straight up |
| **Vertical Reach ($+Y$)** | $+90^\circ$ ($+\frac{\pi}{2}$) | $0^\circ$ ($0.00$) | $+90^\circ$ | $(0.00, 1.00)$ | **$(0.00, 2.00)$** | Fully extended straight up $+Y$ |
| **Folded Back** | $+45^\circ$ ($+\frac{\pi}{4}$) | $+180^\circ$ ($\pi$) | $+225^\circ$ | $(0.71, 0.71)$ | **$(0.00, 0.00)$** | Forearm folded back onto shoulder |

---

### 3. Analytical Inverse Kinematics (IK): Geometry & The Law of Cosines

Now let's reverse the problem: a vision system spots a part at $(x, y)$ and asks for the joint angles $(\theta_1, \theta_2)$ that place the gripper at $(x, y)$.

#### 3.1 Step 1: Workspace & Reachability Check

Before computing any inverse trigonometry, we must check whether the target $(x, y)$ is physically reachable. Let $r$ be the straight-line distance from the shoulder $(0,0)$ to the target $(x, y)$:

$$r^2 = x^2 + y^2 \qquad \Longrightarrow \qquad r = \sqrt{x^2 + y^2}$$

* The farthest the arm can reach is when both links are stretched straight out ($\theta_2 = 0$): $r_{\max} = L_1 + L_2$.
* The closest the arm can reach to its own shoulder is when the elbow folds completely back ($\theta_2 = \pi$): $r_{\min} = |L_1 - L_2|$.

Therefore, the **Reachable Workspace** is a flat ring (annulus) defined by:

$$|L_1 - L_2| \le \sqrt{x^2 + y^2} \le L_1 + L_2$$

If $L_1 \ne L_2$, there is a circular "dead zone" of radius $|L_1 - L_2|$ around the shoulder that the gripper can never touch!

```
The Two IK Postures (Elbow-Down vs. Elbow-Up) & Law of Cosines Triangle
=======================================================================

            Elbow-Up Solution (theta_2 < 0)
                   * (x_1', y_1')
                  / \
            L_1  /   \  L_2
                /     \
               /   r   \
   Shoulder (0,0) - - - * Target (x, y)
            \  ) beta  /  (Distance r = sqrt(x^2 + y^2),
         L_1 \        /    Target angle gamma = atan2(y, x))
              \      / L_2
               \    / ) <-- Interior angle = pi - theta_2
                \  /
                 * (x_1, y_1)  /  theta_2 > 0
            Elbow-Down Solution
```

#### 3.2 Step 2: Solving for Elbow Angle $\theta_2$ via the Law of Cosines

Look at the triangle formed by the shoulder $(0,0)$, the elbow $(x_1, y_1)$, and the target $(x, y)$ in the diagram above. Its three side lengths are $L_1$, $L_2$, and $r = \sqrt{x^2 + y^2}$.

Because $\theta_2$ is the exterior bend angle at the elbow, the **interior angle** of the triangle opposite side $r$ is $\pi - \theta_2$ ($180^\circ - \theta_2$). Applying the **Law of Cosines** ($c^2 = a^2 + b^2 - 2ab\cos C$) gives:

$$r^2 = x^2 + y^2 = L_1^2 + L_2^2 - 2 L_1 L_2 \cos(\pi - \theta_2)$$

Using the trigonometric identity $\cos(\pi - \theta_2) = -\cos\theta_2$, the minus sign flips to a plus sign:

$$x^2 + y^2 = L_1^2 + L_2^2 + 2 L_1 L_2 \cos\theta_2$$

Solving for $\cos\theta_2$:

$$\cos\theta_2 = \frac{x^2 + y^2 - L_1^2 - L_2^2}{2 L_1 L_2}$$

Now, instead of calling `acos()` blindly, remember from the Pythagorean identity $\sin^2\theta_2 + \cos^2\theta_2 = 1$ that there are **two** opposite values of $\sin\theta_2$ for the same $\cos\theta_2$:

$$\sin\theta_2 = \pm\sqrt{1 - \cos^2\theta_2}$$

Passing both possibilities into `atan2(sin_theta2, cos_theta2)` gives both physical IK solutions:
* **Elbow-Down Posture ($\theta_2 \ge 0$):** Choose $+\sqrt{1 - \cos^2\theta_2}$ so $\theta_2 = \text{atan2}\!\left(+\sqrt{1 - \cos^2\theta_2},\, \cos\theta_2\right)$.
* **Elbow-Up Posture ($\theta_2 \le 0$):** Choose $-\sqrt{1 - \cos^2\theta_2}$ so $\theta_2 = \text{atan2}\!\left(-\sqrt{1 - \cos^2\theta_2},\, \cos\theta_2\right)$.

#### 3.3 Step 3: Solving for Shoulder Angle $\theta_1$

Once $\theta_2$ is known (either Elbow-Down or Elbow-Up), finding the shoulder angle $\theta_1$ is pure right-triangle geometry:

1. Let $\gamma = \text{atan2}(y, x)$ be the angle from the world $+X$ axis directly to the target $(x, y)$.
2. Let $\beta$ be the interior angle of our arm triangle at the shoulder (between Link 1 and the line segment $r$). If we project the triangle along Link 1, the adjacent side has length $L_1 + L_2\cos\theta_2$ and the opposite perpendicular side has height $L_2\sin\theta_2$:
   $$\beta = \text{atan2}\!\left(L_2\sin\theta_2,\; L_1 + L_2\cos\theta_2\right)$$
3. Subtracting $\beta$ from $\gamma$ gives $\theta_1$:
   $$\theta_1 = \text{atan2}(y, x) - \text{atan2}\!\left(L_2\sin\theta_2,\; L_1 + L_2\cos\theta_2\right)$$

Why is writing $\beta$ with $\sin\theta_2$ inside `atan2` so elegant? Because when $\theta_2 > 0$ (Elbow-Down), $\sin\theta_2 > 0 \implies \beta > 0$, so $\theta_1 = \gamma - |\beta|$ aims the shoulder *below* the target line. When $\theta_2 < 0$ (Elbow-Up), $\sin\theta_2 < 0 \implies \beta < 0$, so $\theta_1 = \gamma - (-|\beta|) = \gamma + |\beta|$ automatically aims the shoulder *above* the target line! One formula handles both postures.

---

### 4. The Manipulator Jacobian $\mathbf{J}(\mathbf{q})$: Velocities, Singularities & Numerical IK

#### 4.1 Deriving the Velocity Jacobian via the Chain Rule

Analytical IK works beautifully for a simple 2-link arm, but what if your robot has 7 joints, or what if you want to know how fast the gripper moves ($\dot{x}, \dot{y}$) when the motors spin at angular velocities ($\dot{\theta}_1, \dot{\theta}_2$)?

Differentiating our Forward Kinematics equations $x(\theta_1, \theta_2)$ and $y(\theta_1, \theta_2)$ with respect to time $t$ using the multivariable chain rule gives:

$$\dot{x} = \frac{\partial x}{\partial \theta_1}\dot{\theta}_1 + \frac{\partial x}{\partial \theta_2}\dot{\theta}_2 = \big(-L_1\sin\theta_1 - L_2\sin(\theta_1+\theta_2)\big)\dot{\theta}_1 + \big(-L_2\sin(\theta_1+\theta_2)\big)\dot{\theta}_2$$

$$\dot{y} = \frac{\partial y}{\partial \theta_1}\dot{\theta}_1 + \frac{\partial y}{\partial \theta_2}\dot{\theta}_2 = \big(L_1\cos\theta_1 + L_2\cos(\theta_1+\theta_2)\big)\dot{\theta}_1 + \big(L_2\cos(\theta_1+\theta_2)\big)\dot{\theta}_2$$

Packing these partial derivatives into a matrix gives the **Manipulator Jacobian** $\mathbf{J}(\mathbf{q})$:

$$\begin{bmatrix} \dot{x} \\ \dot{y} \end{bmatrix} = \underbrace{\begin{bmatrix} -L_1\sin\theta_1 - L_2\sin(\theta_1+\theta_2) & -L_2\sin(\theta_1+\theta_2) \\ L_1\cos\theta_1 + L_2\cos(\theta_1+\theta_2) & L_2\cos(\theta_1+\theta_2) \end{bmatrix}}_{\mathbf{J}(\theta_1, \theta_2)} \begin{bmatrix} \dot{\theta}_1 \\ \dot{\theta}_2 \end{bmatrix} \quad \Longleftrightarrow \quad \dot{\mathbf{x}} = \mathbf{J}(\mathbf{q})\,\dot{\mathbf{q}}$$

Each column of $\mathbf{J}(\mathbf{q})$ has a crystal-clear physical meaning:
* **Column 1** is the instantaneous velocity vector $[\dot{x}, \dot{y}]^T$ of the gripper if Joint 1 spins at $1\text{ rad/s}$ while Joint 2 is frozen.
* **Column 2** is the instantaneous velocity vector $[\dot{x}, \dot{y}]^T$ of the gripper if Joint 2 spins at $1\text{ rad/s}$ while Joint 1 is frozen.

#### 4.2 Kinematic Singularities: What Happens When $\det(\mathbf{J}) = 0$?

Suppose we want to move the gripper at a desired Cartesian velocity $\dot{\mathbf{x}}_{\text{des}} = [\dot{x}, \dot{y}]^T$. Can we just invert the Jacobian matrix to find the required motor speeds $\dot{\mathbf{q}} = \mathbf{J}^{-1}\dot{\mathbf{x}}_{\text{des}}$?

Let's compute the determinant of our $2\times 2$ Jacobian $\mathbf{J}(\theta_1, \theta_2)$ ($ad - bc$):

$$\det(\mathbf{J}) = L_1 L_2 \big(\cos(\theta_1+\theta_2)(-\sin\theta_1) - (-\sin(\theta_1+\theta_2))\cos\theta_1\big)$$

Using the trig identity $\sin(A - B) = \sin A\cos B - \cos A\sin B$ with $A = \theta_1 + \theta_2$ and $B = \theta_1$, everything simplifies to a single jaw-droppingly clean expression:

$$\det(\mathbf{J}) = L_1 L_2 \sin\theta_2$$

When does $\det(\mathbf{J}) = 0$ (making $\mathbf{J}^{-1}$ divide by zero)? **Whenever $\sin\theta_2 = 0$, which happens at $\theta_2 = 0^\circ$ (fully stretched out) or $\theta_2 = \pm 180^\circ$ (fully folded back)!**

```
Physical Meaning of a Kinematic Singularity (theta_2 = 0, Arm Stretched Out)
============================================================================

                            ^ Possible instantaneous motion (+Y tangent ONLY)
                            |
   Shoulder (0,0) ======O===+===O=======* Gripper (L_1 + L_2, 0) ---> X (IMPOSSIBLE!)
                  Link 1  Elbow  Link 2  |
                                         v (-Y tangent ONLY)

   At theta_2 = 0:
   Col 1 of J = [0, L_1 + L_2]^T  (Points straight along +Y)
   Col 2 of J = [0, L_2]^T        (Also points straight along +Y!)
   Neither motor can produce ANY velocity along the X axis! Rank(J) drops from 2 to 1.
```

These configurations are called **Kinematic Singularities**. At $\theta_2 = 0$, both columns of $\mathbf{J}$ point in the exact same direction. The robot temporarily loses a degree of freedom: no finite motor speed can move the gripper radially outward or inward, and calling $\mathbf{J}^{-1}\dot{\mathbf{x}}$ near $\theta_2 \approx 0$ commands **infinite motor velocities** that trip hardware safety breakers!

#### 4.3 Damped Least Squares (DLS) Numerical IK

To step the robot smoothly toward a target $\mathbf{x}_{\text{target}}$ even when passing right through a singularity—or on a 6-DOF/7-DOF arm where no closed-form Law of Cosines formula exists—robotics engineers use **Damped Least Squares (Levenberg-Marquardt) Inverse Kinematics**:

$$\Delta \mathbf{q} = \mathbf{J}^T \left(\mathbf{J}\mathbf{J}^T + \lambda^2 \mathbf{I}\right)^{-1} \left(\mathbf{x}_{\text{target}} - \mathbf{x}_{\text{current}}\right)$$

By adding $\lambda^2 \mathbf{I}$ (where $\lambda \approx 0.05$ is a small damping constant) before inverting, the matrix $\mathbf{J}\mathbf{J}^T + \lambda^2 \mathbf{I}$ is **guaranteed to be invertible** even when $\det(\mathbf{J}) = 0$. Far from a singularity, it behaves like the exact inverse; near a singularity, it gracefully scales down joint velocities instead of exploding to infinity.

#### 4.4 Bonus Superpower of the Jacobian: Static Force-Torque Duality ($\boldsymbol{\tau} = \mathbf{J}^T \mathbf{F}$)

The Manipulator Jacobian $\mathbf{J}(\mathbf{q})$ does more than map joint velocities to gripper velocities ($\dot{\mathbf{x}} = \mathbf{J}\dot{\mathbf{q}}$). By the **Principle of Virtual Work**, the mechanical power at the joints ($\boldsymbol{\tau}^T \dot{\mathbf{q}}$) must equal the mechanical power at the gripper ($\mathbf{F}^T \dot{\mathbf{x}}$):

$$\boldsymbol{\tau}^T \dot{\mathbf{q}} = \mathbf{F}^T \dot{\mathbf{x}} = \mathbf{F}^T \big(\mathbf{J}(\mathbf{q})\,\dot{\mathbf{q}}\big) = \big(\mathbf{J}(\mathbf{q})^T \mathbf{F}\big)^T \dot{\mathbf{q}}$$

Since this holds for any virtual velocity $\dot{\mathbf{q}}$, the transpose of the exact same Jacobian matrix maps a Cartesian force vector $\mathbf{F} = [F_x, F_y]^T$ at the gripper directly into the required motor torques $\boldsymbol{\tau} = [\tau_1, \tau_2]^T$:

$$\begin{bmatrix} \tau_1 \\ \tau_2 \end{bmatrix} = \mathbf{J}(\mathbf{q})^T \begin{bmatrix} F_x \\ F_y \end{bmatrix}$$

Notice what happens at the stretched-out singularity ($\theta_2 = 0$, pointing along $+X$):
* **Velocity side:** You *cannot* move along $+X$, because neither motor can push the tip further out.
* **Force side:** If someone pushes inward on the gripper along $-X$ ($F_x = -500\text{ N}, F_y = 0$), then $\boldsymbol{\tau} = \mathbf{J}^T [-500, 0]^T = [0, 0]^T$! The structural bones of the links absorb $100\%$ of the radial load with **zero motor torque**—the exact same reason you lock your knees straight when standing with a heavy barbell!

---

### 5. Complete Code Implementations: FK, Analytical IK & Damped Jacobian IK

#### 5.1 Complete C++17 Implementation

```cpp
#include <iostream>
#include <iomanip>
#include <cmath>
#include <algorithm>

struct Vec2 { double x, y; };
struct JointState { double theta1, theta2; bool valid; };

class Planar2LinkArm {
public:
    Planar2LinkArm(double l1, double l2) : l1_(l1), l2_(l2) {}

    // 1. Forward Kinematics: (theta1, theta2) -> (x, y)
    Vec2 forwardKinematics(double theta1, double theta2) const {
        double x = l1_ * std::cos(theta1) + l2_ * std::cos(theta1 + theta2);
        double y = l1_ * std::sin(theta1) + l2_ * std::sin(theta1 + theta2);
        //                                        ^^^^^^^^^^^^^^^^^^^^^^^^^
        // Link 2's absolute angle in the world frame is the sum (theta1 + theta2).
        return {x, y};
    }

    // 2. Analytical Inverse Kinematics: (x, y) -> (theta1, theta2)
    JointState analyticalIK(double x, double y, bool elbow_up = false) const {
        double r_sq = x * x + y * y;
        double r = std::sqrt(r_sq);

        if (r > (l1_ + l2_) + 1e-6 || r < std::abs(l1_ - l2_) - 1e-6) {
            return {0.0, 0.0, false};
            //                ^^^^^
            // Target lies outside the reachable annulus [|L1 - L2|, L1 + L2].
        }

        double cos_t2 = (r_sq - l1_ * l1_ - l2_ * l2_) / (2.0 * l1_ * l2_);
        cos_t2 = std::clamp(cos_t2, -1.0, 1.0);
        //       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // CRITICAL: Clamp to [-1, 1] so floating-point rounding (e.g. 1.0000000000000002)
        // at the workspace boundary never causes std::sqrt(1 - cos_t2^2) to return NaN!

        double sin_t2 = std::sqrt(1.0 - cos_t2 * cos_t2);
        if (elbow_up) sin_t2 = -sin_t2;
        //                     ^^^^^^^
        // Flipping the sign of sin(theta2) switches between Elbow-Down (+) and Elbow-Up (-).

        double theta2 = std::atan2(sin_t2, cos_t2);
        double gamma  = std::atan2(y, x);
        double beta   = std::atan2(l2_ * sin_t2, l1_ + l2_ * cos_t2);
        double theta1 = gamma - beta;
        //              ^^^^^^^^^^^^
        // Subtracting interior shoulder angle beta from target angle gamma yields theta1.

        return {theta1, theta2, true};
    }

private:
    double l1_, l2_;
};

int main() {
    Planar2LinkArm arm(1.0, 1.0);
    double target_x = 1.0, target_y = 1.0;

    auto down = arm.analyticalIK(target_x, target_y, false);
    auto up   = arm.analyticalIK(target_x, target_y, true);
    auto fk_check = arm.forwardKinematics(down.theta1, down.theta2);

    const double RAD2DEG = 180.0 / 3.14159265358979323846;
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Target (1.00, 1.00) m:\n";
    std::cout << "  Elbow-Down : theta1 = " << down.theta1 * RAD2DEG << " deg, "
              << "theta2 = " << down.theta2 * RAD2DEG << " deg\n";
    std::cout << "  Elbow-Up   : theta1 = " << up.theta1 * RAD2DEG << " deg, "
              << "theta2 = " << up.theta2 * RAD2DEG << " deg\n";
    std::cout << "  FK Verify  : (" << fk_check.x << ", " << fk_check.y << ") m\n";
    return 0;
}
```

**What's happening:**
1. **`std::clamp(cos_t2, -1.0, 1.0)`**: This single line saves more production robots from crashing than almost any other trick in kinematics. When a target is exactly at maximum reach $r = L_1 + L_2$, IEEE-754 floating-point math often computes `cos_t2 = 1.0000000000000002`. Without clamping, `1.0 - cos_t2 * cos_t2` is `-4e-16`, and `std::sqrt(-4e-16)` returns `NaN`, poisoning every motor command downstream!
2. **`if (elbow_up) sin_t2 = -sin_t2`**: Selects between the two valid geometric branches before calling `std::atan2`.
3. **Verification**: For target $(1.0, 1.0)\text{ m}$ with $L_1=L_2=1.0\text{ m}$, Elbow-Down outputs $(\theta_1 = 0^\circ, \theta_2 = +90^\circ)$ while Elbow-Up outputs $(\theta_1 = +90^\circ, \theta_2 = -90^\circ)$. Both place the gripper at $(1.0, 1.0)\text{ m}$!

#### 5.2 Complete Python Implementation: Damped Least Squares Jacobian IK Loop

```python
import math

def damped_jacobian_ik(l1: float, l2: float, target_x: float, target_y: float,
                       t1: float = 0.0, t2: float = 0.0, damping: float = 0.1):
    """Iteratively drives a 2-link arm to (target_x, target_y), even from a singularity (t2=0)."""
    for step in range(50):
        # 1. Forward Kinematics at current joint angles (t1, t2)
        x = l1 * math.cos(t1) + l2 * math.cos(t1 + t2)
        y = l1 * math.sin(t1) + l2 * math.sin(t1 + t2)

        ex, ey = target_x - x, target_y - y
        #        ^^^^^^^^^^^^^^^^^^^^^^^^^^
        # Cartesian task-space position error vector e = x_target - x_current.
        if math.hypot(ex, ey) < 1e-4:
            break

        # 2. Evaluate the 2x2 Manipulator Jacobian J(t1, t2)
        j11 = -l1 * math.sin(t1) - l2 * math.sin(t1 + t2)
        j12 = -l2 * math.sin(t1 + t2)
        j21 =  l1 * math.cos(t1) + l2 * math.cos(t1 + t2)
        j22 =  l2 * math.cos(t1 + t2)

        # 3. Compute (J * J^T + lambda^2 * I) for 2x2 system
        lam2 = damping * damping
        a11 = j11 * j11 + j12 * j12 + lam2
        a12 = j11 * j21 + j12 * j22
        a22 = j21 * j21 + j22 * j22 + lam2
        det_a = a11 * a22 - a12 * a12
        #       ^^^^^^^^^^^^^^^^^^^^^
        # Because lam2 > 0, det_a is strictly positive even at the t2 = 0 singularity!

        # 4. Solve v = (J * J^T + lambda^2 * I)^(-1) * e, then dq = J^T * v
        vx = ( a22 * ex - a12 * ey) / det_a
        vy = (-a12 * ex + a11 * ey) / det_a
        t1 += j11 * vx + j21 * vy
        t2 += j12 * vx + j22 * vy

    return t1, t2

if __name__ == "__main__":
    # Start right inside the stretched-out singularity (t1 = 0, t2 = 0)!
    t1_sol, t2_sol = damped_jacobian_ik(1.0, 1.0, target_x=0.5, target_y=1.2, t1=0.0, t2=0.01)
    print(f"Converged Angles: theta1 = {math.degrees(t1_sol):.2f} deg, theta2 = {math.degrees(t2_sol):.2f} deg")
```

**What's happening:**
1. **`ex, ey = target_x - x, target_y - y`**: Measures the remaining straight-line Cartesian error vector $\mathbf{e}$ between where the gripper is and where it needs to go.
2. **`a11 = j11*j11 + j12*j12 + lam2`**: Adds $\lambda^2$ to the diagonal of $\mathbf{J}\mathbf{J}^T$. Without `lam2`, starting near `t2 = 0` would make `det_a` nearly zero and cause a massive numerical explosion.
3. **`t1 += j11 * vx + j21 * vy`**: Multiplies by $\mathbf{J}^T$ to map the damped Cartesian correction back into smooth joint angle increments $\Delta\theta_1, \Delta\theta_2$.

#### 5.3 Numerical Dry Run: Analytical IK Step-by-Step ($L_1 = 1.0\text{ m}, L_2 = 1.0\text{ m}$)

| Step / Formula | Target A: $(1.00, 1.00)\text{ m}$ | Target B: $(0.00, 2.00)\text{ m}$ | Target C: $(2.50, 0.00)\text{ m}$ |
| :--- | :---: | :---: | :---: |
| **1. $r^2 = x^2 + y^2$** | $1^2 + 1^2 = 2.00\text{ m}^2$ | $0^2 + 2^2 = 4.00\text{ m}^2$ | $2.5^2 + 0^2 = 6.25\text{ m}^2$ |
| **2. Reachable? ($0 \le r \le 2.0$)** | $r = 1.414\text{ m}$ (**Yes**) | $r = 2.000\text{ m}$ (**Boundary**) | $r = 2.500\text{ m}$ (**No! Abort**) |
| **3. $\cos\theta_2 = \frac{r^2 - L_1^2 - L_2^2}{2L_1L_2}$** | $\frac{2 - 1 - 1}{2} = 0.000$ | $\frac{4 - 1 - 1}{2} = 1.000$ | $\frac{6.25 - 2}{2} = 2.125 > 1$ |
| **4. $\sin\theta_2 = \pm\sqrt{1 - \cos^2\theta_2}$** | $\pm 1.000$ | $0.000$ | — |
| **5. $\theta_2 = \text{atan2}(\sin\theta_2, \cos\theta_2)$** | $+90^\circ$ (Down) / $-90^\circ$ (Up) | $0^\circ$ (Single stretched solution) | — |
| **6. $\gamma = \text{atan2}(y, x)$** | $+45^\circ$ ($\frac{\pi}{4}\text{ rad}$) | $+90^\circ$ ($\frac{\pi}{2}\text{ rad}$) | — |
| **7. $\beta = \text{atan2}(L_2\sin\theta_2, L_1+L_2\cos\theta_2)$** | $+45^\circ$ (Down) / $-45^\circ$ (Up) | $0^\circ$ | — |
| **8. $\theta_1 = \gamma - \beta$** | **$0^\circ$ (Down) / $+90^\circ$ (Up)** | **$+90^\circ$** | — |

---

### 6. Common Mistakes & Debugging Checklist

| Symptom in Your Robot Arm | Root Cause | Concrete Fix |
| :--- | :--- | :--- |
| **`analyticalIK` returns `NaN` when reaching full extension** | Floating-point inaccuracy makes `cos_t2 = 1.0000000000000002`, causing `sqrt(1 - cos_t2^2)` to fail. | Always clamp `cos_t2 = std::clamp(cos_t2, -1.0, 1.0)` before calling `sqrt` or `acos`. |
| **Gripper lands in the wrong place whenever $\theta_1 \ne 0$** | You wrote `L2 * cos(theta2)` instead of `L2 * cos(theta1 + theta2)` in Forward Kinematics. | Remember $\theta_2$ is measured relative to Link 1, so Link 2's world angle is $\theta_1 + \theta_2$. |
| **Arm violently flips between Elbow-Up and Elbow-Down mid-path** | Your IK solver switched sign on `sin_t2` between consecutive trajectory waypoints. | Keep the posture branch (`elbow_up`) consistent along a continuous path, or pick the solution closest to `q_prev`. |
| **Motors command $10,000\text{ rad/s}$ when the arm straightens out** | Inverting the raw Jacobian $\mathbf{J}^{-1}$ near a kinematic singularity ($\theta_2 \approx 0$ or $\pi$). | Use Damped Least Squares $\mathbf{J}^T(\mathbf{J}\mathbf{J}^T + \lambda^2\mathbf{I})^{-1}$ with $\lambda \in [0.05, 0.2]$. |

---

### 7. Quick Reference Summary

| Concept | Formula (2-Link Planar RR Arm) | Key Engineering Takeaway |
| :--- | :--- | :--- |
| **Forward Kinematics (FK)** | $x = L_1 c_1 + L_2 c_{12}, \quad y = L_1 s_1 + L_2 s_{12}$ | $c_1 = \cos\theta_1, c_{12} = \cos(\theta_1+\theta_2)$; always unique. |
| **Reachable Workspace** | $|L_1 - L_2| \le \sqrt{x^2 + y^2} \le L_1 + L_2$ | Annulus (ring) between folded and stretched radii. |
| **IK Elbow Angle $\theta_2$** | $\cos\theta_2 = \frac{x^2 + y^2 - L_1^2 - L_2^2}{2L_1L_2}, \; \theta_2 = \text{atan2}(\pm\sqrt{1-\cos^2\theta_2}, \cos\theta_2)$ | Clamp $\cos\theta_2 \in [-1,1]$; $+$ gives Elbow-Down, $-$ gives Elbow-Up. |
| **IK Shoulder Angle $\theta_1$** | $\theta_1 = \text{atan2}(y,x) - \text{atan2}(L_2\sin\theta_2, L_1 + L_2\cos\theta_2)$ | Automatically adjusts for both Elbow-Up and Elbow-Down. |
| **Manipulator Jacobian $\mathbf{J}$** | $\mathbf{J} = \begin{bmatrix} -L_1 s_1 - L_2 s_{12} & -L_2 s_{12} \\ L_1 c_1 + L_2 c_{12} & L_2 c_{12} \end{bmatrix}$ | Maps joint speeds to tip velocity: $\dot{\mathbf{x}} = \mathbf{J}(\mathbf{q})\dot{\mathbf{q}}$. |
| **Singularity Condition** | $\det(\mathbf{J}) = L_1 L_2 \sin\theta_2 = 0 \iff \theta_2 \in \{0, \pm\pi\}$ | Arm cannot move radially when fully stretched or folded. |
| **Damped Least Squares IK** | $\Delta\mathbf{q} = \mathbf{J}^T(\mathbf{J}\mathbf{J}^T + \lambda^2\mathbf{I})^{-1}\mathbf{e}$ | Safely steps through singularities without dividing by zero. |

---

### 8. Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Frontend Implementation Guide):** Build an interactive **2-Link Manipulator FK, IK & Singularity Explorer** using React, Tailwind CSS, SVG/Canvas, and `shadcn/ui` components. Never use raw HTML `<input>`, `<select>`, or `<button>` elements.

#### 8.1 Layout & Component Hierarchy (`shadcn/ui`)

1. **Top-Level Container:** `<Card className="w-full max-w-6xl mx-auto border-border/60 bg-card/95 shadow-lg">` with `<CardHeader>`, `<CardTitle>`, and a live status `<Badge>` showing `Reachable`, `Singularity Warning (|det(J)| < 0.1)`, or `Out of Reach`.
2. **Mode Switcher (`<Tabs>`):**
   * `<Tabs defaultValue="ik-playground">`:
     * `<TabsTrigger value="fk-mode">1. Forward Kinematics (Drive Joints)</TabsTrigger>`
     * `<TabsTrigger value="ik-playground">2. Analytical IK (Drag Target & Posture)</TabsTrigger>`
     * `<TabsTrigger value="jacobian-ellipse">3. Velocity Jacobian & Singularity Ellipsoid</TabsTrigger>`
3. **Control Dock (Left Column, 4 cols on desktop):**
   * **Link Lengths $L_1, L_2$ (`<Slider>`):** Two sliders (`0.4 m` to `1.5 m`) dynamically resizing the inner dead-zone circle $|L_1 - L_2|$ and outer workspace circle $L_1 + L_2$.
   * **Joint Space Sliders (`<Slider>`):** $\theta_1 \in [-180^\circ, +180^\circ]$ and $\theta_2 \in [-180^\circ, +180^\circ]$ (draggable in FK mode; auto-updated in IK mode).
   * **IK Posture Toggle (`<Switch>`):** Switches primary rendered arm between `Elbow-Down (theta_2 >= 0)` and `Elbow-Up (theta_2 <= 0)`, with a secondary `<Switch>` for `Show Ghost Alternate Posture`.
   * **Solver Selector (`<Select>`):** Choose `Analytical (Law of Cosines)`, `Raw Jacobian Inverse (Unstable at Singularity)`, or `Damped Least Squares (DLS)` with a Damping $\lambda$ `<Slider>`.
   * **Preset Poses (`<Button variant="outline" size="sm">`):** `Home (0, 0) Singularity`, `L-Shape (0, 90)`, and `Folded (0, 180) Singularity`.
4. **Interactive SVG Canvas & Matrix Readout (Right Column, 8 cols on desktop):**
   * **2D Workspace Canvas:**
     * Shaded annular reachable workspace ring ($|L_1 - L_2| \le r \le L_1 + L_2$) with dashed inner and outer boundary circles.
     * Draggable target crosshair $(x_{\text{target}}, y_{\text{target}})$ with live radius line $r$ and angle arc $\gamma$.
     * Primary robot arm rendered with shoulder pivot, Link 1, elbow joint, Link 2, and gripper, plus optional semi-transparent ghost arm showing the second IK solution.
     * In Tab 3, render the **Manipulability Velocity Ellipse** at the gripper tip (derived from $\mathbf{J}\mathbf{J}^T$), visually squashing into a flat 1D line as $\theta_2 \to 0^\circ$!
   * **Live Telemetry (`<Table>`):** Displays $x, y, r, \cos\theta_2, \theta_1, \theta_2$, and $\det(\mathbf{J}) = L_1 L_2 \sin\theta_2$ with `<Tooltip>` explanations on hover.
