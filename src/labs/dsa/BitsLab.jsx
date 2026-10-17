import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ---------- algorithm traces (pure) ---------- */

const maskOf = (w) => (w === 32 ? 0xffffffff : (1 << w) - 1);
const u = (v, w) => ((v & maskOf(w)) >>> 0);
const toSigned = (v, w) => (v >= 2 ** (w - 1) ? v - 2 ** w : v);
const bin = (v, w) => v.toString(2).padStart(w, "0");
const lowBit = (v) => (v === 0 ? -1 : Math.log2((v & -v) >>> 0));

function applyOp(op, a, b, k, w, signed) {
  switch (op) {
    case "&":
      return u(a & b, w);
    case "|":
      return u(a | b, w);
    case "^":
      return u(a ^ b, w);
    case "~":
      return u(~a, w);
    case "<<":
      return u(a << k, w);
    default:
      return signed ? u(toSigned(a, w) >> k, w) : (a >>> k) & maskOf(w);
  }
}

function popSteps(n, w) {
  const s = [];
  let x = n, count = 0;
  s.push({ n: x, count, line: [2], note: `count = 0. Each loop iteration erases exactly one 1-bit.`, tone: "active" });
  while (x) {
    const m1 = u(x - 1, w), nx = u(x & m1, w);
    s.push({ n: x, m1, res: nx, count, cleared: lowBit(x), line: [3, 4], note: `n − 1 flips the lowest 1 (bit ${lowBit(x)}) and the 0s below it. n & (n−1) = ${nx}: that bit is gone.`, tone: "active" });
    x = nx;
    count++;
    s.push({ n: x, count, line: 5, note: `count = ${count}. n is now ${x}${x ? "" : " → loop ends"}.`, tone: x ? "default" : "ok" });
  }
  s.push({ n: 0, count, done: true, line: 7, note: `popcount(${n}) = ${count}. The loop ran once per set bit, not once per bit position.`, tone: "ok" });
  return s;
}

function xorSteps(nums, w) {
  const s = [];
  let res = 0;
  s.push({ i: -1, res, line: 2, note: `res = 0 (XOR identity: x ^ 0 = x).`, tone: "active" });
  nums.forEach((num, i) => {
    const before = res;
    res = u(res ^ num, w);
    s.push({ i, num, before, res, line: 4, note: `res = ${before} ^ ${num} = ${res}.` + (nums.indexOf(num) !== i ? ` ${num} appeared before — its bits cancel (a ^ a = 0).` : ""), tone: "active" });
  });
  s.push({ i: nums.length, res, done: true, line: 5, note: `Every pair cancelled; the lone survivor is ${res}. O(N) time, O(1) space.`, tone: "ok" });
  return s;
}

/* ---------- rendering ---------- */

/** One row of bits, MSB on the left, grouped by byte. tone(i) → class; onToggle(i) makes it clickable. */
function BitRow({ label, value, w, tone, onToggle, sub }) {
  const bits = Array.from({ length: w }, (_, k) => w - 1 - k);
  const bytes = [];
  for (let k = 0; k < w; k += 8) bytes.push(bits.slice(k, k + 8));
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
      <div className="w-16 shrink-0 pt-1 font-mono text-[12px] font-semibold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {bytes.map((byte, bk) => (
          <div key={bk} className="flex gap-[3px]">
            {byte.map((i) => {
              const on = (value >>> i) & 1;
              const t = tone?.(i, on);
              const cls = cn(
                "flex h-7 w-[19px] items-center justify-center rounded border font-mono text-[12.5px] font-semibold tabular-nums transition-colors",
                on ? "border-foreground/30 bg-muted text-foreground" : "bg-card text-muted-foreground/60",
                t === "ok" && "border-viz-ok bg-viz-ok/20 text-viz-ok",
                t === "bad" && "border-viz-bad bg-viz-bad/15 text-viz-bad",
                t === "warn" && "border-viz-warn bg-viz-warn/15 text-viz-warn",
                t === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
                t === "purple" && "border-viz-purple bg-viz-purple/15 text-viz-purple",
                i % 4 === 0 && i !== 0 && "mr-[3px]"
              );
              return onToggle ? (
                <button key={i} type="button" className={cn(cls, "cursor-pointer hover:border-viz-active")} onClick={() => onToggle(i)} aria-label={`Toggle bit ${i}`}>
                  {on}
                </button>
              ) : (
                <span key={i} className={cls}>
                  {on}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {sub && <div className="pt-1 font-mono text-[12px] tabular-nums text-muted-foreground">{sub}</div>}
    </div>
  );
}

function NumInput({ value, w, signed, onChange, label }) {
  const [text, setText] = useState(null);
  const shown = text ?? String(signed ? toSigned(value, w) : value);
  return (
    <input
      aria-label={label}
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        const x = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(x)) onChange(u(Math.trunc(x), w));
      }}
      onBlur={() => setText(null)}
      className="h-8 w-28 rounded-md border border-input bg-card px-2 font-mono text-[13px]"
    />
  );
}

const OPS = ["&", "|", "^", "~", "<<", ">>"];
const OP_CODE = `int a = 13, b = 7;
a & b     // 1 only where BOTH bits are 1
a | b     // 1 where EITHER bit is 1
a ^ b     // 1 where the bits DIFFER
~a        // flip every bit  (~a == -a - 1)
a << k    // shift left:  a * 2^k
a >> k    // shift right: floor(a / 2^k), sign bit copied for negatives`;
const OP_LINE = { "&": 2, "|": 3, "^": 4, "~": 5, "<<": 6, ">>": 7 };

const TRICK_CODE = {
  clear: `int clearLowest(int n) {
    return n & (n - 1);    // n-1 flips lowest 1 and the 0s below it
}`,
  lowbit: `int lowestBit(int n) {
    return n & (-n);       // -n == ~n + 1 (two's complement)
}`,
  pop: `int countSetBits(int n) {
    int count = 0;
    while (n) {
        n = n & (n - 1);   // clears the lowest 1 bit
        count++;
    }
    return count;
}`,
  pow2: `bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}`,
  single: `int singleNumber(vector<int>& nums) {
    int res = 0;
    for (int num : nums)
        res ^= num;        // pairs cancel: a ^ a = 0
    return res;
}`,
};

export default function BitsLab() {
  const [w, setW] = useState(8);
  const [a, setA] = useState(13);
  const [b, setB] = useState(7);
  const [k, setK] = useState(2);
  const [op, setOp] = useState("&");
  const [signed, setSigned] = useState(true);
  const [trick, setTrick] = useState("clear");
  const [nums, setNums] = useState([4, 1, 2, 1, 2]);

  const changeW = (v) => {
    if (!v) return;
    const nw = Number(v);
    setW(nw);
    setA((x) => u(x, nw));
    setB((x) => u(x, nw));
    setK((x) => Math.min(x, nw - 1));
  };
  const res = applyOp(op, a, b, k, w, signed);
  const dec = (v) => (signed ? toSigned(v, w) : v);
  const hex = (v) => "0x" + v.toString(16).toUpperCase().padStart(w / 4, "0");
  const unary = op === "~";
  const shift = op === "<<" || op === ">>";

  // trick steppers (always mounted so hook order is stable)
  const popS = useMemo(() => popSteps(a, w), [a, w]);
  const xorS = useMemo(() => xorSteps(nums, w), [nums, w]);
  const popSt = useStepper(popS, { baseMs: 1000 });
  const xorSt = useStepper(xorS, { baseMs: 900 });

  const resTone = (i, on) => {
    if (shift) {
      const filled = op === "<<" ? i < k : i >= w - k;
      if (filled && k > 0) return "warn";
    }
    return on ? "ok" : undefined;
  };

  const n = a, nm1 = u(a - 1, w), neg = u(-a, w), notA = u(~a, w);
  const lb = lowBit(a);
  const isPow2 = (signed ? toSigned(a, w) > 0 : a > 0) && u(a & nm1, w) === 0;

  return (
    <LabShell
      title="Bit Manipulation Playground"
      description="Click bits to edit the operands, pick an operator, and watch every column. Then try the classic tricks: Kernighan's n & (n−1), lowest-bit isolation n & −n, power-of-two checks and the XOR single-number cancel."
      badges={["O(1) per op", "two's complement"]}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={String(w)} onValueChange={changeW} aria-label="Bit width">
          {[8, 16, 32].map((x) => (
            <ToggleGroupItem key={x} value={String(x)}>
              {x}-bit
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Tabs value={op} onValueChange={setOp} className="max-w-full">
          <TabsList>
            {OPS.map((o) => (
              <TabsTrigger key={o} value={o} className="w-11 font-mono">
                {o}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="w-60">
          <SwitchControl label="Signed (two's complement)" hint="affects decimals and >> fill" checked={signed} onChange={setSigned} id="bits-signed" />
        </div>
      </div>

      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="space-y-2 p-3">
            <BitRow label="a" value={a} w={w} onToggle={(i) => setA(u(a ^ (1 << i), w))} sub={`= ${dec(a)}`} />
            {!unary &&
              (shift ? (
                <div className="flex items-center gap-3 pl-[76px] font-mono text-[12.5px] text-muted-foreground">
                  shift by k = {k}
                </div>
              ) : (
                <BitRow label="b" value={b} w={w} onToggle={(i) => setB(u(b ^ (1 << i), w))} sub={`= ${dec(b)}`} />
              ))}
            <div className="ml-[76px] border-t border-dashed" />
            <BitRow label={unary ? "~a" : shift ? `a ${op} ${k}` : `a ${op} b`} value={res} w={w} tone={resTone} sub={`= ${dec(res)}`} />
            <div className="flex flex-wrap gap-x-3 pl-[76px] font-mono text-[10.5px] text-muted-foreground">
              <span>bit {w - 1} (MSB{signed ? " = sign" : ""})</span>
              <span>…</span>
              <span>bit 0 (LSB)</span>
            </div>
          </Stage>
          <Legend items={[[C.ok, "Result bit = 1"], ...(shift ? [[C.warn, op === "<<" ? "Zero-filled" : signed ? "Sign-filled" : "Zero-filled"]] : [])]} />
          <Narration tone="active">
            {op === "&" && "AND keeps a 1 only in columns where both a and b have a 1 — use it to test or clear bits (masking)."}
            {op === "|" && "OR sets a 1 wherever either operand has one — use it to set bits."}
            {op === "^" && "XOR is 1 where the bits differ. x ^ x = 0 and x ^ 0 = x — the basis of the single-number trick."}
            {op === "~" && `NOT flips every bit. In two's complement ~a = −a − 1, so ~${dec(a)} = ${dec(res)}.`}
            {op === "<<" && `Shifting left by ${k} multiplies by 2^${k} = ${2 ** k} (bits pushed past bit ${w - 1} are lost).`}
            {op === ">>" && (signed ? `Arithmetic right shift: divides by 2^${k} rounding down; the sign bit is copied into the vacated high bits.` : `Logical right shift: divides by 2^${k} rounding down; zeros fill the high bits.`)}
          </Narration>
        </div>
        <div className="min-w-0 space-y-3">
          <Panel title="Operands">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-4 font-mono text-[12.5px] font-semibold">a</span>
              <NumInput key={`a${w}${signed}`} value={a} w={w} signed={signed} onChange={setA} label="a decimal" />
              <Button size="xs" variant="outline" onClick={() => setA(u(-a, w))}>
                −a
              </Button>
              <Button size="xs" variant="outline" onClick={() => setA(Math.floor(Math.random() * 2 ** Math.min(w, 16)))}>
                <Shuffle />
              </Button>
            </div>
            {!unary && !shift && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-4 font-mono text-[12.5px] font-semibold">b</span>
                <NumInput key={`b${w}${signed}`} value={b} w={w} signed={signed} onChange={setB} label="b decimal" />
                <Button size="xs" variant="outline" onClick={() => setB(u(-b, w))}>
                  −b
                </Button>
                <Button size="xs" variant="outline" onClick={() => setB(Math.floor(Math.random() * 2 ** Math.min(w, 16)))}>
                  <Shuffle />
                </Button>
              </div>
            )}
            {shift && <SliderControl label="shift amount k" value={k} min={0} max={w - 1} onChange={setK} />}
          </Panel>
          <VarTable
            title="Result"
            vars={[
              ["unsigned", res, "ok"],
              ["signed", toSigned(res, w)],
              ["hex", hex(res)],
              ["a signed / unsigned", `${toSigned(a, w)} / ${a}`, "active"],
            ]}
          />
          <CodePanel code={OP_CODE} active={OP_LINE[op]} />
        </div>
      </Split>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tricks (using n = a = {dec(a)})</div>
          <Tabs value={trick} onValueChange={setTrick} className="max-w-full">
            <TabsList>
              <TabsTrigger value="clear">n & (n−1)</TabsTrigger>
              <TabsTrigger value="lowbit">n & −n</TabsTrigger>
              <TabsTrigger value="pop">popcount</TabsTrigger>
              <TabsTrigger value="pow2">power of 2?</TabsTrigger>
              <TabsTrigger value="single">single number</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Split>
          <div className="min-w-0 space-y-2">
            {trick === "clear" && (
              <Stage className="space-y-2 p-3">
                <BitRow label="n" value={n} w={w} tone={(i) => (i === lb ? "active" : undefined)} sub={`= ${dec(n)}`} />
                <BitRow label="n − 1" value={nm1} w={w} tone={(i) => (lb >= 0 && i <= lb ? "warn" : undefined)} sub={`= ${dec(nm1)}`} />
                <BitRow label="n&(n−1)" value={u(n & nm1, w)} w={w} tone={(i, on) => (i === lb ? "bad" : on ? "ok" : undefined)} sub={`= ${dec(u(n & nm1, w))}`} />
                <Narration tone={lb >= 0 ? "ok" : "warn"}>
                  {lb >= 0 ? `Subtracting 1 flips bit ${lb} (the lowest 1) and every 0 below it. ANDing with n wipes exactly that bit: ${dec(n)} → ${dec(u(n & nm1, w))}.` : "n = 0 has no set bit — n − 1 is all ones and the AND is 0."}
                </Narration>
              </Stage>
            )}
            {trick === "lowbit" && (
              <Stage className="space-y-2 p-3">
                <BitRow label="n" value={n} w={w} tone={(i) => (i === lb ? "active" : undefined)} sub={`= ${dec(n)}`} />
                <BitRow label="~n" value={notA} w={w} sub={`= ${dec(notA)}`} />
                <BitRow label="−n=~n+1" value={neg} w={w} tone={(i) => (i === lb ? "active" : undefined)} sub={`= ${dec(neg)}`} />
                <BitRow label="n & −n" value={u(n & neg, w)} w={w} tone={(i, on) => (on ? "ok" : undefined)} sub={`= ${u(n & neg, w)}`} />
                <Narration tone="ok">
                  Two's complement: −n is ~n + 1. The +1 ripples through the trailing 1s of ~n and stops at the lowest set bit of n — so n and −n share ONLY that bit. Lowest set bit of {dec(n)} = {lb >= 0 ? `2^${lb} = ${2 ** lb}` : "none"}.
                </Narration>
              </Stage>
            )}
            {trick === "pop" && (
              <Stage className="space-y-2 p-3">
                <BitRow label="n" value={popSt.step.n} w={w} tone={(i) => (i === popSt.step.cleared ? "active" : undefined)} sub={`= ${popSt.step.n}`} />
                {popSt.step.m1 !== undefined && (
                  <>
                    <BitRow label="n − 1" value={popSt.step.m1} w={w} tone={(i) => (i <= popSt.step.cleared ? "warn" : undefined)} />
                    <BitRow label="n&(n−1)" value={popSt.step.res} w={w} tone={(i, on) => (i === popSt.step.cleared ? "bad" : on ? "ok" : undefined)} />
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="success">count = {popSt.step.count}</Badge>
                  <Badge variant="outline">naive loop: {w} iterations</Badge>
                </div>
                <Narration tone={popSt.step.tone}>{popSt.step.note}</Narration>
              </Stage>
            )}
            {trick === "pow2" && (
              <Stage className="space-y-2 p-3">
                <BitRow label="n" value={n} w={w} tone={(i, on) => (on ? (isPow2 ? "ok" : "warn") : undefined)} sub={`= ${dec(n)}`} />
                <BitRow label="n&(n−1)" value={u(n & nm1, w)} w={w} tone={(i, on) => (on ? "bad" : undefined)} sub={`= ${u(n & nm1, w)}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] text-muted-foreground">Try:</span>
                  {[1, 16, 64, 12, 7, 0].map((x) => (
                    <Button key={x} size="xs" variant="outline" onClick={() => setA(u(x, w))}>
                      {x}
                    </Button>
                  ))}
                </div>
                <Narration tone={isPow2 ? "ok" : "bad"}>
                  {isPow2 ? `${dec(n)} has exactly one 1-bit — clearing it leaves 0, so it IS a power of two (2^${lb}).` : dec(n) <= 0 ? `${dec(n)} ≤ 0 → not a power of two (the n > 0 guard matters for 0 and negatives).` : `${dec(n)} has more than one 1-bit — n & (n−1) ≠ 0, NOT a power of two.`}
                </Narration>
              </Stage>
            )}
            {trick === "single" && (
              <Stage className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-16 font-mono text-[12px] font-semibold text-muted-foreground">nums</span>
                  {nums.map((x, i) => (
                    <span key={i} className={cn("rounded-md border px-2 py-0.5 font-mono text-[12.5px] font-semibold", i === xorSt.step.i ? "border-viz-active bg-viz-active/15 text-viz-active" : i < xorSt.step.i ? "opacity-45" : "bg-card")}>
                      {x}
                    </span>
                  ))}
                  <Button
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => {
                      const pool = [];
                      while (pool.length < 4) {
                        const v = 1 + Math.floor(Math.random() * 30);
                        if (!pool.includes(v)) pool.push(v);
                      }
                      const arr = [...pool.slice(0, 3), ...pool.slice(0, 3), pool[3]].sort(() => Math.random() - 0.5);
                      setNums(arr);
                    }}
                  >
                    <Shuffle /> Random
                  </Button>
                </div>
                {xorSt.step.before !== undefined && <BitRow label="res" value={xorSt.step.before} w={Math.min(w, 8)} />}
                {xorSt.step.num !== undefined && <BitRow label="^ num" value={xorSt.step.num} w={Math.min(w, 8)} tone={(i, on) => (on ? "active" : undefined)} />}
                <BitRow label="= res" value={xorSt.step.res} w={Math.min(w, 8)} tone={(i, on) => (on ? "ok" : undefined)} sub={`= ${xorSt.step.res}`} />
                <Narration tone={xorSt.step.tone}>{xorSt.step.note}</Narration>
              </Stage>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <CodePanel code={TRICK_CODE[trick]} active={trick === "pop" ? popSt.step.line : trick === "single" ? xorSt.step.line : 2} />
            <StatGrid cols={2}>
              <Stat label="popcount(n)" value={bin(a, w).split("").filter((c) => c === "1").length} tone="active" />
              <Stat label="lowest set bit" value={lb >= 0 ? `bit ${lb}` : "—"} tone="ok" />
            </StatGrid>
          </div>
        </Split>
        {trick === "pop" && <PlaybackBar stepper={popSt} />}
        {trick === "single" && <PlaybackBar stepper={xorSt} />}
      </div>
    </LabShell>
  );
}
