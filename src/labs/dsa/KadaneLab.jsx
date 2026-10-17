import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrayView, C, CodePanel, LabShell, Legend, Narration, PlaybackBar, Split, Stage, VarTable, useStepper } from "@/viz/kit";

const PRESETS = {
  standard: { label: "Standard case", values: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
  negatives: { label: "All negatives", values: [-3, -1, -4, -2, -5] },
  positives: { label: "All positives", values: [2, 3, 1, 4, 2] },
  alternating: { label: "Alternating signs", values: [5, -6, 4, -1, 3, -2, 6] },
};
const STOCK = {
  standard: { label: "Classic prices", values: [7, 1, 5, 3, 6, 4] },
  falling: { label: "Always falling", values: [7, 6, 4, 3, 1] },
  late: { label: "Late spike", values: [3, 8, 2, 1, 4, 9] },
};

const CODE = {
  optimal: `int maxSubArray(vector<int>& nums) {
    int cur = nums[0];
    int best = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        // extend the run, or restart at nums[i]
        cur = max(nums[i], cur + nums[i]);
        best = max(best, cur);
    }
    return best;
}`,
  brute: `int maxSubArray(vector<int>& nums) {
    int best = INT_MIN;
    for (int i = 0; i < nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < nums.size(); j++) {
            sum += nums[j];
            best = max(best, sum);
        }
    }
    return best;
}`,
  stock: `int maxProfit(vector<int>& prices) {
    int minPrice = INT_MAX;
    int best = 0;
    for (int i = 0; i < prices.size(); i++) {
        minPrice = min(minPrice, prices[i]);
        best = max(best, prices[i] - minPrice);
    }
    return best;
}`,
};

function kadaneSteps(a) {
  const s = [];
  let cur = a[0], best = a[0], start = 0, bs = 0, be = 0;
  s.push({ i: 0, cur, best, start, bs, be, line: [2, 3], ops: 1, note: `Start: cur = best = nums[0] = ${a[0]}.`, tone: "active" });
  for (let i = 1; i < a.length; i++) {
    const extend = cur + a[i];
    const restart = a[i] > extend;
    s.push({ i, cur, best, start, bs, be, line: 6, ops: i + 1, note: `Compare restart (${a[i]}) vs extend (${cur} + ${a[i]} = ${extend}).`, tone: "active" });
    if (restart) start = i;
    cur = Math.max(a[i], extend);
    const improved = cur > best;
    if (improved) {
      best = cur;
      bs = start;
      be = i;
    }
    s.push({
      i, cur, best, start, bs, be, line: 7, ops: i + 1,
      note: restart
        ? `Running sum was dragging us down — restart at index ${i}. cur = ${cur}.`
        : `Extend the run: cur = ${cur}.` + (improved ? ` New best = ${best}!` : ` best stays ${best}.`),
      tone: improved ? "ok" : restart ? "warn" : "default",
    });
  }
  s.push({ i: a.length, cur, best, start, bs, be, line: 9, ops: a.length, note: `Done in one pass: max subarray sum = ${best}, at [${bs}..${be}].`, tone: "ok", done: true });
  return s;
}

function bruteSteps(a) {
  const s = [];
  let best = -Infinity, bs = 0, be = 0, ops = 0;
  for (let i = 0; i < a.length; i++) {
    let sum = 0;
    for (let j = i; j < a.length; j++) {
      sum += a[j];
      ops++;
      const improved = sum > best;
      if (improved) {
        best = sum;
        bs = i;
        be = j;
      }
      s.push({ i, j, cur: sum, best, start: i, bs, be, line: [6, 7], ops, note: `Subarray [${i}..${j}] sums to ${sum}.` + (improved ? ` New best!` : ""), tone: improved ? "ok" : "default" });
    }
  }
  s.push({ i: a.length, cur: s.at(-1).cur, best, start: 0, bs, be, line: 10, ops, note: `Checked ${ops} subarrays (O(N²)) to find best = ${best}.`, tone: "ok", done: true });
  return s;
}

function stockSteps(a) {
  const s = [];
  let minPrice = Infinity, best = 0, minIdx = 0, buy = 0, sell = 0;
  for (let i = 0; i < a.length; i++) {
    const newMin = a[i] < minPrice;
    if (newMin) {
      minPrice = a[i];
      minIdx = i;
    }
    s.push({ i, cur: a[i] - minPrice, best, start: minIdx, bs: buy, be: sell, minPrice, line: 5, ops: i + 1, note: newMin ? `New cheapest day to buy: day ${i} at ${a[i]}.` : `Cheapest so far is ${minPrice} (day ${minIdx}).`, tone: newMin ? "warn" : "default" });
    const profit = a[i] - minPrice;
    const improved = profit > best;
    if (improved) {
      best = profit;
      buy = minIdx;
      sell = i;
    }
    s.push({ i, cur: profit, best, start: minIdx, bs: buy, be: sell, minPrice, line: 6, ops: i + 1, note: `Sell today: ${a[i]} − ${minPrice} = ${profit}.` + (improved ? ` New best profit!` : ""), tone: improved ? "ok" : "default" });
  }
  s.push({ i: a.length, cur: 0, best, start: 0, bs: buy, be: sell, minPrice, line: 8, ops: a.length, note: `Max profit = ${best} (buy day ${buy}, sell day ${sell}).`, tone: "ok", done: true });
  return s;
}

/** Bar chart of the array with the current run and best window marked. */
function Bars({ values, step, stockMode }) {
  const W = 560, H = 190, pad = 24;
  const max = Math.max(...values.map(Math.abs), 1);
  const bw = (W - pad * 2) / values.length;
  const zero = stockMode ? H - 26 : H / 2;
  const scale = stockMode ? (H - 46) / max : (H / 2 - 24) / max;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <line x1={pad} x2={W - pad} y1={zero} y2={zero} stroke={C.muted} strokeWidth={1} opacity={0.5} />
      {/* best window */}
      {step.best > -Infinity && (
        <rect x={pad + step.bs * bw + 1} y={6} width={(step.be - step.bs + 1) * bw - 2} height={H - 12} rx={6} fill={C.ok} opacity={0.08} stroke={C.ok} strokeDasharray="4 3" />
      )}
      {values.map((v, k) => {
        const h = Math.abs(v) * scale;
        const y = v >= 0 ? zero - h : zero;
        const inRun = !stockMode && k >= step.start && k <= Math.min(step.i, values.length - 1) && !step.done;
        const isCur = k === step.i;
        const color = isCur ? C.active : inRun ? C.purple : k >= step.bs && k <= step.be ? C.ok : C.ink;
        return (
          <g key={k}>
            <rect x={pad + k * bw + bw * 0.18} y={y} width={bw * 0.64} height={Math.max(h, 1)} rx={3} fill={color} opacity={isCur || inRun ? 0.95 : 0.55} className="transition-all duration-200" />
            <text x={pad + k * bw + bw / 2} y={v >= 0 ? y - 5 : y + h + 12} textAnchor="middle" fontSize={11} fill={C.fg}>
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function KadaneLab({ variant = "kadane" }) {
  const stockMode = variant === "stock";
  const presets = stockMode ? STOCK : PRESETS;
  const [preset, setPreset] = useState("standard");
  const [custom, setCustom] = useState(null);
  const [impl, setImpl] = useState("optimal");
  const values = custom ?? presets[preset].values;

  const steps = useMemo(
    () => (stockMode ? stockSteps(values) : impl === "brute" ? bruteSteps(values) : kadaneSteps(values)),
    [values, impl, stockMode]
  );
  const st = useStepper(steps, { baseMs: 800 });
  const step = st.step;

  const randomize = () => {
    const n = 7 + Math.floor(Math.random() * 4);
    setCustom(Array.from({ length: n }, () => (stockMode ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 15) - 7)));
  };

  const pointers = step.done
    ? []
    : [
        { index: step.i, label: stockMode ? "today" : impl === "brute" ? "j" : "i", tone: "active" },
        ...(impl === "brute" && !stockMode ? [{ index: step.start, label: "i", tone: "purple" }] : []),
        ...(stockMode ? [{ index: step.start, label: "min", tone: "warning" }] : []),
      ];

  return (
    <LabShell
      title={stockMode ? "Best Time to Buy & Sell — Kadane in disguise" : "Kadane's Algorithm — Maximum Subarray Stepper"}
      description={
        stockMode
          ? "Track the cheapest price seen so far; each day, test selling today. One pass, O(1) space."
          : "Watch the running sum decide at every index: extend the current run, or throw it away and restart."
      }
      badges={["O(N) time", "O(1) space"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={custom ? "custom" : preset}
          onValueChange={(v) => {
            if (v !== "custom") {
              setCustom(null);
              setPreset(v);
            }
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(presets).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
            {custom && <SelectItem value="custom">Random input</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={randomize}>
          <Shuffle /> Random
        </Button>
        {!stockMode && (
          <Tabs value={impl} onValueChange={setImpl} className="ml-auto">
            <TabsList>
              <TabsTrigger value="brute">Brute force O(N²)</TabsTrigger>
              <TabsTrigger value="optimal">Kadane O(N)</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <Bars values={values} step={step} stockMode={stockMode} />
          </Stage>
          <ArrayView values={values} pointers={pointers} states={Object.fromEntries(values.map((_, k) => [k, k >= step.bs && k <= step.be ? "ok" : k === step.i ? "active" : undefined]))} />
          <Legend
            items={[
              [C.active, stockMode ? "Today" : "Current index"],
              ...(stockMode ? [] : [[C.purple, "Current run"]]),
              [C.ok, stockMode ? "Best buy → sell" : "Best subarray so far"],
            ]}
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={stockMode ? CODE.stock : CODE[impl]} active={step.line} />
          <VarTable
            vars={[
              [stockMode ? "day" : "i", step.done ? "—" : step.i, "active"],
              ...(stockMode ? [["minPrice", step.minPrice === Infinity ? "∞" : step.minPrice, "warn"]] : []),
              [stockMode ? "profit today" : impl === "brute" ? "sum" : "cur", step.cur],
              ["best", step.best, "ok"],
              ["operations", step.ops],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
