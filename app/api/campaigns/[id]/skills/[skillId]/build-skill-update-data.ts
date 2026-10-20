import { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { updateSkillSchema } from "./update-skill-schema";

import { abilitiesJson } from "@/lib/utils/abilities/read";

export type UpdateSkillData = z.infer<typeof updateSkillSchema>;

const relation = (id: string | null) => (id === null ? { disconnect: true } : { connect: { id } });

export function buildSkillUpdateData(
  data: UpdateSkillData,
): Prisma.SkillUpdateInput {
  const updateData: Prisma.SkillUpdateInput = {};

  if (data.image !== undefined) updateData.image = data.image;

  const { basicInfo, spellData, mainSkillData } = data;

  if (basicInfo) {
    if (basicInfo.name !== undefined) updateData.name = basicInfo.name;

    if (basicInfo.description !== undefined) updateData.description = basicInfo.description;

    if (basicInfo.icon !== undefined) updateData.icon = basicInfo.icon;
  }

  if (spellData) {
    if (spellData.spellId !== undefined) updateData.spell = relation(spellData.spellId);

    if (spellData.spellGroupId !== undefined) updateData.spellGroup = relation(spellData.spellGroupId);

    if (spellData.grantedSpellId !== undefined) {
      updateData.grantedSpell = relation(spellData.grantedSpellId);
      updateData.spellNewSpell = updateData.grantedSpell;
    }
  }

  if (data.abilities !== undefined) {
    updateData.abilities = abilitiesJson(data.abilities);
  }

  if (mainSkillData?.mainSkillId !== undefined) updateData.mainSkill = relation(mainSkillData.mainSkillId);

  if (data.appearanceDescription !== undefined) {
    updateData.appearanceDescription = data.appearanceDescription;
  }

  return updateData;
}
