import { useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Shuffle, StepForward, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, gauss, rng, useAnimationFrame } from "@/viz/kit";

const pdf = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s)) / Math.sqrt(2 * Math.PI * s * s);
const BANDS = [
  [3, C.bad, "99.73%"],
  [2, C.warn, "95.45%"],
  [1, C.ok, "68.27%"],
];

/** Bell curve with shaded kσ bands and an optional density-normalised histogram. */
function BellPlot({ curves, xDomain, yMax = 2, hist, bands, markers = [] }) {
  const W = 560, H = 230, pad = { l: 36, r: 10, t: 12, b: 26 };
  const [x0, x1] = xDomain;
  const sx = (x) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - Math.min(y, yMax) / yMax) * (H - pad.t - pad.b);
  const path = (mu, s, lo = x0, hi = x1, closed = false) => {
    const n = 160, pts = [];
    for (let i = 0; i <= n; i++) {
      const x = lo + ((hi - lo) * i) / n;
      pts.push(`${sx(x).toFixed(1)},${sy(pdf(x, mu, s)).toFixed(1)}`);
    }
    return closed ? `M ${sx(lo)},${sy(0)} L ${pts.join(" L ")} L ${sx(hi)},${sy(0)} Z` : `M ${pts.join(" L ")}`;
  };
  const ticks = 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {Array.from({ length: ticks + 1 }, (_, k) => {
        const x = x0 + ((x1 - x0) * k) / ticks;
        return (
          <g key={k}>
            <line x1={sx(x)} x2={sx(x)} y1={pad.t} y2={H - pad.b} stroke={C.grid} />
            <text x={sx(x)} y={H - 10} fontSize={10} textAnchor="middle" fill={C.muted}>
              {x.toFixed(1)}
            </text>
          </g>
        );
      })}
      {[0, yMax / 2, yMax].map((y) => (
        <text key={y} x={pad.l - 5} y={sy(y) + 3} fontSize={10} textAnchor="end" fill={C.muted}>
          {y.toFixed(1)}
        </text>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} stroke={C.muted} />
      {bands &&
        BANDS.map(([k, col]) => <path key={k} d={path(bands.mu, bands.s, Math.max(x0, bands.mu - k * bands.s), Math.min(x1, bands.mu + k * bands.s), true)} fill={col} opacity={0.22} />)}
      {hist &&
        hist.bins.map((b, i) => (
          <rect key={i} x={sx(b.x0) + 0.5} y={sy(b.d)} width={Math.max(0, sx(b.x1) - sx(b.x0) - 1)} height={Math.max(0, sy(0) - sy(b.d))} fill={C.active} opacity={0.35} />
        ))}
      {curves.map((c, i) => (
        <path key={i} d={path(c.mu, c.s)} fill="none" stroke={c.color ?? C.fg} strokeWidth={c.width ?? 2.2} opacity={c.opacity ?? 1} strokeDasharray={c.dash} />
      ))}
      {curves.some((c) => pdf(c.mu, c.mu, c.s) > yMax) && (
        <text x={W - pad.r} y={pad.t + 10} fontSize={10} textAnchor="end" fill={C.warn}>
          peak {Math.max(...curves.map((c) => pdf(c.mu, c.mu, c.s))).toFixed(2)} (clipped)
        </text>
      )}
      {markers.map((m, i) => (
        <g key={i}>
          <line x1={sx(m.x)} x2={sx(m.x)} y1={pad.t} y2={sy(0)} stroke={m.color} strokeDasharray="4 3" />
          <text x={sx(m.x) + 3} y={pad.t + 10 + 12 * i} fontSize={10} fill={m.color}>
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: 1D Gaussian and Monte Carlo sampling                          */
/* ------------------------------------------------------------------ */

function OneD() {
  const [mu, setMu] = useState(5);
  const [sigma, setSigma] = useState(0.8);
  const [bands, setBands] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [, setFrame] = useState(0);
  const pool = useRef({ z: [], rand: rng(3) }); // standard normals; x = μ + σ z

  const draw = (n) => {
    const P = pool.current;
    for (let i = 0; i < n && P.z.length < 20000; i++) P.z.push(gauss(P.rand));
    setFrame((f) => f + 1);
  };
  useAnimationFrame(() => {
    draw(8);
    if (pool.current.z.length >= 20000) setPlaying(false);
  }, playing);

  const z = pool.current.z;
  const N = z.length;
  const nb = 32, lo = mu - 4 * sigma, w = (8 * sigma) / nb;
  const counts = new Array(nb).fill(0);
  let in1 = 0, in2 = 0, in3 = 0, sum = 0, sum2 = 0;
  for (const v of z) {
    const a = Math.abs(v);
    if (a <= 1) in1++;
    if (a <= 2) in2++;
    if (a <= 3) in3++;
    const b = Math.floor((v + 4) / (8 / nb));
    if (b >= 0 && b < nb) counts[b]++;
    sum += v;
    sum2 += v * v;
  }
  const hist = { bins: counts.map((c, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, d: N ? c / (N * w) : 0 })) };
  const mean = N ? mu + sigma * (sum / N) : NaN;
  const sd = N > 1 ? sigma * Math.sqrt((sum2 - (sum * sum) / N) / (N - 1)) : NaN;
  const pct = (c) => (N ? ((100 * c) / N).toFixed(1) : "—");

  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <BellPlot xDomain={[0, 10]} yMax={1.2} curves={[{ mu, s: sigma }]} hist={N ? hist : null} bands={bands ? { mu, s: sigma } : null} markers={[{ x: mu, color: C.active, label: `μ = ${mu.toFixed(2)}` }]} />
        </Stage>
        <Legend
          items={[
            [C.ok, "μ ± 1σ (68.27%)"],
            [C.warn, "μ ± 2σ (95.45%)"],
            [C.bad, "μ ± 3σ (99.73%)"],
            [C.active, `Histogram of ${N} samples`],
          ]}
        />
        <Narration tone={N > 1000 ? "ok" : "default"}>
          {N === 0
            ? "Press Play to rain sensor readings onto the axis. Each reading is μ + σ·(standard normal noise)."
            : `After ${N} readings the histogram ${N > 1000 ? "has converged onto" : "is starting to trace"} the bell curve. ${pct(in1)}% landed within ±1σ, ${pct(in2)}% within ±2σ, ${pct(in3)}% within ±3σ — the 68–95–99.7 rule. A reading outside [${(mu - 3 * sigma).toFixed(2)}, ${(mu + 3 * sigma).toFixed(2)}] m would be rejected by a 3σ gate.`}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Distribution N(μ, σ²)">
          <SliderControl label="Mean μ" value={mu} min={2} max={8} step={0.05} onChange={setMu} format={(v) => `${v.toFixed(2)} m`} />
          <SliderControl label="Std dev σ" value={sigma} min={0.05} max={2} step={0.01} onChange={setSigma} format={(v) => `${v.toFixed(2)} m`} />
          <SwitchControl label="Show 1σ / 2σ / 3σ bands" checked={bands} onChange={setBands} />
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">σ² = {(sigma * sigma).toFixed(3)} m²</Badge>
            <Badge variant="outline">peak = {pdf(mu, mu, sigma).toFixed(3)}</Badge>
            <Badge variant="warning">
              3σ gate [{(mu - 3 * sigma).toFixed(2)}, {(mu + 3 * sigma).toFixed(2)}]
            </Badge>
          </div>
        </Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interval</TableHead>
              <TableHead className="text-right">Theory</TableHead>
              <TableHead className="text-right">Sampled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["μ ± 1σ", "68.27%", pct(in1), C.ok],
              ["μ ± 2σ", "95.45%", pct(in2), C.warn],
              ["μ ± 3σ", "99.73%", pct(in3), C.bad],
            ].map(([k, th, s, col]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5 font-mono text-[12.5px]" style={{ color: col }}>
                  {k}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{th}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold">{s === "—" ? s : `${s}%`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <StatGrid cols={2}>
          <Stat label="Sample mean" value={N ? mean.toFixed(3) : "—"} tone="active" hint="Converges to μ as N grows" />
          <Stat label="Sample σ" value={N > 1 ? sd.toFixed(3) : "—"} tone="active" hint="Converges to σ as N grows" />
        </StatGrid>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="w-24" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => draw(100)}>
            <Sparkles /> Draw 100
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pool.current = { z: [], rand: rng(3) };
              setPlaying(false);
              setFrame((f) => f + 1);
            }}
          >
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: dead-reckoning variance growth σ_k² = k σ²_step              */
/* ------------------------------------------------------------------ */

const WALKERS = 300;
function Drift() {
  const [k, setK] = useState(1);
  const [sStep, setSStep] = useState(0.2);
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0);
  // Monte Carlo robots: cumulative sums of N(1, σ_step²) steps (seeded)
  const walks = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: WALKERS }, () => {
      let x = 0;
      return Array.from({ length: 50 }, () => (x += gauss(r)));
    });
  }, []);
  useAnimationFrame((dt) => {
    acc.current += dt;
    if (acc.current > 0.35) {
      acc.current = 0;
      if (k >= 50) setPlaying(false);
      else setK(k + 1);
    }
  }, playing);

  const sk = Math.sqrt(k) * sStep;
  const lo = Math.max(0, k - 4.5 * Math.max(sk, 0.5)), hi = k + 4.5 * Math.max(sk, 0.5);
  const pos = walks.map((w) => k + sStep * w[k - 1]);
  const ghosts = [1, 4, 9, 16, 25, 36, 49].filter((g) => g < k && g >= lo);

  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <BellPlot
            xDomain={[lo, hi]}
            yMax={2.1}
            curves={[...ghosts.map((g) => ({ mu: g, s: Math.sqrt(g) * sStep, color: C.muted, width: 1.4, opacity: 0.6, dash: "4 3" })), { mu: k, s: sk, color: C.active, width: 2.6 }]}
            bands={{ mu: k, s: sk }}
            markers={[{ x: k, color: C.active, label: `μ_k = ${k}.0 m` }]}
          />
          <svg viewBox="0 0 560 26" className="w-full">
            {pos.map((x, i) => (
              <circle key={i} cx={36 + ((x - lo) / (hi - lo)) * 514} cy={8 + (i % 4) * 4} r={1.8} fill={C.purple} opacity={x >= lo && x <= hi ? 0.6 : 0} />
            ))}
          </svg>
        </Stage>
        <Legend
          items={[
            [C.active, `Belief after k = ${k} steps`],
            [C.muted, "Earlier beliefs (k = 1, 4, 9, …)"],
            [C.purple, `${WALKERS} simulated robots`],
          ]}
        />
        <Narration>
          Each 1 m odometry step adds an independent N(1, {(sStep * sStep).toFixed(3)}) error, and variances of independent Gaussians add: σ_k² = k·σ²_step ={" "}
          {(k * sStep * sStep).toFixed(3)} m², so σ_k = √k·σ_step = {sk.toFixed(3)} m. The peak drops from {pdf(0, 0, sStep).toFixed(2)} to {pdf(0, 0, sk).toFixed(2)}: without an
          external fix, uncertainty grows forever.
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Dead reckoning">
          <SliderControl label="Odometry steps k" value={k} min={1} max={50} step={1} onChange={setK} format={(v) => `${v}`} />
          <SliderControl label="Per-step σ_step" value={sStep} min={0.05} max={0.5} step={0.01} onChange={setSStep} format={(v) => `${v.toFixed(2)} m`} />
        </Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>k</TableHead>
              <TableHead className="text-right">σ_k²</TableHead>
              <TableHead className="text-right">σ_k</TableHead>
              <TableHead className="text-right">3σ interval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 4, 25, k].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((g) => (
              <TableRow key={g} className={g === k ? "bg-viz-active/10" : undefined}>
                <TableCell className="py-1.5 font-mono text-[12.5px]">{g}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{(g * sStep * sStep).toFixed(3)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{(Math.sqrt(g) * sStep).toFixed(3)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12px]">
                  [{(g - 3 * Math.sqrt(g) * sStep).toFixed(2)}, {(g + 3 * Math.sqrt(g) * sStep).toFixed(2)}]
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="w-24" onClick={() => (k >= 50 ? (setK(1), setPlaying(true)) : setPlaying((p) => !p))}>
            {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Drive"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setK((v) => Math.min(50, v + 1))}>
            <StepForward /> Drive 1 step
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              setK(1);
            }}
          >
            <RotateCcw /> Reset belief
          </Button>
        </div>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3: 2D covariance ellipses                                       */
/* ------------------------------------------------------------------ */

/** Eigen-decomposition of a symmetric 2x2 [[a, b], [b, d]]. */
function eig2(a, b, d) {
  const m = (a + d) / 2, q = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  const l1 = m + q, l2 = m - q;
  const ang = 0.5 * Math.atan2(2 * b, a - d); // direction of the major axis
  return { l1, l2, ang, v1: [Math.cos(ang), Math.sin(ang)], v2: [-Math.sin(ang), Math.cos(ang)] };
}
const PRESETS2 = [
  { label: "A: uncorrelated", v: [4, 1, 0] },
  { label: "B: tilted 45°", v: [2.5, 2.5, 0.6] },
  { label: "Dry-run Σ", v: [1.25, 2, 1.5 / Math.sqrt(1.25 * 2)] },
];
const DRY = [
  [1, 2],
  [2, 4],
  [3, 4],
  [4, 6],
];

function TwoD() {
  const [sxx, setSxx] = useState(2.5);
  const [syy, setSyy] = useState(2.5);
  const [rho, setRho] = useState(0.6);
  const [axes, setAxes] = useState(true);
  const [dry, setDry] = useState(false);
  const [seed, setSeed] = useState(9);
  const sx = Math.sqrt(sxx), sy = Math.sqrt(syy), sxy = rho * sx * sy;
  const det = sxx * syy - sxy * sxy;
  const E = eig2(sxx, sxy, syy);
  const zs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 300 }, () => [gauss(r), gauss(r)]);
  }, [seed]);
  // Cholesky: x = L z with L = [[σx, 0], [ρσy, σy√(1−ρ²)]]
  const pts = zs.map(([a, b]) => [sx * a, rho * sy * a + sy * Math.sqrt(1 - rho * rho) * b]);
  const inside = [1, 2, 3].map((k) => pts.filter(([x, y]) => (syy * x * x - 2 * sxy * x * y + sxx * y * y) / det <= k * k).length / pts.length);

  const S = 380, c = S / 2, sc = c / 7.2; // ±7.2 m visible
  const P = (x, y) => [c + x * sc, c - y * sc];
  const deg = (E.ang * 180) / Math.PI;

  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[460px] font-mono">
            {Array.from({ length: 15 }, (_, i) => i - 7).map((m) => (
              <g key={m}>
                <line x1={P(m, 0)[0]} x2={P(m, 0)[0]} y1={0} y2={S} stroke={C.grid} opacity={m === 0 ? 1 : 0.5} />
                <line y1={P(0, m)[1]} y2={P(0, m)[1]} x1={0} x2={S} stroke={C.grid} opacity={m === 0 ? 1 : 0.5} />
              </g>
            ))}
            {pts.map(([x, y], i) => (
              <circle key={i} cx={P(x, y)[0]} cy={P(x, y)[1]} r={2.2} fill={C.active} opacity={0.55} />
            ))}
            {BANDS.map(([k, col]) => (
              <ellipse key={k} cx={c} cy={c} rx={k * Math.sqrt(E.l1) * sc} ry={k * Math.sqrt(Math.max(E.l2, 0)) * sc} transform={`rotate(${-deg} ${c} ${c})`} fill="none" stroke={col} strokeWidth={2} />
            ))}
            {axes &&
              [
                [E.v1, E.l1, C.purple, "λ₁"],
                [E.v2, E.l2, C.warn, "λ₂"],
              ].map(([v, l, col, name]) => {
                const e = P(v[0] * Math.sqrt(l), v[1] * Math.sqrt(l));
                return (
                  <g key={name}>
                    <line x1={c} y1={c} x2={e[0]} y2={e[1]} stroke={col} strokeWidth={3} />
                    <circle cx={e[0]} cy={e[1]} r={3.5} fill={col} />
                    <text x={e[0] + 6} y={e[1] - 6} fontSize={12} fill={col} fontWeight={700}>
                      √{name}
                    </text>
                  </g>
                );
              })}
            {dry &&
              DRY.map(([x, y], i) => {
                const p = P(x - 2.5, y - 4);
                return <rect key={i} x={p[0] - 5} y={p[1] - 5} width={10} height={10} fill="none" stroke={C.fg} strokeWidth={2} />;
              })}
            <text x={8} y={S - 8} fontSize={10.5} fill={C.muted}>
              grid = 1 m · centred on μ
            </text>
          </svg>
        </Stage>
        <Legend
          items={[
            [C.ok, `1σ ellipse (${(inside[0] * 100).toFixed(0)}% of dots, theory 39.3%)`],
            [C.warn, `2σ (${(inside[1] * 100).toFixed(0)}%, theory 86.5%)`],
            [C.bad, `3σ (${(inside[2] * 100).toFixed(0)}%, theory 98.9%)`],
          ]}
        />
        <Narration>
          σ_xy = ρ·σ_x·σ_y = {sxy.toFixed(3)}. The eigenvectors of Σ are the ellipse axes and the eigenvalues are the variances along them: λ₁ = {E.l1.toFixed(3)}, λ₂ = {E.l2.toFixed(3)} m².{" "}
          {Math.abs(rho) < 0.02 ? "With ρ = 0 the ellipse is axis-aligned: knowing x tells you nothing about y." : `ρ ${rho > 0 ? "> 0 tilts the ellipse SW↔NE" : "< 0 tilts it NW↔SE"} (${deg.toFixed(1)}°): an error in x predicts an error in y.`} Note
          that in 2D only 39% of samples fall inside the 1σ ellipse, not 68%.
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Covariance Σ">
          <SliderControl label="Variance σ_xx²" value={sxx} min={0.2} max={5} step={0.05} onChange={setSxx} format={(v) => `${v.toFixed(2)} m²`} />
          <SliderControl label="Variance σ_yy²" value={syy} min={0.2} max={5} step={0.05} onChange={setSyy} format={(v) => `${v.toFixed(2)} m²`} />
          <SliderControl label="Correlation ρ_xy" value={rho} min={-0.95} max={0.95} step={0.01} onChange={setRho} format={(v) => v.toFixed(2)} />
          <SwitchControl label="Show eigenvector principal axes" checked={axes} onChange={setAxes} />
          <SwitchControl label="Overlay the 4 dry-run samples (centred)" checked={dry} onChange={setDry} />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS2.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="xs"
                onClick={() => {
                  setSxx(p.v[0]);
                  setSyy(p.v[1]);
                  setRho(Math.round(p.v[2] * 100) / 100);
                  if (p.label.startsWith("Dry")) setDry(true);
                }}
              >
                {p.label}
              </Button>
            ))}
            <Button variant="ghost" size="xs" onClick={() => setSeed((s) => s + 1)}>
              <Shuffle /> New samples
            </Button>
          </div>
        </Panel>
        <div className="rounded-lg border bg-background/50 p-3 font-mono text-[13px]">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-sans">Σ (m²)</div>
          <div className="grid w-fit grid-cols-2 gap-x-5 border-x-2 border-foreground/50 px-3 tabular-nums">
            <span>{sxx.toFixed(3)}</span>
            <span>{sxy.toFixed(3)}</span>
            <span>{sxy.toFixed(3)}</span>
            <span>{syy.toFixed(3)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 font-sans">
            <Badge variant={det > 0 ? "success" : "danger"}>det Σ = {det.toFixed(3)} &gt; 0</Badge>
            <Badge variant="outline">tilt {deg.toFixed(1)}°</Badge>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Axis</TableHead>
              <TableHead className="text-right">λ (m²)</TableHead>
              <TableHead className="text-right">√λ (m)</TableHead>
              <TableHead className="text-right">eigenvector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["major", E.l1, E.v1, C.purple],
              ["minor", E.l2, E.v2, C.warn],
            ].map(([n, l, v, col]) => (
              <TableRow key={n}>
                <TableCell className="py-1.5 text-[12.5px]" style={{ color: col }}>
                  {n}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{l.toFixed(3)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{Math.sqrt(Math.max(l, 0)).toFixed(3)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12px]">
                  [{v[0].toFixed(2)}, {v[1].toFixed(2)}]
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Split>
  );
}

export default function GaussianLab() {
  return (
    <LabShell
      title="Gaussian Sensor Noise & Covariance Ellipses"
      description="Rain samples onto a bell curve, watch dead-reckoning variance add up, then reshape a 2×2 covariance matrix and its eigen-axis ellipses."
      badges={["N(μ, σ²)", "68–95–99.7", "Σ eigenvectors"]}
    >
      <Tabs defaultValue="1d">
        <TabsList>
          <TabsTrigger value="1d">1D bell curve</TabsTrigger>
          <TabsTrigger value="drift">Odometry drift</TabsTrigger>
          <TabsTrigger value="2d">2D covariance</TabsTrigger>
        </TabsList>
        <TabsContent value="1d">
          <OneD />
        </TabsContent>
        <TabsContent value="drift">
          <Drift />
        </TabsContent>
        <TabsContent value="2d">
          <TwoD />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
