import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/esm/core";
import { useMemo, useState } from "react";
import type { CompareResponse, NetworkResponse, RankingMetric } from "../api/client";
import { useCompare, useNetwork } from "../api/queries";
import { METRIC_ORDER, METRICS, categoryColor, formatMetric } from "../domain/vocabulary";
import type { ExplorerGraph, Positions } from "../graph/buildGraph";
import { buildGraph, readPositions } from "../graph/buildGraph";
import type { Filters } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { EntityRef } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";
import { usePrefersDark } from "./usePrefersDark";

echarts.use([LineChart, GridComponent, TooltipComponent, LabelLayout, CanvasRenderer]);

const PERIODS = ["2021-2023", "2024-2026"] as const;
const TOP_K_OPTIONS = [10, 15, 25];

export default function EvolutionView({ filters }: { filters: Filters }) {
  const [topK, setTopK] = useState(15);
  const compare = useCompare(filters, topK);
  // La red de todo el corpus fija las posiciones: ambos períodos se dibujan sobre el mismo mapa.
  const reference = useNetwork(filters, { period: "all" });
  const early = useNetwork(filters, { period: PERIODS[0] });
  const late = useNetwork(filters, { period: PERIODS[1] });

  const referencePositions = useMemo<Positions>(() => {
    if (!reference.data || reference.data.nodes.length === 0) return new Map();
    return readPositions(buildGraph(reference.data, { metric: filters.metric }));
  }, [reference.data, filters.metric]);

  return (
    <div className="evolution">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
          <div>
            <h3>¿Cambió el nodo central?</h3>
            <span className="hint">
              Entidad líder en cada métrica, calculada con los mismos filtros en cada período. En negrita, las que
              cambiaron.
            </span>
          </div>
        </div>
        {compare.error instanceof Error && <div className="notice error">{compare.error.message}</div>}
        {compare.data && <LeadersTable data={compare.data} />}
      </div>

      <div className="period-grid">
        {PERIODS.map((period, index) => {
          const query = index === 0 ? early : late;
          const summary = compare.data?.period_summaries.find((item) => item.period === period);
          return (
            <div className="card" key={period}>
              <h3>{period}</h3>
              <span className="hint">
                {summary
                  ? `${summary.document_count} documentos · ${query.data?.stages.shown.nodes ?? 0} entidades en pantalla`
                  : "Cargando…"}
              </span>
              <PeriodCanvas network={query.data} positions={referencePositions} metric={filters.metric} />
              {query.data?.warnings.map((warning) => (
                <div className="notice" key={warning} style={{ marginTop: 8 }}>
                  {warning}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
          <div>
            <h3>Ranking por {METRICS[filters.metric].label.toLowerCase()}</h3>
            <span className="hint">
              Posición de las entidades del top {topK} de cada período. Una línea que sube ganó centralidad.
            </span>
          </div>
          <label className="hint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Top
            <select value={topK} onChange={(event) => setTopK(Number(event.target.value))} style={{ width: "auto" }}>
              {TOP_K_OPTIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {compare.data && <SlopeChart data={compare.data} />}
      </div>

      {compare.data && <ChangesCard data={compare.data} />}
    </div>
  );
}

function PeriodCanvas({
  network,
  positions,
  metric,
}: {
  network: NetworkResponse | undefined;
  positions: Positions;
  metric: RankingMetric;
}) {
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);
  const graph = useMemo<ExplorerGraph | null>(() => {
    if (!network || network.nodes.length === 0) return null;
    return buildGraph(network, { metric, knownPositions: positions, runLayout: positions.size === 0 });
  }, [network, positions, metric]);

  return (
    <div className="period-canvas canvas-wrap" style={{ marginTop: 10 }}>
      {graph ? (
        <NetworkCanvas graph={graph} selection={selection} onSelect={select} pinnedLabels={6} />
      ) : (
        <div className="empty">Sin red en este período con los filtros actuales.</div>
      )}
    </div>
  );
}

function LeadersTable({ data }: { data: CompareResponse }) {
  return (
    <table className="leaders" style={{ marginTop: 10 }}>
      <thead>
        <tr>
          <th>Métrica</th>
          {data.periods.map((period) => (
            <th key={period}>{period}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {METRIC_ORDER.map((metric) => {
          const leaders = data.periods.map((period) => data.central_by_period[period]?.[metric] ?? null);
          const changed = new Set(leaders.map((leader) => leader?.id ?? "")).size > 1;
          return (
            <tr key={metric} className={changed ? "changed" : undefined}>
              <td title={METRICS[metric].description}>{METRICS[metric].label}</td>
              {leaders.map((leader, index) => (
                <td key={data.periods[index]}>
                  {leader ? (
                    <>
                      <EntityRef name={leader.name} category={leader.category} />
                      <span className="hint"> {formatMetric(metric, leader.value)}</span>
                    </>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const MAX_LABEL_LENGTH = 30;

function shorten(name: string): string {
  return name.length > MAX_LABEL_LENGTH ? `${name.slice(0, MAX_LABEL_LENGTH - 1)}…` : name;
}

function SlopeChart({ data }: { data: CompareResponse }) {
  const prefersDark = usePrefersDark();
  const select = useSelectionStore((state) => state.select);
  const maxRank = Math.max(
    data.top_k,
    ...data.trajectories.flatMap((item) => item.points.map((point) => point.rank ?? 0)),
  );
  const textColor = prefersDark ? "#e7eaee" : "#1b1f24";
  const mutedColor = prefersDark ? "#9aa4b2" : "#5b6573";

  const option = {
    animationDuration: 400,
    grid: { left: 230, right: 230, top: 16, bottom: 28 },
    tooltip: {
      trigger: "item",
      formatter: (params: { seriesName: string; data: [string, number | null] }) =>
        `${params.seriesName}<br/>${params.data[0]}: #${params.data[1] ?? "—"}`,
    },
    xAxis: {
      type: "category",
      data: data.periods,
      boundaryGap: false,
      axisLabel: { color: textColor, fontWeight: 600 },
      axisLine: { lineStyle: { color: mutedColor } },
    },
    yAxis: {
      type: "value",
      inverse: true,
      min: 1,
      max: maxRank,
      // El rango va junto al nombre; el eje solo aporta la guía horizontal.
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: prefersDark ? "#2c333d" : "#eceff3" } },
    },
    series: data.trajectories.map((trajectory) => {
      const color = categoryColor(trajectory.category);
      return {
        id: trajectory.id,
        name: trajectory.name,
        type: "line",
        connectNulls: false,
        symbolSize: 8,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        emphasis: { focus: "series", lineStyle: { width: 4 } },
        label: {
          show: true,
          color: textColor,
          fontSize: 11,
          formatter: (params: { dataIndex: number }) => {
            const rank = trajectory.points[params.dataIndex]?.rank;
            if (rank === null || rank === undefined) return "";
            const name = shorten(trajectory.name);
            return params.dataIndex === 0 ? `${name}  #${rank}` : `#${rank}  ${name}`;
          },
        },
        labelLayout: (params: { dataIndex: number }) => ({
          align: params.dataIndex === 0 ? "right" : "left",
          dx: params.dataIndex === 0 ? -8 : 8,
          hideOverlap: true,
        }),
        data: trajectory.points.map((point) => [point.period, point.rank]),
      };
    }),
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      style={{ height: Math.max(320, data.trajectories.length * 22), marginTop: 10 }}
      onEvents={{ click: (params: { seriesId: string }) => select({ kind: "node", id: params.seriesId }) }}
    />
  );
}

function ChangesCard({ data }: { data: CompareResponse }) {
  const change = data.changes[0];
  if (!change) return null;
  return (
    <div className="card">
      <h3>
        Cambios en el top {data.top_k}: {change.from_period} → {change.to_period}
      </h3>
      <div className="change-columns">
        <div>
          <strong>Entran ({change.entered.length})</strong>
          <ul>
            {change.entered.map((item) => (
              <li key={item.id}>
                <EntityRef name={item.name} category={item.category} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Salen ({change.left.length})</strong>
          <ul>
            {change.left.map((item) => (
              <li key={item.id}>
                <EntityRef name={item.name} category={item.category} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Cambian de posición ({change.moved.length})</strong>
          <ul>
            {change.moved.map((item) => (
              <li key={item.id}>
                <EntityRef name={item.name} category={item.category} />{" "}
                <span className="hint">
                  #{item.from_rank} → #{item.to_rank} {item.to_rank < item.from_rank ? "▲" : "▼"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
