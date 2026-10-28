import { useMemo } from "react";
import type { EvidenceParams, EvidenceResponse, ExplorerNode, NetworkResponse } from "../api/client";
import { useCompare, useEvidence } from "../api/queries";
import {
  METRIC_ORDER,
  categoryColor,
  categoryLabel,
  categoryTint,
  formatInt,
  formatMetric,
  formatWeight,
  metricInfo,
  metricLabel,
} from "../domain/vocabulary";
import { errorText, useT } from "../i18n";
import type { Filters } from "../state/filters";
import { useFilterStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import type { Theme } from "../state/theme";
import { useTheme } from "../state/theme";
import { CategoryDot } from "./Legend";
import { Loader } from "./Loader";

interface DetailsPanelProps {
  network: NetworkResponse | undefined;
  /** Filtros ya estabilizados: los mismos de la red mostrada. */
  filters: Filters;
}

export function DetailsPanel({ network, filters }: DetailsPanelProps) {
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);
  const nodesById = useMemo(() => new Map((network?.nodes ?? []).map((node) => [node.id, node])), [network]);

  if (!selection || !network) return null;

  let content;
  if (selection.kind === "edge" && nodesById.has(selection.source) && nodesById.has(selection.target)) {
    content = (
      <EdgeDetails
        source={nodesById.get(selection.source)!}
        target={nodesById.get(selection.target)!}
        network={network}
        filters={filters}
      />
    );
  } else if (selection.kind === "node" && nodesById.has(selection.id)) {
    content = <NodeDetails node={nodesById.get(selection.id)!} network={network} filters={filters} />;
  } else {
    content = <GoneDetails onClose={() => select(null)} />;
  }
  return (
    <>
      {/* Solo visible en celular, donde el detalle es una hoja sobre la red. */}
      <div className="sheet-backdrop" aria-hidden onClick={() => select(null)} />
      {content}
    </>
  );
}

function GoneDetails({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <aside className="card details" aria-label={t("details.aria")}>
      <div className="details-head">
        <div className="top">
          <p className="muted" style={{ margin: 0 }}>
            {t("details.gone")}
          </p>
          <button type="button" className="close" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}

function NodeDetails({ node, network, filters }: { node: ExplorerNode; network: NetworkResponse; filters: Filters }) {
  const { t, lang } = useT();
  const select = useSelectionStore((state) => state.select);
  const tab = useSelectionStore((state) => state.tab);
  const setTab = useSelectionStore((state) => state.setTab);
  const neighborsOnly = useSelectionStore((state) => state.neighborsOnly);
  const setNeighborsOnly = useSelectionStore((state) => state.setNeighborsOnly);
  const requestFocus = useSelectionStore((state) => state.requestFocus);
  const update = useFilterStore((state) => state.update);
  const total = network.stages.edge_weight.nodes;
  const compare = useCompare(filters, 200);
  const trajectory = compare.data?.trajectories.find((item) => item.id === node.id);

  const neighbors = useMemo(() => {
    const byId = new Map(network.nodes.map((item) => [item.id, item]));
    return network.edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => ({ edge, other: byId.get(edge.source === node.id ? edge.target : edge.source)! }))
      .sort((a, b) => b.edge.sentence_count - a.edge.sentence_count || b.edge.weight - a.edge.weight);
  }, [network, node.id]);
  const maxSentences = Math.max(1, ...neighbors.map(({ edge }) => edge.sentence_count));

  function centerOnGraph() {
    if (tab !== "network") setTab("network");
    requestFocus(node.id);
  }

  const points = trajectory?.points ?? [];
  const previous = points[points.length - 2];
  const last = points[points.length - 1];
  // Cambio en el tramo más reciente, como en el resto de la interfaz.
  const delta = previous?.rank != null && last?.rank != null ? previous.rank - last.rank : null;

  return (
    <aside className="card details" aria-label={t("details.ariaOf", { name: node.name })}>
      <div className="details-head">
        <div className="top">
          <h2>{node.name}</h2>
          <button type="button" className="close" aria-label={t("common.close")} onClick={() => select(null)}>
            ×
          </button>
        </div>
        <span className="tag">
          <CategoryDot category={node.category} />
          {categoryLabel(node.category, lang)}
          <span className="faint">{node.category}</span>
        </span>
        <span className="muted num">
          {t("details.mentions", {
            m: formatInt(node.mention_count, lang),
            d: formatInt(node.metrics.document_count, lang),
          })}
        </span>
        <div className="btn-row">
          <button
            type="button"
            className="outline-btn"
            aria-pressed={neighborsOnly}
            onClick={() => {
              setNeighborsOnly(!neighborsOnly);
              if (tab !== "network") setTab("network");
            }}
          >
            {t("details.neighborsOnly")}
          </button>
          <button type="button" className="outline-btn" onClick={centerOnGraph}>
            {t("details.center")}
          </button>
          <button
            type="button"
            className="outline-btn"
            title={t("details.excludeHint")}
            onClick={() => {
              update({ excludedEntityIds: [...new Set([...filters.excludedEntityIds, node.id])] });
              setNeighborsOnly(false);
              select(null);
            }}
          >
            {t("details.exclude")}
          </button>
        </div>
      </div>

      <div className="details-body">
        <section className="group">
          <div className="section-head">
            <h3>{t("details.metrics")}</h3>
            <span>{t("details.clickSize")}</span>
          </div>
          <div className="metric-grid">
            {METRIC_ORDER.map((metric) => (
              <button
                type="button"
                key={metric}
                className="metric-card"
                aria-pressed={filters.metric === metric}
                title={metricInfo(metric, lang).description}
                onClick={() => update({ metric })}
              >
                <span className="label">{metricLabel(metric, lang)}</span>
                <span className="value">{formatMetric(metric, node.metrics[metric], lang)}</span>
                <span className="rank">
                  <b>#{node.ranks[metric]}</b> {t("details.of", { n: formatInt(total, lang) })}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="group">
          <div className="section-head">
            <h3>{t("details.evolution", { metric: metricLabel(filters.metric, lang) })}</h3>
          </div>
          {compare.isLoading && <Loader size={22} inline label={t("details.computingPeriods")} />}
          {compare.data && !trajectory && <p className="help">{t("details.outOfTop")}</p>}
          {trajectory && last && (
            <div className="evo-card">
              {points.map((point, index) => (
                <div key={point.period} style={{ display: "contents" }}>
                  {index > 0 && <span className="arrow" aria-hidden />}
                  <div className="period" style={{ textAlign: index === points.length - 1 ? "right" : undefined }}>
                    <span>{point.period.replace("-", "–")}</span>
                    <strong>{point.rank === null ? "—" : `#${point.rank}`}</strong>
                  </div>
                </div>
              ))}
              {delta !== null && delta !== 0 && (
                <span className={`delta${delta < 0 ? " down" : ""}`}>
                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                </span>
              )}
            </div>
          )}
        </section>

        <section className="group">
          <div className="section-head">
            <h3>{t("details.strongestLinks")}</h3>
            <span>{t("details.clickEvidence")}</span>
          </div>
          {neighbors.length > 0 ? (
            <ul className="link-list">
              {neighbors.slice(0, 30).map(({ edge, other }) => (
                <li key={other.id}>
                  <button
                    type="button"
                    className="link-row"
                    title={t("details.evidenceHint")}
                    onClick={() =>
                      select({ kind: "edge", source: edge.source, target: edge.target }, { returnTo: node.id })
                    }
                  >
                    <CategoryDot category={other.category} />
                    <span className="name">
                      {other.name}
                      <small>{other.category}</small>
                    </span>
                    <span className="bar" aria-hidden>
                      <span style={{ width: `${(edge.sentence_count / maxSentences) * 100}%` }} />
                    </span>
                    <span className="value">{formatInt(edge.sentence_count, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="help">
              {t("details.linksOutOfTop")}{" "}
              <button type="button" className="text-btn" onClick={() => update({ topN: Math.min(400, filters.topN + 100) })}>
                {t("details.showMore")}
              </button>
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Marca cada mención con el color de su entidad. */
function highlight(text: string, terms: { text: string; category: string }[], theme: Theme) {
  const unique = [...new Map(terms.filter((term) => term.text).map((term) => [term.text.toLowerCase(), term])).values()].sort(
    (a, b) => b.text.length - a.text.length,
  );
  if (!unique.length) return text;
  const pattern = new RegExp(`(${unique.map((term) => escapeRegExp(term.text)).join("|")})`, "gi");
  return text.split(pattern).map((part, index) => {
    const term = unique.find((item) => item.text.toLowerCase() === part.toLowerCase());
    if (!term) return part;
    return (
      <mark
        key={index}
        style={{
          background: categoryTint(term.category, theme),
          borderBottom: `2px solid ${categoryColor(term.category)}`,
        }}
      >
        {part}
      </mark>
    );
  });
}

function EdgeDetails({
  source,
  target,
  network,
  filters,
}: {
  source: ExplorerNode;
  target: ExplorerNode;
  network: NetworkResponse;
  filters: Filters;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const select = useSelectionStore((state) => state.select);
  const returnTo = useSelectionStore((state) => state.returnTo);
  const back = returnTo ? network.nodes.find((node) => node.id === returnTo) : undefined;
  const edge = network.edges.find(
    (item) =>
      (item.source === source.id && item.target === target.id) ||
      (item.source === target.id && item.target === source.id),
  );
  const params: EvidenceParams = {
    sector: filters.sector,
    sourceId: source.id,
    targetId: target.id,
    period: filters.period,
    incubatorNumber: filters.incubator,
    language: filters.language,
    documentTypes: filters.documentTypes,
    documentTypeMode: filters.documentTypeMode,
    documentIds: filters.documentIds,
  };
  const evidence = useEvidence(params);

  return (
    <aside className="card details wide" aria-label={t("details.evidence")}>
      <div className="details-head">
        <div className="top">
          {back ? (
            <button type="button" className="text-btn" onClick={() => select({ kind: "node", id: back.id })}>
              ← {back.name}
            </button>
          ) : (
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
              {t("details.evidence")}
            </span>
          )}
          <button type="button" className="close" aria-label={t("details.closeEvidence")} onClick={() => select(null)}>
            ×
          </button>
        </div>
        {back && (
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            {t("details.evidence")}
          </span>
        )}
        <div className="evidence-pair">
          {[source, target].map((node, index) => (
            <span key={node.id} style={{ display: "contents" }}>
              {index === 1 && <span className="faint">↔</span>}
              <button
                type="button"
                className="tag"
                style={{ background: categoryTint(node.category, theme), borderColor: categoryColor(node.category) }}
                onClick={() => select({ kind: "node", id: node.id })}
              >
                <CategoryDot category={node.category} />
                {node.name}
              </button>
            </span>
          ))}
        </div>
        {edge && (
          <span className="muted num">
            {t("details.weight")} <strong style={{ color: "var(--tx)" }}>{formatWeight(edge.weight, lang)}</strong> ·{" "}
            {t("details.sentencesIn", { n: formatInt(edge.sentence_count, lang) })}{" "}
            <strong style={{ color: "var(--tx)", fontWeight: 500 }}>
              {t("details.inDocuments", { n: formatInt(edge.document_count, lang) })}
            </strong>
            {evidence.data && t("details.showing", { n: evidence.data.items.length })}
          </span>
        )}
      </div>
      <div className="details-body" style={{ gap: 8 }}>
        {evidence.isLoading && <Loader size={56} label={t("details.loadingEvidence")} className="center" />}
        {evidence.error instanceof Error && <div className="notice error">{errorText(evidence.error, t)}</div>}
        {evidence.data && <Sentences data={evidence.data} source={source} target={target} theme={theme} />}
      </div>
    </aside>
  );
}

function Sentences({
  data,
  source,
  target,
  theme,
}: {
  data: EvidenceResponse;
  source: ExplorerNode;
  target: ExplorerNode;
  theme: Theme;
}) {
  const { t, lang } = useT();
  return (
    <>
      {data.items.map((item) => {
        const terms = item.entities
          .filter((entity) => entity.id === source.id || entity.id === target.id)
          .map((entity) => ({ text: entity.mention_text ?? entity.name, category: entity.category }));
        return (
          <article className="sentence" key={`${item.document_id}-${item.sentence_id}`}>
            <p>{highlight(item.text, terms, theme)}</p>
            <footer>
              <span title={item.document_name}>{item.document_name}</span>
              <span className="num">{item.year ?? t("common.noYear")}</span>
            </footer>
          </article>
        );
      })}
      {data.total > data.items.length && (
        <p className="help">{t("details.showingOf", { n: data.items.length, t: formatInt(data.total, lang) })}</p>
      )}
    </>
  );
}
