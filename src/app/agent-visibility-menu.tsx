import { AgentGlyph } from "@/components/agent-glyph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { useAgentVisibility } from "@/lib/agent-visibility";
import { AGENT_META } from "@/lib/agents";
import { Check, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Botón + popover para ocultar/mostrar agentes (preferencia de UI, ver
 * lib/agent-visibility). Único punto de control: ocultar quita la columna de la
 * matriz/ALIGN/SECRETS, pero Nodify sigue leyendo y escribiendo ese agente igual.
 */
export function AgentVisibilityMenu() {
  const t = useT();
  const { hidden, order, toggle, move } = useAgentVisibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Se listan en el orden preferido (el mismo que se refleja en las columnas).
  const ids = order.filter((id) => id in AGENT_META);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("visibility.button")}
        className="relative"
      >
        {hidden.length > 0 ? <EyeOff size={16} /> : <Eye size={16} />}
        {hidden.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 font-mono text-[9px] text-background">
            {hidden.length}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 z-50 mt-2 w-64"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <Card className="overflow-hidden p-0">
              <div className="border-border border-b px-3 py-2.5 text-[10px] tracking-[0.14em] text-muted-foreground">
                {t("visibility.title")}
              </div>
              <ul className="flex flex-col">
                {ids.map((id, i) => {
                  const isHidden = hidden.includes(id);
                  return (
                    <li key={id} className="flex items-center pr-1.5 hover:bg-elevated-2">
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-xs"
                      >
                        <AgentGlyph
                          id={id}
                          size={14}
                          className={isHidden ? "text-faint" : undefined}
                        />
                        <span className={`flex-1 ${isHidden ? "text-faint" : "text-foreground"}`}>
                          {AGENT_META[id].name}
                        </span>
                        {!isHidden && <Check size={13} className="text-success" />}
                      </button>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => move(id, -1)}
                          disabled={i === 0}
                          aria-label={t("visibility.moveUp")}
                          title={t("visibility.moveUp")}
                          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-faint hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(id, 1)}
                          disabled={i === ids.length - 1}
                          aria-label={t("visibility.moveDown")}
                          title={t("visibility.moveDown")}
                          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-faint hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="border-border border-t px-3 py-2.5 font-sans text-[11px] text-faint leading-relaxed">
                {t("visibility.hint")}
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
