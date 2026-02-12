import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";

/**
 * POST /api/campaigns/[id]/skills/[skillId]/duplicate
 * Створює копію скіла з новим id (назва + " (копія)")
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const source = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { spell: true, spellGroup: true, grantedSpell: true },
    });

    if (!source || source.campaignId !== id) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const basicInfo =
      source.basicInfo &&
      typeof source.basicInfo === "object" &&
      !Array.isArray(source.basicInfo)
        ? { ...(source.basicInfo as Record<string, unknown>) }
        : {
            name: source.name || "",
            description: source.description ?? "",
            icon: source.icon ?? "",
          };

    const name = (basicInfo.name as string) || source.name || "";

    const copyBasicInfo = {
      ...basicInfo,
      name: name.trim() ? `${name} (копія)` : "Скіл (копія)",
    };

    const spellData =
      source.spellData &&
      typeof source.spellData === "object" &&
      !Array.isArray(source.spellData)
        ? (source.spellData as Record<string, unknown>)
        : {};

    const mainSkillData =
      source.mainSkillData &&
      typeof source.mainSkillData === "object" &&
      !Array.isArray(source.mainSkillData)
        ? (source.mainSkillData as Record<string, unknown>)
        : {};

    const spellEnhancementData =
      source.spellEnhancementData &&
      typeof source.spellEnhancementData === "object" &&
      !Array.isArray(source.spellEnhancementData)
        ? (source.spellEnhancementData as Record<string, unknown>)
        : {};

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        image: source.image ?? null,
        basicInfo: copyBasicInfo as Prisma.InputJsonValue,
        bonuses: (source.bonuses as Prisma.InputJsonValue) ?? {},
        combatStats: (source.combatStats as Prisma.InputJsonValue) ?? {},
        spellData: (source.spellData as Prisma.InputJsonValue) ?? {},
        spellEnhancementData:
          (source.spellEnhancementData as Prisma.InputJsonValue) ?? {},
        mainSkillData: (source.mainSkillData as Prisma.InputJsonValue) ?? {},
        skillTriggers: Array.isArray(source.skillTriggers)
          ? (source.skillTriggers as Prisma.InputJsonValue)
          : [],
        name: (copyBasicInfo.name as string) || "",
        description: (copyBasicInfo.description as string) ?? null,
        icon: (copyBasicInfo.icon as string) ?? null,
        damage: source.damage ?? null,
        armor: source.armor ?? null,
        speed: source.speed ?? null,
        physicalResistance: source.physicalResistance ?? null,
        magicalResistance: source.magicalResistance ?? null,
        spellId: (spellData.spellId as string) ?? source.spellId ?? null,
        spellGroupId:
          (spellData.spellGroupId as string) ?? source.spellGroupId ?? null,
        grantedSpellId:
          (spellData.grantedSpellId as string) ??
          (source as { grantedSpellId?: string }).grantedSpellId ??
          null,
        mainSkillId:
          (mainSkillData.mainSkillId as string) ?? source.mainSkillId ?? null,
        spellEnhancementTypes: Array.isArray(source.spellEnhancementTypes)
          ? (source.spellEnhancementTypes as Prisma.InputJsonValue)
          : [],
        spellEffectIncrease: source.spellEffectIncrease ?? null,
        spellTargetChange: source.spellTargetChange
          ? (source.spellTargetChange as Prisma.InputJsonValue)
          : undefined,
        spellAdditionalModifier: source.spellAdditionalModifier
          ? (source.spellAdditionalModifier as Prisma.InputJsonValue)
          : undefined,
        spellNewSpellId: source.spellNewSpellId ?? null,
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error("Error duplicating skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
