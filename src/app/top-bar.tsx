import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/i18n";
import { Moon, RefreshCw, Search, Sun } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "./logo";
import { useTheme } from "./theme-store";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  onScan: () => void;
  scanning?: boolean;
}

export function TopBar({ query, onQuery, onScan, scanning }: Props) {
  const { theme, toggle } = useTheme();
  const t = useT();
  const { locale, toggle: toggleLocale } = useLocale();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-auto shrink-0 object-contain" />
        <span className="font-bold text-[22px] tracking-[0.14em]">NODIFY</span>
        <span className="font-sans text-muted-foreground text-xs">{t("topbar.tagline")}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5">
          <Search size={14} className="text-faint" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("topbar.filter")}
            className="w-[150px] py-2.5"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleLocale}
          aria-label={t("common.changeLang")}
          className="font-mono text-[11px] tracking-[0.08em]"
        >
          {locale === "es" ? "ES" : "EN"}
        </Button>

        <Button variant="outline" size="icon" onClick={toggle} aria-label={t("common.changeTheme")}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <motion.div className="inline-flex" whileTap={{ scale: 0.94 }}>
          <Button variant="accent" onClick={onScan} disabled={scanning} className="group">
            <motion.span
              className="inline-flex"
              animate={scanning ? { rotate: -360 } : { rotate: 0 }}
              transition={
                scanning
                  ? { repeat: Number.POSITIVE_INFINITY, ease: "linear", duration: 0.7 }
                  : { type: "spring", stiffness: 300, damping: 18 }
              }
            >
              <RefreshCw size={14} />
            </motion.span>
            {scanning ? t("topbar.scanning") : t("topbar.scan")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
