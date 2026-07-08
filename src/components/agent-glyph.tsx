import { agentMeta } from "@/lib/agents";
import { siClaudecode, siOpencode } from "simple-icons";

/**
 * Logo oficial monocromo del agente (simple-icons), con `currentColor` para que herede
 * el color de tinta del tema. Codex no tiene icono oficial en simple-icons (OpenAI pidió
 * retirarlo), así que cae al badge de texto ("CX").
 */
const ICONS: Record<string, { path: string }> = {
  "claude-code": siClaudecode,
  opencode: siOpencode,
};

export function AgentGlyph({
  id,
  size = 18,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const icon = ICONS[id];
  if (icon) {
    return (
      <svg
        role="img"
        aria-label={agentMeta(id).name}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
      >
        <path d={icon.path} />
      </svg>
    );
  }
  return <span className={className}>{agentMeta(id).badge}</span>;
}
