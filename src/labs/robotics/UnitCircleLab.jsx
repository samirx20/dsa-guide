import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, StatGrid, Stat, SwitchControl, useAnimationFrame, useSvgDrag } from "@/viz/kit";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const TAU = 2 * Math.PI;
const W = 560, H = 440, CX = 280, CY = 220, S = 100; // S = pixels per unit
const wrapToPi = (a) => {
  const w = Math.atan2(Math.sin(a), Math.cos(a));
  return w <= -Math.PI + 1e-12 ? Math.PI : w;
};
const fmt = (v, n = 3) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(n);
const deg = (r, n = 1) => `${fmt(r * R2D, n)}°`;

/** Math view: +x right, +y up. Robot view (REP-103 top-down): +x forward (up), +y left. */
const toScr = (robot) => (x, y) => (robot ? [CX - y * S, CY - x * S] : [CX + x * S, CY - y * S]);
const fromScr = (robot) => (sx, sy) => (robot ? [(CY - sy) / S, (CX - sx) / S] : [(sx - CX) / S, (CY - sy) / S]);

function Arrow({ from, to, color, width = 2.5, dash, head = 10, opacity = 1 }) {
  const [x1, y1] = from, [x2, y2] = to;
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

/** Polyline along a circle of radius r(t) from angle a0 to a1 (radians, may span several turns). */
function arcPoints(P, a0, a1, rad) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 0.04));
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n;
    const a = a0 + (a1 - a0) * t;
    const r = typeof rad === "function" ? rad(t) : rad;
    return P(r * Math.cos(a), r * Math.sin(a)).join(",");
  }).join(" ");
}

function Axes({ P, robot, extent = 2.15 }) {
  const ticks = [-2, -1, 1, 2];
  return (
    <g fontSize={11} fontFamily="ui-monospace, monospace">
      {ticks.map((t) => {
        const [ax, ay] = P(t, -extent), [bx, by] = P(t, extent);
        const [cx2, cy2] = P(-extent, t), [dx, dy] = P(extent, t);
        return (
          <g key={t}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C.grid} strokeWidth={1} />
            <line x1={cx2} y1={cy2} x2={dx} y2={dy} stroke={C.grid} strokeWidth={1} />
          </g>
        );
      })}
      <Arrow from={P(-extent, 0)} to={P(extent, 0)} color={C.muted} width={1.2} head={8} />
      <Arrow from={P(0, -extent)} to={P(0, extent)} color={C.muted} width={1.2} head={8} />
      {(() => {
        const [xx, xy] = P(extent, 0), [yx, yy] = P(0, extent);
        return (
          <>
            <text x={xx + (robot ? 8 : -4)} y={xy + (robot ? 12 : -8)} textAnchor={robot ? "start" : "end"} fill={C.fg} fontWeight={600}>
              {robot ? "+x forward" : "+x"}
            </text>
            <text x={yx + (robot ? 4 : 8)} y={yy + (robot ? -8 : 10)} textAnchor="start" fill={C.fg} fontWeight={600}>
              {robot ? "+y left" : "+y"}
            </text>
          </>
        );
      })()}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: unit circle + atan vs atan2                                  */
/* ------------------------------------------------------------------ */

const CIRCLE_PRESETS = [
  ["Quadrant I (+45°)", 45],
  ["Quadrant II (+135°)", 135],
  ["Quadrant III (−135°)", -135],
  ["Divide-by-zero (+90°)", 90],
  ["Multi-turn (+300°)", 300],
];

function UnitCircleTab({ robot }) {
  const [thDeg, setThDeg] = useState(135);
  const [r, setR] = useState(1);
  const [showAtan, setShowAtan] = useState(true);
  const P = toScr(robot);
  const th = thDeg * D2R;
  const x = r * Math.cos(th), y = r * Math.sin(th);
  const xZero = Math.abs(x) < 1e-9;
  const ratio = xZero ? (y >= 0 ? Infinity : -Infinity) : y / x;
  const naive = Math.atan(ratio);
  const good = Math.atan2(y, x);
  const wrapped = wrapToPi(th);
  const quadErr = !xZero && x < 0;
  const quadrant = xZero ? (y > 0 ? "+y axis" : "−y axis") : Math.abs(y) < 1e-9 ? (x > 0 ? "+x axis" : "−x axis") : x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III";

  const { svgProps, startDrag } = useSvgDrag((id, sx, sy) => {
    const [px, py] = fromScr(robot)(sx, sy);
    const a = Math.atan2(py, px);
    // unwrap: keep the multi-turn angle closest to where we were
    let t = a + TAU * Math.round((th - a) / TAU);
    t = Math.max(-TAU, Math.min(TAU, t));
    setThDeg(Math.round(t * R2D * 10) / 10);
    setR(Math.round(Math.max(0.5, Math.min(2, Math.hypot(px, py))) * 20) / 20);
  });

  const [ox, oy] = P(0, 0), [px, py] = P(x, y), [fx, fy] = P(x, 0);
  const tone = quadErr && showAtan ? "bad" : Math.abs(th) > Math.PI ? "warn" : "default";

  return (
    <Split>
      <div className="space-y-3">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" {...svgProps}>
            <Axes P={P} robot={robot} />
            <polyline points={arcPoints(P, 0, TAU, 1)} fill="none" stroke={C.ink} strokeWidth={1.4} opacity={0.6} />
            {Math.abs(r - 1) > 0.01 && <polyline points={arcPoints(P, 0, TAU, r)} fill="none" stroke={C.muted} strokeDasharray="4 4" />}
            {/* arc length s = r·θ along the circle (spirals out slightly per extra turn) */}
            <polyline points={arcPoints(P, 0, th, (t) => r + (Math.abs(th * t) > TAU ? 0.06 : 0))} fill="none" stroke={C.warn} strokeWidth={4.5} opacity={0.75} strokeLinecap="round" />
            <polyline points={arcPoints(P, 0, th, (t) => 0.28 + 0.05 * Math.floor(Math.abs(th * t) / TAU))} fill="none" stroke={C.warn} strokeWidth={1.6} />
            {(() => {
              const [lx, ly] = P(0.45 * Math.cos(wrapped / 2), 0.45 * Math.sin(wrapped / 2));
              return (
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize={13} fill={C.warn} fontWeight={700}>
                  θ
                </text>
              );
            })()}
            {/* cos (horizontal) and sin (vertical) shadows */}
            <line x1={ox} y1={oy} x2={fx} y2={fy} stroke={C.ok} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
            <line x1={fx} y1={fy} x2={px} y2={py} stroke={C.active} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
            <text x={(ox + fx) / 2 + (robot ? 10 : 0)} y={(oy + fy) / 2 + (robot ? 0 : y >= 0 ? 18 : -10)} textAnchor={robot ? "start" : "middle"} fontSize={12} fill={C.ok} fontWeight={600}>
              x = {fmt(x, 2)}
            </text>
            <text x={(fx + px) / 2 + (robot ? 0 : x >= 0 ? 8 : -8)} y={(fy + py) / 2 + (robot ? (x >= 0 ? -8 : 16) : 4)} textAnchor={robot ? "middle" : x >= 0 ? "start" : "end"} fontSize={12} fill={C.active} fontWeight={600}>
              y = {fmt(y, 2)}
            </text>
            <Arrow from={[ox, oy]} to={[px, py]} color={C.fg} width={2} />
            {showAtan && (
              <Arrow from={[ox, oy]} to={P(r * Math.cos(naive), r * Math.sin(naive))} color={C.bad} width={2.5} dash="7 5" opacity={0.9} />
            )}
            <circle cx={px} cy={py} r={11} fill={C.active} opacity={0.2} />
            <circle cx={px} cy={py} r={7} fill={C.active} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag("p")} />
            <text x={px + 12} y={py - 10} fontSize={12} fill={C.fg} fontWeight={600}>
              P
            </text>
          </svg>
        </Stage>
        <Legend
          items={[
            [C.ok, "x = r·cos θ (horizontal shadow)"],
            [C.active, "y = r·sin θ (vertical shadow)"],
            [C.warn, "arc length s = r·θ"],
            ...(showAtan ? [[C.bad, "naive atan(y/x)"]] : []),
          ]}
        />
        <Narration tone={tone}>
          {xZero ? (
            <>
              x = 0, so y / x divides by zero (C++ gives ±inf, and (0, 0) gives NaN). <b>atan2(y, x)</b> handles the axis directly and returns {deg(good)}.
            </>
          ) : quadErr && showAtan ? (
            <>
              P is in quadrant {quadrant}: x &lt; 0, so the sign information is lost in y / x = {fmt(ratio, 3)}. atan(y/x) returns {deg(naive)} and points the
              exact opposite way (off by 180°). <b>atan2</b> looks at the signs of x and y separately and returns {deg(good)}.
            </>
          ) : Math.abs(th) > Math.PI ? (
            <>
              θ = {deg(th)} is outside (−180°, 180°]. The point is the same as θ = {deg(wrapped)}: that is exactly what <b>wrap_to_pi</b> (= atan2(sin θ, cos θ)) returns.
            </>
          ) : (
            <>
              Quadrant {quadrant}: atan(y/x) and atan2(y, x) agree here ({deg(good)}). Drag P into the left half (x &lt; 0) to break the naive version.
            </>
          )}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Angle & radius">
          <SliderControl label="θ (degrees)" value={thDeg} min={-360} max={360} step={1} onChange={setThDeg} format={(v) => `${fmt(v, 0)}° = ${fmt(v * D2R, 3)} rad`} />
          <SliderControl label="radius r" value={r} min={0.5} max={2} step={0.1} onChange={setR} format={(v) => fmt(v, 2)} />
          <SwitchControl label="Show broken atan(y / x)" checked={showAtan} onChange={setShowAtan} id="show-broken-atan" />
          <div className="flex flex-wrap gap-1.5">
            {CIRCLE_PRESETS.map(([label, v]) => (
              <Button
                key={label}
                variant="outline"
                size="xs"
                onClick={() => {
                  setThDeg(v);
                  setR(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </Panel>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Quadrant {quadrant}</Badge>
          {showAtan && quadErr && <Badge variant="danger" className="animate-pulse">180° quadrant error!</Badge>}
          {xZero && <Badge variant="warning">y / x = ÷0</Badge>}
          {Math.abs(th) > Math.PI && <Badge variant="purple">needs wrap_to_pi</Badge>}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">rad</TableHead>
              <TableHead className="text-right">deg / value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-[12.5px]">
            {[
              ["θ", fmt(th), deg(th)],
              ["x = r cos θ", "", fmt(x)],
              ["y = r sin θ", "", fmt(y)],
              ["y / x", "", Number.isFinite(ratio) ? fmt(ratio) : ratio > 0 ? "+∞" : "−∞"],
              ["atan(y / x)", fmt(naive), deg(naive), quadErr ? "bad" : undefined],
              ["atan2(y, x)", fmt(good), deg(good), "ok"],
              ["wrap_to_pi(θ)", fmt(wrapped), deg(wrapped), "purple"],
              ["s = r·θ", "", `${fmt(r * th)} units`, "warn"],
              ["cos²θ + sin²θ", "", fmt(Math.cos(th) ** 2 + Math.sin(th) ** 2)],
            ].map(([k, a, b, tone]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5">{k}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a}</TableCell>
                <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={{ color: tone ? C[tone] : undefined }}>
                  {b}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: the ±π seam and wrap_to_pi steering                          */
/* ------------------------------------------------------------------ */

const SEAM_PRESETS = [
  ["1. Normal left turn", 10, 50],
  ["2. Seam +179° → −179°", 179, -179],
  ["3. Seam −175° → +175°", -175, 175],
  ["4. Multi-turn odometry", 720, 45],
];

function SeamTab({ robot }) {
  const [cur, setCur] = useState(179);
  const [tgt, setTgt] = useState(-179);
  const [u, setU] = useState(0); // turn animation progress 0..1
  const [playing, setPlaying] = useState(false);
  const P = toScr(robot);
  const c = cur * D2R, t = tgt * D2R;
  const raw = t - c;
  const wrapped = Math.atan2(Math.sin(raw), Math.cos(raw));

  useAnimationFrame((dt) => {
    setU((v) => {
      const n = Math.min(1, v + dt / 2.2);
      if (n >= 1) setPlaying(false);
      return n;
    });
  }, playing);

  const { svgProps, startDrag } = useSvgDrag((id, sx, sy) => {
    const [px, py] = fromScr(robot)(sx, sy);
    const a = Math.round(Math.atan2(py, px) * R2D);
    setU(0);
    if (id === "cur") setCur(a);
    else setTgt(a);
  });

  const headA = c + u * raw, headB = c + u * wrapped;
  const tip = (a, rr) => P(rr * Math.cos(a), rr * Math.sin(a));
  const [ox, oy] = P(0, 0);
  const seam0 = P(-0.75, 0), seam1 = P(-2.2, 0);

  return (
    <Split>
      <div className="space-y-3">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" {...svgProps}>
            <Axes P={P} robot={robot} />
            <polyline points={arcPoints(P, 0, TAU, 1.5)} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={0.5} />
            {/* the ±π branch cut */}
            <line x1={seam0[0]} y1={seam0[1]} x2={seam1[0]} y2={seam1[1]} stroke={C.purple} strokeWidth={6} opacity={0.35} strokeLinecap="round" />
            <text x={seam1[0] + (robot ? 8 : 4)} y={seam1[1] + (robot ? 4 : -10)} fontSize={11} fill={C.purple} fontWeight={600}>
              ±π seam
            </text>
            {/* naive Δθ (spirals outward per full turn) vs wrapped Δθ */}
            <polyline points={arcPoints(P, c, c + raw, (s) => 1.75 + 0.12 * Math.abs((raw * s) / TAU))} fill="none" stroke={C.bad} strokeWidth={2.5} strokeDasharray="6 4" />
            <polyline points={arcPoints(P, c, c + wrapped, 1.2)} fill="none" stroke={C.ok} strokeWidth={4} strokeLinecap="round" />
            <Arrow from={[ox, oy]} to={tip(c, 1.5)} color={C.active} width={2.5} />
            <Arrow from={[ox, oy]} to={tip(t, 1.5)} color={C.warn} width={2.5} />
            {u > 0 && (
              <>
                <Arrow from={[ox, oy]} to={tip(headA, 1.0)} color={C.bad} width={4} head={12} />
                <Arrow from={[ox, oy]} to={tip(headB, 0.8)} color={C.ok} width={4} head={12} />
              </>
            )}
            {[
              ["cur", c, C.active, "current"],
              ["tgt", t, C.warn, "target"],
            ].map(([id, a, col, label]) => {
              const [hx, hy] = tip(a, 1.5);
              const [lx, ly] = tip(a, 1.72);
              return (
                <g key={id}>
                  <circle cx={hx} cy={hy} r={8} fill={col} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag(id)} />
                  <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11} fill={col} fontWeight={600}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Stage>
        <Legend
          items={[
            [C.active, "current heading"],
            [C.warn, "target heading"],
            [C.bad, "Robot A: naive target − current"],
            [C.ok, "Robot B: wrap_to_pi(target − current)"],
          ]}
        />
        <Narration tone={Math.abs(raw) > Math.PI ? "bad" : "ok"}>
          {Math.abs(raw) > Math.PI ? (
            <>
              Naive subtraction says turn {deg(raw)}, so Robot A spins the long way (twisting its cables {fmt(Math.abs(raw * R2D), 0)}°). atan2(sin Δθ, cos Δθ) folds
              that back to {deg(wrapped)}: Robot B makes the short {wrapped >= 0 ? "left (CCW)" : "right (CW)"} turn.
            </>
          ) : (
            <>Both agree: Δθ = {deg(wrapped)} is already inside (−180°, 180°]. Load a seam preset to see the naive controller fail.</>
          )}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Headings">
          <SliderControl label="θ current" value={cur} min={-720} max={720} step={1} onChange={(v) => (setCur(v), setU(0))} format={(v) => `${v}°`} />
          <SliderControl label="θ target" value={tgt} min={-180} max={180} step={1} onChange={(v) => (setTgt(v), setU(0))} format={(v) => `${v}°`} />
          <div className="flex flex-wrap gap-1.5">
            {SEAM_PRESETS.map(([label, a, b]) => (
              <Button
                key={label}
                variant={label.startsWith("2") ? "default" : "outline"}
                size="xs"
                onClick={() => {
                  setCur(a);
                  setTgt(b);
                  setU(0);
                  setPlaying(false);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                setU(0);
                setPlaying(true);
              }}
            >
              <Play /> Animate the turn
            </Button>
            <Button variant="outline" size="sm" onClick={() => (setU(0), setPlaying(false))}>
              <RotateCcw /> Reset
            </Button>
          </div>
        </Panel>
        <StatGrid cols={2}>
          <Stat label="Robot A twist" value={`${fmt(Math.abs(u * raw * R2D), 0)}°`} tone="bad" />
          <Stat label="Robot B turn" value={`${fmt(u * wrapped * R2D, 0)}°`} tone="ok" />
        </StatGrid>
        <Table>
          <TableBody className="font-mono text-[12.5px]">
            {[
              ["Δθ = target − current", `${fmt(raw)} rad`, deg(raw), "Raw subtraction: can be anywhere in (−4π, 4π) here.", "bad"],
              ["cos(Δθ)", fmt(Math.cos(raw), 4), "", "x-coordinate of the Δθ direction on the unit circle."],
              ["sin(Δθ)", fmt(Math.sin(raw), 4), "", "y-coordinate of the Δθ direction on the unit circle."],
              ["atan2(sin, cos)", `${fmt(wrapped)} rad`, deg(wrapped), "Reads the direction back as an angle in (−π, π]: the shortest turn.", "ok"],
            ].map(([k, a, b, tip2, tone]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5">
                  <Tip content={tip2}>
                    <span className="cursor-help underline decoration-dotted underline-offset-2">{k}</span>
                  </Tip>
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a}</TableCell>
                <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={{ color: tone ? C[tone] : undefined }}>
                  {b}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Split>
  );
}

export default function UnitCircleLab({ variant = "atan2" }) {
  const [tab, setTab] = useState("unit-circle");
  const [robot, setRobot] = useState(false);
  return (
    <LabShell
      title={variant === "atan2" ? "Unit Circle, Radians & Four-Quadrant atan2" : "Unit Circle Explorer"}
      description="Drag P around the circle: cos and sin are just its shadows on the axes. Then watch atan(y/x) point the wrong way in quadrants II and III while atan2 never does."
      badges={["cos θ, sin θ", "atan2(y, x)", "wrap_to_pi"]}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="unit-circle">Unit circle & atan2</TabsTrigger>
            <TabsTrigger value="angle-wrapping">±π seam & wrap_to_pi</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto w-64">
          <SwitchControl label="Robot view (REP-103)" hint="+x forward (up), +y left" checked={robot} onChange={setRobot} id="rep103" />
        </div>
      </div>
      {tab === "unit-circle" ? <UnitCircleTab robot={robot} /> : <SeamTab robot={robot} />}
    </LabShell>
  );
}
