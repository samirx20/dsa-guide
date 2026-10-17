import { useId, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, Split, Stage, StatGrid, Stat, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ---------- algorithm traces (pure) ---------- */

const INF = Infinity;
const fmt = (d) => (d === INF ? "∞" : d >= 1e8 ? "∞" : String(d));
const ukey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const dkey = (a, b) => `${a}>${b}`;
const pw = (w) => (w < 0 ? `(${w})` : String(w));

function buildAdj(n, edges, directed) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    adj[u].push(w === undefined ? v : [v, w]);
    if (!directed) adj[v].push(w === undefined ? u : [u, w]);
  }
  return adj;
}

function bfsSteps(adj, start) {
  const n = adj.length;
  const visited = Array(n).fill(false), level = Array(n).fill(null), order = [], tree = [], q = [];
  const s = [];
  const snap = (o) => s.push({ visited: [...visited], queue: [...q], order: [...order], level: [...level], tree: [...tree], cur: null, nb: null, ...o });
  visited[start] = true;
  level[start] = 0;
  q.push(start);
  snap({ line: [3, 4], note: `Mark ${start} visited BEFORE pushing it, then push. queue = [${start}].`, tone: "active" });
  while (q.length) {
    const cur = q.shift();
    order.push(cur);
    snap({ cur, line: [7, 8, 9], note: `Pop ${cur} from the front of the queue (level ${level[cur]}) and visit it. Neighbors: [${adj[cur].join(", ")}].`, tone: "active" });
    for (const nb of adj[cur]) {
      if (!visited[nb]) {
        visited[nb] = true;
        level[nb] = level[cur] + 1;
        q.push(nb);
        tree.push(ukey(cur, nb));
        snap({ cur, nb, line: [12, 13, 14], note: `${nb} is unvisited → mark it visited now and push it (level ${level[nb]}). queue = [${q.join(", ")}].`, tone: "ok" });
      } else {
        snap({ cur, nb, line: [11, 12], note: `${nb} is already visited — skip it (this is what prevents infinite loops).`, tone: "default" });
      }
    }
  }
  const missed = visited.map((v, k) => (!v ? k : null)).filter((k) => k !== null);
  snap({ done: true, line: 18, note: `Queue empty — BFS order: ${order.join(" → ")}.` + (missed.length ? ` Nodes ${missed.join(", ")} are in another component and were never reached.` : " Levels = shortest hop distance from the start."), tone: "ok" });
  return s;
}

function dfsSteps(adj, start) {
  const n = adj.length;
  const visited = Array(n).fill(false), order = [], tree = [], stack = [];
  const s = [];
  const snap = (o) => s.push({ visited: [...visited], stack: [...stack], order: [...order], tree: [...tree], cur: null, nb: null, ...o });
  const go = (u, parent) => {
    stack.push(u);
    visited[u] = true;
    order.push(u);
    snap({ cur: u, line: [2, 3], note: parent === null ? `Call dfs(${start}): mark it visited. Call stack = [${stack.join(", ")}].` : `Inside dfs(${u}): mark ${u} visited. Call stack depth = ${stack.length}.`, tone: "active" });
    for (const nb of adj[u]) {
      if (!visited[nb]) {
        tree.push(ukey(u, nb));
        snap({ cur: u, nb, line: [5, 6, 7], note: `${nb} is unvisited → recurse into dfs(${nb}) — go deeper before going wider.`, tone: "ok" });
        go(nb, u);
      } else {
        snap({ cur: u, nb, line: [5, 6], note: `${nb} is already visited — skip.`, tone: "default" });
      }
    }
    stack.pop();
    snap({ cur: stack.at(-1) ?? null, line: 10, note: stack.length ? `dfs(${u}) has no unvisited neighbors left → return (backtrack) to dfs(${stack.at(-1)}).` : `dfs(${u}) returns — the call stack is empty.`, tone: "warn" });
  };
  go(start, null);
  const missed = visited.map((v, k) => (!v ? k : null)).filter((k) => k !== null);
  s.push({ ...s.at(-1), done: true, line: 10, note: `DFS order: ${order.join(" → ")}.` + (missed.length ? ` Nodes ${missed.join(", ")} were never reached (separate component) — call dfs again from them to count components.` : ""), tone: "ok" });
  return s;
}

function kahnSteps(n, edges) {
  const adj = buildAdj(n, edges, true);
  const indeg = Array(n).fill(0), q = [], order = [], done = [];
  const s = [];
  const snap = (o) => s.push({ indeg: [...indeg], queue: [...q], order: [...order], cur: null, nb: null, edge: null, ...o });
  for (const [, v] of edges) indeg[v]++;
  snap({ line: [3, 4], note: `Count incoming edges: inDegree = [${indeg.join(", ")}]. A node with in-degree 0 has no unmet prerequisites.`, tone: "active" });
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  snap({ line: [7, 8], note: q.length ? `Seed the queue with every in-degree-0 node: [${q.join(", ")}].` : `No node has in-degree 0 — the queue starts empty!`, tone: q.length ? "active" : "bad" });
  while (q.length) {
    const cur = q.shift();
    order.push(cur);
    done.push(cur);
    snap({ cur, line: [12, 13], note: `Pop ${cur} and append it to the order — all its prerequisites are done.`, tone: "ok" });
    for (const nb of adj[cur]) {
      indeg[nb]--;
      const ready = indeg[nb] === 0;
      if (ready) q.push(nb);
      snap({ cur, nb, edge: dkey(cur, nb), line: ready ? [15, 16] : 15, note: `Edge ${cur}→${nb}: inDegree[${nb}]-- → ${indeg[nb]}.` + (ready ? ` It hit 0 → push ${nb}.` : ` Still waiting on ${indeg[nb]} prerequisite${indeg[nb] > 1 ? "s" : ""}.`), tone: ready ? "ok" : "default" });
    }
  }
  const ok = order.length === n;
  const stuck = indeg.map((d, k) => (d > 0 ? k : null)).filter((k) => k !== null);
  snap({ done: true, cycle: !ok, stuck, line: ok ? 19 : 20, note: ok ? `order.size() = ${n} = n → valid DAG. Topological order: ${order.join(" → ")}.` : `Queue empty but only ${order.length}/${n} nodes were output. Nodes ${stuck.join(", ")} still have in-degree > 0 — they sit on a cycle. CYCLE DETECTED.`, tone: ok ? "ok" : "bad" });
  return s;
}

function dijkstraSteps(n, edges, src, names) {
  const adj = buildAdj(n, edges, true);
  const dist = Array(n).fill(INF), parent = Array(n).fill(-1), settled = Array(n).fill(false);
  let pq = [];
  const s = [];
  const nm = (k) => names[k];
  const snap = (o) => s.push({ dist: [...dist], parent: [...parent], settled: [...settled], pq: pq.map((p) => [...p]), cur: null, edge: null, ...o });
  const push = (d, u) => {
    pq.push([d, u]);
    pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  dist[src] = 0;
  push(0, src);
  snap({ line: [4, 5], note: `dist[${nm(src)}] = 0, every other node ∞. Push (0, ${nm(src)}) onto the min-heap.`, tone: "active" });
  let pops = 0, relaxes = 0;
  while (pq.length) {
    const [d, u] = pq.shift();
    pops++;
    if (d > dist[u]) {
      snap({ cur: u, popped: [d, u], stale: true, line: 9, pops, relaxes, note: `Pop (${d}, ${nm(u)}) — but dist[${nm(u)}] is already ${dist[u]} < ${d}. Stale heap entry → skip.`, tone: "bad" });
      continue;
    }
    settled[u] = true;
    snap({ cur: u, popped: [d, u], line: 8, pops, relaxes, note: `Pop the closest unsettled node: (${d}, ${nm(u)}). Its distance ${d} is now final.`, tone: "active" });
    for (const [v, w] of adj[u]) {
      const nd = d + w;
      relaxes++;
      const better = nd < dist[v];
      const old = dist[v];
      if (better) {
        dist[v] = nd;
        parent[v] = u;
        push(nd, v);
      }
      snap({ cur: u, edge: dkey(u, v), target: v, popped: [d, u], line: better ? [12, 13, 14, 15] : [12, 13], pops, relaxes, note: better ? `Relax ${nm(u)}→${nm(v)} (w=${w}): ${d} + ${w} = ${nd} < ${fmt(old)} → dist[${nm(v)}] = ${nd}, push (${nd}, ${nm(v)}).` : `Try ${nm(u)}→${nm(v)} (w=${w}): ${d} + ${w} = ${nd} ≥ ${fmt(old)} → no improvement.`, tone: better ? "ok" : "default" });
    }
  }
  snap({ done: true, line: 19, pops, relaxes, note: `Heap empty. Final distances: ${dist.map((d, k) => `${nm(k)}=${fmt(d)}`).join(", ")}. Green edges form the shortest-path tree.`, tone: "ok" });
  return s;
}

function bellmanSteps(n, edges, src, names) {
  const dist = Array(n).fill(INF), parent = Array(n).fill(-1);
  const s = [], history = [{ round: 0, dist: [...dist] }];
  history[0].dist[src] = 0;
  const nm = (k) => names[k];
  const snap = (o) => s.push({ dist: [...dist], parent: [...parent], history: history.map((h) => ({ ...h })), edge: null, round: 0, ...o });
  dist[src] = 0;
  snap({ line: [2, 3], note: `dist[${nm(src)}] = 0, others ∞. We will relax EVERY edge, V − 1 = ${n - 1} times.`, tone: "active" });
  for (let r = 1; r <= n - 1; r++) {
    let changed = false;
    for (let e = 0; e < edges.length; e++) {
      const [u, v, w] = edges[e];
      const can = dist[u] !== INF && dist[u] + w < dist[v];
      const old = dist[v];
      if (can) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        changed = true;
      }
      snap({ round: r, ei: e, edge: dkey(u, v), target: v, line: can ? [7, 8] : 7, note: dist[u] === INF ? `Round ${r}: ${nm(u)}→${nm(v)} — dist[${nm(u)}] is ∞, skip (guard against overflow).` : can ? `Round ${r}: ${nm(u)}→${nm(v)} (${w}): ${dist[u]} + ${pw(w)} = ${dist[v]} < ${fmt(old)} → update.` : `Round ${r}: ${nm(u)}→${nm(v)} (${w}): ${dist[u]} + ${pw(w)} = ${dist[u] + w} ≥ ${fmt(old)} → no change.`, tone: can ? "ok" : "default" });
    }
    history.push({ round: r, dist: [...dist], changed });
    snap({ round: r, line: 4, note: changed ? `End of round ${r}: dist = [${dist.map(fmt).join(", ")}].` : `Round ${r} changed nothing — distances have converged (you could stop early).`, tone: changed ? "active" : "ok" });
  }
  for (let e = 0; e < edges.length; e++) {
    const [u, v, w] = edges[e];
    if (dist[u] !== INF && dist[u] + w < dist[v]) {
      snap({ round: n, check: true, ei: e, edge: dkey(u, v), target: v, neg: true, line: [13, 14], note: `V-th check: ${nm(u)}→${nm(v)} STILL relaxes (${dist[u]} + ${pw(w)} = ${dist[u] + w} < ${dist[v]}). After V − 1 rounds that is impossible without a NEGATIVE CYCLE.`, tone: "bad" });
      snap({ round: n, check: true, done: true, neg: true, line: 14, note: `Negative cycle detected → return {}. Shortest paths are undefined (−∞): you could loop forever lowering the cost.`, tone: "bad" });
      return s;
    }
    snap({ round: n, check: true, ei: e, edge: dkey(u, v), target: v, line: [12, 13], note: `V-th check: ${nm(u)}→${nm(v)} cannot relax any further. ✓`, tone: "default" });
  }
  snap({ round: n, check: true, done: true, line: 16, note: `No edge relaxes in the V-th pass → no negative cycle. Final dist = [${dist.map(fmt).join(", ")}].`, tone: "ok" });
  return s;
}

function floydSteps(n, edges) {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  for (const [u, v, w] of edges) d[u][v] = Math.min(d[u][v], w);
  const s = [];
  const snap = (o) => s.push({ d: d.map((r) => [...r]), k: -1, cell: null, ...o });
  snap({ line: 1, note: `Start from the adjacency matrix: direct edge weights, 0 on the diagonal, ∞ where there is no edge.`, tone: "active" });
  let updates = 0;
  for (let k = 0; k < n; k++) {
    snap({ k, line: 2, note: `k = ${k}: now allow node ${k} as an intermediate stop. Row ${k} and column ${k} (purple) are the only cells we read.`, tone: "active" });
    let any = false;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (d[i][k] === INF || d[k][j] === INF) continue;
        const via = d[i][k] + d[k][j];
        if (via < d[i][j]) {
          const old = d[i][j];
          d[i][j] = via;
          updates++;
          any = true;
          snap({ k, cell: [i, j], line: [5, 6], updates, note: `${i}→${k}→${j}: ${d[i][k]} + ${pw(d[k][j])} = ${via} < ${fmt(old)} → d[${i}][${j}] = ${via}.`, tone: "ok" });
        }
      }
    if (!any) snap({ k, line: 2, updates, note: `Routing through ${k} improved nothing.`, tone: "default" });
  }
  const neg = d.map((r, i) => r[i]).some((x) => x < 0);
  snap({ done: true, line: 7, updates, neg, note: neg ? `Diagonal has a negative entry (d[i][i] < 0) → a NEGATIVE CYCLE passes through those nodes.` : `Done: ${updates} improvements in O(V³). Every d[i][j] is now the all-pairs shortest distance. Diagonal all 0 → no negative cycle.`, tone: neg ? "bad" : "ok" });
  return s;
}

/* ---------- rendering ---------- */

const TONE = { active: C.active, ok: C.ok, bad: C.bad, warn: C.warn, purple: C.purple };

function GraphSvg({ nodes, edges, directed, nodeTone = {}, edgeTone = {}, subs = {}, tags = {}, W = 620, H = 300, weighted }) {
  const uid = useId().replace(/:/g, "");
  const R = 19;
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const keys = new Set(edges.map(([u, v]) => dkey(u, v)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img">
      <defs>
        {["ink", "active", "ok", "bad", "warn", "purple"].map((t) => (
          <marker key={t} id={`${uid}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={t === "ink" ? C.muted : TONE[t]} />
          </marker>
        ))}
      </defs>
      {edges.map(([u, v, w]) => {
        const a = pos[u], b = pos[v];
        const k = directed ? dkey(u, v) : ukey(u, v);
        const tone = edgeTone[k];
        const color = tone ? TONE[tone] : C.muted;
        const curved = directed && keys.has(dkey(v, u));
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, px = -uy, py = ux;
        const off = curved ? 22 : 0;
        const mx = (a.x + b.x) / 2 + px * off, my = (a.y + b.y) / 2 + py * off;
        // shorten ends toward the control point
        const sdx = mx - a.x, sdy = my - a.y, sL = Math.hypot(sdx, sdy) || 1;
        const edx = mx - b.x, edy = my - b.y, eL = Math.hypot(edx, edy) || 1;
        const x1 = a.x + (sdx / sL) * R, y1 = a.y + (sdy / sL) * R;
        const x2 = b.x + (edx / eL) * (R + 2), y2 = b.y + (edy / eL) * (R + 2);
        const d = curved ? `M${x1},${y1} Q${mx + px * off * 0.6},${my + py * off * 0.6} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
        const lx = curved ? mx + px * 8 : mx + px * 12, ly = curved ? my + py * 8 : my + py * 12;
        return (
          <g key={`${u}-${v}`}>
            <path d={d} fill="none" stroke={color} strokeWidth={tone ? 3 : 1.6} opacity={tone ? 1 : 0.7} markerEnd={directed ? `url(#${uid}-${tone ?? "ink"})` : undefined} />
            {weighted && (
              <g>
                <rect x={lx - 13} y={ly - 9} width={26} height={17} rx={4} fill={C.card} stroke={tone ? color : C.border} />
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={w < 0 ? C.bad : C.fg}>
                  {w}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((n) => {
        const tone = nodeTone[n.id];
        const color = tone && tone !== "dim" ? TONE[tone] : C.ink;
        return (
          <g key={n.id} opacity={tone === "dim" ? 0.35 : 1} className="transition-opacity duration-300">
            <circle cx={n.x} cy={n.y} r={R} fill={tone && tone !== "dim" ? color : C.card} fillOpacity={tone && tone !== "dim" ? 0.18 : 1} stroke={color} strokeWidth={tone && tone !== "dim" ? 2.5 : 1.5} />
            <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.fg}>
              {n.label}
            </text>
            {subs[n.id] != null && subs[n.id] !== "" && (
              <g>
                <rect x={n.x - String(subs[n.id]).length * 3.4 - 3} y={n.y + R + 3} width={String(subs[n.id]).length * 6.8 + 6} height={15} rx={3} fill={C.card} opacity={0.9} />
                <text x={n.x} y={n.y + R + 14} textAnchor="middle" fontSize={11} fill={C.muted}>
                  {subs[n.id]}
                </text>
              </g>
            )}
            {tags[n.id] && (
              <text x={n.x} y={n.y - R - 7} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={TONE[tags[n.id][1]] ?? C.active}>
                {tags[n.id][0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Row of boxes for queues / stacks / output order. */
function Chips({ label, items, tone = "active", hint, empty = "empty", highlightFirst }) {
  const cls = {
    active: "border-viz-active/50 bg-viz-active/10 text-viz-active",
    ok: "border-viz-ok/50 bg-viz-ok/10 text-viz-ok",
    warn: "border-viz-warn/50 bg-viz-warn/10 text-viz-warn",
    purple: "border-viz-purple/50 bg-viz-purple/10 text-viz-purple",
  }[tone];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">{label}</span>
      {items.length === 0 && <span className="font-mono text-[12px] italic text-muted-foreground">{empty}</span>}
      {items.map((it, k) => (
        <span key={k} className={cn("rounded-md border px-2 py-0.5 font-mono text-[12.5px] font-semibold tabular-nums", cls, highlightFirst && k === 0 && "ring-2 ring-viz-active/40")}>
          {it}
        </span>
      ))}
      {hint && items.length > 0 && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function PresetSelect({ value, onChange, options, className = "w-56" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([k, p]) => (
          <SelectItem key={k} value={k}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- traversal ---------- */

const TRAV = {
  square: {
    label: "Square cycle (chapter dry-run)",
    n: 4,
    edges: [[0, 1], [0, 3], [1, 2], [2, 3]],
    pos: [[170, 70], [450, 70], [450, 230], [170, 230]],
  },
  triangle: {
    label: "Edges 0-1, 1-2, 2-0, 2-3",
    n: 4,
    edges: [[0, 1], [0, 2], [1, 2], [2, 3]],
    pos: [[140, 70], [140, 230], [330, 150], [500, 150]],
  },
  forest: {
    label: "Two components (8 nodes)",
    n: 8,
    edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [4, 5], [6, 7]],
    pos: [[60, 150], [170, 80], [170, 220], [290, 40], [290, 150], [290, 260], [440, 110], [550, 200]],
  },
};

const BFS_CODE = `void bfs(int start, vector<vector<int>>& adj, vector<bool>& visited) {
    queue<int> q;
    visited[start] = true;     // mark BEFORE pushing
    q.push(start);

    while (!q.empty()) {
        int curr = q.front();
        q.pop();
        cout << "Visited: " << curr << endl;

        for (int neighbor : adj[curr]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}`;

const DFS_CODE = `void dfs(int node, vector<vector<int>>& adj, vector<bool>& visited) {
    visited[node] = true;
    cout << "Visited: " << node << endl;

    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(neighbor, adj, visited);
        }
    }
}`;

function TraversalView() {
  const [preset, setPreset] = useState("square");
  const [algo, setAlgo] = useState("bfs");
  const [start, setStart] = useState(0);
  const [rep, setRep] = useState("list");
  const g = TRAV[preset];
  const adj = useMemo(() => buildAdj(g.n, g.edges, false), [g]);
  const src = Math.min(start, g.n - 1);
  const steps = useMemo(() => (algo === "bfs" ? bfsSteps(adj, src) : dfsSteps(adj, src)), [adj, algo, src]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const nodes = g.pos.map(([x, y], k) => ({ id: k, label: k, x, y }));

  const nodeTone = {};
  nodes.forEach((n) => {
    if (step.visited[n.id]) nodeTone[n.id] = "ok";
  });
  if (algo === "bfs") step.queue.forEach((k) => (nodeTone[k] = "purple"));
  else step.stack?.forEach((k) => (nodeTone[k] = "purple"));
  if (step.cur !== null && !step.done) nodeTone[step.cur] = "active";
  if (step.nb !== null && step.nb !== undefined) nodeTone[step.nb] = step.tone === "ok" ? "ok" : "warn";
  const edgeTone = Object.fromEntries(step.tree.map((k) => [k, "ok"]));
  if (step.nb !== null && step.nb !== undefined) edgeTone[ukey(step.cur, step.nb)] = step.tone === "ok" ? "active" : "warn";
  const subs = algo === "bfs" ? Object.fromEntries(step.level.map((l, k) => [k, l === null ? "" : `lvl ${l}`])) : {};
  const tags = {};
  if (step.cur !== null && !step.done) tags[step.cur] = ["curr", "active"];
  if (step.nb !== null && step.nb !== undefined) tags[step.nb] = ["neighbor", step.tone === "ok" ? "ok" : "warn"];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PresetSelect value={preset} onChange={(v) => { setPreset(v); setStart(0); }} options={TRAV} />
        <Select value={String(src)} onValueChange={(v) => setStart(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((n) => (
              <SelectItem key={n.id} value={String(n.id)}>
                start = {n.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={algo} onValueChange={setAlgo} className="max-w-full ml-auto">
          <TabsList>
            <TabsTrigger value="bfs">BFS (queue)</TabsTrigger>
            <TabsTrigger value="dfs">DFS (call stack)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            <GraphSvg nodes={nodes} edges={g.edges} nodeTone={nodeTone} edgeTone={edgeTone} subs={subs} tags={tags} />
          </Stage>
          <Legend items={[[C.active, "Current node"], [C.purple, algo === "bfs" ? "In queue" : "On call stack"], [C.ok, "Visited / tree edge"], [C.warn, "Already-visited neighbor"]]} />
          <Panel>
            {algo === "bfs" ? (
              <Chips label="queue" items={step.queue} tone="purple" hint="← front … back" highlightFirst />
            ) : (
              <Chips label="call stack" items={step.stack} tone="purple" hint="bottom … top →" />
            )}
            <Chips label="visited" items={step.visited.map((v, k) => (v ? k : null)).filter((k) => k !== null)} tone="ok" empty="{}" />
            <Chips label="order" items={step.order} tone="active" empty="—" />
          </Panel>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="min-w-0 space-y-3">
          <Tabs value={rep} onValueChange={setRep} className="max-w-full">
            <TabsList>
              <TabsTrigger value="list">Adjacency list</TabsTrigger>
              <TabsTrigger value="matrix">Adjacency matrix</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <div className="space-y-1 rounded-lg border bg-background/50 p-3 font-mono text-[12.5px]">
                {adj.map((nbrs, u) => (
                  <div key={u} className={cn("flex items-center gap-1.5 rounded px-1.5 py-0.5", u === step.cur && !step.done && "bg-viz-active/12")}>
                    <span className="w-6 font-semibold">{u}:</span>
                    <span className="text-muted-foreground">[</span>
                    {nbrs.map((v, k) => (
                      <span key={k} className={cn("rounded px-1", u === step.cur && v === step.nb && "bg-viz-warn/20 font-bold text-viz-warn")}>
                        {v}
                        {k < nbrs.length - 1 ? "," : ""}
                      </span>
                    ))}
                    <span className="text-muted-foreground">]</span>
                  </div>
                ))}
                <div className="pt-1 text-[11px] text-muted-foreground">
                  {g.edges.length * 2} entries — O(V + E) space
                </div>
              </div>
            </TabsContent>
            <TabsContent value="matrix">
              <div className="overflow-x-auto rounded-lg border bg-background/50 p-2">
                <table className="mx-auto font-mono text-[12px]">
                  <tbody>
                    <tr>
                      <td />
                      {adj.map((_, j) => (
                        <td key={j} className="px-1.5 text-center text-muted-foreground">{j}</td>
                      ))}
                    </tr>
                    {adj.map((nbrs, i) => (
                      <tr key={i}>
                        <td className="pr-2 text-muted-foreground">{i}</td>
                        {adj.map((_, j) => {
                          const on = nbrs.includes(j);
                          const hot = i === step.cur && j === step.nb;
                          return (
                            <td key={j} className={cn("size-7 border text-center", on ? "font-bold text-foreground" : "text-muted-foreground/50", i === step.cur && !step.done && "bg-viz-active/10", hot && "bg-viz-warn/25 text-viz-warn")}>
                              {on ? 1 : 0}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pt-1 text-center text-[11px] text-muted-foreground">
                  {g.n * g.n} cells — O(V²) space, O(1) edge lookup
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <CodePanel code={algo === "bfs" ? BFS_CODE : DFS_CODE} active={step.line} maxHeight={260} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ---------- topo ---------- */

const TOPO = {
  chapter: {
    label: "Chapter DAG (5 courses)",
    n: 5,
    names: ["Intro", "DataStr", "Discrete", "Algos", "ML"],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
    back: [4, 1],
    pos: [[70, 150], [220, 70], [220, 230], [390, 150], [550, 150]],
  },
  larger: {
    label: "Degree plan (7 courses)",
    n: 7,
    names: ["Calc I", "Prog I", "Calc II", "Prog II", "LinAlg", "Algos", "ML"],
    edges: [[0, 2], [0, 4], [1, 3], [2, 6], [3, 5], [4, 6], [5, 6]],
    back: [6, 3],
    pos: [[60, 80], [60, 230], [220, 50], [220, 230], [330, 140], [400, 250], [560, 140]],
  },
};

const KAHN_CODE = `vector<int> topoSort(int n, vector<vector<int>>& adj) {
    vector<int> inDegree(n, 0);
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) inDegree[v]++;

    queue<int> q;
    for (int i = 0; i < n; i++)
        if (inDegree[i] == 0) q.push(i);

    vector<int> order;
    while (!q.empty()) {
        int curr = q.front(); q.pop();
        order.push_back(curr);
        for (int next : adj[curr]) {
            inDegree[next]--;             // one prereq done
            if (inDegree[next] == 0) q.push(next);
        }
    }
    if (order.size() == n) return order;  // valid DAG
    return {};                            // cycle detected!
}`;

function TopoView() {
  const [preset, setPreset] = useState("chapter");
  const [cycle, setCycle] = useState(false);
  const g = TOPO[preset];
  const edges = useMemo(() => (cycle ? [...g.edges, g.back] : g.edges), [g, cycle]);
  const steps = useMemo(() => kahnSteps(g.n, edges), [g, edges]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const nodes = g.pos.map(([x, y], k) => ({ id: k, label: k, x, y }));

  const nodeTone = {};
  step.order.forEach((k) => (nodeTone[k] = "ok"));
  step.queue.forEach((k) => (nodeTone[k] = "purple"));
  if (step.cur !== null && !step.done) nodeTone[step.cur] = "active";
  if (step.done && step.cycle) step.stuck.forEach((k) => (nodeTone[k] = "bad"));
  const edgeTone = {};
  for (const [u, v] of edges) if (step.order.includes(u)) edgeTone[dkey(u, v)] = "ok";
  if (step.edge) edgeTone[step.edge] = "active";
  if (cycle && step.done && step.cycle) {
    for (const [u, v] of edges) if (step.stuck.includes(u) && step.stuck.includes(v)) edgeTone[dkey(u, v)] = "bad";
  }
  const subs = Object.fromEntries(nodes.map((n) => [n.id, `${g.names[n.id]} · in=${step.indeg[n.id]}`]));
  const tags = {};
  if (step.nb !== null && step.nb !== undefined) tags[step.nb] = [`in ${step.indeg[step.nb] + 1}→${step.indeg[step.nb]}`, step.indeg[step.nb] === 0 ? "ok" : "warn"];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <PresetSelect value={preset} onChange={setPreset} options={TOPO} />
        <div className="w-64">
          <SwitchControl label={`Add back edge ${g.back[0]}→${g.back[1]}`} hint="creates a cycle — watch Kahn get stuck" checked={cycle} onChange={setCycle} id="topo-cycle" />
        </div>
      </div>
      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            <GraphSvg nodes={nodes} edges={edges} directed nodeTone={nodeTone} edgeTone={edgeTone} subs={subs} tags={tags} />
          </Stage>
          <Legend items={[[C.active, "Popped node / edge"], [C.purple, "In queue (in-degree 0)"], [C.ok, "Output"], [C.bad, "Stuck on a cycle"]]} />
          <Panel>
            <Chips label="queue" items={step.queue} tone="purple" hint="← front" highlightFirst />
            <Chips label="order" items={step.order.map((k) => `${k} ${g.names[k]}`)} tone="ok" empty="[]" />
          </Panel>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="min-w-0 space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">inDegree</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((n) => {
                const inOrder = step.order.includes(n.id), inQ = step.queue.includes(n.id);
                const stuck = step.done && step.cycle && step.stuck.includes(n.id);
                return (
                  <TableRow key={n.id} className={cn(n.id === step.nb && "bg-viz-warn/10", n.id === step.cur && !step.done && "bg-viz-active/10")}>
                    <TableCell className="py-1 font-mono text-[12.5px]">
                      {n.id} · {g.names[n.id]}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px] font-semibold tabular-nums">{step.indeg[n.id]}</TableCell>
                    <TableCell className="py-1 text-right">
                      {stuck ? <Badge variant="danger">cycle</Badge> : inOrder ? <Badge variant="success">done</Badge> : inQ ? <Badge variant="purple">queued</Badge> : <Badge variant="outline">waiting</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <CodePanel code={KAHN_CODE} active={step.line} maxHeight={250} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ---------- dijkstra ---------- */

const DIJ = {
  chapter: {
    label: "Chapter graph A–F",
    names: ["A", "B", "C", "D", "E", "F"],
    edges: [[0, 1, 4], [0, 3, 1], [1, 2, 2], [1, 4, 7], [2, 5, 3], [3, 4, 5], [4, 5, 1]],
    pos: [[90, 70], [310, 70], [530, 70], [90, 240], [310, 240], [530, 240]],
    src: 0,
  },
  delay: {
    label: "Network Delay Time (k = 2)",
    names: ["0", "1", "2", "3", "4"],
    edges: [[2, 1, 1], [2, 3, 1], [3, 4, 1]],
    pos: [[70, 260], [160, 150], [310, 150], [460, 150], [560, 260]],
    src: 2,
  },
  stale: {
    label: "Stale heap entries",
    names: ["A", "B", "C", "D", "E"],
    edges: [[0, 1, 6], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 7], [3, 4, 2], [1, 4, 6]],
    pos: [[70, 150], [270, 60], [270, 240], [440, 150], [570, 150]],
    src: 0,
  },
};

const DIJ_CODE = `vector<int> dijkstra(int n, vector<vector<pair<int,int>>>& adj, int src) {
    vector<int> dist(n, INT_MAX);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;        // stale entry

        for (auto& [v, w] : adj[u]) {
            int newDist = d + w;
            if (newDist < dist[v]) {      // relax
                dist[v] = newDist;
                pq.push({newDist, v});
            }
        }
    }
    return dist;
}`;

function DijkstraView() {
  const [preset, setPreset] = useState("chapter");
  const g = DIJ[preset];
  const n = g.names.length;
  const [srcSel, setSrc] = useState(null);
  const src = srcSel ?? g.src;
  const steps = useMemo(() => dijkstraSteps(n, g.edges, src, g.names), [g, n, src]);
  const st = useStepper(steps, { baseMs: 950 });
  const step = st.step;
  const nodes = g.pos.map(([x, y], k) => ({ id: k, label: g.names[k], x, y }));

  const nodeTone = {};
  step.settled.forEach((s, k) => s && (nodeTone[k] = "ok"));
  step.pq.forEach(([, u]) => !step.settled[u] && (nodeTone[u] = "purple"));
  if (step.cur !== null && !step.done) nodeTone[step.cur] = step.stale ? "bad" : "active";
  if (step.target !== undefined && !step.done) nodeTone[step.target] = step.tone === "ok" ? "ok" : "warn";
  const edgeTone = {};
  step.parent.forEach((p, v) => p >= 0 && (edgeTone[dkey(p, v)] = "ok"));
  if (step.edge && !step.done) edgeTone[step.edge] = step.tone === "ok" ? "active" : "warn";
  const subs = Object.fromEntries(nodes.map((nd) => [nd.id, `d=${fmt(step.dist[nd.id])}`]));
  const tags = {};
  if (step.cur !== null && !step.done) tags[step.cur] = [step.stale ? "stale" : "u", step.stale ? "bad" : "active"];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PresetSelect value={preset} onChange={(v) => { setPreset(v); setSrc(null); }} options={DIJ} />
        <Select value={String(src)} onValueChange={(v) => setSrc(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((nd) => (
              <SelectItem key={nd.id} value={String(nd.id)}>
                source = {nd.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            <GraphSvg nodes={nodes} edges={g.edges} directed weighted nodeTone={nodeTone} edgeTone={edgeTone} subs={subs} tags={tags} />
          </Stage>
          <Legend items={[[C.active, "Popped node / edge being relaxed"], [C.purple, "Waiting in heap"], [C.ok, "Settled · shortest-path tree"], [C.bad, "Stale entry"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          <StatGrid cols={3}>
            <Stat label="heap pops" value={step.pops ?? 0} />
            <Stat label="edge checks" value={step.relaxes ?? 0} />
            <Stat label="settled" value={`${step.settled.filter(Boolean).length}/${n}`} tone="ok" />
          </StatGrid>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Panel title="min-heap (top first)">
              {step.pq.length === 0 && <div className="font-mono text-[12px] italic text-muted-foreground">empty</div>}
              <div className="space-y-1">
                {step.pq.map(([d, u], k) => (
                  <div key={k} className={cn("flex justify-between rounded border px-2 py-0.5 font-mono text-[12.5px]", k === 0 ? "border-viz-active/50 bg-viz-active/10 text-viz-active" : "bg-card", d > step.dist[u] && "line-through opacity-60")}>
                    <span>({d}, {g.names[u]})</span>
                    {k === 0 && <span className="text-[10.5px]">top</span>}
                  </div>
                ))}
              </div>
            </Panel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>node</TableHead>
                  <TableHead className="text-right">dist</TableHead>
                  <TableHead className="text-right">parent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((nd) => (
                  <TableRow key={nd.id} className={cn(nd.id === step.target && !step.done && "bg-viz-ok/10")}>
                    <TableCell className="py-1 font-mono text-[12.5px]">{nd.label}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: step.settled[nd.id] ? C.ok : undefined }}>
                      {fmt(step.dist[nd.id])}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px] text-muted-foreground">{step.parent[nd.id] >= 0 ? g.names[step.parent[nd.id]] : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <CodePanel code={DIJ_CODE} active={step.line} maxHeight={250} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ---------- bellman-ford + floyd-warshall ---------- */

const BF = {
  names: ["A", "B", "C", "D"],
  edges: [[0, 1, 1], [0, 2, 4], [1, 2, -2], [1, 3, 6], [2, 3, 3]],
  negEdge: [3, 1, -5],
  pos: [[80, 150], [300, 60], [300, 240], [530, 150]],
};
const FW = {
  edges: [[0, 1, 3], [0, 2, 8], [1, 2, 2], [2, 3, 1], [3, 0, 4]],
  negEdge: [2, 0, -9],
  pos: [[90, 70], [520, 70], [520, 240], [90, 240]],
};

const BF_CODE = `vector<int> bellmanFord(int n, vector<vector<int>>& edges, int src) {
    vector<int> dist(n, 1e9);
    dist[src] = 0;
    for (int i = 0; i < n - 1; i++) {          // V-1 rounds
        for (auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != 1e9 && dist[u] + w < dist[v])
                dist[v] = dist[u] + w;
        }
    }
    for (auto& e : edges) {                     // V-th check
        int u = e[0], v = e[1], w = e[2];
        if (dist[u] != 1e9 && dist[u] + w < dist[v])
            return {};                          // negative cycle!
    }
    return dist;
}`;

const FW_CODE = `void floydWarshall(int n, vector<vector<int>>& d) {
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] != INF && d[k][j] != INF)
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
}`;

function BellmanView() {
  const [tab, setTab] = useState("bf");
  const [neg, setNeg] = useState(false);
  const bfEdges = useMemo(() => (neg ? [...BF.edges, BF.negEdge] : BF.edges), [neg]);
  const fwEdges = useMemo(() => (neg ? [...FW.edges, FW.negEdge] : FW.edges), [neg]);
  const steps = useMemo(() => (tab === "bf" ? bellmanSteps(4, bfEdges, 0, BF.names) : floydSteps(4, fwEdges)), [tab, bfEdges, fwEdges]);
  const st = useStepper(steps, { baseMs: tab === "bf" ? 700 : 1000 });
  const step = st.step;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab} className="max-w-full">
          <TabsList>
            <TabsTrigger value="bf">Bellman-Ford</TabsTrigger>
            <TabsTrigger value="fw">Floyd–Warshall</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-72">
          <SwitchControl
            label="Add a negative cycle"
            hint={tab === "bf" ? "adds D→B (−5): B→C→D→B = −4" : "adds 2→0 (−9): 0→1→2→0 = −4"}
            checked={neg}
            onChange={setNeg}
            id="neg-cycle"
          />
        </div>
      </div>
      {tab === "bf" ? <BellmanPanel step={step} edges={bfEdges} /> : <FloydPanel step={step} edges={fwEdges} />}
      <PlaybackBar stepper={st} />
    </>
  );
}

function BellmanPanel({ step, edges }) {
  const nodes = BF.pos.map(([x, y], k) => ({ id: k, label: BF.names[k], x, y }));
  const nodeTone = { 0: "purple" };
  if (step.target !== undefined && !step.done) nodeTone[step.target] = step.tone === "ok" ? "ok" : step.tone === "bad" ? "bad" : "warn";
  const edgeTone = {};
  if (!step.neg) step.parent.forEach((p, v) => p >= 0 && (edgeTone[dkey(p, v)] = "ok"));
  if (step.edge) edgeTone[step.edge] = step.tone === "bad" ? "bad" : "active";
  if (step.neg && step.done) {
    const [u, v] = BF.negEdge;
    edgeTone[dkey(u, v)] = "bad";
    edgeTone[dkey(1, 2)] = "bad";
    edgeTone[dkey(2, 3)] = "bad";
    [1, 2, 3].forEach((k) => (nodeTone[k] = "bad"));
  }
  const subs = Object.fromEntries(nodes.map((nd) => [nd.id, `d=${fmt(step.dist[nd.id])}`]));
  return (
    <Split>
      <div className="min-w-0 space-y-3">
        <Stage className="p-2">
          <GraphSvg nodes={nodes} edges={edges} directed weighted nodeTone={nodeTone} edgeTone={edgeTone} subs={subs} />
        </Stage>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={step.check ? "warning" : "active"}>{step.check ? "V-th check pass" : step.round ? `round ${step.round} / ${BF.names.length - 1}` : "init"}</Badge>
          <div className="flex flex-wrap gap-1">
            {edges.map(([u, v, w], k) => (
              <span key={k} className={cn("rounded border px-1.5 py-0.5 font-mono text-[11.5px]", k === step.ei ? (step.tone === "bad" ? "border-viz-bad bg-viz-bad/15 text-viz-bad" : "border-viz-active bg-viz-active/15 text-viz-active") : "bg-card text-muted-foreground")}>
                {BF.names[u]}→{BF.names[v]}({w})
              </span>
            ))}
          </div>
        </div>
        <Legend items={[[C.active, "Edge being relaxed"], [C.ok, "Parent pointers (best path)"], [C.bad, "Negative cycle"], [C.purple, "Source"]]} />
        <Narration tone={step.tone}>{step.note}</Narration>
      </div>
      <div className="min-w-0 space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>after round</TableHead>
              {BF.names.map((nm) => (
                <TableHead key={nm} className="text-right">
                  {nm}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {step.history.map((h) => (
              <TableRow key={h.round}>
                <TableCell className="py-1 font-mono text-[12.5px]">{h.round === 0 ? "init" : h.round}</TableCell>
                {h.dist.map((d, k) => (
                  <TableCell key={k} className="py-1 text-right font-mono text-[12.5px] tabular-nums">
                    {fmt(d)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="bg-viz-active/8">
              <TableCell className="py-1 font-mono text-[12.5px] font-semibold">live</TableCell>
              {step.dist.map((d, k) => (
                <TableCell key={k} className="py-1 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: k === step.target ? (step.tone === "ok" ? C.ok : step.tone === "bad" ? C.bad : undefined) : undefined }}>
                  {fmt(d)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
        <CodePanel code={BF_CODE} active={step.line} maxHeight={260} />
      </div>
    </Split>
  );
}

function FloydPanel({ step, edges }) {
  const nodes = FW.pos.map(([x, y], k) => ({ id: k, label: k, x, y }));
  const nodeTone = {};
  if (step.k >= 0 && !step.done) nodeTone[step.k] = "purple";
  const edgeTone = {};
  if (step.cell) {
    const [i, j] = step.cell;
    nodeTone[i] = "active";
    nodeTone[j] = "ok";
    nodeTone[step.k] = "purple";
  }
  if (step.done && step.neg) [0, 1, 2].forEach((k) => (nodeTone[k] = "bad"));
  const n = step.d.length;
  return (
    <Split>
      <div className="min-w-0 space-y-3">
        <Stage className="p-2">
          <GraphSvg nodes={nodes} edges={edges} directed weighted nodeTone={nodeTone} edgeTone={edgeTone} tags={step.k >= 0 && !step.done ? { [step.k]: ["k", "purple"] } : {}} />
        </Stage>
        <Legend items={[[C.purple, "Intermediate k (row/col k)"], [C.active, "Source i"], [C.ok, "Destination j / updated cell"], [C.bad, "Negative diagonal"]]} />
        <Narration tone={step.tone}>{step.note}</Narration>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="overflow-x-auto rounded-lg border bg-background/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">dist matrix</span>
            <Badge variant="purple">{step.k >= 0 ? `k = ${step.k}` : "initial"}</Badge>
          </div>
          <table className="mx-auto font-mono text-[13px]">
            <tbody>
              <tr>
                <td />
                {step.d.map((_, j) => (
                  <td key={j} className="px-2 text-center text-[11px] text-muted-foreground">
                    {j}
                  </td>
                ))}
              </tr>
              {step.d.map((row, i) => (
                <tr key={i}>
                  <td className="pr-2 text-[11px] text-muted-foreground">{i}</td>
                  {row.map((v, j) => {
                    const upd = step.cell && step.cell[0] === i && step.cell[1] === j;
                    const src = step.cell && ((i === step.cell[0] && j === step.k) || (i === step.k && j === step.cell[1]));
                    const kLine = step.k >= 0 && !step.done && (i === step.k || j === step.k);
                    const negDiag = step.done && i === j && v < 0;
                    return (
                      <td
                        key={j}
                        className={cn(
                          "h-9 w-12 border text-center font-semibold tabular-nums transition-colors",
                          kLine && "bg-viz-purple/10",
                          src && "bg-viz-active/20 text-viz-active",
                          upd && "bg-viz-ok/25 text-viz-ok",
                          negDiag && "bg-viz-bad/20 text-viz-bad",
                          v === INF && "font-normal text-muted-foreground"
                        )}
                      >
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <VarTable vars={[["k (via)", step.k >= 0 ? step.k : "—", "purple"], ["cell [i][j]", step.cell ? `[${step.cell[0]}][${step.cell[1]}]` : "—", "ok"], ["updates", step.updates ?? 0], ["work", `O(V³) = ${n ** 3} checks`]]} />
        <CodePanel code={FW_CODE} active={step.line} />
      </div>
    </Split>
  );
}

/* ---------- entry ---------- */

const META = {
  traversal: { title: "Graph Traversal — BFS vs DFS", desc: "Same graph, two strategies: BFS ripples outward level by level with a queue; DFS plunges deep with the call stack. The visited set keeps both out of infinite loops.", badges: ["O(V + E) time", "O(V) visited"] },
  topo: { title: "Topological Sort — Kahn's Algorithm", desc: "Take courses only once every prerequisite is done: repeatedly pop an in-degree-0 node and decrement its neighbors. Fewer than n outputs means a cycle.", badges: ["O(V + E)", "BFS / in-degree"] },
  dijkstra: { title: "Dijkstra's Algorithm — Min-Heap Relaxation", desc: "Always expand the closest unsettled node; relax its outgoing edges. Stale heap entries are skipped. Non-negative weights only.", badges: ["O(E log V)", "greedy + heap"] },
  "bellman-ford": { title: "Bellman-Ford & Floyd–Warshall", desc: "Bellman-Ford relaxes every edge V − 1 times (negative weights OK, detects negative cycles). Floyd–Warshall builds all-pairs distances by allowing one more intermediate node k at a time.", badges: ["O(V·E)", "O(V³)", "negative weights"] },
};

export default function GraphLab({ variant = "traversal" }) {
  const m = META[variant] ?? META.traversal;
  return (
    <LabShell title={m.title} description={m.desc} badges={m.badges}>
      {variant === "topo" ? <TopoView /> : variant === "dijkstra" ? <DijkstraView /> : variant === "bellman-ford" ? <BellmanView /> : <TraversalView />}
    </LabShell>
  );
}
