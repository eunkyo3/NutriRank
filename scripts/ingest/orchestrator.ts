// 12-step ingest orchestrator (.omc/plans/data-pipeline-spec.md §3). Ties the
// source-agnostic pieces together: fetch → normalize → map → filter → dedup →
// stage(in-memory) → gate → atomic swap → grade → rank → report → agg. The gate
// (§8) blocks the swap, so a failing run leaves the live tables untouched (§7).
import { count } from "drizzle-orm";
import { product } from "@/db/schema";
import { type GateConfig, type GateResult, evaluateQualityGate } from "./gate";
import { applyCategoryMapping, loadCategoryMap, type UnmappedDetail } from "./map";
import { type Db, snapshotAgg, swapAndRecompute } from "./persist";
import { type QualityMetrics, computeQualityMetrics } from "./report";
import { dedupByFoodCode } from "./dedup";
import {
  type FetchAdapter,
  type NormalizedPair,
  fetchAllRecords,
  normalizeRecord,
  requiredFieldMissingRate,
} from "./source";

export interface IngestOptions {
  adapter: FetchAdapter;
  db: Db;
  ingestedAt: string; // stamped on product.ingested_at / grade computed_at
  snapshotDate: string; // category_agg_snapshot key (e.g. "2026-07-07")
  perPage?: number;
  maxPages?: number; // bound a deliberate partial/sample snapshot (relaxes count gate)
  previousLoadedCount?: number | null; // overrides the auto-read live count
  gateConfig?: GateConfig;
}

export interface IngestReport {
  source: string;
  totalCount: number;
  collectedCount: number;
  normalizedCount: number;
  mappedCount: number;
  filteredOutCount: number;
  dedupedCount: number;
  requiredFieldMissingRate: number;
  unmapped: UnmappedDetail[]; // 미매핑 세분류 (다음 큐레이션 입력, §6/§8)
  qualityMetrics: QualityMetrics; // 의심 0 비율 · 카테고리별 결측률 (§8/§11)
  gate: GateResult;
  swapped: boolean;
  gradableCount: number | null;
  gradableRate: number | null;
}

export async function runIngest(opts: IngestOptions): Promise<IngestReport> {
  const { adapter, db, ingestedAt, snapshotDate } = opts;
  const perPage = opts.perPage ?? 1000;

  // [1 fetch]
  const fetched = await fetchAllRecords(adapter, perPage, opts.maxPages);

  // [2 normalize]
  const pairs: NormalizedPair[] = fetched.records.map((r) => normalizeRecord(r, ingestedAt));

  // [3 map] + [4 filter]
  const { mapped, unmapped } = applyCategoryMapping(pairs, loadCategoryMap(db));

  // [5 dedup] keep latest 데이터생성일자 per 식품코드
  const deduped = dedupByFoodCode(
    mapped.map((p) => ({ foodCode: p.product.foodCode, dataGenDate: p.product.dataGenDate ?? null, pair: p })),
  ).map((w) => w.pair);

  // [6 stage] the deduped set is the in-memory staging area.
  const requiredMissing = requiredFieldMissingRate(fetched.records);
  const qualityMetrics = computeQualityMetrics(deduped);
  const previousLoadedCount =
    opts.previousLoadedCount !== undefined ? opts.previousLoadedCount : liveProductCount(db);

  // [7 gate]
  const gate = evaluateQualityGate(
    {
      collectedCount: fetched.collectedCount,
      totalCount: fetched.totalCount,
      loadedCount: deduped.length,
      previousLoadedCount,
      requiredFieldMissingRate: requiredMissing,
      partial: opts.maxPages != null,
    },
    opts.gateConfig,
  );

  const baseReport: IngestReport = {
    source: adapter.name,
    totalCount: fetched.totalCount,
    collectedCount: fetched.collectedCount,
    normalizedCount: pairs.length,
    mappedCount: mapped.length,
    filteredOutCount: pairs.length - mapped.length,
    dedupedCount: deduped.length,
    requiredFieldMissingRate: requiredMissing,
    unmapped,
    qualityMetrics,
    gate,
    swapped: false,
    gradableCount: null,
    gradableRate: null,
  };

  // Gate failed → do NOT swap; serving tables keep last good data (§7, §8).
  if (!gate.pass) return baseReport;

  // [8 swap] + [9 grade] + [10 rank] in one atomic transaction, then [12 agg].
  const { gradableCount } = swapAndRecompute(db, deduped, ingestedAt);
  snapshotAgg(db, snapshotDate);

  // [11 report]
  return {
    ...baseReport,
    swapped: true,
    gradableCount,
    gradableRate: deduped.length === 0 ? 0 : gradableCount / deduped.length,
  };
}

function liveProductCount(db: Db): number {
  return db.select({ c: count() }).from(product).get()?.c ?? 0;
}
