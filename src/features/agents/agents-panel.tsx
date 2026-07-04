import { Card } from "@/components/ui/card";
import { agentMeta } from "@/lib/agents";
import { Bot } from "lucide-react";
import { useState } from "react";
import { useAgentScan } from "../mcps/use-mcps";
import { AgentDrawer } from "./agent-drawer";

/**
 * Vista AGENTS: una tarjeta por agente detectado. Clic → abre el drawer de detalle
 * (overview / proveedores / reglas), el mismo que abren las cabeceras de la MATRIX.
 */
export function AgentsPanel() {
  const { agents, error, isLoading } = useAgentScan();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  if (isLoading) return <p className="text-muted-foreground text-sm">{"> escaneando agentes…"}</p>;
  if (error)
    return <p className="text-danger text-sm">{`> error al escanear: ${String(error)}`}</p>;

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 flex items-center gap-2 font-semibold text-sm tracking-[0.08em]">
        <Bot size={15} /> AGENTS
      </h1>
      <p className="mb-4 font-sans text-muted-foreground text-xs">
        Detalle por agente. Clic en una tarjeta para ver modelo, MCPs, skills, proveedores y editar
        reglas.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => {
          const meta = agentMeta(a.id);
          return (
            <Card key={a.id} className="p-0">
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                title={`Ver detalle de ${meta.name}`}
                className="flex w-full cursor-pointer flex-col gap-4 p-5 text-left hover:bg-elevated-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface font-semibold text-xs tracking-[0.04em]">
                    {meta.badge}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm">{meta.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {a.detected ? "detectado" : "no detectado"}
                    </div>
                  </div>
                </div>

                <div className="truncate text-[11px] text-faint" title={a.configPath}>
                  {a.configPath}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
                  <span className="text-muted-foreground">
                    modelo <span className="text-foreground">{a.config.model ?? "—"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    mcps <span className="text-foreground">{a.mcps.length}</span>
                  </span>
                  <span className="text-muted-foreground">
                    skills <span className="text-foreground">{a.skills.length}</span>
                  </span>
                  <span className="text-muted-foreground">
                    reglas{" "}
                    <span className={a.config.rulesPresent ? "text-success" : "text-faint"}>
                      {a.config.rulesPresent ? "✓" : "–"}
                    </span>
                  </span>
                </div>

                {a.error && <div className="text-danger text-[11px]">{`✕ ${a.error}`}</div>}
              </button>
            </Card>
          );
        })}
        {agents.length === 0 && <p className="text-faint text-xs">{"> ningún agente detectado"}</p>}
      </div>

      {selectedAgent && <AgentDrawer agent={selectedAgent} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
