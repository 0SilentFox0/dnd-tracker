import { NextResponse } from "next/server";

import { createSkillSchema } from "./create-skill-schema";
import { listSkillsQuerySchema } from "./list-skills-query";
import { readSkills } from "./read-skills";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { invalidCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
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

    const foreignRef = await invalidCampaignRefs(id, {
      spell: [data.spellData.spellId, data.spellData.grantedSpellId],
      spellGroup: data.spellData.spellGroupId,
      mainSkill: data.mainSkillData.mainSkillId,
    });

    if (foreignRef) return foreignRef;

    const { basicInfo, spellData, mainSkillData } = data;

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        image: data.image ?? null,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        name: basicInfo.name,
        description: basicInfo.description || null,
        icon: basicInfo.icon || null,
        spellId: spellData.spellId || null,
        spellGroupId: spellData.spellGroupId || null,
        grantedSpellId: spellData.grantedSpellId || null,
        mainSkillId: mainSkillData.mainSkillId || null,
        spellNewSpellId: spellData.grantedSpellId || null,
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

    if (accessResult instanceof NextResponse) return accessResult;

    const { mainSkillId } = listSkillsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    if (!mainSkillId) return await readSkills({ id, accessChecked: true });

    const options = await prisma.skill.findMany({
      where: { campaignId: id, mainSkillId },
      select: { id: true, name: true, icon: true, description: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(options);
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
