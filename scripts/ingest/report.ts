// Data-quality metrics for the per-run report (.omc/plans/data-pipeline-spec.md
// §8, §11 AC). Two spec-required monitors beyond simple counts:
//   - 의심 0 비율 (suspicious-zero rate): share of measured 0 among the negative-4
//     nutrients. High rates hint the source stored 미측정 as 0, which would inflate
//     grades — the documented mitigation for §12's core NULL-vs-0 risk.
//   - 카테고리별 결측률: share of products per category missing any negative-4
//     nutrient (i.e. ungradable for a measurement reason).
import type { NormalizedPair } from "./source";

export interface CategoryMissingRate {
  categoryId: string;
  productCount: number;
  missingRate: number; // 0..1
}

export interface QualityMetrics {
  suspiciousZeroRate: number; // 0..1 over all measured negative-4 values
  categoryMissingRates: CategoryMissingRate[];
}

const NEGATIVE_4 = ["energyKcal", "sugarsG", "satfatG", "sodiumMg"] as const;

function negativeValues(pair: NormalizedPair): (number | null)[] {
  return NEGATIVE_4.map((k) => pair.nutrient[k] ?? null);
}

export function computeQualityMetrics(pairs: readonly NormalizedPair[]): QualityMetrics {
  // Suspicious-zero: among measured (non-null) negative-4 values, how many are 0.
  let measured = 0;
  let zeros = 0;
  for (const pair of pairs) {
    for (const v of negativeValues(pair)) {
      if (v === null) continue;
      measured += 1;
      if (v === 0) zeros += 1;
    }
  }

  // Per-category missing rate: product has any negative-4 nutrient null.
  const byCategory = new Map<string, { count: number; missing: number }>();
  for (const pair of pairs) {
    const categoryId = pair.product.categoryId;
    if (categoryId == null) continue;
    const bucket = byCategory.get(categoryId) ?? { count: 0, missing: 0 };
    bucket.count += 1;
    if (negativeValues(pair).some((v) => v === null)) bucket.missing += 1;
    byCategory.set(categoryId, bucket);
  }

  return {
    suspiciousZeroRate: measured === 0 ? 0 : zeros / measured,
    categoryMissingRates: [...byCategory.entries()]
      .map(([categoryId, b]) => ({ categoryId, productCount: b.count, missingRate: b.missing / b.count }))
      .sort((a, b) => b.missingRate - a.missingRate),
  };
}
