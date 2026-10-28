import { describe, expect, it } from "vitest";
import type { ExplorerEdge, ExplorerNode, NetworkResponse } from "../api/client";
import { detectCommunities } from "./communities";

function node(id: string, rank: number): ExplorerNode {
  return {
    id,
    name: id,
    category: "CHAR",
    mention_count: 1,
    sentence_count: 1,
    metrics: { degree: 1, strength: 1, betweenness: 0, closeness: 0, pagerank: 1, document_count: 1 },
    ranks: { pagerank: rank, degree: rank, strength: rank, betweenness: rank, closeness: rank, document_count: rank },
    shown_degree: 1,
  };
}

function edge(source: string, target: string, weight = 1): ExplorerEdge {
  return { source, target, weight, sentence_count: 1, document_count: 1, category_pair: "CHAR--CHAR", confidence_tier: "exploratory" };
}

// Dos triángulos densos unidos por un único link débil, y una entidad suelta.
const NETWORK = {
  nodes: ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "solo"].map((id, index) => node(id, index + 1)),
  edges: [
    edge("a1", "a2", 5),
    edge("a2", "a3", 5),
    edge("a1", "a3", 5),
    edge("a3", "a4", 5),
    edge("a4", "a1", 5),
    edge("b1", "b2", 5),
    edge("b2", "b3", 5),
    edge("b1", "b3", 5),
    edge("a3", "b1", 0.1),
  ],
} as NetworkResponse;

describe("detectCommunities", () => {
  it("separates densely connected groups, biggest first, named by their top entity", () => {
    const { byNode, list } = detectCommunities(NETWORK, "pagerank");
    expect(byNode.get("a1")).toBe(byNode.get("a4"));
    expect(byNode.get("b1")).toBe(byNode.get("b3"));
    expect(byNode.get("a1")).not.toBe(byNode.get("b1"));
    expect(list[0]).toMatchObject({ index: 0, size: 4 });
    expect(list[0].leader.id).toBe("a1");
    expect(list[1].leader.id).toBe("b1");
  });

  it("is deterministic and greys out single-entity groups", () => {
    const first = detectCommunities(NETWORK, "pagerank");
    const second = detectCommunities(NETWORK, "pagerank");
    expect(first.list.map((c) => c.size)).toEqual(second.list.map((c) => c.size));
    expect(first.byNode.get("solo")?.color).toBe("#8E948F");
    expect(first.byNode.get("a1")?.color).not.toBe(first.byNode.get("b1")?.color);
  });
});
