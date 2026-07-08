import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { InputHTMLAttributes, Ref } from "react";

const inputVariants = cva(
  "font-mono text-foreground text-xs placeholder:text-faint outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      // framed: borde+fondo propios (uso por defecto, campo autocontenido).
      // bare: sin borde/fondo, para cuando el borde ya lo aporta un contenedor padre
      // (p.ej. el buscador del TopBar, que combina icono + input en una sola caja).
      variant: {
        framed:
          "rounded-[var(--radius-sm)] border border-border bg-surface hover:border-border-strong focus:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        bare: "border-none bg-transparent",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-9 px-3",
      },
    },
    defaultVariants: { variant: "framed", size: "md" },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  ref?: Ref<HTMLInputElement>;
}

/** Input de esquinas rectas (estilo terminal); con borde/fondo propios por defecto. */
export function Input({ className, variant, size, ref, ...props }: InputProps) {
  return <input ref={ref} className={cn(inputVariants({ variant, size }), className)} {...props} />;
}

export { inputVariants };
