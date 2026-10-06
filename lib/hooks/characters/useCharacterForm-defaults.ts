/**
 * Дефолтні значення форми персонажа для useCharacterForm
 */

import { CharacterType } from "@/lib/constants/characters";
import type { CharacterFormData } from "@/types/characters";

export const defaultCharacterFormData: CharacterFormData = {
  basicInfo: {
    name: "",
    type: CharacterType.PLAYER,
    controlledBy: "",
    level: 1,
    class: "",
    subclass: "",
    race: "",
    subrace: "",
    alignment: "",
    background: "",
    experience: 0,
    avatar: "",
  },
  abilityScores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    primaryAbility: null,
  },
  combatStats: {
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
    minTargets: 1,
    maxTargets: 1,
    morale: 0,
  },
  skills: {
    savingThrows: {},
    skills: {},
  },
  spellcasting: {
    spellcastingClass: "",
    spellcastingAbility: undefined,
    spellSlots: {},
    knownSpells: [],
  },
  roleplay: {
    languages: [],
    proficiencies: {},
    immunities: [],
  },
  abilities: {
    personalSkillId: "",
  },
};
