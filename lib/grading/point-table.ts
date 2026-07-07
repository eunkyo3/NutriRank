// Pure stepping primitive for Nutri-Score point tables
// (.omc/plans/grading-spec.md §7: "각 컴포넌트를 [(upper_bound, points), ...]
// 형태의 순수 데이터 테이블로 코드화"). The actual 2023 numeric tables live in
// tables.ts (transcribed from the primary source); this file only owns the
// bucket-selection logic so it can be unit-tested independent of those numbers.

// One row = "value ≤ maxInclusive (and above the previous row's bound) → points".
// Rows are ordered ascending by maxInclusive; the final row uses Infinity to
// catch everything above the last real threshold.
export interface PointBucket {
  readonly maxInclusive: number;
  readonly points: number;
}

export type PointTable = readonly PointBucket[];

// Returns the points for `value`: the first bucket whose upper bound the value
// does not exceed. Upper-inclusive semantics (value ≤ maxInclusive) match the
// Nutri-Score point tables; the primary-source transcription in tables.ts pins
// the exact boundaries and this function honors them.
export function pointsFor(value: number, table: PointTable): number {
  for (const bucket of table) {
    if (value <= bucket.maxInclusive) return bucket.points;
  }
  // A well-formed table ends with maxInclusive = Infinity, so this is only
  // reached if a table is misconfigured — fail loud rather than silently 0.
  throw new Error(
    `pointsFor: no bucket matched value ${value}; table must end with maxInclusive = Infinity`,
  );
}
