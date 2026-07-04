import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDialog } from "@/components/ui/dialog";
import { agentMeta } from "@/lib/agents";
import { setModel, shareMcp, shareSkill } from "@/lib/tauri";
import type { AgentScan } from "@/lib/types";
import { GitMerge } from "lucide-react";
import { useMemo, useState } from "react";
import { mutate } from "swr";
import { useAgentScan } from "../mcps/use-mcps";

interface Plan {
  target: AgentScan;
  mcpsAdd: string[]; // MCPs que el destino no tiene
  mcpsUpdate: string[]; // MCPs que difieren del origen
  skillsAdd: string[]; // skills que el destino no tiene
  modelTo: string | null; // modelo a fijar (si difiere del origen)
  total: number;
}

/** Calcula qué cambiaría en `target` para igualar a `source` (nunca elimina extras). */
function planFor(source: AgentScan, target: AgentScan): Plan {
  const targetMcps = new Map(target.mcps.map((m) => [m.name, m]));
  const mcpsAdd: string[] = [];
  const mcpsUpdate: string[] = [];
  for (const m of source.mcps) {
    const t = targetMcps.get(m.name);
    if (!t) mcpsAdd.push(m.name);
    else if (t.target !== m.target) mcpsUpdate.push(m.name);
  }
  const have = new Set(target.skills.map((s) => s.name));
  const skillsAdd = source.skills.filter((s) => !have.has(s.name)).map((s) => s.name);
  const modelTo =
    source.config.model && source.config.model !== target.config.model ? source.config.model : null;
  return {
    target,
    mcpsAdd,
    mcpsUpdate,
    skillsAdd,
    modelTo,
    total: mcpsAdd.length + mcpsUpdate.length + skillsAdd.length + (modelTo ? 1 : 0),
  };
}

/**
 * Vista ALIGN: elige un agente como fuente de verdad y propaga sus MCPs / skills /
 * modelo a los demás con un clic. Resuelve las divergencias que la MATRIX solo expone.
 * Es aditivo: nunca elimina lo que el destino tenga de más.
 */
export function AgentsPanel() {
  const { agents, error, isLoading } = useAgentScan();
  const dialog = useDialog();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id del destino aplicándose ("*" = todos)
  const [msg, setMsg] = useState<string | null>(null);

  // Fuente efectiva: la elegida, o por defecto el primer agente detectado.
  const effectiveSourceId = sourceId ?? agents.find((a) => a.detected)?.id ?? agents[0]?.id ?? null;
  const source = agents.find((a) => a.id === effectiveSourceId) ?? null;
  const plans = useMemo(
    () => (source ? agents.filter((a) => a.id !== source.id).map((t) => planFor(source, t)) : []),
    [source, agents],
  );

  const applyPlan = async (plan: Plan): Promise<number> => {
    if (!source) return 0;
    for (const name of [...plan.mcpsAdd, ...plan.mcpsUpdate])
      await shareMcp(source.id, plan.target.id, name);
    for (const name of plan.skillsAdd) await shareSkill(source.id, plan.target.id, name);
    if (plan.modelTo) await setModel(plan.target.id, plan.modelTo);
    return plan.total;
  };

  const align = async (plan: Plan) => {
    if (!source || plan.total === 0) return;
    const ok = await dialog.confirm({
      title: "Alinear agente",
      message: `Aplicar ${plan.total} cambio(s) a ${agentMeta(plan.target.id).name} desde ${agentMeta(source.id).name}. No se elimina nada de lo que ya tenga.`,
      confirmLabel: "Alinear",
    });
    if (!ok) return;
    setBusy(plan.target.id);
    setMsg(null);
    try {
      const n = await applyPlan(plan);
      await mutate("scan-agents");
      setMsg(`${agentMeta(plan.target.id).name}: ${n} cambio(s) aplicados`);
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const alignAll = async () => {
    if (!source) return;
    const pending = plans.filter((p) => p.total > 0);
    const totalChanges = pending.reduce((s, p) => s + p.total, 0);
    if (totalChanges === 0) return;
    const ok = await dialog.confirm({
      title: "Alinear todos",
      message: `Propagar ${totalChanges} cambio(s) de ${agentMeta(source.id).name} a ${pending.length} agente(s). No se elimina nada.`,
      confirmLabel: "Alinear todos",
    });
    if (!ok) return;
    setBusy("*");
    setMsg(null);
    try {
      let n = 0;
      for (const p of pending) n += await applyPlan(p);
      await mutate("scan-agents");
      setMsg(`${n} cambio(s) aplicados en ${pending.length} agente(s)`);
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">{"> escaneando agentes…"}</p>;
  if (error)
    return <p className="text-danger text-sm">{`> error al escanear: ${String(error)}`}</p>;

  const pendingCount = plans.reduce((s, p) => s + p.total, 0);

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 flex items-center gap-2 font-semibold text-sm tracking-[0.08em]">
        <GitMerge size={15} /> ALIGN
      </h1>
      <p className="mb-4 font-sans text-muted-foreground text-xs">
        Elige un agente como <strong>fuente de verdad</strong> y propaga sus MCPs, skills y modelo a
        los demás. Es aditivo: nunca elimina lo que un destino tenga de más.
      </p>

      {/* selector de fuente */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.12em] text-muted-foreground">FUENTE</span>
        {agents.map((a) => (
          <Button
            key={a.id}
            variant={effectiveSourceId === a.id ? "accent" : "outline"}
            size="sm"
            onClick={() => setSourceId(a.id)}
          >
            {agentMeta(a.id).name}
          </Button>
        ))}
        <div className="ml-auto">
          <Button
            variant="accent"
            size="sm"
            onClick={alignAll}
            disabled={!!busy || pendingCount === 0}
          >
            <GitMerge size={13} />
            {busy === "*" ? "alineando…" : `Alinear todos (${pendingCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const meta = agentMeta(plan.target.id);
          const aligned = plan.total === 0;
          return (
            <Card key={plan.target.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface font-semibold text-xs tracking-[0.04em]">
                  {meta.badge}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-sm">{meta.name}</div>
                  <div className="text-faint text-xs">
                    {plan.target.detected ? "detectado" : "no detectado"}
                  </div>
                </div>
              </div>

              {aligned ? (
                <p className="text-success text-xs">{"✓ ya alineado con la fuente"}</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-xs">
                  {plan.mcpsAdd.length > 0 && (
                    <PlanLine label="+ mcps" items={plan.mcpsAdd} tone="text-success" />
                  )}
                  {plan.mcpsUpdate.length > 0 && (
                    <PlanLine label="~ mcps" items={plan.mcpsUpdate} tone="text-warning" />
                  )}
                  {plan.skillsAdd.length > 0 && (
                    <PlanLine label="+ skills" items={plan.skillsAdd} tone="text-success" />
                  )}
                  {plan.modelTo && (
                    <li className="flex gap-2">
                      <span className="w-[68px] flex-shrink-0 text-warning">~ modelo</span>
                      <span className="truncate text-muted-foreground">{plan.modelTo}</span>
                    </li>
                  )}
                </ul>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => align(plan)}
                disabled={!!busy || aligned}
                className="mt-auto"
              >
                {busy === plan.target.id ? "alineando…" : `Alinear (${plan.total})`}
              </Button>
            </Card>
          );
        })}
        {plans.length === 0 && (
          <p className="text-faint text-xs">{"> se necesitan al menos 2 agentes"}</p>
        )}
      </div>

      {msg && <p className="mt-3 text-muted-foreground text-xs">{`> ${msg}`}</p>}
    </div>
  );
}

function PlanLine({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <li className="flex gap-2">
      <span className={`w-[68px] flex-shrink-0 ${tone}`}>{label}</span>
      <span className="truncate text-muted-foreground" title={items.join(", ")}>
        {items.join(", ")}
      </span>
    </li>
  );
}
