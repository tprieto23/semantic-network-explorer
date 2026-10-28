import { useMemo, useState } from "react";
import type { NetworkResponse, RankingMetric } from "../api/client";
import { toCsv } from "../domain/csv";
import { METRIC_ORDER, categoryLabel, formatInt, formatMetric, metricInfo, metricLabel } from "../domain/vocabulary";
import { useT } from "../i18n";
import { useSelectionStore } from "../state/selection";
import { CategoryDot } from "./Legend";
import { Loader } from "./Loader";

function download(filename: string, content: string) {
  // El BOM permite que Excel reconozca la codificación UTF-8 (tildes y eñes).
  const url = URL.createObjectURL(new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Alternativa accesible al grafo: las mismas entidades, ordenables por cualquier métrica. */
export function EntityTable({ network, metric }: { network: NetworkResponse | undefined; metric: RankingMetric }) {
  const { t, lang } = useT();
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
    <section className="card table-card" aria-label={t("table.aria")}>
      <div className="table-tools">
        <input
          className="input"
          type="search"
          placeholder={t("table.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="count">
          <strong className="num">{formatInt(rows.length, lang)}</strong>{" "}
          {t("table.count", { t: formatInt(network?.stages.edge_weight.nodes ?? 0, lang) })}{" "}
          <strong>{metricLabel(sortBy, lang)}</strong>
        </span>
        <button
          type="button"
          className="btn"
          disabled={!rows.length}
          onClick={() => download(`${t("table.filename")}-${sortBy}.csv`, toCsv(rows))}
        >
          {t("table.export")}
        </button>
      </div>
      {!network && (
        <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
          <Loader size={72} label={t("common.loading")} />
        </div>
      )}
      <div className="table-scroll">
        <table className="entity-table">
          <thead>
            <tr>
              <th>{t("table.entity")}</th>
              <th>{t("table.category")}</th>
              <th className="num">{t("table.mentions")}</th>
              {METRIC_ORDER.map((item) => (
                <th key={item} className="num" aria-sort={sortBy === item ? "descending" : "none"}>
                  <button type="button" onClick={() => setSortBy(item)} title={metricInfo(item, lang).description}>
                    {metricLabel(item, lang)}
                    {sortBy === item ? " ↓" : ""}
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
              >
                <td className="name">{node.name}</td>
                <td>
                  <span className="cat">
                    <CategoryDot category={node.category} />
                    {categoryLabel(node.category, lang)}
                  </span>
                </td>
                <td className="num">{formatInt(node.mention_count, lang)}</td>
                {METRIC_ORDER.map((item) => (
                  <td key={item} className={`num${sortBy === item ? " sorted" : ""}`}>
                    {formatMetric(item, node.metrics[item], lang)}
                    <span className="rank">#{node.ranks[item]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
