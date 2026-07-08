import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { listProviders, setEnv } from "@/lib/tauri";
import type { ProviderInfo } from "@/lib/types";
import { KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import { useAgentScan } from "../mcps/use-mcps";

/**
 * Vista SECRETS (compact): agrega los **nombres** de env var referenciados en el
 * sistema (env/headers de MCPs + `key_env` de proveedores) por todos los agentes.
 * Set-y-propaga escribe el valor donde se puede (Claude `settings.env`); Codex/OpenCode
 * leen del shell. Sin almacén propio (ADR-0002/0004): el valor solo va a los archivos.
 */
export function SecretsPanel() {
  const { agents } = useAgentScan();
  const t = useT();
  const [providers, setProviders] = useState<Record<string, ProviderInfo[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(agents.map((a) => listProviders(a.id).then((p) => [a.id, p] as const)))
      .then((pairs) => setProviders(Object.fromEntries(pairs)))
      .catch(() => setProviders({}));
  }, [agents]);

  const keys = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (k: string, agent: string) => {
      const set = map.get(k) ?? new Set<string>();
      set.add(agent);
      map.set(k, set);
    };
    for (const a of agents) {
      for (const m of a.mcps) for (const s of m.secrets) add(s.key, a.id);
      for (const p of providers[a.id] ?? []) if (p.keyEnv) add(p.keyEnv, a.id);
    }
    return [...map.entries()]
      .map(([key, set]) => ({ key, agents: [...set] }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [agents, providers]);

  const apply = async (key: string) => {
    const value = values[key]?.trim();
    if (!value) return;
    setMsg(null);
    try {
      await setEnv("claude-code", key, value);
      await mutate("scan-agents");
      setValues((v) => ({ ...v, [key]: "" }));
      setMsg(t("secrets.written", { key }));
    } catch (e) {
      setMsg(t("common.error", { err: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 flex items-center gap-2 font-semibold text-sm tracking-[0.08em]">
        <KeyRound size={15} /> {t("secrets.title")}
      </h1>
      <p className="mb-4 font-sans text-muted-foreground text-xs">{t("secrets.intro")}</p>

      <Card>
        {keys.length === 0 && <p className="p-4 text-faint text-xs">{t("secrets.none")}</p>}
        {keys.map(({ key, agents: refs }) => (
          <div
            key={key}
            className="flex flex-wrap items-center gap-3 border-border border-b px-4 py-2.5 last:border-b-0"
          >
            <span className="min-w-[200px] flex-1 truncate font-mono text-[13px]">{key}</span>
            <div className="flex gap-1">
              {refs.map((id) => (
                <Badge key={id} variant="outline">
                  {agentMeta(id).badge}
                </Badge>
              ))}
            </div>
            <Input
              type="password"
              placeholder={t("secrets.value")}
              value={values[key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="w-40 border border-border bg-surface px-2 py-1.5 rounded-[var(--radius-sm)]"
            />
            <Button variant="outline" size="sm" onClick={() => apply(key)} disabled={!values[key]}>
              {t("secrets.setClaude")}
            </Button>
          </div>
        ))}
      </Card>

      {msg && <p className="mt-3 text-muted-foreground text-xs">{`> ${msg}`}</p>}
    </div>
  );
}
