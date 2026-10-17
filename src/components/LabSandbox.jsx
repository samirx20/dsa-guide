// Dev/preview route: #/lab/<track>/<Name>?variant=<v>  — renders one lab in isolation.
import { Suspense, lazy, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReaderPrefs } from "@/components/ReadingSettings";

const modules = import.meta.glob("../labs/{dsa,robotics}/*.jsx");

export default function LabSandbox({ path }) {
  useReaderPrefs();
  const [p, query] = path.slice(4).split("?");
  const variant = new URLSearchParams(query ?? "").get("variant") ?? undefined;
  const Lab = useMemo(() => {
    const loader = modules[`../labs/${p}.jsx`];
    return loader ? lazy(loader) : null;
  }, [p]);
  return (
    <TooltipProvider delayDuration={250}>
      <div className="mx-auto max-w-[900px] p-6 text-[15px]">
        <div className="mb-2 font-mono text-xs text-muted-foreground">
          {p} · variant={variant ?? "default"}
        </div>
        {Lab ? (
          <Suspense fallback={<div>Loading…</div>}>
            <Lab variant={variant} />
          </Suspense>
        ) : (
          <div>No lab at src/labs/{p}.jsx</div>
        )}
      </div>
    </TooltipProvider>
  );
}
