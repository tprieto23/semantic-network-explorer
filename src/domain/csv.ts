import type { ExplorerNode } from "../api/client";
import { METRIC_ORDER } from "./vocabulary";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV con una fila por entidad: valor y rango de cada métrica. */
export function toCsv(nodes: ExplorerNode[]): string {
  const header = [
    "entidad",
    "categoria",
    "menciones",
    ...METRIC_ORDER.flatMap((metric) => [metric, `rango_${metric}`]),
  ];
  const rows = nodes.map((node) => [
    node.name,
    node.category,
    node.mention_count,
    ...METRIC_ORDER.flatMap((metric) => [node.metrics[metric], node.ranks[metric]]),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
