import { useMemo, useState } from "react";
import type { CategoryCode, ExplorerMeta, NetworkResponse } from "../api/client";
import {
  CATEGORY_FALLBACK_LABELS,
  EDGE_WEIGHTINGS,
  LINK_MODES,
  METRIC_ORDER,
  METRICS,
  categoryColor,
} from "../domain/vocabulary";
import type { CategoryPair, Filters } from "../state/filters";
import { useFilterStore } from "../state/filters";
import { StageFunnel } from "./StageFunnel";

interface FilterPanelProps {
  meta: ExplorerMeta | undefined;
  network: NetworkResponse | undefined;
}

function samePair(a: CategoryPair, b: CategoryPair) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function FilterPanel({ meta, network }: FilterPanelProps) {
  const filters = useFilterStore((state) => state.filters);
  const update = useFilterStore((state) => state.update);
  const reset = useFilterStore((state) => state.reset);

  const categories = useMemo(
    () => (meta?.categories ?? []).filter((category) => !category.legacy || category.entity_count > 0),
    [meta],
  );
  const allCodes = categories.map((category) => category.code as CategoryCode);
  const selectedCodes: CategoryCode[] = filters.categories.length ? filters.categories : allCodes;
  const labelFor = (code: string) =>
    categories.find((category) => category.code === code)?.label ??
    CATEGORY_FALLBACK_LABELS[code as CategoryCode] ??
    code;

  function toggleCategory(code: CategoryCode) {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((item) => item !== code)
      : [...selectedCodes, code];
    if (next.length === 0) return;
    const pairs = filters.categoryPairs.filter((pair) => next.includes(pair[0]) && next.includes(pair[1]));
    update({ categories: next.length === allCodes.length ? [] : next, categoryPairs: pairs });
  }

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

  return (
    <aside className="sidebar" aria-label="Filtros">
      <ScopeSection meta={meta} filters={filters} update={update} />

      <section className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="section-title">Categorías</h2>
          <button type="button" className="link-button" onClick={() => update({ categories: [], categoryPairs: [] })}>
            Todas
          </button>
        </div>
        <div className="chips" role="group" aria-label="Categorías de nodos">
          {categories.map((category) => {
            const code = category.code as CategoryCode;
            return (
              <button
                key={code}
                type="button"
                className="chip"
                aria-pressed={selectedCodes.includes(code)}
                title={category.definition ?? undefined}
                onClick={() => toggleCategory(code)}
              >
                <span className="dot" style={{ background: categoryColor(code) }} />
                {category.label}
                {category.legacy && " ·legado"}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Tipo de link</h2>
        <div className="radio-list" role="radiogroup" aria-label="Tipo de link">
          {Object.entries(LINK_MODES).map(([mode, info]) => (
            <label key={mode}>
              <input
                type="radio"
                name="link-mode"
                checked={filters.linkMode === mode}
                onChange={() => update({ linkMode: mode as Filters["linkMode"] })}
              />
              <span>
                {info.label}
                <span className="hint">{info.description}</span>
              </span>
            </label>
          ))}
        </div>
        {filters.linkMode === "pairs" && (
          <div className="chips" style={{ marginTop: 10 }} role="group" aria-label="Pares de categorías">
            {possiblePairs.map((pair) => (
              <button
                key={pair.join("-")}
                type="button"
                className="chip"
                aria-pressed={filters.categoryPairs.some((item) => samePair(item, pair))}
                onClick={() => togglePair(pair)}
              >
                <span className="dot" style={{ background: categoryColor(pair[0]) }} />
                {pair[0] === pair[1] ? labelFor(pair[0]) : `${labelFor(pair[0])} ↔ ${labelFor(pair[1])}`}
                <span className="dot" style={{ background: categoryColor(pair[1]) }} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Importancia y legibilidad</h2>
        <div className="field">
          <label htmlFor="min-docs">Aparece en al menos {filters.minDocuments} documento(s)</label>
          <input
            id="min-docs"
            type="range"
            min={1}
            max={Math.max(5, Math.min(12, meta?.documents.length ?? 5))}
            value={filters.minDocuments}
            onChange={(event) => update({ minDocuments: Number(event.target.value) })}
          />
          <span className="hint">Recurrencia documental: deja fuera lo que solo menciona un documento.</span>
        </div>
        <div className="field">
          <label htmlFor="metric">Ordenar y dimensionar por</label>
          <select
            id="metric"
            value={filters.metric}
            onChange={(event) => update({ metric: event.target.value as Filters["metric"] })}
          >
            {METRIC_ORDER.map((metric) => (
              <option key={metric} value={metric}>
                {METRICS[metric].label}
              </option>
            ))}
          </select>
          <span className="hint">{METRICS[filters.metric].description}</span>
        </div>
        <div className="field">
          <label htmlFor="top-n">Mostrar las {filters.topN} entidades más centrales</label>
          <input
            id="top-n"
            type="range"
            min={10}
            max={500}
            step={10}
            value={filters.topN}
            onChange={(event) => update({ topN: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="weighting">Peso de los links</label>
          <select
            id="weighting"
            value={filters.weighting}
            onChange={(event) => update({ weighting: event.target.value as Filters["weighting"] })}
          >
            {Object.entries(EDGE_WEIGHTINGS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
          <span className="hint">{EDGE_WEIGHTINGS[filters.weighting].description}</span>
        </div>
        <div className="field">
          <label htmlFor="min-weight">Peso mínimo del link</label>
          <input
            id="min-weight"
            type="number"
            min={0}
            step={filters.weighting.startsWith("fractional") ? 0.1 : 1}
            value={filters.minWeight}
            onChange={(event) => update({ minWeight: Math.max(0, Number(event.target.value) || 0) })}
          />
        </div>
      </section>

      {network && (
        <section className="section">
          <h2 className="section-title">Qué se está mostrando</h2>
          <StageFunnel stages={network.stages} />
        </section>
      )}

      <button type="button" className="link-button" onClick={reset}>
        Restablecer filtros
      </button>
    </aside>
  );
}

interface ScopeSectionProps {
  meta: ExplorerMeta | undefined;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
}

function ScopeSection({ meta, filters, update }: ScopeSectionProps) {
  const [docQuery, setDocQuery] = useState("");
  const [showDocs, setShowDocs] = useState(filters.documentIds.length > 0);
  const documents = (meta?.documents ?? []).filter((document) =>
    document.name.toLowerCase().includes(docQuery.trim().toLowerCase()),
  );

  function toggleDocument(id: string) {
    const selected = filters.documentIds.includes(id)
      ? filters.documentIds.filter((item) => item !== id)
      : [...filters.documentIds, id];
    update({ documentIds: selected });
  }

  return (
    <section className="section">
      <h2 className="section-title">Alcance</h2>
      <div className="field">
        <label htmlFor="sector">Sector productivo</label>
        <select
          id="sector"
          value={filters.sector}
          onChange={(event) => update({ sector: event.target.value as Filters["sector"], documentIds: [] })}
        >
          <option value="Agroforestry">Agroforestería</option>
          <option value="all">Todos (incluye documentos sin sector)</option>
        </select>
        {meta && meta.documents_excluded_by_sector > 0 && (
          <span className="hint">
            {meta.documents_excluded_by_sector} documento(s) listos quedan fuera por no tener este sector.
          </span>
        )}
      </div>
      <div className="field">
        <span className="label">Período</span>
        <div className="segmented" role="group" aria-label="Período">
          <button type="button" aria-pressed={filters.period === "all"} onClick={() => update({ period: "all" })}>
            Todos
            <span className="count">{meta?.documents.length ?? "–"} docs</span>
          </button>
          {(meta?.periods ?? []).map((period) => (
            <button
              key={period.id}
              type="button"
              aria-pressed={filters.period === period.id}
              onClick={() => update({ period: period.id as Filters["period"] })}
            >
              {period.label}
              <span className="count">{period.document_count} docs</span>
            </button>
          ))}
        </div>
        {meta && meta.documents_without_year > 0 && (
          <span className="hint">
            {meta.documents_without_year} documento(s) sin año: solo aparecen en «Todos».
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="field">
          <label htmlFor="incubator">Incubadora</label>
          <select
            id="incubator"
            value={String(filters.incubator)}
            onChange={(event) =>
              update({ incubator: event.target.value === "all" ? "all" : Number(event.target.value) })
            }
          >
            <option value="all">Todas</option>
            {(meta?.incubators ?? []).map((incubator) => (
              <option key={incubator} value={incubator}>
                {incubator}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="language">Idioma</label>
          <select id="language" value={filters.language} onChange={(event) => update({ language: event.target.value })}>
            <option value="all">Todos</option>
            {(meta?.languages ?? []).map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <button type="button" className="link-button" style={{ textAlign: "left" }} onClick={() => setShowDocs(!showDocs)}>
          {showDocs ? "▾" : "▸"} Documentos{" "}
          {filters.documentIds.length ? `(${filters.documentIds.length} seleccionados)` : "(todos)"}
        </button>
        {showDocs && (
          <>
            <input
              type="search"
              placeholder="Buscar documento"
              value={docQuery}
              onChange={(event) => setDocQuery(event.target.value)}
            />
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {documents.map((document) => (
                <label key={document.id} style={{ display: "flex", gap: 6, fontWeight: 400, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={filters.documentIds.includes(document.id)}
                    onChange={() => toggleDocument(document.id)}
                  />
                  <span>
                    {document.name}
                    <span className="hint"> · {document.year ?? "sin año"}</span>
                  </span>
                </label>
              ))}
            </div>
            {filters.documentIds.length > 0 && (
              <button type="button" className="link-button" onClick={() => update({ documentIds: [] })}>
                Usar todos los documentos
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
