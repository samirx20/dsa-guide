import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable,
  rng, useAnimationFrame, useStepper,
} from "@/viz/kit";

const fmt = (x) => (Math.round(x * 100) / 100).toFixed(x < 10 ? 2 : 1);

/* ------------------------------------------------------------------ */
/* Shared: animated playhead + Gantt chart                             */
/* ------------------------------------------------------------------ */

function usePlayhead(total, deps) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    setT(0);
    setPlaying(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useAnimationFrame((dt) => {
    setT((x) => {
      const nx = x + dt * speed;
      if (nx >= total) {
        setPlaying(false);
        return total;
      }
      return nx;
    });
  }, playing);
  const toggle = () => {
    if (!playing && t >= total) setT(0);
    setPlaying((p) => !p);
  };
  return { t, setT, playing, toggle, speed, setSpeed, reset: () => (setPlaying(false), setT(0)), done: t >= total };
}

function PlayheadBar({ ph, total, label = "t" }) {
  return (
    <div className="space-y-2 rounded-lg border bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="icon-sm" onClick={ph.reset} aria-label="Reset">
          <RotateCcw />
        </Button>
        <Button size="sm" onClick={ph.toggle} className="w-24">
          {ph.playing ? <Pause /> : <Play />} {ph.playing ? "Pause" : "Run"}
        </Button>
        <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground">
          {label} = {fmt(ph.t)}s / {fmt(total)}s
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <Slider value={[ph.t]} min={0} max={total} step={0.01} onValueChange={([v]) => ph.setT(v)} aria-label="Scrub time" />
        <div className="flex w-36 items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Speed</span>
          <Slider value={[ph.speed]} min={0.25} max={4} step={0.25} onValueChange={([v]) => ph.setSpeed(v)} aria-label="Speed" />
          <span className="w-9 font-mono text-[11px] tabular-nums">{ph.speed}×</span>
        </div>
      </div>
    </div>
  );
}

const KIND = {
  run: { color: C.active, op: 0.9 },
  wait: { color: C.purple, op: 0.35 },
  thread: { color: C.warn, op: 0.45 },
  block: { color: C.bad, op: 0.85 },
  idle: { color: C.muted, op: 0.18 },
  done: { color: C.ok, op: 0.85 },
  raised: { color: C.bad, op: 0.9 },
  cancelled: { color: C.bad, op: 0.25 },
  orphan: { color: C.warn, op: 0.35 },
  queued: { color: C.muted, op: 0.15 },
  timeout: { color: C.bad, op: 0.7 },
  backoff: { color: C.warn, op: 0.5 },
};

/** lanes: [{label, segs:[{s,e,kind,text?}], marks:[{t,kind,text}]}] */
function Gantt({ lanes, total, cursor, ghost = true, laneH = 24, labelW = 104 }) {
  const W = 620;
  const top = 8;
  const H = top + lanes.length * laneH + 26;
  const x = (t) => labelW + (t / Math.max(total, 1e-6)) * (W - labelW - 12);
  const stepT = total > 12 ? 2 : total > 6 ? 1 : total > 2.5 ? 0.5 : 0.25;
  const ticks = [];
  for (let v = 0; v <= total + 1e-9; v += stepT) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={top - 2} y2={H - 20} stroke={C.grid} />
          <text x={x(v)} y={H - 8} fontSize={10} textAnchor="middle" fill={C.muted}>
            {v}s
          </text>
        </g>
      ))}
      {lanes.map((ln, li) => {
        const y = top + li * laneH;
        return (
          <g key={li}>
            <text x={labelW - 8} y={y + laneH / 2 + 4} fontSize={11} textAnchor="end" fill={ln.color ?? C.fg}>
              {ln.label}
            </text>
            {ln.segs.map((sg, k) => {
              const vis = Math.min(sg.e, cursor);
              const K = KIND[sg.kind] ?? KIND.run;
              return (
                <g key={k}>
                  {ghost && <rect x={x(sg.s)} y={y + 4} width={Math.max(x(sg.e) - x(sg.s), 1)} height={laneH - 8} rx={3} fill="none" stroke={K.color} strokeOpacity={0.3} strokeDasharray="3 3" />}
                  {vis > sg.s && (
                    <rect x={x(sg.s)} y={y + 4} width={Math.max(x(vis) - x(sg.s), 1.5)} height={laneH - 8} rx={3} fill={K.color} opacity={K.op} />
                  )}
                  {sg.text && vis > sg.s && x(sg.e) - x(sg.s) > 34 && (
                    <text x={x(sg.s) + 4} y={y + laneH / 2 + 3.5} fontSize={10} fill={C.fg}>
                      {sg.text}
                    </text>
                  )}
                </g>
              );
            })}
            {(ln.marks ?? []).map((m, k) =>
              m.t <= cursor + 1e-9 ? (
                <g key={`m${k}`}>
                  <circle cx={x(m.t)} cy={y + laneH / 2} r={4.5} fill={KIND[m.kind]?.color ?? C.ok} />
                  {m.text && (
                    <text x={x(m.t) + 7} y={y + laneH / 2 + 3.5} fontSize={10} fill={KIND[m.kind]?.color ?? C.ok}>
                      {m.text}
                    </text>
                  )}
                </g>
              ) : null
            )}
          </g>
        );
      })}
      <line x1={x(cursor)} x2={x(cursor)} y1={top - 4} y2={H - 20} stroke={C.fg} strokeWidth={1.5} opacity={0.7} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: event-loop                                                 */
/* ------------------------------------------------------------------ */

const LLM_WAIT = {
  await: { line: "    await asyncio.sleep(3)          # yields to the loop", k: "await", label: "await asyncio.sleep(3)" },
  block: { line: "    time.sleep(3)                   # BLOCKS the whole thread!", k: "block", label: "time.sleep(3)" },
  thread: { line: "    await asyncio.to_thread(time.sleep, 3)  # off-loop", k: "thread", label: "asyncio.to_thread(time.sleep, 3)" },
};

const loopCode = (mode) => `import asyncio, time

async def call_llm():
    print("LLM: sending prompt")
${LLM_WAIT[mode].line}
    print("LLM: got answer")

async def query_db():
    print("DB: SELECT * FROM readings")
    await asyncio.sleep(1)
    print("DB: rows ready")

async def read_sensor():
    for i in range(2):
        print(f"sensor tick {i}")
        await asyncio.sleep(0.5)
    print("sensor: done")

async def main():
    await asyncio.gather(query_db(), read_sensor(), call_llm())

asyncio.run(main())`;

const loopTasks = (mode) => [
  {
    name: "query_db",
    ops: [
      { k: "cpu", d: 0.1, label: 'print("DB: SELECT ...")', line: 9 },
      { k: "await", d: 1, label: "await asyncio.sleep(1)", line: 10 },
      { k: "cpu", d: 0.1, label: 'print("DB: rows ready")', line: 11 },
    ],
  },
  {
    name: "read_sensor",
    ops: [
      { k: "cpu", d: 0.1, label: "print(sensor tick 0)", line: 15 },
      { k: "await", d: 0.5, label: "await asyncio.sleep(0.5)", line: 16 },
      { k: "cpu", d: 0.1, label: "print(sensor tick 1)", line: 15 },
      { k: "await", d: 0.5, label: "await asyncio.sleep(0.5)", line: 16 },
      { k: "cpu", d: 0.1, label: 'print("sensor: done")', line: 17 },
    ],
  },
  {
    name: "call_llm",
    ops: [
      { k: "cpu", d: 0.1, label: 'print("LLM: sending prompt")', line: 4 },
      { k: LLM_WAIT[mode].k, d: 3, label: LLM_WAIT[mode].label, line: 5 },
      { k: "cpu", d: 0.1, label: 'print("LLM: got answer")', line: 6 },
    ],
  },
];

/** Single-threaded cooperative scheduler. Pure: tasks -> {steps, spans, loopSpans, total}. */
export function simulateLoop(tasks) {
  const st = tasks.map((t) => ({ ...t, pc: 0, done: false }));
  const spans = st.map(() => []);
  const loopSpans = [];
  const waiting = new Map(); // idx -> wake time
  const ready = st.map((_, i) => i);
  const steps = [];
  let t = 0;
  let maxLate = 0;
  const r2 = (v) => Math.round(v * 1000) / 1000;
  const snap = (note, tone, running = null, line = 20) =>
    steps.push({
      t: r2(t), note, tone, line, running: running == null ? null : st[running].name,
      ready: ready.map((i) => st[i].name),
      waiting: [...waiting].map(([i, w]) => ({ name: st[i].name, wake: r2(w), thread: st[i].ops[st[i].pc - 1]?.k === "thread" })),
      done: st.filter((s) => s.done).map((s) => s.name),
      maxLate: r2(maxLate),
    });
  const wake = () => {
    const ex = [...waiting].filter(([, w]) => w <= t + 1e-9).sort((a, b) => a[1] - b[1]);
    for (const [i, w] of ex) {
      waiting.delete(i);
      ready.push(i);
      maxLate = Math.max(maxLate, t - w);
    }
    return ex;
  };
  snap("asyncio.run(main()) starts the loop; gather() schedules all three coroutines into the ready queue.", "default", null, 20);
  let guard = 0;
  while ((ready.length || waiting.size) && guard++ < 300) {
    if (!ready.length) {
      const nt = Math.min(...waiting.values());
      loopSpans.push({ s: t, e: nt, kind: "idle" });
      t = nt;
      const ex = wake();
      snap(`Nothing is ready, so the loop sleeps in the OS selector until the next timer/I-O event at t=${fmt(t)}s → ${ex.map(([i]) => st[i].name).join(", ")} back to ready.`, "default", null, 20);
      continue;
    }
    const i = ready.shift();
    const task = st[i];
    for (;;) {
      const op = task.ops[task.pc];
      if (!op) {
        task.done = true;
        snap(`${task.name}() returns — its result is stored for gather().`, "ok", null, op?.line ?? 20);
        break;
      }
      task.pc++;
      if (op.k === "cpu") {
        spans[i].push({ s: t, e: t + op.d, kind: "run" });
        loopSpans.push({ s: t, e: t + op.d, kind: "run" });
        t += op.d;
        snap(`${task.name} is the ONLY code running: ${op.label}. Everyone else waits for it to reach an await.`, "active", i, op.line);
      } else if (op.k === "block") {
        spans[i].push({ s: t, e: t + op.d, kind: "block", text: "time.sleep" });
        loopSpans.push({ s: t, e: t + op.d, kind: "block" });
        const pending = [...waiting].filter(([, w]) => w < t + op.d).map(([j]) => st[j].name);
        t += op.d;
        snap(
          `${op.label} froze the whole thread for ${op.d}s. ` +
            (ready.length || pending.length ? `${[...ready.map((j) => st[j].name), ...pending].join(", ")} were ready or due but could not run.` : "No other coroutine has even started yet."),
          "bad", i, op.line
        );
      } else {
        waiting.set(i, t + op.d);
        spans[i].push({ s: t, e: t + op.d, kind: op.k === "thread" ? "thread" : "wait", text: op.k === "thread" ? "thread pool" : "awaiting" });
        snap(
          op.k === "thread"
            ? `${task.name} hands time.sleep to a worker thread and suspends at await; the loop stays free.`
            : `${task.name} hits ${op.label} → suspends and yields control back to the event loop (wakes at t=${fmt(t + op.d)}s).`,
          "warn", null, op.line
        );
        break;
      }
    }
    const ex = wake();
    if (ex.length) snap(`Timer fired: ${ex.map(([j]) => st[j].name).join(", ")} moves back into the ready queue.`, "default", null, 20);
  }
  snap(`All coroutines finished at t=${fmt(t)}s.` + (maxLate > 0.01 ? ` Worst timer was serviced ${fmt(maxLate)}s late because the loop was blocked.` : " Every wake-up was serviced on time."), maxLate > 0.01 ? "bad" : "ok", null, 22);
  return { steps, spans, loopSpans, total: t, names: st.map((s) => s.name) };
}

function QueueBox({ title, items, tone, empty = "empty" }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border bg-card p-2">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex min-h-7 flex-wrap gap-1">
        {items.length ? items.map((x) => (
          <Badge key={x} variant={tone}>
            {x}
          </Badge>
        )) : <span className="text-[11px] text-muted-foreground">{empty}</span>}
      </div>
    </div>
  );
}

function EventLoopVariant() {
  const [mode, setMode] = useState("await");
  const sim = useMemo(() => simulateLoop(loopTasks(mode)), [mode]);
  const st = useStepper(sim.steps, { baseMs: 1000 });
  const step = st.step;
  const lanes = [
    { label: "loop thread", color: C.muted, segs: sim.loopSpans },
    ...sim.names.map((n, k) => ({ label: n, segs: sim.spans[k] })),
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted-foreground">call_llm waits with</span>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="await">await asyncio.sleep</TabsTrigger>
            <TabsTrigger value="block">time.sleep (blocking)</TabsTrigger>
            <TabsTrigger value="thread">to_thread</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-wrap gap-2">
        <QueueBox title="Ready queue" items={step.ready} tone="active" />
        <QueueBox title="Running (1 thread)" items={step.running ? [step.running] : []} tone={step.tone === "bad" ? "danger" : "success"} empty="loop idle" />
        <QueueBox title="Awaiting" items={step.waiting.map((w) => `${w.name} → ${fmt(w.wake)}s`)} tone={"purple"} />
      </div>
      <Stage className="p-2">
        <Gantt lanes={lanes} total={sim.total} cursor={step.t} />
      </Stage>
      <Split>
        <div className="space-y-3">
          <Legend items={[[C.active, "running on loop"], [C.purple, "suspended at await"], [C.warn, "in thread pool"], [C.bad, "blocking call"], [C.muted, "loop idle (selector)"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={loopCode(mode)} active={step.line} lang="python" maxHeight={300} />
          <VarTable
            vars={[
              ["loop clock t", `${fmt(step.t)}s`, "active"],
              ["finished", step.done.join(", ") || "—", "ok"],
              ["timer lateness (max)", `${fmt(step.maxLate)}s`, step.maxLate > 0.01 ? "bad" : undefined],
              ["total runtime", `${fmt(sim.total)}s`],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: gather / TaskGroup                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_LAT = [1.0, 0.6, 1.4, 0.8, 1.2, 0.5];
const sensorName = (i) => `temp-0${i + 1}`;

/** Pure: latencies + strategy -> per-task segments and caller outcome. */
export function gatherPlan(lat, mode, failIdx, retExc) {
  const n = lat.length;
  const tasks = [];
  let total;
  let outcome;
  if (mode === "sequential") {
    let t = 0;
    let stopped = false;
    for (let i = 0; i < n; i++) {
      if (stopped) {
        tasks.push({ s: null, e: null, status: "never" });
        continue;
      }
      const raised = i === failIdx;
      tasks.push({ s: t, e: t + lat[i], status: raised ? "raised" : "done" });
      t += lat[i];
      if (raised) stopped = true;
    }
    total = t;
    outcome = failIdx >= 0 ? `ValueError propagates out of main() at ${fmt(t)}s — later sensors never started.` : `${n} awaits one after another: total = sum = ${fmt(t)}s.`;
  } else {
    const tf = failIdx >= 0 ? lat[failIdx] : Infinity;
    for (let i = 0; i < n; i++) {
      if (i === failIdx) tasks.push({ s: 0, e: lat[i], status: "raised" });
      else if (lat[i] <= tf) tasks.push({ s: 0, e: lat[i], status: "done" });
      else if (mode === "taskgroup") tasks.push({ s: 0, e: tf, status: "cancelled", planned: lat[i] });
      else if (retExc) tasks.push({ s: 0, e: lat[i], status: "done" });
      else tasks.push({ s: 0, e: lat[i], status: "orphan" });
    }
    const max = Math.max(...lat);
    if (failIdx < 0) {
      total = max;
      outcome = `All ${n} run concurrently: total = max(latencies) = ${fmt(max)}s; results come back in INPUT order.`;
    } else if (mode === "taskgroup") {
      total = tf;
      outcome = `${sensorName(failIdx)} raised at ${fmt(tf)}s → TaskGroup cancels every sibling still running and raises ExceptionGroup.`;
    } else if (retExc) {
      total = max;
      outcome = `return_exceptions=True: the ValueError is placed in the result list; gather waits for all and returns at ${fmt(max)}s.`;
    } else {
      total = tf;
      outcome = `gather() re-raises the first exception at ${fmt(tf)}s — but siblings are NOT cancelled: they keep running and their results are lost.`;
    }
    total = Math.max(total, ...tasks.map((x) => x.e ?? 0));
  }
  return { tasks, total, outcome, callerDone: mode === "sequential" ? total : failIdx >= 0 && !retExc ? lat[failIdx] : Math.max(...lat) };
}

const GATHER_CODE = {
  sequential: `async def main():
    results = []
    for sid in sensors:
        # each await finishes before the next starts
        results.append(await fetch_sensor(sid))`,
  gather: `async def main():
    results = await asyncio.gather(
        *(fetch_sensor(sid) for sid in sensors),
        return_exceptions=RET_EXC,
    )
    # results are in INPUT order, not finish order`,
  taskgroup: `async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_sensor(sid))
                     for sid in sensors]
        # block exit = all tasks done
        print([t.result() for t in tasks])
    except* ValueError as eg:
        print("failed:", eg.exceptions)  # siblings cancelled`,
};

function GatherVariant() {
  const [n, setN] = useState(3);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [mode, setMode] = useState("gather");
  const [fail, setFail] = useState("-1");
  const [retExc, setRetExc] = useState(false);
  const L = lat.slice(0, n);
  const failIdx = Number(fail) < n ? Number(fail) : -1;
  const plan = useMemo(() => gatherPlan(L, mode, failIdx, retExc), [L.join(), mode, failIdx, retExc]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = plan.total;
  const ph = usePlayhead(total, [plan]);
  const t = ph.t;
  const seqTotal = L.reduce((a, b) => a + b, 0);

  const lanes = L.map((_, i) => {
    const k = plan.tasks[i];
    if (k.s == null) return { label: sensorName(i), segs: [] };
    const kind = k.status === "done" ? "run" : k.status;
    return {
      label: sensorName(i),
      segs: [{ s: k.s, e: k.e, kind: k.status === "raised" ? "run" : kind, text: k.status === "orphan" ? "orphan" : k.status === "cancelled" ? "cancelled" : `${fmt(L[i])}s` }],
      marks: [{ t: k.e, kind: k.status === "done" ? "done" : k.status === "raised" ? "raised" : k.status === "cancelled" ? "cancelled" : "orphan", text: k.status === "raised" ? "raise" : k.status === "cancelled" ? "✕" : "" }],
    };
  });
  const statusAt = (k) => {
    if (k.s == null) return ["never started", "outline"];
    if (t < k.s || t === 0) return ["pending", "outline"];
    if (t < k.e) return [k.status === "orphan" && t >= plan.callerDone ? "orphan (running)" : "running", k.status === "orphan" && t >= plan.callerDone ? "warning" : "active"];
    return { done: ["done", "success"], raised: ["raised ValueError", "danger"], cancelled: ["CancelledError", "danger"], orphan: ["done (result lost)", "warning"] }[k.status];
  };
  const finishOrder = L.map((_, i) => i).filter((i) => plan.tasks[i].e != null && plan.tasks[i].status !== "cancelled").sort((a, b) => plan.tasks[a].e - plan.tasks[b].e);
  const callerReturned = t >= plan.callerDone - 1e-9;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="sequential">Sequential await</TabsTrigger>
            <TabsTrigger value="gather">asyncio.gather</TabsTrigger>
            <TabsTrigger value="taskgroup">TaskGroup</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={fail} onValueChange={setFail}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">No failures</SelectItem>
            {L.map((_, i) => (
              <SelectItem key={i} value={String(i)}>
                {sensorName(i)} raises ValueError
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setLat(DEFAULT_LAT.map(() => Math.round((0.3 + Math.random() * 1.7) * 10) / 10))}>
          <Shuffle /> Random latencies
        </Button>
      </div>
      <Stage className="p-2">
        <Gantt lanes={[...lanes, { label: "main()", color: C.muted, segs: [{ s: 0, e: plan.callerDone, kind: "wait", text: mode === "sequential" ? "awaiting each" : "awaiting" }], marks: [{ t: plan.callerDone, kind: failIdx >= 0 && !retExc ? "raised" : "done", text: failIdx >= 0 && !retExc ? "exception" : "results" }] }]} total={total} cursor={t} />
      </Stage>
      <Split>
        <div className="space-y-3">
          <Legend items={[[C.active, "task running (awaiting I/O)"], [C.ok, "completed"], [C.bad, "raised / cancelled"], [C.warn, "orphaned (gather does not cancel)"]]} />
          <Narration tone={!ph.done ? "active" : failIdx >= 0 && !retExc ? "bad" : "ok"}>
            {ph.done ? plan.outcome : t === 0 ? "Press Run to start the event loop clock." : `t = ${fmt(t)}s: ${plan.tasks.filter((k) => k.s != null && t >= k.s && t < k.e).length} task(s) in flight.`}
          </Narration>
          <PlayheadBar ph={ph} total={total} />
        </div>
        <div className="space-y-3">
          <StatGrid cols={3}>
            <Stat label="main() resumes" value={`${fmt(plan.callerDone)}s`} tone="active" />
            <Stat label="sequential sum" value={`${fmt(seqTotal)}s`} />
            <Stat label="speedup" value={`${(seqTotal / plan.callerDone).toFixed(1)}×`} tone="ok" hint="Sum of latencies ÷ time until main() resumes" />
          </StatGrid>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>task</TableHead>
                <TableHead className="text-right">latency</TableHead>
                <TableHead className="text-right">state @ t</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {L.map((_, i) => {
                const [label, v] = statusAt(plan.tasks[i]);
                return (
                  <TableRow key={i}>
                    <TableCell className="py-1 font-mono text-[12px]">{sensorName(i)}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{fmt(L[i])}s</TableCell>
                    <TableCell className="py-1 text-right">
                      <Badge variant={v}>{label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-[11.5px]">
            <div>finish order: [{finishOrder.filter((i) => plan.tasks[i].e <= t + 1e-9).map(sensorName).join(", ")}]</div>
            <div>results order: {callerReturned ? (failIdx >= 0 && !retExc ? <span className="text-viz-bad">raises {mode === "taskgroup" ? "ExceptionGroup" : "ValueError"}</span> : `[${L.map((_, i) => (i === failIdx ? "ValueError(...)" : `r_${sensorName(i)}`)).join(", ")}]`) : "…pending"}</div>
          </div>
        </div>
      </Split>
      <Split>
        <Panel title="Task latencies">
          <SliderControl label="number of tasks N" value={n} min={2} max={6} onChange={setN} />
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {L.map((v, i) => (
              <SliderControl key={i} label={sensorName(i)} value={v} min={0.1} max={3} step={0.1} format={(x) => `${x.toFixed(1)}s`} onChange={(x) => setLat((a) => a.map((y, j) => (j === i ? x : y)))} />
            ))}
          </div>
          {mode === "gather" && <SwitchControl label="return_exceptions=True" hint="Collect exceptions as values instead of raising" checked={retExc} onChange={setRetExc} />}
        </Panel>
        <CodePanel code={GATHER_CODE[mode].replace("RET_EXC", retExc ? "True" : "False")} lang="python" title={mode} />
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: http                                                        */
/* ------------------------------------------------------------------ */

/** Pure: schedule N requests over k semaphore slots with timeouts + exponential backoff. */
export function httpPlan({ n, k, timeout, failure, seed, maxRetries = 3 }) {
  const r = rng(seed);
  const reqs = Array.from({ length: n }, (_, i) => {
    const base = Math.round((0.3 + r() * 0.9) * 100) / 100;
    // attempt latencies: flaky -> first attempt hangs; down -> every attempt hangs
    const flaky = failure === "flaky" && i % 4 === 2;
    const down = failure === "down" && i === 1;
    return { i, base, attempts: Array.from({ length: maxRetries }, (_, a) => (down || (flaky && a === 0) ? timeout * 3 : base)) };
  });
  const slots = Array(k).fill(0);
  let retries = 0;
  let failed = 0;
  const lanes = reqs.map((q) => {
    const si = slots.indexOf(Math.min(...slots));
    let t = slots[si];
    const segs = [];
    if (t > 0) segs.push({ s: 0, e: t, kind: "queued", text: "sem wait" });
    let ok = false;
    for (let a = 0; a < maxRetries; a++) {
      const d = q.attempts[a];
      if (d <= timeout) {
        segs.push({ s: t, e: t + d, kind: "run", text: a ? `try ${a + 1}` : "GET" });
        t += d;
        ok = true;
        break;
      }
      segs.push({ s: t, e: t + timeout, kind: "timeout", text: "timeout" });
      t += timeout;
      if (a < maxRetries - 1) {
        segs.push({ s: t, e: t + 2 ** a, kind: "backoff", text: `sleep ${2 ** a}s` });
        t += 2 ** a;
        retries++;
      }
    }
    if (!ok) failed++;
    slots[si] = t;
    return { label: `sensor-${String(q.i + 1).padStart(2, "0")}`, segs, marks: [{ t, kind: ok ? "done" : "raised" }], end: t, ok, busy: t - (segs[0]?.kind === "queued" ? segs[0].e : 0) };
  });
  const total = Math.max(...lanes.map((l) => l.end));
  const work = lanes.reduce((a, l) => a + l.busy, 0);
  return { lanes, total, work, retries, failed };
}

const HTTP_CODE = {
  blocking: `import requests

async def fetch_many_bad(urls):
    results = []
    for url in urls:
        # SYNCHRONOUS: the event loop is frozen here
        r = requests.get(url, timeout=TIMEOUT)
        results.append(r.json())
    return results`,
  async: `import httpx, asyncio

sem = asyncio.Semaphore(LIMIT)

async def fetch_with_retry(client, url, max_retries=3):
    async with sem:                      # at most LIMIT in flight
        for attempt in range(max_retries):
            try:
                r = await client.get(url)
                r.raise_for_status()
                return r.json()
            except httpx.TimeoutException:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)   # 1s, 2s

async def fetch_many_good(urls):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        return await asyncio.gather(
            *(fetch_with_retry(client, u) for u in urls),
            return_exceptions=True)`,
};

function HttpVariant() {
  const [mode, setMode] = useState("async");
  const [n, setN] = useState(8);
  const [k, setK] = useState(4);
  const [timeout, setTimeoutS] = useState(2);
  const [failure, setFailure] = useState("none");
  const [seed, setSeed] = useState(7);
  const limit = mode === "blocking" ? 1 : k;
  const plan = useMemo(() => httpPlan({ n, k: limit, timeout, failure, seed }), [n, limit, timeout, failure, seed]);
  const ph = usePlayhead(plan.total, [plan]);
  const t = ph.t;
  // heartbeat coroutine ticking every 0.5s: starves while requests.get blocks the loop
  const beats = [];
  for (let b = 0; b <= plan.total + 1e-9; b += 0.5) beats.push(b);
  const hbMarks = mode === "blocking" ? [{ t: 0, kind: "done" }, { t: plan.total, kind: "raised", text: `${beats.length - 2} ticks missed` }] : beats.map((b) => ({ t: b, kind: "done" }));
  const inFlight = plan.lanes.filter((l) => l.segs.some((s) => s.kind !== "queued" && t >= s.s && t < s.e)).length;
  const finished = plan.lanes.filter((l) => l.end <= t + 1e-9).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="blocking">requests.get loop</TabsTrigger>
            <TabsTrigger value="async">httpx.AsyncClient + Semaphore</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={failure} onValueChange={setFailure}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All sensors healthy</SelectItem>
            <SelectItem value="flaky">Flaky: some time out once</SelectItem>
            <SelectItem value="down">sensor-02 is down</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSeed((s) => s + 1)}>
          <Shuffle /> New latencies
        </Button>
      </div>
      <Stage className="p-2">
        <Gantt
          lanes={[{ label: "heartbeat()", color: C.muted, segs: [], marks: hbMarks }, ...plan.lanes]}
          total={plan.total}
          cursor={t}
          laneH={plan.lanes.length > 10 ? 19 : 22}
        />
      </Stage>
      <Split>
        <div className="space-y-3">
          <Legend items={[[C.active, "request in flight"], [C.muted, "waiting for semaphore"], [C.bad, "timeout"], [C.warn, "backoff sleep"], [C.ok, "200 OK / heartbeat tick"]]} />
          <Narration tone={mode === "blocking" ? "bad" : plan.failed ? "warn" : "ok"}>
            {mode === "blocking"
              ? `requests.get() is synchronous: ${n} requests run strictly one after another (${fmt(plan.total)}s) and the heartbeat coroutine cannot tick even once until the loop is released.`
              : `Semaphore(${k}) keeps at most ${k} requests in flight; the rest queue. Wall time ${fmt(plan.total)}s vs ${fmt(plan.work)}s of total request time.` +
                (plan.retries ? ` ${plan.retries} retry backoff(s) happened inside the semaphore.` : "") +
                (plan.failed ? ` ${plan.failed} sensor(s) exhausted 3 attempts → exception returned in results (return_exceptions=True).` : "")}
          </Narration>
          <PlayheadBar ph={ph} total={plan.total} />
        </div>
        <div className="space-y-3">
          <StatGrid cols={2}>
            <Stat label="wall time" value={`${fmt(plan.total)}s`} tone="active" />
            <Stat label="Σ request time" value={`${fmt(plan.work)}s`} hint="What a purely sequential run would spend in requests" />
            <Stat label="in flight @ t" value={`${inFlight} / ${limit}`} />
            <Stat label="done @ t" value={`${finished} / ${n}`} tone="ok" />
            <Stat label="retries" value={plan.retries} tone={plan.retries ? "warn" : undefined} />
            <Stat label="failed" value={plan.failed} tone={plan.failed ? "bad" : undefined} />
          </StatGrid>
          <Panel title="Parameters">
            <SliderControl label="requests (sensors)" value={n} min={3} max={14} onChange={setN} />
            <SliderControl label="Semaphore limit" value={k} min={1} max={14} onChange={setK} disabled={mode === "blocking"} />
            <SliderControl label="httpx timeout" value={timeout} min={0.5} max={4} step={0.5} format={(v) => `${v}s`} onChange={setTimeoutS} />
          </Panel>
        </div>
      </Split>
      <CodePanel code={HTTP_CODE[mode].replace(/LIMIT/g, k).replace("TIMEOUT", timeout)} lang="python" maxHeight={260} />
    </>
  );
}

/* ------------------------------------------------------------------ */

const META = {
  "event-loop": {
    title: "Event Loop Scheduler — one thread, many coroutines",
    description: "Step through a single-threaded event loop: coroutines run until they hit await, then yield. Swap in time.sleep to see one blocking call freeze everyone.",
    badges: ["asyncio", "cooperative multitasking"],
  },
  gather: {
    title: "Concurrent Execution — sequential vs gather vs TaskGroup",
    description: "Gantt timeline of N sensor fetches. Make one task raise and compare how gather() and TaskGroup handle the siblings.",
    badges: ["asyncio.gather", "TaskGroup", "total ≈ max(latency)"],
  },
  http: {
    title: "Async HTTP — requests vs httpx.AsyncClient",
    description: "Fetch many sensor endpoints: blocking requests.get in a loop vs concurrent httpx with a Semaphore cap, timeouts and exponential-backoff retries.",
    badges: ["httpx", "Semaphore", "retries"],
  },
};

export default function AsyncTimelineLab({ variant = "event-loop" }) {
  const m = META[variant] ?? META["event-loop"];
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "gather" ? <GatherVariant /> : variant === "http" ? <HttpVariant /> : <EventLoopVariant />}
    </LabShell>
  );
}
