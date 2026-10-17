import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ---------- algorithm traces (pure) ---------- */

const clone = (g) => g.map((r) => [...r]);

function rotateSteps(n) {
  const g = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i * n + j + 1));
  const s = [];
  s.push({ g: clone(g), hl: [], phase: "start", line: [], note: `Rotating 90° clockwise in place = transpose, then reverse every row.`, tone: "active" });
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      [g[i][j], g[j][i]] = [g[j][i], g[i][j]];
      s.push({ g: clone(g), hl: [[i, j], [j, i]], phase: "transpose", line: [4, 5, 6], note: `Transpose: swap [${i}][${j}] ↔ [${j}][${i}] (values ${g[j][i]} and ${g[i][j]}). j starts at i+1, so each pair is swapped exactly once.`, tone: "active", i, j });
    }
  s.push({ g: clone(g), hl: [], phase: "transposed", line: [], note: `Transposed: rows became columns (mirrored across the main diagonal).`, tone: "ok" });
  for (let i = 0; i < n; i++) {
    g[i].reverse();
    s.push({ g: clone(g), hl: g[i].map((_, j) => [i, j]), phase: "reverse", line: [8, 9, 10], note: `Reverse row ${i}: [${g[i].join(", ")}].`, tone: "warn", i });
  }
  s.push({ g: clone(g), hl: [], phase: "done", done: true, line: 12, note: `Done — rotated 90° clockwise with O(1) extra space. The first column read bottom-up is now the first row.`, tone: "ok" });
  return s;
}

function spiralSteps(mat) {
  const m = mat.length, n = mat[0].length;
  const s = [], out = [], seen = new Set();
  let top = 0, bottom = m - 1, left = 0, right = n - 1;
  const snap = (o) => s.push({ out: [...out], seen: new Set(seen), b: { top, bottom, left, right }, cur: null, ...o });
  const take = (i, j, line, dir) => {
    out.push(mat[i][j]);
    seen.add(`${i},${j}`);
    snap({ cur: [i, j], line, note: `${dir}: push matrix[${i}][${j}] = ${mat[i][j]}.`, tone: "active" });
  };
  snap({ line: [3, 4], note: `Boundaries: top = 0, bottom = ${m - 1}, left = 0, right = ${n - 1}. Peel the matrix like an onion.`, tone: "active" });
  while (top <= bottom && left <= right) {
    for (let j = left; j <= right; j++) take(top, j, 6, "Top row →");
    top++;
    snap({ line: 7, note: `Top row consumed → top++ (top = ${top}).`, tone: "warn" });
    for (let i = top; i <= bottom; i++) take(i, right, 8, "Right column ↓");
    right--;
    snap({ line: 9, note: `Right column consumed → right-- (right = ${right}).`, tone: "warn" });
    if (top <= bottom) {
      for (let j = right; j >= left; j--) take(bottom, j, 11, "Bottom row ←");
      bottom--;
      snap({ line: 12, note: `Bottom row consumed → bottom-- (bottom = ${bottom}).`, tone: "warn" });
    } else snap({ line: 10, note: `top (${top}) > bottom (${bottom}) — no bottom row left; skip it (this guard prevents duplicates).`, tone: "bad" });
    if (left <= right) {
      for (let i = bottom; i >= top; i--) take(i, left, 15, "Left column ↑");
      left++;
      snap({ line: 16, note: `Left column consumed → left++ (left = ${left}).`, tone: "warn" });
    } else snap({ line: 14, note: `left (${left}) > right (${right}) — no left column left; skip it.`, tone: "bad" });
  }
  snap({ done: true, line: 19, note: `Boundaries crossed → stop. Spiral order: [${out.join(", ")}].`, tone: "ok" });
  return s;
}

function zeroSteps(mat) {
  const g = clone(mat), m = g.length, n = g[0].length;
  const s = [];
  const snap = (o) => s.push({ g: clone(g), cell: null, flags: [], zeroed: [], ...o });
  const fr = g[0].some((v) => v === 0), fc = g.some((r) => r[0] === 0);
  snap({ fr, fc, line: [4, 5], note: `Before overwriting row 0 / column 0 with flags, remember whether they contain a 0 themselves: firstRowZero = ${fr}, firstColZero = ${fc}.`, tone: "active" });
  for (let i = 1; i < m; i++)
    for (let j = 1; j < n; j++)
      if (g[i][j] === 0) {
        g[i][0] = 0;
        g[0][j] = 0;
        snap({ fr, fc, cell: [i, j], flags: [[i, 0], [0, j]], line: 8, note: `matrix[${i}][${j}] = 0 → flag row ${i} (matrix[${i}][0] = 0) and column ${j} (matrix[0][${j}] = 0). Row 0 / col 0 act as O(1)-space markers.`, tone: "warn" });
      }
  for (let i = 1; i < m; i++)
    for (let j = 1; j < n; j++)
      if ((g[i][0] === 0 || g[0][j] === 0) && g[i][j] !== 0) {
        g[i][j] = 0;
        const fl = [...(g[i][0] === 0 ? [[i, 0]] : []), ...(g[0][j] === 0 ? [[0, j]] : [])];
        snap({ fr, fc, cell: [i, j], flags: fl, zeroed: [[i, j]], line: 11, note: `Flag ${fl.map(([a, b]) => `[${a}][${b}]`).join(" & ")} is 0 → zero matrix[${i}][${j}].`, tone: "bad" });
      }
  if (fr) {
    for (let j = 0; j < n; j++) g[0][j] = 0;
    snap({ fr, fc, zeroed: g[0].map((_, j) => [0, j]), line: 12, note: `firstRowZero was true → zero the entire first row.`, tone: "bad" });
  }
  if (fc) {
    for (let i = 0; i < m; i++) g[i][0] = 0;
    snap({ fr, fc, zeroed: g.map((_, i) => [i, 0]), line: 13, note: `firstColZero was true → zero the entire first column.`, tone: "bad" });
  }
  snap({ fr, fc, done: true, line: 14, note: `Done in O(M·N) time and O(1) extra space.`, tone: "ok" });
  return s;
}

function gcdSteps(a, b) {
  const s = [], rows = [];
  s.push({ a, b, rows: [], line: 1, note: `gcd(${a}, ${b}): replace (a, b) with (b, a % b) until b = 0.`, tone: "active" });
  while (b !== 0) {
    const r = a % b, q = Math.floor(a / b);
    rows.push({ a, b, q, r });
    s.push({ a, b, q, r, rows: [...rows], line: 3, note: `${a} = ${q} × ${b} + ${r} → next call gcd(${b}, ${r}).`, tone: "active" });
    a = b;
    b = r;
  }
  rows.push({ a, b, q: null, r: null });
  s.push({ a, b, rows: [...rows], done: true, line: 2, note: `b = 0 → return ${a}. GCD = ${a}. Only O(log min(a, b)) steps.`, tone: "ok" });
  return s;
}

function powSteps(base, exp, mod) {
  const M = mod ? 1000000007n : null;
  let b = BigInt(base), e = exp, r = 1n, mults = 0;
  if (M) b %= M;
  const s = [], rows = [];
  s.push({ b, e, r, rows: [], mults, line: [2, 3], note: `${base}^${exp}: ${exp} in binary is ${exp.toString(2)}. Square the base each round; multiply it in when the current bit is 1.`, tone: "active" });
  while (e > 0) {
    const bit = e & 1;
    const before = r;
    if (bit) {
      r = M ? (r * b) % M : r * b;
      mults++;
    }
    rows.push({ e, bit, b, r });
    s.push({ b, e, r, bit, rows: [...rows], mults, line: bit ? [6, 7] : 6, note: bit ? `Lowest bit of ${e.toString(2)} is 1 → result = ${before} × ${b} = ${r}.` : `Lowest bit of ${e.toString(2)} is 0 → skip, result stays ${r}.`, tone: bit ? "ok" : "default" });
    b = M ? (b * b) % M : b * b;
    e >>= 1;
    mults++;
    s.push({ b, e, r, rows: [...rows], mults, line: [9, 10], note: `Square the base → ${b}; exp >>= 1 → ${e ? e.toString(2) : "0"}.`, tone: "active" });
  }
  s.push({ b, e, r, rows: [...rows], mults, done: true, line: 13, note: `${base}^${exp}${mod ? " mod 1e9+7" : ""} = ${r}, using ~${mults} multiplications instead of ${exp - 1}.`, tone: "ok" });
  return s;
}

/* ---------- rendering ---------- */

const ROTATE_CODE = `void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    // 1. Transpose
    for (int i = 0; i < n; i++)
        for (int j = i; j < n; j++)       // j starts at i!
            swap(matrix[i][j], matrix[j][i]);
    // 2. Reverse each row
    for (int i = 0; i < n; i++)
        reverse(matrix[i].begin(),
                matrix[i].end());
    // rotated 90° clockwise
}`;

const SPIRAL_CODE = `vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> result;
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) result.push_back(matrix[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) result.push_back(matrix[i][right]);
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) result.push_back(matrix[bottom][j]);
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) result.push_back(matrix[i][left]);
            left++;
        }
    }
    return result;
}`;

const ZERO_CODE = `void setZeroes(vector<vector<int>>& matrix) {
    int m = matrix.size(), n = matrix[0].size();
    bool firstRowZero = false, firstColZero = false;
    for (int j = 0; j < n; j++) if (matrix[0][j] == 0) firstRowZero = true;
    for (int i = 0; i < m; i++) if (matrix[i][0] == 0) firstColZero = true;
    for (int i = 1; i < m; i++)               // 1) mark flags
        for (int j = 1; j < n; j++)
            if (matrix[i][j] == 0) matrix[i][0] = matrix[0][j] = 0;
    for (int i = 1; i < m; i++)               // 2) apply flags
        for (int j = 1; j < n; j++)
            if (matrix[i][0] == 0 || matrix[0][j] == 0) matrix[i][j] = 0;
    if (firstRowZero) for (int j = 0; j < n; j++) matrix[0][j] = 0;
    if (firstColZero) for (int i = 0; i < m; i++) matrix[i][0] = 0;
}`;

const GCD_CODE = `int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);    // gcd(a, b) == gcd(b, a mod b)
}
int lcm(int a, int b) { return a / gcd(a, b) * b; }`;

const POW_CODE = `long long power(long long base, long long exp) {
    long long result = 1;
    base %= MOD;
    while (exp > 0) {
        // current lowest bit of exp
        if (exp & 1)
            result = result * base % MOD;
        // base^1 -> base^2 -> base^4 -> base^8 ...
        base = base * base % MOD;
        exp >>= 1;
    }
    // O(log exp) multiplications
    return result;
}`;

const SPIRAL_PRESETS = {
  "3x4": { label: "3×4 (chapter)", m: 3, n: 4 },
  "4x4": { label: "4×4", m: 4, n: 4 },
  "3x3": { label: "3×3", m: 3, n: 3 },
  "4x3": { label: "4×3 (tall)", m: 4, n: 3 },
  "1x4": { label: "1×4 (single row)", m: 1, n: 4 },
};
const ZERO_PRESETS = {
  center: { label: "Center zero (3×3)", mat: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] },
  edge: { label: "Zeros in row 0 (3×4)", mat: [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]] },
};

/** Generic matrix SVG. tone(i, j) → color or null; keyed cells animate between positions. */
function MatrixSvg({ g, tone, cs = 60, keyByValue, overlay, dim }) {
  const m = g.length, n = g[0].length;
  const pad = 34;
  const W = n * cs + pad * 2, H = m * cs + pad * 2;
  const cells = [];
  g.forEach((row, i) => row.forEach((v, j) => cells.push({ v, i, j })));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full font-mono" style={{ maxWidth: Math.max(W * 1.25, 300) }} role="img">
      {g.map((_, i) => (
        <text key={`r${i}`} x={pad - 10} y={pad + i * cs + cs / 2 + 4} textAnchor="middle" fontSize={10} fill={C.muted}>
          {i}
        </text>
      ))}
      {g[0].map((_, j) => (
        <text key={`c${j}`} x={pad + j * cs + cs / 2} y={pad - 10} textAnchor="middle" fontSize={10} fill={C.muted}>
          {j}
        </text>
      ))}
      {cells
        .sort((a, b) => (keyByValue ? a.v - b.v : 0))
        .map(({ v, i, j }) => {
          const col = tone?.(i, j, v);
          const faded = dim?.(i, j);
          return (
            <g key={keyByValue ? `v${v}` : `${i}-${j}`} style={{ transform: `translate(${pad + j * cs}px, ${pad + i * cs}px)`, transition: "transform 450ms ease" }} opacity={faded ? 0.35 : 1}>
              <rect x={2} y={2} width={cs - 4} height={cs - 4} rx={7} fill={col ?? C.card} fillOpacity={col ? 0.2 : 1} stroke={col ?? C.border} strokeWidth={col ? 2.4 : 1} className="transition-colors duration-300" />
              <text x={cs / 2} y={cs / 2 + 5} textAnchor="middle" fontSize={Math.min(16, cs * 0.3)} fontWeight={700} fill={v === 0 && !keyByValue ? C.bad : C.fg}>
                {v}
              </text>
            </g>
          );
        })}
      {overlay?.({ pad, cs, W, H })}
    </svg>
  );
}

function RotateView({ st }) {
  const step = st.step;
  const n = step.g.length;
  const hl = new Set(step.hl.map(([i, j]) => `${i},${j}`));
  return (
    <Stage className="p-3">
      <MatrixSvg
        g={step.g}
        keyByValue
        cs={n > 3 ? 56 : 66}
        tone={(i, j) => (hl.has(`${i},${j}`) ? (step.phase === "reverse" ? C.warn : C.active) : step.done ? C.ok : step.phase !== "reverse" && i === j && step.phase !== "start" ? C.purple : null)}
        overlay={({ pad, cs }) =>
          step.phase === "transpose" || step.phase === "transposed" ? <line x1={pad} y1={pad} x2={pad + n * cs} y2={pad + n * cs} stroke={C.purple} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} /> : null
        }
      />
    </Stage>
  );
}

function SpiralView({ st, mat }) {
  const step = st.step;
  const { top, bottom, left, right } = step.b;
  return (
    <Stage className="p-3">
      <MatrixSvg
        g={mat}
        cs={mat[0].length > 3 ? 56 : 62}
        tone={(i, j) => (step.cur && step.cur[0] === i && step.cur[1] === j ? C.active : step.seen.has(`${i},${j}`) ? C.ok : null)}
        dim={(i, j) => step.seen.has(`${i},${j}`) && !(step.cur && step.cur[0] === i && step.cur[1] === j)}
        overlay={({ pad, cs }) =>
          top <= bottom && left <= right && !step.done ? (
            <g>
              <rect x={pad + left * cs} y={pad + top * cs} width={(right - left + 1) * cs} height={(bottom - top + 1) * cs} fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="6 4" rx={8} />
              <text x={pad + left * cs + 4} y={pad + top * cs - 3} fontSize={10} fontWeight={700} fill={C.warn}>
                top={top} left={left}
              </text>
              <text x={pad + (right + 1) * cs - 4} y={pad + (bottom + 1) * cs + 12} textAnchor="end" fontSize={10} fontWeight={700} fill={C.warn}>
                bottom={bottom} right={right}
              </text>
            </g>
          ) : null
        }
      />
    </Stage>
  );
}

function ZeroView({ st }) {
  const step = st.step;
  const has = (arr, i, j) => arr.some(([a, b]) => a === i && b === j);
  return (
    <Stage className="p-3">
      <MatrixSvg
        g={step.g}
        cs={60}
        tone={(i, j) => (step.cell && step.cell[0] === i && step.cell[1] === j ? C.active : has(step.zeroed, i, j) ? C.bad : has(step.flags, i, j) ? C.warn : (i === 0 || j === 0) && !step.done ? C.purple : null)}
      />
    </Stage>
  );
}

function MathView({ st, mode }) {
  const step = st.step;
  if (mode === "gcd") {
    const mx = Math.max(step.rows[0]?.a ?? step.a, 1);
    return (
      <Stage className="space-y-3 p-3">
        <svg viewBox="0 0 560 70" className="w-full font-mono" role="img">
          {[
            ["a", step.a, C.active],
            ["b", step.b, C.purple],
          ].map(([l, v, col], k) => (
            <g key={l}>
              <text x={4} y={24 + k * 30} fontSize={12} fontWeight={700} fill={col}>
                {l}
              </text>
              <rect x={24} y={10 + k * 30} width={Math.max((v / mx) * 520, 2)} height={20} rx={4} fill={col} fillOpacity={0.25} stroke={col} className="transition-all duration-500" />
              <text x={30 + Math.max((v / mx) * 520, 2)} y={24 + k * 30} fontSize={11} fill={C.fg}>
                {v}
              </text>
            </g>
          ))}
        </svg>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>a</TableHead>
              <TableHead>b</TableHead>
              <TableHead>a = q·b + r</TableHead>
              <TableHead className="text-right">next</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {step.rows.map((r, k) => (
              <TableRow key={k} className={cn(k === step.rows.length - 1 && "bg-viz-active/8")}>
                <TableCell className="py-1 font-mono text-[12.5px]">{r.a}</TableCell>
                <TableCell className="py-1 font-mono text-[12.5px]">{r.b}</TableCell>
                <TableCell className="py-1 font-mono text-[12.5px]">{r.r === null ? "—" : `${r.a} = ${r.q}·${r.b} + ${r.r}`}</TableCell>
                <TableCell className="py-1 text-right font-mono text-[12.5px]">{r.r === null ? <span className="font-bold text-viz-ok">return {r.a}</span> : `gcd(${r.b}, ${r.r})`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stage>
    );
  }
  const bits = step.e > 0 ? step.e.toString(2) : "0";
  return (
    <Stage className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-20 font-mono text-[11px] text-muted-foreground">exp (bin)</span>
        {bits.split("").map((c, k) => (
          <span key={k} className={cn("flex h-7 w-6 items-center justify-center rounded border font-mono text-[13px] font-semibold", k === bits.length - 1 && !step.done ? (c === "1" ? "border-viz-ok bg-viz-ok/20 text-viz-ok" : "border-viz-active bg-viz-active/15 text-viz-active") : "bg-card")}>
            {c}
          </span>
        ))}
        <span className="text-[11px] text-muted-foreground">← lowest bit checked each round</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>exp</TableHead>
            <TableHead>exp & 1</TableHead>
            <TableHead>base</TableHead>
            <TableHead className="text-right">result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {step.rows.map((r, k) => (
            <TableRow key={k} className={cn(k === step.rows.length - 1 && "bg-viz-active/8")}>
              <TableCell className="py-1 font-mono text-[12.5px]">{r.e.toString(2)}</TableCell>
              <TableCell className="py-1 font-mono text-[12.5px]" style={{ color: r.bit ? C.ok : undefined }}>
                {r.bit}
              </TableCell>
              <TableCell className="max-w-[140px] truncate py-1 font-mono text-[12.5px]">{String(r.b)}</TableCell>
              <TableCell className="max-w-[180px] break-all py-1 text-right font-mono text-[12.5px] font-semibold">{String(r.r)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stage>
  );
}

export default function MatrixLab() {
  const [tab, setTab] = useState("rotate");
  const [rn, setRn] = useState(3);
  const [sp, setSp] = useState("3x4");
  const [zp, setZp] = useState("center");
  const [zCustom, setZCustom] = useState(null);
  const [mathMode, setMathMode] = useState("gcd");
  const [ga, setGa] = useState(48);
  const [gb, setGb] = useState(18);
  const [pb, setPb] = useState(3);
  const [pe, setPe] = useState(13);
  const [mod, setMod] = useState(false);

  const spiralMat = useMemo(() => {
    const { m, n } = SPIRAL_PRESETS[sp];
    return Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => i * n + j + 1));
  }, [sp]);
  const zMat = zCustom ?? ZERO_PRESETS[zp].mat;

  const steps = useMemo(() => {
    if (tab === "rotate") return rotateSteps(rn);
    if (tab === "spiral") return spiralSteps(spiralMat);
    if (tab === "zeroes") return zeroSteps(zMat);
    return mathMode === "gcd" ? gcdSteps(ga, gb) : powSteps(pb, pe, mod);
  }, [tab, rn, spiralMat, zMat, mathMode, ga, gb, pb, pe, mod]);
  const st = useStepper(steps, { baseMs: tab === "spiral" ? 650 : 1000 });
  const step = st.step;

  const randomZeros = () => {
    const m = 3 + Math.floor(Math.random() * 2), n = 3 + Math.floor(Math.random() * 2);
    const g = Array.from({ length: m }, () => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9)));
    const z = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < z; k++) g[Math.floor(Math.random() * m)][Math.floor(Math.random() * n)] = 0;
    setZCustom(g);
  };

  const code = tab === "rotate" ? ROTATE_CODE : tab === "spiral" ? SPIRAL_CODE : tab === "zeroes" ? ZERO_CODE : mathMode === "gcd" ? GCD_CODE : POW_CODE;
  const vars =
    tab === "rotate"
      ? [["phase", step.phase, "active"], ["i, j", step.i !== undefined ? `${step.i}${step.j !== undefined ? `, ${step.j}` : ""}` : "—"], ["extra space", "O(1)"]]
      : tab === "spiral"
        ? [["top", step.b.top, "warn"], ["bottom", step.b.bottom, "warn"], ["left", step.b.left, "warn"], ["right", step.b.right, "warn"], ["pushed", `${step.out.length}/${spiralMat.length * spiralMat[0].length}`, "ok"]]
        : tab === "zeroes"
          ? [["firstRowZero", String(step.fr), step.fr ? "bad" : undefined], ["firstColZero", String(step.fc), step.fc ? "bad" : undefined], ["cell", step.cell ? `[${step.cell[0]}][${step.cell[1]}]` : "—", "active"]]
          : mathMode === "gcd"
            ? [["a", step.a, "active"], ["b", step.b, "purple"], ["a % b", step.r ?? "—"], ["lcm(a₀, b₀)", (ga / gcdSteps(ga, gb).at(-1).a) * gb]]
            : [["exp", step.e, "active"], ["base", String(step.b)], ["result", String(step.r), "ok"], ["multiplications", step.mults]];

  return (
    <LabShell
      title="Matrix & Math Tricks"
      description="In-place matrix manipulation with index tricks — rotate = transpose + reverse, spiral = four shrinking boundaries, set-zeroes = row 0 / col 0 as flags — plus Euclid's GCD and fast exponentiation by squaring."
      badges={["O(M·N) matrix", "O(log n) math"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab} className="max-w-full">
          <TabsList>
            <TabsTrigger value="rotate">Rotate 90°</TabsTrigger>
            <TabsTrigger value="spiral">Spiral order</TabsTrigger>
            <TabsTrigger value="zeroes">Set zeroes</TabsTrigger>
            <TabsTrigger value="math">GCD / Fast pow</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "rotate" && (
          <ToggleGroup type="single" value={String(rn)} onValueChange={(v) => v && setRn(Number(v))}>
            <ToggleGroupItem value="3">3×3</ToggleGroupItem>
            <ToggleGroupItem value="4">4×4</ToggleGroupItem>
          </ToggleGroup>
        )}
        {tab === "spiral" && (
          <Select value={sp} onValueChange={setSp}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SPIRAL_PRESETS).map(([k, p]) => (
                <SelectItem key={k} value={k}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {tab === "zeroes" && (
          <>
            <Select
              value={zCustom ? "custom" : zp}
              onValueChange={(v) => {
                if (v === "custom") return;
                setZCustom(null);
                setZp(v);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ZERO_PRESETS).map(([k, p]) => (
                  <SelectItem key={k} value={k}>
                    {p.label}
                  </SelectItem>
                ))}
                {zCustom && <SelectItem value="custom">Random matrix</SelectItem>}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={randomZeros}>
              <Shuffle /> Random
            </Button>
          </>
        )}
        {tab === "math" && (
          <ToggleGroup type="single" value={mathMode} onValueChange={(v) => v && setMathMode(v)}>
            <ToggleGroupItem value="gcd">GCD (Euclid)</ToggleGroupItem>
            <ToggleGroupItem value="pow">Fast power</ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      <Split>
        <div className="min-w-0 space-y-3">
          {tab === "rotate" && <RotateView st={st} />}
          {tab === "spiral" && <SpiralView st={st} mat={spiralMat} />}
          {tab === "zeroes" && <ZeroView st={st} />}
          {tab === "math" && <MathView st={st} mode={mathMode} />}
          {tab === "spiral" && <ArrayView label="result" values={step.out.length ? step.out : ["·"]} states={step.out.length ? { [step.out.length - 1]: step.cur ? "active" : "ok" } : {}} cellWidth={34} showIndex={false} />}
          {tab !== "math" && (
            <Legend
              items={
                tab === "rotate"
                  ? [[C.active, "Swapping pair"], [C.purple, "Main diagonal (stays put)"], [C.warn, "Row being reversed"], [C.ok, "Rotated"]]
                  : tab === "spiral"
                    ? [[C.active, "Current cell"], [C.ok, "Already pushed"], [C.warn, "Remaining boundary"]]
                    : [[C.purple, "Row 0 / col 0 (flag storage)"], [C.warn, "Flag being set / read"], [C.active, "Cell inspected"], [C.bad, "Zeroed"]]
              }
            />
          )}
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="min-w-0 space-y-3">
          {tab === "math" && (
            <Panel title="Inputs">
              {mathMode === "gcd" ? (
                <>
                  <SliderControl label="a" value={ga} min={1} max={300} onChange={setGa} />
                  <SliderControl label="b" value={gb} min={1} max={300} onChange={setGb} />
                </>
              ) : (
                <>
                  <SliderControl label="base" value={pb} min={2} max={9} onChange={setPb} />
                  <SliderControl label="exp" value={pe} min={1} max={64} onChange={setPe} />
                  <SwitchControl label="mod 1e9+7" hint="keep numbers bounded like the C++ version" checked={mod} onChange={setMod} id="pow-mod" />
                </>
              )}
            </Panel>
          )}
          <VarTable vars={vars} />
          <CodePanel code={code} active={step.line} maxHeight={300} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
