import { describe, expect, it } from "bun:test";
import { COUNTRIES, DEFAULT_COUNTRY, splitDefault } from "./countries";

describe("COUNTRIES", () => {
  it("has India as the default first country with code 91", () => {
    expect(DEFAULT_COUNTRY).toEqual({
      code: "91",
      label: "India",
      flag: "+91",
      iso: "IN",
    });
    expect(COUNTRIES[0].iso).toBe("IN");
    expect(COUNTRIES[0].code).toBe("91");
  });

  it("contains over 200 countries and territories worldwide", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
  });

  it("has valid properties and unique ISO codes for all countries", () => {
    const isos = new Set<string>();
    for (const c of COUNTRIES) {
      expect(c.code).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.flag).toBe(`+${c.code}`);
      expect(c.iso).toBeTruthy();
      expect(isos.has(c.iso)).toBe(false);
      isos.add(c.iso);
    }
  });

  it("includes major countries across continents", () => {
    const findByIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso);
    expect(findByIso("US")?.code).toBe("1");
    expect(findByIso("CA")?.code).toBe("1");
    expect(findByIso("GB")?.code).toBe("44");
    expect(findByIso("NP")?.code).toBe("977");
    expect(findByIso("AU")?.code).toBe("61");
    expect(findByIso("DE")?.code).toBe("49");
    expect(findByIso("FR")?.code).toBe("33");
    expect(findByIso("JP")?.code).toBe("81");
    expect(findByIso("AE")?.code).toBe("971");
    expect(findByIso("SG")?.code).toBe("65");
  });
});

describe("splitDefault", () => {
  it("returns India default for empty, null, or undefined values", () => {
    expect(splitDefault("")).toEqual({ iso: "IN", code: "91", value: "" });
    expect(splitDefault(null)).toEqual({ iso: "IN", code: "91", value: "" });
    expect(splitDefault(undefined)).toEqual({ iso: "IN", code: "91", value: "" });
  });

  it("defaults to India for numbers without a + prefix", () => {
    expect(splitDefault("9876543210")).toEqual({
      iso: "IN",
      code: "91",
      value: "9876543210",
    });
    expect(splitDefault("98765-43210")).toEqual({
      iso: "IN",
      code: "91",
      value: "9876543210",
    });
  });

  it("extracts India country code (+91)", () => {
    expect(splitDefault("+919876543210")).toEqual({
      iso: "IN",
      code: "91",
      value: "9876543210",
    });
    expect(splitDefault("+91 98765 43210")).toEqual({
      iso: "IN",
      code: "91",
      value: "9876543210",
    });
  });

  it("extracts United States country code (+1)", () => {
    expect(splitDefault("+12025550123")).toEqual({
      iso: "US",
      code: "1",
      value: "2025550123",
    });
  });

  it("extracts United Kingdom country code (+44)", () => {
    expect(splitDefault("+447911123456")).toEqual({
      iso: "GB",
      code: "44",
      value: "7911123456",
    });
  });

  it("extracts Nepal country code (+977)", () => {
    expect(splitDefault("+9779812345678")).toEqual({
      iso: "NP",
      code: "977",
      value: "9812345678",
    });
  });

  it("matches longer country codes before shorter ones", () => {
    // Bahamas is +1242, which should match before +1 (US)
    expect(splitDefault("+12423221234")).toEqual({
      iso: "BS",
      code: "1242",
      value: "3221234",
    });
  });
});
