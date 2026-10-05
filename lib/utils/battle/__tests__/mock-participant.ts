import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function createMockParticipant(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    basicInfo: {
      id: "p1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Тест",
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
