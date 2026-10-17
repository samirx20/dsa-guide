import { useState } from "react";
import { GitBranch, GitCommitHorizontal, GitMerge, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tip } from "@/components/ui/tooltip";
import { C, LabShell, Legend, Narration, Panel, Split, Stage, SwitchControl, VarTable } from "@/viz/kit";

const FEAT = "feat/ekf-slam";
const LANE_Y = { main: 70, feat: 150, ghost: 262 };
const MSGS = {
  main: ["Battery monitor fix", "Bump lidar driver", "Tune PID gains", "CI: add clang-tidy"],
  feat: ["Add EKF predict", "Add EKF update", "EKF covariance tuning", "EKF unit tests"],
};

/** Deterministic 7-char "SHA" so the same history gives the same hashes. */
function sha(n) {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  return (h.toString(16) + "0000000").slice(0, 6) + ((n * 7) % 16).toString(16);
}

function initial() {
  return {
    commits: [
      { id: 0, hash: "a1b2c3d", msg: "Init", parents: [], lane: "main", col: 0, label: "C1" },
      { id: 1, hash: "d4e5f6a", msg: "Add PID", parents: [0], lane: "main", col: 1, label: "C2" },
    ],
    refs: { main: 1 },
    head: "main",
    next: 2,
    counts: { main: 0, feat: 0 },
    wd: { dirty: false, staged: false },
    log: [{ cmd: "git log --oneline --graph", out: "d4e5f6a (HEAD -> main) Add PID" }],
    note: "A branch is a 40-byte sticky note holding one commit hash. HEAD says which sticky note you are standing on.",
    tone: "default",
  };
}

const byId = (s, id) => s.commits.find((c) => c.id === id);
function ancestors(s, id) {
  const seen = new Set();
  const st = [id];
  while (st.length) {
    const x = st.pop();
    if (x == null || seen.has(x)) continue;
    seen.add(x);
    st.push(...byId(s, x).parents);
  }
  return seen;
}
const laneOf = (branch) => (branch === "main" ? "main" : "feat");
function nextCol(s, lane, parents) {
  const pc = Math.max(-1, ...parents.map((p) => byId(s, p).col));
  const lc = Math.max(-1, ...s.commits.filter((c) => c.lane === lane && !c.ghost).map((c) => c.col));
  return Math.max(pc + 1, lc + 1);
}

function addCommit(s, msg, parents, lane, label) {
  const c = { id: s.next, hash: sha(s.next + 11), msg, parents, lane, col: nextCol(s, lane, parents), label: label ?? (parents.length > 1 ? "M" : `C${s.next + 1}`) };
  return { ...s, commits: [...s.commits, c], next: s.next + 1, _new: c };
}

function reduce(s, action, opts) {
  const tip = s.refs[s.head];
  const other = s.head === "main" ? FEAT : "main";
  const log = (cmd, out, note, tone = "default") => ({ log: [...s.log, { cmd, out }].slice(-40), note, tone });

  switch (action) {
    case "edit":
      return { ...s, wd: { ...s.wd, dirty: true }, ...log("vim src/ekf.cpp", "", "Working directory now differs from the last commit. Git sees the change but nothing is staged yet.") };
    case "add":
      if (!s.wd.dirty) return { ...s, ...log("git add .", "", "Nothing to stage: the working tree is clean.", "warn") };
      return { ...s, wd: { dirty: false, staged: true }, ...log("git add src/ekf.cpp", "", "The snapshot of src/ekf.cpp moved into the Staging Index. The next commit will photograph exactly this.", "active") };
    case "commit": {
      let wd = s.wd;
      if (!wd.staged) {
        if (opts.autoStage) wd = { dirty: false, staged: true };
        else return { ...s, ...log("git commit -m ...", "nothing added to commit (use \"git add\")", "The Staging Index is empty, so there is nothing to photograph. Edit a file and git add it first.", "bad") };
      }
      const lane = laneOf(s.head);
      const k = s.counts[lane];
      const msg = MSGS[lane][k % MSGS[lane].length];
      const n = addCommit(s, msg, [tip], lane);
      const c = n._new;
      return {
        ...n,
        counts: { ...s.counts, [lane]: k + 1 },
        refs: { ...s.refs, [s.head]: c.id },
        wd: { dirty: false, staged: false },
        ...log(`git commit -m "${msg}"`, `[${s.head} ${c.hash}] ${msg}`, `New commit ${c.hash} points back to its parent ${byId(s, tip).hash}. Only the "${s.head}" sticky note slid forward; ${s.refs[other] != null ? `"${other}" stayed put.` : "nothing else moved."}`, "ok"),
      };
    }
    case "branch":
      if (s.refs[FEAT] != null) return s;
      return { ...s, refs: { ...s.refs, [FEAT]: tip }, head: FEAT, ...log(`git switch -c ${FEAT}`, `Switched to a new branch '${FEAT}'`, `Created .git/refs/heads/${FEAT} containing ${byId(s, tip).hash} and pointed HEAD at it. No files were copied — it took ~0.001 s.`, "active") };
    case "switch": {
      const to = opts.to;
      if (s.wd.dirty || s.wd.staged) return { ...s, ...log(`git switch ${to}`, "error: Your local changes would be overwritten", "Commit (or stash) your edits before switching branches.", "bad") };
      return { ...s, head: to, ...log(`git switch ${to}`, `Switched to branch '${to}'`, `HEAD now points at "${to}" (${byId(s, s.refs[to]).hash}); the working directory was rewritten to match that snapshot.`, "active") };
    }
    case "merge": {
      const theirs = s.refs[other];
      const mine = ancestors(s, tip);
      if (mine.has(theirs)) return { ...s, ...log(`git merge ${other}`, "Already up to date.", `${other} is already contained in ${s.head}'s history.`, "warn") };
      if (ancestors(s, theirs).has(tip)) {
        return { ...s, refs: { ...s.refs, [s.head]: theirs }, ...log(`git merge ${other}`, `Fast-forward ${byId(s, tip).hash}..${byId(s, theirs).hash}`, `Fast-forward: ${s.head} had no new commits of its own, so Git simply slid the "${s.head}" pointer up to ${byId(s, theirs).hash}. No merge commit needed.`, "ok") };
      }
      const lane = laneOf(s.head);
      const n = addCommit(s, `Merge ${other}`, [tip, theirs], lane);
      const c = n._new;
      c.col = Math.max(c.col, byId(s, theirs).col + 1);
      return { ...n, refs: { ...s.refs, [s.head]: c.id }, ...log(`git merge ${other}`, `Merge made by the 'ort' strategy. [${c.hash}]`, `Histories diverged, so Git created merge commit M (${c.hash}) with TWO parents: ${byId(s, tip).hash} and ${byId(s, theirs).hash}. No existing hash was rewritten.`, "ok") };
    }
    case "rebase": {
      const onto = s.refs.main;
      const base = ancestors(s, onto);
      const mine = [...ancestors(s, tip)].filter((id) => !base.has(id)).sort((a, b) => a - b);
      if (mine.length === 0 || ancestors(s, tip).has(onto)) return { ...s, ...log("git rebase main", `Current branch ${FEAT} is up to date.`, `${FEAT} already sits on top of main — nothing to replay.`, "warn") };
      let n = { ...s };
      let parent = onto;
      const map = [];
      for (const id of mine) {
        const old = byId(s, id);
        n = addCommit(n, old.msg, [parent], "feat", old.label + "'");
        n._new.col = byId(n, parent).col + 1;
        map.push(`${old.hash} → ${n._new.hash}`);
        parent = n._new.id;
      }
      // old commits are no longer reachable from any branch: ghost them
      const reach = new Set([...ancestors(n, parent), ...ancestors(n, n.refs.main)]);
      n.commits = n.commits.map((c) => (mine.includes(c.id) && !reach.has(c.id) ? { ...c, ghost: true, lane: "ghost" } : c));
      return { ...n, refs: { ...n.refs, [FEAT]: parent }, ...log("git rebase main", `Successfully rebased and updated refs/heads/${FEAT}. (${map.join(", ")})`, `Replayed ${mine.length} commit(s) on top of main as brand-new commits with NEW hashes (${map.join(", ")}). The originals are orphaned (dimmed) — only the reflog remembers them.`, "warn") };
    }
    default:
      return s;
  }
}

function Dag({ s }) {
  const cols = Math.max(...s.commits.map((c) => c.col)) + 1;
  const W = Math.max(400, 60 + cols * 78);
  const H = s.commits.some((c) => c.ghost) ? 300 : 222;
  const X = (c) => 50 + c.col * 78;
  const Y = (c) => LANE_Y[c.lane];
  const headTip = s.refs[s.head];
  const pointers = Object.entries(s.refs).map(([name, id]) => ({ name, c: byId(s, id) }));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
        <defs>
          <marker id="git-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
          </marker>
        </defs>
        {s.commits.some((c) => c.ghost) && (
          <text x={12} y={LANE_Y.ghost - 22} fontSize={10} fill={C.muted}>
            orphaned (reflog only)
          </text>
        )}
        {s.commits.flatMap((c) =>
          c.parents.map((pid) => {
            const p = byId(s, pid);
            const x1 = X(c) - 15, y1 = Y(c), x2 = X(p) + 17, y2 = Y(p);
            const mx = (x1 + x2) / 2;
            return <path key={`${c.id}-${pid}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke={c.ghost ? C.grid : C.muted} strokeWidth={1.6} fill="none" markerEnd="url(#git-arrow)" strokeDasharray={c.ghost ? "4 3" : undefined} />;
          })
        )}
        {s.commits.map((c) => {
          const isMerge = c.parents.length > 1;
          const col = c.ghost ? C.muted : c.id === headTip ? C.warn : c.lane === "main" ? C.active : C.purple;
          return (
            <g key={c.id} opacity={c.ghost ? 0.4 : 1} className="transition-opacity">
              <circle cx={X(c)} cy={Y(c)} r={15} fill={C.card} stroke={col} strokeWidth={isMerge ? 3.5 : 2.2} />
              <text x={X(c)} y={Y(c) + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={col}>
                {c.label}
              </text>
              <text x={X(c)} y={Y(c) + 30} textAnchor="middle" fontSize={10} fill={C.muted}>
                {c.hash}
              </text>
            </g>
          );
        })}
      </svg>
      {/* branch + HEAD badges positioned over the svg */}
      {pointers.map(({ name, c }) => {
        const sameTip = pointers.filter((p) => p.c.id === c.id).findIndex((p) => p.name === name);
        return (
          <div
            key={name}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5 transition-all duration-500"
            style={{ left: `${(X(c) / W) * 100}%`, top: `${((c.lane === "main" ? Y(c) - 44 - sameTip * 20 : Y(c) + 38 + sameTip * 20) / H) * 100}%` }}
          >
            <Badge variant={name === "main" ? "active" : "purple"} className={s.head === name ? "ring-2 ring-viz-warn" : ""}>
              {s.head === name && <span className="text-viz-warn">HEAD →</span>}
              {name}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export default function GitDagLab() {
  const [s, setS] = useState(initial);
  const [autoStage, setAutoStage] = useState(true);
  const act = (a, o = {}) => setS((x) => reduce(x, a, { autoStage, ...o }));
  const hasFeat = s.refs[FEAT] != null;
  const other = s.head === "main" ? FEAT : "main";

  const wdState = s.wd.dirty ? "modified" : "clean";
  return (
    <LabShell
      title="Git DAG & Pointer Visualizer"
      description="Commits point backward to their parents; branches are movable sticky notes; HEAD is the note you stand on. Compare a 2-parent merge with a rebase that rewrites hashes."
      badges={["switch -c", "merge vs rebase", "SHA-1 pointers"]}
    >
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act("commit")}>
          <GitCommitHorizontal /> git commit
        </Button>
        <Button size="sm" variant="outline" disabled={hasFeat} onClick={() => act("branch")}>
          <GitBranch /> git switch -c {FEAT}
        </Button>
        <Button size="sm" variant="outline" disabled={!hasFeat} onClick={() => act("switch", { to: other })}>
          git switch {hasFeat ? other : "main"}
        </Button>
        <Button size="sm" variant="outline" disabled={!hasFeat} onClick={() => act("merge")}>
          <GitMerge /> git merge {hasFeat ? other : FEAT}
        </Button>
        <Tip content={s.head === "main" ? "Golden rule: never rebase shared main. Switch to your feature branch first." : `Replay ${FEAT}'s own commits on top of main`}>
          <span>
            <Button size="sm" variant="outline" disabled={!hasFeat || s.head === "main"} onClick={() => act("rebase")}>
              git rebase main
            </Button>
          </span>
        </Tip>
        <Button size="sm" variant="ghost" onClick={() => setS(initial())}>
          <RotateCcw /> Reset
        </Button>
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-2 pt-4">
            <Dag s={s} />
          </Stage>
          <Legend
            items={[
              [C.active, "main lane"],
              [C.purple, `${FEAT} lane`],
              [C.warn, "HEAD's commit"],
              [C.muted, "orphaned by rebase"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Four zones (working dir → index → .git)">
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11.5px]">
              <div className={`rounded-md border px-1 py-2 ${s.wd.dirty ? "border-viz-warn bg-viz-warn/10 text-viz-warn" : ""}`}>
                Working dir
                <div className="font-mono font-semibold">{wdState}</div>
              </div>
              <div className={`rounded-md border px-1 py-2 ${s.wd.staged ? "border-viz-active bg-viz-active/10 text-viz-active" : ""}`}>
                Staging index
                <div className="font-mono font-semibold">{s.wd.staged ? "ekf.cpp" : "empty"}</div>
              </div>
              <div className="rounded-md border px-1 py-2">
                .git repo
                <div className="font-mono font-semibold">{s.commits.filter((c) => !c.ghost).length} commits</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="xs" variant="outline" onClick={() => act("edit")}>
                edit src/ekf.cpp
              </Button>
              <Button size="xs" variant="outline" onClick={() => act("add")}>
                git add
              </Button>
            </div>
            <SwitchControl label="Auto-stage on commit (git commit -am)" checked={autoStage} onChange={setAutoStage} />
          </Panel>
          <VarTable
            title="Ref"
            vars={[
              ["HEAD", `ref: refs/heads/${s.head}`, "warn"],
              ["main", byId(s, s.refs.main).hash, "active"],
              [FEAT, hasFeat ? byId(s, s.refs[FEAT]).hash : "—", "purple"],
            ]}
          />
          <div className="overflow-hidden rounded-lg border bg-code">
            <div className="border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Command log</div>
            <ScrollArea className="h-36">
              <div className="space-y-1 px-3 py-2 font-mono text-[11.5px]">
                {[...s.log].reverse().map((l, k) => (
                  <div key={s.log.length - k}>
                    <div>
                      <span className="text-viz-ok">$</span> {l.cmd}
                    </div>
                    {l.out && <div className="text-muted-foreground">{l.out}</div>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Split>
    </LabShell>
  );
}
