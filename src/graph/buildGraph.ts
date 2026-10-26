import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { ExplorerEdge, ExplorerNode, NetworkResponse, RankingMetric } from "../api/client";
import { categoryColor } from "../domain/vocabulary";

export interface Point {
  x: number;
  y: number;
}

export type Positions = Map<string, Point>;

export interface NodeAttributes {
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  category: string;
  metricValue: number;
  rank: number;
}

export interface EdgeAttributes {
  size: number;
  color: string;
  weight: number;
  sentenceCount: number;
  documentCount: number;
  categoryPair: string;
}

export type ExplorerGraph = Graph<NodeAttributes, EdgeAttributes>;

const MIN_NODE_SIZE = 4;
const MAX_NODE_SIZE = 22;
const MIN_EDGE_SIZE = 0.5;
const MAX_EDGE_SIZE = 5;

export function edgeKey(source: string, target: string): string {
  return source < target ? `${source}|${target}` : `${target}|${source}`;
}

/** Escala raíz cuadrada: el área del nodo, no su radio, es proporcional a la métrica. */
export function scaleNodeSize(value: number, min: number, max: number): number {
  if (max <= min) return (MIN_NODE_SIZE + MAX_NODE_SIZE) / 2;
  const ratio = Math.sqrt(Math.max(0, (value - min) / (max - min)));
  return MIN_NODE_SIZE + ratio * (MAX_NODE_SIZE - MIN_NODE_SIZE);
}

export function scaleEdgeSize(value: number, min: number, max: number): number {
  if (max <= min) return 1.5;
  return MIN_EDGE_SIZE + ((value - min) / (max - min)) * (MAX_EDGE_SIZE - MIN_EDGE_SIZE);
}

function extent(values: number[]): [number, number] {
  if (!values.length) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Posiciones iniciales: reutiliza las conocidas, ubica los nodos nuevos en el
 * promedio de sus vecinos conocidos y, si no tienen, sobre un círculo.
 */
export function seedPositions(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  known: Positions,
): { positions: Positions; reused: number } {
  const positions: Positions = new Map();
  let reused = 0;
  for (const node of nodes) {
    const point = known.get(node.id);
    if (point) {
      positions.set(node.id, { ...point });
      reused += 1;
    }
  }

  const neighbors = new Map<string, string[]>();
  for (const edge of edges) {
    neighbors.set(edge.source, [...(neighbors.get(edge.source) ?? []), edge.target]);
    neighbors.set(edge.target, [...(neighbors.get(edge.target) ?? []), edge.source]);
  }

  const missing = nodes.filter((node) => !positions.has(node.id));
  missing.forEach((node, index) => {
    const anchors = (neighbors.get(node.id) ?? [])
      .map((id) => positions.get(id))
      .filter((point): point is Point => point !== undefined);
    // Desplazamiento determinista para no apilar nodos en el mismo punto.
    const angle = (2 * Math.PI * index) / Math.max(missing.length, 1);
    if (anchors.length) {
      const x = anchors.reduce((sum, point) => sum + point.x, 0) / anchors.length;
      const y = anchors.reduce((sum, point) => sum + point.y, 0) / anchors.length;
      positions.set(node.id, { x: x + Math.cos(angle) * 0.5, y: y + Math.sin(angle) * 0.5 });
    } else {
      const radius = 10 + Math.sqrt(nodes.length) * 2;
      positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
  });
  return { positions, reused };
}

export interface BuildOptions {
  metric: RankingMetric;
  /** Posiciones previas para conservar el mapa mental entre filtros o períodos. */
  knownPositions?: Positions;
  /** false: usa las posiciones sembradas tal cual (vista de evolución). */
  runLayout?: boolean;
}

export function buildGraph(network: NetworkResponse, options: BuildOptions): ExplorerGraph {
  const { metric, knownPositions = new Map(), runLayout = true } = options;
  const graph: ExplorerGraph = new Graph({ type: "undirected", multi: false });

  const [minValue, maxValue] = extent(network.nodes.map((node) => node.metrics[metric]));
  const [minWeight, maxWeight] = extent(network.edges.map((edge) => edge.weight));
  const { positions, reused } = seedPositions(network.nodes, network.edges, knownPositions);

  for (const node of network.nodes) {
    const point = positions.get(node.id)!;
    graph.addNode(node.id, {
      x: point.x,
      y: point.y,
      size: scaleNodeSize(node.metrics[metric], minValue, maxValue),
      color: categoryColor(node.category),
      label: node.name,
      category: node.category,
      metricValue: node.metrics[metric],
      rank: node.ranks[metric],
    });
  }
  for (const edge of network.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    graph.addEdgeWithKey(edgeKey(edge.source, edge.target), edge.source, edge.target, {
      size: scaleEdgeSize(edge.weight, minWeight, maxWeight),
      color: "rgba(128, 128, 148, 0.32)",
      weight: edge.weight,
      sentenceCount: edge.sentence_count,
      documentCount: edge.document_count,
      categoryPair: edge.category_pair,
    });
  }

  if (runLayout && graph.order > 1) {
    const mostlyKnown = reused >= graph.order * 0.6;
    forceAtlas2.assign(graph, {
      // Con posiciones previas basta un ajuste suave; sin ellas, un layout completo.
      iterations: mostlyKnown ? 60 : Math.min(400, 150 + graph.order),
      getEdgeWeight: "weight",
      settings: {
        ...forceAtlas2.inferSettings(graph),
        barnesHutOptimize: graph.order > 250,
        gravity: 1,
        scalingRatio: 20,
        slowDown: mostlyKnown ? 8 : 1,
        edgeWeightInfluence: 1,
      },
    });
  }
  return graph;
}

export function readPositions(graph: ExplorerGraph): Positions {
  const positions: Positions = new Map();
  graph.forEachNode((node, attributes) => positions.set(node, { x: attributes.x, y: attributes.y }));
  return positions;
}

/**
 * Recuerda las posiciones de todas las redes construidas para que un cambio de
 * filtro o de métrica ajuste el layout en lugar de recalcularlo desde cero.
 */
export class LayoutMemory {
  private positions: Positions = new Map();

  build(network: NetworkResponse, metric: RankingMetric): ExplorerGraph {
    const graph = buildGraph(network, { metric, knownPositions: this.positions });
    this.positions = new Map([...this.positions, ...readPositions(graph)]);
    return graph;
  }
}
