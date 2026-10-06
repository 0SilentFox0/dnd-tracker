import { ParticipantSide } from "@/lib/constants/battle";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
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

/** Додає учаснику пасивне вміння з указаними ефектами (мутує battleData). */
export function grantPassive(p: BattleParticipant, effects: StaticEffect[], name = "Пасивка"): BattleParticipant {
  const n = p.battleData.resolvedAbilities.length;

  p.battleData.resolvedAbilities = [
    ...p.battleData.resolvedAbilities,
    { id: `p${n}`, name, trigger: { event: "passive" }, effects, key: `skill:test:p${n}`, source: { type: "skill", id: "test", name } },
  ];

  return p;
}
