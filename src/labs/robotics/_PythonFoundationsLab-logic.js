// Pure helpers for PythonFoundationsLab: tiny Python-literal + JSON parsers that keep int vs float,
// Python repr(), a mypy-like assignability check, and the log-line validation pipeline.

/* ------------------------------------------------------------------ */
/* Python values                                                       */
/* ------------------------------------------------------------------ */
// value node: { t: "int"|"float"|"str"|"bool"|"None"|"list"|"dict", v }

export function pyRepr(n) {
  if (!n) return "None";
  switch (n.t) {
    case "int":
      return String(n.v);
    case "float": {
      if (!Number.isFinite(n.v)) return n.v > 0 ? "inf" : n.v < 0 ? "-inf" : "nan";
      const s = String(n.v);
      return /[.e]/.test(s) ? s : s + ".0";
    }
    case "str":
      return "'" + n.v.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    case "bool":
      return n.v ? "True" : "False";
    case "None":
      return "None";
    case "list":
      return "[" + n.v.map(pyRepr).join(", ") + "]";
    case "dict":
      return "{" + n.v.map(([k, v]) => `${pyRepr({ t: "str", v: k })}: ${pyRepr(v)}`).join(", ") + "}";
    default:
      return "?";
  }
}

export function jsonDumps(n) {
  switch (n.t) {
    case "int":
      return String(n.v);
    case "float":
      return pyRepr(n);
    case "str":
      return JSON.stringify(n.v);
    case "bool":
      return n.v ? "true" : "false";
    case "None":
      return "null";
    case "list":
      return "[" + n.v.map(jsonDumps).join(", ") + "]";
    case "dict":
      return "{" + n.v.map(([k, v]) => `${JSON.stringify(k)}: ${jsonDumps(v)}`).join(", ") + "}";
    default:
      return "null";
  }
}

export const pyTypeName = (n) => (n.t === "None" ? "None" : n.t);

/** Parse a comma-separated list of Python literal arguments: 2, "hi", None, 3.5, True */
export function parseArgs(src) {
  const out = [];
  let i = 0;
  const s = src.trim();
  if (!s) return { args: [] };
  while (i < s.length) {
    while (s[i] === " ") i++;
    let tok;
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      let j = i + 1;
      let v = "";
      while (j < s.length && s[j] !== q) v += s[j++];
      if (j >= s.length) return { error: "SyntaxError: unterminated string literal" };
      tok = { t: "str", v };
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== ",") j++;
      const raw = s.slice(i, j).trim();
      i = j;
      if (raw === "None") tok = { t: "None", v: null };
      else if (raw === "True" || raw === "False") tok = { t: "bool", v: raw === "True" };
      else if (/^[-+]?\d+$/.test(raw)) tok = { t: "int", v: parseInt(raw, 10) };
      else if (/^[-+]?(\d+\.\d*|\.\d+|\d+(\.\d*)?e[-+]?\d+)$/i.test(raw)) tok = { t: "float", v: parseFloat(raw) };
      else return { error: `NameError / SyntaxError near '${raw || ","}'` };
    }
    out.push(tok);
    while (s[i] === " ") i++;
    if (i < s.length) {
      if (s[i] !== ",") return { error: "SyntaxError: invalid syntax" };
      i++;
    }
  }
  return { args: out };
}

/* ------------------------------------------------------------------ */
/* Static types (mypy-ish)                                             */
/* ------------------------------------------------------------------ */
// type: { k: "int"|"float"|"str"|"None"|"bool"|"any" } | { k: "union", of: [...] } | { k: "lit", vals: [node] }

export function typeName(T) {
  if (T.k === "union") return T.of.map(typeName).join(" | ");
  if (T.k === "lit") return `Literal[${T.vals.map(pyRepr).join(", ")}]`;
  return T.k;
}

/** mypy's view of a literal argument expression's type. */
export function argTypeName(n, T) {
  if (T && T.k === "lit") return `Literal[${pyRepr(n)}]`;
  return pyTypeName(n);
}

export function assignable(n, T) {
  switch (T.k) {
    case "any":
      return true;
    case "int":
      return n.t === "int" || n.t === "bool";
    case "float":
      return n.t === "float" || n.t === "int" || n.t === "bool"; // PEP 484 numeric promotion
    case "str":
      return n.t === "str";
    case "bool":
      return n.t === "bool";
    case "None":
      return n.t === "None";
    case "union":
      return T.of.some((u) => assignable(n, u));
    case "lit":
      return T.vals.some((v) => v.t === n.t && v.v === n.v);
    default:
      return false;
  }
}

/** Does a runtime value actually match the declared return type? (isinstance semantics) */
export function runtimeMatches(n, T) {
  if (T.k === "float") return n.t === "float" || n.t === "int";
  return assignable(n, T);
}

/* ------------------------------------------------------------------ */
/* JSON parser (json.loads semantics, keeps int vs float)               */
/* ------------------------------------------------------------------ */
export class JSONDecodeError extends Error {
  constructor(msg, src, pos) {
    const before = src.slice(0, pos);
    const line = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    super(`${msg}: line ${line} column ${col} (char ${pos})`);
    this.pos = pos;
  }
}

export function jsonLoads(src) {
  let i = 0;
  const ws = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const fail = (m, p = i) => {
    throw new JSONDecodeError(m, src, p);
  };
  function value() {
    ws();
    const c = src[i];
    if (c === "{") return obj();
    if (c === "[") return arr();
    if (c === '"') return { t: "str", v: str() };
    if (src.startsWith("true", i)) return (i += 4), { t: "bool", v: true };
    if (src.startsWith("false", i)) return (i += 5), { t: "bool", v: false };
    if (src.startsWith("null", i)) return (i += 4), { t: "None", v: null };
    if (src.startsWith("NaN", i)) return (i += 3), { t: "float", v: NaN };
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?/.exec(src.slice(i));
    if (m && m[0].length) {
      i += m[0].length;
      return m[2] || m[3] ? { t: "float", v: parseFloat(m[0]) } : { t: "int", v: parseInt(m[0], 10) };
    }
    fail("Expecting value");
  }
  function str() {
    const start = i;
    i++;
    let out = "";
    while (i < src.length && src[i] !== '"') {
      if (src[i] === "\\") {
        const e = src[i + 1];
        const map = { n: "\n", t: "\t", '"': '"', "\\": "\\", "/": "/", r: "\r", b: "\b", f: "\f" };
        if (e === "u") {
          out += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
          i += 6;
          continue;
        }
        if (!(e in map)) fail("Invalid \\escape", i);
        out += map[e];
        i += 2;
        continue;
      }
      if (src[i] === "\n") fail("Invalid control character at", i);
      out += src[i++];
    }
    if (i >= src.length) fail("Unterminated string starting at", start);
    i++;
    return out;
  }
  function obj() {
    i++;
    const items = [];
    ws();
    if (src[i] === "}") return i++, { t: "dict", v: items };
    for (;;) {
      ws();
      if (src[i] !== '"') fail("Expecting property name enclosed in double quotes");
      const k = str();
      ws();
      if (src[i] !== ":") fail("Expecting ':' delimiter");
      i++;
      const v = value();
      const dup = items.findIndex(([kk]) => kk === k);
      if (dup >= 0) items.splice(dup, 1);
      items.push([k, v]);
      ws();
      if (src[i] === ",") {
        i++;
        ws();
        if (src[i] === "}") fail("Illegal trailing comma before end of object");
        continue;
      }
      if (src[i] === "}") return i++, { t: "dict", v: items };
      fail("Expecting ',' delimiter");
    }
  }
  function arr() {
    i++;
    const items = [];
    ws();
    if (src[i] === "]") return i++, { t: "list", v: items };
    for (;;) {
      items.push(value());
      ws();
      if (src[i] === ",") {
        i++;
        ws();
        if (src[i] === "]") fail("Illegal trailing comma before end of array");
        continue;
      }
      if (src[i] === "]") return i++, { t: "list", v: items };
      fail("Expecting ',' delimiter");
    }
  }
  const v = value();
  ws();
  if (i < src.length) fail("Extra data");
  return v;
}

/* ------------------------------------------------------------------ */
/* Field validation (dataclass / TypedDict boundary)                   */
/* ------------------------------------------------------------------ */
/**
 * Validate one field. spec: { name, type: "str"|"float"|"lit", vals?, range?: [lo, hi], default? }
 * Returns { status: "ok"|"coerced"|"rejected"|"default", out?: node, msg }
 */
export function checkField(spec, node, strict) {
  if (node === undefined) {
    if ("default" in spec) return { status: "default", out: spec.default, msg: `missing → default ${pyRepr(spec.default)}` };
    return { status: "rejected", msg: `missing required field '${spec.name}'` };
  }
  let out = node;
  let status = "ok";
  let msg = "";
  if (spec.type === "float") {
    if (node.t === "float") out = node;
    else if (node.t === "int") {
      out = { t: "float", v: node.v };
      msg = "int → float (always safe)";
    } else if (node.t === "str" && !strict && /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(node.v)) {
      out = { t: "float", v: parseFloat(node.v) };
      status = "coerced";
      msg = `str ${pyRepr(node)} coerced → ${pyRepr(out)}`;
    } else return { status: "rejected", msg: `expected float, got ${pyTypeName(node)} ${pyRepr(node)}` };
    if (spec.range && (out.v < spec.range[0] || out.v > spec.range[1])) return { status: "rejected", msg: `${pyRepr(out)} out of range [${spec.range[0]}, ${spec.range[1]}]` };
  } else if (spec.type === "str") {
    if (node.t === "str") out = node;
    else if (!strict && (node.t === "int" || node.t === "float")) {
      out = { t: "str", v: pyRepr(node) };
      status = "coerced";
      msg = `${pyTypeName(node)} coerced → ${pyRepr(out)}`;
    } else return { status: "rejected", msg: `expected str, got ${pyTypeName(node)} ${pyRepr(node)}` };
  } else if (spec.type === "lit") {
    if (!spec.vals.includes(node.v) || node.t !== "str") return { status: "rejected", msg: `${pyRepr(node)} not in Literal[${spec.vals.map((v) => `'${v}'`).join(", ")}]` };
  }
  return { status, out, msg };
}

/** Run a dict node through a schema: returns per-field results + extras + ok flag. */
export function validateRecord(schema, dict, strict) {
  const map = Object.fromEntries(dict.v);
  const fields = schema.map((f) => ({ spec: f, input: map[f.name], ...checkField(f, map[f.name], strict) }));
  const extras = dict.v.filter(([k]) => !schema.some((f) => f.name === k));
  const ok = fields.every((f) => f.status !== "rejected");
  return { fields, extras, ok };
}

/* ------------------------------------------------------------------ */
/* JSON-lines log pipeline (project)                                   */
/* ------------------------------------------------------------------ */
export const LOG_SCHEMA = [
  { name: "timestamp", type: "str" },
  { name: "sensor_id", type: "str" },
  { name: "temperature", type: "float", range: [-50, 200] },
  { name: "pressure", type: "float", range: [0, 500] },
  { name: "status", type: "lit", vals: ["ok", "warning", "critical"] },
];

/**
 * Process one log line. stage reached: 1 read, 2 json.loads, 3 schema/types, 4 range, 5 LogRecord.
 */
export function processLine(line, lineNo, strict) {
  if (!line.trim()) return { lineNo, line, stage: 1, ok: false, skip: true, reason: "blank line skipped" };
  let node;
  try {
    node = jsonLoads(line);
  } catch (e) {
    return { lineNo, line, stage: 2, ok: false, reason: `JSONDecodeError: ${e.message}` };
  }
  if (node.t !== "dict") return { lineNo, line, stage: 3, ok: false, reason: `expected JSON object, got ${pyTypeName(node)}` };
  const typeOnly = LOG_SCHEMA.map((f) => ({ ...f, range: undefined }));
  const v1 = validateRecord(typeOnly, node, strict);
  if (!v1.ok) {
    const bad = v1.fields.find((f) => f.status === "rejected");
    return { lineNo, line, stage: 3, ok: false, reason: `${bad.spec.name}: ${bad.msg}`, field: bad.spec.name };
  }
  const v2 = validateRecord(LOG_SCHEMA, node, strict);
  if (!v2.ok) {
    const bad = v2.fields.find((f) => f.status === "rejected");
    return { lineNo, line, stage: 4, ok: false, reason: `${bad.spec.name}: ${bad.msg}`, field: bad.spec.name };
  }
  const rec = Object.fromEntries(v2.fields.map((f) => [f.spec.name, f.out]));
  const coerced = v2.fields.filter((f) => f.status === "coerced").map((f) => f.spec.name);
  return { lineNo, line, stage: 5, ok: true, rec, coerced };
}
