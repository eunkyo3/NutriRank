// DB orchestration for the ingest pipeline (.omc/plans/data-pipeline-spec.md
// §7–§12, §11 AC): atomic swap+recompute, then aggregate — exercised end-to-end
// against an in-memory SQLite with the real migrations + category seed.
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { seedConsumerCategories } from "@/db/seed";
import * as schema from "@/db/schema";
import { categoryAggSnapshot, categoryRanking, gradeResult, product, productNutrient } from "@/db/schema";
import {
  type Db,
  type NormalizedNutrient,
  type NormalizedProduct,
  snapshotAgg,
  swapAndRecompute,
} from "@/scripts/ingest/persist";
import type { NormalizedPair } from "@/scripts/ingest/source";

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  seedConsumerCategories(db);
  return db;
}

const AT = "2026-07-07T00:00:00Z";

const PRODUCTS: NormalizedProduct[] = [
  { foodCode: "COLA", name: "콜라", referenceRaw: "100ml", productType: "beverage", categoryId: "carbonated", ingestedAt: AT },
  { foodCode: "LIGHT", name: "라이트음료", referenceRaw: "100ml", productType: "beverage", categoryId: "carbonated", ingestedAt: AT },
  { foodCode: "BISCUIT", name: "고당비스킷", referenceRaw: "100g", productType: "solid", categoryId: "snack_chip", ingestedAt: AT },
  { foodCode: "HEALTHY", name: "건강스낵", referenceRaw: "100g", productType: "solid", categoryId: "snack_chip", ingestedAt: AT },
  { foodCode: "UNGRAD", name: "미측정스낵", referenceRaw: "100g", productType: "solid", categoryId: "snack_chip", ingestedAt: AT },
];

const NUTRIENTS: NormalizedNutrient[] = [
  { foodCode: "COLA", energyKcal: 43, sugarsG: 10.6, satfatG: 0, sodiumMg: 0, fiberG: 0, proteinG: 0 }, // bev → 12 → E
  { foodCode: "LIGHT", energyKcal: 0, sugarsG: 0, satfatG: 0, sodiumMg: 0, fiberG: 0, proteinG: 0 }, // bev → 0 → B
  { foodCode: "BISCUIT", energyKcal: 478, sugarsG: 35, satfatG: 12, sodiumMg: 200, fiberG: 1.5, proteinG: 6 }, // solid → 27 → E
  { foodCode: "HEALTHY", energyKcal: 70, sugarsG: 2, satfatG: 0.5, sodiumMg: 40, fiberG: 4, proteinG: 5 }, // solid → −3 → A
  { foodCode: "UNGRAD", energyKcal: 100, sugarsG: null, satfatG: 5, sodiumMg: 100, fiberG: 0, proteinG: 2 }, // sugars 미측정 → ungradable
];

const PAIRS: NormalizedPair[] = PRODUCTS.map((p, i) => ({ product: p, nutrient: NUTRIENTS[i] }));

describe("swapAndRecompute — atomic snapshot + grade + rank (§7–§10)", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("loads, grades and ranks in one call; re-run replaces (idempotent, §9)", () => {
    const { gradableCount } = swapAndRecompute(db, PAIRS, AT);
    expect(gradableCount).toBe(4); // all but UNGRAD
    expect(db.select().from(product).all()).toHaveLength(5);
    swapAndRecompute(db, PAIRS, AT);
    expect(db.select().from(product).all()).toHaveLength(5);
    expect(db.select().from(productNutrient).all()).toHaveLength(5);
  });

  it("preserves 미측정 NULL through load (UNGRAD sugars stays null)", () => {
    swapAndRecompute(db, PAIRS, AT);
    const row = db.select().from(productNutrient).where(eq(productNutrient.foodCode, "UNGRAD")).get();
    expect(row?.sugarsG).toBeNull();
    expect(row?.satfatG).toBe(5);
  });

  it("grades each product per the 2023 algorithm", () => {
    swapAndRecompute(db, PAIRS, AT);
    const grades = Object.fromEntries(
      db.select().from(gradeResult).all().map((r) => [r.foodCode, r.healthGrade]),
    );
    expect(grades).toMatchObject({ COLA: "E", LIGHT: "B", BISCUIT: "E", HEALTHY: "A" });
  });

  it("marks the missing-sugars product ungradable with a reason, no grade (§9.1)", () => {
    swapAndRecompute(db, PAIRS, AT);
    const r = db.select().from(gradeResult).where(eq(gradeResult.foodCode, "UNGRAD")).get();
    expect(r?.gradable).toBe(0);
    expect(r?.healthGrade).toBeNull();
    expect(r?.healthScore).toBeNull();
    expect(JSON.parse(r?.ungradableReason ?? "[]")).toContain("sugars_g");
  });

  it("stamps algorithm_version and stores rationale JSON for gradable rows", () => {
    swapAndRecompute(db, PAIRS, AT);
    const r = db.select().from(gradeResult).where(eq(gradeResult.foodCode, "BISCUIT")).get();
    expect(r?.algorithmVersion).toBe("nutriscore-2023-v1");
    expect(Array.isArray(JSON.parse(r?.rationale ?? "null"))).toBe(true);
  });

  it("ranks gradable products by score asc within category, gapless, no contradiction (§10)", () => {
    swapAndRecompute(db, PAIRS, AT);
    const carbonated = db
      .select()
      .from(categoryRanking)
      .where(eq(categoryRanking.categoryId, "carbonated"))
      .all()
      .sort((a, b) => a.rank - b.rank);
    expect(carbonated.map((r) => [r.foodCode, r.rank])).toEqual([
      ["LIGHT", 1],
      ["COLA", 2],
    ]);

    const snack = db
      .select()
      .from(categoryRanking)
      .where(eq(categoryRanking.categoryId, "snack_chip"))
      .all();
    // UNGRAD excluded; better grade (HEALTHY=A) ranks ahead of worse (BISCUIT=E).
    expect(snack.map((r) => r.foodCode).sort()).toEqual(["BISCUIT", "HEALTHY"]);
    const healthy = snack.find((r) => r.foodCode === "HEALTHY")!;
    const biscuit = snack.find((r) => r.foodCode === "BISCUIT")!;
    expect(healthy.rank).toBeLessThan(biscuit.rank);
  });

  it("leaves no gradeless window — grades exist for every loaded product post-swap", () => {
    swapAndRecompute(db, PAIRS, AT);
    // Every product has a grade_result row (atomicity: §7).
    expect(db.select().from(gradeResult).all()).toHaveLength(5);
  });
});

describe("snapshotAgg — trend history append (§12)", () => {
  it("appends one row per category with grade counts and NULL-excluded means", () => {
    const db = freshDb();
    swapAndRecompute(db, PAIRS, AT);
    snapshotAgg(db, "2026-07-07");

    const carb = db
      .select()
      .from(categoryAggSnapshot)
      .where(eq(categoryAggSnapshot.categoryId, "carbonated"))
      .get();
    expect(carb?.productCount).toBe(2);
    expect(carb?.gradeB).toBe(1);
    expect(carb?.gradeE).toBe(1);
    expect(carb?.avgHealthScore).toBe(6); // (0 + 12) / 2

    // A later date appends, not overwrites (history preserved).
    snapshotAgg(db, "2026-08-07");
    expect(db.select().from(categoryAggSnapshot).all().length).toBeGreaterThan(2);
  });
});
