import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { MIN_UNIT_STAT, TYPICAL_TARGETS } from "@/lib/constants/battle-balance";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { getCharacterStats, getUnitStats } from "@/lib/utils/battle/balance";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

function hero(attacks: BattleAttack[], abilities = makeParticipant({ id: "h" }).battleData.resolvedAbilities): BattleParticipant {
  const p = makeParticipant({ id: "h", level: 5, maxHp: 44, abilities });

  return { ...p, abilities: { ...p.abilities, meleeMultiplier: 1, rangedMultiplier: 1 }, battleData: { ...p.battleData, attacks } };
}

describe("getCharacterStats з учасника бою", () => {
  it("ближня і дальня — середнє реального удару; фізичний DPR — краща; HP — з учасника", () => {
    const p = hero([sword, bow]);

    const s = getCharacterStats({ participant: p });

    expect(s.dprBreakdown.meleeAvg).toBe(averageAttackDamage(p, sword, [p]).total);
    expect(s.dprBreakdown.rangedAvg).toBe(averageAttackDamage(p, bow, [p]).total);
    expect(s.dpr).toBe(Math.max(s.dprBreakdown.meleeAvg, s.dprBreakdown.rangedAvg));
    expect(s.hp).toBe(44);
  });

  it("пасивний бонус ближньої шкоди входить у DPR", () => {
    const rage = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 50 }] });

    expect(getCharacterStats({ participant: hero([sword], [rage]) }).dprBreakdown.meleeAvg).toBeGreaterThan(getCharacterStats({ participant: hero([sword]) }).dprBreakdown.meleeAvg);
  });

  it("без зброї — удар героя без кубиків зброї", () => {
    const p = hero([]);

    const fists = { name: "", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack;

    expect(getCharacterStats({ participant: p }).dprBreakdown.meleeAvg).toBe(averageAttackDamage(p, fists, [p]).total);
  });
});

const unit = (attacks: Array<{ damageDice: string; type: string }>) =>
  getUnitStats({ id: "u", name: "u", maxHp: 20, level: 1, strength: 14, dexterity: 12, attacks });

describe("баланс: середня шкода з кубиків", () => {
  it("юніт: кубики зброї + модифікатор характеристики", () => {
    expect(unit([{ damageDice: "1d8+2", type: "melee" }]).dpr).toBe(8.5);
  });

  it("оцінка юніта збігається з рушієм: бій теж додає модифікатор Сили/Спритності юнітам", () => {
    const base = makeParticipant({ id: "u" });

    for (const attack of [sword, bow]) {
      const p: BattleParticipant = {
        ...base,
        basicInfo: { ...base.basicInfo, sourceType: "unit" },
        abilities: { ...base.abilities, strength: 18, dexterity: 14 },
        battleData: { ...base.battleData, attacks: [attack], resolvedAbilities: [] },
      };

      const estimate = getUnitStats({ id: "u", name: "u", maxHp: 20, level: 1, strength: 18, dexterity: 14, attacks: [attack] }).dpr;

      const engine = averageAttackDamage(p, attack, [p]);

      expect(engine.statMod).toBe(attack === sword ? 4 : 2);
      expect(estimate).toBe(engine.weaponAvg + engine.statMod);
    }
  });

  it("«d6» без кількості — це 1d6 (§4.5)", () => {
    expect(unit([{ damageDice: "d6", type: "ranged" }]).dpr).toBe(4.5);
  });
});


describe("getUnitStats: модель DPR юніта", () => {
  const base = { id: "u", name: "u", maxHp: 20, level: 1, strength: 10, dexterity: 10 };

  it("найкраща одна атака, а не сума ближніх", () => {
    const dpr = getUnitStats({ ...base, attacks: [{ damageDice: "1d8", type: "melee" }, { damageDice: "1d6", type: "melee" }] }).dpr;

    expect(dpr).toBe(4.5);
  });

  it("дальня атака з кількома цілями множиться на min(цілі, TYPICAL_TARGETS)", () => {
    const attacks = [{ damageDice: "1d8", type: "ranged", maxTargets: 5 }];

    expect(getUnitStats({ ...base, attacks }).dpr).toBe(4.5);
    expect(getUnitStats({ ...base, maxTargets: 3, attacks }).dpr).toBe(4.5 * TYPICAL_TARGETS);
    expect(getUnitStats({ ...base, maxTargets: 1, attacks: [{ damageDice: "1d8", type: "ranged", targetType: "aoe", maxTargets: 5 }] }).dpr).toBe(4.5 * TYPICAL_TARGETS);
    expect(getUnitStats({ ...base, attacks: [{ damageDice: "1d8", type: "ranged", targetType: "aoe", maxTargets: 1 }] }).dpr).toBe(4.5);
  });

  it("ближня атака з кількома цілями лишається ×1", () => {
    expect(getUnitStats({ ...base, maxTargets: 4, attacks: [{ damageDice: "1d8", type: "melee", maxTargets: 4 }] }).dpr).toBe(4.5);
  });

  const fire = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

  it("DPR із заклинання: формула кубиків (база + ⌊рівень/3⌋, d6) × цілі, якщо воно сильніше за зброю", () => {
    const stats = getUnitStats({
      ...base,
      level: 3,
      attacks: [{ damageDice: "1d4", type: "melee" }],
      spells: [
        { dice: 7, targeting: { kind: "allEnemies" }, spellEffects: [fire] },
        { dice: 1, targeting: { kind: "enemy" }, spellEffects: [fire] },
        { dice: 9, targeting: { kind: "ally" }, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] },
      ],
    });

    expect(stats.dpr).toBe(8 * 3.5 * TYPICAL_TARGETS);
  });

  it("спад шкоди по цілях зменшує очікувані цілі", () => {
    const spells = [{ dice: 2, targeting: { kind: "area", side: "enemy", maxTargets: 3 }, spellEffects: [{ ...fire, falloff: [100, 50, 25] }] }];

    expect(getUnitStats({ ...base, attacks: [], spells }).dpr).toBe(7 * 1.5);
  });

  it("слабке заклинання не знижує DPR зброї", () => {
    const stats = getUnitStats({ ...base, attacks: [{ damageDice: "2d6", type: "melee" }], spells: [{ dice: 1, targeting: { kind: "enemy" }, spellEffects: [fire] }] });

    expect(stats.dpr).toBe(7);
  });

  it("DPR і HP не нижчі за мінімум", () => {
    const stats = getUnitStats({ ...base, maxHp: 0, strength: 1, attacks: [{ damageDice: "0", type: "melee" }] });

    expect(stats.hp).toBe(MIN_UNIT_STAT);
    expect(stats.dpr).toBeGreaterThanOrEqual(MIN_UNIT_STAT);
  });
});
