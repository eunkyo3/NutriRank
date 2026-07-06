// Health grade calculation per .omc/plans/grading-spec.md.
// TODO(grading-spec): implement the full 2023 Nutri-Score-derived algorithm:
//   - §5 unit conversions (kcal→kJ ×4.184, sodium mg→salt g ×2.5/1000)
//   - §6 N/P scoring incl. the protein cap when N>=11 and fruit score <5
//   - §7/§8 point + grade-cutoff tables (beverage vs solid), transcribed from
//     the official 2023 Santé publique France source and golden-case verified
//   - §9 미측정 rule: any missing negative-4 nutrient (energy/sugars/satfat/
//     sodium) => gradable=false; missing positive nutrients (fiber/protein)
//     score as 0 but remain gradable
//   - §10 rationale: top 2-3 contributing nutrients by point size
import type { GradeResult, NutrientInput, ProductType } from "./types";

export function gradeProduct(
  input: NutrientInput,
  productType: ProductType | null,
): GradeResult {
  void input;
  void productType;
  return { gradable: false, ungradableReason: ["NOT_IMPLEMENTED"] };
}
