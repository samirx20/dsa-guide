import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TONE = { active: C.active, ok: C.ok, bad: C.bad, warn: C.warn, purple: C.purple };
const parentOf = (i) => Math.floor((i - 1) / 2);

/* ------------------------------------------------------------------ */
/* Shared visuals: complete-tree drawing + array strip with hovers     */
/* ------------------------------------------------------------------ */

function HeapTree({ arr, hl = {}, hover, onHover, W = 480 }) {
  const n = arr.length;
  const levels = Math.max(1, Math.floor(Math.log2(Math.max(n, 1))) + 1);
  const rowH = 62, pad = 26;
  const H = (levels - 1) * rowH + pad * 2 + 8;
  const P = (k) => {
    const L = Math.floor(Math.log2(k + 1));
    const p = k - (2 ** L - 1);
    return { x: ((p + 0.5) / 2 ** L) * W, y: pad + L * rowH };
  };
  const rel = {};
  if (hover != null && hover < n) {
    rel[hover] = "active";
    if (hover > 0) rel[parentOf(hover)] = "purple";
    [2 * hover + 1, 2 * hover + 2].forEach((c) => c < n && (rel[c] = "warn"));
  }
  const r = Math.min(19, W / 2 ** levels / 2.3 + 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Heap as a complete binary tree" onMouseLeave={() => onHover?.(null)}>
      {arr.map((_, k) => {
        if (k === 0) return null;
        const a = P(parentOf(k)), b = P(k);
        const hot = (hl[k] && hl[parentOf(k)]) || (rel[k] && rel[parentOf(k)]);
        return <line key={`e${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? C.active : C.ink} strokeWidth={hot ? 2.6 : 1.4} opacity={hot ? 1 : 0.5} />;
      })}
      {arr.map((v, k) => {
        const { x, y } = P(k);
        const t = hl[k] ?? rel[k];
        const col = t ? TONE[t] : null;
        return (
          <g key={k} onMouseEnter={() => onHover?.(k)} style={{ cursor: onHover ? "pointer" : undefined }}>
            <circle cx={x} cy={y} r={r} fill={C.card} />
            <circle cx={x} cy={y} r={r} fill={col ?? C.card} fillOpacity={col ? 0.2 : 1} stroke={col ?? C.ink} strokeWidth={col ? 2.6 : 1.4} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={r > 16 ? 14 : 12} fontWeight={700} fill={C.fg}>
              {v}
            </text>
            <text x={x} y={y + r + 12} textAnchor="middle" fontSize={10} fill={C.muted}>
              [{k}]
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HeapArray({ arr, hl = {}, hover, onHover }) {
  const n = arr.length;
  const cls = {
    active: "border-viz-active bg-viz-active/15 text-viz-active",
    ok: "border-viz-ok bg-viz-ok/15 text-viz-ok",
    bad: "border-viz-bad bg-viz-bad/12 text-viz-bad",
    warn: "border-viz-warn bg-viz-warn/15 text-viz-warn",
    purple: "border-viz-purple bg-viz-purple/15 text-viz-purple",
  };
  const rel = {};
  if (hover != null && hover < n) {
    rel[hover] = "active";
    if (hover > 0) rel[parentOf(hover)] = "purple";
    [2 * hover + 1, 2 * hover + 2].forEach((c) => c < n && (rel[c] = "warn"));
  }
  return (
    <div className="overflow-x-auto pb-1" onMouseLeave={() => onHover?.(null)}>
      <div className="inline-flex gap-1">
        {arr.map((v, k) => {
          const l = 2 * k + 1, r = 2 * k + 2;
          const tip = `i=${k} · parent (i−1)/2 = ${k ? parentOf(k) : "—"} · left 2i+1 = ${l < n ? l : `${l} (none)`} · right 2i+2 = ${r < n ? r : `${r} (none)`}`;
          return (
            <Tip key={k} content={tip}>
              <div className="flex flex-col items-center gap-0.5" onMouseEnter={() => onHover?.(k)}>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-md border bg-card font-mono text-sm font-semibold transition-all duration-200", cls[hl[k] ?? rel[k]])}>{v}</div>
                <span className="font-mono text-[10px] text-muted-foreground">{k}</span>
              </div>
            </Tip>
          );
        })}
        {n === 0 && <span className="text-xs text-muted-foreground">empty heap</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* heap: push (sift-up), pop (sift-down), heapify                      */
/* ------------------------------------------------------------------ */

const HEAP_CODE = {
  push: `void push(vector<int>& heap, int val) {
    heap.push_back(val);               // 1. add at the end
    heapifyUp(heap, heap.size() - 1);  // 2. sift up
}
void heapifyUp(vector<int>& heap, int index) {
    while (index > 0) {
        int parent = (index - 1) / 2;
        if (heap[index] > heap[parent]) {
            swap(heap[index], heap[parent]);
            index = parent;
        } else {
            break;  // Heap property restored
        }
    }
}`,
  pop: `int extractMax(vector<int>& heap) {
    int maxVal = heap[0];
    heap[0] = heap.back();
    heap.pop_back();
    heapifyDown(heap, 0);
    return maxVal;
}
void heapifyDown(vector<int>& heap, int index) {
    int n = heap.size();
    while (true) {
        int largest = index;
        int left = 2 * index + 1, right = 2 * index + 2;
        if (left < n && heap[left] > heap[largest]) largest = left;
        if (right < n && heap[right] > heap[largest]) largest = right;
        if (largest == index) break;  // Heap property restored
        swap(heap[index], heap[largest]);
        index = largest;
    }
}`,
  heapify: `void buildMaxHeap(vector<int>& heap) {
    int n = heap.size();
    // Start from the last non-leaf node and go up
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapifyDown(heap, i);  // O(N) total, not O(N log N)
    }
}`,
};

/** Sift-down with snapshots (shared by pop + heapify). */
function siftDownSteps(a, start, snap, lines, ctx = "") {
  let i = start;
  const n = a.length;
  for (;;) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let big = i;
    if (l < n && a[l] > a[big]) big = l;
    if (r < n && a[r] > a[big]) big = r;
    const kids = [l, r].filter((c) => c < n);
    const hl = { [i]: "active" };
    kids.forEach((c) => (hl[c] = c === big ? "warn" : "purple"));
    if (big === i) {
      snap({ arr: [...a], hl: { ...hl, [i]: "ok" }, line: lines.stop, tone: "ok", note: kids.length ? `${ctx}${a[i]} ≥ its children (${kids.map((c) => a[c]).join(", ")}) → heap property holds, stop.` : `${ctx}${a[i]} at index ${i} is a leaf → stop.` });
      return;
    }
    snap({ arr: [...a], hl, line: lines.cmp, tone: "active", note: `${ctx}Children of ${a[i]} (index ${i}): ${kids.map((c) => `${a[c]} @${c}`).join(", ")}. Largest is ${a[big]} > ${a[i]}.` });
    [a[i], a[big]] = [a[big], a[i]];
    snap({ arr: [...a], hl: { [i]: "ok", [big]: "warn" }, line: lines.swap, tone: "warn", note: `${ctx}Swap → ${a[i]} moves up to index ${i}, ${a[big]} sinks to index ${big}.` });
    i = big;
  }
}

export function tracePush(arr, v) {
  const a = [...arr, v];
  const steps = [];
  const snap = (x) => steps.push({ op: "push", ...x });
  let i = a.length - 1;
  snap({ arr: [...a], hl: { [i]: "active" }, line: 2, tone: "active", note: `push(${v}): append at the end (index ${i}) so the tree stays complete.` });
  while (i > 0) {
    const p = parentOf(i);
    snap({ arr: [...a], hl: { [i]: "active", [p]: "purple" }, line: [7, 8], tone: "active", note: `Parent of index ${i} is (${i}−1)/2 = ${p} holding ${a[p]}. Is ${a[i]} > ${a[p]}?` });
    if (a[i] > a[p]) {
      [a[i], a[p]] = [a[p], a[i]];
      snap({ arr: [...a], hl: { [p]: "warn", [i]: "ok" }, line: [9, 10], tone: "warn", note: `Yes → swap. ${a[p]} bubbles up to index ${p}.` });
      i = p;
    } else {
      snap({ arr: [...a], hl: { [i]: "ok" }, line: 12, tone: "ok", done: true, note: `No → ${a[i]} ≤ ${a[p]}: heap property restored after ${steps.filter((s) => s.tone === "warn").length} swap(s). O(log N).` });
      return steps;
    }
  }
  snap({ arr: [...a], hl: { 0: "ok" }, line: 6, tone: "ok", done: true, note: `${a[0]} reached the root — it is the new maximum.` });
  return steps;
}

export function tracePop(arr) {
  const a = [...arr];
  const steps = [];
  const snap = (x) => steps.push({ op: "pop", ...x });
  if (!a.length) {
    snap({ arr: [], hl: {}, line: 1, tone: "bad", done: true, note: "The heap is empty — nothing to pop." });
    return steps;
  }
  const max = a[0];
  snap({ arr: [...a], hl: { 0: "ok", [a.length - 1]: "purple" }, line: 2, tone: "ok", extracted: max, note: `The max is always at index 0: maxVal = ${max}.` });
  a[0] = a[a.length - 1];
  a.pop();
  snap({ arr: [...a], hl: a.length ? { 0: "active" } : {}, line: [3, 4], tone: "active", extracted: max, note: a.length ? `Move the last element (${a[0]}) to the root and shrink the array — the tree stays complete but the root is probably too small.` : `That was the only element; the heap is now empty.` });
  if (a.length) siftDownSteps(a, 0, (x) => snap({ ...x, extracted: max }), { cmp: [11, 12, 13, 14], swap: [16, 17], stop: 15 });
  snap({ arr: [...a], hl: {}, line: 6, tone: "ok", done: true, extracted: max, note: `return ${max}. Next max is ${a[0] ?? "—"}. O(log N).` });
  return steps;
}

export function traceHeapify(arr) {
  const a = [...arr];
  const steps = [];
  const snap = (x) => steps.push({ op: "heapify", ...x });
  const n = a.length;
  snap({ arr: [...a], hl: {}, line: [2, 3], tone: "default", note: `Unsorted array of ${n}. Leaves (indices ${Math.floor(n / 2)}..${n - 1}) are already heaps of size 1 — start at the last non-leaf, n/2 − 1 = ${Math.floor(n / 2) - 1}.` });
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    snap({ arr: [...a], hl: { [i]: "active" }, line: 4, tone: "active", i, note: `i = ${i}: sift ${a[i]} down.` });
    siftDownSteps(a, i, (x) => snap({ ...x, i, line: 5 }), { cmp: 5, swap: 5, stop: 5 }, `[i=${i}] `);
  }
  snap({ arr: [...a], hl: { 0: "ok" }, line: 7, tone: "ok", done: true, note: `Max-heap built: [${a.join(", ")}]. Most nodes are near the bottom and sink only a little → O(N) total.` });
  return steps;
}

function isHeap(a) {
  for (let i = 1; i < a.length; i++) if (a[parentOf(i)] < a[i]) return false;
  return true;
}

function HeapOps() {
  const [steps, setSteps] = useState(() => [{ op: "push", arr: [9, 8, 7, 5, 6, 3, 4], hl: {}, line: [], tone: "default", note: "The chapter's max-heap [9, 8, 7, 5, 6, 3, 4]. Hover any node or cell to see its 2i+1 / 2i+2 / (i−1)/2 relatives." }]);
  const [draft, setDraft] = useState("10");
  const [hover, setHover] = useState(null);
  const autoplay = useRef(false);
  const st = useStepper(steps, { baseMs: 800 });
  const s = st.step;
  useEffect(() => {
    if (autoplay.current) {
      autoplay.current = false;
      st.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);
  const cur = steps.at(-1).arr;
  const go = (next) => {
    autoplay.current = true;
    setSteps(next);
  };
  const push = (v = Number(draft)) => Number.isInteger(v) && cur.length < 15 && go(tracePush(cur, v));
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input className={cn(inputCls, "w-20")} value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} onKeyDown={(e) => e.key === "Enter" && push()} aria-label="Value to push" />
        <Button size="sm" onClick={() => push()} disabled={cur.length >= 15}>
          Push (sift-up)
        </Button>
        <Button size="sm" variant="outline" onClick={() => go(tracePop(cur))} disabled={!cur.length}>
          Pop max (sift-down)
        </Button>
        <Button size="sm" variant="outline" onClick={() => go(traceHeapify([4, 1, 3, 2, 16, 9, 10, 14, 8, 7]))}>
          Heapify chapter array
        </Button>
        <Button size="sm" variant="outline" onClick={() => go(traceHeapify(Array.from({ length: 7 + Math.floor(Math.random() * 6) }, () => 1 + Math.floor(Math.random() * 40))))}>
          <Shuffle /> Heapify random
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <HeapTree arr={s.arr} hl={s.hl} hover={hover} onHover={setHover} />
          </Stage>
          <HeapArray arr={s.arr} hl={s.hl} hover={hover} onHover={setHover} />
          <Legend
            items={[
              [C.active, "Current / hovered index i"],
              [C.purple, "Parent (i−1)/2"],
              [C.warn, "Children 2i+1, 2i+2 · swap"],
              [C.ok, "Settled / max"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={HEAP_CODE[s.op]} active={s.line} />
          <StatGrid cols={3}>
            <Stat label="size" value={s.arr.length} />
            <Stat label="top (max)" value={s.arr[0] ?? "—"} tone="ok" />
            <Stat label="valid heap?" value={isHeap(s.arr) ? "yes" : "not yet"} tone={isHeap(s.arr) ? "ok" : "warn"} />
          </StatGrid>
          {s.extracted != null && (
            <Badge variant="success" className="font-mono">
              extracted {s.extracted}
            </Badge>
          )}
          <VarTable
            title="Index math"
            vars={
              hover != null && hover < s.arr.length
                ? [
                    ["i", hover, "active"],
                    ["parent (i−1)/2", hover ? parentOf(hover) : "— (root)", "purple"],
                    ["left 2i+1", 2 * hover + 1 < s.arr.length ? 2 * hover + 1 : "—", "warn"],
                    ["right 2i+2", 2 * hover + 2 < s.arr.length ? 2 * hover + 2 : "—", "warn"],
                  ]
                : [["hover a node", "…"]]
            }
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* priority_queue: max vs min (greater<int>) + top-k                   */
/* ------------------------------------------------------------------ */

/** Generic push/pop with comparator better(a,b) = a should be above b. Returns { arr, path }. */
function pqPush(arr, v, better) {
  const a = [...arr, v];
  let i = a.length - 1;
  const path = [i];
  while (i > 0 && better(a[i], a[parentOf(i)])) {
    const p = parentOf(i);
    [a[i], a[p]] = [a[p], a[i]];
    i = p;
    path.push(i);
  }
  return { arr: a, path };
}
function pqPop(arr, better) {
  const a = [...arr];
  const top = a[0];
  a[0] = a[a.length - 1];
  a.pop();
  let i = 0;
  const path = [0];
  for (;;) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let b = i;
    if (l < a.length && better(a[l], a[b])) b = l;
    if (r < a.length && better(a[r], a[b])) b = r;
    if (b === i) break;
    [a[i], a[b]] = [a[b], a[i]];
    i = b;
    path.push(i);
  }
  return { arr: a, path: a.length ? path : [], top };
}
const CMP = { max: (a, b) => a > b, min: (a, b) => a < b };

const PQ_DECL = {
  max: `#include <queue>
priority_queue<int> pq;                // max-heap (default)
pq.push(x);    // O(log N)
pq.top();      // O(1) — the LARGEST
pq.pop();      // O(log N)`,
  min: `#include <queue>
priority_queue<int, vector<int>, greater<int>> pq;  // min-heap
pq.push(x);    // O(log N)
pq.top();      // O(1) — the SMALLEST
pq.pop();      // O(log N)`,
};

function PQOps() {
  const [kind, setKind] = useState("max");
  const [arr, setArr] = useState([]);
  const [log, setLog] = useState([]);
  const [hl, setHl] = useState({});
  const [draft, setDraft] = useState("10");
  const [msg, setMsg] = useState({ text: "Push some values (or replay the chapter's 10, 50, 20, 40) and watch top() always show the best element.", tone: "default" });
  const better = CMP[kind];
  const push = (v) => {
    if (!Number.isInteger(v) || arr.length >= 15) return;
    const r = pqPush(arr, v, better);
    setArr(r.arr);
    setHl(Object.fromEntries(r.path.map((k, j) => [k, j === r.path.length - 1 ? "ok" : "warn"])));
    setLog((l) => [...l.slice(-20), `pq.push(${v});`]);
    setMsg({ text: r.path.length > 1 ? `push(${v}) bubbled up ${r.path.length - 1} level(s) to index ${r.path.at(-1)}.` : `push(${v}) stayed at the end (index ${r.path[0]}) — its parent is already ${kind === "max" ? "larger" : "smaller"}.`, tone: "ok" });
  };
  const pop = () => {
    if (!arr.length) return setMsg({ text: "pq.pop() on an empty priority_queue is undefined behaviour — check pq.empty().", tone: "bad" });
    const r = pqPop(arr, better);
    setArr(r.arr);
    setHl(Object.fromEntries(r.path.map((k) => [k, "warn"])));
    setLog((l) => [...l.slice(-20), `pq.pop();   // removes ${r.top}`]);
    setMsg({ text: `pop() removed ${r.top}; the last element moved to the root and sank ${r.path.length - 1} level(s).`, tone: "active" });
  };
  const switchKind = (k) => {
    if (!k) return;
    setKind(k);
    let a = [];
    for (const v of arr) a = pqPush(a, v, CMP[k]).arr;
    setArr(a);
    setHl({ 0: "ok" });
    setMsg({ text: k === "min" ? "greater<int> flips the comparison: now the SMALLEST value sits on top." : "Default std::less<int> → max-heap: the LARGEST value sits on top.", tone: "default" });
  };
  const chapter = () => {
    let a = [];
    for (const v of [10, 50, 20, 40]) a = pqPush(a, v, better).arr;
    setArr(a);
    setHl({ 0: "ok" });
    setLog(["pq.push(10);", "pq.push(50);", "pq.push(20);", "pq.push(40);"]);
    setMsg({ text: `After pushing 10, 50, 20, 40 the internal array is [${a.join(", ")}] and top() = ${a[0]}.`, tone: "ok" });
  };
  const order = useMemo(() => [...arr].sort((x, y) => (kind === "max" ? y - x : x - y)), [arr, kind]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={kind} onValueChange={switchKind}>
          <ToggleGroupItem value="max">Max-heap (default)</ToggleGroupItem>
          <ToggleGroupItem value="min">Min-heap · greater&lt;int&gt;</ToggleGroupItem>
        </ToggleGroup>
        <input className={cn(inputCls, "w-20")} value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} onKeyDown={(e) => e.key === "Enter" && push(Number(draft))} aria-label="Value to push" />
        <Button size="sm" onClick={() => push(Number(draft))}>
          push
        </Button>
        <Button size="sm" variant="outline" onClick={pop}>
          pop
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMsg({ text: arr.length ? `top() = ${arr[0]} — read in O(1) without removing it.` : "top() on an empty queue is undefined behaviour.", tone: arr.length ? "ok" : "bad" })}>
          top
        </Button>
        <Button size="sm" variant="ghost" onClick={chapter}>
          Chapter: 10, 50, 20, 40
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            {arr.length ? <HeapTree arr={arr} hl={hl} W={440} /> : <div className="py-10 text-center text-sm text-muted-foreground">empty priority_queue</div>}
          </Stage>
          <HeapArray arr={arr} hl={hl} />
          <Narration tone={msg.tone}>{msg.text}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={PQ_DECL[kind]} active={2} />
          <StatGrid cols={2}>
            <Stat label="top()" value={arr[0] ?? "—"} tone="ok" />
            <Stat label="size()" value={arr.length} />
          </StatGrid>
          <Panel title="Pop order (not the array order!)">
            <ArrayView values={order.length ? order : ["—"]} showIndex={false} cellWidth={38} />
          </Panel>
          <Panel title="Calls">
            <pre className="code-body max-h-32 overflow-hidden text-[12px]">{log.length ? log.slice(-6).join("\n") : "// none yet"}</pre>
          </Panel>
        </div>
      </Split>
    </>
  );
}

const TOPK_CODE = `vector<int> topK(vector<int>& nums, int k) {
    // Min-heap of size K
    priority_queue<int, vector<int>, greater<int>> minHeap;

    for (int num : nums) {
        minHeap.push(num);
        if (minHeap.size() > k) {
            minHeap.pop();  // Remove smallest of the K
        }
    }
    // minHeap.top() is now the Kth largest
    ...
}`;

/** Pure: top-k with a size-k min-heap. */
export function traceTopK(nums, k) {
  const steps = [];
  let heap = [];
  const evicted = [];
  const snap = (x) => steps.push({ heap: [...heap], evicted: [...evicted], ...x });
  snap({ i: -1, hl: {}, line: 3, tone: "default", note: `Keep a min-heap of at most k = ${k}. Its top is the smallest of the best ${k} seen so far.` });
  nums.forEach((num, i) => {
    const r = pqPush(heap, num, CMP.min);
    heap = r.arr;
    snap({ i, hl: { [r.path.at(-1)]: "active" }, line: 6, tone: "active", note: `push(${num}) → heap [${heap.join(", ")}], size ${heap.length}.` });
    if (heap.length > k) {
      const p = pqPop(heap, CMP.min);
      heap = p.arr;
      evicted.push(p.top);
      snap({ i, hl: {}, line: [7, 8], tone: "bad", popped: p.top, note: `size ${heap.length + 1} > ${k} → pop the smallest (${p.top}). It cannot be among the ${k} largest.` });
    }
  });
  snap({ i: nums.length, hl: { 0: "ok" }, line: 11, tone: "ok", done: true, note: `The ${k} largest are [${[...heap].sort((a, b) => a - b).join(", ")}]; top() = ${heap[0]} is the ${k}${k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th"} largest. O(N log k).` });
  return steps;
}

function TopK() {
  const [nums, setNums] = useState([3, 1, 5, 12, 2, 11]);
  const [k, setK] = useState(3);
  const kk = Math.min(k, nums.length);
  const steps = useMemo(() => traceTopK(nums, kk), [nums, kk]);
  const st = useStepper(steps, { baseMs: 850 });
  const s = st.step;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setNums([3, 1, 5, 12, 2, 11])}>
          Chapter: {"{3, 1, 5, 12, 2, 11}"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNums(Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 30)))}>
          <Shuffle /> Random
        </Button>
        <div className="w-40">
          <SliderControl label="k" value={kk} min={1} max={Math.min(5, nums.length)} onChange={setK} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <ArrayView values={nums} label="nums" states={Object.fromEntries(nums.map((_, j) => [j, j === s.i ? "active" : j < s.i ? "dim" : undefined]))} pointers={s.i >= 0 && s.i < nums.length ? [{ index: s.i, label: "num", tone: "active" }] : []} />
          <Stage className="p-2">
            {s.heap.length ? <HeapTree arr={s.heap} hl={s.hl} W={400} /> : <div className="py-8 text-center text-sm text-muted-foreground">empty min-heap</div>}
          </Stage>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            evicted:
            {s.evicted.length === 0 && <span>—</span>}
            {s.evicted.map((v, j) => (
              <Badge key={j} variant="danger" className="font-mono">
                {v}
              </Badge>
            ))}
          </div>
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={TOPK_CODE} active={s.line} />
          <StatGrid cols={3}>
            <Stat label="heap size" value={`${s.heap.length}/${kk}`} />
            <Stat label="top()" value={s.heap[0] ?? "—"} tone="ok" />
            <Stat label="evicted" value={s.evicted.length} tone="bad" />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function PriorityQueue() {
  const [tab, setTab] = useState("ops");
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ops">push / pop / top</TabsTrigger>
          <TabsTrigger value="topk">Top-K with a min-heap</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "ops" ? <PQOps /> : <TopK />}
    </>
  );
}

const META = {
  heap: { title: "Binary Heap — Array ↔ Tree, Sift-Up & Sift-Down", description: "A complete tree stored in a flat array: children at 2i+1 / 2i+2, parent at (i−1)/2. Push sifts up, pop sifts down.", badges: ["O(log N) push/pop", "O(N) heapify"] },
  "priority-queue": { title: "std::priority_queue — Max-Heap vs Min-Heap", description: "The default is a max-heap; greater<int> turns it into a min-heap. A size-k min-heap finds the k largest values.", badges: ["O(1) top", "O(log N) push/pop", "Top-K"] },
};

export default function HeapLab({ variant = "heap" }) {
  const m = META[variant] ?? META.heap;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "priority-queue" ? <PriorityQueue /> : <HeapOps />}
    </LabShell>
  );
}
