import type { ExplorerStages } from "../api/client";
import { formatInt, formatWeight } from "../domain/vocabulary";
import { useT } from "../i18n";

interface StageFunnelProps {
  stages: ExplorerStages;
  minDocuments: number;
  minWeight: number;
}

/** Muestra cuánto quita cada filtro, para que la reducción de ruido sea transparente. */
export function StageFunnel({ stages, minDocuments, minWeight }: StageFunnelProps) {
  const { t, lang } = useT();
  const rows = [
    { label: t("funnel.categories"), count: stages.cooccurrence },
    { label: t("funnel.recurrence", { n: minDocuments }), count: stages.document_recurrence },
    {
      label: minWeight > 0 ? t("funnel.weight", { w: formatWeight(minWeight, lang) }) : t("funnel.withLink"),
      count: stages.edge_weight,
    },
    { label: t("funnel.shown"), count: stages.shown },
  ];
  const total = Math.max(stages.cooccurrence.nodes, 1);
  return (
    <div className="funnel">
      <h3 className="group-title">{t("funnel.title")}</h3>
      {rows.map(({ label, count }) => (
        <div className="funnel-row" key={label}>
          <div className="field-row">
            <span>{label}</span>
            <span className="num" style={{ color: "var(--tx)" }}>
              {formatInt(count.nodes, lang)}
            </span>
          </div>
          <div className="bar" aria-hidden>
            <span style={{ width: `${Math.max(1.5, (count.nodes / total) * 100)}%` }} />
          </div>
        </div>
      ))}
      <p className="help">
        {t("funnel.footer", { m: formatInt(stages.mentions, lang), e: formatInt(stages.shown.edges, lang) })}
      </p>
    </div>
  );
}
