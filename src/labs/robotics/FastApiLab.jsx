import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, CodePanel, LabShell, Legend, Narration, Panel, PlaybackBar, Split, Stage, SwitchControl, VarTable, useStepper } from "@/viz/kit";

const inputCls = "h-8 rounded-md border border-input bg-card px-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

/* ------------------------------------------------------------------ */
/* Variant: lifecycle                                                  */
/* ------------------------------------------------------------------ */

const APP_CODE = `from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(title="Factory Telemetry API")

class SensorReading(BaseModel):
    sensor_id: str
    value: float = Field(..., ge=-100, le=200)
    unit: str = "celsius"

class ReadingResponse(BaseModel):
    sensor_id: str
    value: float
    unit: str

@app.get("/sensors/{sensor_id}", response_model=ReadingResponse)
def get_sensor(sensor_id: str) -> ReadingResponse:
    if sensor_id not in sensors_db:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensors_db[sensor_id]

@app.post("/sensors", response_model=ReadingResponse, status_code=201)
def create_sensor(reading: SensorReading) -> ReadingResponse:
    sensors_db[reading.sensor_id] = {**reading.model_dump(),
                                     "internal_note": "unreviewed"}
    return sensors_db[reading.sensor_id]

@app.get("/readings/{reading_id}")
def get_reading(reading_id: int) -> dict:
    return {"reading_id": reading_id}

@app.delete("/sensors/{sensor_id}", status_code=204)
def delete_sensor(sensor_id: str) -> None:
    if sensor_id == "temp-01":
        raise HTTPException(status_code=403, detail="Cannot delete primary sensor")
    sensors_db.pop(sensor_id, None)`;

// 1-based lines in APP_CODE for each route's decorator / model / body
const LN = { model: [6, 7, 8, 9], resp: [11, 12, 13, 14], getS: 16, getSBody: [18, 19, 20], post: 22, postBody: [24, 25, 26], getR: 28, getRBody: 30, del: 32, delBody: [34, 35, 36] };

const SEED_DB = {
  "temp-01": { sensor_id: "temp-01", value: 23.5, unit: "celsius", internal_note: "primary — calibrated 2024-03" },
  "press-02": { sensor_id: "press-02", value: 101.3, unit: "kPa", internal_note: "replace gasket" },
};

const PRESETS = {
  ok: { label: "POST valid reading", method: "POST", path: "/sensors", body: '{\n  "sensor_id": "temp-07",\n  "value": 23.5\n}' },
  coerce: { label: "POST value as string (coerced)", method: "POST", path: "/sensors", body: '{\n  "sensor_id": "temp-08",\n  "value": "42.0",\n  "unit": "celsius"\n}' },
  range: { label: "POST out-of-range spike (250)", method: "POST", path: "/sensors", body: '{\n  "sensor_id": "temp-09",\n  "value": 250\n}' },
  missing: { label: "POST missing sensor_id", method: "POST", path: "/sensors", body: '{\n  "value": 19.2\n}' },
  badtype: { label: "POST value = \"hot\"", method: "POST", path: "/sensors", body: '{\n  "sensor_id": "temp-10",\n  "value": "hot"\n}' },
  malformed: { label: "POST malformed JSON", method: "POST", path: "/sensors", body: '{\n  "sensor_id": "temp-11",\n  "value": 23.5,\n' },
  get: { label: "GET existing sensor", method: "GET", path: "/sensors/temp-01", body: "" },
  get404: { label: "GET unknown sensor (404)", method: "GET", path: "/sensors/ghost-99", body: "" },
  pathint: { label: "GET /readings/abc (int path)", method: "GET", path: "/readings/abc", body: "" },
  del403: { label: "DELETE primary sensor (403)", method: "DELETE", path: "/sensors/temp-01", body: "" },
  del204: { label: "DELETE press-02 (204)", method: "DELETE", path: "/sensors/press-02", body: "" },
  noroute: { label: "GET /telemetry (no route)", method: "GET", path: "/telemetry", body: "" },
};

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Pydantic-v2-style lax validation of SensorReading. Pure. */
export function validateReading(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body))
    return { errors: [{ type: "model_attributes_type", loc: ["body"], msg: "Input should be a valid dictionary or object to extract fields from", input: body }] };
  const errors = [];
  const out = {};
  if (!("sensor_id" in body)) errors.push({ type: "missing", loc: ["body", "sensor_id"], msg: "Field required", input: body });
  else if (typeof body.sensor_id !== "string") errors.push({ type: "string_type", loc: ["body", "sensor_id"], msg: "Input should be a valid string", input: body.sensor_id });
  else out.sensor_id = body.sensor_id;
  const coerced = [];
  if (!("value" in body)) errors.push({ type: "missing", loc: ["body", "value"], msg: "Field required", input: body });
  else {
    let v = body.value;
    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "" && Number.isFinite(Number(t))) {
        coerced.push(`value "${v}" → ${Number(t)}`);
        v = Number(t);
      } else {
        errors.push({ type: "float_parsing", loc: ["body", "value"], msg: "Input should be a valid number, unable to parse string as a number", input: v });
        v = undefined;
      }
    } else if (typeof v === "boolean") {
      coerced.push(`value ${v} → ${Number(v)}.0`);
      v = Number(v);
    } else if (!isNum(v)) {
      errors.push({ type: "float_type", loc: ["body", "value"], msg: "Input should be a valid number", input: v });
      v = undefined;
    }
    if (v !== undefined) {
      if (v < -100) errors.push({ type: "greater_than_equal", loc: ["body", "value"], msg: "Input should be greater than or equal to -100", input: body.value, ctx: { ge: -100 } });
      else if (v > 200) errors.push({ type: "less_than_equal", loc: ["body", "value"], msg: "Input should be less than or equal to 200", input: body.value, ctx: { le: 200 } });
      else out.value = v;
    }
  }
  if ("unit" in body) {
    if (typeof body.unit !== "string") errors.push({ type: "string_type", loc: ["body", "unit"], msg: "Input should be a valid string", input: body.unit });
    else out.unit = body.unit;
  } else out.unit = "celsius";
  const extra = Object.keys(body).filter((k) => !["sensor_id", "value", "unit"].includes(k));
  return { errors, value: errors.length ? null : out, coerced, extra };
}

const pick = (o) => ({ sensor_id: o.sensor_id, value: o.value, unit: o.unit });

/** Route + validate + execute a request against the in-memory db. Pure: returns steps and the next db. */
export function processRequest({ method, path, body }, db) {
  const steps = [];
  const S = (stage, note, tone = "active", line, extra = {}) => steps.push({ stage, note, tone, line, ...extra });
  const finish = (status, json, failStage, tone, line, note) => {
    S(6, note, tone, line, { status, json, failStage });
    return { steps, db: nextDb, status };
  };
  let nextDb = db;
  S(0, `Client sends ${method} ${path}${body.trim() ? " with a JSON body" : ""}.`, "default");
  S(1, "uvicorn (ASGI server) parses the raw HTTP bytes into a scope + body and hands them to the FastAPI app.", "default");
  // routing
  const p = path.split("?")[0].replace(/\/+$/, "") || "/";
  const routes = [
    { m: "GET", re: /^\/sensors\/([^/]+)$/, id: "getS" },
    { m: "DELETE", re: /^\/sensors\/([^/]+)$/, id: "del" },
    { m: "POST", re: /^\/sensors$/, id: "post" },
    { m: "GET", re: /^\/readings\/([^/]+)$/, id: "getR" },
  ];
  const pathHits = routes.filter((r) => r.re.test(p));
  const route = pathHits.find((r) => r.m === method);
  if (!pathHits.length) {
    S(2, `Router walks the route table: no path matches "${p}".`, "bad", undefined, { failStage: 2 });
    return finish(404, { detail: "Not Found" }, 2, "bad", undefined, "404 Not Found — no endpoint or validation ever ran.");
  }
  if (!route) {
    S(2, `Path matches but no route accepts ${method}.`, "bad", undefined, { failStage: 2 });
    return finish(405, { detail: "Method Not Allowed" }, 2, "bad", undefined, "405 Method Not Allowed.");
  }
  const param = decodeURIComponent(p.match(route.re)[1] ?? "");
  S(2, `Router matched ${method} ${route.id === "post" ? "/sensors" : route.id === "getR" ? "/readings/{reading_id}" : "/sensors/{sensor_id}"}.`, "active", LN[route.id]);

  // validation
  let reading;
  if (route.id === "getR") {
    if (!/^[+-]?\d+$/.test(param.trim())) {
      const err = [{ type: "int_parsing", loc: ["path", "reading_id"], msg: "Input should be a valid integer, unable to parse string as an integer", input: param }];
      S(3, `reading_id: int — "${param}" cannot be parsed as an integer.`, "bad", 28, { failStage: 3 });
      return finish(422, { detail: err }, 3, "bad", 28, "422 Unprocessable Entity — the endpoint never ran.");
    }
    S(3, `Path param "${param}" → int ${parseInt(param, 10)}.`, "ok", 28);
  } else if (route.id === "post") {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      const err = [{ type: "json_invalid", loc: ["body", 0], msg: "JSON decode error", input: {}, ctx: { error: String(e.message).split("\n")[0] } }];
      S(3, "The body is not valid JSON, so Pydantic cannot even start.", "bad", LN.model, { failStage: 3 });
      return finish(422, { detail: err }, 3, "bad", LN.model, "422 — malformed JSON rejected at the boundary.");
    }
    const r = validateReading(parsed);
    if (r.errors.length) {
      S(3, `SensorReading validation failed with ${r.errors.length} error(s): ${r.errors.map((e) => `${e.loc.at(-1)} → ${e.type}`).join(", ")}.`, "bad", LN.model, { failStage: 3 });
      return finish(422, { detail: r.errors }, 3, "bad", LN.model, "422 Unprocessable Entity — create_sensor() never ran, so no bad data reached the store.");
    }
    reading = r.value;
    S(
      3,
      `Body → SensorReading OK.` + (r.coerced.length ? ` Lax coercion: ${r.coerced.join("; ")}.` : "") + (!("unit" in parsed) ? ' unit defaulted to "celsius".' : "") + (r.extra.length ? ` Extra field(s) ${r.extra.join(", ")} ignored.` : ""),
      "ok",
      LN.model
    );
  } else S(3, `Path param sensor_id: str = "${param}" — valid.`, "ok", LN[route.id]);

  // endpoint
  if (route.id === "getS") {
    if (!db[param]) {
      S(4, `"${param}" not in sensors_db → raise HTTPException(404).`, "bad", LN.getSBody, { failStage: 4 });
      return finish(404, { detail: "Sensor not found" }, 4, "bad", 19, "404 — HTTPException short-circuits straight to the error response.");
    }
    S(4, `get_sensor() returns the stored dict (including internal_note).`, "active", 20);
    S(5, "response_model=ReadingResponse filters the output: internal_note is dropped.", "ok", LN.resp, { dropped: ["internal_note"] });
    return finish(200, pick(db[param]), null, "ok", 20, "200 OK.");
  }
  if (route.id === "post") {
    nextDb = { ...db, [reading.sensor_id]: { ...reading, internal_note: "unreviewed" } };
    S(4, `create_sensor() stores ${reading.sensor_id} with an internal_note.`, "active", LN.postBody);
    S(5, "response_model=ReadingResponse serializes only sensor_id, value, unit.", "ok", LN.resp, { dropped: ["internal_note"] });
    return finish(201, pick(nextDb[reading.sensor_id]), null, "ok", LN.post, "201 Created.");
  }
  if (route.id === "getR") {
    S(4, `get_reading(reading_id=${parseInt(param, 10)}) runs.`, "active", LN.getRBody);
    S(5, "Return value is a plain dict → serialized to JSON.", "ok", LN.getRBody);
    return finish(200, { reading_id: parseInt(param, 10) }, null, "ok", LN.getRBody, "200 OK.");
  }
  // delete
  if (param === "temp-01") {
    S(4, "temp-01 is the primary sensor → raise HTTPException(403).", "bad", [34, 35], { failStage: 4 });
    return finish(403, { detail: "Cannot delete primary sensor" }, 4, "bad", 35, "403 Forbidden.");
  }
  nextDb = { ...db };
  delete nextDb[param];
  S(4, `delete_sensor() removes "${param}" (no-op if absent).`, "active", 36);
  S(5, "Return type None + status_code=204 → empty body.", "ok", LN.del);
  return finish(204, null, null, "ok", LN.del, "204 No Content.");
}

const STAGES = ["client", "uvicorn", "router", "Pydantic", "endpoint", "response_model"];

function Pipeline({ step }) {
  const W = 620, H = 150, n = STAGES.length;
  const cx = (k) => 52 + k * ((W - 104) / (n - 1));
  const returning = step.stage === 6;
  const px = returning ? cx(0) : cx(step.stage);
  const statusTone = step.status >= 400 ? C.bad : C.ok;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <defs>
        <marker id="fa-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      {STAGES.slice(0, -1).map((_, k) => (
        <line key={k} x1={cx(k) + 40} x2={cx(k + 1) - 42} y1={58} y2={58} stroke={C.muted} strokeWidth={1.5} markerEnd="url(#fa-arr)" />
      ))}
      {/* response path back to client */}
      <path d={`M ${cx(n - 1)} 86 Q ${cx(n - 1)} 128 ${(cx(0) + cx(n - 1)) / 2} 128 Q ${cx(0)} 128 ${cx(0)} 86`} fill="none" stroke={returning ? statusTone : C.grid} strokeWidth={returning ? 2 : 1.2} strokeDasharray="5 4" />
      {STAGES.map((s, k) => {
        const failed = step.failStage === k;
        const passed = !failed && k > 0 && (step.failStage == null ? step.stage > k : k < step.failStage);
        const cur = step.stage === k;
        const col = failed ? C.bad : cur ? C.active : passed ? C.ok : C.muted;
        return (
          <g key={s}>
            <rect x={cx(k) - 40} y={36} width={80} height={44} rx={8} fill={col} fillOpacity={cur || failed ? 0.18 : 0.07} stroke={col} strokeWidth={cur || failed ? 2 : 1} />
            <text x={cx(k)} y={s.includes("_") ? 56 : 62} textAnchor="middle" fontSize={11} fill={C.fg} fontWeight={cur ? 700 : 500}>
              {s.split("_").map((w, j) => (
                <tspan key={w} x={cx(k)} dy={j ? 13 : 0}>
                  {w}
                </tspan>
              ))}
            </text>
            {failed && (
              <text x={cx(k)} y={28} textAnchor="middle" fontSize={11} fill={C.bad} fontWeight={700}>
                ✕ rejected
              </text>
            )}
          </g>
        );
      })}
      <circle cx={px} cy={returning ? 104 : 20} r={8} fill={returning ? statusTone : C.active} className="transition-all duration-500" />
      {returning && (
        <text x={px + 14} y={108} fontSize={12} fontWeight={700} fill={statusTone}>
          {step.status}
        </text>
      )}
    </svg>
  );
}

const statusVariant = (s) => (s >= 400 ? "danger" : s >= 300 ? "warning" : "success");

function LifecycleVariant() {
  const [preset, setPreset] = useState("ok");
  const [method, setMethod] = useState(PRESETS.ok.method);
  const [path, setPath] = useState(PRESETS.ok.path);
  const [body, setBody] = useState(PRESETS.ok.body);
  const [db, setDb] = useState(SEED_DB);
  const [sent, setSent] = useState(null); // {req, result}
  const [log, setLog] = useState([]);

  const send = () => {
    const req = { method, path, body: method === "POST" ? body : "" };
    const result = processRequest(req, db);
    setSent({ req, result, id: Date.now() });
    setDb(result.db);
    setLog((l) => [{ id: Date.now(), method, path, status: result.status, ms: (2 + Math.random() * 6).toFixed(1) }, ...l].slice(0, 8));
  };
  const steps = useMemo(() => sent?.result.steps ?? [{ stage: 0, note: "Pick a request preset or edit one, then press Send.", tone: "default" }], [sent]);
  const st = useStepper(steps, { baseMs: 900 });
  const step = st.step;
  // auto-play each new request
  useEffect(() => {
    if (sent) st.toggle();
  }, [sent]); // eslint-disable-line react-hooks/exhaustive-deps
  const final = sent && st.atEnd ? steps.at(-1) : null;

  const loadPreset = (k) => {
    setPreset(k);
    setMethod(PRESETS[k].method);
    setPath(PRESETS[k].path);
    setBody(PRESETS[k].body);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={loadPreset}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRESETS).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => (setDb(SEED_DB), setLog([]), setSent(null))}>
          <RotateCcw /> Reset store
        </Button>
      </div>
      <Stage className="p-2">
        <Pipeline step={step} />
      </Stage>
      <Legend items={[[C.active, "current stage"], [C.ok, "passed"], [C.bad, "rejected → error response"]]} />
      <Narration tone={step.tone}>{step.note}</Narration>
      <Split>
        <div className="space-y-3">
          <Panel title="Request">
            <div className="flex gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "DELETE"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input className={`${inputCls} min-w-0 flex-1`} value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} aria-label="Path" />
              <Button size="sm" onClick={send}>
                <Send /> Send
              </Button>
            </div>
            {method === "POST" && (
              <textarea
                className="block h-32 w-full resize-y rounded-md border border-input bg-card p-2 font-mono text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
                aria-label="JSON body"
              />
            )}
          </Panel>
          <Panel title="Response">
            {final ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(final.status)}>HTTP {final.status}</Badge>
                  {steps.some((x) => x.dropped) && <span className="text-[11.5px] text-muted-foreground">response_model dropped: {steps.find((x) => x.dropped).dropped.join(", ")}</span>}
                </div>
                <ScrollArea className="max-h-52" viewportClassName="max-h-52">
                  <pre className="code-body rounded-md bg-code p-2 text-[12px]">{final.json === null ? "(empty body)" : JSON.stringify(final.json, null, 2)}</pre>
                </ScrollArea>
              </>
            ) : (
              <div className="text-[12.5px] text-muted-foreground">{sent ? "In flight…" : "No request sent yet."}</div>
            )}
          </Panel>
        </div>
        <div className="space-y-3">
          <CodePanel code={APP_CODE} active={step.line} lang="python" maxHeight={300} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>request log</TableHead>
                <TableHead className="text-right">status</TableHead>
                <TableHead className="text-right">ms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.length ? log.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="py-1 font-mono text-[12px]">
                    {r.method} {r.path}
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="py-1 text-right font-mono text-[12px]">{r.ms}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-2 text-center text-[12px] text-muted-foreground">
                    empty
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <VarTable title="sensors_db keys" vars={Object.keys(db).map((k) => [k, db[k].value])} />
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: depends                                                    */
/* ------------------------------------------------------------------ */

const depCode = (cache, override) => `def get_settings() -> dict:
    return {"env": "production", "debug": False}

def get_db() -> Generator[FakeSession, None, None]:
    db = FakeSession()            # SETUP
    try:
        yield db                  # HANDOFF to dependants
    finally:
        db.close()                # TEARDOWN (always runs)

def get_current_user(x_token: str = Header(...),
                     db: FakeSession = Depends(get_db)) -> User:
    user = db.users.get(x_token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/readings")
def list_readings(user: User = Depends(get_current_user),
                  db: FakeSession = Depends(get_db${cache ? "" : ", use_cache=False"}),
                  settings: dict = Depends(get_settings)) -> list[dict]:
    return db.query("readings", owner=user.name)
${override ? `
# tests/test_readings.py
app.dependency_overrides[get_db] = get_test_db
app.dependency_overrides[get_settings] = lambda: {"env": "test", "debug": True}` : ""}`;

const NODES = {
  header: { x: 70, y: 46, label: "Header x_token" },
  db: { x: 70, y: 150, label: "get_db()" },
  db2: { x: 70, y: 220, label: "get_db() #2" },
  settings: { x: 300, y: 220, label: "get_settings()" },
  user: { x: 300, y: 80, label: "get_current_user()" },
  endpoint: { x: 520, y: 150, label: "list_readings()" },
};
const EDGES = [
  ["header", "user"],
  ["db", "user"],
  ["user", "endpoint"],
  ["db", "endpoint"],
  ["settings", "endpoint"],
];

/** Pure: resolve the dependency graph like FastAPI's solve_dependencies. */
export function depSteps({ cache, override, token, crash }) {
  const steps = [];
  const state = {};
  const log = [];
  let opened = 0;
  let calls = 0;
  let hits = 0;
  const dbName = override ? "get_test_db" : "get_db";
  const push = (note, tone, line, active, extra = {}) =>
    steps.push({ note, tone, line, active, state: { ...state }, log: [...log], opened, calls, hits, ...extra });

  push(`GET /readings arrives with ${token === "missing" ? "no x-token header" : `x-token: ${token === "valid" ? "robot-ops" : "stolen-key"}`}. FastAPI walks the dependency tree depth-first, sub-dependencies first.`, "default", 18, "endpoint");
  // 1. get_current_user needs get_db first
  calls++;
  opened++;
  state.db = "open";
  log.push(`${dbName}(): FakeSession #1 opened`);
  push(`${dbName}() runs up to yield → session #1 is open and handed to get_current_user.${override ? " (dependency_overrides swapped in the test DB!)" : ""}`, "active", [5, 7], "db");
  // header validation for get_current_user
  if (token === "missing") {
    state.header = "error";
    log.push("422: header x-token Field required");
    push("get_current_user's x_token: str = Header(...) is missing → validation error. get_current_user and the endpoint never run.", "bad", 11, "header");
    state.db = "closed";
    log.push(`${dbName}(): finally → session #1 closed`);
    push("Teardown still runs: the code after yield (finally) closes session #1.", "warn", 9, "db");
    push("Response: 422 Unprocessable Entity {detail: [{type: missing, loc: [header, x-token]}]}", "bad", 18, null, { status: 422 });
    return steps;
  }
  state.header = "ok";
  push(`Header x_token parsed: "${token === "valid" ? "robot-ops" : "stolen-key"}".`, "ok", 11, "header");
  state.user = "running";
  if (token === "invalid") {
    state.user = "error";
    log.push("get_current_user: raise HTTPException(401)");
    push("db.users.get(x_token) is None → HTTPException(401). The endpoint never runs.", "bad", [14, 15], "user");
    state.db = "closed";
    log.push(`${dbName}(): finally → session #1 closed`);
    push("The exception unwinds through get_db's try/finally: session #1 is closed anyway.", "warn", 9, "db");
    push('Response: 401 {"detail": "Invalid token"}', "bad", 18, null, { status: 401 });
    return steps;
  }
  state.user = "done";
  log.push("get_current_user → User(name='robot-ops')");
  push("get_current_user returns User(name='robot-ops').", "ok", 16, "user");
  // endpoint's own Depends(get_db)
  if (cache) {
    hits++;
    state.db = "cached";
    log.push(`${dbName}: cache hit → reuse session #1`);
    push(`list_readings also needs Depends(get_db). Same dependency in the same request → cached value reused, no second session (use_cache=True is the default).`, "ok", 20, "db");
  } else {
    calls++;
    opened++;
    state.db2 = "open";
    log.push(`${dbName}(): FakeSession #2 opened (use_cache=False)`);
    push("use_cache=False forces a fresh call: a SECOND session is opened for the same request.", "warn", [5, 7], "db2");
  }
  state.settings = "done";
  log.push(`get_settings → env=${override ? "test" : "production"}`);
  push(`get_settings() returns {"env": "${override ? "test" : "production"}", "debug": ${override ? "True" : "False"}}${override ? " — overridden for tests." : "."}`, "ok", override ? 26 : 2, "settings");
  state.endpoint = crash ? "error" : "running";
  if (crash) {
    log.push("list_readings: raised RuntimeError");
    push("The endpoint crashes mid-query (RuntimeError)…", "bad", 22, "endpoint");
  } else {
    log.push("list_readings: query readings for robot-ops");
    push("All parameters resolved — list_readings(user, db, settings) runs.", "active", 22, "endpoint");
  }
  // teardown in reverse order
  if (!cache) {
    state.db2 = "closed";
    log.push(`${dbName}(): finally → session #2 closed`);
    push("Teardown in reverse order of setup: session #2 closes first…", "warn", 9, "db2");
  }
  state.db = "closed";
  log.push(`${dbName}(): finally → session #1 closed`);
  push(`…then session #1 (${crash ? "the finally block runs even though the endpoint raised" : "after the endpoint returned"}).`, "warn", 9, "db");
  state.endpoint = crash ? "error" : "done";
  push(crash ? "Response: 500 Internal Server Error — but no connection leaked." : `Response: 200 OK with ${override ? "1 test reading" : "the user's readings"}. Sessions opened: ${opened}, all closed.`, crash ? "bad" : "ok", 18, null, { status: crash ? 500 : 200 });
  return steps;
}

const NODE_TONE = { open: C.active, running: C.active, cached: C.purple, done: C.ok, ok: C.ok, closed: C.muted, error: C.bad };

function DepGraph({ step, cache, override }) {
  const ids = Object.keys(NODES).filter((k) => k !== "db2" || !cache);
  const edges = cache ? EDGES : EDGES.map((e) => (e[0] === "db" && e[1] === "endpoint" ? ["db2", "endpoint"] : e));
  return (
    <svg viewBox="0 0 620 270" className="w-full font-mono">
      <defs>
        <marker id="dep-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
        </marker>
      </defs>
      {edges.map(([a, b]) => {
        const A = NODES[a], B = NODES[b];
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
        return <line key={a + b} x1={A.x + (dx / L) * 64} y1={A.y + (dy / L) * 22} x2={B.x - (dx / L) * 66} y2={B.y - (dy / L) * 24} stroke={C.muted} strokeWidth={1.4} markerEnd="url(#dep-arr)" />;
      })}
      {ids.map((k) => {
        const n = NODES[k];
        const s = step.state[k];
        const col = NODE_TONE[s] ?? C.ink;
        const cur = step.active === k;
        const label = override && (k === "db" || k === "db2") ? n.label.replace("get_db", "get_test_db") : override && k === "settings" ? "mock_settings()" : n.label;
        return (
          <g key={k}>
            <rect x={n.x - 64} y={n.y - 20} width={128} height={40} rx={8} fill={col} fillOpacity={cur ? 0.22 : 0.08} stroke={col} strokeWidth={cur ? 2.2 : 1.2} />
            <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={11} fill={C.fg} fontWeight={600}>
              {label}
            </text>
            <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize={10} fill={col}>
              {s ?? "pending"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DependsVariant() {
  const [cache, setCache] = useState(true);
  const [override, setOverride] = useState(false);
  const [crash, setCrash] = useState(false);
  const [token, setToken] = useState("valid");
  const steps = useMemo(() => depSteps({ cache, override, token, crash }), [cache, override, token, crash]);
  const st = useStepper(steps, { baseMs: 1000 });
  const step = st.step;
  return (
    <>
      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <DepGraph step={step} cache={cache} override={override} />
          </Stage>
          <Legend items={[[C.active, "setup / running"], [C.purple, "cache hit"], [C.ok, "resolved"], [C.muted, "torn down"], [C.bad, "error"]]} />
          <Narration tone={step.tone}>{step.note}</Narration>
          <PlaybackBar stepper={st} />
        </div>
        <div className="space-y-3">
          <Panel title="Scenario">
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">x-token: robot-ops (valid)</SelectItem>
                <SelectItem value="invalid">x-token: stolen-key (401)</SelectItem>
                <SelectItem value="missing">no x-token header (422)</SelectItem>
              </SelectContent>
            </Select>
            <SwitchControl label="Cache shared dependency" hint="Depends(get_db) default use_cache=True" checked={cache} onChange={setCache} />
            <SwitchControl label="app.dependency_overrides" hint="Swap get_db / get_settings for tests" checked={override} onChange={setOverride} />
            <SwitchControl label="Endpoint raises" hint="Does teardown still run?" checked={crash} onChange={setCrash} />
          </Panel>
          <VarTable
            vars={[
              ["get_db calls", step.calls, "active"],
              ["sessions opened", step.opened],
              ["cache hits", step.hits, "purple"],
              ["status", step.status ?? "…", step.status >= 400 ? "bad" : step.status ? "ok" : undefined],
            ]}
          />
          <div className="rounded-lg border bg-muted/40 p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Execution log</div>
            <ScrollArea className="max-h-36" viewportClassName="max-h-36">
              <ol className="space-y-0.5 font-mono text-[11.5px]">
                {step.log.map((l, k) => (
                  <li key={k} className={l.includes("closed") ? "text-muted-foreground" : l.includes("raise") || l.includes("422") ? "text-viz-bad" : ""}>
                    {k + 1}. {l}
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </div>
        </div>
      </Split>
      <CodePanel code={depCode(cache, override)} active={step.line} lang="python" maxHeight={280} />
    </>
  );
}

const META = {
  lifecycle: {
    title: "FastAPI Request Lifecycle",
    description: "Send a request and follow it through uvicorn, routing, Pydantic validation, the endpoint and response_model filtering. Bad bodies stop at 422 before your code runs.",
    badges: ["FastAPI", "Pydantic v2", "status codes"],
  },
  depends: {
    title: "Dependency Injection Graph — Depends() with yield",
    description: "Watch FastAPI resolve get_db → get_current_user → endpoint, cache the shared session, and tear down in reverse — even on errors. Flip overrides like a test would.",
    badges: ["Depends", "yield setup/teardown", "dependency_overrides"],
  },
};

export default function FastApiLab({ variant = "lifecycle" }) {
  const m = META[variant] ?? META.lifecycle;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "depends" ? <DependsVariant /> : <LifecycleVariant />}
    </LabShell>
  );
}
