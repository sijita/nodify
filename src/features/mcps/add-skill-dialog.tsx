import { AgentGlyph } from "@/components/agent-glyph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { Check, Lightbulb, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

interface Props {
  open: boolean;
  agentIds: string[];
  onClose: () => void;
  onCreate: (agentId: string, name: string, content: string) => void;
}

type Mode = "guided" | "paste";

const textarea =
  "min-h-28 w-full resize-y border border-border bg-surface p-3 font-mono text-[12px] text-foreground leading-relaxed outline-none rounded-[var(--radius-sm)] focus:border-border-strong";

/** Formulario para crear un skill nuevo (guiado con tips, o pegando un SKILL.md existente). */
export function AddSkillDialog({ open, agentIds, onClose, onCreate }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("guided");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [raw, setRaw] = useState("");
  const [targets, setTargets] = useState<string[]>(agentIds);

  useEffect(() => {
    if (open) {
      setName("");
      setMode("guided");
      setDescription("");
      setBody("");
      setRaw("");
      setTargets(agentIds);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, agentIds, onClose]);

  const toggle = (id: string) =>
    setTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cleanName = name.trim();
  const nameOk =
    cleanName !== "" && !cleanName.includes("/") && !cleanName.includes("\\") && cleanName !== "..";
  const valid = nameOk && targets.length > 0 && (mode === "guided" || raw.trim() !== "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const content =
      mode === "guided"
        ? `---\nname: ${cleanName}\ndescription: ${description.trim()}\n---\n\n${body.trim()}\n`
        : raw;
    for (const id of targets) onCreate(id, cleanName, content);
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
                    <Sparkles size={15} /> {t("addSkill.title")}
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
                  <Labeled label={t("addSkill.nameLabel")}>
                    <Input
                      className="w-full"
                      placeholder={t("addSkill.namePh")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Labeled>

                  <div className="flex gap-2">
                    {(["guided", "paste"] as const).map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={mode === m ? "accent" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setMode(m)}
                      >
                        {m === "guided" ? t("addSkill.modeGuided") : t("addSkill.modePaste")}
                      </Button>
                    ))}
                  </div>

                  {mode === "guided" ? (
                    <>
                      <Labeled label={t("addSkill.descriptionLabel")}>
                        <Input
                          className="w-full"
                          placeholder={t("addSkill.descriptionPh")}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </Labeled>
                      <Labeled label={t("addSkill.bodyLabel")}>
                        <textarea
                          className={textarea}
                          placeholder={t("addSkill.bodyPh")}
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          spellCheck={false}
                        />
                      </Labeled>
                      <div className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-muted-foreground">
                          <Lightbulb size={12} /> {t("addSkill.tipsTitle")}
                        </div>
                        <ul className="flex list-disc flex-col gap-1 pl-4 font-sans text-[11px] text-faint leading-relaxed">
                          <li>{t("addSkill.tip1")}</li>
                          <li>{t("addSkill.tip2")}</li>
                          <li>{t("addSkill.tip3")}</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Labeled label={t("addSkill.rawLabel")}>
                      <textarea
                        className={`${textarea} min-h-52`}
                        placeholder={t("addSkill.rawPh")}
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                        spellCheck={false}
                      />
                    </Labeled>
                  )}

                  <Labeled label={t("addSkill.installIn")}>
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
                    {t("addSkill.create")}
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
