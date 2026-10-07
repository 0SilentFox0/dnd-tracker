import { describe, expect, it } from "vitest";

import { spellLevelFromName, spellLevelName, spellLevelRoman } from "../spells";

describe("spellLevelName", () => {
  it("0 — замовляння, далі кола за порядком", () => {
    expect(spellLevelName(0)).toBe("Замовляння");
    expect(spellLevelName(1)).toBe("Перше коло");
    expect(spellLevelName(5)).toBe("П'яте коло");
    expect(spellLevelName(9)).toBe("Дев'яте коло");
  });

  it("поза словником — число з суфіксом", () => {
    expect(spellLevelName(12)).toBe("12-те коло");
  });
});

describe("spellLevelFromName", () => {
  it("обернена до spellLevelName для 0..9", () => {
    for (let level = 0; level <= 9; level++) expect(spellLevelFromName(spellLevelName(level))).toBe(level);
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
