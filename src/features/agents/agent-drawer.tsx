import { AgentGlyph } from "@/components/agent-glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog";
import { DetailDialog, type DetailTarget } from "@/features/mcps/detail-dialog";
import { useMcpActions } from "@/features/mcps/use-mcp-actions";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { listProviders, readRules, writeRules } from "@/lib/tauri";
import type { AgentScan, ProviderInfo } from "@/lib/types";
import { Blocks, Info, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { mutate } from "swr";

type Tab = "overview" | "providers" | "rules";

/** Panel de detalle deslizante por agente (drawer del mockup). */
export function AgentDrawer({ agent, onClose }: { agent: AgentScan; onClose: () => void }) {
  const meta = agentMeta(agent.id);
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const tabLabel: Record<Tab, string> = {
    overview: t("agent.tabOverview"),
    providers: t("agent.tabProviders"),
    rules: t("agent.tabRules"),
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 z-60 border-none bg-black/55"
        style={{ animation: "nf-fade .15s ease" }}
      />
      <aside
        className="fixed top-0 right-0 z-61 flex h-full w-[480px] max-w-[92vw] flex-col border-border-strong border-l bg-elevated"
        style={{ animation: "nf-slide .2s ease", boxShadow: "-24px 0 70px rgba(0,0,0,0.5)" }}
      >
        <header className="border-border border-b p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="avatar" className="h-10 w-10">
                <AgentGlyph id={agent.id} size={22} />
              </Badge>
              <div>
                <div className="font-semibold text-[17px]">{meta.name}</div>
                <div className="text-muted-foreground text-xs">
                  {agent.detected ? t("agent.detected") : t("agent.notDetected")}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
              <X size={15} />
            </Button>
          </div>
          <div className="mt-3 truncate text-[11px] text-faint" title={agent.configPath}>
            {agent.configPath}
          </div>
        </header>

        <nav className="flex border-border border-b px-6">
          {(["overview", "providers", "rules"] as Tab[]).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`border-b-2 px-4 py-3.5 font-mono text-[11px] tracking-[0.12em] uppercase ${
                tab === tb
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel[tb]}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {tab === "overview" && <Overview agent={agent} />}
          {tab === "providers" && <ProvidersTab agentId={agent.id} />}
          {tab === "rules" && <RulesTab agentId={agent.id} />}
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

/**
 * Fila-tarjeta (MCP o skill): el área principal abre el detalle; el botón de papelera
 * (visible al hover) lo elimina de este agente. Contenedor `div` con dos botones para no
 * anidar botones (HTML inválido).
 */
function RowCard({
  icon: Icon,
  name,
  subtitle,
  onClick,
  onRemove,
  removeLabel,
  disabled,
}: {
  icon: typeof Blocks;
  name: string;
  subtitle: string;
  onClick: () => void;
  onRemove: () => void;
  removeLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="group flex items-center rounded-[var(--radius-sm)] border border-border pr-1 hover:border-border-strong hover:bg-elevated-2">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
      >
        <Icon size={14} className="shrink-0 text-faint" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px]">{name}</div>
          <div className="truncate text-[11px] text-faint">{subtitle || "—"}</div>
        </div>
        <Info
          size={12}
          className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        title={removeLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-faint opacity-0 transition-colors hover:bg-surface hover:text-danger group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function Overview({ agent }: { agent: AgentScan }) {
  const t = useT();
  const dialog = useDialog();
  const actions = useMcpActions();
  const meta = agentMeta(agent.id);
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const removeMcp = async (name: string) => {
    const ok = await dialog.confirm({
      title: t("matrix.deleteMcpTitle"),
      message: t("matrix.deleteMcpMsg", { name, agent: meta.name }),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (ok) actions.remove(agent.id, name);
  };

  const removeSkill = async (name: string) => {
    const ok = await dialog.confirm({
      title: t("matrix.deleteSkillTitle"),
      message: t("matrix.deleteSkillMsg", { name, agent: meta.name }),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (ok) actions.removeSkill(agent.id, name);
  };

  const removeLabel = t("matrix.removeFrom", { agent: meta.name });

  return (
    <>
      <Section title={t("agent.model")}>
        <div className="text-sm">{agent.config.model ?? t("matrix.notSet")}</div>
      </Section>

      <Section title={t("agent.mcps", { n: agent.mcps.length })}>
        {agent.mcps.length === 0 ? (
          <p className="text-faint text-xs">—</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agent.mcps.map((m) => (
              <li key={m.name}>
                <RowCard
                  icon={Blocks}
                  name={m.name}
                  subtitle={m.target}
                  removeLabel={removeLabel}
                  disabled={actions.busy}
                  onClick={() =>
                    setDetail({ kind: "mcp", agentId: agent.id, mcp: m, presentIn: [agent.id] })
                  }
                  onRemove={() => removeMcp(m.name)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("agent.skills", { n: agent.skills.length })}>
        {agent.skills.length === 0 ? (
          <p className="text-faint text-xs">—</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agent.skills.map((s) => (
              <li key={s.name}>
                <RowCard
                  icon={Sparkles}
                  name={s.name}
                  subtitle={s.description}
                  removeLabel={removeLabel}
                  disabled={actions.busy}
                  onClick={() =>
                    setDetail({
                      kind: "skill",
                      agentId: agent.id,
                      name: s.name,
                      description: s.description,
                      presentIn: [agent.id],
                    })
                  }
                  onRemove={() => removeSkill(s.name)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {actions.error && <p className="mb-4 text-danger text-xs">{`> ${actions.error}`}</p>}

      <DetailDialog target={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function ProvidersTab({ agentId }: { agentId: string }) {
  const t = useT();
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    listProviders(agentId)
      .then(setProviders)
      .catch(() => setProviders([]));
  }, [agentId]);

  if (!providers) return <p className="text-faint text-xs">{t("common.loading")}</p>;

  return (
    <>
      <p className="mb-4 font-sans text-muted-foreground text-xs">{t("agent.providersIntro")}</p>
      {providers.length === 0 ? (
        <p className="text-faint text-xs">{t("agent.noProviders")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {providers.map((p) => (
            <li key={p.id} className="border border-border p-3 rounded-[var(--radius-sm)]">
              <div className="font-semibold text-[13px]">{p.name ?? p.id}</div>
              {p.baseUrl && <div className="mt-1 truncate text-faint text-xs">{p.baseUrl}</div>}
              {p.keyEnv && (
                <div className="mt-1 text-muted-foreground text-xs">
                  {t("agent.key")} <span className="text-warning">${`{${p.keyEnv}}`}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RulesTab({ agentId }: { agentId: string }) {
  const t = useT();
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    readRules(agentId)
      .then((c) => {
        setContent(c);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [agentId]);

  const save = async () => {
    setMsg(null);
    try {
      await writeRules(agentId, content);
      await mutate("scan-agents");
      setMsg(t("agent.saved"));
    } catch (e) {
      setMsg(t("common.error", { err: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!loaded}
        spellCheck={false}
        placeholder={t("agent.rulesPlaceholder")}
        className="min-h-64 flex-1 resize-none border border-border bg-surface p-3 font-mono text-muted-foreground text-xs leading-relaxed outline-none rounded-[var(--radius-sm)]"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-faint text-xs">{msg ? `> ${msg}` : ""}</span>
        <Button variant="accent" size="sm" onClick={save} disabled={!loaded}>
          <Save size={13} />
          {t("agent.saveRules")}
        </Button>
      </div>
    </div>
  );
}
