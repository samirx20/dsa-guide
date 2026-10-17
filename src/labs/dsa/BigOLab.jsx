import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper,
} from "@/viz/kit";

/* ================================================================== */
/* variant "growth"                                                    */
/* ================================================================== */

const LN10 = Math.log(10);
function log10Fact(n) {
  if (n < 2) return 0;
  if (n <= 170) {
    let s = 0;
    for (let k = 2; k <= n; k++) s += Math.log10(k);
    return s;
  }
  return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / LN10; // Stirling
}

/** Each class returns log10(operation count); -Infinity means 0 ops. */
const CLASSES = [
  { key: "1", name: "O(1)", label: "Constant", ex: "array index", color: C.ok, l: () => 0 },
  { key: "log", name: "O(log N)", label: "Logarithmic", ex: "binary search", color: C.active, l: (n) => (n > 1 ? Math.log10(Math.log2(n)) : -Infinity) },
  { key: "n", name: "O(N)", label: "Linear", ex: "single loop", color: C.purple, l: (n) => Math.log10(n) },
  { key: "nlogn", name: "O(N log N)", label: "Linearithmic", ex: "std::sort", color: C.warn, l: (n) => (n > 1 ? Math.log10(n) + Math.log10(Math.log2(n)) : -Infinity) },
  { key: "n2", name: "O(N²)", label: "Quadratic", ex: "nested loops", color: C.bad, l: (n) => 2 * Math.log10(n) },
  { key: "2n", name: "O(2ᴺ)", label: "Exponential", ex: "all subsets", color: C.bad, dash: "6 4", l: (n) => n * Math.log10(2) },
  { key: "fact", name: "O(N!)", label: "Factorial", ex: "all permutations", color: C.ink, dash: "2 4", l: (n) => log10Fact(n) },
];

const sliderToN = (p) => Math.max(2, Math.round(10 ** (0.3 + (p / 100) * 5.7)));

function fmtOps(l) {
  if (l === -Infinity) return "0";
  if (l < 15) return Math.round(10 ** l).toLocaleString();
  return `10^${Math.floor(l)}`;
}
function fmtTime(l) {
  const sec = l === -Infinity ? 0 : 10 ** (l - 8);
  if (l - 8 > 17) return "longer than the universe";
  if (sec < 1e-6) return "< 1 µs";
  if (sec < 1e-3) return `${(sec * 1e6).toFixed(0)} µs`;
  if (sec < 1) return `${(sec * 1e3).toFixed(0)} ms`;
  if (sec < 120) return `${sec.toFixed(1)} s`;
  if (sec < 7200) return `${(sec / 60).toFixed(0)} min`;
  if (sec < 86400 * 365) return `${(sec / 3600).toFixed(0)} h`;
  return `${(sec / (86400 * 365)).toExponential(1)} years`;
}

function GrowthPlot({ N, logScale, visible }) {
  const W = 600, H = 270, pl = 54, pr = 92, pt = 12, pb = 30;
  const yMax = logScale ? Math.max(3, Math.ceil(2 * Math.log10(N) + 1)) : Math.max(10, 4 * N);
  const sx = (x) => pl + ((x - 1) / (N - 1)) * (W - pl - pr);
  const sy = (y) => pt + (1 - y / yMax) * (H - pt - pb);
  const xs = Array.from({ length: 161 }, (_, k) => 1 + ((N - 1) * k) / 160);
  if (N <= 160) for (let k = 1; k <= N; k++) xs.push(k);
  xs.sort((a, b) => a - b);
  const ticks = 4;
  const labels = [];
  const paths = CLASSES.filter((c) => visible[c.key]).map((c) => {
    const pts = [];
    let off = false;
    for (const x of xs) {
      const lv = c.key === "fact" ? c.l(Math.floor(x)) : c.l(x);
      const v = logScale ? Math.max(lv, 0) : lv === -Infinity ? 0 : lv > 300 ? Infinity : 10 ** lv;
      if (v > yMax) {
        pts.push([sx(x), sy(yMax)]);
        off = true;
        break;
      }
      pts.push([sx(x), sy(v)]);
    }
    const end = pts.at(-1);
    labels.push({ c, x: end[0], y: end[1], off });
    return { c, d: pts.map((p) => p.join(",")).join(" ") };
  });
  // nudge right-edge labels apart
  const edge = labels.filter((l) => !l.off).sort((a, b) => a.y - b.y);
  for (let k = 1; k < edge.length; k++) if (edge[k].y - edge[k - 1].y < 12) edge[k].y = edge[k - 1].y + 12;
  // stack labels of curves that leave the top so they don't overlap
  const offs = labels.filter((l) => l.off).sort((a, b) => a.x - b.x);
  offs.forEach((l, k) => {
    l.ty = pt + 10 + (k > 0 && l.x - offs[k - 1].x < 70 ? (offs[k - 1].ty - pt - 10 + 13) : 0);
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {Array.from({ length: ticks + 1 }, (_, k) => {
        const y = (yMax * k) / ticks;
        return (
          <g key={k}>
            <line x1={pl} x2={W - pr} y1={sy(y)} y2={sy(y)} stroke={C.grid} />
            <text x={pl - 6} y={sy(y) + 3} textAnchor="end" fontSize={10} fill={C.muted}>
              {logScale ? `10^${y.toFixed(y % 1 ? 1 : 0)}` : y >= 1e4 ? y.toExponential(0) : Math.round(y)}
            </text>
          </g>
        );
      })}
      <text x={pl} y={H - 6} fontSize={10} fill={C.muted}>N = 1</text>
      <text x={W - pr} y={H - 6} fontSize={10} fill={C.muted} textAnchor="end">N = {N.toLocaleString()}</text>
      <text x={(pl + W - pr) / 2} y={H - 6} fontSize={10} fill={C.muted} textAnchor="middle">input size N →</text>
      {paths.map(({ c, d }) => (
        <polyline key={c.key} points={d} fill="none" stroke={c.color} strokeWidth={2.2} strokeDasharray={c.dash} strokeLinejoin="round" />
      ))}
      {labels.map(({ c, x, y, off }) => (
        <text key={c.key} x={off ? x + 4 : x + 6} y={off ? labels.find((l) => l.c === c).ty : y + 4} fontSize={10.5} fill={c.color} fontWeight={600}>
          {c.name}{off ? " ↑" : ""}
        </text>
      ))}
    </svg>
  );
}

function GrowthVariant() {
  const [p, setP] = useState(20);
  const [logScale, setLogScale] = useState(false);
  const [visible, setVisible] = useState(() => Object.fromEntries(CLASSES.map((c) => [c.key, true])));
  const N = sliderToN(p);
  const rows = CLASSES.map((c) => ({ c, l: c.l(N) }));
  const fits = rows.filter((r) => r.l - 8 <= 0).at(-1);
  return (
    <LabShell
      title="Big-O Growth Race"
      description="Drag N and watch the curves separate. At small N everything looks fast; by N = 10⁵ only the bottom of the hierarchy survives a 1-second time limit."
      badges={["~10⁸ simple ops / second", "drop constants"]}
    >
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <GrowthPlot N={N} logScale={logScale} visible={visible} />
          </Stage>
          <Narration tone={N >= 1e5 ? "warn" : "default"}>
            At N = {N.toLocaleString()}, the slowest class that still runs in about a second is <b>{fits?.c.name ?? "none"}</b>.{" "}
            {logScale
              ? "The log-scale y-axis squeezes every power of 10 into the same height so you can compare classes that differ by billions."
              : "On a linear axis O(N²) and the exponentials leave the chart almost immediately; flip on log scale to keep them in view."}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Controls">
            <SliderControl label="Input size N" value={p} min={0} max={100} step={1} onChange={setP} format={() => N.toLocaleString()} />
            <SwitchControl label="Log-scale y-axis" checked={logScale} onChange={setLogScale} id="bigo-log" />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="N" value={N.toLocaleString()} tone="active" />
            <Stat label="N² ops" value={fmtOps(2 * Math.log10(N))} tone="bad" />
          </StatGrid>
        </div>
      </Split>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Class</TableHead>
            <TableHead className="hidden sm:table-cell">Example</TableHead>
            <TableHead className="text-right">Ops at N</TableHead>
            <TableHead className="text-right">Time @ 10⁸/s</TableHead>
            <TableHead className="text-right">Verdict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ c, l }) => {
            const t = l - 8;
            return (
              <TableRow key={c.key}>
                <TableCell className="py-1.5">
                  <Checkbox checked={visible[c.key]} onCheckedChange={(v) => setVisible((o) => ({ ...o, [c.key]: !!v }))} aria-label={`Show ${c.name}`} />
                </TableCell>
                <TableCell className="py-1.5 font-mono text-[12.5px] font-semibold" style={{ color: c.color }}>{c.name}</TableCell>
                <TableCell className="hidden py-1.5 text-[12px] text-muted-foreground sm:table-cell">{c.ex}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px] tabular-nums">{fmtOps(l)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{fmtTime(l)}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <Badge variant={t <= 0 ? "success" : t <= 1 ? "warning" : "danger"}>{t <= 0 ? "OK" : t <= 1 ? "slow" : "TLE"}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </LabShell>
  );
}

/* ================================================================== */
/* variant "loops"                                                     */
/* ================================================================== */

const SNIPPETS = {
  single: {
    label: "Single loop — O(N)",
    big: "O(N)",
    code: `for (int i = 0; i < n; i++) {
    ops++;               // O(1) work
}`,
    f: (n) => n,
  },
  consecutive: {
    label: "Consecutive loops — O(2N) = O(N)",
    big: "O(N)",
    code: `for (int i = 0; i < n; i++)
    ops++;
for (int j = 0; j < n; j++)
    ops++;`,
    f: (n) => 2 * n,
  },
  nested: {
    label: "Nested loops — O(N²)",
    big: "O(N²)",
    code: `for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        ops++;`,
    f: (n) => n * n,
  },
  triangle: {
    label: "Nested, j = i + 1 — O(N²/2) = O(N²)",
    big: "O(N²)",
    code: `for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++)
        ops++;`,
    f: (n) => (n * (n - 1)) / 2,
  },
  doubling: {
    label: "Doubling i *= 2 — O(log N)",
    big: "O(log N)",
    code: `int i = 1;
while (i < n) {
    ops++;
    i = i * 2;
}`,
    f: (n) => (n > 1 ? Math.ceil(Math.log2(n)) : 0),
  },
};

function loopSteps(kind, n) {
  const s = [];
  let ops = 0;
  const push = (o) => s.push({ ops, ...o });
  push({ line: 1, note: `n = ${n}. Count how many times the O(1) body runs.`, tone: "default", cells: [] });
  const cells = [];
  if (kind === "single" || kind === "consecutive") {
    const loops = kind === "single" ? 1 : 2;
    for (let L = 0; L < loops; L++)
      for (let i = 0; i < n; i++) {
        ops++;
        cells.push([L, i]);
        push({ line: L === 0 ? 2 : 4, i, row: L, cells: [...cells], note: `${L === 0 ? "i" : "j"} = ${i}: ops = ${ops}.`, tone: "active" });
      }
  } else if (kind === "nested" || kind === "triangle") {
    for (let i = 0; i < n; i++) {
      const j0 = kind === "triangle" ? i + 1 : 0;
      if (j0 >= n) push({ line: 2, i, cells: [...cells], note: `i = ${i}: inner loop starts at j = ${j0} ≥ n, so it runs 0 times.`, tone: "default" });
      for (let j = j0; j < n; j++) {
        ops++;
        cells.push([i, j]);
        push({ line: 3, i, j, cells: [...cells], note: `i = ${i}, j = ${j}: ops = ${ops}. Row ${i} does ${n - j0} inner iteration${n - j0 === 1 ? "" : "s"}.`, tone: "active" });
      }
    }
  } else {
    let i = 1;
    while (i < n) {
      ops++;
      cells.push([0, i]);
      push({ line: 3, i, cells: [...cells], note: `i = ${i} < ${n}: ops = ${ops}. Next i = ${i * 2} — the distance to n halves each time.`, tone: "active" });
      i *= 2;
    }
    push({ line: 2, i, cells: [...cells], note: `i = ${i} ≥ ${n}: loop exits.`, tone: "default" });
  }
  push({ line: kind === "doubling" ? 5 : 1, cells: [...cells], done: true, note: `Total: ${ops} operations for n = ${n} → ${SNIPPETS[kind].big}.`, tone: "ok" });
  return s;
}

function LoopGrid({ kind, n, step }) {
  const grid = kind === "nested" || kind === "triangle";
  const rows = grid ? n : kind === "consecutive" ? 2 : 1;
  const cols = kind === "doubling" ? n + 1 : n;
  const W = 560, cw = Math.min(34, (W - 40) / cols), H = rows * cw + 30;
  const visited = new Set(step.cells.map(([r, c]) => `${r},${c}`));
  const last = step.cells.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const v = visited.has(`${r},${c}`);
          const cur = !step.done && last && last[0] === r && last[1] === c;
          const skip = kind === "triangle" && c <= r;
          const dim = kind === "doubling" && c === 0;
          return (
            <rect
              key={`${r}-${c}`}
              x={30 + c * cw + 1}
              y={6 + r * cw + 1}
              width={cw - 2}
              height={cw - 2}
              rx={3}
              fill={cur ? C.active : v ? C.ok : C.fill}
              fillOpacity={cur ? 0.85 : v ? 0.45 : skip || dim ? 0.15 : 0.6}
              stroke={cur ? C.active : C.border}
              strokeWidth={0.8}
            />
          );
        })
      )}
      {grid && Array.from({ length: rows }, (_, r) => <text key={r} x={24} y={6 + r * cw + cw / 2 + 3} fontSize={9.5} textAnchor="end" fill={C.muted}>{cw >= 14 ? `i=${r}` : r}</text>)}
      {!grid && kind === "consecutive" && ["i", "j"].map((t, r) => <text key={t} x={24} y={6 + r * cw + cw / 2 + 3} fontSize={10} textAnchor="end" fill={C.muted}>{t}</text>)}
      {kind === "doubling" && Array.from({ length: cols }, (_, c) => (c & (c - 1)) === 0 && c > 0 && <text key={c} x={30 + c * cw + cw / 2} y={rows * cw + 22} fontSize={9.5} textAnchor="middle" fill={C.muted}>{c}</text>)}
    </svg>
  );
}

function OpsChart({ kind, n }) {
  const W = 300, H = 120, p = 26;
  const maxN = 16;
  const f = SNIPPETS[kind].f;
  const yMax = Math.max(f(maxN), maxN);
  const sx = (x) => p + ((x - 1) / (maxN - 1)) * (W - p - 8);
  const sy = (y) => 8 + (1 - y / yMax) * (H - 8 - 20);
  const pts = (g) => Array.from({ length: maxN }, (_, k) => `${sx(k + 1)},${sy(g(k + 1))}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <line x1={p} x2={W - 8} y1={sy(0)} y2={sy(0)} stroke={C.grid} />
      <polyline points={pts((x) => x)} fill="none" stroke={C.muted} strokeDasharray="4 3" strokeWidth={1.2} />
      <polyline points={pts(f)} fill="none" stroke={C.active} strokeWidth={2} />
      <circle cx={sx(n)} cy={sy(f(n))} r={4} fill={C.warn} />
      <text x={p} y={H - 4} fontSize={10} fill={C.muted}>N = 1</text>
      <text x={W - 8} y={H - 4} fontSize={10} fill={C.muted} textAnchor="end">16</text>
      <text x={W - 10} y={sy(maxN) - 4} fontSize={10} fill={C.muted} textAnchor="end">y = N</text>
    </svg>
  );
}

function LoopsVariant() {
  const [kind, setKind] = useState("nested");
  const [n, setN] = useState(6);
  const steps = useMemo(() => loopSteps(kind, n), [kind, n]);
  const st = useStepper(steps, { baseMs: 380 });
  const step = st.step;
  const sn = SNIPPETS[kind];
  return (
    <LabShell
      title="Counting Loop Iterations"
      description="Big-O is just counting how many times the innermost O(1) line runs as a function of N. Step through each pattern and compare the totals."
      badges={["O(N)", "O(N²)", "O(log N)"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SNIPPETS).map(([k, x]) => (
              <SelectItem key={k} value={k}>{x.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-56">
          <SliderControl label="n" value={n} min={1} max={16} onChange={setN} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <LoopGrid kind={kind} n={n} step={step} />
          </Stage>
          <Legend items={[[C.active, "Current iteration"], [C.ok, "Already executed"], [C.fill, "Never executed"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={sn.code} active={step.line} />
          <VarTable
            vars={[
              ["i", step.i ?? "—", "active"],
              ...(kind === "nested" || kind === "triangle" ? [["j", step.j ?? "—", "purple"]] : []),
              ["ops so far", step.ops, "ok"],
              ["formula", kind === "triangle" ? `n(n−1)/2 = ${sn.f(n)}` : kind === "doubling" ? `⌈log₂ n⌉ = ${sn.f(n)}` : kind === "consecutive" ? `2n = ${sn.f(n)}` : kind === "nested" ? `n² = ${sn.f(n)}` : `n = ${sn.f(n)}`],
              ["Big-O", sn.big, "warn"],
            ]}
          />
          <Panel title="Total ops vs N (dashed: y = N)">
            <OpsChart kind={kind} n={n} />
          </Panel>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

/* ================================================================== */
/* variant "space"                                                     */
/* ================================================================== */

const FRAME_BYTES = 32;
const SPACE_CODE = {
  rec: `int factorial(int n) {
    if (n <= 1) return 1;          // base case
    return n * factorial(n - 1);   // pauses here
}`,
  iter: `int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; i++)
        result *= i;
    return result;
}`,
};

function spaceSteps(mode, n) {
  const s = [];
  const frames = [];
  let peak = 0;
  const snap = (line, note, tone, extra = {}) => {
    peak = Math.max(peak, frames.length);
    s.push({ line, frames: frames.map((f) => ({ ...f })), peak, note, tone, ...extra });
  };
  if (mode === "iter") {
    frames.push({ label: `factorial(${n})`, vars: `result = 1` });
    snap(2, "One frame, a fixed handful of variables (n, result, i). Auxiliary space O(1).", "active");
    let r = 1;
    for (let i = 2; i <= n; i++) {
      r *= i;
      frames[0].vars = `i = ${i}, result = ${r}`;
      snap(4, `i = ${i}: result = ${r}. Same frame reused — the stack never grows.`, "active");
    }
    snap(5, `return ${r}. Peak depth 1 frame regardless of n → O(1) space.`, "ok", { done: true, result: r });
    return s;
  }
  const rec = (k) => {
    frames.push({ label: `factorial(${k})`, vars: `n = ${k}` });
    if (k <= 1) {
      snap(2, `factorial(${k}): base case → return 1. Depth = ${frames.length} frames — the peak.`, "warn");
      frames.pop();
      return 1;
    }
    frames.at(-1).vars = `n = ${k}, waiting: ${k} * ?`;
    snap(3, `factorial(${k}) pauses on ${k} * factorial(${k - 1}) and pushes a new frame. Depth = ${frames.length}.`, "active");
    const r = rec(k - 1);
    frames.at(-1).vars = `n = ${k}, returns ${k} × ${r} = ${k * r}`;
    snap(3, `factorial(${k - 1}) returned ${r}; factorial(${k}) computes ${k} × ${r} = ${k * r} and pops.`, "ok");
    frames.pop();
    return k * r;
  };
  const r = rec(n);
  snap(1, `All frames popped. Result ${r}. Peak depth was ${n} frames → O(N) hidden stack space.`, "ok", { done: true, result: r });
  return s;
}

function StackTower({ step, n, mode }) {
  const W = 600, fh = 22, base = 270;
  const all = [{ label: "main()", vars: "" }, ...step.frames];
  const cap = (n + 1) * FRAME_BYTES;
  const used = all.length * FRAME_BYTES;
  const peakB = (step.peak + 1) * FRAME_BYTES;
  const mh = 230, mx = 430;
  return (
    <svg viewBox={`0 0 ${W} 290`} className="w-full font-mono">
      <text x={20} y={16} fontSize={10.5} fill={C.muted}>call stack (each frame ≈ {FRAME_BYTES} B)</text>
      {all.map((f, k) => {
        const y = base - (k + 1) * fh;
        const top = k === all.length - 1 && k > 0;
        return (
          <g key={k}>
            <rect x={20} y={y} width={360} height={fh - 3} rx={4} fill={k === 0 ? C.fill : top ? C.active : C.purple} fillOpacity={k === 0 ? 0.8 : top ? 0.22 : 0.1} stroke={top ? C.active : k === 0 ? C.border : C.purple} />
            <text x={28} y={y + 14} fontSize={11} fontWeight={600} fill={C.fg}>{f.label}</text>
            <text x={372} y={y + 14} fontSize={10.5} fill={C.muted} textAnchor="end">{f.vars}</text>
          </g>
        );
      })}
      <line x1={20} x2={380} y1={base + 2} y2={base + 2} stroke={C.muted} />
      <text x={mx + 40} y={16} fontSize={10.5} fill={C.muted} textAnchor="middle">aux memory</text>
      <rect x={mx + 20} y={base - mh} width={40} height={mh} rx={5} fill={C.fill} stroke={C.border} />
      <rect x={mx + 20} y={base - (used / cap) * mh} width={40} height={(used / cap) * mh} rx={5} fill={mode === "rec" ? C.warn : C.ok} opacity={0.7} className="transition-all duration-200" />
      <line x1={mx + 14} x2={mx + 66} y1={base - (peakB / cap) * mh} y2={base - (peakB / cap) * mh} stroke={C.bad} strokeWidth={2} strokeDasharray="4 3" />
      <text x={mx + 72} y={base - (peakB / cap) * mh + 4} fontSize={10} fill={C.bad}>peak {peakB} B</text>
      <text x={mx + 72} y={base - (used / cap) * mh + 4} fontSize={10} fill={C.fg}>{used} B</text>
    </svg>
  );
}

function SpaceVariant() {
  const [mode, setMode] = useState("rec");
  const [n, setN] = useState(5);
  const [k, setK] = useState(5);
  const steps = useMemo(() => spaceSteps(mode, n), [mode, n]);
  const st = useStepper(steps, { baseMs: 750 });
  const step = st.step;
  const whatN = Math.round(10 ** k);
  const bytes = mode === "rec" ? whatN * FRAME_BYTES : FRAME_BYTES;
  const fmtB = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(1)} KB` : `${b} B`);
  return (
    <LabShell
      title="Space Complexity — the Hidden Call Stack"
      description="Recursion doesn't allocate arrays, yet every pending call holds a stack frame. Compare recursive and iterative factorial frame by frame."
      badges={["O(N) recursion depth", "O(1) iterative"]}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v)}>
          <ToggleGroupItem value="rec">Recursive factorial</ToggleGroupItem>
          <ToggleGroupItem value="iter">Iterative factorial</ToggleGroupItem>
        </ToggleGroup>
        <div className="w-56">
          <SliderControl label="n" value={n} min={1} max={10} onChange={setN} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <StackTower step={step} n={n} mode={mode} />
          </Stage>
          <Legend items={[[C.active, "Executing frame"], [C.purple, "Paused, waiting for a return"], [C.bad, "Peak memory"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={SPACE_CODE[mode]} active={step.line} />
          <VarTable
            vars={[
              ["current depth", step.frames.length, "active"],
              ["peak depth", step.peak, "bad"],
              ["aux space", mode === "rec" ? `O(N) = ${step.peak} frames` : "O(1)", "warn"],
              ["result", step.result ?? "…", "ok"],
            ]}
          />
          <Panel title="What if n were huge?">
            <SliderControl label="n" value={k} min={1} max={7} step={0.5} onChange={setK} format={() => whatN.toLocaleString()} />
            <div className="flex items-center justify-between font-mono text-[12px]">
              <span>stack needed ≈ {fmtB(bytes)}</span>
              {bytes > 8e6 ? <Badge variant="danger">overflows 8 MB (Linux)</Badge> : bytes > 1e6 ? <Badge variant="warning">overflows 1 MB (Windows)</Badge> : <Badge variant="success">fits</Badge>}
            </div>
            <Progress value={Math.min(100, (bytes / 8e6) * 100)} indicatorClassName={cn(bytes > 8e6 ? "bg-viz-bad" : bytes > 1e6 ? "bg-viz-warn" : "bg-viz-ok")} />
          </Panel>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

export default function BigOLab({ variant = "growth" }) {
  if (variant === "loops") return <LoopsVariant />;
  if (variant === "space") return <SpaceVariant />;
  return <GrowthVariant />;
}
