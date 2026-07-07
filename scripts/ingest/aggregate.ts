// Category aggregate snapshot (.omc/plans/data-pipeline-spec.md §12; mvp-scope §7).
// One row per category per run feeds the dashboard trend history. Averages are
// taken over measured values only (NULL excluded) so 미측정 never skews a mean.
// Pure function; the orchestrator stamps snapshotDate when persisting.
import type { HealthGrade } from "@/lib/grading/types";

export interface AggInputProduct {
  gradable: boolean;
  healthScore: number | null;
  grade: HealthGrade | null;
  sugarsG: number | null;
  sodiumMg: number | null;
  satfatG: number | null;
}

export interface AggSnapshotRow {
  categoryId: string;
  productCount: number;
  avgHealthScore: number | null;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeE: number;
  avgSugarsG: number | null;
  avgSodiumMg: number | null;
  avgSatfatG: number | null;
}

export function computeAggSnapshot(
  categoryId: string,
  products: readonly AggInputProduct[],
): AggSnapshotRow {
  const gradeCounts: Record<HealthGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const p of products) {
    if (p.grade !== null) gradeCounts[p.grade] += 1;
  }

  return {
    categoryId,
    productCount: products.length,
    // Health-score average over gradable products only.
    avgHealthScore: mean(products.filter((p) => p.gradable).map((p) => p.healthScore)),
    gradeA: gradeCounts.A,
    gradeB: gradeCounts.B,
    gradeC: gradeCounts.C,
    gradeD: gradeCounts.D,
    gradeE: gradeCounts.E,
    avgSugarsG: mean(products.map((p) => p.sugarsG)),
    avgSodiumMg: mean(products.map((p) => p.sodiumMg)),
    avgSatfatG: mean(products.map((p) => p.satfatG)),
  };
}

// Arithmetic mean over non-null values; null if there are none (§8: NULL excluded).
function mean(values: readonly (number | null)[]): number | null {
  const measured = values.filter((v): v is number => v !== null);
  if (measured.length === 0) return null;
  return measured.reduce((sum, v) => sum + v, 0) / measured.length;
}
