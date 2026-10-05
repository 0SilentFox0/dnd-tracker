/**
 * Типи для React hooks
 */

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

// useCharacterForm
export interface UseCharacterFormOptions {
  initialData?: unknown;
  onSuccess?: () => void;
}

// useInventory
export interface UseInventoryOptions {
  characterId: string;
  initialData?: unknown;
}

// useFileImport
export interface UseFileImportOptions<T> {
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

export interface UseFileImportReturn<T> {
  importFile: (file: File) => Promise<void>;
  isImporting: boolean;
  error: Error | null;
  data: T[] | null;
}

// useSkills
export interface SkillFromLibrary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}
