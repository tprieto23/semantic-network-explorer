import { create } from "zustand";

export type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; source: string; target: string }
  | null;

export type Tab = "summary" | "network" | "evolution" | "table";

/**
 * La vista y la selección viven en el hash para poder compartir enlaces:
 * #red/<id> para una entidad y #red/<origen>~<destino> para la evidencia de un link.
 */
const TAB_HASHES: Record<Tab, string> = {
  summary: "resumen",
  network: "red",
  evolution: "evolucion",
  table: "entidades",
};

export function tabFromHash(hash: string): Tab {
  const value = hash.replace(/^#/, "").split("/")[0];
  const match = (Object.entries(TAB_HASHES) as [Tab, string][]).find(([, slug]) => slug === value);
  return match ? match[0] : "summary";
}

/** Selección guardada en el hash; el resumen no muestra detalle, así que no la conserva. */
export function selectionFromHash(hash: string): Selection {
  const [, value] = hash.replace(/^#/, "").split("/");
  if (!value || tabFromHash(hash) === "summary") return null;
  const [source, target] = value.split("~").map(decodeURIComponent);
  if (target) return { kind: "edge", source, target };
  return source ? { kind: "node", id: source } : null;
}

/** Como encodeURIComponent, pero también codifica «~», que separa los extremos de un link. */
function encodePart(value: string): string {
  return encodeURIComponent(value).replace(/~/g, "%7E");
}

export function hashForTab(tab: Tab, selection: Selection = null): string {
  if (tab === "summary") return "";
  let suffix = "";
  if (selection?.kind === "node") suffix = `/${encodePart(selection.id)}`;
  if (selection?.kind === "edge") suffix = `/${encodePart(selection.source)}~${encodePart(selection.target)}`;
  return `#${TAB_HASHES[tab]}${suffix}`;
}

interface SelectionStore {
  selection: Selection;
  /** Entidad desde la que se abrió la evidencia de un link, para volver a su detalle. */
  returnTo: string | null;
  tab: Tab;
  /** Atenúa todo lo que no sea la entidad seleccionada y sus vecinos. */
  neighborsOnly: boolean;
  /** Pide al grafo centrar la cámara en una entidad; el contador repite la petición. */
  focus: { id: string; nonce: number } | null;
  select: (selection: Selection, options?: { returnTo?: string | null }) => void;
  setTab: (tab: Tab) => void;
  setNeighborsOnly: (value: boolean) => void;
  requestFocus: (id: string) => void;
}

const initialHash = typeof window === "undefined" ? "" : window.location.hash;

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selection: selectionFromHash(initialHash),
  returnTo: null,
  tab: tabFromHash(initialHash),
  neighborsOnly: false,
  focus: null,
  select: (selection, options) =>
    set((state) => ({
      selection,
      returnTo: options?.returnTo ?? null,
      neighborsOnly: selection?.kind === "node" ? state.neighborsOnly : false,
    })),
  setTab: (tab) => set({ tab }),
  setNeighborsOnly: (neighborsOnly) => set({ neighborsOnly }),
  requestFocus: (id) => set((state) => ({ focus: { id, nonce: (state.focus?.nonce ?? 0) + 1 } })),
}));

if (typeof window !== "undefined") {
  useSelectionStore.subscribe((state, previous) => {
    if (state.tab === previous.tab && state.selection === previous.selection) return;
    const url = `${window.location.pathname}${window.location.search}${hashForTab(state.tab, state.selection)}`;
    window.history.replaceState(null, "", url);
  });
  window.addEventListener("hashchange", () => {
    const tab = tabFromHash(window.location.hash);
    if (tab !== useSelectionStore.getState().tab) useSelectionStore.getState().setTab(tab);
  });
}
