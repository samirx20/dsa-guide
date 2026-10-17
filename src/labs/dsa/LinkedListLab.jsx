import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { C, CodePanel, LabShell, Legend, Narration, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";

const randList = (n, max = 9) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * max));

/* ------------------------------------------------------------------ */
/* Generic row renderer: boxes + next arrows                           */
/* ------------------------------------------------------------------ */

const TONE = { active: C.active, ok: C.ok, bad: C.bad, warn: C.warn, purple: C.purple };

/**
 * items: [{ key, label, kind?: "null"|"dummy", tone?, dropped? }]
 * next: { [key]: targetKey | undefined }
 * edgeTone: { [key]: tone } colours a node's outgoing arrow
 * pointers: [{ key, label, tone }]
 */
function ListRow({ items, next, edgeTone = {}, pointers = [], title, gap = 74, width, top = 62 }) {
  const boxW = 46, boxH = 34;
  const W = width ?? Math.max(300, items.length * gap + 14);
  const rowY = top;
  const slot = Object.fromEntries(items.map((it, k) => [it.key, k]));
  const X = (k) => 20 + k * gap + boxW / 2;
  const Yof = (it) => rowY + (it.dropped ? 44 : 0);
  const stackMax = Math.max(0, ...Object.values(pointers.reduce((m, p) => ((m[p.key] = (m[p.key] ?? 0) + 1), m), {})));
  const H = rowY + boxH / 2 + 12 + stackMax * 17 + (items.some((i) => i.dropped) ? 44 : 0);
  const byKey = Object.fromEntries(items.map((it) => [it.key, it]));
  const ptrAt = {};
  pointers.forEach((p) => (ptrAt[p.key] ??= []).push(p));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label={title ?? "Linked list"}>
      <defs>
        {["ink", "active", "ok", "bad", "warn", "purple"].map((t) => (
          <marker key={t} id={`ll-arrow-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={t === "ink" ? C.ink : TONE[t]} />
          </marker>
        ))}
      </defs>
      {title && (
        <text x={6} y={14} fontSize={11} fill={C.muted} fontWeight={600}>
          {title}
        </text>
      )}
      {items.map((it) => {
        const tgt = next[it.key];
        if (tgt == null || byKey[tgt] == null) return null;
        const a = slot[it.key], b = slot[tgt];
        const ya = Yof(it), yb = Yof(byKey[tgt]);
        const t = edgeTone[it.key];
        const color = t ? TONE[t] : C.ink;
        const marker = `url(#ll-arrow-${t ?? "ink"})`;
        const sw = t ? 2.4 : 1.6;
        if (it.dropped || byKey[tgt].dropped || (b === a + 1 && ya !== yb))
          return <line key={`e${it.key}`} x1={X(a) + boxW / 2} y1={ya} x2={X(b) - boxW / 2 - 2} y2={yb} stroke={color} strokeWidth={1.3} strokeDasharray="4 3" opacity={0.6} markerEnd={marker} />;
        if (b === a + 1 && ya === yb) return <line key={`e${it.key}`} x1={X(a) + boxW / 2} y1={ya - 5} x2={X(b) - boxW / 2 - 2} y2={yb - 5} stroke={color} strokeWidth={sw} markerEnd={marker} />;
        if (b === a - 1 && ya === yb) return <line key={`e${it.key}`} x1={X(a) - boxW / 2} y1={ya + 7} x2={X(b) + boxW / 2 + 2} y2={yb + 7} stroke={color} strokeWidth={sw} markerEnd={marker} />;
        // non-adjacent or across levels: arc above (forward) / below (backward)
        const fwd = b > a;
        const x1 = X(a) + (fwd ? 8 : -8), x2 = X(b) + (fwd ? -8 : 8);
        const y1 = ya + (fwd ? -boxH / 2 : boxH / 2), y2 = yb + (fwd ? -boxH / 2 - 2 : boxH / 2 + 2);
        const lift = fwd ? -26 - Math.abs(b - a) * 4 : 26 + Math.abs(b - a) * 4;
        return <path key={`e${it.key}`} d={`M${x1},${y1} C${x1},${Math.min(y1, y2) + lift} ${x2},${Math.min(y1, y2) + lift} ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} markerEnd={marker} />;
      })}
      {items.map((it, k) => {
        const x = X(k), y = Yof(it);
        const tone = it.tone ? TONE[it.tone] : null;
        if (it.kind === "null")
          return (
            <text key={it.key} x={x} y={y + 4} textAnchor="middle" fontSize={11} fill={C.muted}>
              null
            </text>
          );
        return (
          <g key={it.key} opacity={it.dropped ? 0.55 : 1} className="transition-all duration-300">
            <rect
              x={x - boxW / 2}
              y={y - boxH / 2}
              width={boxW}
              height={boxH}
              rx={7}
              fill={tone ?? (it.kind === "dummy" ? C.warn : C.card)}
              fillOpacity={tone || it.kind === "dummy" ? 0.16 : 1}
              stroke={tone ?? (it.kind === "dummy" ? C.warn : C.ink)}
              strokeWidth={tone ? 2.2 : 1.3}
              strokeDasharray={it.kind === "dummy" ? "4 3" : undefined}
            />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={it.kind === "dummy" ? 11 : 14} fontWeight={700} fill={it.dropped ? C.bad : C.fg} textDecoration={it.dropped ? "line-through" : undefined}>
              {it.label}
            </text>
          </g>
        );
      })}
      {Object.entries(ptrAt).map(([key, ps]) => {
        const it = byKey[key];
        if (!it) return null;
        const x = X(slot[key]);
        const y = Yof(it) + boxH / 2 + 16;
        return ps.map((p, j) => (
          <g key={`${key}-${p.label}`}>
            <rect x={x - 34} y={y + j * 17 - 11} width={68} height={15} rx={4} fill={TONE[p.tone] ?? C.active} fillOpacity={0.16} stroke={TONE[p.tone] ?? C.active} strokeWidth={1} />
            <text x={x} y={y + j * 17} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={TONE[p.tone] ?? C.active}>
              {p.label}
            </text>
          </g>
        ));
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* reverse                                                             */
/* ------------------------------------------------------------------ */

const REV_CODE = `ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;

    while (curr != nullptr) {
        // 1. Save the rest of the list
        ListNode* next_node = curr->next;

        // 2. REVERSE the pointer
        curr->next = prev;

        // 3. Slide prev and curr forward
        prev = curr;
        curr = next_node;
    }

    // curr is nullptr, prev is the NEW head
    return prev;
}`;

/** Pure: 3-pointer reversal. next[i] is an index, "L" (null drawn left) or "R" (null drawn right). */
export function traceReverse(vals) {
  const n = vals.length;
  const next = vals.map((_, i) => (i + 1 < n ? i + 1 : "R"));
  const steps = [];
  let prev = null, curr = n ? 0 : null, nxt;
  const name = (i) => (i == null ? "nullptr" : `node(${vals[i]})`);
  const snap = (extra) => steps.push({ next: [...next], prev, curr, nxt, ...extra });
  snap({ line: [2, 3], tone: "default", note: `Start: prev = nullptr, curr = head = ${name(curr)}.` });
  let it = 0;
  while (curr != null) {
    it++;
    snap({ line: 5, iter: it, tone: "default", note: `Iteration ${it}: curr = ${name(curr)} is not null → enter the loop.` });
    nxt = typeof next[curr] === "number" ? next[curr] : null;
    snap({ line: 7, iter: it, tone: "warn", edge: curr, note: `Save next_node = curr->next = ${name(nxt)} — otherwise we'd lose the rest of the list.` });
    next[curr] = prev == null ? "L" : prev;
    snap({ line: 10, iter: it, tone: "ok", edge: curr, flipped: curr, note: `Flip: ${name(curr)}->next = prev = ${name(prev)}. This arrow now points backwards.` });
    prev = curr;
    curr = nxt;
    snap({ line: [13, 14], iter: it, tone: "active", note: `Slide forward: prev = ${name(prev)}, curr = ${name(curr)}.` });
  }
  snap({ line: 5, iter: it, tone: "default", note: `curr is nullptr → the loop ends after ${it} iteration${it === 1 ? "" : "s"}.` });
  snap({ line: 18, iter: it, tone: "ok", done: true, note: `Return prev = ${name(prev)}: the list now reads ${[...vals].reverse().join(" → ")} → nullptr. O(N) time, O(1) space.` });
  return steps;
}

function Reverse() {
  const [vals, setVals] = useState([1, 2, 3]);
  const steps = useMemo(() => traceReverse(vals), [vals]);
  const st = useStepper(steps, { baseMs: 900 });
  const s = st.step;
  const items = [{ key: "L", label: "null", kind: "null" }, ...vals.map((v, i) => ({ key: i, label: v, tone: s.curr === i ? "active" : s.prev === i ? "purple" : undefined })), { key: "R", label: "null", kind: "null" }];
  const next = Object.fromEntries(s.next.map((t, i) => [i, t]));
  const edgeTone = {};
  s.next.forEach((t, i) => (edgeTone[i] = t === "L" || (typeof t === "number" && t < i) ? "ok" : undefined));
  if (s.edge != null) edgeTone[s.edge] = s.flipped != null ? "ok" : "warn";
  const pointers = [
    { key: s.prev ?? "L", label: "prev", tone: "purple" },
    { key: s.curr ?? "R", label: "curr", tone: "active" },
    ...(s.nxt !== undefined && !s.done ? [{ key: s.nxt ?? "R", label: "next_node", tone: "warn" }] : []),
    { key: s.done ? s.prev : 0, label: s.done ? "new head" : "head", tone: "ok" },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={vals.length === 3 ? "secondary" : "outline"} size="sm" onClick={() => setVals([1, 2, 3])}>
          1 → 2 → 3
        </Button>
        <Button variant={vals.length === 5 ? "secondary" : "outline"} size="sm" onClick={() => setVals([1, 2, 3, 4, 5])}>
          1 → 2 → 3 → 4 → 5
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVals([7])}>
          Single node
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVals(randList(4 + Math.floor(Math.random() * 3)))}>
          <Shuffle /> Random
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <ListRow items={items} next={next} edgeTone={edgeTone} pointers={pointers} />
          </Stage>
          <Legend
            items={[
              [C.purple, "prev"],
              [C.active, "curr"],
              [C.warn, "next_node (saved)"],
              [C.ok, "Reversed arrow"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={REV_CODE} active={s.line} />
          <VarTable
            vars={[
              ["prev", s.prev == null ? "nullptr" : `node(${vals[s.prev]})`, "purple"],
              ["curr", s.curr == null ? "nullptr" : `node(${vals[s.curr]})`, "active"],
              ["next_node", s.nxt === undefined ? "—" : s.nxt == null ? "nullptr" : `node(${vals[s.nxt]})`, "warn"],
              ["iteration", s.iter ?? 0],
              ["extra memory", "3 pointers · O(1)"],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* dummy head: remove elements + merge two sorted lists                */
/* ------------------------------------------------------------------ */

const REMOVE_CODE = `ListNode* removeElements(ListNode* head, int val) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* curr = &dummy;

    while (curr->next != nullptr) {
        if (curr->next->val == val) {
            curr->next = curr->next->next;  // bypass
        } else {
            curr = curr->next;              // advance
        }
    }
    return dummy.next;
}`;
const MERGE_CODE = `ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;

    while (list1 != nullptr && list2 != nullptr) {
        if (list1->val <= list2->val) {
            tail->next = list1;
            list1 = list1->next;
        } else {
            tail->next = list2;
            list2 = list2->next;
        }
        tail = tail->next;
    }
    // Attach whatever is left over
    if (list1 != nullptr) tail->next = list1;
    else if (list2 != nullptr) tail->next = list2;

    return dummy.next;
}`;

/** Pure: dummy-head removal. Keys: "D" = dummy, 0..n-1 nodes. */
export function traceRemove(vals, target) {
  const n = vals.length;
  const next = { D: n ? 0 : "R" };
  vals.forEach((_, i) => (next[i] = i + 1 < n ? i + 1 : "R"));
  const dropped = new Set();
  const steps = [];
  let curr = "D";
  const name = (k) => (k === "D" ? "dummy" : k === "R" ? "nullptr" : `node(${vals[k]})`);
  const snap = (extra) => steps.push({ next: { ...next }, dropped: [...dropped], curr, ...extra });
  snap({ line: [2, 3, 4], tone: "warn", note: `Create dummy(0) on the stack, point it at head, and start curr at the dummy — the real head is now "just another next".` });
  let it = 0;
  while (next[curr] !== "R") {
    it++;
    const nx = next[curr];
    snap({ line: 7, it, tone: "active", look: nx, note: `Iteration ${it}: curr = ${name(curr)}; is curr->next->val (${vals[nx]}) == ${target}?` });
    if (vals[nx] === target) {
      next[curr] = next[nx];
      dropped.add(nx);
      snap({ line: 8, it, tone: "bad", look: nx, note: `Match → bypass: ${name(curr)}->next = ${name(next[curr])}. ${curr === "D" ? "That removed the head with no special case!" : ""} curr stays put.` });
    } else {
      curr = nx;
      snap({ line: 10, it, tone: "default", note: `No match → advance curr to ${name(curr)}.` });
    }
  }
  const kept = vals.filter((_, i) => !dropped.has(i));
  snap({ line: 13, it, tone: "ok", done: true, note: `curr->next is nullptr → stop. Return dummy.next: ${kept.length ? kept.join(" → ") + " → nullptr" : "nullptr (every node removed)"}.` });
  return steps;
}

/** Pure: merge with dummy + tail. Keys "a0.." for list1, "b0.." for list2. */
export function traceMerge(A, B) {
  const steps = [];
  const merged = []; // keys in order
  let i = 0, j = 0;
  const key = (k) => (k[0] === "a" ? A[+k.slice(1)] : B[+k.slice(1)]);
  const snap = (extra) => steps.push({ merged: [...merged], i, j, ...extra });
  snap({ line: [2, 3], tone: "warn", note: `dummy(0) is a placeholder head; tail starts at the dummy. We never ask "which list is the head?".` });
  while (i < A.length && j < B.length) {
    snap({ line: 6, tone: "active", cmp: true, note: `Compare list1 (${A[i]}) <= list2 (${B[j]})? ${A[i] <= B[j] ? "Yes → take from list1." : "No → take from list2."}` });
    if (A[i] <= B[j]) {
      merged.push(`a${i}`);
      i++;
      snap({ line: [7, 8, 13], tone: "ok", note: `tail->next = list1 node (${A[i - 1]}); list1 advances; tail moves onto the new node.` });
    } else {
      merged.push(`b${j}`);
      j++;
      snap({ line: [10, 11, 13], tone: "ok", note: `tail->next = list2 node (${B[j - 1]}); list2 advances; tail moves onto the new node.` });
    }
  }
  const restA = i < A.length;
  const rest = restA ? A.slice(i) : B.slice(j);
  if (restA) while (i < A.length) merged.push(`a${i++}`);
  else while (j < B.length) merged.push(`b${j++}`);
  snap({ line: restA ? 16 : 17, tone: "purple", note: rest.length ? `One list is empty → attach the leftover [${rest.join(", ")}] in one pointer assignment.` : `Both lists are exhausted — nothing left over.` });
  snap({ line: 19, tone: "ok", done: true, note: `Return dummy.next: ${merged.map(key).join(" → ")} → nullptr.` });
  return steps;
}

function DummyRemove() {
  const [vals, setVals] = useState([6, 2, 6, 3]);
  const [target, setTarget] = useState(6);
  const steps = useMemo(() => traceRemove(vals, target), [vals, target]);
  const st = useStepper(steps, { baseMs: 900 });
  const s = st.step;
  const drop = new Set(s.dropped);
  const items = [{ key: "D", label: "dummy", kind: "dummy", tone: s.curr === "D" ? "active" : undefined }, ...vals.map((v, i) => ({ key: i, label: v, dropped: drop.has(i), tone: drop.has(i) ? "bad" : s.curr === i ? "active" : s.look === i ? "warn" : undefined })), { key: "R", label: "null", kind: "null" }];
  const next = { ...s.next };
  const edgeTone = s.curr != null ? { [s.curr]: s.tone === "bad" ? "bad" : "active" } : {};
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => (setVals([6, 2, 6, 3]), setTarget(6))}>
          Chapter: 6 → 2 → 6 → 3, val 6
        </Button>
        <Button variant="outline" size="sm" onClick={() => (setVals([7, 7, 7, 2]), setTarget(7))}>
          Head run: 7 → 7 → 7 → 2
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVals(randList(6, 4))}>
          <Shuffle /> Random
        </Button>
        <div className="w-40">
          <SliderControl label="val to remove" value={target} min={1} max={9} onChange={setTarget} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <ListRow items={items} next={next} edgeTone={edgeTone} pointers={[{ key: s.curr, label: "curr", tone: "active" }]} />
          </Stage>
          <Legend
            items={[
              [C.warn, "Dummy / node being checked"],
              [C.active, "curr"],
              [C.bad, "Bypassed (removed)"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={REMOVE_CODE} active={s.line} />
          <StatGrid cols={2}>
            <Stat label="Removed" value={s.dropped.length} tone="bad" />
            <Stat label="Special head case?" value="none" tone="ok" hint="Because curr starts at the dummy, deleting the real head is the same bypass as any other node." />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function DummyMerge() {
  const [A, setA] = useState([1, 2, 4]);
  const [B, setB] = useState([1, 3, 4]);
  const steps = useMemo(() => traceMerge(A, B), [A, B]);
  const st = useStepper(steps, { baseMs: 900 });
  const s = st.step;
  const taken = new Set(s.merged);
  const rowFor = (arr, p, idx) => {
    const items = arr.map((v, k) => ({ key: `${p}${k}`, label: v, dropped: taken.has(`${p}${k}`), tone: taken.has(`${p}${k}`) ? undefined : k === idx && s.cmp ? "active" : undefined }));
    const next = {};
    arr.forEach((_, k) => (next[`${p}${k}`] = k + 1 < arr.length && !taken.has(`${p}${k}`) ? `${p}${k + 1}` : undefined));
    return { items: [...items.filter((x) => !x.dropped), { key: `${p}N`, label: "null", kind: "null" }], next: { ...next, [`${p}${arr.length - 1}`]: taken.has(`${p}${arr.length - 1}`) ? undefined : `${p}N` } };
  };
  const r1 = rowFor(A, "a", s.i);
  const r2 = rowFor(B, "b", s.j);
  const val = (k) => (k[0] === "a" ? A[+k.slice(1)] : B[+k.slice(1)]);
  const mItems = [{ key: "D", label: "dummy", kind: "dummy" }, ...s.merged.map((k, x) => ({ key: k, label: val(k), tone: x === s.merged.length - 1 ? "ok" : k[0] === "a" ? "active" : "purple" }))];
  const mNext = {};
  mItems.forEach((it, x) => x + 1 < mItems.length && (mNext[it.key] = mItems[x + 1].key));
  const tailKey = mItems.at(-1).key;
  const W = (A.length + B.length + 2) * 62 + 14;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => (setA([1, 2, 4]), setB([1, 3, 4]))}>
          [1,2,4] + [1,3,4]
        </Button>
        <Button variant="outline" size="sm" onClick={() => (setA([2, 5, 8, 9]), setB([1]))}>
          Uneven: [2,5,8,9] + [1]
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setA(randList(2 + Math.floor(Math.random() * 3)).sort((x, y) => x - y));
            setB(randList(2 + Math.floor(Math.random() * 3)).sort((x, y) => x - y));
          }}
        >
          <Shuffle /> Random
        </Button>
      </div>
      <Split>
        <div className="space-y-2">
          <Stage className="overflow-x-auto p-2">
            <div className="min-w-[440px] space-y-1">
            <ListRow title="list1" width={W} gap={62} top={38} items={r1.items} next={r1.next} pointers={s.i < A.length ? [{ key: `a${s.i}`, label: "list1", tone: "active" }] : []} />
            <ListRow title="list2" width={W} gap={62} top={38} items={r2.items} next={r2.next} pointers={s.j < B.length ? [{ key: `b${s.j}`, label: "list2", tone: "purple" }] : []} />
            <ListRow title="merged (dummy → …)" width={W} gap={62} top={38} items={mItems} next={mNext} edgeTone={mItems.length > 1 ? { [mItems.at(-2).key]: "ok" } : {}} pointers={[{ key: tailKey, label: "tail", tone: "warn" }]} />
            </div>
          </Stage>
          <Legend
            items={[
              [C.active, "From list1"],
              [C.purple, "From list2"],
              [C.ok, "Just attached"],
              [C.warn, "dummy / tail"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={MERGE_CODE} active={s.line} />
          <StatGrid cols={2}>
            <Stat label="Merged nodes" value={s.merged.length} tone="ok" />
            <Stat label="New nodes allocated" value="0" hint="We only re-wire existing next pointers; the dummy lives on the stack." />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

function Dummy() {
  const [tab, setTab] = useState("remove");
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="remove">Remove elements</TabsTrigger>
          <TabsTrigger value="merge">Merge two sorted lists</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "remove" ? <DummyRemove /> : <DummyMerge />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Floyd's tortoise & hare                                             */
/* ------------------------------------------------------------------ */

const FLOYD_CODE = `ListNode *detectCycle(ListNode *head) {
    ListNode* slow = head;
    ListNode* fast = head;
    bool has_cycle = false;

    // 1. Find intersection
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { has_cycle = true; break; }
    }
    if (!has_cycle) return nullptr;

    // 2. Reset slow to head
    slow = head;
    // 3. Move both by 1 until they collide
    while (slow != fast) {
        slow = slow->next;
        fast = fast->next;
    }
    return slow;  // cycle start
}`;

/** Pure: next(i) = i+1, last -> entry (or null). Returns steps for both phases. */
export function traceFloyd(n, entry) {
  const nx = (i) => (i == null ? null : i + 1 < n ? i + 1 : entry == null ? null : entry);
  const steps = [];
  let slow = 0, fast = 0, it = 0, slowDist = 0;
  const snap = (extra) => steps.push({ slow, fast, it, ...extra });
  snap({ phase: 1, line: [2, 3, 4], tone: "default", note: `slow and fast both start at the head, node(1).` });
  let met = false;
  while (fast != null && nx(fast) != null) {
    it++;
    slow = nx(slow);
    slowDist++;
    fast = nx(nx(fast));
    met = slow === fast;
    snap({ phase: 1, line: met ? 10 : [8, 9], tone: met ? "ok" : "active", note: met ? `Iteration ${it}: slow → node(${slow + 1}), fast → node(${fast + 1}). They meet! A cycle exists.` : `Iteration ${it}: slow moves 1 → node(${slow + 1}); fast moves 2 → ${fast == null ? "nullptr" : `node(${fast + 1})`}.` });
    if (met) break;
  }
  if (!met) {
    snap({ phase: 1, line: 12, tone: "bad", done: true, note: `fast reached the end (nullptr) → no cycle. Return nullptr. Only ${it} iterations, O(1) space.` });
    return steps;
  }
  const meet = slow;
  slow = 0;
  let it2 = 0;
  snap({ phase: 2, line: 15, tone: "warn", meet, note: `Phase 2: reset slow to head; fast stays at the meeting point node(${meet + 1}). Both now move 1 step at a time.` });
  while (slow !== fast) {
    it2++;
    slow = nx(slow);
    fast = nx(fast);
    snap({ phase: 2, line: slow === fast ? 21 : [18, 19], tone: slow === fast ? "ok" : "active", meet, it2, note: slow === fast ? `They collide at node(${slow + 1}) — the cycle start. a = ${entry} step${entry === 1 ? "" : "s"} from head.` : `Both advance: slow → node(${slow + 1}), fast → node(${fast + 1}).` });
  }
  const c = n - entry;
  const b = (((meet - entry) % c) + c) % c;
  snap({ phase: 2, line: 21, tone: "ok", done: true, meet, start: slow, it2, note: `Return node(${slow + 1}). Math check: a = ${entry}, b = ${b}, c = ${c} → a + b = ${entry + b} is a multiple of c, so walking a steps from head and from the meeting point lands on the same node.` });
  return steps;
}

function FloydSVG({ n, entry, step }) {
  const s = 64, pad = 40;
  const tail = entry ?? n;
  const L = entry == null ? 0 : n - entry;
  const R = L ? Math.max(58, (L * s) / (2 * Math.PI)) : 0;
  const cy = Math.max(R + 64, 70);
  const cx = pad + tail * s + R;
  const P = (i) => {
    if (i < tail) return { x: pad + i * s, y: cy, out: [0, -1] };
    const th = Math.PI + (2 * Math.PI * (i - tail)) / L;
    const ux = Math.cos(th), uy = Math.sin(th);
    return { x: cx + R * ux, y: cy + R * uy, out: [ux, uy] };
  };
  const W = Math.max(320, entry == null ? pad + n * s + 40 : cx + R + 86);
  const H = cy + (L ? R : 0) + 64;
  const r = 17;
  const arrow = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { x1: a.x + (dx / d) * r, y1: a.y + (dy / d) * r, x2: b.x - (dx / d) * (r + 3), y2: b.y - (dy / d) * (r + 3) };
  };
  const nullPos = { x: pad + n * s, y: cy };
  const label = (i, txt, tone, k) => {
    const p = P(i);
    const vertical = i <= tail; // line nodes and the cycle entry: slow above, fast below
    const [ox, oy] = vertical ? [0, k === 0 ? -1 : 1] : p.out;
    const dist = vertical ? 33 : k === 0 ? 34 : 54;
    return (
      <g key={txt}>
        <rect x={p.x + ox * dist - 22} y={p.y + oy * dist - 8} width={44} height={15} rx={4} fill={tone} fillOpacity={0.18} stroke={tone} />
        <text x={p.x + ox * dist} y={p.y + oy * dist + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={tone}>
          {txt}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono" role="img" aria-label="Linked list with cycle">
      <defs>
        <marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.ink} />
        </marker>
        <marker id="fl-arrow-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.warn} />
        </marker>
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const j = i + 1 < n ? i + 1 : entry;
        if (j == null) {
          const a = arrow(P(i), nullPos);
          return <line key={`e${i}`} {...a} stroke={C.ink} strokeWidth={1.6} markerEnd="url(#fl-arrow)" />;
        }
        const back = i === n - 1;
        const a = arrow(P(i), P(j));
        return <line key={`e${i}`} {...a} stroke={back ? C.warn : C.ink} strokeWidth={back ? 2.2 : 1.6} markerEnd={back ? "url(#fl-arrow-warn)" : "url(#fl-arrow)"} />;
      })}
      {entry == null && (
        <text x={nullPos.x + 6} y={nullPos.y + 4} fontSize={11} fill={C.muted}>
          null
        </text>
      )}
      {Array.from({ length: n }, (_, i) => {
        const p = P(i);
        const isStart = step.start === i;
        const isMeet = step.meet === i;
        const color = isStart ? C.ok : isMeet ? C.warn : entry != null && i >= entry ? C.purple : C.ink;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={r} fill={isStart || isMeet ? color : C.card} fillOpacity={isStart || isMeet ? 0.2 : 1} stroke={color} strokeWidth={isStart || isMeet ? 2.6 : 1.4} />
            <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.fg}>
              {i + 1}
            </text>
          </g>
        );
      })}
      {step.slow != null && label(step.slow, "slow", C.active, 0)}
      {step.fast != null && label(step.fast, "fast", C.bad, 1)}
    </svg>
  );
}

function Floyd() {
  const [n, setN] = useState(7);
  const [hasCycle, setHasCycle] = useState(true);
  const [entry, setEntry] = useState(3);
  const e = hasCycle ? Math.min(entry, n - 2) : null;
  const steps = useMemo(() => traceFloyd(n, e), [n, e]);
  const st = useStepper(steps, { baseMs: 1000 });
  const s = st.step;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <SliderControl label="List length" value={n} min={4} max={10} onChange={setN} />
        <SwitchControl label="Cycle" hint="last node points back into the list" checked={hasCycle} onChange={setHasCycle} />
        <SliderControl label="Cycle entry (node)" value={(e ?? Math.min(entry, n - 2)) + 1} min={1} max={n - 1} onChange={(v) => setEntry(v - 1)} disabled={!hasCycle} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant={s.phase === 1 ? "active" : "outline"}>Phase 1 · find meeting point</Badge>
        <Badge variant={s.phase === 2 ? "warning" : "outline"}>Phase 2 · find cycle start</Badge>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <FloydSVG n={n} entry={e} step={s} />
          </Stage>
          <Legend
            items={[
              [C.active, "slow (1 step)"],
              [C.bad, "fast (2 steps / 1 in phase 2)"],
              [C.purple, "Nodes on the cycle"],
              [C.warn, "Meeting point"],
              [C.ok, "Cycle start"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-3">
          <CodePanel code={FLOYD_CODE} active={s.line} />
          <VarTable
            vars={[
              ["slow", s.slow == null ? "nullptr" : `node(${s.slow + 1})`, "active"],
              ["fast", s.fast == null ? "nullptr" : `node(${s.fast + 1})`, "bad"],
              ["phase-1 iterations", s.it],
              ["phase-2 iterations", s.it2 ?? "—"],
              ["a (head → start)", e ?? "no cycle"],
              ["c (cycle length)", e == null ? "—" : n - e],
            ]}
          />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

const META = {
  reverse: { title: "Reversing a Linked List — The 3-Pointer Trick", description: "Save next, flip curr->next to prev, slide forward. Every arrow is reversed in one pass.", badges: ["O(N) time", "O(1) space"] },
  dummy: { title: "Dummy Head (Sentinel) Nodes", description: "A fake node before the head removes every 'what if the head changes?' special case.", badges: ["Sentinel", "No head edge case"] },
  floyd: { title: "Floyd's Tortoise & Hare — Cycle Detection", description: "If fast (2 steps) ever lands on slow (1 step) there is a cycle; reset slow to head to find where it starts.", badges: ["O(N) time", "O(1) space"] },
};

export default function LinkedListLab({ variant = "reverse" }) {
  const m = META[variant] ?? META.reverse;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "dummy" ? <Dummy /> : variant === "floyd" ? <Floyd /> : <Reverse />}
    </LabShell>
  );
}
