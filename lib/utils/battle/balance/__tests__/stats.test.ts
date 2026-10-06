import { describe, expect, it } from "vitest";

import { getCharacterStats, getUnitStats } from "@/lib/utils/battle/balance";

const unit = (attacks: Array<{ damageDice: string; type: string }>) =>
  getUnitStats({ id: "u", name: "u", maxHp: 20, level: 1, strength: 14, dexterity: 12, attacks });

describe("баланс: середня шкода з кубиків", () => {
  it("юніт: кубики зброї + модифікатор характеристики", () => {
    expect(unit([{ damageDice: "1d8+2", type: "melee" }]).dpr).toBe(8.5);
  });

  it("герой 5 рівня зі зброєю 1d8", () => {
    const stats = getCharacterStats({ id: "c", name: "c", level: 5, strength: 14, dexterity: 12, attacks: [{ damageDice: "1d8", type: "melee" }], branchLevels: {}, magicMainSkillIds: new Set() });

    expect(stats.dprBreakdown.meleeAvg).toBe(18.5);
    expect(stats.dprBreakdown.rangedAvg).toBe(13);
  });

  it("«d6» без кількості — це 1d6 (§4.5)", () => {
    expect(unit([{ damageDice: "d6", type: "ranged" }]).dpr).toBe(4.5);
  });
});
