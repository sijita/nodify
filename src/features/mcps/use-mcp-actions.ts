import {
  type McpInput,
  createSkill,
  installMcp,
  removeMcp,
  removeSkill,
  setModel,
  shareMcp,
  shareSkill,
} from "@/lib/tauri";
import { useState } from "react";
import { mutate } from "swr";

/**
 * Acciones de escritura sobre MCPs. Tras cada mutación revalida el scan (SWR),
 * de modo que la matriz refleja el nuevo estado del disco (o del mock en navegador).
 */
export function useMcpActions() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await mutate("scan-agents");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    error,
    install: (agentId: string, mcp: McpInput) => run(() => installMcp(agentId, mcp)),
    remove: (agentId: string, name: string) => run(() => removeMcp(agentId, name)),
    share: (fromId: string, toId: string, name: string) => run(() => shareMcp(fromId, toId, name)),
    setModel: (agentId: string, model: string) => run(() => setModel(agentId, model)),
    shareSkill: (fromId: string, toId: string, name: string) =>
      run(() => shareSkill(fromId, toId, name)),
    removeSkill: (agentId: string, name: string) => run(() => removeSkill(agentId, name)),
    createSkill: (agentId: string, name: string, content: string) =>
      run(() => createSkill(agentId, name, content)),
  };
}
