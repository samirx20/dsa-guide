import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }) {
  return <ToggleGroupPrimitive.Root className={cn("inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1", className)} {...props} />;
}
export function ToggleGroupItem({ className, ...props }) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground cursor-pointer transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  );
}
