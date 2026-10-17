import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, useStepper } from "@/viz/kit";
import { LOG_SCHEMA, argTypeName, assignable, jsonDumps, jsonLoads, parseArgs, processLine, pyRepr, pyTypeName, runtimeMatches, typeName, validateRecord } from "./_PythonFoundationsLab-logic";

const inputCls = "h-8 w-full rounded-md border border-input bg-card px-2 font-mono text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const areaCls = "w-full rounded-md border border-input bg-card px-2 py-1.5 font-mono text-[12.5px] leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Pick({ value, onChange, options, className = "w-56" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ResultBox({ title, tone, children }) {
  const cls = { ok: "border-viz-ok/50 bg-viz-ok/8", bad: "border-viz-bad/50 bg-viz-bad/8", warn: "border-viz-warn/50 bg-viz-warn/8", default: "bg-muted/40" }[tone ?? "default"];
  return (
    <div className={cn("rounded-lg border px-3 py-2", cls)}>
      <div className="mb-1 font-mono text-[11px] font-semibold text-muted-foreground">{title}</div>
      <div className="font-mono text-[12.5px] leading-relaxed break-words">{children}</div>
    </div>
  );
}

/* ================================================================== */
/* 1. Type-checker boundary                                            */
/* ================================================================== */
const T = { int: { k: "int" }, float: { k: "float" }, str: { k: "str" }, None: { k: "None" } };
const U = (...of) => ({ k: "union", of });
const LIT = (...vals) => ({ k: "lit", vals: vals.map((v) => (typeof v === "string" ? { t: "str", v } : { t: "int", v })) });
const num = (n) => n.t === "int" || n.t === "float" || n.t === "bool";
const val = (n) => (n.t === "bool" ? (n.v ? 1 : 0) : n.v);

function pyAdd(a, b) {
  if (num(a) && num(b)) return a.t === "float" || b.t === "float" ? { t: "float", v: val(a) + val(b) } : { t: "int", v: val(a) + val(b) };
  if (a.t === "str" && b.t === "str") return { t: "str", v: a.v + b.v };
  if (a.t === "str") throw new Error(`TypeError: can only concatenate str (not "${pyTypeName(b)}") to str`);
  throw new Error(`TypeError: unsupported operand type(s) for +: '${a.t === "None" ? "NoneType" : a.t}' and '${b.t === "None" ? "NoneType" : b.t}'`);
}

const FUNCS = {
  add: {
    label: "add_numbers(a: int, b: int)",
    group: "Basic hints",
    name: "add_numbers",
    params: [["a", T.int], ["b", T.int]],
    ret: T.int,
    code: (call) => `def add_numbers(a: int, b: int) -> int:\n    return a + b\n\nresult = add_numbers(${call})`,
    presets: ["2, 3", '"hello", "world"', '2, "3"', "2.5, 1", "True, 1"],
    run: ([a, b]) => pyAdd(a, b),
  },
  find: {
    label: "find_sensor(...) -> Optional[str]",
    group: "Optional",
    name: "find_sensor",
    params: [["sensor_id", T.str]],
    ret: U(T.str, T.None),
    code: (call, upper) =>
      `from typing import Optional\n\ndef find_sensor(sensor_id: str) -> Optional[str]:\n    sensors = {"S001": "Temperature", "S002": "Pressure"}\n    return sensors.get(sensor_id)  # None if missing\n\nresult = find_sensor(${call})` +
      (upper ? "\nprint(result.upper())  # no None check!" : "\nif result is not None:\n    print(result.upper())"),
    presets: ['"S001"', '"S999"', "42"],
    run: ([id]) => {
      const m = { S001: "Temperature", S002: "Pressure" };
      return id.t === "str" && m[id.v] ? { t: "str", v: m[id.v] } : { t: "None", v: null };
    },
  },
  parseId: {
    label: "parse_id(raw: Union[str, int])",
    group: "Union",
    name: "parse_id",
    params: [["raw", U(T.str, T.int)]],
    ret: T.int,
    code: (call) => `from typing import Union\n\ndef parse_id(raw: Union[str, int]) -> int:\n    if isinstance(raw, str):\n        return int(raw)\n    return raw\n\nresult = parse_id(${call})`,
    presets: ['"42"', "42", '"4x2"', "3.7", "None"],
    run: ([r]) => {
      if (r.t === "str") {
        if (/^\s*[-+]?\d+\s*$/.test(r.v)) return { t: "int", v: parseInt(r.v, 10) };
        throw new Error(`ValueError: invalid literal for int() with base 10: ${pyRepr(r)}`);
      }
      return r;
    },
  },
  reading: {
    label: "parse_sensor_reading(raw: str | float)",
    group: "Union + match",
    name: "parse_sensor_reading",
    params: [["raw", U(T.str, T.float)]],
    ret: T.float,
    code: (call) => `def parse_sensor_reading(raw: str | float) -> float:\n    match raw:\n        case float() as f:\n            return f\n        case str() as s:\n            return float(s)\n\nresult = parse_sensor_reading(${call})`,
    presets: ['"22.5"', "22.5", "22", '"abc"', "None"],
    run: ([r]) => {
      if (r.t === "float") return r;
      if (r.t === "str") {
        if (/^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(r.v)) return { t: "float", v: parseFloat(r.v) };
        throw new Error(`ValueError: could not convert string to float: ${pyRepr(r)}`);
      }
      return { t: "None", v: null }; // no case matched → implicit return None
    },
  },
  stack: {
    label: "Stack[int].push(item: T)",
    group: "Generic[T]",
    name: "push",
    owner: "Stack",
    params: [["item", T.int]],
    ret: T.int,
    code: (call) =>
      `T = TypeVar("T")\n\nclass Stack(Generic[T]):\n    def __init__(self) -> None:\n        self._items: list[T] = []\n    def push(self, item: T) -> None:\n        self._items.append(item)\n    def pop(self) -> T:\n        return self._items.pop()\n\nint_stack: Stack[int] = Stack()\nint_stack.push(42)\nint_stack.push(${call})\nresult = int_stack.pop() + 1   # far away, later...`,
    presets: ["7", '"hello"', "3.14", "None"],
    run: ([x]) => pyAdd(x, { t: "int", v: 1 }),
  },
  literal: {
    label: "create_sensor(Literal types)",
    group: "Literal",
    name: "create_sensor",
    params: [
      ["sensor_type", LIT("temperature", "pressure", "humidity", "vibration")],
      ["priority", LIT(1, 2, 3, 4, 5)],
    ],
    ret: { k: "any" },
    code: (call) =>
      `SensorType = Literal["temperature", "pressure", "humidity", "vibration"]\nPriority = Literal[1, 2, 3, 4, 5]\n\ndef create_sensor(sensor_type: SensorType, priority: Priority) -> dict:\n    return {"type": sensor_type, "priority": priority}\n\nresult = create_sensor(${call})`,
    presets: ['"temperature", 1', '"temp", 1', '"pressure", 6'],
    run: ([t, p]) => ({ t: "dict", v: [["type", t], ["priority", p]] }),
  },
};

function typeCheck(fn, args, upper) {
  const errs = [];
  const where = fn.owner ? `"${fn.name}" of "${fn.owner}"` : `"${fn.name}"`;
  if (args.length > fn.params.length) errs.push(`Too many arguments for ${where}  [call-arg]`);
  fn.params.forEach(([p, Tp], k) => {
    const a = args[k];
    if (!a) errs.push(`Missing positional argument "${p}" in call to ${where}  [call-arg]`);
    else if (!assignable(a, Tp)) errs.push(`Argument ${k + 1} to ${where} has incompatible type "${argTypeName(a, Tp)}"; expected "${typeName(Tp)}"  [arg-type]`);
  });
  if (fn === FUNCS.find && upper) errs.push(`Item "None" of "str | None" has no attribute "upper"  [union-attr]`);
  return errs;
}

function runtime(fn, args, upper) {
  if (args.length !== fn.params.length) {
    const fname = fn.owner ? `${fn.owner}.${fn.name}()` : `${fn.name}()`;
    return { exc: args.length < fn.params.length ? `TypeError: ${fname} missing ${fn.params.length - args.length} required positional argument(s)` : `TypeError: ${fname} takes ${fn.params.length} positional argument(s) but ${args.length} were given` };
  }
  try {
    const v = fn.run(args);
    if (fn === FUNCS.find) {
      if (upper && v.t === "None") return { value: v, exc: "AttributeError: 'NoneType' object has no attribute 'upper'" };
      return { value: v, printed: v.t === "str" ? v.v.toUpperCase() : upper ? null : "(nothing printed — None was handled)" };
    }
    return { value: v };
  } catch (e) {
    return { exc: e.message };
  }
}

function TypesLab() {
  const [fk, setFk] = useState("add");
  const fn = FUNCS[fk];
  const [call, setCall] = useState(fn.presets[1]);
  const [upper, setUpper] = useState(true);
  const parsed = parseArgs(call);
  const args = parsed.args ?? [];
  const errs = parsed.error ? [] : typeCheck(fn, args, upper);
  const rt = parsed.error ? { exc: parsed.error } : runtime(fn, args, upper);
  const wrongRet = rt.value && !rt.exc && fn.ret.k !== "any" && !runtimeMatches(rt.value, fn.ret);
  const crashed = !!rt.exc;

  let verdict, tone;
  if (parsed.error) [verdict, tone] = ["That is not valid Python literal syntax.", "bad"];
  else if (!errs.length && !crashed && !wrongRet) [verdict, tone] = ["Both agree: mypy is happy and the program runs correctly.", "ok"];
  else if (errs.length && crashed) [verdict, tone] = ["mypy flagged this BEFORE running — and at runtime it really does crash. The type checker just saved you a production incident.", "ok"];
  else if (fk === "find" && upper && !crashed) [verdict, tone] = ["This particular call returned a str, so it ran — but mypy knows find_sensor() CAN return None and refuses the unguarded .upper(). Try \"S999\".", "warn"];
  else if (errs.length && !crashed) [verdict, tone] = [`Python does NOT enforce hints: it ran without error${wrongRet ? ` and returned the wrong type (${pyTypeName(rt.value)})` : ""}. Only mypy catches this silent bug.`, "warn"];
  else if (!errs.length && crashed) [verdict, tone] = ["mypy cannot see VALUES — the types are fine, but the string content is invalid. Runtime validation (try/except) is still required.", "bad"];
  else [verdict, tone] = [`mypy accepted it (int is promoted to float), but no match case fired at runtime, so the function silently returned ${pyRepr(rt.value)}.`, "warn"];

  const choose = (k) => {
    setFk(k);
    setCall(FUNCS[k].presets[1] ?? FUNCS[k].presets[0]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pick value={fk} onChange={choose} options={Object.entries(FUNCS).map(([k, f]) => [k, `${f.group}: ${f.label}`])} className="w-80" />
        {fk === "find" && (
          <div className="w-64">
            <SwitchControl label="Call .upper() without None check" checked={upper} onChange={setUpper} />
          </div>
        )}
      </div>
      <Split>
        <div className="space-y-3">
          <CodePanel code={fn.code(call, upper)} lang="python" title="sample.py" active={fn.code(call, upper).split("\n").findIndex((l) => l.includes(call) && l.includes("(")) + 1} />
          <Panel title="Edit the call arguments">
            <input className={inputCls} value={call} onChange={(e) => setCall(e.target.value)} spellCheck={false} aria-label="call arguments" />
            <div className="flex flex-wrap gap-1.5">
              {fn.presets.map((p) => (
                <Button key={p} size="xs" variant={p === call ? "secondary" : "outline"} className="font-mono" onClick={() => setCall(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-3">
          <ResultBox title="$ mypy --strict sample.py  (static, before running)" tone={parsed.error ? "bad" : errs.length ? "bad" : "ok"}>
            {parsed.error ? <span className="text-viz-bad">{parsed.error}</span> : errs.length ? errs.map((e) => <div key={e} className="text-viz-bad">sample.py: error: {e}</div>) : <span className="text-viz-ok">Success: no issues found in 1 source file</span>}
          </ResultBox>
          <ResultBox title="$ python sample.py  (runtime, CPython)" tone={crashed ? "bad" : wrongRet ? "warn" : "ok"}>
            {rt.value && (
              <div>
                result = <span className={wrongRet ? "text-viz-warn" : "text-viz-ok"}>{pyRepr(rt.value)}</span> <span className="text-muted-foreground">({pyTypeName(rt.value)})</span>
              </div>
            )}
            {rt.printed && <div>stdout: {rt.printed}</div>}
            {rt.exc && (
              <div className="text-viz-bad">
                Traceback (most recent call last): …
                <br />
                {rt.exc}
              </div>
            )}
          </ResultBox>
          {!parsed.error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>param</TableHead>
                  <TableHead>declared</TableHead>
                  <TableHead>passed</TableHead>
                  <TableHead className="text-right">mypy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fn.params.map(([p, Tp], k) => {
                  const a = args[k];
                  const ok = a && assignable(a, Tp);
                  return (
                    <TableRow key={p}>
                      <TableCell className="py-1.5 font-mono text-[12px]">{p}</TableCell>
                      <TableCell className="py-1.5 font-mono text-[11.5px] text-viz-active">{typeName(Tp)}</TableCell>
                      <TableCell className="py-1.5 font-mono text-[12px]">{a ? `${pyRepr(a)}: ${pyTypeName(a)}` : "—"}</TableCell>
                      <TableCell className="py-1.5 text-right">
                        <Badge variant={ok ? "success" : "danger"}>{ok ? "✓" : "✗"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Split>
      <Narration tone={tone}>{verdict}</Narration>
    </div>
  );
}

/* ================================================================== */
/* 2. JSON boundary                                                    */
/* ================================================================== */
const JSON_PRESETS = {
  valid: { label: "Valid sensor payload", text: '{"sensor_id": "TEMP-001", "temperature": 22.5, "timestamp": "2024-05-01T08:00:00Z"}' },
  strTemp: { label: "Temperature as a string", text: '{"sensor_id": "TEMP-002", "temperature": "23.8", "timestamp": "2024-05-01T08:00:05Z"}' },
  intId: { label: "Numeric id + int temp", text: '{"sensor_id": 101, "temperature": 22, "timestamp": "2024-05-01T08:00:10Z", "active": true}' },
  badJson: { label: "Malformed (unquoted key)", text: '{"sensor_id": "TEMP-001", temperature: 22.5}' },
  missing: { label: "Missing temperature", text: '{"sensor_id": "TEMP-003", "timestamp": "2024-05-01T08:00:15Z"}' },
  notNumber: { label: '"not_a_number" + spike', text: '{"sensor_id": "TEMP-004", "temperature": "not_a_number", "timestamp": "2024-05-01T08:00:20Z"}' },
  range: { label: "Out-of-range spike", text: '{"sensor_id": "TEMP-005", "temperature": 999.0, "timestamp": "2024-05-01T08:00:25Z", "unit": "celsius"}' },
};
const JSON_SCHEMA = [
  { name: "sensor_id", type: "str" },
  { name: "temperature", type: "float", range: [-50, 200] },
  { name: "timestamp", type: "str" },
  { name: "unit", type: "str", default: { t: "str", v: "celsius" } },
];
const STATUS_BADGE = { ok: ["success", "valid"], coerced: ["warning", "coerced"], rejected: ["danger", "rejected"], default: ["outline", "default"] };

function JsonLab() {
  const [preset, setPreset] = useState("strTemp");
  const [text, setText] = useState(JSON_PRESETS.strTemp.text);
  const [strict, setStrict] = useState(false);
  let parsed = null,
    perr = null;
  try {
    parsed = jsonLoads(text);
  } catch (e) {
    perr = e.message;
  }
  const isDict = parsed?.t === "dict";
  const v = isDict ? validateRecord(JSON_SCHEMA, parsed, strict) : null;
  const rec = v?.ok ? { t: "dict", v: v.fields.map((f) => [f.spec.name, f.out]) } : null;
  const roundTrip = rec ? jsonDumps(rec) : null;
  const changed = rec && roundTrip !== jsonDumps({ t: "dict", v: parsed.v.filter(([k]) => JSON_SCHEMA.some((f) => f.name === k)) });

  const stage = perr ? 1 : !isDict ? 2 : !v.ok ? 2 : 3;
  const tone = perr || (v && !v.ok) || !isDict ? "bad" : v.fields.some((f) => f.status === "coerced") ? "warn" : "ok";
  const note = perr
    ? "json.loads() raised JSONDecodeError — the payload never even became a dict. Wrap it in try/except and reject the request."
    : !isDict
      ? "Valid JSON, but not an object — the dataclass needs key/value fields."
      : !v.ok
        ? `Parsed into a dict fine, but the typed boundary rejected it: ${v.fields.find((f) => f.status === "rejected").msg}.`
        : v.fields.some((f) => f.status === "coerced")
          ? "Accepted, but only because lax mode coerced some fields. Turn on strict mode to reject wrong-typed input instead of guessing."
          : "Clean: every field matched its declared type. JSON true/null became Python True/None; numbers kept int vs float.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pick
          value={preset}
          onChange={(k) => {
            setPreset(k);
            setText(JSON_PRESETS[k].text);
          }}
          options={Object.entries(JSON_PRESETS).map(([k, p]) => [k, p.label])}
        />
        <div className="w-60">
          <SwitchControl label="Strict validation (no coercion)" checked={strict} onChange={setStrict} />
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Panel title="1 · raw untrusted payload (str from the API)">
            <textarea className={areaCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON payload" />
          </Panel>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {["json.loads()", "dict", "SensorReading(...)", "json.dumps()"].map((s, k) => (
              <span key={s} className="inline-flex items-center gap-2">
                <Badge variant={k < stage + (stage === 3 ? 1 : 0) ? "success" : k === stage ? "danger" : "outline"} className="font-mono">
                  {s}
                </Badge>
                {k < 3 && "→"}
              </span>
            ))}
          </div>
          <ResultBox title="2 · data = json.loads(raw)" tone={perr ? "bad" : "ok"}>
            {perr ? <span className="text-viz-bad">json.JSONDecodeError: {perr}</span> : <span>{pyRepr(parsed)}</span>}
          </ResultBox>
          {rec && (
            <ResultBox title="4 · json.dumps(asdict(reading))  — round trip" tone={changed ? "warn" : "ok"}>
              {roundTrip}
              {changed && <div className="mt-1 text-[11.5px] text-viz-warn">≠ input: coerced/defaulted values were normalized on the way back out.</div>}
            </ResultBox>
          )}
        </div>
        <div className="space-y-3">
          <CodePanel
            lang="python"
            title="3 · typed boundary"
            code={`@dataclass\nclass SensorReading:\n    sensor_id: str\n    temperature: float   # -50 ≤ t ≤ 200\n    timestamp: str\n    unit: str = "celsius"`}
            maxHeight={170}
          />
          {v && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>field</TableHead>
                  <TableHead>input</TableHead>
                  <TableHead className="text-right">result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.fields.map((f) => (
                  <TableRow key={f.spec.name}>
                    <TableCell className="py-1.5 font-mono text-[12px]">
                      {f.spec.name}: <span className="text-viz-active">{f.spec.type}</span>
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[12px]">{f.input ? pyRepr(f.input) : "—"}</TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Tip content={f.msg || "type matches"}>
                        <span>
                          <Badge variant={STATUS_BADGE[f.status][0]}>{STATUS_BADGE[f.status][1]}</Badge>
                        </span>
                      </Tip>
                    </TableCell>
                  </TableRow>
                ))}
                {v.extras.map(([k, x]) => (
                  <TableRow key={k}>
                    <TableCell className="py-1.5 font-mono text-[12px] text-viz-purple">{k}</TableCell>
                    <TableCell className="py-1.5 font-mono text-[12px]">{pyRepr(x)}</TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Badge variant="purple">extra · ignored</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Split>
      <Narration tone={tone}>{note}</Narration>
    </div>
  );
}

/* ================================================================== */
/* 3. Classes: blueprint vs instances                                  */
/* ================================================================== */
const initClasses = () => ({
  cls: { default_unit: "celsius" },
  objs: [
    { name: "reading_1", d: { sensor_id: "S-001", temperature: 22.5 } },
    { name: "reading_2", d: { sensor_id: "S-002", temperature: 85.0 } },
  ],
  log: [],
  flash: null,
});
const fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? v.toFixed(1) : String(+v.toFixed(2))) : typeof v === "boolean" ? (v ? "True" : "False") : `'${v}'`);

function ClassesLab() {
  const [s, setS] = useState(initClasses);
  const [sel, setSel] = useState("reading_2");
  const [temp, setTemp] = useState(40);
  const [thr, setThr] = useState(80);
  const obj = s.objs.find((o) => o.name === sel) ?? s.objs[0];
  const other = s.objs.find((o) => o.name !== obj.name);

  const push = (expr, call, result, mut) =>
    setS((x) => {
      const n = mut ? mut(structuredClone(x)) : { ...x };
      n.log = [{ expr, call, result }, ...x.log].slice(0, 20);
      return n;
    });
  const lookup = (o, attr) => (attr in o.d ? ["instance", o.d[attr]] : attr in s.cls ? ["class", s.cls[attr]] : ["missing", null]);

  const create = () => {
    const k = s.objs.length + 1;
    const name = `reading_${k}`;
    push(`${name} = SensorReading("S-00${k}", ${temp.toFixed(1)})`, `SensorReading.__init__(${name}, "S-00${k}", ${temp.toFixed(1)})`, `<SensorReading object at 0x7f3a${(k * 4096 + 0x1c0).toString(16)}>`, (n) => {
      n.objs.push({ name, d: { sensor_id: `S-00${k}`, temperature: temp } });
      n.flash = name;
      return n;
    });
    setSel(name);
  };

  const methods = [
    ["is_overheated()", () => push(`${obj.name}.is_overheated(${thr.toFixed(1)})`, `SensorReading.is_overheated(${obj.name}, threshold=${thr.toFixed(1)})`, fmt(obj.d.temperature > thr))],
    ["str()", () => push(`print(${obj.name})`, `SensorReading.__str__(${obj.name})`, `Sensor ${obj.d.sensor_id}: ${fmt(obj.d.temperature)}°C`)],
    other && [`difference_from(${other.name})`, () => push(`${obj.name}.difference_from(${other.name})`, `SensorReading.difference_from(${obj.name}, other=${other.name})`, fmt(Math.abs(obj.d.temperature - other.d.temperature)))],
    ["temperature += 5", () => push(`${obj.name}.temperature += 5`, `self.temperature mutated on ${obj.name} only`, fmt(obj.d.temperature + 5), (n) => ((n.objs.find((o) => o.name === obj.name).d.temperature += 5), (n.flash = obj.name), n))],
    ["self.default_unit = 'fahrenheit'", () => push(`${obj.name}.default_unit = "fahrenheit"`, `creates INSTANCE attr on ${obj.name} (shadows class attr)`, "'fahrenheit'", (n) => ((n.objs.find((o) => o.name === obj.name).d.default_unit = "fahrenheit"), (n.flash = obj.name), n))],
    ["del self.default_unit", () => ("default_unit" in obj.d ? push(`del ${obj.name}.default_unit`, "instance attr removed; lookup falls back to class", `'${s.cls.default_unit}'`, (n) => (delete n.objs.find((o) => o.name === obj.name).d.default_unit, n)) : push(`del ${obj.name}.default_unit`, "no instance attribute to delete", "AttributeError: default_unit"))],
  ].filter(Boolean);

  const last = s.log[0];
  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <Stage className="space-y-3 p-3">
            <div className="rounded-lg border-2 border-dashed border-viz-active/60 bg-viz-active/5 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-viz-active">class SensorReading:</span>
                <Badge variant="active">blueprint · 1 copy</Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border bg-card px-2 py-1.5 font-mono text-[12px]">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">class attributes (shared)</div>
                  default_unit = <span className="text-viz-active">{fmt(s.cls.default_unit)}</span>
                </div>
                <div className="rounded-md border bg-card px-2 py-1.5 font-mono text-[12px]">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">methods (functions on the class)</div>
                  __init__ · __str__ · is_overheated · difference_from
                </div>
              </div>
            </div>
            <div className="text-center font-mono text-[11px] text-muted-foreground">▲ every instance's __class__ points up here ▲</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {s.objs.map((o) => (
                <button
                  key={o.name}
                  type="button"
                  onClick={() => setSel(o.name)}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-card p-2 text-left font-mono text-[12px] transition-all",
                    o.name === obj.name && "border-viz-purple ring-2 ring-viz-purple/30",
                    s.flash === o.name && "animate-fade-in"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-viz-purple">{o.name}</span>
                    {o.d.temperature > thr && <Badge variant="danger">hot</Badge>}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">__dict__</div>
                  {Object.entries(o.d).map(([k, v]) => (
                    <div key={k} className={k === "default_unit" ? "text-viz-warn" : ""}>
                      {k}: {fmt(v)}
                    </div>
                  ))}
                  <div className="mt-1 text-[10.5px] text-muted-foreground">
                    .default_unit → {lookup(o, "default_unit")[0]} ({fmt(lookup(o, "default_unit")[1])})
                  </div>
                </button>
              ))}
            </div>
          </Stage>
          <Narration tone={last ? "active" : "default"}>
            {last ? (
              <>
                <span className="font-mono">{last.expr}</span> → Python actually runs <span className="font-mono">{last.call}</span> = <b className="font-mono">{last.result}</b>
              </>
            ) : (
              "One class (blueprint), many instances (houses). Each instance keeps its own __dict__; methods live once on the class and receive the instance as self."
            )}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title="Build an instance">
            <SliderControl label="temperature (°C)" value={temp} onChange={setTemp} min={-40} max={150} step={0.5} format={(v) => v.toFixed(1)} />
            <Button size="sm" onClick={create} disabled={s.objs.length >= 6}>
              <Plus /> SensorReading(...)
            </Button>
          </Panel>
          <Panel title={`Call methods on ${obj.name}`}>
            <SliderControl label="threshold" value={thr} onChange={setThr} min={0} max={150} step={1} format={(v) => v.toFixed(1)} />
            <div className="flex flex-wrap gap-1.5">
              {methods.map(([label, fn]) => (
                <Button key={label} size="xs" variant="outline" className="font-mono" onClick={fn}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                className="font-mono"
                onClick={() => push(`SensorReading.default_unit = "${s.cls.default_unit === "kelvin" ? "celsius" : "kelvin"}"`, "class attribute changed — every instance without a shadow sees it", s.cls.default_unit === "kelvin" ? "'celsius'" : "'kelvin'", (n) => ((n.cls.default_unit = n.cls.default_unit === "kelvin" ? "celsius" : "kelvin"), n))}
              >
                SensorReading.default_unit = …
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setS(initClasses())}>
                <RotateCcw /> Reset
              </Button>
            </div>
          </Panel>
          <div className="overflow-hidden rounded-lg border">
            <ScrollArea className="h-40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>call</TableHead>
                    <TableHead className="text-right">result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.log.map((l, k) => (
                    <TableRow key={s.log.length - k}>
                      <TableCell className="py-1 font-mono text-[11.5px]">{l.expr}</TableCell>
                      <TableCell className="py-1 text-right font-mono text-[11.5px]">{l.result}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </Split>
    </div>
  );
}

/* ================================================================== */
/* 4. Virtual environments                                             */
/* ================================================================== */
const PROJECTS = {
  A: { dir: "~/robot_arm", req: { fastapi: [">=", "0.110"], numpy: ["<", "2"] } },
  B: { dir: "~/vision_node", req: { fastapi: ["==", "0.100"], numpy: [">=", "2"] } },
};
const PKG_OPTS = [
  ["fastapi", "0.110"],
  ["fastapi", "0.100"],
  ["numpy", "1.26.4"],
  ["numpy", "2.1.0"],
];
const cmpVer = (a, b) => {
  const x = a.split(".").map(Number),
    y = b.split(".").map(Number);
  for (let k = 0; k < Math.max(x.length, y.length); k++) if ((x[k] ?? 0) !== (y[k] ?? 0)) return (x[k] ?? 0) - (y[k] ?? 0);
  return 0;
};
const satisfies = (v, [op, want]) => v && ({ ">=": cmpVer(v, want) >= 0, "<": cmpVer(v, want) < 0, "==": cmpVer(v, want) === 0 }[op]);
const ENV_LABEL = { sys: "system /usr/lib/python3/site-packages", A: "~/robot_arm/.venv", B: "~/vision_node/.venv" };
const PY_PATH = { sys: "/usr/bin/python3", A: "~/robot_arm/.venv/bin/python", B: "~/vision_node/.venv/bin/python" };

function VenvLab() {
  const [envs, setEnvs] = useState({ sys: {}, A: {}, B: {} });
  const [active, setActive] = useState("sys");
  const [log, setLog] = useState([]);
  const install = ([pkg, ver]) => {
    const prev = envs[active][pkg];
    setEnvs((e) => ({ ...e, [active]: { ...e[active], [pkg]: ver } }));
    setLog((l) => [{ cmd: `pip install ${pkg}==${ver}`, out: prev && prev !== ver ? `Uninstalling ${pkg}-${prev} … Successfully installed ${pkg}-${ver}` : `Successfully installed ${pkg}-${ver}`, env: active, replaced: prev && prev !== ver }, ...l].slice(0, 12));
  };
  const status = (proj, env) => {
    const pkgs = envs[env];
    const bad = Object.entries(PROJECTS[proj].req).filter(([p, r]) => !satisfies(pkgs[p], r));
    return { ok: bad.length === 0, bad: bad.map(([p, [op, w]]) => `${p}${op}${w} (have ${pkgs[p] ?? "none"})`) };
  };
  const PATH = [...(active !== "sys" ? [`${PROJECTS[active].dir}/.venv/bin`] : []), "/usr/local/bin", "/usr/bin"];
  const lastReplaced = log[0]?.replaced && log[0].env === "sys";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted-foreground">Active environment</span>
        <ToggleGroup type="single" value={active} onValueChange={(v) => v && setActive(v)}>
          <ToggleGroupItem value="sys">no venv (global)</ToggleGroupItem>
          <ToggleGroupItem value="A">source robot_arm/.venv</ToggleGroupItem>
          <ToggleGroupItem value="B">source vision_node/.venv</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Split>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {["sys", "A", "B"].map((e) => (
              <div key={e} className={cn("rounded-lg border bg-card p-2.5 transition-all", e === active && "border-viz-active ring-2 ring-viz-active/30")}>
                <div className="font-mono text-[11px] text-muted-foreground">{ENV_LABEL[e]}</div>
                <div className="mt-1.5 min-h-12 space-y-1">
                  {Object.keys(envs[e]).length === 0 && <div className="text-[12px] text-muted-foreground/70">(empty)</div>}
                  {Object.entries(envs[e]).map(([p, v]) => (
                    <Badge key={p} variant="outline" className="mr-1 font-mono">
                      {p} {v}
                    </Badge>
                  ))}
                </div>
                {e === active && <Badge variant="active" className="mt-2">pip installs here</Badge>}
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>project</TableHead>
                <TableHead>requires</TableHead>
                <TableHead>run with `python`</TableHead>
                <TableHead>run with own .venv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["A", "B"].map((p) => {
                const now = status(p, active);
                const own = status(p, p);
                return (
                  <TableRow key={p}>
                    <TableCell className="py-1.5 font-mono text-[12px]">{PROJECTS[p].dir}</TableCell>
                    <TableCell className="py-1.5 font-mono text-[11.5px]">
                      {Object.entries(PROJECTS[p].req)
                        .map(([k, [op, w]]) => `${k}${op}${w}`)
                        .join(", ")}
                    </TableCell>
                    {[now, own].map((st, k) => (
                      <TableCell key={k} className="py-1.5">
                        <Tip content={st.ok ? "all requirements satisfied" : `ImportError / version conflict: ${st.bad.join("; ")}`}>
                          <span>
                            <Badge variant={st.ok ? "success" : "danger"}>{st.ok ? "runs" : "breaks"}</Badge>
                          </span>
                        </Tip>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Narration tone={lastReplaced ? "bad" : active === "sys" ? "warn" : "ok"}>
            {lastReplaced
              ? `pip just REPLACED ${log[0].cmd.split(" ")[2].split("==")[0]} in the one global site-packages — whichever project needed the old version is now broken. This is exactly why every project gets its own .venv.`
              : active === "sys"
                ? "No venv active: `python` resolves to /usr/bin/python3 and pip installs into the single global site-packages shared by every project. Try installing fastapi 0.110 then 0.100 here."
                : `Activated ${ENV_LABEL[active]}: its bin/ was prepended to $PATH, so \`python\` and \`pip\` now resolve inside the venv. Installs stay isolated to this project.`}
          </Narration>
        </div>
        <div className="space-y-3">
          <Panel title={`pip install → ${ENV_LABEL[active]}`}>
            <div className="grid grid-cols-2 gap-1.5">
              {PKG_OPTS.map((o) => (
                <Button key={o.join()} size="xs" variant="outline" className="font-mono" onClick={() => install(o)}>
                  {o[0]}=={o[1]}
                </Button>
              ))}
            </div>
            <Button size="xs" variant="ghost" onClick={() => (setEnvs({ sys: {}, A: {}, B: {} }), setLog([]))}>
              <RotateCcw /> Reset environments
            </Button>
          </Panel>
          <ResultBox title="$ which python   ($PATH searched left → right)">
            {PATH.map((p, k) => {
              const hit = k === PATH.findIndex((d) => d !== "/usr/local/bin");
              const miss = p === "/usr/local/bin" && k < PATH.indexOf("/usr/bin");
              return (
                <div key={p} className={hit ? "text-viz-ok" : "text-muted-foreground"}>
                  {hit ? "✓ " : miss && active === "sys" ? "✗ " : "· "}
                  {p}
                  {miss && active === "sys" && " (no python here)"}
                </div>
              );
            })}
            <div className="mt-1">→ {PY_PATH[active]}</div>
          </ResultBox>
          <div className="overflow-hidden rounded-lg border bg-code">
            <ScrollArea className="h-32">
              <div className="space-y-1 px-3 py-2 font-mono text-[11.5px]">
                {log.length === 0 && <div className="text-muted-foreground">(pip output appears here)</div>}
                {log.map((l, k) => (
                  <div key={log.length - k}>
                    <div>
                      <span className="text-muted-foreground">({l.env === "sys" ? "global" : l.env === "A" ? "robot_arm" : "vision_node"})</span> $ {l.cmd}
                    </div>
                    <div className={l.replaced ? "text-viz-warn" : "text-muted-foreground"}>{l.out}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Split>
    </div>
  );
}

/* ================================================================== */
/* 5. Errors: hierarchy + propagation + Result                         */
/* ================================================================== */
const PARENT = {
  Exception: null,
  AgentError: "Exception",
  LLMError: "AgentError",
  LLMRateLimitError: "LLMError",
  LLMTimeoutError: "LLMError",
  ValidationError: "AgentError",
  SensorReadingError: "ValidationError",
  ToolExecutionError: "AgentError",
  LookupError: "Exception",
  KeyError: "LookupError",
  ValueError: "Exception",
  ZeroDivisionError: "ArithmeticError",
  ArithmeticError: "Exception",
};
const mro = (t) => {
  const out = [];
  for (let x = t; x; x = PARENT[x]) out.push(x);
  return out;
};
const isinst = (t, h) => h.split(",").map((x) => x.trim()).some((hh) => mro(t).includes(hh));

// tree layout for the hierarchy SVG
const TREE = [
  ["Exception", 400, 22],
  ["AgentError", 250, 72],
  ["ValueError", 420, 72],
  ["LookupError", 520, 72],
  ["ArithmeticError", 620, 72],
  ["LLMError", 128, 122],
  ["ValidationError", 320, 122],
  ["ToolExecutionError", 455, 122],
  ["KeyError", 560, 122],
  ["LLMRateLimitError", 65, 172],
  ["LLMTimeoutError", 192, 172],
  ["SensorReadingError", 320, 172],
  ["ZeroDivisionError", 610, 172],
];
const POS = Object.fromEntries(TREE.map(([n, x, y]) => [n, [x, y]]));

function HierarchyTree({ current, handler }) {
  const chain = current ? mro(current) : [];
  const handlers = handler ? handler.split(",").map((h) => h.trim()) : [];
  return (
    <svg viewBox="0 0 680 190" className="w-full font-mono">
      {TREE.filter(([n]) => PARENT[n]).map(([n, x, y]) => {
        const [px, py] = POS[PARENT[n]];
        const on = chain.includes(n) && chain.includes(PARENT[n]);
        return <path key={n} d={`M${px},${py + 10} V${(py + y) / 2} H${x} V${y - 10}`} stroke={on ? C.warn : C.grid} strokeWidth={on ? 2.2 : 1.3} fill="none" />;
      })}
      {TREE.map(([n, x, y]) => {
        const inChain = chain.includes(n);
        const isCur = n === current;
        const isH = handlers.includes(n);
        const col = isCur ? C.bad : isH && inChain ? C.ok : isH ? C.active : inChain ? C.warn : C.muted;
        const w = n.length * 6.4 + 14;
        return (
          <g key={n}>
            <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={5} fill={C.card} stroke={col} strokeWidth={isCur || isH ? 2 : 1} strokeDasharray={isH && !inChain ? "4 3" : undefined} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fill={col} fontWeight={isCur || inChain ? 700 : 400}>
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const FRAMES = [
  { fn: "main()", code: "run_pipeline()" },
  { fn: "process_reading(raw)", code: "reading = parse_sensor_data(raw)" },
  { fn: "parse_sensor_data(raw)", code: 'temperature = float(raw["temperature"])', translate: true },
  { fn: "read_sensor(port)", code: 'with serial_port("/dev/ttyUSB0") as port:', ctx: true },
];
const HANDLER_OPTS = ["(no try/except)", "AgentError", "LLMError", "ValidationError", "SensorReadingError", "Exception"];
const RAISABLE = ["KeyError", "ValueError", "SensorReadingError", "LLMTimeoutError", "LLMRateLimitError", "ToolExecutionError", "ZeroDivisionError"];
const TRANSLATE = "KeyError, ValueError, TypeError";

/** Pure: simulate raise at layer L and unwinding toward main(). */
function propagate({ exc, layer, handlers, translate, suppress }) {
  const steps = [];
  let cur = exc;
  const base = { popped: [], caughtAt: null, ctxClosed: false };
  let st = { ...base, at: layer, cur };
  const push = (o) => steps.push((st = { ...st, ...o, popped: o.popped ?? [...st.popped] }));
  push({ note: `raise ${exc}(…) inside ${FRAMES[layer].fn}. Python starts unwinding the call stack looking for a matching except.`, tone: "bad", check: null });
  for (let f = layer; f >= 0; f--) {
    const fr = FRAMES[f];
    if (fr.ctx && f === layer) {
      push({ at: f, ctxClosed: true, check: null, note: `Leaving the with-block: serial_port.__exit__(${cur}, …) runs first — the port is closed even though we are crashing (RAII-style cleanup).`, tone: "warn" });
      if (suppress) {
        push({ at: f, caughtAt: f, cur: null, check: null, note: "__exit__ returned True, so the exception is SUPPRESSED. read_sensor() continues as if nothing happened — usually a bad idea!", tone: "warn", done: true });
        return steps;
      }
    }
    const h = fr.translate ? (translate ? TRANSLATE : null) : handlers[f];
    if (h) {
      const hit = isinst(cur, h);
      push({ at: f, check: h, note: `${fr.fn}: except (${h}) → isinstance(err, ${h.includes(",") ? `(${h})` : h})? MRO of ${cur} = ${mro(cur).join(" → ")} → ${hit ? "MATCH" : "no match"}.`, tone: hit ? "ok" : "default" });
      if (hit && fr.translate) {
        const was = cur;
        cur = "SensorReadingError";
        push({ at: f, cur, check: null, note: `Caught ${was}, then translated: raise SensorReadingError(…) from e. The original is kept as __cause__; the new domain error keeps propagating upward.`, tone: "warn" });
      } else if (hit) {
        push({ at: f, caughtAt: f, check: h, note: `Caught in ${fr.fn}. Frames below it were unwound; execution resumes in this except block.`, tone: "ok", done: true });
        return steps;
      }
    }
    if (f > 0) push({ at: f - 1, check: null, popped: [...st.popped, f], note: `${fr.fn} has no matching handler → its frame is popped; the ${cur} propagates to ${FRAMES[f - 1].fn}.`, tone: "default" });
  }
  push({ at: -1, check: null, popped: [0, 1, 2, 3], note: `Uncaught ${cur}: Traceback (most recent call last) … the interpreter prints it and exits with status 1.`, tone: "bad", done: true });
  return steps;
}

function PropagationTab() {
  const [exc, setExc] = useState("ValueError");
  const [layer, setLayer] = useState("3");
  const [handlers, setHandlers] = useState({ 0: "AgentError", 1: "LLMError" });
  const [translate, setTranslate] = useState(true);
  const [suppress, setSuppress] = useState(false);
  const steps = useMemo(() => propagate({ exc, layer: +layer, handlers, translate, suppress }), [exc, layer, handlers, translate, suppress]);
  const stp = useStepper(steps, { baseMs: 1300 });
  const s = stp.step;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted-foreground">raise</span>
        <Pick value={exc} onChange={setExc} options={RAISABLE.map((r) => [r, r])} className="w-48" />
        <span className="text-[12.5px] text-muted-foreground">in</span>
        <ToggleGroup type="single" value={layer} onValueChange={(v) => v && setLayer(v)}>
          {FRAMES.slice(1).map((f, k) => (
            <ToggleGroupItem key={f.fn} value={String(k + 1)} className="font-mono text-[12px]">
              {f.fn.split("(")[0]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <HierarchyTree current={s.cur} handler={s.check} />
          </Stage>
          <Legend
            items={[
              [C.bad, "exception in flight"],
              [C.warn, "its MRO (isinstance chain)"],
              [C.ok, "handler that matches"],
              [C.active, "handler being tested (no match)"],
            ]}
          />
          <Narration tone={s.tone}>{s.note}</Narration>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Call stack (most recent call last)</div>
          {FRAMES.map((fr, f) => {
            const popped = s.popped.includes(f);
            const here = s.at === f;
            const caught = s.caughtAt === f;
            return (
              <div key={fr.fn} className={cn("rounded-lg border bg-card px-2.5 py-2 transition-all", popped && "opacity-35", here && !caught && "border-viz-bad ring-2 ring-viz-bad/25", caught && "border-viz-ok ring-2 ring-viz-ok/30")} style={{ marginLeft: f * 10 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12.5px] font-semibold">{fr.fn}</span>
                  {here && s.cur && !caught && <Badge variant="danger">{s.cur}</Badge>}
                  {caught && <Badge variant="success">caught</Badge>}
                  {popped && <Badge variant="outline">popped</Badge>}
                </div>
                <div className="font-mono text-[11.5px] text-muted-foreground">{fr.code}</div>
                {fr.translate ? (
                  <div className="mt-1">
                    <SwitchControl label={`except (${TRANSLATE}) → raise SensorReadingError from e`} checked={translate} onChange={setTranslate} />
                  </div>
                ) : fr.ctx ? (
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11.5px]">
                    <span className={s.ctxClosed ? "text-viz-ok" : "text-muted-foreground"}>__exit__: port.close() {s.ctxClosed ? "✓ ran" : ""}</span>
                    <div className="w-44">
                      <SwitchControl label="__exit__ returns True" checked={suppress} onChange={setSuppress} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 text-[11.5px]">
                    <span className="font-mono text-muted-foreground">except</span>
                    <Pick value={handlers[f] ?? "(no try/except)"} onChange={(v) => setHandlers((h) => ({ ...h, [f]: v === "(no try/except)" ? null : v }))} options={HANDLER_OPTS.map((o) => [o, o])} className="h-7 w-44" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Split>
      <PlaybackBar stepper={stp} />
    </div>
  );
}

const RESULT_CODE = `def validate_temperature(temp: float) -> Result[float, str]:
    if temp < -50 or temp > 200:
        return Err(f"Temperature {temp} out of valid range [-50, 200]")
    return Ok(temp)

match validate_temperature(temp):
    case Ok(value=t):
        print(f"Valid temperature: {t}")
    case Err(error=msg):
        print(f"Validation failed: {msg}")`;

function ResultTab() {
  const [temp, setTemp] = useState(42.5);
  const bad = temp < -50 || temp > 200;
  const r = bad ? `Err(error='Temperature ${fmt(temp)} out of valid range [-50, 200]')` : `Ok(value=${fmt(temp)})`;
  return (
    <Split>
      <div className="space-y-3">
        <CodePanel code={RESULT_CODE} lang="python" active={bad ? [3, 9, 10] : [4, 7, 8]} />
      </div>
      <div className="space-y-3">
        <Panel title="Input">
          <SliderControl label="temp" value={temp} onChange={setTemp} min={-100} max={260} step={0.5} format={(v) => v.toFixed(1)} />
        </Panel>
        <ResultBox title="return value (no exception thrown)" tone={bad ? "bad" : "ok"}>
          {r}
        </ResultBox>
        <ResultBox title="stdout">{bad ? `Validation failed: Temperature ${fmt(temp)} out of valid range [-50, 200]` : `Valid temperature: ${fmt(temp)}`}</ResultBox>
        <Narration tone={bad ? "warn" : "ok"}>The failure is a plain value, visible in the signature Result[float, str]. The match forces the caller to handle both Ok and Err — nothing can silently unwind past it.</Narration>
      </div>
    </Split>
  );
}

function ErrorsLab() {
  return (
    <Tabs defaultValue="prop">
      <TabsList>
        <TabsTrigger value="prop">raise → propagate → except</TabsTrigger>
        <TabsTrigger value="result">Result pattern (errors as values)</TabsTrigger>
      </TabsList>
      <TabsContent value="prop">
        <PropagationTab />
      </TabsContent>
      <TabsContent value="result">
        <ResultTab />
      </TabsContent>
    </Tabs>
  );
}

/* ================================================================== */
/* 6. Strict log parser (project)                                      */
/* ================================================================== */
const LOG_PRESET = `{"timestamp": "2024-05-01T08:00:00", "sensor_id": "TEMP-001", "temperature": 22.5, "pressure": 101.3, "status": "ok"}
{"timestamp": "2024-05-01T08:00:01", "sensor_id": "TEMP-002", "temperature": 85.1, "pressure": 240.0, "status": "warning"}
{"timestamp": "2024-05-01T08:00:02", "sensor_id": "PRES-007", "temperature": 31, "pressure": 488.9, "status": "critical"}
{"timestamp": "2024-05-01T08:00:03", "sensor_id": "TEMP-001", temperature: 22.9, "pressure": 101.1, "status": "ok"}
{"timestamp": "2024-05-01T08:00:04", "sensor_id": "TEMP-003", "temperature": 999.0, "pressure": 99.0, "status": "ok"}
{"timestamp": "2024-05-01T08:00:05", "sensor_id": "TEMP-004", "temperature": "23.4", "pressure": 100.2, "status": "ok"}
{"timestamp": "2024-05-01T08:00:06", "sensor_id": "PRES-002", "temperature": 40.0, "pressure": 512.5, "status": "critical"}
{"timestamp": "2024-05-01T08:00:07", "sensor_id": "TEMP-005", "temperature": 19.8, "pressure": 101.7, "status": "unknown"}
{"timestamp": "2024-05-01T08:00:08", "sensor_id": "PRES-003", "temperature": 55.2, "pressure": 470.0, "status": "critical"}`;
const STAGES = ["read line", "json.loads", "schema + types", "range check", "SensorLogEntry"];

function LogParserLab() {
  const [text, setText] = useState(LOG_PRESET);
  const [strict, setStrict] = useState(true);
  const results = useMemo(() => text.split("\n").map((l, k) => processLine(l, k + 1, strict)), [text, strict]);
  const steps = useMemo(() => [{ k: -1 }, ...results.map((_, k) => ({ k }))], [results]);
  const st = useStepper(steps, { baseMs: 900 });
  const k = st.step.k;
  const done = results.slice(0, k + 1).filter((r) => !r.skip);
  const cur = k >= 0 ? results[k] : null;
  const valid = done.filter((r) => r.ok);
  const critical = valid.filter((r) => r.rec.status.v === "critical");

  const W = 600;
  const colX = (s) => 20 + s * ((W - 40) / 4);
  return (
    <div className="space-y-4">
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <svg viewBox={`0 0 ${W} 150`} className="w-full font-mono">
              {STAGES.map((name, s) => {
                const passed = done.filter((r) => r.ok || r.stage > s + 1).length;
                const hereCur = cur && !cur.skip && cur.stage - 1 === s;
                const failHere = hereCur && !cur.ok;
                return (
                  <g key={name}>
                    {s > 0 && <line x1={colX(s - 1) + 50} x2={colX(s) - 50} y1={60} y2={60} stroke={C.grid} strokeWidth={3} />}
                    <rect x={colX(s) - 50} y={36} width={100} height={48} rx={8} fill={C.card} stroke={failHere ? C.bad : hereCur ? C.ok : C.border} strokeWidth={hereCur ? 2.2 : 1.2} />
                    <text x={colX(s)} y={56} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={C.fg}>
                      {name}
                    </text>
                    <text x={colX(s)} y={73} textAnchor="middle" fontSize={10.5} fill={s === 4 ? C.ok : C.muted}>
                      {passed} passed
                    </text>
                    {s > 0 && s < 4 && (
                      <text x={colX(s)} y={104} textAnchor="middle" fontSize={10.5} fill={C.bad}>
                        {done.filter((r) => !r.ok && r.stage - 1 === s).length} rejected
                      </text>
                    )}
                  </g>
                );
              })}
              {cur && !cur.skip && (
                <g className="transition-all duration-300" style={{ transform: `translate(${colX(cur.stage - 1)}px, 22px)` }}>
                  <circle r={9} fill={cur.ok ? C.ok : C.bad} />
                  <text y={3.5} textAnchor="middle" fontSize={9.5} fill={C.card} fontWeight={700}>
                    {cur.lineNo}
                  </text>
                </g>
              )}
              <text x={W / 2} y={138} textAnchor="middle" fontSize={11} fill={C.muted}>
                {`line ${Math.max(k + 1, 0)} / ${results.length}`}
              </text>
            </svg>
          </Stage>
          <Narration tone={!cur ? "default" : cur.ok ? (cur.coerced.length ? "warn" : "ok") : "bad"}>
            {!cur
              ? "python main.py factory.jsonl — each line flows through the pipeline. Malformed JSON is skipped with its line number; failed validation reports the exact field."
              : cur.skip
                ? `Line ${cur.lineNo}: blank — skipped.`
                : cur.ok
                  ? `Line ${cur.lineNo}: valid SensorLogEntry (${cur.rec.sensor_id.v}, status=${cur.rec.status.v})${cur.coerced.length ? ` — coerced ${cur.coerced.join(", ")} (lax mode)` : ""}.`
                  : `Line ${cur.lineNo} rejected at "${STAGES[cur.stage - 1]}": ${cur.reason}`}
          </Narration>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <StatGrid cols={4}>
            <Stat label="total" value={done.length} />
            <Stat label="valid" value={valid.length} tone="ok" />
            <Stat label="invalid" value={done.length - valid.length} tone="bad" />
            <Stat label="critical" value={critical.length} tone="warn" />
          </StatGrid>
          <SwitchControl label="Strict types (reject &quot;23.4&quot; for float)" checked={strict} onChange={setStrict} />
          <div className="overflow-hidden rounded-lg border">
            <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>sensor</TableHead>
                    <TableHead>result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {done.map((r) => (
                    <TableRow key={r.lineNo} className={cn(!r.ok && "bg-viz-bad/6", r.lineNo === cur?.lineNo && "bg-viz-active/10")}>
                      <TableCell className="py-1 font-mono text-[11.5px]">{r.lineNo}</TableCell>
                      <TableCell className="py-1 font-mono text-[11.5px]">{r.ok ? r.rec.sensor_id.v : "—"}</TableCell>
                      <TableCell className="py-1 text-[11.5px]">
                        {r.ok ? (
                          <Badge variant={r.rec.status.v === "critical" ? "warning" : "success"}>{r.rec.status.v}</Badge>
                        ) : (
                          <span className="font-mono text-viz-bad">{r.reason.length > 60 ? r.reason.slice(0, 58) + "…" : r.reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </Split>
      <Panel title="factory.jsonl (edit me — one JSON object per line)">
        <textarea className={areaCls} rows={6} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="log lines" />
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="outline" onClick={() => setText(LOG_PRESET)}>
            Load preset
          </Button>
          <span className="font-mono text-[11px] text-muted-foreground">
            schema: {LOG_SCHEMA.map((f) => `${f.name}: ${f.type === "lit" ? "Literal[ok|warning|critical]" : f.type}`).join(", ")}
          </span>
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================== */
const META = {
  types: { title: "Type-Checker Boundary Inspector", desc: "Type hints are labels for tools, not runtime guards. Edit a call and compare what mypy reports statically with what CPython actually does.", badges: ["Optional / Union", "Generic[T]", "Literal"], C: TypesLab },
  json: { title: "JSON → dict → Typed Dataclass", desc: "Untrusted JSON crosses three boundaries: json.loads, a typed dataclass, and json.dumps on the way back out. Watch coercions and rejections.", badges: ["json.loads / dumps", "JSONDecodeError", "validation"], C: JsonLab },
  classes: { title: "Class Blueprint vs Instances", desc: "One blueprint, many objects. Mutate per-instance state, call methods (self is passed for you) and see how a class attribute is shadowed.", badges: ["__init__ / self", "instance vs class attrs"], C: ClassesLab },
  venv: { title: "Virtual Environment Resolver", desc: "Install packages into the global interpreter or per-project .venv folders and see which project breaks, and which python $PATH resolves.", badges: ["venv / uv", "$PATH", "version conflicts"], C: VenvLab },
  errors: { title: "Exception Hierarchy & Propagation", desc: "Raise a domain error at any layer and step through the unwinding: __exit__ cleanup, isinstance checks against the MRO, translation with raise … from e.", badges: ["custom hierarchy", "context managers", "Result[T, E]"], C: ErrorsLab },
  "log-parser": { title: "Strict Python CLI — Log Parser Pipeline", desc: "Each JSON-lines record flows through json.loads → schema/types → range checks → SensorLogEntry. Bad lines are rejected with the exact reason.", badges: ["JSON-lines", "Literal status", "summary report"], C: LogParserLab },
};

export default function PythonFoundationsLab({ variant = "types" }) {
  const m = META[variant] ?? META.types;
  const Body = m.C;
  return (
    <LabShell title={m.title} description={m.desc} badges={m.badges}>
      <Body />
    </LabShell>
  );
}
