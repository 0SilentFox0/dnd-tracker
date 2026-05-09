import { describe, expect, it } from "vitest";

import {
  applyResistance,
  getCombinedResistancePercent,
} from "../resistance";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

function createParticipant(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    basicInfo: {
      id: "p1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Target",
      side: ParticipantSide.ENEMY,
      controlledBy: "dm",
    },
    abilities: {
      level: 1,
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

describe("battle-resistance", () => {
  describe("getCombinedResistancePercent", () => {
    it("returns 0 when target has no extras or racial resistance", () => {
      const target = createParticipant();

      expect(getCombinedResistancePercent(target, "slashing")).toBe(0);
      expect(getCombinedResistancePercent(target, "spell")).toBe(0);
    });

    it("returns skill physical resistance from extras for physical damage type", () => {
      const target = createParticipant();

      (target.battleData as unknown as Record<string, unknown>).extras = {
        resistances: { physical: 30 },
      };
      expect(getCombinedResistancePercent(target, "slashing")).toBe(30);
      expect(getCombinedResistancePercent(target, "piercing")).toBe(30);
    });

    it("returns skill spell resistance from extras for spell damage type", () => {
      const target = createParticipant();

      (target.battleData as unknown as Record<string, unknown>).extras = {
        resistances: { spell: 25 },
      };
      expect(getCombinedResistancePercent(target, "spell")).toBe(25);
    });
  });

  describe("applyResistance", () => {
    it("reduces damage by skill resistance when target has extras.resistances.physical", () => {
      const target = createParticipant();

      (target.battleData as unknown as Record<string, unknown>).extras = {
        resistances: { physical: 50 },
      };

      const r = applyResistance(target, 100, "slashing");

      expect(r.finalDamage).toBe(50);
      expect(r.resistanceApplied).toBe(true);
    });

    it("when damage is applied to a hero with Захист (Defense) skill, the corresponding % is subtracted before applying", () => {
      const incomingDamage = 100;

      const target = createParticipant();

      (target.battleData as unknown as Record<string, unknown>).extras = {
        resistances: { physical: 30 },
      };

      expect(getCombinedResistancePercent(target, "physical")).toBe(30);
      expect(getCombinedResistancePercent(target, "piercing")).toBe(30);

      const result = applyResistance(target, incomingDamage, "physical");

      expect(result.resistanceApplied).toBe(true);
      expect(result.finalDamage).toBe(70);
      expect(
        result.breakdown.some((s) => s.includes("30") && s.includes("опір")),
      ).toBe(true);
    });
  });
});
