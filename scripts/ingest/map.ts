// Category mapping + v1 filter (.omc/plans/data-pipeline-spec.md §6; data-model §4).
//
// Anchor levels (adapted to the real 15100066 taxonomy, 2026-07-07): the consumer
// category is discriminated by 식품유형 = foodLv4 (stored in mfdsL2), because the
// finer foodLv5–7 levels are frequently "해당없음". So the PRIMARY anchor is
// 식품유형 (mfdsL2, level='detail') and the FALLBACK is 군 = foodLv3 (mfdsL1,
// level='sub'). (data-model §4 assumed 세분류/소분류 anchors before the live
// taxonomy was known; this is the corrected mapping.) Unmapped products (음료·과자
// 밖) are filtered out, and their 식품유형 is reported for the next curation round.
import { eq } from "drizzle-orm";
import { consumerCategory, mfdsCategoryMap } from "@/db/schema";
import type { Db } from "./persist";
import type { NormalizedPair } from "./source";

// 소비자 카테고리가 제품유형의 권위다. CONTEXT.md는 음료를 "액체로 섭취하는
// 제품유형"으로 정의하고 기준량 100ml은 그 결과인데, 기준량 문자열에서 제품유형을
// 역산하면(parseProductType) 인과가 뒤집힌다. 실제로 원천에는 100g으로 표기된
// 주스가 다수 있어(주스의 19.6%), 그것만으로 고형식품 컷오프가 적용돼 같은 점수에
// 다른 등급이 나왔다(ADR-0003 위반). 카테고리가 정해지면 그 카테고리의 제품유형을
// 따르고, 기준량 표기는 reference_raw에 원본 그대로 보존한다.
export interface CategoryAssignment {
  categoryId: string;
  productType: string; // 'beverage' | 'solid'
}

// In-memory lookup keyed by `${level}:${code}` → 카테고리 배정, loaded once per run.
export type CategoryLookup = ReadonlyMap<string, CategoryAssignment>;

export function loadCategoryMap(db: Db): CategoryLookup {
  const rows = db
    .select({
      level: mfdsCategoryMap.mfdsLevel,
      code: mfdsCategoryMap.mfdsCode,
      categoryId: mfdsCategoryMap.categoryId,
      productType: consumerCategory.productType,
    })
    .from(mfdsCategoryMap)
    // 매핑이 가리키는 카테고리가 시드에 없으면 그 규칙은 무효 — innerJoin이 걸러낸다.
    .innerJoin(consumerCategory, eq(mfdsCategoryMap.categoryId, consumerCategory.id))
    .all();
  const map = new Map<string, CategoryAssignment>();
  for (const r of rows) map.set(`${r.level}:${r.code}`, { categoryId: r.categoryId, productType: r.productType });
  return map;
}

// Resolve a product's consumer category: 식품유형(detail) anchor first, then
// 군(sub) fallback.
export function categoryFor(pair: NormalizedPair, lookup: CategoryLookup): CategoryAssignment | null {
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
    const assignment = categoryFor(pair, lookup);
    if (assignment !== null) {
      // 제품유형은 카테고리를 따른다(기준량 표기가 아니라). reference_raw는 그대로 둔다.
      mapped.push({
        ...pair,
        product: { ...pair.product, categoryId: assignment.categoryId, productType: assignment.productType },
      });
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
