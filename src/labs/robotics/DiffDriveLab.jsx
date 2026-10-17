import { useRef, useState } from "react";
import { Pause, Play, RotateCcw, Trash2, Undo2, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, gauss, rng, svgPoint, useAnimationFrame, useSvgDrag } from "@/viz/kit";

const DT = 0.01; // 100 Hz physics + odometry
const TICKS_PER_REV = 1000;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const DEG = 180 / Math.PI;

/** Exact circular-arc pose update for wheel travel dsL, dsR (chapter §5.3). */
function arcStep(p, dsL, dsR, L) {
  const ds = (dsR + dsL) / 2, dth = (dsR - dsL) / L;
  if (Math.abs(dth) < 1e-9) return { x: p.x + ds * Math.cos(p.th), y: p.y + ds * Math.sin(p.th), th: p.th };
  const R = ds / dth;
  return { x: p.x + R * (Math.sin(p.th + dth) - Math.sin(p.th)), y: p.y - R * (Math.cos(p.th + dth) - Math.cos(p.th)), th: wrap(p.th + dth) };
}
/** Odometry update: Euler (old heading) or Midpoint (θ + Δθ/2). */
function odomStep(p, dsL, dsR, L, scheme) {
  const ds = (dsR + dsL) / 2, dth = (dsR - dsL) / L;
  const h = scheme === "euler" ? p.th : p.th + dth / 2;
  return { x: p.x + ds * Math.cos(h), y: p.y + ds * Math.sin(h), th: wrap(p.th + dth) };
}

/** Top-down differential-drive robot glyph in world metres. */
function Robot({ pose, L, r, toPx, s, color = C.ink, ghost = false, vL, vR, vecScale = 0 }) {
  const [X, Y] = toPx(pose.x, pose.y);
  const len = Math.max(L * 1.15, 0.25) * s, wid = L * s;
  const wl = Math.max(2 * r * s, 6), ww = Math.max(0.05 * s, 4);
  return (
    <g transform={`translate(${X} ${Y}) rotate(${-pose.th * DEG})`} opacity={ghost ? 0.5 : 1}>
      <rect x={-len / 2} y={-wid / 2} width={len} height={wid} rx={5} fill={C.card} stroke={color} strokeWidth={2} strokeDasharray={ghost ? "4 3" : undefined} />
      <rect x={-wl / 2} y={-wid / 2 - ww} width={wl} height={ww} rx={1.5} fill={color} />
      <rect x={-wl / 2} y={wid / 2} width={wl} height={ww} rx={1.5} fill={color} />
      <path d={`M ${len / 2 - 4} 0 L ${len / 2 - 14} -6 L ${len / 2 - 14} 6 Z`} fill={color} />
      {vecScale > 0 &&
        [
          [vR, wid / 2 + ww / 2, C.ok],
          [vL, -wid / 2 - ww / 2, C.warn],
        ].map(([v, yy, col], i) => (
          <line key={i} x1={0} y1={yy} x2={v * vecScale * s} y2={yy} stroke={col} strokeWidth={3} markerEnd={Math.abs(v) > 0.01 ? `url(#dd-head-${i})` : undefined} />
        ))}
    </g>
  );
}
function ArrowDefs() {
  return (
    <defs>
      {[C.ok, C.warn, C.active].map((col, i) => (
        <marker key={i} id={`dd-head-${i}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={col} />
        </marker>
      ))}
    </defs>
  );
}
const polyPts = (pts, toPx) => pts.map(([x, y]) => toPx(x, y).join(",")).join(" ");

function regime(vL, vR) {
  if (Math.abs(vL) < 1e-6 && Math.abs(vR) < 1e-6) return "Stopped";
  if (Math.abs(vL - vR) < 1e-6) return "Straight";
  if (Math.abs(vL + vR) < 1e-6) return "Spin in place";
  if (Math.abs(vL) < 1e-6 || Math.abs(vR) < 1e-6) return "Wheel pivot";
  return "Arc";
}

/* ------------------------------------------------------------------ */
/* Variant "odometry": ICC + encoder dead reckoning                    */
/* ------------------------------------------------------------------ */

const W = 560, H = 400;
const FIG8_HALF = (2 * Math.PI) / 0.5; // one full circle at ω = 0.5 rad/s

function freshOdo() {
  return {
    t: 0,
    acc: 0,
    truth: { x: 0, y: 0, th: 0 },
    odom: { x: 0, y: 0, th: 0 },
    encL: 0,
    encR: 0,
    dTicks: [0, 0],
    truthPath: [[0, 0]],
    odomPath: [[0, 0]],
    drift: [[0, 0]],
    rand: rng(11),
    box: [-2, -1.5, 2, 1.5],
  };
}

function OdometryLab() {
  const [wL, setWL] = useState(3.75);
  const [wR, setWR] = useState(6.25);
  const [L, setL] = useState(0.5);
  const [r, setR] = useState(0.1);
  const [slip, setSlip] = useState(4);
  const [scheme, setScheme] = useState("midpoint");
  const [program, setProgram] = useState("fig8");
  const [playing, setPlaying] = useState(false);
  const [, setTick] = useState(0);
  const sim = useRef(freshOdo());

  const commanded = (t) => {
    if (program !== "fig8") return [wL, wR];
    const sgn = Math.floor(t / FIG8_HALF) % 2 === 0 ? 1 : -1;
    const v = 0.5, w = 0.5 * sgn;
    return [(v - (w * L) / 2) / r, (v + (w * L) / 2) / r];
  };

  useAnimationFrame((dt) => {
    const S = sim.current;
    S.acc += dt;
    while (S.acc >= DT) {
      S.acc -= DT;
      const [cl, cr] = commanded(S.t);
      // encoders: integer tick counts
      const prevL = Math.floor(S.encL), prevR = Math.floor(S.encR);
      S.encL += (cl * DT * TICKS_PER_REV) / (2 * Math.PI);
      S.encR += (cr * DT * TICKS_PER_REV) / (2 * Math.PI);
      const dTL = Math.floor(S.encL) - prevL, dTR = Math.floor(S.encR) - prevR;
      S.dTicks = [dTL, dTR];
      const tick = (2 * Math.PI * r) / TICKS_PER_REV;
      // ground truth: the floor moves the robot a little more/less than the wheels turned (slip)
      const gL = r * cl * DT * (1 + (slip / 100) * gauss(S.rand));
      const gR = r * cr * DT * (1 + (slip / 100) * gauss(S.rand));
      S.truth = arcStep(S.truth, gL, gR, L);
      S.odom = odomStep(S.odom, dTL * tick, dTR * tick, L, scheme);
      S.t += DT;
      if (Math.round(S.t / DT) % 5 === 0) {
        S.truthPath.push([S.truth.x, S.truth.y]);
        S.odomPath.push([S.odom.x, S.odom.y]);
        S.drift.push([S.t, Math.hypot(S.truth.x - S.odom.x, S.truth.y - S.odom.y)]);
        if (S.truthPath.length > 3000) {
          S.truthPath.shift();
          S.odomPath.shift();
        }
        if (S.drift.length > 1500) S.drift.shift();
        for (const [x, y] of [
          [S.truth.x, S.truth.y],
          [S.odom.x, S.odom.y],
        ]) {
          S.box = [Math.min(S.box[0], x - 0.8), Math.min(S.box[1], y - 0.8), Math.max(S.box[2], x + 0.8), Math.max(S.box[3], y + 0.8)];
        }
      }
    }
    setTick((k) => k + 1);
  }, playing);

  const S = sim.current;
  const [cl, cr] = commanded(S.t);
  const vL = r * cl, vR = r * cr;
  const v = (vR + vL) / 2, om = (vR - vL) / L;
  const Rturn = Math.abs(vR - vL) < 1e-9 ? Infinity : ((L / 2) * (vR + vL)) / (vR - vL);
  const icc = Number.isFinite(Rturn) ? [S.truth.x - Rturn * Math.sin(S.truth.th), S.truth.y + Rturn * Math.cos(S.truth.th)] : null;
  const drift = Math.hypot(S.truth.x - S.odom.x, S.truth.y - S.odom.y);
  const headErr = wrap(S.odom.th - S.truth.th) * DEG;

  // fit view (box only grows until reset); include ICC when it is nearby
  let [x0, y0, x1, y1] = S.box;
  if (icc && Math.abs(Rturn) < 3) [x0, y0, x1, y1] = [Math.min(x0, icc[0] - 0.4), Math.min(y0, icc[1] - 0.4), Math.max(x1, icc[0] + 0.4), Math.max(y1, icc[1] + 0.4)];
  const s = Math.min((W - 30) / (x1 - x0), (H - 30) / (y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const toPx = (x, y) => [W / 2 + (x - cx) * s, H / 2 - (y - cy) * s];
  const gridStep = s > 90 ? 0.5 : s > 40 ? 1 : 2;

  const reset = () => {
    sim.current = freshOdo();
    setPlaying(false);
    setTick((k) => k + 1);
  };
  const manual = (fn) => (val) => {
    if (program === "fig8") {
      const [a, b] = commanded(S.t);
      setWL(a);
      setWR(b);
      setProgram(null);
    }
    fn(val);
  };
  const preset = (a, b) => {
    setProgram(null);
    setWL(a);
    setWR(b);
  };
  const injectSlip = () => {
    S.truth = { ...S.truth, th: wrap(S.truth.th + 2 / DEG) };
    setTick((k) => k + 1);
  };

  const ICCpx = icc ? toPx(icc[0], icc[1]) : null;
  const robotPx = toPx(S.truth.x, S.truth.y);
  const tele = [
    ["v_L, v_R", `${vL.toFixed(2)}, ${vR.toFixed(2)} m/s`, "Wheel ground speeds v = r·ω_wheel"],
    ["v", `${v.toFixed(3)} m/s`, "v = (v_R + v_L) / 2"],
    ["ω", `${om.toFixed(3)} rad/s`, "ω = (v_R − v_L) / L"],
    ["R", Number.isFinite(Rturn) ? `${Rturn.toFixed(3)} m` : "∞ (straight)", "R = (L/2)·(v_R + v_L)/(v_R − v_L)"],
    ["Δticks L, R", `${S.dTicks[0]}, ${S.dTicks[1]} per 10 ms`, `Encoder counts this tick (${TICKS_PER_REV} ticks/rev → ${((2 * Math.PI * r * 1000) / TICKS_PER_REV).toFixed(3)} mm/tick)`],
    ["true pose", `(${S.truth.x.toFixed(2)}, ${S.truth.y.toFixed(2)}, ${(S.truth.th * DEG).toFixed(1)}°)`, "Ground truth, including slip"],
    ["odom pose", `(${S.odom.x.toFixed(2)}, ${S.odom.y.toFixed(2)}, ${(S.odom.th * DEG).toFixed(1)}°)`, `Dead-reckoned from encoder ticks with ${scheme === "euler" ? "Euler" : "midpoint"} integration`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="active">Regime: {regime(vL, vR)}</Badge>
        {program === "fig8" && <Badge variant="purple">Figure-8 program</Badge>}
        <Badge variant={drift > 0.5 ? "danger" : drift > 0.1 ? "warning" : "success"}>Odometry drift {drift.toFixed(2)} m</Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
              <ArrowDefs />
              {Array.from({ length: Math.ceil((x1 - x0) / gridStep) + 3 }, (_, i) => Math.floor(x0 / gridStep + i - 1) * gridStep).map((gx) => (
                <line key={`gx${gx}`} x1={toPx(gx, 0)[0]} x2={toPx(gx, 0)[0]} y1={0} y2={H} stroke={C.grid} opacity={gx === 0 ? 1 : 0.6} />
              ))}
              {Array.from({ length: Math.ceil((y1 - y0) / gridStep) + 3 }, (_, i) => Math.floor(y0 / gridStep + i - 1) * gridStep).map((gy) => (
                <line key={`gy${gy}`} y1={toPx(0, gy)[1]} y2={toPx(0, gy)[1]} x1={0} x2={W} stroke={C.grid} opacity={gy === 0 ? 1 : 0.6} />
              ))}
              <polyline fill="none" stroke={C.ok} strokeWidth={2.2} points={polyPts(S.truthPath, toPx)} />
              <polyline fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="6 4" points={polyPts(S.odomPath, toPx)} />
              {ICCpx && Math.abs(Rturn) < 25 && (
                <g>
                  <line x1={ICCpx[0]} y1={ICCpx[1]} x2={robotPx[0]} y2={robotPx[1]} stroke={C.active} strokeDasharray="3 4" />
                  <circle cx={ICCpx[0]} cy={ICCpx[1]} r={Math.abs(Rturn) * s} fill="none" stroke={C.active} strokeOpacity={0.25} strokeDasharray="2 5" />
                  <circle cx={ICCpx[0]} cy={ICCpx[1]} r={6} fill={C.active} />
                  <text x={ICCpx[0] + 9} y={ICCpx[1] - 8} fontSize={11} fill={C.active}>
                    ICC (R = {Rturn.toFixed(2)} m)
                  </text>
                </g>
              )}
              <Robot pose={S.odom} L={L} r={r} toPx={toPx} s={s} color={C.warn} ghost />
              <Robot pose={S.truth} L={L} r={r} toPx={toPx} s={s} vL={vL} vR={vR} vecScale={0.6} />
              <text x={10} y={H - 10} fontSize={10.5} fill={C.muted}>
                grid = {gridStep} m · t = {S.t.toFixed(1)} s
              </text>
            </svg>
          </Stage>
          <Legend
            items={[
              [C.ok, "True path / v_R vector"],
              [C.warn, "Dead-reckoned odometry / v_L vector"],
              [C.active, "ICC & turn radius"],
            ]}
          />
          <Narration tone={drift > 0.5 ? "warn" : "default"}>
            {regime(vL, vR) === "Straight"
              ? "Equal wheel speeds: ω = 0, the ICC is at infinity and the robot drives straight. "
              : regime(vL, vR) === "Spin in place"
                ? "Opposite wheel speeds: v = 0, the ICC sits at the axle centre and the robot spins in place. "
                : `Both wheels orbit the ICC: v = (v_R + v_L)/2 = ${v.toFixed(2)} m/s, ω = (v_R − v_L)/L = ${om.toFixed(2)} rad/s, R = v/ω = ${Number.isFinite(Rturn) ? Rturn.toFixed(2) : "∞"} m. `}
            Odometry only sees encoder ticks; every slip leaves a permanent heading error (now {headErr.toFixed(1)}°) that is projected into x, y on every later tick — drift {drift.toFixed(2)} m after {S.t.toFixed(0)} s.
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Wheels">
            <SliderControl label="ω_L left wheel" value={program === "fig8" ? cl : wL} min={-15} max={15} step={0.25} onChange={manual(setWL)} format={(x) => `${x.toFixed(2)} rad/s`} />
            <SliderControl label="ω_R right wheel" value={program === "fig8" ? cr : wR} min={-15} max={15} step={0.25} onChange={manual(setWR)} format={(x) => `${x.toFixed(2)} rad/s`} />
            <SliderControl label="Track width L" value={L} min={0.3} max={1} step={0.05} onChange={setL} format={(x) => `${x.toFixed(2)} m`} />
            <SliderControl label="Wheel radius r" value={r} min={0.05} max={0.2} step={0.01} onChange={setR} format={(x) => `${x.toFixed(2)} m`} />
            <div className="flex flex-wrap gap-1.5">
              <Button variant={program === "fig8" ? "secondary" : "outline"} size="xs" onClick={() => setProgram("fig8")}>
                Figure-8
              </Button>
              <Button variant="outline" size="xs" onClick={() => preset(5, 5)}>
                Straight
              </Button>
              <Button variant="outline" size="xs" onClick={() => preset(-5, 5)}>
                Spin in place
              </Button>
              <Button variant="outline" size="xs" onClick={() => preset(0, 8)}>
                Pivot left wheel
              </Button>
              <Button variant="outline" size="xs" onClick={() => preset(5, 15)}>
                Gentle arc
              </Button>
            </div>
          </Panel>
          <Panel title="Encoders & odometry">
            <SliderControl label="Encoder slip noise" value={slip} min={0} max={10} step={0.5} onChange={setSlip} format={(x) => `${x.toFixed(1)} % per tick`} />
            <Select value={scheme} onValueChange={setScheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="midpoint">Midpoint odometry (θ + Δθ/2)</SelectItem>
                <SelectItem value="euler">Euler odometry (old θ)</SelectItem>
              </SelectContent>
            </Select>
          </Panel>
          <StatGrid cols={2}>
            <Stat label="Drift" value={`${drift.toFixed(3)} m`} tone={drift > 0.5 ? "bad" : "warn"} hint="‖true position − odometry position‖" />
            <Stat label="Heading err" value={`${headErr.toFixed(2)}°`} tone="warn" hint="θ_odom − θ_true; it is what turns into lateral drift" />
          </StatGrid>
        </div>
      </Split>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
        <Button size="sm" className="w-24" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Drive"}
        </Button>
        <Button variant="destructive" size="sm" onClick={injectSlip}>
          <Zap /> +2° slip
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw /> Reset arena
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Stage className="p-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Position drift ‖true − odom‖ (m)</div>
          <LinePlot height={150} series={[{ data: S.drift, color: C.warn }]} xLabel="time (s)" />
        </Stage>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Telemetry</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tele.map(([k, val, hint]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5 font-mono text-[12px]">
                  <Tip content={hint}>
                    <span className="cursor-help underline decoration-dotted underline-offset-2">{k}</span>
                  </Tip>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12px] tabular-nums">{val}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant "waypoints": closed-loop waypoint follower                   */
/* ------------------------------------------------------------------ */

const AW = 10, AH = 7, SC = 56; // arena metres, px per metre
const CHAPTER_WPS = [
  [4, 5],
  [8, 5],
  [8, 1.5],
  [2, 2],
];
const START = { x: 1, y: 1, th: 0 };
const OMEGA_MAX = 2.0, CAPTURE = 0.25, KP_DIST = 1.0;

function freshMission() {
  return { t: 0, acc: 0, pose: { ...START }, idx: 0, legFrom: [START.x, START.y], path: [[START.x, START.y]], cte: [[0, 0]], cmd: { v: 0, w: 0, e: 0, d: 0, look: null }, est: [START.x, START.y], rand: rng(5), done: false, cteMax: 0, cteSq: 0, n: 0 };
}

/** Signed cross-track error and along-track progress of p on segment a→b. */
function legGeometry(a, b, p) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1e-9;
  const ux = dx / len, uy = dy / len;
  const along = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy;
  const cte = -(p[0] - a[0]) * uy + (p[1] - a[1]) * ux;
  return { along, cte, len, ux, uy };
}

function WaypointLab() {
  const [wps, setWps] = useState(CHAPTER_WPS);
  const [ctrl, setCtrl] = useState("los");
  const [kpH, setKpH] = useState(2.5);
  const [look, setLook] = useState(0.8);
  const [vmax, setVmax] = useState(1.5);
  const [noise, setNoise] = useState(0);
  const [cosScale, setCosScale] = useState(true);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [, setTick] = useState(0);
  const sim = useRef(freshMission());
  const toPx = (x, y) => [x * SC, (AH - y) * SC];
  const toWorld = (px, py) => [Math.max(0.2, Math.min(AW - 0.2, px / SC)), Math.max(0.2, Math.min(AH - 0.2, AH - py / SC))];
  const { svgProps, startDrag } = useSvgDrag((i, x, y) => setWps((w) => w.map((p, k) => (k === i ? toWorld(x, y) : p))));

  useAnimationFrame((dt) => {
    const S = sim.current;
    S.acc += dt;
    while (S.acc >= DT && !S.done) {
      S.acc -= DT;
      // 10 Hz position fix (truth + optional noise) feeds the controller
      if (Math.round(S.t / DT) % 10 === 0) S.est = [S.pose.x + noise * gauss(S.rand), S.pose.y + noise * gauss(S.rand)];
      const goal = wps[S.idx];
      if (!goal) {
        S.done = true;
        break;
      }
      const est = noise > 0 ? S.est : [S.pose.x, S.pose.y];
      const geo = legGeometry(S.legFrom, goal, est);
      const d = Math.hypot(goal[0] - est[0], goal[1] - est[1]);
      if (d < CAPTURE || (ctrl === "pp" && geo.along > geo.len)) {
        S.legFrom = goal;
        S.idx += 1;
        if (S.idx >= wps.length) {
          if (loop && wps.length > 1) S.idx = 0;
          else {
            S.done = true;
            S.cmd = { ...S.cmd, v: 0, w: 0 };
            break;
          }
        }
        continue;
      }
      let aim = goal;
      if (ctrl === "pp") {
        const s = Math.min(Math.max(geo.along, 0) + look, geo.len);
        aim = [S.legFrom[0] + geo.ux * s, S.legFrom[1] + geo.uy * s];
      }
      const e = wrap(Math.atan2(aim[1] - est[1], aim[0] - est[0]) - S.pose.th);
      let v, w;
      if (ctrl === "pp") {
        const Ld = Math.max(Math.hypot(aim[0] - est[0], aim[1] - est[1]), 0.05);
        v = Math.min(vmax, KP_DIST * d) * (cosScale ? Math.max(0, Math.cos(e)) : 1);
        w = Math.max(-OMEGA_MAX, Math.min(OMEGA_MAX, (2 * Math.sin(e) * Math.max(v, 0.2)) / Ld)); // pure pursuit: ω = v·κ, κ = 2 sin α / L_d
      } else {
        v = Math.max(0, Math.min(vmax, KP_DIST * d * (cosScale ? Math.max(0, Math.cos(e)) : 1)));
        w = Math.max(-OMEGA_MAX, Math.min(OMEGA_MAX, kpH * e));
      }
      S.pose = { x: S.pose.x + v * Math.cos(S.pose.th + (w * DT) / 2) * DT, y: S.pose.y + v * Math.sin(S.pose.th + (w * DT) / 2) * DT, th: wrap(S.pose.th + w * DT) };
      S.t += DT;
      const cte = legGeometry(S.legFrom, goal, [S.pose.x, S.pose.y]).cte;
      S.cmd = { v, w, e, d, look: ctrl === "pp" ? aim : null, cte };
      S.cteMax = Math.max(S.cteMax, Math.abs(cte));
      S.cteSq += cte * cte;
      S.n += 1;
      if (S.n % 5 === 0) {
        S.path.push([S.pose.x, S.pose.y]);
        S.cte.push([S.t, cte]);
        if (S.path.length > 4000) S.path.shift();
        if (S.cte.length > 600) S.cte.shift();
      }
      if (S.t > 300) S.done = true;
    }
    if (S.done) setPlaying(false);
    setTick((k) => k + 1);
  }, playing);

  const S = sim.current;
  const reset = () => {
    sim.current = freshMission();
    setPlaying(false);
    setTick((k) => k + 1);
  };
  const legs = [[START.x, START.y], ...wps];
  const robotPx = toPx(S.pose.x, S.pose.y);
  const goal = wps[S.idx];
  const rms = S.n ? Math.sqrt(S.cteSq / S.n) : 0;
  const tone = S.done ? "ok" : Math.abs(S.cmd.cte ?? 0) > 0.5 ? "warn" : "default";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="active">
          Waypoint {Math.min(S.idx + 1, wps.length)} / {wps.length}
        </Badge>
        <Badge variant={S.done ? "success" : "outline"}>{S.done ? "Mission complete" : playing ? "Running 100 Hz loop" : "Paused"}</Badge>
        <Badge variant={rms > 0.3 ? "warning" : "outline"}>RMS cross-track {rms.toFixed(2)} m</Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${AW * SC} ${AH * SC}`} className="w-full touch-none select-none font-mono" {...svgProps}>
              <ArrowDefs />
              <rect
                width={AW * SC}
                height={AH * SC}
                fill="transparent"
                style={{ cursor: "copy" }}
                onPointerDown={(e) => {
                  const p = svgPoint(e.currentTarget.ownerSVGElement, e);
                  setWps((w) => [...w, toWorld(p.x, p.y)]);
                  if (S.done) {
                    S.done = false;
                  }
                }}
              />
              {Array.from({ length: AW + 1 }, (_, i) => (
                <line key={`x${i}`} pointerEvents="none" x1={i * SC} x2={i * SC} y1={0} y2={AH * SC} stroke={C.grid} opacity={0.7} />
              ))}
              {Array.from({ length: AH + 1 }, (_, i) => (
                <line key={`y${i}`} pointerEvents="none" y1={i * SC} y2={i * SC} x1={0} x2={AW * SC} stroke={C.grid} opacity={0.7} />
              ))}
              <polyline pointerEvents="none" fill="none" stroke={C.muted} strokeDasharray="6 5" strokeWidth={1.5} points={polyPts(loop && wps.length > 1 ? [...legs, wps[0]] : legs, toPx)} />
              <polyline pointerEvents="none" fill="none" stroke={C.ok} strokeWidth={2.2} points={polyPts(S.path, toPx)} />
              {goal && !S.done && (
                <line pointerEvents="none" x1={robotPx[0]} y1={robotPx[1]} x2={toPx(...(S.cmd.look ?? goal))[0]} y2={toPx(...(S.cmd.look ?? goal))[1]} stroke={C.active} strokeWidth={2} markerEnd="url(#dd-head-2)" />
              )}
              {S.cmd.look && !S.done && <circle pointerEvents="none" cx={toPx(...S.cmd.look)[0]} cy={toPx(...S.cmd.look)[1]} r={5} fill={C.active} />}
              {noise > 0 && <circle pointerEvents="none" cx={toPx(...S.est)[0]} cy={toPx(...S.est)[1]} r={4} fill={C.warn} />}
              {wps.map((p, i) => {
                const [X, Y] = toPx(p[0], p[1]);
                const active = i === S.idx && !S.done;
                const passed = i < S.idx || S.done;
                return (
                  <g key={i} onPointerDown={startDrag(i)} style={{ cursor: "grab" }}>
                    <circle cx={X} cy={Y} r={CAPTURE * SC} fill={active ? C.active : passed ? C.ok : C.purple} fillOpacity={0.15} stroke={active ? C.active : passed ? C.ok : C.purple} strokeWidth={2} />
                    <text x={X} y={Y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.fg} pointerEvents="none">
                      {i + 1}
                    </text>
                  </g>
                );
              })}
              <g pointerEvents="none">
                <Robot pose={S.pose} L={0.5} r={0.1} toPx={toPx} s={SC} color={C.ink} />
              </g>
              <text x={8} y={AH * SC - 8} fontSize={10.5} fill={C.muted} pointerEvents="none">
                click to add a waypoint · drag to move · grid = 1 m
              </text>
            </svg>
          </Stage>
          <Legend
            items={[
              [C.ok, "Driven path / reached"],
              [C.active, ctrl === "pp" ? "Lookahead point" : "Line-of-sight to waypoint"],
              [C.purple, "Pending waypoint (capture r = 0.25 m)"],
              ...(noise > 0 ? [[C.warn, "Noisy 10 Hz position fix"]] : []),
            ]}
          />
          <Narration tone={tone}>
            {S.done
              ? `Mission complete in ${S.t.toFixed(1)} s. Max cross-track error ${S.cteMax.toFixed(2)} m, RMS ${rms.toFixed(2)} m. Click to add more waypoints or Reset.`
              : ctrl === "los"
                ? `Line-of-sight: e_θ = wrapToPi(atan2(Δy, Δx) − θ) = ${(S.cmd.e * DEG).toFixed(1)}°, ω = clamp(Kp·e_θ, ±2) = ${S.cmd.w.toFixed(2)} rad/s, v = clamp(Kp_d·d·max(0, cos e_θ), 0, v_max) = ${S.cmd.v.toFixed(2)} m/s. ${cosScale ? "Scaling by cos e_θ makes it pivot before driving off." : "Without cos scaling it drives full speed while turning — watch the wide arcs."}`
                : `Pure pursuit chases a point ${look.toFixed(1)} m ahead on the current leg: κ = 2 sin α / L_d, ω = v·κ = ${S.cmd.w.toFixed(2)} rad/s. Short lookahead hugs the line but can oscillate; long lookahead cuts corners.`}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Guidance & control">
            <Select value={ctrl} onValueChange={setCtrl}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="los">Line-of-sight heading P-control</SelectItem>
                <SelectItem value="pp">Pure pursuit (lookahead)</SelectItem>
              </SelectContent>
            </Select>
            {ctrl === "los" ? (
              <SliderControl label="Heading Kp_θ" value={kpH} min={0.5} max={8} step={0.1} onChange={setKpH} format={(x) => x.toFixed(1)} />
            ) : (
              <SliderControl label="Lookahead L_d" value={look} min={0.2} max={2.5} step={0.05} onChange={setLook} format={(x) => `${x.toFixed(2)} m`} />
            )}
            <SliderControl label="Max speed v_max" value={vmax} min={0.5} max={3} step={0.1} onChange={setVmax} format={(x) => `${x.toFixed(1)} m/s`} />
            <SliderControl label="Position-fix noise σ" value={noise} min={0} max={0.5} step={0.01} onChange={setNoise} format={(x) => `${x.toFixed(2)} m`} />
            <SwitchControl label="cos(e_θ) alignment speed scaling" checked={cosScale} onChange={setCosScale} />
            <SwitchControl label="Loop mission" checked={loop} onChange={setLoop} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="d_err" value={`${(S.cmd.d ?? 0).toFixed(2)} m`} hint="Distance to the active waypoint" />
            <Stat label="e_θ" value={`${((S.cmd.e ?? 0) * DEG).toFixed(1)}°`} tone="active" hint="Heading error, wrapped to [−180°, 180°]" />
            <Stat label="v_cmd" value={`${(S.cmd.v ?? 0).toFixed(2)} m/s`} tone="ok" />
            <Stat label="ω_cmd" value={`${(S.cmd.w ?? 0).toFixed(2)} rad/s`} tone="purple" hint="Clamped to ±2 rad/s" />
          </StatGrid>
        </div>
      </Split>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
        <Button
          size="sm"
          className="w-24"
          onClick={() => {
            if (S.done) reset();
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Start"}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw /> Reset robot
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWps((w) => w.slice(0, -1))} disabled={!wps.length}>
          <Undo2 /> Undo waypoint
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWps([])}>
          <Trash2 /> Clear
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setWps(CHAPTER_WPS);
            reset();
          }}
        >
          Chapter mission
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">t = {S.t.toFixed(1)} s</span>
      </div>
      <Stage className="p-2">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cross-track error to the active leg (m)</div>
        <LinePlot height={150} series={[{ data: S.cte, color: C.purple }]} xLabel="time (s)" />
      </Stage>
    </div>
  );
}

export default function DiffDriveLab({ variant = "odometry" }) {
  const wp = variant === "waypoints";
  return (
    <LabShell
      title={wp ? "Closed-Loop Waypoint Follower — Guidance + Heading Control" : "Differential Drive — ICC, Wheel Speeds & Odometry Drift"}
      description={
        wp
          ? "Click to lay out a mission. A 100 Hz loop turns distance and heading error into (v, ω) commands; compare line-of-sight P-control with pure pursuit."
          : "Two wheel speeds define an instantaneous centre of curvature. Encoders integrate the motion — and every slip becomes permanent drift."
      }
      badges={wp ? ["100 Hz loop", "atan2 + wrapToPi", "Pure pursuit"] : ["v = (v_R+v_L)/2", "ω = (v_R−v_L)/L", "Dead reckoning"]}
    >
      {wp ? <WaypointLab /> : <OdometryLab />}
    </LabShell>
  );
}
