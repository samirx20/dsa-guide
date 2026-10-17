import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, SliderControl, Split, Stage, SwitchControl, useSvgDrag } from "@/viz/kit";
import { D2R, R2D, apply, compose, cycleCheck, inverse, lookup, pose, toMatrix, worldPoses } from "./_FramesLab-se2";

const fmt = (v, n = 2) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(n);
const pfmt = (p) => `(${fmt(p[0])}, ${fmt(p[1])})`;
const posefmt = (T) => `(${fmt(T.x, 3)}, ${fmt(T.y, 3)}, ${fmt(T.th * R2D, 1)}°)`;

function Arrow({ from, to, color, width = 2.5, dash, head = 9, opacity = 1 }) {
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

/** Draws a coordinate frame (pose given in world) through the screen mapping `scr(worldPoint)`. */
function FrameGlyph({ T, scr, color, label, len = 0.55, labelDx = 8, labelDy = 16 }) {
  const o = scr([T.x, T.y]);
  const xt = scr(apply(T, [len, 0]));
  const yt = scr(apply(T, [0, len]));
  return (
    <g>
      <Arrow from={o} to={xt} color={color} width={2.6} />
      <Arrow from={o} to={yt} color={color} width={1.6} opacity={0.75} />
      <circle cx={o[0]} cy={o[1]} r={3.2} fill={color} />
      <text x={xt[0] + 2} y={xt[1] - 3} fontSize={10} fill={color}>
        x
      </text>
      <text x={yt[0] + 2} y={yt[1] - 3} fontSize={10} fill={color} opacity={0.8}>
        y
      </text>
      {label && (
        <text x={o[0] + labelDx} y={o[1] + labelDy} fontSize={12} fontWeight={700} fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}

/** 3×3 homogeneous matrix with the R block (ok), t column (active) and [0 0 1] row (muted). */
function HMatrix({ T, name }) {
  const M = toMatrix(T);
  const cls = (i, j) => (i === 2 ? "text-muted-foreground" : j === 2 ? "bg-viz-active/12 text-viz-active" : "bg-viz-ok/12 text-viz-ok");
  return (
    <div className="space-y-1">
      <div className="font-mono text-[12px] font-semibold">{name}</div>
      <div className="grid grid-cols-3 gap-0.5 rounded-md border-x-2 border-foreground/50 px-1 py-0.5 font-mono text-[11.5px]">
        {M.flatMap((row, i) =>
          row.map((v, j) => (
            <span key={`${i}${j}`} className={`rounded px-1 text-right tabular-nums ${cls(i, j)}`}>
              {fmt(v, 2)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function Grid({ scr, xr, yr }) {
  const out = [];
  for (let x = xr[0]; x <= xr[1]; x++) {
    const a = scr([x, yr[0]]), b = scr([x, yr[1]]);
    out.push(<line key={`gx${x}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.grid} strokeWidth={x === 0 ? 1.5 : 1} />);
  }
  for (let y = yr[0]; y <= yr[1]; y++) {
    const a = scr([xr[0], y]), b = scr([xr[1], y]);
    out.push(<line key={`gy${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.grid} strokeWidth={y === 0 ? 1.5 : 1} />);
  }
  return <g>{out}</g>;
}

/* ------------------------------------------------------------------ */
/* Variant "se2": World → Base → LiDAR chain                           */
/* ------------------------------------------------------------------ */

const W1 = 600, H1 = 440;

function Se2Chain() {
  const [tx, setTx] = useState(3);
  const [ty, setTy] = useState(2);
  const [th, setTh] = useState(90);
  const [sx, setSx] = useState(0.5);
  const [sy, setSy] = useState(0.2);
  const [al, setAl] = useState(0);
  const [P, setP] = useState([3.8, 4.5]); // obstacle, fixed in the world
  const [view, setView] = useState("W");
  const [bug, setBug] = useState(false);

  const WB = pose(tx, ty, th * D2R);
  const BS = pose(sx, sy, al * D2R);
  const WS = compose(WB, BS);
  const BW = inverse(WB);
  const SW = inverse(WS);
  const pB = apply(BW, P);
  const pS = apply(SW, P);

  // camera: express everything in the chosen frame, then map to screen
  const Tview = view === "W" ? pose(0, 0, 0) : view === "B" ? WB : WS;
  const Vinv = inverse(Tview);
  const [OX, OY, SC] = view === "W" ? [60, 410, 72] : [240, 250, 72];
  const scr = (q) => {
    const v = apply(Vinv, q);
    return [OX + v[0] * SC, OY - v[1] * SC];
  };
  const unscr = (x, y) => apply(Tview, [(x - OX) / SC, (OY - y) / SC]);
  const gridRange = view === "W" ? [[-2, 10], [-1, 8]] : [[-6, 8], [-5, 5]];

  const { svgProps, startDrag } = useSvgDrag((id, x, y) => {
    const w = unscr(x, y).map((v) => Math.round(v * 10) / 10);
    if (id === "P") setP(w);
    else if (id === "robot" && view === "W") {
      setTx(Math.max(-1, Math.min(7, w[0])));
      setTy(Math.max(-1, Math.min(6, w[1])));
    }
  });

  const body = [[-0.45, -0.35], [0.45, -0.35], [0.55, 0], [0.45, 0.35], [-0.45, 0.35]].map((p) => scr(apply(WB, p)));
  const wheels = [[-0.15, 0.42], [-0.15, -0.42]].map(([x, y]) => [scr(apply(WB, [x - 0.2, y])), scr(apply(WB, [x + 0.2, y]))]);
  const fovHalf = 60 * D2R, fovR = 3.5;
  const cone = [scr([WS.x, WS.y])];
  for (let k = 0; k <= 24; k++) {
    const a = -fovHalf + (2 * fovHalf * k) / 24;
    cone.push(scr(apply(WS, [fovR * Math.cos(a), fovR * Math.sin(a)])));
  }
  const inFov = Math.hypot(pS[0], pS[1]) <= fovR && Math.abs(Math.atan2(pS[1], pS[0])) <= fovHalf;
  const ghost = apply(WB, [-tx, -ty]); // where the robot *thinks* the world origin is with the naive −t inverse
  const pPx = scr(P);

  return (
    <Split>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted-foreground">View in frame</span>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)}>
            <ToggleGroupItem value="W">World {"{W}"}</ToggleGroupItem>
            <ToggleGroupItem value="B">Base {"{B}"}</ToggleGroupItem>
            <ToggleGroupItem value="S">LiDAR {"{S}"}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Stage>
          <svg viewBox={`0 0 ${W1} ${H1}`} className="w-full select-none" {...svgProps}>
            <Grid scr={scr} xr={gridRange[0].map((v) => v + Math.round(Tview.x))} yr={gridRange[1].map((v) => v + Math.round(Tview.y))} />
            <polygon points={cone.map((p) => p.join(",")).join(" ")} fill={inFov ? C.ok : C.active} opacity={0.1} stroke={C.active} strokeOpacity={0.4} strokeDasharray="4 4" />
            {wheels.map(([a, b], k) => (
              <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
            ))}
            <polygon points={body.map((p) => p.join(",")).join(" ")} fill={C.card} stroke={C.ok} strokeWidth={2} className={view === "W" ? "cursor-move" : ""} onPointerDown={startDrag("robot")} />
            <FrameGlyph T={pose(0, 0, 0)} scr={scr} color={C.fg} label="{W}" len={0.9} labelDx={-30} />
            <FrameGlyph T={WB} scr={scr} color={C.ok} label="{B}" len={0.8} labelDx={-26} labelDy={-8} />
            <FrameGlyph T={WS} scr={scr} color={C.active} label="{S}" len={0.55} labelDx={6} labelDy={-8} />
            <line x1={scr([WS.x, WS.y])[0]} y1={scr([WS.x, WS.y])[1]} x2={pPx[0]} y2={pPx[1]} stroke={C.warn} strokeWidth={1.8} strokeDasharray="6 4" />
            {bug && (
              <g>
                <line x1={scr([tx, ty])[0]} y1={scr([tx, ty])[1]} x2={scr(ghost)[0]} y2={scr(ghost)[1]} stroke={C.bad} strokeDasharray="3 4" />
                <g transform={`translate(${scr(ghost)[0]},${scr(ghost)[1]})`} stroke={C.bad} strokeWidth={3}>
                  <line x1={-7} y1={-7} x2={7} y2={7} />
                  <line x1={-7} y1={7} x2={7} y2={-7} />
                </g>
                <text x={scr(ghost)[0] + 10} y={scr(ghost)[1] - 8} fontSize={11} fontWeight={600} fill={C.bad}>
                  origin with naive −t
                </text>
                <circle cx={scr([0, 0])[0]} cy={scr([0, 0])[1]} r={10} fill="none" stroke={C.ok} strokeWidth={2} />
              </g>
            )}
            <circle cx={pPx[0]} cy={pPx[1]} r={13} fill={C.warn} opacity={0.18} />
            <circle cx={pPx[0]} cy={pPx[1]} r={7} fill={C.warn} stroke={C.card} strokeWidth={2} className="cursor-grab" onPointerDown={startDrag("P")} />
            <text x={pPx[0] + 11} y={pPx[1] - 9} fontSize={12} fontWeight={700} fill={C.warn}>
              P
            </text>
          </svg>
        </Stage>
        <Legend
          items={[
            [C.fg, "World {W}"],
            [C.ok, "Robot base {B}"],
            [C.active, "LiDAR {S} + FOV"],
            [C.warn, "obstacle P (drag me)"],
            ...(bug ? [[C.bad, "naive inverse bug"]] : []),
          ]}
        />
        <Narration tone={bug ? "bad" : inFov ? "ok" : "default"}>
          {bug ? (
            <>
              The real world origin is at ^B p = −Rᵀt = {pfmt(apply(BW, [0, 0]))} in the robot frame. Inverting by just negating t would put it at {pfmt([-tx, -ty])}, the red ✕:{" "}
              {Math.abs(th % 360) < 1e-9 ? "identical here only because θ = 0." : "wrong whenever θ ≠ 0."}
            </>
          ) : (
            <>
              The LiDAR sees P at ^S p = {pfmt(pS)} ({inFov ? "inside" : "outside"} its ±60° FOV). Chain it out: ^W p = ^W_B T · ^B_S T · ^S p = {pfmt(P)}. Subscripts cancel
              left to right: W←B, B←S, S←p.
            </>
          )}
        </Narration>
      </div>
      <div className="space-y-3">
        <Panel title="Robot pose ^W_B T">
          <SliderControl label="tₓ" value={tx} min={-1} max={7} step={0.1} onChange={setTx} format={(v) => `${fmt(v, 1)} m`} />
          <SliderControl label="t_y" value={ty} min={-1} max={6} step={0.1} onChange={setTy} format={(v) => `${fmt(v, 1)} m`} />
          <SliderControl label="θ" value={th} min={-180} max={180} step={1} onChange={setTh} format={(v) => `${v}°`} />
        </Panel>
        <Panel title="Sensor mount ^B_S T">
          <SliderControl label="sₓ" value={sx} min={-1} max={1} step={0.05} onChange={setSx} format={(v) => `${fmt(v, 2)} m`} />
          <SliderControl label="s_y" value={sy} min={-1} max={1} step={0.05} onChange={setSy} format={(v) => `${fmt(v, 2)} m`} />
          <SliderControl label="α" value={al} min={-180} max={180} step={1} onChange={setAl} format={(v) => `${v}°`} />
          <SwitchControl label="Show naive inverse bug (−t vs −Rᵀt)" checked={bug} onChange={setBug} id="naive-inverse" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTx(3), setTy(2), setTh(90), setSx(0.5), setSy(0.2), setAl(0), setP([3.8, 4.5]);
            }}
          >
            <RotateCcw /> Chapter warehouse example
          </Button>
        </Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Point P in…</TableHead>
              <TableHead className="text-right">coordinates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-[12.5px]">
            {[
              ["^W p (world)", P, C.fg],
              ["^B p (robot)", pB, C.ok],
              ["^S p (LiDAR)", pS, C.active],
            ].map(([k, v, col]) => (
              <TableRow key={k}>
                <TableCell className="py-1.5">{k}</TableCell>
                <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={{ color: col }}>
                  {pfmt(v)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background/50 p-3">
          <HMatrix T={WB} name="^W_B T" />
          <HMatrix T={BS} name="^B_S T" />
          <HMatrix T={WS} name="^W_S T = ^W_B T·^B_S T" />
          <HMatrix T={BW} name="^B_W T = (^W_B T)⁻¹" />
        </div>
      </div>
    </Split>
  );
}

/* ------------------------------------------------------------------ */
/* Variant "tree": tf2-style lookup_transform through the LCA          */
/* ------------------------------------------------------------------ */

const NODES = {
  world: [300, 26],
  base_link: [300, 82],
  front_lidar: [105, 142],
  arm_base: [300, 142],
  rear_camera: [495, 142],
  gripper: [300, 198],
};
const NAMES = Object.keys(NODES);
const TESTS = [
  { label: "1. Identity lookup", target: "base_link", source: "base_link", p: [2, -1], expT: [0, 0, 0], expP: [2, -1] },
  { label: "2. Parent ← child", target: "base_link", source: "front_lidar", p: [2, -1], expT: [0.5, 0.2, 0], expP: [2.5, -0.8] },
  { label: "3. Two hops to root", target: "world", source: "front_lidar", p: [2, -1], expT: [2.8, 2.5, 90], expP: [3.8, 4.5] },
  { label: "4. Inverse (root → leaf)", target: "front_lidar", source: "world", p: [3.8, 4.5], expT: [-2.5, 2.8, -90], expP: [2, -1] },
  { label: "5. Cross-branch lidar → gripper", target: "gripper", source: "front_lidar", p: [2, -1], expT: [-0.354, 1.061, 45], expP: [1.768, 1.768] },
];
const DEFAULT_J = { bx: 3, by: 2, byaw: 90, arm: -90, grip: 45, reach: 0.8 };
const W2 = 600, H2 = 460;

function TreeEngine() {
  const [j, setJ] = useState(DEFAULT_J);
  const [source, setSource] = useState("front_lidar");
  const [target, setTarget] = useState("gripper");
  const [p, setPt] = useState([2, -1]);
  const [pick, setPick] = useState("source");
  const [cycleMsg, setCycleMsg] = useState(null);
  const set = (k) => (v) => setJ((s) => ({ ...s, [k]: v }));

  const frames = {
    world: { parent: null },
    base_link: { parent: "world", T: pose(j.bx, j.by, j.byaw * D2R) },
    front_lidar: { parent: "base_link", T: pose(0.5, 0.2, 0) },
    arm_base: { parent: "base_link", T: pose(0, 0, j.arm * D2R) },
    gripper: { parent: "arm_base", T: pose(j.reach, 0, j.grip * D2R) },
    rear_camera: { parent: "base_link", T: pose(-0.4, 0, 180 * D2R) },
  };
  const res = lookup(frames, target, source);
  const Wp = worldPoses(frames);
  const pT = apply(res.T, p);
  const pW = apply(Wp[source], p);
  const upEdges = new Set(res.up.slice(0, -1)); // child names whose parent edge is on the up path
  const downEdges = new Set(res.down.slice(1));
  const isDefault = Object.keys(DEFAULT_J).every((k) => j[k] === DEFAULT_J[k]);
  const test = TESTS.find((tc) => tc.target === target && tc.source === source && tc.p[0] === p[0] && tc.p[1] === p[1]);
  const passes =
    isDefault &&
    test &&
    Math.abs(res.T.x - test.expT[0]) < 1e-3 &&
    Math.abs(res.T.y - test.expT[1]) < 1e-3 &&
    Math.abs(res.T.th * R2D - test.expT[2]) < 0.05 &&
    Math.abs(pT[0] - test.expP[0]) < 1e-3 &&
    Math.abs(pT[1] - test.expP[1]) < 1e-3;

  const OX = 40, OY = 430, SC = 85;
  const scr = ([x, y]) => [OX + x * SC, OY - y * SC];
  const colorOf = (f) => (f === source ? C.bad : f === target ? C.ok : f === res.lca ? C.warn : C.muted);

  const clickNode = (f) => {
    setCycleMsg(null);
    if (pick === "source") {
      setSource(f);
      setPick("target");
    } else {
      setTarget(f);
      setPick("source");
    }
  };

  const B = Wp.base_link;
  const body = [[-0.5, -0.38], [0.5, -0.38], [0.6, 0], [0.5, 0.38], [-0.5, 0.38]].map((q) => scr(apply(B, q)));
  const so = scr([Wp[source].x, Wp[source].y]);
  const to = scr([Wp[target].x, Wp[target].y]);
  const pPx = scr(pW);

  // hop-by-hop chain for the inspector
  const rows = [];
  for (let k = res.up.length - 2; k >= 0; k--) {
    const child = res.up[k];
    rows.push({ name: `^${frames[child].parent}_${child} T`, T: frames[child].T, tone: "bad" });
  }
  rows.push({ name: `^${res.lca}_${source} T  (accumulated)`, T: res.Tsrc, tone: "bad", strong: true });
  for (let k = 1; k < res.down.length; k++) {
    const child = res.down[k];
    rows.push({ name: `^${frames[child].parent}_${child} T`, T: frames[child].T, tone: "ok" });
  }
  rows.push({ name: `^${res.lca}_${target} T  (accumulated)`, T: res.Ttgt, tone: "ok", strong: true });
  rows.push({ name: `(^${res.lca}_${target} T)⁻¹ = ^${target}_${res.lca} T`, T: inverse(res.Ttgt), tone: "ok" });

  return (
    <Split>
      <div className="space-y-3">
        <Stage>
          <svg viewBox="0 0 600 226" className="w-full select-none">
            {NAMES.filter((f) => frames[f].parent).map((f) => {
              const [x1, y1] = NODES[frames[f].parent], [x2, y2] = NODES[f];
              const col = upEdges.has(f) ? C.bad : downEdges.has(f) ? C.ok : C.grid;
              return <line key={f} x1={x1} y1={y1 + 13} x2={x2} y2={y2 - 13} stroke={col} strokeWidth={upEdges.has(f) || downEdges.has(f) ? 3.5 : 2} />;
            })}
            {NAMES.map((f) => {
              const [x, y] = NODES[f];
              const col = colorOf(f);
              const on = f === source || f === target || f === res.lca;
              return (
                <g key={f} className="cursor-pointer" onClick={() => clickNode(f)}>
                  <rect x={x - 52} y={y - 13} width={104} height={26} rx={7} fill={C.card} stroke={col} strokeWidth={on ? 2.5 : 1.2} />
                  <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12} fontFamily="ui-monospace, monospace" fontWeight={on ? 700 : 500} fill={on ? col : C.fg}>
                    {f}
                  </text>
                  {(f === source || f === target || f === res.lca) && (
                    <text x={x + 56} y={y + 4} fontSize={10} fontWeight={700} fill={col}>
                      {[f === source && "src", f === target && "tgt", f === res.lca && "LCA"].filter(Boolean).join("·")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </Stage>
        <Stage>
          <svg viewBox={`0 0 ${W2} ${H2}`} className="w-full select-none">
            <Grid scr={scr} xr={[-1, 8]} yr={[-1, 6]} />
            <polygon points={body.map((q) => q.join(",")).join(" ")} fill={C.card} stroke={C.muted} strokeWidth={1.5} />
            {(() => {
              const a = scr([Wp.arm_base.x, Wp.arm_base.y]), g = scr([Wp.gripper.x, Wp.gripper.y]);
              return <line x1={a[0]} y1={a[1]} x2={g[0]} y2={g[1]} stroke={C.purple} strokeWidth={7} strokeLinecap="round" opacity={0.45} />;
            })()}
            {NAMES.map((f) => (
              <FrameGlyph
                key={f}
                T={Wp[f]}
                scr={scr}
                color={colorOf(f) === C.muted ? C.ink : colorOf(f)}
                label={f === "world" || f === source || f === target ? f : undefined}
                len={f === "world" ? 0.8 : 0.42}
                labelDx={f === target && f !== source ? -60 : 6}
                labelDy={f === target && f !== source ? -10 : 16}
              />
            ))}
            {source !== target && <Arrow from={to} to={so} color={C.warn} width={2} dash="6 4" />}
            <line x1={so[0]} y1={so[1]} x2={pPx[0]} y2={pPx[1]} stroke={C.warn} strokeWidth={1.2} strokeDasharray="2 4" />
            <circle cx={pPx[0]} cy={pPx[1]} r={6.5} fill={C.warn} stroke={C.card} strokeWidth={2} />
            <text x={pPx[0] + 9} y={pPx[1] - 8} fontSize={11.5} fontWeight={700} fill={C.warn}>
              p
            </text>
          </svg>
        </Stage>
        <Legend
          items={[
            [C.bad, "source → LCA (up path)"],
            [C.warn, "lowest common ancestor / ^target_source T arrow"],
            [C.ok, "LCA → target (down path)"],
          ]}
        />
        {cycleMsg ? (
          <Narration tone="bad">{cycleMsg}</Narration>
        ) : (
          <Narration tone={passes ? "ok" : "default"}>
            lookup_transform(target = <b>{target}</b>, source = <b>{source}</b>): walk up from {source} to the lowest common ancestor <b>{res.lca}</b>, walk up from {target} too,
            then ^{target}_{source} T = (^{res.lca}_{target} T)⁻¹ · ^{res.lca}_{source} T = {posefmt(res.T)}. The point p = {pfmt(p)} in {source} is {pfmt(pT)} in {target}.
          </Narration>
        )}
      </div>
      <div className="space-y-3">
        <Panel title="Query">
          <div className="grid grid-cols-[4rem_1fr] items-center gap-2 text-[12.5px]">
            <span className="text-viz-bad">source</span>
            <Select value={source} onValueChange={(v) => (setSource(v), setCycleMsg(null))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NAMES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-viz-ok">target</span>
            <Select value={target} onValueChange={(v) => (setTarget(v), setCycleMsg(null))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NAMES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            Clicking a tree node sets
            <ToggleGroup type="single" value={pick} onValueChange={(v) => v && setPick(v)}>
              <ToggleGroupItem value="source">source</ToggleGroupItem>
              <ToggleGroupItem value="target">target</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Select
            value={test && isDefault ? test.label : ""}
            onValueChange={(lbl) => {
              const tc = TESTS.find((x) => x.label === lbl);
              setJ(DEFAULT_J);
              setSource(tc.source);
              setTarget(tc.target);
              setPt(tc.p);
              setCycleMsg(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Load a chapter test case…" />
            </SelectTrigger>
            <SelectContent>
              {TESTS.map((tc) => (
                <SelectItem key={tc.label} value={tc.label}>
                  {tc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5">
            {passes && <Badge variant="success">matches expected: {test.label}</Badge>}
            <Badge variant="outline">^target p = {pfmt(pT)}</Badge>
          </div>
        </Panel>
        <Panel title="Joints & robot pose">
          <SliderControl label="base_link x" value={j.bx} min={-0.5} max={7} step={0.1} onChange={set("bx")} format={(v) => `${fmt(v, 1)} m`} />
          <SliderControl label="base_link y" value={j.by} min={-0.5} max={5} step={0.1} onChange={set("by")} format={(v) => `${fmt(v, 1)} m`} />
          <SliderControl label="base_link yaw" value={j.byaw} min={-180} max={180} step={1} onChange={set("byaw")} format={(v) => `${v}°`} />
          <SliderControl label="arm_base joint" value={j.arm} min={-180} max={180} step={1} onChange={set("arm")} format={(v) => `${v}°`} />
          <SliderControl label="gripper joint" value={j.grip} min={-180} max={180} step={1} onChange={set("grip")} format={(v) => `${v}°`} />
          <div className="grid grid-cols-2 gap-3">
            <SliderControl label="p.x (source)" value={p[0]} min={-3} max={5} step={0.1} onChange={(v) => setPt([v, p[1]])} format={(v) => fmt(v, 1)} />
            <SliderControl label="p.y (source)" value={p[1]} min={-3} max={5} step={0.1} onChange={(v) => setPt([p[0], v])} format={(v) => fmt(v, 1)} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const chain = cycleCheck(frames, "gripper", "world");
              setCycleMsg(
                chain
                  ? `set_transform(parent = "gripper", child = "world") rejected → CycleDetectedError: walking up from gripper visits ${chain.join(" → ")}, which already contains "world". Accepting it would make lookups loop forever.`
                  : "No cycle detected."
              );
            }}
          >
            <AlertTriangle /> Test cycle detection error
          </Button>
        </Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chain step</TableHead>
              <TableHead className="text-right">(x, y, θ)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-[12px]">
            {rows.map((r, k) => (
              <TableRow key={k}>
                <TableCell className={`py-1.5 ${r.strong ? "font-semibold" : ""}`} style={{ color: C[r.tone] }}>
                  {r.name}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{posefmt(r.T)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="py-1.5 font-semibold text-viz-warn">^{target}_{source} T</TableCell>
              <TableCell className="py-1.5 text-right font-semibold tabular-nums text-viz-warn">{posefmt(res.T)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="rounded-lg border bg-background/50 p-3">
          <HMatrix T={res.T} name={`^${target}_${source} T`} />
        </div>
      </div>
    </Split>
  );
}

export default function FramesLab({ variant = "se2" }) {
  const tree = variant === "tree";
  return (
    <LabShell
      title={tree ? "tf2-Style Transform Tree — lookup_transform Through the Common Ancestor" : "SE(2) Homogeneous Transforms — World → Robot → LiDAR"}
      description={
        tree
          ? "Pick any two frames (click the tree or use the selects). The engine walks both up to their lowest common ancestor, inverts one chain and multiplies: ^target_source T = (^LCA_target T)⁻¹ · ^LCA_source T."
          : "Move the robot and its LiDAR mount, drag the obstacle, and watch one point get three different coordinates. 3×3 homogeneous matrices chain by multiplication; inverses use −Rᵀt."
      }
      badges={tree ? ["tf2 lookup", "LCA", "cycle detection"] : ["SE(2)", "3×3 homogeneous", "T⁻¹ = [Rᵀ, −Rᵀt]"]}
    >
      {tree ? <TreeEngine /> : <Se2Chain />}
    </LabShell>
  );
}
