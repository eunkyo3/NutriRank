// Category mapping + v1 filter (.omc/plans/data-pipeline-spec.md §6; data-model §4).
// 식품세분류코드(detail) is the primary anchor; 식품소분류코드(sub) is the fallback.
// Unmapped products (음료·과자 밖) are filtered out but their 세분류 is reported so
// it can seed the next curation round.
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

// Resolve a product's consumer category: detail anchor first, then sub fallback.
export function categoryFor(pair: NormalizedPair, lookup: CategoryLookup): string | null {
  const { mfdsL4Code, mfdsL3Code } = pair.product;
  if (mfdsL4Code) {
    const detail = lookup.get(`detail:${mfdsL4Code}`);
    if (detail) return detail;
  }
  if (mfdsL3Code) {
    const sub = lookup.get(`sub:${mfdsL3Code}`);
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
      // Key the report by 세분류 code (fall back to 소분류, then "unknown").
      const code = pair.product.mfdsL4Code ?? pair.product.mfdsL3Code ?? "unknown";
      const name = pair.product.mfdsL4Name ?? pair.product.mfdsL3Name ?? null;
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
