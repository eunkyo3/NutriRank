// Drizzle schema mirroring .omc/plans/data-model-category-mapping.md §5 (DDL) exactly.
// NULL vs 0 discipline for product_nutrient is load-bearing: NULL=미측정, 0=실제 0 (grading-spec §9).
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// 소비자 카테고리 (§3) — 폐쇄 목록(시드가 단일 출처), product_type으로 음료/고형식품 분리.
export const consumerCategory = sqliteTable(
  "consumer_category",
  {
    id: text("id").primaryKey(), // 'carbonated' 등 slug
    name: text("name").notNull(), // '탄산음료'
    productType: text("product_type").notNull(), // 'beverage' | 'solid'
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    check(
      "consumer_category_product_type_check",
      sql`${table.productType} IN ('beverage','solid')`,
    ),
  ],
);

// 식약처 분류 → 소비자 카테고리 매핑 (§4, 큐레이션 시드)
export const mfdsCategoryMap = sqliteTable(
  "mfds_category_map",
  {
    mfdsLevel: text("mfds_level").notNull(), // 'sub'(소분류) | 'detail'(세분류)
    mfdsCode: text("mfds_code").notNull(), // 7자리 or 9자리
    mfdsName: text("mfds_name"), // 참고용 명칭
    categoryId: text("category_id")
      .notNull()
      .references(() => consumerCategory.id),
    mapVersion: integer("map_version").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mfdsLevel, table.mfdsCode] }),
    check(
      "mfds_category_map_level_check",
      sql`${table.mfdsLevel} IN ('sub','detail')`,
    ),
  ],
);

// 제품 (식별·분류·메타)
export const product = sqliteTable(
  "product",
  {
    foodCode: text("food_code").primaryKey(), // 식품코드
    name: text("name").notNull(), // 식품명
    manufacturer: text("manufacturer"), // 제조사명 (없으면 NULL)
    referenceRaw: text("reference_raw").notNull(), // 기준량 원문 '100g'/'100ml'
    productType: text("product_type"), // 기준량 파싱 결과, 불가시 NULL
    categoryId: text("category_id").references(() => consumerCategory.id), // 매핑 결과, 미매핑 NULL
    mfdsL1Code: text("mfds_l1_code"),
    mfdsL1Name: text("mfds_l1_name"), // 대분류
    mfdsL2Code: text("mfds_l2_code"),
    mfdsL2Name: text("mfds_l2_name"), // 중분류
    mfdsL3Code: text("mfds_l3_code"),
    mfdsL3Name: text("mfds_l3_name"), // 소분류
    mfdsL4Code: text("mfds_l4_code"),
    mfdsL4Name: text("mfds_l4_name"), // 세분류
    servingRef: text("serving_ref"), // 1회 섭취참고량(별개 개념, CONTEXT)
    dataGenDate: text("data_gen_date"), // 데이터생성일자
    ingestedAt: text("ingested_at").notNull(),
  },
  (table) => [
    index("idx_product_category").on(table.categoryId),
    check(
      "product_product_type_check",
      sql`${table.productType} IN ('beverage','solid')`,
    ),
  ],
);

// 영양성분 (기준량 100g/100ml 당). NULL=미측정, 0=실제 0 (grading-spec §9).
export const productNutrient = sqliteTable("product_nutrient", {
  foodCode: text("food_code")
    .primaryKey()
    .references(() => product.foodCode),
  energyKcal: real("energy_kcal"), // 에너지(kcal)
  sugarsG: real("sugars_g"), // 당류(g)
  satfatG: real("satfat_g"), // 포화지방산(g)
  sodiumMg: real("sodium_mg"), // 나트륨(mg)
  fiberG: real("fiber_g"), // 식이섬유(g)
  proteinG: real("protein_g"), // 단백질(g)
  // 확장 필요 시 컬럼 추가 또는 raw JSON 별도 보관
});

// 사전계산 등급 결과 (grading-spec 산출물)
export const gradeResult = sqliteTable(
  "grade_result",
  {
    foodCode: text("food_code")
      .primaryKey()
      .references(() => product.foodCode),
    gradable: integer("gradable").notNull(), // 0/1
    ungradableReason: text("ungradable_reason"), // 누락 성분 목록(JSON), gradable=1이면 NULL
    healthScore: real("health_score"), // 건강 점수 (gradable=0이면 NULL)
    healthGrade: text("health_grade"), // 'A'..'E'
    rationale: text("rationale"), // 등급 근거: 상위 기여 성분(JSON)
    algorithmVersion: text("algorithm_version").notNull(), // grading-spec 버전 태그
    computedAt: text("computed_at").notNull(),
  },
  (table) => [
    index("idx_grade_grade").on(table.healthGrade),
    check(
      "grade_result_health_grade_check",
      sql`${table.healthGrade} IN ('A','B','C','D','E')`,
    ),
  ],
);

// 사전계산 카테고리 순위 (ADR-0003, 건강 점수 오름차순)
export const categoryRanking = sqliteTable(
  "category_ranking",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => consumerCategory.id),
    foodCode: text("food_code")
      .notNull()
      .references(() => product.foodCode),
    rank: integer("rank").notNull(), // 1부터, 카테고리 내
    healthScore: real("health_score").notNull(),
    computedAt: text("computed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.foodCode] }),
    index("idx_ranking_cat_rank").on(table.categoryId, table.rank),
  ],
);

// 대시보드 추세용 집계 이력 (mvp-scope-screens §7). 파이프라인이 매 실행 끝에 카테고리별 1행 적재.
export const categoryAggSnapshot = sqliteTable(
  "category_agg_snapshot",
  {
    snapshotDate: text("snapshot_date").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => consumerCategory.id),
    productCount: integer("product_count"),
    avgHealthScore: real("avg_health_score"),
    gradeA: integer("grade_a"),
    gradeB: integer("grade_b"),
    gradeC: integer("grade_c"),
    gradeD: integer("grade_d"),
    gradeE: integer("grade_e"),
    avgSugarsG: real("avg_sugars_g"),
    avgSodiumMg: real("avg_sodium_mg"),
    avgSatfatG: real("avg_satfat_g"),
  },
  (table) => [primaryKey({ columns: [table.snapshotDate, table.categoryId] })],
);
