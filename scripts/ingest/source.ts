// Source abstraction for the ingest pipeline (.omc/plans/data-pipeline-spec.md
// §4–§5). A FetchAdapter isolates the source-specific wire format (field names,
// paging) behind a canonical SourceRecord, so the rest of the pipeline —
// normalization, mapping, gate, swap, grading — is source-agnostic. Swapping
// data.go.kr datasets (e.g. 15100066 vs 1471000) means writing one adapter.
import { parseNullableText, parseNutrientValue } from "./parse";
import { parseProductType } from "@/lib/grading/product-type";
import type { NormalizedNutrient, NormalizedProduct } from "./persist";

// Canonical record a source adapter yields: strings exactly as the source
// provides them (unparsed), field-mapped to our names. Normalization (NULL vs 0,
// product type) happens in normalizeRecord so it stays source-independent.
export interface SourceRecord {
  foodCode: string;
  name: string;
  manufacturer: string | null;
  referenceRaw: string; // 영양성분함량기준량, e.g. "100g" / "100ml"
  energyKcalRaw: string | null;
  sugarsRaw: string | null;
  satfatRaw: string | null;
  sodiumRaw: string | null;
  fiberRaw: string | null;
  proteinRaw: string | null;
  mfdsL1Code: string | null;
  mfdsL1Name: string | null;
  mfdsL2Code: string | null;
  mfdsL2Name: string | null;
  mfdsL3Code: string | null; // 식품소분류코드 (sub, fallback anchor)
  mfdsL3Name: string | null;
  mfdsL4Code: string | null; // 식품세분류코드 (detail, primary anchor)
  mfdsL4Name: string | null;
  servingRef: string | null; // 1회 섭취참고량
  dataGenDate: string | null; // 데이터생성일자
}

export interface FetchPage {
  totalCount: number;
  records: SourceRecord[];
}

// A data source. fetchPage returns one page plus the grand total so the loop can
// verify it collected everything (§8 count gate).
export interface FetchAdapter {
  readonly name: string;
  fetchPage(page: number, perPage: number): Promise<FetchPage>;
}

export interface FetchAllResult {
  totalCount: number;
  collectedCount: number;
  records: SourceRecord[];
}

// §4 pagination: walk every page until we have totalCount records. `maxPages`
// caps a deliberate partial/sample collection (a bounded snapshot for demos or
// live verification) — the orchestrator then relaxes the count gate (§8) for it.
export async function fetchAllRecords(
  adapter: FetchAdapter,
  perPage = 1000,
  maxPages?: number,
): Promise<FetchAllResult> {
  const first = await adapter.fetchPage(1, perPage);
  const totalCount = first.totalCount;
  const records = [...first.records];
  let totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (maxPages != null) totalPages = Math.min(totalPages, maxPages);
  for (let page = 2; page <= totalPages; page++) {
    const next = await adapter.fetchPage(page, perPage);
    records.push(...next.records);
  }
  return { totalCount, collectedCount: records.length, records };
}

export interface NormalizedPair {
  product: NormalizedProduct;
  nutrient: NormalizedNutrient;
}

// §5 normalization: parse a source record into product + nutrient rows.
// Preserves 미측정 NULL vs measured 0; derives product type from 기준량; leaves
// categoryId null (the map step fills it). Manufacturer/분류명 "해당없음" → NULL.
export function normalizeRecord(src: SourceRecord, ingestedAt: string): NormalizedPair {
  return {
    product: {
      foodCode: src.foodCode,
      name: src.name,
      manufacturer: parseNullableText(src.manufacturer),
      referenceRaw: src.referenceRaw,
      productType: parseProductType(src.referenceRaw),
      categoryId: null,
      mfdsL1Code: parseNullableText(src.mfdsL1Code),
      mfdsL1Name: parseNullableText(src.mfdsL1Name),
      mfdsL2Code: parseNullableText(src.mfdsL2Code),
      mfdsL2Name: parseNullableText(src.mfdsL2Name),
      mfdsL3Code: parseNullableText(src.mfdsL3Code),
      mfdsL3Name: parseNullableText(src.mfdsL3Name),
      mfdsL4Code: parseNullableText(src.mfdsL4Code),
      mfdsL4Name: parseNullableText(src.mfdsL4Name),
      servingRef: parseNullableText(src.servingRef),
      dataGenDate: parseNullableText(src.dataGenDate),
      ingestedAt,
    },
    nutrient: {
      foodCode: src.foodCode,
      energyKcal: parseNutrientValue(src.energyKcalRaw),
      sugarsG: parseNutrientValue(src.sugarsRaw),
      satfatG: parseNutrientValue(src.satfatRaw),
      sodiumMg: parseNutrientValue(src.sodiumRaw),
      fiberG: parseNutrientValue(src.fiberRaw),
      proteinG: parseNutrientValue(src.proteinRaw),
    },
  };
}

// §8 required-field missing rate over 식품코드·식품명·기준량 (blank → missing).
export function requiredFieldMissingRate(records: readonly SourceRecord[]): number {
  if (records.length === 0) return 0;
  const missing = records.filter(
    (r) =>
      parseNullableText(r.foodCode) === null ||
      parseNullableText(r.name) === null ||
      parseNullableText(r.referenceRaw) === null,
  ).length;
  return missing / records.length;
}
