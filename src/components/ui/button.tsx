import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-mono tracking-wide cursor-pointer transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
  {
    variants: {
      variant: {
        // accent monocromo: negro-sobre-blanco / blanco-sobre-negro
        accent: "bg-primary text-primary-foreground hover:opacity-[0.88] border-none",
        outline:
          "border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-border-strong",
        ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-elevated-2",
      },
      size: {
        sm: "h-8 px-2.5 text-xs rounded-[var(--radius)]",
        md: "h-9 px-4 text-xs rounded-[var(--radius)]",
        icon: "h-9 w-9 rounded-[var(--radius)]",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
