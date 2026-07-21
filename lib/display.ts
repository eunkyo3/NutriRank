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

// 분포 차트 막대용 배경색. 배지와 같은 색 축(A 초록 → E 빨강)을 써서 화면 간
// 등급 색 인지가 어긋나지 않게 한다. 클래스 문자열은 GRADE_BADGE와 동일해
// Tailwind가 이미 생성한다(42ba9fb: content에 lib/** 포함).
const GRADE_BAR: Record<HealthGrade, string> = {
  A: "bg-green-600",
  B: "bg-lime-600",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  E: "bg-red-600",
};

export function gradeBarClass(grade: HealthGrade): string {
  return GRADE_BAR[grade];
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
  // CONTEXT.md '등급 근거' 문구를 그대로 사용한다. rationale에는 감점 성분만 담기므로
  // (buildRationale은 negatives만 받음) 등급과 무관하게 참인 표현이어야 한다 — A등급
  // 제품에 "등급을 낮춘"이라고 쓰면 사실과 어긋난다.
  return `등급에 크게 기여한 성분: ${parts.join(", ")}`;
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
//
// 집계 평균(category_agg_snapshot)은 SQL AVG 결과라 배정밀도 잔차가 그대로 남는다
// (예: 16.972558209857876). 소수 1자리로 반올림하고 뒤따르는 0은 떼어내, 원본이
// 정수인 값은 정수로 유지한다.
export function formatNutrient(value: number | null | undefined, unit = ""): string {
  if (value == null) return "—";
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const text = String(rounded);
  return unit ? `${text}${unit}` : text;
}

// 건강 점수는 Nutri-Score 내부 점수라 "-1"만 보면 좋은지 나쁜지 알 수 없다. 순위를
// 백분위로 바꿔 위치 감각을 준다. 1위는 상위 0%가 아니라 가장 위이므로 하한을 0.1%로 둔다.
export function rankPercentileLabel(rank: number, total: number): string | null {
  if (!Number.isFinite(rank) || !Number.isFinite(total)) return null;
  if (total <= 0 || rank <= 0 || rank > total) return null;
  const pct = (rank / total) * 100;
  if (pct < 0.1) return "상위 0.1%";
  return `상위 ${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

export function productTypeLabel(productType: string | null | undefined): string {
  if (productType === "beverage") return "음료";
  if (productType === "solid") return "고형식품";
  return "미분류";
}

// Reference-amount label for the nutrient table header (§4.2 기준량 명시).
//
// 제품유형은 카테고리가 정하지만(map.ts), 영양값 자체는 원천이 표기한 기준량 단위로
// 들어온다. 둘이 어긋날 수 있으므로(100g으로 표기된 주스 등) 표에는 실제 표기를
// 우선 노출한다 — 음료로 등급을 매겼다고 값까지 100ml당이 되는 것은 아니다.
export function referenceAmountLabel(
  productType: string | null | undefined,
  referenceRaw?: string | null,
): string {
  const normalized = referenceRaw?.replace(/\s+/g, "").toLowerCase();
  if (normalized === "100ml") return "100ml당";
  if (normalized === "100g") return "100g당";
  if (productType === "beverage") return "100ml당";
  if (productType === "solid") return "100g당";
  return "기준량당";
}
