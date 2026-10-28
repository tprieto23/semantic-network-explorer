import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { ExplorerNode, NetworkResponse, RankingMetric } from "../api/client";
import { categoryPalette } from "./vocabulary";

export interface Community {
  /** 0 es la comunidad más grande. */
  index: number;
  size: number;
  /** Entidad más importante del grupo, para nombrarlo («grupo de MADRE DE DIOS»). */
  leader: ExplorerNode;
  color: string;
}

export interface Communities {
  byNode: Map<string, Community>;
  list: Community[];
}

/** Más allá de los diez colores de la paleta, los grupos pequeños van en gris. */
const OTHER_COLOR = "#8E948F";

/** Generador determinista: la misma red da siempre los mismos grupos y colores. */
function seededRandom(seed = 7) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Grupos de entidades muy conectadas entre sí (Louvain sobre los links con su peso).
 * Responde a «¿qué temas van juntos?»; se calcula sobre la red en pantalla.
 */
export function detectCommunities(network: NetworkResponse, metric: RankingMetric): Communities {
  const graph = new Graph({ type: "undirected" });
  network.nodes.forEach((node) => graph.addNode(node.id));
  network.edges.forEach((edge) => {
    if (edge.source !== edge.target && !graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, { weight: edge.weight });
    }
  });
  const mapping = graph.size > 0 ? louvain(graph, { getEdgeWeight: "weight", rng: seededRandom() }) : {};

  const members = new Map<number, ExplorerNode[]>();
  network.nodes.forEach((node, position) => {
    // Las entidades sin links quedan cada una en su propio grupo.
    const key = mapping[node.id] ?? -1 - position;
    members.set(key, [...(members.get(key) ?? []), node]);
  });

  const palette = categoryPalette();
  const groups = [...members.values()].sort((a, b) => b.length - a.length);
  const byNode = new Map<string, Community>();
  const list = groups.map((nodes, index) => {
    const community: Community = {
      index,
      size: nodes.length,
      leader: nodes.reduce((best, node) => (node.ranks[metric] < best.ranks[metric] ? node : best)),
      color: nodes.length > 1 && index < palette.length ? palette[index] : OTHER_COLOR,
    };
    nodes.forEach((node) => byNode.set(node.id, community));
    return community;
  });
  return { byNode, list };
}
