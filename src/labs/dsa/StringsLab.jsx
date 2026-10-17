import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper,
} from "@/viz/kit";

const INPUT = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px]";
const lineOf = (code, s) => code.split("\n").findIndex((l) => l.includes(s)) + 1;
const show = (ch) => (ch === " " ? "␣" : ch);
const chars = (s) => s.split("").map(show);

/* ================================================================== */
/* variant "string-ops"                                                */
/* ================================================================== */

const FIND_CODE = `size_t find(const string& s, const string& p, size_t from) {
    for (size_t i = from; i + p.size() <= s.size(); i++) {
        size_t j = 0;
        while (j < p.size() && s[i + j] == p[j]) j++;
        if (j == p.size()) return i;      // full match
    }
    return string::npos;
}`;

function findSteps(s, p, from) {
  const out = [];
  let comps = 0;
  const push = (o) => out.push({ comps, ...o });
  if (from > s.length) {
    push({ i: -1, j: 0, line: 7, note: `from (${from}) is past the end → npos.`, tone: "bad", result: "npos", done: true });
    return out;
  }
  if (!p.length) {
    push({ i: from, j: 0, line: 5, note: `An empty pattern matches immediately at index ${from}.`, tone: "ok", result: from, done: true });
    return out;
  }
  for (let i = from; i + p.length <= s.length; i++) {
    let j = 0;
    while (j < p.length) {
      comps++;
      const ok = s[i + j] === p[j];
      push({ i, j, ok, line: 4, note: `i = ${i}: s[${i + j}] = '${show(s[i + j])}' ${ok ? "==" : "≠"} p[${j}] = '${show(p[j])}'${ok ? (j + 1 === p.length ? "" : " → keep matching") : " → slide the window right"}.`, tone: ok ? "active" : "bad" });
      if (!ok) break;
      j++;
    }
    if (j === p.length) {
      push({ i, j, ok: true, matched: true, line: 5, note: `All ${p.length} characters matched → return ${i}. (${comps} char comparisons)`, tone: "ok", result: i, done: true });
      return out;
    }
  }
  push({ i: -1, j: 0, line: 7, note: `No window matched → return string::npos (the "not found" sentinel). Always test pos != string::npos!`, tone: "bad", result: "npos", done: true });
  return out;
}

function SubstrPanel({ s }) {
  const [pos, setPos] = useState(0);
  const [len, setLen] = useState(4);
  const [toEnd, setToEnd] = useState(false);
  const p = Math.min(pos, s.length + 1);
  const throws = p > s.length;
  const take = throws ? 0 : toEnd ? s.length - p : Math.min(len, s.length - p);
  const states = Object.fromEntries(s.split("").map((_, k) => [k, k >= p && k < p + take ? "ok" : "dim"]));
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-4">
          <ArrayView values={chars(s)} states={states} cellWidth={32} pointers={p < s.length ? [{ index: p, label: "pos", tone: "active" }] : []} />
          <div className="mt-3 font-mono text-[13px]">
            → {throws ? <span className="text-viz-bad">throws std::out_of_range</span> : <span className="text-viz-ok">"{s.substr(p, take)}"</span>}
          </div>
        </Stage>
        <Narration tone={throws ? "bad" : "ok"}>
          {throws
            ? `pos ${p} > size ${s.length}: substr throws. (pos == size is allowed and returns "".)`
            : `Copies ${take} character${take === 1 ? "" : "s"} into a brand-new string — O(K) time and O(K) space.${!toEnd && len > take ? ` len ${len} was clamped to the ${take} characters that remain.` : ""} In a loop this copying adds up fast.`}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="s.substr(pos, len)">
          <SliderControl label="pos" value={p} min={0} max={s.length + 1} onChange={setPos} />
          <SliderControl label="len" value={len} min={0} max={s.length} onChange={setLen} disabled={toEnd} />
          <SwitchControl label="omit len (take to the end)" checked={toEnd} onChange={setToEnd} id="substr-npos" />
        </Panel>
        <div className="rounded-lg border bg-code px-3 py-2 font-mono text-[12.5px]">
          string sub = s.substr({p}{toEnd ? "" : `, ${len}`});
        </div>
      </div>
    </Split>
  );
}

function FindPanel({ s }) {
  const [p, setP] = useState(s.includes("world") ? "world" : s.slice(2, 5));
  const [from, setFrom] = useState(0);
  const steps = useMemo(() => findSteps(s, p, Math.min(from, s.length + 1)), [s, p, from]);
  const st = useStepper(steps, { baseMs: 650 });
  const step = st.step;
  const states = {};
  s.split("").forEach((_, k) => {
    if (k < from) states[k] = "dim";
    if (step.i >= 0 && k >= step.i && k < step.i + p.length) states[k] = step.matched ? "ok" : k < step.i + step.j ? "ok" : k === step.i + step.j ? (step.ok ? "active" : "bad") : undefined;
  });
  return (
    <div className="space-y-3">
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-2 p-4">
            <ArrayView values={chars(s)} states={states} cellWidth={32} pointers={step.i >= 0 ? [{ index: step.i, label: "i" }, ...(step.i + step.j < s.length && !step.matched ? [{ index: step.i + step.j, label: "i+j", tone: "purple" }] : [])] : []} label="s" />
            {step.i >= 0 && (
              <div className="flex gap-1" style={{ paddingLeft: step.i * 36 }}>
                {p.split("").map((c, k) => (
                  <div key={k} className={cn("flex h-8 w-8 items-center justify-center rounded-md border font-mono text-sm font-semibold transition-all", k < step.j || step.matched ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : k === step.j ? (step.ok ? "border-viz-active bg-viz-active/15" : "border-viz-bad bg-viz-bad/12 text-viz-bad") : "bg-card")}>
                    {show(c)}
                  </div>
                ))}
              </div>
            )}
          </Stage>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="s.find(p, from)">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-muted-foreground">p =</span>
              <input className={cn(INPUT, "w-full")} value={p} onChange={(e) => setP(e.target.value.slice(0, 8))} aria-label="Pattern" />
            </div>
            <SliderControl label="from" value={Math.min(from, s.length)} min={0} max={s.length} onChange={setFrom} />
          </Panel>
          <CodePanel code={FIND_CODE} active={step.line} />
          <StatGrid cols={2}>
            <Stat label="char comparisons" value={step.comps} tone="active" />
            <Stat label="returns" value={step.result ?? "…"} tone={step.result === "npos" ? "bad" : step.done ? "ok" : undefined} />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

const SSO = 15;
function AppendPanel({ s0 }) {
  const init = () => ({ s: s0.slice(0, 12), cap: Math.max(SSO, s0.length), copies: 0, reallocs: 0, note: "std::string keeps size and capacity just like vector. Short strings (≤ 15 chars in libstdc++) live inside the object itself (SSO).", tone: "default", hi: null });
  const [st, setSt] = useState(init);
  const LIMIT = 44;
  const apply = (kind) =>
    setSt((o) => {
      const add = kind === "push" ? "!" : "ab";
      if (o.s.length + add.length > LIMIT) return { ...o, note: "That's long enough for this demo — reset to start over.", tone: "warn" };
      const ns = o.s + add;
      if (kind === "concat") {
        const copied = ns.length;
        return { ...o, s: ns, cap: Math.max(SSO, ns.length), copies: o.copies + copied, reallocs: o.reallocs + 1, note: `s = s + "ab" builds a brand-new temporary of ${ns.length} chars (copying all ${o.s.length} old chars), then moves it into s. O(N) every time — in a loop that's O(N²).`, tone: "bad", hi: [0, ns.length] };
      }
      if (ns.length > o.cap) {
        const cap = Math.max(2 * o.cap, ns.length);
        return { ...o, s: ns, cap, copies: o.copies + o.s.length, reallocs: o.reallocs + 1, note: `Out of capacity: reallocate to ${cap} and copy the ${o.s.length} existing chars once. Rare, so += stays amortized O(1) per char.`, tone: "warn", hi: [o.s.length, ns.length] };
      }
      return { ...o, s: ns, note: `${kind === "push" ? "s.push_back('!')" : 's += "ab"'} wrote into spare capacity — no copying at all.`, tone: "ok", hi: [o.s.length, ns.length] };
    });
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-3">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: st.cap }, (_, k) => {
              const used = k < st.s.length;
              const hot = st.hi && k >= st.hi[0] && k < st.hi[1];
              return (
                <div key={k} className={cn("flex h-8 w-6 items-center justify-center rounded border font-mono text-[12px] font-semibold", hot ? (st.tone === "bad" ? "border-viz-bad bg-viz-bad/12 text-viz-bad" : "border-viz-ok bg-viz-ok/15 text-viz-ok") : used ? "border-viz-active/50 bg-viz-active/8" : "border-dashed opacity-40")}>
                  {used ? show(st.s[k]) : ""}
                </div>
              );
            })}
          </div>
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">size {st.s.length} / capacity {st.cap}{st.cap === SSO ? " (SSO buffer)" : ""}</div>
        </Stage>
        <Narration tone={st.tone}>{st.note}</Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Build the string">
          <div className="flex flex-wrap gap-1.5">
            <Button size="xs" variant="outline" className="font-mono" onClick={() => apply("append")}>s += "ab"</Button>
            <Button size="xs" variant="outline" className="font-mono" onClick={() => apply("push")}>s.push_back('!')</Button>
            <Button size="xs" variant="outline" className="font-mono" onClick={() => apply("concat")}>s = s + "ab"</Button>
            <Button size="xs" variant="ghost" onClick={() => setSt(init())}>
              <RotateCcw /> Reset
            </Button>
          </div>
        </Panel>
        <StatGrid cols={2}>
          <Stat label="chars copied" value={st.copies} tone="warn" hint="Total characters copied by reallocations or temporaries." />
          <Stat label="allocations" value={st.reallocs} tone="bad" />
        </StatGrid>
      </div>
    </Split>
  );
}

function StringOpsVariant() {
  const PRESETS = ["hello world", "algorithm", "banana"];
  const [s, setS] = useState("hello world");
  const [op, setOp] = useState("find");
  return (
    <LabShell
      title="std::string — substr, find & append"
      description="A string is a vector<char> with extras. See which cells each call touches and what it really costs."
      badges={["substr O(K)", "find O(N·M)", "+= amortized O(1)"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={PRESETS.includes(s) ? s : "custom"} onValueChange={(v) => v !== "custom" && setS(v)}>
          <SelectTrigger className="w-40 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p} value={p} className="font-mono">"{p}"</SelectItem>
            ))}
            {!PRESETS.includes(s) && <SelectItem value="custom">custom</SelectItem>}
          </SelectContent>
        </Select>
        <input className={cn(INPUT, "w-44")} value={s} onChange={(e) => setS(e.target.value.slice(0, 16))} aria-label="String s" />
        <ToggleGroup type="single" value={op} onValueChange={(v) => v && setOp(v)} className="ml-auto">
          <ToggleGroupItem value="substr" className="font-mono">substr</ToggleGroupItem>
          <ToggleGroupItem value="find" className="font-mono">find</ToggleGroupItem>
          <ToggleGroupItem value="append" className="font-mono">+= / append</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {op === "substr" && <SubstrPanel s={s} />}
      {op === "find" && <FindPanel key={s} s={s} />}
      {op === "append" && <AppendPanel key={s} s0={s} />}
    </LabShell>
  );
}

/* ================================================================== */
/* variant "ascii"                                                     */
/* ================================================================== */

const cat = (c) => (c >= 48 && c <= 57 ? "digit" : c >= 65 && c <= 90 ? "upper" : c >= 97 && c <= 122 ? "lower" : c === 32 ? "space" : "symbol");
const CAT_CLS = { digit: "text-viz-warn", upper: "text-viz-purple", lower: "text-viz-active", space: "text-muted-foreground", symbol: "text-muted-foreground" };
const chr = (c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : `\\x${c.toString(16).padStart(2, "0")}`);
const lit = (c) => (c >= 32 && c < 127 ? `'${chr(c)}'` : chr(c));

function Bits({ v, mark = 5, label }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-24 shrink-0 font-mono text-[12px]">{label}</span>}
      <div className="flex gap-px">
        {Array.from({ length: 8 }, (_, k) => {
          const b = 7 - k;
          const on = (v >> b) & 1;
          return (
            <div key={b} className={cn("flex h-6 w-5 items-center justify-center rounded-[3px] border font-mono text-[11px]", on ? "bg-viz-active/15 text-viz-active" : "bg-card text-muted-foreground", b === mark && "border-viz-warn ring-1 ring-viz-warn/50")}>
              {on}
            </div>
          );
        })}
      </div>
      <span className="font-mono text-[12px] text-muted-foreground">= {v} {v >= 32 && v < 127 ? `'${chr(v)}'` : ""}</span>
    </div>
  );
}

function AsciiTable({ c, setC }) {
  return (
    <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-16">
      {Array.from({ length: 95 }, (_, k) => {
        const code = 32 + k;
        return (
          <Tip key={code} content={<span className="font-mono">{code} · 0x{code.toString(16).toUpperCase()}</span>}>
            <Button
              variant={code === c ? "default" : "ghost"}
              size="xs"
              className={cn("h-7 w-full px-0 font-mono text-[12.5px]", code !== c && CAT_CLS[cat(code)])}
              onClick={() => setC(code)}
              aria-label={`char ${code}`}
            >
              {code === 32 ? "␣" : chr(code)}
            </Button>
          </Tip>
        );
      })}
    </div>
  );
}

const PARSE_CODE = (hard) => `int stringToInt(string s) {
    int result = 0;
    bool negative = false;
    int i = 0;
    if (s[0] == '-') { negative = true; i = 1; }
    while (i < s.length()) {${hard ? "\n        if (!isdigit(s[i])) break;   // hardened" : ""}
        int digit = s[i] - '0';
        result = result * 10 + digit;
        i++;
    }
    return negative ? -result : result;
}`;

function parseSteps(s, hard) {
  const out = [];
  const code = PARSE_CODE(hard);
  const L = (k) => lineOf(code, k);
  let result = 0, i = 0, neg = false;
  out.push({ i: -1, result, line: L("int result"), note: `Parse "${s}" one character at a time.`, tone: "default" });
  if (s[0] === "-") {
    neg = true;
    i = 1;
    out.push({ i: 0, result, line: L("s[0] == '-'"), note: "Leading '-' → remember the sign, start at index 1.", tone: "warn" });
  }
  while (i < s.length) {
    const code2 = s.charCodeAt(i);
    if (hard && !(code2 >= 48 && code2 <= 57)) {
      out.push({ i, result, line: L("isdigit"), note: `'${s[i]}' is not a digit → stop parsing (like std::stoi does).`, tone: "warn" });
      break;
    }
    const digit = code2 - 48;
    const prev = result;
    result = result * 10 + digit;
    const bad = digit < 0 || digit > 9;
    out.push({ i, result, digit, line: L("result * 10"), note: `'${s[i]}' (${code2}) − '0' (48) = ${digit}${bad ? " — NOT a digit, garbage in!" : ""}. result = ${prev} × 10 + ${digit} = ${result}.`, tone: bad ? "bad" : "active" });
    i++;
  }
  const final = neg ? -result : result;
  out.push({ i: s.length, result: final, line: L("return negative"), note: `Return ${final}.`, tone: "ok", done: true });
  return out;
}

function AsciiVariant() {
  const [c, setC] = useState(100);
  const [lens, setLens] = useState("bits");
  const [word, setWord] = useState("banana");
  const [num, setNum] = useState("473");
  const [hard, setHard] = useState(false);
  const steps = useMemo(() => parseSteps(num || "0", hard), [num, hard]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const k = cat(c);
  const idx = c - 97;
  const counts = Array(26).fill(0);
  for (const ch of word) if (ch >= "a" && ch <= "z") counts[ch.charCodeAt(0) - 97]++;

  return (
    <LabShell
      title="ASCII Arithmetic Workbench"
      description="Characters are just small integers. Subtract a baseline to get an index, flip bit 5 to change case, and fold digits into a number."
      badges={["c - 'a'", "c - '0'", "'a' - 'A' = 32"]}
    >
      <Tabs value={lens} onValueChange={setLens}>
        <TabsList>
          <TabsTrigger value="bits">Table & bits</TabsTrigger>
          <TabsTrigger value="index">c − 'a' index</TabsTrigger>
          <TabsTrigger value="case">Case flip</TabsTrigger>
          <TabsTrigger value="parse">Parse an int</TabsTrigger>
        </TabsList>
      </Tabs>
      {lens !== "parse" && (
        <Stage className="p-2">
          <AsciiTable c={c} setC={setC} />
        </Stage>
      )}
      {lens === "bits" && (
        <Split>
          <div className="space-y-3">
            <Panel title={`selected: ${lit(c)}`}>
              <Bits v={c} label="binary" />
              <p className="text-[12px] text-muted-foreground">Bit 5 (value 32, outlined) is the only difference between 'A' (01000001) and 'a' (01100001).</p>
            </Panel>
            <Legend items={[[C.warn, "digits 48–57"], [C.purple, "uppercase 65–90"], [C.active, "lowercase 97–122"]]} />
          </div>
          <VarTable vars={[["char", lit(c), "active"], ["decimal", c], ["hex", "0x" + c.toString(16).toUpperCase()], ["category", k, k === "digit" ? "warn" : k === "upper" ? "purple" : "active"]]} />
        </Split>
      )}
      {lens === "index" && (
        <Split>
          <div className="space-y-3">
            <Stage className="p-3">
              <ArrayView values={counts} cellWidth={26} states={Object.fromEntries(counts.map((v, j) => [j, j === idx ? "active" : v ? "ok" : undefined]))} pointers={idx >= 0 && idx < 26 ? [{ index: idx, label: lit(c) }] : []} label="int counts[26]  (index = c − 'a')" />
              <div className="mt-1 flex gap-1 font-mono text-[10px] text-muted-foreground">
                {counts.map((_, j) => <div key={j} className="text-center" style={{ width: 26 }}>{String.fromCharCode(97 + j)}</div>)}
              </div>
            </Stage>
            <Narration tone={idx >= 0 && idx < 26 ? "active" : "bad"}>
              {idx >= 0 && idx < 26
                ? `${lit(c)} − 'a' = ${c} − 97 = ${idx}, so ${lit(c)} lives in counts[${idx}].`
                : `${lit(c)} − 'a' = ${c} − 97 = ${idx} — outside 0..25! Indexing counts[${idx}] would be out of bounds. ${k === "upper" ? `Use c − 'A' (= ${c - 65}) or tolower(c) first.` : "Only use this trick on lowercase letters."}`}
            </Narration>
          </div>
          <div className="space-y-3">
            <Panel title="for (char c : word) counts[c - 'a']++;">
              <input className={cn(INPUT, "w-full")} value={word} onChange={(e) => setWord(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 20))} aria-label="Word" />
              <p className="text-[12px] text-muted-foreground">A fixed int[26] replaces an unordered_map&lt;char,int&gt; — O(1) space, no hashing.</p>
            </Panel>
            <VarTable vars={[["c", lit(c), "active"], ["c − 'a'", idx, idx >= 0 && idx < 26 ? "ok" : "bad"], ["c − '0'", c - 48, k === "digit" ? "warn" : undefined]]} />
          </div>
        </Split>
      )}
      {lens === "case" && (
        <Split>
          <div className="space-y-3">
            <Panel title="Bit tricks on the selected char">
              <Bits v={c} label={lit(c)} />
              <Bits v={c ^ 32} label="c ^ 32" />
              <Bits v={c | 32} label="c | 32" />
              <Bits v={c & ~32 & 0xff} label="c & ~32" />
            </Panel>
            <Narration tone={k === "upper" || k === "lower" ? "ok" : "warn"}>
              {k === "upper" || k === "lower"
                ? `XOR 32 toggles case (${lit(c)} → ${lit(c ^ 32)}); OR 32 forces lowercase; AND ~32 forces uppercase. Same as ${lit(c)} ${k === "upper" ? "+" : "−"} ('a' − 'A').`
                : `${lit(c)} is not a letter, so flipping bit 5 gives ${lit(c ^ 32)} — meaningless. Guard with isalpha(c), or just use tolower / toupper.`}
            </Narration>
          </div>
          <VarTable
            vars={[
              ["tolower(c)", lit(k === "upper" ? c + 32 : c), "active"],
              ["toupper(c)", lit(k === "lower" ? c - 32 : c), "purple"],
              ["c + ('a' − 'A')", k === "upper" ? lit(c + 32) : "only for 'A'..'Z'"],
              ["isalpha / isdigit", `${k === "upper" || k === "lower"} / ${k === "digit"}`],
            ]}
          />
        </Split>
      )}
      {lens === "parse" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={["473", "-2048", "12a3", "007"].includes(num) ? num : "custom"} onValueChange={(v) => v !== "custom" && setNum(v)}>
              <SelectTrigger className="w-32 font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["473", "-2048", "12a3", "007"].map((p) => (
                  <SelectItem key={p} value={p} className="font-mono">"{p}"</SelectItem>
                ))}
                {!["473", "-2048", "12a3", "007"].includes(num) && <SelectItem value="custom">custom</SelectItem>}
              </SelectContent>
            </Select>
            <input className={cn(INPUT, "w-32")} value={num} onChange={(e) => setNum(e.target.value.slice(0, 9))} aria-label="Number string" />
            <div className="w-64">
              <SwitchControl label="Edge-case hardened" hint="stop at the first non-digit" checked={hard} onChange={setHard} id="parse-hard" />
            </div>
          </div>
          <Split>
            <div className="space-y-3">
              <Stage className="p-4">
                <ArrayView values={num.split("")} cellWidth={38} states={Object.fromEntries(num.split("").map((_, j) => [j, j === step.i ? (step.tone === "bad" ? "bad" : step.tone === "warn" ? "warn" : "active") : j < step.i ? "ok" : undefined]))} pointers={step.i >= 0 && step.i < num.length ? [{ index: step.i, label: "i" }] : []} />
                <div className="mt-3 font-mono text-[13px]">result = <b className="text-viz-ok">{step.result}</b></div>
              </Stage>
              <Narration tone={step.tone}>{step.note}</Narration>
            </div>
            <div className="space-y-3">
              <CodePanel code={PARSE_CODE(hard)} active={step.line} />
              <VarTable vars={[["i", step.i < 0 ? "—" : step.i, "active"], ["s[i]", step.i >= 0 && step.i < num.length ? `'${num[step.i]}'` : "—"], ["digit", step.digit ?? "—", step.tone === "bad" ? "bad" : undefined], ["result", step.result, "ok"]]} />
            </div>
          </Split>
          <PlaybackBar stepper={st} />
        </>
      )}
    </LabShell>
  );
}

/* ================================================================== */
/* variant "palindrome"                                                */
/* ================================================================== */

const PAL_CODE = {
  basic: `bool isPalindrome(string s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}`,
  hard: `bool isPalindrome(string s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        while (left < right && !isalnum(s[left])) left++;
        while (left < right && !isalnum(s[right])) right--;
        if (tolower(s[left]) != tolower(s[right])) return false;
        left++;
        right--;
    }
    return true;
}`,
};
const alnum = (ch) => /[a-z0-9]/i.test(ch);

function palSteps(s, hard) {
  const code = PAL_CODE[hard ? "hard" : "basic"];
  const L = (k) => lineOf(code, k);
  const out = [];
  let l = 0, r = s.length - 1, comps = 0;
  const push = (o) => out.push({ l, r, comps, ...o });
  push({ line: L("int left"), note: `left = 0, right = ${r}.`, tone: "default" });
  while (l < r) {
    if (hard) {
      while (l < r && !alnum(s[l])) { l++; push({ line: L("isalnum(s[left])"), skip: l - 1, note: `'${show(s[l - 1])}' isn't alphanumeric → left++.`, tone: "default" }); }
      while (l < r && !alnum(s[r])) { r--; push({ line: L("isalnum(s[right])"), skip: r + 1, note: `'${show(s[r + 1])}' isn't alphanumeric → right--.`, tone: "default" }); }
      if (l >= r) break;
    }
    comps++;
    const a = hard ? s[l].toLowerCase() : s[l], b = hard ? s[r].toLowerCase() : s[r];
    if (a !== b) {
      push({ line: L("return false"), cmp: true, bad: true, note: `s[${l}] = '${show(s[l])}' ≠ s[${r}] = '${show(s[r])}'${!hard && s[l].toLowerCase() === s[r].toLowerCase() ? " (different case — the basic version is case-sensitive!)" : ""} → return false.`, tone: "bad", result: false, done: true });
      return out;
    }
    push({ line: L(hard ? "tolower" : "s[left] != s[right]"), cmp: true, note: `s[${l}] = '${show(s[l])}' == s[${r}] = '${show(s[r])}' ✓ → move both pointers inward.`, tone: "ok" });
    l++;
    r--;
  }
  push({ line: L("return true"), note: `left (${l}) ≥ right (${r}) — every mirrored pair matched → palindrome! ${comps} comparisons, O(1) extra space.`, tone: "ok", result: true, done: true });
  return out;
}

const ANA_CODE = `bool isAnagram(string s, string t) {
    if (s.length() != t.length()) return false;
    vector<int> counts(26, 0);
    for (int i = 0; i < s.length(); i++) {
        counts[s[i] - 'a']++;
        counts[t[i] - 'a']--;
    }
    for (int count : counts)
        if (count != 0) return false;
    return true;
}`;

function anaSteps(s, t) {
  const L = (k) => lineOf(ANA_CODE, k);
  const counts = Array(26).fill(0);
  const out = [];
  const push = (o) => out.push({ counts: [...counts], ...o });
  if (s.length !== t.length) {
    push({ line: L("s.length() != t.length()"), note: `Lengths differ (${s.length} vs ${t.length}) → return false instantly, O(1).`, tone: "bad", result: false, done: true });
    return out;
  }
  push({ line: L("counts(26, 0)"), note: "26 buckets, all zero. s adds, t subtracts — anagrams cancel out perfectly.", tone: "default" });
  for (let i = 0; i < s.length; i++) {
    const a = s.charCodeAt(i) - 97;
    counts[a]++;
    push({ i, side: "s", b: a, line: L("s[i] - 'a']++"), note: `s[${i}] = '${s[i]}' → counts[${a}]++ → ${counts[a]}.`, tone: "active" });
    const b = t.charCodeAt(i) - 97;
    counts[b]--;
    push({ i, side: "t", b, line: L("t[i] - 'a']--"), note: `t[${i}] = '${t[i]}' → counts[${b}]-- → ${counts[b]}.`, tone: "purple" });
  }
  const bad = counts.findIndex((v) => v !== 0);
  if (bad >= 0) push({ line: L("count != 0"), b: bad, note: `counts['${String.fromCharCode(97 + bad)}'] = ${counts[bad]} ≠ 0 → the letters don't balance → not anagrams.`, tone: "bad", result: false, done: true });
  else push({ line: L("return true"), note: "All 26 buckets are back to 0 → anagrams! O(N) time, O(1) space (always 26 ints).", tone: "ok", result: true, done: true });
  return out;
}

function Buckets({ counts, hi }) {
  const W = 600, H = 150, bw = (W - 20) / 26, mid = 70;
  const m = Math.max(2, ...counts.map(Math.abs));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <line x1={10} x2={W - 10} y1={mid} y2={mid} stroke={C.muted} opacity={0.5} />
      {counts.map((v, k) => {
        const h = (Math.abs(v) / m) * 52;
        const x = 10 + k * bw;
        return (
          <g key={k}>
            {k === hi && <rect x={x} y={8} width={bw} height={H - 22} rx={3} fill={C.active} opacity={0.08} />}
            <rect x={x + 3} y={v >= 0 ? mid - h : mid} width={bw - 6} height={Math.max(h, v ? 2 : 0)} rx={2} fill={v > 0 ? C.active : C.purple} opacity={0.85} className="transition-all duration-200" />
            {v !== 0 && <text x={x + bw / 2} y={v > 0 ? mid - h - 4 : mid + h + 12} textAnchor="middle" fontSize={10} fill={C.fg}>{v > 0 ? `+${v}` : v}</text>}
            <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize={10.5} fill={k === hi ? C.active : C.muted}>{String.fromCharCode(97 + k)}</text>
          </g>
        );
      })}
    </svg>
  );
}

const PAL_PRESETS = ["racecar", "hello", "abba", "A man, a plan, a canal: Panama", "race a car"];
const ANA_PRESETS = [["eat", "tea"], ["listen", "silent"], ["cat", "dog"], ["rat", "car"], ["ab", "abc"]];

function PalindromeVariant() {
  const [tab, setTab] = useState("pal");
  const [s, setS] = useState("racecar");
  const [hard, setHard] = useState(false);
  const [pair, setPair] = useState(["listen", "silent"]);
  const steps = useMemo(() => (tab === "pal" ? palSteps(s, hard) : anaSteps(pair[0], pair[1])), [tab, s, hard, pair]);
  const st = useStepper(steps, { baseMs: 800 });
  const step = st.step;
  const clean = (v) => v.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);

  return (
    <LabShell
      title="Palindromes & Anagrams"
      description="Two pointers walking inward check a palindrome in O(N) with O(1) space; a 26-bucket frequency array checks an anagram the same way."
      badges={["two pointers", "int[26] frequency", "O(1) space"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pal">Palindrome (two pointers)</TabsTrigger>
          <TabsTrigger value="ana">Anagram (26 buckets)</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "pal" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={PAL_PRESETS.includes(s) ? s : "custom"} onValueChange={(v) => v !== "custom" && setS(v)}>
            <SelectTrigger className="w-64 font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAL_PRESETS.map((p) => (
                <SelectItem key={p} value={p} className="font-mono text-[12.5px]">"{p}"</SelectItem>
              ))}
              {!PAL_PRESETS.includes(s) && <SelectItem value="custom">custom</SelectItem>}
            </SelectContent>
          </Select>
          <input className={cn(INPUT, "w-48")} value={s} onChange={(e) => setS(e.target.value.slice(0, 30))} aria-label="String" />
          <div className="w-72">
            <SwitchControl label="Edge-case hardened (LC 125)" hint="skip non-alphanumerics, ignore case" checked={hard} onChange={setHard} id="pal-hard" />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={((k) => (k >= 0 ? String(k) : ""))(ANA_PRESETS.findIndex((p) => p[0] === pair[0] && p[1] === pair[1]))} onValueChange={(v) => v && setPair(ANA_PRESETS[Number(v)])}>
            <SelectTrigger className="w-44 font-mono">
              <SelectValue placeholder="custom" />
            </SelectTrigger>
            <SelectContent>
              {ANA_PRESETS.map((p, k) => (
                <SelectItem key={k} value={String(k)} className="font-mono">{p[0]} / {p[1]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input className={cn(INPUT, "w-28")} value={pair[0]} onChange={(e) => setPair([clean(e.target.value), pair[1]])} aria-label="s" />
          <input className={cn(INPUT, "w-28")} value={pair[1]} onChange={(e) => setPair([pair[0], clean(e.target.value)])} aria-label="t" />
        </div>
      )}
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-3 p-4">
            {tab === "pal" ? (
              <ArrayView
                values={chars(s)}
                cellWidth={s.length > 16 ? 26 : 36}
                states={Object.fromEntries(
                  s.split("").map((ch, k) => [
                    k,
                    k === step.l || k === step.r ? (step.bad ? "bad" : step.cmp ? "ok" : "active") : k === step.skip ? "warn" : k < step.l || k > step.r ? "dim" : hard && !alnum(ch) ? "dim" : undefined,
                  ])
                )}
                pointers={step.done && !step.bad ? [] : [{ index: step.l, label: "L", tone: "active" }, ...(step.r >= 0 ? [{ index: step.r, label: "R", tone: "purple" }] : [])]}
              />
            ) : (
              <>
                <ArrayView values={pair[0].split("")} label="s (adds)" cellWidth={32} states={step.i != null ? { [step.i]: step.side === "s" ? "active" : "ok" } : {}} />
                <ArrayView values={pair[1].split("")} label="t (subtracts)" cellWidth={32} states={step.i != null ? { [step.i]: step.side === "t" ? "purple" : undefined } : {}} />
                <Buckets counts={step.counts} hi={step.b} />
              </>
            )}
          </Stage>
          {step.done && <Badge variant={step.result ? "success" : "danger"}>{step.result ? "true" : "false"}</Badge>}
          <Narration tone={step.tone === "purple" ? "active" : step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={tab === "pal" ? PAL_CODE[hard ? "hard" : "basic"] : ANA_CODE} active={step.line} />
          {tab === "pal" ? (
            <VarTable vars={[["left", step.l, "active"], ["right", step.r, "purple"], ["comparisons", step.comps], ["result", step.result == null ? "…" : String(step.result), step.result ? "ok" : step.result === false ? "bad" : undefined]]} />
          ) : (
            <VarTable vars={[["i", step.i ?? "—", "active"], ["non-zero buckets", step.counts.filter(Boolean).length, "warn"], ["result", step.result == null ? "…" : String(step.result), step.result ? "ok" : step.result === false ? "bad" : undefined]]} />
          )}
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

export default function StringsLab({ variant = "string-ops" }) {
  if (variant === "ascii") return <AsciiVariant />;
  if (variant === "palindrome") return <PalindromeVariant />;
  return <StringOpsVariant />;
}
