import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDialog } from "@/components/ui/dialog";
import { type Status, StatusIndicator } from "@/components/ui/status-indicator";
import { AgentDrawer } from "@/features/agents/agent-drawer";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import type { AgentScan } from "@/lib/types";
import { List, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { AddMcpDialog } from "./add-mcp-dialog";
import { StatCards } from "./stat-cards";
import { useMcpActions } from "./use-mcp-actions";
import { useAgentScan } from "./use-mcps";

interface Cell {
  status: Status;
  value: string;
}

/**
 * Contenido animado de una celda. Al cambiar `status`/`changeKey` (instalar, eliminar,
 * compartir) se re-monta y hace un "pop" con spring, para que la mutación sea visible.
 */
function CellBody({
  status,
  changeKey,
  children,
}: {
  status: Status;
  changeKey: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      key={`${status}:${changeKey}`}
      className="flex flex-col gap-1.5"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
    >
      <StatusIndicator status={status} />
      {children}
    </motion.div>
  );
}

/** Estado de un MCP en un agente, comparando su `target` con el resto de agentes. */
function cellFor(agent: AgentScan, name: string, targetsByAgent: Map<string, string>): Cell {
  const mcp = agent.mcps.find((m) => m.name === name);
  if (!mcp) return { status: "missing", value: "not set" };
  const distinct = new Set(targetsByAgent.values());
  const status: Status = distinct.size > 1 ? "differs" : "installed";
  return { status, value: mcp.target };
}

export function McpMatrix({ query }: { query: string }) {
  const { agents, error, isLoading } = useAgentScan();
  const actions = useMcpActions();
  const dialog = useDialog();
  const t = useT();
  const showVal = (v: string) => (v === "not set" ? t("matrix.notSet") : v);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const agentIds = agents.map((a) => a.id);
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  const { rows, skillRows, configRows, stats } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const names = new Set<string>();
    for (const a of agents) for (const m of a.mcps) names.add(m.name);
    const filtered = [...names].filter((n) => !q || n.includes(q)).sort();

    const rows = filtered.map((name) => {
      // targets de los agentes que SÍ tienen este MCP (para detectar divergencia)
      const targets = new Map<string, string>();
      for (const a of agents) {
        const m = a.mcps.find((x) => x.name === name);
        if (m) targets.set(a.id, m.target);
      }
      const cells = agents.map((a) => cellFor(a, name, targets));
      return { name, cells };
    });

    // banda de Skills (read-only): presente → installed, ausente → missing
    const skillNames = new Set<string>();
    for (const a of agents) for (const s of a.skills) skillNames.add(s.name);
    const skillRows = [...skillNames]
      .filter((n) => !q || n.includes(q))
      .sort()
      .map((name) => {
        const cells: Cell[] = agents.map((a) => {
          const s = a.skills.find((x) => x.name === name);
          if (!s) return { status: "missing", value: "not set" };
          return { status: s.enabled ? "installed" : "missing", value: s.description || "—" };
        });
        return { name, cells };
      });

    // banda CONFIG (read-only): modelo por defecto + reglas
    const models = agents.map((a) => a.config.model).filter((m): m is string => !!m);
    const modelsDiffer = new Set(models).size > 1;
    const configRows = [
      {
        name: "default model",
        cells: agents.map<Cell>((a) => {
          if (!a.config.model) return { status: "missing", value: "not set" };
          return { status: modelsDiffer ? "differs" : "installed", value: a.config.model };
        }),
      },
      {
        name: "rules",
        cells: agents.map<Cell>((a) => ({
          status: a.config.rulesPresent ? "installed" : "missing",
          value: a.config.rulesPath.split("/").pop() ?? a.config.rulesPath,
        })),
      },
    ].filter((r) => !q || r.name.includes(q));

    const differs = rows.filter((r) => r.cells.some((c) => c.status === "differs")).length;
    const errors = agents.filter((a) => a.error).length;
    const stats = {
      agents: agents.filter((a) => a.detected).length,
      mcps: filtered.length,
      differs,
      errors,
    };
    return { rows, skillRows, configRows, stats };
  }, [agents, query]);

  if (isLoading)
    return <p className="text-muted-foreground text-sm">{t("common.scanningAgents")}</p>;
  if (error)
    return <p className="text-danger text-sm">{t("common.scanError", { err: String(error) })}</p>;

  const cols = `250px repeat(${agents.length}, minmax(0,1fr))`;

  return (
    <div className="mx-auto max-w-[1180px]">
      <StatCards {...stats} />

      {/* leyenda */}
      <div className="mb-3 flex flex-wrap gap-5">
        {(["installed", "missing", "differs", "error"] as Status[]).map((s) => (
          <StatusIndicator key={s} status={s} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          {/* esquina + header-cards de agente */}
          <div className="flex flex-col justify-end border-border border-r border-b bg-elevated p-4">
            <span className="text-[10px] tracking-[0.12em] text-faint">
              {t("matrix.configAgent")}
            </span>
          </div>
          {agents.map((a) => {
            const meta = agentMeta(a.id);
            const ok = a.mcps.length;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                title={t("matrix.viewDetail", { agent: meta.name })}
                className="cursor-pointer border-border border-r border-b bg-elevated p-4 text-left last:border-r-0 hover:bg-elevated-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface font-semibold text-xs tracking-[0.04em]">
                    {meta.badge}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm">{meta.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {a.detected ? t("matrix.detected") : t("matrix.notDetected")}
                    </div>
                  </div>
                </div>
                <div className="mt-3 truncate text-[11px] text-faint" title={a.configPath}>
                  {a.configPath}
                </div>
                <div className="mt-3 flex gap-3 text-[11px]">
                  <span className="text-success">✓ {ok}</span>
                  {a.error && <span className="text-danger">✕ 1</span>}
                </div>
              </button>
            );
          })}

          {/* banda MCP SERVERS */}
          <div className="col-span-full flex items-center justify-between border-border border-b bg-elevated px-4 py-2">
            <span className="flex items-center gap-2.5 font-semibold text-[11px] tracking-[0.16em] text-muted-foreground">
              <List size={14} />
              {t("matrix.mcpServers")}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-faint">{rows.length}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdd(true)}
                disabled={agentIds.length === 0}
              >
                <Plus size={13} />
                MCP
              </Button>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="col-span-full px-4 py-6 text-center text-faint text-xs">
              {t("matrix.noMcps")}
            </div>
          )}

          {rows.map((row) => (
            <div key={row.name} className="contents">
              <div className="flex flex-col gap-0.5 border-border border-r border-b p-4">
                <span className="text-foreground text-[13px]">{row.name}</span>
                <span className="text-[10px] tracking-[0.08em] text-faint">
                  {t("matrix.mcpTag")}
                </span>
              </div>
              {row.cells.map((cell, i) => {
                const agent = agents[i];
                const meta = agentMeta(agent.id);
                const installed = cell.status === "installed" || cell.status === "differs";
                const source = installed
                  ? undefined
                  : agents.find(
                      (a) => a.id !== agent.id && a.mcps.some((m) => m.name === row.name),
                    );
                const actionable = installed || !!source;

                const onClick = async () => {
                  if (installed) {
                    const ok = await dialog.confirm({
                      title: t("matrix.deleteMcpTitle"),
                      message: t("matrix.deleteMcpMsg", { name: row.name, agent: meta.name }),
                      confirmLabel: t("common.delete"),
                      danger: true,
                    });
                    if (ok) actions.remove(agent.id, row.name);
                  } else if (source) {
                    actions.share(source.id, agent.id, row.name);
                  }
                };

                const title = installed
                  ? t("matrix.removeFrom", { agent: meta.name })
                  : source
                    ? t("matrix.shareFrom", { agent: agentMeta(source.id).name })
                    : "";
                const Tag = actionable ? "button" : "div";

                return (
                  <Tag
                    key={agent.id}
                    type={actionable ? "button" : undefined}
                    onClick={actionable ? onClick : undefined}
                    title={title}
                    disabled={actionable ? actions.busy : undefined}
                    className={`flex min-w-0 flex-col gap-1.5 border-border border-r border-b p-4 text-left last:border-r-0 ${
                      actionable ? "cursor-pointer hover:bg-elevated-2" : ""
                    }`}
                  >
                    <CellBody status={cell.status} changeKey={source ? "share" : cell.value}>
                      <div className="truncate text-muted-foreground text-xs">
                        {source ? t("matrix.shareHere") : showVal(cell.value)}
                      </div>
                    </CellBody>
                  </Tag>
                );
              })}
            </div>
          ))}

          {/* banda SKILLS (solo lectura; compartir/enable llegan luego) */}
          <div className="col-span-full flex items-center justify-between border-border border-b bg-elevated px-4 py-2">
            <span className="flex items-center gap-2.5 font-semibold text-[11px] tracking-[0.16em] text-muted-foreground">
              <Sparkles size={14} />
              {t("matrix.skills")}
            </span>
            <span className="text-[11px] text-faint">{skillRows.length}</span>
          </div>

          {skillRows.map((row) => (
            <div key={row.name} className="contents">
              <div className="flex flex-col gap-0.5 border-border border-r border-b p-4">
                <span className="text-foreground text-[13px]">{row.name}</span>
                <span className="text-[10px] tracking-[0.08em] text-faint">
                  {t("matrix.skillTag")}
                </span>
              </div>
              {row.cells.map((cell, i) => {
                const agent = agents[i];
                const meta = agentMeta(agent.id);
                const installed = cell.status === "installed";
                const source = installed
                  ? undefined
                  : agents.find(
                      (a) => a.id !== agent.id && a.skills.some((s) => s.name === row.name),
                    );
                const actionable = installed || !!source;

                const onClick = async () => {
                  if (installed) {
                    const ok = await dialog.confirm({
                      title: t("matrix.deleteSkillTitle"),
                      message: t("matrix.deleteSkillMsg", { name: row.name, agent: meta.name }),
                      confirmLabel: t("common.delete"),
                      danger: true,
                    });
                    if (ok) actions.removeSkill(agent.id, row.name);
                  } else if (source) {
                    actions.shareSkill(source.id, agent.id, row.name);
                  }
                };
                const Tag = actionable ? "button" : "div";

                return (
                  <Tag
                    key={agent.id}
                    type={actionable ? "button" : undefined}
                    onClick={actionable ? onClick : undefined}
                    disabled={actionable ? actions.busy : undefined}
                    title={
                      installed
                        ? t("matrix.removeFrom", { agent: meta.name })
                        : source
                          ? t("matrix.shareFrom", { agent: agentMeta(source.id).name })
                          : ""
                    }
                    className={`flex min-w-0 flex-col gap-1.5 border-border border-r border-b p-4 text-left last:border-r-0 ${
                      actionable ? "cursor-pointer hover:bg-elevated-2" : ""
                    }`}
                  >
                    <CellBody status={cell.status} changeKey={source ? "share" : cell.value}>
                      <div className="truncate text-muted-foreground text-xs">
                        {source ? t("matrix.shareHere") : showVal(cell.value)}
                      </div>
                    </CellBody>
                  </Tag>
                );
              })}
            </div>
          ))}

          {/* banda CONFIG (solo lectura) */}
          <div className="col-span-full flex items-center justify-between border-border border-b bg-elevated px-4 py-2">
            <span className="flex items-center gap-2.5 font-semibold text-[11px] tracking-[0.16em] text-muted-foreground">
              <SlidersHorizontal size={14} />
              {t("matrix.config")}
            </span>
            <span className="text-[11px] text-faint">{configRows.length}</span>
          </div>

          {configRows.map((row) => (
            <div key={row.name} className="contents">
              <div className="flex flex-col gap-0.5 border-border border-r border-b p-4">
                <span className="text-foreground text-[13px]">
                  {row.name === "default model" ? t("matrix.defaultModel") : t("matrix.rules")}
                </span>
                <span className="text-[10px] tracking-[0.08em] text-faint">
                  {t("matrix.configTag")}
                </span>
              </div>
              {row.cells.map((cell, i) => {
                const agent = agents[i];
                const editable = row.name === "default model";

                const onClick = async () => {
                  const current = cell.value === "not set" ? "" : cell.value;
                  const next = await dialog.prompt({
                    title: t("matrix.modelTitle"),
                    message: t("matrix.modelMsg", { agent: agentMeta(agent.id).name }),
                    defaultValue: current,
                    placeholder: t("matrix.modelPlaceholder"),
                  });
                  if (next?.trim()) actions.setModel(agent.id, next.trim());
                };
                const Tag = editable ? "button" : "div";

                return (
                  <Tag
                    key={agent.id}
                    type={editable ? "button" : undefined}
                    onClick={editable ? onClick : undefined}
                    disabled={editable ? actions.busy : undefined}
                    title={editable ? t("matrix.editModel") : ""}
                    className={`flex min-w-0 flex-col gap-1.5 border-border border-r border-b p-4 text-left last:border-r-0 ${
                      editable ? "cursor-pointer hover:bg-elevated-2" : ""
                    }`}
                  >
                    <CellBody status={cell.status} changeKey={cell.value}>
                      <div className="truncate text-muted-foreground text-xs">
                        {showVal(cell.value)}
                      </div>
                    </CellBody>
                  </Tag>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {actions.error && <p className="mt-3 text-danger text-xs">{`> ${actions.error}`}</p>}

      <p className="mt-3.5 font-sans text-faint text-xs">{t("matrix.hint")}</p>

      {showAdd && (
        <AddMcpDialog
          agentIds={agentIds}
          onClose={() => setShowAdd(false)}
          onSubmit={(agentId, mcp) => actions.install(agentId, mcp)}
        />
      )}

      {selectedAgent && <AgentDrawer agent={selectedAgent} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
