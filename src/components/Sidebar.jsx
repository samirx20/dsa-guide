import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CheckCircle2, Code2, ExternalLink, FlaskConical, Hammer, Search, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { manifest, splitTitle } from "@/lib/content";
import { href } from "@/lib/store";
import { hasLab } from "@/labs/registry";
import { cn } from "@/lib/utils";

const DIFF = { Easy: "success", Medium: "warning", Hard: "danger" };
const KIND_ICON = { chapter: BookOpen, problems: Code2, project: Hammer };

export function phaseStats(phase, done) {
  const ids = phase.topics.flatMap((t) => [...t.chapters.map((c) => c.slug), ...t.problems.map((p) => p.id)]);
  const n = ids.filter((id) => done[id]).length;
  return { n, total: ids.length, pct: ids.length ? Math.round((n / ids.length) * 100) : 0 };
}

function ChapterLink({ ch, active, done, onNavigate }) {
  const Icon = KIND_ICON[ch.kind] ?? BookOpen;
  const [main] = splitTitle(ch.title);
  const lab = hasLab(ch.slug);
  return (
    <a
      href={href(ch.slug)}
      onClick={onNavigate}
      data-active={active || undefined}
      className={cn(
        "group flex items-start gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {done ? <CheckCircle2 className="mt-px size-3.5 shrink-0 text-viz-ok" /> : <Icon className="mt-px size-3.5 shrink-0 opacity-70" />}
      <span className="flex-1">{ch.kind === "problems" ? "Interview problems" : main}</span>
      {lab && <FlaskConical className="mt-px size-3 shrink-0 text-viz-active opacity-70" aria-label="Has interactive lab" />}
    </a>
  );
}

function Problems({ problems, done, setDone }) {
  if (!problems.length) return null;
  const n = problems.filter((p) => done[p.id]).length;
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted">
        <span>LeetCode practice</span>
        <span className="font-mono text-[11px]">
          {n}/{problems.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-0.5 py-1 pl-2">
          {problems.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-[12.5px] hover:bg-muted">
              <Checkbox checked={!!done[p.id]} onCheckedChange={(v) => setDone((d) => ({ ...d, [p.id]: !!v }))} aria-label={`Mark ${p.title} solved`} />
              <a href={`https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer" className={cn("flex-1 truncate hover:underline", done[p.id] && "text-muted-foreground line-through")}>
                <span className="mr-1 font-mono text-[11px] text-muted-foreground">#{p.num}</span>
                {p.title}
              </a>
              <Badge variant={DIFF[p.difficulty] ?? "outline"} className="px-1 py-px text-[10px]">
                {p.difficulty?.[0]}
              </Badge>
              <ExternalLink className="size-3 opacity-40" />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Sidebar({ trackKey, activeSlug, done, setDone, onNavigate }) {
  const track = manifest.tracks.find((t) => t.key === trackKey) ?? manifest.tracks[0];
  const activePhase = track.phases.find((p) => p.topics.some((t) => t.chapters.some((c) => c.slug === activeSlug)));
  const [open, setOpen] = useState(activePhase ? [activePhase.id] : []);
  const [q, setQ] = useState("");
  const viewport = useRef(null);

  useEffect(() => {
    if (activePhase && !open.includes(activePhase.id)) setOpen((o) => [...o, activePhase.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhase?.id]);

  useEffect(() => {
    const t = setTimeout(() => viewport.current?.querySelector("[data-active]")?.scrollIntoView({ block: "center" }), 250);
    return () => clearTimeout(t);
  }, [activeSlug, trackKey]);

  const filtered = useMemo(() => {
    if (!q.trim()) return null;
    const s = q.toLowerCase();
    return track.phases.flatMap((p) => p.topics.flatMap((t) => t.chapters.filter((c) => (c.title + " " + t.title + " " + p.title).toLowerCase().includes(s))));
  }, [q, track]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${track.label}…`}
            className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label="Search chapters"
          />
          {q && (
            <button onClick={() => setQ("")} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1" viewportRef={viewport}>
        <nav className="px-3 pb-8">
          {filtered ? (
            <div className="space-y-0.5 pt-1">
              {filtered.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">No chapters match “{q}”.</p>}
              {filtered.map((c) => (
                <ChapterLink key={c.slug} ch={c} active={c.slug === activeSlug} done={done[c.slug]} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <Accordion type="multiple" value={open} onValueChange={setOpen}>
              {track.phases.map((p) => {
                const st = phaseStats(p, done);
                return (
                  <AccordionItem key={p.id} value={p.id} className="border-b border-border/60 last:border-0">
                    <AccordionTrigger className="py-2.5 hover:no-underline">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10.5px] font-semibold text-muted-foreground">PHASE {p.phase}</span>
                          {st.pct === 100 && <CheckCircle2 className="size-3 text-viz-ok" />}
                        </div>
                        <div className="mt-0.5 text-[13.5px] font-semibold leading-snug">{splitTitle(p.title)[0]}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={st.pct} className="h-1" />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {st.n}/{st.total}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-3">
                      {p.topics.map((t) => (
                        <div key={t.id}>
                          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{t.title}</div>
                          <div className="space-y-0.5">
                            {t.chapters.map((c) => (
                              <ChapterLink key={c.slug} ch={c} active={c.slug === activeSlug} done={done[c.slug]} onNavigate={onNavigate} />
                            ))}
                          </div>
                          <Problems problems={t.problems} done={done} setDone={setDone} />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}
