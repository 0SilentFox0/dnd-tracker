import type { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { Ability } from "@/lib/utils/abilities/schema";

// useSkillForm
export interface GroupedSkillPayload {
  basicInfo: {
    name: string;
    description?: string;
    icon?: string;
  };
  abilities: Ability[];
  spellData: {
    spellId: string | null;
    spellGroupId: string | null;
    grantedSpellId: string | null;
  };
  spellEnhancementData: {
    spellEnhancementTypes?: SpellEnhancementType[];
    spellEffectIncrease?: number;
    spellTargetChange?: { target: "enemies" | "allies" | "all" };
    spellAdditionalModifier?: {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };
    spellNewSpellId?: string;
    spellAllowMultipleTargets?: boolean;
    spellAoeSpellIds?: string[];
  };
  mainSkillData: {
    mainSkillId: string | null;
  };
}
