/**
 * Мок-учасники для run-skills-testing
 */

import { ParticipantSide } from "@/lib/constants/battle";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

export function createMockAttacker(activeSkills: ActiveSkill[]): BattleParticipant {
  return {
    basicInfo: {
      id: "attacker-1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Тест Атакуючий",
      side: ParticipantSide.ALLY,
      controlledBy: "dm",
    },
    abilities: {
      level: 10,
      initiative: 12,
      baseInitiative: 12,
      strength: 14,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: { strength: 2, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: {
      maxHp: 50,
      currentHp: 50,
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
      activeSkills,
      equippedArtifacts: [],
      skillUsageCounts: {},
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
}

export function createMockTarget(overrides?: Partial<BattleParticipant>): BattleParticipant {
  const base: BattleParticipant = {
    basicInfo: {
      id: "target-1",
      battleId: "b1",
      sourceId: "u1",
      sourceType: "unit",
      name: "Тест Ворог",
      side: ParticipantSide.ENEMY,
      controlledBy: "dm",
    },
    abilities: {
      level: 5,
      initiative: 10,
      baseInitiative: 10,
      strength: 12,
      dexterity: 10,
      constitution: 10,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
      modifiers: { strength: 1, dexterity: 0, constitution: 0, intelligence: -1, wisdom: -1, charisma: -1 },
      proficiencyBonus: 2,
      race: "orc",
    },
    combatStats: {
      maxHp: 40,
      currentHp: 40,
      tempHp: 0,
      armorClass: 12,
      speed: 25,
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
      skillUsageCounts: {},
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  if (overrides) {
    return { ...base, ...overrides } as BattleParticipant;
  }

  return base;
}
