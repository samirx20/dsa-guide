import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, SwitchControl, svgPoint, useSvgDrag } from "@/viz/kit";

const DEG = 180 / Math.PI;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Forward kinematics: elbow + gripper positions. */
function fk(L1, L2, t1, t2) {
  const elbow = [L1 * Math.cos(t1), L1 * Math.sin(t1)];
  return { elbow, tip: [elbow[0] + L2 * Math.cos(t1 + t2), elbow[1] + L2 * Math.sin(t1 + t2)] };
}

/** Analytical IK via the law of cosines (chapter §3). Unreachable targets get the closest pose. */
function ik(L1, L2, x, y, up) {
  const r = Math.hypot(x, y);
  const cRaw = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const rMax = L1 + L2, rMin = Math.abs(L1 - L2);
  if (r > rMax + 1e-9) return { t1: Math.atan2(y, x), t2: 0, reach: "far", cRaw, r };
  if (r < rMin - 1e-9) return { t1: wrap(Math.atan2(y, x) + (L1 >= L2 ? 0 : Math.PI)), t2: Math.PI, reach: "near", cRaw, r };
  const c2 = Math.max(-1, Math.min(1, cRaw));
  const s2 = (up ? -1 : 1) * Math.sqrt(1 - c2 * c2);
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2);
  return { t1: wrap(t1), t2, reach: "ok", cRaw, r };
}

/** 2x2 Jacobian, its determinant, and the manipulability ellipse of J Jᵀ. */
function jacobian(L1, L2, t1, t2) {
  const s1 = Math.sin(t1), c1 = Math.cos(t1), s12 = Math.sin(t1 + t2), c12 = Math.cos(t1 + t2);
  const J = [
    [-L1 * s1 - L2 * s12, -L2 * s12],
    [L1 * c1 + L2 * c12, L2 * c12],
  ];
  const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  const a = J[0][0] ** 2 + J[0][1] ** 2, b = J[0][0] * J[1][0] + J[0][1] * J[1][1], d = J[1][0] ** 2 + J[1][1] ** 2;
  const m = (a + d) / 2, q = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  return { J, det, ax1: Math.sqrt(m + q), ax2: Math.sqrt(Math.max(0, m - q)), phi: 0.5 * Math.atan2(2 * b, a - d) };
}

const IK_PRESETS = [
  { label: "Target A (1, 1)", p: [1, 1] },
  { label: "Target B (0, 2)", p: [0, 2] },
  { label: "Target C (2.5, 0)", p: [2.5, 0] },
];
const FK_PRESETS = [
  { label: "Home (0°, 0°)", q: [0, 0] },
  { label: "L-shape (0°, 90°)", q: [0, 90] },
  { label: "Vertical (90°, 0°)", q: [90, 0] },
  { label: "Folded (45°, 180°)", q: [45, 180] },
];

const W = 560, H = 440, O = [W / 2, H / 2];
const ELLIPSE_SCALE = 0.35; // seconds: draws tip velocity for 1 rad/s joint-speed budget

function ArmDrawing({ L1, L2, t1, t2, color, ghost, s }) {
  const { elbow, tip } = fk(L1, L2, t1, t2);
  const P = (p) => [O[0] + p[0] * s, O[1] - p[1] * s];
  const [e, g] = [P(elbow), P(tip)];
  const w = ghost ? 5 : 10;
  return (
    <g opacity={ghost ? 0.35 : 1} strokeDasharray={ghost ? "6 5" : undefined}>
      <line x1={O[0]} y1={O[1]} x2={e[0]} y2={e[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <line x1={e[0]} y1={e[1]} x2={g[0]} y2={g[1]} stroke={color} strokeWidth={w * 0.8} strokeLinecap="round" opacity={0.85} />
      {!ghost && (
        <>
          <circle cx={O[0]} cy={O[1]} r={9} fill={C.card} stroke={C.fg} strokeWidth={2} />
          <circle cx={e[0]} cy={e[1]} r={7} fill={C.card} stroke={C.fg} strokeWidth={2} />
          <circle cx={g[0]} cy={g[1]} r={5} fill={C.fg} />
        </>
      )}
    </g>
  );
}

export default function ArmIkLab() {
  const [mode, setMode] = useState("ik");
  const [L1, setL1] = useState(1.0);
  const [L2, setL2] = useState(1.0);
  const [posture, setPosture] = useState("down");
  const [target, setTarget] = useState([1, 1]);
  const [q, setQ] = useState([0, 90]); // FK joint angles (deg)
  const [ghost, setGhost] = useState(true);
  const [showEllipse, setShowEllipse] = useState(true);
  const [showCols, setShowCols] = useState(false);

  const s = 190 / Math.max(L1 + L2, 1.2); // px per metre
  const toWorld = (px, py) => {
    const lim = (W / 2 - 8) / s;
    return [Math.max(-lim, Math.min(lim, (px - O[0]) / s)), Math.max(-(H / 2 - 8) / s, Math.min((H / 2 - 8) / s, (O[1] - py) / s))];
  };
  const { svgProps, startDrag } = useSvgDrag((_, x, y) => setTarget(toWorld(x, y)));

  const sol = ik(L1, L2, target[0], target[1], posture === "up");
  const alt = ik(L1, L2, target[0], target[1], posture !== "up");
  const t1 = mode === "ik" ? sol.t1 : q[0] / DEG;
  const t2 = mode === "ik" ? sol.t2 : q[1] / DEG;
  const { tip } = fk(L1, L2, t1, t2);
  const jac = jacobian(L1, L2, t1, t2);
  const singular = Math.abs(jac.det) < 0.1;
  const reach = mode === "ik" ? sol.reach : "ok";
  const P = (p) => [O[0] + p[0] * s, O[1] - p[1] * s];
  const tipPx = P(tip);
  const tgtPx = P(target);
  const rTarget = Math.hypot(...(mode === "ik" ? target : tip));
  const gamma = Math.atan2(...(mode === "ik" ? [target[1], target[0]] : [tip[1], tip[0]]));

  const status =
    reach === "far" ? (
      <Badge variant="danger">Out of reach (r &gt; L₁+L₂)</Badge>
    ) : reach === "near" ? (
      <Badge variant="danger">Inside dead zone (r &lt; |L₁−L₂|)</Badge>
    ) : singular ? (
      <Badge variant="warning">Singularity warning: |det J| = {Math.abs(jac.det).toFixed(3)} &lt; 0.1</Badge>
    ) : (
      <Badge variant="success">Reachable · |det J| = {Math.abs(jac.det).toFixed(2)}</Badge>
    );

  const narration =
    mode === "fk"
      ? `FK is always unique: gripper = (L₁cosθ₁ + L₂cos(θ₁+θ₂), L₁sinθ₁ + L₂sin(θ₁+θ₂)) = (${tip[0].toFixed(2)}, ${tip[1].toFixed(2)}) m. ` +
        (singular ? `θ₂ = ${q[1]}° makes sin θ₂ ≈ 0: both Jacobian columns line up and the ellipse collapses to a line — the tip cannot move radially.` : `The ellipse shows which directions the tip can move fastest for a unit joint-speed budget.`)
      : reach === "far"
        ? `r = ${sol.r.toFixed(2)} m > L₁+L₂ = ${(L1 + L2).toFixed(2)} m, so cos θ₂ = ${sol.cRaw.toFixed(3)} > 1 — acos would return NaN. The solver aborts and the arm stretches toward the target (a singular pose).`
        : reach === "near"
          ? `r = ${sol.r.toFixed(2)} m < |L₁−L₂| = ${Math.abs(L1 - L2).toFixed(2)} m: the target sits in the dead zone, cos θ₂ = ${sol.cRaw.toFixed(3)} < −1. The closest the gripper can get is fully folded.`
          : `cos θ₂ = (r² − L₁² − L₂²)/(2L₁L₂) = ${sol.cRaw.toFixed(3)} → θ₂ = ${(t2 * DEG).toFixed(1)}° (${posture === "up" ? "−√ branch, elbow-up" : "+√ branch, elbow-down"}); θ₁ = γ − β = ${(gamma * DEG).toFixed(1)}° − ${(wrap(gamma - t1) * DEG).toFixed(1)}° = ${(t1 * DEG).toFixed(1)}°.` +
            (singular ? " The target is on a workspace boundary, so the arm is (nearly) singular." : "");

  const rows = [
    ["x, y", `(${tip[0].toFixed(3)}, ${tip[1].toFixed(3)}) m`, "Gripper position from forward kinematics"],
    ["r", `${rTarget.toFixed(3)} m`, "Distance from shoulder to the target (IK) or gripper (FK)"],
    ["cos θ₂", mode === "ik" ? sol.cRaw.toFixed(3) : Math.cos(t2).toFixed(3), "(r² − L₁² − L₂²) / (2 L₁ L₂) — must lie in [−1, 1] to be reachable"],
    ["θ₁", `${(t1 * DEG).toFixed(1)}°`, "Shoulder angle = atan2(y, x) − atan2(L₂ sin θ₂, L₁ + L₂ cos θ₂)"],
    ["θ₂", `${(t2 * DEG).toFixed(1)}°`, "Elbow angle relative to link 1; ≥ 0 elbow-down, ≤ 0 elbow-up"],
    ["det J", jac.det.toFixed(3), "det J = L₁ L₂ sin θ₂ — zero at θ₂ = 0° or ±180°"],
  ];

  // manipulability ellipse (y flipped in SVG -> negate angle)
  const ell = { rx: jac.ax1 * ELLIPSE_SCALE * s, ry: Math.max(jac.ax2 * ELLIPSE_SCALE * s, 0.8), rot: -jac.phi * DEG };

  return (
    <LabShell
      title="2-Link Arm — FK, Analytical IK & Jacobian Singularities"
      description="Drag the target: the law of cosines picks θ₂, atan2 picks θ₁. Watch the manipulability ellipse flatten as the arm approaches a singularity."
      badges={["Law of cosines", "det J = L₁L₂ sin θ₂"]}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="ik">Inverse kinematics (drag target)</TabsTrigger>
            <TabsTrigger value="fk">Forward kinematics (drive joints)</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto">{status}</div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none font-mono" {...svgProps}>
              <rect
                x={0}
                y={0}
                width={W}
                height={H}
                fill="transparent"
                onPointerDown={(e) => {
                  if (mode !== "ik") return;
                  const p = svgPoint(e.currentTarget.ownerSVGElement, e);
                  setTarget(toWorld(p.x, p.y));
                  startDrag("target")(e);
                }}
                style={{ cursor: mode === "ik" ? "crosshair" : "default" }}
              />
              {/* grid */}
              {Array.from({ length: 13 }, (_, i) => i - 6).map((m) => (
                <g key={m} pointerEvents="none">
                  <line x1={O[0] + m * 0.5 * s} x2={O[0] + m * 0.5 * s} y1={0} y2={H} stroke={C.grid} opacity={m === 0 ? 1 : 0.5} />
                  <line y1={O[1] + m * 0.5 * s} y2={O[1] + m * 0.5 * s} x1={0} x2={W} stroke={C.grid} opacity={m === 0 ? 1 : 0.5} />
                </g>
              ))}
              {/* reachable annulus */}
              <path
                pointerEvents="none"
                fillRule="evenodd"
                fill={C.active}
                opacity={0.08}
                d={`M ${O[0] + (L1 + L2) * s} ${O[1]} a ${(L1 + L2) * s} ${(L1 + L2) * s} 0 1 0 ${-2 * (L1 + L2) * s} 0 a ${(L1 + L2) * s} ${(L1 + L2) * s} 0 1 0 ${2 * (L1 + L2) * s} 0 Z
                    M ${O[0] + Math.abs(L1 - L2) * s} ${O[1]} a ${Math.abs(L1 - L2) * s} ${Math.abs(L1 - L2) * s} 0 1 0 ${-2 * Math.abs(L1 - L2) * s} 0 a ${Math.abs(L1 - L2) * s} ${Math.abs(L1 - L2) * s} 0 1 0 ${2 * Math.abs(L1 - L2) * s} 0 Z`}
              />
              <circle pointerEvents="none" cx={O[0]} cy={O[1]} r={(L1 + L2) * s} fill="none" stroke={C.active} strokeDasharray="6 5" strokeWidth={1.4} />
              {Math.abs(L1 - L2) > 0.01 && <circle pointerEvents="none" cx={O[0]} cy={O[1]} r={Math.abs(L1 - L2) * s} fill={C.bad} fillOpacity={0.06} stroke={C.bad} strokeDasharray="4 4" strokeWidth={1.2} />}
              <text pointerEvents="none" x={O[0] + (L1 + L2) * s * 0.71 + 6} y={O[1] - (L1 + L2) * s * 0.71 - 4} fontSize={10.5} fill={C.active}>
                r = L₁+L₂
              </text>
              {Math.abs(L1 - L2) > 0.15 && (
                <text pointerEvents="none" x={O[0]} y={O[1] + Math.abs(L1 - L2) * s + 13} fontSize={10.5} fill={C.bad} textAnchor="middle">
                  dead zone |L₁−L₂|
                </text>
              )}
              {/* r line + gamma arc */}
              {mode === "ik" && (
                <g pointerEvents="none">
                  <line x1={O[0]} y1={O[1]} x2={tgtPx[0]} y2={tgtPx[1]} stroke={C.muted} strokeDasharray="3 4" />
                  <path
                    d={`M ${O[0] + 30} ${O[1]} A 30 30 0 ${Math.abs(gamma) > Math.PI ? 1 : 0} ${gamma > 0 ? 0 : 1} ${O[0] + 30 * Math.cos(gamma)} ${O[1] - 30 * Math.sin(gamma)}`}
                    fill="none"
                    stroke={C.warn}
                    strokeWidth={1.5}
                  />
                  <text x={O[0] + 36 * Math.cos(gamma / 2) + 2} y={O[1] - 36 * Math.sin(gamma / 2) + 4} fontSize={11} fill={C.warn}>
                    γ
                  </text>
                </g>
              )}
              <g pointerEvents="none">
                {mode === "ik" && ghost && alt.reach === "ok" && Math.abs(alt.t2 - sol.t2) > 1e-3 && <ArmDrawing L1={L1} L2={L2} t1={alt.t1} t2={alt.t2} color={C.purple} ghost s={s} />}
                <ArmDrawing L1={L1} L2={L2} t1={t1} t2={t2} color={reach === "ok" ? C.ink : C.bad} s={s} />
                {showEllipse && (
                  <ellipse cx={tipPx[0]} cy={tipPx[1]} rx={ell.rx} ry={ell.ry} transform={`rotate(${ell.rot} ${tipPx[0]} ${tipPx[1]})`} fill={singular ? C.warn : C.ok} fillOpacity={0.16} stroke={singular ? C.warn : C.ok} strokeWidth={2} />
                )}
                {showCols &&
                  [0, 1].map((c) => {
                    const v = [jac.J[0][c] * ELLIPSE_SCALE * s, -jac.J[1][c] * ELLIPSE_SCALE * s];
                    return (
                      <g key={c}>
                        <line x1={tipPx[0]} y1={tipPx[1]} x2={tipPx[0] + v[0]} y2={tipPx[1] + v[1]} stroke={c ? C.purple : C.active} strokeWidth={2.5} markerEnd={`url(#arm-head-${c})`} />
                        <text x={tipPx[0] + v[0] * 1.12} y={tipPx[1] + v[1] * 1.12 + 4} fontSize={10.5} fill={c ? C.purple : C.active} textAnchor="middle">
                          J{c + 1}
                        </text>
                      </g>
                    );
                  })}
              </g>
              <defs>
                {[C.active, C.purple].map((col, i) => (
                  <marker key={i} id={`arm-head-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={col} />
                  </marker>
                ))}
              </defs>
              {/* unreachable miss line */}
              {mode === "ik" && reach !== "ok" && <line pointerEvents="none" x1={tipPx[0]} y1={tipPx[1]} x2={tgtPx[0]} y2={tgtPx[1]} stroke={C.bad} strokeWidth={1.5} strokeDasharray="4 3" />}
              {/* target */}
              {mode === "ik" && (
                <g onPointerDown={startDrag("target")} style={{ cursor: "grab" }}>
                  <circle cx={tgtPx[0]} cy={tgtPx[1]} r={16} fill="transparent" />
                  <circle cx={tgtPx[0]} cy={tgtPx[1]} r={9} fill="none" stroke={reach === "ok" ? C.active : C.bad} strokeWidth={2.5} />
                  <line x1={tgtPx[0] - 14} x2={tgtPx[0] + 14} y1={tgtPx[1]} y2={tgtPx[1]} stroke={reach === "ok" ? C.active : C.bad} strokeWidth={1.5} />
                  <line y1={tgtPx[1] - 14} y2={tgtPx[1] + 14} x1={tgtPx[0]} x2={tgtPx[0]} stroke={reach === "ok" ? C.active : C.bad} strokeWidth={1.5} />
                  <text x={tgtPx[0] + 14} y={tgtPx[1] - 12} fontSize={11} fill={C.fg} pointerEvents="none">
                    ({target[0].toFixed(2)}, {target[1].toFixed(2)})
                  </text>
                </g>
              )}
              <text x={10} y={H - 10} fontSize={10.5} fill={C.muted} pointerEvents="none">
                grid = 0.5 m · shoulder at (0, 0)
              </text>
            </svg>
          </Stage>
          <Legend
            items={[
              [C.active, "Workspace L₁+L₂ / target"],
              [C.bad, "Dead zone |L₁−L₂| / unreachable"],
              ...(mode === "ik" && ghost ? [[C.purple, "Alternate IK posture"]] : []),
              [singular ? C.warn : C.ok, "Manipulability ellipse (J Jᵀ)"],
            ]}
          />
          <Narration tone={reach !== "ok" ? "bad" : singular ? "warn" : "default"}>{narration}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Links">
            <SliderControl label="L₁ (upper arm)" value={L1} min={0.4} max={1.5} step={0.05} onChange={setL1} format={(v) => `${v.toFixed(2)} m`} />
            <SliderControl label="L₂ (forearm)" value={L2} min={0.4} max={1.5} step={0.05} onChange={setL2} format={(v) => `${v.toFixed(2)} m`} />
          </Panel>
          {mode === "ik" ? (
            <Panel title="IK posture">
              <ToggleGroup type="single" value={posture} onValueChange={(v) => v && setPosture(v)}>
                <ToggleGroupItem value="down">Elbow-Down (θ₂ ≥ 0)</ToggleGroupItem>
                <ToggleGroupItem value="up">Elbow-Up (θ₂ ≤ 0)</ToggleGroupItem>
              </ToggleGroup>
              <SwitchControl label="Show ghost alternate posture" checked={ghost} onChange={setGhost} />
              <div className="flex flex-wrap gap-1.5">
                {IK_PRESETS.map((p) => (
                  <Button key={p.label} variant="outline" size="xs" onClick={() => setTarget(p.p)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </Panel>
          ) : (
            <Panel title="Joint space">
              <SliderControl label="θ₁ shoulder" value={q[0]} min={-180} max={180} step={1} onChange={(v) => setQ([v, q[1]])} format={(v) => `${v}°`} />
              <SliderControl label="θ₂ elbow" value={q[1]} min={-180} max={180} step={1} onChange={(v) => setQ([q[0], v])} format={(v) => `${v}°`} />
              <div className="flex flex-wrap gap-1.5">
                {FK_PRESETS.map((p) => (
                  <Button key={p.label} variant="outline" size="xs" onClick={() => setQ(p.q)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Jacobian view">
            <SwitchControl label="Manipulability ellipse" hint="Tip velocities reachable with ‖q̇‖ = 1 rad/s" checked={showEllipse} onChange={setShowEllipse} />
            <SwitchControl label="Jacobian columns J₁, J₂" hint="Tip velocity from spinning one joint alone" checked={showCols} onChange={setShowCols} />
          </Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([k, v, hint]) => (
                <TableRow key={k}>
                  <TableCell className="py-1.5 font-mono text-[12.5px]">
                    <Tip content={hint}>
                      <span className="cursor-help underline decoration-dotted underline-offset-2">{k}</span>
                    </Tip>
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: k === "det J" && singular ? C.warn : undefined }}>
                    {v}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="py-1.5 font-mono text-[12.5px]">J</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-[11.5px] tabular-nums">
                  [{jac.J[0][0].toFixed(2)}, {jac.J[0][1].toFixed(2)}]
                  <br />[{jac.J[1][0].toFixed(2)}, {jac.J[1][1].toFixed(2)}]
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Split>
    </LabShell>
  );
}
