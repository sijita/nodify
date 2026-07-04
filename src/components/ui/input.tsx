import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, Ref } from "react";

/** Input de esquinas rectas (estilo terminal). */
export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        "border-none outline-none bg-transparent text-foreground font-mono text-xs placeholder:text-faint",
        className,
      )}
      {...props}
    />
  );
}
