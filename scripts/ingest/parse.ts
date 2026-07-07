// Deterministic value parsing for normalization (.omc/plans/data-pipeline-spec.md §5).
// The load-bearing rule: preserve 미측정 as NULL and a measured 0 as 0 — never
// collapse a blank/"해당없음" to 0, which would let ungradable products score
// (grading-spec §9, data-model §6).

// Source tokens that mean "not measured" rather than a numeric value.
const MISSING_TOKENS = new Set(["", "해당없음", "해당 없음", "-", "n/a", "na", "null"]);

// Raw nutrient string → number | null. Blank/sentinel/non-numeric → null (미측정);
// a numeric "0" stays 0 (measured). Thousands separators are tolerated.
export function parseNutrientValue(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const trimmed = raw.trim();
  if (MISSING_TOKENS.has(trimmed.toLowerCase())) return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Manufacturer / free-text fields: "해당없음" and blanks become NULL (§5.4).
export function parseNullableText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "해당없음" || trimmed === "해당 없음") return null;
  return trimmed;
}
