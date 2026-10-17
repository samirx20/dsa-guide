import { useMemo, useState } from "react";
import { SkipForward } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { layoutTree } from "./_TreeLab-layout";

/* ------------------------------------------------------------------ */
/* Decision-tree tracer for subsets / combinations / permutations      */
/* ------------------------------------------------------------------ */

const CODE = {
  subsets: `void backtrack(vector<int>& nums, int index, vector<int>& current,
               vector<vector<int>>& result) {
    result.push_back(current);                  // save EVERY state

    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);             // CHOOSE
        backtrack(nums, i + 1, current, result); // EXPLORE
        current.pop_back();                     // UNCHOOSE
    }
}`,
  combinations: `void combine(vector<int>& nums, int k, int index,
             vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == k) {                  // base case: length K
        result.push_back(current);
        return;
    }
    for (int i = index; i < nums.size(); i++) {
        if (nums.size() - i < k - current.size()) break; // PRUNE
        current.push_back(nums[i]);             // CHOOSE
        combine(nums, k, i + 1, current, result); // EXPLORE
        current.pop_back();                     // UNCHOOSE
    }
}`,
  permutations: `void backtrack(vector<int>& nums, vector<bool>& used,
               vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {        // used all N
        result.push_back(current);
        return;
    }
    for (int i = 0; i < nums.size(); i++) {
        if (used[i]) continue;                  // skip used
        used[i] = true;                         // CHOOSE
        current.push_back(nums[i]);
        backtrack(nums, used, current, result); // EXPLORE
        current.pop_back();                     // UNCHOOSE
        used[i] = false;
    }
}`,
};
// line numbers per mode
const LN = {
  subsets: { record: 3, loop: 5, choose: 6, explore: 7, unchoose: 8, ret: 10 },
  combinations: { base: 3, record: [3, 4, 5], loop: 7, prune: 8, choose: 9, explore: 10, unchoose: 11, ret: 13 },
  permutations: { base: 3, record: [3, 4, 5], loop: 7, skip: 8, choose: [9, 10], explore: 11, unchoose: [12, 13], ret: 15 },
};

/** Pure: build the decision tree and one snapshot per choose / explore / unchoose. */
export function traceDecisions(mode, nums, { k = 2, prune = true } = {}) {
  const n = nums.length;
  const L = LN[mode];
  const nodes = [];
  const steps = [];
  const result = [];
  const path = [];
  const stack = [];
  const used = Array(n).fill(false);
  let calls = 0;
  const fmt = (a) => `[${a.join(",")}]`;
  const snap = (extra) => steps.push({ stack: [...stack], seen: nodes.length, path: [...path], used: [...used], results: result.length, calls, ...extra });

  const mk = (parent, extra = {}) => {
    const id = nodes.length;
    nodes.push({ id, parent, path: [...path], kids: [], ...extra });
    if (parent != null) nodes[parent].kids.push(id);
    return id;
  };

  const go = (index, parent, edge) => {
    const id = mk(parent, { edge });
    calls++;
    stack.push(id);
    if (mode === "subsets") {
      result.push([...path]);
      nodes[id].saved = true;
      snap({ cur: id, line: L.record, tone: "ok", note: `backtrack(index=${index}): record current = ${fmt(path)} → ${result.length} subset${result.length > 1 ? "s" : ""} so far.` });
    } else {
      const target = mode === "combinations" ? k : n;
      if (path.length === target) {
        result.push([...path]);
        nodes[id].saved = true;
        snap({ cur: id, line: L.record, tone: "ok", note: `current.size() == ${target} → save ${fmt(path)} and return.` });
        stack.pop();
        return;
      }
      snap({ cur: id, line: L.base, tone: "active", note: `current = ${fmt(path)} has size ${path.length} < ${target}: keep choosing.` });
    }
    const start = mode === "permutations" ? 0 : index;
    for (let i = start; i < n; i++) {
      if (mode === "permutations" && used[i]) {
        snap({ cur: id, i, line: L.skip, tone: "default", note: `i=${i}: nums[${i}]=${nums[i]} is already used → skip.` });
        continue;
      }
      if (mode === "combinations" && prune && n - i < k - path.length) {
        const cut = [];
        for (let j = i; j < n; j++) cut.push(mk(id, { edge: nums[j], pruned: true, path: [...path, nums[j]] }));
        snap({ cur: id, i, line: L.prune, tone: "bad", note: `Only ${n - i} element${n - i === 1 ? "" : "s"} left but ${k - path.length} still needed → break. ${cut.length} branch${cut.length > 1 ? "es" : ""} pruned.` });
        break;
      }
      if (mode === "permutations") used[i] = true;
      path.push(nums[i]);
      snap({ cur: id, i, choosing: nodes.length, line: L.choose, tone: "active", note: `CHOOSE nums[${i}] = ${nums[i]} → current = ${fmt(path)}${mode === "permutations" ? `, used[${i}] = true` : ""}. Explore deeper.` });
      go(i + 1, id, nums[i]);
      path.pop();
      if (mode === "permutations") used[i] = false;
      snap({ cur: id, i, line: L.unchoose, tone: "warn", note: `UNCHOOSE ${nums[i]} → current = ${fmt(path)}${mode === "permutations" ? `, used[${i}] = false` : ""}. Try the next option.` });
    }
    if (mode === "combinations" && !nodes[id].kids.length) nodes[id].dead = true;
    snap({ cur: id, line: L.ret, tone: nodes[id].dead ? "bad" : "default", note: nodes[id].dead ? `Dead end: ${fmt(path)} can never reach length ${k} — wasted call (pruning would have skipped it).` : `Loop finished for ${fmt(path)} → return to the caller.` });
    stack.pop();
  };
  go(0, null, null);
  snap({ cur: null, done: true, line: [], tone: "ok", note: `Done: ${result.length} result${result.length === 1 ? "" : "s"} from ${calls} recursive calls.` });
  return { nodes, steps, result };
}

function DecisionTree({ nodes, step }) {
  const { pos, leaves, depth } = useMemo(() => layoutTree(0, (id) => nodes[id].kids), [nodes]);
  const slot = 70, rowH = 62, pad = 28;
  const W = Math.max(380, leaves * slot + pad * 2);
  const H = (depth + 1) * rowH + pad;
  const X = (id) => pad + (pos.get(id).x + 0.5) * ((W - pad * 2) / leaves);
  const Y = (id) => pad + pos.get(id).y * rowH;
  const onStack = new Set(step.stack);
  const top = step.stack.at(-1);
  const nodeColor = (nd) => (nd.pruned ? C.bad : nd.dead ? C.bad : onStack.has(nd.id) ? C.active : nd.saved ? C.ok : C.muted);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Decision tree">
      {nodes.map((nd) => {
        if (nd.parent == null) return null;
        const seen = nd.id < step.seen;
        const live = onStack.has(nd.id) || step.choosing === nd.id;
        const color = nd.pruned ? C.bad : live ? C.active : seen ? C.ink : C.grid;
        const mx = (X(nd.parent) + X(nd.id)) / 2;
        const my = (Y(nd.parent) + Y(nd.id)) / 2;
        return (
          <g key={`e${nd.id}`} opacity={seen || step.choosing === nd.id ? 1 : 0.3}>
            <line x1={X(nd.parent)} y1={Y(nd.parent) + 13} x2={X(nd.id)} y2={Y(nd.id) - 13} stroke={color} strokeWidth={live ? 2.6 : 1.3} strokeDasharray={nd.pruned || !seen ? "4 3" : undefined} />
            <text x={mx + 5} y={my} fontSize={11.5} fill={nd.pruned ? C.bad : live ? C.active : C.muted} fontWeight={600}>
              +{nd.edge}
            </text>
          </g>
        );
      })}
      {nodes.map((nd) => {
        const seen = nd.id < step.seen;
        const color = nodeColor(nd);
        const isTop = nd.id === top;
        const label = nd.path.length ? nd.path.join(",") : "[ ]";
        const w = Math.max(34, label.length * 7.8 + 16);
        return (
          <g key={nd.id} opacity={seen ? 1 : 0.22} className="transition-opacity duration-300">
            <rect
              x={X(nd.id) - w / 2}
              y={Y(nd.id) - 13}
              width={w}
              height={26}
              rx={13}
              fill={seen ? color : C.card}
              fillOpacity={seen ? (isTop ? 0.32 : 0.13) : 1}
              stroke={color}
              strokeWidth={isTop ? 2.5 : 1.2}
              strokeDasharray={nd.pruned || !seen ? "3 3" : undefined}
            />
            <text x={X(nd.id)} y={Y(nd.id) + 4.5} textAnchor="middle" fontSize={13} fontWeight={600} fill={nd.pruned ? C.bad : C.fg} textDecoration={nd.pruned ? "line-through" : undefined}>
              {label}
            </text>
            {seen && nd.saved && (
              <text x={X(nd.id)} y={Y(nd.id) + 28} textAnchor="middle" fontSize={12} fill={C.ok} fontWeight={700}>
                ✓
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ResultList({ results, label = "result" }) {
  return (
    <Panel title={`${label} · ${results.length}`}>
      <ScrollArea style={{ maxHeight: 120 }} viewportClassName="max-h-[inherit]">
        <div className="flex flex-wrap gap-1">
          {results.length === 0 && <span className="text-xs text-muted-foreground">(empty)</span>}
          {results.map((r, k) => (
            <Badge key={k} variant={k === results.length - 1 ? "success" : "outline"} className="font-mono">
              [{r.join(",")}]
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </Panel>
  );
}

function DecisionLab({ mode, nums, k, prune }) {
  const { nodes, steps, result } = useMemo(() => traceDecisions(mode, nums, { k, prune }), [mode, nums, k, prune]);
  const st = useStepper(steps, { baseMs: 750 });
  const step = st.step;
  const states = {};
  if (mode === "permutations") step.used.forEach((u, j) => (states[j] = u ? "warn" : undefined));
  if (step.i != null && !step.done) states[step.i] = step.tone === "bad" ? "bad" : "active";
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <DecisionTree nodes={nodes} step={step} />
          </Stage>
          <Legend
            items={[
              [C.active, "Current path (on the call stack)"],
              [C.ok, "Saved to result"],
              ...(mode === "combinations" ? [[C.bad, "Pruned / dead-end branch"]] : []),
              [C.muted, "Not explored yet"],
            ]}
          />
          <Narration tone={step.tone}>{step.note}</Narration>
          <div className="flex flex-wrap gap-6">
            <ArrayView values={nums} states={states} label="nums" pointers={step.i != null && !step.done ? [{ index: step.i, label: "i", tone: "active" }] : []} />
            {mode === "permutations" && <ArrayView values={step.used.map((u) => (u ? "T" : "F"))} states={Object.fromEntries(step.used.map((u, j) => [j, u ? "warn" : "dim"]))} label="used[]" />}
          </div>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE[mode]} active={step.line} />
          <Panel title="current (the path)">
            <div className="flex min-h-9 flex-wrap items-center gap-1">
              {step.path.length === 0 && <span className="font-mono text-xs text-muted-foreground">[ ]</span>}
              {step.path.map((v, j) => (
                <span key={j} className={cn("rounded-md border px-2.5 py-1 font-mono text-sm font-semibold", j === step.path.length - 1 ? "border-viz-active bg-viz-active/15 text-viz-active" : "bg-card")}>
                  {v}
                </span>
              ))}
            </div>
          </Panel>
          <ResultList results={result.slice(0, step.results)} />
          <StatGrid cols={3}>
            <Stat label="Calls" value={step.calls} />
            <Stat label="Depth" value={step.stack.length} tone="active" />
            <Stat label="Results" value={`${step.results}/${result.length}`} tone="ok" />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function Subsets() {
  const [n, setN] = useState(3);
  const nums = useMemo(() => Array.from({ length: n }, (_, j) => j + 1), [n]);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SliderControl label="nums = [1..n]" value={n} min={2} max={4} onChange={setN} />
        <div className="text-[12.5px] text-muted-foreground sm:pt-1">
          Every node is a recursive call; the edge label is the element chosen. Subsets record <b>every</b> node → 2ⁿ = {2 ** n} results.
        </div>
      </div>
      <DecisionLab mode="subsets" nums={nums} />
    </>
  );
}

function PermsCombos() {
  const [tab, setTab] = useState("permutations");
  const [n, setN] = useState(3);
  const [k, setK] = useState(2);
  const [prune, setPrune] = useState(false);
  const nn = tab === "permutations" ? Math.min(n, 3) : n;
  const kk = Math.min(k, nn);
  const nums = useMemo(() => Array.from({ length: nn }, (_, j) => j + 1), [nn]);
  const fact = (x) => (x <= 1 ? 1 : x * fact(x - 1));
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="permutations">Permutations (used[])</TabsTrigger>
            <TabsTrigger value="combinations">Combinations C(n, k)</TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="outline" className="ml-auto font-mono">
          {tab === "permutations" ? `${nn}! = ${fact(nn)} permutations` : `C(${nn},${kk}) = ${fact(nn) / (fact(kk) * fact(nn - kk))} combinations`}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SliderControl label="n" value={nn} min={2} max={tab === "permutations" ? 3 : 5} onChange={setN} />
        {tab === "combinations" && <SliderControl label="k" value={kk} min={1} max={nn} onChange={setK} />}
        {tab === "combinations" && <SwitchControl label="Prune: break if too few left" checked={prune} onChange={setPrune} />}
      </div>
      <DecisionLab mode={tab} nums={nums} k={kk} prune={prune} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* N-Queens                                                            */
/* ------------------------------------------------------------------ */

const QUEENS_CODE = `void backtrack(vector<string>& board, int row,
               vector<vector<string>>& result) {
    if (row == board.size()) {          // all queens placed
        result.push_back(board);
        return;
    }
    for (int col = 0; col < board.size(); col++) {
        if (!isSafe(board, row, col)) continue;  // PRUNING

        board[row][col] = 'Q';           // CHOOSE
        backtrack(board, row + 1, result);  // EXPLORE next row
        board[row][col] = '.';           // UNCHOOSE
    }
}`;

/** Pure: N-Queens search, one snapshot per try / place / remove / dead end / solution. */
export function traceQueens(n, firstOnly = false) {
  const steps = [];
  const q = [];
  const sols = [];
  const rej = Array.from({ length: n }, () => []);
  let tries = 0, pruned = 0, placed = 0, backtracks = 0;
  const snap = (extra) => steps.push({ q: [...q], rej: rej.map((a) => [...a]), sols: sols.length, tries, pruned, placed, backtracks, ...extra });
  const attackers = (row, col) => q.map((c, r) => (c === col || Math.abs(c - col) === row - r ? r : -1)).filter((r) => r >= 0);

  const go = (row) => {
    if (row === n) {
      sols.push([...q]);
      snap({ row, line: [3, 4, 5], tone: "ok", solution: true, note: `row == ${n}: all queens placed → solution #${sols.length}: [${q.join(", ")}] (column per row).` });
      return firstOnly;
    }
    rej[row] = [];
    for (let col = 0; col < n; col++) {
      tries++;
      const att = attackers(row, col);
      if (att.length) {
        pruned++;
        rej[row].push(col);
        const r = att[0];
        const why = q[r] === col ? "same column" : "same diagonal";
        snap({ row, col, attack: att, line: 8, tone: "bad", note: `(${row},${col}) is attacked by the queen at (${r},${q[r]}) — ${why}. isSafe() fails → prune this whole branch.` });
        continue;
      }
      q.push(col);
      placed++;
      snap({ row, col, line: 10, tone: "active", note: `(${row},${col}) is safe → place a queen and recurse into row ${row + 1}.` });
      if (go(row + 1)) return true;
      q.pop();
      backtracks++;
      snap({ row, col, line: 12, tone: "warn", removed: true, note: `Back in row ${row}: remove the queen from (${row},${col}) (UNCHOOSE) and try the next column.` });
    }
    snap({ row, line: 14, tone: "bad", dead: true, note: row === 0 ? `Every column of row 0 has been tried — search complete.` : `Row ${row}: no columns left → dead end, return to row ${row - 1}.` });
    rej[row] = [];
    return false;
  };
  go(0);
  snap({ row: -1, done: true, line: [], tone: "ok", note: `Finished: ${sols.length} solution${sols.length === 1 ? "" : "s"}. Tried ${tries} squares, pruned ${pruned}; brute force would enumerate ${n}^${n} = ${(n ** n).toLocaleString()} boards.` });
  return { steps, sols };
}

/** Simple crown glyph drawn as a path (font glyphs ignore theme colours on some platforms). */
function Queen({ x, y, s, color, opacity = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={opacity}>
      <path d="M0.22,0.72 L0.16,0.34 L0.36,0.52 L0.5,0.26 L0.64,0.52 L0.84,0.34 L0.78,0.72 Z" fill={color} />
      <rect x={0.2} y={0.75} width={0.6} height={0.08} rx={0.02} fill={color} />
      {[0.16, 0.5, 0.84].map((cx) => (
        <circle key={cx} cx={cx} cy={cx === 0.5 ? 0.23 : 0.31} r={0.045} fill={color} />
      ))}
    </g>
  );
}

function Board({ n, step }) {
  const S = 400;
  const cs = S / n;
  const attacked = new Set();
  step.q.forEach((c, r) => {
    for (let rr = 0; rr < n; rr++)
      for (let cc = 0; cc < n; cc++) if (rr !== r && (cc === c || Math.abs(cc - c) === Math.abs(rr - r))) attacked.add(rr * n + cc);
  });
  const lastPlaced = step.q.length - 1;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[420px] font-mono" role="img" aria-label="N-Queens board">
      {Array.from({ length: n * n }, (_, k) => {
        const r = Math.floor(k / n);
        const c = k % n;
        return (
          <g key={k}>
            <rect x={c * cs} y={r * cs} width={cs} height={cs} fill={(r + c) % 2 ? C.fill : C.card} />
            {attacked.has(k) && <rect x={c * cs} y={r * cs} width={cs} height={cs} fill={C.bad} opacity={0.1} />}
          </g>
        );
      })}
      {/* rejected squares in the current row */}
      {step.rej.map((cols, r) =>
        cols.map((c) => (
          <text key={`x${r}-${c}`} x={(c + 0.5) * cs} y={(r + 0.5) * cs + cs * 0.14} textAnchor="middle" fontSize={cs * 0.4} fill={C.bad} opacity={0.75}>
            ×
          </text>
        ))
      )}
      {/* current try */}
      {step.col != null && !step.done && (
        <rect
          x={step.col * cs + 2}
          y={step.row * cs + 2}
          width={cs - 4}
          height={cs - 4}
          rx={4}
          fill="none"
          stroke={step.tone === "bad" ? C.bad : step.removed ? C.warn : C.active}
          strokeWidth={3}
        />
      )}
      {step.attack?.map((r) => (
        <line key={`a${r}`} x1={(step.q[r] + 0.5) * cs} y1={(r + 0.5) * cs} x2={(step.col + 0.5) * cs} y2={(step.row + 0.5) * cs} stroke={C.bad} strokeWidth={2.5} strokeDasharray="6 4" />
      ))}
      {step.q.map((c, r) => (
        <Queen key={`q${r}`} x={c * cs} y={r * cs} s={cs} color={step.solution || step.done ? C.ok : r === lastPlaced && step.tone === "active" ? C.active : C.fg} />
      ))}
      {step.removed && <Queen x={step.col * cs} y={step.row * cs} s={cs} color={C.warn} opacity={0.4} />}
      <rect x={0} y={0} width={S} height={S} fill="none" stroke={C.border} strokeWidth={2} />
    </svg>
  );
}

function NQueens() {
  const [n, setN] = useState(4);
  const [firstOnly, setFirstOnly] = useState(false);
  const { steps, sols } = useMemo(() => traceQueens(n, firstOnly), [n, firstOnly]);
  const st = useStepper(steps, { baseMs: 650 });
  const step = st.step;
  const jump = (pred) => {
    const j = steps.findIndex((s, k) => k > st.i && pred(s));
    st.setI(j < 0 ? steps.length - 1 : j);
  };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SliderControl label="Board size N" value={n} min={4} max={8} onChange={setN} />
        <SwitchControl label="Stop at first solution" hint="return true as soon as one board is found" checked={firstOnly} onChange={setFirstOnly} />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <Board n={n} step={step} />
          </Stage>
          <Legend
            items={[
              [C.active, "Trying / just placed"],
              [C.bad, "Attacked square · pruned try (×)"],
              [C.warn, "Backtracked (queen removed)"],
              [C.ok, "Solution"],
            ]}
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={QUEENS_CODE} active={step.line} />
          <StatGrid cols={2}>
            <Stat label="Solutions" value={`${step.sols}${step.done ? "" : ` / ${sols.length}`}`} tone="ok" />
            <Stat label="Squares tried" value={step.tries} tone="active" />
            <Stat label="Pruned (isSafe fails)" value={step.pruned} tone="bad" />
            <Stat label="Backtracks" value={step.backtracks} tone="warn" />
          </StatGrid>
          <VarTable
            vars={[
              ["row", step.row >= 0 && !step.done ? step.row : "—", "active"],
              ["col", step.col ?? "—"],
              ["queens (col per row)", `[${step.q.join(",")}]`],
            ]}
          />
          <ResultList results={sols.slice(0, step.sols)} label="solutions" />
        </div>
      </Split>
      <PlaybackBar
        stepper={st}
        extra={
          <>
            <Button variant="outline" size="xs" onClick={() => jump((s) => s.removed)}>
              <SkipForward /> Next backtrack
            </Button>
            <Button variant="outline" size="xs" onClick={() => jump((s) => s.solution)}>
              <SkipForward /> Next solution
            </Button>
          </>
        }
      />
    </>
  );
}

const META = {
  subsets: { title: "Backtracking Template — Subsets Decision Tree", description: "Choose → explore → unchoose. Watch the shared `current` path grow and shrink while every state is saved to the result.", badges: ["O(N · 2ᴺ)", "Choose / Explore / Unchoose"] },
  permutations: { title: "Permutations & Combinations — State-Space Trees", description: "Permutations loop from 0 and skip used[] elements; combinations pass i + 1 and stop at length k.", badges: ["used[] array", "index + 1", "Pruning"] },
  nqueens: { title: "N-Queens — Pruning the Search Tree", description: "Place one queen per row; isSafe() cuts every branch that already has two queens attacking each other.", badges: ["Pruning", "Backtracking", "O(N!)"] },
};

export default function BacktrackingLab({ variant = "subsets" }) {
  const m = META[variant] ?? META.subsets;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "nqueens" ? <NQueens /> : variant === "permutations" ? <PermsCombos /> : <Subsets />}
    </LabShell>
  );
}
