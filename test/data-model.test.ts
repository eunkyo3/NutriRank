// Data-model step 2 verification gate (.omc/plans/data-model-category-mapping.md
// §8, §10): the migration reproduces on a fresh DB, the 6 v1 consumer categories
// seed with the §3 product_type, and product_nutrient keeps 미측정 NULL distinct
// from a measured 0 (§6). Uses an in-memory SQLite so each test is isolated.
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { CONSUMER_CATEGORY_SEED, seedConsumerCategories } from "@/db/seed";
import * as schema from "@/db/schema";
import { consumerCategory, product, productNutrient } from "@/db/schema";

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
  it("seeds exactly the 6 v1 categories", () => {
    const db = freshDb();
    const n = seedConsumerCategories(db);
    expect(n).toBe(6);
    expect(db.select().from(consumerCategory).all()).toHaveLength(6);
  });

  it("assigns each category the product_type from §3", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    const byId = Object.fromEntries(
      db.select().from(consumerCategory).all().map((r) => [r.id, r.productType]),
    );
    expect(byId).toEqual({
      carbonated: "beverage",
      juice: "beverage",
      coffee: "beverage",
      snack_chip: "solid",
      chocolate: "solid",
      biscuit: "solid",
    });
  });

  it("assigns each category its declared display_order (gapless 1..6)", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    // Order by display_order and assert the exact id sequence — verifies both
    // gaplessness AND that each specific category got the order §3 declares.
    const idsByOrder = db
      .select()
      .from(consumerCategory)
      .orderBy(consumerCategory.displayOrder)
      .all()
      .map((r) => r.id);
    expect(idsByOrder).toEqual([
      "carbonated",
      "juice",
      "coffee",
      "snack_chip",
      "chocolate",
      "biscuit",
    ]);
  });

  it("is idempotent — re-seeding keeps 6 rows without a PK conflict", () => {
    const db = freshDb();
    seedConsumerCategories(db);
    seedConsumerCategories(db);
    expect(db.select().from(consumerCategory).all()).toHaveLength(6);
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
