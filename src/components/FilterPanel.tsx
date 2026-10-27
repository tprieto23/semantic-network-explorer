import { useMemo, useState } from "react";
import type { CategoryCode, ExplorerMeta, NetworkResponse } from "../api/client";
import {
  CATEGORY_ORDER,
  METRIC_ORDER,
  categoryColor,
  categoryLabel,
  categoryTint,
  edgeWeightings,
  formatInt,
  linkModes,
  metricInfo,
  periodShort,
} from "../domain/vocabulary";
import { useT } from "../i18n";
import type { CategoryPair, Filters } from "../state/filters";
import { activeFilterCount, useFilterStore } from "../state/filters";
import { useTheme } from "../state/theme";
import { useUiStore } from "../state/ui";
import { ChevronIcon, ResetIcon } from "./icons";
import { CategoryDot } from "./Legend";
import { StageFunnel } from "./StageFunnel";

interface FilterPanelProps {
  meta: ExplorerMeta | undefined;
  network: NetworkResponse | undefined;
}

function samePair(a: CategoryPair, b: CategoryPair) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function FilterPanel({ meta, network }: FilterPanelProps) {
  const { t, lang } = useT();
  const collapsed = useUiStore((state) => state.filtersCollapsed);
  const setCollapsed = useUiStore((state) => state.setFiltersCollapsed);
  const filters = useFilterStore((state) => state.filters);
  const update = useFilterStore((state) => state.update);
  const reset = useFilterStore((state) => state.reset);
  const theme = useTheme();

  const categories = useMemo(
    () =>
      (meta?.categories ?? [])
        .filter((category) => !category.legacy || category.entity_count > 0)
        .sort((a, b) => CATEGORY_ORDER.indexOf(a.code as never) - CATEGORY_ORDER.indexOf(b.code as never)),
    [meta],
  );
  const allCodes = categories.map((category) => category.code as CategoryCode);
  const selectedCodes: CategoryCode[] = filters.categories.length ? filters.categories : allCodes;
  const allSelected = filters.categories.length === 0;
  const active = activeFilterCount(filters);
  const activeLabel = active === 1 ? t("filters.activeOne") : t("filters.active", { n: active });

  function toggleCategory(code: CategoryCode) {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((item) => item !== code)
      : [...selectedCodes, code];
    if (next.length === 0) return;
    const pairs = filters.categoryPairs.filter((pair) => next.includes(pair[0]) && next.includes(pair[1]));
    update({ categories: next.length === allCodes.length ? [] : next, categoryPairs: pairs });
  }

  const resetButton = (
    <button
      type="button"
      className="round-btn"
      aria-label={t("filters.resetShort")}
      title={t("filters.resetShort")}
      disabled={active === 0}
      onClick={reset}
    >
      <ResetIcon />
    </button>
  );

  // Cerrado, el panel no ocupa espacio: la red muestra un botón flotante para abrirlo.
  if (collapsed) return null;

  return (
    <>
      {/* Solo visible en celular, donde el panel es una hoja sobre la red. */}
      <div className="sheet-backdrop" aria-hidden onClick={() => setCollapsed(true)} />
      <aside className="card filters" aria-label={t("filters.title")}>
        <div className="panel-head">
          <h2>
            {t("filters.title")}
            {active > 0 && <span className="badge num">{active}</span>}
          </h2>
          <div className="panel-actions">
            {resetButton}
            <button type="button" className="round-btn" aria-label={t("filters.hide")} onClick={() => setCollapsed(true)}>
              <ChevronIcon />
            </button>
          </div>
        </div>
        {active > 0 && (
          <button type="button" className="reset-bar" onClick={reset}>
            <ResetIcon />
            {t("filters.resetShort")}
            <span className="faint">· {activeLabel}</span>
          </button>
        )}

        <div className="filters-body">
          <section className="group">
            <h3 className="group-title">{t("filters.scope")}</h3>
            <div className="field">
              <span className="field-label">{t("filters.period")}</span>
              <div className="segmented" role="group" aria-label={t("filters.period")}>
                <button type="button" aria-pressed={filters.period === "all"} onClick={() => update({ period: "all" })}>
                  {t("filters.allPeriods")}
                  <span className="count">{meta ? t("common.docs", { n: meta.documents.length }) : "–"}</span>
                </button>
                {(meta?.periods ?? []).map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    aria-pressed={filters.period === period.id}
                    onClick={() => update({ period: period.id as Filters["period"] })}
                  >
                    {periodShort(period.id as Filters["period"], lang)}
                    <span className="count">{t("common.docs", { n: period.document_count })}</span>
                  </button>
                ))}
              </div>
              {meta && meta.documents_without_year > 0 && (
                <p className="help">{t("filters.withoutYear", { n: meta.documents_without_year })}</p>
              )}
            </div>
          </section>

          <section className="group">
            <div className="group-head">
              <h3 className="group-title">{t("filters.categories")}</h3>
              {!allSelected && (
                <button type="button" className="text-btn" onClick={() => update({ categories: [], categoryPairs: [] })}>
                  {t("filters.allCategories")}
                </button>
              )}
            </div>
            <div className="chips" role="group" aria-label={t("filters.categoriesAria")}>
              {categories.map((category) => {
                const code = category.code as CategoryCode;
                const active = selectedCodes.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    className="chip"
                    aria-pressed={active}
                    // La definición del codebook solo existe en español.
                    title={lang === "es" ? (category.definition ?? categoryLabel(code, lang)) : categoryLabel(code, lang)}
                    onClick={() => toggleCategory(code)}
                    style={
                      active
                        ? { borderColor: categoryColor(code, theme), background: categoryTint(code, theme) }
                        : undefined
                    }
                  >
                    <CategoryDot category={code} />
                    {categoryLabel(code, lang, true)}
                    <span className="count num">{formatInt(category.entity_count, lang)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {filters.excludedEntityIds.length > 0 && (
            <ExcludedEntities network={network} ids={filters.excludedEntityIds} update={update} />
          )}

          <section className="group">
            <h3 className="group-title">{t("filters.importance")}</h3>
            <div className="field">
              <label htmlFor="metric">{t("filters.sizeBy")}</label>
              <select
                id="metric"
                className="select"
                value={filters.metric}
                onChange={(event) => update({ metric: event.target.value as Filters["metric"] })}
              >
                {METRIC_ORDER.map((metric) => (
                  <option key={metric} value={metric}>
                    {metricInfo(metric, lang).label} · {metricInfo(metric, lang).hint}
                  </option>
                ))}
              </select>
              <p className="help">{metricInfo(filters.metric, lang).description}</p>
            </div>
            <div className="field">
              <div className="field-row">
                <label htmlFor="top-n">{t("filters.showTop")}</label>
                <strong className="num">{t("filters.top", { n: filters.topN })}</strong>
              </div>
              <input
                id="top-n"
                type="range"
                min={10}
                max={400}
                step={10}
                value={filters.topN}
                onChange={(event) => update({ topN: Number(event.target.value) })}
              />
            </div>
            <div className="field">
              <span className="field-label">{t("filters.visibleLinks")}</span>
              <div className="segmented" role="group" aria-label={t("filters.visibleLinks")}>
                <button
                  type="button"
                  aria-pressed={filters.edgeDisplay === "strongest"}
                  onClick={() => update({ edgeDisplay: "strongest" })}
                >
                  {t("filters.strongest")}
                </button>
                <button type="button" aria-pressed={filters.edgeDisplay === "all"} onClick={() => update({ edgeDisplay: "all" })}>
                  {t("filters.allLinks")}
                </button>
              </div>
              <p className="help">
                {filters.edgeDisplay === "strongest" ? t("filters.strongestHelp") : t("filters.allHelp")}
              </p>
            </div>
          </section>

          <details className="disclosure" open={filters.linkMode !== "any" || undefined}>
            <summary>{t("filters.advanced")}</summary>
            <div className="disclosure-body">
              <AdvancedFilters meta={meta} filters={filters} update={update} selectedCodes={selectedCodes} />
            </div>
          </details>

          {network && (
            <StageFunnel stages={network.stages} minDocuments={filters.minDocuments} minWeight={filters.minWeight} />
          )}
        </div>
      </aside>
    </>
  );
}

function ExcludedEntities({
  network,
  ids,
  update,
}: {
  network: NetworkResponse | undefined;
  ids: string[];
  update: (patch: Partial<Filters>) => void;
}) {
  const { t, lang } = useT();
  const known = new Map((network?.excluded_entities ?? []).map((entity) => [entity.id, entity]));
  return (
    <section className="group">
      <div className="group-head">
        <h3 className="group-title">{t("filters.excluded")}</h3>
        <button type="button" className="text-btn" onClick={() => update({ excludedEntityIds: [] })}>
          {t("filters.includeAll")}
        </button>
      </div>
      <div className="chips">
        {ids.map((id) => {
          const entity = known.get(id);
          const name = entity?.name ?? t("filters.excludedUnknown");
          return (
            <span key={id} className="chip excluded-chip" title={entity?.category ? categoryLabel(entity.category, lang) : undefined}>
              {entity?.category && <CategoryDot category={entity.category} />}
              <span className={entity?.name ? undefined : "faint"}>{name}</span>
              <button
                type="button"
                aria-label={t("filters.includeAgain", { name })}
                onClick={() => update({ excludedEntityIds: ids.filter((item) => item !== id) })}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <p className="help">{t("filters.excludedHelp")}</p>
    </section>
  );
}

interface AdvancedFiltersProps {
  meta: ExplorerMeta | undefined;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  selectedCodes: CategoryCode[];
}

function AdvancedFilters({ meta, filters, update, selectedCodes }: AdvancedFiltersProps) {
  const { t, lang } = useT();
  const [docQuery, setDocQuery] = useState("");
  const [showDocs, setShowDocs] = useState(filters.documentIds.length > 0);
  const documents = (meta?.documents ?? []).filter((document) =>
    document.name.toLowerCase().includes(docQuery.trim().toLowerCase()),
  );
  const weightings = edgeWeightings(lang);

  const possiblePairs = useMemo(() => {
    const pairs: CategoryPair[] = [];
    selectedCodes.forEach((a, index) => selectedCodes.slice(index).forEach((b) => pairs.push([a, b])));
    return pairs;
  }, [selectedCodes]);

  function togglePair(pair: CategoryPair) {
    const exists = filters.categoryPairs.some((item) => samePair(item, pair));
    update({
      categoryPairs: exists
        ? filters.categoryPairs.filter((item) => !samePair(item, pair))
        : [...filters.categoryPairs, pair],
    });
  }

  function toggleDocument(id: string) {
    const selected = filters.documentIds.includes(id)
      ? filters.documentIds.filter((item) => item !== id)
      : [...filters.documentIds, id];
    update({ documentIds: selected });
  }

  return (
    <>
      <div className="field">
        <label htmlFor="sector">{t("filters.sector")}</label>
        <select
          id="sector"
          className="select"
          value={filters.sector}
          onChange={(event) => update({ sector: event.target.value as Filters["sector"], documentIds: [] })}
        >
          <option value="Agroforestry">{t("filters.sectorAgro")}</option>
          <option value="all">{t("filters.sectorAll")}</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="field">
          <label htmlFor="incubator">{t("filters.incubator")}</label>
          <select
            id="incubator"
            className="select"
            value={String(filters.incubator)}
            onChange={(event) =>
              update({ incubator: event.target.value === "all" ? "all" : Number(event.target.value) })
            }
          >
            <option value="all">{t("filters.allIncubators")}</option>
            {(meta?.incubators ?? []).map((incubator) => (
              <option key={incubator} value={incubator}>
                {incubator}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="language">{t("filters.language")}</label>
          <select
            id="language"
            className="select"
            value={filters.language}
            onChange={(event) => update({ language: event.target.value })}
          >
            <option value="all">{t("filters.allLanguages")}</option>
            {(meta?.languages ?? []).map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <button type="button" className="text-btn" style={{ textAlign: "left" }} onClick={() => setShowDocs(!showDocs)}>
          {showDocs ? "▾" : "▸"} {t("filters.documents")}{" "}
          {filters.documentIds.length ? t("filters.docsSelected", { n: filters.documentIds.length }) : t("filters.docsAll")}
        </button>
        {showDocs && (
          <>
            <input
              className="input"
              type="search"
              placeholder={t("filters.searchDocument")}
              value={docQuery}
              onChange={(event) => setDocQuery(event.target.value)}
            />
            <div className="doc-list">
              {documents.map((document) => (
                <label key={document.id}>
                  <input
                    type="checkbox"
                    checked={filters.documentIds.includes(document.id)}
                    onChange={() => toggleDocument(document.id)}
                  />
                  <span>
                    {document.name}
                    <span className="faint"> · {document.year ?? t("common.noYear")}</span>
                  </span>
                </label>
              ))}
            </div>
            {filters.documentIds.length > 0 && (
              <button type="button" className="text-btn" onClick={() => update({ documentIds: [] })}>
                {t("filters.useAllDocuments")}
              </button>
            )}
          </>
        )}
      </div>

      <div className="field">
        <span className="field-label">{t("filters.linkType")}</span>
        <div className="radio-list" role="radiogroup" aria-label={t("filters.linkType")}>
          {Object.entries(linkModes(lang)).map(([mode, info]) => (
            <label key={mode} title={info.description}>
              <input
                type="radio"
                name="link-mode"
                checked={filters.linkMode === mode}
                onChange={() => update({ linkMode: mode as Filters["linkMode"] })}
              />
              <span>{info.label}</span>
            </label>
          ))}
        </div>
        {filters.linkMode === "pairs" && (
          <div className="chips" role="group" aria-label={t("filters.pairsAria")}>
            {possiblePairs.map((pair) => (
              <button
                key={pair.join("-")}
                type="button"
                className="chip"
                aria-pressed={filters.categoryPairs.some((item) => samePair(item, pair))}
                onClick={() => togglePair(pair)}
              >
                <CategoryDot category={pair[0]} />
                {pair[0] === pair[1]
                  ? categoryLabel(pair[0], lang, true)
                  : `${categoryLabel(pair[0], lang, true)} ↔ ${categoryLabel(pair[1], lang, true)}`}
                {pair[0] !== pair[1] && <CategoryDot category={pair[1]} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <div className="field-row">
          <label htmlFor="min-docs">{t("filters.minRecurrence")}</label>
          <strong className="num">{t("filters.recurrenceValue", { n: filters.minDocuments })}</strong>
        </div>
        <input
          id="min-docs"
          type="range"
          min={1}
          max={Math.max(5, Math.min(12, meta?.documents.length ?? 5))}
          value={filters.minDocuments}
          onChange={(event) => update({ minDocuments: Number(event.target.value) })}
        />
        <p className="help">
          {t("filters.recurrenceHelp")}
          {filters.minDocuments === 1 && t("filters.recurrenceSlow")}
        </p>
      </div>

      <div className="field">
        <label htmlFor="weighting">{t("filters.weighting")}</label>
        <select
          id="weighting"
          className="select"
          value={filters.weighting}
          onChange={(event) => update({ weighting: event.target.value as Filters["weighting"] })}
        >
          {Object.entries(weightings).map(([value, info]) => (
            <option key={value} value={value}>
              {info.label}
            </option>
          ))}
        </select>
        <p className="help">{weightings[filters.weighting].description}</p>
      </div>
      <div className="field">
        <label htmlFor="min-weight">{t("filters.minWeight")}</label>
        <input
          id="min-weight"
          className="input"
          type="number"
          min={0}
          step={filters.weighting.startsWith("fractional") ? 0.1 : 1}
          value={filters.minWeight}
          onChange={(event) => update({ minWeight: Math.max(0, Number(event.target.value) || 0) })}
        />
      </div>
    </>
  );
}
