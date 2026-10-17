import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Clock, FileCode2, FlaskConical, Loader2 } from "lucide-react";
import Markdown, { InlineText } from "@/components/Markdown";
import Toc from "@/components/Toc";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bySlug, loadMarkdown, neighbors, parseChapter, splitTitle } from "@/lib/content";
import { href } from "@/lib/store";
import { labsFor } from "@/labs/registry";
import { WIDTHS } from "@/components/ReadingSettings";
import { cn } from "@/lib/utils";

class LabBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <div className="rounded-lg border border-viz-bad/40 bg-viz-bad/8 p-4 font-sans text-sm">
          This lab hit an error: <code>{String(this.state.error.message)}</code>
        </div>
      );
    return this.props.children;
  }
}

function LabLoading() {
  return (
    <div className="flex h-40 items-center justify-center gap-2 rounded-xl border font-sans text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading lab…
    </div>
  );
}

function Fold({ block, ids }) {
  return (
    <Collapsible className="not-prose group/fold rounded-lg border bg-card/60 font-sans">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[14.5px] font-semibold hover:bg-muted/50 rounded-lg">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/fold:rotate-90" />
        <span className="flex-1"><InlineText text={block.title} /></span>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          walkthrough
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="md-flow border-t px-4 py-3 text-[0.94em]" style={{ fontFamily: "inherit" }}>
          <Markdown text={block.text} ids={ids} offset={block.offset} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ChapterPage({ slug, anchor, prefs, done, setDone }) {
  const ch = bySlug.get(slug);
  const [md, setMd] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setMd(null);
    setError(null);
    loadMarkdown(ch.path).then((t) => live && setMd(t), (e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [ch.path]);

  const doc = useMemo(() => (md ? parseChapter(md) : null), [md]);
  const labs = useMemo(() => labsFor(slug), [slug]);
  const { prev, next } = neighbors(slug);

  useEffect(() => {
    if (!doc) return;
    if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView());
    else window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const [main, detail] = splitTitle(ch.title);
  const minutes = doc ? Math.max(1, Math.round(doc.words / 230)) : null;
  const isDone = !!done[slug];

  const toc = doc ? [...doc.toc, ...(labs.length || doc.spec ? [{ id: "interactive-lab", depth: 2, text: "Interactive Lab" }] : [])] : [];

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex gap-10">
        <article className={cn("mx-auto min-w-0 flex-1 px-5 pb-24 pt-8 sm:px-8", WIDTHS[prefs.width])}>
          {/* Breadcrumb */}
          {!ch.extra && (
            <div className="mb-4 flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground">
              <span>{ch.trackLabel}</span>
              <ChevronRight className="size-3" />
              <span>Phase {ch.phase.phase}</span>
              <ChevronRight className="size-3" />
              <span className="truncate">{ch.topic.title}</span>
            </div>
          )}

          <header className="mb-8 border-b pb-6">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-balance sm:text-[2.3rem]">
              {ch.kind === "problems" ? `${ch.topic.title}: Interview Problems` : main}
            </h1>
            {detail && <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground text-pretty">{detail}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {ch.kind === "project" && (
                <Badge variant="purple">
                  <FileCode2 className="size-3" /> Project
                </Badge>
              )}
              {ch.kind === "problems" && <Badge variant="warning">Interview set</Badge>}
              {ch.difficulty && <Badge variant="outline">{ch.difficulty}</Badge>}
              {minutes && (
                <span className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
                  <Clock className="size-3.5" /> {minutes} min read
                </span>
              )}
              <div className="ml-auto flex items-center gap-3">
                {labs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("interactive-lab")?.scrollIntoView({ behavior: "smooth" })}>
                    <FlaskConical className="text-viz-active" /> Jump to lab
                  </Button>
                )}
                {!ch.extra && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="done-top" checked={isDone} onCheckedChange={(v) => setDone((d) => ({ ...d, [slug]: !!v }))} />
                    <Label htmlFor="done-top" className="cursor-pointer text-[13px]">
                      Done
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </header>

          {error && <p className="text-viz-bad">Could not load this chapter.</p>}
          {!doc && !error && (
            <div className="space-y-3">
              {Array.from({ length: 8 }, (_, k) => (
                <div key={k} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${60 + ((k * 37) % 40)}%` }} />
              ))}
            </div>
          )}

          {doc && (
            <div className="prose-reader" data-font={prefs.font} style={{ "--reader-size": `${prefs.size}px` }}>
              {doc.subtitle && ch.kind !== "problems" && !detail && norm(main) !== norm(doc.subtitle) && (
                <p className="!mt-0 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">{doc.subtitle}</p>
              )}
              {doc.blocks.map((b, k) =>
                b.type === "fold" ? (
                  <Fold key={k} block={b} ids={doc.ids} />
                ) : (
                  <div key={k} className="md-flow">
                    <Markdown text={b.text} ids={doc.ids} offset={b.offset} />
                  </div>
                )
              )}

              {(labs.length > 0 || doc.spec) && (
                <section className="!mt-14">
                  <h2 id="interactive-lab" className="flex items-center gap-2 scroll-mt-20">
                    <FlaskConical className="size-6 text-viz-active" /> Interactive Lab
                  </h2>
                  {labs.length > 0 ? (
                    <p className="font-sans text-[15px] text-muted-foreground">Play with the ideas from this chapter. Everything runs in your browser.</p>
                  ) : (
                    <p className="font-sans text-[15px] text-muted-foreground">A visualizer for this chapter is on the way.</p>
                  )}
                  <div className="text-[15px]">
                    {labs.map(({ key, Component: Lab, variant, props }) => (
                      <LabBoundary key={key}>
                        <Suspense fallback={<LabLoading />}>
                          <Lab variant={variant} {...props} />
                        </Suspense>
                      </LabBoundary>
                    ))}
                  </div>
                  {doc.spec && (
                    <Accordion type="single" collapsible className="not-prose mt-4 rounded-lg border bg-card/50 px-4 font-sans">
                      <AccordionItem value="spec">
                        <AccordionTrigger className="text-[13px] text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <BookOpen className="size-3.5" /> Lab design notes from the chapter
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="prose-reader md-flow text-[14px]" data-font="sans" style={{ "--reader-size": "14px" }}>
                            <Markdown text={doc.spec} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </section>
              )}
            </div>
          )}

          {doc && (
            <footer className="mt-16 space-y-6 border-t pt-8 font-sans">
              {!ch.extra && (
                <div className="flex items-center justify-center gap-3 rounded-xl border bg-card p-4">
                  <Checkbox id="done-bottom" checked={isDone} onCheckedChange={(v) => setDone((d) => ({ ...d, [slug]: !!v }))} />
                  <Label htmlFor="done-bottom" className="cursor-pointer text-sm">
                    {isDone ? "Chapter completed" : "Mark this chapter as completed"}
                  </Label>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {prev ? <NavCard ch={prev} dir="prev" /> : <span />}
                {next && <NavCard ch={next} dir="next" />}
              </div>
            </footer>
          )}
        </article>
        {doc && toc.length > 2 && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 py-8 pr-4 xl:block">
            <Toc items={toc} />
          </aside>
        )}
      </div>
    </TooltipProvider>
  );
}

const norm = (s) => s.replace(/^(chapter|project)\s*\d*\s*[:—-]\s*/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");

function NavCard({ ch, dir }) {
  const [main] = splitTitle(ch.title);
  return (
    <a href={href(ch.slug)} className={cn("group rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/40", dir === "next" && "text-right sm:col-start-2")}>
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", dir === "next" && "justify-end")}>
        {dir === "prev" ? <ArrowLeft className="size-3.5" /> : null}
        {dir === "prev" ? "Previous" : "Next"}
        {dir === "next" ? <ArrowRight className="size-3.5" /> : null}
      </div>
      <div className="mt-1 text-[14px] font-medium leading-snug group-hover:text-primary">{ch.kind === "problems" ? `${ch.topic.title}: Interview Problems` : main}</div>
    </a>
  );
}
