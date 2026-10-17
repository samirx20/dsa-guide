// Pure SE(2) helpers for FramesLab. A pose is { x, y, th } (th in radians); matrices are 3x3 row-major.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const wrap = (a) => {
  const w = Math.atan2(Math.sin(a), Math.cos(a));
  return w <= -Math.PI + 1e-12 ? Math.PI : w; // range (−π, π]
};

export const pose = (x, y, th) => ({ x, y, th: wrap(th) });
export const identity = () => pose(0, 0, 0);

/** ^A_C T = ^A_B T · ^B_C T */
export function compose(a, b) {
  const c = Math.cos(a.th), s = Math.sin(a.th);
  return pose(a.x + c * b.x - s * b.y, a.y + s * b.x + c * b.y, a.th + b.th);
}

/** ^B_A T = (^A_B T)^-1 = [Rᵀ, −Rᵀt] */
export function inverse(a) {
  const c = Math.cos(a.th), s = Math.sin(a.th);
  return pose(-(c * a.x + s * a.y), -(-s * a.x + c * a.y), -a.th);
}

/** Map a point (w = 1). */
export function apply(a, [px, py]) {
  const c = Math.cos(a.th), s = Math.sin(a.th);
  return [a.x + c * px - s * py, a.y + s * px + c * py];
}

export function toMatrix(a) {
  const c = Math.cos(a.th), s = Math.sin(a.th);
  return [
    [c, -s, a.x],
    [s, c, a.y],
    [0, 0, 1],
  ];
}

/* ---------------- transform tree (tf2-style) ---------------- */

/** frames: { child: { parent, T } }; root has parent null. */
export function ancestors(frames, f) {
  const out = [f];
  while (frames[f]?.parent) {
    f = frames[f].parent;
    out.push(f);
  }
  return out;
}

/** Would setting parent → child create a cycle? Returns the offending ancestor chain or null. */
export function cycleCheck(frames, parent, child) {
  if (parent === child) return [parent];
  const chain = ancestors(frames, parent);
  return chain.includes(child) ? chain : null;
}

/**
 * lookup_transform(target, source): ^target_source T, via the lowest common ancestor.
 * Returns { T, lca, up: [frames source..lca], down: [frames lca..target], hops: [{from,to,T,inv}] , Tsrc, Ttgt }.
 */
export function lookup(frames, target, source) {
  const a = ancestors(frames, source);
  const b = ancestors(frames, target);
  const lca = a.find((f) => b.includes(f));
  if (!lca) throw new Error("ConnectivityError: frames are in disconnected trees");
  const up = a.slice(0, a.indexOf(lca) + 1);
  const down = b.slice(0, b.indexOf(lca) + 1).reverse();
  // ^lca_source T: multiply edges from lca down to source
  let Tsrc = identity();
  for (let k = up.length - 2; k >= 0; k--) Tsrc = compose(Tsrc, frames[up[k]].T);
  let Ttgt = identity();
  for (let k = 1; k < down.length; k++) Ttgt = compose(Ttgt, frames[down[k]].T);
  const T = compose(inverse(Ttgt), Tsrc);
  return { T, lca, up, down, Tsrc, Ttgt };
}

/** Pose of every frame in the root frame. */
export function worldPoses(frames) {
  const out = {};
  const get = (f) => {
    if (out[f]) return out[f];
    const e = frames[f];
    return (out[f] = e.parent ? compose(get(e.parent), e.T) : identity());
  };
  Object.keys(frames).forEach(get);
  return out;
}
