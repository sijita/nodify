import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { Bot, Grid2x2, KeyRound, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { create } from "zustand";

export type NavSection = "matrix" | "agents" | "secrets" | "sync";

interface NavState {
  active: NavSection;
  setActive: (s: NavSection) => void;
}
export const useNav = create<NavState>((set) => ({
  active: "matrix",
  setActive: (active) => set({ active }),
}));

const ITEMS: Array<{ id: NavSection; labelKey: string; icon: typeof Grid2x2 }> = [
  { id: "matrix", labelKey: "nav.matrix", icon: Grid2x2 },
  { id: "agents", labelKey: "nav.align", icon: Bot },
  { id: "secrets", labelKey: "nav.secrets", icon: KeyRound },
  { id: "sync", labelKey: "nav.sync", icon: RefreshCw },
];

export function DockNav() {
  const { active, setActive } = useNav();
  const t = useT();
  return (
    <nav
      className="fixed top-1/2 left-5 z-50 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-border-strong bg-elevated p-2"
      style={{ boxShadow: "0 12px 44px rgba(0,0,0,0.45)" }}
    >
      {ITEMS.map(({ id, labelKey, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              "relative flex w-[58px] cursor-pointer flex-col items-center gap-1.5 rounded-[9px] border-none bg-transparent px-1.5 py-2.5 font-mono transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="dock-active"
                className="absolute inset-0 rounded-[9px] bg-primary"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              />
            )}
            <Icon size={18} strokeWidth={2} className="relative z-1" />
            <span className="relative z-1 text-[9px] tracking-[0.1em]">{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
