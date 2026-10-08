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
  mainSkillData: {
    mainSkillId: string | null;
  };
}
