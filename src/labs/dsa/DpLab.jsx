import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";

/* ---------- algorithm traces (pure) ---------- */

const INF = Infinity;
const show = (v) => (v === INF ? "∞" : v === null || v === undefined ? "" : String(v));

/** Problem definitions for the 1D lab: recursion (top-down) + table (bottom-up). */
function oneD(kind, p) {
  if (kind === "stairs")
    return {
      root: p.n,
      label: (a) => `f(${a})`,
      base: (a) => (a <= 1 ? 1 : undefined),
      kids: (a) => [a - 1, a - 2],
      combine: (a, v) => v[0] + v[1],
      explain: (a, v, r) => `f(${a}) = f(${a - 1}) + f(${a - 2}) = ${v[0]} + ${v[1]} = ${r}`,
      lines: { base: 2, hit: 3, call: 4, ret: 4 },
    };
  if (kind === "robber")
    return {
      root: p.nums.length - 1,
      label: (i) => `rob(${i})`,
      base: (i) => (i < 0 ? 0 : i === 0 ? p.nums[0] : undefined),
      baseLine: (i) => (i < 0 ? 2 : 3),
      kids: (i) => [i - 1, i - 2],
      combine: (i, v) => Math.max(v[0], v[1] + p.nums[i]),
      explain: (i, v, r) => `rob(${i}) = max(skip ${v[0]}, take ${v[1]} + ${p.nums[i]}) = ${r}`,
      lines: { base: 2, hit: 4, call: [5, 6], ret: [5, 6] },
    };
  return {
    root: p.amount,
    label: (a) => `f(${a})`,
    base: (a) => (a === 0 ? 0 : undefined),
    kids: (a) => p.coins.filter((c) => c <= a).map((c) => a - c),
    combine: (a, v) => (v.length ? Math.min(...v.map((x) => 1 + x)) : INF),
    explain: (a, v, r) => `f(${a}) = 1 + min(${v.map(show).join(", ")}) = ${show(r)}`,
    lines: { base: 2, hit: 3, call: [4, 5, 6], ret: 7 },
  };
}

function memoSteps(kind, p, useMemoOn, cap = 90) {
  const P = oneD(kind, p);
  const nodes = [], steps = [], status = {}, memo = {}, stack = [];
  let calls = 0, hits = 0, truncated = false;
  const snap = (o) => steps.push({ count: nodes.length, status: { ...status }, stack: [...stack], memo: { ...memo }, calls, hits, ...o });
  const call = (arg, parent) => {
    if (nodes.length >= cap) {
      truncated = true;
      return 0;
    }
    const id = nodes.length;
    nodes.push({ id, arg, parent, label: P.label(arg) });
    calls++;
    stack.push(id);
    const b = P.base(arg);
    if (b !== undefined) {
      status[id] = { s: "base", v: b };
      snap({ cur: id, line: P.baseLine ? P.baseLine(arg) : P.lines.base, note: `${P.label(arg)} is a base case → return ${b}.`, tone: "default" });
      stack.pop();
      return b;
    }
    if (useMemoOn && memo[arg] !== undefined) {
      hits++;
      status[id] = { s: "hit", v: memo[arg] };
      snap({ cur: id, line: P.lines.hit, note: `${P.label(arg)} is already in the memo → return ${show(memo[arg])} instantly. No subtree!`, tone: "warn" });
      stack.pop();
      return memo[arg];
    }
    status[id] = { s: "active" };
    snap({ cur: id, line: P.lines.call, note: `Call ${P.label(arg)} — not cached, so recurse into its subproblems.`, tone: "active" });
    const vals = P.kids(arg).map((k) => call(k, id));
    const r = P.combine(arg, vals);
    if (useMemoOn) memo[arg] = r;
    status[id] = { s: "done", v: r };
    snap({ cur: id, line: P.lines.ret, note: P.explain(arg, vals, r) + (useMemoOn ? ` → store memo[${arg}].` : "."), tone: "ok" });
    stack.pop();
    return r;
  };
  const ans = call(P.root, -1);
  snap({ done: true, line: [], note: truncated ? `Without memoization the tree explodes — stopped drawing after ${cap} calls.` : `Answer = ${show(ans)} after ${calls} calls` + (useMemoOn ? ` (${hits} cache hits). Each subproblem was solved once → O(N).` : `. Same subproblems are recomputed again and again → exponential.`), tone: truncated ? "bad" : "ok" });
  return { nodes, steps };
}

function tableSteps(kind, p) {
  const s = [];
  if (kind === "stairs") {
    const n = p.n, dp = Array(n + 1).fill(null);
    dp[0] = 1;
    dp[1] = 1;
    s.push({ dp: [...dp], i: null, deps: [], line: [2, 3], note: `Base cases: dp[0] = 1 (stand still), dp[1] = 1 (one single step).`, tone: "active" });
    for (let i = 2; i <= n; i++) {
      dp[i] = dp[i - 1] + dp[i - 2];
      s.push({ dp: [...dp], i, deps: [{ j: i - 1, use: true }, { j: i - 2, use: true }], line: [4, 5], note: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]} (arrive from 1 step or 2 steps below).`, tone: "ok" });
    }
    s.push({ dp: [...dp], i: n, deps: [], done: true, line: 6, note: `Answer dp[${n}] = ${dp[n]} distinct ways. One left-to-right pass: O(N) time.`, tone: "ok" });
    return s;
  }
  if (kind === "robber") {
    const a = p.nums, n = a.length, dp = Array(n).fill(null);
    dp[0] = a[0];
    s.push({ dp: [...dp], i: 0, deps: [], line: 4, note: `dp[0] = nums[0] = ${a[0]} — only one house.`, tone: "active" });
    dp[1] = Math.max(a[0], a[1]);
    s.push({ dp: [...dp], i: 1, deps: [{ j: 0, use: a[0] >= a[1] }], line: 5, note: `dp[1] = max(${a[0]}, ${a[1]}) = ${dp[1]} — pick the richer of the first two.`, tone: "active" });
    for (let i = 2; i < n; i++) {
      const skip = dp[i - 1], take = dp[i - 2] + a[i];
      dp[i] = Math.max(skip, take);
      s.push({ dp: [...dp], i, deps: [{ j: i - 1, use: skip >= take, tag: "skip" }, { j: i - 2, use: take > skip, tag: `+${a[i]}` }], line: [6, 7], note: `House ${i}: skip → dp[${i - 1}] = ${skip}; take → dp[${i - 2}] + ${a[i]} = ${take}. dp[${i}] = ${dp[i]} (${take > skip ? "take it" : "skip it"}).`, tone: "ok" });
    }
    s.push({ dp: [...dp], i: n - 1, deps: [], done: true, line: 8, note: `Max loot = dp[${n - 1}] = ${dp[n - 1]}.`, tone: "ok" });
    return s;
  }
  const { coins, amount } = p;
  const dp = Array(amount + 1).fill(null);
  dp[0] = 0;
  s.push({ dp: [...dp], i: 0, deps: [], line: [2, 3], note: `dp[0] = 0 coins for amount 0; everything else starts at "infinity".`, tone: "active" });
  for (let i = 1; i <= amount; i++) {
    const cands = coins.filter((c) => c <= i).map((c) => ({ j: i - c, c, v: dp[i - c] === INF ? INF : 1 + dp[i - c] }));
    const best = Math.min(INF, ...cands.map((x) => x.v));
    dp[i] = best;
    const bi = cands.findIndex((x) => x.v === best && best !== INF);
    s.push({
      dp: [...dp], i, line: [4, 5, 6, 7],
      deps: cands.map((x, k) => ({ j: x.j, use: k === bi, tag: `+${x.c}` })),
      note: cands.length ? `dp[${i}]: try each coin → ${cands.map((x) => `coin ${x.c}: 1 + dp[${x.j}] = ${show(x.v)}`).join("; ")}. Min = ${show(best)}.` : `dp[${i}]: no coin fits → ∞.`,
      tone: best === INF ? "bad" : "ok",
    });
  }
  s.push({ dp: [...dp], i: amount, deps: [], done: true, line: 8, note: dp[amount] === INF ? `dp[${amount}] is still ∞ → return −1 (amount unreachable).` : `Fewest coins for ${amount} = ${dp[amount]}.`, tone: dp[amount] === INF ? "bad" : "ok" });
  return s;
}

function gridSteps(kind, A, B, m, n) {
  const s = [];
  if (kind === "paths") {
    const dp = Array.from({ length: m }, () => Array(n).fill(null));
    for (let r = 0; r < m; r++) dp[r][0] = 1;
    for (let c = 0; c < n; c++) dp[0][c] = 1;
    s.push({ dp: dp.map((r) => [...r]), cell: null, deps: [], path: [], line: 2, note: `Base cases: the top row and left column are all 1 — there's only one straight path to each of those cells.`, tone: "active" });
    for (let r = 1; r < m; r++)
      for (let c = 1; c < n; c++) {
        dp[r][c] = dp[r - 1][c] + dp[r][c - 1];
        s.push({ dp: dp.map((x) => [...x]), cell: [r, c], deps: [{ at: [r - 1, c], use: true }, { at: [r, c - 1], use: true }], path: [], line: [3, 4, 5], note: `dp[${r}][${c}] = above ${dp[r - 1][c]} + left ${dp[r][c - 1]} = ${dp[r][c]}.`, tone: "ok" });
      }
    s.push({ dp: dp.map((x) => [...x]), cell: [m - 1, n - 1], deps: [], path: [], done: true, line: 6, note: `${dp[m - 1][n - 1]} unique paths in a ${m}×${n} grid (= C(${m + n - 2}, ${m - 1})).`, tone: "ok" });
    return s;
  }
  const M = A.length, N = B.length;
  const dp = Array.from({ length: M + 1 }, () => Array(N + 1).fill(null));
  const lcs = kind === "lcs";
  for (let i = 0; i <= M; i++) dp[i][0] = lcs ? 0 : i;
  for (let j = 0; j <= N; j++) dp[0][j] = lcs ? 0 : j;
  s.push({ dp: dp.map((r) => [...r]), cell: null, deps: [], path: [], line: lcs ? 3 : [4, 5], note: lcs ? `Row 0 and column 0 are the empty string: LCS with "" is 0.` : `Base cases: dp[i][0] = i (delete all i chars), dp[0][j] = j (insert all j chars).`, tone: "active" });
  for (let i = 1; i <= M; i++)
    for (let j = 1; j <= N; j++) {
      const a = A[i - 1], b = B[j - 1], match = a === b;
      let deps, note, line;
      if (lcs) {
        if (match) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          deps = [{ at: [i - 1, j - 1], use: true }];
          note = `'${a}' == '${b}' → diagonal + 1 = ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}.`;
          line = [6, 7];
        } else {
          const up = dp[i - 1][j], left = dp[i][j - 1];
          dp[i][j] = Math.max(up, left);
          deps = [{ at: [i - 1, j], use: up >= left }, { at: [i, j - 1], use: left > up }];
          note = `'${a}' ≠ '${b}' → max(above ${up}, left ${left}) = ${dp[i][j]}.`;
          line = [8, 9];
        }
      } else if (match) {
        dp[i][j] = dp[i - 1][j - 1];
        deps = [{ at: [i - 1, j - 1], use: true }];
        note = `'${a}' == '${b}' → no operation needed: copy the diagonal ${dp[i][j]}.`;
        line = 8;
      } else {
        const rep = dp[i - 1][j - 1], del = dp[i - 1][j], ins = dp[i][j - 1];
        const mn = Math.min(rep, del, ins);
        dp[i][j] = 1 + mn;
        const pick = rep === mn ? 0 : del === mn ? 1 : 2;
        deps = [{ at: [i - 1, j - 1], use: pick === 0, tag: "rep" }, { at: [i - 1, j], use: pick === 1, tag: "del" }, { at: [i, j - 1], use: pick === 2, tag: "ins" }];
        note = `'${a}' ≠ '${b}' → 1 + min(replace ${rep}, delete ${del}, insert ${ins}) = ${dp[i][j]}.`;
        line = [9, 10, 11];
      }
      s.push({ dp: dp.map((r) => [...r]), cell: [i, j], deps, path: [], line, note, tone: "ok", match });
    }
  // traceback
  const path = [[M, N]];
  const out = [];
  let i = M, j = N;
  const fin = dp.map((r) => [...r]);
  s.push({ dp: fin, cell: [M, N], deps: [], path: [...path], trace: true, line: lcs ? 10 : 12, note: lcs ? `Table done: LCS length = ${dp[M][N]}. Now trace back from the bottom-right corner to recover the subsequence.` : `Table done: edit distance = ${dp[M][N]}. Trace back to recover the operations.`, tone: "active", out: [] });
  while (lcs ? i > 0 && j > 0 : i > 0 || j > 0) {
    let note;
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      out.unshift(lcs ? A[i - 1] : `keep '${A[i - 1]}'`);
      note = `'${A[i - 1]}' matches → move diagonally` + (lcs ? `, add '${A[i - 1]}' to the LCS.` : " (keep it, cost 0).");
      i--;
      j--;
    } else if (lcs) {
      if (dp[i - 1][j] >= dp[i][j - 1]) {
        note = `No match → move to the larger neighbor: above (${dp[i - 1][j]}).`;
        i--;
      } else {
        note = `No match → move to the larger neighbor: left (${dp[i][j - 1]}).`;
        j--;
      }
    } else {
      const cur = dp[i][j];
      if (i > 0 && j > 0 && dp[i - 1][j - 1] === cur - 1) {
        out.unshift(`replace '${A[i - 1]}'→'${B[j - 1]}'`);
        note = `Diagonal is ${cur - 1} = ${cur} − 1 → replace '${A[i - 1]}' with '${B[j - 1]}'.`;
        i--;
        j--;
      } else if (i > 0 && dp[i - 1][j] === cur - 1) {
        out.unshift(`delete '${A[i - 1]}'`);
        note = `Above is ${cur - 1} → delete '${A[i - 1]}'.`;
        i--;
      } else {
        out.unshift(`insert '${B[j - 1]}'`);
        note = `Left is ${cur - 1} → insert '${B[j - 1]}'.`;
        j--;
      }
    }
    path.push([i, j]);
    s.push({ dp: fin, cell: [i, j], deps: [], path: [...path], trace: true, line: [], note, tone: "ok", out: [...out] });
  }
  s.push({ dp: fin, cell: null, deps: [], path: [...path], trace: true, done: true, line: lcs ? 10 : 12, out: [...out], note: lcs ? `LCS = "${out.join("")}" (length ${out.length}).` : `${dp[M][N]} operations: ${out.filter((o) => !o.startsWith("keep")).join(", ") || "none"}.`, tone: "ok" });
  return s;
}

/* ---------- rendering ---------- */

const CODE1D = {
  stairs: {
    memo: `int climb(int n, vector<int>& memo) {
    if (n <= 1) return 1;                  // base cases
    if (memo[n] != -1) return memo[n];     // cache hit
    return memo[n] = climb(n - 1, memo) + climb(n - 2, memo);
}`,
    table: `int climbStairs(int n) {
    vector<int> dp(n + 1);
    dp[0] = 1; dp[1] = 1;                  // base cases
    for (int i = 2; i <= n; i++)
        dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}`,
  },
  robber: {
    memo: `int rob(int i, vector<int>& nums, vector<int>& memo) {
    if (i < 0) return 0;                   // no houses left
    if (i == 0) return nums[0];
    if (memo[i] != -1) return memo[i];     // cache hit
    return memo[i] = max(rob(i - 1, nums, memo),             // skip
                         rob(i - 2, nums, memo) + nums[i]);  // take
}`,
    table: `int rob(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n);
    dp[0] = nums[0];
    dp[1] = max(nums[0], nums[1]);
    for (int i = 2; i < n; i++)
        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]);
    return dp[n - 1];
}`,
  },
  coins: {
    memo: `int solve(int a, vector<int>& coins, vector<int>& memo) {
    if (a == 0) return 0;                  // base case
    if (memo[a] != -1) return memo[a];     // cache hit
    int best = INF;
    for (int c : coins)
        if (c <= a) best = min(best, 1 + solve(a - c, coins, memo));
    return memo[a] = best;
}`,
    table: `int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);  // "infinity"
    dp[0] = 0;
    for (int i = 1; i <= amount; i++)
        for (int coin : coins)
            if (i - coin >= 0)
                dp[i] = min(dp[i], 1 + dp[i - coin]);
    return dp[amount] != amount + 1 ? dp[amount] : -1;
}`,
  },
};

const CODE2D = {
  paths: `int uniquePaths(int m, int n) {
    vector<vector<int>> dp(m, vector<int>(n, 1));  // row 0 & col 0 = 1
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r-1][c] + dp[r][c-1];     // above + left
    return dp[m-1][n-1];
}`,
  lcs: `int longestCommonSubsequence(string a, string b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (a[i-1] == b[j-1])
                dp[i][j] = dp[i-1][j-1] + 1;            // diagonal + 1
            else
                dp[i][j] = max(dp[i-1][j], dp[i][j-1]); // above or left
    return dp[m][n];
}`,
  edit: `int minDistance(string a, string b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1));
    for (int i = 0; i <= m; i++) dp[i][0] = i;   // delete all
    for (int j = 0; j <= n; j++) dp[0][j] = j;   // insert all
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (a[i-1] == b[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = 1 + min({dp[i-1][j-1],   // replace
                                     dp[i-1][j],     // delete
                                     dp[i][j-1]});   // insert
    return dp[m][n];
}`,
};

const PROBS1D = { stairs: "Climbing Stairs", robber: "House Robber", coins: "Coin Change" };
const COIN_SETS = { a: { label: "coins [1, 2, 5]", coins: [1, 2, 5] }, b: { label: "coins [1, 3, 4] (greedy fails)", coins: [1, 3, 4] } };

/** Tidy tree layout for the recursion tree. */
function layoutTree(nodes) {
  const kids = nodes.map(() => []);
  nodes.forEach((nd) => nd.parent >= 0 && kids[nd.parent].push(nd.id));
  const pos = [];
  let slot = 0, maxD = 0;
  const place = (u, d) => {
    maxD = Math.max(maxD, d);
    if (!kids[u].length) pos[u] = { x: slot++, d };
    else {
      kids[u].forEach((c) => place(c, d + 1));
      pos[u] = { x: (pos[kids[u][0]].x + pos[kids[u].at(-1)].x) / 2, d };
    }
  };
  if (nodes.length) place(0, 0);
  return { pos, slots: slot, maxD };
}

function RecursionTree({ nodes, step }) {
  const { pos, slots, maxD } = useMemo(() => layoutTree(nodes), [nodes]);
  const gx = 52, gy = 58;
  const W = Math.max(560, slots * gx + 30), H = maxD * gy + 70;
  const X = (i) => 15 + gx / 2 + pos[i].x * gx + (W - slots * gx - 30) / 2;
  const Y = (i) => 26 + pos[i].d * gy;
  const onStack = new Set(step.stack);
  const color = (st, id) => {
    if (id === step.cur && !step.done) return st?.s === "hit" ? C.warn : st?.s === "done" ? C.ok : C.active;
    if (!st) return C.muted;
    if (st.s === "hit") return C.warn;
    if (st.s === "base") return C.purple;
    if (st.s === "done") return C.ok;
    return onStack.has(id) ? C.active : C.muted;
  };
  return (
    <ScrollArea orientation="both" className="max-h-[360px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" style={{ minWidth: Math.min(W, 1400) * 0.72 }} role="img">
        {nodes.slice(0, step.count).map((nd) =>
          nd.parent >= 0 ? <line key={`e${nd.id}`} x1={X(nd.parent)} y1={Y(nd.parent) + 13} x2={X(nd.id)} y2={Y(nd.id) - 13} stroke={onStack.has(nd.id) ? C.active : C.grid} strokeWidth={onStack.has(nd.id) ? 2 : 1.3} /> : null
        )}
        {nodes.slice(0, step.count).map((nd) => {
          const st = step.status[nd.id];
          const col = color(st, nd.id);
          const cur = nd.id === step.cur && !step.done;
          return (
            <g key={nd.id}>
              <rect x={X(nd.id) - 23} y={Y(nd.id) - 13} width={46} height={26} rx={7} fill={col} fillOpacity={cur ? 0.3 : 0.14} stroke={col} strokeWidth={cur ? 2.5 : 1.3} />
              <text x={X(nd.id)} y={Y(nd.id) + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.fg}>
                {nd.label}
              </text>
              {st && st.v !== undefined && (
                <text x={X(nd.id)} y={Y(nd.id) + 26} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={col}>
                  {st.s === "hit" ? `memo ${show(st.v)}` : `=${show(st.v)}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ScrollArea>
  );
}

/** dp[] row with dependency arcs from dp[j] into dp[i]. */
function DpArray({ step, top, topLabel }) {
  const n = step.dp.length;
  const cw = Math.min(56, 560 / n), W = Math.max(n * cw + 40, 300), y0 = top ? 92 : 70, H = y0 + 64;
  const X = (k) => 20 + k * cw + cw / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img">
      {top && (
        <g>
          <text x={4} y={20} fontSize={10} fill={C.muted}>
            {topLabel}
          </text>
          {top.map((v, k) => (
            <text key={k} x={X(k)} y={36} textAnchor="middle" fontSize={12} fill={k === step.i && !step.done ? C.active : C.muted} fontWeight={k === step.i ? 700 : 400}>
              {v}
            </text>
          ))}
        </g>
      )}
      {step.deps.map((d, k) => {
        const x1 = X(d.j), x2 = X(step.i);
        const h = 16 + Math.abs(step.i - d.j) * 7;
        const col = d.use ? C.ok : C.purple;
        return (
          <g key={k}>
            <path d={`M${x1},${y0 - 2} Q${(x1 + x2) / 2},${y0 - 2 - h * 1.6} ${x2 - 4},${y0 - 4}`} fill="none" stroke={col} strokeWidth={d.use ? 2.4 : 1.5} strokeDasharray={d.use ? undefined : "4 3"} />
            <circle cx={x2 - 4} cy={y0 - 4} r={2.5} fill={col} />
            {d.tag && (
              <text x={(x1 + x2) / 2} y={y0 - 6 - h * 0.85} textAnchor="middle" fontSize={10} fill={col} fontWeight={600}>
                {d.tag}
              </text>
            )}
          </g>
        );
      })}
      {step.dp.map((v, k) => {
        const isCur = k === step.i && !step.done;
        const dep = step.deps.find((d) => d.j === k);
        const col = isCur ? C.active : dep ? (dep.use ? C.ok : C.purple) : step.done && k === step.i ? C.ok : null;
        return (
          <g key={k}>
            <rect x={X(k) - cw / 2 + 2} y={y0} width={cw - 4} height={34} rx={6} fill={col ?? C.card} fillOpacity={col ? 0.18 : 1} stroke={col ?? C.border} strokeWidth={col ? 2 : 1} className="transition-colors duration-200" />
            <text x={X(k)} y={y0 + 22} textAnchor="middle" fontSize={13} fontWeight={700} fill={v === null ? C.muted : C.fg}>
              {v === null ? "_" : show(v)}
            </text>
            <text x={X(k)} y={y0 + 50} textAnchor="middle" fontSize={10} fill={C.muted}>
              {k}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function OneD() {
  const [prob, setProb] = useState("stairs");
  const [mode, setMode] = useState("table");
  const [memoOn, setMemoOn] = useState(true);
  const [n, setN] = useState(5);
  const [nums, setNums] = useState([2, 7, 9, 3, 1]);
  const [coinSet, setCoinSet] = useState("a");
  const [amount, setAmount] = useState(5);
  // plain recursion (memo off) is exponential — keep the drawn tree small
  const plain = mode === "memo" && !memoOn;
  const maxStairs = plain ? 8 : 10, maxAmount = plain ? 7 : 11;
  const nEff = Math.min(n, maxStairs), amtEff = Math.min(amount, maxAmount);
  const params = useMemo(() => (prob === "stairs" ? { n: nEff } : prob === "robber" ? { nums } : { coins: COIN_SETS[coinSet].coins, amount: amtEff }), [prob, nEff, nums, coinSet, amtEff]);
  const tree = useMemo(() => (mode === "memo" ? memoSteps(prob, params, memoOn) : null), [mode, prob, params, memoOn]);
  const steps = useMemo(() => (tree ? tree.steps : tableSteps(prob, params)), [tree, prob, params]);
  const st = useStepper(steps, { baseMs: mode === "memo" ? 650 : 1000 });
  const step = st.step;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={prob} onValueChange={setProb}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROBS1D).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {prob === "coins" && (
          <Select value={coinSet} onValueChange={setCoinSet}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COIN_SETS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {prob === "robber" && (
          <>
            <span className="font-mono text-[12.5px]">nums = [{nums.join(", ")}]</span>
            <Button variant="outline" size="sm" onClick={() => setNums(Array.from({ length: 5 + Math.floor(Math.random() * 3) }, () => 1 + Math.floor(Math.random() * 9)))}>
              <Shuffle /> Random
            </Button>
          </>
        )}
        <Tabs value={mode} onValueChange={setMode} className="max-w-full ml-auto">
          <TabsList>
            <TabsTrigger value="memo">Top-down memo</TabsTrigger>
            <TabsTrigger value="table">Bottom-up table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            {tree ? (
              <RecursionTree nodes={tree.nodes} step={step} />
            ) : (
              <DpArray step={step} top={prob === "robber" ? nums : null} topLabel="nums[i]" />
            )}
          </Stage>
          <Legend
            items={
              tree
                ? [[C.active, "On the call stack"], [C.ok, "Returned"], [C.warn, "Cache hit"], [C.purple, "Base case"]]
                : [[C.active, "Cell being filled"], [C.ok, "Winning dependency"], [C.purple, "Other candidate"]]
            }
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="min-w-0 space-y-3">
          <Panel title="Input">
            {prob === "stairs" && <SliderControl label="n (stairs)" value={nEff} min={2} max={maxStairs} onChange={setN} />}
            {prob === "coins" && <SliderControl label="amount" value={amtEff} min={1} max={maxAmount} onChange={setAmount} />}
            {prob === "robber" && <div className="text-[12.5px] text-muted-foreground">Chapter example: [2, 7, 9, 3, 1] → 12. Use Random for new houses.</div>}
            {mode === "memo" && <SwitchControl label="Memoization" hint="off = plain recursion (exponential tree)" checked={memoOn} onChange={setMemoOn} id="dp-memo" />}
          </Panel>
          {tree && (
            <StatGrid cols={3}>
              <Stat label="calls" value={step.calls} tone="active" />
              <Stat label="cache hits" value={step.hits} tone="warn" />
              <Stat label="stack depth" value={step.stack.length} />
            </StatGrid>
          )}
          {tree && memoOn && (
            <div className="flex flex-wrap gap-1 font-mono text-[12px]">
              <span className="text-muted-foreground">memo:</span>
              {Object.keys(step.memo).length === 0 && <span className="italic text-muted-foreground">empty</span>}
              {Object.entries(step.memo)
                .sort((a, b) => a[0] - b[0])
                .map(([k, v]) => (
                  <span key={k} className="rounded border border-viz-warn/40 bg-viz-warn/10 px-1.5 text-viz-warn">
                    [{k}]={show(v)}
                  </span>
                ))}
            </div>
          )}
          <CodePanel code={CODE1D[prob][mode]} active={step.line} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

const STR_PRESETS = {
  lcs: [["abcde", "ace"], ["abc", "ace"], ["AGGTAB", "GXTXAYB"]],
  edit: [["horse", "ros"], ["kitten", "sitting"], ["intention", "execution"]],
};

function DpGrid({ step, kind, A, B }) {
  const rows = step.dp.length, cols = step.dp[0].length;
  const cs = Math.min(46, 520 / (cols + 1)), hdr = kind === "paths" ? 22 : 40;
  const W = hdr + cols * cs + 10, H = hdr + rows * cs + 10;
  const cx = (j) => hdr + j * cs + cs / 2, cy = (i) => hdr + i * cs + cs / 2;
  const pathSet = new Set(step.path.map(([i, j]) => `${i},${j}`));
  const colLabels = kind === "paths" ? null : ["∅", ...B.split("")];
  const rowLabels = kind === "paths" ? null : ["∅", ...A.split("")];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full font-mono" style={{ maxWidth: Math.max(W * 1.35, 320) }} role="img">
      <defs>
        <marker id="dp2-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.ok} />
        </marker>
        <marker id="dp2-pu" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
        </marker>
      </defs>
      {colLabels?.map((c, j) => (
        <text key={j} x={cx(j)} y={hdr - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill={step.cell && step.cell[1] === j && !step.trace ? C.active : C.muted}>
          {c}
        </text>
      ))}
      {rowLabels?.map((c, i) => (
        <text key={i} x={hdr - 16} y={cy(i) + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={step.cell && step.cell[0] === i && !step.trace ? C.active : C.muted}>
          {c}
        </text>
      ))}
      {step.dp.map((row, i) =>
        row.map((v, j) => {
          const isCur = step.cell && step.cell[0] === i && step.cell[1] === j;
          const dep = step.deps.find((d) => d.at[0] === i && d.at[1] === j);
          const onPath = pathSet.has(`${i},${j}`);
          const col = isCur ? (step.done ? C.ok : step.trace ? C.warn : C.active) : dep ? (dep.use ? C.ok : C.purple) : onPath ? C.ok : null;
          return (
            <g key={`${i}-${j}`}>
              <rect x={hdr + j * cs + 1} y={hdr + i * cs + 1} width={cs - 2} height={cs - 2} rx={4} fill={col ?? C.card} fillOpacity={col ? (onPath && !isCur ? 0.22 : 0.2) : 1} stroke={col ?? C.border} strokeWidth={col ? 2 : 1} className="transition-colors duration-200" />
              <text x={cx(j)} y={cy(i) + 4.5} textAnchor="middle" fontSize={Math.min(13, cs * 0.34)} fontWeight={600} fill={v === null ? C.muted : C.fg}>
                {v === null ? "" : v}
              </text>
            </g>
          );
        })
      )}
      {step.cell &&
        !step.trace &&
        step.deps.map((d, k) => {
          const [i, j] = d.at, [ci, cj] = step.cell;
          const x1 = cx(j), y1 = cy(i), x2 = cx(cj), y2 = cy(ci);
          const L = Math.hypot(x2 - x1, y2 - y1);
          const sh = cs * 0.32;
          return (
            <line key={k} x1={x1 + ((x2 - x1) / L) * sh} y1={y1 + ((y2 - y1) / L) * sh} x2={x2 - ((x2 - x1) / L) * sh} y2={y2 - ((y2 - y1) / L) * sh} stroke={d.use ? C.ok : C.purple} strokeWidth={2} markerEnd={`url(#${d.use ? "dp2-ok" : "dp2-pu"})`} />
          );
        })}
    </svg>
  );
}

function TwoD() {
  const [kind, setKind] = useState("paths");
  const [m, setM] = useState(3);
  const [n, setN] = useState(3);
  const [strs, setStrs] = useState({ lcs: STR_PRESETS.lcs[0], edit: STR_PRESETS.edit[0] });
  const [A, B] = kind === "paths" ? ["", ""] : strs[kind];
  const steps = useMemo(() => gridSteps(kind, A, B, m, n), [kind, A, B, m, n]);
  const st = useStepper(steps, { baseMs: kind === "paths" ? 900 : 650 });
  const step = st.step;
  const setStr = (idx, v) => setStrs((s) => ({ ...s, [kind]: idx === 0 ? [v, s[kind][1]] : [s[kind][0], v] }));
  const curVars = step.cell
    ? kind === "paths"
      ? [["r", step.cell[0], "active"], ["c", step.cell[1], "active"], ["dp[r][c]", step.dp[step.cell[0]][step.cell[1]] ?? "—", "ok"]]
      : [["i, j", `${step.cell[0]}, ${step.cell[1]}`, "active"], ["a[i-1], b[j-1]", step.cell[0] > 0 && step.cell[1] > 0 ? `'${A[step.cell[0] - 1]}', '${B[step.cell[1] - 1]}'` : "—"], ["dp[i][j]", step.dp[step.cell[0]][step.cell[1]] ?? "—", "ok"]]
    : [["cell", "—"]];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paths">Unique Paths (grid)</SelectItem>
            <SelectItem value="lcs">Longest Common Subsequence</SelectItem>
            <SelectItem value="edit">Edit Distance</SelectItem>
          </SelectContent>
        </Select>
        {kind !== "paths" && (
          <>
            <Select value={STR_PRESETS[kind].findIndex(([a, b]) => a === A && b === B).toString()} onValueChange={(v) => v !== "-1" && setStrs((s) => ({ ...s, [kind]: STR_PRESETS[kind][Number(v)] }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="custom" />
              </SelectTrigger>
              <SelectContent>
                {STR_PRESETS[kind].map(([a, b], k) => (
                  <SelectItem key={k} value={String(k)}>
                    "{a}" vs "{b}"
                  </SelectItem>
                ))}
                <SelectItem value="-1" disabled>
                  custom
                </SelectItem>
              </SelectContent>
            </Select>
            {[A, B].map((v, k) => (
              <input
                key={k}
                value={v}
                maxLength={9}
                aria-label={k === 0 ? "first string" : "second string"}
                onChange={(e) => setStr(k, e.target.value.replace(/\s/g, "").slice(0, 9))}
                className="h-8 w-28 rounded-md border border-input bg-card px-2 font-mono text-[13px]"
              />
            ))}
          </>
        )}
      </div>
      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-3">
            <DpGrid step={step} kind={kind} A={A} B={B} />
          </Stage>
          <Legend items={[[C.active, "dp[i][j] being filled"], [C.ok, "Chosen dependency / traceback path"], [C.purple, "Other dependency"], [C.warn, "Traceback cursor"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          {step.out && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">{kind === "lcs" ? "LCS:" : "ops:"}</span>
              {step.out.length === 0 && <span className="italic text-muted-foreground">…</span>}
              {step.out.map((o, k) => (
                <span key={k} className={`rounded border px-1.5 ${o.startsWith("keep") ? "text-muted-foreground" : "border-viz-ok/40 bg-viz-ok/10 text-viz-ok"}`}>
                  {o}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          {kind === "paths" && (
            <Panel title="Grid size">
              <SliderControl label="m (rows)" value={m} min={2} max={7} onChange={setM} />
              <SliderControl label="n (cols)" value={n} min={2} max={7} onChange={setN} />
            </Panel>
          )}
          <VarTable vars={curVars} />
          <CodePanel code={CODE2D[kind]} active={step.line} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function DpLab({ variant = "1d" }) {
  const two = variant === "2d";
  return (
    <LabShell
      title={two ? "2D Dynamic Programming — Table Filler" : "1D Dynamic Programming — Memo Tree vs Table"}
      description={
        two
          ? "Fill dp[i][j] cell by cell from the cells it depends on (above, left, diagonal), then walk back from the corner to recover the actual answer."
          : "The same recurrence two ways: top-down recursion with a memo cache (watch the cache hits prune the tree) and bottom-up tabulation filling dp[] left to right."
      }
      badges={two ? ["O(M·N) time", "O(M·N) space"] : ["O(N) time", "overlapping subproblems"]}
    >
      {two ? <TwoD /> : <OneD />}
    </LabShell>
  );
}
