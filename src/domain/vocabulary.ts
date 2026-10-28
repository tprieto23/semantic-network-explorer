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

/** Los diez colores de la paleta, en orden; también colorean las comunidades. */
export function categoryPalette(): string[] {
  return Object.entries(PALETTE)
    .filter(([code]) => code !== "INFRA")
    .map(([, color]) => color);
}

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
    soft_INFRA: "Infraestructura blanda",
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
    soft_INFRA: "Soft infrastructure",
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
    soft_INFRA: "Infr. blanda",
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
    soft_INFRA: "Soft infra.",
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

// Nombre en lenguaje claro; el término técnico va como pista («Influencia · PageRank»).
const METRICS: Record<Lang, Record<RankingMetric, MetricInfo>> = {
  es: {
    pagerank: {
      label: "Influencia",
      hint: "PageRank",
      description: "Influencia (PageRank): es alta si se conecta con entidades que a su vez son importantes.",
    },
    degree: {
      label: "Conexiones",
      hint: "grado",
      description: "Conexiones (grado): con cuántas entidades distintas aparece en la misma oración.",
    },
    strength: {
      label: "Intensidad",
      hint: "grado ponderado",
      description: "Intensidad (grado ponderado): suma de todas sus coocurrencias; las conexiones repetidas pesan más.",
    },
    betweenness: {
      label: "Puente entre grupos",
      hint: "intermediación",
      description: "Puente entre grupos (intermediación): es alta si conecta grupos que de otro modo no se tocan.",
    },
    closeness: {
      label: "Cercanía al centro",
      hint: "cercanía",
      description: "Cercanía al centro: a cuántos pasos queda del resto de la red.",
    },
    document_count: {
      label: "Presencia en documentos",
      hint: "nº de documentos",
      description: "En cuántos documentos aparece al menos una vez.",
    },
  },
  en: {
    pagerank: {
      label: "Influence",
      hint: "PageRank",
      description: "Influence (PageRank): high if it connects with entities that are themselves important.",
    },
    degree: {
      label: "Connections",
      hint: "degree",
      description: "Connections (degree): how many distinct entities it appears with in the same sentence.",
    },
    strength: {
      label: "Intensity",
      hint: "weighted degree",
      description: "Intensity (weighted degree): sum of all its co-occurrences; repeated connections weigh more.",
    },
    betweenness: {
      label: "Bridge between groups",
      hint: "betweenness",
      description: "Bridge between groups (betweenness): high if it connects groups that otherwise don't touch.",
    },
    closeness: {
      label: "Closeness to center",
      hint: "closeness",
      description: "Closeness to center: how many steps away it is from the rest of the network.",
    },
    document_count: {
      label: "Document presence",
      hint: "no. of documents",
      description: "In how many documents it appears at least once.",
    },
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
      label: "Equilibrado (recomendado)",
      description: "Pesa más que dos entidades aparezcan juntas en oraciones cortas, y ningún documento puede dominar: cada uno aporta como máximo 1. Técnicamente: fraccional por documento.",
    },
    fractional: {
      label: "Por oración, ajustado",
      description: "Pesa más que aparezcan juntas en oraciones cortas, sin límite por documento. Técnicamente: fraccional, 1/(N−1).",
    },
    "sentence-count": { label: "Oraciones en común", description: "Cuántas oraciones comparten las dos entidades." },
    "document-count": { label: "Documentos en común", description: "Cuántos documentos mencionan a las dos entidades juntas." },
  },
  en: {
    "fractional-document": {
      label: "Balanced (recommended)",
      description: "Appearing together in short sentences weighs more, and no document can dominate: each contributes at most 1. Technically: fractional per document.",
    },
    fractional: {
      label: "Per sentence, adjusted",
      description: "Appearing together in short sentences weighs more, with no limit per document. Technically: fractional, 1/(N−1).",
    },
    "sentence-count": { label: "Shared sentences", description: "How many sentences the two entities share." },
    "document-count": { label: "Shared documents", description: "How many documents mention both entities together." },
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
