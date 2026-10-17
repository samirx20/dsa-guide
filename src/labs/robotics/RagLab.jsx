import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper, useSvgDrag } from "@/viz/kit";
import { cn } from "@/lib/utils";
import { CHUNKS, DIMS, MANUAL, QUERY_PRESETS, cosine, dot, embed, norm, pca2, search } from "./_RagLab-corpus";

const inputCls = "h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ASSET_COLOR = { pump: C.active, compressor: C.purple, robot: C.warn, plant: C.bad };
const f3 = (x) => x.toFixed(3);

function QueryBar({ query, setQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-60 flex-1 items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Query" spellCheck={false} />
      </div>
      <Select value={QUERY_PRESETS.includes(query) ? query : "__custom"} onValueChange={(v) => v !== "__custom" && setQuery(v)}>
        <SelectTrigger className="w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUERY_PRESETS.map((q) => (
            <SelectItem key={q} value={q}>
              {q}
            </SelectItem>
          ))}
          {!QUERY_PRESETS.includes(query) && <SelectItem value="__custom">custom query</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScoreBar({ score, on = true }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded bg-muted">
        <div className="h-full rounded" style={{ width: `${Math.max(0, score) * 100}%`, background: on ? C.ok : C.muted }} />
      </div>
      <span className="font-mono text-[11.5px] tabular-nums">{f3(score)}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: embeddings (2D projection)                                 */
/* ------------------------------------------------------------------ */

function EmbeddingsVariant() {
  const [query, setQuery] = useState(QUERY_PRESETS[0]);
  const [sel, setSel] = useState(null);
  const { project } = useMemo(() => pca2(CHUNKS.map((c) => c.v.map((x) => x / norm(c.v)))), []);
  const res = useMemo(() => search(query), [query]);
  const qn = res.qv.map((x) => x / norm(res.qv));
  const pts = CHUNKS.map((c) => project(c.v.map((x) => x / norm(c.v))));
  const qp = project(qn);
  const all = [...pts, qp];
  const [minX, maxX] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  const [minY, maxY] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  const W = 620, H = 330, pad = 50;
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const sy = (y) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const top = res.ranked.slice(0, 3);
  const topIds = new Set(top.map((c) => c.id));
  const selected = CHUNKS.find((c) => c.id === sel);
  return (
    <>
      <QueryBar query={query} setQuery={setQuery} />
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
              {top.map((c) => {
                const p = pts[c.id - 1];
                return <line key={c.id} x1={sx(qp[0])} y1={sy(qp[1])} x2={sx(p[0])} y2={sy(p[1])} stroke={C.ok} strokeWidth={1.5} strokeDasharray="4 3" />;
              })}
              {CHUNKS.map((c, i) => {
                const p = pts[i];
                const hit = topIds.has(c.id);
                return (
                  <g key={c.id} onClick={() => setSel(c.id)} className="cursor-pointer">
                    <circle cx={sx(p[0])} cy={sy(p[1])} r={hit ? 9 : 7} fill={ASSET_COLOR[c.meta.asset_type]} fillOpacity={hit ? 0.9 : 0.55} stroke={sel === c.id ? C.fg : hit ? C.ok : "none"} strokeWidth={2} />
                    <text x={sx(p[0]) + 11} y={sy(p[1]) + 4} fontSize={10} fill={C.fg}>
                      #{c.id}
                    </text>
                  </g>
                );
              })}
              <path d={`M ${sx(qp[0])} ${sy(qp[1]) - 11} l 3.2 7 7.6 0.6 -5.8 5 1.8 7.4 -6.8 -4 -6.8 4 1.8 -7.4 -5.8 -5 7.6 -0.6 z`} fill={C.ok} stroke={C.fg} strokeWidth={1} />
              <text x={sx(qp[0]) + (sx(qp[0]) > W - 90 ? -14 : 12)} y={sy(qp[1]) - 12} textAnchor={sx(qp[0]) > W - 90 ? "end" : "start"} fontSize={11} fontWeight={700} fill={C.ok}>
                query
              </text>
            </svg>
          </Stage>
          <Legend items={[[C.active, "pump"], [C.purple, "compressor"], [C.warn, "robot"], [C.bad, "plant-wide"], [C.ok, "query & top-3 neighbours"]]} />
          <Narration tone={res.hits.length ? "ok" : "warn"}>
            {res.hits.length
              ? `The query activates concepts via ${res.hits.map((h) => `"${h}"`).join(", ")}. Points close in direction to the query (high cosine) are semantically related — even without sharing exact words.`
              : "No known concepts in this query: its vector is almost empty, so every similarity is near-random. Real embedding models always return a vector, but irrelevant queries still get low scores."}{" "}
            The 2-D map is a PCA projection of 9-D vectors, so distances on screen are only approximate — ranking always uses the full vectors.
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Query embedding (8 concept dims + noise)">
            <div className="space-y-1">
              {DIMS.map((d, i) => (
                <div key={d} className="grid grid-cols-[84px_1fr_44px] items-center gap-2 text-[11.5px]">
                  <span className="font-mono text-muted-foreground">{d}</span>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className="h-full rounded bg-viz-active" style={{ width: `${qn[i] * 100}%` }} />
                  </div>
                  <span className="text-right font-mono tabular-nums">{qn[i].toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">text-embedding-3-small returns 1536 unlabeled floats; these named dims are a teaching stand-in.</p>
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>top-3 neighbour</TableHead>
                <TableHead className="text-right">cosine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((c) => (
                <TableRow key={c.id} onClick={() => setSel(c.id)} className="cursor-pointer">
                  <TableCell className="py-1 text-[12px]">
                    #{c.id} {c.text}
                  </TableCell>
                  <TableCell className="py-1 text-right font-mono text-[12px]">{f3(c.score)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {selected && (
            <div className="rounded-lg border bg-muted/40 p-2 text-[12px]">
              <div className="font-semibold">#{selected.id} · {selected.meta.source_file} p.{selected.meta.page}</div>
              <div>{selected.text}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">[{selected.v.join(", ")}]</div>
            </div>
          )}
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: cosine                                                     */
/* ------------------------------------------------------------------ */

const ORIGIN = [250, 250];
const UNIT = 42;
const toSvg = ([x, y]) => [ORIGIN[0] + x * UNIT, ORIGIN[1] - y * UNIT];
const fromSvg = (px, py) => [Math.round(((px - ORIGIN[0]) / UNIT) * 10) / 10, Math.round(((ORIGIN[1] - py) / UNIT) * 10) / 10];

function Arrow({ v, color, label, onDown }) {
  const [x, y] = toSvg(v);
  const ang = Math.atan2(y - ORIGIN[1], x - ORIGIN[0]);
  return (
    <g>
      <line x1={ORIGIN[0]} y1={ORIGIN[1]} x2={x} y2={y} stroke={color} strokeWidth={3} />
      <path d={`M ${x} ${y} L ${x - 12 * Math.cos(ang - 0.4)} ${y - 12 * Math.sin(ang - 0.4)} L ${x - 12 * Math.cos(ang + 0.4)} ${y - 12 * Math.sin(ang + 0.4)} z`} fill={color} />
      {onDown && <circle cx={x} cy={y} r={14} fill={color} fillOpacity={0.15} stroke={color} className="cursor-grab" onPointerDown={onDown} />}
      <text x={x + 12} y={y - 10} fontSize={12} fontWeight={700} fill={color}>
        {label} [{v[0]}, {v[1]}]
      </text>
    </g>
  );
}

function Grid2D({ children, svgProps }) {
  return (
    <svg viewBox="0 0 620 330" className="w-full select-none font-mono" {...svgProps}>
      {Array.from({ length: 15 }, (_, i) => i - 6).map((k) => (
        <g key={k}>
          <line x1={ORIGIN[0] + k * UNIT} x2={ORIGIN[0] + k * UNIT} y1={0} y2={330} stroke={C.grid} />
          <line x1={0} x2={620} y1={ORIGIN[1] - k * UNIT} y2={ORIGIN[1] - k * UNIT} stroke={C.grid} />
        </g>
      ))}
      <line x1={0} x2={620} y1={ORIGIN[1]} y2={ORIGIN[1]} stroke={C.muted} />
      <line x1={ORIGIN[0]} x2={ORIGIN[0]} y1={0} y2={330} stroke={C.muted} />
      {children}
    </svg>
  );
}

const DOCS2D = [
  { id: "d1", label: "long report", v: [4, 4] },
  { id: "d2", label: "short note", v: [1.2, 0.5] },
  { id: "d3", label: "close match", v: [0.9, 1.1] },
  { id: "d4", label: "other topic", v: [-0.6, 1.0] },
];

function CosineVariant() {
  const [tab, setTab] = useState("pair");
  const [a, setA] = useState([3, 1]);
  const [b, setB] = useState([1, 3]);
  const [q, setQ] = useState([1, 1]);
  const [normalize, setNormalize] = useState(false);
  const clamp = ([x, y]) => [Math.max(-5.5, Math.min(8.5, x)), Math.max(-1.8, Math.min(5.8, y))];
  const { svgProps, startDrag } = useSvgDrag((id, px, py) => {
    const v = clamp(fromSvg(px, py));
    if (id === "a") setA(v);
    if (id === "b") setB(v);
    if (id === "q") setQ(v);
  });
  const cs = cosine(a, b);
  const ang = (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI;
  const eu = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const docs = DOCS2D.map((d) => {
    const v = normalize ? d.v.map((x) => Math.round((x / norm(d.v)) * 100) / 100) : d.v;
    const qq = normalize ? q.map((x) => x / (norm(q) || 1)) : q;
    return { ...d, v, cos: cosine(qq, v), eu: Math.hypot(qq[0] - v[0], qq[1] - v[1]) };
  });
  const byCos = [...docs].sort((x, y) => y.cos - x.cos).map((d) => d.id);
  const byEu = [...docs].sort((x, y) => x.eu - y.eu).map((d) => d.id);
  const agree = byCos.join() === byEu.join();
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pair">Two vectors</TabsTrigger>
          <TabsTrigger value="rank">Cosine vs Euclidean ranking</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "pair" ? (
        <Split>
          <div className="space-y-3">
            <Stage className="p-1">
              <Grid2D svgProps={svgProps}>
                <path
                  d={`M ${ORIGIN[0] + 30 * Math.cos(-Math.atan2(a[1], a[0]))} ${ORIGIN[1] + 30 * Math.sin(-Math.atan2(a[1], a[0]))} A 30 30 0 0 ${Math.atan2(b[1], b[0]) > Math.atan2(a[1], a[0]) ? 0 : 1} ${ORIGIN[0] + 30 * Math.cos(-Math.atan2(b[1], b[0]))} ${ORIGIN[1] + 30 * Math.sin(-Math.atan2(b[1], b[0]))}`}
                  fill="none"
                  stroke={C.warn}
                  strokeWidth={2}
                />
                <line x1={toSvg(a)[0]} y1={toSvg(a)[1]} x2={toSvg(b)[0]} y2={toSvg(b)[1]} stroke={C.bad} strokeDasharray="4 4" />
                <Arrow v={a} color={C.active} label="a" onDown={startDrag("a")} />
                <Arrow v={b} color={C.purple} label="b" onDown={startDrag("b")} />
              </Grid2D>
            </Stage>
            <Legend items={[[C.warn, `angle θ = ${ang.toFixed(1)}°`], [C.bad, "euclidean distance |a − b|"]]} />
            <Narration tone={cs > 0.9 ? "ok" : cs < 0 ? "bad" : "default"}>
              Drag the arrow tips. cos θ = (a·b) / (|a||b|) only cares about direction: stretch b along its own line and the cosine stays put while the euclidean distance changes. {cs > 0.9 ? "Very similar direction (0.9+)." : cs > 0.7 ? "Related (0.7+)." : cs > 0.3 ? "Weakly related." : cs > -0.3 ? "Roughly orthogonal → unrelated." : "Opposite directions."}
            </Narration>
          </div>
          <div className="space-y-3">
            <VarTable
              vars={[
                ["a · b", `${a[0]}×${b[0]} + ${a[1]}×${b[1]} = ${dot(a, b).toFixed(2)}`],
                ["|a|", norm(a).toFixed(3)],
                ["|b|", norm(b).toFixed(3)],
                ["cos θ", f3(cs), "ok"],
                ["θ", `${ang.toFixed(1)}°`, "warn"],
                ["euclidean |a−b|", eu.toFixed(3), "bad"],
              ]}
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                ["parallel (b = 2a)", [1, 2], [2, 4]],
                ["orthogonal", [3, 0], [0, 3]],
                ["opposite", [2, 1], [-2, -1]],
              ].map(([l, x, y]) => (
                <Button key={l} variant="outline" size="xs" onClick={() => (setA(x), setB(y))}>
                  {l}
                </Button>
              ))}
            </div>
          </div>
        </Split>
      ) : (
        <Split>
          <div className="space-y-3">
            <Stage className="p-1">
              <Grid2D svgProps={svgProps}>
                {docs.map((d) => (
                  <Arrow key={d.id} v={d.v} color={d.id === byCos[0] ? C.ok : C.muted} label={d.id} />
                ))}
                <Arrow v={normalize ? q.map((x) => Math.round((x / (norm(q) || 1)) * 100) / 100) : q} color={C.active} label="q" onDown={normalize ? undefined : startDrag("q")} />
              </Grid2D>
            </Stage>
            <Narration tone={agree ? "ok" : "warn"}>
              {agree
                ? "With unit-length vectors, ranking by cosine and by euclidean distance agree (|a−b|² = 2 − 2·cos θ)."
                : `Rankings disagree: euclidean punishes the long document d1 for its magnitude even though it points exactly the same way as q. Normalize before storing — or just use cosine.`}
            </Narration>
          </div>
          <div className="space-y-3">
            <SwitchControl label="Normalize all vectors to length 1" checked={normalize} onChange={setNormalize} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>doc</TableHead>
                  <TableHead className="text-right">cosine</TableHead>
                  <TableHead className="text-right">rank</TableHead>
                  <TableHead className="text-right">euclid</TableHead>
                  <TableHead className="text-right">rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="py-1 text-[12px]">
                      <span className="font-mono">{d.id}</span> <span className="text-muted-foreground">{d.label}</span>
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{f3(d.cos)}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px] text-viz-ok">#{byCos.indexOf(d.id) + 1}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{d.eu.toFixed(2)}</TableCell>
                    <TableCell className={cn("py-1 text-right font-mono text-[12px]", byCos.indexOf(d.id) !== byEu.indexOf(d.id) && "text-viz-bad")}>#{byEu.indexOf(d.id) + 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Split>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: chunking                                                   */
/* ------------------------------------------------------------------ */

/** Fixed-size character windows (chapter's fixed_size_chunks). Returns [start, end) spans. */
export function fixedChunks(text, size, overlap) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    out.push([start, end]);
    if (end === text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}

const trimSpan = (text, [s, e]) => {
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  return [s, e];
};

/** Greedy sentence packing with sentence-level overlap. */
export function sentenceChunks(text, size, overlap) {
  const sents = [];
  for (const m of text.matchAll(/[^.!?\n]+[.!?]*/g)) {
    const sp = trimSpan(text, [m.index, m.index + m[0].length]);
    if (sp[1] > sp[0]) sents.push(sp);
  }
  const out = [];
  let i = 0;
  while (i < sents.length) {
    let j = i;
    while (j + 1 < sents.length && sents[j + 1][1] - sents[i][0] <= size) j++;
    out.push([sents[i][0], sents[j][1]]);
    if (j === sents.length - 1) break;
    let k = j + 1;
    while (k - 1 > i && sents[j][1] - sents[k - 1][0] <= overlap) k--;
    i = k;
  }
  return out;
}

/** Recursive splitting on ["\n\n", "\n", ". ", " "], then word-aligned overlap. */
export function recursiveChunks(text, size, overlap) {
  const delims = ["\n\n", "\n", ". ", " "];
  const rec = (s, e, level) => {
    if (e - s <= size) return [[s, e]];
    for (let li = level; li < delims.length; li++) {
      const d = delims[li];
      const parts = [];
      let p = s;
      let at = text.indexOf(d, p);
      while (at !== -1 && at < e) {
        parts.push([p, d === ". " ? at + 1 : at]);
        p = at + d.length;
        at = text.indexOf(d, p);
      }
      if (!parts.length) continue;
      parts.push([p, e]);
      const out = [];
      let cur = null;
      for (const part of parts) {
        if (part[1] <= part[0]) continue;
        if (cur && part[1] - cur[0] <= size) cur = [cur[0], part[1]];
        else {
          if (cur) out.push(cur);
          if (part[1] - part[0] > size) {
            out.push(...rec(part[0], part[1], li + 1));
            cur = null;
          } else cur = part;
        }
      }
      if (cur) out.push(cur);
      return out;
    }
    return fixedChunks(text.slice(s, e), size, 0).map(([a, b]) => [s + a, s + b]);
  };
  const base = rec(0, text.length, 0).map((sp) => trimSpan(text, sp)).filter(([a, b]) => b > a);
  if (!overlap) return base;
  return base.map(([s, e], i) => {
    if (i === 0) return [s, e];
    let ns = Math.max(base[i - 1][0], s - overlap);
    while (ns < s && !/\s/.test(text[ns - 1] ?? " ")) ns++;
    return [ns, e];
  });
}

/** Count chunk boundaries that cut through a word. */
export function midWordCuts(text, spans) {
  const isW = (c) => !!c && /[A-Za-z0-9]/.test(c);
  let n = 0;
  for (const [s, e] of spans) {
    if (s > 0 && isW(text[s - 1]) && isW(text[s])) n++;
    if (e < text.length && isW(text[e - 1]) && isW(text[e])) n++;
  }
  return n;
}

function ChunkedText({ text, spans, hover, setHover }) {
  // segment the text where the set of covering chunks changes
  const cuts = new Set([0, text.length]);
  spans.forEach(([s, e]) => (cuts.add(s), cuts.add(e)));
  const pts = [...cuts].sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [s, e] = [pts[i], pts[i + 1]];
    const cover = spans.map((sp, k) => (sp[0] <= s && sp[1] >= e ? k : -1)).filter((k) => k >= 0);
    segs.push({ s, e, cover });
  }
  const starts = new Map();
  spans.forEach(([s], k) => starts.set(s, [...(starts.get(s) ?? []), k + 1]));
  return (
    <div className="whitespace-pre-wrap rounded-lg border bg-card p-3 font-mono text-[12px] leading-[1.9]">
      {segs.map((g) => (
        <span key={g.s}>
          {starts.has(g.s) && g.e > g.s && (
            <span className="mr-0.5 rounded bg-foreground px-1 text-[9.5px] font-bold text-background">{starts.get(g.s).join("+")}</span>
          )}
          <span
            onMouseEnter={() => g.cover.length && setHover(g.cover[0])}
            className={cn(
              "rounded-sm transition-colors",
              g.cover.length === 0 && "text-muted-foreground/50 line-through",
              g.cover.length === 1 && (g.cover[0] % 2 ? "bg-viz-purple/14" : "bg-viz-active/14"),
              g.cover.length > 1 && "bg-viz-warn/35",
              hover !== null && g.cover.includes(hover) && "outline outline-1 outline-viz-ok"
            )}
          >
            {text.slice(g.s, g.e)}
          </span>
        </span>
      ))}
    </div>
  );
}

function ChunkingVariant() {
  const [strategy, setStrategy] = useState("recursive");
  const [size, setSize] = useState(220);
  const [overlap, setOverlap] = useState(40);
  const [hover, setHover] = useState(null);
  const ov = Math.min(overlap, size - 10);
  const spans = useMemo(() => (strategy === "fixed" ? fixedChunks(MANUAL, size, ov) : strategy === "sentence" ? sentenceChunks(MANUAL, size, ov) : recursiveChunks(MANUAL, size, ov)), [strategy, size, ov]);
  const lens = spans.map(([s, e]) => e - s);
  const covered = spans.reduce((a, [s, e]) => a + (e - s), 0);
  const cuts = midWordCuts(MANUAL, spans);
  const oversize = lens.filter((l) => l > size).length;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={strategy} onValueChange={setStrategy}>
          <TabsList>
            <TabsTrigger value="fixed">Fixed-size</TabsTrigger>
            <TabsTrigger value="sentence">Sentence</TabsTrigger>
            <TabsTrigger value="recursive">Recursive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Split>
        <div className="space-y-3">
          <ChunkedText text={MANUAL} spans={spans} hover={hover} setHover={setHover} />
          <Legend items={[[C.active, "chunk (even)"], [C.purple, "chunk (odd)"], [C.warn, "overlap — text stored twice"]]} />
        </div>
        <div className="space-y-3">
          <Panel title="Parameters">
            <SliderControl label="chunk_size (chars)" value={size} min={80} max={600} step={10} onChange={setSize} />
            <SliderControl label="overlap (chars)" value={overlap} min={0} max={200} step={10} onChange={setOverlap} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="chunks" value={spans.length} tone="active" />
            <Stat label="avg size" value={`${Math.round(covered / spans.length)} ch`} />
            <Stat label="mid-word cuts" value={cuts} tone={cuts ? "bad" : "ok"} />
            <Stat label="redundancy" value={`${Math.max(0, Math.round((covered / MANUAL.length - 1) * 100))}%`} tone="warn" hint="Extra characters stored because of overlap" />
          </StatGrid>
          <ScrollArea className="max-h-48 rounded-lg" viewportClassName="max-h-48">
            <Table>
              <TableBody>
                {spans.map(([s, e], k) => (
                  <TableRow key={k} onMouseEnter={() => setHover(k)} className={cn(hover === k && "bg-viz-ok/10")}>
                    <TableCell className="py-1 font-mono text-[11.5px]">#{k + 1}</TableCell>
                    <TableCell className="py-1 font-mono text-[11.5px]">{e - s} ch</TableCell>
                    <TableCell className="max-w-48 truncate py-1 text-[11.5px] text-muted-foreground">{MANUAL.slice(s, e).replace(/\n/g, " ⏎ ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </Split>
      <Narration tone={cuts ? "warn" : "ok"}>
        {strategy === "fixed"
          ? `Fixed-size windows are simple and predictable but blind to meaning: ${cuts} boundary cut${cuts === 1 ? "" : "s"} through the middle of a word. Overlap repeats the tail so a sentence split across chunks still appears whole in one of them.`
          : strategy === "sentence"
            ? `Sentence packing never splits a sentence, so every chunk is readable. Overlap carries whole trailing sentences forward.${oversize ? ` ${oversize} chunk(s) exceed chunk_size because a single sentence is longer than the limit.` : ""}`
            : "Recursive splitting tries paragraph breaks first, then lines, then sentences, then words — keeping sections intact whenever they fit. Overlap is snapped to word boundaries."}
      </Narration>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: retrieval (top-k)                                          */
/* ------------------------------------------------------------------ */

function RetrievalVariant() {
  const [query, setQuery] = useState("Why is the pump shaking?");
  const [k, setK] = useState(3);
  const [threshold, setThreshold] = useState(0.5);
  const res = useMemo(() => search(query), [query]);
  const returned = res.ranked.filter((c, i) => i < k && c.score >= threshold);
  return (
    <>
      <QueryBar query={query} setQuery={setQuery} />
      <Split>
        <div className="space-y-3">
          <ScrollArea className="max-h-[440px] rounded-lg" viewportClassName="max-h-[440px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>chunk</TableHead>
                  <TableHead>machine</TableHead>
                  <TableHead>score</TableHead>
                  <TableHead className="text-right">status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {res.ranked.map((c, i) => {
                  const inK = i < k;
                  const pass = c.score >= threshold;
                  const ok = inK && pass;
                  return (
                    <TableRow key={c.id} className={cn(ok && "bg-viz-ok/10", !inK && "opacity-50")}>
                      <TableCell className="py-1 font-mono text-[11.5px]">{i + 1}</TableCell>
                      <TableCell className="py-1 text-[12px]">{c.text}</TableCell>
                      <TableCell className="py-1 font-mono text-[11.5px]">{c.meta.machine_id}</TableCell>
                      <TableCell className="py-1">
                        <ScoreBar score={c.score} on={ok} />
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <Badge variant={ok ? "success" : inK ? "warning" : "outline"}>{ok ? "returned" : inK ? "< threshold" : "beyond k"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <div className="space-y-3">
          <Panel title="Search">
            <SliderControl label="top-k" value={k} min={1} max={8} onChange={setK} />
            <SliderControl label="similarity threshold" value={threshold} min={0} max={0.95} step={0.05} format={(v) => v.toFixed(2)} onChange={setThreshold} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="returned" value={`${returned.length} / ${k}`} tone={returned.length ? "ok" : "bad"} />
            <Stat label="comparisons" value={CHUNKS.length} hint="A flat (exact) index scores every vector. HNSW/IVF indexes visit only a small neighbourhood of the graph at millions of rows." />
          </StatGrid>
          <pre className="code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11.5px]">{`-- pgvector: <=> is cosine DISTANCE (1 - similarity)
SELECT text, 1 - (embedding <=> $1) AS score
FROM chunks
WHERE 1 - (embedding <=> $1) >= ${threshold.toFixed(2)}
ORDER BY embedding <=> $1
LIMIT ${k};`}</pre>
          <Narration tone={returned.length ? "ok" : "warn"}>
            {returned.length
              ? `Top-k caps how much context you send; the threshold refuses weak matches so the LLM isn't fed noise. Best match: "${returned[0].text}" (${f3(returned[0].score)}).`
              : "Nothing clears the threshold — better to answer “I don't have documentation for that” than to stuff irrelevant chunks into the prompt."}
          </Narration>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: filtering (pre vs post)                                    */
/* ------------------------------------------------------------------ */

const SEV_RANK = { low: 0, medium: 1, high: 2, critical: 3 };

/** Pure: compare pre-filtering with post-filtering. */
export function filteredSearch(query, filters, k, overfetch = 1) {
  const pass = (c) =>
    (filters.machine === "any" || c.meta.machine_id === filters.machine) &&
    (filters.section === "any" || c.meta.section_type === filters.section) &&
    SEV_RANK[c.meta.severity] >= SEV_RANK[filters.minSeverity] &&
    (!filters.recent || c.meta.date >= "2025-01-01");
  const { ranked } = search(query);
  const subset = ranked.filter(pass);
  const pre = subset.slice(0, k);
  const candidates = ranked.slice(0, k * overfetch);
  const post = candidates.filter(pass).slice(0, k);
  return { ranked, pass, pre, post, preCompared: subset.length, postCompared: ranked.length, candidates };
}

function ResultList({ title, items, compared, k, note }) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-background/50 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <Badge variant={items.length === k ? "success" : items.length ? "warning" : "danger"} className="ml-auto">
          {items.length}/{k} results
        </Badge>
      </div>
      {items.map((c) => (
        <div key={c.id} className="rounded-md border bg-card px-2 py-1 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">#{c.id}</span>
            <span className="flex-1">{c.text}</span>
            <span className="font-mono text-[11px]">{f3(c.score)}</span>
          </div>
        </div>
      ))}
      {!items.length && <div className="text-[12px] text-viz-bad">no results</div>}
      <div className="text-[11px] text-muted-foreground">
        {compared} similarity computations · {note}
      </div>
    </div>
  );
}

function FilteringVariant() {
  const [query, setQuery] = useState("Why is the pump shaking?");
  const [machine, setMachine] = useState("R7");
  const [section, setSection] = useState("any");
  const [minSeverity, setMinSeverity] = useState("low");
  const [recent, setRecent] = useState(false);
  const [k, setK] = useState(3);
  const [overfetch, setOverfetch] = useState(false);
  const r = useMemo(() => filteredSearch(query, { machine, section, minSeverity, recent }, k, overfetch ? 3 : 1), [query, machine, section, minSeverity, recent, k, overfetch]);
  const sel = (label, value, set, opts) => (
    <div className="space-y-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={set}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <>
      <QueryBar query={query} setQuery={setQuery} />
      <Split>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ResultList title="Pre-filter → search" items={r.pre} compared={r.preCompared} k={k} note="WHERE metadata matches, then ORDER BY similarity" />
            <ResultList title={`Search → post-filter${overfetch ? " (k×3)" : ""}`} items={r.post} compared={r.postCompared} k={k} note={`took top ${r.candidates.length} overall, then dropped non-matching`} />
          </div>
          <Narration tone={r.post.length < r.pre.length ? "warn" : "ok"}>
            {r.post.length < r.pre.length
              ? `Post-filtering lost results: the global top ${r.candidates.length} were mostly other machines, so after filtering only ${r.post.length} remain. Pre-filtering searches inside the ${machine === "any" ? "matching" : machine} subset and still returns ${r.pre.length}.${overfetch ? "" : " Over-fetching (k×3) is the usual mitigation."}`
              : "Both strategies agree here. Pre-filtering is cheaper (fewer vectors scored) and guarantees every result matches; post-filtering ranks globally first and can come up short with narrow filters."}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Metadata filters">
            {sel("machine_id", machine, setMachine, ["any", "P101", "C201", "R7", "ALL"])}
            {sel("section_type", section, setSection, ["any", "maintenance", "specifications", "troubleshooting", "safety"])}
            {sel("min severity", minSeverity, setMinSeverity, ["low", "medium", "high", "critical"])}
            <SwitchControl label="Only docs dated 2025+" checked={recent} onChange={setRecent} />
            <SliderControl label="top-k" value={k} min={1} max={6} onChange={setK} />
            <SwitchControl label="Over-fetch k×3 before post-filter" checked={overfetch} onChange={setOverfetch} />
          </Panel>
          <pre className="code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11px]">{`results = index.query(
    vector=embed(query), top_k=${k},
    filter={${[machine !== "any" && `"machine_id": "${machine}"`, section !== "any" && `"section_type": "${section}"`, minSeverity !== "low" && `"severity": {"$in": [${Object.keys(SEV_RANK).filter((s) => SEV_RANK[s] >= SEV_RANK[minSeverity]).map((s) => `"${s}"`).join(", ")}]}`, recent && `"date": {"$gte": "2025-01-01"}`].filter(Boolean).join(", ")}})`}</pre>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: pipeline (5-stage trace)                                   */
/* ------------------------------------------------------------------ */

const STAGES = ["Planner", "RAG Retriever", "Tool Executor", "Physics Validator", "Synthesizer"];
const LIMITS = { vibration: [0, 50], temperature: [-40, 150] };

/** Pure: produce a full trace of the 5-stage pipeline. */
export function pipelineTrace({ fault, budget, k }) {
  const query = "Pump P101 is vibrating at 7.8 mm/s — what should we do?";
  const state = { query, context: [], tool_calls: [], tool_results: [], validated_results: [], final_answer: "", errors: [], metadata: { trace_id: "tr_8f2a", tokens: 0 } };
  const stages = [];
  let t = 0;
  const snap = () => JSON.parse(JSON.stringify(state));
  // 1. Planner
  {
    const spans = [];
    let dur = 0;
    if (fault === "planner") {
      spans.push({ name: "llm.plan (invalid JSON)", s: t, d: 620, status: "error" });
      spans.push({ name: "llm.plan retry", s: t + 620, d: 640, status: "ok" });
      dur = 1260;
      state.errors.push("planner: attempt 1 failed JSON validation, self-corrected");
    } else {
      spans.push({ name: "llm.plan", s: t, d: 640, status: "ok" });
      dur = 640;
    }
    state.tool_calls = [
      { name: "read_sensor", args: { sensor_id: "V-101", metric: "vibration" } },
      { name: "read_sensor", args: { sensor_id: "T-101", metric: "temperature" } },
    ];
    state.metadata.serial = "P101";
    const tin = 420 * (fault === "planner" ? 2 : 1);
    state.metadata.tokens += tin + 70 * (fault === "planner" ? 2 : 1);
    stages.push({ name: STAGES[0], s: t, d: dur, tin, tout: 70, spans, state: snap(), status: fault === "planner" ? "warn" : "ok", note: `Planner LLM turns the query into 2 tool calls and extracts serial "P101".${fault === "planner" ? " First output was invalid JSON → self-correction retry (+620 ms, double tokens)." : ""}` });
    t += dur;
  }
  // 2. Retriever
  {
    const spans = [{ name: "embed(query)", s: t, d: 110, status: "ok" }, { name: "vector_search k=" + k, s: t + 110, d: 35, status: "ok" }];
    const serial = fault === "retriever" ? "P-101" : "P101";
    const res = search(query).ranked.filter((c) => c.meta.machine_id === serial).slice(0, k);
    state.context = res.map((c) => ({ id: c.id, score: Math.round(c.score * 1000) / 1000, text: c.text, tokens: Math.ceil(c.text.length / 4) }));
    if (!res.length) state.errors.push(`retriever: 0 chunks for machine_id="${serial}" (metadata mismatch)`);
    state.metadata.tokens += 15;
    stages.push({ name: STAGES[1], s: t, d: 145, tin: 15, tout: 0, spans, state: snap(), status: res.length ? "ok" : "bad", note: res.length ? `Embedded the query and pre-filtered on machine_id="P101": top-${k} chunks by cosine (best ${f3(res[0].score)}).` : `Planner wrote serial "P-101" but metadata says "P101" → pre-filter matched nothing. Context is empty; the error is recorded and the pipeline continues degraded.` });
    t += 145;
  }
  // 3. Executor
  {
    const spans = [];
    state.tool_results = [];
    const temp = fault === "physics" ? 900 : 71.5;
    const calls = [
      { id: "V-101", metric: "vibration", value: 7.8, unit: "mm/s", d: 180 },
      { id: "T-101", metric: "temperature", value: temp, unit: "C", d: fault === "timeout" ? 2000 : 210 },
    ];
    for (const c of calls) {
      const timedOut = fault === "timeout" && c.id === "T-101";
      spans.push({ name: `read_sensor(${c.id})`, s: t, d: c.d, status: timedOut ? "error" : "ok" });
      if (timedOut) state.errors.push("executor: read_sensor(T-101) timed out after 2000 ms");
      else state.tool_results.push({ sensor_id: c.id, metric: c.metric, value: c.value, unit: c.unit });
    }
    const d = Math.max(...calls.map((c) => c.d));
    stages.push({ name: STAGES[2], s: t, d, tin: 0, tout: 0, spans, state: snap(), status: fault === "timeout" ? "bad" : "ok", note: fault === "timeout" ? "Tool calls run in parallel; T-101 hit the 2 s timeout guard. Its result is missing and an error is logged — no crash." : "Router dispatches both read_sensor calls in parallel (wall time = slowest call)." });
    t += d;
  }
  // 4. Validator
  {
    state.validated_results = state.tool_results.filter((r) => {
      const [lo, hi] = LIMITS[r.metric];
      const ok = r.value >= lo && r.value <= hi;
      if (!ok) state.errors.push(`validator: ${r.metric} ${r.value}${r.unit} outside physical range [${lo}, ${hi}] — dropped`);
      return ok;
    });
    const bad = state.tool_results.length - state.validated_results.length;
    stages.push({ name: STAGES[3], s: t, d: 4, tin: 0, tout: 0, spans: [{ name: "physics_rules", s: t, d: 4, status: bad ? "error" : "ok" }], state: snap(), status: bad ? "bad" : "ok", note: bad ? "A 900°C pump casing is physically impossible for this asset → the reading is rejected before any LLM sees it." : "Deterministic physics rules: every reading is inside its physical range." });
    t += 4;
  }
  // 5. Synthesizer — fit context into the token budget
  {
    const base = 180 + 30 + state.validated_results.length * 25 + state.errors.length * 20;
    const ctx = [...state.context];
    const dropped = [];
    while (ctx.length && base + ctx.reduce((a, c) => a + c.tokens, 0) > budget) dropped.push(ctx.pop());
    const tin = base + ctx.reduce((a, c) => a + c.tokens, 0);
    const vib = state.validated_results.find((r) => r.metric === "vibration");
    state.final_answer =
      `${vib ? `Vibration ${vib.value} mm/s exceeds the 7.1 mm/s alarm. ` : ""}` +
      (ctx.length ? `Per the manual: ${ctx[0].text} ` : "No manual excerpts were found, so this is based on live readings only. ") +
      (state.errors.length ? `(${state.errors.length} issue(s) flagged in the trace.)` : "Recommend inspecting coupling alignment and bearings within 24 h.");
    state.metadata.tokens += tin + 160;
    const spans = [{ name: "llm.synthesize", s: t, d: 1350, status: "ok" }];
    stages.push({ name: STAGES[4], s: t, d: 1350, tin, tout: 160, spans, state: snap(), status: tin > budget ? "bad" : "ok", note: `Synthesizer prompt = system + query + ${ctx.length} chunk(s) + ${state.validated_results.length} validated reading(s) + errors = ${tin} tokens.${dropped.length ? ` Budget ${budget} forced dropping ${dropped.length} lowest-scoring chunk(s).` : ""}` });
    t += 1350;
  }
  return { stages, total: t, state };
}

function SpanTimeline({ trace, upTo }) {
  const W = 620, rowH = 20;
  const rows = trace.stages.flatMap((s, si) => [{ name: s.name, s: s.s, d: s.d, stage: true, status: s.status, si }, ...s.spans.map((sp) => ({ ...sp, si }))]);
  const H = rows.length * rowH + 26;
  const x = (ms) => 150 + (ms / trace.total) * (W - 160);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {rows.map((r, i) => {
        const vis = r.si <= upTo;
        const col = r.status === "error" || r.status === "bad" ? C.bad : r.status === "warn" ? C.warn : r.stage ? C.active : C.ok;
        return (
          <g key={i} opacity={vis ? 1 : 0.18}>
            <text x={r.stage ? 6 : 16} y={i * rowH + 15} fontSize={r.stage ? 11 : 10} fontWeight={r.stage ? 700 : 400} fill={r.stage ? C.fg : C.muted}>
              {r.name.length > 22 ? r.name.slice(0, 21) + "…" : r.name}
            </text>
            <rect x={x(r.s)} y={i * rowH + 4} width={Math.max(2, x(r.s + r.d) - x(r.s))} height={rowH - 8} rx={3} fill={col} opacity={r.stage ? 0.35 : 0.8} />
            <text x={Math.min(x(r.s + r.d) + 4, W - 40)} y={i * rowH + 14} fontSize={9.5} fill={C.muted}>
              {r.d}ms
            </text>
          </g>
        );
      })}
      <text x={150} y={H - 6} fontSize={10} fill={C.muted}>
        0 ms
      </text>
      <text x={W - 10} y={H - 6} fontSize={10} textAnchor="end" fill={C.muted}>
        {trace.total} ms
      </text>
    </svg>
  );
}

function PipelineVariant() {
  const [fault, setFault] = useState("none");
  const [budget, setBudget] = useState(600);
  const [k, setK] = useState(3);
  const trace = useMemo(() => pipelineTrace({ fault, budget, k }), [fault, budget, k]);
  const steps = useMemo(() => trace.stages.map((s, i) => ({ ...s, i })), [trace]);
  const st = useStepper(steps, { baseMs: 1400 });
  const step = st.step;
  const W = 620;
  const bw = (W - 20) / 5;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fault} onValueChange={setFault}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Happy path</SelectItem>
            <SelectItem value="planner">Planner emits invalid JSON</SelectItem>
            <SelectItem value="retriever">Retriever finds nothing</SelectItem>
            <SelectItem value="timeout">Tool call times out</SelectItem>
            <SelectItem value="physics">Sensor reports 900°C</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[12.5px] text-muted-foreground">query: “{trace.state.query}”</span>
      </div>
      <Stage className="p-2">
        <svg viewBox={`0 0 ${W} 86`} className="w-full font-mono">
          {trace.stages.map((s, i) => {
            const done = i <= step.i;
            const col = !done ? C.grid : s.status === "bad" ? C.bad : s.status === "warn" ? C.warn : C.ok;
            const x = 10 + i * bw;
            return (
              <g key={s.name}>
                {i > 0 && <line x1={x - 8} x2={x + 2} y1={40} y2={40} stroke={C.muted} />}
                <rect x={x + 2} y={16} width={bw - 12} height={48} rx={8} fill={col} fillOpacity={i === step.i ? 0.22 : done ? 0.1 : 0.03} stroke={i === step.i ? C.active : col} strokeWidth={i === step.i ? 2.2 : 1} />
                <text x={x + bw / 2 - 4} y={36} textAnchor="middle" fontSize={s.name.length > 14 ? 9.5 : 10.5} fontWeight={700} fill={C.fg}>
                  {s.name}
                </text>
                <text x={x + bw / 2 - 4} y={52} textAnchor="middle" fontSize={10} fill={C.muted}>
                  {s.d} ms · {s.tin + s.tout} tok
                </text>
              </g>
            );
          })}
        </svg>
      </Stage>
      <Split>
        <div className="space-y-3">
          <Narration tone={step.status === "bad" ? "bad" : step.status === "warn" ? "warn" : "ok"}>
            <b>{step.name}:</b> {step.note}
          </Narration>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observability spans (trace_id tr_8f2a)</div>
            <Stage className="p-2">
              <SpanTimeline trace={trace} upTo={step.i} />
            </Stage>
          </div>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <Panel title="Budget">
            <SliderControl label="synthesizer token budget" value={budget} min={250} max={1000} step={25} onChange={setBudget} />
            <SliderControl label="retriever top-k" value={k} min={1} max={5} onChange={setK} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="elapsed" value={`${step.s + step.d} ms`} tone="active" />
            <Stat label="tokens so far" value={step.state.metadata.tokens} tone="warn" />
          </StatGrid>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PipelineState after {step.name}</div>
            <ScrollArea className="max-h-72 rounded-lg border bg-code" viewportClassName="max-h-72">
              <pre className="code-body p-2 text-[11px]">{JSON.stringify({ ...step.state, context: step.state.context.map((c) => `#${c.id} (${c.score}) ${c.text.slice(0, 40)}…`) }, null, 2)}</pre>
            </ScrollArea>
          </div>
        </div>
      </Split>
    </>
  );
}

const META = {
  embeddings: { title: "Embeddings Map", description: "Maintenance-manual chunks as vectors. Type a query, embed it, and see its nearest neighbours by cosine similarity on a 2-D projection.", badges: ["embeddings", "nearest neighbours", "PCA view"] },
  cosine: { title: "Cosine Similarity Playground", description: "Drag two vectors and read off dot product, angle and cosine; then see why cosine beats euclidean distance for ranking unnormalized embeddings.", badges: ["a·b / |a||b|", "angle", "normalization"] },
  chunking: { title: "Chunking Strategies", description: "Split a pump manual with fixed-size, sentence and recursive chunkers. Tune chunk_size and overlap and watch the boundaries move.", badges: ["chunk_size", "overlap", "recursive split"] },
  retrieval: { title: "Vector Search — Top-k Retrieval", description: "Score every chunk against the query, keep the best k, and refuse matches under a similarity threshold.", badges: ["top-k", "threshold", "pgvector"] },
  filtering: { title: "Metadata Filtering — Pre vs Post", description: "Restrict search by machine, section, severity and date. Compare filtering before the vector search with filtering its results.", badges: ["metadata", "pre-filter", "post-filter"] },
  pipeline: { title: "5-Stage Fleet Pipeline Trace", description: "Planner → RAG Retriever → Tool Executor → Physics Validator → Synthesizer, with the state dictionary, token budget, latency and observability spans at every stage.", badges: ["PipelineState", "observability", "fault injection"] },
};

export default function RagLab({ variant = "embeddings" }) {
  const m = META[variant] ?? META.embeddings;
  const Body = { embeddings: EmbeddingsVariant, cosine: CosineVariant, chunking: ChunkingVariant, retrieval: RetrievalVariant, filtering: FilteringVariant, pipeline: PipelineVariant }[variant] ?? EmbeddingsVariant;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      <Body />
    </LabShell>
  );
}
