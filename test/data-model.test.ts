// Data-model step 2 verification gate (.omc/plans/data-model-category-mapping.md
// §8, §10): the migration reproduces on a fresh DB, the 6 v1 consumer categories
// seed with the §3 product_type, and product_nutrient keeps 미측정 NULL distinct
// from a measured 0 (§6). Uses an in-memory SQLite so each test is isolated.
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import {
  CONSUMER_CATEGORY_SEED,
  MFDS_CATEGORY_MAP_SEED,
  seedConsumerCategories,
  seedMfdsCategoryMap,
} from "@/db/seed";
import * as schema from "@/db/schema";
import { consumerCategory, mfdsCategoryMap, product, productNutrient } from "@/db/schema";

// Fresh :memory: DB with db/migrations applied — proves the migration is
// reproducible (§10.1) and isolates every assertion from shared state.
function freshDb() {
  const sqlite = new Database(":memory:");
  // Mirror getWriteDb(): enforce FKs so orphan-row assertions are meaningful.
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

describe("consumer_category seed (§3, §8)", () => {
  // 카테고리 목록은 확장된다(v3에서 차음료·캔디/젤리·아이스크림 추가). 개수를 박아두면
  // 확장할 때마다 테스트가 깨지고 정작 불변식은 검증하지 못하므로, 시드 상수에서 파생한다.
  it("seeds exactly the declared category set", () => {
    const db = freshDb();
    const n = seedConsumerCategories(db);
    expect(n).toBe(CONSUMER_CATEGORY_SEED.length);
    expect(db.select().from(consumerCategory).all()).toHaveLength(CONSUMER_CATEGORY_SEED.length);
  });

  it("assigns each category the product_type the seed declares (ADR-0007: 등급 스케일 결정)", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    const byId = Object.fromEntries(
      db.select().from(consumerCategory).all().map((r) => [r.id, r.productType]),
    );
    expect(byId).toEqual(Object.fromEntries(CONSUMER_CATEGORY_SEED.map((c) => [c.id, c.productType])));
  });

  it("assigns each category its declared display_order (gapless 1..N)", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    const rows = db.select().from(consumerCategory).orderBy(consumerCategory.displayOrder).all();
    // 시드가 선언한 순서와 정확히 일치하는지 + 순번에 구멍이 없는지 둘 다 본다.
    expect(rows.map((r) => r.id)).toEqual(
      [...CONSUMER_CATEGORY_SEED].sort((a, b) => a.displayOrder - b.displayOrder).map((c) => c.id),
    );
    expect(rows.map((r) => r.displayOrder)).toEqual(
      Array.from({ length: CONSUMER_CATEGORY_SEED.length }, (_, i) => i + 1),
    );
  });

  it("is idempotent — re-seeding keeps the row count without a PK conflict", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    seedConsumerCategories(db);
    expect(db.select().from(consumerCategory).all()).toHaveLength(CONSUMER_CATEGORY_SEED.length);
  });

  it("rejects a category whose product_type breaks the CHECK constraint", () => {
    const db = freshDb();
    expect(() =>
      db
        .insert(consumerCategory)
        .values({ id: "bad", name: "잘못된 유형", productType: "gas", displayOrder: 9 })
        .run(),
    ).toThrow();
  });

  it("assigns exactly one product_type per category in the DB (§3)", () => {
    // A consumer category belongs to exactly one product_type (음료 vs 고형식품
    // 혼합 금지). Group the seeded rows by id and assert a single distinct type.
    const db = freshDb();
    seedConsumerCategories(db);
    const byId = new Map<string, Set<string>>();
    for (const r of db.select().from(consumerCategory).all()) {
      (byId.get(r.id) ?? byId.set(r.id, new Set()).get(r.id)!).add(r.productType);
    }
    expect(byId.size).toBe(CONSUMER_CATEGORY_SEED.length);
    for (const types of byId.values()) {
      expect(types.size).toBe(1);
    }
  });
});

describe("mfds_category_map seed (§4 curation)", () => {
  it("seeds the curated 식품유형 → category mappings, all FK-valid", () => {
    const db = freshDb();
    seedConsumerCategories(db); // FK parents
    const n = seedMfdsCategoryMap(db);
    expect(n).toBe(MFDS_CATEGORY_MAP_SEED.length);

    const rows = db.select().from(mfdsCategoryMap).all();
    expect(rows).toHaveLength(MFDS_CATEGORY_MAP_SEED.length);
    // Every mapped category id is one of the seeded consumer categories.
    const validIds = new Set<string>(CONSUMER_CATEGORY_SEED.map((c) => c.id));
    for (const r of rows) expect(validIds.has(r.categoryId)).toBe(true);
    // 그리고 모든 카테고리에 최소 하나의 앵커 코드가 있어야 한다 — 매핑이 없는
    // 카테고리는 화면에 영원히 빈 목록으로 남는다(개수 비교보다 강한 불변식).
    expect(new Set(rows.map((r) => r.categoryId))).toEqual(validIds);
  });

  it("is idempotent — re-seeding keeps the same row count", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    seedMfdsCategoryMap(db);
    seedMfdsCategoryMap(db);
    expect(db.select().from(mfdsCategoryMap).all()).toHaveLength(MFDS_CATEGORY_MAP_SEED.length);
  });
});

describe("referential integrity (FK enforcement)", () => {
  it("rejects a product_nutrient row whose food_code has no product (orphan FK)", () => {
    const db = freshDb();
    // With PRAGMA foreign_keys = ON, inserting a child before its parent throws.
    expect(() =>
      db.insert(productNutrient).values({ foodCode: "GHOST-1", sugarsG: 0 }).run(),
    ).toThrow();
  });
});

describe("미측정 NULL vs 실제 0 보존 (§6, §8)", () => {
  it("stores a source-missing nutrient as NULL and a measured 0 as 0", () => {
    const db = freshDb();
    // product FK must exist before product_nutrient rows.
    db.insert(product)
      .values([
        { foodCode: "ZERO-1", name: "측정된 0 제품", referenceRaw: "100ml", ingestedAt: "2026-07-07" },
        { foodCode: "NULL-1", name: "당류 미측정 제품", referenceRaw: "100g", ingestedAt: "2026-07-07" },
      ])
      .run();
    db.insert(productNutrient)
      .values([
        { foodCode: "ZERO-1", sugarsG: 0 }, // 측정된 실제 0
        { foodCode: "NULL-1", sugarsG: null }, // 미측정 (공백/"해당없음")
      ])
      .run();

    const zero = db
      .select()
      .from(productNutrient)
      .where(eq(productNutrient.foodCode, "ZERO-1"))
      .get();
    const nul = db
      .select()
      .from(productNutrient)
      .where(eq(productNutrient.foodCode, "NULL-1"))
      .get();

    expect(zero?.sugarsG).toBe(0);
    expect(nul?.sugarsG).toBeNull();
    // 핵심 불변식: 0과 NULL이 뭉개지지 않고 구별된다(등급 산출이 미측정을 걸러낼 수 있어야 함).
    expect(zero?.sugarsG).not.toBe(nul?.sugarsG);
  });

  it("omitted nutrient columns default to NULL, not 0", () => {
    const db = freshDb();
    db.insert(product)
      .values({ foodCode: "SPARSE-1", name: "일부만 측정", referenceRaw: "100g", ingestedAt: "2026-07-07" })
      .run();
    // Only energy provided; sugars/satfat/sodium/fiber/protein left unmeasured.
    db.insert(productNutrient).values({ foodCode: "SPARSE-1", energyKcal: 42 }).run();

    const row = db
      .select()
      .from(productNutrient)
      .where(eq(productNutrient.foodCode, "SPARSE-1"))
      .get();
    expect(row?.energyKcal).toBe(42);
    expect(row?.sugarsG).toBeNull();
    expect(row?.sodiumMg).toBeNull();
    expect(row?.proteinG).toBeNull();
  });
});
