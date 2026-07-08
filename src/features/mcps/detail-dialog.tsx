import { AgentGlyph } from "@/components/agent-glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { readSkill } from "@/lib/tauri";
import type { McpView } from "@/lib/types";
import { Blocks, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export type DetailTarget =
  | { kind: "skill"; agentId: string; name: string; description: string; presentIn: string[] }
  | { kind: "mcp"; agentId: string; mcp: McpView; presentIn: string[] };

/** Modal de detalle: para skills muestra el SKILL.md; para MCPs, su configuración. */
export function DetailDialog({
  target,
  onClose,
}: {
  target: DetailTarget | null;
  onClose: () => void;
}) {
  const t = useT();

  // Cerrar con Escape.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const name = target?.kind === "mcp" ? target.mcp.name : target?.name;
  const Icon = target?.kind === "mcp" ? Blocks : Sparkles;

  return (
    <AnimatePresence>
      {target && (
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
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">{name}</span>
                  <Badge variant="outline" className="text-faint">
                    {target.kind === "mcp" ? t("info.mcpTitle") : t("info.skillTitle")}
                  </Badge>
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
                {target.kind === "skill" ? (
                  <SkillBody target={target} />
                ) : (
                  <McpBody target={target} />
                )}
              </div>

              <footer className="flex flex-wrap items-center gap-2 border-border border-t px-5 py-3">
                <span className="text-[10px] tracking-[0.14em] text-faint">
                  {t("info.presentIn")}
                </span>
                {target.presentIn.map((id) => (
                  <Badge key={id} variant="outline" className="gap-1.5">
                    <AgentGlyph id={id} size={12} />
                    {agentMeta(id).name}
                  </Badge>
                ))}
              </footer>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-mono text-[13px] text-foreground">{children}</div>
    </div>
  );
}

function SkillBody({
  target,
}: {
  target: Extract<DetailTarget, { kind: "skill" }>;
}) {
  const t = useT();
  const [doc, setDoc] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setDoc(null);
    setErr(false);
    readSkill(target.agentId, target.name)
      .then(setDoc)
      .catch(() => setErr(true));
  }, [target.agentId, target.name]);

  return (
    <>
      <Field label={t("info.description")}>
        {target.description || <span className="text-faint">{t("info.noDescription")}</span>}
      </Field>
      <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground">
        {t("info.doc")}
      </div>
      <pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-[12px] text-muted-foreground leading-relaxed">
        {err ? t("info.loadError") : (doc ?? t("common.loading"))}
      </pre>
    </>
  );
}

function McpBody({ target }: { target: Extract<DetailTarget, { kind: "mcp" }> }) {
  const t = useT();
  const { mcp } = target;
  return (
    <>
      <Field label={t("info.transport")}>{mcp.transport}</Field>
      <Field label={mcp.transport === "http" ? t("info.endpoint") : t("info.command")}>
        <span className="break-all">{mcp.target || t("info.none")}</span>
      </Field>
      <Field label={t("info.status")}>
        {mcp.enabled === null
          ? t("info.unset")
          : mcp.enabled
            ? t("info.enabled")
            : t("info.disabled")}
      </Field>
      <Field label={t("info.secrets")}>
        {mcp.secrets.length === 0 ? (
          <span className="text-faint">{t("info.none")}</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {mcp.secrets.map((s) => (
              <li key={s.key} className="flex justify-between gap-3">
                <span>{s.key}</span>
                <span className="text-faint">{s.masked}</span>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <p className="mt-2 font-sans text-faint text-xs leading-relaxed">{t("info.mcpNote")}</p>
    </>
  );
}
