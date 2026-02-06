/**
 * Утиліти для конвертації між CharacterFormData (згрупована) та Character (плоска)
 */

import type { Character, CharacterFormData } from "@/types/characters";

/**
 * Конвертує плоску структуру Character в згруповану CharacterFormData
 */
export function characterToFormData(
  character: Partial<Character>,
): CharacterFormData {
  return {
    basicInfo: {
      name: character.name || "",
      type: (character.type as "player" | "npc_hero") || "player",
      controlledBy: character.controlledBy || "",
      level: character.level || 1,
      class: character.class || "",
      subclass: character.subclass,
      race: character.race || "",
      subrace: character.subrace,
      alignment: character.alignment,
      background: character.background,
      experience: character.experience || 0,
      avatar: character.avatar,
    },
    abilityScores: {
      strength: character.strength || 10,
      dexterity: character.dexterity || 10,
      constitution: character.constitution || 10,
      intelligence: character.intelligence || 10,
      wisdom: character.wisdom || 10,
      charisma: character.charisma || 10,
    },
    combatStats: {
      armorClass: character.armorClass || 10,
      initiative: character.initiative || 0,
      speed: character.speed || 30,
      maxHp: character.maxHp || 10,
      currentHp: character.currentHp || 10,
      tempHp: character.tempHp || 0,
      hitDice: character.hitDice || "1d8",
      minTargets: character.minTargets || 1,
      maxTargets: character.maxTargets || 1,
    },
    skills: {
      savingThrows: (character.savingThrows as Record<string, boolean>) || {},
      skills: (character.skills as Record<string, boolean>) || {},
    },
    spellcasting: {
      spellcastingClass: character.spellcastingClass,
      spellcastingAbility: character.spellcastingAbility,
      spellSlots: character.spellSlots as
        | Record<string, { max: number; current: number }>
        | undefined,
      knownSpells: (character.knownSpells as string[]) || [],
    },
    roleplay: {
      languages: (character.languages as string[]) || [],
      proficiencies:
        (character.proficiencies as Record<string, string[]>) || {},
      immunities: (character.immunities as string[]) || [],
      morale: character.morale,
      personalityTraits: character.personalityTraits,
      ideals: character.ideals,
      bonds: character.bonds,
      flaws: character.flaws,
    },
    abilities: {
      personalSkillId: (character as { personalSkillId?: string | null }).personalSkillId ?? "",
    },
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
    race: formData.basicInfo.race,
    subrace: formData.basicInfo.subrace,
    alignment: formData.basicInfo.alignment,
    background: formData.basicInfo.background,
    experience: formData.basicInfo.experience,
    avatar: formData.basicInfo.avatar,
    strength: formData.abilityScores.strength,
    dexterity: formData.abilityScores.dexterity,
    constitution: formData.abilityScores.constitution,
    intelligence: formData.abilityScores.intelligence,
    wisdom: formData.abilityScores.wisdom,
    charisma: formData.abilityScores.charisma,
    armorClass: formData.combatStats.armorClass,
    initiative: formData.combatStats.initiative,
    speed: formData.combatStats.speed,
    maxHp: formData.combatStats.maxHp,
    currentHp: formData.combatStats.currentHp,
    tempHp: formData.combatStats.tempHp,
    hitDice: formData.combatStats.hitDice,
    minTargets: formData.combatStats.minTargets,
    maxTargets: formData.combatStats.maxTargets,
    savingThrows: formData.skills.savingThrows,
    skills: formData.skills.skills,
    spellcastingClass: formData.spellcasting.spellcastingClass,
    spellcastingAbility: formData.spellcasting.spellcastingAbility,
    spellSlots: formData.spellcasting.spellSlots,
    knownSpells: formData.spellcasting.knownSpells,
    languages: formData.roleplay.languages,
    proficiencies: formData.roleplay.proficiencies,
    immunities: formData.roleplay.immunities,
    morale: formData.roleplay.morale,
    personalityTraits: formData.roleplay.personalityTraits,
    ideals: formData.roleplay.ideals,
    bonds: formData.roleplay.bonds,
    flaws: formData.roleplay.flaws,
    personalSkillId: formData.abilities.personalSkillId?.trim() || null,
  };
}
