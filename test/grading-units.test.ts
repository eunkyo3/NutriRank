// Table-independent grading helpers: §5 unit conversions and §4 product-type
// parsing (.omc/plans/grading-spec.md §12 AC). Golden values are exact so these
// pin the deterministic conversion rule regardless of the point tables.
import { describe, expect, it } from "vitest";
import { parseProductType } from "@/lib/grading/product-type";
import { kcalToKj, round3, sodiumMgToSaltG } from "@/lib/grading/units";

describe("unit conversions (§5)", () => {
  it("converts kcal → kJ with the ×4.184 factor", () => {
    expect(kcalToKj(100)).toBe(418.4);
    expect(kcalToKj(0)).toBe(0);
    expect(kcalToKj(235)).toBe(983.24);
  });

  it("converts sodium(mg) → salt(g) with ×2.5/1000", () => {
    expect(sodiumMgToSaltG(500)).toBe(1.25);
    expect(sodiumMgToSaltG(0)).toBe(0);
    expect(sodiumMgToSaltG(200)).toBe(0.5);
  });

  it("rounds conversions to 3 decimals, half-up", () => {
    expect(round3(0.0025)).toBe(0.003);
    expect(round3(1.23449)).toBe(1.234);
    expect(round3(1.2345)).toBe(1.235);
  });

  it("is deterministic — same input yields the same output", () => {
    expect(kcalToKj(157)).toBe(kcalToKj(157));
    expect(sodiumMgToSaltG(313)).toBe(sodiumMgToSaltG(313));
  });
});

describe("product-type parsing (§4)", () => {
  it("maps 100ml → beverage and 100g → solid", () => {
    expect(parseProductType("100ml")).toBe("beverage");
    expect(parseProductType("100g")).toBe("solid");
  });

  it("tolerates whitespace and case variants (§13 risk)", () => {
    expect(parseProductType("100 ml")).toBe("beverage");
    expect(parseProductType("100mL")).toBe("beverage");
    expect(parseProductType(" 100 G ")).toBe("solid");
  });

  it("returns null for unparseable / missing reference amounts (§9.3)", () => {
    expect(parseProductType("1개")).toBeNull();
    expect(parseProductType("100")).toBeNull();
    expect(parseProductType("")).toBeNull();
    expect(parseProductType(null)).toBeNull();
    expect(parseProductType(undefined)).toBeNull();
  });
});
