import { describe, expect, it } from "vitest";
import { hashForTab, selectionFromHash, tabFromHash } from "./selection";

describe("view hash", () => {
  it("round-trips every view and falls back to the summary", () => {
    for (const tab of ["summary", "network", "evolution", "table"] as const) {
      expect(tabFromHash(hashForTab(tab))).toBe(tab);
    }
    expect(hashForTab("network")).toBe("#red");
    expect(tabFromHash("#desconocida")).toBe("summary");
    expect(tabFromHash("")).toBe("summary");
  });

  it("keeps the selected entity or link except in the summary", () => {
    const node = hashForTab("network", { kind: "node", id: "a b/c" });
    expect(node).toBe("#red/a%20b%2Fc");
    expect(tabFromHash(node)).toBe("network");
    expect(selectionFromHash(node)).toEqual({ kind: "node", id: "a b/c" });

    const edge = hashForTab("table", { kind: "edge", source: "x~1", target: "y" });
    expect(selectionFromHash(edge)).toEqual({ kind: "edge", source: "x~1", target: "y" });

    expect(hashForTab("summary", { kind: "node", id: "x" })).toBe("");
    expect(selectionFromHash("#resumen/x")).toBeNull();
    expect(selectionFromHash("#red")).toBeNull();
  });
});
