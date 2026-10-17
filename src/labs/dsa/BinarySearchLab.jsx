import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";

const mid = (l, r) => l + Math.floor((r - l) / 2);

function PresetSelect({ presets, value, onPick, width = "w-64" }) {
  return (
    <Select value={value} onValueChange={onPick}>
      <SelectTrigger className={width}><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(presets).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Classic + lower/upper bound                                         */
/* ------------------------------------------------------------------ */

const CLASSIC = {
  standard: { label: "[1, 3, 5, 7, 9, 11, 13], target 9", values: [1, 3, 5, 7, 9, 11, 13], target: 9 },
  missing: { label: "[1, 3, 5, 7, 9], target 6 (missing)", values: [1, 3, 5, 7, 9], target: 6 },
  dups: { label: "[10, 20, 20, 20, 30, 40], target 20", values: [10, 20, 20, 20, 30, 40], target: 20 },
  range: { label: "[2, 5, 5, 5, 5, 9], target 5", values: [2, 5, 5, 5, 5, 9], target: 5 },
  big: { label: "1..16 (×3), target 31", values: Array.from({ length: 16 }, (_, k) => 3 * k + 1), target: 31 },
};

const CODE_CLASSIC = {
  exact: `int binarySearch(vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size() - 1;      // inclusive [left, right]
    while (left <= right) {
        int mid = left + (right - left) / 2;   // no overflow
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;           // discard left half + mid
        } else {
            right = mid - 1;          // discard right half + mid
        }
    }
    return -1;
}`,
  lower: `// first index i with nums[i] >= target  (std::lower_bound)
int lowerBound(vector<int>& nums, int target) {
    int left = 0, right = nums.size();   // half-open [left, right)
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] < target) left = mid + 1;
        else right = mid;                 // mid could be the answer
    }
    return left;
}`,
  upper: `// first index i with nums[i] > target  (std::upper_bound)
int upperBound(vector<int>& nums, int target) {
    int left = 0, right = nums.size();   // half-open [left, right)
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] <= target) left = mid + 1;
        else right = mid;                 // mid could be the answer
    }
    return left;
}`,
};

function classicSteps(a, t) {
  let l = 0, r = a.length - 1, it = 0;
  const s = [{ l, r, line: [2, 3], it, note: `Search space is the whole array [0..${r}].`, tone: "default" }];
  while (l <= r) {
    const m = mid(l, r);
    it++;
    s.push({ l, r, m, line: 5, it, note: `mid = ${l} + (${r} − ${l}) / 2 = ${m}. nums[mid] = ${a[m]}.`, tone: "active" });
    if (a[m] === t) {
      s.push({ l, r, m, line: [6, 7], it, found: m, done: true, note: `nums[${m}] == ${t} → found at index ${m} after ${it} probe${it > 1 ? "s" : ""} (linear scan would need ${m + 1}).`, tone: "ok" });
      return s;
    }
    if (a[m] < t) {
      s.push({ l: m + 1, r, m, line: [8, 9], it, cut: [l, m], note: `${a[m]} < ${t} → target must be right of mid. Discard [${l}..${m}]: left = ${m + 1}.`, tone: "warn" });
      l = m + 1;
    } else {
      s.push({ l, r: m - 1, m, line: [10, 11], it, cut: [m, r], note: `${a[m]} > ${t} → target must be left of mid. Discard [${m}..${r}]: right = ${m - 1}.`, tone: "warn" });
      r = m - 1;
    }
  }
  s.push({ l, r, line: 14, it, done: true, note: `left (${l}) > right (${r}) → empty search space. ${t} is not present; return −1. (Insert position would be ${l}.)`, tone: "bad" });
  return s;
}

function boundSteps(a, t, upper) {
  let l = 0, r = a.length, it = 0;
  const op = upper ? "<=" : "<";
  const s = [{ l, r, line: 3, it, note: `Half-open window [0, ${r}): right = N is a legal answer ("all elements ${upper ? "≤" : "<"} target").`, tone: "default" }];
  while (l < r) {
    const m = mid(l, r);
    it++;
    const goRight = upper ? a[m] <= t : a[m] < t;
    s.push({ l, r, m, line: 5, it, note: `mid = ${m}, nums[mid] = ${a[m]}. Is ${a[m]} ${op} ${t}?`, tone: "active" });
    if (goRight) {
      s.push({ l: m + 1, r, m, line: 6, it, cut: [l, m], note: `Yes → mid and everything left of it is too small. left = ${m + 1}.`, tone: "warn" });
      l = m + 1;
    } else {
      s.push({ l, r: m, m, line: 7, it, cut: [m + 1, r - 1], note: `No → mid is a candidate answer; keep it. right = ${m}.`, tone: "warn" });
      r = m;
    }
  }
  s.push({ l, r, line: 9, it, found: l, done: true, note: `left == right == ${l} → ${upper ? "upper_bound" : "lower_bound"}(${t}) = ${l}${l < a.length ? ` (nums[${l}] = ${a[l]})` : " (past the end)"}.`, tone: "ok" });
  return s;
}

function ClassicMode() {
  const [tab, setTab] = useState("exact");
  const [preset, setPreset] = useState("standard");
  const cfg = CLASSIC[preset];
  const a = cfg.values;
  const [tOver, setT] = useState(null);
  const t = tOver ?? cfg.target;
  const steps = useMemo(() => (tab === "exact" ? classicSteps(a, t) : boundSteps(a, t, tab === "upper")), [tab, a, t]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  const half = tab !== "exact";
  const vals = half ? [...a, "end"] : a;
  const hiIncl = half ? step.r - 1 : step.r;
  const states = {};
  vals.forEach((_, k) => {
    if (k < step.l || k > hiIncl) states[k] = "dim";
  });
  if (step.m != null && !step.done) states[step.m] = "active";
  if (step.found != null && step.found >= 0) states[step.found] = "ok";
  if (half && a.length >= 0) states[a.length] = states[a.length] === "ok" ? "ok" : "dim";
  const pointers = step.done
    ? step.found != null ? [{ index: step.found, label: tab === "exact" ? "found" : "answer", tone: "success" }] : []
    : [
        { index: step.l, label: "L", tone: "active" },
        ...(step.m != null ? [{ index: step.m, label: "M", tone: "warning" }] : []),
        { index: half ? step.r : step.r, label: "R", tone: "purple" },
      ].filter((p) => p.index >= 0 && p.index < vals.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="exact">Exact match</TabsTrigger>
            <TabsTrigger value="lower">lower_bound</TabsTrigger>
            <TabsTrigger value="upper">upper_bound</TabsTrigger>
          </TabsList>
        </Tabs>
        <PresetSelect presets={CLASSIC} value={preset} onPick={(v) => (setT(null), setPreset(v))} />
        <div className="ml-auto w-44">
          <SliderControl label="target" value={t} min={Math.min(...a) - 2} max={Math.max(...a) + 2} onChange={setT} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            <ArrayView values={vals} states={states} pointers={pointers} cellWidth={a.length > 12 ? 34 : 44} label={half ? "nums  (+ one-past-the-end slot)" : "nums (sorted)"} />
          </Stage>
          <Legend items={[[C.active, "mid probe"], [C.ok, "Answer"], [C.muted, "Eliminated"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_CLASSIC[tab]} active={step.line} />
          <VarTable
            vars={[
              ["left", step.l, "active"],
              ["mid", step.m ?? "—", "warn"],
              ["right", step.r, "purple"],
              ["window size", Math.max(0, hiIncl - step.l + 1)],
              ["probes", step.it],
              ["⌈log₂(N+1)⌉ max", Math.ceil(Math.log2(a.length + 1)), "ok"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rotated sorted array                                                */
/* ------------------------------------------------------------------ */

const ROT = {
  standard: { label: "[4, 5, 6, 7, 0, 1, 2], target 0", base: [0, 1, 2, 4, 5, 6, 7], rot: 3, target: 0 },
  right: { label: "[4, 5, 6, 7, 1, 2, 3], target 2", base: [1, 2, 3, 4, 5, 6, 7], rot: 3, target: 2 },
  missing: { label: "[4, 5, 6, 7, 0, 1, 2], target 3 (missing)", base: [0, 1, 2, 4, 5, 6, 7], rot: 3, target: 3 },
  long: { label: "12 elements, rotated by 8", base: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], rot: 8, target: 11 },
};

const CODE_ROT = {
  search: `int searchRotated(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[left] <= nums[mid]) {          // LEFT half sorted
            if (target >= nums[left] && target < nums[mid])
                right = mid - 1;
            else
                left = mid + 1;
        } else {                                 // RIGHT half sorted
            if (target > nums[mid] && target <= nums[right])
                left = mid + 1;
            else
                right = mid - 1;
        }
    }
    return -1;
}`,
  min: `int findMin(vector<int>& nums) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {        // NOT <=
        int mid = left + (right - left) / 2;
        if (nums[mid] > nums[right]) {
            left = mid + 1;       // min is strictly right of mid
        } else {
            right = mid;          // mid may BE the min
        }
    }
    return nums[left];
}`,
};

function rotatedSteps(a, t) {
  let l = 0, r = a.length - 1, it = 0;
  const s = [{ l, r, line: 2, it, note: `Rotated sorted array: at any mid, at least ONE half is perfectly sorted. Use that half to decide.`, tone: "default" }];
  while (l <= r) {
    const m = mid(l, r);
    it++;
    if (a[m] === t) {
      s.push({ l, r, m, line: [4, 5], it, found: m, done: true, note: `nums[${m}] = ${t} → found after ${it} probe${it > 1 ? "s" : ""}.`, tone: "ok" });
      return s;
    }
    if (a[l] <= a[m]) {
      const inside = t >= a[l] && t < a[m];
      s.push({ l, r, m, sorted: [l, m], line: [6, 7], it, note: `nums[left] = ${a[l]} ≤ nums[mid] = ${a[m]} → LEFT half [${l}..${m}] is sorted. Is ${t} in [${a[l]}, ${a[m]})? ${inside ? "Yes." : "No."}`, tone: "active" });
      if (inside) (s.push({ l, r: m - 1, m, sorted: [l, m], line: 8, it, note: `Target lies in the sorted left half → right = ${m - 1}.`, tone: "warn" }), (r = m - 1));
      else (s.push({ l: m + 1, r, m, sorted: [l, m], line: 10, it, note: `Target can't be in the sorted left half → it's in the other half: left = ${m + 1}.`, tone: "warn" }), (l = m + 1));
    } else {
      const inside = t > a[m] && t <= a[r];
      s.push({ l, r, m, sorted: [m, r], line: [11, 12], it, note: `nums[left] = ${a[l]} > nums[mid] = ${a[m]} → the break is on the left, so RIGHT half [${m}..${r}] is sorted. Is ${t} in (${a[m]}, ${a[r]}]? ${inside ? "Yes." : "No."}`, tone: "active" });
      if (inside) (s.push({ l: m + 1, r, m, sorted: [m, r], line: 13, it, note: `Target lies in the sorted right half → left = ${m + 1}.`, tone: "warn" }), (l = m + 1));
      else (s.push({ l, r: m - 1, m, sorted: [m, r], line: 15, it, note: `Target isn't in the sorted right half → right = ${m - 1}.`, tone: "warn" }), (r = m - 1));
    }
  }
  s.push({ l, r, line: 18, it, done: true, note: `Search space empty → ${t} not present, return −1. Still O(log N).`, tone: "bad" });
  return s;
}

function findMinSteps(a) {
  let l = 0, r = a.length - 1, it = 0;
  const s = [{ l, r, line: 2, it, note: `Compare mid against nums[right]: the right end is always in the "low" run.`, tone: "default" }];
  while (l < r) {
    const m = mid(l, r);
    it++;
    if (a[m] > a[r]) {
      s.push({ l, r, m, line: [5, 6], it, sorted: [l, m], note: `nums[mid] = ${a[m]} > nums[right] = ${a[r]} → mid is in the HIGH run; the drop (minimum) is right of mid. left = ${m + 1}.`, tone: "warn" });
      l = m + 1;
    } else {
      s.push({ l, r, m, line: [7, 8], it, sorted: [m, r], note: `nums[mid] = ${a[m]} ≤ nums[right] = ${a[r]} → [mid..right] is sorted; min is mid or left of it. right = ${m}.`, tone: "warn" });
      r = m;
    }
  }
  s.push({ l, r, line: 11, it, found: l, done: true, note: `left == right == ${l} → minimum = ${a[l]} (the rotation point).`, tone: "ok" });
  return s;
}

function RotatedPlot({ a, step }) {
  const W = 580, H = 200, pad = 22, base = H - 26;
  const max = Math.max(...a), min = Math.min(...a);
  const bw = (W - pad * 2) / a.length;
  const y = (v) => base - 12 - ((v - min) / (max - min || 1)) * (base - 40);
  const out = (k) => k < step.l || k > step.r;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {step.sorted && <rect x={pad + step.sorted[0] * bw} y={6} width={(step.sorted[1] - step.sorted[0] + 1) * bw} height={base - 6} rx={6} fill={C.ok} opacity={0.1} stroke={C.ok} strokeDasharray="4 3" />}
      {step.sorted && <text x={pad + ((step.sorted[0] + step.sorted[1] + 1) / 2) * bw} y={18} textAnchor="middle" fontSize={10} fill={C.ok}>sorted half</text>}
      <line x1={pad} x2={W - pad} y1={base} y2={base} stroke={C.muted} opacity={0.4} />
      {a.map((v, k) => {
        const color = step.found === k ? C.ok : step.m === k && !step.done ? C.active : C.ink;
        return (
          <g key={k} opacity={out(k) && step.found !== k ? 0.25 : 1} className="transition-all duration-200">
            <rect x={pad + k * bw + bw * 0.2} y={y(v)} width={bw * 0.6} height={base - y(v)} rx={3} fill={color} opacity={0.85} />
            <text x={pad + k * bw + bw / 2} y={y(v) - 4} textAnchor="middle" fontSize={11} fill={C.fg}>{v}</text>
            <text x={pad + k * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} fill={step.l === k ? C.active : step.r === k ? C.purple : C.muted}>
              {!step.done && step.l === k ? "L" : !step.done && step.r === k ? "R" : k}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RotatedMode() {
  const [tab, setTab] = useState("search");
  const [preset, setPreset] = useState("standard");
  const cfg = ROT[preset];
  const [rotOver, setRot] = useState(null);
  const [tOver, setT] = useState(null);
  const rot = rotOver ?? cfg.rot;
  const t = tOver ?? cfg.target;
  const a = useMemo(() => [...cfg.base.slice(rot), ...cfg.base.slice(0, rot)], [cfg, rot]);
  const steps = useMemo(() => (tab === "search" ? rotatedSteps(a, t) : findMinSteps(a)), [tab, a, t]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  const states = {};
  a.forEach((_, k) => (k < step.l || k > step.r) && (states[k] = "dim"));
  if (step.m != null && !step.done) states[step.m] = "active";
  if (step.found != null) states[step.found] = "ok";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="search">Search target</TabsTrigger>
            <TabsTrigger value="min">Find minimum</TabsTrigger>
          </TabsList>
        </Tabs>
        <PresetSelect presets={ROT} value={preset} onPick={(v) => (setRot(null), setT(null), setPreset(v))} width="w-72" />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <RotatedPlot a={a} step={step} />
          </Stage>
          <ArrayView values={a} states={states} pointers={step.done ? [] : [{ index: step.l, label: "L", tone: "active" }, ...(step.m != null ? [{ index: step.m, label: "M", tone: "warning" }] : []), { index: step.r, label: "R", tone: "purple" }].filter((p) => p.index >= 0 && p.index < a.length)} />
          <Legend items={[[C.ok, "Sorted half / answer"], [C.active, "mid"], [C.muted, "Discarded"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_ROT[tab]} active={step.line} maxHeight={300} />
          <div className="grid grid-cols-2 gap-3">
            <SliderControl label="rotation k" value={rot} min={0} max={cfg.base.length - 1} onChange={setRot} />
            {tab === "search" && <SliderControl label="target" value={t} min={Math.min(...a) - 1} max={Math.max(...a) + 1} onChange={setT} />}
          </div>
          <VarTable vars={[["left", step.l, "active"], ["mid", step.m ?? "—", "warn"], ["right", step.r, "purple"], ["probes", step.it]]} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Binary search on the answer space                                   */
/* ------------------------------------------------------------------ */

const KOKO = {
  standard: { label: "piles [3, 6, 7, 11], h = 8 (chapter)", piles: [3, 6, 7, 11], h: 8 },
  lc2: { label: "piles [30, 11, 23, 4, 20], h = 5", piles: [30, 11, 23, 4, 20], h: 5 },
  lc3: { label: "piles [30, 11, 23, 4, 20], h = 6", piles: [30, 11, 23, 4, 20], h: 6 },
};
const SHIP = {
  standard: { label: "weights 1..10, D = 5 (chapter)", w: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], d: 5 },
  lc2: { label: "weights [3, 2, 2, 4, 1, 4], D = 3", w: [3, 2, 2, 4, 1, 4], d: 3 },
  lc3: { label: "weights [1, 2, 3, 1, 1], D = 4", w: [1, 2, 3, 1, 1], d: 4 },
};

const CODE_ANS = {
  koko: `bool canFinish(vector<int>& piles, int k, int h) {
    long long hoursNeeded = 0;
    for (int pile : piles)
        hoursNeeded += (pile + k - 1) / k;   // ceil(pile / k)
    return hoursNeeded <= h;
}

int minEatingSpeed(vector<int>& piles, int h) {
    int left = 1;
    int right = *max_element(piles.begin(), piles.end());
    int bestSpeed = right;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (canFinish(piles, mid, h)) {
            bestSpeed = mid;      // feasible: record it...
            right = mid - 1;      // ...and try slower
        } else {
            left = mid + 1;       // too slow
        }
    }
    return bestSpeed;
}`,
  ship: `bool canShip(vector<int>& weights, int capacity, int days) {
    int currentLoad = 0, daysNeeded = 1;
    for (int w : weights) {
        if (currentLoad + w > capacity) { daysNeeded++; currentLoad = 0; }
        currentLoad += w;
    }
    return daysNeeded <= days;
}

int shipWithinDays(vector<int>& weights, int days) {
    int left = *max_element(weights.begin(), weights.end());
    int right = accumulate(weights.begin(), weights.end(), 0);
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canShip(weights, mid, days)) right = mid;
        else left = mid + 1;
    }
    return left;
}`,
};

const kokoHours = (piles, k) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
function shipDays(w, cap) {
  let load = 0, days = 1;
  const groups = [[]];
  for (const x of w) {
    if (load + x > cap) {
      days++;
      load = 0;
      groups.push([]);
    }
    load += x;
    groups.at(-1).push(x);
  }
  return { days, groups };
}

function kokoSteps(piles, h) {
  let l = 1, r = Math.max(...piles), best = r, it = 0;
  const probes = [];
  const s = [{ l, r, best, it, probes: [], line: [9, 10, 11], note: `Answer space: speeds [1, ${r}]. Faster than the biggest pile never helps. canFinish(k) is monotonic: F F … F T T … T.`, tone: "default" }];
  while (l <= r) {
    const m = mid(l, r);
    it++;
    const hours = kokoHours(piles, m);
    const ok = hours <= h;
    probes.push(m);
    s.push({ l, r, m, best, it, hours, ok, probes: [...probes], line: [13, 14], note: `Guess speed ${m}: hours = ${piles.map((p) => `⌈${p}/${m}⌉`).join(" + ")} = ${hours} ${ok ? "≤" : ">"} ${h} → ${ok ? "feasible" : "too slow"}.`, tone: ok ? "ok" : "bad" });
    if (ok) {
      best = m;
      s.push({ l, r: m - 1, m, best, it, hours, ok, probes: [...probes], line: [15, 16], note: `Record bestSpeed = ${m}, then look for something slower: right = ${m - 1}.`, tone: "warn" });
      r = m - 1;
    } else {
      s.push({ l: m + 1, r, m, best, it, hours, ok, probes: [...probes], line: 18, note: `Every speed ≤ ${m} also fails → left = ${m + 1}.`, tone: "warn" });
      l = m + 1;
    }
  }
  s.push({ l, r, best, it, probes: [...probes], m: best, hours: kokoHours(piles, best), ok: true, line: 21, done: true, note: `left > right → minimum speed = ${best} (${it} feasibility checks instead of up to ${Math.max(...piles)}).`, tone: "ok" });
  return s;
}

function shipSteps(w, d) {
  let l = Math.max(...w), r = w.reduce((a, b) => a + b, 0), it = 0;
  const probes = [];
  const s = [{ l, r, it, probes: [], line: [11, 12], note: `Answer space: capacity [max = ${l}, sum = ${r}]. Below max a package never fits; at sum everything ships in one day.`, tone: "default" }];
  while (l < r) {
    const m = mid(l, r);
    it++;
    const { days } = shipDays(w, m);
    const ok = days <= d;
    probes.push(m);
    s.push({ l, r, m, it, days, ok, probes: [...probes], line: [14, 15], note: `Capacity ${m}: greedy loading needs ${days} day${days > 1 ? "s" : ""} ${ok ? "≤" : ">"} ${d} → ${ok ? "feasible, keep mid: right = " + m : "too small: left = " + (m + 1)}.`, tone: ok ? "ok" : "bad" });
    if (ok) r = m;
    else l = m + 1;
  }
  s.push({ l, r, m: l, it, days: shipDays(w, l).days, ok: true, probes: [...probes], line: 18, done: true, note: `left == right → minimum capacity = ${l} after ${it} checks.`, tone: "ok" });
  return s;
}

/** The monotonic predicate over the whole answer range, with L / M / R. */
function PredicateStrip({ lo, hi, pred, step, unit }) {
  const n = hi - lo + 1;
  const W = 600, pad = 10, cw = (W - pad * 2) / n, H = 74;
  const probed = new Set(step.probes);
  const every = cw >= 16 ? 1 : cw >= 8 ? 5 : 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {Array.from({ length: n }, (_, k) => {
        const v = lo + k;
        const t = pred(v);
        const inWin = v >= step.l && v <= step.r;
        const isProbe = probed.has(v);
        const fill = t ? C.ok : C.bad;
        return (
          <g key={v}>
            <rect x={pad + k * cw + 0.5} y={22} width={Math.max(cw - 1, 1)} height={22} rx={2} fill={fill} fillOpacity={isProbe ? 0.85 : inWin ? 0.28 : 0.08} stroke={v === step.m ? C.active : "none"} strokeWidth={2} />
            {cw >= 12 && <text x={pad + k * cw + cw / 2} y={37} textAnchor="middle" fontSize={10} fill={isProbe ? C.card : C.fg}>{t ? "T" : "F"}</text>}
            {(v - lo) % every === 0 && <text x={pad + k * cw + cw / 2} y={58} textAnchor="middle" fontSize={10} fill={C.muted}>{v}</text>}
          </g>
        );
      })}
      {!step.done && step.l <= hi && <text x={pad + (step.l - lo) * cw + cw / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.active}>L</text>}
      {!step.done && step.r >= lo && step.r <= hi && <text x={pad + (step.r - lo) * cw + cw / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.purple}>R</text>}
      {step.m != null && <text x={pad + (step.m - lo) * cw + cw / 2} y={72} textAnchor="middle" fontSize={11} fontWeight={700} fill={step.done ? C.ok : C.warn}>{step.done ? "▲ answer" : "▲ M"}</text>}
      <text x={W - pad} y={12} textAnchor="end" fontSize={10} fill={C.muted}>{unit}</text>
    </svg>
  );
}

function KokoPiles({ piles, k, h }) {
  const W = 580, H = 170, pad = 20, base = H - 22;
  const max = Math.max(...piles);
  const bw = (W - pad * 2) / piles.length;
  const sy = (v) => (v / max) * (base - 42);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {piles.map((p, i) => {
        const chunks = Math.ceil(p / k);
        const x = pad + i * bw + bw * 0.25, w = bw * 0.5;
        return (
          <g key={i}>
            {Array.from({ length: chunks }, (_, c) => {
              const v0 = c * k, v1 = Math.min(p, (c + 1) * k);
              return <rect key={c} x={x} y={base - sy(v1)} width={w} height={sy(v1) - sy(v0)} fill={c % 2 ? C.active : C.purple} fillOpacity={0.55} stroke={C.card} strokeWidth={1} />;
            })}
            <text x={x + w / 2} y={base - sy(p) - 5} textAnchor="middle" fontSize={11} fill={C.fg}>{p} → {chunks}h</text>
            <text x={x + w / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={C.muted}>pile {i}</text>
          </g>
        );
      })}
      <text x={W - pad} y={14} textAnchor="end" fontSize={11} fill={kokoHours(piles, k) <= h ? C.ok : C.bad}>speed {k}: {kokoHours(piles, k)}h / {h}h allowed</text>
    </svg>
  );
}

function ShipDays({ w, cap, d }) {
  const { groups, days } = shipDays(w, cap);
  const W = 580, H = 60, pad = 10;
  const total = w.length;
  const cw = (W - pad * 2) / total;
  let idx = 0;
  const tones = [C.active, C.purple, C.warn, C.ok, C.bad];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {groups.map((g, gi) => {
        const start = idx;
        idx += g.length;
        const sum = g.reduce((a, b) => a + b, 0);
        return (
          <g key={gi}>
            {g.map((x, k) => (
              <g key={k}>
                <rect x={pad + (start + k) * cw + 1} y={18} width={cw - 2} height={22} rx={3} fill={tones[gi % tones.length]} fillOpacity={0.3} stroke={tones[gi % tones.length]} />
                <text x={pad + (start + k) * cw + cw / 2} y={33} textAnchor="middle" fontSize={11} fill={C.fg}>{x}</text>
              </g>
            ))}
            <text x={pad + (start + g.length / 2) * cw} y={54} textAnchor="middle" fontSize={10} fill={gi >= d ? C.bad : C.muted}>day {gi + 1}: {sum}</text>
          </g>
        );
      })}
      <text x={W - pad} y={12} textAnchor="end" fontSize={11} fill={days <= d ? C.ok : C.bad}>capacity {cap}: {days} day{days > 1 ? "s" : ""} / {d} allowed</text>
    </svg>
  );
}

function AnswerMode() {
  const [tab, setTab] = useState("koko");
  const [preset, setPreset] = useState("standard");
  const presets = tab === "koko" ? KOKO : SHIP;
  const cfg = presets[preset] ?? presets.standard;
  const [limitOver, setLimit] = useState(null);
  const limit = limitOver ?? (tab === "koko" ? cfg.h : cfg.d);
  const steps = useMemo(() => (tab === "koko" ? kokoSteps(cfg.piles, limit) : shipSteps(cfg.w, limit)), [tab, cfg, limit]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  const lo = tab === "koko" ? 1 : Math.max(...cfg.w);
  const hi = tab === "koko" ? Math.max(...cfg.piles) : cfg.w.reduce((a, b) => a + b, 0);
  const pred = tab === "koko" ? (k) => kokoHours(cfg.piles, k) <= limit : (c) => shipDays(cfg.w, c).days <= limit;
  const showK = step.m ?? (tab === "koko" ? step.best : lo);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => (setTab(v), setPreset("standard"), setLimit(null))}>
          <TabsList>
            <TabsTrigger value="koko">Koko eating bananas</TabsTrigger>
            <TabsTrigger value="ship">Capacity to ship</TabsTrigger>
          </TabsList>
        </Tabs>
        <PresetSelect presets={presets} value={preset} onPick={(v) => (setLimit(null), setPreset(v))} width="w-72" />
        <div className="ml-auto w-44">
          {tab === "koko" ? (
            <SliderControl label="hours h" value={limit} min={cfg.piles.length} max={Math.max(cfg.piles.length, 3 * cfg.piles.length + 8)} onChange={setLimit} />
          ) : (
            <SliderControl label="days D" value={limit} min={1} max={cfg.w.length} onChange={setLimit} />
          )}
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              predicate over the answer range — {tab === "koko" ? `canFinish(speed)` : `canShip(capacity)`}
            </div>
            <PredicateStrip lo={lo} hi={hi} pred={pred} step={step} unit={tab === "koko" ? "speed (bananas/h)" : "capacity"} />
          </Stage>
          <Stage className="p-2">{tab === "koko" ? <KokoPiles piles={cfg.piles} k={showK} h={limit} /> : <ShipDays w={cfg.w} cap={showK} d={limit} />}</Stage>
          <Legend items={[[C.bad, "F (infeasible)"], [C.ok, "T (feasible)"], [C.active, "current guess"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE_ANS[tab]} active={step.line} maxHeight={300} />
          <StatGrid cols={2}>
            <Stat label="Feasibility checks" value={step.it} tone="active" />
            <Stat label="Linear scan" value={`up to ${hi - lo + 1}`} tone="bad" />
          </StatGrid>
          <VarTable
            vars={[
              ["left", step.l, "active"],
              ["mid", step.m ?? "—", "warn"],
              ["right", step.r, "purple"],
              ...(tab === "koko" ? [["hours(mid)", step.hours ?? "—"], ["bestSpeed", step.best, "ok"]] : [["days(mid)", step.days ?? "—"]]),
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function BinarySearchLab({ variant = "classic" }) {
  const meta = {
    classic: { title: "Binary Search — The L / M / R Eliminator", desc: "Each probe throws away half of the remaining search space. Compare the exact-match template with the half-open lower_bound / upper_bound templates.", badges: ["O(log N)", "sorted input"] },
    rotated: { title: "Search in a Rotated Sorted Array", desc: "One half around mid is always sorted. Check whether the target fits inside that sorted half; if not, it must be in the other one.", badges: ["O(log N)", "modified binary search"] },
    "answer-space": { title: "Binary Search on the Answer Space", desc: "The input isn't sorted — the answers are. A monotonic yes/no predicate (F F F T T T) over the answer range is all binary search needs.", badges: ["O(N log range)", "monotonic predicate"] },
  }[variant] ?? { title: "Binary Search", desc: "", badges: [] };
  return (
    <LabShell title={meta.title} description={meta.desc} badges={meta.badges}>
      {variant === "rotated" ? <RotatedMode /> : variant === "answer-space" ? <AnswerMode /> : <ClassicMode />}
    </LabShell>
  );
}
