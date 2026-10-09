import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { MIN_UNIT_STAT, TYPICAL_TARGETS } from "@/lib/constants/battle-balance";
import { DPR_BY_LEVEL_NON_MAGIC } from "@/lib/constants/dpr-by-main-skill";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { getCharacterStats, getUnitStats } from "@/lib/utils/battle/balance";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import { SkillLevel } from "@/types/skill-tree";

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

  it("влучання — рушій для кращої атаки, КД — ефективний, шкода зброєю без гілок шкіл магії", () => {
    const p = hero([sword, bow]);

    const s = getCharacterStats({ participant: p, branchLevels: { attack: SkillLevel.BASIC, chaos: SkillLevel.BASIC }, spellSchoolIds: new Set(["chaos"]) });

    const best = s.dprBreakdown.rangedAvg > s.dprBreakdown.meleeAvg ? bow : sword;

    expect(s.toHit).toBe(calculateAttackBonus(p, best, [p]));
    expect(s.ac).toBe(getEffectiveArmorClass(p));
    expect(s.weaponDpr).toBe(s.dprBreakdown.physicalDpr + DPR_BY_LEVEL_NON_MAGIC[SkillLevel.BASIC]);
  });

  it("без зброї — удар героя без кубиків зброї", () => {
    const p = hero([]);

    const fists = { name: "", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack;

    expect(getCharacterStats({ participant: p }).dprBreakdown.meleeAvg).toBe(averageAttackDamage(p, fists, [p]).total);
  });
});

describe("getCharacterStats: архетип і раса в оцінці сили героя", () => {
  const asCharacter = (p: BattleParticipant, extra: Record<string, unknown>, abilities?: BattleParticipant["battleData"]["resolvedAbilities"]): BattleParticipant => ({
    ...p,
    basicInfo: { ...p.basicInfo, sourceType: "character" },
    abilities: { ...p.abilities, ...extra },
    battleData: { ...p.battleData, ...(abilities && { resolvedAbilities: abilities }) },
  });

  it("школа із spellGroupId рахується магією, навіть без збігу назви", () => {
    const levels = { chaos: SkillLevel.BASIC };

    const plain = getCharacterStats({ participant: hero([sword]), branchLevels: levels });

    const school = getCharacterStats({ participant: hero([sword]), branchLevels: levels, spellSchoolIds: new Set(["chaos"]) });

    expect(plain.spellDpr).toBe(0);
    expect(plain.dprBreakdown.nonMagicDpr).toBe(DPR_BY_LEVEL_NON_MAGIC[SkillLevel.BASIC]);
    expect(school.spellDpr).toBeGreaterThan(0);
    expect(school.dprBreakdown.nonMagicDpr).toBe(0);
  });

  it("множник архетипу найкращої зброї множить і табличний немагічний DPR", () => {
    const levels = { attack: SkillLevel.BASIC };

    const base = getCharacterStats({ participant: asCharacter(hero([sword]), { meleeMultiplier: 1 }), branchLevels: levels });

    const boosted = getCharacterStats({ participant: asCharacter(hero([sword]), { meleeMultiplier: 1.5 }), branchLevels: levels });

    expect(boosted.dprBreakdown.nonMagicDpr).toBeCloseTo(base.dprBreakdown.nonMagicDpr * 1.5);
    expect(boosted.weaponDpr - boosted.dprBreakdown.physicalDpr).toBeCloseTo(base.dprBreakdown.nonMagicDpr * 1.5);
  });

  it("spell DPR множиться на magicMultiplier архетипу й на расовий % шкоди магії", () => {
    const params = { branchLevels: { chaos: SkillLevel.BASIC }, spellSchoolIds: new Set(["chaos"]) };

    const base = getCharacterStats({ participant: asCharacter(hero([sword]), { magicMultiplier: 1 }), ...params }).spellDpr;

    const arche = getCharacterStats({ participant: asCharacter(hero([sword]), { magicMultiplier: 1.2 }), ...params }).spellDpr;

    const racial = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: 15 }] });

    const race = getCharacterStats({ participant: asCharacter(hero([sword]), { magicMultiplier: 1 }, [racial]), ...params }).spellDpr;

    expect(arche).toBeCloseTo(base * 1.2);
    expect(race).toBeCloseTo(base * 1.15);
  });
});

const unit = (attacks: Array<{ damageDice: string; type: string }>) =>
  getUnitStats({ id: "u", name: "u", maxHp: 20, level: 1, strength: 14, dexterity: 12, attacks });

describe("баланс: середня шкода з кубиків", () => {
  it("юніт: кубики зброї + модифікатор характеристики; «+N» з кубиків не рахується", () => {
    expect(unit([{ damageDice: "1d8+2", type: "melee" }]).dpr).toBe(6.5);
  });

  it("оцінка юніта = влучання рушія із середніми кидками: «+16» з «4d10+16» шкоди не дає", () => {
    const base = makeParticipant({ id: "u" });

    const attack = { ...sword, damageDice: "4d10+16" } as BattleAttack;

    const p: BattleParticipant = {
      ...base,
      basicInfo: { ...base.basicInfo, sourceType: "unit" },
      abilities: { ...base.abilities, strength: 16, dexterity: 10 },
      battleData: { ...base.battleData, attacks: [attack], resolvedAbilities: [] },
    };

    const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 999, maxHp: 999 });

    const hit = computeHitDamage({ attacker: p, target, attack, damageRolls: [5, 6, 5, 6], allParticipants: [p, target], attackRoll: { isCritical: false }, currentRound: 1 });

    const estimate = getUnitStats({ id: "u", name: "u", maxHp: 20, level: 7, strength: 16, dexterity: 10, attacks: [attack] }).dpr;

    expect(estimate).toBe(25);
    expect(hit.physicalDamage).toBe(estimate);
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
