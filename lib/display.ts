// Presentation helpers for the MVP screens (.omc/plans/mvp-scope-screens.md §5).
// Pure formatting only — the data layer computes grades/scores; screens just
// render them. Kept framework-free so it is unit-testable.
import type { HealthGrade } from "@/lib/grading/types";

export const HEALTH_GRADES: readonly HealthGrade[] = ["A", "B", "C", "D", "E"];

// Grade badge colors: A (green/healthiest) → E (red). Accessibility: the letter
// is always shown alongside color (§5 색+문자 병기).
const GRADE_BADGE: Record<HealthGrade, string> = {
  A: "bg-green-600 text-white",
  B: "bg-lime-600 text-white",
  C: "bg-yellow-500 text-black",
  D: "bg-orange-500 text-white",
  E: "bg-red-600 text-white",
};

export function gradeBadgeClass(grade: HealthGrade): string {
  return GRADE_BADGE[grade];
}

// Nutrient / rationale keys → Korean labels. rationale keys come from
// lib/grading buildRationale ("energy"/"sugars"/"satfat"/"salt"); ungradable
// reasons come from NutrientInput keys ("energy_kcal" …) + sentinels.
const RATIONALE_LABEL_KO: Record<string, string> = {
  energy: "에너지",
  sugars: "당류",
  satfat: "포화지방",
  salt: "나트륨",
};

const UNGRADABLE_LABEL_KO: Record<string, string> = {
  energy_kcal: "에너지",
  sugars_g: "당류",
  satfat_g: "포화지방",
  sodium_mg: "나트륨",
  PRODUCT_TYPE_UNKNOWN: "제품유형 불명(기준량 판독 불가)",
};

export interface RationaleEntry {
  nutrient: string;
  points: number;
}

// rationale JSON → human sentence (§4.2, §5). Deterministic, no exaggeration
// (§9 risk). Returns null when there is nothing to explain.
export function rationaleToPhrase(rationaleJson: string | null): string | null {
  if (!rationaleJson) return null;
  let entries: RationaleEntry[];
  try {
    entries = JSON.parse(rationaleJson);
  } catch {
    return null;
  }
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const parts = entries
    .filter((e) => e && typeof e.nutrient === "string" && e.points > 0)
    .map((e) => `${RATIONALE_LABEL_KO[e.nutrient] ?? e.nutrient}(${e.points}점)`);
  if (parts.length === 0) return null;
  return `${parts.join(", ")}이(가) 건강 등급을 낮춘 주요 성분입니다.`;
}

// ungradable_reason JSON → Korean labels for the "등급 산출 불가" block (§4.2).
export function ungradableReasons(reasonJson: string | null): string[] {
  if (!reasonJson) return [];
  let reasons: string[];
  try {
    reasons = JSON.parse(reasonJson);
  } catch {
    return [];
  }
  if (!Array.isArray(reasons)) return [];
  return reasons.map((r) => UNGRADABLE_LABEL_KO[r] ?? r);
}

// 미측정(NULL) → "—" (visually distinct from a measured 0, §5). A measured 0
// renders as "0". Unit is appended only to real values.
export function formatNutrient(value: number | null | undefined, unit = ""): string {
  if (value == null) return "—";
  return unit ? `${value}${unit}` : String(value);
}

export function productTypeLabel(productType: string | null | undefined): string {
  if (productType === "beverage") return "음료";
  if (productType === "solid") return "고형식품";
  return "미분류";
}

// Reference-amount label for the nutrient table header (§4.2 기준량 명시).
export function referenceAmountLabel(productType: string | null | undefined): string {
  if (productType === "beverage") return "100ml당";
  if (productType === "solid") return "100g당";
  return "기준량당";
}
