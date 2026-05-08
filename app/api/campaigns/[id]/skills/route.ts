import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createSkillSchema } from "./create-skill-schema";
import { formatSkillsListResponse } from "./format-skills-response";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();

    const data = createSkillSchema.parse(body);

    // Витягуємо значення для зворотної сумісності (для relations)
    const basicInfo = data.basicInfo as Record<string, unknown>;

    const spellData = data.spellData as Record<string, unknown>;

    const mainSkillData = data.mainSkillData as Record<string, unknown>;

    const spellEnhancementData = data.spellEnhancementData as Record<
      string,
      unknown
    >;

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        image: data.image ?? null,
        // Згруповані дані
        basicInfo: data.basicInfo as Prisma.InputJsonValue,
        bonuses: data.bonuses as Prisma.InputJsonValue,
        combatStats: data.combatStats as Prisma.InputJsonValue,
        spellData: data.spellData as Prisma.InputJsonValue,
        spellEnhancementData:
          data.spellEnhancementData as Prisma.InputJsonValue,
        mainSkillData: data.mainSkillData as Prisma.InputJsonValue,
        skillTriggers: data.skillTriggers
          ? (data.skillTriggers as Prisma.InputJsonValue)
          : [],
        // Старі поля для зворотної сумісності (relations)
        name: (basicInfo.name as string) || "",
        description: (basicInfo.description as string) || null,
        icon: (basicInfo.icon as string) || null,
        damage: data.combatStats.damage || null,
        armor: data.combatStats.armor || null,
        speed: data.combatStats.speed || null,
        physicalResistance: data.combatStats.physicalResistance || null,
        magicalResistance: data.combatStats.magicalResistance || null,
        spellId: (spellData.spellId as string) || null,
        spellGroupId: (spellData.spellGroupId as string) || null,
        grantedSpellId:
          (spellData.grantedSpellId as string) || null,
        mainSkillId: (mainSkillData.mainSkillId as string) || null,
        spellEnhancementTypes: spellEnhancementData.spellEnhancementTypes
          ? (spellEnhancementData.spellEnhancementTypes as Prisma.InputJsonValue)
          : [],
        spellEffectIncrease:
          (spellEnhancementData.spellEffectIncrease as number) || null,
        spellTargetChange: spellEnhancementData.spellTargetChange
          ? (spellEnhancementData.spellTargetChange as Prisma.InputJsonValue)
          : undefined,
        spellAdditionalModifier: spellEnhancementData.spellAdditionalModifier
          ? (spellEnhancementData.spellAdditionalModifier as Prisma.InputJsonValue)
          : undefined,
        spellNewSpellId:
          (spellEnhancementData.spellNewSpellId as string) || null,
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    return handleApiError(error, { action: "create skill" });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skills = await prisma.skill.findMany({
      where: {
        campaignId: id,
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedSkills = formatSkillsListResponse(skills);

    return NextResponse.json(formattedSkills);
  } catch (error) {
    return handleApiError(error, { action: "list skills" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Видаляємо всі скіли кампанії
    const result = await prisma.skill.deleteMany({
      where: {
        campaignId: id,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    return handleApiError(error, { action: "delete all skills" });
  }
}
