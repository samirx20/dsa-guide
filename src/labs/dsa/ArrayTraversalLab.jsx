import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, VarTable, useStepper } from "@/viz/kit";

/* ------------------------------------------------------------------ */
/* 2D traversal orders                                                 */
/* ------------------------------------------------------------------ */

const ORDERS = {
  row: {
    label: "Row-major",
    code: `int ROWS = matrix.size();
int COLS = matrix[0].size();

for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
        cout << matrix[r][c] << " ";
    }
}`,
    line: 6,
  },
  col: {
    label: "Column-major",
    code: `int ROWS = matrix.size();
int COLS = matrix[0].size();

for (int c = 0; c < COLS; c++) {
    for (int r = 0; r < ROWS; r++) {
        cout << matrix[r][c] << " ";
    }
}`,
    line: 6,
  },
  diag: {
    label: "Main diagonal",
    code: `// r == c on the main diagonal
int N = min(ROWS, COLS);
for (int i = 0; i < N; i++) {
    cout << matrix[i][i] << " ";
}`,
    line: 4,
  },
  anti: {
    label: "Anti-diagonal",
    code: `// r + c == N - 1 on the anti-diagonal
int N = min(ROWS, COLS);
for (int r = 0; r < N; r++) {
    int c = N - 1 - r;
    cout << matrix[r][c] << " ";
}`,
    line: [4, 5],
  },
  spiral: {
    label: "Spiral",
    code: `int top = 0, bottom = ROWS - 1;
int left = 0, right = COLS - 1;
while (top <= bottom && left <= right) {
    for (int c = left; c <= right; c++) visit(top, c);
    top++;
    for (int r = top; r <= bottom; r++) visit(r, right);
    right--;
    if (top <= bottom) {
        for (int c = right; c >= left; c--) visit(bottom, c);
        bottom--;
    }
    if (left <= right) {
        for (int r = bottom; r >= top; r--) visit(r, left);
        left++;
    }
}`,
  },
};

/** Ordered list of cells [r, c, codeLine] for a traversal. */
function traversalCells(order, R, Cn) {
  const out = [];
  if (order === "row") for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) out.push([r, c, 6]);
  else if (order === "col") for (let c = 0; c < Cn; c++) for (let r = 0; r < R; r++) out.push([r, c, 6]);
  else if (order === "diag") for (let i = 0; i < Math.min(R, Cn); i++) out.push([i, i, 4]);
  else if (order === "anti") {
    const N = Math.min(R, Cn);
    for (let r = 0; r < N; r++) out.push([r, N - 1 - r, [4, 5]]);
  } else {
    let top = 0, bottom = R - 1, left = 0, right = Cn - 1;
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) out.push([top, c, 4]);
      top++;
      for (let r = top; r <= bottom; r++) out.push([r, right, 6]);
      right--;
      if (top <= bottom) {
        for (let c = right; c >= left; c--) out.push([bottom, c, 9]);
        bottom--;
      }
      if (left <= right) {
        for (let r = bottom; r >= top; r--) out.push([r, left, 13]);
        left++;
      }
    }
  }
  return out;
}

function traversalSteps(order, R, Cn, M) {
  const cells = traversalCells(order, R, Cn);
  const steps = [{ k: -1, line: order === "spiral" ? [1, 2] : [1, 2], note: `Matrix is ${R}×${Cn}, stored row by row in one contiguous block of ${R * Cn} ints. Press Play to traverse ${ORDERS[order].label.toLowerCase()}.`, tone: "default" }];
  cells.forEach(([r, c, line], k) => {
    const flat = r * Cn + c;
    const prev = k > 0 ? cells[k - 1][0] * Cn + cells[k - 1][1] : null;
    const stride = prev == null ? 0 : flat - prev;
    const jump = prev != null && Math.abs(stride) !== 1;
    steps.push({
      k, r, c, flat, stride, line,
      note: `Visit (${r}, ${c}) → value ${M[r][c]}. Memory index = r·COLS + c = ${r}·${Cn} + ${c} = ${flat}.` + (prev == null ? "" : jump ? ` Jumped ${stride > 0 ? "+" : ""}${stride} slots in memory (cache-unfriendly stride).` : ` Next-door in memory (stride ${stride > 0 ? "+1" : "−1"}).`),
      tone: jump ? "warn" : "active",
    });
  });
  const jumps = cells.reduce((a, _, k) => (k && Math.abs(cells[k][0] * Cn + cells[k][1] - (cells[k - 1][0] * Cn + cells[k - 1][1])) !== 1 ? a + 1 : a), 0);
  steps.push({ k: cells.length, done: true, line: [], note: `Done: visited ${cells.length} cells with ${jumps} non-contiguous memory jumps. Output: ${cells.map(([r, c]) => M[r][c]).join(" ")}`, tone: "ok" });
  return { steps, cells };
}

function MatrixGrid({ M, cells, k }) {
  const R = M.length, Cn = M[0].length;
  const cs = Math.min(64, 340 / Math.max(R, Cn));
  const W = Cn * cs + 40, H = R * cs + 30;
  const order = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  const center = ([r, c]) => [30 + c * cs + cs / 2, 20 + r * cs + cs / 2];
  const path = cells.slice(0, Math.max(0, k + 1)).map(center);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[420px] font-mono">
      {Array.from({ length: Cn }, (_, c) => (
        <text key={`c${c}`} x={30 + c * cs + cs / 2} y={13} textAnchor="middle" fontSize={10} fill={C.muted}>c{c}</text>
      ))}
      {Array.from({ length: R }, (_, r) => (
        <text key={`r${r}`} x={14} y={20 + r * cs + cs / 2 + 4} textAnchor="middle" fontSize={10} fill={C.muted}>r{r}</text>
      ))}
      {M.map((row, r) =>
        row.map((v, c) => {
          const idx = order.get(`${r},${c}`);
          const visited = idx != null && idx <= k;
          const cur = idx === k;
          const fill = cur ? C.active : visited ? C.ok : C.fill;
          return (
            <g key={`${r},${c}`}>
              <rect x={30 + c * cs + 2} y={20 + r * cs + 2} width={cs - 4} height={cs - 4} rx={6} fill={fill} fillOpacity={cur ? 0.35 : visited ? 0.22 : 0.6} stroke={cur ? C.active : visited ? C.ok : C.border} strokeWidth={cur ? 2 : 1} className="transition-all duration-200" />
              <text x={30 + c * cs + cs / 2} y={20 + r * cs + cs / 2 + 5} textAnchor="middle" fontSize={Math.max(11, cs * 0.28)} fontWeight={600} fill={C.fg}>{v}</text>
              {visited && (
                <text x={30 + c * cs + 7} y={20 + r * cs + 14} fontSize={10} fill={cur ? C.active : C.ok}>#{idx + 1}</text>
              )}
            </g>
          );
        })
      )}
      {path.length > 1 && <polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.active} strokeWidth={2} strokeOpacity={0.55} strokeLinejoin="round" strokeDasharray="5 4" />}
      {path.length > 0 && <circle cx={path.at(-1)[0]} cy={path.at(-1)[1] + cs * 0.28} r={3.5} fill={C.active} />}
    </svg>
  );
}

function MemoryStrip({ M, cells, k }) {
  const R = M.length, Cn = M[0].length;
  const flat = M.flat();
  const visitedAt = new Map(cells.map(([r, c], i) => [r * Cn + c, i]));
  const cw = Math.min(40, 600 / flat.length);
  const W = flat.length * cw + 20, H = 64;
  const cur = k >= 0 && k < cells.length ? cells[k][0] * Cn + cells[k][1] : null;
  const prev = k >= 1 && k < cells.length ? cells[k - 1][0] * Cn + cells[k - 1][1] : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {flat.map((v, i) => {
        const vi = visitedAt.get(i);
        const visited = vi != null && vi <= k;
        const isCur = i === cur;
        return (
          <g key={i}>
            <rect x={10 + i * cw + 1} y={14} width={cw - 2} height={24} rx={3} fill={isCur ? C.active : visited ? C.ok : C.fill} fillOpacity={isCur ? 0.35 : visited ? 0.18 : 1} stroke={isCur ? C.active : i % Cn === 0 ? C.muted : C.border} strokeWidth={isCur ? 2 : 1} />
            <text x={10 + i * cw + cw / 2} y={30} textAnchor="middle" fontSize={10} fill={C.fg}>{v}</text>
            <text x={10 + i * cw + cw / 2} y={50} textAnchor="middle" fontSize={10} fill={C.muted}>{i}</text>
            {i % Cn === 0 && <text x={10 + i * cw + 2} y={10} fontSize={10} fill={C.muted}>row {i / Cn}</text>}
          </g>
        );
      })}
      {cur != null && prev != null && Math.abs(cur - prev) !== 1 && (
        <path d={`M ${10 + prev * cw + cw / 2} 40 Q ${10 + ((prev + cur) / 2) * cw + cw / 2} ${H + 6} ${10 + cur * cw + cw / 2} 40`} fill="none" stroke={C.warn} strokeWidth={1.6} strokeDasharray="3 3" />
      )}
    </svg>
  );
}

const MATRICES = {
  standard: { label: "3×3 (chapter)", M: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  wide: { label: "3×4 rectangle", M: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] },
  tall: { label: "4×2 tall", M: [[1, 2], [3, 4], [5, 6], [7, 8]] },
  single: { label: "1×5 single row", M: [[1, 2, 3, 4, 5]] },
};

function TraversalMode() {
  const [order, setOrder] = useState("row");
  const [preset, setPreset] = useState("standard");
  const [dims, setDims] = useState(null); // custom [R, C]
  const M = useMemo(() => {
    if (!dims) return MATRICES[preset].M;
    return Array.from({ length: dims[0] }, (_, r) => Array.from({ length: dims[1] }, (_, c) => r * dims[1] + c + 1));
  }, [dims, preset]);
  const R = M.length, Cn = M[0].length;
  const { steps, cells } = useMemo(() => traversalSteps(order, R, Cn, M), [order, R, Cn, M]);
  const st = useStepper(steps, { baseMs: 700 });
  const step = st.step;
  const k = step.done ? cells.length - 1 : step.k;
  const output = cells.slice(0, Math.max(0, k + 1)).map(([r, c]) => M[r][c]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={order} onValueChange={(v) => v && setOrder(v)}>
          {Object.entries(ORDERS).map(([key, o]) => (
            <ToggleGroupItem key={key} value={key}>{o.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select value={dims ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setDims(null), setPreset(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(MATRICES).map(([key, p]) => <SelectItem key={key} value={key}>{p.label}</SelectItem>)}
            {dims && <SelectItem value="custom">Custom {dims[0]}×{dims[1]}</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <MatrixGrid M={M} cells={cells} k={k} />
          </Stage>
          <Stage className="px-2 pt-1">
            <div className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actual memory (row-major, contiguous)</div>
            <MemoryStrip M={M} cells={cells} k={k} />
          </Stage>
          <Legend items={[[C.active, "Current cell"], [C.ok, "Visited"], [C.warn, "Non-contiguous jump"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={ORDERS[order].code} active={step.line} />
          <VarTable
            vars={[
              ["r", step.r ?? "—", "active"],
              ["c", step.c ?? "—", "active"],
              ["matrix[r][c]", step.r != null ? M[step.r][step.c] : "—"],
              ["flat = r*COLS + c", step.flat ?? "—", "purple"],
              ["stride from prev", step.k > 0 ? step.stride : "—", step.k > 0 && Math.abs(step.stride) !== 1 ? "warn" : undefined],
              ["output", output.join(" ") || "—", "ok"],
            ]}
          />
          <Panel title="Matrix size">
            <SliderControl label="Rows" value={R} min={1} max={6} onChange={(v) => setDims([v, Cn])} />
            <SliderControl label="Columns" value={Cn} min={1} max={7} onChange={(v) => setDims([R, v])} />
          </Panel>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* In-place modifications                                              */
/* ------------------------------------------------------------------ */

const INPLACE = {
  remove: {
    label: "Remove element",
    presets: { standard: [3, 2, 3, 4, 3], all: [3, 3, 3], none: [1, 2, 4, 5] },
    code: `int removeElement(vector<int>& nums, int val) {
    int write_idx = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != val) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    return write_idx;
}`,
  },
  dedupe: {
    label: "Remove duplicates",
    presets: { standard: [1, 1, 2, 3, 3], all: [5, 5, 5, 5], none: [1, 2, 3, 4], long: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] },
    code: `int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    int write_idx = 1;
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] != nums[i - 1]) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    return write_idx;
}`,
  },
  zeroes: {
    label: "Move zeroes",
    presets: { standard: [0, 1, 0, 3, 12], all: [0, 0, 0], none: [1, 2, 3], mixed: [4, 0, 0, 5, 0, 7, 1] },
    code: `void moveZeroes(vector<int>& nums) {
    int write_idx = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != 0) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    while (write_idx < nums.size()) {
        nums[write_idx] = 0;
        write_idx++;
    }
}`,
  },
  reverse: {
    label: "Reverse",
    presets: { standard: [1, 2, 3, 4, 5], all: [10, 20], none: [7], long: [1, 2, 3, 4, 5, 6, 7, 8] },
    code: `void reverseArray(vector<int>& nums) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {
        swap(nums[left], nums[right]);
        left++;
        right--;
    }
}`,
  },
};
const PRESET_LABELS = { standard: "Standard case", all: "Edge case", none: "No-op case", long: "Longer input", mixed: "Mixed zeros" };

function inPlaceSteps(mode, input, val = 3) {
  const a = [...input];
  const s = [];
  const snap = (o) => s.push({ arr: [...a], ...o });
  if (mode === "remove") {
    let w = 0;
    snap({ i: null, w, line: 2, note: `write_idx = 0. Read pointer i will scan; write_idx marks where the next keeper goes. Removing val = ${val}.`, ops: 0 });
    for (let i = 0; i < a.length; i++) {
      snap({ i, w, line: 4, cmp: i, note: `Read nums[${i}] = ${a[i]}. Is it != ${val}?`, ops: i + 1 });
      if (a[i] !== val) {
        a[w] = a[i];
        snap({ i, w, line: [5, 6], wrote: w, note: `Keep it: nums[${w}] = ${a[i]}, then write_idx → ${w + 1}.`, tone: "ok", ops: i + 1 });
        w++;
      } else snap({ i, w, line: 4, skip: i, note: `${a[i]} == ${val} → skip. write_idx stays at ${w}.`, tone: "bad", ops: i + 1 });
    }
    snap({ i: null, w, line: 9, done: true, valid: w, note: `Return ${w}: the first ${w} slots are the answer; slots ${w}..${a.length - 1} are leftover garbage. O(N) time, O(1) space.`, tone: "ok", ops: a.length });
  } else if (mode === "dedupe") {
    if (!a.length) return [{ arr: [], line: 2, done: true, valid: 0, note: "Empty array → return 0.", tone: "ok", ops: 0 }];
    let w = 1;
    snap({ i: null, w, line: 3, note: `nums[0] is always unique, so write_idx starts at 1.`, ops: 0 });
    for (let i = 1; i < a.length; i++) {
      snap({ i, w, line: 5, cmp: i, cmp2: i - 1, note: `Compare nums[${i}] = ${a[i]} with nums[${i - 1}] = ${a[i - 1]}.`, ops: i });
      if (a[i] !== a[i - 1]) {
        a[w] = a[i];
        snap({ i, w, line: [6, 7], wrote: w, note: `New value → nums[${w}] = ${a[i]}, write_idx → ${w + 1}.`, tone: "ok", ops: i });
        w++;
      } else snap({ i, w, line: 5, skip: i, note: `Duplicate of its neighbour → skip.`, tone: "bad", ops: i });
    }
    snap({ i: null, w, line: 10, done: true, valid: w, note: `Return ${w} unique values. Note the comparison reads nums[i-1] — safe because write_idx never overtakes i.`, tone: "ok", ops: a.length - 1 });
  } else if (mode === "zeroes") {
    let w = 0;
    snap({ i: null, w, line: 2, note: `Pass 1 compacts the non-zeros to the front; pass 2 fills the tail with zeros.`, ops: 0 });
    for (let i = 0; i < a.length; i++) {
      snap({ i, w, line: 4, cmp: i, note: `Read nums[${i}] = ${a[i]}.`, ops: i + 1 });
      if (a[i] !== 0) {
        a[w] = a[i];
        snap({ i, w, line: [5, 6], wrote: w, note: `Non-zero → nums[${w}] = ${a[i]}, write_idx → ${w + 1}.`, tone: "ok", ops: i + 1 });
        w++;
      } else snap({ i, w, line: 4, skip: i, note: `Zero → skip it for now.`, tone: "bad", ops: i + 1 });
    }
    let ops = a.length;
    while (w < a.length) {
      a[w] = 0;
      ops++;
      snap({ i: null, w, line: [9, 10], wrote: w, fill: true, note: `Pass 2: fill nums[${w}] = 0.`, tone: "warn", ops });
      w++;
    }
    snap({ i: null, w, line: 13, done: true, valid: a.length, note: `Non-zeros keep their relative order; zeros are at the end. O(N), O(1).`, tone: "ok", ops });
  } else {
    let l = 0, r = a.length - 1, ops = 0;
    snap({ l, r, line: 2, note: `left = 0, right = ${r}. Swap the ends and squeeze inward.`, ops });
    while (l < r) {
      [a[l], a[r]] = [a[r], a[l]];
      ops++;
      snap({ l, r, line: 4, swapped: [l, r], note: `swap(nums[${l}], nums[${r}]) → ${a[l]} ↔ ${a[r]}.`, tone: "ok", ops });
      l++;
      r--;
      snap({ l, r, line: [5, 6], note: l < r ? `Move inward: left = ${l}, right = ${r}.` : `left (${l}) ≥ right (${r}) → stop.`, ops });
    }
    snap({ l, r, line: 8, done: true, valid: a.length, note: `Reversed with ${ops} swaps (⌊N/2⌋). ${a.length % 2 ? "The middle element never moves." : ""}`, tone: "ok", ops });
  }
  return s;
}

function InPlaceMode() {
  const [mode, setMode] = useState("remove");
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const cfg = INPLACE[mode];
  const values = custom ?? cfg.presets[preset] ?? cfg.presets.standard;
  const steps = useMemo(() => inPlaceSteps(mode, values), [mode, values]);
  const st = useStepper(steps, { baseMs: 750 });
  const step = st.step;

  const randomize = () => {
    const n = 6 + Math.floor(Math.random() * 4);
    let arr;
    if (mode === "dedupe") {
      arr = [];
      let v = Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        if (Math.random() < 0.55) v += 1;
        arr.push(v);
      }
    } else if (mode === "zeroes") arr = Array.from({ length: n }, () => (Math.random() < 0.4 ? 0 : 1 + Math.floor(Math.random() * 9)));
    else if (mode === "remove") arr = Array.from({ length: n }, () => (Math.random() < 0.35 ? 3 : 1 + Math.floor(Math.random() * 6)));
    else arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 20));
    setCustom(arr);
  };

  const states = {};
  step.arr.forEach((_, k) => {
    if (step.done && step.valid != null && k >= step.valid) states[k] = "dim";
    else if (step.done) states[k] = "ok";
  });
  if (!step.done) {
    if (mode === "reverse") {
      step.arr.forEach((_, k) => {
        if (k < step.l || k > step.r) states[k] = "ok";
      });
      if (step.swapped) step.swapped.forEach((k) => (states[k] = "warn"));
    } else {
      for (let k = 0; k < (step.w ?? 0); k++) states[k] = "ok";
      if (step.cmp2 != null) states[step.cmp2] = "purple";
      if (step.cmp != null) states[step.cmp] = "active";
      if (step.skip != null) states[step.skip] = "bad";
      if (step.wrote != null) states[step.wrote] = step.fill ? "warn" : "ok";
    }
  }
  const pointers =
    mode === "reverse"
      ? step.done ? [] : [{ index: step.l, label: "left", tone: "active" }, { index: step.r, label: "right", tone: "purple" }].filter((p) => p.index >= 0 && p.index < step.arr.length)
      : [
          ...(step.i != null ? [{ index: step.i, label: "i (read)", tone: "active" }] : []),
          ...(!step.done && step.w != null && step.w < step.arr.length ? [{ index: step.w, label: "write", tone: "warning" }] : []),
        ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={(v) => (setMode(v), setCustom(null), setPreset("standard"))}>
          <TabsList>
            {Object.entries(INPLACE).map(([key, m]) => <TabsTrigger key={key} value={key}>{m.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setPreset(v))}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(cfg.presets).map((key) => <SelectItem key={key} value={key}>{PRESET_LABELS[key]}: [{cfg.presets[key].join(",")}]</SelectItem>)}
            {custom && <SelectItem value="custom">Random input</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={randomize}><Shuffle /> Random</Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ArrayView values={values} label="original input" showIndex={false} states={Object.fromEntries(values.map((_, k) => [k, "dim"]))} cellWidth={40} />
            <div className="mt-3" />
            <ArrayView values={step.arr} states={states} pointers={pointers} label="nums (modified in place)" cellWidth={40} />
          </Stage>
          <Legend
            items={
              mode === "reverse"
                ? [[C.warn, "Just swapped"], [C.ok, "Final position"]]
                : [[C.active, "Being read"], [C.ok, "Kept / written"], [C.bad, "Skipped"], ...(mode === "dedupe" ? [[C.purple, "Previous element"]] : [])]
            }
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={cfg.code} active={step.line} />
          <VarTable
            vars={
              mode === "reverse"
                ? [["left", step.l, "active"], ["right", step.r, "purple"], ["swaps", step.ops], ["extra space", "O(1)", "ok"]]
                : [
                    ["i (read)", step.i ?? "—", "active"],
                    ["write_idx", step.w, "warn"],
                    ["reads + writes", step.ops],
                    ["extra space", "O(1)", "ok"],
                  ]
            }
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function ArrayTraversalLab({ variant = "traversal" }) {
  const inPlace = variant === "in-place";
  return (
    <LabShell
      title={inPlace ? "In-Place Modifications — Read / Write Pointers" : "2D Array Traversal — Visit Order vs Memory Layout"}
      description={
        inPlace
          ? "Compact, filter and reverse an array without allocating a second one. Watch the read pointer scan while the write pointer only advances for keepers."
          : "Pick a traversal order and watch which cell is visited next — and where that cell actually lives in the contiguous row-major block (index = r·COLS + c)."
      }
      badges={inPlace ? ["O(N) time", "O(1) space"] : ["O(R×C) time", "row-major memory"]}
    >
      {inPlace ? <InPlaceMode /> : <TraversalMode />}
    </LabShell>
  );
}
