/**
 * Типи для React hooks
 */

import type { SkillTriggers } from "./skill-triggers";

import type { SpellEnhancementType } from "@/lib/constants/spell-enhancement";

// useSkillForm
export interface GroupedSkillPayload {
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
    spellEnhancementTypes?: SpellEnhancementType[];
    spellEffectIncrease?: number;
    spellTargetChange?: { target: "enemies" | "allies" | "all" };
    spellAdditionalModifier?: {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };
    spellNewSpellId?: string;
  };
  mainSkillData: {
    mainSkillId?: string;
  };
  skillTriggers?: SkillTriggers;
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
