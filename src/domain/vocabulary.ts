import type { CategoryCode, EdgeWeighting, LinkMode, PeriodId, RankingMetric } from "../api/client";
import type { Lang } from "../i18n";
import type { Theme } from "../state/theme";

interface CategoryPalette {
  /** Tono saturado: resaltados y acentos. */
  vivid: Record<Theme, string>;
  /** Tono suave: nodos, puntos y chips (estilo «plano» del diseño). */
  soft: Record<Theme, string>;
}

/** Paleta validada en claro y oscuro (diseño «Redes semánticas · Madre de Dios»). */
const PALETTE: Record<CategoryCode, CategoryPalette> = {
  CHAR: { vivid: { oscuro: "#F3A742", claro: "#B46A00" }, soft: { oscuro: "#D3A262", claro: "#C8873A" } },
  LOC: { vivid: { oscuro: "#6CC1F0", claro: "#0A79B5" }, soft: { oscuro: "#82B2CF", claro: "#4E8DB8" } },
  PRAC: { vivid: { oscuro: "#2FBF8A", claro: "#0A7F57" }, soft: { oscuro: "#68AD90", claro: "#4E9A73" } },
  RUL: { vivid: { oscuro: "#F07555", claro: "#BE3E1E" }, soft: { oscuro: "#D08A78", claro: "#C46A55" } },
  KNOW: { vivid: { oscuro: "#E08BC4", claro: "#A6388A" }, soft: { oscuro: "#C29DBA", claro: "#A56A9A" } },
  ATT: { vivid: { oscuro: "#EBD64E", claro: "#8A7500" }, soft: { oscuro: "#C8BA74", claro: "#B39B3A" } },
  SKILL: { vivid: { oscuro: "#5F8DF5", claro: "#2B55C9" }, soft: { oscuro: "#8699CC", claro: "#6077B8" } },
  physical_INFRA: { vivid: { oscuro: "#C09A78", claro: "#7A5536" }, soft: { oscuro: "#AE9A88", claro: "#9A7F68" } },
  soft_INFRA: { vivid: { oscuro: "#A98BFF", claro: "#6A43D6" }, soft: { oscuro: "#A397CE", claro: "#8573BE" } },
  eco_INFRA: { vivid: { oscuro: "#A7D45A", claro: "#4F7F0C" }, soft: { oscuro: "#A0B878", claro: "#7FA04A" } },
  INFRA: { vivid: { oscuro: "#9AA19C", claro: "#6B716D" }, soft: { oscuro: "#8E948F", claro: "#80857F" } },
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

export function categoryColor(code: string, theme: Theme, tone: "soft" | "vivid" = "soft"): string {
  const palette = PALETTE[code as CategoryCode] ?? PALETTE.INFRA;
  return palette[tone][theme];
}

/** Fondo translúcido de chips y marcas de evidencia. */
export function categoryTint(code: string, theme: Theme): string {
  return `${categoryColor(code, theme)}${theme === "oscuro" ? "2e" : "26"}`;
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
