import { useCallback, useMemo, useState } from "react";
import type { CompareResponse, NetworkResponse } from "../api/client";
import { gainers, leader, strongestLinks } from "../domain/insights";
import { categoryLabel, formatInt, formatMetric, metricLabel, periodShort } from "../domain/vocabulary";
import { LayoutMemory } from "../graph/buildGraph";
import type { MessageKey } from "../i18n";
import { errorText, useT } from "../i18n";
import type { Filters } from "../state/filters";
import { activeFilterCount, useFilterStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { useUiStore } from "../state/ui";
import { FilterIcon, ResetIcon } from "./icons";
import { CategoryDot, Legend } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";
import { Loader } from "./Loader";

interface NetworkViewProps {
  network: NetworkResponse | undefined;
  compare: CompareResponse | undefined;
  isFetching: boolean;
  error: unknown;
  issues: MessageKey[];
  onRetry: () => void;
}

export function NetworkView({ network, compare, isFetching, error, issues, onRetry }: NetworkViewProps) {
  const { t, lang } = useT();
  const filters = useFilterStore((state) => state.filters);
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);
  const requestFocus = useSelectionStore((state) => state.requestFocus);
  const [hovered, setHovered] = useState<string | null>(null);
  // Las posiciones se reutilizan para que los cambios de filtro no reordenen todo el mapa.
  const [layoutMemory] = useState(() => new LayoutMemory());
  const drawn = useMemo(
    () => (network && filters.edgeDisplay === "strongest" ? strongestLinks(network) : network),
    [network, filters.edgeDisplay],
  );
  const graph = useMemo(
    () => (drawn && drawn.nodes.length > 0 ? layoutMemory.build(drawn, filters.metric) : null),
    [layoutMemory, drawn, filters.metric],
  );
  const onHover = useCallback((node: string | null) => setHovered(node), []);
  const filtersCollapsed = useUiStore((state) => state.filtersCollapsed);
  const setFiltersCollapsed = useUiStore((state) => state.setFiltersCollapsed);
  const resetFilters = useFilterStore((state) => state.reset);
  const activeFilters = activeFilterCount(filters);

  const presentCategories = useMemo(
    () => [...new Set((network?.nodes ?? []).map((node) => node.category))],
    [network],
  );
  const hoveredNode = hovered ? network?.nodes.find((node) => node.id === hovered) : undefined;

  function focusOn(id: string) {
    select({ kind: "node", id });
    requestFocus(id);
  }

  const showError = error instanceof Error && !graph;

  return (
    <section className="stage" aria-label={t("net.aria")}>
      {isFetching && graph && (
        <div className="updating">
          <Loader size={22} inline label={t("net.updating")} />
        </div>
      )}

      {network && network.nodes.length > 0 && (
        <Insights network={network} compare={compare} metric={filters.metric} onPick={focusOn} />
      )}

      <div className="stage-canvas">
        {graph && (
          <NetworkCanvas graph={graph} selection={selection} onSelect={select} onHover={onHover} zoomControls />
        )}

        {filtersCollapsed && (
          <div className="stage-filters">
            <button
              type="button"
              className="glass-btn"
              aria-label={t("filters.show")}
              onClick={() => setFiltersCollapsed(false)}
            >
              <FilterIcon />
              {t("filters.heading")}
              {activeFilters > 0 && <span className="badge num">{activeFilters}</span>}
            </button>
            {activeFilters > 0 && (
              <button
                type="button"
                className="glass-btn round"
                aria-label={t("filters.resetShort")}
                title={t("filters.resetShort")}
                onClick={resetFilters}
              >
                <ResetIcon />
              </button>
            )}
          </div>
        )}

        <div className="notices">
          {issues.map((issue) => (
            <div className="notice error" key={issue}>
              {t(issue)}
            </div>
          ))}
          {error instanceof Error && graph && <div className="notice error">{errorText(error, t)}</div>}
        </div>

        {hoveredNode && (
          <div className="hover-card">
            <strong>{hoveredNode.name}</strong>
            <span>
              <CategoryDot category={hoveredNode.category} />
              {categoryLabel(hoveredNode.category, lang)} ·{" "}
              {t("net.neighbors", { n: formatInt(hoveredNode.metrics.degree, lang) })}
            </span>
          </div>
        )}

        {!graph && isFetching && <LoadingState network={network} />}
        {!graph && !isFetching && showError && <ErrorState message={errorText(error as Error, t)} onRetry={onRetry} />}
        {!graph && !isFetching && !showError && network && issues.length === 0 && (
          <EmptyState network={network} filters={filters} />
        )}
      </div>

      {network && network.nodes.length > 0 && (
        <footer className="stage-foot">
          <Legend categories={presentCategories} />
          <span className="stage-counts">
            <span>
              <strong className="num">{formatInt(network.stages.shown.nodes, lang)}</strong> {t("net.entities")}
            </span>
            <span title={filters.edgeDisplay === "strongest" ? t("net.strongestTitle") : undefined}>
              {drawn && drawn.edges.length < network.edges.length ? (
                <>
                  <strong className="num">{formatInt(drawn.edges.length, lang)}</strong>{" "}
                  {t("net.ofLinks", { n: formatInt(network.stages.shown.edges, lang) })}
                </>
              ) : (
                <>
                  <strong className="num">{formatInt(network.stages.shown.edges, lang)}</strong> {t("net.links")}
                </>
              )}
            </span>
            <span className="faint">{t("net.sizeIs", { metric: metricLabel(filters.metric, lang) })}</span>
          </span>
        </footer>
      )}
    </section>
  );
}

function Insights({
  network,
  compare,
  metric,
  onPick,
}: {
  network: NetworkResponse;
  compare: CompareResponse | undefined;
  metric: Filters["metric"];
  onPick: (id: string) => void;
}) {
  const { t, lang } = useT();
  const selection = useSelectionStore((state) => state.selection);
  const central = leader(network, metric);
  const bridge = leader(network, "betweenness");
  const riser = compare ? gainers(compare, 1)[0] : undefined;
  const isSelected = (id: string | undefined) => selection?.kind === "node" && selection.id === id;
  const metricName = metricLabel(metric, lang);

  return (
    <div className="insights">
      {central && (
        <button type="button" className="insight" aria-pressed={isSelected(central.id)} onClick={() => onPick(central.id)}>
          <span className="insight-label">{t("net.mostCentral")}</span>
          <span className="insight-value">
            <CategoryDot category={central.category} />
            <strong>{central.name}</strong>
            <span>
              {t("net.centralDetail", {
                rank: central.ranks[metric],
                metric: metricName,
                n: formatInt(central.mention_count, lang),
              })}
            </span>
          </span>
        </button>
      )}
      {bridge && (
        <button type="button" className="insight" aria-pressed={isSelected(bridge.id)} onClick={() => onPick(bridge.id)}>
          <span className="insight-label">{t("net.bridge")}</span>
          <span className="insight-value">
            <CategoryDot category={bridge.category} />
            <strong>{bridge.name}</strong>
            <span>
              {t("net.bridgeDetail", {
                v: formatMetric("betweenness", bridge.metrics.betweenness, lang),
                n: formatInt(bridge.metrics.degree, lang),
              })}
            </span>
          </span>
        </button>
      )}
      {riser ? (
        <button
          type="button"
          className="insight"
          aria-pressed={isSelected(riser.id)}
          onClick={() => network.nodes.some((node) => node.id === riser.id) && onPick(riser.id)}
        >
          <span className="insight-label">{t("net.riser")}</span>
          <span className="insight-value">
            <CategoryDot category={riser.category} />
            <strong>{riser.name}</strong>
            <span>{t("net.riserDetail", { from: riser.fromRank, to: riser.toRank, metric: metricName })}</span>
          </span>
        </button>
      ) : (
        <div className="insight">
          <span className="insight-label">{t("net.riser")}</span>
          <span className="insight-value">
            {compare ? <span>{t("net.riserNone")}</span> : <Loader size={18} inline label={t("common.computing")} />}
          </span>
        </div>
      )}
    </div>
  );
}

function LoadingState({ network }: { network: NetworkResponse | undefined }) {
  const { t, lang } = useT();
  return (
    <div className="state">
      <div className="state-card center">
        <Loader size={88} />
        <strong>{t("net.loadingTitle")}</strong>
        <p>
          {network
            ? t("net.loadingDetail", {
                e: formatInt(network.stages.cooccurrence.nodes, lang),
                m: formatInt(network.stages.mentions, lang),
              })
            : t("net.loadingGeneric")}{" "}
          {t("net.loadingNote")}
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="state">
      <div className="state-card danger">
        <strong>{t("net.errorTitle")}</strong>
        <p>{t("net.errorDetail", { message })}</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onRetry}>
            {t("net.retry")}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(message).then(() => setCopied(true), () => setCopied(false));
            }}
          >
            {copied ? t("net.copied") : t("net.copyError")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ network, filters }: { network: NetworkResponse; filters: Filters }) {
  const { t, lang } = useT();
  const update = useFilterStore((state) => state.update);
  const stages = network.stages;
  const noDocuments = network.scope.document_count === 0;
  const options: { label: string; from: string; to: string; apply: () => void }[] = [];
  if (filters.minWeight > 0) {
    options.push({ label: t("net.optMinWeight"), from: String(filters.minWeight), to: "0", apply: () => update({ minWeight: 0 }) });
  }
  if (filters.minDocuments > 2) {
    options.push({
      label: t("net.optRecurrence"),
      from: `${filters.minDocuments}`,
      to: t("common.docs", { n: 2 }),
      apply: () => update({ minDocuments: 2 }),
    });
  }
  if (filters.linkMode !== "any") {
    options.push({
      label: t("net.optLinkType"),
      from: t("net.optCurrent"),
      to: t("net.optAllLinks"),
      apply: () => update({ linkMode: "any" }),
    });
  }
  if (filters.categories.length > 0) {
    options.push({
      label: t("net.optCategories"),
      from: `${filters.categories.length}`,
      to: t("net.optAllCategories"),
      apply: () => update({ categories: [], categoryPairs: [] }),
    });
  }
  if (filters.excludedEntityIds.length > 0) {
    options.push({
      label: t("net.optExcluded"),
      from: `${filters.excludedEntityIds.length}`,
      to: "0",
      apply: () => update({ excludedEntityIds: [] }),
    });
  }
  if (filters.language !== "all") {
    options.push({
      label: t("net.optLanguage"),
      from: filters.language,
      to: t("net.optAll"),
      apply: () => update({ language: "all" }),
    });
  }
  if (filters.documentType !== "all") {
    options.push({
      label: t("net.optDocumentType"),
      from: `${filters.documentTypeMode === "exclude" ? "≠ " : ""}${filters.documentType}`,
      to: t("net.optAll"),
      apply: () => update({ documentType: "all", documentTypeMode: "only" }),
    });
  }
  if (filters.period !== "all") {
    options.push({
      label: t("net.optPeriod"),
      from: periodShort(filters.period, lang),
      to: t("net.optAllPeriods"),
      apply: () => update({ period: "all" }),
    });
  }

  return (
    <div className="state">
      <div className="state-card">
        <span className="state-ring" />
        <strong>{noDocuments ? t("net.noDocsTitle") : t("net.emptyTitle")}</strong>
        <p>
          {noDocuments ? (
            t("net.noDocsBody")
          ) : stages.document_recurrence.nodes > 0 ? (
            <>
              {t("net.emptyThere")}{" "}
              <strong className="num">{t("net.emptyEntities", { n: formatInt(stages.document_recurrence.nodes, lang) })}</strong>{" "}
              {t("net.emptyRest", { d: filters.minDocuments })}
            </>
          ) : (
            (network.warnings[0] ?? t("net.emptyNoEntities"))
          )}{" "}
          {options.length > 0 && t("net.emptyTry")}
        </p>
        <div className="btn-row" style={{ flexDirection: "column" }}>
          {options.map((option) => (
            <button key={option.label} type="button" className="option-btn" onClick={option.apply}>
              <span>
                {option.label}
                <span className="faint">
                  {option.from} → {option.to}
                </span>
              </span>
              <span>{t("net.optApply")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
