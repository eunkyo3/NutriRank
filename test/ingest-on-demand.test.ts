// On-demand search cache (scripts/ingest/on-demand.ts): fetch by exact name →
// grade → upsert → re-rank, without wiping the snapshot. Uses a fixture
// NameFetcher so it needs no network.
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { seedConsumerCategories, seedMfdsCategoryMap } from "@/db/seed";
import * as schema from "@/db/schema";
import { categoryRanking, gradeResult, product } from "@/db/schema";
import { type NameFetcher, fetchAndCacheByName } from "@/scripts/ingest/on-demand";
import type { Db } from "@/scripts/ingest/persist";
import type { SourceRecord } from "@/scripts/ingest/source";

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" }); // 0000 + 0001 (product_fts)
  seedConsumerCategories(db);
  seedMfdsCategoryMap(db); // 식품유형 → category, incl. 09401 → carbonated
  return db as unknown as Db;
}

function srec(over: Partial<SourceRecord>): SourceRecord {
  return {
    foodCode: "X",
    name: "제품",
    manufacturer: null,
    referenceRaw: "100ml",
    energyKcalRaw: null,
    sugarsRaw: null,
    satfatRaw: null,
    sodiumRaw: null,
    fiberRaw: null,
    proteinRaw: null,
    mfdsL1Code: null,
    mfdsL1Name: null,
    mfdsL2Code: null,
    mfdsL2Name: null,
    mfdsL3Code: null,
    mfdsL3Name: null,
    mfdsL4Code: null,
    mfdsL4Name: null,
    servingRef: null,
    dataGenDate: "2025-01-01",
    ...over,
  };
}

// A carbonated cola (식품유형 09401 → carbonated) and an unmapped product.
const COLA = srec({
  foodCode: "COKE-1", name: "코카콜라", manufacturer: "코카콜라음료", referenceRaw: "100ml",
  mfdsL2Code: "09401", mfdsL2Name: "탄산음료",
  energyKcalRaw: "44", sugarsRaw: "11", satfatRaw: "0", sodiumRaw: "3", fiberRaw: "0", proteinRaw: "0",
});
const UNMAPPED = srec({ foodCode: "RAMEN-1", name: "라면", referenceRaw: "100g", mfdsL2Code: "07999", mfdsL2Name: "유탕면" });

function fetcher(records: SourceRecord[]): NameFetcher {
  return { fetchByName: async () => records };
}

const AT = "2026-07-08T00:00:00Z";

let db: Db;
beforeEach(() => {
  db = freshDb();
});

describe("fetchAndCacheByName", () => {
  it("caches a mapped product: upserts, grades, ranks and indexes it", async () => {
    const n = await fetchAndCacheByName(db, fetcher([COLA]), "코카콜라", AT);
    expect(n).toBe(1);

    const p = db.select().from(product).where(eq(product.foodCode, "COKE-1")).get();
    expect(p?.categoryId).toBe("carbonated");
    expect(p?.productType).toBe("beverage");

    const g = db.select().from(gradeResult).where(eq(gradeResult.foodCode, "COKE-1")).get();
    expect(g?.gradable).toBe(1);
    expect(g?.healthGrade).toBe("E"); // 44kcal + 11g sugar beverage → E

    // Ranked within its category and findable via the FTS index.
    const ranked = db.select().from(categoryRanking).where(eq(categoryRanking.foodCode, "COKE-1")).get();
    expect(ranked?.rank).toBe(1);
    const fts = db.all(sql`SELECT food_code FROM product_fts WHERE product_fts MATCH ${'"코카콜"'}`) as { food_code: string }[];
    expect(fts.map((r) => r.food_code)).toContain("COKE-1");
  });

  it("is idempotent — re-caching the same product does not duplicate", async () => {
    await fetchAndCacheByName(db, fetcher([COLA]), "코카콜라", AT);
    await fetchAndCacheByName(db, fetcher([COLA]), "코카콜라", AT);
    expect(db.select().from(product).where(eq(product.foodCode, "COKE-1")).all()).toHaveLength(1);
    expect(db.select().from(categoryRanking).where(eq(categoryRanking.foodCode, "COKE-1")).all()).toHaveLength(1);
  });

  it("filters out products outside the v1 mapping (returns 0, adds nothing)", async () => {
    const n = await fetchAndCacheByName(db, fetcher([UNMAPPED]), "라면", AT);
    expect(n).toBe(0);
    expect(db.select().from(product).all()).toHaveLength(0);
  });

  it("returns 0 when the API has no match", async () => {
    expect(await fetchAndCacheByName(db, fetcher([]), "없는제품", AT)).toBe(0);
  });
});
