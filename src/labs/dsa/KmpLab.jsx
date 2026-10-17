import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { C, CodePanel, LabShell, Legend, Narration, PlaybackBar, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

const PRESETS = {
  chapter: { label: 'text "AAABAB", pattern "AAB" (chapter)', text: "AAABAB", pattern: "AAB" },
  lps1: { label: 'pattern "AABAAC"', text: "AABAABAACAAB", pattern: "AABAAC" },
  abab: { label: 'pattern "ABABC"', text: "ABABDABABCABAB", pattern: "ABABC" },
  worst: { label: 'worst case for naive: "AAAAAB"', text: "AAAAAAAAAAAB", pattern: "AAAAAB" },
  classic: { label: 'pattern "ABABCABAB"', text: "ABABDABACDABABCABAB", pattern: "ABABCABAB" },
  overlap: { label: 'overlapping matches "AA"', text: "AAAAA", pattern: "AA" },
};

const CODE = {
  lps: `void computeLPS(string pattern, vector<int>& lps) {
    int length = 0;   // length of previous longest prefix-suffix
    int i = 1;        // lps[0] is always 0
    lps[0] = 0;
    while (i < pattern.length()) {
        if (pattern[i] == pattern[length]) {
            length++;
            lps[i] = length;
            i++;
        } else {
            if (length != 0) {
                length = lps[length - 1];   // fall back, DON'T move i
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
}`,
  kmp: `void kmpSearch(string text, string pattern) {
    int n = text.length(), m = pattern.length();
    vector<int> lps(m, 0);
    computeLPS(pattern, lps);
    int i = 0;   // text index: NEVER moves backward
    int j = 0;   // pattern index
    while (i < n) {
        if (text[i] == pattern[j]) {
            i++; j++;
            if (j == m) {
                cout << "found at " << i - j << endl;
                j = lps[j - 1];          // keep going (overlaps)
            }
        } else {
            if (j != 0) j = lps[j - 1];  // reuse what we matched
            else i++;
        }
    }
}`,
  naive: `void naiveSearch(string text, string pattern) {
    int n = text.length(), m = pattern.length();
    for (int s = 0; s + m <= n; s++) {      // try every shift
        int k = 0;
        while (k < m && text[s + k] == pattern[k]) k++;
        if (k == m) cout << "found at " << s << endl;
    }
}`,
};

function computeLps(p) {
  const lps = Array(p.length).fill(0);
  let len = 0, i = 1;
  while (i < p.length) {
    if (p[i] === p[len]) lps[i++] = ++len;
    else if (len) len = lps[len - 1];
    else lps[i++] = 0;
  }
  return lps;
}

function lpsSteps(p) {
  const m = p.length;
  const lps = Array(m).fill(null);
  if (!m) return [{ i: 0, len: 0, lps: [], line: 1, done: true, note: "Empty pattern.", tone: "bad", comps: 0 }];
  lps[0] = 0;
  let len = 0, i = 1, comps = 0;
  const s = [{ i, len, lps: [...lps], line: [2, 3, 4], comps, note: `lps[0] = 0 always (a proper prefix can't be the whole string). Start i = 1, length = 0.`, tone: "default" }];
  while (i < m) {
    comps++;
    const eq = p[i] === p[len];
    s.push({ i, len, lps: [...lps], cmp: true, eq, line: 6, comps, note: `Compare pattern[i=${i}] '${p[i]}' with pattern[length=${len}] '${p[len]}'.`, tone: "active" });
    if (eq) {
      len++;
      lps[i] = len;
      s.push({ i, len, lps: [...lps], set: i, line: [7, 8, 9], comps, note: `Match → length = ${len}, lps[${i}] = ${len}: "${p.slice(0, len)}" is both a prefix and a suffix of "${p.slice(0, i + 1)}".`, tone: "ok" });
      i++;
    } else if (len) {
      const old = len;
      len = lps[len - 1];
      s.push({ i, len, lps: [...lps], fall: old, line: [11, 12], comps, note: `Mismatch with length ${old} → fall back: length = lps[${old - 1}] = ${len}. i stays at ${i} — retry with a shorter border.`, tone: "warn" });
    } else {
      lps[i] = 0;
      s.push({ i, len, lps: [...lps], set: i, line: [14, 15], comps, note: `Mismatch and length is 0 → lps[${i}] = 0, move on.`, tone: "bad" });
      i++;
    }
  }
  s.push({ i, len, lps: [...lps], line: 18, done: true, comps, note: `LPS = [${lps.join(", ")}] built in ${comps} comparisons (≤ 2M). lps[j−1] tells KMP where to resume after a mismatch at j.`, tone: "ok" });
  return s;
}

function kmpSteps(t, p) {
  const n = t.length, m = p.length;
  if (!m || !n) return [{ i: 0, j: 0, comps: 0, found: [], line: 2, done: true, note: "Text and pattern must be non-empty.", tone: "bad" }];
  const lps = computeLps(p);
  let i = 0, j = 0, comps = 0;
  const found = [];
  const s = [{ i, j, comps, found: [], line: [5, 6], note: `LPS for "${p}" = [${lps.join(", ")}]. Two pointers: i over text, j over pattern.`, tone: "default" }];
  while (i < n) {
    comps++;
    const eq = t[i] === p[j];
    s.push({ i, j, comps, found: [...found], cmp: true, eq, line: 8, note: `text[${i}] '${t[i]}' vs pattern[${j}] '${p[j]}' → ${eq ? "match" : "mismatch"}.`, tone: eq ? "ok" : "bad" });
    if (eq) {
      i++;
      j++;
      if (j === m) {
        found.push(i - j);
        const nj = lps[j - 1];
        s.push({ i, j, comps, found: [...found], hit: i - j, line: [10, 11], note: `j == m → FOUND at index ${i - j}!`, tone: "ok" });
        j = nj;
        s.push({ i, j, comps, found: [...found], line: 12, note: `Continue for overlapping matches: j = lps[${m - 1}] = ${j}. The last ${j} char${j === 1 ? "" : "s"} already match the pattern's prefix.`, tone: "default" });
      }
    } else if (j) {
      const oj = j;
      j = lps[j - 1];
      s.push({ i, j, comps, found: [...found], jump: oj, line: 15, note: `Mismatch after matching ${oj}: j = lps[${oj - 1}] = ${j}. Pattern slides right by ${oj - j}; i does NOT move back.`, tone: "warn" });
    } else {
      i++;
      s.push({ i, j, comps, found: [...found], line: 16, note: `Nothing matched (j = 0) → just advance i to ${i}.`, tone: "default" });
    }
  }
  s.push({ i, j, comps, found: [...found], line: 19, done: true, note: found.length ? `Done: ${found.length} match${found.length > 1 ? "es" : ""} at [${found.join(", ")}] with ${comps} comparisons (≤ 2N).` : `Done: no match, ${comps} comparisons.`, tone: found.length ? "ok" : "bad" });
  return s;
}

function naiveSteps(t, p) {
  const n = t.length, m = p.length;
  if (!m || !n) return [{ s: 0, k: 0, comps: 0, found: [], back: 0, line: 2, done: true, note: "Text and pattern must be non-empty.", tone: "bad" }];
  let comps = 0, back = 0, lastI = -1;
  const found = [];
  const st = [{ s: 0, k: 0, comps, found: [], back, line: 2, note: `Naive: try every shift s and compare left to right.`, tone: "default" }];
  for (let s = 0; s + m <= n; s++) {
    let k = 0;
    while (k < m) {
      comps++;
      if (s + k < lastI) back++;
      lastI = s + k;
      const eq = t[s + k] === p[k];
      st.push({ s, k, comps, found: [...found], back, cmp: true, eq, line: 5, note: `shift ${s}: text[${s + k}] '${t[s + k]}' vs pattern[${k}] '${p[k]}' → ${eq ? "match" : "mismatch"}.` + (!eq && k > 0 ? ` Throw away ${k} matched char${k > 1 ? "s" : ""} and back up.` : ""), tone: eq ? "ok" : "bad" });
      if (!eq) break;
      k++;
    }
    if (k === m) {
      found.push(s);
      st.push({ s, k: m - 1, comps, found: [...found], back, hit: s, line: 6, note: `Full match at shift ${s}.`, tone: "ok" });
    }
  }
  st.push({ s: n - m, k: 0, comps, found: [...found], back, line: 8, done: true, note: `Naive: ${comps} comparisons, text pointer moved backward ${back} time${back === 1 ? "" : "s"}. Worst case O(N·M).`, tone: found.length ? "ok" : "bad" });
  return st;
}

/* ------------------------------------------------------------------ */
/* Visuals                                                             */
/* ------------------------------------------------------------------ */

const CW = 30, GAP = 4;

function Cell({ ch, tone, faint, className }) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-center rounded-md border bg-card font-mono text-[14px] font-semibold transition-all duration-200",
        tone === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
        tone === "ok" && "border-viz-ok bg-viz-ok/15 text-viz-ok",
        tone === "bad" && "border-viz-bad bg-viz-bad/12 text-viz-bad",
        tone === "warn" && "border-viz-warn bg-viz-warn/15 text-viz-warn",
        tone === "purple" && "border-viz-purple bg-viz-purple/15 text-viz-purple",
        faint && "opacity-40",
        className
      )}
      style={{ width: CW }}
    >
      {ch}
    </div>
  );
}

function IndexRow({ n, marks = {} }) {
  return (
    <div className="flex" style={{ gap: GAP }}>
      {Array.from({ length: n }, (_, k) => (
        <div key={k} className={cn("text-center font-mono text-[10px]", marks[k] ? "font-bold text-viz-active" : "text-muted-foreground")} style={{ width: CW }}>
          {marks[k] ?? k}
        </div>
      ))}
    </div>
  );
}

/** Text row + pattern row shifted to its current alignment. */
function Alignment({ t, p, offset, cmpAt, eq, matchedUpTo, found, iMark }) {
  const foundSet = new Set();
  found.forEach((f) => { for (let k = 0; k < p.length; k++) foundSet.add(f + k); });
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1">
        <div className="mb-0.5 font-mono text-[11px] text-muted-foreground">text</div>
        <div className="flex" style={{ gap: GAP }}>
          {t.split("").map((ch, k) => (
            <Cell key={k} ch={ch} tone={k === cmpAt ? (eq ? "ok" : "bad") : foundSet.has(k) ? "purple" : k >= offset && k < offset + matchedUpTo ? "ok" : null} />
          ))}
        </div>
        <IndexRow n={t.length} marks={iMark != null ? { [iMark]: "i" } : {}} />
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">pattern @ shift {offset}</div>
        <div className="flex transition-all duration-300" style={{ gap: GAP, marginLeft: Math.max(0, offset) * (CW + GAP) }}>
          {p.split("").map((ch, k) => {
            const pos = offset + k;
            return <Cell key={k} ch={ch} tone={pos === cmpAt ? (eq ? "ok" : "bad") : k < matchedUpTo ? "ok" : null} faint={k > matchedUpTo && pos !== cmpAt} />;
          })}
        </div>
      </div>
    </div>
  );
}

export default function KmpLab() {
  const [tab, setTab] = useState("lps");
  const [preset, setPreset] = useState("chapter");
  const [custom, setCustom] = useState(null);
  const cfg = custom ?? PRESETS[preset];
  const { text, pattern } = cfg;
  const lps = useMemo(() => computeLps(pattern), [pattern]);

  const all = useMemo(() => ({ lps: lpsSteps(pattern), kmp: kmpSteps(text, pattern), naive: naiveSteps(text, pattern) }), [text, pattern]);
  const steps = all[tab];
  const st = useStepper(steps, { baseMs: tab === "lps" ? 900 : 650 });
  const step = st.step;
  const kmpTotal = all.kmp.at(-1).comps, naiveTotal = all.naive.at(-1).comps, lpsTotal = all.lps.at(-1).comps;

  const setField = (field, v) => setCustom({ text, pattern, [field]: v.replace(/\s/g, "").slice(0, field === "text" ? 24 : 10) });

  return (
    <LabShell
      title="KMP String Matching — LPS Table & a Text Pointer That Never Backs Up"
      description="Build the Longest-Prefix-Suffix table, then search: on a mismatch the pattern jumps ahead using what already matched, so the text is scanned once."
      badges={["O(N + M)", "LPS = failure function"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="lps">1. Build LPS</TabsTrigger>
            <TabsTrigger value="kmp">2. KMP search</TabsTrigger>
            <TabsTrigger value="naive">Naive search</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={custom ? "custom" : preset} onValueChange={(v) => v !== "custom" && (setCustom(null), setPreset(v))}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PRESETS).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
            {custom && <SelectItem value="custom">Custom input</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
        <label className="flex items-center gap-2">
          text
          <input value={text} onChange={(e) => setField("text", e.target.value)} className="h-8 w-60 rounded-md border border-input bg-card px-2 font-mono text-[13px] text-foreground" />
        </label>
        <label className="flex items-center gap-2">
          pattern
          <input value={pattern} onChange={(e) => setField("pattern", e.target.value)} className="h-8 w-32 rounded-md border border-input bg-card px-2 font-mono text-[13px] text-foreground" />
        </label>
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-3">
            {tab === "lps" ? (
              <div className="overflow-x-auto pb-1">
                <div className="inline-flex flex-col gap-1">
                  <div className="mb-0.5 font-mono text-[11px] text-muted-foreground">pattern</div>
                  <div className="flex" style={{ gap: GAP }}>
                    {pattern.split("").map((ch, k) => {
                      const prefix = !step.done && k < step.len;
                      const suffix = !step.done && step.len > 0 && k >= step.i - step.len && k < step.i;
                      const tone = step.cmp && k === step.i ? (step.eq ? "ok" : "bad") : step.cmp && k === step.len ? "active" : prefix ? "purple" : suffix ? "warn" : null;
                      return <Cell key={k} ch={ch} tone={tone} />;
                    })}
                  </div>
                  <IndexRow n={pattern.length} marks={step.done ? {} : step.i === step.len ? { [step.i]: "i=len" } : { [step.i]: "i", [step.len]: "len" }} />
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">lps[]</div>
                  <div className="flex" style={{ gap: GAP }}>
                    {step.lps.map((v, k) => <Cell key={k} ch={v ?? "·"} tone={k === step.set ? "ok" : step.fall && k === step.fall - 1 ? "warn" : null} faint={v == null} />)}
                  </div>
                </div>
              </div>
            ) : tab === "kmp" ? (
              <Alignment t={text} p={pattern} offset={step.i - step.j} cmpAt={step.cmp ? step.i : null} eq={step.eq} matchedUpTo={step.j} found={step.found} iMark={step.done ? null : step.i} />
            ) : (
              <Alignment t={text} p={pattern} offset={step.s} cmpAt={step.cmp ? step.s + step.k : null} eq={step.eq} matchedUpTo={step.k} found={step.found} iMark={step.done ? null : step.s + step.k} />
            )}
          </Stage>
          {tab !== "lps" && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              lps = <span className="font-mono text-foreground">[{lps.join(", ")}]</span>
              <span className="ml-2">matches:</span>
              {step.found.length ? step.found.map((f) => <Badge key={f} variant="purple" className="font-mono">@{f}</Badge>) : <span>none yet</span>}
            </div>
          )}
          <Legend items={tab === "lps" ? [[C.purple, "prefix (length)"], [C.warn, "matching suffix"], [C.ok, "match / lps set"], [C.bad, "mismatch"]] : [[C.ok, "matched so far"], [C.bad, "mismatch"], [C.purple, "full match found"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE[tab]} active={step.line} maxHeight={300} />
          <StatGrid cols={3}>
            <Stat label="KMP cmps" value={kmpTotal} tone="ok" hint={`+ ${lpsTotal} to build LPS`} />
            <Stat label="Naive cmps" value={naiveTotal} tone="bad" />
            <Stat label="This step" value={step.comps} tone="active" />
          </StatGrid>
          <VarTable
            vars={
              tab === "lps"
                ? [["i", step.done ? "—" : step.i, "active"], ["length", step.len, "purple"], ["comparisons", step.comps]]
                : tab === "kmp"
                  ? [["i (text)", step.i, "active"], ["j (pattern)", step.j, "purple"], ["shift = i − j", step.i - step.j], ["comparisons", step.comps]]
                  : [["s (shift)", step.s, "purple"], ["k", step.k], ["text index s+k", step.s + step.k, "active"], ["backtracks", step.back, "bad"], ["comparisons", step.comps]]
            }
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}
