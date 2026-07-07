// 2023 Nutri-Score point tables + grade cutoffs, transcribed from the primary
// Scientific Committee reports. Full transcription, provenance, and boundary
// semantics: docs/reference/nutriscore-2023-tables.md.
//
// Sources (see research file for URLs/pages):
//   [MAIN] "Update of the Nutri-Score algorithm" (Scientific Committee, 2022) —
//          general/solid foods. Recap §1.1–1.4.
//   [BEV]  "Update of the Nutri-Score algorithm for beverages" (2023). Recap §1.1–1.3.
//
// Encoding (see point-table.ts): each row {maxInclusive, points} means "value ≤
// maxInclusive (and above the previous row) → points". A row's maxInclusive is
// the ">threshold" that the *next* point level requires, so a value exactly on a
// boundary stays at the lower point level — matching the report's rule "award =
// count of thresholds strictly exceeded" (research Risk #4).
//
// UNITS: energy tables are keyed in kJ (convert from kcal), salt tables in grams
// of salt (convert from sodium mg) — see units.ts. Sugars/satfat/fibre/protein
// are the raw g/100g(ml) values.
import type { PointTable } from "./point-table";
import type { HealthGrade } from "./types";

// Version tag persisted with each grade_result (data-model schema algorithm_version).
export const ALGORITHM_VERSION = "nutriscore-2023-v1";

// When negative total A ≥ this, protein points are dropped from the score
// (solids only; cheese is exempt but cheese is out of NutriRank v1 scope). [MAIN] §1.3
export const PROTEIN_CAP_A_THRESHOLD = 11;

// ── SOLID / general-foods tables [MAIN] Recap §1.1–1.2 ───────────────────────

const SOLID_ENERGY_KJ: PointTable = [
  { maxInclusive: 335, points: 0 },
  { maxInclusive: 670, points: 1 },
  { maxInclusive: 1005, points: 2 },
  { maxInclusive: 1340, points: 3 },
  { maxInclusive: 1675, points: 4 },
  { maxInclusive: 2010, points: 5 },
  { maxInclusive: 2345, points: 6 },
  { maxInclusive: 2680, points: 7 },
  { maxInclusive: 3015, points: 8 },
  { maxInclusive: 3350, points: 9 },
  { maxInclusive: Infinity, points: 10 },
];

const SOLID_SUGARS_G: PointTable = [
  { maxInclusive: 3.4, points: 0 },
  { maxInclusive: 6.8, points: 1 },
  { maxInclusive: 10, points: 2 },
  { maxInclusive: 14, points: 3 },
  { maxInclusive: 17, points: 4 },
  { maxInclusive: 20, points: 5 },
  { maxInclusive: 24, points: 6 },
  { maxInclusive: 27, points: 7 },
  { maxInclusive: 31, points: 8 },
  { maxInclusive: 34, points: 9 },
  { maxInclusive: 37, points: 10 },
  { maxInclusive: 41, points: 11 },
  { maxInclusive: 44, points: 12 },
  { maxInclusive: 48, points: 13 },
  { maxInclusive: 51, points: 14 },
  { maxInclusive: Infinity, points: 15 },
];

// Saturated fat 1 g/step, 0–10. Shared by solids and beverages. [MAIN]/[BEV] Recap §1.1
const SATFAT_G: PointTable = [
  { maxInclusive: 1, points: 0 },
  { maxInclusive: 2, points: 1 },
  { maxInclusive: 3, points: 2 },
  { maxInclusive: 4, points: 3 },
  { maxInclusive: 5, points: 4 },
  { maxInclusive: 6, points: 5 },
  { maxInclusive: 7, points: 6 },
  { maxInclusive: 8, points: 7 },
  { maxInclusive: 9, points: 8 },
  { maxInclusive: 10, points: 9 },
  { maxInclusive: Infinity, points: 10 },
];

// Salt 0.2 g/step, 0–20 (grams of SALT, not sodium). Shared solids/beverages. [MAIN]/[BEV] Recap §1.1
const SALT_G: PointTable = [
  { maxInclusive: 0.2, points: 0 },
  { maxInclusive: 0.4, points: 1 },
  { maxInclusive: 0.6, points: 2 },
  { maxInclusive: 0.8, points: 3 },
  { maxInclusive: 1.0, points: 4 },
  { maxInclusive: 1.2, points: 5 },
  { maxInclusive: 1.4, points: 6 },
  { maxInclusive: 1.6, points: 7 },
  { maxInclusive: 1.8, points: 8 },
  { maxInclusive: 2.0, points: 9 },
  { maxInclusive: 2.2, points: 10 },
  { maxInclusive: 2.4, points: 11 },
  { maxInclusive: 2.6, points: 12 },
  { maxInclusive: 2.8, points: 13 },
  { maxInclusive: 3.0, points: 14 },
  { maxInclusive: 3.2, points: 15 },
  { maxInclusive: 3.4, points: 16 },
  { maxInclusive: 3.6, points: 17 },
  { maxInclusive: 3.8, points: 18 },
  { maxInclusive: 4.0, points: 19 },
  { maxInclusive: Infinity, points: 20 },
];

const SOLID_PROTEIN_G: PointTable = [
  { maxInclusive: 2.4, points: 0 },
  { maxInclusive: 4.8, points: 1 },
  { maxInclusive: 7.2, points: 2 },
  { maxInclusive: 9.6, points: 3 },
  { maxInclusive: 12, points: 4 },
  { maxInclusive: 14, points: 5 },
  { maxInclusive: 17, points: 6 },
  { maxInclusive: Infinity, points: 7 },
];

// Fibre (AOAC) 0–5. Shared by solids and beverages. [MAIN]/[BEV] Recap §1.2
const FIBRE_G: PointTable = [
  { maxInclusive: 3.0, points: 0 },
  { maxInclusive: 4.1, points: 1 },
  { maxInclusive: 5.2, points: 2 },
  { maxInclusive: 6.3, points: 3 },
  { maxInclusive: 7.4, points: 4 },
  { maxInclusive: Infinity, points: 5 },
];

// ── BEVERAGE tables [BEV] Recap §1.1–1.2 ─────────────────────────────────────
// Energy and sugars are non-linear and beverage-specific; satfat/salt/fibre are
// shared with solids; protein has a beverage-specific scale.

const BEVERAGE_ENERGY_KJ: PointTable = [
  { maxInclusive: 30, points: 0 },
  { maxInclusive: 90, points: 1 },
  { maxInclusive: 150, points: 2 },
  { maxInclusive: 210, points: 3 },
  { maxInclusive: 240, points: 4 },
  { maxInclusive: 270, points: 5 },
  { maxInclusive: 300, points: 6 },
  { maxInclusive: 330, points: 7 },
  { maxInclusive: 360, points: 8 },
  { maxInclusive: 390, points: 9 },
  { maxInclusive: Infinity, points: 10 },
];

const BEVERAGE_SUGARS_G: PointTable = [
  { maxInclusive: 0.5, points: 0 },
  { maxInclusive: 2, points: 1 },
  { maxInclusive: 3.5, points: 2 },
  { maxInclusive: 5, points: 3 },
  { maxInclusive: 6, points: 4 },
  { maxInclusive: 7, points: 5 },
  { maxInclusive: 8, points: 6 },
  { maxInclusive: 9, points: 7 },
  { maxInclusive: 10, points: 8 },
  { maxInclusive: 11, points: 9 },
  { maxInclusive: Infinity, points: 10 },
];

const BEVERAGE_PROTEIN_G: PointTable = [
  { maxInclusive: 1.2, points: 0 },
  { maxInclusive: 1.5, points: 1 },
  { maxInclusive: 1.8, points: 2 },
  { maxInclusive: 2.1, points: 3 },
  { maxInclusive: 2.4, points: 4 },
  { maxInclusive: 2.7, points: 5 },
  { maxInclusive: 3.0, points: 6 },
  { maxInclusive: Infinity, points: 7 },
];

// Point tables grouped by product type. index.ts selects the set by product type.
export interface ComponentTables {
  readonly energyKj: PointTable;
  readonly sugarsG: PointTable;
  readonly satfatG: PointTable;
  readonly saltG: PointTable;
  readonly proteinG: PointTable;
  readonly fibreG: PointTable;
}

export const SOLID_TABLES: ComponentTables = {
  energyKj: SOLID_ENERGY_KJ,
  sugarsG: SOLID_SUGARS_G,
  satfatG: SATFAT_G,
  saltG: SALT_G,
  proteinG: SOLID_PROTEIN_G,
  fibreG: FIBRE_G,
};

export const BEVERAGE_TABLES: ComponentTables = {
  energyKj: BEVERAGE_ENERGY_KJ,
  sugarsG: BEVERAGE_SUGARS_G,
  satfatG: SATFAT_G,
  saltG: SALT_G,
  proteinG: BEVERAGE_PROTEIN_G,
  fibreG: FIBRE_G,
};

// ── Grade cutoffs ────────────────────────────────────────────────────────────

// Solid A–E (2023). A ≤ 0 (NOT ≤ -1 — the 2023 report shifted A/B up one point;
// research Risk #1). Ranges inclusive. [MAIN] §1.8.3 + Recap §1.4
export function solidGradeFromScore(fns: number): HealthGrade {
  if (fns <= 0) return "A";
  if (fns <= 2) return "B";
  if (fns <= 10) return "C";
  if (fns <= 18) return "D";
  return "E";
}

// Beverage A–E (2023). Grade A is reserved for plain WATER only; NutriRank has no
// water category and cannot identify water, so a non-water beverage with FNS ≤ 2
// grades B, never A. [BEV] Recap §1.3 (water-only-A rule, research §2.4)
export function beverageGradeFromScore(fns: number): HealthGrade {
  if (fns <= 2) return "B";
  if (fns <= 6) return "C";
  if (fns <= 9) return "D";
  return "E";
}
