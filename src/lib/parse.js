import GithubSlugger from "github-slugger";

const TEX = { cdot: "·", times: "×", to: "→", rightarrow: "→", leftarrow: "←", log: "log", le: "≤", ge: "≥", ne: "≠", infty: "∞", theta: "θ", omega: "ω", alpha: "α", pi: "π", Delta: "Δ", sum: "Σ", int: "∫", approx: "≈" };
export const texToText = (s) => s.replace(/\\([a-zA-Z]+)/g, (m, w) => TEX[w] ?? w).replace(/\\[,;! ]/g, " ").replace(/[{}]/g, "").replace(/\^2\b/g, "²").replace(/\^3\b/g, "³");

/* ---------------- Markdown section splitting ---------------- */

const SPEC_RE = /^#{2,3}\s+(\d+\.\s*)?Interactive Visualization/i;

/** Fence-aware line scan. Calls fn(line, idx, inFence). */
function scan(lines, fn) {
  let fence = null;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(```+|~~~+)/);
    const wasIn = !!fence;
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
    }
    fn(line, i, wasIn || (m && !wasIn));
  });
}

/**
 * Parse a chapter into:
 *  - title (H1), subtitle (first H2), body blocks, spec markdown, toc.
 * Body blocks: { type: "md", text } | { type: "fold", title, depth, text }
 * "Dry-Run" / "Trace" h4 subsections become collapsible folds to declutter.
 */
export function parseChapter(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let specStart = -1;
  const heads = [];
  scan(lines, (line, i, inFence) => {
    if (inFence) return;
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (!m) return;
    if (specStart < 0 && SPEC_RE.test(line)) specStart = i;
    heads.push({ i, depth: m[1].length, text: m[2].trim() });
  });

  const bodyEnd = specStart >= 0 ? specStart : lines.length;
  // strip trailing separators before the spec section
  let end = bodyEnd;
  while (end > 0 && /^\s*(---+|\*\*\*+)?\s*$/.test(lines[end - 1])) end--;

  // Title / subtitle extraction: drop leading H1 and immediately-following H2
  let start = 0;
  let title = "";
  let subtitle = "";
  const h1 = heads.find((h) => h.depth === 1 && h.i < 5);
  if (h1) {
    title = h1.text;
    start = h1.i + 1;
    const next = heads.find((h) => h.i > h1.i);
    if (next && next.depth === 2 && next.i <= h1.i + 2) {
      subtitle = next.text;
      start = next.i + 1;
    }
  }

  // Skip blank lines / horizontal rules right after the title block.
  while (start < end && /^\s*(---+|\*\*\*+)?\s*$/.test(lines[start])) start++;

  // Fold detection on h4 "Dry-Run" / "Trace" headings within the body.
  const isFold = (h) => h.depth >= 4 && /dry[- ]?run|trace|walkthrough|step-by-step/i.test(h.text);
  const bodyHeads = heads.filter((h) => h.i >= start && h.i < end);
  const blocks = [];
  let cursor = start;
  for (let k = 0; k < bodyHeads.length; k++) {
    const h = bodyHeads[k];
    if (!isFold(h)) continue;
    const stop = bodyHeads.slice(k + 1).find((n) => n.depth <= h.depth);
    const foldEnd = stop ? stop.i : end;
    if (h.i > cursor) blocks.push({ type: "md", offset: cursor, text: lines.slice(cursor, h.i).join("\n") });
    blocks.push({ type: "fold", title: h.text, depth: h.depth, offset: h.i + 1, text: lines.slice(h.i + 1, foldEnd).join("\n") });
    cursor = foldEnd;
    while (k + 1 < bodyHeads.length && bodyHeads[k + 1].i < foldEnd) k++;
  }
  if (cursor < end) blocks.push({ type: "md", offset: cursor, text: lines.slice(cursor, end).join("\n") });

  // TOC: h2/h3 in body (skip folds), ids via the same slugger the renderer uses.
  const slugger = new GithubSlugger();
  const toc = [];
  const ids = new Map();
  for (const h of heads) {
    if (h.i < start || h.i >= end) continue;
    const id = slugger.slug(plain(h.text));
    ids.set(h.i, id);
    if (h.depth === 2 || h.depth === 3) toc.push({ id, depth: h.depth, text: plain(h.text), raw: h.text });
  }

  return {
    title: plain(title),
    subtitle: plain(subtitle),
    blocks,
    ids,
    spec: specStart >= 0 ? lines.slice(specStart + 1).join("\n") : "",
    toc,
    words: md.split(/\s+/).length,
  };
}

/** Strip markdown emphasis/code/math markers for plain text. */
export function plain(s) {
  return s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\$([^$]*)\$/g, (m, t) => texToText(t))
    .replace(/\\([a-zA-Z]+)/g, (m, w) => TEX[w] ?? w)
    .trim();
}
