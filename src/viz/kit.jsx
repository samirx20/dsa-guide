// Shared building blocks for every interactive lab.
// Labs import from "@/viz/kit" and the shadcn primitives in "@/components/ui/*".
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import python from "highlight.js/lib/languages/python";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("python", python);

/** Theme-aware colors for SVG fills/strokes. */
export const C = {
  active: "var(--viz-active)",
  ok: "var(--viz-ok)",
  bad: "var(--viz-bad)",
  warn: "var(--viz-warn)",
  purple: "var(--viz-purple)",
  grid: "var(--viz-grid)",
  ink: "var(--viz-ink)",
  fill: "var(--viz-fill)",
  muted: "var(--muted-foreground)",
  fg: "var(--foreground)",
  card: "var(--card)",
  border: "var(--border)",
  primary: "var(--primary)",
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Outer card for a lab. */
export function LabShell({ title, description, badges = [], children, className }) {
  return (
    <Card className={cn("not-prose my-6 overflow-hidden font-sans", className)}>
      <CardHeader className="border-b bg-muted/40 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="active">
            <FlaskConical className="size-3" /> Interactive Lab
          </Badge>
          {badges.map((b) => (
            <Badge key={b} variant="outline">
              {b}
            </Badge>
          ))}
        </div>
        <CardTitle className="mt-1 text-[17px]">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  );
}

/** Responsive two-column split: visual on left, controls/readouts on right. */
export function Split({ children, className }) {
  return <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0", className)}>{children}</div>;
}

/** Bordered drawing surface for SVG visuals. */
export function Stage({ children, className, ...props }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-background/60", className)} {...props}>
      {children}
    </div>
  );
}

/** Small titled group of controls. */
export function Panel({ title, children, className }) {
  return (
    <div className={cn("rounded-lg border bg-background/50 p-3", className)}>
      {title && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Explanatory caption that changes with the current step. */
export function Narration({ children, tone = "default" }) {
  const tones = {
    default: "border-border bg-muted/50",
    active: "border-viz-active/40 bg-viz-active/8",
    ok: "border-viz-ok/40 bg-viz-ok/8",
    bad: "border-viz-bad/40 bg-viz-bad/8",
    warn: "border-viz-warn/40 bg-viz-warn/8",
  };
  return <div className={cn("rounded-lg border px-3 py-2 text-[13.5px] leading-relaxed", tones[tone])}>{children}</div>;
}

/** Inline legend chips. */
export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Large readout number. */
export function Stat({ label, value, tone, hint }) {
  const color = tone ? C[tone] : undefined;
  const body = (
    <div className="rounded-lg border bg-background/50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
  return hint ? <Tip content={hint}>{body}</Tip> : body;
}

export function StatGrid({ children, cols = 3 }) {
  return <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

/** Labeled slider with live value readout. */
export function SliderControl({ label, value, onChange, min = 0, max = 100, step = 1, format = (v) => v, disabled }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[12.5px] text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs font-semibold tabular-nums">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

/** Labeled switch row. */
export function SwitchControl({ label, checked, onChange, hint, id }) {
  const sid = id ?? `sw-${label.replace(/\W+/g, "-")}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={sid} className="text-[12.5px] leading-snug">
        {label}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <Switch id={sid} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step-by-step playback                                               */
/* ------------------------------------------------------------------ */

/**
 * Drive a precomputed list of steps.
 * steps: array of arbitrary snapshot objects. Resets to 0 when `steps` identity changes.
 */
export function useStepper(steps, { baseMs = 900 } = {}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const total = steps.length;

  useEffect(() => {
    setI(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    if (i >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setI((x) => Math.min(x + 1, total - 1)), baseMs / speed);
    return () => clearTimeout(t);
  }, [playing, i, total, speed, baseMs]);

  const next = useCallback(() => setI((x) => Math.min(x + 1, total - 1)), [total]);
  const prev = useCallback(() => setI((x) => Math.max(x - 1, 0)), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setI(0);
  }, []);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && i >= total - 1) setI(0);
      return !p;
    });
  }, [i, total]);

  return { i, setI, step: steps[Math.min(i, total - 1)], total, playing, toggle, next, prev, reset, speed, setSpeed, atEnd: i >= total - 1 };
}

/** Reset / Back / Play / Forward + speed slider + step scrubber. */
export function PlaybackBar({ stepper, extra }) {
  const { i, total, playing, toggle, next, prev, reset, speed, setSpeed, setI } = stepper;
  return (
    <div className="space-y-3 rounded-lg border bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tip content="Reset">
          <Button variant="outline" size="icon-sm" onClick={reset} aria-label="Reset">
            <RotateCcw />
          </Button>
        </Tip>
        <Tip content="Step back">
          <Button variant="outline" size="icon-sm" onClick={prev} disabled={i === 0} aria-label="Step back">
            <ChevronLeft />
          </Button>
        </Tip>
        <Button size="sm" onClick={toggle} className="w-24">
          {playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}
        </Button>
        <Tip content="Step forward">
          <Button variant="outline" size="icon-sm" onClick={next} disabled={i >= total - 1} aria-label="Step forward">
            <ChevronRight />
          </Button>
        </Tip>
        <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground">
          step {i + 1}/{total}
        </span>
        {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <Slider value={[i]} min={0} max={Math.max(total - 1, 0)} step={1} onValueChange={([v]) => setI(v)} aria-label="Scrub steps" />
        <div className="flex w-36 items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Speed</span>
          <Slider value={[speed]} min={0.25} max={4} step={0.25} onValueChange={([v]) => setSpeed(v)} aria-label="Speed" />
          <span className="w-9 font-mono text-[11px] tabular-nums">{speed}×</span>
        </div>
      </div>
    </div>
  );
}

/** Syntax-highlighted code with the active line highlighted. `active` is 1-based (or array). */
export function CodePanel({ code, active, lang = "cpp", title, maxHeight = 320 }) {
  const lines = useMemo(() => {
    const html = hljs.highlight(code.replace(/\n$/, ""), { language: lang }).value;
    // keep spans balanced across line breaks
    const out = [];
    let open = [];
    for (const raw of html.split("\n")) {
      const prefix = open.join("");
      const tags = raw.match(/<span[^>]*>|<\/span>/g) || [];
      for (const t of tags) t === "</span>" ? open.pop() : open.push(t);
      out.push(prefix + raw + "</span>".repeat(open.length));
    }
    return out;
  }, [code, lang]);
  const act = new Set([].concat(active ?? []));
  const ref = useRef(null);
  useEffect(() => {
    // Scroll only the code viewport (scrollIntoView would also scroll the page).
    const vp = ref.current;
    const el = vp?.querySelector("[data-active=true]");
    if (!vp || !el) return;
    const top = el.getBoundingClientRect().top - vp.getBoundingClientRect().top + vp.scrollTop;
    if (top < vp.scrollTop + 8) vp.scrollTop = Math.max(0, top - 24);
    else if (top + el.offsetHeight > vp.scrollTop + vp.clientHeight - 8) vp.scrollTop = top - vp.clientHeight + el.offsetHeight + 24;
  }, [active]);
  return (
    <div className="overflow-hidden rounded-lg border bg-code">
      {title && <div className="border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <ScrollArea orientation="both" style={{ maxHeight }} viewportClassName="max-h-[inherit]" viewportRef={ref}>
        <pre className="code-body py-2">
          {lines.map((l, k) => (
            <div
              key={k}
              data-active={act.has(k + 1)}
              className={cn("flex px-0 transition-colors", act.has(k + 1) && "bg-viz-active/14")}
            >
              <span className={cn("w-9 shrink-0 select-none pr-3 text-right text-muted-foreground/60", act.has(k + 1) && "text-viz-active font-semibold")}>{k + 1}</span>
              <span className="pr-4" dangerouslySetInnerHTML={{ __html: l || " " }} />
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}

/** Live variable inspector. vars: object or [[name, value, tone?]] */
export function VarTable({ vars, title = "Variables" }) {
  const rows = Array.isArray(vars) ? vars : Object.entries(vars);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{title}</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([k, v, tone]) => (
          <TableRow key={k}>
            <TableCell className="py-1.5 font-mono text-[12.5px]">{k}</TableCell>
            <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: tone ? C[tone] : undefined }}>
              {typeof v === "number" && !Number.isInteger(v) ? v.toFixed(3) : String(v)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Array visual                                                        */
/* ------------------------------------------------------------------ */

/**
 * Row of cells with optional pointer badges.
 * states: { [index]: "active"|"ok"|"bad"|"warn"|"purple"|"dim" }
 * pointers: [{ index, label, tone }]
 * range: [lo, hi] to tint a window
 */
export function ArrayView({ values, states = {}, pointers = [], range, cellWidth = 44, showIndex = true, label }) {
  const toneBg = {
    active: "bg-viz-active/15 border-viz-active text-viz-active",
    ok: "bg-viz-ok/15 border-viz-ok text-viz-ok",
    bad: "bg-viz-bad/12 border-viz-bad text-viz-bad",
    warn: "bg-viz-warn/15 border-viz-warn text-viz-warn",
    purple: "bg-viz-purple/15 border-viz-purple text-viz-purple",
    dim: "opacity-35",
  };
  return (
    <div className="overflow-x-auto pb-1">
      {label && <div className="mb-1 font-mono text-[11px] text-muted-foreground">{label}</div>}
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-1">
          {values.map((v, k) => {
            const inRange = range && k >= range[0] && k <= range[1];
            return (
              <div
                key={k}
                className={cn(
                  "flex h-11 items-center justify-center rounded-md border bg-card font-mono text-sm font-semibold tabular-nums transition-all duration-200",
                  inRange && "ring-2 ring-viz-active/30",
                  toneBg[states[k]]
                )}
                style={{ width: cellWidth }}
              >
                {v}
              </div>
            );
          })}
        </div>
        {showIndex && (
          <div className="flex gap-1">
            {values.map((_, k) => (
              <div key={k} className="text-center font-mono text-[10px] text-muted-foreground" style={{ width: cellWidth }}>
                {k}
              </div>
            ))}
          </div>
        )}
        {pointers.length > 0 && (
          <div className="relative flex gap-1" style={{ minHeight: 22 * Math.max(1, maxStack(pointers)) }}>
            {values.map((_, k) => (
              <div key={k} className="flex flex-col items-center gap-0.5" style={{ width: cellWidth }}>
                {pointers
                  .filter((p) => p.index === k)
                  .map((p) => (
                    <Badge key={p.label} variant={p.tone ?? "active"} className="px-1 text-[10px]">
                      {p.label}
                    </Badge>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function maxStack(pointers) {
  const m = {};
  for (const p of pointers) m[p.index] = (m[p.index] || 0) + 1;
  return Math.max(...Object.values(m));
}

/* ------------------------------------------------------------------ */
/* Animation + plotting                                                */
/* ------------------------------------------------------------------ */

/** requestAnimationFrame loop; callback(dtSeconds). */
export function useAnimationFrame(callback, running = true) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!running) return;
    let raf;
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      cb.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/**
 * Minimal SVG line plot.
 * series: [{ data: number[] | [x,y][], color, label, dash?, width? }]
 */
export function LinePlot({ series, width = 560, height = 200, yDomain, xDomain, yLabel, xLabel, zeroLine = true, hLines = [], className }) {
  const pad = { l: 40, r: 10, t: 10, b: xLabel ? 30 : 18 };
  const pts = series.map((s) => s.data.map((d, k) => (Array.isArray(d) ? d : [k, d])));
  const allX = pts.flat().map((p) => p[0]);
  const allY = pts.flat().map((p) => p[1]).filter(Number.isFinite);
  const [x0, x1] = xDomain ?? [Math.min(...allX, 0), Math.max(...allX, 1)];
  let [y0, y1] = yDomain ?? [Math.min(...allY, 0), Math.max(...allY, 1)];
  if (y0 === y1) y1 = y0 + 1;
  const sx = (x) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - (y - y0) / (y1 - y0)) * (height - pad.t - pad.b);
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full font-mono", className)} role="img">
      {Array.from({ length: ticks + 1 }, (_, k) => {
        const y = y0 + ((y1 - y0) * k) / ticks;
        return (
          <g key={k}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(y)} y2={sy(y)} stroke={C.grid} strokeWidth={1} />
            <text x={pad.l - 6} y={sy(y) + 3} textAnchor="end" fontSize={9} fill={C.muted}>
              {Math.abs(y) >= 100 ? y.toFixed(0) : y.toFixed(1)}
            </text>
          </g>
        );
      })}
      {zeroLine && y0 < 0 && y1 > 0 && <line x1={pad.l} x2={width - pad.r} y1={sy(0)} y2={sy(0)} stroke={C.muted} strokeWidth={1} opacity={0.6} />}
      {hLines.map((h) => (
        <line key={h.y + (h.label ?? "")} x1={pad.l} x2={width - pad.r} y1={sy(h.y)} y2={sy(h.y)} stroke={h.color ?? C.muted} strokeDasharray="4 4" strokeWidth={1.2} />
      ))}
      {pts.map((p, k) => (
        <polyline
          key={k}
          fill="none"
          stroke={series[k].color ?? C.active}
          strokeWidth={series[k].width ?? 2}
          strokeDasharray={series[k].dash}
          strokeLinejoin="round"
          points={p.filter((q) => Number.isFinite(q[1])).map(([x, y]) => `${sx(x)},${sy(Math.max(y0, Math.min(y1, y)))}`).join(" ")}
        />
      ))}
      {xLabel && (
        <text x={(pad.l + width - pad.r) / 2} y={height - 4} textAnchor="middle" fontSize={10} fill={C.muted}>
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={10} y={pad.t + 8} fontSize={10} fill={C.muted}>
          {yLabel}
        </text>
      )}
    </svg>
  );
}

/** Convert pointer event to SVG viewBox coordinates. */
export function svgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/** Hook for dragging points inside an <svg>. Returns props to spread on the svg + a startDrag(id) factory. */
export function useSvgDrag(onDrag) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const onPointerMove = (e) => {
    if (!dragging.current || !svgRef.current) return;
    const p = svgPoint(svgRef.current, e);
    onDrag(dragging.current, p.x, p.y);
  };
  const end = () => (dragging.current = null);
  const startDrag = (id) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = id;
  };
  return {
    svgProps: { ref: svgRef, onPointerMove, onPointerUp: end, onPointerLeave: end, style: { touchAction: "none" } },
    startDrag,
  };
}

/** Seeded PRNG so simulations are reproducible. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(rand) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
