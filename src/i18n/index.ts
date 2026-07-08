import { useCallback } from "react";
import { create } from "zustand";
import { type Dict, en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

const DICTS: Record<Locale, Dict> = { en, es };
const STORAGE_KEY = "nodify-locale";

/** Idioma inicial: preferencia guardada, si no el del navegador (es → es, resto → en). */
function initialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "es") return saved;
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

function applyLang(locale: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocale = create<LocaleState>((set, get) => {
  const set_ = (locale: Locale) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, locale);
    applyLang(locale);
    set({ locale });
  };
  const init = initialLocale();
  applyLang(init);
  return {
    locale: init,
    setLocale: set_,
    toggle: () => set_(get().locale === "es" ? "en" : "es"),
  };
});

type Vars = Record<string, string | number>;

function resolve(dict: Dict, key: string): string {
  // clave con notación de puntos: "matrix.deleteMcpMsg"
  const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
  return typeof value === "string" ? value : key;
}

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Hook de traducción. `t("matrix.deleteMcpMsg", { name, agent })`. Reacciona al idioma. */
export function useT() {
  const locale = useLocale((s) => s.locale);
  return useCallback(
    (key: string, vars?: Vars) => interpolate(resolve(DICTS[locale], key), vars),
    [locale],
  );
}
