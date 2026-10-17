import { useMemo, useState } from "react";
import { RotateCcw, Skull } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, rng, useStepper,
} from "@/viz/kit";

const INPUT = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px]";
const hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, "0");
const addr = (n) => "0x" + hex(n, 4);
const lineOf = (code, s) => code.split("\n").findIndex((l) => l.includes(s)) + 1;

/* ================================================================== */
/* variant "memory" — RAM bytes, overflow, stack vs heap               */
/* ================================================================== */

const DECLS = {
  bool: { type: "bool", name: "isReady", size: 1, min: 0, max: 1, step: 1, init: 1, range: "false / true", tone: C.purple },
  char: { type: "char", name: "grade", size: 1, min: 0, max: 127, step: 1, init: 65, range: "-128 … 127", tone: C.ok },
  int: { type: "int", name: "score", size: 4, min: -2147483648, max: 2147483647, step: 1, init: 258, range: "≈ ±2.1 × 10⁹", tone: C.active },
  ll: { type: "long long", name: "pop", size: 8, min: -1e10, max: 1e10, step: 1e6, init: 8e9, range: "≈ ±9.2 × 10¹⁸", tone: C.warn },
  double: { type: "double", name: "pi", size: 8, min: -1000, max: 1000, step: 0.00001, init: 3.14159, range: "±1.8 × 10³⁰⁸ (15 digits)", tone: C.warn },
};

function literal(kind, v) {
  if (kind === "bool") return v ? "true" : "false";
  if (kind === "char") return v >= 32 && v < 127 ? `'${String.fromCharCode(v)}'` : `(char)${v}`;
  if (kind === "ll") return `${Math.round(v)}LL`;
  return String(v);
}

/** Little-endian bytes for a value of the given C++ type. */
function bytesOf(kind, v) {
  if (kind === "bool") return [v ? 1 : 0];
  if (kind === "char") return [v & 0xff];
  if (kind === "int") {
    const u = v >>> 0;
    return [0, 1, 2, 3].map((k) => (u >>> (8 * k)) & 0xff);
  }
  if (kind === "ll") {
    const u = BigInt.asUintN(64, BigInt(Math.round(v)));
    return Array.from({ length: 8 }, (_, k) => Number((u >> BigInt(8 * k)) & 0xffn));
  }
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, v, true);
  return Array.from({ length: 8 }, (_, k) => dv.getUint8(k));
}

const fmtByte = (b, mode) => (mode === "hex" ? hex(b) : mode === "bin" ? b.toString(2).padStart(8, "0") : String(b));

function RamInspector() {
  const [kind, setKind] = useState("int");
  const [vals, setVals] = useState(() => Object.fromEntries(Object.entries(DECLS).map(([k, d]) => [k, d.init])));
  const [mode, setMode] = useState("hex");
  const [draft, setDraft] = useState(null);
  const d = DECLS[kind];
  const v = vals[kind];
  const bytes = bytesOf(kind, v);
  const start = d.size === 8 ? 8 : 4; // naturally aligned inside the 16-byte window
  const garbage = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 16 }, () => Math.floor(r() * 256));
  }, []);
  const setV = (x) => setVals((o) => ({ ...o, [kind]: Math.max(d.min, Math.min(d.max, x)) }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={(k) => { setKind(k); setDraft(null); }}>
          <SelectTrigger className="w-56 font-mono text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DECLS).map(([k, x]) => (
              <SelectItem key={k} value={k} className="font-mono text-[12.5px]">
                {x.type} {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={mode} onValueChange={(m) => m && setMode(m)} className="ml-auto">
          <ToggleGroupItem value="hex">Hex</ToggleGroupItem>
          <ToggleGroupItem value="bin">Binary</ToggleGroupItem>
          <ToggleGroupItem value="dec">Decimal</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Split>
        <div className="space-y-3">
          <div className="rounded-lg border bg-code px-3 py-2 font-mono text-[13px]">
            <span className="text-viz-purple">{d.type}</span> {d.name} = <span className="text-viz-active">{literal(kind, v)}</span>;
            <span className="text-muted-foreground">{"  "}// sizeof = {d.size} byte{d.size > 1 ? "s" : ""}</span>
          </div>
          <Stage className="p-3">
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
              {garbage.map((g, k) => {
                const mine = k >= start && k < start + d.size;
                const b = mine ? bytes[k - start] : g;
                const pos = k - start;
                return (
                  <Tip
                    key={k}
                    content={
                      <div className="font-mono text-[11px] leading-relaxed">
                        <div>address {addr(0x1000 + k)}</div>
                        <div>bits b7..b0 = {b.toString(2).padStart(8, "0")}</div>
                        <div>{mine ? `byte ${pos} of ${d.size}${d.size > 1 ? (pos === 0 ? " — least significant (LSB)" : pos === d.size - 1 ? " — most significant (MSB)" : "") : ""}` : "not ours — leftover garbage"}</div>
                      </div>
                    }
                  >
                    <div
                      className={cn(
                        "flex h-14 cursor-default flex-col items-center justify-center rounded-md border font-mono transition-colors",
                        mine ? "border-viz-active bg-viz-active/12" : "border-dashed bg-card opacity-45"
                      )}
                      style={mine ? { borderColor: d.tone, background: `color-mix(in oklab, ${d.tone} 14%, transparent)` } : undefined}
                    >
                      <span className={cn("font-semibold tabular-nums", mode === "bin" ? "text-[10px]" : "text-[13px]")}>{fmtByte(b, mode)}</span>
                      <span className="text-[9.5px] text-muted-foreground">{hex(0x1000 + k, 4).slice(2)}</span>
                    </div>
                  </Tip>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">0x1000 → 0x100F</span>
              <Badge variant="outline" style={{ color: d.tone }}>
                {d.name}: {addr(0x1000 + start)}{d.size > 1 ? ` … ${addr(0x1000 + start + d.size - 1)}` : ""}
              </Badge>
              {d.size > 1 && <span>little-endian: lowest address holds the least significant byte</span>}
            </div>
          </Stage>
          <Narration tone="active">
            <b>{d.name}</b> claims {d.size} contiguous byte{d.size > 1 ? "s" : ""} starting at {addr(0x1000 + start)}.{" "}
            {kind === "double"
              ? "A double is stored as IEEE-754: 1 sign bit, 11 exponent bits, 52 mantissa bits — the bytes don't look like the decimal digits."
              : kind === "int" && v === 258
                ? "258 = 0x00000102, so memory holds 02 01 00 00 — the low byte comes first."
                : "Hover any cell for its address and bit pattern. Dashed cells belong to nobody: reading them is reading garbage."}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Value">
            <SliderControl label={`${d.name} =`} value={v} min={d.min} max={d.max} step={d.step} onChange={setV} format={(x) => literal(kind, x)} />
            <div className="flex items-center gap-2">
              <input
                className={cn(INPUT, "w-full")}
                value={draft ?? (kind === "char" ? String.fromCharCode(v) : String(v))}
                onChange={(e) => {
                  const t = e.target.value;
                  if (kind === "char") return t.length && setV(t.charCodeAt(t.length - 1));
                  setDraft(t);
                  if (t.trim() !== "" && !Number.isNaN(Number(t))) setV(Number(t));
                }}
                onBlur={() => setDraft(null)}
                aria-label="Exact value"
              />
            </div>
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>type</TableHead>
                <TableHead className="text-right">sizeof</TableHead>
                <TableHead className="text-right">range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(DECLS).map(([k, x]) => (
                <TableRow key={k} className={cn(k === kind && "bg-viz-active/10")}>
                  <TableCell className="py-1.5 font-mono text-[12.5px]">{x.type}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px]">{x.size} B</TableCell>
                  <TableCell className="py-1.5 text-right text-[12px] text-muted-foreground">{x.range}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="py-1.5 font-mono text-[12.5px]">T* (any pointer)</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[12.5px]">8 B</TableCell>
                <TableCell className="py-1.5 text-right text-[12px] text-muted-foreground">64-bit address</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Split>
    </div>
  );
}

const INT_MAX = 0x7fffffff;
const U32 = 2 ** 32;

function OverflowSim() {
  const [bits, setBits] = useState(INT_MAX - 2);
  const [signed, setSigned] = useState(true);
  const [flash, setFlash] = useState({ carry: 0, wrapped: false, msg: "Press +1 to walk toward INT_MAX, then cross it." });
  const [a, setA] = useState(50000);
  const [b, setB] = useState(50000);
  const val = signed ? bits | 0 : bits >>> 0;

  const go = (next, msg) => {
    setBits(next >>> 0);
    setFlash({ carry: 0, wrapped: false, msg });
  };
  const add = (delta) => {
    const prev = bits >>> 0;
    const next = (prev + delta + U32) % U32;
    let carry = 0;
    if (delta === 1) while (carry < 32 && ((prev >>> carry) & 1) === 1) carry++;
    const wrapped = signed ? (delta === 1 ? prev === INT_MAX : prev === 0x80000000) : delta === 1 ? prev === U32 - 1 : prev === 0;
    setBits(next);
    const nv = signed ? next | 0 : next;
    setFlash({
      carry: delta === 1 ? carry + 1 : 0,
      wrapped,
      msg: wrapped
        ? signed
          ? `Overflow! ${(prev | 0).toLocaleString()} ${delta > 0 ? "+ 1" : "− 1"} wrapped to ${nv.toLocaleString()}. The carry flipped bit 31 — the sign bit. (Signed overflow is undefined behaviour in C++: never rely on it.)`
          : `Wrap-around: ${prev.toLocaleString()} ${delta > 0 ? "+ 1" : "− 1"} = ${nv.toLocaleString()}. Unsigned arithmetic is defined modulo 2³².`
        : delta === 1 && carry > 0
          ? `+1 rippled a carry through ${carry} trailing 1-bit${carry > 1 ? "s" : ""}, like an odometer rolling over.`
          : `Value is now ${nv.toLocaleString()}.`,
    });
  };

  // number wheel
  const R = 80, cx = 100, cy = 100;
  const ang = (u) => (u / U32) * 2 * Math.PI - Math.PI / 2;
  const mx = cx + R * Math.cos(ang(bits >>> 0)), my = cy + R * Math.sin(ang(bits >>> 0));
  const prod32 = Math.imul(a, b);
  const prod64 = a * b;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <SwitchControl label={signed ? "Signed (int)" : "Unsigned (unsigned int)"} checked={signed} onChange={setSigned} id="ovf-signed" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {signed ? (
            <>
              <Button variant="outline" size="xs" onClick={() => go(INT_MAX, "INT_MAX = 2,147,483,647: bit 31 is 0, all 31 value bits are 1.")}>Jump to INT_MAX</Button>
              <Button variant="outline" size="xs" onClick={() => go(0, "Zero: every bit is 0.")}>Jump to 0</Button>
              <Button variant="outline" size="xs" onClick={() => go(0x80000000, "INT_MIN = −2,147,483,648: only the sign bit is set.")}>Jump to INT_MIN</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="xs" onClick={() => go(U32 - 1, "UINT_MAX = 4,294,967,295: all 32 bits set.")}>Jump to UINT_MAX</Button>
              <Button variant="outline" size="xs" onClick={() => go(0, "Zero: every bit is 0.")}>Jump to 0</Button>
            </>
          )}
          <Button size="xs" variant="outline" onClick={() => add(-1)}>−1</Button>
          <Button size="xs" onClick={() => add(1)}>+1</Button>
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <div className="flex flex-wrap items-center gap-4">
              <svg viewBox="0 0 200 200" className="w-40 shrink-0 font-mono">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.grid} strokeWidth={14} />
                {signed ? (
                  <>
                    <path d={`M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R}`} fill="none" stroke={C.ok} strokeWidth={6} opacity={0.6} />
                    <path d={`M ${cx} ${cy + R} A ${R} ${R} 0 0 1 ${cx} ${cy - R}`} fill="none" stroke={C.purple} strokeWidth={6} opacity={0.6} />
                    <line x1={cx} x2={cx} y1={cy + R - 14} y2={cy + R + 14} stroke={C.bad} strokeWidth={2.5} />
                    <text x={cx} y={cy + 52} textAnchor="middle" fontSize={10} fill={C.bad}>MAX | MIN</text>
                    <text x={cx} y={cy - 52} textAnchor="middle" fontSize={10} fill={C.muted}>0</text>
                    <text x={cx + 46} y={cy + 4} textAnchor="middle" fontSize={10} fill={C.ok}>+</text>
                    <text x={cx - 46} y={cy + 4} textAnchor="middle" fontSize={10} fill={C.purple}>−</text>
                  </>
                ) : (
                  <>
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.active} strokeWidth={6} opacity={0.45} />
                    <line x1={cx} x2={cx} y1={cy - R - 14} y2={cy - R + 14} stroke={C.bad} strokeWidth={2.5} />
                    <text x={cx} y={cy - 48} textAnchor="middle" fontSize={10} fill={C.bad}>MAX | 0</text>
                  </>
                )}
                <circle cx={mx} cy={my} r={8} fill={flash.wrapped ? C.bad : C.active} className="transition-all duration-300" />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={C.fg} fontWeight={600}>
                  {Math.abs(val) >= 1e6 ? val.toExponential(2) : val}
                </text>
              </svg>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  32-bit register {signed && <Badge variant="danger">bit 31 = sign bit</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 2, 1, 0].map((byte) => (
                    <div key={byte} className="flex gap-px">
                      {Array.from({ length: 8 }, (_, k) => {
                        const bit = byte * 8 + 7 - k;
                        const on = ((bits >>> bit) & 1) === 1;
                        const carried = bit < flash.carry;
                        return (
                          <div
                            key={bit}
                            className={cn(
                              "flex h-6 w-4 items-center justify-center rounded-[3px] border font-mono text-[10.5px] transition-colors",
                              on ? "bg-viz-active/20 text-viz-active" : "bg-card text-muted-foreground",
                              carried && "border-viz-warn bg-viz-warn/25 text-viz-warn",
                              bit === 31 && signed && "border-viz-bad text-viz-bad"
                            )}
                          >
                            {on ? 1 : 0}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">0x{hex(bits >>> 0, 8)}</div>
              </div>
            </div>
          </Stage>
          <Narration tone={flash.wrapped ? "bad" : flash.carry > 1 ? "warn" : "default"}>{flash.msg}</Narration>
        </div>
        <div className="space-y-3">
          <StatGrid cols={2}>
            <Stat label={signed ? "int value" : "unsigned value"} value={val.toLocaleString()} tone={flash.wrapped ? "bad" : "active"} />
            <Stat label="range" value={signed ? "−2³¹ … 2³¹−1" : "0 … 2³²−1"} />
          </StatGrid>
          <Panel title="Mistake 2: overflow before the cast">
            <SliderControl label="int a" value={a} min={0} max={100000} step={1000} onChange={setA} format={(x) => x.toLocaleString()} />
            <SliderControl label="int b" value={b} min={0} max={100000} step={1000} onChange={setB} format={(x) => x.toLocaleString()} />
            <div className="space-y-1 font-mono text-[12px]">
              <div className="flex justify-between gap-2">
                <span>long long c = a * b;</span>
                <span className={prod32 !== prod64 ? "text-viz-bad" : "text-viz-ok"}>{prod32.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>long long c = 1LL * a * b;</span>
                <span className="text-viz-ok">{prod64.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {prod32 !== prod64 ? "a * b is computed in 32-bit int and overflows before it is widened. Promote one operand first." : "Fits in int — no overflow yet. Push the sliders past ~46,341."}
            </p>
          </Panel>
        </div>
      </Split>
    </div>
  );
}

const SH_CODE = `int square(int n) {
    int result = n * n;
    return result;
}

int sumOfSquares(int a, int b) {
    int sqA = square(a);
    int sqB = square(b);
    return sqA + sqB;
}

int main() {
    int x = 3;
    int y = 4;
    int total = sumOfSquares(x, y);
    int* heapVal = new int(999);
    cout << total << " " << *heapVal << "\\n";
    delete heapVal;
    return 0;
}`;

/** Snapshot list for the chapter's stack/heap dry run. */
function stackHeapSteps() {
  const M = (total = "?", heapVal = null) => ({
    name: "main()",
    vars: [["x", 3, 0x30], ["y", 4, 0x2c], ["total", total, 0x28], ...(heapVal ? [["heapVal", heapVal, 0x20]] : [])],
  });
  const S = (sqA = "?", sqB = "?") => ({ name: "sumOfSquares(3, 4)", vars: [["a", 3, 0x18], ["b", 4, 0x14], ["sqA", sqA, 0x10], ["sqB", sqB, 0x0c]] });
  const Q = (n, result = "?") => ({ name: `square(${n})`, vars: [["n", n, -0x08], ["result", result, -0x0c]], low: true });
  const P = "0x5500_00A0";
  return [
    { line: [13, 14], frames: [M()], heap: null, note: "main() frame is pushed. x = 3 and y = 4 live on the stack.", tone: "active" },
    { line: [15, 6], frames: [M(), S()], heap: null, note: "Calling sumOfSquares(3, 4) pushes a new frame below main's — the stack grows downward.", tone: "active" },
    { line: [7, 1], frames: [M(), S(), Q(3)], heap: null, note: "square(3) is pushed. This is peak depth: 3 frames.", tone: "warn" },
    { line: 2, frames: [M(), S(), Q(3, 9)], heap: null, note: "result = 3 * 3 = 9, stored in square's own frame.", tone: "active" },
    { line: 7, frames: [M(), S(9)], heap: null, note: "square(3) returns 9 and its frame is popped — n and result are gone.", tone: "ok" },
    { line: [8, 1], frames: [M(), S(9), Q(4)], heap: null, note: "square(4) is pushed into the same memory square(3) just used.", tone: "active" },
    { line: 2, frames: [M(), S(9), Q(4, 16)], heap: null, note: "result = 4 * 4 = 16.", tone: "active" },
    { line: 8, frames: [M(), S(9, 16)], heap: null, note: "square(4) returns 16 and pops.", tone: "ok" },
    { line: [9, 15], frames: [M(25)], heap: null, note: "sumOfSquares returns 9 + 16 = 25 and pops. total = 25.", tone: "ok" },
    { line: 16, frames: [M(25, P)], heap: { addr: P, val: 999, freed: false }, note: "new int(999) reserves 4 bytes on the HEAP. Only the 8-byte pointer heapVal lives on the stack.", tone: "purple" },
    { line: 17, frames: [M(25, P)], heap: { addr: P, val: 999, freed: false }, note: "Dereferencing *heapVal follows the arrow to the heap. Prints \"25 999\".", tone: "active" },
    { line: 18, frames: [M(25, P)], heap: { addr: P, val: 999, freed: true }, note: "delete heapVal frees the heap block. heapVal still holds the old address — it is now dangling.", tone: "warn" },
    { line: 19, frames: [], heap: null, note: "return 0: main's frame is popped. Stack and heap are both empty again.", tone: "ok", done: true },
  ];
}

function StackHeapDebugger() {
  const [mode, setMode] = useState("trace");
  const [onStack, setOnStack] = useState(true);
  const steps = useMemo(stackHeapSteps, []);
  const st = useStepper(steps, { baseMs: 1100 });
  const s = st.step;

  // layout
  const W = 600, rowH = 17, headH = 20, x0 = 12, fw = 300;
  let y = 28;
  const boxes = s.frames.map((f, k) => {
    const h = headH + f.vars.length * rowH + 6;
    const b = { f, y, h, top: k === s.frames.length - 1 };
    y += h + 6;
    return b;
  });
  const H = 300;
  let ptrY = null;
  boxes.forEach((b) => b.f.vars.forEach(([n], r) => n === "heapVal" && (ptrY = b.y + headH + r * rowH + 8)));
  const hx = 400, hy = H - 70;
  const rsp = boxes.length ? 0x7fff0000 + Math.min(...boxes.at(-1).f.vars.map((v) => v[2])) : null;

  if (mode === "big") {
    const MB = 40, LIMIT = 8;
    return (
      <div className="space-y-3">
        <ModeToggle mode={mode} setMode={setMode} />
        <Split>
          <div className="space-y-3">
            <CodePanel
              code={onStack ? "int main() {\n    int big[10000000];     // 40 MB on the STACK\n    big[0] = 1;\n    return 0;\n}" : "int main() {\n    vector<int> big(10000000); // 40 MB on the HEAP\n    big[0] = 1;\n    return 0;\n}"}
              active={2}
            />
            <Narration tone={onStack ? "bad" : "ok"}>
              {onStack
                ? "10,000,000 ints × 4 bytes = 40 MB, but the default stack is only ~8 MB (Linux) or 1 MB (Windows). The program dies with a stack overflow / segmentation fault before big[0] is even written."
                : "std::vector asks the heap for 40 MB. The stack only holds the vector's 24-byte header (pointer, size, capacity). Safe."}
            </Narration>
          </div>
          <div className="space-y-3">
            <SwitchControl label={onStack ? "Allocate 40 MB array on stack (crash)" : "Allocate via std::vector on heap (safe)"} checked={!onStack} onChange={(v) => setOnStack(!v)} id="big-heap" />
            <Panel title="Stack usage (limit 8 MB)">
              <Progress value={onStack ? 100 : 0.3} indicatorClassName={onStack ? "bg-viz-bad" : "bg-viz-ok"} />
              <div className="font-mono text-[12px]">{onStack ? `${MB} MB requested > ${LIMIT} MB limit` : "24 bytes"}</div>
              {onStack && <Badge variant="danger"><Skull className="size-3" /> Stack overflow</Badge>}
            </Panel>
            <Panel title="Heap usage (limited only by RAM)">
              <Progress value={onStack ? 0 : 40} indicatorClassName="bg-viz-purple" />
              <div className="font-mono text-[12px]">{onStack ? "0 MB" : `${MB} MB — no problem`}</div>
            </Panel>
          </div>
        </Split>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ModeToggle mode={mode} setMode={setMode} />
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
              <defs>
                <marker id="mem-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
                </marker>
              </defs>
              <text x={x0} y={16} fontSize={11} fill={C.muted}>STACK ↓ grows downward</text>
              <text x={hx} y={16} fontSize={11} fill={C.muted}>HEAP ↑ grows upward</text>
              {boxes.length === 0 && <text x={x0 + 8} y={50} fontSize={11} fill={C.muted}>(empty — all frames popped)</text>}
              {boxes.map((b) => (
                <g key={b.f.name + b.y}>
                  <rect x={x0} y={b.y} width={fw} height={b.h} rx={6} fill={b.top ? C.active : C.fill} fillOpacity={b.top ? 0.1 : 0.6} stroke={b.top ? C.active : C.border} strokeWidth={b.top ? 1.6 : 1} />
                  <text x={x0 + 8} y={b.y + 14} fontSize={11} fontWeight={600} fill={b.top ? C.active : C.fg}>{b.f.name}{b.top ? "  ← top" : ""}</text>
                  {b.f.vars.map(([n, v, off], r) => (
                    <g key={n}>
                      <text x={x0 + 14} y={b.y + headH + r * rowH + 12} fontSize={11} fill={C.fg}>{n} = {String(v)}</text>
                      <text x={x0 + fw - 8} y={b.y + headH + r * rowH + 12} fontSize={10} fill={C.muted} textAnchor="end">
                        {off < 0 ? `0x7FFE_FF${hex(0x100 + off).slice(-2)}` : `0x7FFF_00${hex(off)}`}
                      </text>
                    </g>
                  ))}
                </g>
              ))}
              <rect x={hx} y={hy} width={180} height={46} rx={6} fill={s.heap ? (s.heap.freed ? C.bad : C.purple) : C.fill} fillOpacity={s.heap ? 0.12 : 0.4} stroke={s.heap ? (s.heap.freed ? C.bad : C.purple) : C.border} strokeDasharray={s.heap?.freed || !s.heap ? "4 3" : undefined} />
              <text x={hx + 90} y={hy + 19} fontSize={11} textAnchor="middle" fill={s.heap ? C.fg : C.muted}>
                {s.heap ? (s.heap.freed ? "freed (do not touch!)" : `int = ${s.heap.val}`) : "(no allocations)"}
              </text>
              <text x={hx + 90} y={hy + 35} fontSize={10} textAnchor="middle" fill={C.muted}>{s.heap ? s.heap.addr : ""}</text>
              {s.heap && ptrY != null && (
                <path
                  d={`M ${x0 + fw} ${ptrY} C ${x0 + fw + 60} ${ptrY}, ${hx - 50} ${hy + 23}, ${hx - 2} ${hy + 23}`}
                  fill="none"
                  stroke={s.heap.freed ? C.bad : C.purple}
                  strokeWidth={2}
                  strokeDasharray={s.heap.freed ? "5 4" : undefined}
                  markerEnd="url(#mem-arrow)"
                />
              )}
            </svg>
          </Stage>
          <Legend items={[[C.active, "Active (top) frame"], [C.purple, "Heap block + pointer"], [C.bad, "Freed / dangling"]]} />
          <Narration tone={s.tone === "purple" ? "active" : s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={SH_CODE} active={s.line} maxHeight={260} />
          <VarTable
            title="Dry-run state"
            vars={[
              ["step", `${st.i + 1} / ${st.total}`],
              ["active function", boxes.at(-1)?.f.name ?? "—", "active"],
              ["stack frames", s.frames.length],
              ["RSP (approx.)", rsp ? "0x" + hex(rsp, 8).replace(/(....)$/, "_$1") : "—"],
              ["heap allocations", s.heap ? (s.heap.freed ? "0 (freed)" : "1 × 4 B") : 0, s.heap && !s.heap.freed ? "purple" : undefined],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

function ModeToggle({ mode, setMode }) {
  return (
    <ToggleGroup type="single" value={mode} onValueChange={(m) => m && setMode(m)}>
      <ToggleGroupItem value="trace">Trace sumOfSquares()</ToggleGroupItem>
      <ToggleGroupItem value="big">40 MB array: stack vs heap</ToggleGroupItem>
    </ToggleGroup>
  );
}

function MemoryVariant() {
  const [tab, setTab] = useState("ram");
  return (
    <LabShell
      title="RAM, Integer Overflow & Stack/Heap Explorer"
      description="See exactly which bytes a variable claims, watch a 32-bit integer wrap around, and step through stack frames being pushed and popped."
      badges={["sizeof", "two's complement", "stack vs heap"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ram">Byte boxes</TabsTrigger>
          <TabsTrigger value="ovf">Overflow odometer</TabsTrigger>
          <TabsTrigger value="stack">Stack vs heap</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "ram" && <RamInspector />}
      {tab === "ovf" && <OverflowSim />}
      {tab === "stack" && <StackHeapDebugger />}
    </LabShell>
  );
}

/* ================================================================== */
/* variant "pointers"                                                  */
/* ================================================================== */

const PTR_CODE = `int main() {
    int a = 5;
    int b = 9;
    int* p = &a;
    int& r = b;

    *p = *p + r;
    p = &b;
    *p = 20;
    r += a;
}`;

/** Chapter's 8-step dry run. p: "a" | "b" | null | undefined (uninitialised). */
function pointerTrace() {
  return [
    { line: 2, a: 5, b: undefined, p: undefined, r: false, note: "int a = 5; — a 4-byte box at 0x1000.", tone: "active" },
    { line: 3, a: 5, b: 9, p: undefined, r: false, note: "int b = 9; — the next box, at 0x1004.", tone: "active" },
    { line: 4, a: 5, b: 9, p: "a", r: false, note: "int* p = &a; — p is its own 8-byte box (0x2000) holding the ADDRESS 0x1000.", tone: "purple" },
    { line: 5, a: 5, b: 9, p: "a", r: true, note: "int& r = b; — no new box! r is just a second name stuck on b's box.", tone: "warn" },
    { line: 7, a: 14, b: 9, p: "a", r: true, changed: "a", note: "*p = *p + r; — follow p to a (5), add r (= b = 9), write 14 back into a.", tone: "ok" },
    { line: 8, a: 14, b: 9, p: "b", r: true, changed: "p", note: "p = &b; — no star, so we change p itself: the arrow now points at 0x1004.", tone: "purple" },
    { line: 9, a: 14, b: 20, p: "b", r: true, changed: "b", note: "*p = 20; — writes into 0x1004, so b AND r both read 20.", tone: "ok" },
    { line: 10, a: 14, b: 34, p: "b", r: true, changed: "b", note: "r += a; — r is b: 20 + 14 = 34. *p also sees 34, same box.", tone: "ok", done: true },
  ];
}

const PTR_OPS = [
  ["*p = *p + r", (s) => ({ deref: true, apply: () => ({ [s.p]: s[s.p] + s.b }) })],
  ["p = &a", () => ({ apply: () => ({ p: "a" }) })],
  ["p = &b", () => ({ apply: () => ({ p: "b" }) })],
  ["p = nullptr", () => ({ apply: () => ({ p: null }) })],
  ["*p = 20", (s) => ({ deref: true, apply: () => ({ [s.p]: 20 }) })],
  ["r += a", (s) => ({ apply: () => ({ b: s.b + s.a }) })],
];

function PointerCanvas({ s, crashed }) {
  const box = { a: [70, 40], b: [250, 40] };
  const pBox = [430, 150];
  const target = s.p === "a" || s.p === "b" ? box[s.p] : null;
  const val = (k) => (s[k] === undefined ? "?" : s[k]);
  const pv = s.p === undefined ? "?" : s.p === null ? "0x0" : s.p === "a" ? "0x1000" : "0x1004";
  return (
    <svg viewBox="0 0 600 240" className="w-full font-mono">
      <defs>
        <marker id="ptr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={crashed ? C.bad : C.purple} />
        </marker>
      </defs>
      {["a", "b"].map((k) => {
        const [x, y] = box[k];
        const hot = s.changed === k;
        return (
          <g key={k}>
            <rect x={x} y={y} width={130} height={60} rx={8} fill={hot ? C.ok : C.fill} fillOpacity={hot ? 0.15 : 0.7} stroke={hot ? C.ok : C.border} strokeWidth={hot ? 2 : 1} className="transition-all duration-300" />
            <text x={x + 65} y={y + 37} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.fg}>{val(k)}</text>
            <text x={x + 65} y={y + 78} textAnchor="middle" fontSize={11} fill={C.muted}>{k === "a" ? "0x1000" : "0x1004"}</text>
            <text x={x + 8} y={y + 16} fontSize={12} fontWeight={600} fill={C.fg}>int {k}</text>
          </g>
        );
      })}
      {s.r && (
        <g>
          <rect x={box.b[0] + 78} y={box.b[1] - 12} width={48} height={20} rx={5} fill={C.warn} fillOpacity={0.18} stroke={C.warn} />
          <text x={box.b[0] + 102} y={box.b[1] + 2} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.warn}>int& r</text>
        </g>
      )}
      {s.p !== undefined && (
        <g>
          <rect x={pBox[0]} y={pBox[1]} width={140} height={56} rx={8} fill={s.changed === "p" ? C.purple : C.fill} fillOpacity={s.changed === "p" ? 0.15 : 0.7} stroke={C.purple} strokeWidth={1.5} />
          <text x={pBox[0] + 8} y={pBox[1] + 16} fontSize={12} fontWeight={600} fill={C.fg}>int* p</text>
          <text x={pBox[0] + 70} y={pBox[1] + 40} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.purple}>{pv}</text>
          <text x={pBox[0] + 70} y={pBox[1] + 72} textAnchor="middle" fontSize={11} fill={C.muted}>0x2000 (8 bytes)</text>
          {target ? (
            <path
              d={`M ${pBox[0]} ${pBox[1] + 28} C ${pBox[0] - 90} ${pBox[1] + 28}, ${target[0] + 65} ${target[1] + 150}, ${target[0] + 65} ${target[1] + 86}`}
              fill="none" stroke={C.purple} strokeWidth={2.2} markerEnd="url(#ptr-arrow)" className="transition-all duration-300"
            />
          ) : s.p === null ? (
            <g>
              <path d={`M ${pBox[0] + 70} ${pBox[1] + 76} L ${pBox[0] + 70} 222`} stroke={crashed ? C.bad : C.muted} strokeWidth={2} />
              {[0, 1, 2].map((k) => (
                <line key={k} x1={pBox[0] + 70 - 16 + k * 5} x2={pBox[0] + 70 + 16 - k * 5} y1={224 + k * 5} y2={224 + k * 5} stroke={crashed ? C.bad : C.muted} strokeWidth={2} />
              ))}
              <text x={pBox[0] + 100} y={230} fontSize={11} fill={crashed ? C.bad : C.muted}>nullptr</text>
            </g>
          ) : null}
        </g>
      )}
    </svg>
  );
}

function PointerSandbox() {
  const [mode, setMode] = useState("trace");
  const steps = useMemo(pointerTrace, []);
  const st = useStepper(steps, { baseMs: 1300 });
  const init = { a: 5, b: 9, p: "a", r: true };
  const [box, setBox] = useState({ s: init, log: [], crashed: false, note: "Click a statement. Every * means “go to the box p points at”." });
  const [guard, setGuard] = useState(true);

  const run = ([label, fn]) => {
    if (box.crashed) return;
    const s = box.s;
    const op = fn(s);
    if (op.deref && s.p === null) {
      if (guard)
        return setBox((o) => ({ ...o, log: [...o.log, `if (p != nullptr) ${label};  // skipped`], note: `Guard caught it: p is nullptr, so “${label}” was skipped safely.` }));
      return setBox((o) => ({ ...o, crashed: true, log: [...o.log, `${label};  // CRASH`], note: `Segmentation fault! “${label}” dereferenced nullptr (address 0x0). The OS killed the program.` }));
    }
    const patch = op.apply();
    const changed = Object.keys(patch)[0];
    const ns = { ...s, ...patch, changed };
    const pointee = ns.p === null ? "nullptr" : `${ns.p} (${ns[ns.p]})`;
    setBox((o) => ({ ...o, s: ns, log: [...o.log, `${label};`], note: `${label} → ${changed === "p" ? `p now points at ${pointee}` : `${changed} = ${ns[changed]}${changed === "b" ? " (r is b, so r reads it too)" : ""}`}.` }));
  };

  const s = mode === "trace" ? st.step : box.s;
  const star = s.p === "a" || s.p === "b" ? s[s.p] : s.p === null ? "crash" : "—";

  return (
    <div className="space-y-3">
      <ToggleGroup type="single" value={mode} onValueChange={(m) => m && setMode(m)}>
        <ToggleGroupItem value="trace">Chapter dry-run</ToggleGroupItem>
        <ToggleGroupItem value="sandbox">Sandbox</ToggleGroupItem>
      </ToggleGroup>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <PointerCanvas s={s} crashed={mode === "sandbox" && box.crashed} />
          </Stage>
          {mode === "sandbox" && (
            <div className="flex flex-wrap gap-1.5">
              {PTR_OPS.map((op) => (
                <Button key={op[0]} size="xs" variant="outline" className="font-mono" onClick={() => run(op)} disabled={box.crashed}>
                  {op[0]}
                </Button>
              ))}
              <Button size="xs" variant="ghost" onClick={() => setBox({ s: init, log: [], crashed: false, note: "Reset to a = 5, b = 9, p = &a, r = b." })}>
                <RotateCcw /> Reset
              </Button>
            </div>
          )}
          <Narration tone={mode === "trace" ? (s.tone === "purple" ? "active" : s.tone) : box.crashed ? "bad" : "default"}>{mode === "trace" ? s.note : box.note}</Narration>
        </div>
        <div className="space-y-3">
          {mode === "trace" ? (
            <CodePanel code={PTR_CODE} active={s.line} />
          ) : (
            <Panel title="Statements run">
              <SwitchControl label="Null-safety guard" hint="if (p != nullptr) before every *p" checked={guard} onChange={setGuard} id="ptr-guard" />
              <ScrollArea className="h-28 rounded-md border bg-code">
                <div className="p-2 font-mono text-[12px]">
                  {box.log.length === 0 ? <span className="text-muted-foreground">(nothing yet)</span> : box.log.map((l, k) => <div key={k} className={l.includes("CRASH") ? "text-viz-bad" : ""}>{l}</div>)}
                </div>
              </ScrollArea>
            </Panel>
          )}
          <VarTable
            title="Box"
            vars={[
              ["a  @0x1000", s.a ?? "?", s.changed === "a" ? "ok" : undefined],
              ["b / r  @0x1004", s.b ?? "?", s.changed === "b" ? "ok" : undefined],
              ["p  @0x2000", s.p === undefined ? "?" : s.p === null ? "nullptr" : s.p === "a" ? "0x1000" : "0x1004", "purple"],
              ["*p", star, star === "crash" ? "bad" : "active"],
            ]}
          />
        </div>
      </Split>
      {mode === "trace" && <PlaybackBar stepper={st} />}
    </div>
  );
}

const ELEM_TYPES = {
  char: { size: 1, vals: ["'A'", "'B'", "'C'", "'D'", "'E'", "'F'"] },
  int: { size: 4, vals: [10, 20, 30, 40, 50, 60] },
  ll: { size: 8, label: "long long", vals: [100, 200, 300, 400, 500, 600] },
};

function PointerArithmetic() {
  const [t, setT] = useState("int");
  const [i, setI] = useState(2);
  const T = ELEM_TYPES[t];
  const W = 600, pad = 20, n = 6;
  const bw = (W - pad * 2) / (n * T.size);
  const ew = bw * T.size;
  const base = 0x1000;
  const target = base + i * T.size;
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <svg viewBox={`0 0 ${W} 170`} className="w-full font-mono">
            {T.vals.map((v, k) => {
              const x = pad + k * ew;
              const hot = k === i;
              return (
                <g key={k}>
                  <rect x={x + 1} y={50} width={ew - 2} height={44} rx={5} fill={hot ? C.active : C.fill} fillOpacity={hot ? 0.16 : 0.7} stroke={hot ? C.active : C.border} strokeWidth={hot ? 2 : 1} />
                  {Array.from({ length: T.size - 1 }, (_, b) => (
                    <line key={b} x1={x + (b + 1) * bw} x2={x + (b + 1) * bw} y1={86} y2={94} stroke={C.muted} opacity={0.6} />
                  ))}
                  <text x={x + ew / 2} y={77} textAnchor="middle" fontSize={13} fontWeight={600} fill={hot ? C.active : C.fg}>{v}</text>
                  <text x={x + ew / 2} y={112} textAnchor="middle" fontSize={10} fill={C.muted}>{addr(base + k * T.size)}</text>
                  <text x={x + ew / 2} y={40} textAnchor="middle" fontSize={10} fill={C.muted}>arr[{k}]</text>
                </g>
              );
            })}
            <g>
              <text x={pad + ew / 2} y={138} textAnchor="middle" fontSize={11} fill={C.purple} fontWeight={600}>ptr</text>
              <path d={`M ${pad + ew / 2} 126 L ${pad + ew / 2} 116`} stroke={C.purple} strokeWidth={2} />
              {i > 0 && (
                <>
                  <path d={`M ${pad + ew / 2} 150 L ${pad + i * ew + ew / 2} 150`} stroke={C.active} strokeWidth={1.5} strokeDasharray="4 3" />
                  <text x={pad + (i * ew) / 2 + ew / 2} y={164} textAnchor="middle" fontSize={10} fill={C.active}>+{i} × {T.size} = +{i * T.size} bytes</text>
                </>
              )}
              <text x={pad + i * ew + ew / 2} y={20} textAnchor="middle" fontSize={11} fill={C.active} fontWeight={600}>*(ptr + {i})</text>
            </g>
          </svg>
        </Stage>
        <Narration tone="active">
          ptr + {i} does not add {i} bytes — it adds {i} × sizeof({T.label ?? t}) = {i * T.size} bytes, landing exactly on arr[{i}] at {addr(target)}. That's why arr[{i}] is
          literally *(arr + {i}).
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Pointer arithmetic">
          <Select value={t} onValueChange={setT}>
            <SelectTrigger className="w-full font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="char">char (1 B)</SelectItem>
              <SelectItem value="int">int (4 B)</SelectItem>
              <SelectItem value="ll">long long / double (8 B)</SelectItem>
            </SelectContent>
          </Select>
          <SliderControl label="offset i in *(ptr + i)" value={i} min={0} max={5} onChange={setI} />
        </Panel>
        <VarTable
          vars={[
            ["ptr", addr(base), "purple"],
            ["sizeof(T)", T.size],
            ["ptr + i", `${addr(base)} + ${i * T.size} = ${addr(target)}`, "active"],
            ["*(ptr + i)", T.vals[i], "ok"],
          ]}
        />
      </div>
    </Split>
  );
}

const PASS_MODES = {
  value: { sig: "void process(vector<int> v)", label: "Pass-by-value (photocopy)" },
  ref: { sig: "void process(vector<int>& v)", label: "Pass-by-reference (alias)" },
  cref: { sig: "void process(const vector<int>& v)", label: "Pass-by-const-reference" },
};

function PassCost() {
  const [m, setM] = useState("value");
  const [k, setK] = useState(6);
  const [res, setRes] = useState(null);
  const N = Math.round(10 ** k);
  const bytes = m === "value" ? N * 4 : 0;
  const fmtB = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(1)} KB` : `${b} B`);
  const attempt = () =>
    setRes(
      m === "cref"
        ? { tone: "bad", text: "Compile error: assignment of read-only location. const T& is a read-only alias — the compiler shields the caller's data." }
        : m === "ref"
          ? { tone: "warn", text: "v[0] = 999 wrote straight into main's vector (same heap buffer). The caller sees 999." }
          : { tone: "default", text: "v[0] = 999 changed only the photocopy. main's vector still has its old v[0]; the copy is destroyed at '}'." }
    );
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <svg viewBox="0 0 600 190" className="w-full font-mono">
            <defs>
              <marker id="pass-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
              </marker>
            </defs>
            <rect x={14} y={20} width={180} height={56} rx={7} fill={C.fill} stroke={C.border} />
            <text x={24} y={38} fontSize={11} fontWeight={600} fill={C.fg}>main(): vector v</text>
            <text x={24} y={58} fontSize={10} fill={C.muted}>24-byte header</text>
            <rect x={14} y={110} width={180} height={56} rx={7} fill={C.active} fillOpacity={0.1} stroke={C.active} />
            <text x={24} y={128} fontSize={11} fontWeight={600} fill={C.fg}>process(): {m === "value" ? "vector v" : m === "ref" ? "vector& v" : "const vector& v"}</text>
            <text x={24} y={148} fontSize={10} fill={C.muted}>{m === "value" ? "its own 24-byte header" : "just an alias (8 B address)"}</text>
            <rect x={330} y={22} width={250} height={50} rx={7} fill={C.purple} fillOpacity={0.12} stroke={C.purple} />
            <text x={455} y={44} textAnchor="middle" fontSize={11} fill={C.fg}>heap: {N.toLocaleString()} ints</text>
            <text x={455} y={60} textAnchor="middle" fontSize={10} fill={C.muted}>{fmtB(N * 4)}</text>
            <path d="M 194 48 L 328 48" stroke={C.purple} strokeWidth={1.8} markerEnd="url(#pass-arrow)" />
            {m === "value" ? (
              <>
                <rect x={330} y={112} width={250} height={50} rx={7} fill={C.bad} fillOpacity={0.12} stroke={C.bad} />
                <text x={455} y={134} textAnchor="middle" fontSize={11} fill={C.fg}>heap: COPY of all {N.toLocaleString()}</text>
                <text x={455} y={150} textAnchor="middle" fontSize={10} fill={C.bad}>{fmtB(bytes)} copied — O(N)</text>
                <path d="M 194 138 L 328 138" stroke={C.purple} strokeWidth={1.8} markerEnd="url(#pass-arrow)" />
              </>
            ) : (
              <path d="M 104 110 L 104 78" stroke={C.ok} strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#pass-arrow)" />
            )}
            {m === "cref" && <text x={114} y={98} fontSize={11} fill={C.ok}>const: read-only</text>}
          </svg>
        </Stage>
        <div className="flex flex-wrap gap-2">
          {m === "value" ? <Badge variant="danger">{fmtB(bytes)} copied — O(N) time</Badge> : <Badge variant="success">0 bytes copied — O(1) time</Badge>}
        </div>
        {res && <Narration tone={res.tone}>{res.text}</Narration>}
      </div>
      <div className="space-y-3">
        <Panel title="Function signature">
          <Select value={m} onValueChange={(v) => { setM(v); setRes(null); }}>
            <SelectTrigger className="w-full text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PASS_MODES).map(([key, x]) => (
                <SelectItem key={key} value={key}>{x.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-md bg-code px-2 py-1.5 font-mono text-[12px]">{PASS_MODES[m].sig}</div>
          <SliderControl label="vector size N" value={k} min={1} max={6} step={0.5} onChange={setK} format={() => N.toLocaleString()} />
          <Button size="sm" variant="outline" onClick={attempt} className="w-full font-mono">Attempt v[0] = 999 inside</Button>
        </Panel>
        <StatGrid cols={2}>
          <Stat label="bytes copied" value={fmtB(bytes)} tone={bytes ? "bad" : "ok"} />
          <Stat label="called 10⁵ times" value={bytes ? `${fmtB(bytes * 1e5)}` : "0 B"} tone={bytes ? "bad" : "ok"} hint="Calling inside a loop multiplies the copy cost — the classic silent TLE." />
        </StatGrid>
      </div>
    </Split>
  );
}

function PointersVariant() {
  const [tab, setTab] = useState("sandbox");
  return (
    <LabShell
      title="Pointer Arrow Lab"
      description="Boxes, addresses and arrows: & takes an address, * follows it, and a reference is a second name on the same box."
      badges={["int* p = &x", "int& r = x", "ptr + i"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sandbox">* and & sandbox</TabsTrigger>
          <TabsTrigger value="arith">Pointer arithmetic</TabsTrigger>
          <TabsTrigger value="pass">Value vs reference</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "sandbox" && <PointerSandbox />}
      {tab === "arith" && <PointerArithmetic />}
      {tab === "pass" && <PassCost />}
    </LabShell>
  );
}

/* ================================================================== */
/* variant "raii"                                                      */
/* ================================================================== */

const SCOPE_CODE = `struct Tracer {
    string name;
    Tracer(string n) : name(n) { cout << "ctor " << name << "\\n"; }
    ~Tracer() { cout << "dtor " << name << "\\n"; }
};

int main() {
    Tracer a("A");
    {                           // scope 1
        Tracer b("B");
        {                       // scope 2
            Tracer c("C");
            if (fail) return 1; // early exit?
        }                       // ~C
        Tracer d("D");
    }                           // ~D, then ~B
    return 0;
}                               // ~A`;

/**
 * Lifecycle trace. objs: { name: "alive"|"dying"|"dead" } (absent = not yet built).
 * scopes: depth of open braces (0 = main body only).
 */
function scopeSteps(fail) {
  const s = [];
  const objs = {};
  const log = [];
  const push = (line, depth, note, tone = "default", extra = {}) => s.push({ line, depth, objs: { ...objs }, log: [...log], note, tone, ...extra });
  const ctor = (n) => { objs[n] = "alive"; log.push(`ctor ${n}`); };
  const dtor = (n) => { objs[n] = "dying"; log.push(`dtor ${n}`); };
  const settle = () => Object.keys(objs).forEach((k) => objs[k] === "dying" && (objs[k] = "dead"));

  push(7, 0, "main() starts. Nothing constructed yet.", "default");
  ctor("A"); push([8, 3], 0, "Tracer a(\"A\") — the constructor runs the instant a is born.", "ok");
  push(9, 1, "Enter scope 1 ({).", "active");
  ctor("B"); push([10, 3], 1, "b is constructed inside scope 1.", "ok");
  push(11, 2, "Enter scope 2 ({).", "active");
  ctor("C"); push([12, 3], 2, "c is constructed inside scope 2.", "ok");
  if (fail) {
    push(13, 2, "fail is true → return 1; Leaving early does NOT skip cleanup: C++ unwinds every live object, newest first.", "warn");
    dtor("C"); push([13, 4], 2, "~C runs (scope 2 is being left).", "bad");
    settle(); dtor("B"); push([13, 4], 1, "~B runs (scope 1 is being left). d was never constructed, so it is never destroyed.", "bad");
    settle(); dtor("A"); push([13, 4], 0, "~A runs as main's frame unwinds.", "bad");
    settle(); push(13, 0, "Every constructed object got exactly one destructor call — even on an early return. That guarantee is RAII.", "ok", { done: true });
    return s;
  }
  push(13, 2, "fail is false — keep going.", "default");
  dtor("C"); push([14, 4], 2, "Closing } of scope 2: ~C runs automatically.", "bad");
  settle(); ctor("D"); push([15, 3], 1, "d is constructed (after c already died).", "ok");
  dtor("D"); push([16, 4], 1, "Closing } of scope 1: objects die in REVERSE order of construction — ~D first…", "bad");
  settle(); dtor("B"); push([16, 4], 1, "…then ~B.", "bad");
  settle(); push(17, 0, "return 0;", "default");
  dtor("A"); push([18, 4], 0, "main's closing }: ~A runs last because it was built first.", "bad");
  settle(); push(18, 0, "Output order: ctor A, ctor B, ctor C, dtor C, ctor D, dtor D, dtor B, dtor A.", "ok", { done: true });
  return s;
}

function ObjChip({ name, state }) {
  if (!state) return <span className="rounded-md border border-dashed px-2 py-0.5 font-mono text-[12px] text-muted-foreground/60">{name.toLowerCase()} (not yet)</span>;
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 font-mono text-[12px] font-semibold transition-all",
        state === "alive" && "border-viz-ok bg-viz-ok/15 text-viz-ok",
        state === "dying" && "border-viz-bad bg-viz-bad/15 text-viz-bad",
        state === "dead" && "text-muted-foreground line-through opacity-50"
      )}
    >
      Tracer {name.toLowerCase()}
    </span>
  );
}

function ScopeBox({ label, open, children }) {
  return (
    <div className={cn("space-y-2 rounded-lg border p-2.5 transition-colors", open ? "border-viz-active/60 bg-viz-active/5" : "border-dashed opacity-60")}>
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ScopeLab() {
  const [fail, setFail] = useState(false);
  const steps = useMemo(() => scopeSteps(fail), [fail]);
  const st = useStepper(steps, { baseMs: 1000 });
  const s = st.step;
  return (
    <div className="space-y-3">
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ScopeBox label="main() {" open>
              <div className="flex flex-wrap gap-2"><ObjChip name="A" state={s.objs.A} /></div>
              <ScopeBox label="{ // scope 1" open={s.depth >= 1}>
                <div className="flex flex-wrap gap-2"><ObjChip name="B" state={s.objs.B} /><ObjChip name="D" state={s.objs.D} /></div>
                <ScopeBox label="{ // scope 2" open={s.depth >= 2}>
                  <div className="flex flex-wrap gap-2"><ObjChip name="C" state={s.objs.C} /></div>
                </ScopeBox>
              </ScopeBox>
            </ScopeBox>
          </Stage>
          <Legend items={[[C.ok, "Alive (constructed)"], [C.bad, "Destructor running"], [C.active, "Open scope"]]} />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <SwitchControl label="fail = true (early return inside scope 2)" checked={fail} onChange={setFail} id="raii-fail" />
          <CodePanel code={SCOPE_CODE} active={s.line} maxHeight={250} />
          <Panel title="Console output">
            <div className="min-h-16 font-mono text-[12px] leading-relaxed">
              {s.log.map((l, k) => (
                <div key={k} className={cn(l.startsWith("dtor") ? "text-viz-bad" : "text-viz-ok", k === s.log.length - 1 && "font-semibold")}>{l}</div>
              ))}
            </div>
          </Panel>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

const SMART = {
  raw: {
    label: "Raw new / delete",
    code: `void process(bool error) {
    int* p = new int(42);
    *p += 1;
    if (error) return;       // early exit!
    delete p;
}`,
  },
  unique: {
    label: "unique_ptr",
    code: `void process(bool error) {
    auto p = make_unique<int>(42);
    *p += 1;
    if (error) return;       // early exit!
    // no delete needed
}                            // ~unique_ptr() frees`,
  },
  move: {
    label: "Ownership move",
    code: `int main() {
    {
        auto arm = make_unique<RobotArm>(6);
        auto arm2 = std::move(arm);
        // auto arm3 = arm2;  // compile error: no copies
        if (!arm) cout << "arm is empty\\n";
    }   // ~arm2 → ~RobotArm(); ~arm frees nothing
}`,
  },
};

/** vars: [{name, target: heapId|null}]; heap: { id: { label, state: "live"|"freed"|"leaked" } } */
function smartSteps(kind, error) {
  const s = [];
  const push = (line, vars, heap, note, tone = "default", done) => s.push({ line, vars, heap, note, tone, done });
  if (kind === "move") {
    const H = (st) => ({ h: { label: "RobotArm(6)", state: st } });
    push(2, [], {}, "Enter the inner scope.", "default");
    push(3, [{ name: "arm", t: "h" }], H("live"), "make_unique allocates a RobotArm on the heap. arm is the ONE owner.", "ok");
    push(4, [{ name: "arm", t: null }, { name: "arm2", t: "h" }], H("live"), "std::move transfers ownership: arm2 now owns the arm, arm is set to nullptr. Still exactly one owner.", "active");
    push(5, [{ name: "arm", t: null }, { name: "arm2", t: "h" }], H("live"), "Copying would create two owners → two deletes. unique_ptr's copy constructor is deleted, so this line would not compile.", "warn");
    push(6, [{ name: "arm", t: null }, { name: "arm2", t: "h" }], H("live"), "!arm is true — the moved-from pointer is empty. Prints \"arm is empty\".", "default");
    push(7, [], H("freed"), "Scope ends: ~arm2 deletes the RobotArm (destructor prints \"powered down\"). ~arm sees nullptr and does nothing. Freed exactly once.", "ok", true);
    return s;
  }
  const raw = kind === "raw";
  const H = (st, v = 42) => ({ h: { label: `int = ${v}`, state: st } });
  push(1, [], {}, `process(${error}) is called; its frame is pushed.`, "default");
  push(2, [{ name: "p", t: "h" }], H("live"), raw ? "new int(42) allocates on the heap; p is a raw pointer that does NOT own anything automatically." : "make_unique<int>(42) allocates and hands the block to p, a unique_ptr that owns it.", "active");
  push(3, [{ name: "p", t: "h" }], H("live", 43), "*p += 1 → the heap int is now 43.", "active");
  if (error) {
    push(4, [{ name: "p", t: "h" }], H("live", 43), "error is true → return early!", "warn");
    if (raw) push(4, [], H("leaked", 43), "p is popped with the frame, but nobody called delete. The heap block is orphaned: MEMORY LEAK.", "bad", true);
    else push(4, [], H("freed", 43), "Stack unwinding runs ~unique_ptr() for p, which deletes the block. 0 bytes leaked.", "ok", true);
    return s;
  }
  push(4, [{ name: "p", t: "h" }], H("live", 43), "error is false — keep going.", "default");
  if (raw) {
    push(5, [{ name: "p", t: "h" }], H("freed", 43), "delete p frees the block — only because we remembered to and actually reached this line.", "ok");
    push(6, [], H("freed", 43), "Function returns. Clean this time, but one early return or exception would leak.", "ok", true);
  } else push(6, [], H("freed", 43), "Closing }: ~unique_ptr() deletes the block. No delete written anywhere.", "ok", true);
  return s;
}

function SmartLab() {
  const [kind, setKind] = useState("raw");
  const [error, setError] = useState(true);
  const steps = useMemo(() => smartSteps(kind, error), [kind, error]);
  const st = useStepper(steps, { baseMs: 1300 });
  const s = st.step;
  const heap = Object.entries(s.heap);
  const hcol = (state) => (state === "live" ? C.purple : state === "leaked" ? C.bad : C.muted);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={kind} onValueChange={(v) => v && setKind(v)}>
          {Object.entries(SMART).map(([k, x]) => (
            <ToggleGroupItem key={k} value={k}>{x.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        {kind !== "move" && (
          <div className="w-64">
            <SwitchControl label="Trigger early return (error = true)" checked={error} onChange={setError} id="smart-err" />
          </div>
        )}
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox="0 0 600 180" className="w-full font-mono">
              <defs>
                <marker id="raii-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
                </marker>
              </defs>
              <text x={16} y={18} fontSize={11} fill={C.muted}>STACK</text>
              <text x={360} y={18} fontSize={11} fill={C.muted}>HEAP</text>
              {s.vars.length === 0 && <text x={16} y={50} fontSize={11} fill={C.muted}>(no live variables)</text>}
              {s.vars.map((v, k) => {
                const y = 30 + k * 62;
                return (
                  <g key={v.name}>
                    <rect x={16} y={y} width={200} height={48} rx={7} fill={C.fill} stroke={C.border} />
                    <text x={26} y={y + 19} fontSize={11} fontWeight={600} fill={C.fg}>{kind === "raw" ? "int* " : "unique_ptr "}{v.name}</text>
                    <text x={26} y={y + 37} fontSize={11} fill={v.t ? C.purple : C.muted}>{v.t ? "0x5500_0040" : "nullptr"}</text>
                    {v.t && <path d={`M 216 ${y + 24} C 290 ${y + 24}, 290 70, 358 70`} fill="none" stroke={C.purple} strokeWidth={2} markerEnd="url(#raii-arrow)" />}
                  </g>
                );
              })}
              {heap.map(([id, h]) => (
                <g key={id}>
                  <rect x={360} y={46} width={220} height={48} rx={7} fill={hcol(h.state)} fillOpacity={0.12} stroke={hcol(h.state)} strokeDasharray={h.state === "freed" ? "4 3" : undefined} strokeWidth={h.state === "leaked" ? 2 : 1.2} />
                  <text x={470} y={67} textAnchor="middle" fontSize={11} fill={C.fg}>{h.label}</text>
                  <text x={470} y={84} textAnchor="middle" fontSize={10} fill={hcol(h.state)}>{h.state === "live" ? "0x5500_0040" : h.state === "leaked" ? "unreachable!" : "freed"}</text>
                </g>
              ))}
            </svg>
          </Stage>
          <div className="flex gap-2">
            {heap.some(([, h]) => h.state === "leaked") && <Badge variant="danger">MEMORY LEAK!</Badge>}
            {s.done && heap.every(([, h]) => h.state === "freed") && <Badge variant="success">0 bytes leaked (RAII)</Badge>}
          </div>
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={SMART[kind].code} active={s.line} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>On early return</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className={cn(kind === "raw" && "bg-viz-bad/8")}>
                <TableCell className="py-1.5 font-mono text-[12.5px]">int* p = new int</TableCell>
                <TableCell className="py-1.5 text-right text-[12.5px] text-viz-bad">leaks</TableCell>
              </TableRow>
              <TableRow className={cn(kind !== "raw" && "bg-viz-ok/8")}>
                <TableCell className="py-1.5 font-mono text-[12.5px]">unique_ptr&lt;int&gt;</TableCell>
                <TableCell className="py-1.5 text-right text-[12.5px] text-viz-ok">auto-freed</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

function RaiiVariant() {
  const [tab, setTab] = useState("scope");
  return (
    <LabShell
      title="RAII Lifecycle Visualizer"
      description="Constructors run at birth, destructors run at the closing brace — in reverse order, on every exit path. Smart pointers turn that guarantee into leak-free heap code."
      badges={["constructor / destructor", "RAII", "unique_ptr"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scope">Nested scopes</TabsTrigger>
          <TabsTrigger value="smart">Raw new vs unique_ptr</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "scope" ? <ScopeLab /> : <SmartLab />}
    </LabShell>
  );
}

export default function MemoryLab({ variant = "memory" }) {
  if (variant === "pointers") return <PointersVariant />;
  if (variant === "raii") return <RaiiVariant />;
  return <MemoryVariant />;
}
