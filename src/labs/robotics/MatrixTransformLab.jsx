import { useState } from "react";
import { Play, Undo2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, Stat, StatGrid, useAnimationFrame, useSvgDrag } from "@/viz/kit";

const W = 560, H = 460, OX = 280, OY = 230, S = 30; // S = pixels per unit
const toS = ([x, y]) => [OX + x * S, OY - y * S];
const fromS = (sx, sy) => [(sx - OX) / S, (OY - sy) / S];
const fmt = (v, n = 2) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(n);
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const apply = ([a, b, c, d], [x, y]) => [a * x + b * y, c * x + d * y];
const det = ([a, b, c, d]) => a * d - b * c;
const lerpM = (M0, M1, t) => M0.map((v, k) => v + (M1[k] - v) * t);
const I = [1, 0, 0, 1];
const ease = (t) => t * t * (3 - 2 * t);

// A stored row-major as [a, b, c, d] = [[a, b], [c, d]]. Columns = where î and ĵ land.
const PRESETS = {
  identity: { label: "Identity", m: [1, 0, 0, 1] },
  rotation: { label: "Rotation 90°", m: [0, -1, 1, 0] },
  shear: { label: "Shear", m: [1, 1, 0, 1] },
  scale: { label: "Scale 2×, 0.5×", m: [2, 0, 0, 0.5] },
  singular: { label: "Singular det=0", m: [1, 2, 1, 2] },
  reflection: { label: "Reflection", m: [-1, 0, 0, 1] },
  chapter: { label: "Chapter A", m: [2, -1, 1, 2] },
};

function Arrow({ from, to, color, width = 3, dash, head = 11, opacity = 1 }) {
  const [x1, y1] = toS(from), [x2, y2] = toS(to);
  const L = Math.hypot(x2 - x1, y2 - y1);
  if (L < 1) return null;
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  const h = Math.min(head, L * 0.6);
  const bx = x2 - ux * h, by = y2 - uy * h;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${bx - uy * h * 0.45},${by + ux * h * 0.45} ${bx + uy * h * 0.45},${by - ux * h * 0.45}`} fill={color} />
    </g>
  );
}

/** Colour-coded 2×2 matrix: column 1 (î) in C.bad, column 2 (ĵ) in C.ok. */
function MatrixView({ m, name }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[13px]">
      <span className="font-semibold">{name} =</span>
      <div className="grid grid-cols-2 gap-1 rounded-md border-x-2 border-foreground/60 px-1.5 py-1">
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className={`rounded px-2 py-0.5 text-right tabular-nums ${k % 2 === 0 ? "bg-viz-bad/12 text-viz-bad" : "bg-viz-ok/12 text-viz-ok"}`}>
            {Number.isFinite(m[k]) ? fmt(m[k], 2) : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MatrixTransformLab({ variant = "matrix" }) {
  const [A, setA] = useState(PRESETS.chapter.m);
  const [v, setV] = useState([3, 2]);
  const [anim, setAnim] = useState(null); // { from, to, t, label }
  const [shown, setShown] = useState(null); // matrix currently displayed if not A (after inverse)

  const D = det(A);
  const singular = Math.abs(D) < 1e-9;
  const Ainv = singular ? [NaN, NaN, NaN, NaN] : [A[3] / D, -A[1] / D, -A[2] / D, A[0] / D];

  useAnimationFrame((dt) => {
    setAnim((s) => {
      if (!s) return s;
      const t = Math.min(1, s.t + dt / 1.6);
      if (t >= 1) {
        setShown(s.to);
        return null;
      }
      return { ...s, t };
    });
  }, !!anim);

  const M = anim ? lerpM(anim.from, anim.to, ease(anim.t)) : shown ?? A;
  const Md = det(M);
  const iNew = [M[0], M[2]], jNew = [M[1], M[3]];
  const Av = apply(M, v);

  const setEntry = (k) => (val) => {
    setAnim(null);
    setShown(null);
    setA((m) => m.map((x, i) => (i === k ? val : x)));
  };

  const { svgProps, startDrag } = useSvgDrag((id, sx, sy) => {
    const [x, y] = fromS(sx, sy).map((q) => clamp(r1(q), -3, 3));
    setAnim(null);
    setShown(null);
    if (id === "i") setA((m) => [x, m[1], y, m[3]]);
    else if (id === "j") setA((m) => [m[0], x, m[2], y]);
    else {
      // drag the *output* Av; recover v = A⁻¹(Av) when invertible, otherwise move v directly
      const [px, py] = fromS(sx, sy);
      if (!singular && !(shown && shown !== A)) {
        const vv = apply(Ainv, [px, py]);
        setV(vv.map((q) => clamp(r1(q), -4, 4)));
      } else setV([clamp(r1(px), -4, 4), clamp(r1(py), -4, 4)]);
    }
  });

  const presetKey = Object.keys(PRESETS).find((k) => PRESETS[k].m.every((x, i) => Math.abs(x - A[i]) < 1e-9)) ?? "custom";
  const N = 12;
  const gridLines = [];
  for (let k = -N; k <= N; k++) {
    gridLines.push([apply(M, [k, -N]), apply(M, [k, N]), k === 0, "v"]);
    gridLines.push([apply(M, [-N, k]), apply(M, [N, k]), k === 0, "h"]);
  }
  const sq = [[0, 0], iNew, [iNew[0] + jNew[0], iNew[1] + jNew[1]], jNew];
  const sqColor = Math.abs(Md) < 0.02 ? C.bad : Md > 0 ? C.active : C.warn;
  const playing = !!anim;
  const isInverseShown = shown && shown !== A;

  return (
    <LabShell
      title={variant === "matrix" ? "Matrices as Space Transformers — Morphing Grid & Determinant" : "Matrix Transformer"}
      description="A 2×2 matrix is just a note of where î and ĵ land: column 1 is î's landing spot, column 2 is ĵ's. Drag their tips (or the sliders) and the whole grid follows; the shaded unit square's signed area is det(A)."
      badges={["columns = basis images", "det = signed area", "A⁻¹ undoes A"]}
    >
      <Tabs
        value={presetKey}
        onValueChange={(k) => {
          if (!PRESETS[k]) return;
          setAnim({ from: M, to: PRESETS[k].m, t: 0 });
          setShown(null);
          setA(PRESETS[k].m);
        }}
      >
        <TabsList className="h-auto flex-wrap">
          {Object.entries(PRESETS).map(([k, p]) => (
            <TabsTrigger key={k} value={k}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" {...svgProps}>
              <defs>
                <clipPath id="mtl-clip">
                  <rect x={0} y={0} width={W} height={H} />
                </clipPath>
              </defs>
              <g clipPath="url(#mtl-clip)">
                {/* original space, faint */}
                {Array.from({ length: 2 * N + 1 }, (_, k) => k - N).map((k) => (
                  <g key={k}>
                    <line x1={OX + k * S} x2={OX + k * S} y1={0} y2={H} stroke={C.grid} strokeWidth={1} opacity={0.6} />
                    <line y1={OY - k * S} y2={OY - k * S} x1={0} x2={W} stroke={C.grid} strokeWidth={1} opacity={0.6} />
                  </g>
                ))}
                {/* warped grid */}
                {gridLines.map(([a, b, axis, dir], k) => {
                  const [x1, y1] = toS(a), [x2, y2] = toS(b);
                  return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={axis ? C.fg : dir === "v" ? C.ok : C.bad} strokeWidth={axis ? 1.6 : 1} opacity={axis ? 0.7 : 0.28} />;
                })}
                {/* unit square → parallelogram with area det */}
                <polygon points={sq.map((p) => toS(p).join(",")).join(" ")} fill={sqColor} opacity={0.22} stroke={sqColor} strokeWidth={Math.abs(Md) < 0.02 ? 4 : 1.5} />
                {(() => {
                  const c = toS([(iNew[0] + jNew[0]) / 2, (iNew[1] + jNew[1]) / 2]);
                  return (
                    <text x={c[0]} y={c[1] + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={sqColor}>
                      {fmt(Md, 2)}
                    </text>
                  );
                })()}
                {/* test vector v and its image Av = x·î' + y·ĵ' (tip-to-tail) */}
                <Arrow from={[0, 0]} to={v} color={C.muted} width={1.5} dash="4 4" opacity={0.7} />
                <Arrow from={[0, 0]} to={[iNew[0] * v[0], iNew[1] * v[0]]} color={C.bad} width={1.5} dash="5 4" opacity={0.7} />
                <Arrow from={[iNew[0] * v[0], iNew[1] * v[0]]} to={Av} color={C.ok} width={1.5} dash="5 4" opacity={0.7} />
                <Arrow from={[0, 0]} to={Av} color={C.purple} width={3} />
                <Arrow from={[0, 0]} to={iNew} color={C.bad} width={4} />
                <Arrow from={[0, 0]} to={jNew} color={C.ok} width={4} />
                {(() => {
                  const [ix, iy] = toS(iNew), [jx, jy] = toS(jNew), [ax, ay] = toS(singular && !playing ? v : Av), [vx, vy] = toS(v);
                  return (
                    <g fontSize={13} fontWeight={700}>
                      <text x={vx + 6} y={vy + 14} fill={C.muted} fontSize={11}>
                        v
                      </text>
                      <circle cx={ax} cy={ay} r={6} fill={C.purple} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag("v")} />
                      <text x={ax + 9} y={ay - 6} fill={C.purple}>
                        Av
                      </text>
                      <circle cx={ix} cy={iy} r={8} fill={C.bad} stroke={C.card} strokeWidth={2} className={playing ? "" : "cursor-grab"} onPointerDown={playing ? undefined : startDrag("i")} />
                      <text x={ix + 10} y={iy + 16} fill={C.bad}>
                        î
                      </text>
                      <circle cx={jx} cy={jy} r={8} fill={C.ok} stroke={C.card} strokeWidth={2} className={playing ? "" : "cursor-grab"} onPointerDown={playing ? undefined : startDrag("j")} />
                      <text x={jx - 16} y={jy - 8} fill={C.ok}>
                        ĵ
                      </text>
                    </g>
                  );
                })()}
              </g>
            </svg>
          </Stage>
          <Legend
            items={[
              [C.bad, "î′ = column 1 = [a, c]"],
              [C.ok, "ĵ′ = column 2 = [b, d]"],
              [sqColor, "unit square → area det"],
              [C.purple, "Av = x·î′ + y·ĵ′"],
            ]}
          />
          <Narration tone={singular ? "bad" : D < 0 ? "warn" : "default"}>
            {playing ? (
              <>Morphing the grid… every grid line stays straight and evenly spaced, and the origin never moves: that is what “linear” means.</>
            ) : isInverseShown ? (
              <>
                After A⁻¹ the grid is back to the identity: A⁻¹A = I, so v = [{fmt(v[0], 1)}, {fmt(v[1], 1)}] is recovered exactly.
              </>
            ) : singular ? (
              <>
                det(A) = 0: î′ and ĵ′ lie on the same line, so the whole plane is squashed onto a line. Information is destroyed, so there is <b>no inverse</b>.
              </>
            ) : D < 0 ? (
              <>
                det(A) = {fmt(D)} &lt; 0: ĵ′ is now <b>clockwise</b> of î′, space has been flipped like a mirror image (orientation reversed), and areas scale by |det| = {fmt(Math.abs(D))}.
              </>
            ) : (
              <>
                A·v = {fmt(v[0], 1)}·î′ + {fmt(v[1], 1)}·ĵ′ = [{fmt(Av[0])}, {fmt(Av[1])}]. Every area is multiplied by det(A) = {fmt(D)}.
              </>
            )}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Matrix A">
            <MatrixView m={A} name="A" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <SliderControl label="a (î′ x)" value={A[0]} min={-3} max={3} step={0.1} onChange={setEntry(0)} format={(x) => fmt(x, 1)} />
              <SliderControl label="b (ĵ′ x)" value={A[1]} min={-3} max={3} step={0.1} onChange={setEntry(1)} format={(x) => fmt(x, 1)} />
              <SliderControl label="c (î′ y)" value={A[2]} min={-3} max={3} step={0.1} onChange={setEntry(2)} format={(x) => fmt(x, 1)} />
              <SliderControl label="d (ĵ′ y)" value={A[3]} min={-3} max={3} step={0.1} onChange={setEntry(3)} format={(x) => fmt(x, 1)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={playing} onClick={() => (setShown(null), setAnim({ from: I, to: A, t: 0 }))}>
                <Play /> Animate I → A
              </Button>
              <Tip content={singular ? "det(A) = 0: the plane was flattened, nothing can un-flatten it." : "Apply A⁻¹ after A: the grid returns to I."}>
                <span>
                  <Button size="sm" variant="outline" disabled={playing || singular} onClick={() => setAnim({ from: A, to: I, t: 0 })}>
                    <Undo2 /> Apply A⁻¹
                  </Button>
                </span>
              </Tip>
            </div>
          </Panel>
          <div className="flex flex-wrap gap-1.5">
            {singular ? (
              <Badge variant="danger">SINGULAR (det = 0): space squashed!</Badge>
            ) : D < 0 ? (
              <Badge variant="warning">Mirror flip (det &lt; 0)</Badge>
            ) : (
              <Badge variant="success">Orientation preserved (det &gt; 0)</Badge>
            )}
            {Math.abs(Math.abs(D) - 1) < 1e-9 && <Badge variant="outline">area preserved</Badge>}
          </div>
          <Panel title="Inverse">
            <MatrixView m={Ainv} name="A⁻¹" />
            <div className="font-mono text-[11.5px] text-muted-foreground">A⁻¹ = (1 / (ad − bc)) · [[d, −b], [−c, a]]</div>
          </Panel>
          <StatGrid cols={2}>
            <Stat label="det(A) = ad − bc" value={fmt(D, 3)} tone={singular ? "bad" : D < 0 ? "warn" : "ok"} />
            <Stat label="v" value={`[${fmt(v[0], 1)}, ${fmt(v[1], 1)}]`} />
            <Stat label="A v" value={`[${fmt(apply(A, v)[0])}, ${fmt(apply(A, v)[1])}]`} tone="purple" />
            <Stat label="A⁻¹(A v)" value={singular ? "undefined" : `[${fmt(apply(Ainv, apply(A, v))[0])}, ${fmt(apply(Ainv, apply(A, v))[1])}]`} />
          </StatGrid>
        </div>
      </Split>
    </LabShell>
  );
}
