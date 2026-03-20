/**
 * Збір payload для створення/оновлення скіла з даних форми useSkillForm.
 */

import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { SkillEffect } from "@/types/battle";
import type { GroupedSkillPayload } from "@/types/hooks";
import type { SkillTriggers } from "@/types/skill-triggers";

export interface SkillFormPayloadState {
  name: string;
  description: string;
  icon: string;
  minTargets: string;
  maxTargets: string;
  effects: Array<{ stat?: string; type?: string; value?: unknown }>;
  affectsDamage: boolean;
  damageType: "melee" | "ranged" | "magic" | null;
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId: string | null;
  mainSkillId: string | null;
  spellEnhancementTypes: SpellEnhancementType[];
  spellEffectIncrease: string;
  spellTargetChange: string | null;
  spellAdditionalModifier: {
    modifier?: string;
    damageDice?: string;
    duration?: number;
  };
  spellNewSpellId: string | null;
  spellAllowMultipleTargets: boolean;
  spellAoeSpellIds: string[];
  skillTriggers: SkillTriggers;
}

function parseNumber(value: string): number | undefined {
  return value ? parseInt(value, 10) : undefined;
}

export function buildSkillFormPayload(
  state: SkillFormPayloadState,
): GroupedSkillPayload {
  const {
    name,
    description,
    icon,
    minTargets,
    maxTargets,
    effects,
    affectsDamage,
    damageType,
    spellId,
    spellGroupId,
    grantedSpellId,
    mainSkillId,
    spellEnhancementTypes,
    spellEffectIncrease,
    spellTargetChange,
    spellAdditionalModifier,
    spellNewSpellId,
    spellAllowMultipleTargets,
    spellAoeSpellIds,
    skillTriggers,
  } = state;

  return {
    basicInfo: {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
    },
    bonuses: {},
    combatStats: {
      min_targets: parseNumber(minTargets),
      max_targets: parseNumber(maxTargets),
      effects: effects.length > 0 ? (effects as SkillEffect[]) : undefined,
      affectsDamage: affectsDamage || undefined,
      damageType: damageType ?? undefined,
    },
    spellData: {
      spellId: spellId || undefined,
      spellGroupId: spellGroupId || undefined,
      grantedSpellId: grantedSpellId || undefined,
    },
    spellEnhancementData: {
      spellEnhancementTypes:
        spellEnhancementTypes.length > 0 ? spellEnhancementTypes : undefined,
      spellEffectIncrease: parseNumber(spellEffectIncrease),
      spellTargetChange:
        spellTargetChange &&
        spellEnhancementTypes.includes(SpellEnhancementType.TARGET_CHANGE)
          ? {
              target: spellTargetChange as "enemies" | "allies" | "all",
            }
          : undefined,
      spellAdditionalModifier:
        spellEnhancementTypes.includes(
          SpellEnhancementType.ADDITIONAL_MODIFIER,
        ) && spellAdditionalModifier.modifier
          ? {
              modifier: spellAdditionalModifier.modifier,
              damageDice: spellAdditionalModifier.damageDice || undefined,
              duration: spellAdditionalModifier.duration || undefined,
            }
          : undefined,
      spellNewSpellId: spellNewSpellId || undefined,
      spellAllowMultipleTargets,
      spellAoeSpellIds: spellEnhancementTypes.includes(
        SpellEnhancementType.AOE_SPELL_UNLOCK,
      )
        ? spellAoeSpellIds
        : undefined,
    },
    mainSkillData: {
      mainSkillId: mainSkillId || undefined,
    },
    skillTriggers: skillTriggers.length > 0 ? skillTriggers : undefined,
  };
}
