import { create } from "zustand";
import { AGENT_META } from "./agents";

const HIDDEN_KEY = "nodify-hidden-agents";
const ORDER_KEY = "nodify-agent-order";

/** Universo de ids conocidos (los agentes soportados). Fuente para reconciliar el orden. */
function allIds(): string[] {
  return Object.keys(AGENT_META);
}

function loadHidden(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Reconcilia el orden guardado con los ids conocidos: conserva el orden preferido,
 * descarta ids que ya no existen y añade al final los agentes nuevos aún sin posición.
 */
function reconcileOrder(saved: string[]): string[] {
  const all = allIds();
  const kept = saved.filter((id) => all.includes(id));
  const missing = all.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}

function loadOrder(): string[] {
  if (typeof window === "undefined") return allIds();
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    return reconcileOrder(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return allIds();
  }
}

function persist(key: string, value: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

interface AgentVisibilityState {
  hidden: string[];
  /** Orden preferido de columnas (ids). Contiene todos los agentes conocidos. */
  order: string[];
  toggle: (id: string) => void;
  /** Mueve un agente una posición arriba (`-1`) o abajo (`+1`) en el orden. */
  move: (id: string, dir: -1 | 1) => void;
}

/**
 * Preferencia puramente de UI (persistida en localStorage): qué agentes ocultar y en
 * qué orden mostrarlos en la matriz/ALIGN/SECRETS. No afecta el escaneo real ni deja de
 * leer/escribir ese agente — solo cambia cómo se ve.
 */
export const useAgentVisibility = create<AgentVisibilityState>((set, get) => ({
  hidden: loadHidden(),
  order: loadOrder(),
  toggle: (id) => {
    const current = get().hidden;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    persist(HIDDEN_KEY, next);
    set({ hidden: next });
  },
  move: (id, dir) => {
    const order = [...get().order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    persist(ORDER_KEY, order);
    set({ order });
  },
}));
