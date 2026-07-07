// Category ranking (.omc/plans/data-pipeline-spec.md §3-10; ADR-0003): within a
// consumer category, gradable products are ordered by health score ascending
// (lower = healthier) and assigned rank 1..n with no gaps. Pure function; the
// orchestrator stamps computedAt when persisting to category_ranking.

export interface RankableProduct {
  foodCode: string;
  healthScore: number;
}

export interface RankingRow {
  categoryId: string;
  foodCode: string;
  rank: number;
  healthScore: number;
}

// Ties break by foodCode so ranks are deterministic run-to-run (idempotency, §9).
export function computeCategoryRankings(
  categoryId: string,
  products: readonly RankableProduct[],
): RankingRow[] {
  return [...products]
    .sort((a, b) => a.healthScore - b.healthScore || a.foodCode.localeCompare(b.foodCode))
    .map((product, index) => ({
      categoryId,
      foodCode: product.foodCode,
      rank: index + 1,
      healthScore: product.healthScore,
    }));
}
