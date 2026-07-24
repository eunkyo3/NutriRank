// Domain types for grading-spec.md. CONTEXT.md 용어집: 건강 점수/등급, 제품유형, 미측정.
export type ProductType = "beverage" | "solid";

export type HealthGrade = "A" | "B" | "C" | "D" | "E";

// 기준량(100g/100ml) 당 영양성분. NULL=미측정, 0=실제 0 (grading-spec §9, data-model §6).
// 필드명은 product_nutrient 컬럼명과 일치시켜(snake_case) 적재-등급산출 경계에서 매핑 실수를 줄인다.
export interface NutrientInput {
  energy_kcal: number | null;
  sugars_g: number | null;
  satfat_g: number | null;
  sodium_mg: number | null;
  fiber_g: number | null;
  protein_g: number | null;
}

// 등급 근거: 등급에 기여한 영양소를 나열 (grading-spec §10). kind로 감점(negative)/
// 가점(positive)을 구분한다 — points는 항상 양수 크기(부호 아님)이고, 방향은 kind가
// 정한다. 감점은 상위 기여 순, 가점(단백질·식이섬유)은 0점 초과인 것만 담는다.
export interface RationaleEntry {
  nutrient: string;
  points: number;
  kind: "negative" | "positive";
}

export interface GradeResult {
  gradable: boolean;
  // gradable=false일 때만 채워짐: 누락으로 등급 산출을 막은 성분 목록 (grading-spec §9).
  ungradableReason?: string[];
  // gradable=false면 미정의.
  healthScore?: number;
  grade?: HealthGrade;
  rationale?: RationaleEntry[];
}
