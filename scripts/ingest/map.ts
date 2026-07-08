// Category mapping + v1 filter (.omc/plans/data-pipeline-spec.md §6; data-model §4).
//
// Anchor levels (adapted to the real 15100066 taxonomy, 2026-07-07): the consumer
// category is discriminated by 식품유형 = foodLv4 (stored in mfdsL2), because the
// finer foodLv5–7 levels are frequently "해당없음". So the PRIMARY anchor is
// 식품유형 (mfdsL2, level='detail') and the FALLBACK is 군 = foodLv3 (mfdsL1,
// level='sub'). (data-model §4 assumed 세분류/소분류 anchors before the live
// taxonomy was known; this is the corrected mapping.) Unmapped products (음료·과자
// 밖) are filtered out, and their 식품유형 is reported for the next curation round.
import { mfdsCategoryMap } from "@/db/schema";
import type { Db } from "./persist";
import type { NormalizedPair } from "./source";

// In-memory lookup keyed by `${level}:${code}` → category_id, loaded once per run.
export type CategoryLookup = ReadonlyMap<string, string>;

export function loadCategoryMap(db: Db): CategoryLookup {
  const rows = db
    .select({ level: mfdsCategoryMap.mfdsLevel, code: mfdsCategoryMap.mfdsCode, categoryId: mfdsCategoryMap.categoryId })
    .from(mfdsCategoryMap)
    .all();
  const map = new Map<string, string>();
  for (const r of rows) map.set(`${r.level}:${r.code}`, r.categoryId);
  return map;
}

// Resolve a product's consumer category: 식품유형(detail) anchor first, then
// 군(sub) fallback.
export function categoryFor(pair: NormalizedPair, lookup: CategoryLookup): string | null {
  const { mfdsL2Code, mfdsL1Code } = pair.product;
  if (mfdsL2Code) {
    const detail = lookup.get(`detail:${mfdsL2Code}`);
    if (detail) return detail;
  }
  if (mfdsL1Code) {
    const sub = lookup.get(`sub:${mfdsL1Code}`);
    if (sub) return sub;
  }
  return null;
}

export interface UnmappedDetail {
  code: string;
  name: string | null;
  count: number;
}

export interface MapResult {
  mapped: NormalizedPair[]; // category_id assigned (v1 in-scope)
  unmapped: UnmappedDetail[]; // distinct 세분류 that found no category, for curation
  filteredOutCount: number;
}

// Apply mapping to every pair, keep the in-scope ones, tally the rest by 세분류.
export function applyCategoryMapping(pairs: readonly NormalizedPair[], lookup: CategoryLookup): MapResult {
  const mapped: NormalizedPair[] = [];
  const unmappedByCode = new Map<string, UnmappedDetail>();

  for (const pair of pairs) {
    const categoryId = categoryFor(pair, lookup);
    if (categoryId !== null) {
      mapped.push({ ...pair, product: { ...pair.product, categoryId } });
    } else {
      // Key the report by 식품유형 code (fall back to 군, then "unknown").
      const code = pair.product.mfdsL2Code ?? pair.product.mfdsL1Code ?? "unknown";
      const name = pair.product.mfdsL2Name ?? pair.product.mfdsL1Name ?? null;
      const existing = unmappedByCode.get(code);
      if (existing) existing.count += 1;
      else unmappedByCode.set(code, { code, name, count: 1 });
    }
  }

  return {
    mapped,
    unmapped: [...unmappedByCode.values()].sort((a, b) => b.count - a.count),
    filteredOutCount: pairs.length - mapped.length,
  };
}
