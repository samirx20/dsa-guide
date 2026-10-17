import { ArrowRight, Bot, Binary, FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chapters, manifest, splitTitle } from "@/lib/content";
import { href } from "@/lib/store";
import { phaseStats } from "@/components/Sidebar";
import { LAB_MAP } from "@/labs/registry";

const ICON = { robotics: Bot, dsa: Binary };

export default function Home({ done, lastRead }) {
  const last = lastRead && chapters.find((c) => c.slug === lastRead);
  const labCount = Object.keys(LAB_MAP).length;
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8">
      <div className="max-w-2xl">
        <Badge variant="active" className="mb-4">
          <FlaskConical className="size-3" /> {labCount} chapters with interactive labs
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Learn robotics and algorithms by reading, then playing.</h1>
        <p className="mt-4 font-serif text-lg leading-relaxed text-muted-foreground">
          Two first-principles tracks with {chapters.length} chapters. Each chapter ends with a hands-on lab you can step through, tune, and break.
        </p>
        {last && (
          <Button asChild className="mt-6">
            <a href={href(last.slug)}>
              Continue: {last.kind === "problems" ? `${last.topic?.title} problems` : splitTitle(last.title)[0]} <ArrowRight />
            </a>
          </Button>
        )}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {manifest.tracks.map((t) => {
          const Icon = ICON[t.key];
          const all = t.phases.map((p) => phaseStats(p, done));
          const n = all.reduce((a, s) => a + s.n, 0);
          const total = all.reduce((a, s) => a + s.total, 0);
          const first = t.phases[0].topics[0].chapters[0];
          return (
            <Card key={t.key} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t.label}</CardTitle>
                    <CardDescription>
                      {t.phases.length} phases · {n}/{total} done
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={href(first.slug)}>
                      Start <ArrowRight />
                    </a>
                  </Button>
                </div>
                <Progress value={total ? (n / total) * 100 : 0} className="mt-3" />
              </CardHeader>
              <CardContent className="flex-1">
                <ol className="space-y-1">
                  {t.phases.map((p, k) => {
                    const ch = p.topics[0]?.chapters[0];
                    return (
                      <li key={p.id}>
                        <a href={ch ? href(ch.slug) : undefined} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                          <span className="w-6 font-mono text-xs text-muted-foreground">{String(p.phase).padStart(2, "0")}</span>
                          <span className="flex-1 text-[13.5px] leading-snug">{splitTitle(p.title)[0].replace(/^Prerequisites:\s*/, "")}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{all[k].pct}%</span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
