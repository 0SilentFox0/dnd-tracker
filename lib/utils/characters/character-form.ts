import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { CharacterType, type CharacterTypeValue, clampHeroInitiative, HERO_INITIATIVE_BOUNDS } from "@/lib/constants/characters";
import { fullSpellSlots } from "@/lib/utils/spells/spell-slots";
import type { Character, CharacterFormData } from "@/types/characters";
import type { SpellSlotProgression } from "@/types/races";

function getDefaultSpellSlotsForLevel(
  level: number,
  progression?: SpellSlotProgression[],
): Record<string, { max: number; current: number }> {
  return fullSpellSlots(level, progression);
}

/**
 * Конвертує плоску структуру Character в згруповану CharacterFormData
 */
export function characterToFormData(
  character: Partial<Character>,
  raceProgression?: SpellSlotProgression[],
): CharacterFormData {
  return {
    basicInfo: {
      name: character.name || "",
      type: (character.type as CharacterTypeValue) || CharacterType.PLAYER,
      controlledBy: character.controlledBy || "",
      level: character.level || 1,
      class: character.class || "",
      subclass: character.subclass,
      ...(character.classes?.length && { classes: character.classes }),
      archetype: character.archetype ?? "",
      race: character.race || "",
      subrace: character.subrace,
      alignment: character.alignment,
      background: character.background,
      avatar: character.avatar,
    },
    abilityScores: {
      strength: character.strength || 10,
      dexterity: character.dexterity || 10,
      constitution: character.constitution || 10,
      intelligence: character.intelligence || 10,
      wisdom: character.wisdom || 10,
      charisma: character.charisma || 10,
      primaryAbility: character.primaryAbility ?? null,
    },
    combatStats: {
      armorClass: character.armorClass ?? 10,
      initiative: clampHeroInitiative(character.initiative, { heroMin: HERO_INITIATIVE_BOUNDS.MIN, heroMax: HERO_INITIATIVE_BOUNDS.MAX }),
      speed: character.speed ?? 30,
      minTargets: character.minTargets || 1,
      maxTargets: character.maxTargets || 1,
      morale: (character as { morale?: number }).morale ?? 0,
    },
    skills: {
      savingThrows: (character.savingThrows as Record<string, boolean>) || {},
      skills: (character.skills as Record<string, boolean>) || {},
    },
    spellcasting: {
      spellcastingAbility: character.spellcastingAbility ?? undefined,
      spellSlots: (() => {
        const raw = character.spellSlots as
          | Record<string, { max: number; current: number }>
          | undefined;

        if (raw && Object.keys(raw).length > 0) return raw;

        return getDefaultSpellSlotsForLevel(character.level || 1, raceProgression);
      })(),
      knownSpells: (character.knownSpells as string[]) || [],
    },
    roleplay: {
      languages: (character.languages as string[]) || [],
      proficiencies:
        (character.proficiencies as Record<string, string[]>) || {},
      immunities: (character.immunities as string[]) || [],
    },
    abilities: {
      personalSkillId: (character as { personalSkillId?: string | null }).personalSkillId ?? "",
    },
    ...((character.raceChoices && Object.keys(character.raceChoices).length > 0) || (character.feats?.length ?? 0) > 0
      ? { choices: { raceChoices: character.raceChoices ?? {}, feats: character.feats ?? [] } }
      : {}),
  };
}

/** Після підняття рівня оновлюються лише рівень, характеристики й слоти — решта правок форми лишається. */
export function mergeLevelUpIntoForm(prev: CharacterFormData, updated: Partial<Character>): CharacterFormData {
  const next = characterToFormData(updated);

  return {
    ...prev,
    basicInfo: {
      ...prev.basicInfo,
      level: next.basicInfo.level,
      ...(next.basicInfo.classes && { classes: next.basicInfo.classes, class: next.basicInfo.class, subclass: next.basicInfo.subclass }),
    },
    abilityScores: { ...prev.abilityScores, ...Object.fromEntries(ABILITY_KEYS.map((k) => [k, next.abilityScores[k]])) },
    spellcasting: { ...prev.spellcasting, spellSlots: next.spellcasting.spellSlots, spellcastingAbility: next.spellcasting.spellcastingAbility ?? prev.spellcasting.spellcastingAbility },
  };
}

/**
 * Конвертує згруповану CharacterFormData в плоску структуру для API
 */

export function formDataToCharacter(
  formData: CharacterFormData,
): Omit<
  Character,
  "id" | "campaignId" | "createdAt" | "updatedAt" | "user" | "inventory"
> {
  return {
    type: formData.basicInfo.type,
    controlledBy: formData.basicInfo.controlledBy,
    name: formData.basicInfo.name,
    level: formData.basicInfo.level,
    class: formData.basicInfo.class,
    subclass: formData.basicInfo.subclass,
    ...(formData.basicInfo.classes && { classes: formData.basicInfo.classes.filter((e) => e.classId) }),
    archetype: formData.basicInfo.archetype || null,
    race: formData.basicInfo.race,
    subrace: formData.basicInfo.subrace,
    alignment: formData.basicInfo.alignment,
    background: formData.basicInfo.background,
    avatar: formData.basicInfo.avatar,
    strength: formData.abilityScores.strength,
    dexterity: formData.abilityScores.dexterity,
    constitution: formData.abilityScores.constitution,
    intelligence: formData.abilityScores.intelligence,
    wisdom: formData.abilityScores.wisdom,
    charisma: formData.abilityScores.charisma,
    primaryAbility: formData.abilityScores.primaryAbility,
    armorClass: formData.combatStats.armorClass,
    initiative: formData.combatStats.initiative,
    speed: formData.combatStats.speed,
    minTargets: formData.combatStats.minTargets,
    maxTargets: formData.combatStats.maxTargets,
    savingThrows: formData.skills.savingThrows,
    skills: formData.skills.skills,
    spellcastingAbility: formData.spellcasting.spellcastingAbility ?? null,
    spellSlots: formData.spellcasting.spellSlots,
    knownSpells: formData.spellcasting.knownSpells,
    languages: formData.roleplay.languages,
    proficiencies: formData.roleplay.proficiencies,
    immunities: formData.roleplay.immunities,
    morale: formData.combatStats.morale,
    personalSkillId: formData.abilities.personalSkillId?.trim() || null,
    ...(formData.choices && { raceChoices: formData.choices.raceChoices, feats: formData.choices.feats }),
  };
}
