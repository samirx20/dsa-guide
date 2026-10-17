# Part 3, Topic 2: Probabilistic Robotics & Kalman Filtering

## Project: 100Hz Closed-Loop Waypoint Follower with Kalman State Estimator

---

### Project Overview & Why This Matters

In Topic 1, you learned how to build **PID and Cascaded Control Loops**—but those controllers assumed a sensor handed them a clean, noiseless measurement $y(t)$ on every tick.
In Topic 2, you learned how to build an **Extended Kalman Filter (EKF)** that fuses high-rate, drifting wheel odometry with low-rate, noisy GPS/beacon measurements to estimate the true robot state $\hat{\mathbf{x}} = [\hat{x}, \hat{y}, \hat{\theta}]^T$.

**In real autonomous robots, Control and State Estimation are married together in a single closed-loop pipeline:**
- If you feed raw, noisy GPS directly into a PID heading controller, the Derivative term amplifies the $\pm 0.5\text{ m}$ GPS jumps into violent steering convulsions!
- If you drive using wheel odometry alone without GPS updates, tire slip causes the robot to miss the final waypoint by meters!

In this capstone project for Part 3, you will engineer a complete, production-style **Multi-Rate $100\text{ Hz}$ Closed-Loop Autonomous Waypoint Follower** in both C++ and Python that fuses:
1. **$100\text{ Hz}$ Wheel Odometry + IMU Gyroscope** ($\Delta t = 0.01\text{ s}$) inside the **EKF Predict** step.
2. **$10\text{ Hz}$ Noisy 2D GPS / Indoor UWB Beacon Fixes** (every $10\text{th}$ tick, $\Delta t_{\text{gps}} = 0.10\text{ s}$) inside the **EKF Update** step, protected by a **$3\sigma$ Mahalanobis Outlier Gate**.
3. **$100\text{ Hz}$ Dual-Loop Waypoint Controller** (Distance P-Controller with Velocity Clamping + Heading PID Controller with Angle Wrapping and Anti-Windup) driven by the smooth **EKF Posterior State Estimate** $\hat{\mathbf{x}}_k$.

---

### 1. System Architecture & Multi-Rate Timing Diagram

Real robots rarely get all their sensor measurements at the same rate:
- **Encoders & IMU:** Run fast at $100\text{ Hz}$ ($\Delta t = 10\text{ ms}$).
- **GPS / UWB / AprilTag Camera:** Run slower at $10\text{ Hz}$ ($\Delta t = 100\text{ ms}$).

How does our $100\text{ Hz}$ real-time loop handle this?
- **Every single $10\text{ ms}$ tick ($100\text{ Hz}$):** Run `ekf.predict(v_odom, omega_imu, dt)` AND run `controller.compute_command(ekf.state(), current_waypoint)`.
- **Every $10\text{th}$ tick ($10\text{ Hz}$):** When a fresh GPS packet arrives, first check the **$3\sigma$ Outlier Gate**; if valid, run `ekf.update(z_gps)` before computing the control command!

```
  MULTI-RATE REAL-TIME AUTONOMOUS NAVIGATION ARCHITECTURE (100 Hz Base Tick)

  [ Wheel Encoders + IMU ] (100 Hz)
             |
             v (v_odom, omega_odom)
  +-----------------------------------------+     10 Hz GPS Ping z = [x_gps, y_gps]^T
  |      EXTENDED KALMAN FILTER (EKF)       | <-----------------------------------------+
  |  * 100 Hz: Predict(x_hat, P) via F_k    |     (Checked by 3-Sigma Outlier Gate!)    |
  |  *  10 Hz: Update(x_hat, P) via Gain K  |                                           |
  +-----------------------------------------+                                           |
             |                                                                          |
             | Smooth State Estimate: x_hat = [x, y, theta]^T (100 Hz)                  |
             v                                                                          |
  +-----------------------------------------+     Waypoints [(x0,y0), (x1,y1), ...]     |
  |   WAYPOINT GUIDANCE & PID CONTROLLER    | <-----------------------------------+     |
  |  * Distance Error: d_err = hypot(dx,dy) |                                     |     |
  |  * Heading Error:  wrapToPi(theta* - th)|                                     |     |
  |  * Outputs: v_cmd (m/s), omega_cmd (r/s)|                                     |     |
  +-----------------------------------------+                                     |     |
             |                                                                    |     |
             v Control Effort u = [v_cmd, omega_cmd]^T (100 Hz)                   |     |
  +-----------------------------------------+                                     |     |
  |       DIFFERENTIAL-DRIVE ROBOT          | ------------------------------------+-----+
  |   True Physics + Slip + Sensor Noise    |
  +-----------------------------------------+
```

---

### 2. Mathematical Specification of the 4 Modules

#### Module 1: Unicycle Kinematics & EKF State Prediction ($100\text{ Hz}$)
Our state vector is $\hat{\mathbf{x}} = \begin{bmatrix} \hat{x} & \hat{y} & \hat{\theta} \end{bmatrix}^T$. Given noisy odometry linear speed $v_m$ and angular speed $\omega_m$ over $\Delta t = 0.01\text{ s}$:

$$\hat{\mathbf{x}}_{k|k-1} = \begin{bmatrix} \hat{x}_{k-1} + v_m \cos(\hat{\theta}_{k-1})\,\Delta t \\ \hat{y}_{k-1} + v_m \sin(\hat{\theta}_{k-1})\,\Delta t \\ \operatorname{wrapToPi}(\hat{\theta}_{k-1} + \omega_m\,\Delta t) \end{bmatrix}$$

With Jacobian matrix $\mathbf{F}_k$ and covariance propagation:
$$\mathbf{F}_k = \begin{bmatrix} 1 & 0 & -v_m \sin(\hat{\theta}_{k-1})\,\Delta t \\ 0 & 1 & +v_m \cos(\hat{\theta}_{k-1})\,\Delta t \\ 0 & 0 & 1 \end{bmatrix}, \qquad \mathbf{P}_{k|k-1} = \mathbf{F}_k \mathbf{P}_{k-1} \mathbf{F}_k^T + \mathbf{Q}$$

#### Module 2: $3\sigma$ Outlier Gate & EKF GPS Update ($10\text{ Hz}$)
When a 2D GPS measurement $\mathbf{z}_k = \begin{bmatrix} z_x \\ z_y \end{bmatrix}$ arrives with observation matrix $\mathbf{H} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \end{bmatrix}$:
1. Compute innovation $\mathbf{y}_k = \mathbf{z}_k - \mathbf{H}\hat{\mathbf{x}}_{k|k-1}$ and innovation covariance $\mathbf{S}_k = \mathbf{H}\mathbf{P}_{k|k-1}\mathbf{H}^T + \mathbf{R}$.
2. **Mahalanobis Outlier Check:** Compute normalized innovation squared:
   $$d_M^2 = \mathbf{y}_k^T \mathbf{S}_k^{-1} \mathbf{y}_k$$
   If $d_M^2 > 9.21$ (the $99\%$ $\chi^2$ threshold for 2 degrees of freedom, or $\approx 3\sigma$ per axis), **reject the glitch** and skip the update!
3. Otherwise, apply the Joseph-form Kalman update:
   $$\mathbf{K}_k = \mathbf{P}_{k|k-1}\mathbf{H}^T \mathbf{S}_k^{-1}, \qquad \hat{\mathbf{x}}_k = \hat{\mathbf{x}}_{k|k-1} + \mathbf{K}_k \mathbf{y}_k$$
   $$\mathbf{P}_k = (\mathbf{I} - \mathbf{K}_k\mathbf{H})\mathbf{P}_{k|k-1}(\mathbf{I} - \mathbf{K}_k\mathbf{H})^T + \mathbf{K}_k \mathbf{R} \mathbf{K}_k^T$$

#### Module 3: Line-of-Sight Waypoint Guidance Law
Given current estimated pose $(\hat{x}, \hat{y}, \hat{\theta})$ and active target waypoint $(x_{\text{wp}}, y_{\text{wp}})$:
$$\Delta x = x_{\text{wp}} - \hat{x}, \qquad \Delta y = y_{\text{wp}} - \hat{y}$$
$$d_{\text{err}} = \sqrt{\Delta x^2 + \Delta y^2}, \qquad \theta_{\text{goal}} = \operatorname{atan2}(\Delta y, \Delta x)$$
$$e_\theta = \operatorname{wrapToPi}\bigl(\theta_{\text{goal}} - \hat{\theta}\bigr) = \operatorname{atan2}\bigl(\sin(\theta_{\text{goal}} - \hat{\theta}),\; \cos(\theta_{\text{goal}} - \hat{\theta})\bigr)$$

#### Module 4: Dual Closed-Loop Velocity & Heading PID Controller
- **Forward Speed Command ($v_{\text{cmd}}$):** Proportional to distance $d_{\text{err}}$, scaled by $\max(0, \cos e_\theta)$ so the robot **slows down to pivot in place** if it is facing more than $90^\circ$ away from the waypoint!
  $$v_{\text{cmd}} = \operatorname{clamp}\bigl(K_{p,\text{dist}} \cdot d_{\text{err}} \cdot \max(0.0, \cos e_\theta),\; 0.0,\; v_{\max}\bigr)$$
- **Angular Turn Rate Command ($\omega_{\text{cmd}}$):** Full PID on $e_\theta$ with anti-windup and derivative on heading measurement:
  $$\omega_{\text{cmd}} = \operatorname{clamp}\bigl(K_{p,\theta} e_\theta + K_{i,\theta} \int e_\theta\,dt - K_{d,\theta}\dot{\hat{\theta}},\; -\omega_{\max},\; +\omega_{\max}\bigr)$$
- **Waypoint Switching Criterion:** When $d_{\text{err}} < r_{\text{capture}}$ (e.g., $0.25\text{ m}$), advance the mission index to the next waypoint!

---

### 3. Step-by-Step Numerical Dry-Run of One Complete Cycle

Suppose our robot is at estimated pose $\hat{\mathbf{x}} = [1.00\text{ m},\; 1.00\text{ m},\; 0.00\text{ rad}]^T$ (facing East along $+X$), driving toward Waypoint $W_1 = (4.00\text{ m},\; 5.00\text{ m})$:

| Stage | Calculation | Concrete Value | Physical Meaning |
| :--- | :--- | :--- | :--- |
| **1. Vector to Goal** | $\Delta x = 4.0 - 1.0,\; \Delta y = 5.0 - 1.0$ | $\Delta x = 3.0\text{ m},\; \Delta y = 4.0\text{ m}$ | Classic $3\text{–}4\text{–}5$ right triangle to waypoint! |
| **2. Distance Error** | $d_{\text{err}} = \sqrt{3.0^2 + 4.0^2}$ | **$5.00\text{ m}$** | Robot is $5.0\text{ m}$ away from $W_1$. |
| **3. Target Heading** | $\theta_{\text{goal}} = \operatorname{atan2}(4.0, 3.0)$ | **$+0.927\text{ rad}$** ($+53.1^\circ$) | Waypoint is $53.1^\circ$ North of East. |
| **4. Heading Error** | $e_\theta = \operatorname{wrapToPi}(0.927 - 0.000)$ | **$+0.927\text{ rad}$** | Need to turn left (counter-clockwise) by $53.1^\circ$. |
| **5. Turn Rate $\omega_{\text{cmd}}$** | $K_{p,\theta} e_\theta = 2.5 \times 0.927$ (clamped to $\pm 2.0$) | **$+2.00\text{ rad/s}$** | Steers sharply left at max safe angular speed. |
| **6. Linear Speed $v_{\text{cmd}}$** | $\operatorname{clamp}(1.0 \times 5.0 \times \cos(0.927), 0, 1.5)$ | **$+1.50\text{ m/s}$** | $\cos(53.1^\circ) = 0.60 \implies 3.0\text{ m/s}$, clamped to $1.50\text{ m/s}$ cap. |

---

### 4. Complete Runnable Implementation (C++ & Python)

#### C++ Implementation (`waypoint_ekf_follower.cpp`)

```cpp
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <algorithm>
#include <iomanip>

struct Waypoint { double x, y; };

double wrapToPi(double angle) {
    return std::atan2(std::sin(angle), std::cos(angle));
    // ^^^ Always normalize angles into [-pi, +pi] so +/-180 deg transitions never spin 360 deg!
}

class EKFStateEstimator {
public:
    EKFStateEstimator()
        : x_{0.0, 0.0, 0.0},
          P_{{0.2, 0.0, 0.0}, {0.0, 0.2, 0.0}, {0.0, 0.0, 0.05}} {}
        // ^^^ Initialize state [x, y, theta] and 3x3 covariance matrix P

    void predict(double v_odom, double w_odom, double dt) {
        double th = x_[2];
        x_[0] += v_odom * std::cos(th) * dt;
        x_[1] += v_odom * std::sin(th) * dt;
        x_[2] = wrapToPi(th + w_odom * dt);
        // ^^^ 100Hz EKF Predict: advance state mean using unicycle kinematics

        double F02 = -v_odom * std::sin(th) * dt;
        double F12 =  v_odom * std::cos(th) * dt;
        // ^^^ Non-zero off-diagonal Jacobian terms d(dx)/d(theta) and d(dy)/d(theta)

        double q_pos = 0.001, q_th = 0.0005;
        P_[0][0] += 2.0 * F02 * P_[0][2] + F02 * F02 * P_[2][2] + q_pos;
        P_[1][1] += 2.0 * F12 * P_[1][2] + F12 * F12 * P_[2][2] + q_pos;
        P_[0][2] += F02 * P_[2][2]; P_[2][0] = P_[0][2];
        P_[1][2] += F12 * P_[2][2]; P_[2][1] = P_[1][2];
        P_[2][2] += q_th;
        // ^^^ Propagate P = F * P * F^T + Q concisely; uncertainty grows on every 10ms tick
    }

    bool updateGPS(double z_x, double z_y, double r_var) {
        double y0 = z_x - x_[0];
        double y1 = z_y - x_[1];
        // ^^^ 10Hz Measurement Innovation y = z - H * x_hat

        double S00 = P_[0][0] + r_var;
        double S11 = P_[1][1] + r_var;
        // ^^^ Diagonal innovation variances S = H * P * H^T + R

        double mahal_sq = (y0 * y0) / S00 + (y1 * y1) / S11;
        if (mahal_sq > 9.21) {
            return false;
            // ^^^ 3-Sigma Outlier Gate: reject extreme GPS multipath spikes (chi^2 > 9.21)!
        }

        double K00 = P_[0][0] / S00, K20 = P_[2][0] / S00;
        double K11 = P_[1][1] / S11, K21 = P_[2][1] / S11;
        // ^^^ Compute Kalman Gain K = P * H^T * S^-1

        x_[0] += K00 * y0;
        x_[1] += K11 * y1;
        x_[2] = wrapToPi(x_[2] + K20 * y0 + K21 * y1);
        // ^^^ Fuse GPS innovation into [x, y, theta]

        P_[0][0] *= (1.0 - K00);
        P_[1][1] *= (1.0 - K11);
        P_[0][2] *= (1.0 - K00); P_[2][0] = P_[0][2];
        P_[1][2] *= (1.0 - K11); P_[2][1] = P_[1][2];
        // ^^^ Shrink covariance P after successful GPS fusion
        return true;
    }

    double x() const { return x_[0]; }
    double y() const { return x_[1]; }
    double theta() const { return x_[2]; }

private:
    double x_[3];
    double P_[3][3];
};

int main() {
    std::vector<Waypoint> waypoints = {{4.0, 2.0}, {6.0, 6.0}, {1.0, 5.0}};
    // ^^^ 3-waypoint mission tour
    size_t wp_idx = 0;
    EKFStateEstimator ekf;

    double true_x = 0.0, true_y = 0.0, true_th = 0.0;
    double dt = 0.01; // 100 Hz control & prediction loop
    double heading_int = 0.0, prev_th_est = 0.0;
    std::mt19937 rng(42);
    std::normal_distribution<double> gps_noise(0.0, 0.30), odom_noise(0.0, 0.05);

    for (int tick = 0; tick <= 1500 && wp_idx < waypoints.size(); ++tick) {
        Waypoint target = waypoints[wp_idx];
        double dx = target.x - ekf.x();
        double dy = target.y - ekf.y();
        double dist_err = std::hypot(dx, dy);
        // ^^^ Compute Euclidean distance to active waypoint using EKF state estimate

        if (dist_err < 0.25) {
            std::cout << "[Tick " << std::setw(4) << tick << "] Reached Waypoint " << wp_idx
                      << " (" << target.x << ", " << target.y << ")! True Pose: ("
                      << std::fixed << std::setprecision(2) << true_x << ", " << true_y << ")\n";
            wp_idx++;
            heading_int = 0.0;
            continue;
            // ^^^ Advance to next waypoint and reset heading integral accumulator
        }

        double goal_th = std::atan2(dy, dx);
        double th_err = wrapToPi(goal_th - ekf.theta());
        // ^^^ Wrapped heading error in [-pi, +pi]

        double d_th = -wrapToPi(ekf.theta() - prev_th_est) / dt;
        prev_th_est = ekf.theta();
        // ^^^ Derivative on heading measurement (-d_theta/dt) prevents derivative kick on waypoint switch!

        heading_int = std::clamp(heading_int + th_err * dt, -0.5, 0.5);
        // ^^^ Clamped integral anti-windup on heading error
        double w_cmd = std::clamp(3.0 * th_err + 0.4 * heading_int + 0.15 * d_th, -2.5, 2.5);
        double v_cmd = std::clamp(1.2 * dist_err * std::max(0.0, std::cos(th_err)), 0.0, 1.5);
        // ^^^ Slow down forward speed when misaligned (cos(th_err)) so robot pivots cleanly!

        // Simulate true robot motion + wheel slip
        true_x += v_cmd * std::cos(true_th) * dt;
        true_y += v_cmd * std::sin(true_th) * dt;
        true_th = wrapToPi(true_th + w_cmd * dt);

        // 100 Hz EKF Predict using noisy odometry
        ekf.predict(v_cmd + odom_noise(rng), w_cmd + 0.2 * odom_noise(rng), dt);

        // 10 Hz EKF Update using noisy GPS
        if (tick % 10 == 0) {
            ekf.updateGPS(true_x + gps_noise(rng), true_y + gps_noise(rng), 0.09);
        }
    }
    return 0;
}
```

#### Python Implementation (`waypoint_ekf_follower.py`)

```python
import math
import numpy as np

def wrap_to_pi(angle: float) -> float:
    return math.atan2(math.sin(angle), math.cos(angle))
    # ^^^ Normalize any angle in radians into [-pi, +pi]

class WaypointFollowerSystem:
    def __init__(self, waypoints: list[tuple[float, float]]):
        self.waypoints = waypoints
        self.wp_idx = 0
        # ^^^ Active waypoint list and current mission index

        # EKF State [x, y, theta]^T and 3x3 Covariance P
        self.x_est = np.zeros((3, 1))
        self.P = np.diag([0.2, 0.2, 0.05])
        self.Q = np.diag([0.001, 0.001, 0.0005])
        self.R = np.diag([0.09, 0.09])  # GPS std dev = 0.30m -> variance = 0.09 m^2
        self.H = np.array([[1.0, 0.0, 0.0],
                           [0.0, 1.0, 0.0]])
        # ^^^ EKF matrices for 100Hz prediction and 10Hz 2D GPS updates

        # Heading PID controller state
        self.heading_integral = 0.0
        self.prev_theta_est = 0.0
        self.outliers_rejected = 0

    def ekf_predict(self, v_odom: float, w_odom: float, dt: float) -> None:
        th = self.x_est[2, 0]
        self.x_est[0, 0] += v_odom * math.cos(th) * dt
        self.x_est[1, 0] += v_odom * math.sin(th) * dt
        self.x_est[2, 0] = wrap_to_pi(th + w_odom * dt)
        # ^^^ Propagate mean using nonlinear unicycle kinematics

        F_k = np.array([
            [1.0, 0.0, -v_odom * math.sin(th) * dt],
            [0.0, 1.0,  v_odom * math.cos(th) * dt],
            [0.0, 0.0,  1.0]
        ])
        # ^^^ 3x3 Jacobian of unicycle model with respect to [x, y, theta]
        self.P = F_k @ self.P @ F_k.T + self.Q
        # ^^^ Propagate covariance matrix P

    def ekf_update_gps(self, z_xy: np.ndarray) -> bool:
        z = z_xy.reshape(2, 1)
        y = z - (self.H @ self.x_est)
        # ^^^ Innovation residual y = z - H * x_hat
        S = self.H @ self.P @ self.H.T + self.R
        S_inv = np.linalg.inv(S)

        mahal_sq = float((y.T @ S_inv @ y)[0, 0])
        if mahal_sq > 9.21:
            self.outliers_rejected += 1
            return False
            # ^^^ Reject 3-sigma GPS multipath outliers before they corrupt state estimate!

        K = self.P @ self.H.T @ S_inv
        self.x_est = self.x_est + (K @ y)
        self.x_est[2, 0] = wrap_to_pi(self.x_est[2, 0])
        # ^^^ Update state estimate and re-wrap heading angle
        I = np.eye(3)
        self.P = (I - K @ self.H) @ self.P @ (I - K @ self.H).T + K @ self.R @ K.T
        # ^^^ Numerically stable Joseph-form covariance update
        return True

    def compute_control(self, dt: float) -> tuple[float, float, bool]:
        if self.wp_idx >= len(self.waypoints):
            return 0.0, 0.0, True
            # ^^^ Mission complete: command zero velocity

        wx, wy = self.waypoints[self.wp_idx]
        dx = wx - self.x_est[0, 0]
        dy = wy - self.x_est[1, 0]
        dist_err = math.hypot(dx, dy)
        # ^^^ Distance to current waypoint from EKF estimated position

        if dist_err < 0.25:
            self.wp_idx += 1
            self.heading_integral = 0.0
            return self.compute_control(dt)
            # ^^^ Waypoint captured! Advance index and reset integral memory

        goal_th = math.atan2(dy, dx)
        th_est = self.x_est[2, 0]
        th_err = wrap_to_pi(goal_th - th_est)
        # ^^^ Wrapped heading error e_theta in [-pi, +pi]

        d_th = -wrap_to_pi(th_est - self.prev_theta_est) / dt
        self.prev_theta_est = th_est
        # ^^^ Derivative on measurement (-d_theta/dt) prevents derivative kick on waypoint transition

        self.heading_integral = max(-0.5, min(0.5, self.heading_integral + th_err * dt))
        w_cmd = 3.0 * th_err + 0.4 * self.heading_integral + 0.15 * d_th
        w_cmd = max(-2.5, min(2.5, w_cmd))
        # ^^^ Clamped PID turn rate command in [-2.5, +2.5] rad/s

        alignment_scale = max(0.0, math.cos(th_err))
        v_cmd = max(0.0, min(1.5, 1.2 * dist_err * alignment_scale))
        # ^^^ Forward velocity scales with cos(th_err) so robot pivots before charging ahead
        return v_cmd, w_cmd, False


if __name__ == "__main__":
    np.random.seed(42)
    mission = [(4.0, 2.0), (6.0, 6.0), (1.0, 5.0), (0.0, 0.0)]
    nav = WaypointFollowerSystem(mission)
    true_pose = np.array([0.0, 0.0, 0.0])
    dt = 0.01  # 100 Hz

    for tick in range(2500):
        v_cmd, w_cmd, done = nav.compute_control(dt)
        if done:
            print(f"Mission complete at t={tick*dt:.2f}s! Final True Pose: {true_pose.round(3)}")
            print(f"Outlier glitches rejected: {nav.outliers_rejected}")
            break
        true_pose[0] += v_cmd * math.cos(true_pose[2]) * dt
        true_pose[1] += v_cmd * math.sin(true_pose[2]) * dt
        true_pose[2] = wrap_to_pi(true_pose[2] + w_cmd * dt)

        nav.ekf_predict(v_cmd + np.random.normal(0, 0.05), w_cmd + np.random.normal(0, 0.02), dt)
        if tick % 10 == 0:
            z_gps = true_pose[:2] + np.random.normal(0, 0.30, size=2)
            if tick == 500:
                z_gps += np.array([15.0, -12.0])  # Inject a massive 19m GPS multipath spike!
            nav.ekf_update_gps(z_gps)
```

---

### 5. Verification & Milestone Checklist

Use these four concrete engineering verification tests to validate your implementation:

| Milestone | Test Condition | Expected Quantitative Pass Criterion |
| :--- | :--- | :--- |
| **1. Angle Wrapping across $\pm\pi$** | Place robot at $(0, 0)$ facing $\hat{\theta} = +178^\circ$ and waypoint at $(-5, -0.2)$ ($\theta_{\text{goal}} = -178^\circ$). | Heading error $e_\theta = -4^\circ$ ($-0.07\text{ rad}$), **not** $-356^\circ$; robot turns $4^\circ$ right smoothly. |
| **2. Pivot-Before-Charge Alignment** | Place waypoint $95^\circ$ behind the robot ($|e_\theta| > 90^\circ$). | Forward speed command $v_{\text{cmd}} = 0.0\text{ m/s}$ while $|e_\theta| \ge 90^\circ$; robot pivots in place before accelerating. |
| **3. Multi-Rate EKF vs. Dead-Reckoning** | Run the 4-waypoint loop with wheel slip ($\sigma_v = 0.1\text{ m/s}$) with GPS ON vs. GPS OFF. | With $10\text{ Hz}$ EKF GPS ON, position RMSE stays $< 0.15\text{ m}$ and captures all 4 waypoints; with GPS OFF, robot drifts $> 1.2\text{ m}$ off course. |
| **4. $3\sigma$ Mahalanobis Glitch Rejection** | Inject a $+15\text{ m}$ GPS spike at $t = 5.0\text{ s}$ (`tick == 500`). | `mahal_sq > 9.21` triggers; `ekf_update_gps` returns `False`, and trajectory shows zero steering jerk. |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. One guidance cycle with the Python gains.** The EKF estimate is $\hat{\mathbf{x}} = [2.0\text{ m},\ 1.0\text{ m},\ \pi/2]^T$ (facing North) and the active waypoint is $(5.0, 5.0)$. Trace `compute_control(dt=0.01)` from the Python implementation. Assume `heading_integral = 0` and `prev_theta_est` $= \pi/2$ before the call, so the derivative term is $0$. Give $d_{\text{err}}$, $\theta_{\text{goal}}$, $e_\theta$, `heading_integral`, `w_cmd` and `v_cmd`.

**Q2. Wrap and pivot.** (a) $\hat{\theta} = +170^\circ$ and $\theta_{\text{goal}} = -170^\circ$. What is the wrapped $e_\theta$, and which way does the robot turn? (b) With the waypoint at $e_\theta = 100^\circ$, what is $v_{\text{cmd}}$, and why?

**Q3. The C++ outlier gate.** In `updateGPS`, suppose $S_{00} = S_{11} = 0.25\text{ m}^2$ ($P = 0.16$ plus $R = 0.09$). For innovations (a) $\mathbf{y} = (0.9, -1.2)$ and (b) $\mathbf{y} = (1.0, 1.2)$, compute `mahal_sq` and say whether the update runs.

**Q4. Covariance growth in one predict.** Starting from the C++ `EKFStateEstimator` initial $\mathbf{P} = \operatorname{diag}(0.2, 0.2, 0.05)$ with heading $\hat{\theta} = \pi/2$, call `predict(1.0, 0.0, 0.01)` once. Compute `F02`, `F12`, and the new `P[0][0]`, `P[1][1]`, `P[0][2]`, `P[2][2]`. Which position axis gains a correlation with heading, and why that one?

**Q5. Multi-rate bookkeeping.** In the Python `__main__` loop (100 Hz, GPS when `tick % 10 == 0`): (a) how many GPS updates are attempted during ticks 0–99? (b) At what simulated time is the multipath spike injected, and how far (in metres) does it displace the GPS fix? (c) If the spike is rejected, how many EKF predict steps run before the next GPS update is attempted?

### Coding Exercises

**E1 (Easy). Pure-P guidance law.** Write `guidance(pose, wp, kp_dist=1.0, v_max=1.5, kp_th=2.5, w_max=2.0) -> tuple[float, float, float, float]` that returns $(d_{\text{err}}, e_\theta, v_{\text{cmd}}, \omega_{\text{cmd}})$ using Modules 3–4 with a P-only heading loop.
- `guidance((1, 1, 0), (4, 5))` → `(5.0, 0.927, 1.5, 2.0)` (Section 3 table)
- `guidance((0, 0, 0), (-1, 0.5))` → `(1.118, 2.678, 0.0, 2.0)` (waypoint behind: pivot in place)

**E2 (Easy–Medium). Waypoint manager with multi-capture.** Write a class `WaypointManager(waypoints, capture_radius=0.25)` with `advance(est_xy) -> int` that keeps advancing the index while the current waypoint is within the capture radius, so closely spaced waypoints can be captured in one tick. It returns the active index, or `len(waypoints)` when the mission is complete.
- `wm = WaypointManager([(1.0, 0.0), (1.1, 0.0), (3.0, 0.0)])`
- `wm.advance((0.95, 0.0))` → `2` (both of the first two captured at once)
- `wm.advance((2.9, 0.1))` → `3` (mission complete)

**E3 (Medium). Full vs. diagonal Mahalanobis gate.** The C++ `updateGPS` uses only the diagonal of $\mathbf{S}$, while the Python version uses the full $\mathbf{S}^{-1}$. Write `mahal_sq_full(y, S)` (hand-inverting the $2 \times 2$) and `mahal_sq_diag(y, S)`, then show a case where the two gates disagree at the $9.21$ threshold.
- `S = [[0.25, 0.15], [0.15, 0.25]]`, `y = (1.0, 1.2)` → full `6.25` (accept), diag `9.76` (reject)

#### Dry-Run: Answers

**Q1.** $\Delta x = 3.0$ and $\Delta y = 4.0$, so $d_{\text{err}} = \mathbf{5.0\text{ m}}$ and $\theta_{\text{goal}} = \operatorname{atan2}(4, 3) = \mathbf{0.927\text{ rad}}$. Then $e_\theta = \operatorname{wrap}(0.927 - 1.571) = \mathbf{-0.644\text{ rad}}$ ($-36.87^\circ$): turn right. `heading_integral` $= \operatorname{clamp}(0 + (-0.644)(0.01)) = \mathbf{-0.00644}$. `w_cmd` $= 3.0(-0.644) + 0.4(-0.00644) + 0.15(0) = -1.931 - 0.003 = \mathbf{-1.933\text{ rad/s}}$, which is inside $\pm 2.5$. `v_cmd` $= \operatorname{clamp}(1.2 \times 5.0 \times \cos(-0.644)) = \operatorname{clamp}(6.0 \times 0.8) = \operatorname{clamp}(4.8) = \mathbf{1.5\text{ m/s}}$.

**Q2.** (a) The raw difference is $-170 - 170 = -340^\circ$, which wraps to $\mathbf{+20^\circ}$, a $20^\circ$ left (counter-clockwise) turn through $180^\circ$, not a $340^\circ$ right spin. (b) $\cos 100^\circ = -0.174$ and $\max(0, -0.174) = 0$, so **$v_{\text{cmd}} = 0$**. The robot pivots in place until $|e_\theta| < 90^\circ$ (Milestone 2).

**Q3.** `mahal_sq` $= y_0^2/S_{00} + y_1^2/S_{11}$. (a) $(0.81 + 1.44)/0.25 = \mathbf{9.00} \le 9.21$, so it is **accepted** and the update runs. (b) $(1.00 + 1.44)/0.25 = \mathbf{9.76} > 9.21$, so it is **rejected** and `updateGPS` returns `false`.

**Q4.** $\sin(\pi/2) = 1$ and $\cos(\pi/2) = 0$, so `F02` $= -1.0 \times 1 \times 0.01 = \mathbf{-0.01}$ and `F12` $= \mathbf{0}$ (up to float error, about $6 \times 10^{-19}$). With the old $P_{02} = 0$ and $P_{22} = 0.05$:
- `P[0][0]` $= 0.2 + 2(-0.01)(0) + (0.01)^2(0.05) + 0.001 = \mathbf{0.201005}$
- `P[1][1]` $= 0.2 + 0 + 0 + 0.001 = \mathbf{0.201}$
- `P[0][2]` $= 0 + (-0.01)(0.05) = \mathbf{-0.0005}$
- `P[2][2]` $= 0.05 + 0.0005 = \mathbf{0.0505}$ (updated last, so the lines above use the old $0.05$)

Only $x$ correlates with heading. Facing North, a small heading error swings the robot sideways in $x$ (a positive $\delta\theta$ moves it toward $-x$, hence the negative sign), but it does not change how far it travels in $y$ to first order.

**Q5.** (a) Ticks $0, 10, 20, \dots, 90$ give **10 GPS updates** (10 Hz). (b) `tick == 500` corresponds to $t = 500 \times 0.01 = \mathbf{5.0\text{ s}}$. The offset is $(15, -12)$, so its magnitude is $\sqrt{225 + 144} = \sqrt{369} \approx \mathbf{19.2\text{ m}}$. (c) The next GPS tick is 510. Predict runs on every tick, so ticks 501–509 plus 510 itself (predict runs before the update in the loop) make **10 predict steps** between the two update attempts. The estimate rides on odometry alone for $0.1\text{ s}$.

**E1. Reference solution**

```python
import math

def wrap_to_pi(a: float) -> float:
    return math.atan2(math.sin(a), math.cos(a))

def guidance(pose, wp, kp_dist=1.0, v_max=1.5, kp_th=2.5, w_max=2.0):
    x, y, th = pose
    dx, dy = wp[0] - x, wp[1] - y
    d_err = math.hypot(dx, dy)
    e_th = wrap_to_pi(math.atan2(dy, dx) - th)
    v_cmd = max(0.0, min(v_max, kp_dist * d_err * max(0.0, math.cos(e_th))))
    w_cmd = max(-w_max, min(w_max, kp_th * e_th))
    return d_err, e_th, v_cmd, w_cmd

print([round(v, 3) for v in guidance((1, 1, 0), (4, 5))])     # [5.0, 0.927, 1.5, 2.0]
print([round(v, 3) for v in guidance((0, 0, 0), (-1, 0.5))])  # [1.118, 2.678, 0.0, 2.0]
```

$O(1)$. For the second call, $e_\theta = \operatorname{atan2}(0.5, -1) = 2.678\text{ rad} = 153.4^\circ$, so $\cos e_\theta < 0$ and $v = 0$, and $2.5 \times 2.678 = 6.7$ clamps to $2.0$.

**E2. Reference solution**

```python
import math

class WaypointManager:
    def __init__(self, waypoints, capture_radius: float = 0.25):
        self.waypoints = list(waypoints)
        self.capture_radius = capture_radius
        self.idx = 0

    def advance(self, est_xy) -> int:
        while self.idx < len(self.waypoints):
            wx, wy = self.waypoints[self.idx]
            if math.hypot(wx - est_xy[0], wy - est_xy[1]) >= self.capture_radius:
                break
            self.idx += 1  # captured: move to the next waypoint and test it too
        return self.idx

wm = WaypointManager([(1.0, 0.0), (1.1, 0.0), (3.0, 0.0)])
print(wm.advance((0.95, 0.0)))  # 2  (dist 0.05, then 0.15, then 2.05 stops)
print(wm.advance((2.9, 0.1)))   # 3  (dist 0.141 < 0.25: mission complete)
```

This is $O(k)$ per call for $k$ waypoints captured, and amortized $O(1)$ over a mission. The Python `compute_control` does the same with recursion. A `while` loop avoids recursion-depth surprises.

**E3. Reference solution**

```python
def mahal_sq_full(y, S) -> float:
    a, b, c, d = S[0][0], S[0][1], S[1][0], S[1][1]
    det = a * d - b * c
    inv = [[d / det, -b / det], [-c / det, a / det]]
    return (y[0] * (inv[0][0] * y[0] + inv[0][1] * y[1])
            + y[1] * (inv[1][0] * y[0] + inv[1][1] * y[1]))

def mahal_sq_diag(y, S) -> float:
    return y[0] ** 2 / S[0][0] + y[1] ** 2 / S[1][1]   # what the C++ updateGPS computes

S = [[0.25, 0.15], [0.15, 0.25]]
y = (1.0, 1.2)
print(round(mahal_sq_full(y, S), 3), mahal_sq_full(y, S) <= 9.21)  # 6.25 True
print(round(mahal_sq_diag(y, S), 3), mahal_sq_diag(y, S) <= 9.21)  # 9.76 False
```

$\det = 0.0625 - 0.0225 = 0.04$, so $\mathbf{S}^{-1} = \begin{bmatrix} 6.25 & -3.75 \\ -3.75 & 6.25 \end{bmatrix}$ and $d^2 = 6.25 - 2(3.75)(1.2) + 6.25(1.44) = 6.25 - 9.0 + 9.0 = 6.25$. Positively correlated $x, y$ uncertainty makes a same-sign innovation more plausible, and only the full form sees that. $O(1)$.

---

## Interactive Visualization & shadcn/ui Specification

### Widget Purpose
Build a full-featured **100Hz Autonomous Waypoint Mission Simulator** where learners can click anywhere on a 2D warehouse floor to place/drag waypoints, watch the robot execute the closed-loop PID + EKF pipeline in real time, toggle sensor failures or GPS multipath glitches, and compare **Controller Driven by Raw Noisy GPS** vs. **Controller Driven by Dead-Reckoning** vs. **Controller Driven by EKF State Estimate**.

### Visual Layout & Interactive Canvas
- **Main 2D Warehouse Arena Canvas (65% width):**
  - Renders the differential-drive robot, numbered Waypoint rings ($r_{\text{capture}} = 0.25\text{ m}$) connected by dashed mission legs, and three Simultaneous Trajectories:
    1. **True Robot Path** (solid white)
    2. **Unfiltered Dead-Reckoning Odometry Path** (dashed red — visibly drifting over time)
    3. **EKF Estimated Path** (solid emerald) surrounded by its live pulsing $2\sigma$ covariance ellipse $\mathbf{P}_{xy}$
  - Displays the **Line-of-Sight Guidance Vector** (cyan arrow to active waypoint) and $10\text{ Hz}$ noisy GPS measurement pings (amber dots, flashing red with an `"OUTLIER REJECTED"` tag when blocked by the $3\sigma$ Mahalanobis gate).
- **Right Telemetry & Control Sidebar (35% width):**
  - Dual real-time strip charts for **Cross-Track / Position Error ($\text{m}$)**, **Heading Error $e_\theta$ ($\text{deg}$)**, and **Control Commands ($v_{\text{cmd}}, \omega_{\text{cmd}}$)**.

### Required `shadcn/ui` Primitives (No Raw Browser Inputs)
- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`: Frame the Warehouse Arena, Mission Status HUD, and Telemetry Deck.
- `<Select>`: Choose **Feedback Source into PID Controller**:
  - `"EKF Fused State Estimate (Recommended)"`
  - `"Raw Noisy GPS + Differentiated Heading (Watch D-Term Chatter!)"`
  - `"Dead-Reckoning Odometry Only (Watch Cumulative Drift!)"`
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`: Switch sidebar between `"PID & Guidance Gains"`, `"EKF Noise Matrices (Q & R)"`, and `"Live Tick Telemetry Table"`.
- `<Slider>`:
  - `Heading Kp_theta` ($0.5\text{ to }8.0$), `Heading Ki_theta` ($0.0\text{ to }2.0$), `Heading Kd_theta` ($0.0\text{ to }1.0$)
  - `Distance Kp_dist` ($0.2\text{ to }3.0$), `Max Speed v_max` ($0.5\text{ to }3.0\text{ m/s}$)
  - `GPS Noise Std Dev σ_gps` ($0.05\text{ m to }1.50\text{ m}$), `Odometry Slip σ_odom` ($0.01\text{ to }0.50\text{ m/s}$)
- `<Switch>`: `"Enable 10Hz GPS Updates"`, `"Enable 3σ Mahalanobis Outlier Gate"`, and `"Cos(e_theta) Alignment Speed Scaling"`.
- `<Button>`: `"Start / Pause 100Hz Loop"`, `"Inject 15m GPS Glitch Now"`, `"Add Random Waypoint"`, and `"Reset Mission"`.
- `<Badge>`: Live HUD indicators for `Active Waypoint: 2 / 4`, `Position RMSE: 0.09 m`, `Mahalanobis d²: 1.42 (Valid)`, and `Outliers Blocked: 1`.
- `<Table>`: Scrollable log of recent $10\text{ Hz}$ GPS updates showing $\mathbf{z}_k$, innovation $\mathbf{y}_k$, Mahalanobis score $d_M^2$, and Gate Pass/Reject status.
- `<Tooltip>`: Explains why $\cos(e_\theta)$ speed scaling prevents wide-arc overshoot when transitioning between sharp waypoint corners.
