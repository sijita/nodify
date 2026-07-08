import { useAgentVisibility } from "@/lib/agent-visibility";
import { scanAgents } from "@/lib/tauri";
import type { AgentScan } from "@/lib/types";
import useSWR from "swr";

/**
 * Estado derivado del core vía SWR. `mutate` revalida tras futuras escrituras
 * (Fase 2). Ver CONVENTIONS.md (SWR para estado del core).
 */
export function useAgentScan() {
  const { data, error, isLoading, mutate } = useSWR<AgentScan[]>("scan-agents", scanAgents, {
    revalidateOnFocus: false,
  });
  return { agents: data ?? [], error, isLoading, refresh: mutate };
}

/**
 * Como `useAgentScan`, pero excluye los agentes que el usuario ocultó (preferencia de
 * UI, ver `lib/agent-visibility`). `total` conserva el conteo real para mensajes tipo
 * "todos ocultos".
 */
export function useVisibleAgents() {
  const { agents, ...rest } = useAgentScan();
  const hidden = useAgentVisibility((s) => s.hidden);
  const visible = agents.filter((a) => !hidden.includes(a.id));
  return { agents: visible, total: agents.length, ...rest };
}
