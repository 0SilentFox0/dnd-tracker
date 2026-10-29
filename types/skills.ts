import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";
import type { IdName } from "@/types/common";
import type { LogLine } from "@/types/text";

export interface Skill {
  abilities?: Ability[];
  abilitySummary?: LogLine[];
  abilityIssues?: ConversionIssue[];
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  image?: string | null;
  appearanceDescription?: string | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId?: string | null;
  grantedSpellId?: string | null;
  createdAt: Date;
  spell?: IdName | null;
  spellGroup?: IdName | null;
  grantedSpell?: IdName | null;
}

export type PersonalSkillOption = Pick<Skill, "id" | "name" | "icon" | "description">;

/** Request body of POST/PATCH `/skills` (grouped by form section). */
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

export interface SkillTreeRow {
  id: string;
  campaignId: string;
  race: string;
  skills: unknown;
  createdAt: string;
}

export interface SkillFormValues {
  name: string;
  description: string;
  icon: string;
  abilities: Ability[];
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId: string | null;
  mainSkillId: string | null;
}

export interface SkillFormBinding {
  data: SkillFormValues;
  set: <K extends keyof SkillFormValues>(key: K, value: SkillFormValues[K]) => void;
}
