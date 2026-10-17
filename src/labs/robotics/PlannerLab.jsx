import { useMemo, useRef, useState } from "react";
import { Eraser, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, rng, svgPoint, useStepper } from "@/viz/kit";

const RES = 0.15; // metres per cell (chapter example)
const SQ2 = Math.SQRT2;

/* ------------------------------------------------------------------ */
/* Maps                                                                */
/* ------------------------------------------------------------------ */
function makeMap(kind) {
  if (kind === "chapter") {
    const R = 5, Cc = 5, w = Array(R * Cc).fill(0);
    [[0, 2], [1, 2], [2, 2]].forEach(([r, c]) => (w[r * Cc + c] = 1));
    return { R, Cc, walls: w, start: [0, 0], goal: [0, 4] };
  }
  const R = 20, Cc = 30, w = Array(R * Cc).fill(0);
  const set = (r, c) => r >= 0 && r < R && c >= 0 && c < Cc && (w[r * Cc + c] = 1);
  if (kind === "warehouse") {
    for (let r = 0; r < 13; r++) set(r, 7);
    for (let r = 7; r < 20; r++) set(r, 15);
    for (let r = 0; r < 13; r++) set(r, 22);
  } else if (kind === "pillars") {
    const rand = rng(11);
    for (let k = 0; k < 16; k++) {
      const r = 1 + Math.floor(rand() * 17), c = 4 + Math.floor(rand() * 22);
      set(r, c), set(r + 1, c), set(r, c + 1), set(r + 1, c + 1);
    }
  }
  return { R, Cc, walls: w, start: [10, 2], goal: [10, 27] };
}

/** C-space: mark free cells within Euclidean distance r of any wall. */
function inflate({ R, Cc, walls }, r) {
  const out = walls.map((v) => (v ? 1 : 0));
  if (r <= 0) return out;
  for (let i = 0; i < R * Cc; i++) {
    if (!walls[i]) continue;
    const wr = Math.floor(i / Cc), wc = i % Cc;
    for (let dr = -r; dr <= r; dr++)
      for (let dc = -r; dc <= r; dc++) {
        const rr = wr + dr, cc = wc + dc;
        if (rr < 0 || rr >= R || cc < 0 || cc >= Cc || dr * dr + dc * dc > r * r) continue;
        if (!walls[rr * Cc + cc]) out[rr * Cc + cc] = 2;
      }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Graph search (pure)                                                 */
/* ------------------------------------------------------------------ */
const ALGOS = {
  octile: { label: "A* Octile (8-way)", h: "octile", eight: true },
  manhattan: { label: "A* Manhattan (4-way)", h: "manhattan", eight: false },
  euclid: { label: "A* Euclidean", h: "euclid", eight: true },
  dijkstra: { label: "Dijkstra (f = g)", h: "zero", eight: true },
  bfs: { label: "BFS (FIFO, unweighted)", h: "zero", eight: true, bfs: true },
  rrt: { label: "RRT (continuous sampling)", rrt: true },
};
const H = {
  octile: (dr, dc) => Math.max(dr, dc) + (SQ2 - 1) * Math.min(dr, dc),
  manhattan: (dr, dc) => dr + dc,
  euclid: (dr, dc) => Math.hypot(dr, dc),
  zero: () => 0,
};

class Heap {
  constructor(less) {
    this.a = [];
    this.less = less;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

/** Returns expansion events + final path. Ties on f are broken by lower h, then FIFO (matches the chapter trace). */
function gridSearch(occ, R, Cc, start, goal, algo, eight) {
  const idx = (r, c) => r * Cc + c;
  const s = idx(...start), gl = idx(...goal);
  const hf = H[algo.h];
  const hOf = (i) => hf(Math.abs(Math.floor(i / Cc) - goal[0]), Math.abs((i % Cc) - goal[1]));
  const g = new Map([[s, 0]]);
  const parent = new Map();
  const closed = new Set();
  const events = [{ pop: null, updates: [[s, 0, hOf(s), null]] }];
  if (occ[s] || occ[gl]) return { events, path: null, blocked: occ[s] ? "start" : "goal" };
  let seq = 0;
  const open = algo.bfs ? null : new Heap((a, b) => a.f < b.f - 1e-9 || (Math.abs(a.f - b.f) < 1e-9 && (a.h < b.h - 1e-9 || (Math.abs(a.h - b.h) < 1e-9 && a.n < b.n))));
  const queue = [];
  algo.bfs ? queue.push(s) : open.push({ i: s, f: hOf(s), h: hOf(s), n: seq++ });
  const dirs = eight ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]] : [[-1, 0], [0, 1], [1, 0], [0, -1]];
  let found = false;
  while (algo.bfs ? queue.length : open.size) {
    let cur;
    if (algo.bfs) cur = queue.shift();
    else {
      const top = open.pop();
      if (closed.has(top.i) || top.f - hOf(top.i) > g.get(top.i) + 1e-9) continue; // stale entry
      cur = top.i;
    }
    if (closed.has(cur)) continue;
    closed.add(cur);
    const ev = { pop: cur, updates: [] };
    events.push(ev);
    if (cur === gl) {
      found = true;
      break;
    }
    const r = Math.floor(cur / Cc), c = cur % Cc;
    for (const [dr, dc] of dirs) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= R || cc < 0 || cc >= Cc) continue;
      const n = idx(rr, cc);
      if (occ[n] || closed.has(n)) continue;
      if (dr && dc && (occ[idx(r, cc)] || occ[idx(rr, c)])) continue; // no corner cutting
      const step = algo.bfs ? 1 : dr && dc ? SQ2 : 1;
      const ng = g.get(cur) + step;
      if (algo.bfs ? g.has(n) : g.has(n) && g.get(n) <= ng + 1e-9) continue;
      g.set(n, ng);
      parent.set(n, cur);
      const h = hOf(n);
      ev.updates.push([n, ng, h, cur]);
      algo.bfs ? queue.push(n) : open.push({ i: n, f: ng + h, h, n: seq++ });
    }
  }
  let path = null, cost = 0;
  if (found) {
    path = [gl];
    while (path[0] !== s) path.unshift(parent.get(path[0]));
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1], b = path[k];
      cost += Math.floor(a / Cc) !== Math.floor(b / Cc) && a % Cc !== b % Cc ? SQ2 : 1;
    }
  }
  return { events, path, cost, expanded: events.length - 1 };
}

/* ------------------------------------------------------------------ */
/* RRT (pure)                                                          */
/* ------------------------------------------------------------------ */
function rrtSearch(occ, R, Cc, start, goal, stepSize, bias, seed) {
  const rand = rng(seed);
  const free = (x, y) => x >= 0 && y >= 0 && x < Cc && y < R && !occ[Math.floor(y) * Cc + Math.floor(x)];
  const segFree = (a, b) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.15);
    for (let k = 0; k <= n; k++) if (!free(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n)) return false;
    return true;
  };
  const S = [start[1] + 0.5, start[0] + 0.5], G = [goal[1] + 0.5, goal[0] + 0.5];
  const nodes = [{ p: S, parent: -1, it: 0 }];
  const iters = [{ nodes: 1 }];
  if (!free(...S) || !free(...G)) return { nodes, iters, path: null, blocked: true };
  let goalNode = -1;
  for (let it = 1; it <= 1500 && goalNode < 0; it++) {
    const toGoal = rand() < bias;
    const q = toGoal ? G : [rand() * Cc, rand() * R];
    let ni = 0, nd = Infinity;
    nodes.forEach((n, k) => {
      const d = Math.hypot(n.p[0] - q[0], n.p[1] - q[1]);
      if (d < nd) (nd = d), (ni = k);
    });
    const near = nodes[ni].p;
    const t = Math.min(1, stepSize / Math.max(nd, 1e-9));
    const qn = [near[0] + (q[0] - near[0]) * t, near[1] + (q[1] - near[1]) * t];
    const ok = segFree(near, qn);
    if (ok) {
      nodes.push({ p: qn, parent: ni, it });
      if (Math.hypot(qn[0] - G[0], qn[1] - G[1]) <= stepSize && segFree(qn, G)) {
        nodes.push({ p: G, parent: nodes.length - 1, it });
        goalNode = nodes.length - 1;
      }
    }
    iters.push({ q, near: ni, qn, ok, toGoal, nodes: nodes.length, done: goalNode >= 0 });
  }
  let path = null, cost = 0;
  if (goalNode >= 0) {
    path = [];
    for (let k = goalNode; k >= 0; k = nodes[k].parent) path.unshift(nodes[k].p);
    for (let k = 1; k < path.length; k++) cost += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
  }
  return { nodes, iters, path, cost };
}

/* ------------------------------------------------------------------ */
export default function PlannerLab() {
  const [mapKind, setMapKind] = useState("warehouse");
  const [map, setMap] = useState(() => makeMap("warehouse"));
  const [algoKey, setAlgoKey] = useState("octile");
  const [cspace, setCspace] = useState(true);
  const [radius, setRadius] = useState(0.3);
  const [eightOverride, setEightOverride] = useState(null);
  const [stepSize, setStepSize] = useState(2);
  const [bias, setBias] = useState(0.1);
  const [seed, setSeed] = useState(1);
  const [hover, setHover] = useState(null);
  const algo = ALGOS[algoKey];
  const eight = eightOverride ?? algo.eight;
  const { R, Cc, walls, start, goal } = map;
  const rInf = cspace ? Math.ceil(radius / RES - 1e-9) : 0;
  const occ = useMemo(() => inflate(map, rInf), [map, rInf]);

  const res = useMemo(() => (algo.rrt ? rrtSearch(occ, R, Cc, start, goal, stepSize, bias, seed) : gridSearch(occ, R, Cc, start, goal, algo, eight)), [occ, R, Cc, start, goal, algo, eight, stepSize, bias, seed]);
  const steps = algo.rrt ? res.iters : res.events;
  const st = useStepper(steps, { baseMs: algo.rrt ? 90 : R * Cc > 100 ? 70 : 700 });
  const i = Math.min(st.i, steps.length - 1); // stepper resets in an effect, so clamp on the render where steps change
  const atEnd = i >= steps.length - 1;

  // replay grid events up to i
  const view = useMemo(() => {
    if (algo.rrt) return null;
    const vals = new Map();
    const closed = new Set();
    for (let k = 0; k <= i; k++) {
      const ev = res.events[k];
      if (ev.pop != null) closed.add(ev.pop);
      for (const [n, g, h, p] of ev.updates) vals.set(n, { g, h, f: g + h, p });
    }
    return { vals, closed, cur: res.events[i]?.pop };
  }, [res, i, algo.rrt]);

  // comparison table across grid algorithms on the current map
  const compare = useMemo(
    () =>
      Object.entries(ALGOS)
        .filter(([, a]) => !a.rrt)
        .map(([k, a]) => {
          const r = gridSearch(occ, R, Cc, start, goal, a, a.eight);
          return { k, label: a.label, expanded: r.expanded ?? 0, cost: r.path ? r.cost : null };
        }),
    [occ, R, Cc, start, goal]
  );
  const best = Math.min(...compare.filter((c) => c.cost != null).map((c) => c.cost));

  /* ---------------- drawing & interaction ---------------- */
  const W = 600;
  const cs = W / Cc;
  const Hh = cs * R;
  const svgRef = useRef(null);
  const drag = useRef(null);
  const cellAt = (e) => {
    const p = svgPoint(svgRef.current, e);
    const c = Math.floor(p.x / cs), r = Math.floor(p.y / cs);
    return r >= 0 && r < R && c >= 0 && c < Cc ? [r, c] : null;
  };
  const apply = (rc) => {
    if (!rc || !drag.current) return;
    const [r, c] = rc;
    const d = drag.current;
    if (d === "start" || d === "goal") {
      if (!walls[r * Cc + c]) setMap((m) => ({ ...m, [d]: [r, c] }));
      return;
    }
    if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) return;
    if (walls[r * Cc + c] !== (d === "paint" ? 1 : 0))
      setMap((m) => {
        const w = [...m.walls];
        w[r * Cc + c] = d === "paint" ? 1 : 0;
        return { ...m, walls: w };
      });
  };
  const onDown = (e) => {
    const rc = cellAt(e);
    if (!rc) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [r, c] = rc;
    drag.current = r === start[0] && c === start[1] ? "start" : r === goal[0] && c === goal[1] ? "goal" : walls[r * Cc + c] ? "erase" : "paint";
    apply(rc);
  };
  const onMove = (e) => {
    const rc = cellAt(e);
    setHover(rc);
    apply(rc);
  };
  const onUp = () => (drag.current = null);

  const pathSet = new Set(!algo.rrt && atEnd && res.path ? res.path : []);
  const hv = hover && view ? view.vals.get(hover[0] * Cc + hover[1]) : null;
  const curIt = algo.rrt ? res.iters[i] : null;
  const rrtNodes = algo.rrt ? res.nodes.filter((n) => n.it <= i && (n.it < i || i === 0 || res.iters[i].ok)) : [];

  let note, tone = "default";
  if (res.blocked) {
    note = `The ${res.blocked === "start" || res.blocked === true ? "start or goal" : res.blocked} sits inside an obstacle${cspace ? " or its C-space inflation" : ""}. Drag it to free space or shrink the robot radius.`;
    tone = "bad";
  } else if (algo.rrt) {
    if (i === 0) note = "RRT grows a tree from Start by random sampling — no grid search, works in any dimension.";
    else if (curIt.done) (note = `Iteration ${i}: the new node can see the goal — path found with ${curIt.nodes} tree vertices. RRT paths are feasible, not optimal (cost ${(res.cost * RES).toFixed(2)} m).`), (tone = "ok");
    else (note = `Iteration ${i}: sample q_rand${curIt.toGoal ? " (goal-biased)" : ""}, find nearest vertex q_near, steer ${stepSize} cells toward it → q_new ${curIt.ok ? "is collision-free and joins the tree" : "collides with an obstacle and is rejected"}.`), (tone = curIt.ok ? "active" : "bad");
  } else if (i === 0) note = `Push Start into the open set with f = ${algo.h === "zero" ? "g = 0" : "g + h"}. ${algo.bfs ? "BFS uses a FIFO queue and ignores √2 diagonal costs." : "The min-heap always pops the lowest f next."}`;
  else if (atEnd && res.path) (note = `Goal popped after ${res.expanded} expansions. Path cost ${res.cost.toFixed(2)} cells = ${(res.cost * RES).toFixed(2)} m${res.cost - best > 1e-6 ? ` — NOT optimal (best is ${best.toFixed(2)})` : " — optimal"}.`), (tone = res.cost - best > 1e-6 ? "warn" : "ok");
  else if (atEnd) (note = "Open set exhausted without reaching the goal: no collision-free path exists in this C-space."), (tone = "bad");
  else {
    const c = view.cur;
    const v = view.vals.get(c);
    note = `Pop (${Math.floor(c / Cc)}, ${c % Cc}) with g = ${v.g.toFixed(2)}, h = ${v.h.toFixed(2)}, f = ${v.f.toFixed(2)}; relax ${res.events[i].updates.length} neighbor(s).`;
    tone = "active";
  }

  const P = (rc) => [rc[1] * cs + cs / 2, rc[0] * cs + cs / 2];
  return (
    <LabShell title="Occupancy Grid Motion Planner" description="Paint walls, inflate them into C-space by the robot radius, and step through BFS, Dijkstra, A* and RRT expanding toward the goal." badges={["C-space inflation", "f = g + h", "RRT"]}>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={algoKey} onValueChange={(v) => (setAlgoKey(v), setEightOverride(null))}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ALGOS).map(([k, a]) => (
              <SelectItem key={k} value={k}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={mapKind}
          onValueChange={(v) => {
            setMapKind(v);
            setMap(makeMap(v));
            if (v === "chapter") setAlgoKey("manhattan"), setCspace(false), setEightOverride(null);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warehouse">Warehouse aisles 30×20</SelectItem>
            <SelectItem value="pillars">Pillar field 30×20</SelectItem>
            <SelectItem value="empty">Empty floor 30×20</SelectItem>
            <SelectItem value="chapter">Chapter dry run 5×5</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setMap((m) => ({ ...m, walls: m.walls.map(() => 0) }))}>
          <Eraser /> Clear walls
        </Button>
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <div className="relative">
              <svg ref={svgRef} viewBox={`0 0 ${W} ${Hh}`} className="w-full touch-none select-none font-mono" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => (onUp(), setHover(null))}>
                {occ.map((o, k) => {
                  const r = Math.floor(k / Cc), c = k % Cc;
                  let fill = C.card, op = 1;
                  if (o === 1) fill = C.ink;
                  else if (o === 2) (fill = C.warn), (op = 0.3);
                  else if (view) {
                    if (pathSet.has(k)) fill = C.ok;
                    else if (k === view.cur) fill = C.active;
                    else if (view.closed.has(k)) (fill = C.purple), (op = 0.3);
                    else if (view.vals.has(k)) (fill = C.active), (op = 0.28);
                  }
                  return <rect key={k} x={c * cs} y={r * cs} width={cs - 0.6} height={cs - 0.6} fill={fill} opacity={op} stroke={C.grid} strokeWidth={0.4} />;
                })}
                {R * Cc <= 25 &&
                  view &&
                  [...view.vals].map(([k, v]) => (
                    <text key={k} x={(k % Cc) * cs + cs / 2} y={Math.floor(k / Cc) * cs + cs / 2 + 4} textAnchor="middle" fontSize={12} fill={C.fg}>
                      {v.g.toFixed(0)}+{v.h.toFixed(0)}={v.f.toFixed(0)}
                    </text>
                  ))}
                {!algo.rrt && atEnd && res.path && <polyline points={res.path.map((k) => P([Math.floor(k / Cc), k % Cc]).join(",")).join(" ")} fill="none" stroke={C.ok} strokeWidth={Math.max(2, cs * 0.18)} strokeLinejoin="round" />}
                {algo.rrt && (
                  <g>
                    {rrtNodes.map((n, k) => n.parent >= 0 && <line key={k} x1={res.nodes[n.parent].p[0] * cs} y1={res.nodes[n.parent].p[1] * cs} x2={n.p[0] * cs} y2={n.p[1] * cs} stroke={C.active} strokeWidth={1.2} opacity={0.75} />)}
                    {rrtNodes.map((n, k) => (
                      <circle key={k} cx={n.p[0] * cs} cy={n.p[1] * cs} r={1.8} fill={C.active} />
                    ))}
                    {curIt?.q && (
                      <g>
                        <line x1={res.nodes[curIt.near].p[0] * cs} y1={res.nodes[curIt.near].p[1] * cs} x2={curIt.qn[0] * cs} y2={curIt.qn[1] * cs} stroke={curIt.ok ? C.ok : C.bad} strokeWidth={2.5} />
                        <circle cx={res.nodes[curIt.near].p[0] * cs} cy={res.nodes[curIt.near].p[1] * cs} r={4} fill="none" stroke={C.purple} strokeWidth={2} />
                        <path d={`M${curIt.q[0] * cs - 5},${curIt.q[1] * cs} h10 M${curIt.q[0] * cs},${curIt.q[1] * cs - 5} v10`} stroke={C.active} strokeWidth={2} />
                      </g>
                    )}
                    {atEnd && res.path && <polyline points={res.path.map((p) => `${p[0] * cs},${p[1] * cs}`).join(" ")} fill="none" stroke={C.warn} strokeWidth={3} strokeLinejoin="round" />}
                  </g>
                )}
                {/* robot footprint (true radius) at start, start/goal markers */}
                <circle cx={P(start)[0]} cy={P(start)[1]} r={(radius / RES) * cs} fill={C.ok} opacity={0.12} stroke={C.ok} strokeDasharray="3 3" />
                {[
                  [start, "S", C.ok],
                  [goal, "G", C.bad],
                ].map(([rc, t, col]) => (
                  <g key={t} className="cursor-grab">
                    <circle cx={P(rc)[0]} cy={P(rc)[1]} r={Math.max(7, cs * 0.42)} fill={col} />
                    <text x={P(rc)[0]} y={P(rc)[1] + 4} textAnchor="middle" fontSize={Math.max(10, cs * 0.45)} fontWeight={700} fill={C.card}>
                      {t}
                    </text>
                  </g>
                ))}
              </svg>
              {hv && hover && (
                <div className="pointer-events-none absolute z-10 rounded-md bg-foreground px-2.5 py-1.5 font-mono text-xs leading-snug text-background shadow-md" style={{ left: `${((hover[1] + 1) / Cc) * 100}%`, top: `${(hover[0] / R) * 100}%`, transform: hover[1] > Cc * 0.7 ? "translateX(calc(-100% - 24px))" : undefined }}>
                  ({hover[0]}, {hover[1]}) g={hv.g.toFixed(2)} h={hv.h.toFixed(2)} f={hv.f.toFixed(2)}
                  {hv.p != null && (
                    <>
                      <br />
                      parent ({Math.floor(hv.p / Cc)}, {hv.p % Cc})
                    </>
                  )}
                </div>
              )}
            </div>
          </Stage>
          <Legend
            items={[
              [C.ink, "wall (100)"],
              [C.warn, "C-space inflation"],
              [C.active, algo.rrt ? "tree / q_rand" : "open set (frontier)"],
              [C.purple, algo.rrt ? "q_near" : "closed set"],
              [C.ok, "path"],
            ]}
          />
          <Narration tone={tone}>{note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Robot & C-space">
            <SwitchControl label="C-space inflation" hint={`r_inflate = ⌈R / ${RES} m⌉ = ${Math.ceil(radius / RES - 1e-9)} cells`} checked={cspace} onChange={setCspace} />
            <SliderControl label="robot radius R" value={radius} onChange={setRadius} min={0.05} max={0.45} step={0.05} format={(v) => `${v.toFixed(2)} m`} />
            {!algo.rrt && <SwitchControl label="8-connected diagonal moves" checked={eight} onChange={setEightOverride} />}
            {algo.rrt && (
              <>
                <SliderControl label="step size δ" value={stepSize} onChange={setStepSize} min={0.5} max={5} step={0.5} format={(v) => `${v} cells (${(v * RES).toFixed(2)} m)`} />
                <SliderControl label="goal bias p_goal" value={bias} onChange={setBias} min={0} max={0.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
                <Button size="sm" variant="outline" onClick={() => setSeed((x) => x + 1)}>
                  <Shuffle /> New random seed
                </Button>
              </>
            )}
            {algoKey === "manhattan" && eight && <Badge variant="warning">Manhattan overestimates diagonals on an 8-way grid → inadmissible</Badge>}
          </Panel>
          <StatGrid cols={2}>
            <Stat label={algo.rrt ? "tree vertices" : "nodes expanded"} value={algo.rrt ? curIt?.nodes ?? 1 : Math.max(0, i)} tone="active" />
            <Stat label="path length" value={atEnd && res.path ? `${(res.cost * RES).toFixed(2)} m` : "—"} tone="ok" />
          </StatGrid>
          {!algo.rrt && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>algorithm</TableHead>
                  <TableHead className="text-right">expanded</TableHead>
                  <TableHead className="text-right">length</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compare.map((c) => (
                  <TableRow key={c.k} className={c.k === algoKey ? "bg-viz-active/8" : ""}>
                    <TableCell className="py-1 text-[12px]">{c.label}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{c.expanded}</TableCell>
                    <TableCell className="py-1 text-right">
                      {c.cost == null ? (
                        <Badge variant="danger">none</Badge>
                      ) : (
                        <Badge variant={c.cost - best > 1e-6 ? "warning" : "success"}>{(c.cost * RES).toFixed(2)} m</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-[11.5px] text-muted-foreground">Drag on the grid to paint / erase walls; drag S or G to move them. Hover an explored cell for g, h, f.</p>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
