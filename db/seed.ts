// Seeds the v1 closed list of 6 consumer categories + the 식약처 식품유형 →
// consumer-category mapping (.omc/plans/data-model-category-mapping.md §3–§4).
// Idempotent: re-running upserts by PK so migrate + seed can be replayed.
// Run with: pnpm db:seed (tsx db/seed.ts).
import { fileURLToPath } from "node:url";
import { getWriteDb } from "./client";
import { consumerCategory, mfdsCategoryMap } from "./schema";

// v1 폐쇄 목록 (§3). displayOrder = 노출 순서. 각 카테고리는 하나의 제품유형에만
// 속한다(음료 vs 고형식품 혼합 금지 — 등급 컷오프가 제품유형별로 다름, §3).
// productType은 단순 표시용이 아니라 **등급 스케일을 결정**한다(ADR-0007). 새 카테고리를
// 추가할 때 반드시 명시하고, 그 카테고리에 매핑할 식품유형이 실제로 그 형태로 섭취되는지
// 확인할 것. 표시 순서는 음료군(1~4) → 고형군(5~9)으로 묶는다.
export const CONSUMER_CATEGORY_SEED = [
  { id: "carbonated", name: "탄산음료", productType: "beverage", displayOrder: 1 },
  { id: "juice", name: "주스", productType: "beverage", displayOrder: 2 },
  { id: "coffee", name: "커피음료", productType: "beverage", displayOrder: 3 },
  { id: "tea", name: "차음료", productType: "beverage", displayOrder: 4 },
  { id: "snack_chip", name: "스낵/칩", productType: "solid", displayOrder: 5 },
  { id: "chocolate", name: "초콜릿", productType: "solid", displayOrder: 6 },
  { id: "biscuit", name: "비스킷", productType: "solid", displayOrder: 7 },
  { id: "candy_jelly", name: "캔디/젤리", productType: "solid", displayOrder: 8 },
  { id: "ice_cream", name: "아이스크림/빙과", productType: "solid", displayOrder: 9 },
] as const;

// 식약처 식품유형(foodLv4) → 소비자 카테고리 매핑 (curation seed, mapVersion 1).
// 실제 15100066 데이터의 식품유형 어휘를 열거해 큐레이션(2026-07-07). 앵커 레벨은
// 식품유형(level='detail', map.ts categoryFor 참조). 음료 카테고리는 RTD(액상)만
// 포함해 제품유형(음료/고형) 일관성을 지킨다(§3). 미매핑 식품유형은 파이프라인
// 리포트로 남아 다음 큐레이션 대상이 된다.
export const MFDS_CATEGORY_MAP_SEED = [
  // 음료류 (RTD, 100ml)
  { mfdsLevel: "detail", mfdsCode: "09401", mfdsName: "탄산음료", categoryId: "carbonated" },
  { mfdsLevel: "detail", mfdsCode: "09402", mfdsName: "탄산수", categoryId: "carbonated" },
  { mfdsLevel: "detail", mfdsCode: "09302", mfdsName: "과·채주스", categoryId: "juice" },
  { mfdsLevel: "detail", mfdsCode: "09303", mfdsName: "과·채음료", categoryId: "juice" },
  { mfdsLevel: "detail", mfdsCode: "09201", mfdsName: "액상커피", categoryId: "coffee" },
  { mfdsLevel: "detail", mfdsCode: "09102", mfdsName: "액상차", categoryId: "tea" },
  // 과자류·빵류 또는 떡류 (100g) — 빵·케이크·떡은 식사 대용 성격이라 간식 범위 밖으로 제외.
  { mfdsLevel: "detail", mfdsCode: "01103", mfdsName: "비스킷/쿠키/크래커", categoryId: "biscuit" },
  { mfdsLevel: "detail", mfdsCode: "01105", mfdsName: "웨이퍼", categoryId: "biscuit" },
  { mfdsLevel: "detail", mfdsCode: "01102", mfdsName: "마카롱/다쿠아즈", categoryId: "biscuit" },
  { mfdsLevel: "detail", mfdsCode: "01104", mfdsName: "스낵과자", categoryId: "snack_chip" },
  { mfdsLevel: "detail", mfdsCode: "01101", mfdsName: "강냉이/팝콘", categoryId: "snack_chip" },
  { mfdsLevel: "detail", mfdsCode: "01106", mfdsName: "일반과자", categoryId: "snack_chip" }, // 새우깡 등
  { mfdsLevel: "detail", mfdsCode: "01107", mfdsName: "전통과자", categoryId: "snack_chip" },
  // 코코아가공품류 또는 초콜릿류 (100g)
  { mfdsLevel: "detail", mfdsCode: "03101", mfdsName: "초콜릿", categoryId: "chocolate" },
  { mfdsLevel: "detail", mfdsCode: "03102", mfdsName: "초콜릿과자", categoryId: "chocolate" },
  { mfdsLevel: "detail", mfdsCode: "03103", mfdsName: "초코파이", categoryId: "chocolate" },
  { mfdsLevel: "detail", mfdsCode: "03203", mfdsName: "기타 코코아가공품", categoryId: "chocolate" },
  // 캔디/젤리 (100g). 껌(01301)은 삼키지 않아 100g 기준 등급이 무의미하므로 제외.
  // 푸딩(01208)은 디저트 성격이라 이번 확장에서 보류.
  { mfdsLevel: "detail", mfdsCode: "01203", mfdsName: "사탕", categoryId: "candy_jelly" },
  { mfdsLevel: "detail", mfdsCode: "01205", mfdsName: "젤리", categoryId: "candy_jelly" },
  { mfdsLevel: "detail", mfdsCode: "01202", mfdsName: "마시멜로", categoryId: "candy_jelly" },
  { mfdsLevel: "detail", mfdsCode: "01206", mfdsName: "캐러멜", categoryId: "candy_jelly" },
  { mfdsLevel: "detail", mfdsCode: "01204", mfdsName: "양갱", categoryId: "candy_jelly" },
  // 빙과류 — 원천 표기가 100ml/100g으로 섞여 있으나 Nutri-Score는 아이스크림을
  // 고형식품으로 다루므로 카테고리 제품유형을 solid로 고정한다(ADR-0007).
  { mfdsLevel: "detail", mfdsCode: "02101", mfdsName: "아이스크림", categoryId: "ice_cream" },
  { mfdsLevel: "detail", mfdsCode: "02103", mfdsName: "아이스밀크", categoryId: "ice_cream" },
  { mfdsLevel: "detail", mfdsCode: "02104", mfdsName: "샤베트", categoryId: "ice_cream" },
  { mfdsLevel: "detail", mfdsCode: "02301", mfdsName: "빙과", categoryId: "ice_cream" },
] as const;

type WriteDb = ReturnType<typeof getWriteDb>;

// Upsert by id so a re-run stays authoritative (name/order edits propagate) and
// never trips the PK constraint. Wrapped in a transaction so a mid-loop failure
// can't leave a partial category set. Returns the number of seeded categories.
export function seedConsumerCategories(db: WriteDb): number {
  db.transaction((tx) => {
    for (const row of CONSUMER_CATEGORY_SEED) {
      tx.insert(consumerCategory)
        .values(row)
        .onConflictDoUpdate({
          target: consumerCategory.id,
          set: {
            name: row.name,
            productType: row.productType,
            displayOrder: row.displayOrder,
          },
        })
        .run();
    }
  });
  return CONSUMER_CATEGORY_SEED.length;
}

// Upsert mapping rows by PK (mfdsLevel, mfdsCode). mapVersion bumps when the
// curation changes (data-model §4 재큐레이션 추적). Returns the row count.
// v3: 차음료·캔디/젤리·아이스크림 카테고리 추가, 마카롱/다쿠아즈를 비스킷에 편입.
export function seedMfdsCategoryMap(db: WriteDb, mapVersion = 3): number {
  db.transaction((tx) => {
    for (const row of MFDS_CATEGORY_MAP_SEED) {
      tx.insert(mfdsCategoryMap)
        .values({ ...row, mapVersion })
        .onConflictDoUpdate({
          target: [mfdsCategoryMap.mfdsLevel, mfdsCategoryMap.mfdsCode],
          set: { mfdsName: row.mfdsName, categoryId: row.categoryId, mapVersion },
        })
        .run();
    }
  });
  return MFDS_CATEGORY_MAP_SEED.length;
}

function main() {
  const db = getWriteDb();
  const categories = seedConsumerCategories(db);
  const mappings = seedMfdsCategoryMap(db);
  console.log(`Seeded ${categories} consumer categories and ${mappings} category mappings.`);
}

// Run the CLI only when executed directly (pnpm db:seed), not when the test
// suite imports seedConsumerCategories — importing must have no side effects.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
