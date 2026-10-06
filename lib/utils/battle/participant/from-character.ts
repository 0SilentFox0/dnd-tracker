/**
 * Створення BattleParticipant з Character
 */

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { loadEquippedArtifactRows, toEquippedArtifacts } from "./extract-artifacts";
import { extractAttacksFromCharacter } from "./extract-attacks";
import { resolveCharacterSkillEntries } from "./extract-skills";
import { resolveLearnedSpellsFromCharacter } from "./from-character-learned-spells";
import { resolveSpellSlotsFromCharacter } from "./from-character-spell-slots";
import { loadRace } from "./load-race";
import { buildSpellEnhancers } from "./spell-enhancers";

import { ParticipantSide } from "@/lib/constants/battle";
import { getHeroMaxHp } from "@/lib/constants/hero-scaling";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { findCompletedSets } from "@/lib/utils/battle/artifact-sets";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { getAbilityModifier, getProficiencyBonus, spellcastingDerived } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";
import { ABILITY_KEYS, type AbilityKey } from "@/types/characters";

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

  const mainSkillGroups = context ? new Map(context.mainSkills.map((m) => [m.id, m.spellGroupId])) : undefined;

  const skills = await resolveCharacterSkillEntries(
    character,
    character.campaignId,
    context?.skillsById,
    mainSkillGroups,
    context ? (context.skillTreeByRace[character.race] ?? null) : undefined,
  );

  const artifactRows = await loadEquippedArtifactRows(character, context?.artifactsById);

  const equippedArtifacts = toEquippedArtifacts(artifactRows);

  const completed = await findCompletedSets(equippedArtifacts, character.campaignId, context);

  const attacks = await extractAttacksFromCharacter(
    character,
    context?.artifactsById,
  );

  const race = await loadRace(character.race, character.campaignId, context ? (context.racesByName[character.race] ?? null) : undefined);

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

  const meleeMult =
    (character as { meleeMultiplier?: number | null }).meleeMultiplier ?? 1;

  const rangedMult =
    (character as { rangedMultiplier?: number | null }).rangedMultiplier ?? 1;

  const proficiencyBonus = getProficiencyBonus(character.level);

  const scores = { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma };

  const primaryAbility = (ABILITY_KEYS as readonly string[]).includes(character.primaryAbility ?? "") ? (character.primaryAbility as AbilityKey) : undefined;

  const spell = spellcastingDerived(character.level, character.spellcastingAbility, scores);

  const computedMaxHp = getHeroMaxHp(character.level, character.strength, {
    hpMultiplier: hpMult,
  });

  const resolvedAbilities = [
    ...collectCharacterAbilities({
    skills,
    race,
    artifacts: artifactRows.map(({ row, slot }) => ({ ...row, slot })),
    completedSets: completed.sets,
  }),
    ...immunityAbilities(getCharacterImmunities(character, race as never), { type: "character", id: character.id }),
  ];

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
      proficiencyBonus,
      race: character.race,
      primaryAbility,
      meleeMultiplier: meleeMult,
      rangedMultiplier: rangedMult,
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
      spellSaveDC: spell?.saveDC,
      spellAttackBonus: spell?.attackBonus,
      spellSlots: resolvedSpellSlots,
      knownSpells,
    },
    battleData: {
      attacks,
      activeEffects: [],
      equippedArtifacts,
      artifactSetHudMarkers: completed.hudMarkers,
      resolvedAbilities,
      spellEnhancers: buildSpellEnhancers(skills),
      abilityUsage: {},
      pendingExtraActions: 0,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  return bakePassives(participant);
}
