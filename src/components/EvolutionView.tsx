import { useMemo, useState } from "react";
import type { CompareResponse, ExplorerMeta, NetworkResponse, RankingMetric } from "../api/client";
import { useCompare, useNetwork } from "../api/queries";
import { leaderChanges, strongestLinks } from "../domain/insights";
import { METRIC_ORDER, categoryColor, formatInt, metricInfo, metricLabel } from "../domain/vocabulary";
import type { ExplorerGraph, Positions } from "../graph/buildGraph";
import { buildGraph, readPositions } from "../graph/buildGraph";
import { errorText, useT } from "../i18n";
import type { Filters } from "../state/filters";
import { COMPARED_PERIODS } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { useTheme } from "../state/theme";
import { CategoryDot } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";

const TOP_K = 15;

function periodLabel(period: string) {
  return period.replace("-", "–");
}

export default function EvolutionView({ filters, meta }: { filters: Filters; meta: ExplorerMeta | undefined }) {
  const { t, lang } = useT();
  const counts = COMPARED_PERIODS.map(
    (period) => meta?.periods.find((item) => item.id === period)?.document_count ?? 0,
  );
  // Comparar tiene sentido con al menos dos períodos con documentos.
  const ready = counts.filter((count) => count > 0).length >= 2;
  const compare = useCompare(filters, TOP_K, ready);
  // La red de todo el corpus fija las posiciones: todos los períodos se dibujan sobre el mismo mapa.
  const reference = useNetwork(filters, { period: "all", enabled: ready });
  const first = useNetwork(filters, { period: COMPARED_PERIODS[0], enabled: ready && counts[0] > 0 });
  const second = useNetwork(filters, { period: COMPARED_PERIODS[1], enabled: ready && counts[1] > 0 });
  const third = useNetwork(filters, { period: COMPARED_PERIODS[2], enabled: ready && counts[2] > 0 });
  const queries = [first, second, third];

  const referencePositions = useMemo<Positions>(() => {
    if (!reference.data || reference.data.nodes.length === 0) return new Map();
    const drawn = filters.edgeDisplay === "strongest" ? strongestLinks(reference.data) : reference.data;
    return readPositions(buildGraph(drawn, { metric: filters.metric }));
  }, [reference.data, filters.metric, filters.edgeDisplay]);

  if (meta && !ready) return <NoYearsState meta={meta} counts={counts} />;

  const data = compare.data;
  const changed = data ? leaderChanges(data) : 0;

  return (
    <div className="scroll-view">
      <section className="card evo-head">
        <div className="section-head">
          <h3>{t("evo.changed")}</h3>
          <span className="num">
            {COMPARED_PERIODS.map((period, index) => (
              <span key={period}>
                {index > 0 && " → "}
                {periodLabel(period)} ({t("common.docs", { n: counts[index] })})
              </span>
            ))}
            {data && (
              <>
                {" · "}
                <b>{t("evo.leadersChanged", { n: changed, t: METRIC_ORDER.length })}</b>
              </>
            )}
          </span>
        </div>
        {compare.error instanceof Error && <div className="notice error">{errorText(compare.error, t)}</div>}
        <div className="leader-grid">
          {data
            ? METRIC_ORDER.map((metric) => <LeaderCard key={metric} data={data} metric={metric} />)
            : METRIC_ORDER.map((metric) => <div key={metric} className="leader-card ghost" style={{ height: 62 }} />)}
        </div>
      </section>

      <div className="period-grid">
        {COMPARED_PERIODS.map((period, index) => {
          const query = queries[index];
          return (
            <section className="card period-card" key={period}>
              <header>
                <strong>{periodLabel(period)}</strong>
                <span className="muted num">
                  {query.data ? t("evo.entities", { n: formatInt(query.data.stages.edge_weight.nodes, lang) }) : ""}
                  {t("common.docs", { n: counts[index] })}
                </span>
              </header>
              <PeriodCanvas
                network={query.data}
                strongestOnly={filters.edgeDisplay === "strongest"}
                loading={query.isFetching && !query.data}
                positions={referencePositions}
                metric={filters.metric}
              />
            </section>
          );
        })}
      </div>

      <div className="evo-bottom">
        <section className="card slope-card">
          <div className="section-head">
            <h3>{t("evo.topK", { k: TOP_K, metric: metricLabel(filters.metric, lang) })}</h3>
            <span>{t("evo.thick")}</span>
          </div>
          {data ? <SlopeChart data={data} /> : <div className="ghost" style={{ height: 360 }} />}
        </section>
        {data && <Changes data={data} />}
      </div>
    </div>
  );
}

function LeaderCard({ data, metric }: { data: CompareResponse; metric: RankingMetric }) {
  const { t, lang } = useT();
  const select = useSelectionStore((state) => state.select);
  const leaders = data.periods.map((period) => data.central_by_period[period]?.[metric] ?? null);
  const latest = [...leaders].reverse().find((leader) => leader !== null) ?? null;
  // Líderes anteriores distintos, en orden, para mostrar la trayectoria («antes: A → B»).
  const earlier = leaders
    .slice(0, leaders.lastIndexOf(latest))
    .filter((leader): leader is NonNullable<typeof leader> => leader !== null)
    .filter((leader, index, list) => index === 0 || list[index - 1].id !== leader.id);
  const changed = earlier.some((leader) => leader.id !== latest?.id);
  const history = earlier.filter((leader, index) => leader.id !== latest?.id || index < earlier.length - 1);
  return (
    <button
      type="button"
      className={`leader-card${changed ? " changed" : ""}`}
      onClick={() => latest && select({ kind: "node", id: latest.id })}
      title={metricInfo(metric, lang).description}
    >
      <span className="label">{metricLabel(metric, lang)}</span>
      {latest ? (
        <span className="who">
          <CategoryDot category={latest.category} />
          {latest.name}
        </span>
      ) : (
        <span className="who faint">—</span>
      )}
      <span className="was">
        {changed
          ? t("evo.before", { name: history.map((leader) => leader.name).join(" → ") })
          : latest
            ? t("evo.same")
            : t("evo.noLeader")}
      </span>
    </button>
  );
}

function PeriodCanvas({
  network,
  strongestOnly,
  loading,
  positions,
  metric,
}: {
  network: NetworkResponse | undefined;
  strongestOnly: boolean;
  loading: boolean;
  positions: Positions;
  metric: RankingMetric;
}) {
  const { t } = useT();
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);
  const graph = useMemo<ExplorerGraph | null>(() => {
    if (!network || network.nodes.length === 0) return null;
    const drawn = strongestOnly ? strongestLinks(network) : network;
    return buildGraph(drawn, { metric, knownPositions: positions, runLayout: positions.size === 0 });
  }, [network, strongestOnly, positions, metric]);

  return (
    <div className="stage-canvas">
      {graph && <NetworkCanvas graph={graph} selection={selection} onSelect={select} pinnedLabels={6} />}
      {!graph && (
        <div className="state">
          {loading ? (
            <span className="spinner" />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {t("evo.noNetwork")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const MAX_LABEL = 22;

function shorten(name: string) {
  return name.length > MAX_LABEL ? `${name.slice(0, MAX_LABEL - 1)}…` : name;
}

/** Ranking del top K en cada período; cada línea une las posiciones de una entidad. */
function SlopeChart({ data }: { data: CompareResponse }) {
  const { t } = useT();
  const theme = useTheme();
  const select = useSelectionStore((state) => state.select);
  const width = 480;
  const left = 160;
  const right = width - 160;
  const top = 28;
  const row = 19;
  const outside = top + data.top_k * row + 14;
  const height = outside + 16;
  const columns = data.periods.length;
  const x = (index: number) => (columns <= 1 ? left : left + ((right - left) * index) / (columns - 1));
  const y = (rank: number | null) => (rank !== null && rank <= data.top_k ? top + (rank - 1) * row : outside);
  const last = columns - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("evo.slopeAria", { k: data.top_k })}>
      <g className="head">
        {data.periods.map((period, index) => (
          <text
            key={period}
            x={index === 0 ? x(index) - 8 : index === last ? x(index) + 8 : x(index)}
            y={12}
            textAnchor={index === 0 ? "end" : index === last ? "start" : "middle"}
          >
            {periodLabel(period)}
          </text>
        ))}
      </g>
      {data.periods.map((period, index) => (
        <line key={period} x1={x(index)} x2={x(index)} y1={top - 8} y2={outside} stroke="var(--line)" />
      ))}
      {data.trajectories.map((trajectory) => {
        const points = trajectory.points;
        const firstRank = points[0]?.rank ?? null;
        const lastRank = points[last]?.rank ?? null;
        const previousRank = points[last - 1]?.rank ?? null;
        const delta = previousRank !== null && lastRank !== null ? previousRank - lastRank : null;
        const strong = delta === null || Math.abs(delta) >= 5;
        const color = categoryColor(trajectory.category, theme);
        const path = points.map((point, index) => `${x(index)},${y(point.rank)}`).join(" ");
        const summary = points.map((point) => `#${point.rank ?? "—"}`).join(" → ");
        return (
          <g
            key={trajectory.id}
            className="series"
            onClick={() => select({ kind: "node", id: trajectory.id })}
            role="button"
            aria-label={`${trajectory.name}: ${summary}`}
          >
            <title>{`${trajectory.name}: ${summary}`}</title>
            <polyline
              points={path}
              fill="none"
              stroke={color}
              strokeWidth={strong ? 2.6 : 1.3}
              strokeLinejoin="round"
              opacity={0.9}
            />
            {points.map((point, index) => (
              <circle key={point.period} cx={x(index)} cy={y(point.rank)} r={3} fill={color} />
            ))}
            {firstRank !== null && firstRank <= data.top_k && (
              <text x={x(0) - 8} y={y(firstRank) + 4} textAnchor="end">
                #{firstRank} {shorten(trajectory.name)}
              </text>
            )}
            {lastRank !== null && lastRank <= data.top_k && (
              <text x={x(last) + 8} y={y(lastRank) + 4} className={strong ? "strong" : undefined}>
                #{lastRank} {shorten(trajectory.name)}
                {delta !== null && delta !== 0 ? ` ${delta > 0 ? "▲" : "▼"}${Math.abs(delta)}` : ""}
              </text>
            )}
          </g>
        );
      })}
      <text x={x(0) - 8} y={outside + 4} textAnchor="end" className="faint">
        {t("evo.outsideTop", { k: data.top_k })}
      </text>
    </svg>
  );
}

/** Quién entra, sale o se mueve del top en cada tramo; por defecto, el más reciente. */
function Changes({ data }: { data: CompareResponse }) {
  const { t } = useT();
  const select = useSelectionStore((state) => state.select);
  const [step, setStep] = useState(data.changes.length - 1);
  const change = data.changes[Math.min(step, data.changes.length - 1)];
  if (!change) return null;
  const fromIndex = data.periods.indexOf(change.from_period);
  const toIndex = data.periods.indexOf(change.to_period);
  const trajectories = new Map(data.trajectories.map((item) => [item.id, item]));
  const ranks = (id: string) => {
    const points = trajectories.get(id)?.points ?? [];
    return `#${points[fromIndex]?.rank ?? "—"} → #${points[toIndex]?.rank ?? "—"}`;
  };

  const groups = [
    { key: "enter", title: t("evo.enter", { k: data.top_k }), tone: "up", items: change.entered, detail: ranks },
    { key: "leave", title: t("evo.leave", { k: data.top_k }), tone: "down", items: change.left, detail: ranks },
    {
      key: "move",
      title: t("evo.move"),
      tone: "",
      items: change.moved,
      detail: (id: string) => {
        const item = change.moved.find((moved) => moved.id === id)!;
        return `${item.to_rank < item.from_rank ? "▲" : "▼"}${Math.abs(item.from_rank - item.to_rank)}`;
      },
    },
  ];

  return (
    <section className="card change-card">
      <div className="section-head">
        <h3>
          {t("evo.changesIn", { from: periodLabel(change.from_period), to: periodLabel(change.to_period) })}
        </h3>
      </div>
      {data.changes.length > 1 && (
        <div className="segmented" role="group" aria-label={t("evo.step")}>
          {data.changes.map((item, index) => (
            <button key={item.from_period} type="button" aria-pressed={index === step} onClick={() => setStep(index)}>
              {periodLabel(item.from_period).slice(0, 4)}→{periodLabel(item.to_period).slice(0, 4)}
            </button>
          ))}
        </div>
      )}
      {groups.map((group) => (
        <div className="change-group" key={group.key}>
          <div className="section-head">
            <h4 className={group.tone}>{group.title}</h4>
            <span>{group.items.length}</span>
          </div>
          <div className="chips">
            {group.items.map((item) => (
              <button type="button" key={item.id} className="chip-static" onClick={() => select({ kind: "node", id: item.id })}>
                <CategoryDot category={item.category} />
                {item.name}
                <span className="faint">{group.detail(item.id)}</span>
              </button>
            ))}
            {group.items.length === 0 && <span className="faint">{t("common.none")}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}

function NoYearsState({ meta, counts }: { meta: ExplorerMeta; counts: number[] }) {
  const { t } = useT();
  const withYear = meta.documents.length - meta.documents_without_year;
  const list = COMPARED_PERIODS.map((period, index) => `${periodLabel(period)}: ${counts[index]}`).join(" · ");
  return (
    <div className="state inline card">
      <div className="state-card">
        <span className="state-ring" />
        <strong>{t("evo.noYearsTitle")}</strong>
        <p>
          {t("evo.noYearsToday")} <strong className="num">{meta.documents_without_year}</strong>{" "}
          {t("evo.noYearsCount", { t: meta.documents.length })}
          {withYear > 0 && t("evo.noYearsPeriods", { list })}. {t("evo.noYearsHint")}
        </p>
        <ol className="steps">
          <li>{t("evo.step1")}</li>
          <li>{t("evo.step2")}</li>
          <li>{t("evo.step3")}</li>
        </ol>
      </div>
    </div>
  );
}
