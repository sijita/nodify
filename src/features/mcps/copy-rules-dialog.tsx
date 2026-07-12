import { AgentGlyph } from "@/components/agent-glyph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { readRules, writeRules } from "@/lib/tauri";
import type { AgentScan } from "@/lib/types";
import { FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { mutate } from "swr";

/**
 * Modal para copiar el contenido de reglas (`CLAUDE.md`/`AGENTS.md`) de otro agente al
 * agente `target`. Muestra los candidatos (los que tienen reglas) y una vista previa del
 * contenido antes de copiar, porque cada agente puede tener reglas distintas.
 */
export function CopyRulesDialog({
  target,
  agents,
  onClose,
}: {
  target: string | null;
  agents: AgentScan[];
  onClose: () => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reinicia el estado cada vez que se abre/cambia el destino (dependencia intencional).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset al cambiar `target`
  useEffect(() => {
    setSelected(null);
    setPreview(null);
    setErr(null);
    setBusy(false);
  }, [target]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  // Carga la vista previa de las reglas del agente origen seleccionado.
  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }
    setPreview(null);
    readRules(selected)
      .then(setPreview)
      .catch(() => setPreview(""));
  }, [selected]);

  const targetAgent = agents.find((a) => a.id === target);
  const sources = agents.filter((a) => a.id !== target && a.config.rulesPresent);

  const apply = async () => {
    if (!target || preview == null) return;
    setBusy(true);
    setErr(null);
    try {
      await writeRules(target, preview);
      await mutate("scan-agents");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {target && targetAgent && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <Card className="flex max-h-[80vh] flex-col p-0">
              <header className="flex items-center justify-between gap-3 border-border border-b px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <FileText size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    {t("copyRules.title", { agent: agentMeta(target).name })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label={t("common.close")}
                >
                  <X size={16} />
                </Button>
              </header>

              <div className="flex-1 overflow-auto p-5">
                {sources.length === 0 ? (
                  <p className="text-faint text-xs">{t("copyRules.none")}</p>
                ) : (
                  <>
                    <div className="mb-2 text-[10px] tracking-[0.14em] text-muted-foreground">
                      {t("copyRules.pick")}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {sources.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelected(a.id)}
                          className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-xs transition-colors ${
                            selected === a.id
                              ? "border-primary bg-elevated-2 text-foreground"
                              : "border-border text-muted-foreground hover:border-border-strong"
                          }`}
                        >
                          <AgentGlyph id={a.id} size={13} />
                          {agentMeta(a.id).name}
                        </button>
                      ))}
                    </div>

                    {targetAgent.config.rulesPresent && (
                      <p className="mb-3 text-warning text-xs">
                        {t("copyRules.overwrite", { agent: agentMeta(target).name })}
                      </p>
                    )}

                    <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground">
                      {t("copyRules.preview")}
                    </div>
                    <pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-[12px] text-muted-foreground leading-relaxed">
                      {selected ? (preview ?? t("common.loading")) : t("copyRules.selectPrompt")}
                    </pre>
                    {err && <p className="mt-2 text-danger text-xs">{`> ${err}`}</p>}
                  </>
                )}
              </div>

              <footer className="flex items-center justify-end gap-2 border-border border-t px-5 py-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={apply}
                  disabled={!selected || preview == null || busy || sources.length === 0}
                >
                  {t("copyRules.copy")}
                </Button>
              </footer>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
