import { describe, expect, it } from "vitest";
import type { ExplorerDocument, ExplorerMeta } from "../api/client";
import { DEFAULT_FILTERS } from "../state/filters";
import { documentsInScope, periodDocumentCount } from "./scope";

function doc(id: string, language: string, type: string | null, year: number | null): ExplorerDocument {
  return { id, name: `${id}.pdf`, year, incubator_number: 1, language, document_type: type };
}

const DOCS = [
  doc("a", "es", "WA SAM Hub", 2019),
  doc("b", "en", "WA SAM Hub", 2022),
  doc("c", "en", "Other", 2025),
  doc("d", "es", null, 2022),
];

const META = {
  documents: DOCS,
  periods: [
    { id: "2000-2020", label: "", year_from: 2000, year_to: 2020, document_count: 1 },
    { id: "2021-2023", label: "", year_from: 2021, year_to: 2023, document_count: 2 },
    { id: "2024-2026", label: "", year_from: 2024, year_to: 2026, document_count: 1 },
  ],
} as unknown as ExplorerMeta;

const ids = (documents: ExplorerDocument[]) => documents.map((document) => document.id);

describe("documentsInScope", () => {
  it("keeps every document with the default filters", () => {
    expect(ids(documentsInScope(DOCS, DEFAULT_FILTERS))).toEqual(["a", "b", "c", "d"]);
  });

  it("selects only one type, or all but one (keeping documents without type)", () => {
    expect(ids(documentsInScope(DOCS, { ...DEFAULT_FILTERS, documentType: "WA SAM Hub" }))).toEqual(["a", "b"]);
    expect(
      ids(documentsInScope(DOCS, { ...DEFAULT_FILTERS, documentType: "WA SAM Hub", documentTypeMode: "exclude" })),
    ).toEqual(["c", "d"]);
  });

  it("combines language and document type", () => {
    const filters = { ...DEFAULT_FILTERS, language: "en", documentType: "Other", documentTypeMode: "exclude" as const };
    expect(ids(documentsInScope(DOCS, filters))).toEqual(["b"]);
  });
});

describe("periodDocumentCount", () => {
  it("counts the documents of the current scope in each period", () => {
    const filters = { ...DEFAULT_FILTERS, language: "es" };
    expect(periodDocumentCount(META, filters, "all")).toBe(2);
    expect(periodDocumentCount(META, filters, "2000-2020")).toBe(1);
    expect(periodDocumentCount(META, filters, "2024-2026")).toBe(0);
    expect(periodDocumentCount(undefined, filters, "all")).toBeUndefined();
  });
});
