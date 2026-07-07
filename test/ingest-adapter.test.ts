// Field-mapping wiring for the 15100066 odcloud adapter (mapRow). The live
// endpoint needs 활용신청 approval, but the row→SourceRecord mapping is pure and
// tested here against a synthetic odcloud row using the documented Korean keys
// (.omc/research/datagokr-15100066-api.md). Confirm exact key spelling against a
// live row on approval — this test pins the current mapping contract.
import { describe, expect, it } from "vitest";
import { mapRow } from "@/scripts/ingest/adapters/datagokr-15100066";

describe("datagokr-15100066 mapRow", () => {
  it("maps named odcloud columns to a SourceRecord", () => {
    const row = {
      식품코드: "P123-305020100-0096",
      식품명: "코카콜라",
      제조사명: "코카콜라음료",
      "영양성분함량기준량": "100ml",
      "에너지(kcal)": "42",
      "당류(g)": "10.6",
      "포화지방산(g)": "0",
      "나트륨(mg)": "5",
      "식이섬유(g)": "0",
      "단백질(g)": "0",
      식품세분류코드: "0101",
      식품세분류명: "탄산음료",
      식품소분류코드: "01",
      데이터생성일자: "2025-06-01",
    };
    const out = mapRow(row);
    expect(out.foodCode).toBe("P123-305020100-0096");
    expect(out.name).toBe("코카콜라");
    expect(out.referenceRaw).toBe("100ml");
    expect(out.sugarsRaw).toBe("10.6");
    expect(out.sodiumRaw).toBe("5");
    expect(out.mfdsL4Code).toBe("0101");
    expect(out.mfdsL3Code).toBe("01");
    expect(out.dataGenDate).toBe("2025-06-01");
  });

  it("yields null for absent columns (parsed downstream as 미측정)", () => {
    const out = mapRow({ 식품코드: "X", 식품명: "제품", "영양성분함량기준량": "100g" });
    expect(out.sugarsRaw).toBeNull();
    expect(out.manufacturer).toBeNull();
    expect(out.mfdsL4Code).toBeNull();
  });

  it("coerces non-string numeric cells to strings for the normalizer", () => {
    const out = mapRow({ 식품코드: "X", 식품명: "제품", "영양성분함량기준량": "100g", "당류(g)": 12.5 });
    expect(out.sugarsRaw).toBe("12.5");
  });
});
