import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Fixed-size window                                                   */
/* ------------------------------------------------------------------ */

const FIXED = {
  standard: { label: "[1, 12, -5, -6, 50, 3], K = 4 (chapter)", values: [1, 12, -5, -6, 50, 3], k: 4 },
  small: { label: "[1, 2, 3, 4, 5], K = 3", values: [1, 2, 3, 4, 5], k: 3 },
  full: { label: "[1, 2, 3], K = 3 (K = N)", values: [1, 2, 3], k: 3 },
  one: { label: "[5, -1, 3], K = 1", values: [5, -1, 3], k: 1 },
  long: { label: "[2, 1, 5, 1, 3, 2, 9, -4, 6, 1]", values: [2, 1, 5, 1, 3, 2, 9, -4, 6, 1], k: 3 },
};

const CODE_FIXED = `double findMaxAverage(vector<int>& nums, int k) {
    int currentSum = 0;
    for (int i = 0; i < k; i++) {      // 1. build first window
        currentSum += nums[i];
    }
    int maxSum = currentSum;
    for (int i = k; i < nums.size(); i++) {  // 2. slide
        // add the element entering, subtract the one leaving
        currentSum += nums[i] - nums[i - k];
        maxSum = max(maxSum, currentSum);
    }
    return (double)maxSum / k;
}`;

function fixedSteps(a, k) {
  const s = [];
  let sum = 0, ops = 0;
  for (let i = 0; i < k; i++) {
    sum += a[i];
    ops++;
    s.push({ lo: 0, hi: i, sum, best: null, enter: i, line: 4, ops, note: `Build the first window: currentSum += nums[${i}] (${a[i]}) → ${sum}.`, tone: "active" });
  }
  let best = sum, bl = 0;
  s.push({ lo: 0, hi: k - 1, sum, best, bl, line: 6, ops, note: `First window [0..${k - 1}] sums to ${sum}. maxSum = ${sum}.`, tone: "ok" });
  for (let i = k; i < a.length; i++) {
    const out = a[i - k];
    sum += a[i] - out;
    ops += 2;
    const improved = sum > best;
    if (improved) (best = sum), (bl = i - k + 1);
    s.push({ lo: i - k + 1, hi: i, sum, best, bl, enter: i, leave: i - k, line: [9, 10], ops, note: `Slide: + nums[${i}] (${a[i]}) − nums[${i - k}] (${out}) → ${sum}.` + (improved ? ` New max!` : ` max stays ${best}.`), tone: improved ? "ok" : "active" });
  }
  s.push({ lo: bl, hi: bl + k - 1, sum, best, bl, line: 12, ops, done: true, note: `Best window [${bl}..${bl + k - 1}] with sum ${best} (average ${(best / k).toFixed(2)}). ${ops} additions vs ${(a.length - k + 1) * k} for brute force.`, tone: "ok" });
  return s;
}

function WindowBars({ a, step }) {
  const W = 580, H = 180, pad = 22;
  const max = Math.max(...a.map(Math.abs), 1);
  const bw = (W - pad * 2) / a.length;
  const zero = Math.min(...a) < 0 ? H * 0.62 : H - 24;
  const scale = (zero - 22) / max;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <rect x={pad + step.lo * bw + 2} y={6} width={(step.hi - step.lo + 1) * bw - 4} height={H - 12} rx={8} fill={step.done ? C.ok : C.active} opacity={0.1} stroke={step.done ? C.ok : C.active} strokeWidth={1.5} className="transition-all duration-300" />
      <line x1={pad} x2={W - pad} y1={zero} y2={zero} stroke={C.muted} opacity={0.5} />
      {a.map((v, k) => {
        const h = Math.abs(v) * scale;
        const y = v >= 0 ? zero - h : zero;
        const color = k === step.enter ? C.ok : k === step.leave ? C.bad : k >= step.lo && k <= step.hi ? C.active : C.ink;
        return (
          <g key={k}>
            <rect x={pad + k * bw + bw * 0.2} y={y} width={bw * 0.6} height={Math.max(h, 1)} rx={3} fill={color} opacity={k >= step.lo && k <= step.hi || k === step.leave ? 0.9 : 0.4} className="transition-all duration-200" />
            <text x={pad + k * bw + bw / 2} y={v >= 0 ? y - 4 : y + h + 12} textAnchor="middle" fontSize={11} fill={C.fg}>{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

function FixedMode() {
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const cfg = custom ?? FIXED[preset];
  const a = cfg.values;
  const [kOverride, setK] = useState(null);
  const k = Math.min(kOverride ?? cfg.k, a.length);
  const steps = useMemo(() => fixedSteps(a, k), [a, k]);
  const st = useStepper(steps, { baseMs: 800 });
  const step = st.step;
  const states = {};
  for (let x = step.lo; x <= step.hi; x++) states[x] = step.done ? "ok" : "active";
  if (step.enter != null && !step.done) states[step.enter] = "ok";
  if (step.leave != null && !step.done) states[step.leave] = "bad";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setK(null), setPreset(v))}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FIXED).map(([key, p]) => <SelectItem key={key} value={key}>{p.label}</SelectItem>)}
            {custom && <SelectItem value="custom">Random input</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => (setK(null), setCustom({ values: Array.from({ length: 10 }, () => Math.floor(Math.random() * 21) - 6), k: 3 }))}>
          <Shuffle /> Random
        </Button>
        <div className="ml-auto w-44">
          <SliderControl label="window size K" value={k} min={1} max={a.length} onChange={setK} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <WindowBars a={a} step={step} />
          </Stage>
          <ArrayView values={a} states={states} range={[step.lo, step.hi]} pointers={step.done ? [] : [{ index: step.lo, label: "left", tone: "active" }, { index: step.hi, label: "right", tone: "active" }]} />
          <Legend items={[[C.active, "Window"], [C.ok, "Entering"], [C.bad, "Leaving"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_FIXED} active={step.line} />
          <StatGrid cols={2}>
            <Stat label="currentSum" value={step.sum} tone="active" />
            <Stat label="maxSum" value={step.best ?? "—"} tone="ok" />
            <Stat label="Sliding ops" value={step.ops} hint="each slide = 1 add + 1 subtract" />
            <Stat label="Brute-force ops" value={(a.length - k + 1) * k} tone="bad" hint="re-sum K elements for every window" />
          </StatGrid>
          <VarTable vars={[["window", `[${step.lo}..${step.hi}]`, "active"], ["K", k], ["windows", a.length - k + 1]]} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variable-size window                                                */
/* ------------------------------------------------------------------ */

const LONGEST = {
  standard: { label: '"abcabcbb" (chapter)', s: "abcabcbb" },
  same: { label: '"bbbbb" (all same)', s: "bbbbb" },
  pw: { label: '"pwwkew"', s: "pwwkew" },
  long: { label: '"dvdfabcdbe"', s: "dvdfabcdbe" },
};
const MINWIN = {
  standard: { label: 's="ADOBECODEBANC", t="ABC"', s: "ADOBECODEBANC", t: "ABC" },
  dup: { label: 's="aa", t="aa" (duplicates)', s: "aa", t: "aa" },
  none: { label: 's="a", t="b" (impossible)', s: "a", t: "b" },
  mid: { label: 's="cabwefgewcwaefgcf", t="cae"', s: "cabwefgewcwaefgcf", t: "cae" },
};

const CODE_LONGEST = `int lengthOfLongestSubstring(string s) {
    unordered_set<char> window;
    int left = 0, maxLen = 0;
    for (int right = 0; right < s.length(); right++) {
        // While the window is INVALID (duplicate exists)
        while (window.count(s[right])) {
            window.erase(s[left]);
            left++;
        }
        window.insert(s[right]);   // expand
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}`;

const CODE_MINWIN = `string minWindow(string s, string t) {
    unordered_map<char, int> targetCounts;
    for (char c : t) targetCounts[c]++;
    int required = targetCounts.size(), matched = 0;
    unordered_map<char, int> windowCounts;
    int left = 0, minLen = INT_MAX, minStart = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s[right];
        windowCounts[c]++;
        if (targetCounts.count(c) && windowCounts[c] == targetCounts[c]) matched++;
        while (matched == required) {
            if (right - left + 1 < minLen) { minLen = right - left + 1; minStart = left; }
            char deletedChar = s[left];
            windowCounts[deletedChar]--;
            if (targetCounts.count(deletedChar) &&
                windowCounts[deletedChar] < targetCounts[deletedChar]) matched--;
            left++;
        }
    }
    return minLen == INT_MAX ? "" : s.substr(minStart, minLen);
}`;

const countsOf = (str, lo, hi) => {
  const m = {};
  for (let x = lo; x <= hi; x++) m[str[x]] = (m[str[x]] || 0) + 1;
  return m;
};

function longestSteps(s) {
  const steps = [];
  const win = new Set();
  let left = 0, best = 0, bl = 0, ops = 0;
  if (!s.length) return [{ left: 0, right: -1, best: 0, bl: 0, counts: {}, line: 13, done: true, note: "Empty string → 0.", tone: "ok", ops: 0 }];
  for (let right = 0; right < s.length; right++) {
    steps.push({ left, right: right - 1, peek: right, best, bl, counts: countsOf(s, left, right - 1), line: 6, ops, note: `Try to add s[${right}] = '${s[right]}'.` + (win.has(s[right]) ? ` It's already in the window → invalid!` : ` Not in the window.`), tone: win.has(s[right]) ? "bad" : "active" });
    while (win.has(s[right])) {
      win.delete(s[left]);
      ops++;
      steps.push({ left: left + 1, right: right - 1, peek: right, evict: left, best, bl, counts: countsOf(s, left + 1, right - 1), line: [7, 8], ops, note: `Shrink: erase s[${left}] = '${s[left]}', left → ${left + 1}.`, tone: "bad" });
      left++;
    }
    win.add(s[right]);
    ops++;
    const len = right - left + 1;
    const improved = len > best;
    if (improved) (best = len), (bl = left);
    steps.push({ left, right, best, bl, enter: right, counts: countsOf(s, left, right), line: [10, 11], ops, note: `Insert '${s[right]}'. Window "${s.slice(left, right + 1)}" (length ${len}) is valid.` + (improved ? ` New longest!` : ``), tone: improved ? "ok" : "active" });
  }
  steps.push({ left: bl, right: bl + best - 1, best, bl, counts: countsOf(s, bl, bl + best - 1), line: 13, done: true, ops, note: `Longest substring without repeats: "${s.slice(bl, bl + best)}" (length ${best}). Each char entered and left at most once → ${ops} set ops, O(N).`, tone: "ok" });
  return steps;
}

function minWindowSteps(s, t) {
  const steps = [];
  const need = countsOf(t, 0, t.length - 1);
  if (!s.length || !t.length) return [{ need, counts: {}, matched: 0, required: 0, minLen: Infinity, minStart: 0, left: 0, right: -1, line: 20, done: true, note: `Empty s or t → return "".`, tone: "bad" }];
  const required = Object.keys(need).length;
  const win = {};
  let matched = 0, left = 0, minLen = Infinity, minStart = 0;
  const snap = (o) => steps.push({ need, counts: { ...win }, matched, required, minLen, minStart, ...o });
  snap({ left: 0, right: -1, line: [2, 3, 4], note: `Need ${Object.entries(need).map(([c, n]) => `${c}×${n}`).join(", ")} → required = ${required} distinct chars.`, tone: "default" });
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    win[c] = (win[c] || 0) + 1;
    const hit = need[c] && win[c] === need[c];
    if (hit) matched++;
    snap({ left, right, enter: right, line: [8, 9, 10], note: `Expand: add '${c}' (count ${win[c]}).` + (hit ? ` '${c}' now fully satisfied → matched = ${matched}/${required}.` : need[c] ? ` Still need more/already had enough.` : ` Not needed by t.`), tone: hit ? "ok" : "active" });
    while (matched === required) {
      let rec = false;
      if (right - left + 1 < minLen) (minLen = right - left + 1), (minStart = left), (rec = true);
      snap({ left, right, line: 12, valid: true, note: `Window "${s.slice(left, right + 1)}" contains all of t.` + (rec ? ` Record new minimum length ${minLen}.` : ` Not shorter than ${minLen}.`), tone: "ok" });
      const d = s[left];
      win[d]--;
      const broke = need[d] && win[d] < need[d];
      if (broke) matched--;
      snap({ left: left + 1, right, evict: left, line: broke ? [13, 14, 15, 16, 17] : [13, 14, 17], note: `Shrink: drop '${d}' from the left.` + (broke ? ` That broke '${d}' → matched = ${matched}. Resume expanding.` : ` Still valid — keep shrinking.`), tone: broke ? "bad" : "warn" });
      left++;
    }
  }
  const found = minLen !== Infinity;
  snap({ left: found ? minStart : 0, right: found ? minStart + minLen - 1 : -1, line: 20, done: true, note: found ? `Minimum window: "${s.substr(minStart, minLen)}" (length ${minLen}). O(N + M).` : `No window contains all of t → return "".`, tone: found ? "ok" : "bad" });
  return steps;
}

function StringCells({ s, step }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-1">
          {s.split("").map((ch, k) => {
            const inWin = k >= step.left && k <= step.right;
            const tone = k === step.evict ? "bad" : k === step.peek ? (step.tone === "bad" ? "bad" : "active") : k === step.enter ? "ok" : inWin ? (step.done || step.valid ? "ok" : "active") : null;
            return (
              <div
                key={k}
                className={cn(
                  "flex h-10 w-8 items-center justify-center rounded-md border bg-card font-mono text-sm font-semibold transition-all duration-200",
                  tone === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
                  tone === "ok" && "border-viz-ok bg-viz-ok/15 text-viz-ok",
                  tone === "bad" && "border-viz-bad bg-viz-bad/12 text-viz-bad",
                  !tone && "opacity-45"
                )}
              >
                {ch}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {s.split("").map((_, k) => (
            <div key={k} className="w-8 text-center font-mono text-[10px] text-muted-foreground">
              {k === step.left && k === step.right ? "L R" : k === step.left ? "L" : k === step.right ? "R" : k}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VariableMode() {
  const [tab, setTab] = useState("longest");
  const [preset, setPreset] = useState("standard");
  const [text, setText] = useState(null); // custom {s, t}
  const presets = tab === "longest" ? LONGEST : MINWIN;
  const cfg = text ?? presets[preset] ?? presets.standard;
  const s = cfg.s, t = cfg.t ?? "";
  const steps = useMemo(() => (tab === "longest" ? longestSteps(s) : minWindowSteps(s, t)), [tab, s, t]);
  const st = useStepper(steps, { baseMs: 750 });
  const step = st.step;
  const chars = tab === "longest" ? [...new Set(s.split(""))] : [...new Set((t + s).split(""))].filter((c) => step.need[c] || step.counts[c]);
  const setField = (field, v) => setText({ s, t, [field]: v.replace(/\s/g, "").slice(0, field === "s" ? 20 : 6) });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => (setTab(v), setText(null), setPreset("standard"))}>
          <TabsList>
            <TabsTrigger value="longest">Longest w/o repeats</TabsTrigger>
            <TabsTrigger value="minwin">Minimum window substring</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={text ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setText(null), setPreset(v))}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(presets).map(([key, p]) => <SelectItem key={key} value={key}>{p.label}</SelectItem>)}
            {text && <SelectItem value="custom">Custom input</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
        <label className="flex items-center gap-2">
          s
          <input value={s} onChange={(e) => setField("s", e.target.value)} className="h-8 w-52 rounded-md border border-input bg-card px-2 font-mono text-[13px] text-foreground" />
        </label>
        {tab === "minwin" && (
          <label className="flex items-center gap-2">
            t
            <input value={t} onChange={(e) => setField("t", e.target.value)} className="h-8 w-24 rounded-md border border-input bg-card px-2 font-mono text-[13px] text-foreground" />
          </label>
        )}
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <StringCells s={s} step={step} />
          </Stage>
          <Legend items={[[C.active, "Window"], [C.ok, "Entering / valid"], [C.bad, "Duplicate / leaving"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          <StatGrid cols={3}>
            <Stat label="Window" value={step.right >= step.left ? `"${s.slice(step.left, step.right + 1)}"` : '""'} tone="active" />
            {tab === "longest" ? <Stat label="maxLen" value={step.best} tone="ok" /> : <Stat label="matched" value={`${step.matched}/${step.required}`} tone={step.matched === step.required ? "ok" : "warn"} />}
            {tab === "longest" ? <Stat label="Set ops" value={step.ops} hint="each char inserted once, erased at most once" /> : <Stat label="best" value={step.minLen === Infinity ? "—" : `"${s.substr(step.minStart, step.minLen)}"`} tone="ok" />}
          </StatGrid>
        </div>
        <div className="space-y-3">
          <CodePanel code={tab === "longest" ? CODE_LONGEST : CODE_MINWIN} active={step.line} maxHeight={280} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>char</TableHead>
                <TableHead className="text-right">in window</TableHead>
                {tab === "minwin" && <TableHead className="text-right">need</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chars.map((c) => {
                const have = step.counts[c] || 0;
                const need = step.need?.[c] || 0;
                const dup = tab === "longest" && have > 1;
                const ok = tab === "minwin" && need && have >= need;
                return (
                  <TableRow key={c} className={cn(dup && "bg-viz-bad/10", ok && "bg-viz-ok/10")}>
                    <TableCell className="py-1 font-mono text-[12.5px]">'{c}'</TableCell>
                    <TableCell className={cn("py-1 text-right font-mono text-[12.5px] font-semibold", have ? "text-foreground" : "text-muted-foreground")}>{have}</TableCell>
                    {tab === "minwin" && <TableCell className={cn("py-1 text-right font-mono text-[12.5px]", ok ? "text-viz-ok" : need ? "text-viz-warn" : "text-muted-foreground")}>{need || "—"}</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <VarTable vars={[["left", step.left, "active"], ["right", step.right < 0 ? "—" : step.right, "active"]]} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function SlidingWindowLab({ variant = "fixed" }) {
  const variable = variant === "variable";
  return (
    <LabShell
      title={variable ? "Variable Sliding Window — Expand Right, Shrink Left" : "Fixed Sliding Window — Add One, Drop One"}
      description={
        variable
          ? "The right pointer always expands; the left pointer shrinks only while the window breaks the rule. A frequency map tracks what's inside."
          : "Instead of re-summing every window of size K, add the element entering on the right and subtract the one leaving on the left."
      }
      badges={variable ? ["O(N) time", "O(Σ) space", "expand / shrink"] : ["O(N) time", "O(1) space"]}
    >
      {variable ? <VariableMode /> : <FixedMode />}
    </LabShell>
  );
}
