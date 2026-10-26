import { useMemo, useState } from "react";
import type { NetworkResponse, RankingMetric } from "../api/client";
import { CATEGORY_FALLBACK_LABELS, METRIC_ORDER, METRICS, formatMetric } from "../domain/vocabulary";
import { useSelectionStore } from "../state/selection";
import { EntityRef } from "./Legend";

/** Alternativa accesible al grafo: las mismas entidades, ordenables por cualquier métrica. */
export function EntityTable({ network, metric }: { network: NetworkResponse | undefined; metric: RankingMetric }) {
  const [sortBy, setSortBy] = useState<RankingMetric>(metric);
  const [query, setQuery] = useState("");
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (network?.nodes ?? [])
      .filter((node) => !term || node.name.toLowerCase().includes(term))
      .sort((a, b) => a.ranks[sortBy] - b.ranks[sortBy]);
  }, [network, query, sortBy]);

  return (
    <div className="table-view">
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Buscar entidad"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="hint">
          {rows.length} entidades en pantalla de {network?.stages.edge_weight.nodes ?? 0} que superan los filtros. El
          rango (#) se calcula sobre todas.
        </span>
      </div>
      <table className="entity-table">
        <thead>
          <tr>
            <th>Entidad</th>
            <th>Categoría</th>
            {METRIC_ORDER.map((item) => (
              <th key={item} className="num" aria-sort={sortBy === item ? "descending" : "none"}>
                <button type="button" onClick={() => setSortBy(item)} title={METRICS[item].description}>
                  {METRICS[item].short} {sortBy === item ? "▾" : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((node) => (
            <tr
              key={node.id}
              className={selection?.kind === "node" && selection.id === node.id ? "selected" : undefined}
              onClick={() => select({ kind: "node", id: node.id })}
              style={{ cursor: "pointer" }}
            >
              <td>
                <EntityRef name={node.name} category={node.category} />
              </td>
              <td className="hint">
                {CATEGORY_FALLBACK_LABELS[node.category as keyof typeof CATEGORY_FALLBACK_LABELS] ?? node.category}
              </td>
              {METRIC_ORDER.map((item) => (
                <td key={item} className="num">
                  {formatMetric(item, node.metrics[item])} <span className="rank">#{node.ranks[item]}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
