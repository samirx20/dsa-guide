import { useRef, useState } from "react";
import { ArrowDownToLine, Hand, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, useAnimationFrame } from "@/viz/kit";

// Plant: a vertical elevator / drone.  ÿ = K·(u − G) − B·ẏ   (u in volts, y in metres)
const DT = 0.01; // 100 Hz control loop
const K_PLANT = 2, B = 0.5, G = 3, U_MAX = 12, Y_MAX = 10;
const ALPHA_D = 0.7; // EMA on the derivative (chapter: 0.7)
const WINDOW = 10; // seconds shown on the scope

const PRESETS = {
  chapter: { label: "Chapter gains (2.5 / 1.2 / 0.4)", g: [2.5, 1.2, 0.4] },
  p: { label: "Pure P — gravity droop", g: [2.5, 0, 0] },
  pd: { label: "Underdamped PD", g: [6, 0, 0.3] },
  tuned: { label: "Tuned PID", g: [4, 1, 2.5] },
  windup: { label: "Integral windup disaster", g: [4, 3, 1.5] },
};

function freshSim(r = 2) {
  return {
    t: 0,
    acc: 0,
    y: 0,
    v: 0,
    r,
    integ: 0,
    prevY: 0,
    prevE: r,
    dFilt: 0,
    first: true,
    hold: 0,
    u: 0,
    parts: [0, 0, 0],
    sat: false,
    hist: [],
    step: { t0: 0, y0: 0, r, t10: null, t90: null, peak: 0 },
  };
}

/** One 10 ms tick of the chapter's PID (with switchable fixes) + plant. */
function tick(S, { kp, ki, kd, grav, antiWindup, dOnMeas, sat }) {
  const e = S.r - S.y;
  const P = kp * e;
  let raw = 0;
  if (!S.first) raw = dOnMeas ? -(S.y - S.prevY) / DT : (e - S.prevE) / DT;
  S.first = false;
  S.prevY = S.y;
  S.prevE = e;
  S.dFilt = ALPHA_D * S.dFilt + (1 - ALPHA_D) * raw;
  const D = kd * S.dFilt;
  const cand = S.integ + e * DT;
  const unclamped = P + ki * cand + D;
  const pushingDeeper = (unclamped > U_MAX && e > 0) || (unclamped < -U_MAX && e < 0);
  if (!(antiWindup && sat && pushingDeeper)) S.integ = cand;
  const I = ki * S.integ;
  const total = P + I + D;
  const u = sat ? Math.max(-U_MAX, Math.min(U_MAX, total)) : total;
  S.parts = [P, I, D];
  S.u = u;
  S.sat = sat && Math.abs(total) > U_MAX;
  // plant
  if (S.hold > 0) {
    S.hold -= DT;
    S.v = 0; // someone is physically holding the car
  } else {
    const a = K_PLANT * (u - (grav ? G : 0)) - B * S.v;
    S.v += a * DT;
    S.y += S.v * DT;
  }
  if (S.y < 0) [S.y, S.v] = [0, Math.max(0, S.v)];
  if (S.y > Y_MAX) [S.y, S.v] = [Y_MAX, Math.min(0, S.v)];
  S.t += DT;
  // step metrics
  const st = S.step;
  const span = st.r - st.y0;
  if (Math.abs(span) > 1e-6) {
    const frac = (S.y - st.y0) / span;
    if (st.t10 === null && frac >= 0.1) st.t10 = S.t;
    if (st.t90 === null && frac >= 0.9) st.t90 = S.t;
    st.peak = Math.max(st.peak, frac);
  }
  if (Math.round(S.t / DT) % 2 === 0) {
    S.hist.push({ t: S.t, r: S.r, y: S.y, P, I, D, u, e });
    if (S.hist.length > (WINDOW / DT / 2) * 1.05) S.hist.shift();
  }
}

/** Horizontal stacked gauge of P / I / D contributions on the ±12 V scale. */
function EffortGauge({ parts, u, sat }) {
  const W = 560, H = 74, x0 = 30, x1 = W - 30, mid = (x0 + x1) / 2;
  const sc = (x1 - x0) / 2 / 15; // ±15 V visible
  const cols = [C.active, C.purple, C.warn];
  let pos = 0, neg = 0;
  const segs = parts.map((p, i) => {
    const w = Math.min(Math.abs(p), 30) * sc;
    let x;
    if (p >= 0) {
      x = mid + pos;
      pos += w;
    } else {
      neg += w;
      x = mid - neg;
    }
    return <rect key={i} x={Math.max(2, Math.min(x, W - 2))} y={14} width={Math.max(0, Math.min(w, W - 4 - Math.max(2, x)))} height={20} fill={cols[i]} opacity={0.85} />;
  });
  const ux = mid + Math.max(-15, Math.min(15, u)) * sc;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <rect x={mid - 12 * sc} y={10} width={24 * sc} height={28} rx={4} fill="none" stroke={sat ? C.bad : C.border} strokeWidth={sat ? 2.5 : 1} className={sat ? "animate-pulse" : undefined} />
      <line x1={mid} x2={mid} y1={6} y2={42} stroke={C.muted} />
      {segs}
      <line x1={ux} x2={ux} y1={6} y2={44} stroke={sat ? C.bad : C.fg} strokeWidth={3} />
      {[-12, -6, 0, 6, 12].map((v) => (
        <text key={v} x={mid + v * sc} y={58} fontSize={10} textAnchor="middle" fill={C.muted}>
          {v > 0 ? `+${v}` : v} V
        </text>
      ))}
      <text x={ux} y={H - 2} fontSize={10.5} textAnchor="middle" fill={sat ? C.bad : C.fg} fontWeight={700}>
        u = {u.toFixed(1)}
        {sat ? " (saturated)" : ""}
      </text>
    </svg>
  );
}

/** Elevator shaft with the car, setpoint and force arrows. */
function Shaft({ y, r, u, grav, hold }) {
  const W = 120, H = 300, top = 14, bot = H - 16;
  const sy = (m) => bot - (m / Y_MAX) * (bot - top);
  const car = sy(y);
  const thrust = Math.max(-40, Math.min(40, u * 3.2));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <rect x={30} y={top} width={60} height={bot - top} rx={4} fill={C.fill} stroke={C.border} />
      {[0, 2, 4, 6, 8, 10].map((m) => (
        <g key={m}>
          <line x1={24} x2={30} y1={sy(m)} y2={sy(m)} stroke={C.muted} />
          <text x={20} y={sy(m) + 3} fontSize={10} textAnchor="end" fill={C.muted}>
            {m}
          </text>
        </g>
      ))}
      <line x1={26} x2={96} y1={sy(r)} y2={sy(r)} stroke={C.ok} strokeWidth={2} strokeDasharray="5 3" />
      <text x={97} y={sy(r) - 4} fontSize={10} fill={C.ok}>
        r
      </text>
      <rect x={38} y={car - 14} width={44} height={22} rx={4} fill={hold ? C.bad : C.active} opacity={0.9} />
      <line x1={60} x2={60} y1={car - 14} y2={car - 14 - thrust} stroke={C.fg} strokeWidth={2.5} markerEnd={Math.abs(thrust) > 3 ? "url(#pid-head)" : undefined} />
      {grav && <line x1={60} x2={60} y1={car + 8} y2={car + 8 + 3 * 3.2} stroke={C.bad} strokeWidth={2.5} markerEnd="url(#pid-head-g)" />}
      <defs>
        <marker id="pid-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.fg} />
        </marker>
        <marker id="pid-head-g" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.bad} />
        </marker>
      </defs>
      <text x={W / 2} y={H - 2} fontSize={10} textAnchor="middle" fill={C.muted}>
        height (m)
      </text>
    </svg>
  );
}

export default function PidLab() {
  const [kp, setKp] = useState(2.5);
  const [ki, setKi] = useState(1.2);
  const [kd, setKd] = useState(0.4);
  const [preset, setPreset] = useState("chapter");
  const [grav, setGrav] = useState(true);
  const [antiWindup, setAntiWindup] = useState(true);
  const [dOnMeas, setDOnMeas] = useState(true);
  const [sat, setSat] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef(freshSim(2));
  const cfg = { kp, ki, kd, grav, antiWindup, dOnMeas, sat };

  useAnimationFrame((dt) => {
    const S = sim.current;
    S.acc += dt;
    while (S.acc >= DT) {
      S.acc -= DT;
      tick(S, cfg);
    }
    setFrame((f) => f + 1);
  }, playing);

  const S = sim.current;
  const bump = () => setFrame((f) => f + 1);
  const setSetpoint = (r) => {
    S.r = r;
    S.step = { t0: S.t, y0: S.y, r, t10: null, t90: null, peak: 0 };
    bump();
  };
  const applyPreset = (k) => {
    setPreset(k);
    const [p, i, d] = PRESETS[k].g;
    setKp(p);
    setKi(i);
    setKd(d);
    setAntiWindup(k !== "windup");
    if (k === "windup") {
      // the disaster: stall the car while the setpoint asks for 7 m
      sim.current.hold = 3;
      if (sim.current.r < 4.5) setSetpoint(7);
      setPlaying(true);
    }
  };
  const reset = () => {
    sim.current = freshSim(2);
    setPlaying(false);
    bump();
  };

  // metrics for the latest step
  const st = S.step;
  const span = st.r - st.y0;
  const rise = st.t10 !== null && st.t90 !== null ? st.t90 - st.t10 : null;
  const overshoot = Math.abs(span) > 1e-6 ? Math.max(0, (st.peak - 1) * 100) : 0;
  const recent = S.hist.filter((h) => h.t > S.t - 1);
  const sse = recent.length ? recent.reduce((a, h) => a + h.e, 0) / recent.length : S.r - S.y;
  const tail = S.hist.filter((h) => h.t > S.t - 1.5).map((h) => h.y);
  const settled = S.t - st.t0 > 1.5 && tail.length > 10 && Math.max(...tail) - Math.min(...tail) < Math.max(0.05, 0.02 * Math.abs(span));

  const t1 = Math.max(S.t, WINDOW), t0 = t1 - WINDOW;
  const [P, I, D] = S.parts;
  const story =
    S.hold > 0
      ? `Someone is holding the car down: e = ${(S.r - S.y).toFixed(1)} m stays large, so the integral keeps accumulating (I = ${I.toFixed(1)} V). ${antiWindup ? "Anti-windup freezes it once u saturates." : "Without anti-windup it winds up far past what the 12 V motor can deliver — expect a huge overshoot on release."}`
      : Math.abs(span) < 1e-6
        ? "Press Play, then Step setpoint to see the step response."
        : !settled
          ? `${S.t - st.t0 > 4 ? "Still ringing around" : "Responding to a step to"} r = ${st.r.toFixed(1)} m. P = Kp·e = ${P.toFixed(1)} V pulls like a spring, D = ${D.toFixed(1)} V brakes like a damper${dOnMeas ? "" : " (on error: it kicked when the setpoint jumped)"}, I = ${I.toFixed(1)} V remembers past error.`
          : ki === 0 && grav
            ? `Settled with steady-state error ${sse.toFixed(2)} m: with no integral, P needs a permanent error of G/Kp = ${(G / kp).toFixed(2)} m to produce the ${G} V that holds the car against gravity.`
            : `Settled: e_ss = ${sse.toFixed(3)} m. ${ki > 0 && grav ? `The integral now stores I = ${I.toFixed(2)} V ≈ the ${G} V gravity load, so P and D can both be ~0.` : ""}`;

  return (
    <LabShell
      title="PID Oscilloscope — Gravity, Anti-Windup & Derivative Kick"
      description="A 100 Hz PID loop lifting an elevator car against gravity. Tune Kp, Ki, Kd live and flip the production fixes on and off."
      badges={["100 Hz loop", "±12 V actuator", "u = Kp·e + Ki∫e − Kd·ẏ"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRESETS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={S.sat ? "danger" : "success"}>{S.sat ? "Saturated" : "Active"}</Badge>
        <Badge variant="outline">Rise {rise !== null ? `${rise.toFixed(2)} s` : "—"}</Badge>
        <Badge variant={overshoot > 20 ? "warning" : "outline"}>Overshoot {overshoot.toFixed(1)}%</Badge>
        <Badge variant={Math.abs(sse) > 0.05 && settled ? "warning" : "outline"}>e_ss {settled ? sse.toFixed(3) : "—"} m</Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
            <Stage className="p-1.5">
              <Shaft y={S.y} r={S.r} u={S.u} grav={grav} hold={S.hold > 0} />
            </Stage>
            <div className="space-y-2">
              <Stage className="p-2">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Setpoint r(t) vs height y(t) (m)</div>
                <LinePlot
                  height={150}
                  xDomain={[t0, t1]}
                  yDomain={[0, Y_MAX]}
                  series={[
                    { data: S.hist.map((h) => [h.t, h.r]), color: C.ok, dash: "6 4", width: 1.8 },
                    { data: S.hist.map((h) => [h.t, h.y]), color: C.active, width: 2.2 },
                  ]}
                />
              </Stage>
              <Stage className="p-2">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Effort u_P, u_I, u_D and clamped u (V)</div>
                <LinePlot
                  height={150}
                  xDomain={[t0, t1]}
                  yDomain={[-15, 15]}
                  hLines={sat ? [{ y: U_MAX, color: C.bad }, { y: -U_MAX, color: C.bad }] : []}
                  series={[
                    { data: S.hist.map((h) => [h.t, h.P]), color: C.active, width: 1.3 },
                    { data: S.hist.map((h) => [h.t, h.I]), color: C.purple, width: 1.3 },
                    { data: S.hist.map((h) => [h.t, h.D]), color: C.warn, width: 1.3 },
                    { data: S.hist.map((h) => [h.t, h.u]), color: C.fg, width: 2 },
                  ]}
                  xLabel="time (s)"
                />
              </Stage>
            </div>
          </div>
          <Stage className="px-2 py-1">
            <EffortGauge parts={S.parts} u={S.u} sat={S.sat} />
          </Stage>
          <Legend
            items={[
              [C.ok, "Setpoint r"],
              [C.active, "y / P term"],
              [C.purple, "I term"],
              [C.warn, "D term"],
              [C.fg, "Total u (clamped)"],
            ]}
          />
          <Narration tone={S.hold > 0 ? "bad" : settled && Math.abs(sse) < 0.02 ? "ok" : overshoot > 30 ? "warn" : "default"}>{story}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Gains">
            <Tip content="Proportional — a virtual spring: effort grows with the current error.">
              <div>
                <SliderControl label="Kp (spring)" value={kp} min={0} max={10} step={0.1} onChange={setKp} format={(v) => v.toFixed(1)} />
              </div>
            </Tip>
            <Tip content="Integral — memory of past error: learns the constant effort needed to beat gravity.">
              <div>
                <SliderControl label="Ki (memory)" value={ki} min={0} max={5} step={0.05} onChange={setKi} format={(v) => v.toFixed(2)} />
              </div>
            </Tip>
            <Tip content="Derivative — a virtual damper: opposes velocity to prevent overshoot.">
              <div>
                <SliderControl label="Kd (damper)" value={kd} min={0} max={3} step={0.05} onChange={setKd} format={(v) => v.toFixed(2)} />
              </div>
            </Tip>
            <SliderControl label="Setpoint r" value={S.r} min={0} max={9} step={0.5} onChange={setSetpoint} format={(v) => `${v.toFixed(1)} m`} />
          </Panel>
          <Panel title="Plant & fixes">
            <SwitchControl label="Gravity load" hint={`Constant ${G} V needed just to hover`} checked={grav} onChange={setGrav} />
            <SwitchControl label="Integrator anti-windup" hint="Conditional clamping while saturated" checked={antiWindup} onChange={setAntiWindup} />
            <SwitchControl label="Derivative on measurement" hint="−Kd·dy/dt: no kick on setpoint steps" checked={dOnMeas} onChange={setDOnMeas} />
            <SwitchControl label="Actuator saturation ±12 V" checked={sat} onChange={setSat} />
          </Panel>
          <StatGrid cols={3}>
            <Stat label="y" value={`${S.y.toFixed(2)} m`} tone="active" />
            <Stat label="e" value={`${(S.r - S.y).toFixed(2)}`} />
            <Stat label="∫e dt" value={S.integ.toFixed(2)} tone="purple" hint="Integral accumulator (m·s)" />
          </StatGrid>
        </div>
      </Split>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
        <Button size="sm" className="w-24" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSetpoint(S.r >= 4.5 ? 2 : 7)}>
          <ArrowDownToLine className="rotate-180" /> Step setpoint
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            S.v -= 4;
            bump();
          }}
        >
          <Zap /> Impulse disturbance
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            S.hold = 3;
            if (S.r < 4.5) setSetpoint(7);
            bump();
          }}
        >
          <Hand /> Hold down 3 s
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw /> Reset
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">t = {S.t.toFixed(2)} s</span>
      </div>
    </LabShell>
  );
}
