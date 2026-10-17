import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineText } from "@/components/Markdown";
import { cn } from "@/lib/utils";

export default function Toc({ items }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-64px 0px -70% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const go = (id) => (e) => {
    e.preventDefault();
    const base = window.location.hash.split("#").slice(0, 2).join("#");
    history.replaceState(null, "", `${base}#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActive(id);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-0.5 border-l pr-2">
          {items.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                onClick={go(i.id)}
                className={cn(
                  "-ml-px block border-l-2 border-transparent py-1 text-[12.5px] leading-snug text-muted-foreground transition-colors hover:text-foreground",
                  i.depth === 3 ? "pl-6" : "pl-3",
                  active === i.id && "border-primary font-medium text-foreground"
                )}
              >
                <InlineText text={i.raw ?? i.text} />
              </a>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
