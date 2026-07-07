// Seeds the v1 closed list of 6 consumer categories
// (.omc/plans/data-model-category-mapping.md §3). Idempotent: re-running upserts
// by PK so migrate + seed can be replayed and stays in sync if names/order change.
// Run with: pnpm db:seed (tsx db/seed.ts).
//
// NOTE: mfds_category_map is intentionally NOT seeded here. Per plan §4 its rows
// are curated from the distinct classification values of *actually ingested* data,
// so that seed is built after the pipeline (step 4) runs, not now.
import { fileURLToPath } from "node:url";
import { getWriteDb } from "./client";
import { consumerCategory } from "./schema";

// v1 폐쇄 목록 (§3). displayOrder = 노출 순서. 각 카테고리는 하나의 제품유형에만
// 속한다(음료 vs 고형식품 혼합 금지 — 등급 컷오프가 제품유형별로 다름, §3).
export const CONSUMER_CATEGORY_SEED = [
  { id: "carbonated", name: "탄산음료", productType: "beverage", displayOrder: 1 },
  { id: "juice", name: "주스", productType: "beverage", displayOrder: 2 },
  { id: "coffee", name: "커피음료", productType: "beverage", displayOrder: 3 },
  { id: "snack_chip", name: "스낵/칩", productType: "solid", displayOrder: 4 },
  { id: "chocolate", name: "초콜릿", productType: "solid", displayOrder: 5 },
  { id: "biscuit", name: "비스킷", productType: "solid", displayOrder: 6 },
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

function main() {
  const db = getWriteDb();
  const n = seedConsumerCategories(db);
  console.log(`Seeded ${n} consumer categories.`);
}

// Run the CLI only when executed directly (pnpm db:seed), not when the test
// suite imports seedConsumerCategories — importing must have no side effects.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
