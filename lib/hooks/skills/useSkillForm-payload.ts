/**
 * Збір payload для створення/оновлення скіла з даних форми useSkillForm.
 */

import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { GroupedSkillPayload } from "@/types/hooks";

export interface SkillFormPayloadState {
  name: string;
  description: string;
  icon: string;
  abilities: Ability[];
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
    abilities,
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
  } = state;

  return {
    basicInfo: {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
    },
    abilities,
    spellData: {
      spellId: spellId || null,
      spellGroupId: spellGroupId || null,
      grantedSpellId: grantedSpellId || null,
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
      mainSkillId: mainSkillId || null,
    },
  };
}
