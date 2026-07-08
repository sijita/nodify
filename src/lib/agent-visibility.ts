import { create } from "zustand";

const STORAGE_KEY = "nodify-hidden-agents";

function loadHidden(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persist(hidden: string[]) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
}

interface AgentVisibilityState {
  hidden: string[];
  toggle: (id: string) => void;
}

/**
 * Preferencia puramente de UI (persistida en localStorage): qué agentes ocultar de
 * la matriz/ALIGN/SECRETS. No afecta el escaneo real ni deja de leer/escribir ese
 * agente — solo deja de mostrarlo.
 */
export const useAgentVisibility = create<AgentVisibilityState>((set, get) => ({
  hidden: loadHidden(),
  toggle: (id) => {
    const current = get().hidden;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    persist(next);
    set({ hidden: next });
  },
}));
