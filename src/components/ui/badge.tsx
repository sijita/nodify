import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center font-mono text-[10px] tracking-[0.1em] whitespace-nowrap rounded-[var(--radius-sm)]",
  {
    variants: {
      variant: {
        // pill con borde (scope, env por-referencia/valor)
        outline: "border border-border px-2 py-1 text-muted-foreground",
        // cuadro-avatar de agente (CC / CX / OC)
        avatar:
          "border border-border-strong bg-surface justify-center font-semibold text-xs tracking-[0.04em]",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
