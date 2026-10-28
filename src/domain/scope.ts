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
      typeMatches(document.document_type, filters) &&
      (filters.incubator === "all" || document.incubator_number === filters.incubator) &&
      (filters.documentIds.length === 0 || filters.documentIds.includes(document.id)),
  );
}

/** Mismo criterio que la API: excluir tipos conserva los documentos sin tipo. */
function typeMatches(type: string | null | undefined, filters: Filters): boolean {
  if (!filters.documentTypes.length) return true;
  const listed = type != null && filters.documentTypes.includes(type);
  return filters.documentTypeMode === "exclude" ? !listed : listed;
}

/** ¿El tipo está marcado (entra en la red) con la selección actual? */
export function isTypeChecked(type: string, filters: Filters): boolean {
  return typeMatches(type, filters);
}

/**
 * Convierte los tipos marcados en el filtro más corto de leer: sin filtro si están
 * todos; «solo …» si quedan pocos; «todos menos …» si se desmarcaron pocos. Así un tipo
 * nuevo en los datos entra solo cuando el filtro es una exclusión.
 */
export function typeSelection(
  checked: Iterable<string>,
  allTypes: string[],
): Pick<Filters, "documentTypes" | "documentTypeMode"> {
  const marked = new Set(checked);
  const unchecked = allTypes.filter((type) => !marked.has(type));
  if (unchecked.length === 0) return { documentTypes: [], documentTypeMode: "only" };
  if (marked.size <= unchecked.length) return { documentTypes: [...marked].sort(), documentTypeMode: "only" };
  return { documentTypes: [...unchecked].sort(), documentTypeMode: "exclude" };
}

/** Documentos del alcance actual dentro de un período ("all" = sin límite de años). */
export function documentsInPeriod(meta: ExplorerMeta, filters: Filters, period: PeriodId): ExplorerDocument[] {
  const documents = documentsInScope(meta.documents, filters);
  if (period === "all") return documents;
  const range = meta.periods.find((item) => item.id === period);
  if (!range) return [];
  return documents.filter(
    (document) => document.year != null && document.year >= range.year_from && document.year <= range.year_to,
  );
}

/** Documentos del alcance actual en un período; undefined mientras carga meta. */
export function periodDocumentCount(meta: ExplorerMeta | undefined, filters: Filters, period: PeriodId): number | undefined {
  return meta ? documentsInPeriod(meta, filters, period).length : undefined;
}
