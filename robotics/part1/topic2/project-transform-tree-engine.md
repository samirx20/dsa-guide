# Part 1, Topic 2: Matrices, Reference Frames & Coordinate Transformations
## Project: Build a `tf2`-Style Coordinate Frame Tree Engine

---

## Project Overview & Real-World Motivation

In ROS 2 (Robot Operating System), the single most heavily used library is **`tf2` (Transform Library 2)**.
Why? Because a real autonomous system—like a mobile manipulator robot operating in a warehouse—has dozens of coordinate frames moving simultaneously:
- `map` / `world`: The fixed building coordinate frame.
- `odom`: The robot's wheel-odometry starting frame.
- `base_link`: The center of the mobile robot's drive axle.
- `front_lidar` and `rear_lidar`: Laser scanners bolted to the front and back corners of the chassis.
- `arm_base` $\to$ `shoulder_link` $\to$ `elbow_link` $\to$ `wrist_camera` $\to$ `gripper`: A multi-link robotic arm mounted on top of the mobile base.

Now suppose `front_lidar` detects a box at $\mathbf{p}_{\text{front\_lidar}} = [1.5, 0.2]^T$, and the robot wants to know:
1. *"Where is that box in the `world` frame?"*
2. *"Where is that box relative to my `gripper` frame so I can close my fingers around it?"*

Notice that nobody directly measured the transform from `front_lidar` to `gripper`! Instead, each subsystem only publishes its **parent-to-child** transform (`world` $\to$ `base_link`, `base_link` $\to$ `front_lidar`, `base_link` $\to$ `arm_base` $\to$ `gripper`). Together, these parent-to-child links form a **Directed Tree of Coordinate Frames**.

To find the transform $^{\text{gripper}}_{\text{front\_lidar}}\mathbf{T}$ between **any two arbitrary frames in the tree**, your engine must:
1. Search the tree to find the **shortest path** connecting the `source_frame` (`front_lidar`) to the `target_frame` (`gripper`) through their **Lowest Common Ancestor (`base_link`)**.
2. Invert transforms when walking **up** the tree (child $\to$ parent, using $\mathbf{T}^{-1} = \begin{bmatrix}\mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1\end{bmatrix}$) and multiply normally when walking **down** the tree (parent $\to$ child).

In this capstone project for Part 1, you will build a complete, zero-dependency, production-grade **`TransformTree2D` ($SE(2)$) Engine** in C++17 and Python!

---

## 1. System Architecture & Frame Tree Geometry

Let's visualize the exact 6-frame mobile manipulator tree we will model and test in our engine:

```
                                [ world ]
                                    |
                                    | ^world_base_link T = (x=3.0, y=2.0, yaw=+90 deg)
                                    v
                              [ base_link ]
                    /               |               \
                   /                |                \
    ^base_lidar T /   ^base_arm T   |                 \ ^base_rear_cam T
    (0.5, 0.2,    |   (0.0, 0.0,    |                  | (-0.4, 0.0,
     0 deg)       v    -90 deg)     v                  v  +180 deg)
          [ front_lidar ]     [ arm_base ]       [ rear_camera ]
                                    |
                                    | ^arm_gripper T = (0.8, 0.0, +45 deg)
                                    v
                              [ gripper ]
```

### How `lookup_transform(target_frame, source_frame)` Works

Suppose a user calls `lookup_transform(target="gripper", source="front_lidar")`, which asks for $^{\text{gripper}}_{\text{front\_lidar}}\mathbf{T}$ (the matrix that converts a point $^{\text{front\_lidar}}\tilde{\mathbf{p}}$ into $^{\text{gripper}}\tilde{\mathbf{p}}$):

1. **Trace Ancestors of `source` (`front_lidar`) up to the Root (`world`)**:
   $$\text{Path}_{\text{source}\to\text{root}}: \quad \texttt{front\_lidar} \xrightarrow{^{\text{base}}_{\text{lidar}}\mathbf{T}} \texttt{base\_link} \xrightarrow{^{\text{world}}_{\text{base}}\mathbf{T}} \texttt{world}$$
   Therefore, $^{\text{world}}_{\text{front\_lidar}}\mathbf{T} = \,^{\text{world}}_{\text{base}}\mathbf{T} \;\,^{\text{base}}_{\text{lidar}}\mathbf{T}$.

2. **Trace Ancestors of `target` (`gripper`) up to the Root (`world`)**:
   $$\text{Path}_{\text{target}\to\text{root}}: \quad \texttt{gripper} \xrightarrow{^{\text{arm}}_{\text{gripper}}\mathbf{T}} \texttt{arm\_base} \xrightarrow{^{\text{base}}_{\text{arm}}\mathbf{T}} \texttt{base\_link} \xrightarrow{^{\text{world}}_{\text{base}}\mathbf{T}} \texttt{world}$$
   Therefore, $^{\text{world}}_{\text{gripper}}\mathbf{T} = \,^{\text{world}}_{\text{base}}\mathbf{T} \;\,^{\text{base}}_{\text{arm}}\mathbf{T} \;\,^{\text{arm}}_{\text{gripper}}\mathbf{T}$.

3. **Combine at the Common Ancestor (or Root)**:
   By the Subscript Cancellation Rule from Chapter 3:
   $$^{\text{gripper}}_{\text{front\_lidar}}\mathbf{T} = \left(^{\text{world}}_{\text{gripper}}\mathbf{T}\right)^{-1} \,^{\text{world}}_{\text{front\_lidar}}\mathbf{T} = \,^{\text{gripper}}_{\text{world}}\mathbf{T} \;\,^{\text{world}}_{\text{front\_lidar}}\mathbf{T}$$
   *(Or even faster: stop at the Lowest Common Ancestor `base_link` so you don't even need to multiply by $^{\text{world}}_{\text{base}}\mathbf{T}$ and its inverse!)*

---

## 2. Step-by-Step Implementation Milestones

### Milestone 1: Implement `SE2Transform` Value Type
Build a self-contained struct/class representing $^A_B\mathbf{T} \in SE(2)$ with:
- State: `x`, `y`, `theta` (always wrapped to $(-\pi, +\pi]$ via `atan2(sin, cos)`).
- `to_matrix()`: Returns the $3\times 3$ homogeneous matrix $\begin{bmatrix}\cos\theta & -\sin\theta & x \\ \sin\theta & \cos\theta & y \\ 0 & 0 & 1\end{bmatrix}$.
- `operator*` / `compose(other)`: Computes $^A_C\mathbf{T} = \,^A_B\mathbf{T}\,^B_C\mathbf{T}$.
- `inverse()`: Computes $^B_A\mathbf{T} = \begin{bmatrix}\mathbf{R}^T & -\mathbf{R}^T\mathbf{t} \\ \mathbf{0}^T & 1\end{bmatrix}$ with angle $-\theta$ wrapped to $(-\pi, +\pi]$.
- `transform_point(px, py)` ($w = 1$) and `transform_vector(vx, vy)` ($w = 0$).

### Milestone 2: Implement `TransformTree2D` Storage & Cycle Prevention
Store each frame's single parent edge in a hash map: `child_frame -> (parent_frame, T_parent_child)`.
- When `set_transform(parent, child, T_parent_child)` is called:
  1. Reject `parent == child` (a frame cannot be its own parent).
  2. Walk up from `parent` to the root; if `child` appears in `parent`'s ancestor chain, throw an error (`CycleDetectedError`) so the tree never becomes an infinite loop!

### Milestone 3: Implement `lookup_transform(target_frame, source_frame)`
Given any `target_frame` and `source_frame`:
1. If `target_frame == source_frame`, immediately return `SE2Transform::identity()`.
2. Walk up from `source_frame` to its root, accumulating $^{\text{root}}_{\text{source}}\mathbf{T}$, and walk up from `target_frame` to its root, accumulating $^{\text{root}}_{\text{target}}\mathbf{T}$.
3. Verify that both chains reach the **same root frame** (if not, the tree has two disconnected islands—throw `ConnectivityError`!).
4. Return $\left(^{\text{root}}_{\text{target}}\mathbf{T}\right)^{-1} \,^{\text{root}}_{\text{source}}\mathbf{T}$.

---

## 3. Complete Reference Implementation (C++17 & Python)

### 3.1 C++17 Complete Implementation

```cpp
#include <cmath>
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

namespace robotics {

constexpr double kPi = 3.14159265358979323846;

inline double wrap_to_pi(double rad) {
    return std::atan2(std::sin(rad), std::cos(rad));
    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //     Guarantees every stored yaw stays strictly in [-pi, +pi]
}

struct Vec2 {
    double x{0.0}, y{0.0};
};

struct SE2Transform {
    double x{0.0}, y{0.0}, theta{0.0};

    SE2Transform(double x_in = 0.0, double y_in = 0.0, double theta_in = 0.0)
        : x(x_in), y(y_in), theta(wrap_to_pi(theta_in)) {}

    static SE2Transform identity() { return {0.0, 0.0, 0.0}; }

    // Compose: T_AC = T_AB * T_BC
    SE2Transform operator*(const SE2Transform& rhs) const {
        double c = std::cos(theta), s = std::sin(theta);
        return {
            c * rhs.x - s * rhs.y + x,
            s * rhs.x + c * rhs.y + y,
            wrap_to_pi(theta + rhs.theta)
        };
    }

    // Closed-form SE(2) Inverse: [ R^T, -R^T * t ]
    SE2Transform inverse() const {
        double c = std::cos(theta), s = std::sin(theta);
        return {
            -( c * x + s * y),
            -(-s * x + c * y),
            wrap_to_pi(-theta)
        };
    }

    Vec2 transform_point(const Vec2& p) const {
        double c = std::cos(theta), s = std::sin(theta);
        return {c * p.x - s * p.y + x, s * p.x + c * p.y + y};
    }
};

class TransformTree2D {
public:
    void set_transform(const std::string& parent,
                       const std::string& child,
                       const SE2Transform& T_parent_child) {
        if (parent == child) {
            throw std::invalid_argument("Frame cannot be its own parent: " + child);
        }
        // Check for cycle: walk up from 'parent' and ensure we never hit 'child'
        std::string curr = parent;
        while (edges_.count(curr)) {
            curr = edges_.at(curr).first;
            if (curr == child) {
                throw std::runtime_error("Cycle detected when linking " + parent + " -> " + child);
            }
        }
        edges_[child] = {parent, T_parent_child};
        //              ^^^^^^^^^^^^^^^^^^^^^^^^
        //              Store directed parent edge: ^parent_child T
    }

    // Returns ^target_source T (transforms points from source_frame into target_frame)
    SE2Transform lookup_transform(const std::string& target_frame,
                                  const std::string& source_frame) const {
        if (target_frame == source_frame) {
            return SE2Transform::identity();
        }
        auto [root_src, T_root_source] = chain_to_root(source_frame);
        auto [root_tgt, T_root_target] = chain_to_root(target_frame);

        if (root_src != root_tgt) {
            throw std::runtime_error("Disconnected frame trees: " + source_frame +
                                     " (root=" + root_src + ") vs " + target_frame +
                                     " (root=" + root_tgt + ")");
        }
        return T_root_target.inverse() * T_root_source;
        //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //     ^target_source T = (^root_target T)^-1 * (^root_source T)
    }

    Vec2 transform_point(const std::string& target_frame,
                         const std::string& source_frame,
                         const Vec2& p_source) const {
        return lookup_transform(target_frame, source_frame).transform_point(p_source);
    }

private:
    std::pair<std::string, SE2Transform> chain_to_root(const std::string& frame) const {
        std::string curr = frame;
        SE2Transform T_curr_frame = SE2Transform::identity();
        while (edges_.count(curr)) {
            const auto& [parent, T_parent_curr] = edges_.at(curr);
            T_curr_frame = T_parent_curr * T_curr_frame;
            //             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            //             Left-multiply as we climb up toward the root!
            curr = parent;
        }
        return {curr, T_curr_frame};
    }

    std::unordered_map<std::string, std::pair<std::string, SE2Transform>> edges_;
};

} // namespace robotics

int main() {
    using namespace robotics;
    TransformTree2D tf_tree;

    tf_tree.set_transform("world",     "base_link",   {3.0, 2.0,  kPi / 2.0});
    tf_tree.set_transform("base_link", "front_lidar", {0.5, 0.2,  0.0});
    tf_tree.set_transform("base_link", "arm_base",    {0.0, 0.0, -kPi / 2.0});
    tf_tree.set_transform("arm_base",  "gripper",     {0.8, 0.0,  kPi / 4.0});

    Vec2 obstacle_in_lidar{2.0, -1.0};
    Vec2 obstacle_in_world   = tf_tree.transform_point("world",   "front_lidar", obstacle_in_lidar);
    Vec2 obstacle_in_gripper = tf_tree.transform_point("gripper", "front_lidar", obstacle_in_lidar);

    SE2Transform T_gripper_lidar = tf_tree.lookup_transform("gripper", "front_lidar");

    std::cout << std::fixed << std::setprecision(3);
    std::cout << "Obstacle in world   : (" << obstacle_in_world.x << ", " << obstacle_in_world.y << ")\n";
    std::cout << "T_gripper_lidar     : (x=" << T_gripper_lidar.x << ", y=" << T_gripper_lidar.y
              << ", yaw=" << T_gripper_lidar.theta * 180.0 / kPi << " deg)\n";
    std::cout << "Obstacle in gripper : (" << obstacle_in_gripper.x << ", " << obstacle_in_gripper.y << ")\n";
    return 0;
}
```

### 3.2 Python Complete Implementation

```python
import math
from dataclasses import dataclass
import numpy as np

def wrap_to_pi(rad: float) -> float:
    return math.atan2(math.sin(rad), math.cos(rad))

@dataclass(frozen=True)
class SE2Transform:
    x: float = 0.0
    y: float = 0.0
    theta: float = 0.0

    def to_matrix(self) -> np.ndarray:
        c, s = math.cos(self.theta), math.sin(self.theta)
        return np.array([[c, -s, self.x], [s, c, self.y], [0.0, 0.0, 1.0]])

    def compose(self, other: "SE2Transform") -> "SE2Transform":
        c, s = math.cos(self.theta), math.sin(self.theta)
        return SE2Transform(
            x=c * other.x - s * other.y + self.x,
            y=s * other.x + c * other.y + self.y,
            theta=wrap_to_pi(self.theta + other.theta),
        )

    def inverse(self) -> "SE2Transform":
        c, s = math.cos(self.theta), math.sin(self.theta)
        return SE2Transform(
            x=-(c * self.x + s * self.y),
            y=-(-s * self.x + c * self.y),
            theta=wrap_to_pi(-self.theta),
        )

    def transform_point(self, px: float, py: float) -> tuple[float, float]:
        c, s = math.cos(self.theta), math.sin(self.theta)
        return (c * px - s * py + self.x, s * px + c * py + self.y)


class TransformTree2D:
    def __init__(self) -> None:
        self._edges: dict[str, tuple[str, SE2Transform]] = {}

    def set_transform(self, parent: str, child: str, T_parent_child: SE2Transform) -> None:
        if parent == child:
            raise ValueError(f"Frame '{child}' cannot be its own parent.")
        curr = parent
        while curr in self._edges:
            curr = self._edges[curr][0]
            if curr == child:
                raise ValueError(f"Cycle detected linking {parent} -> {child}.")
        self._edges[child] = (parent, T_parent_child)

    def _chain_to_root(self, frame: str) -> tuple[str, SE2Transform]:
        curr = frame
        T_curr_frame = SE2Transform()
        while curr in self._edges:
            parent, T_parent_curr = self._edges[curr]
            T_curr_frame = T_parent_curr.compose(T_curr_frame)
            curr = parent
        return curr, T_curr_frame

    def lookup_transform(self, target_frame: str, source_frame: str) -> SE2Transform:
        if target_frame == source_frame:
            return SE2Transform()
        root_src, T_root_source = self._chain_to_root(source_frame)
        root_tgt, T_root_target = self._chain_to_root(target_frame)
        if root_src != root_tgt:
            raise LookupError(f"Frames '{target_frame}' and '{source_frame}' are disconnected.")
        return T_root_target.inverse().compose(T_root_source)
```

---

## 4. Verification Test Suite & Hand-Calculated Expected Results

Use this table to verify your implementation across all 5 test cases:

| Test Case | `target_frame` | `source_frame` | Input Point $^S\mathbf{p}$ | Expected Transform $^{\text{target}}_{\text{source}}\mathbf{T}\;(x, y, \theta_{\text{deg}})$ | Expected Output Point $^{\text{target}}\mathbf{p}$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Identity Lookup** | `base_link` | `base_link` | $(2.0, -1.0)$ | $(0.000,\; 0.000,\; 0.0^\circ)$ | $(2.000,\; -1.000)$ |
| **2. Parent $\leftarrow$ Child** | `base_link` | `front_lidar` | $(2.0, -1.0)$ | $(0.500,\; 0.200,\; 0.0^\circ)$ | $(2.500,\; -0.800)$ |
| **3. Two-Hop to Root** | `world` | `front_lidar` | $(2.0, -1.0)$ | $(2.800,\; 2.500,\; +90.0^\circ)$ | $(3.800,\; 4.500)$ |
| **4. Inverse (Root $\to$ Leaf)** | `front_lidar` | `world` | $(3.8, 4.5)$ | $(-2.500,\; 2.800,\; -90.0^\circ)$ | $(2.000,\; -1.000)$ |
| **5. Cross-Branch (`lidar` $\to$ `gripper`)** | `gripper` | `front_lidar` | $(2.0, -1.0)$ | $(-0.354,\; 1.061,\; +45.0^\circ)$ | $(1.768,\; 1.768)$ |

### Hand-Calculation Walkthrough of Test Case 5 (`front_lidar` $\to$ `gripper`):
1. **Obstacle in `base_link`**: Since `front_lidar` is at $(0.5, 0.2, 0^\circ)$ in `base_link`, the obstacle at $(2.0, -1.0)$ in `front_lidar` is at:
   $$^{\text{base}}\mathbf{p} = \begin{bmatrix} 0.5 + 2.0 \\ 0.2 + (-1.0) \end{bmatrix} = \begin{bmatrix} 2.5 \\ -0.8 \end{bmatrix}\text{ m}$$
2. **Pose of `gripper` in `base_link`**:
   - `arm_base` is at $(0, 0)$ rotated by $-90^\circ$ (pointing along $-Y_{\text{base}}$).
   - `gripper` is $+0.8\text{ m}$ forward along `arm_base` $+X$, which places `gripper` at $(0.0, -0.8)\text{ m}$ in `base_link` with heading $-90^\circ + 45^\circ = -45^\circ$.
   - Therefore, $^{\text{base}}_{\text{gripper}}\mathbf{T} = (0.0, -0.8, -45^\circ)$.
3. **Displacement from `gripper` to Obstacle**:
   Notice that both the obstacle $(2.5, -0.8)$ and the `gripper` origin $(0.0, -0.8)$ have the exact same $y = -0.8\text{ m}$ in `base_link`! Thus, in `base_link`, the vector from the gripper to the obstacle is purely $+2.5\text{ m}$ along $+X_{\text{base}}$:
   $$\Delta\mathbf{p}_{\text{base}} = \begin{bmatrix} 2.5 - 0.0 \\ -0.8 - (-0.8) \end{bmatrix} = \begin{bmatrix} 2.5 \\ 0.0 \end{bmatrix}\text{ m}$$
4. **Rotate into `gripper` Frame**:
   Since the `gripper` is at $-45^\circ$ relative to `base_link`, un-rotating by $\mathbf{R}^T(-45^\circ) = \mathbf{R}(+45^\circ)$ projects that $2.5\text{ m}$ vector into the gripper's fingers at $+45^\circ$:
   $$^{\text{gripper}}\mathbf{p} = \begin{bmatrix} 2.5\cos(45^\circ) \\ 2.5\sin(45^\circ) \end{bmatrix} = \begin{bmatrix} 1.768 \\ 1.768 \end{bmatrix}\text{ m}$$
   And the direct transform $^{\text{gripper}}_{\text{front\_lidar}}\mathbf{T} = \left(^{\text{base}}_{\text{gripper}}\mathbf{T}\right)^{-1} \,^{\text{base}}_{\text{front\_lidar}}\mathbf{T}$ evaluates to $(x = -0.354\text{ m},\; y = +1.061\text{ m},\; \theta = +45.0^\circ)$.

---

## 5. Edge Cases & Automated Verification Suite

A production `tf2` engine must gracefully catch and report invalid graph operations instead of hanging in an infinite loop or returning garbage coordinates. Make sure your engine passes these 4 edge-case tests:

```python
def test_transform_tree_suite() -> None:
    tree = TransformTree2D()
    tree.set_transform("world",     "base_link",   SE2Transform(3.0, 2.0,  math.pi / 2))
    tree.set_transform("base_link", "front_lidar", SE2Transform(0.5, 0.2,  0.0))
    tree.set_transform("base_link", "arm_base",    SE2Transform(0.0, 0.0, -math.pi / 2))
    tree.set_transform("arm_base",  "gripper",     SE2Transform(0.8, 0.0,  math.pi / 4))

    # 1. Cross-branch accuracy check (front_lidar -> gripper)
    T_grip_lidar = tree.lookup_transform("gripper", "front_lidar")
    px, py = T_grip_lidar.transform_point(2.0, -1.0)
    assert math.isclose(px, 1.76776695, abs_tol=1e-6)
    assert math.isclose(py, 1.76776695, abs_tol=1e-6)

    # 2. Round-trip identity law: T_AB * T_BA == I
    T_lidar_grip = tree.lookup_transform("front_lidar", "gripper")
    T_roundtrip  = T_grip_lidar.compose(T_lidar_grip)
    assert math.isclose(T_roundtrip.x, 0.0, abs_tol=1e-9)
    assert math.isclose(T_roundtrip.y, 0.0, abs_tol=1e-9)
    assert math.isclose(T_roundtrip.theta, 0.0, abs_tol=1e-9)

    # 3. Cycle detection check (setting world's parent to gripper creates a loop!)
    try:
        tree.set_transform("gripper", "world", SE2Transform(1.0, 0.0, 0.0))
        assert False, "Expected ValueError for cycle!"
    except ValueError:
        pass

    # 4. Disconnected tree islands check
    tree.set_transform("drone_map", "drone_base", SE2Transform(10.0, 5.0, 0.0))
    try:
        tree.lookup_transform("drone_base", "front_lidar")
        assert False, "Expected LookupError for disconnected trees!"
    except LookupError:
        pass

    print("All TransformTree2D unit and edge-case tests passed!")

if __name__ == "__main__":
    test_transform_tree_suite()
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Invert by hand.** Using the closed-form `inverse()` (x' $= -(c\,x + s\,y)$, y' $= -(-s\,x + c\,y)$, $\theta' = -\theta$), compute the inverse of $^{\text{world}}_{\text{base}}\mathbf{T} = (3.0, 2.0, +90^\circ)$. Then verify that `T.compose(T.inverse())` gives the identity.

**Q2. Add the missing `rear_camera`.** The architecture diagram shows `rear_camera` at $(-0.4, 0.0, +180^\circ)$ under `base_link`, but `main()` never adds it. After

```python
tree.set_transform("base_link", "rear_camera", SE2Transform(-0.4, 0.0, math.pi))
```

predict:
1. `tree.lookup_transform("world", "rear_camera")` as $(x, y, \theta_{\text{deg}})$
2. a point at $(1.0, 0.5)$ in `rear_camera`, expressed in `base_link` and then in `world`.

**Q3. Trace `_chain_to_root("gripper")`.** Fill in `T_curr_frame` after each loop iteration (3 decimals, degrees):

| Iteration | `curr` before | `parent` | `T_curr_frame` after `T_parent_curr.compose(T_curr_frame)` |
|-----------|---------------|----------|-------------------------------------------------------------|
| 1 | `gripper` | `arm_base` | ? |
| 2 | `arm_base` | `base_link` | ? |
| 3 | `base_link` | `world` | ? |

What root frame is returned?

**Q4. Which calls raise?** On the chapter's 4-edge tree (`world`, `base_link`, `front_lidar`, `arm_base`, `gripper`), predict the outcome of each call **independently**: the exception type and message, or the returned value.

```python
tree.set_transform("arm_base", "base_link", SE2Transform())   # (a)
tree.set_transform("front_lidar", "front_lidar", SE2Transform())   # (b)
tree.lookup_transform("world", "camera_typo")   # (c)
tree.lookup_transform("camera_typo", "camera_typo")   # (d)
```

**Q5. The order of composition matters.** Suppose someone "simplifies" the loop in `_chain_to_root` to `T_curr_frame = T_curr_frame.compose(T_parent_curr)` (right-multiply instead of left-multiply). What does `_chain_to_root("gripper")` now return, compared with the correct $(3.800, 2.000, 45.0^\circ)$? Which part is still right, and why?

### Coding Exercises

**E1 (Easy). `transform_vector` ($w = 0$).** Milestone 1 lists `transform_vector(vx, vy)`, but the reference code only has `transform_point`. Write `transform_vector(T: SE2Transform, vx: float, vy: float) -> tuple[float, float]` that rotates a direction (a velocity or a LiDAR beam direction) **without** translating it.

```python
T = SE2Transform(3.0, 2.0, math.pi / 2)
T.transform_point(1.0, 0.0)        # (3.0, 3.0)
transform_vector(T, 1.0, 0.0)      # ≈ (0.0, 1.0)   (no +[3, 2] offset)
```

**E2 (Easy–Medium). Which frames does a lookup pass through?** Write `frame_path(tree: TransformTree2D, target: str, source: str) -> list[str]` that returns the frames from `source` up to the **Lowest Common Ancestor** and back down to `target` (both ends included). Raise `LookupError` if the frames are disconnected. Write a helper `lowest_common_ancestor(tree, a, b) -> str` (you may read `tree._edges`).

```python
frame_path(tree, "gripper", "front_lidar")   # ['front_lidar', 'base_link', 'arm_base', 'gripper']
frame_path(tree, "gripper", "world")         # ['world', 'base_link', 'arm_base', 'gripper']
frame_path(tree, "arm_base", "arm_base")     # ['arm_base']
lowest_common_ancestor(tree, "front_lidar", "gripper")   # 'base_link'
```

**E3 (Medium). Stop at the LCA.** Implement the faster variant hinted at in Section 1: `lookup_via_lca(tree, target, source) -> SE2Transform` that accumulates $^{\text{LCA}}_{\text{source}}\mathbf{T}$ and $^{\text{LCA}}_{\text{target}}\mathbf{T}$ **only up to the LCA** (not the root) and returns $\left(^{\text{LCA}}_{\text{target}}\mathbf{T}\right)^{-1}\,^{\text{LCA}}_{\text{source}}\mathbf{T}$. It must agree with `lookup_transform` on every test in Section 4.

```python
lookup_via_lca(tree, "gripper", "front_lidar")   # ≈ (-0.354, 1.061, 45.0°)  (Test 5)
lookup_via_lca(tree, "front_lidar", "world")     # ≈ (-2.500, 2.800, -90.0°) (Test 4)
lookup_via_lca(tree, "gripper", "arm_base")      # ≈ (-0.566, 0.566, -45.0°)
```

#### Dry-Run: Answers

**Q1.** With $\theta = 90^\circ$, $c = 0$ and $s = 1$:
- $x' = -(0 \cdot 3 + 1 \cdot 2) = -2$
- $y' = -(-1 \cdot 3 + 0 \cdot 2) = 3$
- $\theta' = -90^\circ$

So $^{\text{base}}_{\text{world}}\mathbf{T} = (-2.0, 3.0, -90^\circ)$. Check with `compose`, using $\mathbf{T} = (3, 2, 90^\circ)$ on the left: $x = 0 \cdot (-2) - 1 \cdot 3 + 3 = 0$, $y = 1 \cdot (-2) + 0 \cdot 3 + 2 = 0$, $\theta = 90^\circ - 90^\circ = 0$. That is the identity. Physically, the world origin sits 2 m *behind* and 3 m to the *left* of the robot, which is facing world $+Y$.

**Q2.**
1. $^{\text{world}}_{\text{rear}}\mathbf{T} = {}^{\text{world}}_{\text{base}}\mathbf{T}\;{}^{\text{base}}_{\text{rear}}\mathbf{T}$:
   $x = 0 \cdot (-0.4) - 1 \cdot 0 + 3 = 3.0$, $y = 1 \cdot (-0.4) + 0 \cdot 0 + 2 = 1.6$, $\theta = 90^\circ + 180^\circ = 270^\circ$, which wraps to $-90^\circ$. **Result: $(3.000, 1.600, -90.0^\circ)$.**
2. The point $(1.0, 0.5)$:

| Frame | Computation | Point |
|-------|-------------|-------|
| `rear_camera` | given | $(1.0, 0.5)$ |
| `base_link` | $\mathbf{R}(180^\circ)(1, 0.5) + (-0.4, 0) = (-1, -0.5) + (-0.4, 0)$ | $(-1.4, -0.5)$ |
| `world` | $\mathbf{R}(90^\circ)(-1.4, -0.5) + (3, 2) = (0.5, -1.4) + (3, 2)$ | $(3.5, 0.6)$ |

Cross-check using the direct transform: $\mathbf{R}(-90^\circ)(1, 0.5) + (3, 1.6) = (0.5, -1) + (3, 1.6) = (3.5, 0.6)$. A point 1 m in front of the rear camera is 1.4 m *behind* the axle, as expected for a camera that looks backward.

**Q3.**

| Iteration | `parent` | `T_curr_frame` after the update | Computation |
|-----------|----------|----------------------------------|-------------|
| 1 | `arm_base` | $(0.800, 0.000, 45.0^\circ)$ | $^{\text{arm}}_{\text{grip}}\mathbf{T} \cdot \mathbf{I}$ |
| 2 | `base_link` | $(0.000, -0.800, -45.0^\circ)$ | $(0,0,-90^\circ) \cdot (0.8,0,45^\circ)$: $x = 0 \cdot 0.8 = 0$, $y = -1 \cdot 0.8 = -0.8$, $\theta = -45^\circ$ |
| 3 | `world` | $(3.800, 2.000, 45.0^\circ)$ | $(3,2,90^\circ) \cdot (0,-0.8,-45^\circ)$: $x = 0 - 1 \cdot (-0.8) + 3 = 3.8$, $y = 0 + 0 + 2 = 2$, $\theta = 45^\circ$ |

The loop stops because `world` has no parent, so it returns `("world", (3.8, 2.0, 45°))`. Iteration 2 matches step 2 of the Test 5 walkthrough: the gripper is at $(0, -0.8, -45^\circ)$ in `base_link`.

**Q4.**

| Call | Outcome | Why |
|------|---------|-----|
| (a) | `ValueError: Cycle detected linking arm_base -> base_link.` | Walking up from `arm_base` reaches `base_link`, which is the requested child |
| (b) | `ValueError: Frame 'front_lidar' cannot be its own parent.` | The `parent == child` guard |
| (c) | `LookupError: Frames 'world' and 'camera_typo' are disconnected.` | `camera_typo` has no edge, so its "root" is itself, and `"camera_typo" != "world"` |
| (d) | returns the identity `SE2Transform(0, 0, 0)` | The `target == source` shortcut runs **before** any existence check |

(c) and (d) show a real usability gap: a misspelled frame is reported as "disconnected" or silently accepted. Production `tf2` reports "frame does not exist". A good fix is a `known_frames` set (every parent and child seen so far), checked at the top of `lookup_transform`. Also note that `set_transform` silently **re-parents** a child that already has a parent, because `self._edges[child]` is simply overwritten.

**Q5.** The modified loop returns $(4.336, -0.707, 45.0^\circ)$ instead of $(3.800, 2.000, 45.0^\circ)$.

| Iteration | Wrong product | Result |
|-----------|---------------|--------|
| 1 | $\mathbf{I} \cdot (0.8, 0, 45^\circ)$ | $(0.8, 0, 45^\circ)$ |
| 2 | $(0.8, 0, 45^\circ) \cdot (0, 0, -90^\circ)$ | $(0.8, 0, -45^\circ)$ |
| 3 | $(0.8, 0, -45^\circ) \cdot (3, 2, 90^\circ)$: $x = 0.7071 \cdot 3 + 0.7071 \cdot 2 + 0.8$, $y = -0.7071 \cdot 3 + 0.7071 \cdot 2$ | $(4.336, -0.707, 45^\circ)$ |

The **angle is still right**, because 2D rotations commute ($45^\circ - 90^\circ + 90^\circ$ in any order). The **translation is wrong**, because $SE(2)$ composition does not commute: each translation must be rotated by every frame *above* it in the tree. Climbing toward the root means each new parent transform goes on the **left**, which is the subscript-cancellation rule $^{\text{world}}_{\text{grip}}\mathbf{T} = {}^{\text{world}}_{\text{base}}\mathbf{T}\,{}^{\text{base}}_{\text{arm}}\mathbf{T}\,{}^{\text{arm}}_{\text{grip}}\mathbf{T}$.

**E1 — reference solution**

```python
import math

def transform_vector(T: SE2Transform, vx: float, vy: float) -> tuple[float, float]:
    c, s = math.cos(T.theta), math.sin(T.theta)
    return (c * vx - s * vy, s * vx + c * vy)     # R * v, with no "+ t" because w = 0
```

In homogeneous form, $[v_x, v_y, 0]^T$ has a zero third component, so it multiplies the translation column by $0$. Directions and velocities must never pick up the frame offset. Otherwise a robot driving at 1 m/s would appear to be "at" $(3, 3)$. The code gives $\cos 90^\circ \approx 6.1\times10^{-17}$ for the $x$ part, which is rounding noise for $0$.

**E2 — reference solution**

```python
def _ancestors(tree: TransformTree2D, frame: str) -> list[str]:
    chain = [frame]
    while chain[-1] in tree._edges:
        chain.append(tree._edges[chain[-1]][0])     # step to the parent
    return chain                                    # [frame, parent, ..., root]

def lowest_common_ancestor(tree: TransformTree2D, a: str, b: str) -> str:
    b_chain = set(_ancestors(tree, b))
    for frame in _ancestors(tree, a):               # first hit walking up from a
        if frame in b_chain:
            return frame
    raise LookupError(f"Frames '{a}' and '{b}' are disconnected.")

def frame_path(tree: TransformTree2D, target: str, source: str) -> list[str]:
    lca = lowest_common_ancestor(tree, source, target)
    up_src = _ancestors(tree, source)
    up_tgt = _ancestors(tree, target)
    # source ... lca  +  (frames below lca on the target side, top-down)
    return up_src[: up_src.index(lca) + 1] + list(reversed(up_tgt[: up_tgt.index(lca)]))
```

Trace for `("gripper", "front_lidar")`: `up_src = [front_lidar, base_link, world]` and `up_tgt = [gripper, arm_base, base_link, world]`. The first frame of `up_src` that is also in `up_tgt` is `base_link`. The result is `[front_lidar, base_link]` + `reversed([gripper, arm_base])`, which is `['front_lidar', 'base_link', 'arm_base', 'gripper']`. Cost: $O(d)$ for tree depth $d$.

**E3 — reference solution**

```python
def _transform_up_to(tree: TransformTree2D, frame: str, ancestor: str) -> SE2Transform:
    T = SE2Transform()                                # ^frame_frame T = identity
    curr = frame
    while curr != ancestor:
        parent, T_parent_curr = tree._edges[curr]
        T = T_parent_curr.compose(T)                  # left-multiply while climbing (see Q5)
        curr = parent
    return T                                          # ^ancestor_frame T

def lookup_via_lca(tree: TransformTree2D, target: str, source: str) -> SE2Transform:
    lca = lowest_common_ancestor(tree, source, target)   # raises LookupError if disconnected
    T_lca_source = _transform_up_to(tree, source, lca)
    T_lca_target = _transform_up_to(tree, target, lca)
    return T_lca_target.inverse().compose(T_lca_source)
```

Test 5 check: the LCA is `base_link`. $^{\text{base}}_{\text{lidar}}\mathbf{T} = (0.5, 0.2, 0^\circ)$ and $^{\text{base}}_{\text{grip}}\mathbf{T} = (0, -0.8, -45^\circ)$ (from Q3, iteration 2). With $c = 0.7071$ and $s = -0.7071$, its inverse is $x' = -(c \cdot 0 + s \cdot (-0.8)) = -0.566$, $y' = -(-s \cdot 0 + c \cdot (-0.8)) = 0.566$, $\theta' = 45^\circ$. Composing $(-0.566, 0.566, 45^\circ) \cdot (0.5, 0.2, 0^\circ)$ gives $x = 0.7071(0.5) - 0.7071(0.2) - 0.566 = -0.354$, $y = 0.7071(0.5) + 0.7071(0.2) + 0.566 = 1.061$, $\theta = 45^\circ$, which matches Section 4. The world edge $(3, 2, 90^\circ)$ is never touched, which saves two compositions and avoids the rounding error of multiplying by a transform and then by its inverse. For `("gripper", "arm_base")`, the LCA is `arm_base` itself, so the answer is just $\left(^{\text{arm}}_{\text{grip}}\mathbf{T}\right)^{-1} = (-0.566, 0.566, -45^\circ)$.

---

## Interactive Visualization & `shadcn/ui` Specification

> **For Claude (Interactive Artifact Builder):** Build an interactive **ROS `tf2` Tree Explorer & Frame Query Visualizer** using **`shadcn/ui` components** (`<Card>`, `<Tabs>`, `<Slider>`, `<Switch>`, `<Select>`, `<Button>`, `<Badge>`, `<Table>`, `<Tooltip>`) and Tailwind CSS.

### Component Architecture & Tabs (`<Tabs defaultValue="tf2-visualizer">`)

1. **Left Panel (Split Graph + 2D Spatial Canvas inside `<Card>`)**:
   - **Top Half (Interactive Directed Tree Graph)**: Renders nodes (`world`, `base_link`, `front_lidar`, `rear_camera`, `arm_base`, `gripper`) as clickable `<Badge>` cards connected by directed arrows. When a query `lookup_transform(target, source)` is active, highlight the **Upward Inverse Path (`source -> LCA`) in Rose (`#f43f5e`)**, the **Lowest Common Ancestor (`LCA`) in Amber (`#f59e0b`)**, and the **Downward Path (`LCA -> target`) in Emerald (`#10b981`)**.
   - **Bottom Half (2D Robot & Arm Spatial Arena)**: Draws all 6 coordinate frames live on the warehouse floor, plus the dashed direct transform arrow $^{\text{target}}_{\text{source}}\mathbf{T}$ and the obstacle ray.
2. **Right Panel (Query Controls, Sliders & Matrix Chain Stepper inside `<Card>`)**:
   - Two `<Select>` dropdowns: **`source_frame`** and **`target_frame`**, plus `<Slider>` controls to drive the robot (`base_link`) and swing the robot arm (`arm_base`, `gripper`) in real time.
   - Live step-by-step matrix chain inspector showing each intermediate $3\times 3$ $SE(2)$ matrix multiplication and inverse along the tree path, plus a `<Button variant="outline">Test Cycle Detection Error</Button>` that attempts to set `world`'s parent to `gripper` and displays the caught cycle warning!
