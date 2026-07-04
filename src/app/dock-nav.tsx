import { cn } from "@/lib/utils";
import { GitMerge, Grid2x2, KeyRound, RefreshCw } from "lucide-react";
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

const ITEMS: Array<{ id: NavSection; label: string; icon: typeof Grid2x2 }> = [
  { id: "matrix", label: "MATRIX", icon: Grid2x2 },
  { id: "agents", label: "ALIGN", icon: GitMerge },
  { id: "secrets", label: "SECRETS", icon: KeyRound },
  { id: "sync", label: "SYNC", icon: RefreshCw },
];

export function DockNav() {
  const { active, setActive } = useNav();
  return (
    <nav
      className="fixed top-1/2 left-5 z-50 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-border-strong bg-elevated p-2"
      style={{ boxShadow: "0 12px 44px rgba(0,0,0,0.45)" }}
    >
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              "flex w-[58px] cursor-pointer flex-col items-center gap-1.5 rounded-[9px] border-none px-1.5 py-2.5 font-mono",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="text-[9px] tracking-[0.1em]">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
