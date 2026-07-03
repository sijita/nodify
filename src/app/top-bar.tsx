import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, RefreshCw, Search, Sun } from "lucide-react";
import { useTheme } from "./theme-store";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  onScan: () => void;
  scanning?: boolean;
}

export function TopBar({ query, onQuery, onScan, scanning }: Props) {
  const { theme, toggle } = useTheme();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
      <div className="flex items-baseline gap-3">
        <span className="font-bold text-[22px] tracking-[0.14em]">NODIFY</span>
        <span className="font-sans text-muted-foreground text-xs">agent control center</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5">
          <Search size={14} className="text-faint" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="filter config…"
            className="w-[150px] py-2.5"
          />
        </div>

        <Button variant="outline" size="icon" onClick={toggle} aria-label="Cambiar tema">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button variant="accent" onClick={onScan} disabled={scanning}>
          <RefreshCw size={14} className={scanning ? "animate-spin" : undefined} />
          SCAN
        </Button>
      </div>
    </div>
  );
}
