import { SigmaContainer, useCamera, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import type { EdgeReducer, NodeReducer } from "sigma/types";
import { categoryColor } from "../domain/vocabulary";
import type { EdgeAttributes, ExplorerGraph, NodeAttributes } from "../graph/buildGraph";
import { edgeKey } from "../graph/buildGraph";
import type { Selection } from "../state/selection";
import { useSelectionStore } from "../state/selection";
import type { Theme } from "../state/theme";
import { useTheme } from "../state/theme";
import { DownloadIcon, HomeIcon, LinkIcon } from "./icons";
import { useCopyLink } from "./useCopyLink";

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
  /** Color de cada nodo; por defecto, el de su categoría. */
  colorOf?: (id: string, category: string) => string;
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

const defaultColor = (_id: string, category: string) => categoryColor(category);

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
  focus: focused,
  colorOf,
}: Pick<CanvasProps, "graph" | "selection" | "onSelect" | "onHover" | "interactive"> & {
  colorOf: (id: string, category: string) => string;
  labeled: Set<string>;
  focus: { id: string | null };
}) {
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
    focused.id = selectedNode;
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
  }, [sigma, graph, hovered, selection, neighborsOnly, labeled, focused]);

  const selectedNode = selection?.kind === "node" ? selection.id : null;
  const chips = [...new Set([selectedNode, hovered])].filter((id): id is string => !!id && graph.hasNode(id));
  return <FocusChips graph={graph} ids={chips} colorOf={colorOf} />;
}

/** Margen entre el borde de la píldora y el nodo. */
const CHIP_PADDING = 4;

/**
 * Píldora de vidrio para la entidad en foco (cursor o selección). WebGL no puede
 * desenfocar lo que hay detrás, así que es HTML sobre el lienzo: repite el nodo y su
 * etiqueta y sigue a la cámara en cada cuadro. No recibe el mouse: los clics llegan a Sigma.
 */
function FocusChips({
  graph,
  ids,
  colorOf,
}: {
  graph: ExplorerGraph;
  ids: string[];
  colorOf: (id: string, category: string) => string;
}) {
  const sigma = useSigma();
  const chips = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const place = () => {
      for (const [id, chip] of chips.current) {
        const data = sigma.getNodeDisplayData(id);
        if (!data) {
          chip.style.visibility = "hidden";
          continue;
        }
        const { x, y } = sigma.framedGraphToViewport(data);
        const radius = sigma.scaleSize(data.size);
        chip.style.visibility = "visible";
        chip.style.setProperty("--dot", `${radius * 2}px`);
        chip.style.transform = `translate(${x - radius - CHIP_PADDING - 1}px, ${y}px) translateY(-50%)`;
      }
    };
    place();
    sigma.on("afterRender", place);
    return () => {
      sigma.off("afterRender", place);
    };
  }, [sigma, ids]);

  return ids.map((id) => {
    const node = graph.getNodeAttributes(id);
    return (
      <div
        key={id}
        className="node-chip glass"
        aria-hidden="true"
        ref={(element) => {
          if (element) chips.current.set(id, element);
          else chips.current.delete(id);
        }}
      >
        <span className="node-chip-dot" style={{ background: colorOf(id, node.category) }} />
        <span className="node-chip-label">{node.label}</span>
      </div>
    );
  });
}

/** Carga una imagen (el logo) para dibujarla en un lienzo. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Descarga la red como PNG, con el logo y el nombre del proyecto como marca de agua.
 * Las capas de Sigma son varios lienzos (WebGL y 2D): se combinan justo después de
 * dibujar, cuando el lienzo WebGL todavía tiene su contenido.
 */
async function exportPng(sigma: ReturnType<typeof useSigma>, filename: string, watermark: string) {
  const logo = await loadImage("/favicon.svg");
  const container = sigma.getContainer();
  const { width, height } = container.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const styles = getComputedStyle(document.documentElement);
  sigma.once("afterRender", () => {
    const output = document.createElement("canvas");
    output.width = Math.round(width * ratio);
    output.height = Math.round(height * ratio);
    const context = output.getContext("2d");
    if (!context) return;
    context.fillStyle = styles.getPropertyValue("--graph").trim() || "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    container.querySelectorAll("canvas").forEach((layer) => {
      context.drawImage(layer, 0, 0, output.width, output.height);
    });

    // Marca de agua abajo a la derecha: logo y nombre, semitransparentes.
    context.save();
    context.scale(ratio, ratio);
    context.globalAlpha = 0.55;
    const size = 34;
    const margin = 18;
    context.font = `600 16px "DM Sans", system-ui, sans-serif`;
    const textWidth = context.measureText(watermark).width;
    const x = width - margin - textWidth;
    const y = height - margin;
    if (logo) context.drawImage(logo, x - size - 8, y - size + 9, size, size);
    context.fillStyle = styles.getPropertyValue("--tx2").trim() || "#5b615d";
    context.textBaseline = "alphabetic";
    context.fillText(watermark, x, y);
    context.restore();

    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  });
  sigma.refresh();
}

function ZoomControls() {
  const { t } = useT();
  const sigma = useSigma();
  const copyLink = useCopyLink();
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
      <button type="button" aria-label={t("top.copyLink")} data-tip={t("top.copyLink")} onClick={() => void copyLink()}>
        <LinkIcon />
      </button>
      <button
        type="button"
        aria-label={t("net.download")}
        data-tip={t("net.download")}
        onClick={() => void exportPng(sigma, `${t("net.filename")}.png`, t("net.watermark"))}
      >
        <DownloadIcon />
      </button>
    </div>
  );
}

export function NetworkCanvas({
  graph,
  selection,
  onSelect,
  // Pocas etiquetas fijas: el resto las coloca Sigma sin que se pisen.
  pinnedLabels = 8,
  colorOf = defaultColor,
  zoomControls = false,
  onHover,
  interactive = true,
}: CanvasProps) {
  const theme = useTheme();
  // Compartido entre el controlador (lo llena) y el reducer (lo lee) sin recrear Sigma.
  const [labeled] = useState(() => new Set<string>());
  const [focus] = useState<{ id: string | null }>(() => ({ id: null }));

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
        const labeledNode = labeled.has(_key);
        // La entidad bajo el cursor o seleccionada la dibuja FocusChips (píldora de vidrio):
        // aquí solo se le quita la etiqueta y la caja blanca que Sigma pone por defecto.
        const emphasized = state.isHovered || focus.id === _key;
        return {
          ...data,
          color: colorOf(_key, attributes.category),
          labelColor: palette.label,
          zIndex: emphasized ? 4 : labeledNode ? 3 : state.isHighlighted ? 2 : 1,
          labelVisibility: emphasized
            ? "hidden"
            : labeledNode || (pinned && !graphState.hasHighlighted)
              ? "visible"
              : "auto",
          // La capa superior evita que los vecinos tapen la tarjeta y la etiqueta.
          depth: emphasized ? "topNodes" : "nodes",
          labelDepth: emphasized ? "topNodes" : "nodes",
          backdropVisibility: "hidden",
        };
      }) satisfies NodeReducer<NodeAttributes, EdgeAttributes>,
      edgeReducer: ((_key, data, _attributes, state, graphState) => {
        if (state.isHighlighted) return { ...data, color: palette.strongEdge, zIndex: 2 };
        if (graphState.hasHighlighted) return { ...data, color: palette.fadedEdge, zIndex: 0 };
        return { ...data, color: palette.edge };
      }) satisfies EdgeReducer<NodeAttributes, EdgeAttributes>,
    };
  }, [pinnedLabels, theme, interactive, labeled, focus, colorOf]);

  return (
    <SigmaContainer graph={graph} options={options} style={{ background: "transparent" }}>
      <GraphController
        graph={graph}
        selection={selection}
        onSelect={onSelect}
        onHover={onHover}
        interactive={interactive}
        labeled={labeled}
        focus={focus}
        colorOf={colorOf}
      />
      {zoomControls && <ZoomControls />}
    </SigmaContainer>
  );
}
