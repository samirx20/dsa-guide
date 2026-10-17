import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

function PresetPicker({ presets, value, custom, onPick, onRandom, width = "w-56" }) {
  return (
    <>
      <Select value={custom ? "custom" : value} onValueChange={(v) => v !== "custom" && onPick(v)}>
        <SelectTrigger className={width}><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(presets).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
          {custom && <SelectItem value="custom">Random input</SelectItem>}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onRandom}><Shuffle /> Random</Button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 1D prefix sums                                                      */
/* ------------------------------------------------------------------ */

const P1 = {
  standard: { label: "[2, 4, 1, 5, 3] (chapter)", values: [2, 4, 1, 5, 3] },
  negatives: { label: "[3, -2, 5, -1] negatives", values: [3, -2, 5, -1] },
  mixed: { label: "[5, 3, -2, 8, 1]", values: [5, 3, -2, 8, 1] },
  leetcode: { label: "[-2, 0, 3, -5, 2, -1] (LC 303)", values: [-2, 0, 3, -5, 2, -1] },
};

const CODE_1D = `vector<int> buildPrefixClean(vector<int>& nums) {
    vector<int> prefix(nums.size() + 1, 0);
    for (int i = 0; i < nums.size(); i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    return prefix;
}

int getSum(int left, int right, vector<int>& prefix) {
    return prefix[right + 1] - prefix[left];
}`;

function prefixBuildSteps(a) {
  const p = Array(a.length + 1).fill(null);
  p[0] = 0;
  const s = [{ i: null, p: [...p], line: 2, note: `Allocate prefix of size N+1 = ${a.length + 1}. prefix[0] = 0 is the dummy zero: "sum of nothing".`, tone: "default" }];
  for (let i = 0; i < a.length; i++) {
    p[i + 1] = p[i] + a[i];
    s.push({ i, p: [...p], line: 4, note: `prefix[${i + 1}] = prefix[${i}] + nums[${i}] = ${p[i]} + ${a[i]} = ${p[i + 1]}  (sum of nums[0..${i}]).`, tone: "active" });
  }
  s.push({ i: null, p: [...p], line: 6, done: true, note: `Built in O(N). Every range sum is now one subtraction — drag the range slider below.`, tone: "ok" });
  return s;
}

/** Step plot of prefix[] showing a range sum as a height difference. */
function PrefixStaircase({ p, L, R }) {
  const W = 560, H = 170, padL = 34, padR = 12, padT = 14, padB = 22;
  const lo = Math.min(0, ...p), hi = Math.max(1, ...p);
  const sx = (k) => padL + (k / (p.length - 1 || 1)) * (W - padL - padR);
  const sy = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  const pts = p.map((v, k) => `${sx(k)},${sy(v)}`).join(" ");
  const yA = sy(p[L]), yB = sy(p[R + 1]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <line x1={padL} x2={W - padR} y1={sy(0)} y2={sy(0)} stroke={C.muted} opacity={0.5} />
      <rect x={sx(L)} y={padT - 6} width={sx(R + 1) - sx(L)} height={H - padT - padB + 8} fill={C.active} opacity={0.07} />
      <polyline points={pts} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <line x1={sx(L)} x2={W - padR} y1={yA} y2={yA} stroke={C.bad} strokeDasharray="4 4" />
      <line x1={sx(R + 1)} x2={W - padR} y1={yB} y2={yB} stroke={C.ok} strokeDasharray="4 4" />
      <line x1={W - padR - 18} x2={W - padR - 18} y1={yA} y2={yB} stroke={C.active} strokeWidth={3} />
      <text x={W - padR - 24} y={(yA + yB) / 2 + 4} textAnchor="end" fontSize={12} fontWeight={700} fill={C.active}>{p[R + 1] - p[L]}</text>
      {p.map((v, k) => (
        <g key={k}>
          <circle cx={sx(k)} cy={sy(v)} r={k === L ? 6 : k === R + 1 ? 6 : 3.5} fill={k === L ? C.bad : k === R + 1 ? C.ok : C.ink} />
          <text x={sx(k)} y={H - 6} textAnchor="middle" fontSize={10} fill={C.muted}>p[{k}]</text>
          <text x={sx(k) + 8} y={sy(v) - 6} fontSize={10} fill={C.fg}>{v}</text>
        </g>
      ))}
    </svg>
  );
}

function OneD() {
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const values = custom ?? P1[preset].values;
  const steps = useMemo(() => prefixBuildSteps(values), [values]);
  const st = useStepper(steps, { baseMs: 800 });
  const step = st.step;
  const [range, setRange] = useState([1, 3]);
  const n = values.length;
  const L = Math.min(range[0], n - 1), R = Math.min(Math.max(range[1], L), n - 1);
  const full = steps.at(-1).p;
  const built = step.done;
  const sum = full[R + 1] - full[L];

  const pStates = {};
  if (!built) {
    if (step.i != null) {
      pStates[step.i] = "purple";
      pStates[step.i + 1] = "active";
    }
  } else {
    pStates[L] = "bad";
    pStates[R + 1] = "ok";
  }
  const nStates = {};
  if (!built && step.i != null) nStates[step.i] = "active";
  if (built) for (let k = L; k <= R; k++) nStates[k] = "active";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PresetPicker presets={P1} value={preset} custom={custom} onPick={(v) => (setCustom(null), setPreset(v))} onRandom={() => setCustom(Array.from({ length: 6 + Math.floor(Math.random() * 3) }, () => Math.floor(Math.random() * 15) - 5))} />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-3 p-3">
            <ArrayView values={values} states={nStates} label="nums" pointers={!built && step.i != null ? [{ index: step.i, label: "i", tone: "active" }] : built ? [{ index: L, label: "L", tone: "danger" }, { index: R, label: "R", tone: "success" }] : []} />
            <ArrayView values={step.p.map((v) => (v == null ? "?" : v))} states={pStates} label="prefix (size N+1, prefix[k] = sum of first k elements)" />
          </Stage>
          <Narration tone={built ? "ok" : step.tone}>
            {built ? (
              <>
                sum(nums[{L}..{R}]) = prefix[{R + 1}] − prefix[{L}] = {full[R + 1]} − {full[L]} = <b>{sum}</b>. One subtraction instead of {R - L + 1} additions.
              </>
            ) : (
              step.note
            )}
          </Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_1D} active={built ? 10 : step.line} />
          <VarTable
            vars={
              built
                ? [["L", L, "bad"], ["R", R, "ok"], ["prefix[R+1]", full[R + 1], "ok"], ["prefix[L]", full[L], "bad"], ["sum", sum, "active"]]
                : [["i", step.i ?? "—", "active"], ["nums[i]", step.i != null ? values[step.i] : "—"], ["prefix[i+1]", step.i != null ? step.p[step.i + 1] : "—", "active"], ["extra space", `O(N+1) = ${n + 1}`]]
            }
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
      <Panel title="Range query sum(L..R) — O(1)">
        <div className={cn("space-y-3", !built && "opacity-50")}>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[12.5px] text-muted-foreground">Range [L, R]</Label>
            <span className="font-mono text-xs font-semibold">[{L}, {R}]</span>
          </div>
          <Slider value={[L, R]} min={0} max={n - 1} step={1} minStepsBetweenThumbs={0} disabled={!built} onValueChange={(v) => setRange(v)} aria-label="Query range" />
          {!built && <div className="text-xs text-muted-foreground">Finish building prefix[] (press Play or drag the step scrubber to the end) to unlock queries.</div>}
          <Stage className="p-1">
            <PrefixStaircase p={full} L={L} R={R} />
          </Stage>
          <StatGrid cols={4}>
            <Stat label="Answer" value={sum} tone="active" />
            <Stat label="Prefix ops" value="1 subtraction" tone="ok" />
            <Stat label="Brute-force ops" value={`${R - L + 1} adds`} tone="bad" />
            <Stat label="Q queries" value="O(N + Q)" hint="vs O(N·Q) brute force" />
          </StatGrid>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Subarray Sum Equals K (hash map + prefix)                           */
/* ------------------------------------------------------------------ */

const PK = {
  standard: { label: "[1, -1, 1, 1, 1], k = 2 (chapter)", values: [1, -1, 1, 1, 1], k: 2 },
  ones: { label: "[1, 1, 1], k = 2", values: [1, 1, 1], k: 2 },
  lc: { label: "[1, 2, 3], k = 3", values: [1, 2, 3], k: 3 },
  zeros: { label: "[0, 0, 0], k = 0 (edge)", values: [0, 0, 0], k: 0 },
  neg: { label: "[-1, -1, 2], k = 0", values: [-1, -1, 2], k: 0 },
};

const CODE_HASH = `int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    int currentPrefixSum = 0;
    unordered_map<int, int> prefixCounts;
    prefixCounts[0] = 1;  // CRITICAL: empty prefix

    for (int i = 0; i < nums.size(); i++) {
        currentPrefixSum += nums[i];
        int target = currentPrefixSum - k;
        if (prefixCounts.count(target)) {
            count += prefixCounts[target];
        }
        prefixCounts[currentPrefixSum]++;
    }
    return count;
}`;

function subarrayKSteps(a, k) {
  const map = new Map([[0, 1]]);
  const where = new Map([[0, [-1]]]); // prefix value -> list of end indices (prefix after index j)
  let sum = 0, count = 0;
  const found = [];
  const snap = (o) => ({ map: [...map.entries()], sum, count, found: [...found], ...o });
  const s = [snap({ i: null, line: [4, 5], note: `Seed the map with {0: 1} — the empty prefix, so subarrays starting at index 0 can be counted.`, tone: "warn" })];
  for (let i = 0; i < a.length; i++) {
    sum += a[i];
    const target = sum - k;
    s.push(snap({ i, target, line: [8, 9], note: `sum += ${a[i]} → ${sum}. Need an earlier prefix equal to sum − k = ${sum} − ${k} = ${target}.`, tone: "active" }));
    const hits = map.get(target) || 0;
    const fresh = [];
    if (hits) {
      for (const j of where.get(target)) fresh.push([j + 1, i]);
      count += hits;
      found.push(...fresh);
      s.push(snap({ i, target, hitKey: target, fresh, line: [10, 11], note: `Map has ${target} × ${hits} → found ${hits} subarray${hits > 1 ? "s" : ""}: ${fresh.map(([x, y]) => `[${x}..${y}]`).join(", ")}. count = ${count}.`, tone: "ok" }));
    } else s.push(snap({ i, target, missKey: target, line: 10, note: `${target} not in map → no subarray ends at index ${i} with sum ${k}.`, tone: "bad" }));
    map.set(sum, (map.get(sum) || 0) + 1);
    where.set(sum, [...(where.get(sum) || []), i]);
    s.push(snap({ i, target, putKey: sum, line: 13, note: `Record this prefix: prefixCounts[${sum}] = ${map.get(sum)}.`, tone: "default" }));
  }
  s.push(snap({ i: null, done: true, line: 15, note: `Answer: ${count} subarray${count === 1 ? "" : "s"} sum to ${k}. One pass, O(N) time, O(N) map.`, tone: "ok" }));
  return s;
}

function SubarrayBrackets({ n, found, fresh, cellWidth }) {
  const gap = 4;
  const rows = found.length;
  const H = Math.max(18, rows * 14 + 6);
  const W = n * (cellWidth + gap);
  const freshKey = new Set((fresh || []).map((f) => f.join(",")));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W }} className="font-mono">
      {found.map(([x, y], r) => {
        const isFresh = freshKey.has(`${x},${y}`);
        return (
          <g key={r}>
            <rect x={x * (cellWidth + gap) + 2} y={4 + r * 14} width={(y - x + 1) * (cellWidth + gap) - gap - 4} height={9} rx={4} fill={isFresh ? C.ok : C.purple} opacity={isFresh ? 0.85 : 0.4} />
          </g>
        );
      })}
      {rows === 0 && <text x={2} y={13} fontSize={10} fill={C.muted}>no subarrays found yet</text>}
    </svg>
  );
}

function HashMapMode() {
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const base = custom ?? PK[preset];
  const [kOverride, setK] = useState(null);
  const k = kOverride ?? base.k;
  const values = base.values;
  const steps = useMemo(() => subarrayKSteps(values, k), [values, k]);
  const st = useStepper(steps, { baseMs: 850 });
  const step = st.step;
  const cw = 44;

  const states = {};
  if (step.i != null) for (let x = 0; x <= step.i; x++) states[x] = "dim";
  if (step.fresh) step.fresh.forEach(([x, y]) => { for (let z = x; z <= y; z++) states[z] = "ok"; });
  if (step.i != null) states[step.i] = step.fresh ? "ok" : "active";
  if (step.done) Object.keys(states).forEach((x) => delete states[x]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PresetPicker
          presets={PK}
          value={preset}
          custom={custom}
          width="w-64"
          onPick={(v) => (setCustom(null), setK(null), setPreset(v))}
          onRandom={() => (setK(null), setCustom({ values: Array.from({ length: 7 }, () => Math.floor(Math.random() * 7) - 3), k: Math.floor(Math.random() * 4) }))}
        />
        <div className="ml-auto w-48">
          <SliderControl label="target k" value={k} min={-4} max={8} onChange={setK} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ArrayView values={values} states={states} cellWidth={cw} label="nums" pointers={step.i != null ? [{ index: step.i, label: "i", tone: "active" }] : []} />
            <div className="mt-1 overflow-x-auto">
              <div className="mb-1 font-mono text-[11px] text-muted-foreground">subarrays with sum = {k}</div>
              <SubarrayBrackets n={values.length} found={step.found} fresh={step.fresh} cellWidth={cw} />
            </div>
          </Stage>
          <Legend items={[[C.active, "Current index"], [C.ok, "Just found"], [C.purple, "Found earlier"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          <Narration>
            Why it works: sum(j+1..i) = prefix[i] − prefix[j]. Setting this equal to k means we need an earlier prefix[j] = prefix[i] − k. The map answers “how many such j?” in O(1).
          </Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_HASH} active={step.line} maxHeight={260} />
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <VarTable vars={[["i", step.i ?? "—", "active"], ["sum", step.sum, "active"], ["target", step.target ?? "—", "warn"], ["count", step.count, "ok"]]} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>prefix</TableHead>
                  <TableHead className="text-right">count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {step.map.map(([key, c]) => (
                  <TableRow key={key} className={cn(key === step.hitKey && "bg-viz-ok/15", key === step.putKey && "bg-viz-active/12")}>
                    <TableCell className="py-1.5 font-mono text-[12.5px]">{key}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold">{c}</TableCell>
                  </TableRow>
                ))}
                {step.missKey != null && (
                  <TableRow className="bg-viz-bad/10">
                    <TableCell className="py-1.5 font-mono text-[12.5px] text-viz-bad">{step.missKey}?</TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[12.5px] text-viz-bad">miss</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2D prefix sums                                                      */
/* ------------------------------------------------------------------ */

const P2 = {
  standard: { label: "3×3 [1..9] (chapter)", M: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], q: [1, 1, 2, 2] },
  lc: { label: "5×5 (LeetCode 304)", M: [[3, 0, 1, 4, 2], [5, 6, 3, 2, 1], [1, 2, 0, 1, 5], [4, 1, 0, 1, 7], [1, 0, 3, 0, 5]], q: [2, 1, 4, 3] },
  neg: { label: "3×4 with negatives", M: [[2, -1, 3, 0], [-4, 5, 1, -2], [3, 0, -1, 6]], q: [0, 1, 2, 2] },
};

const CODE_2D = `NumMatrix(vector<vector<int>>& matrix) {
    int ROWS = matrix.size(), COLS = matrix[0].size();
    prefix = vector<vector<int>>(ROWS + 1, vector<int>(COLS + 1, 0));
    for (int r = 0; r < ROWS; r++) {
        for (int c = 0; c < COLS; c++) {
            prefix[r + 1][c + 1] = matrix[r][c]
                                 + prefix[r][c + 1]   // above
                                 + prefix[r + 1][c]   // left
                                 - prefix[r][c];      // overlap
        }
    }
}

int sumRegion(int r1, int c1, int r2, int c2) {
    int bottom_right     = prefix[r2 + 1][c2 + 1];
    int top_rectangle    = prefix[r1][c2 + 1];
    int left_rectangle   = prefix[r2 + 1][c1];
    int top_left_overlap = prefix[r1][c1];
    return bottom_right - top_rectangle - left_rectangle + top_left_overlap;
}`;

function prefix2D(M) {
  const R = M.length, Cn = M[0].length;
  const P = Array.from({ length: R + 1 }, () => Array(Cn + 1).fill(0));
  for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) P[r + 1][c + 1] = M[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
  return P;
}

function build2DSteps(M) {
  const R = M.length, Cn = M[0].length;
  const P = Array.from({ length: R + 1 }, () => Array(Cn + 1).fill(null));
  for (let k = 0; k <= Cn; k++) P[0][k] = 0;
  for (let k = 0; k <= R; k++) P[k][0] = 0;
  const s = [{ P: P.map((row) => [...row]), line: 3, note: `Allocate (${R}+1)×(${Cn}+1) with a zero row and zero column of padding — no bounds checks needed.`, tone: "default" }];
  for (let r = 0; r < R; r++)
    for (let c = 0; c < Cn; c++) {
      const above = P[r][c + 1], left = P[r + 1][c], over = P[r][c];
      P[r + 1][c + 1] = M[r][c] + above + left - over;
      s.push({ P: P.map((row) => [...row]), r, c, line: [6, 7, 8, 9], note: `prefix[${r + 1}][${c + 1}] = ${M[r][c]} + ${above} (above) + ${left} (left) − ${over} (overlap counted twice) = ${P[r + 1][c + 1]}.`, tone: "active" });
    }
  s.push({ P: P.map((row) => [...row]), line: 12, done: true, note: `Built in O(R×C). prefix[${R}][${Cn}] = ${P[R][Cn]} is the sum of the whole matrix.`, tone: "ok" });
  return s;
}

function query2DSteps(P, [r1, c1, r2, c2]) {
  const br = P[r2 + 1][c2 + 1], top = P[r1][c2 + 1], left = P[r2 + 1][c1], ov = P[r1][c1];
  return [
    { show: [], acc: null, line: 14, note: `Query sumRegion(${r1}, ${c1}, ${r2}, ${c2}) — the blue-outlined block.`, tone: "default" },
    { show: ["br"], acc: br, line: 15, note: `Start with everything from (0,0) to (${r2},${c2}): prefix[${r2 + 1}][${c2 + 1}] = ${br}.`, tone: "ok" },
    { show: ["br", "top"], acc: br - top, line: 16, note: `Subtract the strip above the block: prefix[${r1}][${c2 + 1}] = ${top} → ${br - top}.`, tone: "bad" },
    { show: ["br", "top", "left"], acc: br - top - left, line: 17, note: `Subtract the strip left of the block: prefix[${r2 + 1}][${c1}] = ${left} → ${br - top - left}. The top-left corner was removed twice!`, tone: "bad" },
    { show: ["br", "top", "left", "ov"], acc: br - top - left + ov, line: [18, 19], done: true, note: `Add the overlap back once: + prefix[${r1}][${c1}] = ${ov} → answer ${br - top - left + ov}. Four lookups, O(1).`, tone: "ok" },
  ];
}

function MatrixSvg({ M, cellLabel, cellTone, rects = [], offset = 0, title }) {
  const R = M.length, Cn = M[0].length;
  const cs = Math.min(52, 300 / Math.max(R, Cn));
  const ox = 26, oy = 26;
  const W = ox + Cn * cs + 6, H = oy + R * cs + 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" style={{ maxWidth: W * 1.25 }}>
      <text x={2} y={11} fontSize={10} fill={C.muted}>{title}</text>
      {Array.from({ length: Cn }, (_, c) => <text key={c} x={ox + c * cs + cs / 2} y={oy - 4} textAnchor="middle" fontSize={10} fill={C.muted}>{c - offset}</text>)}
      {Array.from({ length: R }, (_, r) => <text key={r} x={ox - 6} y={oy + r * cs + cs / 2 + 4} textAnchor="end" fontSize={10} fill={C.muted}>{r - offset}</text>)}
      {M.map((row, r) =>
        row.map((v, c) => {
          const tone = cellTone?.(r, c);
          return (
            <g key={`${r}-${c}`}>
              <rect x={ox + c * cs + 1.5} y={oy + r * cs + 1.5} width={cs - 3} height={cs - 3} rx={4} fill={tone ? C[tone] : C.fill} fillOpacity={tone ? 0.22 : 0.8} stroke={tone ? C[tone] : C.border} strokeWidth={tone ? 1.6 : 1} />
              <text x={ox + c * cs + cs / 2} y={oy + r * cs + cs / 2 + 4} textAnchor="middle" fontSize={Math.max(10, cs * 0.26)} fontWeight={600} fill={v == null ? C.muted : C.fg}>{cellLabel ? cellLabel(v, r, c) : v ?? "?"}</text>
            </g>
          );
        })
      )}
      {rects.map((q, k) => (
        <rect key={k} x={ox + q.c0 * cs} y={oy + q.r0 * cs} width={(q.c1 - q.c0 + 1) * cs} height={(q.r1 - q.r0 + 1) * cs} rx={5} fill={q.fill ? C[q.tone] : "none"} fillOpacity={q.fill ? 0.12 : 0} stroke={C[q.tone]} strokeWidth={q.width ?? 2} strokeDasharray={q.dash} />
      ))}
    </svg>
  );
}

function TwoD() {
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const cfg = custom ?? P2[preset];
  const M = cfg.M;
  const R = M.length, Cn = M[0].length;
  const [tab, setTab] = useState("build");
  const [q, setQ] = useState(null);
  const [r1, c1, r2, c2] = q ?? cfg.q;
  const P = useMemo(() => prefix2D(M), [M]);
  const buildSteps = useMemo(() => build2DSteps(M), [M]);
  const qSteps = useMemo(() => query2DSteps(P, [r1, c1, r2, c2]), [P, r1, c1, r2, c2]);
  const st = useStepper(tab === "build" ? buildSteps : qSteps, { baseMs: tab === "build" ? 700 : 1200 });
  const step = st.step;

  const pick = (v) => (setCustom(null), setQ(null), setPreset(v));
  const randomize = () => {
    const rr = 3 + Math.floor(Math.random() * 3), cc = 3 + Math.floor(Math.random() * 3);
    setQ(null);
    setCustom({ M: Array.from({ length: rr }, () => Array.from({ length: cc }, () => Math.floor(Math.random() * 10) - 2)), q: [1, 1, rr - 1, cc - 2] });
  };

  // Build-mode tones (prefix coords)
  const buildTone = (r, c) => {
    if (step.r == null) return step.done && r > 0 && c > 0 ? "ok" : null;
    const pr = step.r + 1, pc = step.c + 1;
    if (r === pr && c === pc) return "ok";
    if (r === pr - 1 && c === pc - 1) return "bad";
    if (r === pr - 1 && c === pc) return "active";
    if (r === pr && c === pc - 1) return "purple";
    return null;
  };
  const shown = new Set(step.show || []);
  const qTone = (r, c) => {
    if (shown.has("ov") && r === r1 && c === c1) return "warn";
    if (shown.has("left") && r === r2 + 1 && c === c1) return "bad";
    if (shown.has("top") && r === r1 && c === c2 + 1) return "bad";
    if (shown.has("br") && r === r2 + 1 && c === c2 + 1) return "ok";
    return null;
  };
  // regions over the original matrix (0-based, inclusive)
  const regions = [];
  if (tab === "query") {
    if (shown.has("br")) regions.push({ r0: 0, c0: 0, r1: r2, c1: c2, tone: "ok", fill: true, width: 1.5 });
    if (shown.has("top") && r1 > 0) regions.push({ r0: 0, c0: 0, r1: r1 - 1, c1: c2, tone: "bad", fill: true, width: 1.5, dash: "4 3" });
    if (shown.has("left") && c1 > 0) regions.push({ r0: 0, c0: 0, r1: r2, c1: c1 - 1, tone: "bad", fill: true, width: 1.5, dash: "4 3" });
    if (shown.has("ov") && r1 > 0 && c1 > 0) regions.push({ r0: 0, c0: 0, r1: r1 - 1, c1: c1 - 1, tone: "warn", fill: true, width: 2 });
    regions.push({ r0: r1, c0: c1, r1: r2, c1: c2, tone: "active", width: 3 });
  }
  const origTone = tab === "build" ? (r, c) => (step.r === r && step.c === c ? "active" : null) : undefined;

  const truth = (() => {
    let s = 0;
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) s += M[r][c];
    return s;
  })();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="build">1. Build prefix matrix</TabsTrigger>
            <TabsTrigger value="query">2. Query rectangle</TabsTrigger>
          </TabsList>
        </Tabs>
        <PresetPicker presets={P2} value={preset} custom={custom} onPick={pick} onRandom={randomize} />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="grid gap-3 p-3 sm:grid-cols-2">
            <MatrixSvg M={M} title="matrix" cellTone={origTone} rects={regions} />
            <MatrixSvg M={tab === "build" ? step.P : P} title="prefix (padded)" cellTone={tab === "build" ? buildTone : qTone} offset={0} />
          </Stage>
          <Legend
            items={
              tab === "build"
                ? [[C.active, "Above"], [C.purple, "Left"], [C.bad, "Overlap (subtract)"], [C.ok, "Cell being filled"]]
                : [[C.active, "Query block"], [C.ok, "bottom_right (+)"], [C.bad, "top / left strips (−)"], [C.warn, "overlap (+)"]]
            }
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_2D} active={step.line} maxHeight={280} />
          {tab === "build" ? (
            <VarTable vars={[["r", step.r ?? "—", "active"], ["c", step.c ?? "—", "active"], ["matrix[r][c]", step.r != null ? M[step.r][step.c] : "—"], ["prefix[r+1][c+1]", step.r != null ? step.P[step.r + 1][step.c + 1] : "—", "ok"]]} />
          ) : (
            <>
              <VarTable
                vars={[
                  ["bottom_right", P[r2 + 1][c2 + 1], "ok"],
                  ["top_rectangle", P[r1][c2 + 1], "bad"],
                  ["left_rectangle", P[r2 + 1][c1], "bad"],
                  ["top_left_overlap", P[r1][c1], "warn"],
                  ["running result", step.acc ?? "—", "active"],
                  ["brute-force check", `${truth} (${(r2 - r1 + 1) * (c2 - c1 + 1)} cells)`],
                ]}
              />
              <Panel title="Query rectangle">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12.5px] text-muted-foreground"><span>Rows r1..r2</span><span className="font-mono font-semibold text-foreground">{r1}..{r2}</span></div>
                  <Slider value={[r1, r2]} min={0} max={R - 1} step={1} onValueChange={([a, b]) => setQ([a, c1, b, c2])} aria-label="Row range" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12.5px] text-muted-foreground"><span>Cols c1..c2</span><span className="font-mono font-semibold text-foreground">{c1}..{c2}</span></div>
                  <Slider value={[c1, c2]} min={0} max={Cn - 1} step={1} onValueChange={([a, b]) => setQ([r1, a, r2, b])} aria-label="Column range" />
                </div>
              </Panel>
            </>
          )}
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function PrefixSumLab({ variant = "1d" }) {
  const meta = {
    "1d": { title: "Prefix Sum Array — Build Once, Query in O(1)", desc: "Build prefix[] with a dummy zero, then answer any range sum as prefix[R+1] − prefix[L].", badges: ["O(N) build", "O(1) query"] },
    hashmap: { title: "Subarray Sum Equals K — Prefix Sum + Hash Map", desc: "Carry a running sum and a map of how often each prefix appeared. Every time sum − k is in the map, that many subarrays end here.", badges: ["O(N) time", "O(N) space", "works with negatives"] },
    "2d": { title: "2D Prefix Sums — Inclusion–Exclusion", desc: "Build a padded prefix matrix cell by cell, then carve out any rectangle with four lookups.", badges: ["O(R×C) build", "O(1) query"] },
  }[variant] ?? { title: "Prefix Sums", desc: "", badges: [] };
  return (
    <LabShell title={meta.title} description={meta.desc} badges={meta.badges}>
      {variant === "hashmap" ? <HashMapMode /> : variant === "2d" ? <TwoD /> : <OneD />}
    </LabShell>
  );
}
