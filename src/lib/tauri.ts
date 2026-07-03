import { invoke } from "@tauri-apps/api/core";
import {
  mockExportBundle,
  mockInstall,
  mockRemove,
  mockRemoveSkill,
  mockScan,
  mockSetModel,
  mockShare,
  mockShareSkill,
} from "./mock";
import type { AgentScan, DiffEntry } from "./types";

const NATIVE_ONLY = "Sync con git requiere la app nativa (Tauri).";

/** ¿Corriendo dentro de la app nativa Tauri? (si no, estamos en un navegador). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface McpInput {
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  enabled?: boolean;
}

/** Escanea agentes + MCPs (solo lectura). Fuera de Tauri: datos demo mutables. */
export function scanAgents(): Promise<AgentScan[]> {
  if (!isTauri()) return Promise.resolve(mockScan());
  return invoke<AgentScan[]>("scan_agents");
}

export function installMcp(agentId: string, mcp: McpInput): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockInstall(agentId, mcp));
  return invoke("install_mcp", { agentId, mcp });
}

export function removeMcp(agentId: string, name: string): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockRemove(agentId, name));
  return invoke("remove_mcp", { agentId, name });
}

export function shareMcp(fromId: string, toId: string, name: string): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockShare(fromId, toId, name));
  return invoke("share_mcp", { fromId, toId, name });
}

export function setModel(agentId: string, model: string): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockSetModel(agentId, model));
  return invoke("set_model", { agentId, model });
}

export function shareSkill(fromId: string, toId: string, name: string): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockShareSkill(fromId, toId, name));
  return invoke("share_skill", { fromId, toId, name });
}

export function removeSkill(agentId: string, name: string): Promise<void> {
  if (!isTauri()) return Promise.resolve(mockRemoveSkill(agentId, name));
  return invoke("remove_skill", { agentId, name });
}

// ---------- Sync (Fase 5) ----------

export function exportBundle(): Promise<string> {
  if (!isTauri()) return Promise.resolve(mockExportBundle());
  return invoke<string>("export_bundle");
}

export function syncStatus(repoDir: string): Promise<DiffEntry[]> {
  if (!isTauri()) return Promise.reject(new Error(NATIVE_ONLY));
  return invoke<DiffEntry[]>("sync_status", { repoDir });
}

export function syncPush(repoDir: string): Promise<void> {
  if (!isTauri()) return Promise.reject(new Error(NATIVE_ONLY));
  return invoke("sync_push", { repoDir });
}

export function syncPull(repoDir: string): Promise<void> {
  if (!isTauri()) return Promise.reject(new Error(NATIVE_ONLY));
  return invoke("sync_pull", { repoDir });
}
