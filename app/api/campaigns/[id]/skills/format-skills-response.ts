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
  spellEnhancementTypes: unknown;
  spellEffectIncrease: number | null;
  spellTargetChange: unknown;
  spellAdditionalModifier: unknown;
  spellNewSpellId: string | null;
  grantedSpellId?: string | null;
  spellEnhancementData: unknown;
  abilities?: unknown;
  image: string | null;
  appearanceDescription?: string | null;
  createdAt: Date;
  spell?: { id: string; name: string } | null;
  spellGroup?: { id: string; name: string } | null;
  grantedSpell?: { id: string; name: string } | null;
}

export function groupSkillRow(skill: SkillRowForResponse) {
  const spellEnhancementData =
    skill.spellEnhancementData && typeof skill.spellEnhancementData === "object" && !Array.isArray(skill.spellEnhancementData)
      ? (skill.spellEnhancementData as Record<string, unknown>)
      : {
          spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes) ? skill.spellEnhancementTypes : [],
          spellEffectIncrease: skill.spellEffectIncrease || undefined,
          spellTargetChange: skill.spellTargetChange || undefined,
          spellAdditionalModifier: skill.spellAdditionalModifier || undefined,
          spellNewSpellId: skill.spellNewSpellId || undefined,
        };

  return {
    id: skill.id,
    campaignId: skill.campaignId,
    basicInfo: { name: skill.name, description: skill.description ?? "", icon: skill.icon ?? "" },
    image: skill.image ?? null,
    appearanceDescription: skill.appearanceDescription ?? null,
    spellData: {
      spellId: skill.spellId || undefined,
      spellGroupId: skill.spellGroupId || undefined,
      grantedSpellId: skill.grantedSpellId || undefined,
    },
    spellEnhancementData,
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
