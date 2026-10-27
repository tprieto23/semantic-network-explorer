import { create } from "zustand";

export type Theme = "oscuro" | "claro";

const STORAGE_KEY = "rs-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "oscuro";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "oscuro" || stored === "claro") return stored;
  } catch {
    // Sin almacenamiento (modo privado, vista previa): se usa la preferencia del sistema.
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "oscuro";
}

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: initialTheme(),
  toggle: () =>
    set((state) => {
      const theme: Theme = state.theme === "oscuro" ? "claro" : "oscuro";
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // La preferencia dura solo esta sesión.
      }
      return { theme };
    }),
}));

export function useTheme(): Theme {
  return useThemeStore((state) => state.theme);
}
