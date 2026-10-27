import { describe, expect, it } from "vitest";
import type { CompareResponse, ExplorerEdge, ExplorerNode, NetworkResponse } from "../api/client";
import {
  gainers,
  headline,
  leader,
  leaderChanges,
  leadersByCategory,
  losers,
  mostConnected,
  strongestLinks,
  topRelations,
} from "./insights";

function node(id: string, category: string, rank: number, extra: Partial<ExplorerNode["metrics"]> = {}): ExplorerNode {
  return {
    id,
    name: id,
    category,
    mention_count: 10,
    sentence_count: 5,
    metrics: { degree: 10 - rank, strength: 1, betweenness: 0, closeness: 0, pagerank: 1 / rank, document_count: 2, ...extra },
    ranks: { pagerank: rank, degree: rank, strength: rank, betweenness: 10 - rank, closeness: rank, document_count: rank },
    shown_degree: 1,
  };
}

function edge(source: string, target: string, sentences: number): ExplorerEdge {
  return {
    source,
    target,
    weight: sentences / 2,
    sentence_count: sentences,
    document_count: 1,
    category_pair: "CHAR--PRAC",
    confidence_tier: "exploratory",
  };
}

const NETWORK = {
  nodes: [node("castaña", "eco_INFRA", 1), node("serfor", "CHAR", 2), node("poda", "PRAC", 3), node("ley", "RUL", 4)],
  edges: [edge("castaña", "serfor", 3), edge("castaña", "poda", 9), edge("ley", "poda", 1)],
} as NetworkResponse;

function compare(points: Record<string, [number | null, number | null]>): CompareResponse {
  return {
    periods: ["2021-2023", "2024-2026"],
    trajectories: Object.entries(points).map(([id, [a, b]]) => ({
      id,
      name: id,
      category: "CHAR",
      points: [
        { period: "2021-2023", rank: a, value: null, in_top: true },
        { period: "2024-2026", rank: b, value: null, in_top: true },
      ],
    })),
    central_by_period: {
      "2021-2023": { pagerank: { id: "a", name: "a", category: "CHAR", value: 1 }, degree: { id: "a", name: "a", category: "CHAR", value: 1 } },
      "2024-2026": { pagerank: { id: "b", name: "b", category: "CHAR", value: 1 }, degree: { id: "a", name: "a", category: "CHAR", value: 1 } },
    },
  } as unknown as CompareResponse;
}

describe("insights", () => {
  it("finds the leader by the lowest rank", () => {
    expect(leader(NETWORK, "pagerank")?.id).toBe("castaña");
    expect(leader(NETWORK, "betweenness")?.id).toBe("ley");
  });

  it("returns one leader per category in display order with relative shares", () => {
    const leaders = leadersByCategory(NETWORK, "pagerank");
    expect(leaders.map((item) => item.category)).toEqual(["CHAR", "PRAC", "RUL", "eco_INFRA"]);
    expect(leaders.find((item) => item.category === "eco_INFRA")?.share).toBe(1);
  });

  it("finds the most connected entity of a category", () => {
    expect(mostConnected(NETWORK, "RUL")?.id).toBe("ley");
    expect(mostConnected(NETWORK, "LOC")).toBeNull();
  });

  it("orders relations by shared sentences", () => {
    expect(topRelations(NETWORK, 2).map((item) => item.edge.sentence_count)).toEqual([9, 3]);
  });

  it("separates gainers and losers and skips entities missing in a period", () => {
    const data = compare({ copoazu: [64, 25], aguaje: [10, 8], poda: [3, 9], nueva: [null, 2] });
    expect(gainers(data).map((item) => [item.id, item.delta])).toEqual([
      ["copoazu", 39],
      ["aguaje", 2],
    ]);
    expect(losers(data).map((item) => [item.id, item.delta])).toEqual([["poda", -6]]);
  });

  it("counts metrics whose leader changed", () => {
    expect(leaderChanges(compare({}))).toBe(1);
  });

  it("builds a headline from the central and bridge entities", () => {
    const rising = compare({ castaña: [30, 4] });
    expect(headline(NETWORK, "pagerank", rising).text).toBe(
      "castaña articula la red y ganó peso en el último período; ley conecta grupos que no se tocan.",
    );
    expect(headline(NETWORK, "pagerank").text).toBe("castaña articula la red; ley conecta grupos que no se tocan.");
    expect(headline(NETWORK, "pagerank", rising, "en").text).toBe(
      "castaña structures the network and gained weight in the latest period; ley connects groups that otherwise don't touch.",
    );
  });

  it("keeps only the strongest links of each entity for drawing", () => {
    const edges = [edge("castaña", "serfor", 3), edge("castaña", "poda", 9), edge("castaña", "ley", 1), edge("ley", "poda", 2)];
    const pruned = strongestLinks({ ...NETWORK, edges }, 1);
    // castaña conserva su link más fuerte (poda); ley conserva el suyo (poda); serfor, el único que tiene.
    expect(pruned.edges.map((item) => `${item.source}-${item.target}`).sort()).toEqual([
      "castaña-poda",
      "castaña-serfor",
      "ley-poda",
    ]);
    expect(pruned.nodes).toBe(NETWORK.nodes);
  });

  it("measures rises on the most recent step when there are three periods", () => {
    const data = {
      periods: ["2000-2020", "2021-2023", "2024-2026"],
      trajectories: [
        {
          id: "castaña",
          name: "castaña",
          category: "eco_INFRA",
          points: [
            { period: "2000-2020", rank: 90, value: null, in_top: false },
            { period: "2021-2023", rank: 10, value: null, in_top: true },
            { period: "2024-2026", rank: 4, value: null, in_top: true },
          ],
        },
      ],
      central_by_period: {},
    } as unknown as CompareResponse;
    expect(gainers(data)[0]).toMatchObject({ fromPeriod: "2021-2023", toPeriod: "2024-2026", delta: 6 });
  });
});
