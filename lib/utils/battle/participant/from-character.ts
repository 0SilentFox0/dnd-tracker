/**
 * Створення BattleParticipant з Character
 */

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { extractEquippedArtifactsFromCharacter } from "./extract-artifacts";
import { extractAttacksFromCharacter } from "./extract-attacks";
import { extractRacialAbilities } from "./extract-racial";
import { extractActiveSkillsFromCharacter } from "./extract-skills";
import { resolveLearnedSpellsFromCharacter } from "./from-character-learned-spells";
import { resolveSpellSlotsFromCharacter } from "./from-character-spell-slots";
import { applyPassiveSkillEffects } from "./passive";

import { ArtifactModifierType } from "@/lib/constants/artifacts";
import { ParticipantSide } from "@/lib/constants/battle";
import { getHeroMaxHp } from "@/lib/constants/hero-scaling";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";

/**
 * Створює BattleParticipant з Character. Завантажує скіли, артефакти, заклинання.
 */
export async function createBattleParticipantFromCharacter(
  character: CharacterFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber?: number,
  context?: CampaignSpellContext,
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(character.strength),
    dexterity: getAbilityModifier(character.dexterity),
    constitution: getAbilityModifier(character.constitution),
    intelligence: getAbilityModifier(character.intelligence),
    wisdom: getAbilityModifier(character.wisdom),
    charisma: getAbilityModifier(character.charisma),
  };

  const activeSkills = await extractActiveSkillsFromCharacter(
    character,
    character.campaignId,
    context?.skillsById,
  );

  const equippedArtifacts = await extractEquippedArtifactsFromCharacter(
    character,
    context?.artifactsById,
  );

  const attacks = await extractAttacksFromCharacter(
    character,
    context?.artifactsById,
  );

  const racialAbilities = await extractRacialAbilities(
    character.race,
    character.campaignId,
    context?.racesByName?.[character.race] ?? undefined,
  );

  const rawKnown = character.knownSpells;

  const baseKnownSpells = Array.isArray(rawKnown)
    ? (rawKnown as unknown[]).map((id) => String(id)).filter(Boolean)
    : [];

  const knownSpells = await resolveLearnedSpellsFromCharacter(
    character,
    baseKnownSpells,
    context,
  );

  const resolvedSpellSlots = await resolveSpellSlotsFromCharacter(character, context);

  const hpMult = (character as { hpMultiplier?: number | null }).hpMultiplier ?? 1;

  const computedMaxHp = getHeroMaxHp(character.level, character.strength, {
    hpMultiplier: hpMult,
  });

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${character.id}-${instanceNumber || 0}-${Date.now()}`,
      battleId,
      sourceId: character.id,
      sourceType: "character",
      instanceNumber: instanceNumber || undefined,
      instanceId: instanceNumber ? `${character.id}-${instanceNumber - 1}` : undefined,
      name: character.name,
      avatar: character.avatar || undefined,
      side,
      controlledBy: character.controlledBy || "dm",
    },
    abilities: {
      level: character.level,
      initiative: character.initiative,
      baseInitiative: character.initiative,
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
      modifiers,
      proficiencyBonus: character.proficiencyBonus,
      race: character.race,
    },
    combatStats: {
      maxHp: computedMaxHp,
      currentHp: computedMaxHp,
      tempHp: 0,
      armorClass: character.armorClass,
      speed: character.speed,
      morale: (character as { morale?: number }).morale || 0,
      status: computedMaxHp <= 0 ? "dead" : "active",
      minTargets: character.minTargets ?? 1,
      maxTargets: character.maxTargets ?? 1,
    },
    spellcasting: {
      spellcastingClass: character.spellcastingClass || undefined,
      spellcastingAbility: character.spellcastingAbility as
        | "intelligence"
        | "wisdom"
        | "charisma"
        | undefined,
      spellSaveDC: character.spellSaveDC || undefined,
      spellAttackBonus: character.spellAttackBonus || undefined,
      spellSlots: resolvedSpellSlots,
      knownSpells,
    },
    battleData: {
      attacks,
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities,
      activeSkills,
      equippedArtifacts,
      skillUsageCounts: {},
      pendingExtraActions: 0,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  let minTargetsBonus = 0;

  let maxTargetsBonus = 0;

  for (const skill of participant.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (effect.stat === "min_targets" || effect.stat === "min_targets_bonus") {
        minTargetsBonus += typeof effect.value === "number" ? effect.value : 0;
      }

      if (effect.stat === "max_targets" || effect.stat === "max_targets_bonus") {
        maxTargetsBonus += typeof effect.value === "number" ? effect.value : 0;
      }
    }
  }

  for (const artifact of participant.battleData.equippedArtifacts) {
    if (artifact.bonuses.minTargets) minTargetsBonus += artifact.bonuses.minTargets;

    if (artifact.bonuses.maxTargets) maxTargetsBonus += artifact.bonuses.maxTargets;

    for (const modifier of artifact.modifiers) {
      if (
        modifier.type === "min_targets" ||
        modifier.type === ArtifactModifierType.MIN_TARGETS
      ) {
        minTargetsBonus += modifier.value;
      }

      if (
        modifier.type === "max_targets" ||
        modifier.type === ArtifactModifierType.MAX_TARGETS
      ) {
        maxTargetsBonus += modifier.value;
      }
    }
  }

  participant.combatStats.minTargets += minTargetsBonus;
  participant.combatStats.maxTargets += maxTargetsBonus;

  applyPassiveSkillEffects(participant);

  return participant;
}
