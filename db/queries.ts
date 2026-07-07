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

// §4.1 search: name partial match + category / product-type / grade filters.
// leftJoin grade_result so ungradable products still appear (shown as "등급 미산출").
export function searchProducts(db: Db, filters: ProductSearchFilters): ProductCard[] {
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
export function getCategoryRankings(
  db: Db,
  categoryId: string,
  opts: { limit?: number; offset?: number } = {},
): { rows: RankingRow[]; total: number } {
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
    .where(eq(categoryRanking.categoryId, categoryId))
    .orderBy(asc(categoryRanking.rank))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)
    .all();

  const total =
    db.select({ c: count() }).from(categoryRanking).where(eq(categoryRanking.categoryId, categoryId)).get()?.c ?? 0;

  return { rows, total };
}

export interface CategoryAnalytics {
  distribution: { grade: string; count: number }[];
  gradableCount: number;
  correlationPoints: { x: number; y: number }[]; // sugars vs health score, NULL excluded
  trend: (typeof categoryAggSnapshot.$inferSelect)[];
}

// §4.4 dashboard: grade distribution, sugars↔score points (for correlation, NULL
// excluded), and the agg-snapshot trend history.
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
    .select({ sugars: productNutrient.sugarsG, score: gradeResult.healthScore })
    .from(product)
    .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .leftJoin(productNutrient, eq(product.foodCode, productNutrient.foodCode))
    .where(and(eq(product.categoryId, categoryId), eq(gradeResult.gradable, 1)))
    .all();

  const correlationPoints = points
    .filter((p): p is { sugars: number; score: number } => p.sugars !== null && p.score !== null)
    .map((p) => ({ x: p.sugars, y: p.score }));

  const trend = db
    .select()
    .from(categoryAggSnapshot)
    .where(eq(categoryAggSnapshot.categoryId, categoryId))
    .orderBy(desc(categoryAggSnapshot.snapshotDate))
    .all();

  return { distribution, gradableCount, correlationPoints, trend };
}
