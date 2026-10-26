import type { CategoryCode, EdgeWeighting, LinkMode, PeriodId, RankingMetric } from "../api/client";

/** Colores categóricos: diez tonos distinguibles y gris para el legado. */
export const CATEGORY_COLORS: Record<CategoryCode, string> = {
  CHAR: "#e4572e",
  ATT: "#e76f9a",
  KNOW: "#f4a261",
  SKILL: "#e9c46a",
  PRAC: "#2a9d8f",
  soft_INFRA: "#00a6c8",
  eco_INFRA: "#43a047",
  physical_INFRA: "#8d6e63",
  RUL: "#8e5cc4",
  LOC: "#3a86ff",
  INFRA: "#9e9e9e",
};

/** Etiquetas de respaldo; la fuente es `/meta`. */
export const CATEGORY_FALLBACK_LABELS: Record<CategoryCode, string> = {
  CHAR: "Actores",
  KNOW: "Saberes",
  ATT: "Actitudes y valores",
  SKILL: "Habilidades",
  PRAC: "Prácticas",
  physical_INFRA: "Infraestructura física",
  soft_INFRA: "Infraestructura de soporte",
  eco_INFRA: "Infraestructura ecológica",
  RUL: "Reglas",
  LOC: "Lugares",
  INFRA: "Infraestructura (legado)",
};

export function categoryColor(code: string): string {
  return CATEGORY_COLORS[code as CategoryCode] ?? "#9e9e9e";
}

export const METRICS: Record<RankingMetric, { label: string; short: string; description: string }> = {
  pagerank: {
    label: "PageRank",
    short: "PageRank",
    description: "Importancia por estar conectado con entidades a su vez importantes.",
  },
  degree: {
    label: "Grado",
    short: "Grado",
    description: "Cantidad de entidades distintas con las que coocurre.",
  },
  strength: {
    label: "Grado ponderado",
    short: "Fuerza",
    description: "Suma de los pesos de sus links: cuánto coocurre, no solo con cuántas.",
  },
  betweenness: {
    label: "Intermediación",
    short: "Puente",
    description: "Qué tan seguido está en el camino más corto entre otras entidades (nodo puente).",
  },
  closeness: {
    label: "Cercanía",
    short: "Cercanía",
    description: "Qué tan cerca está, en promedio, del resto de la red.",
  },
  document_count: {
    label: "Documentos",
    short: "Docs",
    description: "En cuántos documentos aparece (recurrencia documental).",
  },
};

export const METRIC_ORDER: RankingMetric[] = [
  "pagerank",
  "degree",
  "strength",
  "betweenness",
  "closeness",
  "document_count",
];

export const LINK_MODES: Record<LinkMode, { label: string; description: string }> = {
  any: { label: "Todos los links", description: "Cualquier par entre las categorías elegidas." },
  between: { label: "Solo entre categorías", description: "Por ejemplo CHAR ↔ PRAC; excluye CHAR ↔ CHAR." },
  within: { label: "Solo dentro de cada categoría", description: "Por ejemplo CHAR ↔ CHAR." },
  pairs: { label: "Pares específicos", description: "Elige exactamente qué pares de categorías se enlazan." },
};

export const EDGE_WEIGHTINGS: Record<EdgeWeighting, { label: string; description: string }> = {
  "fractional-document": {
    label: "Fraccional por documento",
    description: "Cada oración aporta 1/(N−1) y cada documento aporta como máximo 1. Recomendado.",
  },
  fractional: { label: "Fraccional", description: "Cada oración aporta 1/(N−1) según cuántas entidades tiene." },
  "sentence-count": { label: "Oraciones", description: "Número de oraciones donde coocurren." },
  "document-count": { label: "Documentos", description: "Número de documentos donde coocurren." },
};

export const PERIOD_ORDER: PeriodId[] = ["all", "2021-2023", "2024-2026"];

export function formatMetric(metric: RankingMetric, value: number): string {
  if (metric === "degree" || metric === "document_count") return String(value);
  if (metric === "strength") return value.toFixed(2);
  return value.toFixed(3);
}
