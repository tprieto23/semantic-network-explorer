import { create } from "zustand";

const COLLAPSED_KEY = "rs-filters-collapsed";

/** Ancho a partir del cual el panel de filtros cabe junto al grafo. */
export const WIDE_LAYOUT_MIN = 1100;
/** Hasta este ancho, la interfaz usa la disposición de celular (barra de pestañas y hojas). */
export const PHONE_MAX = 640;

function initialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  // En celular el panel es una hoja que tapa la red: siempre empieza cerrado.
  if (window.innerWidth <= PHONE_MAX) return true;
  try {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    if (stored === "1" || stored === "0") return stored === "1";
  } catch {
    // Sin almacenamiento se decide por el ancho.
  }
  return window.innerWidth < WIDE_LAYOUT_MIN;
}

interface UiStore {
  filtersCollapsed: boolean;
  setFiltersCollapsed: (value: boolean) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  filtersCollapsed: initialCollapsed(),
  setFiltersCollapsed: (filtersCollapsed) => {
    // En celular no se recuerda: abrir la hoja es una acción puntual.
    if (window.innerWidth > PHONE_MAX) {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, filtersCollapsed ? "1" : "0");
      } catch {
        // La preferencia dura solo esta sesión.
      }
    }
    set({ filtersCollapsed });
  },
}));
