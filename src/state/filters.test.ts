import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  filterIssues,
  filtersFromSearch,
  filtersToSearch,
  toCompareRequest,
  toNetworkRequest,
  type Filters,
} from "./filters";

describe("URL serialization", () => {
  it("omits defaults so the base URL stays clean", () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe("");
  });

  it("round-trips every filter", () => {
    const filters: Filters = {
      sector: "all",
      period: "2024-2026",
      incubator: 3,
      language: "es",
      documentType: "WA SAM Hub",
      documentTypeMode: "exclude",
      documentIds: ["d1", "d2"],
      categories: ["CHAR", "PRAC", "RUL"],
      linkMode: "pairs",
      categoryPairs: [
        ["CHAR", "PRAC"],
        ["PRAC", "RUL"],
      ],
      minDocuments: 3,
      weighting: "sentence-count",
      minWeight: 1.5,
      metric: "betweenness",
      topN: 80,
      edgeDisplay: "all",
      excludedEntityIds: ["435eb7d8-1d47-41a9-ba5a-c6e0ac5e5184"],
    };

    expect(filtersFromSearch(filtersToSearch(filters))).toEqual(filters);
  });

  it("falls back to defaults for tampered values", () => {
    const filters = filtersFromSearch("?sector=Mining&period=1999&inc=12&cats=CHAR,FOO&metric=magic&top=-4&minw=-1");

    expect(filters.period).toBe("all");
    expect(filters.sector).toBe("Agroforestry");
    expect(filters.incubator).toBe("all");
    expect(filters.categories).toEqual(["CHAR"]);
    expect(filters.metric).toBe("pagerank");
    expect(filters.topN).toBe(DEFAULT_FILTERS.topN);
    expect(filters.minWeight).toBe(0);
  });
});

describe("API requests", () => {
  it("sends null for 'all' selections and only sends pairs in pairs mode", () => {
    const request = toNetworkRequest({ ...DEFAULT_FILTERS, categoryPairs: [["CHAR", "LOC"]] });

    expect(request.categories).toBeNull();
    expect(request.document_ids).toBeNull();
    expect(request.category_pairs).toBeNull();
    expect(request.top_n).toBe(150);
    expect(request.productive_sector).toBe("Agroforestry");
    expect(request.document_type).toBeNull();
  });

  it("sends the document type with its mode", () => {
    const request = toNetworkRequest({ ...DEFAULT_FILTERS, documentType: "Other", documentTypeMode: "exclude" });

    expect(request.document_type).toBe("Other");
    expect(request.document_type_mode).toBe("exclude");
  });

  it("builds compare requests for both periods without top_n", () => {
    const request = toCompareRequest(DEFAULT_FILTERS, 10);

    expect(request.periods).toEqual(["2000-2020", "2021-2023", "2024-2026"]);
    expect(request.top_k).toBe(10);
    expect("top_n" in request).toBe(false);
  });
});

describe("document type in the URL", () => {
  it("ignores the mode without a type and counts type and mode as one filter", () => {
    expect(filtersFromSearch("?dmode=exclude").documentTypeMode).toBe("only");
    expect(filtersFromSearch("?dtype=Other&dmode=magic").documentTypeMode).toBe("only");
    expect(activeFilterCount({ ...DEFAULT_FILTERS, documentType: "Other", documentTypeMode: "exclude" })).toBe(1);
  });
});

describe("filterIssues", () => {
  it("flags impossible link combinations before calling the API", () => {
    expect(filterIssues({ ...DEFAULT_FILTERS, linkMode: "between", categories: ["CHAR"] }, 10)).toHaveLength(1);
    expect(filterIssues({ ...DEFAULT_FILTERS, linkMode: "pairs" }, 10)).toHaveLength(1);
    expect(filterIssues(DEFAULT_FILTERS, 10)).toEqual([]);
  });
});

describe("activeFilterCount", () => {
  it("counts only the filters that differ from the defaults", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...DEFAULT_FILTERS, period: "2021-2023", categories: ["CHAR", "PRAC"], topN: 60 }),
    ).toBe(3);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, categoryPairs: [] })).toBe(0);
  });

  it("keeps only valid, unique excluded entity ids from the URL", () => {
    const id = "435eb7d8-1d47-41a9-ba5a-c6e0ac5e5184";
    expect(filtersFromSearch(`?excl=${id},MADRE,${id}`).excludedEntityIds).toEqual([id]);
    expect(toNetworkRequest({ ...DEFAULT_FILTERS, excludedEntityIds: [id] }).excluded_entity_ids).toEqual([id]);
    expect(toNetworkRequest(DEFAULT_FILTERS).excluded_entity_ids).toBeNull();
    expect(activeFilterCount({ ...DEFAULT_FILTERS, excludedEntityIds: [id] })).toBe(1);
  });
});
