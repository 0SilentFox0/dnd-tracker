/**
 * Побудова об'єктів basicInfo, abilityScores, combatStats тощо для useCharacterForm.
 */

import { type CharacterTypeValue } from "@/lib/constants/characters";
import type { AbilityKey, CharacterFormData } from "@/types/characters";

export interface CharacterFormHandlers {
  toggleSavingThrow: (ability: string) => void;
  toggleSkill: (skill: string) => void;
}

export function buildCharacterFormBindings(
  formData: CharacterFormData,
  setFormData: React.Dispatch<React.SetStateAction<CharacterFormData>>,
  handlers: CharacterFormHandlers,
) {
  const { toggleSavingThrow, toggleSkill } = handlers;

  const basicInfo = {
    ...formData.basicInfo,
    setters: {
      setName: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, name: value },
        })),
      setType: (value: CharacterTypeValue) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, type: value },
        })),
      setControlledBy: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, controlledBy: value },
        })),
      setLevel: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, level: value },
        })),
      setClass: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, class: value },
        })),
      setSubclass: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, subclass: value },
        })),
      setRace: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, race: value },
        })),
      setSubrace: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, subrace: value },
        })),
      setAlignment: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, alignment: value },
        })),
      setBackground: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, background: value },
        })),
      setExperience: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, experience: value },
        })),
      setAvatar: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, avatar: value },
        })),
    },
  };

  const abilityScores = {
    ...formData.abilityScores,
    setters: {
      setStrength: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, strength: value },
        })),
      setDexterity: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, dexterity: value },
        })),
      setConstitution: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, constitution: value },
        })),
      setIntelligence: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, intelligence: value },
        })),
      setWisdom: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, wisdom: value },
        })),
      setCharisma: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, charisma: value },
        })),
      setPrimaryAbility: (value: AbilityKey | null) =>
        setFormData((prev) => ({
          ...prev,
          abilityScores: { ...prev.abilityScores, primaryAbility: value },
        })),
    },
  };

  const combatStats = {
    ...formData.combatStats,
    setters: {
      setArmorClass: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, armorClass: value },
        })),
      setInitiative: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, initiative: value },
        })),
      setSpeed: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, speed: value },
        })),
      setMinTargets: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, minTargets: value },
        })),
      setMaxTargets: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, maxTargets: value },
        })),
      setMorale: (value: number) =>
        setFormData((prev) => ({
          ...prev,
          combatStats: { ...prev.combatStats, morale: value },
        })),
    },
  };

  const skills = {
    ...formData.skills,
    handlers: { toggleSavingThrow, toggleSkill },
  };

  const spellcasting = {
    ...formData.spellcasting,
    setters: {
      setSpellcastingAbility: (
        value: "intelligence" | "wisdom" | "charisma" | undefined,
      ) =>
        setFormData((prev) => ({
          ...prev,
          spellcasting: { ...prev.spellcasting, spellcastingAbility: value },
        })),
      setSpellSlots: (
        value: Record<string, { max: number; current: number }>,
      ) =>
        setFormData((prev) => ({
          ...prev,
          spellcasting: { ...prev.spellcasting, spellSlots: value },
        })),
    },
  };

  const abilities = {
    ...formData.abilities,
    setters: {
      setPersonalSkillId: (value: string) =>
        setFormData((prev) => ({
          ...prev,
          abilities: { ...prev.abilities, personalSkillId: value },
        })),
    },
  };

  return {
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    spellcasting,
    abilities,
  };
}
