import { Suspense, lazy, useEffect, useState } from "react";
import { Binary, Bot, GraduationCap, Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChapterPage from "@/components/ChapterPage";
import Home from "@/components/Home";
import ReadingSettings, { useReaderPrefs } from "@/components/ReadingSettings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bySlug, manifest } from "@/lib/content";
import { href, usePersistent, useHashRoute } from "@/lib/store";

const LabSandbox = lazy(() => import("@/components/LabSandbox"));

export default function App() {
  const { path, anchor } = useHashRoute();
  const prefs = useReaderPrefs();
  const [done, setDone] = usePersistent("progress-v2", {});
  const [lastRead, setLastRead] = usePersistent("last-read", null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const chapter = bySlug.get(path);
  const [track, setTrack] = usePersistent("track", "robotics");
  const activeTrack = chapter ? chapter.track : track;

  useEffect(() => {
    if (chapter) {
      setLastRead(chapter.slug);
      if (chapter.track !== track) setTrack(chapter.track);
      document.title = `${chapter.title.split(" — ")[0]} · Learning`;
    } else document.title = "Robotics & DSA Guide";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.slug]);

  if (path.startsWith("lab/"))
    return (
      <Suspense fallback={null}>
        <LabSandbox path={path} />
      </Suspense>
    );

  const sidebar = (
    <Sidebar trackKey={activeTrack} activeSlug={chapter?.slug} done={done} setDone={setDone} onNavigate={() => setSheetOpen(false)} />
  );
  const trackTabs = (
    <Tabs
      value={activeTrack}
      onValueChange={(v) => {
        setTrack(v);
        if (chapter) window.location.hash = href(manifest.tracks.find((t) => t.key === v).phases[0].topics[0].chapters[0].slug);
      }}
    >
      <TabsList>
        <TabsTrigger value="robotics">
          <Bot /> Robotics
        </TabsTrigger>
        <TabsTrigger value="dsa">
          <Binary /> DSA
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="flex h-14 items-center border-b px-4 text-sm font-semibold">Contents</SheetTitle>
              <div className="border-b px-3 py-2">{trackTabs}</div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </SheetContent>
          </Sheet>
          <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            <span className="hidden sm:inline">Learning</span>
          </a>
          <div className="ml-2 hidden lg:block">{trackTabs}</div>
          <div className="ml-auto flex items-center gap-1">
            <ReadingSettings prefs={prefs} />
          </div>
        </header>

        <div className="flex">
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[300px] shrink-0 border-r bg-background lg:block">{sidebar}</aside>
          <main className="min-w-0 flex-1">
            {chapter ? (
              <ChapterPage key={chapter.slug} slug={chapter.slug} anchor={anchor} prefs={prefs} done={done} setDone={setDone} />
            ) : (
              <Home done={done} lastRead={lastRead} />
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
