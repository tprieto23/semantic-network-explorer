import { useEffect, useId, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ExplorerMeta } from "../api/client";
import { documentsInPeriod, isTypeChecked, typeSelection } from "../domain/scope";
import { formatInt } from "../domain/vocabulary";
import { useT } from "../i18n";
import type { Filters } from "../state/filters";
import { useAnchoredPopup } from "./useAnchoredPopup";

interface DocumentTypeFilterProps {
  meta: ExplorerMeta | undefined;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
}

/**
 * Tipos de documento como lista de casillas, todas marcadas por defecto: desmarcar es
 * excluir y «solo» deja un único tipo. Cada tipo muestra cuántos documentos aporta con
 * el resto de los filtros (idioma, período, incubadora), y los que no aportan ninguno
 * se ven atenuados para no armar combinaciones vacías.
 */
export function DocumentTypeFilter({ meta, filters, update }: DocumentTypeFilterProps) {
  const { t, lang } = useT();
  const listId = useId();
  const popup = useAnchoredPopup<HTMLButtonElement, HTMLDivElement>();
  const { triggerRef, popupRef, open, setOpen } = popup;

  // Un tipo que llega por la URL y ya no está en los datos sigue visible para poder quitarlo.
  const types = useMemo(() => {
    const names = (meta?.document_types ?? []).map((type) => type.name);
    return [...names, ...filters.documentTypes.filter((type) => !names.includes(type))];
  }, [meta, filters.documentTypes]);

  const { counts, total } = useMemo(() => {
    const result = new Map<string, number>();
    if (!meta) return { counts: result, total: 0 };
    const documents = documentsInPeriod(meta, { ...filters, documentTypes: [], documentTypeMode: "only" }, filters.period);
    documents.forEach((document) => {
      if (document.document_type) result.set(document.document_type, (result.get(document.document_type) ?? 0) + 1);
    });
    return { counts: result, total: documents.length };
  }, [meta, filters]);

  const checked = types.filter((type) => isTypeChecked(type, filters));
  const unchecked = types.filter((type) => !checked.includes(type));
  const allChecked = unchecked.length === 0;

  const summary = allChecked
    ? t("filters.allTypes")
    : checked.length === 1
      ? t("filters.only", { name: checked[0] })
      : unchecked.length === 1
        ? t("filters.typesExceptOne", { name: unchecked[0] })
        : checked.length === 2
          ? t("filters.typesTwo", { a: checked[0], b: checked[1] })
          : t("filters.typesSome", { n: checked.length, m: types.length });

  const apply = (next: string[]) => update(typeSelection(next, types));

  function toggle(type: string) {
    if (!checked.includes(type)) apply([...checked, type]);
    // El último tipo marcado no se puede quitar: dejaría la red sin documentos.
    else if (checked.length > 1) apply(checked.filter((item) => item !== type));
  }

  useEffect(() => {
    if (open) popupRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
  }, [open, popupRef]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onPopupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id="document-type"
        type="button"
        className="select gsel-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : popup.show())}
      >
        <span className="gsel-value">{summary}</span>
        <svg className="gsel-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        popup.style &&
        createPortal(
          <div
            ref={popupRef}
            id={listId}
            role="group"
            aria-label={t("filters.documentType")}
            className="gsel-list type-list glass"
            style={popup.style}
            onKeyDown={onPopupKeyDown}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && !popupRef.current?.contains(next) && !triggerRef.current?.contains(next)) setOpen(false);
            }}
          >
            <label className="type-row type-all">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(input) => {
                  if (input) input.indeterminate = !allChecked;
                }}
                onChange={() => apply(types)}
                disabled={allChecked}
              />
              <span className="type-name">{t("filters.allTypes")}</span>
              <span className="gsel-hint num">{formatInt(total, lang)}</span>
            </label>
            {types.map((type) => {
              const count = counts.get(type) ?? 0;
              const isChecked = checked.includes(type);
              return (
                <div key={type} className={`type-row${count === 0 ? " empty" : ""}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isChecked && checked.length === 1}
                      onChange={() => toggle(type)}
                    />
                    <span className="type-name">{type}</span>
                    <span className="gsel-hint num">{formatInt(count, lang)}</span>
                  </label>
                  <button
                    type="button"
                    className="type-only"
                    aria-label={t("filters.only", { name: type })}
                    disabled={count === 0 || (isChecked && checked.length === 1)}
                    onClick={() => apply([type])}
                  >
                    {t("filters.onlyAction")}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
