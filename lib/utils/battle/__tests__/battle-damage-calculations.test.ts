/**
 * Тести логіки обрахунку шкоди (TDD — тести як джерело правди).
 * Архітектура: docs/DAMAGE_CALCULATION_TEST_ARCHITECTURE.md
 */

import { describe, expect, it } from "vitest";

import {
  applyResistance,
  calculateArtifactDamageBonus,
  calculateDamageWithModifiers,
  calculatePassiveAbilityDamageBonus,
  calculateSkillDamageFlatBonus,
  calculateSkillDamagePercentBonus,
} from "../battle-damage-calculations";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type {
  BattleParticipant,
  EquippedArtifact,
  SkillEffect,
} from "@/types/battle";

function createBaseParticipant(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    basicInfo: {
      id: "p1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Hero",
      side: ParticipantSide.ALLY,
      controlledBy: "user-1",
    },
    abilities: {
      level: 5,
      initiative: 10,
      baseInitiative: 10,
      strength: 14,
      dexterity: 12,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: {
        strength: 2,
        dexterity: 1,
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
      activeSkills: [],
      equippedArtifacts: [],
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
    ...overrides,
  };
}

function createSkillEffect(
  stat: string,
  value: number,
  isPercentage: boolean,
): SkillEffect {
  return { stat, type: isPercentage ? "percent" : "flat", value, isPercentage };
}

describe("battle-damage-calculations", () => {
  describe("calculateSkillDamagePercentBonus", () => {
    it("returns 0 when attacker has no active skills", () => {
      const attacker = createBaseParticipant();

      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        0,
      );
      expect(
        calculateSkillDamagePercentBonus(attacker, AttackType.RANGED),
      ).toBe(0);
    });

    it("returns percent bonus from one skill with melee_damage and isPercentage", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Напад",
              mainSkillId: "ms1",
              level: "expert",
              effects: [createSkillEffect("melee_damage", 30, true)],
              affectsDamage: true,
            },
          ],
        },
      });

      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        30,
      );
      expect(
        calculateSkillDamagePercentBonus(attacker, AttackType.RANGED),
      ).toBe(0);
    });

    it("returns percent bonus for ranged_damage when attackType is RANGED", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s2",
              name: "Експертна стрільба",
              mainSkillId: "ms2",
              level: "expert",
              effects: [createSkillEffect("ranged_damage", 30, true)],
              affectsDamage: true,
            },
          ],
        },
      });

      expect(
        calculateSkillDamagePercentBonus(attacker, AttackType.RANGED),
      ).toBe(30);
      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        0,
      );
    });

    it("uses only highest-level skill per mainSkillId (one line = one bonus)", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Базова атака",
              mainSkillId: "ms1",
              level: "basic",
              effects: [createSkillEffect("melee_damage", 10, true)],
            },
            {
              skillId: "s2",
              name: "Просунута атака",
              mainSkillId: "ms1",
              level: "advanced",
              effects: [createSkillEffect("melee_damage", 15, true)],
            },
          ],
        },
      });

      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        15,
      );
    });

    it("physical_damage applies to both MELEE and RANGED", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Універсальний бонус",
              mainSkillId: "ms1",
              level: "basic",
              effects: [createSkillEffect("physical_damage", 20, true)],
            },
          ],
        },
      });

      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        20,
      );
      expect(
        calculateSkillDamagePercentBonus(attacker, AttackType.RANGED),
      ).toBe(20);
    });

    it("includes percent from activeEffects (buffs/debuffs)", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeEffects: [
            {
              id: "e1",
              name: "Righteous Might",
              type: "buff",
              duration: 3,
              appliedAt: { round: 1, timestamp: new Date() },
              effects: [
                { type: "melee_damage", value: 40, isPercentage: true },
              ],
            },
          ],
        },
      });

      expect(calculateSkillDamagePercentBonus(attacker, AttackType.MELEE)).toBe(
        40,
      );
    });
  });

  describe("calculateSkillDamageFlatBonus", () => {
    it("returns 0 when attacker has no active skills", () => {
      const attacker = createBaseParticipant();

      expect(calculateSkillDamageFlatBonus(attacker, AttackType.MELEE)).toBe(0);
    });

    it("returns flat bonus from skill when isPercentage is false", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Flat бонус",
              mainSkillId: "ms1",
              level: "basic",
              effects: [createSkillEffect("melee_damage", 3, false)],
            },
          ],
        },
      });

      expect(calculateSkillDamageFlatBonus(attacker, AttackType.MELEE)).toBe(3);
      expect(calculateSkillDamageFlatBonus(attacker, AttackType.RANGED)).toBe(
        0,
      );
    });
  });

  describe("calculateArtifactDamageBonus", () => {
    it("returns { percent: 0, flat: 0 } when no equipped artifacts", () => {
      const attacker = createBaseParticipant();

      expect(calculateArtifactDamageBonus(attacker, AttackType.MELEE)).toEqual({
        percent: 0,
        flat: 0,
      });
    });

    it("returns percent from artifact modifier when isPercentage is true", () => {
      const artifact: EquippedArtifact = {
        artifactId: "a1",
        name: "Меч",
        slot: "weapon",
        bonuses: {},
        modifiers: [{ type: "melee_damage", value: 20, isPercentage: true }],
      };

      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          equippedArtifacts: [artifact],
        },
      });

      expect(calculateArtifactDamageBonus(attacker, AttackType.MELEE)).toEqual({
        percent: 20,
        flat: 0,
      });
    });

    it("returns flat from artifact when isPercentage is false", () => {
      const artifact: EquippedArtifact = {
        artifactId: "a1",
        name: "Кинджал",
        slot: "weapon",
        bonuses: {},
        modifiers: [{ type: "melee_damage", value: 5, isPercentage: false }],
      };

      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          equippedArtifacts: [artifact],
        },
      });

      expect(calculateArtifactDamageBonus(attacker, AttackType.MELEE)).toEqual({
        percent: 0,
        flat: 5,
      });
    });

    it("does not apply ranged artifact bonus to MELEE", () => {
      const artifact: EquippedArtifact = {
        artifactId: "a1",
        name: "Лук",
        slot: "weapon",
        bonuses: {},
        modifiers: [{ type: "ranged_damage", value: 15, isPercentage: true }],
      };

      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          equippedArtifacts: [artifact],
        },
      });

      expect(calculateArtifactDamageBonus(attacker, AttackType.MELEE)).toEqual({
        percent: 0,
        flat: 0,
      });
      expect(calculateArtifactDamageBonus(attacker, AttackType.RANGED)).toEqual(
        {
          percent: 15,
          flat: 0,
        },
      );
    });
  });

  describe("calculatePassiveAbilityDamageBonus", () => {
    it("returns { percent: 0, flat: 0 } when no passive abilities", () => {
      const attacker = createBaseParticipant();

      expect(calculatePassiveAbilityDamageBonus(attacker, {})).toEqual({
        percent: 0,
        flat: 0,
      });
    });

    it("returns bonus when ally_low_hp trigger is satisfied and context has allParticipants", () => {
      const lowHpAlly = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "ally1",
          name: "Ally",
        },
        combatStats: {
          ...createBaseParticipant().combatStats,
          maxHp: 100,
          currentHp: 10,
        },
      });

      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          passiveAbilities: [
            {
              id: "pa1",
              name: "Годрик",
              description: "+50% when ally low HP",
              trigger: { type: "ally_low_hp", lowHpThresholdPercent: 15 },
              effect: {
                type: "modify_damage",
                value: 50,
              },
            },
          ],
        },
      });

      const result = calculatePassiveAbilityDamageBonus(attacker, {
        allParticipants: [attacker, lowHpAlly],
      });

      expect(result.percent).toBe(50);
      expect(result.flat).toBe(0);
    });

    it("returns 0 when ally_low_hp trigger not satisfied (no low-HP ally)", () => {
      const healthyAlly = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "ally1",
          name: "Ally",
        },
        combatStats: {
          ...createBaseParticipant().combatStats,
          maxHp: 100,
          currentHp: 80,
        },
      });

      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          passiveAbilities: [
            {
              id: "pa1",
              name: "Годрик",
              description: "+50% when ally low HP",
              trigger: { type: "ally_low_hp", lowHpThresholdPercent: 15 },
              effect: { type: "modify_damage", value: 50 },
            },
          ],
        },
      });

      const result = calculatePassiveAbilityDamageBonus(attacker, {
        allParticipants: [attacker, healthyAlly],
      });

      expect(result.percent).toBe(0);
    });
  });

  describe("calculateDamageWithModifiers", () => {
    it("computes baseWithStat as baseDamage + statModifier when no hero parts", () => {
      const attacker = createBaseParticipant();

      const baseDamage = 7;

      const statModifier = 2; // STR 14

      const result = calculateDamageWithModifiers(
        attacker,
        baseDamage,
        statModifier,
        AttackType.MELEE,
      );

      expect(result.baseDamage).toBe(9); // 7 + 2
      expect(result.totalDamage).toBe(9);
      expect(result.skillPercentBonus).toBe(0);
      expect(result.skillFlatBonus).toBe(0);
    });

    it("applies skill percent bonus to base and sets totalDamage", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Напад",
              mainSkillId: "ms1",
              level: "expert",
              effects: [createSkillEffect("melee_damage", 30, true)],
            },
          ],
        },
      });

      const result = calculateDamageWithModifiers(
        attacker,
        10,
        2,
        AttackType.MELEE,
      );

      expect(result.skillPercentBonus).toBe(30);
      // baseWithStat = 12, +30% = 3.6 -> floor 3, total = 15
      expect(result.totalDamage).toBe(15);
    });

    it("applies heroLevelPart and heroDicePart when provided in context", () => {
      const attacker = createBaseParticipant();

      const result = calculateDamageWithModifiers(
        attacker,
        6,
        2,
        AttackType.MELEE,
        {
          heroLevelPart: 5,
          heroDicePart: 4,
        },
      );

      // baseWithStat = 6 + 5 + 4 + 2 = 17
      expect(result.baseDamage).toBe(17);
      expect(result.totalDamage).toBe(17);
    });

    it("breakdown includes skill bonus line when skill percent is non-zero", () => {
      const attacker = createBaseParticipant({
        battleData: {
          ...createBaseParticipant().battleData,
          activeSkills: [
            {
              skillId: "s1",
              name: "Експертна стрільба",
              mainSkillId: "ms1",
              level: "expert",
              effects: [createSkillEffect("ranged_damage", 30, true)],
            },
          ],
        },
      });

      const result = calculateDamageWithModifiers(
        attacker,
        8,
        1,
        AttackType.RANGED,
      );

      const hasSkillLine = result.breakdown.some(
        (s) =>
          s.includes("Бонус зі скілів") &&
          s.includes("30") &&
          s.includes("Експертна стрільба"),
      );

      expect(hasSkillLine).toBe(true);
    });

    it("breakdown ends with total line", () => {
      const attacker = createBaseParticipant();

      const result = calculateDamageWithModifiers(
        attacker,
        5,
        0,
        AttackType.MELEE,
      );

      const totalLine = result.breakdown.find((s) => s.includes("шкоди"));

      expect(totalLine).toBeDefined();
      expect(totalLine).toContain("5");
    });

    it("breakdown starts with sum of dice line", () => {
      const attacker = createBaseParticipant();

      const result = calculateDamageWithModifiers(
        attacker,
        10,
        2,
        AttackType.MELEE,
      );

      const diceLine = result.breakdown.find((s) =>
        s.startsWith("Сума кубиків:"),
      );

      expect(diceLine).toBeDefined();
      expect(diceLine).toContain("10");
    });
  });

  describe("applyResistance", () => {
    it("returns damage unchanged when defender has no resistances in extras", () => {
      const defender = createBaseParticipant();

      const r = applyResistance(100, defender, "physical");

      expect(r.finalDamage).toBe(100);
      expect(r.resistPercent).toBe(0);
      expect(r.resistMessage).toBeNull();
    });

    it("reduces damage by physical resistance percent when extras.resistances.physical is set", () => {
      const defender = createBaseParticipant();

      (defender.battleData as Record<string, unknown>).extras = {
        resistances: { physical: 25 },
      };

      const r = applyResistance(100, defender, "physical");

      expect(r.resistPercent).toBe(25);
      expect(r.finalDamage).toBe(75);
      expect(r.resistMessage).toContain("25%");
    });

    it("uses spell resistance when damageCategory is spell", () => {
      const defender = createBaseParticipant();

      (defender.battleData as Record<string, unknown>).extras = {
        resistances: { spell: 50 },
      };

      const r = applyResistance(100, defender, "spell");

      expect(r.resistPercent).toBe(50);
      expect(r.finalDamage).toBe(50);
    });

    it("returns finalDamage at least 0 when resistance is high", () => {
      const defender = createBaseParticipant();

      (defender.battleData as Record<string, unknown>).extras = {
        resistances: { physical: 100 },
      };

      const r = applyResistance(10, defender, "physical");

      expect(r.finalDamage).toBe(0);
    });
  });
});
