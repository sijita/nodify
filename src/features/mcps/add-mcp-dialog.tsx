import { AgentGlyph } from "@/components/agent-glyph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import type { McpInput } from "@/lib/tauri";
import { Check, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

interface Props {
  open: boolean;
  agentIds: string[];
  onClose: () => void;
  onSubmit: (agentId: string, mcp: McpInput) => void;
}

interface Pair {
  k: string;
  v: string;
}

/** Formulario para instalar un MCP manualmente en uno o más agentes. */
export function AddMcpDialog({ open, agentIds, onClose, onSubmit }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "http">("stdio");
  const [commandOrUrl, setCommandOrUrl] = useState("");
  const [argsText, setArgsText] = useState("");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [targets, setTargets] = useState<string[]>(agentIds);

  // Reset al abrir; cerrar con Escape.
  useEffect(() => {
    if (open) {
      setName("");
      setTransport("stdio");
      setCommandOrUrl("");
      setArgsText("");
      setPairs([]);
      setTargets(agentIds);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, agentIds, onClose]);

  const toggle = (id: string) =>
    setTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = name.trim() !== "" && commandOrUrl.trim() !== "" && targets.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const record = Object.fromEntries(
      pairs.map((p) => [p.k.trim(), p.v]).filter(([k]) => k !== ""),
    );
    const base = { name: name.trim(), enabled: true };
    const mcp: McpInput =
      transport === "http"
        ? { ...base, transport, url: commandOrUrl.trim(), headers: record }
        : {
            ...base,
            transport,
            command: commandOrUrl.trim(),
            args: argsText.split(/\s+/).filter(Boolean),
            env: record,
          };
    for (const id of targets) onSubmit(id, mcp);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <form onSubmit={submit}>
              <Card className="flex max-h-[85vh] flex-col p-0">
                <header className="flex items-center justify-between border-border border-b px-5 py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm tracking-[0.08em]">
                    <Plus size={15} /> {t("addMcp.title")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label={t("common.close")}
                  >
                    <X size={16} />
                  </Button>
                </header>

                <div className="flex flex-1 flex-col gap-4 overflow-auto p-5">
                  <Labeled label={t("addMcp.nameLabel")}>
                    <Input
                      className="w-full"
                      placeholder={t("addMcp.name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Labeled>

                  <Labeled label={t("addMcp.transportLabel")}>
                    <div className="flex gap-2">
                      {(["stdio", "http"] as const).map((tr) => (
                        <Button
                          key={tr}
                          type="button"
                          variant={transport === tr ? "accent" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setTransport(tr)}
                        >
                          {tr}
                        </Button>
                      ))}
                    </div>
                  </Labeled>

                  <Labeled
                    label={transport === "http" ? t("addMcp.urlLabel") : t("addMcp.commandLabel")}
                  >
                    <Input
                      className="w-full"
                      placeholder={transport === "http" ? t("addMcp.url") : t("addMcp.command")}
                      value={commandOrUrl}
                      onChange={(e) => setCommandOrUrl(e.target.value)}
                    />
                  </Labeled>

                  {transport === "stdio" && (
                    <Labeled label={t("addMcp.argsLabel")}>
                      <Input
                        className="w-full"
                        placeholder={t("addMcp.args")}
                        value={argsText}
                        onChange={(e) => setArgsText(e.target.value)}
                      />
                    </Labeled>
                  )}

                  <PairEditor
                    label={transport === "http" ? t("addMcp.headers") : t("addMcp.envVars")}
                    pairs={pairs}
                    setPairs={setPairs}
                  />

                  <Labeled label={t("addMcp.installIn")}>
                    <div className="flex flex-wrap gap-2">
                      {agentIds.map((id) => {
                        const on = targets.includes(id);
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant={on ? "accent" : "outline"}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => toggle(id)}
                          >
                            <AgentGlyph id={id} size={13} />
                            {agentMeta(id).name}
                            {on && <Check size={12} />}
                          </Button>
                        );
                      })}
                    </div>
                  </Labeled>
                </div>

                <footer className="flex justify-end gap-2 border-border border-t px-5 py-3">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="accent" size="sm" disabled={!valid}>
                    {t("addMcp.install")}
                  </Button>
                </footer>
              </Card>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Editor de pares clave/valor (env vars o headers) con añadir/quitar filas. */
function PairEditor({
  label,
  pairs,
  setPairs,
}: {
  label: string;
  pairs: Pair[];
  setPairs: (fn: (prev: Pair[]) => Pair[]) => void;
}) {
  const t = useT();
  const set = (i: number, patch: Partial<Pair>) =>
    setPairs((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.14em] text-muted-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPairs((prev) => [...prev, { k: "", v: "" }])}
        >
          <Plus size={12} /> {t("addMcp.addPair")}
        </Button>
      </div>
      {pairs.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: filas efímeras sin id estable
        <div key={i} className="flex gap-2">
          <Input
            size="sm"
            className="w-1/3"
            placeholder={t("addMcp.keyPh")}
            value={p.k}
            onChange={(e) => set(i, { k: e.target.value })}
          />
          <Input
            size="sm"
            className="flex-1"
            placeholder={t("addMcp.valuePh")}
            value={p.v}
            onChange={(e) => set(i, { v: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.close")}
            onClick={() => setPairs((prev) => prev.filter((_, j) => j !== i))}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
    </div>
  );
}
