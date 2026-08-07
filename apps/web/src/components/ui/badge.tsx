import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
        success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
        error: "bg-[var(--color-error)]/10 text-[var(--color-error)]",
        accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent-foreground)]",
        muted: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
