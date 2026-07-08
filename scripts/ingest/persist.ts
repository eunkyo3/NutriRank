// DB orchestration for the ingest pipeline (.omc/plans/data-pipeline-spec.md
// §7–§12). Operates on ALREADY-normalized records, so it is independent of the
// API wire schema. The product snapshot AND its derived tables (grade_result,
// category_ranking) are replaced in ONE atomic transaction (§7): grades and
// rankings are computed in memory first, so app readers never see new products
// without their grades. category_agg_snapshot is trend history, appended
// separately, never wiped by the swap.
import type { InferInsertModel } from "drizzle-orm";
import { eq, isNotNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { ALGORITHM_VERSION, gradeProduct } from "@/lib/grading";
import type { HealthGrade } from "@/lib/grading/types";
import * as schema from "@/db/schema";
import { categoryRanking, gradeResult, product, productNutrient } from "@/db/schema";
import { computeAggSnapshot } from "./aggregate";
import { computeCategoryRankings } from "./rank";
import type { NormalizedPair } from "./source";

export type Db = BetterSQLite3Database<typeof schema>;
export type NormalizedProduct = InferInsertModel<typeof product>;
export type NormalizedNutrient = InferInsertModel<typeof productNutrient>;

// SQLite caps bound variables (~999); chunk multi-row inserts to stay under it.
function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export function toGradeResult(pair: NormalizedPair, computedAt: string): InferInsertModel<typeof gradeResult> {
  const { nutrient, product: p } = pair;
  const productType =
    p.productType === "beverage" || p.productType === "solid" ? p.productType : null;
  const result = gradeProduct(
    {
      energy_kcal: nutrient.energyKcal ?? null,
      sugars_g: nutrient.sugarsG ?? null,
      satfat_g: nutrient.satfatG ?? null,
      sodium_mg: nutrient.sodiumMg ?? null,
      fiber_g: nutrient.fiberG ?? null,
      protein_g: nutrient.proteinG ?? null,
    },
    productType,
  );
  return {
    foodCode: p.foodCode,
    gradable: result.gradable ? 1 : 0,
    ungradableReason: result.gradable ? null : JSON.stringify(result.ungradableReason ?? []),
    healthScore: result.healthScore ?? null,
    healthGrade: result.grade ?? null,
    rationale: result.rationale ? JSON.stringify(result.rationale) : null,
    algorithmVersion: ALGORITHM_VERSION,
    computedAt,
  };
}

export interface SwapResult {
  gradableCount: number;
}

// §7–§10 atomic swap + recompute: grade every product and rank each category
// IN MEMORY, then replace product/nutrient/grade_result/category_ranking in a
// single transaction. A mid-swap failure rolls the whole thing back; readers
// never observe new products without grades/rankings.
export function swapAndRecompute(
  db: Db,
  pairs: readonly NormalizedPair[],
  computedAt: string,
): SwapResult {
  const products = pairs.map((p) => p.product);
  const nutrients = pairs.map((p) => p.nutrient);

  // Grade in memory; collect rankable (gradable + categorised + scored) products.
  const gradeRows = pairs.map((p) => toGradeResult(p, computedAt));
  let gradableCount = 0;
  const rankableByCategory = new Map<string, { foodCode: string; healthScore: number }[]>();
  for (let i = 0; i < pairs.length; i++) {
    const row = gradeRows[i];
    if (row.gradable === 1) gradableCount += 1;
    const categoryId = pairs[i].product.categoryId;
    if (row.gradable === 1 && row.healthScore != null && categoryId != null) {
      const list = rankableByCategory.get(categoryId) ?? [];
      list.push({ foodCode: row.foodCode, healthScore: row.healthScore });
      rankableByCategory.set(categoryId, list);
    }
  }

  const rankRows: InferInsertModel<typeof categoryRanking>[] = [];
  for (const [categoryId, items] of rankableByCategory) {
    for (const r of computeCategoryRankings(categoryId, items)) rankRows.push({ ...r, computedAt });
  }

  db.transaction((tx) => {
    // Delete dependents first for FK safety; agg snapshot is history, left intact.
    tx.delete(categoryRanking).run();
    tx.delete(gradeResult).run();
    tx.delete(productNutrient).run();
    tx.delete(product).run();
    for (const part of chunk(products, 100)) tx.insert(product).values(part).run();
    for (const part of chunk(nutrients, 100)) tx.insert(productNutrient).values(part).run();
    for (const part of chunk(gradeRows, 100)) tx.insert(gradeResult).values(part).run();
    for (const part of chunk(rankRows, 100)) tx.insert(categoryRanking).values(part).run();
    // Rebuild the FTS5 search index from the new snapshot (§4.1 유사어 검색).
    tx.run(sql`DELETE FROM product_fts`);
    tx.run(
      sql`INSERT INTO product_fts (food_code, name, manufacturer) SELECT food_code, name, COALESCE(manufacturer, '') FROM product`,
    );
  });

  return { gradableCount };
}

// §12 aggregate step: append one category_agg_snapshot row per category for the
// run (trend history). Reads the committed grade_result; upsert by (date,category)
// keeps same-day re-runs idempotent.
export function snapshotAgg(db: Db, snapshotDate: string): void {
  const rows = db
    .select({
      categoryId: product.categoryId,
      gradable: gradeResult.gradable,
      healthScore: gradeResult.healthScore,
      healthGrade: gradeResult.healthGrade,
      sugarsG: productNutrient.sugarsG,
      sodiumMg: productNutrient.sodiumMg,
      satfatG: productNutrient.satfatG,
    })
    .from(product)
    .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
    .leftJoin(productNutrient, eq(product.foodCode, productNutrient.foodCode))
    .where(isNotNull(product.categoryId))
    .all();

  const byCategory = new Map<string, Parameters<typeof computeAggSnapshot>[1][number][]>();
  for (const r of rows) {
    if (r.categoryId == null) continue;
    const list = byCategory.get(r.categoryId) ?? [];
    list.push({
      gradable: r.gradable === 1,
      healthScore: r.healthScore,
      grade: (r.healthGrade as HealthGrade | null) ?? null,
      sugarsG: r.sugarsG ?? null,
      sodiumMg: r.sodiumMg ?? null,
      satfatG: r.satfatG ?? null,
    });
    byCategory.set(r.categoryId, list);
  }

  db.transaction((tx) => {
    for (const [categoryId, products] of byCategory) {
      const agg = computeAggSnapshot(categoryId, products);
      const { categoryId: _omit, ...updatable } = agg;
      tx.insert(schema.categoryAggSnapshot)
        .values({ snapshotDate, ...agg })
        .onConflictDoUpdate({
          target: [schema.categoryAggSnapshot.snapshotDate, schema.categoryAggSnapshot.categoryId],
          set: updatable,
        })
        .run();
    }
  });
}
