import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, Split, Stage, Stat, StatGrid, SwitchControl, VarTable } from "@/viz/kit";

const MAX_SIZE = 16;
const BASE_ADDR = 0x55000010;
const fmtAddr = (a) => (a == null ? "nullptr" : "0x" + a.toString(16).toUpperCase().replace(/(....)$/, "_$1"));

const VEC_CODE = (growth) => `// what v.push_back(val) does internally
void push_back(int val) {
    if (size == capacity) {
        int newCap = ${growth === "1.5x" ? "capacity + capacity / 2;  // MSVC: 1.5x" : "capacity == 0 ? 1 : capacity * 2;  // GCC: 2x"}
        int* newBlock = new int[newCap];
        for (int i = 0; i < size; i++)
            newBlock[i] = data[i];      // O(N) copy
        delete[] data;                  // free old block
        data = newBlock;
        capacity = newCap;
    }
    data[size] = val;                   // O(1) write
    size++;
}`;

const SV_CODE = `class SimpleVector {
    int* data_;
    int size_, capacity_;
public:
    SimpleVector(int initialCap = 2) {
        size_ = 0;
        capacity_ = initialCap;
        data_ = new int[capacity_];
    }
    ~SimpleVector() {
        delete[] data_;          // RAII: runs at '}'
    }
    void push_back(int val) {
        if (size_ == capacity_) {
            int newCap = capacity_ * 2;
            int* newBlock = new int[newCap];
            for (int i = 0; i < size_; i++)
                newBlock[i] = data_[i];
            delete[] data_;      // free old block
            data_ = newBlock;
            capacity_ = newCap;
        }
        data_[size_] = val;
        size_++;
    }
};`;

const PHASE_KEY = {
  ctor: "new int[capacity_]",
  check: "if (size",
  alloc: "* newBlock = new",
  copy: "newBlock[i] =",
  free: "// free old",
  repoint: "= newBlock;",
  write: "] = val;",
  dtor: "RAII",
};
const lineOf = (code, key) => (key ? code.split("\n").findIndex((l) => l.includes(key)) + 1 : undefined);

const nextCap = (cap, growth) => (growth === "1.5x" ? Math.max(cap + 1, Math.floor(cap * 1.5)) : cap === 0 ? 1 : cap * 2);

/**
 * Replay a list of user actions into animation frames.
 * Each frame is a full snapshot: { buf, size, cap, addr, old, phase, hi, note, tone, stats, costs, log, alive }.
 */
function simulate(actions, { growth = "2x", initCap = 0, simple = false } = {}) {
  const frames = [];
  let buf = Array(initCap).fill(null), size = 0, cap = initCap, addr = initCap ? BASE_ADDR : null, nextAddr = BASE_ADDR + (initCap ? 0x80 : 0);
  let old = null, alive = true;
  const stats = { ops: 0, pushes: 0, writes: 0, copies: 0, reallocs: 0, cost: 0, pushCost: 0 };
  const costs = [];
  const log = [];
  const snap = (phase, note, tone = "default", hi = {}) =>
    frames.push({ buf: [...buf], size, cap, addr, old: old && { ...old, buf: [...old.buf] }, phase, note, tone, hi, stats: { ...stats }, costs: [...costs], log: [...log], alive });

  if (simple) {
    log.push(`[Constructor] Allocated Heap buffer of capacity ${cap}`);
    snap("ctor", `SimpleVector v(${cap}): the constructor allocates int[${cap}] on the heap and stores its address in data_.`, "active");
  } else snap(null, "vector<int> v; — an empty vector owns no heap memory yet: data = nullptr, size = 0, capacity = 0.", "default");

  const grow = (newCap, why) => {
    const label = simple ? "data_" : "data";
    old = { buf: [...buf], cap, addr, freed: false };
    buf = Array(newCap).fill(null);
    addr = nextAddr;
    nextAddr += 0x80;
    stats.reallocs++;
    snap("alloc", `${why} Step 1 — allocate a new block of ${newCap} ints at ${fmtAddr(addr)}.`, "warn");
    for (let i = 0; i < size; i++) {
      buf[i] = old.buf[i];
      stats.copies++;
      snap("copy", `Step 2 — copy element ${i} (${buf[i]}) into the new block. (${i + 1} of ${size})`, "active", { copy: i });
    }
    if (old.addr != null) {
      old.freed = true;
      snap("free", `Step 3 — delete[] the old ${old.cap}-slot block at ${fmtAddr(old.addr)}.`, "bad");
    }
    old = null;
    cap = newCap;
    if (simple) log.push(`[Resize]      Doubled capacity to ${cap}`);
    snap("repoint", `Step 4 — repoint ${label} to the new block; capacity is now ${cap}.`, "active");
  };

  for (const a of actions) {
    if (!alive) break;
    const before = stats.copies, rBefore = stats.reallocs;
    let cost = 0;
    stats.ops++;
    if (a.op === "push") {
      stats.pushes++;
      if (size === cap) grow(nextCap(cap, growth), `size (${size}) == capacity (${cap}) — no room for ${a.val}!`);
      buf[size] = a.val;
      size++;
      stats.writes++;
      cost = stats.copies - before + 1;
      snap("write", `Write ${a.val} into slot ${size - 1}. size = ${size}, capacity = ${cap}.` + (cost > 1 ? ` This push cost ${cost} operations (${cost - 1} copies + 1 write).` : " O(1)."), cost > 1 ? "warn" : "ok", { write: size - 1 });
      stats.pushCost += cost;
    } else if (a.op === "pop") {
      if (!size) {
        snap(null, "pop_back() on an empty vector is undefined behaviour — always check !v.empty() first.", "bad");
        stats.ops--;
        continue;
      }
      size--;
      buf[size] = null;
      cost = 1;
      snap(null, `pop_back() removes the last element. size = ${size}, but capacity stays ${cap} — vectors never shrink on their own.`, "default");
    } else if (a.op === "insert0") {
      if (size === cap) grow(nextCap(cap, growth), "insert needs one more slot.");
      for (let i = size; i > 0; i--) buf[i] = buf[i - 1];
      cost = stats.copies - before + size + 1;
      buf[0] = a.val;
      size++;
      stats.writes++;
      snap("write", `insert(v.begin(), ${a.val}) shifted all ${size - 1} elements one slot right — O(N) — then wrote ${a.val} at index 0.`, "warn", { write: 0, shift: true });
    } else if (a.op === "erase0") {
      if (!size) {
        snap(null, "erase(v.begin()) on an empty vector is undefined behaviour.", "bad");
        stats.ops--;
        continue;
      }
      for (let i = 0; i < size - 1; i++) buf[i] = buf[i + 1];
      size--;
      buf[size] = null;
      cost = size + 1;
      snap(null, `erase(v.begin()) shifted the remaining ${size} elements one slot left — O(N).`, "warn", { shift: true });
    } else if (a.op === "reserve") {
      const grew = a.n > cap;
      if (grew) grow(a.n, `reserve(${a.n}) pre-allocates.`);
      cost = stats.copies - before;
      snap(null, grew ? `capacity is now ${cap}: the next ${cap - size} push_backs need no reallocation.` : `reserve(${a.n}) does nothing: capacity is already ${cap}.`, "ok");
    } else if (a.op === "shrink") {
      if (cap > size) grow(size, "shrink_to_fit() reallocates to exactly size.");
      cost = stats.copies - before;
      snap(null, `capacity = size = ${size}. The spare slots are returned to the heap.`, "ok");
    } else if (a.op === "clear") {
      buf = buf.map(() => null);
      cost = size;
      size = 0;
      snap(null, `clear() destroys the elements: size = 0, but capacity is still ${cap}.`, "default");
    } else if (a.op === "exit") {
      alive = false;
      log.push(`[Destructor]  Freed Heap buffer of capacity ${cap}!`);
      old = { buf: [...buf], cap, addr, freed: true };
      buf = [];
      snap("dtor", "Closing brace '}' reached: ~SimpleVector() runs automatically and delete[]s the heap buffer. 0 bytes leaked.", "ok");
      old = null;
      continue;
    }
    stats.cost += cost;
    costs.push({ label: a.op, cost, realloc: stats.reallocs > rBefore });
  }
  // stamp final frame with up-to-date costs
  if (frames.length) Object.assign(frames.at(-1), { costs: [...costs], stats: { ...stats } });
  return frames;
}

/** Auto-advances through newly appended frames; scrubbing pauses it. */
function useFrameCursor(frames, animate, ms) {
  const [cur, setCur] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  const prevLen = useRef(frames.length);
  useEffect(() => {
    if (frames.length > prevLen.current && animate) {
      setCur(prevLen.current);
      setPlaying(true);
    } else {
      setCur(frames.length - 1);
      setPlaying(false);
    }
    prevLen.current = frames.length;
  }, [frames, animate]);
  useEffect(() => {
    if (!playing) return;
    if (cur >= frames.length - 1) return setPlaying(false);
    const t = setTimeout(() => setCur((c) => Math.min(c + 1, frames.length - 1)), ms);
    return () => clearTimeout(t);
  }, [playing, cur, frames.length, ms]);
  const idx = Math.min(cur, frames.length - 1);
  return { idx, playing, setCur: (v) => { setPlaying(false); setCur(v); } };
}

function Buffer({ x, y, w, cells, size, label, tone, freed, hi = {}, isOld }) {
  const n = Math.max(cells.length, 1);
  const cw = Math.min(40, w / n);
  return (
    <g opacity={freed ? 0.45 : 1} className="transition-opacity duration-300">
      <text x={x} y={y - 6} fontSize={10.5} fill={tone ?? C.muted}>{label}</text>
      {cells.length === 0 && <text x={x + 4} y={y + 22} fontSize={11} fill={C.muted}>(no buffer)</text>}
      {cells.map((v, k) => {
        const used = k < size;
        const isWrite = !isOld && hi.write === k;
        const isCopy = hi.copy === k;
        const stroke = freed ? C.bad : isWrite ? C.ok : isCopy ? C.active : used ? C.active : C.border;
        return (
          <g key={k}>
            <rect
              x={x + k * cw + 1}
              y={y}
              width={cw - 2}
              height={32}
              rx={4}
              fill={isWrite ? C.ok : isCopy ? C.active : used ? C.active : C.fill}
              fillOpacity={isWrite || isCopy ? 0.28 : used ? 0.1 : 0.5}
              stroke={stroke}
              strokeDasharray={!used || freed ? "3 3" : undefined}
              strokeWidth={isWrite || isCopy ? 2 : 1}
            />
            <text x={x + k * cw + cw / 2} y={y + 20} textAnchor="middle" fontSize={cw < 24 ? 10 : 12} fontWeight={600} fill={v == null ? C.muted : C.fg}>
              {v == null ? "?" : v}
            </text>
            <text x={x + k * cw + cw / 2} y={y + 44} textAnchor="middle" fontSize={10} fill={C.muted}>{k}</text>
          </g>
        );
      })}
    </g>
  );
}

function VectorCanvas({ f, simple }) {
  const W = 640, hx = 214, hw = W - hx - 12;
  const name = simple ? "SimpleVector v" : "vector<int> v";
  const fields = simple ? ["data_", "size_", "capacity_"] : ["data", "size", "capacity"];
  const costs = f.costs;
  const maxCost = Math.max(4, ...costs.map((c) => c.cost));
  const bw = Math.min(16, hw / Math.max(costs.length, 1));
  let run = 0;
  const avg = costs.map((c, k) => ((run += c.cost), run / (k + 1)));
  const cy0 = 186, ch = 70;
  return (
    <svg viewBox={`0 0 ${W} 270`} className="w-full font-mono">
      <defs>
        <marker id="vec-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
        </marker>
      </defs>
      <text x={12} y={16} fontSize={10.5} fill={C.muted}>STACK (24 bytes)</text>
      <rect x={12} y={24} width={180} height={96} rx={7} fill={f.alive ? C.fill : C.card} stroke={f.alive ? C.border : C.muted} strokeDasharray={f.alive ? undefined : "4 3"} opacity={f.alive ? 1 : 0.55} />
      <text x={22} y={42} fontSize={11.5} fontWeight={600} fill={C.fg}>{name}{f.alive ? "" : " (popped)"}</text>
      {[fmtAddr(f.alive ? f.addr : null), f.alive ? f.size : "—", f.alive ? f.cap : "—"].map((v, k) => (
        <text key={k} x={22} y={64 + k * 19} fontSize={11} fill={k === 0 ? C.purple : C.fg}>
          {fields[k]} = {v}
        </text>
      ))}
      {f.alive && f.addr != null && <path d={`M 192 60 C 205 60, 200 56, ${hx - 2} 56`} fill="none" stroke={C.purple} strokeWidth={2} markerEnd="url(#vec-arrow)" />}
      <text x={hx} y={16} fontSize={10.5} fill={C.muted}>HEAP</text>
      <Buffer x={hx} y={40} w={hw} cells={f.buf} size={f.size} hi={f.hi} label={f.addr != null && f.alive ? `${fmtAddr(f.addr)} · capacity ${f.cap}` : ""} tone={C.purple} />
      {f.old && (
        <Buffer x={hx} y={112} w={hw} cells={f.old.buf} size={f.old.buf.filter((v) => v != null).length} hi={f.hi} isOld freed={f.old.freed} label={`${fmtAddr(f.old.addr)} · old block${f.old.freed ? " — delete[]'d" : ""}`} tone={f.old.freed ? C.bad : C.warn} />
      )}
      {/* per-operation cost chart */}
      <text x={12} y={cy0 - 6} fontSize={10.5} fill={C.muted}>cost per operation</text>
      <text x={12} y={cy0 + 10} fontSize={10} fill={C.warn}>■ realloc</text>
      <text x={12} y={cy0 + 24} fontSize={10} fill={C.active}>■ cheap</text>
      <text x={12} y={cy0 + 38} fontSize={10} fill={C.ok}>— running avg</text>
      <line x1={hx} x2={W - 12} y1={cy0 + ch} y2={cy0 + ch} stroke={C.grid} />
      {costs.map((c, k) => {
        const h = (c.cost / maxCost) * ch;
        return <rect key={k} x={hx + k * bw + 1} y={cy0 + ch - h} width={Math.max(bw - 2, 1)} height={h} rx={2} fill={c.realloc ? C.warn : C.active} opacity={0.8} />;
      })}
      {avg.length > 1 && (
        <polyline fill="none" stroke={C.ok} strokeWidth={2} points={avg.map((a, k) => `${hx + k * bw + bw / 2},${cy0 + ch - (a / maxCost) * ch}`).join(" ")} />
      )}
      {costs.length === 0 && <text x={hx + 4} y={cy0 + ch - 8} fontSize={10.5} fill={C.muted}>(no operations yet)</text>}
    </svg>
  );
}

function FrameScrubber({ fc, total }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/50 p-2">
      <Tip content="Previous micro-step">
        <Button variant="outline" size="icon-sm" onClick={() => fc.setCur(Math.max(0, fc.idx - 1))} disabled={fc.idx === 0} aria-label="Previous">
          <ChevronLeft />
        </Button>
      </Tip>
      <Tip content="Next micro-step">
        <Button variant="outline" size="icon-sm" onClick={() => fc.setCur(Math.min(total - 1, fc.idx + 1))} disabled={fc.idx >= total - 1} aria-label="Next">
          <ChevronRight />
        </Button>
      </Tip>
      <Slider className="flex-1" value={[fc.idx]} min={0} max={Math.max(total - 1, 0)} step={1} onValueChange={([v]) => fc.setCur(v)} aria-label="History" />
      <span className="w-20 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {fc.idx + 1}/{total}
      </span>
    </div>
  );
}

function VectorVariant() {
  const [actions, setActions] = useState([]);
  const [growth, setGrowth] = useState("2x");
  const [animate, setAnimate] = useState(true);
  const [speed, setSpeed] = useState(350);
  const frames = useMemo(() => simulate(actions, { growth }), [actions, growth]);
  const fc = useFrameCursor(frames, animate, speed);
  const f = frames[fc.idx];
  const last = frames.at(-1);
  const counter = useRef(0);
  const add = (...a) => setActions((x) => [...x, ...a]);
  const val = () => ++counter.current;
  const full = last.size >= MAX_SIZE;
  const code = VEC_CODE(growth);
  const s = last.stats;

  return (
    <LabShell
      title="vector<T> Under the Hood — size vs capacity"
      description="push_back is O(1) until the buffer is full; then the vector allocates a bigger block, copies everything, and frees the old one. Watch the spikes average out."
      badges={["amortized O(1) push_back", "O(N) insert/erase at front"]}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => add({ op: "push", val: val() })} disabled={full}>push_back({counter.current + 1})</Button>
        <Button size="sm" variant="outline" onClick={() => add(...Array.from({ length: Math.min(8, MAX_SIZE - last.size) }, () => ({ op: "push", val: val() })))} disabled={full}>push ×8</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "pop" })}>pop_back()</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "insert0", val: val() })} disabled={full} className="font-mono">insert(begin)</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "erase0" })} className="font-mono">erase(begin)</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "reserve", n: MAX_SIZE })}>reserve({MAX_SIZE})</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "shrink" })}>shrink_to_fit()</Button>
        <Button size="sm" variant="outline" onClick={() => add({ op: "clear" })}>clear()</Button>
        <Button size="sm" variant="ghost" onClick={() => { counter.current = 0; setActions([]); }}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <VectorCanvas f={f} />
          </Stage>
          <Legend items={[[C.active, "Used slot (size)"], [C.ok, "Just written"], [C.warn, "Old block during reallocation"], [C.bad, "Freed"]]} />
          <Narration tone={f.tone}>{f.note}</Narration>
          <FrameScrubber fc={fc} total={frames.length} />
        </div>
        <div className="space-y-3">
          <CodePanel code={code} active={lineOf(code, PHASE_KEY[f.phase])} title="push_back internals" maxHeight={250} />
          <StatGrid cols={2}>
            <Stat label="size / capacity" value={`${f.size} / ${f.cap}`} tone="active" />
            <Stat label="reallocations" value={f.stats.reallocs} tone="warn" />
            <Stat label="element copies" value={f.stats.copies} tone="warn" hint="Each reallocation copies every existing element." />
            <Stat label="avg cost / push" value={s.pushes ? (s.pushCost / s.pushes).toFixed(2) : "—"} tone="ok" hint="(copies + writes) / pushes — stays below 3 with doubling: amortized O(1)." />
          </StatGrid>
          <Panel title="Settings">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] text-muted-foreground">Growth factor</span>
              <Select value={growth} onValueChange={setGrowth}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2x">2× (GCC / Clang)</SelectItem>
                  <SelectItem value="1.5x">1.5× (MSVC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SwitchControl label="Animate reallocation steps" checked={animate} onChange={setAnimate} id="vec-anim" />
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">Speed</span>
              <Slider value={[900 - speed]} min={0} max={850} step={50} onValueChange={([v]) => setSpeed(900 - v)} aria-label="Animation speed" />
            </div>
          </Panel>
        </div>
      </Split>
    </LabShell>
  );
}

function SimpleVectorVariant() {
  const [initCap, setInitCap] = useState("2");
  const [actions, setActions] = useState([]);
  const [animate, setAnimate] = useState(true);
  const frames = useMemo(() => simulate(actions, { initCap: Number(initCap), simple: true }), [actions, initCap]);
  const fc = useFrameCursor(frames, animate, 450);
  const f = frames[fc.idx];
  const last = frames.at(-1);
  const seq = useRef(0);
  const nextVal = () => {
    seq.current++;
    return seq.current <= 3 ? seq.current * 10 : 10 + Math.floor(Math.random() * 90);
  };
  const reset = () => {
    seq.current = 0;
    setActions([]);
  };
  const leaked = !last.alive ? 0 : null;

  return (
    <LabShell
      title="Build SimpleVector From Scratch"
      description="A 24-byte stack object (data_, size_, capacity_) that owns a growing heap array — constructor allocates, push_back doubles, destructor frees at '}'."
      badges={["RAII", "new[] / delete[]", "2× growth"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted-foreground">SimpleVector v(</span>
        <ToggleGroup type="single" value={initCap} onValueChange={(v) => { if (v) { setInitCap(v); reset(); } }}>
          {["1", "2", "4"].map((c) => (
            <ToggleGroupItem key={c} value={c} className="font-mono">{c}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="text-[12.5px] text-muted-foreground">);</span>
        <Button size="sm" onClick={() => {
            const v = nextVal();
            setActions((a) => [...a, { op: "push", val: v }]);
          }} disabled={!last.alive || last.size >= MAX_SIZE}>
          v.push_back({seq.current < 3 ? (seq.current + 1) * 10 : "rand"})
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActions((a) => [...a, { op: "exit" }])} disabled={!last.alive} className="font-mono">
          Trigger scope exit {"}"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw /> Reset scope
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <VectorCanvas f={f} simple />
          </Stage>
          <div className="flex flex-wrap gap-1.5">
            {["alloc", "copy", "free", "repoint"].map((p, k) => (
              <Badge key={p} variant={f.phase === p ? (p === "free" ? "danger" : "active") : "outline"}>
                {k + 1}. {p === "alloc" ? "new int[2×cap]" : p === "copy" ? "copy [0..size-1]" : p === "free" ? "delete[] old" : "repoint data_"}
              </Badge>
            ))}
            {leaked === 0 && f.phase === "dtor" && <Badge variant="success">0 bytes leaked (RAII)</Badge>}
          </div>
          <Narration tone={f.tone}>{f.note}</Narration>
          <FrameScrubber fc={fc} total={frames.length} />
        </div>
        <div className="space-y-3">
          <CodePanel code={SV_CODE} active={lineOf(SV_CODE, PHASE_KEY[f.phase])} maxHeight={260} />
          <SwitchControl label="Animate reallocation steps" checked={animate} onChange={setAnimate} id="sv-anim" />
          <Panel title="Console output">
            <div className="space-y-0.5 font-mono text-[11.5px]">
              {f.log.map((l, k) => (
                <div key={k} className={cn(l.includes("Destructor") ? "text-viz-ok" : l.includes("Resize") ? "text-viz-warn" : "text-viz-active")}>{l}</div>
              ))}
            </div>
          </Panel>
          <VarTable
            title="SimpleVector v"
            vars={[
              ["data_", f.alive ? fmtAddr(f.addr) : "(popped)", "purple"],
              ["size_", f.alive ? f.size : "—", "active"],
              ["capacity_", f.alive ? f.cap : "—"],
              ["heap bytes owned", f.alive ? f.cap * 4 : 0],
              ["element copies so far", f.stats.copies, "warn"],
            ]}
          />
        </div>
      </Split>
    </LabShell>
  );
}

export default function VectorLab({ variant = "vector" }) {
  return variant === "simple-vector" ? <SimpleVectorVariant /> : <VectorVariant />;
}
