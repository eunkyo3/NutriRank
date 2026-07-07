// Pearson correlation for the analytics dashboard (.omc/plans/mvp-scope-screens.md §4.4).
import { describe, expect, it } from "vitest";
import { pearson } from "@/lib/stats";

describe("pearson", () => {
  it("is +1 for a perfect positive linear relation", () => {
    expect(pearson([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }])).toBeCloseTo(1, 10);
  });

  it("is -1 for a perfect negative linear relation", () => {
    expect(pearson([{ x: 1, y: 6 }, { x: 2, y: 4 }, { x: 3, y: 2 }])).toBeCloseTo(-1, 10);
  });

  it("returns null with fewer than 2 points or zero variance", () => {
    expect(pearson([])).toBeNull();
    expect(pearson([{ x: 1, y: 1 }])).toBeNull();
    expect(pearson([{ x: 1, y: 5 }, { x: 1, y: 9 }])).toBeNull(); // x has no variance
  });
});
