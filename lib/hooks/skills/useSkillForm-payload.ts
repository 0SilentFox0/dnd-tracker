import type { Ability } from "@/lib/utils/abilities/schema";
import type { GroupedSkillPayload } from "@/types/hooks";

export interface SkillFormPayloadState {
  name: string;
  description: string;
  icon: string;
  abilities: Ability[];
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId: string | null;
  mainSkillId: string | null;
}

export function buildSkillFormPayload(
  state: SkillFormPayloadState,
): GroupedSkillPayload {
  const {
    name,
    description,
    icon,
    abilities,
    spellId,
    spellGroupId,
    grantedSpellId,
    mainSkillId,
  } = state;

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
