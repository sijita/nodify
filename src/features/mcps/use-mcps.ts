import { useAgentVisibility } from "@/lib/agent-visibility";
import { scanAgents } from "@/lib/tauri";
import type { AgentScan } from "@/lib/types";
import { useMemo } from "react";
import useSWR from "swr";

// Referencia estable para el caso "sin datos" (evita crear un array nuevo por render).
const EMPTY: AgentScan[] = [];

/**
 * Estado derivado del core vía SWR. `mutate` revalida tras futuras escrituras
 * (Fase 2). Ver CONVENTIONS.md (SWR para estado del core).
 */
export function useAgentScan() {
  const { data, error, isLoading, mutate } = useSWR<AgentScan[]>("scan-agents", scanAgents, {
    revalidateOnFocus: false,
  });
  return { agents: data ?? EMPTY, error, isLoading, refresh: mutate };
}

/**
 * Como `useAgentScan`, pero excluye los agentes que el usuario ocultó y los ordena
 * según su preferencia (ver `lib/agent-visibility`). `total` conserva el conteo real
 * para mensajes tipo "todos ocultos".
 *
 * El resultado se memoiza: devolver una referencia nueva en cada render haría que
 * cualquier `useEffect([agents])` (p.ej. en SECRETS) entrara en bucle infinito.
 */
export function useVisibleAgents() {
  const { agents, ...rest } = useAgentScan();
  const hidden = useAgentVisibility((s) => s.hidden);
  const order = useAgentVisibility((s) => s.order);
  const visible = useMemo(() => {
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    return agents.filter((a) => !hidden.includes(a.id)).sort((a, b) => rank(a.id) - rank(b.id));
  }, [agents, hidden, order]);
  return { agents: visible, total: agents.length, ...rest };
}
