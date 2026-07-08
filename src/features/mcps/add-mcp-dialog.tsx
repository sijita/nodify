import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import type { McpInput } from "@/lib/tauri";
import { X } from "lucide-react";
import { type FormEvent, useState } from "react";

interface Props {
  agentIds: string[];
  onClose: () => void;
  onSubmit: (agentId: string, mcp: McpInput) => void;
}

/** Modal mínimo para instalar un MCP manualmente en uno o más agentes. */
export function AddMcpDialog({ agentIds, onClose, onSubmit }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "http">("stdio");
  const [commandOrUrl, setCommandOrUrl] = useState("");
  const [argsText, setArgsText] = useState("");
  const [targets, setTargets] = useState<string[]>(agentIds);

  const toggle = (id: string) =>
    setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targets.length === 0) return;
    const mcp: McpInput =
      transport === "http"
        ? { name: name.trim(), transport, url: commandOrUrl.trim() }
        : {
            name: name.trim(),
            transport,
            command: commandOrUrl.trim(),
            args: argsText.split(/\s+/).filter(Boolean),
          };
    for (const id of targets) onSubmit(id, mcp);
    onClose();
  };

  const field = "w-full border border-border bg-surface px-3 py-2 rounded-[var(--radius-sm)]";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4">
      <Card className="w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-[0.08em]">{t("addMcp.title")}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </Button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            className={field}
            placeholder={t("addMcp.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-2">
            {(["stdio", "http"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={transport === t ? "accent" : "outline"}
                size="sm"
                onClick={() => setTransport(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          <Input
            className={field}
            placeholder={transport === "http" ? t("addMcp.url") : t("addMcp.command")}
            value={commandOrUrl}
            onChange={(e) => setCommandOrUrl(e.target.value)}
          />
          {transport === "stdio" && (
            <Input
              className={field}
              placeholder={t("addMcp.args")}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
            />
          )}

          <div className="mt-1">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-muted-foreground">
              {t("addMcp.installIn")}
            </div>
            <div className="flex flex-wrap gap-2">
              {agentIds.map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant={targets.includes(id) ? "accent" : "outline"}
                  size="sm"
                  onClick={() => toggle(id)}
                >
                  {agentMeta(id).name}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="accent" size="sm">
              {t("addMcp.install")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
