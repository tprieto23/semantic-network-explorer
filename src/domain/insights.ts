import type { CompareResponse, ExplorerEdge, ExplorerNode, NetworkResponse, RankingMetric } from "../api/client";
import type { Lang } from "../i18n";
import { translate } from "../i18n";
import { CATEGORY_ORDER } from "./vocabulary";

/** Entidad en pantalla con mejor posición en la métrica (el rango se calcula sobre toda la red filtrada). */
export function leader(network: NetworkResponse, metric: RankingMetric): ExplorerNode | null {
  let best: ExplorerNode | null = null;
  for (const node of network.nodes) {
    if (!best || node.ranks[metric] < best.ranks[metric]) best = node;
  }
  return best;
}

export interface CategoryLeader {
  category: string;
  node: ExplorerNode;
  /** Valor relativo al máximo de la métrica entre los líderes (0–1), para barras. */
  share: number;
}

export function leadersByCategory(network: NetworkResponse, metric: RankingMetric): CategoryLeader[] {
  const best = new Map<string, ExplorerNode>();
  for (const node of network.nodes) {
    const current = best.get(node.category);
    if (!current || node.ranks[metric] < current.ranks[metric]) best.set(node.category, node);
  }
  const max = Math.max(0, ...[...best.values()].map((node) => node.metrics[metric]));
  return [...best.entries()]
    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a as never) - CATEGORY_ORDER.indexOf(b as never))
    .map(([category, node]) => ({ category, node, share: max > 0 ? node.metrics[metric] / max : 0 }));
}

/** Entidad de una categoría con más vecinos distintos. */
export function mostConnected(network: NetworkResponse, category: string): ExplorerNode | null {
  let best: ExplorerNode | null = null;
  for (const node of network.nodes) {
    if (node.category !== category) continue;
    if (!best || node.metrics.degree > best.metrics.degree) best = node;
  }
  return best;
}

export interface RankShift {
  id: string;
  name: string;
  category: string;
  fromPeriod: string;
  toPeriod: string;
  fromRank: number;
  toRank: number;
  /** Positivo: subió (de #30 a #4 es +26). */
  delta: number;
}

/**
 * Cambios de posición en el tramo más reciente (penúltimo → último período), solo
 * para entidades presentes en ambos: «ganó peso» se refiere a lo que pasa ahora.
 */
export function rankShifts(compare: CompareResponse): RankShift[] {
  const shifts: RankShift[] = [];
  for (const trajectory of compare.trajectories) {
    const first = trajectory.points[trajectory.points.length - 2];
    const last = trajectory.points[trajectory.points.length - 1];
    if (!first || !last || first.rank === null || last.rank === null) continue;
    shifts.push({
      id: trajectory.id,
      name: trajectory.name,
      category: trajectory.category,
      fromPeriod: first.period,
      toPeriod: last.period,
      fromRank: first.rank,
      toRank: last.rank,
      delta: first.rank - last.rank,
    });
  }
  return shifts;
}

export function gainers(compare: CompareResponse, limit = 5): RankShift[] {
  return rankShifts(compare)
    .filter((shift) => shift.delta > 0)
    .sort((a, b) => b.delta - a.delta || a.toRank - b.toRank)
    .slice(0, limit);
}

export function losers(compare: CompareResponse, limit = 5): RankShift[] {
  return rankShifts(compare)
    .filter((shift) => shift.delta < 0)
    .sort((a, b) => a.delta - b.delta || a.toRank - b.toRank)
    .slice(0, limit);
}

export interface Relation {
  edge: ExplorerEdge;
  source: ExplorerNode;
  target: ExplorerNode;
}

/** Links con más oraciones compartidas. */
export function topRelations(network: NetworkResponse, limit = 6): Relation[] {
  const byId = new Map(network.nodes.map((node) => [node.id, node]));
  return [...network.edges]
    .sort((a, b) => b.sentence_count - a.sentence_count || b.weight - a.weight)
    .slice(0, limit)
    .flatMap((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      return source && target ? [{ edge, source, target }] : [];
    });
}

/** Métricas cuyo líder cambia entre el primer y el último período comparados. */
export function leaderChanges(compare: CompareResponse): number {
  const [first, last] = [compare.periods[0], compare.periods[compare.periods.length - 1]];
  if (!first || !last || first === last) return 0;
  const before = compare.central_by_period[first] ?? {};
  const after = compare.central_by_period[last] ?? {};
  return Object.keys(after).filter((metric) => {
    const a = before[metric as RankingMetric];
    const b = after[metric as RankingMetric];
    return Boolean(a && b && a.id !== b.id);
  }).length;
}

export interface Headline {
  central: ExplorerNode | null;
  bridge: ExplorerNode | null;
  centralRose: boolean;
  text: string;
}

/** Frase principal del resumen, construida solo con hechos de la red. */
export function headline(
  network: NetworkResponse,
  metric: RankingMetric,
  compare?: CompareResponse,
  lang: Lang = "es",
): Headline {
  const central = leader(network, metric);
  const bridge = leader(network, "betweenness");
  const centralShift = central && compare ? rankShifts(compare).find((shift) => shift.id === central.id) : undefined;
  const centralRose = Boolean(centralShift && centralShift.delta > 0);
  if (!central) return { central, bridge, centralRose, text: translate(lang, "headline.none") };

  let text = translate(lang, "headline.central", { name: central.name });
  if (centralRose) text += translate(lang, "headline.rose");
  if (bridge && bridge.id !== central.id) text += translate(lang, "headline.bridge", { name: bridge.name });
  else text += translate(lang, bridge ? "headline.bridgeSame" : "headline.end");
  return { central, bridge, centralRose, text };
}

/**
 * Conserva los `perNode` links más pesados de cada entidad. Es solo para dibujar
 * una versión legible: las métricas ya vienen calculadas sobre la red completa.
 */
export function strongestLinks(network: NetworkResponse, perNode = 3): NetworkResponse {
  const kept = new Set<ExplorerEdge>();
  const byNode = new Map<string, ExplorerEdge[]>();
  for (const edge of network.edges) {
    byNode.set(edge.source, [...(byNode.get(edge.source) ?? []), edge]);
    byNode.set(edge.target, [...(byNode.get(edge.target) ?? []), edge]);
  }
  for (const edges of byNode.values()) {
    [...edges].sort((a, b) => b.weight - a.weight).slice(0, perNode).forEach((edge) => kept.add(edge));
  }
  return { ...network, edges: network.edges.filter((edge) => kept.has(edge)) };
}
