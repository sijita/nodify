import type { McpInput } from "./tauri";
import type { AgentScan, McpView, ProviderInfo, SecretView } from "./types";

/**
 * Datos de ejemplo para previsualizar la UI **fuera de Tauri** (navegador). Es un
 * store mutable: instalar/eliminar/compartir modifican este estado para que el preview
 * sea interactivo. En la app nativa manda el backend real (`scan_agents`, etc.).
 */
const SEED: AgentScan[] = [
  {
    id: "claude-code",
    configPath: "~/.claude.json",
    detected: true,
    error: null,
    mcps: [
      { name: "filesystem", transport: "stdio", target: "npx @mcp/fs", enabled: null, secrets: [] },
      {
        name: "github",
        transport: "http",
        target: "https://api.github.com/mcp",
        enabled: null,
        secrets: [{ key: "Authorization", masked: "Bearer ••••a1f2", isRef: false }],
      },
      {
        name: "postgres",
        transport: "stdio",
        target: "pg-mcp",
        enabled: null,
        secrets: [{ key: "PG_URL", masked: "••••5432", isRef: false }],
      },
    ],
    skills: [
      { name: "code-review", description: "Revisa el diff contra estándares", enabled: true },
      { name: "tdd", description: "Desarrollo guiado por tests", enabled: true },
    ],
    config: { model: "claude-sonnet-5", rulesPath: "~/.claude/CLAUDE.md", rulesPresent: true },
  },
  {
    id: "codex",
    configPath: "~/.codex/config.toml",
    detected: true,
    error: null,
    mcps: [
      { name: "filesystem", transport: "stdio", target: "npx @mcp/fs", enabled: true, secrets: [] },
      {
        name: "github",
        transport: "http",
        target: "https://ghe.corp.net/mcp",
        enabled: true,
        secrets: [{ key: "Authorization", masked: "${GHE_TOKEN}", isRef: true }],
      },
    ],
    skills: [
      { name: "code-review", description: "Revisa el diff contra estándares", enabled: true },
    ],
    config: { model: "gpt-5.5", rulesPath: "~/.codex/AGENTS.md", rulesPresent: true },
  },
  {
    id: "opencode",
    configPath: "~/.config/opencode/opencode.json",
    detected: true,
    error: null,
    mcps: [
      { name: "filesystem", transport: "stdio", target: "npx @mcp/fs", enabled: true, secrets: [] },
      {
        name: "context7",
        transport: "http",
        target: "https://mcp.context7.com/mcp",
        enabled: true,
        secrets: [{ key: "CONTEXT7_API_KEY", masked: "••••0d05", isRef: false }],
      },
    ],
    skills: [
      { name: "code-review", description: "Revisa el diff contra estándares", enabled: true },
      { name: "firecrawl", description: "Scraping y búsqueda web", enabled: true },
    ],
    config: {
      model: "anthropic/claude-sonnet-4",
      rulesPath: "~/.config/opencode/AGENTS.md",
      rulesPresent: false,
    },
  },
];

const state: AgentScan[] = structuredClone(SEED);

export function mockScan(): AgentScan[] {
  return structuredClone(state);
}

function mask(v: string): string {
  return v.length <= 4 ? "•".repeat(v.length) : "•".repeat(v.length - 4) + v.slice(-4);
}

function toView(mcp: McpInput): McpView {
  const target =
    mcp.transport === "http"
      ? (mcp.url ?? "")
      : `${mcp.command ?? ""} ${(mcp.args ?? []).join(" ")}`.trim();
  const secrets: SecretView[] = [
    ...Object.entries(mcp.env ?? {}),
    ...Object.entries(mcp.headers ?? {}),
  ].map(([key, value]) => ({ key, masked: mask(value), isRef: false }));
  return {
    name: mcp.name,
    transport: mcp.transport,
    target,
    enabled: mcp.enabled ?? null,
    secrets,
  };
}

export function mockInstall(agentId: string, mcp: McpInput): void {
  const agent = state.find((a) => a.id === agentId);
  if (!agent) return;
  const view = toView(mcp);
  const i = agent.mcps.findIndex((m) => m.name === mcp.name);
  if (i >= 0) agent.mcps[i] = view;
  else agent.mcps.push(view);
}

export function mockRemove(agentId: string, name: string): void {
  const agent = state.find((a) => a.id === agentId);
  if (agent) agent.mcps = agent.mcps.filter((m) => m.name !== name);
}

export function mockShare(fromId: string, toId: string, name: string): void {
  const from = state.find((a) => a.id === fromId);
  const to = state.find((a) => a.id === toId);
  const mcp = from?.mcps.find((m) => m.name === name);
  if (!to || !mcp) return;
  const copy = structuredClone(mcp);
  const i = to.mcps.findIndex((m) => m.name === name);
  if (i >= 0) to.mcps[i] = copy;
  else to.mcps.push(copy);
}

export function mockSetModel(agentId: string, model: string): void {
  const agent = state.find((a) => a.id === agentId);
  if (agent) agent.config.model = model;
}

export function mockShareSkill(fromId: string, toId: string, name: string): void {
  const from = state.find((a) => a.id === fromId);
  const to = state.find((a) => a.id === toId);
  const skill = from?.skills.find((s) => s.name === name);
  if (!to || !skill) return;
  const copy = structuredClone(skill);
  const i = to.skills.findIndex((s) => s.name === name);
  if (i >= 0) to.skills[i] = copy;
  else to.skills.push(copy);
}

export function mockRemoveSkill(agentId: string, name: string): void {
  const agent = state.find((a) => a.id === agentId);
  if (agent) agent.skills = agent.skills.filter((s) => s.name !== name);
}

const mockRules: Record<string, string> = {
  "claude-code":
    "# Reglas globales\n\n- Escribe tests primero.\n- Commits en Conventional Commits.\n",
  codex: "# AGENTS.md\n\nUsa el estilo del repo. No toques secretos.\n",
  opencode: "",
};

export function mockReadRules(agentId: string): string {
  return mockRules[agentId] ?? "";
}

export function mockWriteRules(agentId: string, content: string): void {
  mockRules[agentId] = content;
  const agent = state.find((a) => a.id === agentId);
  if (agent) agent.config.rulesPresent = content.trim().length > 0;
}

const mockProviders: Record<string, ProviderInfo[]> = {
  "claude-code": [],
  codex: [
    {
      id: "openrouter",
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      keyEnv: "OPENROUTER_API_KEY",
    },
  ],
  opencode: [
    {
      id: "featherless",
      name: "Featherless",
      baseUrl: "https://api.featherless.ai/v1",
      keyEnv: "FEATHERLESS_API_KEY",
    },
  ],
};

export function mockListProviders(agentId: string): ProviderInfo[] {
  return mockProviders[agentId] ?? [];
}

/** Bundle canónico de ejemplo (navegador): sin valores de secretos (solo referencias). */
export function mockExportBundle(): string {
  const bundle = {
    version: 1,
    agents: Object.fromEntries(
      state.map((a) => [
        a.id,
        {
          model: a.config.model,
          mcps: a.mcps.map((m) => ({
            name: m.name,
            transport: m.transport,
            target: m.target,
            // secretos despojados → referencias por su clave
            env: Object.fromEntries(m.secrets.map((s) => [s.key, `\${${s.key}}`])),
          })),
        },
      ]),
    ),
  };
  return JSON.stringify(bundle, null, 2);
}
