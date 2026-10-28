import { useMemo, useState } from "react";
import type { CompareResponse, ExplorerMeta, NetworkResponse } from "../api/client";
import { gainers, headline, leadersByCategory, losers, mostConnected, strongestLinks, topRelations } from "../domain/insights";
import { categoryColor, formatInt, formatMetric, metricLabel, periodShort } from "../domain/vocabulary";
import { LayoutMemory } from "../graph/buildGraph";
import { useT } from "../i18n";
import type { Filters } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { ArrowIcon } from "./icons";
import { CategoryDot, Legend } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";
import { Loader } from "./Loader";

interface SummaryViewProps {
  network: NetworkResponse | undefined;
  compare: CompareResponse | undefined;
  meta: ExplorerMeta | undefined;
  filters: Filters;
  isFetching: boolean;
}

function yearRange(meta: ExplorerMeta | undefined) {
  const years = (meta?.documents ?? []).map((document) => document.year).filter((year): year is number => year !== null);
  if (!years.length) return null;
  const [min, max] = [Math.min(...years), Math.max(...years)];
  return min === max ? String(min) : `${min}–${max}`;
}

export function SummaryView({ network, compare, meta, filters, isFetching }: SummaryViewProps) {
  const { t, lang } = useT();
  const select = useSelectionStore((state) => state.select);
  const setTab = useSelectionStore((state) => state.setTab);
  const requestFocus = useSelectionStore((state) => state.requestFocus);
  const [layoutMemory] = useState(() => new LayoutMemory());
  // La red destacada solo dibuja los links más fuertes de cada entidad, para que se lea de un vistazo.
  const graph = useMemo(
    () => (network && network.nodes.length > 0 ? layoutMemory.build(strongestLinks(network), filters.metric) : null),
    [layoutMemory, network, filters.metric],
  );

  if (!network) {
    return (
      <div className="scroll-view">
        <div className="summary-head">
          <span className="eyebrow">{t("sum.eyebrow")}</span>
          <h2>{t("sum.computing")}</h2>
        </div>
        <div className="summary-grid">
          <div className="hero hero-loading">
            <Loader size={96} label={t("net.loadingNote")} />
          </div>
          <div className="essentials">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="essential ghost" style={{ minHeight: 86 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metric = filters.metric;
  const metricName = metricLabel(metric, lang);
  const head = headline(network, metric, compare, lang);
  const riser = compare ? gainers(compare, 1)[0] : undefined;
  const rule = mostConnected(network, "RUL");
  const relations = topRelations(network, 6);
  const maxRelation = Math.max(1, ...relations.map((item) => item.edge.sentence_count));
  const leaders = leadersByCategory(network, metric);
  const ups = compare ? gainers(compare, 5) : [];
  const downs = compare ? losers(compare, 3) : [];
  const range = yearRange(meta);

  function openNode(id: string) {
    select({ kind: "node", id });
    setTab("network");
    requestFocus(id);
  }

  function openRelation(source: string, target: string) {
    select({ kind: "edge", source, target });
    setTab("network");
  }

  const { central, bridge } = head;
  const presentCategories = [...new Set(network.nodes.map((node) => node.category))];

  return (
    <div className="scroll-view">
      <header className="summary-head">
        <span className="eyebrow">
          {t("sum.eyebrow")}
          {range ? ` · ${range}` : ""}
        </span>
        <h2>{head.text}</h2>
        <span className="muted num">
          {t("sum.stats", {
            d: formatInt(meta?.documents.length ?? 0, lang),
            e: formatInt(network.stages.cooccurrence.nodes, lang),
            m: formatInt(network.stages.mentions, lang),
            n: formatInt(network.stages.shown.nodes, lang),
            l: formatInt(network.stages.shown.edges, lang),
          })}
        </span>
      </header>

      <div className="summary-grid">
        <section className="hero" aria-label={t("sum.heroAria")}>
          {isFetching && (
            <div className="updating">
              <Loader size={22} inline label={t("net.updating")} />
            </div>
          )}
          <span className="hero-badge num">{t("sum.heroBadge", { n: network.stages.shown.nodes, metric: metricName })}</span>
          <button type="button" className="hero-cta" onClick={() => setTab("network")}>
            {t("sum.explore")}
          </button>
          <div className="stage-canvas">
            {graph && (
              <NetworkCanvas graph={graph} selection={null} onSelect={() => undefined} pinnedLabels={0} interactive={false} />
            )}
          </div>
          <footer className="stage-foot">
            <Legend categories={presentCategories} />
          </footer>
        </section>

        <section className="essentials" aria-label={t("sum.essentials")}>
          <h3>{t("sum.essentials")}</h3>
          {central && (
            <button type="button" className="essential" onClick={() => openNode(central.id)}>
              <CategoryDot category={central.category} size={10} />
              <div>
                <p>
                  <strong>{central.name}</strong>
                  {central.ranks.degree === 1 ? t("sum.centralDegree") : t("sum.centralMetric", { metric: metricName })}
                </p>
                <small className="num">
                  {t("sum.centralSub", {
                    rank: central.ranks[metric],
                    metric: metricName,
                    m: formatInt(central.mention_count, lang),
                    d: formatInt(central.metrics.document_count, lang),
                  })}
                </small>
              </div>
            </button>
          )}
          {bridge && (
            <button type="button" className="essential" onClick={() => openNode(bridge.id)}>
              <CategoryDot category={bridge.category} size={10} />
              <div>
                <p>
                  <strong>{bridge.name}</strong>
                  {bridge.id === central?.id ? t("sum.bridgeSame") : t("sum.bridge")}
                </p>
                <small className="num">
                  {t("sum.bridgeSub", {
                    v: formatMetric("betweenness", bridge.metrics.betweenness, lang),
                    n: formatInt(bridge.metrics.degree, lang),
                  })}
                </small>
              </div>
            </button>
          )}
          {riser ? (
            <button type="button" className="essential" onClick={() => openNode(riser.id)}>
              <CategoryDot category={riser.category} size={10} />
              <div>
                <p>
                  <strong>{riser.name}</strong>
                  {t("sum.riser")}
                </p>
                <small className="num">
                  {t("sum.riserSub", {
                    from: riser.fromRank,
                    to: riser.toRank,
                    p1: periodShort(riser.fromPeriod as Filters["period"], lang),
                    p2: periodShort(riser.toPeriod as Filters["period"], lang),
                  })}
                </small>
              </div>
            </button>
          ) : (
            <div className="essential">
              <span className="dot" style={{ background: "var(--line2)", width: 10, height: 10 }} />
              <div>
                <p>{compare ? t("sum.noChanges") : t("sum.comparing")}</p>
                <small>{t("sum.needsYears")}</small>
              </div>
            </div>
          )}
          {rule ? (
            <button type="button" className="essential" onClick={() => openNode(rule.id)}>
              <CategoryDot category={rule.category} size={10} />
              <div>
                <p>
                  <strong>{rule.name}</strong>
                  {t("sum.rule")}
                </p>
                <small className="num">
                  {t("sum.ruleSub", {
                    n: formatInt(rule.metrics.degree, lang),
                    d: formatInt(rule.metrics.document_count, lang),
                  })}
                </small>
              </div>
            </button>
          ) : (
            relations[0] && (
              <button
                type="button"
                className="essential"
                onClick={() => openRelation(relations[0].source.id, relations[0].target.id)}
              >
                <CategoryDot category={relations[0].source.category} size={10} />
                <div>
                  <p>
                    <strong>{relations[0].source.name}</strong>
                    {t("sum.and")}
                    <strong>{relations[0].target.name}</strong>
                    {t("sum.pair")}
                  </p>
                  <small className="num">
                    {t("sum.pairSub", {
                      n: formatInt(relations[0].edge.sentence_count, lang),
                      d: formatInt(relations[0].edge.document_count, lang),
                    })}
                  </small>
                </div>
              </button>
            )
          )}
        </section>
      </div>

      <div className="summary-row">
        <section className="card summary-card">
          <div className="section-head">
            <h3>{t("sum.leaders")}</h3>
            <button type="button" className="round-btn" aria-label={t("sum.seeTable")} onClick={() => setTab("table")}>
              <ArrowIcon />
            </button>
          </div>
          <ul className="list">
            {leaders.map(({ category, node, share }) => (
              <li key={category}>
                <button type="button" className="list-row" onClick={() => openNode(node.id)}>
                  <CategoryDot category={category} />
                  <span className="name">{node.name}</span>
                  <span
                    className="mini-bar"
                    style={{ width: Math.max(8, share * 28), background: categoryColor(category) }}
                  />
                  <span className="value">#{node.ranks[metric]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card summary-card">
          <div className="section-head">
            <h3>{t("sum.changes")}</h3>
            <button type="button" className="round-btn" aria-label={t("sum.seeEvolution")} onClick={() => setTab("evolution")}>
              <ArrowIcon />
            </button>
          </div>
          {!compare && <Loader size={22} inline label={t("sum.comparing")} />}
          {compare && ups.length === 0 && downs.length === 0 && <p className="help">{t("sum.noShifts")}</p>}
          {ups.length > 0 && (
            <>
              <span className="list-label up">{t("sum.gain")}</span>
              <ul className="list">
                {ups.map((shift) => (
                  <li key={shift.id}>
                    <button type="button" className="list-row" onClick={() => openNode(shift.id)}>
                      <CategoryDot category={shift.category} />
                      <span className="name">{shift.name}</span>
                      <span />
                      <span className="delta">▲{shift.delta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {downs.length > 0 && (
            <>
              <span className="list-label down">{t("sum.lose")}</span>
              <ul className="list">
                {downs.map((shift) => (
                  <li key={shift.id}>
                    <button type="button" className="list-row" onClick={() => openNode(shift.id)}>
                      <CategoryDot category={shift.category} />
                      <span className="name">{shift.name}</span>
                      <span />
                      <span className="delta down">▼{Math.abs(shift.delta)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card summary-card">
          <div className="section-head">
            <h3>{t("sum.relations")}</h3>
          </div>
          <ul className="list">
            {relations.map(({ edge, source, target }) => (
              <li key={`${edge.source}-${edge.target}`}>
                <button type="button" className="list-row relation-row" onClick={() => openRelation(source.id, target.id)}>
                  <span className="name">
                    <CategoryDot category={source.category} />
                    <span>{source.name}</span>
                    <span className="faint">↔</span>
                    <CategoryDot category={target.category} />
                    <span>{target.name}</span>
                  </span>
                  <span
                    className="mini-bar"
                    style={{ width: `${(edge.sentence_count / maxRelation) * 100}%`, background: "var(--acc)" }}
                  />
                  <span className="value">{formatInt(edge.sentence_count, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
