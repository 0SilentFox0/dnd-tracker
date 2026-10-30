import { describe, expect, it, vi } from "vitest";

import { spellLevelName, spellLevelRoman } from "../spells";

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

describe("spellLevelRoman", () => {
  it("римські цифри для слотів", () => {
    expect([0, 1, 4, 5].map(spellLevelRoman)).toEqual(["0", "I", "IV", "V"]);
  });
});
