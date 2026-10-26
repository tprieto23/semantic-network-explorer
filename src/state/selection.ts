import { create } from "zustand";

export type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; source: string; target: string }
  | null;

export type Tab = "network" | "evolution" | "table";

interface SelectionStore {
  selection: Selection;
  tab: Tab;
  select: (selection: Selection) => void;
  setTab: (tab: Tab) => void;
}

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selection: null,
  tab: "network",
  select: (selection) => set({ selection }),
  setTab: (tab) => set({ tab }),
}));
