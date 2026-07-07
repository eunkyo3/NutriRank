# Nutri-Score 2023 Algorithm — Official Threshold Tables (Primary-Source Transcription)

**Purpose:** Exact numeric point-allocation tables and grade cutoffs for the updated (2023)
Nutri-Score algorithm, transcribed verbatim from the Scientific Committee reports so the
engineering team can implement the grading logic exactly.

**Status:** Values below are transcribed from the two official Scientific Committee reports
(PDFs). Where the PDF's tabular layout was ambiguous, the reading was cross-checked against the
narrative text of the *same* report (which states the point-allocation step sizes and reference
values explicitly) and against the report's own "Recap" annex tables. Discrepancies with
secondary web sources are flagged in Section 4.

---

## Primary sources

| ID | Document | Host / URL | Sections used |
|----|----------|-----------|---------------|
| **[MAIN]** | *Update of the Nutri-Score algorithm — Report from the Scientific Committee of the Nutri-Score (V2), 2022* (main algorithm: general/solid foods + fats/oils/nuts/seeds) | AESAN (Spanish Food Safety Agency), official Nutri-Score document mirror — `https://www.aesan.gob.es/AECOSAN/docs/documentos/Nutri_Score/2022_main_algorithm_report_update_FINAL.pdf` | §1.8.3 "Final thresholds" (PDF p.49–50); Annex "Recap of the update in the main algorithm" §1.1–1.4 (PDF p.129–131) |
| **[BEV]** | *Update of the Nutri-Score algorithm for beverages — Report from the Scientific Committee of the Nutri-Score, 2023* | AESAN — `https://www.aesan.gob.es/AECOSAN/docs/documentos/Nutri_Score/report_beverages_2023.pdf` | §6.6 "Non-nutritive sweeteners" (PDF p.46–47); Annex "Recap of the update algorithm for beverages" §1.1–1.3 (PDF p.72–74) |

**Cross-check / secondary (NOT authoritative for numbers):**
- Nutri-Score Scientific team blog (official): `https://nutriscore.blog/2022/08/04/...solid-foods/` and `.../2022/12/16/...beverages/`
- *Nutri-Score 2023 update*, Nature Food (2024): `https://www.nature.com/articles/s43016-024-00920-3`
- Wikipedia "Nutri-Score" and eclarion methodology page — **note: several of these publish the OLD (2017) A/B cutoff (A ≤ -1); see Section 4, Risk #1.**

Both reports were also published (identical content) by Santé publique France; AESAN hosts a
machine-readable mirror, which is what was fetched and text-extracted here.

---

## 1. GENERAL / SOLID FOODS (2023 "main" algorithm)

Applies to all solid foods **except** the fats/oils/nuts/seeds category (which has its own
"energy-from-saturates" and "%saturates/lipids" variant — see §1.9) and **except** all
beverages (Section 2).

### Boundary semantics (READ FIRST)
- Each unfavourable component awards **the number of thresholds the value strictly exceeds**.
- In the tables below, point *n* is awarded when `value > (threshold shown for n)`, and the
  value has not exceeded the next threshold. **Equality stays at the lower point** (a value
  *equal to* a step boundary does NOT advance).
- Point **0** = value at or below the first threshold (`≤`). (For Energy the recap prints
  "< 335" for 0 points; all higher steps use strict `>`. Treat 0 pts as `≤ 335`; see Risk #4.)

### 1.1 Unfavourable ("A" / negative) components

**Energy** (kJ / 100 g) — 0–10 points, linear 335 kJ/step (= 3.75% of 8,368 kJ ref) — [MAIN] Recap §1.1
| Points | Threshold |
|--:|:--|
| 0 | ≤ 335 |
| 1 | > 335 |
| 2 | > 670 |
| 3 | > 1005 |
| 4 | > 1340 |
| 5 | > 1675 |
| 6 | > 2010 |
| 7 | > 2345 |
| 8 | > 2680 |
| 9 | > 3015 |
| 10 | > 3350 |

**Sugars** (g / 100 g) — 0–15 points (EXPANDED in 2023 from the old 0–10) — [MAIN] Recap §1.1
Scale aligned to FIC: 3.75% of 90 g ref = 3.4 g/step for the first steps, then non-linear.
| Points | Threshold | | Points | Threshold |
|--:|:--|--|--:|:--|
| 0 | ≤ 3.4 | | 8 | > 27 |
| 1 | > 3.4 | | 9 | > 31 |
| 2 | > 6.8 | | 10 | > 34 |
| 3 | > 10  | | 11 | > 37 |
| 4 | > 14  | | 12 | > 41 |
| 5 | > 17  | | 13 | > 44 |
| 6 | > 20  | | 14 | > 48 |
| 7 | > 24  | | 15 | > 51 |

**Saturated fat / saturated fatty acids** (g / 100 g) — 0–10 points, 1 g/step — [MAIN] Recap §1.1
| Points | Threshold |
|--:|:--|
| 0 | ≤ 1 |
| 1 | > 1 |
| 2 | > 2 |
| 3 | > 3 |
| 4 | > 4 |
| 5 | > 5 |
| 6 | > 6 |
| 7 | > 7 |
| 8 | > 8 |
| 9 | > 9 |
| 10 | > 10 |

**Salt** (g SALT / 100 g — NOT sodium) — 0–20 points, 0.2 g/step (= 3.75% of 6 g ref) — [MAIN] Recap §1.1
Confirmed: the 2023 component is expressed in **grams of SALT** (the 2017 algorithm used
sodium mg). 21 levels (0–20).
| Points | Threshold | | Points | Threshold |
|--:|:--|--|--:|:--|
| 0 | ≤ 0.2 | | 11 | > 2.2 |
| 1 | > 0.2 | | 12 | > 2.4 |
| 2 | > 0.4 | | 13 | > 2.6 |
| 3 | > 0.6 | | 14 | > 2.8 |
| 4 | > 0.8 | | 15 | > 3.0 |
| 5 | > 1.0 | | 16 | > 3.2 |
| 6 | > 1.2 | | 17 | > 3.4 |
| 7 | > 1.4 | | 18 | > 3.6 |
| 8 | > 1.6 | | 19 | > 3.8 |
| 9 | > 1.8 | | 20 | > 4.0 |
| 10 | > 2.0 | | | |

### 1.2 Favourable ("C" / positive) components

**Protein** (g / 100 g) — 0–7 points (EXPANDED in 2023 from old 0–5) — [MAIN] Recap §1.2
Scale = 3.75% of 64 g ref, non-linear at the top.
| Points | Threshold |
|--:|:--|
| 0 | ≤ 2.4 |
| 1 | > 2.4 |
| 2 | > 4.8 |
| 3 | > 7.2 |
| 4 | > 9.6 |
| 5 | > 12 |
| 6 | > 14 |
| 7 | > 17 |
*Special rule: for **red-meat products** protein is capped at max 2 points (beef, veal, pork,
lamb, plus game/venison, horse, donkey, goat, camel, kangaroo). — [MAIN] Recap §1.2.1*

**Fibre** (g / 100 g) — 0–5 points — [MAIN] Recap §1.2
Start at "source of fibre" claim value; scale 3.75% of 30 g ref. (Report expresses fibre as
g/100 g; it does not restate the analytical method in the recap — historically Nutri-Score
uses **AOAC**; see Risk #5.)
| Points | Threshold |
|--:|:--|
| 0 | ≤ 3.0 |
| 1 | > 3.0 |
| 2 | > 4.1 |
| 3 | > 5.2 |
| 4 | > 6.3 |
| 5 | > 7.4 |

**Fruit, vegetables & legumes** (% of product) — points 0/1/2/5 — [MAIN] Recap §1.2
2023 removed **nuts and oils** from the qualifying ingredients (they moved to the fats/nuts category).
| Points | Threshold |
|--:|:--|
| 0 | ≤ 40 |
| 1 | > 40 |
| 2 | > 60 |
| 5 | > 80 |
> **Dataset note:** NutriRank has NO fruit/veg/legume field ⇒ this component is always **0**.
> See Risk #2 for how that interacts with the protein cap.

### 1.3 Final score computation & protein cap — [MAIN] Recap §1.3

```
A (unfavourable total) = energy_pts + sugars_pts + satfat_pts + salt_pts        # 0..40
C_full                 = protein_pts + fibre_pts + fruitveg_pts

IF  A >= 11  AND product is NOT cheese:
        # proteins are EXCLUDED
        FNS = A - (fibre_pts + fruitveg_pts)
ELSE:   # A < 11, OR the product is cheese
        FNS = A - C_full          # = A - (protein_pts + fibre_pts + fruitveg_pts)
```

- **Protein-cap threshold = A ≥ 11.** When the unfavourable total reaches 11+, protein points
  are dropped from the sum.
- **Only remaining exemption is CHEESE** (cheese always keeps its protein points, even at A ≥ 11).
- **2023 CHANGE — the old "fruit/veg points = 5" exemption was REMOVED.** [MAIN] §1.8.1
  states verbatim: *"a removal of the protein cap exemption for products with A points ≥ 11 and
  fruit and vegetable points ≥ 5 … the protein cap exemption for cheeses is maintained."* In the
  2017 algorithm, protein was still counted at N ≥ 11 if fruit/veg/nut points = 5; **that clause
  no longer exists in 2023.** (Rationale: nuts moved out of this algorithm, making the clause obsolete.)

### 1.4 A–E grade cutoffs — general/solid foods (2023) — [MAIN] §1.8.3 (p.49–50) + Recap §1.4
| FNS score | Grade |
|:--|:--:|
| **-15 to 0**  (i.e. **≤ 0**) | **A** |
| 1 to 2 | B |
| 3 to 10 | C |
| 11 to 18 | D |
| 19 to 40  (i.e. **≥ 19**) | E |

Boundary semantics: ranges are **inclusive** of both endpoints. Score `0 → A`, `1 → B`,
`10 → C`, `11 → D`, `18 → D`, `19 → E`. (-15 and 40 are the theoretical min/max; implement as
"≤ 0 ⇒ A" and "≥ 19 ⇒ E".)

**Verbatim provenance:** [MAIN] p.49: *"the updated algorithm required a modification of the A/B
threshold only, up by one point … the shift from 0/-1 to 0/1"* — i.e. **A now includes 0**
(2017 had A ≤ -1). This is the single most error-prone difference vs. 2017 — see Risk #1.

### 1.9 Fats / oils / nuts / seeds sub-category (informational)
A separate variant of the unfavourable table applies (Energy replaced by **Energy-from-saturates**
in 120 kJ steps, and a **%saturates/lipids** column instead of g satfat). Grade cutoffs are
shifted: **A = -15 to -6, …** ([MAIN] Recap §2). *Only relevant if NutriRank classifies pure
fats/oils/nuts; flagged so it is not applied by accident to general foods.*

---

## 2. BEVERAGES (2023 algorithm)

Scope now includes water, water-based drinks, juices/nectars, smoothies, coffee/tea, **and
(new in 2023) milk, milk-based drinks, fermented-milk drinks, and plant-based "milk" analogues.**
Alcohol > 1.2% vol remains out of scope. — [BEV] Recap "Products in the category" (p.72)

### 2.1 Unfavourable ("A") components — [BEV] Recap §1.1 (p.72)

Same boundary semantics as §1.1 (award the number of thresholds strictly exceeded).

**Energy** (kJ / 100 mL) — 0–10 points, **non-linear** (30 kJ base; +60/step to 3 pts; +30/step to 10)
| Points | Upper threshold |
|--:|:--|
| 0 | ≤ 30 |
| 1 | ≤ 90  (> 30) |
| 2 | ≤ 150 (> 90) |
| 3 | ≤ 210 (> 150) |
| 4 | ≤ 240 (> 210) |
| 5 | ≤ 270 (> 240) |
| 6 | ≤ 300 (> 270) |
| 7 | ≤ 330 (> 300) |
| 8 | ≤ 360 (> 330) |
| 9 | ≤ 390 (> 360) |
| 10 | > 390 |

**Sugars** (g / 100 mL) — 0–10 points, **non-linear** (0.5 g base; +1.5/step to 3 pts; +1/step to 10)
| Points | Upper threshold |
|--:|:--|
| 0 | ≤ 0.5 |
| 1 | ≤ 2   (> 0.5) |
| 2 | ≤ 3.5 (> 2) |
| 3 | ≤ 5   (> 3.5) |
| 4 | ≤ 6   (> 5) |
| 5 | ≤ 7   (> 6) |
| 6 | ≤ 8   (> 7) |
| 7 | ≤ 9   (> 8) |
| 8 | ≤ 10  (> 9) |
| 9 | ≤ 11  (> 10) |
| 10 | > 11 |

**Saturated fat** (g / 100 mL) — **same table as general foods** (0–10, 1 g/step): 0:≤1 … 10:>10. — [BEV] Recap §1.1
**Salt** (g / 100 mL) — **same table as general foods** (0–20, 0.2 g/step): 0:≤0.2 … 20:>4. — [BEV] Recap §1.1

**Non-nutritive sweeteners (NNS)** — presence/absence — [BEV] §6.6 (p.46) + Recap §1.1
| Condition | A points added |
|:--|:--:|
| At least one NNS present in ingredient list | **+4** |
| No NNS | 0 |
- Verbatim: *"Beverages containing NNS were allocated **4 A points** (i.e. as an unfavourable
  element)."* Detection is by **presence in the ingredient list** (not quantity).
- NNS list (the sugar-alcohols/sweeteners the committee names): E420 sorbitol, E421 mannitol,
  E953 isomalt, E965 maltitol, E966 lactitol, E967 xylitol, E968 erythritol, E956 alitame,
  E964 polyglycitol syrup — plus the intense sweeteners defined in [BEV] §4.3.1 (aspartame,
  acesulfame-K, sucralose, saccharin, cyclamate, steviol glycosides, etc.). *Implementers should
  use the report's full §4.3.1 list; the recap does not re-enumerate it (Risk #6).*
- These **+4 points are part of the A total** and flow through the normal `A − C` formula.

### 2.2 Favourable ("C") components — [BEV] Recap §1.2 (p.73)

**Protein** (g / 100 mL) — 0–7 points, **beverage-specific** linear scale (1.2 g base, +0.3/step)
| Points | Threshold |
|--:|:--|
| 0 | ≤ 1.2 |
| 1 | > 1.2 |
| 2 | > 1.5 |
| 3 | > 1.8 |
| 4 | > 2.1 |
| 5 | > 2.4 |
| 6 | > 2.7 |
| 7 | > 3.0 |

**Fibre** (g / 100 mL) — **same table as general foods** (0–5): 0:≤3, 1:>3, 2:>4.1, 3:>5.2, 4:>6.3, 5:>7.4. — [BEV] Recap §1.2
**Fruit, vegetables & legumes** (%) — beverage max is **6 points** at >80% (vs 5 for solids). — [BEV] §6.6 + Recap §1.2
> Dataset note: no FV field ⇒ always 0 for NutriRank, so the exact intermediate FV steps for
> beverages (which the recap renders ambiguously) are irrelevant to our implementation.

### 2.3 Final score computation — beverages — [BEV] Recap §1.3 (p.74)
```
A = energy_pts + sugars_pts + satfat_pts + salt_pts + nns_pts    # nns_pts ∈ {0, 4}
C = protein_pts + fibre_pts + fruitveg_pts
FNS = A - C
```
**There is NO protein cap for beverages.** [BEV] §6.6 verbatim: *"A removal of the protein cap
threshold (initially set for products with A points ≥ 11)."* Proteins are always counted.

### 2.4 A–E grade cutoffs — beverages (2023) — [BEV] Recap §1.3 (p.74)
| FNS score | Grade |
|:--|:--:|
| **(water only)** | **A** |
| **min to 2**  (≤ 2) | **B** |
| 3 to 6 | C |
| 7 to 9 | D |
| 10 to max  (≥ 10) | E |

- **Grade A is reserved for WATER only** — no other beverage can score A, regardless of its
  computed FNS. Implement as a hard rule: `if product is (plain) water → A; else grade from the
  B..E ranges even if FNS ≤ 2`. A non-water beverage with FNS ≤ 2 grades **B**, not A.
- Ranges inclusive. `2 → B`, `3 → C`, `6 → C`, `7 → D`, `9 → D`, `10 → E`.

---

## 3. Golden test vectors

> **HONESTY FLAG:** Neither primary report contains a fully worked single-product example with
> per-component points (they publish only aggregate database distributions). No official
> per-product worked example was found in the primary sources. The vectors below are therefore
> **derived deterministically from the transcribed tables in Sections 1–2** — full arithmetic
> shown. They are *algorithm-conformance vectors*: if your code reproduces them, your code
> matches the tables. Real-world grade alignment is noted where it is common knowledge, but the
> **expected outputs are defined by the tables, not by an external Nutri-Score authority.**
> All solids use FV = 0 (no dataset field).

### Solid foods (general algorithm)

| # | Product (illustrative) | E kJ | Sug g | SatFat g | Salt g | Fib g | Prot g | Cheese? |
|--|--|--:|--:|--:|--:|--:|--:|:--:|
| S1 | "Zero" reference (e.g. plain water-equivalent solid) | 0 | 0 | 0 | 0 | 0 | 0 | no |
| S2 | High-sugar biscuit | 2000 | 35 | 12 | 0.5 | 1.5 | 6 | no |
| S3 | Hard cheese | 1400 | 1 | 20 | 1.8 | 0 | 25 | **yes** |
| S4 | Same as S3 but NOT cheese (cap-effect demo) | 1400 | 1 | 20 | 1.8 | 0 | 25 | no |

- **S1:** A pts = 0+0+0+0 = 0; A<11 ⇒ C = prot0+fib0 = 0; FNS = 0 − 0 = **0 ⇒ A**.
- **S2:** energy 2000→6 (>1675, not >2010); sugars 35→10 (>34, not >37); satfat 12→10 (>10);
  salt 0.5→2 (>0.4, not >0.6). **A = 6+10+10+2 = 28.** A≥11 & not cheese ⇒ protein dropped;
  FNS = 28 − (fib0 + fv0) = **28 ⇒ E**.
- **S3:** energy 1400→4; sugars 1→0; satfat 20→10; salt 1.8→8 (>1.6, not >1.8… note 1.8 is not
  >1.8 ⇒ **8 pts**). **A = 4+0+10+8 = 22.** A≥11 **but cheese** ⇒ protein counted; protein
  25→7, fibre 0. C = 7. FNS = 22 − 7 = **15 ⇒ D**.
- **S4:** identical A = 22, but not cheese ⇒ protein dropped; FNS = 22 − 0 = **22 ⇒ E**.
  *(S3 vs S4 isolates the cheese exemption: D vs E.)*

### Beverages

| # | Product (illustrative) | E kJ | Sug g | SatFat g | Salt g | Prot g | NNS? | Water? |
|--|--|--:|--:|--:|--:|--:|:--:|:--:|
| B1 | Still/plain water | 0 | 0 | 0 | 0 | 0 | no | **yes** |
| B2 | Full-sugar cola | 180 | 10.6 | 0 | 0 | 0 | no | no |
| B3 | Diet cola (with NNS) | 1 | 0 | 0 | 0 | 0 | **yes** | no |
| B4 | Semi-skimmed milk | 190 | 4.8 | 1.0 | 0.1 | 3.3 | no | no |

- **B1:** A = 0; C = 0; FNS = 0. Product **is water ⇒ A** (special rule). *(Any non-water drink
  with FNS 0 would be B.)*
- **B2:** energy 180→3 (>150,≤210); sugars 10.6→9 (>10,≤11); satfat0, salt0, NNS0.
  **A = 3+9 = 12;** C = 0; FNS = 12 ⇒ **E** (≥10). *(Matches Coca-Cola Classic = E in practice.)*
- **B3:** energy 1→0; sugars 0→0; NNS present → +4. **A = 4;** C = 0; FNS = 4 ⇒ **C** (3–6).
  *(Demonstrates the +4 NNS penalty: a zero-energy sweetened drink lands in C, not A/B.)*
- **B4:** energy 190→3 (>150,≤210); sugars 4.8→3 (>3.5,≤5); satfat 1.0→0 (≤1); salt 0.1→0;
  NNS0. **A = 3+3 = 6.** protein 3.3→7 (>3.0), fibre0. C = 7. FNS = 6 − 7 = **-1 ⇒ B**
  (≤2, non-water ⇒ B). *(Plain milk grades B under the 2023 beverage algorithm.)*

---

## 4. Ambiguities, risks & 2017→2023 gotchas

**Risk #1 — A/B cutoff for solids (HIGH, correctness-critical).**
Multiple secondary sources (Wikipedia, some calculators) state solid **A ≤ -1 / B starts at 0**.
That is the **2017** cutoff. The 2023 primary report [MAIN] p.49 explicitly shifts the A/B
boundary "up by one point … from 0/-1 to 0/1", giving **A ≤ 0, B = 1–2**. **Use ≤ 0 ⇒ A.**
Do not copy the -1 value from web sources. (Fully resolved against the primary text; no residual
ambiguity — just a trap.)

**Risk #2 — Protein cap × missing FV field (MEDIUM).**
The cap rule is `A ≥ 11 ⇒ drop protein, unless cheese`. NutriRank has FV = 0 always, so the
*2017* "FV points = 5" exemption would never fire anyway — **and 2023 removed that exemption
entirely**, so there is no behavioural gap. Implement exactly: cap on A≥11, only cheese escapes.
Make sure "cheese" is a real product-category flag in the data model; if cheese cannot be
identified, high-protein cheeses will be over-penalised (E instead of D). Flag whether the
dataset can even identify cheese.

**Risk #3 — Salt is g of SALT, not sodium; and units differ solid vs bev only by basis (MEDIUM).**
2023 uses **grams of salt** (2017 used sodium in mg). If the source data provides sodium, convert
`salt = sodium × 2.5`. Salt & satfat tables are **identical** for solids (per 100 g) and
beverages (per 100 mL) — same numeric thresholds, different denominator.

**Risk #4 — Point-0 boundary printing inconsistency (LOW).**
The recap prints the Energy 0-point cell as "< 335" but every other component's 0-point cell as a
bare value (interpreted `≤`). All step boundaries above 0 use strict `>`. Recommended consistent
rule: **award = count of thresholds strictly exceeded** (so exactly 335 kJ ⇒ 0 pts; exactly
3.4 g sugar ⇒ 0 pts). This is the standard Nutri-Score convention and is internally consistent
with every `>` step in the tables.

**Risk #5 — Fibre analytical method not restated (LOW).**
The 2023 recap gives fibre thresholds in g/100 g but the extracted sections did not re-state the
analytical method. Nutri-Score has historically used **AOAC** dietary fibre. Confirm against the
report body / Santé publique France FAQ before asserting AOAC in code comments. Does not affect
the numeric table.

**Risk #6 — NNS detection list (MEDIUM).**
The +4 rule is unambiguous, but *which additives count as NNS* is defined in [BEV] §4.3.1, not in
the recap. The engineering team must transcribe that full E-number list from the report body
(sugar alcohols E420/E421/E953/E965/E966/E967/E968/E956/E964 + intense sweeteners aspartame,
acesulfame-K, sucralose, saccharin, cyclamate, steviol glycosides, neohesperidine DC, thaumatin,
neotame, advantame). Detection is by ingredient presence, so the dataset needs an ingredients or
additives field; without it, NNS cannot be applied and diet drinks will be under-penalised.

**Risk #7 — Beverage FV max = 6 (LOW / N-A for us).**
Beverage FV maxes at 6 points (>80%) vs 5 for solids, and the recap's beverage FV column is
rendered ambiguously. Irrelevant while FV = 0, but do NOT reuse the solid FV table for beverages
if an FV field is ever added.

**Risk #8 — "Min"/"Max" endpoints (LOW).**
Solids: theoretical FNS range is **-15 … 40**. Beverages: report gives "min to 2" / "10 to max"
without stating numeric extremes. Implement grade selection with open-ended `≤`/`≥` comparisons
rather than hard-coding -15/40.

**Fully verified from primary source:** all four solid unfavourable tables; solid protein/fibre/FV
tables; solid protein-cap rule + cheese exemption + removal of FV=5 exemption; solid A–E cutoffs;
all beverage unfavourable tables incl. the +4 NNS rule; beverage protein/fibre tables; beverage
"no protein cap"; beverage A–E cutoffs + water-only-A rule.

**Could NOT verify from primary source:** an official per-product worked example (none exists in
the two reports — Section 3 vectors are transcriber-computed from the tables); the explicit AOAC
fibre statement (Risk #5); the complete NNS E-number list was only partially captured from the
recap and must be lifted from [BEV] §4.3.1 (Risk #6).
