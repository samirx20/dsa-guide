import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full caption-bottom text-sm font-sans", className)} {...props} />
    </div>
  );
}
export function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-muted/70 [&_tr]:border-b", className)} {...props} />;
}
export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}
export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-accent", className)} {...props} />;
}
export function TableHead({ className, ...props }) {
  return <th className={cn("h-9 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap", className)} {...props} />;
}
export function TableCell({ className, ...props }) {
  return <td className={cn("px-3 py-2 align-top", className)} {...props} />;
}
