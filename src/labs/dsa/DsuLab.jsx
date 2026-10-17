import { useEffect, useMemo, useRef, useState } from "react";
import { GitMerge, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, Split, Stage, Stat, StatGrid, SwitchControl, useStepper } from "@/viz/kit";

/* ---------- algorithm traces (pure) ---------- */

function depthOf(parent, x) {
  let d = 0;
  while (parent[x] !== x) {
    x = parent[x];
    d++;
  }
  return d;
}

function dsuSteps(n, ops, { compress, rank }) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const rk = Array(n).fill(0);
  let hops = 0;
  const s = [];
  const comps = () => parent.filter((p, i) => p === i).length;
  const height = () => Math.max(0, ...parent.map((_, i) => depthOf(parent, i)));
  const snap = (o) => s.push({ parent: [...parent], rank: [...rk], comps: comps(), height: height(), hops, path: [], root: null, moved: [], sel: [], ...o });
  const U = 6; // first line of unite()

  snap({ line: [], note: `${n} elements, each its own set: parent[i] = i. Components = ${n}.`, tone: "active", op: "init" });

  const find = (x, op) => {
    const path = [x];
    while (parent[path.at(-1)] !== path.at(-1)) path.push(parent[path.at(-1)]);
    const root = path.at(-1);
    hops += path.length - 1;
    snap({ op, path, root, line: compress ? [2, 3] : 2, note: path.length === 1 ? `find(${x}): ${x} is its own parent → root ${x}.` : `find(${x}): walk ${path.join(" → ")} (${path.length - 1} hop${path.length > 2 ? "s" : ""}). Root = ${root}.`, tone: "active" });
    if (compress) {
      const moved = path.slice(0, -1).filter((v) => parent[v] !== root);
      if (moved.length) {
        moved.forEach((v) => (parent[v] = root));
        snap({ op, path, root, moved, line: 3, note: `Path compression: as the recursion unwinds, ${moved.map((v) => `parent[${v}]`).join(", ")} = ${root}. Next find on these is O(1).`, tone: "ok" });
      }
    }
    return root;
  };

  for (const op of ops) {
    if (op[0] === "find") {
      const label = `find(${op[1]})`;
      find(op[1], label);
      continue;
    }
    const [, a, b] = op;
    const label = `unite(${a}, ${b})`;
    const ra = find(a, label);
    const rb = find(b, label);
    if (ra === rb) {
      snap({ op: label, sel: [a, b], root: ra, line: U + 2, note: `find(${a}) = find(${b}) = ${ra}: already in the same set → return false. As a graph edge, ${a}–${b} would close a CYCLE.`, tone: "bad", cycle: true });
      continue;
    }
    let child, par, line, why;
    if (!rank) {
      child = ra;
      par = rb;
      line = U + 3;
      why = `No union by rank: blindly set parent[${ra}] = ${rb}. (Trees can grow into long chains.)`;
    } else if (rk[ra] < rk[rb]) {
      child = ra;
      par = rb;
      line = U + 3;
      why = `rank[${ra}] = ${rk[ra]} < rank[${rb}] = ${rk[rb]} → hang the shorter tree ${ra} under ${rb}. Rank unchanged.`;
    } else if (rk[ra] > rk[rb]) {
      child = rb;
      par = ra;
      line = U + 4;
      why = `rank[${ra}] = ${rk[ra]} > rank[${rb}] = ${rk[rb]} → hang ${rb} under ${ra}. Rank unchanged.`;
    } else {
      child = rb;
      par = ra;
      line = U + 5;
      why = `Equal ranks (${rk[ra]}) → hang ${rb} under ${ra} and rank[${ra}]++ → ${rk[ra] + 1}.`;
      rk[ra]++;
    }
    parent[child] = par;
    snap({ op: label, sel: [a, b], root: par, moved: [child], line, note: `${why} Components: ${comps()}.`, tone: "ok", linked: child });
  }
  snap({ op: "done", line: [], note: `Done. ${comps()} connected component${comps() > 1 ? "s" : ""}; tallest tree height ${height()}; ${hops} parent-pointer hops in total.`, tone: "ok", done: true });
  return s;
}

/** Tidy layout: leaves get consecutive slots, parents sit over the middle of their children. */
function layoutForest(parent) {
  const n = parent.length;
  const kids = Array.from({ length: n }, () => []);
  parent.forEach((p, i) => p !== i && kids[p].push(i));
  const pos = {};
  let slot = 0, maxD = 0;
  const place = (u, d) => {
    maxD = Math.max(maxD, d);
    if (!kids[u].length) pos[u] = { x: slot++, d };
    else {
      kids[u].forEach((c) => place(c, d + 1));
      pos[u] = { x: (pos[kids[u][0]].x + pos[kids[u].at(-1)].x) / 2, d };
    }
  };
  parent.forEach((p, i) => {
    if (p === i) {
      place(i, 0);
      slot += 0.4;
    }
  });
  return { pos, slots: slot - 0.4, maxD };
}

/* ---------- rendering ---------- */

const SCRIPTS = {
  chapter: { label: "Chapter trace (5 elements)", n: 5, ops: [["u", 0, 1], ["u", 2, 3], ["u", 0, 2], ["u", 4, 0], ["find", 3]] },
  chain: { label: "Chain worst case (8)", n: 8, ops: [["u", 0, 1], ["u", 1, 2], ["u", 2, 3], ["u", 3, 4], ["u", 4, 5], ["u", 5, 6], ["u", 6, 7], ["find", 0], ["find", 1]] },
  network: { label: "Network + cycle edge (10)", n: 10, ops: [["u", 0, 1], ["u", 2, 3], ["u", 4, 5], ["u", 6, 7], ["u", 1, 3], ["u", 5, 7], ["u", 8, 9], ["u", 3, 7], ["u", 0, 6], ["find", 4]] },
  redundant: { label: "Redundant Connection [[1,2],[1,3],[2,3]]", n: 4, ops: [["u", 1, 2], ["u", 1, 3], ["u", 2, 3]] },
};

function makeCode(compress, rank) {
  const find = compress
    ? `int find(int i) {
    if (parent[i] == i) return i;
    return parent[i] = find(parent[i]);   // path compression
}`
    : `int find(int i) {
    while (parent[i] != i) i = parent[i];  // walk up
    return i;
}`;
  const unite = rank
    ? `bool unite(int i, int j) {
    int rootI = find(i), rootJ = find(j);
    if (rootI == rootJ) return false;      // already connected
    if (rank[rootI] < rank[rootJ]) parent[rootI] = rootJ;
    else if (rank[rootI] > rank[rootJ]) parent[rootJ] = rootI;
    else { parent[rootJ] = rootI; rank[rootI]++; }
    return true;
}`
    : `bool unite(int i, int j) {
    int rootI = find(i), rootJ = find(j);
    if (rootI == rootJ) return false;      // already connected
    parent[rootI] = rootJ;                  // no balancing
    return true;
}`;
  return `${find}\n\n${unite}`;
}

function Forest({ step, rankOn, selected, onToggle }) {
  const { pos, slots, maxD } = layoutForest(step.parent);
  const W = 600;
  const gap = Math.min(70, (W - 60) / Math.max(slots, 1));
  const ox = (W - slots * gap) / 2;
  const dy = maxD > 4 ? 52 : 70;
  const H = Math.max(220, 70 + maxD * dy + 50);
  const P = (i) => ({ x: ox + pos[i].x * gap, y: 44 + pos[i].d * dy });
  const R = 18;
  const pathSet = new Set(step.path);
  const tone = (i) => {
    if (step.cycle && step.sel.includes(i)) return C.bad;
    if (step.moved.includes(i)) return step.linked === i ? C.ok : C.purple;
    if (i === step.root) return C.ok;
    if (pathSet.has(i)) return C.active;
    if (selected.includes(i)) return C.warn;
    return null;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img">
      <defs>
        <marker id="dsu-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
        <marker id="dsu-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
        </marker>
      </defs>
      {step.parent.map((p, i) => {
        if (p === i) return null;
        const a = P(i), b = P(p);
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
        const hot = step.moved.includes(i);
        const onPath = pathSet.has(i) && pathSet.has(p);
        return (
          <line
            key={i}
            x1={a.x + ux * R}
            y1={a.y + uy * R}
            x2={b.x - ux * (R + 2)}
            y2={b.y - uy * (R + 2)}
            stroke={hot ? C.purple : onPath ? C.active : C.muted}
            strokeWidth={hot || onPath ? 2.6 : 1.5}
            markerEnd={`url(#${hot ? "dsu-arrow-hot" : "dsu-arrow"})`}
          />
        );
      })}
      {step.parent.map((p, i) => {
        const { x, y } = P(i);
        const t = tone(i);
        const isSel = selected.includes(i);
        return (
          <g key={i} transform={`translate(${x}, ${y})`} className="cursor-pointer" onClick={() => onToggle(i)} role="button" aria-label={`Select element ${i}`}>
            {isSel && <circle r={R + 5} fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="4 3" />}
            <circle r={R} fill={t ?? C.card} fillOpacity={t ? 0.2 : 1} stroke={t ?? C.ink} strokeWidth={t ? 2.5 : 1.5} />
            <text y={4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.fg}>
              {i}
            </text>
            {p === i && (
              <text y={-R - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.ok}>
                root{rankOn ? ` r${step.rank[i]}` : ""}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function DsuLab() {
  const [script, setScript] = useState("chapter");
  const [compress, setCompress] = useState(true);
  const [rank, setRank] = useState(true);
  const [extra, setExtra] = useState([]);
  const [selected, setSelected] = useState([]);
  const jump = useRef(null);
  const sc = SCRIPTS[script];
  const ops = useMemo(() => [...sc.ops, ...extra], [sc, extra]);
  const steps = useMemo(() => dsuSteps(sc.n, ops, { compress, rank }), [sc, ops, compress, rank]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  const code = useMemo(() => makeCode(compress, rank), [compress, rank]);

  // after a manual op, jump to the newly appended steps instead of restarting
  const { setI } = st;
  useEffect(() => {
    if (jump.current !== null) {
      setI(Math.min(jump.current, steps.length - 1));
      jump.current = null;
    }
  }, [steps, setI]);

  const toggle = (i) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].slice(-2)));
  const addOp = (op) => {
    jump.current = steps.length - 1; // first step of the new op (old "done" step is replaced)
    setExtra((e) => [...e, op]);
    setSelected([]);
  };

  const parentStates = {};
  step.path.forEach((v) => (parentStates[v] = "active"));
  step.moved.forEach((v) => (parentStates[v] = step.linked === v ? "ok" : "purple"));
  if (step.cycle) step.sel.forEach((v) => (parentStates[v] = "bad"));

  return (
    <LabShell
      title="Union-Find (DSU) — Forest Visualizer"
      description="Each set is a tree; its root is the set's representative. find() walks parent pointers up to the root; unite() hangs one root under another. Toggle the two optimizations and watch the tree heights change."
      badges={["≈ O(α(N)) per op", "O(N) space"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={script}
          onValueChange={(v) => {
            setScript(v);
            setExtra([]);
            setSelected([]);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCRIPTS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {ops.map((op, k) => (
            <Badge key={k} variant={k >= sc.ops.length ? "warning" : "outline"} className="font-mono">
              {op[0] === "find" ? `find(${op[1]})` : `unite(${op[1]},${op[2]})`}
            </Badge>
          ))}
        </div>
      </div>

      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            <Forest step={step} rankOn={rank} selected={selected} onToggle={toggle} />
          </Stage>
          <Legend items={[[C.active, "find() path"], [C.ok, "Root / newly linked"], [C.purple, "Pointer rewritten"], [C.bad, "Same set (cycle edge)"], [C.warn, "Selected"]]} />
          <Narration tone={step.tone}>
            <span className="mr-2 font-mono text-[12px] font-semibold">{step.op}</span>
            {step.note}
          </Narration>
          <Panel title="Manual operation — click two nodes in the forest">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px]">
                selected: {selected.length ? selected.join(", ") : <span className="italic text-muted-foreground">none</span>}
              </span>
              <Button size="sm" disabled={selected.length !== 2} onClick={() => addOp(["u", selected[0], selected[1]])}>
                <GitMerge /> unite({selected[0] ?? "a"}, {selected[1] ?? "b"})
              </Button>
              <Button size="sm" variant="outline" disabled={selected.length < 1} onClick={() => addOp(["find", selected.at(-1)])}>
                <Search /> find({selected.at(-1) ?? "x"})
              </Button>
              {extra.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setExtra([])}>
                  <X /> Clear manual ops
                </Button>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground">Manual operations are appended after the script (orange badges) and the stepper jumps to the first new step.</p>
          </Panel>
        </div>
        <div className="min-w-0 space-y-3">
          <Panel title="Optimizations">
            <SwitchControl label="Path compression" hint="find() repoints every node on the path at the root" checked={compress} onChange={setCompress} id="dsu-compress" />
            <SwitchControl label="Union by rank" hint="hang the shorter tree under the taller one" checked={rank} onChange={setRank} id="dsu-rank" />
          </Panel>
          <div className="space-y-2 rounded-lg border bg-background/50 p-3">
            <ArrayView label="parent[]" values={step.parent} states={parentStates} cellWidth={38} />
            <ArrayView label={rank ? "rank[]" : "rank[] (unused)"} values={step.rank} states={rank && step.root !== null ? { [step.root]: "ok" } : {}} cellWidth={38} />
          </div>
          <StatGrid cols={3}>
            <Stat label="components" value={step.comps} tone="ok" />
            <Stat label="max height" value={step.height} tone={step.height > 3 ? "bad" : undefined} hint="Longest find() path. Rank keeps it O(log N); compression flattens it further." />
            <Stat label="total hops" value={step.hops} hint="Parent pointers followed by all find() calls so far." />
          </StatGrid>
          <CodePanel code={code} active={step.line} maxHeight={300} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
