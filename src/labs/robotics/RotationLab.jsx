import { useMemo, useRef, useState } from "react";
import { Lock, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, useAnimationFrame, useSvgDrag } from "@/viz/kit";
import { D2R, R2D, det3, eulerToQuat, eulerToR, makeCamera, matMul, matVec, qAngle, qDot, qNorm, quatToR, rToEuler, rToQuat, slerp } from "./_RotationLab-math";

const W = 560, H = 430, SC = 92;
const fmt = (v, n = 3) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(n);

/* ------------------------------------------------------------------ */
/* Tiny orthographic 3D renderer (painter's algorithm)                 */
/* ------------------------------------------------------------------ */

// Paper-airplane in body coords (x forward, y left, z up).
const PLANE = [
  { pts: [[0.3, 0, 0], [-0.3, 1.25, 0], [-0.55, 1.25, 0], [-0.4, 0, 0], [-0.55, -1.25, 0], [-0.3, -1.25, 0]], tone: "fill" },
  { pts: [[1.35, 0, 0.02], [0.25, 0.15, 0.02], [-1.05, 0.08, 0.02], [-1.05, -0.08, 0.02], [0.25, -0.15, 0.02]], tone: "body" },
  { pts: [[1.35, 0, 0], [0.25, 0, 0.17], [-1.05, 0, 0.1], [-1.05, 0, -0.06], [0.25, 0, -0.13]], tone: "body" },
  { pts: [[-0.75, 0, 0.08], [-1.08, 0, 0.6], [-1.2, 0, 0.6], [-1.1, 0, 0.08]], tone: "fin" },
  { pts: [[-0.8, 0, 0.03], [-1.08, 0.48, 0.03], [-1.2, 0.48, 0.03], [-1.15, 0, 0.03], [-1.2, -0.48, 0.03], [-1.08, -0.48, 0.03]], tone: "fill" },
];
const TONE = { fill: C.fill, body: C.card, fin: C.warn };

function planeItems(R, { ghost = false, scale = 1 } = {}) {
  return PLANE.map((f) => ({
    type: "poly",
    pts: f.pts.map((p) => matVec(R, p.map((v) => v * scale))),
    fill: ghost ? "none" : TONE[f.tone],
    stroke: ghost ? C.bad : C.ink,
    dash: ghost ? "4 3" : undefined,
    width: ghost ? 1.4 : 1.1,
    fo: f.tone === "fin" ? 0.85 : 0.92,
  }));
}

function axisItems(R, len, colors, labels, width = 3) {
  return [0, 1, 2].flatMap((k) => {
    const e = [0, 0, 0];
    e[k] = len;
    const tip = matVec(R, e);
    return [
      { type: "line", a: [0, 0, 0], b: tip, color: colors[k], width },
      { type: "dot", p: tip, color: colors[k], r: width + 1.5 },
      { type: "text", p: tip.map((v) => v * 1.12), text: labels[k], color: colors[k] },
    ];
  });
}

function ringItems(Rring, radius, plane, color, width = 3, emph = false) {
  // plane: indices of the two body axes spanning the ring
  const out = [];
  const n = 56;
  const pt = (t) => {
    const v = [0, 0, 0];
    v[plane[0]] = radius * Math.cos(t);
    v[plane[1]] = radius * Math.sin(t);
    return matVec(Rring, v);
  };
  for (let k = 0; k < n; k++) out.push({ type: "line", a: pt((2 * Math.PI * k) / n), b: pt((2 * Math.PI * (k + 1)) / n), color, width: emph ? width + 1.5 : width, ring: true });
  return out;
}

function Scene3D({ items, initAz = 35, initEl = 20, caption }) {
  const [az, setAz] = useState(initAz * D2R);
  const [el, setEl] = useState(initEl * D2R);
  const last = useRef(null);
  const { svgProps, startDrag } = useSvgDrag((id, x, y) => {
    if (last.current) {
      setAz((a) => a - (x - last.current[0]) * 0.01);
      setEl((e) => Math.max(-1.45, Math.min(1.45, e + (y - last.current[1]) * 0.01)));
    }
    last.current = [x, y];
  });
  const proj = makeCamera(az, el, SC, W / 2, H / 2 + 8);
  const drawn = items
    .map((it, k) => {
      if (it.type === "poly") {
        const P = it.pts.map(proj);
        return { ...it, k, P, z: P.reduce((s, p) => s + p[2], 0) / P.length };
      }
      if (it.type === "line" || it.type === "path") {
        const P = (it.type === "line" ? [it.a, it.b] : it.pts).map(proj);
        return { ...it, k, P, z: P.reduce((s, p) => s + p[2], 0) / P.length + (it.bias ?? 0) };
      }
      const P = [proj(it.p)];
      return { ...it, k, P, z: it.type === "text" ? 1e9 : P[0][2] + 0.01 };
    })
    .sort((a, b) => a.z - b.z);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" {...svgProps}>
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            last.current = null;
            startDrag("orbit")(e);
          }}
        />
        <g pointerEvents="none">
          {drawn.map((d) => {
            if (d.type === "poly")
              return <polygon key={d.k} points={d.P.map((p) => `${p[0]},${p[1]}`).join(" ")} fill={d.fill} fillOpacity={d.fo ?? 1} stroke={d.stroke} strokeWidth={d.width ?? 1} strokeDasharray={d.dash} strokeLinejoin="round" />;
            if (d.type === "line" || d.type === "path") {
              const behind = d.ring ? d.z < 0 : false;
              return (
                <polyline
                  key={d.k}
                  points={d.P.map((p) => `${p[0]},${p[1]}`).join(" ")}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={d.width ?? 2}
                  strokeDasharray={d.dash}
                  strokeLinecap="round"
                  opacity={(d.opacity ?? 1) * (behind ? 0.35 : 1)}
                />
              );
            }
            if (d.type === "dot") return <circle key={d.k} cx={d.P[0][0]} cy={d.P[0][1]} r={d.r ?? 4} fill={d.color} />;
            return (
              <text key={d.k} x={d.P[0][0]} y={d.P[0][1] + 4} textAnchor="middle" fontSize={d.size ?? 12} fontWeight={700} fill={d.color}>
                {d.text}
              </text>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-1.5 left-2 text-[11px] text-muted-foreground">{caption ?? "drag to orbit the camera"}</div>
    </div>
  );
}

const worldAxes = () => axisItems([[1, 0, 0], [0, 1, 0], [0, 0, 1]], 2.15, [C.muted, C.muted, C.muted], ["X", "Y", "Z"], 1.2).map((i) => (i.type === "line" ? { ...i, dash: "3 4" } : i));

function MatrixTable({ R }) {
  const colTone = ["text-viz-bad", "text-viz-ok", "text-viz-active"];
  return (
    <div className="rounded-lg border bg-background/50 p-2">
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">R = Rz(ψ)·Ry(θ)·Rx(φ) — columns are the body axes</div>
      <div className="grid grid-cols-3 gap-1 font-mono text-[12.5px]">
        {R.flatMap((row, i) =>
          row.map((v, j) => (
            <div key={`${i}${j}`} className={`rounded bg-muted/50 px-2 py-1 text-right tabular-nums ${colTone[j]}`}>
              {fmt(v, 3)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuatBars({ q, label }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {["w", "x", "y", "z"].map((k, i) => (
        <div key={k} className="grid grid-cols-[1.2rem_1fr_3.6rem] items-center gap-2 font-mono text-[12px]">
          <span className="text-muted-foreground">{k}</span>
          <div className="relative h-2.5 rounded-full bg-muted">
            <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: "50%" }} />
            <div
              className="absolute top-0 h-full rounded-full bg-viz-active"
              style={{ left: `${50 + Math.min(0, q[i]) * 50}%`, width: `${Math.abs(q[i]) * 50}%` }}
            />
          </div>
          <span className="text-right tabular-nums">{fmt(q[i], 3)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: Euler angles & gimbal lock                                   */
/* ------------------------------------------------------------------ */

function GimbalTab() {
  const [roll, setRoll] = useState(20);
  const [pitch, setPitch] = useState(25);
  const [yaw, setYaw] = useState(35);
  const [wiggle, setWiggle] = useState("none");
  const [ph, setPh] = useState(0);
  useAnimationFrame((dt) => setPh((p) => (p + dt * 2.4) % (2 * Math.PI)), wiggle !== "none");

  const w = 30 * Math.sin(ph);
  const r = roll + (wiggle === "roll" ? w : 0);
  const y = yaw + (wiggle === "yaw" ? w : 0);
  const R = eulerToR(r * D2R, pitch * D2R, y * D2R);
  const Rz = eulerToR(0, 0, y * D2R);
  const Rzy = eulerToR(0, pitch * D2R, y * D2R);
  const locked = Math.abs(Math.cos(pitch * D2R)) < 0.03;
  const rollAxis = matVec(Rzy, [1, 0, 0]);
  const axleAngle = Math.acos(Math.min(1, Math.abs(rollAxis[2]))) * R2D; // angle between yaw axle (Z) and roll axle
  const q = rToQuat(R);
  const e = rToEuler(R);
  const RtR = matMul(R[0].map((_, j) => R.map((row) => row[j])), R);
  const orthoErr = Math.max(...RtR.flatMap((row, i) => row.map((v, j) => Math.abs(v - (i === j ? 1 : 0)))));

  const items = [
    ...worldAxes(),
    // gimbal rings: outer yaw (about Z), middle pitch (about Y'), inner roll (about X'')
    ...ringItems(Rz, 1.95, [2, 1], C.active, 3, locked),
    ...ringItems(Rzy, 1.75, [0, 1], C.ok, 3, locked),
    ...ringItems(R, 1.55, [0, 2], C.bad, 3),
    { type: "line", a: [0, 0, -2.2], b: [0, 0, 2.2], color: C.active, width: 1.5, dash: "6 5", opacity: 0.8 },
    { type: "line", a: rollAxis.map((v) => -2.2 * v), b: rollAxis.map((v) => 2.2 * v), color: C.bad, width: 1.5, dash: "2 4", opacity: 0.9 },
    ...planeItems(R, { scale: 1.15 }),
    ...axisItems(R, 1.35, [C.bad, C.ok, C.active], ["xᵦ", "yᵦ", "zᵦ"], 2.5),
  ];

  return (
    <Split>
      <div className="space-y-3">
        <Stage>
          <Scene3D items={items} />
        </Stage>
        <Legend
          items={[
            [C.active, "yaw ring ψ (about world Z)"],
            [C.ok, "pitch ring θ (about Y′)"],
            [C.bad, "roll ring φ (about body X)"],
            [C.warn, "tail fin (body up)"],
          ]}
        />
        <Narration tone={locked ? "bad" : "default"}>
          {locked ? (
            <>
              <b>Gimbal lock.</b> With pitch = {fmt(pitch, 0)}°, the roll axle (body X) lies along the yaw axle (world Z). The outer yaw ring and middle pitch ring have folded into the same plane, so
              roll and yaw now spin the plane about the <b>same</b> axis: R depends only on φ {pitch > 0 ? "−" : "+"} ψ = {fmt(pitch > 0 ? r - y : r + y, 0)}°. One degree of
              freedom is gone. Use the wiggle buttons: both make the exact same motion.
            </>
          ) : (
            <>
              ZYX order: yaw about world Z, then pitch about the new Y′, then roll about the body X″. The roll and yaw axles are {fmt(axleAngle, 1)}° apart. Push pitch toward
              ±90° and watch that angle collapse to 0.
            </>
          )}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Euler angles (ZYX)">
          <SliderControl label="Roll φ (about X)" value={roll} min={-180} max={180} step={1} onChange={setRoll} format={(v) => `${v}°`} />
          <SliderControl label="Pitch θ (about Y)" value={pitch} min={-90} max={90} step={1} onChange={setPitch} format={(v) => `${v}°`} />
          <SliderControl label="Yaw ψ (about Z)" value={yaw} min={-180} max={180} step={1} onChange={setYaw} format={(v) => `${v}°`} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="destructive" onClick={() => setPitch(90)}>
              <Lock /> Snap pitch to 90° (gimbal lock)
            </Button>
            <Button size="sm" variant="outline" onClick={() => (setRoll(0), setPitch(0), setYaw(0), setWiggle("none"))}>
              <RotateCcw /> Level
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">Wiggle</span>
            <ToggleGroup type="single" value={wiggle} onValueChange={(v) => setWiggle(v || "none")}>
              <ToggleGroupItem value="none">off</ToggleGroupItem>
              <ToggleGroupItem value="roll">roll φ</ToggleGroupItem>
              <ToggleGroupItem value="yaw">yaw ψ</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </Panel>
        <div className="flex flex-wrap gap-1.5">
          {locked ? (
            <Badge variant="danger" className="animate-pulse">
              GIMBAL LOCK: yaw & roll axes aligned (1 DOF lost)
            </Badge>
          ) : (
            <Badge variant="success">3 independent axes</Badge>
          )}
          <Badge variant="outline">det R = {fmt(det3(R), 3)}</Badge>
          <Badge variant="outline">RᵀR = I (err {orthoErr.toExponential(0)})</Badge>
        </div>
        <MatrixTable R={R} />
        <Table>
          <TableBody className="font-mono text-[12.5px]">
            <TableRow>
              <TableCell className="py-1.5">quaternion [w, x, y, z]</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">[{q.map((v) => fmt(v, 3)).join(", ")}]</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1.5">‖q‖</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums text-viz-ok">{fmt(qNorm(q), 4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1.5">Euler recovered from R</TableCell>
              <TableCell className={`py-1.5 text-right tabular-nums ${e.locked ? "text-viz-bad" : ""}`}>
                {e.locked ? `φ, ψ ambiguous (only ψ ${pitch > 0 ? "−" : "+"} φ = ${fmt(e.yaw * R2D, 0)}°)` : `φ ${fmt(e.roll * R2D, 1)}°, θ ${fmt(e.pitch * R2D, 1)}°, ψ ${fmt(e.yaw * R2D, 1)}°`}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: SLERP vs naive Euler-angle interpolation                     */
/* ------------------------------------------------------------------ */

const ORIENT = {
  identity: { label: "Identity (level)", e: [0, 0, 0] },
  yaw90: { label: "Yaw 90° (left)", e: [0, 0, 90] },
  pitch90: { label: "Pitch 90° (nose down)", e: [0, 90, 0] },
  roll180: { label: "Roll 180° (inverted)", e: [180, 0, 0] },
  combo: { label: "φ 90°, θ 60°, ψ 150°", e: [90, 60, 150] },
  combo2: { label: "φ −150°, θ −40°, ψ −120°", e: [-150, -40, -120] },
};
const qOf = ([r, p, y]) => eulerToQuat(r * D2R, p * D2R, y * D2R);

function SlerpTab() {
  const [a, setA] = useState("identity");
  const [b, setB] = useState("combo");
  const [custom, setCustom] = useState(null);
  const [t, setT] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  useAnimationFrame((dt) => {
    setT((v) => {
      const n = v + dt / 3;
      if (n >= 1) {
        setPlaying(false);
        return 1;
      }
      return n;
    });
  }, playing);

  const e0 = ORIENT[a].e;
  const e1 = custom ?? ORIENT[b].e;
  const q0 = qOf(e0), q1 = qOf(e1);
  const eLerp = (s) => e0.map((v, i) => v + (e1[i] - v) * s);

  const paths = useMemo(() => {
    const n = 80;
    const sl = [], eu = [];
    let lenE = 0, prev = null;
    for (let k = 0; k <= n; k++) {
      const s = k / n;
      const qs = slerp(q0, q1, s);
      const qe = qOf(eLerp(s));
      sl.push(matVec(quatToR(qs), [1.75, 0, 0]));
      eu.push(matVec(quatToR(qe), [1.75, 0, 0]));
      if (prev) lenE += qAngle(prev, qe);
      prev = qe;
    }
    return { sl, eu, lenE, lenS: qAngle(q0, q1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, custom]);

  const qS = slerp(q0, q1, t);
  const qE = qOf(eLerp(t));
  const qN = (() => {
    const bb = qDot(q0, q1) < 0 ? q1.map((v) => -v) : q1;
    return q0.map((v, i) => v + (bb[i] - v) * t); // plain component lerp, NOT renormalized
  })();
  const RS = quatToR(qS), RE = quatToR(qE);

  const sphere = [];
  for (const [plane, R] of [
    [[0, 1], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
    [[0, 2], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
    [[1, 2], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
  ])
    sphere.push(...ringItems(R, 1.75, plane, C.grid, 1.2));

  const items = [
    ...sphere,
    ...worldAxes(),
    { type: "path", pts: paths.eu, color: C.bad, width: 2.5, dash: "5 4", bias: 0.4 },
    { type: "path", pts: paths.sl, color: C.ok, width: 3.5, bias: 0.4 },
    { type: "dot", p: paths.sl[0], color: C.fg, r: 5 },
    { type: "dot", p: paths.sl.at(-1), color: C.purple, r: 6 },
    ...planeItems(RE, { ghost: true, scale: 0.85 }),
    ...planeItems(RS, { scale: 0.85 }),
    { type: "dot", p: matVec(RE, [1.75, 0, 0]), color: C.bad, r: 5 },
    { type: "dot", p: matVec(RS, [1.75, 0, 0]), color: C.ok, r: 6 },
  ];

  const extra = (paths.lenE / Math.max(paths.lenS, 1e-9) - 1) * 100;
  const randomize = () => {
    const rr = (m) => Math.round((Math.random() * 2 - 1) * m);
    setCustom([rr(180), rr(85), rr(180)]);
    setT(0);
  };

  return (
    <Split>
      <div className="space-y-3">
        <Stage>
          <Scene3D items={items} initAz={40} initEl={24} caption="nose-tip paths on a sphere · drag to orbit" />
        </Stage>
        <Legend
          items={[
            [C.ok, "SLERP (quaternion): great-circle path"],
            [C.bad, "naive lerp of Euler angles"],
            [C.purple, "goal orientation"],
          ]}
        />
        <Narration tone={extra > 5 ? "warn" : "ok"}>
          SLERP turns about one fixed axis at a constant rate, so the nose sweeps a single great-circle arc ({fmt(paths.lenS * R2D, 1)}° total). Lerping (φ, θ, ψ)
          separately wanders: it rotates {fmt(paths.lenE * R2D, 1)}° in total{extra > 1 ? `, ${fmt(extra, 0)}% more than needed` : ""}, and the in-between attitudes are not on
          the shortest path.
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Orientations">
          <div className="grid grid-cols-[3rem_1fr] items-center gap-2 text-[12.5px]">
            <span className="text-muted-foreground">start</span>
            <Select value={a} onValueChange={(v) => (setA(v), setT(0))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORIENT).map(([k, o]) => (
                  <SelectItem key={k} value={k}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">goal</span>
            <Select value={custom ? "custom" : b} onValueChange={(v) => v !== "custom" && (setB(v), setCustom(null), setT(0))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORIENT).map(([k, o]) => (
                  <SelectItem key={k} value={k}>
                    {o.label}
                  </SelectItem>
                ))}
                {custom && <SelectItem value="custom">{`Random: φ ${custom[0]}°, θ ${custom[1]}°, ψ ${custom[2]}°`}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <SliderControl label="interpolation t" value={t} min={0} max={1} step={0.01} onChange={(v) => (setPlaying(false), setT(v))} format={(v) => fmt(v, 2)} />
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => (t >= 1 && setT(0), setPlaying((p) => !p))}>
              {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
            </Button>
            <Button size="sm" variant="outline" onClick={randomize}>
              <Shuffle /> Random goal
            </Button>
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background/50 p-3">
          <QuatBars q={qS} label="SLERP q(t)" />
          <QuatBars q={qE} label="Euler-lerp q(t)" />
        </div>
        <StatGrid cols={2}>
          <Stat label="‖q_slerp‖" value={fmt(qNorm(qS), 4)} tone="ok" />
          <Stat label="‖plain lerp of q‖" value={fmt(qNorm(qN), 4)} tone={qNorm(qN) < 0.99 ? "bad" : undefined} hint="Lerping the 4 components without renormalizing leaves the unit sphere: ‖q‖ < 1 mid-way." />
          <Stat label="gap SLERP vs Euler" value={`${fmt(qAngle(qS, qE) * R2D, 1)}°`} tone="warn" />
          <Stat label="q₀·q₁ (cos half-angle)" value={fmt(Math.abs(qDot(q0, q1)), 3)} />
        </StatGrid>
      </div>
    </Split>
  );
}

export default function RotationLab({ variant = "gimbal" }) {
  const [tab, setTab] = useState("gimbal");
  return (
    <LabShell
      title={variant === "gimbal" ? "Rotation Matrices, Gimbal Lock & Quaternion SLERP" : "3D Rotation Explorer"}
      description="Drive roll, pitch and yaw and read the live 3×3 rotation matrix. Snap pitch to 90° to lose a degree of freedom, then switch to quaternions and interpolate without any singularity."
      badges={["SO(3)", "ZYX Euler", "unit quaternions"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gimbal">Euler angles & gimbal lock</TabsTrigger>
          <TabsTrigger value="slerp">Quaternion SLERP</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "gimbal" ? <GimbalTab /> : <SlerpTab />}
    </LabShell>
  );
}
