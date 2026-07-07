// Bucket-selection logic for point tables (.omc/plans/grading-spec.md §7),
// tested with a synthetic table so it is independent of the 2023 Nutri-Score
// numbers (those are golden-tested separately once transcribed).
import { describe, expect, it } from "vitest";
import { type PointTable, pointsFor } from "@/lib/grading/point-table";

// Synthetic: ≤1 →0, ≤5 →1, ≤10 →2, else →3.
const TABLE: PointTable = [
  { maxInclusive: 1, points: 0 },
  { maxInclusive: 5, points: 1 },
  { maxInclusive: 10, points: 2 },
  { maxInclusive: Infinity, points: 3 },
];

describe("pointsFor (§7 stepping)", () => {
  it("picks the bucket for values inside a range", () => {
    expect(pointsFor(0, TABLE)).toBe(0);
    expect(pointsFor(3, TABLE)).toBe(1);
    expect(pointsFor(7, TABLE)).toBe(2);
    expect(pointsFor(999, TABLE)).toBe(3);
  });

  it("treats the upper bound as inclusive", () => {
    expect(pointsFor(1, TABLE)).toBe(0);
    expect(pointsFor(5, TABLE)).toBe(1);
    expect(pointsFor(10, TABLE)).toBe(2);
  });

  it("routes above-max values to the Infinity bucket", () => {
    expect(pointsFor(10.0001, TABLE)).toBe(3);
  });

  it("throws on a table with no catch-all bucket (misconfiguration)", () => {
    const broken: PointTable = [{ maxInclusive: 5, points: 0 }];
    expect(() => pointsFor(6, broken)).toThrow(/Infinity/);
  });
});
