/**
 * Тести breakdown урону (превью в UI). Джерело правди: docs/DAMAGE_CALCULATION_TEST_ARCHITECTURE.md
 */

import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import {
  computeDamageBreakdown,
  computeDamageBreakdownMultiTarget,
} from "../battle-damage-breakdown";

function createBaseParticipant(overrides?: Partial<BattleParticipant>): BattleParticipant {
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

function createMeleeAttack(): BattleAttack {
  return {
    name: "Меч",
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: "2d6",
    damageType: "slashing",
  };
}

describe("battle-damage-breakdown", () => {
  describe("computeDamageBreakdown", () => {
    it("returns breakdown and totalDamage for basic melee attack", () => {
      const attacker = createBaseParticipant();
      const target = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t1",
          name: "Enemy",
          side: ParticipantSide.ENEMY,
        },
      });

      const result = computeDamageBreakdown({
        attacker,
        target,
        attack: createMeleeAttack(),
        damageRolls: [3, 4],
        allParticipants: [attacker, target],
      });

      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.totalDamage).toBeGreaterThanOrEqual(0);
      const totalLine = result.breakdown.find((s) => s.includes("шкоди"));
      expect(totalLine).toBeDefined();
      expect(totalLine).toContain(String(result.totalDamage));
    });

    it("doubles totalDamage and appends crit line when isCritical is true", () => {
      const attacker = createBaseParticipant();
      const target = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t1",
          name: "Enemy",
          side: ParticipantSide.ENEMY,
        },
      });

      const normal = computeDamageBreakdown({
        attacker,
        target,
        attack: createMeleeAttack(),
        damageRolls: [2, 3],
        allParticipants: [attacker, target],
      });

      const critical = computeDamageBreakdown({
        attacker,
        target,
        attack: createMeleeAttack(),
        damageRolls: [2, 3],
        allParticipants: [attacker, target],
        isCritical: true,
      });

      expect(critical.totalDamage).toBe(normal.totalDamage * 2);
      const critLine = critical.breakdown.find(
        (s) => s.includes("крит") || s.includes("× 2"),
      );
      expect(critLine).toBeDefined();
    });

    it("returns targetBreakdown and finalDamage for single target", () => {
      const attacker = createBaseParticipant();
      const target = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t1",
          name: "Enemy",
          side: ParticipantSide.ENEMY,
        },
      });

      const result = computeDamageBreakdown({
        attacker,
        target,
        attack: createMeleeAttack(),
        damageRolls: [2, 3],
        allParticipants: [attacker, target],
      });

      expect(result.targetBreakdown).toBeDefined();
      expect(Array.isArray(result.targetBreakdown)).toBe(true);
      expect(typeof result.finalDamage).toBe("number");
      expect(result.finalDamage).toBeGreaterThanOrEqual(0);
    });

    it("reduces finalDamage when target has physical resistance in extras", () => {
      const attacker = createBaseParticipant();
      const target = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t1",
          name: "Enemy",
          side: ParticipantSide.ENEMY,
        },
      });
      (target.battleData as Record<string, unknown>).extras = {
        resistances: { physical: 50 },
      };

      const result = computeDamageBreakdown({
        attacker,
        target,
        attack: createMeleeAttack(),
        damageRolls: [6, 6],
        allParticipants: [attacker, target],
      });

      expect(result.finalDamage).toBeLessThan(result.totalDamage);
      const hasResistLine = result.targetBreakdown.some(
        (s) => s.includes("−") || s.includes("%") || s.includes("Сумарна шкода"),
      );
      expect(hasResistLine).toBe(true);
    });
  });

  describe("computeDamageBreakdownMultiTarget", () => {
    it("returns one entry per target with targetBreakdown and finalDamage", () => {
      const attacker = createBaseParticipant();
      const target1 = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t1",
          name: "Enemy 1",
          side: ParticipantSide.ENEMY,
        },
      });
      const target2 = createBaseParticipant({
        basicInfo: {
          ...createBaseParticipant().basicInfo,
          id: "t2",
          name: "Enemy 2",
          side: ParticipantSide.ENEMY,
        },
      });

      const result = computeDamageBreakdownMultiTarget({
        attacker,
        targets: [target1, target2],
        attack: createMeleeAttack(),
        damageRolls: [4, 4],
        allParticipants: [attacker, target1, target2],
      });

      expect(result.targets).toHaveLength(2);
      expect(result.targets[0].targetName).toBe("Enemy 1");
      expect(result.targets[1].targetName).toBe("Enemy 2");
      expect(result.targets[0].targetBreakdown.length).toBeGreaterThanOrEqual(0);
      expect(typeof result.targets[0].finalDamage).toBe("number");
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.totalDamage).toBeGreaterThanOrEqual(0);
    });
  });
});
