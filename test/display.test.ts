// Presentation helpers (.omc/plans/mvp-scope-screens.md §5, §8 AC): grade badge,
// 미측정 '—' vs measured 0, rationale 감점/가점 entries, ungradable reasons.
import { describe, expect, it } from "vitest";
import {
  formatNutrient,
  gradeBadgeClass,
  productTypeLabel,
  rankPercentileLabel,
  rationaleEntries,
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

  // category_agg_snapshot의 SQL AVG 결과는 배정밀도 잔차를 그대로 들고 온다.
  it("rounds aggregate averages to one decimal instead of dumping float noise", () => {
    expect(formatNutrient(16.972558209857876)).toBe("17");
    expect(formatNutrient(15.861111614902173, "g")).toBe("15.9g");
    expect(formatNutrient(317.92201314894584, "mg")).toBe("317.9mg");
    expect(formatNutrient(6.498273359540383, "g")).toBe("6.5g");
  });

  it("keeps whole numbers whole and survives non-finite input", () => {
    expect(formatNutrient(219, "kcal")).toBe("219kcal");
    expect(formatNutrient(Number.NaN)).toBe("—");
    expect(formatNutrient(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

// 건강 점수(-1 같은 Nutri-Score 원점수)는 그 자체로 해석이 안 되므로 카테고리 내
// 백분위로 위치를 알려준다.
describe("rankPercentileLabel", () => {
  it("converts a rank within a category into a top-N% label", () => {
    expect(rankPercentileLabel(54, 13228)).toBe("상위 0.4%");
    expect(rankPercentileLabel(6614, 13228)).toBe("상위 50%");
    expect(rankPercentileLabel(13228, 13228)).toBe("상위 100%");
  });

  it("floors at 0.1% so rank 1 never reads as 상위 0%", () => {
    expect(rankPercentileLabel(1, 50000)).toBe("상위 0.1%");
  });

  it("returns null for impossible rank/total combinations", () => {
    expect(rankPercentileLabel(0, 100)).toBeNull();
    expect(rankPercentileLabel(5, 0)).toBeNull();
    expect(rankPercentileLabel(101, 100)).toBeNull();
    expect(rankPercentileLabel(Number.NaN, 100)).toBeNull();
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

describe("rationaleEntries — structured 감점/가점 for the detail screen (§4.2)", () => {
  it("splits negatives and positives with Korean labels and kind", () => {
    const entries = rationaleEntries(JSON.stringify([
      { nutrient: "sugars", points: 9, kind: "negative" },
      { nutrient: "protein", points: 3, kind: "positive" },
      { nutrient: "fibre", points: 1, kind: "positive" },
    ]));
    expect(entries).toEqual([
      { label: "당류", points: 9, kind: "negative" },
      { label: "단백질", points: 3, kind: "positive" },
      { label: "식이섬유", points: 1, kind: "positive" },
    ]);
  });

  // 구 형식 rationale(감점만, kind 없음)이 남아 있어도 감점으로 취급해 화면이 안 깨진다.
  it("treats legacy entries without kind as negative", () => {
    const entries = rationaleEntries(JSON.stringify([{ nutrient: "salt", points: 6 }]));
    expect(entries).toEqual([{ label: "나트륨", points: 6, kind: "negative" }]);
  });

  it("drops zero-point entries and returns [] for null/malformed", () => {
    expect(rationaleEntries(JSON.stringify([{ nutrient: "sugars", points: 0, kind: "negative" }]))).toEqual([]);
    expect(rationaleEntries(null)).toEqual([]);
    expect(rationaleEntries("nope")).toEqual([]);
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
