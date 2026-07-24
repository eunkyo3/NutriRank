// Read queries for the MVP screens (.omc/plans/mvp-scope-screens.md §3–§4).
// Every screen reads ONLY pre-computed tables — no grade/rank computation at
// request time (ADR-0004). Functions take a db so they are unit-testable against
// an in-memory SQLite; page components pass tryGetReadDb().
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { ReadDb } from "./client";
import {
  categoryAggSnapshot,
  categoryRanking,
  consumerCategory,
  gradeResult,
  product,
  productNutrient,
} from "./schema";

export type Db = ReadDb;

// Escape LIKE metacharacters so a literal "%"/"_" in the search term matches
// itself instead of acting as a wildcard (used with ESCAPE '\' below).
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function getCategories(db: Db) {
  return db.select().from(consumerCategory).orderBy(asc(consumerCategory.displayOrder)).all();
}

export function getCategory(db: Db, id: string) {
  return db.select().from(consumerCategory).where(eq(consumerCategory.id, id)).get() ?? null;
}

export interface ProductSearchFilters {
  q?: string;
  categoryId?: string;
  productType?: "beverage" | "solid";
  grade?: string;
  limit?: number;
}

export interface ProductCard {
  foodCode: string;
  name: string;
  manufacturer: string | null;
  productType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  gradable: boolean;
  healthGrade: string | null;
  healthScore: number | null;
}

// §4.1 search: 제품명 유사어 검색 + 카테고리 / 제품유형 / 등급 필터. 검색어가
// 3자 이상이면 FTS5 trigram 인덱스로 부분일치·유사어·오타(OR 트라이그램) 매칭을
// 관련도 순으로, 2자 이하면 LIKE 부분일치로 처리한다(trigram은 3자 미만 불가).
export function searchProducts(db: Db, filters: ProductSearchFilters): ProductCard[] {
  const compact = filters.q?.replace(/\s+/g, "") ?? "";
  if (compact.length >= 3) return searchProductsFts(db, compact, filters);
  return searchProductsLike(db, filters);
}

// Build an FTS5 trigram MATCH query: each 3-gram phrase AND'd together (space =
// AND in FTS5), so a match requires ALL of the query's trigrams — i.e. a real
// substring/partial match, not a loose single-gram overlap. AND avoids the junk
// an OR query returns (e.g. an unrelated product sharing one trigram), and makes
// a genuine miss return exactly 0 rows so the on-demand search cache can fire.
function trigramMatchQuery(compact: string): string {
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= compact.length; i++) grams.add(compact.slice(i, i + 3));
  // Phrase-quote each gram (escape embedded quotes) so FTS5 treats it literally.
  return [...grams].map((g) => `"${g.replace(/"/g, '""')}"`).join(" ");
}

interface RawCard {
  foodCode: string;
  name: string;
  manufacturer: string | null;
  productType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  gradable: number | null;
  healthGrade: string | null;
  healthScore: number | null;
}

function searchProductsFts(db: Db, compact: string, filters: ProductSearchFilters): ProductCard[] {
  const conds = [sql`product_fts MATCH ${trigramMatchQuery(compact)}`];
  if (filters.categoryId) conds.push(sql`p.category_id = ${filters.categoryId}`);
  if (filters.productType) conds.push(sql`p.product_type = ${filters.productType}`);
  if (filters.grade) conds.push(sql`gr.health_grade = ${filters.grade}`);

  const rows = db.all(sql`
    SELECT p.food_code AS foodCode, p.name AS name, p.manufacturer AS manufacturer,
           p.product_type AS productType, p.category_id AS categoryId,
           cc.name AS categoryName, gr.gradable AS gradable,
           gr.health_grade AS healthGrade, gr.health_score AS healthScore
    FROM product_fts
    JOIN product p ON p.food_code = product_fts.food_code
    LEFT JOIN grade_result gr ON gr.food_code = p.food_code
    LEFT JOIN consumer_category cc ON cc.id = p.category_id
    WHERE ${sql.join(conds, sql` AND `)}
    ORDER BY product_fts.rank
    LIMIT ${filters.limit ?? 100}
  `) as RawCard[];

  return rows.map((r) => ({ ...r, gradable: r.gradable === 1 }));
}

// leftJoin grade_result so ungradable products still appear (shown as "등급 미산출").
function searchProductsLike(db: Db, filters: ProductSearchFilters): ProductCard[] {
  const conditions = [];
  if (filters.q) conditions.push(sql`${product.name} LIKE ${`%${escapeLike(filters.q)}%`} ESCAPE '\\'`);
  if (filters.categoryId) conditions.push(eq(product.categoryId, filters.categoryId));
  if (filters.productType) conditions.push(eq(product.productType, filters.productType));
  if (filters.grade) conditions.push(eq(gradeResult.healthGrade, filters.grade));

  const rows = db
    .select({
      foodCode: product.foodCode,
      name: product.name,
      manufacturer: product.manufacturer,
      productType: product.productType,
      categoryId: product.categoryId,
      categoryName: consumerCategory.name,
      gradable: gradeResult.gradable,
      healthGrade: gradeResult.healthGrade,
      healthScore: gradeResult.healthScore,
    })
    .from(product)
    .leftJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .leftJoin(consumerCategory, eq(product.categoryId, consumerCategory.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(product.name))
    .limit(filters.limit ?? 100)
    .all();

  return rows.map((r) => ({ ...r, gradable: r.gradable === 1 }));
}

export interface ProductDetail {
  product: typeof product.$inferSelect;
  nutrient: typeof productNutrient.$inferSelect | null;
  grade: typeof gradeResult.$inferSelect | null;
  categoryName: string | null;
  rank: number | null;
  categoryTotal: number;
}

// §4.2 product detail: product ⋈ nutrient ⋈ grade + rank position in its category.
export function getProductDetail(db: Db, foodCode: string): ProductDetail | null {
  const p = db.select().from(product).where(eq(product.foodCode, foodCode)).get();
  if (!p) return null;

  const nutrient = db.select().from(productNutrient).where(eq(productNutrient.foodCode, foodCode)).get() ?? null;
  const grade = db.select().from(gradeResult).where(eq(gradeResult.foodCode, foodCode)).get() ?? null;
  const categoryName = p.categoryId
    ? (db.select({ name: consumerCategory.name }).from(consumerCategory).where(eq(consumerCategory.id, p.categoryId)).get()?.name ?? null)
    : null;

  let rank: number | null = null;
  let categoryTotal = 0;
  if (p.categoryId) {
    rank =
      db
        .select({ rank: categoryRanking.rank })
        .from(categoryRanking)
        .where(and(eq(categoryRanking.foodCode, foodCode), eq(categoryRanking.categoryId, p.categoryId)))
        .get()?.rank ?? null;
    categoryTotal =
      db.select({ c: count() }).from(categoryRanking).where(eq(categoryRanking.categoryId, p.categoryId)).get()?.c ?? 0;
  }

  return { product: p, nutrient, grade, categoryName, rank, categoryTotal };
}

export interface RankingRow {
  rank: number;
  foodCode: string;
  name: string;
  manufacturer: string | null;
  healthGrade: string | null;
  healthScore: number;
}

// §4.3 category ranking: category_ranking ⋈ product ⋈ grade, ORDER BY rank.
// grade 필터와 정렬 방향을 옵션으로 받는다. 등급이 한쪽으로 쏠린 카테고리(과자·음료는
// D·E가 대부분)에서는 1페이지만 봐서는 변별력이 드러나지 않으므로, 등급을 좁히거나
// 최하위부터 보는 경로가 필요하다.
export function getCategoryRankings(
  db: Db,
  categoryId: string,
  opts: { limit?: number; offset?: number; grade?: string; order?: "asc" | "desc" } = {},
): { rows: RankingRow[]; total: number } {
  const conditions = [eq(categoryRanking.categoryId, categoryId)];
  if (opts.grade) conditions.push(eq(gradeResult.healthGrade, opts.grade));
  const where = and(...conditions);

  const rows = db
    .select({
      rank: categoryRanking.rank,
      foodCode: categoryRanking.foodCode,
      name: product.name,
      manufacturer: product.manufacturer,
      healthGrade: gradeResult.healthGrade,
      healthScore: categoryRanking.healthScore,
    })
    .from(categoryRanking)
    .innerJoin(product, eq(categoryRanking.foodCode, product.foodCode))
    // Ranked ⇒ gradable ⇒ has a grade row; innerJoin keeps the badge non-null.
    .innerJoin(gradeResult, eq(categoryRanking.foodCode, gradeResult.foodCode))
    .where(where)
    .orderBy(opts.order === "desc" ? desc(categoryRanking.rank) : asc(categoryRanking.rank))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)
    .all();

  // 총계도 같은 조건을 타야 페이지 수가 어긋나지 않는다. 순위 행은 항상 gradable이라
  // innerJoin이 행을 줄이지 않는다.
  const total =
    db
      .select({ c: count() })
      .from(categoryRanking)
      .innerJoin(gradeResult, eq(categoryRanking.foodCode, gradeResult.foodCode))
      .where(where)
      .get()?.c ?? 0;

  return { rows, total };
}

export interface OverviewStats {
  totalProducts: number;
  gradableCount: number;
  // 전체 등급 분포 (gradable만). 홈에서 A~E 색 축과 쏠림을 한 번에 보여준다.
  distribution: { grade: string; count: number }[];
  // categoryId → grade → count. 카테고리 카드의 미니 분포 막대에 쓴다.
  byCategory: Record<string, Record<string, number>>;
}

// 홈 화면용 전체 집계. 카테고리 이름·순서는 시드(폐쇄 목록)를 단일 출처로 쓰므로
// 여기서는 개수만 돌려주고 표시는 호출부가 시드와 합친다.
export function getOverviewStats(db: Db): OverviewStats {
  const totalProducts = db.select({ c: count() }).from(product).get()?.c ?? 0;

  const distRows = db
    .select({ grade: gradeResult.healthGrade, c: count() })
    .from(gradeResult)
    .where(eq(gradeResult.gradable, 1))
    .groupBy(gradeResult.healthGrade)
    .all();

  const distribution = distRows
    .filter((r): r is { grade: string; c: number } => r.grade !== null)
    .map((r) => ({ grade: r.grade, count: r.c }));
  const gradableCount = distribution.reduce((s, d) => s + d.count, 0);

  const perCategory = db
    .select({ categoryId: product.categoryId, grade: gradeResult.healthGrade, c: count() })
    .from(product)
    .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .where(eq(gradeResult.gradable, 1))
    .groupBy(product.categoryId, gradeResult.healthGrade)
    .all();

  const byCategory: Record<string, Record<string, number>> = {};
  for (const row of perCategory) {
    if (!row.categoryId || !row.grade) continue;
    (byCategory[row.categoryId] ??= {})[row.grade] = row.c;
  }

  return { totalProducts, gradableCount, distribution, byCategory };
}

export interface CategoryComparisonRow {
  categoryId: string;
  snapshotDate: string;
  productCount: number | null;
  avgHealthScore: number | null;
  avgSugarsG: number | null;
  avgSodiumMg: number | null;
  avgSatfatG: number | null;
  distribution: Record<string, number>;
  // D·E 비율(%) — "어느 카테고리가 더 나쁜가"를 한 숫자로 비교하기 위한 파생값.
  worstShare: number | null;
  // 카테고리 내 건강 점수 최저/최고 (category_ranking 기준). 같은 카테고리 안에서도
  // 선택에 따라 점수가 이만큼 벌어진다는 H3 근거. 순위 데이터가 없으면 NULL.
  minHealthScore: number | null;
  maxHealthScore: number | null;
}

// 카테고리 비교: 카테고리마다 가장 최근 집계 스냅샷 한 행씩. 실시간 계산 없이
// category_agg_snapshot만 읽는다(ADR-0004). 적재가 진행 중이면 카테고리별로 최신
// 스냅샷 일자가 다를 수 있어 snapshotDate를 함께 돌려준다.
export function getCategoryComparison(db: Db): CategoryComparisonRow[] {
  // 점수 범위(min/max)는 스냅샷에 없어 category_ranking에서 뽑아 category_id로 합친다.
  // 순위가 아직 없는 카테고리도 스냅샷 행은 남기도록 LEFT JOIN.
  const rows = db.all(sql`
    SELECT s.category_id     AS categoryId,
           s.snapshot_date   AS snapshotDate,
           s.product_count   AS productCount,
           s.avg_health_score AS avgHealthScore,
           s.avg_sugars_g    AS avgSugarsG,
           s.avg_sodium_mg   AS avgSodiumMg,
           s.avg_satfat_g    AS avgSatfatG,
           s.grade_a AS a, s.grade_b AS b, s.grade_c AS c, s.grade_d AS d, s.grade_e AS e,
           r.min_score AS minHealthScore, r.max_score AS maxHealthScore
    FROM category_agg_snapshot s
    JOIN (
      SELECT category_id, MAX(snapshot_date) AS latest
      FROM category_agg_snapshot
      GROUP BY category_id
    ) m ON m.category_id = s.category_id AND m.latest = s.snapshot_date
    LEFT JOIN (
      SELECT category_id, MIN(health_score) AS min_score, MAX(health_score) AS max_score
      FROM category_ranking
      GROUP BY category_id
    ) r ON r.category_id = s.category_id
  `) as (Omit<CategoryComparisonRow, "distribution" | "worstShare"> & {
    a: number | null;
    b: number | null;
    c: number | null;
    d: number | null;
    e: number | null;
  })[];

  return rows.map((r) => {
    const distribution: Record<string, number> = {
      A: r.a ?? 0,
      B: r.b ?? 0,
      C: r.c ?? 0,
      D: r.d ?? 0,
      E: r.e ?? 0,
    };
    const graded = Object.values(distribution).reduce((s, n) => s + n, 0);
    return {
      categoryId: r.categoryId,
      snapshotDate: r.snapshotDate,
      productCount: r.productCount,
      avgHealthScore: r.avgHealthScore,
      avgSugarsG: r.avgSugarsG,
      avgSodiumMg: r.avgSodiumMg,
      avgSatfatG: r.avgSatfatG,
      distribution,
      worstShare: graded > 0 ? ((distribution.D + distribution.E) / graded) * 100 : null,
      minHealthScore: r.minHealthScore,
      maxHealthScore: r.maxHealthScore,
    };
  });
}

// 카테고리 내 건강 점수 범위(최저~최고). category_ranking만 읽어 MIN/MAX로 집계한다
// (ADR-0004: 사전계산 테이블에 대한 요청 시점 집계는 허용). 순위 데이터가 없으면 NULL.
export function getCategoryScoreRange(db: Db, categoryId: string): { min: number; max: number } | null {
  const row = db.get(sql`
    SELECT MIN(health_score) AS min, MAX(health_score) AS max
    FROM category_ranking
    WHERE category_id = ${categoryId}
  `) as { min: number | null; max: number | null } | undefined;
  if (!row || row.min === null || row.max === null) return null;
  return { min: row.min, max: row.max };
}

// H4 상관표에 쓰는 4성분. key는 product_nutrient 컬럼, label은 화면 표기.
export type NutrientKey = "sugars" | "sodium" | "satfat" | "energy";

export interface NutrientCorrelation {
  key: NutrientKey;
  // 성분값–건강 점수 표본. 성분/점수 어느 하나라도 NULL이면 제외(§4.4).
  points: { x: number; y: number }[];
}

export interface CategoryAnalytics {
  distribution: { grade: string; count: number }[];
  gradableCount: number;
  // 당류/나트륨/포화지방/에너지 각각의 (성분값, 점수) 표본. NULL 제외.
  nutrientCorrelations: NutrientCorrelation[];
  trend: (typeof categoryAggSnapshot.$inferSelect)[];
}

// §4.4 dashboard: grade distribution, per-nutrient↔score points (for correlation,
// NULL excluded), and the agg-snapshot trend history.
export function getCategoryAnalytics(db: Db, categoryId: string): CategoryAnalytics {
  const distRows = db
    .select({ grade: gradeResult.healthGrade, c: count() })
    .from(product)
    .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .where(and(eq(product.categoryId, categoryId), eq(gradeResult.gradable, 1)))
    .groupBy(gradeResult.healthGrade)
    .all();

  const distribution = distRows
    .filter((r): r is { grade: string; c: number } => r.grade !== null)
    .map((r) => ({ grade: r.grade, count: r.c }));
  const gradableCount = distribution.reduce((s, d) => s + d.count, 0);

  const points = db
    .select({
      sugars: productNutrient.sugarsG,
      sodium: productNutrient.sodiumMg,
      satfat: productNutrient.satfatG,
      energy: productNutrient.energyKcal,
      score: gradeResult.healthScore,
    })
    .from(product)
    .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .leftJoin(productNutrient, eq(product.foodCode, productNutrient.foodCode))
    .where(and(eq(product.categoryId, categoryId), eq(gradeResult.gradable, 1)))
    .all();

  // 성분마다 독립적으로 NULL을 걸러 표본을 만든다 — 나트륨만 미측정인 제품도
  // 당류 상관에는 남아야 하므로 성분별로 따로 필터링한다.
  const nutrientCorrelations: NutrientCorrelation[] = (["sugars", "sodium", "satfat", "energy"] as const).map(
    (key) => ({
      key,
      points: points
        .filter((p) => p[key] !== null && p.score !== null)
        .map((p) => ({ x: p[key] as number, y: p.score as number })),
    }),
  );

  const trend = db
    .select()
    .from(categoryAggSnapshot)
    .where(eq(categoryAggSnapshot.categoryId, categoryId))
    .orderBy(desc(categoryAggSnapshot.snapshotDate))
    .all();

  return { distribution, gradableCount, nutrientCorrelations, trend };
}
