import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, LinePlot, Narration, Panel, SliderControl, Split, Stage, SwitchControl, VarTable, rng, useAnimationFrame } from "@/viz/kit";

/* ------------------------------------------------------------------ */
/* Graph geometry (rqt_graph style: nodes = ovals, topics = boxes)      */
/* ------------------------------------------------------------------ */
const NODES = {
  lidar: { name: "/lidar_node", x: 70, y: 70 },
  nav: { name: "/nav2_planner", x: 330, y: 70 },
  motor: { name: "/motor_driver", x: 575, y: 70 },
  ekf: { name: "/ekf_node", x: 90, y: 190 },
};
const TOPICS = {
  scan: { name: "/scan", type: "LaserScan", x: 200, y: 70, pub: "lidar", sub: "nav", hz: 20 },
  cmd: { name: "/cmd_vel", type: "Twist", x: 455, y: 70, pub: "nav", sub: "motor" },
  tf: { name: "/tf", type: "TFMessage", x: 235, y: 190, pub: "ekf", sub: "nav", hz: 50 },
};
const route = (tk) => {
  const t = TOPICS[tk];
  const a = NODES[t.pub], b = NODES[t.sub];
  return [[a.x, a.y], [t.x, t.y], [b.x, b.y]];
};
function along(pts, u) {
  const L1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const L2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  let d = u * (L1 + L2);
  const [p, q, dd] = d <= L1 ? [pts[0], pts[1], d / L1] : [pts[1], pts[2], (d - L1) / L2];
  return [p[0] + (q[0] - p[0]) * dd, p[1] + (q[1] - p[1]) * dd];
}

const compatible = (q) => !(q.pub === "best_effort" && q.sub === "reliable");

function initSim() {
  return {
    t: 0,
    nextScan: 0,
    nextTf: 0,
    flying: [],
    queues: { nav: [], motor: [] },
    busyUntil: 0,
    lastCmd: -1000,
    id: 0,
    rand: rng(9),
    stats: Object.fromEntries(["scan", "cmd", "tf"].map((k) => [k, { pub: 0, del: 0, lost: 0, overflow: 0, retx: 0, age: 0, recent: [] }])),
    watchdog: false,
  };
}

/** Advance the DDS-ish simulation to tEnd (ms). Pure w.r.t. its arguments apart from mutating `s`. */
function stepSim(s, tEnd, cfg) {
  const { qos, loss, latency, proc } = cfg;
  const send = (topic, t, payload) => {
    s.stats[topic].pub++;
    const q = qos[topic];
    const ok = topic === "tf" || compatible(q);
    const lost = s.rand() < loss;
    const lat = latency * (0.8 + 0.4 * s.rand()) + (topic === "tf" ? 2 : 0);
    s.flying.push({ id: s.id++, topic, tSend: t, t0: t, tArr: t + lat, lost, ok, retx: 0, payload });
  };
  let guard = 0;
  while (guard++ < 500) {
    const events = [s.nextScan, s.nextTf, ...s.flying.map((f) => f.tArr)];
    if (s.queues.nav.length && s.busyUntil <= s.t) events.push(s.t);
    if (s.busyUntil > s.t) events.push(s.busyUntil);
    const nt = Math.min(...events);
    if (nt > tEnd) break;
    s.t = Math.max(s.t, nt);
    if (s.nextScan <= s.t) {
      send("scan", s.nextScan, s.nextScan);
      s.nextScan += 1000 / 20;
      continue;
    }
    if (s.nextTf <= s.t) {
      send("tf", s.nextTf, s.nextTf);
      s.nextTf += 1000 / 50;
      continue;
    }
    const arriving = s.flying.filter((f) => f.tArr <= s.t);
    if (arriving.length) {
      s.flying = s.flying.filter((f) => f.tArr > s.t);
      for (const f of arriving) {
        const st = s.stats[f.topic];
        const q = qos[f.topic];
        if (!f.ok) continue; // incompatible QoS: DDS never matched the endpoints
        if (f.lost) {
          if (q && q.pub === "reliable" && q.sub === "reliable") {
            // NACK → retransmit after one more round trip
            st.retx++;
            s.flying.push({ ...f, t0: s.t, tArr: s.t + 2 * latency + 4, lost: s.rand() < loss, retx: f.retx + 1 });
          } else st.lost++;
          continue;
        }
        if (f.topic === "tf") {
          st.del++;
          st.recent.push(s.t);
          continue;
        }
        const qname = TOPICS[f.topic].sub;
        const queue = s.queues[qname];
        queue.push(f);
        if (queue.length > q.depth) {
          queue.shift(); // KeepLast(N): oldest sample overwritten
          st.overflow++;
        }
        st.del++;
        st.recent.push(s.t);
      }
      continue;
    }
    // subscriber callbacks
    if (s.busyUntil <= s.t && s.pendingCmd != null) {
      send("cmd", s.t, s.pendingCmd);
      s.pendingCmd = null;
      continue;
    }
    if (s.busyUntil <= s.t && s.queues.nav.length) {
      const m = s.queues.nav.shift();
      s.stats.scan.age = s.t - m.payload;
      s.busyUntil = s.t + proc;
      s.pendingCmd = m.payload;
      continue;
    }
    break;
  }
  if (s.busyUntil <= tEnd && s.pendingCmd != null) {
    send("cmd", s.busyUntil, s.pendingCmd);
    s.pendingCmd = null;
  }
  // motor driver consumes immediately
  while (s.queues.motor.length) {
    const m = s.queues.motor.shift();
    s.lastCmd = m.tArr;
    s.stats.cmd.age = m.tArr - m.payload;
  }
  s.watchdog = s.t - s.lastCmd > 250 && s.t > 400;
  s.t = Math.max(s.t, tEnd);
  for (const k of Object.keys(s.stats)) s.stats[k].recent = s.stats[k].recent.filter((x) => x > s.t - 2000);
}

function GraphSvg({ s, qos }) {
  const ellipse = (k, tone) => {
    const n = NODES[k];
    return (
      <g key={k}>
        <ellipse cx={n.x} cy={n.y} rx={62} ry={22} fill={C.card} stroke={tone ?? C.ink} strokeWidth={1.6} />
        <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.fg}>
          {n.name}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 640 240" className="w-full font-mono">
      <defs>
        <marker id="ros-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      {Object.entries(TOPICS).map(([k, t]) => {
        const pts = route(k);
        const bad = k !== "tf" && !compatible(qos[k]);
        const col = bad ? C.bad : k === "tf" ? C.purple : C.active;
        return (
          <g key={k}>
            <path d={`M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`} stroke={col} strokeWidth={2} opacity={0.6} />
            <path d={`M${pts[1][0]},${pts[1][1]} L${pts[2][0]},${pts[2][1]}`} stroke={col} strokeWidth={2} opacity={0.6} strokeDasharray={bad ? "5 4" : undefined} />
            <rect x={t.x - 34} y={t.y - 14} width={68} height={28} rx={4} fill={C.card} stroke={col} strokeWidth={1.6} />
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={col}>
              {t.name}
            </text>
            {bad && (
              <text x={t.x + 70} y={t.y + 34} textAnchor="middle" fontSize={10} fill={C.bad}>
                ✕ QoS incompatible
              </text>
            )}
          </g>
        );
      })}
      {ellipse("lidar", C.ok)}
      {ellipse("nav", s.busyUntil > s.t ? C.warn : C.active)}
      {ellipse("motor", s.watchdog ? C.bad : C.ok)}
      {ellipse("ekf", C.purple)}
      {/* subscriber queues */}
      {[
        ["nav", "scan"],
        ["motor", "cmd"],
      ].map(([n, tk]) => {
        const N = NODES[n];
        const depth = qos[tk].depth;
        const fill = s.queues[n].length;
        const w = 96 / depth;
        return (
          <g key={n}>
            {Array.from({ length: depth }, (_, k) => (
              <rect key={k} x={N.x - 48 + k * w} y={N.y + 30} width={w - 1.5} height={9} rx={1.5} fill={k < fill ? (fill >= depth ? C.warn : C.active) : C.fill} />
            ))}
            <text x={N.x} y={N.y + 52} textAnchor="middle" fontSize={9.5} fill={C.muted}>
              KeepLast({depth}) queue
            </text>
          </g>
        );
      })}
      {/* in-flight messages */}
      {s.flying.map((f) => {
        const u = Math.min(1, Math.max(0, (s.t - f.t0) / (f.tArr - f.t0)));
        const pts = route(f.topic);
        const uu = f.ok ? (f.lost ? Math.min(u, 0.5 + u * 0.3) : u) : Math.min(u, 0.48);
        const [x, y] = along(pts, uu);
        const col = !f.ok ? C.bad : f.lost ? C.bad : f.retx ? C.warn : f.topic === "tf" ? C.purple : f.topic === "scan" ? C.active : C.ok;
        return <circle key={f.id} cx={x} cy={y} r={f.topic === "tf" ? 3 : 5} fill={col} opacity={f.lost && u > 0.5 ? 1 - u : 0.95} />;
      })}
      {s.watchdog && (
        <text x={575} y={30} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.bad}>
          WATCHDOG: no /cmd_vel → stop
        </text>
      )}
    </svg>
  );
}

function QosRow({ topic, q, setQ }) {
  const sel = (key) => (
    <Select value={q[key]} onValueChange={(v) => setQ({ ...q, [key]: v })}>
      <SelectTrigger className="h-7 w-[118px] text-[12px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="reliable">Reliable</SelectItem>
        <SelectItem value="best_effort">BestEffort</SelectItem>
      </SelectContent>
    </Select>
  );
  const ok = compatible(q);
  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12.5px] font-semibold">{TOPICS[topic].name}</span>
        <Tip content={ok ? "Requested ≤ offered: endpoints matched" : "A BestEffort publisher can never satisfy a Reliable subscriber — DDS refuses to match them and the callback silently never fires."}>
          <span>
            <Badge variant={ok ? "success" : "danger"}>{ok ? "compatible" : "INCOMPATIBLE: 0 Hz"}</Badge>
          </span>
        </Tip>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
        pub {sel("pub")} sub {sel("sub")}
      </div>
      <SliderControl label="history depth KeepLast(N)" value={q.depth} onChange={(v) => setQ({ ...q, depth: v })} min={1} max={10} />
    </div>
  );
}

function GraphTab() {
  const sim = useRef(null);
  if (!sim.current) sim.current = initSim();
  const [qos, setQos] = useState({ scan: { pub: "best_effort", sub: "best_effort", depth: 5 }, cmd: { pub: "reliable", sub: "reliable", depth: 1 } });
  const [loss, setLoss] = useState(0.05);
  const [latency, setLatency] = useState(15);
  const [proc, setProc] = useState(20);
  const [running, setRunning] = useState(true);
  const [scale, setScale] = useState(0.25);
  const [, setTick] = useState(0);
  const s = sim.current;

  useAnimationFrame((dt) => {
    stepSim(sim.current, sim.current.t + dt * 1000 * scale, { qos, loss, latency, proc });
    setTick((x) => x + 1);
  }, running);

  const hz = (k) => (s.stats[k].recent.length / 2).toFixed(1);
  const scanOk = compatible(qos.scan);
  const note = !scanOk
    ? "/scan: the LiDAR offers BestEffort but the planner REQUESTS Reliable. DDS never matches them, so /nav2_planner receives nothing, stops publishing /cmd_vel, and the motor watchdog halts the robot."
    : !compatible(qos.cmd)
      ? "/cmd_vel endpoints are incompatible: the planner computes commands that never reach the motors."
      : proc > 50 && qos.scan.depth > 1
        ? `The planner callback takes ${proc} ms but scans arrive every 50 ms, so the KeepLast(${qos.scan.depth}) queue fills with stale scans — the robot steers on data ${s.stats.scan.age.toFixed(0)} ms old. Use depth 1 in control loops.`
        : qos.scan.pub === "reliable" && qos.scan.sub === "reliable" && loss > 0.1
          ? "Reliable /scan retransmits every lost LaserScan — on a lossy link those retries arrive late (amber). For high-rate sensors, BestEffort and simply waiting for the next fresh scan is better."
          : "Sensor data uses BestEffort (SensorDataQoS): a lost scan is just skipped. /cmd_vel uses Reliable so every velocity command is acknowledged.";

  return (
    <div className="space-y-3">
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <GraphSvg s={s} qos={qos} />
          </Stage>
          <Legend
            items={[
              [C.active, "/scan LaserScan"],
              [C.ok, "/cmd_vel Twist"],
              [C.purple, "/tf"],
              [C.warn, "retransmitted (Reliable)"],
              [C.bad, "lost / unmatched"],
            ]}
          />
          <Narration tone={!scanOk || s.watchdog ? "bad" : proc > 50 ? "warn" : "ok"}>{note}</Narration>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>topic</TableHead>
                <TableHead className="text-right">pub</TableHead>
                <TableHead className="text-right">delivered</TableHead>
                <TableHead className="text-right">net lost</TableHead>
                <TableHead className="text-right">queue drop</TableHead>
                <TableHead className="text-right">retx</TableHead>
                <TableHead className="text-right">rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["scan", "cmd", "tf"].map((k) => {
                const st = s.stats[k];
                return (
                  <TableRow key={k}>
                    <TableCell className="py-1 font-mono text-[12px]">{TOPICS[k].name}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{st.pub}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px] text-viz-ok">{st.del}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px] text-viz-bad">{st.lost}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px] text-viz-warn">{st.overflow}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{st.retx}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{hz(k)} Hz</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3">
          <Panel title="Per-topic QoS">
            <QosRow topic="scan" q={qos.scan} setQ={(q) => setQos((x) => ({ ...x, scan: q }))} />
            <QosRow topic="cmd" q={qos.cmd} setQ={(q) => setQos((x) => ({ ...x, cmd: q }))} />
          </Panel>
          <Panel title="Network & compute">
            <SliderControl label="packet loss" value={loss} onChange={setLoss} min={0} max={0.5} step={0.01} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderControl label="one-way latency" value={latency} onChange={setLatency} min={1} max={120} format={(v) => `${v} ms`} />
            <SliderControl label="planner callback time" value={proc} onChange={setProc} min={5} max={150} step={5} format={(v) => `${v} ms`} />
            <SliderControl label="time scale" value={scale} onChange={setScale} min={0.05} max={1} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
            <div className="flex items-center gap-3">
              <SwitchControl label="Run" checked={running} onChange={setRunning} />
              <Button size="sm" variant="ghost" onClick={() => (sim.current = initSim())}>
                <RotateCcw /> Reset
              </Button>
            </div>
          </Panel>
          <VarTable
            vars={[
              ["scan age at callback", `${s.stats.scan.age.toFixed(0)} ms`, s.stats.scan.age > 120 ? "bad" : "ok"],
              ["cmd_vel end-to-end age", `${s.stats.cmd.age.toFixed(0)} ms`, s.stats.cmd.age > 200 ? "bad" : "ok"],
              ["motor watchdog", s.watchdog ? "STOPPED" : "ok", s.watchdog ? "bad" : "ok"],
            ]}
          />
        </div>
      </Split>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TF2 tree with time travel                                           */
/* ------------------------------------------------------------------ */
const NOW = 20; // s — latest stamp in the buffer
const BASE_LASER = { x: 0.25, z: 0.4 }; // static mount from URDF

function tfAt(t, jumpAt) {
  // odom→base_link: smooth EKF odometry (robot drives forward with slow drift)
  const odomBase = { x: 0.4 * t, y: 0 };
  // map→odom: SLAM correction, piecewise constant, jumps +0.3 m on loop closure
  const mapOdom = { x: jumpAt != null && t >= jumpAt ? 0.3 : 0, y: 0 };
  return { odomBase, mapOdom };
}

function TfTab() {
  const [lookup, setLookup] = useState(NOW);
  const [jumpAt, setJumpAt] = useState(null);
  const valid = lookup >= NOW - 10 && lookup <= NOW;
  const { odomBase, mapOdom } = tfAt(Math.min(lookup, NOW), jumpAt);
  const mapBase = { x: mapOdom.x + odomBase.x, y: mapOdom.y + odomBase.y };
  const mapLaser = { x: mapBase.x + BASE_LASER.x, y: mapBase.y, z: BASE_LASER.z };
  const ts = Array.from({ length: 101 }, (_, k) => (k / 100) * NOW);
  const err = lookup > NOW ? `ExtrapolationException: Lookup would require extrapolation into the future. Requested time ${lookup.toFixed(2)} but the latest data is at time ${NOW.toFixed(2)}` : lookup < NOW - 10 ? `ExtrapolationException: Lookup would require extrapolation into the past (buffer only caches 10 s)` : null;

  const frames = [
    ["map", "global (SLAM)", C.purple],
    ["odom", "smooth, drifts", C.active],
    ["base_link", "chassis", C.ok],
    ["laser", "lidar_link (static)", C.warn],
  ];
  return (
    <Split>
      <div className="space-y-3">
        <Stage className="p-2">
          <svg viewBox="0 0 600 120" className="w-full font-mono">
            {frames.map(([n, sub, col], k) => {
              const x = 70 + k * 150;
              const label = k === 0 ? `map→odom x=${mapOdom.x.toFixed(2)}` : k === 1 ? `odom→base x=${odomBase.x.toFixed(2)}` : k === 2 ? "static x=0.25 z=0.40" : "";
              return (
                <g key={n}>
                  {k < 3 && (
                    <g>
                      <line x1={x + 50} x2={x + 100} y1={50} y2={50} stroke={C.muted} strokeWidth={1.6} />
                      <text x={x + 75} y={80} textAnchor="middle" fontSize={9.5} fill={k === 0 && jumpAt != null && lookup >= jumpAt ? C.bad : C.muted}>
                        {label}
                      </text>
                    </g>
                  )}
                  <rect x={x - 50} y={32} width={100} height={36} rx={8} fill={C.card} stroke={col} strokeWidth={1.8} />
                  <text x={x} y={48} textAnchor="middle" fontSize={12} fontWeight={700} fill={col}>
                    {n}
                  </text>
                  <text x={x} y={62} textAnchor="middle" fontSize={9} fill={C.muted}>
                    {sub}
                  </text>
                </g>
              );
            })}
            <text x={300} y={108} textAnchor="middle" fontSize={10} fill={C.muted}>
              lookup_transform("map", "laser", t) chains map→odom · odom→base_link · base_link→laser
            </text>
          </svg>
        </Stage>
        <Stage className="p-2">
          <LinePlot
            series={[
              { data: ts.map((t) => [t, tfAt(t, jumpAt).odomBase.x]), color: C.active },
              { data: ts.map((t) => [t, tfAt(t, jumpAt).mapOdom.x * 10]), color: C.purple, dash: "5 4" },
              { data: [[lookup, 0], [lookup, 9]].filter(() => valid), color: C.warn, width: 1.5 },
            ]}
            height={170}
            xLabel="buffer time t (s)"
            yLabel="odom→base x (m) · map→odom x ×10"
          />
        </Stage>
        <Legend
          items={[
            [C.active, "odom→base_link: continuous (safe for control)"],
            [C.purple, "map→odom: jumps on loop closure"],
            [C.warn, "lookup time"],
          ]}
        />
      </div>
      <div className="space-y-3">
        <Panel title="Time travel">
          <SliderControl label="lookup time t" value={lookup} onChange={setLookup} min={8} max={20.6} step={0.1} format={(v) => `${v.toFixed(1)} s`} />
          <Button size="sm" variant="outline" onClick={() => setJumpAt(jumpAt == null ? 14 : null)}>
            {jumpAt == null ? "Trigger SLAM loop-closure at t=14 s (+0.3 m)" : "Remove loop closure"}
          </Button>
        </Panel>
        {err ? (
          <Narration tone="bad">
            <span className="font-mono text-[12.5px]">{err}</span>
          </Narration>
        ) : (
          <VarTable
            title="T(map ← laser) at t"
            vars={[
              ["map→odom x", mapOdom.x.toFixed(2), "purple"],
              ["odom→base_link x", odomBase.x.toFixed(2), "active"],
              ["map→laser x", mapLaser.x.toFixed(2), "ok"],
              ["map→laser z", mapLaser.z.toFixed(2)],
            ]}
          />
        )}
        <Narration tone={jumpAt != null ? "warn" : "default"}>
          {jumpAt != null
            ? "At t = 14 s SLAM recognised a corner and corrected map→odom by +0.3 m. The jump lives entirely in map→odom; odom→base_link stays perfectly smooth, so the velocity controller sees no derivative kick."
            : "TF2 buffers ~10 s of stamped transforms, so you can ask where the laser was at any recent time. Ask for a time newer than the latest stamp and TF2 refuses to extrapolate."}
        </Narration>
      </div>
    </Split>
  );
}

export default function RosGraphLab() {
  return (
    <LabShell title="ROS2 Computation Graph, QoS & TF2" description="Watch messages flow /lidar_node → /scan → /nav2_planner → /cmd_vel → /motor_driver. Break QoS compatibility, add loss and latency, overflow KeepLast queues, then time-travel through the TF2 tree." badges={["rqt_graph", "Reliable vs BestEffort", "TF2 buffer"]}>
      <Tabs defaultValue="graph">
        <TabsList>
          <TabsTrigger value="graph">Graph & QoS</TabsTrigger>
          <TabsTrigger value="tf">TF2 tree</TabsTrigger>
        </TabsList>
        <TabsContent value="graph">
          <GraphTab />
        </TabsContent>
        <TabsContent value="tf">
          <TfTab />
        </TabsContent>
      </Tabs>
    </LabShell>
  );
}
