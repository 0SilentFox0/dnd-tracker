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
  spellNewSpellId?: string | null;
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
    };
  }

  return data as unknown as NormalizedSkillFormData;
}
