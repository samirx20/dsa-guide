import manifest from "@/generated/manifest.json";

const files = import.meta.glob(["/dsa/**/*.md", "/robotics/**/*.md"], { query: "?raw", import: "default" });

export { manifest };

/** Flat, ordered list of every chapter with its context. */
export const chapters = [];
for (const track of manifest.tracks)
  for (const phase of track.phases)
    for (const topic of phase.topics)
      for (const ch of topic.chapters) chapters.push({ ...ch, track: track.key, trackLabel: track.label, phase, topic });
for (const ex of manifest.extras) chapters.push({ ...ex, track: "robotics", kind: "overview", extra: true });

export const bySlug = new Map(chapters.map((c) => [c.slug, c]));

export function loadMarkdown(path) {
  const loader = files["/" + path];
  return loader ? loader() : Promise.reject(new Error(`Missing ${path}`));
}

/** Split long robotics titles "Main — detail" into parts. */
export function splitTitle(t) {
  const i = t.indexOf(" — ");
  return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ""];
}

export function neighbors(slug) {
  const list = chapters.filter((c) => !c.extra);
  const i = list.findIndex((c) => c.slug === slug);
  const cur = list[i];
  const same = (c) => c && c.track === cur?.track;
  return { prev: same(list[i - 1]) ? list[i - 1] : null, next: same(list[i + 1]) ? list[i + 1] : null };
}

export { parseChapter, plain } from "./parse.js";
