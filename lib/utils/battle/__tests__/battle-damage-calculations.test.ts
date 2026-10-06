/**
 * Тести логіки обрахунку шкоди (TDD — тести як джерело правди).
 * Архітектура: docs/DAMAGE_CALCULATION_TEST_ARCHITECTURE.md
 */

import { describe, expect, it } from "vitest";

import { calculateDamageWithModifiers } from "../damage";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { grantPassive } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleParticipant } from "@/types/battle";

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
      equippedArtifacts: [],
      resolvedAbilities: [],
      spellEnhancers: [],
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

describe("battle-damage-calculations", () => {
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
      const attacker = grantPassive(createBaseParticipant(), [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 30 }], "Напад");

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
      const attacker = grantPassive(createBaseParticipant(), [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 30 }], "Експертна стрільба");

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
});
