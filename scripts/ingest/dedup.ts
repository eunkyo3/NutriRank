// Dedup by 식품코드 keeping the latest 데이터생성일자 record
// (.omc/plans/data-pipeline-spec.md §6, §11 AC). Cross-product dedup (different
// codes, same product) is explicitly deferred to Phase 2.

export interface DedupableRecord {
  foodCode: string;
  dataGenDate: string | null; // 데이터생성일자, "YYYY-MM-DD" / "YYYYMMDD"
}

// Keep one record per foodCode — the newest dataGenDate. A null date sorts oldest
// (a dated record always wins over an undated one). Lexical compare is correct
// for zero-padded date strings.
export function dedupByFoodCode<T extends DedupableRecord>(records: readonly T[]): T[] {
  const byCode = new Map<string, T>();
  for (const rec of records) {
    const existing = byCode.get(rec.foodCode);
    if (existing === undefined || isNewer(rec.dataGenDate, existing.dataGenDate)) {
      byCode.set(rec.foodCode, rec);
    }
  }
  return [...byCode.values()];
}

function isNewer(candidate: string | null, current: string | null): boolean {
  if (candidate === null) return false;
  if (current === null) return true;
  // Canonicalize to digits-only so "2026-01-01" and "20260101" compare correctly
  // even if the source mixes formats (both become 8-digit YYYYMMDD).
  return digitsOnly(candidate) > digitsOnly(current);
}

function digitsOnly(date: string): string {
  return date.replace(/\D/g, "");
}
