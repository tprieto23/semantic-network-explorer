import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ExplorerMeta } from "../api/client";
import { METRIC_ORDER, categoryColor, categoryLabel, formatInt, metricInfo } from "../domain/vocabulary";
import type { MessageKey } from "../i18n";
import { useT } from "../i18n";
import { useAnimatedClose } from "./useAnimatedClose";

/**
 * Primera oración de la definición del codebook: el resto son instrucciones para el
 * modelo de extracción («No infieras…», «Extrae…») que no le sirven a quien lee.
 */
function definitionSummary(definition: string): string {
  const end = definition.search(/\.(\s|$)/);
  return end === -1 ? definition : definition.slice(0, end + 1);
}

/** Descripción sin el prefijo «Nombre (término):», que ya está en la cabecera de la tarjeta. */
function metricText(description: string): string {
  const text = description.replace(/^[^:]+:\s*/, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Tab = "overview" | "categories" | "metrics" | "limits";

const TABS: { id: Tab; label: MessageKey }[] = [
  { id: "overview", label: "method.tabOverview" },
  { id: "categories", label: "method.tabCategories" },
  { id: "metrics", label: "method.tabMetrics" },
  { id: "limits", label: "method.tabLimits" },
];

const STEPS: { title: MessageKey; text: MessageKey }[] = [
  { title: "method.step1", text: "method.step1Text" },
  { title: "method.step2", text: "method.step2Text" },
  { title: "method.step3", text: "method.step3Text" },
  { title: "method.step4", text: "method.step4Text" },
  { title: "method.step5", text: "method.step5Text" },
];

const LIMITS: MessageKey[] = ["method.limit1", "method.limit2", "method.limit3", "method.limit4"];

/**
 * Metodología: qué se analiza, cómo se construye la red, qué es cada categoría y cada
 * métrica, y qué límites tiene. Organizada en pestañas para no obligar a leerlo todo.
 */
export function Methodology({ meta, onClose: dismiss }: { meta: ExplorerMeta | undefined; onClose: () => void }) {
  const { t, lang } = useT();
  const { closing, close: onClose } = useAnimatedClose(dismiss);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Flechas izquierda/derecha entre pestañas (patrón de pestañas de ARIA).
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TABS.findIndex((item) => item.id === tab);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`method-tab-${next.id}`)?.focus();
  }

  const categories = (meta?.categories ?? []).filter((category) => !category.legacy);
  const entities = categories.reduce((sum, category) => sum + category.entity_count, 0);
  const stats = meta
    ? [
        { value: formatInt(meta.documents.length, lang), label: t("method.statDocs") },
        { value: formatInt(entities, lang), label: t("method.statEntities") },
        { value: String(categories.length), label: t("method.statCategories") },
        { value: String(meta.periods.length), label: t("method.statPeriods") },
        { value: meta.languages.map((code) => code.toUpperCase()).join(" · "), label: t("method.statLanguages") },
      ]
    : [];

  return (
    <div className={`modal-backdrop${closing ? " closing" : ""}`} onClick={onClose}>
      <div
        className="card method-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="method-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="method-head">
          <div>
            <h2 id="method-title">{t("method.title")}</h2>
            <p>{t("method.subtitle")}</p>
          </div>
          <button ref={closeRef} type="button" className="round-btn" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </header>

        <div className="method-tabs" role="tablist" aria-label={t("method.title")}>
          {TABS.map((item) => (
            <button
              key={item.id}
              id={`method-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`method-panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={onTabKey}
            >
              {t(item.label)}
            </button>
          ))}
        </div>

        <div
          className="method-body"
          role="tabpanel"
          id={`method-panel-${tab}`}
          aria-labelledby={`method-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "overview" && (
            <>
              <p className="method-lead">
                {t("method.corpusLead", {
                  y: formatInt(meta ? meta.documents.length - meta.documents_without_year : 0, lang),
                })}
              </p>
              <dl className="method-stats">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd className="num">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <h3>{t("method.network")}</h3>
              <ol className="method-steps">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="method-step-n num" aria-hidden="true">
                      {index + 1}
                    </span>
                    <strong>{t(step.title)}</strong>
                    <span>{t(step.text)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {tab === "categories" && (
            <>
              <p className="method-lead">{t("method.entitiesText")}</p>
              <ul className="method-grid">
                {categories.map((category) => (
                  <li
                    key={category.code}
                    className="method-card"
                    style={{ borderTopColor: categoryColor(category.code) }}
                  >
                    <div className="method-card-head">
                      <span className="dot" style={{ background: categoryColor(category.code) }} />
                      <strong>{categoryLabel(category.code, lang)}</strong>
                      <span className="method-tag num">{formatInt(category.entity_count, lang)}</span>
                    </div>
                    {/* La definición del codebook solo existe en español. */}
                    {lang === "es" && category.definition && <p>{definitionSummary(category.definition)}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "metrics" && (
            <>
              <p className="method-lead">{t("method.metricsLead")}</p>
              <ul className="method-grid">
                {METRIC_ORDER.map((metric) => {
                  const info = metricInfo(metric, lang);
                  return (
                    <li key={metric} className="method-card">
                      <div className="method-card-head">
                        <strong>{info.label}</strong>
                        <span className="method-tag">{info.hint}</span>
                      </div>
                      <p>{metricText(info.description)}</p>
                    </li>
                  );
                })}
                <li className="method-card">
                  <div className="method-card-head">
                    <strong>{t("filters.colorCommunity")}</strong>
                    <span className="method-tag">Louvain</span>
                  </div>
                  <p>{t("method.groupsText")}</p>
                </li>
              </ul>
            </>
          )}

          {tab === "limits" && (
            <>
              <p className="method-lead">{t("method.limitsLead")}</p>
              <ul className="method-limits">
                {LIMITS.map((limit) => (
                  <li key={limit}>
                    <span className="method-limit-icon" aria-hidden="true">
                      !
                    </span>
                    {t(limit)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
