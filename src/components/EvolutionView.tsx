import { useEffect, useMemo, useRef, useState } from "react";
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
import { CategoryDot } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";
import { InfoTip } from "./InfoTip";
import { Loader } from "./Loader";
import { periodDocumentCount } from "../domain/scope";

const TOP_K = 15;

function periodLabel(period: string) {
  return period.replace("-", "–");
}

export default function EvolutionView({ filters, meta }: { filters: Filters; meta: ExplorerMeta | undefined }) {
  const { t, lang } = useT();
  const counts = COMPARED_PERIODS.map((period) => periodDocumentCount(meta, filters, period) ?? 0);
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
          <div className="slope-head">
            <h3>{t("evo.slopeTitle", { k: TOP_K, metric: metricLabel(filters.metric, lang) })}</h3>
            <InfoTip label={t("evo.slopeInfo")}>
              <span className="info-text">{t("evo.slopeHelp", { k: TOP_K })}</span>
              <span className="slope-legend">
                <span>
                  <svg width="22" height="8" aria-hidden="true">
                    <line x1="1" y1="4" x2="21" y2="4" strokeWidth="3" />
                  </svg>
                  {t("evo.legendStrong")}
                </span>
                <span>
                  <svg width="22" height="8" aria-hidden="true">
                    <line x1="1" y1="4" x2="21" y2="4" strokeWidth="1.4" />
                  </svg>
                  {t("evo.legendSoft")}
                </span>
                <span>
                  <svg width="22" height="8" aria-hidden="true">
                    <line x1="1" y1="4" x2="21" y2="4" strokeWidth="1.6" strokeDasharray="3 3" />
                  </svg>
                  {t("evo.legendInOut", { k: TOP_K })}
                </span>
              </span>
            </InfoTip>
          </div>
          {data ? (
            <SlopeChart data={data} />
          ) : (
            <div style={{ display: "grid", placeItems: "center", height: 360 }}>
              <Loader size={64} label={t("sum.comparing")} />
            </div>
          )}
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
      data-tip={metricInfo(metric, lang).description}
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
            <Loader size={56} />
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

/** Ancho disponible del contenedor, para dibujar el SVG a escala 1:1 (el texto no se agranda). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Ranking del top K en cada período; cada línea une los puestos de una entidad. Cuando
 * una entidad entra o sale del top, solo se dibuja un trazo corto punteado hacia abajo:
 * unir todo con una fila «fuera del top» formaba un abanico que tapaba el gráfico.
 */
function SlopeChart({ data }: { data: CompareResponse }) {
  const { t } = useT();
  const select = useSelectionStore((state) => state.select);
  const [ref, measured] = useWidth<HTMLDivElement>();
  const width = Math.min(Math.max(measured, 320), 720);
  const labelWidth = Math.min(Math.max(width * 0.3, 110), 190);
  const left = labelWidth;
  const right = width - labelWidth;
  const top = 26;
  const row = 20;
  const height = top + (data.top_k - 1) * row + 18;
  const columns = data.periods.length;
  const gap = columns <= 1 ? 0 : (right - left) / (columns - 1);
  const x = (index: number) => left + gap * index;
  const y = (rank: number) => top + (rank - 1) * row;
  const inTop = (rank: number | null): rank is number => rank !== null && rank <= data.top_k;
  const last = columns - 1;
  const stub = Math.min(gap * 0.3, 46);

  return (
    <div ref={ref} className="slope-frame">
      {measured > 0 && (
        <svg width={width} height={height} role="img" aria-label={t("evo.slopeAria", { k: data.top_k })}>
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
            <line key={period} x1={x(index)} x2={x(index)} y1={top - 8} y2={height - 6} stroke="var(--line)" />
          ))}
          {data.trajectories.map((trajectory) => {
            const ranks = trajectory.points.map((point) => point.rank);
            const firstRank = ranks[0] ?? null;
            const lastRank = ranks[last] ?? null;
            const previousRank = ranks[last - 1] ?? null;
            const entered = inTop(lastRank) && !inTop(previousRank);
            const delta = previousRank !== null && lastRank !== null ? previousRank - lastRank : null;
            const strong = delta === null || Math.abs(delta) >= 5;
            const color = categoryColor(trajectory.category);
            const summary = ranks.map((rank) => `#${rank ?? "—"}`).join(" → ");
            const lineWidth = strong ? 2.6 : 1.3;
            return (
              <g
                key={trajectory.id}
                className="series"
                onClick={() => select({ kind: "node", id: trajectory.id })}
                role="button"
                aria-label={`${trajectory.name}: ${summary}`}
              >
                <title>{`${trajectory.name}: ${summary}`}</title>
                {ranks.slice(0, -1).map((rank, index) => {
                  const next = ranks[index + 1];
                  if (inTop(rank) && inTop(next)) {
                    return (
                      <line
                        key={index}
                        x1={x(index)}
                        y1={y(rank)}
                        x2={x(index + 1)}
                        y2={y(next)}
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                      />
                    );
                  }
                  // Sale del top: trazo corto hacia abajo desde su último puesto.
                  if (inTop(rank)) {
                    return (
                      <line
                        key={index}
                        className="stub"
                        x1={x(index)}
                        y1={y(rank)}
                        x2={x(index) + stub}
                        y2={y(rank) + stub * 0.5}
                        stroke={color}
                      />
                    );
                  }
                  // Entra al top: trazo corto que sube hasta su nuevo puesto.
                  if (inTop(next)) {
                    return (
                      <line
                        key={index}
                        className="stub"
                        x1={x(index + 1) - stub}
                        y1={y(next) + stub * 0.5}
                        x2={x(index + 1)}
                        y2={y(next)}
                        stroke={color}
                      />
                    );
                  }
                  return null;
                })}
                {ranks.map((rank, index) =>
                  inTop(rank) ? <circle key={index} cx={x(index)} cy={y(rank)} r={3.2} fill={color} /> : null,
                )}
                {inTop(firstRank) && (
                  <text x={x(0) - 9} y={y(firstRank) + 4} textAnchor="end">
                    <tspan className="rank">{firstRank}</tspan> {shorten(trajectory.name)}
                  </text>
                )}
                {inTop(lastRank) && (
                  <text x={x(last) + 9} y={y(lastRank) + 4} className={strong ? "strong" : undefined}>
                    <tspan className="rank">{lastRank}</tspan> {shorten(trajectory.name)}
                    {entered ? (
                      <tspan className="delta up"> {t("evo.new")}</tspan>
                    ) : delta ? (
                      <tspan className={`delta ${delta > 0 ? "up" : "down"}`}>
                        {" "}
                        {delta > 0 ? "▲" : "▼"}
                        {Math.abs(delta)}
                      </tspan>
                    ) : null}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
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
