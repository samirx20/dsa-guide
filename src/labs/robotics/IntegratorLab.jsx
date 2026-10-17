import { useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, gauss, rng, useAnimationFrame } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tab 1: numerical differentiation + EMA low-pass                      */
/* ------------------------------------------------------------------ */

const T_DIFF = 3; // seconds of signal

/** Sample a moving robot with a noisy position sensor; compute raw and EMA-filtered velocity. */
function diffSignal({ f, noiseMm, alpha, noiseMode, motion }) {
  const dt = 1 / f;
  const n = Math.round(T_DIFF * f) + 1;
  const rand = rng(42);
  const eps = noiseMm / 1000;
  const vTrue = (t) => (motion === "steady" ? 1 : 1 + 0.6 * Math.sin(2 * Math.PI * 0.4 * t));
  const xTrue = (t) => (motion === "steady" ? t : t + (0.6 / (2 * Math.PI * 0.4)) * (1 - Math.cos(2 * Math.PI * 0.4 * t)));
  const rows = [];
  let prevX = 0;
  let vf = 1;
  for (let k = 0; k < n; k++) {
    const t = k * dt;
    const noise = noiseMode === "alt" ? (k % 2 === 0 ? eps : -eps) : eps * gauss(rand);
    const x = xTrue(t) + noise;
    const raw = k === 0 ? 1 : (x - prevX) / dt; // backward difference (k=0 initialised to 1 m/s like the chapter)
    vf = k === 0 ? 1 : alpha * raw + (1 - alpha) * vf;
    rows.push({ k, t, xt: xTrue(t), x, raw, vf, vt: vTrue(t) });
    prevX = x;
  }
  return { rows, dt };
}

function SecantView({ rows, k }) {
  const W = 560, H = 170, pad = { l: 46, r: 12, t: 12, b: 22 };
  const win = rows.slice(Math.max(0, k - 11), k + 1);
  const t0 = win[0].t, t1 = Math.max(win[win.length - 1].t, t0 + 1e-6);
  const ys = win.flatMap((r) => [r.x, r.xt]);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padY = Math.max((y1 - y0) * 0.15, 0.002);
  y0 -= padY;
  y1 += padY;
  const sx = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - (y - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {[0, 0.5, 1].map((q) => {
        const y = y0 + (y1 - y0) * q;
        return (
          <g key={q}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(y)} y2={sy(y)} stroke={C.grid} />
            <text x={pad.l - 6} y={sy(y) + 3} textAnchor="end" fontSize={10} fill={C.muted}>
              {y.toFixed(3)}
            </text>
          </g>
        );
      })}
      <polyline fill="none" stroke={C.muted} strokeDasharray="5 4" strokeWidth={1.5} points={win.map((r) => `${sx(r.t)},${sy(r.xt)}`).join(" ")} />
      {win.slice(1).map((r, i) => {
        const p = win[i];
        const last = i === win.length - 2;
        return (
          <g key={r.k}>
            <line x1={sx(p.t)} y1={sy(p.x)} x2={sx(r.t)} y2={sy(r.x)} stroke={C.bad} strokeWidth={last ? 2.5 : 1.3} opacity={last ? 1 : 0.55} />
            {last && (
              <>
                <line x1={sx(p.t)} y1={sy(p.x)} x2={sx(r.t)} y2={sy(p.x)} stroke={C.bad} strokeDasharray="3 3" opacity={0.7} />
                <line x1={sx(r.t)} y1={sy(p.x)} x2={sx(r.t)} y2={sy(r.x)} stroke={C.bad} strokeDasharray="3 3" opacity={0.7} />
                <text x={(sx(p.t) + sx(r.t)) / 2} y={sy(p.x) + (r.x >= p.x ? 13 : -6)} textAnchor="middle" fontSize={10} fill={C.bad}>
                  Δt
                </text>
                <text x={sx(r.t) + 4} y={(sy(p.x) + sy(r.x)) / 2 + 3} fontSize={10} fill={C.bad}>
                  Δx
                </text>
              </>
            )}
          </g>
        );
      })}
      {win.map((r, i) => (
        <circle key={r.k} cx={sx(r.t)} cy={sy(r.x)} r={i === win.length - 1 ? 4.5 : 3} fill={i === win.length - 1 ? C.active : C.ink} />
      ))}
      <text x={pad.l} y={H - 5} fontSize={10} fill={C.muted}>
        t = {t0.toFixed(2)} s
      </text>
      <text x={W - pad.r} y={H - 5} fontSize={10} fill={C.muted} textAnchor="end">
        t = {t1.toFixed(2)} s (last 12 samples)
      </text>
    </svg>
  );
}

function DerivativeTab() {
  const [f, setF] = useState(100);
  const [noiseMm, setNoise] = useState(5);
  const [alpha, setAlpha] = useState(0.2);
  const [noiseMode, setNoiseMode] = useState("gauss");
  const [motion, setMotion] = useState("varying");
  const [showFilt, setShowFilt] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [time, setTimeState] = useState(0.5);
  const timeRef = useRef(0.5);
  const setTime = (t) => {
    timeRef.current = t;
    setTimeState(t);
  };

  const { rows, dt } = useMemo(() => diffSignal({ f, noiseMm, alpha, noiseMode, motion }), [f, noiseMm, alpha, noiseMode, motion]);
  const k = Math.min(rows.length - 1, Math.max(1, Math.round(time * f)));

  useAnimationFrame((d) => {
    const nt = Math.min(T_DIFF, timeRef.current + d * 0.5); // half real-time so individual ticks are visible
    if (nt >= T_DIFF) setPlaying(false);
    setTime(nt);
  }, playing);

  const shown = rows.slice(0, k + 1);
  const rms = (key) => Math.sqrt(shown.slice(1).reduce((s, r) => s + (r[key] - r.vt) ** 2, 0) / Math.max(1, shown.length - 1));
  const rawRms = rms("raw"), filtRms = rms("vf");
  const tau = (dt * (1 - alpha)) / alpha;
  const fc = alpha >= 1 ? Infinity : 1 / (2 * Math.PI * tau);
  const amplification = noiseMm > 0 ? (Math.SQRT2 * noiseMm) / 1000 / dt : 0;
  const allRaw = rows.map((r) => r.raw);
  const yDomain = [Math.max(-3, Math.min(0, ...allRaw) - 0.2), Math.min(5, Math.max(2, ...allRaw) + 0.2)];
  const cur = rows[k];

  const chapterPreset = () => {
    setF(100);
    setNoise(5);
    setAlpha(0.2);
    setNoiseMode("alt");
    setMotion("steady");
    setTime(0.04);
    setPlaying(false);
  };

  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Position samples x_k and secant slopes (zoomed)</div>
            <SecantView rows={rows} k={k} />
          </Stage>
          <Stage className="p-2">
            <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Velocity estimate (m/s)</div>
            <LinePlot
              height={190}
              xDomain={[0, T_DIFF]}
              yDomain={yDomain}
              xLabel="time (s)"
              series={[
                { data: shown.map((r) => [r.t, r.raw]), color: C.bad, width: 1.2, label: "raw" },
                ...(showFilt ? [{ data: shown.map((r) => [r.t, r.vf]), color: C.ok, width: 2.2, label: "EMA" }] : []),
                { data: rows.map((r) => [r.t, r.vt]), color: C.muted, dash: "5 4", width: 1.5, label: "true" },
              ]}
            />
          </Stage>
          <Legend
            items={[
              [C.bad, "Raw backward difference (x_k − x_{k−1})/Δt"],
              [C.ok, `EMA filtered (α = ${alpha.toFixed(2)})`],
              [C.muted, "True velocity"],
              [C.active, "Newest sample"],
            ]}
          />
          <Narration tone={rawRms > 3 * filtRms ? "warn" : "default"}>
            Tick k = {k}: dividing a ±{noiseMm} mm jitter by Δt = {(dt * 1000).toFixed(1)} ms multiplies it by {(1 / dt).toFixed(0)}× — the raw derivative
            is off by {rawRms.toFixed(2)} m/s RMS. The EMA keeps {(alpha * 100).toFixed(0)}% of each new reading and {(100 - alpha * 100).toFixed(0)}% of its memory,
            cutting the error to {filtRms.toFixed(2)} m/s{alpha < 0.15 ? " — but notice it now lags behind the true speed." : "."}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Sensor & loop">
            <SliderControl label="Loop frequency f" value={f} min={10} max={200} step={5} onChange={setF} format={(v) => `${v} Hz → Δt = ${(1000 / v).toFixed(1)} ms`} />
            <SliderControl label={noiseMode === "alt" ? "Jitter amplitude ε" : "Noise σ"} value={noiseMm} min={0} max={20} step={0.5} onChange={setNoise} format={(v) => `${v.toFixed(1)} mm`} />
            <ToggleGroup type="single" value={noiseMode} onValueChange={(v) => v && setNoiseMode(v)}>
              <ToggleGroupItem value="gauss">Gaussian noise</ToggleGroupItem>
              <ToggleGroupItem value="alt">Alternating ±ε</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" value={motion} onValueChange={(v) => v && setMotion(v)}>
              <ToggleGroupItem value="steady">Steady 1 m/s</ToggleGroupItem>
              <ToggleGroupItem value="varying">Speeding up / slowing</ToggleGroupItem>
            </ToggleGroup>
          </Panel>
          <Panel title="EMA low-pass filter">
            <SliderControl label="Smoothing α" value={alpha} min={0.02} max={1} step={0.01} onChange={setAlpha} format={(v) => v.toFixed(2)} />
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">τ = {Number.isFinite(tau) ? (tau * 1000).toFixed(1) : "0"} ms</Badge>
              <Badge variant="outline">f_c = {Number.isFinite(fc) ? fc.toFixed(1) : "∞"} Hz</Badge>
            </div>
            <SwitchControl label="Show filtered trace" checked={showFilt} onChange={setShowFilt} />
          </Panel>
          <StatGrid cols={3}>
            <Stat label="Raw RMS err" value={`${rawRms.toFixed(2)}`} tone="bad" hint="RMS of (raw v_k − true v) over the samples shown, in m/s" />
            <Stat label="EMA RMS err" value={`${filtRms.toFixed(2)}`} tone="ok" hint="RMS of (filtered v_k − true v), in m/s" />
            <Stat label="Noise gain" value={`±${amplification.toFixed(2)}`} tone="warn" hint="√2·σ/Δt — the spread a position noise σ produces in the raw derivative (m/s)" />
          </StatGrid>
        </div>
      </Split>
      <PlayRow
        playing={playing}
        onToggle={() => {
          if (!playing && time >= T_DIFF) setTime(0.05);
          setPlaying((p) => !p);
        }}
        onStep={() => {
          setPlaying(false);
          setTime(Math.min(T_DIFF, (k + 1) / f));
        }}
        onReset={() => {
          setPlaying(false);
          setTime(0.05);
        }}
        extra={
          <Button variant="outline" size="sm" onClick={chapterPreset}>
            Chapter dry-run (100 Hz, ±5 mm, α = 0.2)
          </Button>
        }
        label={`t = ${cur.t.toFixed(2)} s · tick ${k}`}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tick k</TableHead>
            <TableHead>t_k (s)</TableHead>
            <TableHead>x_k (m)</TableHead>
            <TableHead className="text-right">Raw v_k (m/s)</TableHead>
            <TableHead className="text-right">Filtered v_k (m/s)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(Math.max(0, k - 4), k + 1).map((r) => (
            <TableRow key={r.k} className={cn(r.k === k && "bg-viz-active/10")}>
              <TableCell className="py-1.5 font-mono text-[12.5px]">{r.k}</TableCell>
              <TableCell className="py-1.5 font-mono text-[12.5px]">{r.t.toFixed(3)}</TableCell>
              <TableCell className="py-1.5 font-mono text-[12.5px]">{r.x.toFixed(4)}</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-bad">{r.raw.toFixed(2)}</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-ok">{r.vf.toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: integrators on a harmonic oscillator                          */
/* ------------------------------------------------------------------ */

const OMEGA = 2 * Math.PI * 0.5; // 0.5 Hz spring joint: x'' = -ω² x
const T_INT = 20;
const METHODS = {
  euler: { label: "Forward Euler", color: C.bad, order: "O(Δt)", rule: "x += v·Δt;  v += a·Δt   (old v)" },
  semi: { label: "Semi-implicit Euler", color: C.ok, order: "O(Δt), symplectic", rule: "v += a·Δt;  x += v_new·Δt" },
  rk2: { label: "Midpoint RK2", color: C.warn, order: "O(Δt²)", rule: "slope at s + ½Δt·f(s)" },
  rk4: { label: "RK4", color: C.purple, order: "O(Δt⁴)", rule: "(k1 + 2k2 + 2k3 + k4)/6" },
};

function integrate(method, h) {
  const n = Math.ceil(T_INT / h);
  const f = (x, v) => [v, -OMEGA * OMEGA * x];
  let x = 1, v = 0;
  const out = [[x, v]];
  for (let k = 0; k < n; k++) {
    if (method === "euler") {
      [x, v] = [x + h * v, v - h * OMEGA * OMEGA * x];
    } else if (method === "semi") {
      v -= h * OMEGA * OMEGA * x;
      x += h * v;
    } else if (method === "rk2") {
      const [a1, b1] = f(x, v);
      const [a2, b2] = f(x + (h / 2) * a1, v + (h / 2) * b1);
      x += h * a2;
      v += h * b2;
    } else {
      const k1 = f(x, v), k2 = f(x + (h / 2) * k1[0], v + (h / 2) * k1[1]);
      const k3 = f(x + (h / 2) * k2[0], v + (h / 2) * k2[1]), k4 = f(x + h * k3[0], v + h * k3[1]);
      x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      v += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    }
    out.push([x, v]);
  }
  return out;
}
const energy = ([x, v]) => (0.5 * v * v + 0.5 * OMEGA * OMEGA * x * x) / (0.5 * OMEGA * OMEGA); // normalised: E/E0

function PhasePlot({ trajs, n }) {
  const S = 300, c = S / 2, R = 62; // unit circle radius in px
  const lim = 2.3;
  const clampP = (p) => Math.max(-lim, Math.min(lim, p));
  const px = ([x, v]) => [c + clampP(x) * R, c - clampP(v / OMEGA) * R];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[340px] font-mono">
      <line x1={10} x2={S - 10} y1={c} y2={c} stroke={C.grid} />
      <line y1={10} y2={S - 10} x1={c} x2={c} stroke={C.grid} />
      {[1, 2].map((r) => (
        <circle key={r} cx={c} cy={c} r={R * r} fill="none" stroke={C.grid} strokeDasharray="2 4" />
      ))}
      <circle cx={c} cy={c} r={R} fill="none" stroke={C.muted} strokeDasharray="6 4" strokeWidth={1.5} />
      <text x={S - 12} y={c - 6} fontSize={10} fill={C.muted} textAnchor="end">
        x
      </text>
      <text x={c + 6} y={18} fontSize={10} fill={C.muted}>
        v/ω
      </text>
      <text x={c + R * 0.72} y={c + R * 0.72 + 14} fontSize={10} fill={C.muted}>
        exact orbit
      </text>
      {trajs.map(({ key, data }) => {
        const pts = data.slice(0, n + 1);
        const last = px(pts[pts.length - 1]);
        return (
          <g key={key}>
            <polyline fill="none" stroke={METHODS[key].color} strokeWidth={1.6} strokeLinejoin="round" points={pts.map((p) => px(p).join(",")).join(" ")} />
            <circle cx={last[0]} cy={last[1]} r={4.5} fill={METHODS[key].color} stroke={C.card} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
}

function IntegratorTab() {
  const [method, setMethod] = useState("all");
  const [h, setH] = useState(0.1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);

  const all = useMemo(() => Object.fromEntries(Object.keys(METHODS).map((m) => [m, integrate(m, h)])), [h]);
  const keys = method === "all" ? Object.keys(METHODS) : [method];
  const n = Math.min(Math.floor(time / h + 1e-9), all.euler.length - 1);

  useAnimationFrame((d) => {
    timeRef.current = Math.min(T_INT, timeRef.current + d * 1.5);
    if (timeRef.current >= T_INT) setPlaying(false);
    setTime(timeRef.current);
  }, playing);

  const setT = (t) => {
    timeRef.current = t;
    setTime(t);
  };
  const energies = Object.fromEntries(Object.keys(METHODS).map((m) => [m, energy(all[m][n])]));
  const growth = 1 + (h * OMEGA) ** 2; // Forward Euler multiplies energy by this every step
  const eulerE = energies.euler;

  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <div className="grid gap-3">
            <Stage className="p-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phase plot (x, v/ω)</div>
              <PhasePlot trajs={keys.map((k) => ({ key: k, data: all[k] }))} n={n} />
            </Stage>
            <Stage className="p-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Energy E / E₀</div>
              <LinePlot
                height={170}
                xDomain={[0, T_INT]}
                yDomain={[0, 3]}
                xLabel="time (s)"
                hLines={[
                  { y: 1, color: C.muted, label: "exact" },
                  { y: 2, color: C.bad, label: "danger" },
                ]}
                series={keys.map((k) => ({ data: all[k].slice(0, n + 1).map((s, i) => [i * h, energy(s)]), color: METHODS[k].color, width: 2 }))}
              />
            </Stage>
          </div>
          <Legend items={[...keys.map((k) => [METHODS[k].color, METHODS[k].label]), [C.muted, "Exact (energy conserved)"]]} />
          <Narration tone={eulerE > 2 && keys.includes("euler") ? "bad" : "default"}>
            t = {(n * h).toFixed(2)} s, step {n}. Forward Euler uses the <b>old</b> velocity, stepping along the tangent — always slightly outside the circle —
            so every step multiplies energy by 1 + (ωΔt)² = {growth.toFixed(3)}; it has gained {((eulerE - 1) * 100).toFixed(0)}% so far. Semi-implicit Euler only
            reorders two lines yet its energy just wobbles around 1, and RK4 stays on the orbit.
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Integrator">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Compare all</SelectItem>
                {Object.entries(METHODS).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SliderControl
              label="Timestep Δt"
              value={h}
              min={0.01}
              max={0.3}
              step={0.01}
              onChange={(v) => {
                setH(v);
                setT(0);
                setPlaying(false);
              }}
              format={(v) => `${v.toFixed(2)} s (${(1 / v).toFixed(0)} Hz)`}
            />
            <div className="text-[12px] text-muted-foreground">Spring joint ẍ = −ω²x with ω = π rad/s (period 2 s), x₀ = 1, v₀ = 0.</div>
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">E / E₀</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(METHODS).map(([k, m]) => (
                <TableRow key={k} className={cn(!keys.includes(k) && "opacity-45")}>
                  <TableCell className="py-1.5 text-[12.5px]">
                    <span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: m.color }} />
                    {m.label}
                    <div className="font-mono text-[10.5px] text-muted-foreground">{m.rule}</div>
                  </TableCell>
                  <TableCell className="py-1.5 font-mono text-[11.5px]">{m.order}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: energies[k] > 1.5 ? C.bad : undefined }}>
                    {energies[k] > 999 ? energies[k].toExponential(1) : energies[k].toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Split>
      <PlayRow
        playing={playing}
        onToggle={() => {
          if (!playing && timeRef.current >= T_INT) setT(0);
          setPlaying((p) => !p);
        }}
        onStep={() => {
          setPlaying(false);
          setT(Math.min(T_INT, (n + 1) * h + 1e-9));
        }}
        onReset={() => {
          setPlaying(false);
          setT(0);
        }}
        label={`t = ${(n * h).toFixed(2)} s · step ${n}`}
      />
    </div>
  );
}

function PlayRow({ playing, onToggle, onStep, onReset, extra, label }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
      <Button size="sm" onClick={onToggle} className="w-24">
        {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
      </Button>
      <Button variant="outline" size="sm" onClick={onStep}>
        <StepForward /> Tick k → k+1
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw /> Reset
      </Button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{label}</span>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

export default function IntegratorLab() {
  return (
    <LabShell
      title="Discrete Calculus Workbench — Derivative Noise & Integrators"
      description="Differentiation divides sensor noise by Δt; integration accumulates error every tick. See both failure modes and the one-line fixes."
      badges={["v = Δx/Δt", "EMA low-pass", "Euler vs RK"]}
    >
      <Tabs defaultValue="differentiation">
        <TabsList>
          <TabsTrigger value="differentiation">1. Derivative noise & EMA</TabsTrigger>
          <TabsTrigger value="integration">2. Integrator arena</TabsTrigger>
        </TabsList>
        <TabsContent value="differentiation">
          <DerivativeTab />
        </TabsContent>
        <TabsContent value="integration">
          <IntegratorTab />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
