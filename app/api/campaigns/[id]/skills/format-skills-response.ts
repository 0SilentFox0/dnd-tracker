import { skillAbilities } from "@/lib/utils/abilities/read";
import { damageAffinity } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";

export interface SkillRowForResponse {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId: string | null;
  spellNewSpellId: string | null;
  grantedSpellId?: string | null;
  abilities?: unknown;
  image: string | null;
  appearanceDescription?: string | null;
  createdAt: Date;
  spell?: { id: string; name: string } | null;
  spellGroup?: { id: string; name: string } | null;
  grantedSpell?: { id: string; name: string } | null;
}

export function groupSkillRow(skill: SkillRowForResponse) {
  return {
    id: skill.id,
    campaignId: skill.campaignId,
    basicInfo: { name: skill.name, description: skill.description ?? "", icon: skill.icon ?? "" },
    image: skill.image ?? null,
    appearanceDescription: skill.appearanceDescription ?? null,
    spellData: {
      spellId: skill.spellId || undefined,
      spellGroupId: skill.spellGroupId || undefined,
      grantedSpellId: skill.grantedSpellId || skill.spellNewSpellId || undefined,
    },
    mainSkillData: { mainSkillId: skill.mainSkillId || undefined },
    createdAt: skill.createdAt,
    spell: skill.spell ? { id: skill.spell.id, name: skill.spell.name } : null,
    spellGroup: skill.spellGroup ? { id: skill.spellGroup.id, name: skill.spellGroup.name } : null,
    grantedSpell: skill.grantedSpell ? { id: skill.grantedSpell.id, name: skill.grantedSpell.name } : null,
  };
}

export function formatSkillsListResponse(skills: SkillRowForResponse[]) {
  return skills.map((skill) => ({
    ...groupSkillRow(skill),
    abilitySummary: abilitySummary("skill", skill),
    damageAffinity: damageAffinity(skillAbilities(skill)),
  }));
}
