// Full gradeProduct golden cases + Acceptance Criteria (.omc/plans/grading-spec.md §12).
//
// No official per-product worked example exists in the primary reports (they
// publish only aggregate distributions — see docs/reference/nutriscore-2023-tables.md
// §3 honesty flag). These vectors are therefore recomputed here from the
// primary-source tables in tables.ts as *algorithm-conformance vectors*: inputs
// are in the dataset's units (kcal, sodium mg) and the expected score/grade
// follows deterministically from the transcribed tables. If code and tables
// agree, these pass.
import { describe, expect, it } from "vitest";
import { gradeProduct } from "@/lib/grading";
import type { NutrientInput } from "@/lib/grading/types";

// Build a NutrientInput; unspecified nutrients default to a measured 0 so each
// case states only what matters.
function nutrients(partial: Partial<NutrientInput>): NutrientInput {
  return {
    energy_kcal: 0,
    sugars_g: 0,
    satfat_g: 0,
    sodium_mg: 0,
    fiber_g: 0,
    protein_g: 0,
    ...partial,
  };
}

describe("gradeProduct — solid golden vectors (§7/§8)", () => {
  it("S1 all-zero solid → score 0, grade A", () => {
    const r = gradeProduct(nutrients({}), "solid");
    expect(r.gradable).toBe(true);
    expect(r.healthScore).toBe(0);
    expect(r.grade).toBe("A");
  });

  it("S2 high-sugar biscuit → A=27, grade E (protein capped)", () => {
    // 478 kcal→1999.95 kJ (5) · sugars 35 (10) · satfat 12 (10) · 200mg→0.5g salt (2) = 27
    const r = gradeProduct(
      nutrients({ energy_kcal: 478, sugars_g: 35, satfat_g: 12, sodium_mg: 200, fiber_g: 1.5, protein_g: 6 }),
      "solid",
    );
    expect(r.healthScore).toBe(27);
    expect(r.grade).toBe("E");
  });

  it("S4 high-A non-cheese → score 22, grade E (protein dropped)", () => {
    // 335 kcal→1401.6 kJ (4) · sugars 1 (0) · satfat 20 (10) · 720mg→1.8g salt (8) = 22
    // A≥11 so protein 25 is dropped; FNS = 22 − 0.
    const r = gradeProduct(
      nutrients({ energy_kcal: 335, sugars_g: 1, satfat_g: 20, sodium_mg: 720, protein_g: 25 }),
      "solid",
    );
    expect(r.healthScore).toBe(22);
    expect(r.grade).toBe("E");
  });

  it("S5 moderate biscuit A<11 → protein counted, score 8, grade C", () => {
    // energy 4 + sugars(10→2) + satfat(3→2) + salt(0.5→2) = A 10 (<11)
    // protein 5→2 counted, fibre 2→0 ⇒ FNS = 10 − 2 = 8
    const r = gradeProduct(
      nutrients({ energy_kcal: 335, sugars_g: 10, satfat_g: 3, sodium_mg: 200, fiber_g: 2, protein_g: 5 }),
      "solid",
    );
    expect(r.healthScore).toBe(8);
    expect(r.grade).toBe("C");
  });

  it("S6 low-cal high-protein/fibre → negative score, grade A", () => {
    // A=0; protein 5→2, fibre 4→1 ⇒ FNS = 0 − 3 = −3
    const r = gradeProduct(
      nutrients({ energy_kcal: 70, sugars_g: 2, satfat_g: 0.5, sodium_mg: 40, fiber_g: 4, protein_g: 5 }),
      "solid",
    );
    expect(r.healthScore).toBe(-3);
    expect(r.grade).toBe("A");
  });

  it("S7 protein-cap boundary at A=11 → protein dropped, score 11, grade D", () => {
    // energy 5 + sugars(24→6) = A 11 exactly ⇒ cap fires.
    // With cap: FNS = 11 (grade D). Without the cap protein 10→4 would give
    // FNS = 7 (grade C) — so this case is the §12 "N≥11 단백질 미반영" regression.
    const r = gradeProduct(
      nutrients({ energy_kcal: 478, sugars_g: 24, satfat_g: 0, sodium_mg: 0, protein_g: 10 }),
      "solid",
    );
    expect(r.healthScore).toBe(11);
    expect(r.grade).toBe("D");
  });
});

describe("gradeProduct — beverage golden vectors (§7/§8)", () => {
  it("B1 zero non-water beverage → score 0, grade B (never A)", () => {
    // Grade A is water-only; a non-water beverage with FNS ≤ 2 grades B.
    const r = gradeProduct(nutrients({}), "beverage");
    expect(r.healthScore).toBe(0);
    expect(r.grade).toBe("B");
  });

  it("B2 full-sugar cola → A=12, grade E", () => {
    // 43 kcal→179.9 kJ (3) · sugars 10.6 (9) = 12
    const r = gradeProduct(nutrients({ energy_kcal: 43, sugars_g: 10.6 }), "beverage");
    expect(r.healthScore).toBe(12);
    expect(r.grade).toBe("E");
  });

  it("B4 semi-skimmed milk → score −1, grade B (beverage protein, no cap)", () => {
    // 45 kcal→188.3 kJ (3) · sugars 4.8 (3) · satfat 1.0 (0) · 40mg→0.1g salt (0) = A 6
    // beverage protein 3.3→7, no cap ⇒ FNS = 6 − 7 = −1
    const r = gradeProduct(
      nutrients({ energy_kcal: 45, sugars_g: 4.8, satfat_g: 1.0, sodium_mg: 40, protein_g: 3.3 }),
      "beverage",
    );
    expect(r.healthScore).toBe(-1);
    expect(r.grade).toBe("B");
  });

  it("B5 lightly-sweet juice → A=4, grade C", () => {
    // 35 kcal→146.4 kJ (2) · sugars 3.5 (2) = 4
    const r = gradeProduct(nutrients({ energy_kcal: 35, sugars_g: 3.5 }), "beverage");
    expect(r.healthScore).toBe(4);
    expect(r.grade).toBe("C");
  });
});

describe("미측정 / ungradable rules (§9)", () => {
  it("null product type → ungradable", () => {
    const r = gradeProduct(nutrients({}), null);
    expect(r.gradable).toBe(false);
    expect(r.ungradableReason).toEqual(["PRODUCT_TYPE_UNKNOWN"]);
    expect(r.healthScore).toBeUndefined();
    expect(r.grade).toBeUndefined();
  });

  it("a missing negative-4 nutrient → ungradable, reason names it (§9.1)", () => {
    const r = gradeProduct(nutrients({ sugars_g: null }), "solid");
    expect(r.gradable).toBe(false);
    expect(r.ungradableReason).toContain("sugars_g");
    expect(r.grade).toBeUndefined();
  });

  it("all negatives missing → ungradable listing all four", () => {
    const r = gradeProduct(
      { energy_kcal: null, sugars_g: null, satfat_g: null, sodium_mg: null, fiber_g: null, protein_g: null },
      "solid",
    );
    expect(r.gradable).toBe(false);
    expect(r.ungradableReason).toEqual(["energy_kcal", "sugars_g", "satfat_g", "sodium_mg"]);
  });

  it("missing positive nutrients stay gradable, scored as 0 (§9.2)", () => {
    // protein & fibre null but negatives present → gradable; missing positives
    // add 0, so this matches an all-zero-positive product.
    const withNullPositives = gradeProduct(
      nutrients({ energy_kcal: 478, sugars_g: 35, satfat_g: 12, sodium_mg: 200, fiber_g: null, protein_g: null }),
      "solid",
    );
    expect(withNullPositives.gradable).toBe(true);
    expect(withNullPositives.healthScore).toBe(27); // same as S2 (positives were 0 anyway)
  });
});

describe("determinism, rationale & monotonicity (§6/§8/§10)", () => {
  const input = nutrients({ energy_kcal: 478, sugars_g: 35, satfat_g: 12, sodium_mg: 200 });

  it("is deterministic — identical inputs give identical output", () => {
    expect(gradeProduct(input, "solid")).toEqual(gradeProduct(input, "solid"));
  });

  it("rationale lists top contributors, points descending, positive-only, ≤3 (§10)", () => {
    const r = gradeProduct(input, "solid");
    const rat = r.rationale ?? [];
    expect(rat.length).toBeLessThanOrEqual(3);
    expect(rat.length).toBeGreaterThan(0);
    for (const e of rat) expect(e.points).toBeGreaterThan(0);
    // sorted descending
    for (let i = 1; i < rat.length; i++) {
      expect(rat[i - 1].points).toBeGreaterThanOrEqual(rat[i].points);
    }
    // top contributor for S2-shaped input is a 10-point component (sugars/satfat)
    expect(rat[0].points).toBe(10);
  });

  it("rationale includes positive contributors (protein/fibre) tagged kind=positive (§10)", () => {
    // A=6 (<11, no cap): sugars 10→2, satfat 3→2, 200mg→0.5g salt→2 (energy 70kcal→0).
    // positives counted: protein 8→3, fibre 4→1.
    const r = gradeProduct(
      nutrients({ energy_kcal: 70, sugars_g: 10, satfat_g: 3, sodium_mg: 200, fiber_g: 4, protein_g: 8 }),
      "solid",
    );
    const rat = r.rationale ?? [];
    const negatives = rat.filter((e) => e.kind === "negative");
    const positives = rat.filter((e) => e.kind === "positive");
    // 감점: 상위 기여 3개, 모두 양수, points 뒤에 kind=negative.
    expect(negatives.map((e) => e.nutrient).sort()).toEqual(["salt", "satfat", "sugars"]);
    for (const e of negatives) expect(e.points).toBeGreaterThan(0);
    // 가점: 0점 초과인 단백질·식이섬유가 kind=positive 로 담긴다.
    expect(positives).toEqual(
      expect.arrayContaining([
        { nutrient: "protein", points: 3, kind: "positive" },
        { nutrient: "fibre", points: 1, kind: "positive" },
      ]),
    );
  });

  it("excludes protein from rationale when the protein cap fires, keeps fibre (§6/§10)", () => {
    // A=22 (≥11 → cap): energy 4, satfat 10, salt 8, sugars 0. protein 25 dropped
    // from the score AND from the rationale; fibre 4→1 still a positive contributor.
    const r = gradeProduct(
      nutrients({ energy_kcal: 335, sugars_g: 1, satfat_g: 20, sodium_mg: 720, fiber_g: 4, protein_g: 25 }),
      "solid",
    );
    const rat = r.rationale ?? [];
    const positives = rat.filter((e) => e.kind === "positive");
    expect(positives.map((e) => e.nutrient)).toEqual(["fibre"]);
    expect(rat.some((e) => e.nutrient === "protein")).toBe(false);
  });

  it("grade never contradicts the health-score axis (§8, ADR-0003)", () => {
    // Better grade ⇒ lower (healthier) score within a product type.
    const order: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const cases = [
      gradeProduct(nutrients({ energy_kcal: 70, sugars_g: 2, satfat_g: 0.5, sodium_mg: 40, fiber_g: 4, protein_g: 5 }), "solid"), // A/-3
      gradeProduct(nutrients({ energy_kcal: 335, sugars_g: 10, satfat_g: 3, sodium_mg: 200, fiber_g: 2, protein_g: 5 }), "solid"), // C/8
      gradeProduct(nutrients({ energy_kcal: 478, sugars_g: 35, satfat_g: 12, sodium_mg: 200 }), "solid"), // E/27
    ];
    const sorted = [...cases].sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0));
    for (let i = 1; i < sorted.length; i++) {
      expect(order[sorted[i].grade!]).toBeGreaterThanOrEqual(order[sorted[i - 1].grade!]);
    }
  });
});
