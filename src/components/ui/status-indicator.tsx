import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

/** Estados de celda de la matriz. Triple señal: glifo + etiqueta mono + color semántico. */
export type Status = "installed" | "missing" | "differs" | "error";

const GLYPH: Record<Status, string> = {
  installed: "✓",
  missing: "–",
  differs: "≠",
  error: "✕",
};

const indicator = cva("font-mono", {
  variants: {
    status: {
      installed: "text-success",
      missing: "text-faint",
      differs: "text-warning",
      error: "text-danger",
    },
  },
  defaultVariants: { status: "missing" },
});

interface Props extends VariantProps<typeof indicator> {
  status: Status;
  /** `label` muestra glifo + etiqueta; `glyph` solo el glifo. */
  variant?: "label" | "glyph";
  className?: string;
}

export function StatusIndicator({ status, variant = "label", className }: Props) {
  const t = useT();
  if (variant === "glyph") {
    return (
      <span className={cn(indicator({ status }), "w-4 text-center text-sm", className)}>
        {GLYPH[status]}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn(indicator({ status }), "w-4 text-center text-sm")}>{GLYPH[status]}</span>
      <span className={cn(indicator({ status }), "text-[10px] font-medium tracking-[0.1em]")}>
        {t(`status.${status}`)}
      </span>
    </span>
  );
}
