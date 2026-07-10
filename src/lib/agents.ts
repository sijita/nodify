/** Metadatos de presentación por agente (el core usa el `id` estable). */
export const AGENT_META: Record<string, { name: string; badge: string }> = {
  "claude-code": { name: "Claude Code", badge: "CC" },
  codex: { name: "Codex", badge: "CX" },
  opencode: { name: "OpenCode", badge: "OC" },
  "kilo-code": { name: "Kilo Code", badge: "KC" },
  pi: { name: "Pi", badge: "PI" },
};

export function agentMeta(id: string) {
  return AGENT_META[id] ?? { name: id, badge: id.slice(0, 2).toUpperCase() };
}
