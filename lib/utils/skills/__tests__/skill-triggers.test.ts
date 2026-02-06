import { describe, it, expect } from "vitest";
import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import { evaluateSkillTrigger, getSkillsByTrigger } from "../skill-triggers";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";
import type { SkillTrigger } from "@/types/skill-triggers";

function createMockParticipant(overrides?: Partial<BattleParticipant>): BattleParticipant {
  return {
    basicInfo: {
      id: "p1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Test",
      side: ParticipantSide.ALLY,
      controlledBy: "user-1",
    },
    abilities: {
      level: 1,
      initiative: 10,
      baseInitiative: 10,
      strength: 14,
      dexterity: 12,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: { strength: 2, dexterity: 1, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: {
      maxHp: 20,
      currentHp: 20,
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

describe("skill-triggers", () => {
  describe("evaluateSkillTrigger", () => {
    it("simple trigger startRound with currentRound in context", () => {
      const participant = createMockParticipant();
      const trigger: SkillTrigger = { type: "simple", trigger: "startRound" };
      expect(
        evaluateSkillTrigger(trigger, participant, { currentRound: 1 }),
      ).toBe(true);
      expect(
        evaluateSkillTrigger(trigger, participant, {}),
      ).toBe(false);
    });

    it("simple trigger bonusAction when not used", () => {
      const participant = createMockParticipant();
      const trigger: SkillTrigger = { type: "simple", trigger: "bonusAction" };
      expect(
        evaluateSkillTrigger(trigger, participant),
      ).toBe(true);
    });

    it("simple trigger bonusAction when already used", () => {
      const participant = createMockParticipant({
        actionFlags: {
          hasUsedAction: false,
          hasUsedBonusAction: true,
          hasUsedReaction: false,
          hasExtraTurn: false,
        },
      });
      const trigger: SkillTrigger = { type: "simple", trigger: "bonusAction" };
      expect(
        evaluateSkillTrigger(trigger, participant),
      ).toBe(false);
    });

    it("simple trigger afterOwnerAttack with isOwnerAction", () => {
      const participant = createMockParticipant();
      const trigger: SkillTrigger = { type: "simple", trigger: "afterOwnerAttack" };
      expect(
        evaluateSkillTrigger(trigger, participant, { isOwnerAction: true }),
      ).toBe(true);
      expect(
        evaluateSkillTrigger(trigger, participant, { isOwnerAction: false }),
      ).toBe(false);
    });
  });

  describe("getSkillsByTrigger", () => {
    const skillWithBonus: ActiveSkill = {
      skillId: "s1",
      mainSkillId: "",
      level: SkillLevel.BASIC,
      name: "Bonus Skill",
      effects: [],
      skillTriggers: [{ type: "simple", trigger: "bonusAction" }],
    };
    const skillWithStartRound: ActiveSkill = {
      skillId: "s2",
      mainSkillId: "",
      level: SkillLevel.BASIC,
      name: "Start Round",
      effects: [],
      skillTriggers: [{ type: "simple", trigger: "startRound" }],
    };
    const skillNoTriggers: ActiveSkill = {
      skillId: "s3",
      mainSkillId: "",
      level: SkillLevel.BASIC,
      name: "No Triggers",
      effects: [],
    };

    it("returns skills that have the given trigger type", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [skillWithBonus, skillWithStartRound, skillNoTriggers],
          equippedArtifacts: [],
        },
      });
      const result = getSkillsByTrigger(
        participant.battleData.activeSkills,
        "bonusAction",
        participant,
        [participant],
        { currentRound: 1 },
      );
      expect(result).toHaveLength(1);
      expect(result[0].skillId).toBe("s1");
    });

    it("returns empty when no skills have the trigger", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [skillWithStartRound],
          equippedArtifacts: [],
        },
      });
      const result = getSkillsByTrigger(
        participant.battleData.activeSkills,
        "bonusAction",
        participant,
        [participant],
      );
      expect(result).toHaveLength(0);
    });
  });
});
