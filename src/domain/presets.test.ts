import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../state/filters";
import { PRESETS, isPresetActive, presetFilters } from "./presets";

describe("presets", () => {
  const bridges = PRESETS.find((preset) => preset.id === "bridges")!;

  it("starts from the defaults, keeps the sector and applies the patch", () => {
    const filters = presetFilters(bridges, { ...DEFAULT_FILTERS, sector: "all", language: "en" });
    expect(filters).toMatchObject({ sector: "all", language: "all", linkMode: "between", metric: "betweenness" });
  });

  it("is active only while the filters match it exactly", () => {
    const filters = presetFilters(bridges, DEFAULT_FILTERS);
    expect(isPresetActive(bridges, filters)).toBe(true);
    expect(isPresetActive(bridges, { ...filters, topN: 120 })).toBe(false);
    expect(PRESETS.filter((preset) => isPresetActive(preset, DEFAULT_FILTERS))).toEqual([]);
  });
});
