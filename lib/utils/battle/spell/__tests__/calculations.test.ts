/**
 * Тести magic-damage pipeline:
 *  - експерт "Магія хаосу" дає +25% до шкоди заклинання,
 *  - school scope filter обмежує бонус відповідною школою магії,
 *  - spellEffectIncrease (апгрейд заклинання) застосовується після %-бонусу скіла,
 *  - melee/ranged бонуси не впливають на magic.
 */

import { describe, expect, it } from "vitest";

import { calculateSpellDamageWithEnhancements } from "../calculations";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillEffect,
} from "@/types/battle";

function createCaster(overrides?: {
  activeSkills?: ActiveSkill[];
  level?: number;
}): BattleParticipant {
  return {
    basicInfo: {
      id: "caster",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Hero",
      side: ParticipantSide.ALLY,
      controlledBy: "user",
    },
    abilities: {
      level: overrides?.level ?? 5,
      initiative: 10,
      baseInitiative: 10,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: {
      maxHp: 30,
      currentHp: 30,
      tempHp: 0,
      armorClass: 14,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: { spellSlots: {}, knownSpells: [] },
    battleData: {
      attacks: [],
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities: [],
      activeSkills: overrides?.activeSkills ?? [],
      equippedArtifacts: [],
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
}

function effect(stat: string, value: number, isPercentage: boolean): SkillEffect {
  return { stat, type: isPercentage ? "percent" : "flat", value, isPercentage };
}

function chaosExpertSkill(): ActiveSkill {
  return {
    skillId: "chaos-expert",
    name: "Магія хаосу: експерт",
    mainSkillId: "main-chaos",
    level: SkillLevel.EXPERT,
    effects: [effect("chaos_spell_damage", 25, true)],
    affectsDamage: true,
    damageType: "magic",
    spellGroupId: "chaos",
  };
}

describe("calculateSpellDamageWithEnhancements (magic pipeline)", () => {
  it("expert 'Магія хаосу' дає +25% до шкоди заклинання школи Хаосу", () => {
    const caster = createCaster({ activeSkills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      // baseDamage (сума кубиків заклинання)
      40,
      undefined,
      // не додаємо рівень героя у цьому кейсі
      undefined,
      { groupId: "chaos" },
    );

    // 40 (база) + 0 (немає spellcasting modifier) → 40 → +25% (10) → 50
    expect(result.totalDamage).toBe(50);
    expect(result.breakdown.some((l) => l.includes("25%"))).toBe(true);
  });

  it("скіл Хаосу не дає бонус заклинанню Темної магії (school scope)", () => {
    const caster = createCaster({ activeSkills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "dark" }, // інша школа
    );

    expect(result.totalDamage).toBe(40);
    expect(result.breakdown.some((l) => l.includes("25%"))).toBe(false);
  });

  it("без spellGroupId у спела — фолбек: бонус застосовується (зворотна сумісність)", () => {
    const caster = createCaster({ activeSkills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      undefined, // невідома школа цілі
    );

    expect(result.totalDamage).toBe(50);
  });

  it("універсальний скіл (spell_damage без spellGroupId) застосовується до будь-якої школи", () => {
    const universalSkill: ActiveSkill = {
      skillId: "universal",
      name: "Магія: експерт",
      mainSkillId: "main-magic",
      level: SkillLevel.EXPERT,
      effects: [effect("spell_damage", 25, true)],
      affectsDamage: true,
      damageType: "magic",
      spellGroupId: null,
    };

    const caster = createCaster({ activeSkills: [universalSkill] });

    const r1 = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    const r2 = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "dark" },
    );

    expect(r1.totalDamage).toBe(50);
    expect(r2.totalDamage).toBe(50);
  });

  it("expert > basic на одному mainSkillId — береться лише найвищий", () => {
    const basic: ActiveSkill = {
      skillId: "chaos-basic",
      name: "Магія хаосу: базовий",
      mainSkillId: "main-chaos",
      level: SkillLevel.BASIC,
      effects: [effect("chaos_spell_damage", 10, true)],
      affectsDamage: true,
      damageType: "magic",
      spellGroupId: "chaos",
    };

    const caster = createCaster({
      activeSkills: [basic, chaosExpertSkill()],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // експерт +25% (а не basic +10%)
    expect(result.totalDamage).toBe(50);
  });

  it("spellEffectIncrease застосовується після %-бонусу зі скіла (множить вже збільшений урон)", () => {
    const skillWithIncrease: ActiveSkill = {
      skillId: "chaos-with-incr",
      name: "Магія хаосу: експерт",
      mainSkillId: "main-chaos",
      level: SkillLevel.EXPERT,
      effects: [effect("chaos_spell_damage", 25, true)],
      affectsDamage: true,
      damageType: "magic",
      spellGroupId: "chaos",
      spellEnhancements: { spellEffectIncrease: 20 },
    };

    const caster = createCaster({ activeSkills: [skillWithIncrease] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // 40 → +25% → 50 → +20% від 50 (10) → 60
    expect(result.totalDamage).toBe(60);
  });

  it("melee/ranged скіл не впливає на magic", () => {
    const meleeSkill: ActiveSkill = {
      skillId: "melee",
      name: "Меч-мастер: експерт",
      mainSkillId: "main-melee",
      level: SkillLevel.EXPERT,
      effects: [effect("melee_damage", 25, true)],
      affectsDamage: true,
      damageType: "melee",
    };

    const rangedSkill: ActiveSkill = {
      skillId: "ranged",
      name: "Стрілець: експерт",
      mainSkillId: "main-ranged",
      level: SkillLevel.EXPERT,
      effects: [effect("ranged_damage", 25, true)],
      affectsDamage: true,
      damageType: "ranged",
    };

    const caster = createCaster({
      activeSkills: [meleeSkill, rangedSkill],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    expect(result.totalDamage).toBe(40);
  });

  it("addHeroLevelToBase=true додає рівень героя у базу", () => {
    const caster = createCaster({
      activeSkills: [chaosExpertSkill()],
      level: 8,
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      { addHeroLevelToBase: true },
      { groupId: "chaos" },
    );

    // 40 + 8 (рівень) = 48 → +25% (12) → 60
    expect(result.totalDamage).toBe(60);
  });

  it("flat-бонус застосовується до бази перед відсотками", () => {
    const flatSkill: ActiveSkill = {
      skillId: "flat-magic",
      name: "Магічна сила",
      mainSkillId: "main-magic-flat",
      level: SkillLevel.EXPERT,
      effects: [effect("magic_damage", 5, false)],
      affectsDamage: true,
      damageType: "magic",
      spellGroupId: null, // універсальний
    };

    const caster = createCaster({
      activeSkills: [flatSkill, chaosExpertSkill()],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // 40 + 5 (flat) = 45 → +25% (11.25 → floor 11) → 56
    expect(result.totalDamage).toBe(56);
  });
});
