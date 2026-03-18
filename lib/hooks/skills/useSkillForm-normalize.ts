/**
 * Типи та функції нормалізації/парсингу початкових даних для форми скіла
 */

import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { SkillEffect } from "@/types/battle";
import type { SkillTriggers } from "@/types/skill-triggers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SpellOption {
  id: string;
  name: string;
}

export type InitialSkillFormData =
  | Skill
  | GroupedSkill
  | {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      bonuses: unknown;
      damage: number | null;
      armor: number | null;
      speed: number | null;
      physicalResistance: number | null;
      magicalResistance: number | null;
      spellId: string | null;
      spellGroupId: string | null;
      grantedSpellId?: string | null;
      mainSkillId: string | null;
      spellEnhancementTypes?: unknown;
      spellEffectIncrease?: number | null;
      spellTargetChange?: unknown;
      spellAdditionalModifier?: unknown;
      spellNewSpellId?: string | null;
      skillTriggers?: SkillTriggers;
    };

export interface NormalizedSkillFormData {
  id?: string;
  name: string;
  description: string | null;
  icon: string | null;
  min_targets?: number | null;
  max_targets?: number | null;
  effects?: SkillEffect[];
  affectsDamage?: boolean;
  damageType?: "melee" | "ranged" | "magic" | null;
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId?: string | null;
  mainSkillId: string | null;
  spellEnhancementTypes?: unknown;
  spellEffectIncrease?: number | null;
  spellTargetChange?: unknown;
  spellAdditionalModifier?: unknown;
  spellNewSpellId?: string | null;
  skillTriggers?: SkillTriggers;
}

export function normalizeInitialSkillData(
  data: InitialSkillFormData | undefined,
): NormalizedSkillFormData | undefined {
  if (!data) return undefined;

  if ("basicInfo" in data && "combatStats" in data) {
    const grouped = data as GroupedSkill;

    return {
      id: grouped.id,
      name: grouped.basicInfo.name,
      description: grouped.basicInfo.description || null,
      icon: grouped.basicInfo.icon || null,
      min_targets: grouped.combatStats.min_targets || null,
      max_targets: grouped.combatStats.max_targets || null,
      effects: grouped.combatStats.effects || [],
      affectsDamage: grouped.combatStats.affectsDamage ?? false,
      damageType: grouped.combatStats.damageType ?? null,
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
      skillTriggers: grouped.skillTriggers,
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
