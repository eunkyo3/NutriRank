// Field-mapping wiring for the 15100066 standard-data adapter (mapRow), tested
// against a synthetic row using the real API's camelCase keys (verified live
// 2026-07-07, see docs/reference/datagokr-15100066-api.md).
import { describe, expect, it } from "vitest";
import { mapRow } from "@/scripts/ingest/adapters/datagokr-15100066";

describe("datagokr-15100066 mapRow", () => {
  it("maps the API's camelCase columns to a SourceRecord", () => {
    const row = {
      foodCd: "P101-409000400-0250",
      foodNm: "떠먹는초코무스케이크",
      mfrNm: "(주)신세계푸드",
      nutConSrtrQua: "100g",
      enerc: "387",
      sugar: "23.33",
      fasat: "18.00",
      nat: "103",
      fibtg: "",
      prot: "3.33",
      foodLv3Cd: "01",
      foodLv3Nm: "과자류·빵류 또는 떡류",
      foodLv4Cd: "01409",
      foodLv4Nm: "케이크",
      foodLv5Cd: "0100000",
      foodLv6Cd: "010000004",
      servSize: "70g",
      crtYmd: "2021-06-30",
    };
    const out = mapRow(row);
    expect(out.foodCode).toBe("P101-409000400-0250");
    expect(out.name).toBe("떠먹는초코무스케이크");
    expect(out.manufacturer).toBe("(주)신세계푸드");
    expect(out.referenceRaw).toBe("100g");
    expect(out.sugarsRaw).toBe("23.33");
    expect(out.satfatRaw).toBe("18.00");
    expect(out.sodiumRaw).toBe("103");
    expect(out.fiberRaw).toBe(""); // blank → normalizer maps to NULL later
    // 군 → mfdsL1, 식품유형(anchor) → mfdsL2.
    expect(out.mfdsL1Name).toBe("과자류·빵류 또는 떡류");
    expect(out.mfdsL2Code).toBe("01409");
    expect(out.mfdsL2Name).toBe("케이크");
    expect(out.servingRef).toBe("70g");
    expect(out.dataGenDate).toBe("2021-06-30");
  });

  it("yields null for absent columns (parsed downstream as 미측정)", () => {
    const out = mapRow({ foodCd: "X", foodNm: "제품", nutConSrtrQua: "100g" });
    expect(out.sugarsRaw).toBeNull();
    expect(out.manufacturer).toBeNull();
    expect(out.mfdsL2Code).toBeNull();
  });

  it("coerces non-string numeric cells to strings for the normalizer", () => {
    const out = mapRow({ foodCd: "X", foodNm: "제품", nutConSrtrQua: "100g", sugar: 12.5 });
    expect(out.sugarsRaw).toBe("12.5");
  });
});
