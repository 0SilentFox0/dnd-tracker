import { describe, expect, it, vi } from "vitest";

import { spellLevelFromName, spellLevelName, spellLevelRoman } from "../spells";

import { getTranslator } from "@/lib/i18n/translator";

vi.unmock("@/lib/i18n/translator");

describe("spellLevelName", () => {
  it("називає рівні мовою перекладача", async () => {
    const uk = await getTranslator("uk", "gameTerms");

    const en = await getTranslator("en", "gameTerms");

    expect([0, 1, 9].map((l) => spellLevelName(l, uk))).toEqual(["Замовляння", "Перше коло", "Дев'яте коло"]);
    expect([0, 1, 3].map((l) => spellLevelName(l, en))).toEqual(["Cantrip", "1st level", "3rd level"]);
  });

  it("поза словником — число", async () => {
    expect(spellLevelName(12, await getTranslator("uk", "gameTerms"))).toBe("12");
  });
});

describe("spellLevelFromName", () => {
  it("обернена до spellLevelName для 0..9 в обох мовах", async () => {
    for (const locale of ["uk", "en"] as const) {
      const t = await getTranslator(locale, "gameTerms");

      for (let level = 0; level <= 9; level++) expect(spellLevelFromName(spellLevelName(level, t))).toBe(level);
    }
  });

  it("розпізнає «Third circle» і «Третє коло»", () => {
    expect(spellLevelFromName("Third circle")).toBe(3);
    expect(spellLevelFromName("Третє коло")).toBe(3);
  });

  it("невідоме ім'я — 0", () => {
    expect(spellLevelFromName("щось")).toBe(0);
  });
});

describe("spellLevelRoman", () => {
  it("римські цифри для слотів", () => {
    expect([0, 1, 4, 5].map(spellLevelRoman)).toEqual(["0", "I", "IV", "V"]);
  });
});
