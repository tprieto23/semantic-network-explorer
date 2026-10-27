import { describe, expect, it } from "vitest";
import { translate } from ".";
import { MESSAGES } from "./messages";

describe("translate", () => {
  it("fills the variables it receives and keeps literal placeholders", () => {
    expect(translate("es", "common.docs", { n: 3 })).toBe("3 docs");
    expect(translate("en", "net.riserDetail", { from: 64, to: 25, metric: "PageRank" })).toBe("#64 → #25 in PageRank");
    expect(translate("en", "evo.step1")).toContain("/documents/{id}/classification");
  });

  it("has every key in both languages and no empty text", () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual(Object.keys(MESSAGES.es).sort());
    for (const lang of ["es", "en"] as const) {
      for (const [key, text] of Object.entries(MESSAGES[lang])) {
        expect(text.length, `${lang}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("uses the same variables in both languages", () => {
    const vars = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(MESSAGES.es) as (keyof typeof MESSAGES.es)[]) {
      expect(vars(MESSAGES.en[key]), key).toEqual(vars(MESSAGES.es[key]));
    }
  });
});
