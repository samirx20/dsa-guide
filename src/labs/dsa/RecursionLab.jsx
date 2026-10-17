import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { layoutTree } from "./_TreeLab-layout";

/* ------------------------------------------------------------------ */
/* basics: sum / factorial / fibonacci call tree + call stack          */
/* ------------------------------------------------------------------ */

const FUNCS = {
  sum: {
    label: "sum(n)",
    name: "sum",
    code: `int sum(int n) {
    if (n == 1) {            // 1. base case
        return 1;
    }
    return n + sum(n - 1);   // 2. recursive step
}`,
    base: (n) => n === 1,
    baseVal: () => 1,
    baseWhy: (n) => `${n} == 1`,
    kids: (n) => [n - 1],
    combine: (n, [a]) => n + a,
    combineStr: (n, [a]) => `${n} + ${a}`,
    lines: { check: 2, base: 3, rec: 5 },
    min: 1, max: 7, def: 3,
  },
  factorial: {
    label: "factorial(n)",
    name: "fact",
    code: `int factorial(int n) {
    if (n <= 1) return 1;          // base case
    return n * factorial(n - 1);   // single recursive call
}`,
    base: (n) => n <= 1,
    baseVal: () => 1,
    baseWhy: (n) => `${n} <= 1`,
    kids: (n) => [n - 1],
    combine: (n, [a]) => n * a,
    combineStr: (n, [a]) => `${n} × ${a}`,
    lines: { check: 2, base: 2, rec: 3 },
    min: 1, max: 7, def: 5,
  },
  fib: {
    label: "fib(n)",
    name: "fib",
    code: `int fib(int n) {
    if (n <= 1) return n;              // base case
    return fib(n - 1) + fib(n - 2);    // two recursive calls
}`,
    base: (n) => n <= 1,
    baseVal: (n) => n,
    baseWhy: (n) => `${n} <= 1`,
    kids: (n) => [n - 1, n - 2],
    combine: (n, [a, b]) => a + b,
    combineStr: (n, [a, b]) => `${a} + ${b}`,
    lines: { check: 2, base: 2, rec: 3 },
    min: 1, max: 6, def: 4,
  },
};

/** Pure: simulate the recursion and emit one snapshot per call / return. */
export function traceCalls(F, n) {
  const nodes = [];
  const steps = [];
  const status = {};
  const vals = {};
  const stack = [];
  let calls = 0;
  let maxDepth = 0;
  const label = (k) => `${F.name}(${k})`;
  const snap = (extra) => steps.push({ stack: [...stack], status: { ...status }, vals: { ...vals }, calls, maxDepth, ...extra });

  const go = (k, parent) => {
    const id = nodes.length;
    nodes.push({ id, n: k, parent, kids: [] });
    if (parent != null) nodes[parent].kids.push(id);
    calls++;
    stack.push(id);
    status[id] = "active";
    maxDepth = Math.max(maxDepth, stack.length);
    if (F.base(k)) {
      const v = F.baseVal(k);
      snap({ cur: id, line: F.lines.check, tone: "warn", note: `Call ${label(k)}: ${F.baseWhy(k)} — base case! No further calls needed.` });
      vals[id] = v;
      status[id] = "done";
      stack.pop();
      snap({ cur: id, flow: id, line: F.lines.base, tone: "ok", note: `${label(k)} returns ${v}. Its frame pops off the stack and the value flows up to ${parent == null ? "the caller" : label(nodes[parent].n)}.` });
      return v;
    }
    const ks = F.kids(k);
    snap({ cur: id, line: F.lines.rec, tone: "active", note: `Call ${label(k)}: not a base case, so it pauses and waits for ${label(ks[0])}. Stack depth is now ${stack.length}.` });
    const got = [];
    for (let j = 0; j < ks.length; j++) {
      got.push(go(ks[j], id));
      if (j < ks.length - 1)
        snap({ cur: id, line: F.lines.rec, tone: "active", note: `${label(k)} received ${got[j]} from ${label(ks[j])}; now it calls ${label(ks[j + 1])}.` });
    }
    const v = F.combine(k, got);
    vals[id] = v;
    status[id] = "done";
    stack.pop();
    snap({ cur: id, flow: id, line: F.lines.rec, tone: "ok", note: `${label(k)} resumes: ${F.combineStr(k, got)} = ${v}. Returns ${v}${parent == null ? " — the final answer." : ` to ${label(nodes[parent].n)}.`}` });
    return v;
  };
  const result = go(n, null);
  snap({ cur: 0, done: true, line: [], tone: "ok", note: `Done: ${label(n)} = ${result}. ${calls} calls in total (time ∝ nodes), but at most ${maxDepth} frames were alive at once (space ∝ depth).` });
  return { steps, nodes, result };
}

function CallTree({ nodes, step, F }) {
  const { pos, leaves, depth } = useMemo(() => layoutTree(0, (id) => nodes[id].kids), [nodes]);
  const slot = 64, rowH = 58, padX = 30, padY = 24;
  const W = Math.max(leaves === 1 ? 360 : 420, leaves * slot + padX * 2);
  const H = (depth + 1) * rowH + padY * 2 - 10;
  const X = (id) => padX + (pos.get(id).x + 0.5) * ((W - padX * 2) / leaves);
  const Y = (id) => padY + pos.get(id).y * rowH + 8;
  const top = step.stack.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Recursion tree">
      {nodes.map((nd) =>
        nd.parent == null ? null : (
          <line
            key={`e${nd.id}`}
            x1={X(nd.parent)}
            y1={Y(nd.parent) + 13}
            x2={X(nd.id)}
            y2={Y(nd.id) - 13}
            stroke={step.flow === nd.id ? C.ok : step.status[nd.id] ? C.ink : C.grid}
            strokeWidth={step.flow === nd.id ? 3 : 1.5}
            strokeDasharray={step.status[nd.id] ? undefined : "3 3"}
          />
        )
      )}
      {step.flow != null && nodes[step.flow].parent != null && (
        <text x={(X(step.flow) + X(nodes[step.flow].parent)) / 2 + 8} y={(Y(step.flow) + Y(nodes[step.flow].parent)) / 2 + 4} fontSize={13} fontWeight={700} fill={C.ok}>
          ↑{step.vals[step.flow]}
        </text>
      )}
      {nodes.map((nd) => {
        const s = step.status[nd.id];
        const isTop = nd.id === top;
        const isCur = nd.id === step.cur;
        const color = s === "done" ? C.ok : s === "active" ? C.active : C.muted;
        const w = `${F.name}(${nd.n})`.length * 7.6 + 14;
        return (
          <g key={nd.id} opacity={s ? 1 : 0.28} className="transition-opacity duration-300">
            <rect
              x={X(nd.id) - w / 2}
              y={Y(nd.id) - 13}
              width={w}
              height={26}
              rx={13}
              fill={s ? color : C.card}
              fillOpacity={s === "active" ? (isTop ? 0.35 : 0.14) : s === "done" ? 0.16 : 1}
              stroke={color}
              strokeWidth={isCur ? 2.5 : 1.2}
              strokeDasharray={s ? undefined : "3 3"}
            />
            <text x={X(nd.id)} y={Y(nd.id) + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={C.fg}>
              {F.name}({nd.n})
            </text>
            {s === "done" && (
              <text x={nd.kids.length === 1 ? X(nd.id) + w / 2 + 5 : X(nd.id)} y={nd.kids.length === 1 ? Y(nd.id) + 4.5 : Y(nd.id) + 28} textAnchor={nd.kids.length === 1 ? "start" : "middle"} fontSize={12.5} fontWeight={700} fill={C.ok}>
                ={step.vals[nd.id]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StackTower({ frames, emptyLabel = "stack empty", maxHeight = 260 }) {
  return (
    <ScrollArea style={{ maxHeight }} viewportClassName="max-h-[inherit]">
      <div className="flex flex-col-reverse gap-1">
        {frames.length === 0 && <div className="rounded-md border border-dashed px-2 py-2 text-center text-xs text-muted-foreground">{emptyLabel}</div>}
        {frames.map((f, k) => (
          <div
            key={k}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 font-mono text-[12px] transition-all duration-200",
              k === frames.length - 1 ? "border-viz-active bg-viz-active/15 text-viz-active" : "bg-card"
            )}
          >
            <span className="font-semibold">{f.title}</span>
            <span className="truncate text-[11px] text-muted-foreground">{f.sub}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function Basics() {
  const [fn, setFn] = useState("factorial");
  const F = FUNCS[fn];
  const [n, setN] = useState(F.def);
  const nn = Math.min(Math.max(n, F.min), F.max);
  const { steps, nodes } = useMemo(() => traceCalls(F, nn), [F, nn]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const label = (id) => `${F.name}(${nodes[id].n})`;
  const frames = step.stack.map((id, k) => {
    const next = step.stack[k + 1];
    return { title: label(id), sub: next != null ? `waiting for ${label(next)}` : step.status[id] === "active" && F.base(nodes[id].n) ? "base case" : "running" };
  });
  const cur = step.cur != null ? nodes[step.cur] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={fn}
          onValueChange={(v) => {
            setFn(v);
            setN(FUNCS[v].def);
          }}
        >
          <TabsList>
            {Object.entries(FUNCS).map(([k, f]) => (
              <TabsTrigger key={k} value={k}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="w-48">
          <SliderControl label="n" value={nn} min={F.min} max={F.max} onChange={setN} />
        </div>
        <Badge variant={fn === "fib" ? "danger" : "outline"} className="ml-auto">
          {fn === "fib" ? "binary recursion · O(2ⁿ) time · O(n) space" : "linear recursion · O(n) time · O(n) space"}
        </Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <CallTree nodes={nodes} step={step} F={F} />
          </Stage>
          <Legend
            items={[
              [C.active, "On the call stack (paused / running)"],
              [C.ok, "Returned — value shown under node"],
              [C.muted, "Not called yet"],
            ]}
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={F.code} active={step.line} />
          <Panel title={`Call stack · depth ${step.stack.length}`}>
            <StackTower frames={frames} />
          </Panel>
          <VarTable
            vars={[
              ["current call", cur ? label(cur.id) : "—", "active"],
              ["n", cur ? cur.n : "—"],
              ["return value", cur && step.vals[cur.id] != null ? step.vals[cur.id] : "pending", "ok"],
              ["calls so far", step.calls],
              ["max depth", step.maxDepth, "warn"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* head vs tail recursion                                              */
/* ------------------------------------------------------------------ */

const HEAD_CODE = `void printAscending(int n) {
    if (n == 0) return;      // base case

    printAscending(n - 1);  // recurse FIRST
    cout << n << " ";       // work AFTER
}`;
const TAIL_CODE = `void printDescending(int n) {
    if (n == 0) return;      // base case

    cout << n << " ";       // work FIRST
    printDescending(n - 1); // call is LAST
}`;

/** Pure: both traces have exactly 2n+1 steps so they can play in lockstep. */
export function traceHeadTail(n, tco) {
  const range = (a, b) => (a >= b ? Array.from({ length: a - b + 1 }, (_, k) => a - k) : []);
  const head = [];
  const tail = [];
  for (let k = n; k >= 1; k--) {
    head.push({ stack: range(n, k), out: [], line: 4, note: `printAscending(${k}) calls printAscending(${k - 1}) first — nothing printed yet.` });
    tail.push({ stack: tco ? [k] : range(n, k), out: range(n, k), line: [4, 5], note: `printDescending(${k}) prints ${k} immediately, then calls (${k - 1}) as its very last action.` });
  }
  head.push({ stack: range(n, 0), out: [], line: 2, base: true, note: `printAscending(0) hits the base case and returns.` });
  tail.push({ stack: tco ? [0] : range(n, 0), out: range(n, 1), line: 2, base: true, note: `printDescending(0) hits the base case and returns.` });
  for (let k = 1; k <= n; k++) {
    head.push({ stack: range(n, k), out: range(k, 1).reverse(), line: 5, unwind: true, note: `printAscending(${k}) resumes on the unwind and prints ${k}.` });
    tail.push({
      stack: tco ? [] : range(n, k),
      out: range(n, 1),
      line: 6,
      unwind: true,
      note: tco ? `With tail-call optimisation the frame was reused — there is nothing to unwind.` : `printDescending(${k}) has no work left after its call — it just returns.`,
    });
  }
  return head.map((h, k) => ({ head: h, tail: tail[k], k }));
}

function HTColumn({ title, code, snap, fn, maxDepth, tone }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={tone}>{title}</Badge>
        <span className="text-xs text-muted-foreground">max depth {maxDepth}</span>
      </div>
      <CodePanel code={code} active={snap.line} maxHeight={200} />
      <Panel title={`Call stack · depth ${snap.stack.length}`}>
        <StackTower
          maxHeight={210}
          emptyLabel="no frames (reused by TCO)"
          frames={snap.stack.map((k, j) => ({ title: `${fn}(${k})`, sub: j < snap.stack.length - 1 ? `waiting for ${fn}(${snap.stack[j + 1]})` : k === 0 ? "base case" : snap.unwind ? (fn === "printA" ? "resumed: prints" : "returns") : "running" }))}
        />
      </Panel>
      <div className="rounded-lg border bg-background/50 p-2">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Output</div>
        <div className="flex min-h-8 flex-wrap gap-1">
          {snap.out.map((v, j) => (
            <span key={j} className={cn("rounded-md border px-2 py-0.5 font-mono text-sm font-semibold", j === snap.out.length - 1 ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : "bg-card")}>
              {v}
            </span>
          ))}
          {snap.out.length === 0 && <span className="text-xs text-muted-foreground">(nothing printed yet)</span>}
        </div>
      </div>
    </div>
  );
}

function HeadTail() {
  const [n, setN] = useState(3);
  const [tco, setTco] = useState(false);
  const steps = useMemo(() => traceHeadTail(n, tco), [n, tco]);
  const st = useStepper(steps, { baseMs: 1000 });
  const s = st.step;
  const phase = s.head.base ? "base case" : s.head.unwind ? "unwinding" : "winding (going deeper)";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SliderControl label="n" value={n} min={1} max={6} onChange={setN} />
        <SwitchControl label="Tail-call optimisation" hint="Compiler reuses the frame for the tail call" checked={tco} onChange={setTco} />
      </div>
      <Narration tone={s.head.base ? "warn" : s.head.unwind ? "ok" : "active"}>
        <b>Phase: {phase}.</b> Head: {s.head.note} Tail: {s.tail.note}
      </Narration>
      <div className="grid gap-4 md:grid-cols-2">
        <HTColumn title="Head recursion — work after the call" code={HEAD_CODE} snap={s.head} fn="printA" maxDepth={n + 1} tone="active" />
        <HTColumn title="Tail recursion — work before the call" code={TAIL_CODE} snap={s.tail} fn="printD" maxDepth={tco ? 1 : n + 1} tone="purple" />
      </div>
      <StatGrid cols={3}>
        <Stat label="Head output" value={s.head.out.join(" ") || "—"} tone="active" />
        <Stat label="Tail output" value={s.tail.out.join(" ") || "—"} tone="purple" />
        <Stat label="Tail stack space" value={tco ? "O(1)" : "O(n)"} tone={tco ? "ok" : "warn"} hint="C++ compilers may apply TCO at -O2, but the standard does not guarantee it." />
      </StatGrid>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* divide & conquer: findMaxDC and merge sort                          */
/* ------------------------------------------------------------------ */

const DC_CODE = {
  max: `int findMaxDC(vector<int>& arr, int left, int right) {
    // 1. Base case: one element is its own max
    if (left == right) {
        return arr[left];
    }
    // 2. Divide
    int mid = left + (right - left) / 2;
    // 3. Conquer
    int maxLeft = findMaxDC(arr, left, mid);
    int maxRight = findMaxDC(arr, mid + 1, right);
    // 4. Combine
    return max(maxLeft, maxRight);
}`,
  merge: `void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;  // Base case: 0 or 1 element

    int mid = left + (right - left) / 2;

    // Divide & Conquer
    mergeSort(arr, left, mid);       // Sort left half
    mergeSort(arr, mid + 1, right);  // Sort right half

    // Combine
    merge(arr, left, mid, right);    // Merge sorted halves
}`,
};
const DC_PRESETS = {
  max: [1, 2, 3, 4, 5, 6, 7, 8],
  merge: [38, 27, 43, 3, 9, 82, 10],
};

/** Pure: divide/conquer/combine trace. mode = "max" | "merge". */
export function traceDC(input, mode) {
  const arr = [...input];
  const steps = [];
  const seg = {}; // key "l-r" -> { state, mid, vals, best }
  const stack = [];
  let calls = 0;
  const snap = (extra) => steps.push({ seg: JSON.parse(JSON.stringify(seg)), arr: [...arr], stack: [...stack], calls, ...extra });
  const L = mode === "max" ? { base: [3, 4], mid: 7, left: 9, right: 10, combine: 12 } : { base: 2, mid: 4, left: 7, right: 8, combine: 11 };

  const go = (l, r, depth) => {
    const key = `${l}-${r}`;
    calls++;
    stack.push(key);
    if (l === r) {
      seg[key] = { l, r, depth, state: "done", vals: [arr[l]], best: arr[l] };
      snap({ cur: key, phase: "base", line: L.base, vars: { left: l, right: r }, note: mode === "max" ? `findMaxDC(${l},${r}): a single element is its own max → returns ${arr[l]}.` : `mergeSort(${l},${r}): one element is already sorted → return.` });
      stack.pop();
      return arr[l];
    }
    const mid = l + ((r - l) >> 1);
    seg[key] = { l, r, depth, mid, state: "divide", vals: arr.slice(l, r + 1) };
    snap({ cur: key, phase: "divide", line: L.mid, vars: { left: l, right: r, mid }, note: `Divide [${l}..${r}] at mid = ${mid} → left [${l}..${mid}] and right [${mid + 1}..${r}].` });
    const a = go(l, mid, depth + 1);
    snap({ cur: key, phase: "conquer", line: L.right, vars: { left: l, right: r, mid, ...(mode === "max" ? { maxLeft: a } : {}) }, note: mode === "max" ? `Left half solved: maxLeft = ${a}. Now conquer the right half [${mid + 1}..${r}].` : `Left half [${l}..${mid}] is sorted. Now conquer the right half [${mid + 1}..${r}].` });
    const b = go(mid + 1, r, depth + 1);
    let res;
    if (mode === "max") {
      res = Math.max(a, b);
      seg[key] = { ...seg[key], state: "done", best: res };
      snap({ cur: key, phase: "combine", line: L.combine, vars: { left: l, right: r, mid, maxLeft: a, maxRight: b }, note: `Combine: max(${a}, ${b}) = ${res}. findMaxDC(${l},${r}) returns ${res}.` });
    } else {
      const left = arr.slice(l, mid + 1);
      const right = arr.slice(mid + 1, r + 1);
      const merged = [];
      let i = 0, j = 0;
      while (i < left.length && j < right.length) merged.push(left[i] <= right[j] ? left[i++] : right[j++]);
      while (i < left.length) merged.push(left[i++]);
      while (j < right.length) merged.push(right[j++]);
      for (let k = 0; k < merged.length; k++) arr[l + k] = merged[k];
      seg[key] = { ...seg[key], state: "done", vals: merged };
      snap({ cur: key, phase: "combine", line: L.combine, vars: { left: l, right: r, mid }, note: `Combine: merge [${left.join(", ")}] + [${right.join(", ")}] → [${merged.join(", ")}].` });
    }
    stack.pop();
    return res;
  };
  const out = go(0, arr.length - 1, 0);
  snap({ cur: null, phase: "done", line: [], vars: {}, done: true, note: mode === "max" ? `Done: the maximum is ${out}. ${calls} calls (2N − 1) → O(N) time; the stack never holds more than ⌈log₂N⌉ + 1 frames.` : `Done: [${arr.join(", ")}]. log₂(N) levels × O(N) merging per level = O(N log N).` });
  return steps;
}

function SplitTree({ values, step, mode }) {
  const n = values.length;
  const W = 480, padX = 8, rowH = 60;
  const cw = (W - padX * 2) / n;
  const levels = Math.ceil(Math.log2(n)) + 1;
  const H = levels * rowH + 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Divide and conquer split tree">
      {Object.values(step.seg).map((s) => {
        const key = `${s.l}-${s.r}`;
        const isCur = step.cur === key;
        const onStack = step.stack.includes(key);
        const done = s.state === "done";
        const color = isCur ? (step.phase === "combine" ? C.ok : step.phase === "base" ? C.warn : C.active) : done ? C.ok : onStack ? C.active : C.muted;
        const x = padX + s.l * cw + 3;
        const y = 8 + s.depth * rowH;
        const w = (s.r - s.l + 1) * cw - 6;
        return (
          <g key={key}>
            <rect x={x} y={y} width={w} height={38} rx={7} fill={color} fillOpacity={isCur ? 0.2 : 0.08} stroke={color} strokeWidth={isCur ? 2.4 : 1.2} />
            {s.vals.map((v, k) => {
              const hl = mode === "max" && done && v === s.best;
              return (
                <text key={k} x={x + (k + 0.5) * cw - 0} y={y + 24.5} textAnchor="middle" fontSize={15} fontWeight={hl || (done && mode === "merge") ? 700 : 500} fill={hl ? C.ok : mode === "max" && done ? C.muted : C.fg}>
                  {v}
                </text>
              );
            })}
            {s.mid != null && !done && <line x1={padX + (s.mid + 1) * cw} x2={padX + (s.mid + 1) * cw} y1={y - 3} y2={y + 41} stroke={C.active} strokeWidth={2} strokeDasharray="4 3" />}
            {mode === "max" && done && s.l !== s.r && (
              <text x={x + w - 4} y={y + 52} textAnchor="end" fontSize={11.5} fontWeight={700} fill={C.ok}>
                max={s.best}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DivideConquer() {
  const [mode, setMode] = useState("max");
  const [custom, setCustom] = useState(null);
  const values = custom ?? DC_PRESETS[mode];
  const steps = useMemo(() => traceDC(values, mode), [values, mode]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const randomize = () => {
    const n = 5 + Math.floor(Math.random() * 4);
    setCustom(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * (mode === "max" ? 20 : 90))));
  };
  const phaseTone = { divide: "active", conquer: "purple", combine: "success", base: "warning", done: "success" }[step.phase];
  const v = step.vars;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={mode}
          onValueChange={(m) => {
            setMode(m);
            setCustom(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="max">Max element</TabsTrigger>
            <TabsTrigger value="merge">Merge sort</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={randomize}>
          <Shuffle /> Random
        </Button>
        {custom && (
          <Button variant="ghost" size="sm" onClick={() => setCustom(null)}>
            Chapter example
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          {["divide", "conquer", "combine"].map((p) => (
            <Badge key={p} variant={step.phase === p ? phaseTone : "outline"} className="capitalize">
              {p}
            </Badge>
          ))}
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <SplitTree values={values} step={step} mode={mode} />
          </Stage>
          <Legend
            items={[
              [C.active, "Dividing / on the call stack"],
              [C.warn, "Base case"],
              [C.ok, mode === "max" ? "Combined — max found" : "Combined — merged & sorted"],
            ]}
          />
          <Narration tone={step.phase === "combine" || step.done ? "ok" : step.phase === "base" ? "warn" : "active"}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={DC_CODE[mode]} active={step.line} />
          <VarTable
            vars={[
              ["left", v.left ?? "—", "active"],
              ["right", v.right ?? "—", "active"],
              ["mid", v.mid ?? "—"],
              ...(mode === "max" ? [["maxLeft", v.maxLeft ?? "?"], ["maxRight", v.maxRight ?? "?"]] : [["arr", `[${step.arr.join(",")}]`]]),
              ["calls", step.calls],
              ["stack depth", step.stack.length, "warn"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

const META = {
  basics: { title: "Recursion — Call Stack & Recursion Tree", description: "Each call pushes a frame and pauses; base cases return first and values flow back up the tree as the stack unwinds.", badges: ["Base case", "Call stack", "Time = nodes, Space = depth"] },
  "head-tail": { title: "Head vs Tail Recursion — Printing Order", description: "Same recursion, different placement of the work: before the call prints on the way down, after the call prints on the way back up.", badges: ["Winding vs unwinding", "Tail-call optimisation"] },
  "divide-conquer": { title: "Divide & Conquer — Split, Solve, Combine", description: "Split the range in half, solve both halves recursively, then combine the two answers.", badges: ["Divide → Conquer → Combine", "O(log N) stack depth"] },
};

export default function RecursionLab({ variant = "basics" }) {
  const m = META[variant] ?? META.basics;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "head-tail" ? <HeadTail /> : variant === "divide-conquer" ? <DivideConquer /> : <Basics />}
    </LabShell>
  );
}
