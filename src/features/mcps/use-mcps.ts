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
