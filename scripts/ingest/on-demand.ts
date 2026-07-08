// On-demand "search cache" (사용자 결정: 전량 적재 대신, 검색 미스 시 API에서
// 완전일치로 가져와 즉시 DB에 저장). This is a DELIBERATE, documented exception to
// ADR-0004's read-only serving path — the write happens on a search request, not a
// batch. API calls only fire on a local miss, so it self-limits to actual demand
// and stays within the public-portal daily quota.
import { and, eq, sql } from "drizzle-orm";
import { getWriteDb } from "@/db/client";
import { categoryRanking, gradeResult, product, productNutrient } from "@/db/schema";
import { DataGoKr15100066Adapter } from "./adapters/datagokr-15100066";
import { dedupByFoodCode } from "./dedup";
import { loadCategoryMap, categoryFor } from "./map";
import { type Db, toGradeResult } from "./persist";
import { computeCategoryRankings } from "./rank";
import { type NormalizedPair, type SourceRecord, normalizeRecord } from "./source";

// Anything that can fetch source records by exact name (the real adapter, or a
// test fixture). Keeps fetchAndCacheByName decoupled from the concrete adapter.
export interface NameFetcher {
  fetchByName(name: string): Promise<SourceRecord[]>;
}

// Upsert products + nutrients + grades (and keep the FTS index in sync) without
// wiping the snapshot. Returns the set of categories that changed (to re-rank).
export function upsertGradedProducts(
  db: Db,
  pairs: readonly NormalizedPair[],
  computedAt: string,
): Set<string> {
  const categories = new Set<string>();
  db.transaction((tx) => {
    for (const pair of pairs) {
      const p = pair.product;
      const n = pair.nutrient;
      tx.insert(product).values(p).onConflictDoUpdate({ target: product.foodCode, set: p }).run();
      tx.insert(productNutrient).values(n).onConflictDoUpdate({ target: productNutrient.foodCode, set: n }).run();
      const g = toGradeResult(pair, computedAt);
      tx.insert(gradeResult).values(g).onConflictDoUpdate({ target: gradeResult.foodCode, set: g }).run();
      // FTS5 has no UPSERT; replace this row's index entry.
      tx.run(sql`DELETE FROM product_fts WHERE food_code = ${p.foodCode}`);
      tx.run(sql`INSERT INTO product_fts (food_code, name, manufacturer) VALUES (${p.foodCode}, ${p.name}, ${p.manufacturer ?? ""})`);
      if (p.categoryId) categories.add(p.categoryId);
    }
  });
  return categories;
}

// Recompute category_ranking for just the affected categories so a newly cached
// product appears at its correct rank (§10, ADR-0003).
export function reRankCategories(db: Db, categoryIds: Iterable<string>, computedAt: string): void {
  for (const categoryId of categoryIds) {
    const rows = db
      .select({ foodCode: product.foodCode, healthScore: gradeResult.healthScore })
      .from(product)
      .innerJoin(gradeResult, eq(product.foodCode, gradeResult.foodCode))
      .where(and(eq(product.categoryId, categoryId), eq(gradeResult.gradable, 1)))
      .all();
    const ranked = computeCategoryRankings(
      categoryId,
      rows.filter((r): r is { foodCode: string; healthScore: number } => r.healthScore != null),
    ).map((r) => ({ ...r, computedAt }));
    db.transaction((tx) => {
      tx.delete(categoryRanking).where(eq(categoryRanking.categoryId, categoryId)).run();
      for (const r of ranked) tx.insert(categoryRanking).values(r).run();
    });
  }
}

// Fetch products matching an exact 식품명 from the API, grade them, and upsert into
// the DB. Returns how many in-scope (음료·과자) products were cached.
export async function fetchAndCacheByName(
  db: Db,
  adapter: NameFetcher,
  name: string,
  computedAt: string,
): Promise<number> {
  const records = await adapter.fetchByName(name);
  if (records.length === 0) return 0;

  const lookup = loadCategoryMap(db);
  const mapped: NormalizedPair[] = [];
  for (const r of records) {
    const pair = normalizeRecord(r, computedAt);
    const categoryId = categoryFor(pair, lookup);
    if (categoryId !== null) mapped.push({ ...pair, product: { ...pair.product, categoryId } });
  }
  if (mapped.length === 0) return 0;

  const deduped = dedupByFoodCode(
    mapped.map((p) => ({ foodCode: p.product.foodCode, dataGenDate: p.product.dataGenDate ?? null, pair: p })),
  ).map((w) => w.pair);

  const categories = upsertGradedProducts(db, deduped, computedAt);
  reRankCategories(db, categories, computedAt);
  return deduped.length;
}

// App-facing entry (called from the search page on a local miss). Env-guarded and
// fully error-safe: a missing key or an API/DB failure returns 0 and never breaks
// search. Only the exact typed name is looked up (the API supports exact match only).
export async function cacheProductsForQuery(query: string): Promise<number> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const endpoint = process.env.DATA_GO_KR_15100066_ENDPOINT;
  if (!serviceKey || !endpoint) return 0;
  const name = query.trim();
  if (name.length < 2) return 0;
  try {
    const db = getWriteDb();
    const adapter = new DataGoKr15100066Adapter({ serviceKey, endpoint });
    return await fetchAndCacheByName(db, adapter, name, new Date().toISOString());
  } catch {
    return 0;
  }
}
