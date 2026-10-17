import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { binaryEdges, layoutBinary } from "./_TreeLab-layout";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LEVEL = [C.active, C.purple, C.warn, C.ok, C.bad];
const LEVEL_CLS = [
  "border-viz-active bg-viz-active/15 text-viz-active",
  "border-viz-purple bg-viz-purple/15 text-viz-purple",
  "border-viz-warn bg-viz-warn/15 text-viz-warn",
  "border-viz-ok bg-viz-ok/15 text-viz-ok",
  "border-viz-bad bg-viz-bad/12 text-viz-bad",
];

/** Build { id, val, left, right } from a level-order array with nulls. */
function fromLevel(arr) {
  if (!arr.length || arr[0] == null) return null;
  let id = 0;
  const mk = (v) => ({ id: id++, val: v, left: null, right: null });
  const root = mk(arr[0]);
  const q = [root];
  let k = 1;
  while (q.length && k < arr.length) {
    const n = q.shift();
    if (k < arr.length && arr[k] != null) q.push((n.left = mk(arr[k])));
    k++;
    if (k < arr.length && arr[k] != null) q.push((n.right = mk(arr[k])));
    k++;
  }
  return root;
}

const TREES = {
  chapter: { label: "Chapter tree", arr: [1, 2, 3, 4, 5, null, 6] },
  full: { label: "Perfect tree", arr: [1, 2, 3, 4, 5, 6, 7] },
  deep: { label: "Lopsided", arr: [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13] },
};

/**
 * Binary tree drawing. style(node) -> { fill?, stroke?, text?, ring?, badge?, badgeTone?, dim? }
 */
function TreeSVG({ root, style = () => ({}), hotEdges = new Set(), minW = 360 }) {
  const { pos, count, depth } = layoutBinary(root);
  const slot = 50, rowH = 62, pad = 28;
  const W = Math.max(minW, count * slot + pad * 2);
  const H = (depth + 1) * rowH + pad + 6;
  const X = (id) => pad + (pos.get(id).x + 0.5) * ((W - pad * 2) / Math.max(count, 1));
  const Y = (id) => pad + pos.get(id).y * rowH;
  const r = 17;
  if (!root)
    return (
      <svg viewBox={`0 0 ${W} 80`} className="w-full font-mono" role="img" aria-label="Empty tree">
        <text x={W / 2} y={44} textAnchor="middle" fontSize={13} fill={C.muted}>
          root = nullptr (empty tree)
        </text>
      </svg>
    );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Binary tree">
      {binaryEdges(root).map(([a, b]) => {
        const hot = hotEdges.has(`${a}-${b}`);
        return <line key={`${a}-${b}`} x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={hot ? C.active : C.ink} strokeWidth={hot ? 3 : 1.5} opacity={hot ? 1 : 0.55} />;
      })}
      {[...pos.values()].map(({ node }) => {
        const s = style(node);
        const x = X(node.id), y = Y(node.id);
        return (
          <g key={node.id} opacity={s.dim ? 0.35 : 1}>
            {s.ring && <circle cx={x} cy={y} r={r + 5} fill="none" stroke={s.ring} strokeWidth={2} strokeDasharray="4 3" />}
            <circle cx={x} cy={y} r={r} fill={C.card} />
            <circle cx={x} cy={y} r={r} fill={s.fill ?? C.card} fillOpacity={s.fill ? 0.22 : 1} stroke={s.stroke ?? C.ink} strokeWidth={s.stroke ? 2.6 : 1.4} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={s.text ?? C.fg}>
              {node.val}
            </text>
            {s.badge != null && (
              <g>
                <circle cx={x + r - 1} cy={y - r + 1} r={8.5} fill={s.badgeTone ?? C.ok} />
                <text x={x + r - 1} y={y - r + 4.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.card}>
                  {s.badge}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChipRow({ items, empty = "—", cls }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1">
      {items.length === 0 && <span className="text-xs text-muted-foreground">{empty}</span>}
      {items.map((it, k) => (
        <span key={k} className={cn("rounded-md border bg-card px-2 py-0.5 font-mono text-sm font-semibold", typeof cls === "function" ? cls(it, k) : cls)}>
          {it.label ?? it}
        </span>
      ))}
    </div>
  );
}

function TreePresets({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(TREES).map(([k, t]) => (
        <Button key={k} size="sm" variant={value === k ? "secondary" : "outline"} onClick={() => onChange(k)}>
          {t.label}
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DFS                                                                 */
/* ------------------------------------------------------------------ */

const ORDERS = {
  pre: { label: "Preorder", rule: "Node → Left → Right", seq: ["process", "left", "right"] },
  in: { label: "Inorder", rule: "Left → Node → Right", seq: ["left", "process", "right"] },
  post: { label: "Postorder", rule: "Left → Right → Node", seq: ["left", "right", "process"] },
};
const dfsCode = (o) => {
  const name = { pre: "preorder", in: "inorder", post: "postorder" }[o];
  const body = {
    process: `    cout << root->val << " ";      // process node`,
    left: `    ${name}(root->left);${" ".repeat(Math.max(1, 15 - name.length))}// recurse left`,
    right: `    ${name}(root->right);${" ".repeat(Math.max(1, 14 - name.length))}// recurse right`,
  };
  return `void ${name}(TreeNode* root) {
    if (root == nullptr) return;   // base case

${ORDERS[o].seq.map((k) => body[k]).join("\n")}
}`;
};

/** Pure: recursive DFS trace with call stack + output. */
export function traceDFS(root, order) {
  const steps = [];
  const stack = [];
  const out = [];
  const seq = ORDERS[order].seq;
  const lineOf = (k) => 4 + seq.indexOf(k);
  const snap = (extra) => steps.push({ stack: [...stack], out: [...out], ...extra });
  const go = (n, from) => {
    stack.push(n.id);
    snap({ cur: n.id, line: 2, tone: "active", note: `${from}: call on node ${n.val} — push a frame (depth ${stack.length}).` });
    for (const k of seq) {
      if (k === "process") {
        out.push(n);
        snap({ cur: n.id, line: lineOf(k), tone: "ok", note: `Process ${n.val} → output it (#${out.length}).` });
      } else {
        const child = n[k];
        if (child) {
          snap({ cur: n.id, line: lineOf(k), tone: "default", edge: `${n.id}-${child.id}`, note: `Node ${n.val}: recurse ${k} into ${child.val}.` });
          go(child, `From ${n.val}`);
        } else {
          snap({ cur: n.id, line: lineOf(k), tone: "default", note: `Node ${n.val}: ${k} child is nullptr → that call returns immediately (base case).` });
        }
      }
    }
    stack.pop();
    snap({ cur: n.id, ret: true, line: 7, tone: "warn", note: `Node ${n.val} is finished → pop its frame${stack.length ? ` and resume the parent` : ""}.` });
  };
  if (root) go(root, "Start");
  snap({ cur: null, done: true, line: [], tone: "ok", note: `${ORDERS[order].label}: ${out.map((n) => n.val).join(" → ")}. Every node visited once: O(N) time, O(H) stack space.` });
  return steps;
}

function DFS() {
  const [preset, setPreset] = useState("chapter");
  const [order, setOrder] = useState("pre");
  const root = useMemo(() => fromLevel(TREES[preset].arr), [preset]);
  const steps = useMemo(() => traceDFS(root, order), [root, order]);
  const st = useStepper(steps, { baseMs: 750 });
  const s = st.step;
  const onStack = new Set(s.stack);
  const outIdx = new Map(s.out.map((n, k) => [n.id, k + 1]));
  const byId = useMemo(() => {
    const m = new Map();
    const w = (n) => n && (m.set(n.id, n), w(n.left), w(n.right));
    w(root);
    return m;
  }, [root]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={order} onValueChange={setOrder}>
          <TabsList>
            {Object.entries(ORDERS).map(([k, o]) => (
              <TabsTrigger key={k} value={k}>
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Badge variant="outline">{ORDERS[order].rule}</Badge>
        <div className="ml-auto">
          <TreePresets value={preset} onChange={setPreset} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <TreeSVG
              root={root}
              hotEdges={new Set(s.edge ? [s.edge] : [])}
              style={(n) => ({
                fill: n.id === s.cur && !s.done ? C.active : outIdx.has(n.id) ? C.ok : undefined,
                stroke: n.id === s.cur && !s.done ? C.active : outIdx.has(n.id) ? C.ok : undefined,
                ring: onStack.has(n.id) ? C.purple : undefined,
                badge: outIdx.get(n.id),
              })}
            />
          </Stage>
          <Legend
            items={[
              [C.active, "Current call"],
              [C.purple, "Frame on the call stack (dashed ring)"],
              [C.ok, "Output (number = order)"],
            ]}
          />
          <Panel title="Output sequence">
            <ChipRow items={s.out.map((n) => n.val)} empty="(nothing printed yet)" cls={(_, k) => (k === s.out.length - 1 ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : "")} />
          </Panel>
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={dfsCode(order)} active={s.line} />
          <Panel title={`Call stack · depth ${s.stack.length}`}>
            <div className="flex flex-col-reverse gap-1">
              {s.stack.length === 0 && <span className="text-xs text-muted-foreground">empty</span>}
              {s.stack.map((id, k) => (
                <div key={k} className={cn("rounded-md border px-2 py-1 font-mono text-[12.5px]", k === s.stack.length - 1 ? "border-viz-active bg-viz-active/12 text-viz-active" : "bg-card")}>
                  {{ pre: "preorder", in: "inorder", post: "postorder" }[order]}({byId.get(id).val})
                </div>
              ))}
            </div>
          </Panel>
          <StatGrid cols={2}>
            <Stat label="Visited" value={`${s.out.length}/${byId.size}`} tone="ok" />
            <Stat label="Max stack = height" value={Math.max(0, ...steps.map((x) => x.stack.length))} tone="purple" />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* BFS level order                                                     */
/* ------------------------------------------------------------------ */

const BFS_CODE = `vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) return result;
    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        int levelSize = q.size();   // nodes on THIS level
        vector<int> currentLevelVals;
        for (int i = 0; i < levelSize; i++) {
            TreeNode* curr = q.front();
            q.pop();
            currentLevelVals.push_back(curr->val);
            if (curr->left != nullptr) q.push(curr->left);
            if (curr->right != nullptr) q.push(curr->right);
        }
        result.push_back(currentLevelVals);
    }
    return result;
}`;

/** Pure: level-order BFS trace. Queue items are { node, level }. */
export function traceBFS(root) {
  const steps = [];
  const q = [];
  const result = [];
  const levelOf = new Map();
  const snap = (extra) => steps.push({ q: q.map((n) => n.id), result: result.map((l) => [...l]), seen: new Map(levelOf), ...extra });
  if (!root) {
    snap({ line: 3, tone: "default", done: true, note: "Empty tree → return []." });
    return steps;
  }
  q.push(root);
  levelOf.set(root.id, 0);
  snap({ line: [4, 5], tone: "active", level: 0, note: `Push the root ${root.val} into the queue.` });
  let level = 0;
  while (q.length) {
    const size = q.length;
    result.push([]);
    snap({ line: [8, 9], tone: "warn", level, size, note: `Level ${level}: snapshot levelSize = q.size() = ${size}. Exactly these ${size} node${size > 1 ? "s" : ""} form level ${level}.` });
    for (let i = 0; i < size; i++) {
      const curr = q.shift();
      result[level].push(curr.val);
      snap({ line: [11, 12, 13], tone: "active", level, size, i, cur: curr.id, note: `Pop ${curr.val} from the front (i = ${i} of ${size}) and record it in level ${level}.` });
      const kids = [curr.left, curr.right].filter(Boolean);
      kids.forEach((c) => {
        q.push(c);
        levelOf.set(c.id, level + 1);
      });
      if (kids.length) snap({ line: [14, 15], tone: "default", level, size, i, cur: curr.id, pushed: kids.map((c) => c.id), note: `Push ${curr.val}'s children ${kids.map((c) => c.val).join(", ")} to the back — they belong to level ${level + 1}.` });
    }
    snap({ line: 17, tone: "ok", level, note: `Level ${level} done: [${result[level].join(", ")}].` });
    level++;
  }
  snap({ line: 19, tone: "ok", done: true, level: level - 1, note: `Queue empty → result = ${JSON.stringify(result)}. O(N) time, O(W) space (W = widest level).` });
  return steps;
}

function BFS() {
  const [preset, setPreset] = useState("chapter");
  const root = useMemo(() => fromLevel(TREES[preset].arr), [preset]);
  const steps = useMemo(() => traceBFS(root), [root]);
  const st = useStepper(steps, { baseMs: 800 });
  const s = st.step;
  const byId = useMemo(() => {
    const m = new Map();
    const w = (n) => n && (m.set(n.id, n), w(n.left), w(n.right));
    w(root);
    return m;
  }, [root]);
  // nodes already popped = all seen minus those still in queue
  const done = new Set();
  const inQ = new Set(s.q);
  [...s.seen.keys()].forEach((id) => !inQ.has(id) && done.add(id));
  const pushed = new Set(s.pushed ?? []);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <TreePresets value={preset} onChange={setPreset} />
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <TreeSVG
              root={root}
              style={(n) => {
                const lv = s.seen.get(n.id);
                const col = lv == null ? undefined : LEVEL[lv % LEVEL.length];
                return {
                  fill: done.has(n.id) ? col : undefined,
                  stroke: n.id === s.cur ? C.fg : col,
                  text: done.has(n.id) ? undefined : lv != null ? col : C.muted,
                  ring: inQ.has(n.id) ? col : undefined,
                  dim: lv == null,
                  badge: pushed.has(n.id) ? "+" : undefined,
                  badgeTone: col,
                };
              }}
            />
          </Stage>
          <Legend items={[...Array(Math.min(5, Math.max(...[0, ...s.seen.values()]) + 1)).keys()].map((l) => [LEVEL[l % LEVEL.length], `Level ${l}`]).concat([[C.muted, "dashed ring = waiting in queue"]])} />
          <Panel title="Queue (front → back)">
            <ChipRow items={s.q.map((id) => ({ label: byId.get(id).val, lv: s.seen.get(id) }))} empty="empty" cls={(it) => LEVEL_CLS[it.lv % LEVEL_CLS.length]} />
          </Panel>
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={BFS_CODE} active={s.line} />
          <Panel title="result (vector<vector<int>>)">
            <div className="space-y-1">
              {s.result.length === 0 && <span className="text-xs text-muted-foreground">[]</span>}
              {s.result.map((lv, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-14 font-mono text-[11px] text-muted-foreground">level {k}</span>
                  <ChipRow items={lv} cls={LEVEL_CLS[k % LEVEL_CLS.length]} empty="[ ]" />
                </div>
              ))}
            </div>
          </Panel>
          <VarTable
            vars={[
              ["level", s.level ?? "—", "warn"],
              ["levelSize", s.size ?? "—"],
              ["i", s.i ?? "—", "active"],
              ["q.size()", s.q.length],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* BST insert / search / delete                                        */
/* ------------------------------------------------------------------ */

const BST_CODE = {
  insert: `TreeNode* insertIntoBST(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);

    if (val < root->val) {
        root->left = insertIntoBST(root->left, val);
    } else {
        root->right = insertIntoBST(root->right, val);
    }
    return root;
}`,
  search: `TreeNode* searchBST(TreeNode* root, int val) {
    if (root == nullptr) return nullptr;

    if (val == root->val) {
        return root;
    } else if (val < root->val) {
        return searchBST(root->left, val);
    } else {
        return searchBST(root->right, val);
    }
}`,
  delete: `TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return nullptr;
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        // Scenario 1 & 2: 0 or 1 child
        if (root->left == nullptr) return root->right;
        if (root->right == nullptr) return root->left;
        // Scenario 3: 2 children
        TreeNode* successor = findMin(root->right);
        root->val = successor->val;
        root->right = deleteNode(root->right, successor->val);
    }
    return root;
}`,
};

const clone = (n) => (n ? { ...n, left: clone(n.left), right: clone(n.right) } : null);
const inorderVals = (n, out = []) => (n && (inorderVals(n.left, out), out.push(n), inorderVals(n.right, out)), out);
const maxId = (n) => (n ? Math.max(n.id, maxId(n.left), maxId(n.right)) : -1);
const findId = (n, id) => (!n ? null : n.id === id ? n : findId(n.left, id) ?? findId(n.right, id));

function bstFrom(vals) {
  let root = null;
  let id = 0;
  for (const v of vals) {
    const node = { id: id++, val: v, left: null, right: null };
    if (!root) {
      root = node;
      continue;
    }
    let c = root;
    for (;;) {
      if (v === c.val) break;
      const side = v < c.val ? "left" : "right";
      if (!c[side]) {
        c[side] = node;
        break;
      }
      c = c[side];
    }
  }
  return root;
}

/** Pure: BST operation trace; every step carries the tree snapshot. */
export function traceBST(tree, op, val) {
  const steps = [];
  let root = clone(tree);
  const path = [];
  const snap = (extra) => steps.push({ tree: root, path: [...path], op, val, ...extra });
  const edges = () => path.slice(1).map((id, k) => `${path[k]}-${id}`);
  snap({ line: 1, tone: "default", note: `${op}(${val}) starting at the root.`, edges: [] });

  // walk down
  let parent = null, side = null, c = root;
  while (c && c.val !== val) {
    path.push(c.id);
    const goLeft = val < c.val;
    snap({ cur: c.id, line: op === "search" ? (goLeft ? 7 : 9) : op === "insert" ? (goLeft ? [4, 5] : [6, 7]) : goLeft ? [3, 4] : [5, 6], tone: "active", edges: edges(), note: `${val} ${goLeft ? "<" : ">"} ${c.val} → go ${goLeft ? "left" : "right"}; the whole ${goLeft ? "right" : "left"} subtree is skipped.` });
    parent = c;
    side = goLeft ? "left" : "right";
    c = c[side];
  }

  if (op === "search") {
    if (c) {
      path.push(c.id);
      snap({ cur: c.id, found: c.id, line: [4, 5], tone: "ok", done: true, edges: edges(), note: `Found ${val} after ${path.length} comparison${path.length > 1 ? "s" : ""} — O(h), not O(N).` });
    } else snap({ line: 2, tone: "bad", done: true, edges: edges(), note: `Reached nullptr → ${val} is not in the tree.` });
    return steps;
  }

  if (op === "insert") {
    if (c) {
      path.push(c.id);
      snap({ cur: c.id, line: 1, tone: "warn", done: true, edges: edges(), note: `${val} is already in the tree — this BST keeps values unique, so nothing changes.` });
      return steps;
    }
    const node = { id: maxId(root) + 1, val, left: null, right: null };
    root = clone(root); // never mutate a tree an earlier step points at
    if (!parent) root = node;
    else findId(root, parent.id)[side] = node;
    path.push(node.id);
    snap({ cur: node.id, found: node.id, line: 2, tone: "ok", done: true, edges: edges(), note: parent ? `Hit nullptr as ${parent.val}'s ${side} child → new TreeNode(${val}) goes exactly there.` : `Empty tree → ${val} becomes the root.` });
    return steps;
  }

  // delete
  if (!c) {
    snap({ line: 2, tone: "bad", done: true, edges: edges(), note: `Reached nullptr → ${val} is not in the tree; nothing to delete.` });
    return steps;
  }
  path.push(c.id);
  const relink = (child) => {
    root = clone(root);
    if (!parent) root = child ? findId(root, child.id) : null;
    else findId(root, parent.id)[side] = child ? findId(root, child.id) : null;
  };
  if (!c.left || !c.right) {
    const child = c.left ?? c.right;
    snap({ cur: c.id, target: c.id, line: [9, 10], tone: "warn", edges: edges(), note: child ? `Found ${val} with one child (${child.val}) → return that child to bypass ${val}.` : `Found ${val}: a leaf → simply return nullptr.` });
    relink(child);
    path.pop();
    snap({ line: 16, tone: "ok", done: true, edges: edges(), note: child ? `${child.val}'s subtree now hangs where ${val} was. BST order is preserved.` : `Leaf ${val} removed.` });
    return steps;
  }
  snap({ cur: c.id, target: c.id, line: 11, tone: "warn", edges: edges(), note: `Found ${val} with two children → replace it with its inorder successor (smallest value in the right subtree).` });
  let sp = c, s = c.right;
  path.push(s.id);
  snap({ cur: s.id, target: c.id, line: 12, tone: "purple", edges: edges(), note: `findMin(root->right): start at ${s.val}.` });
  while (s.left) {
    sp = s;
    s = s.left;
    path.push(s.id);
    snap({ cur: s.id, target: c.id, line: 12, tone: "purple", edges: edges(), note: `Keep going left → ${s.val}.` });
  }
  snap({ cur: s.id, target: c.id, succ: s.id, line: 12, tone: "purple", edges: edges(), note: `${s.val} has no left child → it is the successor.` });
  const sv = s.val;
  root = clone(root);
  const c2 = findId(root, c.id), sp2 = findId(root, sp.id), s2 = findId(root, s.id);
  c2.val = sv;
  if (sp2 === c2) sp2.right = s2.right;
  else sp2.left = s2.right;
  snap({ cur: c.id, found: c.id, line: [13, 14], tone: "ok", done: true, edges: [], note: `Copy ${sv} into the node that held ${val}, then delete the old ${sv} from the right subtree (it had at most a right child). Inorder order is unchanged.` });
  return steps;
}

function BST() {
  const [steps, setSteps] = useState(() => [{ tree: bstFrom([8, 3, 10, 1, 6, 14, 4, 7, 13]), path: [], edges: [], op: "insert", line: [], tone: "default", note: "The chapter's BST. Type a value and insert, search or delete it." }]);
  const [draft, setDraft] = useState("5");
  const autoplay = useRef(false);
  const st = useStepper(steps, { baseMs: 800 });
  const s = st.step;
  useEffect(() => {
    if (autoplay.current) {
      autoplay.current = false;
      st.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);
  const run = (op, v = Number(draft)) => {
    if (!Number.isInteger(v)) return;
    autoplay.current = true;
    setSteps(traceBST(steps.at(-1).tree, op, v));
  };
  const reset = (vals) => setSteps([{ tree: bstFrom(vals), path: [], edges: [], op: "insert", line: [], tone: "default", note: "Fresh tree. Try inserting, searching or deleting a value." }]);
  const sorted = inorderVals(s.tree);
  const onPath = new Set(s.path);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input className={cn(inputCls, "w-20")} value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} onKeyDown={(e) => e.key === "Enter" && run("insert")} aria-label="Value" />
        <Button size="sm" onClick={() => run("insert")}>
          Insert
        </Button>
        <Button size="sm" variant="outline" onClick={() => run("search")}>
          Search
        </Button>
        <Button size="sm" variant="outline" onClick={() => run("delete")}>
          Delete
        </Button>
        <Button size="sm" variant="outline" onClick={() => run("insert", 1 + Math.floor(Math.random() * 99))}>
          <Shuffle /> Random insert
        </Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => reset([8, 3, 10, 1, 6, 14, 4, 7, 13])}>
            Chapter BST
          </Button>
          <Button size="sm" variant="ghost" onClick={() => reset([5, 3, 7, 2, 4, 6, 8])}>
            Balanced 1–8
          </Button>
          <Button size="sm" variant="ghost" onClick={() => reset([1, 2, 3, 4, 5])}>
            Sorted inserts (skewed)
          </Button>
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <TreeSVG
              root={s.tree}
              hotEdges={new Set(s.edges)}
              style={(n) => ({
                fill: n.id === s.found ? C.ok : n.id === s.succ ? C.purple : n.id === s.target ? C.warn : n.id === s.cur ? (s.tone === "purple" ? C.purple : C.active) : undefined,
                stroke: n.id === s.found ? C.ok : n.id === s.target ? C.warn : n.id === s.cur && s.tone === "purple" ? C.purple : onPath.has(n.id) ? C.active : undefined,
              })}
            />
          </Stage>
          <Legend
            items={[
              [C.active, "Search path"],
              [C.warn, "Node to delete"],
              [C.purple, "Successor search"],
              [C.ok, "Found / inserted / replaced"],
            ]}
          />
          <Panel title="Inorder traversal = sorted order">
            <ChipRow items={sorted.map((n) => ({ label: n.val, id: n.id }))} empty="(empty)" cls={(it) => (it.id === s.cur || it.id === s.found ? "border-viz-ok bg-viz-ok/15 text-viz-ok" : "")} />
          </Panel>
          <Narration tone={s.tone === "purple" ? "default" : s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={BST_CODE[s.op]} active={s.line} />
          <StatGrid cols={3}>
            <Stat label="Nodes" value={sorted.length} />
            <Stat label="Height" value={treeHeight(s.tree)} tone="warn" hint="Balanced: ~log₂N. Inserting sorted values degrades the BST into a linked list (height N)." />
            <Stat label="Comparisons" value={s.path.length} tone="active" />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}
const treeHeight = (n) => (n ? 1 + Math.max(treeHeight(n.left), treeHeight(n.right)) : 0);

const META = {
  dfs: { title: "DFS Traversals — Preorder, Inorder, Postorder", description: "Same recursion, three places to do the work. Watch the call stack grow and shrink as the output is produced.", badges: ["O(N) time", "O(H) stack"] },
  bfs: { title: "BFS Level-Order Traversal", description: "A queue processes the tree level by level; snapshotting q.size() tells you exactly where each level ends.", badges: ["Queue", "O(N) time", "O(W) space"] },
  bst: { title: "Binary Search Tree — Insert, Search, Delete", description: "Every comparison discards a whole subtree. Inorder traversal always reads the values in sorted order.", badges: ["O(h) per op", "Inorder = sorted"] },
};

export default function TreeLab({ variant = "dfs" }) {
  const m = META[variant] ?? META.dfs;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "bfs" ? <BFS /> : variant === "bst" ? <BST /> : <DFS />}
    </LabShell>
  );
}
