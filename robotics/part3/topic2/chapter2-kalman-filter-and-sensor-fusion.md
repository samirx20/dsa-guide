# Part 3, Topic 2: Probabilistic Robotics & Kalman Filtering

## Chapter 2: The Kalman Filter — Fusing Physics Predictions with Noisy Sensors

---

### Why This Matters

In March 1960, Rudolf E. Kálmán published a paper describing a recursive algorithm to estimate the true state of a dynamic system from noisy measurements. Months later, he visited NASA Ames Research Center, where engineers were struggling to navigate the **Apollo spacecraft** to the Moon:
- Their **onboard physics model & inertial guidance** drifted over time.
- Their **sextant and radar measurements** were noisy and intermittent.

They embedded Kálmán's algorithm into the **Apollo Guidance Computer** (which had just $4\text{ KB}$ of magnetic core RAM!), and it guided Apollo 11 to a pinpoint lunar landing. Today, the **Kalman Filter** runs inside every smartphone GPS, commercial airliner autopilot, SpaceX rocket, autonomous car, and warehouse robot on Earth.

Yet in university textbooks, the Kalman Filter is often buried under a wall of seven intimidating matrix equations that students memorize without ever understanding *why* they work.

Here is the secret that demystifies the entire Kalman Filter in one sentence:
> **The Kalman Filter is literally just two operations on Gaussian bell curves repeated in a loop:**
> 1. **Predict (Addition of Gaussians):** Shift the bell curve forward using physics ($x = x + v\Delta t$), which **adds** uncertainty.
> 2. **Update (Multiplication of Two Gaussians):** Multiply the predicted bell curve by the sensor measurement's bell curve, which produces a **new, narrower bell curve**!

Let's build both steps from absolute zero—first in 1D with simple algebra and a 5-step hand-calculated dry run, and then in full multi-dimensional matrix form ($\mathbf{F}, \mathbf{B}, \mathbf{H}, \mathbf{Q}, \mathbf{R}, \mathbf{P}, \mathbf{K}$) and the **Extended Kalman Filter (EKF)**.

---

### 1. The Big Picture: The Predict–Update Cycle

Suppose a robot is driving down a hallway. It has two imperfect sources of information:
1. **Dead-Reckoning Physics + Wheel Odometry (Prediction):** Tells us how far the robot *should* have moved since the last millisecond, but accumulates process noise $Q$ (wheel slip, bumps).
2. **External Sensor — LiDAR or GPS (Measurement Update):** Gives an absolute reading $z_k$ of where the robot is right now, but is corrupted by sensor measurement noise $R$.

Neither source is trustworthy alone! The Kalman Filter fuses them in a two-step heartbeat on every tick $k$:

```
             +-------------------------------------------------------+
             |               THE KALMAN FILTER HEARTBEAT             |
             v                                                       |
  +-----------------------------------+   Prior Belief    +------------------------------------+
  |         1. PREDICT STEP           |  x_hat_k|k-1      |     2. MEASUREMENT UPDATE STEP     |
  |  Use Physics + Control Input u_k  |  P_k|k-1 (Wider!) |  Fuse Prior with Sensor Reading z  |
  |  * Mean moves: x_hat = x + v*dt   | ----------------> |  * Compute Kalman Gain K = P/(P+R) |
  |  * Uncertainty GROWS: P = P + Q   |                   |  * Uncertainty SHRINKS: P=(1-K)*P  |
  +-----------------------------------+                   +------------------------------------+
                                                                     |
                                                                     | Posterior Belief
                                                                     | x_hat_k, P_k (Narrower!)
                                                                     +-------------------------+
```

---

### 2. Step 1 of the Heartbeat: Predict (Adding Gaussians)

Suppose at tick $k-1$, our robot's belief about its 1D position is a Gaussian $\mathcal{N}(\hat{x}_{k-1},\; P_{k-1})$:
- $\hat{x}_{k-1}$: Our current best position estimate (mean).
- $P_{k-1}$: Our current position variance ($\sigma_x^2$).

During timestep $\Delta t$, we command the robot to drive at velocity $u_k = v$, so the robot moves by $\Delta x = v \Delta t$. However, because tyres slip and floors aren't perfectly flat, that motion adds random **Process Noise** with variance $Q$ ($\sigma_{\text{process}}^2$).

Using the **Addition of Independent Gaussians** rule from Chapter 1 ($\mu_{A+B} = \mu_A + \mu_B$ and $\sigma_{A+B}^2 = \sigma_A^2 + \sigma_B^2$), our predicted belief $\mathcal{N}(\hat{x}_{k|k-1},\; P_{k|k-1})$ *before* reading the sensor is:

$$\boxed{\begin{aligned}
\hat{x}_{k|k-1} &= \hat{x}_{k-1} + v_k \Delta t \quad &&\text{(Move mean forward using physics)} \\
P_{k|k-1} &= P_{k-1} + Q \quad &&\text{(Add process noise variance — uncertainty GROWS!)}
\end{aligned}}$$

*(Note on notation: The subscript $k|k-1$ is read **"at time step $k$, given measurements up to step $k-1$"**—also called the **Prior** estimate.)*

---

### 3. Step 2 of the Heartbeat: Update (Multiplying Two Gaussians!)

Now the magic happens! At step $k$, we have **two independent Gaussian bell curves** describing the exact same robot position $x_k$:
1. **Our Physics Prediction (Prior):** $\mathcal{N}(\hat{x}_{k|k-1},\; P_{k|k-1})$ — centered at $\hat{x}_{k|k-1}$ with variance $P$ (for brevity, let's write $\hat{x}^- = \hat{x}_{k|k-1}$ and $P = P_{k|k-1}$).
2. **Our Sensor Measurement (Likelihood):** $\mathcal{N}(z_k,\; R)$ — the LiDAR reports distance $z_k$, and the LiDAR datasheet says its measurement variance is $R = \sigma_{\text{sensor}}^2$.

How do you combine two independent probability distributions for the same variable? By Bayes' Rule, **you multiply their probability density functions together**!
When you multiply two Gaussian curves $\exp\!\left(-\frac{(x - \hat{x}^-)^2}{2P}\right) \times \exp\!\left(-\frac{(x - z_k)^2}{2R}\right)$, you simply **add their exponents**:
$$-\frac{(x - \hat{x}^-)^2}{2P} - \frac{(x - z_k)^2}{2R}$$
If you complete the square in high-school algebra, a miraculous thing happens: **the product of any two Gaussian bell curves is ALWAYS another Gaussian bell curve $\mathcal{N}(\hat{x}_k, P_k)$!**

```
  Probability p(x)
    ^
    |                    .+.          <-- 3. FUSED POSTERIOR N(x_hat_k, P_k)
    |                   |   |                Taller & narrower than BOTH inputs!
    |       _.-"-._     |   |    _.-"-._
    |     .'       '.  /     \ .'       '.
    |    /   Prior   \/       /   Sensor  \
    |   /  N(x_hat-,P)\      /   N(z_k, R) \
  0 +--+-------+-------+----+-------+-------+---> Position x (m)
            x_hat-       x_hat_k   z_k
```

And what are the new mean $\hat{x}_k$ and new variance $P_k$ of that fused bell curve? Let's write down the exact algebra:

First, define a single dimensionless fraction $K_k \in [0, 1]$ called the **Kalman Gain**:

$$\boxed{K_k = \frac{P_{k|k-1}}{P_{k|k-1} + R}}$$

Using $K_k$, the fused **Posterior Mean** $\hat{x}_k$ and **Posterior Variance** $P_k$ are simply:

$$\boxed{\begin{aligned}
\hat{x}_k &= \hat{x}_{k|k-1} + K_k \bigl(z_k - \hat{x}_{k|k-1}\bigr) \quad &&\text{(Blend prediction + measurement residual)} \\
P_k &= (1 - K_k) P_{k|k-1} \quad &&\text{(Shrink variance — uncertainty ALWAYS drops!)}
\end{aligned}}$$

#### Pause and Marvel at the Intuition of the Kalman Gain $K = \frac{P}{P + R}$!

The entire intelligence of the Kalman Filter lives inside the fraction $K = \frac{P}{P + R}$, which automatically decides **how much to trust the sensor ($z_k$) vs. the physics prediction ($\hat{x}^-$)**:

- **Case 1 — Crystal-Clear Sensor, Uncertain Prediction ($R \ll P$):**
  Suppose our prediction is very uncertain ($P = 100\text{ m}^2$) and our laser rangefinder is super accurate ($R = 0.01\text{ m}^2$).
  Then:
  $$K = \frac{100}{100 + 0.01} \approx \mathbf{1.0}$$
  Plug $K = 1.0$ into the update equation:
  $$\hat{x}_k = \hat{x}^- + 1.0(z_k - \hat{x}^-) = \mathbf{z_k}$$
  **When $K \to 1$, the filter trusts the sensor $100\%$!**

- **Case 2 — Terrible/Noisy Sensor, Rock-Solid Prediction ($R \gg P$):**
  Suppose our prediction is rock-solid ($P = 0.01\text{ m}^2$) and our GPS is terrible indoors ($R = 100\text{ m}^2$).
  Then:
  $$K = \frac{0.01}{0.01 + 100} \approx \mathbf{0.0}$$
  Plug $K = 0.0$ into the update equation:
  $$\hat{x}_k = \hat{x}^- + 0.0(z_k - \hat{x}^-) = \mathbf{\hat{x}^-}$$
  **When $K \to 0$, the filter ignores the noisy sensor and trusts the physics prediction $100\%$!**

- **Case 3 — Equal Uncertainty ($P = R$):**
  If $P = 1.0\text{ m}^2$ and $R = 1.0\text{ m}^2$, then:
  $$K = \frac{1.0}{1.0 + 1.0} = \mathbf{0.5}$$
  The fused mean is the exact $50/50$ average $\frac{\hat{x}^- + z_k}{2}$, and look at the new variance:
  $$P_k = (1 - 0.5) \times 1.0 = \mathbf{0.50\text{ m}^2!}$$
  **Fusing two flawed sensors with variance $1.0\text{ m}^2$ each produces an estimate with variance $0.5\text{ m}^2$—twice as precise as either sensor alone!**

---

### 4. Step-by-Step 5-Tick Numerical Dry-Run (1D Robot Tracker)

Let's trace a 1D Kalman Filter by hand for **5 ticks** ($\Delta t = 1.0\text{ s}$) as a robot drives forward at constant speed $v = 2.0\text{ m/s}$ ($v\Delta t = +2.0\text{ m}$ per tick):
- **Initial Belief at $k=0$:** $\hat{x}_0 = 0.0\text{ m}$, initial variance $P_0 = 1.00\text{ m}^2$.
- **Process Noise Variance (Odometry slip per step):** $Q = 0.50\text{ m}^2$.
- **Sensor Measurement Variance (GPS noise):** $R = 1.00\text{ m}^2$.
- **True Positions:** $x_{\text{true}} = [2.0, 4.0, 6.0, 8.0, 10.0]\text{ m}$.
- **Noisy GPS Readings:** $z = [2.4, 3.6, 6.3, 7.8, 10.2]\text{ m}$.

| Tick $k$ | Prior Mean $\hat{x}^- = \hat{x}_{k-1} + 2.0$ | Prior Var $P^- = P_{k-1} + Q$ | Noisy Sensor $z_k$ | Innovation $y = z_k - \hat{x}^-$ | Kalman Gain $K = \frac{P^-}{P^- + R}$ | Posterior Mean $\hat{x}_k = \hat{x}^- + K y$ | Posterior Var $P_k = (1-K)P^-$ | True Pos $x_{\text{true}}$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | $0.0 + 2.0 = \mathbf{2.00}$ | $1.00 + 0.5 = \mathbf{1.50}$ | $2.40$ | $+0.40$ | $\frac{1.50}{1.50 + 1.0} = \mathbf{0.600}$ | $2.00 + 0.60(0.40) = \mathbf{2.24\text{ m}}$ | $0.40 \times 1.50 = \mathbf{0.600}$ | $2.00\text{ m}$ |
| **2** | $2.24 + 2.0 = \mathbf{4.24}$ | $0.60 + 0.5 = \mathbf{1.10}$ | $3.60$ | $-0.64$ | $\frac{1.10}{1.10 + 1.0} = \mathbf{0.524}$ | $4.24 + 0.524(-0.64) = \mathbf{3.90\text{ m}}$ | $0.476 \times 1.10 = \mathbf{0.524}$ | $4.00\text{ m}$ |
| **3** | $3.90 + 2.0 = \mathbf{5.90}$ | $0.524 + 0.5 = \mathbf{1.024}$ | $6.30$ | $+0.40$ | $\frac{1.024}{1.024 + 1.0} = \mathbf{0.506}$ | $5.90 + 0.506(0.40) = \mathbf{6.10\text{ m}}$ | $0.494 \times 1.024 = \mathbf{0.506}$ | $6.00\text{ m}$ |
| **4** | $6.10 + 2.0 = \mathbf{8.10}$ | $0.506 + 0.5 = \mathbf{1.006}$ | $7.80$ | $-0.30$ | $\frac{1.006}{1.006 + 1.0} = \mathbf{0.501}$ | $8.10 + 0.501(-0.30) = \mathbf{7.95\text{ m}}$ | $0.499 \times 1.006 = \mathbf{0.501}$ | $8.00\text{ m}$ |
| **5** | $7.95 + 2.0 = \mathbf{9.95}$ | $0.501 + 0.5 = \mathbf{1.001}$ | $10.20$ | $+0.25$ | $\frac{1.001}{1.001 + 1.0} = \mathbf{0.500}$ | $9.95 + 0.500(0.25) = \mathbf{10.08\text{ m}}$ | $0.500 \times 1.001 = \mathbf{0.500}$ | $10.00\text{ m}$ |

Look at two remarkable facts in that table:
1. Even though the raw GPS sensor had errors up to $\pm 0.40\text{ m}$ ($R = 1.00\text{ m}^2$) and odometry slipped by $Q = 0.50\text{ m}^2$ every second, the fused Posterior Variance $P_k$ converged rapidly from $1.00\text{ m}^2$ down to a steady-state **$0.500\text{ m}^2$**, tracking the true position within centimeters!
2. Notice how $P^-$ grows during every **Predict** column ($+Q$) and shrinks during every **Posterior** column ($\times (1-K)$), settling into a rock-steady equilibrium!

---

### 5. From 1D Scalar to the Full Matrix Kalman Filter

What if our robot state is a vector $\mathbf{x}_k = \begin{bmatrix} x \\ v \end{bmatrix}$ (position *and* velocity), and our sensor only measures position $z_k = x_k + \text{noise}$?
Remarkably, **the Matrix Kalman Filter can estimate hidden states (like velocity $v$) even when the sensor only measures position $x$**, because the cross-covariance $\sigma_{xv}$ inside $\mathbf{P}$ links changes in position to velocity!

Let's map every 1D scalar equation directly to its **Matrix Kalman Filter** counterpart:

| Concept | 1D Scalar Version | Multi-Dimensional Matrix Version | Dimensions (State $n$, Meas $m$) |
| :--- | :--- | :--- | :--- |
| **State Estimate** | $\hat{x}_k$ | $\hat{\mathbf{x}}_k$ | $n \times 1$ column vector |
| **State Covariance** | $P_k$ | $\mathbf{P}_k$ | $n \times n$ symmetric matrix |
| **Physics Transition** | $1 \cdot \hat{x} + \Delta t \cdot u$ | $\mathbf{F}\hat{\mathbf{x}}_{k-1} + \mathbf{B}\mathbf{u}_k$ | $\mathbf{F}$ is $n \times n$, $\mathbf{B}$ is $n \times p$ |
| **Sensor Observation Map** | $1 \cdot \hat{x}$ | $\mathbf{H}\hat{\mathbf{x}}_{k|k-1}$ | $\mathbf{H}$ is $m \times n$ |
| **Predict Mean** | $\hat{x}^- = \hat{x} + v\Delta t$ | $\hat{\mathbf{x}}_{k|k-1} = \mathbf{F}\hat{\mathbf{x}}_{k-1} + \mathbf{B}\mathbf{u}_k$ | $n \times 1$ |
| **Predict Covariance** | $P^- = P + Q$ | $\mathbf{P}_{k|k-1} = \mathbf{F}\mathbf{P}_{k-1}\mathbf{F}^T + \mathbf{Q}$ | $n \times n$ (Note: $\mathbf{F}\mathbf{P}\mathbf{F}^T$ is matrix version of $c^2 \sigma^2$!) |
| **Innovation (Residual)** | $y = z - \hat{x}^-$ | $\mathbf{y}_k = \mathbf{z}_k - \mathbf{H}\hat{\mathbf{x}}_{k|k-1}$ | $m \times 1$ |
| **Kalman Gain** | $K = \frac{P^-}{P^- + R}$ | $\mathbf{K}_k = \mathbf{P}_{k|k-1}\mathbf{H}^T \bigl(\mathbf{H}\mathbf{P}_{k|k-1}\mathbf{H}^T + \mathbf{R}\bigr)^{-1}$ | $n \times m$ (Note: $(\dots)^{-1}$ is matrix division!) |
| **Update Mean** | $\hat{x} = \hat{x}^- + K y$ | $\hat{\mathbf{x}}_k = \hat{\mathbf{x}}_{k|k-1} + \mathbf{K}_k \mathbf{y}_k$ | $n \times 1$ |
| **Update Covariance** | $P = (1 - K)P^-$ | $\mathbf{P}_k = (\mathbf{I} - \mathbf{K}_k\mathbf{H})\mathbf{P}_{k|k-1}$ | $n \times n$ |

Look at the Kalman Gain matrix formula $\mathbf{K} = \mathbf{P}\mathbf{H}^T(\mathbf{H}\mathbf{P}\mathbf{H}^T + \mathbf{R})^{-1}$. Since you cannot divide by a matrix in linear algebra, multiplying by $(\mathbf{H}\mathbf{P}\mathbf{H}^T + \mathbf{R})^{-1}$ is literally just **$\frac{P}{P + R}$ written in matrix notation**!

#### How the Matrix Kalman Filter Estimates Hidden States (Velocity from Position Alone!)

One of the most magical moments in robotics is watching a Kalman Filter accurately estimate a robot's **velocity $v$** when the robot only has a **position sensor $z = x$** (and no speedometer!). How is that possible without taking a noisy finite difference $\frac{z_k - z_{k-1}}{\Delta t}$?

Let's trace the algebra for a 2-state vector $\mathbf{x} = \begin{bmatrix} x \\ v \end{bmatrix}$ with observation matrix $\mathbf{H} = \begin{bmatrix} 1 & 0 \end{bmatrix}$ (measuring position $x$ only):
1. During the **Predict Step**, the physics matrix $\mathbf{F} = \begin{bmatrix} 1 & \Delta t \\ 0 & 1 \end{bmatrix}$ updates the covariance via $\mathbf{P}^- = \mathbf{F}\mathbf{P}\mathbf{F}^T + \mathbf{Q}$. As we proved in Chapter 1, this creates a positive off-diagonal cross-covariance **$P_{xv}^- > 0$** inside $\mathbf{P}^- = \begin{bmatrix} P_{xx}^- & P_{xv}^- \\ P_{xv}^- & P_{vv}^- \end{bmatrix}$.
2. Now during the **Update Step**, look at what $\mathbf{P}^- \mathbf{H}^T$ produces when $\mathbf{H}^T = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$:
   $$\mathbf{P}^- \mathbf{H}^T = \begin{bmatrix} P_{xx}^- & P_{xv}^- \\ P_{xv}^- & P_{vv}^- \end{bmatrix} \begin{bmatrix} 1 \\ 0 \end{bmatrix} = \begin{bmatrix} P_{xx}^- \\ \mathbf{P_{xv}^-} \end{bmatrix}$$
3. Dividing by the scalar innovation variance $S = \mathbf{H}\mathbf{P}^-\mathbf{H}^T + R = P_{xx}^- + R$ gives a $2 \times 1$ **Kalman Gain Vector**:
   $$\boxed{\mathbf{K} = \begin{bmatrix} K_x \\ K_v \end{bmatrix} = \begin{bmatrix} \dfrac{P_{xx}^-}{P_{xx}^- + R} \\[8pt] \dfrac{\mathbf{P_{xv}^-}}{P_{xx}^- + R} \end{bmatrix}}$$
4. When the position sensor reports innovation $y = z_k - \hat{x}^-$, the state update $\hat{\mathbf{x}} = \hat{\mathbf{x}}^- + \mathbf{K}y$ updates **both position and velocity**:
   $$\hat{x}_k = \hat{x}^- + K_x y, \qquad \boxed{\hat{v}_k = \hat{v}^- + K_v y = \hat{v}^- + \left(\frac{P_{xv}^-}{P_{xx}^- + R}\right)(z_k - \hat{x}^-)}$$

Because the cross-covariance $P_{xv}^-$ is positive, seeing the robot consistently ahead of its predicted position ($y > 0$) automatically nudges the hidden velocity estimate $\hat{v}_k$ upward!

---

### 6. The Extended Kalman Filter (EKF): Handling $\cos\theta$ and $\sin\theta$

A standard Linear Kalman Filter requires the physics model $\mathbf{F}\mathbf{x}$ and sensor model $\mathbf{H}\mathbf{x}$ to be **linear** (no $\sin\theta, \cos\theta$, or $\sqrt{x^2 + y^2}$).
Wait—what about a 2D mobile robot with state $\mathbf{x} = [x, y, \theta]^T$ driving at speed $v$ and turn rate $\omega$? Its motion equation is **nonlinear**:

$$\mathbf{x}_k = f(\mathbf{x}_{k-1}, \mathbf{u}_k) = \begin{bmatrix} x_{k-1} + v \cos(\theta_{k-1})\,\Delta t \\ y_{k-1} + v \sin(\theta_{k-1})\,\Delta t \\ \theta_{k-1} + \omega\,\Delta t \end{bmatrix}$$

If you push a Gaussian bell curve through $\cos(\theta)$ and $\sin(\theta)$, the output isn't a perfect Gaussian ellipse anymore—it bends into a banana shape!
How does the **Extended Kalman Filter (EKF)** solve this?
1. **For the Mean Prediction:** Use the exact nonlinear trigonometry equation $\hat{\mathbf{x}}_{k|k-1} = f(\hat{\mathbf{x}}_{k-1}, \mathbf{u}_k)$!
2. **For the Covariance Propagation ($\mathbf{P}_{k|k-1} = \mathbf{F}_k \mathbf{P}_{k-1} \mathbf{F}_k^T + \mathbf{Q}$):** Linearize $f(\mathbf{x}, \mathbf{u})$ around the current estimate $\hat{\mathbf{x}}_{k-1}$ using a first-order Taylor series—which simply means replacing the constant matrix $\mathbf{F}$ with the **Jacobian matrix of partial derivatives** $\mathbf{F}_k = \left.\frac{\partial f}{\partial \mathbf{x}}\right|_{\hat{\mathbf{x}}_{k-1}}$:

$$\boxed{\mathbf{F}_k = \frac{\partial f}{\partial \mathbf{x}} = \begin{bmatrix} \frac{\partial x_k}{\partial x} & \frac{\partial x_k}{\partial y} & \frac{\partial x_k}{\partial \theta} \\ \frac{\partial y_k}{\partial x} & \frac{\partial y_k}{\partial y} & \frac{\partial y_k}{\partial \theta} \\ \frac{\partial \theta_k}{\partial x} & \frac{\partial \theta_k}{\partial y} & \frac{\partial \theta_k}{\partial \theta} \end{bmatrix} = \begin{bmatrix} 1 & 0 & -v \sin(\hat{\theta}_{k-1})\,\Delta t \\ 0 & 1 & +v \cos(\hat{\theta}_{k-1})\,\Delta t \\ 0 & 0 & 1 \end{bmatrix}}$$

Look how easy that $3 \times 3$ Jacobian $\mathbf{F}_k$ is: the derivative of $v\cos\theta\,\Delta t$ with respect to $\theta$ is $-v\sin\theta\,\Delta t$, and the derivative of $v\sin\theta\,\Delta t$ is $+v\cos\theta\,\Delta t$! Everything else in the Kalman Filter stays $100\%$ identical!

#### What If the Sensor Model $h(\mathbf{x})$ Is Also Nonlinear? (e.g., LiDAR Range & Bearing)

What if instead of a GPS sensor that directly reports $[x, y]^T$, your robot uses a 2D LiDAR or camera that measures the **distance (range) $r$ and angle (bearing) $\phi$** to a known landmark at $(x_L, y_L)$?
Then the predicted sensor measurement $h(\hat{\mathbf{x}})$ is also nonlinear:
$$h(\hat{\mathbf{x}}) = \begin{bmatrix} \hat{r} \\ \hat{\phi} \end{bmatrix} = \begin{bmatrix} \sqrt{(x_L - \hat{x})^2 + (y_L - \hat{y})^2} \\ \operatorname{atan2}(y_L - \hat{y},\; x_L - \hat{x}) - \hat{\theta} \end{bmatrix}$$

In the EKF **Update Step**, we do the exact same trick:
1. Compute the innovation using the exact nonlinear formula: $\mathbf{y}_k = \mathbf{z}_k - h(\hat{\mathbf{x}}_{k|k-1})$.
2. Replace the constant observation matrix $\mathbf{H}$ with the **Measurement Jacobian** $\mathbf{H}_k = \left.\frac{\partial h}{\partial \mathbf{x}}\right|_{\hat{\mathbf{x}}_{k|k-1}}$:
   $$\mathbf{H}_k = \begin{bmatrix} -\frac{x_L - \hat{x}}{\hat{r}} & -\frac{y_L - \hat{y}}{\hat{r}} & 0 \\ +\frac{y_L - \hat{y}}{\hat{r}^2} & -\frac{x_L - \hat{x}}{\hat{r}^2} & -1 \end{bmatrix}$$

#### How EKF Fits into the Family of Bayesian State Estimators

| Filter Type | Linearization / Approximation Method | Belief Representation | Best Used When... |
| :--- | :--- | :--- | :--- |
| **Linear Kalman Filter (KF)** | Exact (No approximation needed) | Single Gaussian $\mathcal{N}(\hat{\mathbf{x}}, \mathbf{P})$ | Linear physics ($\mathbf{F}\mathbf{x} + \mathbf{B}\mathbf{u}$) and linear sensors ($\mathbf{H}\mathbf{x}$). |
| **Extended Kalman Filter (EKF)** | 1st-Order Taylor Series (Jacobians $\mathbf{F}_k, \mathbf{H}_k$) | Single Gaussian $\mathcal{N}(\hat{\mathbf{x}}, \mathbf{P})$ | Standard 2D/3D robot navigation, drones, visual-inertial odometry ($100\text{–}1000\text{ Hz}$). |
| **Unscented Kalman Filter (UKF)** | Deterministic "Sigma Points" pushed through $f(\cdot)$ | Single Gaussian $\mathcal{N}(\hat{\mathbf{x}}, \mathbf{P})$ | Highly nonlinear dynamics where deriving analytical Jacobians is difficult. |
| **Particle Filter (Monte Carlo)** | Thousands of weighted random hypotheses | Arbitrary multi-modal cloud | Global localization ("Kidnapped Robot Problem") where belief has multiple peaks! |

---

### 7. Production Code Implementation (C++ & Python)

#### C++ Implementation: 2-State Position + Velocity Kalman Filter

```cpp
#include <iostream>
#include <iomanip>
#include <array>

class KalmanFilter1DPosVel {
public:
    KalmanFilter1DPosVel(double init_pos, double init_vel, double sigma_accel, double sigma_meas)
        // ^^^ Initialize 2-state [pos, vel]^T Kalman Filter with process & measurement std devs
        : x_{init_pos, init_vel},
          P_{1.0, 0.0, 0.0, 1.0}, // 2x2 row-major covariance matrix [P00, P01, P10, P11]
          q_var_(sigma_accel * sigma_accel),
          r_var_(sigma_meas * sigma_meas) {}
        // ^^^ Square standard deviations to get variances Q and R!

    void predict(double accel_cmd, double dt) {
        // 1. Predict State: x_hat = F * x_hat + B * u
        double new_pos = x_[0] + x_[1] * dt + 0.5 * accel_cmd * dt * dt;
        double new_vel = x_[1] + accel_cmd * dt;
        // ^^^ Kinematics: x_k = x + v*dt + 0.5*a*dt^2, v_k = v + a*dt
        x_[0] = new_pos;
        x_[1] = new_vel;

        // 2. Predict Covariance: P = F * P * F^T + Q, where F = [[1, dt], [0, 1]]
        double p00 = P_[0] + dt * (P_[1] + P_[2]) + dt * dt * P_[3] + 0.25 * dt * dt * dt * dt * q_var_;
        double p01 = P_[1] + dt * P_[3] + 0.5 * dt * dt * dt * q_var_;
        double p10 = P_[2] + dt * P_[3] + 0.5 * dt * dt * dt * q_var_;
        double p11 = P_[3] + dt * dt * q_var_;
        // ^^^ Propagate position/velocity variances and cross-covariance; uncertainty GROWS by Q
        P_ = {p00, p01, p10, p11};
    }

    void updatePosition(double z_pos) {
        // Sensor measures position only: H = [1, 0]
        double innovation = z_pos - x_[0];
        // ^^^ Measurement residual y = z - H * x_hat

        double S = P_[0] + r_var_;
        // ^^^ Innovation covariance S = H * P * H^T + R = P_00 + R
        double K0 = P_[0] / S;
        double K1 = P_[2] / S;
        // ^^^ Kalman Gain vector K = P * H^T / S = [P_00 / S, P_10 / S]^T

        x_[0] += K0 * innovation;
        x_[1] += K1 * innovation;
        // ^^^ Notice how K1 uses cross-covariance P_10 to update VELOCITY from a POSITION sensor!

        // Update Covariance: P = (I - K * H) * P
        double p00 = (1.0 - K0) * P_[0];
        double p01 = (1.0 - K0) * P_[1];
        double p10 = P_[2] - K1 * P_[0];
        double p11 = P_[3] - K1 * P_[1];
        // ^^^ Shrink covariance matrix after incorporating sensor information
        P_ = {p00, p01, p10, p11};
    }

    double pos() const { return x_[0]; }
    double vel() const { return x_[1]; }
    double posVar() const { return P_[0]; }

private:
    std::array<double, 2> x_;
    std::array<double, 4> P_;
    double q_var_, r_var_;
};

int main() {
    KalmanFilter1DPosVel kf(0.0, 0.0, 0.5, 0.8);
    // ^^^ Start at x=0, v=0 (notice velocity starts WRONG—true velocity is 2.0 m/s!)
    double dt = 0.5;
    double noisy_z[] = {1.1, 1.9, 3.2, 3.8, 5.1, 6.0};

    for (int k = 0; k < 6; ++k) {
        kf.predict(0.0, dt);
        kf.updatePosition(noisy_z[k]);
        // ^^^ Fuse prediction with position-only measurements; watch velocity converge to ~2.0 m/s!
        std::cout << "Tick " << k + 1 << " | Meas z: " << std::fixed << std::setprecision(2) << noisy_z[k]
                  << "m | Est Pos: " << kf.pos() << "m | Est Hidden Vel: " << kf.vel()
                  << " m/s | PosVar P00: " << kf.posVar() << "\n";
    }
    return 0;
}
```

#### Python Implementation: 2D Mobile Robot Extended Kalman Filter (EKF)

```python
import math
import numpy as np

class MobileRobotEKF:
    def __init__(self, x0: float = 0.0, y0: float = 0.0, theta0: float = 0.0):
        self.x = np.array([[x0], [y0], [theta0]], dtype=float)
        # ^^^ 3x1 state vector [x, y, theta]^T
        self.P = np.diag([0.5, 0.5, 0.1])
        # ^^^ Initial 3x3 state covariance matrix P
        self.Q = np.diag([0.02, 0.02, 0.005])
        # ^^^ Process noise covariance matrix Q (wheel odometry slip variance)
        self.R = np.diag([0.25, 0.25])
        # ^^^ Measurement noise covariance R for 2D GPS/beacon [x, y] sensor (sigma = 0.5m)
        self.H = np.array([[1.0, 0.0, 0.0],
                           [0.0, 1.0, 0.0]])
        # ^^^ 2x3 Observation matrix: sensor measures [x, y] but NOT heading theta

    def predict(self, v: float, omega: float, dt: float) -> None:
        theta = self.x[2, 0]
        # 1. Nonlinear State Prediction: x_hat = f(x_hat, u)
        self.x[0, 0] += v * math.cos(theta) * dt
        self.x[1, 0] += v * math.sin(theta) * dt
        self.x[2, 0] = math.atan2(math.sin(theta + omega * dt), math.cos(theta + omega * dt))
        # ^^^ Propagate mean using exact nonlinear unicycle trigonometry and wrap theta to [-pi, pi]

        # 2. Compute 3x3 Jacobian matrix F_k = df/dx evaluated at prior theta
        F_k = np.array([
            [1.0, 0.0, -v * math.sin(theta) * dt],
            [0.0, 1.0,  v * math.cos(theta) * dt],
            [0.0, 0.0,  1.0]
        ])
        # ^^^ Linearize trigonometric motion model around current heading estimate

        # 3. Propagate Covariance: P = F_k @ P @ F_k.T + Q
        self.P = F_k @ self.P @ F_k.T + self.Q
        # ^^^ Uncertainty ellipse grows and rotates with the robot's heading!

    def update_gps(self, z_xy: np.ndarray) -> None:
        z = z_xy.reshape(2, 1)
        y = z - (self.H @ self.x)
        # ^^^ 2x1 Innovation (measurement residual): y = z - H * x_hat

        S = self.H @ self.P @ self.H.T + self.R
        # ^^^ 2x2 Innovation covariance matrix S
        K = self.P @ self.H.T @ np.linalg.inv(S)
        # ^^^ 3x2 Kalman Gain matrix K = P * H^T * S^-1

        self.x = self.x + (K @ y)
        # ^^^ Update all 3 states [x, y, theta]^T using 2D position innovation y!
        I = np.eye(3)
        self.P = (I - K @ self.H) @ self.P @ (I - K @ self.H).T + K @ self.R @ K.T
        # ^^^ Joseph-form covariance update guarantees P stays symmetric and positive-definite!

if __name__ == "__main__":
    np.random.seed(7)
    ekf = MobileRobotEKF(0.0, 0.0, 0.0)
    true_state = np.array([0.0, 0.0, 0.0])
    dt = 0.2
    for step in range(1, 6):
        v_cmd, w_cmd = 1.5, 0.25  # Driving in a gentle circular arc
        true_state[0] += v_cmd * math.cos(true_state[2]) * dt
        true_state[1] += v_cmd * math.sin(true_state[2]) * dt
        true_state[2] += w_cmd * dt
        # ^^^ Advance true simulated robot state

        ekf.predict(v_cmd + np.random.normal(0, 0.1), w_cmd + np.random.normal(0, 0.03), dt)
        # ^^^ EKF Predict with noisy wheel odometry
        z_gps = true_state[:2] + np.random.normal(0, 0.5, size=2)
        ekf.update_gps(z_gps)
        # ^^^ EKF Update with noisy 2D GPS reading (notice how heading theta is also corrected!)
        est = ekf.x.flatten()
        print(f"Step {step} | True: ({true_state[0]:.2f}, {true_state[1]:.2f}, {true_state[2]:.2f} rad) "
              f"| EKF: ({est[0]:.2f}, {est[1]:.2f}, {est[2]:.2f} rad)")
```

---

### 8. Common Mistakes & Fixes

| Mistake | Symptom on the Robot | Root Cause | The Fix |
| :--- | :--- | :--- | :--- |
| **Setting Process Noise $\mathbf{Q} = \mathbf{0}$** | After a few seconds, the Kalman Filter completely ignores new sensor readings and drifts away! | With $\mathbf{Q} = \mathbf{0}$, $\mathbf{P}_k$ shrinks to $\mathbf{0}$, so Kalman Gain $\mathbf{K}_k \to \mathbf{0}$ ("Filter Senility / Smugness"). | Always keep $\mathbf{Q}$ strictly positive ($\mathbf{Q} > \mathbf{0}$) to model unmodeled disturbances and keep the filter receptive to sensors. |
| **Forgetting Angle Wrapping on Innovation $y_\theta = z_\theta - \hat{\theta}$** | Whenever the robot crosses $\pm 180^\circ$ ($\pm\pi\text{ rad}$), the heading estimate violently spins $360^\circ$! | Subtracting $\hat{\theta} = -179^\circ$ from $z_\theta = +179^\circ$ gives $+358^\circ$ instead of $-2^\circ$! | Always wrap angular innovations to $[-\pi, +\pi]$ using `atan2(sin(y), cos(y))` immediately after subtraction. |
| **Using Simple $\mathbf{P} = (\mathbf{I} - \mathbf{K}\mathbf{H})\mathbf{P}$ in Single-Precision `float`** | In long missions, $\mathbf{P}$ loses symmetry or develops negative diagonal variances (`NaN`). | Floating-point subtraction $(\mathbf{I} - \mathbf{K}\mathbf{H})\mathbf{P}$ can lose positive-definiteness when $\mathbf{K}$ is large. | Use double precision (`double`) or the numerically symmetric **Joseph Form**: $\mathbf{P} = (\mathbf{I}-\mathbf{K}\mathbf{H})\mathbf{P}(\mathbf{I}-\mathbf{K}\mathbf{H})^T + \mathbf{K}\mathbf{R}\mathbf{K}^T$. |
| **Fusing Extreme Sensor Glitches Without a Mahalanobis Gate** | One multipathed GPS jump teleports the robot's state estimate $20\text{ m}$ sideways. | Kalman filters assume Gaussian tails; a $50\sigma$ hardware glitch pulls the mean strongly. | Check squared Mahalanobis distance $\mathbf{y}^T \mathbf{S}^{-1} \mathbf{y} < \chi^2_{99\%}$ (or $|y| < 3\sqrt{S}$ in 1D) before calling `update()`. |

---

### 9. Quick Reference Summary

| Variable / Matrix | Name | Role in the Filter | What Happens If You Make It Larger? |
| :--- | :--- | :--- | :--- |
| **$\hat{\mathbf{x}}_k$** | State Estimate Vector | Current best belief of robot's physical state ($[x, y, \theta, v]^T$). | Moves the center of the Gaussian probability distribution. |
| **$\mathbf{P}_k$** | State Covariance Matrix | Current uncertainty of $\hat{\mathbf{x}}_k$; grows on Predict, shrinks on Update. | Increases Kalman Gain $\mathbf{K}_k$, making the filter trust the next sensor reading more. |
| **$\mathbf{Q}$** | Process Noise Covariance | Uncertainty added by physics/odometry every step. | Filter trusts dead-reckoning *less* and tracks sensor readings more aggressively ($K \uparrow$). |
| **$\mathbf{R}$** | Measurement Noise Covariance | Sensor noise variance from datasheet ($\sigma_{\text{sensor}}^2$). | Filter trusts the noisy sensor *less* and relies more smoothly on physics prediction ($K \downarrow$). |
| **$\mathbf{K}_k$** | Kalman Gain ($\frac{P}{P+R}$) | Optimal blending weight between Prediction ($0$) and Sensor ($1$). | Computed automatically from $\mathbf{P}$ and $\mathbf{R}$ on every tick—never hand-tuned! |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. A 3-tick 1D Kalman dry-run.** Repeat the Section 4 table with new numbers: $\hat{x}_0 = 0.0\text{ m}$, $P_0 = 2.0\text{ m}^2$, $v\Delta t = +1.5\text{ m}$ per tick, $Q = 0.25\text{ m}^2$, $R = 0.75\text{ m}^2$, and GPS readings $z = [1.8,\ 2.7,\ 4.6]\text{ m}$. Fill in $\hat{x}^-$, $P^-$, innovation $y$, $K$, $\hat{x}_k$ and $P_k$ for ticks 1–3.

**Q2. Steady-state gain.** In Section 4 ($Q = 0.5$, $R = 1.0$), $P_k$ settled at $0.500$. Without simulating, find the steady-state posterior variance $P_\infty$ when $Q = R = 1.0$. (Hint: at steady state $P = \frac{(P+Q)R}{P+Q+R}$.) What happens to $K$ as $Q \to 0$?

**Q3. Velocity from a position-only sensor.** Run one tick of the chapter's `KalmanFilter1DPosVel` by hand, with process noise switched off: `kf(0.0, 0.0, /*sigma_accel=*/0.0, /*sigma_meas=*/1.0)`, then `kf.predict(0.0, 1.0)` and `kf.updatePosition(3.0)`. What are $\mathbf{P}^-$, the gain vector $[K_0, K_1]$, the updated position and velocity, and the updated $\mathbf{P}$?

**Q4. EKF Jacobian.** A robot at $\hat{\mathbf{x}} = [1.0,\ 1.0,\ \pi/6]^T$ drives with $v = 2.0\text{ m/s}$, $\omega = 0$, $\Delta t = 0.5\text{ s}$. Give the predicted mean $\hat{\mathbf{x}}_{k|k-1}$ and the two non-trivial Jacobian entries $\partial x_k/\partial\theta$ and $\partial y_k/\partial\theta$.

**Q5. 1D innovation gate.** The prior is $\hat{x}^- = 10.0\text{ m}$, $P^- = 0.5$, and $R = 0.5$. Using the Common Mistakes gate $|y| < 3\sqrt{S}$, is $z = 13.5$ fused? Is $z = 12.4$? For the accepted one, give $\hat{x}_k$ and $P_k$.

### Coding Exercises

**E1 (Easy). One scalar Kalman step.** Write `kf1d_step(x, P, u_dt, z, Q, R) -> tuple[float, float]` that performs predict + update and returns $(\hat{x}_k, P_k)$. Running it over the Section 4 inputs must reproduce that table.
- `kf1d_step(0.0, 1.0, 2.0, 2.4, 0.5, 1.0)` → `(2.24, 0.6)`
- Feeding Q1's inputs gives final `(4.520, 0.345)` (3 decimals).

**E2 (Easy–Medium). Steady-state finder.** Write `steady_state(Q, R, tol=1e-12, max_iter=10_000) -> tuple[float, float]` that iterates predict/update (no measurements needed, since $P$ does not depend on $z$) until $P$ stops changing and returns $(P_\infty, K_\infty)$.
- `steady_state(0.5, 1.0)` → `(0.5, 0.5)`
- `steady_state(1.0, 1.0)` → `(0.618, 0.618)` (3 decimals)
- `steady_state(0.1, 1.0)` → `(0.270, 0.270)` (3 decimals)

**E3 (Medium). Position–velocity filter in pure Python.** Port the chapter's C++ `KalmanFilter1DPosVel` to a Python class `PosVelKF(init_pos, init_vel, sigma_accel, sigma_meas)` with `predict(accel_cmd, dt)` and `update_position(z)`. Keep $\mathbf{P}$ as four floats `[P00, P01, P10, P11]` initialized to the identity, and use exactly the chapter's $\mathbf{F}\mathbf{P}\mathbf{F}^T + \mathbf{Q}$ expansion.
- `kf = PosVelKF(0, 0, 0.0, 1.0)`. After `predict(0, 1.0)` and `update_position(3.0)`: `pos=2.0, vel=1.0`.
- A second `predict(0, 1.0)` and `update_position(5.0)` gives `pos=4.333, vel=1.667`.

#### Dry-Run: Answers

**Q1.**

| Tick | $\hat{x}^-$ | $P^-$ | $z$ | $y = z - \hat{x}^-$ | $K = \frac{P^-}{P^-+0.75}$ | $\hat{x}_k$ | $P_k = (1-K)P^-$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | $0.0 + 1.5 = 1.500$ | $2.0 + 0.25 = 2.250$ | 1.8 | $+0.300$ | $2.25/3.00 = 0.750$ | $1.5 + 0.75(0.3) = \mathbf{1.725}$ | $0.25 \times 2.25 = \mathbf{0.5625}$ |
| 2 | $1.725 + 1.5 = 3.225$ | $0.5625 + 0.25 = 0.8125$ | 2.7 | $-0.525$ | $0.8125/1.5625 = 0.520$ | $3.225 - 0.273 = \mathbf{2.952}$ | $0.48 \times 0.8125 = \mathbf{0.390}$ |
| 3 | $2.952 + 1.5 = 4.452$ | $0.390 + 0.25 = 0.640$ | 4.6 | $+0.148$ | $0.64/1.39 \approx 0.460$ | $4.452 + 0.068 = \mathbf{4.520}$ | $0.540 \times 0.64 \approx \mathbf{0.345}$ |

The large initial $P_0$ makes tick 1 trust GPS heavily ($K = 0.75$). As $P$ shrinks, $K$ falls toward its steady state.

**Q2.** Let $P^- = P + 1$. Steady state requires $P = \frac{P^-\cdot 1}{P^- + 1}$, so $P(P + 2) = P + 1$, which gives $P^2 + P - 1 = 0$. Then $P_\infty = \frac{-1 + \sqrt{5}}{2} \approx \mathbf{0.618\text{ m}^2}$ (the golden ratio), and $K_\infty = \frac{1.618}{2.618} \approx 0.618$. As $Q \to 0$, $P$ shrinks every tick with nothing adding it back, so $P \to 0$ and $K \to 0$. The filter stops listening to sensors ("filter senility"), the first Common Mistake.

**Q3.** With $q = 0$ and $\Delta t = 1$: $P_{00}^- = 1 + 1(0 + 0) + 1 \cdot 1 = 2$, $P_{01}^- = P_{10}^- = 0 + 1 = 1$, $P_{11}^- = 1$. So $\mathbf{P}^- = \begin{bmatrix} 2 & 1 \\ 1 & 1 \end{bmatrix}$, and the state is still $[0, 0]$. Update: $S = 2 + 1 = 3$, $K_0 = 2/3$, $K_1 = P_{10}/S = 1/3$, innovation $= 3.0$. **Position $= 0 + \frac{2}{3}(3) = 2.0$, velocity $= 0 + \frac{1}{3}(3) = 1.0$.** The velocity moved even though only position was measured, through $P_{10}^- = 1$. New $\mathbf{P}$: $p_{00} = \frac{1}{3}\cdot 2 = 0.667$, $p_{01} = \frac{1}{3}\cdot 1 = 0.333$, $p_{10} = 1 - \frac{1}{3}\cdot 2 = 0.333$, $p_{11} = 1 - \frac{1}{3}\cdot 1 = 0.667$.

**Q4.** $\cos(\pi/6) = 0.866$ and $\sin(\pi/6) = 0.5$. Mean: $x = 1.0 + 2(0.866)(0.5) = \mathbf{1.866}$, $y = 1.0 + 2(0.5)(0.5) = \mathbf{1.500}$, $\theta = \pi/6$ (unchanged since $\omega = 0$). Jacobian: $\partial x_k/\partial\theta = -v\sin\theta\,\Delta t = -2(0.5)(0.5) = \mathbf{-0.500}$ and $\partial y_k/\partial\theta = +v\cos\theta\,\Delta t = 2(0.866)(0.5) = \mathbf{+0.866}$.

**Q5.** $S = P^- + R = 1.0$, so the gate is $|y| < 3$. $z = 13.5$: $|y| = 3.5 \ge 3$, **rejected**. $z = 12.4$: $|y| = 2.4$, **accepted**. Then $K = 0.5/1.0 = 0.5$, $\hat{x}_k = 10.0 + 0.5(2.4) = \mathbf{11.2\text{ m}}$, and $P_k = 0.5 \times 0.5 = \mathbf{0.25\text{ m}^2}$.

**E1. Reference solution**

```python
def kf1d_step(x: float, P: float, u_dt: float, z: float, Q: float, R: float) -> tuple[float, float]:
    x_prior = x + u_dt          # predict mean (physics)
    P_prior = P + Q             # predict variance (uncertainty grows)
    K = P_prior / (P_prior + R) # Kalman gain
    x_post = x_prior + K * (z - x_prior)
    P_post = (1.0 - K) * P_prior
    return x_post, P_post

x, P = 0.0, 2.0
for z in [1.8, 2.7, 4.6]:
    x, P = kf1d_step(x, P, 1.5, z, 0.25, 0.75)
print(round(x, 3), round(P, 3))  # 4.52 0.345
```

$O(1)$ per tick. These are the boxed equations from Sections 2 and 3, in order.

**E2. Reference solution**

```python
def steady_state(Q: float, R: float, tol: float = 1e-12, max_iter: int = 10_000) -> tuple[float, float]:
    P, K = 1.0, 0.0
    for _ in range(max_iter):
        P_prior = P + Q
        K = P_prior / (P_prior + R)
        P_new = (1.0 - K) * P_prior
        if abs(P_new - P) < tol:
            return P_new, K
        P = P_new
    return P, K

for q in (0.5, 1.0, 0.1):
    P, K = steady_state(q, 1.0)
    print(q, round(P, 3), round(K, 3))  # 0.5 0.5 0.5 | 1.0 0.618 0.618 | 0.1 0.27 0.27
```

This converges geometrically, typically in a few dozen iterations. $P_\infty = K_\infty$ here because $R = 1$ (from $P = (1-K)P^-$ and $K = P^-/(P^-+R)$ we get $P = KR$). A larger $Q$ gives a larger $K$, so the filter tracks the sensor more aggressively, matching the Quick Reference table.

**E3. Reference solution**

```python
class PosVelKF:
    def __init__(self, init_pos: float, init_vel: float, sigma_accel: float, sigma_meas: float):
        self.x = [init_pos, init_vel]
        self.P = [1.0, 0.0, 0.0, 1.0]            # [P00, P01, P10, P11]
        self.q = sigma_accel ** 2                 # square std devs into variances!
        self.r = sigma_meas ** 2

    def predict(self, accel_cmd: float, dt: float) -> None:
        pos, vel = self.x
        self.x = [pos + vel * dt + 0.5 * accel_cmd * dt * dt, vel + accel_cmd * dt]
        p00, p01, p10, p11 = self.P
        q = self.q
        self.P = [p00 + dt * (p01 + p10) + dt * dt * p11 + 0.25 * dt ** 4 * q,
                  p01 + dt * p11 + 0.5 * dt ** 3 * q,
                  p10 + dt * p11 + 0.5 * dt ** 3 * q,
                  p11 + dt * dt * q]

    def update_position(self, z: float) -> None:
        p00, p01, p10, p11 = self.P
        innovation = z - self.x[0]
        S = p00 + self.r
        k0, k1 = p00 / S, p10 / S
        self.x = [self.x[0] + k0 * innovation, self.x[1] + k1 * innovation]
        self.P = [(1 - k0) * p00, (1 - k0) * p01, p10 - k1 * p00, p11 - k1 * p01]

kf = PosVelKF(0.0, 0.0, 0.0, 1.0)
kf.predict(0.0, 1.0); kf.update_position(3.0)
print(kf.x)                                   # [2.0, 1.0]
kf.predict(0.0, 1.0); kf.update_position(5.0)
print([round(v, 3) for v in kf.x])            # [4.333, 1.667]
```

Second tick: the prediction moves the state to $[3.0, 1.0]$ with $\mathbf{P}^- = \begin{bmatrix} 2 & 1 \\ 1 & 0.667 \end{bmatrix}$. Then $S = 3$, $K = [2/3, 1/3]$, innovation $= 2$, giving $[3 + 1.333,\ 1 + 0.667]$. $O(1)$ per tick.

---

## Interactive Visualization & shadcn/ui Specification

### Widget Purpose
Build an interactive **Kalman Filter Gaussian Fusion & 2D EKF Robot Tracker** with two synchronized views:
1. **View A (1D Gaussian Multiplier):** Visually overlays the **Prior Bell Curve** $\mathcal{N}(\hat{x}^-, P^-)$ (cyan), the **Sensor Measurement Bell Curve** $\mathcal{N}(z_k, R)$ (amber), and their product—the **Fused Posterior Bell Curve** $\mathcal{N}(\hat{x}_k, P_k)$ (emerald)—showing how multiplying two Gaussians always creates a taller, narrower Gaussian weighted by $K = \frac{P^-}{P^- + R}$.
2. **View B (2D EKF Trajectory & Covariance Ellipses):** Shows a mobile robot driving in a figure-8 while fusing wheel odometry with noisy 2D GPS pings, plotting True Path (white), Dead-Reckoning Odometry Drift (red dashed), Raw Noisy GPS Dots (amber), and EKF Fused Path with shrinking/growing $2\sigma$ covariance ellipses (emerald).

### Visual Layout & Interactive Canvas
- **Top Split Canvas:**
  - **Left (50%):** Live 1D Gaussian curve multiplication plot with draggable Prior Mean $\hat{x}^-$ and Sensor Reading $z_k$, plus a visual lever bar illustrating the Kalman Gain $K \in [0, 1]$ as the center-of-trust fulcrum between $\hat{x}^-$ and $z_k$.
  - **Right (50%):** 2D top-down arena where the EKF robot drives, showing its $2\sigma$ uncertainty ellipse expanding between GPS fixes (Predict) and snapping smaller each time a GPS ping arrives (Update).
- **Bottom Telemetry Chart:** Real-time plot of Estimation Error $|\hat{x}_k - x_{\text{true}}|$ bounded inside the $\pm 2\sqrt{P_k}$ covariance envelope and a trace of Kalman Gain $K_k$ over time.

### Required `shadcn/ui` Primitives (No Raw Browser Inputs)
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`: Switch between `"1D Gaussian Multiplication Lab"`, `"5-Step Dry-Run Stepper"`, and `"2D EKF Robot Arena"`.
- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`: Container cards for the Gaussian canvas, EKF arena, and tuning controls.
- `<Slider>`:
  - `Process Noise Variance Q` ($0.01\text{ to }5.0\text{ m}^2$)
  - `Sensor Noise Variance R` ($0.01\text{ to }10.0\text{ m}^2$)
  - `GPS Update Frequency` ($0.5\text{ Hz to }10\text{ Hz}$ — slowing GPS down visibly shows the $\mathbf{P}$ ellipse ballooning during long Predict stretches and snapping tight on Update!).
- `<Switch>`: `"Enable GPS Measurement Updates"` (toggling OFF demonstrates pure dead-reckoning drift), `"Enable 3σ Outlier Rejection Gate"`, and `"Inject Random 15m GPS Multipath Glitch"`.
- `<Button>`: `"Step Predict (+dt)"`, `"Step Update (Read Sensor)"`, `"Run Continuous"`, and `"Reset Filter"`.
- `<Badge>`: Live badges displaying `Kalman Gain K = 0.524`, `Prior Var P⁻ = 1.10 m²`, `Posterior Var P = 0.524 m² (-52% Uncertainty!)`, and `RMSE: 0.14m`.
- `<Table>`: Interactive 5-row dry-run table matching Section 4 that highlights the active row as the learner clicks `"Step Predict"` and `"Step Update"`.
- `<Tooltip>`: Hover explanations on $\mathbf{Q}$, $\mathbf{R}$, and $K = \frac{P}{P+R}$ explaining why you tune $\mathbf{Q}$ and $\mathbf{R}$ rather than tuning $\mathbf{K}$ directly.
