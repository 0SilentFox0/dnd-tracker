import type { GroupedSkillPayload, SkillFormValues } from "@/types/skills";

export function buildSkillFormPayload(values: SkillFormValues): GroupedSkillPayload {
  const { name, description, icon, abilities, spellId, spellGroupId, grantedSpellId, mainSkillId } = values;

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
    mainSkillData: {
      mainSkillId: mainSkillId || null,
    },
  };
}
