import type { CategoryCode, EdgeWeighting, LinkMode, PeriodId, RankingMetric } from "../api/client";
import type { Lang } from "../i18n";
import type { Theme } from "../state/theme";

/**
 * Paleta de categorías (incluye los tres tonos del logo). Es la misma en claro y oscuro;
 * INFRA (categoría antigua, ya no aparece en los datos) queda en gris neutro.
 */
const PALETTE: Record<CategoryCode, string> = {
  CHAR: "#858DCC", // violeta del logo
  LOC: "#8BCB2E", // verde lima del logo
  PRAC: "#DE6B9C", // rosa frambuesa
  RUL: "#6BC8CC", // turquesa del logo
  KNOW: "#397DB8", // azul
  ATT: "#E69745", // naranja
  SKILL: "#287A62", // verde bosque
  physical_INFRA: "#BC5653", // rojo terracota
  soft_INFRA: "#B99B30", // amarillo mostaza
  eco_INFRA: "#794A83", // morado ciruela
  INFRA: "#8E948F",
};

/** Orden de presentación de las categorías en filtros y leyendas. */
export const CATEGORY_ORDER: CategoryCode[] = [
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

export function categoryColor(code: string): string {
  return PALETTE[code as CategoryCode] ?? PALETTE.INFRA;
}

/** Fondo translúcido de chips y marcas de evidencia. */
export function categoryTint(code: string, theme: Theme): string {
  return `${categoryColor(code)}${theme === "oscuro" ? "2e" : "26"}`;
}

const CATEGORY_LABELS: Record<Lang, Record<CategoryCode, string>> = {
  es: {
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
  },
  en: {
    CHAR: "Actors",
    KNOW: "Knowledge",
    ATT: "Attitudes and values",
    SKILL: "Skills",
    PRAC: "Practices",
    physical_INFRA: "Physical infrastructure",
    soft_INFRA: "Support infrastructure",
    eco_INFRA: "Ecological infrastructure",
    RUL: "Rules",
    LOC: "Places",
    INFRA: "Infrastructure (legacy)",
  },
};

/** Etiquetas cortas para leyendas y chips. */
const CATEGORY_SHORT_LABELS: Record<Lang, Record<CategoryCode, string>> = {
  es: {
    CHAR: "Actores",
    KNOW: "Saberes",
    ATT: "Actitudes",
    SKILL: "Habilidades",
    PRAC: "Prácticas",
    physical_INFRA: "Infr. física",
    soft_INFRA: "Infr. de soporte",
    eco_INFRA: "Infr. ecológica",
    RUL: "Reglas",
    LOC: "Lugares",
    INFRA: "Infr. (legado)",
  },
  en: {
    CHAR: "Actors",
    KNOW: "Knowledge",
    ATT: "Attitudes",
    SKILL: "Skills",
    PRAC: "Practices",
    physical_INFRA: "Physical infra.",
    soft_INFRA: "Support infra.",
    eco_INFRA: "Ecological infra.",
    RUL: "Rules",
    LOC: "Places",
    INFRA: "Infra. (legacy)",
  },
};

export function categoryLabel(code: string, lang: Lang, short = false): string {
  const labels = (short ? CATEGORY_SHORT_LABELS : CATEGORY_LABELS)[lang];
  return labels[code as CategoryCode] ?? code;
}

interface MetricInfo {
  label: string;
  /** Descripción breve en el selector: «PageRank · influencia global». */
  hint: string;
  description: string;
}

const METRICS: Record<Lang, Record<RankingMetric, MetricInfo>> = {
  es: {
    pagerank: {
      label: "PageRank",
      hint: "influencia global",
      description: "Influencia global: es alto si se conecta con entidades que a su vez son importantes.",
    },
    degree: { label: "Grado", hint: "vecinos distintos", description: "Con cuántas entidades distintas aparece en la misma oración." },
    strength: {
      label: "Grado ponderado",
      hint: "coocurrencias totales",
      description: "Suma de todas sus coocurrencias: las conexiones muchas veces repetidas pesan más.",
    },
    betweenness: {
      label: "Intermediación",
      hint: "nodo puente",
      description: "Nodo puente: es alto si conecta grupos que de otro modo no se tocan.",
    },
    closeness: {
      label: "Cercanía",
      hint: "centro de la red",
      description: "Qué tan al centro está: a cuántos pasos queda del resto de la red.",
    },
    document_count: { label: "Nº documentos", hint: "recurrencia", description: "En cuántos documentos aparece al menos una vez." },
  },
  en: {
    pagerank: {
      label: "PageRank",
      hint: "global influence",
      description: "Global influence: high if it connects with entities that are themselves important.",
    },
    degree: { label: "Degree", hint: "distinct neighbors", description: "How many distinct entities it appears with in the same sentence." },
    strength: {
      label: "Weighted degree",
      hint: "total co-occurrences",
      description: "Sum of all its co-occurrences: connections repeated many times weigh more.",
    },
    betweenness: {
      label: "Betweenness",
      hint: "bridge node",
      description: "Bridge node: high if it connects groups that otherwise don't touch.",
    },
    closeness: {
      label: "Closeness",
      hint: "network center",
      description: "How central it is: how many steps away it is from the rest of the network.",
    },
    document_count: { label: "No. of documents", hint: "recurrence", description: "In how many documents it appears at least once." },
  },
};

export function metricInfo(metric: RankingMetric, lang: Lang): MetricInfo {
  return METRICS[lang][metric];
}

export function metricLabel(metric: RankingMetric, lang: Lang): string {
  return METRICS[lang][metric].label;
}

export const METRIC_ORDER: RankingMetric[] = [
  "pagerank",
  "degree",
  "strength",
  "betweenness",
  "closeness",
  "document_count",
];

const LINK_MODES: Record<Lang, Record<LinkMode, { label: string; description: string }>> = {
  es: {
    any: { label: "Todos", description: "Cualquier par entre las categorías elegidas." },
    between: { label: "Solo entre categorías", description: "Por ejemplo Actores ↔ Prácticas; excluye Actores ↔ Actores." },
    within: { label: "Solo dentro de cada categoría", description: "Por ejemplo Actores ↔ Actores." },
    pairs: { label: "Pares específicos", description: "Elige exactamente qué pares de categorías se enlazan." },
  },
  en: {
    any: { label: "All", description: "Any pair among the selected categories." },
    between: { label: "Only between categories", description: "For example Actors ↔ Practices; excludes Actors ↔ Actors." },
    within: { label: "Only within each category", description: "For example Actors ↔ Actors." },
    pairs: { label: "Specific pairs", description: "Choose exactly which category pairs are linked." },
  },
};

export function linkModes(lang: Lang) {
  return LINK_MODES[lang];
}

const EDGE_WEIGHTINGS: Record<Lang, Record<EdgeWeighting, { label: string; description: string }>> = {
  es: {
    "fractional-document": {
      label: "Fraccional por documento",
      description: "Cada oración aporta 1/(N−1) y cada documento aporta como máximo 1. Recomendado.",
    },
    fractional: { label: "Fraccional", description: "Cada oración aporta 1/(N−1) según cuántas entidades tiene." },
    "sentence-count": { label: "Oraciones", description: "Número de oraciones donde coocurren." },
    "document-count": { label: "Documentos", description: "Número de documentos donde coocurren." },
  },
  en: {
    "fractional-document": {
      label: "Fractional per document",
      description: "Each sentence contributes 1/(N−1) and each document contributes at most 1. Recommended.",
    },
    fractional: { label: "Fractional", description: "Each sentence contributes 1/(N−1) depending on how many entities it has." },
    "sentence-count": { label: "Sentences", description: "Number of sentences where they co-occur." },
    "document-count": { label: "Documents", description: "Number of documents where they co-occur." },
  },
};

export function edgeWeightings(lang: Lang) {
  return EDGE_WEIGHTINGS[lang];
}

export const PERIOD_ORDER: PeriodId[] = ["all", "2000-2020", "2021-2023", "2024-2026"];

export function periodShort(period: PeriodId, lang: Lang): string {
  if (period === "all") return lang === "es" ? "Todo" : "All";
  return period.replace(/^(\d{4})-\d{2}(\d{2})$/, "$1–$2");
}

/** Entero con separador de miles: 36.873 en español, 36,873 en inglés. */
export function formatInt(value: number, lang: Lang): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "es" ? "." : ",");
}

function formatDecimal(value: number, digits: number, lang: Lang): string {
  const text = value.toFixed(digits);
  return lang === "es" ? text.replace(".", ",") : text;
}

export function formatMetric(metric: RankingMetric, value: number, lang: Lang): string {
  switch (metric) {
    case "degree":
    case "document_count":
      return formatInt(value, lang);
    case "strength":
      return value >= 100 ? formatInt(value, lang) : formatDecimal(value, 1, lang);
    case "pagerank":
      return formatDecimal(value, 4, lang);
    default:
      return formatDecimal(value, 3, lang);
  }
}

export function formatWeight(value: number, lang: Lang): string {
  return value >= 100 ? formatInt(value, lang) : formatDecimal(value, value >= 10 ? 1 : 2, lang);
}
