// FetchAdapter for data.go.kr dataset 15100066 (전국통합식품영양성분정보 가공식품
// 표준데이터), served via the standard-data OpenAPI
// `https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api`.
// Envelope: { response: { header:{resultCode}, body:{ totalCount, numOfRows, items:[...] } } }.
// Params: serviceKey, pageNo, numOfRows, type=json. Field names are the API's
// camelCase codes (verified live 2026-07-07). Missing values arrive as "" and
// text sentinels as "해당없음" — parse.ts treats both as 미측정 NULL.
//
// Classification: the API exposes foodLv3(군) … foodLv7. The consumer-category
// discriminator is 식품유형 = foodLv4 (foodLv5–7 are frequently "해당없음"), so
// foodLv3→mfdsL1(군), foodLv4→mfdsL2(식품유형) are the mapping anchors (see map.ts).
import type { FetchAdapter, FetchPage, SourceRecord } from "../source";

// API JSON keys (verified against a live row).
const FIELD = {
  foodCode: "foodCd",
  name: "foodNm",
  manufacturer: "mfrNm",
  referenceRaw: "nutConSrtrQua", // 영양성분함량기준량 e.g. "100g" / "100ml"
  energyKcal: "enerc",
  sugars: "sugar",
  satfat: "fasat",
  sodium: "nat",
  fiber: "fibtg",
  protein: "prot",
  lv3Code: "foodLv3Cd",
  lv3Name: "foodLv3Nm", // 군 (대분류)
  lv4Code: "foodLv4Cd",
  lv4Name: "foodLv4Nm", // 식품유형 (매핑 앵커)
  lv5Code: "foodLv5Cd",
  lv5Name: "foodLv5Nm",
  lv6Code: "foodLv6Cd",
  lv6Name: "foodLv6Nm",
  servingRef: "servSize", // 1회 섭취참고량
  dataGenDate: "crtYmd", // 데이터생성일자
} as const;

export interface DataGoKrConfig {
  serviceKey: string;
  endpoint: string;
  maxRetries?: number; // default 3 (§4 backoff)
}

type Row = Record<string, unknown>;
interface Envelope {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { totalCount?: number; numOfRows?: number; items?: Row[] };
  };
}

export class DataGoKr15100066Adapter implements FetchAdapter {
  readonly name = "datagokr-15100066";

  constructor(private readonly cfg: DataGoKrConfig) {}

  async fetchPage(page: number, perPage: number): Promise<FetchPage> {
    const url = new URL(this.cfg.endpoint);
    url.searchParams.set("serviceKey", this.cfg.serviceKey);
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", String(perPage));
    url.searchParams.set("type", "json");

    const env = await this.fetchJson(url);
    const header = env.response?.header;
    if (header?.resultCode && header.resultCode !== "00") {
      throw new Error(`15100066 API error ${header.resultCode}: ${header.resultMsg ?? ""}`);
    }
    const body = env.response?.body;
    return { totalCount: body?.totalCount ?? 0, records: (body?.items ?? []).map(mapRow) };
  }

  // On-demand lookup by EXACT 식품명 (foodNm). The API only supports exact-name
  // matching (partial returns nothing), so this is for caching a product the user
  // typed by full name that isn't in the local snapshot yet. Returns [] on no match.
  async fetchByName(name: string, maxRows = 50): Promise<SourceRecord[]> {
    const url = new URL(this.cfg.endpoint);
    url.searchParams.set("serviceKey", this.cfg.serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", String(maxRows));
    url.searchParams.set("type", "json");
    url.searchParams.set("foodNm", name);

    const env = await this.fetchJson(url);
    if (env.response?.header?.resultCode && env.response.header.resultCode !== "00") return [];
    return (env.response?.body?.items ?? []).map(mapRow);
  }

  // §4 exponential backoff on transient failures; the key is never logged.
  private async fetchJson(url: URL): Promise<Envelope> {
    const maxRetries = this.cfg.maxRetries ?? 3;
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status} from 15100066`);
        return (await res.json()) as Envelope;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await delay(2 ** attempt * 500);
      }
    }
    const detail = String(lastError).split(this.cfg.serviceKey).join("***");
    throw new Error(`15100066 fetch failed after ${maxRetries} retries: ${detail}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Map one API row → canonical SourceRecord. Values stay raw strings; parse.ts
// decides NULL-vs-0. Exported for unit testing the wiring.
export function mapRow(row: Row): SourceRecord {
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
    mfdsL1Code: s(FIELD.lv3Code),
    mfdsL1Name: s(FIELD.lv3Name),
    mfdsL2Code: s(FIELD.lv4Code),
    mfdsL2Name: s(FIELD.lv4Name),
    mfdsL3Code: s(FIELD.lv5Code),
    mfdsL3Name: s(FIELD.lv5Name),
    mfdsL4Code: s(FIELD.lv6Code),
    mfdsL4Name: s(FIELD.lv6Name),
    servingRef: s(FIELD.servingRef),
    dataGenDate: s(FIELD.dataGenDate),
  };
}
