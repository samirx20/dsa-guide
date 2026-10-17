import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Vertical stack tower (bottom → top). items: [{ label, sub?, tone? }] */
function Tower({ items, ghost, empty = "empty stack", minH = 220 }) {
  const toneCls = {
    active: "border-viz-active bg-viz-active/15 text-viz-active",
    ok: "border-viz-ok bg-viz-ok/15 text-viz-ok",
    bad: "border-viz-bad bg-viz-bad/12 text-viz-bad",
    warn: "border-viz-warn bg-viz-warn/15 text-viz-warn",
    purple: "border-viz-purple bg-viz-purple/15 text-viz-purple",
  };
  return (
    <div className="mx-auto flex w-full max-w-[220px] flex-col items-stretch">
      <div className="flex flex-col-reverse justify-start gap-1 rounded-b-lg border-x-2 border-b-2 border-muted-foreground/40 px-2 pb-2 pt-1" style={{ minHeight: minH }}>
        {items.length === 0 && <div className="py-3 text-center text-xs text-muted-foreground">{empty}</div>}
        {items.map((it, k) => (
          <div key={k} className={cn("relative flex h-9 items-center justify-center rounded-md border bg-card font-mono text-[15px] font-semibold transition-all duration-200", toneCls[it.tone])}>
            {it.label}
            {it.sub != null && <span className="absolute left-2 text-[10.5px] font-normal text-muted-foreground">{it.sub}</span>}
            {k === items.length - 1 && <span className="absolute right-2 text-[10px] font-semibold uppercase tracking-wide text-viz-active">top</span>}
          </div>
        ))}
        {ghost && (
          <div className="flex h-9 items-center justify-center rounded-md border border-dashed border-viz-bad font-mono text-[15px] font-semibold text-viz-bad opacity-60">
            {ghost} ↑
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* stack: push/pop playground + valid parentheses                     */
/* ------------------------------------------------------------------ */

function PushPop() {
  const [st, setSt] = useState([]);
  const [val, setVal] = useState("5");
  const [log, setLog] = useState([]);
  const [last, setLast] = useState(null); // { op, v }
  const add = (line, op, v) => {
    setLog((l) => [...l.slice(-30), line]);
    setLast({ op, v });
  };
  const push = (v = Number(val)) => {
    if (!Number.isFinite(v)) return;
    setSt((s) => [...s, v]);
    add(`st.push(${v});`, "push", v);
    setVal(String(Math.floor(Math.random() * 9) + 1));
  };
  const pop = () => {
    if (!st.length) return add(`st.pop();  // ✗ undefined behaviour on empty stack!`, "err");
    add(`st.pop();  // removes ${st.at(-1)}`, "pop", st.at(-1));
    setSt((s) => s.slice(0, -1));
  };
  const top = () => (st.length ? add(`st.top();  // → ${st.at(-1)}`, "top", st.at(-1)) : add(`st.top();  // ✗ check st.empty() first!`, "err"));
  const chapter = () => {
    // push(5) → push(3) → push(8) → pop() → push(1) → pop()
    setSt([5, 3]);
    setLog(["st.push(5);", "st.push(3);", "st.push(8);", "st.pop();  // removes 8", "st.push(1);", "st.pop();  // removes 1"]);
    setLast({ op: "pop", v: 1 });
  };
  const items = st.map((v, k) => ({ label: v, sub: k, tone: k === st.length - 1 ? (last?.op === "push" ? "ok" : "active") : undefined }));
  const note =
    last == null
      ? "Push a few values. Only the top is reachable — Last In, First Out."
      : last.op === "push"
        ? `push(${last.v}) placed ${last.v} on top in O(1).`
        : last.op === "pop"
          ? `pop() removed ${last.v} — the most recently pushed value. O(1).`
          : last.op === "top"
            ? `top() peeks at ${last.v} without removing it.`
            : "Calling top()/pop() on an empty std::stack is undefined behaviour — always guard with empty().";
  return (
    <Split>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className={cn(inputCls, "w-20")} value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9-]/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && push()} aria-label="Value to push" />
          <Button size="sm" onClick={() => push()}>
            push
          </Button>
          <Button variant="outline" size="sm" onClick={pop}>
            pop
          </Button>
          <Button variant="outline" size="sm" onClick={top}>
            top
          </Button>
          <Button variant="ghost" size="sm" onClick={() => (setSt([]), setLog([]), setLast(null))}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={chapter} className="ml-auto">
            Chapter sequence
          </Button>
        </div>
        <Stage className="p-4">
          <Tower items={items} ghost={last?.op === "pop" ? last.v : null} />
        </Stage>
        <Narration tone={last?.op === "err" ? "bad" : last?.op === "push" ? "ok" : "default"}>{note}</Narration>
      </div>
      <div className="space-y-3">
        <StatGrid cols={3}>
          <Stat label="size()" value={st.length} />
          <Stat label="top()" value={st.length ? st.at(-1) : "—"} tone="active" />
          <Stat label="empty()" value={String(st.length === 0)} tone={st.length ? undefined : "warn"} />
        </StatGrid>
        <Panel title="Operation log (std::stack<int> st)">
          <ScrollArea style={{ maxHeight: 230 }} viewportClassName="max-h-[inherit]">
            <pre className="code-body text-[12.5px]">{log.length ? log.join("\n") : "// no operations yet"}</pre>
          </ScrollArea>
        </Panel>
      </div>
    </Split>
  );
}

const PAREN_CODE = `bool isValid(string s) {
    vector<char> st;

    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push_back(c);
        } else {
            if (st.empty()) return false;
            char top = st.back();
            st.pop_back();
            if ((c == ')' && top != '(') ||
                (c == ']' && top != '[') ||
                (c == '}' && top != '{')) {
                return false;
            }
        }
    }

    return st.empty();
}`;
const PAIR = { ")": "(", "]": "[", "}": "{" };

/** Pure: valid-parentheses trace. */
export function traceParens(s) {
  const steps = [];
  const st = [];
  const snap = (extra) => steps.push({ st: [...st], ...extra });
  snap({ i: -1, line: 2, tone: "default", note: `Scan "${s}" left to right with an empty stack.` });
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("([{".includes(c)) {
      st.push(c);
      snap({ i, line: [5, 6], tone: "active", note: `'${c}' is an opening bracket → push it and wait for its partner.` });
      continue;
    }
    if (!st.length) {
      snap({ i, line: 8, tone: "bad", done: true, valid: false, note: `'${c}' closes, but the stack is empty — nothing to match. Return false.` });
      return steps;
    }
    const top = st.pop();
    if (PAIR[c] !== top) {
      snap({ i, line: [9, 10, 11, 12, 13, 14], tone: "bad", popped: top, done: true, valid: false, note: `'${c}' needs '${PAIR[c]}' but the top was '${top}' → mismatch. Return false.` });
      return steps;
    }
    snap({ i, line: [9, 10], tone: "ok", popped: top, note: `'${c}' matches top '${top}' → pop. ${st.length} still open.` });
  }
  const ok = st.length === 0;
  snap({ i: s.length, line: 19, tone: ok ? "ok" : "bad", done: true, valid: ok, note: ok ? `End of string and the stack is empty → valid!` : `End of string but ${st.length} bracket${st.length > 1 ? "s are" : " is"} still open (${st.join("")}) → invalid.` });
  return steps;
}

const PAREN_PRESETS = ["({[]})", "([)]", "(()", "())", "{[]}()"];

function Parens() {
  const [s, setS] = useState("({[]})");
  const [draft, setDraft] = useState("({[]})");
  const steps = useMemo(() => traceParens(s), [s]);
  const st = useStepper(steps, { baseMs: 800 });
  const step = st.step;
  const chars = s.split("");
  const states = {};
  chars.forEach((_, k) => k < step.i && (states[k] = "dim"));
  if (step.i >= 0 && step.i < s.length) states[step.i] = step.tone === "bad" ? "bad" : step.tone === "ok" ? "ok" : "active";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PAREN_PRESETS.map((p) => (
          <Button key={p} variant={s === p ? "secondary" : "outline"} size="sm" className="font-mono" onClick={() => (setS(p), setDraft(p))}>
            {p}
          </Button>
        ))}
        <input
          className={cn(inputCls, "w-36")}
          value={draft}
          placeholder="type brackets"
          onChange={(e) => setDraft(e.target.value.replace(/[^()[\]{}]/g, "").slice(0, 16))}
          onKeyDown={(e) => e.key === "Enter" && draft && setS(draft)}
          aria-label="Custom bracket string"
        />
        <Button size="sm" variant="outline" disabled={!draft} onClick={() => setS(draft)}>
          Run
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <ArrayView values={chars} states={states} cellWidth={38} pointers={step.i >= 0 && step.i < s.length ? [{ index: step.i, label: "c", tone: "active" }] : []} />
          <Stage className="p-4">
            <Tower items={step.st.map((c, k) => ({ label: c, tone: k === step.st.length - 1 && step.tone === "active" ? "active" : undefined }))} ghost={step.popped} minH={180} />
          </Stage>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={PAREN_CODE} active={step.line} />
          <StatGrid cols={2}>
            <Stat label="Stack size" value={step.st.length} tone="active" />
            <Stat label="Result" value={step.done ? String(step.valid) : "…"} tone={step.done ? (step.valid ? "ok" : "bad") : undefined} />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function StackBasics() {
  const [tab, setTab] = useState("ops");
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ops">Push / Pop</TabsTrigger>
          <TabsTrigger value="parens">Valid Parentheses</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "ops" ? <PushPop /> : <Parens />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* monotonic stack                                                     */
/* ------------------------------------------------------------------ */

const MONO = {
  nge: {
    label: "Next Greater Element",
    values: [2, 1, 2, 4, 3],
    empty: -1,
    code: `vector<int> nextGreater(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    vector<int> st;  // indices; values decreasing

    for (int i = 0; i < n; i++) {
        while (!st.empty() && nums[i] > nums[st.back()]) {
            int prevIndex = st.back();
            st.pop_back();
            result[prevIndex] = nums[i];
        }
        st.push_back(i);
    }
    return result;
}`,
  },
  temps: {
    label: "Daily Temperatures",
    values: [73, 74, 75, 71, 69, 72, 76],
    empty: 0,
    code: `vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> result(n, 0);
    vector<int> st;  // indices; temps decreasing

    for (int i = 0; i < n; i++) {
        while (!st.empty() && temperatures[i] > temperatures[st.back()]) {
            int prevIndex = st.back();
            st.pop_back();
            result[prevIndex] = i - prevIndex;
        }
        st.push_back(i);
    }
    return result;
}`,
  },
};

/** Pure: monotonic decreasing stack of indices. mode "nge" stores values, "temps" stores distances. */
export function traceMono(a, mode) {
  const n = a.length;
  const res = Array(n).fill(MONO[mode].empty);
  const st = [];
  const steps = [];
  let ops = 0;
  const snap = (extra) => steps.push({ st: [...st], res: [...res], ops, ...extra });
  snap({ i: -1, line: [3, 4], tone: "default", note: `result starts as all ${MONO[mode].empty}; the stack holds indices still waiting for something bigger.` });
  for (let i = 0; i < n; i++) {
    snap({ i, line: 6, tone: "active", note: `i = ${i}: value ${a[i]}. Pop everything on the stack that is smaller.` });
    while (st.length && a[i] > a[st.at(-1)]) {
      const p = st.pop();
      res[p] = mode === "nge" ? a[i] : i - p;
      ops++;
      snap({ i, popped: p, line: [7, 8, 9, 10], tone: "ok", note: `${a[i]} > ${a[p]} (index ${p}) → pop ${p}; its answer is ${mode === "nge" ? a[i] : `${i} − ${p} = ${i - p} day${i - p > 1 ? "s" : ""}`}.` });
    }
    st.push(i);
    ops++;
    snap({ i, line: 12, tone: "purple", note: st.length > 1 ? `${a[i]} ≤ ${a[st.at(-2)]} at the top → stop popping and push index ${i}. Stack values stay decreasing.` : `Stack empty → push index ${i}.` });
  }
  snap({ i: n, line: 14, tone: "ok", done: true, note: `Done. Indices left on the stack (${st.join(", ") || "none"}) never found a bigger value → keep ${MONO[mode].empty}. Each index was pushed and popped at most once: ${ops} ops for N = ${n} → O(N).` });
  return steps;
}

function MonoBars({ values, step }) {
  const n = values.length;
  const W = Math.max(360, n * 56 + 40), H = 240, pad = 20, base = H - 26;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const bw = (W - pad * 2) / n;
  const h = (v) => 26 + ((v - lo) / span) * (H - 120);
  const onStack = new Set(step.st);
  const X = (k) => pad + k * bw + bw / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Monotonic stack bars">
      <line x1={pad} x2={W - pad} y1={base} y2={base} stroke={C.muted} opacity={0.5} />
      {step.popped != null && (
        <path d={`M${X(step.popped)},${base - h(values[step.popped]) - 18} Q${(X(step.popped) + X(step.i)) / 2},${base - h(Math.max(values[step.popped], values[step.i])) - 50} ${X(step.i)},${base - h(values[step.i]) - 18}`} fill="none" stroke={C.ok} strokeWidth={2.4} strokeDasharray="5 3" />
      )}
      {values.map((v, k) => {
        const color = k === step.i ? C.active : k === step.popped ? C.ok : onStack.has(k) ? C.purple : k < step.i ? C.ok : C.ink;
        const op = k === step.i || onStack.has(k) || k === step.popped ? 0.9 : k < step.i ? 0.35 : 0.45;
        return (
          <g key={k}>
            <rect x={X(k) - bw * 0.32} y={base - h(v)} width={bw * 0.64} height={h(v)} rx={4} fill={color} opacity={op} className="transition-all duration-200" />
            <text x={X(k)} y={base - h(v) - 6} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={C.fg}>
              {v}
            </text>
            <text x={X(k)} y={H - 8} textAnchor="middle" fontSize={11} fill={C.muted}>
              {k}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Monotonic() {
  const [mode, setMode] = useState("temps");
  const [custom, setCustom] = useState(null);
  const values = custom ?? MONO[mode].values;
  const steps = useMemo(() => traceMono(values, mode), [values, mode]);
  const st = useStepper(steps, { baseMs: 850 });
  const step = st.step;
  const randomize = () => {
    const n = 6 + Math.floor(Math.random() * 3);
    setCustom(Array.from({ length: n }, () => (mode === "temps" ? 65 + Math.floor(Math.random() * 15) : 1 + Math.floor(Math.random() * 9))));
  };
  const resStates = {};
  if (step.popped != null) resStates[step.popped] = "ok";
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
            <TabsTrigger value="nge">Next Greater Element</TabsTrigger>
            <TabsTrigger value="temps">Daily Temperatures</TabsTrigger>
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
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <MonoBars values={values} step={step} />
          </Stage>
          <Legend
            items={[
              [C.active, "Current i"],
              [C.purple, "Waiting on the stack"],
              [C.ok, "Answer found (popped)"],
            ]}
          />
          <ArrayView values={step.res} states={resStates} label={mode === "nge" ? "result (next greater value)" : "result (days to wait)"} cellWidth={42} />
          <Narration tone={step.tone === "purple" ? "default" : step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={MONO[mode].code} active={step.line} />
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <Panel title="Stack (indices)">
              <Tower items={step.st.map((k) => ({ label: values[k], sub: `i${k}`, tone: "purple" }))} ghost={step.popped != null ? values[step.popped] : null} minH={120} empty="empty" />
            </Panel>
            <VarTable
              vars={[
                ["i", step.i < 0 || step.done ? "—" : step.i, "active"],
                ["value", step.i >= 0 && step.i < values.length ? values[step.i] : "—"],
                ["stack size", step.st.length, "purple"],
                ["push+pop ops", step.ops],
              ]}
            />
          </div>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* queue vs deque + sliding window maximum                             */
/* ------------------------------------------------------------------ */

function Lane({ title, items, highlight }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex items-center gap-2">
        <span className="w-12 text-right text-[11px] font-semibold text-viz-active">FRONT</span>
        <div className="flex min-h-11 flex-1 flex-wrap items-center gap-1 rounded-lg border-y-2 border-muted-foreground/40 px-1 py-1">
          {items.length === 0 && <span className="px-2 text-xs text-muted-foreground">empty</span>}
          {items.map((v, k) => (
            <span
              key={k}
              className={cn(
                "flex h-9 w-11 items-center justify-center rounded-md border bg-card font-mono text-sm font-semibold transition-all duration-200",
                (highlight === "front" && k === 0) || (highlight === "back" && k === items.length - 1) ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : ""
              )}
            >
              {v}
            </span>
          ))}
        </div>
        <span className="w-12 text-[11px] font-semibold text-viz-purple">BACK</span>
      </div>
    </div>
  );
}

function QueueDeque() {
  const [q, setQ] = useState([1, 2, 3]);
  const [dq, setDq] = useState([10, 20]);
  const [nextV, setNextV] = useState(4);
  const [msg, setMsg] = useState({ text: "std::queue only touches the back (push) and the front (pop). std::deque works at both ends in O(1).", tone: "default" });
  const [hl, setHl] = useState({});
  const v = nextV;
  const bump = () => setNextV((x) => (x % 99) + 1);
  const qOp = (op) => {
    if (op === "push") {
      setQ((a) => [...a, v]);
      bump();
      setHl({ q: "back" });
      setMsg({ text: `q.push(${v}) — joins at the BACK of the line.`, tone: "ok" });
    } else if (!q.length) setMsg({ text: "q.pop() on an empty queue is undefined behaviour — check q.empty().", tone: "bad" });
    else {
      setQ((a) => a.slice(1));
      setHl({});
      setMsg({ text: `q.pop() — removes ${q[0]} from the FRONT (First In, First Out).`, tone: "active" });
    }
  };
  const dOp = (op) => {
    if (op === "push_back" || op === "push_front") {
      setDq((a) => (op === "push_back" ? [...a, v] : [v, ...a]));
      bump();
      setHl({ d: op === "push_back" ? "back" : "front" });
      setMsg({ text: `dq.${op}(${v}) — O(1) at either end.`, tone: "ok" });
    } else if (!dq.length) setMsg({ text: `dq.${op}() on an empty deque is undefined behaviour.`, tone: "bad" });
    else {
      setMsg({ text: `dq.${op}() removes ${op === "pop_front" ? dq[0] : dq.at(-1)} from the ${op === "pop_front" ? "front" : "back"}.`, tone: "active" });
      setDq((a) => (op === "pop_front" ? a.slice(1) : a.slice(0, -1)));
      setHl({});
    }
  };
  return (
    <div className="space-y-4">
      <Panel title={`std::queue<int> q · size ${q.length}`}>
        <Lane title="" items={q} highlight={hl.q} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => qOp("push")}>
            push({v})
          </Button>
          <Button size="sm" variant="outline" onClick={() => qOp("pop")}>
            pop()
          </Button>
          <Badge variant="outline" className="font-mono">
            front() = {q[0] ?? "—"} · back() = {q.at(-1) ?? "—"}
          </Badge>
        </div>
      </Panel>
      <Panel title={`std::deque<int> dq · size ${dq.length}`}>
        <Lane title="" items={dq} highlight={hl.d} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => dOp("push_front")}>
            push_front({v})
          </Button>
          <Button size="sm" onClick={() => dOp("push_back")}>
            push_back({v})
          </Button>
          <Button size="sm" variant="outline" onClick={() => dOp("pop_front")}>
            pop_front()
          </Button>
          <Button size="sm" variant="outline" onClick={() => dOp("pop_back")}>
            pop_back()
          </Button>
          <Badge variant="outline" className="font-mono">
            dq[0] = {dq[0] ?? "—"}
          </Badge>
        </div>
      </Panel>
      <Narration tone={msg.tone}>{msg.text}</Narration>
    </div>
  );
}

const SWM_CODE = `vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq; // stores INDICES, values decreasing

    for (int i = 0; i < nums.size(); i++) {
        // 1. Remove smaller elements from the back
        while (!dq.empty() && nums[dq.back()] < nums[i]) {
            dq.pop_back();
        }
        // 2. Add the current index
        dq.push_back(i);
        // 3. Drop the front if it left the window
        if (dq.front() < i - k + 1) {
            dq.pop_front();
        }
        // 4. Record once the window is full
        if (i >= k - 1) {
            result.push_back(nums[dq.front()]);
        }
    }
    return result;
}`;

/** Pure: monotonic-deque sliding window maximum (chapter template). */
export function traceWindow(a, k) {
  const steps = [];
  const dq = [];
  const res = [];
  const snap = (extra) => steps.push({ dq: [...dq], res: [...res], ...extra });
  snap({ i: -1, line: [2, 3], tone: "default", note: `Window size k = ${k}. The deque keeps indices whose values are decreasing, so the front is always the window max.` });
  for (let i = 0; i < a.length; i++) {
    while (dq.length && a[dq.at(-1)] < a[i]) {
      const b = dq.pop();
      snap({ i, evicted: b, line: [7, 8], tone: "bad", note: `nums[${b}] = ${a[b]} < ${a[i]} → pop_back(). It can never be a max while ${a[i]} is in the window.` });
    }
    dq.push(i);
    snap({ i, line: 11, tone: "active", note: `push_back(${i}) (value ${a[i]}). Deque values: [${dq.map((j) => a[j]).join(", ")}].` });
    if (dq[0] < i - k + 1) {
      const f = dq.shift();
      snap({ i, evicted: f, line: [13, 14], tone: "warn", note: `Front index ${f} is outside the window [${i - k + 1}..${i}] → pop_front().` });
    }
    if (i >= k - 1) {
      res.push(a[dq[0]]);
      snap({ i, line: [17, 18], tone: "ok", note: `Window [${i - k + 1}..${i}] is full → max = nums[dq.front()] = nums[${dq[0]}] = ${a[dq[0]]}.` });
    }
  }
  snap({ i: a.length, line: 21, tone: "ok", done: true, note: `Result: [${res.join(", ")}]. Every index enters and leaves the deque once → O(N), not O(N·k).` });
  return steps;
}

function SlidingWindow() {
  const [vals, setVals] = useState([1, 3, -1, -3, 5, 3, 6, 7]);
  const [k, setK] = useState(3);
  const kk = Math.min(k, vals.length);
  const steps = useMemo(() => traceWindow(vals, kk), [vals, kk]);
  const st = useStepper(steps, { baseMs: 850 });
  const step = st.step;
  const lo = Math.max(0, step.i - kk + 1);
  const inDq = new Set(step.dq);
  const states = {};
  vals.forEach((_, j) => (states[j] = inDq.has(j) ? "purple" : j < lo || j > step.i ? "dim" : undefined));
  if (step.evicted != null) states[step.evicted] = step.tone === "warn" ? "warn" : "bad";
  if (step.dq.length && step.tone === "ok") states[step.dq[0]] = "ok";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setVals([1, 3, -1, -3, 5, 3, 6, 7])}>
          Chapter example
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVals(Array.from({ length: 9 }, () => Math.floor(Math.random() * 19) - 9))}>
          <Shuffle /> Random
        </Button>
        <div className="w-44">
          <SliderControl label="Window k" value={kk} min={1} max={Math.min(6, vals.length)} onChange={setK} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ArrayView
              values={vals}
              states={states}
              range={step.i >= 0 && step.i < vals.length ? [lo, step.i] : undefined}
              pointers={step.i >= 0 && step.i < vals.length ? [{ index: step.i, label: "i", tone: "active" }, ...(step.dq.length ? [{ index: step.dq[0], label: "front", tone: "success" }] : [])] : []}
            />
            <div className="mt-3 flex items-center gap-2">
              <span className="w-14 text-[11px] font-semibold text-muted-foreground">deque</span>
              <div className="flex min-h-11 flex-1 flex-wrap items-center gap-1 rounded-lg border-y-2 border-muted-foreground/40 px-1 py-1">
                {step.dq.length === 0 && <span className="px-2 text-xs text-muted-foreground">empty</span>}
                {step.dq.map((j, x) => (
                  <span key={j} className={cn("flex h-10 w-12 flex-col items-center justify-center rounded-md border bg-card font-mono leading-none", x === 0 ? "border-viz-ok bg-viz-ok/12" : "border-viz-purple bg-viz-purple/10")}>
                    <span className="text-sm font-semibold">{vals[j]}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">i{j}</span>
                  </span>
                ))}
              </div>
            </div>
          </Stage>
          <Legend
            items={[
              [C.purple, "Index in the deque"],
              [C.ok, "Front = window max"],
              [C.bad, "Evicted from back (smaller)"],
              [C.warn, "Evicted from front (expired)"],
            ]}
          />
          <ArrayView values={step.res.length ? step.res : ["—"]} label="result" states={step.tone === "ok" && !step.done ? { [step.res.length - 1]: "ok" } : {}} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={SWM_CODE} active={step.line} />
          <VarTable
            vars={[
              ["i", step.i >= 0 && step.i < vals.length ? step.i : "—", "active"],
              ["window", step.i >= 0 && step.i < vals.length ? `[${lo}..${step.i}]` : "—"],
              ["dq (indices)", `[${step.dq.join(",")}]`, "purple"],
              ["max so far", step.res.length ? step.res.at(-1) : "—", "ok"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function DequeVariant() {
  const [tab, setTab] = useState("window");
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ops">Queue vs Deque</TabsTrigger>
          <TabsTrigger value="window">Sliding Window Maximum</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "ops" ? <QueueDeque /> : <SlidingWindow />}
    </>
  );
}

const META = {
  stack: { title: "Stack — LIFO in Action", description: "Push and pop on a vertical tower, then use a stack to match brackets.", badges: ["O(1) push/pop", "LIFO"] },
  monotonic: { title: "Monotonic Stack — Next Greater Element", description: "Keep indices whose values are decreasing; a bigger value pops (and answers) everything smaller below it.", badges: ["O(N)", "Indices on the stack"] },
  deque: { title: "Queue, Deque & Sliding Window Maximum", description: "FIFO queue vs double-ended deque, then a monotonic deque that answers every window max in O(N).", badges: ["FIFO", "Monotonic deque", "O(N)"] },
};

export default function StackLab({ variant = "stack" }) {
  const m = META[variant] ?? META.stack;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "monotonic" ? <Monotonic /> : variant === "deque" ? <DequeVariant /> : <StackBasics />}
    </LabShell>
  );
}
