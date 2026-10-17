import { useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Hand } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, useAnimationFrame } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Mode A: single-loop PID vs cascaded position -> velocity            */
/* ------------------------------------------------------------------ */

// Joint plant: θ̈ = K·(u − load) − c·θ̇, u in volts (±12 V); gravity needs +2 V to hold.
const PLANT = { K: 5, c: 1, G: 2, UMAX: 12 };
const T_END = 8, T_DIST = 4.5, TARGET = 10;
const DT_IN = 0.001; // 1 kHz inner loop / physics
const OUTER_EVERY = 10; // 100 Hz outer loop

function simulate(mode, p) {
  let th = 0, w = 0, vref = 0, iv = 0, ip = 0, u = 0, prevTh = 0;
  const out = [];
  const n = Math.round(T_END / DT_IN);
  for (let k = 0; k <= n; k++) {
    const t = k * DT_IN;
    const load = PLANT.G + (t >= T_DIST ? p.dist : 0);
    if (mode === "single") {
      if (k % OUTER_EVERY === 0) {
        const dt = DT_IN * OUTER_EVERY;
        const e = TARGET - th;
        const dth = (th - prevTh) / dt; // derivative on measurement
        prevTh = th;
        const cand = ip + e * dt;
        if (Math.abs(p.kp * e + p.ki * cand - p.kd * dth) <= PLANT.UMAX) ip = cand; // anti-windup
        u = Math.max(-PLANT.UMAX, Math.min(PLANT.UMAX, p.kp * e + p.ki * ip - p.kd * dth));
      }
    } else {
      if (k % OUTER_EVERY === 0) {
        const raw = p.kpPos * (TARGET - th);
        vref = p.clamp ? Math.max(-p.vmax, Math.min(p.vmax, raw)) : raw;
      }
      const ev = vref - w;
      const uff = p.ff ? PLANT.G : 0;
      const cand = iv + ev * DT_IN;
      if (Math.abs(uff + p.kpVel * ev + p.kiVel * cand) <= PLANT.UMAX) iv = cand;
      u = Math.max(-PLANT.UMAX, Math.min(PLANT.UMAX, uff + p.kpVel * ev + p.kiVel * iv));
    }
    const a = PLANT.K * (u - load) - PLANT.c * w;
    w += a * DT_IN;
    th += w * DT_IN;
    if (k % 20 === 0) out.push({ t, th, w, u, vref });
  }
  return out;
}

function metrics(tr) {
  const peakW = Math.max(...tr.map((s) => Math.abs(s.w)));
  const before = tr.filter((s) => s.t < T_DIST);
  const after = tr.filter((s) => s.t >= T_DIST);
  const dip = Math.max(0, ...after.map((s) => TARGET - s.th));
  const overshoot = Math.max(0, ...before.map((s) => s.th - TARGET));
  const reach = before.find((s) => Math.abs(s.th - TARGET) < 0.2);
  return { peakW, dip, overshoot, reach: reach ? reach.t : null };
}

function BlockDiagram({ cur, single }) {
  const box = (x, y, w, label, sub, color = C.ink) => (
    <g>
      <rect x={x} y={y - 16} width={w} height={32} rx={6} fill={C.card} stroke={color} strokeWidth={1.6} />
      <text x={x + w / 2} y={y - 1} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.fg}>
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + 11} textAnchor="middle" fontSize={9.5} fill={C.muted}>
          {sub}
        </text>
      )}
    </g>
  );
  const sum = (x, y) => (
    <g>
      <circle cx={x} cy={y} r={9} fill={C.card} stroke={C.ink} strokeWidth={1.4} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill={C.fg}>
        Σ
      </text>
    </g>
  );
  const arrow = (x1, y1, x2, y2, color = C.muted, label) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} markerEnd="url(#cas-head)" />
      {label && (
        <text x={(x1 + x2) / 2} y={y1 - 6} textAnchor="middle" fontSize={10} fill={color}>
          {label}
        </text>
      )}
    </g>
  );
  const y1 = 40, y2 = 150;
  return (
    <svg viewBox="0 0 600 205" className="w-full font-mono">
      <defs>
        <marker id="cas-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      <text x={4} y={12} fontSize={10} fill={C.bad} fontWeight={700}>
        SINGLE LOOP · 100 Hz
      </text>
      {arrow(4, y1, 66, y1, C.muted, "θ*")}
      {sum(76, y1)}
      {arrow(85, y1, 150, y1, C.muted, `e=${(TARGET - single.th).toFixed(1)}`)}
      {box(150, y1, 110, "PID", "Kp, Ki, Kd", C.bad)}
      {arrow(260, y1, 360, y1, C.bad, `u=${single.u.toFixed(1)} V`)}
      {box(360, y1, 100, "Motor + arm", "θ̈ = 5(u−load)−θ̇")}
      {arrow(460, y1, 590, y1, C.muted, `θ=${single.th.toFixed(2)}`)}
      <polyline points={`540,${y1} 540,${y1 + 32} 76,${y1 + 32} 76,${y1 + 11}`} fill="none" stroke={C.muted} strokeWidth={1.2} strokeDasharray="4 3" markerEnd="url(#cas-head)" />

      <text x={4} y={y2 - 40} fontSize={10} fill={C.active} fontWeight={700}>
        CASCADE · outer 100 Hz → inner 1 kHz
      </text>
      {arrow(4, y2, 34, y2, C.muted, "θ*")}
      {sum(44, y2)}
      {box(64, y2, 74, "P_pos", "100 Hz", C.active)}
      {arrow(53, y2, 64, y2)}
      {arrow(138, y2, 210, y2, C.active, `ω*=${cur.vref.toFixed(1)}`)}
      {sum(220, y2)}
      {box(240, y2, 80, "PI_vel", "1 kHz", C.active)}
      {arrow(229, y2, 240, y2)}
      {sum(346, y2)}
      {arrow(320, y2, 337, y2)}
      <text x={346} y={y2 - 24} textAnchor="middle" fontSize={10} fill={C.ok}>
        u_FF
      </text>
      {arrow(346, y2 - 20, 346, y2 - 10, C.ok)}
      {arrow(355, y2, 400, y2, C.active, `${cur.u.toFixed(1)} V`)}
      {box(400, y2, 90, "Motor + arm", "")}
      {arrow(490, y2, 590, y2, C.muted, `θ=${cur.th.toFixed(2)}`)}
      <polyline points={`505,${y2} 505,${y2 + 26} 220,${y2 + 26} 220,${y2 + 11}`} fill="none" stroke={C.purple} strokeWidth={1.2} strokeDasharray="4 3" markerEnd="url(#cas-head)" />
      <text x={360} y={y2 + 38} fontSize={10} fill={C.purple} textAnchor="middle">
        ω = {cur.w.toFixed(2)} rad/s (fast inner feedback)
      </text>
      <polyline points={`560,${y2} 560,${y2 + 48} 44,${y2 + 48} 44,${y2 + 11}`} fill="none" stroke={C.muted} strokeWidth={1.2} strokeDasharray="4 3" markerEnd="url(#cas-head)" />
    </svg>
  );
}

function CascadeTab() {
  const [p, setP] = useState({ kp: 3, ki: 0.5, kd: 1.2, kpPos: 2, vmax: 5, clamp: true, kpVel: 1.5, kiVel: 2, ff: true, dist: 4 });
  const set = (k) => (v) => setP((o) => ({ ...o, [k]: v }));
  const [playing, setPlaying] = useState(false);
  const [time, setTimeState] = useState(T_END);
  const tRef = useRef(T_END);
  const setTime = (t) => {
    tRef.current = t;
    setTimeState(t);
  };
  const single = useMemo(() => simulate("single", p), [p]);
  const cas = useMemo(() => simulate("cascade", p), [p]);
  useAnimationFrame((dt) => {
    const nt = Math.min(T_END, tRef.current + dt);
    if (nt >= T_END) setPlaying(false);
    setTime(nt);
  }, playing);

  const idx = Math.min(single.length - 1, Math.round(time / (DT_IN * 20)));
  const ms = metrics(single), mc = metrics(cas);
  const upto = (tr) => tr.slice(0, idx + 1);
  const xd = [0, T_END];
  const dist = time >= T_DIST;

  return (
    <div className="space-y-4">
      <Stage className="p-2">
        <BlockDiagram cur={cas[idx]} single={single[idx]} />
      </Stage>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Joint position θ (rad) — payload dropped at t = {T_DIST} s</div>
            <LinePlot
              height={170}
              xDomain={xd}
              yDomain={[0, 12]}
              hLines={[{ y: TARGET, color: C.ok }]}
              series={[
                { data: upto(single).map((s) => [s.t, s.th]), color: C.bad, width: 2 },
                { data: upto(cas).map((s) => [s.t, s.th]), color: C.active, width: 2.2 },
              ]}
            />
          </Stage>
          <Stage className="p-2">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Velocity ω (rad/s) and cascade command ω*</div>
            <LinePlot
              height={150}
              xDomain={xd}
              hLines={p.clamp ? [{ y: p.vmax, color: C.warn }] : []}
              series={[
                { data: upto(single).map((s) => [s.t, s.w]), color: C.bad, width: 1.6 },
                { data: upto(cas).map((s) => [s.t, s.vref]), color: C.purple, width: 1.4, dash: "5 4" },
                { data: upto(cas).map((s) => [s.t, s.w]), color: C.active, width: 2 },
              ]}
              xLabel="time (s)"
            />
          </Stage>
          <Legend
            items={[
              [C.bad, "Single-loop PID"],
              [C.active, "Cascade P → PI"],
              [C.purple, "ω* (outer-loop output)"],
              [C.warn, "Speed limit"],
              [C.ok, "Target θ* = 10 rad"],
            ]}
          />
          <Narration tone={dist ? "warn" : "default"}>
            {!dist
              ? `The single loop maps a 10 rad error straight to volts and saturates, peaking at ${ms.peakW.toFixed(1)} rad/s. The cascade's outer loop asks for at most ${p.clamp ? `${p.vmax} rad/s` : "unlimited speed"} and the fast inner loop tracks it (peak ${mc.peakW.toFixed(1)} rad/s).`
              : `A ${p.dist} V payload drops at t = ${T_DIST} s. The 1 kHz velocity loop sees the slowdown immediately and pushes back: the cascade sags only ${mc.dip.toFixed(2)} rad vs ${ms.dip.toFixed(2)} rad for the single loop.${p.ff ? " Gravity feedforward supplies the known 2 V with zero lag." : ""}`}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Cascade (outer P → inner PI)">
            <SliderControl label="Outer Kp_pos" value={p.kpPos} min={0.5} max={6} step={0.1} onChange={set("kpPos")} format={(v) => `${v.toFixed(1)} (rad/s)/rad`} />
            <SliderControl label="Speed limit ω_max" value={p.vmax} min={1} max={15} step={0.5} onChange={set("vmax")} format={(v) => `${v} rad/s`} disabled={!p.clamp} />
            <SwitchControl label="Enable velocity clamp" checked={p.clamp} onChange={set("clamp")} />
            <SliderControl label="Inner Kp_vel" value={p.kpVel} min={0.2} max={5} step={0.1} onChange={set("kpVel")} format={(v) => `${v.toFixed(1)} V/(rad/s)`} />
            <SliderControl label="Inner Ki_vel" value={p.kiVel} min={0} max={10} step={0.25} onChange={set("kiVel")} format={(v) => v.toFixed(2)} />
            <SwitchControl label="Gravity feedforward u_FF = +2 V" checked={p.ff} onChange={set("ff")} />
          </Panel>
          <Panel title="Single loop PID">
            <SliderControl label="Kp" value={p.kp} min={0.5} max={8} step={0.1} onChange={set("kp")} format={(v) => v.toFixed(1)} />
            <SliderControl label="Ki" value={p.ki} min={0} max={3} step={0.05} onChange={set("ki")} format={(v) => v.toFixed(2)} />
            <SliderControl label="Kd" value={p.kd} min={0} max={3} step={0.05} onChange={set("kd")} format={(v) => v.toFixed(2)} />
          </Panel>
          <Panel title="Disturbance">
            <SliderControl label="Payload load at t = 4.5 s" value={p.dist} min={0} max={6} step={0.5} onChange={set("dist")} format={(v) => `${v} V`} />
          </Panel>
        </div>
      </Split>
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
          <Button
            size="sm"
            className="w-24"
            onClick={() => {
              if (!playing && tRef.current >= T_END) setTime(0);
              setPlaying((x) => !x);
            }}
          >
            {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Replay"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              setTime(0);
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">t = {time.toFixed(2)} s</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right text-viz-bad">Single</TableHead>
              <TableHead className="text-right text-viz-active">Cascade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Peak speed (rad/s)", ms.peakW, mc.peakW],
              ["Overshoot (rad)", ms.overshoot, mc.overshoot],
              ["Reached ±0.2 rad at (s)", ms.reach, mc.reach],
              ["Sag after payload (rad)", ms.dip, mc.dip],
            ].map(([k, a, b]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5 text-[12.5px]">{k}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] tabular-nums">{a === null ? "—" : a.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] tabular-nums">{b === null ? "—" : b.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mode B: LQR on a double-integrator cart (chapter's Python example)  */
/* ------------------------------------------------------------------ */

const LDT = 0.05, MASS = 2;
const A = [
  [1, LDT],
  [0, 1],
];
const Bm = [(0.5 * LDT * LDT) / MASS, LDT / MASS];

/** Iterate the discrete Riccati equation P = Q + AᵀPA − AᵀPB(R + BᵀPB)⁻¹BᵀPA; return K = (R + BᵀPB)⁻¹BᵀPA. */
function dlqr(q1, q2, R) {
  let P = [
    [q1, 0],
    [0, q2],
  ];
  let K = [0, 0], iters = 0;
  for (; iters < 20000; iters++) {
    const PB = [P[0][0] * Bm[0] + P[0][1] * Bm[1], P[1][0] * Bm[0] + P[1][1] * Bm[1]];
    const s = R + Bm[0] * PB[0] + Bm[1] * PB[1];
    const PA = [
      [P[0][0] * A[0][0] + P[0][1] * A[1][0], P[0][0] * A[0][1] + P[0][1] * A[1][1]],
      [P[1][0] * A[0][0] + P[1][1] * A[1][0], P[1][0] * A[0][1] + P[1][1] * A[1][1]],
    ];
    const BPA = [Bm[0] * PA[0][0] + Bm[1] * PA[1][0], Bm[0] * PA[0][1] + Bm[1] * PA[1][1]];
    K = [BPA[0] / s, BPA[1] / s];
    const Pn = [
      [0, 0],
      [0, 0],
    ];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) Pn[r][c] = (r === c ? (r ? q2 : q1) : 0) + A[0][r] * PA[0][c] + A[1][r] * PA[1][c] - (BPA[r] * BPA[c]) / s;
    const diff = Math.abs(Pn[0][0] - P[0][0]) + Math.abs(Pn[0][1] - P[0][1]) + Math.abs(Pn[1][1] - P[1][1]);
    P = Pn;
    if (diff < 1e-9 * (1 + Math.abs(P[0][0]))) break;
  }
  // closed-loop eigenvalues of A − BK
  const M = [
    [A[0][0] - Bm[0] * K[0], A[0][1] - Bm[0] * K[1]],
    [A[1][0] - Bm[1] * K[0], A[1][1] - Bm[1] * K[1]],
  ];
  const tr = M[0][0] + M[1][1], det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const disc = (tr * tr) / 4 - det;
  const eig = disc >= 0 ? [Math.abs(tr / 2 + Math.sqrt(disc)), Math.abs(tr / 2 - Math.sqrt(disc))] : [Math.sqrt(det), Math.sqrt(det)];
  return { K, iters, eig, complex: disc < 0 };
}

const freshCart = () => ({ t: 0, acc: 0, x: 3, v: 0, u: 0, hist: [{ t: 0, x: 3, v: 0, u: 0 }] });

function LqrTab() {
  const [lq1, setLq1] = useState(Math.log10(50));
  const [lq2, setLq2] = useState(Math.log10(5));
  const [lr, setLr] = useState(Math.log10(0.5));
  const [playing, setPlaying] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef(freshCart());
  const q1 = 10 ** lq1, q2 = 10 ** lq2, R = 10 ** lr;
  const lqr = useMemo(() => dlqr(q1, q2, R), [q1, q2, R]);
  const [k1, k2] = lqr.K;

  useAnimationFrame((dt) => {
    const S = sim.current;
    S.acc += dt;
    while (S.acc >= LDT) {
      S.acc -= LDT;
      S.u = -(k1 * S.x + k2 * S.v);
      [S.x, S.v] = [S.x + LDT * S.v + Bm[0] * S.u, S.v + Bm[1] * S.u];
      S.t += LDT;
      S.hist.push({ t: S.t, x: S.x, v: S.v, u: S.u });
      if (S.hist.length > 240) S.hist.shift();
    }
    setFrame((f) => f + 1);
  }, playing);

  const S = sim.current;
  const stable = Math.max(...lqr.eig) < 1;
  const fx = (n) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2));
  const t1 = Math.max(S.t, 12), t0 = t1 - 12;

  // cart drawing
  const W = 560, H = 120, track = [30, W - 30], sx = (x) => (track[0] + track[1]) / 2 + x * 55;
  const cx = sx(Math.max(-4.6, Math.min(4.6, S.x)));
  const uLen = Math.max(-120, Math.min(120, S.u * 3));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="active">
          K = [{fx(k1)}, {fx(k2)}]
        </Badge>
        <Badge variant={stable ? "success" : "danger"}>
          {stable ? "Stable" : "Unstable"}: |λ(A−BK)| = {lqr.eig.map((e) => e.toFixed(3)).join(", ")}
        </Badge>
        <Badge variant="outline">{lqr.complex ? "Complex poles → some overshoot" : "Real poles → no oscillation"}</Badge>
        <Badge variant="outline">Riccati converged in {lqr.iters} iterations</Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
              <defs>
                {[C.fg, C.active, C.purple].map((col, i) => (
                  <marker key={i} id={`lqr-head-${i}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={col} />
                  </marker>
                ))}
              </defs>
              <line x1={track[0]} x2={track[1]} y1={92} y2={92} stroke={C.ink} strokeWidth={2} />
              {[-4, -2, 0, 2, 4].map((m) => (
                <g key={m}>
                  <line x1={sx(m)} x2={sx(m)} y1={92} y2={98} stroke={C.muted} />
                  <text x={sx(m)} y={110} fontSize={10} textAnchor="middle" fill={m === 0 ? C.ok : C.muted}>
                    {m} m
                  </text>
                </g>
              ))}
              <line x1={sx(0)} x2={sx(0)} y1={30} y2={92} stroke={C.ok} strokeDasharray="4 3" />
              <rect x={cx - 26} y={58} width={52} height={26} rx={5} fill={C.active} opacity={0.9} />
              <circle cx={cx - 15} cy={88} r={5} fill={C.ink} />
              <circle cx={cx + 15} cy={88} r={5} fill={C.ink} />
              {Math.abs(uLen) > 2 && <line x1={cx} x2={cx + uLen} y1={50} y2={50} stroke={C.fg} strokeWidth={3} markerEnd="url(#lqr-head-0)" />}
              {Math.abs(k1 * S.x * 3) > 2 && <line x1={cx} x2={cx + Math.max(-120, Math.min(120, -k1 * S.x * 3))} y1={36} y2={36} stroke={C.active} strokeWidth={2} markerEnd="url(#lqr-head-1)" />}
              {Math.abs(k2 * S.v * 3) > 2 && <line x1={cx} x2={cx + Math.max(-120, Math.min(120, -k2 * S.v * 3))} y1={24} y2={24} stroke={C.purple} strokeWidth={2} markerEnd="url(#lqr-head-2)" />}
              <text x={8} y={14} fontSize={10} fill={C.muted}>
                arrows: u (black) = −k₁x (cyan) + −k₂ẋ (violet)
              </text>
            </svg>
          </Stage>
          <Stage className="p-2">
            <LinePlot
              height={170}
              xDomain={[t0, t1]}
              series={[
                { data: S.hist.map((h) => [h.t, h.x]), color: C.active, width: 2.2 },
                { data: S.hist.map((h) => [h.t, h.v]), color: C.purple, width: 1.6 },
                { data: S.hist.map((h) => [h.t, h.u / 10]), color: C.warn, width: 1.4, dash: "5 4" },
              ]}
              xLabel="time (s)"
            />
          </Stage>
          <Legend
            items={[
              [C.active, "position x (m)"],
              [C.purple, "velocity ẋ (m/s)"],
              [C.warn, "force u / 10 (N)"],
            ]}
          />
          <Narration tone={stable ? "default" : "bad"}>
            u = −Kx = −({fx(k1)}·{S.x.toFixed(2)}) − ({fx(k2)}·{S.v.toFixed(2)}) = {S.u.toFixed(2)} N. Raising Q_pos makes position errors expensive (bigger k₁, faster, harder push); raising R makes force expensive
            (smaller gains, gentler, slower). Q_vel adds damping. LQR picks the K that minimises Σ(xᵀQx + uᵀRu).
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Cost weights (log scale)">
            <Tip content="Bryson's rule: Q_ii = 1 / (max acceptable error)². Q_pos = 50 ⇔ ~0.14 m acceptable.">
              <div>
                <SliderControl label="Q_pos (x penalty)" value={lq1} min={-1} max={3} step={0.05} onChange={setLq1} format={(v) => fx(10 ** v)} />
              </div>
            </Tip>
            <Tip content="Penalising velocity adds damping: the cart arrives more slowly but without overshoot.">
              <div>
                <SliderControl label="Q_vel (ẋ penalty)" value={lq2} min={-1} max={2} step={0.05} onChange={setLq2} format={(v) => fx(10 ** v)} />
              </div>
            </Tip>
            <Tip content="Bryson's rule: R = 1 / u_max². Larger R = cheaper battery, gentler motor.">
              <div>
                <SliderControl label="R (effort penalty)" value={lr} min={-2} max={1} step={0.05} onChange={setLr} format={(v) => fx(10 ** v)} />
              </div>
            </Tip>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setLq1(Math.log10(50));
                setLq2(Math.log10(5));
                setLr(Math.log10(0.5));
              }}
            >
              Chapter values Q = diag(50, 5), R = 0.5
            </Button>
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Q_ii</TableHead>
                <TableHead className="text-right">k_i</TableHead>
                <TableHead className="text-right">−k_i·x_i</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["x", q1, k1, S.x],
                ["ẋ", q2, k2, S.v],
              ].map(([n, q, k, x]) => (
                <TableRow key={n}>
                  <TableCell className="py-1.5 font-mono text-[12.5px]">
                    {n} = {x.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{fx(q)}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold">{fx(k)}</TableCell>
                  <TableCell className={cn("py-1.5 text-right font-mono text-[12.5px]", n === "x" ? "text-viz-active" : "text-viz-purple")}>{(-k * x).toFixed(2)} N</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <StatGrid cols={2}>
            <Stat label="x" value={`${S.x.toFixed(3)} m`} tone="active" />
            <Stat label="u" value={`${S.u.toFixed(2)} N`} tone="warn" />
          </StatGrid>
        </div>
      </Split>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
        <Button size="sm" className="w-24" onClick={() => setPlaying((x) => !x)}>
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sim.current.v += 1.5;
            setFrame((f) => f + 1);
          }}
        >
          <Hand /> Poke cart (+1.5 m/s)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            sim.current = freshCart();
            setPlaying(false);
            setFrame((f) => f + 1);
          }}
        >
          <RotateCcw /> Reset (x = 3 m)
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">t = {S.t.toFixed(2)} s · Δt = 0.05 s, m = 2 kg</span>
      </div>
    </div>
  );
}

export default function CascadeLab() {
  return (
    <LabShell
      title="Cascaded Control & LQR Explorer"
      description="Nest a fast velocity loop inside a slow position loop, add feedforward, then let the Riccati equation choose optimal state-feedback gains."
      badges={["P → PI cascade", "Feedforward", "u = −Kx"]}
    >
      <Tabs defaultValue="cascade">
        <TabsList>
          <TabsTrigger value="cascade">Single loop vs cascade</TabsTrigger>
          <TabsTrigger value="lqr">State-space LQR (cart)</TabsTrigger>
        </TabsList>
        <TabsContent value="cascade">
          <CascadeTab />
        </TabsContent>
        <TabsContent value="lqr">
          <LqrTab />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
