import { useMemo, useState } from "react";
import { RotateCcw, Send, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, SwitchControl, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Variant: validation (Pydantic playground)                           */
/* ------------------------------------------------------------------ */

const MODEL_CODE = (strict, before, forbid) => `from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class SensorReading(BaseModel):
    model_config = ConfigDict(strict=${strict ? "True" : "False"}${forbid ? ', extra="forbid"' : ""})

    sensor_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z]+-\\d+$")
    temperature: float = Field(ge=-40.0, le=150.0)
    pressure: float = Field(gt=0.0, le=500.0)
    humidity: float = Field(ge=0.0, le=100.0)
    timestamp: str = Field(pattern=r"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")
${before ? `
    @field_validator("pressure", mode="before")
    @classmethod
    def strip_units(cls, v):
        if isinstance(v, str):               # LLMs love "14.7 psi"
            return float(v.lower().replace("psi", "").strip())
        return v
` : ""}
    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if v < -273.15:
            raise ValueError(f"Temperature {v}C is below absolute zero")
        return v

    @model_validator(mode="after")
    def validate_thermal_pressure(self):
        if self.temperature > 100.0 and self.pressure <= 20.0:
            raise ValueError(
                f"Temperature {self.temperature}C with pressure {self.pressure}PSI "
                f"is inconsistent — high temp requires pressurized system")
        return self`;

const PAYLOADS = {
  valid: { label: "Valid reading", json: { sensor_id: "TEMP-01", temperature: 72.5, pressure: 14.7, humidity: 45.0, timestamp: "2026-03-15T14:30:00Z" } },
  strings: { label: "Numbers as strings (coercion)", json: { sensor_id: "TEMP-02", temperature: "72.5", pressure: "14.7", humidity: 45, timestamp: "2026-03-15T14:30:00Z" } },
  units: { label: 'pressure = "14.7 psi"', json: { sensor_id: "PRES-07", temperature: 30, pressure: "14.7 psi", humidity: 50, timestamp: "2026-03-15T14:30:00Z" } },
  hot: { label: "temperature 180 (out of range)", json: { sensor_id: "TEMP-03", temperature: 180, pressure: 30, humidity: 40, timestamp: "2026-03-15T14:31:00Z" } },
  badId: { label: 'sensor_id "temp_01" (pattern)', json: { sensor_id: "temp_01", temperature: 25, pressure: 14.7, humidity: 45, timestamp: "2026-03-15T14:30:00Z" } },
  cross: { label: "120°C at 10 PSI (model_validator)", json: { sensor_id: "BOIL-02", temperature: 120, pressure: 10, humidity: 20, timestamp: "2026-03-15T14:32:00Z" } },
  missing: { label: "missing humidity + bad timestamp", json: { sensor_id: "HUM-09", temperature: 22, pressure: 14.7, timestamp: "15/03/2026 14:30" } },
  multi: { label: "LLM hallucination (many errors)", json: { sensor_id: "", temperature: "warm", pressure: -3, humidity: 140, timestamp: "now", confidence: 0.97 } },
};

const FIELDS = [
  { name: "sensor_id", type: "str", min_length: 1, max_length: 20, pattern: "^[A-Z]+-\\d+$" },
  { name: "temperature", type: "float", ge: -40, le: 150 },
  { name: "pressure", type: "float", gt: 0, le: 500 },
  { name: "humidity", type: "float", ge: 0, le: 100 },
  { name: "timestamp", type: "str", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" },
];

const pyRepr = (v) =>
  typeof v === "string" ? `'${v}'` : v === null ? "None" : typeof v === "boolean" ? (v ? "True" : "False") : Array.isArray(v) ? `[${v.map(pyRepr).join(", ")}]` : typeof v === "object" ? `{${Object.entries(v).map(([k, x]) => `'${k}': ${pyRepr(x)}`).join(", ")}}` : String(v);
const pyType = (v) => (typeof v === "string" ? "str" : v === null ? "NoneType" : typeof v === "boolean" ? "bool" : typeof v === "number" ? (Number.isInteger(v) ? "int" : "float") : Array.isArray(v) ? "list" : "dict");
const floatRepr = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));

/** Pure: validate a payload like Pydantic v2. Returns {errors, value, trace}. */
export function validateSensor(data, { strict, before, forbid }) {
  const errors = [];
  const trace = [];
  const out = {};
  for (const f of FIELDS) {
    const tr = { field: f.name, raw: data[f.name], stages: [] };
    trace.push(tr);
    if (!(f.name in data)) {
      errors.push({ type: "missing", loc: [f.name], msg: "Field required", input: data });
      tr.stages.push(["required", "fail"]);
      continue;
    }
    let v = data[f.name];
    if (f.name === "pressure" && before) {
      if (typeof v === "string") {
        const n = Number(v.toLowerCase().replace("psi", "").trim());
        if (Number.isNaN(n) || v.trim() === "") {
          errors.push({ type: "value_error", loc: [f.name], msg: `Value error, could not convert string to float: '${v}'`, input: v });
          tr.stages.push(["mode='before'", "fail"]);
          continue;
        }
        tr.stages.push(["mode='before'", `"${v}" → ${n}`]);
        v = n;
      } else tr.stages.push(["mode='before'", "pass-through"]);
    }
    // core type validation
    if (f.type === "str") {
      if (typeof v !== "string") {
        errors.push({ type: "string_type", loc: [f.name], msg: "Input should be a valid string", input: v });
        tr.stages.push(["type str", "fail"]);
        continue;
      }
      tr.stages.push(["type str", "ok"]);
      if (f.min_length && v.length < f.min_length) {
        errors.push({ type: "string_too_short", loc: [f.name], msg: `String should have at least ${f.min_length} character`, input: v, ctx: { min_length: f.min_length } });
        tr.stages.push(["min_length", "fail"]);
        continue;
      }
      if (f.max_length && v.length > f.max_length) {
        errors.push({ type: "string_too_long", loc: [f.name], msg: `String should have at most ${f.max_length} characters`, input: v, ctx: { max_length: f.max_length } });
        tr.stages.push(["max_length", "fail"]);
        continue;
      }
      if (f.pattern && !new RegExp(f.pattern).test(v)) {
        errors.push({ type: "string_pattern_mismatch", loc: [f.name], msg: `String should match pattern '${f.pattern}'`, input: v, ctx: { pattern: f.pattern } });
        tr.stages.push(["pattern", "fail"]);
        continue;
      }
      tr.stages.push(["constraints", "ok"]);
      out[f.name] = v;
    } else {
      let num;
      if (typeof v === "number" && Number.isFinite(v)) num = v;
      else if (typeof v === "boolean" && !strict) num = Number(v);
      else if (typeof v === "string" && !strict) {
        const t = v.trim();
        if (t !== "" && Number.isFinite(Number(t))) num = Number(t);
        else {
          errors.push({ type: "float_parsing", loc: [f.name], msg: "Input should be a valid number, unable to parse string as a number", input: v });
          tr.stages.push(["type float", "fail"]);
          continue;
        }
      } else {
        errors.push({ type: "float_type", loc: [f.name], msg: "Input should be a valid number", input: v });
        tr.stages.push([strict ? "strict float" : "type float", "fail"]);
        continue;
      }
      tr.stages.push(["type float", typeof v === "number" ? (Number.isInteger(v) ? `int → ${floatRepr(v)}` : "ok") : `${pyType(v)} ${pyRepr(v)} → ${floatRepr(num)}`]);
      const chk = [
        ["gt", (x) => x > f.gt, "greater_than", `Input should be greater than ${f.gt}`],
        ["ge", (x) => x >= f.ge, "greater_than_equal", `Input should be greater than or equal to ${f.ge}`],
        ["le", (x) => x <= f.le, "less_than_equal", `Input should be less than or equal to ${f.le}`],
      ].find(([k, ok]) => f[k] !== undefined && !ok(num));
      if (chk) {
        errors.push({ type: chk[2], loc: [f.name], msg: chk[3], input: v, ctx: { [chk[0]]: f[chk[0]] } });
        tr.stages.push([`${chk[0]}=${f[chk[0]]}`, "fail"]);
        continue;
      }
      tr.stages.push(["constraints", "ok"]);
      if (f.name === "temperature") tr.stages.push(["@field_validator", num < -273.15 ? "fail" : "ok"]);
      out[f.name] = num;
    }
  }
  const extra = Object.keys(data).filter((k) => !FIELDS.some((f) => f.name === k));
  for (const k of extra) {
    if (forbid) errors.push({ type: "extra_forbidden", loc: [k], msg: "Extra inputs are not permitted", input: data[k] });
    trace.push({ field: k, raw: data[k], stages: [["extra", forbid ? "fail" : "ignored"]] });
  }
  let modelStage = "skipped (field errors)";
  if (!errors.length) {
    if (out.temperature > 100 && out.pressure <= 20) {
      errors.push({ type: "value_error", loc: [], msg: `Value error, Temperature ${floatRepr(out.temperature)}C with pressure ${floatRepr(out.pressure)}PSI is inconsistent — high temp requires pressurized system`, input: data });
      modelStage = "fail";
    } else modelStage = "ok";
  }
  return { errors, value: errors.length ? null : out, trace, modelStage };
}

function errorString(errors) {
  return (
    `${errors.length} validation error${errors.length > 1 ? "s" : ""} for SensorReading\n` +
    errors.map((e) => `${e.loc.length ? e.loc.join(".") : ""}\n  ${e.msg} [type=${e.type}, input_value=${e.loc.length ? pyRepr(e.input) : "{...}"}, input_type=${pyType(e.input)}]`).join("\n")
  );
}

const stageTone = (s) => (s === "fail" ? "danger" : s === "ok" || s.includes("→") ? "success" : s === "ignored" || s.startsWith("pass") ? "outline" : "success");

function ValidationVariant() {
  const [preset, setPreset] = useState("multi");
  const [text, setText] = useState(JSON.stringify(PAYLOADS.multi.json, null, 2));
  const [strict, setStrict] = useState(false);
  const [before, setBefore] = useState(true);
  const [forbid, setForbid] = useState(false);
  const parsed = useMemo(() => {
    try {
      const v = JSON.parse(text);
      return v && typeof v === "object" && !Array.isArray(v) ? { v } : { err: "Input should be a valid dictionary or instance of SensorReading [type=model_type]" };
    } catch (e) {
      return { err: `Invalid JSON: ${String(e.message).split("\n")[0]} [type=json_invalid]` };
    }
  }, [text]);
  const res = useMemo(() => (parsed.v ? validateSensor(parsed.v, { strict, before, forbid }) : null), [parsed, strict, before, forbid]);
  const load = (k) => {
    setPreset(k);
    setText(JSON.stringify(PAYLOADS[k].json, null, 2));
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={load}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYLOADS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {res && <Badge variant={res.errors.length ? "danger" : "success"}>{res.errors.length ? `${res.errors.length} error${res.errors.length > 1 ? "s" : ""}` : "valid ✓"}</Badge>}
      </div>
      <Split>
        <div className="space-y-3">
          <Panel title="SensorReading.model_validate_json(payload)">
            <textarea
              className="block h-48 w-full resize-y rounded-md border border-input bg-card p-2 font-mono text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              aria-label="JSON payload"
            />
          </Panel>
          {res && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>field</TableHead>
                    <TableHead>input</TableHead>
                    <TableHead>validation pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {res.trace.map((t) => (
                    <TableRow key={t.field}>
                      <TableCell className="py-1 font-mono text-[12px]">{t.field}</TableCell>
                      <TableCell className="max-w-32 truncate py-1 font-mono text-[11.5px] text-muted-foreground">{t.raw === undefined ? "—" : pyRepr(t.raw)}</TableCell>
                      <TableCell className="py-1">
                        <div className="flex flex-wrap gap-1">
                          {t.stages.map(([s, r], k) => (
                            <Badge key={k} variant={stageTone(r)} className="text-[10px]">
                              {s}
                              {r !== "ok" && r !== "fail" ? `: ${r}` : r === "fail" ? " ✕" : " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="py-1 font-mono text-[12px]">@model_validator</TableCell>
                    <TableCell className="py-1 text-[11.5px] text-muted-foreground">(after)</TableCell>
                    <TableCell className="py-1">
                      <Badge variant={res.modelStage === "ok" ? "success" : res.modelStage === "fail" ? "danger" : "outline"} className="text-[10px]">
                        {res.modelStage}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Panel title="Model config">
            <SwitchControl label="strict=True" hint='No "72.5" → 72.5 coercion (int → float still allowed)' checked={strict} onChange={setStrict} />
            <SwitchControl label='@field_validator("pressure", mode="before")' hint='Strip "psi" before type coercion' checked={before} onChange={setBefore} />
            <SwitchControl label='extra="forbid"' hint="Reject unknown keys like confidence" checked={forbid} onChange={setForbid} />
          </Panel>
          <Narration tone={parsed.err || res?.errors.length ? "bad" : "ok"}>
            {parsed.err ? (
              <span className="font-mono text-[12.5px]">{parsed.err}</span>
            ) : res.errors.length ? (
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-snug">{errorString(res.errors)}</pre>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-snug">{`SensorReading(${Object.entries(res.value).map(([k, v]) => `${k}=${typeof v === "number" ? floatRepr(v) : `'${v}'`}`).join(", ")})`}</pre>
            )}
          </Narration>
        </div>
      </Split>
      <CodePanel code={MODEL_CODE(strict, before, forbid)} lang="python" maxHeight={260} title="schema" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: interceptor (Physics → Safety → Execution)                 */
/* ------------------------------------------------------------------ */

const LIMITS = {
  industrial_oven: { min_temp_c: 100, max_temp_c: 550, max_ramp_c_per_min: 10 },
  server_rack: { min_temp_c: 10, max_temp_c: 45, max_ramp_c_per_min: 2 },
  cryogenic_chamber: { min_temp_c: -196, max_temp_c: -150, max_ramp_c_per_min: 1 },
};
const MAX_RPM = 3600;
const RATED_TORQUE = 120;
const MAX_POWER_KW = 25;

const CMD_PRESETS = {
  normal: { label: "Normal: oven 300°C, 1200 rpm", current: 250, cmd: { equipment_type: "industrial_oven", target_temperature: 300, speed_rpm: 1200, torque_nm: 40 } },
  overspeed: { label: "Overspeed: 5000 rpm", current: 250, cmd: { equipment_type: "industrial_oven", target_temperature: 320, speed_rpm: 5000, torque_nm: 30 } },
  ovenHot: { label: "Oven 700°C (clamp to 550)", current: 520, cmd: { equipment_type: "industrial_oven", target_temperature: 700, speed_rpm: 1000, torque_nm: 30 } },
  ovenCold: { label: "Oven 50°C (below min)", current: 250, cmd: { equipment_type: "industrial_oven", target_temperature: 50, speed_rpm: 800, torque_nm: 20 } },
  rack: { label: "Server rack 80°C", current: 30, cmd: { equipment_type: "server_rack", target_temperature: 80, speed_rpm: 1800, torque_nm: 10 } },
  power: { label: "Power overload 110 Nm @ 2800 rpm", current: 300, cmd: { equipment_type: "industrial_oven", target_temperature: 400, speed_rpm: 2800, torque_nm: 110 } },
  cryo: { label: "Cryo chamber -100°C", current: -160, cmd: { equipment_type: "cryogenic_chamber", target_temperature: -100, speed_rpm: 600, torque_nm: 15 } },
  unknown: { label: "Hallucinated equipment 'plasma_core'", current: 25, cmd: { equipment_type: "plasma_core", target_temperature: 900, speed_rpm: 1500, torque_nm: 50 } },
};

const kw = (c) => (c.torque_nm * c.speed_rpm * 2 * Math.PI) / 60 / 1000;

/** Pure: run a command through the 3 layers. */
export function interceptCommand(cmd, { guardrails, currentTemp }) {
  const layers = [];
  let c = { ...cmd };
  if (!guardrails) {
    layers.push({ layer: "Physics", decision: "BYPASSED", reasons: ["guardrails OFF"] });
    layers.push({ layer: "Safety", decision: "BYPASSED", reasons: ["guardrails OFF"] });
    const dangers = [];
    if (cmd.speed_rpm > MAX_RPM) dangers.push("bearing failure at overspeed");
    if (LIMITS[cmd.equipment_type] && cmd.target_temperature > LIMITS[cmd.equipment_type].max_temp_c) dangers.push("thermal damage");
    if (!LIMITS[cmd.equipment_type]) dangers.push("actuated unknown hardware");
    if (kw(cmd) > MAX_POWER_KW) dangers.push("drive overcurrent trip");
    layers.push({ layer: "Execution", decision: dangers.length ? "INCIDENT" : "EXECUTED", reasons: dangers.length ? dangers : ["executed raw AI command"] });
    return { layers, final: dangers.length ? "INCIDENT" : "ACCEPT", out: c };
  }
  // Layer 1: physics — may CLAMP (override) or BLOCK
  const lim = LIMITS[c.equipment_type];
  const phys = [];
  let physDecision = "ACCEPT";
  if (!lim) {
    layers.push({ layer: "Physics", decision: "BLOCK", reasons: [`Unknown equipment type: ${c.equipment_type}`] });
    return { layers, final: "BLOCK", out: null };
  }
  if (c.speed_rpm < 0) {
    layers.push({ layer: "Physics", decision: "BLOCK", reasons: ["negative speed is not a valid setpoint"] });
    return { layers, final: "BLOCK", out: null };
  }
  if (c.target_temperature < lim.min_temp_c) {
    layers.push({ layer: "Physics", decision: "BLOCK", reasons: [`Temperature ${c.target_temperature}C below minimum ${lim.min_temp_c}C`] });
    return { layers, final: "BLOCK", out: null };
  }
  if (c.target_temperature > lim.max_temp_c) {
    phys.push(`Temperature ${c.target_temperature}C exceeds max ${lim.max_temp_c}C, clamped`);
    c.target_temperature = lim.max_temp_c;
    physDecision = "CLAMP";
  }
  if (c.speed_rpm > MAX_RPM) {
    phys.push(`speed ${c.speed_rpm} rpm > motor max ${MAX_RPM}, clamped`);
    c.speed_rpm = MAX_RPM;
    physDecision = "CLAMP";
  }
  if (c.torque_nm > RATED_TORQUE) {
    phys.push(`torque ${c.torque_nm} Nm > rated ${RATED_TORQUE}, clamped`);
    c.torque_nm = RATED_TORQUE;
    physDecision = "CLAMP";
  }
  layers.push({ layer: "Physics", decision: physDecision, reasons: phys.length ? phys : ["within physical limits"] });
  // Layer 2: safety — may only BLOCK
  const ramp = Math.abs(c.target_temperature - currentTemp) / 30; // °C per minute over a 30-min ramp
  const p = kw(c);
  const safety = [];
  if (p > MAX_POWER_KW) safety.push(`mechanical power ${p.toFixed(1)} kW > ${MAX_POWER_KW} kW drive rating`);
  if (ramp > lim.max_ramp_c_per_min) safety.push(`ramp ${ramp.toFixed(1)}°C/min > ${lim.max_ramp_c_per_min}°C/min (from ${currentTemp}°C over 30 min)`);
  if (c.speed_rpm > 3000 && c.target_temperature > 0.9 * lim.max_temp_c) safety.push("high speed near thermal limit → thermal runaway risk");
  if (safety.length) {
    layers.push({ layer: "Safety", decision: "BLOCK", reasons: safety });
    return { layers, final: "BLOCK", out: null };
  }
  layers.push({ layer: "Safety", decision: "ACCEPT", reasons: [`${p.toFixed(1)} kW, ramp ${ramp.toFixed(1)}°C/min OK`] });
  layers.push({ layer: "Execution", decision: "EXECUTED", reasons: [physDecision === "CLAMP" ? "executed the CLAMPED command" : "executed AI command as proposed"] });
  return { layers, final: physDecision, out: c };
}

const DEC_TONE = { ACCEPT: "success", EXECUTED: "success", CLAMP: "warning", BLOCK: "danger", BYPASSED: "outline", INCIDENT: "danger" };
const DEC_COL = { ACCEPT: C.ok, EXECUTED: C.ok, CLAMP: C.warn, BLOCK: C.bad, BYPASSED: C.muted, INCIDENT: C.bad };

function LayerFlow({ result }) {
  const names = ["LLM proposal", "Physics Rules", "Safety Rules", "Execution"];
  const W = 620, bw = 128;
  const x = (k) => 16 + k * ((W - 32 - bw) / 3);
  return (
    <svg viewBox={`0 0 ${W} 120`} className="w-full font-mono">
      {names.map((n, k) => {
        const L = k === 0 ? { decision: "PROPOSED" } : result?.layers[k - 1];
        const col = k === 0 ? C.purple : L ? DEC_COL[L.decision] : C.grid;
        return (
          <g key={n}>
            {k > 0 && <line x1={x(k - 1) + bw} x2={x(k)} y1={52} y2={52} stroke={L ? col : C.grid} strokeWidth={2} strokeDasharray={L ? undefined : "4 4"} />}
            <rect x={x(k)} y={26} width={bw} height={52} rx={9} fill={col} fillOpacity={L ? 0.14 : 0.03} stroke={col} strokeWidth={L ? 1.8 : 1} />
            <text x={x(k) + bw / 2} y={46} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.fg}>
              {n}
            </text>
            <text x={x(k) + bw / 2} y={66} textAnchor="middle" fontSize={11} fill={col} fontWeight={600}>
              {L ? L.decision : "not reached"}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={104} textAnchor="middle" fontSize={10.5} fill={C.muted}>
        physics may CLAMP or BLOCK · safety may only BLOCK · AI is the lowest authority
      </text>
    </svg>
  );
}

function InterceptorVariant() {
  const [preset, setPreset] = useState("ovenHot");
  const [cmd, setCmd] = useState(CMD_PRESETS.ovenHot.cmd);
  const [guardrails, setGuardrails] = useState(true);
  const [currentTemp, setCurrentTemp] = useState(CMD_PRESETS.ovenHot.current);
  const [log, setLog] = useState([]);
  const result = useMemo(() => interceptCommand(cmd, { guardrails, currentTemp }), [cmd, guardrails, currentTemp]);
  const lim = LIMITS[cmd.equipment_type];
  const submit = () =>
    setLog((l) =>
      [
        {
          id: Date.now() + Math.random(),
          equip: cmd.equipment_type,
          orig: `${cmd.target_temperature}°C ${cmd.speed_rpm}rpm ${cmd.torque_nm}Nm`,
          decision: result.final,
          layer: result.layers.find((x) => x.decision === "BLOCK" || x.decision === "CLAMP" || x.decision === "INCIDENT")?.layer ?? "—",
          reason: result.layers.flatMap((x) => (x.decision === "ACCEPT" || x.decision === "EXECUTED" || x.decision === "BYPASSED" ? [] : x.reasons)).join("; ") || "within limits",
          final: result.out ? `${result.out.target_temperature}°C ${result.out.speed_rpm}rpm` : "—",
        },
        ...l,
      ].slice(0, 12)
    );
  const set = (k) => (v) => setCmd((c) => ({ ...c, [k]: v }));
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={(k) => (setPreset(k), setCmd(CMD_PRESETS[k].cmd), setCurrentTemp(CMD_PRESETS[k].current))}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CMD_PRESETS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit}>
          <Send /> Submit to guardrail
        </Button>
        <Button size="sm" variant="outline" onClick={() => setLog([])}>
          <RotateCcw /> Clear log
        </Button>
      </div>
      <Stage className="p-2">
        <LayerFlow result={result} />
      </Stage>
      <Split>
        <div className="space-y-3">
          <Narration tone={result.final === "BLOCK" || result.final === "INCIDENT" ? "bad" : result.final === "CLAMP" ? "warn" : "ok"}>
            {result.layers.map((L) => (
              <div key={L.layer}>
                <Badge variant={DEC_TONE[L.decision]} className="mr-1.5">
                  {L.layer}: {L.decision}
                </Badge>
                {L.reasons.join("; ")}
              </div>
            ))}
          </Narration>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>equipment</TableHead>
                  <TableHead>AI proposed</TableHead>
                  <TableHead>decision</TableHead>
                  <TableHead>layer</TableHead>
                  <TableHead>reason</TableHead>
                  <TableHead>executed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-3 text-center text-[12px] text-muted-foreground">
                      audit log is empty — submit a command
                    </TableCell>
                  </TableRow>
                )}
                {log.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="py-1 font-mono text-[11.5px]">{r.equip}</TableCell>
                    <TableCell className="py-1 font-mono text-[11.5px]">{r.orig}</TableCell>
                    <TableCell className="py-1">
                      <Badge variant={DEC_TONE[r.decision]}>{r.decision}</Badge>
                    </TableCell>
                    <TableCell className="py-1 text-[11.5px]">{r.layer}</TableCell>
                    <TableCell className="max-w-56 py-1 text-[11.5px]">{r.reason}</TableCell>
                    <TableCell className="py-1 font-mono text-[11.5px]">{r.final}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="space-y-3">
          <Panel title="LLM-proposed command">
            <Select value={cmd.equipment_type} onValueChange={set("equipment_type")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Object.keys(LIMITS), "plasma_core"].map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                    {LIMITS[k] ? ` (${LIMITS[k].min_temp_c}…${LIMITS[k].max_temp_c}°C)` : " (unknown)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SliderControl label="target_temperature" value={cmd.target_temperature} min={-200} max={900} step={5} format={(v) => `${v}°C`} onChange={set("target_temperature")} />
            <SliderControl label="speed_rpm" value={cmd.speed_rpm} min={0} max={6000} step={100} onChange={set("speed_rpm")} />
            <SliderControl label="torque_nm" value={cmd.torque_nm} min={0} max={160} step={5} onChange={set("torque_nm")} />
            <SliderControl label="current temperature (sensor)" value={currentTemp} min={-200} max={600} step={10} format={(v) => `${v}°C`} onChange={setCurrentTemp} />
            <SwitchControl label="Guardrails ON" hint="OFF = execute raw AI output" checked={guardrails} onChange={setGuardrails} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="power" value={`${kw(result.out ?? cmd).toFixed(1)} kW`} tone={kw(cmd) > MAX_POWER_KW ? "bad" : undefined} hint="P = τ·ω = torque × rpm × 2π/60" />
            <Stat label="limit" value={lim ? `${lim.max_temp_c}°C` : "—"} />
          </StatGrid>
        </div>
      </Split>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: fallback (state machine)                                   */
/* ------------------------------------------------------------------ */

const SCENARIOS = {
  ok: { label: "AI answers 80°C (valid)", attempts: [{ lat: 450, value: 80 }], sensors: true },
  clamp: { label: "AI answers 500°C (max_safe 100)", attempts: [{ lat: 500, value: 500 }], sensors: true },
  fixed: { label: "Malformed JSON, then fixed on retry", attempts: [{ lat: 600, malformed: '{"temp": "eighty"' }, { lat: 520, value: 85 }], sensors: true },
  junk: { label: "Always malformed", attempts: [{ lat: 600, malformed: "Sure! Set it to hot." }, { lat: 640, malformed: '{"temperature": null}' }, { lat: 580, malformed: "```json\\n{temp: 90}" }, { lat: 610, malformed: "I cannot comply." }], sensors: true },
  timeout: { label: "Model times out", attempts: [{ lat: 9000 }, { lat: 9000 }, { lat: 9000 }, { lat: 9000 }], sensors: true },
  sensor: { label: "Timeout + sensor offline", attempts: [{ lat: 9000 }, { lat: 9000 }, { lat: 9000 }, { lat: 9000 }], sensors: false },
};

const FSM = {
  PROPOSE: { x: 70, y: 60, label: "AI_PROPOSE" },
  VALIDATE: { x: 230, y: 60, label: "VALIDATE" },
  RETRY: { x: 150, y: 170, label: "RETRY" },
  CLAMP: { x: 390, y: 60, label: "PHYSICS_CLAMP" },
  EXECUTE: { x: 550, y: 60, label: "EXECUTE" },
  DEFAULT: { x: 390, y: 170, label: "SAFE_DEFAULT" },
  ESTOP: { x: 550, y: 170, label: "E_STOP" },
};
const FSM_EDGES = [
  ["PROPOSE", "VALIDATE"], ["VALIDATE", "EXECUTE"], ["VALIDATE", "CLAMP"], ["CLAMP", "EXECUTE"], ["VALIDATE", "RETRY"], ["RETRY", "PROPOSE"], ["RETRY", "DEFAULT"], ["DEFAULT", "EXECUTE"], ["DEFAULT", "ESTOP"],
];

/** Pure: walk the fallback chain. */
export function fallbackSteps(sc, { maxRetries, timeoutMs, maxSafe = 100, safeDefault = 50 }) {
  const steps = [];
  let t = 0;
  const visited = [];
  const log = [];
  const S = (state, note, tone, extra = {}) => {
    if (visited.length) visited.push([visited.at(-1)[1], state]);
    else visited.push([null, state]);
    steps.push({ state, note, tone, t, edges: visited.slice(1).map((e) => e.join(">")), log: [...log], ...extra });
  };
  for (let a = 0; a <= maxRetries; a++) {
    const at = sc.attempts[Math.min(a, sc.attempts.length - 1)];
    S("PROPOSE", a === 0 ? "Ask the model for a setpoint (with the schema in the prompt)." : `Retry ${a}/${maxRetries}: re-prompt with the validation error appended.`, "active");
    if (at.lat > timeoutMs) {
      t += timeoutMs;
      log.push([`attempt ${a + 1}`, `timeout after ${timeoutMs} ms`, "fail"]);
      S("VALIDATE", `No answer within ${timeoutMs} ms → asyncio.TimeoutError. Treat it like invalid output.`, "bad");
    } else if (at.malformed) {
      t += at.lat;
      log.push([`attempt ${a + 1}`, `malformed: ${at.malformed.slice(0, 26)}`, "fail"]);
      S("VALIDATE", `Model replied in ${at.lat} ms but the output fails the Pydantic schema: ${at.malformed.slice(0, 40)}`, "bad");
    } else {
      t += at.lat;
      S("VALIDATE", `Model replied ${at.value}°C in ${at.lat} ms — schema OK. Now apply the physics rule (max_safe = ${maxSafe}).`, "active");
      if (at.value > maxSafe) {
        log.push([`attempt ${a + 1}`, `${at.value} > max_safe → clamp`, "warn"]);
        S("CLAMP", `physics_rule: min(${at.value}, ${maxSafe}) = ${maxSafe}. Hard rules override the AI.`, "warn");
        log.push(["execute", `${maxSafe}°C (source=physics_rule)`, "ok"]);
        S("EXECUTE", `{"source": "physics_rule", "value": ${maxSafe}}`, "ok", { source: "physics_rule", value: maxSafe });
      } else {
        log.push([`attempt ${a + 1}`, `${at.value}°C accepted`, "ok"]);
        S("EXECUTE", `{"source": "ai_recommendation", "value": ${at.value}}`, "ok", { source: "ai_recommendation", value: at.value });
      }
      return steps;
    }
    if (a < maxRetries) S("RETRY", `Validation failed — ${maxRetries - a} retr${maxRetries - a === 1 ? "y" : "ies"} left.`, "warn");
  }
  S("RETRY", "Retries exhausted — stop asking the model.", "bad");
  if (sc.sensors) {
    log.push(["safe_default", `${safeDefault}°C`, "warn"]);
    S("DEFAULT", `safe_default: hold ${safeDefault}°C — a deterministic value that is always safe for this equipment.`, "warn");
    S("EXECUTE", `{"source": "safe_default", "value": ${safeDefault}}`, "ok", { source: "safe_default", value: safeDefault });
  } else {
    log.push(["safe_default", "precondition failed: sensors offline", "fail"]);
    S("DEFAULT", "The safe default needs live temperature feedback, but the sensor bus is offline — it cannot be applied safely.", "bad");
    log.push(["E-STOP", "de-energize actuators", "fail"]);
    S("ESTOP", "Last resort: emergency stop. Actuators de-energized, operator paged. Deterministic and always available.", "bad", { source: "e_stop", value: null });
  }
  return steps;
}

function FsmDiagram({ step }) {
  const cur = step.state;
  const taken = new Set(step.edges);
  return (
    <svg viewBox="0 0 620 220" className="w-full font-mono">
      <defs>
        <marker id="fsm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      {FSM_EDGES.map(([a, b]) => {
        const A = FSM[a], B = FSM[b];
        const on = taken.has(`${a}>${b}`);
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
        const ox = (dx / L) * 62, oy = (dy / L) * 22;
        return <line key={a + b} x1={A.x + ox} y1={A.y + oy} x2={B.x - ox} y2={B.y - oy} stroke={on ? C.active : C.grid} strokeWidth={on ? 2.2 : 1.2} markerEnd="url(#fsm-arr)" />;
      })}
      {Object.entries(FSM).map(([k, n]) => {
        const active = cur === k;
        const col = k === "ESTOP" ? C.bad : k === "EXECUTE" ? C.ok : k === "DEFAULT" || k === "CLAMP" ? C.warn : k === "RETRY" ? C.purple : C.active;
        return (
          <g key={k}>
            <rect x={n.x - 60} y={n.y - 20} width={120} height={40} rx={20} fill={col} fillOpacity={active ? 0.25 : 0.06} stroke={col} strokeWidth={active ? 2.5 : 1} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={active ? 700 : 500} fill={C.fg}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FallbackVariant() {
  const [sk, setSk] = useState("fixed");
  const [maxRetries, setMaxRetries] = useState(2);
  const [timeoutMs, setTimeoutMs] = useState(2000);
  const steps = useMemo(() => fallbackSteps(SCENARIOS[sk], { maxRetries, timeoutMs }), [sk, maxRetries, timeoutMs]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sk} onValueChange={setSk}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCENARIOS).map(([k, s]) => (
              <SelectItem key={k} value={k}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setSk(Object.keys(SCENARIOS)[Math.floor(Math.random() * 6)])}>
          <Shuffle /> Random fault
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <FsmDiagram step={step} />
          </Stage>
          <Legend items={[[C.active, "AI path"], [C.purple, "retry loop"], [C.warn, "deterministic override"], [C.ok, "actuate"], [C.bad, "emergency stop"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <Panel title="Policy">
            <SliderControl label="max retries" value={maxRetries} min={0} max={3} onChange={setMaxRetries} />
            <SliderControl label="model timeout" value={timeoutMs} min={500} max={5000} step={250} format={(v) => `${v} ms`} onChange={setTimeoutMs} />
          </Panel>
          <StatGrid cols={2}>
            <Stat label="elapsed" value={`${step.t} ms`} tone="active" />
            <Stat label="source" value={step.source ?? "…"} tone={step.source === "e_stop" ? "bad" : step.source ? "ok" : undefined} />
          </StatGrid>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>step</TableHead>
                  <TableHead>outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {step.log.map(([a, b, tone], k) => (
                  <TableRow key={k}>
                    <TableCell className="py-1 font-mono text-[11.5px]">{a}</TableCell>
                    <TableCell className={cn("py-1 font-mono text-[11.5px]", tone === "fail" && "text-viz-bad", tone === "warn" && "text-viz-warn", tone === "ok" && "text-viz-ok")}>{b}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Split>
    </>
  );
}

const META = {
  validation: {
    title: "Pydantic Validation Playground",
    description: "Edit a sensor payload and watch each field go through mode='before' validators, type coercion, Field constraints and @field_validator, then the cross-field @model_validator.",
    badges: ["BaseModel", "Field(ge, le, pattern)", "strict mode"],
  },
  interceptor: {
    title: "Guardrail Interceptor — Physics → Safety → Execution",
    description: "An LLM proposes a motor/thermal command. Physics rules may clamp or block, safety rules may only block, and every decision lands in the audit log.",
    badges: ["trust boundary", "decision hierarchy", "audit log"],
  },
  fallback: {
    title: "Deterministic Fallback Chain",
    description: "When the model returns junk or times out: retry with the error, clamp with physics rules, fall back to a safe default — and E-STOP when nothing else is safe.",
    badges: ["retry", "safe default", "E-STOP"],
  },
};

export default function GuardrailLab({ variant = "validation" }) {
  const m = META[variant] ?? META.validation;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "interceptor" ? <InterceptorVariant /> : variant === "fallback" ? <FallbackVariant /> : <ValidationVariant />}
    </LabShell>
  );
}
