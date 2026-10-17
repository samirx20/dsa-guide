import { useRef, useState } from "react";
import { Play, RotateCcw, Terminal } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { C, LabShell, Legend, Narration, Panel, Split, Stage, Stat, StatGrid, SwitchControl, useAnimationFrame } from "@/viz/kit";

/* Redirect modes from the chapter: where do fd 1 and fd 2 end up? */
const MODES = {
  none: { label: "terminal", cmd: "", out: "term", err: "term", note: "No redirection: both stdout (1) and stderr (2) inherit the terminal, so every line lands on your screen interleaved." },
  over: { label: "> out.log", cmd: " > out.log", out: "out.log", err: "term", truncate: true, note: "`>` points fd 1 at out.log and TRUNCATES it when the command starts. stderr (2) still goes to the terminal, so errors stay visible." },
  append: { label: ">> out.log", cmd: " >> out.log", out: "out.log", err: "term", note: "`>>` points fd 1 at out.log in APPEND mode: re-running the command keeps the old lines. Use this for ~/.bashrc and history logs." },
  both: { label: "2>&1", cmd: " > out.log 2>&1", out: "out.log", err: "out.log", truncate: true, note: "`> out.log 2>&1`: first fd 1 → out.log, then fd 2 is duplicated to wherever fd 1 currently points. Both streams land in one file; the terminal stays silent." },
  err: { label: "2> err.log", cmd: " 2> err.log", out: "term", err: "err.log", truncate: true, note: "`2> err.log` only rewires descriptor 2. Normal data still prints to the terminal while errors are captured separately for later triage." },
  grep: { label: "| grep ERROR", cmd: " | grep ERROR", out: "grep", err: "term", note: "The pipe `|` feeds stdout (1) into grep's stdin (0) through an in-RAM pipe. stderr is NOT piped, so errors bypass grep and hit the terminal directly." },
};

const OUT_LINES = ["INFO scan 360 pts @ 12.0 Hz", "INFO imu yaw=0.12 rad", "INFO odom x=1.42 m y=0.07 m", "INFO motor_left 2.50 m/s", "INFO scan 358 pts @ 11.9 Hz"];
const ERR_LINES = ["ERROR lidar timeout on /dev/ttyUSB0", "WARN battery 18%", "ERROR checksum mismatch frame 4410", "WARN imu temperature 61°C"];

// SVG anchor points (viewBox 640 x 300)
const P = {
  fd0: [190, 60], fd1: [190, 130], fd2: [190, 210],
  term: [470, 70], grep: [355, 150], grepOut: [400, 150], file: [470, 235], err: [470, 235],
};

function routeFor(stream, mode, pipeErr) {
  const m = MODES[mode];
  let dest = stream === "out" ? m.out : m.err;
  if (mode === "grep" && stream === "err" && pipeErr) dest = "grep";
  const start = stream === "out" ? P.fd1 : P.fd2;
  const y0 = start[1];
  if (dest === "term") return { dest, pts: [start, [300, y0], [300, P.term[1] + (stream === "out" ? -12 : 12)], [P.term[0], P.term[1] + (stream === "out" ? -12 : 12)]] };
  if (dest === "grep") return { dest, pts: [start, [270, y0], [270, P.grep[1]], P.grep, P.grepOut, [430, P.grepOut[1]], [430, P.term[1] + 20], [P.term[0], P.term[1] + 20]], grepAt: 3 };
  return { dest, pts: [start, [300, y0], [300, P.file[1] + (stream === "out" ? -10 : 10)], [P.file[0], P.file[1] + (stream === "out" ? -10 : 10)]] };
}

function polyLen(pts) {
  const seg = [];
  let L = 0;
  for (let k = 1; k < pts.length; k++) {
    const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    seg.push(d);
    L += d;
  }
  return { seg, L };
}
function pointAt(pts, t) {
  const { seg, L } = polyLen(pts);
  let d = t * L;
  for (let k = 0; k < seg.length; k++) {
    if (d <= seg[k] || k === seg.length - 1) {
      const u = seg[k] ? Math.min(d / seg[k], 1) : 0;
      return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
    }
    d -= seg[k];
  }
  return pts[pts.length - 1];
}
/** Fraction of route length at which vertex `idx` sits. */
function fracAt(pts, idx) {
  const { seg, L } = polyLen(pts);
  return seg.slice(0, idx).reduce((a, b) => a + b, 0) / L;
}

const pathD = (pts) => "M" + pts.map((p) => p.join(",")).join(" L");

function Box({ x, y, w, h, title, sub, tone = C.ink, active }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={C.card} stroke={active ? tone : C.border} strokeWidth={active ? 2 : 1.2} />
      <text x={x + w / 2} y={y + h / 2 - (sub ? 3 : -4)} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={C.fg}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={10} fill={C.muted}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Plumbing({ mode, pipeErr, packets, flash }) {
  const m = MODES[mode];
  const outR = routeFor("out", mode, pipeErr);
  const errR = routeFor("err", mode, pipeErr);
  const fileName = m.out !== "term" && m.out !== "grep" ? m.out : m.err !== "term" ? m.err : "out.log";
  const fileActive = outR.dest.endsWith(".log") || errR.dest.endsWith(".log");
  return (
    <svg viewBox="0 0 640 300" className="w-full font-mono">
      {/* keyboard → stdin */}
      <Box x={10} y={36} w={84} h={48} title="keyboard" sub="tty" />
      <path d={pathD([[94, 60], P.fd0])} stroke={C.muted} strokeDasharray="4 4" strokeWidth={1.5} fill="none" opacity={0.6} />
      {/* process */}
      <rect x={110} y={30} width={80} height={210} rx={10} fill={C.fill} stroke={C.ink} strokeWidth={1.4} />
      <text x={150} y={262} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.fg}>
        sensor_daemon
      </text>
      {[
        [P.fd0, "0 stdin", C.muted],
        [P.fd1, "1 stdout", C.ok],
        [P.fd2, "2 stderr", C.bad],
      ].map(([p, lab, col]) => (
        <g key={lab}>
          <circle cx={p[0]} cy={p[1]} r={6} fill={col} />
          <text x={p[0] - 12} y={p[1] + 4} textAnchor="end" fontSize={10.5} fill={col} fontWeight={600}>
            {lab}
          </text>
        </g>
      ))}
      {/* wiring */}
      <path d={pathD(outR.pts)} stroke={C.ok} strokeWidth={3} fill="none" opacity={0.45} strokeLinejoin="round" />
      <path d={pathD(errR.pts)} stroke={C.bad} strokeWidth={3} fill="none" opacity={0.45} strokeLinejoin="round" strokeDasharray={errR.dest === outR.dest && errR.dest !== "term" ? "7 4" : undefined} />
      {/* sinks */}
      <Box x={470} y={30} w={160} h={84} title="Terminal" sub="/dev/pts/0" tone={C.active} active={outR.dest === "term" || errR.dest === "term" || outR.dest === "grep"} />
      {mode === "grep" && <Box x={320} y={128} w={80} h={44} title="grep" sub="ERROR" tone={C.warn} active />}
      <Box x={470} y={200} w={160} h={70} title={fileName} sub={fileActive ? (m.truncate ? "O_TRUNC" : "O_APPEND") : "unused"} tone={C.purple} active={fileActive} />
      {flash && (
        <text x={360} y={192} textAnchor="middle" fontSize={10.5} fill={C.bad}>
          ✕ dropped by grep
        </text>
      )}
      {/* packets */}
      {packets.map((p) => {
        const [x, y] = pointAt(p.route.pts, p.t);
        const col = p.stream === "out" ? C.ok : C.bad;
        return (
          <g key={p.id} opacity={p.dying ? Math.max(0, 1 - p.dieT * 2) : 1}>
            <rect x={x - 26} y={y - 9} width={52} height={18} rx={9} fill={col} opacity={0.92} />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9.5} fill={C.card} fontWeight={700}>
              {p.stream === "out" ? "1:" : "2:"}
              {p.text.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Pane({ title, lines, empty, badge }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-code">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Terminal className="size-3" /> {title}
        </span>
        {badge}
      </div>
      <ScrollArea className="h-32">
        <div className="space-y-0.5 px-3 py-2 font-mono text-[12px]">
          {lines.length === 0 && <div className="text-muted-foreground/70">{empty}</div>}
          {lines.map((l) => (
            <div key={l.id} className={l.stream === "err" ? "text-viz-bad" : l.stream === "sys" ? "text-muted-foreground" : "text-foreground"}>
              {l.text}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function PipeLab() {
  const [mode, setMode] = useState("none");
  const [pipeErr, setPipeErr] = useState(false);
  const [auto, setAuto] = useState(false);
  const [term, setTerm] = useState([]);
  const [files, setFiles] = useState({ "out.log": [], "err.log": [] });
  const [stats, setStats] = useState({ emitted: 0, toTerm: 0, toFile: 0, dropped: 0 });
  const [flash, setFlash] = useState(false);
  const [runs, setRuns] = useState(1);
  const packets = useRef([]);
  const [, setTick] = useState(0);
  const seq = useRef(0);
  const autoT = useRef(0);

  const cmd = `$ ./sensor_daemon${mode === "grep" && pipeErr ? " 2>&1 | grep ERROR" : MODES[mode].cmd}`;

  const relaunch = (m = mode, extra) => {
    packets.current = [];
    setRuns((r) => r + 1);
    const cfg = MODES[m];
    setFiles((f) => {
      const n = { ...f };
      const targets = new Set([cfg.out, cfg.err].filter((d) => d.endsWith(".log")));
      for (const t of targets) if (cfg.truncate) n[t] = [];
      return n;
    });
    setTerm((t) => [...t, { id: `sys${seq.current++}`, stream: "sys", text: extra ?? `$ ./sensor_daemon${m === "grep" && pipeErr ? " 2>&1 | grep ERROR" : cfg.cmd}` }].slice(-60));
  };

  const emit = (stream) => {
    const pool = stream === "out" ? OUT_LINES : ERR_LINES;
    const text = pool[seq.current % pool.length];
    const route = routeFor(stream, mode, pipeErr);
    packets.current.push({ id: seq.current++, stream, text, route, t: 0, match: text.includes("ERROR") });
    setStats((s) => ({ ...s, emitted: s.emitted + 1 }));
    setTick((x) => x + 1);
  };

  const deliver = (p) => {
    const line = { id: `l${p.id}`, stream: p.stream, text: p.text };
    if (p.route.dest === "term" || p.route.dest === "grep") {
      setTerm((t) => [...t, line].slice(-60));
      setStats((s) => ({ ...s, toTerm: s.toTerm + 1 }));
    } else {
      setFiles((f) => ({ ...f, [p.route.dest]: [...f[p.route.dest], line].slice(-60) }));
      setStats((s) => ({ ...s, toFile: s.toFile + 1 }));
    }
  };

  const running = packets.current.length > 0 || auto;
  useAnimationFrame((dt) => {
    if (auto) {
      autoT.current += dt;
      if (autoT.current > 0.75) {
        autoT.current = 0;
        emit(Math.random() < 0.6 ? "out" : "err");
      }
    }
    const keep = [];
    for (const p of packets.current) {
      if (p.dying) {
        p.dieT += dt;
        if (p.dieT < 0.5) keep.push(p);
        continue;
      }
      p.t += dt / 1.4;
      const gAt = p.route.grepAt != null ? fracAt(p.route.pts, p.route.grepAt) : null;
      if (gAt != null && !p.match && p.t >= gAt) {
        p.t = gAt;
        p.dying = true;
        p.dieT = 0;
        setStats((s) => ({ ...s, dropped: s.dropped + 1 }));
        setFlash(true);
        setTimeout(() => setFlash(false), 700);
        keep.push(p);
        continue;
      }
      if (p.t >= 1) deliver(p);
      else keep.push(p);
    }
    packets.current = keep;
    setTick((x) => x + 1);
  }, running);

  const reset = () => {
    packets.current = [];
    setTerm([]);
    setFiles({ "out.log": [], "err.log": [] });
    setStats({ emitted: 0, toTerm: 0, toFile: 0, dropped: 0 });
    setRuns(1);
  };

  const m = MODES[mode];
  const outDest = mode === "grep" ? "grep → terminal" : m.out;
  const errDest = mode === "grep" && pipeErr ? "grep → terminal" : m.err;

  return (
    <LabShell
      title="POSIX Stream & Pipe Plumber"
      description="Every process is born with fd 0, 1 and 2. Rewire them with >, >>, 2>&1 and | and watch where each log line actually lands."
      badges={["stdin / stdout / stderr", "redirection", "pipes"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (!v) return;
            setMode(v);
            relaunch(v);
          }}
        >
          {Object.entries(MODES).map(([k, v]) => (
            <ToggleGroupItem key={k} value={k} className="font-mono">
              {v.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="rounded-lg border bg-code px-3 py-2 font-mono text-[13px]">
        <span className="text-viz-ok">robot@jetson</span>
        <span className="text-muted-foreground">:~/ros2_ws</span> <span className="font-semibold">{cmd.slice(2)}</span>
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <Plumbing mode={mode} pipeErr={pipeErr} packets={packets.current} flash={flash} />
          </Stage>
          <Legend
            items={[
              [C.ok, "fd 1 stdout (normal data)"],
              [C.bad, "fd 2 stderr (warnings / errors)"],
              [C.warn, "grep filter"],
              [C.purple, "log file"],
            ]}
          />
          <Narration tone={mode === "grep" ? "warn" : mode === "none" ? "default" : "active"}>
            {m.note}
            {mode === "grep" && pipeErr && " With 2>&1 placed BEFORE the pipe, stderr is merged into stdout first, so grep now sees the ERROR lines too."}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Emit from sensor_daemon">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => emit("out")} className="border-viz-ok/50 text-viz-ok">
                printf → fd 1
              </Button>
              <Button size="sm" variant="outline" onClick={() => emit("err")} className="border-viz-bad/50 text-viz-bad">
                fprintf(stderr) → fd 2
              </Button>
            </div>
            <SwitchControl label="Auto-stream log lines" checked={auto} onChange={setAuto} />
            {mode === "grep" && <SwitchControl label="Merge stderr first (2>&1 | grep)" hint="Rewire fd 2 → fd 1 before the pipe" checked={pipeErr} onChange={(v) => { setPipeErr(v); packets.current = []; }} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => relaunch()}>
                <Play /> Re-run command
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw /> Reset
              </Button>
            </div>
          </Panel>
          <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
            <div className="rounded-md border px-2 py-1.5">
              <span className="text-viz-ok">fd 1</span> → {outDest}
            </div>
            <div className="rounded-md border px-2 py-1.5">
              <span className="text-viz-bad">fd 2</span> → {errDest}
            </div>
          </div>
          <StatGrid cols={4}>
            <Stat label="emitted" value={stats.emitted} />
            <Stat label="terminal" value={stats.toTerm} tone="active" />
            <Stat label="files" value={stats.toFile} tone="purple" />
            <Stat label="grep drop" value={stats.dropped} tone="bad" />
          </StatGrid>
        </div>
      </Split>

      <div className="grid gap-3 md:grid-cols-2">
        <Pane title="Terminal" lines={term} empty="(nothing printed yet)" badge={<Badge variant="outline">run #{runs}</Badge>} />
        <div className="grid gap-3">
          <Pane
            title="out.log"
            lines={files["out.log"]}
            empty="(empty file)"
            badge={<Badge variant={m.truncate && (m.out === "out.log") ? "danger" : m.out === "out.log" ? "success" : "outline"}>{m.out === "out.log" ? (m.truncate ? "truncated on run" : "append") : "idle"}</Badge>}
          />
          {(mode === "err" || files["err.log"].length > 0) && <Pane title="err.log" lines={files["err.log"]} empty="(empty file)" badge={<Badge variant={mode === "err" ? "danger" : "outline"}>{mode === "err" ? "2> truncate" : "idle"}</Badge>} />}
        </div>
      </div>
    </LabShell>
  );
}
