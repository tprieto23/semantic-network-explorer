import type { ExplorerStages } from "../api/client";

const STAGES: { key: keyof Pick<ExplorerStages, "cooccurrence" | "document_recurrence" | "edge_weight" | "shown">; label: string }[] = [
  { key: "cooccurrence", label: "Coocurrencia por oración" },
  { key: "document_recurrence", label: "Tras recurrencia documental" },
  { key: "edge_weight", label: "Tras peso mínimo" },
  { key: "shown", label: "En pantalla (top por centralidad)" },
];

/** Muestra cuánto quita cada filtro, para que la reducción de ruido sea transparente. */
export function StageFunnel({ stages }: { stages: ExplorerStages }) {
  const total = Math.max(stages.cooccurrence.nodes, 1);
  return (
    <div className="funnel">
      {STAGES.map(({ key, label }) => {
        const count = stages[key];
        return (
          <div className="funnel-row" key={key}>
            <span>{label}</span>
            <span className="hint">
              {count.nodes} entidades · {count.edges} links
            </span>
            <div className="funnel-bar" aria-hidden>
              <span style={{ width: `${(count.nodes / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
      <span className="hint">{stages.mentions} menciones en el alcance</span>
    </div>
  );
}
