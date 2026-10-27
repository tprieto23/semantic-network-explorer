import { useMemo } from "react";
import { create } from "zustand";
import type { MessageKey } from "./messages";
import { MESSAGES } from "./messages";

export type Lang = "es" | "en";

const STORAGE_KEY = "rs-lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "es";
  // ?ui=en permite compartir un enlace ya en inglés («lang» es el filtro de idioma de los documentos).
  const requested = new URLSearchParams(window.location.search).get("ui");
  if (requested === "es" || requested === "en") return requested;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    // Sin almacenamiento: el proyecto trabaja en español por defecto.
  }
  return "es";
}

interface LangStore {
  lang: Lang;
  toggle: () => void;
}

export const useLangStore = create<LangStore>()((set) => ({
  lang: initialLang(),
  toggle: () =>
    set((state) => {
      const lang: Lang = state.lang === "es" ? "en" : "es";
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // La preferencia dura solo esta sesión.
      }
      return { lang };
    }),
}));

export type Vars = Record<string, string | number>;

/** Reemplaza solo las variables recibidas; un `{id}` literal sin variable se conserva. */
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.es[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export type Translate = (key: MessageKey, vars?: Vars) => string;

export function useT(): { lang: Lang; t: Translate } {
  const lang = useLangStore((state) => state.lang);
  return useMemo(() => ({ lang, t: (key, vars) => translate(lang, key, vars) }), [lang]);
}

/** Mensaje de error para mostrar; la falta de conexión se traduce, el resto viene de la API. */
export function errorText(error: Error, t: Translate): string {
  return "status" in error && error.status === 0 ? t("api.unreachable") : error.message;
}

export type { MessageKey };
