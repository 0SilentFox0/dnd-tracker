import { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { updateSkillSchema } from "./update-skill-schema";

import { abilitiesJson } from "@/lib/utils/abilities/read";

export type UpdateSkillData = z.infer<typeof updateSkillSchema>;

export function buildSkillUpdateData(
  data: UpdateSkillData,
): Prisma.SkillUpdateInput {
  const updateData: Prisma.SkillUpdateInput = {};

  if (data.image !== undefined) updateData.image = data.image;

  if (data.basicInfo !== undefined) {
    const basicInfo = data.basicInfo as Record<string, unknown>;

    if (basicInfo.name !== undefined) updateData.name = basicInfo.name as string;

    if (basicInfo.description !== undefined)
      updateData.description = basicInfo.description as string;

    if (basicInfo.icon !== undefined)
      updateData.icon = basicInfo.icon as string | null;
  }

  if (data.spellData !== undefined) {
    const spellData = data.spellData as Record<string, unknown>;

    if (spellData.spellId !== undefined) {
      updateData.spell =
        spellData.spellId === null
          ? { disconnect: true }
          : { connect: { id: spellData.spellId as string } };
    }

    if (spellData.spellGroupId !== undefined) {
      updateData.spellGroup =
        spellData.spellGroupId === null
          ? { disconnect: true }
          : { connect: { id: spellData.spellGroupId as string } };
    }

    if (spellData.grantedSpellId !== undefined) {
      updateData.grantedSpell =
        spellData.grantedSpellId === null
          ? { disconnect: true }
          : { connect: { id: spellData.grantedSpellId as string } };
      updateData.spellNewSpell = updateData.grantedSpell;
    }
  }

  if (data.abilities !== undefined) {
    updateData.abilities = abilitiesJson(data.abilities);
  }

  if (data.mainSkillData !== undefined) {
    const mainSkillData = data.mainSkillData as Record<string, unknown>;

    if (mainSkillData.mainSkillId !== undefined) {
      updateData.mainSkill =
        mainSkillData.mainSkillId === null
          ? { disconnect: true }
          : { connect: { id: mainSkillData.mainSkillId as string } };
    }
  }

  if (data.appearanceDescription !== undefined) {
    updateData.appearanceDescription = data.appearanceDescription;
  }

  return updateData;
}
