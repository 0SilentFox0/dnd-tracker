/**
 * Типи та функції нормалізації/парсингу початкових даних для форми скіла
 */

import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SpellOption {
  id: string;
  name: string;
}

export type InitialSkillFormData = Skill | GroupedSkill;

export interface NormalizedSkillFormData {
  id?: string;
  name: string;
  description: string | null;
  icon: string | null;
  abilities?: Ability[];
  abilityIssues?: ConversionIssue[];
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId?: string | null;
  mainSkillId: string | null;
  spellEnhancementTypes?: unknown;
  spellEffectIncrease?: number | null;
  spellTargetChange?: unknown;
  spellAdditionalModifier?: unknown;
  spellNewSpellId?: string | null;
  spellAllowMultipleTargets?: boolean;
  spellAoeSpellIds?: string[];
}

export function normalizeInitialSkillData(
  data: InitialSkillFormData | undefined,
): NormalizedSkillFormData | undefined {
  if (!data) return undefined;

  if ("basicInfo" in data) {
    const grouped = data as GroupedSkill;

    return {
      id: grouped.id,
      name: grouped.basicInfo.name,
      description: grouped.basicInfo.description || null,
      icon: grouped.basicInfo.icon || null,
      abilities: grouped.abilities,
      abilityIssues: grouped.abilityIssues,
      spellId: grouped.spellData.spellId || null,
      spellGroupId: grouped.spellData.spellGroupId || null,
      grantedSpellId: grouped.spellData.grantedSpellId ?? null,
      mainSkillId: grouped.mainSkillData.mainSkillId || null,
      spellEnhancementTypes: grouped.spellEnhancementData.spellEnhancementTypes,
      spellEffectIncrease:
        grouped.spellEnhancementData.spellEffectIncrease || null,
      spellTargetChange: grouped.spellEnhancementData.spellTargetChange || null,
      spellAdditionalModifier:
        grouped.spellEnhancementData.spellAdditionalModifier || null,
      spellNewSpellId: grouped.spellEnhancementData.spellNewSpellId || null,
      spellAllowMultipleTargets:
        grouped.spellEnhancementData.spellAllowMultipleTargets === true,
      spellAoeSpellIds: Array.isArray(
        grouped.spellEnhancementData.spellAoeSpellIds,
      )
        ? grouped.spellEnhancementData.spellAoeSpellIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : [],
    };
  }

  return data as unknown as NormalizedSkillFormData;
}

export function parseInitialSpellEnhancementTypes(
  types: unknown,
): SpellEnhancementType[] {
  if (Array.isArray(types)) return types as SpellEnhancementType[];

  return [];
}

export function parseInitialSpellTargetChange(
  targetChange: unknown,
): string | null {
  if (
    targetChange &&
    typeof targetChange === "object" &&
    targetChange !== null &&
    "target" in targetChange
  ) {
    return (targetChange as { target: string }).target;
  }

  return null;
}

export function parseInitialSpellAdditionalModifier(modifier: unknown): {
  modifier?: string;
  damageDice?: string;
  duration?: number;
} {
  if (modifier && typeof modifier === "object" && modifier !== null) {
    return modifier as {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };
  }

  return {
    modifier: undefined,
    damageDice: "",
    duration: undefined,
  };
}
