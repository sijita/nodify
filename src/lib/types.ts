// Espejo de los DTO que devuelve el comando `scan_agents` (src-tauri/src/scan.rs).

export type Transport = "stdio" | "http";

export interface SecretView {
  key: string;
  masked: string;
  isRef: boolean;
}

export interface McpView {
  name: string;
  transport: Transport;
  target: string;
  enabled: boolean | null;
  secrets: SecretView[];
}

export interface SkillView {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentConfig {
  model: string | null;
  rulesPath: string;
  rulesPresent: boolean;
}

export interface AgentScan {
  id: string;
  configPath: string;
  detected: boolean;
  error: string | null;
  mcps: McpView[];
  skills: SkillView[];
  config: AgentConfig;
}

// Etiquetas de estado de la matriz (mono, MAYÚSCULAS) — ver design-system.md.
export type McpStatus = "INSTALLED" | "MISSING" | "DISABLED";

export interface DiffEntry {
  agent: string;
  change: string;
}

export interface ProviderInfo {
  id: string;
  name: string | null;
  baseUrl: string | null;
  /** Nombre de la env var de la key (nunca el valor). */
  keyEnv: string | null;
}
