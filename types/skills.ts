/**
 * Типи для скілів
 */
import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";

export interface Skill {
  abilities?: Ability[];
  abilitySummary?: string[];
  abilityIssues?: ConversionIssue[];
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  min_targets?: number | null;
  max_targets?: number | null;
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
  abilities?: Ability[];
  abilitySummary?: string[];
  abilityIssues?: ConversionIssue[];
  id: string;
  campaignId: string;
  basicInfo: {
    name: string;
    description?: string;
    icon?: string;
  };
  spellData: {
    spellId?: string;
    spellGroupId?: string;
    grantedSpellId?: string;
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
    /** UI касту: дозволити кілька цілей для spellData.spellId */
    spellAllowMultipleTargets?: boolean;
    /** Заклинання з довідника (зазвичай target), що стають AOE у бою */
    spellAoeSpellIds?: string[];
  };
  mainSkillData: {
    mainSkillId?: string;
  };
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
export type PersonalSkillOption = Pick<Skill, "id" | "name" | "icon" | "description">;
