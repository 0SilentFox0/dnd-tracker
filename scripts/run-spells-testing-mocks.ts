/**
 * Моки учасників та допоміжні функції для run-spells-testing
 */

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function mod(ability: number): number {
  return Math.floor((ability - 10) / 2);
}

export function avgRoll(diceType: string): number {
  const m = diceType?.toLowerCase().match(/d(\d+)/);

  const sides = m ? parseInt(m[1], 10) : 6;

  return Math.ceil((sides + 1) / 2);
}

export function generateDamageRolls(
  diceCount: number | null,
  diceType: string | null,
): number[] {
  const n = Math.max(1, diceCount ?? 2);

  const avg = avgRoll(diceType ?? "d6");

  return Array.from({ length: n }, () => avg);
}

export function createMockCaster(
  spellId: string,
  level: number,
  _spellLevel: number,
): BattleParticipant {
  void _spellLevel;

  const wisdom = 14;

  const intelligence = 16;

  const dexterity = 14;

  const slots: Record<string, { max: number; current: number }> = {};

  for (let i = 0; i <= 5; i++) slots[String(i)] = { max: 4, current: 4 };

  return {
    basicInfo: {
      id: "caster-test",
      battleId: "test-battle",
      sourceId: "caster-test",
      sourceType: "character",
      instanceId: undefined,
      name: "Test Caster",
      avatar: undefined,
      side: ParticipantSide.ALLY,
      controlledBy: "dm",
    },
    abilities: {
      level,
      initiative: 10,
      baseInitiative: 10,
      strength: 10,
      dexterity,
      constitution: 14,
      intelligence,
      wisdom,
      charisma: 10,
      modifiers: {
        strength: mod(10),
        dexterity: mod(dexterity),
        constitution: mod(14),
        intelligence: mod(intelligence),
        wisdom: mod(wisdom),
        charisma: mod(10),
      },
      proficiencyBonus: 2 + Math.floor(level / 4),
      race: "human",
    },
    combatStats: {
      maxHp: 50,
      currentHp: 50,
      tempHp: 0,
      armorClass: 12,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: {
      spellcastingClass: "wizard",
      spellcastingAbility: "intelligence",
      spellSaveDC: 14,
      spellAttackBonus: 5,
      spellSlots: slots,
      knownSpells: [spellId],
    },
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
}

export function createMockEnemy(id: string, tier: number = 7): BattleParticipant {
  const hp = 15 * tier;

  const ac = 10 + Math.floor(tier / 2);

  const initiative = 5 + tier;

  const speed = 25 + tier;

  return {
    basicInfo: {
      id,
      battleId: "test-battle",
      sourceId: id,
      sourceType: "unit",
      instanceId: id,
      name: `Test Enemy T${tier}`,
      avatar: undefined,
      side: ParticipantSide.ENEMY,
      controlledBy: "dm",
    },
    abilities: {
      level: tier,
      initiative,
      baseInitiative: initiative,
      strength: 10 + tier,
      dexterity: 10 + tier,
      constitution: 12 + tier,
      intelligence: 10,
      wisdom: 10,
      charisma: 8,
      modifiers: {
        strength: mod(10 + tier),
        dexterity: mod(10 + tier),
        constitution: mod(12 + tier),
        intelligence: mod(10),
        wisdom: mod(10),
        charisma: mod(8),
      },
      proficiencyBonus: 2 + Math.floor(tier / 4),
      race: "human",
    },
    combatStats: {
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      armorClass: ac,
      speed,
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
}

export function createMockAlly(id: string, tier: number = 7): BattleParticipant {
  const base = createMockEnemy(id, tier);

  return {
    ...base,
    basicInfo: {
      ...base.basicInfo,
      name: `Test Ally T${tier}`,
      side: ParticipantSide.ALLY,
    },
  };
}
