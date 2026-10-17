import { useEffect, useMemo, useState } from "react";
import { Database, Pause, Play, RotateCcw, Send, Unplug } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  C, LabShell, Legend, LinePlot, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl,
  rng, useAnimationFrame, useStepper,
} from "@/viz/kit";
import { cn } from "@/lib/utils";

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

function usePlayhead(total, deps, rate = 1) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    setT(0);
    setPlaying(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useAnimationFrame((dt) => {
    setT((x) => {
      const nx = x + dt * speed * rate;
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
  return { t, setT, playing, toggle, speed, setSpeed, reset: () => (setPlaying(false), setT(0)) };
}

function PlayheadBar({ ph, total, unit = "s" }) {
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
          t = {f1(ph.t)}
          {unit} / {total}
          {unit}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <Slider value={[ph.t]} min={0} max={total} step={0.05} onValueChange={([v]) => ph.setT(v)} aria-label="Scrub time" />
        <div className="flex w-36 items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Speed</span>
          <Slider value={[ph.speed]} min={0.25} max={4} step={0.25} onValueChange={([v]) => ph.setSpeed(v)} aria-label="Speed" />
          <span className="w-9 font-mono text-[11px] tabular-nums">{ph.speed}×</span>
        </div>
      </div>
    </div>
  );
}

function LogTable({ rows, cols }) {
  return (
    <ScrollArea className="max-h-56" viewportClassName="max-h-56">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c} className="h-8 text-[11.5px]">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols.length} className="py-3 text-center text-[12px] text-muted-foreground">
                no events yet
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, k) => (
            <TableRow key={k}>
              {r.map((cell, j) => (
                <TableCell key={j} className="py-1 font-mono text-[11.5px]">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: docker                                                     */
/* ------------------------------------------------------------------ */

const DK = {
  host: { x: 70, y: 70, label: "curl (host)" },
  api: { x: 270, y: 70, label: "api", ip: "172.18.0.2" },
  redis: { x: 500, y: 70, label: "redis", ip: "172.18.0.4" },
  db: { x: 400, y: 190, label: "db", ip: "172.18.0.3" },
};

/** Pure: evaluate one action against the compose config. */
export function dockerRequest(cfg, action) {
  const hops = [];
  const out = (status, msg, extra = {}) => ({ hops, status, msg, ...extra });
  if (action === "recreate") {
    return out("ok", cfg.volume ? `docker compose down && up -d → containers recreated; pgdata volume re-mounted, ${cfg.rows} rows still there.` : "docker compose down && up -d → db container recreated WITHOUT a volume: its writable layer was deleted, 0 rows.", { rows: cfg.volume ? cfg.rows : 0, recreate: true });
  }
  // host → api through the port mapping
  if (cfg.port === "none") {
    hops.push(["host", "api", false]);
    return out("fail", "curl: (7) Failed to connect to localhost port 8000: Connection refused — no ports: mapping, so the container is unreachable from the host.");
  }
  if (!cfg.api) {
    hops.push(["host", "api", false]);
    return out("fail", "curl: (7) Connection refused — the api container is stopped.");
  }
  if (cfg.port === "8000:8000") {
    hops.push(["host", "api", false]);
    return out("fail", "curl: (56) Recv failure: Connection reset — host 8000 is forwarded to container port 8000, but uvicorn listens on port 80 inside the container.");
  }
  hops.push(["host", "api", true]);
  if (action === "health") return out("ok", 'HTTP 200 {"status": "ok"} — host:8000 → container:80 via the port mapping.');
  // api → redis cache check
  let cacheNote = "";
  if (action === "read") {
    if (cfg.redis) {
      hops.push(["api", "redis", true]);
      cacheNote = "redis:6379 cache miss → ";
    } else {
      hops.push(["api", "redis", false]);
      cacheNote = "redis unreachable (Connection refused) — falling back to the DB → ";
    }
  }
  const dbHost = cfg.dbHost;
  if (dbHost === "localhost") {
    hops.push(["api", "db", false]);
    return out("fail", `HTTP 500 — ${cacheNote}psycopg.OperationalError: connection to "localhost" (127.0.0.1), port 5432 failed: Connection refused. Inside a container, localhost is the container itself.`);
  }
  if (!cfg.db) {
    hops.push(["api", "db", false]);
    return out(
      "fail",
      `HTTP 500 — ${cacheNote}` + (dbHost === "db" ? 'could not translate host name "db" to address: the db container is stopped, so Docker DNS has no record.' : "connection to 172.18.0.3:5432 timed out — container stopped.")
    );
  }
  hops.push(["api", "db", true]);
  if (action === "write") return out("ok", `HTTP 201 — INSERT INTO telemetry … via ${dbHost}:5432 (${dbHost === "db" ? "service name resolved by Docker's embedded DNS 127.0.0.11" : "hard-coded IP works today, breaks when the container gets a new IP"}).`, { rows: cfg.rows + 1 });
  return out("ok", `HTTP 200 — ${cacheNote}SELECT from ${dbHost}:5432 returned ${cfg.rows} rows.`);
}

function DockerDiagram({ cfg, last }) {
  const hopState = {};
  for (const [a, b, ok] of last?.hops ?? []) hopState[a + b] = ok;
  const edge = (a, b, label) => {
    const s = hopState[a + b];
    const col = s === undefined ? C.grid : s ? C.ok : C.bad;
    const A = DK[a], B = DK[b];
    return (
      <g key={a + b}>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={col} strokeWidth={s === undefined ? 1.5 : 3} strokeDasharray={s === false ? "6 4" : undefined} />
        <text x={a === "host" ? 110 : (A.x + B.x) / 2} y={a === "host" ? 110 : (A.y + B.y) / 2 - 7} textAnchor="middle" fontSize={10} fill={C.muted}>
          {label}
        </text>
      </g>
    );
  };
  const box = (id) => {
    const n = DK[id];
    const up = id === "host" ? true : cfg[id];
    const col = id === "host" ? C.ink : up ? C.active : C.bad;
    return (
      <g key={id}>
        <rect x={n.x - 52} y={n.y - 22} width={104} height={44} rx={8} fill={col} fillOpacity={up ? 0.1 : 0.06} stroke={col} strokeWidth={1.5} strokeDasharray={up ? undefined : "4 3"} />
        <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.fg}>
          {n.label}
        </text>
        <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize={10} fill={up ? C.muted : C.bad}>
          {id === "host" ? "localhost" : up ? n.ip : "stopped"}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 620 290" className="w-full font-mono">
      <rect x={160} y={18} width={450} height={262} rx={12} fill={C.purple} fillOpacity={0.04} stroke={C.purple} strokeDasharray="6 4" />
      <text x={172} y={34} fontSize={10.5} fill={C.purple}>
        bridge network: robotics_default (DNS: api, db, redis)
      </text>
      {edge("host", "api", cfg.port === "none" ? "no mapping" : `-p ${cfg.port}`)}
      {edge("api", "redis", "redis:6379")}
      {edge("api", "db", `${cfg.dbHost}:5432`)}
      {["host", "api", "redis", "db"].map(box)}
      {/* volume */}
      <g opacity={cfg.volume ? 1 : 0.3}>
        <ellipse cx={540} cy={200} rx={34} ry={8} fill={C.warn} fillOpacity={0.2} stroke={C.warn} />
        <path d="M506 200 v40 a34 8 0 0 0 68 0 v-40" fill={C.warn} fillOpacity={0.12} stroke={C.warn} />
        <text x={540} y={228} textAnchor="middle" fontSize={10.5} fill={C.fg}>
          pgdata
        </text>
        <text x={540} y={242} textAnchor="middle" fontSize={10} fill={C.muted}>
          {cfg.rows} rows
        </text>
        <line x1={452} y1={196} x2={505} y2={204} stroke={C.warn} strokeDasharray="3 3" />
      </g>
      {!cfg.volume && (
        <text x={400} y={240} textAnchor="middle" fontSize={10} fill={C.bad}>
          data lives in container layer ({cfg.rows} rows)
        </text>
      )}
      <rect x={128} y={58} width={30} height={24} rx={4} fill={C.card} stroke={C.muted} />
      <text x={143} y={74} textAnchor="middle" fontSize={9} fill={C.muted}>
        :8000
      </text>
    </svg>
  );
}

function DockerVariant() {
  const [cfg, setCfg] = useState({ api: true, db: true, redis: true, volume: true, port: "8000:80", dbHost: "db", rows: 3 });
  const [last, setLast] = useState(null);
  const [log, setLog] = useState([]);
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));
  const run = (action, label) => {
    const r = dockerRequest(cfg, action);
    setLast(r);
    if (r.rows !== undefined) setCfg((c) => ({ ...c, rows: r.rows }));
    setLog((l) => [[label, <Badge key="b" variant={r.status === "ok" ? "success" : "danger"}>{r.status === "ok" ? "ok" : "fail"}</Badge>], ...l].slice(0, 8));
  };
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <DockerDiagram cfg={cfg} last={last} />
          </Stage>
          <Legend items={[[C.active, "running container"], [C.ok, "hop succeeded"], [C.bad, "hop failed / stopped"], [C.warn, "named volume"]]} />
          <Narration tone={!last ? "default" : last.status === "ok" ? "ok" : "bad"}>{last ? last.msg : "Send a request from the host, then stop containers, break the port mapping or the DATABASE_URL, and see exactly where the connection fails."}</Narration>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run("health", "curl localhost:8000/health")}>
              <Send /> GET /health
            </Button>
            <Button size="sm" variant="outline" onClick={() => run("read", "GET /readings")}>
              GET /readings
            </Button>
            <Button size="sm" variant="outline" onClick={() => run("write", "POST /readings")}>
              POST /readings
            </Button>
            <Button size="sm" variant="outline" onClick={() => run("recreate", "compose down && up")}>
              <RotateCcw /> compose down && up
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <Panel title="Containers">
            <SwitchControl label="api (uvicorn --port 80)" checked={cfg.api} onChange={set("api")} />
            <SwitchControl label="db (postgres:15)" checked={cfg.db} onChange={set("db")} />
            <SwitchControl label="redis (redis:7-alpine)" checked={cfg.redis} onChange={set("redis")} />
            <SwitchControl label="volume pgdata:/var/lib/postgresql/data" checked={cfg.volume} onChange={set("volume")} />
          </Panel>
          <Panel title="Wiring">
            <Select value={cfg.port} onValueChange={set("port")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8000:80">ports: "8000:80" (host:container)</SelectItem>
                <SelectItem value="8000:8000">ports: "8000:8000" (wrong container port)</SelectItem>
                <SelectItem value="none">no ports: mapping</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cfg.dbHost} onValueChange={set("dbHost")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="db">DATABASE_URL=…@db:5432 (service name)</SelectItem>
                <SelectItem value="localhost">DATABASE_URL=…@localhost:5432</SelectItem>
                <SelectItem value="172.18.0.3">DATABASE_URL=…@172.18.0.3:5432</SelectItem>
              </SelectContent>
            </Select>
          </Panel>
          <LogTable cols={["command", "result"]} rows={log} />
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: queue (producer → Redis queue → workers, retries, DLQ)     */
/* ------------------------------------------------------------------ */

/** Pure FIFO discrete-event simulation. Returns attempt records and per-job outcomes. */
export function simulateQueue({ rate, workers, meanDur, failPct, maxAttempts = 3, horizon = 30, seed = 3 }) {
  const r = rng(seed);
  const jobs = [];
  for (let t = 0, id = 1; t < horizon * 0.6; id++) {
    t += -Math.log(1 - r()) / rate; // Poisson arrivals for the first 60% of the window
    if (t >= horizon * 0.6) break;
    jobs.push({ id, arrive: t, dur: meanDur * (0.5 + r()), fails: Array.from({ length: maxAttempts }, () => r() < failPct / 100) });
  }
  const pending = jobs.map((j) => ({ job: j, attempt: 1, ready: j.arrive }));
  const free = Array(workers).fill(0);
  const attempts = [];
  while (pending.length) {
    pending.sort((a, b) => a.ready - b.ready);
    const it = pending.shift();
    const w = free.indexOf(Math.min(...free));
    const start = Math.max(it.ready, free[w]);
    const end = start + it.job.dur;
    free[w] = end;
    const failed = it.job.fails[it.attempt - 1];
    const rec = { id: it.job.id, attempt: it.attempt, ready: it.ready, start, end, worker: w, failed };
    attempts.push(rec);
    if (failed && it.attempt < maxAttempts) pending.push({ job: it.job, attempt: it.attempt + 1, ready: end + 2 ** (it.attempt - 1) });
    else {
      it.job.done = end;
      it.job.dlq = failed;
    }
  }
  const end = Math.max(horizon, ...attempts.map((a) => a.end));
  return { jobs, attempts, end };
}

function queueStateAt(sim, t) {
  const arrived = sim.jobs.filter((j) => j.arrive <= t);
  const running = sim.attempts.filter((a) => a.start <= t && t < a.end);
  const waiting = sim.attempts.filter((a) => a.ready <= t && t < a.start);
  const delayed = sim.attempts.filter((a) => a.attempt > 1 && a.ready > t && sim.attempts.some((b) => b.id === a.id && b.attempt === a.attempt - 1 && b.end <= t));
  const done = sim.jobs.filter((j) => j.done !== undefined && j.done <= t && !j.dlq);
  const dlq = sim.jobs.filter((j) => j.done !== undefined && j.done <= t && j.dlq);
  const lat = done.map((j) => j.done - j.arrive).sort((a, b) => a - b);
  return {
    arrived, running, waiting, delayed, done, dlq,
    retries: sim.attempts.filter((a) => a.attempt > 1 && a.start <= t).length,
    avgLat: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : 0,
    p95: lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : 0,
  };
}

function QueueVariant() {
  const [rate, setRate] = useState(2);
  const [workers, setWorkers] = useState(3);
  const [meanDur, setMeanDur] = useState(1.5);
  const [failPct, setFailPct] = useState(15);
  const [seed, setSeed] = useState(3);
  const sim = useMemo(() => simulateQueue({ rate, workers, meanDur, failPct, seed }), [rate, workers, meanDur, failPct, seed]);
  const total = Math.ceil(sim.end);
  const ph = usePlayhead(total, [sim]);
  const s = queueStateAt(sim, ph.t);
  const series = useMemo(() => {
    const pts = [];
    for (let x = 0; x <= total; x += 0.25) pts.push([x, queueStateAt(sim, x).waiting.length]);
    return pts;
  }, [sim, total]);
  const capacity = workers / meanDur;
  const W = 620;
  const wy = (k) => 30 + k * (170 / Math.max(workers, 1));
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox={`0 0 ${W} 230`} className="w-full font-mono">
              <rect x={10} y={90} width={80} height={44} rx={8} fill={C.active} fillOpacity={0.1} stroke={C.active} />
              <text x={50} y={110} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.fg}>
                API
              </text>
              <text x={50} y={124} textAnchor="middle" fontSize={10} fill={C.muted}>
                queue.add()
              </text>
              <line x1={90} y1={112} x2={140} y2={112} stroke={C.muted} />
              {/* queue */}
              <rect x={140} y={60} width={190} height={104} rx={8} fill={C.purple} fillOpacity={0.06} stroke={C.purple} />
              <text x={235} y={54} textAnchor="middle" fontSize={10.5} fill={C.purple}>
                Redis queue (FIFO) · {s.waiting.length} waiting
              </text>
              {s.waiting.slice(0, 24).map((a, k) => (
                <g key={`${a.id}-${a.attempt}`}>
                  <rect x={312 - (k % 8) * 22} y={70 + Math.floor(k / 8) * 30} width={18} height={24} rx={3} fill={a.attempt > 1 ? C.warn : C.active} fillOpacity={0.75} />
                  <text x={321 - (k % 8) * 22} y={86 + Math.floor(k / 8) * 30} textAnchor="middle" fontSize={9} fill={C.card}>
                    {a.id}
                  </text>
                </g>
              ))}
              {s.waiting.length > 24 && (
                <text x={235} y={160} textAnchor="middle" fontSize={10} fill={C.muted}>
                  +{s.waiting.length - 24} more
                </text>
              )}
              {s.delayed.length > 0 && (
                <text x={235} y={182} textAnchor="middle" fontSize={10} fill={C.warn}>
                  {s.delayed.length} in backoff delay
                </text>
              )}
              {/* workers */}
              {Array.from({ length: workers }, (_, k) => {
                const job = s.running.find((a) => a.worker === k);
                const prog = job ? (ph.t - job.start) / (job.end - job.start) : 0;
                const y = wy(k);
                const h = Math.min(26, 170 / workers - 4);
                return (
                  <g key={k}>
                    <line x1={330} y1={112} x2={380} y2={y + h / 2} stroke={C.grid} />
                    <rect x={380} y={y} width={150} height={h} rx={5} fill="none" stroke={job ? C.active : C.grid} />
                    {job && <rect x={380} y={y} width={150 * prog} height={h} rx={5} fill={job.failed ? C.bad : C.active} fillOpacity={0.3} />}
                    <text x={388} y={y + h / 2 + 4} fontSize={10} fill={C.fg}>
                      w{k + 1}: {job ? `job ${job.id}${job.attempt > 1 ? ` (try ${job.attempt})` : ""}` : "idle"}
                    </text>
                  </g>
                );
              })}
              <rect x={548} y={40} width={64} height={60} rx={8} fill={C.ok} fillOpacity={0.1} stroke={C.ok} />
              <text x={580} y={62} textAnchor="middle" fontSize={10} fill={C.fg}>
                done
              </text>
              <text x={580} y={84} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ok}>
                {s.done.length}
              </text>
              <rect x={548} y={130} width={64} height={60} rx={8} fill={C.bad} fillOpacity={0.1} stroke={C.bad} />
              <text x={580} y={152} textAnchor="middle" fontSize={10} fill={C.fg}>
                DLQ
              </text>
              <text x={580} y={174} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.bad}>
                {s.dlq.length}
              </text>
            </svg>
          </Stage>
          <Legend items={[[C.active, "new job"], [C.warn, "retry attempt"], [C.bad, "attempt that will fail"], [C.ok, "completed"]]} />
          <PlayheadBar ph={ph} total={total} />
          <Narration tone={rate > capacity ? "bad" : "ok"}>
            Arrival rate {rate}/s vs capacity ≈ workers ÷ mean duration = {workers} ÷ {meanDur}s = {capacity.toFixed(2)} jobs/s.{" "}
            {rate > capacity ? "Producers outpace workers → the queue grows without bound while jobs keep arriving. Add workers (just more containers)." : "Workers keep up, so the queue drains quickly; latency ≈ processing time."}
            {failPct > 0 && ` Failed attempts are retried with exponential backoff (1s, 2s); after 3 attempts a job lands in the dead-letter queue.`}
          </Narration>
        </div>
        <div className="space-y-3">
          <StatGrid cols={2}>
            <Stat label="enqueued" value={s.arrived.length} />
            <Stat label="throughput" value={`${(s.done.length / Math.max(ph.t, 0.001)).toFixed(2)}/s`} tone="ok" />
            <Stat label="avg latency" value={`${f1(s.avgLat)}s`} tone="active" hint="enqueue → final completion, including waits and retries" />
            <Stat label="p95 latency" value={`${f1(s.p95)}s`} />
            <Stat label="retries" value={s.retries} tone="warn" />
            <Stat label="dead-lettered" value={s.dlq.length} tone="bad" />
          </StatGrid>
          <Panel title="Parameters">
            <SliderControl label="arrival rate (jobs/s)" value={rate} min={0.5} max={6} step={0.5} onChange={setRate} />
            <SliderControl label="workers" value={workers} min={1} max={8} onChange={setWorkers} />
            <SliderControl label="mean job duration" value={meanDur} min={0.5} max={4} step={0.25} format={(v) => `${v}s`} onChange={setMeanDur} />
            <SliderControl label="failure probability per attempt" value={failPct} min={0} max={60} step={5} format={(v) => `${v}%`} onChange={setFailPct} />
            <Button variant="outline" size="sm" onClick={() => setSeed((x) => x + 1)}>
              New random workload
            </Button>
          </Panel>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Queue depth over time</div>
            <LinePlot series={[{ data: series.filter(([x]) => x <= ph.t + 1e-9), color: C.purple }]} xDomain={[0, total]} yDomain={[0, Math.max(4, ...series.map((p) => p[1]))]} height={130} xLabel="seconds" />
          </div>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: cache (cache-aside with TTL, invalidation, stampede)       */
/* ------------------------------------------------------------------ */

const REDIS_MS = 1;
const DB_MS = 50;

/** Pure: cache-aside simulation under load. */
export function simulateCache({ ttl, writePct, invalidate, lock, rate = 200, seconds = 20, keys = 20, seed = 11 }) {
  const r = rng(seed);
  const weights = Array.from({ length: keys }, (_, k) => 1 / (k + 1)); // Zipf-ish: robot:1 is hot
  const wsum = weights.reduce((a, b) => a + b, 0);
  const pickKey = () => {
    let x = r() * wsum;
    for (let k = 0; k < keys; k++) if ((x -= weights[k]) <= 0) return k;
    return keys - 1;
  };
  const cache = new Map(); // key -> {avail, expires, version}
  const inflight = new Map(); // key -> end time (ms)
  const dbVer = new Array(keys).fill(0);
  const buckets = Array.from({ length: seconds }, () => ({ req: 0, hits: 0, lat: 0, db: 0, stale: 0 }));
  let stampede = 0;
  const n = rate * seconds;
  for (let i = 0; i < n; i++) {
    const t = (i / rate) * 1000; // ms
    const b = buckets[Math.floor(t / 1000)];
    const key = pickKey();
    if (r() < writePct / 100) {
      dbVer[key]++;
      if (invalidate) cache.delete(key);
      continue;
    }
    b.req++;
    const c = cache.get(key);
    if (c && c.avail <= t && c.expires > t) {
      b.hits++;
      b.lat += REDIS_MS;
      if (c.version < dbVer[key]) b.stale++;
      continue;
    }
    const fl = inflight.get(key);
    if (fl !== undefined && fl > t) {
      if (lock) {
        b.lat += fl - t + REDIS_MS; // wait for the lock holder to fill the cache
        continue;
      }
      stampede++;
    }
    b.db++;
    b.lat += REDIS_MS + DB_MS;
    inflight.set(key, t + DB_MS);
    cache.set(key, { avail: t + DB_MS, expires: t + DB_MS + ttl * 1000, version: dbVer[key] });
  }
  const totals = buckets.reduce((a, x) => ({ req: a.req + x.req, hits: a.hits + x.hits, lat: a.lat + x.lat, db: a.db + x.db, stale: a.stale + x.stale }), { req: 0, hits: 0, lat: 0, db: 0, stale: 0 });
  return { buckets, totals, stampede };
}

/** Pure: one manual request against a tiny cache. Returns new cache + trace. */
export function cacheAside(state, op, key, ttl) {
  const now = state.now;
  const c = state.cache[key];
  if (op === "write") {
    const db = { ...state.db, [key]: state.db[key] + 1 };
    const cache = { ...state.cache };
    if (state.invalidate) delete cache[key];
    return { ...state, db, cache, trace: { path: ["app", "db", ...(state.invalidate ? ["redis"] : [])], note: state.invalidate ? `UPDATE robots SET … → v${db[key]}; then DEL robot:${key} so the next read refetches.` : `UPDATE → DB now v${db[key]}, but redis still holds v${c?.v ?? "-"} → stale reads until TTL expires.`, tone: state.invalidate ? "ok" : "warn" } };
  }
  if (c && c.exp > now) {
    const stale = c.v < state.db[key];
    return { ...state, trace: { path: ["app", "redis"], hit: true, ms: REDIS_MS, note: `GET robot:${key} → HIT (${REDIS_MS} ms), TTL ${c.exp - now}s left${stale ? ` — but it is STALE (cache v${c.v}, DB v${state.db[key]})` : ""}.`, tone: stale ? "warn" : "ok" } };
  }
  const cache = { ...state.cache, [key]: { v: state.db[key], exp: now + ttl } };
  return { ...state, cache, trace: { path: ["app", "redis", "db", "redis"], hit: false, ms: REDIS_MS + DB_MS, note: `GET robot:${key} → ${c ? "expired" : "MISS"} → SELECT from Postgres (${DB_MS} ms) → SET robot:${key} EX ${ttl}.`, tone: "active" } };
}

function CacheVariant() {
  const [tab, setTab] = useState("manual");
  const [ttl, setTtl] = useState(30);
  const [invalidate, setInvalidate] = useState(true);
  const [writePct, setWritePct] = useState(5);
  const [lock, setLock] = useState(false);
  const [st, setSt] = useState({ now: 0, cache: {}, db: { 1: 1, 2: 1, 3: 1 }, trace: null, invalidate: true, hist: [] });
  const act = (op, key) =>
    setSt((s) => {
      const n = cacheAside({ ...s, invalidate }, op, key, ttl);
      return { ...n, hist: n.trace.ms ? [...s.hist, n.trace.ms].slice(-30) : s.hist };
    });
  const sim = useMemo(() => simulateCache({ ttl: ttl / 10, writePct, invalidate, lock }), [ttl, writePct, invalidate, lock]);
  const path = st.trace?.path ?? [];
  const node = (id, x, label, sub) => {
    const on = path.includes(id);
    const col = id === "db" ? C.purple : id === "redis" ? C.bad : C.active;
    return (
      <g key={id}>
        <rect x={x - 60} y={40} width={120} height={56} rx={9} fill={col} fillOpacity={on ? 0.18 : 0.05} stroke={col} strokeWidth={on ? 2 : 1} />
        <text x={x} y={64} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.fg}>
          {label}
        </text>
        <text x={x} y={82} textAnchor="middle" fontSize={10} fill={C.muted}>
          {sub}
        </text>
      </g>
    );
  };
  const hitRate = sim.totals.req ? sim.totals.hits / sim.totals.req : 0;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="manual">Single requests</TabsTrigger>
            <TabsTrigger value="load">Under load (200 req/s)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Split>
        <div className="space-y-3">
          {tab === "manual" ? (
            <>
              <Stage className="p-2">
                <svg viewBox="0 0 620 130" className="w-full font-mono">
                  <line x1={150} y1={68} x2={250} y2={68} stroke={path.includes("redis") ? C.active : C.grid} strokeWidth={2} />
                  <line x1={370} y1={68} x2={470} y2={68} stroke={path.includes("db") ? C.purple : C.grid} strokeWidth={2} strokeDasharray={path.includes("db") ? undefined : "4 4"} />
                  {node("app", 90, "FastAPI", "cache-aside")}
                  {node("redis", 310, "Redis", "~1 ms")}
                  {node("db", 530, "Postgres", "~50 ms")}
                  {st.trace && (
                    <text x={310} y={122} textAnchor="middle" fontSize={12} fontWeight={700} fill={st.trace.hit ? C.ok : st.trace.ms ? C.warn : C.purple}>
                      {st.trace.ms ? `${st.trace.hit ? "HIT" : "MISS"} · ${st.trace.ms} ms` : "write"}
                    </text>
                  )}
                </svg>
              </Stage>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((k) => (
                  <Button key={k} size="sm" variant="outline" onClick={() => act("read", k)}>
                    GET robot:{k}
                  </Button>
                ))}
                <Button size="sm" variant="outline" onClick={() => act("write", 1)}>
                  <Database /> UPDATE robot:1
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSt((s) => ({ ...s, now: s.now + 10 }))}>
                  clock +10s
                </Button>
              </div>
              <Narration tone={st.trace?.tone ?? "default"}>{st.trace ? st.trace.note : "Read a key twice: the first is a slow miss that populates Redis, the second is a fast hit. Then advance the clock past the TTL or update the row."}</Narration>
              <LinePlot series={[{ data: st.hist, color: C.active }]} yDomain={[0, 60]} height={110} yLabel="latency ms" />
            </>
          ) : (
            <>
              <LinePlot
                series={[
                  { data: sim.buckets.map((b) => (b.req ? (b.hits / b.req) * 100 : 0)), color: C.ok, label: "hit %" },
                  { data: sim.buckets.map((b) => (b.req ? b.lat / b.req : 0)), color: C.active, label: "avg ms" },
                  { data: sim.buckets.map((b) => b.db / 4), color: C.purple, label: "db q/s ÷4", dash: "4 3" },
                ]}
                yDomain={[0, 100]}
                height={200}
                xLabel="seconds"
              />
              <Legend items={[[C.ok, "hit rate %"], [C.active, "avg latency (ms)"], [C.purple, "DB queries/s ÷ 4"]]} />
              <Narration tone={sim.stampede > 20 ? "bad" : "ok"}>
                Cold start: every first request per key misses, then the hit rate climbs. Each time the hot key robot:1 expires, the requests arriving during the 50 ms refetch also miss.{" "}
                {lock ? "With a SET NX lock only one request refetches; the others wait briefly for the cache to refill." : `Without a lock that produced ${sim.stampede} duplicate DB queries (cache stampede).`}
              </Narration>
            </>
          )}
        </div>
        <div className="space-y-3">
          <Panel title="Cache policy">
            <SliderControl label={tab === "load" ? "TTL (load sim scales ÷10)" : "TTL (EX seconds)"} value={ttl} min={5} max={120} step={5} format={(v) => (tab === "load" ? `${v / 10}s` : `${v}s`)} onChange={setTtl} />
            <SwitchControl label="Invalidate on write (DEL key)" hint="Event-based invalidation vs TTL-only" checked={invalidate} onChange={setInvalidate} />
            {tab === "load" && (
              <>
                <SliderControl label="writes" value={writePct} min={0} max={30} format={(v) => `${v}%`} onChange={setWritePct} />
                <SwitchControl label="Stampede lock (SET lock NX EX 10)" checked={lock} onChange={setLock} />
              </>
            )}
          </Panel>
          {tab === "manual" ? (
            <LogTable
              cols={["key", "redis", "TTL left", "DB ver"]}
              rows={[1, 2, 3].map((k) => {
                const c = st.cache[k];
                const live = c && c.exp > st.now;
                return [`robot:${k}`, live ? <Badge key="b" variant={c.v < st.db[k] ? "warning" : "success"}>v{c.v}</Badge> : <Badge key="b" variant="outline">—</Badge>, live ? `${c.exp - st.now}s` : "expired", `v${st.db[k]}`];
              })}
            />
          ) : (
            <StatGrid cols={2}>
              <Stat label="hit rate" value={`${(hitRate * 100).toFixed(1)}%`} tone="ok" />
              <Stat label="avg latency" value={`${(sim.totals.lat / Math.max(sim.totals.req, 1)).toFixed(1)} ms`} tone="active" />
              <Stat label="DB queries" value={sim.totals.db} tone="purple" />
              <Stat label="stale reads" value={sim.totals.stale} tone={sim.totals.stale ? "warn" : undefined} hint="Hits served after the DB row changed (no invalidation)" />
              <Stat label="stampede dupes" value={sim.stampede} tone={sim.stampede ? "bad" : undefined} />
              <Stat label="requests" value={sim.totals.req} />
            </StatGrid>
          )}
          <div className="text-[12px] text-muted-foreground">
            clock: <span className="font-mono">{st.now}s</span>
          </div>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: websocket (polling vs full-duplex)                         */
/* ------------------------------------------------------------------ */

const HTTP_REQ = 520; // bytes of request line + headers (cookies, UA...)
const HTTP_RES = 260;
const PAYLOAD = 90; // telemetry JSON
const WS_HDR = 6; // 2-byte header + 4-byte mask (client→server) — server frames 2-4 bytes
const T_WS = 12;

/** Pure: frame timelines for polling and websocket over T_WS seconds. */
export function wsFrames({ hz, poll, heartbeat, drop }) {
  const ticks = [];
  for (let t = 0.3; t < T_WS; t += 1 / hz) ticks.push(Math.round(t * 1000) / 1000);
  // polling: client asks every `poll` s; server answers with all readings since last poll
  const pollFrames = [];
  let last = 0;
  let pollBytes = 0;
  let pollLat = 0;
  for (let t = poll; t <= T_WS + 1e-9; t += poll) {
    const got = ticks.filter((x) => x > last && x <= t);
    pollFrames.push({ t, dir: "up", kind: "req", bytes: HTTP_REQ });
    pollFrames.push({ t: t + 0.06, dir: "down", kind: got.length ? "data" : "empty", n: got.length, bytes: HTTP_RES + got.length * PAYLOAD });
    pollBytes += HTTP_REQ + HTTP_RES + got.length * PAYLOAD;
    pollLat += got.reduce((a, x) => a + (t + 0.06 - x), 0);
    last = t;
  }
  const pollDelivered = ticks.filter((x) => x <= last).length;
  // websocket: handshake, pushes, heartbeats, optional disconnect + reconnect
  const ws = [{ t: 0.05, dir: "up", kind: "upgrade", bytes: 480 }, { t: 0.12, dir: "down", kind: "101", bytes: 200 }];
  let wsBytes = 680;
  let up = true;
  let reconnectAt = null;
  let lost = 0;
  const events = [...ticks.map((t) => ({ t, k: "data" }))];
  for (let t = heartbeat; t < T_WS; t += heartbeat) events.push({ t, k: "ping" });
  if (drop) events.push({ t: drop, k: "drop" });
  events.sort((a, b) => a.t - b.t);
  let detectedAt = null;
  for (const e of events) {
    if (reconnectAt !== null && e.t >= reconnectAt && !up) {
      ws.push({ t: reconnectAt, dir: "up", kind: "upgrade", bytes: 480 }, { t: reconnectAt + 0.07, dir: "down", kind: "101", bytes: 200 });
      wsBytes += 680;
      up = true;
    }
    if (e.k === "drop") {
      up = false;
      ws.push({ t: e.t, dir: "none", kind: "drop" });
      continue;
    }
    if (e.k === "ping") {
      if (up) {
        ws.push({ t: e.t, dir: "down", kind: "ping", bytes: 2 + 16 }, { t: e.t + 0.05, dir: "up", kind: "pong", bytes: WS_HDR + 16 });
        wsBytes += 2 + 16 + WS_HDR + 16;
      } else if (detectedAt === null) {
        detectedAt = e.t;
        ws.push({ t: e.t, dir: "down", kind: "ping-lost" });
        reconnectAt = e.t + 1; // client onclose → setTimeout(connect, …)
      }
      continue;
    }
    if (up) {
      ws.push({ t: e.t, dir: "down", kind: "data", bytes: 2 + PAYLOAD });
      wsBytes += 2 + PAYLOAD;
    } else lost++;
  }
  if (reconnectAt !== null && !up && reconnectAt < T_WS) {
    ws.push({ t: reconnectAt, dir: "up", kind: "upgrade", bytes: 480 }, { t: reconnectAt + 0.07, dir: "down", kind: "101", bytes: 200 });
    wsBytes += 680;
  }
  const wsDelivered = ws.filter((f) => f.kind === "data").length;
  return {
    ticks, pollFrames, ws, lost, detectedAt, reconnectAt,
    poll: { bytes: pollBytes, delivered: pollDelivered, avgLat: pollDelivered ? pollLat / pollDelivered : 0, useful: ticks.length * PAYLOAD },
    wsStats: { bytes: wsBytes, delivered: wsDelivered, avgLat: 0.03, useful: wsDelivered * PAYLOAD },
  };
}

const FRAME_COL = { req: C.muted, empty: C.muted, data: C.ok, upgrade: C.purple, 101: C.purple, ping: C.warn, pong: C.warn, drop: C.bad, "ping-lost": C.bad };

function FrameLanes({ frames, t, title }) {
  const W = 620, cy = 34, sy = 112;
  const x = (s) => 60 + (s / T_WS) * (W - 76);
  return (
    <svg viewBox={`0 0 ${W} 140`} className="w-full font-mono">
      <text x={8} y={14} fontSize={10.5} fontWeight={700} fill={C.fg}>
        {title}
      </text>
      <line x1={60} x2={W - 16} y1={cy} y2={cy} stroke={C.grid} strokeWidth={2} />
      <line x1={60} x2={W - 16} y1={sy} y2={sy} stroke={C.grid} strokeWidth={2} />
      <text x={52} y={cy + 4} fontSize={10} textAnchor="end" fill={C.muted}>
        client
      </text>
      <text x={52} y={sy + 4} fontSize={10} textAnchor="end" fill={C.muted}>
        server
      </text>
      {frames
        .filter((f) => f.t <= t)
        .map((f, k) => {
          const col = FRAME_COL[f.kind];
          if (f.dir === "none" || f.kind === "ping-lost")
            return (
              <g key={k}>
                <line x1={x(f.t)} x2={x(f.t)} y1={cy - 8} y2={sy + 8} stroke={col} strokeWidth={2} strokeDasharray="3 3" />
                <text x={x(f.t) + 4} y={(cy + sy) / 2 + (f.kind === "drop" ? -12 : 14)} fontSize={10} fill={col}>
                  {f.kind === "drop" ? "connection lost" : "no pong → reconnect"}
                </text>
              </g>
            );
          const [y1, y2] = f.dir === "up" ? [cy, sy] : [sy, cy];
          return <line key={k} x1={x(f.t)} y1={y1} x2={x(f.t) + 6} y2={y2} stroke={col} strokeWidth={f.kind === "data" ? 1.8 : 1.4} opacity={f.kind === "empty" ? 0.6 : 0.95} />;
        })}
      <line x1={x(t)} x2={x(t)} y1={20} y2={128} stroke={C.fg} opacity={0.5} />
      {[0, 3, 6, 9, 12].map((s) => (
        <text key={s} x={x(s)} y={136} fontSize={9.5} textAnchor="middle" fill={C.muted}>
          {s}s
        </text>
      ))}
    </svg>
  );
}

function WebSocketVariant() {
  const [hz, setHz] = useState(2);
  const [poll, setPoll] = useState(2);
  const [heartbeat, setHeartbeat] = useState(3);
  const [drop, setDrop] = useState(false);
  const fr = useMemo(() => wsFrames({ hz, poll, heartbeat, drop: drop ? 5.2 : null }), [hz, poll, heartbeat, drop]);
  const ph = usePlayhead(T_WS, [fr]);
  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-1 p-2">
            <FrameLanes frames={fr.pollFrames} t={ph.t} title={`HTTP polling every ${poll}s`} />
            <FrameLanes frames={fr.ws} t={ph.t} title="WebSocket (one connection, server push)" />
          </Stage>
          <Legend items={[[C.ok, "telemetry delivered"], [C.muted, "poll request / empty response"], [C.purple, "Upgrade / 101 handshake"], [C.warn, "ping / pong"], [C.bad, "disconnect"]]} />
          <PlayheadBar ph={ph} total={T_WS} />
          <Narration tone={drop ? "warn" : "ok"}>
            Robot publishes {hz} readings/s. Polling pays ~{HTTP_REQ + HTTP_RES} bytes of headers per round trip and delivers data on average {f1(fr.poll.avgLat * 1000 / 1000)}s late; a WebSocket frame adds only 2–6 bytes and arrives immediately.
            {drop && fr.detectedAt !== null && ` The link dropped at 5.2s; ${fr.lost} readings were lost until the missed heartbeat at ${f1(fr.detectedAt)}s triggered a reconnect (new handshake at ${f1(fr.reconnectAt)}s).`}
          </Narration>
        </div>
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>metric</TableHead>
                <TableHead className="text-right">polling</TableHead>
                <TableHead className="text-right">WebSocket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["bytes on wire", kb(fr.poll.bytes), kb(fr.wsStats.bytes)],
                ["useful payload", kb(fr.poll.useful), kb(fr.wsStats.useful)],
                ["overhead", `${(100 - (fr.poll.useful / fr.poll.bytes) * 100).toFixed(0)}%`, `${(100 - (fr.wsStats.useful / fr.wsStats.bytes) * 100).toFixed(0)}%`],
                ["avg data latency", `${f1(fr.poll.avgLat)}s`, "~30 ms"],
                ["readings delivered", `${fr.poll.delivered}/${fr.ticks.length}`, `${fr.wsStats.delivered}/${fr.ticks.length}`],
              ].map(([m, a, b]) => (
                <TableRow key={m}>
                  <TableCell className="py-1 text-[12.5px]">{m}</TableCell>
                  <TableCell className="py-1 text-right font-mono text-[12px] text-viz-bad">{a}</TableCell>
                  <TableCell className="py-1 text-right font-mono text-[12px] text-viz-ok">{b}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Panel title="Parameters">
            <SliderControl label="telemetry rate" value={hz} min={0.5} max={10} step={0.5} format={(v) => `${v} Hz`} onChange={setHz} />
            <SliderControl label="poll interval" value={poll} min={0.5} max={4} step={0.5} format={(v) => `${v}s`} onChange={setPoll} />
            <SliderControl label="heartbeat (ping) interval" value={heartbeat} min={1} max={6} step={0.5} format={(v) => `${v}s`} onChange={setHeartbeat} />
            <Button size="sm" variant={drop ? "destructive" : "outline"} onClick={() => setDrop((d) => !d)}>
              <Unplug /> {drop ? "Disconnect at 5.2s: ON" : "Inject disconnect"}
            </Button>
          </Panel>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: cicd                                                       */
/* ------------------------------------------------------------------ */

const STAGES = [
  { id: "checkout", label: "checkout", cmd: "actions/checkout@v4", sec: 3 },
  { id: "install", label: "install", cmd: "npm ci  (setup-node cache: 'npm')", sec: 60, cached: 10 },
  { id: "lint", label: "lint", cmd: "npm run lint", sec: 12 },
  { id: "typecheck", label: "type-check", cmd: "npm run typecheck", sec: 18 },
  { id: "test", label: "test", cmd: "npm test", sec: 45 },
  { id: "build", label: "build image", cmd: "docker build -t api:${{ github.sha }} .", sec: 90, cached: 20 },
  { id: "deploy", label: "deploy", cmd: "needs: [test, build] · if: github.ref == 'refs/heads/main'", sec: 30 },
];

/** Pure: pipeline run → per-stage outcome steps. */
export function pipelineSteps({ fail, cache, branch }) {
  const steps = [];
  const status = Object.fromEntries(STAGES.map((s) => [s.id, "pending"]));
  let t = 0;
  const times = {};
  steps.push({ status: { ...status }, t, times: { ...times }, note: `git push → GitHub Actions starts the workflow on ${branch === "main" ? "main" : "a pull request"}.`, tone: "default" });
  let failed = false;
  for (const s of STAGES) {
    if (failed) {
      status[s.id] = "skipped";
      continue;
    }
    if (s.id === "deploy" && branch !== "main") {
      status[s.id] = "skipped";
      steps.push({ status: { ...status }, t, times: { ...times }, cur: s.id, note: "deploy is skipped: its `if:` only allows refs/heads/main. On a PR, CI just gates the merge (branch protection).", tone: "warn" });
      continue;
    }
    const d = cache && s.cached ? s.cached : s.sec;
    status[s.id] = "running";
    steps.push({ status: { ...status }, t, times: { ...times }, cur: s.id, note: `${s.label}: ${s.cmd}${cache && s.cached ? ` — cache hit, ${s.sec}s → ${s.cached}s` : ""}`, tone: "active" });
    t += d;
    times[s.id] = d;
    if (fail === s.id) {
      status[s.id] = "failed";
      failed = true;
      steps.push({ status: { ...status }, t, times: { ...times }, cur: s.id, note: `${s.label} exited with code 1 → job fails; every later step is skipped and nothing reaches production.`, tone: "bad" });
    } else {
      status[s.id] = "passed";
      steps.push({ status: { ...status }, t, times: { ...times }, cur: s.id, note: `${s.label} passed in ${d}s.`, tone: "ok" });
    }
  }
  const last = steps.at(-1);
  steps.push({ ...last, status: { ...status }, cur: null, done: true, note: failed ? `Pipeline FAILED after ${t}s. Fix the ${fail} step and push again.` : branch === "main" ? `All green in ${t}s — deployed to production.` : `All checks passed in ${t}s — PR is mergeable.`, tone: failed ? "bad" : "ok" });
  return steps;
}

const ST_TONE = { pending: C.muted, running: C.active, passed: C.ok, failed: C.bad, skipped: C.muted };

function CicdVariant() {
  const [fail, setFail] = useState("none");
  const [cache, setCache] = useState(true);
  const [branch, setBranch] = useState("main");
  const steps = useMemo(() => pipelineSteps({ fail, cache, branch }), [fail, cache, branch]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const W = 620;
  const bw = (W - 20) / STAGES.length;
  const totalSec = STAGES.reduce((a, s) => a + (cache && s.cached ? s.cached : s.sec), 0);
  const uncached = STAGES.reduce((a, s) => a + s.sec, 0);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fail} onValueChange={setFail}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No failures</SelectItem>
            {STAGES.filter((s) => s.id !== "checkout").map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Fail at {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={branch} onValueChange={setBranch}>
          <TabsList>
            <TabsTrigger value="main">push to main</TabsTrigger>
            <TabsTrigger value="pr">pull request</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Stage className="p-2">
        <svg viewBox={`0 0 ${W} 120`} className="w-full font-mono">
          {STAGES.map((s, k) => {
            const stt = step.status[s.id];
            const col = ST_TONE[stt];
            const x = 10 + k * bw;
            return (
              <g key={s.id}>
                {k > 0 && <line x1={x - 6} x2={x + 2} y1={50} y2={50} stroke={C.muted} />}
                <rect x={x + 2} y={26} width={bw - 10} height={48} rx={8} fill={col} fillOpacity={stt === "pending" || stt === "skipped" ? 0.04 : 0.16} stroke={col} strokeWidth={step.cur === s.id ? 2.2 : 1} strokeDasharray={stt === "skipped" ? "4 3" : undefined} />
                <text x={x + bw / 2 - 3} y={46} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.fg}>
                  {s.label}
                </text>
                <text x={x + bw / 2 - 3} y={62} textAnchor="middle" fontSize={10} fill={col}>
                  {stt === "passed" || stt === "failed" ? `${step.times[s.id]}s` : stt}
                </text>
                {stt === "failed" && (
                  <text x={x + bw / 2 - 3} y={92} textAnchor="middle" fontSize={11} fill={C.bad} fontWeight={700}>
                    ✕ exit 1
                  </text>
                )}
                {cache && s.cached && (
                  <text x={x + bw / 2 - 3} y={18} textAnchor="middle" fontSize={9.5} fill={C.ok}>
                    cache hit
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Stage>
      <Legend items={[[C.active, "running"], [C.ok, "passed"], [C.bad, "failed"], [C.muted, "pending / skipped"]]} />
      <Split>
        <div className="space-y-3">
          <Narration tone={step.tone}>{step.note}</Narration>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <Panel title="Runner">
            <SwitchControl label="Dependency + layer cache" hint="setup-node cache: 'npm' and Docker layer cache" checked={cache} onChange={setCache} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="elapsed" value={`${step.t}s`} tone="active" />
            <Stat label="full run" value={`${totalSec}s`} hint={`without cache: ${uncached}s`} tone={cache ? "ok" : undefined} />
          </StatGrid>
        </div>
      </Split>
      <pre className={cn("code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11.5px]")}>{`# .github/workflows/ci.yml
on: { push: { branches: [main] }, pull_request: { branches: [main] } }
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: docker build -t api:\${{ github.sha }} .
  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - run: ./deploy.sh api:\${{ github.sha }}`}</pre>
    </>
  );
}

const META = {
  docker: {
    title: "Docker Compose Networking — api, db, redis",
    description: "Containers on a private bridge network reach each other by service name; the host reaches the api only through a port mapping. Break things and see where requests fail.",
    badges: ["docker compose", "bridge network", "volumes"],
  },
  queue: {
    title: "Background Job Queue — producers, workers, retries, DLQ",
    description: "The API enqueues jobs instantly; workers pull them FIFO. Scale workers, raise the failure rate, and watch retries with exponential backoff and the dead-letter queue.",
    badges: ["Redis queue", "workers", "backoff"],
  },
  cache: {
    title: "Redis Cache-Aside — hits, misses, TTL & stampedes",
    description: "Check Redis first, fall back to Postgres on a miss, then populate with a TTL. Compare latency, invalidation strategies and stampede protection.",
    badges: ["cache-aside", "TTL", "SET NX lock"],
  },
  websocket: {
    title: "HTTP Polling vs WebSocket Frames",
    description: "Stream robot telemetry both ways and compare bytes, latency and empty responses. Heartbeats detect a dead connection and trigger a reconnect.",
    badges: ["WebSocket", "full-duplex", "ping/pong"],
  },
  cicd: {
    title: "CI/CD Pipeline — GitHub Actions",
    description: "Every push runs lint → type-check → test → build; deploy only runs on main when everything passes. Inject a failure and toggle caching.",
    badges: ["GitHub Actions", "fail fast", "cache"],
  },
};

export default function InfraLab({ variant = "docker" }) {
  const m = META[variant] ?? META.docker;
  const body = { docker: DockerVariant, queue: QueueVariant, cache: CacheVariant, websocket: WebSocketVariant, cicd: CicdVariant }[variant] ?? DockerVariant;
  const Body = body;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      <Body />
    </LabShell>
  );
}
