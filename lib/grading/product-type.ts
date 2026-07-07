// Product-type detection from the MFDS `영양성분함량기준량` field
// (.omc/plans/grading-spec.md §4). "100ml" → beverage, "100g" → solid; anything
// else (parse failure) → null, which the grader treats as ungradable (§9.3).
//
// The raw field varies in formatting ("100 ml", "100mL", "100 g"), so normalize
// before matching (§13 risk: 기준량 포맷 변형 → 제품유형 오판정).
import type { ProductType } from "./types";

export function parseProductType(referenceRaw: string | null | undefined): ProductType | null {
  if (referenceRaw == null) return null;
  // Drop all whitespace and lowercase so "100 mL" and "100ml" collapse together.
  const normalized = referenceRaw.replace(/\s+/g, "").toLowerCase();
  if (normalized === "100ml") return "beverage";
  if (normalized === "100g") return "solid";
  return null;
}
