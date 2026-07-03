import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

/** Input de esquinas rectas (estilo terminal). */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-none outline-none bg-transparent text-foreground font-mono text-xs placeholder:text-faint",
        className,
      )}
      {...props}
    />
  );
}
