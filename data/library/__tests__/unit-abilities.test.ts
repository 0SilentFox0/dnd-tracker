import { describe, expect, it } from "vitest";

import * as catalog from "../unit-abilities";
import { abilityScores, proficiencyForTier } from "../unit-stats";

import { type Ability, AbilitySchema } from "@/lib/utils/abilities/schema";

const SAMPLES: Record<string, Ability[]> = {
  noRetaliation: [catalog.noRetaliation()],
  unlimitedRetaliation: [catalog.unlimitedRetaliation()],
  falloff: [catalog.falloff("Залп")],
  doubleStrike: [catalog.doubleStrike("Подвійний удар", 30)],
  firstStrike: [catalog.firstStrike("Таран"), catalog.firstStrike("Засідка", 75)],
  deathBlow: [catalog.deathBlow("Точний постріл", 25)],
  armorBreak: [catalog.armorBreak("Броньобійність"), catalog.armorBreak("Гарпун", 3)],
  rage: [catalog.rage(), catalog.rage(40)],
  hatred: [catalog.hatred("Свята кара", ["Демони", "Некроманти"]), catalog.hatred("Ненависть", ["Ельфи"], 50)],
  stun: [catalog.stun("Оглушення", 20)],
  dot: [catalog.dot("Отрута", "1d4", "poison", 2), catalog.dot("Опік", "1d6", "fire", 3, 50)],
  debuff: [catalog.debuff("Каліцтво", "attackBonus", 2, 2), catalog.debuff("Прокляття", "initiative", 3, 2, 40), catalog.debuff("Страх", "morale", 1, 2), catalog.debuff("Іржа", "armor", 1, 1)],
  fearAura: [catalog.fearAura(), catalog.fearAura("Аура величі", 2)],
  disable: [catalog.disable("Саботаж", "disable_ranged_attacks", 30), catalog.disable("Тиша", "disable_spell_casting", 30)],
  charmOnHit: [catalog.charmOnHit("Чарівність", 15)],
  undead: [catalog.undead()],
  construct: [catalog.construct()],
  elemental: [catalog.elemental(null), catalog.elemental("fire", "cold"), catalog.elemental("cold"), catalog.elemental("lightning")],
  magicResist: [catalog.magicResist(30)],
  magicImmunity: [catalog.magicImmunity()],
  elementResist: [catalog.elementResist(["fire", "cold"], 50, "Опір стихіям")],
  physicalResist: [catalog.physicalResist(50), catalog.physicalResist(25, ["slashing"], "Опір мечам")],
  incorporeal: [catalog.incorporeal()],
  regeneration: [catalog.regeneration(10)],
  lifeDrain: [catalog.lifeDrain(), catalog.lifeDrain(30)],
  retaliateAura: [catalog.retaliateAura("Вогняний щит"), catalog.retaliateAura("Кислотна кров", 30, "acid")],
  guardian: [catalog.guardian(), catalog.guardian(40)],
  bigShield: [catalog.bigShield(), catalog.bigShield(40)],
  bravery: [catalog.bravery()],
  undyingOnce: [catalog.undyingOnce()],
  healAlly: [
    catalog.healAlly("Лікування", "1d8+4"),
    catalog.healAlly("Покладання рук", { percentOf: "maxHp", value: 50 }, { perBattle: 1, cleanse: true }),
    catalog.healAlly("Ремонт", 10, { bonus: true, targetRaceNote: "Механізми" }),
  ],
  resurrect: [catalog.resurrect()],
  buffAlly: [
    catalog.buffAlly("Благословення", [{ stat: "attackBonus", flat: 2 }], 2),
    catalog.buffAlly("Батіг", [{ stat: "morale", flat: 1 }, { stat: "initiative", flat: 2 }], 2, { bonus: true }),
    catalog.buffAlly("Бойовий клич", [{ stat: "armor", flat: 1 }], 2, { self: true }),
  ],
  restoreSlotOnce: [catalog.restoreSlotOnce("Передача мани")],
  drainMana: [catalog.drainMana()],
  summonGroupOnce: [catalog.summonGroupOnce("Виклик пекла", "Демони", 6)],
  raiseOnKill: [catalog.raiseOnKill("necromancers-skeleton")],
  extraDamage: [catalog.extraDamage("Вогняний клинок", "1d4", "fire"), catalog.extraDamage("Блискавка", "1d6", "lightning")],
  finisher: [
    catalog.finisher("Добивання", { type: "hpBelow", who: "eventTarget", percent: 50 }, { percent: 50 }),
    catalog.finisher("Полювання", { type: "targetHasCondition", condition: "skip_action" }, { advantage: true }),
  ],
  alliesAura: [catalog.alliesAura("Аура опору магії", { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 }), catalog.alliesAura("Аура сили", { kind: "modifyStat", stat: "attackBonus", flat: 1 })],
  enemiesRoundDamage: [catalog.enemiesRoundDamage("Аура стихій", 20)],
  oncePerBattleAoe: [
    catalog.oncePerBattleAoe("Вибух", { percentOfAttack: 100, targets: "all" }),
    catalog.oncePerBattleAoe("Грім", { percentOfAttack: 80, targets: 3, stunChance: 40, damageType: "thunder" }),
  ],
  wheelOfFortune: [catalog.wheelOfFortune()],
  critRange: [catalog.critRange(19)],
  flavor: [catalog.flavor("Літає")],
};

describe("unit ability catalog", () => {
  it("every factory output is a valid ability", () => {
    for (const [factory, abilities] of Object.entries(SAMPLES)) {
      for (const ability of abilities) {
        const parsed = AbilitySchema.safeParse(ability);

        expect(parsed.success, `${factory}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`).toBe(true);
        expect(ability.id.startsWith("unit-"), factory).toBe(true);
        expect(ability.description, factory).toBeTruthy();
      }
    }
  });

  it("covers every exported factory", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(catalog).sort());
  });

  it("derives distinct ids from parameters", () => {
    const ids = [catalog.dot("a", "1d4", "poison", 2), catalog.dot("b", "1d4", "fire", 2)].map((a) => a.id);

    expect(new Set(ids).size).toBe(2);
    expect(catalog.flavor("Літає").id).not.toBe(catalog.flavor("Великий").id);
  });

  it("raiseOnKill stores the library unit key", () => {
    const [effect] = catalog.raiseOnKill("necromancers-skeleton").effects;

    expect(effect).toMatchObject({ kind: "summon", unitId: "necromancers-skeleton" });
    expect(catalog.raiseOnKill("x").trigger).toEqual({ event: "kill", role: "killer" });
  });

  it("falloff is a 50 % multiTargetFalloff flag", () => {
    expect(catalog.falloff("Залп").effects).toEqual([{ kind: "flag", flag: "multiTargetFalloff", percent: 50 }]);
  });
});

describe("unit stats", () => {
  it("maps tiers to proficiency", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(proficiencyForTier)).toEqual([2, 2, 3, 3, 4, 4, 5]);
  });

  it("derives scores from the budget", () => {
    const melee = abilityScores({ tier: 1, attackBonus: 3, hp: 12, attacks: [{ name: "a", type: "melee", dice: "1d6", damageType: "slashing" }] });

    expect(melee.strength).toBe(12);
    expect(melee.dexterity).toBe(10);
    expect(melee.constitution).toBe(10);

    const ranged = abilityScores({ tier: 4, attackBonus: 6, hp: 58, attacks: [{ name: "a", type: "ranged", dice: "1d6", damageType: "piercing" }] });

    expect(ranged.dexterity).toBe(16);
    expect(ranged.strength).toBe(10);
    expect(ranged.constitution).toBe(12);
  });

  it("floors the main score at 8 and caps constitution", () => {
    expect(abilityScores({ tier: 7, attackBonus: 0, hp: 999, attacks: [{ name: "a", type: "melee", dice: "1d6", damageType: "slashing" }] })).toMatchObject({ strength: 8, constitution: 20 });
  });
});
