// Regrade: recompute grades/rankings/aggregates from the EXISTING DB snapshot,
// with no re-ingest. Use it when only the grading logic changed (e.g. rationale
// now carries 가점 성분) and the collected product/product_nutrient data is still
// current. Reuses the pipeline's grade (§9), rank (§10) and aggregate (§12) steps
// and the same atomic-swap discipline as swapAndRecompute (§7): grade_result and
// category_ranking are replaced in one transaction so app readers never observe a
// product without its grade. product/product_nutrient are left untouched — this
// is a re-derivation of pre-computed tables, not a data load.
//
// Run with: pnpm regrade (tsx scripts/regrade/index.ts).
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { getWriteDb } from "@/db/client";
import {
  categoryAggSnapshot,
  categoryRanking,
  gradeResult,
  product,
  productNutrient,
} from "@/db/schema";
import { type Db, snapshotAgg, toGradeResult } from "@/scripts/ingest/persist";
import { computeCategoryRankings } from "@/scripts/ingest/rank";
import type { NormalizedPair } from "@/scripts/ingest/source";

export interface RegradeResult {
  productCount: number;
  gradableCount: number;
  snapshotDate: string;
}

// Reload the current product/nutrient snapshot from the DB as NormalizedPairs so
// the pipeline's toGradeResult can score them exactly as an ingest run would.
function loadPairs(db: Db): NormalizedPair[] {
  const productRows = db.select().from(product).all();
  const nutrientRows = db.select().from(productNutrient).all();
  const nutrientByCode = new Map(nutrientRows.map((n) => [n.foodCode, n]));
  return productRows.map((p) => ({
    product: p,
    // 영양행이 없으면(정상 파이프라인에선 없어야 함) 전부 미측정으로 두면 ungradable.
    nutrient:
      nutrientByCode.get(p.foodCode) ?? {
        foodCode: p.foodCode,
        energyKcal: null,
        sugarsG: null,
        satfatG: null,
        sodiumMg: null,
        fiberG: null,
        proteinG: null,
      },
  }));
}

// Latest existing snapshot date — regrade re-derives the same dataset, so it
// updates that snapshot in place (upsert by date+category in snapshotAgg) rather
// than inventing a new trend point. Falls back to `todayDate` if there is none.
function latestSnapshotDate(db: Db, todayDate: string): string {
  const rows = db.select({ d: categoryAggSnapshot.snapshotDate }).from(categoryAggSnapshot).all();
  const latest = rows.map((r) => r.d).sort().at(-1);
  return latest ?? todayDate;
}

export function regradeInPlace(db: Db, computedAt: string, snapshotDate: string): RegradeResult {
  const pairs = loadPairs(db);

  // Grade in memory (§9); collect rankable (gradable + categorised + scored).
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

  const rankInserts: {
    categoryId: string;
    foodCode: string;
    rank: number;
    healthScore: number;
    computedAt: string;
  }[] = [];
  for (const [categoryId, items] of rankableByCategory) {
    for (const r of computeCategoryRankings(categoryId, items)) rankInserts.push({ ...r, computedAt });
  }

  // §7 atomicity: replace ONLY the derived tables (grade_result, category_ranking).
  // product/product_nutrient and the FTS index stay as they are — no data changed.
  db.transaction((tx) => {
    tx.delete(categoryRanking).run();
    tx.delete(gradeResult).run();
    for (const part of chunk(gradeRows, 100)) tx.insert(gradeResult).values(part).run();
    for (const part of chunk(rankInserts, 100)) tx.insert(categoryRanking).values(part).run();
  });

  // §12: refresh the aggregate snapshot from the freshly committed grade_result.
  snapshotAgg(db, snapshotDate);

  return { productCount: pairs.length, gradableCount, snapshotDate };
}

// SQLite caps bound variables (~999); chunk multi-row inserts to stay under it.
function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function main() {
  const now = new Date();
  const computedAt = now.toISOString();
  const todayDate = computedAt.slice(0, 10);

  const db = getWriteDb();
  const snapshotDate = latestSnapshotDate(db, todayDate);
  const result = regradeInPlace(db, computedAt, snapshotDate);

  // Grade distribution over the recomputed grade_result — the headline check that
  // scores/grades did not move (가점은 이미 점수에 반영돼 있어 재계산으로 바뀌면 안 됨).
  const dist = db
    .select({ grade: gradeResult.healthGrade, c: sql<number>`count(*)` })
    .from(gradeResult)
    .where(sql`${gradeResult.gradable} = 1`)
    .groupBy(gradeResult.healthGrade)
    .all();
  const distribution = Object.fromEntries(dist.map((r) => [r.grade, r.c]));

  console.log(
    JSON.stringify({ ...result, distribution }, null, 2),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
