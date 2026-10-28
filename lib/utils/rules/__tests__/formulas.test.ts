import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import { DEFAULT_RULES, heroDiceTable, proficiencyForLevel } from "@/lib/utils/rules";

describe("proficiencyForLevel", () => {
  it("defaults reproduce getProficiencyBonus for levels 1..20", () => {
    for (let l = 1; l <= 20; l++) expect(proficiencyForLevel(l, DEFAULT_RULES.formulas)).toBe(getProficiencyBonus(l));
  });

  it("custom: base 1, every 3", () => {
    expect(proficiencyForLevel(1, { ...DEFAULT_RULES.formulas, proficiencyBase: 1, proficiencyEvery: 3 })).toBe(1);
    expect(proficiencyForLevel(4, { ...DEFAULT_RULES.formulas, proficiencyBase: 1, proficiencyEvery: 3 })).toBe(2);
  });
});

describe("heroDiceTable", () => {
  it("undefined when not overridden; numeric keys when overridden", () => {
    expect(heroDiceTable(DEFAULT_RULES, "melee")).toBeUndefined();
    expect(heroDiceTable({ ...DEFAULT_RULES, heroScaling: { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { "1": "1d6" } } }, "melee")).toEqual({ 1: "1d6" });
  });

  it("часткова таблиця добирає відсутні рівні зі стандартної прогресії", () => {
    const opts = { meleeDiceByLevel: heroDiceTable({ ...DEFAULT_RULES, heroScaling: { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { "1": "1d4" } } }, "melee") };

    expect(getHeroDamageDiceForLevel(1, AttackType.MELEE, opts)).toBe("1d4");
    expect(getHeroDamageDiceForLevel(5, AttackType.MELEE, opts)).toBe(getHeroDamageDiceForLevel(5, AttackType.MELEE));
  });
});
