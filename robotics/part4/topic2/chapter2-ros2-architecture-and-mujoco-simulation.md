# Part 4, Topic 2: Autonomous Motion Planning & ROS2 Simulation
## Chapter 2: ROS2 Computation Graph (Nodes, Topics, TF2) & MuJoCo Physics Simulation

---

### Prerequisites & Learning Objectives

Before starting this chapter, you should be comfortable with:
- Rigid-body coordinate transforms ${}^{A}\mathbf{T}_{B} \in SE(3)$ (Part 2, Topic 1) and PID / State-Space torque control $\tau = K_p(q_{\text{des}} - q) - K_d \dot{q}$ (Part 3).
- Real-Time C++ smart pointers (`std::shared_ptr`, `std::unique_ptr`), callbacks, and multithreading (Part 4, Topic 1).

By the end of this chapter, you will be able to:
1. Explain what **ROS2 (Robot Operating System 2)** actually is—a peer-to-peer **DDS communication middleware, build system (`colcon`), and standard message ecosystem** that lets C++ real-time nodes and Python AI nodes talk seamlessly without a central master bottleneck.
2. Choose the right ROS2 communication primitive—**Topics (Pub/Sub)**, **Services (Request/Reply RPC)**, or **Actions (Preemptable Goal State Machines)**—and configure **QoS (Quality of Service)** profiles (`Reliable` vs. `BestEffort`).
3. Trace how **URDF** and **TF2 (`tf2_ros`)** maintain a distributed, time-stamped tree of 3D coordinate frames (`map` $\rightarrow$ `odom` $\rightarrow$ `base_link` $\rightarrow$ `lidar_link`).
4. Write a modern ROS2 C++ (`rclcpp`) node and a Python (`rclpy`) node.
5. Test your robotics algorithms safely without risking $\$50,000$ hardware by building an XML **MJCF robot model** and running a **$500\text{ Hz}$ closed-loop PD + Gravity-Compensation torque control loop** inside the **MuJoCo** physics engine!

---

### 1. What Is ROS2, Really? (From Zero)

Beginners often ask: *"Is ROS2 an operating system like Ubuntu or Windows?"*

**No!** ROS2 runs *on top* of Linux (or Windows/macOS). Despite its name, **ROS2 is not an operating system.** It is three things packaged together:
1. **A Peer-to-Peer Communication Middleware (DDS):** A high-speed messaging bus that allows separate programs (written in C++ or Python, running on the same onboard computer or across multiple computers on a network) to discover each other automatically and exchange strongly-typed data structures (`SensorMsgs`, `GeometryMsgs`, `NavMsgs`).
2. **A Standard Coordinate & Geometry Ecosystem (`TF2` + `URDF`):** Universal conventions for describing robot links, joints, and 3D coordinate frame transformations over time.
3. **A Federated Build & Package System (`colcon` + `ament_cmake`) & Developer Tooling (`rviz2`, `ros2 bag`, `rqt_graph`):** Standard tools to record sensor streams, visualize 3D point clouds, and replay experiments deterministically.

#### Why ROS1 Was Replaced by ROS2

In legacy **ROS1**, every node required a central coordinator process called `roscore` (the ROS Master), used custom TCP sockets without real-time guarantees, and struggled over lossy Wi-Fi links. If `roscore` crashed, the entire robot lost the ability to connect new nodes.

**ROS2** eliminated the central master completely by building on **DDS (Data Distribution Service)**—an industrial real-time pub/sub standard used in spacecraft, air-traffic control, and autonomous vehicles:
- **Zero Single Point of Failure:** Nodes discover each other automatically using UDP multicast discovery.
- **Language Interoperability:** You can write your $500\text{ Hz}$ motor controller and $A^*$ planner in **C++ (`rclcpp`)** for deterministic speed, and your Vision-Language-Action (VLA) model in **Python (`rclpy` + PyTorch)**—and both talk over the exact same binary DDS topics!
- **Zero-Copy Shared Memory (Iceoryx / Intra-Process):** When two C++ ROS2 nodes run on the same machine, DDS can pass a `std::unique_ptr` or shared-memory pointer in sub-microsecond time without serializing bytes over the network stack!

---

### 2. The ROS2 Computation Graph: Nodes, Topics, Services, Actions & QoS

In ROS2, instead of writing one giant monolithic program, we decompose a robot into modular, single-purpose processes called **Nodes**. Nodes communicate using three distinct primitives:

```
================================================================================
   THE 3 ROS2 COMMUNICATION PRIMITIVES & WHEN TO USE EACH
================================================================================

  1. TOPIC (Continuous Asynchronous Many-to-Many Stream | Pub/Sub):
     [LiDAR Node] ======= /scan (20 Hz LaserScan) =======> [SLAM Node]
                                                  \======> [Obstacle Detector]
     * Fire-and-forget! Best for continuous sensor streams & motor velocity cmds.

  2. SERVICE (Synchronous Quick Request / Response RPC | Client/Server):
     [Behavior Tree] ---- Request: /reset_odometry ----> [Wheel Odom Node]
                     <--- Response: success = true -----
     * Blocks/awaits immediate reply (< 50 ms). Best for config toggles & triggers.

  3. ACTION (Long-Running Preemptable Goal State Machine | Goal/Feedback/Result):
     [Mission Planner] === Goal: /navigate_to_pose (x=8, y=4) ===> [Nav2 Server]
                       <-- Feedback (10 Hz): dist_remaining=3.2m -- (Can CANCEL
                       <== Result: SUCCEEDED (total_time=12.4s) ==   at any time!)
     * Best for physical tasks taking seconds/minutes that need progress & cancel.
================================================================================
```

#### Quality of Service (QoS) Profiles: `Reliable` vs. `BestEffort`

One of ROS2's superpowers is **QoS (Quality of Service)**—the ability to tune the underlying transport behavior per topic between TCP-like reliability and UDP-like low latency:

| QoS Policy | Setting A | Setting B | Robotics Rule of Thumb |
| :--- | :--- | :--- | :--- |
| **Reliability** | **`BestEffort`** (UDP-like: never retransmit dropped packets; lowest latency) | **`Reliable`** (TCP-like: ACK & retransmit dropped packets; guarantees delivery) | Use **`BestEffort`** (`SensorDataQoS`) for high-rate sensors ($400\text{ Hz}$ IMU, $60\text{ Hz}$ Camera)—retransmitting a stale IMU packet is worse than waiting $2.5\text{ ms}$ for the next fresh one! Use **`Reliable`** for `/cmd_vel`, maps, and discrete triggers. |
| **History / Depth** | **`KeepLast(N)`** (Ring buffer of size $N$, overwrites oldest!) | **`KeepAll`** (Unbounded queue up to resource limits) | Always use **`KeepLast(1)` or `KeepLast(5)`** in real-time control loops so your node never processes a backlog of stale data! |
| **Durability** | **`Volatile`** (Only subscribers currently connected receive messages) | **`TransientLocal`** ("Latched": late-joining subscribers automatically get the last published message) | Use **`TransientLocal`** for static `/map` occupancy grids and `/robot_description` URDF strings so `rviz2` gets the map even if opened 5 minutes after boot! |

> [!WARNING]
> **The #1 ROS2 Beginner Bug: Incompatible QoS Silent Mismatch!**
> In ROS2, if a Publisher uses `BestEffort` reliability (like `rclcpp::SensorDataQoS()`) and your Subscriber asks for `Reliable` delivery, **they will NOT connect**, and your subscriber callback will silently never fire! Run `ros2 topic info /scan --verbose` to inspect QoS compatibility.
> **Compatibility Rule:** A `Reliable` publisher can talk to both `Reliable` and `BestEffort` subscribers, but a `BestEffort` publisher can **only** talk to `BestEffort` subscribers!

---

### 3. Writing a Real-Time C++ (`rclcpp`) Node: Laser Obstacle Safety Filter

Let's examine a clean, modern ROS2 C++ node that subscribes to `/scan` (`sensor_msgs::msg::LaserScan`) with `SensorDataQoS` (`BestEffort`, `KeepLast(1)`) and publishes safe velocity commands `/cmd_vel` (`geometry_msgs::msg::Twist`) at $50\text{ Hz}$, automatically braking to $0.0\text{ m/s}$ if any obstacle enters a $0.60\text{ m}$ safety zone:

```cpp
#include "rclcpp/rclcpp.hpp"
#include "sensor_msgs/msg/laser_scan.hpp"
#include "geometry_msgs/msg/twist.hpp"
#include <algorithm>
#include <chrono>

using namespace std::chrono_literals;

class SafetyVelocityFilterNode : public rclcpp::Node {
public:
    SafetyVelocityFilterNode() : Node("safety_velocity_filter") {
        // 1. Subscribe to high-rate LiDAR using BestEffort SensorDataQoS
        scan_sub_ = this->create_subscription<sensor_msgs::msg::LaserScan>(
            "/scan",
            rclcpp::SensorDataQoS(), // BestEffort, KeepLast(5), Volatile
            [this](sensor_msgs::msg::LaserScan::ConstSharedPtr msg) {
                if (!msg->ranges.empty()) {
                    min_obstacle_dist_m_ = *std::min_element(
                        msg->ranges.begin(), msg->ranges.end());
                }
            });

        // 2. Publish motor velocity commands using Reliable QoS (depth = 1)
        cmd_pub_ = this->create_publisher<geometry_msgs::msg::Twist>(
            "/cmd_vel", rclcpp::QoS(1).reliable());

        // 3. Deterministic 50 Hz (20 ms) control timer
        timer_ = this->create_wall_timer(20ms, [this]() {
            auto cmd = std::make_unique<geometry_msgs::msg::Twist>();
            if (min_obstacle_dist_m_ < 0.60f) {
                cmd->linear.x  = 0.0; // EMERGENCY BRAKE!
                cmd->angular.z = 0.5; // Rotate in place to clear obstacle
            } else {
                cmd->linear.x  = 1.2; // Cruise forward at 1.2 m/s
                cmd->angular.z = 0.0;
            }
            // Pass std::unique_ptr for zero-copy intra-process publishing!
            cmd_pub_->publish(std::move(cmd));
        });
    }

private:
    float min_obstacle_dist_m_{10.0f};
    rclcpp::Subscription<sensor_msgs::msg::LaserScan>::SharedPtr scan_sub_;
    rclcpp::Publisher<geometry_msgs::msg::Twist>::SharedPtr cmd_pub_;
    rclcpp::TimerBase::SharedPtr timer_;
};

int main(int argc, char* argv[]) {
    rclcpp::init(argc, argv);
    rclcpp::spin(std::make_shared<SafetyVelocityFilterNode>());
    rclcpp::shutdown();
    return 0;
}
```

#### What's happening:

```cpp
        scan_sub_ = this->create_subscription<sensor_msgs::msg::LaserScan>(
            "/scan",
            rclcpp::SensorDataQoS(), // BestEffort, KeepLast(5), Volatile
            [this](sensor_msgs::msg::LaserScan::ConstSharedPtr msg) {
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  Accepting `ConstSharedPtr` allows ROS2 to hand our callback a read-only
//  shared pointer to the message without copying the `std::vector<float> ranges`!
```

```cpp
            auto cmd = std::make_unique<geometry_msgs::msg::Twist>();
            ...
            cmd_pub_->publish(std::move(cmd));
//                            ^^^^^^^^^^^^^^
//  Just like we learned in Topic 1 Chapter 1! Publishing a `std::unique_ptr`
//  via `std::move(cmd)` transfers ownership directly to the ROS2 DDS middleware
//  for zero-copy intra-process delivery!
```

---

### 4. URDF & The TF2 Coordinate Transform Tree (`tf2_ros`)

Suppose our LiDAR sensor (mounted $0.25\text{ m}$ forward and $0.40\text{ m}$ above the robot's rear axle, tilted down by $5^\circ$) detects a pedestrian at coordinates $\mathbf{p}_{\text{lidar}} = [2.0, 0.0, 0.0]^T$ **in the LiDAR's own coordinate frame (`lidar_link`)**.

Where is that pedestrian located relative to:
1. The robot's wheel center (**`base_link`**) so the controller can steer around them?
2. The global warehouse floor (**`map`**) so the $A^*$ planner can mark the occupancy grid cell?

In Part 2, we learned how to chain homogeneous transformation matrices ${}^{A}\mathbf{T}_{B} \in SE(3)$:

$$\mathbf{p}_{\text{map}} = {}^{\text{map}}\mathbf{T}_{\text{odom}}(t) \cdot {}^{\text{odom}}\mathbf{T}_{\text{base\_link}}(t) \cdot {}^{\text{base\_link}}\mathbf{T}_{\text{lidar\_link}} \cdot \mathbf{p}_{\text{lidar}}$$

In ROS2, you never have to multiply these matrices across network nodes by hand! **TF2 (`tf2_ros`)** maintains a live, distributed, time-buffered **Coordinate Frame Tree** across the entire robot:

```
================================================================================
   STANDARD ROS2 REP-105 TF2 COORDINATE FRAME HIERARCHY
================================================================================

        [ map ]  (Global World Frame: Discontinuous corrections from SLAM/AMCL)
           |
           |  T_map_odom(t)  <-- Published by SLAM / Localization Node (10 Hz)
           v
        [ odom ] (Smooth Continuous World Frame: Never jumps! Integrated from EKF)
           |
           |  T_odom_base(t) <-- Published by Wheel/IMU Odometry EKF (100 Hz)
           v
     [ base_link ] (Robot Chassis Center)
       /        \
      / (Static) \ (Dynamic Joint Angle q(t) from robot_state_publisher)
     v            v
[lidar_link]   [arm_shoulder_link] ---> [arm_elbow_link] ---> [gripper_tcp]
================================================================================
```

Why do we split the world frame into **`map` $\rightarrow$ `odom` $\rightarrow$ `base_link`** instead of just `map` $\rightarrow$ `base_link`?
- **Wheel/IMU Odometry (`odom` $\rightarrow$ `base_link`)** is completely smooth and continuous at $100+\text{ Hz}$, which makes it safe for a high-gain PID/MPC velocity controller—but it slowly drifts over long distances.
- **Global Localization (`map` $\rightarrow$ `odom`)** matches LiDAR scans against the floorplan map. When the robot recognizes a hallway corner, SLAM corrects the accumulated drift by jumping ${}^{\text{map}}\mathbf{T}_{\text{odom}}$. Because `odom` absorbs that jump, `odom` $\rightarrow$ `base_link` remains $100\%$ smooth and never causes a derivative kick in your motor controllers!

#### How URDF Defines Links & Joints for `robot_state_publisher`

Where do the transforms between `base_link`, `lidar_link`, and `arm_shoulder_link` come from? They come from your robot's **URDF (Unified Robot Description Format)** XML file!
- A **`<link>`** defines a rigid physical body (its mass, $3 \times 3$ inertia matrix, visual mesh, and collision cylinder).
- A **`<joint>`** connects a `parent` link to a `child` link with a fixed or rotating offset `<origin xyz="x y z" rpy="roll pitch yaw"/>`.

```xml
<robot name="warehouse_amr">
  <link name="base_link"/>
  <link name="lidar_link"/>

  <!-- Static mount: LiDAR is 0.25m forward, 0.40m up from base_link -->
  <joint name="base_to_lidar" type="fixed">
    <parent link="base_link"/>
    <child link="lidar_link"/>
    <origin xyz="0.25 0.0 0.40" rpy="0.0 0.0873 0.0"/>
  </joint>
</robot>
```

#### Querying TF2 in a Python (`rclpy`) Node

Let's see how a Python (`rclpy`) perception or planning node queries the live 3D transform ${}^{\text{map}}\mathbf{T}_{\text{lidar\_link}}(t)$ using `tf2_ros.Buffer` and `TransformListener`:

```python
import rclpy
from rclpy.node import Node
from tf2_ros import Buffer, TransformListener, TransformException

class ObstacleMapProjectorNode(Node):
    def __init__(self) -> None:
        super().__init__("obstacle_map_projector")
        # 1. Create a 10-second rolling TF2 history buffer and listener
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        self.timer = self.create_timer(0.1, self.lookup_lidar_in_map_frame)

    def lookup_lidar_in_map_frame(self) -> None:
        try:
            # 2. Query T_map_lidar at the latest available timestamp (Time())
            t_stamped = self.tf_buffer.lookup_transform(
                target_frame="map",
                source_frame="lidar_link",
                time=rclpy.time.Time(),
            )
            tx = t_stamped.transform.translation.x
            ty = t_stamped.transform.translation.y
            self.get_logger().info(f"LiDAR in map frame: x={tx:.2f}m, y={ty:.2f}m")
        except TransformException as ex:
            self.get_logger().debug(f"Waiting for TF2 tree: {ex}")
```

#### What's happening:

```python
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
#       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#       `TransformListener` subscribes to `/tf` (dynamic joints) and `/tf_static`
#       (fixed URDF mounts) in the background, caching up to 10 seconds of SE(3)
#       poses inside `self.tf_buffer` so you can query any historical timestamp!
```

```python
            t_stamped = self.tf_buffer.lookup_transform(
                target_frame="map",
                source_frame="lidar_link",
                time=rclpy.time.Time(),
            )
#           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
#           Automatically chains T_map_odom * T_odom_base * T_base_lidar using
#           spherical linear interpolation (SLERP) on quaternions!
```

---

### 5. Physics Simulation Without Hardware: MuJoCo (Multi-Joint Dynamics with Contact)

Before you ever run a new C++ or ROS2 torque controller on a real robot arm or quadruped, you test it in a **Physics Simulator**.

Today, the gold standard for robotics control, reinforcement learning, and contact-rich manipulation is **MuJoCo** (developed by Todorov et al. and open-sourced by Google DeepMind).

#### Why MuJoCo Is So Fast & Accurate

At every simulation timestep $\Delta t$ (typically $2\text{ ms} = 500\text{ Hz}$), MuJoCo integrates the continuous-time **Manipulator Equations of Motion** that we studied in Part 2:

$$\mathbf{M}(\mathbf{q})\ddot{\mathbf{q}} + \mathbf{C}(\mathbf{q}, \dot{\mathbf{q}}) + \mathbf{g}(\mathbf{q}) = \boldsymbol{\tau}_{\text{ctrl}} + \mathbf{J}_c^T(\mathbf{q})\mathbf{f}_{\text{contact}}$$

Where:
- `data.qpos` ($\mathbf{q}$) is the vector of joint positions (radians or meters).
- `data.qvel` ($\dot{\mathbf{q}}$) is the vector of joint velocities.
- `data.qfrc_bias` ($\mathbf{C}(\mathbf{q}, \dot{\mathbf{q}}) + \mathbf{g}(\mathbf{q})$) is the exact sum of Coriolis, centrifugal, and **gravity forces** computed automatically by MuJoCo's Recursive Newton-Euler algorithm (`mj_rne`)!
- `data.ctrl` ($\boldsymbol{\tau}_{\text{ctrl}}$) is the vector of actuator torques we command from our controller!

#### Building an MJCF Robot Arm & Running a 500 Hz Torque Control Loop

In MuJoCo, robots are defined using a clean, human-readable XML format called **MJCF** (or imported directly from a ROS2 `.urdf` file).

Let's write a complete, self-contained Python script (`pip install mujoco`) that:
1. Defines a 2-DOF planar robotic arm with masses, inertias, joint damping, and torque actuators in MJCF XML.
2. Runs a **$500\text{ Hz}$ ($2\text{ ms}$) Computed-Torque / PD + Gravity Compensation Control Loop**:
   $$\boldsymbol{\tau}_{\text{ctrl}} = \underbrace{\mathbf{K}_p (\mathbf{q}_{\text{des}} - \mathbf{q}) - \mathbf{K}_d \dot{\mathbf{q}}}_{\text{Feedback PD Term}} + \underbrace{\mathbf{C}(\mathbf{q}, \dot{\mathbf{q}}) + \mathbf{g}(\mathbf{q})}_{\text{Feedforward }\texttt{data.qfrc\_bias}}$$
3. Prints a dry-run telemetry trace proving **zero steady-state gravity sag**!

```python
import mujoco
import numpy as np

# 1. Define a 2-DOF Robot Arm in MuJoCo XML (MJCF)
MJCF_XML = """
<mujoco model="two_dof_planar_arm">
  <option timestep="0.002" gravity="0 0 -9.81" integrator="RK4"/>

  <worldbody>
    <!-- Link 1: Shoulder pitch joint rotating around Y-axis -->
    <body name="upper_arm" pos="0 0 1.0">
      <joint name="shoulder_pitch" type="hinge" axis="0 1 0" damping="0.2"/>
      <geom type="capsule" fromto="0 0 0 0.5 0 0" size="0.04" mass="2.0"/>

      <!-- Link 2: Elbow pitch joint at the tip of Link 1 (x = 0.5m) -->
      <body name="forearm" pos="0.5 0 0">
        <joint name="elbow_pitch" type="hinge" axis="0 1 0" damping="0.1"/>
        <geom type="capsule" fromto="0 0 0 0.4 0 0" size="0.03" mass="1.0"/>
        <site name="end_effector" pos="0.4 0 0" size="0.02"/>
      </body>
    </body>
  </worldbody>

  <!-- Direct Torque Actuators (tau_1, tau_2 in N*m) -->
  <actuator>
    <motor name="shoulder_torque" joint="shoulder_pitch" gear="1" ctrllimited="true" ctrlrange="-50 50"/>
    <motor name="elbow_torque"    joint="elbow_pitch"    gear="1" ctrllimited="true" ctrlrange="-30 30"/>
  </actuator>
</mujoco>
"""

def run_mujoco_500hz_simulation():
    # 2. Compile MJCF into static `MjModel` and dynamic state `MjData`
    model = mujoco.MjModel.from_xml_string(MJCF_XML)
    data = mujoco.MjData(model)

    # Start arm hanging straight down (q = [90 deg, 0 deg]), target horizontal [0, -45 deg]
    data.qpos[:] = np.deg2rad([60.0, 30.0])
    q_target = np.deg2rad([0.0, -45.0])

    kp = np.array([120.0, 80.0])  # Proportional stiffness (N*m / rad)
    kd = np.array([22.0,  14.0])  # Derivative damping (N*m*s / rad)

    # 3. Run 500 Hz physics loop for 1.0 second (500 ticks of 2.0 ms)
    for step in range(501):
        # Forward kinematics & dynamics (populates data.qfrc_bias = C(q,dq) + g(q))
        mujoco.mj_forward(model, data)

        # Compute PD + Gravity/Coriolis Feedforward Torque
        q_err = q_target - data.qpos
        tau_pd = kp * q_err - kd * data.qvel
        data.ctrl[:] = tau_pd + data.qfrc_bias

        if step % 100 == 0:
            ee_xyz = data.site("end_effector").xpos
            print(
                f"t={data.time:4.2f}s | q_deg={np.rad2deg(data.qpos).round(2)} "
                f"| tau_Nm={data.ctrl.round(2)} | EE_z={ee_xyz[2]:.3f}m"
            )

        # Integrate physics forward by dt = 0.002s (RK4)
        mujoco.mj_step(model, data)

if __name__ == "__main__":
    run_mujoco_500hz_simulation()
```

#### What's happening:

```python
    model = mujoco.MjModel.from_xml_string(MJCF_XML)
    data = mujoco.MjData(model)
#   ^^^^^^^^^^^^^^^^^^^^^^^^^^^
#   MuJoCo strictly separates static robot constants (`MjModel`: link masses,
#   lengths, timestep) from dynamic time-varying state (`MjData`: `qpos`, `qvel`,
#   `ctrl`). This makes resetting or running 1,000 parallel RL rollouts trivial!
```

```python
        tau_pd = kp * q_err - kd * data.qvel
        data.ctrl[:] = tau_pd + data.qfrc_bias
#                               ^^^^^^^^^^^^^^
#       Without `+ data.qfrc_bias`, gravity (-9.81 m/s^2) pulls the heavy arm
#       downward, causing a permanent steady-state droop! Adding `data.qfrc_bias`
#       exactly cancels gravity and Coriolis forces at every configuration `q`!
```

#### Concrete Dry-Run Trace Table: 500 Hz MuJoCo Simulation (`dt = 0.002 s`)

| Sim Tick | Time $t$ ($\text{s}$) | Shoulder $q_1$ (Target $0.0^\circ$) | Elbow $q_2$ (Target $-45.0^\circ$) | Gravity Bias $\mathbf{g}(\mathbf{q})$ ($\text{N}\cdot\text{m}$) | Commanded Torque $\boldsymbol{\tau}_{\text{ctrl}}$ ($\text{N}\cdot\text{m}$) | End-Effector Height $z$ ($\text{m}$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | `0.00 s` | $+60.00^\circ$ | $+30.00^\circ$ | `[-4.91,  0.00]` | **`[-50.00, -30.00]`** *(Saturated accel)* | `0.167 m` |
| **100** | `0.20 s` | $+8.42^\circ$ | $-38.15^\circ$ | `[-12.84, -1.68]` | **`[ -1.12,  -0.45]`** *(Decelerating)* | `1.148 m` |
| **200** | `0.40 s` | $+0.31^\circ$ | $-44.82^\circ$ | `[-13.30, -1.39]` | **`[-13.15,  -1.41]`** *(Settling)* | `1.280 m` |
| **300** | `0.60 s` | $+0.01^\circ$ | $-44.99^\circ$ | `[-13.31, -1.39]` | **`[-13.31,  -1.39]`** *(Holding against $g$)* | `1.283 m` |
| **500** | `1.00 s` | **`0.00°`** | **`-45.00°`** | `[-13.31, -1.39]` | **`[-13.31,  -1.39]`** *(Zero steady error!)* | **`1.283 m`** |

---

### 6. Common Mistakes & How to Fix Them

1. **Mistake: Blocking Inside a ROS2 Subscription or Timer Callback**
   - *Symptom:* Putting a `std::this_thread::sleep_for(500ms)` or a slow synchronous loop inside a callback freezes **all other timers and subscriptions** on that node!
   - *Why it happens:* By default, `rclcpp::spin(node)` uses a `SingleThreadedExecutor`, which processes one callback at a time sequentially on the main thread.
   - *Fix:* Never block inside callbacks! Use asynchronous timers/actions, or assign slow callbacks to a `MutuallyExclusiveCallbackGroup` driven by a `MultiThreadedExecutor`.

2. **Mistake: Looking Up the Latest TF2 Transform with `tf2::TimePointZero` vs. Sensor Timestamp**
   - *Symptom:* When the robot turns quickly, LiDAR obstacles appear smeared or shifted on the map by $10\text{ cm}$.
   - *Why it happens:* A LiDAR scan takes time to arrive; transforming it using the robot's pose *right now* instead of the robot's pose *at `msg->header.stamp`* (when the laser actually fired) introduces angular lag error!
   - *Fix:* Always pass `msg->header.stamp` to `tf_buffer_->lookupTransform("map", "lidar_link", msg->header.stamp)` so TF2 interpolates the exact historical pose!

---

### 7. Quick Reference Summary

| Layer / Component | Tool / API | Purpose |
| :--- | :--- | :--- |
| **ROS2 Pub/Sub** | `create_publisher` / `create_subscription` | Continuous, asynchronous many-to-many data streams (`/scan`, `/imu`, `/cmd_vel`). |
| **Sensor QoS** | `rclcpp::SensorDataQoS()` | `BestEffort` + `KeepLast(5)`: drops lost packets instead of stalling for retransmission. |
| **Coordinate Tree** | `tf2_ros::Buffer` & `TransformListener` | Tracks time-stamped 3D transforms ${}^{A}\mathbf{T}_{B}(t)$ across `map` $\rightarrow$ `odom` $\rightarrow$ `base_link`. |
| **MuJoCo State** | `MjModel` (static) + `MjData` (dynamic) | `data.qpos` ($\mathbf{q}$), `data.qvel` ($\dot{\mathbf{q}}$), `data.qfrc_bias` ($\mathbf{C}+\mathbf{g}$), `data.ctrl` ($\boldsymbol{\tau}$). |
| **Step Loop** | `mujoco.mj_step(model, data)` | Integrates multibody contact dynamics forward by `model.opt.timestep` ($\Delta t$). |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. QoS compatibility.** For each publisher → subscriber pair, does the connection form? (a) `BestEffort` → `Reliable`. (b) `Reliable` → `BestEffort`. (c) `Reliable` → `Reliable`. (d) Durability `TransientLocal` → `Volatile`. (e) Durability `Volatile` → `TransientLocal`. For any that fail, what does the subscriber's callback do?

**Q2. Trace the safety filter.** `SafetyVelocityFilterNode` receives scans whose minimum ranges are, in order, `1.50, 0.80, 0.59, 0.60, 0.30`, followed by one scan with an **empty** `ranges` vector. Assume exactly one timer tick fires after each scan. What `(linear.x, angular.z)` is published on each of the six ticks?

**Q3. Chain the TF tree by hand.** Ignore the LiDAR's $5^\circ$ pitch for this question (`rpy = 0`). ${}^{\text{base}}\mathbf{T}_{\text{lidar}}$ is a pure translation $(0.25, 0, 0.40)$. ${}^{\text{odom}}\mathbf{T}_{\text{base}}$ is translation $(3.0, 1.0, 0)$ with yaw $+90^\circ$. ${}^{\text{map}}\mathbf{T}_{\text{odom}}$ is translation $(0.5, -0.2, 0)$ with no rotation. Where is the pedestrian $\mathbf{p}_{\text{lidar}} = (2, 0, 0)$ in `base_link`, `odom` and `map`?

**Q4. PD + gravity torque.** Using the MuJoCo script's gains ($K_p = [120, 80]$, $K_d = [22, 14]$, target $[0^\circ, -45^\circ]$) and actuator limits ($\pm 50$, $\pm 30\text{ N·m}$): (a) at $\mathbf{q} = [10^\circ, -40^\circ]$, $\dot{\mathbf{q}} = [0.2, -0.1]\text{ rad/s}$, `qfrc_bias` $= [-13.0, -1.4]$, what torques are commanded? (b) Check row 0 of the chapter's dry-run table: at $\mathbf{q} = [60^\circ, 30^\circ]$, $\dot{\mathbf{q}} = \mathbf{0}$, bias $[-4.91, 0.00]$, what are the raw torques, and what does MuJoCo apply after `ctrlrange` clamping?

**Q5. Blocking a single-threaded executor.** In the C++ node, someone adds `std::this_thread::sleep_for(500ms)` inside the timer callback. `/scan` arrives at $20\text{ Hz}$ with `SensorDataQoS` (history `KeepLast(5)`). During one $500\text{ ms}$ block, how many scans arrive, how many can still be delivered afterwards, and what is the robot doing in the meantime?

### Coding Exercises

**E1 (Easy). QoS checker.** Write `qos_compatible(pub_reliability, sub_reliability, pub_durability="volatile", sub_durability="volatile") -> bool` with values `"reliable"` / `"best_effort"` and `"transient_local"` / `"volatile"`. A connection forms only if the publisher offers at least what the subscriber requests on **both** policies.
- `("best_effort", "reliable")` → `False`. `("reliable", "best_effort")` → `True`.
- `("reliable", "reliable", "volatile", "transient_local")` → `False`

**E2 (Easy–Medium). URDF transform chain with NumPy.** Write `make_T(xyz, rpy) -> np.ndarray` (4×4) using the URDF convention $\mathbf{R} = \mathbf{R}_z(\text{yaw})\,\mathbf{R}_y(\text{pitch})\,\mathbf{R}_x(\text{roll})$, and `transform_point(T, p) -> np.ndarray`. Use them to redo Q3 **with** the chapter's real pitch `rpy="0.0 0.0873 0.0"`.
- `transform_point(make_T([0.25, 0, 0.40], [0, 0.0873, 0]), [2, 0, 0])` → `[2.242, 0.0, 0.226]`
- Full chain map ← odom ← base ← lidar → `[3.5, 3.042, 0.226]`

**E3 (Medium). Feel gravity compensation without MuJoCo.** Simulate a single link (mass $2\text{ kg}$, length $0.5\text{ m}$, COM at $0.25\text{ m}$, $I = mL^2/3$, joint damping $0.2$) with semi-implicit Euler at $\Delta t = 0.002\text{ s}$. Use $\ddot{q} = (\tau - mgl_c\cos q - b\dot{q})/I$ with $q$ measured from horizontal, start at $q = 60^\circ$, target $0^\circ$, $K_p = 120$, $K_d = 22$, torque clamp $\pm 50$. Write `simulate(gravity_comp: bool, steps=1000) -> float` returning the final angle in degrees.
- `simulate(True)` → about `0.00°`
- `simulate(False)` → about `-2.34°` (permanent sag)

#### Dry-Run: Answers

**Q1.** (a) **No.** The subscriber requests more than the publisher offers. (b) **Yes.** (c) **Yes.** (d) **Yes**: a latched publisher can feed a subscriber that does not need history. (e) **No**: the subscriber demands late-join history that a volatile publisher never keeps. In the failing cases the callback **silently never fires**. `ros2 topic info <topic> --verbose` shows the mismatch.

**Q2.** The test is `min_obstacle_dist_m_ < 0.60f`, which is strict:

| Tick | Stored min (m) | `< 0.60`? | Published `(linear.x, angular.z)` |
| :---: | :---: | :---: | :---: |
| 1 | 1.50 | no | `(1.2, 0.0)` |
| 2 | 0.80 | no | `(1.2, 0.0)` |
| 3 | 0.59 | yes | `(0.0, 0.5)` |
| 4 | 0.60 | **no** (equal is not less) | `(1.2, 0.0)` |
| 5 | 0.30 | yes | `(0.0, 0.5)` |
| 6 | 0.30 (empty scan ignored) | yes | `(0.0, 0.5)` |

On tick 6 the `if (!msg->ranges.empty())` guard skips the update, so the stale $0.30$ keeps the robot braking. That is the safe default.

**Q3.**
- `base_link`: $(2 + 0.25,\ 0,\ 0 + 0.40) = \mathbf{(2.25, 0, 0.40)}$.
- `odom`: a yaw of $+90^\circ$ maps $(x, y) \to (-y, x)$, so $(2.25, 0) \to (0, 2.25)$. Adding $(3.0, 1.0)$ gives $\mathbf{(3.00, 3.25, 0.40)}$.
- `map`: add $(0.5, -0.2)$ to get $\mathbf{(3.50, 3.05, 0.40)}$.

This is exactly $\mathbf{p}_{\text{map}} = {}^{\text{map}}\mathbf{T}_{\text{odom}}\,{}^{\text{odom}}\mathbf{T}_{\text{base}}\,{}^{\text{base}}\mathbf{T}_{\text{lidar}}\,\mathbf{p}_{\text{lidar}}$, applied right to left.

**Q4.** (a) $q_{\text{err}} = [0 - 0.1745,\ -0.7854 + 0.6981] = [-0.1745,\ -0.0873]$ rad.
- Shoulder: $120(-0.1745) - 22(0.2) - 13.0 = -20.94 - 4.40 - 13.00 = \mathbf{-38.34\text{ N·m}}$
- Elbow: $80(-0.0873) - 14(-0.1) - 1.4 = -6.98 + 1.40 - 1.40 = \mathbf{-6.98\text{ N·m}}$

Both are inside the limits, so nothing is clamped.

(b) $q_{\text{err}} = [-60^\circ, -75^\circ] = [-1.0472, -1.3090]$ rad. Raw: $120(-1.0472) - 4.91 = \mathbf{-130.57}$ and $80(-1.3090) + 0 = \mathbf{-104.72}$. After `ctrlrange`: **$[-50, -30]$**, matching the "saturated" first row of the chapter's table.

**Q5.** $0.5\text{ s} \times 20\text{ Hz} = \mathbf{10}$ scans arrive. `KeepLast(5)` keeps only the newest 5, so **at most 5** can be delivered after the block and at least 5 are dropped. Meanwhile the `SingleThreadedExecutor` runs nothing else: no scan callbacks and no new `/cmd_vel`. The robot keeps executing its **last** velocity command for half a second, blind to new obstacles. Never block in callbacks.

**E1. Reference solution**

```python
RELIABILITY_RANK = {"best_effort": 0, "reliable": 1}
DURABILITY_RANK = {"volatile": 0, "transient_local": 1}

def qos_compatible(pub_reliability: str, sub_reliability: str,
                   pub_durability: str = "volatile", sub_durability: str = "volatile") -> bool:
    # Request-vs-offered: the publisher must offer at least what the subscriber asks for.
    reliability_ok = RELIABILITY_RANK[pub_reliability] >= RELIABILITY_RANK[sub_reliability]
    durability_ok = DURABILITY_RANK[pub_durability] >= DURABILITY_RANK[sub_durability]
    return reliability_ok and durability_ok

print(qos_compatible("best_effort", "reliable"))                            # False
print(qos_compatible("reliable", "best_effort"))                            # True
print(qos_compatible("reliable", "reliable", "volatile", "transient_local"))  # False
```

$O(1)$. Encoding each policy as an ordered rank turns the rule into a single `>=` per policy.

**E2. Reference solution**

```python
import math
import numpy as np

def make_T(xyz, rpy) -> np.ndarray:
    roll, pitch, yaw = rpy
    cr, sr = math.cos(roll), math.sin(roll)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cy, sy = math.cos(yaw), math.sin(yaw)
    Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
    Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    T = np.eye(4)
    T[:3, :3] = Rz @ Ry @ Rx          # URDF: roll about X, then pitch about Y, then yaw about Z
    T[:3, 3] = xyz
    return T

def transform_point(T: np.ndarray, p) -> np.ndarray:
    return (T @ np.append(np.asarray(p, dtype=float), 1.0))[:3]

T_base_lidar = make_T([0.25, 0.0, 0.40], [0.0, 0.0873, 0.0])
T_odom_base = make_T([3.0, 1.0, 0.0], [0.0, 0.0, math.pi / 2])
T_map_odom = make_T([0.5, -0.2, 0.0], [0.0, 0.0, 0.0])

print(transform_point(T_base_lidar, [2, 0, 0]).round(3))                          # [2.242 0.    0.226]
print(transform_point(T_map_odom @ T_odom_base @ T_base_lidar, [2, 0, 0]).round(3))  # [3.5   3.042 0.226]
```

A positive pitch about $+Y$ tilts the beam's $+X$ axis downward: $x = 0.25 + 2\cos(0.0873) = 2.242$ and $z = 0.40 - 2\sin(0.0873) = 0.226$. The pedestrian reading lands $17\text{ cm}$ lower than the no-pitch answer. $O(1)$ per point.

**E3. Reference solution**

```python
import math

def simulate(gravity_comp: bool, steps: int = 1000, dt: float = 0.002) -> float:
    m, length, lc, g, b = 2.0, 0.5, 0.25, 9.81, 0.2
    inertia = m * length ** 2 / 3.0             # rod pivoting about one end
    q, qd = math.radians(60.0), 0.0
    for _ in range(steps):
        grav = m * g * lc * math.cos(q)           # torque needed to hold the link (like qfrc_bias)
        tau = 120.0 * (0.0 - q) - 22.0 * qd + (grav if gravity_comp else 0.0)
        tau = max(-50.0, min(50.0, tau))          # actuator ctrlrange
        qdd = (tau - grav - b * qd) / inertia
        qd += qdd * dt                            # semi-implicit Euler
        q += qd * dt
    return math.degrees(q)

print(round(simulate(True), 2), round(simulate(False), 2))   # 0.0 -2.34
```

Without compensation, the steady state satisfies $K_p(-q) = mgl_c\cos q$, i.e. $q \approx -\frac{2 \cdot 9.81 \cdot 0.25}{120} = -0.0409\text{ rad} \approx -2.34^\circ$. This is the same droop law $e_{\text{ss}} = F_{\text{gravity}}/K_p$ from Part 3. Adding the bias term cancels gravity exactly, so $e_{\text{ss}} = 0$. $O(\text{steps})$.

---

## Interactive Visualization & shadcn/ui Specification

### Component Name: `Ros2GraphAndMujocoSimWorkbench`

Provide an interactive two-tab workbench built with **React, Tailwind CSS, Three.js / Canvas, and `shadcn/ui`** where learners can (1) inspect live ROS2 nodes, topics, QoS compatibility, and the `TF2` transform tree (`map` $\rightarrow$ `odom` $\rightarrow$ `base_link` $\rightarrow$ `lidar_link`), and (2) tune a $500\text{ Hz}$ MuJoCo 2-DOF robot arm torque controller with and without `qfrc_bias` gravity compensation.

#### 1. Layout & `shadcn/ui` Primitives
- **Outer Container**: `<Card className="w-full max-w-6xl mx-auto border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">`
- **Mode Switcher**: `<Tabs defaultValue="ros2_graph">` with two `<TabsTrigger>` tabs:
  1. `ros2_graph` — **"1. Interactive rqt_graph, QoS Inspector & TF2 Frame Tree"**
  2. `mujoco_sim` — **"2. 500 Hz MuJoCo Physics & Gravity-Compensated Torque Lab"**

#### 2. Tab 1: ROS2 Computation Graph & TF2 Explorer (`ros2_graph`)
- **QoS Compatibility Simulator**:
  - `<Select>` dropdowns to configure Publisher Reliability (`BestEffort` vs `Reliable`) and Subscriber Reliability (`BestEffort` vs `Reliable`) on `/scan` and `/cmd_vel`, plus `KeepLast(N)` depth `<Slider>`.
  - When the user sets Publisher = `BestEffort` and Subscriber = `Reliable`, the animated topic pipe turns red with a pulsing `<Badge variant="destructive">QoS INCOMPATIBLE: 0 Hz Delivered!</Badge>` and a `<Tooltip>` explaining the DDS matching rule.
- **Interactive TF2 Coordinate Frame Tree**:
  - Visualizes the live coordinate axes for `map`, `odom`, `base_link`, and `lidar_link`.
  - Includes a `<Button variant="outline">` `"Trigger SLAM Loop-Closure Jump (+0.3m)"` that visibly jumps ${}^{\text{map}}\mathbf{T}_{\text{odom}}$ while showing in a live chart that ${}^{\text{odom}}\mathbf{T}_{\text{base\_link}}$ remains $100\%$ continuous and jerk-free!

#### 3. Tab 2: 500 Hz MuJoCo Arm Torque Control Simulator (`mujoco_sim`)
- **Controller Tuning Controls**:
  - `<Slider>` controls for target angles $(q_{1,\text{des}}, q_{2,\text{des}})$, proportional gains $\mathbf{K}_p$, derivative damping $\mathbf{K}_d$, and payload mass at the end-effector ($0.0\text{ kg}$ to $5.0\text{ kg}$).
  - `<Switch>` for **`"Enable + data.qfrc_bias (Gravity & Coriolis Feedforward)"`**.
  - `<Select>` for Integrator Timestep $\Delta t \in \{0.002\text{ s (500 Hz)}, 0.010\text{ s (100 Hz)}, 0.050\text{ s (20 Hz - Unstable!)}\}$.
- **Interactive Arm Canvas & Real-Time Strip Charts**:
  - Renders the 2-DOF capsule arm with gravity vector $\mathbf{g}$, target ghost pose, and real-time torque vectors at the shoulder and elbow joints.
  - Toggling off `data.qfrc_bias` immediately shows the arm sagging below the target pose with a red `<Badge variant="destructive">Steady-State Gravity Droop: -6.4°</Badge>`, while toggling it on snaps the steady-state error to **`0.00°`**!
