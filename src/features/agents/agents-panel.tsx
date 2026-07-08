import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDialog } from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { agentMeta } from "@/lib/agents";
import { setModel, shareMcp, shareSkill } from "@/lib/tauri";
import type { AgentScan } from "@/lib/types";
import { GitMerge } from "lucide-react";
import { motion } from "motion/react";
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
  const t = useT();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id del destino aplicándose ("*" = todos)
  const [msg, setMsg] = useState<string | null>(null);

  // Fuente efectiva: la elegida, o por defecto el primer agente detectado.
  const effectiveSourceId = sourceId ?? agents.find((a) => a.detected)?.id ?? agents[0]?.id ?? null;
  const source = agents.find((a) => a.id === effectiveSourceId) ?? null;
  const plans = useMemo(
    () => (source ? agents.filter((a) => a.id !== source.id).map((tg) => planFor(source, tg)) : []),
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
      title: t("align.confirmOneTitle"),
      message: t("align.confirmOneMsg", {
        n: plan.total,
        target: agentMeta(plan.target.id).name,
        source: agentMeta(source.id).name,
      }),
      confirmLabel: t("common.confirm"),
    });
    if (!ok) return;
    setBusy(plan.target.id);
    setMsg(null);
    try {
      const n = await applyPlan(plan);
      await mutate("scan-agents");
      setMsg(t("align.doneOne", { target: agentMeta(plan.target.id).name, n }));
    } catch (e) {
      setMsg(t("common.error", { err: e instanceof Error ? e.message : String(e) }));
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
      title: t("align.confirmAllTitle"),
      message: t("align.confirmAllMsg", {
        n: totalChanges,
        source: agentMeta(source.id).name,
        count: pending.length,
      }),
      confirmLabel: t("align.confirmAllTitle"),
    });
    if (!ok) return;
    setBusy("*");
    setMsg(null);
    try {
      let n = 0;
      for (const p of pending) n += await applyPlan(p);
      await mutate("scan-agents");
      setMsg(t("align.doneAll", { n, count: pending.length }));
    } catch (e) {
      setMsg(t("common.error", { err: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading)
    return <p className="text-muted-foreground text-sm">{t("common.scanningAgents")}</p>;
  if (error)
    return <p className="text-danger text-sm">{t("common.scanError", { err: String(error) })}</p>;

  const pendingCount = plans.reduce((s, p) => s + p.total, 0);
  const inSync = plans.filter((p) => p.total === 0).length;

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 flex items-center gap-2 font-semibold text-sm tracking-[0.08em]">
        <GitMerge size={15} /> {t("align.title")}
      </h1>
      <p className="mb-4 font-sans text-muted-foreground text-xs">{t("align.intro")}</p>

      {source && (
        <SourceHero
          source={source}
          agents={agents}
          onPick={setSourceId}
          pendingCount={pendingCount}
          inSync={inSync}
          totalTargets={plans.length}
          busy={busy}
          onAlignAll={alignAll}
        />
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {source &&
          plans.map((plan, i) => (
            <DiffPanel
              key={plan.target.id}
              plan={plan}
              index={i}
              sourceBadge={agentMeta(source.id).badge}
              busy={busy === plan.target.id}
              disabled={!!busy}
              onAlign={() => align(plan)}
            />
          ))}
        {plans.length === 0 && <p className="text-faint text-xs">{t("align.needTwo")}</p>}
      </div>

      {msg && <p className="mt-3 text-muted-foreground text-xs">{`> ${msg}`}</p>}
    </div>
  );
}

/** Panel de fuente: selector + inventario + barra de estado global de sincronía. */
function SourceHero({
  source,
  agents,
  onPick,
  pendingCount,
  inSync,
  totalTargets,
  busy,
  onAlignAll,
}: {
  source: AgentScan;
  agents: AgentScan[];
  onPick: (id: string) => void;
  pendingCount: number;
  inSync: number;
  totalTargets: number;
  busy: string | null;
  onAlignAll: () => void;
}) {
  const t = useT();
  const meta = agentMeta(source.id);
  const allSynced = pendingCount === 0 && totalTargets > 0;
  const ratio = totalTargets ? inSync / totalTargets : 1;

  return (
    <Card className="overflow-hidden p-0">
      {/* barra superior: label + selector de fuente */}
      <div className="flex flex-wrap items-center gap-2 border-border border-b bg-elevated px-4 py-2.5">
        <span className="mr-1 flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-faint">
          <span className="text-muted-foreground">▚</span> {t("align.source")}
        </span>
        {agents.map((a) => {
          const active = a.id === source.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.id)}
              className={`rounded-[var(--radius-sm)] border px-2.5 py-1 font-mono text-[11px] tracking-[0.06em] transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              {agentMeta(a.id).badge}
            </button>
          );
        })}
      </div>

      {/* cuerpo: identidad de la fuente + inventario */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-4">
        <Badge variant="avatar" className="h-11 w-11 text-sm">
          {meta.badge}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px]">{meta.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-faint">
            <span>
              <span className="text-muted-foreground">{source.mcps.length}</span> {t("align.mcps")}
            </span>
            <span>·</span>
            <span>
              <span className="text-muted-foreground">{source.skills.length}</span>{" "}
              {t("align.skills")}
            </span>
            <span>·</span>
            <span className="truncate text-muted-foreground">
              {source.config.model ?? t("align.noModel")}
            </span>
          </div>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={onAlignAll}
          disabled={!!busy || pendingCount === 0}
        >
          <GitMerge size={13} />
          {busy === "*" ? t("align.propagating") : t("align.alignAll", { n: pendingCount })}
        </Button>
      </div>

      {/* barra de sincronía global */}
      <div className="flex items-center gap-3 border-border border-t px-4 py-2.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-elevated-2">
          <motion.div
            className={allSynced ? "h-full bg-success" : "h-full bg-primary"}
            initial={false}
            animate={{ width: `${Math.round(ratio * 100)}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          />
        </div>
        <span className="font-mono text-[11px] text-faint">
          {allSynced ? (
            <span className="text-success">{t("align.allInSync")}</span>
          ) : (
            <>
              {t("align.inSync", { n: inSync, total: totalTargets })} ·{" "}
              <span className="text-warning">{t("align.pending", { n: pendingCount })}</span>
            </>
          )}
        </span>
      </div>
    </Card>
  );
}

interface Row {
  key: string;
  glyph: string;
  kind: string;
  name: string;
  tone: string;
}

/** Aplana el plan a filas de diff, en orden de presentación. */
function rowsOf(plan: Plan): Row[] {
  const rows: Row[] = [];
  for (const n of plan.mcpsAdd)
    rows.push({ key: `+m${n}`, glyph: "+", kind: "mcp", name: n, tone: "text-success" });
  for (const n of plan.mcpsUpdate)
    rows.push({ key: `~m${n}`, glyph: "~", kind: "mcp", name: n, tone: "text-warning" });
  for (const n of plan.skillsAdd)
    rows.push({ key: `+s${n}`, glyph: "+", kind: "skill", name: n, tone: "text-success" });
  if (plan.modelTo)
    rows.push({
      key: "~model",
      glyph: "~",
      kind: "model",
      name: plan.modelTo,
      tone: "text-warning",
    });
  return rows;
}

/** Tarjeta de destino: cabecera con flecha `SRC ──▶ DST` + diff de terminal + acción. */
function DiffPanel({
  plan,
  index,
  sourceBadge,
  busy,
  disabled,
  onAlign,
}: {
  plan: Plan;
  index: number;
  sourceBadge: string;
  busy: boolean;
  disabled: boolean;
  onAlign: () => void;
}) {
  const t = useT();
  const meta = agentMeta(plan.target.id);
  const aligned = plan.total === 0;
  const rows = rowsOf(plan);

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.09, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="flex h-full flex-col overflow-hidden p-0">
        {/* cabecera: SRC ──▶ DST + sello de estado */}
        <div className="flex items-center justify-between gap-2 border-border border-b bg-elevated px-3.5 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface font-semibold text-[10px]">
              {sourceBadge}
            </span>
            <motion.span
              className="text-faint"
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1, duration: 0.25 }}
            >
              ──▶
            </motion.span>
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface font-semibold text-[10px]">
              {meta.badge}
            </span>
            <span className="ml-1 font-semibold font-sans text-[13px]">{meta.name}</span>
          </div>
          {aligned ? (
            <span className="font-mono text-[10px] tracking-[0.1em] text-success">
              {t("align.synced")}
            </span>
          ) : (
            <motion.span
              key={plan.total}
              className="font-mono text-[10px] tracking-[0.1em] text-warning"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
            >
              {t("align.delta", { n: plan.total })}
            </motion.span>
          )}
        </div>

        {/* cuerpo: diff estilo terminal (líneas apareciendo) */}
        {aligned ? (
          <div className="flex flex-1 items-center justify-center px-4 py-7 text-center font-mono text-[11px] text-faint">
            {t("align.matches")}
          </div>
        ) : (
          <div className="flex-1 bg-surface px-3.5 py-3 font-mono text-[12px] leading-[1.7]">
            {rows.map((r, ri) => (
              <DiffRow key={r.key} row={r} delay={index * 0.09 + 0.2 + ri * 0.06} />
            ))}
          </div>
        )}

        {/* acción */}
        <div className="border-border border-t p-2.5">
          <Button
            variant={aligned ? "ghost" : "outline"}
            size="sm"
            onClick={onAlign}
            disabled={disabled || aligned}
            className="w-full"
          >
            {busy
              ? t("align.aligning")
              : aligned
                ? t("align.noChanges")
                : t("align.align", { n: plan.total })}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function DiffRow({ row, delay }: { row: Row; delay: number }) {
  const t = useT();
  const kindLabel =
    row.kind === "model"
      ? t("align.kindModel")
      : row.kind === "skill"
        ? t("align.kindSkill")
        : t("align.kindMcp");
  return (
    <motion.div
      className="flex items-center gap-2.5"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
    >
      <span className={`w-2 flex-shrink-0 font-semibold ${row.tone}`}>{row.glyph}</span>
      <span className="w-11 flex-shrink-0 text-faint">{kindLabel}</span>
      <span className="truncate text-muted-foreground" title={row.name}>
        {row.name}
      </span>
    </motion.div>
  );
}
