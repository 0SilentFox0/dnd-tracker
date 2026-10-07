import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createSkillSchema } from "./create-skill-schema";
import { formatSkillsListResponse } from "./format-skills-response";
import { listSkillsQuerySchema } from "./list-skills-query";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = await parseBody(createSkillSchema, request);

    if (data instanceof NextResponse) return data;

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
        spellEnhancementData:
          data.spellEnhancementData as Prisma.InputJsonValue,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        name: (basicInfo.name as string) || "",
        description: (basicInfo.description as string) || null,
        icon: (basicInfo.icon as string) || null,
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

    invalidateReference(ReferenceKind.SKILLS, id);

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

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { mainSkillId } = listSkillsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    if (mainSkillId) {
      const options = await prisma.skill.findMany({
        where: { campaignId: id, mainSkillId },
        select: { id: true, name: true, icon: true, description: true },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(options);
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

    invalidateReference(ReferenceKind.SKILLS, id);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    return handleApiError(error, { action: "delete all skills" });
  }
}
