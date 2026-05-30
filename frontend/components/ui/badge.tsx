import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--border)] bg-[color:var(--secondary)] text-[color:var(--muted-foreground)]",
        success:
          "border-transparent bg-[color:var(--success-soft)] text-[color:var(--success)]",
        warning:
          "border-transparent bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
        danger:
          "border-transparent bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
        accent:
          "border-transparent bg-[color:var(--primary-soft)] text-[color:var(--primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
