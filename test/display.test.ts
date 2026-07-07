// Presentation helpers (.omc/plans/mvp-scope-screens.md §5, §8 AC): grade badge,
// 미측정 '—' vs measured 0, rationale phrasing, ungradable reasons.
import { describe, expect, it } from "vitest";
import {
  formatNutrient,
  gradeBadgeClass,
  productTypeLabel,
  rationaleToPhrase,
  referenceAmountLabel,
  ungradableReasons,
} from "@/lib/display";

describe("formatNutrient — 미측정 '—' vs measured 0 (§5, §8 AC)", () => {
  it("renders null as an em dash and 0 as 0", () => {
    expect(formatNutrient(null)).toBe("—");
    expect(formatNutrient(undefined)).toBe("—");
    expect(formatNutrient(0)).toBe("0");
    expect(formatNutrient(0, "g")).toBe("0g");
  });

  it("appends the unit only to real values", () => {
    expect(formatNutrient(12.3, "g")).toBe("12.3g");
    expect(formatNutrient(150, "mg")).toBe("150mg");
    expect(formatNutrient(null, "g")).toBe("—");
  });
});

describe("gradeBadgeClass", () => {
  it("gives each grade a distinct class", () => {
    const classes = (["A", "B", "C", "D", "E"] as const).map(gradeBadgeClass);
    expect(new Set(classes).size).toBe(5);
    expect(gradeBadgeClass("A")).toContain("green");
    expect(gradeBadgeClass("E")).toContain("red");
  });
});

describe("rationaleToPhrase (§4.2)", () => {
  it("builds a Korean sentence from the top contributors", () => {
    const phrase = rationaleToPhrase(JSON.stringify([
      { nutrient: "sugars", points: 9 },
      { nutrient: "salt", points: 6 },
    ]));
    expect(phrase).toContain("당류(9점)");
    expect(phrase).toContain("나트륨(6점)");
  });

  it("returns null for empty, missing, or malformed rationale", () => {
    expect(rationaleToPhrase(null)).toBeNull();
    expect(rationaleToPhrase("[]")).toBeNull();
    expect(rationaleToPhrase("not json")).toBeNull();
    expect(rationaleToPhrase(JSON.stringify([{ nutrient: "sugars", points: 0 }]))).toBeNull();
  });
});

describe("ungradableReasons (§4.2)", () => {
  it("maps reason codes to Korean labels", () => {
    expect(ungradableReasons(JSON.stringify(["sugars_g", "sodium_mg"]))).toEqual(["당류", "나트륨"]);
    expect(ungradableReasons(JSON.stringify(["PRODUCT_TYPE_UNKNOWN"]))[0]).toContain("제품유형");
  });

  it("returns empty for null / malformed", () => {
    expect(ungradableReasons(null)).toEqual([]);
    expect(ungradableReasons("nope")).toEqual([]);
  });
});

describe("product-type & reference-amount labels (§4.2)", () => {
  it("labels product types in Korean", () => {
    expect(productTypeLabel("beverage")).toBe("음료");
    expect(productTypeLabel("solid")).toBe("고형식품");
    expect(productTypeLabel(null)).toBe("미분류");
  });

  it("labels the nutrient-table reference amount by product type", () => {
    expect(referenceAmountLabel("beverage")).toBe("100ml당");
    expect(referenceAmountLabel("solid")).toBe("100g당");
  });
});
