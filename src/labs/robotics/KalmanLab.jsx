import { useMemo, useRef, useState } from "react";
import { Crosshair, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, gauss, rng, useAnimationFrame } from "@/viz/kit";
import { cn } from "@/lib/utils";

const pdf = (x, mu, v) => Math.exp(-((x - mu) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v);

/* ------------------------------------------------------------------ */
/* Tab 1: 1D predict / update (chapter §4 dry run)                      */
/* ------------------------------------------------------------------ */

const V_DT = 2.0; // robot moves +2 m per tick
const CHAPTER_Z = [2.4, 3.6, 6.3, 7.8, 10.2];

function measurement(k, R) {
  if (k <= CHAPTER_Z.length) return CHAPTER_Z[k - 1];
  const r = rng(100 + k);
  return 2 * k + Math.sqrt(R) * gauss(r);
}

function GaussCurves({ prior, meas, post, xDomain }) {
  const W = 560, H = 220, pad = { l: 36, r: 10, t: 12, b: 26 };
  const [x0, x1] = xDomain;
  const curves = [prior && { ...prior, color: C.active }, meas && { ...meas, color: C.warn }, post && { ...post, color: C.ok }].filter(Boolean);
  const yMax = Math.min(1.6, Math.max(0.45, ...curves.map((c) => pdf(c.mu, c.mu, c.v))) * 1.12);
  const sx = (x) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - Math.min(y, yMax) / yMax) * (H - pad.t - pad.b);
  const path = (mu, v, close) => {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const x = x0 + ((x1 - x0) * i) / 160;
      pts.push(`${sx(x).toFixed(1)},${sy(pdf(x, mu, v)).toFixed(1)}`);
    }
    return close ? `M ${sx(x0)},${sy(0)} L ${pts.join(" L ")} L ${sx(x1)},${sy(0)} Z` : `M ${pts.join(" L ")}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {Array.from({ length: 7 }, (_, k) => {
        const x = x0 + ((x1 - x0) * k) / 6;
        return (
          <g key={k}>
            <line x1={sx(x)} x2={sx(x)} y1={pad.t} y2={H - pad.b} stroke={C.grid} />
            <text x={sx(x)} y={H - 10} fontSize={10} textAnchor="middle" fill={C.muted}>
              {x.toFixed(1)}
            </text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} stroke={C.muted} />
      {curves.map((c, i) => (
        <g key={i}>
          <path d={path(c.mu, c.v, true)} fill={c.color} opacity={0.12} />
          <path d={path(c.mu, c.v)} fill="none" stroke={c.color} strokeWidth={c.color === C.ok ? 2.8 : 2} />
          <line x1={sx(c.mu)} x2={sx(c.mu)} y1={sy(pdf(c.mu, c.mu, c.v))} y2={sy(0)} stroke={c.color} strokeDasharray="3 3" />
        </g>
      ))}
    </svg>
  );
}

/** Lever: fused mean sits a fraction K of the way from the prediction to the measurement. */
function GainLever({ xp, z, K, xDomain }) {
  const W = 560, pad = 36;
  const sx = (x) => pad + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - pad - 10);
  const f = xp + K * (z - xp);
  return (
    <svg viewBox={`0 0 ${W} 46`} className="w-full font-mono">
      <line x1={sx(xp)} x2={sx(z)} y1={18} y2={18} stroke={C.muted} strokeWidth={4} strokeLinecap="round" />
      <circle cx={sx(xp)} cy={18} r={6} fill={C.active} />
      <circle cx={sx(z)} cy={18} r={6} fill={C.warn} />
      <path d={`M ${sx(f)} 22 l -8 14 h 16 z`} fill={C.ok} />
      <text x={sx(f)} y={44} fontSize={10.5} textAnchor="middle" fill={C.ok} fontWeight={700}>
        K = {K.toFixed(3)}
      </text>
      <text x={sx(xp)} y={9} fontSize={10} textAnchor="middle" fill={C.active}>
        x̂⁻
      </text>
      <text x={sx(z)} y={9} fontSize={10} textAnchor="middle" fill={C.warn}>
        z
      </text>
    </svg>
  );
}

function OneD() {
  const [Q, setQ] = useState(0.5);
  const [R, setR] = useState(1.0);
  // log of filter events; state is derived from it
  const [rows, setRows] = useState([]); // {k, xp, Pp, z?, K?, x?, P?}
  const last = rows[rows.length - 1];
  const phase = !last ? "post" : last.z === undefined ? "prior" : "post";

  const curX = !last ? 0 : last.x ?? last.xp;
  const curP = !last ? 1 : last.P ?? last.Pp;

  const predict = () => {
    const k = (last?.k ?? 0) + 1;
    setRows((r) => [...r, { k, xp: curX + V_DT, Pp: curP + Q, Q }]);
  };
  const update = () => {
    if (phase !== "prior") return;
    const z = measurement(last.k, R);
    const K = last.Pp / (last.Pp + R);
    setRows((r) => [...r.slice(0, -1), { ...last, z, R, y: z - last.xp, K, x: last.xp + K * (z - last.xp), P: (1 - K) * last.Pp }]);
  };
  const reset = () => setRows([]);

  const prior = last ? { mu: last.xp, v: last.Pp } : null;
  const zNext = phase === "prior" ? measurement(last.k, R) : last?.z;
  const meas = last ? { mu: zNext, v: last.R ?? R } : null;
  const post = phase === "post" && last ? { mu: last.x, v: last.P } : !last ? { mu: 0, v: 1 } : null;
  const center = last ? last.xp : 0;
  const half = Math.max(3, 4 * Math.sqrt(Math.max(curP, R, last?.Pp ?? 0)));
  const xDomain = [center - half, center + half];
  const Kshow = phase === "prior" ? last.Pp / (last.Pp + R) : last?.K;

  const story = !last
    ? "Initial belief N(0, 1.00): the robot is somewhere near 0 m. Press Predict() to drive +2 m."
    : phase === "prior"
      ? `Predict(): x̂⁻ = ${(last.xp - V_DT).toFixed(2)} + 2.0 = ${last.xp.toFixed(2)} m and P⁻ = P + Q = ${(last.Pp - last.Q).toFixed(3)} + ${last.Q} = ${last.Pp.toFixed(3)} m² — the cyan curve is wider: driving blind adds uncertainty. The GPS is about to report z = ${zNext.toFixed(2)} m with variance R = ${R}.`
      : `Update(z): K = P⁻/(P⁻ + R) = ${last.Pp.toFixed(3)}/(${last.Pp.toFixed(3)} + ${last.R}) = ${last.K.toFixed(3)}. x̂ = x̂⁻ + K·(z − x̂⁻) = ${last.x.toFixed(2)} m, P = (1 − K)·P⁻ = ${last.P.toFixed(3)} m² — the green posterior is narrower than both inputs.`;

  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <GaussCurves prior={prior} meas={phase === "prior" || phase === "post" ? meas : null} post={post} xDomain={xDomain} />
            {last && <GainLever xp={last.xp} z={zNext} K={Kshow} xDomain={xDomain} />}
          </Stage>
          <Legend
            items={[
              [C.active, "Prior N(x̂⁻, P⁻)"],
              [C.warn, "Measurement N(z, R)"],
              [C.ok, "Posterior N(x̂, P)"],
            ]}
          />
          <Narration tone={phase === "post" && last ? "ok" : "active"}>{story}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Noise">
            <Tip content="Process noise: how much odometry slips each tick. Bigger Q → wider prior → trust GPS more.">
              <div>
                <SliderControl label="Process noise Q" value={Q} min={0.01} max={5} step={0.01} onChange={setQ} format={(v) => `${v.toFixed(2)} m²`} />
              </div>
            </Tip>
            <Tip content="Sensor noise: GPS variance. Bigger R → smaller K → trust the prediction more.">
              <div>
                <SliderControl label="Sensor noise R" value={R} min={0.01} max={10} step={0.01} onChange={setR} format={(v) => `${v.toFixed(2)} m²`} />
              </div>
            </Tip>
          </Panel>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={predict} disabled={phase === "prior"}>
              <StepForward /> Predict()
            </Button>
            <Button size="sm" variant="secondary" onClick={update} disabled={phase !== "prior"}>
              <Crosshair /> Update(z)
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw /> Reset
            </Button>
          </div>
          <StatGrid cols={3}>
            <Stat label="Gain K" value={Kshow !== undefined ? Kshow.toFixed(3) : "—"} tone="ok" hint="K = P⁻ / (P⁻ + R)" />
            <Stat label="Prior P⁻" value={last ? last.Pp.toFixed(3) : "—"} tone="active" />
            <Stat label="Post P" value={!last ? "1.000" : phase === "post" ? last.P.toFixed(3) : "—"} tone="ok" />
          </StatGrid>
          {phase === "post" && last && (
            <Badge variant="success">Uncertainty −{((1 - last.P / last.Pp) * 100).toFixed(0)}% in this update</Badge>
          )}
        </div>
      </Split>
      <ScrollArea orientation="both" className="max-h-64 rounded-lg border" viewportClassName="max-h-64">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>k</TableHead>
              <TableHead className="text-right">x̂⁻</TableHead>
              <TableHead className="text-right">P⁻</TableHead>
              <TableHead className="text-right">z</TableHead>
              <TableHead className="text-right">y = z − x̂⁻</TableHead>
              <TableHead className="text-right">K</TableHead>
              <TableHead className="text-right">x̂</TableHead>
              <TableHead className="text-right">P</TableHead>
              <TableHead className="text-right">true</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-3 text-center text-[12.5px] text-muted-foreground">
                  Chapter dry run: x̂₀ = 0, P₀ = 1, Q = 0.5, R = 1, z = [2.4, 3.6, 6.3, 7.8, 10.2]. Alternate Predict() and Update(z).
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i} className={cn(i === rows.length - 1 && "bg-viz-active/10")}>
                <TableCell className="py-1.5 font-mono text-[12.5px]">{r.k}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-active">{r.xp.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-active">{r.Pp.toFixed(3)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-warn">{r.z !== undefined ? r.z.toFixed(2) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{r.y !== undefined ? (r.y >= 0 ? "+" : "") + r.y.toFixed(2) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold">{r.K !== undefined ? r.K.toFixed(3) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-ok">{r.x !== undefined ? r.x.toFixed(2) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-ok">{r.P !== undefined ? r.P.toFixed(3) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-muted-foreground">{(2 * r.k).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: 2D robot — odometry prediction fused with GPS fixes          */
/* ------------------------------------------------------------------ */

const DT = 0.05, T_END = 120, OM = (2 * Math.PI) / 40;
const truthAt = (t) => [8 * Math.sin(OM * t), 4 * Math.sin(2 * OM * t)];
const velAt = (t) => [8 * OM * Math.cos(OM * t), 8 * OM * Math.cos(2 * OM * t)];

/**
 * Position KF: predict with odometry velocity  x̂⁻ = x̂ + u·Δt,  P⁻ = P + Q_k (Q along / 0.25Q across the direction of travel),
 * update with GPS  K = P⁻(P⁻ + R·I)⁻¹,  x̂ = x̂⁻ + K(z − x̂⁻),  P = (I − K)P⁻.
 */
function runFusion({ Q, R, gpsHz, gpsOn, seed = 7 }) {
  const rand = rng(seed);
  const every = Math.max(1, Math.round(1 / gpsHz / DT));
  let hd = 0;
  let odo = [0, 0];
  let x = [0, 0];
  let P = [0.5, 0, 0.5]; // [Pxx, Pxy, Pyy]
  const out = [];
  let lastK = null;
  for (let k = 0; k <= T_END / DT; k++) {
    const t = k * DT;
    const tr = truthAt(t);
    let gps = null;
    if (k > 0) {
      const vt = velAt(t);
      hd += 0.01 * Math.sqrt(DT) * gauss(rand) + 0.002 * DT; // odometry heading drifts
      const c = Math.cos(hd), s = Math.sin(hd);
      const u = [1.02 * (c * vt[0] - s * vt[1]) + 0.1 * gauss(rand), 1.02 * (s * vt[0] + c * vt[1]) + 0.1 * gauss(rand)]; // 2% scale error + noise
      odo = [odo[0] + u[0] * DT, odo[1] + u[1] * DT];
      // predict
      const th = Math.atan2(u[1], u[0]), ch = Math.cos(th), sh = Math.sin(th);
      const ql = Q * DT, qt = 0.25 * Q * DT;
      x = [x[0] + u[0] * DT, x[1] + u[1] * DT];
      P = [P[0] + ql * ch * ch + qt * sh * sh, P[1] + (ql - qt) * ch * sh, P[2] + ql * sh * sh + qt * ch * ch];
      const zg = [tr[0] + Math.sqrt(R) * gauss(rand), tr[1] + Math.sqrt(R) * gauss(rand)];
      if (k % every === 0) {
        gps = zg;
        if (gpsOn) {
          // S = P + R I ; K = P S⁻¹
          const S = [P[0] + R, P[1], P[2] + R];
          const det = S[0] * S[2] - S[1] * S[1];
          const Si = [S[2] / det, -S[1] / det, S[0] / det];
          const K = [P[0] * Si[0] + P[1] * Si[1], P[0] * Si[1] + P[1] * Si[2], P[1] * Si[0] + P[2] * Si[1], P[1] * Si[1] + P[2] * Si[2]]; // [Kxx, Kxy, Kyx, Kyy]
          const y = [zg[0] - x[0], zg[1] - x[1]];
          x = [x[0] + K[0] * y[0] + K[1] * y[1], x[1] + K[2] * y[0] + K[3] * y[1]];
          // P = (I − K) P
          P = [(1 - K[0]) * P[0] - K[1] * P[1], (1 - K[0]) * P[1] - K[1] * P[2], -K[2] * P[1] + (1 - K[3]) * P[2]];
          lastK = K;
        }
      }
    }
    out.push({ t, tr, odo, gps, x, P, K: lastK });
  }
  return out;
}

function covEllipse(P, k = 2) {
  const [a, b, d] = P;
  const m = (a + d) / 2, q = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  return { rx: k * Math.sqrt(m + q), ry: k * Math.sqrt(Math.max(m - q, 0)), deg: (0.5 * Math.atan2(2 * b, a - d) * 180) / Math.PI };
}

function TwoD() {
  const [Q, setQ] = useState(0.02);
  const [R, setR] = useState(1.5);
  const [gpsHz, setGpsHz] = useState(1);
  const [gpsOn, setGpsOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdxState] = useState(Math.round(T_END / DT));
  const idxRef = useRef(idx);
  const accRef = useRef(0);
  const setIdx = (i) => {
    idxRef.current = i;
    setIdxState(i);
  };
  const run = useMemo(() => runFusion({ Q, R, gpsHz, gpsOn }), [Q, R, gpsHz, gpsOn]);
  const N = run.length - 1;

  useAnimationFrame((dt) => {
    accRef.current += dt * 4; // 4x real time
    const steps = Math.floor(accRef.current / DT);
    accRef.current -= steps * DT;
    const ni = Math.min(N, idxRef.current + steps);
    if (ni >= N) setPlaying(false);
    setIdx(ni);
  }, playing);

  const cur = run[idx];
  const shown = run.slice(0, idx + 1);
  const rmse = (f) => Math.sqrt(shown.reduce((s, r) => s + f(r), 0) / shown.length);
  const errOdo = rmse((r) => (r.odo[0] - r.tr[0]) ** 2 + (r.odo[1] - r.tr[1]) ** 2);
  const errKf = rmse((r) => (r.x[0] - r.tr[0]) ** 2 + (r.x[1] - r.tr[1]) ** 2);
  const fixes = shown.filter((r) => r.gps);
  const errGps = fixes.length ? Math.sqrt(fixes.reduce((s, r) => s + (r.gps[0] - r.tr[0]) ** 2 + (r.gps[1] - r.tr[1]) ** 2, 0) / fixes.length) : NaN;

  const W = 560, H = 330, sc = 30;
  const P2 = (x, y) => [W / 2 + x * sc, H / 2 - y * sc];
  const pts = (key, step = 2) =>
    shown
      .filter((_, i) => i % step === 0 || i === shown.length - 1)
      .map((r) => P2(...r[key]).join(","))
      .join(" ");
  const ell = covEllipse(cur.P);
  const kfPx = P2(...cur.x);
  const lastFix = fixes[fixes.length - 1];
  const justFixed = cur.gps && gpsOn;

  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
              {Array.from({ length: 19 }, (_, i) => i - 9).map((m) => (
                <line key={`x${m}`} x1={P2(m, 0)[0]} x2={P2(m, 0)[0]} y1={0} y2={H} stroke={C.grid} opacity={m === 0 ? 1 : 0.45} />
              ))}
              {Array.from({ length: 11 }, (_, i) => i - 5).map((m) => (
                <line key={`y${m}`} y1={P2(0, m)[1]} y2={P2(0, m)[1]} x1={0} x2={W} stroke={C.grid} opacity={m === 0 ? 1 : 0.45} />
              ))}
              <polyline fill="none" stroke={C.ink} strokeWidth={1.6} opacity={0.7} points={pts("tr")} />
              <polyline fill="none" stroke={C.bad} strokeWidth={1.8} strokeDasharray="6 4" points={pts("odo")} />
              {fixes.slice(-40).map((r, i, a) => (
                <circle key={r.t} cx={P2(...r.gps)[0]} cy={P2(...r.gps)[1]} r={i === a.length - 1 ? 4.5 : 3} fill={C.warn} opacity={0.25 + (0.75 * (i + 1)) / a.length} />
              ))}
              <polyline fill="none" stroke={C.ok} strokeWidth={2.4} points={pts("x", 1)} />
              <ellipse cx={kfPx[0]} cy={kfPx[1]} rx={ell.rx * sc} ry={ell.ry * sc} transform={`rotate(${-ell.deg} ${kfPx[0]} ${kfPx[1]})`} fill={C.ok} fillOpacity={0.14} stroke={C.ok} strokeWidth={justFixed ? 3 : 1.5} />
              {lastFix && gpsOn && <line x1={kfPx[0]} y1={kfPx[1]} x2={P2(...lastFix.gps)[0]} y2={P2(...lastFix.gps)[1]} stroke={C.warn} strokeDasharray="2 3" opacity={0.6} />}
              <circle cx={P2(...cur.tr)[0]} cy={P2(...cur.tr)[1]} r={5} fill={C.fg} />
              <circle cx={P2(...cur.odo)[0]} cy={P2(...cur.odo)[1]} r={4.5} fill={C.bad} />
              <circle cx={kfPx[0]} cy={kfPx[1]} r={4.5} fill={C.ok} stroke={C.card} strokeWidth={1.5} />
              <text x={8} y={H - 8} fontSize={10.5} fill={C.muted}>
                grid = 1 m · t = {cur.t.toFixed(1)} s · green ellipse = 2σ of P
              </text>
            </svg>
          </Stage>
          <Legend
            items={[
              [C.ink, "Truth"],
              [C.bad, "Odometry only (dead reckoning)"],
              [C.warn, `GPS fixes (${gpsHz} Hz)`],
              [C.ok, "Kalman estimate + 2σ ellipse"],
            ]}
          />
          <Narration tone={gpsOn ? "default" : "warn"}>
            {gpsOn
              ? `Between fixes the filter predicts with odometry and the ellipse grows by Q·Δt each tick (longer along the direction of travel, where wheel slip acts). Each GPS fix shrinks it: K ≈ P/(P + R) with P ≈ ${cur.P[0].toFixed(3)} and R = ${R}${cur.K ? `, so K_xx = ${cur.K[0].toFixed(2)}` : ""}. RMSE: odometry ${errOdo.toFixed(2)} m, raw GPS ${Number.isFinite(errGps) ? errGps.toFixed(2) : "—"} m, Kalman ${errKf.toFixed(2)} m.${errOdo < errKf ? " So far odometry alone is better — its drift has not built up yet; keep driving and it grows without bound while the Kalman error stays bounded." : ""}`
              : `GPS updates are off: the filter is pure dead reckoning, identical to the red odometry path, and its covariance ellipse grows without bound (now ${ell.rx.toFixed(2)} m semi-axis).`}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Filter tuning">
            <Tip content="Process noise per second. Larger Q = trust odometry less: the estimate follows GPS more closely (and gets noisier).">
              <div>
                <SliderControl label="Process noise Q" value={Q} min={0.005} max={2} step={0.005} onChange={setQ} format={(v) => `${v.toFixed(3)} m²/s`} />
              </div>
            </Tip>
            <Tip content="GPS variance used to simulate fixes AND by the filter. Larger R = noisier fixes, smaller gain.">
              <div>
                <SliderControl label="GPS noise R" value={R} min={0.05} max={6} step={0.05} onChange={setR} format={(v) => `${v.toFixed(2)} m² (σ = ${Math.sqrt(v).toFixed(2)} m)`} />
              </div>
            </Tip>
            <SliderControl label="GPS rate" value={gpsHz} min={0.25} max={10} step={0.25} onChange={setGpsHz} format={(v) => `${v} Hz`} />
            <SwitchControl label="Enable GPS measurement updates" checked={gpsOn} onChange={setGpsOn} />
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimator</TableHead>
                <TableHead className="text-right">RMSE (m)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Odometry only", errOdo, C.bad],
                ["Raw GPS fixes", errGps, C.warn],
                ["Kalman fusion", errKf, C.ok],
              ].map(([n, v, col]) => (
                <TableRow key={n}>
                  <TableCell className="py-1.5 text-[12.5px]" style={{ color: col }}>
                    {n}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold tabular-nums">{Number.isFinite(v) ? v.toFixed(3) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <StatGrid cols={2}>
            <Stat label="P_xx, P_yy" value={`${cur.P[0].toFixed(2)}, ${cur.P[2].toFixed(2)}`} tone="ok" hint="Diagonal of the 2×2 position covariance (m²)" />
            <Stat label="K_xx" value={cur.K ? cur.K[0].toFixed(3) : "—"} tone="ok" hint="Gain on the x-innovation at the last GPS update" />
          </StatGrid>
        </div>
      </Split>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-2.5">
        <Button
          size="sm"
          className="w-24"
          onClick={() => {
            if (!playing && idxRef.current >= N) setIdx(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPlaying(false);
            setIdx(0);
          }}
        >
          <RotateCcw /> Reset
        </Button>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">t = {cur.t.toFixed(1)} / {T_END} s</span>
      </div>
      <Stage className="p-2">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kalman error ‖x̂ − x‖ inside its 2·√tr(P) envelope (m)</div>
        <LinePlot
          height={140}
          xDomain={[0, T_END]}
          series={[
            { data: shown.filter((_, i) => i % 2 === 0).map((r) => [r.t, 2 * Math.sqrt(r.P[0] + r.P[2])]), color: C.ok, dash: "5 4", width: 1.4 },
            { data: shown.filter((_, i) => i % 2 === 0).map((r) => [r.t, Math.hypot(r.x[0] - r.tr[0], r.x[1] - r.tr[1])]), color: C.active, width: 1.8 },
          ]}
          xLabel="time (s)"
        />
      </Stage>
    </div>
  );
}

export default function KalmanLab() {
  return (
    <LabShell
      title="Kalman Filter — Gaussian Fusion & 2D Sensor Fusion"
      description="Predict adds variance, update multiplies Gaussians. Step through the chapter's dry run, then fuse drifting odometry with noisy GPS on a moving robot."
      badges={["K = P/(P+R)", "Predict → Update", "RMSE"]}
    >
      <Tabs defaultValue="1d">
        <TabsList>
          <TabsTrigger value="1d">1D Gaussian multiplication</TabsTrigger>
          <TabsTrigger value="2d">2D odometry + GPS fusion</TabsTrigger>
        </TabsList>
        <TabsContent value="1d">
          <OneD />
        </TabsContent>
        <TabsContent value="2d">
          <TwoD />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
