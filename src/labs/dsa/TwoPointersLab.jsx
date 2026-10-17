import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";

function PresetPicker({ presets, value, custom, onPick, onRandom, width = "w-60" }) {
  return (
    <>
      <Select value={custom ? "custom" : value} onValueChange={(v) => v !== "custom" && onPick(v)}>
        <SelectTrigger className={width}><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(presets).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
          {custom && <SelectItem value="custom">Random input</SelectItem>}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onRandom}><Shuffle /> Random</Button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Two Sum II (sorted)                                                 */
/* ------------------------------------------------------------------ */

const TWO = {
  standard: { label: "[2, 7, 11, 15], target 9 (chapter)", values: [2, 7, 11, 15], target: 9 },
  longer: { label: "[1, 2, 3, 4, 6, 8, 11], target 10", values: [1, 2, 3, 4, 6, 8, 11], target: 10 },
  none: { label: "[1, 2, 3], target 100 (no pair)", values: [1, 2, 3], target: 100 },
  dups: { label: "[1, 3, 3, 4, 5, 9], target 6", values: [1, 3, 3, 4, 5, 9], target: 6 },
};

const CODE_TWO = `vector<int> twoSumSorted(vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size() - 1;
    while (left < right) {
        int currentSum = nums[left] + nums[right];
        if (currentSum == target) {
            return {left, right};   // Found it!
        } else if (currentSum < target) {
            left++;                 // need a bigger sum
        } else {
            right--;                // need a smaller sum
        }
    }
    return {};
}`;

function twoSumSteps(a, target) {
  let l = 0, r = a.length - 1, comps = 0;
  const elim = []; // [type, index] — "row" = left index discarded, "col" = right index discarded
  const s = [{ l, r, line: [2, 3], comps, elim: [], note: `Sorted array: start at the extremes. left = 0, right = ${r}.`, tone: "default" }];
  while (l < r) {
    const sum = a[l] + a[r];
    comps++;
    if (sum === target) {
      s.push({ l, r, sum, line: [6, 7], comps, elim: [...elim], found: true, done: true, note: `${a[l]} + ${a[r]} = ${sum} == ${target} → return [${l}, ${r}]. Checked ${comps} pairs instead of up to ${(a.length * (a.length - 1)) / 2}.`, tone: "ok" });
      return s;
    }
    if (sum < target) {
      s.push({ l, r, sum, line: [8, 9], comps, elim: [...elim], move: "l", note: `${a[l]} + ${a[r]} = ${sum} < ${target}. nums[left] is too small even with the LARGEST partner → discard it: left++.`, tone: "active" });
      elim.push(["row", l]);
      l++;
    } else {
      s.push({ l, r, sum, line: [10, 11], comps, elim: [...elim], move: "r", note: `${a[l]} + ${a[r]} = ${sum} > ${target}. nums[right] is too big even with the SMALLEST partner → discard it: right--.`, tone: "warn" });
      elim.push(["col", r]);
      r--;
    }
  }
  s.push({ l, r, line: 14, comps, elim: [...elim], done: true, note: `left met right — no pair sums to ${target}. Still only ${comps} checks: O(N).`, tone: "bad" });
  return s;
}

/** Upper-triangle "pair matrix": every pointer move wipes out a whole row or column of candidate pairs. */
function PairMatrix({ a, step }) {
  const n = a.length;
  const cs = Math.min(40, 300 / n);
  const ox = 28, oy = 24;
  const W = ox + n * cs + 4, H = oy + n * cs + 4;
  const rowsOut = new Set(step.elim.filter((e) => e[0] === "row").map((e) => e[1]));
  const colsOut = new Set(step.elim.filter((e) => e[0] === "col").map((e) => e[1]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[340px] font-mono">
      {a.map((v, k) => (
        <g key={k}>
          <text x={ox + k * cs + cs / 2} y={oy - 6} textAnchor="middle" fontSize={10} fill={C.muted}>{v}</text>
          <text x={ox - 5} y={oy + k * cs + cs / 2 + 4} textAnchor="end" fontSize={10} fill={C.muted}>{v}</text>
        </g>
      ))}
      {a.map((_, i) =>
        a.map((__, j) => {
          if (j <= i) return null;
          const out = rowsOut.has(i) || colsOut.has(j);
          const cur = i === step.l && j === step.r;
          const fill = cur ? (step.found ? C.ok : C.active) : out ? C.bad : C.fill;
          return <rect key={`${i}-${j}`} x={ox + j * cs + 1.5} y={oy + i * cs + 1.5} width={cs - 3} height={cs - 3} rx={3} fill={fill} fillOpacity={cur ? 0.55 : out ? 0.22 : 1} stroke={cur ? fill : C.border} />;
        })
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 3Sum                                                                */
/* ------------------------------------------------------------------ */

const THREE = {
  standard: { label: "[-1, 0, 1, 2, -1, -4] (chapter)", values: [-1, 0, 1, 2, -1, -4] },
  zeros: { label: "[0, 0, 0, 0] (all zeros)", values: [0, 0, 0, 0] },
  many: { label: "[-2, 0, 1, 1, 2, -1, -4, 3]", values: [-2, 0, 1, 1, 2, -1, -4, 3] },
  none: { label: "[1, 2, -2, -1] (no triplet)", values: [1, 2, -2, -1] },
};

const CODE_THREE = `vector<vector<int>> threeSum(vector<int>& nums) {
    vector<vector<int>> result;
    sort(nums.begin(), nums.end());
    for (int i = 0; i < nums.size(); i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int left = i + 1, right = nums.size() - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                result.push_back({nums[i], nums[left], nums[right]});
                left++; right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
                while (left < right && nums[right] == nums[right + 1]) right--;
            }
            else if (sum < 0) left++;
            else right--;
        }
    }
    return result;
}`;

function threeSumSteps(input) {
  const a = [...input].sort((x, y) => x - y);
  const res = [];
  let comps = 0;
  const s = [{ a, i: null, res: [], comps, line: 3, note: `Sort first: [${a.join(", ")}]. Sorting enables the squeeze AND makes duplicates adjacent.`, tone: "default" }];
  for (let i = 0; i < a.length; i++) {
    if (i > 0 && a[i] === a[i - 1]) {
      s.push({ a, i, res: [...res], comps, line: 5, skipI: true, note: `nums[${i}] = ${a[i]} equals the previous fixed value → skip (would repeat triplets).`, tone: "warn" });
      continue;
    }
    let l = i + 1, r = a.length - 1;
    s.push({ a, i, l, r, res: [...res], comps, line: 6, note: `Fix i = ${i} (value ${a[i]}). Now two-sum the rest for −${a[i]} = ${-a[i]}.`, tone: "default" });
    while (l < r) {
      const sum = a[i] + a[l] + a[r];
      comps++;
      if (sum === 0) {
        res.push([a[i], a[l], a[r]]);
        s.push({ a, i, l, r, sum, res: [...res], comps, line: 10, hit: true, note: `${a[i]} + ${a[l]} + ${a[r]} = 0 → record [${a[i]}, ${a[l]}, ${a[r]}].`, tone: "ok" });
        l++;
        r--;
        let skipped = 0;
        while (l < r && a[l] === a[l - 1]) l++, skipped++;
        while (l < r && a[r] === a[r + 1]) r--, skipped++;
        s.push({ a, i, l, r, res: [...res], comps, line: [11, 12, 13], note: `Move both pointers inward${skipped ? ` and skip ${skipped} duplicate value${skipped > 1 ? "s" : ""}` : ""}: left = ${l}, right = ${r}.`, tone: skipped ? "warn" : "default" });
      } else if (sum < 0) {
        s.push({ a, i, l, r, sum, res: [...res], comps, line: 15, note: `sum = ${sum} < 0 → left++.`, tone: "active" });
        l++;
      } else {
        s.push({ a, i, l, r, sum, res: [...res], comps, line: 16, note: `sum = ${sum} > 0 → right--.`, tone: "active" });
        r--;
      }
    }
  }
  s.push({ a, i: null, res: [...res], comps, line: 19, done: true, note: `Done: ${res.length} unique triplet${res.length === 1 ? "" : "s"} after ${comps} sum checks — O(N²) instead of O(N³) = ${(a.length * (a.length - 1) * (a.length - 2)) / 6} triples.`, tone: "ok" });
  return s;
}

function PairSum() {
  const [tab, setTab] = useState("two");
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const [tOverride, setT] = useState(null);
  const presets = tab === "two" ? TWO : THREE;
  const cfg = custom ?? presets[preset] ?? presets.standard;
  const target = tOverride ?? cfg.target;
  const steps = useMemo(() => (tab === "two" ? twoSumSteps(cfg.values, target) : threeSumSteps(cfg.values)), [tab, cfg, target]);
  const st = useStepper(steps, { baseMs: 850 });
  const step = st.step;

  const randomize = () => {
    setT(null);
    if (tab === "two") {
      const vals = Array.from({ length: 7 }, () => Math.floor(Math.random() * 20) + 1).sort((x, y) => x - y);
      setCustom({ values: vals, target: vals[1] + vals[5] });
    } else setCustom({ values: Array.from({ length: 8 }, () => Math.floor(Math.random() * 9) - 4) });
  };

  const arr = tab === "two" ? cfg.values : step.a;
  const states = {};
  if (tab === "two") {
    step.elim.forEach(([t, k]) => (states[k] = "dim"));
    if (step.l < arr.length) states[step.l] = step.found ? "ok" : "active";
    if (step.r >= 0) states[step.r] = step.found ? "ok" : "active";
  } else if (step.i != null) {
    for (let k = 0; k < step.i; k++) states[k] = "dim";
    states[step.i] = step.skipI ? "warn" : "purple";
    if (step.l != null && step.l < step.r) {
      states[step.l] = step.hit ? "ok" : "active";
      states[step.r] = step.hit ? "ok" : "active";
    }
  }
  const pointers = [];
  if (tab === "two" && !(step.done && !step.found)) {
    pointers.push({ index: step.l, label: "left", tone: step.found ? "success" : "active" }, { index: step.r, label: "right", tone: step.found ? "success" : "active" });
  }
  if (tab === "three" && step.i != null) {
    pointers.push({ index: step.i, label: "i", tone: "purple" });
    if (step.l != null && step.l < step.r) pointers.push({ index: step.l, label: "L", tone: "active" }, { index: step.r, label: "R", tone: "active" });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => (setTab(v), setCustom(null), setT(null), setPreset("standard"))}>
          <TabsList>
            <TabsTrigger value="two">Two Sum II (sorted)</TabsTrigger>
            <TabsTrigger value="three">3Sum (fixed i + squeeze)</TabsTrigger>
          </TabsList>
        </Tabs>
        <PresetPicker presets={presets} value={preset} custom={custom} onPick={(v) => (setCustom(null), setT(null), setPreset(v))} onRandom={randomize} />
        {tab === "two" && (
          <div className="ml-auto w-44">
            <SliderControl label="target" value={target} min={-5} max={Math.max(40, ...cfg.values.map((v) => v * 2))} onChange={setT} />
          </div>
        )}
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ArrayView values={arr} states={states} pointers={pointers} label={tab === "two" ? "nums (sorted)" : "nums (after sort)"} />
          </Stage>
          {tab === "two" ? (
            <Stage className="p-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search space: all pairs (i &lt; j)</div>
              <PairMatrix a={arr} step={step} />
            </Stage>
          ) : (
            <Stage className="flex min-h-14 flex-wrap items-center gap-2 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">result</span>
              {step.res.length ? step.res.map((t, k) => <Badge key={k} variant="success" className="font-mono text-xs">[{t.join(", ")}]</Badge>) : <span className="text-xs text-muted-foreground">no triplets yet</span>}
            </Stage>
          )}
          <Legend
            items={
              tab === "two"
                ? [[C.active, "Current pair"], [C.bad, "Pairs ruled out"], [C.ok, "Answer"]]
                : [[C.purple, "Fixed i"], [C.active, "left / right"], [C.ok, "Triplet found"], [C.warn, "Duplicate skipped"]]
            }
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={tab === "two" ? CODE_TWO : CODE_THREE} active={step.line} maxHeight={300} />
          <VarTable
            vars={
              tab === "two"
                ? [["left", step.l, "active"], ["right", step.r, "active"], ["sum", step.sum ?? "—"], ["target", target, "warn"], ["checks", step.comps], ["brute force", (arr.length * (arr.length - 1)) / 2, "bad"]]
                : [["i", step.i ?? "—", "purple"], ["left", step.l ?? "—", "active"], ["right", step.r ?? "—", "active"], ["sum", step.sum ?? "—"], ["sum checks", step.comps], ["triplets", step.res.length, "ok"]]
            }
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Container With Most Water                                           */
/* ------------------------------------------------------------------ */

const WATER = {
  standard: { label: "[1, 8, 6, 2, 5, 4, 8, 3, 7] (chapter)", values: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
  two: { label: "[1, 2] (two lines)", values: [1, 2] },
  ends: { label: "[4, 3, 2, 1, 4] (tall ends)", values: [4, 3, 2, 1, 4] },
  valley: { label: "[2, 3, 10, 5, 7, 8, 9]", values: [2, 3, 10, 5, 7, 8, 9] },
};

const CODE_WATER = `int maxArea(vector<int>& height) {
    int max_water = 0;
    int left = 0;
    int right = height.size() - 1;
    while (left < right) {
        int width = right - left;
        int current_water = width * min(height[left], height[right]);
        max_water = max(max_water, current_water);
        // Greedy choice: always abandon the shorter line
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return max_water;
}`;

function waterSteps(h) {
  let l = 0, r = h.length - 1, best = 0, bl = -1, br = -1, iters = 0;
  const s = [{ l, r, best, bl, br, iters, line: [2, 3, 4], note: `Start with the widest container: left = 0, right = ${r}.`, tone: "default" }];
  while (l < r) {
    const w = r - l, area = w * Math.min(h[l], h[r]);
    iters++;
    const improved = area > best;
    if (improved) (best = area), (bl = l), (br = r);
    s.push({ l, r, area, w, best, bl, br, iters, line: [6, 7, 8], note: `width ${w} × min(${h[l]}, ${h[r]}) = ${area}.` + (improved ? ` New best!` : ` Best stays ${best}.`), tone: improved ? "ok" : "active" });
    const moveL = h[l] < h[r];
    s.push({ l, r, area, w, best, bl, br, iters, line: moveL ? [10, 11] : [12, 13], move: moveL ? "l" : "r", note: moveL ? `height[left] = ${h[l]} is shorter. Any container using it with a closer right wall is narrower AND no taller → it can never beat ${area}. Discard: left++.` : `height[right] = ${h[r]} is ${h[r] === h[l] ? "equal" : "shorter"}. It can't do better with a narrower partner → right--.`, tone: "warn" });
    if (moveL) l++;
    else r--;
  }
  s.push({ l, r, best, bl, br, iters, line: 16, done: true, note: `Max water = ${best} (lines ${bl} and ${br}), in ${iters} steps instead of ${(h.length * (h.length - 1)) / 2} pairs.`, tone: "ok" });
  return s;
}

function WaterBars({ h, step }) {
  const W = 580, H = 230, pad = 26, base = H - 26;
  const max = Math.max(...h, 1);
  const bw = (W - pad * 2) / h.length;
  const sy = (v) => base - (v / max) * (base - 20);
  const x = (k) => pad + k * bw + bw / 2;
  const showCur = !step.done && step.l < step.r;
  const level = showCur ? Math.min(h[step.l], h[step.r]) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <line x1={pad} x2={W - pad} y1={base} y2={base} stroke={C.muted} opacity={0.5} />
      {step.bl >= 0 && <rect x={x(step.bl)} y={sy(Math.min(h[step.bl], h[step.br]))} width={x(step.br) - x(step.bl)} height={base - sy(Math.min(h[step.bl], h[step.br]))} fill="none" stroke={C.ok} strokeWidth={2} strokeDasharray="6 4" />}
      {showCur && <rect x={x(step.l)} y={sy(level)} width={x(step.r) - x(step.l)} height={base - sy(level)} fill={C.active} opacity={0.18} className="transition-all duration-300" />}
      {h.map((v, k) => {
        const isPtr = showCur && (k === step.l || k === step.r);
        const discard = showCur && step.move && ((step.move === "l" && k === step.l) || (step.move === "r" && k === step.r));
        const outside = showCur && (k < step.l || k > step.r);
        const color = discard ? C.warn : isPtr ? C.active : step.done && (k === step.bl || k === step.br) ? C.ok : C.ink;
        return (
          <g key={k} opacity={outside ? 0.3 : 1}>
            <rect x={x(k) - 5} y={sy(v)} width={10} height={base - sy(v)} rx={2} fill={color} className="transition-all duration-200" />
            <text x={x(k)} y={sy(v) - 5} textAnchor="middle" fontSize={11} fill={C.fg}>{v}</text>
            <text x={x(k)} y={H - 8} textAnchor="middle" fontSize={10} fill={C.muted}>{k}</text>
          </g>
        );
      })}
      {showCur && step.area != null && (
        <text x={(x(step.l) + x(step.r)) / 2} y={(sy(level) + base) / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.active}>
          {step.w} × {level} = {step.area}
        </text>
      )}
    </svg>
  );
}

function Container() {
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const h = custom ?? WATER[preset].values;
  const steps = useMemo(() => waterSteps(h), [h]);
  const st = useStepper(steps, { baseMs: 850 });
  const step = st.step;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PresetPicker presets={WATER} value={preset} custom={custom} width="w-72" onPick={(v) => (setCustom(null), setPreset(v))} onRandom={() => setCustom(Array.from({ length: 8 + Math.floor(Math.random() * 4) }, () => 1 + Math.floor(Math.random() * 9)))} />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <WaterBars h={h} step={step} />
          </Stage>
          <Legend items={[[C.active, "left / right walls + water"], [C.warn, "Shorter wall → discarded"], [C.ok, "Best container so far"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_WATER} active={step.line} />
          <StatGrid cols={2}>
            <Stat label="Current area" value={step.area ?? "—"} tone="active" />
            <Stat label="max_water" value={step.best} tone="ok" />
          </StatGrid>
          <VarTable vars={[["left", step.l, "active"], ["right", step.r, "active"], ["width", step.done ? "—" : step.r - step.l], ["iterations", step.iters], ["brute-force pairs", (h.length * (h.length - 1)) / 2, "bad"]]} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function TwoPointersLab({ variant = "pair-sum" }) {
  const container = variant === "container";
  return (
    <LabShell
      title={container ? "Container With Most Water — Greedy Squeeze" : "Opposite-End Two Pointers — Squeezing a Sorted Array"}
      description={
        container
          ? "Area is limited by the shorter wall. Moving the shorter wall inward is the only move that can ever help — watch the best container emerge in one pass."
          : "Because the array is sorted, every comparison lets you throw away an entire row or column of candidate pairs. 3Sum reuses the same squeeze for each fixed i."
      }
      badges={container ? ["O(N) time", "O(1) space", "greedy"] : ["O(N) two-sum", "O(N²) 3Sum", "O(1) space"]}
    >
      {container ? <Container /> : <PairSum />}
    </LabShell>
  );
}
