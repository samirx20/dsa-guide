import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROLE_VARIANT = { system: "purple", user: "active", assistant: "success", tool: "warning" };
const ROLE_COLOR = { system: C.purple, user: C.active, assistant: C.ok, tool: C.warn, summary: C.muted };

/** Rough token estimate: ~4 chars/token + 4 tokens of per-message overhead. */
const tok = (s) => Math.ceil((s ?? "").length / 4);
const msgTokens = (m) => 4 + tok(m.content ?? "") + (m.tool_calls ? tok(JSON.stringify(m.tool_calls)) : 0);

function MessageCard({ m, dim, highlight, onDelete }) {
  return (
    <div className={cn("rounded-lg border bg-card px-2.5 py-1.5 transition-all", dim && "opacity-40", highlight && "ring-2 ring-viz-active/40")}>
      <div className="flex items-center gap-1.5">
        <Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge>
        {m.tool_call_id && <span className="font-mono text-[10.5px] text-muted-foreground">tool_call_id={m.tool_call_id}</span>}
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">≈{msgTokens(m)} tok</span>
        {onDelete && (
          <Button variant="ghost" size="icon-sm" className="size-6" onClick={onDelete} aria-label="Delete message">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      {m.content != null && <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px]">{m.content}</div>}
      {m.content == null && !m.tool_calls && <div className="mt-1 font-mono text-[12px] italic text-muted-foreground">content: None</div>}
      {m.tool_calls && (
        <div className="mt-1 space-y-0.5 font-mono text-[11.5px]">
          <span className="italic text-muted-foreground">content: None · tool_calls:</span>
          {m.tool_calls.map((tc) => (
            <div key={tc.id} className="text-viz-warn">
              {tc.id} → {tc.function.name}({tc.function.arguments})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JsonBlock({ value, maxHeight = 260 }) {
  return (
    <ScrollArea className="rounded-lg border bg-code" style={{ maxHeight }} viewportClassName="max-h-[inherit]">
      <pre className="code-body p-2 text-[11.5px]">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: messages                                                   */
/* ------------------------------------------------------------------ */

const CANNED = [
  [/server rack|rack/i, "Server racks normally run with 18–27°C inlet air (ASHRAE recommended range)."],
  [/temperature|temp/i, "T-01 is reading 72.5°C, within its 40–85°C operating band."],
  [/vibration/i, "Vibration above 7.1 mm/s RMS on a pump usually indicates bearing wear."],
  [/hello|hi\b/i, "Hello! I'm monitoring 12 sensors. What would you like to check?"],
];
const scriptedReply = (msgs) => {
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  return (CANNED.find(([re]) => re.test(lastUser?.content ?? ""))?.[1]) ?? "Acknowledged. All monitored sensors are within normal limits.";
};

const MSG_PRESETS = {
  single: { label: "Single turn", msgs: [{ role: "system", content: "You are a sensor monitoring assistant. Respond concisely." }, { role: "user", content: "What is the normal operating temperature for a server rack?" }] },
  multi: {
    label: "Multi-turn history",
    msgs: [
      { role: "system", content: "You are a sensor monitoring assistant. Respond concisely." },
      { role: "user", content: "What is the temperature of sensor T-01?" },
      { role: "assistant", content: "T-01 is reading 72.5°C, within its 40–85°C operating band." },
      { role: "user", content: "And is that normal for a server rack?" },
    ],
  },
  wrongRole: { label: "Mistake: instructions as user", msgs: [{ role: "user", content: "You are a sensor assistant. Answer concisely." }, { role: "user", content: "What is the temperature?" }] },
  noAssistant: {
    label: "Mistake: missing assistant turn",
    msgs: [
      { role: "system", content: "You are a sensor monitoring assistant." },
      { role: "user", content: "What is the temperature of sensor T-01?" },
      { role: "user", content: "Is that normal?" },
    ],
  },
};

/** Pure: lint a message list like a reviewer would. */
export function lintMessages(msgs) {
  const w = [];
  if (!msgs.length) w.push("messages is empty — the API requires at least one message");
  if (msgs.length && msgs[0].role !== "system") w.push("no system message first: behaviour rules end up mixed into user turns");
  msgs.forEach((m, i) => {
    if (i > 0 && m.role === "system") w.push(`message ${i}: system message in the middle of the conversation`);
    if (i > 0 && m.role === msgs[i - 1].role && m.role !== "system") w.push(`messages ${i - 1}–${i}: two ${m.role} turns in a row (missing ${m.role === "user" ? "assistant" : "user"} reply?)`);
    if (!m.content?.trim()) w.push(`message ${i}: empty content`);
  });
  if (msgs.length && msgs.at(-1).role === "assistant") w.push("last message is from the assistant — the model will continue its own turn");
  return w;
}

function MessagesVariant() {
  const [preset, setPreset] = useState("multi");
  const [msgs, setMsgs] = useState(MSG_PRESETS.multi.msgs);
  const [role, setRole] = useState("user");
  const [draft, setDraft] = useState("What does high vibration on pump P101 mean?");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(150);
  const lint = lintMessages(msgs);
  const promptTokens = msgs.reduce((a, m) => a + msgTokens(m), 0) + 3;
  const replyFull = scriptedReply(msgs);
  const replyTok = tok(replyFull);
  const truncated = replyTok > maxTokens;
  const reply = truncated ? replyFull.slice(0, maxTokens * 4) : replyFull;
  const request = { model, messages: msgs, temperature, max_tokens: maxTokens };
  const response = {
    id: "chatcmpl-9x2K…",
    object: "chat.completion",
    model,
    choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: truncated ? "length" : "stop" }],
    usage: { prompt_tokens: promptTokens, completion_tokens: Math.min(replyTok, maxTokens), total_tokens: promptTokens + Math.min(replyTok, maxTokens) },
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={(k) => (setPreset(k), setMsgs(MSG_PRESETS[k].msgs))}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MSG_PRESETS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setMsgs((m) => [...m, { role: "assistant", content: reply }])}>
          Append reply to history
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Panel title={`messages (${msgs.length})`}>
            <div className="space-y-1.5">
              {msgs.map((m, i) => (
                <MessageCard key={i} m={m} onDelete={() => setMsgs((x) => x.filter((_, j) => j !== i))} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["system", "user", "assistant"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input className={cn(inputCls, "min-w-0 flex-1")} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Message content" />
              <Button size="sm" onClick={() => setMsgs((m) => [...m, { role, content: draft }])}>
                <Plus /> Add
              </Button>
            </div>
          </Panel>
          <Narration tone={lint.length ? "warn" : "ok"}>
            {lint.length ? (
              <ul className="list-disc pl-4">
                {lint.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              "Well-formed: system rules first, then alternating user/assistant turns ending with the user. The API is stateless — this whole list is re-sent every call."
            )}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Parameters">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
              </SelectContent>
            </Select>
            <SliderControl label="temperature" value={temperature} min={0} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={setTemperature} />
            <SliderControl label="max_tokens" value={maxTokens} min={5} max={300} step={5} onChange={setMaxTokens} />
          </Panel>
          <RequestResponse request={request} response={response} />
          {truncated && <Badge variant="warning">finish_reason = "length": max_tokens cut the answer off</Badge>}
        </div>
      </Split>
    </>
  );
}

function RequestResponse({ request, response }) {
  const [tab, setTab] = useState("req");
  return (
    <div className="space-y-2">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="req">Request JSON</TabsTrigger>
          <TabsTrigger value="res">Response JSON</TabsTrigger>
        </TabsList>
      </Tabs>
      <JsonBlock value={tab === "req" ? request : response} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: context (token budget + truncation + session memory)       */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = "You are a factory diagnostic assistant. Use tools for live data. Never invent sensor readings. Answer in under 120 words. Escalate any safety-critical finding to a human operator.";

/** Deterministic synthetic history of `turns` user/assistant pairs (+ tool results). */
export function buildHistory(turns) {
  const msgs = [{ role: "system", tokens: 220, label: "system prompt" }];
  for (let i = 0; i < turns; i++) {
    msgs.push({ role: "user", tokens: 30 + ((i * 37) % 50), label: `user turn ${i + 1}` });
    if (i % 3 === 1) msgs.push({ role: "tool", tokens: 350 + ((i * 113) % 300), label: `tool result (sensor dump) ${i + 1}` });
    msgs.push({ role: "assistant", tokens: 60 + ((i * 71) % 140), label: `assistant turn ${i + 1}` });
  }
  return msgs;
}

/** Pure: apply a truncation strategy so prompt + reserve fits the window. */
export function fitContext(msgs, { window, reserve, strategy }) {
  const budget = window - reserve;
  const total = msgs.reduce((a, m) => a + m.tokens, 0);
  if (total <= budget) return { kept: msgs.map((m) => ({ ...m, status: "kept" })), used: total, overflow: 0, error: null };
  if (strategy === "none") return { kept: msgs.map((m) => ({ ...m, status: "kept" })), used: total, overflow: total - budget, error: `400 context_length_exceeded: ${total + reserve} tokens requested, model maximum is ${window}` };
  const [sys, ...rest] = msgs;
  let room = budget - sys.tokens - (strategy === "summarize" ? 150 : 0);
  const keepIdx = new Set();
  for (let i = rest.length - 1; i >= 0; i--) {
    if (rest[i].tokens > room) break;
    room -= rest[i].tokens;
    keepIdx.add(i);
  }
  // never start the window on an orphaned assistant/tool message
  let first = Math.min(...[...keepIdx, rest.length]);
  while (first < rest.length && rest[first].role !== "user") keepIdx.delete(first++);
  const out = [{ ...sys, status: "kept" }];
  const dropped = rest.filter((_, i) => !keepIdx.has(i));
  if (strategy === "summarize" && dropped.length) out.push({ role: "summary", tokens: 150, label: `summary of ${dropped.length} older messages`, status: "summary" });
  rest.forEach((m, i) => out.push({ ...m, status: keepIdx.has(i) ? "kept" : "dropped" }));
  const used = out.filter((m) => m.status !== "dropped").reduce((a, m) => a + m.tokens, 0);
  return { kept: out, used, overflow: 0, error: null, dropped: dropped.length };
}

function ContextVariant() {
  const [turns, setTurns] = useState(14);
  const [window, setWindow] = useState(4096);
  const [reserve, setReserve] = useState(500);
  const [strategy, setStrategy] = useState("sliding");
  const [session, setSession] = useState(true);
  const msgs = useMemo(() => buildHistory(turns), [turns]);
  const fit = useMemo(() => fitContext(msgs, { window, reserve, strategy }), [msgs, window, reserve, strategy]);
  const total = msgs.reduce((a, m) => a + m.tokens, 0);
  const W = 620;
  const scale = (W - 20) / Math.max(window, total + reserve);
  let x = 10;
  const sent = fit.kept.filter((m) => m.status !== "dropped");
  return (
    <>
      <Stage className="p-2">
        <svg viewBox={`0 0 ${W} 96`} className="w-full font-mono">
          <text x={10} y={14} fontSize={10.5} fill={C.muted}>
            prompt sent to the model ({fit.used.toLocaleString()} tok) + reserved for the reply ({reserve})
          </text>
          {sent.map((m, k) => {
            const w = m.tokens * scale;
            const el = <rect key={k} x={x} y={24} width={Math.max(w - 0.6, 0.6)} height={32} fill={ROLE_COLOR[m.role]} opacity={m.role === "summary" ? 0.5 : 0.8} />;
            x += w;
            return el;
          })}
          <rect x={x} y={24} width={reserve * scale} height={32} fill="none" stroke={C.fg} strokeDasharray="3 3" />
          <line x1={10 + window * scale} x2={10 + window * scale} y1={18} y2={64} stroke={C.bad} strokeWidth={2} />
          <text x={10 + window * scale} y={78} fontSize={10.5} textAnchor="end" fill={C.bad}>
            window = {window.toLocaleString()} tokens
          </text>
          {fit.overflow > 0 && (
            <rect x={10 + window * scale} y={24} width={(fit.used + reserve - window) * scale} height={32} fill={C.bad} opacity={0.25} />
          )}
        </svg>
      </Stage>
      <Legend items={[[C.purple, "system"], [C.active, "user"], [C.ok, "assistant"], [C.warn, "tool results"], [C.muted, "summary"]]} />
      <Split>
        <div className="space-y-3">
          <Narration tone={fit.error ? "bad" : fit.dropped ? "warn" : "ok"}>
            {fit.error
              ? `${fit.error}. Without a strategy the request simply fails once the history outgrows the window.`
              : fit.dropped
                ? strategy === "sliding"
                  ? `Sliding window: system prompt pinned, the ${fit.dropped} oldest messages are dropped so the newest turns fit. The model forgets anything said only in those messages.`
                  : `Summarize: ${fit.dropped} older messages are replaced by a ~150-token summary, keeping key facts at a fraction of the cost.`
                : `Everything fits: ${total.toLocaleString()} tokens of history + ${reserve} reserved ≤ ${window.toLocaleString()}.`}
          </Narration>
          <ScrollArea className="max-h-72 rounded-lg" viewportClassName="max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>message</TableHead>
                  <TableHead className="text-right">tokens</TableHead>
                  <TableHead className="text-right">status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fit.kept.map((m, k) => (
                  <TableRow key={k} className={cn(m.status === "dropped" && "opacity-45")}>
                    <TableCell className="py-1 text-[12px]">
                      <span className="mr-1.5 inline-block size-2 rounded-sm" style={{ background: ROLE_COLOR[m.role] }} />
                      {m.label}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12px]">{m.tokens}</TableCell>
                    <TableCell className="py-1 text-right">
                      <Badge variant={m.status === "dropped" ? "danger" : m.status === "summary" ? "secondary" : "success"}>{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <div className="space-y-3">
          <Panel title="Context budget">
            <SliderControl label="conversation turns" value={turns} min={0} max={40} onChange={setTurns} />
            <SliderControl label="context window" value={window} min={1024} max={16384} step={1024} format={(v) => `${v.toLocaleString()} tok`} onChange={setWindow} />
            <SliderControl label="reserve for reply (max_tokens)" value={reserve} min={100} max={2000} step={100} onChange={setReserve} />
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No strategy (send everything)</SelectItem>
                <SelectItem value="sliding">Sliding window (drop oldest)</SelectItem>
                <SelectItem value="summarize">Summarize oldest</SelectItem>
              </SelectContent>
            </Select>
          </Panel>
          <StatGrid cols={2}>
            <Stat label="full history" value={total.toLocaleString()} />
            <Stat label="sent" value={fit.used.toLocaleString()} tone={fit.error ? "bad" : "ok"} />
            <Stat label="input cost / call" value={`$${((fit.used / 1e6) * 2.5).toFixed(4)}`} hint="Illustrative $2.50 per 1M input tokens — every call re-sends the whole prompt" />
            <Stat label="utilization" value={`${Math.round(((fit.used + reserve) / window) * 100)}%`} tone={fit.used + reserve > window ? "bad" : undefined} />
          </StatGrid>
          <Panel title="Session memory">
            <SwitchControl label="Persist session in Redis" hint="Stateless API → the app must store history" checked={session} onChange={setSession} />
            <JsonBlock
              maxHeight={150}
              value={
                session
                  ? `SET session:robot-ops-42 '{"messages": [${fit.kept.length} items], "turns": ${turns}}' EX 1800\n→ next request: GET session:robot-ops-42, append user msg, trim, call model`
                  : "No session store: every request starts from [system, user]. The model has no memory of earlier turns."
              }
            />
          </Panel>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: tools (tool_calls → dispatch table → tool messages)        */
/* ------------------------------------------------------------------ */

const REGISTRY = {
  read_sensor: { sig: "read_sensor(sensor_id: str, metric: str)", run: (a) => ({ sensor_id: a.sensor_id, metric: a.metric, value: a.metric === "vibration" ? 7.8 : 72.5, unit: a.metric === "vibration" ? "mm/s" : "C" }) },
  read_cpu: { sig: "read_cpu()", run: () => ({ cpu_percent: 45.2, load_avg_1m: 1.2, load_avg_5m: 0.9, cores: 8 }) },
  read_memory: { sig: "read_memory()", run: () => ({ used_gb: 12.3, total_gb: 32.0, available_gb: 19.7, swap_used_gb: 0.5 }) },
  list_processes: { sig: "list_processes()", run: () => [{ pid: 1234, name: "python", cpu_percent: 12.5 }, { pid: 9012, name: "postgres", cpu_percent: 8.3 }] },
};

const TOOL_SCENARIOS = {
  single: { label: "One call: read_sensor(T-01)", user: "What is the current temperature of sensor T-01?", calls: [["call_abc123", "read_sensor", '{"sensor_id": "T-01", "metric": "temperature"}']], final: "Sensor T-01 reads 72.5°C — within normal range." },
  parallel: {
    label: "Parallel: full health report",
    user: "Give me a full system health report.",
    calls: [["call_001", "read_cpu", "{}"], ["call_002", "read_memory", "{}"], ["call_003", "list_processes", "{}"]],
    final: "CPU 45% (load 1.2 on 8 cores), memory 12.3/32 GB, top process python at 12.5% CPU. System healthy.",
  },
  unknown: { label: "Hallucinated function name", user: "Reboot the PLC on line 3.", calls: [["call_777", "reboot_plc", '{"line": 3}']], final: "I can't reboot the PLC — no such tool is available. Please contact the controls engineer." },
  badjson: { label: "Malformed arguments JSON", user: "Read vibration on V-03.", calls: [["call_042", "read_sensor", "{'sensor_id': 'V-03'"]], final: "The tool call failed due to malformed arguments; retrying with valid JSON is required." },
};

const ROUTER_CODE = `def execute(self, name: str, arguments: str) -> dict:
    entry = {"function": name, "arguments": arguments}
    if name not in self._registry:              # 1. dispatch lookup
        entry["status"] = "error"
        entry["error"] = f"Unknown function: {name}"
        return entry
    try:
        args = json.loads(arguments)            # 2. parse JSON args
    except json.JSONDecodeError as e:
        entry["status"] = "error"
        entry["error"] = f"Invalid JSON: {e}"
        return entry
    result = self._registry[name]["func"](**args)   # 3. call it
    entry["status"] = "success"
    entry["result"] = result
    return entry

# 4. append a tool message per call
messages.append({"role": "tool",
                 "tool_call_id": call.id,
                 "content": json.dumps(entry)})`;

/** Pure: execute one tool call through the registry (FunctionRouter.execute). */
export function routeCall(name, args) {
  if (!REGISTRY[name]) return { entry: { function: name, arguments: args, status: "error", error: `Unknown function: ${name}` }, line: [3, 4, 5, 6] };
  let parsed;
  try {
    parsed = JSON.parse(args);
  } catch (e) {
    return { entry: { function: name, arguments: args, status: "error", error: `Invalid JSON: ${String(e.message).split("\n")[0]}` }, line: [8, 9, 10, 11, 12] };
  }
  return { entry: { function: name, arguments: args, status: "success", result: REGISTRY[name].run(parsed) }, line: [13, 14, 15, 16] };
}

/** Pure: steps of the tool-call round trip. */
export function toolSteps(sc) {
  const steps = [];
  const msgs = [
    { role: "system", content: "You are a monitoring assistant with access to sensor tools." },
    { role: "user", content: sc.user },
  ];
  steps.push({ msgs: [...msgs], note: "Step 1: the user asks. The request also carries the tools=[…] schemas.", tone: "default" });
  const tool_calls = sc.calls.map(([id, name, a]) => ({ id, type: "function", function: { name, arguments: a } }));
  msgs.push({ role: "assistant", content: null, tool_calls });
  steps.push({ msgs: [...msgs], note: `Step 2: the model does NOT run anything — it returns ${tool_calls.length} tool_call${tool_calls.length > 1 ? "s" : ""} (finish_reason = "tool_calls"). Append this assistant message verbatim.`, tone: "warn" });
  for (const tc of tool_calls) {
    const r = routeCall(tc.function.name, tc.function.arguments);
    steps.push({ msgs: [...msgs], note: `Step 3: router looks up "${tc.function.name}" in the dispatch table → ${r.entry.status === "success" ? "found, parsed args, executed" : r.entry.error}.`, tone: r.entry.status === "success" ? "active" : "bad", line: r.line, active: tc.function.name, entry: r.entry });
    msgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(r.entry) });
    steps.push({ msgs: [...msgs], note: `Step 4: the result goes back as role="tool" with tool_call_id="${tc.id}" so the model can match it to its request${r.entry.status === "error" ? " — errors are returned too, never raised into the void" : ""}.`, tone: "active", line: [19, 20, 21], active: tc.function.name, entry: r.entry });
  }
  msgs.push({ role: "assistant", content: sc.final });
  steps.push({ msgs: [...msgs], note: 'Step 5: second API call with the full list → the model writes the final answer (finish_reason = "stop").', tone: "ok" });
  return steps;
}

function ToolsVariant() {
  const [sk, setSk] = useState("parallel");
  const steps = useMemo(() => toolSteps(TOOL_SCENARIOS[sk]), [sk]);
  const st = useStepper(steps, { baseMs: 1300 });
  const step = st.step;
  return (
    <>
      <Select value={sk} onValueChange={setSk}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TOOL_SCENARIOS).map(([k, s]) => (
            <SelectItem key={k} value={k}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Split>
        <div className="space-y-3">
          <ScrollArea className="max-h-[420px]" viewportClassName="max-h-[420px]">
            <div className="space-y-1.5 pr-2">
              {step.msgs.map((m, i) => (
                <MessageCard key={i} m={m} highlight={i === step.msgs.length - 1} />
              ))}
            </div>
          </ScrollArea>
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>registry key</TableHead>
                <TableHead>callable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(REGISTRY).map(([k, v]) => (
                <TableRow key={k} className={cn(step.active === k && "bg-viz-active/12")}>
                  <TableCell className="py-1 font-mono text-[12px]">"{k}"</TableCell>
                  <TableCell className="py-1 font-mono text-[11.5px] text-muted-foreground">{v.sig}</TableCell>
                </TableRow>
              ))}
              {step.active && !REGISTRY[step.active] && (
                <TableRow className="bg-viz-bad/10">
                  <TableCell className="py-1 font-mono text-[12px] text-viz-bad">"{step.active}"</TableCell>
                  <TableCell className="py-1 text-[11.5px] text-viz-bad">KeyError → not registered</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <CodePanel code={ROUTER_CODE} active={step.line} lang="python" maxHeight={250} title="FunctionRouter.execute" />
          {step.entry && <JsonBlock value={step.entry} maxHeight={120} />}
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: schema (signature → JSON Schema)                           */
/* ------------------------------------------------------------------ */

const TYPES = {
  str: { json: { type: "string" } },
  int: { json: { type: "integer" } },
  float: { json: { type: "number" } },
  bool: { json: { type: "boolean" } },
  "list[str]": { json: { type: "array", items: { type: "string" } } },
  'Literal["temperature", "pressure", "vibration"]': { json: { type: "string", enum: ["temperature", "pressure", "vibration"] } },
  "str | None": { json: { anyOf: [{ type: "string" }, { type: "null" }] }, optional: true },
};
const DEFAULT_PARAMS = [
  { name: "sensor_id", type: "str", required: true, def: "", desc: "Sensor identifier like T-01" },
  { name: "metric", type: 'Literal["temperature", "pressure", "vibration"]', required: false, def: "temperature", desc: "Which metric to read" },
  { name: "window_s", type: "int", required: false, def: "60", desc: "Averaging window in seconds" },
];
const titleCase = (n) => n.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const parseDefault = (p) => {
  if (p.type === "str | None") return null;
  if (p.type === "int") return parseInt(p.def, 10) || 0;
  if (p.type === "float") return parseFloat(p.def) || 0;
  if (p.type === "bool") return p.def === "true" || p.def === "True";
  if (p.type === "list[str]") return [];
  return p.def;
};
const pyDefault = (p) => {
  const v = parseDefault(p);
  return v === null ? "None" : typeof v === "string" ? `"${v}"` : typeof v === "boolean" ? (v ? "True" : "False") : Array.isArray(v) ? "Field(default_factory=list)" : String(v);
};
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

/** Pure: chapter-style function_to_tool() output. */
export function toolSchema(fname, doc, params) {
  const properties = {};
  const required = [];
  for (const p of params) {
    const prop = { ...TYPES[p.type].json, description: p.desc };
    if (p.required) required.push(p.name);
    else prop.default = parseDefault(p);
    properties[p.name] = prop;
  }
  return { type: "function", function: { name: fname, description: doc, parameters: { type: "object", properties, required } } };
}

/** Pure: approximate Pydantic v2 model_json_schema() (keys sorted, titles added). */
export function pydanticSchema(cls, params) {
  const properties = {};
  const required = [];
  for (const p of params) {
    const prop = { ...TYPES[p.type].json, title: titleCase(p.name), description: p.desc };
    if (p.required) required.push(p.name);
    else prop.default = parseDefault(p);
    properties[p.name] = sortKeys(prop);
  }
  const out = { properties, title: cls, type: "object" };
  if (required.length) out.required = required;
  return sortKeys(out);
}

function SchemaVariant() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [mode, setMode] = useState("function");
  const fname = "read_sensor";
  const doc = "Read the current value from a sensor.";
  const set = (i, k, v) => setParams((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const ordered = [...params.filter((p) => p.required), ...params.filter((p) => !p.required)];
  const py =
    mode === "function"
      ? `def ${fname}(\n${ordered.map((p) => `    ${p.name}: ${p.type}${p.required ? "" : ` = ${pyDefault(p)}`},`).join("\n")}\n) -> dict:\n    """${doc}"""\n    ...\n\ntool = function_to_tool(${fname})`
      : `class ReadSensorArgs(BaseModel):\n    """${doc}"""\n${params.map((p) => `    ${p.name}: ${p.type} = Field(${p.required ? "" : `default=${pyDefault(p)}, `}description="${p.desc}")`).join("\n")}\n\nschema = ReadSensorArgs.model_json_schema()`;
  const schema = mode === "function" ? toolSchema(fname, doc, ordered) : pydanticSchema("ReadSensorArgs", params);
  const errs = [];
  if (mode === "function" && params.some((p, i) => !p.required && params.slice(i + 1).some((q) => q.required))) errs.push("Python requires parameters without defaults to come first — the signature above was reordered.");
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="function">inspect.signature → tool</TabsTrigger>
            <TabsTrigger value="pydantic">Pydantic model_json_schema()</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="outline" onClick={() => setParams((ps) => [...ps, { name: `tags`, type: "list[str]", required: false, def: "", desc: "Optional labels" }])}>
          <Plus /> Add param
        </Button>
        <Button size="sm" variant="outline" onClick={() => setParams(DEFAULT_PARAMS)}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>name</TableHead>
              <TableHead>type hint</TableHead>
              <TableHead>required</TableHead>
              <TableHead>default</TableHead>
              <TableHead>description</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {params.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="py-1">
                  <input className={cn(inputCls, "w-28 font-mono")} value={p.name} onChange={(e) => set(i, "name", e.target.value.replace(/\W/g, "_") || "x")} aria-label="Parameter name" />
                </TableCell>
                <TableCell className="py-1">
                  <Select value={p.type} onValueChange={(v) => set(i, "type", v)}>
                    <SelectTrigger className="h-8 w-44 font-mono text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(TYPES).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1">
                  <Switch checked={p.required} onCheckedChange={(v) => set(i, "required", v)} aria-label="Required" />
                </TableCell>
                <TableCell className="py-1">
                  <input className={cn(inputCls, "w-24 font-mono")} disabled={p.required || p.type === "str | None" || p.type === "list[str]"} value={p.required ? "" : p.type === "str | None" ? "None" : p.def} onChange={(e) => set(i, "def", e.target.value)} aria-label="Default" />
                </TableCell>
                <TableCell className="py-1">
                  <input className={cn(inputCls, "w-48")} value={p.desc} onChange={(e) => set(i, "desc", e.target.value)} aria-label="Description" />
                </TableCell>
                <TableCell className="py-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setParams((ps) => ps.filter((_, j) => j !== i))} aria-label="Remove parameter">
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Split className="lg:grid-cols-2">
        <CodePanel code={py} lang="python" title="Python source" maxHeight={340} />
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{mode === "function" ? "tools=[…] entry sent to the API" : "JSON Schema (keys sorted like Pydantic)"}</div>
          <JsonBlock value={schema} maxHeight={340} />
        </div>
      </Split>
      <Narration tone={errs.length ? "warn" : "default"}>
        {errs[0] ?? "Type hints become JSON types (str→string, int→integer, float→number, Literal→enum, list→array). Parameters without a default land in \"required\"; the docstring becomes the description the model reads when choosing a tool."}
      </Narration>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: loop (think → act → observe)                               */
/* ------------------------------------------------------------------ */

const LOOP_SCRIPT = [
  { think: "I need live data for P101's temperature and vibration.", calls: [["call_1", "read_sensor", '{"sensor_id": "T-101", "metric": "temperature"}'], ["call_2", "read_sensor", '{"sensor_id": "V-101", "metric": "vibration"}']] },
  { think: "Vibration 7.8 mm/s is high. Check the maintenance manual for bearings.", calls: [["call_3", "lookup_manual", '{"query": "pump bearing vibration above 7 mm/s"}']] },
  { final: "P101 runs at 72.5°C (normal) but vibration is 7.8 mm/s, above the 7.1 mm/s alarm. Manual §4.2: inspect and re-grease bearings within 24 h." },
];
const LOOP_RESULTS = { call_1: '{"value": 72.5, "unit": "C"}', call_2: '{"value": 7.8, "unit": "mm/s"}', call_3: '{"section": "4.2", "text": "Vibration > 7.1 mm/s: inspect bearings, re-grease"}' };

/** Pure: run the agent loop with a max-rounds guard. */
export function loopSteps({ maxRounds, stuck }) {
  const steps = [];
  const msgs = [
    { role: "system", content: "You are a factory diagnostic agent. Use tools; never guess readings." },
    { role: "user", content: "Is pump P101 healthy? Check its sensors and recommend an action." },
  ];
  let promptTok = 0;
  const callModel = () => (promptTok += msgs.reduce((a, m) => a + msgTokens(m), 0));
  steps.push({ round: 0, phase: "start", msgs: [...msgs], tok: promptTok, note: "messages = [system, user]; enter `for round in range(max_rounds):`", tone: "default" });
  for (let round = 1; round <= maxRounds; round++) {
    callModel();
    const s = stuck ? LOOP_SCRIPT[0] : LOOP_SCRIPT[round - 1];
    if (s.final) {
      msgs.push({ role: "assistant", content: s.final });
      steps.push({ round, phase: "answer", msgs: [...msgs], tok: promptTok, note: `Round ${round}: no tool_calls → finish_reason "stop". Exit condition #1: return the final answer.`, tone: "ok", done: true });
      return steps;
    }
    const calls = s.calls.map(([id, name, a]) => ({ id: stuck ? `call_${round}${id.slice(-1)}` : id, type: "function", function: { name, arguments: a } }));
    msgs.push({ role: "assistant", content: null, tool_calls: calls });
    steps.push({ round, phase: "think", msgs: [...msgs], tok: promptTok, note: `Round ${round} THINK: ${s.think} → ${calls.length} tool_call(s).`, tone: "active" });
    for (const c of calls) msgs.push({ role: "tool", tool_call_id: c.id, content: LOOP_RESULTS[`call_${c.id.slice(-1)}`] ?? LOOP_RESULTS.call_1 });
    steps.push({ round, phase: "observe", msgs: [...msgs], tok: promptTok, note: `Round ${round} ACT + OBSERVE: executed ${calls.map((c) => c.function.name).join(", ")}; appended ${calls.length} tool message(s). Loop again.`, tone: "warn" });
  }
  msgs.push({ role: "assistant", content: "I could not complete the diagnosis within the allowed steps. Escalating to a human operator." });
  steps.push({ round: maxRounds, phase: "guard", msgs: [...msgs], tok: promptTok, note: `max_rounds=${maxRounds} reached without a final answer → exit condition #2: stop and return a safe fallback instead of looping (and paying) forever.`, tone: "bad", done: true });
  return steps;
}

function LoopDiagram({ step }) {
  const nodes = [
    ["think", 110, 60, "THINK", "call model"],
    ["observe", 510, 60, "OBSERVE", "append tool results"],
    ["act", 310, 150, "ACT", "execute tool_calls"],
  ];
  const ph = step.phase === "observe" ? ["act", "observe"] : [step.phase];
  return (
    <svg viewBox="0 0 620 200" className="w-full font-mono">
      <defs>
        <marker id="loop-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      <path d="M180 75 Q 230 140 250 145" fill="none" stroke={C.muted} markerEnd="url(#loop-arr)" />
      <path d="M370 145 Q 400 140 445 80" fill="none" stroke={C.muted} markerEnd="url(#loop-arr)" />
      <path d="M440 50 Q 310 10 182 50" fill="none" stroke={C.muted} markerEnd="url(#loop-arr)" />
      {nodes.map(([id, x, y, label, sub]) => {
        const on = ph.includes(id);
        return (
          <g key={id}>
            <rect x={x - 72} y={y - 24} width={144} height={48} rx={24} fill={C.active} fillOpacity={on ? 0.22 : 0.05} stroke={C.active} strokeWidth={on ? 2.4 : 1} />
            <text x={x} y={y - 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.fg}>
              {label}
            </text>
            <text x={x} y={y + 13} textAnchor="middle" fontSize={10} fill={C.muted}>
              {sub}
            </text>
          </g>
        );
      })}
      <text x={310} y={66} textAnchor="middle" fontSize={22} fontWeight={700} fill={step.phase === "guard" ? C.bad : C.fg}>
        round {step.round}
      </text>
      {step.phase === "answer" && (
        <text x={310} y={192} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ok}>
          ✓ final answer (finish_reason = "stop")
        </text>
      )}
      {step.phase === "guard" && (
        <text x={310} y={192} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.bad}>
          ✕ max_rounds guard tripped
        </text>
      )}
    </svg>
  );
}

function LoopVariant() {
  const [maxRounds, setMaxRounds] = useState(5);
  const [stuck, setStuck] = useState(false);
  const steps = useMemo(() => loopSteps({ maxRounds, stuck }), [maxRounds, stuck]);
  const st = useStepper(steps, { baseMs: 1200 });
  const step = st.step;
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <LoopDiagram step={step} />
          </Stage>
          <Narration tone={step.tone}>{step.note}</Narration>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <Panel title="Loop guard">
            <SliderControl label="max_rounds" value={maxRounds} min={1} max={8} onChange={setMaxRounds} />
            <SwitchControl label="Model gets stuck" hint="keeps re-calling read_sensor" checked={stuck} onChange={setStuck} />
          </Panel>
          <VarTable
            vars={[
              ["round", step.round, "active"],
              ["len(messages)", step.msgs.length],
              ["cumulative prompt tokens", `≈${step.tok}`, "warn"],
              ["exit", step.phase === "answer" ? "stop" : step.phase === "guard" ? "max_rounds" : "—", step.done ? (step.phase === "answer" ? "ok" : "bad") : undefined],
            ]}
          />
          <ScrollArea className="max-h-64" viewportClassName="max-h-64">
            <div className="space-y-1 pr-2">
              {step.msgs.map((m, i) => (
                <MessageCard key={i} m={m} highlight={i >= step.msgs.length - 1} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: self-correct                                               */
/* ------------------------------------------------------------------ */

const SEVERITIES = ["low", "medium", "high", "critical"];
const SC_OUTPUTS = {
  fixes: {
    label: "Fixes itself on attempt 3",
    outputs: [
      '```json\n{"machine_id": "P101", "severity": "high", "action": "inspect bearings"}\n```',
      '{"machine_id": "P101", "severity": "very high", "action": "fix", "estimated_downtime_hours": -2}',
      '{"machine_id": "P101", "severity": "high", "action": "inspect bearings", "estimated_downtime_hours": 4.0}',
    ],
  },
  first: { label: "Valid on first try", outputs: ['{"machine_id": "P101", "severity": "medium", "action": "re-grease drive bearings", "estimated_downtime_hours": 1.5}'] },
  never: { label: "Never valid", outputs: ['{"machine_id": "", "severity": "urgent"}', '{"machine_id": "P101", "severity": "URGENT", "action": "check"}', '{"machine_id": "P101", "severity": 3, "action": "check it", "estimated_downtime_hours": "soon"}'] },
  refusal: { label: "Non-retriable refusal", outputs: ["I'm sorry, I can't help with that request."], nonRetriable: true },
};

/** Pure: validate model output against DiagnosticResult. */
export function validateDiagnostic(raw) {
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    return [{ type: "json_invalid", loc: [], msg: "Invalid JSON: expected value at line 1 column 1" }];
  }
  const e = [];
  if (!("machine_id" in d)) e.push({ type: "missing", loc: ["machine_id"], msg: "Field required" });
  else if (typeof d.machine_id !== "string") e.push({ type: "string_type", loc: ["machine_id"], msg: "Input should be a valid string" });
  else if (d.machine_id.length < 1) e.push({ type: "string_too_short", loc: ["machine_id"], msg: "String should have at least 1 character" });
  if (!("severity" in d)) e.push({ type: "missing", loc: ["severity"], msg: "Field required" });
  else if (!SEVERITIES.includes(d.severity)) e.push({ type: "enum", loc: ["severity"], msg: "Input should be 'low', 'medium', 'high' or 'critical'" });
  if (!("action" in d)) e.push({ type: "missing", loc: ["action"], msg: "Field required" });
  else if (typeof d.action !== "string") e.push({ type: "string_type", loc: ["action"], msg: "Input should be a valid string" });
  else if (d.action.length < 10) e.push({ type: "string_too_short", loc: ["action"], msg: "String should have at least 10 characters" });
  if (!("estimated_downtime_hours" in d)) e.push({ type: "missing", loc: ["estimated_downtime_hours"], msg: "Field required" });
  else {
    const v = d.estimated_downtime_hours;
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : NaN;
    if (Number.isNaN(n)) e.push({ type: typeof v === "string" ? "float_parsing" : "float_type", loc: ["estimated_downtime_hours"], msg: typeof v === "string" ? "Input should be a valid number, unable to parse string as a number" : "Input should be a valid number" });
    else if (n < 0) e.push({ type: "greater_than_equal", loc: ["estimated_downtime_hours"], msg: "Input should be greater than or equal to 0" });
  }
  return e;
}

/** Pure: self-correction loop steps. */
export function selfCorrectSteps(sc, maxRetries) {
  const steps = [];
  const log = [];
  let prompt = "Diagnose pump P101 from the readings. Return ONLY JSON matching DiagnosticResult.";
  for (let a = 0; a < maxRetries; a++) {
    const raw = sc.outputs[Math.min(a, sc.outputs.length - 1)];
    steps.push({ attempt: a + 1, phase: "call", raw, prompt, log: [...log], note: `Attempt ${a + 1}/${maxRetries}: call the LLM.`, tone: "active" });
    if (sc.nonRetriable) {
      log.push([a + 1, "refusal", "non-retriable"]);
      steps.push({ attempt: a + 1, phase: "fail", raw, prompt, log: [...log], note: "Not JSON and not fixable by feedback (a refusal). classify_error → non-retriable: stop immediately instead of burning retries.", tone: "bad", result: "failed" });
      return steps;
    }
    const errs = validateDiagnostic(raw);
    if (!errs.length) {
      log.push([a + 1, "valid", "DiagnosticResult ✓"]);
      steps.push({ attempt: a + 1, phase: "ok", raw, prompt, errs, log: [...log], note: `DiagnosticResult.model_validate_json() succeeded on attempt ${a + 1}.`, tone: "ok", result: "valid" });
      return steps;
    }
    log.push([a + 1, `${errs.length} error(s)`, errs.map((e) => e.type).join(", ")]);
    const fb = `Your previous output failed validation:\n${errs.map((e) => `- ${e.loc.join(".") || "(root)"}: ${e.msg}`).join("\n")}\nReturn ONLY valid JSON. No markdown fences.`;
    steps.push({ attempt: a + 1, phase: "invalid", raw, prompt, errs, log: [...log], note: `Validation failed (${errs.map((e) => e.type).join(", ")}).${a < maxRetries - 1 ? " Append the errors to the prompt and retry." : ""}`, tone: "bad" });
    prompt = `${prompt}\n\n${fb}`;
  }
  steps.push({ attempt: maxRetries, phase: "exhausted", raw: steps.at(-1).raw, prompt, log: [...log], note: `max_retries=${maxRetries} exhausted → return None and let the deterministic fallback take over.`, tone: "bad", result: "failed" });
  return steps;
}

function SelfCorrectVariant() {
  const [sk, setSk] = useState("fixes");
  const [maxRetries, setMaxRetries] = useState(3);
  const steps = useMemo(() => selfCorrectSteps(SC_OUTPUTS[sk], maxRetries), [sk, maxRetries]);
  const st = useStepper(steps, { baseMs: 1300 });
  const step = st.step;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sk} onValueChange={setSk}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SC_OUTPUTS).map(([k, s]) => (
              <SelectItem key={k} value={k}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {step.result && <Badge variant={step.result === "valid" ? "success" : "danger"}>{step.result === "valid" ? "success path" : "failure path"}</Badge>}
      </div>
      <Split>
        <div className="space-y-3">
          <Panel title="Prompt sent (grows with feedback)">
            <JsonBlock value={step.prompt} maxHeight={170} />
          </Panel>
          <Panel title={`LLM output — attempt ${step.attempt}`}>
            <JsonBlock value={step.raw} maxHeight={110} />
          </Panel>
          {step.errs?.length > 0 && (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>loc</TableHead>
                    <TableHead>type</TableHead>
                    <TableHead>msg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {step.errs.map((e, k) => (
                    <TableRow key={k}>
                      <TableCell className="py-1 font-mono text-[11.5px]">{e.loc.join(".") || "—"}</TableCell>
                      <TableCell className="py-1 font-mono text-[11.5px] text-viz-bad">{e.type}</TableCell>
                      <TableCell className="py-1 text-[11.5px]">{e.msg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Loop">
            <SliderControl label="max_retries" value={maxRetries} min={1} max={5} onChange={setMaxRetries} />
          </Panel>
          <CodePanel
            lang="python"
            maxHeight={230}
            active={step.phase === "call" ? 4 : step.phase === "ok" ? [5, 6] : step.phase === "invalid" ? [7, 8, 9] : step.phase === "fail" ? [7, 8] : 10}
            code={`def self_correct(prompt, model_cls, max_retries=${maxRetries}):
    msg = prompt
    for attempt in range(max_retries):
        raw = call_llm(msg)
        try:
            return model_cls.model_validate_json(raw)
        except ValidationError as e:
            if not is_retriable(e): break
            msg = prompt + "\\n\\nFix these errors:\\n" + str(e)
    return None   # caller falls back deterministically`}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>attempt</TableHead>
                <TableHead>result</TableHead>
                <TableHead>error types</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {step.log.map(([a, r, t]) => (
                <TableRow key={a}>
                  <TableCell className="py-1 font-mono text-[12px]">{a}</TableCell>
                  <TableCell className="py-1 text-[12px]">{r}</TableCell>
                  <TableCell className="py-1 font-mono text-[11px]">{t}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <StatGrid cols={2}>
            <Stat label="attempts used" value={`${step.attempt}/${maxRetries}`} tone="active" />
            <Stat label="prompt size" value={`≈${tok(step.prompt)} tok`} tone="warn" hint="Each retry re-sends the prompt plus all feedback" />
          </StatGrid>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

const META = {
  messages: { title: "Chat Completions Message Builder", description: "Assemble system / user / assistant messages, tune parameters, and inspect the exact request and response JSON. Scripted model — no network calls.", badges: ["roles", "stateless API", "finish_reason"] },
  context: { title: "Context Window Budget", description: "Watch history, tool results and the reply reserve compete for a fixed token window, then compare dropping the oldest turns with summarizing them.", badges: ["tokens", "sliding window", "session memory"] },
  tools: { title: "Tool Calls & Dynamic Dispatch", description: "The model only requests tools. Your router looks the name up in a dispatch table, parses the JSON arguments, runs it, and appends a role=tool message.", badges: ["tool_calls", "registry", "tool_call_id"] },
  schema: { title: "Function → JSON Schema Generator", description: "Edit a Python signature or Pydantic model and see the tool schema the LLM receives update live.", badges: ["inspect.signature", "model_json_schema", "Literal → enum"] },
  loop: { title: "The Real Agent Loop", description: "Think → act → observe until the model answers — or the max_rounds guard stops a runaway loop. Scripted model outputs.", badges: ["agent loop", "max_rounds", "exit conditions"] },
  "self-correct": { title: "Self-Correction Loop", description: "Validate every LLM output with Pydantic; feed the errors back and retry up to a limit, and stop early on non-retriable failures.", badges: ["ValidationError", "retry with feedback", "max_retries"] },
};

export default function AgentLoopLab({ variant = "messages" }) {
  const m = META[variant] ?? META.messages;
  const Body = { messages: MessagesVariant, context: ContextVariant, tools: ToolsVariant, schema: SchemaVariant, loop: LoopVariant, "self-correct": SelfCorrectVariant }[variant] ?? MessagesVariant;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      <Body />
    </LabShell>
  );
}
