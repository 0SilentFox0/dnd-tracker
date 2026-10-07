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
    }
  }

  if (data.spellEnhancementData !== undefined) {
    updateData.spellEnhancementData =
      data.spellEnhancementData as Prisma.InputJsonValue;

    const spellEnhancementData = data.spellEnhancementData as Record<
      string,
      unknown
    >;

    if (spellEnhancementData.spellEnhancementTypes !== undefined)
      updateData.spellEnhancementTypes =
        spellEnhancementData.spellEnhancementTypes as Prisma.InputJsonValue;

    if (spellEnhancementData.spellEffectIncrease !== undefined)
      updateData.spellEffectIncrease =
        spellEnhancementData.spellEffectIncrease;

    if (spellEnhancementData.spellTargetChange !== undefined) {
      updateData.spellTargetChange =
        spellEnhancementData.spellTargetChange === null
          ? Prisma.JsonNull
          : (spellEnhancementData.spellTargetChange as Prisma.InputJsonValue);
    }

    if (spellEnhancementData.spellAdditionalModifier !== undefined) {
      updateData.spellAdditionalModifier =
        spellEnhancementData.spellAdditionalModifier === null
          ? Prisma.JsonNull
          : (spellEnhancementData.spellAdditionalModifier as Prisma.InputJsonValue);
    }

    if (spellEnhancementData.spellNewSpellId !== undefined) {
      updateData.spellNewSpell =
        spellEnhancementData.spellNewSpellId === null
          ? { disconnect: true }
          : { connect: { id: spellEnhancementData.spellNewSpellId as string } };
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
