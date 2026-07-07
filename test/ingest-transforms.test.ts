// Pure pipeline transforms — parsing, dedup, quality gate, ranking, aggregation
// (.omc/plans/data-pipeline-spec.md §5/§6/§8/§10/§12, §11 AC). These are
// independent of the API wire schema (they operate on normalized records).
import { describe, expect, it } from "vitest";
import { computeAggSnapshot } from "@/scripts/ingest/aggregate";
import { dedupByFoodCode } from "@/scripts/ingest/dedup";
import { DEFAULT_GATE_CONFIG, evaluateQualityGate } from "@/scripts/ingest/gate";
import { parseNullableText, parseNutrientValue } from "@/scripts/ingest/parse";
import { computeCategoryRankings } from "@/scripts/ingest/rank";

describe("parseNutrientValue — 미측정 NULL vs measured 0 (§5.2)", () => {
  it("keeps a measured 0 as 0", () => {
    expect(parseNutrientValue("0")).toBe(0);
    expect(parseNutrientValue(0)).toBe(0);
    expect(parseNutrientValue("0.0")).toBe(0);
  });

  it("maps blank / 해당없음 / dash / non-numeric to null", () => {
    expect(parseNutrientValue("")).toBeNull();
    expect(parseNutrientValue("   ")).toBeNull();
    expect(parseNutrientValue("해당없음")).toBeNull();
    expect(parseNutrientValue("-")).toBeNull();
    expect(parseNutrientValue("N/A")).toBeNull();
    expect(parseNutrientValue("abc")).toBeNull();
    expect(parseNutrientValue(null)).toBeNull();
    expect(parseNutrientValue(undefined)).toBeNull();
  });

  it("parses numeric strings incl. thousands separators", () => {
    expect(parseNutrientValue("12.3")).toBe(12.3);
    expect(parseNutrientValue("1,234")).toBe(1234);
    expect(parseNutrientValue(" 45.6 ")).toBe(45.6);
  });

  it("parseNullableText nulls out blanks and 해당없음", () => {
    expect(parseNullableText("해당없음")).toBeNull();
    expect(parseNullableText("")).toBeNull();
    expect(parseNullableText("롯데")).toBe("롯데");
    expect(parseNullableText(null)).toBeNull();
  });
});

describe("dedupByFoodCode — keep latest 데이터생성일자 (§6)", () => {
  it("keeps the newest-dated record per food code", () => {
    const out = dedupByFoodCode([
      { foodCode: "P1", dataGenDate: "2024-01-01", v: "old" },
      { foodCode: "P1", dataGenDate: "2025-06-01", v: "new" },
      { foodCode: "P2", dataGenDate: "2023-01-01", v: "only" },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.foodCode === "P1")?.v).toBe("new");
    expect(out.find((r) => r.foodCode === "P2")?.v).toBe("only");
  });

  it("prefers a dated record over an undated one", () => {
    const out = dedupByFoodCode([
      { foodCode: "P1", dataGenDate: null, v: "undated" },
      { foodCode: "P1", dataGenDate: "2024-01-01", v: "dated" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].v).toBe("dated");
  });
});

describe("evaluateQualityGate — swap-blocking checks (§8)", () => {
  const ok = {
    collectedCount: 1000,
    totalCount: 1000,
    loadedCount: 500,
    previousLoadedCount: 520,
    requiredFieldMissingRate: 0.01,
  };

  it("passes when all checks are within thresholds", () => {
    expect(evaluateQualityGate(ok).pass).toBe(true);
  });

  it("blocks when collected != totalCount", () => {
    const r = evaluateQualityGate({ ...ok, collectedCount: 900 });
    expect(r.pass).toBe(false);
    expect(r.reasons[0]).toContain("count_mismatch");
  });

  it("blocks on a >20% volume drop vs previous snapshot", () => {
    const r = evaluateQualityGate({ ...ok, loadedCount: 300, previousLoadedCount: 500 });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("volume_drop"))).toBe(true);
  });

  it("does not check volume drop on the first run (no previous)", () => {
    expect(evaluateQualityGate({ ...ok, loadedCount: 1, previousLoadedCount: null }).pass).toBe(true);
  });

  it("blocks when required-field missing rate exceeds the threshold", () => {
    const r = evaluateQualityGate({ ...ok, requiredFieldMissingRate: 0.2 });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("required_missing"))).toBe(true);
  });

  it("uses the documented defaults (20% drop, 5% missing)", () => {
    expect(DEFAULT_GATE_CONFIG).toEqual({ maxDropRatio: 0.2, maxRequiredMissingRate: 0.05 });
  });
});

describe("computeCategoryRankings — score asc, gapless rank (§10, ADR-0003)", () => {
  it("ranks healthier (lower score) first with 1..n gapless ranks", () => {
    const rows = computeCategoryRankings("carbonated", [
      { foodCode: "C", healthScore: 12 },
      { foodCode: "A", healthScore: -3 },
      { foodCode: "B", healthScore: 5 },
    ]);
    expect(rows.map((r) => [r.foodCode, r.rank])).toEqual([
      ["A", 1],
      ["B", 2],
      ["C", 3],
    ]);
    // Grade-A-ish (lowest score) must not rank behind a worse product (no contradiction).
    expect(rows[0].healthScore).toBeLessThan(rows[2].healthScore);
  });

  it("breaks score ties by foodCode for determinism", () => {
    const rows = computeCategoryRankings("juice", [
      { foodCode: "Z", healthScore: 4 },
      { foodCode: "A", healthScore: 4 },
    ]);
    expect(rows.map((r) => r.foodCode)).toEqual(["A", "Z"]);
  });
});

describe("computeAggSnapshot — category distribution & means (§12)", () => {
  it("counts grades and averages measured values, excluding nulls", () => {
    const row = computeAggSnapshot("snack_chip", [
      { gradable: true, healthScore: 10, grade: "C", sugarsG: 20, sodiumMg: 400, satfatG: 5 },
      { gradable: true, healthScore: 20, grade: "E", sugarsG: 30, sodiumMg: null, satfatG: 7 },
      { gradable: false, healthScore: null, grade: null, sugarsG: null, sodiumMg: 100, satfatG: null },
    ]);
    expect(row.productCount).toBe(3);
    expect(row.gradeC).toBe(1);
    expect(row.gradeE).toBe(1);
    expect(row.gradeA).toBe(0);
    expect(row.avgHealthScore).toBe(15); // (10+20)/2, ungradable excluded
    expect(row.avgSugarsG).toBe(25); // (20+30)/2, null excluded
    expect(row.avgSodiumMg).toBe(250); // (400+100)/2
  });

  it("returns null averages when every value is 미측정", () => {
    const row = computeAggSnapshot("coffee", [
      { gradable: false, healthScore: null, grade: null, sugarsG: null, sodiumMg: null, satfatG: null },
    ]);
    expect(row.avgHealthScore).toBeNull();
    expect(row.avgSugarsG).toBeNull();
    expect(row.productCount).toBe(1);
  });
});
