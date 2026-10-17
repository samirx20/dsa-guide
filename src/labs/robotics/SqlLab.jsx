import { useMemo, useState } from "react";
import { Play, RotateCcw, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, LabShell, Legend, Narration, Panel, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, VarTable, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Sample data (robots / telemetry)                                    */
/* ------------------------------------------------------------------ */

const ROBOTS = [
  { id: 1, serial: "RX-100", model: "arm-6dof", max_rpm: 3000, zone: "A" },
  { id: 2, serial: "RX-101", model: "arm-6dof", max_rpm: 3000, zone: "B" },
  { id: 3, serial: "AGV-7", model: "agv", max_rpm: 1800, zone: "A" },
  { id: 4, serial: "DR-2", model: "drone", max_rpm: 9000, zone: null },
];
const TELEMETRY = [
  { id: 1, robot_id: 1, temp_c: 45.2, rpm: 1200, recorded_at: "08:00" },
  { id: 2, robot_id: 1, temp_c: 71.8, rpm: 2900, recorded_at: "08:05" },
  { id: 3, robot_id: 2, temp_c: 38.0, rpm: 0, recorded_at: "08:00" },
  { id: 4, robot_id: 2, temp_c: 82.5, rpm: 2950, recorded_at: "08:05" },
  { id: 5, robot_id: 3, temp_c: 55.1, rpm: 1500, recorded_at: "08:00" },
  { id: 6, robot_id: 1, temp_c: 88.4, rpm: 3000, recorded_at: "08:10" },
  { id: 7, robot_id: 3, temp_c: 62.0, rpm: 1700, recorded_at: "08:05" },
  { id: 8, robot_id: 2, temp_c: 40.3, rpm: 800, recorded_at: "08:10" },
  { id: 9, robot_id: 3, temp_c: 91.0, rpm: 1800, recorded_at: "08:10" },
  { id: 10, robot_id: 1, temp_c: 52.6, rpm: 1000, recorded_at: "08:15" },
];

const SCHEMA = {
  robots: [
    { name: "id", type: "SERIAL", cons: ["PRIMARY KEY"] },
    { name: "serial", type: "VARCHAR(20)", cons: ["UNIQUE", "NOT NULL"] },
    { name: "model", type: "VARCHAR(50)", cons: ["NOT NULL"] },
    { name: "max_rpm", type: "INTEGER", cons: ["NOT NULL", "CHECK (max_rpm > 0)"] },
    { name: "zone", type: "VARCHAR(20)", cons: [] },
  ],
  telemetry: [
    { name: "id", type: "SERIAL", cons: ["PRIMARY KEY"] },
    { name: "robot_id", type: "INTEGER", cons: ["NOT NULL", "REFERENCES robots(id)"] },
    { name: "temp_c", type: "REAL", cons: ["NOT NULL", "CHECK (temp_c BETWEEN -40 AND 150)"] },
    { name: "rpm", type: "INTEGER", cons: ["NOT NULL", "CHECK (rpm >= 0)"] },
    { name: "recorded_at", type: "TIMESTAMP", cons: ["NOT NULL", "DEFAULT now()"] },
  ],
};

const inputCls = "h-8 w-full rounded-md border border-input bg-card px-2 font-mono text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const show = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : v);

/** Generic data table with per-row tone. */
function Grid({ cols, rows, tones = {}, strike = {}, groups = {}, className }) {
  const groupBg = ["bg-viz-active/10", "bg-viz-purple/12", "bg-viz-warn/12", "bg-viz-ok/10"];
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c} className="h-8 font-mono text-[11.5px]">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols.length} className="py-3 text-center text-[12px] text-muted-foreground">
                (0 rows)
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, k) => (
            <TableRow
              key={k}
              className={cn(
                "transition-colors",
                groups[k] !== undefined && groupBg[groups[k] % groupBg.length],
                tones[k] === "ok" && "bg-viz-ok/12",
                tones[k] === "bad" && "bg-viz-bad/10",
                tones[k] === "active" && "bg-viz-active/12",
                strike[k] && "opacity-45 line-through decoration-viz-bad"
              )}
            >
              {cols.map((c) => (
                <TableCell key={c} className={cn("py-1 font-mono text-[12px] tabular-nums", r[c] === null && "italic text-muted-foreground")}>
                  {show(r[c])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** SQL text with one active line (sql is not a registered hljs language). */
function SqlView({ lines, active }) {
  const act = new Set([].concat(active ?? []));
  return (
    <pre className="code-body overflow-x-auto rounded-lg border bg-code py-2">
      {lines.map((l, k) => (
        <div key={k} className={cn("px-3 transition-colors", act.has(k) && "bg-viz-active/14 font-semibold text-viz-active")}>
          {l || " "}
        </div>
      ))}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: schema (constraints on INSERT)                             */
/* ------------------------------------------------------------------ */

const INSERT_PRESETS = {
  robots: {
    ok: { label: "Valid robot", v: { serial: "RX-102", model: "arm-6dof", max_rpm: "3000", zone: "C" } },
    nullModel: { label: "model = NULL (NOT NULL)", v: { serial: "RX-103", model: "NULL", max_rpm: "3000", zone: "C" } },
    dupSerial: { label: "duplicate serial (UNIQUE)", v: { serial: "AGV-7", model: "agv", max_rpm: "1800", zone: "B" } },
    negRpm: { label: "max_rpm = -5 (CHECK)", v: { serial: "RX-104", model: "arm-6dof", max_rpm: "-5", zone: "A" } },
    typeErr: { label: "max_rpm = 'fast' (type)", v: { serial: "RX-105", model: "arm-6dof", max_rpm: "fast", zone: "A" } },
    longSerial: { label: "serial too long (VARCHAR)", v: { serial: "RX-1000000000000000000", model: "arm-6dof", max_rpm: "3000", zone: "A" } },
  },
  telemetry: {
    ok: { label: "Valid reading", v: { robot_id: "3", temp_c: "64.5", rpm: "1600", recorded_at: "" } },
    spike: { label: "temp_c = 900 (CHECK)", v: { robot_id: "1", temp_c: "900", rpm: "1200", recorded_at: "" } },
    fk: { label: "robot_id = 99 (FOREIGN KEY)", v: { robot_id: "99", temp_c: "40", rpm: "500", recorded_at: "" } },
    nullTemp: { label: "temp_c = NULL", v: { robot_id: "2", temp_c: "NULL", rpm: "500", recorded_at: "" } },
    negRpm: { label: "rpm = -10 (CHECK)", v: { robot_id: "2", temp_c: "40", rpm: "-10", recorded_at: "" } },
  },
};

const isNull = (s) => s.trim() === "" || s.trim().toUpperCase() === "NULL";

/**
 * Pure: run PostgreSQL-style checks for an INSERT. Order: type parse → defaults (nextval) → NOT NULL → CHECK → UNIQUE → FK.
 * Returns {checks:[{name, ok, msg}], error, row, burned}
 */
export function checkInsert(table, raw, data, nextId) {
  const cols = SCHEMA[table].filter((c) => c.name !== "id");
  const checks = [];
  const row = {};
  // 1. type parsing (happens before the sequence is touched)
  for (const c of cols) {
    const s = raw[c.name] ?? "";
    if (c.name === "recorded_at" && s.trim() === "") continue;
    if (isNull(s)) {
      row[c.name] = null;
      continue;
    }
    if (c.type === "INTEGER" && !/^[+-]?\d+$/.test(s.trim())) {
      const msg = `ERROR:  invalid input syntax for type integer: "${s}"`;
      checks.push({ name: `type ${c.name} INTEGER`, ok: false, msg });
      return { checks, error: msg, burned: false };
    }
    if (c.type === "REAL" && !Number.isFinite(Number(s.trim()))) {
      const msg = `ERROR:  invalid input syntax for type real: "${s}"`;
      checks.push({ name: `type ${c.name} REAL`, ok: false, msg });
      return { checks, error: msg, burned: false };
    }
    const m = c.type.match(/VARCHAR\((\d+)\)/);
    if (m && s.length > +m[1]) {
      const msg = `ERROR:  value too long for type character varying(${m[1]})`;
      checks.push({ name: `type ${c.name} ${c.type}`, ok: false, msg });
      return { checks, error: msg, burned: false };
    }
    row[c.name] = c.type === "INTEGER" ? parseInt(s, 10) : c.type === "REAL" ? Number(s) : s;
  }
  checks.push({ name: "types parse", ok: true });
  // 2. defaults: SERIAL nextval() and now()
  row.id = nextId;
  if (table === "telemetry" && (raw.recorded_at ?? "").trim() === "") row.recorded_at = "08:20";
  checks.push({ name: `DEFAULT nextval() → id ${nextId}`, ok: true });
  const fail = (name, msg) => {
    checks.push({ name, ok: false, msg });
    return { checks, error: msg, burned: true, row };
  };
  // 3. NOT NULL
  for (const c of cols) if (c.cons.includes("NOT NULL") && row[c.name] === null) return fail(`NOT NULL ${c.name}`, `ERROR:  null value in column "${c.name}" of relation "${table}" violates not-null constraint`);
  checks.push({ name: "NOT NULL", ok: true });
  // 4. CHECK
  if (table === "robots" && row.max_rpm !== null && !(row.max_rpm > 0)) return fail("CHECK max_rpm > 0", `ERROR:  new row for relation "robots" violates check constraint "robots_max_rpm_check"`);
  if (table === "telemetry") {
    if (!(row.temp_c >= -40 && row.temp_c <= 150)) return fail("CHECK temp_c BETWEEN -40 AND 150", `ERROR:  new row for relation "telemetry" violates check constraint "telemetry_temp_c_check"`);
    if (!(row.rpm >= 0)) return fail("CHECK rpm >= 0", `ERROR:  new row for relation "telemetry" violates check constraint "telemetry_rpm_check"`);
  }
  checks.push({ name: "CHECK", ok: true });
  // 5. UNIQUE
  if (table === "robots" && data.robots.some((r) => r.serial === row.serial)) return fail("UNIQUE serial", `ERROR:  duplicate key value violates unique constraint "robots_serial_key"\nDETAIL:  Key (serial)=(${row.serial}) already exists.`);
  checks.push({ name: "UNIQUE", ok: true });
  // 6. FOREIGN KEY
  if (table === "telemetry") {
    if (!data.robots.some((r) => r.id === row.robot_id))
      return fail("FOREIGN KEY robot_id", `ERROR:  insert or update on table "telemetry" violates foreign key constraint "telemetry_robot_id_fkey"\nDETAIL:  Key (robot_id)=(${row.robot_id}) is not present in table "robots".`);
    checks.push({ name: "FOREIGN KEY", ok: true });
  }
  return { checks, error: null, row, burned: true };
}

function SchemaCard({ name }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b bg-muted/50 px-3 py-1.5 font-mono text-[12.5px] font-semibold">{name}</div>
      <div className="divide-y">
        {SCHEMA[name].map((c) => (
          <div key={c.name} className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
            <span className="w-24 font-mono text-[12px] font-semibold">{c.name}</span>
            <span className="font-mono text-[11.5px] text-viz-purple">{c.type}</span>
            {c.cons.map((k) => (
              <Badge key={k} variant={k.startsWith("PRIMARY") ? "active" : k.startsWith("CHECK") ? "warning" : k.startsWith("REF") ? "purple" : "outline"} className="text-[10px]">
                {k}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaVariant() {
  const [table, setTable] = useState("robots");
  const [preset, setPreset] = useState("ok");
  const [raw, setRaw] = useState(INSERT_PRESETS.robots.ok.v);
  const [data, setData] = useState({ robots: ROBOTS, telemetry: TELEMETRY });
  const [seq, setSeq] = useState({ robots: 5, telemetry: 11 });
  const [result, setResult] = useState(null);

  const pickTable = (t) => {
    setTable(t);
    setPreset("ok");
    setRaw(INSERT_PRESETS[t].ok.v);
    setResult(null);
  };
  const pickPreset = (p) => {
    setPreset(p);
    setRaw(INSERT_PRESETS[table][p].v);
    setResult(null);
  };
  const run = () => {
    const r = checkInsert(table, raw, data, seq[table]);
    if (r.burned) setSeq((s) => ({ ...s, [table]: s[table] + 1 }));
    if (!r.error) setData((d) => ({ ...d, [table]: [...d[table], r.row] }));
    setResult({ ...r, table });
  };
  const cols = SCHEMA[table].map((c) => c.name);
  const rows = data[table];
  const sqlCols = cols.filter((c) => c !== "id" && !(c === "recorded_at" && (raw[c] ?? "").trim() === ""));
  const lit = (c) => (isNull(raw[c] ?? "") ? "NULL" : SCHEMA[table].find((x) => x.name === c).type.match(/INT|REAL/) && /^[-+\d.]+$/.test(raw[c]) ? raw[c] : `'${raw[c]}'`);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={table} onValueChange={pickTable}>
          <TabsList>
            <TabsTrigger value="robots">INSERT INTO robots</TabsTrigger>
            <TabsTrigger value="telemetry">INSERT INTO telemetry</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={preset} onValueChange={pickPreset}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INSERT_PRESETS[table]).map(([k, p]) => (
              <SelectItem key={k} value={k}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => (setData({ robots: ROBOTS, telemetry: TELEMETRY }), setSeq({ robots: 5, telemetry: 11 }), setResult(null))}>
          <RotateCcw /> Reset tables
        </Button>
      </div>
      <Split>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SchemaCard name="robots" />
            <SchemaCard name="telemetry" />
          </div>
          <Grid cols={cols} rows={rows} tones={result && !result.error && result.table === table ? { [rows.length - 1]: "ok" } : {}} />
        </div>
        <div className="space-y-3">
          <Panel title="New row (type NULL for null)">
            <div className="grid grid-cols-2 gap-2">
              {SCHEMA[table]
                .filter((c) => c.name !== "id")
                .map((c) => (
                  <label key={c.name} className="space-y-1">
                    <span className="font-mono text-[11px] text-muted-foreground">{c.name}</span>
                    <input className={inputCls} value={raw[c.name] ?? ""} placeholder={c.name === "recorded_at" ? "DEFAULT now()" : ""} onChange={(e) => setRaw((r) => ({ ...r, [c.name]: e.target.value }))} spellCheck={false} />
                  </label>
                ))}
            </div>
            <pre className="code-body overflow-x-auto rounded-md bg-code p-2 text-[11.5px]">
              {`INSERT INTO ${table} (${sqlCols.join(", ")})\nVALUES (${sqlCols.map(lit).join(", ")});`}
            </pre>
            <Button size="sm" onClick={run}>
              <Play /> Execute INSERT
            </Button>
          </Panel>
          {result && (
            <Panel title="Constraint checks">
              <ol className="space-y-1">
                {result.checks.map((c, k) => (
                  <li key={k} className="flex items-center gap-2 text-[12.5px]">
                    <Badge variant={c.ok ? "success" : "danger"}>{c.ok ? "pass" : "fail"}</Badge>
                    <span className="font-mono">{c.name}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          <StatGrid cols={2}>
            <Stat label={`${table}_id_seq next`} value={seq[table]} tone="purple" hint="Failed inserts after nextval() still consume a sequence value — gaps in ids are normal." />
            <Stat label="rows" value={rows.length} />
          </StatGrid>
        </div>
      </Split>
      <Narration tone={!result ? "default" : result.error ? "bad" : "ok"}>
        {!result ? (
          "The schema is a contract: every INSERT must pass type parsing, NOT NULL, CHECK, UNIQUE and FOREIGN KEY checks or the whole row is rejected."
        ) : result.error ? (
          <span className="whitespace-pre-wrap font-mono text-[12.5px]">
            {result.error}
            {result.burned ? `\n-- note: id ${seq[table] - 1} was already taken from the sequence, so the next successful row skips it.` : ""}
          </span>
        ) : (
          `INSERT 0 1 — row id ${result.row.id} accepted into ${result.table}.`
        )}
      </Narration>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: queries (logical clause order)                             */
/* ------------------------------------------------------------------ */

const QUERIES = {
  hot: {
    label: "WHERE temp_c > 70",
    sql: ["SELECT id, robot_id, temp_c", "FROM telemetry", "WHERE temp_c > 70;"],
    from: "telemetry",
    where: { line: 2, text: "temp_c > 70", fn: (r) => r.temp_c > 70 },
    select: { line: 0, cols: ["id", "robot_id", "temp_c"] },
  },
  top: {
    label: "ORDER BY temp_c DESC LIMIT 3",
    sql: ["SELECT robot_id, temp_c, rpm", "FROM telemetry", "WHERE rpm > 0", "ORDER BY temp_c DESC", "LIMIT 3;"],
    from: "telemetry",
    where: { line: 2, text: "rpm > 0", fn: (r) => r.rpm > 0 },
    select: { line: 0, cols: ["robot_id", "temp_c", "rpm"] },
    order: { line: 3, col: "temp_c", desc: true },
    limit: { line: 4, n: 3 },
  },
  group: {
    label: "GROUP BY robot_id (COUNT, AVG)",
    sql: ["SELECT robot_id, COUNT(*) AS n, ROUND(AVG(temp_c), 1) AS avg_temp", "FROM telemetry", "GROUP BY robot_id", "ORDER BY robot_id;"],
    from: "telemetry",
    group: { line: 2, col: "robot_id" },
    select: { line: 0, cols: ["robot_id", "n", "avg_temp"], aggs: { n: (g) => g.length, avg_temp: (g) => Math.round((g.reduce((a, r) => a + r.temp_c, 0) / g.length) * 10) / 10 } },
    order: { line: 3, col: "robot_id" },
  },
  having: {
    label: "HAVING MAX(temp_c) > 85",
    sql: ["SELECT robot_id, MAX(temp_c) AS peak", "FROM telemetry", "WHERE recorded_at >= '08:05'", "GROUP BY robot_id", "HAVING MAX(temp_c) > 85", "ORDER BY peak DESC;"],
    from: "telemetry",
    where: { line: 2, text: "recorded_at >= '08:05'", fn: (r) => r.recorded_at >= "08:05" },
    group: { line: 3, col: "robot_id" },
    having: { line: 4, text: "MAX(temp_c) > 85", fn: (g) => Math.max(...g.map((r) => r.temp_c)) > 85 },
    select: { line: 0, cols: ["robot_id", "peak"], aggs: { peak: (g) => Math.max(...g.map((r) => r.temp_c)) } },
    order: { line: 5, col: "peak", desc: true },
  },
  nullEq: {
    label: "zone = NULL vs IS NULL",
    sql: ["SELECT serial, zone", "FROM robots", "WHERE zone = NULL;   -- always UNKNOWN!"],
    from: "robots",
    where: { line: 2, text: "zone = NULL", fn: () => false, unknown: true },
    select: { line: 0, cols: ["serial", "zone"] },
  },
  isNull: {
    label: "WHERE zone IS NULL",
    sql: ["SELECT serial, zone", "FROM robots", "WHERE zone IS NULL;"],
    from: "robots",
    where: { line: 2, text: "zone IS NULL", fn: (r) => r.zone === null },
    select: { line: 0, cols: ["serial", "zone"] },
  },
};

/** Pure: evaluate a query spec clause by clause in LOGICAL order. */
export function queryClauseSteps(q) {
  const base = q.from === "robots" ? ROBOTS : TELEMETRY;
  const allCols = Object.keys(base[0]);
  const fromLine = q.sql.findIndex((l) => l.startsWith("FROM"));
  const steps = [];
  let rows = base.map((r) => ({ ...r }));
  steps.push({ clause: "FROM", line: fromLine, cols: allCols, rows, note: `FROM ${q.from} runs first: ${rows.length} rows enter the pipeline.`, tone: "default" });
  if (q.where) {
    const keep = rows.map(q.where.fn);
    steps.push({
      clause: "WHERE", line: q.where.line, cols: allCols, rows,
      strike: Object.fromEntries(keep.map((k, i) => [i, !k])),
      tones: Object.fromEntries(keep.map((k, i) => [i, k ? "ok" : "bad"])),
      note: q.where.unknown
        ? "zone = NULL evaluates to UNKNOWN for every row (NULL is not equal to anything, even NULL), and WHERE keeps only TRUE → 0 rows."
        : `WHERE ${q.where.text} tests each row: ${keep.filter(Boolean).length} kept, ${keep.filter((k) => !k).length} discarded.`,
      tone: q.where.unknown ? "bad" : "active",
    });
    rows = rows.filter((_, i) => keep[i]);
  }
  let groups = null;
  if (q.group) {
    const keys = [...new Set(rows.map((r) => r[q.group.col]))].sort((a, b) => a - b);
    groups = keys.map((k) => ({ key: k, rows: rows.filter((r) => r[q.group.col] === k) }));
    const sorted = groups.flatMap((g) => g.rows);
    steps.push({
      clause: "GROUP BY", line: q.group.line, cols: allCols, rows: sorted,
      groups: Object.fromEntries(sorted.map((r, i) => [i, keys.indexOf(r[q.group.col])])),
      note: `GROUP BY ${q.group.col} buckets the rows into ${groups.length} groups (colored). Aggregates will collapse each bucket into one row.`,
      tone: "active",
    });
    if (q.having) {
      const keep = groups.map((g) => q.having.fn(g.rows));
      steps.push({
        clause: "HAVING", line: q.having.line, cols: allCols, rows: sorted,
        groups: Object.fromEntries(sorted.map((r, i) => [i, keys.indexOf(r[q.group.col])])),
        strike: Object.fromEntries(sorted.map((r, i) => [i, !keep[keys.indexOf(r[q.group.col])]])),
        note: `HAVING ${q.having.text} filters whole GROUPS (WHERE can't see aggregates): ${groups.filter((_, i) => !keep[i]).map((g) => `robot ${g.key}`).join(", ") || "none"} dropped.`,
        tone: "warn",
      });
      groups = groups.filter((_, i) => keep[i]);
    }
  }
  // SELECT projection / aggregates
  let out;
  if (groups) out = groups.map((g) => Object.fromEntries(q.select.cols.map((c) => [c, q.select.aggs?.[c] ? q.select.aggs[c](g.rows) : g.rows[0][c]])));
  else out = rows.map((r) => Object.fromEntries(q.select.cols.map((c) => [c, r[c]])));
  steps.push({ clause: "SELECT", line: q.select.line, cols: q.select.cols, rows: out, note: `SELECT is evaluated AFTER filtering/grouping: ${groups ? "each group collapses to one row with its aggregates" : `project ${q.select.cols.length} columns`}.`, tone: "active" });
  if (q.order) {
    const s = [...out].sort((a, b) => (q.order.desc ? b[q.order.col] - a[q.order.col] : a[q.order.col] - b[q.order.col]));
    out = s;
    steps.push({ clause: "ORDER BY", line: q.order.line, cols: q.select.cols, rows: out, note: `ORDER BY ${q.order.col}${q.order.desc ? " DESC" : ""} sorts the final rows (it can use SELECT aliases like "peak").`, tone: "active" });
  }
  if (q.limit) {
    steps.push({ clause: "LIMIT", line: q.limit.line, cols: q.select.cols, rows: out, strike: Object.fromEntries(out.map((_, i) => [i, i >= q.limit.n])), note: `LIMIT ${q.limit.n} keeps the first ${q.limit.n} rows of the sorted result.`, tone: "warn" });
    out = out.slice(0, q.limit.n);
  }
  steps.push({ clause: "RESULT", line: -1, cols: q.select.cols, rows: out, tones: Object.fromEntries(out.map((_, i) => [i, "ok"])), note: `Result: ${out.length} row(s).`, tone: out.length ? "ok" : "warn" });
  return steps;
}

const ORDER = ["FROM", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY", "LIMIT"];

function QueriesVariant() {
  const [qk, setQk] = useState("having");
  const q = QUERIES[qk];
  const steps = useMemo(() => queryClauseSteps(q), [q]);
  const st = useStepper(steps, { baseMs: 1300 });
  const step = st.step;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={qk} onValueChange={setQk}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUERIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-1">
          {ORDER.map((c, k) => (
            <span key={c} className="flex items-center gap-1">
              <Badge variant={step.clause === c ? "active" : steps.some((s) => s.clause === c) ? "outline" : "secondary"} className={cn(!steps.some((s) => s.clause === c) && "opacity-40")}>
                {c}
              </Badge>
              {k < ORDER.length - 1 && <span className="text-[10px] text-muted-foreground">→</span>}
            </span>
          ))}
        </div>
      </div>
      <Split>
        <div className="space-y-3">
          <Grid cols={step.cols} rows={step.rows} tones={step.tones} strike={step.strike} groups={step.groups} />
          <Narration tone={step.tone}>{step.note}</Narration>
        </div>
        <div className="space-y-3">
          <SqlView lines={q.sql} active={step.line} />
          <VarTable
            vars={[
              ["current clause", step.clause, "active"],
              ["rows in", step.rows.length],
              ["rows struck", Object.values(step.strike ?? {}).filter(Boolean).length, "bad"],
            ]}
          />
          <p className="text-[12px] leading-relaxed text-muted-foreground">You write SELECT first, but the engine evaluates FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.</p>
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: join (INNER / LEFT + ON DELETE)                            */
/* ------------------------------------------------------------------ */

/** Pure: nested-loop join steps. */
export function joinSteps(robots, tele, kind) {
  const steps = [];
  const result = [];
  const links = [];
  steps.push({ li: -1, links: [], result: [], note: `${kind} JOIN telemetry t ON t.robot_id = r.id — for each robot, find every telemetry row with a matching robot_id.`, tone: "default" });
  robots.forEach((r, li) => {
    const m = tele.map((t, ri) => [t, ri]).filter(([t]) => t.robot_id === r.id);
    for (const [t, ri] of m) {
      links.push([li, ri]);
      result.push({ serial: r.serial, model: r.model, temp_c: t.temp_c, recorded_at: t.recorded_at });
    }
    if (!m.length && kind === "LEFT") result.push({ serial: r.serial, model: r.model, temp_c: null, recorded_at: null });
    steps.push({
      li, links: [...links], cur: m.map(([, ri]) => ri), result: [...result],
      note: m.length
        ? `${r.serial} (id ${r.id}) matches ${m.length} telemetry row(s) → ${m.length} result row(s).`
        : kind === "LEFT"
          ? `${r.serial} (id ${r.id}) has NO telemetry. LEFT JOIN keeps it anyway, padding the right side with NULLs.`
          : `${r.serial} (id ${r.id}) has NO telemetry → INNER JOIN drops it.`,
      tone: m.length ? "ok" : kind === "LEFT" ? "warn" : "bad",
    });
  });
  steps.push({ li: -1, links, result, note: `${kind} JOIN produced ${result.length} rows (${tele.length} telemetry rows${kind === "LEFT" ? " + NULL-padded robots without readings" : ""}).`, tone: "ok", done: true });
  return steps;
}

function JoinDiagram({ robots, tele, step, deleting = [] }) {
  const W = 620, rowH = 22, top = 30;
  const H = top + Math.max(robots.length, tele.length) * rowH + 10;
  const ly = (i) => top + i * rowH + rowH / 2;
  const curSet = new Set(step?.cur ?? []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <text x={20} y={18} fontSize={11} fontWeight={700} fill={C.fg}>
        robots r
      </text>
      <text x={370} y={18} fontSize={11} fontWeight={700} fill={C.fg}>
        telemetry t
      </text>
      {(step?.links ?? []).map(([a, b], k) => (
        <line key={k} x1={232} y1={ly(a)} x2={368} y2={ly(b)} stroke={step.li === a ? C.active : C.ok} strokeWidth={step.li === a ? 2 : 1.2} opacity={step.li === a ? 1 : 0.5} />
      ))}
      {robots.map((r, i) => {
        const cur = step?.li === i;
        const del = deleting.includes(`r${r.id}`);
        const col = del ? C.bad : cur ? C.active : C.ink;
        return (
          <g key={r.id}>
            <rect x={18} y={ly(i) - 9} width={214} height={18} rx={4} fill={col} fillOpacity={cur || del ? 0.18 : 0.06} stroke={col} strokeOpacity={0.6} />
            <text x={26} y={ly(i) + 4} fontSize={11} fill={C.fg} textDecoration={del ? "line-through" : undefined}>
              id={r.id} {r.serial} · {r.model}
            </text>
          </g>
        );
      })}
      {tele.map((t, i) => {
        const cur = curSet.has(i);
        const del = deleting.includes(`t${t.id}`);
        const col = del ? C.bad : cur ? C.active : C.ink;
        return (
          <g key={t.id}>
            <rect x={368} y={ly(i) - 9} width={234} height={18} rx={4} fill={col} fillOpacity={cur || del ? 0.18 : 0.06} stroke={col} strokeOpacity={0.6} />
            <text x={376} y={ly(i) + 4} fontSize={11} fill={t.robot_id === null ? C.bad : C.fg} textDecoration={del ? "line-through" : undefined}>
              id={t.id} robot_id={show(t.robot_id)} {t.temp_c}°C
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Pure: what DELETE FROM robots WHERE id = X does under each ON DELETE policy. */
export function deleteRobot(data, id, policy) {
  const refs = data.telemetry.filter((t) => t.robot_id === id);
  if (!data.robots.some((r) => r.id === id)) return { data, msg: "DELETE 0", tone: "warn", removed: [] };
  if (policy === "RESTRICT" && refs.length)
    return { data, tone: "bad", removed: [], msg: `ERROR:  update or delete on table "robots" violates foreign key constraint "telemetry_robot_id_fkey" on table "telemetry"\nDETAIL:  Key (id)=(${id}) is still referenced from table "telemetry".` };
  if (policy === "SET NULL" && refs.length)
    return { data, tone: "bad", removed: [], msg: `ERROR:  null value in column "robot_id" of relation "telemetry" violates not-null constraint\n-- SET NULL needs a nullable FK column; robot_id is NOT NULL, so the whole DELETE rolls back.` };
  const next = { robots: data.robots.filter((r) => r.id !== id), telemetry: data.telemetry.filter((t) => t.robot_id !== id) };
  return {
    data: next, tone: refs.length ? "warn" : "ok",
    removed: [`r${id}`, ...refs.map((t) => `t${t.id}`)],
    msg: refs.length ? `DELETE 1 — and ON DELETE CASCADE silently removed ${refs.length} telemetry row(s): ids ${refs.map((t) => t.id).join(", ")}.` : "DELETE 1 — no telemetry referenced this robot, so every policy allows it.",
  };
}

function JoinVariant() {
  const [tab, setTab] = useState("INNER");
  const [data, setData] = useState({ robots: ROBOTS, telemetry: TELEMETRY });
  const [policy, setPolicy] = useState("CASCADE");
  const [target, setTarget] = useState("2");
  const [del, setDel] = useState(null);
  const steps = useMemo(() => joinSteps(data.robots, data.telemetry, tab === "LEFT" ? "LEFT" : "INNER"), [data, tab]);
  const st = useStepper(steps, { baseMs: 1100 });
  const isDelete = tab === "DELETE";
  const doDelete = () => {
    const r = deleteRobot(data, Number(target), policy);
    setDel({ ...r, before: data });
    setData(r.data);
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => (setTab(v), setDel(null))}>
          <TabsList>
            <TabsTrigger value="INNER">INNER JOIN</TabsTrigger>
            <TabsTrigger value="LEFT">LEFT JOIN</TabsTrigger>
            <TabsTrigger value="DELETE">ON DELETE</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => (setData({ robots: ROBOTS, telemetry: TELEMETRY }), setDel(null))}>
          <RotateCcw /> Reset data
        </Button>
      </div>
      {!isDelete ? (
        <>
          <Split>
            <div className="space-y-3">
              <Stage className="p-2">
                <JoinDiagram robots={data.robots} tele={data.telemetry} step={st.step} />
              </Stage>
              <Legend items={[[C.active, "current robot & its matches"], [C.ok, "matched pair (ON t.robot_id = r.id)"]]} />
              <Narration tone={st.step.tone}>{st.step.note}</Narration>
            </div>
            <div className="space-y-3">
              <SqlView lines={["SELECT r.serial, r.model, t.temp_c, t.recorded_at", "FROM robots r", `${tab} JOIN telemetry t`, "  ON t.robot_id = r.id;"]} active={[2, 3]} />
              <ScrollArea className="max-h-72" viewportClassName="max-h-72">
                <Grid cols={["serial", "model", "temp_c", "recorded_at"]} rows={st.step.result} tones={Object.fromEntries(st.step.result.map((r, i) => [i, r.temp_c === null ? "bad" : undefined]))} />
              </ScrollArea>
            </div>
          </Split>
          <PlaybackBar stepper={st} />
        </>
      ) : (
        <Split>
          <div className="space-y-3">
            <Stage className="p-2">
              <JoinDiagram robots={del?.removed.length ? del.before.robots : data.robots} tele={del?.removed.length ? del.before.telemetry : data.telemetry} step={{ links: data.robots.flatMap((r, i) => data.telemetry.map((t, j) => (t.robot_id === r.id ? [i, j] : null)).filter(Boolean)) }} deleting={del?.removed ?? []} />
            </Stage>
            <Narration tone={del?.tone ?? "default"}>
              <span className="whitespace-pre-wrap">{del ? del.msg : "Choose a policy and a robot, then run the DELETE. The foreign key decides what happens to telemetry that still points at it."}</span>
            </Narration>
          </div>
          <div className="space-y-3">
            <Panel title="Foreign key policy">
              <Select value={policy} onValueChange={(v) => (setPolicy(v), setDel(null))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTRICT">ON DELETE RESTRICT (default-like)</SelectItem>
                  <SelectItem value="CASCADE">ON DELETE CASCADE</SelectItem>
                  <SelectItem value="SET NULL">ON DELETE SET NULL</SelectItem>
                </SelectContent>
              </Select>
              <Select value={target} onValueChange={(v) => (setTarget(v), setDel(null))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROBOTS.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      robot id {r.id} ({r.serial})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="destructive" onClick={doDelete}>
                <Trash2 /> DELETE FROM robots WHERE id = {target}
              </Button>
            </Panel>
            <pre className="code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11.5px]">{`robot_id INTEGER NOT NULL\n  REFERENCES robots(id)\n  ON DELETE ${policy}`}</pre>
            <StatGrid cols={2}>
              <Stat label="robots" value={data.robots.length} />
              <Stat label="telemetry" value={data.telemetry.length} />
            </StatGrid>
          </div>
        </Split>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant: index (seq scan vs B-tree) + window functions              */
/* ------------------------------------------------------------------ */

const BT_KEYS = [3, 7, 12, 18, 21, 25, 31, 36, 42, 47, 53, 58, 64, 70, 77, 85];

/** Bulk-load a B+tree (max 3 entries per node). Returns levels root→leaves; nodes {keys, children?}. */
export function buildBPlus(keys, fan = 3) {
  let level = [];
  for (let i = 0; i < keys.length; i += fan) level.push({ keys: keys.slice(i, i + fan), min: keys[i] });
  const levels = [level];
  while (level.length > 1) {
    const up = [];
    for (let i = 0; i < level.length; i += fan) {
      const ch = level.slice(i, i + fan).map((n, k) => i + k);
      up.push({ keys: ch.slice(1).map((c) => level[c].min), children: ch, min: level[ch[0]].min });
    }
    levels.unshift(up);
    level = up;
  }
  return levels;
}

/** Pure: steps descending the tree for `target`. */
export function btreeSearch(levels, target) {
  const steps = [];
  let node = 0;
  for (let d = 0; d < levels.length; d++) {
    const n = levels[d][node];
    if (n.children) {
      const idx = n.keys.filter((k) => k <= target).length;
      steps.push({ depth: d, node, note: `Page ${d + 1} (internal): compare ${target} with [${n.keys.join(", ")}] → follow child ${idx + 1}.`, tone: "active" });
      node = n.children[idx];
    } else {
      const found = n.keys.includes(target);
      steps.push({ depth: d, node, found, note: found ? `Leaf page: ${target} found → fetch its heap row. ${d + 1} pages read in total.` : `Leaf page [${n.keys.join(", ")}]: ${target} is not here → no rows. Still only ${d + 1} pages read.`, tone: found ? "ok" : "warn" });
    }
  }
  return steps;
}

function BTreeSvg({ levels, step, path, target }) {
  const W = 620, lh = 62;
  const H = levels.length * lh + 14;
  const pos = levels.map((lv) => lv.map((_, i) => ((i + 0.5) * W) / lv.length));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {levels.map((lv, d) =>
        lv.map((n, i) =>
          (n.children ?? []).map((c) => {
            const on = path.some((p) => p.depth === d && p.node === i) && path.some((p) => p.depth === d + 1 && p.node === c);
            return <line key={`${d}-${i}-${c}`} x1={pos[d][i]} y1={d * lh + 36} x2={pos[d + 1][c]} y2={(d + 1) * lh + 12} stroke={on ? C.active : C.grid} strokeWidth={on ? 2 : 1} />;
          })
        )
      )}
      {levels.map((lv, d) =>
        lv.map((n, i) => {
          const w = Math.min(n.keys.length * 24 + 12, W / lv.length - 6);
          const onPath = path.some((p) => p.depth === d && p.node === i);
          const cur = step && step.depth === d && step.node === i;
          const col = cur ? (step.found === false ? C.warn : step.found ? C.ok : C.active) : onPath ? C.active : C.ink;
          return (
            <g key={`${d}-${i}`}>
              <rect x={pos[d][i] - w / 2} y={d * lh + 12} width={w} height={24} rx={5} fill={col} fillOpacity={cur ? 0.2 : onPath ? 0.1 : 0.04} stroke={col} strokeWidth={cur ? 2 : 1} />
              {n.keys.map((k, j) => (
                <text key={k} x={pos[d][i] - w / 2 + 6 + j * 24 + 12} y={d * lh + 28} textAnchor="middle" fontSize={11} fill={!n.children && k === target && cur ? C.ok : C.fg} fontWeight={!n.children && k === target ? 700 : 400}>
                  {k}
                </text>
              ))}
            </g>
          );
        })
      )}
    </svg>
  );
}

const WINDOW_FNS = {
  row_number: { label: "ROW_NUMBER() OVER (PARTITION BY robot_id ORDER BY temp_c DESC)", col: "rn" },
  rank: { label: "RANK() OVER (ORDER BY temp_c DESC)", col: "rank" },
  lag: { label: "temp_c - LAG(temp_c) OVER (PARTITION BY robot_id ORDER BY recorded_at)", col: "delta" },
  running: { label: "SUM(rpm) OVER (PARTITION BY robot_id ORDER BY recorded_at)", col: "running_rpm" },
};

/** Pure: compute a window column without collapsing rows. */
export function windowColumn(rows, fn) {
  const out = rows.map((r) => ({ ...r }));
  const parts = {};
  for (const r of out) (parts[fn === "rank" ? "all" : r.robot_id] ??= []).push(r);
  for (const p of Object.values(parts)) {
    if (fn === "row_number") [...p].sort((a, b) => b.temp_c - a.temp_c).forEach((r, i) => (r.rn = i + 1));
    if (fn === "rank") {
      const s = [...p].sort((a, b) => b.temp_c - a.temp_c);
      s.forEach((r, i) => (r.rank = i > 0 && s[i - 1].temp_c === r.temp_c ? s[i - 1].rank : i + 1));
    }
    if (fn === "lag") [...p].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).forEach((r, i, s) => (r.delta = i ? Math.round((r.temp_c - s[i - 1].temp_c) * 10) / 10 : null));
    if (fn === "running") {
      let acc = 0;
      [...p].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).forEach((r) => (r.running_rpm = acc += r.rpm));
    }
  }
  return out.sort((a, b) => a.robot_id - b.robot_id || a.recorded_at.localeCompare(b.recorded_at));
}

function IndexVariant() {
  const [tab, setTab] = useState("index");
  const [exp, setExp] = useState(5);
  const [target, setTarget] = useState(42);
  const [wfn, setWfn] = useState("row_number");
  const levels = useMemo(() => buildBPlus(BT_KEYS), []);
  const steps = useMemo(() => [{ depth: -1, node: -1, note: `SELECT * FROM telemetry WHERE robot_id = ${target}; — with idx_telemetry_robot_id the planner descends the B-tree from the root.`, tone: "default" }, ...btreeSearch(levels, target)], [levels, target]);
  const st = useStepper(steps, { baseMs: 1000 });
  const path = steps.slice(1, st.i + 1);
  const N = Math.round(10 ** exp);
  const matches = Math.max(1, Math.round(N / 1000));
  const fanout = 300;
  const height = Math.max(1, Math.ceil(Math.log(N) / Math.log(fanout)));
  const seqMs = N * 0.00032;
  const idxMs = height * 0.01 + matches * 0.003;
  const fmtN = (v) => v.toLocaleString("en-US");

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="index">Seq Scan vs Index Scan</TabsTrigger>
          <TabsTrigger value="window">Window functions</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "index" ? (
        <>
          <Split>
            <div className="space-y-3">
              <Stage className="p-2">
                <BTreeSvg levels={levels} step={st.i > 0 ? st.step : null} path={path} target={target} />
              </Stage>
              <Narration tone={st.step.tone}>{st.step.note}</Narration>
              <PlaybackBar stepper={st} />
            </div>
            <div className="space-y-3">
              <Panel title="Query">
                <SliderControl label="search robot_id =" value={target} min={1} max={90} onChange={setTarget} />
                <SliderControl label="table size (rows)" value={exp} min={3} max={8} step={0.5} format={() => fmtN(N)} onChange={setExp} />
              </Panel>
              <StatGrid cols={2}>
                <Stat label="Seq Scan examines" value={fmtN(N)} tone="bad" />
                <Stat label="Index Scan reads" value={`${height} pages + ${fmtN(matches)}`} tone="ok" hint={`B-tree height ≈ ⌈log_${fanout}(N)⌉ with ~${fanout} keys per 8 KB page`} />
                <Stat label="seq time (est.)" value={`${seqMs < 1 ? seqMs.toFixed(2) : seqMs.toFixed(0)} ms`} />
                <Stat label="index time (est.)" value={`${idxMs.toFixed(2)} ms`} tone="ok" />
              </StatGrid>
            </div>
          </Split>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Before: no index</div>
              <pre className="code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11.5px]">{`EXPLAIN ANALYZE SELECT * FROM telemetry WHERE robot_id = ${target};

Seq Scan on telemetry  (cost=0.00..${fmtN(Math.round(N * 0.0185 + N * 0.0025))}.00 rows=${fmtN(matches)})
  Filter: (robot_id = ${target})
  Rows Removed by Filter: ${fmtN(N - matches)}
Execution Time: ${seqMs.toFixed(2)} ms`}</pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">After: CREATE INDEX idx_telemetry_robot_id</div>
              <pre className="code-body overflow-x-auto rounded-lg border bg-code p-2 text-[11.5px]">{`CREATE INDEX idx_telemetry_robot_id ON telemetry (robot_id);

Index Scan using idx_telemetry_robot_id on telemetry
    (cost=0.${height}..${(height * 4 + matches * 0.04).toFixed(2)} rows=${fmtN(matches)})
  Index Cond: (robot_id = ${target})
Execution Time: ${idxMs.toFixed(2)} ms`}</pre>
            </div>
          </div>
        </>
      ) : (
        <Split>
          <div className="space-y-3">
            <Grid cols={["robot_id", "recorded_at", "temp_c", "rpm", WINDOW_FNS[wfn].col]} rows={windowColumn(TELEMETRY, wfn)} groups={Object.fromEntries(windowColumn(TELEMETRY, wfn).map((r, i) => [i, wfn === "rank" ? undefined : r.robot_id - 1]))} />
          </div>
          <div className="space-y-3">
            <Select value={wfn} onValueChange={setWfn}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WINDOW_FNS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SqlView lines={["SELECT robot_id, recorded_at, temp_c, rpm,", `  ${WINDOW_FNS[wfn].label}`, `    AS ${WINDOW_FNS[wfn].col}`, "FROM telemetry;"]} active={[1, 2]} />
            <Narration>
              {wfn === "rank"
                ? "One partition (no PARTITION BY): every row is ranked against all others. Unlike GROUP BY, no rows are collapsed."
                : "Colored bands are partitions (one per robot_id). The window function is computed within each band while every original row is kept."}
            </Narration>
          </div>
        </Split>
      )}
    </>
  );
}

const META = {
  schema: {
    title: "Tables & Constraints — robots / telemetry",
    description: "Typed columns plus NOT NULL, UNIQUE, CHECK and FOREIGN KEY constraints. Try inserting rows that break the contract and read the exact PostgreSQL error.",
    badges: ["CREATE TABLE", "constraints"],
  },
  queries: {
    title: "SQL Query Clause Stepper",
    description: "Pick a query and watch rows flow through FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT, computed live over sample telemetry.",
    badges: ["SELECT", "GROUP BY", "HAVING"],
  },
  join: {
    title: "JOINs & Foreign Keys",
    description: "INNER vs LEFT JOIN as a nested loop with matching lines, then see how ON DELETE CASCADE / RESTRICT / SET NULL protect referential integrity.",
    badges: ["INNER JOIN", "LEFT JOIN", "ON DELETE"],
  },
  index: {
    title: "Indexes, EXPLAIN & Window Functions",
    description: "Seq Scan touches every row; a B-tree index descends a few pages. Step through the search path, scale the table, and compare EXPLAIN output.",
    badges: ["B-tree", "EXPLAIN ANALYZE", "OVER (...)"],
  },
};

export default function SqlLab({ variant = "schema" }) {
  const m = META[variant] ?? META.schema;
  return (
    <LabShell title={m.title} description={m.description} badges={m.badges}>
      {variant === "queries" ? <QueriesVariant /> : variant === "join" ? <JoinVariant /> : variant === "index" ? <IndexVariant /> : <SchemaVariant />}
    </LabShell>
  );
}
