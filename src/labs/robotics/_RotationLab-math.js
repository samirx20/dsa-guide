// Pure SO(3) / quaternion helpers for RotationLab (REP-103: x forward, y left, z up).
// Matrices are row-major 3x3 arrays: M[row][col]. Quaternions are [w, x, y, z].

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export const Rx = (a) => [
  [1, 0, 0],
  [0, Math.cos(a), -Math.sin(a)],
  [0, Math.sin(a), Math.cos(a)],
];
export const Ry = (a) => [
  [Math.cos(a), 0, Math.sin(a)],
  [0, 1, 0],
  [-Math.sin(a), 0, Math.cos(a)],
];
export const Rz = (a) => [
  [Math.cos(a), -Math.sin(a), 0],
  [Math.sin(a), Math.cos(a), 0],
  [0, 0, 1],
];

export function matMul(A, B) {
  return A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
}
export const matVec = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
export const det3 = (M) =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

/** ZYX convention: R = Rz(yaw) · Ry(pitch) · Rx(roll). Angles in radians. */
export const eulerToR = (roll, pitch, yaw) => matMul(Rz(yaw), matMul(Ry(pitch), Rx(roll)));

/** Extract ZYX Euler angles. Near |pitch| = 90° only (yaw ∓ roll) is defined. */
export function rToEuler(R) {
  const sp = Math.max(-1, Math.min(1, -R[2][0]));
  const pitch = Math.asin(sp);
  const locked = Math.abs(Math.cos(pitch)) < 1e-3;
  if (locked) return { roll: 0, pitch, yaw: Math.atan2(-R[0][1], R[1][1]), locked };
  return { roll: Math.atan2(R[2][1], R[2][2]), pitch, yaw: Math.atan2(R[1][0], R[0][0]), locked };
}

export function eulerToQuat(roll, pitch, yaw) {
  const cr = Math.cos(roll / 2), sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);
  return [cr * cp * cy + sr * sp * sy, sr * cp * cy - cr * sp * sy, cr * sp * cy + sr * cp * sy, cr * cp * sy - sr * sp * cy];
}

export function quatToR([w, x, y, z]) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

export function rToQuat(R) {
  const tr = R[0][0] + R[1][1] + R[2][2];
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [s / 4, (R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s];
  } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2;
    q = [(R[2][1] - R[1][2]) / s, s / 4, (R[0][1] + R[1][0]) / s, (R[0][2] + R[2][0]) / s];
  } else if (R[1][1] > R[2][2]) {
    const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2;
    q = [(R[0][2] - R[2][0]) / s, (R[0][1] + R[1][0]) / s, s / 4, (R[1][2] + R[2][1]) / s];
  } else {
    const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2;
    q = [(R[1][0] - R[0][1]) / s, (R[0][2] + R[2][0]) / s, (R[1][2] + R[2][1]) / s, s / 4];
  }
  return q[0] < 0 ? q.map((v) => -v) : q; // canonical w >= 0
}

export const qDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
export const qNorm = (q) => Math.hypot(...q);

/** Shortest-path spherical linear interpolation. */
export function slerp(q0, q1, t) {
  let d = qDot(q0, q1);
  let b = q1;
  if (d < 0) {
    d = -d;
    b = q1.map((v) => -v);
  }
  if (d > 0.9995) {
    const q = q0.map((v, i) => v + t * (b[i] - v));
    const n = qNorm(q);
    return q.map((v) => v / n);
  }
  const th = Math.acos(d);
  const s0 = Math.sin((1 - t) * th) / Math.sin(th);
  const s1 = Math.sin(t * th) / Math.sin(th);
  return q0.map((v, i) => s0 * v + s1 * b[i]);
}

/** Geodesic angle (rad) between two orientations. */
export const qAngle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(qDot(a, b))));

/** Orthographic camera looking at origin from (azimuth, elevation). Returns project(p) -> [sx, sy, depth]. */
export function makeCamera(az, el, scale, cx, cy) {
  const c = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const r = [-Math.sin(az), Math.cos(az), 0];
  const u = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
  return (p) => [cx + scale * (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]), cy - scale * (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]), p[0] * c[0] + p[1] * c[1] + p[2] * c[2]];
}
