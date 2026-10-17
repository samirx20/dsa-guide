import { useMemo, useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper,
} from "@/viz/kit";

const lineOf = (code, s) => code.split("\n").findIndex((l) => l.includes(s)) + 1;

/* ================================================================== */
/* variant "pairs"                                                     */
/* ================================================================== */

const PAIR_PRESETS = {
  students: { label: "Chapter: 3 students", v: [[90, "Alice"], [85, "Bob"], [90, "Charlie"]] },
  ties: { label: "Lots of ties", v: [[90, "Eve"], [85, "Bob"], [90, "Alice"], [70, "Dan"], [85, "Ann"], [90, "Charlie"]] },
};
const NAMES = ["Alice", "Bob", "Cara", "Dan", "Eve", "Finn", "Gus", "Hana"];

const q = (s) => `"${s}"`;
const CMPS = {
  lex: {
    label: "default operator<",
    code: `// pair's operator< : compare .first, tie → .second
sort(v.begin(), v.end());`,
    fn: (a, b) => (a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1]),
    why: (a, b) =>
      a[0] !== b[0]
        ? { field: 0, text: `.first decides: ${a[0]} ${a[0] < b[0] ? "<" : ">"} ${b[0]}` }
        : { field: 1, text: `tie on .first (${a[0]} == ${b[0]}) → compare .second: ${q(a[1])} ${a[1] < b[1] ? "<" : a[1] === b[1] ? "==" : ">"} ${q(b[1])}` },
  },
  second: {
    label: "lambda: by .second",
    code: `sort(v.begin(), v.end(), [](const auto& a, const auto& b) {
    return a.second < b.second;   // name only
});`,
    fn: (a, b) => a[1] < b[1],
    why: (a, b) => ({ field: 1, text: `only .second matters: ${q(a[1])} ${a[1] < b[1] ? "<" : a[1] === b[1] ? "==" : ">"} ${q(b[1])}` }),
  },
  desc: {
    label: "lambda: score desc, name asc",
    code: `sort(v.begin(), v.end(), [](const auto& a, const auto& b) {
    if (a.first != b.first) return a.first > b.first;
    return a.second < b.second;
});`,
    fn: (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] < b[1]),
    why: (a, b) =>
      a[0] !== b[0]
        ? { field: 0, text: `scores differ: ${a[0]} ${a[0] > b[0] ? ">" : "<"} ${b[0]} (higher score first)` }
        : { field: 1, text: `same score ${a[0]} → name ascending: ${q(a[1])} ${a[1] < b[1] ? "<" : ">"} ${q(b[1])}` },
  },
};

/** Insertion sort (what std::sort does on tiny ranges) recording every comparator call, then a structured-binding loop. */
function pairSortSteps(input, cmpKey) {
  const cmp = CMPS[cmpKey];
  const v = input.map((p) => [...p]);
  const s = [];
  let calls = 0, swaps = 0;
  const snap = (o) => s.push({ v: v.map((p) => [...p]), calls, swaps, ...o });
  snap({ phase: "start", sorted: 0, note: "Unsorted input. For small ranges std::sort falls back to insertion sort, so here is every comparator call it makes.", tone: "default" });
  for (let i = 1; i < v.length; i++) {
    let j = i;
    while (j > 0) {
      calls++;
      const before = cmp.fn(v[j], v[j - 1]);
      const why = cmp.why(v[j], v[j - 1]);
      snap({ phase: "cmp", a: j, b: j - 1, field: why.field, sorted: i, note: `cmp(${fmtPair(v[j])}, ${fmtPair(v[j - 1])}): ${why.text} → ${before ? "true: it must move left" : "false: it stays"}.`, tone: before ? "warn" : "active" });
      if (!before) break;
      [v[j], v[j - 1]] = [v[j - 1], v[j]];
      swaps++;
      snap({ phase: "swap", a: j - 1, b: j, sorted: i, note: `Swap → ${fmtPair(v[j - 1])} now sits before ${fmtPair(v[j])}.`, tone: "warn" });
      j--;
    }
  }
  snap({ phase: "sorted", sorted: v.length, note: `Sorted with ${calls} comparator calls and ${swaps} swaps.`, tone: "ok" });
  v.forEach((p, k) => snap({ phase: "bind", k, sorted: v.length, note: `const auto& [score, name] = v[${k}] → score = ${p[0]}, name = ${q(p[1])}. No .first / .second needed.`, tone: "ok", done: k === v.length - 1 }));
  return s;
}
const fmtPair = (p) => `{${p[0]}, ${q(p[1])}}`;

function PairCards({ step }) {
  return (
    <div className="flex flex-wrap gap-2">
      {step.v.map((p, k) => {
        const cmp = step.phase === "cmp" && (k === step.a || k === step.b);
        const swp = step.phase === "swap" && (k === step.a || k === step.b);
        const bind = step.phase === "bind" && k === step.k;
        const done = step.phase === "sorted" || step.phase === "bind";
        return (
          <div key={k} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex overflow-hidden rounded-md border font-mono text-[13px] transition-all duration-200",
                cmp && "border-viz-active ring-2 ring-viz-active/30",
                swp && "border-viz-warn ring-2 ring-viz-warn/30",
                bind && "border-viz-ok ring-2 ring-viz-ok/30",
                !cmp && !swp && !bind && (done || k < step.sorted) && "border-viz-ok/40"
              )}
            >
              <span className={cn("px-2 py-1.5 font-semibold tabular-nums", cmp && step.field === 0 ? "bg-viz-active/20 text-viz-active" : "bg-muted/60")}>{p[0]}</span>
              <span className={cn("px-2 py-1.5", cmp && step.field === 1 ? "bg-viz-active/20 text-viz-active" : "bg-card")}>{q(p[1])}</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">{k}</div>
            {bind && (
              <div className="flex gap-1">
                <Badge variant="success">score</Badge>
                <Badge variant="success">name</Badge>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PairsVariant() {
  const [preset, setPreset] = useState("ties");
  const [custom, setCustom] = useState(null);
  const [cmp, setCmp] = useState("lex");
  const input = custom ?? PAIR_PRESETS[preset].v;
  const steps = useMemo(() => pairSortSteps(input, cmp), [input, cmp]);
  const st = useStepper(steps, { baseMs: 1100 });
  const step = st.step;
  const code = `vector<pair<int, string>> v = {${input.map(fmtPair).join(", ")}};\n${CMPS[cmp].code}\n\nfor (const auto& [score, name] : v)\n    cout << name << ": " << score << "\\n";`;
  const sortLines = CMPS[cmp].code.split("\n").map((_, k) => k + 2);
  const active = step.phase === "bind" ? [lineOf(code, "for (const"), lineOf(code, "cout")] : step.phase === "start" ? 1 : sortLines.filter((l) => !code.split("\n")[l - 1].trim().startsWith("//"));
  const randomize = () => {
    const n = 5 + Math.floor(Math.random() * 3);
    setCustom(Array.from({ length: n }, () => [[70, 80, 90][Math.floor(Math.random() * 3)], NAMES[Math.floor(Math.random() * NAMES.length)]]));
  };
  return (
    <LabShell
      title="pair Comparison & Custom Comparators"
      description="Pairs compare lexicographically — .first, then .second on a tie. Swap in a lambda to change the order, then unpack with structured bindings."
      badges={["pair<int, string>", "lambda comparator", "auto [a, b]"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setPreset(v))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAIR_PRESETS).map(([k, p]) => (
              <SelectItem key={k} value={k}>{p.label}</SelectItem>
            ))}
            {custom && <SelectItem value="custom">Random input</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={randomize}>
          <Shuffle /> Random
        </Button>
        <Tabs value={cmp} onValueChange={setCmp} className="ml-auto">
          <TabsList>
            {Object.entries(CMPS).map(([k, c]) => (
              <TabsTrigger key={k} value={k} className="font-mono text-[12px]">{c.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-4">
            <PairCards step={step} />
          </Stage>
          <Legend items={[[C.active, "Being compared (field that decides)"], [C.warn, "Swapped"], [C.ok, "Sorted / bound"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={code} active={active} />
          <VarTable
            vars={[
              ["comparator calls", step.calls, "active"],
              ["swaps", step.swaps, "warn"],
              ...(step.phase === "bind" ? [["score", step.v[step.k][0], "ok"], ["name", q(step.v[step.k][1]), "ok"]] : [["sorted prefix", `[0..${Math.max(step.sorted - 1, 0)}]`]]),
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

/* ================================================================== */
/* variant "stack-queue"                                               */
/* ================================================================== */

function Cell({ v, tone }) {
  return (
    <div
      className={cn(
        "flex h-9 min-w-9 items-center justify-center rounded-md border bg-card px-1.5 font-mono text-[13px] font-semibold tabular-nums transition-all duration-200",
        tone === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
        tone === "ok" && "border-viz-ok bg-viz-ok/15 text-viz-ok",
        tone === "purple" && "border-viz-purple bg-viz-purple/15 text-viz-purple"
      )}
    >
      {v}
    </div>
  );
}

function SideBySide() {
  const init = { stack: [10, 20, 30], queue: [10, 20, 30], deque: [10, 20, 30] };
  const [c, setC] = useState(init);
  const [next, setNext] = useState(40);
  const [out, setOut] = useState({ stack: [], queue: [], deque: [] });
  const [msg, setMsg] = useState({ text: "Same pushes, different pops: stack is LIFO, queue is FIFO, deque lets you choose either end.", tone: "default" });
  const [last, setLast] = useState(null);

  const pushAll = () => {
    setC((o) => ({ stack: [...o.stack, next], queue: [...o.queue, next], deque: [...o.deque, next] }));
    setLast({ kind: "push", v: next });
    setMsg({ text: `st.push(${next}) puts it on top; q.push(${next}) joins the back of the line; dq.push_back(${next}) also goes to the back. All O(1).`, tone: "active" });
    setNext((n) => n + 10);
  };
  const popAll = () => {
    if (!c.stack.length || !c.queue.length) return setMsg({ text: "Calling top()/front()/pop() on an empty container is undefined behaviour — always check empty() first.", tone: "bad" });
    const sv = c.stack.at(-1), qv = c.queue[0];
    setC((o) => ({ ...o, stack: o.stack.slice(0, -1), queue: o.queue.slice(1) }));
    setOut((o) => ({ ...o, stack: [...o.stack, sv], queue: [...o.queue, qv] }));
    setLast({ kind: "pop", s: sv, q: qv });
    setMsg({ text: `st.top() = ${sv} (last in, first out) vs q.front() = ${qv} (first in, first out). Note: pop() returns void — read top()/front() before popping.`, tone: "ok" });
  };
  const dq = (op) => {
    const d = c.deque;
    if (op.startsWith("pop") && !d.length) return setMsg({ text: `dq.${op}() on an empty deque is undefined behaviour.`, tone: "bad" });
    let nd, text, popped;
    if (op === "push_front") { nd = [next, ...d]; text = `dq.push_front(${next}) — O(1) at the front, which vector can't do cheaply.`; setNext((n) => n + 10); }
    if (op === "push_back") { nd = [...d, next]; text = `dq.push_back(${next}) — O(1).`; setNext((n) => n + 10); }
    if (op === "pop_front") { popped = d[0]; nd = d.slice(1); text = `dq.pop_front() removed ${popped} — the deque behaved like a queue.`; }
    if (op === "pop_back") { popped = d.at(-1); nd = d.slice(0, -1); text = `dq.pop_back() removed ${popped} — the deque behaved like a stack.`; }
    setC((o) => ({ ...o, deque: nd }));
    if (popped != null) setOut((o) => ({ ...o, deque: [...o.deque, popped] }));
    setLast({ kind: op });
    setMsg({ text, tone: "active" });
  };
  const reset = () => {
    setC(init);
    setNext(40);
    setOut({ stack: [], queue: [], deque: [] });
    setLast(null);
    setMsg({ text: "Reset to 10, 20, 30 pushed in that order.", tone: "default" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={pushAll}>push({next}) to stack & queue & deque</Button>
        <Button size="sm" variant="outline" onClick={popAll}>pop() stack & queue</Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <Panel title="stack<int> st (LIFO)">
              <div className="flex min-h-48 flex-col-reverse items-center justify-start gap-1 rounded-md border border-dashed border-t-0 px-3 pb-1 pt-2">
                {c.stack.map((v, k) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <Cell v={v} tone={k === c.stack.length - 1 ? "active" : undefined} />
                    {k === c.stack.length - 1 && <Badge variant="active">top</Badge>}
                  </div>
                ))}
                {!c.stack.length && <span className="text-[11px] text-muted-foreground">empty</span>}
              </div>
            </Panel>
            <div className="space-y-3">
              <Panel title="queue<int> q (FIFO)">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-[11px] text-muted-foreground">out ←</span>
                  {c.queue.map((v, k) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <Cell v={v} tone={k === 0 ? "ok" : k === c.queue.length - 1 ? "active" : undefined} />
                      <span className="h-3 text-[10px] text-muted-foreground">{k === 0 ? "front" : k === c.queue.length - 1 ? "back" : ""}</span>
                    </div>
                  ))}
                  {!c.queue.length && <span className="text-[11px] text-muted-foreground">empty</span>}
                  <span className="ml-1 text-[11px] text-muted-foreground">← in</span>
                </div>
              </Panel>
              <Panel title="deque<int> dq (both ends)">
                <div className="flex flex-wrap items-center gap-1">
                  {c.deque.map((v, k) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <Cell v={v} tone={k === 0 || k === c.deque.length - 1 ? "purple" : undefined} />
                      <span className="h-3 text-[10px] text-muted-foreground">{k === 0 ? "front" : k === c.deque.length - 1 ? "back" : ""}</span>
                    </div>
                  ))}
                  {!c.deque.length && <span className="text-[11px] text-muted-foreground">empty</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {["push_front", "push_back", "pop_front", "pop_back"].map((op) => (
                    <Button key={op} size="xs" variant="outline" className="font-mono" onClick={() => dq(op)}>
                      {op}
                    </Button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
          <Narration tone={msg.tone}>{msg.text}</Narration>
        </div>
        <div className="space-y-3">
          <VarTable
            title="Accessor"
            vars={[
              ["st.top()", c.stack.at(-1) ?? "UB (empty)", "active"],
              ["q.front()", c.queue[0] ?? "UB (empty)", "ok"],
              ["q.back()", c.queue.at(-1) ?? "UB (empty)"],
              ["dq.front() / dq.back()", c.deque.length ? `${c.deque[0]} / ${c.deque.at(-1)}` : "UB (empty)", "purple"],
              ["sizes", `${c.stack.length} / ${c.queue.length} / ${c.deque.length}`],
            ]}
          />
          <Panel title="Pop order so far">
            <div className="space-y-1 font-mono text-[12px]">
              <div><span className="text-muted-foreground">stack: </span>{out.stack.join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">queue: </span>{out.queue.join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">deque: </span>{out.deque.join(", ") || "—"}</div>
            </div>
            {last?.kind === "pop" && <p className="text-[11.5px] text-muted-foreground">Same input order — the stack reversed it, the queue preserved it.</p>}
          </Panel>
        </div>
      </Split>
    </div>
  );
}

const PAREN_CODE = `bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.empty()) return false;
            char top = st.top();
            if (matches(top, c)) st.pop();
            else return false;
        }
    }
    return st.empty();
}`;
const PAIRS = { ")": "(", "]": "[", "}": "{" };

function parenSteps(s) {
  const st = [];
  const out = [];
  const snap = (i, line, note, tone, extra = {}) => out.push({ i, st: [...st], line, note, tone, ...extra });
  snap(-1, 2, `Scan "${s}" left to right with an empty stack.`, "default");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("([{".includes(c)) {
      st.push(c);
      snap(i, 5, `'${c}' opens → push. It must be closed before anything pushed earlier.`, "active");
    } else {
      if (!st.length) {
        snap(i, 7, `'${c}' closes, but the stack is empty — nothing to match. Invalid.`, "bad", { result: false, done: true });
        return out;
      }
      const top = st.at(-1);
      if (top === PAIRS[c]) {
        st.pop();
        snap(i, 9, `top = '${top}' matches '${c}' → pop.`, "ok");
      } else {
        snap(i, 10, `top = '${top}' does not match '${c}'. Invalid.`, "bad", { result: false, done: true });
        return out;
      }
    }
  }
  const ok = st.length === 0;
  snap(s.length, 13, ok ? "Loop done and the stack is empty → valid!" : `Loop done but ${st.length} opener(s) never closed → invalid.`, ok ? "ok" : "bad", { result: ok, done: true });
  return out;
}

function BalancedParens() {
  const PRESETS = ["([]){}", "{[()]}", "([)]", "((()", "())"];
  const [s, setS] = useState(PRESETS[0]);
  const steps = useMemo(() => parenSteps(s), [s]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={PRESETS.includes(s) ? s : "custom"} onValueChange={(v) => v !== "custom" && setS(v)}>
          <SelectTrigger className="w-36 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p} value={p} className="font-mono">{p}</SelectItem>
            ))}
            {!PRESETS.includes(s) && <SelectItem value="custom">custom</SelectItem>}
          </SelectContent>
        </Select>
        <input
          className="h-8 w-40 rounded-md border border-input bg-card px-2 font-mono text-[13px]"
          value={s}
          onChange={(e) => setS(e.target.value.replace(/[^()[\]{}]/g, "").slice(0, 14))}
          aria-label="Bracket string"
        />
      </div>
      <Split>
        <div className="space-y-3">
          <ArrayView values={s.split("")} states={Object.fromEntries(s.split("").map((_, k) => [k, k === step.i ? (step.tone === "bad" ? "bad" : "active") : k < step.i ? "dim" : undefined]))} pointers={step.i >= 0 && step.i < s.length ? [{ index: step.i, label: "c" }] : []} />
          <Panel title="stack<char> st">
            <div className="flex min-h-10 items-center gap-1">
              <span className="text-[11px] text-muted-foreground">bottom</span>
              {step.st.map((ch, k) => <Cell key={k} v={ch} tone={k === step.st.length - 1 ? "active" : undefined} />)}
              <span className="text-[11px] text-muted-foreground">← top</span>
            </div>
          </Panel>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={PAREN_CODE} active={step.line} />
          <VarTable vars={[["c", step.i >= 0 && step.i < s.length ? `'${s[step.i]}'` : "—", "active"], ["st.size()", step.st.length], ["result", step.result == null ? "…" : String(step.result), step.result ? "ok" : step.result === false ? "bad" : undefined]]} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </div>
  );
}

function StackQueueVariant() {
  const [tab, setTab] = useState("side");
  return (
    <LabShell
      title="stack vs queue vs deque"
      description="Push the same values into all three, then pop: the stack hands them back reversed, the queue in arrival order, the deque from whichever end you ask."
      badges={["LIFO", "FIFO", "O(1) push/pop"]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="side">Side by side</TabsTrigger>
          <TabsTrigger value="paren">Balanced brackets</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "side" ? <SideBySide /> : <BalancedParens />}
    </LabShell>
  );
}

/* ================================================================== */
/* variant "algorithms"                                                */
/* ================================================================== */

const ALGO_CODE = {
  sort: (desc) => `vector<int> nums = {5, 2, 8, 2, 9, 1, 5, 5};
sort(nums.begin(), nums.end()${desc ? ", greater<int>()" : ""});
// O(N log N) — introsort; tiny ranges use insertion sort:
for (int i = 1; i < n; i++)
    for (int j = i; j > 0 && cmp(a[j], a[j-1]); j--)
        swap(a[j], a[j-1]);`,
  binary_search: (_, x) => `// nums must be sorted!
bool found = binary_search(nums.begin(), nums.end(), ${x});
// conceptually:
int lo = 0, hi = n - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] == x) return true;
    if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
}
return false;`,
  lower_bound: (_, x) => `// first element >= ${x}
auto it = lower_bound(nums.begin(), nums.end(), ${x});
int lo = 0, hi = n;              // half-open [lo, hi)
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
}
return lo;                       // it - nums.begin()`,
  upper_bound: (_, x) => `// first element > ${x}
auto it = upper_bound(nums.begin(), nums.end(), ${x});
int lo = 0, hi = n;              // half-open [lo, hi)
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] <= x) lo = mid + 1;
    else hi = mid;
}
return lo;                       // it - nums.begin()`,
  accumulate: (mult) => `#include <numeric>
${mult ? "long long product = accumulate(nums.begin(), nums.end(), 1LL, multiplies<long long>());" : "int total = accumulate(nums.begin(), nums.end(), 0);"}
// conceptually:
${mult ? "long long acc = 1;" : "int acc = 0;"}
for (int x : nums)
    acc = acc ${mult ? "*" : "+"} x;
return acc;`,
};

function sortSteps(a0, desc) {
  const a = [...a0];
  const s = [];
  const cmp = (x, y) => (desc ? x > y : x < y);
  let comps = 0;
  s.push({ a: [...a], line: 2, note: `Before: [${a.join(", ")}].`, tone: "default", comps, sorted: 1 });
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      comps++;
      const sw = cmp(a[j], a[j - 1]);
      s.push({ a: [...a], i: j, j: j - 1, line: 5, note: `cmp(${a[j]}, ${a[j - 1]}) → ${sw ? `${a[j]} ${desc ? ">" : "<"} ${a[j - 1]}: swap` : "false: stop"}.`, tone: sw ? "warn" : "active", comps, sorted: i });
      if (!sw) break;
      [a[j], a[j - 1]] = [a[j - 1], a[j]];
    }
  }
  s.push({ a: [...a], line: 2, note: `After sort${desc ? " with greater<int>()" : ""}: [${a.join(", ")}] using ${comps} comparisons.`, tone: "ok", comps, sorted: a.length, done: true });
  return s;
}

function bsearchSteps(a, x) {
  const s = [];
  let lo = 0, hi = a.length - 1, comps = 0;
  s.push({ lo, hi, line: 4, note: `Search for ${x} in the sorted array: lo = 0, hi = ${hi}.`, tone: "default", comps });
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    comps++;
    if (a[mid] === x) {
      s.push({ lo, hi, mid, line: 7, note: `a[${mid}] = ${a[mid]} == ${x} → found! ${comps} comparison${comps > 1 ? "s" : ""}.`, tone: "ok", comps, found: mid, result: "true", done: true });
      return s;
    }
    const right = a[mid] < x;
    s.push({ lo, hi, mid, line: 8, note: `a[${mid}] = ${a[mid]} ${right ? "<" : ">"} ${x} → discard the ${right ? "left" : "right"} half.`, tone: "active", comps });
    if (right) lo = mid + 1;
    else hi = mid - 1;
  }
  s.push({ lo, hi, line: 10, note: `lo (${lo}) > hi (${hi}): the range is empty → ${x} is not present. return false.`, tone: "bad", comps, result: "false", done: true });
  return s;
}

function boundSteps(a, x, upper) {
  const s = [];
  let lo = 0, hi = a.length, comps = 0;
  const op = upper ? "<=" : "<";
  s.push({ lo, hi, line: 3, note: `${upper ? "upper" : "lower"}_bound(${x}): find the first index whose value is ${upper ? ">" : ">="} ${x}. Range [0, ${hi}).`, tone: "default", comps });
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    comps++;
    const go = upper ? a[mid] <= x : a[mid] < x;
    s.push({ lo, hi, mid, line: go ? 6 : 7, note: `a[${mid}] = ${a[mid]} ${go ? op : upper ? ">" : ">="} ${x} → ${go ? `answer is right of ${mid}: lo = ${mid + 1}` : `index ${mid} could be the answer: hi = ${mid}`}.`, tone: go ? "active" : "warn", comps });
    if (go) lo = mid + 1;
    else hi = mid;
  }
  s.push({ lo, hi, line: 9, found: lo < a.length ? lo : undefined, note: lo < a.length ? `lo == hi == ${lo}: a[${lo}] = ${a[lo]} is the first value ${upper ? ">" : ">="} ${x}.` : `lo == ${lo} == n: no value ${upper ? ">" : ">="} ${x}; the iterator is nums.end().`, tone: "ok", comps, result: lo === a.length ? "end()" : `index ${lo}`, done: true });
  return s;
}

function accSteps(a, mult) {
  const s = [];
  let acc = mult ? 1 : 0;
  s.push({ acc, line: 4, note: `Start with init = ${acc}${mult ? " (the multiplicative identity)" : ""}. Note the init's TYPE sets the result type — 0 vs 0LL vs 0.0 matters!`, tone: "default" });
  a.forEach((x, k) => {
    const prev = acc;
    acc = mult ? acc * x : acc + x;
    s.push({ acc, i: k, line: 6, note: `acc = ${prev} ${mult ? "×" : "+"} ${x} = ${acc}.`, tone: "active" });
  });
  s.push({ acc, line: 7, note: `Result: ${acc}. One pass, O(N).`, tone: "ok", done: true });
  return s;
}

const RAW = [5, 2, 8, 2, 9, 1, 5, 5];

function AlgorithmsVariant() {
  const [algo, setAlgo] = useState("lower_bound");
  const [x, setX] = useState(5);
  const [flag, setFlag] = useState(false);
  const [raw, setRaw] = useState(RAW);
  const sorted = useMemo(() => [...raw].sort((p, q2) => p - q2), [raw]);
  const steps = useMemo(() => {
    if (algo === "sort") return sortSteps(raw, flag);
    if (algo === "binary_search") return bsearchSteps(sorted, x);
    if (algo === "accumulate") return accSteps(sorted.slice(0, 6), flag);
    return boundSteps(sorted, x, algo === "upper_bound");
  }, [algo, x, flag, raw, sorted]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  const values = algo === "sort" ? step.a : algo === "accumulate" ? sorted.slice(0, 6) : sorted;
  const code = ALGO_CODE[algo](flag, x);
  const lb = sorted.findIndex((v) => v >= x), ub = sorted.findIndex((v) => v > x);
  const lbI = lb < 0 ? sorted.length : lb, ubI = ub < 0 ? sorted.length : ub;

  const states = {};
  const pointers = [];
  if (algo === "sort") {
    values.forEach((_, k) => (states[k] = step.done ? "ok" : k <= (step.sorted ?? 0) ? undefined : "dim"));
    if (step.i != null) { states[step.i] = "active"; states[step.j] = "warn"; pointers.push({ index: step.i, label: "j", tone: "active" }, { index: step.j, label: "j-1", tone: "warning" }); }
  } else if (algo === "accumulate") {
    values.forEach((_, k) => (states[k] = step.i == null ? (step.done ? "ok" : undefined) : k < step.i ? "ok" : k === step.i ? "active" : undefined));
    if (step.i != null) pointers.push({ index: step.i, label: "x" });
  } else {
    values.forEach((_, k) => {
      const inRange = algo === "binary_search" ? k >= step.lo && k <= step.hi : k >= step.lo && k < step.hi;
      states[k] = step.found === k ? "ok" : step.mid === k ? "active" : inRange ? undefined : "dim";
    });
    if (step.mid != null && !step.done) pointers.push({ index: step.mid, label: "mid" });
    if (step.lo < values.length) pointers.push({ index: step.lo, label: "lo", tone: "purple" });
    const hiIdx = algo === "binary_search" ? step.hi : step.hi - 1;
    if (hiIdx >= 0 && hiIdx < values.length && !step.done) pointers.push({ index: hiIdx, label: algo === "binary_search" ? "hi" : "hi-1", tone: "warning" });
  }

  return (
    <LabShell
      title="<algorithm> Toolbox — sort, binary search, bounds, accumulate"
      description="Each STL call is a loop you could write yourself. Step through it to see exactly which elements it touches and why it's O(log N) or O(N)."
      badges={["O(N log N) sort", "O(log N) search", "O(N) accumulate"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={algo} onValueChange={(v) => v && (setAlgo(v), setFlag(false))}>
          {["sort", "binary_search", "lower_bound", "upper_bound", "accumulate"].map((a) => (
            <ToggleGroupItem key={a} value={a} className="font-mono text-[12px]">{a}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={() => setRaw(Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 9)))}>
          <Shuffle /> Random
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-4">
            <ArrayView values={values} states={states} pointers={pointers} label={algo === "sort" ? "nums" : algo === "accumulate" ? "nums (first 6, sorted)" : "nums (sorted)"} />
            {(algo === "lower_bound" || algo === "upper_bound") && step.done && (
              <div className="mt-2 text-[12px] text-muted-foreground">
                equal_range({x}) = [{lbI}, {ubI}) → count of {x} = upper − lower = <b className="text-viz-ok">{ubI - lbI}</b>
              </div>
            )}
          </Stage>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Input">
            {(algo === "binary_search" || algo === "lower_bound" || algo === "upper_bound") && <SliderControl label="target x" value={x} min={0} max={10} onChange={setX} />}
            {algo === "sort" && <SwitchControl label="Descending: greater<int>()" checked={flag} onChange={setFlag} id="algo-desc" />}
            {algo === "accumulate" && <SwitchControl label="multiplies<long long>() with init 1LL" checked={flag} onChange={setFlag} id="algo-mult" />}
          </Panel>
          <CodePanel code={code} active={step.line} maxHeight={240} />
          <StatGrid cols={2}>
            {algo === "accumulate" ? <Stat label="acc" value={step.acc} tone="active" /> : <Stat label="comparisons" value={step.comps} tone="active" />}
            <Stat label="result" value={algo === "sort" ? (step.done ? "sorted" : "…") : algo === "accumulate" ? (step.done ? step.acc : "…") : step.result ?? "…"} tone={step.done ? "ok" : undefined} />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

export default function StlContainersLab({ variant = "pairs" }) {
  if (variant === "stack-queue") return <StackQueueVariant />;
  if (variant === "algorithms") return <AlgorithmsVariant />;
  return <PairsVariant />;
}
