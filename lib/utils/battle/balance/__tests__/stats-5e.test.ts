import { describe, expect, it } from "vitest";

import { getUnitStats } from "@/lib/utils/battle/balance";
import type { UnitStatsInput } from "@/lib/utils/battle/balance/stats";

const fire = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const base: UnitStatsInput = { id: "u", name: "Огр", maxHp: 50, level: 3, strength: 10, dexterity: 10, intelligence: 8, wisdom: 12, charisma: 16, proficiencyBonus: 3, attacks: [{ damageDice: "1d8", type: "melee" }] };

const caster: UnitStatsInput = { ...base, attacks: [{ damageDice: "1d4", type: "melee" }], spells: [{ dice: 3, targeting: { kind: "allEnemies" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: [fire] }] };

describe("getUnitStats: 5e", () => {
  it("HOMM-юніт: нові поля з дефолтами нічого не змінюють", () => {
    expect(getUnitStats({ ...base, cr: null, xp: null, multiattack: 1 })).toStrictEqual(getUnitStats(base));
    expect(getUnitStats({ ...caster, cr: null, multiattack: 3 })).toStrictEqual(getUnitStats(caster));
    expect(getUnitStats(base)).not.toHaveProperty("cr");
    expect(getUnitStats(base)).not.toHaveProperty("xp");
  });

  it("монстр: СК = 8 + майстерність + найкращий мод. Інт/Мдр/Хар (без тіру)", () => {
    expect(getUnitStats(caster).spell?.save?.dc).toBe(11);
    expect(getUnitStats({ ...caster, cr: 5 }).spell?.save?.dc).toBe(14);
  });

  it("монстр: мультиатака множить DPR зброї; CR і XP у статах", () => {
    const s = getUnitStats({ ...base, cr: 2, multiattack: 2 });

    expect(s.dpr).toBe(9);
    expect(s).toMatchObject({ cr: 2, xp: 450 });
    expect(getUnitStats({ ...base, cr: 2, xp: 500 }).xp).toBe(500);
  });
});
