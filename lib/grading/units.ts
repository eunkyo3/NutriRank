// Deterministic unit conversions for the 2023 Nutri-Score algorithm
// (.omc/plans/grading-spec.md §5). The 2023 tables are keyed on energy in kJ and
// on salt in grams, but MFDS data provides kcal and sodium(mg) — convert here.
//
// Rounding rule (§5): round the converted value to 3 decimal places with a fixed
// half-up rule so the pipeline is fully deterministic (grading-spec §12 AC).

// Round to 3 decimals, half-up. The + EPSILON nudge keeps exact halves that land
// just below their float representation (e.g. 0.0025) from rounding down.
export function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

// kcal → kJ. Nutri-Score energy point tables are expressed in kJ. (§5)
export function kcalToKj(energyKcal: number): number {
  return round3(energyKcal * 4.184);
}

// sodium(mg) → salt(g). The 2023 revision scores salt in grams, not sodium;
// salt = sodium × 2.5 (NaCl/Na mass ratio), mg → g via /1000. (§5)
export function sodiumMgToSaltG(sodiumMg: number): number {
  return round3((sodiumMg * 2.5) / 1000);
}
