// End-to-end ingest orchestration (.omc/plans/data-pipeline-spec.md §3, §11 AC),
// driven by a FixtureAdapter so it needs no network. Exercises fetch → normalize
// → map → filter → dedup → gate → atomic swap → grade → rank → agg against a real
// in-memory SQLite (migrations + category seed + a fixture mfds_category_map).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { seedConsumerCategories } from "@/db/seed";
import * as schema from "@/db/schema";
import { categoryRanking, gradeResult, mfdsCategoryMap, product, productNutrient } from "@/db/schema";
import { FixtureAdapter } from "@/scripts/ingest/adapters/fixture";
import { runIngest } from "@/scripts/ingest/orchestrator";
import type { Db } from "@/scripts/ingest/persist";
import type { SourceRecord } from "@/scripts/ingest/source";

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  seedConsumerCategories(db);
  // Fixture curation: 세분류 0101 → carbonated (음료), 0201 → snack_chip (고형).
  db.insert(mfdsCategoryMap)
    .values([
      { mfdsLevel: "detail", mfdsCode: "0101", mfdsName: "탄산음료", categoryId: "carbonated", mapVersion: 1 },
      { mfdsLevel: "detail", mfdsCode: "0201", mfdsName: "감자칩", categoryId: "snack_chip", mapVersion: 1 },
    ])
    .run();
  return db;
}

// Minimal SourceRecord with blanks; override only what a case needs.
function rec(over: Partial<SourceRecord>): SourceRecord {
  return {
    foodCode: "X",
    name: "제품",
    manufacturer: null,
    referenceRaw: "100g",
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

// Cola (beverage, maps to carbonated) → score 12 → E.
const COLA_NEW = rec({
  foodCode: "P1", name: "콜라", referenceRaw: "100ml", mfdsL4Code: "0101", mfdsL4Name: "탄산음료",
  energyKcalRaw: "43", sugarsRaw: "10.6", satfatRaw: "0", sodiumRaw: "0", fiberRaw: "0", proteinRaw: "0",
  dataGenDate: "2025-06-01",
});
// Older duplicate of P1 — must be dropped by dedup.
const COLA_OLD = rec({ ...COLA_NEW, sugarsRaw: "99", dataGenDate: "2024-01-01" });
// Healthy snack (solid, snack_chip) → score −3 → A.
const SNACK = rec({
  foodCode: "P2", name: "건강스낵", referenceRaw: "100g", mfdsL4Code: "0201", mfdsL4Name: "감자칩",
  energyKcalRaw: "70", sugarsRaw: "2", satfatRaw: "0.5", sodiumRaw: "40", fiberRaw: "4", proteinRaw: "5",
});
// Unmapped 세분류 → filtered out, reported.
const UNMAPPED = rec({ foodCode: "P3", name: "라면", referenceRaw: "100g", mfdsL4Code: "9999", mfdsL4Name: "유탕면" });
// Snack with blank sugars → 미측정 → ungradable, excluded from ranking.
const MISSING = rec({
  foodCode: "P4", name: "미측정스낵", referenceRaw: "100g", mfdsL4Code: "0201",
  energyKcalRaw: "100", sugarsRaw: "", satfatRaw: "5", sodiumRaw: "100", fiberRaw: "0", proteinRaw: "2",
});

const ALL = [COLA_NEW, COLA_OLD, SNACK, UNMAPPED, MISSING];
const RUN = { ingestedAt: "2026-07-07T00:00:00Z", snapshotDate: "2026-07-07" };

describe("runIngest — full pipeline via fixture adapter (§3, §11)", () => {
  it("maps, filters, dedups, swaps, grades, ranks and reports", async () => {
    const db = freshDb();
    const report = await runIngest({ adapter: new FixtureAdapter(ALL), db, ...RUN });

    expect(report.swapped).toBe(true);
    // P3 unmapped filtered out; P1 duplicate deduped → P1, P2, P4 loaded.
    expect(db.select().from(product).all().map((p) => p.foodCode).sort()).toEqual(["P1", "P2", "P4"]);
    // Unmapped 세분류 9999 is reported for the next curation round.
    expect(report.unmapped).toEqual([{ code: "9999", name: "유탕면", count: 1 }]);
    expect(report.filteredOutCount).toBe(1);

    // Grades from the 2023 algorithm.
    const grades = Object.fromEntries(db.select().from(gradeResult).all().map((r) => [r.foodCode, r.healthGrade]));
    expect(grades.P1).toBe("E");
    expect(grades.P2).toBe("A");
    expect(grades.P4).toBeNull(); // ungradable

    // Ranking excludes the ungradable P4 (only P1, P2 are gradable).
    expect(report.gradableCount).toBe(2);
    const ranked = db.select().from(categoryRanking).all().map((r) => r.foodCode).sort();
    expect(ranked).toEqual(["P1", "P2"]);
  });

  it("dedup keeps the newest 데이터생성일자 (P1 = 콜라, not the 99g dup)", async () => {
    const db = freshDb();
    await runIngest({ adapter: new FixtureAdapter(ALL), db, ...RUN });
    const cola = db.select().from(productNutrient).all().find((n) => n.foodCode === "P1");
    expect(cola?.sugarsG).toBe(10.6);
  });

  it("preserves 미측정 NULL end-to-end (P4 sugars stays null)", async () => {
    const db = freshDb();
    await runIngest({ adapter: new FixtureAdapter(ALL), db, ...RUN });
    const p4 = db.select().from(productNutrient).all().find((n) => n.foodCode === "P4");
    expect(p4?.sugarsG).toBeNull();
    expect(p4?.satfatG).toBe(5);
  });

  it("normalizes 기준량 to product_type (100ml→beverage, 100g→solid)", async () => {
    const db = freshDb();
    await runIngest({ adapter: new FixtureAdapter(ALL), db, ...RUN });
    const byCode = Object.fromEntries(db.select().from(product).all().map((p) => [p.foodCode, p.productType]));
    expect(byCode.P1).toBe("beverage");
    expect(byCode.P2).toBe("solid");
  });

  it("reports 의심 0 비율 and per-category 결측률 (§8/§11 AC)", async () => {
    const db = freshDb();
    const report = await runIngest({ adapter: new FixtureAdapter(ALL), db, ...RUN });
    // Loaded negatives: P1 has satfat=0 & sodium=0 (2 measured zeros); others none.
    // measured negatives = 11, zeros = 2.
    expect(report.qualityMetrics.suspiciousZeroRate).toBeCloseTo(2 / 11, 5);
    // snack_chip has P4 (missing sugars) of 2 products → 0.5 missing rate.
    const snack = report.qualityMetrics.categoryMissingRates.find((c) => c.categoryId === "snack_chip");
    expect(snack?.missingRate).toBe(0.5);
  });

  it("blocks the swap and leaves live tables unchanged when collected != totalCount (§8)", async () => {
    const db = freshDb();
    // Pretend the source claims 999 total but only these rows came back.
    const report = await runIngest({ adapter: new FixtureAdapter(ALL, 999), db, ...RUN });
    expect(report.swapped).toBe(false);
    expect(report.gate.pass).toBe(false);
    expect(report.gate.reasons.some((r) => r.startsWith("count_mismatch"))).toBe(true);
    expect(db.select().from(product).all()).toHaveLength(0); // unchanged (empty)
  });
});
