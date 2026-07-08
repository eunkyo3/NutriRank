# data.go.kr 15100066 — 전국통합식품영양성분정보(가공식품) 표준데이터 · Open API spec

Researched: 2026-07-07. Primary source: https://www.data.go.kr/data/15100066/standard.do
Provider: 식품의약품안전처 (MFDS / Korea Food & Drug Administration).

## ✅ CONFIRMED LIVE ENDPOINT (verified 2026-07-07, NORMAL_SERVICE)

This is the endpoint NutriRank actually uses (`scripts/ingest/adapters/datagokr-15100066.ts`):

- **URL:** `https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api` (GET)
- **Params:** `serviceKey`, `pageNo`, `numOfRows` (200 is a safe page size; 1000 is slow), `type=json`
- **Envelope:** `{ response: { header: { resultCode, resultMsg }, body: { totalCount, numOfRows, pageNo, items: [...] } } }`. `resultCode="00"` = NORMAL_SERVICE.
- **totalCount:** 590,542 rows (all 가공식품). Missing values = empty string `""`; text sentinels = `"해당없음"` (both → 미측정 NULL).
- **Field map (API key → our field):** `foodCd`→식품코드, `foodNm`→식품명, `mfrNm`→제조사, `nutConSrtrQua`→기준량("100g"/"100ml"), `enerc`→에너지kcal, `sugar`→당류g, `fasat`→포화지방산g, `nat`→나트륨mg, `fibtg`→식이섬유g, `prot`→단백질g, `foodLv3Cd/Nm`→군(mfdsL1), `foodLv4Cd/Nm`→식품유형(mfdsL2, 매핑 앵커), `foodLv5/6`→mfdsL3/L4, `servSize`→1회섭취참고량, `crtYmd`→데이터생성일자.
- **Classification for mapping:** 식품유형(foodLv4) is the consumer-category anchor (탄산음료=09401, 과·채주스=09302, 액상커피=09201, 비스킷=01103, 스낵과자=01104, 초콜릿=03101, …); foodLv5–7 are frequently "해당없음". Curated map in `db/seed.ts` MFDS_CATEGORY_MAP_SEED.
- **Server-side filtering:** not supported (field-filter params are ignored) → the pipeline pages through all rows and filters client-side.

> The odcloud alternative documented below was NOT the registered service for our key (returned "등록되지 않은 서비스"); the standard-data endpoint above is the one that works.

---

## Option A (RECOMMENDED for Korean field names) — odcloud.kr

Standard datasets on data.go.kr are served through `api.odcloud.kr`. Confirmed live:

- `GET https://api.odcloud.kr/api/15100066/v1/uddi:a293c123-d3e2-4b7b-84b9-83120c358754` → **HTTP 401** (endpoint real, needs key)
- `GET https://api.odcloud.kr/api/15100066/v1/uddi:9b00e253-d090-4366-9a33-9f082448749e` → **HTTP 401** (also real)

Two UUIDs are listed on the dataset page. **Could NOT confirm from primary source which UUID is the main data feed** — both auth-gate identically. `a293c123-…` is listed first and is the most likely primary data endpoint; the second may be a code/metadata table. Verify live with a real key by hitting each and inspecting `totalCount`.

### Request
- Method: `GET`
- Base: `https://api.odcloud.kr/api/15100066/v1/uddi:a293c123-d3e2-4b7b-84b9-83120c358754`
- Query params (odcloud convention — page/perPage style):
  - `serviceKey` — issued key. Use the **Decoded** key, or URL-encode the Encoded key. (odcloud is picky: if you get SERVICE_KEY errors, swap between encoded/decoded.)
  - `page` — page number (default 1)
  - `perPage` — rows per page (default 10)
  - `returnType` — `JSON` or `XML` (some odcloud endpoints also accept `type`)

### curl
```bash
curl -G "https://api.odcloud.kr/api/15100066/v1/uddi:a293c123-d3e2-4b7b-84b9-83120c358754" \
  --data-urlencode "serviceKey=YOUR_DECODED_KEY" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=10" \
  --data-urlencode "returnType=JSON"
```

### Response envelope (odcloud standard shape)
```json
{ "currentCount": 10, "data": [ { ...record... } ], "matchCount": 0,
  "page": 1, "perPage": 10, "totalCount": 0 }
```
`totalCount` = grand total; paginate by incrementing `page`.

### Record fields — Korean keys (odcloud returns the grid column labels verbatim, incl. units)
The 56 columns below are the EXACT verbatim grid/table headers from the primary dataset page (data.go.kr/data/15100066/standard.do). For odcloud APIs the JSON keys normally equal these labels character-for-character (units included). **Flagged**: exact odcloud JSON-key spelling should be confirmed against one live row, since odcloud occasionally drops the unit suffix.

1. 식품코드
2. 식품명
3. 데이터구분코드
4. 데이터구분명
5. 식품기원코드
6. 식품기원명
7. 식품대분류코드
8. 식품대분류명
9. 대표식품코드
10. 대표식품명
11. 식품중분류코드
12. 식품중분류명
13. 식품소분류코드
14. 식품소분류명
15. 식품세분류코드
16. 식품세분류명
17. 영양성분함량기준량
18. 에너지(kcal)
19. 수분(g)
20. 단백질(g)
21. 지방(g)
22. 회분(g)
23. 탄수화물(g)
24. 당류(g)
25. 식이섬유(g)
26. 칼슘(mg)
27. 철(mg)
28. 인(mg)
29. 칼륨(mg)
30. 나트륨(mg)
31. 비타민 A(μg RAE)
32. 레티놀(μg)
33. 베타카로틴(μg)
34. 티아민(mg)
35. 리보플라빈(mg)
36. 니아신(mg)
37. 비타민 C(mg)
38. 비타민 D(μg)
39. 콜레스테롤(mg)
40. 포화지방산(g)
41. 트랜스지방산(g)
42. 출처코드
43. 출처명
44. 1회 섭취참고량
45. 식품중량
46. 품목제조보고번호
47. 제조사명
48. 수입업체명
49. 유통업체명
50. 수입여부
51. 원산지국코드
52. 원산지국명
53. 데이터생성방법코드
54. 데이터생성방법명
55. 데이터생성일자
56. 데이터기준일자

Coverage of the fields you asked about: 식품코드✔, 식품명✔, 제조사명✔(#47), 영양성분함량기준량✔(#17), 에너지(kcal)✔, 당류(g)✔, 포화지방산(g)✔, 나트륨(mg)✔, 식이섬유(g)✔, 단백질(g)✔, 식품대/중/소/세분류 코드+명✔, 데이터생성일자✔(#55), 1회 섭취참고량✔(#44 — note the space: "1회 섭취참고량"). "업체명" isn't a single column — it is split into 제조사명/수입업체명/유통업체명.

---

## Option B (ALTERNATE) — unified standard-data API, api.data.go.kr (English field codes)

The same processed-food standard data is also exposed through the older apis.data.go.kr-style unified endpoint (confirmed via a developer write-up that consumes it live):

- Base: `http://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api`
  (processed food = **process**. Sibling APIs: `tn_pubr_public_nutri_food_info_api` = 원재료성/통합, exists for the other datasets.)
- Method: `GET`
- Params (apis.data.go.kr style — pageNo/numOfRows):
  - `serviceKey` — issued key
  - `pageNo` — page number
  - `numOfRows` — rows per page (dev calls seen using 100 and 500; portal hard cap is **1,000 rows/call**)
  - `type` — `json` (or `xml`)

### curl
```bash
curl -G "http://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api" \
  --data-urlencode "serviceKey=YOUR_DECODED_KEY" \
  --data-urlencode "pageNo=1" \
  --data-urlencode "numOfRows=100" \
  --data-urlencode "type=json"
```

### Response envelope
```json
{ "response": {
    "header": { "resultCode": "00", "resultMsg": "..." },
    "body": { "items": [ { ...record... } ], "totalCount": 0, "pageNo": 1, "numOfRows": 100 }
} }
```
`resultCode == "00"` = success.

### Record fields — English camelCase codes (CONFIRMED subset only)
Confirmed verbatim from live-consumer code + search: `foodCd` (식품코드), `foodNm` (식품명), `dataCd` (데이터구분코드), `typeNm` (데이터구분명 / type name), `foodOriginCd` (식품기원코드), `cooCd` (원산지국코드), `cooNm` (원산지국명), `crtYmd`/`crtrYmd` (생성일자류), `nutConSrtrQua` (영양성분함량기준량), `enerc` (에너지).

**FLAG: the full English-code mapping for all 56 columns is NOT verified from a primary source.** Do not hardcode guessed codes (e.g. water/prot/fatce/sugar/…) — pull one live JSON row and read the actual keys before mapping. If you need Korean keys guaranteed, use Option A.

---

## Pagination
- odcloud (Option A): total via `totalCount`; loop `page=1..N`. Default `perPage=10`; raise `perPage` to reduce round-trips (odcloud allows large perPage; exact per-endpoint max NOT documented on the dataset page — flag/verify live).
- apis.data.go.kr (Option B): total via `response.body.totalCount`; loop `pageNo`. **Max `numOfRows` = 1,000 per call** (portal-wide limit).
- Web grid download is capped at **50,000 rows** — the page itself tells you to use the API for the full set.

## Traffic / rate limits
- Not published per-dataset on the 15100066 page. Portal-wide defaults apply:
  - 개발계정 (development key): ~**1,000 calls/day**.
  - 운영계정 (production key, after approval): up to **100,000 calls/day**.
- **FLAG: the exact approved quota for THIS dataset is set at 활용신청(application) time** and shown on your "마이페이지 > 활용신청 상세". Confirm there.

## Gotchas
- **serviceKey encoding**: data.go.kr issues both an *Encoded* and *Decoded* key. odcloud typically wants the Decoded key (or a properly URL-encoded Encoded key). `SERVICE KEY IS NOT REGISTERED ERROR` / `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` usually = encoding mismatch or newly-issued key not yet propagated (can take ~1h).
- **JSON**: supported on both. Option A `returnType=JSON`; Option B `type=json`. Both default to XML if the param is omitted/misspelled — always set it.
- **Missing values**: not documented on the dataset page. In live Option-B consumption, missing scalars showed as `null` and code substituted `'N/A'`. For odcloud/standard nutrition data, empty cells commonly come back as an **empty string `""`** (sometimes `"0"` for a genuine zero). **FLAG: confirm the exact empty-value sentinel (blank `""` vs `"0"` vs `"-"`) against live rows before writing parsers.** Do NOT assume blank == 0.
- **Two UUIDs** on the odcloud side — verify which carries the nutrition rows (check `totalCount`) before wiring it in.
- **English vs Korean keys** differ entirely between Option A and B — don't mix.

## Sources
- https://www.data.go.kr/data/15100066/standard.do (primary — dataset page, 56 grid columns, provider, update cycle, 50k grid cap)
- https://api.odcloud.kr/api/15100066/v1/uddi:a293c123-d3e2-4b7b-84b9-83120c358754 (live 401 — endpoint confirmed)
- https://api.odcloud.kr/api/15100066/v1/uddi:9b00e253-d090-4366-9a33-9f082448749e (live 401 — second UUID confirmed)
- https://velog.io/@vedivero/... (live consumer: tn_pubr_public_nutri_process_info_api endpoint, params, envelope, foodCd/foodNm/... codes)
- https://www.data.go.kr/ugs/selectPublicDataUseGuideView.do + portal guides (dev 1,000/day, prod 100,000/day, 1,000 rows/call, serviceKey/pageNo/numOfRows/returnType)
- https://www.data.go.kr/images/biz/swagger-guide/multi_swagger_guide.pdf (odcloud page/perPage/returnType convention)
