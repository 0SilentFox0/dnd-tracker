/**
 * Типи для скілів
 */

import type { SkillTriggers } from "./skill-triggers";

export interface Skill {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  races: string[];
  isRacial: boolean;
  bonuses: Record<string, number>;
  damage: number | null;
  armor: number | null;
  speed: number | null;
  physicalResistance: number | null;
  magicalResistance: number | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId?: string | null;
  spellEnhancementTypes?: string[];
  spellEffectIncrease?: number | null;
  spellTargetChange?: { target: string } | null;
  spellAdditionalModifier?: {
    modifier?: string;
    damageDice?: string;
    duration?: number;
  } | null;
  spellNewSpellId?: string | null;
  skillTriggers?: SkillTriggers;
  createdAt: Date;
  spell?: {
    id: string;
    name: string;
  } | null;
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Згрупована структура скіла (як повертає API)
 */
export interface GroupedSkill {
  id: string;
  campaignId: string;
  basicInfo: {
    name: string;
    description?: string;
    icon?: string;
    races: string[];
    isRacial: boolean;
  };
  bonuses: Record<string, number>;
  combatStats: {
    damage?: number;
    armor?: number;
    speed?: number;
    physicalResistance?: number;
    magicalResistance?: number;
  };
  spellData: {
    spellId?: string;
    spellGroupId?: string;
  };
  spellEnhancementData: {
    spellEnhancementTypes?: string[];
    spellEffectIncrease?: number;
    spellTargetChange?: { target: string } | null;
    spellAdditionalModifier?: {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    } | null;
    spellNewSpellId?: string;
  };
  mainSkillData: {
    mainSkillId?: string;
  };
  skillTriggers?: SkillTriggers;
  createdAt: Date;
  spell?: {
    id: string;
    name: string;
  } | null;
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

export interface UnlockedSkill {
  id: string;
  name: string;
  bonus?: number;
}

export interface CharacterSkill {
  id: string;
  characterId: string;
  skillTreeId: string;
  unlockedSkills: UnlockedSkill[];
  updatedAt: Date;
  skillTree?: {
    id: string;
    race: string;
  } | null;
}
