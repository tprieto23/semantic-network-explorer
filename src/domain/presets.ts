import type { MessageKey } from "../i18n";
import type { Filters } from "../state/filters";
import { DEFAULT_FILTERS } from "../state/filters";

export interface Preset {
  id: string;
  label: MessageKey;
  /** Línea corta bajo el nombre, en el bloque de vistas. */
  hint: MessageKey;
  description: MessageKey;
  /** Cambios sobre los valores por defecto; el resto de los filtros vuelve a su valor inicial. */
  patch: Partial<Filters>;
}

/** Vistas guiadas: preguntas frecuentes resueltas con un clic, ajustables después. */
export const PRESETS: Preset[] = [
  {
    id: "actors",
    label: "preset.actors",
    hint: "preset.actorsHint",
    description: "preset.actorsHelp",
    patch: { categories: ["CHAR"], metric: "pagerank" },
  },
  {
    id: "practices",
    label: "preset.practices",
    hint: "preset.practicesHint",
    description: "preset.practicesHelp",
    patch: { categories: ["PRAC", "KNOW", "SKILL"], metric: "pagerank" },
  },
  {
    id: "bridges",
    label: "preset.bridges",
    hint: "preset.bridgesHint",
    description: "preset.bridgesHelp",
    patch: { linkMode: "between", metric: "betweenness" },
  },
  {
    id: "territory",
    label: "preset.territory",
    hint: "preset.territoryHint",
    description: "preset.territoryHelp",
    patch: { categories: ["LOC", "eco_INFRA", "physical_INFRA"], metric: "pagerank" },
  },
  {
    id: "recent",
    label: "preset.recent",
    hint: "preset.recentHint",
    description: "preset.recentHelp",
    patch: { period: "2024-2026", colorBy: "community" },
  },
];

/** Filtros que deja una vista guiada; conserva el sector, que define el corpus. */
export function presetFilters(preset: Preset, current: Filters): Filters {
  return { ...DEFAULT_FILTERS, sector: current.sector, ...preset.patch };
}

/** ¿Los filtros actuales son exactamente los de la vista? */
export function isPresetActive(preset: Preset, current: Filters): boolean {
  const expected = presetFilters(preset, current);
  return (Object.keys(expected) as (keyof Filters)[]).every(
    (key) => JSON.stringify(expected[key]) === JSON.stringify(current[key]),
  );
}
