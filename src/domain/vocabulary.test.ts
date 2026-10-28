import { describe, expect, it } from "vitest";
import { categoryLabel, formatInt, formatMetric, metricLabel, periodShort } from "./vocabulary";

describe("vocabulary", () => {
  it("formats numbers with the separators of each language", () => {
    expect(formatInt(36873, "es")).toBe("36.873");
    expect(formatInt(36873, "en")).toBe("36,873");
    expect(formatInt(999, "es")).toBe("999");
    expect(formatMetric("betweenness", 0.38, "es")).toBe("0,380");
    expect(formatMetric("betweenness", 0.38, "en")).toBe("0.380");
    expect(formatMetric("strength", 1102.4, "en")).toBe("1,102");
  });

  it("translates labels and short periods", () => {
    expect(categoryLabel("LOC", "es")).toBe("Lugares");
    expect(categoryLabel("eco_INFRA", "en", true)).toBe("Ecological infra.");
    expect(categoryLabel("UNKNOWN", "en")).toBe("UNKNOWN");
    expect(metricLabel("betweenness", "en")).toBe("Bridge between groups");
    expect(periodShort("2021-2023", "es")).toBe("2021–23");
    expect(periodShort("2000-2020", "en")).toBe("2000–20");
    expect(periodShort("all", "en")).toBe("All");
  });
});
