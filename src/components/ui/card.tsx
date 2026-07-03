import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Superficie boxy con borde 1px (radio pequeño). Base de stat cards, paneles, matriz. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border border-border bg-surface rounded-[var(--radius-sm)]", className)}
      {...props}
    />
  );
}
