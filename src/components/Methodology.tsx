import { useEffect, useRef } from "react";
import type { ExplorerMeta } from "../api/client";
import { METRIC_ORDER, categoryLabel, formatInt, metricInfo } from "../domain/vocabulary";
import { useT } from "../i18n";
import { CategoryDot } from "./Legend";

/**
 * Primera oración de la definición del codebook: el resto son instrucciones para el
 * modelo de extracción («No infieras…», «Extrae…») que no le sirven a quien lee.
 */
function definitionSummary(definition: string): string {
  const end = definition.search(/\.(\s|$)/);
  return end === -1 ? definition : definition.slice(0, end + 1);
}

/**
 * Cómo se construye la red, con los datos reales del corpus: qué se analiza, qué es cada
 * categoría, cómo se miden los links y las métricas, y qué límites tiene el análisis.
 */
export function Methodology({ meta, onClose }: { meta: ExplorerMeta | undefined; onClose: () => void }) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categories = (meta?.categories ?? []).filter((category) => !category.legacy);
  const withYear = meta ? meta.documents.length - meta.documents_without_year : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card method-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="method-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="method-title">{t("method.title")}</h2>
          <button ref={closeRef} type="button" className="round-btn" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="method-body">
          <section>
            <h3>{t("method.corpus")}</h3>
            <p>
              {meta
                ? t("method.corpusText", {
                    n: formatInt(meta.documents.length, lang),
                    y: formatInt(withYear, lang),
                    l: meta.languages.join(", "),
                  })
                : t("common.loading")}
            </p>
          </section>

          <section>
            <h3>{t("method.entities")}</h3>
            <p>{t("method.entitiesText")}</p>
            <dl className="method-categories">
              {categories.map((category) => (
                <div key={category.code}>
                  <dt>
                    <CategoryDot category={category.code} />
                    {categoryLabel(category.code, lang)}
                  </dt>
                  {/* La definición del codebook solo existe en español. */}
                  {lang === "es" && category.definition && <dd>{definitionSummary(category.definition)}</dd>}
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>{t("method.network")}</h3>
            <ul>
              <li>{t("method.network1")}</li>
              <li>{t("method.network2")}</li>
              <li>{t("method.network3")}</li>
            </ul>
          </section>

          <section>
            <h3>{t("method.metrics")}</h3>
            <ul>
              {METRIC_ORDER.map((metric) => (
                <li key={metric}>{metricInfo(metric, lang).description}</li>
              ))}
              <li>{t("method.groups")}</li>
            </ul>
          </section>

          <section>
            <h3>{t("method.limits")}</h3>
            <ul>
              <li>{t("method.limit1")}</li>
              <li>{t("method.limit2")}</li>
              <li>{t("method.limit3")}</li>
              <li>{t("method.limit4")}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
