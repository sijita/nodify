import { agentMeta } from "@/lib/agents";
import { type LucideIcon, SquareTerminal } from "lucide-react";
import { siClaudecode, siOpencode } from "simple-icons";

/**
 * Logo del agente con `currentColor` (hereda el color de tinta del tema). Prioridad:
 * 1) logo oficial monocromo de simple-icons; 2) icono de lucide (Codex no tiene icono
 * oficial — OpenAI pidió retirarlo de simple-icons); 3) badge de texto.
 */
const ICONS: Record<string, { path: string }> = {
  "claude-code": siClaudecode,
  opencode: siOpencode,
};

const LUCIDE: Record<string, LucideIcon> = {
  codex: SquareTerminal,
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
  const Lucide = LUCIDE[id];
  if (Lucide) {
    return <Lucide size={size} className={className} aria-label={agentMeta(id).name} />;
  }
  return <span className={className}>{agentMeta(id).badge}</span>;
}
