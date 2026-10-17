// Scans robotics/ and dsa/ markdown and writes src/generated/manifest.json:
// tracks -> phases -> topics -> chapters (+ LeetCode problems from DSA.js).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { plain } from "../src/lib/parse.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

const num = (s, re) => {
  const m = s.match(re);
  return m ? Number(m[1]) : null;
};

function headings(md) {
  let inFence = false;
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) out.push({ depth: m[1].length, text: m[2].trim() });
  }
  return out;
}

const stripMd = plain;

function chapterTitle(file, hs, indexText) {
  if (indexText) return indexText;
  const h2 = hs.find((h) => h.depth === 2 && !/Interactive Visualization/i.test(h.text));
  const h1 = hs.find((h) => h.depth === 1);
  const raw = (h2 || h1)?.text ?? file;
  return stripMd(raw.replace(/^(Chapter|Project)\s*\d*\s*[:—-]\s*/i, "").replace(/^Part \d+,?\s*Topic \d+:\s*/i, ""));
}

function kindOf(file) {
  if (/interview-problems/.test(file)) return "problems";
  if (/project/.test(file)) return "project";
  return "chapter";
}

async function buildTrack(key, label, indexFile) {
  const curriculum = (await import(pathToFileURL(join(ROOT, indexFile)).href)).default;
  const byDoc = new Map();
  for (const ph of curriculum)
    for (const t of ph.topics) for (const it of t.items) if (it.docPath) byDoc.set(it.docPath, it);

  const files = walk(join(ROOT, key)).map((f) => relative(ROOT, f).split(sep).join("/"));
  const phases = curriculum.map((ph) => ({
    id: ph.id,
    phase: ph.phase,
    title: ph.title,
    subtitle: ph.subtitle,
    topics: ph.topics.map((t) => ({
      id: t.id,
      title: t.title,
      chapters: [],
      problems: t.items
        .filter((i) => i.type === "problem")
        .map(({ id, num, slug, title, difficulty }) => ({ id, num, slug, title, difficulty })),
    })),
  }));

  for (const file of files) {
    const part = num(file, /part(\d+)/);
    if (part === null) continue;
    const topicN = num(file, /topic(\d+)/);
    const phase = phases.find((p) => p.phase === part);
    if (!phase) continue;
    const topicId = `p${part}t${topicN ?? "x"}`;
    let topic = phase.topics.find((t) => t.id === topicId);
    if (!topic) {
      topic = { id: topicId, title: topicN === null ? "Phase Review" : `Topic ${topicN}`, chapters: [], problems: [] };
      phase.topics.push(topic);
    }
    const md = readFileSync(join(ROOT, file), "utf8");
    const hs = headings(md);
    const idx = byDoc.get("/" + file);
    const kind = idx?.type === "project" ? "project" : kindOf(file);
    topic.chapters.push({
      path: file,
      slug: file.replace(/\.md$/, ""),
      title: chapterTitle(file, hs, idx?.type === "project" ? idx.title : idx?.text),
      kind,
      difficulty: idx?.difficulty,
      order: num(file, /chapter(\d+)/) ?? (kind === "problems" ? 900 : 950),
      lines: md.split("\n").length,
      hasLab: /^#{2,3}\s+(\d+\.\s*)?Interactive Visualization/m.test(md),
    });
  }
  for (const p of phases) {
    for (const t of p.topics) t.chapters.sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
    p.topics = p.topics
      .filter((t) => t.chapters.length || t.problems.length)
      .sort((a, b) => {
        const n = (id) => (id.endsWith("x") ? 99 : Number(id.split("t")[1]));
        return n(a.id) - n(b.id);
      });
  }
  return { key, label, phases };
}

const manifest = {
  tracks: [
    await buildTrack("robotics", "Robotics", "robotics/ROBOTICS.js"),
    await buildTrack("dsa", "DSA in C++", "dsa/DSA.js"),
  ],
  extras: [{ path: "robotics/INTERVIEW_OVERVIEW.md", slug: "robotics/INTERVIEW_OVERVIEW", title: "Robotics Interview Overview" }],
};

mkdirSync(join(ROOT, "src/generated"), { recursive: true });
writeFileSync(join(ROOT, "src/generated/manifest.json"), JSON.stringify(manifest, null, 1));
const count = manifest.tracks.reduce(
  (n, t) => n + t.phases.reduce((m, p) => m + p.topics.reduce((k, x) => k + x.chapters.length, 0), 0),
  0
);
console.log(`manifest: ${count} chapters`);
