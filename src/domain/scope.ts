import type { ExplorerDocument, ExplorerMeta, PeriodId } from "../api/client";
import type { Filters } from "../state/filters";

/**
 * Documentos de meta que entran en el alcance actual (idioma, tipo, incubadora y
 * selección manual), con el mismo criterio que la API. El período se aplica aparte.
 */
export function documentsInScope(documents: ExplorerDocument[], filters: Filters): ExplorerDocument[] {
  return documents.filter(
    (document) =>
      (filters.language === "all" || document.language === filters.language) &&
      (filters.documentType === "all" ||
        (filters.documentTypeMode === "exclude"
          ? document.document_type !== filters.documentType
          : document.document_type === filters.documentType)) &&
      (filters.incubator === "all" || document.incubator_number === filters.incubator) &&
      (filters.documentIds.length === 0 || filters.documentIds.includes(document.id)),
  );
}

/** Documentos del alcance actual en un período; undefined mientras carga meta. */
export function periodDocumentCount(meta: ExplorerMeta | undefined, filters: Filters, period: PeriodId): number | undefined {
  if (!meta) return undefined;
  const documents = documentsInScope(meta.documents, filters);
  if (period === "all") return documents.length;
  const range = meta.periods.find((item) => item.id === period);
  if (!range) return 0;
  return documents.filter(
    (document) => document.year != null && document.year >= range.year_from && document.year <= range.year_to,
  ).length;
}
