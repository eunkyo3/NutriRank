// FetchAdapter for data.go.kr dataset 15100066 (가공식품 표준데이터), served via
// odcloud (page/perPage, JSON). Field names are the named Korean columns from the
// dataset spec (.omc/research/datagokr-15100066-api.md).
//
// ⚠️ PENDING LIVE VERIFICATION: this dataset requires a separate 활용신청; the
// current service key is not yet registered for it. On approval:
//   1. Set DATA_GO_KR_15100066_ENDPOINT to the exact `.../v1/uddi:<UUID>` shown
//      in the 활용신청 detail (two candidate UUIDs exist; confirm via live totalCount).
//   2. Fetch ONE live row and confirm the JSON key spelling below (esp. whether
//      the unit suffix like "(kcal)" is present) — adjust FIELD if needed.
//   3. Confirm the missing-value token (blank "" vs "-" vs "해당없음"); parse.ts
//      already treats all three as 미측정 NULL.
import type { FetchAdapter, FetchPage, SourceRecord } from "../source";

// odcloud JSON keys (verbatim column labels). Single source of truth — verify
// against one live row on approval, then this is the only place to adjust.
const FIELD = {
  foodCode: "식품코드",
  name: "식품명",
  manufacturer: "제조사명",
  referenceRaw: "영양성분함량기준량",
  energyKcal: "에너지(kcal)",
  sugars: "당류(g)",
  satfat: "포화지방산(g)",
  sodium: "나트륨(mg)",
  fiber: "식이섬유(g)",
  protein: "단백질(g)",
  l1Code: "식품대분류코드",
  l1Name: "식품대분류명",
  l2Code: "식품중분류코드",
  l2Name: "식품중분류명",
  l3Code: "식품소분류코드",
  l3Name: "식품소분류명",
  l4Code: "식품세분류코드",
  l4Name: "식품세분류명",
  servingRef: "1회 섭취참고량",
  dataGenDate: "데이터생성일자",
} as const;

export interface DataGoKrConfig {
  serviceKey: string;
  endpoint: string; // full odcloud base incl. uddi:<UUID>
  returnType?: string; // default "JSON"
  maxRetries?: number; // default 3 (§4 backoff)
}

type OdcloudRow = Record<string, unknown>;
interface OdcloudEnvelope {
  totalCount?: number;
  matchCount?: number;
  data?: OdcloudRow[];
}

export class DataGoKr15100066Adapter implements FetchAdapter {
  readonly name = "datagokr-15100066";

  constructor(private readonly cfg: DataGoKrConfig) {}

  async fetchPage(page: number, perPage: number): Promise<FetchPage> {
    const url = new URL(this.cfg.endpoint);
    url.searchParams.set("serviceKey", this.cfg.serviceKey);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(perPage));
    url.searchParams.set("returnType", this.cfg.returnType ?? "JSON");

    const envelope = await this.fetchJson(url);
    const totalCount = envelope.totalCount ?? envelope.matchCount ?? 0;
    const records = (envelope.data ?? []).map(mapRow);
    return { totalCount, records };
  }

  // §4 exponential backoff on transient failures; the key is never logged.
  private async fetchJson(url: URL): Promise<OdcloudEnvelope> {
    const maxRetries = this.cfg.maxRetries ?? 3;
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status} from 15100066`);
        return (await res.json()) as OdcloudEnvelope;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await delay(2 ** attempt * 500);
      }
    }
    // Redact the service key in case a future error type embeds the request URL.
    const detail = String(lastError).split(this.cfg.serviceKey).join("***");
    throw new Error(`15100066 fetch failed after ${maxRetries} retries: ${detail}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Map one odcloud row → canonical SourceRecord. Values are kept as raw strings;
// parse.ts decides NULL-vs-0. mapRow is exported for unit testing the wiring.
export function mapRow(row: OdcloudRow): SourceRecord {
  const s = (key: string): string | null => {
    const v = row[key];
    return v === undefined || v === null ? null : String(v);
  };
  return {
    foodCode: s(FIELD.foodCode) ?? "",
    name: s(FIELD.name) ?? "",
    manufacturer: s(FIELD.manufacturer),
    referenceRaw: s(FIELD.referenceRaw) ?? "",
    energyKcalRaw: s(FIELD.energyKcal),
    sugarsRaw: s(FIELD.sugars),
    satfatRaw: s(FIELD.satfat),
    sodiumRaw: s(FIELD.sodium),
    fiberRaw: s(FIELD.fiber),
    proteinRaw: s(FIELD.protein),
    mfdsL1Code: s(FIELD.l1Code),
    mfdsL1Name: s(FIELD.l1Name),
    mfdsL2Code: s(FIELD.l2Code),
    mfdsL2Name: s(FIELD.l2Name),
    mfdsL3Code: s(FIELD.l3Code),
    mfdsL3Name: s(FIELD.l3Name),
    mfdsL4Code: s(FIELD.l4Code),
    mfdsL4Name: s(FIELD.l4Name),
    servingRef: s(FIELD.servingRef),
    dataGenDate: s(FIELD.dataGenDate),
  };
}
