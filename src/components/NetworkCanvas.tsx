import { SigmaContainer, useCamera, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { useEffect, useMemo, useState } from "react";
import { useT } from "../i18n";
import type { EdgeReducer, NodeReducer } from "sigma/types";
import { categoryColor } from "../domain/vocabulary";
import type { EdgeAttributes, ExplorerGraph, NodeAttributes } from "../graph/buildGraph";
import { edgeKey } from "../graph/buildGraph";
import type { Selection } from "../state/selection";
import { useSelectionStore } from "../state/selection";
import type { Theme } from "../state/theme";
import { useTheme } from "../state/theme";
import { HomeIcon } from "./icons";

interface CanvasProps {
  graph: ExplorerGraph;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** Cantidad de nodos más importantes cuya etiqueta se muestra siempre. */
  pinnedLabels?: number;
  /** Controles de zoom en la esquina superior derecha. */
  zoomControls?: boolean;
  /** Recibe la entidad bajo el cursor, para mostrar su tarjeta. */
  onHover?: (node: string | null) => void;
  /** Sin selección ni eventos: miniatura del resumen. */
  interactive?: boolean;
}

interface Palette {
  label: string;
  faded: string;
  edge: string;
  fadedEdge: string;
  strongEdge: string;
}

/** Vecinos del foco que muestran etiqueta; con más, una entidad muy conectada se vuelve ilegible. */
const LABELED_NEIGHBORS = 12;

const PALETTES: Record<Theme, Palette> = {
  oscuro: {
    label: "#eef0ea",
    faded: "#2f3633",
    edge: "rgba(110, 124, 117, 0.32)",
    fadedEdge: "rgba(58, 67, 63, 0.18)",
    strongEdge: "#9bbf8f",
  },
  claro: {
    label: "#1f2421",
    faded: "#e7e4dc",
    edge: "rgba(150, 142, 120, 0.28)",
    fadedEdge: "rgba(213, 209, 197, 0.25)",
    strongEdge: "#5b8769",
  },
};

function GraphController({
  graph,
  selection,
  onSelect,
  onHover,
  interactive = true,
  labeled,
}: Pick<CanvasProps, "graph" | "selection" | "onSelect" | "onHover" | "interactive"> & { labeled: Set<string> }) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const { gotoNode } = useCamera({ duration: 450 });
  const [hovered, setHovered] = useState<string | null>(null);
  const neighborsOnly = useSelectionStore((state) => state.neighborsOnly);
  const focus = useSelectionStore((state) => state.focus);

  useEffect(() => {
    if (!interactive) return;
    registerEvents({
      enterNode: ({ node }) => {
        setHovered(node);
        onHover?.(node);
      },
      leaveNode: () => {
        setHovered(null);
        onHover?.(null);
      },
      clickNode: ({ node }) => onSelect({ kind: "node", id: node }),
      clickEdge: ({ edge }) => {
        const [source, target] = graph.extremities(edge);
        onSelect({ kind: "edge", source, target });
      },
      clickStage: () => onSelect(null),
    });
  }, [registerEvents, onSelect, onHover, graph, interactive]);

  useEffect(() => {
    if (focus && graph.hasNode(focus.id)) gotoNode(focus.id, { duration: 450 });
    // Solo reacciona a peticiones nuevas, no a cambios de grafo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Resalta el foco (hover o selección) y su vecindario; atenúa el resto.
  useEffect(() => {
    const nodes = graph.nodes();
    const edges = graph.edges();
    sigma.setNodesState(nodes, { isHighlighted: false });
    sigma.setEdgesState(edges, { isHighlighted: false });

    const selectedNode = selection?.kind === "node" ? selection.id : null;
    const focusNode = neighborsOnly && selectedNode ? selectedNode : (hovered ?? selectedNode);
    labeled.clear();
    if (focusNode && graph.hasNode(focusNode)) {
      const strongest = graph
        .edges(focusNode)
        .sort((a, b) => graph.getEdgeAttribute(b, "weight") - graph.getEdgeAttribute(a, "weight"))
        .slice(0, LABELED_NEIGHBORS)
        .map((edge) => graph.opposite(focusNode, edge));
      [focusNode, ...strongest].forEach((node) => labeled.add(node));
      sigma.setNodesState([focusNode, ...graph.neighbors(focusNode)], { isHighlighted: true });
      sigma.setEdgesState(graph.edges(focusNode), { isHighlighted: true });
    } else if (selection?.kind === "edge") {
      const key = edgeKey(selection.source, selection.target);
      if (graph.hasEdge(key)) {
        labeled.add(selection.source).add(selection.target);
        sigma.setNodesState([selection.source, selection.target], { isHighlighted: true });
        sigma.setEdgesState([key], { isHighlighted: true });
      }
    }
  }, [sigma, graph, hovered, selection, neighborsOnly, labeled]);

  return null;
}

function ZoomControls() {
  const { t } = useT();
  const { zoomIn, zoomOut, reset } = useCamera({ duration: 300, factor: 1.5 });
  return (
    <div className="zoom" role="group" aria-label={t("net.zoom")}>
      <button type="button" aria-label={t("net.zoomIn")} onClick={() => zoomIn()}>
        +
      </button>
      <button type="button" aria-label={t("net.zoomOut")} onClick={() => zoomOut()}>
        −
      </button>
      <button type="button" aria-label={t("net.fit")} onClick={() => reset()}>
        <HomeIcon />
      </button>
    </div>
  );
}

export function NetworkCanvas({
  graph,
  selection,
  onSelect,
  pinnedLabels = 12,
  zoomControls = false,
  onHover,
  interactive = true,
}: CanvasProps) {
  const theme = useTheme();
  // Compartido entre el controlador (lo llena) y el reducer (lo lee) sin recrear Sigma.
  const [labeled] = useState(() => new Set<string>());

  // Opciones estables: SigmaContainer recrea la instancia solo si cambian (tema o etiquetas fijas).
  const options = useMemo(() => {
    const palette = PALETTES[theme];
    return {
      settings: {
        enableEdgeEvents: interactive,
        renderEdgeLabels: false,
        labelDensity: 0.5,
        labelGridCellSize: 120,
        labelRenderedSizeThreshold: 12,
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
          return { ...data, color: palette.faded, label: null, zIndex: 0 };
        }
        const focused = labeled.has(_key);
        return {
          ...data,
          color: categoryColor(attributes.category, theme),
          labelColor: palette.label,
          zIndex: focused ? 3 : state.isHighlighted ? 2 : 1,
          labelVisibility: focused || (pinned && !graphState.hasHighlighted) ? "visible" : "auto",
        };
      }) satisfies NodeReducer<NodeAttributes, EdgeAttributes>,
      edgeReducer: ((_key, data, _attributes, state, graphState) => {
        if (state.isHighlighted) return { ...data, color: palette.strongEdge, zIndex: 2 };
        if (graphState.hasHighlighted) return { ...data, color: palette.fadedEdge, zIndex: 0 };
        return { ...data, color: palette.edge };
      }) satisfies EdgeReducer<NodeAttributes, EdgeAttributes>,
    };
  }, [pinnedLabels, theme, interactive, labeled]);

  return (
    <SigmaContainer graph={graph} options={options} style={{ background: "transparent" }}>
      <GraphController
        graph={graph}
        selection={selection}
        onSelect={onSelect}
        onHover={onHover}
        interactive={interactive}
        labeled={labeled}
      />
      {zoomControls && <ZoomControls />}
    </SigmaContainer>
  );
}
