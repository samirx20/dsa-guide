import { Fragment, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper,
} from "@/viz/kit";

const INPUT = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px]";
const lineOf = (code, s) => code.split("\n").findIndex((l) => l.includes(s)) + 1;

/** Polynomial string hash (h = h*31 + c, 32-bit) — the same idea as std::hash<string>, much simpler. */
const polyHash = (s) => {
  let h = 0;
  for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h;
};
/** Toy hash: sum of character codes. Every anagram collides. */
const sumHash = (s) => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0);

const chip = (tone) =>
  cn(
    "inline-flex h-7 items-center gap-1 rounded-md border bg-card px-2 font-mono text-[12px] font-semibold transition-all duration-200",
    tone === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
    tone === "ok" && "border-viz-ok bg-viz-ok/15 text-viz-ok",
    tone === "bad" && "border-viz-bad bg-viz-bad/12 text-viz-bad",
    tone === "warn" && "border-viz-warn bg-viz-warn/15 text-viz-warn",
    tone === "purple" && "border-viz-purple bg-viz-purple/15 text-viz-purple"
  );

/* ================================================================== */
/* variant "map"                                                       */
/* ================================================================== */

const PRIMES = [5, 11, 23, 47];
const nextPrime = (b) => PRIMES.find((p) => p > b) ?? b * 2 + 1;

function rebucket(entries, B) {
  const buckets = Array.from({ length: B }, () => []);
  for (const e of entries) buckets[polyHash(e.k) % B].push(e);
  return buckets;
}

function MapVariant() {
  const seed = [{ k: "Alice", v: 30 }, { k: "Bob", v: 25 }, { k: "Charlie", v: 35 }];
  const [entries, setEntries] = useState(seed); // insertion order
  const [B, setB] = useState(5);
  const [key, setKey] = useState("David");
  const [val, setVal] = useState("28");
  const [last, setLast] = useState({ note: "unordered_map hashes each key to pick a bucket; std::map keeps keys in a sorted red-black tree. Try an operation.", tone: "default" });
  const buckets = useMemo(() => rebucket(entries, B), [entries, B]);
  const k = key.trim();
  const h = polyHash(k);
  const bi = h % B;
  const lf = entries.length / B;

  const walk = () => {
    const chain = buckets[bi];
    const at = chain.findIndex((e) => e.k === k);
    return { chain, at, probes: at >= 0 ? at + 1 : chain.length };
  };
  const insert = (value, how) => {
    let nB = B, rehashed = false;
    if ((entries.length + 1) / B > 1.0) {
      nB = nextPrime(B);
      rehashed = true;
    }
    setEntries((o) => [...o, { k, v: value }]);
    setB(nB);
    return { rehashed, nB };
  };
  const ops = {
    set: () => {
      if (!k) return;
      const { at, probes } = walk();
      const v = Number(val) || 0;
      if (at >= 0) {
        setEntries((o) => o.map((e) => (e.k === k ? { ...e, v } : e)));
        setLast({ bucket: bi, key: k, tone: "ok", note: `m["${k}"] = ${v}: hash → bucket ${bi}, found "${k}" after ${probes} comparison(s) and overwrote its value.` });
      } else {
        const { rehashed, nB } = insert(v);
        setLast({ bucket: rehashed ? polyHash(k) % nB : bi, key: k, tone: rehashed ? "warn" : "ok", note: rehashed ? `Inserting would push the load factor past 1.0, so the table REHASHED: ${B} → ${nB} buckets and every key was redistributed. Then "${k}" was added — amortized O(1).` : `m["${k}"] = ${v}: "${k}" was not in bucket ${bi}, so a new node was appended. O(1) average.` });
      }
    },
    find: () => {
      const { at, probes } = walk();
      setLast({ bucket: bi, key: k, tone: at >= 0 ? "ok" : "bad", miss: at < 0, note: at >= 0 ? `m.find("${k}") → bucket ${bi}, ${probes} comparison(s): found, it->second = ${buckets[bi][at].v}.` : `m.find("${k}") → bucket ${bi} holds ${buckets[bi].length} node(s), none match → returns m.end(). The map is unchanged.` });
    },
    count: () => {
      const { at } = walk();
      setLast({ bucket: bi, key: k, tone: at >= 0 ? "ok" : "default", miss: at < 0, note: `m.count("${k}") = ${at >= 0 ? 1 : 0}. count() and find() never insert — the safe way to test membership.` });
    },
    erase: () => {
      const { at } = walk();
      if (at < 0) return setLast({ bucket: bi, key: k, tone: "default", miss: true, note: `m.erase("${k}") returns 0 — there was nothing to erase.` });
      setEntries((o) => o.filter((e) => e.k !== k));
      setLast({ bucket: bi, tone: "bad", note: `m.erase("${k}") unlinked the node from bucket ${bi}. O(1) average.` });
    },
    gotcha: () => {
      if (!k) return;
      const { at } = walk();
      if (at >= 0) return setLast({ bucket: bi, key: k, tone: "default", note: `"${k}" already exists, so m["${k}"] just returned ${buckets[bi][at].v} — nothing inserted this time.` });
      const { rehashed, nB } = insert(0);
      setLast({ bucket: rehashed ? polyHash(k) % nB : bi, key: k, tone: "bad", note: `if (m["${k}"] == 100) — you only wanted to CHECK, but operator[] silently inserted "${k}" → 0. Use count() or find() for lookups!` });
    },
  };
  const sorted = [...entries].sort((a, b) => (a.k < b.k ? -1 : 1));

  return (
    <LabShell
      title="unordered_map vs map"
      description="unordered_map: hash → bucket → short chain, O(1) average, no order. map: balanced BST, O(log N), always sorted."
      badges={["O(1) avg vs O(log N)", "load factor ≤ 1.0", "operator[] inserts!"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12.5px] text-muted-foreground">key</span>
        <input className={cn(INPUT, "w-28")} value={key} onChange={(e) => setKey(e.target.value.slice(0, 10))} aria-label="Key" />
        <span className="font-mono text-[12.5px] text-muted-foreground">value</span>
        <input className={cn(INPUT, "w-16")} value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d-]/g, "").slice(0, 5))} aria-label="Value" />
        <Button size="sm" onClick={ops.set} className="font-mono" disabled={entries.length >= 20 || !k}>m[key] = value</Button>
        <Button size="sm" variant="outline" onClick={ops.find} className="font-mono">find</Button>
        <Button size="sm" variant="outline" onClick={ops.count} className="font-mono">count</Button>
        <Button size="sm" variant="outline" onClick={ops.erase} className="font-mono">erase</Button>
        <Button size="sm" variant="outline" onClick={ops.gotcha} className="font-mono" disabled={entries.length >= 20 || !k}>if (m[key] == 100)</Button>
        <Button size="sm" variant="ghost" onClick={() => { setEntries(seed); setB(5); setLast({ note: "Reset.", tone: "default" }); }}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <div className="rounded-lg border bg-code px-3 py-2 font-mono text-[12.5px]">
        hash("{k}") = {h.toLocaleString()} → {h.toLocaleString()} % {B} = <b className="text-viz-active">bucket {bi}</b>
      </div>
      <Split>
        <div className="space-y-3">
          <Panel title={`unordered_map — ${B} buckets`}>
            <div className="space-y-1">
              {buckets.map((chain, b) => (
                <div key={b} className={cn("flex min-h-8 flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5", b === last.bucket && "bg-viz-active/8 ring-1 ring-viz-active/40")}>
                  <span className={cn("w-10 shrink-0 font-mono text-[11px]", b === bi ? "font-semibold text-viz-active" : "text-muted-foreground")}>[{b}]</span>
                  {chain.length === 0 && <span className="text-[11px] text-muted-foreground/60">empty</span>}
                  {chain.map((e, j) => (
                    <Fragment key={e.k}>
                      {j > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
                      <span className={chip(b === last.bucket && e.k === last.key ? last.tone : chain.length > 1 ? "warn" : undefined)}>
                        {e.k}: {e.v}
                      </span>
                    </Fragment>
                  ))}
                </div>
              ))}
            </div>
          </Panel>
          <Narration tone={last.tone}>{last.note}</Narration>
        </div>
        <div className="space-y-3">
          <StatGrid cols={2}>
            <Stat label="size / buckets" value={`${entries.length} / ${B}`} tone="active" />
            <Stat label="load factor" value={lf.toFixed(2)} tone={lf > 0.8 ? "warn" : "ok"} hint="size / bucket_count. When it would exceed max_load_factor (1.0) the table rehashes to more buckets." />
          </StatGrid>
          <Panel title="std::map — sorted (red-black tree)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>key</TableHead>
                  <TableHead className="text-right">value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.k} className={cn(e.k === last.key && "bg-viz-active/8")}>
                    <TableCell className="py-1 font-mono text-[12.5px]">"{e.k}"</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px]">{e.v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11.5px] text-muted-foreground">
              A lookup here walks ≈ {Math.max(1, Math.ceil(Math.log2(entries.length + 1)))} tree levels (O(log N)) instead of one bucket.
            </p>
          </Panel>
          <Panel title="for (auto& [k, v] : m) prints…">
            <div className="space-y-1 font-mono text-[11.5px]">
              <div><span className="text-muted-foreground">unordered_map: </span>{buckets.flat().map((e) => e.k).join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">map: </span>{sorted.map((e) => e.k).join(", ") || "—"}</div>
            </div>
          </Panel>
        </div>
      </Split>
    </LabShell>
  );
}

/* ================================================================== */
/* variant "set"                                                       */
/* ================================================================== */

const DEDUP_CODE = `unordered_set<int> seen;
vector<int> result;
for (int num : nums) {
    if (seen.insert(num).second) {   // {iterator, bool}
        result.push_back(num);       // first time seen
    }
}`;

function dedupSteps(nums, B) {
  const buckets = Array.from({ length: B }, () => []);
  const result = [];
  const sorted = new Set();
  const out = [];
  const push = (o) => out.push({ buckets: buckets.map((b) => [...b]), result: [...result], sorted: [...sorted].sort((a, b) => a - b), ...o });
  push({ i: -1, line: 1, note: `Empty unordered_set with ${B} buckets. std::hash<int> is the identity, so num goes to bucket num % ${B}.`, tone: "default" });
  nums.forEach((num, i) => {
    const b = ((num % B) + B) % B;
    const dup = buckets[b].includes(num);
    if (dup) {
      push({ i, b, num, line: 4, dup: true, note: `num = ${num}: bucket ${b} already holds ${num} → insert(${num}).second == false → skip.`, tone: "bad" });
    } else {
      buckets[b].push(num);
      result.push(num);
      sorted.add(num);
      push({ i, b, num, line: 5, note: `num = ${num}: not in bucket ${b} → inserted, .second == true → result.push_back(${num}).`, tone: "ok" });
    }
  });
  push({ i: nums.length, line: 7, done: true, note: `result keeps first-occurrence order: {${result.join(", ")}}. A std::set would iterate sorted: {${[...sorted].sort((a, b) => a - b).join(", ")}}; an unordered_set in bucket order.`, tone: "ok" });
  return out;
}

function buildBST(vals) {
  const nodes = [];
  const rec = (lo, hi, depth) => {
    if (lo > hi) return -1;
    const mid = (lo + hi) >> 1;
    const id = nodes.length;
    nodes.push({ v: vals[mid], idx: mid, depth, l: -1, r: -1 });
    nodes[id].l = rec(lo, mid - 1, depth + 1);
    nodes[id].r = rec(mid + 1, hi, depth + 1);
    return id;
  };
  rec(0, vals.length - 1, 0);
  return nodes;
}

function boundWalk(nodes, x, upper) {
  const out = [];
  let cur = nodes.length ? 0 : -1, cand = -1;
  const path = [];
  out.push({ cur, cand, path: [], note: `${upper ? "upper" : "lower"}_bound(${x}): smallest element ${upper ? ">" : "≥"} ${x}. Start at the root.`, tone: "default" });
  while (cur !== -1) {
    const n = nodes[cur];
    path.push(cur);
    const goLeft = upper ? n.v > x : n.v >= x;
    if (goLeft) cand = cur;
    out.push({ cur, cand, path: [...path], note: goLeft ? `${n.v} ${upper ? ">" : "≥"} ${x} → candidate! Something smaller might also qualify, go LEFT.` : `${n.v} ${upper ? "≤" : "<"} ${x} → too small, go RIGHT.`, tone: goLeft ? "ok" : "active" });
    cur = goLeft ? n.l : n.r;
  }
  out.push({ cur: -1, cand, path: [...path], done: true, note: cand >= 0 ? `Fell off the tree. Answer: ${nodes[cand].v} (walk ${path.map((p) => nodes[p].v).join("→")}), O(log N).` : `Fell off the tree with no candidate → returns s.end(): nothing is ${upper ? ">" : "≥"} ${x}.`, tone: cand >= 0 ? "ok" : "bad" });
  return out;
}

function BSTView({ nodes, step, n }) {
  const W = 560, H = 190;
  const xOf = (nd) => (n === 1 ? W / 2 : 40 + (nd.idx * (W - 80)) / (n - 1));
  const yOf = (nd) => 30 + nd.depth * 50;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {nodes.map((nd, id) =>
        [nd.l, nd.r].filter((c) => c >= 0).map((c) => (
          <line key={`${id}-${c}`} x1={xOf(nd)} y1={yOf(nd)} x2={xOf(nodes[c])} y2={yOf(nodes[c])} stroke={step.path.includes(c) && step.path.includes(id) ? C.active : C.border} strokeWidth={step.path.includes(c) && step.path.includes(id) ? 2.5 : 1.2} />
        ))
      )}
      {nodes.map((nd, id) => {
        const isCur = id === step.cur;
        const isCand = id === step.cand;
        const onPath = step.path.includes(id);
        const col = isCand ? C.ok : isCur ? C.active : onPath ? C.purple : C.ink;
        return (
          <g key={id}>
            <circle cx={xOf(nd)} cy={yOf(nd)} r={17} fill={col} fillOpacity={isCur || isCand ? 0.22 : 0.08} stroke={col} strokeWidth={isCur || isCand ? 2.2 : 1.2} />
            <text x={xOf(nd)} y={yOf(nd) + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.fg}>{nd.v}</text>
          </g>
        );
      })}
    </svg>
  );
}

const SET_PRESETS = { chapter: [3, 1, 2, 1, 3, 4, 2], runs: [1, 2, 2, 3, 3, 3, 4] };
const BST_PRESETS = { chapter: [10, 20, 30, 40], seven: [5, 12, 18, 25, 31, 40, 47] };

function SetVariant() {
  const [tab, setTab] = useState("dedup");
  const [preset, setPreset] = useState("chapter");
  const [custom, setCustom] = useState(null);
  const [bst, setBst] = useState("chapter");
  const [x, setX] = useState(25);
  const [upper, setUpper] = useState("upper");
  const nums = custom ?? SET_PRESETS[preset];
  const vals = BST_PRESETS[bst];
  const nodes = useMemo(() => buildBST(vals), [vals]);
  const B = 5;
  const steps = useMemo(() => (tab === "dedup" ? dedupSteps(nums, B) : boundWalk(nodes, x, upper === "upper")), [tab, nums, nodes, x, upper]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;

  return (
    <LabShell
      title="unordered_set vs set"
      description="Both store each value once. unordered_set answers “seen it?” in O(1); set keeps values sorted so it can answer “what's the next value ≥ x?” in O(log N)."
      badges={["insert().second", "dedupe", "lower_bound / upper_bound"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dedup">Dedupe with unordered_set</TabsTrigger>
          <TabsTrigger value="bounds">set bounds (BST walk)</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "dedup" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setPreset(v))}>
            <SelectTrigger className="w-56 font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SET_PRESETS).map(([k2, v]) => (
                <SelectItem key={k2} value={k2} className="font-mono text-[12.5px]">{`{${v.join(", ")}}`}</SelectItem>
              ))}
              {custom && <SelectItem value="custom">Random input</SelectItem>}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCustom(Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 9)))}>
            <Shuffle /> Random
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={bst} onValueChange={setBst}>
            <SelectTrigger className="w-56 font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BST_PRESETS).map(([k2, v]) => (
                <SelectItem key={k2} value={k2} className="font-mono text-[12.5px]">{`set {${v.join(", ")}}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={upper} onValueChange={(v) => v && setUpper(v)}>
            <ToggleGroupItem value="lower" className="font-mono">lower_bound (≥)</ToggleGroupItem>
            <ToggleGroupItem value="upper" className="font-mono">upper_bound (&gt;)</ToggleGroupItem>
          </ToggleGroup>
          <div className="w-48">
            <SliderControl label="x" value={x} min={0} max={50} onChange={setX} />
          </div>
        </div>
      )}
      {tab === "dedup" ? (
        <Split>
          <div className="space-y-3">
            <Stage className="space-y-3 p-3">
              <ArrayView values={nums} cellWidth={36} states={Object.fromEntries(nums.map((_, k2) => [k2, k2 === step.i ? (step.dup ? "bad" : "ok") : k2 < step.i ? "dim" : undefined]))} pointers={step.i >= 0 && step.i < nums.length ? [{ index: step.i, label: "num" }] : []} label="nums" />
              <div>
                <div className="mb-1 font-mono text-[11px] text-muted-foreground">unordered_set seen — {B} buckets (num % {B})</div>
                <div className="grid gap-1 sm:grid-cols-5">
                  {step.buckets.map((b, k2) => (
                    <div key={k2} className={cn("flex min-h-9 flex-wrap items-center gap-1 rounded-md border px-1.5 py-1", k2 === step.b && (step.dup ? "border-viz-bad bg-viz-bad/8" : "border-viz-ok bg-viz-ok/8"))}>
                      <span className="font-mono text-[10.5px] text-muted-foreground">[{k2}]</span>
                      {b.map((v) => (
                        <span key={v} className={chip(k2 === step.b && v === step.num ? (step.dup ? "bad" : "ok") : undefined)}>{v}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <ArrayView values={step.result.length ? step.result : ["∅"]} cellWidth={36} showIndex={false} label="vector<int> result (first-occurrence order)" states={{ [step.result.length - 1]: !step.dup && step.i >= 0 && step.i < nums.length ? "ok" : undefined }} />
            </Stage>
            <Narration tone={step.tone}>{step.note}</Narration>
          </div>
          <div className="space-y-3">
            <CodePanel code={DEDUP_CODE} active={step.line} />
            <VarTable
              vars={[
                ["num", step.num ?? "—", "active"],
                ["insert().second", step.num == null ? "—" : String(!step.dup), step.dup ? "bad" : "ok"],
                ["seen.size()", step.result.length],
                ["std::set order", `{${step.sorted.join(", ")}}`, "purple"],
              ]}
            />
          </div>
        </Split>
      ) : (
        <Split>
          <div className="space-y-3">
            <Stage className="p-2">
              <BSTView nodes={nodes} step={step} n={vals.length} />
            </Stage>
            <Legend items={[[C.active, "Current node"], [C.ok, "Best candidate so far"], [C.purple, "Path walked"]]} />
            <Narration tone={step.tone}>{step.note}</Narration>
          </div>
          <div className="space-y-3">
            <CodePanel
              code={`set<int> s = {${vals.join(", ")}};\nauto it = s.${upper}_bound(${x});\nif (it != s.end()) cout << *it;`}
              active={step.done ? 3 : 2}
            />
            <VarTable
              vars={[
                ["current node", step.cur >= 0 ? nodes[step.cur].v : "null", "active"],
                ["candidate", step.cand >= 0 ? nodes[step.cand].v : "none (end)", "ok"],
                ["nodes visited", step.path.length],
                ["also: s.count(x)", vals.includes(x) ? 1 : 0],
              ]}
            />
          </div>
        </Split>
      )}
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

/* ================================================================== */
/* variant "internals"                                                 */
/* ================================================================== */

const KEY_SETS = {
  animals: { label: "cat, dog, fox, owl, bee, ant, elk", keys: ["cat", "dog", "fox", "owl", "bee", "ant", "elk"] },
  anagrams: { label: "Anagram storm (cat, act, tac…)", keys: ["cat", "act", "tac", "dog", "god", "odg"] },
  names: { label: "Alice, Bob, Zack, Eve, Dan…", keys: ["Alice", "Bob", "Zack", "Eve", "Dan", "Liz", "Max", "Amy"] },
};
const HASHES = { sum: { label: "sum of chars (toy)", fn: sumHash }, poly: { label: "polynomial ×31", fn: polyHash } };

function internalsSteps(keys, M0, strat, hashKey, autoRehash, lookup) {
  const H = HASHES[hashKey].fn;
  const maxLF = strat === "chain" ? 1.0 : 0.7;
  let M = M0;
  let table = strat === "chain" ? Array.from({ length: M }, () => []) : Array(M).fill(null);
  let n = 0, collisions = 0, probes = 0;
  const inserted = [];
  const out = [];
  const snap = (o) => out.push({ table: strat === "chain" ? table.map((c) => [...c]) : [...table], M, n, collisions, probes, ...o });

  const place = (key, silent) => {
    const h = H(key), home = h % M;
    if (!silent) snap({ key, h, home, note: `hash("${key}") = ${h.toLocaleString()} → ${h.toLocaleString()} % ${M} = ${home}.`, tone: "active", phase: "hash" });
    if (strat === "chain") {
      const chain = table[home];
      for (let j = 0; j < chain.length; j++) {
        probes++;
        if (!silent) snap({ key, h, home, node: j, note: `Bucket ${home} is occupied: compare "${chain[j]}" with "${key}" → ${chain[j] === key ? "same key, update value" : "different key — collision, follow the chain"}.`, tone: chain[j] === key ? "ok" : "warn" });
        if (chain[j] === key) return true;
      }
      if (chain.length && !silent) collisions++;
      chain.push(key);
      n++;
      if (!silent) snap({ key, h, home, node: chain.length - 1, placed: true, note: chain.length > 1 ? `Appended "${key}" to bucket ${home}'s chain (length ${chain.length}). Separate chaining never runs out of room — chains just grow.` : `Bucket ${home} was empty → "${key}" stored directly. O(1).`, tone: "ok" });
      return true;
    }
    let j = home, tries = 0;
    while (table[j] !== null && tries < M) {
      probes++;
      if (table[j] === key) {
        if (!silent) snap({ key, h, home, slot: j, note: `Slot ${j} already holds "${key}" → update.`, tone: "ok" });
        return true;
      }
      if (!silent) {
        collisions++;
        snap({ key, h, home, slot: j, note: `Slot ${j} is taken by "${table[j]}" → collision! Linear probe to slot ${(j + 1) % M}.`, tone: "warn" });
      }
      j = (j + 1) % M;
      tries++;
    }
    if (table[j] !== null) {
      if (!silent) snap({ key, h, home, note: `Every slot is full — open addressing cannot insert "${key}" without rehashing!`, tone: "bad" });
      return false;
    }
    table[j] = key;
    n++;
    if (!silent) snap({ key, h, home, slot: j, placed: true, note: j === home ? `Slot ${j} is empty → "${key}" stored. O(1).` : `Found an empty slot at ${j}, ${(j - home + M) % M} step(s) from home. Clusters make later probes longer.`, tone: "ok" });
    return true;
  };

  snap({ note: `Empty table, ${M} ${strat === "chain" ? "buckets (each a linked list)" : "slots (one key each)"}. Insert ${keys.length} keys.`, tone: "default" });
  for (const key of keys) {
    if (place(key, false)) inserted.push(key);
    if (autoRehash && n / M > maxLF && M * 2 <= 24) {
      const old = M;
      M *= 2;
      table = strat === "chain" ? Array.from({ length: M }, () => []) : Array(M).fill(null);
      n = 0;
      for (const k2 of inserted) place(k2, true);
      snap({ note: `Load factor ${(inserted.length / old).toFixed(2)} > ${maxLF} → REHASH: allocate ${M} slots and re-insert all ${inserted.length} keys (indices change because % ${M} ≠ % ${old}). O(N) once, amortized O(1).`, tone: "purple", rehash: true });
    }
  }
  // lookup
  const h = H(lookup), home = h % M;
  snap({ key: lookup, h, home, lookup: true, note: `LOOKUP "${lookup}": hash = ${h.toLocaleString()} → index ${home}.`, tone: "active", phase: "hash" });
  if (strat === "chain") {
    const chain = table[home];
    for (let j = 0; j < chain.length; j++) {
      const hit = chain[j] === lookup;
      snap({ key: lookup, h, home, node: j, lookup: true, found: hit, note: `Compare "${chain[j]}" ${hit ? "==" : "≠"} "${lookup}"${hit ? " → FOUND!" : " → next node"}.`, tone: hit ? "ok" : "warn", done: hit });
      if (hit) return out;
    }
    snap({ key: lookup, h, home, lookup: true, note: `End of bucket ${home}'s chain → "${lookup}" is not in the table.`, tone: "bad", done: true });
  } else {
    let j = home, tries = 0;
    while (table[j] !== null && tries < M) {
      const hit = table[j] === lookup;
      snap({ key: lookup, h, home, slot: j, lookup: true, found: hit, note: `Slot ${j}: "${table[j]}" ${hit ? `== "${lookup}" → FOUND!` : `≠ "${lookup}" → probe ${(j + 1) % M}`}`, tone: hit ? "ok" : "warn", done: hit });
      if (hit) return out;
      j = (j + 1) % M;
      tries++;
    }
    snap({ key: lookup, h, home, slot: tries < M ? j : undefined, lookup: true, note: tries < M ? `Slot ${j} is empty → stop: "${lookup}" is not in the table (an empty slot ends every probe sequence).` : `Probed every slot — not found.`, tone: "bad", done: true });
  }
  return out;
}

function InternalsVariant() {
  const [set, setSet] = useState("anagrams");
  const [M, setM] = useState(4);
  const [strat, setStrat] = useState("chain");
  const [hash, setHash] = useState("sum");
  const [auto, setAuto] = useState(false);
  const keys = KEY_SETS[set].keys;
  const [lookup, setLookup] = useState("god");
  const lk = keys.includes(lookup) || lookup === "zebra" ? lookup : keys[1];
  const steps = useMemo(() => internalsSteps(keys, M, strat, hash, auto, lk), [keys, M, strat, hash, auto, lk]);
  const st = useStepper(steps, { baseMs: 900 });
  const s = st.step;
  const lf = s.n / s.M;
  const longest = strat === "chain" ? Math.max(0, ...s.table.map((c) => c.length)) : (() => {
    let best = 0, run = 0;
    for (const v of [...s.table, ...s.table]) best = Math.max(best, (run = v !== null ? run + 1 : 0));
    return Math.min(best, s.M);
  })();
  const code = strat === "chain"
    ? `size_t idx = hash(key) % bucket_count;
for (Node* n = buckets[idx]; n; n = n->next)
    if (n->key == key) return n;     // found
buckets[idx].push_back({key, value}); // append to chain`
    : `size_t idx = hash(key) % table_size;
while (table[idx].occupied) {
    if (table[idx].key == key) return idx;   // found
    idx = (idx + 1) % table_size;            // linear probe
}
table[idx] = {key, value};                   // empty slot`;
  const line = (() => {
    if (s.phase === "hash") return 1;
    if (s.found) return 3;
    if (strat === "chain") return s.placed ? 4 : s.node != null ? 3 : s.done ? 2 : undefined;
    if (s.placed) return 5;
    if (s.slot != null) return s.done ? 2 : s.tone === "ok" ? 3 : 4;
    return undefined;
  })();

  return (
    <LabShell
      title="Hash Table Internals — Collisions Up Close"
      description="Key → hash function → index. When two keys land on the same index, chaining links them into a list; linear probing walks to the next free slot."
      badges={["separate chaining", "linear probing", "load factor α = n / m"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={strat} onValueChange={(v) => v && setStrat(v)}>
          <ToggleGroupItem value="chain">Separate chaining</ToggleGroupItem>
          <ToggleGroupItem value="probe">Linear probing</ToggleGroupItem>
        </ToggleGroup>
        <Select value={set} onValueChange={setSet}>
          <SelectTrigger className="w-60 text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KEY_SETS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-[12.5px]">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hash} onValueChange={setHash}>
          <SelectTrigger className="w-56 text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(HASHES).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-[12.5px]">hash = {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            {s.key && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
                <Badge variant={s.lookup ? "purple" : "active"}>{s.lookup ? "lookup" : "insert"}</Badge>
                "{s.key}" <ArrowRight className="size-3" /> hash = {s.h.toLocaleString()} <ArrowRight className="size-3" /> % {s.M} = <b className="text-viz-active">{s.home}</b>
              </div>
            )}
            <div className={cn("grid gap-1", s.M > 12 && "sm:grid-cols-2")}>
              {Array.from({ length: s.M }, (_, i) => {
                const isHome = i === s.home;
                if (strat === "chain") {
                  const chain = s.table[i];
                  return (
                    <div key={i} className={cn("flex min-h-8 flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5", isHome && "bg-viz-active/8 ring-1 ring-viz-active/40")}>
                      <span className={cn("w-8 shrink-0 font-mono text-[11px]", isHome ? "font-semibold text-viz-active" : "text-muted-foreground")}>[{i}]</span>
                      {chain.length === 0 && <span className="text-[11px] text-muted-foreground/60">∅</span>}
                      {chain.map((k, j) => (
                        <Fragment key={k + j}>
                          {j > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
                          <span className={chip(isHome && j === s.node ? (s.placed || s.found ? "ok" : s.tone === "bad" ? "bad" : "warn") : chain.length > 1 ? "bad" : undefined)}>{k}</span>
                        </Fragment>
                      ))}
                    </div>
                  );
                }
                const v = s.table[i];
                const isSlot = i === s.slot;
                return (
                  <div key={i} className={cn("flex min-h-8 items-center gap-2 rounded-md px-1.5 py-0.5", isHome && "bg-viz-active/8 ring-1 ring-viz-active/40")}>
                    <span className={cn("w-8 shrink-0 font-mono text-[11px]", isHome ? "font-semibold text-viz-active" : "text-muted-foreground")}>[{i}]</span>
                    {v === null ? (
                      <span className={cn(chip(isSlot ? (s.tone === "bad" ? "bad" : "active") : undefined), "border-dashed font-normal text-muted-foreground")}>empty</span>
                    ) : (
                      <span className={chip(isSlot ? (s.placed || s.found ? "ok" : "warn") : undefined)}>{v}</span>
                    )}
                    {v !== null && HASHES[hash].fn(v) % s.M !== i && <span className="text-[10.5px] text-viz-warn">home {HASHES[hash].fn(v) % s.M}</span>}
                  </div>
                );
              })}
            </div>
          </Stage>
          <Legend items={[[C.active, "Home index"], [C.warn, "Collision / probe"], [C.ok, "Placed / found"], [C.bad, strat === "chain" ? "Bucket with a chain" : "Not found / full"]]} />
          <Narration tone={s.tone === "purple" ? "warn" : s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Table">
            <SliderControl label="initial size m" value={M} min={4} max={12} onChange={setM} />
            <SwitchControl label={`Auto-rehash when α > ${strat === "chain" ? "1.0" : "0.7"}`} checked={auto} onChange={setAuto} id="hash-auto" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] text-muted-foreground">Lookup key</span>
              <Select value={lk} onValueChange={setLookup}>
                <SelectTrigger className="w-32 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...keys, "zebra"].map((k) => (
                    <SelectItem key={k} value={k} className="font-mono">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Panel>
          <CodePanel code={code} active={line} />
          <StatGrid cols={2}>
            <Stat label="load factor α" value={lf.toFixed(2)} tone={lf > (strat === "chain" ? 1 : 0.7) ? "bad" : "ok"} />
            <Stat label="collisions" value={s.collisions} tone="warn" />
            <Stat label={strat === "chain" ? "longest chain" : "longest cluster"} value={longest} tone={longest > 2 ? "bad" : undefined} />
            <Stat label="key comparisons" value={s.probes} />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

/* ================================================================== */
/* variant "patterns"                                                  */
/* ================================================================== */

const TWO_CODE = {
  hash: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;          // value → index
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement))
            return {seen[complement], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
  brute: `vector<int> twoSum(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++)
        for (int j = i + 1; j < nums.size(); j++)
            if (nums[i] + nums[j] == target)
                return {i, j};
    return {};
}`,
};

function twoSumSteps(nums, target, impl) {
  const out = [];
  if (impl === "brute") {
    let ops = 0;
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++) {
        ops++;
        const hit = nums[i] + nums[j] === target;
        out.push({ i, j, ops, seen: [], line: hit ? 5 : 4, note: `nums[${i}] + nums[${j}] = ${nums[i]} + ${nums[j]} = ${nums[i] + nums[j]}${hit ? ` == ${target} → return {${i}, ${j}}.` : ` ≠ ${target}.`}`, tone: hit ? "ok" : "default", ans: hit ? [i, j] : null, done: hit });
        if (hit) return out;
      }
    out.push({ i: -1, ops, seen: [], line: 6, note: `Checked all ${ops} pairs (O(N²)) — no solution.`, tone: "bad", done: true });
    return out;
  }
  const seen = new Map();
  let ops = 0;
  out.push({ i: -1, ops, seen: [], line: 2, note: `seen maps value → index. One pass: for each x, ask "have I already seen target − x?"`, tone: "default" });
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    ops++;
    const hit = seen.has(comp);
    out.push({ i, comp, ops, seen: [...seen], look: comp, hit, line: hit ? 6 : 5, note: hit ? `complement = ${target} − ${nums[i]} = ${comp} IS in seen (index ${seen.get(comp)}) → return {${seen.get(comp)}, ${i}}.` : `complement = ${target} − ${nums[i]} = ${comp} — not in seen.`, tone: hit ? "ok" : "active", ans: hit ? [seen.get(comp), i] : null, done: hit });
    if (hit) return out;
    seen.set(nums[i], i);
    out.push({ i, comp, ops, seen: [...seen], added: nums[i], line: 7, note: `Store seen[${nums[i]}] = ${i} so a later element can pair with it.`, tone: "purple" });
  }
  out.push({ i: -1, ops, seen: [...seen], line: 9, note: `End of array — no pair sums to ${target}.`, tone: "bad", done: true });
  return out;
}

const FREQ_CODE = `unordered_map<char, int> count;
for (char c : s)
    count[c]++;                    // missing key starts at 0

char best = 0; int maxCount = 0;
for (auto& [c, cnt] : count)
    if (cnt > maxCount) { maxCount = cnt; best = c; }`;

function freqSteps(s) {
  const count = new Map();
  const out = [];
  out.push({ i: -1, map: [], line: 1, note: "Empty map. count[c]++ inserts c with 0 the first time, then increments.", tone: "default" });
  [...s].forEach((c, i) => {
    const fresh = !count.has(c);
    count.set(c, (count.get(c) ?? 0) + 1);
    out.push({ i, map: [...count], key: c, line: 3, note: `'${c}': ${fresh ? "new key → 0, then ++ → 1" : `count['${c}'] → ${count.get(c)}`}.`, tone: fresh ? "active" : "ok" });
  });
  let best = null, max = 0;
  for (const [c, cnt] of count) {
    const better = cnt > max;
    if (better) {
      max = cnt;
      best = c;
    }
    out.push({ i: s.length, map: [...count], key: c, best, max, line: 7, note: `Scan: '${c}' has ${cnt}${better ? ` > previous max → best = '${c}'` : ` ≤ ${max}`}.`, tone: better ? "ok" : "default" });
  }
  out.push({ i: s.length, map: [...count], best, max, line: 7, note: `Most frequent: '${best}' × ${max}. Two O(N) passes, O(K) extra space for K distinct keys.`, tone: "ok", done: true });
  return out;
}

const TWO_PRESETS = {
  chapter: { label: "[2, 7, 11, 15], target 9", nums: [2, 7, 11, 15], t: 9 },
  mid: { label: "[3, 2, 4], target 6", nums: [3, 2, 4], t: 6 },
  dup: { label: "[3, 3], target 6", nums: [3, 3], t: 6 },
  late: { label: "[1, 5, 3, 8, 2, 9], target 11", nums: [1, 5, 3, 8, 2, 9], t: 11 },
};

function PatternsVariant() {
  const [tab, setTab] = useState("two");
  const [preset, setPreset] = useState("chapter");
  const [custom, setCustom] = useState(null);
  const [impl, setImpl] = useState("hash");
  const [word, setWord] = useState("mississippi");
  const cfg = custom ?? TWO_PRESETS[preset];
  const [target, setTarget] = useState(null);
  const t = target ?? cfg.t;
  const steps = useMemo(() => (tab === "two" ? twoSumSteps(cfg.nums, t, impl) : freqSteps(word || "a")), [tab, cfg, t, impl, word]);
  const st = useStepper(steps, { baseMs: 900 });
  const s = st.step;
  const randomize = () => {
    const nums = Array.from({ length: 7 }, () => 1 + Math.floor(Math.random() * 15));
    const a = Math.floor(Math.random() * 7);
    let b = Math.floor(Math.random() * 7);
    if (b === a) b = (a + 3) % 7;
    setCustom({ label: "Random", nums, t: nums[a] + nums[b] });
    setTarget(null);
  };
  const states = {};
  if (tab === "two") {
    cfg.nums.forEach((_, k) => {
      if (s.ans?.includes(k)) states[k] = "ok";
      else if (k === s.i) states[k] = "active";
      else if (k === s.j) states[k] = "purple";
      else if (impl === "hash" && s.i >= 0 && k < s.i) states[k] = "dim";
    });
  }

  return (
    <LabShell
      title="Hashing Patterns — Complement Lookup & Frequency Count"
      description="Trade O(N) memory for speed: remember what you've seen in a hash map so each new element can ask an O(1) question instead of rescanning."
      badges={["Two Sum O(N)", "count[x]++", "space-for-time"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="two">Two Sum (complement)</TabsTrigger>
          <TabsTrigger value="freq">Frequency count</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "two" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setPreset(v), setTarget(null))}>
            <SelectTrigger className="w-60 font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TWO_PRESETS).map(([k, p]) => (
                <SelectItem key={k} value={k} className="font-mono text-[12.5px]">{p.label}</SelectItem>
              ))}
              {custom && <SelectItem value="custom">Random input</SelectItem>}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={randomize}>
            <Shuffle /> Random
          </Button>
          <div className="w-44">
            <SliderControl label="target" value={t} min={0} max={30} onChange={setTarget} />
          </div>
          <Tabs value={impl} onValueChange={setImpl} className="ml-auto">
            <TabsList>
              <TabsTrigger value="brute">Brute force O(N²)</TabsTrigger>
              <TabsTrigger value="hash">One-pass hash O(N)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={["mississippi", "hello", "banana", "aabbbcccc"].includes(word) ? word : "custom"} onValueChange={(v) => v !== "custom" && setWord(v)}>
            <SelectTrigger className="w-44 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["mississippi", "hello", "banana", "aabbbcccc"].map((w) => (
                <SelectItem key={w} value={w} className="font-mono">"{w}"</SelectItem>
              ))}
              {!["mississippi", "hello", "banana", "aabbbcccc"].includes(word) && <SelectItem value="custom">custom</SelectItem>}
            </SelectContent>
          </Select>
          <input className={cn(INPUT, "w-40")} value={word} onChange={(e) => setWord(e.target.value.replace(/\s/g, "").slice(0, 14))} aria-label="String" />
        </div>
      )}
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-3 p-4">
            {tab === "two" ? (
              <>
                <ArrayView values={cfg.nums} states={states} pointers={[...(s.i >= 0 ? [{ index: s.i, label: "i" }] : []), ...(s.j != null ? [{ index: s.j, label: "j", tone: "purple" }] : [])]} label={`nums, target = ${t}`} />
                {impl === "hash" && (
                  <div>
                    <div className="mb-1 font-mono text-[11px] text-muted-foreground">unordered_map&lt;int,int&gt; seen (value → index)</div>
                    <div className="flex min-h-9 flex-wrap gap-1.5">
                      {s.seen.length === 0 && <span className="text-[12px] text-muted-foreground">{"{ }"}</span>}
                      {s.seen.map(([v, idx]) => (
                        <span key={v} className={chip(s.hit && v === s.look ? "ok" : v === s.added ? "purple" : undefined)}>
                          {v} → {idx}
                        </span>
                      ))}
                      {s.look != null && !s.hit && <span className={cn(chip("bad"), "border-dashed")}>{s.look}?</span>}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <ArrayView values={[...(word || "a")]} cellWidth={34} states={Object.fromEntries([...(word || "a")].map((c, k) => [k, k === s.i ? "active" : k < s.i ? (c === s.best && s.done ? "ok" : "dim") : undefined]))} pointers={s.i >= 0 && s.i < word.length ? [{ index: s.i, label: "c" }] : []} />
                <div className="space-y-1">
                  {s.map.map(([c, cnt]) => (
                    <div key={c} className="flex items-center gap-2">
                      <span className={cn("w-8 font-mono text-[12px]", c === s.key && "font-semibold text-viz-active")}>'{c}'</span>
                      <div className="h-4 rounded-sm bg-viz-active/60 transition-all duration-200" style={{ width: `${cnt * 22}px`, background: c === s.best ? C.ok : c === s.key ? C.active : C.ink, opacity: c === s.best || c === s.key ? 0.85 : 0.35 }} />
                      <span className="font-mono text-[12px] tabular-nums">{cnt}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Stage>
          <Narration tone={s.tone === "purple" ? "default" : s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={tab === "two" ? TWO_CODE[impl] : FREQ_CODE} active={s.line} />
          {tab === "two" ? (
            <VarTable
              vars={[
                ["i", s.i >= 0 ? s.i : "—", "active"],
                ...(impl === "brute" ? [["j", s.j ?? "—", "purple"]] : [["complement", s.comp ?? "—", "warn"], ["seen.size()", s.seen.length]]),
                ["operations", s.ops],
                ["answer", s.ans ? `{${s.ans.join(", ")}}` : s.done ? "{}" : "…", s.ans ? "ok" : s.done ? "bad" : undefined],
              ]}
            />
          ) : (
            <VarTable vars={[["distinct keys", s.map.length, "active"], ["best", s.best != null ? `'${s.best}'` : "—", "ok"], ["maxCount", s.max ?? "—", "ok"]]} />
          )}
          {tab === "two" && (
            <ScrollArea className="h-24 rounded-md border">
              <div className="p-2 text-[12px] text-muted-foreground">
                Brute force checks up to N(N−1)/2 pairs. The hash version visits each element once and does an O(1) average lookup, trading O(N) memory for O(N) time. Note it stores nums[i] <i>after</i> checking, so an element never pairs with itself — that's why [3, 3] works.
              </div>
            </ScrollArea>
          )}
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

export default function HashLab({ variant = "map" }) {
  if (variant === "set") return <SetVariant />;
  if (variant === "internals") return <InternalsVariant />;
  if (variant === "patterns") return <PatternsVariant />;
  return <MapVariant />;
}
