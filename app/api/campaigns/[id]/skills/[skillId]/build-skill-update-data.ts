/**
 * Перетворення тіла PATCH-запиту в Prisma.SkillUpdateInput.
 */

import { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { updateSkillSchema } from "./update-skill-schema";

export type UpdateSkillData = z.infer<typeof updateSkillSchema>;

export function buildSkillUpdateData(
  data: UpdateSkillData,
): Prisma.SkillUpdateInput {
  const updateData: Prisma.SkillUpdateInput = {};

  if (data.image !== undefined) updateData.image = data.image;

  if (data.basicInfo !== undefined) {
    updateData.basicInfo = data.basicInfo as Prisma.InputJsonValue;

    const basicInfo = data.basicInfo as Record<string, unknown>;

    if (basicInfo.name !== undefined) updateData.name = basicInfo.name as string;

    if (basicInfo.description !== undefined)
      updateData.description = basicInfo.description as string;

    if (basicInfo.icon !== undefined)
      updateData.icon = basicInfo.icon as string | null;
  }

  if (data.bonuses !== undefined) {
    updateData.bonuses = data.bonuses as Prisma.InputJsonValue;
  }

  if (data.combatStats !== undefined) {
    updateData.combatStats = data.combatStats as Prisma.InputJsonValue;

    const combatStats = data.combatStats as Record<string, unknown>;

    if (combatStats.damage !== undefined) updateData.damage = combatStats.damage;

    if (combatStats.armor !== undefined) updateData.armor = combatStats.armor;

    if (combatStats.speed !== undefined) updateData.speed = combatStats.speed;

    if (combatStats.physicalResistance !== undefined)
      updateData.physicalResistance = combatStats.physicalResistance;

    if (combatStats.magicalResistance !== undefined)
      updateData.magicalResistance = combatStats.magicalResistance;
  }

  if (data.spellData !== undefined) {
    updateData.spellData = data.spellData as Prisma.InputJsonValue;

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

  if (data.mainSkillData !== undefined) {
    updateData.mainSkillData = data.mainSkillData as Prisma.InputJsonValue;

    const mainSkillData = data.mainSkillData as Record<string, unknown>;

    if (mainSkillData.mainSkillId !== undefined) {
      updateData.mainSkill =
        mainSkillData.mainSkillId === null
          ? { disconnect: true }
          : { connect: { id: mainSkillData.mainSkillId as string } };
    }
  }

  if (data.skillTriggers !== undefined) {
    updateData.skillTriggers = data.skillTriggers as Prisma.InputJsonValue;
  }

  if (data.appearanceDescription !== undefined) {
    updateData.appearanceDescription = data.appearanceDescription;
  }

  return updateData;
}
