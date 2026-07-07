// Read-query layer for the MVP screens (.omc/plans/mvp-scope-screens.md §3–§4,
// §8 AC), exercised against an in-memory SQLite loaded via the ingest path so the
// grades/rankings are realistic pre-computed values.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReadDb } from "@/db/client";
import {
  getCategories,
  getCategoryAnalytics,
  getCategoryRankings,
  getProductDetail,
  searchProducts,
} from "@/db/queries";
import { seedConsumerCategories } from "@/db/seed";
import * as schema from "@/db/schema";
import { snapshotAgg, swapAndRecompute } from "@/scripts/ingest/persist";
import type { NormalizedPair } from "@/scripts/ingest/source";

const AT = "2026-07-07T00:00:00Z";

function pair(over: Partial<NormalizedPair["product"]>, nutrient: Partial<NormalizedPair["nutrient"]>): NormalizedPair {
  return {
    product: { foodCode: "X", name: "제품", referenceRaw: "100g", productType: "solid", categoryId: null, ingestedAt: AT, ...over },
    nutrient: { foodCode: over.foodCode ?? "X", energyKcal: 0, sugarsG: 0, satfatG: 0, sodiumMg: 0, fiberG: 0, proteinG: 0, ...nutrient },
  };
}

const PAIRS: NormalizedPair[] = [
  pair({ foodCode: "COLA", name: "코카콜라", manufacturer: "코카콜라음료", referenceRaw: "100ml", productType: "beverage", categoryId: "carbonated" }, { energyKcal: 43, sugarsG: 10.6 }), // E
  pair({ foodCode: "LIGHT", name: "제로콜라", referenceRaw: "100ml", productType: "beverage", categoryId: "carbonated" }, {}), // B
  pair({ foodCode: "HEALTHY", name: "통곡물칩", categoryId: "snack_chip" }, { energyKcal: 70, sugarsG: 2, satfatG: 0.5, sodiumMg: 40, fiberG: 4, proteinG: 5 }), // A
  pair({ foodCode: "BISCUIT", name: "버터비스킷", categoryId: "snack_chip" }, { energyKcal: 478, sugarsG: 35, satfatG: 12, sodiumMg: 200 }), // E
  pair({ foodCode: "UNGRAD", name: "미측정칩", categoryId: "snack_chip" }, { energyKcal: 100, sugarsG: null, satfatG: 5, sodiumMg: 100 }), // ungradable
];

let db: ReadDb;
beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const d = drizzle(sqlite, { schema });
  migrate(d, { migrationsFolder: "./db/migrations" });
  seedConsumerCategories(d);
  swapAndRecompute(d, PAIRS, AT);
  snapshotAgg(d, "2026-06-07");
  snapshotAgg(d, "2026-07-07"); // two snapshots → trend
  db = d as unknown as ReadDb;
});

describe("getCategories", () => {
  it("returns the 6 seeded categories in display order", () => {
    const cats = getCategories(db);
    expect(cats).toHaveLength(6);
    expect(cats[0].id).toBe("carbonated");
  });
});

describe("searchProducts (§4.1)", () => {
  it("matches product name partial + applies filters together", () => {
    expect(searchProducts(db, { q: "콜라" }).map((p) => p.foodCode).sort()).toEqual(["COLA", "LIGHT"]);
    expect(searchProducts(db, { categoryId: "carbonated" })).toHaveLength(2);
    expect(searchProducts(db, { productType: "solid" }).every((p) => p.productType === "solid")).toBe(true);
    expect(searchProducts(db, { grade: "E" }).map((p) => p.foodCode).sort()).toEqual(["BISCUIT", "COLA"]);
  });

  it("treats LIKE wildcards in the query as literals (escaping)", () => {
    // No fixture name contains '%' or '_'; with escaping these match nothing
    // (without escaping, '%' would match every product).
    expect(searchProducts(db, { q: "%" })).toHaveLength(0)
    expect(searchProducts(db, { q: "_" })).toHaveLength(0)
  })

  it("includes ungradable products with gradable=false", () => {
    const ungrad = searchProducts(db, { q: "미측정" });
    expect(ungrad).toHaveLength(1);
    expect(ungrad[0].gradable).toBe(false);
    expect(ungrad[0].healthGrade).toBeNull();
  });
});

describe("getProductDetail (§4.2)", () => {
  it("returns grade, nutrient and rank position for a gradable product", () => {
    const d = getProductDetail(db, "COLA");
    expect(d?.grade?.healthGrade).toBe("E");
    expect(d?.nutrient?.sugarsG).toBe(10.6);
    expect(d?.categoryName).toBe("탄산음료");
    expect(d?.rank).toBe(2); // LIGHT is rank 1
    expect(d?.categoryTotal).toBe(2);
  });

  it("preserves 미측정 NULL in the nutrient row (§8 AC)", () => {
    const d = getProductDetail(db, "UNGRAD");
    expect(d?.nutrient?.sugarsG).toBeNull();
    expect(d?.nutrient?.satfatG).toBe(5);
    expect(d?.grade?.gradable).toBe(0);
    expect(d?.rank).toBeNull(); // ungradable → not ranked
  });

  it("returns null for an unknown food code", () => {
    expect(getProductDetail(db, "NOPE")).toBeNull();
  });
});

describe("getCategoryRankings (§4.3, §8 AC)", () => {
  it("orders by rank asc, gapless, gradable only, no grade/rank contradiction", () => {
    const { rows, total } = getCategoryRankings(db, "snack_chip");
    expect(total).toBe(2); // UNGRAD excluded
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ["통곡물칩", 1],
      ["버터비스킷", 2],
    ]);
    // Grade A ranks ahead of grade E.
    expect(rows[0].healthGrade).toBe("A");
    expect(rows[1].healthGrade).toBe("E");
  });
});

describe("getCategoryAnalytics (§4.4)", () => {
  it("returns grade distribution, correlation points (NULL excluded) and trend", () => {
    const a = getCategoryAnalytics(db, "snack_chip");
    const dist = Object.fromEntries(a.distribution.map((d) => [d.grade, d.count]));
    expect(dist).toMatchObject({ A: 1, E: 1 });
    expect(a.gradableCount).toBe(2);
    // UNGRAD (null sugars) excluded from correlation points.
    expect(a.correlationPoints).toHaveLength(2);
    // Two snapshots → trend has ≥2 rows.
    expect(a.trend.length).toBeGreaterThanOrEqual(2);
  });
});
