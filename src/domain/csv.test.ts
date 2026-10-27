import { describe, expect, it } from "vitest";
import type { ExplorerNode } from "../api/client";
import { toCsv } from "./csv";

const NODE: ExplorerNode = {
  id: "1",
  name: 'Ley "Forestal", 29763',
  category: "RUL",
  mention_count: 12,
  sentence_count: 8,
  metrics: { degree: 3, strength: 1.5, betweenness: 0.25, closeness: 0.5, pagerank: 0.01, document_count: 4 },
  ranks: { degree: 2, strength: 3, betweenness: 1, closeness: 4, pagerank: 5, document_count: 6 },
  shown_degree: 2,
};

describe("toCsv", () => {
  it("writes one row per entity with value and rank of every metric", () => {
    const [header, row] = toCsv([NODE]).split("\n");
    expect(header).toBe(
      "entidad,categoria,menciones,pagerank,rango_pagerank,degree,rango_degree,strength,rango_strength," +
        "betweenness,rango_betweenness,closeness,rango_closeness,document_count,rango_document_count",
    );
    expect(row).toBe('"Ley ""Forestal"", 29763",RUL,12,0.01,5,3,2,1.5,3,0.25,1,0.5,4,4,6');
  });
});
