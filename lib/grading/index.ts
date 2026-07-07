// Health grade calculation — 2023 Nutri-Score algorithm, faithfully reproduced
// with the components MFDS data provides (.omc/plans/grading-spec.md). Numeric
// tables + provenance: tables.ts / docs/reference/nutriscore-2023-tables.md.
//
// v1 scope decisions (dataset has no FV / cheese / sweetener fields):
//   - Fruit/veg/legume points fixed at 0 (§3). 2023 removed the FV=5 protein-cap
//     exemption, so this creates no protein-cap gap.
//   - Cheese protein-cap exemption not applied (no cheese in v1 categories 음료+과자).
//   - Beverage non-nutritive-sweetener +4 rule omitted (no ingredients field;
//     grading-spec §15 default). Known bias: diet drinks under-penalised — documented.
import { pointsFor } from "./point-table";
import {
  BEVERAGE_TABLES,
  PROTEIN_CAP_A_THRESHOLD,
  SOLID_TABLES,
  beverageGradeFromScore,
  solidGradeFromScore,
} from "./tables";
import type {
  GradeResult,
  HealthGrade,
  NutrientInput,
  ProductType,
  RationaleEntry,
} from "./types";
import { kcalToKj, sodiumMgToSaltG } from "./units";

export { ALGORITHM_VERSION } from "./tables";
export { parseProductType } from "./product-type";

// The negative-4 components. Missing ANY of them makes the product ungradable
// (§9.1) — substituting 0 would unfairly improve the grade.
const REQUIRED_NEGATIVE: readonly (keyof NutrientInput)[] = [
  "energy_kcal",
  "sugars_g",
  "satfat_g",
  "sodium_mg",
];

export function gradeProduct(
  input: NutrientInput,
  productType: ProductType | null,
): GradeResult {
  // §9.3: without a product type (기준량 parse failed upstream) we cannot choose
  // beverage vs solid tables/cutoffs.
  if (productType == null) {
    return { gradable: false, ungradableReason: ["PRODUCT_TYPE_UNKNOWN"] };
  }

  // §9.1: gate on any missing negative-4 nutrient before scoring.
  const missing = REQUIRED_NEGATIVE.filter((key) => input[key] == null);
  if (missing.length > 0) {
    return { gradable: false, ungradableReason: [...missing] };
  }

  const tables = productType === "beverage" ? BEVERAGE_TABLES : SOLID_TABLES;

  // §5 unit conversions to the basis the 2023 tables are keyed on.
  const energyKj = kcalToKj(input.energy_kcal as number);
  const saltG = sodiumMgToSaltG(input.sodium_mg as number);

  // Negative (unfavourable) points → total A.
  const energyPts = pointsFor(energyKj, tables.energyKj);
  const sugarsPts = pointsFor(input.sugars_g as number, tables.sugarsG);
  const satfatPts = pointsFor(input.satfat_g as number, tables.satfatG);
  const saltPts = pointsFor(saltG, tables.saltG);
  const negativeTotal = energyPts + sugarsPts + satfatPts + saltPts;

  // §9.2: missing positive nutrients score 0 but remain gradable.
  const fibrePts = input.fiber_g == null ? 0 : pointsFor(input.fiber_g, tables.fibreG);
  const proteinPts =
    input.protein_g == null ? 0 : pointsFor(input.protein_g, tables.proteinG);
  const fruitVegPts = 0; // no FV field in the dataset — fixed 0 (§3)

  // Protein cap (§6): solids drop protein when A ≥ 11 (cheese exempt, but no
  // cheese in v1). Beverages have no cap.
  const proteinCapped =
    productType === "solid" && negativeTotal >= PROTEIN_CAP_A_THRESHOLD;
  const positiveTotal = proteinCapped
    ? fibrePts + fruitVegPts
    : fibrePts + fruitVegPts + proteinPts;

  // Health score = A − C. Single axis shared by grade and category ranking (§6).
  const healthScore = negativeTotal - positiveTotal;
  const grade: HealthGrade =
    productType === "beverage"
      ? beverageGradeFromScore(healthScore)
      : solidGradeFromScore(healthScore);

  const rationale = buildRationale({
    energy: energyPts,
    sugars: sugarsPts,
    satfat: satfatPts,
    salt: saltPts,
  });

  return { gradable: true, healthScore, grade, rationale };
}

// §10: the top contributing negative components (points desc), so the UI can
// explain *why* a product got its grade (e.g. "당류 9, 나트륨 6"). Ties break by
// component order (energy, sugars, satfat, salt) for determinism.
function buildRationale(negatives: Record<string, number>): RationaleEntry[] {
  return Object.entries(negatives)
    .map(([nutrient, points]) => ({ nutrient, points }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
}
