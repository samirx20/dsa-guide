import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return <LabelPrimitive.Root className={cn("text-[13px] font-medium leading-none text-foreground select-none", className)} {...props} />;
}
