import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap font-sans",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border",
        active: "border-viz-active/40 bg-viz-active/12 text-viz-active",
        success: "border-viz-ok/40 bg-viz-ok/12 text-viz-ok",
        danger: "border-viz-bad/40 bg-viz-bad/12 text-viz-bad",
        warning: "border-viz-warn/40 bg-viz-warn/12 text-viz-warn",
        purple: "border-viz-purple/40 bg-viz-purple/12 text-viz-purple",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
