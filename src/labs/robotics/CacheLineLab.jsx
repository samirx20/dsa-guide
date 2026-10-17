import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowDownWideNarrow, Shuffle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, rng, useStepper } from "@/viz/kit";

const NS = { hit: 1, miss: 80 }; // chapter's L1 vs DRAM latencies

/* ================================================================== */
/* 1. Pointer chasing vs contiguous array                              */
/* ================================================================== */
const LINES = 12; // cache lines drawn per memory map
const NODE = 16; // Waypoint {x, y, v, pad} = 16 bytes

/** Pure: lay out N waypoints scattered (new per node) or contiguous, then simulate cache accesses. */
function memTrace(n, seed, scattered) {
  const r = rng(seed);
  const nodes = [];
  if (scattered) {
    const used = new Set();
    for (let k = 0; k < n; k++) {
      let slot;
      do slot = Math.floor(r() * LINES * 4);
      while (used.has(slot));
      used.add(slot);
      nodes.push(slot * NODE); // byte offset in the drawn region
    }
  } else for (let k = 0; k < n; k++) nodes.push(k * NODE);
  const steps = [{ i: -1, loaded: [], ns: 0, hits: 0, misses: 0, note: "" }];
  const loaded = new Set();
  let ns = 0,
    hits = 0,
    misses = 0;
  nodes.forEach((addr, i) => {
    const line = Math.floor(addr / 64);
    const hit = loaded.has(line);
    loaded.add(line);
    ns += hit ? NS.hit : NS.miss;
    hit ? hits++ : misses++;
    steps.push({ i, addr, line, hit, loaded: [...loaded], ns, hits, misses });
  });
  return { nodes, steps };
}

function MemMap({ trace, i, title, tone }) {
  const W = 620,
    rowH = 15,
    x0 = 92,
    cw = (W - x0 - 8) / 16;
  const st = trace.steps[Math.min(i + 1, trace.steps.length - 1)];
  const loaded = new Set(st.loaded);
  return (
    <svg viewBox={`0 0 ${W} ${LINES * rowH + 26}`} className="w-full font-mono">
      <text x={4} y={12} fontSize={11} fontWeight={600} fill={tone}>
        {title}
      </text>
      {Array.from({ length: LINES }, (_, L) => {
        const y = 20 + L * rowH;
        const isCur = st.line === L && st.i >= 0;
        return (
          <g key={L}>
            <text x={4} y={y + 11} fontSize={10} fill={loaded.has(L) ? C.active : C.muted}>
              0x{(0x1000 + L * 64).toString(16)}
            </text>
            <rect x={x0 - 3} y={y} width={W - x0 - 2} height={rowH - 2} rx={3} fill={loaded.has(L) ? C.active : "none"} opacity={0.1} />
            {isCur && <rect x={x0 - 3} y={y} width={W - x0 - 2} height={rowH - 2} rx={3} fill="none" stroke={st.hit ? C.ok : C.bad} strokeWidth={1.6} />}
          </g>
        );
      })}
      {Array.from({ length: LINES * 16 }, (_, c) => {
        const L = Math.floor(c / 16),
          k = c % 16;
        return <rect key={c} x={x0 + k * cw} y={20 + L * rowH + 1.5} width={cw - 1.5} height={rowH - 5} rx={1.5} fill={C.fill} />;
      })}
      {trace.nodes.map((addr, n) => {
        const L = Math.floor(addr / 64),
          k = (addr % 64) / 4;
        const visited = n <= i;
        const cur = n === i;
        return (
          <g key={n}>
            <rect x={x0 + k * cw} y={20 + L * rowH + 1.5} width={cw * 4 - 1.5} height={rowH - 5} rx={2} fill={cur ? (trace.steps[n + 1].hit ? C.ok : C.bad) : visited ? C.purple : C.ink} opacity={cur ? 1 : visited ? 0.75 : 0.45} />
            <text x={x0 + k * cw + cw * 2} y={20 + L * rowH + 10} textAnchor="middle" fontSize={8.5} fill={C.card} fontWeight={700}>
              w{n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChaseTab() {
  const [n, setN] = useState(8);
  const [seed, setSeed] = useState(7);
  const scat = useMemo(() => memTrace(n, seed, true), [n, seed]);
  const cont = useMemo(() => memTrace(n, seed, false), [n, seed]);
  const steps = useMemo(() => Array.from({ length: n + 1 }, (_, k) => ({ i: k - 1 })), [n]);
  const st = useStepper(steps, { baseMs: 700 });
  const i = st.step.i;
  const a = scat.steps[i + 1],
    b = cont.steps[i + 1];
  return (
    <div className="space-y-3">
      <Split>
        <div className="space-y-2">
          <Stage className="p-2">
            <MemMap trace={scat} i={i} title="Heap: new Waypoint() per node (Python list / Java ArrayList)" tone={C.bad} />
          </Stage>
          <Stage className="p-2">
            <MemMap trace={cont} i={i} title="Contiguous: std::array<Waypoint, N>" tone={C.ok} />
          </Stage>
          <Legend
            items={[
              [C.bad, "cache miss (~80 ns DRAM fetch)"],
              [C.ok, "L1 hit (~1 ns)"],
              [C.active, "cache line resident in L1"],
              [C.purple, "already visited"],
            ]}
          />
        </div>
        <div className="space-y-3">
          <Panel title="Workload">
            <SliderControl label="waypoints N (16 B each)" value={n} onChange={setN} min={4} max={16} />
            <Button size="sm" variant="outline" onClick={() => setSeed((x) => x + 1)}>
              <Shuffle /> Re-scatter heap
            </Button>
          </Panel>
          <Panel title="Simulated access-time counter">
            <StatGrid cols={2}>
              <Stat label="heap stalls" value={`${a.ns} ns`} tone="bad" hint={`${a.misses} misses × 80 ns + ${a.hits} hits × 1 ns`} />
              <Stat label="array stalls" value={`${b.ns} ns`} tone="ok" hint={`${b.misses} misses × 80 ns + ${b.hits} hits × 1 ns`} />
              <Stat label="heap misses" value={a.misses} />
              <Stat label="array misses" value={b.misses} />
            </StatGrid>
            {i === n - 1 && <Badge variant="success">contiguous is {(a.ns / Math.max(b.ns, 1)).toFixed(1)}× faster</Badge>}
          </Panel>
          <Narration tone={i < 0 ? "default" : b.hit ? "ok" : "active"}>
            {i < 0
              ? "Iterate the waypoints in order. The CPU never fetches a lone float: every miss pulls a whole 64-byte line into L1."
              : `w${i}: heap node at 0x${(0x1000 + a.addr).toString(16)} → ${a.hit ? "HIT (line already loaded)" : "MISS (pointer chase to a cold line)"}; array element at 0x${(0x1000 + b.addr).toString(16)} → ${b.hit ? "HIT — the previous miss prefetched 4 waypoints at once" : "MISS — first touch of this line"}.`}
          </Narration>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

/* ================================================================== */
/* 2. Struct padding & alignas(32)                                     */
/* ================================================================== */
const TYPES = { bool: 1, uint8_t: 1, float: 4, double: 8 };
const FIELD_TONES = [C.active, C.ok, C.purple, C.bad, C.ink, C.primary, C.active, C.ok, C.purple];
const PRESETS = {
  bloated: {
    label: "BloatedImuPacket (chapter)",
    fields: [["is_valid", "bool"], ["timestamp_sec", "double"], ["sensor_id", "uint8_t"], ["accel_z", "float"], ["gyro_z", "double"], ["status_flags", "uint8_t"]],
    align: false,
  },
  aligned: {
    label: "AlignedImuPacket (chapter)",
    fields: [["timestamp_sec", "double"], ["gyro_z", "double"], ["accel_x", "float"], ["accel_y", "float"], ["accel_z", "float"], ["sensor_id", "uint8_t"], ["status_flags", "uint8_t"], ["is_valid", "bool"], ["reserved_pad", "uint8_t"]],
    align: true,
  },
};

/** Pure: compute offsets, padding, sizeof and alignof like a C++ compiler (natural alignment). */
function layoutStruct(fields, alignas) {
  let off = 0;
  const out = [];
  const pads = [];
  let maxA = 1;
  fields.forEach(([name, type], k) => {
    const sz = TYPES[type];
    maxA = Math.max(maxA, sz);
    const pad = (sz - (off % sz)) % sz;
    if (pad) pads.push({ at: off, len: pad, why: `${pad} byte${pad > 1 ? "s" : ""} of padding: ${type} ${name} needs an address divisible by ${sz}` });
    off += pad;
    out.push({ name, type, off, sz, k });
    off += sz;
  });
  const align = Math.max(maxA, alignas ? 32 : 1);
  const size = Math.ceil(off / align) * align;
  if (size > off) pads.push({ at: off, len: size - off, why: `${size - off} bytes of tail padding so sizeof is a multiple of alignof (${align})` });
  const data = fields.reduce((s, [, t]) => s + TYPES[t], 0);
  return { fields: out, pads, size, align, data, padding: size - data };
}

function ByteGrid({ L }) {
  const W = 640,
    x0 = 46,
    cw = (W - x0 - 6) / 64,
    rowH = 34;
  const segs = [];
  for (let base = 0; base < 128; base += L.size) {
    const idx = base / L.size;
    for (const f of L.fields) segs.push({ x: base + f.off, len: f.sz, kind: "f", f, idx });
    for (const p of L.pads) segs.push({ x: base + p.at, len: p.len, kind: "p", p, idx });
  }
  // split segments at 64-byte line boundaries / clip at 128
  const pieces = [];
  for (const s of segs) {
    let a = s.x;
    const end = Math.min(s.x + s.len, 128);
    while (a < end) {
      const b = Math.min(end, Math.floor(a / 64) * 64 + 64);
      pieces.push({ ...s, a, b, straddle: Math.floor(s.x / 64) !== Math.floor((s.x + s.len - 1) / 64) });
      a = b;
    }
  }
  const starts = [];
  for (let base = 0; base < 128; base += L.size) starts.push(base);
  return (
    <svg viewBox={`0 0 ${W} ${2 * rowH + 40}`} className="w-full font-mono">
      <defs>
        <pattern id="pad-stripes" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill={C.warn} opacity={0.18} />
          <line x1="0" y1="0" x2="0" y2="5" stroke={C.warn} strokeWidth={2.2} />
        </pattern>
      </defs>
      {[0, 1].map((line) => (
        <g key={line}>
          <text x={2} y={22 + line * (rowH + 14) + rowH / 2} fontSize={10} fill={C.muted}>
            line {line}
          </text>
          {Array.from({ length: 64 }, (_, b) => (
            <rect key={b} x={x0 + b * cw} y={16 + line * (rowH + 14)} width={cw - 0.8} height={rowH} fill={C.fill} rx={1} />
          ))}
          {[0, 16, 32, 48, 63].map((b) => (
            <text key={b} x={x0 + b * cw + cw / 2} y={12 + line * (rowH + 14)} textAnchor="middle" fontSize={8.5} fill={C.muted}>
              {b + line * 64}
            </text>
          ))}
        </g>
      ))}
      {pieces.map((p, k) => {
        const line = Math.floor(p.a / 64);
        const x = x0 + (p.a % 64) * cw;
        const w = (p.b - p.a) * cw - 0.8;
        const y = 16 + line * (rowH + 14);
        const tip = p.kind === "p" ? p.p.why : `arr[${p.idx}].${p.f.name}: ${p.f.type} (${p.f.sz} B) @ offset ${p.f.off}${p.straddle ? " — STRADDLES a cache-line boundary!" : ""}`;
        return (
          <Tip key={k} content={tip}>
            <rect x={x} y={y} width={w} height={rowH} rx={2} fill={p.kind === "p" ? "url(#pad-stripes)" : FIELD_TONES[p.f.k % FIELD_TONES.length]} opacity={p.kind === "p" ? 1 : p.idx % 2 ? 0.55 : 0.85} stroke={p.straddle && p.kind === "f" ? C.bad : "none"} strokeWidth={2} className="cursor-help" />
          </Tip>
        );
      })}
      {starts.map((b) => (
        <g key={b}>
          <line x1={x0 + (b % 64) * cw - 0.4} x2={x0 + (b % 64) * cw - 0.4} y1={14 + Math.floor(b / 64) * (rowH + 14)} y2={18 + rowH + Math.floor(b / 64) * (rowH + 14)} stroke={C.fg} strokeWidth={1.6} />
          <text x={x0 + (b % 64) * cw + 2} y={rowH + 27 + Math.floor(b / 64) * (rowH + 14)} fontSize={9} fill={C.fg}>
            [{b / L.size}]
          </text>
        </g>
      ))}
    </svg>
  );
}

function PackTab() {
  const [fields, setFields] = useState(PRESETS.bloated.fields);
  const [alignas, setAlignas] = useState(false);
  const [preset, setPreset] = useState("bloated");
  const L = useMemo(() => layoutStruct(fields, alignas), [fields, alignas]);
  const move = (k, d) =>
    setFields((f) => {
      const n = [...f];
      [n[k], n[k + d]] = [n[k + d], n[k]];
      return n;
    });
  const sortBySize = () => setFields((f) => [...f].sort((a, b) => TYPES[b[1]] - TYPES[a[1]]));
  let straddles = 0;
  for (let base = 0; base < 128; base += L.size)
    for (const f of L.fields) if (base + f.off < 128 && Math.floor((base + f.off) / 64) !== Math.floor((base + f.off + f.sz - 1) / 64)) straddles++;
  const packetStraddle = [];
  for (let base = 0; base < 128; base += L.size) if (L.size <= 64 && Math.floor(base / 64) !== Math.floor((base + L.size - 1) / 64)) packetStraddle.push(base / L.size);

  const code = `struct ${alignas ? "alignas(32) " : ""}ImuPacket {\n${L.fields.map((f) => `    ${f.type.padEnd(8)} ${(f.name + ";").padEnd(15)} // ${f.sz} B @ offset ${f.off}`).join("\n")}\n}; // sizeof = ${L.size}, alignof = ${L.align}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={preset}
          onValueChange={(v) => {
            if (!v) return;
            setPreset(v);
            setFields(PRESETS[v].fields);
            setAlignas(PRESETS[v].align);
          }}
        >
          {Object.entries(PRESETS).map(([k, p]) => (
            <ToggleGroupItem key={k} value={k}>
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button size="sm" variant="outline" onClick={sortBySize}>
          <ArrowDownWideNarrow /> Sort largest → smallest
        </Button>
      </div>
      <Stage className="p-2">
        <ByteGrid L={L} />
      </Stage>
      <div className="flex flex-wrap gap-2">
        <Badge variant="active">sizeof = {L.size} B</Badge>
        <Badge variant="outline">alignof = {L.align}</Badge>
        <Badge variant={L.padding ? "warning" : "success"}>{L.padding} B padding</Badge>
        <Badge variant="outline">{L.data} B real data</Badge>
        <Badge variant={L.size <= 64 && 64 % L.size === 0 ? "success" : "outline"}>{L.size <= 64 ? `${Math.floor(64 / L.size)} per cache line` : "> 1 cache line"}</Badge>
        <Badge variant={packetStraddle.length || straddles ? "danger" : "success"}>{packetStraddle.length ? `arr[${packetStraddle.join("], arr[")}] straddles line boundary` : straddles ? `${straddles} field(s) split across lines` : "never straddles a line"}</Badge>
      </div>
      <Split>
        <div className="space-y-2">
          <Panel title="Field order (click arrows to reorder)">
            {fields.map(([name, type], k) => {
              const f = L.fields[k];
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: FIELD_TONES[k % FIELD_TONES.length] }} />
                  <span className="w-44 font-mono text-[12.5px]">
                    {type} {name}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted-foreground">@{f.off}</span>
                  <div className="ml-auto flex gap-1">
                    <Button size="icon-sm" variant="ghost" className="size-7" disabled={k === 0} onClick={() => move(k, -1)} aria-label="move up">
                      <ArrowUp />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="size-7" disabled={k === fields.length - 1} onClick={() => move(k, 1)} aria-label="move down">
                      <ArrowDown />
                    </Button>
                  </div>
                </div>
              );
            })}
            <SwitchControl label="struct alignas(32)" hint="every instance starts on a 32-byte boundary" checked={alignas} onChange={setAlignas} />
          </Panel>
        </div>
        <div className="space-y-2">
          <CodePanel code={code} lang="cpp" maxHeight={260} />
          <Narration tone={L.padding > 8 ? "warn" : "ok"}>
            {L.pads.length ? L.pads[0].why + "." : "No padding at all."} Ordering fields largest → smallest packs them tightly{alignas ? "; alignas(32) then rounds sizeof up to 32 so two packets tile one 64-byte line exactly and can never straddle it." : ". Toggle alignas(32) to guarantee no packet ever straddles a cache line."}
          </Narration>
        </div>
      </Split>
      <Legend
        items={[
          [C.warn, "compiler padding (hover for the alignment math)"],
          [C.bad, "outlined = field split across cache lines"],
        ]}
      />
    </div>
  );
}

/* ================================================================== */
/* 3. unique_ptr / shared_ptr ownership stepper                         */
/* ================================================================== */
const PTR_CODE = `int main() {
    auto driver_scan = std::make_unique<LidarScan>(42, 8.5f);
    std::unique_ptr<LidarScan> filter_scan = std::move(driver_scan);
    std::shared_ptr<const LidarScan> shared_scan = std::move(filter_scan);
    {
        std::shared_ptr<const LidarScan> sub_obstacle = shared_scan;
        std::shared_ptr<const LidarScan> sub_logger   = shared_scan;
    } // sub_obstacle & sub_logger destroyed
    return 0; // ~shared_scan(): use_count 1 -> 0
}`;
const N = null;
const PTR_STEPS = [
  { line: 1, ptrs: { driver_scan: N, filter_scan: N, shared_scan: N, sub_obstacle: N, sub_logger: N }, heap: false, uc: null, live: [], note: "Before anything runs: no heap allocation yet. Each smart pointer is just an 8-byte slot on the stack." },
  { line: 2, ptrs: { driver_scan: "0x6000" }, heap: true, uc: null, live: ["driver_scan"], note: "make_unique allocates LidarScan (8 B id + 4,096 B ranges) on the heap ONCE, at startup. driver_scan exclusively owns it." },
  { line: 3, ptrs: { driver_scan: "nullptr", filter_scan: "0x6000" }, heap: true, uc: null, live: ["driver_scan", "filter_scan"], moved: 8, note: "std::move is just a cast; the move constructor copies the 8-byte address into filter_scan and nulls driver_scan. 0 bytes of the scan copied." },
  { line: 4, ptrs: { driver_scan: "nullptr", filter_scan: "nullptr", shared_scan: "0x6000" }, heap: true, uc: 1, live: ["driver_scan", "filter_scan", "shared_scan"], moved: 16, note: "Promoting to shared_ptr<const> creates a control block with an atomic use_count = 1. Still the same heap object." },
  { line: [6, 7], ptrs: { driver_scan: "nullptr", filter_scan: "nullptr", shared_scan: "0x6000", sub_obstacle: "0x6000", sub_logger: "0x6000" }, heap: true, uc: 3, live: ["driver_scan", "filter_scan", "shared_scan", "sub_obstacle", "sub_logger"], moved: 16, note: "Copying a shared_ptr = copying 8 bytes + one atomic increment each. Both subscribers read the exact same address: zero-copy fan-out." },
  { line: 8, ptrs: { driver_scan: "nullptr", filter_scan: "nullptr", shared_scan: "0x6000" }, heap: true, uc: 1, live: ["driver_scan", "filter_scan", "shared_scan"], moved: 16, note: "Inner scope closes: RAII destructors run for sub_obstacle and sub_logger → two atomic decrements, use_count back to 1." },
  { line: 9, ptrs: {}, heap: false, freed: true, uc: 0, live: [], moved: 16, note: "main() returns: ~shared_scan drops use_count 1 → 0, so ~LidarScan() runs and the heap block is freed. driver_scan/filter_scan destructors are safe no-ops on nullptr." },
];

function PtrTab() {
  const [tryCopy, setTryCopy] = useState(false);
  const steps = useMemo(
    () =>
      tryCopy
        ? [PTR_STEPS[0], PTR_STEPS[1], { ...PTR_STEPS[1], line: 3, err: true, note: "std::unique_ptr<LidarScan> filter_scan = driver_scan;  →  error: use of deleted function 'unique_ptr(const unique_ptr&)'. Exclusive ownership cannot be copied — you must std::move it." }]
        : PTR_STEPS,
    [tryCopy]
  );
  const st = useStepper(steps, { baseMs: 1400 });
  const s = st.step;
  const names = ["driver_scan", "filter_scan", "shared_scan", "sub_obstacle", "sub_logger"];
  return (
    <div className="space-y-3">
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stack (8 B each)</div>
                {names.map((nm) => {
                  const v = s.ptrs[nm];
                  const live = s.live.includes(nm);
                  return (
                    <div key={nm} className={cn("flex items-center justify-between rounded-md border bg-card px-2 py-1.5 font-mono text-[12px] transition-all", !live && "opacity-35", v === "0x6000" && "border-viz-ok", v === "nullptr" && "border-viz-bad/60")}>
                      <span>{nm}</span>
                      <span className={v === "0x6000" ? "text-viz-ok" : v === "nullptr" ? "text-viz-bad" : "text-muted-foreground"}>{live ? v : "—"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-16 font-mono text-[18px] text-muted-foreground">→</div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Heap</div>
                <div className={cn("rounded-md border-2 p-2 font-mono text-[12px] transition-all", s.heap ? "border-viz-ok bg-viz-ok/8" : s.freed ? "border-dashed border-viz-bad/60 opacity-60" : "border-dashed opacity-40")}>
                  <div className="font-semibold">@0x6000 LidarScan #42</div>
                  <div className="text-muted-foreground">4,104 B · ranges_m[1024]</div>
                  {s.freed && <div className="text-viz-bad">~LidarScan() → freed</div>}
                </div>
                {s.uc != null && (
                  <div className="rounded-md border border-viz-purple/60 bg-viz-purple/8 p-2 font-mono text-[12px]">
                    control block
                    <div className="mt-1 flex items-center gap-2">
                      use_count
                      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full bg-viz-purple transition-all duration-500" style={{ width: `${(s.uc / 3) * 100}%` }} />
                      </div>
                      <b>{s.uc}</b>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Stage>
          <Narration tone={s.err ? "bad" : s.freed ? "ok" : "active"}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={PTR_CODE} lang="cpp" active={s.line} />
          <SwitchControl label="Try to COPY the unique_ptr instead" checked={tryCopy} onChange={setTryCopy} />
          <VarTable
            vars={[
              ["bytes of scan copied", "0 B", "ok"],
              ["pointer bytes moved", `${s.moved ?? 0} B`, "active"],
              ["use_count()", s.uc ?? "N/A (unique)", "purple"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

export default function CacheLineLab() {
  return (
    <LabShell
      title="Cache Lines, Struct Packing & Ownership"
      description="Why contiguous memory beats pointer chasing, how field order and alignas(32) shape a 64-byte cache line, and how unique_ptr moves ownership without copying a byte."
      badges={["64-byte cache line", "alignas(32)", "std::move"]}
    >
      <Tabs defaultValue="chase">
        <TabsList>
          <TabsTrigger value="chase">Heap vs contiguous</TabsTrigger>
          <TabsTrigger value="pack">Struct padding</TabsTrigger>
          <TabsTrigger value="ptr">unique_ptr / shared_ptr</TabsTrigger>
        </TabsList>
        <TabsContent value="chase">
          <ChaseTab />
        </TabsContent>
        <TabsContent value="pack">
          <PackTab />
        </TabsContent>
        <TabsContent value="ptr">
          <PtrTab />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
