import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, SwitchControl, useSvgDrag } from "@/viz/kit";

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
const W = 600, H = 460, OX = 220, OY = 250, S = 52; // S = pixels per metre
const toS = ([x, y]) => [OX + x * S, OY - y * S];
const fromS = (sx, sy) => [(sx - OX) / S, (OY - sy) / S];
const fmt = (v, n = 2) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(n);
const vfmt = (v, n = 2) => `[${fmt(v[0], n)}, ${fmt(v[1], n)}]`;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norm = (a) => Math.hypot(a[0], a[1]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Dry-run cases from the chapter (robot at origin).
const PRESETS = [
  { label: "1. Front-left (+45°)", p: [0, 0], h: [1, 0], t: [3, 3] },
  { label: "2. Pure right (−90°)", p: [0, 0], h: [1, 0], t: [0, -4] },
  { label: "3. Behind-left (+135°)", p: [0, 0], h: [1, 0], t: [-2, 2] },
  { label: "4. Rotated robot", p: [0, 0], h: [0.6, 0.8], t: [4, 3] },
];

function Arrow({ from, to, color, width = 2.5, dash, head = 11, opacity = 1 }) {
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

const pts = (arr) => arr.map((p) => toS(p).join(",")).join(" ");

export default function VectorLab({ variant = "dot-cross" }) {
  const [p, setP] = useState([0, 0]);
  const [h, setH] = useState([0.6, 0.8]);
  const [t, setT] = useState([4, 3]);
  const [normalize, setNormalize] = useState(true);
  const [showFov, setShowFov] = useState(true);
  const [fovHalf, setFovHalf] = useState(45);

  const { svgProps, startDrag } = useSvgDrag((id, sx, sy) => {
    const q = fromS(sx, sy).map((v) => Math.round(v * 10) / 10);
    const c = [clamp(q[0], -4, 7.2), clamp(q[1], -4.2, 4.6)];
    if (id === "robot") setP(c);
    else if (id === "target") setT(c);
    else {
      let v = sub(fromS(sx, sy), p);
      const n = norm(v);
      if (n < 1e-6) return;
      v = mul(v, clamp(n, 0.5, 3) / n);
      setH(v.map((x) => Math.round(x * 100) / 100));
    }
  });

  const d = sub(t, p);
  const hHat = mul(h, 1 / norm(h));
  const hv = normalize ? hHat : h; // the vector actually used in the formulas
  const dp = dot(hv, d);
  const cr = cross(hv, d);
  const fwd = dot(hHat, d); // true forward distance (metres)
  const lat = cross(hHat, d); // true lateral offset (metres)
  const steer = Math.atan2(cr, dp);
  const dHat = norm(d) > 1e-9 ? mul(d, 1 / norm(d)) : [0, 0];
  const cosA = clamp(dot(hHat, dHat), -1, 1);
  const inFov = norm(d) > 1e-9 && cosA >= Math.cos(fovHalf * D2R);
  const foot = add(p, mul(hHat, fwd));
  const head = Math.atan2(hHat[1], hHat[0]);
  const front = Math.abs(fwd) < 0.05 ? "abeam" : fwd > 0 ? "ahead" : "behind";
  const side = Math.abs(lat) < 0.05 ? "center" : lat > 0 ? "left" : "right";
  const sideColor = side === "left" ? C.purple : side === "right" ? C.bad : C.muted;

  const cone = (() => {
    const R = 7;
    const n = 30;
    const arr = [p];
    for (let k = 0; k <= n; k++) {
      const a = head - fovHalf * D2R + (2 * fovHalf * D2R * k) / n;
      arr.push(add(p, [R * Math.cos(a), R * Math.sin(a)]));
    }
    return arr;
  })();
  const steerArc = Array.from({ length: 25 }, (_, k) => {
    const a = head + (steer * k) / 24;
    return add(p, [1.3 * Math.cos(a), 1.3 * Math.sin(a)]);
  });
  const body = [
    [-0.45, -0.32],
    [0.45, -0.32],
    [0.45, 0.32],
    [-0.45, 0.32],
  ].map(([x, y]) => add(p, [x * hHat[0] - y * hHat[1], x * hHat[1] + y * hHat[0]]));

  const randomize = () => {
    const r = () => Math.round((Math.random() * 8 - 4) * 10) / 10;
    const a = Math.random() * 2 * Math.PI;
    setP([r() / 2, r() / 2]);
    setH([Math.round(Math.cos(a) * 100) / 100, Math.round(Math.sin(a) * 100) / 100]);
    setT([r() + 2, r()]);
  };

  return (
    <LabShell
      title={variant === "dot-cross" ? "Dot & Cross Product Sandbox — Ahead/Behind & Steer Left/Right" : "Vector Sandbox"}
      description="Drag the robot, the tip of its heading h, and the target. The dot product casts d's shadow onto the heading (how far ahead); the 2D cross product gives the signed sideways offset (which way to steer)."
      badges={["ĥ · d", "ĥ ×₂D d", "atan2(cross, dot)"]}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((pr) => (
          <Button
            key={pr.label}
            variant="outline"
            size="sm"
            onClick={() => {
              setP(pr.p);
              setH(pr.h);
              setT(pr.t);
            }}
          >
            {pr.label}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={randomize}>
          <Shuffle /> Random
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" {...svgProps}>
              {/* grid */}
              {Array.from({ length: 15 }, (_, k) => k - 5).map((x) => (
                <line key={`x${x}`} x1={OX + x * S} x2={OX + x * S} y1={0} y2={H} stroke={C.grid} strokeWidth={x === 0 ? 1.6 : 1} />
              ))}
              {Array.from({ length: 13 }, (_, k) => k - 6).map((y) => (
                <line key={`y${y}`} y1={OY - y * S} y2={OY - y * S} x1={0} x2={W} stroke={C.grid} strokeWidth={y === 0 ? 1.6 : 1} />
              ))}
              <text x={W - 8} y={OY - 6} textAnchor="end" fontSize={11} fill={C.muted}>
                +x (m)
              </text>
              <text x={OX + 6} y={14} fontSize={11} fill={C.muted}>
                +y (m)
              </text>
              {/* FOV cone */}
              {showFov && <polygon points={pts(cone)} fill={inFov ? C.ok : C.active} opacity={0.1} stroke={inFov ? C.ok : C.active} strokeOpacity={0.5} strokeDasharray="5 4" />}
              {/* heading axis (infinite line through the robot) */}
              <line {...(() => { const [x1, y1] = toS(add(p, mul(hHat, -12))); const [x2, y2] = toS(add(p, mul(hHat, 12))); return { x1, y1, x2, y2 }; })()} stroke={C.muted} strokeDasharray="3 5" />
              {/* cross-product parallelogram */}
              <polygon points={pts([p, add(p, hv), add(add(p, hv), d), add(p, d)])} fill={sideColor} opacity={0.13} stroke={sideColor} strokeOpacity={0.4} />
              {/* projection: shadow + perpendicular drop + lateral bar */}
              <line {...(() => { const [x1, y1] = toS(p); const [x2, y2] = toS(foot); return { x1, y1, x2, y2 }; })()} stroke={C.warn} strokeWidth={7} strokeLinecap="round" opacity={0.75} />
              <line {...(() => { const [x1, y1] = toS(t); const [x2, y2] = toS(foot); return { x1, y1, x2, y2 }; })()} stroke={sideColor} strokeWidth={3} strokeDasharray="6 4" />
              {(() => {
                const [fx, fy] = toS(foot);
                return <circle cx={fx} cy={fy} r={4} fill={C.warn} />;
              })()}
              {/* steering arc */}
              {norm(d) > 1e-6 && <polyline points={pts(steerArc)} fill="none" stroke={sideColor} strokeWidth={2.5} />}
              {/* d and h */}
              <Arrow from={p} to={t} color={C.active} width={3} />
              <polygon points={pts(body)} fill={C.card} stroke={C.ok} strokeWidth={2} className="cursor-move" onPointerDown={startDrag("robot")} />
              <Arrow from={p} to={add(p, h)} color={C.ok} width={3.5} />
              {(() => {
                const [hx, hy] = toS(add(p, h));
                const [tx, ty] = toS(t);
                const [mx, my] = toS(add(p, mul(d, 0.5)));
                const [fx, fy] = toS(add(p, mul(hHat, fwd / 2)));
                return (
                  <g fontSize={12} fontWeight={600}>
                    <circle cx={hx} cy={hy} r={7} fill={C.ok} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag("h")} />
                    <text x={hx + 9} y={hy - 7} fill={C.ok}>
                      {normalize ? "ĥ" : "h"}
                    </text>
                    <circle cx={tx} cy={ty} r={9} fill={C.active} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag("target")} />
                    <text x={tx + 11} y={ty - 8} fill={C.active}>
                      target
                    </text>
                    <text x={mx + 6} y={my - 6} fill={C.active}>
                      d
                    </text>
                    <text x={fx + 6} y={fy + 16} fill={C.warn}>
                      ĥ·d = {fmt(fwd, 2)} m
                    </text>
                  </g>
                );
              })()}
            </svg>
          </Stage>
          <Legend
            items={[
              [C.ok, "heading h"],
              [C.active, "d = target − robot"],
              [C.warn, "dot shadow (forward distance)"],
              [sideColor, "cross: parallelogram area = sideways offset"],
              ...(showFov ? [[inFov ? C.ok : C.active, "camera FOV cone"]] : []),
            ]}
          />
          <Narration tone={front === "behind" ? "bad" : inFov ? "ok" : "active"}>
            The target is <b>{fmt(Math.abs(fwd))} m {front === "behind" ? "behind" : front === "abeam" ? "abeam (dot ≈ 0)" : "ahead"}</b> and{" "}
            <b>
              {fmt(Math.abs(lat))} m to the {side === "center" ? "dead centre" : side}
            </b>
            . atan2(cross, dot) = {fmt(steer * R2D, 1)}°, so the controller should{" "}
            {side === "center" ? (front === "behind" ? "turn around (exactly behind)" : "drive straight") : side === "left" ? "steer LEFT (+ω, CCW)" : "steer RIGHT (−ω, CW)"}.
            {!normalize && Math.abs(norm(h) - 1) > 0.02 && (
              <>
                {" "}
                <span className="text-viz-bad">Not normalized: h·d = {fmt(dp)} is {fmt(norm(h))}× the true distance.</span>
              </>
            )}
          </Narration>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={front === "ahead" ? "success" : front === "abeam" ? "warning" : "danger"}>
              {front === "ahead" ? "AHEAD (dot > 0)" : front === "abeam" ? "ABEAM (dot = 0)" : "BEHIND (dot < 0)"}
            </Badge>
            <Badge variant={side === "left" ? "purple" : side === "right" ? "danger" : "outline"}>
              {side === "left" ? "STEER LEFT (+ω)" : side === "right" ? "STEER RIGHT (−ω)" : "ON COURSE (cross = 0)"}
            </Badge>
            {showFov && <Badge variant={inFov ? "success" : "outline"}>{inFov ? "IN FOV" : "OUT OF FOV"}</Badge>}
          </div>
          <Panel title="Controls">
            <SwitchControl label="Normalize h before dot / cross" hint="Off: formulas use the raw h (Mistake 2)" checked={normalize} onChange={setNormalize} id="normalize-h" />
            <SwitchControl label="Show camera FOV cone" checked={showFov} onChange={setShowFov} id="show-fov-cone" />
            <SliderControl label="FOV half-angle α" value={fovHalf} min={15} max={90} step={1} onChange={setFovHalf} format={(v) => `${v}° (cos α = ${Math.cos(v * D2R).toFixed(3)})`} />
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-[12.5px]">
              {[
                ["p_robot", vfmt(p, 1)],
                ["p_target", vfmt(t, 1)],
                ["d = target − robot", vfmt(d), "active"],
                ["‖d‖", `${fmt(norm(d), 3)} m`],
                [normalize ? "ĥ (unit)" : "h (raw)", `${vfmt(hv)}  ‖·‖=${fmt(norm(hv))}`, "ok"],
                [`${normalize ? "ĥ" : "h"} · d = hₓdₓ + h_yd_y`, fmt(dp, 3), "warn"],
                [`${normalize ? "ĥ" : "h"} ×₂D d = hₓd_y − h_ydₓ`, fmt(cr, 3), side === "left" ? "purple" : side === "right" ? "bad" : undefined],
                ["atan2(cross, dot)", `${fmt(steer * R2D, 2)}°`],
                ["θ = acos(clamp(ĥ·d̂))", `${fmt(Math.acos(cosA) * R2D, 2)}°`],
                ["ĥ·d̂ ≥ cos α ?", `${fmt(cosA, 3)} ${inFov ? "≥" : "<"} ${fmt(Math.cos(fovHalf * D2R), 3)}`, inFov ? "ok" : undefined],
              ].map(([k, v, tone]) => (
                <TableRow key={k}>
                  <TableCell className="py-1.5">{k}</TableCell>
                  <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={{ color: tone ? C[tone] : undefined }}>
                    {v}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Split>
    </LabShell>
  );
}
