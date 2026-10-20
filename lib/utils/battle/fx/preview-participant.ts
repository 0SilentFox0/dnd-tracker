import { CombatStatus, type CombatStatusType, ParticipantSide } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import type { BattleParticipant } from "@/types/battle";

interface PreviewParticipantOptions {
  id: string;
  name: string;
  side: ParticipantSide;
  hp: number;
  maxHp: number;
  level?: number;
  status?: CombatStatusType;
  spellSlots?: BattleParticipant["spellcasting"]["spellSlots"];
}

/** A bare battle participant for dry-run casts (dev previews), no skills or artifacts. */
export function previewParticipant({ id, name, side, hp, maxHp, level = 1, status = CombatStatus.ACTIVE, spellSlots = {} }: PreviewParticipantOptions): BattleParticipant {
  return {
    basicInfo: { id, battleId: "preview", sourceId: id, sourceType: side === ParticipantSide.ENEMY ? "unit" : "character", name, side, controlledBy: side === ParticipantSide.ENEMY ? CONTROLLED_BY_DM : "preview" },
    abilities: {
      level,
      initiative: 10,
      baseInitiative: 10,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: { maxHp, currentHp: hp, tempHp: 0, armorClass: 12, speed: 30, morale: 0, status, minTargets: 1, maxTargets: 1 },
    spellcasting: { spellSlots, knownSpells: [] },
    battleData: { attacks: [], activeEffects: [], equippedArtifacts: [], resolvedAbilities: [] },
    actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
  };
}
