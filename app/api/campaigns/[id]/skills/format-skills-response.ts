import { abilitySummary } from "@/lib/utils/abilities/summary";
import type { IdName } from "@/types/common";

export interface SkillRowForResponse {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId: string | null;
  grantedSpellId?: string | null;
  abilities?: unknown;
  image: string | null;
  appearanceDescription?: string | null;
  createdAt: Date;
  spell?: IdName | null;
  spellGroup?: IdName | null;
  grantedSpell?: IdName | null;
}

const idName = (row: IdName | null | undefined) => (row ? { id: row.id, name: row.name } : null);

export function skillRowFields(skill: SkillRowForResponse) {
  return {
    id: skill.id,
    campaignId: skill.campaignId,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    image: skill.image ?? null,
    appearanceDescription: skill.appearanceDescription ?? null,
    spellId: skill.spellId,
    spellGroupId: skill.spellGroupId,
    grantedSpellId: skill.grantedSpellId ?? null,
    mainSkillId: skill.mainSkillId,
    createdAt: skill.createdAt,
    spell: idName(skill.spell),
    spellGroup: idName(skill.spellGroup),
    grantedSpell: idName(skill.grantedSpell),
  };
}

export function formatSkillsListResponse(skills: SkillRowForResponse[]) {
  return skills.map((skill) => ({ ...skillRowFields(skill), abilitySummary: abilitySummary("skill", skill) }));
}
