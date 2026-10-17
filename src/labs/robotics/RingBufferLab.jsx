import { useMemo, useRef, useState } from "react";
import { Power, RotateCcw, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrayView, C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, gauss, rng, useAnimationFrame } from "@/viz/kit";

/* ------------------------------------------------------------------ */
/* Pure ring-buffer ops (push_overwrite semantics from the chapter)    */
/* ------------------------------------------------------------------ */
const ringInit = (N) => ({ N, buf: Array(N).fill(null), head: 0, tail: 0, count: 0, overwritten: 0, seq: 101, last: null });

function ringPush(r, value) {
  const buf = [...r.buf];
  const v = value ?? r.seq;
  const slot = r.head;
  const full = r.count === r.N;
  buf[slot] = { v, live: true };
  const head = (r.head + 1) % r.N;
  return full
    ? { ...r, buf, head, tail: (r.tail + 1) % r.N, overwritten: r.overwritten + 1, seq: r.seq + 1, last: { op: "push", slot, overwrote: true, v } }
    : { ...r, buf, head, count: r.count + 1, seq: r.seq + 1, last: { op: "push", slot, v } };
}
function ringPop(r) {
  if (r.count === 0) return { ...r, last: { op: "pop", empty: true } };
  const buf = [...r.buf];
  const slot = r.tail;
  const v = buf[slot].v;
  buf[slot] = { v, live: false };
  return { ...r, buf, tail: (r.tail + 1) % r.N, count: r.count - 1, last: { op: "pop", slot, v } };
}
const ringOrder = (r) => Array.from({ length: r.count }, (_, k) => r.buf[(r.tail + k) % r.N].v);

/* ------------------------------------------------------------------ */
/* Circular dial                                                       */
/* ------------------------------------------------------------------ */
function Dial({ r, size = 300, flash, label }) {
  const cx = size / 2,
    cy = size / 2,
    R = size * 0.34;
  const slotR = Math.min(24, (Math.PI * R) / r.N - 3);
  const pos = (k, rr = R) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / r.N;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const tag = (k, text, color, out) => {
    const [x, y] = pos(k, R + (out ? slotR + 22 : -slotR - 20));
    return (
      <g className="transition-all duration-300">
        <rect x={x - 22} y={y - 9} width={44} height={18} rx={9} fill={color} />
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.card}>
          {text}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full font-mono">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.grid} strokeWidth={2} />
      {label && (
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill={C.muted}>
          {label}
        </text>
      )}
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.fg}>
        count {r.count}/{r.N}
      </text>
      {r.buf.map((s, k) => {
        const [x, y] = pos(k);
        const isFlash = flash && r.last && r.last.slot === k;
        const col = isFlash ? (r.last.overwrote ? C.warn : r.last.op === "pop" ? C.active : C.ok) : s?.live ? C.ink : C.grid;
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={slotR} fill={s?.live ? C.fill : C.card} stroke={col} strokeWidth={isFlash ? 3 : 1.5} className="transition-all duration-200" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={r.N > 8 ? 9 : 11} fontWeight={600} fill={s?.live ? C.fg : C.muted} opacity={s?.live ? 1 : 0.5}>
              {s ? `#${s.v}` : "·"}
            </text>
            <text x={x} y={y + slotR + 11} textAnchor="middle" fontSize={9} fill={C.muted}>
              {k}
            </text>
          </g>
        );
      })}
      {tag(r.head, "HEAD", C.ok, true)}
      {tag(r.tail, "TAIL", C.active, false)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: ring buffer playground                                        */
/* ------------------------------------------------------------------ */
function RingTab() {
  const [r, setR] = useState(() => ringInit(8));
  const [auto, setAuto] = useState(false);
  const [scale, setScale] = useState(0.03);
  const [consumer, setConsumer] = useState("drain");
  const sim = useRef({ t: 0, nextP: 0, nextC: 10, drained: 0, dropped: 0 });
  const [, setTick] = useState(0);
  const rr = useRef(r);
  rr.current = r;

  useAnimationFrame((dt) => {
    const s = sim.current;
    const tEnd = s.t + dt * 1000 * scale;
    let cur = rr.current;
    let guard = 0;
    while (Math.min(s.nextP, s.nextC) <= tEnd && guard++ < 200) {
      if (s.nextP <= s.nextC) {
        cur = ringPush(cur);
        s.nextP += 2.5; // 400 Hz IMU producer
      } else {
        if (consumer === "drain") {
          let n = 0;
          while (cur.count) (cur = ringPop(cur)), n++;
          s.drained = n;
        } else cur = ringPop(cur);
        s.nextC += 10; // 100 Hz consumer
      }
    }
    s.t = tEnd;
    if (cur !== rr.current) setR(cur);
    setTick((x) => x + 1);
  }, auto);

  const setN = (n) => {
    setR(ringInit(+n));
    sim.current = { t: 0, nextP: 0, nextC: 10, drained: 0 };
  };
  const burst = () => setR((x) => [0, 1, 2, 3, 4].reduce((a) => ringPush(a), x));
  const pow2 = (r.N & (r.N - 1)) === 0;
  const prevHead = (r.head - 1 + r.N) % r.N;
  const last = r.last;
  const note = !last
    ? "Empty: head = tail = 0, count = 0. push_overwrite() writes at head; pop() reads at tail. Neither ever shifts memory."
    : last.op === "pop"
      ? last.empty
        ? "pop() on an empty buffer returns std::nullopt — the consumer simply skips this tick."
        : `pop() read #${last.v} from slot ${last.slot} (the oldest) and advanced tail = (${last.slot} + 1) % ${r.N} = ${r.tail}.`
      : last.overwrote
        ? `FULL → push_overwrite wrote #${last.v} over the oldest sample in slot ${last.slot} and advanced BOTH head and tail. count stays ${r.N}; the PID always sees the ${r.N} freshest samples.`
        : `push wrote #${last.v} into slot ${last.slot}; head = (${last.slot} + 1) % ${r.N} = ${r.head}.`;

  return (
    <Split>
      <div className="space-y-3">
        <Stage className="mx-auto max-w-[360px] p-2">
          <Dial r={r} flash label="std::array<ImuSample, N>" />
        </Stage>
        <ArrayView
          values={r.buf.map((s) => (s ? `#${s.v}` : "—"))}
          states={Object.fromEntries(r.buf.map((s, k) => [k, last && last.slot === k ? (last.overwrote ? "warn" : last.op === "pop" ? "active" : "ok") : s && !s.live ? "dim" : undefined]))}
          pointers={[
            { index: r.head, label: "HEAD", tone: "success" },
            { index: r.tail, label: "TAIL", tone: "active" },
          ]}
          cellWidth={r.N > 8 ? 40 : 52}
          label="linear memory (what the CPU actually sees)"
        />
        <Narration tone={last?.overwrote ? "warn" : last?.empty ? "bad" : "active"}>{note}</Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Operations">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setR((x) => ringPush(x))}>
              push_overwrite()
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setR((x) => ringPop(x))}>
              pop()
            </Button>
            <Button size="sm" variant="outline" onClick={burst}>
              <Zap /> Burst +5
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setN(r.N)}>
              <RotateCcw />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">Capacity N</span>
            <Select value={String(r.N)} onValueChange={setN}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 8, 16].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="warning">overwritten {r.overwritten}</Badge>
          </div>
        </Panel>
        <Panel title="Auto-run: 400 Hz IMU producer vs 100 Hz PID consumer">
          <SwitchControl label="Auto-stream" checked={auto} onChange={setAuto} />
          <ToggleGroup type="single" value={consumer} onValueChange={(v) => v && setConsumer(v)}>
            <ToggleGroupItem value="drain">drain all per tick</ToggleGroupItem>
            <ToggleGroupItem value="one">pop() 1 per tick</ToggleGroupItem>
          </ToggleGroup>
          <SliderControl label="time scale (slow motion)" value={scale} onChange={setScale} min={0.01} max={0.2} step={0.01} format={(v) => `${v.toFixed(2)}×`} />
          <div className="font-mono text-[11.5px] text-muted-foreground">sim t = {sim.current.t.toFixed(1)} ms</div>
        </Panel>
        <VarTable
          vars={[
            ["head_", r.head, "ok"],
            ["tail_", r.tail, "active"],
            ["count_", r.count],
            ["overwritten_", r.overwritten, "warn"],
            ["next head", `(${prevHead} + 1) % ${r.N} = ${r.head}`],
            ...(pow2 ? [["as bitmask", `(${prevHead} + 1) & ${r.N - 1} = ${(prevHead + 1) & (r.N - 1)}`]] : []),
            ["oldest → newest", `[${ringOrder(r).join(", ")}]`],
          ]}
        />
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: sleep_for drift vs sleep_until                               */
/* ------------------------------------------------------------------ */
function cadence({ Ts, exec, sched, ticks, jumpAt, systemClock, seed }) {
  const r = rng(seed);
  const forT = [0],
    untilT = [0];
  let tf = 0,
    tu = 0;
  for (let k = 1; k <= ticks; k++) {
    const e = Math.max(0.05, exec * (1 + 0.1 * gauss(r)));
    const w = Math.abs(gauss(r)) * sched;
    tf = tf + e + Ts + w; // sleep_for: duration AFTER work → errors accumulate
    const target = k * Ts;
    let wake = Math.max(target, tu + e) + w; // sleep_until(next_tick)
    if (systemClock && jumpAt != null && k === jumpAt) wake += 500; // NTP steps system_clock back 500 ms
    tu = wake;
    forT.push(tf);
    untilT.push(tu);
  }
  return { forT, untilT };
}

function TimingTab() {
  const [Ts, setTs] = useState(10);
  const [exec, setExec] = useState(1.5);
  const [sched, setSched] = useState(0.2);
  const [systemClock, setSystemClock] = useState(false);
  const [jumpAt, setJumpAt] = useState(null);
  const ticks = 100;
  const d = useMemo(() => cadence({ Ts, exec, sched, ticks, jumpAt, systemClock, seed: 3 }), [Ts, exec, sched, jumpAt, systemClock]);
  const driftFor = d.forT.map((t, k) => t - k * Ts);
  const driftUntil = d.untilT.map((t, k) => t - k * Ts);
  const rateFor = (ticks / d.forT[ticks]) * 1000;
  const W = 600,
    x0 = 70,
    span = 5 * Ts + 8;
  const sx = (t) => x0 + (t / span) * (W - x0 - 10);
  const strip = (times, y, mode) =>
    times.slice(0, 6).map((t, k) => {
      const e = exec;
      const next = times[k + 1];
      return (
        <g key={k}>
          <rect x={sx(t)} y={y} width={Math.max(2, sx(t + e) - sx(t))} height={16} fill={C.warn} rx={2} />
          {next != null && sx(next) < W && <rect x={sx(t + e)} y={y + 5} width={Math.max(0, sx(Math.min(next, span)) - sx(t + e))} height={6} fill={mode === "for" ? C.bad : C.ok} opacity={0.35} rx={2} />}
        </g>
      );
    });
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <svg viewBox={`0 0 ${W} 110`} className="w-full font-mono">
            {Array.from({ length: 6 }, (_, k) => (
              <g key={k}>
                <line x1={sx(k * Ts)} x2={sx(k * Ts)} y1={14} y2={96} stroke={C.muted} strokeDasharray="3 3" />
                <text x={sx(k * Ts)} y={108} textAnchor="middle" fontSize={9.5} fill={C.muted}>
                  {k * Ts} ms
                </text>
              </g>
            ))}
            <text x={4} y={34} fontSize={10.5} fill={C.bad}>
              sleep_for
            </text>
            <text x={4} y={76} fontSize={10.5} fill={C.ok}>
              sleep_until
            </text>
            {strip(d.forT, 22, "for")}
            {strip(d.untilT, 64, "until")}
          </svg>
        </Stage>
        <Stage className="p-2">
          <LinePlot
            series={[
              { data: driftFor, color: C.bad, label: "sleep_for" },
              { data: driftUntil, color: C.ok, label: "sleep_until" },
            ]}
            height={190}
            yLabel="lateness vs ideal grid (ms)"
            xLabel="tick k"
          />
        </Stage>
        <Legend
          items={[
            [C.warn, "PID work t_exec"],
            [C.bad, "sleep_for: cumulative drift"],
            [C.ok, "sleep_until(next_tick): phase-locked"],
          ]}
        />
        <Narration tone={systemClock && jumpAt ? "bad" : "warn"}>
          {systemClock && jumpAt
            ? `system_clock jumped backwards by 500 ms at tick ${jumpAt}: sleep_until targeted a wall-clock time that is now 500 ms away, so the motor loop froze for half a second. steady_clock can never jump.`
            : `sleep_for: each period is ${exec.toFixed(1)} + ${Ts} + ~${sched.toFixed(1)} ms, so after ${ticks} ticks the loop is ${driftFor[ticks].toFixed(0)} ms late (${rateFor.toFixed(1)} Hz instead of ${(1000 / Ts).toFixed(1)} Hz). sleep_until only ever sleeps the remainder, so lateness never accumulates beyond one wake-up jitter.`}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Loop parameters">
          <SliderControl label="nominal period T_s" value={Ts} onChange={setTs} min={5} max={20} step={0.5} format={(v) => `${v} ms`} />
          <SliderControl label="PID compute t_exec" value={exec} onChange={setExec} min={0.5} max={4.5} step={0.1} format={(v) => `${v.toFixed(1)} ms`} />
          <SliderControl label="OS wake-up jitter t_sched" value={sched} onChange={setSched} min={0} max={0.8} step={0.05} format={(v) => `${v.toFixed(2)} ms`} />
        </Panel>
        <Panel title="Clock source">
          <SwitchControl label="Use std::chrono::system_clock" hint="off = steady_clock (monotonic)" checked={systemClock} onChange={setSystemClock} />
          <Button size="sm" variant="destructive" onClick={() => setJumpAt(jumpAt ? null : 40)}>
            {jumpAt ? "Clear NTP jump" : "Simulate NTP jump (−500 ms)"}
          </Button>
        </Panel>
        <StatGrid cols={2}>
          <Stat label="sleep_for drift" value={`+${driftFor[ticks].toFixed(1)} ms`} tone="bad" />
          <Stat label="sleep_until drift" value={`+${driftUntil[ticks].toFixed(1)} ms`} tone="ok" />
          <Stat label="sleep_for rate" value={`${rateFor.toFixed(1)} Hz`} />
          <Stat label="sleep_until rate" value={`${((ticks / d.untilT[ticks]) * 1000).toFixed(1)} Hz`} />
        </StatGrid>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Daemon variant: IMU thread → ring → control loop → motors           */
/* ------------------------------------------------------------------ */
const BINS = [50, 100, 200, 500, 1000, 5000, Infinity]; // µs upper edges
const BIN_LABEL = ["<50", "<100", "<200", "<500", "<1k", "<5k", "miss"];

function newDaemon() {
  return {
    t: 0,
    nextImu: 0,
    nextCtl: 10,
    nextPlan: 0,
    nextUdp: 50,
    ring: ringInit(16),
    tele: ringInit(8),
    tick: 0,
    misses: 0,
    hist: Array(BINS.length).fill(0),
    jitter: [],
    pose: { x: 0.3, y: 0.3, th: 0 },
    cmd: { v: 0, w: 0 },
    pathVer: 0,
    useCount: 1,
    drained: 0,
    worst: 0,
    log: ["[RAII SafetyGuard] Armed motor bus (v=0.0 m/s, w=0.0 rad/s)"],
    estop: false,
    rand: rng(5),
    flash: null,
  };
}

function stepDaemon(d, tEnd, contention) {
  let guard = 0;
  while (!d.estop && guard++ < 400) {
    const nt = Math.min(d.nextImu, d.nextCtl, d.nextPlan, d.nextUdp);
    if (nt > tEnd) break;
    d.t = nt;
    if (nt === d.nextImu) {
      // Thread 1: integrate odometry, push_overwrite RobotStatePacket
      d.pose.th += d.cmd.w * 0.0025;
      d.pose.x += d.cmd.v * Math.cos(d.pose.th) * 0.0025;
      d.pose.y += d.cmd.v * Math.sin(d.pose.th) * 0.0025;
      d.ring = ringPush(d.ring, d.ring.seq);
      d.nextImu += 2.5;
    } else if (nt === d.nextCtl) {
      // Thread 3: 100 Hz, sleep_until(next_tick) on steady_clock
      let jitter = 30 + Math.abs(gauss(d.rand)) * 25; // µs
      let exec = 1.2 + Math.abs(gauss(d.rand)) * 0.4; // µs
      if (contention && d.rand() < 0.18) jitter += 1500 + d.rand() * 11000; // lock held during std::cout
      const late = jitter + exec;
      let n = 0;
      while (d.ring.count) (d.ring = ringPop(d.ring)), n++;
      d.drained = n;
      d.tick++;
      d.cmd = { v: 0.8, w: Math.max(0.2, 1.96 - d.tick * 0.012) };
      d.useCount = 2; // controller holds a copy of active_path_ptr during the tick
      const miss = late >= 10000;
      if (miss) d.misses++;
      d.worst = Math.max(d.worst, late);
      d.hist[BINS.findIndex((b) => late < b)]++;
      d.jitter = [...d.jitter, jitter].slice(-120);
      d.tele = ringPush(d.tele, d.tick);
      if (d.tick % 5 === 0) d.log = [...d.log, `[UDP Telemetry | Tick #${d.tick}] Pose=(${d.pose.x.toFixed(2)}m, ${d.pose.y.toFixed(2)}m, ${d.pose.th.toFixed(2)}rad) | Cmd=(${d.cmd.v.toFixed(2)}m/s, ${d.cmd.w.toFixed(2)}rad/s) | Jitter=${jitter.toFixed(2)} us | Exec=${exec.toFixed(2)} us${miss ? " | DEADLINE MISS" : ""}`].slice(-60);
      // next wake is phase-locked to the grid, even after a late tick
      d.nextCtl += 10 * Math.max(1, Math.ceil(late / 10000));
    } else if (nt === d.nextPlan) {
      d.pathVer++;
      d.useCount = 1;
      d.nextPlan += 50; // Thread 2: A* replans at 20 Hz, atomic shared_ptr swap
    } else {
      let n = 0;
      while (d.tele.count) (d.tele = ringPop(d.tele)), n++;
      d.udpSent = (d.udpSent ?? 0) + n;
      d.nextUdp += 50; // Thread 4: UDP drains telemetry at 20 Hz
    }
  }
  if (!d.estop) d.t = tEnd;
}

function Pipeline({ d }) {
  const box = (x, y, w, title, sub, tone) => (
    <g>
      <rect x={x} y={y} width={w} height={46} rx={8} fill={C.card} stroke={tone} strokeWidth={1.6} />
      <text x={x + w / 2} y={y + 19} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.fg}>
        {title}
      </text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fontSize={9.5} fill={C.muted}>
        {sub}
      </text>
    </g>
  );
  const arrow = (x1, y1, x2, y2, col, label) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={2} markerEnd="url(#dm-arrow)" />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} textAnchor="middle" fontSize={9} fill={C.muted}>
          {label}
        </text>
      )}
    </g>
  );
  const fill = d.ring.count / 16;
  const tfill = d.tele.count / 8;
  return (
    <svg viewBox="0 0 640 230" className="w-full font-mono">
      <defs>
        <marker id="dm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      {box(8, 20, 120, "T1 IMU/Odom", "400 Hz · 2.5 ms", C.ok)}
      {arrow(128, 43, 168, 43, C.ok, "push_overwrite")}
      {/* state ring gauge */}
      <rect x={170} y={20} width={110} height={46} rx={8} fill={C.card} stroke={C.ink} />
      <rect x={174} y={50} width={102 * fill} height={10} rx={3} fill={fill > 0.9 ? C.warn : C.ok} />
      <text x={225} y={38} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.fg}>
        state_ring&lt;16&gt;
      </text>
      {arrow(280, 43, 320, 43, C.active, "pop_latest")}
      {box(322, 20, 150, "T3 RT Control", `100 Hz · ${d.misses} misses`, d.estop ? C.bad : C.active)}
      {arrow(472, 43, 512, 43, C.active)}
      {box(514, 20, 118, "Motors", d.estop ? "DISARMED 0.0 m/s" : `v=${d.cmd.v.toFixed(2)} ω=${d.cmd.w.toFixed(2)}`, d.estop ? C.bad : C.ok)}
      {box(322, 120, 150, "T2 C-Space A*", `20 Hz · path v${d.pathVer}`, C.purple)}
      {arrow(397, 120, 397, 68, C.purple, "")}
      <text x={404} y={98} fontSize={9.5} fill={C.purple}>
        shared_ptr use_count={d.useCount}
      </text>
      {arrow(347, 66, 300, 150, C.active)}
      <rect x={170} y={140} width={110} height={46} rx={8} fill={C.card} stroke={C.ink} />
      <rect x={174} y={170} width={102 * tfill} height={10} rx={3} fill={C.active} />
      <text x={225} y={158} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.fg}>
        telemetry_ring&lt;8&gt;
      </text>
      {arrow(170, 163, 130, 163, C.active)}
      {box(8, 140, 120, "T4 UDP :9870", `20 Hz · ${d.udpSent ?? 0} sent`, C.warn)}
      <text x={320} y={222} textAnchor="middle" fontSize={10} fill={C.muted}>
        sim t = {(d.t / 1000).toFixed(2)} s · tick #{d.tick} · last drain {d.drained} samples
      </text>
    </svg>
  );
}

function DaemonLab() {
  const ref = useRef(null);
  if (!ref.current) ref.current = newDaemon();
  const [running, setRunning] = useState(true);
  const [scale, setScale] = useState(0.1);
  const [contention, setContention] = useState(false);
  const [, setTick] = useState(0);
  const d = ref.current;

  useAnimationFrame((dt) => {
    stepDaemon(ref.current, ref.current.t + dt * 1000 * scale, contention);
    setTick((x) => x + 1);
  }, running && !d.estop);

  const estop = () => {
    d.estop = true;
    d.cmd = { v: 0, w: 0 };
    d.log = [...d.log, "[E-STOP] running = false; threads joined", "[RAII SafetyGuard] Scope exiting -> Sending 0.0 m/s DISARM frame!"];
    setTick((x) => x + 1);
  };
  const reset = () => {
    ref.current = newDaemon();
    setTick((x) => x + 1);
  };
  const maxH = Math.max(1, ...d.hist);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">T1 IMU/Odom 400 Hz</Badge>
        <Badge variant="purple">T2 C-Space A* 20 Hz</Badge>
        <Badge variant={d.misses ? "danger" : "active"}>T3 RT Control 100 Hz | {d.misses} misses</Badge>
        <Badge variant="warning">T4 UDP :9870</Badge>
        <Button size="sm" variant="destructive" className="ml-auto" onClick={estop} disabled={d.estop}>
          <Power /> E-Stop (test ~ScopedSafetyDisarmGuard)
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <Pipeline d={d} />
          </Stage>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Stage className="p-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">state_ring dial</div>
              <div className="mx-auto max-w-[220px]">
                <Dial r={d.ring} size={260} />
              </div>
            </Stage>
            <Stage className="p-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">wake-up lateness histogram (µs)</div>
              <svg viewBox="0 0 280 200" className="w-full font-mono">
                {d.hist.map((h, k) => {
                  const bw = 260 / BINS.length;
                  const bh = (h / maxH) * 140;
                  return (
                    <g key={k}>
                      <rect x={14 + k * bw + 3} y={160 - bh} width={bw - 6} height={bh} rx={2} fill={k === BINS.length - 1 ? C.bad : k >= 4 ? C.warn : C.ok} className="transition-all duration-200" />
                      <text x={14 + k * bw + bw / 2} y={175} textAnchor="middle" fontSize={9} fill={C.muted}>
                        {BIN_LABEL[k]}
                      </text>
                      <text x={14 + k * bw + bw / 2} y={155 - bh} textAnchor="middle" fontSize={9} fill={C.fg}>
                        {h}
                      </text>
                    </g>
                  );
                })}
                <text x={140} y={195} textAnchor="middle" fontSize={9.5} fill={C.muted}>
                  deadline = 10,000 µs
                </text>
              </svg>
            </Stage>
          </div>
        </div>
        <div className="space-y-3">
          <Panel title="Daemon controls">
            <SwitchControl label="Run daemon" checked={running} onChange={setRunning} />
            <SwitchControl label="Inject mutex contention" hint="lock held during std::cout in another thread" checked={contention} onChange={setContention} />
            <SliderControl label="time scale" value={scale} onChange={setScale} min={0.02} max={1} step={0.02} format={(v) => `${v.toFixed(2)}×`} />
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw /> Restart daemon
            </Button>
          </Panel>
          <StatGrid cols={2}>
            <Stat label="ticks" value={d.tick} />
            <Stat label="deadline misses" value={d.misses} tone={d.misses ? "bad" : "ok"} />
            <Stat label="worst lateness" value={`${(d.worst / 1000).toFixed(2)} ms`} tone={d.worst > 1000 ? "warn" : undefined} />
            <Stat label="overwritten" value={d.ring.overwritten} hint="IMU samples overwritten before the controller drained them" />
          </StatGrid>
          <LinePlot series={[{ data: d.jitter.length ? d.jitter.map((j) => j / 1000) : [0], color: contention ? C.warn : C.ok }]} height={130} yDomain={[0, 12]} hLines={[{ y: 10, color: C.bad }]} yLabel="wake jitter (ms)" />
        </div>
      </Split>
      <Narration tone={d.estop ? "bad" : d.misses ? "warn" : "ok"}>
        {d.estop
          ? "E-Stop: threads stopped and main() unwound — the RAII guard's destructor fired and sent the 0.0 m/s disarm frame, no matter how we exited."
          : contention
            ? "Another thread holds the shared mutex while printing. The 100 Hz controller blocks on lock_guard, wakes milliseconds late and starts missing its 10 ms deadline. Lock-free SPSC rings avoid this."
            : `Every 10 ms the controller wakes via sleep_until, drains ~4 fresh IMU samples (400 Hz ÷ 100 Hz) from the 16-slot ring and publishes (v, ω). Jitter stays in the tens of microseconds.`}
      </Narration>
      <div className="overflow-hidden rounded-lg border bg-code">
        <ScrollArea className="h-32">
          <div className="space-y-0.5 px-3 py-2 font-mono text-[11.5px]">
            {[...d.log].reverse().map((l, k) => (
              <div key={d.log.length - k} className={l.includes("MISS") || l.includes("DISARM") ? "text-viz-bad" : l.includes("RAII") ? "text-viz-ok" : ""}>
                {l}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function RingBufferLab({ variant = "ring" }) {
  if (variant === "daemon")
    return (
      <LabShell title="Autonomous Robot Daemon — Mission Control" description="Four threads, two lock-free rings and a shared_ptr path: watch the 100 Hz controller drain the IMU ring, track deadline misses, and fire the RAII disarm guard." badges={["4 threads", "RealTimeRingBuffer<16>", "jitter histogram"]}>
        <DaemonLab />
      </LabShell>
    );
  return (
    <LabShell title="Real-Time Ring Buffer & Loop Cadence" description="A fixed std::array with two moving indices: O(1) push_overwrite and pop with modulo wrap-around, then why the 100 Hz loop must use sleep_until on steady_clock." badges={["push_overwrite", "(i + 1) % N", "sleep_until"]}>
      <Tabs defaultValue="ring">
        <TabsList>
          <TabsTrigger value="ring">Circular buffer</TabsTrigger>
          <TabsTrigger value="cadence">sleep_for vs sleep_until</TabsTrigger>
        </TabsList>
        <TabsContent value="ring">
          <RingTab />
        </TabsContent>
        <TabsContent value="cadence">
          <TimingTab />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
