import { Fragment, useMemo, type ReactNode } from "react";
import type { EvidenceParams, ExplorerNode, NetworkResponse } from "../api/client";
import { useCompare, useEvidence } from "../api/queries";
import { CATEGORY_FALLBACK_LABELS, METRIC_ORDER, METRICS, categoryColor, formatMetric } from "../domain/vocabulary";
import type { Filters } from "../state/filters";
import { useFilterStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { EntityRef } from "./Legend";

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

  return (
    <aside className="details" aria-label="Detalle">
      {selection.kind === "node" && nodesById.has(selection.id) && (
        <NodeDetails node={nodesById.get(selection.id)!} network={network} filters={filters} />
      )}
      {selection.kind === "edge" && nodesById.has(selection.source) && nodesById.has(selection.target) && (
        <EdgeDetails
          source={nodesById.get(selection.source)!}
          target={nodesById.get(selection.target)!}
          network={network}
          filters={filters}
        />
      )}
      {selection.kind === "node" && !nodesById.has(selection.id) && (
        <div className="details-header">
          <p className="hint">La entidad seleccionada ya no está en la red filtrada.</p>
          <button type="button" className="close-button" aria-label="Cerrar" onClick={() => select(null)}>
            ×
          </button>
        </div>
      )}
    </aside>
  );
}

function Header({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) {
  const select = useSelectionStore((state) => state.select);
  return (
    <div className="details-header">
      <div>
        <span className="badge">{subtitle}</span>
        <h2>{title}</h2>
      </div>
      <button type="button" className="close-button" aria-label="Cerrar detalle" onClick={() => select(null)}>
        ×
      </button>
    </div>
  );
}

function NodeDetails({ node, network, filters }: { node: ExplorerNode; network: NetworkResponse; filters: Filters }) {
  const select = useSelectionStore((state) => state.select);
  const update = useFilterStore((state) => state.update);
  const total = network.stages.edge_weight.nodes;
  const compare = useCompare(filters, 200);
  const trajectory = compare.data?.trajectories.find((item) => item.id === node.id);

  const neighbors = useMemo(() => {
    const byId = new Map(network.nodes.map((item) => [item.id, item]));
    return network.edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => ({ edge, other: byId.get(edge.source === node.id ? edge.target : edge.source)! }))
      .sort((a, b) => b.edge.weight - a.edge.weight);
  }, [network, node.id]);

  return (
    <>
      <Header
        title={node.name}
        subtitle={
          <>
            <span className="dot" style={{ background: categoryColor(node.category) }} />
            {CATEGORY_FALLBACK_LABELS[node.category as keyof typeof CATEGORY_FALLBACK_LABELS] ?? node.category}
          </>
        }
      />
      <p className="hint">
        {node.mention_count} menciones en {node.sentence_count} oraciones de {node.metrics.document_count} documento(s).
      </p>

      <section className="section">
        <h3 className="section-title">Centralidad en la red filtrada</h3>
        <dl className="metric-list">
          {METRIC_ORDER.map((metric) => (
            <Fragment key={metric}>
              <dt title={METRICS[metric].description}>{METRICS[metric].label}</dt>
              <dd>{formatMetric(metric, node.metrics[metric])}</dd>
              <dd className="rank">
                #{node.ranks[metric]} de {total}
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <section className="section">
        <h3 className="section-title">Evolución ({METRICS[filters.metric].label})</h3>
        {compare.isLoading && <p className="hint">Calculando períodos…</p>}
        {compare.data && !trajectory && <p className="hint">Fuera del top 200 en ambos períodos.</p>}
        {trajectory && (
          <dl className="metric-list">
            {trajectory.points.map((point) => (
              <Fragment key={point.period}>
                <dt>{point.period}</dt>
                <dd>{point.value === null ? "—" : formatMetric(filters.metric, point.value)}</dd>
                <dd className="rank">{point.rank === null ? "no aparece" : `#${point.rank}`}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </section>

      <section className="section">
        <h3 className="section-title">Links en pantalla ({neighbors.length})</h3>
        <ul className="neighbor-list">
          {neighbors.slice(0, 30).map(({ edge, other }) => (
            <li key={other.id}>
              <button
                type="button"
                onClick={() => select({ kind: "edge", source: edge.source, target: edge.target })}
                title="Ver las oraciones que respaldan este link"
              >
                <span className="dot" style={{ background: categoryColor(other.category) }} />
                <span>{other.name}</span>
                <span className="hint">{edge.sentence_count} or.</span>
              </button>
            </li>
          ))}
        </ul>
        {neighbors.length === 0 && (
          <p className="hint">
            Sus links quedan fuera del top actual.{" "}
            <button type="button" className="link-button" onClick={() => update({ topN: Math.min(500, filters.topN + 100) })}>
              Mostrar más entidades
            </button>
          </p>
        )}
      </section>
    </>
  );
}

function highlight(text: string, terms: string[]) {
  const unique = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!unique.length) return text;
  const escaped = unique.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    unique.some((term) => term.toLowerCase() === part.toLowerCase()) ? <mark key={index}>{part}</mark> : part,
  );
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
    documentIds: filters.documentIds,
  };
  const evidence = useEvidence(params);

  return (
    <>
      <Header
        title={
          <>
            <EntityRef name={source.name} category={source.category} /> ↔{" "}
            <EntityRef name={target.name} category={target.category} />
          </>
        }
        subtitle="Link por coocurrencia"
      />
      {edge && (
        <p className="hint">
          Coocurren en {edge.sentence_count} oración(es) de {edge.document_count} documento(s) · peso{" "}
          {edge.weight.toFixed(2)} · {edge.confidence_tier}
        </p>
      )}
      <section className="section">
        <h3 className="section-title">Evidencia {evidence.data ? `(${evidence.data.total})` : ""}</h3>
        {evidence.isLoading && <p className="hint">Cargando oraciones…</p>}
        {evidence.error instanceof Error && <div className="notice error">{evidence.error.message}</div>}
        <ul className="evidence-list">
          {evidence.data?.items.map((item) => {
            const terms = item.entities
              .filter((entity) => entity.id === source.id || entity.id === target.id)
              .map((entity) => entity.mention_text ?? entity.name);
            return (
              <li key={`${item.document_id}-${item.sentence_id}`}>
                <span className="source">
                  {item.document_name} · {item.year ?? "sin año"}
                </span>
                {highlight(item.text, terms)}
              </li>
            );
          })}
        </ul>
        {evidence.data && evidence.data.total > evidence.data.items.length && (
          <p className="hint">Mostrando {evidence.data.items.length} de {evidence.data.total} oraciones.</p>
        )}
      </section>
    </>
  );
}
