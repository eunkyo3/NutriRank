// Quality gate (.omc/plans/data-pipeline-spec.md §8): decides whether a staged
// snapshot may atomically swap into the live tables. Any failing check BLOCKS the
// swap so the serving tables keep the last good data (§7, §11 AC). Pure function.

export interface GateMetrics {
  collectedCount: number; // records actually fetched
  totalCount: number; // API-reported total
  loadedCount: number; // v1-filtered products staged
  previousLoadedCount: number | null; // prior live snapshot size; null on first run
  requiredFieldMissingRate: number; // 0..1 over 식품코드·식품명·기준량
  partial?: boolean; // deliberate bounded sample → skip the full-collection check
}

export interface GateConfig {
  maxDropRatio: number; // block if the snapshot shrank more than this vs previous
  maxRequiredMissingRate: number; // block if required-field missing rate exceeds this
}

// Defaults per §8 / §13 open decisions (−20% drop, 5% required-field missing).
export const DEFAULT_GATE_CONFIG: GateConfig = {
  maxDropRatio: 0.2,
  maxRequiredMissingRate: 0.05,
};

export interface GateResult {
  pass: boolean;
  reasons: string[]; // machine-readable failure codes; empty when pass
}

export function evaluateQualityGate(
  metrics: GateMetrics,
  config: GateConfig = DEFAULT_GATE_CONFIG,
): GateResult {
  const reasons: string[] = [];

  // Incomplete collection → never swap partial data (§8). Skipped for a
  // deliberate bounded sample (partial=true), which is an intentional snapshot.
  if (!metrics.partial && metrics.collectedCount !== metrics.totalCount) {
    reasons.push(
      `count_mismatch:collected=${metrics.collectedCount},total=${metrics.totalCount}`,
    );
  }

  // Sudden volume drop suggests a source anomaly (§8).
  if (metrics.previousLoadedCount !== null && metrics.previousLoadedCount > 0) {
    const drop =
      (metrics.previousLoadedCount - metrics.loadedCount) / metrics.previousLoadedCount;
    if (drop > config.maxDropRatio) {
      reasons.push(`volume_drop:${(drop * 100).toFixed(1)}%>${config.maxDropRatio * 100}%`);
    }
  }

  // Too many required fields missing → data unusable (§8).
  if (metrics.requiredFieldMissingRate > config.maxRequiredMissingRate) {
    reasons.push(
      `required_missing:${(metrics.requiredFieldMissingRate * 100).toFixed(1)}%>${config.maxRequiredMissingRate * 100}%`,
    );
  }

  return { pass: reasons.length === 0, reasons };
}
