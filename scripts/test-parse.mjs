// Sanity check: parse every chapter and report structure stats.
import { readFileSync } from "node:fs";
import { parseChapter } from "../src/lib/parse.js";
const m = JSON.parse(readFileSync(new URL("../src/generated/manifest.json", import.meta.url), "utf8"));
const stats = { chapters: 0, noSpec: 0, folds: 0, toc: 0, noTitle: 0 };
for (const t of m.tracks) for (const p of t.phases) for (const x of p.topics) for (const c of x.chapters) {
  const d = parseChapter(readFileSync(new URL("../" + c.path, import.meta.url), "utf8"));
  stats.chapters++;
  if (!d.spec) { stats.noSpec++; console.log("no spec:", c.path); }
  if (!d.title) { stats.noTitle++; console.log("no title:", c.path); }
  stats.folds += d.blocks.filter((b) => b.type === "fold").length;
  stats.toc += d.toc.length;
}
console.log(stats);
