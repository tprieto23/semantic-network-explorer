import { useMemo, useState } from "react";
import type { NetworkResponse } from "../api/client";
import { LayoutMemory } from "../graph/buildGraph";
import { METRICS } from "../domain/vocabulary";
import { useFilterStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { Legend } from "./Legend";
import { NetworkCanvas } from "./NetworkCanvas";

interface NetworkViewProps {
  network: NetworkResponse | undefined;
  isFetching: boolean;
  error: unknown;
  issues: string[];
}

export function NetworkView({ network, isFetching, error, issues }: NetworkViewProps) {
  const metric = useFilterStore((state) => state.filters.metric);
  const selection = useSelectionStore((state) => state.selection);
  const select = useSelectionStore((state) => state.select);
  // Las posiciones se reutilizan para que los cambios de filtro no reordenen todo el mapa.
  const [layoutMemory] = useState(() => new LayoutMemory());
  const graph = useMemo(
    () => (network && network.nodes.length > 0 ? layoutMemory.build(network, metric) : null),
    [layoutMemory, network, metric],
  );

  const presentCategories = useMemo(
    () => [...new Set((network?.nodes ?? []).map((node) => node.category))],
    [network],
  );

  return (
    <div className="canvas-wrap">
      {isFetching && <div className="loading-bar" role="progressbar" aria-label="Cargando red" />}
      {graph && <NetworkCanvas graph={graph} selection={selection} onSelect={select} />}

      {!graph && !isFetching && (
        <div className="empty">
          <div>
            <strong>No hay red para mostrar</strong>
            <p>{network?.warnings[0] ?? "Ajusta los filtros para ver entidades."}</p>
          </div>
        </div>
      )}

      <div className="overlay top-left">
        {issues.map((issue) => (
          <div className="notice error" key={issue}>
            {issue}
          </div>
        ))}
        {error instanceof Error && <div className="notice error">{error.message}</div>}
        {network?.warnings.map((warning) => (
          <div className="notice" key={warning}>
            {warning}
          </div>
        ))}
        {network && (
          <span className="hint">
            Tamaño = {METRICS[metric].label.toLowerCase()} · grosor del link = peso · pasa el cursor para ver
            vecinos, haz clic para ver detalles
            {network.metric_provenance.betweenness === "sampled" &&
              ` · intermediación estimada con ${network.metric_provenance.betweenness_sample_size} fuentes`}
          </span>
        )}
      </div>

      {presentCategories.length > 0 && (
        <div className="overlay bottom-left">
          <Legend categories={presentCategories} />
        </div>
      )}
    </div>
  );
}
