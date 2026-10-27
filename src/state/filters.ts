import { create } from "zustand";
import type { MessageKey } from "../i18n";
import type {
  CategoryCode,
  CompareRequest,
  EdgeWeighting,
  LinkMode,
  NetworkRequest,
  PeriodId,
  RankingMetric,
} from "../api/client";

export type CategoryPair = [CategoryCode, CategoryCode];

export type SectorFilter = "Agroforestry" | "all";

/** Qué links se dibujan; no cambia lo que se calcula en la API. */
export type EdgeDisplay = "strongest" | "all";

export interface Filters {
  /** Por defecto solo Agroforestry; "all" incluye documentos sin sector. */
  sector: SectorFilter;
  period: PeriodId;
  incubator: number | "all";
  language: string;
  /** Vacío = todos los documentos listos. */
  documentIds: string[];
  /** Vacío = las diez categorías y el legado presente (decide el backend). */
  categories: CategoryCode[];
  linkMode: LinkMode;
  categoryPairs: CategoryPair[];
  minDocuments: number;
  weighting: EdgeWeighting;
  minWeight: number;
  metric: RankingMetric;
  topN: number;
  edgeDisplay: EdgeDisplay;
  /** Entidades canónicas que se quitan antes de calcular la red. */
  excludedEntityIds: string[];
}

export const DEFAULT_FILTERS: Filters = {
  sector: "Agroforestry",
  period: "all",
  incubator: "all",
  language: "all",
  documentIds: [],
  categories: [],
  linkMode: "any",
  categoryPairs: [],
  minDocuments: 2,
  weighting: "fractional-document",
  minWeight: 0,
  metric: "pagerank",
  topN: 150,
  edgeDisplay: "strongest",
  excludedEntityIds: [],
};

const SECTORS: SectorFilter[] = ["Agroforestry", "all"];
const PERIODS: PeriodId[] = ["all", "2000-2020", "2021-2023", "2024-2026"];

/** Períodos que compara la vista de evolución, en orden cronológico. */
export const COMPARED_PERIODS = ["2000-2020", "2021-2023", "2024-2026"] as const;
const LINK_MODES: LinkMode[] = ["any", "between", "within", "pairs"];
const WEIGHTINGS: EdgeWeighting[] = ["fractional-document", "fractional", "sentence-count", "document-count"];
const METRICS: RankingMetric[] = ["pagerank", "degree", "strength", "betweenness", "closeness", "document_count"];
const CATEGORIES: CategoryCode[] = [
  "CHAR",
  "LOC",
  "PRAC",
  "RUL",
  "KNOW",
  "ATT",
  "SKILL",
  "physical_INFRA",
  "soft_INFRA",
  "eco_INFRA",
  "INFRA",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function positiveInt(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
}

/** Convierte los filtros en query string omitiendo los valores por defecto. */
export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.sector !== DEFAULT_FILTERS.sector) params.set("sector", filters.sector);
  if (filters.period !== DEFAULT_FILTERS.period) params.set("period", filters.period);
  if (filters.incubator !== "all") params.set("inc", String(filters.incubator));
  if (filters.language !== "all") params.set("lang", filters.language);
  if (filters.documentIds.length) params.set("docs", filters.documentIds.join(","));
  if (filters.categories.length) params.set("cats", filters.categories.join(","));
  if (filters.linkMode !== DEFAULT_FILTERS.linkMode) params.set("links", filters.linkMode);
  if (filters.categoryPairs.length) {
    params.set("pairs", filters.categoryPairs.map((pair) => pair.join("~")).join(","));
  }
  if (filters.minDocuments !== DEFAULT_FILTERS.minDocuments) params.set("mindocs", String(filters.minDocuments));
  if (filters.weighting !== DEFAULT_FILTERS.weighting) params.set("weight", filters.weighting);
  if (filters.minWeight !== DEFAULT_FILTERS.minWeight) params.set("minw", String(filters.minWeight));
  if (filters.metric !== DEFAULT_FILTERS.metric) params.set("metric", filters.metric);
  if (filters.topN !== DEFAULT_FILTERS.topN) params.set("top", String(filters.topN));
  if (filters.edgeDisplay !== DEFAULT_FILTERS.edgeDisplay) params.set("vis", filters.edgeDisplay);
  if (filters.excludedEntityIds.length) params.set("excl", filters.excludedEntityIds.join(","));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Lee filtros desde la URL; cualquier valor inválido vuelve a su valor por defecto. */
export function filtersFromSearch(search: string): Filters {
  const params = new URLSearchParams(search);
  const categories = (params.get("cats") ?? "")
    .split(",")
    .filter((code): code is CategoryCode => (CATEGORIES as string[]).includes(code));
  const categoryPairs = (params.get("pairs") ?? "")
    .split(",")
    .map((pair) => pair.split("~"))
    .filter(
      (pair): pair is CategoryPair =>
        pair.length === 2 && pair.every((code) => (CATEGORIES as string[]).includes(code)),
    );
  const incubator = Number.parseInt(params.get("inc") ?? "", 10);
  const minWeight = Number.parseFloat(params.get("minw") ?? "");

  return {
    sector: oneOf(params.get("sector"), SECTORS, DEFAULT_FILTERS.sector),
    period: oneOf(params.get("period"), PERIODS, DEFAULT_FILTERS.period),
    incubator: incubator >= 1 && incubator <= 8 ? incubator : "all",
    language: params.get("lang")?.trim().toLowerCase() || "all",
    documentIds: (params.get("docs") ?? "").split(",").filter(Boolean),
    categories,
    linkMode: oneOf(params.get("links"), LINK_MODES, DEFAULT_FILTERS.linkMode),
    categoryPairs,
    minDocuments: positiveInt(params.get("mindocs"), DEFAULT_FILTERS.minDocuments, 50),
    weighting: oneOf(params.get("weight"), WEIGHTINGS, DEFAULT_FILTERS.weighting),
    minWeight: Number.isFinite(minWeight) && minWeight >= 0 ? minWeight : DEFAULT_FILTERS.minWeight,
    metric: oneOf(params.get("metric"), METRICS, DEFAULT_FILTERS.metric),
    topN: positiveInt(params.get("top"), DEFAULT_FILTERS.topN, 5000),
    edgeDisplay: oneOf(params.get("vis"), ["strongest", "all"] as const, DEFAULT_FILTERS.edgeDisplay),
    excludedEntityIds: [...new Set((params.get("excl") ?? "").split(",").filter((id) => UUID.test(id)))],
  };
}

function sharedRequest(filters: Filters) {
  return {
    productive_sector: filters.sector,
    incubator_number: filters.incubator,
    language: filters.language,
    document_ids: filters.documentIds.length ? filters.documentIds : null,
    categories: filters.categories.length ? filters.categories : null,
    link_mode: filters.linkMode,
    category_pairs: filters.linkMode === "pairs" ? filters.categoryPairs : null,
    minimum_node_document_count: filters.minDocuments,
    edge_weighting: filters.weighting,
    minimum_edge_weight: filters.minWeight,
    ranking_metric: filters.metric,
    excluded_entity_ids: filters.excludedEntityIds.length ? filters.excludedEntityIds : null,
  };
}

export function toNetworkRequest(filters: Filters, period: PeriodId = filters.period): NetworkRequest {
  return { ...sharedRequest(filters), period, top_n: filters.topN };
}

export function toCompareRequest(filters: Filters, topK = 15): CompareRequest {
  return { ...sharedRequest(filters), periods: [...COMPARED_PERIODS], top_k: topK };
}

/** Cuántos filtros difieren de sus valores por defecto (cada lista cuenta como uno). */
export function activeFilterCount(filters: Filters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter((key) => {
    const value = filters[key];
    const fallback = DEFAULT_FILTERS[key];
    return Array.isArray(value) ? value.length > 0 : value !== fallback;
  }).length;
}

/** Problemas que se pueden detectar antes de llamar a la API, como claves de texto. */
export function filterIssues(filters: Filters, availableCategories: number): MessageKey[] {
  const issues: MessageKey[] = [];
  const selected = filters.categories.length || availableCategories;
  if (filters.linkMode === "between" && selected < 2) issues.push("filters.issueBetween");
  if (filters.linkMode === "pairs" && filters.categoryPairs.length === 0) issues.push("filters.issuePairs");
  return issues;
}

interface FilterStore {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  reset: () => void;
}

const initialSearch = typeof window === "undefined" ? "" : window.location.search;

export const useFilterStore = create<FilterStore>()((set) => ({
  filters: filtersFromSearch(initialSearch),
  update: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));

if (typeof window !== "undefined") {
  useFilterStore.subscribe(({ filters }) => {
    const search = filtersToSearch(filters);
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  });
}
