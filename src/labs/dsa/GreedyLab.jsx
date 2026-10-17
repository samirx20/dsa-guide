import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { C, CodePanel, LabShell, Legend, Narration, PlaybackBar, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";

/* ---------- algorithm traces (pure) ---------- */

const fmtI = ([s, e]) => `[${s},${e}]`;

function mergeSteps(iv) {
  const s = [];
  const order = iv.map((_, k) => k);
  const status = {};
  const snap = (o) => s.push({ order: [...order], status: { ...status }, merged: o.merged ?? [], ...o });
  snap({ line: 1, note: `Input: ${iv.map(fmtI).join(" ")}. To MERGE, sort by start time.`, tone: "default", sorted: false });
  order.sort((a, b) => iv[a][0] - iv[b][0] || iv[a][1] - iv[b][1]);
  snap({ line: 2, note: `Sorted by start: ${order.map((k) => fmtI(iv[k])).join(" ")}. Now any overlap is always with the LAST merged block.`, tone: "active", sorted: true });
  const merged = [[...iv[order[0]]]];
  const group = { [order[0]]: 0 };
  status[order[0]] = "ok";
  snap({ cur: order[0], line: [3, 4], merged: merged.map((m) => [...m]), group: { ...group }, lastEnd: merged.at(-1)[1], note: `merged = [${fmtI(merged[0])}].`, tone: "ok", sorted: true });
  for (let r = 1; r < order.length; r++) {
    const k = order[r], [st, en] = iv[k], last = merged.at(-1);
    const overlap = st <= last[1];
    snap({ cur: k, line: 6, merged: merged.map((m) => [...m]), group: { ...group }, lastEnd: last[1], note: `${fmtI(iv[k])}: does start ${st} ≤ last end ${last[1]}?`, tone: "active", sorted: true });
    if (overlap) {
      const old = last[1];
      last[1] = Math.max(last[1], en);
      group[k] = merged.length - 1;
      status[k] = "ok";
      snap({ cur: k, line: 7, merged: merged.map((m) => [...m]), group: { ...group }, lastEnd: last[1], note: `Yes (${st} ≤ ${old}) → overlap. Extend the last block's end to max(${old}, ${en}) = ${last[1]}.`, tone: "ok", sorted: true });
    } else {
      merged.push([st, en]);
      group[k] = merged.length - 1;
      status[k] = "ok";
      snap({ cur: k, line: 9, merged: merged.map((m) => [...m]), group: { ...group }, lastEnd: en, note: `No (${st} > ${last[1]}) → a gap. Start a new block ${fmtI([st, en])}.`, tone: "warn", sorted: true });
    }
  }
  snap({ done: true, line: 11, merged: merged.map((m) => [...m]), group: { ...group }, note: `Result: ${merged.map(fmtI).join(" ")} — ${iv.length} intervals collapsed into ${merged.length}.`, tone: "ok", sorted: true });
  return s;
}

/** Shared greedy "keep if it starts after currentEnd" loop. byStart = the wrong sort for activity selection. */
function selectSteps(iv, { byStart = false, erase = false } = {}) {
  const s = [];
  const order = iv.map((_, k) => k);
  const status = {};
  let count = 0, end = null;
  const snap = (o) => s.push({ order: [...order], status: { ...status }, count, end, ...o });
  snap({ line: 1, note: `Input: ${iv.map(fmtI).join(" ")}.`, tone: "default", sorted: false });
  order.sort(byStart ? (a, b) => iv[a][0] - iv[b][0] : (a, b) => iv[a][1] - iv[b][1]);
  snap({ line: [2, 3], note: byStart ? `Sorted by START: ${order.map((k) => fmtI(iv[k])).join(" ")}. (Tempting — but long early meetings will block everything.)` : `Sorted by END: ${order.map((k) => fmtI(iv[k])).join(" ")}. The interval that finishes first leaves the most room.`, tone: byStart ? "warn" : "active", sorted: true });
  const f = order[0];
  count = 1;
  end = iv[f][1];
  status[f] = "ok";
  snap({ cur: f, line: [4, 5], note: `Always keep the first one ${fmtI(iv[f])}: count = 1, currentEnd = ${end}.`, tone: "ok", sorted: true });
  for (let r = 1; r < order.length; r++) {
    const k = order[r], [st, en] = iv[k];
    if (st >= end) {
      count++;
      const old = end;
      end = en;
      status[k] = "ok";
      snap({ cur: k, line: [7, 8, 9], note: `${fmtI(iv[k])}: start ${st} ≥ currentEnd ${old} → no overlap, keep it. count = ${count}, currentEnd = ${end}.`, tone: "ok", sorted: true });
    } else {
      status[k] = "bad";
      snap({ cur: k, line: 7, note: `${fmtI(iv[k])}: start ${st} < currentEnd ${end} → overlaps the last kept interval, ${erase ? "remove it" : "skip it"}.`, tone: "bad", sorted: true });
    }
  }
  const removed = iv.length - count;
  const opt = byStart ? selectSteps(iv).at(-1).count : count;
  snap({ done: true, line: 12, note: erase ? `Kept ${count} non-overlapping → minimum removals = ${iv.length} − ${count} = ${removed}.` : `Maximum meetings you can attend = ${count}` + (byStart ? (opt > count ? ` — but sort-by-end gets ${opt}. Sorting by start is NOT optimal.` : ` — it happens to match the optimum (${opt}) on this input; try the counterexample.`) : `.`), tone: byStart && opt > count ? "bad" : "ok", sorted: true });
  return s;
}

/** Meeting Rooms II: max simultaneous intervals (sweep line). */
function roomsNeeded(iv) {
  const ev = iv.flatMap(([s, e]) => [[s, 1], [e, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, best = 0;
  for (const [, d] of ev) best = Math.max(best, (cur += d));
  return best;
}

/* ---------- rendering ---------- */

const PRESETS = {
  merge: {
    chapter: { label: "[[1,3],[2,6],[8,10],[15,18]]", iv: [[1, 3], [2, 6], [8, 10], [15, 18]] },
    touch: { label: "Touching [[1,4],[4,5],[6,7]]", iv: [[1, 4], [4, 5], [6, 7]] },
    nested: { label: "Unsorted + nested", iv: [[9, 12], [2, 3], [1, 10], [4, 8], [14, 16], [13, 15]] },
  },
  erase: {
    interview: { label: "[[1,2],[2,3],[1,3],[3,4]]", iv: [[1, 2], [2, 3], [1, 3], [3, 4]] },
    dupes: { label: "Duplicates [[1,2]×3]", iv: [[1, 2], [1, 2], [1, 2]] },
    long: { label: "[[1,100],[11,22],[1,11],[2,12]]", iv: [[1, 100], [11, 22], [1, 11], [2, 12]] },
  },
  select: {
    chapter: { label: "Chapter: 7 meetings", iv: [[1, 3], [2, 4], [3, 5], [0, 6], [5, 7], [8, 9], [5, 9]] },
    counter: { label: "Counterexample [[1,10],[2,3],[4,5]]", iv: [[1, 10], [2, 3], [4, 5]] },
  },
};

const MERGE_CODE = `vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());          // by start
    vector<vector<int>> merged;
    merged.push_back(intervals[0]);
    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] <= merged.back()[1])        // overlap
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        else
            merged.push_back(intervals[i]);              // gap → new block
    }
    return merged;
}`;

const selectCode = (erase, byStart) => `int ${erase ? "eraseOverlapIntervals" : "maxMeetings"}(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end(),
         [](auto& a, auto& b) { return ${byStart ? "a[0] < b[0]; });   // by START ✗" : "a[1] < b[1]; });   // by END"}
    int count = 1;
    int currentEnd = intervals[0][1];
    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] >= currentEnd) {   // fits after the last kept
            count++;
            currentEnd = intervals[i][1];
        }
    }
    return ${erase ? "intervals.size() - count;   // removals" : "count;"}
}`;

function Timeline({ iv, step, mode }) {
  const maxX = Math.max(...iv.map((x) => x[1]), 1);
  const minX = Math.min(0, ...iv.map((x) => x[0]));
  const rows = step.order.length;
  const W = 600, L = 64, R = 16, rowH = 30, top = 26;
  const mergedLane = mode === "merge";
  const H = top + rows * rowH + (mergedLane ? 56 : 16) + 18;
  const sx = (x) => L + ((x - minX) / (maxX - minX || 1)) * (W - L - R);
  const ticks = [];
  const stepT = maxX - minX > 30 ? 10 : maxX - minX > 12 ? 2 : 1;
  for (let t = Math.ceil(minX / stepT) * stepT; t <= maxX; t += stepT) ticks.push(t);
  const endX = mode === "merge" ? step.lastEnd : step.end;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={top - 6} y2={H - 18} stroke={C.grid} strokeWidth={1} />
          <text x={sx(t)} y={H - 5} textAnchor="middle" fontSize={10} fill={C.muted}>
            {t}
          </text>
        </g>
      ))}
      <text x={4} y={14} fontSize={10} fill={C.muted}>
        {step.sorted ? (mode === "merge" ? "sorted by start" : step.byStart ? "sorted by start" : "sorted by end") : "input order"}
      </text>
      {step.order.map((k, r) => {
        const [s, e] = iv[k];
        const y = top + r * rowH;
        const st = step.status[k];
        const isCur = k === step.cur && !step.done;
        const col = isCur ? (st === "bad" ? C.bad : st === "ok" ? C.ok : C.active) : st === "ok" ? C.ok : st === "bad" ? C.bad : C.ink;
        const op = st || isCur ? 1 : 0.45;
        return (
          <g key={k} opacity={op} className="transition-opacity duration-300">
            <text x={L - 8} y={y + 15} textAnchor="end" fontSize={11} fill={isCur ? C.active : C.muted} fontWeight={isCur ? 700 : 400}>
              {fmtI(iv[k])}
            </text>
            <rect x={sx(s)} y={y + 4} width={Math.max(sx(e) - sx(s), 3)} height={rowH - 10} rx={5} fill={col} fillOpacity={isCur ? 0.4 : 0.22} stroke={col} strokeWidth={isCur ? 2.4 : 1.4} strokeDasharray={st === "bad" ? "4 3" : undefined} />
            {mergedLane && step.group?.[k] !== undefined && (
              <text x={sx(e) + 5} y={y + 15} fontSize={10} fill={C.ok}>
                →#{step.group[k] + 1}
              </text>
            )}
          </g>
        );
      })}
      {endX != null && !step.done && (
        <g>
          <line x1={sx(endX)} x2={sx(endX)} y1={top - 8} y2={top + rows * rowH} stroke={C.warn} strokeWidth={2} strokeDasharray="5 4" />
          <text x={sx(endX)} y={top - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.warn}>
            {mode === "merge" ? "last end" : "currentEnd"}
          </text>
        </g>
      )}
      {mergedLane && (
        <g>
          <text x={L - 8} y={top + rows * rowH + 30} textAnchor="end" fontSize={11} fontWeight={700} fill={C.ok}>
            merged
          </text>
          {(step.merged ?? []).map(([s, e], k) => (
            <g key={k}>
              <rect x={sx(s)} y={top + rows * rowH + 14} width={Math.max(sx(e) - sx(s), 3)} height={24} rx={5} fill={C.ok} fillOpacity={0.3} stroke={C.ok} strokeWidth={2} className="transition-all duration-300" />
              <text x={(sx(s) + sx(e)) / 2} y={top + rows * rowH + 30} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.fg}>
                #{k + 1} {fmtI([s, e])}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

const TAB_INFO = {
  merge: "Merge Intervals",
  erase: "Non-overlapping Intervals",
  select: "Activity Selection",
};

export default function GreedyLab() {
  const [tab, setTab] = useState("select");
  const [preset, setPreset] = useState({ merge: "chapter", erase: "interview", select: "chapter" });
  const [custom, setCustom] = useState({});
  const [byStart, setByStart] = useState(false);
  const iv = custom[tab] ?? PRESETS[tab][preset[tab]].iv;
  const steps = useMemo(() => (tab === "merge" ? mergeSteps(iv) : selectSteps(iv, { erase: tab === "erase", byStart: tab === "select" && byStart })).map((x) => ({ ...x, byStart: tab === "select" && byStart })), [iv, tab, byStart]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;

  const randomize = () => {
    const n = 5 + Math.floor(Math.random() * 3);
    const out = Array.from({ length: n }, () => {
      const s = Math.floor(Math.random() * 16), len = 1 + Math.floor(Math.random() * 6);
      return [s, s + len];
    });
    setCustom((c) => ({ ...c, [tab]: out }));
  };

  const kept = Object.values(step.status).filter((v) => v === "ok").length;
  const removed = Object.values(step.status).filter((v) => v === "bad").length;

  return (
    <LabShell
      title="Greedy Interval Scheduling — Timeline Stepper"
      description="Sort first, then sweep once making a locally optimal choice. Merge sorts by START; maximizing non-overlapping intervals sorts by END (the exchange argument)."
      badges={["O(N log N) sort", "O(N) sweep"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab} className="max-w-full">
          <TabsList>
            {Object.entries(TAB_INFO).map(([k, v]) => (
              <TabsTrigger key={k} value={k}>
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select
          value={custom[tab] ? "custom" : preset[tab]}
          onValueChange={(v) => {
            if (v === "custom") return;
            setCustom((c) => ({ ...c, [tab]: undefined }));
            setPreset((p) => ({ ...p, [tab]: v }));
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRESETS[tab]).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
            {custom[tab] && <SelectItem value="custom">Random input</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={randomize}>
          <Shuffle /> Random
        </Button>
      </div>

      <Split>
        <div className="min-w-0 space-y-3">
          <Stage className="p-2">
            <Timeline iv={iv} step={step} mode={tab} />
          </Stage>
          <Legend
            items={
              tab === "merge"
                ? [[C.active, "Current interval"], [C.ok, "Absorbed into a block"], [C.warn, "End of last merged block"]]
                : [[C.active, "Current interval"], [C.ok, "Kept"], [C.bad, tab === "erase" ? "Removed" : "Skipped (overlap)"], [C.warn, "currentEnd"]]
            }
          />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="min-w-0 space-y-3">
          {tab === "select" && (
            <div className="rounded-lg border bg-background/50 p-3">
              <SwitchControl label="Sort by start time instead" hint="the intuitive-but-wrong greedy choice" checked={byStart} onChange={setByStart} id="greedy-bystart" />
            </div>
          )}
          <StatGrid cols={tab === "select" ? 4 : 3}>
            {tab === "merge" ? (
              <>
                <Stat label="intervals" value={iv.length} />
                <Stat label="blocks" value={(step.merged ?? []).length} tone="ok" />
                <Stat label="last end" value={step.lastEnd ?? "—"} tone="warn" />
              </>
            ) : (
              <>
                <Stat label="kept" value={kept} tone="ok" />
                <Stat label={tab === "erase" ? "removed" : "skipped"} value={removed} tone="bad" />
                <Stat label="currentEnd" value={step.end ?? "—"} tone="warn" />
                {tab === "select" && <Stat label="rooms (all)" value={roomsNeeded(iv)} hint="Meeting Rooms II: rooms needed to hold EVERY meeting = max overlap at any instant (sweep starts/ends)." />}
              </>
            )}
          </StatGrid>
          <VarTable
            vars={
              tab === "merge"
                ? [["current", step.cur !== undefined && !step.done ? fmtI(iv[step.cur]) : "—", "active"], ["merged", (step.merged ?? []).map(fmtI).join(" ") || "[]", "ok"]]
                : [["intervals[i]", step.cur !== undefined && !step.done ? fmtI(iv[step.cur]) : "—", "active"], ["count", step.count, "ok"], ["currentEnd", step.end ?? "—", "warn"]]
            }
          />
          <CodePanel code={tab === "merge" ? MERGE_CODE : selectCode(tab === "erase", tab === "select" && byStart)} active={step.line} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
