import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { layoutTree } from "./_TreeLab-layout";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CODE = {
  insert: `void insert(string word) {
    TrieNode* curr = root;
    for (char c : word) {
        int index = c - 'a';  // The ASCII trick!
        if (curr->children[index] == nullptr) {
            curr->children[index] = new TrieNode();
        }
        curr = curr->children[index];
    }
    curr->isEnd = true;
}`,
  search: `bool search(string word) {
    TrieNode* curr = root;
    for (char c : word) {
        int index = c - 'a';
        if (curr->children[index] == nullptr) {
            return false;  // Path broken
        }
        curr = curr->children[index];
    }
    return curr->isEnd;  // Did a word actually end here?
}`,
  startsWith: `bool startsWith(string prefix) {
    TrieNode* curr = root;
    for (char c : prefix) {
        int index = c - 'a';
        if (curr->children[index] == nullptr) {
            return false;
        }
        curr = curr->children[index];
    }
    return true;  // We traversed the whole prefix!
}`,
};

const PRESETS = {
  chapter: { label: "Chapter: apple, app", words: ["apple", "app"] },
  mixed: { label: "apple, app, apt, bat, bath, ban", words: ["apple", "app", "apt", "bat", "bath", "ban"] },
  car: { label: "car, card, care, cat, dog", words: ["car", "card", "care", "cat", "dog"] },
};

/** Trie as a flat node list: { id, ch, parent, end, kids: { char: id } }. */
const emptyTrie = () => ({ nodes: [{ id: 0, ch: "", parent: null, end: false, kids: {} }] });
const cloneTrie = (t) => ({ nodes: t.nodes.map((n) => ({ ...n, kids: { ...n.kids } })) });

function insertQuiet(t, w) {
  let c = 0;
  for (const ch of w) {
    if (t.nodes[c].kids[ch] == null) {
      const id = t.nodes.length;
      t.nodes.push({ id, ch, parent: c, end: false, kids: {} });
      t.nodes[c].kids[ch] = id;
    }
    c = t.nodes[c].kids[ch];
  }
  t.nodes[c].end = true;
}
function trieFrom(words) {
  const t = emptyTrie();
  words.forEach((w) => insertQuiet(t, w));
  return t;
}
const wordsOf = (t) => {
  const out = [];
  const walk = (id, pre) => {
    const n = t.nodes[id];
    if (n.end) out.push(pre);
    Object.keys(n.kids)
      .sort()
      .forEach((ch) => walk(n.kids[ch], pre + ch));
  };
  walk(0, "");
  return out;
};

/** Pure: trace insert / search / startsWith on a trie. */
export function traceTrie(trie, op, word) {
  let t = cloneTrie(trie);
  const steps = [];
  const path = [0];
  const snap = (x) => steps.push({ trie: t, path: [...path], op, word, ...x });
  snap({ ci: -1, line: 2, tone: "default", note: `${op}("${word}"): start with curr = root.` });
  let c = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const idx = ch.charCodeAt(0) - 97;
    const nxt = t.nodes[c].kids[ch];
    if (nxt == null) {
      if (op === "insert") {
        t = cloneTrie(t);
        const id = t.nodes.length;
        t.nodes.push({ id, ch, parent: c, end: false, kids: {} });
        t.nodes[c].kids[ch] = id;
        c = id;
        path.push(id);
        snap({ ci: i, created: id, line: [5, 6, 8], tone: "ok", note: `'${ch}' (index ${idx}): children[${idx}] is nullptr → create a new node and move into it.` });
        continue;
      }
      snap({ ci: i, missing: { parent: c, ch }, line: [5, 6], tone: "bad", done: true, result: false, note: `'${ch}' (index ${idx}): children[${idx}] is nullptr → the path breaks. Return false.` });
      return steps;
    }
    c = nxt;
    path.push(c);
    snap({ ci: i, line: [4, 8], tone: "active", note: `'${ch}' (index ${idx}): child exists → follow it${op === "insert" ? " (shared prefix, nothing to allocate)" : ""}.` });
  }
  if (op === "insert") {
    const was = t.nodes[c].end;
    t = cloneTrie(t);
    t.nodes[c].end = true;
    snap({ ci: word.length, line: 10, tone: "ok", done: true, result: true, note: was ? `"${word}" was already stored — isEnd stays true.` : `Mark isEnd = true on the last node: "${word}" is now a word. O(L) with L = ${word.length}.` });
  } else if (op === "search") {
    const end = t.nodes[c].end;
    snap({ ci: word.length, line: 10, tone: end ? "ok" : "bad", done: true, result: end, note: end ? `Whole word walked and isEnd = true → "${word}" is in the trie.` : `The path exists but isEnd = false → "${word}" is only a prefix of other words. Return false.` });
  } else {
    snap({ ci: word.length, line: 10, tone: "ok", done: true, result: true, note: `Walked the whole prefix "${word}" → return true (isEnd does not matter for startsWith).` });
  }
  return steps;
}

function TrieSVG({ trie, step }) {
  const ghost = step.missing;
  // the missing child gets a real layout slot (key "g") so it never overlaps a sibling
  const kidsOf = (id) => {
    if (id === "g") return [];
    const ks = Object.keys(trie.nodes[id].kids);
    if (ghost && ghost.parent === id) ks.push(ghost.ch);
    return ks.sort().map((ch) => (ghost && ghost.parent === id && ch === ghost.ch ? "g" : trie.nodes[id].kids[ch]));
  };
  const { pos, leaves, depth } = layoutTree(0, kidsOf);
  const slot = 44, rowH = 54, pad = 26;
  const W = Math.max(360, leaves * slot + pad * 2);
  const H = (depth + 1) * rowH + pad;
  const X = (id) => pad + (pos.get(id).x + 0.5) * ((W - pad * 2) / Math.max(leaves, 1));
  const Y = (id) => pad + pos.get(id).y * rowH;
  const onPath = new Set(step.path);
  const r = 15;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Trie">
      {trie.nodes.map((n) =>
        n.parent == null || !pos.has(n.id) ? null : (
          <line key={`e${n.id}`} x1={X(n.parent)} y1={Y(n.parent)} x2={X(n.id)} y2={Y(n.id)} stroke={onPath.has(n.id) ? C.active : C.ink} strokeWidth={onPath.has(n.id) ? 2.8 : 1.3} opacity={onPath.has(n.id) ? 1 : 0.5} />
        )
      )}
      {ghost && (
        <g>
          <line x1={X(ghost.parent)} y1={Y(ghost.parent)} x2={X("g")} y2={Y("g")} stroke={C.bad} strokeWidth={2} strokeDasharray="4 3" />
          <circle cx={X("g")} cy={Y("g")} r={r} fill={C.card} stroke={C.bad} strokeWidth={2} strokeDasharray="4 3" />
          <text x={X("g")} y={Y("g") + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.bad}>
            {ghost.ch}?
          </text>
        </g>
      )}
      {trie.nodes.map((n) => {
        if (!pos.has(n.id)) return null;
        const x = X(n.id), y = Y(n.id);
        const cur = step.path.at(-1) === n.id;
        const col = n.id === step.created ? C.ok : cur ? (step.tone === "bad" ? C.bad : C.active) : onPath.has(n.id) ? C.active : null;
        return (
          <g key={n.id}>
            {n.end && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={C.ok} strokeWidth={2} />}
            <circle cx={x} cy={y} r={r} fill={C.card} />
            <circle cx={x} cy={y} r={r} fill={col ?? (n.end ? C.ok : C.card)} fillOpacity={col ? (cur ? 0.3 : 0.14) : n.end ? 0.14 : 1} stroke={col ?? (n.end ? C.ok : C.ink)} strokeWidth={col ? 2.4 : 1.3} />
            <text x={x} y={y + (n.id === 0 ? 4 : 5)} textAnchor="middle" fontSize={n.id === 0 ? 10 : 14} fontWeight={700} fill={n.id === 0 ? C.muted : C.fg}>
              {n.id === 0 ? "root" : n.ch}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Trie() {
  const [steps, setSteps] = useState(() => [{ trie: trieFrom(PRESETS.mixed.words), path: [0], op: "insert", word: "", ci: -1, line: [], tone: "default", note: "Words sharing a prefix share nodes. Insert a word, or search / startsWith to walk a path." }]);
  const [draft, setDraft] = useState("bad");
  const autoplay = useRef(false);
  const st = useStepper(steps, { baseMs: 750 });
  const s = st.step;
  useEffect(() => {
    if (autoplay.current) {
      autoplay.current = false;
      st.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);
  const base = steps.at(-1).trie;
  const run = (op) => {
    const w = draft.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return;
    autoplay.current = true;
    setSteps(traceTrie(base, op, w));
  };
  const load = (words) => setSteps([{ trie: trieFrom(words), path: [0], op: "insert", word: "", ci: -1, line: [], tone: "default", note: `Loaded ${words.length} word${words.length === 1 ? "" : "s"}: ${words.join(", ") || "(empty trie)"}.` }]);
  const words = useMemo(() => wordsOf(s.trie), [s.trie]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={cn(inputCls, "w-32")}
          value={draft}
          placeholder="word"
          onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10))}
          onKeyDown={(e) => e.key === "Enter" && run("insert")}
          aria-label="Word"
        />
        <Button size="sm" onClick={() => run("insert")}>
          insert
        </Button>
        <Button size="sm" variant="outline" onClick={() => run("search")}>
          search
        </Button>
        <Button size="sm" variant="outline" onClick={() => run("startsWith")}>
          startsWith
        </Button>
        <div className="ml-auto flex flex-wrap gap-1">
          {Object.entries(PRESETS).map(([k, p]) => (
            <Button key={k} size="xs" variant="ghost" onClick={() => load(p.words)}>
              {p.label}
            </Button>
          ))}
          <Button size="xs" variant="ghost" onClick={() => load([])}>
            Clear
          </Button>
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <TrieSVG trie={s.trie} step={s} />
          </Stage>
          <Legend
            items={[
              [C.active, "Walked path / curr"],
              [C.ok, "isEnd = true (double ring) · new node"],
              [C.bad, "Missing child → false"],
            ]}
          />
          {s.word && (
            <div className="flex items-center gap-1">
              <span className="mr-1 font-mono text-[11px] text-muted-foreground">{s.op}</span>
              {s.word.split("").map((ch, k) => (
                <span
                  key={k}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border bg-card font-mono text-sm font-semibold",
                    k < s.ci && "border-viz-active/50 text-viz-active",
                    k === s.ci && (s.tone === "bad" ? "border-viz-bad bg-viz-bad/12 text-viz-bad" : s.tone === "ok" ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : "border-viz-active bg-viz-active/15 text-viz-active")
                  )}
                >
                  {ch}
                </span>
              ))}
              {s.done && (
                <Badge variant={s.result ? "success" : "danger"} className="ml-2">
                  {String(s.result)}
                </Badge>
              )}
            </div>
          )}
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE[s.op]} active={s.line} />
          <StatGrid cols={3}>
            <Stat label="Words" value={words.length} tone="ok" />
            <Stat label="Nodes" value={s.trie.nodes.length} hint="Each node holds 26 child pointers + isEnd, so memory is the trie's weak spot." />
            <Stat label="Depth walked" value={s.path.length - 1} tone="active" />
          </StatGrid>
          <Panel title="Stored words (isEnd)">
            <div className="flex flex-wrap gap-1">
              {words.length === 0 && <span className="text-xs text-muted-foreground">(none)</span>}
              {words.map((w) => (
                <Badge key={w} variant={w === s.word && s.done && s.result ? "success" : "outline"} className="font-mono">
                  {w}
                </Badge>
              ))}
            </div>
          </Panel>
          <VarTable
            vars={[
              ["c", s.ci >= 0 && s.ci < s.word.length ? `'${s.word[s.ci]}'` : "—", "active"],
              ["index = c - 'a'", s.ci >= 0 && s.ci < s.word.length ? s.word.charCodeAt(s.ci) - 97 : "—"],
              ["curr->isEnd", String(s.trie.nodes[s.path.at(-1)]?.end ?? false), "ok"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

export default function TrieLab() {
  return (
    <LabShell
      title="Trie (Prefix Tree) — Insert, Search & startsWith"
      description="Each edge is one character. Shared prefixes share nodes, and an isEnd flag separates real words from mere prefixes."
      badges={["O(L) per operation", "26 children per node"]}
    >
      <Trie />
    </LabShell>
  );
}
