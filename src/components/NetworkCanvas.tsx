import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { useEffect, useMemo, useState } from "react";
import type { EdgeReducer, NodeReducer } from "sigma/types";
import type { EdgeAttributes, ExplorerGraph, NodeAttributes } from "../graph/buildGraph";
import { edgeKey } from "../graph/buildGraph";
import type { Selection } from "../state/selection";
import { usePrefersDark } from "./usePrefersDark";

interface CanvasProps {
  graph: ExplorerGraph;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** Cantidad de nodos más importantes cuya etiqueta se muestra siempre. */
  pinnedLabels?: number;
}

interface Theme {
  label: string;
  faded: string;
  fadedEdge: string;
  strongEdge: string;
}

const LIGHT: Theme = {
  label: "#1b1f24",
  faded: "#d9dde3",
  fadedEdge: "rgba(160, 166, 176, 0.08)",
  strongEdge: "rgba(60, 64, 80, 0.75)",
};

const DARK: Theme = {
  label: "#e7eaee",
  faded: "#2c333d",
  fadedEdge: "rgba(120, 128, 140, 0.06)",
  strongEdge: "rgba(220, 226, 236, 0.75)",
};

function GraphController({ graph, selection, onSelect }: CanvasProps) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    registerEvents({
      enterNode: ({ node }) => setHovered(node),
      leaveNode: () => setHovered(null),
      clickNode: ({ node }) => onSelect({ kind: "node", id: node }),
      clickEdge: ({ edge }) => {
        const [source, target] = graph.extremities(edge);
        onSelect({ kind: "edge", source, target });
      },
      clickStage: () => onSelect(null),
    });
  }, [registerEvents, onSelect, graph]);

  // Resalta el foco (hover o selección) y su vecindario; atenúa el resto.
  useEffect(() => {
    const nodes = graph.nodes();
    const edges = graph.edges();
    sigma.setNodesState(nodes, { isHighlighted: false });
    sigma.setEdgesState(edges, { isHighlighted: false });

    const focusNode = hovered ?? (selection?.kind === "node" ? selection.id : null);
    if (focusNode && graph.hasNode(focusNode)) {
      sigma.setNodesState([focusNode, ...graph.neighbors(focusNode)], { isHighlighted: true });
      sigma.setEdgesState(graph.edges(focusNode), { isHighlighted: true });
    } else if (selection?.kind === "edge") {
      const key = edgeKey(selection.source, selection.target);
      if (graph.hasEdge(key)) {
        sigma.setNodesState([selection.source, selection.target], { isHighlighted: true });
        sigma.setEdgesState([key], { isHighlighted: true });
      }
    }
  }, [sigma, graph, hovered, selection]);

  return null;
}

export function NetworkCanvas({ graph, selection, onSelect, pinnedLabels = 12 }: CanvasProps) {
  const prefersDark = usePrefersDark();

  // Opciones estables: SigmaContainer recrea la instancia solo si cambian (tema o etiquetas fijas).
  const options = useMemo(() => {
    const theme: Theme = prefersDark ? DARK : LIGHT;
    return {
      settings: {
        enableEdgeEvents: true,
        renderEdgeLabels: false,
        labelDensity: 0.5,
        labelGridCellSize: 120,
        labelRenderedSizeThreshold: 11,
        minCameraRatio: 0.05,
        maxCameraRatio: 4,
        // Tamaños en píxeles de pantalla (Sigma 4 usa por defecto unidades del grafo).
        itemSizesReference: "screen" as const,
        // Sin rotación: comparar períodos exige la misma orientación.
        enableCameraRotation: false,
        enableCameraMouseRotation: false,
      },
      nodeReducer: ((_key, data, attributes, state, graphState) => {
        const pinned = attributes.rank <= pinnedLabels;
        if (graphState.hasHighlighted && !state.isHighlighted) {
          return { ...data, color: theme.faded, label: null, zIndex: 0 };
        }
        return {
          ...data,
          labelColor: theme.label,
          zIndex: state.isHighlighted ? 2 : 1,
          labelVisibility: state.isHighlighted || pinned ? "visible" : data.labelVisibility,
        };
      }) satisfies NodeReducer<NodeAttributes, EdgeAttributes>,
      edgeReducer: ((_key, data, _attributes, state, graphState) => {
        if (state.isHighlighted) return { ...data, color: theme.strongEdge, zIndex: 2 };
        if (graphState.hasHighlighted) return { ...data, color: theme.fadedEdge, zIndex: 0 };
        return data;
      }) satisfies EdgeReducer<NodeAttributes, EdgeAttributes>,
    };
  }, [pinnedLabels, prefersDark]);

  return (
    <SigmaContainer graph={graph} options={options}>
      <GraphController graph={graph} selection={selection} onSelect={onSelect} />
    </SigmaContainer>
  );
}
