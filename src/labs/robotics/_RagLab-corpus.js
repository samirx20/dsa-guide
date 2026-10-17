// Deterministic toy corpus + "embedding model" for RagLab.
// Each vector has 8 human-readable concept dimensions + 1 "other" noise dim (real models use ~1536 unlabeled ones).

export const DIMS = ["pump", "compressor", "robot", "vibration", "thermal", "seal/leak", "electrical", "safety", "other"];

const STOP = new Set(["the", "is", "a", "an", "of", "to", "and", "or", "on", "in", "at", "for", "my", "it", "why", "what", "how", "should", "i", "be", "too", "this", "that", "what's", "whats", "with", "are", "do", "does", "can", "before", "often", "change"]);

const LEXICON = {
  pump: ["pump", "impeller", "centrifugal", "p101", "casing"],
  compressor: ["compressor", "c201", "oil", "air", "discharge"],
  robot: ["robot", "arm", "joint", "servo", "r7", "gripper", "cell"],
  vibration: ["vibration", "vibrating", "bearing", "bearings", "misaligned", "misalignment", "coupling", "noise", "shaking", "shake", "rattle", "rattling", "mm/s"],
  thermal: ["temperature", "overheating", "overheat", "hot", "heat", "thermal", "cooling", "coolant", "fan", "°c"],
  "seal/leak": ["seal", "seals", "leak", "leaks", "leaking", "gasket", "drip", "dripping"],
  electrical: ["motor", "current", "voltage", "encoder", "electrical", "fuse", "power", "amps", "cable"],
  safety: ["safety", "lockout", "tagout", "emergency", "e-stop", "hazard", "ppe", "shutdown", "servicing", "maintenance"],
};

export const CHUNKS = [
  { id: 1, text: "Replace the mechanical seal on pump P101 every 5000 hours.", v: [0.9, 0, 0, 0, 0, 0.8, 0, 0.1, 0.1], meta: { machine_id: "P101", asset_type: "pump", section_type: "maintenance", date: "2025-01-10", severity: "low", source_file: "pump_manual.pdf", page: 12 } },
  { id: 2, text: "P101 vibration threshold is 5 mm/s peak; above this, inspect the bearings.", v: [0.8, 0, 0, 0.9, 0, 0, 0, 0.1, 0.1], meta: { machine_id: "P101", asset_type: "pump", section_type: "specifications", date: "2025-01-10", severity: "medium", source_file: "pump_manual.pdf", page: 8 } },
  { id: 3, text: "High vibration on P101 is usually caused by a misaligned coupling.", v: [0.7, 0, 0, 0.9, 0, 0, 0.1, 0, 0.1], meta: { machine_id: "P101", asset_type: "pump", section_type: "troubleshooting", date: "2025-06-02", severity: "high", source_file: "pump_troubleshooting.txt", page: 3 } },
  { id: 4, text: "If the pump casing exceeds 80°C, check the cooling water flow.", v: [0.7, 0, 0, 0, 0.9, 0, 0, 0.2, 0.1], meta: { machine_id: "P101", asset_type: "pump", section_type: "troubleshooting", date: "2025-06-02", severity: "medium", source_file: "pump_troubleshooting.txt", page: 5 } },
  { id: 5, text: "Compressor C201 oil change interval is 10000 hours.", v: [0, 0.9, 0, 0, 0, 0, 0, 0.1, 0.1], meta: { machine_id: "C201", asset_type: "compressor", section_type: "maintenance", date: "2024-11-20", severity: "low", source_file: "compressor_manual.txt", page: 14 } },
  { id: 6, text: "C201 discharge temperature above 110°C triggers an automatic shutdown.", v: [0, 0.8, 0, 0, 0.8, 0, 0.1, 0.5, 0.1], meta: { machine_id: "C201", asset_type: "compressor", section_type: "safety", date: "2024-11-20", severity: "high", source_file: "compressor_manual.txt", page: 3 } },
  { id: 7, text: "Compressor air leaks are found by spraying soapy water on the fittings.", v: [0, 0.8, 0, 0, 0, 0.7, 0, 0, 0.1], meta: { machine_id: "C201", asset_type: "compressor", section_type: "troubleshooting", date: "2025-03-15", severity: "low", source_file: "compressor_manual.txt", page: 22 } },
  { id: 8, text: "Robot arm R7 joint 3 servo overheating: reduce the duty cycle and check the fan.", v: [0, 0, 0.9, 0, 0.8, 0, 0.4, 0, 0.1], meta: { machine_id: "R7", asset_type: "robot", section_type: "troubleshooting", date: "2025-08-01", severity: "high", source_file: "r7_service.pdf", page: 41 } },
  { id: 9, text: "R7 encoder faults show up as position jumps; reseat the encoder cable.", v: [0, 0, 0.8, 0, 0, 0, 0.9, 0, 0.1], meta: { machine_id: "R7", asset_type: "robot", section_type: "troubleshooting", date: "2025-08-01", severity: "medium", source_file: "r7_service.pdf", page: 44 } },
  { id: 10, text: "Before servicing any robot cell, apply lockout/tagout and verify zero energy.", v: [0, 0, 0.6, 0, 0, 0, 0.3, 0.95, 0.1], meta: { machine_id: "R7", asset_type: "robot", section_type: "safety", date: "2025-02-12", severity: "critical", source_file: "r7_service.pdf", page: 2 } },
  { id: 11, text: "Gripper vibration on R7 indicates worn linear bearings.", v: [0, 0, 0.8, 0.8, 0, 0, 0, 0, 0.1], meta: { machine_id: "R7", asset_type: "robot", section_type: "troubleshooting", date: "2025-08-01", severity: "medium", source_file: "r7_service.pdf", page: 47 } },
  { id: 12, text: "Pump motor current above 42 A means the impeller may be clogged.", v: [0.8, 0, 0, 0, 0.1, 0, 0.8, 0, 0.1], meta: { machine_id: "P101", asset_type: "pump", section_type: "troubleshooting", date: "2025-06-02", severity: "medium", source_file: "pump_troubleshooting.txt", page: 7 } },
  { id: 13, text: "Emergency stop buttons must be tested monthly on every machine.", v: [0.1, 0.1, 0.1, 0, 0, 0, 0.2, 0.95, 0.1], meta: { machine_id: "ALL", asset_type: "plant", section_type: "safety", date: "2024-09-01", severity: "critical", source_file: "plant_safety.pdf", page: 1 } },
  { id: 14, text: "Coolant leaks under the compressor usually come from a cracked gasket.", v: [0, 0.8, 0, 0, 0.3, 0.8, 0, 0, 0.1], meta: { machine_id: "C201", asset_type: "compressor", section_type: "troubleshooting", date: "2025-03-15", severity: "medium", source_file: "compressor_manual.txt", page: 25 } },
];

export const QUERY_PRESETS = [
  "Why is the pump shaking?",
  "robot motor is too hot",
  "how often should I change the seal",
  "safety procedure before maintenance",
  "compressor is leaking",
  "what's for lunch today",
];

export const norm = (v) => Math.hypot(...v);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cosine = (a, b) => {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
};

/** Toy embedding: concept keywords → 8 named dims; any other content word adds to an "other" dim (noise). */
export function embed(text) {
  const words = text.toLowerCase().match(/[a-z0-9°/'\-]+/g) ?? [];
  const hits = words.filter((w) => DIMS.slice(0, 8).some((d) => LEXICON[d].includes(w)));
  const other = words.filter((w) => !hits.includes(w) && !STOP.has(w)).length;
  const v = DIMS.map((d, i) => (i === 8 ? 0.05 + 0.25 * other : words.filter((w) => LEXICON[d].includes(w)).length));
  return { v, hits };
}

/** Rank all chunks by cosine similarity to the query. */
export function search(query, chunks = CHUNKS) {
  const { v, hits } = embed(query);
  return { qv: v, hits, ranked: chunks.map((c) => ({ ...c, score: cosine(v, c.v) })).sort((a, b) => b.score - a.score) };
}

/** 2-component PCA via power iteration (deterministic). */
export function pca2(vectors) {
  const n = vectors.length;
  const d = vectors[0].length;
  const mean = Array.from({ length: d }, (_, j) => vectors.reduce((s, v) => s + v[j], 0) / n);
  const X = vectors.map((v) => v.map((x, j) => x - mean[j]));
  const cov = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) / n));
  const comps = [];
  let M = cov.map((r) => [...r]);
  for (let c = 0; c < 2; c++) {
    let b = Array.from({ length: d }, (_, i) => 1 / (i + 1 + c));
    for (let it = 0; it < 200; it++) {
      const nb = M.map((r) => dot(r, b));
      const L = norm(nb) || 1;
      b = nb.map((x) => x / L);
    }
    const lambda = dot(b, M.map((r) => dot(r, b)));
    comps.push(b);
    M = M.map((r, i) => r.map((x, j) => x - lambda * b[i] * b[j]));
  }
  const project = (v) => comps.map((c) => dot(c, v.map((x, j) => x - mean[j])));
  return { project, comps };
}

export const MANUAL = `Pump P101 Maintenance Manual

Section 1: Installation
Mount the pump base plate on a level concrete pad. Align the motor and pump shafts with a dial indicator. Misalignment above 0.05 mm causes vibration and early bearing failure.

Section 2: Operation
Prime the casing before start-up. Never run the pump dry, even for a few seconds. Normal casing temperature is 40-70°C. If it exceeds 80°C, check the cooling water flow.

Section 3: Maintenance
Replace the mechanical seal every 5000 hours. Re-grease the bearings every 2000 hours with lithium grease. Inspect the coupling for wear during every seal change. Record vibration readings weekly; the alarm threshold is 7.1 mm/s RMS.`;
